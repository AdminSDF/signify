
"use client";

import { useSoundControl } from '@/context/SoundContext';

// This hook is now a simple wrapper around the context
// to provide a clean API for playing sound effects.
export function useSound() {
  const { playSound } = useSoundControl();
  return { playSound };
}
