"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface CampaignData {
  campaignCode: string;
  totalPledges: number;
  totalPledgedAmount: number;
  totalPaidAmount: number;
  totalBalance: number;
}

interface CampaignFundraisingReportData {
  campaigns: CampaignData[];
  summary: {
    totalCampaigns: number;
    totalPledges: number;
    totalPledgedAmount: number;
    totalPaidAmount: number;
    totalBalance: number;
  };
}

interface CampaignFundraisingReportProps {
  contactId?: string;
}

export function CampaignFundraisingReport({ contactId }: CampaignFundraisingReportProps) {
  const [data, setData] = useState<CampaignFundraisingReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = contactId && contactId !== "all"
          ? `/api/dashboard/reports/campaign-fundraising?contactId=${contactId}`
          : "/api/dashboard/reports/campaign-fundraising";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch campaign data");
        const reportData = await response.json();
        setData(reportData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId]);

  const handleExport = (format: string) => {
    const url = contactId && contactId !== "all"
      ? `/api/dashboard/export?format=${format}&report=campaign-fundraising&contactId=${contactId}`
      : `/api/dashboard/export?format=${format}&report=campaign-fundraising`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading campaign fundraising report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  // Pagination logic
  const totalCampaigns = data.campaigns?.length || 0;
  const totalPages = Math.ceil(totalCampaigns / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCampaigns = data.campaigns?.slice(startIndex, endIndex) || [];

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campaign & Fundraising Report</h2>
          <p className="text-muted-foreground">
            Overview of pledges and payments by campaign
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCampaigns}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalPledges}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pledged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalPledgedAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalPaidAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.totalBalance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaign Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
          <CardDescription>
            Breakdown of pledges and payments by campaign code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Code</TableHead>
                <TableHead className="text-right">Pledges</TableHead>
                <TableHead className="text-right">Total Pledged</TableHead>
                <TableHead className="text-right">Total Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentCampaigns.length > 0 ? (
                currentCampaigns.map((campaign) => (
                  <TableRow key={campaign.campaignCode}>
                    <TableCell className="font-medium">{campaign.campaignCode}</TableCell>
                    <TableCell className="text-right">{campaign.totalPledges}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.totalPledgedAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.totalPaidAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(campaign.totalBalance)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No campaign data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalCampaigns)} of {totalCampaigns} campaigns
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
