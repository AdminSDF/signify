
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Settings, Users, BarChart3, Home, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

const ADMIN_EMAIL = "jameafaizanrasool@gmail.com"; // This should ideally come from .env

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.email !== ADMIN_EMAIL) {
        router.push('/'); // Redirect to home if not admin or not logged in
      }
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-4">
        {authLoading ? (
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
    <div className="flex-grow flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl bg-card text-card-foreground rounded-lg">
        <CardHeader className="items-center text-center border-b pb-6">
          <ShieldCheck className="h-16 w-16 text-primary mb-3" />
          <CardTitle className="text-4xl font-bold font-headline text-primary">
            Admin Panel
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg mt-1">
            Spinify Game Management Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button variant="outline" className="h-auto py-4 text-left justify-start">
              <Users className="mr-3 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">User Management</p>
                <p className="text-xs text-muted-foreground">View and manage players</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 text-left justify-start">
              <BarChart3 className="mr-3 h-5 w-5 text-primary" />
               <div>
                <p className="font-semibold">Game Analytics</p>
                <p className="text-xs text-muted-foreground">Track spins, wins, revenue</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 text-left justify-start">
              <Settings className="mr-3 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Game Settings</p>
                <p className="text-xs text-muted-foreground">Configure wheel, prizes, etc.</p>
              </div>
            </Button>
             <Button variant="outline" className="h-auto py-4 text-left justify-start">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 h-5 w-5 text-primary lucide lucide-layout-list"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/></svg>
               <div>
                <p className="font-semibold">Content Management</p>
                <p className="text-xs text-muted-foreground">Update tips, notifications</p>
              </div>
            </Button>
          </div>
          <div className="mt-6 p-6 border-2 border-dashed border-border rounded-lg bg-muted/20 text-center">
            <p className="text-muted-foreground">
              Further admin tools and detailed settings will be developed here.
            </p>
          </div>
           <div className="mt-8 text-center">
            <Link href="/" passHref>
              <Button variant="default">
                <Home className="mr-2 h-4 w-4" /> Back to Main App
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
