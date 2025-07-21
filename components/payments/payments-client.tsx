"use client";

import React, { useState, Dispatch, SetStateAction } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Search,
  BadgeDollarSignIcon,
  ChevronDown,
  ChevronRight,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  useDeletePaymentMutation,
  usePaymentsQuery,
  Payment as ApiPayment, // Alias ApiPayment to avoid naming conflict
} from "@/lib/query/payments/usePaymentQuery";
import { LinkButton } from "../ui/next-link";
import FactsDialog from "../facts-iframe";
import PaymentFormDialog from "../forms/payment-dialog";
// Assuming this path is correct and the component exists
import EditPaymentDialog from "@/app/contacts/[contactId]/payments/__components/edit-payment";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { usePledgeByIdQuery } from "@/lib/query/pledge/usePledgeQuery";

// Removed local Allocation and Payment interfaces.
// We will now directly use ApiPayment from usePaymentQuery.

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
  // Use ApiPayment directly for selectedPayment state
  const [selectedPayment, setSelectedPayment] = useState<ApiPayment | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleOpenChangeEditDialog = (open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setTimeout(() => setSelectedPayment(null), 300);
    }
  };

  const formatUSDAmount = (amount: string | null) => {
  if (!amount) return "$0";
  const rounded = Math.round(Number.parseFloat(amount));
  return `$${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

  const [pledgeId] = useQueryState("pledgeId", {
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
  // Use the ApiPayment type for selectedPayment in usePledgeByIdQuery
  const { data: pledgeData, isLoading: isPledgeLoading } = usePledgeByIdQuery(
    selectedPayment?.pledgeId ?? 0 // pledgeId is now number | null from ApiPayment
  );

  const deletePaymentMutation = useDeletePaymentMutation();

  // No cast needed here, as selectedPayment is now of type ApiPayment
  const handlePaymentRowClick = (payment: ApiPayment) => {
    setSelectedPayment(payment);
    setIsEditDialogOpen(true);
  };

  const toggleExpandedRow = (paymentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleDeletePayment = async (payment: ApiPayment) => {
    setDeletingPaymentId(payment.id);
    try {
      await deletePaymentMutation.mutateAsync({
        paymentId: payment.id,
      });
      toast.success(`Payment #${payment.id} deleted successfully`);
      setExpandedRows((prev) => {
        const newSet = new Set(prev);
        newSet.delete(payment.id);
        return newSet;
      });
    } catch (error) {
      console.error("Failed to delete payment:", error);
      toast.error(`Failed to delete payment #${payment.id}`);
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const formatCurrency = (amount: string, currency: string = "USD") => {
    try {
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number.parseFloat(amount));

      const currencySymbol = formatted.replace(/[\d,.\s]/g, "");
      const numericAmount = formatted.replace(/[^\d,.\s]/g, "").trim();

      return { symbol: currencySymbol, amount: numericAmount };
    } catch (error) {
      return { symbol: "$", amount: "Invalid" };
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      case "refunded":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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
      {/* Edit Payment Dialog */}
      {selectedPayment && (
        <EditPaymentDialog
          open={isEditDialogOpen}
          onOpenChange={handleOpenChangeEditDialog}
          payment={selectedPayment}
        />
      )}
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
              value={paymentStatus ?? "payment"}
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
              showPledgeSelector={true}
              amount={0}
              currency="USD"
              description=""
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
                  // Loading skeleton
                  Array.from({ length: currentLimit }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 8 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : data?.payments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.payments.map((payment) => (
                    <React.Fragment key={payment.id}>
                      <TableRow
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handlePaymentRowClick(payment)}
                      >
                        <TableCell className="font-medium">
                          {formatDate(payment.paymentDate)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatDate(payment.receivedDate || "")}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {
                                formatCurrency(payment.amount, payment.currency)
                                  .symbol
                              }
                              {
                                formatCurrency(payment.amount, payment.currency)
                                  .amount
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              payment.paymentStatus
                            )}`}
                          >
                            {payment.paymentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize">
                          {payment.methodDetail?.replace("_", " ") || "-"}
                        </TableCell>
                        <TableCell>
                          {payment.referenceNumber ||
                            payment.checkNumber ||
                            "-"}
                        </TableCell>
                        <TableCell>{payment.notes || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => toggleExpandedRow(payment.id, e)}
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
                          <TableCell colSpan={8} className="bg-gray-50 p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Payment Details */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">
                                  Payment Details
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Payment ID:
                                    </span>
                                    <span className="font-medium">
                                      #{payment.id}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Scheduled Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(payment.paymentDate)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Effective Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(payment.receivedDate || "")}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Payment (USD):
                                    </span>
                                    <span className="font-medium">
                                      {formatUSDAmount(payment.amountUsd)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Amount (Pledge Currency)
                                    </span>
                                    <span className="font-medium">
                                      {
                                        formatCurrency(
                                          payment.amount,
                                          payment?.currency
                                        ).symbol
                                      }{" "}
                                      {
                                        formatCurrency(payment.amount, payment.currency)
                                          .amount
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Receipt Information */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">
                                  Receipt Information
                                </h4>
                                <div className="space-y-2 text-sm">
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
                                      Payment Method:
                                    </span>
                                    <span className="font-medium">
                                      {payment.paymentMethod || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Receipt Type:
                                    </span>
                                    <span className="font-medium capitalize">
                                      {payment.receiptType || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Receipt Issued:
                                    </span>
                                    <span
                                      className={`font-medium ${payment.receiptIssued
                                        ? "text-green-600"
                                        : "text-red-600"
                                        }`}
                                    >
                                      {payment.receiptIssued ? "Yes" : "No"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Solicitor Commission */}
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">
                                  Solicitor Commission
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Solicitor:
                                    </span>
                                    <span className="font-medium">
                                      {payment.solicitorName || "None"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Commission Rate:
                                    </span>
                                    <span className="font-medium">
                                      {payment.bonusPercentage
                                        ? `${Number.parseFloat(
                                          payment.bonusPercentage
                                        )}%`
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Commission Amount:
                                    </span>
                                    <span className="font-medium text-green-600">
                                      {payment.bonusAmount
                                        ? `${payment.currency
                                        } ${Number.parseFloat(
                                          payment.bonusAmount
                                        ).toLocaleString()}`
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Bonus Rule ID:
                                    </span>
                                    <span className="font-medium">
                                      {payment.bonusRuleId || "N/A"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Notes */}
                            {payment.notes && (
                              <div className="mt-6 pt-4 border-t">
                                <h4 className="font-semibold text-gray-900 mb-2">
                                  Notes
                                </h4>
                                <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                                  {payment.notes}
                                </p>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="mt-6 pt-4 flex justify-end gap-2 border-t">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingPaymentId === payment.id}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 bg-transparent"
                                  >
                                    {deletingPaymentId === payment.id ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 mr-2" />
                                    )}
                                    Delete Payment
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Payment #{payment.id}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this
                                      payment? This action cannot be undone.
                                      <br />
                                      <br />
                                      <strong>Payment Details:</strong>
                                      <br />
                                      Payment ID: #{payment.id}
                                      <br />
                                      Amount:{" "}
                                      {
                                        formatCurrency(
                                          payment.amount,
                                          payment.currency
                                        ).symbol
                                      }
                                      {
                                        formatCurrency(
                                          payment.amount,
                                          payment.currency
                                        ).amount
                                      }
                                      <br />
                                      Date: {formatDate(payment.paymentDate)}
                                      <br />
                                      Status: {payment.paymentStatus}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeletePayment(payment)
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                      disabled={
                                        deletingPaymentId === payment.id
                                      }
                                    >
                                      {deletingPaymentId === payment.id ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Deleting...
                                        </>
                                      ) : (
                                        "Delete Payment"
                                      )}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <LinkButton
                                variant="secondary"
                                href={`/contacts/${contactId}/payment-plans?pledgeId=${pledgeId || payment.pledgeId
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

          {/* Updated Pagination */}
          {data && data.pagination && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-600">
                Showing {(data.pagination.page - 1) * data.pagination.limit + 1}{" "}
                to{" "}
                {Math.min(
                  data.pagination.page * data.pagination.limit,
                  data.pagination.totalCount
                )}{" "}
                of {data.pagination.totalCount} payments
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={!data.pagination.hasPreviousPage}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600">
                    Page {data.pagination.page} of {data.pagination.totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={!data.pagination.hasNextPage}
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
