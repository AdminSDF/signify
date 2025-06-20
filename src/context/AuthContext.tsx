
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  auth, 
  firebaseSignOut, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type FirebaseUser,
  createUserData as createFirestoreUser,
  getAppConfiguration,
  AppConfiguration,
  updateUserData,
  Timestamp
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import type { AuthCredentials } from '@/lib/validators/auth';
import { AppSettings, NewsItem, initialSettings as defaultAppSettings, DEFAULT_NEWS_ITEMS } from '@/lib/appConfig'; // Ensure NewsItem is defined or use string[]

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  appSettings: AppSettings;
  newsItems: string[]; // Or NewsItem[]
  isAppConfigLoading: boolean;
  refreshAppConfig: () => Promise<void>;
  signUpWithEmailPassword: (credentials: AuthCredentials) => Promise<void>;
  loginWithEmailPassword: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [newsItems, setNewsItems] = useState<string[]>(DEFAULT_NEWS_ITEMS);
  const [isAppConfigLoading, setIsAppConfigLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchAppConfig = useCallback(async () => {
    setIsAppConfigLoading(true);
    try {
      const config = await getAppConfiguration();
      setAppSettings(config.settings || defaultAppSettings);
      setNewsItems(config.newsItems || DEFAULT_NEWS_ITEMS);
    } catch (error) {
      console.error("Error fetching app configuration:", error);
      setAppSettings(defaultAppSettings); // Fallback to defaults
      setNewsItems(DEFAULT_NEWS_ITEMS);
      toast({
        title: "Error Loading Config",
        description: "Could not load app settings. Using defaults.",
        variant: "destructive"
      });
    } finally {
      setIsAppConfigLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAppConfig();
  }, [fetchAppConfig]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Optionally update lastLogin or fetch more user data if needed here
        await updateUserData(firebaseUser.uid, { lastLogin: Timestamp.now() });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUpWithEmailPassword = async ({email, password}: AuthCredentials) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        // Fetch the latest app settings to pass for new user creation
        const currentConfig = await getAppConfiguration(); 
        await createFirestoreUser(
          userCredential.user.uid, 
          userCredential.user.email, 
          userCredential.user.displayName, 
          userCredential.user.photoURL,
          currentConfig.settings // Pass current app settings
        );
      }
      toast({ title: "Sign Up Successful", description: "Welcome! You are now logged in." });
      router.push('/'); 
    } catch (error: any) {
      console.error("Error during email/password sign up:", error);
      let description = error.message && String(error.message).trim() !== "" ? String(error.message) : "An unexpected error occurred.";
      if (error.code === 'auth/email-already-in-use') description = 'This email is already registered. Try logging in.';
      else if (error.code === 'auth/weak-password') description = 'Password is too weak. It should be at least 6 characters long.';
      else if (error.code === 'auth/invalid-email') description = 'The email address is not valid.';
      toast({ variant: "destructive", title: "Sign Up Failed", description });
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmailPassword = async ({email, password}: AuthCredentials) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateUserData(userCredential.user.uid, { lastLogin: Timestamp.now() });
      }
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/'); 
    } catch (error: any) {
      console.error("Error during email/password login:", error);
      let description = error.message && String(error.message).trim() !== "" ? String(error.message) : "An unexpected error occurred.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'The email address format is not valid.';
      } else if (error.code === 'auth/user-disabled') {
        description = 'This user account has been disabled.';
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
      router.push('/login'); 
    } catch (error: any) {
      console.error("Error during logout:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    } finally {
      setLoading(false);
    }
  };

  const contextValue = {
    user,
    loading,
    appSettings,
    newsItems,
    isAppConfigLoading,
    refreshAppConfig: fetchAppConfig,
    signUpWithEmailPassword,
    loginWithEmailPassword,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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

