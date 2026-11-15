import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { extractCustomDomainHostname } from './utils/recapEngine';

const envCustomAuthDomain =
  typeof import.meta !== 'undefined' && import.meta.env
    ? extractCustomDomainHostname(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN)
    : null;

const defaultApp: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      ...firebaseConfig,
      authDomain: envCustomAuthDomain || firebaseConfig.authDomain
    });

export const firebaseAuth: Auth = getAuth(defaultApp);
setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {});

let activeFirebaseAuth: Auth = firebaseAuth;

function getOrCreateCustomDomainAuth(customDomain: string): Auth {
  const cleanDomain = extractCustomDomainHostname(customDomain);
  if (!cleanDomain || cleanDomain === firebaseConfig.authDomain) {
    return firebaseAuth;
  }
  const appName = `custom-auth-${cleanDomain}`;
  let customApp: FirebaseApp;
  try {
    customApp = getApp(appName);
  } catch {
    customApp = initializeApp(
      {
        ...firebaseConfig,
        authDomain: cleanDomain
      },
      appName
    );
  }
  const customAuth = getAuth(customApp);
  setPersistence(customAuth, browserLocalPersistence).catch(() => {});
  return customAuth;
}

/**
 * Checks with the backend whether the current custom domain (e.g. `ttakb.site`) has
 * `https://<domain>/__/auth/handler` registered in Google Cloud Console's Authorized redirect URIs.
 * As soon as it is registered, switches `activeFirebaseAuth` to use `authDomain: <domain>` so
 * Google Sign-In displays "to continue to ttakb.site" instead of "brilliant-turbine-fdzcr.firebaseapp.com".
 */
export async function syncCustomAuthDomainStatus(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (envCustomAuthDomain) {
    activeFirebaseAuth = getOrCreateCustomDomainAuth(envCustomAuthDomain);
    return;
  }
  const hostCustomDomain = extractCustomDomainHostname(window.location.hostname);
  try {
    const query = hostCustomDomain ? `?domain=${encodeURIComponent(hostCustomDomain)}` : '';
    const resp = await fetch(`/api/auth/google-domain-status${query}`, {
      method: 'GET',
      cache: 'no-store'
    });
    if (!resp.ok) return;
    const data = (await resp.json()) as {
      ok?: boolean;
      customDomainRedirectReady?: boolean;
      activeAuthDomain?: string;
    };
    if (
      data?.ok &&
      data.customDomainRedirectReady &&
      data.activeAuthDomain &&
      data.activeAuthDomain !== firebaseConfig.authDomain
    ) {
      activeFirebaseAuth = getOrCreateCustomDomainAuth(data.activeAuthDomain);
    } else {
      activeFirebaseAuth = firebaseAuth;
    }
  } catch {
    // Keep default firebaseAuth on network failure
  }
}

if (typeof window !== 'undefined') {
  syncCustomAuthDomainStatus().catch(() => {});
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export interface GooglePopupAuthResult {
  idToken: string;
  email: string;
  name: string;
  photoUrl?: string;
}

export async function signInWithGooglePopup(): Promise<GooglePopupAuthResult> {
  let credential;
  try {
    credential = await signInWithPopup(activeFirebaseAuth, googleProvider);
  } catch (err: any) {
    const code = String(err?.code || '');
    if (
      activeFirebaseAuth !== firebaseAuth &&
      (code === 'auth/unauthorized-domain' ||
        code === 'auth/invalid-oauth-client-id' ||
        code === 'auth/internal-error')
    ) {
      activeFirebaseAuth = firebaseAuth;
      credential = await signInWithPopup(firebaseAuth, googleProvider);
    } else {
      throw err;
    }
  }
  const user = credential.user;
  const idToken = await user.getIdToken();
  return {
    idToken,
    email: user.email || '',
    name: user.displayName || (user.email ? user.email.split('@')[0] : 'Creator'),
    photoUrl: user.photoURL || undefined
  };
}

export async function waitForCurrentFirebaseUser(): Promise<User | null> {
  try {
    await activeFirebaseAuth.authStateReady();
    if (activeFirebaseAuth.currentUser) return activeFirebaseAuth.currentUser;
    await firebaseAuth.authStateReady();
    return firebaseAuth.currentUser;
  } catch {
    return null;
  }
}

export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(activeFirebaseAuth);
  } catch {}
  if (activeFirebaseAuth !== firebaseAuth) {
    try {
      await signOut(firebaseAuth);
    } catch {}
  }
}
