
"use client";

import { useCallback, useMemo } from 'react';

type SoundType = 'spin' | 'win' | 'tryAgain' | 'error' | 'click';

export function useSound() {
  const sounds = useMemo(() => {
    // Check if window is defined (ensures this runs only on the client-side)
    if (typeof window === 'undefined') {
      return null;
    }
    return {
      spin: new Audio('/sounds/spin.mp3'),
      win: new Audio('/sounds/win.mp3'),
      tryAgain: new Audio('/sounds/tryAgain.mp3'),
      error: new Audio('/sounds/error.mp3'),
      click: new Audio('/sounds/click.mp3'),
    };
  }, []);

  const playSound = useCallback((sound: SoundType) => {
    if (!sounds) {
      console.log(`Sound system not ready. Simulating sound: ${sound}`);
      return;
    }

    const audio = sounds[sound];
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(err => console.warn(`Could not play sound "${sound}": ${err.message}. Make sure the file exists at /public/sounds/${sound}.mp3`));
    }
    
    // Haptic feedback for mobile devices
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      if (sound === 'win') {
        window.navigator.vibrate([100, 30, 100]);
      } else if (sound === 'spin') {
        window.navigator.vibrate(50);
      } else if (sound === 'click' || sound === 'error') {
         window.navigator.vibrate(20);
      }
    }
  }, [sounds]);

  return { playSound };
}
