
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DollarSign, User, Mail, Edit3, ArrowDownCircle, ArrowUpCircle, Library, Smartphone, ShieldAlert, QrCode, Camera, Shield, Gem, Crown, Rocket, Star, Copy, Share2, Users as UsersIcon, CalendarDays, Swords, UserPlus, UserMinus, UserCheck, UserX, Send, RefreshCw, Trophy } from 'lucide-react';
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
  UserDocument,
  getUserRewardData,
  UserRewardData,
  getUserTournaments,
  UserTournamentData,
  getAllTournaments,
  Tournament,
  findUserByEmail,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  cancelFriendRequest,
  getFriendsAndRequests,
  FriendAndRequestData,
} from '@/lib/firebase';
import { WheelTierConfig } from '@/lib/appConfig';
import { Steps } from 'intro.js-react';
import { copyToClipboard, cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';


type PaymentMethod = "upi" | "bank";

const tierIcons: { [key: string]: React.ReactNode } = {
  little: <Gem className="mr-2 h-5 w-5" />,
  big: <Crown className="mr-2 h-5 w-5" />,
  'more-big': <Rocket className="mr-2 h-5 w-5" />,
  'stall-machine': <Star className="mr-2 h-5 w-5" />,
};

const StyledCard: React.FC<React.ComponentProps<typeof Card>> = ({ className, ...props }) => (
    <Card 
        className={cn(
            "bg-card/80 backdrop-blur-sm border-border/20 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]",
            className
        )}
        {...props}
    />
);

const FriendsTabContent: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [friendData, setFriendData] = useState<FriendAndRequestData>({ friends: [], incoming: [], outgoing: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [searchEmail, setSearchEmail] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const data = await getFriendsAndRequests(user.uid);
            setFriendData(data);
        } catch (error) {
            console.error("Error fetching friends data:", error);
            toast({ title: 'Error', description: 'Could not load friends list.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSendRequest = async () => {
        if (!user || !searchEmail) return;
        setIsSearching(true);
        try {
            const result = await sendFriendRequest(user.uid, searchEmail);
            if(result.success) {
                toast({ title: 'Request Sent!', description: `Friend request sent to ${searchEmail}.` });
                setSearchEmail('');
                fetchData(); 
            } else {
                toast({ title: 'Could Not Send Request', description: result.error, variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleAccept = async (requestingUserId: string) => { if (!user) return; await acceptFriendRequest(user.uid, requestingUserId); toast({ title: "Friend Added!" }); fetchData(); };
    const handleReject = async (requestingUserId: string) => { if (!user) return; await rejectFriendRequest(user.uid, requestingUserId); toast({ title: "Request Rejected" }); fetchData(); };
    const handleCancel = async (receivingUserId: string) => { if (!user) return; await cancelFriendRequest(user.uid, receivingUserId); toast({ title: "Request Cancelled" }); fetchData(); };
    const handleRemove = async (friendId: string) => { if (!user) return; await removeFriend(user.uid, friendId); toast({ title: "Friend Removed" }); fetchData(); };

    const renderUserCard = (u: UserDocument, actions: React.ReactNode, type: 'friend' | 'request') => (
      <StyledCard key={u.uid} className="flex items-center justify-between p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10"><AvatarImage src={u.photoURL || undefined} /><AvatarFallback>{u.displayName?.[0]}</AvatarFallback></Avatar>
          <div>
            <p className="font-semibold">{u.displayName}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
        <div className="flex gap-2">{actions}</div>
      </StyledCard>
    );

    const renderSection = (title: string, count: number, users: UserDocument[], actions: (user: UserDocument) => React.ReactNode, type: 'friend' | 'request') => (
        <div>
            <h3 className="text-lg font-semibold mb-3">{title} ({count})</h3>
            <div className="space-y-3">
                {isLoading ? (
                    <> <Skeleton className="h-16 w-full" /> <Skeleton className="h-16 w-full" /> </>
                ) : users.length > 0 ? (
                    users.map(u => renderUserCard(u, actions(u), type))
                ) : <p className="text-sm text-muted-foreground text-center py-4">No {title.toLowerCase()}.</p>}
            </div>
        </div>
    );
    
    return (
        <div className="space-y-8">
            <StyledCard>
                <CardHeader><CardTitle className="flex items-center font-headline text-accent"><UserPlus className="mr-2 h-5 w-5"/>Add a Friend</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                   <Label htmlFor="friend-email">Find by Email</Label>
                   <div className="flex gap-2">
                       <Input id="friend-email" type="email" placeholder="friend@example.com" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} disabled={isSearching} />
                       <Button onClick={handleSendRequest} disabled={isSearching || !searchEmail} size="icon">
                         {isSearching ? <RefreshCw className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                       </Button>
                   </div>
                </CardContent>
            </StyledCard>

            {renderSection('Incoming Requests', friendData.incoming.length, friendData.incoming, (u) => (<><Button size="sm" onClick={() => handleAccept(u.uid)}><UserCheck className="mr-2 h-4 w-4" />Accept</Button><Button size="sm" variant="destructive" onClick={() => handleReject(u.uid)}><UserX className="mr-2 h-4 w-4"/>Reject</Button></>), 'request')}
            {renderSection('Friends', friendData.friends.length, friendData.friends, (u) => (<Button size="sm" variant="outline" onClick={() => handleRemove(u.uid)}><UserMinus className="mr-2 h-4 w-4"/>Remove</Button>), 'friend')}
            {renderSection('Sent Requests', friendData.outgoing.length, friendData.outgoing, (u) => (<Button size="sm" variant="ghost" onClick={() => handleCancel(u.uid)}>Cancel</Button>), 'request')}
        </div>
    );
};


export default function ProfilePage() {
  const { user, userData, loading, appSettings } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('wallets');
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
  
  const [referralLink, setReferralLink] = useState('');
  const [userRewardData, setUserRewardData] = useState<UserRewardData | null>(null);
  const [userTournaments, setUserTournaments] = useState<UserTournamentData[]>([]);
  const [allTournaments, setAllTournaments] = useState<(Tournament & {id: string})[]>([]);

  useEffect(() => {
    if (user && userData) {
      if (userData.referralCode) {
        setReferralLink(`${window.location.origin}/login?ref=${userData.referralCode}`);
      }
      if (!loading && userData.toursCompleted?.profilePage === false) {
        setTimeout(() => setIsTourOpen(true), 500);
      }
      getUserRewardData(user.uid).then(setUserRewardData);
      getUserTournaments(user.uid).then(setUserTournaments);
      getAllTournaments().then(setAllTournaments); // Fetch all for name mapping
    }
  }, [user, userData, loading]);

  const onTourExit = () => {
    setIsTourOpen(false);
    if (user) {
        updateUserData(user.uid, { 'toursCompleted.profilePage': true });
    }
  };

  const tourSteps = [
    { element: '[data-tour-id="profile-avatar"]', intro: 'Here you can see your profile picture and name. Click the camera icon to upload a new photo!', },
    { element: '[data-tour-id="daily-streak"]', intro: 'This shows your daily login streak. Keep it going to earn bigger bonuses!', },
    { element: '[data-tour-id="tier-selector-tabs"]', intro: 'You have a separate balance for each game arena. Click these tabs to switch between your wallets.', },
    { element: '[data-tour-id="referral-system"]', intro: 'Share your referral code with friends! You get a bonus when they make their first deposit, and they get a bonus for signing up!', },
    { element: '[data-tour-id="withdraw-funds-section"]', intro: 'Ready to cash out? You can request a withdrawal of your winnings here. Make sure your payment details below are correct!', },
  ];

  const activeWheelConfig = appSettings.wheelConfigs[activeTier];

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
      if (file.size > 2 * 1024 * 1024) { toast({ title: 'File too large', description: 'Please select an image smaller than 2MB.', variant: 'destructive' }); return; }
      setSelectedFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleCancelUpload = () => {
    setSelectedFile(null); setPhotoPreview(null);
    const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handlePhotoUpload = async () => {
    if (!selectedFile || !user || !auth.currentUser) { toast({ title: 'Error', description: 'No file selected or user not authenticated.', variant: 'destructive' }); return; }
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
    } finally { setIsUploading(false); }
  };

  const handleWithdrawal = async () => {
    if (!user || !userData || !activeWheelConfig) return;
    if ((userData.totalDeposited ?? 0) <= 0) { toast({ title: "First Deposit Required", description: "To make a withdrawal, you need to add funds to your account at least once. This is a one-time requirement.", variant: "destructive", duration: 6000 }); return; }
    if (activeWheelConfig.isLocked) { toast({ title: "Arena Locked", description: "Withdrawals are disabled for this arena.", variant: "destructive"}); return; }
    setIsProcessing(true);
    const amount = parseFloat(withdrawalAmount); const balance = userData?.balances?.[activeTier] ?? 0;
    if (isNaN(amount) || amount <= 0) { toast({ title: 'Invalid Amount', variant: 'destructive' }); setIsProcessing(false); return; }
    if (amount < activeWheelConfig.minWithdrawalAmount) { toast({ title: 'Minimum Withdrawal', description: `Min is ₹${activeWheelConfig.minWithdrawalAmount.toFixed(2)} for ${activeWheelConfig.name}.`, variant: 'destructive' }); setIsProcessing(false); return; }
    if (amount > balance) { toast({ title: 'Insufficient Balance', variant: 'destructive' }); setIsProcessing(false); return; }
    let paymentDetails: any = { paymentMethod: selectedPaymentMethod };
    if (selectedPaymentMethod === "upi") { if (!upiIdInput.trim()) { toast({ title: 'UPI ID Required', variant: 'destructive' }); setIsProcessing(false); return; } paymentDetails.upiId = upiIdInput.trim(); }
    else { if (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim()) { toast({ title: 'Bank Details Required', variant: 'destructive' }); setIsProcessing(false); return; } paymentDetails.bankDetails = { accountHolderName: accountHolderName.trim(), accountNumber: accountNumber.trim(), ifscCode: ifscCode.trim() }; }
    try {
      await createWithdrawalRequest({ userId: user.uid, userEmail: user.email || 'N/A', amount, tierId: activeTier, ...paymentDetails });
      await logUserActivity(user.uid, user.email, 'withdrawalRequest');
      const userUpdateData: Partial<UserDocument> = {};
      if (selectedPaymentMethod === "upi") userUpdateData.upiIdForWithdrawal = upiIdInput.trim(); else userUpdateData.bankDetailsForWithdrawal = paymentDetails.bankDetails;
      await updateUserData(user.uid, userUpdateData);
      toast({ title: 'Withdrawal Request Submitted', description: `Request for ₹${amount.toFixed(2)} from ${activeWheelConfig.name} is pending.` });
      setWithdrawalAmount('');
    } catch (error) { console.error("Withdrawal request error:", error); toast({ title: 'Request Failed', description: 'Could not submit withdrawal request.', variant: 'destructive' }); }
    finally { setIsProcessing(false); }
  };

  const handleOpenAddBalanceModal = (amountValue: number) => {
    if (isNaN(amountValue) || amountValue < appSettings.minAddBalanceAmount) { toast({ title: 'Invalid Amount', description: `Min to add is ₹${appSettings.minAddBalanceAmount.toFixed(2)}.`, variant: 'destructive' }); return; }
    setCurrentAmountForModal(amountValue); setShowAddBalanceModal(true);
  };
  
  const handleConfirmAddBalance = async () => {
    if (!user || !activeWheelConfig) return; setIsProcessing(true); const amount = currentAmountForModal;
    try {
      await createAddFundRequest({ userId: user.uid, userEmail: user.email || 'N/A', amount, tierId: activeTier, paymentReference: "User Confirmed Payment In Modal", });
      await logUserActivity(user.uid, user.email, 'addFundRequest');
      toast({ title: 'Add Balance Request Submitted', description: `Request to add ₹${amount.toFixed(2)} to ${activeWheelConfig.name} is pending.`, variant: 'default' });
      setAddBalanceAmount('');
    } catch (error) { console.error("Add fund request error:", error); toast({ title: 'Request Failed', description: 'Could not submit add fund request.', variant: 'destructive' }); }
    finally { setShowAddBalanceModal(false); setIsProcessing(false); }
  };

  const handleCopy = async (textToCopy: string | null | undefined, type: 'Code' | 'Link') => {
    if (!textToCopy) { toast({ title: "Nothing to Copy", description: `Referral ${type} is not available yet.`, variant: "destructive" }); return; }
    try { await copyToClipboard(textToCopy); toast({ title: `${type} Copied!`, description: `Your Referral ${type} is copied to the clipboard.` }); }
    catch (err) { toast({ title: `Copy Failed`, description: `Could not copy the ${type}.`, variant: "destructive" }); }
  };

  if (loading) { return ( <div className="flex items-center justify-center min-h-[calc(100vh-200px)]"><RefreshCw className="h-12 w-12 animate-spin text-primary" /></div> ); }
  if (!user || !userData) { return ( <div className="flex items-center justify-center min-h-[calc(100vh-200px)]"><Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center"><ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" /><CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle><CardDescription className="text-muted-foreground mt-2">Please log in to view your profile.</CardDescription><Button onClick={() => router.push('/login')} className="mt-6">Go to Login</Button></Card></div> ) }

  const renderWalletContent = (tierConfig: WheelTierConfig) => {
    const balance = userData?.balances?.[tierConfig.id] ?? 0;
    const minWithdrawal = tierConfig.minWithdrawalAmount;
    return (
      <div className="space-y-6">
          <div data-tour-id="balance-display" className="flex items-center p-6 border-2 border-primary rounded-lg bg-primary/10 shadow-inner">
            <DollarSign className="h-8 w-8 mr-4 text-primary" />
            <div><p className="text-sm font-medium text-primary">Current Balance</p><p className="font-bold text-4xl text-primary">₹{balance.toFixed(2)}</p></div>
          </div>
          <StyledCard data-tour-id="add-balance-section">
            <CardHeader><CardTitle className="text-xl flex items-center font-headline text-accent"><ArrowUpCircle className="mr-2 h-6 w-6" />Add Balance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
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
          </StyledCard>
          <StyledCard data-tour-id="withdraw-funds-section">
            <CardHeader><CardTitle className="text-xl flex items-center font-headline text-primary"><ArrowDownCircle className="mr-2 h-6 w-6" />Withdraw Funds</CardTitle>{tierConfig.isLocked && ( <CardDescription className="text-destructive flex items-center gap-1 pt-1"><UserX className="h-3 w-3" /> Withdrawals disabled: Arena is locked.</CardDescription> )}</CardHeader>
            <CardContent className="space-y-4">
               <div><Label htmlFor="withdrawalAmount" className="text-sm font-medium text-muted-foreground">Amount to Withdraw (Min. ₹{minWithdrawal.toFixed(2)})</Label><Input id="withdrawalAmount" type="number" value={withdrawalAmount} onChange={(e) => setWithdrawalAmount(e.target.value)} placeholder={`e.g. ${minWithdrawal}`} className="mt-1" disabled={isProcessing || tierConfig.isLocked} /></div>
               <Button onClick={handleWithdrawal} disabled={isProcessing || tierConfig.isLocked || !withdrawalAmount || parseFloat(withdrawalAmount) < minWithdrawal || parseFloat(withdrawalAmount) > balance} className="w-full" variant="default">{tierConfig.isLocked ? <><UserX className="mr-2 h-4 w-4" /> Locked</> : isProcessing ? 'Processing...' : 'Request Withdrawal'}</Button>
              {parseFloat(withdrawalAmount) > balance && (<p className="text-xs text-destructive text-center mt-1">Amount exceeds balance for this tier.</p>)}
            </CardContent>
          </StyledCard>
      </div>
    );
  };
  
  const currentStreak = userRewardData?.currentStreak || 0;
  const nextBonus = appSettings.rewardConfig.streakBonuses.find(b => b.afterDays > currentStreak);
  const TABS_CONFIG = [
    { value: 'wallets', label: 'Wallets', icon: Wallet },
    { value: 'friends', label: 'Friends', icon: UsersIcon },
    { value: 'tournaments', label: 'Tournaments', icon: Swords },
    { value: 'referrals', label: 'Referrals', icon: Share2 },
    { value: 'settings', label: 'Settings', icon: Edit3 },
  ];

  return (
    <>
      <Steps enabled={isTourOpen} steps={tourSteps} initialStep={0} onExit={onTourExit} options={{ tooltipClass: 'custom-tooltip-class', doneLabel: 'Awesome!', nextLabel: 'Next →', prevLabel: '← Back' }} />
      <div className="container mx-auto py-8">
        <StyledCard className="w-full max-w-lg mx-auto">
          <CardHeader className="text-center">
            <div data-tour-id="profile-avatar" className="relative flex justify-center mb-4 group">
              <Avatar className="w-24 h-24 border-4 border-primary shadow-md"><AvatarImage src={photoPreview || user.photoURL || undefined} alt={user.displayName || 'User'} /><AvatarFallback>{user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback></Avatar>
              <label htmlFor="photo-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><Camera className="h-8 w-8 text-white" /></label>
              <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isUploading} />
            </div>
            {selectedFile && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="flex gap-2">
                  <Button size="sm" onClick={handlePhotoUpload} disabled={isUploading}>{isUploading ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Uploading...</> : 'Save Photo'}</Button>
                  <Button size="sm" onClick={handleCancelUpload} variant="outline" disabled={isUploading}>Cancel</Button>
                </div>
              </div>
            )}
            <CardTitle className="text-3xl font-bold font-headline text-primary">{user.displayName || 'User Profile'}</CardTitle>
            <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
                  {TABS_CONFIG.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} className="flex-col sm:flex-row h-14 sm:h-10 gap-1 sm:gap-2">
                        <tab.icon className="h-5 w-5" /> <span className="text-xs sm:text-sm">{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="mt-6">
                <TabsContent value="wallets">
                  <div className="space-y-6">
                    <StyledCard data-tour-id="daily-streak">
                        <CardHeader><CardTitle className="text-xl flex items-center font-headline text-accent"><CalendarDays className="mr-2 h-6 w-6"/>Daily Streak</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                        <div className="text-center"><p className="text-sm text-muted-foreground">Current Streak</p><p className="text-4xl font-bold text-primary">{currentStreak} Day{currentStreak !== 1 ? 's' : ''}</p></div>
                        {nextBonus && (
                            <div className="text-center">
                            <Label>Next Bonus in {nextBonus.afterDays - currentStreak} Day{nextBonus.afterDays - currentStreak > 1 ? 's' : ''}</Label>
                            <Progress value={(currentStreak / nextBonus.afterDays) * 100} className="w-full mt-1" />
                            <p className="text-xs text-muted-foreground mt-1">Claim {nextBonus.emoji} {nextBonus.type === 'credit' ? `₹${nextBonus.value}` : `${nextBonus.value} Spins`} on Day {nextBonus.afterDays}</p>
                            </div>
                        )}
                        </CardContent>
                    </StyledCard>
                    <div data-tour-id="tier-selector-tabs">
                        <Tabs value={activeTier} onValueChange={setActiveTier} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                            {Object.values(appSettings.wheelConfigs).map(tier => (<TabsTrigger key={tier.id} value={tier.id} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm h-12">{tierIcons[tier.id]} {tier.name}</TabsTrigger>))}
                        </TabsList>
                        {Object.values(appSettings.wheelConfigs).map(tier => (<TabsContent key={tier.id} value={tier.id} className="pt-4">{renderWalletContent(tier)}</TabsContent>))}
                        </Tabs>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="friends"><FriendsTabContent /></TabsContent>
                <TabsContent value="tournaments">
                   <StyledCard>
                    <CardHeader><CardTitle className="text-xl flex items-center font-headline text-accent"><Swords className="mr-2 h-6 w-6"/>My Tournaments</CardTitle></CardHeader>
                     <CardContent className="space-y-3">
                        {userTournaments.length === 0 ? (<p className="text-center text-muted-foreground py-4">You haven't joined any tournaments yet.</p>) 
                        : ( userTournaments.map(ut => {
                            const tournamentDetails = allTournaments.find(t => t.id === ut.tournamentId);
                            return (
                              <StyledCard key={ut.tournamentId} className="flex justify-between items-center p-3">
                                <div><p className="font-semibold">{tournamentDetails?.name || 'Tournament'}</p><p className="text-sm text-muted-foreground">Score: <span className="font-bold text-primary">{ut.score}</span></p></div>
                                {ut.prizeWon && <Badge variant="default" className="bg-yellow-500 text-white flex items-center gap-1"><Trophy className="h-4 w-4"/>Rank #{ut.rank} - Won ₹{ut.prizeWon.prize}</Badge>}
                              </StyledCard>
                            )
                          }))}
                     </CardContent>
                  </StyledCard>
                </TabsContent>
                <TabsContent value="referrals">
                  <StyledCard data-tour-id="referral-system">
                    <CardHeader><CardTitle className="text-xl flex items-center font-headline text-accent"><UsersIcon className="mr-2 h-6 w-6"/>Referral System</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div><Label htmlFor="referralCode">Your Referral Code</Label><div className="flex items-center gap-2 mt-1"><Input id="referralCode" type="text" readOnly value={userData.referralCode || 'N/A'} className="bg-muted"/><Button variant="outline" size="icon" onClick={() => handleCopy(userData.referralCode, 'Code')}><Copy className="w-4 h-4" /></Button></div></div>
                      <div><Label htmlFor="referralLink">Your Referral Link</Label><div className="flex items-center gap-2 mt-1"><Input id="referralLink" type="text" readOnly value={referralLink} className="bg-muted"/><Button variant="outline" size="icon" onClick={() => handleCopy(referralLink, 'Link')}><Share2 className="w-4 h-4" /></Button></div></div>
                      <div className="grid grid-cols-2 gap-4 text-center pt-2">
                          <div><p className="text-sm text-muted-foreground">Successful Referrals</p><p className="text-2xl font-bold text-primary">{userData.referrals?.length || 0}</p></div>
                          <div><p className="text-sm text-muted-foreground">Total Earnings</p><p className="text-2xl font-bold text-primary">₹{(userData.referralEarnings || 0).toFixed(2)}</p></div>
                      </div>
                       <CardDescription className="text-xs text-center">New users get ₹{appSettings.referralBonusForNewUser} bonus. You get ₹{appSettings.referralBonusForReferrer} on their first deposit!</CardDescription>
                    </CardContent>
                  </StyledCard>
                </TabsContent>
                <TabsContent value="settings">
                   <StyledCard>
                      <CardHeader><CardTitle className="text-xl flex items-center font-headline">Withdrawal Details</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
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
                          <CardDescription className="text-xs text-center">Your saved details will be used for all withdrawals. Make sure they are correct.</CardDescription>
                      </CardContent>
                  </StyledCard>
                </TabsContent>
                </div>
              </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4 pt-6">
              {(userData?.role === 'admin' || userData?.role === 'super-admin') && (
                <Button asChild variant="secondary" className="w-full max-w-xs">
                  <Link href="/admin"><Shield className="mr-2 h-4 w-4" />Admin Panel</Link>
                </Button>
              )}
          </CardFooter>
        </StyledCard>
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

    