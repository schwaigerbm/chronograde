// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDGiPUDoSNQzYA5UXRwomU3axP-tKdSN0s",
  authDomain: "chronograde-3a6f8.firebaseapp.com",
  projectId: "chronograde-3a6f8",
  storageBucket: "chronograde-3a6f8.firebasestorage.app",
  messagingSenderId: "920777032782",
  appId: "1:920777032782:web:e7505865311f96625a2f1f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();