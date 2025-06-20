
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
  writeBatch
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { AppSettings } from '@/lib/appConfig';
import { initialSettings as defaultAppSettings, DEFAULT_NEWS_ITEMS, DEFAULT_ADMIN_EMAIL } from '@/lib/appConfig';


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
    isAdmin: email === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL),
    lastLogin: Timestamp.now(),
    totalWinnings: 0,
    totalSpinsPlayed: 0,
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
  const updateData = { ...data };
  if (data.hasOwnProperty('lastLogin')) {
    updateData.lastLogin = serverTimestamp() as Timestamp;
  }
  await updateDoc(userRef, updateData);
};


export const uploadProfilePhoto = async (userId: string, file: File): Promise<string> => {
  if (!file.type.startsWith("image/")) {
    throw new Error("File is not an image.");
  }
  // Use a consistent file name to overwrite previous photo
  const storageRef = ref(storage, `profile_photos/${userId}`);
  
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
};

// --- Transaction Functions ---
export interface TransactionData {
  userId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: Timestamp;
  status: 'completed' | 'pending' | 'failed';
  balanceBefore?: number;
  balanceAfter?: number;
}

export const addTransactionToFirestore = async (transactionDetails: Omit<TransactionData, 'date' | 'userId'>, userId: string): Promise<string> => {
  const dataToSave: Partial<TransactionData> & { userId: string, date: Timestamp, type: any, amount: number, description: string, status: any } = {
    userId: userId,
    type: transactionDetails.type,
    amount: transactionDetails.amount,
    description: transactionDetails.description,
    status: transactionDetails.status || 'completed', // Default to completed if not provided
    date: Timestamp.now(),
  };

  // Only include optional fields if they are provided and are numbers
  if (typeof transactionDetails.balanceBefore === 'number' && !isNaN(transactionDetails.balanceBefore)) {
    dataToSave.balanceBefore = transactionDetails.balanceBefore;
  }
  if (typeof transactionDetails.balanceAfter === 'number' && !isNaN(transactionDetails.balanceAfter)) {
    dataToSave.balanceAfter = transactionDetails.balanceAfter;
  }

  // Log the exact data being sent for debugging
  console.log("Attempting to save transaction:", JSON.stringify(dataToSave, null, 2));

  try {
    const docRef = await addDoc(collection(db, TRANSACTIONS_COLLECTION), dataToSave);
    return docRef.id;
  } catch (error) {
    console.error("TRANSACTION_SAVE_ERROR: Failed to add transaction to Firestore. Data attempted:", JSON.stringify(dataToSave, null, 2), "Error:", error);
    throw error;
  }
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
        console.error(
          "TRANSACTIONS_PAGE_ERROR: Firestore query requires an index. " +
          "This usually happens when filtering by one field (e.g., 'userId') and ordering by another (e.g., 'date'). " +
          "Please check the Firebase console (Firestore > Indexes) for a link/button to create the missing composite index. " +
          "The error message in the console might contain a direct link to create it."
        );
      } else {
        console.error("TRANSACTIONS_PAGE_ERROR: Error fetching transactions from Firestore:", error);
      }
      return []; // Return empty array on error
  }
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
      const settings = { ...defaultAppSettings, ...(fetchedData?.settings || {}) };
      const newsItems = fetchedData?.newsItems && Array.isArray(fetchedData.newsItems) && fetchedData.newsItems.length > 0
                        ? fetchedData.newsItems
                        : DEFAULT_NEWS_ITEMS;
      return { settings, newsItems };
    }
    await setDoc(configRef, defaults);
    return defaults;
  } catch (error) {
    console.error(`Error in getAppConfiguration. Using defaults. Error:`, error);
    return defaults;
  }
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
  id?: string;
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

export const approveAddFundAndUpdateBalance = async (requestId: string, userId: string, amount: number) => {
  const batch = writeBatch(db);
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User not found for balance update.");
  const userData = userSnap.data() as UserDocument;
  const currentBalance = userData.balance || 0;
  const newBalance = currentBalance + amount;
  batch.update(userRef, { balance: newBalance });
  const transactionCollRef = collection(db, TRANSACTIONS_COLLECTION);
  const transactionDocRef = doc(transactionCollRef); 
  const transactionPayload: TransactionData = {
    userId: userId,
    type: 'credit',
    amount: amount,
    description: `Balance added (Admin Approval Req ID: ${requestId.substring(0,6)})`,
    status: 'completed',
    date: Timestamp.now(),
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

export const approveWithdrawalAndUpdateBalance = async (requestId: string, userId: string, amount: number, paymentMethodDetails: string) => {
  const batch = writeBatch(db);
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) throw new Error("User not found for balance update.");
  const userData = userSnap.data() as UserDocument;
  const currentBalance = userData.balance || 0;
  if (currentBalance < amount) throw new Error("Insufficient balance for withdrawal.");
  const newBalance = currentBalance - amount;
  batch.update(userRef, { balance: newBalance });
  const transactionCollRef = collection(db, TRANSACTIONS_COLLECTION);
  const transactionDocRef = doc(transactionCollRef); 
  const transactionPayload: TransactionData = {
    userId: userId,
    type: 'debit',
    amount: amount,
    description: `Withdrawal: ${paymentMethodDetails} (Admin Approval Req ID: ${requestId.substring(0,6)})`,
    status: 'completed',
    date: Timestamp.now(),
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

export {
  app, auth, db, storage, doc, getDoc, googleProvider, signInWithPopup, firebaseSignOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile,
  Timestamp, FirebaseUser
};

    