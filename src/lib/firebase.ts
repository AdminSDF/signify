

import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  onSnapshot, // Export onSnapshot
  FieldValue,
  increment,
  arrayUnion,
  arrayRemove,
  runTransaction,
  QueryConstraint,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { AppSettings, AppConfiguration as AppConfigData, WheelTierConfig, RewardConfig } from '@/lib/appConfig'; // Renamed to avoid conflict
import { initialSettings as defaultAppSettings, DEFAULT_NEWS_ITEMS, DEFAULT_ADMIN_EMAIL, initialWheelConfigs } from '@/lib/appConfig';


const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Check for missing configuration on both client and server.
const requiredConfigKeys: (keyof FirebaseOptions)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  const envVarMap: { [key: string]: string } = {
    apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
    authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
  };
  const missingEnvVars = missingKeys.map(key => envVarMap[key as keyof typeof envVarMap] || key);

  // This more descriptive error will be thrown during initialization, making it very visible.
  const errorMessage = `
================================================================================
[FIREBASE CONFIGURATION ERROR]
Your application cannot connect to Firebase because of missing configuration.

Missing Environment Variables:
- ${missingEnvVars.join('\n- ')}

How to fix this:
1. Go to your Firebase project console: https://console.firebase.google.com/
2. In the left menu, click the Gear icon > Project settings.
3. In the "General" tab, scroll down to "Your apps".
4. Select your web app.
5. In the "SDK setup and configuration" section, choose "Config".
6. Copy the key-value pairs from the 'firebaseConfig' object into your '.env' file in the root of this project.
7. Make sure each key is prefixed with 'NEXT_PUBLIC_', for example: 'apiKey' becomes 'NEXT_PUBLIC_FIREBASE_API_KEY'.
8. Restart your development server after updating the .env file.
================================================================================
`;
  throw new Error(errorMessage);
}


const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();

// Firestore Collection Names
export const USERS_COLLECTION = 'users';
export const TRANSACTIONS_COLLECTION = 'transactions';
export const WITHDRAWAL_REQUESTS_COLLECTION = 'withdrawalRequests';
export const ADD_FUND_REQUESTS_COLLECTION = 'addFundRequests';
export const APP_CONFIG_COLLECTION = 'appConfiguration';
export const APP_CONFIG_DOC_ID = 'main';
export const SUPPORT_TICKETS_COLLECTION = 'supportTickets';
export const ACTIVITY_LOGS_COLLECTION = 'activityLogs';
export const FRAUD_ALERTS_COLLECTION = 'fraudAlerts';
export const SYSTEM_STATS_COLLECTION = 'systemStats';
export const GLOBAL_STATS_DOC_ID = 'global';
export const USER_REWARDS_COLLECTION = 'userRewards';
export const TOURNAMENTS_COLLECTION = 'tournaments';


// --- User Functions ---
export type UserRole = 'player' | 'support-staff' | 'finance-staff' | 'admin' | 'super-admin';

export interface UserDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  balances: { [tierId: string]: number };
  spinsAvailable: number;
  dailyPaidSpinsUsed: number;
  lastPaidSpinDate: string; // YYYY-MM-DD
  totalWinnings: number;
  totalSpinsPlayed: number;
  totalWins: number; // New field to track wins
  totalDeposited?: number;
  totalWithdrawn?: number;
  isAdmin?: boolean; // Kept for backwards compatibility, but 'role' is preferred
  role?: UserRole; // New role-based system
  isBlocked?: boolean;
  lastActive?: Timestamp;
  isOnline?: boolean;
  currentGame?: string | null;
  upiIdForWithdrawal?: string;
  bankDetailsForWithdrawal?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  };
  totalPlayTime?: number; // in minutes
  devices?: string[]; // e.g. ['Android', 'iOS', 'Web']
  toursCompleted?: {
    welcome?: boolean;
    gamePage?: boolean;
    profilePage?: boolean;
  };
  referralCode?: string;
  referredBy?: string;
  referrals?: string[];
  referralEarnings?: number;
  referralMilestones?: string[]; // e.g., ['Bronze', 'Silver']
  // Dynamic Winning Chance Fields
  tags: string[]; // e.g., ["new", "high-loss", "vip"]
  manualWinRateOverride?: number | null; // Admin-set override (0 to 1)
  recentSpinHistory: ('win' | 'loss')[]; // To track last few spins
  vipUntil?: Timestamp | null;
  // Social Features
  friends?: string[];
  friendRequestsSent?: string[];
  friendRequestsReceived?: string[];
}

