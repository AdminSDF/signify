
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
const USER_BALANCE_STORAGE_KEY = 'spinifyUserBalance';
const SPINS_AVAILABLE_STORAGE_KEY = 'spinifySpinsAvailable';
const DAILY_PAID_SPINS_USED_KEY = 'spinifyDailyPaidSpinsUsed';
const LAST_PAID_SPIN_DATE_KEY = 'spinifyLastPaidSpinDate';


// Define a type for segments that includes probability for internal use
interface WheelSegmentWithProbability extends Segment {
  probability: number;
}

// EV ~ ₹1.24. (0.01*20 + 0.05*10 + 0.06*5 + 0.07*2 + 0.10*1) = 0.20 + 0.50 + 0.30 + 0.14 + 0.10 = 1.24
const wheelSegments: WheelSegmentWithProbability[] = [
  { id: 's100', text: '₹100', emoji: '💎', amount: 100, color: '300 80% 60%', textColor: '0 0% 100%', probability: 0.00 },
  { id: 's50',  text: '₹50',  emoji: '💰', amount: 50,  color: '270 80% 65%', textColor: '0 0% 100%', probability: 0.00 },
  { id: 's20',  text: '₹20',  emoji: '💸', amount: 20,  color: '0 80% 60%',   textColor: '0 0% 100%', probability: 0.01 },
  { id: 's10',  text: '₹10',  emoji: '💵', amount: 10,  color: '30 90% 55%',  textColor: '0 0% 0%',   probability: 0.05 },
  { id: 's5',   text: '₹5',   emoji: '🎈', amount: 5,   color: '60 90% 55%',  textColor: '0 0% 0%',   probability: 0.06 },
  { id: 's2',   text: '₹2',   emoji: '🤑', amount: 2,   color: '120 70% 55%', textColor: '0 0% 100%', probability: 0.07 },
  { id: 's1',   text: '₹1',   emoji: '🪙', amount: 1,   color: '180 70% 50%', textColor: '0 0% 100%', probability: 0.10 },
  { id: 's0',   text: 'Try Again', emoji: '🔁', amount: 0, color: '210 80% 60%', textColor: '0 0% 100%', probability: 0.71 },
];


const MAX_SPINS_IN_BUNDLE = 10; // Renamed from MAX_SPINS to avoid confusion
const UPI_ID = "9828786246@jio";
const SPIN_REFILL_PRICE = 10; 

const ADMIN_EMAIL = "jameafaizanrasool@gmail.com";
const mockUser = {
  name: 'Player One',
  email: 'player.one@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
  initialBalance: 50.00,
};

