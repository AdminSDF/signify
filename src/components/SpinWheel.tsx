
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface Segment {
  id: string;
  text: string;
  emoji: string;
  amount?: number;
  color: string; // HSL string e.g., '0 100% 50%' for red
  textColor?: string; // HSL string for text, defaults to contrast
  probability?: number;
}

interface SpinWheelProps {
  segments: Segment[];
  onSpinComplete: (winningSegment: Segment) => void;
  targetSegmentIndex: number | null;
  isSpinning: boolean;
  spinDuration?: number; // in seconds
  onClick?: () => void; 
}

// Helper to modify HSL lightness
function modifyHslColor(hslColor: string, lightnessOffset: number): string {
  const parts = hslColor.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hslColor; // Fallback
  const h = parseInt(parts[1]);
  const s = parseInt(parts[2]);
  let l = parseInt(parts[3]);
  l = Math.min(100, Math.max(0, l + lightnessOffset));
  return `${h} ${s}% ${l}%`;
}

const SpinWheel: React.FC<SpinWheelProps> = ({
  segments,
  onSpinComplete,
  targetSegmentIndex,
  isSpinning,
  spinDuration = 5,
  onClick,
}) => {
  // currentRotation stores the logical resting angle of the wheel.
  // 0 degrees means the start of the first segment is at the top pointer.
  const [currentRotation, setCurrentRotation] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);

  const numSegments = segments.length;
  const anglePerSegment = 360 / numSegments;

  // Effect to update the --wheel-actual-rotation CSS variable for the resting state.
  useEffect(() => {
    if (wheelRef.current) {
      wheelRef.current.style.setProperty('--wheel-actual-rotation', `${currentRotation}deg`);
    }
  }, [currentRotation]);

  // Effect to handle the spinning animation
  useEffect(() => {
    if (isSpinning && targetSegmentIndex !== null && wheelRef.current) {
      // Get the current visual rotation from the CSS variable (which currentRotation state sets)
      const currentVisualAngle = parseFloat(
        wheelRef.current.style.getPropertyValue('--wheel-actual-rotation').replace('deg', '') || '0'
      );

      const minRotations = 5;
      const maxRotations = 7;
      const randomExtraRotations = Math.floor(Math.random() * (maxRotations - minRotations + 1)) + minRotations;
      const baseDegrees = randomExtraRotations * 360;
      
      // Calculate the desired final resting angle for the pointer to be in the middle of the target segment.
      // A positive angle means clockwise rotation of the segment to the pointer.
      // A negative angle means counter-clockwise rotation of the segment to the pointer.
      // Since the pointer is fixed at the top (0 deg), the wheel rotates.
      // If target segment is 0, its middle is at anglePerSegment / 2. To bring this to 0, wheel rotates by -(anglePerSegment / 2).
      const finalRestingAngleForSegment = -((targetSegmentIndex * anglePerSegment) + (anglePerSegment / 2));
      const randomOffset = (Math.random() - 0.5) * (anglePerSegment * 0.6); // Small random offset within the segment
      const desiredFinalAbsoluteRotation = finalRestingAngleForSegment + randomOffset;

      // The animation will spin from its current visual angle to a new angle
      // that incorporates many full spins and lands on the desired segment.
      // Total rotation = current visual + full spins + (adjustment to new target from current orientation)
      // To ensure it always spins forward for the "full spins" part:
      const animationEndAngle = currentVisualAngle + baseDegrees + (desiredFinalAbsoluteRotation - (currentVisualAngle % 360));
      // The (desiredFinalAbsoluteRotation - (currentVisualAngle % 360)) part calculates the shortest rotation
      // from the current normalized orientation to the target normalized orientation.
      // Adding baseDegrees ensures it spins forward multiple times.

      wheelRef.current.style.setProperty('--animation-start-angle', `${currentVisualAngle}deg`);
      wheelRef.current.style.setProperty('--animation-end-angle', `${animationEndAngle}deg`);
      wheelRef.current.style.setProperty('--spin-duration', `${spinDuration}s`);
      
      wheelRef.current.classList.add('animate-wheel-spin');

      const timer = setTimeout(() => {
        if (wheelRef.current) { // Check if ref is still valid
            wheelRef.current.classList.remove('animate-wheel-spin');
            // Clean up CSS variables from element style after animation
            wheelRef.current.style.removeProperty('--animation-start-angle');
            wheelRef.current.style.removeProperty('--animation-end-angle');
            wheelRef.current.style.removeProperty('--spin-duration');
        }
        
        // Update currentRotation state to the new normalized resting angle
        let newRestingAngle = desiredFinalAbsoluteRotation % 360;
        if (newRestingAngle <= -180) newRestingAngle += 360; // Normalize to prefer -179 to 180 range if needed, or 0-359
        if (newRestingAngle > 180) newRestingAngle -=360; // Ensure consistent range, e.g., closer to 0.

        // Or simpler normalization to 0-359 range:
        newRestingAngle = animationEndAngle % 360;
        if (newRestingAngle < 0) {
          newRestingAngle += 360;
        }
        
        setCurrentRotation(newRestingAngle); // This will trigger the effect to update --wheel-actual-rotation
        onSpinComplete(segments[targetSegmentIndex]);
      }, spinDuration * 1000);

      return () => clearTimeout(timer);
    } else if (!isSpinning && wheelRef.current) {
      // Ensure animation class is removed if isSpinning becomes false (e.g. component unmounts during spin)
       if (wheelRef.current.classList.contains('animate-wheel-spin')) {
           wheelRef.current.classList.remove('animate-wheel-spin');
       }
    }
  }, [isSpinning, targetSegmentIndex, segments, anglePerSegment, onSpinComplete, spinDuration, currentRotation]); // Added currentRotation here to re-evaluate if it changes externally


  const gradientDefs = useMemo(() => {
    const uniqueColors = new Map<string, string>();
    segments.forEach((segment, index) => {
      const gradId = `grad-${segments.findIndex(s => s.color === segment.color)}`;
      if (!uniqueColors.has(segment.color)) {
        uniqueColors.set(segment.color, gradId);
      }
    });

    return Array.from(uniqueColors.entries()).map(([colorStr, id]) => {
      const lighterColor = modifyHslColor(colorStr, 15); 
      const darkerColor = modifyHslColor(colorStr, -10); 
      return (
        <radialGradient key={id} id={id} cx="50%" cy="50%" r="65%" fx="50%" fy="50%">
          <stop offset="0%" style={{ stopColor: `hsl(${lighterColor})`, stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: `hsl(${darkerColor})`, stopOpacity: 1 }} />
        </radialGradient>
      );
    });
  }, [segments]);
  
  const colorToGradientIdMap = useMemo(() => {
    const map = new Map<string, string>();
    segments.forEach((segment) => {
       const gradId = `grad-${segments.findIndex(s => s.color === segment.color)}`; 
      if (!map.has(segment.color)) {
        map.set(segment.color, gradId);
      }
    });
    return map;
  }, [segments]);


  const getTextColorFallback = (backgroundColor: string): string => {
    const parts = backgroundColor.split(' ');
    if (parts.length === 3) {
      const l = parseInt(parts[2].replace('%', ''), 10);
      return l > 55 ? '0 0% 10%' : '0 0% 95%'; 
    }
    return '0 0% 0%';
  };

  const handleWheelClick = () => {
    if (onClick && !isSpinning) {
      onClick();
    }
  };

  return (
    <div
      className={cn(
        "relative flex justify-center items-center my-8 select-none w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[450px] md:h-[450px] mx-auto",
        "transition-transform duration-150",
        onClick && !isSpinning && "cursor-pointer hover:scale-105 active:scale-95 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-full"
      )}
      onClick={handleWheelClick}
      style={{ perspective: '1000px' }}
      role={onClick && !isSpinning ? "button" : undefined}
      tabIndex={onClick && !isSpinning ? 0 : -1}
      aria-label="Spinning prize wheel"
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick && !isSpinning) { handleWheelClick(); e.preventDefault();}}}
    >
      <div
        className="absolute top-[-22px] left-1/2 -translate-x-1/2 z-10" 
        aria-hidden="true"
      >
        <svg width="36" height="50" viewBox="0 0 36 50" fill="hsl(var(--primary))" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'url(#dropShadowPointer)'}}>
          <path d="M18 0L0 22L18 50L36 22L18 0Z" />
           <circle cx="18" cy="12" r="5" fill="hsl(var(--background))" />
        </svg>
      </div>

      <svg
        ref={wheelRef}
        viewBox="0 0 200 200"
        className={cn(
          "w-full h-full rounded-full shadow-2xl svg-wheel-graphics"
          // The 'animate-wheel-spin' class is added dynamically in the useEffect hook
        )}
        style={{
          filter: 'url(#dropShadowWheel)'
          // CSS variables for animation are set dynamically in the useEffect hook
        } as React.CSSProperties}
      >
        <defs>
          <filter id="dropShadowPointer" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="rgba(0,0,0,0.3)" />
          </filter>
          <filter id="dropShadowWheel" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="rgba(0,0,0,0.2)" />
          </filter>
          <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0.5" dy="0.5" stdDeviation="0.5" floodColor="rgba(0,0,0,0.7)" />
          </filter>
          {gradientDefs}
        </defs>
        
        <g>
          {segments.map((segment, i) => {
            const startAngle = i * anglePerSegment;
            const endAngle = (i + 1) * anglePerSegment;
            const midAngleRad = Math.PI / 180 * (startAngle + anglePerSegment / 2 - 90);
            const x1 = 100 + 98 * Math.cos(Math.PI / 180 * (startAngle - 90));
            const y1 = 100 + 98 * Math.sin(Math.PI / 180 * (startAngle - 90));
            const x2 = 100 + 98 * Math.cos(Math.PI / 180 * (endAngle - 90));
            const y2 = 100 + 98 * Math.sin(Math.PI / 180 * (endAngle - 90));
            const pathData = `M100,100 L${x1},${y1} A98,98 0 0,1 ${x2},${y2} z`;
            
            const effectiveTextColor = segment.textColor || getTextColorFallback(segment.color);
            const gradientId = colorToGradientIdMap.get(segment.color);

            return (
              <g key={segment.id} role="listitem" aria-label={`Prize: ${segment.text} ${segment.amount !== undefined ? `(value ${segment.amount})` : ''}`}>
                <path 
                  d={pathData} 
                  fill={gradientId ? `url(#${gradientId})` : `hsl(${segment.color})`} 
                  stroke="hsl(var(--card))" 
                  strokeWidth="1.5"
                />
                <text
                  x={100 + 60 * Math.cos(midAngleRad)}
                  y={100 + 60 * Math.sin(midAngleRad)}
                  dy=".3em"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="bold"
                  fill={`hsl(${effectiveTextColor})`}
                  className="font-body pointer-events-none"
                  filter="url(#textShadow)"
                >
                  <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="-0.6em">{segment.emoji}</tspan>
                  <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="1.2em">{segment.text}</tspan>
                  {segment.amount !== undefined && segment.amount > 0 && (
                    <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="1.2em">₹{segment.amount}</tspan>
                  )}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default SpinWheel;
