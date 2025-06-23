
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldAlert } from 'lucide-react';
import type { WheelTierConfig } from '@/lib/appConfig';
import { updateUserData } from '@/lib/firebase';
import { Steps } from 'intro.js-react';

export default function GameSelectionPage() {
  const { user, userData, loading, appSettings } = useAuth();
  const router = useRouter();
  
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    if (user && userData && !loading && userData.toursCompleted?.welcome === false) {
        // A small delay to ensure the DOM is ready for the tour
        setTimeout(() => setIsTourOpen(true), 500);
    }
  }, [user, userData, loading]);

  const onTourExit = () => {
    setIsTourOpen(false);
    if (user) {
        updateUserData(user.uid, { 'toursCompleted.welcome': true });
    }
  };

  const tourSteps = [
    {
      element: '[data-tour-id="page-title"]',
      intro: '<strong>Welcome to Spinify!</strong> 👋<br/>This is your main dashboard where you can choose a game to play.',
    },
    {
      element: '[data-tour-id="game-cards-grid"]',
      intro: 'Here you can see the different game arenas. Each has different stakes and prizes.',
    },
    {
      element: '[data-tour-id="game-card-little"]',
      intro: 'This is the "Little Lux" arena. It\'s great for beginners with smaller bets and frequent wins!',
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

  const wheelConfigs = appSettings.wheelConfigs;

  const renderCard = (config: WheelTierConfig) => (
     <Link href={`/game/${config.id}`} passHref key={config.id}>
      <Card data-tour-id={`game-card-${config.id}`} className={`h-full flex flex-col justify-between text-center shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 ${config.themeClass} border-primary border-2`}>
        <CardHeader>
          <Image src={appSettings.logoUrl} alt={`${config.name} Logo`} width={64} height={64} className="h-16 w-16 mx-auto animate-glow-pulse rounded-full" />
          <CardTitle className="text-3xl font-bold text-primary mt-4">{config.name}</CardTitle>
          <CardDescription className="text-muted-foreground mt-1 text-base">{config.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full text-lg">Play Now <ArrowRight className="ml-2 h-5 w-5" /></Button>
        </CardContent>
      </Card>
    </Link>
  );

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
      <div className="flex-grow flex flex-col items-center justify-center p-4 space-y-8">
        <div data-tour-id="page-title" className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground animate-glow-pulse font-headline">
            Choose Your Arena
          </h1>
          <p className="text-lg text-muted-foreground mt-2">Select a wheel and spin to win!</p>
        </div>

        <div data-tour-id="game-cards-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-6xl">
          {wheelConfigs.little && renderCard(wheelConfigs.little)}
          {wheelConfigs.big && renderCard(wheelConfigs.big)}
          {wheelConfigs['more-big'] && renderCard(wheelConfigs['more-big'])}
        </div>
      </div>
    </>
  );
}