export const createUserData = async (
  userId: string,
  email: string | null,
  displayName: string | null,
  photoURL: string | null,
  initialAppSettings: AppSettings,
  referredBy?: string | null
): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userRewardRef = doc(db, USER_REWARDS_COLLECTION, userId);

  // Initialize balances for all tiers
  const initialBalances: { [tierId: string]: number } = {};
  let baseInitialBalance = initialAppSettings.initialBalanceForNewUsers;
  
  if (referredBy) {
    baseInitialBalance += initialAppSettings.referralBonusForNewUser;
  }

  Object.keys(initialAppSettings.wheelConfigs).forEach(tierId => {
    initialBalances[tierId] = tierId === 'little' ? baseInitialBalance : 0;
  });

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL)
    .toLowerCase()
    .split(',')
    .map(e => e.trim())
    .filter(e => e);

  const userEmail = email ? email.toLowerCase().trim() : '';
  const isSuperAdmin = adminEmails.includes(userEmail);

  const userData: UserDocument = {
    uid: userId,
    email,
    displayName,
    photoURL,
    createdAt: Timestamp.now(),
    balances: initialBalances,
    spinsAvailable: initialAppSettings.maxSpinsInBundle,
    dailyPaidSpinsUsed: 0,
    lastPaidSpinDate: new Date().toLocaleDateString('en-CA'),
    isAdmin: isSuperAdmin, // For compatibility
    role: isSuperAdmin ? 'super-admin' : 'player',
    isBlocked: false,
    lastActive: Timestamp.now(),
    isOnline: false,
    currentGame: null,
    totalWinnings: 0,
    totalSpinsPlayed: 0,
    totalWins: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    toursCompleted: {
      welcome: false,
      gamePage: false,
      profilePage: false,
    },
    referralCode: userId,
    referrals: [],
    referralEarnings: 0,
    referralMilestones: [],
    ...(referredBy && { referredBy }),
    tags: ['new'],
    manualWinRateOverride: null,
    recentSpinHistory: [],
    vipUntil: null,
    friends: [],
    friendRequestsSent: [],
    friendRequestsReceived: [],
  };

  const userRewardData: UserRewardData = {
    userId,
    lastClaimDate: null,
    currentStreak: 0,
    totalClaims: 0,
    history: [],
  };

  const batch = writeBatch(db);
  batch.set(userRef, userData);
  batch.set(userRewardRef, userRewardData);

  await batch.commit();
};

export const getUserData = async (userId: string): Promise<UserDocument | null> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    const data = docSnap.data() as UserDocument;
    if (!data.balances) {
      data.balances = {
        little: (data as any).balance || 0,
        big: 0,
        'more-big': 0,
      }
    }
    return data;
  }
  return null;
};

export const updateUserData = async (userId: string, data: Partial<UserDocument | { [key: string]: any }>): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await setDoc(userRef, data, { merge: true });
};


