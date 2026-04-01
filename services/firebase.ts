import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "commitclub-10b9b.firebaseapp.com",
  projectId: "commitclub-10b9b",
  storageBucket: "commitclub-10b9b.firebasestorage.app",
  messagingSenderId: "948326198173",
  appId: "1:948326198173:web:2dcb7eb8cee34582351d74",
  measurementId: "G-Y98Q37C81M",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
