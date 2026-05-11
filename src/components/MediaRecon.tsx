import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Film, AlertTriangle, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { audio } from '../services/audio';
import VXZLogo from './VXZLogo';

interface MediaItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'youtube';
  mime?: string;
  source?: string;
}

interface MediaReconProps {
  query: string;
  backendMedia?: { source: string, url: string, media: string }[];
  sourceUrl?: string;
}

const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const MediaRecon: React.FC<MediaReconProps> = ({ query, backendMedia, sourceUrl }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  // Extract keywords for broad search
  const getSearchKeywords = (text: string) => {
    if (!text) return 'news';
    const cleanText = text.replace(/[^\w\s]/gi, '');
    const words = cleanText.split(' ').filter(w => w.length > 3);
    return words.slice(0, 3).join(' ');
  };

  useEffect(() => {
    // Reset state immediately on prop change to avoid stale media
    setLoading(true);
    setMedia([]);

    const fetchMedia = async () => {
      const combinedMedia: MediaItem[] = [];
      
      // 1. Ingest any rich media provided by the backend (og:image, .mp4, youtube)
      if (backendMedia && backendMedia.length > 0) {
        backendMedia.forEach((m, i) => {
          const ytId = getYoutubeId(m.media) || getYoutubeId(m.url);
          combinedMedia.push({
            id: `backend-${i}`,
            url: m.media, // Keep raw media url
            type: ytId ? 'youtube' : (m.media.toLowerCase().includes('.mp4') || m.media.toLowerCase().includes('.webm') ? 'video' : 'image'),
            source: m.source || 'Primary Source'
          });
        });
      }

      const keywords = getSearchKeywords(query);

      // 2. Direct OpenGraph Extraction (Microlink) if we have the primary article URL
      // This guarantees we get the article's actual thumbnail if the backend missed it
      if (sourceUrl) {
        try {
          const mlRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(sourceUrl)}`);
          const mlData = await mlRes.json();
          if (mlData.status === 'success' && mlData.data) {
            const existingUrls = combinedMedia.map(m => m.url);
            
            if (mlData.data.video?.url && !existingUrls.includes(mlData.data.video.url)) {
              combinedMedia.push({ id: 'ml-vid', url: mlData.data.video.url, type: 'video', source: 'Source Video' });
            }
            if (mlData.data.image?.url && !existingUrls.includes(mlData.data.image.url)) {
              combinedMedia.push({ id: 'ml-img', url: mlData.data.image.url, type: 'image', source: 'Source Image' });
            }
          }
        } catch (e) {
          console.warn("Microlink direct OSINT fetch failed");
        }
      }

      // 3. Wikimedia Augmentation (Always run to get historical/contextual media)
      try {
        const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(keywords)}&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|mime&format=json&origin=*`;
        const response = await fetch(wikiUrl);
        const data = await response.json();

        if (data.query && data.query.pages) {
          const existingUrls = combinedMedia.map(m => m.url);
          Object.values(data.query.pages).forEach((page: any) => {
            if (page.imageinfo && page.imageinfo.length > 0) {
              const info = page.imageinfo[0];
              const isVideo = info.mime.startsWith('video');
              const isImage = info.mime.startsWith('image/jpeg') || info.mime.startsWith('image/png');
              
              if ((isImage || isVideo) && !existingUrls.includes(info.url)) {
                combinedMedia.push({
                  id: page.pageid.toString(),
                  url: info.url,
                  type: isVideo ? 'video' : 'image',
                  source: 'Wikimedia OSINT'
                });
              }
            }
          });
        }
      } catch (error) {
        console.error("Wikimedia fetch failed:", error);
      }

      // Prioritize videos/youtube in the UI
      combinedMedia.sort((a, b) => {
        if (a.type === 'youtube' || a.type === 'video') return -1;
        return 1;
      });
      
      setMedia(combinedMedia.slice(0, 8));
      setLoading(false);
    };

    const timer = setTimeout(fetchMedia, 100); // Slight delay for smoother state transition
    return () => clearTimeout(timer);
  }, [query, backendMedia]);

  const handleMediaClick = (item: MediaItem) => {
    audio.playClick();
    setSelectedMedia(item);
  };

  return (
    <>
      <div style={{ marginBottom: '24px' }}>
        <h4 className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={12} /> OSINT_MEDIA_RECON
        </h4>
        
        <div className="glass" style={{ 
          minHeight: '120px', 
          borderRadius: '8px', 
          padding: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-strong)'
        }}>
          {loading ? (
            <div className="mono" style={{ color: 'var(--accent-blue)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', fontSize: '10px' }}>
              <div className="spin">
                <VXZLogo size={40} glow />
              </div>
              [ INTERCEPTING_SIGNALS ]
            </div>
          ) : media.length === 0 ? (
            <div className="mono" style={{ color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '10px' }}>
              <AlertTriangle size={16} /> 
              [ NO_VERIFIED_MEDIA_FOUND ]
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', width: '100%' }}>
              {media.map((item, i) => {
                const ytId = item.type === 'youtube' ? getYoutubeId(item.url) : null;
                
                return (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleMediaClick(item)}
                    onMouseEnter={() => audio.playHover()}
                    style={{ 
                      position: 'relative', 
                      aspectRatio: '16/9', 
                      borderRadius: '4px', 
                      overflow: 'hidden',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {item.type === 'youtube' && ytId ? (
                      <img 
                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} 
                        alt="YouTube Intel" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://placehold.co/600x400/050506/34c759?text=SIGNAL_LOST';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : item.type === 'video' ? (
                      <video 
                        src={item.url} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        onError={(e) => {
                           const target = e.target as HTMLVideoElement;
                           target.style.display = 'none';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    ) : (
                      <img 
                        src={item.url} 
                        alt="OSINT Intel" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://placehold.co/600x400/050506/34c759?text=MEDIA_UNAVAILABLE';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    )}
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '4px', 
                      right: '4px', 
                      background: 'rgba(0,0,0,0.6)', 
                      padding: '4px', 
                      borderRadius: '4px',
                      backdropFilter: 'blur(4px)'
                    }}>
                      {item.type === 'youtube' ? <Film size={10} color="#ff0000" /> : (item.type === 'video' ? <Film size={10} color="var(--accent-blue)" /> : <Camera size={10} color="var(--text-secondary)" />)}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox / Modal using Portal to body root */}
      {selectedMedia && createPortal(
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { audio.playClick(); setSelectedMedia(null); }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000000, 
              background: 'rgba(5, 5, 6, 0.98)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} 
              style={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <button 
                onClick={() => { audio.playClick(); setSelectedMedia(null); }}
                style={{
                  position: 'absolute',
                  top: '32px',
                  right: '32px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'white',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  cursor: 'pointer',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(8px)'
                }}
              >
                <X size={24} />
              </button>
              
              {selectedMedia.type === 'youtube' ? (
                <iframe 
                  width="90%" 
                  height="80%" 
                  src={`https://www.youtube.com/embed/${getYoutubeId(selectedMedia.url)}?autoplay=1`} 
                  title="YouTube video player" 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                  style={{ borderRadius: '8px', border: '1px solid var(--accent-red)' }}
                ></iframe>
              ) : selectedMedia.type === 'video' ? (
                <video 
                  src={selectedMedia.url} 
                  controls
                  autoPlay 
                  loop 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              ) : (
                <img 
                  src={selectedMedia.url} 
                  alt="Expanded OSINT Intel" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              )}
            </motion.div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};