export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("File is not an image.");
  }
  const storageRef = ref(storage, `profile_photos/${userId}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

export const getAllUsers = async (
  count: number = 100,
  sortBy: { field: string; direction: 'asc' | 'desc' } = { field: 'createdAt', direction: 'desc' }
): Promise<(UserDocument & {id: string})[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    orderBy(sortBy.field, sortBy.direction),
    limit(count)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (UserDocument & { id: string })));
};

export const getLeaderboardUsers = async (count: number = 50): Promise<UserDocument[]> => {
  const q = query(
    collection(db, USERS_COLLECTION),
    orderBy("totalWinnings", "desc"),
    limit(count)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserDocument);
};


// --- Transaction Functions ---
export interface TransactionData {
  id?: string;
  userId: string;
  userEmail: string | null;
  type: 'credit' | 'debit' | 'spin';
  amount: number; // Net amount for the transaction
  description: string;
  date: Timestamp;
  status: 'completed' | 'pending' | 'failed';
  tierId?: string; // Optional field to track which balance was affected
  balanceBefore?: number;
  balanceAfter?: number;
  spinDetails?: {
      betAmount: number;
      winAmount: number;
  }
}

export const addTransactionToFirestore = async (transactionDetails: Omit<TransactionData, 'date' | 'userId'>, userId: string): Promise<string> => {
    const dataToSave: Partial<TransactionData> & { userId: string, date: Timestamp } = {
        userId: userId,
        userEmail: transactionDetails.userEmail,
        type: transactionDetails.type,
        amount: transactionDetails.amount,
        description: transactionDetails.description,
        status: transactionDetails.status || 'completed',
        tierId: transactionDetails.tierId,
        date: Timestamp.now(),
        spinDetails: transactionDetails.spinDetails,
    };

    if (typeof transactionDetails.balanceBefore === 'number' && !isNaN(transactionDetails.balanceBefore)) {
        dataToSave.balanceBefore = transactionDetails.balanceBefore;
    }
    if (typeof transactionDetails.balanceAfter === 'number' && !isNaN(transactionDetails.balanceAfter)) {
        dataToSave.balanceAfter = transactionDetails.balanceAfter;
    }
    
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), dataToSave as TransactionData);
    return docRef.id;
};

export const getTransactionsFromFirestore = async (userId: string, count: number = 50): Promise<(TransactionData & {id: string})[]> => {
  try {
    const q = query(
      collection(db, TRANSACTIONS_COLLECTION),
      where("userId", "==", userId),
      orderBy("date", "desc"),
      limit(count)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (TransactionData & {id: string})));
  } catch(error: any) {
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.error("TRANSACTIONS_PAGE_ERROR: Firestore query requires an index. Please check Firebase console.");
      } else {
        console.error("TRANSACTIONS_PAGE_ERROR: Error fetching transactions from Firestore:", error);
      }
      return [];
  }
};

export const getAllTransactions = async (count: number = 100): Promise<(TransactionData & {id: string})[]> => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    orderBy("date", "desc"),
    limit(count)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (TransactionData & {id: string})));
};

// --- App Configuration Functions ---
export interface AppConfiguration {
  settings: AppSettings;
  newsItems: string[];
}

export const getAppConfiguration = async (): Promise<AppConfiguration> => {
  const configRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
  const defaults: AppConfiguration = {
    settings: defaultAppSettings,
    newsItems: DEFAULT_NEWS_ITEMS,
  };

  try {
    const docSnap = await getDoc(configRef);
    if (docSnap.exists()) {
      const fetchedData = docSnap.data();
      
      const mergedWheelConfigs: { [key: string]: WheelTierConfig } = {};
      const defaultWheelKeys = Object.keys(defaultAppSettings.wheelConfigs);
      const fetchedWheelKeys = fetchedData?.settings?.wheelConfigs ? Object.keys(fetchedData.settings.wheelConfigs) : [];
      const allKeys = new Set([...defaultWheelKeys, ...fetchedWheelKeys]);

      allKeys.forEach(key => {
        mergedWheelConfigs[key] = {
          ...(defaultAppSettings.wheelConfigs[key] || {}),
          ...(fetchedData?.settings?.wheelConfigs?.[key] || {}),
        };
      });

      const settings = { 
        ...defaultAppSettings, 
        ...(fetchedData?.settings || {}),
        wheelConfigs: mergedWheelConfigs,
        rewardConfig: {
          ...defaultAppSettings.rewardConfig,
          ...(fetchedData?.settings?.rewardConfig || {})
        }
      };

      const newsItems = fetchedData?.newsItems && Array.isArray(fetchedData.newsItems) && fetchedData.newsItems.length > 0
                        ? fetchedData.newsItems
                        : DEFAULT_NEWS_ITEMS;

      return { settings, newsItems };
    }
    await setDoc(configRef, {
      settings: defaultAppSettings,
      newsItems: DEFAULT_NEWS_ITEMS
    });
    return defaults;
  } catch (error) {
    console.error(`Error in getAppConfiguration. Using defaults. Error:`, error);
    return defaults;
  }
};

export const saveAppConfigurationToFirestore = async (config: AppConfiguration): Promise<void> => {
  const configRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
  await setDoc(configRef, config, { merge: true });
};


// --- Withdrawal Request Functions ---
export interface WithdrawalRequestData {
  id?: string;
  userId: string;
  userEmail: string;
  amount: number;
  tierId: string;
  paymentMethod: "upi" | "bank";
  upiId?: string;
  bankDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  };
  requestDate: Timestamp;
  status: "pending" | "approved" | "rejected" | "processed";
  processedDate?: Timestamp;
  adminNotes?: string;
  transactionId?: string;
  processedByAdminId?: string;
  processedByAdminEmail?: string;
}

export const createWithdrawalRequest = async (data: Omit<WithdrawalRequestData, 'requestDate' | 'status' | 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), {
    ...data,
    requestDate: Timestamp.now(),
    status: "pending",
  });
  return docRef.id;
};

export const getWithdrawalRequests = async (
  filters: { status?: WithdrawalRequestData['status']; userId?: string } = {}
): Promise<(WithdrawalRequestData & {id: string})[]> => {
  const { status, userId } = filters;
  const constraints: QueryConstraint[] = [];

  if (userId) {
    constraints.push(where("userId", "==", userId));
  } else if (status) {
    constraints.push(where("status", "==", status));
  }

  constraints.push(orderBy("requestDate", "desc"));
  
  const q = query(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (WithdrawalRequestData & {id: string})));
};

export const updateWithdrawalRequestStatus = async (
  requestId: string,
  status: WithdrawalRequestData['status'],
  adminId: string,
  adminEmail: string,
  adminNotes?: string
): Promise<void> => {
  const requestRef = doc(db, WITHDRAWAL_REQUESTS_COLLECTION, requestId);
  const updateData: Partial<WithdrawalRequestData> = {
    status,
    processedByAdminId: adminId,
    processedByAdminEmail: adminEmail,
  };
  if (adminNotes) updateData.adminNotes = adminNotes;
  if (status === "processed" || status === "approved") updateData.processedDate = Timestamp.now();
  await updateDoc(requestRef, updateData);
};


// --- Add Fund Request Functions ---
export interface AddFundRequestData {
  id?: string;
  userId: string;
  userEmail: string;
  amount: number;
  tierId: string;
  paymentReference: string;
  requestDate: Timestamp;
  status: "pending" | "approved" | "rejected";
  approvedDate?: Timestamp;
  adminNotes?: string;
  transactionId?: string;
  processedByAdminId?: string;
  processedByAdminEmail?: string;
}

export const createAddFundRequest = async (data: Omit<AddFundRequestData, 'requestDate' | 'status' | 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, ADD_FUND_REQUESTS_COLLECTION), {
    ...data,
    requestDate: Timestamp.now(),
    status: "pending",
  });
  return docRef.id;
};

export const getAddFundRequests = async (
  filters: { status?: AddFundRequestData['status']; userId?: string } = {}
): Promise<(AddFundRequestData & {id: string})[]> => {
  const { status, userId } = filters;
  const constraints: QueryConstraint[] = [];

  if (userId) {
    constraints.push(where("userId", "==", userId));
  } else if (status) {
    constraints.push(where("status", "==", status));
  }
  
  constraints.push(orderBy("requestDate", "desc"));

  const q = query(collection(db, ADD_FUND_REQUESTS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (AddFundRequestData & {id: string})));
};

export const updateAddFundRequestStatus = async (
  requestId: string,
  status: AddFundRequestData['status'],
  adminId: string,
  adminEmail: string,
  adminNotes?: string
): Promise<void> => {
  const requestRef = doc(db, ADD_FUND_REQUESTS_COLLECTION, requestId);
  const updateData: Partial<AddFundRequestData> = {
    status,
    processedByAdminId: adminId,
    processedByAdminEmail: adminEmail,
  };
  if (adminNotes) updateData.adminNotes = adminNotes;
  if (status === "approved") updateData.approvedDate = Timestamp.now();
  await updateDoc(requestRef, updateData);
};


// --- Support Ticket & Messaging Functions ---
export interface Message {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Timestamp;
}

export interface SupportTicketData {
  id?: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  subject: string;
  status: 'open' | 'resolved' | 'customer-reply' | 'admin-reply';
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  messages: Message[];
  screenshotURL?: string;
}

export const uploadSupportScreenshot = async (ticketId: string, file: File): Promise<string> => {
    if (!file.type.startsWith("image/")) {
      throw new Error("File is not an image.");
    }
    const storageRef = ref(storage, `support_tickets/${ticketId}/${file.name}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return downloadURL;
};

