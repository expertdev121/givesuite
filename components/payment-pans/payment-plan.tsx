"use client";

import React, { useState } from "react";
import { useQueryState } from "nuqs";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  MoreHorizontal,
  Search,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { usePaymentPlans } from "@/lib/query/usePaymentPlan";
import PaymentPlanDialog from "../forms/payment-plan-dialog";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PlanStatusEnum = z.enum([
  "active",
  "completed",
  "cancelled",
  "paused",
  "overdue",
]);

type PlanStatusType = z.infer<typeof PlanStatusEnum>;

interface PaymentPlansTableProps {
  contactId?: number;
}

export default function PaymentPlansTable({
  contactId,
}: PaymentPlansTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [pledgeId] = useQueryState("pledgeId", {
    parse: (value) => {
      if (!value) return null;
      const parsed = parseInt(value);
      return isNaN(parsed) ? null : parsed;
    },
    serialize: (value) =>
      value !== null && value !== undefined ? value.toString() : "",
  });

  console.log(pledgeId);

  const [page, setPage] = useQueryState("page", {
    parse: (value) => parseInt(value) || 1,
    serialize: (value) => value.toString(),
  });
  const [limit] = useQueryState("limit", {
    parse: (value) => parseInt(value) || 10,
    serialize: (value) => value.toString(),
  });
  const [search, setSearch] = useQueryState("search");
  const [planStatus, setPlanStatus] = useQueryState<PlanStatusType | null>(
    "planStatus",
    {
      parse: (value) => {
        if (
          value === "active" ||
          value === "completed" ||
          value === "cancelled" ||
          value === "paused" ||
          value === "overdue"
        ) {
          return value as PlanStatusType;
        }
        return null;
      },
      serialize: (value) => value ?? "",
    }
  );

  const currentPage = page ?? 1;
  const currentLimit = limit ?? 10;

  const queryParams = {
    ...(pledgeId ? { pledgeId } : contactId ? { contactId } : {}),
    page: currentPage,
    limit: currentLimit,
    search: search || undefined,
    planStatus: planStatus || undefined,
  };

  const { data, isLoading, error } = usePaymentPlans(queryParams);

  const toggleRowExpansion = (planId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: string, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string | null) => {
    return dateString ? new Date(dateString).toLocaleDateString() : "N/A";
  };

  const getStatusColor = (status: PlanStatusType | null) => {
    switch (status) {
      case "active":
      case "completed":
        return "bg-green-100 text-green-800";
      case "paused":
      case "overdue":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (error) {
    return (
      <Alert className="mx-4 my-6">
        <AlertDescription>
          Failed to load payment plans data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Show message if neither pledgeId nor contactId is provided
  if (!pledgeId && !contactId) {
    return (
      <Alert className="mx-4 my-6">
        <AlertDescription>
          No pledge or contact specified. Please provide either a pledgeId in
          the URL or a contactId prop.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search payment plans..."
                value={search || ""}
                onChange={(e) => setSearch(e.target.value || null)}
                className="pl-10"
              />
            </div>

            <Select
              value={planStatus ?? ""}
              onValueChange={(value) => {
                if (
                  value === "active" ||
                  value === "completed" ||
                  value === "cancelled" ||
                  value === "paused" ||
                  value === "overdue"
                ) {
                  setPlanStatus(value as PlanStatusType);
                } else {
                  setPlanStatus(null);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            {
              <PaymentPlanDialog
                pledgeId={pledgeId ?? undefined}
                contactId={contactId}
                showPledgeSelector
              />
            }
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Pledge Dt
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Detail
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Rec Type
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Rec Dt 1
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Rec Dt 2
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Pledge $USD
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Pledge $Cur
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Paid $USD
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Paid $Cur
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Bal $USD
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Bal $Cur
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Sched $Cur
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Bal-Sched $Cur
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Notes
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton with safe limit value
                  Array.from({ length: currentLimit }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.paymentPlans.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={16}
                      className="text-center py-8 text-gray-500"
                    >
                      No payment plans found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.paymentPlans.map((plan) => (
                    <React.Fragment key={plan.id}>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(plan.id)}
                            className="p-1"
                          >
                            {expandedRows.has(plan.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(plan.startDate)}
                        </TableCell>
                        <TableCell>{plan.planName || "N/A"}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                              plan.planStatus
                            )}`}
                          >
                            {plan.planStatus || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(plan.startDate)}</TableCell>
                        <TableCell>
                          {formatDate(plan.nextPaymentDate)}
                        </TableCell>
                        <TableCell>
                          {plan.totalPaidUsd
                            ? formatCurrency(plan.totalPaidUsd, "USD")
                            : formatCurrency(plan.totalPlannedAmount, "USD")}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            plan.totalPlannedAmount,
                            plan.currency
                          )}
                        </TableCell>
                        <TableCell>
                          {plan.totalPaidUsd
                            ? formatCurrency(plan.totalPaidUsd, "USD")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(plan.totalPaid, plan.currency)}
                        </TableCell>
                        <TableCell>
                          {plan.totalPaidUsd
                            ? formatCurrency(
                                (
                                  parseFloat(plan.totalPlannedAmount) -
                                  parseFloat(plan.totalPaidUsd)
                                ).toString(),
                                "USD"
                              )
                            : formatCurrency(plan.remainingAmount, "USD")}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(plan.remainingAmount, plan.currency)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            plan.installmentAmount,
                            plan.currency
                          )}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(
                            (
                              parseFloat(plan.remainingAmount) -
                              parseFloat(plan.installmentAmount)
                            ).toString(),
                            plan.currency
                          )}
                        </TableCell>
                        <TableCell>
                          {plan.notes || plan.internalNotes || "-"}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="p-1">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                Edit Payment Plan
                              </DropdownMenuItem>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                Delete Payment Plan
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row Content */}
                      {expandedRows.has(plan.id) && (
                        <TableRow>
                          <TableCell colSpan={16} className="bg-gray-50 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Financial Details */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">
                                  Financial Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Installment Amount:
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(
                                        plan.installmentAmount,
                                        plan.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Total Paid:
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(
                                        plan.totalPaid,
                                        plan.currency
                                      )}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Total Paid (USD):
                                    </span>
                                    <span className="font-medium">
                                      {plan.totalPaidUsd
                                        ? formatCurrency(
                                            plan.totalPaidUsd,
                                            "USD"
                                          )
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Remaining Amount:
                                    </span>
                                    <span className="font-medium">
                                      {formatCurrency(
                                        plan.remainingAmount,
                                        plan.currency
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Additional Details */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">
                                  Additional Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Number of Installments:
                                    </span>
                                    <span className="font-medium">
                                      {plan.numberOfInstallments}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Installments Paid:
                                    </span>
                                    <span className="font-medium">
                                      {plan.installmentsPaid}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      End Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(plan.endDate)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Next Payment Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(plan.nextPaymentDate)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Auto Renew:
                                    </span>
                                    <span className="font-medium">
                                      {plan.autoRenew ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Reminders Sent:
                                    </span>
                                    <span className="font-medium">
                                      {plan.remindersSent}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Last Reminder Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(plan.lastReminderDate)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Internal Notes:
                                    </span>
                                    <span className="font-medium">
                                      {plan.internalNotes || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination with safe values */}
          {data && data.paymentPlans.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * currentLimit + 1} to{" "}
                {Math.min(currentPage * currentLimit, data.paymentPlans.length)}{" "}
                of {data.paymentPlans.length} payment plans
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">
                    Page {currentPage}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={data.paymentPlans.length < currentLimit}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
