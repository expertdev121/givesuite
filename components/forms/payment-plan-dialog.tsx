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
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useCreatePaymentPlanMutation,
  usePledgeDetailsQuery,
} from "@/lib/query/payment-plans/usePaymenetPlanQuery";
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

const frequencies = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "biannual", label: "Biannual" },
  { value: "annual", label: "Annual" },
  { value: "one_time", label: "One Time" },
  { value: "custom", label: "Custom" },
] as const;

const paymentPlanSchema = z.object({
  pledgeId: z.number().positive(),
  planName: z.string().optional(),
  frequency: z.enum([
    "weekly",
    "monthly",
    "quarterly",
    "biannual",
    "annual",
    "one_time",
    "custom",
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
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
});

type PaymentPlanFormData = z.infer<typeof paymentPlanSchema>;

interface PaymentPlanDialogProps {
  pledgeId?: number;
  contactId?: number;
  pledgeAmount?: number;
  pledgeCurrency?: string;
  pledgeDescription?: string;
  remainingBalance?: number;
  showPledgeSelector?: boolean;
}

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

export default function PaymentPlanDialog(props: PaymentPlanDialogProps) {
  const {
    pledgeId: initialPledgeId,
    contactId,
    pledgeAmount,
    pledgeCurrency,
    pledgeDescription,
    remainingBalance,
    showPledgeSelector = false,
  } = props;

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
  const effectiveRemainingBalance =
    remainingBalance ||
    (pledgeData?.pledge.remainingBalance ?? effectivePledgeAmount);

  const createPaymentPlanMutation = useCreatePaymentPlanMutation();

  const defaultAmount = effectiveRemainingBalance || effectivePledgeAmount;

  const form = useForm({
    resolver: zodResolver(paymentPlanSchema),
    defaultValues: {
      pledgeId: selectedPledgeId || 0,
      planName: "",
      frequency: "monthly",
      totalPlannedAmount: defaultAmount,
      currency: effectivePledgeCurrency as any,
      installmentAmount: 0,
      numberOfInstallments: 12,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      nextPaymentDate: "",
      autoRenew: false,
      notes: "",
      internalNotes: "",
    },
  });

  const watchedFrequency = form.watch("frequency");
  const watchedStartDate = form.watch("startDate");
  const watchedNumberOfInstallments = form.watch("numberOfInstallments");
  const watchedTotalPlannedAmount = form.watch("totalPlannedAmount");

  // Update form when selectedPledgeId changes
  useEffect(() => {
    if (selectedPledgeId) {
      form.setValue("pledgeId", selectedPledgeId);
    }
  }, [selectedPledgeId, form]);

  // Update form values when pledge data changes
  useEffect(() => {
    if (pledgeData?.pledge) {
      const newDefaultAmount =
        pledgeData.pledge.remainingBalance || pledgeData.pledge.originalAmount;
      form.setValue("totalPlannedAmount", newDefaultAmount);
      form.setValue("currency", pledgeData.pledge.currency as any);
    }
  }, [pledgeData, form]);

  useEffect(() => {
    const totalAmount = watchedTotalPlannedAmount;
    const installments = watchedNumberOfInstallments;

    if (totalAmount && installments > 0) {
      const installmentAmount = totalAmount / installments;
      form.setValue(
        "installmentAmount",
        Math.round(installmentAmount * 100) / 100
      );
    }
  }, [watchedTotalPlannedAmount, watchedNumberOfInstallments, form]);

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

  const resetForm = () => {
    const newDefaultAmount = effectiveRemainingBalance || effectivePledgeAmount;
    form.reset({
      pledgeId: selectedPledgeId || 0,
      planName: "",
      frequency: "monthly",
      totalPlannedAmount: newDefaultAmount,
      currency: effectivePledgeCurrency as any,
      installmentAmount: 0,
      numberOfInstallments: 12,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      nextPaymentDate: "",
      autoRenew: false,
      notes: "",
      internalNotes: "",
    });
  };

  const onSubmit = async (data: PaymentPlanFormData) => {
    try {
      await createPaymentPlanMutation.mutateAsync(data);
      resetForm();
      setOpen(false);
    } catch (error) {
      console.error("Error creating payment plan:", error);
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
    pledgesData?.pledges?.map((pledge) => ({
      label: `#${pledge.id} - ${pledge.description || "No description"} (${
        pledge.currency
      } ${parseFloat(pledge.balance).toLocaleString()})`,
      value: pledge.id,
      balance: parseFloat(pledge.balance),
      currency: pledge.currency,
      description: pledge.description,
    })) || [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-dashed">
          <CalendarIcon className="w-4 h-4 mr-2" />
          Create Payment Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
          <DialogDescription>
            {isLoadingPledge ? (
              "Loading pledge details..."
            ) : (
              <div>
                Set up a payment plan for pledge: {effectivePledgeDescription}
                {effectiveRemainingBalance && (
                  <span className="block mt-1 text-sm text-muted-foreground">
                    Remaining Balance: {effectivePledgeCurrency}{" "}
                    {effectiveRemainingBalance.toLocaleString()}
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
              name="planName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Monthly Payment Plan"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value) : 1);
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
                    <FormLabel>Installment Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        readOnly
                        className="bg-gray-50"
                        value={field.value || 0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
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
                      checked={field.value}
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
                  {form.watch("totalPlannedAmount")?.toLocaleString()}
                </div>
                <div>Installments: {form.watch("numberOfInstallments")}</div>
                <div>
                  Per Payment: {form.watch("currency")}{" "}
                  {form.watch("installmentAmount")?.toLocaleString()}
                </div>
                <div>
                  Frequency:{" "}
                  {
                    frequencies.find((f) => f.value === form.watch("frequency"))
                      ?.label
                  }
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={createPaymentPlanMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit(onSubmit)}
                disabled={
                  createPaymentPlanMutation.isPending ||
                  isLoadingPledge ||
                  !selectedPledgeId ||
                  (showPledgeSelector && isLoadingPledges)
                }
                className="text-white"
              >
                {createPaymentPlanMutation.isPending
                  ? "Creating..."
                  : "Create Payment Plan"}
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