export const getSupportTickets = async (
  filters: { status?: SupportTicketData['status']; userId?: string } = {}
): Promise<(SupportTicketData & {id: string})[]> => {
  const { status, userId } = filters;
  const constraints: QueryConstraint[] = [];

  if (userId) {
    constraints.push(where("userId", "==", userId));
    constraints.push(orderBy("createdAt", "desc"));
  } else {
    if (status) {
      constraints.push(where("status", "==", status));
    }
    constraints.push(orderBy("lastUpdatedAt", "desc"));
  }

  const q = query(collection(db, SUPPORT_TICKETS_COLLECTION), ...constraints);
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (SupportTicketData & {id: string})));
};


// --- Activity and Fraud Detection Functions ---
export type ActivityPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export const getTimePeriod = (): ActivityPeriod => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
};

export interface ActivityLogData {
    id?: string;
    userId: string;
    userEmail: string;
    action: 'login' | 'spin' | 'addFundRequest' | 'withdrawalRequest';
    timestamp: Timestamp;
    period: ActivityPeriod;
    device?: string;
}

export interface FraudAlertData {
    id?: string;
    userId: string;
    userEmail: string;
    reason: string;
    timestamp: Timestamp;
    status: 'open' | 'resolved';
}

export const logUserActivity = async (
    userId: string,
    userEmail: string | null,
    action: ActivityLogData['action']
): Promise<void> => {
    try {
        await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), {
            userId,
            userEmail: userEmail || 'N/A',
            action,
            timestamp: Timestamp.now(),
            period: getTimePeriod(),
        });
    } catch (error) {
        console.warn("Could not log user activity:", error);
    }
};

