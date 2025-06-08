import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types based on your schema
export interface PaymentPlanFormData {
  pledgeId: number;
  planName?: string;
  frequency:
    | "weekly"
    | "monthly"
    | "quarterly"
    | "biannual"
    | "annual"
    | "one_time"
    | "custom";
  totalPlannedAmount: number;
  currency: "USD" | "ILS" | "EUR" | "JPY" | "GBP" | "AUD" | "CAD" | "ZAR";
  installmentAmount: number;
  numberOfInstallments: number;
  startDate: string;
  endDate?: string;
  nextPaymentDate?: string;
  autoRenew: boolean;
  notes?: string;
  internalNotes?: string;
}

export interface PaymentPlan {
  id: number;
  pledgeId: number;
  planName?: string;
  frequency: string;
  totalPlannedAmount: number;
  currency: string;
  installmentAmount: number;
  numberOfInstallments: number;
  startDate: string;
  endDate?: string;
  nextPaymentDate?: string;
  installmentsPaid: number;
  totalPaid: number;
  remainingAmount: number;
  planStatus: "active" | "completed" | "cancelled" | "paused" | "overdue";
  autoRenew: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  pledgeDescription?: string;
  pledgeOriginalAmount?: string;
  contactId?: number;
}

export interface PledgeDetails {
  pledge: {
    id: number;
    pledgeDate: string;
    description?: string;
    originalAmount: number;
    currency: string;
    totalPaid: number;
    balance: number;
    originalAmountUsd?: number;
    totalPaidUsd?: number;
    balanceUsd?: number;
    isActive: boolean;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    paymentPercentage: number;
    remainingBalance: number;
    isPaidInFull: boolean;
  };
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  category?: {
    id: number;
    name: string;
    description?: string;
  };
  paymentSummary: {
    totalPayments: number;
    lastPaymentDate?: string;
    lastPaymentAmount?: number;
  };
  paymentPlans: PaymentPlan[];
  activePaymentPlans: PaymentPlan[];
}

// Payment Plan Mutations
export const useCreatePaymentPlanMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PaymentPlanFormData) => {
      const response = await fetch("/api/payment-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment plan");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["paymentPlans"] });
      queryClient.invalidateQueries({
        queryKey: ["payment-plans", variables.pledgeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pledge-details", variables.pledgeId],
      });
      queryClient.invalidateQueries({ queryKey: ["pledges"] });

      toast.success("Payment plan created successfully!");
    },
    onError: (error) => {
      console.error("Error creating payment plan:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create payment plan"
      );
    },
  });
};

// Payment Plan Queries
export const usePaymentPlansQuery = (params?: {
  pledgeId?: number;
  contactId?: number;
  page?: number;
  limit?: number;
  planStatus?: string;
  frequency?: string;
}) => {
  const searchParams = new URLSearchParams();

  if (params?.pledgeId)
    searchParams.append("pledgeId", params.pledgeId.toString());
  if (params?.contactId)
    searchParams.append("contactId", params.contactId.toString());
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.planStatus) searchParams.append("planStatus", params.planStatus);
  if (params?.frequency) searchParams.append("frequency", params.frequency);

  return useQuery({
    queryKey: ["paymentPlans", params],
    queryFn: async () => {
      const response = await fetch(
        `/api/payment-plans?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch payment plans");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePaymentPlansByPledgeQuery = (pledgeId: number) => {
  return usePaymentPlansQuery({ pledgeId, limit: 100 });
};

// Pledge Details Query
export const usePledgeDetailsQuery = (pledgeId: number) => {
  return useQuery({
    queryKey: ["pledge-details", pledgeId],
    queryFn: async (): Promise<PledgeDetails> => {
      const response = await fetch(`/api/pledges/${pledgeId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch pledge details");
      }

      return response.json();
    },
    enabled: !!pledgeId && pledgeId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Update Payment Plan Mutation (for future use)
export const useUpdatePaymentPlanMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<PaymentPlanFormData>;
    }) => {
      const response = await fetch(`/api/payment-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update payment plan");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["payment-plans"] });
      queryClient.invalidateQueries({
        queryKey: ["payment-plans", variables.id],
      });

      toast.success("Payment plan updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating payment plan:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update payment plan"
      );
    },
  });
};

// Cancel Payment Plan Mutation
export const useCancelPaymentPlanMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch(`/api/payment-plans/${planId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel payment plan");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentPlans"] });
      toast.success("Payment plan cancelled successfully!");
    },
    onError: (error) => {
      console.error("Error cancelling payment plan:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel payment plan"
      );
    },
  });
};
