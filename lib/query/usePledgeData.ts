import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

interface PledgeResponse {
  id: number;
  pledgeDate: string;
  description: string | null;
  originalAmount: string;
  currency: string;
  originalAmountUsd: string | null;
  totalPaid: string;
  totalPaidUsd: string | null;
  balance: string;
  balanceUsd: string | null;
  notes: string | null;
  categoryName: string | null;
  categoryDescription: string | null;
  progressPercentage: number;
}

interface ApiResponse {
  pledges: PledgeResponse[];
}

const QueryParamsSchema = z.object({
  contactId: z.number().positive().optional(),
  categoryId: z.number().positive().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["fullyPaid", "partiallyPaid", "unpaid"]).optional(),
  search: z.string().optional(),
});

type QueryParams = z.infer<typeof QueryParamsSchema>;

const fetchPledges = async (params: QueryParams): Promise<ApiResponse> => {
  const validatedParams = QueryParamsSchema.parse(params);
  const queryParams = {
    ...(validatedParams.categoryId && {
      categoryId: validatedParams.categoryId,
    }),
    page: validatedParams.page,
    limit: validatedParams.limit,
    ...(validatedParams.startDate && { startDate: validatedParams.startDate }),
    ...(validatedParams.endDate && { endDate: validatedParams.endDate }),
    ...(validatedParams.status && { status: validatedParams.status }),
    ...(validatedParams.search && { search: validatedParams.search }),
  };

  try {
    const url = `/api/contacts/${validatedParams.contactId}/pledges`;
    const response = await axios.get<ApiResponse>(url, {
      params: queryParams,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to fetch pledges: ${
        axios.isAxiosError(error) ? error.message : "Unknown error"
      }`
    );
  }
};

export const usePledgesQuery = (params: QueryParams) => {
  return useQuery<ApiResponse, Error>({
    queryKey: ["pledges", params],
    queryFn: () => fetchPledges(params),
  });
};
