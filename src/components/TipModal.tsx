"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, AlertTriangle } from 'lucide-react';

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  tip: string | null;
  isLoading: boolean;
  error: string | null;
  onGenerateTip: () => void; // Callback to regenerate tip if needed
}

const TipModal: React.FC<TipModalProps> = ({ isOpen, onClose, tip, isLoading, error, onGenerateTip }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <Lightbulb className="w-7 h-7 text-yellow-400" />
            Your AI-Powered Tip!
          </DialogTitle>
        </DialogHeader>
        <DialogDescription className="mt-2 text-base">
          Here's some advice from our AI to help you win more!
        </DialogDescription>
        <div className="my-6 p-4 min-h-[100px] rounded-md border border-dashed border-border flex items-center justify-center">
          {isLoading ? (
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : error ? (
            <div className="text-destructive text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : (
            <p className="text-lg text-foreground">{tip}</p>
          )}
        </div>
        <DialogFooter className="sm:justify-between gap-2">
           <Button type="button" variant="outline" onClick={onGenerateTip} disabled={isLoading}>
            {isLoading ? "Generating..." : "Get Another Tip"}
          </Button>
          <Button type="button" variant="default" onClick={onClose}>
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TipModal;
