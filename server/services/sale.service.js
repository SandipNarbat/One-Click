const prisma = require("../prisma/prisma");

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Payment-mode detail fields are all nullable on Sale — this just pulls
// whichever ones the frontend sent, regardless of paymentType, so callers
// don't need a big if/else per mode.
function buildPaymentFields(data) {
  return {
    cashTendered: data.cashTendered != null ? Number(data.cashTendered) : null,
    changeAmount: data.changeAmount != null ? Number(data.changeAmount) : null,

    upiNumber: data.upiNumber || null,
    upiType: data.upiType || null,
    bankName: data.bankName || null,

    chequeNo: data.chequeNo || null,
    chequeDate: data.chequeDate ? new Date(data.chequeDate) : null,
    chequeBankName: data.chequeBankName || null,

    cashCollected: data.cashCollected != null ? Number(data.cashCollected) : null,
    financeAmt: data.financeAmt != null ? Number(data.financeAmt) : null,
    financeName: data.financeName || null,
    emiType: data.emiType || null,
    docNo: data.docNo || null,
  };
}

// ── Invoice Number Generator ──────────────────────────────────
// Generates inside the given transaction client so the read-then-write is
// protected; combined with the retry loop in createSale, this avoids two
// concurrent sales being handed the same INV-XXXX number.
async function generateInvoiceNo(tx) {
  const last = await tx.sale.findFirst({ orderBy: { id: "desc" } });
  if (!last || !last.invoiceNo) return "INV-0001";

  const parsed = parseInt(last.invoiceNo.split("-")[1], 10);
  const lastNumber = Number.isNaN(parsed) ? 0 : parsed;

  return `INV-${String(lastNumber + 1).padStart(4, "0")}`;
}

// ── Stock helpers ──────────────────────────────────────────────
async function getAvailableQty(tx, productId) {
  const agg = await tx.stockLedger.aggregate({
    where: { productId },
    _sum: { qtyIn: true, qtyOut: true },
  });
  return (agg._sum.qtyIn || 0) - (agg._sum.qtyOut || 0);
}

// Looks up a scanned IMEI/Serial in PurchaseIMEI and confirms it's actually
// "available" — using the status field your schema already has for this,
// rather than a separate existence lookup. Returns the PurchaseIMEI row so
// the caller can link SaleIMEI back to it and flip its status.
async function assertImeiAvailable(tx, trackingNumber) {
  const purchaseImei = await tx.purchaseIMEI.findUnique({ where: { trackingNumber } });
  if (!purchaseImei) {
    throw new Error(`IMEI/Serial "${trackingNumber}" was not found in any purchase — cannot sell an item that was never received.`);
  }
  if (purchaseImei.status !== "available") {
    throw new Error(`IMEI/Serial "${trackingNumber}" is not available (status: ${purchaseImei.status}).`);
  }
  return purchaseImei;
}

// Validates every line item before anything is written: sufficient qty in
// stock for non-serialized items, and each IMEI/Serial is purchased +
// currently "available" for serialized items. Throws on the first problem
// found so a sale never gets partially created against stock it doesn't
// actually have. Returns a lookup of trackingNumber -> PurchaseIMEI row so
// createSaleWithNo/updateSale don't have to re-query it.
async function validateItemsAgainstStock(tx, items) {
  const purchaseImeiByTrackingNumber = {};

  for (const item of items) {
    const qty = Number(item.qty) || 0;
    const imeis = item.imeis || [];

    if (imeis.length > 0) {
      if (imeis.length !== qty) {
        throw new Error(`"${item.itemName}" has qty ${qty} but ${imeis.length} IMEI/Serial number(s) were scanned — they must match 1:1.`);
      }
      for (const imei of imeis) {
        const purchaseImei = await assertImeiAvailable(tx, imei.trackingNumber);
        purchaseImeiByTrackingNumber[imei.trackingNumber] = purchaseImei;
      }
    } else if (item.productId) {
      const available = await getAvailableQty(tx, Number(item.productId));
      // When updating, the previous sale's ledger rows were already
      // deleted by the caller before this runs, so `available` here
      // already reflects true current stock.
      if (available < qty) {
        throw new Error(`"${item.itemName}" — only ${available} in stock, cannot sell ${qty}.`);
      }
    }
  }

  return purchaseImeiByTrackingNumber;
}

