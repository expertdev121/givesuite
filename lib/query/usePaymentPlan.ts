/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { z } from "zod";

const PlanStatusEnum = z.enum([
  "active",
  "completed",
  "cancelled",
  "paused",
  "overdue",
]);

interface UsePaymentPlansParams {
  pledgeId?: number;
  contactId?: number;
  page?: number;
  limit?: number;
  search?: string;
  planStatus?: z.infer<typeof PlanStatusEnum>;
}

export const usePaymentPlans = ({
  pledgeId,
  contactId,
  page = 1,
  limit = 10,
  search,
  planStatus,
}: UsePaymentPlansParams) => {
  return useQuery<any, Error>({
    queryKey: [
      "paymentPlans",
      { pledgeId, contactId, page, limit, search, planStatus },
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (search) params.append("search", search);
      if (planStatus) params.append("planStatus", planStatus);
      let url: string;
      if (pledgeId) {
        url = `/api/payment-plans/${pledgeId}`;
      } else if (contactId) {
        url = `/api/contacts/${contactId}/payment-plans`;
      } else {
        throw new Error("Either pledgeId or contactId must be provided");
      }
      const response = await axios.get(url, { params });
      return response.data;
    },
    enabled: !!(pledgeId || contactId),
    staleTime: 60 * 1000,
  });
};
