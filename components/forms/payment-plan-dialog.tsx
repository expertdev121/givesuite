/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type React from "react";

import { useEffect, useState, useRef } from "react";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";

import { AlertTriangle } from "lucide-react";

import {
  Check,
  ChevronsUpDown,
  Trash2,
  Pause,
  Play,
  Edit,
  Calculator,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

import { Checkbox } from "@/components/ui/checkbox";

import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  useCreatePaymentPlanMutation,
  useUpdatePaymentPlanMutation,
  usePaymentPlanQuery,
  usePledgeDetailsQuery,
  usePauseResumePaymentPlanMutation,
  useDeletePaymentPlanMutation,
} from "@/lib/query/payment-plans/usePaymentPlanQuery";

import useContactId from "@/hooks/use-contact-id";

import { usePledgesQuery } from "@/lib/query/usePledgeData";

import { useExchangeRates } from "@/lib/query/useExchangeRates";

import { useForm } from "react-hook-form";
import { useMemo } from 'react';

const supportedCurrencies = [
  "USD",
  "ILS",
  "EUR",
  "JPY",
  "GBP",
  "AUD",
  "CAD",
  "ZAR",
] as const;

const frequencies = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Biannual" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One Time" },
] as const;

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "overdue", label: "Overdue" },
] as const;

const paymentMethods = [
  { value: "ach", label: "ACH" },
  { value: "bill_pay", label: "Bill Pay" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "credit", label: "Credit" },
  { value: "credit_card", label: "Credit Card" },
  { value: "expected", label: "Expected" },
  { value: "goods_and_services", label: "Goods and Services" },
  { value: "matching_funds", label: "Matching Funds" },
  { value: "money_order", label: "Money Order" },
  { value: "p2p", label: "P2P" },
  { value: "pending", label: "Pending" },
  { value: "refund", label: "Refund" },
  { value: "scholarship", label: "Scholarship" },
  { value: "stock", label: "Stock" },
  { value: "student_portion", label: "Student Portion" },
  { value: "unknown", label: "Unknown" },
  { value: "wire", label: "Wire" },
  { value: "xfer", label: "Xfer" },
] as const;

const methodDetails = [
  { value: "achisomoch", label: "Achisomoch" },
  { value: "authorize", label: "Authorize" },
  { value: "bank_of_america_charitable", label: "Bank of America Charitable" },
  { value: "banquest", label: "Banquest" },
  { value: "banquest_cm", label: "Banquest CM" },
  { value: "benevity", label: "Benevity" },
  { value: "chai_charitable", label: "Chai Charitable" },
  { value: "charityvest_inc", label: "Charityvest Inc." },
  { value: "cjp", label: "CJP" },
  { value: "donors_fund", label: "Donors' Fund" },
  { value: "earthport", label: "EarthPort" },
  { value: "e_transfer", label: "e-transfer" },
  { value: "facts", label: "FACTS" },
  { value: "fidelity", label: "Fidelity" },
  { value: "fjc", label: "FJC" },
  { value: "foundation", label: "Foundation" },
  { value: "goldman_sachs", label: "Goldman Sachs" },
  { value: "htc", label: "HTC" },
  { value: "jcf", label: "JCF" },
  { value: "jcf_san_diego", label: "JCF San Diego" },
  { value: "jgive", label: "Jgive" },
  { value: "keshet", label: "Keshet" },
  { value: "masa", label: "MASA" },
  { value: "masa_old", label: "MASA Old" },
  { value: "matach", label: "Matach" },
  { value: "matching_funds", label: "Matching Funds" },
  { value: "mizrachi_canada", label: "Mizrachi Canada" },
  { value: "mizrachi_olami", label: "Mizrachi Olami" },
  { value: "montrose", label: "Montrose" },
  { value: "morgan_stanley_gift", label: "Morgan Stanley Gift" },
  { value: "ms", label: "MS" },
  { value: "mt", label: "MT" },
  { value: "ojc", label: "OJC" },
  { value: "paypal", label: "PayPal" },
  { value: "pelecard", label: "PeleCard (EasyCount)" },
  { value: "schwab_charitable", label: "Schwab Charitable" },
  { value: "stripe", label: "Stripe" },
  { value: "tiaa", label: "TIAA" },
  { value: "touro", label: "Touro" },
  { value: "uktoremet", label: "UKToremet (JGive)" },
  { value: "vanguard_charitable", label: "Vanguard Charitable" },
  { value: "venmo", label: "Venmo" },
  { value: "vmm", label: "VMM" },
  { value: "wise", label: "Wise" },
  { value: "worldline", label: "Worldline" },
  { value: "yaadpay", label: "YaadPay" },
  { value: "yaadpay_cm", label: "YaadPay CM" },
  { value: "yourcause", label: "YourCause" },
  { value: "yu", label: "YU" },
  { value: "zelle", label: "Zelle" },
] as const;

