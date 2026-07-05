const prisma = require('../prisma/prisma');

// =========================================================
// ERROR HELPER
// =========================================================

function makeError(message, statusCode = 400, code = 'BAD_REQUEST') {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

// =========================================================
// MONEY HELPERS (Float storage — SQLite has no Decimal support in Prisma)
// =========================================================

const MONEY_EPSILON = 0.005;

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}
function sumMoney(values) {
  return round2(values.reduce((acc, v) => acc + Number(v || 0), 0));
}
function gt(a, b) {
  return round2(a) - round2(b) > MONEY_EPSILON;
}
function lt(a, b) {
  return round2(b) - round2(a) > MONEY_EPSILON;
}
function eq(a, b) {
  return Math.abs(round2(a) - round2(b)) <= MONEY_EPSILON;
}
function lte(a, b) {
  return lt(a, b) || eq(a, b);
}

// =========================================================
// LIVE BALANCE CALCULATION (accounts for Purchase Return)
// =========================================================

/**
 * @param {object} purchase  Must include a `purchaseReturns` relation
 *   (array of { netAmount, status }) alongside netAmount and paidAmount.
 */
function computeReturnsTotal(purchase) {
  const returns = purchase.purchaseReturns || [];
  return sumMoney(returns.filter((r) => r.status !== 'CANCELLED').map((r) => r.netAmount));
}

function computeLiveBalance(purchase) {
  const returnsTotal = computeReturnsTotal(purchase);
  return round2(purchase.netAmount - returnsTotal - purchase.paidAmount);
}

function computeLiveStatus(purchase) {
  const liveBalance = computeLiveBalance(purchase);
  if (lte(liveBalance, 0)) return 'PAID';
  if (purchase.paidAmount > 0) return 'PARTIAL';
  return 'PENDING';
}

// =========================================================
// VOUCHER NUMBER GENERATOR (PV-YYMM-0001)
// =========================================================

