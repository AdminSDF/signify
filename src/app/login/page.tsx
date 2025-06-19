
"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AuthCredentialsValidator, type AuthCredentials } from '@/lib/validators/auth'; // We'll create this
import { LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const { user, loginWithEmailPassword, signUpWithEmailPassword, loading } = useAuth();
  const router = useRouter();

  const form = useForm<AuthCredentials>({
    resolver: zodResolver(AuthCredentialsValidator),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user && !loading) {
      router.push('/'); // Redirect to home if already logged in
    }
  }, [user, loading, router]);

  const handleLogin = async (data: AuthCredentials) => {
    await loginWithEmailPassword(data);
  };

  const handleSignUp = async (data: AuthCredentials) => {
    await signUpWithEmailPassword(data);
  };

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
        <CardHeader className="items-center text-center border-b pb-4">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="h-16 w-16 text-primary mb-3">
            <rect width="256" height="256" fill="none"></rect>
            <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" opacity="0.2"></path>
            <path d="M128,24a104,104,0,1,0,104,104A104.2,104.2,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Z" fill="currentColor" strokeWidth="0"></path>
            <path d="M143.8,149.9a40.2,40.2,0,0,1-31.6,0L70.7,173.2a88,88,0,0,0,45.2,18.7,87,87,0,0,0,12.1-.8V132a40,40,0,0,1,0-8Z" fill="hsl(var(--primary))" strokeWidth="0"></path>
          </svg>
          <CardTitle className="text-3xl font-bold font-headline text-primary">
            Welcome to Spinify!
          </CardTitle>
          <CardDescription className="text-muted-foreground text-md mt-1">
            Enter your credentials to play.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={(e) => e.preventDefault()}> {/* We handle submit via buttons */}
            <CardContent className="p-6 space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="email">Email</FormLabel>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        className="text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="password">Password</FormLabel>
                    <FormControl>
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="text-base"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-3 p-6 pt-0">
              <Button 
                onClick={form.handleSubmit(handleLogin)} 
                disabled={loading} 
                className="w-full py-3 text-lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Login
              </Button>
              <Button 
                onClick={form.handleSubmit(handleSignUp)} 
                disabled={loading} 
                variant="outline"
                className="w-full py-3 text-lg"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Sign Up
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
