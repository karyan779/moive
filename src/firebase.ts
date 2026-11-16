import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  onAuthStateChanged,
  type Auth,
  type User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { extractCustomDomainHostname } from './utils/recapEngine';

const envCustomAuthDomain =
  typeof import.meta !== 'undefined' && import.meta.env
    ? extractCustomDomainHostname(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN)
    : null;

function createOrGetPersistentAuth(app: FirebaseApp): Auth {
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence
      ],
      popupRedirectResolver: browserPopupRedirectResolver
    });
  } catch {
    return getAuth(app);
  }
}

const defaultApp: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      ...firebaseConfig,
      authDomain: envCustomAuthDomain || firebaseConfig.authDomain
    });

export const firebaseAuth: Auth = createOrGetPersistentAuth(defaultApp);

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
  return createOrGetPersistentAuth(customApp);
}

/**
 * Checks with the backend whether the current custom domain (e.g. `ttakb.site` / `ttak.site`) has
 * `https://<domain>/__/auth/handler` registered in Google Cloud Console's Authorized redirect URIs.
 * As soon as it is registered, switches `activeFirebaseAuth` to use `authDomain: <domain>` so
 * Google Sign-In displays "to continue to ttak.site" instead of "brilliant-turbine-fdzcr.firebaseapp.com".
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

let domainSyncPromise: Promise<void> | null = null;
if (typeof window !== 'undefined') {
  domainSyncPromise = syncCustomAuthDomainStatus().catch(() => {});
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
    credential = await signInWithPopup(
      activeFirebaseAuth,
      googleProvider,
      browserPopupRedirectResolver
    );
  } catch (err: any) {
    const code = String(err?.code || '');
    if (
      activeFirebaseAuth !== firebaseAuth &&
      (code === 'auth/unauthorized-domain' ||
        code === 'auth/invalid-oauth-client-id' ||
        code === 'auth/internal-error' ||
        code === 'auth/argument-error')
    ) {
      activeFirebaseAuth = firebaseAuth;
      credential = await signInWithPopup(
        firebaseAuth,
        googleProvider,
        browserPopupRedirectResolver
      );
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

function getAllCandidateAuthInstances(): Auth[] {
  const instances = new Set<Auth>([activeFirebaseAuth, firebaseAuth]);
  return Array.from(instances);
}

export async function waitForCurrentFirebaseUser(): Promise<User | null> {
  try {
    if (domainSyncPromise) {
      await Promise.race([
        domainSyncPromise,
        new Promise<void>((r) => setTimeout(r, 1200))
      ]);
    }
    const candidates = getAllCandidateAuthInstances();
    for (const authInst of candidates) {
      try {
        await authInst.authStateReady();
        if (authInst.currentUser) {
          return authInst.currentUser;
        }
      } catch {}
    }
    return null;
  } catch {
    return null;
  }
}

export function subscribeFirebaseAuthState(onUser: (user: User | null) => void): () => void {
  const candidates = getAllCandidateAuthInstances();
  const unsubs = candidates.map((authInst) =>
    onAuthStateChanged(
      authInst,
      (u) => {
        if (u) onUser(u);
      },
      () => {}
    )
  );
  return () => {
    unsubs.forEach((u) => {
      try {
        u();
      } catch {}
    });
  };
}

export async function firebaseSignOut(): Promise<void> {
  const candidates = getAllCandidateAuthInstances();
  for (const authInst of candidates) {
    try {
      await signOut(authInst);
    } catch {}
  }
}