async function generateVoucherNo(tx, paymentDate) {
  const date = paymentDate instanceof Date ? paymentDate : new Date(paymentDate);
  if (Number.isNaN(date.getTime())) {
    throw makeError('Invalid payment date supplied for voucher generation', 400, 'INVALID_DATE');
  }

  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `PV-${yy}${mm}`;

  const sequence = await tx.voucherSequence.upsert({
    where: { prefix },
    create: { prefix, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });

  return `${prefix}-${String(sequence.lastNumber).padStart(4, '0')}`;
}

// =========================================================
// OUTSTANDING / AGEING CALCULATOR
// =========================================================

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(from, to = new Date()) {
  const diff = to.getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

function daysPending(purchase) {
  if (computeLiveStatus(purchase) === 'PAID') return 0;
  return daysBetween(purchase.invoiceDate);
}

function calculateAveragePaymentDays(purchases) {
  const paidWithHistory = purchases.filter(
    (p) => computeLiveStatus(p) === 'PAID' && Array.isArray(p.paymentItems) && p.paymentItems.length > 0
  );
  if (paidWithHistory.length === 0) return null;

  const daysList = paidWithHistory.map((p) => {
    const latestAllocationDate = p.paymentItems
      .map((item) => new Date(item.payment.paymentDate))
      .sort((a, b) => b - a)[0];
    return daysBetween(p.invoiceDate, latestAllocationDate);
  });

  return Math.round(daysList.reduce((a, b) => a + b, 0) / daysList.length);
}

function calculateOutstandingSummary(purchases, payments) {
  const outstanding = purchases.filter((p) => computeLiveStatus(p) !== 'PAID');
  const totalOutstanding = sumMoney(outstanding.map((p) => computeLiveBalance(p)));

  const ageing = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  for (const p of outstanding) {
    const age = daysBetween(p.invoiceDate);
    const bucket = age <= 30 ? '0-30' : age <= 60 ? '31-60' : age <= 90 ? '61-90' : '90+';
    ageing[bucket] = round2(ageing[bucket] + computeLiveBalance(p));
  }

  const lastPayment = payments.slice().sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0];

  return {
    totalOutstanding,
    totalPendingBills: outstanding.length,
    lastPaymentDate: lastPayment ? lastPayment.paymentDate : null,
    ageing,
    averagePaymentDays: calculateAveragePaymentDays(purchases),
  };
}

/** FIFO auto-allocation, oldest invoice first, capped at each invoice's LIVE balance. */
function autoAllocate(purchases, paymentAmount) {
  const sorted = [...purchases].sort((a, b) => new Date(a.invoiceDate) - new Date(b.invoiceDate));
  let remaining = round2(paymentAmount);
  const allocations = [];

  for (const purchase of sorted) {
    const liveBalance = computeLiveBalance(purchase);
    if (remaining <= 0 || liveBalance <= 0) {
      allocations.push({ purchaseId: purchase.id, allocatedAmount: 0 });
      continue;
    }
    const allocated = remaining >= liveBalance ? liveBalance : remaining;
    allocations.push({ purchaseId: purchase.id, allocatedAmount: round2(allocated) });
    remaining = round2(remaining - allocated);
  }
  return allocations;
}

// =========================================================
// SUPPLIER LEDGER HELPERS
// ---------------------------------------------------------
// SupplierLedger is a pure posting table: date, voucherNo,
// voucherType, referenceId, debit, credit, particulars, remarks.
// It does NOT store a running balance. Balances are always
// computed at report-generation time by summing credit/debit
// chronologically — this avoids the chained-balance bug that
// storing runningBalance would have: a backdated entry (e.g.
// entering last month's payment today) would otherwise leave
// every later stored balance wrong, since a stored chain only
// stays correct if entries are always inserted in date order.
// Computing fresh from SUM(...) ordered by (date, id) makes
// that impossible to get wrong.
//
// referenceId is a plain, unconstrained Int — NOT a Prisma
// @relation — because it's polymorphic: it points to
// SupplierPayment.id for PAYMENT/PAYMENT_REVERSAL rows, and
// will point to Purchase.id / PurchaseReturn.id once those
// modules are wired to post PURCHASE/PURCHASE_RETURN entries
// (out of scope here — see note on getSupplierLedger).
// =========================================================

function buildPaymentLedgerEntry({ supplierId, date, voucherNo, referenceId, amount, particulars, remarks }) {
  return {
    supplierId,
    date,
    voucherNo,
    voucherType: 'PAYMENT',
    referenceId,
    debit: round2(amount),
    credit: 0,
    particulars,
    remarks: remarks || null,
  };
}

function buildReversalLedgerEntry({ supplierId, date, voucherNo, referenceId, amount, particulars, remarks }) {
  return {
    supplierId,
    date,
    voucherNo,
    voucherType: 'PAYMENT_REVERSAL',
    referenceId,
    debit: 0,
    credit: round2(amount),
    particulars,
    remarks: remarks || null,
  };
}

/**
 * Builds the "Particulars" narrative for a PAYMENT entry at write
 * time, e.g.:
 *   "No. BS/25/08773 Rs.3588"
 *   "No. BS/26/00040 Rs.26412"
 *   "To Purchase Account"
 * `purchaseMap` is { purchaseId -> Purchase row } already loaded
 * during payment creation — no extra query needed.
 */
function buildPaymentParticulars(items, purchaseMap) {
  const lines = items.map((i) => `No. ${purchaseMap.get(i.purchaseId).invoiceNo} Rs.${round2(i.allocatedAmount)}`);
  lines.push('To Purchase Account');
  return lines.join('\n');
}

function buildReversalParticulars(originalVoucherNo) {
  return `Reversal of payment ${originalVoucherNo}\nTo Purchase Account`;
}

/**
 * Computes running balance for a chronologically-ordered list of
 * ledger entries, starting from a given opening balance. Pure
 * function, no DB access — call after fetching entries ordered by
 * (date, id).
 */
function computeRunningBalances(entries, openingBalance) {
  let balance = openingBalance;
  return entries.map((e) => {
    balance = round2(balance - e.debit + e.credit);
    return { ...e, balance };
  });
}

function formatLedgerForPrint(entriesWithBalance) {
  return entriesWithBalance.map((e) => ({
    date: e.date,
    voucherNo: e.voucherNo,
    voucherType: e.voucherType,
    particulars: e.particulars || 'To Purchase Account',
    debit: round2(e.debit),
    credit: round2(e.credit),
    balance: e.balance,
  }));
}


// =========================================================
// SUPPLIER SEARCH — by name / code / mobile / GST
// =========================================================

async function searchSuppliers(query) {
  if (!query) throw makeError('Search query is required', 400, 'QUERY_REQUIRED');
  return prisma.supplier.findMany({
    where: {
      OR: [
        { supplierName: { contains: query } },
        { supplierId: { contains: query } }, // string business code, e.g. SUP-0021
        { mobile: { contains: query } },
        { gstTin: { contains: query } },
      ],
    },
    take: 20,
  });
}

// =========================================================
// OUTSTANDING SUMMARY (on supplier select)
// =========================================================

const PURCHASE_WITH_LIVE_BALANCE_INCLUDE = {
  purchaseReturns: { select: { netAmount: true, status: true } },
};

async function getSupplierOutstandingSummary(supplierId) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw makeError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');

  const purchases = await prisma.purchase.findMany({
    where: { supplierId, status: { not: 'CANCELLED' } },
    include: {
      ...PURCHASE_WITH_LIVE_BALANCE_INCLUDE,
      paymentItems: {
        include: { payment: { select: { paymentDate: true, status: true } } },
      },
    },
  });

  // Only ACTIVE (non-cancelled) payment allocations count toward "when was this paid".
  const purchasesForAgeing = purchases.map((p) => ({
    ...p,
    paymentItems: p.paymentItems.filter((item) => item.payment.status === 'ACTIVE'),
  }));

  const payments = await prisma.supplierPayment.findMany({
    where: { supplierId, status: 'ACTIVE' },
    orderBy: { paymentDate: 'desc' },
  });

  return { supplier, ...calculateOutstandingSummary(purchasesForAgeing, payments) };
}

