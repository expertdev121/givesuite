"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";

interface MonthlyPaymentsData {
  period: string;
  totalAmount: number;
  paymentCount: number;
}

interface MonthlyPaymentsChartProps {
  contactId?: string;
  dateRange?: DateRange;
}

export function MonthlyPaymentsChart({ contactId, dateRange }: MonthlyPaymentsChartProps) {
  const [data, setData] = useState<MonthlyPaymentsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (contactId) params.set('contactId', contactId);
        if (dateRange?.from) {
          params.set('startDate', dateRange.from.toISOString().split('T')[0]);
        }
        if (dateRange?.to) {
          params.set('endDate', dateRange.to.toISOString().split('T')[0]);
        }

        const response = await fetch(`/api/dashboard/statements?${params}`);
        const result = await response.json();

        if (result.monthlyPayments) {
          setData(result.monthlyPayments);
        }
      } catch (error) {
        console.error("Error fetching monthly payments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId, dateRange]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payments</CardTitle>
          <CardDescription>Payment amounts and counts by month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number | undefined | null) => {
    if (value == null || isNaN(value)) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isDaily = data.length > 0 && data[0]?.period?.split('-').length === 3;
  const dataKey = 'period';

  const formatPeriod = (periodStr: string) => {
    if (isDaily) {
      const [year, month, day] = periodStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      const [year, month] = periodStr.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isDaily ? 'Daily Payments' : 'Monthly Payments'}</CardTitle>
        <CardDescription>Payment amounts and transaction counts over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={dataKey}
              tickFormatter={formatPeriod}
              fontSize={12}
            />
            <YAxis
              yAxisId="amount"
              orientation="left"
              tickFormatter={formatCurrency}
              fontSize={12}
            />
            <YAxis
              yAxisId="count"
              orientation="right"
              fontSize={12}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'totalAmount') {
                  return [formatCurrency(value), 'Total Amount'];
                }
                return [value, 'Payment Count'];
              }}
              labelFormatter={(label) => formatPeriod(label)}
            />
            <Legend />
            <Line
              yAxisId="amount"
              type="monotone"
              dataKey="totalAmount"
              stroke="#8884d8"
              strokeWidth={2}
              name="Total Amount"
              dot={{ r: 4 }}
            />
            <Line
              yAxisId="count"
              type="monotone"
              dataKey="paymentCount"
              stroke="#82ca9d"
              strokeWidth={2}
              name="Payment Count"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
