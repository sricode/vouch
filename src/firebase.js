// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// Optional: Keep analytics if you want
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
const analytics = getAnalytics(app);

// Export the services so other files can use them
export { db, auth, analytics };
export default app;
