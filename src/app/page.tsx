
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Shield, DollarSign, ShieldAlert } from 'lucide-react';
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
import { useAuth } from '@/context/AuthContext';

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

interface WheelSegmentWithProbability extends Segment {
  probability: number;
}

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

const MAX_SPINS_IN_BUNDLE = 10;
const UPI_ID = "9828786246@jio";
const SPIN_REFILL_PRICE = 10; 

const ADMIN_EMAIL = "jameafaizanrasool@gmail.com"; // This should ideally come from .env
const INITIAL_BALANCE_FOR_NEW_USERS = 50.00; // If user specific balance isn't found

const TIER1_LIMIT = 30;
const TIER1_COST = 2;
const TIER2_LIMIT = 60;
const TIER2_COST = 3;
const TIER3_COST = 5;

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

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
  const [userBalance, setUserBalance] = useState<number>(INITIAL_BALANCE_FOR_NEW_USERS);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);

  const [dailyPaidSpinsUsed, setDailyPaidSpinsUsed] = useState<number>(0);
  const [lastPaidSpinDate, setLastPaidSpinDate] = useState<string>(new Date().toLocaleDateString());

  const { playSound } = useSound();
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  const [showAdminChoiceView, setShowAdminChoiceView] = useState(false);
  
  // Effect for initial client-side setup and localStorage access
  useEffect(() => {
    setIsClient(true);
    // We wait for auth to settle before deciding admin view or loading user data
  }, []);

  // Effect to handle user data loading and admin view logic once auth is ready
  useEffect(() => {
    if (!isClient || authLoading) return; // Only run if client and auth is no longer loading

    if (!user) {
      // If no user and not loading, user data can't be loaded (e.g. balance)
      // But we don't redirect here, as unauth users can still see the game.
      // Balance/Spins will use defaults or show as 0 if specific logic is added for unauth state.
       setUserBalance(0); // Example: set balance to 0 for guests
       setSpinsAvailable(0); // Example: set spins to 0 for guests
      return;
    }
    
    // User is logged in, determine admin status
    if (user.email === ADMIN_EMAIL) {
      setShowAdminChoiceView(true); // Show admin choice if they haven't made one
    }

    // Load user-specific data from localStorage (or default if not found)
    // Note: For a real app, balance would come from a backend tied to user ID
    const storedBalance = localStorage.getItem(USER_BALANCE_STORAGE_KEY); // This is a shared key, ideally make it user-specific
    const storedSpins = localStorage.getItem(SPINS_AVAILABLE_STORAGE_KEY);

    setUserBalance(storedBalance ? parseFloat(storedBalance) : INITIAL_BALANCE_FOR_NEW_USERS);
    setSpinsAvailable(storedSpins ? parseInt(storedSpins, 10) : MAX_SPINS_IN_BUNDLE);

    const todayString = new Date().toLocaleDateString();
    const storedLastDate = localStorage.getItem(LAST_PAID_SPIN_DATE_KEY);
    const storedDailySpins = localStorage.getItem(DAILY_PAID_SPINS_USED_KEY);

    if (storedLastDate === todayString) {
      setDailyPaidSpinsUsed(storedDailySpins ? parseInt(storedDailySpins, 10) : 0);
    } else {
      setDailyPaidSpinsUsed(0);
    }
    setLastPaidSpinDate(todayString);

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
  }, [isClient, authLoading, user, ADMIN_EMAIL]);


  useEffect(() => {
    if (typeof window !== 'undefined' && isClient && user) { // Only save if user is logged in
      localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(transactions));
      localStorage.setItem(USER_BALANCE_STORAGE_KEY, userBalance.toString());
      localStorage.setItem(SPINS_AVAILABLE_STORAGE_KEY, spinsAvailable.toString());
      localStorage.setItem(DAILY_PAID_SPINS_USED_KEY, dailyPaidSpinsUsed.toString());
      localStorage.setItem(LAST_PAID_SPIN_DATE_KEY, lastPaidSpinDate);
    }
  }, [transactions, userBalance, spinsAvailable, dailyPaidSpinsUsed, lastPaidSpinDate, isClient, user]);

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

    if (!user) {
        toast({
            title: "Login Required",
            description: "Please log in to spin the wheel.",
            variant: "destructive",
            action: <Button onClick={() => router.push('/login')}>Login</Button>
        });
        return;
    }

    let currentDailyPaidSpins = dailyPaidSpinsUsed;
    const today = new Date().toLocaleDateString();

    if (lastPaidSpinDate !== today) {
      currentDailyPaidSpins = 0;
      setDailyPaidSpinsUsed(0);
      setLastPaidSpinDate(today); 
    }

    if (spinsAvailable > 0) {
      startSpinProcess();
      setSpinsAvailable(prev => prev - 1);
    } else {
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
        setDailyPaidSpinsUsed(prev => prev + 1);
      } else {
        setShowPaymentModal(true);
      }
    }
  }, [
    isClient, isSpinning, startSpinProcess, spinsAvailable, userBalance, toast, addTransaction,
    dailyPaidSpinsUsed, lastPaidSpinDate, getCurrentPaidSpinCost, user, router
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
     if (!user) {
        toast({ title: "Login Required", description: "Please log in to get tips." });
        return;
    }
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
  }, [spinHistory, toast, user]);

  const handlePaymentConfirm = useCallback(() => {
    if (!user) return; // Should not happen if modal is shown only to logged in users
    setShowPaymentModal(false);
    addTransaction({ type: 'debit', amount: SPIN_REFILL_PRICE, description: `Purchased ${MAX_SPINS_IN_BUNDLE} Spins Bundle` });
    setSpinsAvailable(MAX_SPINS_IN_BUNDLE); 
    toast({
      title: "Spins Purchased!",
      description: `You now have ${MAX_SPINS_IN_BUNDLE} spins. Happy spinning!`,
      variant: "default",
    });
  }, [toast, addTransaction, user]);

  if (!isClient || authLoading) {
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

  if (user && user.email === ADMIN_EMAIL && showAdminChoiceView) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-4">
        <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">Admin Portal Access</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              Welcome, {user.displayName || user.email}. Select your destination.
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

      {isClient && user && (
        <div className="w-full max-w-2xl flex justify-center my-4">
          <Card className="py-3 px-6 inline-flex items-center gap-3 shadow-md bg-primary-foreground/20 rounded-lg backdrop-blur-sm">
            <DollarSign className="h-7 w-7 text-primary" />
            <span className="text-xl font-semibold text-foreground">
              Balance: <span className="font-bold text-primary">₹{userBalance.toFixed(2)}</span>
            </span>
          </Card>
        </div>
      )}
      
      {!user && isClient && (
         <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center my-8">
            <ShieldAlert className="h-12 w-12 text-primary mx-auto mb-3" />
            <CardTitle className="text-2xl font-bold">Welcome Guest!</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Please log in to play Spinify, track your balance, and win prizes!
            </CardDescription>
            <Button onClick={() => router.push('/login')} className="mt-6">
              Login to Play
            </Button>
          </Card>
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
        {user && (
            <>
                <div className="text-center text-lg font-semibold text-foreground mb-1 p-2 bg-primary-foreground/20 rounded-md shadow">
                    {spinsAvailable > 0 
                    ? <>Spins Left: <span className="font-bold text-primary">{spinsAvailable}</span> / {MAX_SPINS_IN_BUNDLE} (Free/Bundled)</>
                    : <>Next Spin Cost: <span className="font-bold text-primary">₹{costOfNextPaidSpin.toFixed(2)}</span> (from balance). Paid today: {dailyPaidSpinsUsed}</>
                    }
                </div>
                <SpinButton 
                    onClick={handleSpinClick} 
                    disabled={isSpinning || !user || (spinsAvailable <=0 && !canAffordNextPaidSpin && !showBuyBundleButton)} 
                    isLoading={isSpinning}
                    spinsAvailable={spinsAvailable}
                    forceShowBuyButton={showBuyBundleButton}
                />
            </>
        )}
          <PrizeDisplay prize={currentPrize} />
        </div>

        <TipGeneratorButton onClick={handleGenerateTip} disabled={tipLoading || isSpinning || !user} />
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
        spinsToGet={MAX_SPINS_IN_BUNDLE}
      />
    </div>
  );
}
