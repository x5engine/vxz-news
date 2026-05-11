import React, { useState, useEffect } from 'react';
import { Loader2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

interface LinkPreviewProps {
  url: string;
}

interface GraphData {
  title?: string;
  description?: string;
  image?: { url: string };
  publisher?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;
    
    const fetchGraphData = async () => {
      setLoading(true);
      try {
        // Microlink is a free, high-performance API for extracting OpenGraph head tags
        const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        const json = await res.json();
        
        if (json.status === 'success') {
          setData(json.data);
        }
      } catch (error) {
        console.error("Failed to extract OpenGraph data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [url]);

  if (loading) {
    return (
      <div className="glass" style={{ padding: '12px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '24px' }}>
        <Loader2 className="spin" size={14} color="var(--accent-blue)" /> 
        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>[ EXTRACTING_GRAPH_TAGS ]</span>
      </div>
    );
  }

  if (!data || (!data.title && !data.description)) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass" 
      style={{ 
        border: '1px solid var(--border-strong)', 
        borderRadius: '8px', 
        overflow: 'hidden', 
        marginBottom: '24px' 
      }}
    >
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-strong)', background: 'rgba(0,0,0,0.2)' }}>
        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Globe size={10} /> TARGET_ARTICLE_PREVIEW
        </span>
      </div>
      
      {data.image?.url && (
        <div style={{ width: '100%', height: '140px', overflow: 'hidden' }}>
          <img 
            src={data.image.url} 
            alt="Article Graph" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        </div>
      )}
      
      <div style={{ padding: '16px' }}>
        <h4 style={{ fontSize: '14px', marginBottom: '8px', lineHeight: 1.4, color: 'var(--text-primary)' }}>
          {data.title}
        </h4>
        {data.description && (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {data.description.length > 200 ? data.description.substring(0, 200) + '...' : data.description}
          </p>
        )}
        {data.publisher && (
          <div className="mono" style={{ marginTop: '12px', fontSize: '10px', color: 'var(--accent-blue)' }}>
            PUBLISHER: {data.publisher.toUpperCase()}
          </div>
        )}
      </div>
    </motion.div>
  );
};
