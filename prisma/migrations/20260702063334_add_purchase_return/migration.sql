-- CreateTable
CREATE TABLE "voucher_masters" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "voucherNo" TEXT NOT NULL,
    "voucherDate" DATETIME NOT NULL,
    "paidTo" TEXT,
    "particulars" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "amountInWords" TEXT,
    "mode" TEXT,
    "transNo" TEXT,
    "transDate" DATETIME,
    "bankName" TEXT,
    "passedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "petty_cash_deposits" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "voucherNo" TEXT NOT NULL,
    "depositDate" DATETIME NOT NULL,
    "depositedFrom" TEXT,
    "particulars" TEXT,
    "amount" REAL NOT NULL DEFAULT 0,
    "amountInWords" TEXT,
    "mode" TEXT,
    "transNo" TEXT,
    "transDate" DATETIME,
    "bankName" TEXT,
    "passedBy" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PurchaseReturn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dnNumber" TEXT NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "returnType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "grossAmount" REAL NOT NULL DEFAULT 0,
    "cgstAmount" REAL NOT NULL DEFAULT 0,
    "sgstAmount" REAL NOT NULL DEFAULT 0,
    "igstAmount" REAL NOT NULL DEFAULT 0,
    "netAmount" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseReturn_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReturn_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseReturnItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "returnId" INTEGER NOT NULL,
    "purchaseItemId" INTEGER NOT NULL,
    "returnQty" INTEGER NOT NULL DEFAULT 1,
    "purchaseRate" REAL NOT NULL,
    "cgstPercent" REAL NOT NULL DEFAULT 0,
    "cgstAmount" REAL NOT NULL DEFAULT 0,
    "sgstPercent" REAL NOT NULL DEFAULT 0,
    "sgstAmount" REAL NOT NULL DEFAULT 0,
    "igstPercent" REAL NOT NULL DEFAULT 0,
    "igstAmount" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "PurchaseReturn" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReturnItem_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseReturnIMEI" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "returnItemId" INTEGER NOT NULL,
    "purchaseImeiId" INTEGER NOT NULL,
    "imeiNo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseReturnIMEI_returnItemId_fkey" FOREIGN KEY ("returnItemId") REFERENCES "PurchaseReturnItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReturnIMEI_purchaseImeiId_fkey" FOREIGN KEY ("purchaseImeiId") REFERENCES "purchase_imeis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_purchase_imeis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseItemId" INTEGER NOT NULL,
    "imeiNo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'available',
    CONSTRAINT "purchase_imeis_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchase_imeis" ("createdAt", "id", "imeiNo", "purchaseItemId") SELECT "createdAt", "id", "imeiNo", "purchaseItemId" FROM "purchase_imeis";
DROP TABLE "purchase_imeis";
ALTER TABLE "new_purchase_imeis" RENAME TO "purchase_imeis";
CREATE UNIQUE INDEX "purchase_imeis_imeiNo_key" ON "purchase_imeis"("imeiNo");
CREATE TABLE "new_purchase_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseId" INTEGER NOT NULL,
    "productId" INTEGER,
    "company" TEXT,
    "partNo" TEXT,
    "barcode" TEXT,
    "productName" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "colour" TEXT,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "purchaseRate" REAL NOT NULL,
    "discountPercent" REAL DEFAULT 0,
    "discountAmount" REAL DEFAULT 0,
    "cgstPercent" REAL DEFAULT 0,
    "cgstAmount" REAL DEFAULT 0,
    "sgstPercent" REAL DEFAULT 0,
    "sgstAmount" REAL DEFAULT 0,
    "igstPercent" REAL DEFAULT 0,
    "igstAmount" REAL DEFAULT 0,
    "gstPercent" REAL DEFAULT 0,
    "hsnCode" TEXT,
    "dpAmount" REAL,
    "salePrice" REAL,
    "salesGstPercent" REAL DEFAULT 0,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedQty" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_purchase_items" ("amount", "barcode", "brand", "cgstAmount", "cgstPercent", "colour", "company", "createdAt", "discountAmount", "discountPercent", "dpAmount", "gstPercent", "id", "igstAmount", "igstPercent", "model", "partNo", "productId", "productName", "purchaseId", "purchaseRate", "qty", "salePrice", "sgstAmount", "sgstPercent") SELECT "amount", "barcode", "brand", "cgstAmount", "cgstPercent", "colour", "company", "createdAt", "discountAmount", "discountPercent", "dpAmount", "gstPercent", "id", "igstAmount", "igstPercent", "model", "partNo", "productId", "productName", "purchaseId", "purchaseRate", "qty", "salePrice", "sgstAmount", "sgstPercent" FROM "purchase_items";
DROP TABLE "purchase_items";
ALTER TABLE "new_purchase_items" RENAME TO "purchase_items";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "voucher_masters_voucherNo_key" ON "voucher_masters"("voucherNo");

-- CreateIndex
CREATE UNIQUE INDEX "petty_cash_deposits_voucherNo_key" ON "petty_cash_deposits"("voucherNo");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReturn_dnNumber_key" ON "PurchaseReturn"("dnNumber");
