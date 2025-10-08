"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { CalendarIcon, ChevronsUpDown, XCircle } from "lucide-react";
import { PaymentTrendsChart } from "@/components/dashboard/payment-trends-chart";
import { PaymentMethodChart } from "@/components/dashboard/payment-method-chart";
import { StatementsSection } from "@/components/dashboard/statements-section";
import { BonusReport } from "@/components/dashboard/bonus-report";
import { DonorContributionReport } from "@/components/dashboard/donor-contribution-report";
import { CampaignFundraisingReport } from "@/components/dashboard/campaign-fundraising-report";
import { DonorSegmentationReport } from "@/components/dashboard/donor-segmentation-report";
import { FinancialAccountingReport } from "@/components/dashboard/financial-accounting-report";
import { LybuntSybuntReport } from "@/components/dashboard/lybunt-sybunt-report";

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

interface ApiContact {
  id: number;
  firstName: string;
  lastName: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContact, setSelectedContact] = useState<string>("all");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [open, setOpen] = useState(false);

  const clearDateRange = () => setDateRange(undefined);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        let url = selectedContact && selectedContact !== "all" ? `/api/dashboard?contactId=${selectedContact}` : "/api/dashboard";
        if (dateRange?.from) {
          url += `${url.includes('?') ? '&' : '?'}startDate=${dateRange.from.toISOString().split('T')[0]}`;
        }
        if (dateRange?.to) {
          url += `${url.includes('?') ? '&' : '?'}endDate=${dateRange.to.toISOString().split('T')[0]}`;
        }
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
  }, [selectedContact, dateRange]);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await fetch("/api/contacts?limit=50000");
        if (response.ok) {
          const contactsData = await response.json();
          setContacts(contactsData.contacts.map((c: ApiContact) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
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
    let url = selectedContact && selectedContact !== "all"
      ? `/api/dashboard/export?format=${format}&contactId=${selectedContact}`
      : `/api/dashboard/export?format=${format}`;
    if (dateRange?.from) {
      url += `&startDate=${dateRange.from.toISOString().split('T')[0]}`;
    }
    if (dateRange?.to) {
      url += `&endDate=${dateRange.to.toISOString().split('T')[0]}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[200px] justify-between"
              >
                {selectedContact === "all"
                  ? "All Contacts"
                  : contacts.find((contact) => contact.id.toString() === selectedContact)?.name || "Select contact..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="Search contacts..." />
                <CommandList>
                  <CommandEmpty>No contacts found.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      key="all"
                      value="all"
                      onSelect={() => {
                        setSelectedContact("all");
                        setOpen(false);
                      }}
                    >
                      All Contacts
                    </CommandItem>
                    {contacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={contact.name}
                        onSelect={() => {
                          setSelectedContact(contact.id.toString());
                          setOpen(false);
                        }}
                      >
                        {contact.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="flex-1">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `${formatDate(dateRange.from.toISOString().substring(0, 10))} - ${formatDate(dateRange.to.toISOString().substring(0, 10))}`
                        ) : (
                          formatDate(dateRange.from.toISOString().substring(0, 10))
                        )
                      ) : (
                        "Select date range"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {dateRange?.from && (
                <div
                  className="ml-2 h-4 w-4 opacity-70 hover:opacity-100 cursor-pointer flex items-center justify-center"
                  onClick={clearDateRange}
                >
                  <XCircle className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>

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
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="flex-1">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `${formatDate(dateRange.from.toISOString().substring(0, 10))} - ${formatDate(dateRange.to.toISOString().substring(0, 10))}`
                        ) : (
                          formatDate(dateRange.from.toISOString().substring(0, 10))
                        )
                      ) : (
                        "Select date range"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {dateRange?.from && (
                <div
                  className="ml-2 h-4 w-4 opacity-70 hover:opacity-100 cursor-pointer flex items-center justify-center"
                  onClick={clearDateRange}
                >
                  <XCircle className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
          <StatementsSection contactId={selectedContact} dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="bonuses" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span className="flex-1">
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `${formatDate(dateRange.from.toISOString().substring(0, 10))} - ${formatDate(dateRange.to.toISOString().substring(0, 10))}`
                        ) : (
                          formatDate(dateRange.from.toISOString().substring(0, 10))
                        )
                      ) : (
                        "Select date range"
                      )}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {dateRange?.from && (
                <div
                  className="ml-2 h-4 w-4 opacity-70 hover:opacity-100 cursor-pointer flex items-center justify-center"
                  onClick={clearDateRange}
                >
                  <XCircle className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
          <BonusReport contactId={selectedContact} dateRange={dateRange} />
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
              <DonorSegmentationReport contactId={selectedContact} />
            </TabsContent>

            <TabsContent value="financial-accounting" className="space-y-6">
              <FinancialAccountingReport contactId={selectedContact} />
            </TabsContent>

            <TabsContent value="lybunt-sybunt" className="space-y-6">
              <LybuntSybuntReport contactId={selectedContact} />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
