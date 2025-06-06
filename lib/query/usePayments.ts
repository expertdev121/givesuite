import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

const PaymentStatusEnum = z.enum([
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
  "processing",
]);

interface PaymentResponse {
  id: number;
  amount: string;
  currency: string;
  amountUsd: string | null;
  paymentDate: string;
  receivedDate: string | null;
  processedDate: string | null;
  paymentMethod: string | null;
  paymentStatus: z.infer<typeof PaymentStatusEnum> | null;
  referenceNumber: string | null;
  checkNumber: string | null;
  receiptNumber: string | null;
  receiptIssued: boolean | null;
  receiptIssuedDate: string | null;
  notes: string | null;
  paymentPlanId: number | null;
}

interface ApiResponse {
  payments: PaymentResponse[];
}

const QueryParamsSchema = z.object({
  pledgeId: z.number().positive(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  paymentStatus: PaymentStatusEnum.optional(),
});

type QueryParams = z.infer<typeof QueryParamsSchema>;

const fetchPayments = async (params: QueryParams): Promise<ApiResponse> => {
  const validatedParams = QueryParamsSchema.parse(params);
  const queryParams = {
    page: validatedParams.page,
    limit: validatedParams.limit,
    ...(validatedParams.search && { search: validatedParams.search }),
    ...(validatedParams.paymentStatus && {
      paymentStatus: validatedParams.paymentStatus,
    }),
  };

  try {
    const response = await axios.get<ApiResponse>(
      `/api/payments/${validatedParams.pledgeId}`,
      {
        params: queryParams,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to fetch payments: ${
        axios.isAxiosError(error) ? error.message : "Unknown error"
      }`
    );
  }
};

export const usePaymentsQuery = (params: QueryParams) => {
  return useQuery<ApiResponse, Error>({
    queryKey: ["payments", params],
    queryFn: () => fetchPayments(params),
    enabled: !!params.pledgeId && !isNaN(params.pledgeId),
  });
};
