
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Shield, DollarSign, ShieldAlert } from 'lucide-react';
import SpinifyGameHeader from '@/components/SpinifyGameHeader';
import SpinWheel, { type Segment } from '@/components/SpinWheel';
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
import { auth } from '@/lib/firebase'; // Import auth for currentUser metadata
import {
  getUserData,
  updateUserData,
  addTransactionToFirestore,
  Timestamp
} from '@/lib/firebase';


const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "jameafaizanrasool@gmail.com";

interface WheelSegmentWithProbability extends Segment {
  probability: number;
}

const wheelSegments: WheelSegmentWithProbability[] = [
  { id: 's100', text: '₹100', emoji: '💎', amount: 100, color: '300 80% 60%', textColor: '0 0% 100%', probability: 0.005 },
  { id: 's50',  text: '₹50',  emoji: '💰', amount: 50,  color: '270 80% 65%', textColor: '0 0% 100%', probability: 0.015 },
  { id: 's20',  text: '₹20',  emoji: '💸', amount: 20,  color: '0 80% 60%',   textColor: '0 0% 100%', probability: 0.08 },
  { id: 's10',  text: '₹10',  emoji: '💵', amount: 10,  color: '30 90% 55%',  textColor: '0 0% 0%',   probability: 0.10 },
  { id: 's5',   text: '₹5',   emoji: '🎈', amount: 5,   color: '60 90% 55%',  textColor: '0 0% 0%',   probability: 0.20 },
  { id: 's2',   text: '₹2',   emoji: '🤑', amount: 2,   color: '120 70% 55%', textColor: '0 0% 100%', probability: 0.27 },
  { id: 's1',   text: '₹1',   emoji: '🪙', amount: 1,   color: '180 70% 50%', textColor: '0 0% 100%', probability: 0.32 },
  { id: 's0',   text: 'Try Again', emoji: '🔁', amount: 0, color: '210 80% 60%', textColor: '0 0% 100%', probability: 0.01 },
];

