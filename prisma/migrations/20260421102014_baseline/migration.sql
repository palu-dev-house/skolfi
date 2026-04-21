-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CASHIER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL', 'VOID');

-- CreateEnum
CREATE TYPE "Month" AS ENUM ('JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE');

-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMESTER');

-- CreateEnum
CREATE TYPE "OnlinePaymentStatus" AS ENUM ('PENDING', 'SETTLEMENT', 'EXPIRE', 'CANCEL', 'DENY', 'FAILURE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WhatsAppLogStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "FeeServiceCategory" AS ENUM ('TRANSPORT', 'ACCOMMODATION');

-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('TK', 'SD', 'SMP', 'SMA');

-- CreateTable
CREATE TABLE "employees" (
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CASHIER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("employee_id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "nis" TEXT NOT NULL,
    "school_level" "SchoolLevel" NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "parent_name" TEXT NOT NULL,
    "parent_phone" TEXT NOT NULL,
    "start_join_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "has_account" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "last_payment_at" TIMESTAMP(3),
    "account_created_at" TIMESTAMP(3),
    "account_created_by" TEXT,
    "exited_at" TIMESTAMP(3),
    "exit_reason" TEXT,
    "exited_by" TEXT,
    "account_deleted" BOOLEAN NOT NULL DEFAULT false,
    "account_deleted_at" TIMESTAMP(3),
    "account_deleted_by" TEXT,
    "account_deleted_reason" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_academics" (
    "id" TEXT NOT NULL,
    "academic_year_id" TEXT NOT NULL,
    "school_level" "SchoolLevel" NOT NULL DEFAULT 'SD',
    "grade" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "class_name" TEXT NOT NULL,
    "payment_frequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY',
    "monthly_fee" DECIMAL(10,2),
    "quarterly_fee" DECIMAL(10,2),
    "semester_fee" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_academics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_classes" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_academic_id" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tuitions" (
    "id" TEXT NOT NULL,
    "class_academic_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "month" "Month",
    "year" INTEGER NOT NULL,
    "fee_amount" DECIMAL(10,2) NOT NULL,
    "scholarship_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_id" TEXT,
    "paid_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "due_date" TIMESTAMP(3) NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "voided_by_exit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tuitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarships" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "class_academic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Scholarship',
    "nominal" DECIMAL(10,2) NOT NULL,
    "is_full_scholarship" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scholarships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "tuition_id" TEXT,
    "fee_bill_id" TEXT,
    "service_fee_bill_id" TEXT,
    "transaction_id" TEXT,
    "employee_id" TEXT,
    "online_payment_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "scholarship_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reason" TEXT,
    "discount_amount" DECIMAL(10,2) NOT NULL,
    "target_periods" TEXT[],
    "academic_year_id" TEXT NOT NULL,
    "class_academic_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "gross_amount" DECIMAL(12,2) NOT NULL,
    "snap_token" TEXT,
    "snap_redirect_url" TEXT,
    "bank" TEXT,
    "va_number" TEXT,
    "bill_key" TEXT,
    "biller_code" TEXT,
    "payment_type" TEXT,
    "status" "OnlinePaymentStatus" NOT NULL DEFAULT 'PENDING',
    "midtrans_response" TEXT,
    "transaction_time" TIMESTAMP(3),
    "settlement_time" TIMESTAMP(3),
    "expiry_time" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_payment_items" (
    "id" TEXT NOT NULL,
    "online_payment_id" TEXT NOT NULL,
    "tuition_id" TEXT,
    "fee_bill_id" TEXT,
    "service_fee_bill_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "online_payment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "midtrans_webhook_logs" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "transaction_status" TEXT NOT NULL,
    "status_code" TEXT NOT NULL,
    "signature_key" TEXT NOT NULL,
    "raw_payload" TEXT NOT NULL,
    "is_valid" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "online_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "midtrans_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "online_payment_enabled" BOOLEAN NOT NULL DEFAULT true,
    "maintenance_message" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "payment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "key" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "rate_limit_records" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "window_start" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_logs" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "WhatsAppLogStatus" NOT NULL DEFAULT 'PENDING',
    "message_id" TEXT,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

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
    "student_id" TEXT NOT NULL,
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
    "student_id" TEXT NOT NULL,
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
    "student_id" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");

-- CreateIndex
CREATE INDEX "students_exited_at_idx" ON "students"("exited_at");

-- CreateIndex
CREATE INDEX "students_has_account_idx" ON "students"("has_account");

-- CreateIndex
CREATE INDEX "students_has_account_account_deleted_idx" ON "students"("has_account", "account_deleted");

-- CreateIndex
CREATE INDEX "students_last_payment_at_idx" ON "students"("last_payment_at");

-- CreateIndex
CREATE UNIQUE INDEX "students_nis_school_level_key" ON "students"("nis", "school_level");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_year_key" ON "academic_years"("year");

-- CreateIndex
CREATE UNIQUE INDEX "class_academics_academic_year_id_school_level_grade_section_key" ON "class_academics"("academic_year_id", "school_level", "grade", "section");

-- CreateIndex
CREATE INDEX "student_classes_student_id_idx" ON "student_classes"("student_id");

-- CreateIndex
CREATE INDEX "student_classes_class_academic_id_idx" ON "student_classes"("class_academic_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_classes_student_id_class_academic_id_key" ON "student_classes"("student_id", "class_academic_id");

-- CreateIndex
CREATE INDEX "tuitions_student_id_idx" ON "tuitions"("student_id");

-- CreateIndex
CREATE INDEX "tuitions_class_academic_id_idx" ON "tuitions"("class_academic_id");

-- CreateIndex
CREATE INDEX "tuitions_status_idx" ON "tuitions"("status");

-- CreateIndex
CREATE INDEX "tuitions_due_date_idx" ON "tuitions"("due_date");

-- CreateIndex
CREATE INDEX "tuitions_period_idx" ON "tuitions"("period");

-- CreateIndex
CREATE INDEX "tuitions_discount_id_idx" ON "tuitions"("discount_id");

-- CreateIndex
CREATE UNIQUE INDEX "tuitions_class_academic_id_student_id_period_year_key" ON "tuitions"("class_academic_id", "student_id", "period", "year");

-- CreateIndex
CREATE INDEX "scholarships_student_id_idx" ON "scholarships"("student_id");

-- CreateIndex
CREATE INDEX "scholarships_class_academic_id_idx" ON "scholarships"("class_academic_id");

-- CreateIndex
CREATE INDEX "scholarships_student_id_class_academic_id_idx" ON "scholarships"("student_id", "class_academic_id");

-- CreateIndex
CREATE INDEX "payments_tuition_id_idx" ON "payments"("tuition_id");

-- CreateIndex
CREATE INDEX "payments_fee_bill_id_idx" ON "payments"("fee_bill_id");

-- CreateIndex
CREATE INDEX "payments_service_fee_bill_id_idx" ON "payments"("service_fee_bill_id");

-- CreateIndex
CREATE INDEX "payments_transaction_id_idx" ON "payments"("transaction_id");

-- CreateIndex
CREATE INDEX "payments_employee_id_idx" ON "payments"("employee_id");

-- CreateIndex
CREATE INDEX "payments_online_payment_id_idx" ON "payments"("online_payment_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "discounts_academic_year_id_idx" ON "discounts"("academic_year_id");

-- CreateIndex
CREATE INDEX "discounts_class_academic_id_idx" ON "discounts"("class_academic_id");

-- CreateIndex
CREATE INDEX "discounts_is_active_idx" ON "discounts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "online_payments_order_id_key" ON "online_payments"("order_id");

-- CreateIndex
CREATE INDEX "online_payments_student_id_idx" ON "online_payments"("student_id");

-- CreateIndex
CREATE INDEX "online_payments_status_idx" ON "online_payments"("status");

-- CreateIndex
CREATE INDEX "online_payments_expiry_time_idx" ON "online_payments"("expiry_time");

-- CreateIndex
CREATE INDEX "online_payments_created_at_idx" ON "online_payments"("created_at");

-- CreateIndex
CREATE INDEX "online_payment_items_tuition_id_idx" ON "online_payment_items"("tuition_id");

-- CreateIndex
CREATE INDEX "online_payment_items_fee_bill_id_idx" ON "online_payment_items"("fee_bill_id");

-- CreateIndex
CREATE INDEX "online_payment_items_service_fee_bill_id_idx" ON "online_payment_items"("service_fee_bill_id");

-- CreateIndex
CREATE INDEX "midtrans_webhook_logs_order_id_idx" ON "midtrans_webhook_logs"("order_id");

-- CreateIndex
CREATE INDEX "midtrans_webhook_logs_created_at_idx" ON "midtrans_webhook_logs"("created_at");

-- CreateIndex
CREATE INDEX "idempotency_records_status_expires_at_idx" ON "idempotency_records"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_records_key_key" ON "rate_limit_records"("key");

-- CreateIndex
CREATE INDEX "rate_limit_records_status_expires_at_idx" ON "rate_limit_records"("status", "expires_at");

-- CreateIndex
CREATE INDEX "rate_limit_records_action_identifier_status_idx" ON "rate_limit_records"("action", "identifier", "status");

-- CreateIndex
CREATE INDEX "whatsapp_logs_status_idx" ON "whatsapp_logs"("status");

-- CreateIndex
CREATE INDEX "whatsapp_logs_phone_idx" ON "whatsapp_logs"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_logs_message_type_idx" ON "whatsapp_logs"("message_type");

-- CreateIndex
CREATE INDEX "fee_services_academic_year_id_idx" ON "fee_services"("academic_year_id");

-- CreateIndex
CREATE INDEX "fee_services_category_is_active_idx" ON "fee_services"("category", "is_active");

-- CreateIndex
CREATE INDEX "fee_service_prices_fee_service_id_effective_from_idx" ON "fee_service_prices"("fee_service_id", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "fee_service_prices_fee_service_id_effective_from_key" ON "fee_service_prices"("fee_service_id", "effective_from");

-- CreateIndex
CREATE INDEX "fee_subscriptions_student_id_idx" ON "fee_subscriptions"("student_id");

-- CreateIndex
CREATE INDEX "fee_subscriptions_fee_service_id_idx" ON "fee_subscriptions"("fee_service_id");

-- CreateIndex
CREATE INDEX "fee_subscriptions_student_id_end_date_idx" ON "fee_subscriptions"("student_id", "end_date");

-- CreateIndex
CREATE INDEX "fee_bills_student_id_idx" ON "fee_bills"("student_id");

-- CreateIndex
CREATE INDEX "fee_bills_fee_service_id_idx" ON "fee_bills"("fee_service_id");

-- CreateIndex
CREATE INDEX "fee_bills_status_idx" ON "fee_bills"("status");

-- CreateIndex
CREATE INDEX "fee_bills_student_id_status_idx" ON "fee_bills"("student_id", "status");

-- CreateIndex
CREATE INDEX "fee_bills_due_date_idx" ON "fee_bills"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "fee_bills_subscription_id_period_year_key" ON "fee_bills"("subscription_id", "period", "year");

-- CreateIndex
CREATE INDEX "service_fees_class_academic_id_is_active_idx" ON "service_fees"("class_academic_id", "is_active");

-- CreateIndex
CREATE INDEX "service_fee_bills_student_id_idx" ON "service_fee_bills"("student_id");

-- CreateIndex
CREATE INDEX "service_fee_bills_class_academic_id_idx" ON "service_fee_bills"("class_academic_id");

-- CreateIndex
CREATE INDEX "service_fee_bills_status_idx" ON "service_fee_bills"("status");

-- CreateIndex
CREATE INDEX "service_fee_bills_student_id_status_idx" ON "service_fee_bills"("student_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_fee_bills_service_fee_id_student_id_period_year_key" ON "service_fee_bills"("service_fee_id", "student_id", "period", "year");

-- AddForeignKey
ALTER TABLE "class_academics" ADD CONSTRAINT "class_academics_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_class_academic_id_fkey" FOREIGN KEY ("class_academic_id") REFERENCES "class_academics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuitions" ADD CONSTRAINT "tuitions_class_academic_id_fkey" FOREIGN KEY ("class_academic_id") REFERENCES "class_academics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuitions" ADD CONSTRAINT "tuitions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tuitions" ADD CONSTRAINT "tuitions_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_class_academic_id_fkey" FOREIGN KEY ("class_academic_id") REFERENCES "class_academics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tuition_id_fkey" FOREIGN KEY ("tuition_id") REFERENCES "tuitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fee_bill_id_fkey" FOREIGN KEY ("fee_bill_id") REFERENCES "fee_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_service_fee_bill_id_fkey" FOREIGN KEY ("service_fee_bill_id") REFERENCES "service_fee_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_online_payment_id_fkey" FOREIGN KEY ("online_payment_id") REFERENCES "online_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_class_academic_id_fkey" FOREIGN KEY ("class_academic_id") REFERENCES "class_academics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_payments" ADD CONSTRAINT "online_payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_payment_items" ADD CONSTRAINT "online_payment_items_online_payment_id_fkey" FOREIGN KEY ("online_payment_id") REFERENCES "online_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_payment_items" ADD CONSTRAINT "online_payment_items_tuition_id_fkey" FOREIGN KEY ("tuition_id") REFERENCES "tuitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_payment_items" ADD CONSTRAINT "online_payment_items_fee_bill_id_fkey" FOREIGN KEY ("fee_bill_id") REFERENCES "fee_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_payment_items" ADD CONSTRAINT "online_payment_items_service_fee_bill_id_fkey" FOREIGN KEY ("service_fee_bill_id") REFERENCES "service_fee_bills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "midtrans_webhook_logs" ADD CONSTRAINT "midtrans_webhook_logs_online_payment_id_fkey" FOREIGN KEY ("online_payment_id") REFERENCES "online_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_services" ADD CONSTRAINT "fee_services_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_service_prices" ADD CONSTRAINT "fee_service_prices_fee_service_id_fkey" FOREIGN KEY ("fee_service_id") REFERENCES "fee_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_subscriptions" ADD CONSTRAINT "fee_subscriptions_fee_service_id_fkey" FOREIGN KEY ("fee_service_id") REFERENCES "fee_services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_subscriptions" ADD CONSTRAINT "fee_subscriptions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_bills" ADD CONSTRAINT "fee_bills_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "fee_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_bills" ADD CONSTRAINT "fee_bills_fee_service_id_fkey" FOREIGN KEY ("fee_service_id") REFERENCES "fee_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_bills" ADD CONSTRAINT "fee_bills_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fees" ADD CONSTRAINT "service_fees_class_academic_id_fkey" FOREIGN KEY ("class_academic_id") REFERENCES "class_academics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_bills" ADD CONSTRAINT "service_fee_bills_service_fee_id_fkey" FOREIGN KEY ("service_fee_id") REFERENCES "service_fees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_bills" ADD CONSTRAINT "service_fee_bills_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_fee_bills" ADD CONSTRAINT "service_fee_bills_class_academic_id_fkey" FOREIGN KEY ("class_academic_id") REFERENCES "class_academics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
