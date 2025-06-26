
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, DollarSign, Lock, ShieldAlert } from 'lucide-react';
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
  arrayUnion,
  arrayRemove
} from '@/lib/firebase';
import { Steps } from 'intro.js-react';
import { UserDocument } from '@/lib/firebase';
import { AppSettings } from '@/lib/appConfig';


const ConfettiRain = dynamic(() => import('@/components/ConfettiRain').then(mod => mod.ConfettiRain), { ssr: false });
const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });


const determineSpinOutcome = (
  user: UserDocument,
  appSettings: AppSettings,
  segments: SegmentConfig[]
): { winningSegment: SegmentConfig, isWin: boolean } => {
  
  // 1. Calculate effective win rate
  let effectiveWinRate = appSettings.defaultWinRate;
  
  // Check for manual override first
  if (typeof user.manualWinRateOverride === 'number' && user.manualWinRateOverride !== null) {
      effectiveWinRate = user.manualWinRateOverride;
  } else {
      // Check tag-based rules, sorted by priority
      const sortedRules = [...appSettings.winRateRules].sort((a, b) => a.priority - b.priority);
      for (const rule of sortedRules) {
          if ((user.tags || []).includes(rule.tag)) {
              effectiveWinRate = rule.rate;
              break; // Stop at the first matching rule with highest priority
          }
      }
  }

  // 2. Decide if it's a win or loss
  const isWin = Math.random() < effectiveWinRate;

  // 3. Select a segment based on the outcome
  const winningSegments = segments.filter(s => s.amount > 0);
  const losingSegments = segments.filter(s => s.amount <= 0);

  let chosenSegment: SegmentConfig;

  if (isWin) {
    if (winningSegments.length > 0) {
      chosenSegment = winningSegments[Math.floor(Math.random() * winningSegments.length)];
    } else {
      // Edge case: No winning segments defined, so it's a loss
      chosenSegment = losingSegments[Math.floor(Math.random() * losingSegments.length)];
    }
  } else {
    if (losingSegments.length > 0) {
      chosenSegment = losingSegments[Math.floor(Math.random() * losingSegments.length)];
    } else {
      // Edge case: No losing segments defined, so it's a win
      chosenSegment = winningSegments[Math.floor(Math.random() * winningSegments.length)];
    }
  }
  
  if (!chosenSegment) {
    // Ultimate fallback
    return { winningSegment: segments[0], isWin: segments[0].amount > 0 };
  }

  return { winningSegment: chosenSegment, isWin: chosenSegment.amount > 0 };
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
  const pendingPrizeRef = useRef<{ prize: SegmentConfig, cost: number, isWin: boolean } | null>(null);
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

  // Live Activity Tracking
  useEffect(() => {
    if (!user) return;

    // Set user as online and in the current game when component mounts
    updateUserData(user.uid, {
      isOnline: true,
      currentGame: tier,
      lastActive: Timestamp.now()
    }).catch(err => console.error("Failed to set user as online:", err));

    // Set up a heartbeat to update lastActive every 2 minutes
    const heartbeatInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateUserData(user.uid, { lastActive: Timestamp.now() })
          .catch(err => console.warn("Heartbeat update failed:", err));
      }
    }, 120000); // 2 minutes

    // Cleanup function on component unmount
    return () => {
      clearInterval(heartbeatInterval);
      // Set user as offline when they leave the game
      updateUserData(user.uid, { isOnline: false, currentGame: null })
        .catch(err => console.error("Failed to set user as offline:", err));
    };
  }, [user, tier]);

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
      if (config.isLocked) {
        toast({
            title: "Arena Locked",
            description: "Playing and withdrawals are disabled for this arena.",
            variant: "destructive"
        });
      }
    } else if (!authLoading) {
      router.push('/');
    }
  }, [tier, router, appSettings, authLoading, toast]);

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
    amount: number; // Net amount
    description: string;
    spinDetails: { betAmount: number; winAmount: number; };
    balanceBefore: number;
    balanceAfter: number;
  }) => {
    if (!user) return;
    try {
      await addTransactionToFirestore({
        userEmail: user.email,
        type: details.amount >= 0 ? 'credit' : 'debit',
        amount: Math.abs(details.amount),
        description: details.description,
        status: 'completed',
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
    
    if (wheelConfig.isLocked) {
      toast({ title: "Arena Locked", description: "This arena is temporarily closed for playing.", variant: "destructive" });
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
    } else {
        spinCost = (tier === 'little') ? getLittleTierSpinCost(dailyPaidSpinsUsed) : (wheelConfig.costSettings.baseCost || 0);

        if (userBalance < spinCost) {
            setPaymentModalAmount(spinCost > appSettings.minAddBalanceAmount ? spinCost : appSettings.minAddBalanceAmount);
            setShowPaymentModal(true);
            return;
        }
    }
    
    // --- IMMEDIATE DEDUCTION FROM UI STATE ---
    if (isFreeSpin) {
        setSpinsAvailable(prev => prev - 1);
    } else {
        setUserBalance(prev => prev - spinCost);
        if (tier === 'little') {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const newDailySpinsUsed = (lastPaidSpinDate === todayStr ? dailyPaidSpinsUsed : 0) + 1;
            setDailyPaidSpinsUsed(newDailySpinsUsed);
            setLastPaidSpinDate(todayStr);
        }
    }
    
    await logUserActivity(user.uid, user.email, 'spin');
    
    // --- NEW DYNAMIC SPIN LOGIC ---
    const { winningSegment, isWin } = determineSpinOutcome(userData, appSettings, wheelConfig.segments);

    if (!winningSegment) {
        toast({ title: "Config Error", description: `Could not determine a spin outcome. The wheel might be misconfigured.`, variant: "destructive" });
        return;
    }
    
    const winningSegmentIndex = wheelConfig.segments.findIndex(s => s.id === winningSegment.id);

    if (winningSegmentIndex === -1) {
        toast({ title: "Internal Error", description: `Could not locate the winning segment on the wheel. Please contact support.`, variant: "destructive" });
        return;
    }
    
    // Store the result and cost. The cost is now for logging purposes.
    pendingPrizeRef.current = { prize: winningSegment, cost: isFreeSpin ? 0 : spinCost, isWin };
    
    // Start the animation.
    startSpinProcess(winningSegmentIndex);

  }, [
    isClient, isSpinning, user, authLoading, userData, wheelConfig, tier, spinsAvailable,
    userBalance, dailyPaidSpinsUsed, lastPaidSpinDate, appSettings, resetIdleTimer,
    startSpinProcess, getLittleTierSpinCost, toast, router
  ]);

  const handleSpinComplete = useCallback(async () => {
    setIsSpinning(false);
    const result = pendingPrizeRef.current;
    if (!result || !user || !userData) {
      pendingPrizeRef.current = null;
      return;
    }
    
    const { prize, cost, isWin } = result;
    const winAmount = prize.amount ?? 0;
    
    const balanceAfterDeduction = userBalance; // Already reflects cost deduction from UI state
    const finalBalance = balanceAfterDeduction + winAmount;
    const balanceBeforeSpin = balanceAfterDeduction + cost;

    // Prepare updates for Firestore
    const totalSpinsPlayed = (userData.totalSpinsPlayed ?? 0) + 1;
    const totalWins = (userData.totalWins ?? 0) + (isWin ? 1 : 0);
    const recentSpinHistory = [...(userData.recentSpinHistory || []), isWin ? 'win' : 'loss'].slice(-20); // Keep last 20

    const updates: { [key: string]: any } = {
        [`balances.${tier}`]: finalBalance,
        totalSpinsPlayed,
        totalWins,
        recentSpinHistory,
        totalWinnings: (userData.totalWinnings ?? 0) + winAmount,
        lastActive: Timestamp.now(),
    };

    // --- AUTOMATION & TAGGING LOGIC ---
    const userTags = new Set(userData.tags || []);
    // Remove 'new' tag after 50 spins
    if (userTags.has('new') && totalSpinsPlayed > 50) {
        updates.tags = arrayRemove('new');
    }
    
    // Auto-tagging for 'high-loss' users
    const winRatio = totalWins / totalSpinsPlayed;
    if (totalSpinsPlayed > 20) { // Check only after a reasonable number of spins
        if (winRatio < 0.25 && !userTags.has('high-loss')) {
            // Add 'high-loss' tag if win ratio is below 25%
            updates.tags = arrayUnion('high-loss');
        } else if (winRatio > 0.35 && userTags.has('high-loss')) {
            // Remove 'high-loss' tag if win ratio recovers above 35%
            updates.tags = arrayRemove('high-loss');
        }
    }
    
    if (cost === 0) { // It was a free spin
        updates.spinsAvailable = spinsAvailable; // `spinsAvailable` state was already updated
    }

    if (cost > 0 && tier === 'little') { // It was a paid 'little' spin
        updates.dailyPaidSpinsUsed = dailyPaidSpinsUsed; // state was already updated
        updates.lastPaidSpinDate = lastPaidSpinDate; // state was already updated
    }
        
    try {
        // Single write to Firestore with all consolidated changes.
        await updateUserData(user.uid, updates);

        await addTransaction({
            amount: winAmount - cost, // Net change
            description: `Spin: Bet ₹${cost.toFixed(2)}, Won ₹${winAmount.toFixed(2)}`,
            spinDetails: { betAmount: cost, winAmount },
            balanceBefore: balanceBeforeSpin,
            balanceAfter: finalBalance,
        });
        
        // Sync UI state with final DB value
        setUserBalance(finalBalance);
        
        setCurrentPrize(prize);
        
        if (isWin) {
            toast({ title: "Congratulations!", description: `You won ₹${winAmount.toFixed(2)}.` });
            playSound('win');
            if (winAmount >= 10) { 
                setShowConfetti(true); 
                setTimeout(() => setShowConfetti(false), 4000);
            }
        } else {
            toast({ title: "Better luck next time!", description: "You didn't win a prize. Try again!" });
            playSound('tryAgain');
        }

        const newSpinRecordForAI = { spinNumber: spinHistory.length + 1, reward: prize.amount ? `₹${prize.amount.toFixed(2)}` : prize.text };
        const updatedHistory = [...spinHistory, newSpinRecordForAI];
        setSpinHistory(updatedHistory);
        fetchAssistantMessage(isWin ? 'win' : 'loss', updatedHistory, newSpinRecordForAI.reward);

    } catch (error) {
        console.error("Error during spin completion:", error);
        toast({ title: "Sync Error", description: "There was an issue saving your spin result. Please refresh.", variant: "destructive" });
    } finally {
        pendingPrizeRef.current = null;
    }
  }, [
    user, userData, tier, userBalance, dailyPaidSpinsUsed, spinsAvailable, lastPaidSpinDate,
    playSound, spinHistory, fetchAssistantMessage, toast, addTransaction
  ]);
  
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
           <Button asChild variant="outline">
             <Link href="/">
               <ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection
             </Link>
           </Button>
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
           {wheelConfig.isLocked && (
            <Alert variant="destructive" className="w-full max-w-lg mb-4 text-center">
              <Lock className="h-4 w-4" />
              <AlertTitle>This Arena is Locked</AlertTitle>
              <AlertDescription>
                Playing and withdrawals are temporarily disabled. You can still add funds to your balance.
              </AlertDescription>
            </Alert>
          )}
          <div data-tour-id="spin-wheel">
            <SpinWheel
              segments={wheelConfig.segments}
              onSpinComplete={handleSpinComplete}
              targetSegmentIndex={targetSegmentIndex}
              isSpinning={isSpinning}
              onClick={user && !isSpinning && !wheelConfig.isLocked ? handleSpinClick : undefined}
              logoUrl={appSettings.logoUrl}
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
