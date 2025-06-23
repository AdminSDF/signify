
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Edit3, ArrowDownCircle, ArrowUpCircle, Library, Smartphone, ShieldAlert, QrCode, Camera, Shield, Gem, Crown, Rocket, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentModal from '@/components/PaymentModal';
import {
  updateUserData,
  createWithdrawalRequest,
  createAddFundRequest,
  uploadProfilePhoto,
  auth,
  updateProfile,
  logUserActivity,
} from '@/lib/firebase';
import { WheelTierConfig } from '@/lib/appConfig';
import { Steps } from 'intro.js-react';

type PaymentMethod = "upi" | "bank";

const tierIcons: { [key: string]: React.ReactNode } = {
  little: <Gem className="mr-2 h-5 w-5" />,
  big: <Crown className="mr-2 h-5 w-5" />,
  'more-big': <Rocket className="mr-2 h-5 w-5" />,
};

export default function ProfilePage() {
  const { user, userData, loading, appSettings } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTier, setActiveTier] = useState<string>('little');
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('');
  const [addBalanceAmount, setAddBalanceAmount] = useState<string>('');
  
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("upi");
  const [upiIdInput, setUpiIdInput] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [currentAmountForModal, setCurrentAmountForModal] = useState<number>(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

  const activeWheelConfig = appSettings.wheelConfigs[activeTier];

  useEffect(() => {
    if (user && userData && !loading && userData.toursCompleted?.profilePage === false) {
      setTimeout(() => setIsTourOpen(true), 500);
    }
  }, [user, userData, loading]);

  const onTourExit = () => {
    setIsTourOpen(false);
    if (user) {
        updateUserData(user.uid, { 'toursCompleted.profilePage': true });
    }
  };

  const tourSteps = [
    {
      element: '[data-tour-id="profile-avatar"]',
      intro: 'Here you can see your profile picture and name. Click the camera icon to upload a new photo!',
    },
    {
      element: '[data-tour-id="tier-selector-tabs"]',
      intro: 'You have a separate balance for each game arena. Click these tabs to switch between your wallets.',
    },
    {
      element: '[data-tour-id="balance-display"]',
      intro: 'This card shows your current balance for the selected wallet.',
    },
    {
      element: '[data-tour-id="add-balance-section"]',
      intro: 'Need more funds to play? You can add balance to your wallet from here.',
    },
    {
      element: '[data-tour-id="withdraw-funds-section"]',
      intro: 'Ready to cash out? You can request a withdrawal of your winnings here. Make sure your payment details below are correct!',
    },
  ];

  useEffect(() => {
    if (userData) {
        setUpiIdInput(userData.upiIdForWithdrawal || '');
        if (userData.bankDetailsForWithdrawal) {
          setAccountHolderName(userData.bankDetailsForWithdrawal.accountHolderName || '');
          setAccountNumber(userData.bankDetailsForWithdrawal.accountNumber || '');
          setIfscCode(userData.bankDetailsForWithdrawal.ifscCode || '');
        }
    }
  }, [userData]);
  
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
    if (fileInput) fileInput.value = '';
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile || !user || !auth.currentUser) {
      toast({ title: 'Error', description: 'No file selected or user not authenticated.', variant: 'destructive' });
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
    } finally {
      setIsUploading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!user || !userData || !activeWheelConfig) return;
    if (activeWheelConfig.isLocked) {
      toast({ title: "Arena Locked", description: "Withdrawals are disabled for this arena.", variant: "destructive"});
      return;
    }

    setIsProcessing(true);
    const amount = parseFloat(withdrawalAmount);
    const balance = userData.balances[activeTier] ?? 0;
    
    if (isNaN(amount) || amount <= 0) { toast({ title: 'Invalid Amount', variant: 'destructive' }); setIsProcessing(false); return; }
    if (amount < activeWheelConfig.minWithdrawalAmount) { toast({ title: 'Minimum Withdrawal', description: `Min is ₹${activeWheelConfig.minWithdrawalAmount.toFixed(2)} for ${activeWheelConfig.name}.`, variant: 'destructive' }); setIsProcessing(false); return; }
    if (amount > balance) { toast({ title: 'Insufficient Balance', variant: 'destructive' }); setIsProcessing(false); return; }

    let paymentDetails: any = { paymentMethod: selectedPaymentMethod };
    if (selectedPaymentMethod === "upi") {
      if (!upiIdInput.trim()) { toast({ title: 'UPI ID Required', variant: 'destructive' }); setIsProcessing(false); return; }
      paymentDetails.upiId = upiIdInput.trim();
    } else {
      if (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim()) { toast({ title: 'Bank Details Required', variant: 'destructive' }); setIsProcessing(false); return; }
      paymentDetails.bankDetails = { accountHolderName: accountHolderName.trim(), accountNumber: accountNumber.trim(), ifscCode: ifscCode.trim() };
    }

    try {
      await createWithdrawalRequest({
        userId: user.uid,
        userEmail: user.email || 'N/A',
        amount,
        tierId: activeTier,
        ...paymentDetails
      });

      // Log withdrawal request activity
      await logUserActivity(user.uid, user.email, 'withdrawalRequest');

      const userUpdateData: Partial<UserDocument> = {};
      if (selectedPaymentMethod === "upi") userUpdateData.upiIdForWithdrawal = upiIdInput.trim();
      else userUpdateData.bankDetailsForWithdrawal = paymentDetails.bankDetails;
      await updateUserData(user.uid, userUpdateData);

      toast({ title: 'Withdrawal Request Submitted', description: `Request for ₹${amount.toFixed(2)} from ${activeWheelConfig.name} is pending.` });
      setWithdrawalAmount('');
    } catch (error) {
      console.error("Withdrawal request error:", error);
      toast({ title: 'Request Failed', description: 'Could not submit withdrawal request.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenAddBalanceModal = (amountValue: number) => {
    if (isNaN(amountValue) || amountValue < appSettings.minAddBalanceAmount) {
      toast({ title: 'Invalid Amount', description: `Min to add is ₹${appSettings.minAddBalanceAmount.toFixed(2)}.`, variant: 'destructive' });
      return;
    }
    setCurrentAmountForModal(amountValue);
    setShowAddBalanceModal(true);
  };
  
  const handleConfirmAddBalance = async () => {
    if (!user || !activeWheelConfig) return;
    setIsProcessing(true);
    const amount = currentAmountForModal;

    try {
      await createAddFundRequest({
        userId: user.uid,
        userEmail: user.email || 'N/A',
        amount,
        tierId: activeTier,
        paymentReference: "User Confirmed Payment In Modal",
      });

      // Log add fund request activity
      await logUserActivity(user.uid, user.email, 'addFundRequest');

      toast({ title: 'Add Balance Request Submitted', description: `Request to add ₹${amount.toFixed(2)} to ${activeWheelConfig.name} is pending.`, variant: 'default' });
      setAddBalanceAmount('');
    } catch (error) {
      console.error("Add fund request error:", error);
      toast({ title: 'Request Failed', description: 'Could not submit add fund request.', variant: 'destructive' });
    } finally {
      setShowAddBalanceModal(false);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user || !userData) {
     return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
          <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">Please log in to view your profile.</CardDescription>
            <Button onClick={() => router.push('/login')} className="mt-6">Go to Login</Button>
          </Card>
        </div>
     )
  }

  const renderWalletContent = (tierConfig: WheelTierConfig) => {
    const balance = userData?.balances[tierConfig.id] ?? 0;
    const minWithdrawal = tierConfig.minWithdrawalAmount;

    return (
      <div className="space-y-6">
          <div data-tour-id="balance-display" className="flex items-center p-6 border-2 border-primary rounded-lg bg-primary/10 shadow-inner">
            <DollarSign className="h-8 w-8 mr-4 text-primary" />
            <div><p className="text-sm font-medium text-primary">Current Balance</p><p className="font-bold text-4xl text-primary">₹{balance.toFixed(2)}</p></div>
          </div>

          <Card data-tour-id="add-balance-section" className="p-4 pt-2 bg-card shadow-md">
            <CardHeader className="p-2 pb-4"><CardTitle className="text-xl flex items-center font-headline text-accent"><ArrowUpCircle className="mr-2 h-6 w-6" />Add Balance</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {appSettings.addBalancePresets.map((amount) => (<Button key={amount} variant="outline" onClick={() => handleOpenAddBalanceModal(amount)} disabled={isProcessing}>₹{amount}</Button>))}
              </div>
              <div>
                <Label htmlFor="addBalanceAmount" className="text-sm font-medium text-muted-foreground">Or Enter Amount (₹)</Label>
                <Input id="addBalanceAmount" type="number" value={addBalanceAmount} onChange={(e) => setAddBalanceAmount(e.target.value)} placeholder={`Min. ₹${appSettings.minAddBalanceAmount.toFixed(2)}`} className="mt-1" disabled={isProcessing} />
                {addBalanceAmount && parseFloat(addBalanceAmount) > 0 && parseFloat(addBalanceAmount) < appSettings.minAddBalanceAmount && (<p className="text-xs text-destructive text-center mt-1">Min amount to add is ₹{appSettings.minAddBalanceAmount.toFixed(2)}.</p>)}
              </div>
              <Button onClick={() => handleOpenAddBalanceModal(parseFloat(addBalanceAmount))} disabled={isProcessing || !addBalanceAmount || parseFloat(addBalanceAmount) < appSettings.minAddBalanceAmount} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                <QrCode className="mr-2 h-5 w-5" /> Request Add Balance
              </Button>
            </CardContent>
          </Card>

          <Card data-tour-id="withdraw-funds-section" className="p-4 pt-2 bg-card shadow-md">
            <CardHeader className="p-2 pb-4">
              <CardTitle className="text-xl flex items-center font-headline text-primary">
                <ArrowDownCircle className="mr-2 h-6 w-6" />
                Withdraw Funds
              </CardTitle>
               {tierConfig.isLocked && (
                 <CardDescription className="text-destructive flex items-center gap-1 pt-1">
                  <Lock className="h-3 w-3" /> Withdrawals disabled: Arena is locked.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4 p-2">
               <div>
                <Label htmlFor="withdrawalAmount" className="text-sm font-medium text-muted-foreground">Amount to Withdraw (Min. ₹{minWithdrawal.toFixed(2)})</Label>
                <Input id="withdrawalAmount" type="number" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} placeholder={`e.g. ${minWithdrawal}`} className="mt-1" disabled={isProcessing || tierConfig.isLocked} />
               </div>
               <Button onClick={handleWithdrawal} disabled={isProcessing || tierConfig.isLocked || !withdrawalAmount || parseFloat(withdrawalAmount) < minWithdrawal || parseFloat(withdrawalAmount) > balance} className="w-full" variant="default">
                {tierConfig.isLocked ? <><Lock className="mr-2 h-4 w-4" /> Locked</> : isProcessing ? 'Processing...' : 'Request Withdrawal'}
              </Button>
              {parseFloat(withdrawalAmount) > balance && (<p className="text-xs text-destructive text-center mt-1">Amount exceeds balance for this tier.</p>)}
            </CardContent>
          </Card>
      </div>
    );
  };

  return (
    <>
      <Steps
        enabled={isTourOpen}
        steps={tourSteps}
        initialStep={0}
        onExit={onTourExit}
        options={{
          tooltipClass: 'custom-tooltip-class',
          doneLabel: 'Awesome!',
          nextLabel: 'Next →',
          prevLabel: '← Back',
        }}
      />
      <div className="container mx-auto py-8">
        <Card className="w-full max-w-lg mx-auto shadow-xl">
          <CardHeader className="text-center">
            <div data-tour-id="profile-avatar" className="relative flex justify-center mb-4 group">
              <Avatar className="w-24 h-24 border-4 border-primary shadow-md">
                <AvatarImage src={photoPreview || user.photoURL || undefined} alt={user.displayName || 'User'} />
                <AvatarFallback>{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <label htmlFor="photo-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-8 w-8 text-white" />
              </label>
              <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
            </div>
            {selectedFile && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={handlePhotoUpload} disabled={isUploading}>{isUploading ? 'Uploading...' : 'Save Photo'}</Button>
                  <Button size="sm" onClick={handleCancelUpload} variant="outline" disabled={isUploading}>Cancel</Button>
                </div>
              </div>
            )}
            <CardTitle className="text-3xl font-bold font-headline text-primary">{user.displayName || 'User Profile'}</CardTitle>
            <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <div data-tour-id="tier-selector-tabs">
                <Tabs value={activeTier} onValueChange={setActiveTier} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    {Object.values(appSettings.wheelConfigs).map(tier => (
                        <TabsTrigger key={tier.id} value={tier.id} className="flex items-center gap-2">
                            {tierIcons[tier.id]} {tier.name}
                        </TabsTrigger>
                    ))}
                  </TabsList>
                  {Object.values(appSettings.wheelConfigs).map(tier => (
                    <TabsContent key={tier.id} value={tier.id}>
                        {renderWalletContent(tier)}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>

              <Card className="p-4 pt-2 bg-card shadow-md">
                  <CardHeader className="p-2 pb-4"><CardTitle className="text-xl flex items-center font-headline">Withdrawal Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4 p-2">
                      <div>
                          <Label>Payment Method</Label>
                          <Select value={selectedPaymentMethod} onValueChange={(v) => setSelectedPaymentMethod(v as PaymentMethod)} disabled={isProcessing}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select method" /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="upi"><div className="flex items-center"><Smartphone className="mr-2 h-4 w-4" />UPI</div></SelectItem>
                              <SelectItem value="bank"><div className="flex items-center"><Library className="mr-2 h-4 w-4" />Bank Account</div></SelectItem>
                          </SelectContent>
                          </Select>
                      </div>
                      {selectedPaymentMethod === "upi" && (<div><Label htmlFor="upiIdInput">UPI ID</Label><Input id="upiIdInput" type="text" value={upiIdInput} onChange={(e) => setUpiIdInput(e.target.value)} placeholder="yourname@upi" className="mt-1" disabled={isProcessing} /></div>)}
                      {selectedPaymentMethod === "bank" && (<div className="space-y-3">
                          <div><Label htmlFor="accountHolderName">Account Holder Name</Label><Input id="accountHolderName" type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="e.g., John Doe" className="mt-1" disabled={isProcessing} /></div>
                          <div><Label htmlFor="accountNumber">Account Number</Label><Input id="accountNumber" type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g., 123456789012" className="mt-1" disabled={isProcessing} /></div>
                          <div><Label htmlFor="ifscCode">IFSC Code</Label><Input id="ifscCode" type="text" value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="e.g., SBIN0001234" className="mt-1" disabled={isProcessing} /></div>
                      </div>)}
                      <CardDescription className="text-xs text-center">Your saved details will be used for all withdrawals.</CardDescription>
                  </CardContent>
              </Card>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4 pt-6">
              {userData?.isAdmin && (
                <Link href="/admin" passHref className="w-full max-w-xs">
                  <Button variant="secondary" className="w-full"><Shield className="mr-2 h-4 w-4" />Admin Panel</Button>
                </Link>
              )}
          </CardFooter>
        </Card>
          <PaymentModal
            isOpen={showAddBalanceModal}
            onClose={() => setShowAddBalanceModal(false)}
            onConfirm={handleConfirmAddBalance}
            upiId={appSettings.upiId}
            appName={appSettings.appName}
            amount={currentAmountForModal}
            tierName={activeWheelConfig?.name}
          />
      </div>
    </>
  );
}
