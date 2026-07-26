/*
  Warnings:

  - You are about to drop the column `imeiNo` on the `PurchaseReturnIMEI` table. All the data in the column will be lost.
  - Added the required column `trackingNumber` to the `PurchaseReturnIMEI` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trackingType` to the `PurchaseReturnIMEI` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PurchaseReturnIMEI" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "returnItemId" INTEGER NOT NULL,
    "purchaseImeiId" INTEGER NOT NULL,
    "trackingType" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseReturnIMEI_returnItemId_fkey" FOREIGN KEY ("returnItemId") REFERENCES "PurchaseReturnItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseReturnIMEI_purchaseImeiId_fkey" FOREIGN KEY ("purchaseImeiId") REFERENCES "purchase_imeis" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PurchaseReturnIMEI" ("createdAt", "id", "purchaseImeiId", "returnItemId") SELECT "createdAt", "id", "purchaseImeiId", "returnItemId" FROM "PurchaseReturnIMEI";
DROP TABLE "PurchaseReturnIMEI";
ALTER TABLE "new_PurchaseReturnIMEI" RENAME TO "PurchaseReturnIMEI";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