// =========================================================
// PURCHASE GRID (Outstanding Only / Fully Paid / All)
// =========================================================

async function getPurchaseGrid(supplierId, filter = 'OUTSTANDING_ONLY') {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw makeError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');

  // Only SAVED purchases are payable — DRAFT isn't posted yet, CANCELLED never was.
  const purchases = await prisma.purchase.findMany({
    where: { supplierId, status: 'SAVED' },
    include: PURCHASE_WITH_LIVE_BALANCE_INCLUDE,
    orderBy: { invoiceDate: 'asc' },
  });

  const rows = purchases.map((p) => {
    const liveBalance = computeLiveBalance(p);
    const liveStatus = computeLiveStatus(p);
    return {
      id: p.id,
      invoiceNumber: p.invoiceNo,
      purchaseDate: p.invoiceDate,
      daysPending: daysPending(p),
      invoiceAmount: round2(p.netAmount),
      paidAmount: round2(p.paidAmount),
      balanceAmount: liveBalance,
      status: liveStatus,
    };
  });

  if (filter === 'OUTSTANDING_ONLY') return rows.filter((r) => r.status !== 'PAID');
  if (filter === 'FULLY_PAID') return rows.filter((r) => r.status === 'PAID');
  return rows; // 'ALL'
}

// =========================================================
// AUTO ALLOCATE (pure calculation, no DB write)
// =========================================================

