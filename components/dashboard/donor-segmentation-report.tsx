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

  const renderDonorTable = (donors: DonorData[], title: string, exportType: string) => (
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
      </CardContent>
    </Card>
  );

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
              {renderDonorTable(data.segments.major, "Major Donors", "major")}
            </TabsContent>

            <TabsContent value="significant">
              {renderDonorTable(data.segments.significant, "Significant Donors", "significant")}
            </TabsContent>

            <TabsContent value="regular">
              {renderDonorTable(data.segments.regular, "Regular Donors", "regular")}
            </TabsContent>

            <TabsContent value="small">
              {renderDonorTable(data.segments.small, "Small Donors", "small")}
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
              {renderDonorTable(data.frequencySegments.monthly, "Monthly Donors", "monthly")}
            </TabsContent>

            <TabsContent value="quarterly">
              {renderDonorTable(data.frequencySegments.quarterly, "Quarterly Donors", "quarterly")}
            </TabsContent>

            <TabsContent value="occasional">
              {renderDonorTable(data.frequencySegments.occasional, "Occasional Donors", "occasional")}
            </TabsContent>

            <TabsContent value="onetime">
              {renderDonorTable(data.frequencySegments.onetime, "One-time Donors", "onetime")}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
