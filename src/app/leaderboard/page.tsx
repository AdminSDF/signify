
"use client";

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Gamepad2, Users } from 'lucide-react';
import Link from 'next/link';

export default function LeaderboardPage() {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl bg-card text-card-foreground rounded-lg">
        <CardHeader className="items-center text-center border-b pb-6">
          <Trophy className="h-16 w-16 text-primary mb-3" />
          <CardTitle className="text-4xl font-bold font-headline text-primary">
            Leaderboard & Tournaments
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg mt-1">
            Compete, Conquer, and Claim Your Glory!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <Image
            src="https://placehold.co/600x300.png"
            alt="Leaderboard placeholder"
            width={600}
            height={300}
            className="rounded-md mb-6 shadow-md"
            data-ai-hint="gaming competition"
          />
          <h3 className="text-2xl font-semibold text-accent mb-3">Coming Soon!</h3>
          <p className="text-muted-foreground mb-6">
            Get ready to climb the ranks and participate in exciting tournaments!
            We are working hard to bring you a thrilling competitive experience.
            Stay tuned for updates.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="p-4 border rounded-lg bg-muted/30 flex flex-col items-center">
              <Users className="h-10 w-10 text-primary mb-2" />
              <p className="font-semibold text-lg">Global Rankings</p>
              <p className="text-xs text-muted-foreground">See how you stack up!</p>
            </div>
            <div className="p-4 border rounded-lg bg-muted/30 flex flex-col items-center">
              <Gamepad2 className="h-10 w-10 text-primary mb-2" />
              <p className="font-semibold text-lg">Exciting Tournaments</p>
              <p className="text-xs text-muted-foreground">Win big prizes!</p>
            </div>
          </div>
          <Link href="/" passHref>
            <Button variant="default">
              Back to Game
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