export default function HomePage() {
  const { user, authLoading, appSettings, isAppConfigLoading } = useAuth();
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
  const [spinsAvailable, setSpinsAvailable] = useState<number>(0);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const [dailyPaidSpinsUsed, setDailyPaidSpinsUsed] = useState<number>(0);
  const [lastPaidSpinDate, setLastPaidSpinDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

  const { playSound } = useSound();
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  const [showAdminChoiceView, setShowAdminChoiceView] = useState(false);
  const [userDataLoading, setUserDataLoading] = useState(true);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (authLoading || isAppConfigLoading) {
      if (!userDataLoading) setUserDataLoading(true); 
      return;
    }

    if (!user) {
      setUserDataLoading(false);
      setUserBalance(0);
      setSpinsAvailable(0);
      setDailyPaidSpinsUsed(0);
      setShowAdminChoiceView(false);
      return;
    }

    if (!userDataLoading) setUserDataLoading(true); 

    getUserData(user.uid)
      .then(data => {
        if (data) {
          setUserBalance(data.balance);
          setSpinsAvailable(data.spinsAvailable);
          const todayStr = new Date().toLocaleDateString('en-CA');
          if (data.lastPaidSpinDate === todayStr) {
            setDailyPaidSpinsUsed(data.dailyPaidSpinsUsed);
          } else {
            setDailyPaidSpinsUsed(0);
            updateUserData(user.uid, { dailyPaidSpinsUsed: 0, lastPaidSpinDate: todayStr })
              .catch(err => console.warn("Failed to reset daily spins on date change:", err));
          }
          setLastPaidSpinDate(data.lastPaidSpinDate || todayStr);
          if (data.isAdmin && user.email === ADMIN_EMAIL) {
            setShowAdminChoiceView(true);
          } else {
            setShowAdminChoiceView(false);
          }
        } else {
          const firebaseCurrentUser = auth.currentUser; 
          const creationTime = firebaseCurrentUser?.metadata?.creationTime ? new Date(firebaseCurrentUser.metadata.creationTime).getTime() : 0;
          const lastSignInTime = firebaseCurrentUser?.metadata?.lastSignInTime ? new Date(firebaseCurrentUser.metadata.lastSignInTime).getTime() : 0;
          const isNewlyCreatedUserSession = creationTime === lastSignInTime && (Date.now() - creationTime < 15000); 

          if (isNewlyCreatedUserSession) {
            console.warn("User document not found for newly created user UID:", user.uid, "Using defaults. Document might be created shortly.");
          } else {
            console.error("User document not found in Firestore for UID:", user.uid, "This can happen if document creation failed or was deleted.");
            toast({ title: "Data Sync Issue", description: "Could not fully load game data. Defaults applied. Re-login if issues persist.", variant: "destructive" });
          }
          setUserBalance(appSettings.initialBalanceForNewUsers);
          setSpinsAvailable(appSettings.maxSpinsInBundle);
          setDailyPaidSpinsUsed(0);
          setShowAdminChoiceView(false); 
        }
      })
      .catch(error => {
        console.error("Error fetching user data:", error);
        toast({ title: "Error Loading User Data", description: "Could not load your game progress. Try refreshing.", variant: "destructive" });
        setUserBalance(0); 
        setSpinsAvailable(0);
        setShowAdminChoiceView(false);
      })
      .finally(() => {
        setUserDataLoading(false);
      });
  }, [isClient, user, authLoading, isAppConfigLoading, appSettings, toast]); 


  const addTransaction = useCallback(async (details: { type: 'credit' | 'debit'; amount: number; description: string; status?: 'completed' | 'pending' | 'failed' }) => {
    if (!user) return;
    try {
      await addTransactionToFirestore({
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

  const selectWinningSegmentByProbability = useCallback((segments: WheelSegmentWithProbability[]): number => {
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
    if (spinsUsedToday < appSettings.tier1Limit) return appSettings.tier1Cost;
    if (spinsUsedToday < appSettings.tier2Limit) return appSettings.tier2Cost;
    return appSettings.tier3Cost;
  }, [appSettings]);

  const handleSpinClick = useCallback(async () => {
    if (!isClient || isSpinning || !user || authLoading || isAppConfigLoading || userDataLoading) {
      if (!user && isClient && !authLoading && !isAppConfigLoading) {
        toast({ title: "Login Required", description: "Please log in to spin.", variant: "destructive", action: <Button onClick={() => router.push('/login')}>Login</Button> });
      }
      return;
    }

    let currentDailySpins = dailyPaidSpinsUsed;
    const todayString = new Date().toLocaleDateString('en-CA');

    if (lastPaidSpinDate !== todayString) {
      currentDailySpins = 0;
      setDailyPaidSpinsUsed(0);
      setLastPaidSpinDate(todayString);
      updateUserData(user.uid, { dailyPaidSpinsUsed: 0, lastPaidSpinDate: todayString })
        .catch(err => console.warn("Failed to reset daily spins on date change (background):", err));
    }

    if (spinsAvailable > 0) {
      startSpinProcess();
      const newSpins = spinsAvailable - 1;
      setSpinsAvailable(newSpins);
      updateUserData(user.uid, { spinsAvailable: newSpins })
        .catch(err => console.warn("Free Spin: Failed to update spins in Firestore:", err));
    } else {
      const costForThisSpin = getCurrentPaidSpinCost(currentDailySpins);
      if (userBalance >= costForThisSpin) {
        const newBalance = userBalance - costForThisSpin;
        const newDailySpinsUsed = currentDailySpins + 1;

        setUserBalance(newBalance);
        setDailyPaidSpinsUsed(newDailySpinsUsed);
        if (lastPaidSpinDate !== todayString) {
            setLastPaidSpinDate(todayString);
        }
        
        startSpinProcess();

        toast({ title: `Spin Cost: -₹${costForThisSpin.toFixed(2)}`, description: `Paid spins today: ${newDailySpinsUsed}.` });
        
        addTransaction({ type: 'debit', amount: costForThisSpin, description: `Spin Cost (Paid Tier ${costForThisSpin === appSettings.tier1Cost ? 1 : costForThisSpin === appSettings.tier2Cost ? 2 : 3})` });
        
        updateUserData(user.uid, {
          balance: newBalance,
          dailyPaidSpinsUsed: newDailySpinsUsed,
          lastPaidSpinDate: todayString
        }).catch(err => {
            console.error("Paid Spin: Failed to update user data in Firestore:", err);
            toast({variant: "destructive", title: "Sync Error", description: "Could not save paid spin data. Balance might be out of sync."});
        });

      } else {
        setShowPaymentModal(true);
      }
    }
  }, [
    isClient, isSpinning, user, authLoading, isAppConfigLoading, userDataLoading,
    spinsAvailable, userBalance, dailyPaidSpinsUsed, lastPaidSpinDate,
    appSettings, 
    startSpinProcess, addTransaction, getCurrentPaidSpinCost, 
    toast, router
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
    setUserBalance(newBalance); // Update local balance state immediately

    // Update totalSpinsPlayed and totalWinnings in Firestore
    // Fetch current values first to avoid overwriting if multiple spins happen quickly (though less likely with animation)
    try {
        const currentData = await getUserData(user.uid); // Fetch fresh data
        await updateUserData(user.uid, {
            balance: newBalance, // Ensure balance is also updated here if it wasn't in a prior step by handleSpinClick for paid spins
            totalSpinsPlayed: (currentData?.totalSpinsPlayed || 0) + 1,
            totalWinnings: (currentData?.totalWinnings || 0) + (winningSegment.amount && winningSegment.amount > 0 ? winningSegment.amount : 0)
        });
    } catch (error) {
        console.error("Error updating total winnings/spins or balance after spin complete:", error);
        toast({variant: "destructive", title: "Sync Error", description: "Could not save spin summary to server."});
    }

  }, [playSound, spinHistory.length, toast, addTransaction, user, userBalance]); // Added userBalance to dep array

  const handleGenerateTip = useCallback(async () => {
    if (!user) { toast({ title: "Login Required", description: "Please log in." }); return; }
    setTipLoading(true); setTipError(null); setShowTipModal(true);
    const result: TipGenerationResult = await getAiTipAction(spinHistory);
    if (result.tip) setGeneratedTip(result.tip);
    else if (result.error) { setGeneratedTip(null); setTipError(result.error); toast({ variant: "destructive", title: "Tip Failed", description: result.error }); }
    setTipLoading(false);
  }, [spinHistory, toast, user]);

  const handlePaymentConfirm = useCallback(async () => {
    if (!user) return;
    setShowPaymentModal(false);

    const costOfBundle = appSettings.spinRefillPrice;
    const spinsInBundle = appSettings.maxSpinsInBundle;

    if (costOfBundle > 0 && userBalance < costOfBundle) {
        toast({ title: "Insufficient Balance", description: `You need ₹${costOfBundle.toFixed(2)} to buy the spin bundle.`, variant: "destructive" });
        return;
    }

    const newSpins = (spinsAvailable < 0 ? 0 : spinsAvailable) + spinsInBundle;
    let newBalance = userBalance;

    if (costOfBundle > 0) {
        newBalance -= costOfBundle;
        addTransaction({ type: 'debit', amount: costOfBundle, description: `Purchased ${spinsInBundle} Spins Bundle`});
    } else {
        addTransaction({ type: 'credit', amount: 0, description: `Claimed free ${spinsInBundle} Spins Bundle`});
    }

    setUserBalance(newBalance);
    setSpinsAvailable(newSpins);

    await updateUserData(user.uid, { balance: newBalance, spinsAvailable: newSpins });

    toast({ title: "Spins Acquired!", description: `You now have ${newSpins} spins.`, variant: "default" });
  }, [toast, addTransaction, user, appSettings, userBalance, spinsAvailable]);


  if (!isClient || authLoading || isAppConfigLoading || userDataLoading) {
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
            <CardDescription className="text-muted-foreground mt-1">Welcome, {user.displayName || user.email}. Select destination.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 mt-4">
            <Button onClick={() => setShowAdminChoiceView(false)} size="lg" className="w-full"><Home className="mr-2 h-5 w-5" /> Go to Main App</Button>
            <Link href="/admin" passHref><Button variant="outline" size="lg" className="w-full"><Shield className="mr-2 h-5 w-5" /> Go to Admin Panel</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const costOfNextPaidSpin = getCurrentPaidSpinCost(dailyPaidSpinsUsed);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-0 p-4 relative overflow-hidden">
      {showConfetti && <ConfettiRain />}
      <SpinifyGameHeader />

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
              ₹{userBalance.toFixed(2)}
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


      {!user && isClient && (
         <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center my-8">
            <ShieldAlert className="h-12 w-12 text-primary mx-auto mb-3" />
            <CardTitle className="text-2xl font-bold">Welcome Guest!</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">Please log in to play Spinify, track your balance, and win prizes!</CardDescription>
            <Button onClick={() => router.push('/login')} className="mt-6">Login to Play</Button>
          </Card>
      )}

      <main className="flex flex-col items-center w-full max-w-2xl">
        <SpinWheel
          segments={wheelSegments}
          onSpinComplete={handleSpinComplete}
          targetSegmentIndex={targetSegmentIndex}
          isSpinning={isSpinning}
          onClick={user && !isSpinning ? handleSpinClick : undefined}
        />

        <div className="my-8 w-full flex flex-col items-center gap-4">
        {user && (
            <>
                <div className="text-center text-lg font-semibold text-foreground mb-1 p-2 bg-primary-foreground/20 rounded-md shadow">
                    {spinsAvailable > 0
                    ? <>Spins Left: <span className="font-bold text-primary">{spinsAvailable}</span> / {appSettings.maxSpinsInBundle} (Free/Bundled)</>
                    : <>Next Spin Cost: <span className="font-bold text-primary">₹{costOfNextPaidSpin.toFixed(2)}</span>. Paid today: {dailyPaidSpinsUsed}</>
                    }
                </div>
            </>
        )}
          <PrizeDisplay prize={currentPrize} />
        </div>
        <TipGeneratorButton onClick={handleGenerateTip} disabled={tipLoading || isSpinning || !user} />
      </main>

      <TipModal isOpen={showTipModal} onClose={() => setShowTipModal(false)} tip={generatedTip} isLoading={tipLoading} error={tipError} onGenerateTip={handleGenerateTip} />
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} onConfirm={handlePaymentConfirm} upiId={appSettings.upiId} appName={appSettings.appName} amount={appSettings.spinRefillPrice} spinsToGet={appSettings.maxSpinsInBundle}/>
    </div>
  );
}

    