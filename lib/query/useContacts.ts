import { useInfiniteQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";

// Define types based on the API response
interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  gender: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  totalPledgedUsd: number;
  totalPaidUsd: number;
  currentBalanceUsd: number;
  studentProgram: string | null;
  studentStatus: string | null;
  roleName: string | null;
  lastPaymentDate: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ContactsResponse {
  contacts: Contact[];
  pagination: Pagination;
}

interface QueryParams {
  limit?: number;
  search?: string;
  sortBy?: "updatedAt" | "firstName" | "lastName" | "totalPledgedUsd";
  sortOrder?: "asc" | "desc";
}

interface ApiError {
  error: string;
  details?: {
    issues: Array<{
      code: string;
      expected: string;
      received: string;
      path: string[];
      message: string;
    }>;
    name: string;
  };
  message?: string;
}

export const useContacts = (params: QueryParams) => {
  return useInfiniteQuery<ContactsResponse, AxiosError<ApiError>>({
    queryKey: ["contacts", params],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await axios.get<ContactsResponse>("/api/contacts", {
        params: {
          page: pageParam,
          limit: params.limit ?? 10,
          search: params.search ?? undefined,
          sortBy: params.sortBy ?? "updatedAt",
          sortOrder: params.sortOrder ?? "desc",
        },
      });
      return data;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNextPage
        ? lastPage.pagination.page + 1
        : undefined;
    },
    initialPageParam: 1,
    staleTime: 60 * 1000,
    retry: (failureCount, error) => {
      if (error.response?.status && error.response.status >= 500) {
        return failureCount < 3;
      }
      return false;
    },
  });
};
