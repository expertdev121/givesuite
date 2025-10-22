import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";

// Tag interface
interface Tag {
  id: number;
  name: string;
  description: string | null;
  showOnPayment: boolean;
  showOnPledge: boolean;
  isActive: boolean;
}

// Complete pledge response interface matching API structure
interface PledgeResponse {
  // Basic pledge fields
  id: number;
  contactId: number;
  categoryId: number | null;
  relationshipId: number | null;
  pledgeDate: string;
  description: string | null;
  originalAmount: string;
  currency: string;
  originalAmountUsd: string | null;
  exchangeRate: string | null;
  campaignCode: string | null;
  totalPaid: string;
  totalPaidUsd: string | null;
  balance: string;
  balanceUsd: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  // Flat category fields (from list API)
  categoryName: string | null;
  categoryDescription: string | null;

  // Calculated fields
  progressPercentage: number;
  scheduledAmount: string;
  unscheduledAmount: string;

  // Structured nested objects
  relationship?: {
    id: number;
    type: string;
    label: string;
    isActive: boolean;
    notes?: string | null;
    relatedContact: {
      id: number;
      firstName: string;
      lastName: string;
      fullName: string;
      email?: string | null;
      phone?: string | null;
    } | null;
  } | null;

  contact?: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string | null;
  };

  category?: {
    id: number;
    name: string;
    description?: string | null;
  } | null;

  // Tags array
  tags?: Tag[];

  // Payment plan information (optional, may be included)
  paymentPlan?: {
    id?: number;
    planName?: string | null;
    frequency?: string;
    distributionType?: string;
    totalPlannedAmount?: string;
    installmentAmount?: string;
    numberOfInstallments?: number;
    installmentsPaid?: number;
    nextPaymentDate?: string | null;
    planStatus?: string;
    autoRenew?: boolean;
    notes?: string | null;
    startDate?: string;
    endDate?: string | null;
    installmentSchedule?: {
      id: number;
      installmentDate: string;
      installmentAmount: string;
      currency: string;
      status: string;
      paidDate?: string | null;
      notes?: string | null;
    }[];
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ApiResponse {
  pledges: PledgeResponse[];
  pagination: PaginationInfo;
  filters: {
    contactId?: number;
    categoryId?: number;
    relationshipId?: number;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    campaignCode?: string;
    tagIds?: number[];
  };
}

interface QueryParams {
  contactId?: number;
  categoryId?: number;
  relationshipId?: number;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  status?: "fullyPaid" | "partiallyPaid" | "unpaid";
  search?: string;
  campaignCode?: string;
  tagIds?: number[];
}

const fetchPledges = async (params: QueryParams): Promise<ApiResponse> => {
  const queryParams = {
    ...(params.categoryId && { categoryId: params.categoryId }),
    ...(params.relationshipId && { relationshipId: params.relationshipId }),
    page: params.page || 1,
    limit: params.limit || 10,
    ...(params.startDate && { startDate: params.startDate }),
    ...(params.endDate && { endDate: params.endDate }),
    ...(params.status && { status: params.status }),
    ...(params.search && { search: params.search }),
    ...(params.campaignCode && { campaignCode: params.campaignCode }),
    ...(params.tagIds && params.tagIds.length > 0 && { 
      tagIds: JSON.stringify(params.tagIds) 
    }),
  };

  try {
    const url = `/api/contacts/${params.contactId}/pledges`;
    
    console.log("=== FETCHING PLEDGES ===", {
      url,
      params: queryParams,
    });

    const response = await axios.get<ApiResponse>(url, {
      params: queryParams,
    });

    console.log("=== PLEDGES QUERY RESPONSE ===", {
      pledgeCount: response.data.pledges.length,
      firstPledge: response.data.pledges[0] ? {
        id: response.data.pledges[0].id,
        categoryId: response.data.pledges[0].categoryId,
        categoryName: response.data.pledges[0].categoryName,
        hasCategory: !!response.data.pledges[0].category,
        hasTags: !!response.data.pledges[0].tags,
        tagCount: response.data.pledges[0].tags?.length || 0,
      } : null,
    });

    return response.data;
  } catch (error) {
    console.error("=== PLEDGES QUERY ERROR ===", error);
    throw new Error(
      `Failed to fetch pledges: ${
        axios.isAxiosError(error) ? error.message : "Unknown error"
      }`
    );
  }
};

export const usePledgesQuery = (
  params: QueryParams,
  options?: Omit<UseQueryOptions<ApiResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<ApiResponse, Error>({
    queryKey: ["pledges", params],
    queryFn: () => fetchPledges(params),
    enabled: !!params.contactId, // Only fetch if contactId is provided
    staleTime: 30000, // Consider data fresh for 30 seconds
    ...options,
  });
};

// Export types for use in other files
export type { PledgeResponse, ApiResponse, QueryParams, Tag };