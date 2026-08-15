-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN "barcode" TEXT;
ALTER TABLE "sale_items" ADD COLUMN "brand" TEXT;
ALTER TABLE "sale_items" ADD COLUMN "model" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "bankName" TEXT;
ALTER TABLE "sales" ADD COLUMN "cashCollected" REAL;
ALTER TABLE "sales" ADD COLUMN "cashTendered" REAL;
ALTER TABLE "sales" ADD COLUMN "changeAmount" REAL;
ALTER TABLE "sales" ADD COLUMN "chequeBankName" TEXT;
ALTER TABLE "sales" ADD COLUMN "chequeDate" DATETIME;
ALTER TABLE "sales" ADD COLUMN "chequeNo" TEXT;
ALTER TABLE "sales" ADD COLUMN "docNo" TEXT;
ALTER TABLE "sales" ADD COLUMN "emiType" TEXT;
ALTER TABLE "sales" ADD COLUMN "financeAmt" REAL;
ALTER TABLE "sales" ADD COLUMN "financeName" TEXT;
ALTER TABLE "sales" ADD COLUMN "upiNumber" TEXT;
ALTER TABLE "sales" ADD COLUMN "upiType" TEXT;
