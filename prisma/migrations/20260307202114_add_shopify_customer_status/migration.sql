-- CreateEnum
CREATE TYPE "ShopifyCustomerStatus" AS ENUM ('CREATED', 'EXISTING', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "WaitlistEntry" ADD COLUMN     "shopifyCustomerId" TEXT,
ADD COLUMN     "shopifyCustomerStatus" "ShopifyCustomerStatus";