// Tiered pricing constants
const TIER1_LIMIT = 30;
const TIER1_COST = 2;
const TIER2_LIMIT = 60; // Spins 31 to 60 (i.e., < 60)
const TIER2_COST = 3;
const TIER3_COST = 5;


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
  const [spinsAvailable, setSpinsAvailable] = useState<number>(MAX_SPINS_IN_BUNDLE);
  const [userBalance, setUserBalance] = useState<number>(mockUser.initialBalance);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);

  // State for tiered pricing
  const [dailyPaidSpinsUsed, setDailyPaidSpinsUsed] = useState<number>(0);
  const [lastPaidSpinDate, setLastPaidSpinDate] = useState<string>(new Date().toLocaleDateString());

  const { playSound } = useSound();
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  const [showAdminChoiceView, setShowAdminChoiceView] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (mockUser.email === ADMIN_EMAIL) {
      setShowAdminChoiceView(true);
    }
    const storedBalance = localStorage.getItem(USER_BALANCE_STORAGE_KEY);
    const storedSpins = localStorage.getItem(SPINS_AVAILABLE_STORAGE_KEY);

    setUserBalance(storedBalance ? parseFloat(storedBalance) : mockUser.initialBalance);
    setSpinsAvailable(storedSpins ? parseInt(storedSpins, 10) : MAX_SPINS_IN_BUNDLE);

    // Load daily paid spin count and date
    const todayString = new Date().toLocaleDateString();
    const storedLastDate = localStorage.getItem(LAST_PAID_SPIN_DATE_KEY);
    const storedDailySpins = localStorage.getItem(DAILY_PAID_SPINS_USED_KEY);

    if (storedLastDate === todayString) {
      setDailyPaidSpinsUsed(storedDailySpins ? parseInt(storedDailySpins, 10) : 0);
    } else {
      setDailyPaidSpinsUsed(0); // Reset for new day
    }
    setLastPaidSpinDate(todayString); // Always set/update lastPaidSpinDate state

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
      localStorage.setItem(USER_BALANCE_STORAGE_KEY, userBalance.toString());
      localStorage.setItem(SPINS_AVAILABLE_STORAGE_KEY, spinsAvailable.toString());
      localStorage.setItem(DAILY_PAID_SPINS_USED_KEY, dailyPaidSpinsUsed.toString());
      localStorage.setItem(LAST_PAID_SPIN_DATE_KEY, lastPaidSpinDate);
    }
  }, [transactions, userBalance, spinsAvailable, dailyPaidSpinsUsed, lastPaidSpinDate, isClient]);

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
      if (segmentProbability === 0 && totalProbability > 0) continue; 

      if (random < segmentProbability) {
        return i;
      }
      random -= segmentProbability;
    }
    const fallbackIndex = segments.findIndex(s => (s.probability || 0) > 0);
    return fallbackIndex !== -1 ? fallbackIndex : segments.length - 1;
  }, []);


  const startSpinProcess = useCallback(() => {
    setIsSpinning(true);
    setCurrentPrize(null);
    setShowConfetti(false);
    playSound('spin');
    
    const winningIndex = selectWinningSegmentByProbability(wheelSegments);
    setTargetSegmentIndex(winningIndex);
  }, [playSound, selectWinningSegmentByProbability]);

  const getCurrentPaidSpinCost = useCallback((spinsUsedToday: number): number => {
    if (spinsUsedToday < TIER1_LIMIT) {
      return TIER1_COST;
    }
    if (spinsUsedToday < TIER2_LIMIT) {
      return TIER2_COST;
    }
    return TIER3_COST;
  }, []);


  const handleSpinClick = useCallback(() => {
    if (!isClient || isSpinning) return;

    let currentDailyPaidSpins = dailyPaidSpinsUsed;
    const today = new Date().toLocaleDateString();

    if (lastPaidSpinDate !== today) {
      console.log("New day detected for paid spins, resetting count.");
      currentDailyPaidSpins = 0;
      setDailyPaidSpinsUsed(0);
      setLastPaidSpinDate(today); 
    }

    if (spinsAvailable > 0) {
      // Use free/bundled spin
      startSpinProcess();
      setSpinsAvailable(prev => prev - 1);
      // dailyPaidSpinsUsed is NOT incremented for free/bundled spins
    } else {
      // Paying per spin from balance - apply tiered pricing
      const costForThisSpin = getCurrentPaidSpinCost(currentDailyPaidSpins);

      if (userBalance >= costForThisSpin) {
        setUserBalance(prev => prev - costForThisSpin);
        addTransaction({ type: 'debit', amount: costForThisSpin, description: `Spin Cost (Paid Tier ${
            costForThisSpin === TIER1_COST ? 1 : costForThisSpin === TIER2_COST ? 2 : 3
        })` });
        startSpinProcess();
        toast({
          title: `Spin Cost: -₹${costForThisSpin.toFixed(2)}`,
          description: `₹${costForThisSpin.toFixed(2)} deducted. Paid spins today: ${currentDailyPaidSpins + 1}.`,
        });
        setDailyPaidSpinsUsed(prev => prev + 1); // Increment AFTER successful paid spin
      } else {
        // Not enough balance for the current tier's spin cost
        setShowPaymentModal(true); // Prompt to buy a bundle
      }
    }
  }, [
    isClient, isSpinning, startSpinProcess, spinsAvailable, userBalance, toast, addTransaction,
    dailyPaidSpinsUsed, lastPaidSpinDate, getCurrentPaidSpinCost
  ]);

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
      if (winningSegment.amount >= 10) { 
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    } else { 
      addTransaction({
        type: 'debit', 
        amount: 0, 
        description: `Spin Result: ${winningSegment.text}`
      });
      if (winningSegment.text === 'Try Again') playSound('tryAgain');
      else playSound('win'); 
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

  const handlePaymentConfirm = useCallback(() => { // For buying a bundle
    setShowPaymentModal(false);
    addTransaction({ type: 'debit', amount: SPIN_REFILL_PRICE, description: `Purchased ${MAX_SPINS_IN_BUNDLE} Spins Bundle` });
    setSpinsAvailable(MAX_SPINS_IN_BUNDLE); 
    toast({
      title: "Spins Purchased!",
      description: `You now have ${MAX_SPINS_IN_BUNDLE} spins. Happy spinning!`,
      variant: "default",
    });
  }, [toast, addTransaction]);

  if (!isClient) {
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

  const costOfNextPaidSpin = getCurrentPaidSpinCost(dailyPaidSpinsUsed);
  const canAffordNextPaidSpin = userBalance >= costOfNextPaidSpin;
  const showBuyBundleButton = spinsAvailable <= 0 && !canAffordNextPaidSpin;

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
              ? <>Spins Left: <span className="font-bold text-primary">{spinsAvailable}</span> / {MAX_SPINS_IN_BUNDLE} (Free/Bundled)</>
              : <>Next Spin Cost: <span className="font-bold text-primary">₹{costOfNextPaidSpin.toFixed(2)}</span> (from balance). Paid today: {dailyPaidSpinsUsed}</>
            }
          </div>
          <SpinButton 
            onClick={handleSpinClick} 
            disabled={isSpinning || (spinsAvailable <=0 && !canAffordNextPaidSpin && !showBuyBundleButton)} 
            isLoading={isSpinning}
            spinsAvailable={spinsAvailable}
            forceShowBuyButton={showBuyBundleButton}
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

      <PaymentModal // This modal is for buying a bundle of spins
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onConfirm={handlePaymentConfirm}
        upiId={UPI_ID}
        amount={SPIN_REFILL_PRICE}
        spinsToGet={MAX_SPINS_IN_BUNDLE}
      />
    </div>
  );
}
    
