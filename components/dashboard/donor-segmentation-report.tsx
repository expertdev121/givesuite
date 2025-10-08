"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DonorData {
  contactId: number;
  contactName: string;
  email: string;
  totalAmount: number;
  paymentCount: number;
  averageAmount: number;
  firstPaymentDate: string;
  lastPaymentDate: string;
  yearsActive: number;
  frequency: string;
}

interface SegmentSummary {
  count: number;
  totalAmount: number;
  averageAmount: number;
}

interface DonorSegmentationData {
  segments: {
    major: DonorData[];
    significant: DonorData[];
    regular: DonorData[];
    small: DonorData[];
  };
  segmentSummaries: {
    major: SegmentSummary;
    significant: SegmentSummary;
    regular: SegmentSummary;
    small: SegmentSummary;
  };
  frequencySegments: {
    monthly: DonorData[];
    quarterly: DonorData[];
    occasional: DonorData[];
    onetime: DonorData[];
  };
  frequencySummaries: {
    monthly: SegmentSummary;
    quarterly: SegmentSummary;
    occasional: SegmentSummary;
    onetime: SegmentSummary;
  };
}

interface DonorSegmentationReportProps {
  contactId?: string;
}

export function DonorSegmentationReport({ contactId }: DonorSegmentationReportProps) {
  const [data, setData] = useState<DonorSegmentationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [majorPage, setMajorPage] = useState(1);
  const [significantPage, setSignificantPage] = useState(1);
  const [regularPage, setRegularPage] = useState(1);
  const [smallPage, setSmallPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [quarterlyPage, setQuarterlyPage] = useState(1);
  const [occasionalPage, setOccasionalPage] = useState(1);
  const [onetimePage, setOnetimePage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (contactId && contactId !== "all") {
          params.set('contactId', contactId);
        }

        const response = await fetch(`/api/dashboard/reports/donor-segmentation?${params}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching donor segmentation data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId]);

  const handleExport = (format: string, type: string) => {
    const url = contactId && contactId !== "all"
      ? `/api/dashboard/export?format=${format}&contactId=${contactId}&report=donor-segmentation&type=${type}`
      : `/api/dashboard/export?format=${format}&report=donor-segmentation&type=${type}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Donor Segmentation Report</CardTitle>
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
            <CardTitle>Donor Segmentation Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No donor segmentation data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagination logic for major donors
  const totalMajor = data.segments.major?.length || 0;
  const totalMajorPages = Math.ceil(totalMajor / itemsPerPage);
  const majorStartIndex = (majorPage - 1) * itemsPerPage;
  const majorEndIndex = majorStartIndex + itemsPerPage;
  const currentMajor = data.segments.major?.slice(majorStartIndex, majorEndIndex) || [];

  // Pagination logic for significant donors
  const totalSignificant = data.segments.significant?.length || 0;
  const totalSignificantPages = Math.ceil(totalSignificant / itemsPerPage);
  const significantStartIndex = (significantPage - 1) * itemsPerPage;
  const significantEndIndex = significantStartIndex + itemsPerPage;
  const currentSignificant = data.segments.significant?.slice(significantStartIndex, significantEndIndex) || [];

  // Pagination logic for regular donors
  const totalRegular = data.segments.regular?.length || 0;
  const totalRegularPages = Math.ceil(totalRegular / itemsPerPage);
  const regularStartIndex = (regularPage - 1) * itemsPerPage;
  const regularEndIndex = regularStartIndex + itemsPerPage;
  const currentRegular = data.segments.regular?.slice(regularStartIndex, regularEndIndex) || [];

  // Pagination logic for small donors
  const totalSmall = data.segments.small?.length || 0;
  const totalSmallPages = Math.ceil(totalSmall / itemsPerPage);
  const smallStartIndex = (smallPage - 1) * itemsPerPage;
  const smallEndIndex = smallStartIndex + itemsPerPage;
  const currentSmall = data.segments.small?.slice(smallStartIndex, smallEndIndex) || [];

  // Pagination logic for monthly donors
  const totalMonthly = data.frequencySegments.monthly?.length || 0;
  const totalMonthlyPages = Math.ceil(totalMonthly / itemsPerPage);
  const monthlyStartIndex = (monthlyPage - 1) * itemsPerPage;
  const monthlyEndIndex = monthlyStartIndex + itemsPerPage;
  const currentMonthly = data.frequencySegments.monthly?.slice(monthlyStartIndex, monthlyEndIndex) || [];

  // Pagination logic for quarterly donors
  const totalQuarterly = data.frequencySegments.quarterly?.length || 0;
  const totalQuarterlyPages = Math.ceil(totalQuarterly / itemsPerPage);
  const quarterlyStartIndex = (quarterlyPage - 1) * itemsPerPage;
  const quarterlyEndIndex = quarterlyStartIndex + itemsPerPage;
  const currentQuarterly = data.frequencySegments.quarterly?.slice(quarterlyStartIndex, quarterlyEndIndex) || [];

  // Pagination logic for occasional donors
  const totalOccasional = data.frequencySegments.occasional?.length || 0;
  const totalOccasionalPages = Math.ceil(totalOccasional / itemsPerPage);
  const occasionalStartIndex = (occasionalPage - 1) * itemsPerPage;
  const occasionalEndIndex = occasionalStartIndex + itemsPerPage;
  const currentOccasional = data.frequencySegments.occasional?.slice(occasionalStartIndex, occasionalEndIndex) || [];

  // Pagination logic for onetime donors
  const totalOnetime = data.frequencySegments.onetime?.length || 0;
  const totalOnetimePages = Math.ceil(totalOnetime / itemsPerPage);
  const onetimeStartIndex = (onetimePage - 1) * itemsPerPage;
  const onetimeEndIndex = onetimeStartIndex + itemsPerPage;
  const currentOnetime = data.frequencySegments.onetime?.slice(onetimeStartIndex, onetimeEndIndex) || [];

  const handleMajorPrevious = () => setMajorPage(prev => Math.max(prev - 1, 1));
  const handleMajorNext = () => setMajorPage(prev => Math.min(prev + 1, totalMajorPages));

  const handleSignificantPrevious = () => setSignificantPage(prev => Math.max(prev - 1, 1));
  const handleSignificantNext = () => setSignificantPage(prev => Math.min(prev + 1, totalSignificantPages));

  const handleRegularPrevious = () => setRegularPage(prev => Math.max(prev - 1, 1));
  const handleRegularNext = () => setRegularPage(prev => Math.min(prev + 1, totalRegularPages));

  const handleSmallPrevious = () => setSmallPage(prev => Math.max(prev - 1, 1));
  const handleSmallNext = () => setSmallPage(prev => Math.min(prev + 1, totalSmallPages));

  const handleMonthlyPrevious = () => setMonthlyPage(prev => Math.max(prev - 1, 1));
  const handleMonthlyNext = () => setMonthlyPage(prev => Math.min(prev + 1, totalMonthlyPages));

  const handleQuarterlyPrevious = () => setQuarterlyPage(prev => Math.max(prev - 1, 1));
  const handleQuarterlyNext = () => setQuarterlyPage(prev => Math.min(prev + 1, totalQuarterlyPages));

  const handleOccasionalPrevious = () => setOccasionalPage(prev => Math.max(prev - 1, 1));
  const handleOccasionalNext = () => setOccasionalPage(prev => Math.min(prev + 1, totalOccasionalPages));

  const handleOnetimePrevious = () => setOnetimePage(prev => Math.max(prev - 1, 1));
  const handleOnetimeNext = () => setOnetimePage(prev => Math.min(prev + 1, totalOnetimePages));

  const renderDonorTable = (donors: DonorData[], title: string, exportType: string, currentPage: number, totalPages: number, startIndex: number, endIndex: number, totalItems: number, handlePrevious: () => void, handleNext: () => void) => {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Donors in this segment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => handleExport('csv', exportType)}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf', exportType)}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right">Payments</TableHead>
                <TableHead className="text-right">Average</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Last Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donors.map((donor) => (
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
                  <TableCell>
                    <Badge variant="outline">{donor.frequency}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(donor.lastPaymentDate)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} donors
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
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
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="amount" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="amount">By Donation Amount</TabsTrigger>
          <TabsTrigger value="frequency">By Giving Frequency</TabsTrigger>
        </TabsList>

        <TabsContent value="amount" className="space-y-6">
          {/* Amount-based Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Major Donors</CardTitle>
                <CardDescription>$10,000+</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.segmentSummaries.major.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.segmentSummaries.major.totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Significant Donors</CardTitle>
                <CardDescription>$1,000 - $9,999</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.segmentSummaries.significant.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.segmentSummaries.significant.totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Regular Donors</CardTitle>
                <CardDescription>$100 - $999</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.segmentSummaries.regular.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.segmentSummaries.regular.totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Small Donors</CardTitle>
                <CardDescription>$0 - $99</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.segmentSummaries.small.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.segmentSummaries.small.totalAmount)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Amount-based Segments */}
          <Tabs defaultValue="major" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="major">Major ($10k+)</TabsTrigger>
              <TabsTrigger value="significant">Significant ($1k-10k)</TabsTrigger>
              <TabsTrigger value="regular">Regular ($100-1k)</TabsTrigger>
              <TabsTrigger value="small">Small (Under $100)</TabsTrigger>
            </TabsList>

            <TabsContent value="major">
              {renderDonorTable(currentMajor, "Major Donors", "major", majorPage, totalMajorPages, majorStartIndex, majorEndIndex, totalMajor, handleMajorPrevious, handleMajorNext)}
            </TabsContent>

            <TabsContent value="significant">
              {renderDonorTable(currentSignificant, "Significant Donors", "significant", significantPage, totalSignificantPages, significantStartIndex, significantEndIndex, totalSignificant, handleSignificantPrevious, handleSignificantNext)}
            </TabsContent>

            <TabsContent value="regular">
              {renderDonorTable(currentRegular, "Regular Donors", "regular", regularPage, totalRegularPages, regularStartIndex, regularEndIndex, totalRegular, handleRegularPrevious, handleRegularNext)}
            </TabsContent>

            <TabsContent value="small">
              {renderDonorTable(currentSmall, "Small Donors", "small", smallPage, totalSmallPages, smallStartIndex, smallEndIndex, totalSmall, handleSmallPrevious, handleSmallNext)}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="frequency" className="space-y-6">
          {/* Frequency-based Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.frequencySummaries.monthly.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.frequencySummaries.monthly.totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Quarterly Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.frequencySummaries.quarterly.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.frequencySummaries.quarterly.totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Occasional Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.frequencySummaries.occasional.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.frequencySummaries.occasional.totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">One-time Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.frequencySummaries.onetime.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.frequencySummaries.onetime.totalAmount)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Frequency-based Segments */}
          <Tabs defaultValue="monthly" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
              <TabsTrigger value="occasional">Occasional</TabsTrigger>
              <TabsTrigger value="onetime">One-time</TabsTrigger>
            </TabsList>

            <TabsContent value="monthly">
              {renderDonorTable(currentMonthly, "Monthly Donors", "monthly", monthlyPage, totalMonthlyPages, monthlyStartIndex, monthlyEndIndex, totalMonthly, handleMonthlyPrevious, handleMonthlyNext)}
            </TabsContent>

            <TabsContent value="quarterly">
              {renderDonorTable(currentQuarterly, "Quarterly Donors", "quarterly", quarterlyPage, totalQuarterlyPages, quarterlyStartIndex, quarterlyEndIndex, totalQuarterly, handleQuarterlyPrevious, handleQuarterlyNext)}
            </TabsContent>

            <TabsContent value="occasional">
              {renderDonorTable(currentOccasional, "Occasional Donors", "occasional", occasionalPage, totalOccasionalPages, occasionalStartIndex, occasionalEndIndex, totalOccasional, handleOccasionalPrevious, handleOccasionalNext)}
            </TabsContent>

            <TabsContent value="onetime">
              {renderDonorTable(currentOnetime, "One-time Donors", "onetime", onetimePage, totalOnetimePages, onetimeStartIndex, onetimeEndIndex, totalOnetime, handleOnetimePrevious, handleOnetimeNext)}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
