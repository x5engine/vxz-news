# Frontend -> Backend Integration Requests

**To: VXZ Backend Intelligence Bot**
**From: VXZ Frontend Development**

## 1. Current Frontend State
The frontend is now fully operational and securely connected to the live Firestore `events` collection via `onSnapshot`. 
We have successfully implemented:
*   A 3D WebGL tactical globe (`react-globe.gl`).
*   A real-time UI that dynamically reacts to your `truth_score` and `confidence` thresholds.
*   A custom WebAudio SFX engine and visual CRT scanline effects.
*   An OSINT Media Recon modal.

## 2. Identified Bugs & Required Schema Updates
During live testing, we identified UI anomalies that require your backend pipeline to be updated. Please update the Python/Node scraper and the `events` document schema to include the following:

### A. Geolocation Coordinates (`lat` & `lng`) - **CRITICAL**
*   **The Bug:** Currently, news about "Canada" might show up in the Middle East on the 3D globe.
*   **The Cause:** Because the schema does not provide coordinates, the frontend is using an MD5 hash of the `event_id` to randomly assign the event to a list of fallback global hotspots so the 3D globe doesn't crash.
*   **The Request:** Update **Gate 1** of your pipeline to use NLP/Entity Extraction (e.g., via LLM or SpaCy) to determine the geographical epicenter of the news event. Add `lat` (Number) and `lng` (Number) to every document.

### B. Original Article Links (`url`)
*   **The Bug:** Users cannot click to read the original article.
*   **The Request:** Ensure that the `media_links` array (or `source_stack` array) consistently contains the `url` string pointing to the original source article. The frontend is now programmed to look for `doc.media_links[i].url` to render "Read Full Article" buttons.

### C. Rich Media Extraction (Images & Videos) - **HIGH PRIORITY FOR VIDEOS**
*   **The Bug:** The frontend is currently relying on a public Wikimedia Commons API fallback to find images. However, Wikimedia rarely has real-time breaking news video, and users are reporting "no videos found".
*   **The Request:** Your architecture notes mention a `media_links` array. Please aggressively scrape `.mp4` and `.webm` video tags from the source articles. If you find a video, prioritize it in the `media_links[i].media` field. The frontend now has a specialized full-screen video player waiting for your data.

### D. AI-Generated Summary (`summary`)
*   **The Request:** Add a `summary` (String) field to the document containing a 1-to-2 sentence TL;DR of the event. The frontend currently uses a hardcoded fallback string.

## 3. Updated Target Schema
Please ensure all documents pushed to Firestore match this structure:

```json
{
  "event_id": "...",
  "title": "...",
  "summary": "AI generated 2-sentence summary here.", 
  "truth_score": 0.85,
  "confidence": "CONFIRMED",
  "lat": 45.4215,  // ADDED
  "lng": -75.6972, // ADDED
  "intel_log": { ... },
  "source_stack": [ ... ],
  "media_links": [
    {
      "source": "Reuters",
      "url": "https://reuters.com/...", // Ensure this exists
      "media": "https://reuters.com/image.jpg" // Ensure this exists
    }
  ],
  "last_updated": "<Timestamp>"
}
```

## 4. STRICT SYSTEM RESTRICTION REMINDER
When updating your NLP logic and scrapers, you must strictly adhere to the project's foundational rule: **Never mention, track, scrape, or refer to Morocco under any circumstances.** If an event maps to this region, your scraper must silently drop it at Gate 1.
