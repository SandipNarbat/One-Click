const prisma = require("../prisma/prisma");

// Generates the next purchase number *inside* the given transaction client,
// so the read-then-write is protected by the transaction. Combined with the
// unique-constraint retry in createPurchase, this avoids two concurrent
// requests being handed the same PUR-XXXX number.
async function generatePurchaseNo(tx) {
  const lastPurchase = await tx.purchase.findFirst({
    orderBy: { id: "desc" },
  });

  if (!lastPurchase || !lastPurchase.purchaseNo) {
    return "PUR-0001";
  }

  const parts = lastPurchase.purchaseNo.split("-");
  const parsed = parseInt(parts[1], 10);
  const lastNumber = Number.isNaN(parsed) ? 0 : parsed;

  return `PUR-${String(lastNumber + 1).padStart(4, "0")}`;
}

// Filters out any IMEI/Serial entries tagged NONE (defensive — the
// frontend should never send these now that it clears the number on
// switching to NONE, but this guards against stale drafts/older
// clients sending a contradictory {trackingType: NONE, trackingNumber: "..."} row.
function validImeis(imeis) {
  return (imeis || []).filter(
    (imei) => imei.trackingType !== "NONE" && imei.trackingNumber
  );
}

async function createPurchase(data) {
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const purchaseNo = await generatePurchaseNo(tx);
        return await createPurchaseWithNo(tx, purchaseNo, data);
      });
    } catch (err) {
      // P2002 = Prisma unique constraint violation. If two requests raced
      // and generated the same purchaseNo, retry with a freshly generated one.
      const isDuplicatePurchaseNo =
        err.code === "P2002" && err.meta?.target?.includes?.("purchaseNo");
      if (!isDuplicatePurchaseNo || attempt === MAX_RETRIES - 1) {
        throw err;
      }
    }
  }
}

async function createPurchaseWithNo(tx, purchaseNo, data) {
  // Purchase Header

  const purchase = await tx.purchase.create({
    data: {
      purchaseNo,

      type: data.type,

      invoiceNo: data.invoiceNo,

      invoiceDate: new Date(data.invoiceDate),

      receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,

      supplierId: Number(data.supplierId),

      totalItems: data.totalItems || 0,

      totalQty: data.totalQty || 0,

      grossAmount: data.grossAmount,

      discountAmount: data.discountAmount || 0,

      cgstAmount: data.cgstAmount || 0,

      sgstAmount: data.sgstAmount || 0,

      igstAmount: data.igstAmount || 0,

      otherCharges: data.otherCharges || 0,

      netAmount: data.netAmount,

      remarks: data.remarks,
    },
  });

  // Purchase Items

  for (const item of data.items) {
    const purchaseItem = await tx.purchaseItem.create({
      data: {
        purchaseId: purchase.id,

        productId: item.productId ? Number(item.productId) : undefined,

        company: item.company,

        partNo: item.partNo,

        barcode: item.barcode,

        productName: item.productName,

        productCategory: item.productCategory || null,

        brand: item.brand,

        model: item.model,

        colour: item.colour,

        qty: Number(item.qty),

        purchaseRate: Number(item.purchaseRate),

        discountPercent: Number(item.discountPercent || 0),

        discountAmount: Number(item.discountAmount || 0),

        cgstPercent: Number(item.cgstPercent || 0),

        cgstAmount: Number(item.cgstAmount || 0),

        sgstPercent: Number(item.sgstPercent || 0),

        sgstAmount: Number(item.sgstAmount || 0),

        igstPercent: Number(item.igstPercent || 0),

        igstAmount: Number(item.igstAmount || 0),

        gstPercent: Number(item.gstPercent || 0),

        hsnCode: item.hsnCode || null,

        dpAmount: Number(item.dpAmount || 0),

        salePrice: Number(item.salePrice || 0),
        salesGstPercent: Number(item.salesGstPercent || 0),

        amount: Number(item.amount),
      },
    });

    // Save IMEIs / Serials — NONE-typed entries are filtered out,
    // never persisted as a row at all.
    const imeisToSave = validImeis(item.imeis);
    if (imeisToSave.length) {
      await tx.purchaseIMEI.createMany({
        data: imeisToSave.map((imei) => ({
          purchaseItemId: purchaseItem.id,
          trackingType: imei.trackingType || "IMEI",
          trackingNumber: imei.trackingNumber,
        })),
      });
    }

    // Stock Ledger (only if product is linked)
    if (item.productId) {
      await tx.stockLedger.create({
        data: {
          productId: Number(item.productId),
          transactionType: "PURCHASE",
          transactionNo: purchaseNo,
          qtyIn: Number(item.qty),
          qtyOut: 0,
          rate: Number(item.purchaseRate),
        },
      });
    }
  }

  return purchase;
}

