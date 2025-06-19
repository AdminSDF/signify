"use client";

import React, { useEffect, useState } from 'react';

const ConfettiPiece: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <div
    className="absolute w-2 h-4 opacity-70 animate-fall"
    style={style}
    aria-hidden="true"
  ></div>
);

export const ConfettiRain: React.FC = () => {
  const [pieces, setPieces] = useState<Array<{ id: number; style: React.CSSProperties }>>([]);

  useEffect(() => {
    const newPieces = Array.from({ length: 100 }).map((_, i) => {
      const randomX = Math.random() * 100; // vw
      const randomDelay = Math.random() * 2; // s
      const randomDuration = 2 + Math.random() * 3; // s
      const colors = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const randomRotationStart = Math.random() * 360;
      const randomRotationEnd = randomRotationStart + (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360);


      return {
        id: i,
        style: {
          left: `${randomX}vw`,
          animationDelay: `${randomDelay}s`,
          animationDuration: `${randomDuration}s`,
          backgroundColor: randomColor,
          transform: `translateY(-20px) rotate(${randomRotationStart}deg)`,
          '--rotation-end': `${randomRotationEnd}deg`
        } as React.CSSProperties,
      };
    });
    setPieces(newPieces);

    // Add keyframes dynamically for Tailwind JIT compatibility
    const styleSheet = document.styleSheets[0];
    try {
      styleSheet.insertRule(`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(var(--rotation-end));
            opacity: 0;
          }
        }
      `, styleSheet.cssRules.length);
    } catch (e) {
      console.warn("Could not insert keyframes for confetti: ", e);
    }


  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {pieces.map(piece => (
        <ConfettiPiece key={piece.id} style={piece.style} />
      ))}
    </div>
  );
};

// Make sure to add/update 'animate-fall' in tailwind.config.js if you have custom animations there.
// For this case, we inject it dynamically.
// Tailwind config:
// keyframes: { fall: { to: { transform: 'translateY(100vh) rotate(var(--rotation-end))', opacity: '0' } } },
// animation: { fall: 'fall linear forwards' }
// But dynamic injection avoids needing to modify tailwind.config.ts for this specific component.
