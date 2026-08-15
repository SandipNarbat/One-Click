-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN "colour" TEXT;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN "ewayBillNo" TEXT;
ALTER TABLE "sales" ADD COLUMN "lrAwbNo" TEXT;
ALTER TABLE "sales" ADD COLUMN "priceList" TEXT DEFAULT 'Default';
ALTER TABLE "sales" ADD COLUMN "vehicleNo" TEXT;
