// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

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

// Enable offline persistence
try {
    enableIndexedDbPersistence(db)
        .then(() => console.log("Firebase Offline Persistence enabled."))
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                console.warn("Firebase Offline Persistence failed: Multiple tabs open. Persistence can only be enabled in one tab at a time.");
            } else if (err.code === 'unimplemented') {
                console.warn("Firebase Offline Persistence failed: The current browser does not support all of the features required to enable persistence.");
            }
        });
} catch (e) {
    console.error("Error enabling Firebase offline persistence", e);
}


export { app, auth, db };
