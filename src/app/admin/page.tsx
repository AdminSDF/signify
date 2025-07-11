
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
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  ShieldCheck, Settings, Users, Home, ShieldAlert, ListPlus, Trash2, Save, Edit2, X, ClipboardList, Banknote, History,
  PackageCheck, PackageX, Newspaper, Trophy, RefreshCcw, ArrowDownLeft, ArrowUpRight, PlusCircle, Wand2, LifeBuoy, GripVertical, Ban,
  ArrowRightLeft, Activity, BarChart2, Sunrise, Sun, Sunset, Moon, Lock, Wallet, Landmark, Pencil, Star, Gamepad2, BrainCircuit, Users2, Gift, Swords, LogOut,
  UserCog, PanelLeft, Calendar as CalendarIcon, MoreHorizontal, Search
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { AppSettings, initialSettings as fallbackAppSettings, DEFAULT_NEWS_ITEMS as fallbackNewsItems, WheelTierConfig, SegmentConfig, WinRateRule, RewardConfig, DailyReward, StreakBonus } from '@/lib/appConfig';
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
  UserDocument,
  Tournament,
  createTournament,
  getAllTournaments,
  getTournamentParticipants,
  UserTournamentData,
  endTournamentAndDistributePrizes,
  TournamentReward,
  UserRole,
} from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// --- HELPER FUNCTIONS & COMPONENTS ---
const getTierName = (tierId: string | null | undefined, wheelConfigs: { [key: string]: WheelTierConfig }): string => {
    if (!tierId) return 'N/A';
    if (wheelConfigs && wheelConfigs[tierId] && wheelConfigs[tierId].name) {
        return wheelConfigs[tierId].name;
    }
    return tierId;
};

const getAvatarFallback = (user: UserDocument): string => {
    if (user.displayName && user.displayName.length > 0) return user.displayName[0].toUpperCase();
    if (user.email && user.email.length > 0) return user.email[0].toUpperCase();
    return 'U';
};

const getPaymentDetailsString = (req: WithdrawalRequestData): string => {
    if (!req) return 'N/A';
    if (req.paymentMethod === 'upi') return `UPI: ${req.upiId || 'N/A'}`;
    if (req.paymentMethod === 'bank' && req.bankDetails) {
        const { accountHolderName, accountNumber } = req.bankDetails;
        const lastFour = accountNumber ? `...${accountNumber.slice(-4)}` : '';
        return `Bank: ${accountHolderName || 'A/C'}${lastFour}`;
    }
    return 'N/A';
};

const formatDisplayDate = (dateInput: any, formatType: 'datetime' | 'date' = 'datetime'): string => {
    if (!dateInput) return 'N/A';
    let dateObj: Date;
    if (dateInput instanceof Timestamp) dateObj = dateInput.toDate();
    else if (dateInput instanceof Date) dateObj = dateInput;
    else dateObj = new Date(dateInput);
  
    if (isNaN(dateObj.getTime())) return 'N/A';
    return format(dateObj, formatType === 'date' ? "PPP" : "Pp");
};

