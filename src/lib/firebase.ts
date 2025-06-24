
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  type User as FirebaseUser
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
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
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { AppSettings, AppConfiguration as AppConfigData, WheelTierConfig } from '@/lib/appConfig'; // Renamed to avoid conflict
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

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const googleProvider = new GoogleAuthProvider();

// Firestore Collection Names
const USERS_COLLECTION = 'users';
const TRANSACTIONS_COLLECTION = 'transactions';
const WITHDRAWAL_REQUESTS_COLLECTION = 'withdrawalRequests';
const ADD_FUND_REQUESTS_COLLECTION = 'addFundRequests';
const APP_CONFIG_COLLECTION = 'appConfiguration';
const APP_CONFIG_DOC_ID = 'main';
const SUPPORT_TICKETS_COLLECTION = 'supportTickets';
const ACTIVITY_LOGS_COLLECTION = 'activityLogs';
const FRAUD_ALERTS_COLLECTION = 'fraudAlerts';
const SYSTEM_STATS_COLLECTION = 'systemStats';
const GLOBAL_STATS_DOC_ID = 'global';


// --- User Functions ---
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
  totalDeposited?: number;
  totalWithdrawn?: number;
  isAdmin?: boolean;
  isBlocked?: boolean;
  lastActive?: Timestamp;
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

  // Initialize balances for all tiers
  const initialBalances: { [tierId: string]: number } = {};
  let baseInitialBalance = initialAppSettings.initialBalanceForNewUsers;
  
  // Add referral bonus to the initial balance if referred
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
    isAdmin: adminEmails.includes(userEmail),
    isBlocked: false,
    lastActive: Timestamp.now(),
    totalWinnings: 0,
    totalSpinsPlayed: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    toursCompleted: {
      welcome: false,
      gamePage: false,
      profilePage: false,
    },
    referralCode: userId, // Use UID as the referral code
    referrals: [],
    referralEarnings: 0,
    ...(referredBy && { referredBy }), // Conditionally add referredBy field
  };
  await setDoc(userRef, userData);
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
  await updateDoc(userRef, data);
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
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (UserDocument & {id: string})));
};

export const getLeaderboardUsers = async (count: number = 20): Promise<UserDocument[]> => {
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
        wheelConfigs: mergedWheelConfigs
      };

      const newsItems = fetchedData?.newsItems && Array.isArray(fetchedData.newsItems) && fetchedData.newsItems.length > 0
                        ? fetchedData.newsItems
                        : DEFAULT_NEWS_ITEMS;

      return { settings, newsItems };
    }
    // If config doc doesn't exist, create it with the default values
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
  await setDoc(configRef, config, { merge: true }); // Use set with merge to be safe
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
}

export const createWithdrawalRequest = async (data: Omit<WithdrawalRequestData, 'requestDate' | 'status' | 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), {
    ...data,
    requestDate: Timestamp.now(),
    status: "pending",
  });
  return docRef.id;
};

export const getWithdrawalRequests = async (statusFilter?: WithdrawalRequestData['status']): Promise<(WithdrawalRequestData & {id: string})[]> => {
  let q;
  if (statusFilter) {
    q = query(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), where("status", "==", statusFilter), orderBy("requestDate", "desc"));
  } else {
    q = query(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), orderBy("requestDate", "desc"));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (WithdrawalRequestData & {id: string})));
};

export const updateWithdrawalRequestStatus = async (requestId: string, status: WithdrawalRequestData['status'], adminNotes?: string): Promise<void> => {
  const requestRef = doc(db, WITHDRAWAL_REQUESTS_COLLECTION, requestId);
  const updateData: Partial<WithdrawalRequestData> = { status };
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
}

export const createAddFundRequest = async (data: Omit<AddFundRequestData, 'requestDate' | 'status' | 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, ADD_FUND_REQUESTS_COLLECTION), {
    ...data,
    requestDate: Timestamp.now(),
    status: "pending",
  });
  return docRef.id;
};

export const getAddFundRequests = async (statusFilter?: AddFundRequestData['status']): Promise<(AddFundRequestData & {id: string})[]> => {
  let q;
  if (statusFilter) {
    q = query(collection(db, ADD_FUND_REQUESTS_COLLECTION), where("status", "==", statusFilter), orderBy("requestDate", "desc"));
  } else {
    q = query(collection(db, ADD_FUND_REQUESTS_COLLECTION), orderBy("requestDate", "desc"));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (AddFundRequestData & {id: string})));
};

