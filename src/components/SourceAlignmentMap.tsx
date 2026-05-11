import React from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

interface Source {
  source: string;
  type: string;
  align: string;
}

interface SourceAlignmentMapProps {
  sources: Source[];
}

export const SourceAlignmentMap: React.FC<SourceAlignmentMapProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ marginBottom: '24px' }}>
      <h4 className="mono" style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shield size={12} /> SOURCE_ALIGNMENT_MAP
      </h4>

      <div className="glass" style={{ padding: '16px', borderRadius: '8px', position: 'relative', minHeight: '180px', overflow: 'hidden' }}>
        {/* Connection Lines Background */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.2 }}>
           <line x1="50%" y1="20%" x2="25%" y2="70%" stroke="var(--accent-blue)" strokeWidth="1" strokeDasharray="4 4" />
           <line x1="50%" y1="20%" x2="75%" y2="70%" stroke="var(--accent-red)" strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          
          {/* Central Intel Hub */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="mono"
            style={{ 
              width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--accent-blue)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: 'var(--accent-blue)', boxShadow: '0 0 15px rgba(0, 122, 255, 0.3)'
            }}
          >
            INTEL
          </motion.div>

          <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', gap: '10px' }}>
            
            {/* Independent Cluster */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div className="mono" style={{ fontSize: '8px', color: 'var(--accent-green)', opacity: 0.6, marginBottom: '4px' }}>INDEPENDENT</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {sources.filter(s => s.align === 'Independent').map((s, i) => (
                  <motion.div 
                    key={`ind-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    title={s.source}
                    style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(52, 199, 89, 0.1)', border: '1px solid var(--accent-green)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ShieldCheck size={14} color="var(--accent-green)" />
                  </motion.div>
                ))}
                {sources.filter(s => s.align === 'Independent').length === 0 && (
                   <div className="mono" style={{ fontSize: '8px', color: 'var(--text-tertiary)' }}>[ NONE ]</div>
                )}
              </div>
            </div>

            {/* State-Aligned Cluster */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div className="mono" style={{ fontSize: '8px', color: 'var(--accent-red)', opacity: 0.6, marginBottom: '4px' }}>STATE_ALIGNED</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                {sources.filter(s => s.align !== 'Independent').map((s, i) => (
                  <motion.div 
                    key={`align-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    title={s.source}
                    style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255, 59, 48, 0.1)', border: '1px solid var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ShieldAlert size={14} color="var(--accent-red)" />
                  </motion.div>
                ))}
                {sources.filter(s => s.align !== 'Independent').length === 0 && (
                   <div className="mono" style={{ fontSize: '8px', color: 'var(--text-tertiary)' }}>[ NONE ]</div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Narrative Consensus Metric */}
        <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span className="mono" style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>NARRATIVE_CONSENSUS</span>
              <span className="mono" style={{ fontSize: '9px', color: 'var(--accent-blue)' }}>{Math.round((sources.length / (sources.length + 2)) * 100)}%</span>
           </div>
           <div style={{ height: '2px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '1px', overflow: 'hidden' }}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(sources.length / (sources.length + 2)) * 100}%` }}
                style={{ height: '100%', background: 'var(--accent-blue)', boxShadow: '0 0 8px var(--accent-blue)' }}
              />
           </div>
        </div>
      </div>
    </div>
  );
};
