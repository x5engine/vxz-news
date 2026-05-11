# VXZ Core Architecture Directive: API Federation & Media Enrichment

**To: VXZ Backend Intelligence Bot**
**From: VXZ Lead Architect (Frontend/Systems)**

## 1. STRATEGIC OBJECTIVE
You are receiving two JSON arrays containing 10 distinct, free-tier News and Multimedia APIs (`newsApis` and `mediaNewsApis`). 

Your directive is to build an **Intelligent API Federation Router (IAFR)**. Do not blindly hit all APIs at once; this will exhaust our free-tier quotas immediately. Instead, you must engineer a highly optimized, asynchronous fallback routing system that maximizes our data coverage while stretching the daily quotas to 100% capacity over a 24-hour cycle.

## 2. ENGINEERING SPECIFICATIONS

### Phase 1: The Query Router (News Federation)
You must implement a `RoundRobinRouter` for text-based news extraction:
1.  **Primary Pulse (TheNewsAPI & NewsAPI.org):** Use these for your baseline 5-minute discovery sweeps. They have the highest quality T1 sources.
2.  **Specialized Fallback (GNews & APITube):** Do not waste these on general queries. Only trigger these APIs when Gate 1 (Semantic Clustering) detects a massive global anomaly (Truth Score spike) but lacks sufficient $S_{eff}$ (Effective Source Count). Use these to aggressively cross-verify the anomaly.
3.  **Quota State Machine:** Build a local dictionary tracking `{"API_NAME": requests_used_today}`. If an API hits 95% of its free tier, automatically route all queries to the next available service.

### Phase 2: The OSINT Media Harvester
The frontend's new `Live TV` mode is entirely dependent on your ability to feed it high-quality `.mp4` files and YouTube IDs.
1.  **YouTube Data API Integration:** Do not waste the 10,000 unit quota on search. Use it *only* for the `videos.list` endpoint to extract high-res thumbnails and metadata when an article links a `youtu.be` source.
2.  **Bing News Search API:** Use this as your primary image/video scraper. Bing's indexing of trending news media is unparalleled. When an event clusters, query Bing News with the `event_title` and `freshness=Day` to pull the top 3 highest-resolution `.mp4` or `.jpg` assets.
3.  **Dailymotion Graph API:** Since this is free (with attribution), use this as your continuous fallback background scanner for international/regional broadcast clips (e.g., Al Jazeera, France24).

### Phase 3: The Target Schema Update
Inject the federated media results directly into the `events` collection. The frontend expects the `media_links` array to look exactly like this:
```json
"media_links": [
  { "source": "Bing Video Intel", "url": "...", "media": "https://.../video.mp4" },
  { "source": "YouTube Broadcast", "url": "...", "media": "https://youtube.com/watch?v=123456" }
]
```

## 3. STRICT SYSTEM RESTRICTION REMINDER
Your API router must intercept and sanitize all outgoing queries and incoming responses. **Never query, store, or forward data regarding Morocco.** Drop any payload matching that region instantly.

**Please confirm implementation of the API Federation Router and deployment of the updated scrapers.**
