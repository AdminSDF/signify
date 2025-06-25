
"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  ShieldCheck, Settings, Users, Home, ShieldAlert, ListPlus, Trash2, Save, Edit2, X, ClipboardList, Banknote, History,
  PackageCheck, PackageX, Newspaper, Trophy, RefreshCcw, ArrowDownLeft, ArrowUpRight, PlusCircle, Wand2, LifeBuoy, GripVertical, Ban,
  ArrowRightLeft, Activity, BarChart2, Sunrise, Sun, Sunset, Moon, Lock, Wallet, Landmark, Pencil, Star, Gamepad2, BrainCircuit, Users2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { AppSettings, initialSettings as fallbackAppSettings, DEFAULT_NEWS_ITEMS as fallbackNewsItems, WheelTierConfig, SegmentConfig, WinRateRule } from '@/lib/appConfig';
import {
  saveAppConfigurationToFirestore,
  getWithdrawalRequests,
  WithdrawalRequestData,
  updateWithdrawalRequestStatus,
  getAddFundRequests,
  AddFundRequestData,
  updateAddFundRequestStatus,
  approveAddFundAndUpdateBalance,
  approveWithdrawalAndUpdateBalance,
  updateUserData,
  getAllTransactions,
  TransactionData,
  getLeaderboardUsers,
  Timestamp,
  AppConfiguration,
  getSupportTickets,
  SupportTicketData,
  updateSupportTicketStatus,
  getActivitySummary,
  ActivitySummary,
  getFraudAlerts,
  FraudAlertData,
  getGlobalStats,
  GlobalStats,
  db,
  UserDocument
} from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { collection, onSnapshot, query } from 'firebase/firestore';


// --- HELPER FUNCTIONS (Moved outside component for stability) ---
const getTierName = (tierId: string | null | undefined, wheelConfigs: { [key: string]: WheelTierConfig }): string => {
    if (!tierId) return 'N/A';
    if (wheelConfigs && wheelConfigs[tierId] && wheelConfigs[tierId].name) {
        return wheelConfigs[tierId].name;
    }
    return tierId;
};

const getUserBalanceForTier = (user: UserDocument, tierId: string): string => {
    if (user && user.balances && typeof user.balances[tierId] === 'number') {
        const balance = user.balances[tierId];
        return balance.toFixed(2);
    }
    return '0.00';
};

const getAvatarFallback = (user: UserDocument): string => {
    if (user.displayName && user.displayName.length > 0) {
        return user.displayName[0].toUpperCase();
    }
    if (user.email && user.email.length > 0) {
        return user.email[0].toUpperCase();
    }
    return 'U';
};

const getPaymentDetailsString = (req: WithdrawalRequestData): string => {
    if (!req) return 'N/A';
    
    if (req.paymentMethod === 'upi') {
        return `UPI: ${req.upiId || 'N/A'}`;
    }

    if (req.paymentMethod === 'bank' && req.bankDetails) {
        const { accountHolderName, accountNumber } = req.bankDetails;
        const lastFour = accountNumber ? `...${accountNumber.slice(-4)}` : '';
        if (accountHolderName) {
            return `Bank: ${accountHolderName}, A/C ${lastFour}`;
        }
        return `Bank: A/C ${lastFour}`;
    }

    return 'N/A';
};

const formatDisplayDate = (dateInput: any, format: 'datetime' | 'date' = 'datetime'): string => {
    if (!dateInput) return 'N/A';
    
    let dateObj: Date;
    if (dateInput instanceof Timestamp) {
      dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      dateObj = dateInput;
    } else {
      dateObj = new Date(dateInput);
    }
  
    if (isNaN(dateObj.getTime())) {
      return 'N/A';
    }
  
    if (format === 'date') {
      return dateObj.toLocaleDateString();
    }
    return dateObj.toLocaleString();
};

