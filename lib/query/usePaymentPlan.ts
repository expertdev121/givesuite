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

const PaymentPlanSchema = z.object({
  id: z.number(),
  planName: z.string().nullable(),
  frequency: z.enum([
    "weekly",
    "monthly",
    "quarterly",
    "biannual",
    "annual",
    "one_time",
    "custom",
  ]),
  totalPlannedAmount: z.string(),
  currency: z.enum(["USD", "ILS", "EUR", "JPY", "GBP", "AUD", "CAD", "ZAR"]),
  installmentAmount: z.string(),
  numberOfInstallments: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  nextPaymentDate: z.string().nullable(),
  installmentsPaid: z.number(),
  totalPaid: z.string(),
  totalPaidUsd: z.string().nullable(),
  exchangeRate: z.string(),
  remainingAmount: z.string(),
  planStatus: PlanStatusEnum,
  autoRenew: z.boolean(),
  remindersSent: z.number(),
  lastReminderDate: z.string().nullable(),
  isActive: z.boolean(),
  notes: z.string().nullable(),
  internalNotes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  pledgeId: z.number().optional(),
});

const PaymentPlansResponseSchema = z.object({
  paymentPlans: z.array(PaymentPlanSchema),
});

type PaymentPlansResponse = z.infer<typeof PaymentPlansResponseSchema>;

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
