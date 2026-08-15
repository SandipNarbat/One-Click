-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseReturn" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dnNumber" TEXT NOT NULL,
    "purchaseId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "returnType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "grossAmount" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_PurchaseReturn" ("cgstAmount", "createdAt", "dnNumber", "grossAmount", "id", "igstAmount", "netAmount", "notes", "purchaseId", "reason", "returnType", "sgstAmount", "status", "supplierId", "updatedAt") SELECT "cgstAmount", "createdAt", "dnNumber", "grossAmount", "id", "igstAmount", "netAmount", "notes", "purchaseId", "reason", "returnType", "sgstAmount", "status", "supplierId", "updatedAt" FROM "PurchaseReturn";
DROP TABLE "PurchaseReturn";
ALTER TABLE "new_PurchaseReturn" RENAME TO "PurchaseReturn";
CREATE UNIQUE INDEX "PurchaseReturn_dnNumber_key" ON "PurchaseReturn"("dnNumber");
CREATE TABLE "new_PurchaseReturnItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "returnId" INTEGER NOT NULL,
    "purchaseItemId" INTEGER NOT NULL,
    "returnQty" INTEGER NOT NULL DEFAULT 1,
    "purchaseRate" REAL NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
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
INSERT INTO "new_PurchaseReturnItem" ("amount", "cgstAmount", "cgstPercent", "createdAt", "id", "igstAmount", "igstPercent", "purchaseItemId", "purchaseRate", "returnId", "returnQty", "sgstAmount", "sgstPercent") SELECT "amount", "cgstAmount", "cgstPercent", "createdAt", "id", "igstAmount", "igstPercent", "purchaseItemId", "purchaseRate", "returnId", "returnQty", "sgstAmount", "sgstPercent" FROM "PurchaseReturnItem";
DROP TABLE "PurchaseReturnItem";
ALTER TABLE "new_PurchaseReturnItem" RENAME TO "PurchaseReturnItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
