"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Download } from "lucide-react";
import { DateRange } from "react-day-picker";

interface BonusData {
  bonusCalculations: Array<{
    id: number;
    paymentId: number;
    solicitorId: number;
    bonusRuleId: number;
    paymentAmount: number;
    bonusPercentage: number;
    bonusAmount: number;
    calculatedAt: string;
    isPaid: boolean;
    paidAt?: string;
    solicitorName: string;
    solicitorCode: string;
    ruleName: string;
    paymentDate: string;
    paymentMethod: string;
    pledgeDescription: string;
  }>;
  solicitorSummary: Array<{
    solicitorId: number;
    solicitorName: string;
    solicitorCode: string;
    totalBonusAmount: number;
    totalPayments: number;
    paidAmount: number;
    unpaidAmount: number;
  }>;
  summary: {
    totalBonusAmount: number;
    totalCalculations: number;
    paidAmount: number;
    unpaidAmount: number;
    uniqueSolicitors: number;
  };
}

interface BonusReportProps {
  contactId?: string;
  dateRange?: DateRange;
}

export function BonusReport({ contactId, dateRange }: BonusReportProps) {
  const [data, setData] = useState<BonusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [solicitorFilter, setSolicitorFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (solicitorFilter && solicitorFilter !== "all") {
          params.set('solicitorId', solicitorFilter);
        }
        if (dateRange?.from) params.set('startDate', dateRange.from.toISOString().split('T')[0]);
        if (dateRange?.to) params.set('endDate', dateRange.to.toISOString().split('T')[0]);

        const response = await fetch(`/api/dashboard/bonus-calculations?${params}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching bonus data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [solicitorFilter, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
            <CardTitle>Solicitor Bonus Report</CardTitle>
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
            <CardTitle>Solicitor Bonus Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No bonus data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagination logic
  const totalCalculations = data.bonusCalculations?.length || 0;
  const totalPages = Math.ceil(totalCalculations / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCalculations = data.bonusCalculations?.slice(startIndex, endIndex) || [];

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Bonus Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.totalBonusAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid Bonuses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.summary.paidAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unpaid Bonuses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.summary.unpaidAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Solicitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.uniqueSolicitors}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Solicitor</label>
              <Select value={solicitorFilter} onValueChange={setSolicitorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Solicitors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Solicitors</SelectItem>
                  {data.solicitorSummary.map((solicitor) => (
                    <SelectItem key={solicitor.solicitorId} value={solicitor.solicitorId.toString()}>
                      {solicitor.solicitorName} ({solicitor.solicitorCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Solicitor Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitor Performance</CardTitle>
          <CardDescription>Bonus summary by solicitor</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Solicitor</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Total Bonus</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Unpaid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.solicitorSummary.map((solicitor) => (
                <TableRow key={solicitor.solicitorId}>
                  <TableCell className="font-medium">{solicitor.solicitorName}</TableCell>
                  <TableCell>{solicitor.solicitorCode}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(solicitor.totalBonusAmount)}
                  </TableCell>
                  <TableCell>{solicitor.totalPayments}</TableCell>
                  <TableCell className="text-green-600">
                    {formatCurrency(solicitor.paidAmount)}
                  </TableCell>
                  <TableCell className="text-orange-600">
                    {formatCurrency(solicitor.unpaidAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bonus Calculations Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Bonus Calculations</CardTitle>
          <CardDescription>Detailed bonus calculations</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Solicitor</TableHead>
                <TableHead>Payment Amount</TableHead>
                <TableHead>Bonus %</TableHead>
                <TableHead>Bonus Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCalculations.map((bonus) => (
                <TableRow key={bonus.id}>
                  <TableCell>{formatDate(bonus.calculatedAt)}</TableCell>
                  <TableCell className="font-medium">
                    {bonus.solicitorName} ({bonus.solicitorCode})
                  </TableCell>
                  <TableCell>{formatCurrency(bonus.paymentAmount)}</TableCell>
                  <TableCell>{bonus.bonusPercentage}%</TableCell>
                  <TableCell className="font-medium text-green-600">
                    {formatCurrency(bonus.bonusAmount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={bonus.isPaid ? 'default' : 'secondary'}>
                      {bonus.isPaid ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </TableCell>
                  <TableCell>{bonus.ruleName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalCalculations)} of {totalCalculations} calculations
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
          {totalCalculations > 20 && (
            <div className="text-center mt-4">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Full Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
