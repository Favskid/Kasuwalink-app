// // config/firebaseConfig.ts
// import { initializeApp } from 'firebase/app';
// import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
// import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// import { getFirestore } from 'firebase/firestore';
// import { getStorage } from 'firebase/storage';

// // FIREBASE CONFIG HERE
// const firebaseConfig = {
//     apiKey: "AIzaSyDvvxtsmcCFOKoNfXtVPhQc5tgrzXvxPSk",
//     authDomain: "kawasulink.firebaseapp.com",
//     projectId: "kawasulink",
//     storageBucket: "kawasulink.firebasestorage.app",
//     messagingSenderId: "238311024632",
//     appId: "1:238311024632:web:7a498b78a78cc25f52d80d",
//     measurementId: "G-H60D6S2XRT"
// };

// const app = initializeApp(firebaseConfig);

// // Better Auth with persistence (fixes the warning)
// export const auth = initializeAuth(app, {
//     persistence: getReactNativePersistence(ReactNativeAsyncStorage),
// });

// export const db = getFirestore(app);
// export const storage = getStorage(app);

// export default app;

// config/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Your Firebase config (copy from Project Settings → General)
const firebaseConfig = {
    apiKey: "AIzaSyDvvxtsmcCFOKoNfXtVPhQc5tgrzXvxPSk",
    authDomain: "kawasulink.firebaseapp.com",
    databaseURL: "https://kawasulink-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kawasulink",
    storageBucket: "kawasulink.firebasestorage.app",
    messagingSenderId: "238311024632",
    appId: "1:238311024632:web:7a498b78a78cc25f52d80d",
    measurementId: "G-H60D6S2XRT"
};

const app = initializeApp(firebaseConfig);

// Auth (using standard getAuth, persistence might need to be configured differently if needed, but standard works for most setups)
export const auth = getAuth(app);

export const database = getDatabase(app);   // Realtime Database
export const storage = getStorage(app);

export default app;