export type ActivitySummary = {
    [key in ActivityPeriod]: number;
};

export const getActivitySummary = async (days: number = 1): Promise<ActivitySummary> => {
    const uniqueUsers: { [key in ActivityPeriod]: Set<string> } = {
        morning: new Set(),
        afternoon: new Set(),
        evening: new Set(),
        night: new Set(),
    };
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const q = query(
        collection(db, ACTIVITY_LOGS_COLLECTION),
        where("timestamp", ">=", Timestamp.fromDate(startDate))
    );
    
    const querySnapshot = await getDocs(q);
    
    querySnapshot.forEach(doc => {
        const log = doc.data() as ActivityLogData;
        if(log.period && log.userId && uniqueUsers.hasOwnProperty(log.period)) {
            uniqueUsers[log.period].add(log.userId);
        }
    });

    const summary: ActivitySummary = {
        morning: uniqueUsers.morning.size,
        afternoon: uniqueUsers.afternoon.size,
        evening: uniqueUsers.evening.size,
        night: uniqueUsers.night.size,
    };
    
    return summary;
};


export const getFraudAlerts = async (): Promise<(FraudAlertData & {id: string})[]> => {
    const q = query(
        collection(db, FRAUD_ALERTS_COLLECTION),
        orderBy("timestamp", "desc"),
        limit(50)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (FraudAlertData & {id: string})));
};


// --- Global Stats Function ---
export interface GlobalStats {
  totalDeposited: number;
  totalWithdrawn: number;
  totalGstCollected: number;
  totalWinnings: number;
  currentBalance: number;
}

export const getGlobalStats = async (): Promise<GlobalStats> => {
  const statsFromDoc: Omit<GlobalStats, 'totalWinnings' | 'currentBalance'> = {
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalGstCollected: 0,
  };

  const globalStatsRef = doc(db, SYSTEM_STATS_COLLECTION, GLOBAL_STATS_DOC_ID);
  const docSnap = await getDoc(globalStatsRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    statsFromDoc.totalDeposited = data.totalDeposited || 0;
    statsFromDoc.totalWithdrawn = data.totalWithdrawn || 0;
    statsFromDoc.totalGstCollected = data.totalGstCollected || 0;
  } else {
    // If the doc doesn't exist, we should create it.
    // This action might fail if rules don't permit it, which can be a source of error.
    // The rules file has been updated to allow FinanceStaff to write to this doc.
    await setDoc(globalStatsRef, statsFromDoc);
  }

  const aggregatedStats = {
    totalWinnings: 0,
    currentBalance: 0,
  };

  const usersCollectionRef = collection(db, USERS_COLLECTION);
  const querySnapshot = await getDocs(usersCollectionRef);

  querySnapshot.forEach(doc => {
    const user = doc.data() as UserDocument;
    aggregatedStats.totalWinnings += user.totalWinnings || 0;
    
    if (user.balances) {
      Object.values(user.balances).forEach(balance => {
        aggregatedStats.currentBalance += balance || 0;
      });
    }
  });

  return { ...statsFromDoc, ...aggregatedStats };
};


