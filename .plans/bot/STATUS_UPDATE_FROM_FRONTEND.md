# Status Update: Frontend → Backend Bot

**To:** VXZ Backend Intelligence Bot  
**From:** Frontend Development Team (via Claude Sonnet 4.5)  
**Date:** 2026-05-11  
**RE:** Your video directive implementation

---

## Great News! 🎉

We heard you're working on the **video extraction directives** from our previous requests. That's awesome! Here's what's happening on the frontend side:

---

## What We Just Shipped Today

### 1. TV Mode Enhancements ✅
**Status:** DEPLOYED

We've completely overhauled the TV Mode to handle the reality of limited video content gracefully:

**Features Added:**
- **Better empty state** - Professional "indexing in progress" UI instead of blank screen
- **Video duration overlays** - Shows MM:SS format when you provide `duration` field
- **Media type badges** - "YOUTUBE", "VIDEO", or "TEXT_ONLY" labels on thumbnails
- **Smart fallbacks** - Text-only items still appear, clearly distinguished from video
- **Error handling** - Graceful iframe blocking detection with fallback to new tab

**Schema Support Added:**
Your updated `media_links` schema is NOW SUPPORTED:
```typescript
interface MediaItem {
  source: string;
  url: string;
  media: string;
  thumbnail?: string;        // NEW - We'll display this
  duration?: number;          // NEW - We'll show overlay
  format?: 'mp4' | 'webm' | 'youtube' | 'jpg' | 'png';  // NEW
  type?: 'source_video' | 'source_image' | 'ai_generated';  // NEW
}
```

**Impact:**
- Users no longer see empty TV mode
- Clear expectations about content type
- Ready for your enhanced video scraping
- Prepared for Phase 2 AI-generated videos

---

### 2. Iframe Article Viewer Fix ✅
**Status:** DEPLOYED

**Problem Solved:** Sites like Kotaku, IGN, Forbes block iframe embedding

**Solution:**
- Detect iframe errors automatically
- Show professional error message with explanation
- Large "OPEN IN NEW TAB" button
- Dual-action buttons on source links (try iframe OR direct)

**User Experience:**
- Never see blank screens anymore
- Always have path to source article
- Clear when site blocks embedding

---

### 3. Phase 2 Planning Complete ✅
**Status:** DOCUMENTED

We've created a comprehensive **8-week roadmap** for AI-generated video intelligence:

**Document:** `.plans/PHASE_2_TV_MODE.md`

**Summary:**
- **Sprint 1:** Audio intelligence briefs (TTS with ElevenLabs/OpenAI)
- **Sprint 2:** Static slideshow videos (images + voiceover)
- **Sprint 3:** Full video composition (stock footage + narration)
- **Sprint 4:** Optimization & scale

**Cost Estimate:** ~$0.05-0.07 per video  
**Goal:** 100% video coverage for ALL events

This roadmap is ready for you to implement when your video scraping is stable.

---

## Critical Issues Found (Need Your Help) 🔴

### Issue 1: Geocoding Accuracy - CRITICAL
**Status:** ⚠️ BLOCKING USER TRUST

**Problem:**
Articles are appearing in WRONG locations on the 3D globe:
- Gaming news (Kotaku) showing up in random countries
- Tech announcements scattered globally
- "Steam update" appears in Middle East
- "iPhone announcement" shows in Japan

**Impact:**
This **destroys credibility** of the entire "Geo-Spatial Intelligence" branding. Users immediately question data quality when they see misplaced events.

**What's Happening:**
1. Backend sends (0,0) coordinates or random values
2. Frontend has emergency fallback (hash-based random assignment)
3. Result: Total chaos on the map

**What We Need:**
You MUST implement intelligent geocoding in Gate 1:

**Step 1:** Classify events as Geographic vs Non-Geographic
- **Geographic:** Natural disasters, military, politics, local news → NEEDS coordinates
- **Non-Geographic:** Gaming, tech, corporate, entertainment → SET lat/lng to NULL

**Step 2:** For Geographic events, use LLM to extract location
```javascript
// Gemini 1.5 Pro prompt
"Extract PRIMARY location from: [title] [summary]"
// Returns: "Tokyo, Japan" or "GLOBAL"
```

**Step 3:** Convert to coordinates with geocoding API
- **Free Option:** OpenStreetMap Nominatim (1 req/sec limit)
- **Paid Option:** Google Maps ($5/1000, first $200 free)

**Updated Schema:**
```json
{
  "lat": 35.6762,  // or null for non-geographic
  "lng": 139.6503,  // or null for non-geographic
  "location": "Tokyo, Japan" or "GLOBAL",
  "geo_type": "specific_location" | "non_geographic",
  "geo_confidence": "high" | "medium" | "low"
}
```

**Documentation Created:**
`.plans/bot/GEOCODING_ACCURACY_ISSUE.md` - Full implementation guide with code examples

**Priority:** CRITICAL - This is blocking user trust  
**Estimated Time:** 2-3 days

---

### Issue 2: Video Schema Enhancement - HIGH PRIORITY
**Status:** 🟡 NEEDED FOR TV MODE

**What We Need:**
When you scrape videos, please provide these additional fields:

```json
{
  "media_links": [{
    "source": "Reuters",
    "url": "https://reuters.com/article",
    "media": "https://reuters.com/video.mp4",
    "thumbnail": "https://reuters.com/thumb.jpg",  // NEW - Extract or generate
    "duration": 120,                                 // NEW - In seconds
    "format": "mp4",                                 // NEW - 'mp4', 'webm', 'youtube'
    "type": "source_video"                           // NEW - 'source_video', 'source_image', 'ai_generated'
  }]
}
```

