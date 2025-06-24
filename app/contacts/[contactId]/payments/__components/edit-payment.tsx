/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown, Edit } from "lucide-react";
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
import { useUpdatePaymentMutation } from "@/lib/query/payments/usePaymentQuery";

// Solicitors hook and types
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

// Constants
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

// Edit schema (similar to create but all fields are optional except paymentId)
const editPaymentSchema = z.object({
  paymentId: z.number().positive(),
  amount: z.number().positive("Payment amount must be positive").optional(),
  currency: z.enum(supportedCurrencies).optional(),
  amountUsd: z
    .number()
    .positive("Payment amount in USD must be positive")
    .optional(),
  exchangeRate: z
    .number()
    .positive("Exchange rate must be positive")
    .optional(),
  paymentDate: z.string().min(1, "Payment date is required").optional(),
  receivedDate: z.string().optional(),
  paymentMethod: z
    .enum([
      "credit_card",
      "cash",
      "check",
      "bank_transfer",
      "paypal",
      "wire_transfer",
      "other",
    ])
    .optional(),
  paymentStatus: z
    .enum([
      "pending",
      "completed",
      "failed",
      "cancelled",
      "refunded",
      "processing",
    ])
    .optional(),
  referenceNumber: z.string().optional(),
  checkNumber: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptType: z
    .enum(["invoice", "confirmation", "receipt", "other"])
    .optional(),
  receiptIssued: z.boolean().optional(),
  // Solicitor fields
  solicitorId: z.number().positive().optional(),
  bonusPercentage: z.number().min(0).max(100).optional(),
  bonusAmount: z.number().min(0).optional(),
  bonusRuleId: z.number().positive().optional(),
  notes: z.string().optional(),
  paymentPlanId: z.number().positive().optional(),
});

type EditPaymentFormData = z.infer<typeof editPaymentSchema>;

// Payment interface for props - matches your API response
interface Payment {
  id: number;
  pledgeId: number;
  amount: string;
  currency: string;
  amountUsd: string | null;
  exchangeRate: string | null;
  paymentDate: string;
  receivedDate: string | null;
  paymentMethod: string;
  paymentStatus: string;
  referenceNumber: string | null;
  checkNumber: string | null;
  receiptNumber: string | null;
  receiptType: string | null;
  receiptIssued: boolean;
  solicitorId: number | null;
  bonusPercentage: string | null;
  bonusAmount: string | null;
  bonusRuleId: number | null;
  notes: string | null;
  paymentPlanId: number | null;
  // Additional fields for display
  solicitorName?: string | null;
  pledgeDescription?: string | null;
}

