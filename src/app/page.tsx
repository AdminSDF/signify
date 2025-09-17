
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldAlert, Download } from 'lucide-react';
import type { RewardConfig } from '@/lib/appConfig';
import { updateUserData, getUserRewardData, UserRewardData, claimDailyReward } from '@/lib/firebase';
import { Steps } from 'intro.js-react';
import DailyRewardModal from '@/components/DailyRewardModal';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';

export default function GameSelectionPage() {
  const { user, userData, loading, appSettings } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { playSound } = useSound();
  
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
  const [userRewardData, setUserRewardData] = useState<UserRewardData | null>(null);
  const [isRewardClaimable, setIsRewardClaimable] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);


  const checkRewardStatus = useCallback(async () => {
    if (!user || !userData) return;
    try {
      const rewards = await getUserRewardData(user.uid);
      if (rewards) {
        setUserRewardData(rewards);
        const todayStr = new Date().toISOString().split('T')[0];
        if (rewards.lastClaimDate !== todayStr) {
          setIsRewardClaimable(true);
          setIsRewardModalOpen(true);
        }
      }
    } catch (error) {
      console.error("Error checking reward status:", error);
    }
  }, [user, userData]);

  useEffect(() => {
    if (user && userData && !loading) {
        if (userData.toursCompleted?.welcome === false) {
            setTimeout(() => setIsTourOpen(true), 500);
        }
        checkRewardStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userData, loading]);

  const handleClaimReward = async () => {
    if (!user) return;
    setIsClaiming(true);
    try {
      const result = await claimDailyReward(user.uid, appSettings.rewardConfig);
      toast({ title: "Reward Claimed!", description: result.message });
      playSound('levelup');
      setIsRewardModalOpen(false);
      setIsRewardClaimable(false);
      // Re-fetch user data to update balance/spins displayed elsewhere
      // This is often handled by the real-time listener in AuthContext, but a manual trigger can be useful
    } catch (error: any) {
      playSound('error');
      toast({ title: "Claim Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsClaiming(false);
    }
  };


  const onTourExit = () => {
    setIsTourOpen(false);
    if (user) {
        updateUserData(user.uid, { 'toursCompleted.welcome': true });
    }
  };
  
  const handlePlayClick = () => {
    playSound('click');
    router.push('/game/main');
  };

  const handleDownloadClick = () => {
    playSound('click');
    toast({
        title: "Coming Soon!",
        description: "The downloadable app is not yet available. Please check back later.",
    });
  }

  const tourSteps = [
    {
      element: '[data-tour-id="page-title"]',
      intro: '<strong>Welcome to Spinify!</strong> 👋<br/>This is your main dashboard where you can start playing.',
    },
    {
      element: '[data-tour-id="play-now-button"]',
      intro: 'Click here to enter the game arena and start winning!',
    },
    {
      element: '[data-tour-id="header-profile-button"]',
      intro: 'You can check your profile, balances, and transaction history from here. Enjoy the game and good luck! 🚀',
    },
  ];

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center">
          <ShieldAlert className="h-16 w-16 text-primary mx-auto mb-3" />
          <CardTitle className="text-2xl font-bold">Welcome to Spinify!</CardTitle>
          <CardDescription className="text-muted-foreground mt-2">
            Please log in to choose your game and start winning prizes!
          </CardDescription>
          <Button onClick={() => router.push('/login')} className="mt-6">Login to Play</Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Steps
        enabled={isTourOpen}
        steps={tourSteps}
        initialStep={0}
        onExit={onTourExit}
        options={{
          tooltipClass: 'custom-tooltip-class',
          doneLabel: 'Let\'s Play!',
          nextLabel: 'Next →',
          prevLabel: '← Back',
        }}
      />
      {isRewardClaimable && userRewardData && (
        <DailyRewardModal
          isOpen={isRewardModalOpen}
          onClose={() => setIsRewardModalOpen(false)}
          onClaim={handleClaimReward}
          isClaiming={isClaiming}
          rewardData={userRewardData}
          rewardConfig={appSettings.rewardConfig}
        />
      )}
      <div className="flex-grow flex flex-col items-center justify-center p-4 space-y-8">
        <div data-tour-id="page-title" className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground animate-glow-pulse font-headline">
            Welcome to Spinify
          </h1>
          <p className="text-lg text-muted-foreground mt-2">Click below to spin and win!</p>
        </div>

        <div className="flex flex-col items-center gap-4">
            <Button 
                data-tour-id="play-now-button"
                onClick={handlePlayClick}
                className="text-2xl font-bold h-16 px-12 rounded-full shadow-lg animate-pulse"
                size="lg"
                >
                Play Now
                <ArrowRight className="ml-3 h-6 w-6" />
            </Button>

            <Button 
                onClick={handleDownloadClick} 
                className="mt-4" 
                size="lg"
                variant="secondary"
                >
                <Download className="mr-2 h-5 w-5" />
                Download App
            </Button>
        </div>
      </div>
    </>
  );
}
