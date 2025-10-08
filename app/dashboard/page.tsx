"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentTrendsChart } from "@/components/dashboard/payment-trends-chart";
import { PaymentMethodChart } from "@/components/dashboard/payment-method-chart";
import { StatementsSection } from "@/components/dashboard/statements-section";
import { BonusReport } from "@/components/dashboard/bonus-report";
import { DonorContributionReport } from "@/components/dashboard/donor-contribution-report";
import { CampaignFundraisingReport } from "@/components/dashboard/campaign-fundraising-report";
// import { DonorSegmentationReport } from "@/components/dashboard/donor-segmentation-report";
// import { FinancialAccountingReport } from "@/components/dashboard/financial-accounting-report";
// import { LybuntSybuntReport } from "@/components/dashboard/lybunt-sybunt-report";

interface DashboardData {
  summary: {
    totalContacts: number;
    totalPayments: { count: number; totalAmount: number };
    totalPledges: { count: number; totalPledged: number; totalPaid: number; totalBalance: number };
    thirdPartyPayments: { count: number; totalAmount: number };
  };
  paymentsByMethod: Array<{ method: string; count: number; totalAmount: number }>;
  paymentsByStatus: Array<{ status: string; count: number; totalAmount: number }>;
  upcomingPayments: Array<{
    id: number;
    installmentDate: string;
    amount: string;
    currency: string;
    amountUsd: string | null;
    planName: string | null;
    contactName: string;
  }>;
  topContacts: Array<{
    contactId: number;
    contactName: string;
    totalPaid: number;
    paymentCount: number;
  }>;
  paymentTypes: Array<{ type: string; count: number; amount: number }>;
}

interface Contact {
  id: number;
  name: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string>("all");
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const url = selectedContact && selectedContact !== "all" ? `/api/dashboard?contactId=${selectedContact}` : "/api/dashboard";
        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedContact]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch("/api/contacts");
        if (response.ok) {
          const contactsData = await response.json();
          setContacts(contactsData.contacts.map((c: any) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
        }
      } catch (err) {
        console.error("Failed to fetch contacts:", err);
      }
    };

    fetchContacts();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-8 text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  const handleExport = (format: string) => {
    const url = selectedContact && selectedContact !== "all"
      ? `/api/dashboard/export?format=${format}&contactId=${selectedContact}`
      : `/api/dashboard/export?format=${format}`;
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedContact} onValueChange={setSelectedContact}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by contact" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Contacts</SelectItem>
              {contacts.map((contact) => (
                <SelectItem key={contact.id} value={contact.id.toString()}>
                  {contact.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('pdf')}>
            Export PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="statements">Statements</TabsTrigger>
          <TabsTrigger value="bonuses">Bonus Reports</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalContacts}</div>
                <p className="text-xs text-muted-foreground">
                  registered contacts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalPayments.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.summary.totalPayments.totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Third Party Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.thirdPartyPayments.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.summary.thirdPartyPayments.totalAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pledges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.summary.totalPledges.count}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data.summary.totalPledges.totalPledged)} pledged
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.totalPledges.totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground">
                  on pledges
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.totalPledges.totalBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  remaining to pay
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payments by Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payments by Method</CardTitle>
                <CardDescription>Distribution of payment methods used</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.paymentsByMethod.map((item) => (
                      <TableRow key={item.method}>
                        <TableCell className="font-medium">
                          <Badge variant="outline">{item.method}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Payments by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Payments by Status</CardTitle>
                <CardDescription>Current status of all payments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.paymentsByStatus.map((item) => (
                      <TableRow key={item.status}>
                        <TableCell className="font-medium">
                          <Badge
                            variant={
                              item.status === "completed"
                                ? "default"
                                : item.status === "pending"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upcoming Scheduled Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>Scheduled payments due in the next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.upcomingPayments.length > 0 ? (
                      data.upcomingPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.contactName}</TableCell>
                          <TableCell>{payment.planName || "N/A"}</TableCell>
                          <TableCell>{formatDate(payment.installmentDate)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(payment.amountUsd || payment.amount))}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No upcoming payments
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Top Contacts by Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Top Contributors</CardTitle>
                <CardDescription>Contacts with highest total payments</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Payments</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topContacts.length > 0 ? (
                      data.topContacts.map((contact) => (
                        <TableRow key={contact.contactId}>
                          <TableCell className="font-medium">{contact.contactName}</TableCell>
                          <TableCell className="text-right">{contact.paymentCount}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(contact.totalPaid)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          No payment data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Payment Types */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Types Overview</CardTitle>
              <CardDescription>Breakdown of payment types and their usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.paymentTypes.map((type) => (
                  <div key={type.type} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{type.type}</div>
                      <div className="text-sm text-muted-foreground">{type.count} payments</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(type.amount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentTrendsChart contactId={selectedContact} />
            <PaymentMethodChart contactId={selectedContact} />
          </div>
        </TabsContent>

        <TabsContent value="statements" className="space-y-6">
          <StatementsSection contactId={selectedContact} />
        </TabsContent>

        <TabsContent value="bonuses" className="space-y-6">
          <BonusReport contactId={selectedContact} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Tabs defaultValue="donor-contributions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="donor-contributions">Donor Contributions</TabsTrigger>
              <TabsTrigger value="campaign-fundraising">Campaign & Fundraising</TabsTrigger>
              <TabsTrigger value="donor-segmentation">Donor Segmentation</TabsTrigger>
              <TabsTrigger value="financial-accounting">Financial & Accounting</TabsTrigger>
              <TabsTrigger value="lybunt-sybunt">LYBUNT & SYBUNT</TabsTrigger>
            </TabsList>

            <TabsContent value="donor-contributions" className="space-y-6">
              <DonorContributionReport contactId={selectedContact} />
            </TabsContent>

            <TabsContent value="campaign-fundraising" className="space-y-6">
              <CampaignFundraisingReport contactId={selectedContact} />
            </TabsContent>

            <TabsContent value="donor-segmentation" className="space-y-6">
              <div>Donor Segmentation Report - Coming Soon</div>
            </TabsContent>

            <TabsContent value="financial-accounting" className="space-y-6">
              <div>Financial & Accounting Report - Coming Soon</div>
            </TabsContent>

            <TabsContent value="lybunt-sybunt" className="space-y-6">
              <div>LYBUNT & SYBUNT Report - Coming Soon</div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
