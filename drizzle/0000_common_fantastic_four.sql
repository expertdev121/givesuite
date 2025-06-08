CREATE TYPE "public"."currency" AS ENUM('USD', 'ILS', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'ZAR');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('weekly', 'monthly', 'quarterly', 'biannual', 'annual', 'one_time', 'custom');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TYPE "public"."machzor" AS ENUM('10.5', '10', '9.5', '9', '8.5', '8');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('credit_card', 'cash', 'check', 'bank_transfer', 'paypal', 'wire_transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded', 'processing');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('active', 'completed', 'cancelled', 'paused', 'overdue');--> statement-breakpoint
CREATE TYPE "public"."program" AS ENUM('LH', 'LLC', 'ML', 'Kollel', 'Madrich');--> statement-breakpoint
CREATE TYPE "public"."receipt_type" AS ENUM('invoice', 'confirmation', 'receipt', 'other');--> statement-breakpoint
CREATE TYPE "public"."relationship" AS ENUM('mother', 'father', 'grandmother', 'grandfather', 'sister', 'spouse', 'brother', 'partner', 'step-brother', 'step-sister', 'stepmother', 'stepfather', 'divorced co-parent', 'separated co-parent', 'legal guardian', 'step-parent', 'legal guardian partner', 'grandparent', 'aunt', 'uncle', 'aunt/uncle');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('Student', 'Active Soldier', 'Staff', 'Withdrew', 'Transferred Out', 'Left Early', 'Asked to Leave');--> statement-breakpoint
CREATE TYPE "public"."title" AS ENUM('mr', 'mrs', 'ms', 'dr', 'prof', 'eng', 'other');--> statement-breakpoint
CREATE TYPE "public"."track_detail" AS ENUM('Full Year', 'Fall', 'Spring', 'Until Pesach');--> statement-breakpoint
CREATE TYPE "public"."track" AS ENUM('Alef', 'Bet', 'Gimmel', 'Dalet', 'Heh');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"table_name" text NOT NULL,
	"record_id" integer NOT NULL,
	"action" text NOT NULL,
	"field_name" text,
	"old_value" text,
	"new_value" text,
	"changed_by" integer,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "contact" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"title" "title",
	"gender" "gender",
	"address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "contact_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "contact_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"role_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" date,
	"end_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"pledge_id" integer NOT NULL,
	"payment_plan_id" integer,
	"amount" numeric(10, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"amount_usd" numeric(10, 2),
	"exchange_rate" numeric(10, 4),
	"payment_date" date NOT NULL,
	"received_date" date,
	"processed_date" date,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'completed' NOT NULL,
	"reference_number" text,
	"check_number" text,
	"receipt_number" text,
	"receipt_type" "receipt_type",
	"receipt_issued" boolean DEFAULT false NOT NULL,
	"receipt_issued_date" date,
	"number_of_payments" integer,
	"payment_frequency" "frequency",
	"first_payment_date" date,
	"notes" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" integer,
	"last_modified_by" integer
);
--> statement-breakpoint
CREATE TABLE "payment_plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"pledge_id" integer NOT NULL,
	"plan_name" text,
	"frequency" "frequency" NOT NULL,
	"total_planned_amount" numeric(10, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"installment_amount" numeric(10, 2) NOT NULL,
	"number_of_installments" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_payment_date" date,
	"installments_paid" integer DEFAULT 0 NOT NULL,
	"total_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_paid_usd" numeric(10, 2),
	"remaining_amount" numeric(10, 2) NOT NULL,
	"plan_status" "plan_status" DEFAULT 'active' NOT NULL,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"reminders_sent" integer DEFAULT 0 NOT NULL,
	"last_reminder_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"internal_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pledge" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"category_id" integer,
	"pledge_date" date NOT NULL,
	"description" text,
	"original_amount" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"total_paid" numeric(10, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(10, 2) NOT NULL,
	"original_amount_usd" numeric(10, 2),
	"total_paid_usd" numeric(10, 2) DEFAULT '0',
	"balance_usd" numeric(10, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"related_contact_id" integer NOT NULL,
	"relationship_type" "relationship" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"year" text DEFAULT '2024-2025' NOT NULL,
	"program" "program" NOT NULL,
	"track" "track" NOT NULL,
	"track_detail" "track_detail",
	"status" "status" NOT NULL,
	"machzor" "machzor",
	"start_date" date,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"additional_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_changed_by_contact_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_roles" ADD CONSTRAINT "contact_roles_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_pledge_id_pledge_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."pledge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_payment_plan_id_payment_plan_id_fk" FOREIGN KEY ("payment_plan_id") REFERENCES "public"."payment_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_created_by_contact_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_last_modified_by_contact_id_fk" FOREIGN KEY ("last_modified_by") REFERENCES "public"."contact"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_plan" ADD CONSTRAINT "payment_plan_pledge_id_pledge_id_fk" FOREIGN KEY ("pledge_id") REFERENCES "public"."pledge"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledge" ADD CONSTRAINT "pledge_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pledge" ADD CONSTRAINT "pledge_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_related_contact_id_contact_id_fk" FOREIGN KEY ("related_contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_roles" ADD CONSTRAINT "student_roles_contact_id_contact_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contact"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_roles_contact_id_idx" ON "contact_roles" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_roles_role_name_idx" ON "contact_roles" USING btree ("role_name");--> statement-breakpoint
CREATE INDEX "payment_pledge_id_idx" ON "payment" USING btree ("pledge_id");--> statement-breakpoint
CREATE INDEX "payment_payment_plan_id_idx" ON "payment" USING btree ("payment_plan_id");--> statement-breakpoint
CREATE INDEX "payment_payment_date_idx" ON "payment" USING btree ("payment_date");--> statement-breakpoint
CREATE INDEX "payment_status_idx" ON "payment" USING btree ("payment_status");--> statement-breakpoint
CREATE INDEX "payment_method_idx" ON "payment" USING btree ("payment_method");--> statement-breakpoint
CREATE INDEX "payment_reference_idx" ON "payment" USING btree ("reference_number");--> statement-breakpoint
CREATE INDEX "payment_plan_pledge_id_idx" ON "payment_plan" USING btree ("pledge_id");--> statement-breakpoint
CREATE INDEX "payment_plan_status_idx" ON "payment_plan" USING btree ("plan_status");--> statement-breakpoint
CREATE INDEX "payment_plan_next_payment_idx" ON "payment_plan" USING btree ("next_payment_date");--> statement-breakpoint
CREATE INDEX "relationships_contact_id_idx" ON "relationships" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "relationships_related_contact_id_idx" ON "relationships" USING btree ("related_contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "relationships_unique" ON "relationships" USING btree ("contact_id","related_contact_id","relationship_type");--> statement-breakpoint
CREATE INDEX "student_roles_contact_id_idx" ON "student_roles" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_roles_contact_id_unique" ON "student_roles" USING btree ("contact_id");