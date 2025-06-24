
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
  doc,
  db,
  UserDocument,
  getUserData,
  onSnapshot, // Import onSnapshot for real-time listening
  logUserActivity, // Import activity logger
  arrayUnion,
  updateDoc
} from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import type { LoginCredentials, SignUpCredentials } from '@/lib/validators/auth';
import { AppSettings, initialSettings as defaultAppSettings, DEFAULT_NEWS_ITEMS, DEFAULT_LOGO_URL } from '@/lib/appConfig';

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
  
  const logout = useCallback(async (isBlocked = false) => {
    setFbAuthLoading(true); 
    try {
      await firebaseSignOut(auth);
      if (isBlocked) {
        toast({ title: "Account Blocked", description: "Your account is blocked. Please contact support.", variant: "destructive" });
      } else {
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
      }
      router.push('/login');
      setUser(null); 
      setUserData(null);
    } catch (error: any) {
      console.error("Firebase Auth: Error during logout (Code:", error.code, "):", error.message);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message || "Could not log out." });
    } finally {
      setFbAuthLoading(false); 
    }
  }, [router, toast]);


   useEffect(() => {
    let firestoreUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      // First, clean up any previous listener if it exists
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
      
      setUser(firebaseUser);
      setFbAuthLoading(false); 

      if (firebaseUser) {
        setUserDataLoading(true);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        firestoreUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const latestUserData = docSnap.data() as UserDocument;
            setUserData(latestUserData);
            
            // If user is blocked, log them out immediately.
            if (latestUserData.isBlocked) {
              logout(true);
              return;
            }

          } else {
            setUserData(null);
          }
          setUserDataLoading(false);
        }, (error) => {
          console.error("AuthContext: Error with onSnapshot listener:", error);
          setUserData(null);
          setUserDataLoading(false);
        });

        const creationTime = firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : 0;
        const lastSignInTime = firebaseUser.metadata.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime).getTime() : 0;
        const isNewUserSession = Math.abs(creationTime - lastSignInTime) < 5000;
        
        if (!isNewUserSession) {
          updateUserData(firebaseUser.uid, { lastActive: Timestamp.now() }).catch(err => console.warn("Failed to update last active time", err));
        }

      } else {
        // User is logged out, clear data
        setUserData(null);
        setUserDataLoading(false);
      }
    });

    // Cleanup function runs when component unmounts
    return () => {
      authUnsubscribe();
      if (firestoreUnsubscribe) {
        firestoreUnsubscribe();
      }
    };
  }, [logout]);


  const signUpWithEmailPassword = async ({ email, password, displayName }: SignUpCredentials) => {
    setFbAuthLoading(true);
    let currentAppSettings = appConfig.settings;
    const referredBy = sessionStorage.getItem('referralCode');

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
        const photoURL = userCredential.user.photoURL || currentAppSettings.logoUrl || DEFAULT_LOGO_URL;
        
        await createFirestoreUser(
          userCredential.user.uid,
          userCredential.user.email,
          displayName,
          photoURL,
          currentAppSettings,
          referredBy // Pass referral code to create user function
        );

        // If the user was referred, update the referrer's document
        if (referredBy) {
          try {
            const referrerRef = doc(db, 'users', referredBy);
            await updateDoc(referrerRef, {
              referrals: arrayUnion(userCredential.user.uid)
            });
          } catch (refError) {
            console.error("Failed to update referrer's document:", refError);
          } finally {
            sessionStorage.removeItem('referralCode'); // Clear code after use
          }
        }
        
        await logUserActivity(userCredential.user.uid, userCredential.user.email, 'login');
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // After successful sign-in, check if user is blocked before proceeding
      const loggedInUser = await getUserData(userCredential.user.uid);
      if (loggedInUser?.isBlocked) {
        await logout(true); // Call logout with blocked flag
        return; // Stop further execution
      }

      // Log login activity after successful signin
      await logUserActivity(userCredential.user.uid, userCredential.user.email, 'login');

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

  const contextValue = {
    user,
    userData,
    loading: fbAuthLoading || fbAppConfigLoading || userDataLoading, 
    appSettings: appConfig.settings,
    newsItems: appConfig.newsItems,
    refreshAppConfig: fetchAppConfig,
    signUpWithEmailPassword,
    loginWithEmailPassword,
    logout: () => logout(false), // Expose a simple logout function
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
