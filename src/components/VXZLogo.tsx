import React from 'react';

const VXZLogo = ({ size = 32, glow = true }) => {
  const color = "var(--accent-blue)";
  const id = `vxz-glow-${size}`;
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: glow ? `drop-shadow(0 0 8px ${color})` : 'none' }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      {/* Tactical Hexagon Frame */}
      <path 
        d="M50 5 L89 27.5 L89 72.5 L50 95 L11 72.5 L11 27.5 Z" 
        stroke={color} 
        strokeWidth="2" 
        strokeOpacity="0.3"
      />
      {/* VXZ Monogram Design */}
      <path 
        d="M25 35 L40 65 L55 35 M55 35 L75 65 M75 35 L55 65" 
        stroke={`url(#${id})`} 
        strokeWidth="8" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Target Reticle */}
      <circle cx="50" cy="50" r="40" stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />
    </svg>
  );
};

export default VXZLogo;
