import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface Category {
  categoryId: number;
  categoryName: string;
  categoryDescription: string | null;
  totalPledgedUsd: number;
  totalPaidUsd: number;
  currentBalanceUsd: number;
  pledgeCount: number;
}

export function useContactCategories(contactId: number) {
  return useQuery<Category[]>({
    queryKey: ["contactCategories", contactId],
    queryFn: async () => {
      const response = await axios.get(`/api/contacts/${contactId}/categories`);
      return response.data.categories;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });
}
