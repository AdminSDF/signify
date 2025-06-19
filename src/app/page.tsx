
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Home, Shield, DollarSign } from 'lucide-react';
import SpinifyGameHeader from '@/components/SpinifyGameHeader';
import SpinWheel, { type Segment } from '@/components/SpinWheel';
import SpinButton from '@/components/SpinButton';
import PrizeDisplay from '@/components/PrizeDisplay';
import TipGeneratorButton from '@/components/TipGeneratorButton';
import TipModal from '@/components/TipModal';
import PaymentModal from '@/components/PaymentModal';
import { useSound } from '@/hooks/useSound';
import { useToast } from "@/hooks/use-toast";
import type { SpinHistory } from '@/ai/flows/spinify-tip-generator';
import { getAiTipAction, type TipGenerationResult } from './actions/generateTipAction';
import { ConfettiRain } from '@/components/ConfettiRain';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';


const wheelSegments: Segment[] = [
  { id: 's1', text: '₹10', emoji: '💰', amount: 10, color: '0 80% 60%', textColor: '0 0% 100%' },
  { id: 's2', text: '₹20', emoji: '🎁', amount: 20, color: '120 70% 55%', textColor: '0 0% 100%' },
  { id: 's3', text: '₹50', emoji: '🥇', amount: 50, color: '60 90% 55%', textColor: '0 0% 0%' },
  { id: 's4', text: 'Try Again', emoji: '🔁', color: '210 80% 60%', textColor: '0 0% 100%' },
  { id: 's5', text: '₹100', emoji: '💸', amount: 100, color: '270 70% 60%', textColor: '0 0% 100%' },
  { id: 's6', text: '₹5', emoji: '🎈', amount: 5, color: '30 90% 60%', textColor: '0 0% 0%' },
];

const MAX_SPINS = 10; // Initial free/bundled spins
const SPIN_COST = 2; // Cost per spin after free/bundled spins are used
const UPI_ID = "9828786246@jio";
const SPIN_REFILL_PRICE = 10; // Price to buy a bundle of MAX_SPINS

