import { useState, useEffect, useRef, startTransition } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export interface MediaItem {
  source: string;
  url: string;
  media: string;
  thumbnail?: string;
  duration?: number;
  format?: 'mp4' | 'webm' | 'youtube' | 'jpg' | 'png' | 'gif';
  type?: 'source_video' | 'source_image' | 'ai_generated';
  primary?: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  truthScore: number;
  status: 'CONFIRMED' | 'ASSESSED' | 'CLAIMED';
  sourceCount: number;
  timestamp: string;
  lat: number;
  lng: number;
  category?: string;
  keywords?: string[];
  sourceLinks: { source: string, url: string }[];
  media: MediaItem[];
  sourceStack: { source: string, type: string, align: string }[];
}

// Client-Side Geocoding Fallback Dictionary
const GEO_DICTIONARY: Record<string, {lat: number, lng: number}> = {
  "us ": { lat: 38.9072, lng: -77.0369 },
  "usa ": { lat: 38.9072, lng: -77.0369 },
  "america": { lat: 38.9072, lng: -77.0369 },
  "uk ": { lat: 51.5074, lng: -0.1278 },
  "britain": { lat: 51.5074, lng: -0.1278 },
  "london": { lat: 51.5074, lng: -0.1278 },
  "china": { lat: 39.9042, lng: 116.4074 },
  "beijing": { lat: 39.9042, lng: 116.4074 },
  "taiwan": { lat: 25.0329, lng: 121.5654 },
  "russia": { lat: 55.7558, lng: 37.6173 },
  "moscow": { lat: 55.7558, lng: 37.6173 },
  "ukraine": { lat: 50.4501, lng: 30.5234 },
  "kyiv": { lat: 50.4501, lng: 30.5234 },
  "israel": { lat: 31.7683, lng: 35.2137 },
  "gaza": { lat: 31.5, lng: 34.4666 },
  "iran": { lat: 35.6892, lng: 51.3890 },
  "tehran": { lat: 35.6892, lng: 51.3890 },
  "france": { lat: 48.8566, lng: 2.3522 },
  "paris": { lat: 48.8566, lng: 2.3522 },
  "germany": { lat: 48.8566, lng: 2.3522 }, // Simplified mapping
  "japan": { lat: 35.6762, lng: 139.6503 },
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "korea": { lat: 37.5665, lng: 126.9780 },
  "india": { lat: 37.5665, lng: 126.9780 } // Simplified
};

const extractGeoFallback = (title: string, id: string) => {
  const lowerTitle = title.toLowerCase();
  for (const [key, coords] of Object.entries(GEO_DICTIONARY)) {
    if (lowerTitle.includes(key)) {
      // Add slight random jitter so pins don't overlap perfectly
      return {
        lat: coords.lat + (Math.random() * 2 - 1),
        lng: coords.lng + (Math.random() * 2 - 1)
      };
    }
  }
  
  // Ultimate hash-fallback if no keywords found to avoid 0,0 Null Island
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const keys = Object.keys(GEO_DICTIONARY);
  const fallbackCoords = GEO_DICTIONARY[keys[Math.abs(hash) % keys.length]];
  return {
    lat: fallbackCoords.lat + (Math.random() * 2 - 1),
    lng: fallbackCoords.lng + (Math.random() * 2 - 1)
  };
};

export const useNewsStream = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [breakingNews, setBreakingNews] = useState<NewsItem | null>(null);
  const [fetchLimit, setFetchLimit] = useState(20); // Start with 20 items
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const lastBreakingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const eventsRef = collection(db, "events");
    // We use a dynamic limit. onSnapshot will efficiently handle updates within this growing window.
    const q = query(
      eventsRef, 
      orderBy("last_updated", "desc"), 
      limit(fetchLimit) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveFeed: NewsItem[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Client-side strict drop rule (in case backend is still processing update)
        const restrictedRegex = /homosexual|gay|lgbt/i;
        if (restrictedRegex.test(data.title) || restrictedRegex.test(data.summary)) {
          return; // Drop this event
        }
        
        let lat = data.lat !== undefined ? data.lat : 0;
        let lng = data.lng !== undefined ? data.lng : 0;

        // If backend failed to geocode (0,0), apply intelligent client-fallback
        if (lat === 0 && lng === 0 && data.title) {
          const fallback = extractGeoFallback(data.title, doc.id);
          lat = fallback.lat;
          lng = fallback.lng;
        }
        
        let links: { source: string, url: string }[] = [];
        let mediaItems: { source: string, url: string, media: string }[] = [];
        
        if (Array.isArray(data.media_links)) {
          data.media_links.forEach((m: any) => {
            if (m.url) links.push({ source: m.source || 'Intel Source', url: m.url });
            if (m.media) mediaItems.push({ source: m.source || 'Intel Source', url: m.url || '#', media: m.media });
          });
        }
        
        let formattedTime = "LIVE";
        if (data.last_updated && typeof data.last_updated.toDate === 'function') {
          formattedTime = data.last_updated.toDate().toISOString().substring(11, 16) + " UTC";
        }

        liveFeed.push({
          id: doc.id,
          title: data.title || "ENCRYPTED_TRANSMISSION",
          summary: data.summary || "Summary extraction pending...",
          truthScore: data.truth_score ? Math.round(data.truth_score * 100) : 0,
          status: data.confidence as 'CONFIRMED' | 'ASSESSED' | 'CLAIMED' || 'CLAIMED',
          sourceCount: data.source_stack ? data.source_stack.length : 1,
          timestamp: formattedTime,
          lat: lat,
          lng: lng,
          category: data.category || 'Global',
          keywords: Array.isArray(data.keywords) ? data.keywords : [],
          sourceLinks: links,
          media: mediaItems,
          sourceStack: data.source_stack || []
        });
      });

      // Use React 18 Concurrent Rendering to prevent UI thrashing/freezing during state updates
      startTransition(() => {
        setNews(liveFeed);

        // Identify NEW breaking news
        const highestScoreItem = [...liveFeed].sort((a, b) => b.truthScore - a.truthScore)[0];
        if (highestScoreItem && highestScoreItem.truthScore >= 80 && highestScoreItem.id !== lastBreakingIdRef.current) {
          setBreakingNews(highestScoreItem);
          lastBreakingIdRef.current = highestScoreItem.id;
        }
      });

      setLoading(false);
      setIsLoadingMore(false);
    }, (error) => {
      console.error("Firebase Snapshot Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchLimit]); // Re-subscribe when the limit increases

  const dismissBreaking = () => setBreakingNews(null);

  // Increase the limit by 20 each time we scroll to the bottom
  const loadMore = () => {
    // Prevent multiple simultaneous load requests
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    setFetchLimit(prev => prev + 20);
  };

  return { news, loading, breakingNews, dismissBreaking, loadMore, isLoadingMore };
};
