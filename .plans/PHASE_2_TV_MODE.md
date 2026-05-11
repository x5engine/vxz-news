# Phase 2: AI-Generated Video Intelligence System

## Status: 🔄 PLANNED (Ready for Implementation)

## Overview
Transform VXZ.News TV Mode into a fully autonomous video intelligence platform that generates high-quality video content for EVERY news event, regardless of whether source articles contain video footage.

---

## Architecture: The "Video Intelligence Pipeline"

### Stage 1: Content Analysis & Script Generation
**Input:** News event from Firestore (`title`, `summary`, `truth_score`, `source_stack`)

**Process:**
1. **Script Generation via LLM:**
   - Use Gemini 1.5 Pro or GPT-4 to generate a 30-90 second intelligence brief
   - Format: "This is VXZ Intelligence. [Event Description]. Truth Score: [X]%. [Key Details]. [Source Attribution]."
   - Include verification context: "Confirmed by [N] independent sources" or "Currently assessed by [source names]"

2. **Keyword Extraction:**
   - Extract visual keywords from title/summary (e.g., "Taiwan", "military", "aircraft", "coast")
   - Rank by relevance for stock footage matching

**Output:** `script.txt`, `keywords.json`

---

### Stage 2: Voice Synthesis (TTS)
**Provider Options:**
- **ElevenLabs** (Recommended - Natural, news anchor quality)
  - Voice: Professional News Anchor preset
  - Settings: Stability 0.6, Clarity 0.8
  - Cost: ~$0.30 per 1000 characters
  
- **OpenAI TTS** (Alternative - Cost-effective)
  - Voice: `alloy` or `onyx` (professional tone)
  - Cost: ~$0.015 per 1000 characters

- **Google Cloud TTS** (Fallback - Free tier available)
  - Voice: `en-US-Neural2-J` (news broadcast style)

**Process:**
1. Send script to TTS API
2. Receive audio file (MP3/WAV)
3. Store temporarily in `/tmp/vxz_audio/`
4. Extract duration for video composition

**Output:** `narration.mp3`, duration in seconds

---

### Stage 3: Visual Asset Acquisition

#### Option A: Stock Footage APIs (Primary)
**Pexels API** (Free, 200 requests/hour):
```javascript
GET https://api.pexels.com/videos/search?query=taiwan+military&per_page=5
```
- Filter by duration (prefer 10-30 second clips)
- Download top 3-5 matching videos
- Fallback to image search if no video found

**Pixabay API** (Free, 5000 requests/day):
```javascript
GET https://pixabay.com/api/videos/?key=API_KEY&q=aircraft
```

**Unsplash API** (Images - Fallback):
```javascript
GET https://api.unsplash.com/search/photos?query=coast+guard
```

#### Option B: News Source Screenshots (Secondary)
- Use Puppeteer/Playwright to capture article page
- Extract hero image/video frame
- Apply cinematic filter (desaturate, grain, vignette)

#### Option C: Generated Graphics (Tertiary)
- Use Canvas API to create:
  - Map visualization with event location highlighted
  - Text overlays: "BREAKING: [Title]"
  - Truth Score gauge animation
  - Source count badge

**Output:** `footage/` directory with 3-5 video clips or images

---

### Stage 4: Video Composition (FFmpeg)

**Compositor Stack:**
```bash
ffmpeg -i footage1.mp4 -i footage2.mp4 -i narration.mp3 \
  -filter_complex "[0:v]scale=1920:1080,setsar=1[v0]; \
                   [1:v]scale=1920:1080,setsar=1[v1]; \
                   [v0][v1]concat=n=2:v=1:a=0[outv]; \
                   [outv]drawtext=text='VXZ INTELLIGENCE':x=50:y=50:fontsize=24:fontcolor=white[final]" \
  -map "[final]" -map 2:a -c:v libx264 -preset fast -crf 23 -c:a aac output.mp4
```

**Composition Layers:**
1. **Base Layer:** Stock footage/images (crossfade between clips)
2. **Overlay Layer:** 
   - VXZ logo (top-left, 10% opacity)
   - Truth Score badge (top-right, animated circle)
   - "LIVE INTELLIGENCE" ticker (bottom, red stripe)
   - Timestamp (bottom-right)
3. **Audio Layer:** TTS narration + subtle background ambience

