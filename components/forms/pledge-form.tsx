/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Check, ChevronsUpDown, PlusCircle, Edit } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
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

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useCreatePledgeMutation,
  useCreatePledgeAndPayMutation,
  useUpdatePledgeMutation,
} from "@/lib/query/pledge/usePledgeQuery";
import PaymentDialog from "./payment-form";
import { getCategoryById, STATIC_CATEGORIES } from "@/lib/data/categories";

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
  contactId: z.number().positive("Contact ID is required"),
  categoryId: z.number().positive("Please select a category").optional(),
  description: z.string().min(1, "Description is required"),
  pledgeDate: z.string().min(1, "Pledge date is required"),
  currency: z.enum(supportedCurrencies, { 
    errorMap: () => ({ message: "Please select a valid currency" })
  }),
  originalAmount: z.number()
    .positive("Pledge amount must be greater than 0")
    .min(0.01, "Pledge amount must be at least 0.01"),
  originalAmountUsd: z.number()
    .positive("USD amount must be greater than 0")
    .min(0.01, "USD amount must be at least 0.01"),
  exchangeRate: z.number()
    .positive("Exchange rate must be greater than 0")
    .min(0.0001, "Exchange rate must be at least 0.0001"),
  exchangeRateDate: z.string().optional(),
  campaignCode: z.string().optional(),
  notes: z.string().optional(),
});

type PledgeFormData = z.infer<typeof pledgeSchema>;

// Define the pledge data structure
interface PledgeData {
  id?: number;
  contactId: number;
  categoryId?: number;
  description: string;
  pledgeDate: string;
  currency: string;
  originalAmount: number;
  originalAmountUsd: number;
  exchangeRate: number;
  campaignCode?: string;
  notes?: string;
}

