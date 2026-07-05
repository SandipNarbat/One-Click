const prisma = require('../prisma/prisma');

// ── DN Number Generator ───────────────────────────────────────
// Same pattern as your pettycash getNextNo()
async function generateDNNumber() {
    const last = await prisma.purchaseReturn.findFirst({
        orderBy: { id: 'desc' }
    });
    if (!last) return 'DN-0001';
    const n = parseInt(last.dnNumber.replace('DN-', '')) + 1;
    return `DN-${String(n).padStart(4, '0')}`;
}

// ── 1. SEARCH ─────────────────────────────────────────────────
async function searchItem(type, value) {

    if (type === 'imei') {
        // Find the IMEI → its purchase item → its purchase header
        return await prisma.purchaseIMEI.findFirst({
            where: {
                imeiNo: value,
                status: 'available',          // only returnable IMEIs
            },
            include: {
                purchaseItem: {
                    include: {
                        purchase: {
                            include: { supplier: true }
                        }
                    }
                }
            }
        });
    }

    if (type === 'barcode') {
        // Find the most recent purchase item with this barcode that still
        // has returnable qty (returnedQty < qty). Prisma cannot compare two
        // columns inside a `where`, so we fetch matching rows newest-first
        // and pick the first one with stock left to return in JS.
        const rows = await prisma.purchaseItem.findMany({
            where: { barcode: value },
            include: {
                purchase: { include: { supplier: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        return rows.find((r) => r.returnedQty < r.qty) || null;
    }

    if (type === 'invoice') {
        return await prisma.purchase.findFirst({
            where: { invoiceNo: value },
            include: { supplier: true }
        });
    }

    return null;
}

// ── 2. GET RETURNABLE ITEMS ───────────────────────────────────
async function getReturnableItems(purchaseId) {

    // IMEI items: phones where individual units are available
    const imeiItems = await prisma.purchaseIMEI.findMany({
        where: {
            purchaseItem: { purchaseId },
            status: 'available',
        },
        include: {
            purchaseItem: true
        },
        orderBy: { imeiNo: 'asc' }
    });

    // Qty items: accessories where returnedQty < qty
    const allItems = await prisma.purchaseItem.findMany({
        where: { purchaseId }
    });

    // Filter to only items that have no IMEIs (accessories)
    // and still have returnable qty
    const qtyItems = [];
    for (const item of allItems) {
        const imeiCount = await prisma.purchaseIMEI.count({
            where: { purchaseItemId: item.id }
        });
        if (imeiCount === 0 && item.returnedQty < item.qty) {
            qtyItems.push({
                ...item,
                returnableQty: item.qty - item.returnedQty
            });
        }
    }

    return { imeiItems, qtyItems };
}

// ── 3. GET SUPPLIER ITEMS ─────────────────────────────────────
async function getSupplierItems(supplierId) {
    // Get all purchases from this supplier that have returnable items
    const purchases = await prisma.purchase.findMany({
        where: { supplierId },
        include: {
            purchaseItems: {
                include: { imeis: true }
            }
        },
        orderBy: { invoiceDate: 'desc' }
    });

    // Attach returnable items to each purchase
    const result = [];
    for (const purchase of purchases) {
        const items = await getReturnableItems(purchase.id);
        const hasReturnableItems =
            items.imeiItems.length > 0 || items.qtyItems.length > 0;

        if (hasReturnableItems) {
            result.push({ ...purchase, returnableItems: items });
        }
    }

    return result;
}

// ── 4. CREATE RETURN ──────────────────────────────────────────
// Follows same pattern as your createPurchase in purchase.service.js
// Uses prisma.$transaction() — all-or-nothing
//
// Payload:
// {
//   purchaseId, supplierId, returnType, reason, notes,
//   items: [
//     { purchaseItemId: 1, imeiIds: [3,7] },   // phones
//     { purchaseItemId: 5, returnQty: 3 }        // accessories
//   ]
// }

async function createReturn(data) {
    const dnNumber = await generateDNNumber();

    return await prisma.$transaction(async (tx) => {

        // Step 1: Validate purchase belongs to supplier
        const purchase = await tx.purchase.findFirst({
            where: {
                id: Number(data.purchaseId),
                supplierId: Number(data.supplierId)
            }
        });

        if (!purchase) throw new Error('Purchase not found or supplier mismatch');

        // Step 2: Process each item, calculate amounts
        let totalGrossAmount = 0;
        let totalCgstAmount = 0;
        let totalSgstAmount = 0;
        let totalIgstAmount = 0;
        let totalNetAmount = 0;

        const processedItems = [];

        for (const item of data.items) {

            // Fetch the purchase line item
            const lineItem = await tx.purchaseItem.findFirst({
                where: {
                    id: Number(item.purchaseItemId),
                    purchaseId: Number(data.purchaseId)
                }
            });

            if (!lineItem) throw new Error(`Purchase item ${item.purchaseItemId} not found`);

            const hasImeis = Array.isArray(item.imeiIds) && item.imeiIds.length > 0;

            if (hasImeis) {
                // ── Phone / IMEI Product ──────────────────────────────

                // Validate all selected IMEIs
                const imeis = await tx.purchaseIMEI.findMany({
                    where: {
                        id: { in: item.imeiIds.map(Number) },
                        purchaseItemId: lineItem.id,
                        status: 'available'
                    }
                });

                if (imeis.length !== item.imeiIds.length) {
                    throw new Error(
                        `One or more IMEIs are invalid or already returned for item ${item.purchaseItemId}`
                    );
                }

                const returnQty = item.imeiIds.length;

                // Calculate GST proportionally
                const grossAmount = round2(lineItem.purchaseRate * returnQty);
                const cgstAmount = round2(grossAmount * (lineItem.cgstPercent / 100));
                const sgstAmount = round2(grossAmount * (lineItem.sgstPercent / 100));
                const igstAmount = round2(grossAmount * (lineItem.igstPercent / 100));
                const netAmount = round2(grossAmount + cgstAmount + sgstAmount + igstAmount);

                totalGrossAmount += grossAmount;
                totalCgstAmount += cgstAmount;
                totalSgstAmount += sgstAmount;
                totalIgstAmount += igstAmount;
                totalNetAmount += netAmount;

                processedItems.push({
                    lineItem,
                    isImeiProduct: true,
                    imeis,
                    returnQty,
                    grossAmount, cgstAmount, sgstAmount, igstAmount, netAmount
                });

            } else {
                // ── Accessory / Qty Product ───────────────────────────

                const returnQty = Number(item.returnQty);
                const returnableQty = lineItem.qty - lineItem.returnedQty;

                if (!returnQty || returnQty <= 0)
                    throw new Error(`Invalid returnQty for item ${item.purchaseItemId}`);

                if (returnQty > returnableQty)
                    throw new Error(
                        `Cannot return ${returnQty}. Only ${returnableQty} available for item ${item.purchaseItemId}`
                    );

                const grossAmount = round2(lineItem.purchaseRate * returnQty);
                const cgstAmount = round2(grossAmount * (lineItem.cgstPercent / 100));
                const sgstAmount = round2(grossAmount * (lineItem.sgstPercent / 100));
                const igstAmount = round2(grossAmount * (lineItem.igstPercent / 100));
                const netAmount = round2(grossAmount + cgstAmount + sgstAmount + igstAmount);

                totalGrossAmount += grossAmount;
                totalCgstAmount += cgstAmount;
                totalSgstAmount += sgstAmount;
                totalIgstAmount += igstAmount;
                totalNetAmount += netAmount;

                processedItems.push({
                    lineItem,
                    isImeiProduct: false,
                    returnQty,
                    grossAmount, cgstAmount, sgstAmount, igstAmount, netAmount
                });
            }
        }

        // Step 3: Create purchase return header
        const purchaseReturn = await tx.purchaseReturn.create({
            data: {
                dnNumber,
                purchaseId: Number(data.purchaseId),
                supplierId: Number(data.supplierId),
                returnType: data.returnType,
                reason: data.reason,
                notes: data.notes || null,
                grossAmount: totalGrossAmount,
                cgstAmount: totalCgstAmount,
                sgstAmount: totalSgstAmount,
                igstAmount: totalIgstAmount,
                netAmount: totalNetAmount,
                status: 'COMPLETED',
            }
        });

        // Step 4: Process each item
        for (const item of processedItems) {

            // Create return line item
            const returnItem = await tx.purchaseReturnItem.create({
                data: {
                    returnId: purchaseReturn.id,
                    purchaseItemId: item.lineItem.id,
                    returnQty: item.returnQty,
                    purchaseRate: item.lineItem.purchaseRate,
                    cgstPercent: item.lineItem.cgstPercent,
                    cgstAmount: item.cgstAmount,
                    sgstPercent: item.lineItem.sgstPercent,
                    sgstAmount: item.sgstAmount,
                    igstPercent: item.lineItem.igstPercent,
                    igstAmount: item.igstAmount,
                    amount: item.netAmount,
                }
            });

            if (item.isImeiProduct) {
                // Mark each IMEI as returned
                for (const imei of item.imeis) {
                    await tx.purchaseIMEI.update({
                        where: { id: imei.id },
                        data: { status: 'returned' }
                    });

                    // Record which IMEIs were returned
                    await tx.purchaseReturnIMEI.create({
                        data: {
                            returnItemId: returnItem.id,
                            purchaseImeiId: imei.id,
                            imeiNo: imei.imeiNo,
                        }
                    });
                }
            } else {
                // Increment returnedQty on the original purchase item
                await tx.purchaseItem.update({
                    where: { id: item.lineItem.id },
                    data: { returnedQty: { increment: item.returnQty } }
                });
            }

            // Stock Ledger — mirrors your createPurchase pattern
            // qtyOut = units leaving inventory due to return
            if (item.lineItem.productId) {
                await tx.stockLedger.create({
                    data: {
                        productId: item.lineItem.productId,
                        transactionType: 'PURCHASE_RETURN',
                        transactionNo: dnNumber,
                        qtyIn: 0,
                        qtyOut: item.returnQty,
                        rate: item.lineItem.purchaseRate,
                    }
                });
            }
        }

        return purchaseReturn;
    });
}

// ── 5. GET ALL RETURNS ────────────────────────────────────────
// Mirrors your getAllPurchases() pattern
async function getAllReturns() {
    return await prisma.purchaseReturn.findMany({
        include: {
            purchase: { include: { supplier: true } },
            supplier: true,
            returnItems: {
                include: {
                    purchaseItem: true,
                    returnImeis: true,
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

// ── 6. GET RETURN BY ID ───────────────────────────────────────
async function getReturnById(id) {
    return await prisma.purchaseReturn.findUnique({
        where: { id },
        include: {
            purchase: { include: { supplier: true } },
            supplier: true,
            returnItems: {
                include: {
                    purchaseItem: true,
                    returnImeis: true,
                }
            }
        }
    });
}

// ── 7. DEBIT NOTE ─────────────────────────────────────────────
// Reshapes getReturnById into a clean printable format
async function getDebitNote(returnId) {
    const data = await getReturnById(returnId);
    if (!data) return null;

    return {
        dnNumber: data.dnNumber,
        dnDate: data.createdAt,
        supplier: {
            name: data.supplier.supplierName,
            gstTin: data.supplier.gstTin,
        },
        purchase: {
            purchaseNo: data.purchase.purchaseNo,
            invoiceNo: data.purchase.invoiceNo,
            invoiceDate: data.purchase.invoiceDate,
        },
        returnType: data.returnType,
        reason: data.reason,
        notes: data.notes,
        items: data.returnItems.map(item => ({
            productName: item.purchaseItem.productName,
            brand: item.purchaseItem.brand,
            model: item.purchaseItem.model,
            returnQty: item.returnQty,
            purchaseRate: item.purchaseRate,
            cgstPercent: item.cgstPercent,
            cgstAmount: item.cgstAmount,
            sgstPercent: item.sgstPercent,
            sgstAmount: item.sgstAmount,
            igstPercent: item.igstPercent,
            igstAmount: item.igstAmount,
            amount: item.amount,
            imeiNumbers: item.returnImeis.map(i => i.imeiNo),
        })),
        totals: {
            grossAmount: data.grossAmount,
            cgstAmount: data.cgstAmount,
            sgstAmount: data.sgstAmount,
            igstAmount: data.igstAmount,
            netAmount: data.netAmount,
        }
    };
}

// ── Helper ────────────────────────────────────────────────────
const round2 = (val) => Math.round(val * 100) / 100;

module.exports = {
    searchItem,
    getReturnableItems,
    getSupplierItems,
    createReturn,
    getAllReturns,
    getReturnById,
    getDebitNote,
};