
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoginCredentialsValidator, SignUpCredentialsValidator, type LoginCredentials, type SignUpCredentials } from '@/lib/validators/auth';
import { cn } from '@/lib/utils';
import { User, Mail, Lock, Loader2 } from 'lucide-react';

type FormData = LoginCredentials | SignUpCredentials;

function LoginComponent() {
  const { user, loginWithEmailPassword, signUpWithEmailPassword, loading, appSettings } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  const [formContainerClass, setFormContainerClass] = useState('animate-fade-in');

  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      sessionStorage.setItem('referralCode', refCode);
    }
  }, [searchParams]);
  
  const currentValidator = isLoginMode ? LoginCredentialsValidator : SignUpCredentialsValidator;

  const form = useForm<FormData>({
    resolver: zodResolver(currentValidator),
    defaultValues: isLoginMode
      ? { email: '', password: '' }
      : { displayName: '', email: '', password: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);
  
  const handleModeSwitch = (newMode: boolean) => {
    setFormContainerClass('animate-fade-out');
    setTimeout(() => {
        setIsLoginMode(newMode);
        form.reset(
          newMode
          ? { email: '', password: '' }
          : { displayName: '', email: '', password: '', confirmPassword: '' }
        );
        setFormContainerClass('animate-fade-in');
    }, 300); // Must match fade-out duration
  }

  const onLogin: SubmitHandler<LoginCredentials> = async (data) => {
    await loginWithEmailPassword(data);
  };

  const onSignUp: SubmitHandler<SignUpCredentials> = async (data) => {
    await signUpWithEmailPassword(data);
  };

  const onSubmit = (data: FormData) => {
    if (loading) return;
    if (isLoginMode) {
      onLogin(data as LoginCredentials);
    } else {
      onSignUp(data as SignUpCredentials);
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-secondary to-accent">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card/80 backdrop-blur-lg animate-fade-in">
        <CardHeader className="text-center space-y-2">
           {appSettings.logoUrl && (
            <Image
              src={appSettings.logoUrl}
              alt="Spinify Logo"
              width={64}
              height={64}
              className="h-16 w-16 mx-auto rounded-full border-2 border-primary shadow-lg"
              priority
            />
          )}
          <div className={formContainerClass}>
            <CardTitle className="text-3xl font-bold font-headline text-primary">
              {isLoginMode ? 'Welcome Back!' : 'Create an Account'}
            </CardTitle>
            <CardDescription className="text-muted-foreground pt-1">
              {isLoginMode ? 'Log in to continue your adventure.' : 'Get started with Spinify today!'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className={cn("transition-opacity duration-300", formContainerClass)}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!isLoginMode && (
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input placeholder="Enter your name" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                   <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="email" placeholder="you@example.com" {...field} className="pl-10" />
                      </div>
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
                     <div className="flex justify-between items-center">
                        <FormLabel>Password</FormLabel>
                        {isLoginMode && (
                            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline underline-offset-4">
                                Forgot?
                            </Link>
                        )}
                     </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {!isLoginMode && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                       <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button type="submit" disabled={loading} className="w-full text-lg py-6 mt-2">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (isLoginMode ? 'Log In' : 'Create Account')}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
           <div className={cn("text-sm text-muted-foreground", formContainerClass)}>
             {isLoginMode ? "Don't have an account?" : "Already have an account?"}
             <Button variant="link" className="font-semibold text-primary" onClick={() => handleModeSwitch(!isLoginMode)}>
               {isLoginMode ? 'Sign up' : 'Log in'}
             </Button>
           </div>
        </CardFooter>
      </Card>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginComponent />
    </Suspense>
  )
}
    