interface PledgeDialogProps {
  contactId: number;
  contactName?: string;
  mode?: "create" | "edit";
  pledgeData?: PledgeData; // For edit mode
  onPledgeCreated?: (pledgeId: number) => void;
  onPledgeCreatedAndPay?: (pledgeId: number) => void;
  onPledgeUpdated?: (pledgeId: number) => void;
  trigger?: React.ReactNode; // Custom trigger element
  // Add controlled state props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PledgeDialog({
  contactId,
  contactName,
  mode = "create",
  pledgeData,
  onPledgeCreated,
  onPledgeCreatedAndPay,
  onPledgeUpdated,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: PledgeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [createdPledge, setCreatedPledge] = useState<any>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    mode === "edit" ? pledgeData?.categoryId || null : null
  );

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const isEditMode = mode === "edit";

  // Get default values based on mode
  const getDefaultValues = (): PledgeFormData => {
    if (isEditMode && pledgeData) {
      return {
        contactId: pledgeData.contactId || contactId, // Use pledgeData.contactId first, fallback to prop
        categoryId: pledgeData.categoryId,
        currency: pledgeData.currency as (typeof supportedCurrencies)[number],
        exchangeRate: Math.max(pledgeData.exchangeRate || 1, 0.0001), // Ensure minimum value
        originalAmount: Math.max(pledgeData.originalAmount || 1, 0.01), // Ensure minimum value
        originalAmountUsd: Math.max(pledgeData.originalAmountUsd || 1, 0.01), // Ensure minimum value
        description: pledgeData.description || "", // Keep empty to trigger validation if needed
        pledgeDate: pledgeData.pledgeDate,
        exchangeRateDate: pledgeData.pledgeDate,
        campaignCode: pledgeData.campaignCode || "",
        notes: pledgeData.notes || "",
      };
    }

    return {
      contactId, // Make sure this is always set from props
      categoryId: undefined,
      currency: "USD" as const,
      exchangeRate: 1,
      originalAmount: 0,
      originalAmountUsd: 0,
      description: "",
      pledgeDate: new Date().toISOString().split("T")[0],
      exchangeRateDate: new Date().toISOString().split("T")[0],
      campaignCode: "",
      notes: "",
    };
  };

  const form = useForm<PledgeFormData, any>({
    resolver: zodResolver(pledgeSchema),
    defaultValues: getDefaultValues(),
    mode: "onChange", // This ensures validation happens on every change
  });

  const watchedCurrency = form.watch("currency");
  const watchedOriginalAmount = form.watch("originalAmount");
  const watchedExchangeRateDate = form.watch("exchangeRateDate");

  const {
    data: exchangeRatesData,
    isLoading: isLoadingRates,
    error: ratesError,
  } = useExchangeRates(watchedExchangeRateDate);

  const createPledgeMutation = useCreatePledgeMutation();
  const createPledgeAndPayMutation = useCreatePledgeAndPayMutation();
  const updatePledgeMutation = useUpdatePledgeMutation();

  // Add validation check for contactId prop
  useEffect(() => {
    if (!contactId || contactId <= 0) {
      console.error("Invalid contactId prop:", contactId);
      toast.error("Contact ID is missing or invalid");
      return;
    }
  }, [contactId]);

  // Update form when pledgeData changes (for edit mode)
  useEffect(() => {
    if (isEditMode && pledgeData && open) {
      const values = getDefaultValues();
      console.log("Edit mode - pledgeData received:", pledgeData);
      console.log("Edit mode - contactId from props:", contactId);
      console.log("Edit mode - form default values:", values);
      
      // Ensure contactId is set
      if (!values.contactId) {
        console.error("ContactId is missing in form values!");
        values.contactId = contactId; // Force set it
      }
      
      form.reset(values);
      setSelectedCategoryId(pledgeData.categoryId || null);
      
      // Trigger validation after a short delay to ensure form is updated
      setTimeout(() => {
        form.trigger();
      }, 100);
    }
  }, [isEditMode, pledgeData, open, contactId]); // Add contactId to dependencies

  // Exchange rate effect - only for create mode or when currency changes in edit mode
  useEffect(() => {
    if (
      watchedCurrency &&
      watchedExchangeRateDate &&
      exchangeRatesData?.data?.rates &&
      (!isEditMode || form.formState.isDirty)
    ) {
      const rate =
        parseFloat(exchangeRatesData.data.rates[watchedCurrency]) || 1;
      form.setValue("exchangeRate", rate, { shouldValidate: true });
    }
  }, [watchedCurrency, watchedExchangeRateDate, exchangeRatesData, form, isEditMode]);

  // USD conversion effect
  useEffect(() => {
    const exchangeRate = form.getValues("exchangeRate");
    if (watchedOriginalAmount && exchangeRate) {
      const usdAmount = watchedOriginalAmount * exchangeRate;
      form.setValue("originalAmountUsd", Math.round(usdAmount * 100) / 100, { shouldValidate: true });
    }
  }, [watchedOriginalAmount, form.watch("exchangeRate"), form]);

  const handleCategoryChange = (categoryId: string) => {
    const id = parseInt(categoryId);
    form.setValue("categoryId", id, { shouldValidate: true });
    setSelectedCategoryId(id);
    // Only clear description in create mode
    if (!isEditMode) {
      form.setValue("description", "", { shouldValidate: true });
    }
  };

  const handleItemSelect = (item: string) => {
    form.setValue("description", item, { shouldValidate: true });
  };

  // Check if selected category is "Donation"
  const isDonationCategory = selectedCategoryId
    ? STATIC_CATEGORIES.find(cat => cat.id === selectedCategoryId)?.name?.toLowerCase() === "donation"
    : false;

  const onSubmit = async (data: PledgeFormData, shouldOpenPayment = false) => {
    try {
      console.log("=== FORM SUBMISSION START ===");
      console.log("Is Edit Mode:", isEditMode);
      console.log("Form data:", data);
      console.log("Form errors:", form.formState.errors);

      // Manual validation check with detailed error reporting
      const isValid = await form.trigger();
      console.log("Form is valid:", isValid);
      
      if (!isValid) {
        console.log("Form validation failed:", form.formState.errors);
        
        // Create a detailed error message
        const errorMessages = Object.entries(form.formState.errors)
          .map(([field, error]: [string, any]) => `${field}: ${error?.message || 'Invalid'}`)
          .join(', ');
        
        return;
      }

      // Additional validation for edit mode
      if (isEditMode && !pledgeData?.id) {
        toast.error("Pledge ID is missing - cannot update");
        return;
      }

      const submissionData = {
        contactId: data.contactId,
        categoryId: data.categoryId,
        pledgeDate: data.pledgeDate,
        description: data.description,
        originalAmount: data.originalAmount,
        currency: data.currency,
        originalAmountUsd: data.originalAmountUsd,
        exchangeRate: data.exchangeRate,
        campaignCode: data.campaignCode || undefined,
        notes: data.notes,
      };

      console.log("Submission data:", submissionData);

      if (isEditMode) {
        console.log("Calling updatePledgeMutation.mutateAsync...");
        
        const updateData = {
          id: pledgeData!.id!,
          ...submissionData,
        };
        
        console.log("Update data being sent:", updateData);
        
        const result = await updatePledgeMutation.mutateAsync(updateData);
        
        console.log("Update result:", result);
        toast.success("Pledge updated successfully!");
        setOpen(false);

        if (onPledgeUpdated) {
          onPledgeUpdated(pledgeData!.id!);
        }
      } else {
        // Handle create logic
        if (shouldOpenPayment) {
          const result = await createPledgeAndPayMutation.mutateAsync({
            ...submissionData,
            shouldRedirectToPay: true,
          });

          toast.success("Pledge created successfully!");
          resetForm();
          setOpen(false);

          setCreatedPledge(result.pledge);
          setPaymentDialogOpen(true);
        } else {
          const result = await createPledgeMutation.mutateAsync(submissionData);

          toast.success("Pledge created successfully!");
          resetForm();
          setOpen(false);

          if (onPledgeCreated) {
            onPledgeCreated(result.pledge.id);
          }
        }
      }
      
      console.log("=== FORM SUBMISSION SUCCESS ===");
    } catch (error) {
      console.error("=== FORM SUBMISSION ERROR ===");
      console.error("Error details:", error);
      
      const action = isEditMode ? "update" : "create";
      toast.error(
        error instanceof Error ? error.message : `Failed to ${action} pledge`
      );
    }
  };

  const resetForm = () => {
    form.reset(getDefaultValues());
    setSelectedCategoryId(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && !isEditMode) {
      resetForm();
    }
  };

  const isSubmitting =
    createPledgeMutation.isPending || 
    createPledgeAndPayMutation.isPending || 
    updatePledgeMutation.isPending;

  const selectedCategory = selectedCategoryId
    ? getCategoryById(selectedCategoryId)
    : null;

  // Default trigger based on mode
  const defaultTrigger = isEditMode ? (
    <Button
      size="sm"
      variant="outline"
      aria-label="Edit Pledge"
    >
      <Edit className="mr-2 h-4 w-4" />
      Edit
    </Button>
  ) : (
    <Button
      size="sm"
      className="border-dashed text-white"
      aria-label="Create Pledge"
    >
      <PlusCircle className="mr-2 h-4 w-4" />
      Create Pledge
    </Button>
  );

  // If controlled, don't render trigger
  const shouldRenderTrigger = controlledOpen === undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {shouldRenderTrigger && (
          <DialogTrigger asChild>
            {trigger || defaultTrigger}
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit Pledge" : "Create Pledge"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? `Edit pledge for ${contactName || `contact ID ${contactId}`}.`
                : `Add a new pledge for ${contactName || `contact ID ${contactId}`}.`
              }
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => onSubmit(data, false))} className="space-y-4">
              {/* Global form errors */}
              {/* {Object.keys(form.formState.errors).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {Object.entries(form.formState.errors).map(([field, error]: [string, any]) => (
                      <li key={field}>
                        <strong>{field}:</strong> {error?.message || 'This field is invalid'}
                      </li>
                    ))}
                  </ul>
                </div>
              )} */}

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Category</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-[200px] justify-between",
                              !field.value && "text-muted-foreground",
                              form.formState.errors.categoryId && "border-red-500"
                            )}
                          >
                            {field.value
                              ? STATIC_CATEGORIES.find(
                                  (category) => category.id === field.value
                                )?.name
                              : "Select category"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[200px] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search category..."
                            className="h-9"
                          />
                          <CommandList>
                            <CommandEmpty>No category found.</CommandEmpty>
                            <CommandGroup>
                              {STATIC_CATEGORIES.map((category) => (
                                <CommandItem
                                  key={category.id}
                                  value={category.name}
                                  onSelect={() => {
                                    form.setValue("categoryId", category.id, { shouldValidate: true });
                                    handleCategoryChange(
                                      category.id.toString()
                                    );
                                  }}
                                >
                                  {category.name}
                                  <Check
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      category.id === field.value
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
                    <FormDescription>
                      Select the category for this pledge.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campaign Code Field - Only show for Donation category */}
              {isDonationCategory && (
                <FormField
                  control={form.control}
                  name="campaignCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Code</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter campaign code (optional)"
                          className={cn(
                            form.formState.errors.campaignCode && "border-red-500"
                          )}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional campaign code for donation tracking.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Description with item selection */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <Input
                          {...field}
                          placeholder="Enter description of the pledge"
                          className={cn(
                            form.formState.errors.description && "border-red-500"
                          )}
                        />
                        {selectedCategory &&
                          selectedCategory.items.length > 0 && (
                            <div className="mt-2">
                              <FormLabel className="text-sm text-muted-foreground">
                                Or select from {selectedCategory.name} items:
                              </FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className="w-full justify-between mt-1"
                                  >
                                    Select item from {selectedCategory.name}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput
                                      placeholder={`Search ${selectedCategory.name} items...`}
                                      className="h-9"
                                    />
                                    <CommandList className="max-h-[200px]">
                                      <CommandEmpty>
                                        No items found.
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {selectedCategory.items.map(
                                          (item, index) => (
                                            <CommandItem
                                              key={index}
                                              value={item}
                                              onSelect={() =>
                                                handleItemSelect(item)
                                              }
                                            >
                                              {item}
                                            </CommandItem>
                                          )
                                        )}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                      </div>
                    </FormControl>
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
                      <Input 
                        type="date" 
                        {...field} 
                        className={cn(
                          form.formState.errors.pledgeDate && "border-red-500"
                        )}
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
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.trigger("currency");
                      }}
                      value={field.value}
                      disabled={isLoadingRates}
                    >
                      <FormControl>
                        <SelectTrigger className={cn(
                          form.formState.errors.currency && "border-red-500"
                        )}>
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

              {/* Exchange Rate */}
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
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                        }}
                        readOnly={isEditMode}
                        className={cn(
                          isEditMode ? "bg-gray-50" : "bg-gray-50",
                          form.formState.errors.exchangeRate && "border-red-500"
                        )}
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditMode
                        ? "Exchange rate from original pledge"
                        : isLoadingRates
                        ? "Loading exchange rate..."
                        : `Rate for ${watchedExchangeRateDate || "today"}`}
                    </FormDescription>
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
                          const value = parseFloat(e.target.value) || 0;
                          field.onChange(value);
                        }}
                        className={cn(
                          form.formState.errors.originalAmount && "border-red-500"
                        )}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Original Amount USD */}
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
                        className={cn(
                          "bg-gray-50",
                          form.formState.errors.originalAmountUsd && "border-red-500"
                        )}
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
                        className={cn(
                          form.formState.errors.notes && "border-red-500"
                        )}
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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                {isEditMode ? (
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoadingRates}
                  >
                    {isSubmitting ? "Updating..." : "Update Pledge"}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="submit"
                      disabled={isSubmitting || isLoadingRates}
                    >
                      {isSubmitting ? "Creating..." : "Create Pledge"}
                    </Button>
                    <Button
                      type="button"
                      onClick={form.handleSubmit((data) => onSubmit(data, true))}
                      disabled={isSubmitting || isLoadingRates}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? "Creating..." : "Create Pledge + Pay"}
                    </Button>
                  </>
                )}
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {createdPledge && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          pledgeId={createdPledge.id}
          pledgeAmount={parseFloat(createdPledge.originalAmount)}
          pledgeCurrency={createdPledge.currency}
          pledgeDescription={createdPledge.description}
          onPaymentCreated={() => {
            if (onPledgeCreatedAndPay) {
              onPledgeCreatedAndPay(createdPledge.id);
            }
            setCreatedPledge(null);
          }}
        />
      )}
    </>
  );
}