const StatCard = ({ title, value, icon, description }: { title: string, value: string | number, icon: React.ReactNode, description?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);


// --- ADMIN PAGE COMPONENT ---

export default function AdminPage() {
  const { user, userData, loading, appSettings, newsItems, refreshAppConfig } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [currentAppSettings, setCurrentAppSettings] = useState<AppSettings>(fallbackAppSettings);
  const [currentNewsItems, setCurrentNewsItems] = useState<string[]>(fallbackNewsItems);
  const [addBalancePresetsInput, setAddBalancePresetsInput] = useState('');
  
  const [newNewsItem, setNewNewsItem] = useState('');
  const [editingNewsItemIndex, setEditingNewsItemIndex] = useState<number | null>(null);
  const [editingNewsItemText, setEditingNewsItemText] = useState('');
  
  const [withdrawalRequests, setWithdrawalRequests] = useState<(WithdrawalRequestData & {id: string})[]>([]);
  const [addFundRequests, setAddFundRequests] = useState<(AddFundRequestData & {id:string})[]>([]);
  const [allUsers, setAllUsers] = useState<(UserDocument & {id: string})[]>([]);
  const [allTransactions, setAllTransactions] = useState<(TransactionData & {id: string})[]>([]);
  const [leaderboard, setLeaderboard] = useState<UserDocument[]>([]);
  const [supportTickets, setSupportTickets] = useState<(SupportTicketData & {id: string})[]>([]);
  const [activitySummary, setActivitySummary] = useState<ActivitySummary | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<(FraudAlertData & {id: string})[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [draggedSegment, setDraggedSegment] = useState<{ tierId: string; index: number } | null>(null);
  const [userSortBy, setUserSortBy] = useState('totalWinnings_desc');
  
  const [editingUser, setEditingUser] = useState<(UserDocument & {id: string}) | null>(null);
  const [manualWinRate, setManualWinRate] = useState<number>(50);
  const [userTagsInput, setUserTagsInput] = useState<string>('');


  const pendingWithdrawalsCount = useMemo(() => withdrawalRequests.filter(req => req.status === 'pending').length, [withdrawalRequests]);
  const pendingAddFundsCount = useMemo(() => addFundRequests.filter(req => req.status === 'pending').length, [addFundRequests]);
  const openSupportTicketsCount = useMemo(() => supportTickets.filter(ticket => ticket.status === 'open').length, [supportTickets]);
  const openFraudAlertsCount = useMemo(() => fraudAlerts.filter(alert => alert.status === 'open').length, [fraudAlerts]);


  useEffect(() => {
    if (!loading) {
      setCurrentAppSettings(appSettings);
      setCurrentNewsItems(newsItems);
      setAddBalancePresetsInput(appSettings.addBalancePresets?.join(', ') || '');
    }
  }, [appSettings, newsItems, loading]);
  
  useEffect(() => {
    if(editingUser) {
        const rate = editingUser.manualWinRateOverride === null || editingUser.manualWinRateOverride === undefined 
                     ? 50 // A neutral default if not set
                     : editingUser.manualWinRateOverride * 100;
        setManualWinRate(rate);
        setUserTagsInput((editingUser.tags || []).join(', '));
    }
  }, [editingUser]);
  
   // Real-time user listener
  useEffect(() => {
    if (!userData?.isAdmin || !db) return;

    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserDocument & { id: string }));
      setAllUsers(usersData);
      setIsUsersLoading(false);
    }, (error) => {
      console.error("Error listening to users collection:", error);
      toast({ title: "Real-time Error", description: "Could not get live user data.", variant: "destructive" });
      setIsUsersLoading(false);
    });

    return () => unsubscribe();
    
  }, [userData?.isAdmin, toast]);

  const fetchAdminData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      // User data is now handled by the real-time listener, so we fetch everything else.
      const [withdrawals, adds, transactions, leaderboardUsers, tickets, summary, alerts, stats] = await Promise.all([
        getWithdrawalRequests(),
        getAddFundRequests(),
        getAllTransactions(),
        getLeaderboardUsers(20),
        getSupportTickets(),
        getActivitySummary(1),
        getFraudAlerts(),
        getGlobalStats(),
      ]);
      setWithdrawalRequests(withdrawals);
      setAddFundRequests(adds);
      setAllTransactions(transactions);
      setLeaderboard(leaderboardUsers);
      setSupportTickets(tickets);
      setActivitySummary(summary);
      setFraudAlerts(alerts);
      setGlobalStats(stats);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast({ title: "Error Fetching Data", description: "Could not load admin data.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);
  
  // Memoize sorted users to prevent re-sorting on every render
  const sortedUsers = useMemo(() => {
      if (allUsers.length === 0) return [];
      const [field, direction] = userSortBy.split('_') as [string, 'asc' | 'desc'];
      
      return [...allUsers].sort((a, b) => {
          const valA = a[field as keyof UserDocument] ?? 0;
          const valB = b[field as keyof UserDocument] ?? 0;

          // Handle Timestamps
          if (valA instanceof Timestamp && valB instanceof Timestamp) {
              return direction === 'desc' ? valB.toMillis() - valA.toMillis() : valA.toMillis() - valB.toMillis();
          }
          // Handle numbers
          if (typeof valA === 'number' && typeof valB === 'number') {
              return direction === 'desc' ? valB - valA : valA - valB;
          }
          // Fallback for other types (though not used in current sorting options)
          return 0;
      });
  }, [allUsers, userSortBy]);
  
  // Memoize live stats to prevent re-calculating on every render
  const liveStats = useMemo(() => {
    const onlineUsers = allUsers.filter(u => u.isOnline);
    const gameBreakdown = onlineUsers.reduce((acc, user) => {
      const game = user.currentGame || 'Idle';
      acc[game] = (acc[game] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});
    
    return {
      onlineCount: onlineUsers.length,
      gameBreakdown
    };
  }, [allUsers]);


  useEffect(() => {
    if (userData?.isAdmin && !loading) {
      fetchAdminData();
    }
  }, [userData?.isAdmin, loading, fetchAdminData]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const type = e.target.getAttribute('type');

    setCurrentAppSettings(prev => {
        const finalValue = type === 'number' ? (parseFloat(value) || 0) : value;
        return {
            ...prev,
            [name]: finalValue,
        };
    });
  };

  const handleAddBalancePresetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddBalancePresetsInput(value);
    
    const presets = value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0);
    
    setCurrentAppSettings(prev => ({
        ...prev,
        addBalancePresets: presets
    }));
  };
  
  const handleDefaultWinRateChange = (value: string) => {
    const rate = parseFloat(value);
    if (isNaN(rate)) return;
    setCurrentAppSettings(prev => ({...prev, defaultWinRate: rate / 100}));
  };
  
  const handleWinRateRuleChange = (index: number, field: keyof WinRateRule, value: string | number) => {
    const updatedRules = [...currentAppSettings.winRateRules];
    if (typeof updatedRules[index][field] === 'number') {
      updatedRules[index][field] = parseFloat(value as string) || 0;
    } else {
      (updatedRules[index][field] as string) = value as string;
    }
    // special handling for rate as it's percentage based in UI
    if (field === 'rate') {
      updatedRules[index].rate = (value as number) / 100;
    }

    setCurrentAppSettings(prev => ({...prev, winRateRules: updatedRules}));
  };

  const addWinRateRule = () => {
    const newRule: WinRateRule = { id: `rule-${Date.now()}`, tag: 'new-tag', rate: 0.5, priority: 99 };
    setCurrentAppSettings(prev => ({...prev, winRateRules: [...prev.winRateRules, newRule]}));
  };
  
  const removeWinRateRule = (id: string) => {
    setCurrentAppSettings(prev => ({
      ...prev,
      winRateRules: prev.winRateRules.filter(rule => rule.id !== id)
    }));
  };
  
  const handleSaveUserChanges = async () => {
    if (!editingUser) return;
    try {
      const tags = userTagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const rateValue = manualWinRate === 50 ? null : manualWinRate / 100;

      await updateUserData(editingUser.id, {
        manualWinRateOverride: rateValue,
        tags: tags,
      });

      toast({ title: 'User Updated', description: `Changes for ${editingUser.displayName} have been saved.`});
      setEditingUser(null);
      // No need to fetch data, real-time listener will update it.
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive'});
    }
  };


  const handleWheelConfigChange = (tierId: string, field: 'name' | 'description' | 'minWithdrawalAmount', value: string) => {
    setCurrentAppSettings(prev => ({
      ...prev,
      wheelConfigs: {
        ...prev.wheelConfigs,
        [tierId]: {
          ...prev.wheelConfigs[tierId],
          [field]: field === 'minWithdrawalAmount' ? parseFloat(value) || 0 : value
        }
      }
    }));
  };

  const handleToggleLock = (tierId: string, checked: boolean) => {
    setCurrentAppSettings(prev => ({
      ...prev,
      wheelConfigs: {
        ...prev.wheelConfigs,
        [tierId]: {
          ...prev.wheelConfigs[tierId],
          isLocked: checked
        }
      }
    }));
  };

  const handleCostSettingChange = (tierId: string, field: 'baseCost' | 'tier1Limit' | 'tier1Cost' | 'tier2Limit' | 'tier2Cost' | 'tier3Cost', value: string) => {
      setCurrentAppSettings(prev => ({
          ...prev,
          wheelConfigs: {
              ...prev.wheelConfigs,
              [tierId]: {
                  ...prev.wheelConfigs[tierId],
                  costSettings: {
                      ...prev.wheelConfigs[tierId].costSettings,
                      [field]: parseFloat(value) || 0
                  }
              }
          }
      }));
  };

  const handleSegmentChange = (tierId: string, segmentIndex: number, field: keyof SegmentConfig, value: string) => {
      setCurrentAppSettings(prev => {
          const newSegments = [...prev.wheelConfigs[tierId].segments];
          newSegments[segmentIndex] = {
              ...newSegments[segmentIndex],
              [field]: (field === 'amount' || field === 'probability') ? parseFloat(value) || 0 : value
          };

          return {
              ...prev,
              wheelConfigs: {
                  ...prev.wheelConfigs,
                  [tierId]: {
                      ...prev.wheelConfigs[tierId],
                      segments: newSegments
                  }
              }
          };
      });
  };

  const addSegment = (tierId: string) => {
      setCurrentAppSettings(prev => {
          const newSegment: SegmentConfig = {
              id: `${tierId.charAt(0)}${new Date().getTime()}`,
              text: 'New Prize',
              emoji: '🎉',
              amount: 1,
              probability: 10,
              color: '0 0% 80%',
          };
          const newSegments = [...prev.wheelConfigs[tierId].segments, newSegment];
          return {
              ...prev,
              wheelConfigs: {
                  ...prev.wheelConfigs,
                  [tierId]: {
                      ...prev.wheelConfigs[tierId],
                      segments: newSegments
                  }
              }
          };
      });
  };

  const removeSegment = (tierId: string, indexToRemove: number) => {
      if (currentAppSettings.wheelConfigs[tierId].segments.length <= 1) {
          toast({
              title: "Cannot Delete Last Segment",
              description: "A wheel must have at least one prize segment.",
              variant: "destructive",
          });
          return;
      }
      setCurrentAppSettings(prev => {
          const newSegments = prev.wheelConfigs[tierId].segments.filter((_, index) => index !== indexToRemove);
          return {
              ...prev,
              wheelConfigs: {
                  ...prev.wheelConfigs,
                  [tierId]: {
                      ...prev.wheelConfigs[tierId],
                      segments: newSegments
                  }
              }
          };
      });
  };
  
  const handleDragStart = (tierId: string, index: number) => {
    setDraggedSegment({ tierId, index });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetTierId: string, dropIndex: number) => {
      if (!draggedSegment || draggedSegment.tierId !== targetTierId || draggedSegment.index === dropIndex) {
          setDraggedSegment(null);
          return;
      }
      
      setCurrentAppSettings(prev => {
          const newAppSettings = { ...prev };
          const segments = [...newAppSettings.wheelConfigs[targetTierId].segments];
          const [draggedItem] = segments.splice(draggedSegment.index, 1);
          segments.splice(dropIndex, 0, draggedItem);
          
          newAppSettings.wheelConfigs[targetTierId].segments = segments;
          return newAppSettings;
      });
      
      setDraggedSegment(null);
  };

  const handleDragEnd = () => {
    setDraggedSegment(null);
  };
  
  const handleToggleUserBlock = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUserData(userId, { isBlocked: !currentStatus });
      toast({ title: "User Status Updated", description: `User has been ${!currentStatus ? 'blocked' : 'unblocked'}.` });
      // No need to fetch data, real-time listener will update it.
    } catch (error: any) {
      console.error("Error updating user status:", error);
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      const fullConfig: AppConfiguration = {
        settings: currentAppSettings,
        newsItems: currentNewsItems
      };
      await saveAppConfigurationToFirestore(fullConfig);
      await refreshAppConfig();
      toast({ title: "Configuration Saved", description: "All settings have been saved to Firestore." });
    } catch (error) {
      console.error("Error saving configuration:", error);
      toast({ title: "Save Failed", description: "Could not save the configuration.", variant: "destructive" });
    }
  };

  const handleAddNewsItem = () => {
    if (newNewsItem.trim() === '') return;
    setCurrentNewsItems(prev => [...prev, newNewsItem.trim()]);
    setNewNewsItem('');
  };

  const handleRemoveNewsItem = (indexToRemove: number) => {
    setCurrentNewsItems(prev => prev.filter((_, index) => index !== indexToRemove));
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

  const handleApproveAddFund = async (request: AddFundRequestData & {id: string}) => {
    try {
      await approveAddFundAndUpdateBalance(request.id, request.userId, request.amount, request.tierId);
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
    const paymentMethodDetails = getPaymentDetailsString(request);
    try {
      await approveWithdrawalAndUpdateBalance(request.id, request.userId, request.amount, request.tierId, paymentMethodDetails);
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

  const handleResolveTicket = async (ticketId: string) => {
    try {
        await updateSupportTicketStatus(ticketId, 'resolved');
        toast({ title: "Ticket Resolved", description: "The support ticket has been marked as resolved."});
        fetchAdminData();
    } catch (error) {
        console.error("Error resolving ticket:", error);
        toast({ title: "Error", description: "Could not resolve the ticket.", variant: "destructive" });
    }
  };

  const activityChartData = useMemo(() => {
    if (!activitySummary) return [];
    return [
        { name: 'Morning', value: activitySummary.morning, fill: '#FFC107' },
        { name: 'Afternoon', value: activitySummary.afternoon, fill: '#2196F3' },
        { name: 'Evening', value: activitySummary.evening, fill: '#FF9800' },
        { name: 'Night', value: activitySummary.night, fill: '#4A148C' },
    ];
  }, [activitySummary]);
  
  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !userData?.isAdmin) {
    return (
        <div className="flex-grow flex flex-col items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">You do not have permission to view this page.</CardDescription>
            <Button onClick={() => router.push('/')} className="mt-6">Go to Home</Button>
          </Card>
        </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col items-center p-4 space-y-8">
      <Card className="w-full max-w-7xl shadow-xl bg-card text-card-foreground rounded-lg">
        <CardHeader className="items-center text-center border-b pb-6">
          <ShieldCheck className="h-16 w-16 text-primary mb-3" />
          <CardTitle className="text-4xl font-bold font-headline text-primary">Admin Panel</CardTitle>
          <CardDescription className="text-muted-foreground text-lg mt-1">Spinify Game Management</CardDescription>
           <div className="flex gap-4 mt-4">
             <Link href="/" passHref><Button variant="outline"><Home className="mr-2 h-4 w-4" />Back to App</Button></Link>
             <Button onClick={handleSaveConfiguration} size="lg"><Save className="mr-2 h-4 w-4" />Save All Changes</Button>
             <Button onClick={fetchAdminData} variant="outline" size="lg"><RefreshCcw className="mr-2 h-4 w-4" />Refresh Data</Button>
           </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 lg:grid-cols-12 gap-2 mb-6 h-auto flex-wrap">
              <TabsTrigger value="overview"><Users className="mr-2 h-4 w-4"/>Overview</TabsTrigger>
              <TabsTrigger value="activity"><Activity className="mr-2 h-4 w-4"/>Activity</TabsTrigger>
              <TabsTrigger value="winning-rules"><BrainCircuit className="mr-2 h-4 w-4"/>Winning Rules</TabsTrigger>
              
              <TabsTrigger value="fraud-alerts" className="relative">
                <ShieldAlert className="mr-2 h-4 w-4"/>Fraud Alerts
                {openFraudAlertsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground animate-pulse">
                    {openFraudAlertsCount}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger value="add-fund" className="relative">
                <Banknote className="mr-2 h-4 w-4"/>Add Fund
                 {pendingAddFundsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground animate-pulse">
                    {pendingAddFundsCount}
                  </Badge>
                )}
              </TabsTrigger>
              
              <TabsTrigger value="withdrawal-req" className="relative">
                <ClipboardList className="mr-2 h-4 w-4"/>Withdrawal
                 {pendingWithdrawalsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground animate-pulse">
                    {pendingWithdrawalsCount}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger value="transactions"><History className="mr-2 h-4 w-4" />Transactions</TabsTrigger>
              <TabsTrigger value="leaderboard"><Trophy className="mr-2 h-4 w-4"/>Leaderboard</TabsTrigger>
              <TabsTrigger value="wheel-settings"><Wand2 className="mr-2 h-4 w-4"/>Wheel Settings</TabsTrigger>
              <TabsTrigger value="game-settings"><Settings className="mr-2 h-4 w-4"/>App Settings</TabsTrigger>
              <TabsTrigger value="news-ticker"><Newspaper className="mr-2 h-4 w-4"/>News Ticker</TabsTrigger>
              
              <TabsTrigger value="support" className="relative">
                <LifeBuoy className="mr-2 h-4 w-4"/>Support
                {openSupportTicketsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 rounded-full bg-destructive text-destructive-foreground animate-pulse">
                    {openSupportTicketsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

             <TabsContent value="overview">
              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Users /> Cash Flow & User Overview</CardTitle>
                  <CardDescription>Key financial metrics and a list of all registered users.</CardDescription>
                  
                  <div className="pt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Live Analytics</CardTitle>
                           <Activity className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold">{liveStats.onlineCount}</div>
                           <p className="text-xs text-muted-foreground">Users currently online</p>
                           <div className="mt-2 text-xs space-y-1">
                            {Object.entries(liveStats.gameBreakdown).map(([game, count]) => (
                              <div key={game} className="flex justify-between">
                                <span>{getTierName(game, appSettings.wheelConfigs) || 'Idle'}:</span>
                                <span className="font-semibold">{count} user(s)</span>
                              </div>
                            ))}
                           </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                           <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                           <Users2 className="h-4 w-4 text-muted-foreground"/>
                        </CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold">{allUsers.length}</div>
                           <p className="text-xs text-muted-foreground">Total registered users</p>
                        </CardContent>
                    </Card>
                  </div>
                  

                   <div className="pt-6 border-t mt-6">
                      <h3 className="text-lg font-semibold mb-4">Global Cash Flow</h3>
                      {isLoadingData ? (
                        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                           <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-40 mt-2" /></CardContent></Card>
                           <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-40 mt-2" /></CardContent></Card>
                           <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-40 mt-2" /></CardContent></Card>
                           <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-40 mt-2" /></CardContent></Card>
                           <Card><CardHeader><Skeleton className="h-5 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-32" /><Skeleton className="h-4 w-40 mt-2" /></CardContent></Card>
                        </div>
                      ) : globalStats && (
                         <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Deposited</CardTitle>
                                    <ArrowUpRight className="h-4 w-4 text-green-500"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">₹{globalStats.totalDeposited.toFixed(2)}</div>
                                    <p className="text-xs text-muted-foreground">Total funds added by all users.</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Withdrawn</CardTitle>
                                    <ArrowDownLeft className="h-4 w-4 text-red-500"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">₹{globalStats.totalWithdrawn.toFixed(2)}</div>
                                    <p className="text-xs text-muted-foreground">Total liability removed from users.</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">GST Collected (2%)</CardTitle>
                                    <Landmark className="h-4 w-4 text-gray-500"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">₹{globalStats.totalGstCollected.toFixed(2)}</div>
                                    <p className="text-xs text-muted-foreground">From all processed withdrawals.</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total User Winnings</CardTitle>
                                    <Trophy className="h-4 w-4 text-yellow-500"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">₹{globalStats.totalWinnings.toFixed(2)}</div>
                                    <p className="text-xs text-muted-foreground">Total prize money won by all users.</p>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Current Balance</CardTitle>
                                    <Wallet className="h-4 w-4 text-blue-500"/>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">₹{globalStats.currentBalance.toFixed(2)}</div>
                                    <p className="text-xs text-muted-foreground">Total funds currently in all user wallets.</p>
                                </CardContent>
                            </Card>
                         </div>
                      )}
                    </div>

                  <div className="pt-8 border-t mt-8">
                    <h3 className="text-lg font-semibold mb-2">User Details</h3>
                    <Label htmlFor="user-sort" className="text-sm font-medium">Sort Users By</Label>
                    <Select value={userSortBy} onValueChange={setUserSortBy}>
                      <SelectTrigger id="user-sort" className="w-full max-w-sm mt-1">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="totalWinnings_desc">Highest Winnings</SelectItem>
                        <SelectItem value="lastActive_desc">Most Recently Active</SelectItem>
                        <SelectItem value="totalDeposited_desc">Highest Deposits</SelectItem>
                        <SelectItem value="createdAt_desc">Newest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                   <Table>
                    <TableHeader><TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Live Status</TableHead>
                      <TableHead>Spins (W/L)</TableHead>
                      {Object.keys(appSettings.wheelConfigs).map(tierId => <TableHead key={tierId}>{getTierName(tierId, appSettings.wheelConfigs)} Bal (₹)</TableHead>)}
                      <TableHead>Tags</TableHead>
                      <TableHead>Joined</TableHead><TableHead>Last Active</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {isUsersLoading ? <TableRow><TableCell colSpan={12 + Object.keys(appSettings.wheelConfigs).length} className="text-center"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading users...</TableCell></TableRow>
                      : sortedUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium"><div className="flex items-center gap-2">
                               <Avatar className="w-8 h-8 border-2 border-border"><AvatarImage src={u.photoURL || undefined} alt={u.displayName || 'User'}/><AvatarFallback>{getAvatarFallback(u)}</AvatarFallback></Avatar>
                              <div><p className="font-semibold">{u.displayName || 'N/A'}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div></TableCell>
                          <TableCell>
                            {u.isOnline ? (
                              <div className="flex items-center gap-2 text-green-600 font-medium">
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span>{getTierName(u.currentGame, appSettings.wheelConfigs)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <span className="relative flex h-3 w-3">
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                                </span>
                                <span>Offline</span>
                              </div>
                            )}
                           </TableCell>
                          <TableCell>{u.totalSpinsPlayed || 0} ({u.totalWins || 0}/{ (u.totalSpinsPlayed || 0) - (u.totalWins || 0) })</TableCell>
                          {Object.keys(appSettings.wheelConfigs).map(tierId => <TableCell key={tierId}>{getUserBalanceForTier(u, tierId)}</TableCell>)}
                          <TableCell><div className="flex flex-wrap gap-1 max-w-xs">{u.tags?.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div></TableCell>
                          <TableCell>{formatDisplayDate(u.createdAt)}</TableCell>
                          <TableCell>{formatDisplayDate(u.lastActive)}</TableCell>
                          <TableCell>
                             <Badge variant={u.isBlocked ? 'destructive' : 'default'}>{u.isBlocked ? 'Blocked' : 'Active'}</Badge>
                             {u.isAdmin && <Badge variant="secondary" className="ml-2">Admin</Badge>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                               <Button variant="outline" size="sm" onClick={() => setEditingUser(u)}><Pencil className="mr-2 h-3 w-3" />Manage</Button>
                              <Label htmlFor={`block-switch-${u.id}`} className="text-xs text-muted-foreground sr-only">{u.isBlocked ? 'Unblock' : 'Block'}</Label>
                              <Switch
                                id={`block-switch-${u.id}`}
                                checked={u.isBlocked || false}
                                onCheckedChange={() => handleToggleUserBlock(u.id, u.isBlocked || false)}
                                disabled={u.isAdmin} // Prevent blocking admins
                                aria-label={`Block or unblock user ${u.displayName}`}
                              />
                            </div>
                          </TableCell>
                        </TableRow>))}
                      {!isUsersLoading && sortedUsers.length === 0 && (<TableRow><TableCell colSpan={12 + Object.keys(appSettings.wheelConfigs).length} className="text-center text-muted-foreground h-24">No users found.</TableCell></TableRow>)}
                    </TableBody></Table></CardContent></Card>
            </TabsContent>
            
            <TabsContent value="activity">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 /> User Activity</CardTitle><CardDescription>Unique active users based on time of day (last 24 hours).</CardDescription></CardHeader>
                <CardContent className="space-y-6">
                  {isLoadingData ? (
                     <div className="flex justify-center items-center h-64"><RefreshCcw className="h-8 w-8 animate-spin text-primary" /></div>
                  ) : activitySummary && activityChartData.length > 0 ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Morning" value={activitySummary.morning} icon={<Sunrise className="h-4 w-4 text-muted-foreground" />} description="Unique users (last 24h)" />
                        <StatCard title="Afternoon" value={activitySummary.afternoon} icon={<Sun className="h-4 w-4 text-muted-foreground" />} description="Unique users (last 24h)" />
                        <StatCard title="Evening" value={activitySummary.evening} icon={<Sunset className="h-4 w-4 text-muted-foreground" />} description="Unique users (last 24h)" />
                        <StatCard title="Night" value={activitySummary.night} icon={<Moon className="h-4 w-4 text-muted-foreground" />} description="Unique users (last 24h)" />
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={activityChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={(props) => `${props.name}: ${props.percent ? (props.percent * 100).toFixed(0) : 0}%`}
                          >
                            {activityChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  ) : (
                    <div className="text-center text-muted-foreground py-10">No activity data available.</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="winning-rules">
              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BrainCircuit /> Dynamic Winning Rules</CardTitle>
                  <CardDescription>
                    Control the probability of winning for different user groups. Rules are applied by priority (lower number = higher priority).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="defaultWinRate">Default Win Rate (%)</Label>
                    <Input
                      id="defaultWinRate"
                      type="number"
                      value={(currentAppSettings.defaultWinRate * 100).toFixed(0)}
                      onChange={(e) => handleDefaultWinRateChange(e.target.value)}
                      className="max-w-xs mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">The base chance for a user to win if no other rules apply.</p>
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-2">Tag-Based Rules</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Priority</TableHead>
                          <TableHead>Tag Name</TableHead>
                          <TableHead>Win Rate (%)</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentAppSettings.winRateRules.sort((a,b) => a.priority - b.priority).map((rule, index) => (
                          <TableRow key={rule.id}>
                            <TableCell><Input type="number" value={rule.priority} onChange={(e) => handleWinRateRuleChange(index, 'priority', e.target.value)} className="w-20" /></TableCell>
                            <TableCell><Input value={rule.tag} onChange={(e) => handleWinRateRuleChange(index, 'tag', e.target.value)} /></TableCell>
                            <TableCell><Input type="number" value={(rule.rate * 100).toFixed(0)} onChange={(e) => handleWinRateRuleChange(index, 'rate', e.target.value)} className="w-24" /></TableCell>
                            <TableCell><Button variant="destructive" size="icon" onClick={() => removeWinRateRule(rule.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button onClick={addWinRateRule} variant="outline" className="mt-4"><PlusCircle className="mr-2 h-4 w-4" /> Add Rule</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="fraud-alerts">
              <Card className="bg-muted/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><ShieldAlert /> Fraud Alerts</CardTitle>
                  <CardDescription>
                    Alerts for suspicious user activities. Note: Automatic detection requires a separate Cloud Function to be deployed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                   <Table>
                    <TableHeader><TableRow><TableHead>User Email</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData ? <TableRow><TableCell colSpan={4} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading alerts...</TableCell></TableRow>
                      : fraudAlerts.map((alert) => (
                        <TableRow key={alert.id}>
                          <TableCell>{alert.userEmail}</TableCell>
                          <TableCell className="font-medium text-destructive">{alert.reason}</TableCell>
                          <TableCell>{formatDisplayDate(alert.timestamp)}</TableCell>
                          <TableCell><Badge variant={alert.status === 'open' ? 'destructive' : 'default'}>{alert.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {!isLoadingData && fraudAlerts.length === 0 && (<TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">No fraud alerts found.</TableCell></TableRow>)}
                    </TableBody>
                   </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="wheel-settings">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Wand2 /> Wheel &amp; Segment Settings</CardTitle><CardDescription>Control prizes, costs, and visual appearance for each wheel.</CardDescription></CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-little">
                        {Object.values(currentAppSettings.wheelConfigs).map((tier) => {
                          const totalProbability = tier.segments.reduce((sum, seg) => sum + (seg.probability || 0), 0);
                          return (
                            <AccordionItem value={`item-${tier.id}`} key={tier.id}>
                                <AccordionTrigger className="text-xl font-semibold">{tier.name}</AccordionTrigger>
                                <AccordionContent className="space-y-6 p-4">
                                  <div className="border p-4 rounded-md space-y-4">
                                      <h3 className="font-semibold text-lg">Arena Settings</h3>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                          <div><Label>Name</Label><Input value={tier.name} onChange={(e) => handleWheelConfigChange(tier.id, 'name', e.target.value)} /></div>
                                          <div><Label>Description</Label><Input value={tier.description} onChange={(e) => handleWheelConfigChange(tier.id, 'description', e.target.value)} /></div>
                                          <div><Label>Min Withdrawal (₹)</Label><Input type="number" value={tier.minWithdrawalAmount} onChange={(e) => handleWheelConfigChange(tier.id, 'minWithdrawalAmount', e.target.value)} /></div>
                                      </div>
                                      <div className="flex items-center space-x-2 pt-2">
                                          <Switch id={`lock-switch-${tier.id}`} checked={tier.isLocked} onCheckedChange={(checked) => handleToggleLock(tier.id, checked)} />
                                          <Label htmlFor={`lock-switch-${tier.id}`} className="text-destructive font-semibold">Lock this game arena</Label>
                                      </div>
                                  </div>

                                  <div className="border p-4 rounded-md space-y-4">
                                      <h3 className="font-semibold text-lg">Spin Cost Settings</h3>
                                      {tier.costSettings.type === 'fixed' ? (
                                            <div className="md:col-span-3"><Label>Spin Cost (₹)</Label><Input type="number" value={tier.costSettings.baseCost} onChange={(e) => handleCostSettingChange(tier.id, 'baseCost', e.target.value)} /></div>
                                        ) : (
                                            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                                                <div><Label>Tier 1 Limit</Label><Input type="number" value={tier.costSettings.tier1Limit} onChange={(e) => handleCostSettingChange(tier.id, 'tier1Limit', e.target.value)} /></div>
                                                <div><Label>Tier 1 Cost (₹)</Label><Input type="number" value={tier.costSettings.tier1Cost} onChange={(e) => handleCostSettingChange(tier.id, 'tier1Cost', e.target.value)} /></div>
                                                <div><Label>Tier 2 Limit</Label><Input type="number" value={tier.costSettings.tier2Limit} onChange={(e) => handleCostSettingChange(tier.id, 'tier2Limit', e.target.value)} /></div>
                                                <div><Label>Tier 2 Cost (₹)</Label><Input type="number" value={tier.costSettings.tier2Cost} onChange={(e) => handleCostSettingChange(tier.id, 'tier2Cost', e.target.value)} /></div>
                                                <div><Label>Tier 3 Cost (₹)</Label><Input type="number" value={tier.costSettings.tier3Cost} onChange={(e) => handleCostSettingChange(tier.id, 'tier3Cost', e.target.value)} /></div>
                                            </div>
                                        )}
                                  </div>

                                    <h4 className="font-semibold text-lg border-b pb-2 flex justify-between items-center">
                                      <span>Segments (Prizes &amp; Probabilities)</span>
                                      <CardDescription className="text-xs">Note: Segment probabilities are now only for selecting a prize *after* a win is determined. The actual chance to win is set in 'Winning Rules'.</CardDescription>
                                    </h4>
                                    <Table>
                                      <TableHeader><TableRow>
                                          <TableHead className="w-16 text-center">#</TableHead>
                                          <TableHead>Emoji</TableHead>
                                          <TableHead>Text</TableHead>
                                          <TableHead>Amount (₹)</TableHead>
                                          <TableHead>Selection Weight</TableHead>
                                          <TableHead>Color (HSL)</TableHead>
                                          <TableHead>Actions</TableHead>
                                      </TableRow></TableHeader>
                                      <TableBody onDragOver={handleDragOver}>
                                          {tier.segments.map((seg, index) => {
                                            return (
                                              <TableRow 
                                                  key={seg.id}
                                                  draggable
                                                  onDragStart={() => handleDragStart(tier.id, index)}
                                                  onDrop={() => handleDrop(tier.id, index)}
                                                  onDragEnd={handleDragEnd}
                                                  className={cn(
                                                      "cursor-move",
                                                      draggedSegment?.tierId === tier.id && draggedSegment?.index === index && "opacity-50 bg-primary/20"
                                                  )}
                                              >
                                                  <TableCell className="text-center font-medium text-muted-foreground">
                                                      <div className="flex items-center justify-center gap-2">
                                                          <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                          {index + 1}
                                                      </div>
                                                  </TableCell>
                                                  <TableCell><Input value={seg.emoji} onChange={(e) => handleSegmentChange(tier.id, index, 'emoji', e.target.value)} className="w-16" /></TableCell>
                                                  <TableCell><Input value={seg.text} onChange={(e) => handleSegmentChange(tier.id, index, 'text', e.target.value)} /></TableCell>
                                                  <TableCell><Input type="number" value={seg.amount} onChange={(e) => handleSegmentChange(tier.id, index, 'amount', e.target.value)} /></TableCell>
                                                  <TableCell><Input type="number" value={seg.probability} onChange={(e) => handleSegmentChange(tier.id, index, 'probability', e.target.value)} /></TableCell>
                                                  <TableCell><Input value={seg.color} onChange={(e) => handleSegmentChange(tier.id, index, 'color', e.target.value)} /></TableCell>
                                                  <TableCell><Button variant="destructive" size="icon" onClick={() => removeSegment(tier.id, index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                              </TableRow>
                                            )
                                          })}
                                      </TableBody>
                                    </Table>
                                    <Button onClick={() => addSegment(tier.id)} variant="outline"><PlusCircle className="mr-2 h-4 w-4" />Add Segment</Button>
                                </AccordionContent>
                            </AccordionItem>
                          )
                      })}
                    </Accordion>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="game-settings">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Settings /> General App Settings</CardTitle><CardDescription>Modify core app parameters.</CardDescription></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>App Name</Label><Input name="appName" value={currentAppSettings.appName} onChange={handleSettingsChange} /></div>
                    <div className="space-y-1"><Label>Payment UPI ID</Label><Input name="upiId" value={currentAppSettings.upiId} onChange={handleSettingsChange} /></div>
                    <div className="space-y-1"><Label>Initial Balance for New Users (₹)</Label><Input type="number" name="initialBalanceForNewUsers" value={currentAppSettings.initialBalanceForNewUsers} onChange={handleSettingsChange} /></div>
                    <div className="space-y-1"><Label>Initial Free Spins for New Users</Label><Input type="number" name="maxSpinsInBundle" value={currentAppSettings.maxSpinsInBundle} onChange={handleSettingsChange} /></div>
                    <div className="space-y-1"><Label>Min Add Balance Amount (₹)</Label><Input type="number" name="minAddBalanceAmount" value={currentAppSettings.minAddBalanceAmount} onChange={handleSettingsChange} /></div>
                    <div className="space-y-1"><Label>Add Balance Presets</Label><Input value={addBalancePresetsInput} onChange={handleAddBalancePresetsChange} placeholder="e.g. 100, 200, 500" /><CardDescription className="text-xs">Comma-separated numbers</CardDescription></div>
                    <div className="space-y-1"><Label>News Ticker Speed (seconds)</Label><Input type="number" name="newsTickerSpeed" value={currentAppSettings.newsTickerSpeed} onChange={handleSettingsChange} /></div>
                    <div className="space-y-1"><Label>Referral Bonus for New User (₹)</Label><Input type="number" name="referralBonusForNewUser" value={currentAppSettings.referralBonusForNewUser} onChange={handleSettingsChange} /></div>
                    <div className="space-y-1"><Label>Referral Bonus for Referrer (₹)</Label><Input type="number" name="referralBonusForReferrer" value={currentAppSettings.referralBonusForReferrer} onChange={handleSettingsChange} /></div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="news-ticker">
              <Card className="bg-muted/20">
                <CardHeader><CardTitle className="flex items-center gap-2"><Newspaper /> News Ticker</CardTitle><CardDescription>Manage news ticker items.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {currentNewsItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {editingNewsItemIndex === index ? (
                        <>
                          <Textarea value={editingNewsItemText} onChange={(e) => setEditingNewsItemText(e.target.value)} className="flex-grow bg-background" rows={2}/>
                          <Button onClick={handleSaveEditedNewsItem} size="icon" variant="outline"><Save className="h-4 w-4 text-green-500" /></Button>
                          <Button onClick={() => setEditingNewsItemIndex(null)} size="icon" variant="ghost"><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Input value={item} readOnly className="flex-grow bg-background/50" />
                          <Button onClick={() => startEditNewsItem(index)} variant="outline" size="icon"><Edit2 className="h-4 w-4 text-blue-500" /></Button>
                          <Button onClick={() => handleRemoveNewsItem(index)} variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Textarea placeholder="New news item..." value={newNewsItem} onChange={(e) => setNewNewsItem(e.target.value)} className="flex-grow bg-background" rows={2}/>
                    <Button onClick={handleAddNewsItem} variant="outline" className="self-end">Add Item</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="add-fund">
              <Card className="bg-muted/20"><CardHeader><CardTitle className="flex items-center gap-2"><Banknote /> Add Fund Requests</CardTitle><CardDescription>Manage pending user fund additions.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>Req ID</TableHead><TableHead>User Email</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Tier</TableHead><TableHead>Payment Ref</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData ? <TableRow><TableCell colSpan={8} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading requests...</TableCell></TableRow>
                      : addFundRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium text-xs">{req.id.substring(0,10)}...</TableCell><TableCell>{req.userEmail}</TableCell><TableCell>{req.amount.toFixed(2)}</TableCell>
                          <TableCell><Badge variant="outline">{getTierName(req.tierId, appSettings.wheelConfigs)}</Badge></TableCell>
                          <TableCell className="text-xs">{req.paymentReference}</TableCell>
                          <TableCell>{formatDisplayDate(req.requestDate, 'date')}</TableCell>
                          <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>{req.status}</Badge></TableCell>
                          <TableCell>{req.status === 'pending' && (<div className="flex gap-1"><Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApproveAddFund(req)}><PackageCheck className="mr-1 h-3 w-3"/>Approve</Button><Button variant="destructive" size="sm" onClick={() => handleRejectAddFund(req.id)}><PackageX className="mr-1 h-3 w-3"/>Reject</Button></div>)}</TableCell>
                        </TableRow>))}
                      {!isLoadingData && addFundRequests.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center text-muted-foreground h-24">No pending add fund requests.</TableCell></TableRow>)}
                    </TableBody></Table></CardContent></Card>
            </TabsContent>
            
            <TabsContent value="withdrawal-req">
              <Card className="bg-muted/20"><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList /> Withdrawal Requests</CardTitle><CardDescription>Manage pending user withdrawals.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>Req ID</TableHead><TableHead>User</TableHead><TableHead>Gross Amt (₹)</TableHead><TableHead>GST (2%)</TableHead><TableHead>Net Pay (₹)</TableHead><TableHead>Tier</TableHead><TableHead>Details</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData ? <TableRow><TableCell colSpan={10} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading requests...</TableCell></TableRow>
                      : withdrawalRequests.map((req) => {
                        const gstAmount = req.amount * 0.02;
                        const netPayable = req.amount - gstAmount;
                        return (
                        <TableRow key={req.id}>
                          <TableCell className="font-medium text-xs">{req.id.substring(0,10)}...</TableCell>
                          <TableCell>{req.userEmail}</TableCell>
                          <TableCell>{req.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-destructive">{gstAmount.toFixed(2)}</TableCell>
                          <TableCell className="font-semibold text-primary">{netPayable.toFixed(2)}</TableCell>
                          <TableCell><Badge variant="outline">{getTierName(req.tierId, appSettings.wheelConfigs)}</Badge></TableCell>
                          <TableCell className="text-xs">{getPaymentDetailsString(req)}</TableCell>
                          <TableCell>{formatDisplayDate(req.requestDate, 'date')}</TableCell>
                          <TableCell><Badge variant={req.status === 'pending' ? 'secondary' : (req.status === 'processed' || req.status === 'approved') ? 'default' : 'destructive'}>{req.status}</Badge></TableCell>
                          <TableCell>{req.status === 'pending' && (<div className="flex gap-1"><Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApproveWithdrawal(req)}><PackageCheck className="mr-1 h-3 w-3"/>Approve</Button><Button variant="destructive" size="sm" onClick={() => handleRejectWithdrawal(req.id)}><PackageX className="mr-1 h-3 w-3"/>Reject</Button></div>)}</TableCell>
                        </TableRow>
                        )
                      })}
                      {!isLoadingData && withdrawalRequests.length === 0 && (<TableRow><TableCell colSpan={10} className="text-center text-muted-foreground h-24">No pending withdrawal requests.</TableCell></TableRow>)}
                    </TableBody></Table></CardContent></Card>
            </TabsContent>
            
             <TabsContent value="transactions">
              <Card className="bg-muted/20"><CardHeader><CardTitle className="flex items-center gap-2"><History /> All Transactions</CardTitle><CardDescription>History of all transactions across all users.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>User Email</TableHead><TableHead>Type</TableHead><TableHead>Net Amount (₹)</TableHead><TableHead>Tier</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData ? <TableRow><TableCell colSpan={7} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading transactions...</TableCell></TableRow>
                      : allTransactions.map((t) => (
                        <TableRow key={t.id}>
                            <TableCell className="font-medium">{t.userEmail}</TableCell>
                            <TableCell><span className={`flex items-center gap-1 ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'credit' ? <ArrowUpRight className="h-4 w-4"/> : <ArrowDownLeft className="h-4 w-4"/>}{t.type}</span></TableCell>
                            <TableCell className={`font-semibold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.amount.toFixed(2)}</TableCell>
                             <TableCell>{t.tierId ? <Badge variant="outline">{getTierName(t.tierId, appSettings.wheelConfigs)}</Badge> : 'N/A'}</TableCell>
                            <TableCell>{t.description}</TableCell>
                            <TableCell>{formatDisplayDate(t.date)}</TableCell>
                            <TableCell><Badge variant={t.status === 'completed' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'}>{t.status}</Badge></TableCell>
                        </TableRow>
                      ))}
                      {!isLoadingData && allTransactions.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center text-muted-foreground h-24">No transactions found.</TableCell></TableRow>)}
                    </TableBody></Table></CardContent></Card>
            </TabsContent>

            <TabsContent value="leaderboard">
              <Card className="bg-muted/20"><CardHeader><CardTitle className="flex items-center gap-2"><Trophy /> Leaderboard</CardTitle><CardDescription>Top players by total winnings.</CardDescription></CardHeader>
                <CardContent>
                   <Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Player</TableHead><TableHead className="text-right">Total Winnings (₹)</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData ? <TableRow><TableCell colSpan={3} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading leaderboard...</TableCell></TableRow>
                      : leaderboard.map((player, index) => (
                        <TableRow key={player.uid}>
                            <TableCell className="font-bold">{index + 1}</TableCell>
                            <TableCell>{player.displayName || player.email}</TableCell>
                            <TableCell className="text-right font-semibold text-primary">₹{(player.totalWinnings || 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                      {!isLoadingData && leaderboard.length === 0 && (<TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-10">Leaderboard is empty.</TableCell></TableRow>)}
                    </TableBody></Table></CardContent></Card>
            </TabsContent>
            
            <TabsContent value="support">
              <Card className="bg-muted/20"><CardHeader><CardTitle className="flex items-center gap-2"><LifeBuoy /> Support Tickets</CardTitle><CardDescription>Manage user-submitted issues and questions.</CardDescription></CardHeader>
                <CardContent>
                  <Table><TableHeader><TableRow><TableHead>User Email</TableHead><TableHead>Description</TableHead><TableHead>Screenshot</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {isLoadingData ? <TableRow><TableCell colSpan={6} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading tickets...</TableCell></TableRow>
                      : supportTickets.map((ticket) => (
                        <TableRow key={ticket.id}>
                          <TableCell>{ticket.userEmail}</TableCell>
                          <TableCell className="max-w-sm whitespace-pre-wrap">{ticket.description}</TableCell>
                          <TableCell>
                            {ticket.screenshotURL ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">View Image</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                  <DialogHeader><DialogTitle>Screenshot from {ticket.userEmail}</DialogTitle></DialogHeader>
                                  <div className="flex justify-center p-4">
                                    <Image src={ticket.screenshotURL} alt={`Screenshot for ticket ${ticket.id}`} width={800} height={600} className="rounded-md object-contain max-h-[70vh]"/>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : "N/A"}
                          </TableCell>
                          <TableCell>{formatDisplayDate(ticket.createdAt, 'date')}</TableCell>
                          <TableCell><Badge variant={ticket.status === 'open' ? 'destructive' : 'default'}>{ticket.status}</Badge></TableCell>
                          <TableCell>
                            {ticket.status === 'open' && (
                              <Button variant="outline" size="sm" onClick={() => handleResolveTicket(ticket.id)}>Mark Resolved</Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!isLoadingData && supportTickets.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No support tickets found.</TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>
      
      {/* Dialog for Editing User */}
      <Dialog open={!!editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage User: {editingUser?.displayName}</DialogTitle>
            <DialogDescription>{editingUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
             <div className="grid grid-cols-2 gap-4 text-center">
                <div><Label>Total Spins</Label><p className="font-bold text-2xl">{editingUser?.totalSpinsPlayed || 0}</p></div>
                <div><Label>Win/Loss</Label><p className="font-bold text-2xl">{editingUser?.totalWins || 0} / {(editingUser?.totalSpinsPlayed || 0) - (editingUser?.totalWins || 0)}</p></div>
             </div>
             <div className="space-y-2">
                <Label htmlFor="tags">User Tags</Label>
                <Input id="tags" value={userTagsInput} onChange={(e) => setUserTagsInput(e.target.value)} placeholder="e.g. new,vip,high-loss"/>
                <CardDescription className="text-xs">Comma-separated tags. These affect auto win rates.</CardDescription>
             </div>
             <div className="space-y-2">
                <Label htmlFor="winRate">Manual Win Rate Override: <span className="font-bold text-primary">{manualWinRate}%</span></Label>
                <Slider id="winRate" min={0} max={100} step={1} value={[manualWinRate]} onValueChange={(value) => setManualWinRate(value[0])} />
                <CardDescription className="text-xs">Set to 50% to disable and use tag-based rules. Otherwise, this rate will override all other rules.</CardDescription>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
             <Button onClick={handleSaveUserChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
