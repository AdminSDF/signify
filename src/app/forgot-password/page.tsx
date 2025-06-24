"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Mail, ArrowLeft } from 'lucide-react';
import { sendPasswordResetAction } from '@/app/actions/authActions';

const ForgotPasswordValidator = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordData = z.infer<typeof ForgotPasswordValidator>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(ForgotPasswordValidator),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    setIsSubmitting(true);
    
    await sendPasswordResetAction(data.email);
    
    toast({
      title: "Check Your Email",
      description: "If an account with that email exists, a password reset link has been sent.",
    });

    setMessage("Please check your inbox (and spam folder) for the password reset link.");
    form.reset();
    
    setIsSubmitting(false);
  };

  return (
    <div className="container mx-auto py-12 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle className="text-3xl font-bold font-headline text-primary">Forgot Password</CardTitle>
          <CardDescription className="text-muted-foreground">Enter your email to receive a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email">Email Address</Label>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {message && <p className="text-sm text-green-600 text-center bg-green-50 p-3 rounded-md">{message}</p>}

              <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-primary-foreground mr-2"></div> Sending...</>
                ) : (
                  <>Send Reset Link</>
                )}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center">
            <Link href="/login" passHref>
                <Button variant="link" className="text-muted-foreground">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
