
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShieldCheck, Settings, Users, Home, ShieldAlert, ListPlus, Trash2, Save, Edit2, X, ClipboardList, Banknote, History, PackageCheck, PackageX, Newspaper, Trophy, RefreshCcw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { AppSettings, initialSettings as fallbackAppSettings, DEFAULT_NEWS_ITEMS as fallbackNewsItems } from '@/lib/appConfig';
import {
  saveAppSettingsToFirestore,
  saveNewsItemsToFirestore,
  getWithdrawalRequests,
  WithdrawalRequestData,
  updateWithdrawalRequestStatus,
  getAddFundRequests,
  AddFundRequestData,
  updateAddFundRequestStatus,
  approveAddFundAndUpdateBalance,
  approveWithdrawalAndUpdateBalance,
  getAllUsers,
  UserDocument,
  getAllTransactions,
  TransactionData,
  getLeaderboardUsers,
  Timestamp
} from '@/lib/firebase';

const ADMIN_EMAIL_CHECK = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "jameafaizanrasool@gmail.com";

export default function AdminPage() {
  const { user, loading: authLoading, appSettings: contextAppSettings, newsItems: contextNewsItems, isAppConfigLoading, refreshAppConfig } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [currentAppSettings, setCurrentAppSettings] = useState<AppSettings>(fallbackAppSettings);
  const [currentNewsItems, setCurrentNewsItems] = useState<string[]>(fallbackNewsItems);
  
  const [newNewsItem, setNewNewsItem] = useState('');
  const [editingNewsItemIndex, setEditingNewsItemIndex] = useState<number | null>(null);
  const [editingNewsItemText, setEditingNewsItemText] = useState('');
  
  const [withdrawalRequests, setWithdrawalRequests] = useState<(WithdrawalRequestData & {id: string})[]>([]);
  const [addFundRequests, setAddFundRequests] = useState<(AddFundRequestData & {id:string})[]>([]);
  const [allUsers, setAllUsers] = useState<(UserDocument & {id: string})[]>([]);
  const [allTransactions, setAllTransactions] = useState<(TransactionData & {id: string})[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserDocument[]>([]);
  
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  useEffect(() => {
    if (isClient && !isAppConfigLoading) {
      setCurrentAppSettings(contextAppSettings);
      setCurrentNewsItems(contextNewsItems);
    }
  }, [isClient, contextAppSettings, contextNewsItems, isAppConfigLoading]);

  const fetchAdminData = useCallback(async () => {
    if (!isClient) return;
    setIsLoadingData(true);
    try {
      const [withdrawals, adds, users, transactions, leaderboardUsers] = await Promise.all([
        getWithdrawalRequests(),
        getAddFundRequests(),
        getAllUsers(),
        getAllTransactions(),
        getLeaderboardUsers(20)
      ]);
      setWithdrawalRequests(withdrawals);
      setAddFundRequests(adds);
      setAllUsers(users);
      setAllTransactions(transactions);
      setLeaderboard(leaderboardUsers);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({ title: "Error Fetching Data", description: "Could not load admin data.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [isClient, toast]);

  useEffect(() => {
    if (user && user.email === ADMIN_EMAIL_CHECK && isClient) {
      fetchAdminData();
    }
  }, [user, isClient, fetchAdminData]);


  useEffect(() => {
    if (!authLoading && isClient) {
      if (!user || user.email !== ADMIN_EMAIL_CHECK) {
        router.push('/'); 
      }
    }
  }, [user, authLoading, router, isClient]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCurrentAppSettings(prev => ({
      ...prev,
      [name]: typeof prev[name as keyof AppSettings] === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSaveAppSettings = async () => {
    try {
      await saveAppSettingsToFirestore(currentAppSettings);
      await refreshAppConfig();
      toast({ title: "Game Settings Saved", description: "Changes saved to Firestore." });
    } catch (error) {
      console.error("Error saving app settings:", error);
      toast({ title: "Save Failed", description: "Could not save game settings.", variant: "destructive" });
    }
  };

  const handleAddNewsItem = () => {
    if (newNewsItem.trim() === '') return;
    setCurrentNewsItems(prev => [...prev, newNewsItem.trim()]);
    setNewNewsItem('');
  };

  const handleRemoveNewsItem = (index: number) => {
    setCurrentNewsItems(prev => prev.filter((_, i) => i !== index));
  };
  
  const startEditNewsItem = (index: number) => {
    setEditingNewsItemIndex(index);
    setEditingNewsItemText(currentNewsItems[index]);
  };

  const handleSaveEditedNewsItem = () => {
    if (editingNewsItemIndex === null) return;
    const updatedNewsItems = [...currentNewsItems];
    updatedNewsItems[editingNewsItemIndex] = editingNewsItemText;
    setCurrentNewsItems(updatedNewsItems);
    setEditingNewsItemIndex(null);
    setEditingNewsItemText('');
  };

  const handleSaveNewsItems = async () => {
    try {
      await saveNewsItemsToFirestore(currentNewsItems);
      await refreshAppConfig();
      toast({ title: "News Items Saved", description: "News ticker items saved to Firestore." });
    } catch (error) {
      console.error("Error saving news items:", error);
      toast({ title: "Save Failed", description: "Could not save news items.", variant: "destructive" });
    }
  };

  const handleApproveAddFund = async (request: AddFundRequestData & {id: string}) => {
    try {
      await approveAddFundAndUpdateBalance(request.id, request.userId, request.amount);
      toast({ title: "Fund Request Approved", description: `₹${request.amount} added to user ${request.userEmail}.`});
      fetchAdminData();
    } catch (error: any) {
      console.error("Error approving add fund request:", error);
      toast({ title: "Approval Failed", description: error.message || "Could not approve request.", variant: "destructive" });
    }
  };
  
  const handleRejectAddFund = async (requestId: string) => {
     try {
      await updateAddFundRequestStatus(requestId, "rejected", "Rejected by admin.");
      toast({ title: "Fund Request Rejected" });
      fetchAdminData();
    } catch (error) {
      console.error("Error rejecting add fund request:", error);
      toast({ title: "Rejection Failed", variant: "destructive" });
    }
  };

  const handleApproveWithdrawal = async (request: WithdrawalRequestData & {id: string}) => {
    const paymentMethodDetails = request.paymentMethod === 'upi' ? `UPI: ${request.upiId}` : `Bank: A/C ending ${request.bankDetails?.accountNumber.slice(-4)}`;
    try {
      await approveWithdrawalAndUpdateBalance(request.id, request.userId, request.amount, paymentMethodDetails);
      toast({ title: "Withdrawal Approved & Processed", description: `₹${request.amount} processed for ${request.userEmail}.`});
      fetchAdminData();
    } catch (error: any) {
      console.error("Error approving withdrawal request:", error);
      toast({ title: "Approval Failed", description: error.message || "Could not approve withdrawal.", variant: "destructive" });
    }
  };

  const handleRejectWithdrawal = async (requestId: string) => {
    try {
      await updateWithdrawalRequestStatus(requestId, "rejected", "Rejected by admin.");
      toast({ title: "Withdrawal Request Rejected" });
      fetchAdminData();
    } catch (error) {
      console.error("Error rejecting withdrawal request:", error);
      toast({ title: "Rejection Failed", variant: "destructive" });
    }
  };

  if (authLoading || !isClient || isAppConfigLoading || (!user || user.email !== ADMIN_EMAIL_CHECK)) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        {(authLoading || !isClient || isAppConfigLoading) ? (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        ) : (
          <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">You do not have permission.</CardDescription>
            <Button onClick={() => router.push('/')} className="mt-6">Go to Home</Button>
          </Card>
        )}
      </div>
    );
  }

  const getLabelForKey = (key: string) => {
    switch (key) {
      case 'upiId': return 'UPI ID (for receiving payments)';
      case 'spinRefillPrice': return 'Spin Refill Price (₹)';
      case 'maxSpinsInBundle': return 'Max Spins in Bundle';
      case 'initialBalanceForNewUsers': return 'Initial Balance for New Users (₹)';
      case 'tier1Limit': return 'Tier 1 Spin Limit (Daily)';
      case 'tier1Cost': return 'Tier 1 Spin Cost (₹)';
      case 'tier2Limit': return 'Tier 2 Spin Limit (Daily)';
      case 'tier2Cost': return 'Tier 2 Spin Cost (₹)';
      case 'tier3Cost': return 'Tier 3 Spin Cost (₹)';
      case 'minWithdrawalAmount': return 'Min Withdrawal Amount (₹)';
      case 'minAddBalanceAmount': return 'Min Add Balance Amount (₹)';
      case 'newsTickerSpeed': return 'News Ticker Speed (seconds)';
      default: return key.replace(/([A-Z])/g, ' $1').trim();
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center p-4 space-y-8">
      <Card className="w-full max-w-7xl shadow-xl bg-card text-card-foreground rounded-lg">
        <CardHeader className="items-center text-center border-b pb-6">
          <ShieldCheck className="h-16 w-16 text-primary mb-3" />
          <CardTitle className="text-4xl font-bold font-headline text-primary">Admin Panel</CardTitle>
          <CardDescription className="text-muted-foreground text-lg mt-1">Spinify Game Management</CardDescription>
           <Link href="/" passHref className="mt-4"><Button variant="outline"><Home className="mr-2 h-4 w-4" />Back to App</Button></Link>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mb-6 h-auto flex-wrap">
              <TabsTrigger value="overview"><Users className="mr-2 h-4 w-4"/>Overview</TabsTrigger>
              <TabsTrigger value="add-fund"><Banknote className="mr-2 h-4 w-4"/>Add Fund Req.</TabsTrigger>
              <TabsTrigger value="withdrawal-req"><ClipboardList className="mr-2 h-4 w-4"/>Withdrawal Req.</TabsTrigger>
              <TabsTrigger value="transactions"><History className="mr-2 h-4 w-4" />All Transactions</TabsTrigger>
              <TabsTrigger value="leaderboard"><Trophy className="mr-2 h-4 w-4"/>Leaderboard</TabsTrigger>
              <TabsTrigger value="game-settings"><Settings className="mr-2 h-4 w-4"/>Game Settings</TabsTrigger>
              <TabsTrigger value="news-ticker"><Newspaper className="mr-2 h-4 w-4"/>News Ticker</TabsTrigger>
            </TabsList>

             <TabsContent value="overview">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Users /> User Overview</CardTitle><CardDescription>List of all registered users. You can manage them from here.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Balance (₹)</TableHead><TableHead>Spins</TableHead><TableHead>Total Winnings (₹)</TableHead><TableHead>Joined On</TableHead><TableHead>Is Admin</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData && <TableRow><TableCell colSpan={6} className="text-center"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading users...</TableCell></TableRow>}
                      {!isLoadingData && allUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                               <Avatar className="w-8 h-8 border-2 border-border">
                                <AvatarImage src={u.photoURL || undefined} alt={u.displayName || 'User'}/>
                                <AvatarFallback>{u.displayName?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{u.displayName}</p>
                                <p className="text-xs text-muted-foreground">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{u.balance.toFixed(2)}</TableCell>
                          <TableCell>{u.spinsAvailable}</TableCell>
                          <TableCell>{u.totalWinnings?.toFixed(2) ?? '0.00'}</TableCell>
                          <TableCell>{u.createdAt instanceof Timestamp ? u.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                          <TableCell><Badge variant={u.isAdmin ? 'default' : 'secondary'}>{u.isAdmin ? 'Yes' : 'No'}</Badge></TableCell>
                        </TableRow>))}
                      {!isLoadingData && allUsers.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No users found.</TableCell></TableRow>)}
                    </TableBody></Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="game-settings">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Settings /> Game Settings</CardTitle><CardDescription>Modify core game parameters. Saved to Firestore.</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.keys(currentAppSettings) as Array<keyof AppSettings>).map((key) => (
                    <div key={key} className="space-y-1">
                      <Label htmlFor={key} className="capitalize">{getLabelForKey(key)}</Label>
                      <Input type={typeof currentAppSettings[key] === 'number' ? 'number' : 'text'} id={key} name={key} value={currentAppSettings[key]} onChange={handleSettingsChange} className="bg-background" step={key.toLowerCase().includes('cost') || key.toLowerCase().includes('price') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('amount') ? "0.01" : "1"}/>
                    </div>
                  ))}
                </CardContent>
                <CardFooter><Button onClick={handleSaveAppSettings}><Save className="mr-2 h-4 w-4" />Save Game Settings</Button></CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="news-ticker">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><ListPlus /> News Ticker</CardTitle><CardDescription>Manage news ticker items. Saved to Firestore.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {currentNewsItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {editingNewsItemIndex === index ? (
                        <><Textarea value={editingNewsItemText} onChange={(e) => setEditingNewsItemText(e.target.value)} className="flex-grow bg-background" rows={2}/>
                          <Button onClick={handleSaveEditedNewsItem} size="icon" variant="outline"><Save className="h-4 w-4 text-green-500" /></Button>
                          <Button onClick={() => setEditingNewsItemIndex(null)} size="icon" variant="ghost"><X className="h-4 w-4" /></Button></>
                      ) : (
                        <><Input value={item} readOnly className="flex-grow bg-background/50" />
                          <Button onClick={() => startEditNewsItem(index)} variant="outline" size="icon"><Edit2 className="h-4 w-4 text-blue-500" /></Button>
                          <Button onClick={() => handleRemoveNewsItem(index)} variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Textarea placeholder="New news item..." value={newNewsItem} onChange={(e) => setNewNewsItem(e.target.value)} className="flex-grow bg-background" rows={2}/>
                    <Button onClick={handleAddNewsItem} variant="outline" className="self-end">Add Item</Button>
                  </div>
                </CardContent>
                <CardFooter><Button onClick={handleSaveNewsItems}><Save className="mr-2 h-4 w-4" />Save News Items</Button></CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="add-fund">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Banknote /> Add Fund Requests</CardTitle><CardDescription>Manage pending user fund additions.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>Req ID</TableHead><TableHead>User Email</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Payment Ref</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData && <TableRow><TableCell colSpan={7} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading requests...</TableCell></TableRow>}
                      {!isLoadingData && addFundRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium text-xs">{req.id.substring(0,10)}...</TableCell><TableCell>{req.userEmail}</TableCell><TableCell>{req.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{req.paymentReference}</TableCell>
                          <TableCell>{req.requestDate instanceof Timestamp ? req.requestDate.toDate().toLocaleDateString() : new Date(req.requestDate).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>{req.status}</Badge></TableCell>
                          <TableCell>
                            {req.status === 'pending' && (<div className="flex gap-1">
                              <Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApproveAddFund(req)}><PackageCheck className="mr-1 h-3 w-3"/>Approve</Button>
                              <Button variant="destructive" size="sm" onClick={() => handleRejectAddFund(req.id)}><PackageX className="mr-1 h-3 w-3"/>Reject</Button>
                            </div>)}
                          </TableCell></TableRow>))}
                      {!isLoadingData && addFundRequests.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground h-24">No pending add fund requests.</TableCell></TableRow>)}
                    </TableBody></Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="withdrawal-req">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList /> Withdrawal Requests</CardTitle><CardDescription>Manage pending user withdrawals.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>Req ID</TableHead><TableHead>User Email</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Details</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData && <TableRow><TableCell colSpan={7} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading requests...</TableCell></TableRow>}
                      {!isLoadingData && withdrawalRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium text-xs">{req.id.substring(0,10)}...</TableCell><TableCell>{req.userEmail}</TableCell><TableCell>{req.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-xs">{req.paymentMethod === 'upi' ? `UPI: ${req.upiId}` : `Bank: ${req.bankDetails?.accountHolderName}, A/C ...${req.bankDetails?.accountNumber.slice(-4)}`}</TableCell>
                          <TableCell>{req.requestDate instanceof Timestamp ? req.requestDate.toDate().toLocaleDateString() : new Date(req.requestDate).toLocaleDateString()}</TableCell>
                          <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : (req.status === 'processed' || req.status === 'approved') ? 'default' : 'destructive'}>{req.status}</Badge></TableCell>
                          <TableCell>
                            {req.status === 'pending' && (<div className="flex gap-1">
                              <Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApproveWithdrawal(req)}><PackageCheck className="mr-1 h-3 w-3"/>Approve</Button>
                              <Button variant="destructive" size="sm" onClick={() => handleRejectWithdrawal(req.id)}><PackageX className="mr-1 h-3 w-3"/>Reject</Button>
                            </div>)}
                          </TableCell></TableRow>))}
                      {!isLoadingData && withdrawalRequests.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground h-24">No pending withdrawal requests.</TableCell></TableRow>)}
                    </TableBody></Table>
                </CardContent>
              </Card>
            </TabsContent>
            
             <TabsContent value="transactions">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><History /> All Transactions</CardTitle><CardDescription>History of all transactions across all users.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>User Email</TableHead><TableHead>Type</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData && <TableRow><TableCell colSpan={6} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading transactions...</TableCell></TableRow>}
                      {!isLoadingData && allTransactions.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.userEmail}</TableCell>
                            <TableCell>
                                <span className={`flex items-center gap-1 ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'credit' ? <ArrowUpRight className="h-4 w-4"/> : <ArrowDownLeft className="h-4 w-4"/>}
                                    {t.type}
                                </span>
                            </TableCell>
                            <TableCell className={`font-semibold ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{t.amount.toFixed(2)}</TableCell>
                            <TableCell>{t.description}</TableCell>
                            <TableCell>{t.date instanceof Timestamp ? t.date.toDate().toLocaleString() : new Date(t.date as any).toLocaleString()}</TableCell>
                            <TableCell><Badge variant={t.status === 'completed' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'}>{t.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {!isLoadingData && allTransactions.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No transactions found.</TableCell></TableRow>)}
                    </TableBody></Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Trophy /> Leaderboard</CardTitle><CardDescription>Top players by total winnings.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Player</TableHead><TableHead className="text-right">Total Winnings (₹)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData && <TableRow><TableCell colSpan={3} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading leaderboard...</TableCell></TableRow>}
                      {!isLoadingData && leaderboard.map((player, index) => (
                        <TableRow key={player.uid}>
                            <TableCell className="font-bold">{index + 1}</TableCell>
                            <TableCell>{player.displayName || player.email}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">₹{player.totalWinnings.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {!isLoadingData && leaderboard.length === 0 && (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground h-24">Leaderboard is empty.</TableCell></TableRow>)}
                    </TableBody></Table>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
