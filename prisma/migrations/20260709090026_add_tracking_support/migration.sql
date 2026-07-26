/*
  Warnings:

  - You are about to drop the column `imeiNo` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `imeiNo` on the `purchase_imeis` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "model" TEXT,
    "brand" TEXT,
    "colour" TEXT,
    "trackingType" TEXT NOT NULL DEFAULT 'IMEI',
    "trackingNumber" TEXT,
    "dp" REAL,
    "salePrice" REAL,
    "tax" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_items" ("brand", "colour", "createdAt", "dp", "id", "itemId", "model", "productId", "quantity", "salePrice", "supplierId", "tax", "updatedAt") SELECT "brand", "colour", "createdAt", "dp", "id", "itemId", "model", "productId", "quantity", "salePrice", "supplierId", "tax", "updatedAt" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE UNIQUE INDEX "items_itemId_key" ON "items"("itemId");
CREATE UNIQUE INDEX "items_trackingNumber_key" ON "items"("trackingNumber");
CREATE TABLE "new_purchase_imeis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseItemId" INTEGER NOT NULL,
    "trackingType" TEXT NOT NULL DEFAULT 'IMEI',
    "trackingNumber" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'available',
    CONSTRAINT "purchase_imeis_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_purchase_imeis" ("createdAt", "id", "purchaseItemId", "status") SELECT "createdAt", "id", "purchaseItemId", "status" FROM "purchase_imeis";
DROP TABLE "purchase_imeis";
ALTER TABLE "new_purchase_imeis" RENAME TO "purchase_imeis";
CREATE UNIQUE INDEX "purchase_imeis_trackingNumber_key" ON "purchase_imeis"("trackingNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
