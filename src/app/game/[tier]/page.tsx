
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Home, Shield, DollarSign, ShieldAlert, ArrowLeft } from 'lucide-react';
import SpinifyGameHeader from '@/components/SpinifyGameHeader';
import SpinWheel, { type Segment } from '@/components/SpinWheel';
import PrizeDisplay from '@/components/PrizeDisplay';
import TipGeneratorButton from '@/components/TipGeneratorButton';
import { useSound } from '@/hooks/useSound';
import { useToast } from "@/hooks/use-toast";
import type { SpinHistory } from '@/ai/flows/spinify-tip-generator';
import { getAiTipAction, type TipGenerationResult } from '@/app/actions/generateTipAction';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { wheelConfigs, type WheelTier } from '@/lib/wheelConfig';
import {
  getUserData,
  updateUserData,
  addTransactionToFirestore,
  createUserData,
  Timestamp
} from '@/lib/firebase';

const ConfettiRain = dynamic(() => import('@/components/ConfettiRain').then(mod => mod.ConfettiRain), { ssr: false });
const TipModal = dynamic(() => import('@/components/TipModal'), { ssr: false });
const PaymentModal = dynamic(() => import('@/components/PaymentModal'), { ssr: false });

// Helper to select winning segment
const selectWinningSegmentByProbability = (segments: (Segment & { probability: number })[]): number => {
    const totalProbability = segments.reduce((sum, segment) => sum + (segment.probability || 0), 0);
    let random = Math.random() * totalProbability;
    for (let i = 0; i < segments.length; i++) {
        const segmentProbability = segments[i].probability || 0;
        if (segmentProbability === 0 && totalProbability > 0) continue;
        if (random < segmentProbability) return i;
        random -= segmentProbability;
    }
    const fallbackIndex = segments.findIndex(s => (s.probability || 0) > 0);
    return fallbackIndex !== -1 ? fallbackIndex : segments.length - 1;
};

