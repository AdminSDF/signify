
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
  getDoc, // Added for checking user doc existence
  doc // Added for creating doc reference
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import type { LoginCredentials, SignUpCredentials } from '@/lib/validators/auth';
import { AppSettings, initialSettings as defaultAppSettings, DEFAULT_NEWS_ITEMS } from '@/lib/appConfig';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean; // Combined loading state
  authLoading: boolean; // Specifically for Firebase Auth processing
  appSettings: AppSettings;
  newsItems: string[];
  isAppConfigLoading: boolean; // Specifically for app config loading from Firestore
  refreshAppConfig: () => Promise<void>;
  signUpWithEmailPassword: (credentials: SignUpCredentials) => Promise<void>;
  loginWithEmailPassword: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [fbAuthLoading, setFbAuthLoading] = useState(true); // Firebase Auth specific loading
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [newsItems, setNewsItems] = useState<string[]>(DEFAULT_NEWS_ITEMS);
  const [fbAppConfigLoading, setFbAppConfigLoading] = useState(true); // Firestore App Config specific loading
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
      setAppSettings(defaultAppSettings); // Fallback to defaults
      setNewsItems(DEFAULT_NEWS_ITEMS);  // Fallback to defaults
      toast({
        title: "App Config Load Issue",
        description: "Could not load app settings. Using defaults.",
        variant: "destructive"
      });
    } finally {
      setFbAppConfigLoading(false);
    }
  }, [fbAppConfigLoading, toast]); // Added fbAppConfigLoading to dependency array

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
        const isTrulyNewSession = creationTime === lastSignInTime && (Date.now() - creationTime < 10000);

        if (!isTrulyNewSession) {
          try {
             const userDocRef = doc(auth.firestore, 'users', firebaseUser.uid);
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
      setFbAuthLoading(false); // Firebase Auth state is now determined
    });
    return () => unsubscribe();
  }, []);


  const signUpWithEmailPassword = async ({ email, password, displayName }: SignUpCredentials) => {
    setFbAuthLoading(true);
    let currentAppSettings = appSettings;

    // Ensure we have the latest app settings if they were still loading
    if (fbAppConfigLoading) {
        try {
            console.log("App config was loading during signup, fetching fresh config...");
            const freshConfig = await getAppConfiguration();
            currentAppSettings = freshConfig.settings;
            setAppSettings(freshConfig.settings); // Update context state as well
            setNewsItems(freshConfig.newsItems);
            if(fbAppConfigLoading) setFbAppConfigLoading(false); // Mark as loaded if it was still true
        } catch (e) {
            console.error("Using default app settings for new user due to fetch error during signup:", e);
            currentAppSettings = defaultAppSettings; // Fallback
        }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // If this point is reached, Firebase Auth user is created.
      if (userCredential.user) {
        // Now try to update profile and create Firestore document
        try {
          await updateProfile(userCredential.user, { displayName });
          const photoURL = userCredential.user.photoURL; 
          await createFirestoreUser(
            userCredential.user.uid,
            userCredential.user.email,
            displayName,
            photoURL,
            currentAppSettings // Use potentially refreshed appSettings
          );
          toast({ title: "Sign Up Successful", description: "Welcome! You are now logged in." });
          router.push('/');
        } catch (profileOrDbError: any) {
            // This block executes if Auth user was created, but profile update or Firestore doc creation failed.
            console.error("Error during profile update or Firestore user creation for new user:", userCredential.user.uid, profileOrDbError);
            toast({
                variant: "destructive",
                title: "Account Created, Setup Incomplete",
                description: `Your account was made, but initial data setup failed (Error: ${profileOrDbError.message || 'Unknown error'}). Please try logging in. If issues persist, contact support.`
            });
            // Even with this error, the user is technically signed up in Firebase Auth.
            // The onAuthStateChanged listener will pick them up.
            // We might want to redirect them or let the natural flow take them to home page.
        }
      } else {
        // This case should not be reached if createUserWithEmailAndPassword resolves successfully without an error.
        // If it does, it's an unexpected state from Firebase.
        console.error("Firebase Auth: createUserWithEmailAndPassword succeeded but userCredential.user is null.");
        throw new Error("User credential was created but the user object is unexpectedly null.");
      }
    } catch (error: any) { // This catch block is for errors from createUserWithEmailAndPassword itself
      console.error("Firebase Auth: Error during email/password sign up (Code:", error.code, "):", error.message);
      let description = error.message && String(error.message).trim() !== "" ? String(error.message) : "An unexpected error occurred during sign up.";
      if (error.code === 'auth/email-already-in-use') description = 'This email is already registered. Please try logging in.';
      else if (error.code === 'auth/weak-password') description = 'Password is too weak. It should be at least 6 characters long.';
      else if (error.code === 'auth/invalid-email') description = 'The email address is not valid.';
      // Note: 'auth/invalid-credential' is typically for login, not signup.
      toast({ variant: "destructive", title: "Sign Up Failed", description });
    } finally {
      // setFbAuthLoading(false); // This is handled by onAuthStateChanged
    }
  };

  const loginWithEmailPassword = async ({ email, password }: LoginCredentials) => {
    setFbAuthLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user state and fbAuthLoading to false.
      // It also handles lastLogin update.
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
      setFbAuthLoading(false); // Set loading to false here on login failure.
    }
  };

  const logout = async () => {
    setFbAuthLoading(true); // Indicate loading during logout process
    try {
      await firebaseSignOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
      setUser(null); // Explicitly set user to null
    } catch (error: any) {
      console.error("Firebase Auth: Error during logout (Code:", error.code, "):", error.message);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    } finally {
      setFbAuthLoading(false); // Reset loading state after logout attempt
    }
  };

  const contextValue = {
    user,
    loading: fbAuthLoading || fbAppConfigLoading, // Combined global loading state
    authLoading: fbAuthLoading, // Firebase Auth specific loading
    appSettings,
    newsItems,
    isAppConfigLoading: fbAppConfigLoading, // App config specific loading
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

    