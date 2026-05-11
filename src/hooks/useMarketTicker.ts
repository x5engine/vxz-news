import { useState, useEffect } from 'react';

export interface MarketData {
  symbol: string;
  price: string;
  change: number;
}

export const useMarketTicker = () => {
  const [markets, setMarkets] = useState<MarketData[]>([]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        // Using CoinCap's public, keyless API for reliable live asset ticking
        const res = await fetch('https://api.coincap.io/v2/assets?limit=8');
        const json = await res.json();
        
        if (json.data) {
          const formatted = json.data.map((asset: any) => ({
            symbol: asset.symbol,
            price: parseFloat(asset.priceUsd).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            change: parseFloat(asset.changePercent24Hr)
          }));
          setMarkets(formatted);
        }
      } catch (e) {
        console.warn("Market ticker fetch failed", e);
      }
    };

    fetchMarkets();
    const interval = setInterval(fetchMarkets, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  return markets;
};
