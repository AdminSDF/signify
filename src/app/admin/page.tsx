
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Settings, Users, BarChart3, Home, ShieldAlert, ListPlus, Trash2, Save, Edit2, X, ClipboardList, DollarSign, Activity, Search, Banknote, History, PackageCheck, PackageX } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { AppSettings, initialSettings as defaultAppSettings, getAppSettings, saveAppSettings, getNewsItems, saveNewsItems, DEFAULT_NEWS_ITEMS } from '@/lib/appConfig';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const ADMIN_EMAIL_CONFIG_KEY = 'adminUserEmail'; 
const DEFAULT_ADMIN_EMAIL = "jameafaizanrasool@gmail.com";

// Dummy data - replace with Firestore data later
const dummyWithdrawalRequests = [
  { id: 'WR001', userId: 'user123', userEmail: 'test@example.com', amount: 550, upiId: 'user@upi', date: new Date().toISOString(), status: 'Pending' },
  { id: 'WR002', userId: 'user456', userEmail: 'another@example.com', amount: 1200, upiId: 'test@okaxis', date: new Date(Date.now() - 86400000).toISOString(), status: 'Pending' },
];

const dummyAddFundRequests = [
  { id: 'AF001', userId: 'user789', userEmail: 'fund@example.com', amount: 200, paymentMethod: 'UPI Screenshot', date: new Date().toISOString(), status: 'Pending' },
  { id: 'AF002', userId: 'userABC', userEmail: 'add@example.com', amount: 500, paymentMethod: 'UPI ID Ref', date: new Date(Date.now() - 172800000).toISOString(), status: 'Pending' },
];


