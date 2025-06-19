
import { initializeApp, getApps, getApp, type FirebaseOptions } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, // Kept for potential future re-integration, but not used by default now
  signInWithPopup, // Kept for potential future re-integration
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut 
} from "firebase/auth";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider(); // Kept for potential future re-integration

export { 
  app, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
};
export type { User as FirebaseUser } from "firebase/auth";