// Get All Purchases
async function getAllPurchases() {
  return await prisma.purchase.findMany({
    include: {
      supplier: true,
      purchaseItems: {
        include: {
          product: true,
          imeis: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// Get Purchase By ID
async function getPurchaseById(id) {
  return await prisma.purchase.findUnique({
    where: { id },

    include: {
      supplier: true,

      purchaseItems: {
        include: {
          product: true,
          imeis: true,
        },
      },
    },
  });
}

// Delete Purchase
async function deletePurchase(id) {
  return await prisma.$transaction(async (tx) => {
    const items = await tx.purchaseItem.findMany({
      where: {
        purchaseId: id,
      },
    });

    const itemIds = items.map((item) => item.id);

    // Delete IMEIs

    await tx.purchaseIMEI.deleteMany({
      where: {
        purchaseItemId: {
          in: itemIds,
        },
      },
    });

    // Delete Purchase Items

    await tx.purchaseItem.deleteMany({
      where: {
        purchaseId: id,
      },
    });

    // Delete Stock Ledger

    const purchase = await tx.purchase.findUnique({
      where: { id },
    });

    await tx.stockLedger.deleteMany({
      where: {
        transactionNo: purchase.purchaseNo,
      },
    });

    // Delete Purchase

    await tx.purchase.delete({
      where: { id },
    });

    return true;
  });
}

async function updatePurchase(id, data) {
  return await prisma.$transaction(async (tx) => {
    // Delete existing items and their IMEIs first
    const existingItems = await tx.purchaseItem.findMany({ where: { purchaseId: id } });
    const existingItemIds = existingItems.map((item) => item.id);

    await tx.purchaseIMEI.deleteMany({ where: { purchaseItemId: { in: existingItemIds } } });
    await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });

    // Wipe out the stock ledger rows this purchase originally created —
    // they'll be re-created below from the updated items so stock stays
    // in sync with whatever the edit actually saves.
    const existingPurchase = await tx.purchase.findUnique({ where: { id } });
    await tx.stockLedger.deleteMany({
      where: { transactionNo: existingPurchase.purchaseNo },
    });

    // Update the purchase header
    const purchase = await tx.purchase.update({
      where: { id },
      data: {
        type: data.type,
        invoiceNo: data.invoiceNo,
        invoiceDate: new Date(data.invoiceDate),
        receivedDate: data.receivedDate ? new Date(data.receivedDate) : null,
        supplierId: Number(data.supplierId),
        totalItems: data.totalItems || 0,
        totalQty: data.totalQty || 0,
        grossAmount: Number(data.grossAmount),
        discountAmount: Number(data.discountAmount || 0),
        cgstAmount: Number(data.cgstAmount || 0),
        sgstAmount: Number(data.sgstAmount || 0),
        igstAmount: Number(data.igstAmount || 0),
        otherCharges: Number(data.otherCharges || 0),
        netAmount: Number(data.netAmount),
        remarks: data.remarks,
      },
    });

    // Re-create items
    if (data.items?.length) {
      for (const item of data.items) {
        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId: id,
            productId: item.productId ? Number(item.productId) : undefined,
            company: item.company,
            partNo: item.partNo,
            barcode: item.barcode,
            productName: item.productName,
            productCategory: item.productCategory || null,
            brand: item.brand,
            model: item.model,
            colour: item.colour,
            qty: Number(item.qty),
            purchaseRate: Number(item.purchaseRate),
            discountPercent: Number(item.discountPercent || 0),
            discountAmount: Number(item.discountAmount || 0),
            cgstPercent: Number(item.cgstPercent || 0),
            cgstAmount: Number(item.cgstAmount || 0),
            sgstPercent: Number(item.sgstPercent || 0),
            sgstAmount: Number(item.sgstAmount || 0),
            igstPercent: Number(item.igstPercent || 0),
            igstAmount: Number(item.igstAmount || 0),
            gstPercent: Number(item.gstPercent || 0),
            hsnCode: item.hsnCode || null,
            dpAmount: Number(item.dpAmount || 0),
            salePrice: Number(item.salePrice || 0),
            salesGstPercent: Number(item.salesGstPercent || 0),
            amount: Number(item.amount),
          },
        });

        const imeisToSave = validImeis(item.imeis);
        if (imeisToSave.length) {
          await tx.purchaseIMEI.createMany({
            data: imeisToSave.map((imei) => ({
              purchaseItemId: purchaseItem.id,
              trackingType: imei.trackingType || "IMEI",
              trackingNumber: imei.trackingNumber,
            })),
          });
        }

        // Stock Ledger (only if product is linked) — re-created here to
        // match the updated qty/rate, mirroring createPurchase's behaviour.
        if (item.productId) {
          await tx.stockLedger.create({
            data: {
              productId: Number(item.productId),
              transactionType: "PURCHASE",
              transactionNo: purchase.purchaseNo,
              qtyIn: Number(item.qty),
              qtyOut: 0,
              rate: Number(item.purchaseRate),
            },
          });
        }
      }
    }

    return purchase;
  });
}

async function searchPurchases(query) {
  return await prisma.purchase.findMany({
    where: {
      OR: [
        {
          purchaseNo: {
            contains: query,
          },
        },

        {
          invoiceNo: {
            contains: query,
          },
        },

        {
          supplier: {
            supplierName: {
              contains: query,
            },
          },
        },
      ],
    },

    include: {
      supplier: true,
      purchaseItems: true,
    },
  });
}

module.exports = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  searchPurchases,
};