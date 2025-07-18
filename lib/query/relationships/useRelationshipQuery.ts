import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface RelationshipFormData {
  contactId: number;
  relatedContactId: number;
  relationshipType:
    | "mother"
    | "father"
    | "grandmother"
    | "grandfather"
    | "sister"
    | "spouse"
    | "brother"
    | "partner"
    | "step-brother"
    | "step-sister"
    | "stepmother"
    | "stepfather"
    | "divorced co-parent"
    | "separated co-parent"
    | "legal guardian"
    | "step-parent"
    | "legal guardian partner"
    | "grandparent"
    | "aunt"
    | "uncle"
    | "aunt/uncle";
  isActive: boolean;
  notes?: string;
}

export interface Relationship {
  id: number;
  contactId: number;
  relatedContactId: number;
  relationshipType:
    | "mother"
    | "father"
    | "grandmother"
    | "grandfather"
    | "sister"
    | "spouse"
    | "brother"
    | "partner"
    | "step-brother"
    | "step-sister"
    | "stepmother"
    | "stepfather"
    | "divorced co-parent"
    | "separated co-parent"
    | "legal guardian"
    | "step-parent"
    | "legal guardian partner"
    | "grandparent"
    | "aunt"
    | "uncle"
    | "aunt/uncle";
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  relatedContact?: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
}

export interface ContactDetails {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  activeRelationships: Relationship[];
  allRelationships: Relationship[];
  relationshipHistory: Relationship[];
}

export interface ContactSearchResult {
  contacts: Array<{
    id: number;
    firstName: string;
    lastName: string;
    fullName?: string;
    email: string | null;
    phone: string | null;
    title: string | null;
    gender: string | null;
    address: string | null;
    totalPledgedUsd: number;
    totalPaidUsd: number;
    currentBalanceUsd: number;
    studentProgram: string | null;
    studentStatus: string | null;
    roleName: string | null;
    lastPaymentDate: Date | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const useCreateRelationshipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RelationshipFormData) => {
      const response = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create relationship");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({
        queryKey: ["relationships", variables.contactId],
      });
      queryClient.invalidateQueries({
        queryKey: ["relationships", variables.relatedContactId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contact-details", variables.contactId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contact-details", variables.relatedContactId],
      });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast.success("Relationship added successfully!");
    },
    onError: (error) => {
      console.error("Error creating relationship:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create relationship"
      );
    },
  });
};

export const useRelationshipsQuery = (params?: {
  contactId?: number;
  relatedContactId?: number;
  page?: number;
  limit?: number;
  search?: string;
  relationshipType?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) => {
  const searchParams = new URLSearchParams();

  if (params?.contactId)
    searchParams.append("contactId", params.contactId.toString());
  if (params?.relatedContactId)
    searchParams.append("relatedContactId", params.relatedContactId.toString());
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.search) searchParams.append("search", params.search);
  if (params?.relationshipType)
    searchParams.append("relationshipType", params.relationshipType);
  if (params?.isActive !== undefined)
    searchParams.append("isActive", params.isActive.toString());
  if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

  return useQuery({
    queryKey: ["relationships", params],
    queryFn: async () => {
      const response = await fetch(
        `/api/relationships?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch relationships");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useRelationshipsByContactQuery = (contactId: number) => {
  return useRelationshipsQuery({ contactId, limit: 100 });
};

export const useContactSearchQuery = (
  searchTerm: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["contactSearch", searchTerm],
    queryFn: async (): Promise<ContactSearchResult> => {
      const searchParams = new URLSearchParams({
        search: searchTerm,
        limit: "20",
      });

      const response = await fetch(`/api/contacts?${searchParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search contacts");
      }

      return response.json();
    },
    enabled: options?.enabled ?? true,
    staleTime: 2 * 60 * 1000,
  });
};

export const useContactDetailsQuery = (contactId: number) => {
  return useQuery({
    queryKey: ["contact-details", contactId],
    queryFn: async (): Promise<ContactDetails> => {
      const response = await fetch(`/api/contacts/${contactId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch contact details");
      }

      return response.json();
    },
    enabled: !!contactId && contactId > 0,
    staleTime: 2 * 60 * 1000,
  });
};

export const useUpdateRelationshipMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<RelationshipFormData>;
    }) => {
      const response = await fetch(`/api/relationships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update relationship");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries();
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      queryClient.invalidateQueries({
        queryKey: ["relationships", variables.id],
      });

      toast.success("Relationship updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating relationship:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update relationship"
      );
    },
  });
};

export const useDeleteRelationshipMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (relationshipId: number) => {
      const response = await fetch(`/api/relationships/${relationshipId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete relationship");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      toast.success("Relationship deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting relationship:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete relationship"
      );
    },
  });
};

export const useDeactivateRelationshipMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (relationshipId: number) => {
      const response = await fetch(
        `/api/relationships/${relationshipId}/deactivate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to deactivate relationship");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relationships"] });
      toast.success("Relationship deactivated successfully!");
    },
    onError: (error) => {
      console.error("Error deactivating relationship:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deactivate relationship"
      );
    },
  });
};

export const useRelationshipNetworkQuery = (contactId: number, depth = 2) => {
  return useQuery({
    queryKey: ["relationshipNetwork", contactId, depth],
    queryFn: async () => {
      const response = await fetch(
        `/api/relationships/network/${contactId}?depth=${depth}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch relationship network"
        );
      }

      return response.json();
    },
    enabled: !!contactId && contactId > 0,
    staleTime: 10 * 60 * 1000,
  });
};
