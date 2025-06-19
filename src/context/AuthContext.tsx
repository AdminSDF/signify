
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  auth, 
  firebaseSignOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type FirebaseUser 
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import type { AuthCredentials } from '@/lib/validators/auth';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signUpWithEmailPassword: (credentials: AuthCredentials) => Promise<void>;
  loginWithEmailPassword: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUpWithEmailPassword = async ({email, password}: AuthCredentials) => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user
      toast({ title: "Sign Up Successful", description: "Welcome! You are now logged in." });
      router.push('/'); // Redirect to home after sign up
    } catch (error: any) {
      console.error("Error during email/password sign up:", error);
      let description = "Could not create account. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        description = 'This email is already registered. Try logging in.';
      } else if (error.code === 'auth/weak-password') {
        description = 'Password is too weak. It should be at least 6 characters.';
      }
      toast({ variant: "destructive", title: "Sign Up Failed", description });
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmailPassword = async ({email, password}: AuthCredentials) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/'); // Redirect to home after login
    } catch (error: any) {
      console.error("Error during email/password login:", error);
      let description = "Could not log in. Please check your credentials.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please try again.';
      }
      toast({ variant: "destructive", title: "Login Failed", description });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login'); // Redirect to login page after logout
    } catch (error: any) {
      console.error("Error during logout:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUpWithEmailPassword, loginWithEmailPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
