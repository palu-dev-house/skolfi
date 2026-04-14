-- CreateEnum
CREATE TYPE "FeeServiceCategory" AS ENUM ('TRANSPORT', 'ACCOMMODATION');

-- DropIndex
DROP INDEX "online_payment_items_online_payment_id_tuition_id_key";

-- AlterTable
ALTER TABLE "online_payment_items" ADD COLUMN     "fee_bill_id" TEXT,
ADD COLUMN     "service_fee_bill_id" TEXT,
ALTER COLUMN "tuition_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "fee_bill_id" TEXT,
ADD COLUMN     "service_fee_bill_id" TEXT,
ADD COLUMN     "transaction_id" TEXT,
ALTER COLUMN "tuition_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "fee_services" (
    "id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "category" "FeeServiceCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_service_prices" (
    "id" TEXT NOT NULL,
    "fee_service_id" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_service_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_subscriptions" (
    "id" TEXT NOT NULL,
    "fee_service_id" TEXT NOT NULL,
    "student_nis" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_bills" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "fee_service_id" TEXT NOT NULL,
    "student_nis" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "due_date" TIMESTAMP(3) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_by_exit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_fees" (
    "id" TEXT NOT NULL,
    "class_academic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "billing_months" "Month"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_fee_bills" (
    "id" TEXT NOT NULL,
    "service_fee_id" TEXT NOT NULL,
    "student_nis" TEXT NOT NULL,
    "class_academic_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "due_date" TIMESTAMP(3) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_by_exit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_fee_bills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fee_services_academic_year_id_idx" ON "fee_services"("academic_year_id");

-- CreateIndex
CREATE INDEX "fee_services_category_is_active_idx" ON "fee_services"("category", "is_active");

-- CreateIndex
CREATE INDEX "fee_service_prices_fee_service_id_effective_from_idx" ON "fee_service_prices"("fee_service_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "fee_service_prices_fee_service_id_effective_from_key" ON "fee_service_prices"("fee_service_id", "effective_from");

-- CreateIndex
CREATE INDEX "fee_subscriptions_student_nis_idx" ON "fee_subscriptions"("student_nis");

-- CreateIndex
CREATE INDEX "fee_subscriptions_fee_service_id_idx" ON "fee_subscriptions"("fee_service_id");

-- CreateIndex
CREATE INDEX "fee_subscriptions_student_nis_end_date_idx" ON "fee_subscriptions"("student_nis", "end_date");

-- CreateIndex
CREATE INDEX "fee_bills_student_nis_idx" ON "fee_bills"("student_nis");

-- CreateIndex
CREATE INDEX "fee_bills_fee_service_id_idx" ON "fee_bills"("fee_service_id");

-- CreateIndex
CREATE INDEX "fee_bills_status_idx" ON "fee_bills"("status");

-- CreateIndex
CREATE INDEX "fee_bills_due_date_idx" ON "fee_bills"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "fee_bills_subscription_id_period_year_key" ON "fee_bills"("subscription_id", "period", "year");

-- CreateIndex
CREATE INDEX "service_fees_class_academic_id_is_active_idx" ON "service_fees"("class_academic_id", "is_active");

-- CreateIndex
CREATE INDEX "service_fee_bills_student_nis_idx" ON "service_fee_bills"("student_nis");

-- CreateIndex
CREATE INDEX "service_fee_bills_class_academic_id_idx" ON "service_fee_bills"("class_academic_id");

-- CreateIndex
CREATE INDEX "service_fee_bills_status_idx" ON "service_fee_bills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "service_fee_bills_service_fee_id_student_nis_period_year_key" ON "service_fee_bills"("service_fee_id", "student_nis", "period", "year");

-- CreateIndex
CREATE INDEX "online_payment_items_fee_bill_id_idx" ON "online_payment_items"("fee_bill_id");

-- CreateIndex
CREATE INDEX "online_payment_items_service_fee_bill_id_idx" ON "online_payment_items"("service_fee_bill_id");

-- CreateIndex
CREATE INDEX "payments_fee_bill_id_idx" ON "payments"("fee_bill_id");

-- CreateIndex
CREATE INDEX "payments_service_fee_bill_id_idx" ON "payments"("service_fee_bill_id");

-- CreateIndex
CREATE INDEX "payments_transaction_id_idx" ON "payments"("transaction_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fee_bill_id_fkey" FOREIGN KEY ("fee_bill_id") REFERENCES "fee_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_service_fee_bill_id_fkey" FOREIGN KEY ("service_fee_bill_id") REFERENCES "service_fee_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_payment_items" ADD CONSTRAINT "online_payment_items_fee_bill_id_fkey" FOREIGN KEY ("fee_bill_id") REFERENCES "fee_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_payment_items" ADD CONSTRAINT "online_payment_items_service_fee_bill_id_fkey" FOREIGN KEY ("service_fee_bill_id") REFERENCES "service_fee_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_services" ADD CONSTRAINT "fee_services_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_service_prices" ADD CONSTRAINT "fee_service_prices_fee_service_id_fkey" FOREIGN KEY ("fee_service_id") REFERENCES "fee_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_subscriptions" ADD CONSTRAINT "fee_subscriptions_fee_service_id_fkey" FOREIGN KEY ("fee_service_id") REFERENCES "fee_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_subscriptions" ADD CONSTRAINT "fee_subscriptions_student_nis_fkey" FOREIGN KEY ("student_nis") REFERENCES "students"("nis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_bills" ADD CONSTRAINT "fee_bills_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "fee_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_bills" ADD CONSTRAINT "fee_bills_fee_service_id_fkey" FOREIGN KEY ("fee_service_id") REFERENCES "fee_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_bills" ADD CONSTRAINT "fee_bills_student_nis_fkey" FOREIGN KEY ("student_nis") REFERENCES "students"("nis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fees" ADD CONSTRAINT "service_fees_class_academic_id_fkey" FOREIGN KEY ("class_academic_id") REFERENCES "class_academics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_bills" ADD CONSTRAINT "service_fee_bills_service_fee_id_fkey" FOREIGN KEY ("service_fee_id") REFERENCES "service_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_bills" ADD CONSTRAINT "service_fee_bills_student_nis_fkey" FOREIGN KEY ("student_nis") REFERENCES "students"("nis") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_bills" ADD CONSTRAINT "service_fee_bills_class_academic_id_fkey" FOREIGN KEY ("class_academic_id") REFERENCES "class_academics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
