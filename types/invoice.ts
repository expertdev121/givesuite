"use client";
export interface InvoiceTemplate {
  id: number;
  orgNameEn: string;
  orgNameHeb: string;
  logoUrl?: string;
  establishedYear: string;
  headerNotes?: string;
  footerNotes: string;
  tableHeaders: Record<string, string>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceData {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    displayName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  pledges: Array<{
    id: number;
    pledgeDate: Date;
    description?: string;
    originalAmount: number;
    currency: string;
    totalPaid: number;
    balance: number;
    category?: {
      name: string;
    };
  }>;
  payments: Array<{
    id: number;
    paymentDate: Date;
    amount: number;
    currency: string;
    amountUsd?: number;
    paymentMethod: string;
    referenceNumber?: string;
    notes?: string;
    pledgeDescription?: string;
  }>;
  paymentPlans: Array<{
    id: number;
    planName?: string;
    frequency: string;
    totalPlannedAmount: number;
    currency: string;
    remainingAmount: number;
    nextPaymentDate?: Date;
  }>;
  template: InvoiceTemplate;
}

export interface PaymentSummary {
  totalPledged: number;
  totalPaid: number;
  totalBalance: number;
  currency: string;
  totalPaidUsd?: number;
  totalBalanceUsd?: number;
}

export interface InvoiceItem {
  description: string;
  amount: number;
  currency: string;
  date: Date;
  type: 'pledge' | 'payment' | 'plan';
}

export interface TemplateConfig {
  orgNameEn: string;
  orgNameHeb: string;
  logoUrl?: string;
  establishedYear: string;
  headerNotes?: string;
  footerNotes: string;
  tableHeaders: Record<string, string>;
}
