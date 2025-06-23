import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { pledgeKeys } from "../pledge/usePledgeQuery";

export interface PaymentQueryParams {
  pledgeId?: number;
  contactId?: number;
  page?: number;
  limit?: number;
  search?: string;
  paymentMethod?:
    | "credit_card"
    | "cash"
    | "check"
    | "bank_transfer"
    | "paypal"
    | "wire_transfer"
    | "other";
  paymentStatus?:
    | "pending"
    | "completed"
    | "failed"
    | "cancelled"
    | "refunded"
    | "processing";
  startDate?: string;
  endDate?: string;
}

export interface Payment {
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
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  pledgeDescription: string | null;
  pledgeOriginalAmount: string | null;
  contactId: number | null;
}

export interface PaymentsResponse {
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    pledgeId?: number;
    contactId?: number;
    search?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
  };
}

export interface CreatePaymentData {
  pledgeId: number;
  amount: number;
  currency: string;
  amountUsd: number;
  exchangeRate: number;
  paymentDate: string;
  paymentMethod:
    | "credit_card"
    | "cash"
    | "check"
    | "bank_transfer"
    | "paypal"
    | "wire_transfer"
    | "other";
  referenceNumber?: string;
  checkNumber?: string;
  receiptNumber?: string;
  receiptType?: "invoice" | "confirmation" | "receipt" | "other";
  notes?: string;
}

export interface CreatePaymentResponse {
  message: string;
  payment: Payment;
}

// API Functions
const fetchPayments = async (
  params: PaymentQueryParams
): Promise<PaymentsResponse> => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(`/api/payments?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch payments: ${response.statusText}`);
  }

  return response.json();
};

const createPayment = async (
  data: CreatePaymentData
): Promise<CreatePaymentResponse> => {
  const response = await fetch("/api/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || `Failed to create payment: ${response.statusText}`
    );
  }

  return response.json();
};

export const paymentKeys = {
  all: ["payments"] as const,
  lists: () => [...paymentKeys.all, "list"] as const,
  list: (params: PaymentQueryParams) =>
    [...paymentKeys.lists(), params] as const,
  details: () => [...paymentKeys.all, "detail"] as const,
  detail: (id: number) => [...paymentKeys.details(), id] as const,
};

// Hooks
export const usePaymentsQuery = (params: PaymentQueryParams) => {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => fetchPayments(params),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useCreatePaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPayment,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries();
      queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      queryClient.invalidateQueries({
        queryKey: paymentKeys.list({ pledgeId: variables.pledgeId }),
      });
      queryClient.invalidateQueries({ queryKey: pledgeKeys.all });
      if (data.payment.contactId) {
        queryClient.invalidateQueries({
          queryKey: paymentKeys.list({ contactId: data.payment.contactId }),
        });
        queryClient.invalidateQueries({
          queryKey: pledgeKeys.list({ contactId: data.payment.contactId }),
        });
      }
    },
    onError: (error) => {
      console.error("Error creating payment:", error);
    },
  });
};