export const updateAddFundRequestStatus = async (requestId: string, status: AddFundRequestData['status'], adminNotes?: string): Promise<void> => {
  const requestRef = doc(db, ADD_FUND_REQUESTS_COLLECTION, requestId);
  const updateData: Partial<AddFundRequestData> = { status };
  if (adminNotes) updateData.adminNotes = adminNotes;
  if (status === "approved") updateData.approvedDate = Timestamp.now();
  await updateDoc(requestRef, updateData);
};

export const approveAddFundAndUpdateBalance = async (requestId: string, userId: string, amount: number, tierId: string) => {
  const effectiveTierId = tierId || 'little';
  const batch = writeBatch(db);
  const userRef = doc(db, USERS_COLLECTION, userId);
  const globalStatsRef = doc(db, SYSTEM_STATS_COLLECTION, GLOBAL_STATS_DOC_ID);

  const [userSnap, appConfig] = await Promise.all([
    getDoc(userRef),
    getAppConfiguration()
  ]);

  if (!userSnap.exists()) throw new Error("User not found for balance update.");
  const userData = userSnap.data() as UserDocument;
  
  const isFirstDeposit = (userData.totalDeposited || 0) === 0;

  const userBalances = userData.balances || {};
  const currentBalance = userBalances[effectiveTierId] || 0;
  const newBalance = currentBalance + amount;
  const totalDeposited = (userData.totalDeposited || 0) + amount;
  
  batch.update(userRef, { 
    [`balances.${effectiveTierId}`]: newBalance,
    totalDeposited: totalDeposited
  });
  
  batch.update(globalStatsRef, { totalDeposited: increment(amount) });
  
  // Referral logic: If it's the first deposit and the user was referred, reward the referrer.
  if (isFirstDeposit && userData.referredBy) {
    const referrerRef = doc(db, USERS_COLLECTION, userData.referredBy);
    const referrerSnap = await getDoc(referrerRef);
    if (referrerSnap.exists()) {
        const bonus = appConfig.settings.referralBonusForReferrer;
        const referrerData = referrerSnap.data() as UserDocument;
        const referrerLittleTierBalance = referrerData.balances?.little || 0;

        batch.update(referrerRef, {
            'balances.little': referrerLittleTierBalance + bonus,
            referralEarnings: increment(bonus)
        });

        // Add a transaction for the referrer's bonus
        const referrerTransactionDocRef = doc(collection(db, TRANSACTIONS_COLLECTION));
        const referrerTransactionPayload: TransactionData = {
            userId: userData.referredBy,
            userEmail: referrerData.email,
            type: 'credit',
            amount: bonus,
            description: `Referral bonus from ${userData.displayName}`,
            status: 'completed',
            date: Timestamp.now(),
            tierId: 'little',
            balanceBefore: referrerLittleTierBalance,
            balanceAfter: referrerLittleTierBalance + bonus
        };
        batch.set(referrerTransactionDocRef, referrerTransactionPayload);
    }
  }

  const transactionCollRef = collection(db, TRANSACTIONS_COLLECTION);
  const transactionDocRef = doc(transactionCollRef); 

  const tierName = appConfig.settings.wheelConfigs[effectiveTierId]?.name || 'Unknown Tier';
  
  const transactionPayload: TransactionData = {
    userId: userId,
    userEmail: userData.email,
    type: 'credit',
    amount: amount,
    description: `Balance added to ${tierName} (Req ID: ${requestId.substring(0,6)})`,
    status: 'completed',
    date: Timestamp.now(),
    tierId: effectiveTierId,
    balanceBefore: currentBalance,
    balanceAfter: newBalance
  };
  batch.set(transactionDocRef, transactionPayload);
  
  const requestRef = doc(db, ADD_FUND_REQUESTS_COLLECTION, requestId);
  batch.update(requestRef, {
    status: "approved", approvedDate: Timestamp.now(), transactionId: transactionDocRef.id
  } as Partial<AddFundRequestData>);
  
  await batch.commit();
};

