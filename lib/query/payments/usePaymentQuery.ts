import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PaymentAllocation } from "@/lib/db/schema";

export interface PaymentQueryParams {
  pledgeId?: number;
  contactId?: number;
  solicitorId?: number;
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
  hasSolicitor?: boolean;
}

export interface Payment {
  id: number;
  pledgeId: number;
  amount: string; // Keep as string if it's coming from DB as DECIMAL/NUMERIC
  currency: string;
  amountUsd: string | null;
  exchangeRate: string | null;
  paymentDate: string;
  receivedDate: string | null;
  methodDetail: string;
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
  // Renamed paymentPlanId to installmentScheduleId for clarity based on the error
  // If paymentPlanId is strictly what your backend returns and it fulfills the role of installmentScheduleId,
  // then you can add installmentScheduleId and assign paymentPlanId to it in your data transformation.
  // Or, simply rename paymentPlanId here if it's truly the same concept.
  installmentScheduleId: number | null; // This corresponds to the original `paymentPlanId`
  createdAt: string;
  updatedAt: string;
  pledgeDescription: string | null;
  pledgeOriginalAmount: string | null;
  pledgeOriginalCurrency: string;
  pledgeExchangeRate: string;
  contactId: number | null;
  solicitorName: string | null;

  // Add the missing properties as indicated by the error
  amountInPledgeCurrency: number; // Assuming number, adjust if it's a string/decimal
  isSplitPayment: boolean;
  allocations: PaymentAllocation[]; // Import PaymentAllocation if not already
}

export interface PaymentAllocationWithPledge extends PaymentAllocation {
  pledge?: {
    id: number;
    contactId: number;
    campaignId: number;
    currency: string;
  };
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
    solicitorId?: number;
    search?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    hasSolicitor?: boolean;
  };
}

export interface CreatePaymentData {
  pledgeId: number;
  amount: number;
  currency: "USD" | "ILS" | "EUR" | "JPY" | "GBP" | "AUD" | "CAD" | "ZAR";
  amountUsd: number;
  exchangeRate: number;
  paymentDate: string;
  receivedDate?: string;
  paymentMethod:
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
  referenceNumber?: string;
  checkNumber?: string;
  receiptNumber?: string;
  receiptType?: "invoice" | "confirmation" | "receipt" | "other";
  receiptIssued?: boolean;
  solicitorId?: number;
  bonusPercentage?: number;
  bonusAmount?: number;
  bonusRuleId?: number;
  notes?: string;
  paymentPlanId?: number;
  // If you also create these, they need to be here
  amountInPledgeCurrency?: number;
  isSplitPayment?: boolean;
  allocations?: PaymentAllocation[];
}

export interface CreatePaymentResponse {
  message: string;
  payment: Payment;
}

export interface UpdatePaymentData {
  paymentId: number;
  amount?: number;
  currency?: "USD" | "ILS" | "EUR" | "JPY" | "GBP" | "AUD" | "CAD" | "ZAR";
  amountUsd?: number;
  exchangeRate?: number;
  paymentDate?: string;
  receivedDate?: string;
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
  referenceNumber?: string;
  checkNumber?: string;
  receiptNumber?: string;
  receiptType?: "invoice" | "confirmation" | "receipt" | "other";
  receiptIssued?: boolean;
  solicitorId?: number;
  bonusPercentage?: number;
  bonusAmount?: number;
  bonusRuleId?: number;
  notes?: string;
  paymentPlanId?: number;
  // If these can be updated, they need to be here
  amountInPledgeCurrency?: number;
  isSplitPayment?: boolean;
  allocations?: PaymentAllocation[];
}

export interface UpdatePaymentResponse {
  message: string;
  payment: Payment;
}

export interface DeletePaymentData {
  paymentId: number;
}

export interface DeletePaymentResponse {
  message: string;
  deletedPayment: {
    id: number;
    amount: string;
    paymentStatus: string;
    solicitorId?: number;
    bonusAmount?: string;
  };
}

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

const fetchPaymentAllocations = async (params?: {
  paymentIds?: number[];
}): Promise<PaymentAllocationWithPledge[]> => {
  if (!params?.paymentIds?.length) return [];
  
  // You need to import `api` or use `fetch` directly here.
  // I'm assuming 'api' is an instance of something like axios.
  // If not, replace with fetch:
  // const res = await fetch(`/api/payments/allocations?paymentIds=${params.paymentIds.join(",")}`);
  // if (!res.ok) throw new Error("Failed to fetch allocations");
  // return res.json();
  
  // Placeholder if `api` is not defined globally or imported:
  console.warn("api is not defined. Assuming it's imported or globally available.");
  const res = await fetch(`/api/payments/allocations?paymentIds=${params.paymentIds.join(",")}`);
  if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Failed to fetch allocations");
  }
  return res.json();
};


export const usePaymentAllocationsQuery = (params?: { paymentIds?: number[] }) => {
  return useQuery({
    queryKey: ["paymentAllocations", params?.paymentIds],
    queryFn: () => fetchPaymentAllocations(params),
    enabled: !!params?.paymentIds?.length,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
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
const updatePayment = async (
  paymentId: number, // Corrected parameter name
  data: UpdatePaymentData
): Promise<UpdatePaymentResponse> => {
  const response = await fetch(`/api/payments/${paymentId}`, { // Changed to paymentId
    method: "PATCH", 
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || `Failed to update payment: ${response.statusText}`
    );
  }
  return response.json();
};

// Updated deletePayment function - now uses paymentId directly
const deletePayment = async (
  data: DeletePaymentData
): Promise<DeletePaymentResponse> => {
  const response = await fetch(`/api/payments/${data.paymentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || `Failed to delete payment: ${response.statusText}`
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
  solicitor: (solicitorId: number) =>
    [...paymentKeys.all, "solicitor", solicitorId] as const,
};

export const usePaymentsQuery = (
  params: PaymentQueryParams,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  }
) => {
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => fetchPayments(params),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const useCreatePaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error("Error creating payment:", error);
    },
  });
};

export const useUpdatePaymentMutation = (paymentId: number) => { // Changed pledgeId to paymentId here
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePaymentData) => updatePayment(paymentId, data), // Pass paymentId correctly
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error("Error updating payment:", error);
    },
  });
};

export const useDeletePaymentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: DeletePaymentData) => deletePayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error("Error deleting payment:", error);
    },
  });
};

export const useSolicitorPaymentsQuery = (
  solicitorId: number,
  additionalParams?: Omit<PaymentQueryParams, "solicitorId">,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  }
) => {
  const params = { ...additionalParams, solicitorId };
  return useQuery({
    queryKey: paymentKeys.solicitor(solicitorId),
    queryFn: () => fetchPayments(params),
    enabled: (options?.enabled ?? true) && !!solicitorId,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};

export const usePaymentsBySolicitorStatus = (
  hasSolicitor: boolean,
  additionalParams?: Omit<PaymentQueryParams, "hasSolicitor">,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
    staleTime?: number;
  }
) => {
  const params = { ...additionalParams, hasSolicitor };
  return useQuery({
    queryKey: paymentKeys.list(params),
    queryFn: () => fetchPayments(params),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    staleTime: options?.staleTime ?? 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
};