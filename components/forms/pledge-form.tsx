/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useExchangeRates } from "@/lib/query/useExchangeRates";

const mockCategories = [
  { id: 1, name: "General Donation" },
  { id: 2, name: "Building Fund" },
  { id: 3, name: "Scholarship Fund" },
  { id: 4, name: "Program Support" },
];

const mockItemsByCategory = {
  1: ["Monthly Support", "Annual Campaign", "Emergency Fund"],
  2: ["New Wing Construction", "Renovation Project", "Equipment Purchase"],
  3: ["Student Scholarships", "Merit Awards", "Need-Based Aid"],
  4: ["Program Materials", "Staff Support", "Activity Funding"],
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

const pledgeSchema = z.object({
  contactId: z.number().positive(),
  categoryId: z.number().positive().optional(),
  itemDescription: z.string().min(1, "Item description is required"),
  pledgeDate: z.string().min(1, "Pledge date is required"),
  currency: z.enum(supportedCurrencies).default("USD"),
  originalAmount: z.number().positive("Original amount must be positive"),
  originalAmountUsd: z
    .number()
    .positive("Original amount in USD must be positive"),
  exchangeRate: z.number().positive("Exchange rate must be positive"),
  notes: z.string().optional(),
});

type PledgeFormData = z.infer<typeof pledgeSchema>;

interface PledgeDialogProps {
  contactId: number;
  onPledgeCreated?: (pledgeId: number) => void;
  onPledgeCreatedAndPay?: (pledgeId: number) => void;
}

export default function PledgeDialog({
  contactId,
  onPledgeCreated,
  onPledgeCreatedAndPay,
}: PledgeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [availableItems, setAvailableItems] = useState<string[]>([]);

  // Use the exchange rates hook
  const {
    data: exchangeRatesData,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useExchangeRates();

  const form = useForm({
    resolver: zodResolver(pledgeSchema),
    defaultValues: {
      contactId,
      currency: "USD",
      exchangeRate: 1,
      originalAmountUsd: 0,
      itemDescription: "",
      pledgeDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const watchedCurrency = form.watch("currency");
  const watchedOriginalAmount = form.watch("originalAmount");
  const watchedPledgeDate = form.watch("pledgeDate");

  useEffect(() => {
    if (
      watchedCurrency &&
      watchedPledgeDate &&
      exchangeRatesData?.data?.rates
    ) {
      const rate =
        parseFloat(exchangeRatesData.data.rates[watchedCurrency]) || 1;
      form.setValue("exchangeRate", rate);
    }
  }, [watchedCurrency, watchedPledgeDate, exchangeRatesData, form]);

  useEffect(() => {
    const exchangeRate = form.getValues("exchangeRate");
    if (watchedOriginalAmount && exchangeRate) {
      const usdAmount = watchedOriginalAmount / exchangeRate;
      form.setValue("originalAmountUsd", Math.round(usdAmount * 100) / 100);
    }
  }, [watchedOriginalAmount, form.watch("exchangeRate"), form]);

  useEffect(() => {
    if (selectedCategory) {
      const items =
        mockItemsByCategory[
          selectedCategory as keyof typeof mockItemsByCategory
        ] || [];
      setAvailableItems(items);
      form.setValue("itemDescription", "");
    } else {
      setAvailableItems([]);
    }
  }, [selectedCategory, form]);

  const handleCategoryChange = (categoryId: string) => {
    const id = parseInt(categoryId);
    setSelectedCategory(id);
    form.setValue("categoryId", id);
  };

  const onSubmit = async (data: PledgeFormData, shouldOpenPayment = false) => {
    try {
      console.log("Submitting pledge:", data);
      const mockPledgeId = Math.floor(Math.random() * 1000) + 1;
      form.reset({
        contactId,
        currency: "USD",
        exchangeRate: 1,
        originalAmountUsd: 0,
        itemDescription: "",
        pledgeDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setSelectedCategory(null);
      setOpen(false);
      if (shouldOpenPayment && onPledgeCreatedAndPay) {
        onPledgeCreatedAndPay(mockPledgeId);
      } else if (onPledgeCreated) {
        onPledgeCreated(mockPledgeId);
      }
    } catch (error) {
      console.error("Error submitting pledge:", error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset({
        contactId,
        currency: "USD",
        exchangeRate: 1,
        originalAmountUsd: 0,
        itemDescription: "",
        pledgeDate: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setSelectedCategory(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="border-dashed text-white"
          aria-label="Create Pledge"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Pledge
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Pledge</DialogTitle>
          <DialogDescription>
            Add a new pledge for contact ID {contactId}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <div className="space-y-4">
            {/* Category Selection */}
            <div>
              <label className="text-sm font-medium">Category</label>
              <Select onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {mockCategories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Item Description */}
            <FormField
              control={form.control}
              name="itemDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Description *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={!selectedCategory}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            selectedCategory
                              ? "Select an item description"
                              : "Please select a category first"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableItems.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pledge Date */}
            <FormField
              control={form.control}
              name="pledgeDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pledge Date *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
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

            {/* Original Amount */}
            <FormField
              control={form.control}
              name="originalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pledge Amount ({watchedCurrency}) *</FormLabel>
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

            {/* Original Amount USD (Read-only) */}
            <FormField
              control={form.control}
              name="originalAmountUsd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pledge Amount (USD)</FormLabel>
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
                      placeholder="Additional notes about this pledge"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit((data) => onSubmit(data, false))}
                disabled={form.formState.isSubmitting || isLoadingRates}
              >
                {form.formState.isSubmitting ? "Creating..." : "Create Pledge"}
              </Button>
              <Button
                type="button"
                onClick={form.handleSubmit((data) => onSubmit(data, true))}
                disabled={form.formState.isSubmitting || isLoadingRates}
                className="bg-green-600 hover:bg-green-700"
              >
                {form.formState.isSubmitting
                  ? "Creating..."
                  : "Create Pledge + Pay"}
              </Button>
            </div>
          </div>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