export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [adminEmail, setAdminEmail] = useState(DEFAULT_ADMIN_EMAIL);
  const [appSettings, setAppSettingsState] = useState<AppSettings>(defaultAppSettings);
  const [newsItems, setNewsItemsState] = useState<string[]>(DEFAULT_NEWS_ITEMS);
  const [newNewsItem, setNewNewsItem] = useState('');
  const [editingNewsItemIndex, setEditingNewsItemIndex] = useState<number | null>(null);
  const [editingNewsItemText, setEditingNewsItemText] = useState('');
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedAdminEmail = localStorage.getItem(ADMIN_EMAIL_CONFIG_KEY) || DEFAULT_ADMIN_EMAIL;
      setAdminEmail(storedAdminEmail);
      setAppSettingsState(getAppSettings());
      setNewsItemsState(getNewsItems());
    }
  }, []);
  

  useEffect(() => {
    if (!authLoading && isClient) {
      if (!user || user.email !== adminEmail) {
        router.push('/'); 
      }
    }
  }, [user, authLoading, router, adminEmail, isClient]);

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAppSettingsState(prev => ({
      ...prev,
      [name]: typeof prev[name as keyof AppSettings] === 'number' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSaveAppSettings = () => {
    saveAppSettings(appSettings);
    toast({ title: "Game Settings Saved", description: "Changes have been saved to local storage." });
  };

  const handleNewsItemChange = (index: number, value: string) => {
    const updatedNewsItems = [...newsItems];
    updatedNewsItems[index] = value;
    setNewsItemsState(updatedNewsItems);
  };

  const handleAddNewsItem = () => {
    if (newNewsItem.trim() === '') return;
    setNewsItemsState([...newsItems, newNewsItem.trim()]);
    setNewNewsItem('');
  };

  const handleRemoveNewsItem = (index: number) => {
    setNewsItemsState(newsItems.filter((_, i) => i !== index));
  };
  
  const startEditNewsItem = (index: number) => {
    setEditingNewsItemIndex(index);
    setEditingNewsItemText(newsItems[index]);
  };

  const handleSaveEditedNewsItem = () => {
    if (editingNewsItemIndex === null) return;
    const updatedNewsItems = [...newsItems];
    updatedNewsItems[editingNewsItemIndex] = editingNewsItemText;
    setNewsItemsState(updatedNewsItems);
    setEditingNewsItemIndex(null);
    setEditingNewsItemText('');
  };


  const handleSaveNewsItems = () => {
    saveNewsItems(newsItems);
    toast({ title: "News Items Saved", description: "News ticker items have been saved to local storage." });
  };

  if (authLoading || !isClient || (!user || user.email !== adminEmail)) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        {authLoading || !isClient ? (
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        ) : (
          <Card className="w-full max-w-md p-6 shadow-xl bg-card text-card-foreground rounded-lg text-center">
            <ShieldAlert className="h-16 w-16 text-destructive mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              You do not have permission to view this page.
            </CardDescription>
            <Button onClick={() => router.push('/')} className="mt-6">Go to Home</Button>
          </Card>
        )}
      </div>
    );
  }

  const getLabelForKey = (key: string) => {
    switch (key) {
      case 'upiId': return 'UPI ID';
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
      <Card className="w-full max-w-4xl shadow-xl bg-card text-card-foreground rounded-lg">
        <CardHeader className="items-center text-center border-b pb-6">
          <ShieldCheck className="h-16 w-16 text-primary mb-3" />
          <CardTitle className="text-4xl font-bold font-headline text-primary">
            Admin Panel
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg mt-1">
            Spinify Game Management Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <Link href="/" passHref>
            <Button variant="default" className="block mx-auto mb-6">
              <Home className="mr-2 h-4 w-4" /> Back to Main App
            </Button>
          </Link>

          {/* Game Settings Section */}
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings /> Game Settings</CardTitle>
              <CardDescription>Modify core game parameters. Changes are saved to local storage and affect your browser instance.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(appSettings) as Array<keyof AppSettings>).map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={key} className="capitalize">{getLabelForKey(key)}</Label>
                  <Input
                    type={typeof appSettings[key] === 'number' ? 'number' : 'text'}
                    id={key}
                    name={key}
                    value={appSettings[key]}
                    onChange={handleSettingsChange}
                    className="bg-background"
                    step={key.toLowerCase().includes('cost') || key.toLowerCase().includes('price') || key.toLowerCase().includes('balance') || key.toLowerCase().includes('amount') ? "0.01" : "1"}
                  />
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveAppSettings} className="w-full md:w-auto"><Save className="mr-2 h-4 w-4" /> Save Game Settings</Button>
            </CardFooter>
          </Card>

          {/* News Ticker Management Section */}
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ListPlus /> News Ticker Management</CardTitle>
              <CardDescription>Manage the items displayed in the news ticker. Saved to local storage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {newsItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  {editingNewsItemIndex === index ? (
                    <>
                      <Textarea 
                        value={editingNewsItemText} 
                        onChange={(e) => setEditingNewsItemText(e.target.value)}
                        className="flex-grow bg-background"
                        rows={2}
                      />
                      <Button onClick={handleSaveEditedNewsItem} size="icon" variant="outline"><Save className="h-4 w-4 text-green-500" /></Button>
                      <Button onClick={() => setEditingNewsItemIndex(null)} size="icon" variant="ghost"><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Input value={item} readOnly className="flex-grow bg-background/50" />
                      <Button onClick={() => startEditNewsItem(index)} variant="outline" size="icon" aria-label="Edit item">
                        <Edit2 className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button onClick={() => handleRemoveNewsItem(index)} variant="destructive" size="icon" aria-label="Remove item">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Textarea
                  placeholder="Enter new news item..."
                  value={newNewsItem}
                  onChange={(e) => setNewNewsItem(e.target.value)}
                  className="flex-grow bg-background"
                  rows={2}
                />
                <Button onClick={handleAddNewsItem} variant="outline" className="self-end">Add Item</Button>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNewsItems} className="w-full md:w-auto"><Save className="mr-2 h-4 w-4" /> Save News Items</Button>
            </CardFooter>
          </Card>

          {/* Add Fund Requests Section */}
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Banknote /> Add Fund Requests</CardTitle>
              <CardDescription>View and manage pending user requests to add funds.</CardDescription>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Req ID</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Amount (₹)</TableHead>
                    <TableHead>Payment Ref/Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dummyAddFundRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.id}</TableCell>
                      <TableCell>{req.userEmail}</TableCell>
                      <TableCell>{req.amount.toFixed(2)}</TableCell>
                      <TableCell>{req.paymentMethod}</TableCell>
                      <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${req.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                          {req.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white mr-1" disabled><PackageCheck className="mr-1 h-3 w-3"/>Approve</Button>
                        <Button variant="destructive" size="sm" disabled><PackageX className="mr-1 h-3 w-3"/>Reject</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {dummyAddFundRequests.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">No pending add fund requests.</TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Full add fund request management requires Firestore integration.
            </CardFooter>
          </Card>

          {/* Withdrawal Management Section */}
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList /> Withdrawal Requests</CardTitle>
              <CardDescription>View and manage pending user withdrawal requests.</CardDescription>
            </CardHeader>
            <CardContent>
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Req ID</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Amount (₹)</TableHead>
                    <TableHead>UPI/Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dummyWithdrawalRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.id}</TableCell>
                      <TableCell>{req.userEmail}</TableCell>
                      <TableCell>{req.amount.toFixed(2)}</TableCell>
                      <TableCell>{req.upiId}</TableCell>
                      <TableCell>{new Date(req.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${req.status === 'Pending' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
                          {req.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" className="bg-green-500 hover:bg-green-600 text-white mr-1" disabled><PackageCheck className="mr-1 h-3 w-3"/>Approve</Button>
                         <Button variant="destructive" size="sm" disabled><PackageX className="mr-1 h-3 w-3"/>Reject</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {dummyWithdrawalRequests.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">No pending withdrawal requests.</TableCell>
                     </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Full withdrawal management requires Firestore integration.
            </CardFooter>
          </Card>

          {/* User & Financial Overview Section */}
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users /> User & Financial Overview</CardTitle>
              <CardDescription>View user statistics, activity, and global financial summaries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><DollarSign /> Global Financials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Card className="p-4 bg-background">
                    <p className="text-sm text-muted-foreground">Total Funds Added by All Users</p>
                    <p className="text-2xl font-bold text-primary">₹ [Coming Soon]</p>
                  </Card>
                  <Card className="p-4 bg-background">
                    <p className="text-sm text-muted-foreground">Total Funds Withdrawn by All Users</p>
                    <p className="text-2xl font-bold text-accent">₹ [Coming Soon]</p>
                  </Card>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Activity /> User Activity & Management</h4>
                 <div className="flex items-center gap-2 mb-4">
                    <Input type="search" placeholder="Search users by email or ID..." className="bg-background" disabled/>
                    <Button variant="outline" disabled><Search className="mr-2 h-4 w-4" /> Search</Button>
                 </div>
                <p className="text-sm text-muted-foreground">Detailed user activity logs and management tools will be available here.</p>
              </div>
               <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><History /> Global Transaction Log</h4>
                <p className="text-sm text-muted-foreground">A comprehensive log of all transactions across the platform.</p>
                <Button variant="link" disabled className="p-0 h-auto text-base">View Full Transaction Log (Coming Soon)</Button>
              </div>
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              Full user management, financial overviews, and transaction logs require Firestore integration.
            </CardFooter>
          </Card>

        </CardContent>
      </Card>
    </div>
  );
}