async function calculateAutoAllocation(purchaseIds, paymentAmount) {
  if (!purchaseIds || purchaseIds.length === 0) {
    throw makeError('Select at least one invoice to auto-allocate.', 400, 'NO_INVOICES_SELECTED');
  }
  if (lte(paymentAmount, 0)) {
    throw makeError('Payment amount must be greater than zero.', 400, 'INVALID_AMOUNT');
  }

  const purchases = await prisma.purchase.findMany({
    where: { id: { in: purchaseIds } },
    include: PURCHASE_WITH_LIVE_BALANCE_INCLUDE,
  });
  if (purchases.length !== purchaseIds.length) {
    throw makeError('One or more selected invoices were not found.', 404, 'INVOICE_NOT_FOUND');
  }

  const alreadyPaid = purchases.find((p) => computeLiveStatus(p) === 'PAID');
  if (alreadyPaid) {
    throw makeError(
      `Invoice ${alreadyPaid.invoiceNo} is already fully paid and cannot be allocated.`,
      409,
      'INVOICE_ALREADY_PAID'
    );
  }

  return autoAllocate(purchases, paymentAmount);
}

// =========================================================
// CREATE PAYMENT (core transactional operation)
// =========================================================

const MAX_VOUCHER_RETRY = 3;

async function createPayment(input) {
  return runPaymentCreationWithRetry(input);
}

async function runPaymentCreationWithRetry(input, attempt = 1) {
  try {
    return await prisma.$transaction((tx) => executePaymentCreation(tx, input));
  } catch (err) {
    if (err && err.code === 'P2002' && attempt < MAX_VOUCHER_RETRY) {
      return runPaymentCreationWithRetry(input, attempt + 1);
    }
    throw err;
  }
}

