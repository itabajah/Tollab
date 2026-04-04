/**
 * Firebase configuration and initialization.
 *
 * Loads config from Vite environment variables (import.meta.env.VITE_FIREBASE_*).
 * If any required variable is missing, Firebase is not initialized and the app
 * continues to work in offline-only mode.
 */

import { type FirebaseApp, initializeApp } from 'firebase/app';
import { type Auth, getAuth } from 'firebase/auth';
import { type Database, getDatabase } from 'firebase/database';

const LOG = '[Firebase]';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

function loadConfig(): FirebaseConfig | null {
  const apiKey = import.meta.env['VITE_FIREBASE_API_KEY'] as string | undefined;
  const authDomain = import.meta.env['VITE_FIREBASE_AUTH_DOMAIN'] as
    | string
    | undefined;
  const databaseURL = import.meta.env['VITE_FIREBASE_DATABASE_URL'] as
    | string
    | undefined;
  const projectId = import.meta.env['VITE_FIREBASE_PROJECT_ID'] as
    | string
    | undefined;
  const appId = import.meta.env['VITE_FIREBASE_APP_ID'] as string | undefined;

  if (!apiKey || !authDomain || !databaseURL || !projectId || !appId) {
    console.warn(
      LOG,
      'Missing Firebase config. App will run in offline mode.',
    );
    return null;
  }

  return {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    storageBucket: import.meta.env['VITE_FIREBASE_STORAGE_BUCKET'] as
      | string
      | undefined,
    messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGING_SENDER_ID'] as
      | string
      | undefined,
    appId,
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;

const config = loadConfig();

if (config) {
  try {
    app = initializeApp(config);
    auth = getAuth(app);
    database = getDatabase(app);
    console.debug(LOG, 'Initialized successfully');
  } catch (error) {
    console.error(LOG, 'Initialization failed:', error);
  }
}

/** Whether Firebase was configured and initialized successfully. */
export const isFirebaseConfigured: boolean = app !== null;

export { app, auth, database };
