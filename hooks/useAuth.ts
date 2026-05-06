// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { ref, get, set } from 'firebase/database';
import { auth, database } from '../config/firebaseConfig';
import { AppUser, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get extra user data from Realtime Database
        const userSnapshot = await get(ref(database, 'users/' + firebaseUser.uid));
        if (userSnapshot.exists()) {
          setUser({ ...userSnapshot.val() as AppUser });
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: 'buyer' as UserRole, // default
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string, role: UserRole) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser: AppUser = {
      uid: userCredential.user.uid,
      email,
      displayName,
      role,
    };

    // Save to RTDB
    await set(ref(database, 'users/' + newUser.uid), newUser);
    setUser(newUser);
    return newUser;
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return { user, loading, signUp, signIn, logout };
}