export default function GamePage() {
  const { user, authLoading, appSettings, isAppConfigLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tier = params.tier as string;

  const [wheelConfig, setWheelConfig] = useState<WheelTier | null>(null);
  
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
  const [userDataLoading, setUserDataLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const config = wheelConfigs[tier];
    if (config) {
      setWheelConfig(config);
    } else {
      // Redirect if tier is invalid
      router.push('/');
    }
  }, [tier, router]);

  useEffect(() => {
    if (!isClient || !wheelConfig) return;

    if (authLoading || isAppConfigLoading) {
      if (!userDataLoading) setUserDataLoading(true);
      return;
    }

    if (!user) {
      setUserDataLoading(false);
      setUserBalance(0);
      setSpinsAvailable(0);
      setDailyPaidSpinsUsed(0);
      return;
    }

    const loadAndSyncUserData = async () => {
      if (!userDataLoading) setUserDataLoading(true);
      
      try {
        let data = await getUserData(user.uid);
        
        if (!data) {
          console.warn(`User document for ${user.uid} not found. Creating it.`);
          toast({ title: "Syncing Profile...", description: "Setting up your game profile." });
          await createUserData(user.uid, user.email, user.displayName, user.photoURL, appSettings);
          data = await getUserData(user.uid);
          if (!data) throw new Error("Failed to create and then retrieve user document.");
          toast({ title: "Profile Synced!", description: "Your game profile is ready. Welcome!" });
        }

        setUserBalance(data.balance ?? 0);
        setSpinsAvailable(data.spinsAvailable ?? 0);

        const todayStr = new Date().toLocaleDateString('en-CA');
        if (data.lastPaidSpinDate === todayStr) {
          setDailyPaidSpinsUsed(data.dailyPaidSpinsUsed ?? 0);
        } else {
          setDailyPaidSpinsUsed(0);
          updateUserData(user.uid, { dailyPaidSpinsUsed: 0, lastPaidSpinDate: todayStr })
            .catch(err => console.warn("Failed to reset daily spins on date change:", err));
        }
        setLastPaidSpinDate(data.lastPaidSpinDate || todayStr);

      } catch (error) {
        console.error("Error during user data loading/syncing:", error);
        toast({ title: "Data Sync Issue", description: "Could not load or sync game data. Defaults applied.", variant: "destructive" });
        setUserBalance(appSettings.initialBalanceForNewUsers);
        setSpinsAvailable(appSettings.maxSpinsInBundle);
      } finally {
        setUserDataLoading(false);
      }
    };

    loadAndSyncUserData();
  }, [isClient, user, authLoading, isAppConfigLoading, appSettings, toast, wheelConfig]);


  const addTransaction = useCallback(async (details: { type: 'credit' | 'debit'; amount: number; description: string; status?: 'completed' | 'pending' | 'failed' }) => {
    if (!user) return;
    try {
      await addTransactionToFirestore({
        userEmail: user.email,
        type: details.type,
        amount: details.amount,
        description: details.description,
        status: details.status || 'completed', 
      }, user.uid);
    } catch (error) {
      console.error("Error adding transaction to Firestore:", error);
      toast({ title: "Transaction Error", description: "Could not save transaction.", variant: "destructive" });
    }
  }, [user, toast]);

  const startSpinProcess = useCallback(() => {
    if (!wheelConfig) return;
    setIsSpinning(true);
    setCurrentPrize(null);
    setShowConfetti(false);
    playSound('spin');
    const winningIndex = selectWinningSegmentByProbability(wheelConfig.segments);
    setTargetSegmentIndex(winningIndex);
  }, [playSound, wheelConfig]);

  const getLittleTierSpinCost = useCallback((spinsUsedToday: number): number => {
    if (spinsUsedToday < appSettings.tier1Limit) return appSettings.tier1Cost;
    if (spinsUsedToday < appSettings.tier2Limit) return appSettings.tier2Cost;
    return appSettings.tier3Cost;
  }, [appSettings]);

  const handleSpinClick = useCallback(async () => {
    if (!isClient || isSpinning || !user || authLoading || isAppConfigLoading || userDataLoading || !wheelConfig) {
      if (!user && isClient && !authLoading && !isAppConfigLoading) {
        toast({ title: "Login Required", description: "Please log in to spin.", variant: "destructive", action: <Button onClick={() => router.push('/login')}>Login</Button> });
      }
      return;
    }

    let spinCost = 0;
    let costDescription = "Free Spin";

    if (tier === 'little') {
        if (spinsAvailable > 0) {
            startSpinProcess();
            const newSpins = spinsAvailable - 1;
            setSpinsAvailable(newSpins);
            updateUserData(user.uid, { spinsAvailable: newSpins }).catch(err => console.warn("Free Spin: Failed to update spins in Firestore:", err));
            return;
        } else {
            let currentDailySpins = dailyPaidSpinsUsed;
            const todayString = new Date().toLocaleDateString('en-CA');
            if (lastPaidSpinDate !== todayString) {
                currentDailySpins = 0;
                setDailyPaidSpinsUsed(0);
                setLastPaidSpinDate(todayString);
                updateUserData(user.uid, { dailyPaidSpinsUsed: 0, lastPaidSpinDate: todayString }).catch(err => console.warn("Failed to reset daily spins:", err));
            }
            spinCost = getLittleTierSpinCost(currentDailySpins);
            costDescription = `Spin Cost (Tier ${spinCost === appSettings.tier1Cost ? 1 : spinCost === appSettings.tier2Cost ? 2 : 3})`;
        }
    } else {
        spinCost = wheelConfig.baseCost;
        costDescription = `Spin Cost (${wheelConfig.name})`;
    }

    if (userBalance >= spinCost) {
        const newBalance = userBalance - spinCost;
        setUserBalance(newBalance);
        startSpinProcess();
        addTransaction({ type: 'debit', amount: spinCost, description: costDescription });
        toast({ title: `Spin Cost: -₹${spinCost.toFixed(2)}` });

        let userDataUpdate: Partial<any> = { balance: newBalance };
        if (tier === 'little') {
            const newDailySpinsUsed = dailyPaidSpinsUsed + 1;
            setDailyPaidSpinsUsed(newDailySpinsUsed);
            userDataUpdate.dailyPaidSpinsUsed = newDailySpinsUsed;
            userDataUpdate.lastPaidSpinDate = new Date().toLocaleDateString('en-CA');
        }
        updateUserData(user.uid, userDataUpdate).catch(err => {
            console.error("Paid Spin: Failed to update user data in Firestore:", err);
            toast({variant: "destructive", title: "Sync Error", description: "Could not save paid spin data."});
        });

    } else {
        setPaymentModalAmount(spinCost > appSettings.minAddBalanceAmount ? spinCost : appSettings.minAddBalanceAmount);
        setShowPaymentModal(true);
    }
  }, [
    isClient, isSpinning, user, authLoading, isAppConfigLoading, userDataLoading, wheelConfig, tier,
    spinsAvailable, userBalance, dailyPaidSpinsUsed, lastPaidSpinDate, appSettings, 
    startSpinProcess, addTransaction, getLittleTierSpinCost, toast, router
  ]);

  const handleSpinComplete = useCallback(async (winningSegment: Segment) => {
    setIsSpinning(false);
    setCurrentPrize(winningSegment);
    if (!user) return;

    const newSpinRecordForAI = { spinNumber: spinHistory.length + 1, reward: winningSegment.amount ? `₹${winningSegment.amount}` : winningSegment.text };
    setSpinHistory(prev => [...prev, newSpinRecordForAI]);

    let newBalance = userBalance;
    if (winningSegment.amount && winningSegment.amount > 0) {
      newBalance += (winningSegment.amount || 0);
      addTransaction({ type: 'credit', amount: winningSegment.amount, description: `Prize: ${winningSegment.text}` });
      toast({ title: "You Won!", description: `₹${winningSegment.amount.toFixed(2)} added.`, variant: "default" });
      playSound('win');
      if (winningSegment.amount >= 10) { setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); }
    } else {
      addTransaction({ type: 'debit', amount: 0, description: `Spin Result: ${winningSegment.text}` });
      if (winningSegment.text === 'Try Again') playSound('tryAgain'); else playSound('win');
    }
    setUserBalance(newBalance);

    try {
        const currentData = await getUserData(user.uid);
        await updateUserData(user.uid, {
            balance: newBalance,
            totalSpinsPlayed: (currentData?.totalSpinsPlayed ?? 0) + 1,
            totalWinnings: (currentData?.totalWinnings ?? 0) + (winningSegment.amount && winningSegment.amount > 0 ? winningSegment.amount : 0)
        });
    } catch (error) {
        console.error("Error updating total winnings/spins or balance after spin complete:", error);
        toast({variant: "destructive", title: "Sync Error", description: "Could not save spin summary to server."});
    }
  }, [playSound, spinHistory.length, toast, addTransaction, user, userBalance]);
  
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
    // This is simplified. In a real app, you would submit an add fund request.
    toast({ title: "Action Required", description: `Please go to your profile to add balance.` });
    router.push('/profile');
  }, [router, toast]);

  if (!isClient || authLoading || isAppConfigLoading || userDataLoading || !wheelConfig) {
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

  const costOfNextPaidSpin = tier === 'little' ? getLittleTierSpinCost(dailyPaidSpinsUsed) : wheelConfig.baseCost;

  return (
    <div className={`flex flex-col items-center justify-start min-h-screen pt-0 p-4 relative overflow-hidden ${wheelConfig.themeClass}`}>
      {showConfetti && <ConfettiRain />}
      
      <div className="w-full max-w-4xl flex items-center justify-between">
         <Link href="/" passHref>
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Selection</Button>
        </Link>
        <SpinifyGameHeader />
        <div className="w-28"></div> {/* Spacer */}
      </div>
      
      <div className="my-4 w-full max-w-3xl text-center">
        <ins className="adsbygoogle"
             style={{display:"inline-block",width:"728px",height:"90px"}}
             data-ad-client="ca-pub-1425274923062587"
             data-ad-slot="9499288281"></ins>
        <script dangerouslySetInnerHTML={{ __html: `(adsbygoogle = window.adsbygoogle || []).push({});` }} />
      </div>

      {isClient && user && (
        <div className="w-full max-w-md flex justify-center my-6">
          <Card className="py-4 px-6 sm:px-8 inline-flex flex-col items-center gap-2 shadow-lg bg-gradient-to-br from-primary-foreground/20 via-background/30 to-secondary/20 border-2 border-primary/50 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-primary-foreground/80 tracking-wider uppercase">Your Balance</span>
            </div>
            <span className="text-2xl sm:text-3xl font-bold text-primary-foreground glow">
              ₹{typeof userBalance === 'number' ? userBalance.toFixed(2) : '0.00'}
            </span>
          </Card>
        </div>
      )}
      
       <div className="my-4 w-full max-w-lg">
           <ins className="adsbygoogle"
               style={{display:"block"}}
               data-ad-format="auto"
               data-full-width-responsive={true}
               data-ad-client="ca-pub-1425274923062587"
               data-ad-slot="2603795181"></ins>
          <script dangerouslySetInnerHTML={{ __html: `(adsbygoogle = window.adsbygoogle || []).push({});` }}/>
        </div>


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
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onConfirm={handlePaymentConfirm} upiId={appSettings.upiId} appName={appSettings.appName} amount={paymentModalAmount} />
    </div>
  );
}