async function createSale(data) {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const invoiceNo = await generateInvoiceNo(tx);
        return await createSaleWithNo(tx, invoiceNo, data);
      });
    } catch (err) {
      // P2002 = Prisma unique constraint violation. If two requests raced
      // and generated the same invoiceNo, retry with a freshly generated one.
      const isDuplicateInvoiceNo =
        err.code === "P2002" && err.meta?.target?.includes?.("invoiceNo");
      if (!isDuplicateInvoiceNo || attempt === MAX_RETRIES - 1) {
        throw err;
      }
    }
  }
}

async function createSaleWithNo(tx, invoiceNo, data) {
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("No items provided for this sale");
  }

  const purchaseImeiByTrackingNumber = await validateItemsAgainstStock(tx, data.items);

  // Sale Header
  const sale = await tx.sale.create({
    data: {
      invoiceNo,
      invoiceDate: new Date(data.invoiceDate),
      saleType: data.saleType || "Retail",
      paymentType: data.paymentType || "Cash",
      customerId: data.customerId ? Number(data.customerId) : undefined,
      customerName: data.customerName || "Walk-in Customer",
      customerMobile: data.customerMobile || null,
      salesPersonId: data.salesPersonId ? Number(data.salesPersonId) : undefined,
      referenceNo: data.referenceNo || null,
      ...buildPaymentFields(data),
      orderNo: data.orderNo || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      transport: data.transport || null,
      vehicleNo: data.vehicleNo || null,
      lrAwbNo: data.lrAwbNo || null,
      ewayBillNo: data.ewayBillNo || null,
      priceList: data.priceList || 'Default',
      deliveryAddress: data.deliveryAddress || null,
      notes: data.notes || null,
      totalItems: data.items.length,
      totalQty: data.totalQty || 0,
      subTotal: data.subTotal || 0,
      discountAmount: data.discountAmount || 0,
      taxableAmount: data.taxableAmount || 0,
      cgstAmount: data.cgstAmount || 0,
      sgstAmount: data.sgstAmount || 0,
      igstAmount: data.igstAmount || 0,
      roundOff: data.roundOff || 0,
      grandTotal: data.grandTotal,
      status: data.status || "SAVED",
    },
  });

  await createSaleItems(tx, sale.id, invoiceNo, data.items, purchaseImeiByTrackingNumber);

  return sale;
}

// Shared by create + update: writes SaleItem rows, SaleIMEI rows (flipping
// the linked PurchaseIMEI to "sold"), and StockLedger qtyOut rows for
// non-serialized items.
async function createSaleItems(tx, saleId, invoiceNo, items, purchaseImeiByTrackingNumber) {
  for (const item of items) {
    const saleItem = await tx.saleItem.create({
      data: {
        saleId,
        productId: item.productId ? Number(item.productId) : undefined,
        barcode: item.barcode || null,
        itemName: item.itemName,
        brand: item.brand || null,
        model: item.model || null,
        hsnCode: item.hsnCode || null,
        colour: item.colour || item.color || null,
        purchasePrice: item.purchasePrice != null ? Number(item.purchasePrice) : null,
        purchasePriceInclTax: item.purchasePriceInclTax != null ? Number(item.purchasePriceInclTax) : null,
        unit: item.unit || "Nos",
        qty: Number(item.qty),
        price: Number(item.price),
        discountPercent: Number(item.discountPercent || 0),
        discountAmount: Number(item.discountAmount || 0),
        taxType: item.taxType || "GST",
        cgstPercent: Number(item.cgstPercent || 0),
        cgstAmount: Number(item.cgstAmount || 0),
        sgstPercent: Number(item.sgstPercent || 0),
        sgstAmount: Number(item.sgstAmount || 0),
        igstPercent: Number(item.igstPercent || 0),
        igstAmount: Number(item.igstAmount || 0),
        amount: Number(item.amount),
      },
    });

    if (item.imeis?.length) {
      for (const imei of item.imeis) {
        const purchaseImei = purchaseImeiByTrackingNumber[imei.trackingNumber];

        await tx.saleIMEI.create({
          data: {
            saleItemId: saleItem.id,
            purchaseImeiId: purchaseImei?.id,
            trackingType: imei.trackingType || "IMEI",
            trackingNumber: imei.trackingNumber,
          },
        });

        // Flip the unit to "sold" so it can never be sold twice.
        if (purchaseImei) {
          await tx.purchaseIMEI.update({
            where: { id: purchaseImei.id },
            data: { status: "sold" },
          });
        }
      }
    }

    // Stock Ledger — sale reduces stock (qtyOut), mirrors how
    // purchase.service.js adds stock (qtyIn) on the way in. Written for
    // every item with a productId, serialized or not — PurchaseIMEI.status
    // tracks *which specific unit* is sold, StockLedger tracks the
    // *running quantity* for reports/dashboards. Both need to move
    // together, same as the purchase side already does.
    if (item.productId) {
      await tx.stockLedger.create({
        data: {
          productId: Number(item.productId),
          transactionType: "SALE",
          transactionNo: invoiceNo,
          qtyIn: 0,
          qtyOut: Number(item.qty),
          rate: Number(item.price),
        },
      });
    }
  }
}

