-- CreateTable
CREATE TABLE "suppliers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierId" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "mobile" TEXT,
    "landline" TEXT,
    "address" TEXT,
    "state" TEXT,
    "gstTin" TEXT,
    "aadharNo" TEXT,
    "panNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "customers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "customerId" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT,
    "contactNo" TEXT,
    "mobileNo" TEXT,
    "address" TEXT,
    "state" TEXT,
    "gstTin" TEXT,
    "aadharNo" TEXT,
    "panNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "products" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prodCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "hsnCode" TEXT,
    "productCategory" TEXT,
    "gstPercentage" REAL,
    "organisation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "supplierId" INTEGER,
    "model" TEXT,
    "brand" TEXT,
    "colour" TEXT,
    "imeiNo" TEXT,
    "dp" REAL,
    "salePrice" REAL,
    "tax" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "items_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemId" INTEGER NOT NULL,
    "oldDp" REAL,
    "newDp" REAL,
    "oldSalePrice" REAL,
    "newSalePrice" REAL,
    "oldImei" TEXT,
    "newImei" TEXT,
    "remark" TEXT,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "price_history_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "doa_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "supplierId" INTEGER NOT NULL,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "totalQty" INTEGER NOT NULL,
    "totalAmount" REAL NOT NULL,
    "itemId" TEXT,
    "productName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "doa_records_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales_persons" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "contactNo" TEXT,
    "email" TEXT,
    "address" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "service_centers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "serialNo" TEXT NOT NULL,
    "productType" TEXT,
    "brandName" TEXT,
    "serviceCentreNo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "sales" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceNo" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "customerId" INTEGER,
    "salesPersonId" INTEGER,
    "itemId" TEXT,
    "productName" TEXT,
    "model" TEXT,
    "brand" TEXT,
    "quantity" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sales_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "sales_salesPersonId_fkey" FOREIGN KEY ("salesPersonId") REFERENCES "sales_persons" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);


--AMAN GUPTA
-- CreateTable  AMAN GUPTA
CREATE TABLE "purchases" (
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
    CONSTRAINT "purchases_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable  AMAN GUPTA
CREATE TABLE "purchase_items" (
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
    "dpAmount" REAL,
    "salePrice" REAL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_items_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "purchase_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable AMAN GUPTA
CREATE TABLE "purchase_imeis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchaseItemId" INTEGER NOT NULL,
    "imeiNo" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "purchase_imeis_purchaseItemId_fkey" FOREIGN KEY ("purchaseItemId") REFERENCES "purchase_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable  AMAN GUPTA
CREATE TABLE "stock_ledger" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "transactionType" TEXT NOT NULL,
    "transactionNo" TEXT NOT NULL,
    "qtyIn" INTEGER NOT NULL DEFAULT 0,
    "qtyOut" INTEGER NOT NULL DEFAULT 0,
    "rate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_ledger_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

--AMAN GUPTA

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplierId_key" ON "suppliers"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerId_key" ON "customers"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "products_prodCode_key" ON "products"("prodCode");

-- CreateIndex
CREATE UNIQUE INDEX "items_itemId_key" ON "items"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "items_imeiNo_key" ON "items"("imeiNo");

-- CreateIndex
CREATE UNIQUE INDEX "sales_persons_employeeId_key" ON "sales_persons"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "service_centers_serialNo_key" ON "service_centers"("serialNo");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoiceNo_key" ON "sales"("invoiceNo");

-- CreateIndex AMAN GUPTA
CREATE UNIQUE INDEX "purchases_purchaseNo_key" ON "purchases"("purchaseNo");

-- CreateIndex AMAN GUPTA
CREATE UNIQUE INDEX "purchase_imeis_imeiNo_key" ON "purchase_imeis"("imeiNo");
