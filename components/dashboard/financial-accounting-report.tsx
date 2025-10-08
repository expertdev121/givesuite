"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface MonthlyData {
  month: number;
  year: number;
  totalAmount: number;
  paymentCount: number;
}

interface PaymentMethodData {
  method: string;
  totalAmount: number;
  paymentCount: number;
}

interface CurrencyData {
  currency: string;
  totalAmount: number;
  paymentCount: number;
}

interface YearlyData {
  year: number;
  totalAmount: number;
  paymentCount: number;
}

interface FinancialAccountingData {
  summary: {
    totalPledged: number;
    totalPaid: number;
    totalBalance: number;
    totalPayments: number;
    paymentCount: number;
  };
  monthlyData: MonthlyData[];
  paymentMethodData: PaymentMethodData[];
  currencyData: CurrencyData[];
  yearlyComparison: YearlyData[];
}

interface FinancialAccountingReportProps {
  contactId?: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function FinancialAccountingReport({ contactId }: FinancialAccountingReportProps) {
  const [data, setData] = useState<FinancialAccountingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearlyPage, setYearlyPage] = useState(1);
  const [monthlyPage, setMonthlyPage] = useState(1);
  const [methodsPage, setMethodsPage] = useState(1);
  const [currenciesPage, setCurrenciesPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (contactId && contactId !== "all") {
          params.set('contactId', contactId);
        }

        const response = await fetch(`/api/dashboard/reports/financial-accounting?${params}`);
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Error fetching financial accounting data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId]);

  const handleExport = (format: string) => {
    const url = contactId && contactId !== "all"
      ? `/api/dashboard/export?format=${format}&contactId=${contactId}&report=financial-accounting`
      : `/api/dashboard/export?format=${format}&report=financial-accounting`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial & Accounting Report</CardTitle>
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
            <CardTitle>Financial & Accounting Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No financial accounting data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pagination logic for yearly comparison
  const totalYearly = data.yearlyComparison?.length || 0;
  const totalYearlyPages = Math.ceil(totalYearly / itemsPerPage);
  const yearlyStartIndex = (yearlyPage - 1) * itemsPerPage;
  const yearlyEndIndex = yearlyStartIndex + itemsPerPage;
  const currentYearly = data.yearlyComparison?.slice(yearlyStartIndex, yearlyEndIndex) || [];

  // Pagination logic for monthly data
  const totalMonthly = data.monthlyData?.length || 0;
  const totalMonthlyPages = Math.ceil(totalMonthly / itemsPerPage);
  const monthlyStartIndex = (monthlyPage - 1) * itemsPerPage;
  const monthlyEndIndex = monthlyStartIndex + itemsPerPage;
  const currentMonthly = data.monthlyData?.slice(monthlyStartIndex, monthlyEndIndex) || [];

  // Pagination logic for payment methods
  const totalMethods = data.paymentMethodData?.length || 0;
  const totalMethodsPages = Math.ceil(totalMethods / itemsPerPage);
  const methodsStartIndex = (methodsPage - 1) * itemsPerPage;
  const methodsEndIndex = methodsStartIndex + itemsPerPage;
  const currentMethods = data.paymentMethodData?.slice(methodsStartIndex, methodsEndIndex) || [];

  // Pagination logic for currencies
  const totalCurrencies = data.currencyData?.length || 0;
  const totalCurrenciesPages = Math.ceil(totalCurrencies / itemsPerPage);
  const currenciesStartIndex = (currenciesPage - 1) * itemsPerPage;
  const currenciesEndIndex = currenciesStartIndex + itemsPerPage;
  const currentCurrencies = data.currencyData?.slice(currenciesStartIndex, currenciesEndIndex) || [];

  const handleYearlyPrevious = () => setYearlyPage(prev => Math.max(prev - 1, 1));
  const handleYearlyNext = () => setYearlyPage(prev => Math.min(prev + 1, totalYearlyPages));

  const handleMonthlyPrevious = () => setMonthlyPage(prev => Math.max(prev - 1, 1));
  const handleMonthlyNext = () => setMonthlyPage(prev => Math.min(prev + 1, totalMonthlyPages));

  const handleMethodsPrevious = () => setMethodsPage(prev => Math.max(prev - 1, 1));
  const handleMethodsNext = () => setMethodsPage(prev => Math.min(prev + 1, totalMethodsPages));

  const handleCurrenciesPrevious = () => setCurrenciesPage(prev => Math.max(prev - 1, 1));
  const handleCurrenciesNext = () => setCurrenciesPage(prev => Math.min(prev + 1, totalCurrenciesPages));

  return (
    <div className="space-y-6">
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

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Pledged</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(data.summary.totalPledged)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total commitment amount
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(data.summary.totalPaid)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Amount received
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(data.summary.totalBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Remaining to be paid
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(data.summary.totalPayments)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.summary.paymentCount} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {data.summary.totalPledged > 0
                    ? ((data.summary.totalPaid / data.summary.totalPledged) * 100).toFixed(1)
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Paid vs pledged
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Year-over-Year Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Year-over-Year Comparison</CardTitle>
              <CardDescription>Financial performance over the last 3 years</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Avg per Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentYearly.map((year) => (
                    <TableRow key={year.year}>
                      <TableCell className="font-medium">{year.year}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(year.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">{year.paymentCount}</TableCell>
                      <TableCell className="text-right">
                        {year.paymentCount > 0 ? formatCurrency(year.totalAmount / year.paymentCount) : formatCurrency(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalYearlyPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {yearlyStartIndex + 1} to {Math.min(yearlyEndIndex, totalYearly)} of {totalYearly} years
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleYearlyPrevious}
                      disabled={yearlyPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {yearlyPage} of {totalYearlyPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleYearlyNext}
                      disabled={yearlyPage === totalYearlyPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Financial Trends</CardTitle>
              <CardDescription>Payment amounts and counts by month for the current year</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Avg per Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMonthly.map((month) => (
                    <TableRow key={month.month}>
                      <TableCell className="font-medium">
                        {monthNames[month.month - 1]} {month.year}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(month.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">{month.paymentCount}</TableCell>
                      <TableCell className="text-right">
                        {month.paymentCount > 0 ? formatCurrency(month.totalAmount / month.paymentCount) : formatCurrency(0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalMonthlyPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {monthlyStartIndex + 1} to {Math.min(monthlyEndIndex, totalMonthly)} of {totalMonthly} months
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMonthlyPrevious}
                      disabled={monthlyPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {monthlyPage} of {totalMonthlyPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMonthlyNext}
                      disabled={monthlyPage === totalMonthlyPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods Breakdown</CardTitle>
              <CardDescription>Financial distribution by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentMethods.map((method) => (
                    <TableRow key={method.method}>
                      <TableCell className="font-medium">
                        <Badge variant="outline">{method.method}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(method.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">{method.paymentCount}</TableCell>
                      <TableCell className="text-right">
                        {data.summary.totalPayments > 0
                          ? ((method.totalAmount / data.summary.totalPayments) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalMethodsPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {methodsStartIndex + 1} to {Math.min(methodsEndIndex, totalMethods)} of {totalMethods} methods
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMethodsPrevious}
                      disabled={methodsPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {methodsPage} of {totalMethodsPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMethodsNext}
                      disabled={methodsPage === totalMethodsPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Currency Breakdown</CardTitle>
              <CardDescription>Financial distribution by currency</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Total Amount (USD)</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentCurrencies.map((currency) => (
                    <TableRow key={currency.currency}>
                      <TableCell className="font-medium">
                        <Badge variant="secondary">{currency.currency}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(currency.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">{currency.paymentCount}</TableCell>
                      <TableCell className="text-right">
                        {data.summary.totalPayments > 0
                          ? ((currency.totalAmount / data.summary.totalPayments) * 100).toFixed(1)
                          : 0}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalCurrenciesPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {currenciesStartIndex + 1} to {Math.min(currenciesEndIndex, totalCurrencies)} of {totalCurrencies} currencies
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCurrenciesPrevious}
                      disabled={currenciesPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {currenciesPage} of {totalCurrenciesPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCurrenciesNext}
                      disabled={currenciesPage === totalCurrenciesPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
