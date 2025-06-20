
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider,
  signInWithPopup, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut 
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
  writeBatch
} from "firebase/firestore";
import type { AppSettings, NewsItem } from '@/lib/appConfig'; // Assuming NewsItem type if you have one, else string[]
import { initialSettings as defaultAppSettings, DEFAULT_NEWS_ITEMS } from '@/lib/appConfig';


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

const googleProvider = new GoogleAuthProvider();

// Firestore Collection Names
const USERS_COLLECTION = 'users';
const TRANSACTIONS_COLLECTION = 'transactions';
const WITHDRAWAL_REQUESTS_COLLECTION = 'withdrawalRequests';
const ADD_FUND_REQUESTS_COLLECTION = 'addFundRequests';
const APP_CONFIG_COLLECTION = 'appConfiguration';
const APP_CONFIG_DOC_ID = 'main';


// --- User Functions ---
export interface UserDocument {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  balance: number;
  spinsAvailable: number;
  dailyPaidSpinsUsed: number;
  lastPaidSpinDate: string; // YYYY-MM-DD
  totalWinnings?: number;
  totalSpinsPlayed?: number;
  isAdmin?: boolean;
  lastLogin?: Timestamp;
  upiIdForWithdrawal?: string;
  bankDetailsForWithdrawal?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
  };
}

export const createUserData = async (
  userId: string, 
  email: string | null, 
  displayName: string | null, 
  photoURL: string | null,
  initialAppSettings: AppSettings
): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userData: UserDocument = {
    uid: userId,
    email,
    displayName,
    photoURL,
    createdAt: Timestamp.now(),
    balance: initialAppSettings.initialBalanceForNewUsers,
    spinsAvailable: initialAppSettings.maxSpinsInBundle,
    dailyPaidSpinsUsed: 0,
    lastPaidSpinDate: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD format
    isAdmin: email === process.env.NEXT_PUBLIC_ADMIN_EMAIL || email === "jameafaizanrasool@gmail.com", // Example admin check
    lastLogin: Timestamp.now(),
  };
  await setDoc(userRef, userData);
};

export const getUserData = async (userId: string): Promise<UserDocument | null> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  const docSnap = await getDoc(userRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserDocument;
  }
  return null;
};

export const updateUserData = async (userId: string, data: Partial<UserDocument>): Promise<void> => {
  const userRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userRef, { ...data, lastLogin: serverTimestamp() });
};

// --- Transaction Functions ---
export interface TransactionData {
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: Timestamp;
  status: 'completed' | 'pending' | 'failed';
  balanceBefore?: number; // Optional, but good for auditing
  balanceAfter?: number;  // Optional
}

export const addTransactionToFirestore = async (transactionData: Omit<TransactionData, 'date' | 'userId'>, userId: string): Promise<string> => {
  const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), {
    ...transactionData,
    userId,
    date: Timestamp.now(),
  });
  return docRef.id;
};

export const getTransactionsFromFirestore = async (userId: string, count: number = 20): Promise<TransactionData[]> => {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION), 
    where("userId", "==", userId), 
    orderBy("date", "desc"), 
    limit(count)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as TransactionData));
};

// --- App Configuration Functions ---
export interface AppConfiguration {
  settings: AppSettings;
  newsItems: string[]; // Or NewsItem[] if you define a specific type
}

export const getAppConfiguration = async (): Promise<AppConfiguration> => {
  const configRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
  const docSnap = await getDoc(configRef);
  if (docSnap.exists()) {
    return docSnap.data() as AppConfiguration;
  }
  // If not exists, create with defaults
  const defaultConfig: AppConfiguration = {
    settings: defaultAppSettings,
    newsItems: DEFAULT_NEWS_ITEMS,
  };
  await setDoc(configRef, defaultConfig);
  return defaultConfig;
};

export const saveAppSettingsToFirestore = async (settings: AppSettings): Promise<void> => {
  const configRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
  await updateDoc(configRef, { settings });
};

export const saveNewsItemsToFirestore = async (newsItems: string[]): Promise<void> => {
  const configRef = doc(db, APP_CONFIG_COLLECTION, APP_CONFIG_DOC_ID);
  await updateDoc(configRef, { newsItems });
};


// --- Withdrawal Request Functions ---
export interface WithdrawalRequestData {
  userId: string;
  userEmail: string;
  amount: number;
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
  transactionId?: string; // Firestore ID of the debit transaction after approval
}

export const createWithdrawalRequest = async (data: Omit<WithdrawalRequestData, 'requestDate' | 'status'>): Promise<string> => {
  const docRef = await addDoc(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), {
    ...data,
    requestDate: Timestamp.now(),
    status: "pending",
  });
  return docRef.id;
};

