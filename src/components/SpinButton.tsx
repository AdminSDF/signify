
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Gift } from 'lucide-react'; // Using an icon for loading state and gift for more spins

interface SpinButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  spinsAvailable?: number;
}

const SpinButton: React.FC<SpinButtonProps> = ({ 
  isLoading = false, 
  disabled, 
  onClick, 
  spinsAvailable = 0, // Default to 0 if not provided
  ...props 
}) => {
  const buttonText = isLoading 
    ? <RefreshCw className="animate-spin h-8 w-8" />
    : spinsAvailable > 0 
    ? (
        <>
          <span role="img" aria-label="target emoji" className="mr-2">🎯</span>
          Spin Now
        </>
      ) 
    : (
        <>
          <Gift className="mr-2 h-7 w-7" />
          Get More Spins
        </>
      );

  const buttonLabel = isLoading 
    ? "Spinning the wheel" 
    : spinsAvailable > 0 
    ? "Spin the wheel" 
    : "Get more spins";

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading} // Button is disabled if parent says so (e.g. during spin) or if it's loading
      className={cn(
        "w-full max-w-xs mx-auto text-2xl md:text-3xl font-bold py-8 px-8 rounded-xl transition-all duration-150 ease-in-out transform",
        "text-primary-foreground shadow-lg hover:shadow-xl active:shadow-md",
        spinsAvailable > 0 
          ? "bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 hover:brightness-110 focus:ring-purple-300 dark:focus:ring-purple-800" // Spin gradient
          : "bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 hover:brightness-110 focus:ring-emerald-300 dark:focus:ring-emerald-800", // Get more spins gradient
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-4",
        (disabled || isLoading) && "opacity-70 cursor-not-allowed" // Apply opacity if disabled by parent or loading
      )}
      aria-label={buttonLabel}
      {...props}
    >
      {buttonText}
    </Button>
  );
};

export default SpinButton;