**How to Extract These:**

**Duration (YouTube):**
```javascript
const ytdl = require('ytdl-core');
const info = await ytdl.getInfo(videoId);
const duration = parseInt(info.videoDetails.lengthSeconds);
```

**Duration (MP4/WebM):**
```javascript
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.ffprobe(videoUrl, (err, metadata) => {
  const duration = Math.round(metadata.format.duration);
});
```

**Thumbnail (YouTube):**
```javascript
const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
```

**Thumbnail (MP4/WebM):**
```javascript
// Extract frame at 2 seconds
ffmpeg(videoUrl)
  .screenshots({
    timestamps: ['00:00:02'],
    filename: 'thumbnail.jpg',
    folder: './tmp'
  });
```

**Documentation Created:**
`.plans/bot/SCHEMA_UPDATE_VIDEO.md` - Complete schema spec with examples

**Priority:** HIGH - Enhances TV Mode UX  
**Estimated Time:** 2-3 days (with geocoding)

---

## What's Working Great ✅

### Your Current Video Scraping
We've seen some events with video! Keep doing what you're doing:
- YouTube embeds are detected correctly
- Direct MP4 links work perfectly
- Frontend handles them beautifully

**Just need:**
- MORE video extraction (check article body for `<video>` tags)
- Metadata fields (duration, thumbnail)
- Better coverage (currently ~15-20%, want 40-50%+)

### Your Truth Score & ACH Matrix
Perfect! No changes needed. The verification logic is solid.

### Your Real-Time Sync
Firebase onSnapshot is working flawlessly. Events appear instantly.

---

## Timeline & Priorities

### This Week (Critical):
1. **Geocoding accuracy** (CRITICAL - blocks credibility)
2. **Video schema enhancement** (HIGH - improves UX)

### Next Week:
3. **Aggressive video scraping** (scan article bodies)
4. **Backfill top 100 events** with correct coordinates

### Future (Phase 2):
5. **AI video generation** (when scraping is stable)

---

## How We Can Help

### Frontend is Ready:
✅ TypeScript interfaces updated  
✅ UI handles new schema fields  
✅ Fallbacks for missing data  
✅ Error states designed  
✅ Documentation complete  

### We're Waiting On:
🔴 Geocoding implementation  
🟡 Video metadata fields  
🟢 Increased video coverage  

---

## Testing & Validation

### We'll Test These Cases:
Once you deploy geocoding + video enhancements:

**Geographic Events:**
- [ ] "Biden in Washington DC" → (38.9072, -77.0369) ✅
- [ ] "Earthquake in Tokyo" → (35.6762, 139.6503) ✅
- [ ] "Kyiv under attack" → (50.4501, 30.5234) ✅

**Non-Geographic Events:**
- [ ] "Steam releases update" → (null, null) with `geo_type: "non_geographic"` ✅
- [ ] "Apple announces iPhone" → (null, null) with `geo_type: "non_geographic"` ✅
- [ ] "Netflix drops new series" → (null, null) with `geo_type: "non_geographic"` ✅

**Video Metadata:**
- [ ] YouTube video has `duration` and `thumbnail` ✅
- [ ] MP4 video has `duration` ✅
- [ ] `format` field matches actual media type ✅

---

## Communication

### We've Created These Docs For You:
1. **`.plans/PHASE_2_TV_MODE.md`** - AI video generation roadmap
2. **`.plans/bot/GEOCODING_ACCURACY_ISSUE.md`** - Geocoding implementation guide
3. **`.plans/bot/SCHEMA_UPDATE_VIDEO.md`** - Video schema spec
4. **`.plans/IFRAME_AND_GEO_FIXES.md`** - Summary of today's fixes

**All documents include:**
- Clear problem statements
- Code examples (Python & JavaScript)
- Cost estimates
- Testing checklists

### Questions?
If anything is unclear:
- Check the documentation (detailed examples provided)
- Ask for clarification (we're here to help!)
- Test incrementally (don't deploy everything at once)

---

## Appreciation 🙏

Thank you for working on the video directives! The scraping engine you built is incredible:
- Real-time sync is flawless
- Truth Score algorithm is elegant
- Hunter Array architecture is solid
- Firebase integration is perfect

**Two quick fixes** (geocoding + video metadata) and we'll have a **world-class intelligence platform**.

---

## Final Checklist (For Backend)

### Critical (This Week):
- [ ] Implement LLM geographic classification
- [ ] Integrate geocoding API (OpenStreetMap recommended)
- [ ] Add `geo_type`, `geo_confidence` fields
- [ ] Set `lat/lng` to `null` for non-geographic events
- [ ] Add `duration`, `thumbnail`, `format`, `type` to media_links
- [ ] Test with 20 sample events (10 geographic, 10 non-geographic)

### High Priority (Next Week):
- [ ] Scan article bodies for embedded videos
- [ ] Extract YouTube embeds from iframes
- [ ] Parse Twitter/X video embeds
- [ ] Increase video coverage to 40%+

### Future (Phase 2):
- [ ] AI video generation pipeline (see PHASE_2_TV_MODE.md)
- [ ] TTS integration
- [ ] Stock footage compositor

---

**Status:** Frontend ready, waiting on backend enhancements  
**Blockers:** Geocoding accuracy (critical), video metadata (high)  
**ETA:** 3-4 days estimated for critical fixes  
**Confidence:** High - Clear specs provided

Keep up the amazing work! 🚀

---

**Sent From:** Frontend Development Team  
**Delivered Via:** Claude Sonnet 4.5  
**Document ID:** STATUS-UPDATE-001  
**Date:** 2026-05-11
