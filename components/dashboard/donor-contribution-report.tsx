"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DonorContribution {
  contactId: number;
  contactName: string;
  email: string;
  totalAmount: number;
  paymentCount: number;
  averageAmount: number;
  firstPaymentDate: string;
  lastPaymentDate: string;
  currency: string;
}

interface DonorContributionData {
  donorContributions: DonorContribution[];
  summary: {
    totalDonors: number;
    totalAmount: number;
    averageDonation: number;
    maxDonation: number;
  };
}

interface DonorContributionReportProps {
  contactId?: string;
}

export function DonorContributionReport({ contactId }: DonorContributionReportProps) {
  const [data, setData] = useState<DonorContributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (contactId && contactId !== "all") {
          params.set('contactId', contactId);
        }

        const response = await fetch(`/api/dashboard/reports/donor-contributions?${params}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching donor contributions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId]);

  const handleExport = (format: string) => {
    const url = contactId && contactId !== "all"
      ? `/api/dashboard/export?format=${format}&contactId=${contactId}&report=donor-contributions`
      : `/api/dashboard/export?format=${format}&report=donor-contributions`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Donor Contribution Report</CardTitle>
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
            <CardTitle>Donor Contribution Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No donor contribution data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagination logic
  const totalDonors = data.donorContributions?.length || 0;
  const totalPages = Math.ceil(totalDonors / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDonors = data.donorContributions?.slice(startIndex, endIndex) || [];

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
            <CardTitle className="text-sm font-medium">Total Donors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalDonors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.totalAmount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.summary.averageDonation)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Largest Donation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(data.summary.maxDonation)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => handleExport('csv')}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        <Button variant="outline" onClick={() => handleExport('pdf')}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Donor Contributions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Donor Contributions</CardTitle>
          <CardDescription>Detailed breakdown of donor contributions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Average</TableHead>
                <TableHead>First Payment</TableHead>
                <TableHead>Last Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentDonors.map((donor) => (
                <TableRow key={donor.contactId}>
                  <TableCell className="font-medium">{donor.contactName}</TableCell>
                  <TableCell>{donor.email}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(donor.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">{donor.paymentCount}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(donor.averageAmount)}
                  </TableCell>
                  <TableCell>{formatDate(donor.firstPaymentDate)}</TableCell>
                  <TableCell>{formatDate(donor.lastPaymentDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalDonors)} of {totalDonors} donors
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
        </CardContent>
      </Card>
    </div>
  );
}
