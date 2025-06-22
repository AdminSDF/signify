
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PrizeDisplayProps {
  prize: {
    text: string;
    emoji: string;
    amount?: number;
    multiplier?: number;
  } | null;
}

const PrizeDisplay: React.FC<PrizeDisplayProps> = ({ prize }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prize) {
      setVisible(false); // Reset for animation
      const timer = setTimeout(() => setVisible(true), 100); // Small delay to trigger transition
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [prize]);

  if (!prize) {
    return (
      <div className="text-center text-xl font-medium text-muted-foreground h-24 flex items-center justify-center">
        Spin the wheel to win a prize!
      </div>
    );
  }

  const isWin = prize.multiplier !== 0;

  return (
    <div className={cn(
      "transition-all duration-500 ease-out transform scale-0 opacity-0 h-auto",
      visible && "scale-100 opacity-100"
    )}>
      <Card className={cn(
        "text-center shadow-xl w-full max-w-md mx-auto my-6",
        isWin ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-destructive bg-red-50 dark:bg-red-900/30"
      )}>
        <CardHeader>
          <CardTitle className={cn(
            "text-3xl font-bold font-headline",
            isWin ? "text-green-700 dark:text-green-300" : "text-destructive"
          )}>
            {isWin ? 'Congratulations! 🎉' : 'Better Luck Next Time! 😥'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-5xl my-4">{prize.emoji}</p>
          <p className="text-2xl font-semibold text-foreground">
            You won: {prize.text}
            {prize.amount && prize.amount > 0 && ` (₹${prize.amount.toFixed(2)})`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizeDisplay;
