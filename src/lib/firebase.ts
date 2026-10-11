import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
  collection,
  onSnapshot,
  setDoc,
  getDocs,
  disableNetwork,
  enableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Reduce console noise from internal Firestore retry backoffs
try {
  setLogLevel('error');
} catch {}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore strictly with the provisioned database ID
// CRITICAL per firebase skill: The app will fail if firestoreDatabaseId is not specified
export const activeDatabaseId = firebaseConfig.firestoreDatabaseId;

// Storage key and helpers for Firestore free tier quota management
export const QUOTA_STORAGE_KEY = 'aushadhix_firestore_quota_exhausted';
const QUOTA_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export function isFirestoreQuotaExhausted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    if (!raw) return false;
    const timestamp = parseInt(raw, 10);
    if (isNaN(timestamp)) return false;
    // Check if cooldown has elapsed (quota resets daily on Google Cloud)
    if (Date.now() - timestamp > QUOTA_COOLDOWN_MS) {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markFirestoreQuotaExhausted(reason?: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUOTA_STORAGE_KEY, Date.now().toString());
    console.warn(
      `[Firestore] Daily write quota reached for free tier (${reason || 'Free daily write units per project'}). Switched to offline PostgreSQL local database.`
    );
    // Pause network calls to prevent repeated backoff retries and console errors
    disableNetwork(db).catch(() => {});
    window.dispatchEvent(new CustomEvent('firestore-quota-status', { detail: { exhausted: true, reason } }));
  } catch {}
}

export async function tryReenableFirestoreNetwork(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(QUOTA_STORAGE_KEY);
    }
    await enableNetwork(db);
    const ok = await testFirestoreConnection();
    if (ok) {
      window.dispatchEvent(new CustomEvent('firestore-quota-status', { detail: { exhausted: false } }));
    }
    return ok;
  } catch (e: any) {
    markFirestoreQuotaExhausted(e?.message || String(e));
    return false;
  }
}

// Clear any obsolete local override that could point to non-existent (default) database
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('aushadhix_firestore_db_id');
    if (stored && stored !== activeDatabaseId) {
      localStorage.setItem('aushadhix_firestore_db_id', activeDatabaseId);
    }
  } catch {}
}

let firestoreInstance: ReturnType<typeof getFirestore>;

try {
  firestoreInstance = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalForceLongPolling: true,
    },
    activeDatabaseId
  );
} catch (e) {
  try {
    firestoreInstance = initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
      },
      activeDatabaseId
    );
  } catch (e2) {
    firestoreInstance = getFirestore(app, activeDatabaseId);
  }
}

export const db = firestoreInstance;

// If quota is already flagged as exhausted, disable network immediately to prevent backoff delay loop
if (typeof window !== 'undefined' && isFirestoreQuotaExhausted()) {
  disableNetwork(db).catch(() => {});
}

// Connection test helper following skill specification
export async function testFirestoreConnection(): Promise<boolean> {
  if (isFirestoreQuotaExhausted()) {
    console.warn('[Firestore] Operating in local offline mode (Cloud quota limit reached for today).');
    return false;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('[Firestore] Connected successfully to Cloud Firestore.');
    return true;
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const errCode = error?.code || '';
    if (
      errCode === 'resource-exhausted' ||
      errMsg.includes('Quota limit exceeded') ||
      errMsg.includes('resource-exhausted')
    ) {
      markFirestoreQuotaExhausted('Free daily write units per project exceeded');
      return false;
    }
    if (
      error instanceof Error &&
      (errMsg.includes('the client is offline') ||
        errMsg.includes('Could not reach Cloud Firestore backend') ||
        errMsg.includes('unavailable'))
    ) {
      console.warn('[Firestore] Operating in offline mode or network delayed.');
      return false;
    }
    // Document not existing still means server is reachable
    console.log('[Firestore] Handshake verified with Cloud Firestore.');
    return true;
  }
}

export { firebaseConfig, app };

