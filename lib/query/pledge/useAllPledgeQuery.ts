import { useQuery } from "@tanstack/react-query";

interface AllPledgesQueryParams {
  categoryId?: number | null;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: "fullyPaid" | "partiallyPaid" | "unpaid";
  search?: string;
}

interface Pledge {
  id: number;
  contactId: number;
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
  contactName: string | null;
  contactEmail: string | null;
  progressPercentage: number;
}

interface AllPledgesResponse {
  pledges: Pledge[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

const fetchAllPledges = async (
  params: AllPledgesQueryParams
): Promise<AllPledgesResponse> => {
  const searchParams = new URLSearchParams();

  if (params.categoryId) {
    searchParams.append("categoryId", params.categoryId.toString());
  }
  if (params.page) {
    searchParams.append("page", params.page.toString());
  }
  if (params.limit) {
    searchParams.append("limit", params.limit.toString());
  }
  if (params.startDate) {
    searchParams.append("startDate", params.startDate);
  }
  if (params.endDate) {
    searchParams.append("endDate", params.endDate);
  }
  if (params.status) {
    searchParams.append("status", params.status);
  }
  if (params.search) {
    searchParams.append("search", params.search);
  }

  const response = await fetch(`/api/all-pledges?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch pledges: ${response.statusText}`);
  }

  return response.json();
};

export const useAllPledgesQuery = (params: AllPledgesQueryParams) => {
  return useQuery({
    queryKey: ["all-pledges", params],
    queryFn: () => fetchAllPledges(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
