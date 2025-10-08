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

interface PaymentTrendsData {
  month: string;
  totalAmount: number;
  paymentCount: number;
}

interface PaymentTrendsChartProps {
  contactId?: string;
  period?: string;
}

export function PaymentTrendsChart({ contactId, period = "12" }: PaymentTrendsChartProps) {
  const [data, setData] = useState<PaymentTrendsData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (contactId) params.set('contactId', contactId);
        if (period) params.set('period', period);

        const response = await fetch(`/api/dashboard/charts?${params}`);
        const result = await response.json();

        if (result.paymentTrends) {
          setData(result.paymentTrends);
        }
      } catch (error) {
        console.error("Error fetching payment trends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contactId, period]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Trends</CardTitle>
          <CardDescription>Monthly payment amounts over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Trends</CardTitle>
        <CardDescription>Monthly payment amounts and transaction counts</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickFormatter={formatMonth}
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
                return [value, 'Transaction Count'];
              }}
              labelFormatter={(label) => formatMonth(label)}
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
              name="Transaction Count"
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