const StatCard = ({ title, value, icon, description, valuePrefix = '' }: { title: string, value: string | number, icon: React.ReactNode, description?: string, valuePrefix?: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{valuePrefix}{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

const NavLink = ({ id, label, icon: Icon, count, activeView, setActiveView, isHeader = false, isMobile = false }: {
    id: string;
    label: string;
    icon: React.ElementType;
    count?: number;
    activeView: string;
    setActiveView: (view: string) => void;
    isHeader?: boolean;
    isMobile?: boolean;
}) => {
    if (isHeader) {
        return <h4 className="px-2 pt-4 pb-2 text-xs font-semibold uppercase text-muted-foreground">{label}</h4>;
    }

    const commonProps = {
        variant: activeView === id ? "secondary" : "ghost" as const,
        className: cn("w-full justify-start", isMobile && "text-base py-6"),
        onClick: () => setActiveView(id)
    };
    
    return (
        <Button {...commonProps}>
            <Icon className="mr-3 h-5 w-5" />
            {label}
            {count != null && count > 0 && <Badge className="ml-auto">{count}</Badge>}
        </Button>
    );
};

export default function AdminPage() {
  const { user, userData, loading, appSettings, newsItems, refreshAppConfig, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const isSuperAdmin = userData?.role === 'super-admin';
  const isAdminOrHigher = isSuperAdmin || userData?.role === 'admin';
  const isFinanceStaff = isAdminOrHigher || userData?.role === 'finance-staff';
  const isSupportStaff = isAdminOrHigher || userData?.role === 'support-staff';

  const [activeView, setActiveView] = useState('overview');
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
  const [allTournaments, setAllTournaments] = useState<(Tournament & { id: string })[]>([]);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [viewingTournamentParticipants, setViewingTournamentParticipants] = useState<(UserTournamentData[]) | null>(null);
  const [currentTournamentForView, setCurrentTournamentForView] = useState<string | null>(null);

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [draggedSegment, setDraggedSegment] = useState<{ tierId: string; index: number } | null>(null);
  const [userSortBy, setUserSortBy] = useState('totalWinnings_desc');
  
  const [editingUser, setEditingUser] = useState<(UserDocument & {id: string}) | null>(null);
  const [manualWinRate, setManualWinRate] = useState<number>(50);
  const [userTagsInput, setUserTagsInput] = useState<string>('');
  
  // Search states
  const [userSearch, setUserSearch] = useState('');
  const [withdrawalSearch, setWithdrawalSearch] = useState('');
  const [addFundSearch, setAddFundSearch] = useState('');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [supportTicketSearch, setSupportTicketSearch] = useState('');
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  // Memoized Counts
  const pendingWithdrawalsCount = useMemo(() => withdrawalRequests.filter(req => req.status === 'pending').length, [withdrawalRequests]);
  const pendingAddFundsCount = useMemo(() => addFundRequests.filter(req => req.status === 'pending').length, [addFundRequests]);
  const openSupportTicketsCount = useMemo(() => supportTickets.filter(ticket => ticket.status === 'open').length, [supportTickets]);
  const openFraudAlertsCount = useMemo(() => fraudAlerts.filter(alert => alert.status === 'open').length, [fraudAlerts]);

  // Effects
  useEffect(() => { if (!loading) { setCurrentAppSettings(appSettings); setCurrentNewsItems(newsItems); setAddBalancePresetsInput(appSettings.addBalancePresets?.join(', ') || ''); } }, [appSettings, newsItems, loading]);
  useEffect(() => { if(editingUser) { const rate = editingUser.manualWinRateOverride === null || editingUser.manualWinRateOverride === undefined ? 50 : editingUser.manualWinRateOverride * 100; setManualWinRate(rate); setUserTagsInput((editingUser.tags || []).join(', ')); } }, [editingUser]);
  
  useEffect(() => {
    if(!isAdminOrHigher || !db) return;
    const unsubscribe = onSnapshot(query(collection(db, 'users')), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDocument & { id: string })));
      setIsUsersLoading(false);
    }, (error) => { console.error("Error listening to users:", error); toast({ title: "Real-time Error", variant: "destructive" }); setIsUsersLoading(false); });
    return () => unsubscribe();
  }, [isAdminOrHigher, toast]);

  const fetchAdminData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [withdrawals, adds, transactions, leaderboardUsers, tickets, summary, alerts, stats, tournaments] = await Promise.all([
        getWithdrawalRequests(), getAddFundRequests(), getAllTransactions(), getLeaderboardUsers(20),
        getSupportTickets(), getActivitySummary(1), getFraudAlerts(), getGlobalStats(), getAllTournaments(),
      ]);
      setWithdrawalRequests(withdrawals); setAddFundRequests(adds); setAllTransactions(transactions);
      setLeaderboard(leaderboardUsers); setSupportTickets(tickets); setActivitySummary(summary);
      setFraudAlerts(alerts); setGlobalStats(stats); setAllTournaments(tournaments);
    } catch (error) { console.error("Error fetching admin data:", error); toast({ title: "Error Fetching Data", description: "Could not load admin data.", variant: "destructive" });
    } finally { setIsLoadingData(false); }
  }, [toast]);
  
  // Memoized Filters
  const sortedUsers = useMemo(() => {
      if (allUsers.length === 0) return [];
      const [field, direction] = userSortBy.split('_') as [string, 'asc' | 'desc'];
      const sorted = [...allUsers].sort((a, b) => {
          const valA = a[field as keyof UserDocument] ?? 0; const valB = b[field as keyof UserDocument] ?? 0;
          if (valA instanceof Timestamp && valB instanceof Timestamp) return direction === 'desc' ? valB.toMillis() - valA.toMillis() : valA.toMillis() - valB.toMillis();
          if (typeof valA === 'number' && typeof valB === 'number') return direction === 'desc' ? valB - valA : valA - valB;
          return 0;
      });
      if (!userSearch) return sorted;
      const lowerCaseSearch = userSearch.toLowerCase();
      return sorted.filter(u =>
        (u.displayName || '').toLowerCase().includes(lowerCaseSearch) ||
        (u.email || '').toLowerCase().includes(lowerCaseSearch)
      );
  }, [allUsers, userSortBy, userSearch]);
  
  const filteredWithdrawals = useMemo(() => {
    if (!withdrawalSearch) return withdrawalRequests;
    const lowerCaseSearch = withdrawalSearch.toLowerCase();
    return withdrawalRequests.filter(r => (r.userEmail || '').toLowerCase().includes(lowerCaseSearch));
  }, [withdrawalRequests, withdrawalSearch]);

  const filteredAddFunds = useMemo(() => {
    if (!addFundSearch) return addFundRequests;
    const lowerCaseSearch = addFundSearch.toLowerCase();
    return addFundRequests.filter(r => 
        (r.userEmail || '').toLowerCase().includes(lowerCaseSearch) ||
        (r.paymentReference || '').toLowerCase().includes(lowerCaseSearch)
    );
  }, [addFundRequests, addFundSearch]);

  const filteredTransactions = useMemo(() => {
    if (!transactionSearch) return allTransactions;
    const lowerCaseSearch = transactionSearch.toLowerCase();
    return allTransactions.filter(t => 
        (t.userEmail || '').toLowerCase().includes(lowerCaseSearch) ||
        (t.description || '').toLowerCase().includes(lowerCaseSearch)
    );
  }, [allTransactions, transactionSearch]);

  const filteredSupportTickets = useMemo(() => {
    if (!supportTicketSearch) return supportTickets;
    const lowerCaseSearch = supportTicketSearch.toLowerCase();
    return supportTickets.filter(t => 
        (t.userEmail || '').toLowerCase().includes(lowerCaseSearch) ||
        (t.description || '').toLowerCase().includes(lowerCaseSearch)
    );
  }, [supportTickets, supportTicketSearch]);

  const filteredTournaments = useMemo(() => {
    if (!tournamentSearch) return allTournaments;
    const lowerCaseSearch = tournamentSearch.toLowerCase();
    return allTournaments.filter(t => (t.name || '').toLowerCase().includes(lowerCaseSearch));
  }, [allTournaments, tournamentSearch]);

  const filteredStaff = useMemo(() => {
    const usersWithStaffRoles = allUsers.filter(u => u.role && u.role !== 'player');
    if (!staffSearch) return usersWithStaffRoles;
    const lowerCaseSearch = staffSearch.toLowerCase();
    return usersWithStaffRoles.filter(u =>
      (u.displayName || '').toLowerCase().includes(lowerCaseSearch) ||
      (u.email || '').toLowerCase().includes(lowerCaseSearch)
    );
  }, [allUsers, staffSearch]);
  
  const liveStats = useMemo(() => {
    const onlineUsers = allUsers.filter(u => u.isOnline);
    return { onlineCount: onlineUsers.length, gameBreakdown: onlineUsers.reduce((acc, user) => { const game = user.currentGame || 'Idle'; acc[game] = (acc[game] || 0) + 1; return acc; }, {} as {[key: string]: number}) };
  }, [allUsers]);

  useEffect(() => { if (isAdminOrHigher && !loading) { fetchAdminData(); } }, [isAdminOrHigher, loading, fetchAdminData]);

  // --- Handlers for Settings & Actions (Condensed for brevity) ---
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { const { name, value } = e.target; setCurrentAppSettings(prev => ({ ...prev, [name]: e.target.getAttribute('type') === 'number' ? (parseFloat(value) || 0) : value })); };
  const handleAddBalancePresetsChange = (e: React.ChangeEvent<HTMLInputElement>) => { const value = e.target.value; setAddBalancePresetsInput(value); const presets = value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n) && n > 0); setCurrentAppSettings(prev => ({ ...prev, addBalancePresets: presets })); };
  const handleDefaultWinRateChange = (value: string) => { const rate = parseFloat(value); if (!isNaN(rate)) setCurrentAppSettings(prev => ({...prev, defaultWinRate: rate / 100})); };
  const handleWinRateRuleChange = (index: number, field: keyof WinRateRule, value: string | number) => { const updatedRules = [...currentAppSettings.winRateRules]; if (typeof updatedRules[index][field] === 'number') { updatedRules[index][field] = parseFloat(value as string) || 0; } else { (updatedRules[index][field] as string) = value as string; } if (field === 'rate') { updatedRules[index].rate = (value as number) / 100; } setCurrentAppSettings(prev => ({...prev, winRateRules: updatedRules})); };
  const addWinRateRule = () => { const newRule: WinRateRule = { id: `rule-${Date.now()}`, tag: 'new-tag', rate: 0.5, priority: 99 }; setCurrentAppSettings(prev => ({...prev, winRateRules: [...prev.winRateRules, newRule]})); };
  const removeWinRateRule = (id: string) => { setCurrentAppSettings(prev => ({ ...prev, winRateRules: prev.winRateRules.filter(rule => rule.id !== id) })); };
  const handleSaveUserChanges = async () => { if (!editingUser) return; try { const tags = userTagsInput.split(',').map(t => t.trim()).filter(Boolean); const rateValue = manualWinRate === 50 ? null : manualWinRate / 100; await updateUserData(editingUser.id, { manualWinRateOverride: rateValue, tags: tags }); toast({ title: 'User Updated' }); setEditingUser(null); } catch (error: any) { toast({ title: 'Update Failed', description: error.message, variant: 'destructive'}); } };
  const handleUpdateUserRole = async (userId: string, newRole: UserRole) => { if (!isSuperAdmin) { toast({ title: 'Permission Denied', variant: 'destructive'}); return; } try { await updateUserData(userId, { role: newRole }); toast({ title: 'Role Updated' }); } catch (error: any) { toast({ title: 'Role Update Failed', description: error.message, variant: 'destructive' }); } };
  const handleWheelConfigChange = (tierId: string, field: 'name' | 'description' | 'minWithdrawalAmount', value: string) => setCurrentAppSettings(prev => ({ ...prev, wheelConfigs: { ...prev.wheelConfigs, [tierId]: { ...prev.wheelConfigs[tierId], [field]: field === 'minWithdrawalAmount' ? parseFloat(value) || 0 : value }}}));
  const handleToggleLock = (tierId: string, checked: boolean) => setCurrentAppSettings(prev => ({ ...prev, wheelConfigs: { ...prev.wheelConfigs, [tierId]: { ...prev.wheelConfigs[tierId], isLocked: checked }}}));
  const handleCostSettingChange = (tierId: string, field: 'baseCost' | 'tier1Limit' | 'tier1Cost' | 'tier2Limit' | 'tier2Cost' | 'tier3Cost', value: string) => setCurrentAppSettings(prev => ({ ...prev, wheelConfigs: { ...prev.wheelConfigs, [tierId]: { ...prev.wheelConfigs[tierId], costSettings: { ...prev.wheelConfigs[tierId].costSettings, [field]: parseFloat(value) || 0 } } } }));
  const handleSegmentChange = (tierId: string, segmentIndex: number, field: keyof SegmentConfig, value: string) => { setCurrentAppSettings(prev => { const newSegments = [...prev.wheelConfigs[tierId].segments]; newSegments[segmentIndex] = { ...newSegments[segmentIndex], [field]: (field === 'amount' || field === 'probability') ? parseFloat(value) || 0 : value }; return { ...prev, wheelConfigs: { ...prev.wheelConfigs, [tierId]: { ...prev.wheelConfigs[tierId], segments: newSegments }}}; }); };
  const addSegment = (tierId: string) => { const newSegment: SegmentConfig = { id: `${tierId.charAt(0)}${new Date().getTime()}`, text: 'New Prize', emoji: '🎉', amount: 1, probability: 10, color: '0 0% 80%' }; setCurrentAppSettings(prev => ({ ...prev, wheelConfigs: { ...prev.wheelConfigs, [tierId]: { ...prev.wheelConfigs[tierId], segments: [...prev.wheelConfigs[tierId].segments, newSegment] }}})); };
  const removeSegment = (tierId: string, indexToRemove: number) => { if (currentAppSettings.wheelConfigs[tierId].segments.length <= 1) { toast({ title: "Cannot Delete", variant: "destructive" }); return; } setCurrentAppSettings(prev => ({ ...prev, wheelConfigs: { ...prev.wheelConfigs, [tierId]: { ...prev.wheelConfigs[tierId], segments: prev.wheelConfigs[tierId].segments.filter((_, index) => index !== indexToRemove) }}})); };
  const handleDragStart = (tierId: string, index: number) => setDraggedSegment({ tierId, index });
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetTierId: string, dropIndex: number) => { if (!draggedSegment || draggedSegment.tierId !== targetTierId || draggedSegment.index === dropIndex) { setDraggedSegment(null); return; } setCurrentAppSettings(prev => { const newAppSettings = { ...prev }; const segments = [...newAppSettings.wheelConfigs[targetTierId].segments]; const [draggedItem] = segments.splice(draggedSegment.index, 1); segments.splice(dropIndex, 0, draggedItem); newAppSettings.wheelConfigs[targetTierId].segments = segments; return newAppSettings; }); setDraggedSegment(null); };
  const handleDragEnd = () => setDraggedSegment(null);
  const handleToggleUserBlock = async (userId: string, currentStatus: boolean) => { try { await updateUserData(userId, { isBlocked: !currentStatus }); toast({ title: "User Status Updated" }); } catch (error: any) { toast({ title: "Update Failed", description: error.message, variant: "destructive" }); } };
  const handleSaveConfiguration = async () => { try { await saveAppConfigurationToFirestore({ settings: currentAppSettings, newsItems: currentNewsItems }); await refreshAppConfig(); toast({ title: "Configuration Saved" }); } catch (error) { toast({ title: "Save Failed", variant: "destructive" }); } };
  const handleAddNewsItem = () => { if (newNewsItem.trim() === '') return; setCurrentNewsItems(prev => [...prev, newNewsItem.trim()]); setNewNewsItem(''); };
  const handleRemoveNewsItem = (indexToRemove: number) => setCurrentNewsItems(prev => prev.filter((_, index) => index !== indexToRemove));
  const startEditNewsItem = (index: number) => { setEditingNewsItemIndex(index); setEditingNewsItemText(currentNewsItems[index]); };
  const handleSaveEditedNewsItem = () => { if (editingNewsItemIndex === null) return; const updatedNewsItems = [...currentNewsItems]; updatedNewsItems[editingNewsItemIndex] = editingNewsItemText; setCurrentNewsItems(updatedNewsItems); setEditingNewsItemIndex(null); setEditingNewsItemText(''); };
  const handleApproveAddFund = async (request: AddFundRequestData & {id: string}) => { if (!user?.email) return; try { await approveAddFundAndUpdateBalance(request.id, request.userId, request.amount, request.tierId, user.uid, user.email); toast({ title: "Fund Request Approved"}); fetchAdminData(); } catch (error: any) { toast({ title: "Approval Failed", description: error.message, variant: "destructive" }); } };
  const handleRejectAddFund = async (requestId: string) => { if (!user?.email) return; try { await updateAddFundRequestStatus(requestId, "rejected", user.uid, user.email, "Rejected by admin."); toast({ title: "Fund Request Rejected" }); fetchAdminData(); } catch (error: any) { toast({ title: "Rejection Failed", variant: "destructive" }); } };
  const handleApproveWithdrawal = async (request: WithdrawalRequestData & {id: string}) => { if (!user?.email) return; try { await approveWithdrawalAndUpdateBalance(request.id, request.userId, request.amount, request.tierId, getPaymentDetailsString(request), user.uid, user.email); toast({ title: "Withdrawal Approved"}); fetchAdminData(); } catch (error: any) { toast({ title: "Approval Failed", description: error.message, variant: "destructive" }); } };
  const handleRejectWithdrawal = async (requestId: string) => { if (!user?.email) return; try { await updateWithdrawalRequestStatus(requestId, "rejected", user.uid, user.email, "Rejected by admin."); toast({ title: "Withdrawal Rejected" }); fetchAdminData(); } catch (error: any) { toast({ title: "Rejection Failed", variant: "destructive" }); } };
  const handleResolveTicket = async (ticketId: string) => { if (!user?.email) return; try { await updateSupportTicketStatus(ticketId, 'resolved', user.uid, user.email); toast({ title: "Ticket Resolved"}); fetchAdminData(); } catch (error: any) { toast({ title: "Error", variant: "destructive" }); } };
  const activityChartData = useMemo(() => { if (!activitySummary) return []; return [ { name: 'Morning', value: activitySummary.morning, fill: '#FFC107' }, { name: 'Afternoon', value: activitySummary.afternoon, fill: '#2196F3' }, { name: 'Evening', value: activitySummary.evening, fill: '#FF9800' }, { name: 'Night', value: activitySummary.night, fill: '#4A148C' } ]; }, [activitySummary]);
  const handleDailyRewardChange = (index: number, field: keyof DailyReward, value: string | number) => { const updatedRewards = [...currentAppSettings.rewardConfig.dailyRewards]; if (typeof updatedRewards[index][field] === 'number') { updatedRewards[index][field] = parseFloat(value as string) || 0; } else { (updatedRewards[index][field] as string) = value as string; } setCurrentAppSettings(prev => ({...prev, rewardConfig: {...prev.rewardConfig, dailyRewards: updatedRewards}})); };
  const handleStreakBonusChange = (index: number, field: keyof StreakBonus, value: string | number) => { const updatedBonuses = [...currentAppSettings.rewardConfig.streakBonuses]; if (typeof updatedBonuses[index][field] === 'number') { updatedBonuses[index][field] = parseFloat(value as string) || 0; } else { (updatedBonuses[index][field] as string) = value as string; } setCurrentAppSettings(prev => ({...prev, rewardConfig: {...prev.rewardConfig, streakBonuses: updatedBonuses}})); };
  const handleViewParticipants = async (tournamentId: string) => { setCurrentTournamentForView(tournamentId); setViewingTournamentParticipants([]); try { const participants = await getTournamentParticipants(tournamentId); setViewingTournamentParticipants(participants); } catch (error) { toast({ title: "Error", variant: "destructive"}); } };
  const handleDistributePrizes = async (tournamentId: string) => { try { await endTournamentAndDistributePrizes(tournamentId); toast({ title: "Prizes Distributed!"}); fetchAdminData(); } catch (error: any) { toast({ title: "Error", description: `Could not distribute prizes: ${error.message}`, variant: "destructive"}); } };
  // --- End of Handlers ---
  
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Home, permission: isAdminOrHigher },
    { id: 'users', label: 'Users', icon: Users, permission: isAdminOrHigher },
    { id: 'activity', label: 'User Activity', icon: Activity, permission: isAdminOrHigher },
    { id: 'tournaments', label: 'Tournaments', icon: Swords, permission: isAdminOrHigher },
    { id: 'finance-header', label: 'Finance', isHeader: true, permission: isFinanceStaff },
    { id: 'withdrawal-req', label: 'Withdrawals', icon: ArrowDownLeft, count: pendingWithdrawalsCount, permission: isFinanceStaff },
    { id: 'add-fund', label: 'Deposits', icon: ArrowUpRight, count: pendingAddFundsCount, permission: isFinanceStaff },
    { id: 'transactions', label: 'Transactions', icon: History, permission: isFinanceStaff },
    { id: 'support-header', label: 'Support', isHeader: true, permission: isSupportStaff },
    { id: 'support', label: 'Support Tickets', icon: LifeBuoy, count: openSupportTicketsCount, permission: isSupportStaff },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, permission: isAdminOrHigher },
    { id: 'fraud-alerts', label: 'Fraud Alerts', icon: ShieldAlert, count: openFraudAlertsCount, permission: isAdminOrHigher },
    { id: 'settings-header', label: 'Configuration', isHeader: true, permission: isSuperAdmin },
    { id: 'staff-management', label: 'Staff Management', icon: UserCog, permission: isSuperAdmin },
    { id: 'winning-rules', label: 'Winning Rules', icon: BrainCircuit, permission: isSuperAdmin },
    { id: 'daily-rewards', label: 'Daily Rewards', icon: Gift, permission: isSuperAdmin },
    { id: 'wheel-settings', label: 'Wheel Settings', icon: Wand2, permission: isSuperAdmin },
    { id: 'game-settings', label: 'App Settings', icon: Settings, permission: isSuperAdmin },
    { id: 'news-ticker', label: 'News Ticker', icon: Newspaper, permission: isSuperAdmin },
  ];

  if (loading) return <div className="flex-grow flex items-center justify-center"><RefreshCcw className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!user || !isAdminOrHigher) return <div className="flex-grow flex items-center justify-center p-4"><Card className="w-full max-w-md p-6 shadow-xl text-center"><ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" /><CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle><Button onClick={() => router.push('/')} className="mt-6">Go Home</Button></Card></div>;
  
  const renderContent = () => {
    switch (activeView) {
      case 'overview': return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Users" value={allUsers.length} icon={<Users className="h-4 w-4 text-muted-foreground" />} description="All registered users" />
                <StatCard title="Users Online" value={liveStats.onlineCount} icon={<Activity className="h-4 w-4 text-muted-foreground" />} description="Live user count" />
                <StatCard title="Pending Withdrawals" value={pendingWithdrawalsCount} icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />} description="Awaiting approval" />
                <StatCard title="Open Support Tickets" value={openSupportTicketsCount} icon={<LifeBuoy className="h-4 w-4 text-muted-foreground" />} description="Awaiting resolution" />
            </div>
            <Card>
                <CardHeader><CardTitle>Global Cash Flow</CardTitle><CardDescription>High-level financial metrics across the entire platform.</CardDescription></CardHeader>
                <CardContent>
                    {isLoadingData ? <div className="grid gap-4 md:grid-cols-5"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
                    : globalStats && (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            <StatCard title="Total Deposited" value={globalStats.totalDeposited.toFixed(2)} valuePrefix="₹" icon={<ArrowUpRight className="h-4 w-4 text-green-500"/>} />
                            <StatCard title="Total Withdrawn" value={globalStats.totalWithdrawn.toFixed(2)} valuePrefix="₹" icon={<ArrowDownLeft className="h-4 w-4 text-red-500"/>} />
                            <StatCard title="Current Balance" value={globalStats.currentBalance.toFixed(2)} valuePrefix="₹" icon={<Wallet className="h-4 w-4 text-blue-500"/>} />
                            <StatCard title="Total Winnings" value={globalStats.totalWinnings.toFixed(2)} valuePrefix="₹" icon={<Trophy className="h-4 w-4 text-yellow-500"/>} />
                            <StatCard title="GST Collected (2%)" value={globalStats.totalGstCollected.toFixed(2)} valuePrefix="₹" icon={<Landmark className="h-4 w-4 text-gray-500"/>} />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      );
      case 'users': return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div><CardTitle>User Management</CardTitle><CardDescription>View and manage all registered users.</CardDescription></div>
              <div className="flex items-center gap-2"><div className="relative w-full max-w-sm"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or email..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-8" /></div><Select value={userSortBy} onValueChange={setUserSortBy}><SelectTrigger id="user-sort" className="w-[180px]"><SelectValue placeholder="Sort by..." /></SelectTrigger><SelectContent><SelectItem value="totalWinnings_desc">Highest Winnings</SelectItem><SelectItem value="lastActive_desc">Most Recently Active</SelectItem><SelectItem value="totalDeposited_desc">Highest Deposits</SelectItem><SelectItem value="createdAt_desc">Newest First</SelectItem></SelectContent></Select></div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Live Status</TableHead>{Object.keys(appSettings.wheelConfigs).map(tierId => <TableHead key={tierId}>{getTierName(tierId, appSettings.wheelConfigs)} Bal.</TableHead>)}<TableHead>Joined</TableHead><TableHead>Last Active</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isUsersLoading ? <TableRow><TableCell colSpan={10} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading users...</TableCell></TableRow>
                        : sortedUsers.map((u) => (
                            <TableRow key={u.id}>
                                <TableCell><div className="flex items-center gap-3"><Avatar className="w-9 h-9 border-2 border-border"><AvatarImage src={u.photoURL || undefined}/><AvatarFallback>{getAvatarFallback(u)}</AvatarFallback></Avatar><div><p className="font-semibold">{u.displayName || 'N/A'}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div></TableCell>
                                <TableCell><Badge variant={u.role === 'super-admin' || u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">{u.role || 'player'}</Badge></TableCell>
                                <TableCell>{u.isOnline ? <div className="flex items-center gap-2 text-green-600"><div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div><span>Online</span></div> : <div className="flex items-center gap-2 text-muted-foreground"><div className="h-2 w-2 rounded-full bg-gray-400"></div><span>Offline</span></div>}</TableCell>
                                {Object.keys(appSettings.wheelConfigs).map(tierId => <TableCell key={tierId}>₹{u.balances?.[tierId]?.toFixed(2) ?? '0.00'}</TableCell>)}
                                <TableCell>{formatDisplayDate(u.createdAt, 'date')}</TableCell>
                                <TableCell>{formatDisplayDate(u.lastActive)}</TableCell>
                                <TableCell><Badge variant={u.isBlocked ? 'destructive' : 'default'}>{u.isBlocked ? 'Blocked' : 'Active'}</Badge></TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => setEditingUser(u)}><Pencil className="mr-2 h-4 w-4" />Manage User</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => handleToggleUserBlock(u.id, u.isBlocked || false)} disabled={u.role === 'super-admin'} className={cn(u.isBlocked && "text-green-600 focus:text-green-600")}>{u.isBlocked ? <Users2 className="mr-2 h-4 w-4" /> : <Ban className="mr-2 h-4 w-4 text-destructive"/>}{u.isBlocked ? 'Unblock' : 'Block'}</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      );
      case 'activity': return (
        <Card><CardHeader><CardTitle>User Activity</CardTitle><CardDescription>Unique active users based on time of day (last 24 hours).</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                {isLoadingData ? <div className="flex justify-center items-center h-64"><RefreshCcw className="h-8 w-8 animate-spin text-primary" /></div>
                : activitySummary && activityChartData.length > 0 ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Morning" value={activitySummary.morning} icon={<Sunrise className="h-4 w-4 text-muted-foreground" />} description="6am - 12pm" />
                        <StatCard title="Afternoon" value={activitySummary.afternoon} icon={<Sun className="h-4 w-4 text-muted-foreground" />} description="12pm - 5pm" />
                        <StatCard title="Evening" value={activitySummary.evening} icon={<Sunset className="h-4 w-4 text-muted-foreground" />} description="5pm - 9pm" />
                        <StatCard title="Night" value={activitySummary.night} icon={<Moon className="h-4 w-4 text-muted-foreground" />} description="9pm - 6am" />
                    </div>
                    <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={activityChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(props) => `${props.name}: ${props.percent ? (props.percent * 100).toFixed(0) : 0}%`} >{activityChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                </>
                ) : <div className="text-center text-muted-foreground py-10">No activity data available.</div>}
            </CardContent>
        </Card>
      );
      case 'tournaments': return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div><CardTitle>Tournament Management</CardTitle><CardDescription>Create, monitor, and manage tournaments.</CardDescription></div>
              <div className="flex items-center gap-2">
                <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name..." value={tournamentSearch} onChange={(e) => setTournamentSearch(e.target.value)} className="pl-8" /></div>
                <Button onClick={() => setIsTournamentModalOpen(true)}>Create Tournament</Button>
              </div>
            </CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Dates</TableHead><TableHead>Participants</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                    {isLoadingData ? <TableRow><TableCell colSpan={6} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading tournaments...</TableCell></TableRow>
                    : filteredTournaments.map((t) => (<TableRow key={t.id}><TableCell className="font-bold">{t.name}</TableCell><TableCell>{t.type}</TableCell><TableCell><Badge variant={t.status === 'active' ? 'default' : t.status === 'ended' ? 'secondary' : 'destructive'}>{t.status}</Badge></TableCell><TableCell>{formatDisplayDate(t.startDate, 'date')} to {formatDisplayDate(t.endDate, 'date')}</TableCell><TableCell>{t.participants?.length || 0}</TableCell><TableCell className="flex gap-2"><Button variant="outline" size="sm" onClick={() => handleViewParticipants(t.id!)}>View</Button>{t.status === 'active' && <Button variant="destructive" size="sm" onClick={() => handleDistributePrizes(t.id!)}>End & Distribute</Button>}</TableCell></TableRow>))}
                    {!isLoadingData && filteredTournaments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center h-24">No tournaments found.</TableCell></TableRow>}
                </TableBody></Table>
            </CardContent>
        </Card>
      );
      case 'withdrawal-req': return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4"><div><CardTitle>Withdrawal Requests</CardTitle><CardDescription>Manage pending user withdrawals.</CardDescription></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by email..." value={withdrawalSearch} onChange={(e) => setWithdrawalSearch(e.target.value)} className="pl-8" /></div></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Gross Amt.</TableHead><TableHead>Net Pay</TableHead><TableHead>Tier</TableHead><TableHead>Details</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingData ? <TableRow><TableCell colSpan={8} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                  : filteredWithdrawals.map((req) => (<TableRow key={req.id}><TableCell>{req.userEmail}</TableCell><TableCell>₹{req.amount.toFixed(2)}</TableCell><TableCell className="font-semibold text-primary">₹{(req.amount - req.amount * 0.02).toFixed(2)}</TableCell><TableCell><Badge variant="outline">{getTierName(req.tierId, appSettings.wheelConfigs)}</Badge></TableCell><TableCell className="text-xs">{getPaymentDetailsString(req)}</TableCell><TableCell>{formatDisplayDate(req.requestDate, 'date')}</TableCell><TableCell><Badge variant={req.status === 'pending' ? 'secondary' : (req.status === 'processed' || req.status === 'approved') ? 'default' : 'destructive'}>{req.status}</Badge></TableCell><TableCell>{req.status === 'pending' && (<div className="flex gap-1"><Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApproveWithdrawal(req)}>Approve</Button><Button variant="destructive" size="sm" onClick={() => handleRejectWithdrawal(req.id)}>Reject</Button></div>)}</TableCell></TableRow>))}
                  {!isLoadingData && filteredWithdrawals.length === 0 && (<TableRow><TableCell colSpan={8} className="text-center h-24">No pending withdrawal requests.</TableCell></TableRow>)}
                </TableBody></Table>
            </CardContent>
        </Card>
      );
      case 'add-fund': return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4"><div><CardTitle>Add Fund Requests</CardTitle><CardDescription>Manage pending user fund additions.</CardDescription></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by email or reference..." value={addFundSearch} onChange={(e) => setAddFundSearch(e.target.value)} className="pl-8" /></div></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Amount</TableHead><TableHead>Tier</TableHead><TableHead>Reference</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingData ? <TableRow><TableCell colSpan={7} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                  : filteredAddFunds.map((req) => (<TableRow key={req.id}><TableCell>{req.userEmail}</TableCell><TableCell>₹{req.amount.toFixed(2)}</TableCell><TableCell><Badge variant="outline">{getTierName(req.tierId, appSettings.wheelConfigs)}</Badge></TableCell><TableCell className="text-xs">{req.paymentReference}</TableCell><TableCell>{formatDisplayDate(req.requestDate, 'date')}</TableCell><TableCell><Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>{req.status}</Badge></TableCell><TableCell>{req.status === 'pending' && (<div className="flex gap-1"><Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => handleApproveAddFund(req)}>Approve</Button><Button variant="destructive" size="sm" onClick={() => handleRejectAddFund(req.id)}>Reject</Button></div>)}</TableCell></TableRow>))}
                  {!isLoadingData && filteredAddFunds.length === 0 && (<TableRow><TableCell colSpan={7} className="text-center h-24">No pending add fund requests.</TableCell></TableRow>)}
                </TableBody></Table>
            </CardContent>
        </Card>
      );
      case 'transactions': return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4"><div><CardTitle>All Transactions</CardTitle><CardDescription>History of all transactions across all users.</CardDescription></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by email or description..." value={transactionSearch} onChange={(e) => setTransactionSearch(e.target.value)} className="pl-8" /></div></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Description</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingData ? <TableRow><TableCell colSpan={6} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                  : filteredTransactions.map((t) => (<TableRow key={t.id}><TableCell>{t.userEmail}</TableCell><TableCell><span className={`flex items-center gap-1 ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'credit' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}{t.type}</span></TableCell><TableCell className={`font-semibold ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{t.amount.toFixed(2)}</TableCell><TableCell className="max-w-xs whitespace-pre-wrap">{t.description}</TableCell><TableCell>{formatDisplayDate(t.date)}</TableCell><TableCell><Badge variant={t.status === 'completed' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'}>{t.status}</Badge></TableCell></TableRow>))}
                  {!isLoadingData && filteredTransactions.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center h-24">No transactions found.</TableCell></TableRow>)}
                </TableBody></Table>
            </CardContent>
        </Card>
      );
      case 'leaderboard': return (
        <Card><CardHeader><CardTitle>Leaderboard</CardTitle><CardDescription>Top players by total winnings.</CardDescription></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Player</TableHead><TableHead className="text-right">Total Winnings (₹)</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingData ? <TableRow><TableCell colSpan={3} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                  : leaderboard.map((player, index) => (<TableRow key={player.uid}><TableCell className="font-bold">{index + 1}</TableCell><TableCell>{player.displayName || player.email}</TableCell><TableCell className="text-right font-semibold text-primary">₹{(player.totalWinnings || 0).toFixed(2)}</TableCell></TableRow>))}
                </TableBody></Table>
            </CardContent>
        </Card>
      );
      case 'support': return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4"><div><CardTitle>Support Tickets</CardTitle><CardDescription>Manage user-submitted issues and questions.</CardDescription></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by email or description..." value={supportTicketSearch} onChange={(e) => setSupportTicketSearch(e.target.value)} className="pl-8" /></div></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Description</TableHead><TableHead>Screenshot</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingData ? <TableRow><TableCell colSpan={6} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                  : filteredSupportTickets.map((ticket) => (<TableRow key={ticket.id}><TableCell>{ticket.userEmail}</TableCell><TableCell className="max-w-sm whitespace-pre-wrap">{ticket.description}</TableCell><TableCell>{ticket.screenshotURL ? <Dialog><DialogTrigger asChild><Button variant="outline" size="sm">View</Button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Screenshot</DialogTitle><DialogDescription>Screenshot attached to the support ticket.</DialogDescription></DialogHeader><div className="flex justify-center p-4"><Image src={ticket.screenshotURL} alt={`Screenshot`} width={800} height={600} className="rounded-md object-contain max-h-[70vh]"/></div></DialogContent></Dialog> : "N/A"}</TableCell><TableCell>{formatDisplayDate(ticket.createdAt, 'date')}</TableCell><TableCell><Badge variant={ticket.status === 'open' ? 'destructive' : 'default'}>{ticket.status}</Badge></TableCell><TableCell>{ticket.status === 'open' && (<Button variant="outline" size="sm" onClick={() => handleResolveTicket(ticket.id)}>Mark Resolved</Button>)}</TableCell></TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
        </Card>
      );
      case 'fraud-alerts': return (
        <Card><CardHeader><CardTitle>Fraud Alerts</CardTitle><CardDescription>Alerts for suspicious user activities.</CardDescription></CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {isLoadingData ? <TableRow><TableCell colSpan={4} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                  : fraudAlerts.map((alert) => (<TableRow key={alert.id}><TableCell>{alert.userEmail}</TableCell><TableCell className="font-medium text-destructive">{alert.reason}</TableCell><TableCell>{formatDisplayDate(alert.timestamp)}</TableCell><TableCell><Badge variant={alert.status === 'open' ? 'destructive' : 'default'}>{alert.status}</Badge></TableCell></TableRow>))}
                </TableBody></Table>
            </CardContent>
        </Card>
      );
      case 'staff-management': return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div><CardTitle>Staff Management</CardTitle><CardDescription>Assign roles to users to manage the application.</CardDescription></div>
              <div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or email..." value={staffSearch} onChange={(e) => setStaffSearch(e.target.value)} className="pl-8" /></div>
            </CardHeader>
            <CardContent><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Current Role</TableHead><TableHead>Change Role</TableHead></TableRow></TableHeader>
                <TableBody>
                    {isUsersLoading ? <TableRow><TableCell colSpan={3} className="text-center h-24"><RefreshCcw className="h-5 w-5 animate-spin inline mr-2"/>Loading...</TableCell></TableRow>
                    : filteredStaff.map((u) => (<TableRow key={u.id}><TableCell><div className="flex items-center gap-2"><Avatar className="w-8 h-8"><AvatarImage src={u.photoURL || undefined} /><AvatarFallback>{getAvatarFallback(u)}</AvatarFallback></Avatar><div><p className="font-semibold">{u.displayName || 'N/A'}</p><p className="text-xs text-muted-foreground">{u.email}</p></div></div></TableCell><TableCell><Badge variant={u.role === 'super-admin' ? 'destructive' : (u.role === 'admin' ? 'default' : 'secondary')} className="capitalize">{u.role || 'player'}</Badge></TableCell><TableCell><Select defaultValue={u.role || 'player'} onValueChange={(newRole) => handleUpdateUserRole(u.id, newRole as UserRole)} disabled={u.role === 'super-admin' && u.uid !== user.uid}><SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="player">Player</SelectItem><SelectItem value="support-staff">Support Staff</SelectItem><SelectItem value="finance-staff">Finance Staff</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="super-admin">Super Admin</SelectItem></SelectContent></Select></TableCell></TableRow>))}
                </TableBody></Table>
            </CardContent>
        </Card>
      );
      case 'winning-rules': return (
        <Card><CardHeader><CardTitle>Dynamic Winning Rules</CardTitle><CardDescription>Control win probability for user groups. Lower priority number = higher priority.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div><Label htmlFor="defaultWinRate">Default Win Rate (%)</Label><Input id="defaultWinRate" type="number" value={(currentAppSettings.defaultWinRate * 100).toFixed(0)} onChange={(e) => handleDefaultWinRateChange(e.target.value)} className="max-w-xs mt-1" /><p className="text-xs text-muted-foreground mt-1">Base win chance if no other rules apply.</p></div>
                <div className="border-t pt-4"><h3 className="font-semibold text-lg mb-2">Tag-Based Rules</h3><Table><TableHeader><TableRow><TableHead>Priority</TableHead><TableHead>Tag</TableHead><TableHead>Win Rate (%)</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>{currentAppSettings.winRateRules.sort((a,b) => a.priority - b.priority).map((rule, index) => (<TableRow key={rule.id}><TableCell><Input type="number" value={rule.priority} onChange={(e) => handleWinRateRuleChange(index, 'priority', e.target.value)} className="w-20" /></TableCell><TableCell><Input value={rule.tag} onChange={(e) => handleWinRateRuleChange(index, 'tag', e.target.value)} /></TableCell><TableCell><Input type="number" value={(rule.rate * 100).toFixed(0)} onChange={(e) => handleWinRateRuleChange(index, 'rate', e.target.value)} className="w-24" /></TableCell><TableCell><Button variant="destructive" size="icon" onClick={() => removeWinRateRule(rule.id)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table><Button onClick={addWinRateRule} variant="outline" className="mt-4">Add Rule</Button></div>
            </CardContent>
        </Card>
      );
      case 'daily-rewards': return (
        <Card><CardHeader><CardTitle>Daily Rewards & Streaks</CardTitle><CardDescription>Configure daily login and streak rewards.</CardDescription></CardHeader>
            <CardContent className="space-y-8">
                <div><h3 className="font-semibold text-lg mb-2">Daily Login Rewards (7-Day Cycle)</h3><Table><TableHeader><TableRow><TableHead>Day</TableHead><TableHead>Emoji</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead></TableRow></TableHeader><TableBody>{currentAppSettings.rewardConfig.dailyRewards.map((reward, index) => (<TableRow key={reward.day}><TableCell className="font-bold">{reward.day}</TableCell><TableCell><Input value={reward.emoji} onChange={(e) => handleDailyRewardChange(index, 'emoji', e.target.value)} className="w-16"/></TableCell><TableCell><Select value={reward.type} onValueChange={(value) => handleDailyRewardChange(index, 'type', value)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="spin">Spins</SelectItem><SelectItem value="credit">Credits (₹)</SelectItem></SelectContent></Select></TableCell><TableCell><Input type="number" value={reward.value} onChange={(e) => handleDailyRewardChange(index, 'value', e.target.value)} className="w-24"/></TableCell></TableRow>))}</TableBody></Table></div>
                <div className="border-t pt-6"><h3 className="font-semibold text-lg mb-2">Streak Bonuses</h3><Table><TableHeader><TableRow><TableHead>After X Days</TableHead><TableHead>Emoji</TableHead><TableHead>Type</TableHead><TableHead>Value</TableHead></TableRow></TableHeader><TableBody>{currentAppSettings.rewardConfig.streakBonuses.map((bonus, index) => (<TableRow key={bonus.afterDays}><TableCell><Input type="number" value={bonus.afterDays} onChange={(e) => handleStreakBonusChange(index, 'afterDays', e.target.value)} className="w-24"/></TableCell><TableCell><Input value={bonus.emoji} onChange={(e) => handleStreakBonusChange(index, 'emoji', e.target.value)} className="w-16"/></TableCell><TableCell><Select value={bonus.type} onValueChange={(value) => handleStreakBonusChange(index, 'type', value)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="spin">Spins</SelectItem><SelectItem value="credit">Credits (₹)</SelectItem></SelectContent></Select></TableCell><TableCell><Input type="number" value={bonus.value} onChange={(e) => handleStreakBonusChange(index, 'value', e.target.value)} className="w-24"/></TableCell></TableRow>))}</TableBody></Table></div>
                <div className="border-t pt-6"><h3 className="font-semibold text-lg mb-2">Settings</h3><div className="flex items-center space-x-2"><Switch id="reset-streak" checked={currentAppSettings.rewardConfig.resetIfMissed} onCheckedChange={(checked) => setCurrentAppSettings(prev => ({...prev, rewardConfig: {...prev.rewardConfig, resetIfMissed: checked}}))} /><Label htmlFor="reset-streak">Reset streak if user misses a day</Label></div></div>
            </CardContent>
        </Card>
      );
      case 'wheel-settings': return (
        <Card><CardHeader><CardTitle>Wheel &amp; Segment Settings</CardTitle><CardDescription>Control prizes, costs, and appearance for each wheel.</CardDescription></CardHeader>
            <CardContent><Accordion type="single" collapsible className="w-full" defaultValue="item-little">{Object.values(currentAppSettings.wheelConfigs).map((tier) => (<AccordionItem value={`item-${tier.id}`} key={tier.id}><AccordionTrigger className="text-xl font-semibold">{tier.name}</AccordionTrigger><AccordionContent className="space-y-6 p-4">
                <div className="border p-4 rounded-md space-y-4"><h3 className="font-semibold text-lg">Arena Settings</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><Label>Name</Label><Input value={tier.name} onChange={(e) => handleWheelConfigChange(tier.id, 'name', e.target.value)} /></div><div><Label>Description</Label><Input value={tier.description} onChange={(e) => handleWheelConfigChange(tier.id, 'description', e.target.value)} /></div><div><Label>Min Withdrawal (₹)</Label><Input type="number" value={tier.minWithdrawalAmount} onChange={(e) => handleWheelConfigChange(tier.id, 'minWithdrawalAmount', e.target.value)} /></div></div><div className="flex items-center space-x-2 pt-2"><Switch id={`lock-switch-${tier.id}`} checked={tier.isLocked} onCheckedChange={(checked) => handleToggleLock(tier.id, checked)} /><Label htmlFor={`lock-switch-${tier.id}`} className="text-destructive font-semibold">Lock arena</Label></div></div>
                <div className="border p-4 rounded-md space-y-4"><h3 className="font-semibold text-lg">Spin Cost Settings</h3>{tier.costSettings.type === 'fixed' ? <div className="md:col-span-3"><Label>Spin Cost (₹)</Label><Input type="number" value={tier.costSettings.baseCost} onChange={(e) => handleCostSettingChange(tier.id, 'baseCost', e.target.value)} /></div> : <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-5 gap-2"><div><Label>Tier 1 Limit</Label><Input type="number" value={tier.costSettings.tier1Limit} onChange={(e) => handleCostSettingChange(tier.id, 'tier1Limit', e.target.value)} /></div><div><Label>Tier 1 Cost</Label><Input type="number" value={tier.costSettings.tier1Cost} onChange={(e) => handleCostSettingChange(tier.id, 'tier1Cost', e.target.value)} /></div><div><Label>Tier 2 Limit</Label><Input type="number" value={tier.costSettings.tier2Limit} onChange={(e) => handleCostSettingChange(tier.id, 'tier2Limit', e.target.value)} /></div><div><Label>Tier 2 Cost</Label><Input type="number" value={tier.costSettings.tier2Cost} onChange={(e) => handleCostSettingChange(tier.id, 'tier2Cost', e.target.value)} /></div><div><Label>Tier 3 Cost</Label><Input type="number" value={tier.costSettings.tier3Cost} onChange={(e) => handleCostSettingChange(tier.id, 'tier3Cost', e.target.value)} /></div></div>}</div>
                <h4 className="font-semibold text-lg border-b pb-2 flex justify-between items-center">Segments<CardDescription className="text-xs">Actual win chance is set in 'Winning Rules'.</CardDescription></h4>
                <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Emoji</TableHead><TableHead>Text</TableHead><TableHead>Amount (₹)</TableHead><TableHead>Weight</TableHead><TableHead>Color (HSL)</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody onDragOver={handleDragOver}>{tier.segments.map((seg, index) => (<TableRow key={seg.id} draggable onDragStart={() => handleDragStart(tier.id, index)} onDrop={() => handleDrop(tier.id, index)} onDragEnd={handleDragEnd} className={cn("cursor-move", draggedSegment?.tierId === tier.id && draggedSegment?.index === index && "opacity-50 bg-primary/20")}><TableCell className="text-center font-medium"><GripVertical className="h-5 w-5 text-muted-foreground inline" /> {index + 1}</TableCell><TableCell><Input value={seg.emoji} onChange={(e) => handleSegmentChange(tier.id, index, 'emoji', e.target.value)} className="w-16" /></TableCell><TableCell><Input value={seg.text} onChange={(e) => handleSegmentChange(tier.id, index, 'text', e.target.value)} /></TableCell><TableCell><Input type="number" value={seg.amount} onChange={(e) => handleSegmentChange(tier.id, index, 'amount', e.target.value)} /></TableCell><TableCell><Input type="number" value={seg.probability} onChange={(e) => handleSegmentChange(tier.id, index, 'probability', e.target.value)} /></TableCell><TableCell><Input value={seg.color} onChange={(e) => handleSegmentChange(tier.id, index, 'color', e.target.value)} /></TableCell><TableCell><Button variant="destructive" size="icon" onClick={() => removeSegment(tier.id, index)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table>
                <Button onClick={() => addSegment(tier.id)} variant="outline">Add Segment</Button>
            </AccordionContent></AccordionItem>))}</Accordion>
            </CardContent>
        </Card>
      );
      case 'game-settings': return (
        <Card><CardHeader><CardTitle>General App Settings</CardTitle><CardDescription>Modify core app parameters.</CardDescription></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1"><Label>App Name</Label><Input name="appName" value={currentAppSettings.appName} onChange={handleSettingsChange} /></div>
                <div className="space-y-1"><Label>Payment UPI ID</Label><Input name="upiId" value={currentAppSettings.upiId} onChange={handleSettingsChange} /></div>
                <div className="space-y-1"><Label>Initial Balance (₹)</Label><Input type="number" name="initialBalanceForNewUsers" value={currentAppSettings.initialBalanceForNewUsers} onChange={handleSettingsChange} /></div>
                <div className="space-y-1"><Label>Initial Free Spins</Label><Input type="number" name="maxSpinsInBundle" value={currentAppSettings.maxSpinsInBundle} onChange={handleSettingsChange} /></div>
                <div className="space-y-1"><Label>Min Add Balance (₹)</Label><Input type="number" name="minAddBalanceAmount" value={currentAppSettings.minAddBalanceAmount} onChange={handleSettingsChange} /></div>
                <div className="space-y-1"><Label>Add Balance Presets</Label><Input value={addBalancePresetsInput} onChange={handleAddBalancePresetsChange} placeholder="e.g. 100, 200, 500" /><CardDescription className="text-xs">Comma-separated numbers</CardDescription></div>
                <div className="space-y-1"><Label>News Ticker Speed (s)</Label><Input type="number" name="newsTickerSpeed" value={currentAppSettings.newsTickerSpeed} onChange={handleSettingsChange} /></div>
                <div className="space-y-1"><Label>Referral Bonus (New User, ₹)</Label><Input type="number" name="referralBonusForNewUser" value={currentAppSettings.referralBonusForNewUser} onChange={handleSettingsChange} /></div>
                <div className="space-y-1"><Label>Referral Bonus (Referrer, ₹)</Label><Input type="number" name="referralBonusForReferrer" value={currentAppSettings.referralBonusForReferrer} onChange={handleSettingsChange} /></div>
            </CardContent>
        </Card>
      );
      case 'news-ticker': return (
        <Card><CardHeader><CardTitle>News Ticker</CardTitle><CardDescription>Manage scrolling news items.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {currentNewsItems.map((item, index) => (<div key={index} className="flex items-center gap-2">{editingNewsItemIndex === index ? (<><Textarea value={editingNewsItemText} onChange={(e) => setEditingNewsItemText(e.target.value)} className="flex-grow" rows={2}/><Button onClick={handleSaveEditedNewsItem} size="icon" variant="outline"><Save className="h-4 w-4"/></Button><Button onClick={() => setEditingNewsItemIndex(null)} size="icon" variant="ghost"><X className="h-4 w-4"/></Button></>) : (<><Input value={item} readOnly className="bg-muted" /><Button onClick={() => startEditNewsItem(index)} variant="outline" size="icon"><Edit2 className="h-4 w-4"/></Button><Button onClick={() => handleRemoveNewsItem(index)} variant="destructive" size="icon"><Trash2 className="h-4 w-4"/></Button></>)}</div>))}
              <div className="flex items-center gap-2 pt-4 border-t"><Textarea placeholder="New news item..." value={newNewsItem} onChange={(e) => setNewNewsItem(e.target.value)} className="flex-grow" rows={2}/><Button onClick={handleAddNewsItem} variant="outline" className="self-end">Add Item</Button></div>
            </CardContent>
        </Card>
      );
      default: return <Card><CardHeader><CardTitle>Select a view</CardTitle></CardHeader></Card>;
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
         <div className="flex h-[60px] items-center gap-3 border-b px-6">
           <Link href="/" className="flex items-center gap-2 font-semibold text-lg"><ShieldCheck className="h-7 w-7 text-primary" /><span>Spinify Admin</span></Link>
         </div>
         <nav className="flex-1 space-y-1 overflow-auto p-2">
           {navItems.map((item) => item.permission && <NavLink key={item.id} {...item} activeView={activeView} setActiveView={setActiveView} />)}
         </nav>
          <div className="mt-auto p-4 border-t space-y-2">
            <Button variant="ghost" className="w-full justify-start" asChild><Link href="/"><Home className="mr-2 h-4 w-4" />Back to App</Link></Button>
            <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => logout(false)}><LogOut className="mr-2 h-4 w-4"/>Logout</Button>
        </div>
       </aside>
       <div className="flex flex-col sm:ml-64">
         <header className="sticky top-0 z-30 flex h-[60px] items-center gap-4 border-b bg-background px-6">
            <Sheet>
                <SheetTrigger asChild><Button size="icon" variant="outline" className="sm:hidden"><PanelLeft className="h-5 w-5"/></Button></SheetTrigger>
                <SheetContent side="left" className="sm:max-w-xs p-0"><nav className="grid gap-2 text-lg font-medium p-4">{navItems.map((item) => item.permission && <NavLink key={`mob-${item.id}`} {...item} activeView={activeView} setActiveView={setActiveView} isMobile />)}</nav></SheetContent>
            </Sheet>
           <h1 className="flex-1 text-xl font-semibold capitalize">{activeView.replace(/-/g, ' ')}</h1>
           <div className="flex items-center gap-2">
            {isSuperAdmin && <Button onClick={handleSaveConfiguration} size="sm">Save Changes</Button>}
            <Button onClick={fetchAdminData} variant="outline" size="sm">Refresh Data</Button>
           </div>
         </header>
         <main className="flex-1 overflow-y-auto p-4 md:p-8">
            {renderContent()}
         </main>
       </div>
       
      <Dialog open={!!editingUser} onOpenChange={(isOpen) => !isOpen && setEditingUser(null)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Manage User: {editingUser?.displayName}</DialogTitle><DialogDescription>{editingUser?.email}</DialogDescription></DialogHeader>
          <div className="py-4 space-y-6">
             <div className="grid grid-cols-2 gap-4 text-center"><div><Label>Total Spins</Label><p className="font-bold text-2xl">{editingUser?.totalSpinsPlayed || 0}</p></div><div><Label>Win/Loss</Label><p className="font-bold text-2xl">{editingUser?.totalWins || 0} / {(editingUser?.totalSpinsPlayed || 0) - (editingUser?.totalWins || 0)}</p></div></div>
             <div className="space-y-2"><Label htmlFor="tags">User Tags</Label><Input id="tags" value={userTagsInput} onChange={(e) => setUserTagsInput(e.target.value)} placeholder="e.g. new,vip,high-loss"/><CardDescription className="text-xs">Comma-separated tags for dynamic win rates.</CardDescription></div>
             <div className="space-y-2"><Label htmlFor="winRate">Manual Win Rate Override: <span className="font-bold text-primary">{manualWinRate}%</span></Label><Slider id="winRate" min={0} max={100} step={1} value={[manualWinRate]} onValueChange={(value) => setManualWinRate(value[0])} /><CardDescription className="text-xs">Set to 50% to disable and use tag-based rules.</CardDescription></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button><Button onClick={handleSaveUserChanges}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      
      <CreateTournamentDialog isOpen={isTournamentModalOpen} onClose={() => setIsTournamentModalOpen(false)} adminId={user.uid} onTournamentCreated={fetchAdminData} />
      
      <Dialog open={!!viewingTournamentParticipants} onOpenChange={() => setViewingTournamentParticipants(null)}>
        <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Tournament Participants</DialogTitle><DialogDescription>Live leaderboard for {allTournaments.find(t => t.id === currentTournamentForView)?.name}</DialogDescription></DialogHeader>
          <Table><TableHeader><TableRow><TableHead>Rank</TableHead><TableHead>Player</TableHead><TableHead>Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {!viewingTournamentParticipants || viewingTournamentParticipants.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center h-24">No participants yet.</TableCell></TableRow>
              : (viewingTournamentParticipants.map((p, index) => (<TableRow key={p.userId}><TableCell className="font-bold">{index + 1}</TableCell><TableCell className="flex items-center gap-2"><Avatar className="w-8 h-8"><AvatarImage src={p.userPhotoURL}/><AvatarFallback>{p.userDisplayName[0]}</AvatarFallback></Avatar>{p.userDisplayName}</TableCell><TableCell>{p.score}</TableCell></TableRow>)))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

    </div>
  );
}


// --- Create Tournament Dialog Component ---
const CreateTournamentDialog = ({ isOpen, onClose, adminId, onTournamentCreated }: { isOpen: boolean, onClose: () => void, adminId: string, onTournamentCreated: () => void }) => {
  const { toast } = useToast();
  const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [type, setType] = useState<'daily' | 'weekly' | 'monthly' | 'special'>('weekly'); const [startDate, setStartDate] = useState<Date | undefined>(new Date()); const [endDate, setEndDate] = useState<Date | undefined>(); const [entryFee, setEntryFee] = useState('0'); const [prizePool, setPrizePool] = useState('1000'); const [tierId, setTierId] = useState('little');
  const [rewards, setRewards] = useState<TournamentReward[]>([{ rank: 1, prize: 500, type: 'cash' }, { rank: 2, prize: 300, type: 'cash' }, { rank: 3, prize: 200, type: 'cash' }]);
  const handleAddReward = () => setRewards([...rewards, { rank: rewards.length + 1, prize: 0, type: 'cash' }]);
  const handleRemoveReward = (index: number) => setRewards(rewards.filter((_, i) => i !== index));
  const handleRewardChange = (index: number, field: keyof TournamentReward, value: any) => { const newRewards = [...rewards]; if(field === 'prize' || field === 'rank') { newRewards[index][field] = parseInt(value, 10) || 0; } else { newRewards[index][field] = value; } setRewards(newRewards); };
  const handleSubmit = async () => {
    if (!name || !description || !startDate || !endDate || rewards.length === 0) { toast({ title: 'Missing Fields', variant: 'destructive' }); return; }
    try { await createTournament({ name, description, type, startDate: Timestamp.fromDate(startDate), endDate: Timestamp.fromDate(endDate), entryFee: parseFloat(entryFee), prizePool: parseFloat(prizePool), tierId, rewards, status: 'upcoming' }, adminId); toast({ title: 'Tournament Created!' }); onTournamentCreated(); onClose(); } catch (error: any) { toast({ title: 'Creation Failed', description: error.message, variant: 'destructive' }); }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Create New Tournament</DialogTitle><DialogDescription>Fill in the details to create a new competitive event.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Type</Label><Select value={type} onValueChange={(v) => setType(v as any)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="special">Special</SelectItem></SelectContent></Select></div>
          <div className="md:col-span-2 space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="space-y-2"><Label>Start Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{startDate ? format(startDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent></Popover></div>
          <div className="space-y-2"><Label>End Date</Label><Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4"/>{endDate ? format(endDate, "PPP") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent></Popover></div>
          <div className="space-y-2"><Label>Entry Fee (₹)</Label><Input type="number" value={entryFee} onChange={e => setEntryFee(e.target.value)} /></div>
          <div className="space-y-2"><Label>Prize Pool (₹)</Label><Input type="number" value={prizePool} onChange={e => setPrizePool(e.target.value)} /></div>
          <div className="space-y-2"><Label>Entry Fee Wallet</Label><Select value={tierId} onValueChange={setTierId}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="little">Little Lux</SelectItem><SelectItem value="big">Big Bonanza</SelectItem><SelectItem value="more-big">Mega Millions</SelectItem><SelectItem value="stall-machine">Stall Machine</SelectItem></SelectContent></Select></div>
        </div>
        <div><Label>Reward Distribution</Label>{rewards.map((r, i) => (<div key={i} className="flex items-center gap-2 my-1"><Input type="number" value={r.rank} onChange={e => handleRewardChange(i, 'rank', e.target.value)} placeholder="Rank" className="w-16" /><Input type="number" value={r.prize} onChange={e => handleRewardChange(i, 'prize', e.target.value)} placeholder="Prize" /><Select value={r.type} onValueChange={v => handleRewardChange(i, 'type', v)}><SelectTrigger className="w-32"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="spins">Spins</SelectItem></SelectContent></Select><Button variant="destructive" size="icon" onClick={() => handleRemoveReward(i)}><Trash2 className="h-4 w-4"/></Button></div>))}<Button variant="outline" size="sm" onClick={handleAddReward} className="mt-2">Add Reward</Button></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={handleSubmit}>Create</Button></DialogFooter>
    </DialogContent></Dialog>
  );
};
