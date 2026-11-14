import React, { useState, useEffect } from 'react';
import {
  INITIAL_HISTORY_JOBS,
  FREE_DAILY_VIDEO_LIMIT,
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
import { firebaseSignOut, waitForCurrentFirebaseUser } from './firebase';

const AUTH_TOKEN_KEY = 'ttak_auth_token';

interface AuthUserState {
  userId: string;
  name: string;
  email: string;
  provider?: 'google' | 'email' | 'telegram';
  photoUrl?: string;
}

export default function App() {
  // Default to Dark theme matching TTAK MOVIE RECAP studio aesthetics, with instant Light/Dark toggle
  const [isDark, setIsDark] = useState<boolean>(true);
  const [uiLang, setUiLang] = useState<'my' | 'en'>('my');

  // Default directly to /app/free-recap with ?tab=history or ?tab=settings support
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const p = window.location.pathname;
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

  // Real authenticated user session (zero hardcoded Gmail)
  const [authUser, setAuthUser] = useState<AuthUserState | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [signInModalOpen, setSignInModalOpen] = useState<boolean>(false);
  const [signInModalMode, setSignInModalMode] = useState<'signin' | 'signup'>('signup');

  // Free Mode: strictly 3 videos per day (max 2:30 minutes per video)
  const [freeRemaining, setFreeRemaining] = useState<number>(FREE_DAILY_VIDEO_LIMIT);
  // Credits strictly 0 by default
  const [proCredits, setProCredits] = useState<number>(0);
  const [activePlanId, setActivePlanId] = useState<CreditPlanId | 'free'>('free');

  const activeUserId = authUser?.userId || '';
  const userEmail = authUser?.email || '';
  const userName = authUser?.name || '';

  // Verify stored session token with backend on initial load, with silent Firebase Google restore
  useEffect(() => {
    let isMounted = true;
    const AUTH_USER_CACHE_KEY = 'ttak_auth_user_cache';

    const trySilentFirebaseRestore = async (): Promise<boolean> => {
      const fbUser = await waitForCurrentFirebaseUser();
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
          try {
            localStorage.setItem(AUTH_TOKEN_KEY, gData.token);
            localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(gData.user));
          } catch {}
          if (isMounted) {
            setAuthUser(gData.user);
            setSignInModalOpen(false);
          }
          return true;
        }
      } catch {}
      return false;
    };

    const verifySession = async () => {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted && data.ok && data.user) {
              try {
                localStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(data.user));
              } catch {}
              setAuthUser(data.user);
              setSignInModalOpen(false);
              return;
            }
          }
          // Only drop token on explicit 401/403 (not transient 5xx network errors)
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem(AUTH_TOKEN_KEY);
          } else {
            try {
              const cached = localStorage.getItem(AUTH_USER_CACHE_KEY);
              if (cached && isMounted) {
                setAuthUser(JSON.parse(cached));
                setSignInModalOpen(false);
                return;
              }
            } catch {}
          }
        }

        // Before asking the user to sign in again, check if Firebase Auth already persists Google login
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
        // Network offline / server starting up: try silent Firebase restore or cached user
        const restored = await trySilentFirebaseRestore();
        if (restored) return;
        try {
          const cached = localStorage.getItem(AUTH_USER_CACHE_KEY);
          if (cached && isMounted) {
            setAuthUser(JSON.parse(cached));
            setSignInModalOpen(false);
            return;
          }
        } catch {}
        if (isMounted && window.location.pathname !== '/admin') {
          setSignInModalMode('signup');
          setSignInModalOpen(true);
        }
      } finally {
        if (isMounted) setIsAuthChecking(false);
      }
    };

    verifySession();
    return () => {
      isMounted = false;
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
    try {
      localStorage.setItem(AUTH_TOKEN_KEY, user.token);
      localStorage.setItem(
        'ttak_auth_user_cache',
        JSON.stringify({
          userId: user.userId,
          name: user.name,
          email: user.email,
          provider: user.provider
        })
      );
    } catch {}
    setAuthUser({
      userId: user.userId,
      name: user.name,
      email: user.email,
      provider: user.provider
    });
    setSignInModalOpen(false);
    if (currentRoute === '/') {
      handleNavigate('/app/free-recap', 'settings');
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseSignOut();
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch {}
    try {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem('ttak_auth_user_cache');
    } catch {}
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
