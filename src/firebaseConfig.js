import { Platform } from "react-native";
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBFPo00HZR5CuLdLd7ltDQMQ8s_SwAmJVA",
  authDomain: "taskearn-e5c35.firebaseapp.com",
  projectId: "taskearn-e5c35",
  storageBucket: "taskearn-e5c35.firebasestorage.app",
  messagingSenderId: "788196387723",
  appId: "1:788196387723:web:eef2671b0a37c498385d8e"
};

// Initialize App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Safe Auth Initialization (Prevents Duplicate Auth Crashes)
let auth;

try {
  if (Platform.OS === "web") {
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    });
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  }
} catch (e) {
  // If auth is already initialized, get existing instance
  auth = getAuth(app);
}

export { auth, firebaseConfig };
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;