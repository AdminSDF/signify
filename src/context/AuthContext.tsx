
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
  Timestamp,
  getDoc, 
  doc,
  db
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
        description: "Could not load app settings. Using defaults.",
        variant: "destructive"
      });
    } finally {
      setFbAppConfigLoading(false);
    }
  }, [toast]); // Removed fbAppConfigLoading from deps to prevent loops

  useEffect(() => {
    fetchAppConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch config once on mount

   useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const creationTime = firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : 0;
        const lastSignInTime = firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).getTime() : 0;
        
        const isTrulyNewSession = Math.abs(creationTime - lastSignInTime) < 2000;

        if (!isTrulyNewSession) {
          try {
             const userDocRef = doc(db, 'users', firebaseUser.uid);
             const userDoc = await getDoc(userDocRef);
             if (userDoc.exists()) {
                await updateUserData(firebaseUser.uid, { lastLogin: Timestamp.now() });
             } else {
                console.warn("User document not found for lastLogin update, possibly very new user or document creation is pending/failed:", firebaseUser.uid);
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
        console.log("App config was loading during signup, attempting to fetch fresh config...");
        try {
            const freshConfig = await getAppConfiguration();
            currentAppSettings = freshConfig.settings;
            setAppSettings(freshConfig.settings); 
            setNewsItems(freshConfig.newsItems);
            if(fbAppConfigLoading) setFbAppConfigLoading(false); 
        } catch (e) {
            console.error("SignUp: Using default app settings for new user due to fetch error during signup:", e);
            currentAppSettings = defaultAppSettings; 
        }
    }

    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (authError: any) {
      console.error("Firebase Auth: Error during email/password sign up (Code:", authError.code, "):", authError.message);
      let description = authError.message && String(authError.message).trim() !== "" ? String(authError.message) : "An unexpected error occurred during sign up.";
      if (authError.code === 'auth/email-already-in-use') description = 'This email is already registered. Please try logging in.';
      else if (authError.code === 'auth/weak-password') description = 'Password is too weak. It should be at least 6 characters long.';
      else if (authError.code === 'auth/invalid-email') description = 'The email address is not valid.';
      toast({ variant: "destructive", title: "Sign Up Failed", description });
      setFbAuthLoading(false); 
      return;
    }

    if (userCredential && userCredential.user) {
      let profileUpdated = false;
      try {
        await updateProfile(userCredential.user, { displayName });
        profileUpdated = true;
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
      } catch (setupError: any) {
          console.error(`Error during post-auth setup for ${userCredential.user.uid}:`, setupError);
          const errorSource = profileUpdated ? "Firestore document creation" : "Firebase profile update";
          toast({
              variant: "destructive",
              title: "Account Created, Setup Incomplete",
              description: `Your account was made, but ${errorSource} failed (Error: ${setupError.message || 'Unknown error'}). Please try logging in. If issues persist, check console or contact support.`
          });
      }
    } else {
      console.error("Firebase Auth: createUserWithEmailAndPassword succeeded but userCredential.user is null.");
      toast({ variant: "destructive", title: "Sign Up Failed", description: "User creation succeeded but user data is missing." });
    }
  };

  const loginWithEmailPassword = async ({ email, password }: LoginCredentials) => {
    setFbAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push('/');
    } catch (error: any) {
      console.error("Firebase Auth: Error during email/password login (Code:", error.code, "):", error.message);
      let description = error.message && String(error.message).trim() !== "" ? String(error.message) : "An unexpected error occurred during login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        description = 'The email address format is not valid.';
      } else if (error.code === 'auth/user-disabled') {
        description = 'This user account has been disabled.';
      }
      toast({ variant: "destructive", title: "Login Failed", description });
      setFbAuthLoading(false); 
    }
  };

  const logout = async () => {
    setFbAuthLoading(true); 
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
      setUser(null); 
    } catch (error: any) {
      console.error("Firebase Auth: Error during logout (Code:", error.code, "):", error.message);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    } finally {
      setFbAuthLoading(false); 
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

    
