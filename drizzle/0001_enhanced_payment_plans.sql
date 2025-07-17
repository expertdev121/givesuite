-- Migration: Enhanced Payment Plans
-- Add new enums
CREATE TYPE "distribution_type" AS ENUM('fixed', 'custom');
CREATE TYPE "installment_status" AS ENUM('pending', 'paid', 'overdue', 'cancelled');
-- Add new column to payment_plan table
ALTER TABLE "payment_plan" ADD COLUMN "distribution_type" "distribution_type" DEFAULT 'fixed' NOT NULL;
-- Create installment_schedule table
CREATE TABLE "installment_schedule" (
  "id" serial PRIMARY KEY NOT NULL,
  "payment_plan_id" integer NOT NULL REFERENCES "payment_plan"("id") ON DELETE CASCADE,
  "installment_date" date NOT NULL,
  "installment_amount" numeric(10,2) NOT NULL,
  "currency" "currency" NOT NULL,
  "status" "installment_status" DEFAULT 'pending' NOT NULL,
  "paid_date" date,
  "payment_id" integer REFERENCES "payment"("id") ON DELETE SET NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
-- Add installment_schedule_id to payment table
ALTER TABLE "payment" ADD COLUMN "installment_schedule_id" integer REFERENCES "installment_schedule"("id") ON DELETE SET NULL;
-- Create indexes
CREATE INDEX "installment_schedule_payment_plan_id_idx" ON "installment_schedule"("payment_plan_id");
CREATE INDEX "installment_schedule_installment_date_idx" ON "installment_schedule"("installment_date");
CREATE INDEX "installment_schedule_status_idx" ON "installment_schedule"("status");
CREATE INDEX "installment_schedule_payment_id_idx" ON "installment_schedule"("payment_id");
CREATE INDEX "payment_plan_distribution_type_idx" ON "payment_plan"("distribution_type");
CREATE INDEX "payment_installment_schedule_id_idx" ON "payment"("installment_schedule_id");