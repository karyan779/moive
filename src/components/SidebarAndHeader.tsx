import React, { useState } from 'react';
import {
  Sparkles,
  Video,
  Film,
  Subtitles,
  History,
  Wallet,
  Settings,
  PanelLeft,
  Zap,
  Sun,
  Moon,
  Globe,
  ExternalLink,
  LogOut,
  Check,
  Home,
  Crown,
  Volume2,
  VolumeX,
  User
} from 'lucide-react';
import {
  UI_TRANSLATIONS,
  type CreditPlanId,
  CREDIT_PLANS,
  TELEGRAM_CHANNEL_URL,
  TELEGRAM_ADMIN_HANDLE,
  TELEGRAM_ADMIN_URL
} from '../utils/recapEngine';
import {
  isUiSoundMuted,
  setUiSoundMuted,
  playUiSound
} from '../utils/soundEffects';

export type AppRoute =
  | '/app/free-recap'
  | '/app'
  | '/app/long-form'
  | '/stt'
  | '/history'
  | '/wallet'
  | '/settings'
  | '/admin'
  | '/';

interface SidebarAndHeaderProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  uiLang: 'my' | 'en';
  onChangeUiLang: (lang: 'my' | 'en') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  freeRemaining: number;
  freeLimit: number;
  proCredits: number;
  activePlanId?: CreditPlanId | 'free';
  userEmail: string;
  userName?: string;
  userId?: string;
  onOpenSignIn: () => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export function GlintAvatar({ email, name }: { email: string; name?: string }) {
  const initial = (name || email || 'T').trim().charAt(0).toUpperCase();
  return (
    <div className="relative inline-flex size-7 items-center justify-center rounded-xl overflow-hidden ring-1 ring-amber-500/30 shrink-0">
      <svg viewBox="0 0 36 36" fill="none" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id="ttakGlintGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="55%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#0d9488" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" fill="url(#ttakGlintGrad)" />
        <circle cx="28" cy="8" r="14" fill="#ffffff" fillOpacity="0.2" />
      </svg>
      <span className="relative z-10 text-[11px] font-bold text-white drop-shadow-xs">
        {initial}
      </span>
    </div>
  );
}