**Effects:**
- Ken Burns effect on static images (slow zoom/pan)
- Subtle film grain (0.05 intensity)
- Color grade: Desaturate 20%, boost contrast 15%
- Crossfade transitions (1 second)

**Output:** `final_video.mp4` (1920x1080, H.264, ~5-15MB)

---

### Stage 5: Storage & Delivery

**Firebase Storage Structure:**
```
/vxz-video-intelligence/
  /{event_id}/
    video.mp4          // Final rendered video
    thumbnail.jpg      // Frame at 2-second mark
    metadata.json      // Duration, filesize, generated_at
```

**Firestore Update:**
```json
{
  "media_links": [{
    "source": "VXZ_AI_GENERATED",
    "url": "https://firebasestorage.googleapis.com/.../video.mp4",
    "media": "https://firebasestorage.googleapis.com/.../video.mp4",
    "thumbnail": "https://firebasestorage.googleapis.com/.../thumbnail.jpg",
    "duration": 45,
    "format": "mp4",
    "type": "ai_generated"
  }]
}
```

---

## Implementation Roadmap

### Sprint 1: Audio Intelligence Briefs (Week 1-2)
**Goal:** Generate audio-only briefings for every event

**Tasks:**
- [ ] Integrate ElevenLabs TTS API
- [ ] Create script generation prompt template
- [ ] Build audio generation Cloud Function
- [ ] Store MP3 files in Firebase Storage
- [ ] Update frontend to play audio intelligence briefs

**Deliverable:** Audio player in TV mode for text-only events

---

### Sprint 2: Static Slideshow Videos (Week 3-4)
**Goal:** Combine images with audio narration

**Tasks:**
- [ ] Integrate Pexels/Pixabay image APIs
- [ ] Setup FFmpeg in Cloud Functions (or dedicated Docker container)
- [ ] Build image compositor (3-5 images + Ken Burns effect)
- [ ] Add VXZ branding overlays
- [ ] Generate thumbnails automatically

**Deliverable:** 30-second slideshow videos with voiceover

---

### Sprint 3: Full Video Composition (Week 5-6)
**Goal:** Use stock video footage for dynamic content

**Tasks:**
- [ ] Integrate Pexels/Pixabay video APIs
- [ ] Build intelligent footage selection algorithm (keyword matching)
- [ ] Implement multi-clip concatenation with transitions
- [ ] Add animated truth score overlay
- [ ] Optimize rendering performance (parallel processing)

**Deliverable:** Professional-quality AI-generated news videos

---

### Sprint 4: Optimization & Scale (Week 7-8)
**Goal:** Handle 100+ videos per day, reduce costs

