"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface Segment {
  id: string;
  text: string;
  emoji: string;
  amount?: number;
  color: string; // HSL string e.g., '0 100% 50%' for red
  textColor?: string; // HSL string for text, defaults to contrast
}

interface SpinWheelProps {
  segments: Segment[];
  onSpinComplete: (winningSegment: Segment) => void;
  targetSegmentIndex: number | null;
  isSpinning: boolean;
  spinDuration?: number; // in seconds
}

const SpinWheel: React.FC<SpinWheelProps> = ({
  segments,
  onSpinComplete,
  targetSegmentIndex,
  isSpinning,
  spinDuration = 5,
}) => {
  const [currentRotation, setCurrentRotation] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);

  const numSegments = segments.length;
  const anglePerSegment = 360 / numSegments;

  useEffect(() => {
    if (isSpinning && targetSegmentIndex !== null) {
      // Base rotations (e.g., 5 to 7 full spins)
      const minRotations = 5;
      const maxRotations = 7;
      const randomExtraRotations = Math.floor(Math.random() * (maxRotations - minRotations + 1)) + minRotations;
      const baseDegrees = randomExtraRotations * 360;

      // Calculate the angle to stop at the middle of the target segment
      // The pointer is at the top (0 degrees). We want the middle of the target segment to align with it.
      // Angle of the middle of segment k: (k + 0.5) * anglePerSegment
      // To align segment k at top, wheel must rotate by -( (k + 0.5) * anglePerSegment )
      const targetAngle = -((targetSegmentIndex + 0.5) * anglePerSegment);
      
      const finalRotation = baseDegrees + targetAngle;
      
      if (wheelRef.current) {
        wheelRef.current.style.setProperty('--final-rotation', `${finalRotation}deg`);
        wheelRef.current.style.setProperty('--spin-duration', `${spinDuration}s`);
      }
      setCurrentRotation(finalRotation); // For potential direct style manipulation if needed

      const timer = setTimeout(() => {
        onSpinComplete(segments[targetSegmentIndex]);
        // Reset rotation to a normalized value to avoid large numbers if needed,
        // though for CSS animation it might not matter for subsequent spins.
        // For this example, we'll let CSS handle the 'forwards' state.
        // To allow re-spinning, ensure the animation class is removed and re-added.
      }, spinDuration * 1000);

      return () => clearTimeout(timer);
    }
  }, [isSpinning, targetSegmentIndex, segments, anglePerSegment, onSpinComplete, spinDuration]);

  const getTextColor = (backgroundColor: string): string => {
    // Simple contrast checker based on luminance (approximation)
    // Expects HSL string like 'H S% L%'
    const parts = backgroundColor.split(' ');
    if (parts.length === 3) {
      const l = parseInt(parts[2].replace('%', ''), 10);
      return l > 50 ? '0 0% 10%' : '0 0% 100%'; // Dark text on light, Light text on dark
    }
    return '0 0% 0%'; // Default to black
  };

  return (
    <div className="relative flex justify-center items-center my-8 select-none w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[450px] md:h-[450px] mx-auto">
      {/* Pointer */}
      <div 
        className="absolute top-[-20px] left-1/2 -translate-x-1/2 z-10"
        style={{ filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.3))' }}
        aria-hidden="true"
      >
        <svg width="40" height="50" viewBox="0 0 40 50" fill="hsl(var(--primary))" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 0L0 25L20 50L40 25L20 0Z" />
        </svg>
      </div>

      <svg
        ref={wheelRef}
        viewBox="0 0 200 200"
        className={cn(
          "w-full h-full rounded-full shadow-2xl transition-transform duration-[var(--spin-duration)] ease-[cubic-bezier(0.25,0.1,0.25,1)]",
          { 'animate-wheel-spin': isSpinning }
        )}
        style={{ transform: `rotate(${isSpinning ? 0 : currentRotation}deg)` }} // Initial rotation set here, animation overrides
        aria-label="Spinning prize wheel"
        role="img"
      >
        <defs>
          {segments.map((segment, i) => (
            <path
              key={`segment-path-${i}`}
              id={`segment-path-def-${i}`}
              d={
                `M100 100 L ${100 + 100 * Math.cos(Math.PI / 180 * (i * anglePerSegment - 90 - anglePerSegment / 2))} ${100 + 100 * Math.sin(Math.PI / 180 * (i * anglePerSegment - 90 - anglePerSegment / 2))} ` +
                `A 100 100 0 0 1 ${100 + 100 * Math.cos(Math.PI / 180 * ((i + 1) * anglePerSegment - 90 - anglePerSegment / 2))} ${100 + 100 * Math.sin(Math.PI / 180 * ((i + 1) * anglePerSegment - 90 - anglePerSegment / 2))} Z`
              }
            />
          ))}
        </defs>
        
        <g>
          {segments.map((segment, i) => {
            const startAngle = i * anglePerSegment;
            const endAngle = (i + 1) * anglePerSegment;
            const midAngleRad = Math.PI / 180 * (startAngle + anglePerSegment / 2 - 90);

            // For arc path: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
            const x1 = 100 + 98 * Math.cos(Math.PI / 180 * (startAngle - 90));
            const y1 = 100 + 98 * Math.sin(Math.PI / 180 * (startAngle - 90));
            const x2 = 100 + 98 * Math.cos(Math.PI / 180 * (endAngle - 90));
            const y2 = 100 + 98 * Math.sin(Math.PI / 180 * (endAngle - 90));
            
            const pathData = `M100,100 L${x1},${y1} A98,98 0 0,1 ${x2},${y2} z`;
            const textColor = segment.textColor || getTextColor(segment.color);

            return (
              <g key={segment.id} role="listitem" aria-label={`Prize: ${segment.text} ${segment.amount || ''}`}>
                <path d={pathData} fill={`hsl(${segment.color})`} stroke="hsl(var(--background))" strokeWidth="1"/>
                <text
                  x={100 + 60 * Math.cos(midAngleRad)}
                  y={100 + 60 * Math.sin(midAngleRad)}
                  dy=".3em"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="bold"
                  fill={`hsl(${textColor})`}
                  className="font-body"
                >
                  <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="-0.5em">{segment.emoji}</tspan>
                  <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="1.2em">{segment.text}</tspan>
                  {segment.amount && <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="1.2em">₹{segment.amount}</tspan>}
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

// Helper to remove animation class for re-triggering (if needed outside of key-based re-render)
// export const resetWheelAnimation = (wheelElement: SVGSVGElement | null) => {
//   if (wheelElement) {
//     wheelElement.classList.remove('animate-wheel-spin');
//     // Trigger reflow to ensure animation restarts
//     void wheelElement.offsetWidth;
//   }
// };