export const approveWithdrawalAndUpdateBalance = async (requestId: string, userId: string, amount: number, tierId: string, paymentMethodDetails: string) => {
  const effectiveTierId = tierId || 'little';
  const batch = writeBatch(db);
  const userRef = doc(db, USERS_COLLECTION, userId);
  const globalStatsRef = doc(db, SYSTEM_STATS_COLLECTION, GLOBAL_STATS_DOC_ID);

  const [userSnap, appConfig] = await Promise.all([
    getDoc(userRef),
    getAppConfiguration()
  ]);

  if (!userSnap.exists()) throw new Error("User not found for balance update.");
  
  const userData = userSnap.data() as UserDocument;
  const userBalances = (userData.balances || {});
  const currentBalance = userBalances[effectiveTierId] || 0;
  
  if (currentBalance < amount) throw new Error("Insufficient balance for withdrawal.");
  
  const newBalance = currentBalance - amount;
  const totalWithdrawn = (userData.totalWithdrawn || 0) + amount;
  const gstAmount = amount * 0.02;
  const netPayableAmount = amount - gstAmount;
  
  batch.update(userRef, { 
    [`balances.${effectiveTierId}`]: newBalance,
    totalWithdrawn: totalWithdrawn 
  });
  
  batch.update(globalStatsRef, {
    totalWithdrawn: increment(amount),
    totalGstCollected: increment(gstAmount),
  });

  const transactionCollRef = collection(db, TRANSACTIONS_COLLECTION);
  const transactionDocRef = doc(transactionCollRef); 

  const tierName = appConfig.settings.wheelConfigs[effectiveTierId]?.name || 'Unknown Tier';
  
  const transactionPayload: TransactionData = {
    userId: userId,
    userEmail: userData.email,
    type: 'debit',
    amount: amount,
    description: `Withdrawal from ${tierName}. Gross: ₹${amount.toFixed(2)}, GST: -₹${gstAmount.toFixed(2)}. (Req ID: ${requestId.substring(0,6)})`,
    status: 'completed',
    date: Timestamp.now(),
    tierId: effectiveTierId,
    balanceBefore: currentBalance,
    balanceAfter: newBalance
  };
  batch.set(transactionDocRef, transactionPayload);

  const requestRef = doc(db, WITHDRAWAL_REQUESTS_COLLECTION, requestId);
  batch.update(requestRef, {
    status: "processed", processedDate: Timestamp.now(), transactionId: transactionDocRef.id
  } as Partial<WithdrawalRequestData>);

  await batch.commit();
};

// --- Support Ticket Functions ---
export interface SupportTicketData {
  id?: string;
  userId: string;
  userEmail: string;
  description: string;
  screenshotURL?: string;
  status: 'open' | 'resolved';
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
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

export const createSupportTicket = async (data: { userId: string; userEmail: string; description: string; screenshotFile: File | null; }): Promise<void> => {
    const ticketRef = doc(collection(db, SUPPORT_TICKETS_COLLECTION));
    const newTicketData: Omit<SupportTicketData, 'id'> = {
        userId: data.userId,
        userEmail: data.userEmail,
        description: data.description,
        status: 'open',
        createdAt: Timestamp.now(),
    };
    
    await setDoc(ticketRef, newTicketData);

    if (data.screenshotFile) {
        const screenshotURL = await uploadSupportScreenshot(ticketRef.id, data.screenshotFile);
        await updateDoc(ticketRef, { screenshotURL: screenshotURL });
    }
};

export const getSupportTickets = async (statusFilter?: SupportTicketData['status']): Promise<(SupportTicketData & {id: string})[]> => {
    let q;
    if (statusFilter) {
      q = query(collection(db, SUPPORT_TICKETS_COLLECTION), where("status", "==", statusFilter), orderBy("createdAt", "desc"));
    } else {
      q = query(collection(db, SUPPORT_TICKETS_COLLECTION), orderBy("createdAt", "desc"));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as (SupportTicketData & {id: string})));
};

export const updateSupportTicketStatus = async (ticketId: string, status: SupportTicketData['status']): Promise<void> => {
    const ticketRef = doc(db, SUPPORT_TICKETS_COLLECTION, ticketId);
    const updateData: Partial<SupportTicketData> = { status };
    if (status === "resolved") {
        updateData.resolvedAt = Timestamp.now();
    }
    await updateDoc(ticketRef, updateData);
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
    // If the document doesn't exist, create it.
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


export {
  app, auth, db, storage, doc, getDoc, updateDoc, googleProvider, signInWithPopup, firebaseSignOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  Timestamp, FirebaseUser, onSnapshot, FieldValue, increment, arrayUnion
};