**Tasks:**
- [ ] Implement video caching (don't regenerate for updates)
- [ ] Add batch processing queue (process 10 videos in parallel)
- [ ] Optimize FFmpeg flags for speed (preset ultrafast for drafts)
- [ ] Setup CDN for video delivery
- [ ] Add video quality selector (480p/720p/1080p)

**Deliverable:** Production-ready video generation pipeline

---

## Technical Specifications

### Backend Requirements
**New Cloud Function:** `generateVideoIntelligence`
- **Trigger:** Firestore onCreate/onUpdate on `/events/{eventId}`
- **Runtime:** Node.js 20 (for FFmpeg support) or Python 3.11
- **Memory:** 2GB (video processing is RAM-intensive)
- **Timeout:** 540 seconds (9 minutes max)
- **Concurrency:** 10 simultaneous renders

**Dependencies:**
```json
{
  "elevenlabs": "^1.0.0",
  "pexels": "^1.4.0",
  "fluent-ffmpeg": "^2.1.2",
  "canvas": "^2.11.2",
  "@google-cloud/storage": "^7.0.0"
}
```

### Cost Estimates (per 1000 videos)
- **TTS (ElevenLabs):** ~$15-30
- **Stock APIs:** $0 (free tier sufficient)
- **Cloud Functions:** ~$20 (compute time)
- **Storage (Firebase):** ~$5 (15GB @ $0.026/GB)
- **Bandwidth:** ~$12 (100GB @ $0.12/GB)

**Total:** ~$52-67 per 1000 videos (~$0.05-0.07 per video)

---

## Frontend Enhancements

### TV Mode Updates
```tsx
// Show AI-generated badge
{media.type === 'ai_generated' && (
  <span className="mono" style={{
    position: 'absolute',
    top: '8px',
    left: '8px',
    background: 'rgba(0,122,255,0.9)',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '9px'
  }}>
    <Sparkles size={10} /> AI_GENERATED
  </span>
)}

// Audio-only player fallback
{!video && audioUrl && (
  <div className="audio-player">
    <audio src={audioUrl} controls autoPlay />
    <div className="audio-visualizer">
      {/* Animated waveform */}
    </div>
  </div>
)}
```

### Quality Selector
```tsx
<select onChange={(e) => setVideoQuality(e.target.value)}>
  <option value="1080p">1080p (Full HD)</option>
  <option value="720p">720p (Recommended)</option>
  <option value="480p">480p (Data Saver)</option>
</select>
```

---

## Future Enhancements (Phase 3)

### Advanced Features
1. **Multi-Language Support:** Generate videos in 10+ languages
2. **Custom Avatars:** AI news anchor with lip-sync (D-ID, Synthesia)
3. **Live Event Tracking:** Update videos in real-time as truth score changes
4. **Interactive Timelines:** Click to see how story evolved over time
5. **Community Dubbing:** Allow users to submit voiceovers in their language

### ML Optimizations
1. **Smart Footage Selection:** Train model to match footage to context
2. **Auto-Captioning:** Generate subtitles with speaker diarization
3. **Deepfake Detection:** Scan source videos for manipulation
4. **Emotional Tone Analysis:** Adjust music/pacing based on event severity

---

## Success Metrics

### KPIs (3 months post-launch)
- **Coverage:** 100% of events have video content (up from ~20%)
- **Engagement:** 3x increase in TV mode session duration
- **Quality:** 85%+ user satisfaction (via feedback)
- **Performance:** <5 minute video generation time (from event publish)
- **Cost:** <$0.10 per video (including all services)

---

## Risk Mitigation

### Technical Risks
- **FFmpeg Timeout:** Use background job queue (Cloud Tasks) for long renders
- **API Rate Limits:** Rotate between Pexels/Pixabay/Unsplash
- **Storage Costs:** Implement 30-day auto-deletion for old videos
- **Copyright Issues:** Only use CC0/royalty-free stock footage

### Quality Risks
- **Poor Footage Match:** Fallback to abstract backgrounds (particles, gradients)
- **Unnatural TTS:** Offer multiple voice options, let users choose
- **Video-Text Mismatch:** Manual QA for first 100 videos, then automate

---

## Compliance & Ethics

### Content Safety
- **No Graphic Content:** Filter violence/gore keywords from footage search
- **Bias Detection:** Audit TTS scripts for loaded language
- **Attribution:** Watermark all AI-generated content clearly
- **Opt-Out:** Allow sources to request video removal

### Data Privacy
- **No PII in Videos:** Scrub personal information from narration
- **GDPR Compliance:** Allow users to delete their generated content
- **Transparency:** Clearly label AI-generated vs. source video

---

## Getting Started (Quick Start)

### Prototype in 1 Day
1. **Clone template:** `git clone vxz-video-gen-starter`
2. **Add API keys:** ElevenLabs, Pexels, Firebase
3. **Test script:** `node generate.js --event-id=test123`
4. **View output:** `output/test123/video.mp4`

### Full Integration (1 Week)
1. Deploy Cloud Function
2. Update Firestore schema
3. Test with 10 sample events
4. Launch to production (monitor costs closely)

---

## Questions for Team Discussion

1. **Voice Preference:** Male/female anchor? Accent (US/UK/neutral)?
2. **Branding:** Should VXZ logo be prominent or subtle?
3. **Music:** Background ambience (yes/no)? Tone (serious/neutral)?
4. **Video Length:** Fixed 30s or dynamic based on content?
5. **Thumbnail Strategy:** AI-generated or first frame?

---

## Resources & References

- **ElevenLabs Docs:** https://elevenlabs.io/docs
- **Pexels API:** https://www.pexels.com/api/documentation/
- **FFmpeg Guide:** https://ffmpeg.org/ffmpeg.html
- **Firebase Storage:** https://firebase.google.com/docs/storage

---

**Last Updated:** 2026-05-11  
**Owner:** VXZ Engineering Team  
**Status:** Ready for Sprint Planning
