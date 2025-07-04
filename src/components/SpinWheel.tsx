
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { SegmentConfig } from '@/lib/appConfig';

export interface SpinWheelProps {
  segments: SegmentConfig[];
  onSpinComplete: (winningSegment: SegmentConfig) => void;
  targetSegmentIndex: number | null;
  isSpinning: boolean;
  spinDuration?: number;
  onClick?: () => void;
  logoUrl: string;
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
  spinDuration = 8,
  onClick,
  logoUrl,
}) => {
  const [accumulatedRotation, setAccumulatedRotation] = useState(0);
  const wheelRef = useRef<SVGSVGElement>(null);
  const isAnimatingRef = useRef(false);

  const numSegments = segments.length;
  const anglePerSegment = numSegments > 0 ? 360 / numSegments : 0;

  useEffect(() => {
    if (isSpinning && targetSegmentIndex !== null && wheelRef.current && !isAnimatingRef.current) {
      isAnimatingRef.current = true;

      const wheelElement = wheelRef.current;

      const randomOffsetWithinSegment = (Math.random() - 0.5) * anglePerSegment * 0.6;
      const targetMiddleAngle = (targetSegmentIndex * anglePerSegment) + (anglePerSegment / 2);
      const finalOrientationAngle = -(targetMiddleAngle + randomOffsetWithinSegment);
      
      const fullSpinsDegrees = 360 * 7;

      const currentNormalizedAngle = accumulatedRotation % 360;
      let rotationToNewOrientation = (finalOrientationAngle - currentNormalizedAngle);
      
      while (rotationToNewOrientation <= 0 && numSegments > 0) {
        rotationToNewOrientation += 360;
      }
      if (numSegments > 0) {
        rotationToNewOrientation = (rotationToNewOrientation % 360);
      } else {
        rotationToNewOrientation = 0;
      }

      const totalAdditionalRotation = fullSpinsDegrees + rotationToNewOrientation;
      const newFinalAccumulatedRotation = accumulatedRotation + totalAdditionalRotation;

      wheelElement.style.transition = `transform ${spinDuration}s cubic-bezier(0.22, 1, 0.36, 1)`;
      wheelElement.style.transform = `rotate(${newFinalAccumulatedRotation}deg)`;

      const timer = setTimeout(() => {
        setAccumulatedRotation(newFinalAccumulatedRotation);

        if (wheelRef.current) {
            wheelRef.current.style.transition = 'none'; 
        }
        onSpinComplete(segments[targetSegmentIndex]);
        isAnimatingRef.current = false;
      }, spinDuration * 1000);

      return () => {
        clearTimeout(timer);
        if (wheelRef.current) {
          wheelRef.current.style.transition = 'none';
        }
        isAnimatingRef.current = false;
      };
    }
  }, [isSpinning, targetSegmentIndex, segments, anglePerSegment, onSpinComplete, spinDuration, numSegments, accumulatedRotation]);


  useEffect(() => {
    if (wheelRef.current && !isSpinning) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = `rotate(${accumulatedRotation}deg)`;
    }
  }, [accumulatedRotation, isSpinning]); 


  const gradientDefs = useMemo(() => {
    const uniqueColors = new Map<string, string>();
    segments.forEach((segment) => {
      const gradId = `grad-${segment.color.replace(/\s/g, '-')}`;
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
       const gradId = `grad-${segment.color.replace(/\s/g, '-')}`;
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
    if (onClick && !isSpinning && !isAnimatingRef.current) {
      onClick();
    }
  };
  
  return (
    <div
      className={cn(
        "relative flex justify-center items-center my-8 select-none w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] md:w-[480px] md:h-[480px] mx-auto",
        onClick && !isSpinning && "cursor-pointer"
      )}
      onClick={handleWheelClick}
      role={onClick && !isSpinning ? "button" : undefined}
      tabIndex={onClick && !isSpinning ? 0 : -1}
      aria-label="Spinning prize wheel"
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClick && !isSpinning && !isAnimatingRef.current) { handleWheelClick(); e.preventDefault();}}}
    >
      <div
        className="absolute top-[-22px] left-1/2 -translate-x-1/2 z-10"
        aria-hidden="true"
      >
        <svg width="36" height="50" viewBox="0 0 36 50" fill="hsl(var(--primary))" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 0L0 22L18 50L36 22L18 0Z" />
           <circle cx="18" cy="12" r="5" fill="hsl(var(--background))" />
        </svg>
      </div>

      <svg
        ref={wheelRef}
        id="wheel" 
        viewBox="0 0 200 200"
        className="w-full h-full rounded-full"
        style={{
          transform: `rotate(${accumulatedRotation}deg)`
        } as React.CSSProperties}
      >
        <defs>
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
              <g key={segment.id} role="listitem" aria-label={`Prize: ${segment.text}`}>
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
                >
                  <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="-0.6em">{segment.emoji}</tspan>
                  <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="1.2em">{segment.text}</tspan>
                  {segment.amount > 0 && <tspan x={100 + 60 * Math.cos(midAngleRad)} dy="1.2em">{`₹${segment.amount}`}</tspan>}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-16 w-16 rounded-full border-[6px] border-primary bg-background sm:h-24 sm:w-24 overflow-hidden">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Spinify Logo"
            width={96}
            height={96}
            className="h-full w-full object-cover"
            priority
          />
        )}
      </div>
    </div>
  );
};

export default SpinWheel;
