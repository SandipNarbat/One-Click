/*
  Warnings:

  - You are about to drop the column `amount` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `itemId` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `model` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `sales` table. All the data in the column will be lost.
  - Added the required column `customerName` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "sale_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleId" INTEGER NOT NULL,
    "productId" INTEGER,
    "itemName" TEXT NOT NULL,
    "hsnCode" TEXT,
    "unit" TEXT DEFAULT 'Nos',
    "qty" REAL NOT NULL,
    "price" REAL NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "taxType" TEXT NOT NULL DEFAULT 'GST',
    "cgstPercent" REAL NOT NULL DEFAULT 0,
    "cgstAmount" REAL NOT NULL DEFAULT 0,
    "sgstPercent" REAL NOT NULL DEFAULT 0,
    "sgstAmount" REAL NOT NULL DEFAULT 0,
    "igstPercent" REAL NOT NULL DEFAULT 0,
    "igstAmount" REAL NOT NULL DEFAULT 0,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sale_imeis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "saleItemId" INTEGER NOT NULL,
    "purchaseImeiId" INTEGER,
    "trackingType" TEXT NOT NULL DEFAULT 'IMEI',
    "trackingNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sale_imeis_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "sale_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sale_imeis_purchaseImeiId_fkey" FOREIGN KEY ("purchaseImeiId") REFERENCES "purchase_imeis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_sales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "saleType" TEXT NOT NULL DEFAULT 'Retail',
    "paymentType" TEXT NOT NULL DEFAULT 'Cash',
    "customerId" INTEGER,
    "customerName" TEXT NOT NULL,
    "customerMobile" TEXT,
    "salesPersonId" INTEGER,
    "referenceNo" TEXT,
    "orderNo" TEXT,
    "dueDate" DATETIME,
    "transport" TEXT,
    "deliveryAddress" TEXT,
    "notes" TEXT,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalQty" REAL NOT NULL DEFAULT 0,
    "subTotal" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "taxableAmount" REAL NOT NULL DEFAULT 0,
    "cgstAmount" REAL NOT NULL DEFAULT 0,
    "sgstAmount" REAL NOT NULL DEFAULT 0,
    "igstAmount" REAL NOT NULL DEFAULT 0,
    "roundOff" REAL NOT NULL DEFAULT 0,
    "grandTotal" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "sales_persons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_sales" ("createdAt", "customerId", "id", "invoiceDate", "invoiceNo", "salesPersonId") SELECT "createdAt", "customerId", "id", "invoiceDate", "invoiceNo", "salesPersonId" FROM "sales";
DROP TABLE "sales";
ALTER TABLE "new_sales" RENAME TO "sales";
CREATE UNIQUE INDEX "sales_invoiceNo_key" ON "sales"("invoiceNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
