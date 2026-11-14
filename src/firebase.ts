import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  setPersistence,
  browserLocalPersistence,
  type User
} from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {});

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
  const credential = await signInWithPopup(firebaseAuth, googleProvider);
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
    await firebaseAuth.authStateReady();
    return firebaseAuth.currentUser;
  } catch {
    return null;
  }
}

export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(firebaseAuth);
  } catch {}
}
