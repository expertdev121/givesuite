import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface ExchangeRateData {
  data: {
    currency: string;
    rates: Record<string, string>;
  };
}

const fetchExchangeRates = async (date?: string): Promise<ExchangeRateData> => {
  // Use exchangerate.host for both current and historical rates
  const ACCESS_KEY =
    process.env.NEXT_PUBLIC_EXCHANGERATE_API_KEY || "YOUR_ACCESS_KEY";

  // If no date provided, use current date
  const targetDate = date || new Date().toISOString().split("T")[0];

  const response = await axios.get(
    `https://api.exchangerate.host/historical?access_key=${ACCESS_KEY}&date=${targetDate}&currencies=USD,ILS,EUR,JPY,GBP,AUD,CAD,ZAR&format=1`
  );

  // Transform the exchangerate.host response to match the expected format
  const transformedRates: Record<string, string> = {};

  if (response.data.quotes) {
    // Convert from USDILS format to ILS format and handle the rate conversion
    Object.entries(response.data.quotes).forEach(([key, value]) => {
      if (key.startsWith("USD")) {
        const currency = key.replace("USD", "");
        // The API gives us USD to other currency rates, but we need other currency to USD rates
        // So we need to invert the rate (1 / rate) for our calculations
        transformedRates[currency] = (1 / Number(value)).toString();
      }
    });

    // Add USD as 1.0 (since we're converting to USD)
    transformedRates["USD"] = "1.0";
  }

  return {
    data: {
      currency: "USD",
      rates: transformedRates,
    },
  };
};

export const useExchangeRates = (date?: string) => {
  return useQuery<ExchangeRateData, Error>({
    queryKey: ["exchangeRates", date],
    queryFn: () => fetchExchangeRates(date),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: true,
  });
};
