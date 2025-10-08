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
  lastYearTotal?: number;
  thisYearTotal?: number;
  totalGiven?: number;
  lastPaymentDate: string;
  paymentCount: number;
  yearsActive?: number;
}

interface ReportData {
  donors: DonorData[];
  summary: {
    totalDonors: number;
    totalAmount: number;
    averageAmount: number;
  };
}

interface LybuntSybuntData {
  lybunt: ReportData;
  sybunt: ReportData;
}

interface LybuntSybuntReportProps {
  contactId?: string;
}

export function LybuntSybuntReport({ contactId }: LybuntSybuntReportProps) {
  const [data, setData] = useState<LybuntSybuntData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (contactId && contactId !== "all") {
          params.set('contactId', contactId);
        }

        const response = await fetch(`/api/dashboard/reports/lybunt-sybunt?${params}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching LYBUNT/SYBUNT data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId]);

  const handleExport = (format: string, type: 'lybunt' | 'sybunt') => {
    const url = contactId && contactId !== "all"
      ? `/api/dashboard/export?format=${format}&contactId=${contactId}&report=${type}`
      : `/api/dashboard/export?format=${format}&report=${type}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>LYBUNT & SYBUNT Report</CardTitle>
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
            <CardTitle>LYBUNT & SYBUNT Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No LYBUNT/SYBUNT data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="lybunt" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lybunt">LYBUNT (Last Year But Untouched)</TabsTrigger>
          <TabsTrigger value="sybunt">SYBUNT (Some Year But Untouched)</TabsTrigger>
        </TabsList>

        <TabsContent value="lybunt" className="space-y-6">
          {/* LYBUNT Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">LYBUNT Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.lybunt.summary.totalDonors}</div>
                <p className="text-xs text-muted-foreground">
                  Gave last year, not this year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Last Year</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.lybunt.summary.totalAmount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Last Year</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.lybunt.summary.averageAmount)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleExport('csv', 'lybunt')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf', 'lybunt')}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* LYBUNT Table */}
          <Card>
            <CardHeader>
              <CardTitle>LYBUNT Donors</CardTitle>
              <CardDescription>Donors who contributed last year but not this year</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Last Year Total</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead>Last Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lybunt.donors.map((donor) => (
                    <TableRow key={donor.contactId}>
                      <TableCell className="font-medium">{donor.contactName}</TableCell>
                      <TableCell>{donor.email}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(donor.lastYearTotal || 0)}
                      </TableCell>
                      <TableCell className="text-right">{donor.paymentCount}</TableCell>
                      <TableCell>{formatDate(donor.lastPaymentDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sybunt" className="space-y-6">
          {/* SYBUNT Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">SYBUNT Donors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.sybunt.summary.totalDonors}</div>
                <p className="text-xs text-muted-foreground">
                  Gave in past years, not this year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Given</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.sybunt.summary.totalAmount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Given</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.sybunt.summary.averageAmount)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Export Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleExport('csv', 'sybunt')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('pdf', 'sybunt')}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* SYBUNT Table */}
          <Card>
            <CardHeader>
              <CardTitle>SYBUNT Donors</CardTitle>
              <CardDescription>Donors who contributed in past years but not this year</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Total Given</TableHead>
                    <TableHead className="text-right">Payments</TableHead>
                    <TableHead className="text-right">Years Active</TableHead>
                    <TableHead>Last Payment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sybunt.donors.map((donor) => (
                    <TableRow key={donor.contactId}>
                      <TableCell className="font-medium">{donor.contactName}</TableCell>
                      <TableCell>{donor.email}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(donor.totalGiven || 0)}
                      </TableCell>
                      <TableCell className="text-right">{donor.paymentCount}</TableCell>
                      <TableCell className="text-right">{donor.yearsActive}</TableCell>
                      <TableCell>{formatDate(donor.lastPaymentDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
