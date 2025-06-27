
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

// Custom hook for the typewriter effect
const useTypewriter = (text: string | null, speed = 30) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }
    
    setDisplayedText(''); // Reset on new message
    let i = 0;
    const intervalId = setInterval(() => {
      i++;
      setDisplayedText(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(intervalId);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  return displayedText;
};


interface GameAssistantProps {
  message: string | null;
  isLoading: boolean;
  className?: string;
}

const GameAssistant: React.FC<GameAssistantProps> = ({ message, isLoading, className }) => {
  const typedMessage = useTypewriter(message);
  const isTyping = message ? typedMessage.length < message.length : false;

  return (
    <div className={cn("w-full max-w-md mx-auto my-6", className)} data-tour-id="game-assistant">
      <Card className="bg-primary-foreground/20 dark:bg-card/30 border-border/50 shadow-md">
        <CardContent className="p-4 flex items-start gap-4 min-h-[80px]">
          <div className="p-2 bg-primary/20 rounded-full">
            <Lightbulb className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 pt-1">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <p className="text-foreground/90 font-medium">
                {typedMessage}
                {isTyping && (
                  <span className="inline-block w-0.5 h-4 bg-primary align-text-bottom animate-blink" />
                )}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameAssistant;
