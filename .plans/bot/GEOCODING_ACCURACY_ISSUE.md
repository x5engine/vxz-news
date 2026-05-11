# CRITICAL: Geocoding Accuracy Issue

**To:** VXZ Backend Intelligence Bot  
**From:** Frontend Development Team  
**Date:** 2026-05-11  
**Priority:** CRITICAL - Affects Map Visualization

---

## Issue Description

**Problem:** Articles are appearing in incorrect locations on the 3D globe map.

**Example:** 
- Gaming/tech news from Kotaku appears in random geographic locations
- Events that should be in specific cities/countries are misplaced
- "US" events might appear in Middle East
- "Japan" events might appear in Europe

**Impact:**
- Destroys credibility of the "Geo-Spatial Intelligence" feature
- Confuses users about event locations
- Makes the 3D globe visualization useless
- Undermines the entire "tactical intelligence" branding

---

## Root Cause Analysis

### Current Backend Behavior (Suspected)
The backend scraper is likely:
1. **Not geocoding at all** → Defaults to (0,0) or random coordinates
2. **Using unreliable NLP** → Extracting wrong entities (e.g., "game" → location?)
3. **Hash-based fallback** → Frontend detects (0,0) and uses MD5 hash to assign random coordinates

### Frontend Fallback (Current Workaround)
```typescript
// src/hooks/useNewsStream.ts lines 50-71
const extractGeoFallback = (title: string, id: string) => {
  const lowerTitle = title.toLowerCase();
  for (const [key, coords] of Object.entries(GEO_DICTIONARY)) {
    if (lowerTitle.includes(key)) {
      return {
        lat: coords.lat + (Math.random() * 2 - 1),
        lng: coords.lng + (Math.random() * 2 - 1)
      };
    }
  }
  
  // Ultimate hash-fallback to avoid (0,0) Null Island
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  const keys = Object.keys(GEO_DICTIONARY);
  const fallbackCoords = GEO_DICTIONARY[keys[Math.abs(hash) % keys.length]];
  return {
    lat: fallbackCoords.lat + (Math.random() * 2 - 1),
    lng: fallbackCoords.lng + (Math.random() * 2 - 1)
  };
};
```

**This is a BAD workaround** that masks the real problem. The backend MUST provide accurate coordinates.

---

## Required Backend Changes

### Gate 1 Enhancement: Intelligent Geocoding

#### Priority 1: Entity-Based Geocoding (LLM)
Use the LLM (Gemini 1.5 Pro) to extract geographic entities:

```javascript
const prompt = `
You are a geolocation expert. Extract the PRIMARY geographic location for this news event.

Title: "${event.title}"
Summary: "${event.summary}"

Rules:
1. If the event mentions a specific CITY, use that city's coordinates
2. If only a COUNTRY is mentioned, use the capital city coordinates
3. If multiple locations mentioned, choose the PRIMARY location where the event occurred
4. If NO geographic location is mentioned (e.g., tech news, gaming, corporate), return "GLOBAL" with null coordinates
5. For online/virtual events (e.g., "Steam game update"), return "GLOBAL"

Response format (JSON only):
{
  "location": "City, Country" or "GLOBAL",
  "lat": 40.7128,
  "lng": -74.0060,
  "confidence": "high" | "medium" | "low"
}
`;

const geoResult = await gemini.generateContent(prompt);
const coords = JSON.parse(geoResult.text);

if (coords.location === "GLOBAL" || coords.confidence === "low") {
  // For non-geographic news (tech, gaming, business), use a neutral location
  // Option A: Don't add to map at all (set lat/lng to null)
  event.lat = null;
  event.lng = null;
  event.geo_type = "non_geographic";
} else {
  event.lat = coords.lat;
  event.lng = coords.lng;
  event.geo_confidence = coords.confidence;
  event.geo_type = "specific_location";
}
```

#### Priority 2: Geocoding API Fallback
If LLM extraction fails or is uncertain, use a geocoding service:

**Option A: Google Geocoding API** (Recommended)
```javascript
const { Client } = require("@googlemaps/google-maps-services-js");
const client = new Client({});

const response = await client.geocode({
  params: {
    address: extractedLocation, // e.g., "Tokyo, Japan"
    key: process.env.GOOGLE_MAPS_API_KEY
  }
});

if (response.data.results.length > 0) {
  const location = response.data.results[0].geometry.location;
  event.lat = location.lat;
  event.lng = location.lng;
}
```
**Cost:** $5 per 1000 requests (first $200/month free)

