import React, { useState, useEffect } from 'react';
import {
  INITIAL_HISTORY_JOBS,
  FREE_DAILY_VIDEO_LIMIT,
  parsePersistedAuthUser,
  encodeAuthUserCacheHeader,
  shouldAutoRedirectAuthenticatedRoot,
  type PersistedAuthUser,
  type CreditPlanId,
  type RecapJobRecord
} from './utils/recapEngine';
import { attachGlobalUiSoundListeners } from './utils/soundEffects';
import {
  SidebarAndHeader,
  type AppRoute
} from './components/SidebarAndHeader';
import {
  FreeRecapStudio,
  type RightInspectorTab
} from './components/FreeRecapStudio';
import { LongFormStudio } from './components/LongFormStudio';
import {
  SttStudioView,
  HistoryView,
  WalletView,
  SettingsView,
  LandingView,
  SignInModal,
  type AuthenticatedUserPayload
} from './components/SecondaryViews';
import { AdminPanelView } from './components/AdminPanelView';
import {
  firebaseSignOut,
  waitForCurrentFirebaseUser,
  subscribeFirebaseAuthState
} from './firebase';

const AUTH_TOKEN_KEY = 'ttak_auth_token';
const AUTH_USER_CACHE_KEY = 'ttak_auth_user_cache';

type AuthUserState = PersistedAuthUser;

