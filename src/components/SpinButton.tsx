"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react'; // Using an icon for loading state

interface SpinButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

const SpinButton: React.FC<SpinButtonProps> = ({ isLoading = false, disabled, onClick, ...props }) => {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "w-full max-w-xs mx-auto text-2xl md:text-3xl font-bold py-8 px-8 rounded-xl transition-all duration-150 ease-in-out transform",
        "text-primary-foreground shadow-lg hover:shadow-xl active:shadow-md",
        "bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600", // Example gradient
        "hover:scale-105 active:scale-95",
        "focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800",
        (disabled || isLoading) ? "opacity-70 cursor-not-allowed" : "hover:brightness-110"
      )}
      aria-label="Spin the wheel"
      {...props}
    >
      {isLoading ? (
        <RefreshCw className="animate-spin h-8 w-8" />
      ) : (
        <>
          <span role="img" aria-label="target emoji" className="mr-2">🎯</span>
          Spin Now
        </>
      )}
    </Button>
  );
};

export default SpinButton;