**Option B: OpenStreetMap Nominatim** (Free)
```javascript
const axios = require('axios');

const response = await axios.get('https://nominatim.openstreetmap.org/search', {
  params: {
    q: extractedLocation,
    format: 'json',
    limit: 1
  },
  headers: {
    'User-Agent': 'VXZ-News-Bot/1.0'
  }
});

if (response.data.length > 0) {
  event.lat = parseFloat(response.data[0].lat);
  event.lng = parseFloat(response.data[0].lon);
}
```
**Cost:** Free (must rate-limit to 1 req/sec)

**Option C: Mapbox Geocoding API** (Alternative)
```javascript
const mapboxClient = require('@mapbox/mapbox-sdk/services/geocoding');
const geocodingClient = mapboxClient({ accessToken: process.env.MAPBOX_TOKEN });

const response = await geocodingClient.forwardGeocode({
  query: extractedLocation,
  limit: 1
}).send();

if (response.body.features.length > 0) {
  const coords = response.body.features[0].center;
  event.lat = coords[1]; // latitude
  event.lng = coords[0]; // longitude
}
```
**Cost:** 100,000 free requests/month

---

## Updated Event Classification

### Geographic Events (Show on Map)
**Criteria:** Event has a physical location
- Natural disasters (earthquakes, storms)
- Military/conflict events
- Political events (elections, summits)
- Local news (crime, accidents)
- Infrastructure (construction, openings)

**Schema:**
```json
{
  "lat": 35.6762,
  "lng": 139.6503,
  "location": "Tokyo, Japan",
  "geo_type": "specific_location",
  "geo_confidence": "high"
}
```

### Non-Geographic Events (Hide from Map)
**Criteria:** Event has no physical location
- Tech announcements (software updates, app releases)
- Gaming news (game launches, esports online)
- Corporate news (earnings, mergers)
- Entertainment (streaming content, music releases)
- Market/financial news

**Schema:**
```json
{
  "lat": null,
  "lng": null,
  "location": "GLOBAL",
  "geo_type": "non_geographic",
  "geo_confidence": "n/a"
}
```

---

## Frontend Changes (To Complement Backend Fix)

### Filter Non-Geographic Events from Globe
```tsx
// App.tsx
const globeData = liveNews
  .filter(n => n.lat !== null && n.lng !== null && n.geo_type === 'specific_location')
  .map(n => ({
    lat: n.lat,
    lng: n.lng,
    size: n.truthScore / 100,
    color: getStatusColor(n.status),
    label: n.id,
    title: n.title
  }));
```

### Show Non-Geographic in Feed Only
```tsx
{news.geo_type === 'non_geographic' && (
  <span className="mono" style={{
    fontSize: '8px',
    padding: '2px 4px',
    background: 'rgba(100,100,100,0.2)',
    color: 'var(--text-tertiary)',
    borderRadius: '2px'
  }}>
    GLOBAL
  </span>
)}
```

---

## Testing Checklist

### Test Cases (Backend)
- [ ] **US Politics:** "Biden announces new policy in Washington DC" → (38.9072, -77.0369)
- [ ] **Japan Military:** "Japan scrambles fighters near Okinawa" → (26.3344, 127.8056)
- [ ] **Ukraine Conflict:** "Explosion reported in Kyiv" → (50.4501, 30.5234)
- [ ] **Gaming News:** "Steam releases new update" → (null, null) with `geo_type: "non_geographic"`
- [ ] **Tech News:** "Apple announces new iPhone" → Could be Cupertino (37.3230, -122.0322) OR `geo_type: "non_geographic"`
- [ ] **Middle East:** "Israel conducts operation in Gaza" → (31.5, 34.4666)

### Validation Rules
1. **No (0,0) coordinates** unless event is literally at Null Island
2. **Lat range:** -90 to 90
3. **Lng range:** -180 to 180
4. **Confidence field:** Must be present
5. **Non-geographic events:** Must have `lat: null, lng: null`

---

## Migration Strategy

### Phase 1: Fix New Events (Week 1)
- Deploy enhanced geocoding to production
- All NEW events get accurate coordinates
- Monitor error rates and accuracy

### Phase 2: Backfill Existing Events (Week 2)
```javascript
// One-time migration script
const events = await db.collection('events').where('lat', '==', 0).get();

for (const doc of events.docs) {
  const coords = await intelligentGeocode(doc.data().title, doc.data().summary);
  await doc.ref.update({
    lat: coords.lat,
    lng: coords.lng,
    location: coords.location,
    geo_type: coords.geo_type,
    geo_confidence: coords.confidence
  });
}
```

