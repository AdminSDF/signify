
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Settings, Users, BarChart3, Home, ShieldAlert, ListPlus, Trash2, Save, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { AppSettings, initialSettings as defaultAppSettings, getAppSettings, saveAppSettings, getNewsItems, saveNewsItems, DEFAULT_NEWS_ITEMS } from '@/lib/appConfig';
import { Textarea } from '@/components/ui/textarea';

const ADMIN_EMAIL_CONFIG_KEY = 'adminUserEmail'; // Key for localStorage if we want to make admin email configurable too
const DEFAULT_ADMIN_EMAIL = "jameafaizanrasool@gmail.com";

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

  return (
    <div className="flex-grow flex flex-col items-center p-4 space-y-8">
      <Card className="w-full max-w-3xl shadow-xl bg-card text-card-foreground rounded-lg">
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
          <Link href="/" passHref className="block text-center mb-6">
            <Button variant="default">
              <Home className="mr-2 h-4 w-4" /> Back to Main App
            </Button>
          </Link>

          {/* Game Settings Section */}
          <Card className="bg-muted/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings /> Game Settings</CardTitle>
              <CardDescription>Modify core game parameters. Changes are saved to local storage.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.keys(appSettings) as Array<keyof AppSettings>).map((key) => (
                <div key={key} className="space-y-1">
                  <Label htmlFor={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  <Input
                    type={typeof appSettings[key] === 'number' ? 'number' : 'text'}
                    id={key}
                    name={key}
                    value={appSettings[key]}
                    onChange={handleSettingsChange}
                    className="bg-background"
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
          
          {/* Placeholder Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto py-4 text-left justify-start disabled opacity-50 cursor-not-allowed">
              <Users className="mr-3 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">User Management</p>
                <p className="text-xs text-muted-foreground">View and manage players (Coming Soon)</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 text-left justify-start disabled opacity-50 cursor-not-allowed">
              <BarChart3 className="mr-3 h-5 w-5 text-primary" />
               <div>
                <p className="font-semibold">Game Analytics</p>
                <p className="text-xs text-muted-foreground">Track spins, wins, revenue (Coming Soon)</p>
              </div>
            </Button>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
