
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { LoginCredentialsValidator, SignUpCredentialsValidator, type LoginCredentials, type SignUpCredentials } from '@/lib/validators/auth';
import { cn } from '@/lib/utils';

type FormData = LoginCredentials | SignUpCredentials;

export default function LoginPage() {
  const { user, loginWithEmailPassword, signUpWithEmailPassword, loading, appSettings } = useAuth();
  const router = useRouter();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false); // State to control animation

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

  useEffect(() => {
    if (!isSpinning) { // Only reset form when not spinning to prevent flash of empty fields
      form.reset(
        isLoginMode
          ? { email: '', password: '' }
          : { displayName: '', email: '', password: '', confirmPassword: '' }
      );
    }
  }, [isLoginMode, form, isSpinning]);

  const onLogin: SubmitHandler<LoginCredentials> = async (data) => {
    await loginWithEmailPassword(data);
  };

  const onSignUp: SubmitHandler<SignUpCredentials> = async (data) => {
    await signUpWithEmailPassword(data);
  };

  const onSubmit = (data: FormData) => {
    if (isLoginMode) {
      onLogin(data as LoginCredentials);
    } else {
      onSignUp(data as SignUpCredentials);
    }
  };

  const handleAnimationAndSwitch = (switchToLogin: boolean) => {
    if (isSpinning) return;
    setIsSpinning(true);
    setTimeout(() => {
      setIsLoginMode(switchToLogin);
      setIsSpinning(false);
    }, 500); // Must match animation duration
  };

  const handleSwitchToSignUp = () => handleAnimationAndSwitch(false);
  const handleSwitchToLogin = () => handleAnimationAndSwitch(true);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user && !loading) return null;

  const wheelStyle = {
    backgroundImage: `conic-gradient(
      from 90deg,
      #991B1B 0deg 22.5deg, #FEF2F2 22.5deg 45deg,
      #047857 45deg 67.5deg, #7C3AED 67.5deg 90deg,
      #DC2626 90deg 112.5deg, #FDE68A 112.5deg 135deg,
      #1D4ED8 135deg 157.5deg, #047857 157.5deg 180deg,
      #991B1B 180deg 202.5deg, #FEF2F2 202.5deg 225deg,
      #047857 225deg 247.5deg, #7C3AED 247.5deg 270deg,
      #DC2626 270deg 292.5deg, #FDE68A 292.5deg 315deg,
      #1D4ED8 315deg 337.5deg, #047857 337.5deg 360deg
    )`
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div
        className={cn(
          "relative w-[450px] h-[450px] rounded-full overflow-hidden flex items-center justify-center border-8 border-gray-400/30",
          isSpinning && "animate-spin-once"
        )}
        style={wheelStyle}
      >
        <div className="absolute w-full h-full bg-black/30 rounded-full backdrop-blur-sm"></div>

        {/* Centerpiece with Logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-4 border-gray-500 z-20 overflow-hidden bg-background">
          {appSettings.logoUrl && (
            <Image
              src={appSettings.logoUrl}
              alt="Spinify Logo"
              width={80}
              height={80}
              className="h-full w-full object-cover"
              priority
            />
          )}
        </div>

        <div className="relative z-10 w-full flex flex-col items-center justify-center p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-64 space-y-3">
              {/* Hide form fields during spin for a cleaner animation */}
              {!isSpinning ? (
                <>
                  {!isLoginMode && (
                    <FormField
                      control={form.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Name"
                              {...field}
                              className="bg-white/95 text-red-900 placeholder:text-red-900/60 font-semibold rounded-full border-2 border-red-200/50 text-center text-lg"
                            />
                          </FormControl>
                          <FormMessage className="text-white bg-black/60 rounded px-2 text-xs text-center" />
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="Email"
                            {...field}
                            className="bg-white/95 text-red-900 placeholder:text-red-900/60 font-semibold rounded-full border-2 border-red-200/50 text-center text-lg"
                          />
                        </FormControl>
                        <FormMessage className="text-white bg-black/60 rounded px-2 text-xs text-center" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Password"
                            {...field}
                            className="bg-white/95 text-red-900 placeholder:text-red-900/60 font-semibold rounded-full border-2 border-red-200/50 text-center text-lg"
                          />
                        </FormControl>
                        <FormMessage className="text-white bg-black/60 rounded px-2 text-xs text-center" />
                      </FormItem>
                    )}
                  />
                  {!isLoginMode && (
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Confirm Password"
                              {...field}
                              className="bg-white/95 text-red-900 placeholder:text-red-900/60 font-semibold rounded-full border-2 border-red-200/50 text-center text-lg"
                            />
                          </FormControl>
                           <FormMessage className="text-white bg-black/60 rounded px-2 text-xs text-center" />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              ) : (
                // Placeholder to maintain layout during spin
                <div className="h-[180px] w-full"></div>
              )}
              
              <div className="pt-8 space-y-3">
                <Button
                  type="submit"
                  onClick={isLoginMode ? form.handleSubmit(onSubmit) : handleSwitchToLogin}
                  disabled={loading || isSpinning}
                  className="w-full bg-white text-red-900 font-bold text-lg rounded-full hover:bg-red-100 border-2 border-red-200"
                >
                  Login
                </Button>
                <Button
                   type="submit"
                   onClick={!isLoginMode ? form.handleSubmit(onSubmit) : handleSwitchToSignUp}
                   disabled={loading || isSpinning}
                   className="w-full bg-white text-red-900 font-bold text-lg rounded-full hover:bg-red-100 border-2 border-red-200"
                >
                  Sign Up
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
