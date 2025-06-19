
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Edit3, ArrowDownCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';

// Mock user data - some parts might still be used for static info like name/email
const mockUser = {
  name: 'Player One',
  email: 'player.one@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
};

const USER_BALANCE_STORAGE_KEY = 'spinifyUserBalance';
const TRANSACTION_STORAGE_KEY = 'spinifyTransactions';

interface TransactionEvent {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export default function ProfilePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { toast } = useToast();

  const fetchBalance = useCallback(() => {
    const storedBalance = localStorage.getItem(USER_BALANCE_STORAGE_KEY);
    if (storedBalance) {
      setBalance(parseFloat(storedBalance));
    } else {
      // Fallback if no balance is in local storage, e.g. for a very new user or cleared storage
      // This shouldn't ideally happen if page.tsx initializes it.
      setBalance(0); 
    }
  }, []);

  useEffect(() => {
    // Simulate fetching user data and balance from localStorage
    setUserName(mockUser.name);
    setUserEmail(mockUser.email);
    fetchBalance();

    // Listen for storage changes to update balance if modified elsewhere (e.g. game page)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === USER_BALANCE_STORAGE_KEY) {
        fetchBalance();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };

  }, [fetchBalance]);

  const addTransaction = (details: { type: 'credit' | 'debit'; amount: number; description: string }) => {
    const newTransactionEntry: TransactionEvent = {
      ...details,
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString(),
      status: 'completed',
    };
    
    const existingTransactionsRaw = localStorage.getItem(TRANSACTION_STORAGE_KEY);
    let existingTransactions: TransactionEvent[] = [];
    if (existingTransactionsRaw) {
      try {
        existingTransactions = JSON.parse(existingTransactionsRaw);
      } catch (e) {
        console.error("Error parsing existing transactions for withdrawal:", e);
      }
    }
    const updatedTransactions = [newTransactionEntry, ...existingTransactions];
    updatedTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(updatedTransactions));
  };

  const handleWithdrawal = async () => {
    setIsWithdrawing(true);
    const amount = parseFloat(withdrawalAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid positive amount to withdraw.',
        variant: 'destructive',
      });
      setIsWithdrawing(false);
      return;
    }

    if (balance === null || amount > balance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You do not have enough funds to withdraw this amount.',
        variant: 'destructive',
      });
      setIsWithdrawing(false);
      return;
    }

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newBalance = balance - amount;
    setBalance(newBalance);
    localStorage.setItem(USER_BALANCE_STORAGE_KEY, newBalance.toString());

    addTransaction({
      type: 'debit',
      amount: amount,
      description: 'Withdrawal Processed',
    });

    toast({
      title: 'Withdrawal Successful',
      description: `₹${amount.toFixed(2)} has been processed for withdrawal.`,
      variant: 'default', // Success variant if you have one, default otherwise
    });

    setWithdrawalAmount('');
    setIsWithdrawing(false);
  };

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
            Manage your account details, view your balance, and withdraw funds.
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

          {/* Withdrawal Section */}
          <Card className="p-4 pt-2 bg-card shadow-md mt-6">
             <CardHeader className="p-2 pb-4">
                <CardTitle className="text-xl flex items-center font-headline text-primary">
                  <ArrowDownCircle className="mr-2 h-6 w-6" />
                  Withdraw Funds
                </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 p-2">
                <div>
                  <Label htmlFor="withdrawalAmount" className="text-sm font-medium text-muted-foreground">
                    Amount to Withdraw (₹)
                  </Label>
                  <Input
                    id="withdrawalAmount"
                    type="number"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    placeholder="e.g., 50.00"
                    className="mt-1"
                    disabled={isWithdrawing}
                  />
                </div>
                <Button
                  onClick={handleWithdrawal}
                  disabled={isWithdrawing || !withdrawalAmount || (balance !== null && parseFloat(withdrawalAmount) > balance) || parseFloat(withdrawalAmount) <= 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {isWithdrawing ? 'Processing...' : 'Withdraw Now'}
                </Button>
                {balance !== null && parseFloat(withdrawalAmount) > balance && (
                    <p className="text-xs text-destructive text-center mt-1">
                        Withdrawal amount cannot exceed your current balance.
                    </p>
                )}
             </CardContent>
          </Card>

        </CardContent>
        <CardFooter className="flex justify-center pt-6">
          <Button variant="outline" className="w-full max-w-xs">
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile (Coming Soon)
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

