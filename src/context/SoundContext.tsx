
"use client";

import React, { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from 'react';

type SoundType = 'spin' | 'win' | 'tryAgain' | 'error' | 'click' | 'levelup';

// A record to hold all our Audio objects
type SoundMap = Record<SoundType, HTMLAudioElement>;

interface SoundContextType {
  isMusicPlaying: boolean;
  toggleMusic: () => void;
  playSound: (sound: SoundType) => void;
}

const SoundContext = createContext<SoundContextType | undefined>(undefined);

export const SoundProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  
  // Use a ref to store all audio objects. They will be created only once.
  const audioRef = useRef<{ music: HTMLAudioElement; effects: SoundMap } | null>(null);

  // Initialize all audio elements on the client side, only once.
  useEffect(() => {
    // This check ensures the code runs only in the browser
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = {
        music: new Audio('/sounds/background.mp3'),
        effects: {
          spin: new Audio('/sounds/spin.mp3'),
          win: new Audio('/sounds/win.mp3'),
          tryAgain: new Audio('/sounds/tryAgain.mp3'),
          error: new Audio('/sounds/error.mp3'),
          click: new Audio('/sounds/click.mp3'),
          levelup: new Audio('/sounds/levelup.mp3'),
        }
      };
      // Configure background music
      audioRef.current.music.loop = true;
      audioRef.current.music.volume = 0.3;
    }
  }, []);

  const toggleMusic = useCallback(() => {
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.music.pause();
      } else {
        // play() returns a promise which can reject if user hasn't interacted with the page yet.
        audioRef.current.music.play().catch(error => console.warn("Background music autoplay was prevented. User interaction is required.", error.message));
      }
      setIsMusicPlaying(prevState => !prevState);
    }
  }, [isMusicPlaying]);
  
  const playSound = useCallback((sound: SoundType) => {
    if (audioRef.current) {
      const audio = audioRef.current.effects[sound];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(err => console.warn(`Could not play sound "${sound}": ${err.message}. Make sure the file exists at /public/sounds/${sound}.mp3`));
      }
    }
    
    // Haptic feedback for mobile devices
    if (typeof window !== 'undefined' && window.navigator.vibrate) {
      if (sound === 'win' || sound === 'levelup') {
        window.navigator.vibrate([100, 30, 100]);
      } else if (sound === 'spin') {
        window.navigator.vibrate(50);
      } else if (sound === 'click' || sound === 'error') {
         window.navigator.vibrate(20);
      }
    }
  }, []);

  const value = { isMusicPlaying, toggleMusic, playSound };

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
