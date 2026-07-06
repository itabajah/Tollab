import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
} from 'firebase/auth'
import type { FirebaseApp } from 'firebase/app'

export interface AuthUser {
  uid: string
  email: string | null
}

/** Auth abstraction so the app never imports the Firebase SDK directly. */
export interface AuthService {
  currentUser(): AuthUser | null
  onChange(callback: (user: AuthUser | null) => void): () => void
  signIn(): Promise<void>
  signOut(): Promise<void>
}

function toAuthUser(user: { uid: string; email: string | null } | null): AuthUser | null {
  return user ? { uid: user.uid, email: user.email } : null
}

export function createFirebaseAuth(app: FirebaseApp): AuthService {
  const auth: Auth = getAuth(app)
  return {
    currentUser: () => toAuthUser(auth.currentUser),
    onChange: (callback) => onAuthStateChanged(auth, (user) => callback(toAuthUser(user))),
    signIn: async () => {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      await signInWithPopup(auth, provider)
    },
    signOut: async () => {
      await signOut(auth)
    },
  }
}