### Phase 3: Remove Frontend Fallback (Week 3)
Once backend is reliable, remove `extractGeoFallback()` from frontend:
```typescript
// useNewsStream.ts - DELETE THIS ENTIRE FUNCTION
// Trust backend coordinates completely
let lat = data.lat !== undefined ? data.lat : null;
let lng = data.lng !== undefined ? data.lng : null;

// No more fallback logic needed!
```

---

## Example Implementation (Python)

```python
import google.generativeai as genai
import requests

def intelligent_geocode(title, summary):
    """
    Extract geographic coordinates using LLM + geocoding API
    """
    # Step 1: LLM extraction
    prompt = f"""
    Extract the PRIMARY geographic location for this news event.
    
    Title: "{title}"
    Summary: "{summary}"
    
    Rules:
    1. If specific CITY mentioned, return that city
    2. If only COUNTRY mentioned, return capital city
    3. If multiple locations, choose where event OCCURRED (not just mentioned)
    4. If NO physical location (tech/gaming/online), return "GLOBAL"
    
    JSON only:
    {{"location": "City, Country" or "GLOBAL", "confidence": "high|medium|low"}}
    """
    
    model = genai.GenerativeModel('gemini-1.5-pro')
    response = model.generate_content(prompt)
    geo_data = json.loads(response.text)
    
    if geo_data['location'] == 'GLOBAL' or geo_data['confidence'] == 'low':
        return {
            'lat': None,
            'lng': None,
            'location': 'GLOBAL',
            'geo_type': 'non_geographic',
            'geo_confidence': 'n/a'
        }
    
    # Step 2: Geocoding API (OpenStreetMap Nominatim)
    url = 'https://nominatim.openstreetmap.org/search'
    params = {
        'q': geo_data['location'],
        'format': 'json',
        'limit': 1
    }
    headers = {'User-Agent': 'VXZ-News-Bot/1.0'}
    
    response = requests.get(url, params=params, headers=headers)
    time.sleep(1)  # Rate limiting
    
    if response.json():
        result = response.json()[0]
        return {
            'lat': float(result['lat']),
            'lng': float(result['lon']),
            'location': geo_data['location'],
            'geo_type': 'specific_location',
            'geo_confidence': geo_data['confidence']
        }
    
    # Fallback: Return null if geocoding fails
    return {
        'lat': None,
        'lng': None,
        'location': geo_data['location'],
        'geo_type': 'uncertain',
        'geo_confidence': 'low'
    }
```

---

## Cost Analysis

### Per 1000 Events:
- **LLM (Gemini 1.5 Pro):** ~$0.50 (1000 requests × $0.0005)
- **Geocoding API:**
  - Google Maps: $5 (or free with $200/month credit)
  - OpenStreetMap: $0 (free, rate-limited)
  - Mapbox: $0 (up to 100k/month)

**Recommended:** OpenStreetMap Nominatim (free) + Gemini LLM

**Total Cost:** ~$0.50 per 1000 events (LLM only)

---

## Error Handling

### Geocoding Failures
```javascript
try {
  const coords = await intelligentGeocode(title, summary);
  event.lat = coords.lat;
  event.lng = coords.lng;
} catch (error) {
  console.error(`Geocoding failed for event ${event.id}:`, error);
  // Set to null instead of (0,0)
  event.lat = null;
  event.lng = null;
  event.geo_type = 'failed';
}
```

### Rate Limit Handling
```javascript
const rateLimiter = new RateLimiter(1, 'second'); // 1 request per second

async function safeGeocode(location) {
  await rateLimiter.acquire();
  return await geocode(location);
}
```

---

## Success Metrics

**After 1 week:**
- [ ] Zero events at (0,0) coordinates
- [ ] 90%+ accuracy for geographic events (manually verified sample)
- [ ] Non-geographic events properly tagged (lat: null, lng: null)
- [ ] Globe visualization shows only relevant events
- [ ] User complaints about misplaced events drops to zero

---

## Urgent Action Required

**This is CRITICAL for user trust.** A misplaced event (e.g., gaming news in Syria) immediately destroys credibility.

**Please implement Priority 1 (LLM-based geocoding) ASAP.**

Frontend will continue using fallback for now, but this is a temporary bandaid. The backend MUST provide accurate coordinates.

---

**Status:** 🔴 BLOCKING - Affects Core User Experience  
**Estimated Fix Time:** 2-3 days  
**Testing Time:** 1 day  
**Document ID:** GEO-ACCURACY-001
