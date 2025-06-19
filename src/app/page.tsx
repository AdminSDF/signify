
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

interface TransactionEvent {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

const TRANSACTION_STORAGE_KEY = 'spinifyTransactions';

// Define a type for segments that includes probability for internal use
interface WheelSegmentWithProbability extends Segment {
  probability: number;
}

const wheelSegments: WheelSegmentWithProbability[] = [
  { id: 's1', text: '₹10', emoji: '💰', amount: 10, color: '0 80% 60%', textColor: '0 0% 100%', probability: 0.15 }, // 15%
  { id: 's2', text: '₹20', emoji: '🎁', amount: 20, color: '120 70% 55%', textColor: '0 0% 100%', probability: 0.25 }, // 25%
  { id: 's3', text: '₹50', emoji: '🥇', amount: 50, color: '60 90% 55%', textColor: '0 0% 0%', probability: 0.10 },  // 10%
  { id: 's4', text: 'Try Again', emoji: '🔁', amount: 0, color: '210 80% 60%', textColor: '0 0% 100%', probability: 0.10 }, // 10%
  { id: 's5', text: '₹100', emoji: '💸', amount: 100, color: '270 70% 60%', textColor: '0 0% 100%', probability: 0.00 }, // 0%
  { id: 's6', text: '₹5', emoji: '🎈', amount: 5, color: '30 90% 60%', textColor: '0 0% 0%', probability: 0.40 },   // 40%
]; // Total: 1.00 (100%)

const MAX_SPINS = 10; 
const SPIN_COST = 2; 
const UPI_ID = "9828786246@jio";
const SPIN_REFILL_PRICE = 10;

const ADMIN_EMAIL = "jameafaizanrasool@gmail.com";
const mockUser = {
  name: 'Player One',
  email: 'player.one@example.com', 
  avatarUrl: 'https://placehold.co/100x100.png',
  initialBalance: 50.00,
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
  const [spinsAvailable, setSpinsAvailable] = useState<number>(MAX_SPINS);
  const [userBalance, setUserBalance] = useState<number>(mockUser.initialBalance);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);

  const { playSound } = useSound();
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  const [showAdminChoiceView, setShowAdminChoiceView] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (mockUser.email === ADMIN_EMAIL) {
      setShowAdminChoiceView(true);
    }
    // Load initial balance and spins from mockUser or potentially localStorage if persisted
    const storedBalance = localStorage.getItem('spinifyUserBalance');
    const storedSpins = localStorage.getItem('spinifySpinsAvailable');

    setUserBalance(storedBalance ? parseFloat(storedBalance) : mockUser.initialBalance);
    setSpinsAvailable(storedSpins ? parseInt(storedSpins, 10) : MAX_SPINS);