// Get All Sales
async function getAllSales() {
  return await prisma.sale.findMany({
    include: {
      customer: true,
      salesPerson: true,
      saleItems: {
        include: { product: true, imeis: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// Get Sale By ID
async function getSaleById(id) {
  return await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: true,
      salesPerson: true,
      saleItems: {
        include: { product: true, imeis: true },
      },
    },
  });
}

// Update Sale
async function updateSale(id, data) {
  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new Error("No items provided for this sale");
  }

  return await prisma.$transaction(async (tx) => {
    const existingSale = await tx.sale.findUnique({ where: { id } });
    if (!existingSale) throw new Error("Sale not found");

    // Release everything this sale previously held — return each sold
    // IMEI to "available" and delete the old qty-based stock ledger rows —
    // before validating the new item list against availability.
    const existingItems = await tx.saleItem.findMany({
      where: { saleId: id },
      include: { imeis: true },
    });
    const existingItemIds = existingItems.map((item) => item.id);
    const existingPurchaseImeiIds = existingItems
      .flatMap((item) => item.imeis)
      .map((imei) => imei.purchaseImeiId)
      .filter(Boolean);

    if (existingPurchaseImeiIds.length) {
      await tx.purchaseIMEI.updateMany({
        where: { id: { in: existingPurchaseImeiIds } },
        data: { status: "available" },
      });
    }

    await tx.saleIMEI.deleteMany({ where: { saleItemId: { in: existingItemIds } } });
    await tx.saleItem.deleteMany({ where: { saleId: id } });
    await tx.stockLedger.deleteMany({ where: { transactionNo: existingSale.invoiceNo } });

    const purchaseImeiByTrackingNumber = await validateItemsAgainstStock(tx, data.items);

    // Update the sale header
    const sale = await tx.sale.update({
      where: { id },
      data: {
        invoiceDate: new Date(data.invoiceDate),
        saleType: data.saleType || "Retail",
        paymentType: data.paymentType || "Cash",
        customerId: data.customerId ? Number(data.customerId) : undefined,
        customerName: data.customerName || "Walk-in Customer",
        customerMobile: data.customerMobile || null,
        salesPersonId: data.salesPersonId ? Number(data.salesPersonId) : undefined,
        referenceNo: data.referenceNo || null,
        ...buildPaymentFields(data),
        orderNo: data.orderNo || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        transport: data.transport || null,
        vehicleNo: data.vehicleNo || null,
        lrAwbNo: data.lrAwbNo || null,
        ewayBillNo: data.ewayBillNo || null,
        priceList: data.priceList || 'Default',
        deliveryAddress: data.deliveryAddress || null,
        notes: data.notes || null,
        totalItems: data.items.length,
        totalQty: data.totalQty || 0,
        subTotal: data.subTotal || 0,
        discountAmount: data.discountAmount || 0,
        taxableAmount: data.taxableAmount || 0,
        cgstAmount: data.cgstAmount || 0,
        sgstAmount: data.sgstAmount || 0,
        igstAmount: data.igstAmount || 0,
        roundOff: data.roundOff || 0,
        grandTotal: data.grandTotal,
        status: data.status || existingSale.status,
      },
    });

    await createSaleItems(tx, id, existingSale.invoiceNo, data.items, purchaseImeiByTrackingNumber);

    return sale;
  });
}

// Delete Sale
async function deleteSale(id) {
  return await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({ where: { id } });
    if (!sale) throw new Error("Sale not found");

    const items = await tx.saleItem.findMany({
      where: { saleId: id },
      include: { imeis: true },
    });
    const itemIds = items.map((item) => item.id);
    const purchaseImeiIds = items
      .flatMap((item) => item.imeis)
      .map((imei) => imei.purchaseImeiId)
      .filter(Boolean);

    // Release every sold IMEI back to available stock.
    if (purchaseImeiIds.length) {
      await tx.purchaseIMEI.updateMany({
        where: { id: { in: purchaseImeiIds } },
        data: { status: "available" },
      });
    }

    await tx.saleIMEI.deleteMany({ where: { saleItemId: { in: itemIds } } });
    await tx.saleItem.deleteMany({ where: { saleId: id } });

    // Releases quantity-based stock back to available too.
    await tx.stockLedger.deleteMany({ where: { transactionNo: sale.invoiceNo } });

    await tx.sale.delete({ where: { id } });

    return true;
  });
}

