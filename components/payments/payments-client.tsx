/* eslint-disable @typescript-eslint/no-unused-vars */
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  BadgeDollarSignIcon,
  MoreHorizontal,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { usePaymentsQuery } from "@/lib/query/usePayments";
import { LinkButton } from "../ui/next-link";
import FactsDialog from "../facts-iframe";
import Link from "next/link";
import PaymentFormDialog from "../forms/payment-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const PaymentStatusEnum = z.enum([
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
  "processing",
]);

type PaymentStatusType = z.infer<typeof PaymentStatusEnum>;

interface PaymentsTableProps {
  contactId?: number;
}

export default function PaymentsTable({ contactId }: PaymentsTableProps) {
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

  const [page, setPage] = useQueryState("page", {
    parse: (value) => parseInt(value) || 1,
    serialize: (value) => value.toString(),
  });
  const [limit] = useQueryState("limit", {
    parse: (value) => parseInt(value) || 10,
    serialize: (value) => value.toString(),
  });
  const [search, setSearch] = useQueryState("search");
  const [paymentStatus, setPaymentStatus] =
    useQueryState<PaymentStatusType | null>("paymentStatus", {
      parse: (value) => {
        if (
          value === "pending" ||
          value === "completed" ||
          value === "failed" ||
          value === "cancelled" ||
          value === "refunded" ||
          value === "processing"
        ) {
          return value as PaymentStatusType;
        }
        return null;
      },
      serialize: (value) => value ?? "",
    });

  const currentPage = page ?? 1;
  const currentLimit = limit ?? 10;

  const queryParams = {
    ...(pledgeId ? { pledgeId } : contactId ? { contactId } : {}),
    page: currentPage,
    limit: currentLimit,
    search: search || undefined,
    paymentStatus: paymentStatus || undefined,
  };

  const { data, isLoading, error } = usePaymentsQuery(queryParams);

  // Function to toggle expanded row
  const toggleExpandedRow = (paymentId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
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

  if (error) {
    return (
      <Alert className="mx-4 my-6">
        <AlertDescription>
          Failed to load payments data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

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
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search payments..."
                value={search || ""}
                onChange={(e) => setSearch(e.target.value || null)}
                className="pl-10"
              />
            </div>

            <Select
              value={paymentStatus ?? ""}
              onValueChange={(value) => {
                if (
                  value === "pending" ||
                  value === "completed" ||
                  value === "failed" ||
                  value === "cancelled" ||
                  value === "refunded" ||
                  value === "processing"
                ) {
                  setPaymentStatus(value as PaymentStatusType);
                } else {
                  setPaymentStatus(null);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
              </SelectContent>
            </Select>
            <PaymentFormDialog
              pledgeId={pledgeId ?? undefined}
              contactId={contactId}
              showPledgeSelector
            />
            <FactsDialog />
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold text-gray-900">
                    Scheduled
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Effective
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Total
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Applied
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Method Detail
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Receipt Number
                  </TableHead>
                  <TableHead className="font-semibold text-gray-900">
                    Notes
                  </TableHead>
                  <TableHead className="w-12">Actions</TableHead>
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
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-gray-500"
                    >
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.payments.map((payment) => (
                    <React.Fragment key={payment.id}>
                      <TableRow className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {payment.receivedDate
                            ? formatDate(
                                new Date(
                                  new Date(payment.receivedDate).setDate(
                                    new Date(payment.receivedDate).getDate() +
                                      14
                                  )
                                ).toISOString()
                              )
                            : "N/A"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(payment.paymentDate)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>{payment.paymentMethod || "-"}</TableCell>
                        <TableCell>{payment.referenceNumber || "-"}</TableCell>
                        <TableCell>{payment.notes || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpandedRow(payment.id)}
                            className="p-1 h-6 w-6"
                          >
                            {expandedRows.has(payment.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row Content */}
                      {expandedRows.has(payment.id) && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-gray-50 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* USD Amounts */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">
                                  USD Amounts
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Amount (USD):
                                    </span>
                                    <span className="font-medium">
                                      {payment.amountUsd
                                        ? `$${parseFloat(
                                            payment.amountUsd
                                          ).toLocaleString()}`
                                        : "N/A"}
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
                                      Received Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(payment.receivedDate)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Processed Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(payment.processedDate)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Check Number:
                                    </span>
                                    <span className="font-medium">
                                      {payment.checkNumber || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Receipt Number:
                                    </span>
                                    <span className="font-medium">
                                      {payment.receiptNumber || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Receipt Issued:
                                    </span>
                                    <span className="font-medium">
                                      {payment.receiptIssued ? "Yes" : "No"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Receipt Issued Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(payment.receiptIssuedDate)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Payment Plan ID:
                                    </span>
                                    <span className="font-medium">
                                      {payment.paymentPlanId || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="mt-6 pt-4 flex justify-end gap-2 border-t">
                              <LinkButton
                                variant="secondary"
                                href={`/contacts/${contactId}/payment-plans?pledgeId=${
                                  pledgeId || payment.pledgeId
                                }`}
                                className="flex items-center gap-2"
                              >
                                <BadgeDollarSignIcon className="h-4 w-4" />
                                Payment Plans
                              </LinkButton>
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
          {data && data.payments.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {(currentPage - 1) * currentLimit + 1} to{" "}
                {Math.min(currentPage * currentLimit, data.payments.length)} of{" "}
                {data.payments.length} payments
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
                  disabled={data.payments.length < currentLimit}
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
