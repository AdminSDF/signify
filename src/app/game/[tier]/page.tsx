
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, DollarSign, ShieldAlert } from 'lucide-react';
import SpinifyGameHeader from '@/components/SpinifyGameHeader';
import SpinWheel, { type Segment } from '@/components/SpinWheel';
import PrizeDisplay from '@/components/PrizeDisplay';
import TipGeneratorButton from '@/components/TipGeneratorButton';
import { useSound } from '@/hooks/useSound';
import { useToast } from "@/hooks/use-toast";
import type { SpinHistory } from '@/ai/flows/spinify-tip-generator';
import { getAiTipAction, type TipGenerationResult } from '@/app/actions/generateTipAction';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { WheelTierConfig } from '@/lib/appConfig';
import {
  updateUserData,
  addTransactionToFirestore,
  Timestamp,
  logUserActivity,
} from '@/lib/firebase';

const ConfettiRain = dynamic(() => import('@/components/ConfettiRain').then(mod => mod.ConfettiRain), { ssr: false });
const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });

// This function determines the spin outcome based on the 60/40 rule
const getSpinResult = (betAmount: number): { winAmount: number; multiplier: number } => {
  const adminWinChance = 0.6; // 60%
  const random = Math.random();

  if (random <= adminWinChance) {
    return { winAmount: 0, multiplier: 0 }; // Admin wins (Loss)
  }

  // User wins, now determine the prize tier (Small: 70%, Medium: 20%, Big: 10% of wins)
  const winRandom = Math.random();
  if (winRandom <= 0.7) {
    return { winAmount: betAmount * 0.5, multiplier: 0.5 }; // Small Win
  }
  if (winRandom <= 0.9) { // 0.7 + 0.2
    return { winAmount: betAmount * 1.5, multiplier: 1.5 }; // Medium Win
  }
  return { winAmount: betAmount * 3, multiplier: 3 }; // Big Win
};


