
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, Trophy, Users, Calendar, AlertTriangle } from 'lucide-react';
import { getAllTournaments, joinTournament, Tournament } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const TournamentCard = ({ tournament, onJoin, isJoining, userTierBalance }: { tournament: Tournament & {id: string}, onJoin: (id: string, tierId: string) => void, isJoining: boolean, userTierBalance: number }) => {
  const canAfford = userTierBalance >= tournament.entryFee;
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Trophy className="text-yellow-500" /> {tournament.name}</CardTitle>
        <CardDescription>{tournament.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold">Prize Pool:</span>
          <span className="font-bold text-primary">₹{tournament.prizePool}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold">Entry Fee:</span>
          <span>₹{tournament.entryFee} ({tournament.tierId} wallet)</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold">Ends:</span>
          <span>{format(tournament.endDate.toDate(), "PPP")}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="font-semibold">Participants:</span>
          <Badge variant="secondary"><Users className="mr-1 h-3 w-3"/>{tournament.participants?.length || 0}</Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={() => onJoin(tournament.id, tournament.tierId)}
          disabled={isJoining || !canAfford}
        >
          {isJoining ? 'Joining...' : (canAfford ? 'Join Tournament' : 'Insufficient Balance')}
        </Button>
      </CardFooter>
    </Card>
  );
};


export default function TournamentsPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<(Tournament & { id: string })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      setIsLoading(true);
      try {
        const all = await getAllTournaments();
        setTournaments(all.filter(t => t.status === 'active' || t.status === 'upcoming'));
      } catch (error) {
        console.error("Error fetching tournaments:", error);
        toast({ title: 'Error', description: 'Could not load tournaments.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournaments();
  }, [toast]);

  const handleJoinTournament = async (tournamentId: string, tierId: string) => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please log in to join a tournament.', variant: 'destructive'});
      return;
    }
    setIsJoining(true);
    try {
      await joinTournament(tournamentId, user.uid);
      toast({ title: 'Success!', description: 'You have joined the tournament. Good luck!' });
    } catch (error: any) {
      console.error("Error joining tournament:", error);
      toast({ title: 'Join Failed', description: error.message, variant: 'destructive'});
    } finally {
      setIsJoining(false);
    }
  };
  
  if (isLoading) {
    return <div className="text-center py-10">Loading tournaments...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold flex items-center justify-center gap-3"><Swords/> Tournaments</h1>
        <p className="text-muted-foreground mt-2">Compete with other players for huge prizes!</p>
      </div>
      {tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(t => (
            <TournamentCard 
              key={t.id} 
              tournament={t} 
              onJoin={handleJoinTournament}
              isJoining={isJoining}
              userTierBalance={userData?.balances[t.tierId] || 0}
            />
          ))}
        </div>
      ) : (
         <Card className="w-full max-w-md mx-auto p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>No Active Tournaments</CardTitle>
            <CardDescription className="mt-2">There are no upcoming or active tournaments right now. Please check back later!</CardDescription>
        </Card>
      )}
    </div>
  );
}
