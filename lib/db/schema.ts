import {
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  date,
  boolean,
  numeric,
  uniqueIndex,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const titleEnum = pgEnum("title", [
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "eng",
  "other",
]);

export const genderEnum = pgEnum("gender", ["male", "female"]);

export const receiptTypeEnum = pgEnum("receipt_type", [
  "invoice",
  "confirmation",
  "receipt",
  "other",
]);

export const relationshipEnum = pgEnum("relationship", [
  "mother",
  "father",
  "grandmother",
  "grandfather",
  "sister",
  "spouse",
  "brother",
  "partner",
  "step-brother",
  "step-sister",
  "stepmother",
  "stepfather",
  "divorced co-parent",
  "separated co-parent",
  "legal guardian",
  "step-parent",
  "legal guardian partner",
  "grandparent",
  "aunt",
  "uncle",
  "aunt/uncle",
]);

export const programEnum = pgEnum("program", [
  "LH",
  "LLC",
  "ML",
  "Kollel",
  "Madrich",
]);

export const trackEnum = pgEnum("track", [
  "Alef",
  "Bet",
  "Gimmel",
  "Dalet",
  "Heh",
]);

export const trackDetailEnum = pgEnum("track_detail", [
  "Full Year",
  "Fall",
  "Spring",
  "Until Pesach",
]);

export const statusEnum = pgEnum("status", [
  "Student",
  "Active Soldier",
  "Staff",
  "Withdrew",
  "Transferred Out",
  "Left Early",
  "Asked to Leave",
]);

export const machzorEnum = pgEnum("machzor", [
  "10.5",
  "10",
  "9.5",
  "9",
  "8.5",
  "8",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "credit_card",
  "cash",
  "check",
  "bank_transfer",
  "paypal",
  "wire_transfer",
  "other",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
  "processing",
]);

export const frequencyEnum = pgEnum("frequency", [
  "weekly",
  "monthly",
  "quarterly",
  "biannual",
  "annual",
  "one_time",
  "custom",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "active",
  "completed",
  "cancelled",
  "paused",
  "overdue",
]);

export const currencyEnum = pgEnum("currency", [
  "USD",
  "ILS",
  "EUR",
  "JPY",
  "GBP",
  "AUD",
  "CAD",
  "ZAR",
]);

export const contact = pgTable("contact", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique(),
  phone: text("phone"),
  title: titleEnum("title"),
  gender: genderEnum("gender"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Contact = typeof contact.$inferSelect;
export type NewContact = typeof contact.$inferInsert;

export const studentRoles = pgTable(
  "student_roles",
  {
    id: serial("id").primaryKey(),
    contactId: integer("contact_id")
      .references(() => contact.id, { onDelete: "cascade" })
      .notNull(),
    year: text("year").notNull().default("2024-2025"),
    program: programEnum("program").notNull(),
    track: trackEnum("track").notNull(),
    trackDetail: trackDetailEnum("track_detail"),
    status: statusEnum("status").notNull(),
    machzor: machzorEnum("machzor"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    isActive: boolean("is_active").default(true).notNull(),
    additionalNotes: text("additional_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    contactIdIdx: index("student_roles_contact_id_idx").on(table.contactId),
    uniqueContactId: uniqueIndex("student_roles_contact_id_unique").on(
      table.contactId
    ),
  })
);

export type StudentRole = typeof studentRoles.$inferSelect;
export type NewStudentRole = typeof studentRoles.$inferInsert;

export const contactRoles = pgTable(
  "contact_roles",
  {
    id: serial("id").primaryKey(),
    contactId: integer("contact_id")
      .references(() => contact.id, { onDelete: "cascade" })
      .notNull(),
    roleName: text("role_name").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    contactIdIdx: index("contact_roles_contact_id_idx").on(table.contactId),
    roleNameIdx: index("contact_roles_role_name_idx").on(table.roleName),
  })
);

export type ContactRole = typeof contactRoles.$inferSelect;
export type NewContactRole = typeof contactRoles.$inferInsert;

export const relationships = pgTable(
  "relationships",
  {
    id: serial("id").primaryKey(),
    contactId: integer("contact_id")
      .references(() => contact.id, { onDelete: "cascade" })
      .notNull(),
    relatedContactId: integer("related_contact_id")
      .references(() => contact.id, { onDelete: "cascade" })
      .notNull(),
    relationshipType: relationshipEnum("relationship_type").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    contactIdIdx: index("relationships_contact_id_idx").on(table.contactId),
    relatedContactIdIdx: index("relationships_related_contact_id_idx").on(
      table.relatedContactId
    ),
    uniqueRelationship: uniqueIndex("relationships_unique").on(
      table.contactId,
      table.relatedContactId,
      table.relationshipType
    ),
  })
);

export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;

export const category = pgTable("category", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Category = typeof category.$inferSelect;
export type NewCategory = typeof category.$inferInsert;

export const pledge = pgTable("pledge", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id")
    .references(() => contact.id, { onDelete: "cascade" })
    .notNull(),
  categoryId: integer("category_id").references(() => category.id, {
    onDelete: "set null",
  }),
  pledgeDate: date("pledge_date").notNull(),
  description: text("description"),
  originalAmount: numeric("original_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  currency: currencyEnum("currency").notNull().default("USD"),
  totalPaid: numeric("total_paid", { precision: 10, scale: 2 })
    .default("0")
    .notNull(),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull(),
  originalAmountUsd: numeric("original_amount_usd", {
    precision: 10,
    scale: 2,
  }),
  totalPaidUsd: numeric("total_paid_usd", { precision: 10, scale: 2 }).default(
    "0"
  ),
  balanceUsd: numeric("balance_usd", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Pledge = typeof pledge.$inferSelect;
export type NewPledge = typeof pledge.$inferInsert;

export const paymentPlan = pgTable(
  "payment_plan",
  {
    id: serial("id").primaryKey(),
    pledgeId: integer("pledge_id")
      .references(() => pledge.id, { onDelete: "cascade" })
      .notNull(),

    planName: text("plan_name"),
    frequency: frequencyEnum("frequency").notNull(),

    totalPlannedAmount: numeric("total_planned_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    currency: currencyEnum("currency").notNull(),
    installmentAmount: numeric("installment_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    numberOfInstallments: integer("number_of_installments").notNull(),

    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    nextPaymentDate: date("next_payment_date"),

    installmentsPaid: integer("installments_paid").default(0).notNull(),
    totalPaid: numeric("total_paid", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    totalPaidUsd: numeric("total_paid_usd", { precision: 10, scale: 2 }),
    remainingAmount: numeric("remaining_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),

    planStatus: planStatusEnum("plan_status").notNull().default("active"),
    autoRenew: boolean("auto_renew").default(false).notNull(),
    remindersSent: integer("reminders_sent").default(0).notNull(),
    lastReminderDate: date("last_reminder_date"),

    isActive: boolean("is_active").default(true).notNull(),
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    pledgeIdIdx: index("payment_plan_pledge_id_idx").on(table.pledgeId),
    statusIdx: index("payment_plan_status_idx").on(table.planStatus),
    nextPaymentIdx: index("payment_plan_next_payment_idx").on(
      table.nextPaymentDate
    ),
  })
);

export type PaymentPlan = typeof paymentPlan.$inferSelect;
export type NewPaymentPlan = typeof paymentPlan.$inferInsert;

export const payment = pgTable(
  "payment",
  {
    id: serial("id").primaryKey(),
    pledgeId: integer("pledge_id")
      .references(() => pledge.id, { onDelete: "cascade" })
      .notNull(),
    paymentPlanId: integer("payment_plan_id").references(() => paymentPlan.id, {
      onDelete: "set null",
    }),

    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: currencyEnum("currency").notNull(),
    amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 4 }),
    paymentDate: date("payment_date").notNull(),
    receivedDate: date("received_date"),
    processedDate: date("processed_date"),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("completed"),
    referenceNumber: text("reference_number"),
    checkNumber: text("check_number"),
    receiptNumber: text("receipt_number"),
    receiptType: receiptTypeEnum("receipt_type"),
    receiptIssued: boolean("receipt_issued").default(false).notNull(),
    receiptIssuedDate: date("receipt_issued_date"),
    numberOfPayments: integer("number_of_payments"),
    paymentFrequency: frequencyEnum("payment_frequency"),
    firstPaymentDate: date("first_payment_date"),
    notes: text("notes"),
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: integer("created_by").references(() => contact.id, {
      onDelete: "set null",
    }),
    lastModifiedBy: integer("last_modified_by").references(() => contact.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    pledgeIdIdx: index("payment_pledge_id_idx").on(table.pledgeId),
    paymentPlanIdIdx: index("payment_payment_plan_id_idx").on(
      table.paymentPlanId
    ),
    paymentDateIdx: index("payment_payment_date_idx").on(table.paymentDate),
    statusIdx: index("payment_status_idx").on(table.paymentStatus),
    methodIdx: index("payment_method_idx").on(table.paymentMethod),
    referenceIdx: index("payment_reference_idx").on(table.referenceNumber),
  })
);

export type Payment = typeof payment.$inferSelect;
export type NewPayment = typeof payment.$inferInsert;

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull(),
  recordId: integer("record_id").notNull(),
  action: text("action").notNull(),
  fieldName: text("field_name"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedBy: integer("changed_by").references(() => contact.id, {
    onDelete: "set null",
  }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;

export const contactRelations = relations(contact, ({ many }) => ({
  contactRoles: many(contactRoles),
  studentRoles: many(studentRoles),
  relationshipsAsSource: many(relationships, {
    relationName: "relationSource",
  }),
  relationshipsAsTarget: many(relationships, {
    relationName: "relationTarget",
  }),
  pledges: many(pledge),
  auditLogs: many(auditLog),
  createdPayments: many(payment, { relationName: "createdPayments" }),
  modifiedPayments: many(payment, { relationName: "modifiedPayments" }),
}));

export const contactRolesRelations = relations(contactRoles, ({ one }) => ({
  contact: one(contact, {
    fields: [contactRoles.contactId],
    references: [contact.id],
  }),
}));

export const studentRolesRelations = relations(studentRoles, ({ one }) => ({
  contact: one(contact, {
    fields: [studentRoles.contactId],
    references: [contact.id],
  }),
}));

export const relationshipsRelations = relations(relationships, ({ one }) => ({
  contact: one(contact, {
    fields: [relationships.contactId],
    references: [contact.id],
    relationName: "relationSource",
  }),
  relatedContact: one(contact, {
    fields: [relationships.relatedContactId],
    references: [contact.id],
    relationName: "relationTarget",
  }),
}));

export const categoryRelations = relations(category, ({ many }) => ({
  pledges: many(pledge),
}));

export const pledgeRelations = relations(pledge, ({ one, many }) => ({
  contact: one(contact, {
    fields: [pledge.contactId],
    references: [contact.id],
  }),
  category: one(category, {
    fields: [pledge.categoryId],
    references: [category.id],
  }),
  paymentPlans: many(paymentPlan),
  payments: many(payment),
}));

export const paymentPlanRelations = relations(paymentPlan, ({ one, many }) => ({
  pledge: one(pledge, {
    fields: [paymentPlan.pledgeId],
    references: [pledge.id],
  }),
  payments: many(payment),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  pledge: one(pledge, {
    fields: [payment.pledgeId],
    references: [pledge.id],
  }),
  paymentPlan: one(paymentPlan, {
    fields: [payment.paymentPlanId],
    references: [paymentPlan.id],
  }),
  createdByContact: one(contact, {
    fields: [payment.createdBy],
    references: [contact.id],
    relationName: "createdPayments",
  }),
  lastModifiedByContact: one(contact, {
    fields: [payment.lastModifiedBy],
    references: [contact.id],
    relationName: "modifiedPayments",
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  changedByContact: one(contact, {
    fields: [auditLog.changedBy],
    references: [contact.id],
  }),
}));
