
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Award, Medal, RefreshCw } from 'lucide-react';
import { getLeaderboardUsers, UserDocument } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";

const getTrophyColor = (rank: number) => {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-gray-400';
  if (rank === 3) return 'text-yellow-600';
  return 'text-muted-foreground';
};

const getTrophyIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-8 w-8" />;
  if (rank === 2) return <Award className="h-8 w-8" />;
  if (rank === 3) return <Medal className="h-8 w-8" />;
  return <span className="font-bold text-lg">{rank}</span>;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<UserDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const users = await getLeaderboardUsers(50); // Fetch top 50
        setLeaderboard(users);
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
        toast({ title: "Error", description: "Could not load the leaderboard.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [toast]);

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="flex-grow flex flex-col items-center p-4 space-y-8">
      <Card className="w-full max-w-4xl shadow-xl bg-card text-card-foreground rounded-lg">
        <CardHeader className="items-center text-center border-b pb-6">
          <Trophy className="h-16 w-16 text-primary mb-3" />
          <CardTitle className="text-4xl font-bold font-headline text-primary">
            Hall of Fame
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg mt-1">
            Top 50 players with the highest winnings!
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Top 3 Players */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {topThree.map((user, index) => (
                  <Card key={user.uid} className={`border-2 ${index === 0 ? 'border-yellow-400' : index === 1 ? 'border-gray-400' : 'border-yellow-600'} bg-muted/30 shadow-lg`}>
                    <CardHeader className="items-center pb-2">
                      <div className={`p-2 rounded-full ${getTrophyColor(index + 1)}`}>
                        {getTrophyIcon(index + 1)}
                      </div>
                      <Avatar className="w-20 h-20 border-4 border-primary mt-2">
                        <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                        <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                    </CardHeader>
                    <CardContent className="text-center">
                      <CardTitle className="text-xl text-accent">{user.displayName}</CardTitle>
                      <p className="text-2xl font-bold text-primary mt-1">
                        ₹{user.totalWinnings.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Rest of the Leaderboard */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-right">Total Winnings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rest.map((user, index) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-bold text-lg">{index + 4}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2 border-border">
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'}/>
                            <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{user.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-primary">₹{user.totalWinnings.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {leaderboard.length === 0 && (
                <p className="text-center text-muted-foreground py-10">
                  The leaderboard is currently empty. Be the first to make your mark!
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
