import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface ExchangeRateData {
  data: {
    currency: string;
    rates: Record<string, string>;
  };
}

const fetchExchangeRates = async (): Promise<ExchangeRateData> => {
  const response = await axios.get(
    "https://api.coinbase.com/v2/exchange-rates?currency=USD"
  );
  return response.data;
};

export const useExchangeRates = () => {
  return useQuery<ExchangeRateData, Error>({
    queryKey: ["exchangeRates"],
    queryFn: fetchExchangeRates,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
};