export const getWithdrawalRequests = async (status?: WithdrawalRequestData['status']): Promise<(WithdrawalRequestData & {id: string})[]> => {
  let q;
  if (status) {
    q = query(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), where("status", "==", status), orderBy("requestDate", "desc"));
  } else {
    q = query(collection(db, WITHDRAWAL_REQUESTS_COLLECTION), orderBy("requestDate", "desc"));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (WithdrawalRequestData & {id: string})));
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
  userId: string;
  userEmail: string;
  amount: number;
  paymentReference: string; // e.g., UPI transaction ID or screenshot identifier
  requestDate: Timestamp;
  status: "pending" | "approved" | "rejected";
  approvedDate?: Timestamp;
  adminNotes?: string;
  transactionId?: string; // Firestore ID of the credit transaction after approval
}

export const createAddFundRequest = async (data: Omit<AddFundRequestData, 'requestDate' | 'status'>): Promise<string> => {
  const docRef = await addDoc(collection(db, ADD_FUND_REQUESTS_COLLECTION), {
    ...data,
    requestDate: Timestamp.now(),
    status: "pending",
  });
  return docRef.id;
};

export const getAddFundRequests = async (status?: AddFundRequestData['status']): Promise<(AddFundRequestData & {id: string})[]> => {
  let q;
  if (status) {
    q = query(collection(db, ADD_FUND_REQUESTS_COLLECTION), where("status", "==", status), orderBy("requestDate", "desc"));
  } else {
    q = query(collection(db, ADD_FUND_REQUESTS_COLLECTION), orderBy("requestDate", "desc"));
  }
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (AddFundRequestData & {id: string})));
};

export const updateAddFundRequestStatus = async (requestId: string, status: AddFundRequestData['status'], adminNotes?: string): Promise<void> => {
  const requestRef = doc(db, ADD_FUND_REQUESTS_COLLECTION, requestId);
  const updateData: Partial<AddFundRequestData> = { status };
  if (adminNotes) updateData.adminNotes = adminNotes;
  if (status === "approved") updateData.approvedDate = Timestamp.now();
  await updateDoc(requestRef, updateData);
};

// Helper to approve add fund and update balance
export const approveAddFundAndUpdateBalance = async (requestId: string, userId: string, amount: number) => {
  const batch = writeBatch(db);

  // 1. Update user balance
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User not found for balance update.");
  const currentBalance = userSnap.data()?.balance || 0;
  const newBalance = currentBalance + amount;
  batch.update(userRef, { balance: newBalance });

  // 2. Add transaction record
  const transactionCollRef = collection(db, TRANSACTIONS_COLLECTION);
  const transactionDocRef = doc(transactionCollRef); // Create a new doc ref for transaction
  batch.set(transactionDocRef, {
    userId,
    type: 'credit',
    amount,
    description: `Balance added via UPI (Req ID: ${requestId.substring(0,6)})`,
    status: 'completed',
    date: Timestamp.now(),
    balanceBefore: currentBalance,
    balanceAfter: newBalance
  });
  
  // 3. Update add fund request status
  const requestRef = doc(db, ADD_FUND_REQUESTS_COLLECTION, requestId);
  batch.update(requestRef, { 
    status: "approved", 
    approvedDate: Timestamp.now(),
    transactionId: transactionDocRef.id // Store the transaction ID
  });

  await batch.commit();
};

// Helper to approve withdrawal and update balance
export const approveWithdrawalAndUpdateBalance = async (requestId: string, userId: string, amount: number, paymentMethodDetails: string) => {
  const batch = writeBatch(db);

  // 1. Update user balance
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User not found for balance update.");
  const currentBalance = userSnap.data()?.balance || 0;
  if (currentBalance < amount) throw new Error("Insufficient balance for withdrawal.");
  const newBalance = currentBalance - amount;
  batch.update(userRef, { balance: newBalance });

  // 2. Add transaction record
  const transactionCollRef = collection(db, TRANSACTIONS_COLLECTION);
  const transactionDocRef = doc(transactionCollRef); // Create a new doc ref for transaction
  batch.set(transactionDocRef, {
    userId,
    type: 'debit',
    amount,
    description: `Withdrawal: ${paymentMethodDetails} (Req ID: ${requestId.substring(0,6)})`,
    status: 'completed', // Or 'processed' if there's another step
    date: Timestamp.now(),
    balanceBefore: currentBalance,
    balanceAfter: newBalance
  });
  
  // 3. Update withdrawal request status
  const requestRef = doc(db, WITHDRAWAL_REQUESTS_COLLECTION, requestId);
  batch.update(requestRef, { 
    status: "processed", // Or "approved" if processing is the final step by admin
    processedDate: Timestamp.now(),
    transactionId: transactionDocRef.id // Store the transaction ID
  });

  await batch.commit();
};


export { 
  app, 
  auth, 
  db,
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  Timestamp
};
export type { User as FirebaseUser } from "firebase/auth";