export const paymentPlanSchema = z.object({
  pledgeId: z.number().positive(),
  planName: z.string().optional(),
  frequency: z.enum([
    "weekly",
    "monthly",
    "quarterly",
    "biannual",
    "annual",
    "one_time",
  ]),
  totalPlannedAmount: z
    .number()
    .positive("Total planned amount must be positive"),
  currency: z.enum(supportedCurrencies).default("USD"),
  installmentAmount: z.number().positive("Installment amount must be positive"),
  numberOfInstallments: z
    .number()
    .int()
    .positive("Number of installments must be positive"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  nextPaymentDate: z.string().optional(),
  autoRenew: z.boolean().default(false),
  planStatus: z
    .enum(["active", "completed", "cancelled", "paused", "overdue"])
    .optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  distributionType: z.enum(["fixed", "custom"]).default("fixed"),
  customInstallments: z
    .array(
      z.object({
        date: z.string().min(1, "Installment date is required"),
        amount: z.number().positive("Installment amount must be positive"),
        notes: z.string().optional(),
        isPaid: z.boolean().optional(),
        paidDate: z.string().optional(),
        paidAmount: z.number().optional(),
      })
    )
    .optional(),
  paymentMethod: z.enum([
    "ach", "bill_pay", "cash", "check", "credit", "credit_card", "expected",
    "goods_and_services", "matching_funds", "money_order", "p2p", "pending",
    "refund", "scholarship", "stock", "student_portion", "unknown", "wire", "xfer"
  ]).optional(),
  methodDetail: z.enum([
    "achisomoch", "authorize", "bank_of_america_charitable", "banquest", "banquest_cm",
    "benevity", "chai_charitable", "charityvest_inc", "cjp", "donors_fund", "earthport",
    "e_transfer", "facts", "fidelity", "fjc", "foundation", "goldman_sachs", "htc", "jcf",
    "jcf_san_diego", "jgive", "keshet", "masa", "masa_old", "matach", "matching_funds",
    "mizrachi_canada", "mizrachi_olami", "montrose", "morgan_stanley_gift", "ms", "mt",
    "ojc", "paypal", "pelecard", "schwab_charitable", "stripe", "tiaa", "touro", "uktoremet",
    "vanguard_charitable", "venmo", "vmm", "wise", "worldline", "yaadpay", "yaadpay_cm",
    "yourcause", "yu", "zelle"
  ]).optional(),
});

interface PaymentPlanDialogProps {
  // For create mode
  pledgeId?: number;
  contactId?: number;
  pledgeAmount?: number;
  pledgeCurrency?: string;
  pledgeDescription?: string;
  remainingBalance?: number;
  showPledgeSelector?: boolean;
  // For edit mode
  paymentPlanId?: number;
  mode?: "create" | "edit";
  // Trigger component
  trigger?: React.ReactNode;
  // Callbacks
  onSuccess?: () => void;
  onClose?: () => void;
  // New fields for distribution type
  distributionType?: "fixed" | "custom";
  customInstallments?: Array<{
    date: string;
    amount: number;
    notes?: string;
  }>;
}

// Helper function to fix precision errors in floating-point arithmetic
const roundToPrecision = (num: number, precision: number = 2): number => {
  return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
};

// Currency conversion helper function
const convertAmount = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  exchangeRates: Record<string, string> | undefined
): number => {
  if (!exchangeRates || fromCurrency === toCurrency) return amount;

  // Convert to USD first if not already USD
  let usdAmount = amount;
  if (fromCurrency !== "USD") {
    const fromRate = Number.parseFloat(exchangeRates[fromCurrency] || "1");
    usdAmount = amount * fromRate;
  }

  // Convert from USD to target currency
  if (toCurrency !== "USD") {
    const toRate = Number.parseFloat(exchangeRates[toCurrency] || "1");
    return usdAmount / toRate;
  }

  return usdAmount;
};

// Exchange Rate Display Component
const ExchangeRateDisplay = ({
  currency,
  exchangeRates,
  isLoading,
}: {
  currency: string | undefined;
  exchangeRates: Record<string, string> | undefined;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingUp className="w-4 h-4 animate-pulse" />
        Loading exchange rates...
      </div>
    );
  }

  if (!exchangeRates || !currency || currency === "USD") return null;

  const rate = exchangeRates[currency];

  if (!rate) return null;

  const rateValue = Number.parseFloat(rate);
  const usdRate = 1 / rateValue;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <TrendingUp className="w-4 h-4" />
      <span>
        1 {currency} = {usdRate.toFixed(4)} USD
      </span>
    </div>
  );
};

export type PaymentPlanFormData = z.infer<typeof paymentPlanSchema>;

