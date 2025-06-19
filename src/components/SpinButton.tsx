
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Gift, ShoppingCart, Zap } from 'lucide-react'; // Added Zap for Spin Now

interface SpinButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  spinsAvailable?: number;
  forceShowBuyButton?: boolean; // New prop
}

const SpinButton: React.FC<SpinButtonProps> = ({ 
  isLoading = false, 
  disabled, 
  onClick, 
  spinsAvailable = 0,
  forceShowBuyButton = false,
  ...props 
}) => {
  const showBuyButton = forceShowBuyButton || (spinsAvailable <= 0 && !forceShowBuyButton); // Simplified logic based on new prop

  const buttonText = isLoading 
    ? <RefreshCw className="animate-spin h-8 w-8" />
    : !showBuyButton // If not showing "Buy Spins", show "Spin Now"
    ? (
        <>
          <Zap className="mr-2 h-7 w-7" /> {/* Using Zap icon for "Spin Now" */}
          Spin Now
        </>
      ) 
    : ( // Show "Buy Spins"
        <>
          <ShoppingCart className="mr-2 h-7 w-7" />
          Buy Spins
        </>
      );

  const buttonLabel = isLoading 
    ? "Spinning the wheel" 
    : !showBuyButton
    ? "Spin the wheel" 
    : "Buy more spins";

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "w-full max-w-xs mx-auto text-2xl md:text-3xl font-bold py-8 px-8 rounded-xl transition-all duration-150 ease-in-out transform",
        "text-primary-foreground shadow-lg hover:shadow-xl active:shadow-md",
        !showBuyButton 
          ? "bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 hover:brightness-110 focus:ring-purple-300 dark:focus:ring-purple-800" // "Spin Now" gradient
          : "bg-gradient-to-br from-green-500 via-emerald-600 to-teal-700 hover:brightness-110 focus:ring-emerald-300 dark:focus:ring-emerald-800", // "Buy Spins" gradient
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-4",
        (disabled || isLoading) && "opacity-70 cursor-not-allowed"
      )}
      aria-label={buttonLabel}
      {...props}
    >
      {buttonText}
    </Button>
  );
};

export default SpinButton;
