/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { useExchangeRates } from "@/lib/query/useExchangeRates";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCreatePaymentMutation } from "@/lib/query/payments/usePaymentQuery";
import { usePledgeDetailsQuery } from "@/lib/query/payment-plans/usePaymentPlanQuery";
import { usePledgesQuery } from "@/lib/query/usePledgeData";

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

const paymentSchema = z.object({
  pledgeId: z.number().positive(),
  amount: z.number().positive("Payment amount must be positive"),
  currency: z.enum(supportedCurrencies).default("USD"),
  amountUsd: z.number().positive("Payment amount in USD must be positive"),
  exchangeRate: z.number().positive("Exchange rate must be positive"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum([
    "credit_card",
    "cash",
    "check",
    "bank_transfer",
    "paypal",
    "wire_transfer",
    "other",
  ]),
  referenceNumber: z.string().optional(),
  checkNumber: z.string().optional(),
  receiptNumber: z.string().optional(),
  receiptType: z
    .enum(["invoice", "confirmation", "receipt", "other"])
    .optional(),
  notes: z.string().optional(),
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

export default function EditPaymentDialog({
  pledgeId: initialPledgeId,
  contactId,
  pledgeAmount,
  pledgeCurrency,
  pledgeDescription,
  showPledgeSelector = false,
}: PaymentDialogProps) {
  const {
    data: exchangeRatesData,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useExchangeRates();

  const createPaymentMutation = useCreatePaymentMutation();
  const [open, setOpen] = useState(false);
  const [selectedPledgeId, setSelectedPledgeId] = useState<number | undefined>(
    initialPledgeId
  );

  const { data: pledgesData, isLoading: isLoadingPledges } = usePledgesQuery({
    contactId: contactId,
    page: 1,
    limit: 100,
    status: undefined,
  });

  const { data: pledgeData, isLoading: isLoadingPledge } =
    usePledgeDetailsQuery(selectedPledgeId!);

  const effectivePledgeAmount =
    pledgeAmount || (pledgeData?.pledge.originalAmount ?? 0);
  const effectivePledgeCurrency =
    pledgeCurrency || (pledgeData?.pledge.currency ?? "USD");
  const effectivePledgeDescription =
    pledgeDescription ||
    (pledgeData?.pledge.description ?? `Pledge #${selectedPledgeId}`);

  const form = useForm({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      pledgeId: selectedPledgeId || 0,
      currency: (effectivePledgeCurrency as any) || "USD",
      exchangeRate: 1,
      amountUsd: 0,
      amount: effectivePledgeAmount || 0,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash" as const,
      referenceNumber: "",
      checkNumber: "",
      receiptNumber: "",
      notes: "",
    },
  });

  const watchedCurrency = form.watch("currency");
  const watchedAmount = form.watch("amount");
  const watchedPaymentDate = form.watch("paymentDate");
  const watchedPaymentMethod = form.watch("paymentMethod");

  useEffect(() => {
    if (selectedPledgeId) {
      form.setValue("pledgeId", selectedPledgeId);
    }
  }, [selectedPledgeId, form]);

  useEffect(() => {
    if (pledgeData?.pledge) {
      form.setValue("currency", pledgeData.pledge.currency as any);
      // Optionally set the amount to remaining balance or original amount
      const suggestedAmount =
        pledgeData.pledge.remainingBalance || pledgeData.pledge.originalAmount;
      form.setValue("amount", suggestedAmount);
    }
  }, [pledgeData, form]);

  // Update exchange rate when currency or date changes
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

  // Auto-calculate USD amount when amount or exchange rate changes
  useEffect(() => {
    const exchangeRate = form.getValues("exchangeRate");
    if (watchedAmount && exchangeRate) {
      // Since exchange rates are now inverted (currency to USD conversion rates),
      // we multiply instead of divide
      const usdAmount = watchedAmount * exchangeRate;
      form.setValue("amountUsd", Math.round(usdAmount * 100) / 100);
    }
  }, [watchedAmount, form.watch("exchangeRate"), form]);

  const resetForm = () => {
    form.reset({
      pledgeId: selectedPledgeId || 0,
      currency: (effectivePledgeCurrency as any) || "USD",
      exchangeRate: 1,
      amountUsd: 0,
      amount: effectivePledgeAmount || 0,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash" as const,
      referenceNumber: "",
      checkNumber: "",
      receiptNumber: "",
      notes: "",
    });
  };

  const onSubmit = async (data: PaymentFormData) => {
    try {
      await createPaymentMutation.mutateAsync(data);

      toast.success("Payment created successfully!");

      // Reset form and close dialog
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

  // Format pledge options for the combobox
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>Edit Payment</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
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

            {/* Payment Amount */}
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
                        field.onChange(value ? parseFloat(value) : 0);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Currency */}
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
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

            {/* Exchange Rate (Read-only) */}
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

            {/* Amount USD (Read-only) */}
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

            {/* Payment Date */}
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

            {/* Payment Method */}
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

            {/* Reference Number */}
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

            {/* Check Number - only show if payment method is check */}
            {watchedPaymentMethod === "check" && (
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
            )}

            {/* Receipt Number */}
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

            {/* Receipt Type */}
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
                  (showPledgeSelector && isLoadingPledges)
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
