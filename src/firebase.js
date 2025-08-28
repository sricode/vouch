// src/firebase.js - Fixed version without duplicate analytics
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUZ_Lp5b-MGUETRvsNqlGGWTWkMXXhJqM",
  authDomain: "vouch-81f77.firebaseapp.com",
  projectId: "vouch-81f77",
  storageBucket: "vouch-81f77.firebasestorage.app",
  messagingSenderId: "622057362082",
  appId: "1:622057362082:web:7e621bd4e34614f83afdfb",
  measurementId: "G-HW2GYT72HZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);

// Initialize analytics only in production and if supported
let analytics = null;
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  try {
    analytics = getAnalytics(app);
    console.log('📈 Firebase Analytics initialized');
  } catch (error) {
    console.warn('Analytics initialization failed:', error);
  }
}

// Export the services so other files can use them
export { db, auth, analytics };
export default app;
