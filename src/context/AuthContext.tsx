
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  auth,
  firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type FirebaseUser,
  createUserData as createFirestoreUser,
  getAppConfiguration,
  updateUserData,
  Timestamp
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import type { LoginCredentials, SignUpCredentials } from '@/lib/validators/auth';
import { AppSettings, initialSettings as defaultAppSettings, DEFAULT_NEWS_ITEMS } from '@/lib/appConfig';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  authLoading: boolean;
  appSettings: AppSettings;
  newsItems: string[];
  isAppConfigLoading: boolean;
  refreshAppConfig: () => Promise<void>;
  signUpWithEmailPassword: (credentials: SignUpCredentials) => Promise<void>;
  loginWithEmailPassword: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [fbAuthLoading, setFbAuthLoading] = useState(true);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [newsItems, setNewsItems] = useState<string[]>(DEFAULT_NEWS_ITEMS);
  const [fbAppConfigLoading, setFbAppConfigLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchAppConfig = useCallback(async () => {
    if (!fbAppConfigLoading) setFbAppConfigLoading(true);
    try {
      const config = await getAppConfiguration();
      setAppSettings(config.settings);
      setNewsItems(config.newsItems);
    } catch (error) {
      console.error("AuthContext: Error in fetchAppConfig:", error);
      setAppSettings(defaultAppSettings);
      setNewsItems(DEFAULT_NEWS_ITEMS);
      toast({
        title: "App Config Load Issue",
        description: "Using default app settings. Problem fetching live configuration.",
        variant: "destructive"
      });
    } finally {
      setFbAppConfigLoading(false);
    }
  }, [fbAppConfigLoading, toast]); // Added fbAppConfigLoading

  useEffect(() => {
    fetchAppConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const creationTime = firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : 0;
        const lastSignInTime = firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).getTime() : 0;

        // Only update lastLogin if it's not a brand new user session (creation and last sign-in are not the same and very recent)
        // This check helps avoid trying to update lastLogin before createUserData has finished for a new user.
        const isTrulyNewSession = creationTime === lastSignInTime && (Date.now() - creationTime < 10000); // 10-second threshold

        if (!isTrulyNewSession) {
          try {
            // Check if document exists before updating lastLogin to avoid errors on first very rapid login after signup if doc creation is slow
            // This is an extra precaution, createUserData should set initial lastLogin
             const userDoc = await getDoc(doc(auth.firestore, 'users', firebaseUser.uid));
             if (userDoc.exists()) {
                await updateUserData(firebaseUser.uid, { lastLogin: Timestamp.now() });
             } else {
                console.warn("User document not found for lastLogin update, possibly very new user:", firebaseUser.uid);
             }
          } catch (updateError) {
            console.warn("Could not update lastLogin on auth state change:", updateError);
          }
        }
      }
      setFbAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUpWithEmailPassword = async ({ email, password, displayName }: SignUpCredentials) => {
    setFbAuthLoading(true);
    let currentAppSettings = appSettings;
    if (fbAppConfigLoading) {
        try {
            const config = await getAppConfiguration(); // ensure we have latest settings for new user
            currentAppSettings = config.settings;
            if (fbAppConfigLoading) setFbAppConfigLoading(false); // If it was loading, mark as loaded
        } catch (e) {
            console.error("Using default app settings for new user due to fetch error during signup:", e);
            currentAppSettings = defaultAppSettings;
        }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
        const photoURL = userCredential.user.photoURL;

        await createFirestoreUser(
          userCredential.user.uid,
          userCredential.user.email,
          displayName,
          photoURL,
          currentAppSettings
        );
        toast({ title: "Sign Up Successful", description: "Welcome! You are now logged in." });
        router.push('/');
      }
    } catch (error: any) {
      console.error("Error during email/password sign up (Code:", error.code, "):", error.message);
      let description = error.message && String(error.message).trim() !== "" ? String(error.message) : "An unexpected error occurred.";
      if (error.code === 'auth/email-already-in-use') description = 'This email is already registered. Try logging in.';
      else if (error.code === 'auth/weak-password') description = 'Password is too weak. It should be at least 6 characters long.';
      else if (error.code === 'auth/invalid-email') description = 'The email address is not valid.';
      else if (error.code === 'auth/invalid-credential') description = 'The email/password is not valid.';
      toast({ variant: "destructive", title: "Sign Up Failed", description });
    } finally {
      // setFbAuthLoading(false); // Auth state change handles this
    }
  };

  const loginWithEmailPassword = async ({ email, password }: LoginCredentials) => {
    setFbAuthLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // lastLogin update is handled by onAuthStateChanged
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/');
    } catch (error: any) {
      console.error("Error during email/password login (Code:", error.code, "):", error.message);
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
      // setFbAuthLoading(false); // Auth state change handles this
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
      setUser(null);
    } catch (error: any) {
      console.error("Error during logout (Code:", error.code, "):", error.message);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    }
  };

  const contextValue = {
    user,
    loading: fbAuthLoading || fbAppConfigLoading,
    authLoading: fbAuthLoading,
    appSettings,
    newsItems,
    isAppConfigLoading: fbAppConfigLoading,
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
