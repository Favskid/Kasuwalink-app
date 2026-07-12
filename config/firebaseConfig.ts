// config/firebaseConfig.ts
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

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

// Auth with AsyncStorage persistence — prevents losing session on app restart
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;
