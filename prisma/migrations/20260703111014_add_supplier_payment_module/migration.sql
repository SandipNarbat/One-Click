-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "voucherNo" TEXT NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "remarks" TEXT,
    "mode" TEXT NOT NULL,
    "bankName" TEXT,
    "transNo" TEXT,
    "refNo" TEXT,
    "transDate" DATETIME,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "supplier_payments_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supplier_payment_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paymentId" INTEGER NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "allocatedAmount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplier_payment_items_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "supplier_payments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supplier_payment_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "voucher_sequences" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prefix" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "supplier_ledger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "voucherNo" TEXT NOT NULL,
    "voucherType" TEXT NOT NULL,
    "referenceId" INTEGER,
    "debit" REAL NOT NULL DEFAULT 0,
    "credit" REAL NOT NULL DEFAULT 0,
    "particulars" TEXT,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplier_ledger_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_purchases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseNo" TEXT NOT NULL,
    "type" TEXT,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "receivedDate" DATETIME,
    "supplierId" INTEGER NOT NULL,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "grossAmount" REAL NOT NULL,
    "discountAmount" REAL DEFAULT 0,
    "cgstAmount" REAL DEFAULT 0,
    "sgstAmount" REAL DEFAULT 0,
    "igstAmount" REAL DEFAULT 0,
    "otherCharges" REAL DEFAULT 0,
    "netAmount" REAL NOT NULL,
    "remarks" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0,
    "balanceAmount" REAL NOT NULL DEFAULT 0,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchases" ("cgstAmount", "createdAt", "discountAmount", "grossAmount", "id", "igstAmount", "invoiceDate", "invoiceNo", "netAmount", "otherCharges", "purchaseNo", "receivedDate", "remarks", "sgstAmount", "status", "supplierId", "totalItems", "totalQty", "type", "updatedAt") SELECT "cgstAmount", "createdAt", "discountAmount", "grossAmount", "id", "igstAmount", "invoiceDate", "invoiceNo", "netAmount", "otherCharges", "purchaseNo", "receivedDate", "remarks", "sgstAmount", "status", "supplierId", "totalItems", "totalQty", "type", "updatedAt" FROM "purchases";
DROP TABLE "purchases";
ALTER TABLE "new_purchases" RENAME TO "purchases";
CREATE UNIQUE INDEX "purchases_purchaseNo_key" ON "purchases"("purchaseNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payments_voucherNo_key" ON "supplier_payments"("voucherNo");

-- CreateIndex
CREATE INDEX "supplier_payments_supplierId_idx" ON "supplier_payments"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_payments_paymentDate_idx" ON "supplier_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "supplier_payment_items_purchaseId_idx" ON "supplier_payment_items"("purchaseId");

-- CreateIndex
CREATE INDEX "supplier_payment_items_paymentId_idx" ON "supplier_payment_items"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_sequences_prefix_key" ON "voucher_sequences"("prefix");

-- CreateIndex
CREATE INDEX "supplier_ledger_supplierId_idx" ON "supplier_ledger"("supplierId");

-- CreateIndex
CREATE INDEX "supplier_ledger_supplierId_date_idx" ON "supplier_ledger"("supplierId", "date");