    if (typeof window !== 'undefined') {
      const storedTransactions = localStorage.getItem(TRANSACTION_STORAGE_KEY);
      if (storedTransactions) {
        try {
          const parsedTransactions = JSON.parse(storedTransactions) as TransactionEvent[];
          parsedTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setTransactions(parsedTransactions);
        } catch (e) {
          console.error("Error parsing transactions from localStorage", e);
          setTransactions([]); 
        }
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && isClient) {
      localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(transactions));
      localStorage.setItem('spinifyUserBalance', userBalance.toString());
      localStorage.setItem('spinifySpinsAvailable', spinsAvailable.toString());
    }
  }, [transactions, userBalance, spinsAvailable, isClient]);

  const addTransaction = useCallback((details: { type: 'credit' | 'debit'; amount: number; description: string }) => {
    const newTransactionEntry: TransactionEvent = {
      ...details,
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString(),
      status: 'completed',
    };
    setTransactions(prevTransactions => {
      const updated = [newTransactionEntry, ...prevTransactions];
      updated.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return updated;
    });
  }, []);

  const selectWinningSegmentByProbability = useCallback((segments: WheelSegmentWithProbability[]): number => {
    const totalProbability = segments.reduce((sum, segment) => sum + (segment.probability || 0), 0);
    let random = Math.random() * totalProbability;
  
    for (let i = 0; i < segments.length; i++) {
      const segmentProbability = segments[i].probability || 0;
      if (segmentProbability === 0 && totalProbability > 0) continue; // Skip segments with 0 probability unless it's the only option

      if (random < segmentProbability) {
        return i;
      }
      random -= segmentProbability;
    }
    // Fallback: should ideally not be reached if probabilities sum to totalProbability and are positive.
    // To be safe, return a random segment or the last one.
    return segments.findIndex(s => (s.probability || 0) > 0) ?? Math.floor(Math.random() * segments.length);
  }, []);


  const startSpinProcess = useCallback(() => {
    setIsSpinning(true);
    setCurrentPrize(null);
    setShowConfetti(false);
    playSound('spin');
    
    const winningIndex = selectWinningSegmentByProbability(wheelSegments);
    setTargetSegmentIndex(winningIndex);
  }, [playSound, selectWinningSegmentByProbability]);

  const handleSpinClick = useCallback(() => {
    if (!isClient || isSpinning) return;

    if (spinsAvailable > 0) {
      startSpinProcess();
      setSpinsAvailable(prev => prev - 1);
    } else if (userBalance >= SPIN_COST) {
      setUserBalance(prev => prev - SPIN_COST);
      addTransaction({ type: 'debit', amount: SPIN_COST, description: 'Spin Cost' });
      startSpinProcess();
      toast({
        title: `Spin Cost: -₹${SPIN_COST.toFixed(2)}`,
        description: `₹${SPIN_COST.toFixed(2)} deducted from your balance.`,
      });
    } else {
      setShowPaymentModal(true);
    }
  }, [isClient, isSpinning, startSpinProcess, spinsAvailable, userBalance, toast, addTransaction]);

  const handleSpinComplete = useCallback((winningSegment: Segment) => {
    setIsSpinning(false);
    setCurrentPrize(winningSegment);
    
    const newSpinRecordForAI = { 
      spinNumber: spinHistory.length + 1,
      reward: winningSegment.amount ? `₹${winningSegment.amount}` : winningSegment.text,
    };
    setSpinHistory(prev => [...prev, newSpinRecordForAI]);

    if (winningSegment.amount && winningSegment.amount > 0) {
      setUserBalance(prev => prev + (winningSegment.amount || 0));
      addTransaction({ 
        type: 'credit', 
        amount: winningSegment.amount, 
        description: `Prize: ${winningSegment.text}` 
      });
      toast({
        title: "You Won!",
        description: `₹${winningSegment.amount.toFixed(2)} added to your balance.`,
        variant: "default" 
      });
      playSound('win');
      if (winningSegment.amount >= 50) { // Confetti for big wins (₹50 or ₹100)
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    } else { // Try Again or other non-monetary prizes
      addTransaction({
        type: 'debit', 
        amount: 0, 
        description: `Spin Result: ${winningSegment.text}`
      });
      if (winningSegment.text === 'Try Again') playSound('tryAgain');
      else playSound('win'); // For other non-monetary prizes if any
    }
  }, [playSound, spinHistory.length, toast, addTransaction]);

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
    // This transaction is for "buying spins", not directly adding to game balance
    addTransaction({ type: 'debit', amount: SPIN_REFILL_PRICE, description: `Purchased ${MAX_SPINS} Spins Bundle` });
    setSpinsAvailable(MAX_SPINS); 
    // Note: This mock payment doesn't actually affect userBalance, as it's like a "real money" purchase
    toast({
      title: "Spins Purchased!",
      description: `You now have ${MAX_SPINS} spins. Happy spinning!`,
      variant: "default",
    });
  }, [toast, addTransaction]);

  if (!isClient) {
    // Basic loading state or skeleton
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-4">
        <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Loading Spinify...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 mt-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }


  if (mockUser.email === ADMIN_EMAIL && showAdminChoiceView) {
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
          onClick={handleSpinClick}
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
            disabled={isSpinning || (spinsAvailable <=0 && !canAffordSpin && !showBuySpinsButton)} 
            isLoading={isSpinning}
            spinsAvailable={spinsAvailable}
            forceShowBuyButton={showBuySpinsButton}
          />
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