interface EditPaymentDialogProps {
  payment: Payment;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function EditPaymentDialog({
  payment,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditPaymentDialogProps) {
  // Queries
  const {
    data: exchangeRatesData,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useExchangeRates();
  const { data: solicitorsData, isLoading: isLoadingSolicitors } =
    useSolicitors({ status: "active" });
  const updatePaymentMutation = useUpdatePaymentMutation(payment.pledgeId);

  // State
  const [internalOpen, setInternalOpen] = useState(false);
  const [showSolicitorSection, setShowSolicitorSection] = useState(
    !!payment.solicitorId
  );

  // Use controlled or internal open state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // Form setup with payment data
  const form = useForm({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      paymentId: payment.id,
      amount: parseFloat(payment.amount),
      currency: payment.currency as any,
      amountUsd: payment.amountUsd ? parseFloat(payment.amountUsd) : undefined,
      exchangeRate: payment.exchangeRate ? parseFloat(payment.exchangeRate) : 1,
      paymentDate: payment.paymentDate,
      receivedDate: payment.receivedDate || "",
      paymentMethod: payment.paymentMethod as any,
      paymentStatus: payment.paymentStatus as any,
      referenceNumber: payment.referenceNumber || "",
      checkNumber: payment.checkNumber || "",
      receiptNumber: payment.receiptNumber || "",
      receiptType: payment.receiptType as any,
      receiptIssued: payment.receiptIssued,
      solicitorId: payment.solicitorId || undefined,
      bonusPercentage: payment.bonusPercentage
        ? parseFloat(payment.bonusPercentage)
        : undefined,
      bonusAmount: payment.bonusAmount
        ? parseFloat(payment.bonusAmount)
        : undefined,
      bonusRuleId: payment.bonusRuleId || undefined,
      notes: payment.notes || "",
      paymentPlanId: payment.paymentPlanId || undefined,
    },
  });

  // Watch values
  const watchedCurrency = form.watch("currency");
  const watchedAmount = form.watch("amount");
  const watchedPaymentDate = form.watch("paymentDate");
  const watchedPaymentMethod = form.watch("paymentMethod");
  const watchedSolicitorId = form.watch("solicitorId");
  const watchedBonusPercentage = form.watch("bonusPercentage");

  // Effects - similar to create dialog but respects existing data
  useEffect(() => {
    if (
      watchedCurrency &&
      watchedPaymentDate &&
      exchangeRatesData?.data?.rates
    ) {
      const rate =
        parseFloat(exchangeRatesData.data.rates[watchedCurrency]) || 1;
      form.setValue("exchangeRate", rate);
    }
  }, [watchedCurrency, watchedPaymentDate, exchangeRatesData, form]);

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

  // Update showSolicitorSection when solicitorId changes
  useEffect(() => {
    setShowSolicitorSection(!!watchedSolicitorId);
  }, [watchedSolicitorId]);

  // Handlers
  const resetForm = () => {
    form.reset({
      paymentId: payment.id,
      amount: parseFloat(payment.amount),
      currency: payment.currency as any,
      amountUsd: payment.amountUsd ? parseFloat(payment.amountUsd) : undefined,
      exchangeRate: payment.exchangeRate ? parseFloat(payment.exchangeRate) : 1,
      paymentDate: payment.paymentDate,
      receivedDate: payment.receivedDate || "",
      paymentMethod: payment.paymentMethod as any,
      paymentStatus: payment.paymentStatus as any,
      referenceNumber: payment.referenceNumber || "",
      checkNumber: payment.checkNumber || "",
      receiptNumber: payment.receiptNumber || "",
      receiptType: payment.receiptType as any,
      receiptIssued: payment.receiptIssued,
      solicitorId: payment.solicitorId || undefined,
      bonusPercentage: payment.bonusPercentage
        ? parseFloat(payment.bonusPercentage)
        : undefined,
      bonusAmount: payment.bonusAmount
        ? parseFloat(payment.bonusAmount)
        : undefined,
      bonusRuleId: payment.bonusRuleId || undefined,
      notes: payment.notes || "",
      paymentPlanId: payment.paymentPlanId || undefined,
    });
    setShowSolicitorSection(!!payment.solicitorId);
  };

  const onSubmit = async (data: EditPaymentFormData) => {
    try {
      // Remove undefined values to only send changed fields
      const updateData = Object.fromEntries(
        Object.entries(data).filter(
          ([_, value]) => value !== undefined && value !== ""
        )
      );

      await updatePaymentMutation.mutateAsync(updateData as any);
      toast.success("Payment updated successfully!");
      setOpen(false);
    } catch (error) {
      console.error("Error updating payment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update payment"
      );
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  // Format solicitor options
  const solicitorOptions =
    solicitorsData?.solicitors?.map((solicitor: any) => ({
      label: `${solicitor.contact?.firstName} ${solicitor.contact?.lastName}${
        solicitor.solicitorCode ? ` (${solicitor.solicitorCode})` : ""
      }`,
      value: solicitor.id,
      commissionRate: solicitor.commissionRate,
      contact: solicitor.contact,
    })) || [];
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4" />
            Edit Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
          <DialogDescription>
            <div>
              Edit payment #{payment.id} for pledge{" "}
              {payment.pledgeDescription
                ? `"${payment.pledgeDescription}"`
                : `#${payment.pledgeId}`}
              <span className="block mt-1 text-sm text-muted-foreground">
                Current Amount: {payment.currency}{" "}
                {parseFloat(payment.amount).toLocaleString()}
              </span>
              {payment.solicitorName && (
                <span className="block mt-1 text-sm text-muted-foreground">
                  Solicitor: {payment.solicitorName}
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-4">
            {/* Payment ID (hidden) */}
            <input type="hidden" {...form.register("paymentId")} />

            {/* Amount and Currency Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount ({watchedCurrency}) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseFloat(value) : undefined);
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
                      onValueChange={field.onChange}
                      value={field.value}
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
                            {curr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {ratesError && (
                      <FormMessage>Error loading exchange rates</FormMessage>
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
                    <FormLabel>Payment Date *</FormLabel>
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
                    <FormLabel>Received Date</FormLabel>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Transaction reference number"
                      />
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
            {/* Solicitor Section Toggle */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Solicitor Commission
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

            {/* Solicitor Fields - Conditional */}
            {showSolicitorSection && (
              <div className="space-y-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900">
                  Solicitor Commission Details
                </h4>

                {/* Solicitor Selection */}
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
                                  )?.label || "Select solicitor"
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
                                      if (
                                        solicitor.commissionRate &&
                                        !form.getValues("bonusPercentage")
                                      ) {
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

                {/* Commission Percentage and Amount */}
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

                {/* Bonus Rule ID */}
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

                {/* Commission Summary */}
                {watchedSolicitorId && watchedBonusPercentage && (
                  <div className="bg-blue-100 border border-blue-300 rounded p-3 mt-4">
                    <h5 className="font-medium text-blue-900 mb-2">
                      Commission Summary
                    </h5>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>
                        Solicitor:{" "}
                        {solicitorOptions.find(
                          (s: { value: number }) =>
                            s.value === watchedSolicitorId
                        )?.label || "Unknown"}
                      </div>
                      <div>Commission Rate: {watchedBonusPercentage}%</div>
                      <div>
                        Commission Amount: {watchedCurrency}{" "}
                        {form.watch("bonusAmount")?.toLocaleString() || "0"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Show current vs new commission if editing existing solicitor payment */}
                {payment.solicitorId && watchedSolicitorId && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <h5 className="font-medium text-yellow-900 mb-2">
                      Commission Changes
                    </h5>
                    <div className="text-sm text-yellow-800 grid grid-cols-2 gap-4">
                      <div>
                        <div className="font-medium">Current:</div>
                        <div>Rate: {payment.bonusPercentage}%</div>
                        <div>
                          Amount: {payment.currency} {payment.bonusAmount}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">New:</div>
                        <div>Rate: {watchedBonusPercentage}%</div>
                        <div>
                          Amount: {watchedCurrency}{" "}
                          {form.watch("bonusAmount")?.toLocaleString() || "0"}
                        </div>
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
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mt-6">
              <h4 className="font-medium text-orange-900 mb-2">
                Payment Update Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-orange-800">
                <div>
                  Payment Amount: {form.watch("currency")}{" "}
                  {form.watch("amount")?.toLocaleString()}
                </div>
                <div>
                  Amount (USD): ${form.watch("amountUsd")?.toLocaleString()}
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
                <div>Payment Date: {form.watch("paymentDate")}</div>
                {showSolicitorSection && watchedSolicitorId && (
                  <div>
                    Commission: {form.watch("currency")}{" "}
                    {form.watch("bonusAmount")?.toLocaleString() || "0"}
                  </div>
                )}
              </div>
            </div>

            {/* Warning for completed payments */}
            {payment.paymentStatus === "completed" && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-1">⚠️ Warning</h4>
                <p className="text-sm text-red-800">
                  This payment is marked as completed. Changes may affect
                  accounting records and pledge balances.
                  {payment.solicitorId &&
                    " Commission calculations may also be affected."}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={updatePaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={updatePaymentMutation.isPending}
              >
                Reset
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={
                  updatePaymentMutation.isPending ||
                  isLoadingRates ||
                  (showSolicitorSection && isLoadingSolicitors)
                }
                className="bg-orange-600 hover:bg-orange-700"
              >
                {updatePaymentMutation.isPending
                  ? "Updating..."
                  : "Update Payment"}
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
