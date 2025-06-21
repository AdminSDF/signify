
"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Gem, Crown, Rocket, ShieldAlert } from 'lucide-react';
import type { WheelTierConfig } from '@/lib/appConfig';

export default function GameSelectionPage() {
  const { user, loading, appSettings } = useAuth();
  const router = useRouter();

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

  const renderCard = (config: WheelTierConfig, icon: React.ReactNode) => (
     <Link href={`/game/${config.id}`} passHref key={config.id}>
      <Card className={`h-full flex flex-col justify-between text-center shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 cursor-pointer ${config.themeClass} border-primary border-2`}>
        <CardHeader>
          {icon}
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
    <div className="flex-grow flex flex-col items-center justify-center p-4 space-y-8">
      <div className="text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-primary-foreground animate-glow-pulse font-headline">
          Choose Your Arena
        </h1>
        <p className="text-lg text-muted-foreground mt-2">Select a wheel and spin to win!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-6xl">
        {wheelConfigs.little && renderCard(wheelConfigs.little, <Gem className="h-16 w-16 mx-auto text-primary" />)}
        {wheelConfigs.big && renderCard(wheelConfigs.big, <Crown className="h-16 w-16 mx-auto text-primary" />)}
        {wheelConfigs['more-big'] && renderCard(wheelConfigs['more-big'], <Rocket className="h-16 w-16 mx-auto text-primary" />)}
      </div>
    </div>
  );
}
