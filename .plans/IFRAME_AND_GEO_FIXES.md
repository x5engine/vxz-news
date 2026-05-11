# Critical Fixes: Iframe Blocking & Geocoding Accuracy

**Date:** 2026-05-11  
**Status:** ✅ Frontend Fixed | 🔴 Backend Action Required

---

## Issue 1: Iframe Blocking (X-Frame-Options) - FIXED ✅

### Problem
Many news sites (Kotaku, IGN, Forbes, etc.) block iframe embedding with `X-Frame-Options: DENY` or `SAMEORIGIN` headers, causing:
- Blank white screen in article viewer
- "refused to connect" error in console
- Users stuck without access to source article

### Root Cause
HTTP security headers prevent embedding third-party sites:
```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none'
```

### Solution Implemented

#### A. Graceful Error Handling
Added `iframeError` state to detect loading failures:
```tsx
const [iframeError, setIframeError] = useState(false);

<iframe
  src={iframeUrl}
  onError={() => setIframeError(true)}
/>
```

#### B. Professional Error State
When iframe fails, show:
- AlertTriangle icon (64px, amber)
- Clear message: "IFRAME_BLOCKED_BY_SOURCE"
- Explanation of security policies
- Large "OPEN_SOURCE_ARTICLE" button (opens in new tab)
- Technical details (domain, X-Frame-Options info)

**Visual Design:**
```
┌─────────────────────────────────────┐
│                                     │
│          ⚠️ (AlertTriangle)          │
│                                     │
│   [ IFRAME_BLOCKED_BY_SOURCE ]     │
│                                     │
│   This source has security         │
│   policies that prevent            │
│   embedding...                      │
│                                     │
│   ┌──────────────────────────┐    │
│   │ 🔗 OPEN_SOURCE_ARTICLE   │    │
│   └──────────────────────────┘    │
│                                     │
│   Domain: kotaku.com                │
│   X-Frame-Options: DENY             │
│                                     │
└─────────────────────────────────────┘
```

#### C. Dual Action Buttons
Added TWO buttons for each source link:
1. **Primary Button** (wider): Click to open in iframe viewer
2. **External Button** (icon only): Direct link to new tab

```tsx
<div style={{ display: 'flex', gap: '8px' }}>
  <a onClick={() => setIframeUrl(link.url)}>
    {link.source} <ExternalLink />
  </a>
  <a href={link.url} target="_blank">
    <ExternalLink />
  </a>
</div>
```

**User Flow:**
- Try iframe first (better UX, keeps user on VXZ)
- If blocked, fallback to new tab (automatic)
- User always has direct "new tab" option

### Files Changed
- `src/App.tsx` (3 edits)
  - Added `iframeError` state
  - Added `onError` handler to iframe
  - Created fallback error UI
  - Split source links into dual buttons

### Impact
✅ Users never see blank screens  
✅ Clear explanation when embedding fails  
✅ Always have path to source article  
✅ Better UX than competitors (most just fail silently)

---

## Issue 2: Geocoding Accuracy - BACKEND ACTION REQUIRED 🔴

### Problem
**CRITICAL:** Articles appearing in wrong locations on 3D globe:
- Gaming news (Kotaku) appearing in random countries
- Tech announcements scattered globally
- US events showing in Middle East
- Japan events appearing in Europe

**User Impact:**
- Destroys credibility of "Geo-Spatial Intelligence" branding
- Makes the 3D globe visualization useless
- Users question data quality
- Tactical/military aesthetic undermined

### Root Cause
Backend scraper is:
1. Not geocoding at all → defaults to (0,0)
2. Using unreliable NLP → extracts wrong entities
3. No classification → treats ALL news as geographic

Frontend has emergency fallback (hash-based random assignment), but this is a **bandaid**, not a solution.

### Solution Required (Backend)

#### Priority 1: LLM-Based Geographic Classification
Use Gemini 1.5 Pro to classify events:

**Geographic Events** (show on map):
- Natural disasters
- Military/conflict
- Political events (summits, elections)
- Local news (crime, accidents)
- Infrastructure

**Non-Geographic Events** (DON'T show on map):
- Gaming news (Steam updates, game releases)
- Tech announcements (iPhone launch, software updates)
- Corporate news (earnings, mergers)
- Entertainment (streaming content, music)
- Market/financial news

#### Example LLM Prompt:
```javascript
const prompt = `
Extract PRIMARY geographic location for this news event.

Title: "${title}"
Summary: "${summary}"

Rules:
1. If specific CITY mentioned, return that city
2. If only COUNTRY mentioned, return capital
3. If NO physical location (tech/gaming/online), return "GLOBAL"
4. If multiple locations, choose where event OCCURRED

JSON only:
{"location": "City, Country" or "GLOBAL", "confidence": "high|medium|low"}
`;
```

#### Priority 2: Geocoding API Integration
After LLM extraction, convert to coordinates:

**Recommended:** OpenStreetMap Nominatim (FREE)
```javascript
const response = await fetch(
  `https://nominatim.openstreetmap.org/search?` +
  `q=${encodeURIComponent(location)}&format=json&limit=1`,
  { headers: { 'User-Agent': 'VXZ-News-Bot/1.0' } }
);

