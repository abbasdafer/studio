// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "gympass-pro",
  "appId": "1:775882125205:web:8661ca75ec61030c8b109c",
  "storageBucket": "gympass-pro.firebasestorage.app",
  "apiKey": "AIzaSyDxuZDHDVsPhhOckPaRLcvGJOKJdIouUOc",
  "authDomain": "gympass-pro.firebaseapp.com",
  "messagingSenderId": "775882125205"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth with persistence
const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});

const db = getFirestore(app);

export { app, auth, db };