export default function GamePage() {
  const { user, userData, loading: authLoading, appSettings } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tier = params.tier as string;

  const [wheelConfig, setWheelConfig] = useState<WheelTierConfig | null>(null);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetSegmentIndex, setTargetSegmentIndex] = useState<number | null>(null);
  const [currentPrize, setCurrentPrize] = useState<Segment | null>(null);
  const [spinHistory, setSpinHistory] = useState<SpinHistory>([]);

  const [showTipModal, setShowTipModal] = useState(false);
  const [generatedTip, setGeneratedTip] = useState<string | null>(null);
  const [tipLoading, setTipLoading] = useState(false);
  const [tipError, setTipError] = useState<string | null>(null);

  const [showConfetti, setShowConfetti] = useState(false);
  const [spinsAvailable, setSpinsAvailable] = useState<number>(0);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalAmount, setPaymentModalAmount] = useState(0);

  const [dailyPaidSpinsUsed, setDailyPaidSpinsUsed] = useState<number>(0);
  const [lastPaidSpinDate, setLastPaidSpinDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

  const { playSound } = useSound();
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    const config = appSettings.wheelConfigs ? appSettings.wheelConfigs[tier] : null;
    if (config) {
      setWheelConfig(config);
    } else if (!authLoading) {
      router.push('/');
    }
  }, [tier, router, appSettings, authLoading]);

  useEffect(() => {
    if (wheelConfig?.themeClass) {
      document.documentElement.classList.add(wheelConfig.themeClass);
    }
    return () => {
      if (wheelConfig?.themeClass) {
        document.documentElement.classList.remove(wheelConfig.themeClass);
      }
    };
  }, [wheelConfig]);

  useEffect(() => {
    if (!user || authLoading || !userData) {
      return;
    }
    
    setUserBalance(userData.balances?.[tier] ?? 0);
    setSpinsAvailable(userData.spinsAvailable ?? 0);

    const todayStr = new Date().toLocaleDateString('en-CA');
    if (userData.lastPaidSpinDate === todayStr) {
      setDailyPaidSpinsUsed(userData.dailyPaidSpinsUsed ?? 0);
    } else {
      setDailyPaidSpinsUsed(0);
      if (user) {
        updateUserData(user.uid, { dailyPaidSpinsUsed: 0, lastPaidSpinDate: todayStr })
          .catch(err => console.warn("Failed to reset daily spins on date change:", err));
      }
    }
    setLastPaidSpinDate(userData.lastPaidSpinDate || todayStr);

  }, [isClient, user, userData, authLoading, tier]);


  const addTransaction = useCallback(async (details: {
    type: 'spin';
    amount: number; // Net amount
    description: string;
    status?: 'completed' | 'pending' | 'failed';
    spinDetails: { betAmount: number; winAmount: number; };
    balanceBefore: number;
    balanceAfter: number;
  }) => {
    if (!user) return;
    try {
      await addTransactionToFirestore({
        userEmail: user.email,
        type: 'spin',
        amount: details.amount,
        description: details.description,
        status: details.status || 'completed',
        tierId: tier,
        spinDetails: details.spinDetails,
        balanceBefore: details.balanceBefore,
        balanceAfter: details.balanceAfter,
      }, user.uid);
    } catch (error) {
      console.error("Error adding transaction to Firestore:", error);
      toast({ title: "Transaction Error", description: "Could not save transaction.", variant: "destructive" });
    }
  }, [user, toast, tier]);

  const startSpinProcess = useCallback((winningSegmentIndex: number) => {
    if (!wheelConfig || !wheelConfig.segments || wheelConfig.segments.length === 0) return;
    setIsSpinning(true);
    setCurrentPrize(null);
    setShowConfetti(false);
    playSound('spin');
    setTargetSegmentIndex(winningSegmentIndex);
  }, [playSound, wheelConfig]);

  const getLittleTierSpinCost = useCallback((spinsUsedToday: number): number => {
    const costSettings = wheelConfig?.costSettings;
    if (costSettings?.type !== 'tiered') return costSettings?.baseCost || 0;
    
    if (spinsUsedToday < (costSettings.tier1Limit || 0)) return costSettings.tier1Cost || 0;
    if (spinsUsedToday < (costSettings.tier2Limit || 0)) return costSettings.tier2Cost || 0;
    return costSettings.tier3Cost || 0;
  }, [wheelConfig]);

  const handleSpinClick = useCallback(async () => {
    if (!isClient || isSpinning || !user || authLoading || !userData || !wheelConfig) {
      if (!user && isClient && !authLoading) {
        toast({ title: "Login Required", description: "Please log in to spin.", variant: "destructive", action: <Button onClick={() => router.push('/login')}>Login</Button> });
      }
      return;
    }
    
    if (userData.isBlocked) {
      toast({ title: "Account Blocked", description: "Your account is blocked. Please contact support.", variant: "destructive" });
      return;
    }

    let spinCost = 0;
    let isFreeSpin = false;

    if (tier === 'little' && spinsAvailable > 0) {
      isFreeSpin = true;
      const newSpins = spinsAvailable - 1;
      setSpinsAvailable(newSpins);
      await updateUserData(user.uid, { spinsAvailable: newSpins });
    } else { // Paid spin logic
        if (tier === 'little') {
            let currentDailySpins = dailyPaidSpinsUsed;
            const todayString = new Date().toLocaleDateString('en-CA');
            if (lastPaidSpinDate !== todayString) {
                currentDailySpins = 0;
                setDailyPaidSpinsUsed(0);
                setLastPaidSpinDate(todayString);
            }
            spinCost = getLittleTierSpinCost(currentDailySpins);
        } else {
            spinCost = wheelConfig.costSettings.baseCost || 0;
        }

        if (userBalance < spinCost) {
            setPaymentModalAmount(spinCost > appSettings.minAddBalanceAmount ? spinCost : appSettings.minAddBalanceAmount);
            setShowPaymentModal(true);
            return;
        }
    }
    
    // Log spin activity
    await logUserActivity(user.uid, user.email, 'spin');
    
    // --- New Spin Logic ---
    const betAmount = isFreeSpin ? 0 : spinCost;
    const { winAmount, multiplier } = getSpinResult(betAmount);
    
    // Find all segments that match the winning multiplier
    const possibleSegments = wheelConfig.segments
      .map((segment, index) => ({ ...segment, originalIndex: index }))
      .filter(s => s.multiplier === multiplier);

    if (possibleSegments.length === 0) {
        toast({ title: "Config Error", description: `Could not find any segment with a multiplier of ${multiplier}x. Please check admin panel.`, variant: "destructive" });
        return;
    }

    // Randomly pick one of the possible segments
    const winningSegment = possibleSegments[Math.floor(Math.random() * possibleSegments.length)];
    const winningSegmentIndex = winningSegment.originalIndex;
    
    // Set the winning segment's amount dynamically for prize display
    const winningSegmentForDisplay: Segment = {
        ...winningSegment,
        amount: winAmount,
    };

    // Start UI updates and animations
    startSpinProcess(winningSegmentIndex);
    
    const balanceBefore = userBalance;
    const netChange = winAmount - betAmount;
    const balanceAfter = balanceBefore + netChange;
    setUserBalance(balanceAfter);
    
    const description = `Spin Result: ${netChange >= 0 ? '+' : ''}₹${netChange.toFixed(2)} (Bet: ₹${betAmount.toFixed(2)}, Win: ₹${winAmount.toFixed(2)})`;
    toast({ title: description });
    
    await addTransaction({
        type: 'spin',
        amount: netChange,
        description,
        spinDetails: { betAmount, winAmount },
        balanceBefore,
        balanceAfter,
    });
    
    const updates: { [key: string]: any } = {
        [`balances.${tier}`]: balanceAfter,
        totalSpinsPlayed: (userData.totalSpinsPlayed ?? 0) + 1,
        totalWinnings: (userData.totalWinnings ?? 0) + winAmount,
        lastActive: Timestamp.now()
    };

    if (!isFreeSpin && tier === 'little') {
        const newDailySpinsUsed = dailyPaidSpinsUsed + 1;
        setDailyPaidSpinsUsed(newDailySpinsUsed);
        updates.dailyPaidSpinsUsed = newDailySpinsUsed;
        updates.lastPaidSpinDate = new Date().toLocaleDateString('en-CA');
    }
    
    await updateUserData(user.uid, updates);

    // This needs to be stored locally because the spin complete function needs it
    setCurrentPrize(winningSegmentForDisplay);

  }, [
    isClient, isSpinning, user, authLoading, userData, wheelConfig, tier, spinsAvailable,
    userBalance, dailyPaidSpinsUsed, lastPaidSpinDate, appSettings, 
    startSpinProcess, addTransaction, getLittleTierSpinCost, toast, router
  ]);

  const handleSpinComplete = useCallback(async (winningSegmentFromWheel: Segment) => {
    // The actual prize was already determined in handleSpinClick, this is just for final UI updates
    const prizeToDisplay = currentPrize;
    setIsSpinning(false);
    
    if (!user || !userData || !prizeToDisplay) return;

    const newSpinRecordForAI = { spinNumber: spinHistory.length + 1, reward: prizeToDisplay.amount ? `₹${prizeToDisplay.amount}` : prizeToDisplay.text };
    setSpinHistory(prev => [...prev, newSpinRecordForAI]);
    
    if (prizeToDisplay.amount && prizeToDisplay.amount > 0) {
      playSound('win');
      if (prizeToDisplay.amount >= 10) { 
        setShowConfetti(true); 
        setTimeout(() => setShowConfetti(false), 4000); 
      }
    } else {
      playSound('tryAgain');
    }
  }, [playSound, spinHistory.length, user, userData, currentPrize]);
  
  const handleGenerateTip = useCallback(async () => {
    if (!user) { toast({ title: "Login Required", description: "Please log in." }); return; }
    setTipLoading(true); setTipError(null); setShowTipModal(true);
    const result: TipGenerationResult = await getAiTipAction(spinHistory);
    if (result.tip) setGeneratedTip(result.tip);
    else if (result.error) { setGeneratedTip(null); setTipError(result.error); toast({ variant: "destructive", title: "Tip Failed", description: result.error }); }
    setTipLoading(false);
  }, [spinHistory, toast, user]);

  const handlePaymentConfirm = useCallback(async () => {
    setShowPaymentModal(false);
    toast({ title: "Action Required", description: `Please go to your profile to add balance to the ${wheelConfig?.name} wallet.` });
    router.push('/profile');
  }, [router, toast, wheelConfig]);
  
  if (!isClient || authLoading || !userData || !wheelConfig) {
    return (
      <div className="flex flex-col items-center justify-center flex-grow p-4">
        <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg">
          <CardHeader className="text-center"><CardTitle className="text-3xl font-bold text-primary">Loading Game...</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center gap-4 mt-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userData.isBlocked) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Account Blocked</AlertTitle>
          <AlertDescription>
            Your account has been blocked due to suspicious activity. Please contact support for assistance.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const costOfNextPaidSpin = tier === 'little' ? getLittleTierSpinCost(dailyPaidSpinsUsed) : wheelConfig.costSettings.baseCost || 0;

  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-0 p-4 relative overflow-hidden">
      {showConfetti && <ConfettiRain />}
      
      <div className="w-full max-w-4xl flex items-center justify-between">
         <Link href="/" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection</Button>
        </Link>
        <SpinifyGameHeader />
        <div style={{width: '112px'}}></div> {/* Spacer */}
      </div>
      
      {isClient && user && (
        <div className="w-full max-w-md flex justify-center my-6">
            <Card className="p-4 sm:p-6 w-full shadow-xl bg-card/70 dark:bg-card/50 backdrop-blur-md border-2 border-primary/50 rounded-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-foreground/90 tracking-wider uppercase">{wheelConfig.name} Balance</p>
                        <p className="text-4xl sm:text-5xl font-bold text-white glow mt-1">
                            ₹{typeof userBalance === 'number' ? userBalance.toFixed(2) : '0.00'}
                        </p>
                    </div>
                    <DollarSign className="h-12 w-12 sm:h-16 sm:w-16 text-primary/70" />
                </div>
            </Card>
        </div>
      )}
      
      <main className="flex flex-col items-center w-full max-w-2xl">
        <SpinWheel
          segments={wheelConfig.segments}
          onSpinComplete={handleSpinComplete}
          targetSegmentIndex={targetSegmentIndex}
          isSpinning={isSpinning}
          onClick={user && !isSpinning ? handleSpinClick : undefined}
        />

        <div className="my-8 w-full flex flex-col items-center gap-4">
        {user && (
            <div className="text-center text-lg font-semibold text-foreground mb-1 p-2 bg-primary-foreground/20 rounded-md shadow">
                {tier === 'little' && spinsAvailable > 0
                    ? <>Free Spins Left: <span className="font-bold text-primary">{spinsAvailable}</span> / {appSettings.maxSpinsInBundle}</>
                    : <>Next Spin Cost: <span className="font-bold text-primary">₹{costOfNextPaidSpin.toFixed(2)}</span></>
                }
                {tier === 'little' && spinsAvailable <= 0 && <>. Paid today: {dailyPaidSpinsUsed}</>}
            </div>
        )}
          <PrizeDisplay prize={currentPrize} />
        </div>
        <TipGeneratorButton onClick={handleGenerateTip} disabled={tipLoading || isSpinning || !user} />
      </main>

      <TipModal isOpen={showTipModal} onClose={() => setShowTipModal(false)} tip={generatedTip} isLoading={tipLoading} error={tipError} onGenerateTip={handleGenerateTip} />
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onConfirm={handlePaymentConfirm} upiId={appSettings.upiId} appName={appSettings.appName} amount={paymentModalAmount} tierName={wheelConfig.name} />
    </div>
  );
}
