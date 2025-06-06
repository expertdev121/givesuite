import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { z } from "zod";
import { categorySchema } from "../form-schemas/category";

type CategoryPayload = z.infer<typeof categorySchema>;

interface CategoryResponse {
  message: string;
  category: {
    id: number;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: { field: string; message: string }[];
  timestamp?: string;
}

const createCategory = async (
  payload: CategoryPayload
): Promise<CategoryResponse> => {
  const response = await axios.post<CategoryResponse>(
    "/api/categories",
    payload
  );
  return response.data;
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation<
    CategoryResponse,
    AxiosError<ErrorResponse>,
    CategoryPayload
  >({
    mutationFn: createCategory,
    onSuccess: (data) => {
      console.log("Category created successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => {
      if (error.response?.data) {
        const { error: errorTitle, message, details } = error.response.data;
        console.error("Error creating category:", errorTitle, message, details);
      } else {
        console.error("Error creating category:", error.message);
      }
    },
  });
};
