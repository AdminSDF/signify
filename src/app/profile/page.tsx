
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Edit3, ArrowDownCircle, Library, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type PaymentMethod = "upi" | "bank";

export default function ProfilePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("upi");
  const [upiId, setUpiId] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');

  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { toast } = useToast();

  const fetchBalance = useCallback(() => {
    const storedBalance = localStorage.getItem(USER_BALANCE_STORAGE_KEY);
    if (storedBalance) {
      setBalance(parseFloat(storedBalance));
    } else {
      setBalance(0); 
    }
  }, []);

  useEffect(() => {
    setUserName(mockUser.name);
    setUserEmail(mockUser.email);
    fetchBalance();

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

    if (selectedPaymentMethod === "upi" && !upiId.trim()) {
      toast({ title: 'UPI ID Required', description: 'Please enter your UPI ID.', variant: 'destructive' });
      setIsWithdrawing(false);
      return;
    }
    if (selectedPaymentMethod === "bank" && (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim())) {
      toast({ title: 'Bank Details Required', description: 'Please fill in all bank account details.', variant: 'destructive' });
      setIsWithdrawing(false);
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const newBalance = balance - amount;
    setBalance(newBalance);
    localStorage.setItem(USER_BALANCE_STORAGE_KEY, newBalance.toString());

    const paymentMethodDetails = selectedPaymentMethod === "upi" ? `to UPI: ${upiId}` : `to Bank A/C: ${accountNumber}`;
    addTransaction({
      type: 'debit',
      amount: amount,
      description: `Withdrawal Processed ${paymentMethodDetails}`,
    });

    toast({
      title: 'Withdrawal Successful',
      description: `₹${amount.toFixed(2)} has been processed for withdrawal ${paymentMethodDetails}.`,
      variant: 'default',
    });

    setWithdrawalAmount('');
    setUpiId('');
    setAccountNumber('');
    setIfscCode('');
    setAccountHolderName('');
    setIsWithdrawing(false);
  };

  const isWithdrawalButtonDisabled = () => {
    if (isWithdrawing || !withdrawalAmount || (balance !== null && parseFloat(withdrawalAmount) > balance) || parseFloat(withdrawalAmount) <= 0) {
      return true;
    }
    if (selectedPaymentMethod === "upi" && !upiId.trim()) return true;
    if (selectedPaymentMethod === "bank" && (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim())) return true;
    return false;
  }

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

                <div>
                  <Label htmlFor="paymentMethod" className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                  <Select
                    value={selectedPaymentMethod}
                    onValueChange={(value) => setSelectedPaymentMethod(value as PaymentMethod)}
                    disabled={isWithdrawing}
                  >
                    <SelectTrigger id="paymentMethod" className="mt-1">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">
                        <div className="flex items-center">
                          <Smartphone className="mr-2 h-4 w-4" /> UPI
                        </div>
                      </SelectItem>
                      <SelectItem value="bank">
                        <div className="flex items-center">
                          <Library className="mr-2 h-4 w-4" /> Bank Account
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedPaymentMethod === "upi" && (
                  <div>
                    <Label htmlFor="upiId" className="text-sm font-medium text-muted-foreground">UPI ID</Label>
                    <Input
                      id="upiId"
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@bank"
                      className="mt-1"
                      disabled={isWithdrawing}
                    />
                  </div>
                )}

                {selectedPaymentMethod === "bank" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="accountHolderName" className="text-sm font-medium text-muted-foreground">Account Holder Name</Label>
                      <Input
                        id="accountHolderName"
                        type="text"
                        value={accountHolderName}
                        onChange={(e) => setAccountHolderName(e.target.value)}
                        placeholder="e.g., John Doe"
                        className="mt-1"
                        disabled={isWithdrawing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber" className="text-sm font-medium text-muted-foreground">Account Number</Label>
                      <Input
                        id="accountNumber"
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="e.g., 123456789012"
                        className="mt-1"
                        disabled={isWithdrawing}
                      />
                    </div>
                    <div>
                      <Label htmlFor="ifscCode" className="text-sm font-medium text-muted-foreground">IFSC Code</Label>
                      <Input
                        id="ifscCode"
                        type="text"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value)}
                        placeholder="e.g., SBIN0001234"
                        className="mt-1"
                        disabled={isWithdrawing}
                      />
                    </div>
                  </div>
                )}
                
                <Button
                  onClick={handleWithdrawal}
                  disabled={isWithdrawalButtonDisabled()}
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

    