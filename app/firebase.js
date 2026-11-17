
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSfINgt1hU4ZmyMEpUnIvXc3rbhpLTqas",
  authDomain: "raw-materials-961ad.firebaseapp.com",
  projectId: "raw-materials-961ad",
  storageBucket: "raw-materials-961ad.firebasestorage.app",
  messagingSenderId: "140233654453",
  appId: "1:140233654453:web:b2941fde772cfbae7abefc",
  measurementId: "G-3HGCS68WEB"
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
