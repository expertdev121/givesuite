import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types based on your schema
export interface StudentRoleFormData {
  contactId: number;
  program: "LH" | "LLC" | "ML" | "Kollel" | "Madrich";
  status:
    | "Student"
    | "Active Soldier"
    | "Staff"
    | "Withdrew"
    | "Transferred Out"
    | "Left Early"
    | "Asked to Leave";
  year: string;
  track?: string;
  machzor?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  additionalNotes?: string;
}

export interface StudentRole {
  id: number;
  contactId: number;
  program: "LH" | "LLC" | "ML" | "Kollel" | "Madrich";
  status:
    | "Student"
    | "Active Soldier"
    | "Staff"
    | "Withdrew"
    | "Transferred Out"
    | "Left Early"
    | "Asked to Leave";
  year: string;
  track?: string;
  machzor?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  additionalNotes?: string;
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
  activeStudentRoles: StudentRole[];
  allStudentRoles: StudentRole[];
  studentRoleHistory: StudentRole[];
}

// Student Role Mutations
export const useCreateStudentRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: StudentRoleFormData) => {
      const response = await fetch("/api/student-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create student role");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["studentRoles"] });
      queryClient.invalidateQueries({
        queryKey: ["student-roles", variables.contactId],
      });
      queryClient.invalidateQueries({
        queryKey: ["contact-details", variables.contactId],
      });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast.success("Student role added successfully!");
    },
    onError: (error) => {
      console.error("Error creating student role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create student role"
      );
    },
  });
};

// Student Role Queries
export const useStudentRolesQuery = (params?: {
  contactId?: number;
  page?: number;
  limit?: number;
  search?: string;
  program?: "LH" | "LLC" | "ML" | "Kollel" | "Madrich";
  status?:
    | "Student"
    | "Active Soldier"
    | "Staff"
    | "Withdrew"
    | "Transferred Out"
    | "Left Early"
    | "Asked to Leave";
  year?: string;
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
  if (params?.program) searchParams.append("program", params.program);
  if (params?.status) searchParams.append("status", params.status);
  if (params?.year) searchParams.append("year", params.year);
  if (params?.isActive !== undefined)
    searchParams.append("isActive", params.isActive.toString());
  if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
  if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

  return useQuery({
    queryKey: ["studentRoles", params],
    queryFn: async () => {
      const response = await fetch(
        `/api/student-roles?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch student roles");
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useStudentRolesByContactQuery = (contactId: number) => {
  return useStudentRolesQuery({ contactId, limit: 100 });
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

// Update Student Role Mutation
export const useUpdateStudentRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<StudentRoleFormData>;
    }) => {
      const response = await fetch(`/api/student-roles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update student role");
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["studentRoles"] });
      queryClient.invalidateQueries({
        queryKey: ["student-roles", variables.id],
      });

      toast.success("Student role updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating student role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update student role"
      );
    },
  });
};

// Delete Student Role Mutation
export const useDeleteStudentRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: number) => {
      const response = await fetch(`/api/student-roles/${roleId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete student role");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentRoles"] });
      toast.success("Student role deleted successfully!");
    },
    onError: (error) => {
      console.error("Error deleting student role:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete student role"
      );
    },
  });
};

// Deactivate Student Role Mutation
export const useDeactivateStudentRoleMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: number) => {
      const response = await fetch(`/api/student-roles/${roleId}/deactivate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to deactivate student role");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentRoles"] });
      toast.success("Student role deactivated successfully!");
    },
    onError: (error) => {
      console.error("Error deactivating student role:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to deactivate student role"
      );
    },
  });
};

// Get Student Role Statistics
export const useStudentRoleStatsQuery = (params?: {
  program?: "LH" | "LLC" | "ML" | "Kollel" | "Madrich";
  year?: string;
  status?: string;
}) => {
  const searchParams = new URLSearchParams();

  if (params?.program) searchParams.append("program", params.program);
  if (params?.year) searchParams.append("year", params.year);
  if (params?.status) searchParams.append("status", params.status);

  return useQuery({
    queryKey: ["studentRoleStats", params],
    queryFn: async () => {
      const response = await fetch(
        `/api/student-roles/stats?${searchParams.toString()}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to fetch student role statistics"
        );
      }

      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};
