
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Edit3, ArrowDownCircle, ArrowUpCircle, Library, Smartphone, ShieldAlert, QrCode, Camera } from 'lucide-react';
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
  type UserDocument,
  uploadProfilePhoto, // Import the new function
  auth,               // Import auth for current user
  updateProfile       // Import updateProfile for auth user
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
  const [isAddingBalance, setIsAddingBalance] = useState(false);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [currentAmountForModal, setCurrentAmountForModal] = useState<number>(0);

  // New states for photo upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: 'File too large', description: 'Please select an image smaller than 2MB.', variant: 'destructive' });
        return;
      }
      setSelectedFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setPhotoPreview(null);
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile || !user) {
      toast({ title: 'No file selected', description: 'Please select a photo to upload.', variant: 'destructive' });
      return;
    }
    if (!auth.currentUser) {
      toast({ title: 'Authentication Error', description: 'User not found, please re-login.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const newPhotoURL = await uploadProfilePhoto(user.uid, selectedFile);

      await updateProfile(auth.currentUser, { photoURL: newPhotoURL });
      await updateUserData(user.uid, { photoURL: newPhotoURL });

      toast({ title: 'Profile Photo Updated!', description: 'Your new photo has been saved.' });
      window.location.reload();

    } catch (error: any) {
      console.error("Error uploading profile photo:", error);
      toast({ title: 'Upload Failed', description: error.message || 'Could not upload your photo.', variant: 'destructive' });
      setIsUploading(false); // Only set to false on error, success causes reload
    }
  };


  const handlePaymentMethodChange = (value: string) => {
    setSelectedPaymentMethod(value as PaymentMethod);
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

      const userUpdateData: Partial<UserDocument> = {};
      if (selectedPaymentMethod === "upi" && upiIdInput.trim()) userUpdateData.upiIdForWithdrawal = upiIdInput.trim();
      if (selectedPaymentMethod === "bank" && paymentDetails.bankDetails) userUpdateData.bankDetailsForWithdrawal = paymentDetails.bankDetails;
      if (Object.keys(userUpdateData).length > 0) await updateUserData(user.uid, userUpdateData);

      await addTransactionToFirestore({
        type: 'debit',
        amount: amount,
        description: `Withdrawal request (${selectedPaymentMethod}) - Pending`,
        status: 'pending',
        balanceBefore: balance,
        balanceAfter: balance - amount,
      }, user.uid);

      toast({ title: 'Withdrawal Request Submitted', description: `₹${amount.toFixed(2)} request is pending admin approval.` });
      setWithdrawalAmount('');
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
    setAddBalanceAmount(amount.toString());
    if (amount >= appSettings.minAddBalanceAmount && isClient) {
      handleOpenAddBalanceModal(amount);
    } else if (isClient) {
      toast({ title: 'Invalid Amount', description: `Min to add is ₹${appSettings.minAddBalanceAmount.toFixed(2)}.`, variant: 'destructive' });
    }
  };

  const handleConfirmAddBalance = async (paymentRef?: string) => {
    if (!isClient || !user) return;
    setIsAddingBalance(true);
    const amount = currentAmountForModal;

    try {
      await createAddFundRequest({
        userId: user.uid,
        userEmail: user.email || 'N/A',
        amount,
        paymentReference: paymentRef || "User Confirmed Payment",
      });

      await addTransactionToFirestore({
        type: 'credit',
        amount: amount,
        description: `Add balance request (₹${amount.toFixed(2)}) - Pending`,
        status: 'pending',
        balanceBefore: balance ?? 0,
        balanceAfter: (balance ?? 0) + amount,
      }, user.uid);

      toast({ title: 'Add Balance Request Submitted', description: `Request to add ₹${amount.toFixed(2)} is pending.`, variant: 'default' });
      setAddBalanceAmount('');
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
          <div className="relative flex justify-center mb-4 group">
            <Avatar className="w-24 h-24 border-4 border-primary shadow-md">
              <AvatarImage src={photoPreview || user.photoURL || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <label htmlFor="photo-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-8 w-8 text-white" />
            </label>
            <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
          </div>
          <CardTitle className="text-3xl font-bold font-headline text-primary">{user.displayName || 'User Profile'}</CardTitle>
          <CardDescription className="text-muted-foreground">Manage account, balance, and funds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedFile && (
            <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/30">
              <p className="text-sm font-medium">New photo selected: <span className="font-normal text-muted-foreground">{selectedFile.name}</span></p>
              <div className="flex gap-2">
                <Button onClick={handlePhotoUpload} disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Save Photo'}
                </Button>
                <Button onClick={handleCancelUpload} variant="outline" disabled={isUploading}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

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
              {selectedPaymentMethod === "upi" && (<div><Label htmlFor="upiIdInput">UPI ID</Label><Input id="upiIdInput" type="text" value={upiIdInput} onChange={(e) => setUpiIdInput(e.target.value)} placeholder="yourname@upi" className="mt-1" disabled={isWithdrawing || !isClient} /></div>)}
              {selectedPaymentMethod === "bank" && (<div className="space-y-3">
                <div><Label htmlFor="accountHolderName">Account Holder Name</Label><Input id="accountHolderName" type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="e.g., John Doe" className="mt-1" disabled={isWithdrawing || !isClient} /></div>
                <div><Label htmlFor="accountNumber">Account Number</Label><Input id="accountNumber" type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g., 123456789012" className="mt-1" disabled={isWithdrawing || !isClient} /></div>
                <div><Label htmlFor="ifscCode">IFSC Code</Label><Input id="ifscCode" type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="e.g., SBIN0001234" className="mt-1" disabled={isWithdrawing || !isClient} /></div>
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
