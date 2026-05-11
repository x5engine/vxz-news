import React, { useEffect, useRef, useState } from 'react';
import Globe from 'react-globe.gl';

interface GeoPoint {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
  title?: string;
}

interface GlobeViewProps {
  data: GeoPoint[];
  onPointClick?: (point: GeoPoint) => void;
  activeItemId?: string | null;
}

export const GlobeView: React.FC<GlobeViewProps> = ({ data, onPointClick, activeItemId }) => {
  const globeRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Auto-resize globe based on container
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || entries.length === 0) return;
      setDimensions({
        width: entries[0].contentRect.width,
        height: entries[0].contentRect.height
      });
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Configure initial rotation and camera
  useEffect(() => {
    if (globeRef.current) {
      const controls = globeRef.current.controls();
      controls.autoRotate = !activeItemId; // Stop auto-rotate if an item is selected
      controls.autoRotateSpeed = 0.5;
      controls.enableDamping = true;
    }
  }, [dimensions.width, activeItemId]); 

  // Fly to active point
  useEffect(() => {
    if (globeRef.current && activeItemId) {
      const point = data.find(p => p.label === activeItemId);
      if (point) {
        // Fly camera to the specific coordinates
        globeRef.current.pointOfView({ lat: point.lat, lng: point.lng, altitude: 1.5 }, 1200);
      }
    } else if (globeRef.current && !activeItemId) {
      // Zoom out slightly when deselected
      const currentPos = globeRef.current.pointOfView();
      globeRef.current.pointOfView({ ...currentPos, altitude: 2.5 }, 1200);
    }
  }, [activeItemId, data]);

  // Create HTML marker for the map
  const createHtmlElement = (d: object) => {
    const point = d as GeoPoint;
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="
        color: white; 
        background: rgba(10, 10, 12, 0.9); 
        border: 1px solid ${point.color};
        padding: 4px 8px; 
        border-radius: 4px; 
        font-family: 'JetBrains Mono', monospace; 
        font-size: 10px;
        cursor: pointer;
        white-space: nowrap;
        transform: translate(-50%, -120%);
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        pointer-events: auto;
        transition: max-width 0.3s ease;
        max-width: 150px;
        overflow: hidden;
        text-overflow: ellipsis;
      " onmouseenter="this.style.maxWidth='400px'; this.style.zIndex='1000';" 
        onmouseleave="this.style.maxWidth='150px'; this.style.zIndex='1';">
        <span style="color: ${point.color}; font-weight: bold; margin-right: 4px;">•</span>
        ${point.title || point.label}
      </div>
    `;
    
    // Critical fix: react-globe orbit controls consume standard clicks. We must use pointerdown and stop propagation.
    el.style.pointerEvents = 'auto';
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); // Prevent globe from rotating on drag
      e.preventDefault();
      if (onPointClick) {
        onPointClick(point);
      }
    });

    return el;
  };

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {/* Target Crosshair Overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '40px',
        height: '40px',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 10,
        opacity: activeItemId ? 1 : 0.2,
        transition: 'opacity 0.5s ease'
      }}>
        <div style={{ position: 'absolute', top: '-10px', left: '19px', width: '2px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ position: 'absolute', bottom: '-10px', left: '19px', width: '2px', height: '10px', background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ position: 'absolute', left: '-10px', top: '19px', height: '2px', width: '10px', background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ position: 'absolute', right: '-10px', top: '19px', height: '2px', width: '10px', background: 'rgba(255,255,255,0.3)' }} />
      </div>

      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          
          // Data Layers
          pointsData={data}
          pointLat="lat"
          pointLng="lng"
          pointColor="color"
          pointAltitude="size"
          pointRadius={0.4}
          pointsMerge={false}
          
          // HTML Labels layer
          htmlElementsData={data}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={createHtmlElement}
          
          // Rings for active events
          ringsData={data}
          ringLat="lat"
          ringLng="lng"
          ringColor="color"
          ringMaxRadius={4}
          ringPropagationSpeed={2}
          ringRepeatPeriod={1000}
          
          onPointClick={(point) => onPointClick && onPointClick(point as GeoPoint)}
        />
      )}
      
      {/* Zoom Controls Overlay */}
      <div style={{ position: 'absolute', bottom: '24px', right: '24px', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          className="glass"
          onClick={(e) => { e.stopPropagation(); if (globeRef.current) { const alt = globeRef.current.pointOfView().altitude; globeRef.current.pointOfView({ altitude: Math.max(0.1, alt - 0.5) }, 500); } }}
          style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid var(--border-strong)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
        >
          +
        </button>
        <button 
          className="glass"
          onClick={(e) => { e.stopPropagation(); if (globeRef.current) { const alt = globeRef.current.pointOfView().altitude; globeRef.current.pointOfView({ altitude: Math.min(4, alt + 0.5) }, 500); } }}
          style={{ width: '32px', height: '32px', borderRadius: '4px', border: '1px solid var(--border-strong)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}
        >
          -
        </button>
      </div>
    </div>
  );
};
