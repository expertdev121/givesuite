import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { z } from "zod";
import { NewContactRole } from "../db/schema";

interface ContactRole {
  id: number;
  contactId: number;
  roleName: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactRolesResponse {
  contactRoles: ContactRole[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  filters: {
    search?: string;
    roleName?: string;
    isActive?: boolean;
    contactId?: number;
    sortBy: string;
    sortOrder: "asc" | "desc";
  };
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: { field: string; message: string }[];
  timestamp?: string;
}

// Query parameters schema (matches backend querySchema)
const querySchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  roleName: z.string().optional(),
  isActive: z.boolean().optional(),
  contactId: z.number().positive().optional(),
});

type QueryParams = z.infer<typeof querySchema>;

const API_BASE_URL = "/api/contact-roles";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const fetchContactRoles = async (
  params: QueryParams
): Promise<ContactRolesResponse> => {
  const validatedParams = querySchema.parse(params);
  const response = await api.get<ContactRolesResponse>("", {
    params: validatedParams,
  });
  return response.data;
};

const createContactRole = async (
  data: NewContactRole
): Promise<ContactRole> => {
  const response = await api.post<{
    message: string;
    contactRole: ContactRole;
  }>("", data);
  return response.data.contactRole;
};

export const useContactRoles = (params: QueryParams) => {
  return useQuery<ContactRolesResponse, AxiosError<ErrorResponse>>({
    queryKey: [
      "contactRoles",
      params.page,
      params.limit,
      params.search,
      params.sortBy,
      params.sortOrder,
      params.roleName,
      params.isActive,
      params.contactId,
    ],
    queryFn: () => fetchContactRoles(params),
    staleTime: 60 * 1000,
  });
};

export const useCreateContactRole = () => {
  const queryClient = useQueryClient();

  return useMutation<ContactRole, AxiosError<ErrorResponse>, NewContactRole>({
    mutationFn: createContactRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactRoles"] });
    },
    onError: (error) => {
      console.error(
        "Error creating contact role:",
        error.response?.data || error.message
      );
    },
  });
};