// --- Daily Reward Functions ---

export interface UserRewardData {
  userId: string;
  lastClaimDate: string | null; // YYYY-MM-DD
  currentStreak: number;
  totalClaims: number;
  history: {
    date: string;
    reward: string;
    value: number;
  }[];
}

export const getUserRewardData = async (userId: string): Promise<UserRewardData | null> => {
  const rewardRef = doc(db, USER_REWARDS_COLLECTION, userId);
  const docSnap = await getDoc(rewardRef);
  return docSnap.exists() ? docSnap.data() as UserRewardData : null;
};

export const claimDailyReward = async (userId: string, config: RewardConfig): Promise<{ message: string }> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const rewardRef = doc(db, USER_REWARDS_COLLECTION, userId);
  const batch = writeBatch(db);

  const [userSnap, rewardSnap] = await Promise.all([getDoc(userRef), getDoc(rewardRef)]);

  if (!userSnap.exists()) throw new Error("User not found.");
  if (!rewardSnap.exists()) throw new Error("User reward data not found.");

  const userData = userSnap.data() as UserDocument;
  const rewardData = rewardSnap.data() as UserRewardData;
  const todayStr = new Date().toISOString().split('T')[0];

  if (rewardData.lastClaimDate === todayStr) {
    throw new Error("Reward already claimed today.");
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = 1;
  if (rewardData.lastClaimDate === yesterdayStr) {
    newStreak = rewardData.currentStreak + 1;
  } else if (config.resetIfMissed === false && rewardData.lastClaimDate !== null) {
    newStreak = rewardData.currentStreak + 1; // Continue streak if not resetting
  }
  
  // Check for streak bonus first
  const streakBonus = config.streakBonuses.find(b => b.afterDays === newStreak);
  let rewardToGive = streakBonus;
  let rewardMessage: string;

  // If no streak bonus, get daily reward
  if (!rewardToGive) {
    const dayIndex = (newStreak - 1) % config.dailyRewards.length;
    rewardToGive = config.dailyRewards[dayIndex];
  }
  
  if (!rewardToGive) throw new Error("No reward configured for the current day/streak.");

  // Apply reward
  if (rewardToGive.type === 'credit') {
    const currentBalance = userData.balances?.little || 0;
    batch.update(userRef, { 'balances.little': increment(rewardToGive.value) });
    rewardMessage = `You claimed ₹${rewardToGive.value}!`;
    
    // Log transaction
    const transactionDocRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    batch.set(transactionDocRef, {
      userId,
      userEmail: userData.email,
      type: 'credit',
      amount: rewardToGive.value,
      description: `Daily Reward (Day ${newStreak})`,
      date: Timestamp.now(),
      status: 'completed',
      tierId: 'little',
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + rewardToGive.value
    });

  } else if (rewardToGive.type === 'spin') {
    batch.update(userRef, { spinsAvailable: increment(rewardToGive.value) });
    rewardMessage = `You claimed ${rewardToGive.value} free spins!`;
  } else if (rewardToGive.type === 'vip') {
    const vipUntil = new Date();
    vipUntil.setDate(vipUntil.getDate() + rewardToGive.value);
    batch.update(userRef, { vipUntil: Timestamp.fromDate(vipUntil) });
    rewardMessage = `You are now a VIP for ${rewardToGive.value} day(s)!`;
  } else {
    throw new Error("Unknown reward type.");
  }
  
  // Update reward data
  batch.update(rewardRef, {
    lastClaimDate: todayStr,
    currentStreak: newStreak,
    totalClaims: increment(1),
    history: arrayUnion({
      date: todayStr,
      reward: rewardToGive.type,
      value: rewardToGive.value
    })
  });

  await batch.commit();
  return { message: rewardMessage };
};


// --- Tournament Functions ---
export interface TournamentReward {
  rank: number;
  prize: number;
  type: 'cash' | 'spins';
}

export interface Tournament {
  id?: string;
  name: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  startDate: Timestamp;
  endDate: Timestamp;
  entryFee: number;
  tierId: string; // Which balance to use for entry fee
  prizePool: number;
  status: 'upcoming' | 'active' | 'ended' | 'cancelled';
  participants?: string[]; // Kept for simplicity on admin side, but subcollection is source of truth
  rewards: TournamentReward[];
  createdBy: string; // admin UID
}

