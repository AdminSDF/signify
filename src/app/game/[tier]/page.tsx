
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, DollarSign, ShieldAlert } from 'lucide-react';
import SpinifyGameHeader from '@/components/SpinifyGameHeader';
import SpinWheel from '@/components/SpinWheel';
import type { SegmentConfig } from '@/lib/appConfig';
import PrizeDisplay from '@/components/PrizeDisplay';
import GameAssistant from '@/components/GameAssistant';
import { useSound } from '@/hooks/useSound';
import { useToast } from "@/hooks/use-toast";
import type { GenerateTipInput } from '@/ai/flows/spinify-tip-generator';
import { getAiTipAction } from '@/app/actions/generateTipAction';
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
import { Steps } from 'intro.js-react';

const ConfettiRain = dynamic(() => import('@/components/ConfettiRain').then(mod => mod.ConfettiRain), { ssr: false });
const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });

// This function determines the spin outcome based on the probabilities defined in the admin panel.
const getSpinResult = (segments: SegmentConfig[]): { winningSegment: SegmentConfig | undefined } => {
  if (!segments || segments.length === 0) {
    return { winningSegment: undefined };
  }

  // Calculate the sum of all probabilities from the configuration.
  const totalProbability = segments.reduce((sum, segment) => sum + (segment.probability || 0), 0);

  // If no probabilities are set at all, fall back to picking a random segment to avoid errors.
  if (totalProbability <= 0) {
    console.warn("No probabilities set for any segment. Falling back to equal distribution.");
    return { winningSegment: segments[Math.floor(Math.random() * segments.length)] };
  }

  // Generate a random number between 0 and the total probability.
  let random = Math.random() * totalProbability;

  // Determine the winning segment based on its weighted probability.
  // We iterate through the segments and subtract their probability from our random number.
  // The segment that makes the random number drop to 0 or below is the winner.
  for (const segment of segments) {
    random -= (segment.probability || 0);
    if (random <= 0) {
      return { winningSegment: segment };
    }
  }

  // Fallback in case of floating point inaccuracies, though it's highly unlikely.
  // This ensures a segment is always returned if probabilities are valid.
  return { winningSegment: segments[segments.length - 1] };
};


