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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Search,
  BadgeDollarSignIcon,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
} from "lucide-react";
import {
  useDeletePaymentMutation,
  usePaymentsQuery,
  useUpdatePaymentMutation,
} from "@/lib/query/payments/usePaymentQuery";
import { LinkButton } from "../ui/next-link";
import FactsDialog from "../facts-iframe";
import PaymentFormDialog from "../forms/payment-dialog";
import EditPaymentDialog from "@/app/contacts/[contactId]/payments/__components/edit-payment";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { usePledgeByIdQuery } from "@/lib/query/pledge/usePledgeQuery";

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

interface Payment {
  id: number;
  pledgeId: number;
  amount: string;
  currency: string;
  paymentDate: string | null;
  methodDetail: string;
  receivedDate: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  checkNumber: string | null;
  notes: string | null;
  exchangeRate: string | null;
  paymentPlanId: number | null;
  receiptNumber: string | null;
  receiptType: string | null;
  receiptIssued: boolean;
  solicitorName: string | null;
  bonusPercentage: string | null;
  bonusAmount: string | null;
  bonusRuleId: number | null;
  amountUsd: string;
  pledgeOriginalCurrency: string;
  pledgeOriginalAmount: string | null;
}

export default function PaymentsTable({ contactId }: PaymentsTableProps) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [deletingPaymentId, setDeletingPaymentId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleCloseModal = () => {
    setSelectedPayment(null);
    setIsModalOpen(false);
    setEditingPayment(null);
    setIsEditing(false);
  };

  const formatUSDAmount = (amount: string | null) => {
    if (!amount) return "N/A";
    return `$${Number.parseFloat(amount).toLocaleString()}`;
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
  const { data: pledgeData, isLoading: isPledgeLoading } = usePledgeByIdQuery(
    selectedPayment?.pledgeId,
    {
      enabled: !!selectedPayment?.pledgeId,
    }
  );

  const deletePaymentMutation = useDeletePaymentMutation();
  const updatePaymentMutation = useUpdatePaymentMutation(selectedPayment?.pledgeId || 0);

  const handlePaymentRowClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setEditingPayment({ ...payment });
    setIsModalOpen(true);
  };

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

  const handleDeletePayment = async (payment: Payment) => {
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

  const handleSavePayment = async () => {
    if (!editingPayment || !selectedPayment) return;

    setIsSaving(true);
    try {
      await updatePaymentMutation.mutateAsync({
        paymentId: editingPayment.id,
        amount: Number.parseFloat(editingPayment.amount),
        currency: editingPayment.currency as any,
        paymentDate: editingPayment.paymentDate || undefined,
        receivedDate: editingPayment.receivedDate || undefined,
        paymentMethod: editingPayment.paymentMethod as any,
        paymentStatus: editingPayment.paymentStatus as any,
        referenceNumber: editingPayment.referenceNumber || undefined,
        checkNumber: editingPayment.checkNumber || undefined,
        receiptNumber: editingPayment.receiptNumber || undefined,
        receiptType: editingPayment.receiptType as any,
        receiptIssued: editingPayment.receiptIssued,
        notes: editingPayment.notes || undefined,
        exchangeRate: editingPayment.exchangeRate ? Number.parseFloat(editingPayment.exchangeRate) : undefined,
      });

      toast.success(`Payment #${editingPayment.id} updated successfully`);
      setIsEditing(false);
      setSelectedPayment(editingPayment);
    } catch (error) {
      console.error("Failed to update payment:", error);
      toast.error(`Failed to update payment #${editingPayment.id}`);
    } finally {
      setIsSaving(false);
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

  const handleInputChange = (field: string, value: any) => {
    if (editingPayment) {
      setEditingPayment({
        ...editingPayment,
        [field]: value,
      });
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
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandedRow(payment.id);
                            }}
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
                                      Payment Date:
                                    </span>
                                    <span className="font-medium">
                                      {formatDate(payment.paymentDate)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Received Date:
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
                                      $ {Math.round(Number(payment.amountUsd))}
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
                                          payment?.pledgeOriginalCurrency
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
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">
                                      Check Number:
                                    </span>
                                    <span className="font-medium">
                                      {payment.checkNumber || "N/A"}
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
                              <EditPaymentDialog
                                payment={payment}
                                trigger={
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Payment
                                  </Button>
                                }
                              />

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
      {/* Payment Information Modal */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Payment Information #{selectedPayment?.id}</span>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setEditingPayment(selectedPayment);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePayment}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedPayment && editingPayment && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              {/* Payment Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 text-lg">
                  Payment Information
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="payment-id">Payment ID</Label>
                    <Input
                      id="payment-id"
                      value={`#${editingPayment.id}`}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Payment Date</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={editingPayment.paymentDate || ""}
                      onChange={(e) => handleInputChange("paymentDate", e.target.value)}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="received-date">Received Date</Label>
                    <Input
                      id="received-date"
                      type="date"
                      value={editingPayment.receivedDate || ""}
                      onChange={(e) => handleInputChange("receivedDate", e.target.value)}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-status">Status</Label>
                    <Select
                      value={editingPayment.paymentStatus}
                      onValueChange={(value) => handleInputChange("paymentStatus", value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                        <SelectValue />
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <Select
                      value={editingPayment.paymentMethod || ""}
                      onValueChange={(value) => handleInputChange("paymentMethod", value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receipt-type">Receipt Type</Label>
                    <Select
                      value={editingPayment.receiptType || ""}
                      onValueChange={(value) => handleInputChange("receiptType", value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className={!isEditing ? "bg-gray-50" : ""}>
                        <SelectValue placeholder="Select receipt type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tax_deductible">Tax Deductible</SelectItem>
                        <SelectItem value="non_tax_deductible">Non-Tax Deductible</SelectItem>
                        <SelectItem value="partial_tax_deductible">Partial Tax Deductible</SelectItem>
                        <SelectItem value="gift_in_kind">Gift in Kind</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Amount Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 text-lg">
                  Amount Information
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="pledge-amount-usd">Pledge Amount (USD)</Label>
                    <Input
                      id="pledge-amount-usd"
                      value={isPledgeLoading ? "Loading..." : formatUSDAmount(pledgeData?.totalAmountUsd || "0")}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pledge-amount-currency">Pledge Amount ({editingPayment.pledgeOriginalCurrency || editingPayment.currency})</Label>
                    <Input
                      id="pledge-amount-currency"
                      value={isPledgeLoading ? "Loading..." :
                        formatCurrency(pledgeData?.totalAmount || "0", editingPayment.pledgeOriginalCurrency || editingPayment.currency).symbol +
                        formatCurrency(pledgeData?.totalAmount || "0", editingPayment.pledgeOriginalCurrency || editingPayment.currency).amount
                      }
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paid-usd">Paid (USD)</Label>
                    <Input
                      id="paid-usd"
                      value={`$ ${Math.round(Number(editingPayment.amountUsd))}`}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paid-currency">Paid ({editingPayment.pledgeOriginalCurrency || editingPayment.currency})</Label>
                    <Input
                      id="paid-currency"
                      value={editingPayment.amount}
                      onChange={(e) => handleInputChange("amount", e.target.value)}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="balance-usd">Balance (USD)</Label>
                    <Input
                      id="balance-usd"
                      value={isPledgeLoading ? "Loading..." : formatUSDAmount(pledgeData?.balanceUsd || "0")}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="balance-currency">Balance ({editingPayment.pledgeOriginalCurrency || editingPayment.currency})</Label>
                    <Input
                      id="balance-currency"
                      value={isPledgeLoading ? "Loading..." :
                        formatCurrency(pledgeData?.balance || "0", editingPayment.pledgeOriginalCurrency || editingPayment.currency).symbol +
                        formatCurrency(pledgeData?.balance || "0", editingPayment.pledgeOriginalCurrency || editingPayment.currency).amount
                      }
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 text-lg">
                  Schedule Information
                </h4>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled">Scheduled</Label>
                    <Input
                      id="scheduled"
                      value={isPledgeLoading ? "Loading..." :
                        formatCurrency(pledgeData?.scheduledAmount || "0", editingPayment.pledgeOriginalCurrency || editingPayment.currency).symbol +
                        formatCurrency(pledgeData?.scheduledAmount || "0", editingPayment.pledgeOriginalCurrency || editingPayment.currency).amount
                      }
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unscheduled">Unscheduled</Label>
                    <Input
                      id="unscheduled"
                      value={isPledgeLoading ? "Loading..." : (() => {
                        const unscheduledAmount = (
                          Number.parseFloat(pledgeData?.balance || "0") -
                          Number.parseFloat(pledgeData?.scheduledAmount || "0")
                        ).toString();
                        return formatCurrency(unscheduledAmount, editingPayment.pledgeOriginalCurrency || editingPayment.currency).symbol +
                          formatCurrency(unscheduledAmount, editingPayment.pledgeOriginalCurrency || editingPayment.currency).amount;
                      })()}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference-number">Reference Number</Label>
                    <Input
                      id="reference-number"
                      value={editingPayment.referenceNumber || ""}
                      onChange={(e) => handleInputChange("referenceNumber", e.target.value)}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="check-number">Check Number</Label>
                    <Input
                      id="check-number"
                      value={editingPayment.checkNumber || ""}
                      onChange={(e) => handleInputChange("checkNumber", e.target.value)}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receipt-number">Receipt Number</Label>
                    <Input
                      id="receipt-number"
                      value={editingPayment.receiptNumber || ""}
                      onChange={(e) => handleInputChange("receiptNumber", e.target.value)}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 text-lg">
                  Notes
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editingPayment.notes || ""}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                    rows={4}
                    placeholder="Enter payment notes..."
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}