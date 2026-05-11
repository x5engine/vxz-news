import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDKay6spSzrbazUrEvfjJrIUHFL1i0rk0w",
    authDomain: "vxz-news.firebaseapp.com",
    projectId: "vxz-news",
    storageBucket: "vxz-news.firebasestorage.app",
    messagingSenderId: "524394886783",
    appId: "1:524394886783:web:6dbe2413286ff62818314a",
    measurementId: "G-DM9SQG7XPH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence with unlimited cache for better performance and offline browsing
// This allows users to browse previously loaded news even without internet connection
enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
}).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('⚠️ VXZ Offline Mode: Multiple tabs detected. Persistence disabled.');
    } else if (err.code === 'unimplemented') {
        // Browser doesn't support persistence
        console.warn('⚠️ VXZ Offline Mode: Not supported in this browser.');
    } else {
        console.error('❌ VXZ Offline Mode Error:', err);
    }
});

console.log('✅ VXZ Firebase initialized with offline persistence');