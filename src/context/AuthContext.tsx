
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
  AppConfiguration,
  updateUserData,
  Timestamp,
  getDoc, 
  doc,
  db,
  UserDocument,
  getUserData,
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import type { LoginCredentials, SignUpCredentials } from '@/lib/validators/auth';
import { AppSettings, initialSettings as defaultAppSettings, DEFAULT_NEWS_ITEMS } from '@/lib/appConfig';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserDocument | null;
  loading: boolean; // Combined loading state
  appSettings: AppSettings;
  newsItems: string[];
  refreshAppConfig: () => Promise<void>;
  signUpWithEmailPassword: (credentials: SignUpCredentials) => Promise<void>;
  loginWithEmailPassword: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserDocument | null>(null);
  const [fbAuthLoading, setFbAuthLoading] = useState(true); 
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [appConfig, setAppConfig] = useState<AppConfiguration>({ settings: defaultAppSettings, newsItems: DEFAULT_NEWS_ITEMS });
  const [fbAppConfigLoading, setFbAppConfigLoading] = useState(true); 
  const router = useRouter();
  const { toast } = useToast();

  const fetchAppConfig = useCallback(async () => {
    setFbAppConfigLoading(true);
    try {
      const config = await getAppConfiguration();
      setAppConfig(config);
    } catch (error) {
      console.error("AuthContext: Error in fetchAppConfig:", error);
      setAppConfig({ settings: defaultAppSettings, newsItems: DEFAULT_NEWS_ITEMS });
      toast({
        title: "App Config Load Issue",
        description: "Could not load app settings. Using defaults.",
        variant: "destructive"
      });
    } finally {
      setFbAppConfigLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAppConfig();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Fetch config once on mount

   useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUserDataLoading(true);
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
            const docData = await getUserData(firebaseUser.uid);
            setUserData(docData);

            if (docData) {
                // This check is to prevent updating lastLogin on account creation
                const creationTime = firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : 0;
                const lastSignInTime = firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).getTime() : 0;
                const isNewUserSession = Math.abs(creationTime - lastSignInTime) < 5000;
                
                if (!isNewUserSession) {
                    await updateUserData(firebaseUser.uid, { lastLogin: Timestamp.now() });
                }
            }
        } catch(err) {
            console.error("Error fetching or updating user data on auth change:", err);
            setUserData(null); // Ensure userData is cleared on error
        }
      } else {
        setUserData(null);
      }
      setUserDataLoading(false);
      setFbAuthLoading(false); 
    });
    return () => unsubscribe();
  }, []);


  const signUpWithEmailPassword = async ({ email, password, displayName }: SignUpCredentials) => {
    setFbAuthLoading(true);
    let currentAppSettings = appConfig.settings;

    if (fbAppConfigLoading) {
        console.log("App config was loading during signup, attempting to fetch fresh config...");
        try {
            const freshConfig = await getAppConfiguration();
            currentAppSettings = freshConfig.settings;
            setAppConfig(freshConfig);
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
    } finally {
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
      setUserData(null);
    } catch (error: any) {
      console.error("Firebase Auth: Error during logout (Code:", error.code, "):", error.message);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    } finally {
      setFbAuthLoading(false); 
    }
  };

  const contextValue = {
    user,
    userData,
    loading: fbAuthLoading || fbAppConfigLoading || userDataLoading, 
    appSettings: appConfig.settings,
    newsItems: appConfig.newsItems,
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
