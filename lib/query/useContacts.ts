import { useInfiniteQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { ContactsResponse, SortField, SortOrder } from "@/types/contact";

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

interface QueryParams {
  limit?: number;
  search?: string;
  sortBy?: SortField;
  sortOrder?: SortOrder;
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
