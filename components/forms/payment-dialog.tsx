/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line react-hooks/exhaustive-deps
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { useExchangeRates } from "@/lib/query/useExchangeRates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreatePaymentMutation } from "@/lib/query/payments/usePaymentQuery";
import { usePledgeDetailsQuery } from "@/lib/query/payment-plans/usePaymentPlanQuery";
import { PlusCircleIcon } from "lucide-react";
import { usePledgesQuery } from "@/lib/query/usePledgeData";
import useContactId from "@/hooks/use-contact-id";

interface SolicitorsParams {
  search?: string;
  status?: "active" | "inactive" | "suspended";
}

const useSolicitors = (params: SolicitorsParams = {}) => {
  return useQuery({
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
  { value: "credit_card", label: "Credit Card" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "paypal", label: "PayPal" },
  { value: "wire_transfer", label: "Wire Transfer" },
  { value: "other", label: "Other" },
] as const;

const receiptTypes = [
  { value: "invoice", label: "Invoice" },
  { value: "confirmation", label: "Confirmation" },
  { value: "receipt", label: "Receipt" },
  { value: "other", label: "Other" },
] as const;

const paymentStatuses = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "processing", label: "Processing" },
] as const;

// Schema with solicitor fields
const paymentSchema = z.object({
  pledgeId: z.number().positive(),
  amount: z.number().positive("Payment amount must be positive"),
  currency: z.enum(supportedCurrencies).default("USD"),
  amountUsd: z.number().positive("Payment amount in USD must be positive"),
  exchangeRate: z.number().positive("Exchange rate must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  receivedDate: z.string().optional(),
  paymentMethod: z.enum([
    "credit_card",
    "cash",
    "check",
    "bank_transfer",
    "paypal",
    "wire_transfer",
    "other",
  ]),
  methodDetail: z.string(),
  paymentStatus: z
    .enum([
      "pending",
      "completed",
      "failed",
      "cancelled",
      "refunded",
      "processing",
    ])
    .default("completed"),
  referenceNumber: z.string().optional(),
  checkNumber: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptType: z
    .enum(["invoice", "confirmation", "receipt", "other"])
    .optional(),
  receiptIssued: z.boolean().default(false),
  // Solicitor fields
  solicitorId: z.number().positive().optional(),
  bonusPercentage: z.number().min(0).max(100).optional(),
  bonusAmount: z.number().min(0).optional(),
  bonusRuleId: z.number().positive().optional(),
  notes: z.string().optional(),
  paymentPlanId: z.number().positive().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface PaymentDialogProps {
  pledgeId?: number;
  contactId?: number;
  pledgeAmount?: number;
  pledgeCurrency?: string;
  pledgeDescription?: string;
  showPledgeSelector?: boolean;
}

export default function PaymentFormDialog({
  pledgeId: initialPledgeId,
  pledgeAmount,
  pledgeCurrency,
  pledgeDescription,
  showPledgeSelector = false,
}: PaymentDialogProps) {
  // Queries
  const {
    data: exchangeRatesData,
    isLoading: isLoadingRates,
    error: ratesError,
    refetch: refetchRates,
  } = useExchangeRates();
  const { data: solicitorsData, isLoading: isLoadingSolicitors } =
    useSolicitors({ status: "active" });
  const createPaymentMutation = useCreatePaymentMutation();

  // State
  const [open, setOpen] = useState(false);
  const [selectedPledgeId, setSelectedPledgeId] = useState<number | undefined>(
    initialPledgeId
  );
  const [showSolicitorSection, setShowSolicitorSection] = useState(false);

  const contactId = useContactId();
  const { data: pledgesData, isLoading: isLoadingPledges } = usePledgesQuery({
    contactId: contactId as number,
    page: 1,
    limit: 100,
    status: undefined,
  });
  const { data: pledgeData, isLoading: isLoadingPledge } =
    usePledgeDetailsQuery(selectedPledgeId!);

  // Derived values
  const effectivePledgeAmount =
    pledgeAmount || (pledgeData?.pledge.originalAmount ?? 0);
  const effectivePledgeCurrency =
    pledgeCurrency || (pledgeData?.pledge.currency ?? "USD");
  const effectivePledgeDescription =
    pledgeDescription ||
    (pledgeData?.pledge.description ?? `Pledge #${selectedPledgeId}`);

  // Helper function to get exchange rate with fallback
  const getExchangeRate = (currency: string): number => {
    if (currency === "USD") return 1;

    if (exchangeRatesData?.data?.rates) {
      const rate = parseFloat(exchangeRatesData.data.rates[currency]);
      return isNaN(rate) ? 1 : rate;
    }

    return 1; // Fallback to 1 if rates not available
  };

  // Form setup
  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      pledgeId: selectedPledgeId || 0,
      currency: (effectivePledgeCurrency as any) || "USD",
      exchangeRate: 1,
      amountUsd: 0,
      amount: effectivePledgeAmount || 0,
      paymentDate: new Date().toISOString().split("T")[0],
      receivedDate: "",
      paymentMethod: "cash" as const,
      paymentStatus: "completed" as const,
      referenceNumber: "",
      checkNumber: "",
      receiptNumber: "",
      receiptType: undefined,
      receiptIssued: false,
      solicitorId: undefined,
      bonusPercentage: undefined,
      bonusAmount: undefined,
      bonusRuleId: undefined,
      notes: "",
      paymentPlanId: undefined,
    },
  });

  // Watch values
  const watchedCurrency = form.watch("currency");
  const watchedAmount = form.watch("amount");
  const watchedPaymentDate = form.watch("paymentDate");
  const watchedPaymentMethod = form.watch("paymentMethod");
  const watchedSolicitorId = form.watch("solicitorId");
  const watchedBonusPercentage = form.watch("bonusPercentage");

  // Effects
  useEffect(() => {
    if (selectedPledgeId) {
      form.setValue("pledgeId", selectedPledgeId);
    }
  }, [selectedPledgeId, form]);

  useEffect(() => {
    if (pledgeData?.pledge) {
      const newCurrency = pledgeData.pledge.currency as any;
      form.setValue("currency", newCurrency);

      const suggestedAmount =
        pledgeData.pledge.remainingBalance || pledgeData.pledge.originalAmount;
      form.setValue("amount", suggestedAmount);

      // Immediately update exchange rate if rates are available
      if (exchangeRatesData?.data?.rates && newCurrency) {
        const rate = getExchangeRate(newCurrency);
        form.setValue("exchangeRate", rate);
      }
    }
  }, [pledgeData, form, exchangeRatesData]);

  // Fixed exchange rate effect - handles currency and date changes
  useEffect(() => {
    const updateExchangeRate = () => {
      const currency = form.getValues("currency");
      const paymentDate = form.getValues("paymentDate");

      if (currency && paymentDate) {
        const rate = getExchangeRate(currency);
        const currentRate = form.getValues("exchangeRate");

        // Only update if the rate has actually changed to avoid unnecessary re-renders
        if (currentRate !== rate) {
          form.setValue("exchangeRate", rate);
        }
      }
    };

    updateExchangeRate();
  }, [watchedCurrency, watchedPaymentDate, exchangeRatesData, form]);

  // Additional effect to handle initial loading and ensure exchange rate is set
  useEffect(() => {
    // This ensures exchange rate is set when exchange rates data becomes available
    // even if currency was already set
    if (exchangeRatesData?.data?.rates && !isLoadingRates) {
      const currency = form.getValues("currency");
      if (currency) {
        const rate = getExchangeRate(currency);
        const currentRate = form.getValues("exchangeRate");

        if (currentRate !== rate) {
          form.setValue("exchangeRate", rate);
        }
      }
    }
  }, [exchangeRatesData, isLoadingRates, form]);

  useEffect(() => {
    const exchangeRate = form.getValues("exchangeRate");
    if (watchedAmount && exchangeRate) {
      const usdAmount = watchedAmount * exchangeRate;
      form.setValue("amountUsd", Math.round(usdAmount * 100) / 100);
    }
  }, [watchedAmount, form.watch("exchangeRate"), form]);

  useEffect(() => {
    if (watchedBonusPercentage && watchedAmount) {
      const bonusAmount = (watchedAmount * watchedBonusPercentage) / 100;
      form.setValue("bonusAmount", Math.round(bonusAmount * 100) / 100);
    }
  }, [watchedBonusPercentage, watchedAmount, form]);

  // Handlers
  const resetForm = () => {
    form.reset({
      pledgeId: selectedPledgeId || 0,
      currency: (effectivePledgeCurrency as any) || "USD",
      exchangeRate: 1,
      amountUsd: 0,
      amount: effectivePledgeAmount || 0,
      paymentDate: new Date().toISOString().split("T")[0],
      receivedDate: "",
      paymentMethod: "cash" as const,
      paymentStatus: "completed" as const,
      referenceNumber: "",
      checkNumber: "",
      receiptNumber: "",
      receiptType: undefined,
      receiptIssued: false,
      solicitorId: undefined,
      bonusPercentage: undefined,
      bonusAmount: undefined,
      bonusRuleId: undefined,
      notes: "",
      paymentPlanId: undefined,
    });
    setShowSolicitorSection(false);
  };

  const retryExchangeRates = () => {
    if (refetchRates) {
      refetchRates();
    }
  };

  const convertToPledgeCurrency = (
    amount: number,
    inputCurrency: string,
    pledgeCurrency: string,
    exchangeRates: Record<string, string> | undefined
  ): number => {
    if (!supportedCurrencies.includes(pledgeCurrency as any)) {
      throw new Error(`Unsupported pledge currency: ${pledgeCurrency}`);
    }

    if (inputCurrency === pledgeCurrency || !exchangeRates) {
      return Math.round(amount * 100) / 100; // No conversion needed, round to 2 decimals
    }

    const inputToUsdRate = parseFloat(exchangeRates[inputCurrency] || "1");
    const usdToPledgeRate = parseFloat(exchangeRates[pledgeCurrency] || "1");

    if (isNaN(inputToUsdRate) || isNaN(usdToPledgeRate)) {
      throw new Error(
        `Invalid exchange rates for ${inputCurrency} or ${pledgeCurrency}`
      );
    }

    const usdAmount = amount * inputToUsdRate;
    const convertedAmount = usdAmount / usdToPledgeRate;
    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      const pledgeCurrency = effectivePledgeCurrency || "USD";

      if (!supportedCurrencies.includes(pledgeCurrency as any)) {
        toast.error(`Unsupported pledge currency: ${pledgeCurrency}`);
        return;
      }

      const convertedAmount = convertToPledgeCurrency(
        data.amount,
        data.currency,
        pledgeCurrency,
        exchangeRatesData?.data?.rates
      );

      if (convertedAmount <= 0) {
        toast.error("Converted amount must be positive");
        return;
      }

      const payload = {
        ...data,
        amountUsd: data.amountUsd,
        amountInPledgeCurrency: convertedAmount,
      };

      await createPaymentMutation.mutateAsync(payload);
      toast.success("Payment created successfully!");
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create payment"
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  // Format options
  const pledgeOptions =
    pledgesData?.pledges?.map((pledge: any) => ({
      label: `#${pledge.id} - ${pledge.description || "No description"} (${
        pledge.currency
      } ${parseFloat(pledge.balance).toLocaleString()})`,
      value: pledge.id,
      balance: parseFloat(pledge.balance),
      currency: pledge.currency,
      description: pledge.description,
      originalAmount: parseFloat(pledge.originalAmount),
    })) || [];

  const solicitorOptions =
    solicitorsData?.solicitors?.map((solicitor: any) => ({
      label: `${solicitor.firstName} ${solicitor.lastName}${
        solicitor.id ? ` (${solicitor.id})` : ""
      }`,
      value: solicitor.id,
      commissionRate: solicitor.commissionRate,
      contact: solicitor.contact,
    })) || [];

  console.log(solicitorsData);
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="border-dashed text-white">
          <PlusCircleIcon />
          New Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Payment</DialogTitle>
          <DialogDescription>
            {isLoadingPledge ? (
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
          <div className="space-y-4">
            {showPledgeSelector && (
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
                                  (pledge: any) => pledge.value === field.value
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
                              {pledgeOptions.map((pledge: any) => (
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

            {/* Amount and Currency Row */}
            <div className="grid grid-cols-2 gap-4">
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
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Immediately update exchange rate when currency changes
                        const rate = getExchangeRate(value);
                        form.setValue("exchangeRate", rate);
                      }}
                      defaultValue={field.value}
                      disabled={isLoadingRates}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              isLoadingRates
                                ? "Loading currencies..."
                                : "Select currency"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {supportedCurrencies.map((curr) => (
                          <SelectItem key={curr} value={curr}>
                            {curr}{" "}
                            {isLoadingRates && curr !== "USD"
                              ? "(Loading rate...)"
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ratesError && (
                      <FormMessage>Error loading exchange rates</FormMessage>
                    )}
                    {watchedCurrency && watchedCurrency !== "USD" && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {isLoadingRates ? (
                          <span className="text-blue-600">
                            Loading exchange rate...
                          </span>
                        ) : ratesError ? (
                          <span className="text-red-600">
                            Failed to load exchange rate. Using rate:{" "}
                            {form.watch("exchangeRate")}
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={retryExchangeRates}
                              className="p-0 h-auto ml-2"
                            >
                              Retry
                            </Button>
                          </span>
                        ) : (
                          <span className="text-green-600">
                            Exchange rate loaded: 1 {watchedCurrency} ={" "}
                            {form.watch("exchangeRate")} USD
                          </span>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Exchange Rate and USD Amount Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="exchangeRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exchange Rate (to USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        {...field}
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
                name="amountUsd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount (USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        readOnly
                        className="bg-gray-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Date and Received Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
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
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Payment Method and Status Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Status *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reference Numbers Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="methodDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method Detail</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Method Detail" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedPaymentMethod === "check" ? (
                <FormField
                  control={form.control}
                  name="checkNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Check Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Check number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <FormField
                  control={form.control}
                  name="receiptNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Receipt Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Receipt number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Receipt Type and Receipt Issued Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="receiptType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Receipt Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select receipt type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {receiptTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
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
                name="receiptIssued"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2 pt-6">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Receipt Issued</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">
                  Add Solicitor Commission
                </label>
                <Switch
                  checked={showSolicitorSection}
                  onCheckedChange={(checked) => {
                    setShowSolicitorSection(checked);
                    if (!checked) {
                      form.setValue("solicitorId", undefined);
                      form.setValue("bonusPercentage", undefined);
                      form.setValue("bonusAmount", undefined);
                      form.setValue("bonusRuleId", undefined);
                    }
                  }}
                />
              </div>
            </div>
            {showSolicitorSection && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900">
                  Solicitor Commission Details
                </h4>
                <FormField
                  control={form.control}
                  name="solicitorId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Select Solicitor</FormLabel>
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
                                    (solicitor: any) =>
                                      solicitor.value === field.value
                                  )?.label
                                : isLoadingSolicitors
                                ? "Loading solicitors..."
                                : "Select solicitor"}
                              <ChevronsUpDown className="opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
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
                                      form.setValue(
                                        "solicitorId",
                                        solicitor.value
                                      );
                                      if (solicitor.commissionRate) {
                                        form.setValue(
                                          "bonusPercentage",
                                          parseFloat(solicitor.commissionRate)
                                        );
                                      }
                                    }}
                                  >
                                    {solicitor.label}
                                    <Check
                                      className={cn(
                                        "ml-auto",
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="bonusPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission Percentage (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value ? parseFloat(value) : undefined
                              );
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
                        <FormLabel>
                          Commission Amount ({watchedCurrency})
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
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
                  name="bonusRuleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonus Rule ID (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value ? parseInt(value) : undefined);
                          }}
                          placeholder="Reference to specific bonus rule"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedSolicitorId && watchedBonusPercentage && (
                  <div className="bg-blue-100 border border-blue-300 rounded p-3 mt-4">
                    <h5 className="font-medium text-blue-900 mb-2">
                      Commission Summary
                    </h5>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>
                        Solicitor:{" "}
                        {
                          solicitorOptions.find(
                            (s: { value: number }) =>
                              s.value === watchedSolicitorId
                          )?.label
                        }
                      </div>
                      <div>Commission Rate: {watchedBonusPercentage}%</div>
                      <div>
                        Commission Amount: {watchedCurrency}{" "}
                        {form.watch("bonusAmount")?.toLocaleString() || "0"}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional notes about this payment"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Summary */}
            {selectedPledgeId && pledgeData?.pledge && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                <h4 className="font-medium text-green-900 mb-2">
                  Payment Summary
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-green-800">
                  <div>
                    Payment Amount: {form.watch("currency")}{" "}
                    {form.watch("amount")?.toLocaleString()}
                  </div>
                  <div>
                    Amount (USD): ${form.watch("amountUsd")?.toLocaleString()}
                  </div>
                  <div>
                    Current Balance: {pledgeData.pledge.currency}{" "}
                    {pledgeData.pledge.remainingBalance?.toLocaleString()}
                  </div>
                  <div>
                    Payment Method:{" "}
                    {
                      paymentMethods.find(
                        (m) => m.value === form.watch("paymentMethod")
                      )?.label
                    }
                  </div>
                  <div>
                    Status:{" "}
                    {
                      paymentStatuses.find(
                        (s) => s.value === form.watch("paymentStatus")
                      )?.label
                    }
                  </div>
                  {showSolicitorSection && watchedSolicitorId && (
                    <div>
                      Commission: {form.watch("currency")}{" "}
                      {form.watch("bonusAmount")?.toLocaleString() || "0"}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={
                  createPaymentMutation.isPending ||
                  isLoadingRates ||
                  !selectedPledgeId ||
                  (showPledgeSelector && isLoadingPledges) ||
                  (showSolicitorSection && isLoadingSolicitors)
                }
                className="bg-green-600 hover:bg-green-700"
              >
                {createPaymentMutation.isPending
                  ? "Creating..."
                  : "Record Payment"}
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
