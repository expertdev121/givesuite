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
  BadgeDollarSign,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Search,
} from "lucide-react";
import { usePledgesQuery } from "@/lib/query/usePledgeData";
import { LinkButton } from "../ui/next-link";
import PledgeDialog from "../forms/pledge-form";
import PaymentDialogClient from "../forms/payment-dialog";
import PaymentPlanDialog from "../forms/payment-plan-dialog";
import Link from "next/link";
import useContactId from "@/hooks/use-contact-id";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeletePledge, PledgeQueryParams } from "@/lib/query/pledge/usePledgeQuery";
import { formatDate } from "@/lib/utils";

const QueryParamsSchema = z.object({
  contactId: z.number().positive(),
  categoryId: z.number().positive().nullable().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["fullyPaid", "partiallyPaid", "unpaid"]).optional(),
  search: z.string().optional(),
});

type StatusType = "fullyPaid" | "partiallyPaid" | "unpaid";

export default function PledgesTable() {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pledgeToDelete, setPledgeToDelete] = useState<{
    id: number;
    description: string;
  } | null>(null);

  const { mutate: deletePledge, isPending: isDeleting } = useDeletePledge();

  const [categoryId] = useQueryState("categoryId", {
    parse: (value) => {
      if (!value) return null;
      const parsed = Number.parseInt(value);
      return isNaN(parsed) ? null : parsed;
    },
    serialize: (value) =>
      value !== null && value !== undefined ? value.toString() : "",
  });
  const [page, setPage] = useQueryState("page", {
    parse: (value) => Number.parseInt(value) || 1,
    serialize: (value) => value.toString(),
  });
  const [limit] = useQueryState("limit", {
    parse: (value) => Number.parseInt(value) || 10,
    serialize: (value) => value.toString(),
  });
  const [search, setSearch] = useQueryState("search");
  const [status, setStatus] = useQueryState<StatusType | null>("status", {
    parse: (value) => {
      if (
        value === "fullyPaid" ||
        value === "partiallyPaid" ||
        value === "unpaid"
      ) {
        return value as StatusType;
      }
      return null;
    },
    serialize: (value) => value ?? "",
  });
  const [startDate] = useQueryState("startDate");
  const [endDate] = useQueryState("endDate");

  const currentPage = page ?? 1;
  const currentLimit = limit ?? 10;

  const contactId = useContactId();

  const queryParams = QueryParamsSchema.parse({
    contactId,
    categoryId: categoryId ?? undefined,
    page: currentPage,
    limit: currentLimit,
    search: search ?? undefined,
    status: status ?? undefined,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
  });

  const pledgeQueryParams: PledgeQueryParams = {
    contactId: queryParams.contactId,
    categoryId: queryParams.categoryId ?? undefined, // Convert null to undefined
    page: queryParams.page,
    limit: queryParams.limit,
    search: queryParams.search,
    status: queryParams.status,
    startDate: queryParams.startDate,
    endDate: queryParams.endDate,
  };

  const { data, isLoading, error } = usePledgesQuery(pledgeQueryParams);
  console.log("contactID in PAYMENT PLAN DIALOG", queryParams.contactId);

  const toggleRowExpansion = (pledgeId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(pledgeId)) {
      newExpanded.delete(pledgeId);
    } else {
      newExpanded.add(pledgeId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: string, currency: string) => {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number.parseFloat(amount));

    // Extract currency symbol and amount
    const currencySymbol = formatted.replace(/[\d,.\s]/g, "");
    const numericAmount = formatted.replace(/[^\d,.\s]/g, "").trim();

    return { symbol: currencySymbol, amount: numericAmount };
  };

  const formatUSDAmount = (amount: string | null) => {
    if (!amount) return "N/A";
    return `$${Number.parseFloat(amount).toLocaleString()}`;
  };

  const handleDeletePledge = (pledgeId: number, pledgeDescription: string) => {
    setPledgeToDelete({ id: pledgeId, description: pledgeDescription });
    setDeleteDialogOpen(true);
  };

  const confirmDeletePledge = () => {
    if (!pledgeToDelete) return;

    deletePledge(pledgeToDelete.id, {
      onSuccess: () => {
        // Remove from expanded rows if it was expanded
        const newExpanded = new Set(expandedRows);
        newExpanded.delete(pledgeToDelete.id);
        setExpandedRows(newExpanded);
        setDeleteDialogOpen(false);
        setPledgeToDelete(null);
      },
      onError: (error) => {
        console.error("Failed to delete pledge:", error);
        // You could also show a toast notification here instead of alert
        alert("Failed to delete pledge. Please try again.");
      },
    });
  };

  const cancelDeletePledge = () => {
    setDeleteDialogOpen(false);
    setPledgeToDelete(null);
  };

  if (error) {
    return (
      <Alert className="mx-4 my-6">
        <AlertDescription>
          Failed to load pledges data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Pledges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search pledges..."
                value={search || ""}
                onChange={(e) => setSearch(e.target.value || null)}
                className="pl-10"
              />
            </div>
            <Select
              value={status as string}
              onValueChange={(value) => {
                if (
                  value === "fullyPaid" ||
                  value === "partiallyPaid" ||
                  value === "unpaid"
                ) {
                  setStatus(value as StatusType);
                } else {
                  setStatus(null);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fullyPaid">$ Fully Paid</SelectItem>
                <SelectItem value="partiallyPaid">$ Partially Paid</SelectItem>
                <SelectItem value="unpaid">$ Unpaid</SelectItem>
              </SelectContent>
            </Select>
            <PledgeDialog contactId={contactId as number} />
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Pledge Date
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Pledge Details
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">
                    Pledge Amount (USD)
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">
                    Pledge Amount
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">
                    Paid (USD)
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900 text-right">
                    Paid
                  </TableHead>
                  <TableHead className="font-semibold  text-right">
                    Balance (USD)
                  </TableHead>
                  <TableHead className="font-semibold  text-right">
                    Balance
                  </TableHead>
                  <TableHead className="font-semibold  text-right">
                    Scheduled
                  </TableHead>
                  <TableHead className="font-semibold  text-right">
                    Unscheduled
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
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.pledges.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={13}
                      className="text-center py-8 text-gray-500"
                    >
                      No pledges found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.pledges.map((pledge) => {
                    return (
                      <React.Fragment key={pledge.id}>
                        <TableRow className="hover:bg-gray-50">
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(pledge.id)}
                              className="p-1"
                            >
                              {expandedRows.has(pledge.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatDate(pledge.pledgeDate)}
                          </TableCell>
                          <TableCell>
                            {pledge.categoryName?.split(" ")[0]} {">"}{" "}
                            {pledge.description || "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatUSDAmount(pledge.originalAmountUsd)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              <span>
                                {formatCurrency(pledge.originalAmount, pledge.currency).symbol}
                              </span>
                              <span>
                                {formatCurrency(pledge.originalAmount, pledge.currency).amount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatUSDAmount(pledge.totalPaidUsd)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              <span>
                                {formatCurrency(pledge.totalPaid, pledge.currency).symbol}
                              </span>
                              <span>
                                {formatCurrency(pledge.totalPaid, pledge.currency).amount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatUSDAmount(pledge.balanceUsd)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              <span>
                                {formatCurrency(pledge.balance, pledge.currency).symbol}
                              </span>
                              <span>
                                {formatCurrency(pledge.balance, pledge.currency).amount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              <span>
                                {formatCurrency(pledge.scheduledAmount || "0", pledge.currency).symbol}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(pledge.scheduledAmount || "0", pledge.currency).amount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              <span>
                                {formatCurrency(pledge.unscheduledAmount || "0", pledge.currency).symbol}
                              </span>
                              <span className=" font-medium">
                                {formatCurrency(pledge.unscheduledAmount || "0", pledge.currency).amount}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {pledge.notes || "-"}
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
                                  <Link
                                    href={`/contacts/${contactId}/payments?pledgeId=${pledge.id}`}
                                  >
                                    $ View Payments
                                  </Link>
                                </DropdownMenuItem>
                                {/* <DropdownMenuItem>
                                  <Link
                                    href={`/contacts/${contactId}/payment-plans?pledgeId=${pledge.id}`}
                                  >
                                    $ View Payment Plans
                                  </Link> 
                                </DropdownMenuItem> */}
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() =>
                                    handleDeletePledge(
                                      pledge.id,
                                      pledge.description || "Untitled Pledge"
                                    )
                                  }
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? "Deleting..." : "$ Delete Pledge"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Row Content */}
                        {expandedRows.has(pledge.id) && (
                          <TableRow>
                            <TableCell colSpan={13} className="bg-gray-50 p-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* USD Amounts */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900">
                                    USD Amounts
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Pledge Amount (USD):
                                      </span>
                                      <span className="font-medium">
                                        {pledge.originalAmountUsd
                                          ? `$${Number.parseFloat(
                                            pledge.originalAmountUsd
                                          ).toLocaleString()}`
                                          : "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Paid (USD):
                                      </span>
                                      <span className="font-medium">
                                        {pledge.totalPaidUsd
                                          ? `$${Number.parseFloat(
                                            pledge.totalPaidUsd
                                          ).toLocaleString()}`
                                          : "N/A"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Balance (USD):
                                      </span>
                                      <span className="font-medium">
                                        {pledge.balanceUsd
                                          ? `$${Number.parseFloat(
                                            pledge.balanceUsd
                                          ).toLocaleString()}`
                                          : "N/A"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Payment Plan Status */}
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-gray-900">
                                    Payment Plan Status
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Scheduled Amount:
                                      </span>
                                      <span className="font-medium text-blue-600">
                                        {formatCurrency(pledge.scheduledAmount || "0", pledge.currency).symbol}
                                        {formatCurrency(pledge.scheduledAmount || "0", pledge.currency).amount}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Unscheduled Amount:
                                      </span>
                                      <span className="font-medium text-orange-600">
                                        {formatCurrency(pledge.unscheduledAmount || "0", pledge.currency).symbol}
                                        {formatCurrency(pledge.unscheduledAmount || "0", pledge.currency).amount}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">
                                        Has Payment Plan:
                                      </span>
                                      <span className={`font-medium ${Number.parseFloat(pledge.scheduledAmount || "0") > 0
                                        ? "text-green-600"
                                        : "text-gray-500"
                                        }`}>
                                        {Number.parseFloat(pledge.scheduledAmount || "0") > 0 ? "Yes" : "No"}
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
                                    <div>
                                      <span className="text-gray-600">
                                        Category Description:
                                      </span>
                                      <p className="mt-1 text-gray-900">
                                        {pledge.categoryDescription ||
                                          "No description available"}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-gray-600">
                                        Notes:
                                      </span>
                                      <p className="mt-1 text-gray-900">
                                        {pledge.notes || "No notes available"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Button */}
                              <div className="mt-6 pt-4 flex gap-2 border-t justify-between">
                                <div className="flex gap-2">
                                  <PaymentDialogClient
                                    pledgeId={pledge.id}
                                    amount={Number.parseFloat(pledge.balance)}
                                    currency={pledge.currency}
                                    description={pledge.description ?? ""}
                                  />
                                  <LinkButton
                                    href={`/contacts/${contactId}/payments?pledgeId=${pledge.id}`}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                  >
                                    <BadgeDollarSign className="h-4 w-4" />
                                    View Payments
                                  </LinkButton>
                                </div>

                                <div className="flex gap-2">
                                  <PaymentPlanDialog pledgeId={pledge.id} />
                                  {/* <LinkButton
                                    href={`/contacts/${contactId}/payment-plans?pledgeId=${pledge.id}`}
                                    variant="outline"
                                    className="flex items-center gap-2"
                                  >
                                    <BadgeDollarSign className="h-4 w-4" />
                                    View Plans
                                  </LinkButton> */}
                                </div>
                                {/* or */}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination with safe values */}
          {data && data.pledges.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * currentLimit + 1} to{" "}
                {Math.min(currentPage * currentLimit, data.pledges.length)} of{" "}
                {data.pledges.length} pledges
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
                  disabled={data.pledges.length < currentLimit}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pledge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the pledge{" "}
              {pledgeToDelete?.description || "Untitled Pledge"}? This action
              cannot be undone and will permanently remove the pledge and all
              associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={cancelDeletePledge}
              disabled={isDeleting}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePledge}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Pledge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}