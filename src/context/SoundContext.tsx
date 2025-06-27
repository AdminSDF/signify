
"use client";

import React, { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from 'react';

interface SoundContextType {
  isMusicPlaying: boolean;
  toggleMusic: () => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio element on the client side
    audioRef.current = new Audio('/sounds/background.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3; // Set a reasonable volume
  }, []);

  const toggleMusic = useCallback(() => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        // play() returns a promise which can reject if user hasn't interacted with the page yet.
        audioRef.current.play().catch(error => console.warn("Background music autoplay was prevented:", error.message));
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  }, [isMusicPlaying]);

  const value = { isMusicPlaying, toggleMusic };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
};

export const useSoundControl = (): SoundContextType => {
  const context = useContext(SoundContext);
  if (context === undefined) {
    throw new Error('useSoundControl must be used within a SoundProvider');
  }
  return context;
};
