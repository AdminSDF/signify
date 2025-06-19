"use client";

import { useCallback } from 'react';

type SoundType = 'spin' | 'win' | 'tryAgain' | 'error';

// In a real app, you'd use a library or the HTMLAudioElement API
// For now, this is a placeholder.
// const sounds = {
//   spin: new Audio('/sounds/spin.mp3'), // Ensure these paths are correct in /public
//   win: new Audio('/sounds/win.mp3'),
//   tryAgain: new Audio('/sounds/try-again.mp3'),
//   error: new Audio('/sounds/error.mp3'),
// };

export function useSound() {
  const playSound = useCallback((sound: SoundType) => {
    // sounds[sound].currentTime = 0;
    // sounds[sound].play().catch(err => console.warn(`Could not play sound ${sound}: ${err.message}`));
    console.log(`Simulating sound: ${sound}`);
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      if (sound === 'win') {
        window.navigator.vibrate([100, 30, 100]);
      } else if (sound === 'spin') {
        window.navigator.vibrate(50);
      }
    }
  }, []);

  return { playSound };
}