async function executePaymentCreation(tx, input) {
  const { supplierId, paymentDate, remarks, mode, bankName, transNo, refNo, transDate, totalAmount, items } = input;

  // ---- Shape/required-field checks ----
  if (!supplierId) throw makeError('Cannot save payment without a valid supplier.', 400, 'SUPPLIER_REQUIRED');
  if (!paymentDate) throw makeError('Payment date is required.', 400, 'DATE_REQUIRED');
  if (!mode) throw makeError('Payment mode is required.', 400, 'PAYMENT_MODE_REQUIRED');
  const validModes = ['CASH', 'BANK', 'UPI', 'CHEQUE', 'NEFT', 'RTGS'];
  if (!validModes.includes(mode)) {
    throw makeError(`Invalid payment mode. Must be one of: ${validModes.join(', ')}`, 400, 'INVALID_PAYMENT_MODE');
  }
  if (mode !== 'CASH') {
    if (!bankName || !transNo || !refNo || !transDate) {
      throw makeError(
        'Bank name, transaction number, reference number, and transaction date are required for non-cash payments.',
        400,
        'BANK_DETAILS_REQUIRED'
      );
    }
  }
  if (!items || items.length === 0) {
    throw makeError('Cannot save payment without selecting at least one invoice.', 400, 'INVOICE_REQUIRED');
  }
  if (lte(totalAmount, 0)) {
    throw makeError('Payment amount must be greater than zero.', 400, 'ZERO_PAYMENT');
  }
  for (const item of items) {
    if (!item.purchaseId || lte(item.allocatedAmount, 0)) {
      throw makeError('Allocated amount cannot be zero or negative.', 400, 'ZERO_ALLOCATION');
    }
  }

  const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw makeError('Cannot save payment without a valid supplier.', 400, 'SUPPLIER_REQUIRED');

  const allocatedTotal = sumMoney(items.map((i) => i.allocatedAmount));
  if (gt(allocatedTotal, totalAmount)) {
    throw makeError(
      `Total allocated amount (${allocatedTotal}) cannot exceed payment amount (${totalAmount}).`,
      400,
      'ALLOCATION_EXCEEDS_PAYMENT'
    );
  }

  // ---- Load purchases (with returns, for live balance) ----
  // Running inside `tx` gives the equivalent of row locking under SQLite's
  // single-writer transaction model — no other writer can interleave.
  const purchaseIds = items.map((i) => i.purchaseId);
  const purchases = await tx.purchase.findMany({
    where: { id: { in: purchaseIds } },
    include: PURCHASE_WITH_LIVE_BALANCE_INCLUDE,
  });
  if (purchases.length !== purchaseIds.length) {
    throw makeError('One or more selected invoices were not found.', 404, 'INVOICE_NOT_FOUND');
  }
  const purchaseMap = new Map(purchases.map((p) => [p.id, p]));

  for (const item of items) {
    const purchase = purchaseMap.get(item.purchaseId);

    if (purchase.supplierId !== supplierId) {
      throw makeError(
        `Invoice ${purchase.invoiceNo} does not belong to the selected supplier.`,
        400,
        'SUPPLIER_MISMATCH'
      );
    }
    if (purchase.status !== 'SAVED') {
      throw makeError(
        `Invoice ${purchase.invoiceNo} is ${purchase.status} and cannot be paid.`,
        400,
        'PURCHASE_NOT_PAYABLE'
      );
    }

    const liveBalance = computeLiveBalance(purchase);
    if (lte(liveBalance, 0)) {
      throw makeError(`Invoice ${purchase.invoiceNo} is already fully paid.`, 409, 'INVOICE_ALREADY_PAID');
    }
    if (gt(item.allocatedAmount, liveBalance)) {
      throw makeError(
        `Cannot pay ${item.allocatedAmount} against invoice ${purchase.invoiceNo} — balance is only ${liveBalance}.`,
        400,
        'AMOUNT_EXCEEDS_BALANCE'
      );
    }
  }

  const voucherNo = await generateVoucherNo(tx, paymentDate);

  const payment = await tx.supplierPayment.create({
    data: {
      voucherNo,
      paymentDate: new Date(paymentDate),
      supplierId,
      remarks: remarks || null,
      mode,
      bankName: mode === 'CASH' ? null : bankName,
      transNo: mode === 'CASH' ? null : transNo,
      refNo: mode === 'CASH' ? null : refNo,
      transDate: mode === 'CASH' ? null : new Date(transDate),
      totalAmount: round2(totalAmount),
      status: 'ACTIVE',
      items: { create: items.map((i) => ({ purchaseId: i.purchaseId, allocatedAmount: round2(i.allocatedAmount) })) },
    },
    include: { items: true },
  });

  // ---- Update each Purchase's paidAmount/balanceAmount/paymentStatus
  // (recomputed from live balance, so returns are reflected even though
  // the Purchase Return module can't touch these fields itself) ----
  for (const item of items) {
    const purchase = purchaseMap.get(item.purchaseId);
    const newPaidAmount = round2(purchase.paidAmount + item.allocatedAmount);
    const returnsTotal = computeReturnsTotal(purchase);
    const newBalanceAmount = round2(purchase.netAmount - returnsTotal - newPaidAmount);
    const newStatus = lte(newBalanceAmount, 0) ? 'PAID' : 'PARTIAL';

    await tx.purchase.update({
      where: { id: purchase.id },
      data: { paidAmount: newPaidAmount, balanceAmount: newBalanceAmount, paymentStatus: newStatus },
    });
  }

  await tx.supplierLedger.create({
    data: buildPaymentLedgerEntry({
      supplierId,
      date: new Date(paymentDate),
      voucherNo,
      referenceId: payment.id,
      amount: totalAmount,
      particulars: buildPaymentParticulars(items, purchaseMap),
      remarks,
    }),
  });

  return payment;
}

// =========================================================
// READ OPERATIONS
// =========================================================

async function listPayments({ page = 1, limit = 20, supplierId, fromDate, toDate, status }) {
  const where = {};
  if (supplierId) where.supplierId = Number(supplierId);
  if (status) where.status = status;
  if (fromDate || toDate) {
    where.paymentDate = {};
    if (fromDate) where.paymentDate.gte = new Date(fromDate);
    if (toDate) where.paymentDate.lte = new Date(toDate);
  }

  const p = Number(page) || 1;
  const l = Number(limit) || 20;

  const [total, records] = await prisma.$transaction([
    prisma.supplierPayment.count({ where }),
    prisma.supplierPayment.findMany({
      where,
      include: { supplier: true, items: { include: { purchase: true } } },
      orderBy: { paymentDate: 'desc' },
      skip: (p - 1) * l,
      take: l,
    }),
  ]);

  return { records, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } };
}

