
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Edit3, ArrowDownCircle, ArrowUpCircle, Library, Smartphone, ShieldAlert, QrCode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaymentModal from '@/components/PaymentModal'; 
import { 
  getUserData, 
  updateUserData, 
  addTransactionToFirestore, 
  createWithdrawalRequest, 
  createAddFundRequest,
  Timestamp,
  type UserDocument // Correctly import type UserDocument
} from '@/lib/firebase';
// AppSettings type is now sourced from AuthContext

type PaymentMethod = "upi" | "bank";
const presetAddBalanceAmounts = [100, 200, 500, 1000];

export default function ProfilePage() {
  const { user, loading: authLoading, appSettings, isAppConfigLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [balance, setBalance] = useState<number | null>(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("upi");
  const [upiIdInput, setUpiIdInput] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const [addBalanceAmount, setAddBalanceAmount] = useState<string>('');
  const [isAddingBalance, setIsAddingBalance] = useState(false); // For button state during submission
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [currentAmountForModal, setCurrentAmountForModal] = useState<number>(0); // For QR code amount
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchUserBalanceData = useCallback(async () => {
    if (!user || !isClient) return;
    setUserDataLoading(true);
    try {
      const userData = await getUserData(user.uid);
      if (userData) {
        setBalance(userData.balance);
        setUpiIdInput(userData.upiIdForWithdrawal || '');
        if (userData.bankDetailsForWithdrawal) {
          setAccountHolderName(userData.bankDetailsForWithdrawal.accountHolderName || '');
          setAccountNumber(userData.bankDetailsForWithdrawal.accountNumber || '');
          setIfscCode(userData.bankDetailsForWithdrawal.ifscCode || '');
        }
      } else {
        setBalance(0); // Fallback if no data
      }
    } catch (error) {
      console.error("Error fetching user balance data:", error);
      toast({ title: "Error", description: "Could not load your balance.", variant: "destructive" });
      setBalance(0);
    } finally {
      setUserDataLoading(false);
    }
  }, [user, toast, isClient]);

  useEffect(() => {
    if (!authLoading && !user && isClient) {
      router.push('/login');
    } else if (user && isClient && !isAppConfigLoading) { // Ensure appSettings are loaded too
      fetchUserBalanceData();
    }
  }, [user, authLoading, router, isClient, isAppConfigLoading, fetchUserBalanceData]);


  const handlePaymentMethodChange = (value: string) => {
    setSelectedPaymentMethod(value as PaymentMethod);
    // Reset other method's fields if desired, or keep them for user convenience
  };

  const handleWithdrawal = async () => {
    if (!isClient || !user) return;
    setIsWithdrawing(true);
    const amount = parseFloat(withdrawalAmount);

    if (isNaN(amount) || amount <= 0) { toast({ title: 'Invalid Amount', variant: 'destructive' }); setIsWithdrawing(false); return; }
    if (amount < appSettings.minWithdrawalAmount) { toast({ title: 'Minimum Withdrawal', description: `Min is ₹${appSettings.minWithdrawalAmount.toFixed(2)}.`, variant: 'destructive' }); setIsWithdrawing(false); return; }
    if (balance === null || amount > balance) { toast({ title: 'Insufficient Balance', variant: 'destructive' }); setIsWithdrawing(false); return; }
    
    let paymentDetails: any = { paymentMethod: selectedPaymentMethod };
    if (selectedPaymentMethod === "upi") {
      if (!upiIdInput.trim()) { toast({ title: 'UPI ID Required', variant: 'destructive' }); setIsWithdrawing(false); return; }
      paymentDetails.upiId = upiIdInput.trim();
    } else { // bank
      if (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim()) { toast({ title: 'Bank Details Required', variant: 'destructive' }); setIsWithdrawing(false); return; }
      paymentDetails.bankDetails = { accountHolderName: accountHolderName.trim(), accountNumber: accountNumber.trim(), ifscCode: ifscCode.trim() };
    }
    
    try {
      await createWithdrawalRequest({
        userId: user.uid,
        userEmail: user.email || 'N/A',
        amount,
        ...paymentDetails
      });

      // Save withdrawal details to user profile for future use if changed
      const userUpdateData: Partial<UserDocument> = {};
      if (selectedPaymentMethod === "upi" && upiIdInput.trim()) userUpdateData.upiIdForWithdrawal = upiIdInput.trim();
      if (selectedPaymentMethod === "bank" && paymentDetails.bankDetails) userUpdateData.bankDetailsForWithdrawal = paymentDetails.bankDetails;
      if(Object.keys(userUpdateData).length > 0) await updateUserData(user.uid, userUpdateData);
      
      // Log a PENDING transaction for withdrawal request
      await addTransactionToFirestore({
        userId: user.uid,
        type: 'debit',
        amount: amount,
        description: `Withdrawal request (${selectedPaymentMethod}) - Pending`,
        status: 'pending',
        balanceBefore: balance, // Log balance before
        balanceAfter: balance - amount, // Log potential balance after if approved
      }, user.uid);

      toast({ title: 'Withdrawal Request Submitted', description: `₹${amount.toFixed(2)} request is pending admin approval.` });
      setWithdrawalAmount(''); 
      // Optionally clear payment details fields or keep them
    } catch (error) {
      console.error("Withdrawal request error:", error);
      toast({ title: 'Request Failed', description: 'Could not submit withdrawal request.', variant: 'destructive' });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const isWithdrawalButtonDisabled = () => {
    if (!isClient || isWithdrawing || !withdrawalAmount) return true;
    const amount = parseFloat(withdrawalAmount);
    if (isNaN(amount) || amount <= 0 || amount < appSettings.minWithdrawalAmount) return true;
    if (balance !== null && amount > balance) return true;
    if (selectedPaymentMethod === "upi" && !upiIdInput.trim()) return true;
    if (selectedPaymentMethod === "bank" && (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim())) return true;
    return false;
  };

  const handleOpenAddBalanceModal = (amountValue: number) => {
    if (!isClient) return;
    if (isNaN(amountValue) || amountValue < appSettings.minAddBalanceAmount) {
      toast({ title: 'Invalid Amount', description: `Min to add is ₹${appSettings.minAddBalanceAmount.toFixed(2)}.`, variant: 'destructive' });
      return;
    }
    setCurrentAmountForModal(amountValue);
    setShowAddBalanceModal(true);
  };
  
  const handlePresetAddBalanceClick = (amount: number) => {
    setAddBalanceAmount(amount.toString()); // Update input field as well
    if (amount >= appSettings.minAddBalanceAmount && isClient) {
      handleOpenAddBalanceModal(amount);
    } else if (isClient) {
      toast({ title: 'Invalid Amount', description: `Min to add is ₹${appSettings.minAddBalanceAmount.toFixed(2)}.`, variant: 'destructive' });
    }
  };

  const handleConfirmAddBalance = async (paymentRef?: string) => { 
    if (!isClient || !user) return;
    setIsAddingBalance(true); 
    const amount = currentAmountForModal; // Use amount from modal state

    try {
      await createAddFundRequest({
        userId: user.uid,
        userEmail: user.email || 'N/A',
        amount,
        paymentReference: paymentRef || "User Confirmed Payment", 
      });
      
      await addTransactionToFirestore({
        userId: user.uid,
        type: 'credit',
        amount: amount,
        description: `Add balance request (₹${amount.toFixed(2)}) - Pending`,
        status: 'pending',
        balanceBefore: balance ?? 0, // Log balance before
        balanceAfter: (balance ?? 0) + amount, // Log potential balance after
      }, user.uid);

      toast({ title: 'Add Balance Request Submitted', description: `Request to add ₹${amount.toFixed(2)} is pending.`, variant: 'default' });
      setAddBalanceAmount(''); // Clear the input field
    } catch (error) {
      console.error("Add fund request error:", error);
      toast({ title: 'Request Failed', description: 'Could not submit add fund request.', variant: 'destructive' });
    } finally {
      setShowAddBalanceModal(false);
      setIsAddingBalance(false);
    }
  };


  if (authLoading || !isClient || (!user && isClient) || isAppConfigLoading || userDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        {(authLoading || !isClient || isAppConfigLoading || userDataLoading) && !(!user && isClient && !authLoading) ? ( 
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        ) : ( 
          <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">Please log in to view your profile.</CardDescription>
            <Button onClick={() => router.push('/login')} className="mt-6">Go to Login</Button>
          </Card>
        )}
      </div>
    );
  }
  
  if (!user) return <div className="flex items-center justify-center min-h-screen">Redirecting...</div>;

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-lg mx-auto shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar className="w-24 h-24 border-4 border-primary shadow-md">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
          </div>
          <CardTitle className="text-3xl font-bold font-headline text-primary">{user.displayName || 'User Profile'}</CardTitle>
          <CardDescription className="text-muted-foreground">Manage account, balance, and funds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center p-4 border rounded-lg bg-muted/30">
            <User className="h-6 w-6 mr-3 text-primary" />
            <div><p className="text-sm text-muted-foreground">Full Name</p><p className="font-semibold text-lg text-foreground">{user.displayName || 'N/A'}</p></div>
          </div>
          <div className="flex items-center p-4 border rounded-lg bg-muted/30">
            <Mail className="h-6 w-6 mr-3 text-primary" />
            <div><p className="text-sm text-muted-foreground">Email Address</p><p className="font-semibold text-lg text-foreground">{user.email || 'N/A'}</p></div>
          </div>
          <div className="flex items-center p-6 border-2 border-primary rounded-lg bg-primary/10 shadow-inner">
            <DollarSign className="h-8 w-8 mr-4 text-primary" />
            <div><p className="text-sm font-medium text-primary">Current Balance</p><p className="font-bold text-4xl text-primary">{balance !== null ? `₹${balance.toFixed(2)}` : 'Loading...'}</p></div>
          </div>

          <Card className="p-4 pt-2 bg-card shadow-md">
            <CardHeader className="p-2 pb-4"><CardTitle className="text-xl flex items-center font-headline text-accent"><ArrowUpCircle className="mr-2 h-6 w-6" />Add Balance</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {presetAddBalanceAmounts.map((amount) => (<Button key={amount} variant="outline" onClick={() => handlePresetAddBalanceClick(amount)} disabled={isAddingBalance || showAddBalanceModal || !isClient}>₹{amount}</Button>))}
              </div>
              <div>
                <Label htmlFor="addBalanceAmount" className="text-sm font-medium text-muted-foreground">Or Enter Amount (₹)</Label>
                <Input id="addBalanceAmount" type="number" value={addBalanceAmount} onChange={(e) => setAddBalanceAmount(e.target.value)} placeholder={`Min. ₹${appSettings.minAddBalanceAmount.toFixed(2)}`} className="mt-1" disabled={isAddingBalance || showAddBalanceModal || !isClient} />
                {addBalanceAmount && parseFloat(addBalanceAmount) > 0 && parseFloat(addBalanceAmount) < appSettings.minAddBalanceAmount && (<p className="text-xs text-destructive text-center mt-1">Min amount to add is ₹{appSettings.minAddBalanceAmount.toFixed(2)}.</p>)}
              </div>
              <Button 
                onClick={() => handleOpenAddBalanceModal(parseFloat(addBalanceAmount))} 
                disabled={isAddingBalance || showAddBalanceModal || !addBalanceAmount || parseFloat(addBalanceAmount) < appSettings.minAddBalanceAmount || !isClient} 
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <QrCode className="mr-2 h-5 w-5" />
                Request Add Balance
              </Button>
            </CardContent>
          </Card>

          <Card className="p-4 pt-2 bg-card shadow-md">
            <CardHeader className="p-2 pb-4"><CardTitle className="text-xl flex items-center font-headline text-primary"><ArrowDownCircle className="mr-2 h-6 w-6" />Withdraw Funds</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-2">
              <div>
                <Label htmlFor="withdrawalAmount" className="text-sm font-medium text-muted-foreground">Amount to Withdraw (₹)</Label>
                <Input id="withdrawalAmount" type="number" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} placeholder={`Min. ₹${appSettings.minWithdrawalAmount.toFixed(2)}`} className="mt-1" disabled={isWithdrawing || !isClient} />
                {withdrawalAmount && parseFloat(withdrawalAmount) > 0 && parseFloat(withdrawalAmount) < appSettings.minWithdrawalAmount && (<p className="text-xs text-destructive text-center mt-1">Min withdrawal is ₹{appSettings.minWithdrawalAmount.toFixed(2)}.</p>)}
              </div>
              <div>
                <Label htmlFor="paymentMethod" className="text-sm font-medium text-muted-foreground">Payment Method</Label>
                <Select value={selectedPaymentMethod} onValueChange={handlePaymentMethodChange} disabled={isWithdrawing || !isClient}>
                  <SelectTrigger id="paymentMethod" className="mt-1"><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upi"><div className="flex items-center"><Smartphone className="mr-2 h-4 w-4" />UPI</div></SelectItem>
                    <SelectItem value="bank"><div className="flex items-center"><Library className="mr-2 h-4 w-4" />Bank Account</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedPaymentMethod === "upi" && (<div><Label htmlFor="upiIdInput">UPI ID</Label><Input id="upiIdInput" type="text" value={upiIdInput} onChange={(e) => setUpiIdInput(e.target.value)} placeholder="yourname@upi" className="mt-1" disabled={isWithdrawing || !isClient}/></div>)}
              {selectedPaymentMethod === "bank" && (<div className="space-y-3">
                <div><Label htmlFor="accountHolderName">Account Holder Name</Label><Input id="accountHolderName" type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="e.g., John Doe" className="mt-1" disabled={isWithdrawing || !isClient}/></div>
                <div><Label htmlFor="accountNumber">Account Number</Label><Input id="accountNumber" type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g., 123456789012" className="mt-1" disabled={isWithdrawing || !isClient}/></div>
                <div><Label htmlFor="ifscCode">IFSC Code</Label><Input id="ifscCode" type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="e.g., SBIN0001234" className="mt-1" disabled={isWithdrawing || !isClient}/></div>
              </div>)}
              <Button onClick={handleWithdrawal} disabled={isWithdrawalButtonDisabled() || !isClient} className="w-full bg-green-600 hover:bg-green-700 text-white">{isWithdrawing ? 'Processing...' : 'Request Withdrawal'}</Button>
              {balance !== null && parseFloat(withdrawalAmount) > 0 && parseFloat(withdrawalAmount) > balance && (<p className="text-xs text-destructive text-center mt-1">Amount exceeds balance.</p>)}
            </CardContent>
          </Card>
        </CardContent>
        <CardFooter className="flex justify-center pt-6"><Button variant="outline" className="w-full max-w-xs" disabled><Edit3 className="mr-2 h-4 w-4" />Edit Profile (Coming Soon)</Button></CardFooter>
      </Card>
      {isClient && (
        <PaymentModal 
          isOpen={showAddBalanceModal} 
          onClose={() => setShowAddBalanceModal(false)} 
          onConfirm={() => handleConfirmAddBalance("User Confirmed Payment In Modal")} 
          upiId={appSettings.upiId}
          appName={appSettings.appName}
          amount={currentAmountForModal}
        />
      )}
    </div>
  );
}
