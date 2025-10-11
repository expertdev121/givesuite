"use client";

import { clsx, type ClassValue } from "clsx";
import { useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null || isNaN(amount)) return '$0';
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCurrencyWithCode(amount: number | undefined | null, currency: string = 'USD'): string {
  if (amount == null || isNaN(amount)) return `${currency} 0`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculateConversion(amount: number, fromCurrency: string, toCurrency: string, exchangeRate: number): number {
  if (fromCurrency === toCurrency) return amount;
  // Assuming exchangeRate is fromCurrency to toCurrency
  return amount * exchangeRate;
}

export function formatDateForInvoice(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);

    // Array of 3-letter uppercase month strings
    const months = [
      "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
      "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    ];

    const day = date.getDate().toString().padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

export const formatPaymentMethod = (paymentMethod: string | null | undefined) => {
  if (!paymentMethod || paymentMethod.trim() === "") return "Not Specified";
  return paymentMethod.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
};