export default function GamePage() {
  const { user, userData, loading: authLoading, appSettings } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tier = params.tier as string;

  const [wheelConfig, setWheelConfig] = useState<WheelTierConfig | null>(null);
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [targetSegmentIndex, setTargetSegmentIndex] = useState<number | null>(null);
  const [currentPrize, setCurrentPrize] = useState<SegmentConfig | null>(null);
  const pendingPrizeRef = useRef<SegmentConfig | null>(null);
  const [spinHistory, setSpinHistory] = useState<GenerateTipInput['spinHistory']>([]);

  const [assistantMessage, setAssistantMessage] = useState<string | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(true);

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
  const [isTourOpen, setIsTourOpen] = useState(false);
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user && userData && !authLoading && userData.toursCompleted?.gamePage === false) {
      setTimeout(() => setIsTourOpen(true), 500);
    }
  }, [user, userData, authLoading]);

  const onTourExit = () => {
    setIsTourOpen(false);
    if (user) {
        updateUserData(user.uid, { 'toursCompleted.gamePage': true });
    }
  };

  const tourSteps = [
    {
      element: '[data-tour-id="balance-card"]',
      intro: 'This is your balance for the current game arena. Keep an eye on it!',
    },
    {
      element: '[data-tour-id="spin-wheel"]',
      intro: 'This is the main prize wheel. Click it to spin and test your luck!',
    },
    {
      element: '[data-tour-id="spin-cost"]',
      intro: 'Each spin costs a certain amount, which is shown here. Some spins might be free!',
    },
    {
      element: '[data-tour-id="prize-display"]',
      intro: 'After a spin, your prize will be displayed here. We hope you win big!',
    },
    {
      element: '[data-tour-id="game-assistant"]',
      intro: 'This is your Game Assistant! It will give you tips and encouragement as you play.',
    },
  ];
  
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
  
    const fetchAssistantMessage = useCallback(async (
        eventType: 'win' | 'loss' | 'encouragement' | 'initial',
        history: GenerateTipInput['spinHistory'],
        lastReward?: string
    ) => {
        if(!user) return;
        setIsAssistantLoading(true);
        try {
            const result = await getAiTipAction({ spinHistory: history, eventType, lastReward });
            if (result.tip) {
                setAssistantMessage(result.tip);
            } else if (result.error) {
                console.warn("Assistant error:", result.error);
                // Fail silently on the UI for a better user experience
            }
        } catch (e) {
            console.error("Failed to fetch assistant message:", e);
        } finally {
            setIsAssistantLoading(false);
        }
    }, [user]);

    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(() => {
            if (!isSpinning) { // Check if not spinning
                fetchAssistantMessage('encouragement', spinHistory);
            }
        }, 25000); // 25 seconds
    }, [isSpinning, spinHistory, fetchAssistantMessage]);

    // Initial message on load
    useEffect(() => {
        fetchAssistantMessage('initial', []);
    }, [fetchAssistantMessage]);

    // Reset idle timer whenever spin history changes (i.e., after a spin) or spin state changes
    useEffect(() => {
        if (user) {
          resetIdleTimer();
        }
        return () => {
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [spinHistory, resetIdleTimer, user]);


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
    
    resetIdleTimer();
    setCurrentPrize(null);

    let spinCost = 0;
    let isFreeSpin = false;

    if (tier === 'little' && spinsAvailable > 0) {
      isFreeSpin = true;
      const newSpins = spinsAvailable - 1;
      setSpinsAvailable(newSpins);
      await updateUserData(user.uid, { spinsAvailable: newSpins });
    } else {
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
    
    await logUserActivity(user.uid, user.email, 'spin');
    
    const betAmount = isFreeSpin ? 0 : spinCost;
    
    const { winningSegment } = getSpinResult(wheelConfig.segments);

    if (!winningSegment) {
        toast({ title: "Config Error", description: `Could not determine a spin outcome. The wheel might be misconfigured.`, variant: "destructive" });
        return;
    }
    
    const winAmount = betAmount * (winningSegment.multiplier ?? 0);
    const winningSegmentIndex = wheelConfig.segments.findIndex(s => s.id === winningSegment.id);

    if (winningSegmentIndex === -1) {
        toast({ title: "Internal Error", description: `Could not locate the winning segment on the wheel. Please contact support.`, variant: "destructive" });
        return;
    }
    
    const prizeForDisplay: SegmentConfig = { ...winningSegment, amount: winAmount };
    
    pendingPrizeRef.current = prizeForDisplay;

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

  }, [
    isClient, isSpinning, user, authLoading, userData, wheelConfig, tier, spinsAvailable,
    userBalance, dailyPaidSpinsUsed, lastPaidSpinDate, appSettings, resetIdleTimer,
    startSpinProcess, addTransaction, getLittleTierSpinCost, toast, router
  ]);

  const handleSpinComplete = useCallback(async (winningSegmentFromWheel: SegmentConfig) => {
    const prizeToDisplay = pendingPrizeRef.current;
    if (prizeToDisplay) {
      setCurrentPrize(prizeToDisplay);
    }
    setIsSpinning(false);
    
    if (!user || !userData || !prizeToDisplay) return;

    const newSpinRecordForAI = { spinNumber: spinHistory.length + 1, reward: prizeToDisplay.amount ? `₹${prizeToDisplay.amount.toFixed(2)}` : prizeToDisplay.text };
    const updatedHistory = [...spinHistory, newSpinRecordForAI];
    setSpinHistory(updatedHistory);
    
    const isWin = prizeToDisplay.multiplier > 0;
    fetchAssistantMessage(isWin ? 'win' : 'loss', updatedHistory, newSpinRecordForAI.reward);
    
    if (prizeToDisplay.amount && prizeToDisplay.amount > 0) {
      playSound('win');
      if (prizeToDisplay.amount >= 10) { 
        setShowConfetti(true); 
        setTimeout(() => setShowConfetti(false), 4000); 
      }
    } else {
      playSound('tryAgain');
    }
  }, [playSound, spinHistory, user, userData, fetchAssistantMessage]);
  
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

  // New check for wheel configuration
  if (!wheelConfig.segments || wheelConfig.segments.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Wheel Configuration Error</AlertTitle>
          <AlertDescription>
            This wheel has no prizes configured. An admin needs to add prize segments before it can be played.
          </AlertDescription>
          {userData?.isAdmin && (
            <Button onClick={() => router.push('/admin')} className="mt-4">
              Go to Admin Panel
            </Button>
          )}
        </Alert>
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
    <>
      <Steps
        enabled={isTourOpen}
        steps={tourSteps}
        initialStep={0}
        onExit={onTourExit}
        options={{
          tooltipClass: 'custom-tooltip-class',
          doneLabel: 'Got It!',
          nextLabel: 'Next →',
          prevLabel: '← Back',
        }}
      />
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
          <div data-tour-id="balance-card" className="w-full max-w-md flex justify-center my-6">
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
          <div data-tour-id="spin-wheel">
            <SpinWheel
              segments={wheelConfig.segments}
              onSpinComplete={handleSpinComplete}
              targetSegmentIndex={targetSegmentIndex}
              isSpinning={isSpinning}
              onClick={user && !isSpinning ? handleSpinClick : undefined}
            />
          </div>
          
          <div className="my-2 w-full flex flex-col items-center gap-4">
            {user && (
                <div data-tour-id="spin-cost" className="text-center text-lg font-semibold text-foreground mb-1 p-2 bg-primary-foreground/20 rounded-md shadow">
                    {tier === 'little' && spinsAvailable > 0
                        ? <>Free Spins Left: <span className="font-bold text-primary">{spinsAvailable}</span> / {appSettings.maxSpinsInBundle}</>
                        : <>Next Spin Cost: <span className="font-bold text-primary">₹{costOfNextPaidSpin.toFixed(2)}</span></>
                    }
                    {tier === 'little' && spinsAvailable <= 0 && <>. Paid today: {dailyPaidSpinsUsed}</>}
                </div>
            )}
              <div data-tour-id="prize-display" className="min-h-[140px]">
                <PrizeDisplay prize={currentPrize} />
              </div>
          </div>
          
          <GameAssistant
            isLoading={isAssistantLoading}
            message={assistantMessage}
          />

        </main>

        <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onConfirm={handlePaymentConfirm} upiId={appSettings.upiId} appName={appSettings.appName} amount={paymentModalAmount} tierName={wheelConfig.name} />
      </div>
    </>
  );
}
