/**
 * Firebase Authentication service (Google Sign-In).
 *
 * Uses modular Firebase Auth SDK. All functions are no-ops when Firebase is not
 * configured, allowing the app to work fully offline.
 */

import {
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type Unsubscribe,
  type User,
} from 'firebase/auth';
import { auth } from './firebase-config';

const LOG = '[FirebaseAuth]';

/**
 * Set up the auth state listener. Returns an unsubscribe function, or null
 * if Firebase is not configured.
 */
export function initAuth(
  callback: (user: User | null) => void,
): Unsubscribe | null {
  if (!auth) {
    console.warn(LOG, 'Firebase Auth not configured');
    callback(null);
    return null;
  }

  return onAuthStateChanged(auth, callback);
}

/**
 * Sign in with Google via popup. Returns the authenticated user, or null
 * if Firebase is not configured.
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    console.error(LOG, 'Firebase Auth not configured');
    return null;
  }

  console.debug(LOG, 'Starting Google sign-in popup…');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/** Sign out the current user. */
export async function signOut(): Promise<void> {
  if (!auth) return;
  console.debug(LOG, 'Signing out…');
  await firebaseSignOut(auth);
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function, or null
 * if Firebase is not configured.
 */
export function onAuthStateChange(
  callback: (user: User | null) => void,
): Unsubscribe | null {
  if (!auth) return null;
  return onAuthStateChanged(auth, callback);
}

/** Get the currently signed-in user, or null. */
export function getCurrentUser(): User | null {
  if (!auth) return null;
  return auth.currentUser;
}
