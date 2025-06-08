import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types based on your schema
export interface ContactRoleFormData {
  contactId: number;
  roleName: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  notes?: string;
}

export interface ContactRole {
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

export interface ContactDetails {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    email?: string;
    phone?: string;
  };
  activeRoles: ContactRole[];
  allRoles: ContactRole[];
  roleHistory: ContactRole[];
}

// Contact Role Mutations
export const useCreateContactRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ContactRoleFormData) => {
      const response = await fetch("/api/contact-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create contact role");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["contactRoles"] });
      queryClient.invalidateQueries({
        queryKey: ["contact-roles", variables.contactId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contact-details", variables.contactId],
      });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast.success("Contact role added successfully!");
    },
    onError: (error) => {
      console.error("Error creating contact role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create contact role"
      );
    },
  });
};

// Contact Role Queries
export const useContactRolesQuery = (params?: {
  contactId?: number;
  page?: number;
  limit?: number;
  search?: string;
  roleName?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) => {
  const searchParams = new URLSearchParams();

  if (params?.contactId)
    searchParams.append("contactId", params.contactId.toString());
  if (params?.page) searchParams.append("page", params.page.toString());
  if (params?.limit) searchParams.append("limit", params.limit.toString());
  if (params?.search) searchParams.append("search", params.search);
  if (params?.roleName) searchParams.append("roleName", params.roleName);
  if (params?.isActive !== undefined)
    searchParams.append("isActive", params.isActive.toString());
  if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

  return useQuery({
    queryKey: ["contactRoles", params],
    queryFn: async () => {
      const response = await fetch(
        `/api/contact-roles?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch contact roles");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useContactRolesByContactQuery = (contactId: number) => {
  return useContactRolesQuery({ contactId, limit: 100 });
};

// Contact Details Query (for the dialog)
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
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Update Contact Role Mutation
export const useUpdateContactRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<ContactRoleFormData>;
    }) => {
      const response = await fetch(`/api/contact-roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update contact role");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contactRoles"] });
      queryClient.invalidateQueries({
        queryKey: ["contact-roles", variables.id],
      });

      toast.success("Contact role updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating contact role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update contact role"
      );
    },
  });
};

// Delete Contact Role Mutation
export const useDeleteContactRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: number) => {
      const response = await fetch(`/api/contact-roles/${roleId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete contact role");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactRoles"] });
      toast.success("Contact role deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting contact role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete contact role"
      );
    },
  });
};

// Deactivate Contact Role Mutation
export const useDeactivateContactRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: number) => {
      const response = await fetch(`/api/contact-roles/${roleId}/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to deactivate contact role");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contactRoles"] });
      toast.success("Contact role deactivated successfully!");
    },
    onError: (error) => {
      console.error("Error deactivating contact role:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deactivate contact role"
      );
    },
  });
};
