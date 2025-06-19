
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Edit3, ArrowDownCircle, ArrowUpCircle, Library, Smartphone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaymentModal from '@/components/PaymentModal'; 

const mockUser = {
  name: 'Player One',
  email: 'player.one@example.com',
  avatarUrl: 'https://placehold.co/100x100.png',
};

const USER_BALANCE_STORAGE_KEY = 'spinifyUserBalance';
const TRANSACTION_STORAGE_KEY = 'spinifyTransactions';
const MIN_WITHDRAWAL_AMOUNT = 500;
const MIN_ADD_BALANCE_AMOUNT = 100;
const UPI_ID = "9828786246@jio"; 

interface TransactionEvent {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

type PaymentMethod = "upi" | "bank";

const presetAddBalanceAmounts = [100, 200, 500, 1000];

export default function ProfilePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("upi");
  const [upiIdInput, setUpiIdInput] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [addBalanceAmount, setAddBalanceAmount] = useState<string>('');
  const [isAddingBalance, setIsAddingBalance] = useState(false);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);

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

  const addTransaction = (details: { type: 'credit' | 'debit'; amount: number; description: string; status?: 'completed' | 'pending' | 'failed' }) => {
    const newTransactionEntry: TransactionEvent = {
      ...details,
      id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 11),
      date: new Date().toISOString(),
      status: details.status || 'completed', // Default to 'completed' if not provided
    };
    
    const existingTransactionsRaw = localStorage.getItem(TRANSACTION_STORAGE_KEY);
    let existingTransactions: TransactionEvent[] = [];
    if (existingTransactionsRaw) {
      try {
        existingTransactions = JSON.parse(existingTransactionsRaw);
      } catch (e) {
        console.error("Error parsing existing transactions:", e);
      }
    }
    const updatedTransactions = [newTransactionEntry, ...existingTransactions];
    updatedTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(updatedTransactions));

    window.dispatchEvent(new StorageEvent('storage', {
      key: TRANSACTION_STORAGE_KEY,
      newValue: JSON.stringify(updatedTransactions),
    }));
  };

  const handlePaymentMethodChange = (value: PaymentMethod) => {
    setSelectedPaymentMethod(value);
    if (value === "upi") {
      setAccountNumber('');
      setIfscCode('');
      setAccountHolderName('');
    } else if (value === "bank") {
      setUpiIdInput('');
    }
  };

  const handleWithdrawal = async () => {
    setIsWithdrawing(true);
    const amount = parseFloat(withdrawalAmount);

    if (isNaN(amount) || amount <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid positive amount.', variant: 'destructive' });
      setIsWithdrawing(false);
      return;
    }
    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      toast({ title: 'Minimum Withdrawal', description: `The minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT.toFixed(2)}.`, variant: 'destructive' });
      setIsWithdrawing(false);
      return;
    }
    if (balance === null || amount > balance) {
      toast({ title: 'Insufficient Balance', description: 'You do not have enough funds to withdraw this amount.', variant: 'destructive' });
      setIsWithdrawing(false);
      return;
    }
    if (selectedPaymentMethod === "upi" && !upiIdInput.trim()) {
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

    const paymentMethodDetails = selectedPaymentMethod === "upi" ? `to UPI: ${upiIdInput}` : `to Bank A/C: ${accountNumber.slice(-4)}`;
    addTransaction({
      type: 'debit',
      amount: amount,
      description: `Withdrawal: ${paymentMethodDetails}`,
      status: 'completed',
    });

    toast({
      title: 'Withdrawal Processed',
      description: `₹${amount.toFixed(2)} has been processed for withdrawal ${paymentMethodDetails}.`,
      variant: 'default',
    });

    setWithdrawalAmount('');
    if (selectedPaymentMethod === "upi") setUpiIdInput('');
    if (selectedPaymentMethod === "bank") { setAccountNumber(''); setIfscCode(''); setAccountHolderName('');}
    setIsWithdrawing(false);
  };

  const isWithdrawalButtonDisabled = () => {
    if (isWithdrawing || !withdrawalAmount) return true;
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0 || amount < MIN_WITHDRAWAL_AMOUNT) return true;
    if (balance !== null && amount > balance) return true;
    if (selectedPaymentMethod === "upi" && !upiIdInput.trim()) return true;
    if (selectedPaymentMethod === "bank" && (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim())) return true;
    return false;
  };

  const handleOpenAddBalanceModal = () => {
    const amount = parseFloat(addBalanceAmount);
    if (isNaN(amount) || amount < MIN_ADD_BALANCE_AMOUNT) {
      toast({ title: 'Invalid Amount', description: `Please enter a valid amount. Minimum to add is ₹${MIN_ADD_BALANCE_AMOUNT.toFixed(2)}.`, variant: 'destructive' });
      return;
    }
    setShowAddBalanceModal(true);
  };

  const handlePresetAddBalanceClick = (amount: number) => {
    setAddBalanceAmount(amount.toString());
    setShowAddBalanceModal(true);
  };

  const handleConfirmAddBalance = () => {
    setIsAddingBalance(true); 
    const amount = parseFloat(addBalanceAmount);

    // Do NOT update balance directly here.
    // setBalance(newBalance);
    // localStorage.setItem(USER_BALANCE_STORAGE_KEY, newBalance.toString());

    addTransaction({
      type: 'credit',
      amount: amount,
      description: `Balance add request via UPI (₹${amount.toFixed(2)})`,
      status: 'pending', // Set status to pending
    });

    toast({
      title: 'Add Balance Request Submitted',
      description: `Your request to add ₹${amount.toFixed(2)} is pending admin approval.`,
      variant: 'default', 
    });

    setAddBalanceAmount('');
    setShowAddBalanceModal(false);
    setIsAddingBalance(false);
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
            Manage your account details, view your balance, and manage funds.
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

          {/* Add Balance Section */}
          <Card className="p-4 pt-2 bg-card shadow-md">
            <CardHeader className="p-2 pb-4">
              <CardTitle className="text-xl flex items-center font-headline text-accent">
                <ArrowUpCircle className="mr-2 h-6 w-6" />
                Add Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {presetAddBalanceAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => handlePresetAddBalanceClick(amount)}
                    disabled={isAddingBalance || showAddBalanceModal}
                  >
                    ₹{amount}
                  </Button>
                ))}
              </div>
              <div>
                <Label htmlFor="addBalanceAmount" className="text-sm font-medium text-muted-foreground">
                  Or Enter Amount to Add (₹)
                </Label>
                <Input
                  id="addBalanceAmount"
                  type="number"
                  value={addBalanceAmount}
                  onChange={(e) => setAddBalanceAmount(e.target.value)}
                  placeholder={`Min. ₹${MIN_ADD_BALANCE_AMOUNT.toFixed(2)}`}
                  className="mt-1"
                  disabled={isAddingBalance || showAddBalanceModal}
                />
                 {addBalanceAmount && parseFloat(addBalanceAmount) > 0 && parseFloat(addBalanceAmount) < MIN_ADD_BALANCE_AMOUNT && (
                    <p className="text-xs text-destructive text-center mt-1">
                        Minimum amount to add is ₹{MIN_ADD_BALANCE_AMOUNT.toFixed(2)}.
                    </p>
                  )}
              </div>
              <Button
                onClick={handleOpenAddBalanceModal}
                disabled={isAddingBalance || showAddBalanceModal || !addBalanceAmount || parseFloat(addBalanceAmount) < MIN_ADD_BALANCE_AMOUNT}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Request Add Balance via UPI
              </Button>
            </CardContent>
          </Card>


          {/* Withdraw Funds Section */}
          <Card className="p-4 pt-2 bg-card shadow-md">
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
                    placeholder={`Min. ₹${MIN_WITHDRAWAL_AMOUNT.toFixed(2)}`}
                    className="mt-1"
                    disabled={isWithdrawing}
                  />
                  {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && parseFloat(withdrawalAmount) < MIN_WITHDRAWAL_AMOUNT && (
                    <p className="text-xs text-destructive text-center mt-1">
                        Minimum withdrawal is ₹{MIN_WITHDRAWAL_AMOUNT.toFixed(2)}.
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="paymentMethod" className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                  <Select
                    value={selectedPaymentMethod}
                    onValueChange={(value) => handlePaymentMethodChange(value as PaymentMethod)}
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
                    <Label htmlFor="upiIdInput" className="text-sm font-medium text-muted-foreground">UPI ID</Label>
                    <Input
                      id="upiIdInput"
                      type="text"
                      value={upiIdInput}
                      onChange={(e) => setUpiIdInput(e.target.value)}
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
                {balance !== null && parseFloat(withdrawalAmount) > 0 && parseFloat(withdrawalAmount) > balance && (
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

      <PaymentModal
        isOpen={showAddBalanceModal}
        onClose={() => setShowAddBalanceModal(false)}
        onConfirm={handleConfirmAddBalance}
        upiId={UPI_ID}
        amount={parseFloat(addBalanceAmount) || 0}
      />
    </div>
  );
}


    