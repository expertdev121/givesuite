import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// Types
export interface PledgeQueryParams {
  contactId?: number;
  categoryId?: number;
  page?: number;
  limit?: number;
  search?: string;
  status?: "fullyPaid" | "partiallyPaid" | "unpaid";
  startDate?: string;
  endDate?: string;
}

export interface Pledge {
  id: number;
  contactId: number;
  categoryId: number | null;
  pledgeDate: string;
  description: string;
  originalAmount: string;
  currency: string;
  originalAmountUsd: string | null;
  totalPaid: string;
  totalPaidUsd: string | null;
  balance: string;
  balanceUsd: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  progressPercentage: number;
  categoryName: string | null;
  categoryDescription: string | null;
}

export interface PledgesResponse {
  pledges: Pledge[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    contactId?: number;
    categoryId?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface CreatePledgeData {
  contactId: number;
  categoryId?: number;
  pledgeDate: string;
  description: string;
  originalAmount: number;
  currency: string;
  originalAmountUsd: number;
  notes?: string;
}

export interface CreatePledgeResponse {
  message: string;
  pledge: Pledge;
}

export interface CreatePledgeAndPayData extends CreatePledgeData {
  shouldRedirectToPay: boolean;
}

// API Functions
const fetchPledges = async (
  params: PledgeQueryParams
): Promise<PledgesResponse> => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/pledges?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch pledges: ${response.statusText}`);
  }

  return response.json();
};

const createPledge = async (
  data: CreatePledgeData
): Promise<CreatePledgeResponse> => {
  const response = await fetch("/api/pledges", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || `Failed to create pledge: ${response.statusText}`
    );
  }

  return response.json();
};

// Query Keys
export const pledgeKeys = {
  all: ["pledges"] as const,
  lists: () => [...pledgeKeys.all, "list"] as const,
  list: (params: PledgeQueryParams) => [...pledgeKeys.lists(), params] as const,
  details: () => [...pledgeKeys.all, "detail"] as const,
  detail: (id: number) => [...pledgeKeys.details(), id] as const,
};

// Hooks
export const usePledgesQuery = (params: PledgeQueryParams) => {
  return useQuery({
    queryKey: pledgeKeys.list(params),
    queryFn: () => fetchPledges(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useCreatePledgeMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPledge,
    onSuccess: (data, variables) => {
      // Invalidate all pledge queries
      queryClient.invalidateQueries({ queryKey: pledgeKeys.all });

      // Specifically invalidate queries for this contact
      queryClient.invalidateQueries({
        queryKey: pledgeKeys.list({ contactId: variables.contactId }),
      });

      // Invalidate category queries if applicable
      if (variables.categoryId) {
        queryClient.invalidateQueries({
          queryKey: pledgeKeys.list({ categoryId: variables.categoryId }),
        });
      }
    },
    onError: (error) => {
      console.error("Error creating pledge:", error);
    },
  });
};

// Hook for creating pledge and then navigating to payment
export const useCreatePledgeAndPayMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePledgeAndPayData) => {
      const { shouldRedirectToPay, ...pledgeData } = data;
      const result = await createPledge(pledgeData);
      return { ...result, shouldRedirectToPay };
    },
    onSuccess: (data, variables) => {
      // Invalidate queries same as create pledge
      queryClient.invalidateQueries({ queryKey: pledgeKeys.all });
      queryClient.invalidateQueries({
        queryKey: pledgeKeys.list({ contactId: variables.contactId }),
      });

      if (variables.categoryId) {
        queryClient.invalidateQueries({
          queryKey: pledgeKeys.list({ categoryId: variables.categoryId }),
        });
      }
    },
    onError: (error) => {
      console.error("Error creating pledge:", error);
    },
  });
};