async function getPaymentById(id) {
  const payment = await prisma.supplierPayment.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { purchase: true } } },
  });
  if (!payment) throw makeError('Supplier payment not found', 404, 'PAYMENT_NOT_FOUND');
  return payment;
}

async function getPrintData(id) {
  const payment = await getPaymentById(id);
  return {
    voucherNo: payment.voucherNo,
    paymentDate: payment.paymentDate,
    supplier: {
      name: payment.supplier.supplierName,
      gstTin: payment.supplier.gstTin,
      address: payment.supplier.address,
    },
    mode: payment.mode,
    bankName: payment.bankName,
    transNo: payment.transNo,
    refNo: payment.refNo,
    transDate: payment.transDate,
    remarks: payment.remarks,
    status: payment.status,
    items: payment.items.map((i) => ({
      invoiceNumber: i.purchase.invoiceNo,
      invoiceDate: i.purchase.invoiceDate,
      invoiceAmount: round2(i.purchase.netAmount),
      allocatedAmount: round2(i.allocatedAmount),
    })),
    totalAmount: round2(payment.totalAmount),
  };
}

/**
 * @param {number} supplierId
 * @param {object} range  { fromDate?, toDate? } — both optional ISO date strings.
 *   Matches the legacy ledger's "FROM DATE / TO DATE" print header. If omitted,
 *   fromDate defaults to the beginning of time (no opening balance needed)
 *   and toDate defaults to now.
 *
 * NOTE ON SCOPE: this reads only PAYMENT / PAYMENT_REVERSAL entries, since
 * this module is the only one currently posting to SupplierLedger. Your
 * Purchase Entry and Purchase Return services will need their own
 * tx.supplierLedger.create({ voucherType: 'PURCHASE' | 'PURCHASE_RETURN', ... })
 * calls added for the ledger to show the full picture like your sample
 * printout (which includes purchase invoice credit rows) — that's outside
 * this module's code but uses the exact same table/shape.
 */
async function getSupplierLedger(supplierId, range = {}) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw makeError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');

  const fromDate = range.fromDate ? new Date(range.fromDate) : null;
  const toDate = range.toDate ? new Date(range.toDate) : new Date();

  // ---- Opening balance: SUM(credit) - SUM(debit) for everything strictly
  // before fromDate. Computed fresh every time — never stored — so a
  // backdated entry can never leave a stale balance behind. ----
  let openingBalance = 0;
  if (fromDate) {
    const priorAgg = await prisma.supplierLedger.aggregate({
      where: { supplierId, date: { lt: fromDate } },
      _sum: { debit: true, credit: true },
    });
    openingBalance = round2((priorAgg._sum.credit || 0) - (priorAgg._sum.debit || 0));
  }

  // Chronological order (date, then id as tiebreaker for same-day entries)
  // is required for the running balance walk below to be correct.
  const entries = await prisma.supplierLedger.findMany({
    where: {
      supplierId,
      date: { ...(fromDate ? { gte: fromDate } : {}), lte: toDate },
    },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
  });

  const entriesWithBalance = computeRunningBalances(entries, openingBalance);

  const totalDebit = sumMoney(entries.map((e) => e.debit));
  const totalCredit = sumMoney(entries.map((e) => e.credit));
  const closingBalance = entriesWithBalance.length
    ? entriesWithBalance[entriesWithBalance.length - 1].balance
    : openingBalance;

  return {
    supplier: { id: supplier.id, name: supplier.supplierName, gstTin: supplier.gstTin },
    fromDate: fromDate || null,
    toDate,
    openingBalance,
    entries: formatLedgerForPrint(entriesWithBalance),
    totals: { debit: totalDebit, credit: totalCredit },
    closingBalance,
  };
}

