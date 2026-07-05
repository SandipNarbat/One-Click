const prisma = require("../prisma/prisma");

async function generatePurchaseNo() {
  const lastPurchase = await prisma.purchase.findFirst({
    orderBy: { id: "desc" },
  });

  if (!lastPurchase) {
    return "PUR-0001";
  }

  const number = parseInt(lastPurchase.purchaseNo.split("-")[1]) + 1;

  return `PUR-${String(number).padStart(4, "0")}`;
}

async function createPurchase(data) {
  const purchaseNo = await generatePurchaseNo();

  return await prisma.$transaction(async (tx) => {
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

      // Save IMEIs

      if (item.imeis?.length) {
        await tx.purchaseIMEI.createMany({
          data: item.imeis.map((imei) => ({
            purchaseItemId: purchaseItem.id,
            imeiNo: imei,
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
  });
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

    // Update the purchase header
    const purchase = await tx.purchase.update({
      where: { id },
      data: {
        type:           data.type,
        invoiceNo:      data.invoiceNo,
        invoiceDate:    new Date(data.invoiceDate),
        receivedDate:   data.receivedDate ? new Date(data.receivedDate) : null,
        supplierId:     Number(data.supplierId),
        totalItems:     data.totalItems   || 0,
        totalQty:       data.totalQty     || 0,
        grossAmount:    Number(data.grossAmount),
        discountAmount: Number(data.discountAmount || 0),
        cgstAmount:     Number(data.cgstAmount     || 0),
        sgstAmount:     Number(data.sgstAmount     || 0),
        igstAmount:     Number(data.igstAmount     || 0),
        otherCharges:   Number(data.otherCharges   || 0),
        netAmount:      Number(data.netAmount),
        remarks:        data.remarks,
      },
    });

    // Re-create items
    if (data.items?.length) {
      for (const item of data.items) {
        const purchaseItem = await tx.purchaseItem.create({
          data: {
            purchaseId:      id,
            productId:       item.productId ? Number(item.productId) : undefined,
            company:         item.company,
            partNo:          item.partNo,
            barcode:         item.barcode,
            productName:     item.productName,
            brand:           item.brand,
            model:           item.model,
            colour:          item.colour,
            qty:             Number(item.qty),
            purchaseRate:    Number(item.purchaseRate),
            discountPercent: Number(item.discountPercent || 0),
            discountAmount:  Number(item.discountAmount  || 0),
            cgstPercent:     Number(item.cgstPercent     || 0),
            cgstAmount:      Number(item.cgstAmount      || 0),
            sgstPercent:     Number(item.sgstPercent     || 0),
            sgstAmount:      Number(item.sgstAmount      || 0),
            igstPercent:     Number(item.igstPercent     || 0),
            igstAmount:      Number(item.igstAmount      || 0),
            gstPercent:      Number(item.gstPercent      || 0),
            hsnCode:         item.hsnCode || null,
            dpAmount:        Number(item.dpAmount        || 0),
            salePrice:       Number(item.salePrice       || 0),
            salesGstPercent: Number(item.salesGstPercent || 0),
            amount:          Number(item.amount),
          },
        });

        if (item.imeis?.length) {
          await tx.purchaseIMEI.createMany({
            data: item.imeis.map((imei) => ({
              purchaseItemId: purchaseItem.id,
              imeiNo: imei,
            })),
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
