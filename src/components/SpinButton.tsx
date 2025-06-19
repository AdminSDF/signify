
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw, Gift, ShoppingCart } from 'lucide-react'; // Added ShoppingCart for "Get More Spins"

interface SpinButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  spinsAvailable?: number;
}

const SpinButton: React.FC<SpinButtonProps> = ({ 
  isLoading = false, 
  disabled, 
  onClick, 
  spinsAvailable = 0,
  ...props 
}) => {
  const isOutOfSpins = spinsAvailable <= 0;

  const buttonText = isLoading 
    ? <RefreshCw className="animate-spin h-8 w-8" />
    : !isOutOfSpins
    ? (
        <>
          <span role="img" aria-label="target emoji" className="mr-2 text-3xl">🎯</span>
          Spin Now
        </>
      ) 
    : (
        <>
          <ShoppingCart className="mr-2 h-7 w-7" />
          Buy Spins
        </>
      );

  const buttonLabel = isLoading 
    ? "Spinning the wheel" 
    : !isOutOfSpins 
    ? "Spin the wheel" 
    : "Buy more spins";

  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "w-full max-w-xs mx-auto text-2xl md:text-3xl font-bold py-8 px-8 rounded-xl transition-all duration-150 ease-in-out transform",
        "text-primary-foreground shadow-lg hover:shadow-xl active:shadow-md",
        !isOutOfSpins 
          ? "bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 hover:brightness-110 focus:ring-purple-300 dark:focus:ring-purple-800"
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