function readInitialPersistedSession(): {
  user: AuthUserState | null;
  token: string | null;
} {
  if (typeof window === 'undefined') return { user: null, token: null };
  let cachedUserJson: string | null = null;
  let storedToken: string | null = null;
  try {
    cachedUserJson = localStorage.getItem(AUTH_USER_CACHE_KEY);
    storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {}
  const cookieString = typeof document !== 'undefined' ? document.cookie : '';
  return parsePersistedAuthUser({ cachedUserJson, storedToken, cookieString });
}

function persistClientAuthSession(user: AuthUserState, token?: string | null) {
  const userJson = JSON.stringify({
    userId: user.userId,
    name: user.name,
    email: user.email,
    provider: user.provider || 'google',
    photoUrl: user.photoUrl
  });
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
    localStorage.setItem(AUTH_USER_CACHE_KEY, userJson);
  } catch {}
  try {
    const maxAge = 365 * 24 * 3600;
    if (token) {
      document.cookie = `ttak_auth_token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }
    document.cookie = `ttak_auth_user=${encodeURIComponent(userJson)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {}
}

function clearClientAuthSession() {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_CACHE_KEY);
  } catch {}
  try {
    document.cookie = 'ttak_auth_token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'ttak_auth_user=; path=/; max-age=0; SameSite=Lax';
  } catch {}
}

export default function App() {
  // Default to Dark theme matching TTAK MOVIE RECAP studio aesthetics, with instant Light/Dark toggle
  const [isDark, setIsDark] = useState<boolean>(true);
  const [uiLang, setUiLang] = useState<'my' | 'en'>('my');

  // Synchronously hydrate user from localStorage / cookie / signed token so page reloads on ttak.site never flash or log out
  const [authUser, setAuthUser] = useState<AuthUserState | null>(() => {
    return readInitialPersistedSession().user;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(() => {
    return readInitialPersistedSession().user === null;
  });
  const [signInModalOpen, setSignInModalOpen] = useState<boolean>(false);
  const [signInModalMode, setSignInModalMode] = useState<'signin' | 'signup'>('signup');

  // Default directly to /app/free-recap with ?tab=history or ?tab=settings support
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const p = window.location.pathname;
    const initialUser = readInitialPersistedSession().user;
    if (shouldAutoRedirectAuthenticatedRoot(p, Boolean(initialUser))) {
      return '/app/free-recap';
    }
    if (
      p === '/app' ||
      p === '/app/long-form' ||
      p === '/stt' ||
      p === '/history' ||
      p === '/wallet' ||
      p === '/settings' ||
      p === '/admin' ||
      p === '/'
    ) {
      return p as AppRoute;
    }
    return '/app/free-recap';
  });

  const [inspectorTab, setInspectorTab] = useState<RightInspectorTab>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'history' || t === 'settings') return t;
    return 'settings';
  });

  const [historyJobs, setHistoryJobs] = useState<RecapJobRecord[]>(INITIAL_HISTORY_JOBS);

  // Free Mode: strictly 5 videos per day (max 2:30 minutes per video)
  const [freeRemaining, setFreeRemaining] = useState<number>(FREE_DAILY_VIDEO_LIMIT);
  // Credits strictly 0 by default
  const [proCredits, setProCredits] = useState<number>(0);
  const [activePlanId, setActivePlanId] = useState<CreditPlanId | 'free'>('free');

  const activeUserId = authUser?.userId || '';
  const userEmail = authUser?.email || '';
  const userName = authUser?.name || '';

  // Keep browser URL bar in sync if root `/` auto-redirected to `/app/free-recap` for an already signed-in user
  useEffect(() => {
    if (authUser && shouldAutoRedirectAuthenticatedRoot(window.location.pathname, true)) {
      setCurrentRoute('/app/free-recap');
      window.history.replaceState({}, '', `/app/free-recap?tab=${inspectorTab}`);
    }
  }, [authUser, inspectorTab]);

  // Verify stored session token with backend on initial load, with silent Firebase Google restore
  useEffect(() => {
    let isMounted = true;

    const exchangeFirebaseUserForSession = async (fbUser: {
      email?: string | null;
      getIdToken: () => Promise<string>;
    }): Promise<boolean> => {
      if (!fbUser || !fbUser.email) return false;
      try {
        const idToken = await fbUser.getIdToken();
        if (!idToken) return false;
        const gRes = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });
        const gData = await gRes.json();
        if (gRes.ok && gData.ok && gData.user && gData.token) {
          persistClientAuthSession(gData.user, gData.token);
          if (isMounted) {
            setAuthUser(gData.user);
            setSignInModalOpen(false);
          }
          return true;
        }
      } catch {}
      return false;
    };

    const trySilentFirebaseRestore = async (): Promise<boolean> => {
      const fbUser = await waitForCurrentFirebaseUser();
      if (!fbUser || !fbUser.email) return false;
      return exchangeFirebaseUserForSession(fbUser);
    };

    const verifySession = async () => {
      const initialPersisted = readInitialPersistedSession();
      try {
        const token = initialPersisted.token;
        const cachedUser = initialPersisted.user;

        if (token || cachedUser) {
          const headers: Record<string, string> = {};
          if (token) {
            headers.Authorization = `Bearer ${token}`;
            headers['x-auth-token'] = token;
          }
          const cacheHeader = encodeAuthUserCacheHeader(cachedUser);
          if (cacheHeader) {
            headers['x-auth-user-cache'] = cacheHeader;
          }
          const query = token ? `?token=${encodeURIComponent(token)}` : '';
          const res = await fetch(`/api/auth/me${query}`, { headers });
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.ok && data.user) {
              persistClientAuthSession(data.user, data.token || token);
              setAuthUser(data.user);
              setSignInModalOpen(false);
              return;
            }
          }

          // If we already have a persisted user profile, keep them logged in across reloads
          // and attempt a silent Firebase token refresh in the background
          if (cachedUser) {
            if (isMounted) {
              setAuthUser(cachedUser);
              setSignInModalOpen(false);
            }
            trySilentFirebaseRestore().catch(() => {});
            return;
          }
        }

        // Before asking the user to sign in, check if Firebase Auth already persists Google login
        const restored = await trySilentFirebaseRestore();
        if (restored) return;

        if (isMounted) {
          setAuthUser(null);
          if (window.location.pathname !== '/admin') {
            setSignInModalMode('signup');
            setSignInModalOpen(true);
          }
        }
      } catch {
        // Network offline / server starting up: keep persisted user or try silent Firebase restore
        if (initialPersisted.user && isMounted) {
          setAuthUser(initialPersisted.user);
          setSignInModalOpen(false);
          return;
        }
        const restored = await trySilentFirebaseRestore();
        if (restored) return;
        if (isMounted && window.location.pathname !== '/admin') {
          setSignInModalMode('signup');
          setSignInModalOpen(true);
        }
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };

    verifySession();

    const unsubFirebase = subscribeFirebaseAuthState((fbUser) => {
      if (!fbUser || !fbUser.email) return;
      const currentPersisted = readInitialPersistedSession();
      if (!currentPersisted.user || !currentPersisted.token) {
        exchangeFirebaseUserForSession(fbUser).catch(() => {});
      }
    });

    return () => {
      isMounted = false;
      unsubFirebase();
    };
  }, []);

  // Auto-sync real-time credit balance from server using authenticated Website User ID
  useEffect(() => {
    if (!activeUserId) {
      setProCredits(0);
      setActivePlanId('free');
      return;
    }

    let isMounted = true;
    const syncCredits = async () => {
      try {
        const res = await fetch(`/api/user/credits?userId=${encodeURIComponent(activeUserId)}`);
        const data = await res.json();
        if (isMounted && data.ok && typeof data.credits === 'number') {
          setProCredits(data.credits);
          if (typeof data.freeRemaining === 'number') {
            setFreeRemaining(data.freeRemaining);
          }
          if (data.activePlanId && data.activePlanId !== 'free') {
            setActivePlanId(data.activePlanId as CreditPlanId);
          } else {
            setActivePlanId('free');
          }
        }
      } catch {}
    };

    syncCredits();
    const timer = setInterval(syncCredits, 3000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [activeUserId]);

  // Attach global tactile UI sound effects on screen taps, switches, and selects
  useEffect(() => {
    const detach = attachGlobalUiSoundListeners();
    return detach;
  }, []);

  // Sync dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Sync route and ?tab= query param in browser URL bar without full reload
  const handleNavigate = (route: AppRoute, tab?: RightInspectorTab) => {
    setCurrentRoute(route);
    if (tab) setInspectorTab(tab);
    const url =
      route === '/app/free-recap' || route === '/app'
        ? `${route}?tab=${tab || inspectorTab}`
        : route;
    window.history.replaceState({}, '', url);
  };

  const handleOpenAuthModal = (mode: 'signin' | 'signup' = 'signin') => {
    setSignInModalMode(mode);
    setSignInModalOpen(true);
  };

  const handleAuthSuccess = (user: AuthenticatedUserPayload) => {
    const nextUser: AuthUserState = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      provider: user.provider
    };
    persistClientAuthSession(nextUser, user.token);
    setAuthUser(nextUser);
    setSignInModalOpen(false);
    if (currentRoute === '/') {
      handleNavigate('/app/free-recap', 'settings');
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut();
      const token = readInitialPersistedSession().token;
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {}
    clearClientAuthSession();
    setAuthUser(null);
    setProCredits(0);
    setActivePlanId('free');
    setSignInModalMode('signin');
    setSignInModalOpen(true);
  };

  const handleTabChange = (tab: RightInspectorTab) => {
    setInspectorTab(tab);
    if (currentRoute === '/app/free-recap' || currentRoute === '/app') {
      window.history.replaceState({}, '', `${currentRoute}?tab=${tab}`);
    }
  };

  const handleSaveJob = (newJob: RecapJobRecord, creditCostUsed = 1) => {
    setHistoryJobs((prev) => [newJob, ...prev]);
    if (currentRoute === '/app/free-recap') {
      setFreeRemaining((prev) => Math.max(0, prev - 1));
      if (activeUserId) {
        fetch('/api/user/free-usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: activeUserId })
        })
          .then((r) => r.json())
          .then((d) => {
            if (d?.ok && typeof d.freeRemaining === 'number') {
              setFreeRemaining(d.freeRemaining);
            }
          })
          .catch(() => {});
      }
    } else if (activeUserId) {
      const deduction = Math.max(1, creditCostUsed);
      setProCredits((prev) => Math.max(0, prev - deduction));
      fetch('/api/user/deduct-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUserId, amount: deduction })
      }).catch(() => {});
    }
  };

  const handleDeleteJob = (jobId: string) => {
    setHistoryJobs((prev) => prev.filter((j) => j.id !== jobId));
  };

  if (isAuthChecking && currentRoute !== '/admin') {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#090C10] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="size-9 animate-spin rounded-full border-2 border-amber-400/25 border-t-amber-400" />
          <span className="text-xs font-medium text-slate-400 tracking-wide">TTAK MOVIE RECAP…</span>
        </div>
      </div>
    );
  }

  // Gate all non-admin routes until user has signed up / logged in
  if ((!authUser && currentRoute !== '/admin') || currentRoute === '/') {
    return (
      <>
        <LandingView
          onNavigate={(r) => {
            if (r === '/admin') {
              handleNavigate('/admin');
              return;
            }
            if (!authUser) {
              handleOpenAuthModal('signup');
              return;
            }
            handleNavigate(r);
          }}
          onOpenSignIn={(mode) => handleOpenAuthModal(mode || 'signup')}
        />
        <SignInModal
          isOpen={signInModalOpen}
          onClose={() => setSignInModalOpen(false)}
          initialMode={signInModalMode}
          canDismiss={true}
          onSignInSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <>
      <SidebarAndHeader
        currentRoute={currentRoute}
        onNavigate={(r) => handleNavigate(r)}
        uiLang={uiLang}
        onChangeUiLang={setUiLang}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        freeRemaining={freeRemaining}
        freeLimit={FREE_DAILY_VIDEO_LIMIT}
        proCredits={proCredits}
        activePlanId={activePlanId}
        userEmail={userEmail}
        userName={userName}
        userId={activeUserId}
        onOpenSignIn={() => handleOpenAuthModal('signin')}
        onSignOut={handleSignOut}
      >
        {(currentRoute === '/app/free-recap' || currentRoute === '/app') && (
          <FreeRecapStudio
            userId={activeUserId}
            isFreeTier={currentRoute === '/app/free-recap'}
            uiLang={uiLang}
            activeTab={inspectorTab}
            onChangeTab={handleTabChange}
            historyJobs={historyJobs}
            onSaveJob={handleSaveJob}
            onDeleteJob={handleDeleteJob}
            freeRemaining={freeRemaining}
            freeLimit={FREE_DAILY_VIDEO_LIMIT}
            proCredits={proCredits}
            onNavigateToWallet={() => handleNavigate('/wallet')}
            onNavigateToProStudio={() => handleNavigate('/app', 'settings')}
            onNavigateToFreeStudio={() => handleNavigate('/app/free-recap', 'settings')}
          />
        )}

        {currentRoute === '/app/long-form' && <LongFormStudio uiLang={uiLang} />}

        {currentRoute === '/stt' && (
          <SttStudioView
            uiLang={uiLang}
            proCredits={proCredits}
            activePlanId={activePlanId}
            onDeductCredits={(amt) => {
              setProCredits((c) => Math.max(0, c - amt));
              if (activeUserId) {
                fetch('/api/user/deduct-credits', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: activeUserId, amount: amt })
                }).catch(() => {});
              }
            }}
            onNavigateToWallet={() => handleNavigate('/wallet')}
          />
        )}

        {currentRoute === '/history' && (
          <HistoryView
            jobs={historyJobs}
            onOpenJobInStudio={() => handleNavigate('/app/free-recap', 'settings')}
            onDeleteJob={handleDeleteJob}
          />
        )}

        {currentRoute === '/wallet' && (
          <WalletView
            userId={activeUserId}
            proCredits={proCredits}
            activePlanId={activePlanId}
            onAddCredits={(amt, newPlanId) => {
              setProCredits((c) => c + amt);
              if (newPlanId) setActivePlanId(newPlanId);
            }}
          />
        )}

        {currentRoute === '/settings' && <SettingsView userEmail={userEmail} />}
        {currentRoute === '/admin' && (
          <AdminPanelView
            userId={activeUserId || 'UID-ADMIN'}
            userEmail={userEmail || 'admin@ttakmovierecap.com'}
            onAddUserCredits={(amt) => {
              setProCredits((c) => c + amt);
            }}
          />
        )}
      </SidebarAndHeader>

      <SignInModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
        initialMode={signInModalMode}
        canDismiss={true}
        onSignInSuccess={handleAuthSuccess}
      />
    </>
  );
}
