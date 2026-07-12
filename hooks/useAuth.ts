// hooks/useAuth.ts
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';
import { auth, database } from '../config/firebaseConfig';
import { AppUser, UserRole } from '../types';

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userSnapshot = await get(ref(database, 'users/' + firebaseUser.uid));
        if (userSnapshot.exists()) {
          setUser({ ...userSnapshot.val() as AppUser });
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: 'buyer' as UserRole,
            accountStatus: 'active',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole,
    phone?: string,
  ) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const newUser: AppUser = {
      uid: userCredential.user.uid,
      email,
      displayName,
      role,
      phone: phone || '',
      accountStatus: 'active',
      verificationStatus: 'unverified',
      createdAt: Date.now(),
    };
    await set(ref(database, 'users/' + newUser.uid), newUser);
    setUser(newUser);
    return newUser;
  };

  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userSnapshot = await get(ref(database, 'users/' + userCredential.user.uid));
    if (userSnapshot.exists()) {
      const userData = userSnapshot.val() as AppUser;
      setUser(userData);
      return userData;
    }
    const fallback: AppUser = {
      uid: userCredential.user.uid,
      email: userCredential.user.email || '',
      displayName: '',
      role: 'buyer' as UserRole,
      accountStatus: 'active',
    };
    setUser(fallback);
    return fallback;
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateProfileData = async (uid: string, data: Partial<AppUser>) => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    await set(ref(database, 'users/' + uid), updatedUser);
    setUser(updatedUser);
  };

  return { user, loading, signUp, signIn, logout, updateProfileData };
}
