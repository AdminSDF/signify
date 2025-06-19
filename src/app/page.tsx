"use client";

import React, { useState, useEffect, useCallback } from 'react';
import SpinifyGameHeader from '@/components/SpinifyGameHeader'; // Updated import
import SpinWheel, { type Segment } from '@/components/SpinWheel';
import SpinButton from '@/components/SpinButton';
import PrizeDisplay from '@/components/PrizeDisplay';
import TipGeneratorButton from '@/components/TipGeneratorButton';
import TipModal from '@/components/TipModal';
import { useSound } from '@/hooks/useSound';
import { useToast } from "@/hooks/use-toast";
import type { SpinHistory } from '@/ai/flows/spinify-tip-generator';
import { getAiTipAction, type TipGenerationResult } from './actions/generateTipAction';
import { ConfettiRain } from '@/components/ConfettiRain'; // Placeholder for confetti

// Define segments for the wheel
const wheelSegments: Segment[] = [
  { id: 's1', text: '₹10', emoji: '💰', amount: 10, color: '0 80% 60%' /* Red */, textColor: '0 0% 100%' },
  { id: 's2', text: '₹20', emoji: '🎁', amount: 20, color: '120 70% 55%' /* Green */, textColor: '0 0% 100%' },
  { id: 's3', text: '₹50', emoji: '🥇', amount: 50, color: '60 90% 55%' /* Yellow */, textColor: '0 0% 0%' },
  { id: 's4', text: 'Try Again', emoji: '🔁', color: '210 80% 60%' /* Blue */, textColor: '0 0% 100%' },
  { id: 's5', text: '₹100', emoji: '💸', amount: 100, color: '270 70% 60%' /* Purple */, textColor: '0 0% 100%' },
  { id: 's6', text: '₹5', emoji: '🎈', amount: 5, color: '30 90% 60%' /* Orange */, textColor: '0 0% 0%' },
];

export default function HomePage() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetSegmentIndex, setTargetSegmentIndex] = useState<number | null>(null);
  const [currentPrize, setCurrentPrize] = useState<Segment | null>(null);
  const [spinHistory, setSpinHistory] = useState<SpinHistory>([]);
  
  const [showTipModal, setShowTipModal] = useState(false);
  const [generatedTip, setGeneratedTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);

  const [showConfetti, setShowConfetti] = useState(false);

  const { playSound } = useSound();
  const { toast } = useToast();

  // Initialize random number generator state on client
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSpinClick = useCallback(() => {
    if (!isClient || isSpinning) return;

    setIsSpinning(true);
    setCurrentPrize(null); // Clear previous prize
    setShowConfetti(false);
    playSound('spin');
    
    // Determine winning segment client-side
    const winningIndex = Math.floor(Math.random() * wheelSegments.length);
    setTargetSegmentIndex(winningIndex);
  }, [isClient, isSpinning, playSound]);

  const handleSpinComplete = useCallback((winningSegment: Segment) => {
    setIsSpinning(false);
    setCurrentPrize(winningSegment);
    
    const newSpinRecord = {
      spinNumber: spinHistory.length + 1,
      reward: winningSegment.amount ? `₹${winningSegment.amount}` : winningSegment.text,
    };
    setSpinHistory(prev => [...prev, newSpinRecord]);

    if (winningSegment.text === 'Try Again') {
      playSound('tryAgain');
    } else {
      playSound('win');
      if (winningSegment.amount && winningSegment.amount >= 50) { // Big win confetti
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000); // Confetti for 4 seconds
      }
    }
  }, [playSound, spinHistory.length]);

  const handleGenerateTip = useCallback(async () => {
    setTipLoading(true);
    setTipError(null);
    setShowTipModal(true); // Open modal immediately and show loading state

    const result: TipGenerationResult = await getAiTipAction(spinHistory);
    
    if (result.tip) {
      setGeneratedTip(result.tip);
    } else if (result.error) {
      setGeneratedTip(null);
      setTipError(result.error);
      toast({
        variant: "destructive",
        title: "Tip Generation Failed",
        description: result.error,
      });
    }
    setTipLoading(false);
  }, [spinHistory, toast]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-0 p-4 relative overflow-hidden">
      {showConfetti && <ConfettiRain />}
      <SpinifyGameHeader /> {/* Updated component name */}
      
      <main className="flex flex-col items-center w-full max-w-2xl">
        <SpinWheel
          segments={wheelSegments}
          onSpinComplete={handleSpinComplete}
          targetSegmentIndex={targetSegmentIndex}
          isSpinning={isSpinning}
        />
        
        <div className="my-8 w-full flex flex-col items-center gap-6">
          <SpinButton onClick={handleSpinClick} disabled={isSpinning || !isClient} isLoading={isSpinning} />
          <PrizeDisplay prize={currentPrize} />
        </div>

        <TipGeneratorButton onClick={handleGenerateTip} disabled={tipLoading || isSpinning} />
      </main>

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        tip={generatedTip}
        isLoading={tipLoading}
        error={tipError}
        onGenerateTip={handleGenerateTip}
      />
      
      {/* Footer is now in layout.tsx */}
    </div>
  );
}