const calculateNextPaymentDate = (
  startDate: string,
  frequency: string
): string => {
  const start = new Date(startDate);
  const next = new Date(start);

  switch (frequency) {
    case "weekly":
      next.setDate(start.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(start.getMonth() + 1);
      break;
    case "quarterly":
      next.setMonth(start.getMonth() + 3);
      break;
    case "biannual":
      next.setMonth(start.getMonth() + 6);
      break;
    case "annual":
      next.setFullYear(start.getFullYear() + 1);
      break;
    default:
      return startDate;
  }

  return next.toISOString().split("T")[0];
};

interface PreviewInstallment {
  installmentNumber: number;
  date: string;
  amount: number;
  currency: string;
  formattedDate: string;
  isPaid: boolean;
  notes?: string | null;
}

const generatePreviewInstallments = (
  startDate: string,
  frequency: string,
  numberOfInstallments: number,
  totalAmount: number,
  currency: string
): PreviewInstallment[] => {
  const installments: PreviewInstallment[] = [];
  const start = new Date(startDate);

  // Calculate installment amount with proper distribution
  const baseInstallmentAmount = roundToPrecision(totalAmount / numberOfInstallments, 2);
  const remainder = roundToPrecision(totalAmount - (baseInstallmentAmount * numberOfInstallments), 2);

  for (let i = 0; i < numberOfInstallments; i++) {
    const installmentDate = new Date(start);

    switch (frequency) {
      case "weekly":
        installmentDate.setDate(start.getDate() + i * 7);
        break;
      case "monthly":
        installmentDate.setMonth(start.getMonth() + i);
        break;
      case "quarterly":
        installmentDate.setMonth(start.getMonth() + i * 3);
        break;
      case "biannual":
        installmentDate.setMonth(start.getMonth() + i * 6);
        break;
      case "annual":
        installmentDate.setFullYear(start.getFullYear() + i);
        break;
      case "one_time":
        if (i > 0) break;
        break;
      default:
        installmentDate.setMonth(start.getMonth() + i);
    }

    // Add remainder to last installment to ensure total matches exactly
    let installmentAmount = baseInstallmentAmount;
    if (i === numberOfInstallments - 1 && remainder !== 0) {
      installmentAmount = roundToPrecision(baseInstallmentAmount + remainder, 2);
    }

    installments.push({
      installmentNumber: i + 1,
      date: installmentDate.toISOString().split("T")[0],
      amount: installmentAmount,
      currency: currency,
      formattedDate: installmentDate.toLocaleDateString(),
      isPaid: false,
      notes: null,
    });

    if (frequency === "one_time") break;
  }

  return installments;
};

const calculateEndDate = (
  startDate: string,
  frequency: string,
  installments: number
): string => {
  const start = new Date(startDate);
  const end = new Date(start);

  switch (frequency) {
    case "weekly":
      end.setDate(start.getDate() + (installments - 1) * 7);
      break;
    case "monthly":
      end.setMonth(start.getMonth() + (installments - 1));
      break;
    case "quarterly":
      end.setMonth(start.getMonth() + (installments - 1) * 3);
      break;
    case "biannual":
      end.setMonth(start.getMonth() + (installments - 1) * 6);
      break;
    case "annual":
      end.setFullYear(start.getFullYear() + (installments - 1));
      break;
    case "one_time":
      return startDate;
    default:
      return startDate;
  }
  return end.toISOString().split("T")[0];
};

// Preview Component
const PaymentPlanPreview = ({
  formData,
  onConfirm,
  onEdit,
  isLoading = false,
  isEditMode = false,
  installmentsModified = false
}: {
  formData: PaymentPlanFormData;
  onConfirm: () => void;
  onEdit: () => void;
  isLoading?: boolean;
  isEditMode?: boolean;
  installmentsModified?: boolean;
}) => {
  const previewInstallments = useMemo(() => {
    if (formData.distributionType === "custom") {
      return formData.customInstallments?.map((inst, index) => ({
        installmentNumber: index + 1,
        date: inst.date,
        amount: inst.amount,
        currency: formData.currency,
        formattedDate: new Date(inst.date).toLocaleDateString(),
        notes: inst.notes,
        isPaid: false,
      })) || [];
    } else {
      return generatePreviewInstallments(
        formData.startDate,
        formData.frequency,
        formData.numberOfInstallments,
        formData.totalPlannedAmount,
        formData.currency
      );
    }
  }, [formData]);

  const totalPreviewAmount = previewInstallments.reduce((sum, inst) => sum + inst.amount, 0);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Payment Plan Preview</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Review the payment schedule before confirming
        </p>
      </div>

      {/* Show warning for fixed plans being converted */}
      {isEditMode && formData.distributionType === "fixed" && installmentsModified && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
            <span className="text-sm text-amber-700">
              This plan will be converted from fixed to custom distribution due to installment modifications.
            </span>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">Plan Summary</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-blue-700">Total Amount:</span>
            <span className="font-medium ml-2">
              {formData.currency} {formData.totalPlannedAmount.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Frequency:</span>
            <span className="font-medium ml-2 capitalize">
              {formData.frequency.replace('_', ' ')}
            </span>
          </div>
          {formData.paymentMethod && (
            <div>
              <span className="text-blue-700">Payment Method:</span>
              <span className="font-medium ml-2">
                {paymentMethods.find(m => m.value === formData.paymentMethod)?.label}
              </span>
            </div>
          )}
          {formData.methodDetail && (
            <div>
              <span className="text-blue-700">Method Detail:</span>
              <span className="font-medium ml-2">
                {methodDetails.find(m => m.value === formData.methodDetail)?.label}
              </span>
            </div>
          )}
          <div>
            <span className="text-blue-700">Distribution:</span>
            <span className="font-medium ml-2">
              {formData.distributionType === 'custom' ? 'Custom Schedule' : 'Fixed Amount'}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Total Installments:</span>
            <span className="font-medium ml-2">{previewInstallments.length}</span>
          </div>
          {formData.distributionType !== 'custom' && (
            <div>
              <span className="text-blue-700">Per Installment:</span>
              <span className="font-medium ml-2">
                {formData.currency} {formData.installmentAmount.toLocaleString()}
              </span>
            </div>
          )}
          <div>
            <span className="text-blue-700">Start Date:</span>
            <span className="font-medium ml-2">
              {new Date(formData.startDate).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg">
        <div className="bg-gray-50 px-4 py-3 border-b">
          <h4 className="font-medium">Payment Schedule</h4>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {previewInstallments.map((installment, index) => (
            <div
              key={index}
              className={`px-4 py-3 border-b last:border-b-0 flex items-center justify-between ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {installment.installmentNumber}
                </div>
                <div>
                  <div className="font-medium">{installment.formattedDate}</div>
                  <div className="text-sm text-gray-500">{installment.date}</div>
                  {installment.notes && (
                    <div className="text-xs text-gray-400 mt-1">{installment.notes}</div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {installment.currency} {installment.amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  {formData.distributionType === 'custom' ? 'Custom' : 'Fixed'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {Math.abs(totalPreviewAmount - formData.totalPlannedAmount) > 0.01 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
            <span className="text-sm text-amber-700">
              Warning: Total installments ({formData.currency} {totalPreviewAmount.toLocaleString()})
              differ from planned amount ({formData.currency} {formData.totalPlannedAmount.toLocaleString()})
              by {formData.currency} {Math.abs(totalPreviewAmount - formData.totalPlannedAmount).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-medium text-green-900">
              Total: {formData.currency} {totalPreviewAmount.toLocaleString()}
            </div>
            <div className="text-sm text-green-700">
              {previewInstallments.length} payments over {
                formData.distributionType === 'custom'
                  ? 'custom schedule'
                  : `${formData.numberOfInstallments} ${formData.frequency} periods`
              }
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-green-700">
              {formData.endDate && (
                <>End Date: {new Date(formData.endDate).toLocaleDateString()}</>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onEdit}
          disabled={isLoading}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Plan
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="text-white"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Confirming...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Confirm & Create Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default function PaymentPlanDialog(props: PaymentPlanDialogProps) {
  const {
    pledgeId: initialPledgeId,
    pledgeAmount,
    pledgeCurrency,
    pledgeDescription,
    remainingBalance,
    showPledgeSelector = false,
    paymentPlanId,
    mode = "create",
    trigger,
    onSuccess,
    onClose,
  } = props;

  const [open, setOpen] = useState(false);
  const [selectedPledgeId, setSelectedPledgeId] = useState<number | undefined>(
    initialPledgeId
  );
  const [isEditing, setIsEditing] = useState(mode === "create");
  const [manualInstallment, setManualInstallment] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [installmentsModified, setInstallmentsModified] = useState(false);
  const previousCurrencyRef = useRef<string | undefined>(null);
  const isFormInitializedRef = useRef(false);

  const { data: exchangeRateData, isLoading: isLoadingRates } =
    useExchangeRates();
  const exchangeRates = exchangeRateData?.data?.rates;

  const isEditMode = mode === "edit" && !!paymentPlanId;

  const { data: existingPlanData, isLoading: isLoadingPlan } =
    usePaymentPlanQuery(paymentPlanId || 0);

  const contactId = useContactId();

  const { data: pledgesData, isLoading: isLoadingPledges } = usePledgesQuery({
    contactId: contactId as number,
    page: 1,
    limit: 100,
  });

  const pledgeDataId = isEditMode ? props.pledgeId : selectedPledgeId;
  const { data: pledgeData, isLoading: isLoadingPledge } =
    usePledgeDetailsQuery(pledgeDataId as number);

  const createPaymentPlanMutation = useCreatePaymentPlanMutation();
  const updatePaymentPlanMutation = useUpdatePaymentPlanMutation();
  const pauseResumeMutation = usePauseResumePaymentPlanMutation();
  const deleteMutation = useDeletePaymentPlanMutation();

  const existingPlan = existingPlanData?.paymentPlan;

  useEffect(() => {
    if (isEditMode && existingPlan && !selectedPledgeId) {
      setSelectedPledgeId(existingPlan.pledgeId);
    }
  }, [existingPlan, isEditMode, selectedPledgeId]);

  useEffect(() => {
    if (
      !isEditMode &&
      !initialPledgeId &&
      !selectedPledgeId &&
      pledgesData?.pledges?.length
    ) {
      const firstPledge = pledgesData.pledges[0];
      setSelectedPledgeId(firstPledge.id);
    }
  }, [pledgesData, isEditMode, initialPledgeId, selectedPledgeId]);

  const effectivePledgeAmount =
    isEditMode && existingPlan
      ? Number.parseFloat(existingPlan?.pledgeOriginalAmount?.toString() || "0")
      : pledgeAmount || (pledgeData?.pledge.originalAmount ?? 0);

  const effectivePledgeCurrency =
    isEditMode && existingPlan
      ? existingPlan?.currency
      : pledgeCurrency || (pledgeData?.pledge.currency ?? "USD");

  const effectivePledgeDescription =
    isEditMode && existingPlan
      ? existingPlan?.pledgeDescription || `Pledge #${existingPlan?.pledgeId}`
      : pledgeDescription ||
      (pledgeData?.pledge.description ?? `Pledge #${selectedPledgeId}`);

  const effectiveRemainingBalance =
    isEditMode && existingPlan
      ? Number.parseFloat(existingPlan?.remainingAmount?.toString() || "0")
      : remainingBalance ||
      (pledgeData?.pledge.remainingBalance ?? effectivePledgeAmount);

  const defaultAmount = effectiveRemainingBalance || effectivePledgeAmount;

  const getDefaultPledgeId = () => {
    if (selectedPledgeId) return selectedPledgeId;
    if (initialPledgeId) return initialPledgeId;
    if (!isEditMode && pledgesData?.pledges?.length) {
      return pledgesData.pledges[0].id;
    }
    return 0;
  };

  const form = useForm({
    resolver: zodResolver(paymentPlanSchema),
    defaultValues: {
      pledgeId: getDefaultPledgeId(),
      planName: "",
      frequency: "monthly" as const,
      distributionType: "fixed" as const,
      totalPlannedAmount: defaultAmount,
      currency: (effectivePledgeCurrency || "USD") as "USD" | "ILS" | "EUR" | "JPY" | "GBP" | "AUD" | "CAD" | "ZAR",
      installmentAmount: 0,
      numberOfInstallments: 12,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      nextPaymentDate: "",
      autoRenew: false,
      planStatus: "active" as const,
      notes: "",
      internalNotes: "",
      customInstallments: undefined,
      paymentMethod: undefined,
      methodDetail: undefined,
    },
  });

  const watchedFrequency = form.watch("frequency");
  const watchedStartDate = form.watch("startDate");
  const watchedNumberOfInstallments = form.watch("numberOfInstallments");
  const watchedTotalPlannedAmount = form.watch("totalPlannedAmount");
  const watchedInstallmentAmount = form.watch("installmentAmount");
  const watchedCurrency = form.watch("currency");

  // Auto-generate installments for fixed plans in edit mode
  useEffect(() => {
    if (isEditMode && existingPlan && isFormInitializedRef.current) {
      // If it's a fixed plan, generate installments for editing
      if (existingPlan.distributionType === "fixed") {
        const generatedInstallments = generatePreviewInstallments(
          existingPlan.startDate?.split("T")[0] || "",
          existingPlan.frequency,
          existingPlan.numberOfInstallments || 1,
          Number.parseFloat(existingPlan.totalPlannedAmount?.toString() || "0"),
          existingPlan.currency
        ).map(inst => ({
          date: inst.date,
          amount: inst.amount,
          notes: "",
          isPaid: false,
          paidDate: undefined,
          paidAmount: undefined,
        }));

        form.setValue("customInstallments", generatedInstallments);
      }
    }
  }, [existingPlan, isEditMode, form, isFormInitializedRef.current]);

  useEffect(() => {
    if (isEditMode && !isFormInitializedRef.current) {
      previousCurrencyRef.current = watchedCurrency;
      return;
    }

    if (
      !isFormInitializedRef.current ||
      !exchangeRates ||
      !previousCurrencyRef.current ||
      !watchedCurrency ||
      previousCurrencyRef.current === watchedCurrency
    ) {
      previousCurrencyRef.current = watchedCurrency;
      return;
    }

    const currentAmount = form.getValues("totalPlannedAmount");
    if (currentAmount > 0) {
      const convertedAmount = convertAmount(
        currentAmount,
        previousCurrencyRef.current,
        watchedCurrency,
        exchangeRates
      );
      const roundedAmount = roundToPrecision(convertedAmount, 2);
      form.setValue("totalPlannedAmount", roundedAmount);

      if (!manualInstallment) {
        const installments = form.getValues("numberOfInstallments");
        if (installments > 0) {
          const newInstallmentAmount = roundToPrecision(roundedAmount / installments, 2);
          form.setValue("installmentAmount", newInstallmentAmount);
        }
      }
    }

    previousCurrencyRef.current = watchedCurrency;
  }, [watchedCurrency, exchangeRates, form, manualInstallment, isEditMode]);

  useEffect(() => {
    if (isEditMode && existingPlan && !isFormInitializedRef.current) {
      const planData = {
        pledgeId: existingPlan.pledgeId,
        planName: existingPlan.planName || "",
        frequency: existingPlan.frequency as any,
        paymentMethod: existingPlan.paymentMethod as any,
        methodDetail: existingPlan.methodDetail as any,
        distributionType: existingPlan.distributionType as any,
        totalPlannedAmount: Number.parseFloat(
          existingPlan.totalPlannedAmount?.toString() || "0"
        ),
        currency: existingPlan.currency as any,
        installmentAmount: Number.parseFloat(
          existingPlan.installmentAmount?.toString() || "0"
        ),
        numberOfInstallments: existingPlan.numberOfInstallments || 1,
        startDate: existingPlan.startDate?.split("T")[0] || "",
        endDate: existingPlan.endDate?.split("T")[0] || "",
        nextPaymentDate: existingPlan.nextPaymentDate?.split("T")[0] || "",
        autoRenew: existingPlan.autoRenew || false,
        planStatus: existingPlan.planStatus || "active",
        notes: existingPlan.notes || "",
        internalNotes: existingPlan.internalNotes || "",
        customInstallments: existingPlan.customInstallments || undefined,
      };

      form.reset(planData);
      previousCurrencyRef.current = existingPlan.currency;
      isFormInitializedRef.current = true;
    }
  }, [existingPlan, isEditMode, form]);

  useEffect(() => {
    if (!isEditMode && selectedPledgeId) {
      form.setValue("pledgeId", selectedPledgeId);
    }
  }, [selectedPledgeId, form, isEditMode]);

  useEffect(() => {
    if (!isEditMode && pledgeData?.pledge) {
      const newDefaultAmount =
        pledgeData.pledge.remainingBalance || pledgeData.pledge.originalAmount;
      form.setValue("totalPlannedAmount", newDefaultAmount);
      form.setValue("currency", pledgeData.pledge.currency as any);
      previousCurrencyRef.current = pledgeData.pledge.currency;
      isFormInitializedRef.current = true;
    }
  }, [pledgeData, form, isEditMode]);

  useEffect(() => {
    if (!isEditMode && initialPledgeId && !selectedPledgeId) {
      setSelectedPledgeId(initialPledgeId);
    }
  }, [initialPledgeId, isEditMode, selectedPledgeId]);

  useEffect(() => {
    if (
      !isEditMode &&
      !isFormInitializedRef.current &&
      effectivePledgeCurrency
    ) {
      previousCurrencyRef.current = effectivePledgeCurrency;
      isFormInitializedRef.current = true;
    }
  }, [isEditMode, effectivePledgeCurrency]);

  // Enhanced automatic calculation for fixed distribution
  useEffect(() => {
    if (!manualInstallment && form.watch("distributionType") !== "custom") {
      const totalAmount = watchedTotalPlannedAmount;
      const installments = watchedNumberOfInstallments;

      if (totalAmount && installments > 0) {
        // Calculate base installment amount
        const baseAmount = roundToPrecision(totalAmount / installments, 2);

        // Calculate what the total would be with this amount
        const calculatedTotal = baseAmount * installments;
        const difference = roundToPrecision(totalAmount - calculatedTotal, 2);

        // If there's a significant difference, adjust the installment amount slightly
        let finalAmount = baseAmount;
        if (Math.abs(difference) > 0.01) {
          // Add the difference to the base amount to maintain total
          finalAmount = roundToPrecision(baseAmount + (difference / installments), 2);
        }

        form.setValue("installmentAmount", finalAmount);
      }
    }
  }, [
    watchedTotalPlannedAmount,
    watchedNumberOfInstallments,
    form,
    manualInstallment,
  ]);

  useEffect(() => {
    if (
      manualInstallment &&
      watchedInstallmentAmount > 0 &&
      watchedTotalPlannedAmount > 0
    ) {
      const calculatedInstallments = Math.ceil(
        watchedTotalPlannedAmount / watchedInstallmentAmount
      );
      form.setValue("numberOfInstallments", calculatedInstallments);
    }
  }, [
    watchedInstallmentAmount,
    watchedTotalPlannedAmount,
    form,
    manualInstallment,
  ]);

  useEffect(() => {
    if (watchedStartDate && watchedFrequency) {
      const nextPayment = calculateNextPaymentDate(
        watchedStartDate,
        watchedFrequency
      );
      form.setValue("nextPaymentDate", nextPayment);

      if (watchedNumberOfInstallments > 0) {
        const endDate = calculateEndDate(
          watchedStartDate,
          watchedFrequency,
          watchedNumberOfInstallments
        );

        form.setValue("endDate", endDate);
      }
    }
  }, [watchedStartDate, watchedFrequency, watchedNumberOfInstallments, form]);

  useEffect(() => {
    const distributionType = form.watch("distributionType");
    const customInstallments = form.watch("customInstallments");

    if (distributionType === "custom" && customInstallments) {
      const numberOfCustomInstallments = customInstallments.length;
      const currentNumberOfInstallments = form.getValues("numberOfInstallments");

      if (numberOfCustomInstallments !== currentNumberOfInstallments) {
        form.setValue("numberOfInstallments", numberOfCustomInstallments);
      }
    }
  }, [form.watch("distributionType"), form.watch("customInstallments"), form]);

  const resetForm = () => {
    setManualInstallment(false);
    setInstallmentsModified(false);
    isFormInitializedRef.current = false;
    previousCurrencyRef.current = undefined;

    if (isEditMode && existingPlan) {
      const originalPlanData = {
        pledgeId: existingPlan.pledgeId,
        planName: existingPlan.planName || "",
        frequency: existingPlan.frequency as any,
        totalPlannedAmount: Number.parseFloat(
          existingPlan.totalPlannedAmount?.toString() || "0"
        ),
        currency: existingPlan.currency as any,
        installmentAmount: Number.parseFloat(
          existingPlan.installmentAmount?.toString() || "0"
        ),
        numberOfInstallments: existingPlan.numberOfInstallments || 1,
        startDate: existingPlan.startDate?.split("T")[0] || "",
        endDate: existingPlan.endDate?.split("T")[0] || "",
        nextPaymentDate: existingPlan.nextPaymentDate?.split("T")[0] || "",
        autoRenew: existingPlan.autoRenew || false,
        planStatus: existingPlan.planStatus || "active",
        notes: existingPlan.notes || "",
        internalNotes: existingPlan.internalNotes || "",
        distributionType: existingPlan.distributionType as any,
        customInstallments: existingPlan.customInstallments as any || undefined,
      };

      form.reset(originalPlanData);
      previousCurrencyRef.current = existingPlan.currency;
      isFormInitializedRef.current = true;
      setIsEditing(false);
    } else {
      const newDefaultAmount = effectiveRemainingBalance || effectivePledgeAmount;
      const defaultPledgeId = selectedPledgeId || initialPledgeId ||
        (pledgesData?.pledges?.length ? pledgesData.pledges[0].id : 0);

      form.reset({
        pledgeId: defaultPledgeId,
        planName: "",
        frequency: "monthly" as const,
        totalPlannedAmount: newDefaultAmount,
        currency: effectivePledgeCurrency as any,
        installmentAmount: 0,
        numberOfInstallments: 12,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        nextPaymentDate: "",
        autoRenew: false,
        planStatus: "active" as const,
        notes: "",
        internalNotes: "",
        distributionType: "fixed" as const,
        customInstallments: undefined,
      });

      previousCurrencyRef.current = effectivePledgeCurrency;
      setTimeout(() => {
        isFormInitializedRef.current = true;
      }, 100);
    }
  };

  const onSubmit = async (data: PaymentPlanFormData) => {
    try {
      if (!isEditMode && !showPreview) {
        setShowPreview(true);
        return;
      }

      // Auto-convert to custom if installments were modified in edit mode
      const finalData = { ...data };
      if (isEditMode && data.distributionType === "fixed" && installmentsModified) {
        finalData.distributionType = "custom";
        // Recalculate totals based on custom installments
        const totalFromInstallments = data.customInstallments?.reduce((sum, inst) => sum + inst.amount, 0) || 0;
        finalData.totalPlannedAmount = roundToPrecision(totalFromInstallments, 2);
        finalData.numberOfInstallments = data.customInstallments?.length || 0;
      }

      // Ensure currency is properly set
      if (!finalData.currency) {
        finalData.currency = "USD";
      }

      // Transform custom installments for API
      const submissionData = {
        ...finalData,
        paymentMethod: finalData.paymentMethod || undefined,
        methodDetail: finalData.methodDetail || undefined,
        customInstallments: finalData.distributionType === 'custom' && finalData.customInstallments
          ? finalData.customInstallments.map(inst => ({
            date: inst.date,
            amount: inst.amount, // Keep as number, API will transform
            notes: inst.notes || "",
          }))
          : undefined,
      };

      if (isEditMode && paymentPlanId) {
        await updatePaymentPlanMutation.mutateAsync({
          id: paymentPlanId,
          data: submissionData,
        });
      } else {
        await createPaymentPlanMutation.mutateAsync(submissionData);
      }

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} payment plan:`, error);
    }
  };

  const handlePreviewConfirm = () => {
    const formData = form.getValues();

    // Ensure currency is set (should always be true due to form validation)
    if (!formData.currency) {
      form.setError('currency', { message: 'Currency is required' });
      return;
    }

    setShowPreview(false);
    onSubmit(formData as PaymentPlanFormData);
  };

  const handlePreviewEdit = () => {
    setShowPreview(false);
  };

  useEffect(() => {
    if (isEditMode && existingPlan && isFormInitializedRef.current) {
      const totalAmount = Number.parseFloat(existingPlan.totalPlannedAmount?.toString() || "0");
      const installmentAmount = Number.parseFloat(existingPlan.installmentAmount?.toString() || "0");
      const numberOfInstallments = existingPlan.numberOfInstallments || 1;

      const autoCalculatedAmount = roundToPrecision(totalAmount / numberOfInstallments, 2);
      const difference = Math.abs(installmentAmount - autoCalculatedAmount);

      if (difference > 0.01) {
        setManualInstallment(true);
      }
    }
  }, [existingPlan, isEditMode]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);

    if (!newOpen) {
      setIsEditing(mode === "create");
      setManualInstallment(false);
      setShowPreview(false);
      setInstallmentsModified(false);
      isFormInitializedRef.current = false;
      previousCurrencyRef.current = undefined;
      onClose?.();
    } else {
      setIsEditing(true);
    }
  };

  const handlePauseResume = (action: "pause" | "resume") => {
    if (existingPlan) {
      pauseResumeMutation.mutate({ planId: existingPlan.id, action });
    }
  };

  const handleDelete = () => {
    if (existingPlan) {
      deleteMutation.mutate(existingPlan.id, {
        onSuccess: () => {
          setOpen(false);
          onSuccess?.();
        },
      });
    }
  };

  const toggleManualInstallment = () => {
    setManualInstallment(!manualInstallment);

    if (!manualInstallment) {
      // When switching to manual mode, keep current values
    } else {
      // When switching back to auto mode, recalculate with precision
      const totalAmount = form.getValues("totalPlannedAmount");
      const installments = form.getValues("numberOfInstallments");

      if (totalAmount && installments > 0) {
        const baseAmount = roundToPrecision(totalAmount / installments, 2);
        const calculatedTotal = baseAmount * installments;
        const difference = roundToPrecision(totalAmount - calculatedTotal, 2);

        let finalAmount = baseAmount;
        if (Math.abs(difference) > 0.01) {
          finalAmount = roundToPrecision(baseAmount + (difference / installments), 2);
        }

        form.setValue("installmentAmount", finalAmount);
      }
    }
  };

  const pledgeOptions =
    pledgesData?.pledges?.map((pledge) => ({
      label: `#${pledge.id} - ${pledge.description || "No description"} (${pledge.currency
        } ${Number.parseFloat(pledge.balance.toString()).toLocaleString()})`,
      value: pledge.id,
      balance: Number.parseFloat(pledge.balance.toString()),
      currency: pledge.currency,
      description: pledge.description,
    })) || [];

  const defaultTrigger = isEditMode ? (
    <Button size="sm" variant="outline">
      <Edit className="w-4 h-4 mr-2" />
      Edit Plan
    </Button>
  ) : (
    <Button
      size="sm"
      variant="outline"
      className="border-dashed bg-transparent"
    >
      <CalendarIcon className="w-4 h-4 mr-2" />
      Create Payment Plan
    </Button>
  );

  if (isEditMode && isLoadingPlan) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit Payment Plan" : "Create Payment Plan"}
          </DialogTitle>
          <DialogDescription>
            {isLoadingPledge ? (
              "Loading pledge details..."
            ) : (
              <div>
                {isEditMode ? "Update the payment plan" : "Set up a"} payment
                plan for pledge: {effectivePledgeDescription}
                {effectiveRemainingBalance > 0 && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Remaining Balance: {effectivePledgeCurrency}{" "}
                    {effectiveRemainingBalance.toLocaleString()}
                  </span>
                )}
                {(pledgeData?.contact || existingPlan) && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Contact: {pledgeData?.contact?.fullName || existingPlan?.pledgeContact || "Loading..."}
                  </span>
                )}
                <div className="mt-2">
                  <ExchangeRateDisplay
                    currency={effectivePledgeCurrency}
                    exchangeRates={exchangeRates}
                    isLoading={isLoadingRates}
                  />
                </div>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        {showPreview ? (
          <PaymentPlanPreview
            formData={{
              ...form.getValues(),
              currency: form.getValues().currency || "USD",
              distributionType: form.getValues().distributionType || "fixed",
              autoRenew: form.getValues().autoRenew || false,
              pledgeId: form.getValues().pledgeId || 0,
              totalPlannedAmount: form.getValues().totalPlannedAmount || 0,
              installmentAmount: form.getValues().installmentAmount || 0,
              numberOfInstallments: form.getValues().numberOfInstallments || 1,
              startDate: form.getValues().startDate || new Date().toISOString().split('T')[0],
              planStatus: form.getValues().planStatus || 'active',
            }}
            onConfirm={handlePreviewConfirm}
            onEdit={handlePreviewEdit}
            isLoading={createPaymentPlanMutation.isPending}
            isEditMode={isEditMode}
            installmentsModified={installmentsModified}
          />
        ) : (
          <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {showPledgeSelector && !isEditMode && (
                  <FormField
                    control={form.control}
                    name="pledgeId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Select Pledge *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={isLoadingPledges}
                              >
                                {field.value
                                  ? pledgeOptions.find(
                                    (pledge) => pledge.value === field.value
                                  )?.label
                                  : isLoadingPledges
                                    ? "Loading pledges..."
                                    : "Select pledge"}
                                <ChevronsUpDown className="opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search pledges..."
                                className="h-9"
                              />
                              <CommandList>
                                <CommandEmpty>No pledge found.</CommandEmpty>
                                <CommandGroup>
                                  {pledgeOptions.map((pledge) => (
                                    <CommandItem
                                      value={pledge.label}
                                      key={pledge.value}
                                      onSelect={() => {
                                        setSelectedPledgeId(pledge.value);
                                        form.setValue("pledgeId", pledge.value);
                                      }}
                                    >
                                      {pledge.label}
                                      <Check
                                        className={cn(
                                          "ml-auto",
                                          pledge.value === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="totalPlannedAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Planned Amount *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? Number.parseFloat(value) : 0);
                          }}
                          disabled={!isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || "USD"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {supportedCurrencies.map((curr) => (
                            <SelectItem key={curr} value={curr}>
                              {curr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2">
                        <ExchangeRateDisplay
                          currency={field.value || "USD"}
                          exchangeRates={exchangeRates}
                          isLoading={isLoadingRates}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Frequency *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {frequencies.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Payment Method</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? paymentMethods.find(
                                  (method) => method.value === field.value
                                )?.label
                                : "Select payment method"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Search payment methods..." />
                            <CommandEmpty>No payment method found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                              {paymentMethods.map((method) => (
                                <CommandItem
                                  value={method.label}
                                  key={method.value}
                                  onSelect={() => {
                                    form.setValue("paymentMethod", method.value);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      method.value === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {method.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="methodDetail"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Method Detail</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? methodDetails.find(
                                  (detail) => detail.value === field.value
                                )?.label
                                : "Select method detail"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Search method details..." />
                            <CommandEmpty>No method detail found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                              {methodDetails.map((detail) => (
                                <CommandItem
                                  value={detail.label}
                                  key={detail.value}
                                  onSelect={() => {
                                    form.setValue("methodDetail", detail.value);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      detail.value === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {detail.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="distributionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distribution Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "fixed"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select distribution type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="custom">Custom Schedule</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Always show installment editor in edit mode OR when custom is selected */}
                {(form.watch("distributionType") === "custom" || isEditMode) && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        {isEditMode && form.watch("distributionType") === "fixed"
                          ? "Edit Installments (will convert to custom plan)"
                          : "Custom Installments"}
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentInstallments = form.getValues("customInstallments") || [];
                          const newInstallment = {
                            date: form.getValues("startDate") || new Date().toISOString().split("T")[0],
                            amount: 0,
                            notes: "",
                          };
                          form.setValue("customInstallments", [...currentInstallments, newInstallment]);
                          if (isEditMode && form.watch("distributionType") === "fixed") {
                            setInstallmentsModified(true);
                          }
                        }}
                      >
                        Add Installment
                      </Button>
                    </div>

                    {/* Show warning for fixed plans being converted */}
                    {isEditMode && form.watch("distributionType") === "fixed" && installmentsModified && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
                          <span className="text-sm text-amber-700">
                            Modifying installments will convert this fixed plan to a custom plan upon saving.
                          </span>
                        </div>
                      </div>
                    )}

                    {form.watch("customInstallments")?.map((installment, index) => (
                      <div key={index} className="grid grid-cols-3 gap-4 items-end p-3 bg-gray-50 rounded-lg">
                        <FormField
                          control={form.control}
                          name={`customInstallments.${index}.date`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Date</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    if (isEditMode && form.watch("distributionType") === "fixed") {
                                      setInstallmentsModified(true);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`customInstallments.${index}.amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Amount</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={(e) => {
                                    field.onChange(Number(e.target.value));
                                    if (isEditMode && form.watch("distributionType") === "fixed") {
                                      setInstallmentsModified(true);
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex items-end gap-2">
                          <FormField
                            control={form.control}
                            name={`customInstallments.${index}.notes`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Notes</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const currentInstallments = form.getValues("customInstallments") || [];
                              form.setValue(
                                "customInstallments",
                                currentInstallments.filter((_, i) => i !== index)
                              );
                              if (isEditMode && form.watch("distributionType") === "fixed") {
                                setInstallmentsModified(true);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Show paid status for existing installments */}
                        {isEditMode && installment.isPaid && (
                          <div className="col-span-3 text-sm text-green-600 bg-green-50 p-2 rounded">
                            ✓ Paid on {installment.paidDate} - Amount: {form.watch("currency")} {installment.paidAmount}
                          </div>
                        )}
                      </div>
                    ))}

                    {(form.watch("customInstallments") || []).length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="text-sm font-medium text-blue-900 mb-2">
                          {isEditMode && form.watch("distributionType") === "fixed" ? "Generated" : "Custom"} Schedule Summary
                        </h5>
                        <div className="text-sm text-blue-800">
                          <div>Total Installments: {form.watch("customInstallments")?.length || 0}</div>
                          <div>
                            Total Amount: {form.watch("currency")} {
                              roundToPrecision(form.watch("customInstallments")?.reduce((sum, inst) => sum + (inst.amount || 0), 0) || 0, 2).toLocaleString()
                            }
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fixed distribution settings - only show when not in edit mode or when custom is not selected */}
                {form.watch("distributionType") !== "custom" && !(isEditMode && form.watch("customInstallments")) && (
                  <>
                    {isEditMode && (
                      <FormField
                        control={form.control}
                        name="planStatus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Status</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {statusOptions.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <Button
                        type="button"
                        size="sm"
                        variant={manualInstallment ? "default" : "outline"}
                        onClick={toggleManualInstallment}
                        className="shrink-0"
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        {manualInstallment ? "Auto Calculate" : "Manual Entry"}
                      </Button>
                      <p className="text-sm text-blue-700">
                        {manualInstallment
                          ? "Enter both installment amount and number of installments manually"
                          : "Installment amount will be calculated automatically from total amount ÷ number of installments"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="numberOfInstallments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Installments *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value ? Number.parseInt(value) : 1);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="installmentAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Installment Amount *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value ? Number.parseFloat(value) : 0);
                                }}
                                readOnly={!manualInstallment}
                                className={!manualInstallment ? "bg-gray-50" : ""}
                              />
                            </FormControl>
                            <FormMessage />
                            {!manualInstallment && (
                              <p className="text-xs text-muted-foreground">
                                Calculated automatically
                              </p>
                            )}
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {/* Plan status for custom distribution in edit mode */}
                {isEditMode && (form.watch("distributionType") === "custom" || form.watch("customInstallments")) && (
                  <FormField
                    control={form.control}
                    name="planStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plan Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (Estimated)</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value || ""}
                            readOnly
                            className="bg-gray-50"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="nextPaymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Payment Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value || ""}
                          readOnly
                          className="bg-gray-50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="autoRenew"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Auto Renew</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Automatically create a new plan when this one completes
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Public notes about this payment plan"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Internal Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Internal notes (not visible to donor)"
                          rows={2}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Payment Plan Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                    <div>
                      Total Amount: {form.watch("currency")}{" "}
                      {form.watch("totalPlannedAmount")?.toLocaleString() || 0}
                    </div>
                    <div>
                      Installments: {
                        form.watch("distributionType") === "custom" || (isEditMode && form.watch("customInstallments"))
                          ? form.watch("customInstallments")?.length || 0
                          : form.watch("numberOfInstallments") || 0
                      }
                    </div>
                    {(form.watch("distributionType") !== "custom" && !(isEditMode && form.watch("customInstallments"))) && (
                      <div>
                        Per Payment: {form.watch("currency")}{" "}
                        {form.watch("installmentAmount")?.toLocaleString() || 0}
                      </div>
                    )}
                    <div>
                      Frequency:{" "}
                      {
                        frequencies.find((f) => f.value === form.watch("frequency"))
                          ?.label || "Not selected"
                      }
                    </div>
                    <div>
                      Distribution: {
                        (form.watch("distributionType") === "custom" || (isEditMode && form.watch("customInstallments")))
                          ? "Custom Schedule"
                          : "Fixed Amount"
                      }
                    </div>
                    {isEditMode && (
                      <div className="col-span-2 pt-2 border-t border-blue-200">
                        Plan Status:{" "}
                        <span className="capitalize">
                          {form.watch("planStatus") || "active"}
                        </span>
                      </div>
                    )}
                    {exchangeRates &&
                      watchedCurrency &&
                      watchedCurrency !== "USD" && (
                        <div className="col-span-2 pt-2 border-t border-blue-200">
                          <div className="text-xs text-blue-600">
                            USD Equivalent: ~$
                            {roundToPrecision(
                              (form.watch("totalPlannedAmount") || 0) *
                              Number.parseFloat(
                                exchangeRates[watchedCurrency] || "1"
                              ), 2
                            ).toLocaleString()}
                          </div>
                        </div>
                      )}
                    {manualInstallment &&
                      (form.watch("distributionType") !== "custom" && !(isEditMode && form.watch("customInstallments"))) &&
                      watchedInstallmentAmount &&
                      watchedTotalPlannedAmount && (
                        <div className="col-span-2 pt-2 border-t border-blue-200 text-xs">
                          <div className="flex justify-between">
                            <span>
                              Manual Total ({form.watch("numberOfInstallments")} ×{" "}
                              {form.watch("currency")}{" "}
                              {form.watch("installmentAmount")}):
                            </span>
                            <span className="font-medium">
                              {form.watch("currency")}{" "}
                              {roundToPrecision(
                                (form.watch("numberOfInstallments") || 0) *
                                (form.watch("installmentAmount") || 0), 2
                              ).toLocaleString()}
                            </span>
                          </div>
                          {Math.abs(
                            (form.watch("numberOfInstallments") || 0) *
                            (form.watch("installmentAmount") || 0) -
                            (form.watch("totalPlannedAmount") || 0)
                          ) > 0.01 && (
                              <div className="flex justify-between text-amber-700 mt-1">
                                <span>Difference from planned total:</span>
                                <span className="font-medium">
                                  {form.watch("currency")}{" "}
                                  {roundToPrecision(Math.abs(
                                    (form.watch("numberOfInstallments") || 0) *
                                    (form.watch("installmentAmount") || 0) -
                                    (form.watch("totalPlannedAmount") || 0)
                                  ), 2).toLocaleString()}
                                </span>
                              </div>
                            )}
                        </div>
                      )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        handleOpenChange(false);
                      }}
                      disabled={
                        createPaymentPlanMutation.isPending ||
                        updatePaymentPlanMutation.isPending
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        createPaymentPlanMutation.isPending ||
                        updatePaymentPlanMutation.isPending ||
                        isLoadingPledge ||
                        (!isEditMode && !selectedPledgeId) ||
                        (!isEditMode && showPledgeSelector && isLoadingPledges)
                      }
                      className="text-white"
                    >
                      {createPaymentPlanMutation.isPending ||
                        updatePaymentPlanMutation.isPending
                        ? isEditMode
                          ? "Updating..."
                          : "Creating..."
                        : isEditMode
                          ? "Update Payment Plan"
                          : "Continue to Preview"}
                    </Button>
                  </div>
                )}
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
