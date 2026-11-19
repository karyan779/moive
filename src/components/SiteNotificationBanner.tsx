import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import {
  SITE_NOTIFICATION_DISMISSED_STORAGE_KEY,
  addDismissedSiteNotificationId,
  parseDismissedSiteNotificationIds,
  shouldShowSiteNotification,
  type SiteOnlineNotification
} from '../utils/recapEngine';
import { playUiSound } from '../utils/soundEffects';

const SITE_NOTIFICATION_POLL_MS = 30_000;

function readDismissedIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return parseDismissedSiteNotificationIds(
      window.localStorage.getItem(SITE_NOTIFICATION_DISMISSED_STORAGE_KEY)
    );
  } catch {
    return [];
  }
}

function persistDismissedIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SITE_NOTIFICATION_DISMISSED_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}

function formatNotificationTime(updatedAt: number, uiLang: 'my' | 'en'): string {
  if (!Number.isFinite(updatedAt) || updatedAt <= 0) return '';
  try {
    return new Date(updatedAt).toLocaleString(uiLang === 'my' ? 'en-GB' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export const SiteNotificationBanner: React.FC<{
  uiLang?: 'my' | 'en';
}> = ({ uiLang = 'my' }) => {
  const [notification, setNotification] = useState<SiteOnlineNotification | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => readDismissedIds());

  const fetchNotification = useCallback(async () => {
    try {
      const res = await fetch('/api/site-notification', {
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.ok && data.notification && data.notification.active) {
        setNotification({
          id: String(data.notification.id || ''),
          message: String(data.notification.message || ''),
          updatedAt: Number(data.notification.updatedAt) || Date.now(),
          active: true
        });
      } else {
        setNotification(null);
      }
    } catch {
      // Keep UI quiet on transient offline/network errors
    }
  }, []);

  useEffect(() => {
    void fetchNotification();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchNotification();
      }
    }, SITE_NOTIFICATION_POLL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchNotification();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchNotification]);

  if (!shouldShowSiteNotification(notification, dismissedIds) || !notification) {
    return null;
  }

  const timeLabel = formatNotificationTime(notification.updatedAt, uiLang);

  const handleDismiss = () => {
    playUiSound('close');
    const nextIds = addDismissedSiteNotificationId(dismissedIds, notification.id);
    setDismissedIds(nextIds);
    persistDismissedIds(nextIds);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="site-online-notification-banner"
      data-notification-id={notification.id}
      className="relative z-40 shrink-0 w-full border-b border-amber-200/90 bg-amber-50/95 text-stone-900 dark:border-amber-500/25 dark:bg-[#19150E] dark:text-amber-50 transition-opacity duration-150"
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5 text-xs sm:text-[13px] leading-snug">
          <Megaphone
            aria-hidden="true"
            className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
          />
          <p className="min-w-0 flex-1 break-words">
            <span className="font-semibold text-amber-800 dark:text-amber-300">
              {uiLang === 'my' ? 'Website Update' : 'Website Update'}
            </span>
            {timeLabel && (
              <>
                <span aria-hidden="true" className="mx-1.5 text-stone-400 dark:text-slate-500">
                  ·
                </span>
                <span className="text-[11px] font-mono tabular-nums text-stone-500 dark:text-slate-400">
                  {timeLabel}
                </span>
              </>
            )}
            <span aria-hidden="true" className="mx-1.5 text-stone-400 dark:text-slate-500">
              —
            </span>
            <span className="font-medium text-stone-800 dark:text-amber-50/95">
              {notification.message}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          data-testid="site-notification-dismiss-btn"
          aria-label={uiLang === 'my' ? 'အသိပေးချက် ပိတ်မည်' : 'Dismiss update notification'}
          title={uiLang === 'my' ? 'ဖျောက်မည် (X)' : 'Dismiss'}
          className="flex size-9 sm:size-8 shrink-0 items-center justify-center rounded-lg text-stone-500 hover:bg-amber-200/60 hover:text-stone-900 focus-visible:outline-2 focus-visible:outline-amber-500 dark:text-amber-200/70 dark:hover:bg-amber-500/20 dark:hover:text-amber-50 transition-colors cursor-pointer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
};
