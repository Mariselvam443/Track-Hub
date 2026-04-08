import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
