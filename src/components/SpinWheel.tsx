
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
  spinDuration?: number; // user's script implies 20s, but we'll keep prop for flexibility if needed elsewhere, defaulting to 20
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
  spinDuration = 20, // Default to 20 seconds as per user's script example
  onClick,
}) => {
  const [accumulatedRotation, setAccumulatedRotation] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);

  const numSegments = segments.length;
  const anglePerSegment = 360 / numSegments;

  useEffect(() => {
    if (isSpinning && targetSegmentIndex !== null && wheelRef.current) {
      const wheelElement = wheelRef.current;

      // Calculate the desired final resting angle for the pointer to be in the middle of the target segment.
      const randomOffsetWithinSegment = (Math.random() - 0.5) * anglePerSegment * 0.6; // Small random offset
      const targetMiddleAngle = (targetSegmentIndex * anglePerSegment) + (anglePerSegment / 2);
      // The wheel needs to rotate such that this targetMiddleAngle is at the top (0 deg pointer).
      // So, the wheel's final orientation relative to its starting point (0 deg) should be -targetMiddleAngle.
      const finalOrientationAngle = -(targetMiddleAngle + randomOffsetWithinSegment);

      const fullSpinsDegrees = 7200; // 20 full rotations (20 * 360)

      // Calculate rotation needed from current orientation to new target orientation
      const currentNormalizedAngle = accumulatedRotation % 360;
      // Amount to rotate to get from currentNormalizedAngle to finalOrientationAngle, spinning forward
      let rotationToNewOrientation = (finalOrientationAngle - currentNormalizedAngle);
      // Ensure it's a positive rotation by adding multiples of 360 if needed to go the long way for the "spin"
      // This ensures the additional rotation for the final segment alignment is always forward.
      while (rotationToNewOrientation <= 0 && numSegments > 0) { // Check numSegments to prevent infinite loop if anglePerSegment is 0
        rotationToNewOrientation += 360;
      }
       if (numSegments > 0) { // Only add if there are segments
         rotationToNewOrientation = (rotationToNewOrientation % 360); // Ensure it's within 0-359 for the final adjustment
       } else {
         rotationToNewOrientation = 0;
       }


      const totalAdditionalRotation = fullSpinsDegrees + rotationToNewOrientation;
      const newFinalAccumulatedRotation = accumulatedRotation + totalAdditionalRotation;

      wheelElement.style.transition = `transform ${spinDuration}s cubic-bezier(0.17, 0.67, 0.83, 0.67)`;
      wheelElement.style.transform = `rotate(${newFinalAccumulatedRotation}deg)`;

      setAccumulatedRotation(newFinalAccumulatedRotation);

      const timer = setTimeout(() => {
        if (wheelRef.current) { // Check if ref is still valid
            wheelRef.current.style.transition = 'none'; // Remove transition after animation
        }
        onSpinComplete(segments[targetSegmentIndex]);
      }, spinDuration * 1000);

      return () => clearTimeout(timer);
    } else if (!isSpinning && wheelRef.current) {
      // Ensure transition is none when not spinning
      if (wheelRef.current.style.transition !== 'none') {
        wheelRef.current.style.transition = 'none';
      }
      // Ensure the wheel is at its correct resting rotation if it was interrupted
      wheelRef.current.style.transform = `rotate(${accumulatedRotation}deg)`;
    }
  }, [isSpinning, targetSegmentIndex, segments, anglePerSegment, onSpinComplete, spinDuration, accumulatedRotation, numSegments]);


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
  
  // Effect to set initial rotation and update if accumulatedRotation changes for resting state
  useEffect(() => {
    if (wheelRef.current && !isSpinning) {
      wheelRef.current.style.transition = 'none'; // No transition for setting resting state
      wheelRef.current.style.transform = `rotate(${accumulatedRotation}deg)`;
    }
  }, [accumulatedRotation, isSpinning]);


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
        id="wheel" // Added id for potential direct manipulation if user wants, though ref is primary
        viewBox="0 0 200 200"
        className={cn(
          "w-full h-full rounded-full shadow-2xl"
          // Removed 'svg-wheel-graphics' as its style is now directly managed
        )}
        style={{
          filter: 'url(#dropShadowWheel)',
          transform: `rotate(${accumulatedRotation}deg)` // Initial and subsequent resting rotation
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