async function searchSales(query) {
  return await prisma.sale.findMany({
    where: {
      OR: [
        { invoiceNo: { contains: query } },
        { referenceNo: { contains: query } },
        { customerName: { contains: query } },
        { customerMobile: { contains: query } },
        { saleItems: { some: { barcode: { contains: query } } } },
        { saleItems: { some: { model: { contains: query } } } },
      ],
    },
    include: {
      customer: true,
      salesPerson: true,
      saleItems: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ── Scan-to-add lookup ──────────────────────────────────────────
// Looks up a scanned barcode/IMEI against real stock data for the Sales
// Entry scan flow. Tries an exact IMEI/Serial match first (must still be
// "available"); falls back to the most recent purchase batch carrying
// that barcode for non-serialized items. Returns null if nothing matches.
async function lookupItemByCode(code) {
  const trimmed = String(code || "").trim();
  if (!trimmed) return null;

  const purchaseImei = await prisma.purchaseIMEI.findUnique({
    where: { trackingNumber: trimmed },
    include: { purchaseItem: true },
  });
  if (purchaseImei && purchaseImei.status === "available") {
    const pi = purchaseImei.purchaseItem;
    return {
      matchType: "imei",
      productId: pi.productId,
      itemName: pi.productName,
      brand: pi.brand,
      model: pi.model,
      hsnCode: pi.hsnCode,
      colour: pi.colour,
      barcode: pi.barcode,
      suggestedPrice: pi.salePrice || pi.purchaseRate,
      lastPurchaseRate: pi.purchaseRate,
      lastPurchaseRateInclTax: pi.dpAmount,
      gstPercent: (Number(pi.cgstPercent) || 0) + (Number(pi.sgstPercent) || 0) + (Number(pi.igstPercent) || 0),
      trackingType: purchaseImei.trackingType,
      trackingNumber: purchaseImei.trackingNumber,
    };
  }

  const purchaseItem = await prisma.purchaseItem.findFirst({
    where: { barcode: trimmed },
    orderBy: { id: "desc" },
  });
  if (purchaseItem) {
    return {
      matchType: "barcode",
      productId: purchaseItem.productId,
      itemName: purchaseItem.productName,
      brand: purchaseItem.brand,
      model: purchaseItem.model,
      hsnCode: purchaseItem.hsnCode,
      colour: purchaseItem.colour,
      barcode: purchaseItem.barcode,
      suggestedPrice: purchaseItem.salePrice || purchaseItem.purchaseRate,
      lastPurchaseRate: purchaseItem.purchaseRate,
      lastPurchaseRateInclTax: purchaseItem.dpAmount,
      gstPercent: (Number(purchaseItem.cgstPercent) || 0) + (Number(purchaseItem.sgstPercent) || 0) + (Number(purchaseItem.igstPercent) || 0),
      trackingType: "NONE",
      trackingNumber: "",
    };
  }

  return null;
}

// ── Live stock / margin snapshot ────────────────────────────────
// Shown in Sales Entry the moment a product is picked: how much is
// available, what it last cost (for margin display), and which specific
// IMEIs/Serials are currently sellable.
async function getProductStockInfo(productId) {
  const pid = Number(productId);

  const agg = await prisma.stockLedger.aggregate({
    where: { productId: pid },
    _sum: { qtyIn: true, qtyOut: true },
  });
  const availableQty = (agg._sum.qtyIn || 0) - (agg._sum.qtyOut || 0);

  const lastPurchaseItem = await prisma.purchaseItem.findFirst({
    where: { productId: pid },
    orderBy: { id: "desc" },
  });

  const availableImeis = await prisma.purchaseIMEI.findMany({
    where: { status: "available", purchaseItem: { productId: pid } },
    take: 25,
    orderBy: { id: "desc" },
  });

  return {
    availableQty,
    lastPurchaseRate: lastPurchaseItem?.purchaseRate || 0,
    lastPurchaseRateInclTax: lastPurchaseItem?.dpAmount || 0,
    availableImeis: availableImeis.map((i) => ({
      trackingType: i.trackingType,
      trackingNumber: i.trackingNumber,
    })),
  };
}

module.exports = {
  createSale,
  getAllSales,
  getSaleById,
  updateSale,
  deleteSale,
  searchSales,
  lookupItemByCode,
  getProductStockInfo,
  round2,
};
