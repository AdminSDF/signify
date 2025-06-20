
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  auth,
  firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile, // Import updateProfile
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
    if (!fbAppConfigLoading) setFbAppConfigLoading(true); // Ensure loading is true if re-fetching
    try {
      const config = await getAppConfiguration();
      setAppSettings(config.settings);
      setNewsItems(config.newsItems);
    } catch (error) {
      console.error("AuthContext: Error in fetchAppConfig:", error);
      setAppSettings(defaultAppSettings); // Fallback to defaults
      setNewsItems(DEFAULT_NEWS_ITEMS); // Fallback to defaults
      toast({
        title: "Could not load app settings. Using defaults.",
        description: "There was an issue fetching app configuration from the server.",
        variant: "destructive"
      });
    } finally {
      setFbAppConfigLoading(false);
    }
  }, [toast, fbAppConfigLoading]); // fbAppConfigLoading in deps to ensure it's current

  useEffect(() => {
    fetchAppConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch app config once on initial mount

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Update lastLogin, but ensure it doesn't interfere with initial profile update
          if(firebaseUser.displayName) { // Attempt update only if displayName is likely set
             await updateUserData(firebaseUser.uid, { lastLogin: Timestamp.now() });
          }
        } catch (updateError) {
          console.warn("Could not update lastLogin on auth state change:", updateError);
        }
      }
      setFbAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUpWithEmailPassword = async ({ email, password, displayName }: SignUpCredentials) => {
    setFbAuthLoading(true); 
    let currentAppSettings = appSettings;
    if (fbAppConfigLoading) { // If config is still loading, fetch it before creating user
        try {
            const config = await getAppConfiguration();
            currentAppSettings = config.settings;
        } catch (e) {
            console.error("Using default app settings for new user due to fetch error:", e);
            currentAppSettings = defaultAppSettings; // Fallback
        }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
        // Fetch the photoURL from the userCredential, though it might be null
        const photoURL = userCredential.user.photoURL;
        
        await createFirestoreUser(
          userCredential.user.uid,
          userCredential.user.email, // email from userCredential is more reliable
          displayName,
          photoURL, // Pass photoURL
          currentAppSettings 
        );
        
        // The user object in AuthContext will update via onAuthStateChanged with the new displayName
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
      // setFbAuthLoading(false); // Auth state change will handle this
    }
  };

  const loginWithEmailPassword = async ({ email, password }: LoginCredentials) => {
    setFbAuthLoading(true); 
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateUserData(userCredential.user.uid, { lastLogin: Timestamp.now() });
      }
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
      // setFbAuthLoading(false); // Auth state change will handle this
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
      setUser(null); // Explicitly clear user state on logout
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
