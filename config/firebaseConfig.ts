// config/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

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

// On native (iOS/Android): use AsyncStorage for persistence across app restarts.
// On web: use browserLocalPersistence (getReactNativePersistence doesn't exist on web).
let auth: ReturnType<typeof getAuth>;

if (Platform.OS === 'web') {
    auth = initializeAuth(app, {
        persistence: browserLocalPersistence,
    });
} else {
    // Dynamic import so the web bundle never tries to load AsyncStorage
    const { getReactNativePersistence } = require('firebase/auth');
    const ReactNativeAsyncStorage = require('@react-native-async-storage/async-storage').default;
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
}

export { auth };
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;