export const SidebarAndHeader: React.FC<SidebarAndHeaderProps> = ({
  currentRoute,
  onNavigate,
  uiLang,
  onChangeUiLang,
  isDark,
  onToggleTheme,
  freeRemaining,
  freeLimit,
  proCredits,
  activePlanId = 'creator-pro',
  userEmail,
  userName,
  userId,
  onOpenSignIn,
  onSignOut,
  children
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [soundMuted, setSoundMutedState] = useState<boolean>(() => isUiSoundMuted());

  const handleToggleSound = () => {
    const nextMuted = !soundMuted;
    setUiSoundMuted(nextMuted);
    setSoundMutedState(nextMuted);
    if (!nextMuted) {
      playUiSound('toggleOn');
    }
  };

  const t = UI_TRANSLATIONS[uiLang];

  const navItems: {
    route: AppRoute;
    label: string;
    badge?: string;
    icon: React.FC<{ className?: string }>;
  }[] = [
    {
      route: '/app/free-recap',
      label: t.freeRecap,
      badge: 'FREE',
      icon: Sparkles
    },
    {
      route: '/app',
      label: t.recapStudio,
      badge: 'CREDIT',
      icon: Video
    },
    {
      route: '/app/long-form',
      label: t.movieRecap,
      badge: '20M+',
      icon: Film
    },
    {
      route: '/stt',
      label: t.autoSubtitles,
      badge: 'STT',
      icon: Subtitles
    },
    {
      route: '/history',
      label: t.history,
      icon: History
    },
    {
      route: '/wallet',
      label: t.wallet,
      icon: Wallet
    },
    {
      route: '/settings',
      label: t.settings,
      icon: Settings
    }
  ];

  const activeTitle =
    navItems.find((item) => item.route === currentRoute)?.label || 'TTAK MOVIE RECAP';

  const activePlanObj = CREDIT_PLANS.find((p) => p.id === activePlanId);

  return (
    <div className="flex flex-1 min-h-0 w-full overflow-hidden bg-[#F7F6F2] dark:bg-[#090C10] text-stone-900 dark:text-slate-100 select-none">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left AppSidebar — Studio Rail */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-stone-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0D1117] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] md:static ${
          sidebarCollapsed ? 'md:w-16' : 'md:w-64'
        } ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand Header — TTAK MOVIE RECAP */}
        <div className="flex h-14 items-center justify-between px-3.5 border-b border-stone-200/80 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => {
              playUiSound('tap');
              onNavigate('/app/free-recap');
            }}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-teal-500 text-slate-950 shadow-sm shadow-amber-500/20 shrink-0 transition-transform duration-200 group-hover:scale-105">
              <Film className="size-4 stroke-[2.3]" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold tracking-tight text-stone-900 dark:text-white">
                    TTAK MOVIE RECAP
                  </span>
                </div>
                <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400/90">
                  Cinema Studio · Myanmar AI
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1">
          {!sidebarCollapsed && (
            <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              {uiLang === 'my' ? 'Studio Workspace' : 'Workspace'}
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => {
                  playUiSound('select');
                  onNavigate(item.route);
                  setMobileMenuOpen(false);
                }}
                title={sidebarCollapsed ? item.label : undefined}
                className={`group relative flex w-full items-center justify-between rounded-xl px-2.5 py-2.5 text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/12 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 font-semibold'
                    : 'text-stone-600 dark:text-slate-400 hover:bg-stone-100/90 dark:hover:bg-slate-800/60 hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-500" />
                )}
                <div className="flex items-center gap-2.5 min-w-0 pl-0.5">
                  <Icon
                    className={`size-4 shrink-0 transition-colors ${
                      isActive
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-stone-400 dark:text-slate-500 group-hover:text-stone-700 dark:group-hover:text-slate-200'
                    }`}
                  />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!sidebarCollapsed && item.badge && (
                  <span
                    className={`font-mono text-[10px] font-bold tracking-wide uppercase ${
                      isActive
                        ? 'text-amber-700 dark:text-amber-300'
                        : item.badge === 'FREE'
                          ? 'text-teal-600 dark:text-teal-400'
                          : item.badge === 'STT'
                            ? 'text-sky-600 dark:text-sky-400'
                            : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2.5 mt-2.5 border-t border-stone-200/80 dark:border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                playUiSound('tap');
                onNavigate('/');
                setMobileMenuOpen(false);
              }}
              className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-medium text-stone-500 dark:text-slate-400 hover:bg-stone-100/90 dark:hover:bg-slate-800/60 hover:text-stone-900 dark:hover:text-white cursor-pointer"
            >
              <Home className="size-4 shrink-0 text-stone-400 dark:text-slate-500" />
              {!sidebarCollapsed && <span>Landing Page Preview</span>}
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Community links + Quota / Plan Card */}
        <div className="p-2.5 space-y-2.5 border-t border-stone-200/80 dark:border-slate-800/80">
          {!sidebarCollapsed && (
            <div className="space-y-0.5">
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="sidebar-telegram-channel-link"
                onClick={() => playUiSound('tap')}
                className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-500/10 transition-colors"
              >
                <span>Telegram Channel (TTAK)</span>
                <ExternalLink className="size-3 opacity-80" />
              </a>
              <a
                href={TELEGRAM_ADMIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="sidebar-telegram-admin-link"
                onClick={() => playUiSound('tap')}
                className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                <span>Credit ဝယ်ရန် Admin ({TELEGRAM_ADMIN_HANDLE})</span>
                <ExternalLink className="size-3 opacity-80" />
              </a>
              <a
                href="#updates"
                onClick={(e) => {
                  e.preventDefault();
                  playUiSound('tap');
                  onNavigate('/wallet');
                }}
                className="flex items-center justify-between rounded-xl px-2.5 py-1.5 text-[11px] font-medium text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-slate-800/60 hover:text-stone-900 dark:hover:text-slate-200"
              >
                <span>Credit Plans & Updates</span>
                <ExternalLink className="size-3 opacity-60" />
              </a>
            </div>
          )}

          {/* Free Quota & Active Credit Plan Card */}
          {!sidebarCollapsed ? (
            <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#131922] p-3 ttak-studio-hatch">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-stone-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Crown className="size-3.5 text-amber-500" />
                  <span>Free (2:30m max)</span>
                </span>
                <span className="text-[11px] font-mono font-bold tabular-nums text-stone-900 dark:text-white">
                  {freeRemaining} / {freeLimit}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-slate-800 overflow-hidden mb-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, (freeRemaining / freeLimit) * 100)}%` }}
                />
              </div>
              <div className="mb-2.5 flex items-center justify-between text-[10px] text-stone-500 dark:text-slate-400">
                <span>Plan: {activePlanObj?.name || 'Free Tier'}</span>
                <span className="font-mono font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {proCredits} Cr
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playUiSound('tap');
                  onNavigate('/wallet');
                }}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] py-2 px-3 text-[11px] font-bold text-slate-950 shadow-xs transition-all cursor-pointer"
              >
                {uiLang === 'my' ? 'Credit Plans · အကန့်အသတ်မဲ့' : 'View Credit Plans'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                playUiSound('tap');
                onNavigate('/wallet');
              }}
              title="View Credit Plans"
              className="flex size-10 mx-auto items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs transition-all cursor-pointer"
            >
              <Crown className="size-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Studio Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-stone-200/90 dark:border-slate-800/80 bg-white/90 dark:bg-[#0D1117]/92 backdrop-blur-md px-3 sm:px-4 z-30">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                playUiSound('tap');
                if (window.innerWidth < 768) {
                  setMobileMenuOpen(!mobileMenuOpen);
                } else {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-stone-500 hover:border-stone-200 hover:bg-stone-100 dark:text-slate-400 dark:hover:border-slate-800 dark:hover:bg-slate-800/70 transition-all cursor-pointer"
              aria-label="Toggle Sidebar"
            >
              <PanelLeft className="size-4" />
            </button>
            <div className="h-4 w-px shrink-0 bg-stone-200 dark:bg-slate-800" />
            <h1 className="truncate text-sm font-bold tracking-tight text-stone-900 dark:text-white">
              {activeTitle}
            </h1>
            {(currentRoute === '/app/free-recap' || currentRoute === '/app') && (() => {
              const isCredit = currentRoute === '/app';
              const toggleTarget: AppRoute = isCredit ? '/app/free-recap' : '/app';
              return (
                <button
                  type="button"
                  role="switch"
                  aria-checked={isCredit}
                  aria-label="Toggle Free Mode or Credit Mode"
                  data-testid="header-mode-swipe-toggle"
                  onPointerDown={(e) => {
                    e.currentTarget.dataset.swipeStartX = String(e.clientX);
                    e.currentTarget.dataset.justSwiped = '0';
                  }}
                  onPointerUp={(e) => {
                    const rawStart = e.currentTarget.dataset.swipeStartX;
                    delete e.currentTarget.dataset.swipeStartX;
                    if (rawStart !== undefined) {
                      const dx = e.clientX - Number(rawStart);
                      if (Math.abs(dx) >= 16) {
                        e.currentTarget.dataset.justSwiped = '1';
                        if ((dx > 0 && !isCredit) || (dx < 0 && isCredit)) {
                          playUiSound('select');
                          onNavigate(toggleTarget);
                        }
                      }
                    }
                  }}
                  onClick={(e) => {
                    if (e.currentTarget.dataset.justSwiped === '1') {
                      e.currentTarget.dataset.justSwiped = '0';
                      return;
                    }
                    playUiSound('select');
                    onNavigate(toggleTarget);
                  }}
                  className={`hidden sm:inline-flex relative h-8 w-[124px] shrink-0 cursor-pointer items-center justify-between rounded-xl border p-0.5 transition-all select-none ${
                    isCredit
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-teal-500/40 bg-teal-500/10'
                  }`}
                >
                  <span
                    className={`pointer-events-none absolute top-0.5 bottom-0.5 w-[59px] rounded-lg shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isCredit
                        ? 'translate-x-[59px] bg-amber-500'
                        : 'translate-x-0 bg-teal-600'
                    }`}
                  />
                  <span
                    className={`relative z-10 flex w-[59px] items-center justify-center text-[11px] font-bold transition-colors ${
                      !isCredit ? 'text-white' : 'text-stone-500 dark:text-slate-400'
                    }`}
                  >
                    Free
                  </span>
                  <span
                    className={`relative z-10 flex w-[59px] items-center justify-center text-[11px] font-bold transition-colors ${
                      isCredit ? 'text-slate-950' : 'text-stone-500 dark:text-slate-400'
                    }`}
                  >
                    Credit
                  </span>
                </button>
              );
            })()}
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Screen Tap Sound Toggle */}
            <button
              type="button"
              data-testid="header-sound-toggle-btn"
              onClick={handleToggleSound}
              className="hidden sm:flex size-8.5 shrink-0 items-center justify-center rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/70 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={soundMuted ? 'Unmute UI Sounds' : 'Mute UI Sounds'}
              title={
                soundMuted
                  ? 'UI Tap Sound: Muted (Click to Enable)'
                  : 'UI Tap Sound: Active (Click to Mute)'
              }
            >
              {soundMuted ? (
                <VolumeX className="size-3.5 text-stone-400 dark:text-slate-500" />
              ) : (
                <Volume2 className="size-3.5 text-teal-600 dark:text-teal-400" />
              )}
            </button>

            {/* Quick Language Switcher (MY / EN) */}
            <button
              type="button"
              onClick={() => {
                playUiSound('select');
                onChangeUiLang(uiLang === 'my' ? 'en' : 'my');
              }}
              className="flex h-8.5 items-center gap-1 rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/70 px-2 sm:px-2.5 text-[11px] font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Switch UI Language (Burmese / English)"
            >
              <Globe className="size-3.5 text-amber-500 shrink-0" />
              <span className="sm:hidden">{uiLang === 'my' ? 'MY' : 'EN'}</span>
              <span className="hidden sm:inline">{uiLang === 'my' ? '🇲🇲 မြန်မာ' : '🇬🇧 EN'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                playUiSound('toggleOn');
                onToggleTheme();
              }}
              className="flex size-8.5 shrink-0 items-center justify-center rounded-xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-900/70 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Toggle Light/Dark Theme"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun className="size-3.5 text-amber-400" />
              ) : (
                <Moon className="size-3.5 text-slate-700" />
              )}
            </button>

            {/* Header Credits Readout Button */}
            <button
              type="button"
              data-testid="header-credits-pill"
              onClick={() => {
                playUiSound('tap');
                onNavigate('/wallet');
              }}
              className="flex h-8.5 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-2.5 sm:px-3 text-[11px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/15 transition-colors whitespace-nowrap shrink-0 tabular-nums cursor-pointer"
            >
              <Zap className="size-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>
                {currentRoute === '/app/free-recap'
                  ? uiLang === 'my'
                    ? `အခမဲ့ ${freeRemaining} / ${freeLimit}`
                    : `Free ${freeRemaining} / ${freeLimit}`
                  : `${proCredits} Cr`}
              </span>
            </button>

            {/* Account / Switch User Button */}
            <button
              type="button"
              data-testid="header-signin-btn"
              onClick={() => {
                playUiSound('open');
                onOpenSignIn();
              }}
              className="hidden md:inline-flex h-8.5 items-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 px-2.5 text-[11px] font-semibold text-stone-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Account & Sign In"
            >
              <User className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="max-w-[140px] truncate">{userName || userEmail || 'Sign In'}</span>
            </button>

            {/* UserDropdown */}
            <div className="relative">
              <button
                type="button"
                data-testid="user-avatar-btn"
                onClick={() => {
                  playUiSound('tap');
                  setUserDropdownOpen(!userDropdownOpen);
                }}
                className="flex items-center gap-2 rounded-xl p-0.5 hover:ring-2 hover:ring-amber-500/40 transition-all cursor-pointer"
                aria-label="User Account Menu"
              >
                <GlintAvatar email={userEmail} name={userName} />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-2 shadow-xl z-50">
                    <div className="flex items-center gap-2.5 px-2.5 py-2 border-b border-stone-200/80 dark:border-slate-800">
                      <GlintAvatar email={userEmail} name={userName} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-stone-900 dark:text-white">
                          {userName || (userEmail ? userEmail.split('@')[0] : 'Account')}
                        </p>
                        <p className="truncate text-[11px] text-stone-400 dark:text-slate-400">
                          {userEmail || 'Not signed in'}
                        </p>
                      </div>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleSound();
                          setUserDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800/70 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          {soundMuted ? (
                            <VolumeX className="size-3.5 text-stone-400" />
                          ) : (
                            <Volume2 className="size-3.5 text-teal-500" />
                          )}
                          UI Tap Sound
                        </span>
                        <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                          {soundMuted ? 'Off' : 'On'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onToggleTheme();
                          setUserDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800/70 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          {isDark ? <Sun className="size-3.5 text-amber-400" /> : <Moon className="size-3.5" />}
                          {isDark ? 'Light mode' : 'Dark mode'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onChangeUiLang(uiLang === 'my' ? 'en' : 'my');
                          setUserDropdownOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800/70 cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="size-3.5 text-amber-500" />
                          Language
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                          <Check className="size-3" />
                          {uiLang === 'my' ? 'မြန်မာ' : 'English'}
                        </span>
                      </button>

                      <div className="my-1 h-px bg-stone-200/80 dark:bg-slate-800" />

                      <button
                        type="button"
                        data-testid="dropdown-signin-btn"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          onOpenSignIn();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800/70 cursor-pointer"
                      >
                        <User className="size-3.5" />
                        <span>Switch Account / Sign In</span>
                      </button>

                      {onSignOut && (
                        <button
                          type="button"
                          data-testid="dropdown-signout-btn"
                          onClick={() => {
                            setUserDropdownOpen(false);
                            onSignOut();
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10 cursor-pointer"
                        >
                          <LogOut className="size-3.5" />
                          <span>Sign Out (ထွက်မည်)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Workspace Content */}
        <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
      </div>
    </div>
  );
};
