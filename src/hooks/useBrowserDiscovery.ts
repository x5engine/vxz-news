import { useState, useEffect } from 'react';

// Using a public, no-auth-required RSS-to-JSON for "Discovery"
export const useBrowserDiscovery = (active: boolean) => {
  const [discoveredItems, setDiscoveredItems] = useState<any[]>([]);

  useEffect(() => {
    if (!active) return;

    const discover = async () => {
      try {
        console.log("[BROWSER_DISCOVERY] Scanning wire services...");
        const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en');
        const data = await res.json();
        
        if (data.status === 'ok') {
          // Just keeping a few latest items to notify "Found in browser"
          setDiscoveredItems(data.items.slice(0, 3));
        }
      } catch (e) {
        console.error("Discovery failed", e);
      }
    };

    discover();
    const interval = setInterval(discover, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [active]);

  return discoveredItems;
};
