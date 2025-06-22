
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoginCredentialsValidator, SignUpCredentialsValidator, type LoginCredentials, type SignUpCredentials } from '@/lib/validators/auth';
import { LogIn, UserPlus, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initialSettings } from '@/lib/appConfig';

type FormData = LoginCredentials | SignUpCredentials;

export default function LoginPage() {
  const { user, loginWithEmailPassword, signUpWithEmailPassword, loading } = useAuth();
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

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
  
  // Effect to reset form when mode changes, ensuring correct default values and clearing validation
  useEffect(() => {
    form.reset(
      isLoginMode 
        ? { email: '', password: '' } 
        : { displayName: '', email: '', password: '', confirmPassword: '' }
    );
  }, [isLoginMode, form.reset]);


  const onLogin: SubmitHandler<LoginCredentials> = async (data) => {
    await loginWithEmailPassword(data);
  };

  const onSignUp: SubmitHandler<SignUpCredentials> = async (data) => {
    await signUpWithEmailPassword(data);
  };

  const handleSwitchMode = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setTimeout(() => {
      setIsLoginMode(prev => !prev);
      setIsAnimating(false);
    }, 2500); // Duration of the animation
  };
  
  const onSubmit = (data: FormData) => {
    if (isLoginMode) {
      onLogin(data as LoginCredentials);
    } else {
      onSignUp(data as SignUpCredentials);
    }
  };


  if (loading && !isAnimating) { // Keep showing loader if auth is loading, but not during card animation
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
   // If user is logged in (and not loading), redirect handled by useEffect. 
   // This prevents briefly showing the login form before redirect.
  if (user && !loading) return null;


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4">
      <Card 
        className={cn(
          "w-full max-w-sm shadow-xl bg-card text-card-foreground rounded-lg",
          isAnimating && "animate-card-spin-multiple"
        )}
      >
        <CardHeader className="items-center text-center border-b pb-4">
           <Image src={initialSettings.logoUrl} alt="Spinify Logo" width={64} height={64} className="h-16 w-16 mb-3 rounded-full" />
          <CardTitle className="text-3xl font-bold font-headline text-primary">
            {isLoginMode ? "Welcome Back!" : "Create Account"}
          </CardTitle>
          <CardDescription className="text-muted-foreground text-md mt-1">
            {isLoginMode ? "Enter your credentials to play." : "Fill in the details to join Spinify."}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          {/* Re-keying the form element itself to ensure resolver updates take effect */}
          <form onSubmit={form.handleSubmit(onSubmit)} key={isLoginMode ? 'loginForm' : 'signupForm'}>
            <CardContent className="p-6 space-y-4">
              {!isLoginMode && (
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="displayName">Display Name</FormLabel>
                      <FormControl>
                        <Input
                          id="displayName"
                          placeholder="Your Name"
                          {...field}
                          className="text-base"
                        />
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
              {!isLoginMode && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="confirmPassword">Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          id="confirmPassword" 
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
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 p-6 pt-0">
              <Button 
                type="submit"
                disabled={loading || isAnimating} 
                className="w-full py-3 text-lg"
              >
                {isLoginMode ? <LogIn className="mr-2 h-5 w-5" /> : <UserPlus className="mr-2 h-5 w-5" />}
                {isLoginMode ? "Login" : "Sign Up"}
              </Button>
              <Button 
                type="button"
                onClick={handleSwitchMode} 
                disabled={isAnimating || loading} 
                variant="outline"
                className="w-full py-3 text-lg"
              >
                <Repeat className="mr-2 h-5 w-5" />
                {isLoginMode ? "Switch to Sign Up" : "Switch to Login"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