const ADMIN_EMAIL = "jameafaizanrasool@gmail.com";
// To test admin view, set email to ADMIN_EMAIL. For normal view, use another email.
const mockUser = {
  name: 'Player One',
  email: 'player.one@example.com', // or ADMIN_EMAIL for testing
  avatarUrl: 'https://placehold.co/100x100.png',
  initialBalance: 50.00, // Starting balance for the player
};


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
  const [spinsAvailable, setSpinsAvailable] = useState<number>(MAX_SPINS); // Tracks free/bundled spins
  const [userBalance, setUserBalance] = useState<number>(mockUser.initialBalance);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { playSound } = useSound();
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  const [showAdminChoiceView, setShowAdminChoiceView] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (mockUser.email === ADMIN_EMAIL) {
      setShowAdminChoiceView(true);
    }
    setUserBalance(mockUser.initialBalance);
    setSpinsAvailable(MAX_SPINS); // Initialize with free spins
  }, []);


  const startSpinProcess = () => {
    setIsSpinning(true);
    setCurrentPrize(null);
    setShowConfetti(false);
    playSound('spin');
    const winningIndex = Math.floor(Math.random() * wheelSegments.length);
    setTargetSegmentIndex(winningIndex);
  };

  const handleSpinClick = useCallback(() => {
    if (!isClient || isSpinning) return;

    if (spinsAvailable > 0) { // Use a free/bundled spin
      startSpinProcess();
      setSpinsAvailable(prev => prev - 1);
    } else if (userBalance >= SPIN_COST) { // Pay per spin from balance
      setUserBalance(prev => prev - SPIN_COST);
      startSpinProcess();
      toast({
        title: `Spin Cost: -₹${SPIN_COST.toFixed(2)}`,
        description: `₹${SPIN_COST.toFixed(2)} deducted from your balance.`,
      });
    } else { // Not enough free/bundled spins, not enough balance for a single spin
      setShowPaymentModal(true); // Prompt to buy a bundle of spins
    }
  }, [isClient, isSpinning, playSound, spinsAvailable, userBalance, toast]);

  const handleSpinComplete = useCallback((winningSegment: Segment) => {
    setIsSpinning(false);
    setCurrentPrize(winningSegment);
    
    const newSpinRecord = {
      spinNumber: spinHistory.length + 1,
      reward: winningSegment.amount ? `₹${winningSegment.amount}` : winningSegment.text,
    };
    setSpinHistory(prev => [...prev, newSpinRecord]);

    if (winningSegment.amount && winningSegment.amount > 0) {
      setUserBalance(prev => prev + (winningSegment.amount || 0));
      toast({
        title: "You Won!",
        description: `₹${winningSegment.amount.toFixed(2)} added to your balance.`,
        variant: "default" 
      });
      playSound('win');
      if (winningSegment.amount >= 50) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    } else if (winningSegment.text === 'Try Again') {
      playSound('tryAgain');
    } else {
      // Non-monetary prize, or 0 amount prize
      playSound('win'); // Still play win sound for non-monetary wins if any
    }
  }, [playSound, spinHistory.length, toast]);

  const handleGenerateTip = useCallback(async () => {
    setTipLoading(true);
    setTipError(null);
    setShowTipModal(true);

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

  const handlePaymentConfirm = useCallback(() => {
    setShowPaymentModal(false);
    setSpinsAvailable(MAX_SPINS); // Refill with a bundle of spins
    toast({
      title: "Spins Purchased!",
      description: `You now have ${MAX_SPINS} spins. Happy spinning!`,
      variant: "default",
    });
  }, [toast]);

  if (isClient && mockUser.email === ADMIN_EMAIL && showAdminChoiceView) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-4">
        <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Admin Portal Access</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Welcome, {mockUser.name}. Select your destination.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 mt-4">
            <Button 
              onClick={() => setShowAdminChoiceView(false)} 
              size="lg" 
              className="w-full"
            >
              <Home className="mr-2 h-5 w-5" /> Go to Main App
            </Button>
            <Link href="/admin" passHref legacyBehavior>
              <Button variant="outline" size="lg" className="w-full">
                <Shield className="mr-2 h-5 w-5" /> Go to Admin Panel
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canAffordSpin = userBalance >= SPIN_COST;
  const showBuySpinsButton = spinsAvailable <= 0 && !canAffordSpin;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-0 p-4 relative overflow-hidden">
      {showConfetti && <ConfettiRain />}

      {isClient && (
        <div className="w-full max-w-2xl flex justify-center my-4">
          <Card className="py-3 px-6 inline-flex items-center gap-3 shadow-md bg-primary-foreground/20 rounded-lg backdrop-blur-sm">
            <DollarSign className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold text-foreground">
              Balance: <span className="font-bold text-primary">₹{userBalance.toFixed(2)}</span>
            </span>
          </Card>
        </div>
      )}
      
      <SpinifyGameHeader />
      
      <main className="flex flex-col items-center w-full max-w-2xl">
        <SpinWheel
          segments={wheelSegments}
          onSpinComplete={handleSpinComplete}
          targetSegmentIndex={targetSegmentIndex}
          isSpinning={isSpinning}
          onClick={handleSpinClick} // Allow spinning by clicking the wheel
        />
        
        <div className="my-8 w-full flex flex-col items-center gap-4">
          <div className="text-center text-lg font-semibold text-foreground mb-1 p-2 bg-primary-foreground/20 rounded-md shadow">
            {spinsAvailable > 0 
              ? <>Spins Left: <span className="font-bold text-primary">{spinsAvailable}</span> / {MAX_SPINS} (Free/Bundled)</>
              : <>Next Spin Cost: <span className="font-bold text-primary">₹{SPIN_COST.toFixed(2)}</span> (from balance)</>
            }
          </div>
          <SpinButton 
            onClick={handleSpinClick} 
            disabled={isSpinning || !isClient || (spinsAvailable <=0 && !canAffordSpin && !showBuySpinsButton)} 
            isLoading={isSpinning}
            spinsAvailable={spinsAvailable} // This prop now determines if it shows "Spin Now" or "Buy Spins"
            forceShowBuyButton={showBuySpinsButton} // New prop to force "Buy Spins" if out of spins and balance
          />
          <PrizeDisplay prize={currentPrize} />
        </div>

        <TipGeneratorButton onClick={handleGenerateTip} disabled={tipLoading || isSpinning || !isClient} />
      </main>

      <TipModal
        isOpen={showTipModal}
        onClose={() => setShowTipModal(false)}
        tip={generatedTip}
        isLoading={tipLoading}
        error={tipError}
        onGenerateTip={handleGenerateTip}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        upiId={UPI_ID}
        amount={SPIN_REFILL_PRICE}
        spinsToGet={MAX_SPINS}
      />
    </div>
  );
}