export interface UserTournamentData {
  id?: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  tournamentId: string;
  score: number;
  rank?: number;
  prizeWon?: TournamentReward;
}

export const createTournament = async (tournament: Omit<Tournament, 'id' | 'status' | 'participants'>, adminId: string): Promise<string> => {
  const docRef = await addDoc(collection(db, TOURNAMENTS_COLLECTION), {
    ...tournament,
    status: 'upcoming',
    participants: [],
    createdBy: adminId,
  });
  return docRef.id;
};

export const getAllTournaments = async (): Promise<(Tournament & { id: string })[]> => {
  const q = query(collection(db, TOURNAMENTS_COLLECTION), orderBy('startDate', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (Tournament & { id: string })));
};


export const getTournamentParticipants = async (tournamentId: string): Promise<UserTournamentData[]> => {
  const participantsRef = collection(db, 'tournaments', tournamentId, 'participants');
  const q = query(
    participantsRef,
    orderBy('score', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserTournamentData);
};

export const endTournamentAndDistributePrizes = async (tournamentId: string): Promise<void> => {
  const batch = writeBatch(db);
  const tournamentRef = doc(db, TOURNAMENTS_COLLECTION, tournamentId);
  const tournamentDoc = await getDoc(tournamentRef);

  if (!tournamentDoc.exists()) throw new Error("Tournament not found.");
  const tournament = tournamentDoc.data() as Tournament;

  if (tournament.status === 'ended') throw new Error("Tournament has already ended.");

  const participants = await getTournamentParticipants(tournamentId);

  tournament.rewards.forEach((reward, index) => {
    if (index < participants.length) {
      const winner = participants[index];
      const winnerRef = doc(db, USERS_COLLECTION, winner.userId);
      const winnerTournamentRef = doc(db, 'tournaments', tournamentId, 'participants', winner.userId);
      
      batch.update(winnerTournamentRef, { prizeWon: reward, rank: reward.rank });

      if (reward.type === 'cash') {
        batch.update(winnerRef, { 'balances.little': increment(reward.prize) });
      } else if (reward.type === 'spins') {
        batch.update(winnerRef, { spinsAvailable: increment(reward.prize) });
      }
    }
  });

  batch.update(tournamentRef, { status: 'ended' });

  await batch.commit();
};

export const getUserTournaments = async (userId: string): Promise<UserTournamentData[]> => {
  const q = query(
    collectionGroup(db, 'participants'),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as UserTournamentData);
};


// --- Social & Friends Functions ---

export const findUserByEmail = async (email: string): Promise<UserDocument | null> => {
  const q = query(collection(db, USERS_COLLECTION), where("email", "==", email), limit(1));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  return querySnapshot.docs[0].data() as UserDocument;
};

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'friend_request' | 'challenge_invite' | 'info';
  actionLink?: string;
  isRead: boolean;
  createdAt: Timestamp;
}

export const sendFriendRequest = async (senderId: string, receiverEmail: string): Promise<{success: boolean, error?: string}> => {
  if (!senderId || !receiverEmail) return { success: false, error: "Invalid data provided."};
  const senderRef = doc(db, USERS_COLLECTION, senderId);
  
  const receiver = await findUserByEmail(receiverEmail);
  if (!receiver) return { success: false, error: "User with that email not found."};
  if (receiver.uid === senderId) return { success: false, error: "You cannot send a friend request to yourself."};

  const receiverRef = doc(db, USERS_COLLECTION, receiver.uid);
  const senderDoc = await getDoc(senderRef);
  const senderData = senderDoc.data() as UserDocument;

  if (senderData.friends?.includes(receiver.uid)) return { success: false, error: "You are already friends with this user."};
  if (senderData.friendRequestsSent?.includes(receiver.uid)) return { success: false, error: "You have already sent a request to this user."};
  
  const batch = writeBatch(db);
  batch.update(senderRef, { friendRequestsSent: arrayUnion(receiver.uid) });
  batch.update(receiverRef, { friendRequestsReceived: arrayUnion(senderId) });
  
  // Create notification for receiver
  const notificationRef = doc(collection(db, 'users', receiver.uid, 'notifications'));
  batch.set(notificationRef, {
      title: "New Friend Request",
      body: `${senderData.displayName || senderData.email} sent you a friend request.`,
      type: "friend_request",
      actionLink: "/profile",
      isRead: false,
      createdAt: Timestamp.now()
  });

  await batch.commit();
  return { success: true };
};

