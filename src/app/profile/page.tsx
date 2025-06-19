"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Edit3 } from 'lucide-react';

// Mock user data - in a real app, this would come from an API or auth state
const mockUser = {
  name: 'Player One',
  email: 'player.one@example.com',
  avatarUrl: 'https://placehold.co/100x100.png', // Placeholder image
  initialBalance: 1250.75, // Mock balance
};

export default function ProfilePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Simulate fetching user data
    setBalance(mockUser.initialBalance);
    setUserName(mockUser.name);
    setUserEmail(mockUser.email);
  }, []);

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="w-24 h-24 border-4 border-primary shadow-md" data-ai-hint="gaming avatar">
              <AvatarImage src={mockUser.avatarUrl} alt={userName || 'User'} />
              <AvatarFallback>{userName ? userName.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-3xl font-bold font-headline text-primary">
            {userName || 'User Profile'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Manage your account details and view your balance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center p-4 border rounded-lg bg-muted/30">
            <User className="h-6 w-6 mr-3 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-semibold text-lg text-foreground">{userName || 'Loading...'}</p>
            </div>
          </div>

          <div className="flex items-center p-4 border rounded-lg bg-muted/30">
            <Mail className="h-6 w-6 mr-3 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Email Address</p>
              <p className="font-semibold text-lg text-foreground">{userEmail || 'Loading...'}</p>
            </div>
          </div>
          
          <div className="flex items-center p-6 border-2 border-primary rounded-lg bg-primary/10 shadow-inner">
            <DollarSign className="h-8 w-8 mr-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-primary">Current Balance</p>
              <p className="font-bold text-4xl text-primary">
                {balance !== null ? `₹${balance.toFixed(2)}` : 'Loading...'}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" className="w-full max-w-xs">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
