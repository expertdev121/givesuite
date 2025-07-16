/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line react-hooks/exhaustive-deps
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown, X, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
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
import { Switch } from "@/components/ui/switch";
import { useExchangeRates } from "@/lib/query/useExchangeRates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreatePaymentMutation } from "@/lib/query/payments/usePaymentQuery";
import { usePledgeDetailsQuery } from "@/lib/query/payment-plans/usePaymentPlanQuery";
import { PlusCircleIcon } from "lucide-react";
import { usePledgesQuery } from "@/lib/query/usePledgeData";
import useContactId from "@/hooks/use-contact-id";

interface Solicitor {
  id: number;
  firstName: string;
  lastName: string;
  commissionRate: number;
  contact: any;
}

interface Pledge {
  id: number;
  description: string;
  currency: typeof supportedCurrencies[number];
  balance: string;
  originalAmount: string;
  remainingBalance?: number;
  contact?: {
    fullName: string;
  };
}

const useSolicitors = (params: { search?: string; status?: "active" | "inactive" | "suspended"; } = {}) => {
  return useQuery<{ solicitors: Solicitor[] }>({
    queryKey: ["solicitors", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set("search", params.search);
      if (params.status) searchParams.set("status", params.status);

      const response = await fetch(`/api/solicitor?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch solicitors");
      return response.json();
    },
  });
};

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

const paymentStatuses = [
  { value: "expected", label: "Expected" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "refund", label: "Refund" },
  { value: "returned", label: "Returned" },
  { value: "declined", label: "Declined" },
] as const;

const receiptTypes = [
  { value: "invoice", label: "Invoice" },
  { value: "confirmation", label: "Confirmation" },
  { value: "receipt", label: "Receipt" },
  { value: "other", label: "Other" },
] as const;

const allocationSchema = z.object({
  pledgeId: z.number().optional(),
  allocatedAmount: z.number().optional(),
  installmentScheduleId: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const paymentSchema = z.object({
  amount: z.number().optional(),
  currency: z.string().optional(),
  amountUsd: z.number().optional(),
  exchangeRate: z.number().optional(),

  paymentDate: z.string().optional(),
  receivedDate: z.string().optional().nullable(),
  paymentMethod: z.string().optional(),
  methodDetail: z.string().optional().nullable(),
  paymentStatus: z.string().optional(),
  referenceNumber: z.string().optional().nullable(),
  checkNumber: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  receiptType: z.string().optional().nullable(),
  receiptIssued: z.boolean().optional(),

  solicitorId: z.number().optional().nullable(),
  bonusPercentage: z.number().optional().nullable(),
  bonusAmount: z.number().optional().nullable(),
  bonusRuleId: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),

  pledgeId: z.number().optional().nullable(),
  paymentPlanId: z.number().optional().nullable(),
  installmentScheduleId: z.number().optional().nullable(),

  isSplitPayment: z.boolean().optional(),
  allocations: z.array(allocationSchema).optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  pledgeId?: number;
  contactId?: number;
  showPledgeSelector?: boolean;
}

export default function PaymentFormDialog({
  pledgeId: initialPledgeId,
  contactId: propContactId,
  showPledgeSelector = false,
}: PaymentDialogProps) {
  const {
    data: exchangeRatesData,
    isLoading: isLoadingRates,
    error: ratesError,
    refetch: refetchRates,
  } = useExchangeRates();
  const { data: solicitorsData, isLoading: isLoadingSolicitors } =
    useSolicitors({ status: "active" });
  const createPaymentMutation = useCreatePaymentMutation();

  const [open, setOpen] = useState(false);
  const [showSolicitorSection, setShowSolicitorSection] = useState(false);

  const contactId = useContactId() || propContactId;

  const { data: pledgesData, isLoading: isLoadingPledges } = usePledgesQuery(
    {
      contactId: contactId as number,
      page: 1,
      limit: 100,
      status: undefined,
    },
    { enabled: !!contactId }
  );

  const isLoadingAllInstallments = false;

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      currency: "USD",
      exchangeRate: 1,
      amountUsd: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      receivedDate: null,
      paymentMethod: "cash",
      methodDetail: null,
      paymentStatus: "completed",
      referenceNumber: null,
      receiptNumber: null,
      receiptType: null,
      receiptIssued: false,
      solicitorId: null,
      bonusPercentage: null,
      bonusAmount: null,
      bonusRuleId: null,
      notes: null,
      pledgeId: initialPledgeId || null,
      paymentPlanId: null,
      installmentScheduleId: null,
      isSplitPayment: false,
      allocations: initialPledgeId
        ? [{ pledgeId: initialPledgeId, allocatedAmount: 0, installmentScheduleId: null, notes: null }]
        : [{ pledgeId: 0, allocatedAmount: 0, installmentScheduleId: null, notes: null }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "allocations",
  });

  const watchedCurrency = form.watch("currency");
  const watchedAmount = form.watch("amount");
  const watchedPaymentDate = form.watch("paymentDate");
  const watchedSolicitorId = form.watch("solicitorId");
  const watchedBonusPercentage = form.watch("bonusPercentage");
  const watchedExchangeRate = form.watch("exchangeRate");
  const watchedAllocations = form.watch("allocations");
  const watchedIsSplitPayment = form.watch("isSplitPayment");
  const watchedMainPledgeId = form.watch("pledgeId");

  const totalAllocatedAmount = watchedAllocations.reduce((sum, alloc) => sum + (alloc.allocatedAmount || 0), 0);
  const remainingToAllocate = watchedAmount - totalAllocatedAmount;

  const { data: pledgeData, isLoading: isLoadingPledge } = usePledgeDetailsQuery(
    watchedMainPledgeId!,
    { enabled: !watchedIsSplitPayment && !!watchedMainPledgeId && watchedMainPledgeId !== 0 }
  );

  const effectivePledgeDescription = pledgeData?.pledge?.description || "N/A";
  const effectivePledgeCurrency = pledgeData?.pledge?.currency || "USD";

  useEffect(() => {
    if (initialPledgeId && !form.formState.isDirty) {
      form.setValue("pledgeId", initialPledgeId);
      if (!watchedIsSplitPayment) {
        form.setValue("allocations.0.pledgeId", initialPledgeId);
        const initialPledge = pledgesData?.pledges?.find(p => p.id === initialPledgeId);
        if (initialPledge) {
          const balance = parseFloat(initialPledge.balance);
          form.setValue("amount", balance);
          form.setValue("allocations.0.allocatedAmount", balance);
          form.setValue("currency", initialPledge.currency as typeof supportedCurrencies[number]);
        }
      }
    }
  }, [initialPledgeId, form, pledgesData, watchedIsSplitPayment]);

  useEffect(() => {
    const updateCalculatedAmounts = () => {
      const currency = form.getValues("currency");
      const amount = form.getValues("amount");

      const currentExchangeRate = form.getValues("exchangeRate");
      if (currency && amount) {
        const rate = (currency === "USD") ? 1 : currentExchangeRate;
        const usdAmount = amount / rate;
        form.setValue("amountUsd", Math.round(usdAmount * 100) / 100);
      }
    };

    updateCalculatedAmounts();
  }, [watchedCurrency, watchedAmount, watchedExchangeRate, form]);

  useEffect(() => {
    if (watchedBonusPercentage != null && watchedAmount != null) {
      const bonusAmount = (watchedAmount * watchedBonusPercentage) / 100;
      form.setValue("bonusAmount", Math.round(bonusAmount * 100) / 100);
    } else {
      form.setValue("bonusAmount", null);
    }
  }, [watchedBonusPercentage, watchedAmount, form]);

  const resetForm = useCallback(() => {
    form.reset({
      amount: 0,
      currency: "USD",
      exchangeRate: 1,
      amountUsd: 0,
      paymentDate: new Date().toISOString().split("T")[0],
      receivedDate: null,
      paymentMethod: "cash",
      methodDetail: null,
      paymentStatus: "completed",
      referenceNumber: null,
      receiptNumber: null,
      receiptType: null,
      receiptIssued: false,
      solicitorId: null,
      bonusPercentage: null,
      bonusAmount: null,
      bonusRuleId: null,
      notes: null,
      pledgeId: initialPledgeId || null,
      paymentPlanId: null,
      installmentScheduleId: null,
      isSplitPayment: false,
      allocations: initialPledgeId
        ? [{ pledgeId: initialPledgeId, allocatedAmount: 0, installmentScheduleId: null, notes: null }]
        : [{ pledgeId: 0, allocatedAmount: 0, installmentScheduleId: null, notes: null }],
    });
    setShowSolicitorSection(false);
  }, [form, initialPledgeId]);

  const getExchangeRate = (currency: string): number => {
    if (currency === "USD") return 1;
    if (exchangeRatesData?.data?.rates) {
      const rate = parseFloat(exchangeRatesData.data.rates[currency]);
      return isNaN(rate) ? 1 : rate;
    }
    return 1;
  };

  const convertAmountBetweenCurrencies = (
    amount: number,
    fromCurrency: typeof supportedCurrencies[number],
    toCurrency: typeof supportedCurrencies[number],
    exchangeRates: Record<string, string> | undefined
  ): number => {
    if (fromCurrency === toCurrency || !exchangeRates) {
      return Math.round(amount * 100) / 100;
    }

    const fromRate = parseFloat(exchangeRates[fromCurrency] || "1");
    const toRate = parseFloat(exchangeRates[toCurrency] || "1");

    if (isNaN(fromRate) || isNaN(toRate) || fromRate === 0 || toRate === 0) {
      console.warn(
        `Invalid exchange rates for ${fromCurrency} or ${toCurrency}, defaulting to direct conversion`
      );
      return Math.round(amount * 100) / 100;
    }

    const amountInUsd = amount / fromRate;
    const convertedAmount = amountInUsd * toRate;

    return Math.round(convertedAmount * 100) / 100;
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      console.log('Form submitted with data:', data);
      const isSplit = data.isSplitPayment;

      const commonPaymentFields = {
        amount: data.amount,
        currency: data.currency,
        amountUsd: data.amountUsd, // Assuming this is calculated or sent from frontend
        exchangeRate: data.exchangeRate,
        paymentDate: data.paymentDate,
        receivedDate: data.receivedDate,
        paymentMethod: data.paymentMethod,
        methodDetail: data.methodDetail, // Ensure this matches backend enum (add 'schwab_charitable' in route.ts)
        paymentStatus: data.paymentStatus,
        referenceNumber: data.referenceNumber,
        receiptNumber: data.receiptNumber,
        receiptType: data.receiptType,
        receiptIssued: data.receiptIssued,
        solicitorId: data.solicitorId ? String(data.solicitorId) : null, // Ensure solicitorId is string or null
        bonusPercentage: data.bonusPercentage,
        bonusAmount: data.bonusAmount,
        bonusRuleId: data.bonusRuleId,
        notes: data.notes,
        // paymentPlanId: null, // Only include if it's in your backend schema as a common field
      };

      let paymentPayload;

      if (isSplit) {
        if (!data.allocations || data.allocations.length === 0) {
          // This case should ideally be caught by your frontend form validation
          throw new Error("Split payment requires at least one allocation.");
        }

        paymentPayload = {
          ...commonPaymentFields,
          isSplitPayment: true,
          // The pledgeId and installmentScheduleId at the top level are NOT part of
          // the split payment schema, remove them if they only apply to single payments.
          // If they are common fields, include them in commonPaymentFields.
          // For now, removing them here based on the backend schema for split payments.
          pledgeId: undefined, // Explicitly set to undefined for split payments if not needed
          installmentScheduleId: undefined, // Explicitly set to undefined for split payments if not needed
          allocations: await Promise.all((data.allocations || []).map(async (allocation) => {
            const targetPledge = pledgesData?.pledges?.find(p => p.id === allocation.pledgeId);
            if (!targetPledge) {
              throw new Error(`Pledge with ID ${allocation.pledgeId} not found for allocation.`);
            }

            const allocatedAmountInPledgeCurrency = convertAmountBetweenCurrencies(
              allocation.allocatedAmount || 0,
              data.currency || "USD",
              targetPledge.currency,
              exchangeRatesData?.data?.rates
            );

            return {
              pledgeId: String(allocation.pledgeId), // FIX: Convert number to string
              installmentScheduleId: allocation.installmentScheduleId ? String(allocation.installmentScheduleId) : null, // FIX: Convert number to string, or null
              amount: allocation.allocatedAmount, // FIX: Renamed from allocatedAmount to amount
              notes: allocation.notes, // Only include if it's in the backend allocation schema
              // You had these in your frontend allocation map, but they are not in the backend's Zod allocation schema.
              // Remove them if the backend does not expect them.
              // currency: data.currency, // Not in backend allocation schema
              // allocatedAmountUsd: (allocation.allocatedAmount || 0) * (data.exchangeRate || 1), // Not in backend allocation schema
              // amountInPledgeCurrency: allocatedAmountInPledgeCurrency, // Not in backend allocation schema
            };
          })),
        };
      } else {
        // Single payment
        if (!data.pledgeId) {
          throw new Error("Single payment requires a pledge ID."); // Frontend validation
        }

        paymentPayload = {
          ...commonPaymentFields,
          isSplitPayment: false,
          pledgeId: String(data.pledgeId), // FIX: Convert number to string
          // If your frontend form has installmentScheduleId at the top level for single payments
          // and your backend schema for single payments includes it, then add it here.
          installmentScheduleId: data.allocations?.length === 1 && data.allocations[0].installmentScheduleId
            ? String(data.allocations[0].installmentScheduleId)
            : null,
          allocations: undefined, // Explicitly set allocations to undefined for single payments
        };
      }

      console.log("Submitting Payload (final):", paymentPayload); // Log the final payload

      await createPaymentMutation.mutateAsync(paymentPayload, {
        onSuccess: () => {
          toast.success("Payment and allocations created successfully!");
          // resetForm(); // Make sure this works with your form setup
          setOpen(false);
        },
        onError: (error) => {
          console.error("Error creating payment:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to create payment"
          );
        }
      });

    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const pledgeOptions =
    pledgesData?.pledges?.map((pledge: Pledge) => ({
      label: `#${pledge.id} - ${pledge.description || "No description"} (${pledge.currency
        } ${parseFloat(pledge.balance).toLocaleString()})`,
      value: pledge.id,
      balance: parseFloat(pledge.balance),
      currency: pledge.currency,
      description: pledge.description,
      originalAmount: parseFloat(pledge.originalAmount),
    })) || [];

  const solicitorOptions =
    solicitorsData?.solicitors?.map((solicitor: Solicitor) => ({
      label: `${solicitor.firstName} ${solicitor.lastName}${solicitor.id ? ` (${solicitor.id})` : ""
        }`,
      value: solicitor.id,
      commissionRate: solicitor.commissionRate,
      contact: solicitor.contact,
    })) || [];

  const getPledgeById = (id: number): Pledge | undefined => {
    return pledgesData?.pledges?.find((p: Pledge) => p.id === id);
  };

  const addAllocation = () => {
    append({ pledgeId: 0, allocatedAmount: 0, installmentScheduleId: null, notes: null });
  };

  const removeAllocation = (index: number) => {
    remove(index);
  };

  const getInstallmentOptionsForAllocation = useCallback((pledgeId: number) => {
    return [];
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="border-dashed text-white">
          <PlusCircleIcon />
          New Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            {watchedIsSplitPayment ? (
              "Record a split payment across multiple pledges"
            ) : isLoadingPledge ? (
              "Loading pledge details..."
            ) : (
              <div>
                Record a payment for pledge: {effectivePledgeDescription}
                {pledgeData?.pledge?.remainingBalance && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Remaining Balance: {effectivePledgeCurrency}{" "}
                    {pledgeData.pledge.remainingBalance.toLocaleString()}
                  </span>
                )}
                {pledgeData?.contact && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Contact: {pledgeData.contact.fullName}
                  </span>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form.getValues());
          }} className="space-y-4">
            {/* Split Payment Toggle */}
            <div className="border-b pb-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isSplitPayment"
                  checked={watchedIsSplitPayment}
                  onCheckedChange={(checked) => {
                    form.setValue("isSplitPayment", checked);
                    if (checked) {
                      form.setValue("pledgeId", null);
                      form.setValue("allocations", [{ pledgeId: 0, allocatedAmount: 0, installmentScheduleId: null, notes: null }]);
                    } else {
                      form.setValue("allocations", [{ pledgeId: initialPledgeId || 0, allocatedAmount: 0, installmentScheduleId: null, notes: null }]);
                      if (initialPledgeId) {
                        form.setValue("pledgeId", initialPledgeId);
                        const initialPledge = pledgesData?.pledges?.find(p => p.id === initialPledgeId);
                        if (initialPledge) {
                          const balance = parseFloat(initialPledge.balance);
                          form.setValue("amount", balance);
                          form.setValue("allocations.0.allocatedAmount", balance);
                          form.setValue("currency", initialPledge.currency as typeof supportedCurrencies[number]);
                        }
                      }
                    }
                  }}
                />
                <label htmlFor="isSplitPayment" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Split Payment Across Multiple Pledges
                </label>
              </div>
            </div>

            {(!watchedIsSplitPayment && showPledgeSelector) && (
              <FormField
                control={form.control}
                name="pledgeId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Select Pledge</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn("w-full justify-between", (!field.value || field.value === 0) && "text-muted-foreground")}
                            disabled={isLoadingPledges}
                          >
                            {field.value
                              ? pledgeOptions.find(
                                (pledge: any) => pledge.value === field.value
                              )?.label
                              : isLoadingPledges
                                ? "Loading pledges..."
                                : "Select pledge"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search pledges..."
                            className="h-9"
                          />
                          <CommandList>
                            <CommandEmpty>No pledge found.</CommandEmpty>
                            <CommandGroup>
                              {pledgeOptions.map((pledge: any) => (
                                <CommandItem
                                  value={pledge.label}
                                  key={pledge.value}
                                  onSelect={() => {
                                    field.onChange(pledge.value);
                                    form.setValue("allocations.0.pledgeId", pledge.value);
                                    form.setValue("allocations.0.allocatedAmount", parseFloat(pledge.balance));
                                    form.setValue("amount", parseFloat(pledge.balance));
                                    form.setValue("currency", pledge.currency as typeof supportedCurrencies[number]);
                                  }}
                                >
                                  {pledge.label}
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
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
                  </FormItem>
                )}
              />
            )}

            {/* Main Payment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseFloat(value) : 0);
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supportedCurrencies.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Rate (1 {watchedCurrency} = {field.value} USD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.0001" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amountUsd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount in USD</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} disabled />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receivedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="methodDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method Detail</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "__NONE_SELECTED__" ? null : value)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a method detail" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__NONE_SELECTED__">None</SelectItem>
                        {methodDetails.map((detail) => (
                          <SelectItem key={detail.value} value={detail.value}>
                            {detail.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {paymentStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receiptNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Number</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receiptType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Type</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "__NONE_SELECTED__" ? null : value)}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select receipt type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__NONE_SELECTED__">None</SelectItem>
                        {receiptTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="receiptIssued"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-2">
                    <div className="space-y-0.5">
                      <FormLabel>Receipt Issued</FormLabel>
                      <DialogDescription>
                        Mark if a receipt has been issued for this payment.
                      </DialogDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSolicitorSection(!showSolicitorSection)}
                className="flex items-center gap-2"
              >
                <PlusCircleIcon className="h-4 w-4" />
                {showSolicitorSection ? "Hide Solicitor Info" : "Add Solicitor Info"}
              </Button>
            </div>

            {showSolicitorSection && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-gray-50">
                <FormField
                  control={form.control}
                  name="solicitorId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Solicitor</FormLabel>
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
                              disabled={isLoadingSolicitors}
                            >
                              {field.value
                                ? solicitorOptions.find(
                                  (solicitor: any) => solicitor.value === field.value
                                )?.label
                                : isLoadingSolicitors
                                  ? "Loading solicitors..."
                                  : "Select solicitor"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput
                              placeholder="Search solicitors..."
                              className="h-9"
                            />
                            <CommandList>
                              <CommandEmpty>No solicitor found.</CommandEmpty>
                              <CommandGroup>
                                {solicitorOptions.map((solicitor: any) => (
                                  <CommandItem
                                    value={solicitor.label}
                                    key={solicitor.value}
                                    onSelect={() => {
                                      field.onChange(solicitor.value);
                                      if (solicitor.commissionRate != null) {
                                        form.setValue("bonusPercentage", solicitor.commissionRate);
                                      }
                                    }}
                                  >
                                    {solicitor.label}
                                    <Check
                                      className={cn(
                                        "ml-auto h-4 w-4",
                                        solicitor.value === field.value
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
                <FormField
                  control={form.control}
                  name="bonusPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonus Percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : parseFloat(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bonusAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonus Amount</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} disabled value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bonusRuleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonus Rule ID</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? null : parseInt(value, 10));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Split Payment Section */}
            {watchedIsSplitPayment && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-blue-900">Payment Allocations</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAllocation}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Allocation
                  </Button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-700">
                    Total Payment Amount: <span className="font-semibold">{watchedCurrency} {watchedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                  <p className="text-sm text-gray-700">
                    Total Allocated: <span className="font-semibold">{watchedCurrency} {totalAllocatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </p>
                  <p className={cn("text-sm font-semibold", remainingToAllocate < 0 ? "text-red-600" : "text-green-600")}>
                    Remaining to Allocate: {watchedCurrency} {remainingToAllocate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Allocation Items */}
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 bg-white shadow-sm relative">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="font-medium text-sm text-gray-800">Allocation {index + 1}</h5>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAllocation(index)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Grid layout for fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Pledge Selection */}
                        <div className="space-y-2">
                          <FormField
                            control={form.control}
                            name={`allocations.${index}.pledgeId`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Pledge *</FormLabel>
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
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[400px] p-0">
                                    <Command>
                                      <CommandInput placeholder="Search pledges..." className="h-9" />
                                      <CommandList>
                                        <CommandEmpty>No pledge found.</CommandEmpty>
                                        <CommandGroup>
                                          {pledgeOptions.map((pledge) => (
                                            <CommandItem
                                              value={pledge.label}
                                              key={pledge.value}
                                              onSelect={() => {
                                                field.onChange(pledge.value);
                                                form.setValue(`allocations.${index}.installmentScheduleId`, null);
                                              }}
                                            >
                                              {pledge.label}
                                              <Check
                                                className={cn(
                                                  "ml-auto h-4 w-4",
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
                                <FormMessage className="text-xs text-red-500" />
                                {field.value && getPledgeById(field.value) && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Pledge Balance: {getPledgeById(field.value)?.currency}{" "}
                                    {parseFloat(getPledgeById(field.value)?.balance || "").toLocaleString()}
                                  </p>
                                )}
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Allocated Amount */}
                        <div className="space-y-2">
                          <FormField
                            control={form.control}
                            name={`allocations.${index}.allocatedAmount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Allocated Amount *</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    {...field}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      field.onChange(value ? parseFloat(value) : 0);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage className="text-xs text-red-500" />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      {/* Allocation Notes */}
                      <div className="mt-4 space-y-2">
                        <FormField
                          control={form.control}
                          name={`allocations.${index}.notes`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Allocation Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  value={field.value || ""}
                                  rows={2}
                                  className="resize-none"
                                />
                              </FormControl>
                              <FormMessage className="text-xs text-red-500" />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPaymentMutation.isPending || isLoadingRates || isLoadingSolicitors || isLoadingPledges}>
                {createPaymentMutation.isPending ? "Creating Payment..." : "Record Payment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}