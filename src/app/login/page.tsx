
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome } from 'lucide-react'; // Using Chrome icon for Google as a generic browser/web icon

export default function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/'); // Redirect to home if already logged in
    }
  }, [user, loading, router]);

  if (loading || user) { // Show loader or nothing if redirecting
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card className="w-full max-w-sm shadow-xl bg-card text-card-foreground rounded-lg">
        <CardHeader className="items-center text-center border-b pb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-16 w-16 text-primary mb-3">
            <rect width="256" height="256" fill="none"></rect>
            <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" opacity="0.2"></path>
            <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" fill="currentColor" strokeWidth="0"></path>
            <path d="M143.8,149.9a40.2,40.2,0,0,1-31.6,0L70.7,173.2a88,88,0,0,0,45.2,18.7,87,87,0,0,0,12.1-.8V132a40,40,0,0,1,0-8Z" fill="hsl(var(--primary))" strokeWidth="0"></path>
          </svg>
          <CardTitle className="text-3xl font-bold font-headline text-primary">
            Welcome to Spinify!
          </CardTitle>
          <CardDescription className="text-muted-foreground text-lg mt-1">
            Sign in to start spinning and winning.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <Button 
            onClick={loginWithGoogle} 
            disabled={loading} 
            className="w-full py-6 text-lg bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Chrome className="mr-3 h-6 w-6" />
            Sign in with Google
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            By signing in, you agree to our terms and conditions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
