// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration - using your actual values for browser development
const firebaseConfig = {
  apiKey: "AIzaSyB1izWqHKu1wHZcXWuzM-ntDoT85UHT2Us",
  authDomain: "appraisalstudio-13aeb.firebaseapp.com",
  projectId: "appraisalstudio-13aeb",
  storageBucket: "appraisalstudio-13aeb.firebasestorage.app",
  messagingSenderId: "302869143376",
  appId: "1:302869143376:web:85ebf513c220c47a929655"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Only initialize analytics if in production
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;

// Debug log for development
console.log('Firebase initialized for project:', firebaseConfig.projectId);