// =========================================================
// CANCEL / REVERSE PAYMENT (used by DELETE — never a hard delete)
// =========================================================

async function cancelPayment(id, cancelReason) {
  if (!cancelReason) throw makeError('A cancel reason is required.', 400, 'REASON_REQUIRED');

  return prisma.$transaction(async (tx) => {
    const payment = await tx.supplierPayment.findUnique({
      where: { id },
      include: {
        items: { include: { purchase: { include: PURCHASE_WITH_LIVE_BALANCE_INCLUDE } } },
      },
    });
    if (!payment) throw makeError('Supplier payment not found', 404, 'PAYMENT_NOT_FOUND');
    if (payment.status === 'CANCELLED') {
      throw makeError('This payment has already been cancelled.', 409, 'ALREADY_CANCELLED');
    }

    for (const item of payment.items) {
      const purchase = item.purchase;
      const restoredPaid = round2(purchase.paidAmount - item.allocatedAmount);
      const returnsTotal = computeReturnsTotal(purchase);
      const restoredBalance = round2(purchase.netAmount - returnsTotal - restoredPaid);
      const restoredStatus = lte(restoredBalance, 0) ? 'PAID' : restoredPaid > 0 ? 'PARTIAL' : 'PENDING';

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { paidAmount: restoredPaid, balanceAmount: restoredBalance, paymentStatus: restoredStatus },
      });
    }

    await tx.supplierLedger.create({
      data: buildReversalLedgerEntry({
        supplierId: payment.supplierId,
        date: new Date(),
        voucherNo: payment.voucherNo,
        referenceId: payment.id,
        amount: payment.totalAmount,
        particulars: buildReversalParticulars(payment.voucherNo),
        remarks: cancelReason,
      }),
    });

    return tx.supplierPayment.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason },
    });
  });
}

// =========================================================
// UPDATE PAYMENT (cancel original + create corrected voucher, same transaction)
// =========================================================

async function updatePayment(id, input) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.supplierPayment.findUnique({
      where: { id },
      include: {
        items: { include: { purchase: { include: PURCHASE_WITH_LIVE_BALANCE_INCLUDE } } },
      },
    });
    if (!existing) throw makeError('Supplier payment not found', 404, 'PAYMENT_NOT_FOUND');
    if (existing.status === 'CANCELLED') {
      throw makeError('Cannot edit a cancelled payment.', 409, 'ALREADY_CANCELLED');
    }

    for (const item of existing.items) {
      const purchase = item.purchase;
      const restoredPaid = round2(purchase.paidAmount - item.allocatedAmount);
      const returnsTotal = computeReturnsTotal(purchase);
      const restoredBalance = round2(purchase.netAmount - returnsTotal - restoredPaid);
      const restoredStatus = lte(restoredBalance, 0) ? 'PAID' : restoredPaid > 0 ? 'PARTIAL' : 'PENDING';

      await tx.purchase.update({
        where: { id: purchase.id },
        data: { paidAmount: restoredPaid, balanceAmount: restoredBalance, paymentStatus: restoredStatus },
      });
    }

    await tx.supplierLedger.create({
      data: buildReversalLedgerEntry({
        supplierId: existing.supplierId,
        date: new Date(),
        voucherNo: existing.voucherNo,
        referenceId: existing.id,
        amount: existing.totalAmount,
        particulars: buildReversalParticulars(existing.voucherNo),
        remarks: 'Superseded by correction',
      }),
    });

    await tx.supplierPayment.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Superseded by correction' },
    });

    return executePaymentCreation(tx, input);
  });
}

module.exports = {
  searchSuppliers,
  getSupplierOutstandingSummary,
  getPurchaseGrid,
  calculateAutoAllocation,
  createPayment,
  listPayments,
  getPaymentById,
  getPrintData,
  getSupplierLedger,
  cancelPayment,
  updatePayment,
};
