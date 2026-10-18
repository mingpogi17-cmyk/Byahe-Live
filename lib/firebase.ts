import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCoO5kVOLJd6mIqiJMkkEbsTD5JOFz1hrk",
  authDomain: "biyahe-live-davao.firebaseapp.com",
  databaseURL: "https://biyahe-live-davao-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "biyahe-live-davao",
  storageBucket: "biyahe-live-davao.firebasestorage.app",
  messagingSenderId: "751610479885",
  appId: "1:751610479885:web:5b5fb3b3e294211eb29c44",
};
// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const database = getDatabase(app);
export const auth = getAuth(app);

// Function para hintayin ang login bago mag-save ng data
export const ensureAuth = () => {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    signInAnonymously(auth)
      .then((userCredential) => {
        resolve(userCredential.user);
      })
      .catch((error) => {
        console.error("Auth error:", error);
        reject(error);
      });
  });
};
export const db = database;