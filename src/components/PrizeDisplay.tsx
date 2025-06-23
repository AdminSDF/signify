
"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { SegmentConfig } from '@/lib/appConfig';

interface PrizeDisplayProps {
  prize: (SegmentConfig & { amount?: number }) | null;
}

const PrizeDisplay: React.FC<PrizeDisplayProps> = ({ prize }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prize) {
      setVisible(false); 
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [prize]);

  if (!prize) {
    return (
      <div className="text-center text-xl font-medium text-muted-foreground h-32 flex items-center justify-center">
        Spin the wheel to win a prize!
      </div>
    );
  }

  const isWin = prize.multiplier > 0;
  const prizeAmount = prize.amount;

  return (
    <div className={cn(
      "transition-all duration-500 ease-out transform scale-0 opacity-0 h-auto",
      visible && "scale-100 opacity-100"
    )}>
      <Card className={cn(
        "text-center shadow-xl w-full max-w-md mx-auto my-4",
        isWin ? "border-green-500 bg-green-50 dark:bg-green-900/30" : "border-destructive bg-red-50 dark:bg-red-900/30"
      )}>
        <CardHeader className="p-4">
          <CardTitle className={cn(
            "text-3xl font-bold font-headline flex items-center justify-center gap-3",
            isWin ? "text-green-700 dark:text-green-300" : "text-destructive"
          )}>
            <span className="text-4xl">{prize.emoji}</span>
            <span>{prize.text}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isWin && prizeAmount !== undefined && prizeAmount > 0 ? (
            <p className="text-2xl font-semibold text-foreground">
              You won <span className="font-bold text-primary">₹{prizeAmount.toFixed(2)}!</span>
            </p>
          ) : (
            <p className="text-xl font-medium text-muted-foreground">
              No prize this time. Spin again for another chance!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PrizeDisplay;
