import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; 
import { getAuth, onAuthStateChanged, User } from "firebase/auth";

const firebaseConfig = {
  
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

// Check if the app is client-side before calling getAnalytics
let analytics;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const checkAuthState = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};
