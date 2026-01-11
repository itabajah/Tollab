import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  Auth,
  User,
} from 'firebase/auth';
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  off,
  Database,
  DatabaseReference,
} from 'firebase/database';
import { AppData, FirebaseUser } from '@/types';

// Firebase configuration - replace with your own config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;

const initializeFirebase = (): { app: FirebaseApp; auth: Auth; database: Database } | null => {
  // Check if config is available
  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
    console.warn('Firebase config not found. Cloud sync will be disabled.');
    return null;
  }

  if (!app) {
    const apps = getApps();
    app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
  }

  if (!auth) {
    auth = getAuth(app);
  }

  if (!database) {
    database = getDatabase(app);
  }

  return { app, auth, database };
};

// Auth functions
export const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
  const firebase = initializeFirebase();
  if (!firebase) return null;

  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(firebase.auth, provider);
    return mapFirebaseUser(result.user);
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
};

export const signOut = async (): Promise<void> => {
  const firebase = initializeFirebase();
  if (!firebase) return;

  try {
    await firebaseSignOut(firebase.auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
};

export const onAuthChange = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  const firebase = initializeFirebase();
  if (!firebase) {
    callback(null);
    return () => {};
  }

  const unsubscribe = onAuthStateChanged(firebase.auth, (user) => {
    callback(user ? mapFirebaseUser(user) : null);
  });

  return unsubscribe;
};

// Map Firebase User to our FirebaseUser type
const mapFirebaseUser = (user: User): FirebaseUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
  photoURL: user.photoURL,
});

// Database functions
const getUserDataRef = (userId: string, profileId: string): DatabaseReference | null => {
  const firebase = initializeFirebase();
  if (!firebase) return null;

  return ref(firebase.database, `users/${userId}/profiles/${profileId}/data`);
};

export const saveToCloud = async (
  userId: string,
  profileId: string,
  data: AppData
): Promise<void> => {
  const dataRef = getUserDataRef(userId, profileId);
  if (!dataRef) {
    throw new Error('Firebase not initialized');
  }

  try {
    await set(dataRef, {
      ...data,
      lastModified: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving to cloud:', error);
    throw error;
  }
};

export const loadFromCloud = async (
  userId: string,
  profileId: string
): Promise<AppData | null> => {
  const dataRef = getUserDataRef(userId, profileId);
  if (!dataRef) {
    return null;
  }

  try {
    const snapshot = await get(dataRef);
    if (snapshot.exists()) {
      return snapshot.val() as AppData;
    }
    return null;
  } catch (error) {
    console.error('Error loading from cloud:', error);
    throw error;
  }
};

export const subscribeToCloudData = (
  userId: string,
  profileId: string,
  callback: (data: AppData | null) => void
): (() => void) => {
  const dataRef = getUserDataRef(userId, profileId);
  if (!dataRef) {
    callback(null);
    return () => {};
  }

  const handleValue = (snapshot: { exists: () => boolean; val: () => AppData }) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback(null);
    }
  };

  onValue(dataRef, handleValue);

  return () => {
    off(dataRef, 'value', handleValue);
  };
};

// Merge conflict resolution
export const mergeData = (localData: AppData, cloudData: AppData): AppData => {
  const localTime = new Date(localData.lastModified).getTime();
  const cloudTime = new Date(cloudData.lastModified).getTime();

  // Simple last-write-wins strategy
  if (cloudTime > localTime) {
    return cloudData;
  }

  return localData;
};

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return !!(firebaseConfig.apiKey && firebaseConfig.databaseURL);
};