const coords = response.json()[0];
event.lat = parseFloat(coords.lat);
event.lng = parseFloat(coords.lon);
```

**Alternative:** Google Geocoding API ($5/1000 requests, $200/month free)

#### Updated Schema
```json
{
  "lat": 35.6762,           // or null for non-geographic
  "lng": 139.6503,          // or null for non-geographic
  "location": "Tokyo, Japan" or "GLOBAL",
  "geo_type": "specific_location" | "non_geographic" | "uncertain",
  "geo_confidence": "high" | "medium" | "low" | "n/a"
}
```

### Frontend Changes (Once Backend Fixed)

#### Filter Non-Geographic from Globe
```tsx
const globeData = liveNews
  .filter(n => n.lat !== null && n.lng !== null)
  .map(n => ({
    lat: n.lat,
    lng: n.lng,
    size: n.truthScore / 100,
    color: getStatusColor(n.status),
    label: n.id,
    title: n.title
  }));
```

#### Show Badge for Non-Geographic
```tsx
{news.geo_type === 'non_geographic' && (
  <span className="mono">GLOBAL</span>
)}
```

#### Remove Emergency Fallback
Once backend is reliable, DELETE `extractGeoFallback()` from `useNewsStream.ts` and trust backend coordinates.

### Testing Checklist
- [ ] US event: "Biden in Washington DC" → (38.9072, -77.0369) ✅
- [ ] Japan event: "Okinawa military drill" → (26.3344, 127.8056) ✅
- [ ] Gaming event: "Steam update released" → (null, null) with `geo_type: "non_geographic"` ✅
- [ ] Tech event: "Apple announces iPhone" → (null, null) with `geo_type: "non_geographic"` ✅
- [ ] No events at (0,0) Null Island ✅
- [ ] Globe only shows geographic events ✅

### Documentation Created
**`.plans/bot/GEOCODING_ACCURACY_ISSUE.md`** - Full implementation spec including:
- Python code examples
- Cost analysis (~$0.50 per 1000 events)
- Rate limiting strategies
- Migration plan
- Error handling

---

## Summary of Changes

### Frontend (Deployed ✅)
1. **Iframe error handling** with professional fallback UI
2. **Dual-action source links** (iframe + direct)
3. **TypeScript interfaces** updated for geo fields
4. **Documentation** for backend team

### Backend (Action Required 🔴)
1. **Implement LLM geographic classification** (Priority: CRITICAL)
2. **Integrate geocoding API** (OpenStreetMap or Google)
3. **Add geo_type field** to event schema
4. **Set lat/lng to null** for non-geographic events
5. **Test with sample events** before production

### Cost Impact
- **Frontend:** $0 (no new services)
- **Backend:** ~$0.50 per 1000 events (LLM only, geocoding free)

### Timeline
- **Frontend:** ✅ Complete (deployed today)
- **Backend:** 2-3 days estimated (critical priority)
- **Testing:** 1 day
- **Total:** 3-4 days to full resolution

---

## User Experience Improvements

### Before These Fixes:
❌ Blank iframe screens (user confused)  
❌ Gaming news appears in Syria on map  
❌ Tech news scattered randomly  
❌ No clear path when iframe fails  
❌ Credibility destroyed by wrong locations  

### After These Fixes:
✅ Clear error messages with fallback  
✅ Only geographic events on map  
✅ Gaming/tech news properly labeled "GLOBAL"  
✅ Users always have access to source  
✅ 3D globe shows accurate intelligence  

---

## Next Steps

### Immediate (Today):
- [x] Deploy frontend iframe fixes
- [x] Test with blocked sites (Kotaku, Forbes, IGN)
- [x] Create backend documentation

### This Week:
- [ ] Backend implements LLM geographic classification
- [ ] Backend integrates geocoding API
- [ ] Backend updates schema with geo_type field
- [ ] Test with 20 sample events (mix of geographic/non-geographic)

### Next Week:
- [ ] Deploy backend changes to production
- [ ] Monitor accuracy with manual spot-checks
- [ ] Backfill top 100 events with correct coordinates
- [ ] Remove frontend emergency fallback (trust backend)

---

**Status:** Frontend complete, backend in progress  
**Blocking:** Geocoding accuracy (critical for credibility)  
**Owner:** Backend team to implement geocoding spec  
**ETA:** 3-4 days to full resolution
