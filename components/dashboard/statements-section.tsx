"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface StatementsData {
  summary: {
    totalOwed: number;
    totalPaid: number;
    totalBalance: number;
    totalPledges: number;
    totalContacts: number;
  };
  paymentBreakdown: Array<{
    id: number;
    paymentDate: string;
    amount: number;
    currency: string;
    amountUsd: number;
    paymentMethod: string;
    paymentStatus: string;
    contactName: string;
    pledgeDescription: string;
    solicitorCode?: string;
    bonusAmount?: number;
  }>;
  outstandingBalances: Array<{
    pledgeId: number;
    contactName: string;
    description: string;
    originalAmount: number;
    currency: string;
    totalPaid: number;
    balance: number;
    originalAmountUsd: number;
    totalPaidUsd: number;
    balanceUsd: number;
  }>;
  monthlyPayments: Array<{
    month: string;
    totalAmount: number;
    paymentCount: number;
  }>;
}

interface StatementsSectionProps {
  contactId?: string;
}

export function StatementsSection({ contactId }: StatementsSectionProps) {
  const [data, setData] = useState<StatementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentOutstandingPage, setCurrentOutstandingPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (contactId) params.set('contactId', contactId);

        const response = await fetch(`/api/dashboard/statements?${params}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching statements data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId]);

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US');
  };

  const formatMethodName = (method: string) => {
    return method.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagination logic for payments
  const totalPayments = data.paymentBreakdown?.length || 0;
  const totalPages = Math.ceil(totalPayments / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPayments = data.paymentBreakdown?.slice(startIndex, endIndex) || [];

  // Pagination logic for outstanding balances
  const totalOutstanding = data.outstandingBalances?.length || 0;
  const totalOutstandingPages = Math.ceil(totalOutstanding / itemsPerPage);
  const outstandingStartIndex = (currentOutstandingPage - 1) * itemsPerPage;
  const outstandingEndIndex = outstandingStartIndex + itemsPerPage;
  const currentOutstandingBalances = data.outstandingBalances?.slice(outstandingStartIndex, outstandingEndIndex) || [];

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleOutstandingPreviousPage = () => {
    setCurrentOutstandingPage(prev => Math.max(prev - 1, 1));
  };

  const handleOutstandingNextPage = () => {
    setCurrentOutstandingPage(prev => Math.min(prev + 1, totalOutstandingPages));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.summary?.totalOwed || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary?.totalPaid || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.summary?.totalBalance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Pledges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary?.totalPledges || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Balances</CardTitle>
          <CardDescription>Pledges with remaining balances</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Original Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentOutstandingBalances.map((balance) => (
                <TableRow key={balance.pledgeId}>
                  <TableCell className="font-medium">{balance.contactName}</TableCell>
                  <TableCell>{balance.description}</TableCell>
                  <TableCell>{formatCurrency(balance.originalAmountUsd)}</TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(balance.totalPaidUsd)}
                  </TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {formatCurrency(balance.balanceUsd)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalOutstandingPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {outstandingStartIndex + 1} to {Math.min(outstandingEndIndex, totalOutstanding)} of {totalOutstanding} outstanding balances
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOutstandingPreviousPage}
                  disabled={currentOutstandingPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentOutstandingPage} of {totalOutstandingPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOutstandingNextPage}
                  disabled={currentOutstandingPage === totalOutstandingPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Detailed payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell className="font-medium">{payment.contactName}</TableCell>
                  <TableCell>{payment.pledgeDescription}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {formatMethodName(payment.paymentMethod)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(payment.amountUsd)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.paymentStatus === 'completed' ? 'default' : 'secondary'}>
                      {payment.paymentStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalPayments)} of {totalPayments} payments
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          {totalPayments > 20 && (
            <div className="text-center mt-4">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Full History
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