export const acceptFriendRequest = async (currentUserId: string, requestingUserId: string) => {
  const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
  const requestingUserRef = doc(db, USERS_COLLECTION, requestingUserId);
  const currentUserDoc = await getDoc(currentUserRef);
  const currentUserData = currentUserDoc.data() as UserDocument;

  const batch = writeBatch(db);
  
  // Update both users' documents
  batch.update(currentUserRef, {
    friendRequestsReceived: arrayRemove(requestingUserId),
    friends: arrayUnion(requestingUserId)
  });
  batch.update(requestingUserRef, {
    friendRequestsSent: arrayRemove(currentUserId),
    friends: arrayUnion(currentUserId)
  });

  // Create notification for the user who sent the request
  const notificationRef = doc(collection(db, 'users', requestingUserId, 'notifications'));
  batch.set(notificationRef, {
      title: "Friend Request Accepted",
      body: `${currentUserData.displayName || currentUserData.email} accepted your request.`,
      type: "info",
      actionLink: "/profile",
      isRead: false,
      createdAt: Timestamp.now()
  });

  await batch.commit();
};

export const rejectFriendRequest = async (currentUserId: string, requestingUserId: string) => {
  const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
  const requestingUserRef = doc(db, USERS_COLLECTION, requestingUserId);
  
  const batch = writeBatch(db);
  batch.update(currentUserRef, { friendRequestsReceived: arrayRemove(requestingUserId) });
  batch.update(requestingUserRef, { friendRequestsSent: arrayRemove(currentUserId) });
  await batch.commit();
};

export const cancelFriendRequest = async (senderId: string, receiverId: string) => {
    return rejectFriendRequest(receiverId, senderId); // Same logic
};

export const removeFriend = async (currentUserId: string, friendId: string) => {
  const currentUserRef = doc(db, USERS_COLLECTION, currentUserId);
  const friendRef = doc(db, USERS_COLLECTION, friendId);
  
  const batch = writeBatch(db);
  batch.update(currentUserRef, { friends: arrayRemove(friendId) });
  batch.update(friendRef, { friends: arrayRemove(currentUserId) });
  await batch.commit();
};

export interface FriendAndRequestData {
    friends: UserDocument[];
    incoming: UserDocument[];
    outgoing: UserDocument[];
}
export const getFriendsAndRequests = async (userId: string): Promise<FriendAndRequestData> => {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (!userDoc.exists()) throw new Error("User not found");
    const userData = userDoc.data() as UserDocument;

    const friendIds = userData.friends || [];
    const incomingIds = userData.friendRequestsReceived || [];
    const outgoingIds = userData.friendRequestsSent || [];
    
    const allIds = [...new Set([...friendIds, ...incomingIds, ...outgoingIds])];
    
    if (allIds.length === 0) {
        return { friends: [], incoming: [], outgoing: [] };
    }

    // Fetch all user documents in one go
    const userDocs = await Promise.all(allIds.map(id => getDoc(doc(db, USERS_COLLECTION, id))));
    const userMap = new Map(userDocs.map(d => [d.id, d.data() as UserDocument]).filter(entry => entry[1]));

    return {
        friends: friendIds.map(id => userMap.get(id)).filter(Boolean) as UserDocument[],
        incoming: incomingIds.map(id => userMap.get(id)).filter(Boolean) as UserDocument[],
        outgoing: outgoingIds.map(id => userMap.get(id)).filter(Boolean) as UserDocument[],
    };
};

export const getNotifications = (userId: string, callback: (notifications: Notification[]) => void): (() => void) => {
    const q = query(
        collection(db, 'users', userId, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(20)
    );
    return onSnapshot(q, (querySnapshot) => {
        const notifications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        callback(notifications);
    });
};

export const markNotificationAsRead = async (userId: string, notificationId: string): Promise<void> => {
    const notifRef = doc(db, 'users', userId, 'notifications', notificationId);
    await updateDoc(notifRef, { isRead: true });
};


export {
  app, auth, db, storage, doc, getDoc, setDoc, updateDoc, addDoc, collection,
  collectionGroup, query, where, getDocs, orderBy, limit, googleProvider,
  signInWithPopup, firebaseSignOut, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail,
  Timestamp, FirebaseUser, onSnapshot, FieldValue, increment, arrayUnion,
  arrayRemove, runTransaction, writeBatch, serverTimestamp, deleteDoc
};
