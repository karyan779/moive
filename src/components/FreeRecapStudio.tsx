import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Download,
  RotateCcw,
  Sun,
  Moon,
  FileText,
  Trash2,
  Lock,
  X,
  Settings,
  Clock,
  Zap,
  Crown,
  AlertTriangle,
  Loader2,
  Volume2,
  Square,
  CheckCircle2,
  ChevronDown,
  Check,
  Play,
  Image as ImageIcon,
  Type,
  SlidersHorizontal,
  Upload,
  Film,
  ShieldCheck
} from 'lucide-react';
import {
  SCRIPT_STYLE_PROMPTS,
  TARGET_LANGUAGES,
  VOICE_OPTIONS,
  UI_TRANSLATIONS,
  FREE_DAILY_VIDEO_LIMIT,
  FREE_MAX_DURATION_SEC,
  DEFAULT_DEEPRECAP_EDIT_CONFIG,
  CAPTION_COLOR_PRESETS,
  BURMESE_FONT_STYLES,
  resolveBurmeseFontMeta,
  resolveSubtitleFontMeta,
  isVoiceAllowedInMode,
  getVoicePreviewSampleText,
  loadSavedApiEngineConfig,
  loadFreeUserApiKeys,
  formatDuration,
  calculateSubtitleScalePercent,
  calculateCreditCost,
  exportCuesToSrt,
  resolveStudioWorkflowStep,
  getDefaultAntiCopyrightEffects,
  buildPaymentNoticeKey,
  shouldShowPaymentNotificationBanner,
  isTransientPollHttpStatus,
  computeNextPollDelayMs,
  buildCinematicTranslateSystemPrompt,
  extractJobIdFromVideoUrl,
  resolveEffectiveVideoDurationSec,
  parseAndNormalizeVideoSourceUrl,
  sanitizeRecapProgressMessage,
  type RecapMode,
  type TranslateAudioMode,
  type VoiceGender,
  type ScriptStyleId,
  type AspectRatioMode,
  type TargetLanguageCode,
  type BlurStyleMode,
  type BlurRegion,
  type DeepRecapEditConfig,
  type BrandGridPos,
  type FocusAnchor,
  type SubtitleOverlayConfig,
  type AntiCopyrightEffects,
  type SubtitleCue,
  type RecapJobRecord,
  type AutoFlowLogStep,
  type BurmeseFontStyle
} from '../utils/recapEngine';
import { playUiSound } from '../utils/soundEffects';
import { uploadVideoDirect } from '../utils/r2ClientUpload';
import { downloadVerifiedMp4File } from '../utils/mp4Download';
import {
  CanvasVideoEditor,
  type DemoScenePreset
} from './CanvasVideoEditor';
import { ThumbnailStudioModal } from './ThumbnailStudioModal';

export type RightInspectorTab = 'settings' | 'history';

interface FreeRecapStudioProps {
  userId?: string;
  isFreeTier: boolean;
  uiLang: 'my' | 'en';
  activeTab: RightInspectorTab;
  onChangeTab: (tab: RightInspectorTab) => void;
  historyJobs: RecapJobRecord[];
  onSaveJob: (job: RecapJobRecord, creditCostUsed?: number) => void;
  onDeleteJob: (jobId: string) => void;
  freeRemaining?: number;
  freeLimit?: number;
  proCredits?: number;
  onNavigateToWallet?: () => void;
  onNavigateToProStudio?: () => void;
  onNavigateToFreeStudio?: () => void;
}

/**
 * Tactile 2-option segmented switcher for TTAK Cinema Studio
 */
function SlidingPillToggle<T extends string>({
  options,
  value,
  onChange,
  className = ''
}: {
  options: { value: T; label: string; testId?: string }[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
}) {
  const activeIdx = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  return (
    <div
      className={`relative grid grid-cols-2 rounded-xl border border-stone-200/90 bg-[#EFECE5] p-1 text-xs select-none dark:border-slate-800 dark:bg-[#141B24] ${className}`}
    >
      <div
        className="pointer-events-none absolute top-1 bottom-1 rounded-lg bg-white shadow-xs ring-1 ring-black/[0.04] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] dark:bg-[#1E293B] dark:ring-amber-400/20"
        style={{
          left: '4px',
          width: 'calc(50% - 4px)',
          transform: `translateX(${100 * activeIdx}%)`
        }}
      />
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            data-testid={opt.testId}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 cursor-pointer rounded-lg py-2 text-center text-xs transition-colors ${
              isSelected
                ? 'font-bold text-stone-900 dark:text-amber-300'
                : 'font-medium text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Dotted-underline label with hover tooltip
 */
function DottedTooltipLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <span
      title={tooltip}
      className="inline-block w-fit cursor-help border-b border-dotted border-stone-400 pb-0.5 text-xs font-medium text-stone-600 transition-colors hover:text-stone-900 dark:border-slate-600 dark:text-slate-300 dark:hover:text-white"
    >
      {label}
    </span>
  );
}

/**
 * Smooth Switch toggle component (with optional Pro lock overlay)
 */
function StreamWaveSwitch({
  checked,
  onCheckedChange,
  disabled = false,
  locked = false,
  testId,
  ariaLabel
}: {
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  disabled?: boolean;
  locked?: boolean;
  testId?: string;
  ariaLabel?: string;
}) {
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        role="switch"
        data-testid={testId}
        aria-label={ariaLabel}
        disabled={disabled}
        aria-checked={checked}
        onClick={() => !disabled && onCheckedChange(!checked)}
        className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${
          checked ? 'bg-amber-500' : 'bg-stone-300 dark:bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block size-4.5 transform rounded-full shadow-xs transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            checked
              ? 'translate-x-4.5 bg-slate-950'
              : 'translate-x-0 bg-white dark:bg-slate-300'
          }`}
        />
      </button>
      {locked && (
        <div className="pointer-events-none absolute top-0.5 left-0.5 flex size-4 items-center justify-center">
          <Lock className="size-2.5 text-stone-500 dark:text-slate-600" />
        </div>
      )}
    </div>
  );
}

const GRID_POSITIONS: BrandGridPos[] = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

function CompactNineGridPicker({
  value,
  onChange
}: {
  value: BrandGridPos;
  onChange: (pos: BrandGridPos) => void;
}) {
  return (
    <div className="inline-grid grid-cols-3 gap-1 rounded-xl border border-stone-200/90 bg-[#EFECE5] p-1 dark:border-slate-800 dark:bg-[#141B24]">
      {GRID_POSITIONS.map((pos) => {
        const active = value === pos;
        return (
          <button
            key={pos}
            type="button"
            onClick={() => {
              playUiSound('select');
              onChange(pos);
            }}
            aria-label={`Position ${pos}`}
            className={`flex size-4.5 cursor-pointer items-center justify-center rounded-md transition-all ${
              active
                ? 'bg-amber-500 shadow-xs'
                : 'hover:bg-stone-200/80 dark:hover:bg-white/10'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                active
                  ? 'bg-slate-950'
                  : 'bg-stone-400 dark:bg-slate-500'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

async function processLogoFileToSquarePng(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (err) => reject(err);
      el.src = objectUrl;
    });
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    const minSide = Math.min(img.width, img.height);
    const sx = (img.width - minSide) / 2;
    const sy = (img.height - minSide) / 2;
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

type BlurDropdownMode = 'off' | 'auto' | 'frosted' | 'simple';

export const FreeRecapStudio: React.FC<FreeRecapStudioProps> = ({
  userId = 'UID-84920',
  isFreeTier,
  uiLang,
  activeTab,
  onChangeTab,
  historyJobs,
  onSaveJob,
  onDeleteJob,
  freeRemaining = FREE_DAILY_VIDEO_LIMIT,
  freeLimit = FREE_DAILY_VIDEO_LIMIT,
  proCredits = 25,
  onNavigateToWallet,
  onNavigateToProStudio,
  onNavigateToFreeStudio
}) => {
  const t = UI_TRANSLATIONS[uiLang];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modeSwipeStartXRef = useRef<number | null>(null);
  const modeJustSwipedRef = useRef<boolean>(false);

  // User Payment Tracker on Home Screen
  const [userPayments, setUserPayments] = useState<
    {
      id: string;
      planName: string;
      credits: number;
      amountMmk: string;
      walletType: string;
      txnId: string;
      status: 'pending' | 'approved' | 'rejected';
      rejectionReason?: string;
      createdAt: number;
      approvedAt?: number;
    }[]
  >([]);
  const [dismissedPaymentIds, setDismissedPaymentIds] = useState<Record<string, boolean>>({});
  const [sessionShownPaymentKeys, setSessionShownPaymentKeys] = useState<Record<string, boolean>>({});
  const [persistedSeenPaymentKeys, setPersistedSeenPaymentKeys] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(`ttak_seen_payment_notices_${userId || 'anon'}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`ttak_seen_payment_notices_${userId || 'anon'}`);
      setPersistedSeenPaymentKeys(raw ? JSON.parse(raw) : {});
    } catch {
      setPersistedSeenPaymentKeys({});
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    const fetchPayments = async () => {
      try {
        const res = await fetch(`/api/user/payments?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        if (active && data.ok && Array.isArray(data.payments)) {
          setUserPayments(data.payments);
        }
      } catch {}
    };

    fetchPayments();
    const timer = setInterval(fetchPayments, 3500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [userId]);

  const latestPayment = userPayments[0] || null;
  const shouldShowLatestPaymentBanner = shouldShowPaymentNotificationBanner(
    latestPayment,
    dismissedPaymentIds,
    sessionShownPaymentKeys,
    persistedSeenPaymentKeys
  );

  // Record approved/rejected notices immediately in localStorage once shown in the current session
  // so they display once and never pop back up on website reload.
  useEffect(() => {
    if (!latestPayment || latestPayment.status === 'pending') return;
    if (!shouldShowLatestPaymentBanner) return;
    const key = buildPaymentNoticeKey(latestPayment);
    if (!sessionShownPaymentKeys[key]) {
      setSessionShownPaymentKeys((prev) => ({ ...prev, [key]: true }));
    }
    if (!persistedSeenPaymentKeys[key]) {
      const nextSeen = { ...persistedSeenPaymentKeys, [key]: true };
      setPersistedSeenPaymentKeys(nextSeen);
      try {
        localStorage.setItem(`ttak_seen_payment_notices_${userId || 'anon'}`, JSON.stringify(nextSeen));
      } catch {}
    }
  }, [latestPayment, shouldShowLatestPaymentBanner, sessionShownPaymentKeys, persistedSeenPaymentKeys, userId]);

  // Start clean with no hardcoded pre-loaded video
  const [hasLoadedVideo, setHasLoadedVideo] = useState<boolean>(false);
  const [inputMode, setInputMode] = useState<'upload' | 'tiktok'>('upload');
  const [videoFileUrl, setVideoFileUrl] = useState<string | null>(null);
  const [demoScene, setDemoScene] = useState<DemoScenePreset>('cyberpunk');
  const [originalFilename, setOriginalFilename] = useState<string>('');
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [sourceUrlInput, setSourceUrlInput] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [loadedLocalUploadId, setLoadedLocalUploadId] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
  const [urlLoadError, setUrlLoadError] = useState<string | null>(null);
  const [urlLoadStatusText, setUrlLoadStatusText] = useState<string>('');
  const [isThumbnailStudioOpen, setIsThumbnailStudioOpen] = useState<boolean>(false);

  // Settings Inspector State
  const [mode, setMode] = useState<RecapMode>('recap');
  const [translateAudio, setTranslateAudio] = useState<TranslateAudioMode>('dub');
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('male');
  const [scriptStyle, setScriptStyle] = useState<ScriptStyleId>('narrator');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('original');
  const [targetLanguage, setTargetLanguage] = useState<TargetLanguageCode>('my');

  // Limit & Credit Alert Dialog state (matching AlertDialogs in submit_form_only.js)
  const [limitModalType, setLimitModalType] = useState<
    'daily_limit' | 'duration_limit' | 'insufficient_credits' | null
  >(null);

  // Blur Watermark State ("off" | "auto" | "frosted" | "simple")
  const [blurMode, setBlurMode] = useState<BlurDropdownMode>('off');
  const blurEnabled = blurMode !== 'off';
  const blurStyle: BlurStyleMode = blurMode === 'simple' ? 'simple' : 'frosted';
  const [blurRegions, setBlurRegions] = useState<BlurRegion[]>([]);

  // Subtitle / Captions State (Defaults to box_black yellow-on-black pill bar matching StreamWaveAI output)
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleOverlayConfig>({
    enabled: true,
    style: 'box_black',
    fontStyle: 'Yati_Round',
    subtitleLanguage: 'my',
    x: 50,
    y: 76,
    fontSize: 40,
    maxWidth: 88,
    samplePreviewLight: false
  });
  const [isTranslatingSubtitles, setIsTranslatingSubtitles] = useState<boolean>(false);
  const [subtitleTranslateError, setSubtitleTranslateError] = useState<string | null>(null);
  const subtitleTranslateSeqRef = useRef<number>(0);

  const handleChangeSubtitleLanguage = async (nextSubLang: TargetLanguageCode) => {
    playUiSound('select');
    setSubtitleTranslateError(null);
    setSubtitleConfig((prev) => ({
      ...prev,
      subtitleLanguage: nextSubLang
    }));
    if (cues.length === 0) return;

    const reqSeq = ++subtitleTranslateSeqRef.current;
    setIsTranslatingSubtitles(true);
    try {
      const freeUserKeys = isFreeTier ? loadFreeUserApiKeys() : { geminiKey: '', groqKey: '' };
      const resp = await fetch('/api/recap/translate-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cues,
          subtitleLanguage: nextSubLang,
          sourceLanguage: targetLanguage,
          isFreeMode: isFreeTier,
          userGeminiApiKey: isFreeTier && freeUserKeys.geminiKey ? freeUserKeys.geminiKey : undefined,
          userGroqApiKey: isFreeTier && freeUserKeys.groqKey ? freeUserKeys.groqKey : undefined
        })
      });
      const data = await resp.json();
      if (reqSeq !== subtitleTranslateSeqRef.current) return;
      if (data?.ok && Array.isArray(data.cues)) {
        setCues(data.cues);
        if (nextSubLang !== 'my' && typeof data.translatedCount === 'number' && data.translatedCount === 0) {
          setSubtitleTranslateError(
            uiLang === 'my'
              ? 'ဘာသာပြန်မှု ခေတ္တမအောင်မြင်ပါ။ ထပ်မံနှိပ်ကြည့်ပါ။'
              : 'Subtitle translation temporarily unavailable. Please tap again to retry.'
          );
        }
      } else {
        setSubtitleTranslateError(
          data?.error ||
            (uiLang === 'my'
              ? 'စာတန်းထိုး ဘာသာပြန်မှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားကြည့်ပါ။'
              : 'Failed to translate subtitles. Please retry.')
        );
      }
    } catch {
      if (reqSeq !== subtitleTranslateSeqRef.current) return;
      setSubtitleTranslateError(
        uiLang === 'my'
          ? 'Network ချိတ်ဆက်မှု အဆင်မပြေပါ။ ထပ်မံနှိပ်ကြည့်ပါ။'
          : 'Network error while translating subtitles. Please retry.'
      );
    } finally {
      if (reqSeq === subtitleTranslateSeqRef.current) {
        setIsTranslatingSubtitles(false);
      }
    }
  };

  // Anti-Copyright / Edit Effects State:
  // In Credit Mode, ONLY FHD 1080p is ON by default; Dynamic zoom, Mirror flip, Color shift, Slight crop, Film grain, Audio pitch start OFF until user enables them.
  const [effects, setEffects] = useState<AntiCopyrightEffects>(() =>
    getDefaultAntiCopyrightEffects(isFreeTier)
  );
  const prevFreeTierRef = useRef<boolean>(isFreeTier);

  // DeepRecap Studio Framing, Cover Band, Brand Overlay & Caption Color State
  const [editConfig, setEditConfig] = useState<DeepRecapEditConfig>(DEFAULT_DEEPRECAP_EDIT_CONFIG);
  const [isBrandCardOpen, setIsBrandCardOpen] = useState<boolean>(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  // Strip Watermark Text & Circular Brand Logo completely when in Free Mode (Credit Mode Only feature)
  const effectiveEditConfig: DeepRecapEditConfig = isFreeTier
    ? {
        ...editConfig,
        watermarkText: { ...editConfig.watermarkText, enabled: false },
        brandLogo: { ...editConfig.brandLogo, enabled: false }
      }
    : editConfig;

  // Sync Free Tier vs Pro Credit Tier effect defaults & Voice restriction when switching routes
  useEffect(() => {
    const modeChanged = prevFreeTierRef.current !== isFreeTier;
    prevFreeTierRef.current = isFreeTier;
    if (isFreeTier) {
      setEffects((prev) => ({ ...prev, outputHD: false, zoom: false }));
      if (!isVoiceAllowedInMode(voiceGender, true)) {
        setVoiceGender('male');
      }
    } else if (modeChanged) {
      // Entering Credit Mode: ONLY FHD 1080p is auto-enabled; all optional edit toggles stay OFF
      setEffects(getDefaultAntiCopyrightEffects(false));
    }
  }, [isFreeTier, voiceGender]);

  // Interactive Canvas Edit Mode (`e$` in submit_form_only.js)
  const [isOverlayEditMode, setIsOverlayEditMode] = useState<boolean>(false);

  // Uploaded File ref for server-side audio extraction & ffmpeg muxing
  const uploadedFileRef = useRef<File | null>(null);

  // Generated Cues, Audio, and Render State
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [audioBase64, setAudioBase64] = useState<string | undefined>(undefined);
  const [hasMuxedAudio, setHasMuxedAudio] = useState<boolean>(false);
  const [dubbedVideoUrl, setDubbedVideoUrl] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderMessage, setRenderMessage] = useState<string>('');
  const [isDone, setIsDone] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const [dubbedBlobUrl, setDubbedBlobUrl] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [voiceoverMp3Url, setVoiceoverMp3Url] = useState<string | null>(null);
  const [isExportingVideo, setIsExportingVideo] = useState<boolean>(false);
  const [exportProgressPct, setExportProgressPct] = useState<number>(0);
  const [studioErrorMsg, setStudioErrorMsg] = useState<string | null>(null);
  const studioErrorRef = useRef<HTMLDivElement | null>(null);
  const [isDownloadingMp3, setIsDownloadingMp3] = useState<boolean>(false);

  // AI Voice Preview State (Listen to Thiha / Nilar / Pro Voices before generating video)
  const voicePreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [settingsSubTab, setSettingsSubTab] = useState<'video' | 'voice' | 'captions' | 'extra'>('video');
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState<boolean>(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<VoiceGender | null>(null);
  const [isLoadingVoicePreview, setIsLoadingVoicePreview] = useState<boolean>(false);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState<boolean>(false);
  const [voicePreviewSampleLine, setVoicePreviewSampleLine] = useState<string>('');

  useEffect(() => {
    if (!isVoicePickerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsVoicePickerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVoicePickerOpen]);

  const handlePreviewVoice = async (targetVoice?: VoiceGender) => {
    const voiceToPlay = targetVoice || voiceGender;
    playUiSound('tap');
    if (isPlayingVoicePreview && voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current.currentTime = 0;
      setIsPlayingVoicePreview(false);
      if (!targetVoice || previewingVoiceId === voiceToPlay) {
        setPreviewingVoiceId(null);
        return;
      }
    }
    if (isLoadingVoicePreview) return;

    setPreviewingVoiceId(voiceToPlay);
    setIsLoadingVoicePreview(true);
    const sampleText = getVoicePreviewSampleText(voiceToPlay, targetLanguage);
    setVoicePreviewSampleLine(sampleText);

    try {
      const freeUserKeys = isFreeTier ? loadFreeUserApiKeys() : { geminiKey: '', groqKey: '' };
      const res = await fetch('/api/recap/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceGender: voiceToPlay,
          targetLanguage,
          text: sampleText,
          ttsEngine: isFreeTier ? 'edge-neural' : loadSavedApiEngineConfig().ttsEngine,
          isFreeMode: isFreeTier,
          userGeminiApiKey: isFreeTier && freeUserKeys.geminiKey ? freeUserKeys.geminiKey : undefined
        })
      });
      const data = await res.json();
      if (data.ok && data.audio_base64) {
        if (voicePreviewAudioRef.current) {
          voicePreviewAudioRef.current.pause();
        }
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        voicePreviewAudioRef.current = audio;
        audio.onended = () => {
          setIsPlayingVoicePreview(false);
          setPreviewingVoiceId(null);
        };
        audio.onerror = () => {
          setIsPlayingVoicePreview(false);
          setPreviewingVoiceId(null);
        };
        setIsPlayingVoicePreview(true);
        await audio.play();
      } else {
        setPreviewingVoiceId(null);
      }
    } catch (err) {
      console.warn('[VoicePreview] Error:', err);
      setIsPlayingVoicePreview(false);
      setPreviewingVoiceId(null);
    } finally {
      setIsLoadingVoicePreview(false);
    }
  };

  const creditCost = calculateCreditCost(videoDuration || 60, isFreeTier, {
    voiceGender,
    useVision: !isFreeTier && effects.zoom
  });

  // Helper to read uploaded video File as base64 string for server-side ffmpeg audio extraction & muxing
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = typeof reader.result === 'string' ? reader.result : '';
        const commaIdx = res.indexOf(',');
        resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

  // Handle local video file upload
  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    playUiSound('open');
    if (videoFileUrl && videoFileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoFileUrl);
    }
    uploadedFileRef.current = file;
    setLoadedLocalUploadId(null);
    setUrlLoadError(null);
    const objUrl = URL.createObjectURL(file);
    setVideoFileUrl(objUrl);
    setOriginalFilename(file.name);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
    setHasLoadedVideo(true);
    setIsDone(false);
    setStudioErrorMsg(null);
    setCues([]);
    setAudioBase64(undefined);
    setHasMuxedAudio(false);
    setDubbedVideoUrl(null);
    setLastJobId(null);
    setVoiceoverMp3Url(null);
    if (dubbedBlobUrl) {
      URL.revokeObjectURL(dubbedBlobUrl);
      setDubbedBlobUrl(null);
    }
    try {
      const probeEl = document.createElement('video');
      probeEl.preload = 'metadata';
      probeEl.src = objUrl;
      probeEl.onloadedmetadata = () => {
        if (probeEl.duration && Number.isFinite(probeEl.duration) && probeEl.duration > 0.5) {
          setVideoDuration(Math.round(probeEl.duration));
        }
      };
    } catch {}
  };

  // Fetch real video from pasted TikTok / YouTube / Facebook / Instagram / Direct MP4 link
  const handleLoadVideoUrl = async () => {
    if (isLoadingUrl) return;
    const parsedUrl = parseAndNormalizeVideoSourceUrl(sourceUrlInput);
    if (!parsedUrl.valid) {
      playUiSound('blocked');
      setUrlLoadError(
        uiLang === 'my'
          ? parsedUrl.errorMy || 'ဗီဒီယို Link မှန်ကန်စွာ ထည့်သွင်းပါ။'
          : parsedUrl.errorEn || 'Please enter a valid video URL.'
      );
      return;
    }

    playUiSound('tap');
    setIsLoadingUrl(true);
    setUrlLoadError(null);
    setStudioErrorMsg(null);
    setUrlLoadStatusText(
      uiLang === 'my' ? 'Video Link မှ ဗီဒီယို ဆွဲယူနေပါသည်...' : 'Fetching video from URL...'
    );

    try {
      const startResp = await fetch('/api/recap/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: parsedUrl.normalizedUrl,
          asyncMode: true
        })
      });
      const rawStart = await startResp.text();
      let startData: any = null;
      if (rawStart && !rawStart.trim().startsWith('<')) {
        try {
          startData = JSON.parse(rawStart);
        } catch {}
      }
      if (!startData) {
        throw new Error(
          uiLang === 'my'
            ? 'Server ချိတ်ဆက်မှု အချိန်ကြာသွားပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။'
            : 'Invalid server response while loading URL.'
        );
      }

      let resolvedResult: any = null;
      if (startData.ok && startData.async && startData.fetch_id) {
        const fetchId = String(startData.fetch_id);
        const deadline = Date.now() + 3 * 60 * 1000;
        let consecutiveErrs = 0;
        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, computeNextPollDelayMs(consecutiveErrs)));
          let pollResp: Response;
          let pollText = '';
          try {
            pollResp = await fetch(`/api/recap/fetch-url-status/${encodeURIComponent(fetchId)}`, {
              cache: 'no-store'
            });
            pollText = await pollResp.text();
          } catch {
            consecutiveErrs++;
            if (consecutiveErrs > 12) {
              throw new Error(
                uiLang === 'my'
                  ? 'အင်တာနက် ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။'
                  : 'Network connection interrupted while fetching video URL.'
              );
            }
            continue;
          }

          if (isTransientPollHttpStatus(pollResp.status) || pollText.trim().startsWith('<')) {
            consecutiveErrs++;
            continue;
          }

          let pollData: any = null;
          try {
            pollData = JSON.parse(pollText);
          } catch {
            consecutiveErrs++;
            continue;
          }
          consecutiveErrs = 0;

          if (pollData?.status === 'processing') {
            if (pollData.stage_message) {
              setUrlLoadStatusText(
                uiLang === 'my'
                  ? `Video Link မှ ဆွဲယူနေပါသည် (${pollData.progress || 40}%)...`
                  : String(pollData.stage_message)
              );
            }
            continue;
          }
          if (pollData?.status === 'done' && pollData.result?.ok) {
            resolvedResult = pollData.result;
            break;
          }
          if (pollData?.status === 'error' || pollData?.ok === false) {
            throw new Error(
              (uiLang === 'my' ? pollData.error : pollData.error_en || pollData.error) ||
                'Could not fetch video from this URL.'
            );
          }
        }
      } else if (startData.ok && startData.videoUrl) {
        resolvedResult = startData;
      } else {
        throw new Error(
          (uiLang === 'my' ? startData.error : startData.error_en || startData.error) ||
            'Could not fetch video from this URL.'
        );
      }

      if (!resolvedResult?.videoUrl || !resolvedResult?.localUploadId) {
        throw new Error(
          uiLang === 'my'
            ? 'ဗီဒီယို Link မှ ဖိုင်ဆွဲယူချိန် ကျော်လွန်သွားပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။'
            : 'Timed out while fetching video from URL.'
        );
      }

      playUiSound('open');
      if (videoFileUrl && videoFileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoFileUrl);
      }
      uploadedFileRef.current = null;
      setLoadedLocalUploadId(String(resolvedResult.localUploadId));
      setVideoFileUrl(String(resolvedResult.videoUrl));
      setOriginalFilename(String(resolvedResult.filename || 'URL_Video.mp4'));
      setVideoTitle(String(resolvedResult.title || resolvedResult.filename || parsedUrl.normalizedUrl));
      setVideoDuration(Math.max(1, Math.round(Number(resolvedResult.durationSec) || 15)));
      setCues([]);
      setAudioBase64(undefined);
      setHasMuxedAudio(false);
      setDubbedVideoUrl(null);
      setLastJobId(null);
      setVoiceoverMp3Url(null);
      if (dubbedBlobUrl) {
        URL.revokeObjectURL(dubbedBlobUrl);
        setDubbedBlobUrl(null);
      }
      setIsDone(false);
      setUrlLoadError(null);
      setHasLoadedVideo(true);
    } catch (err) {
      playUiSound('blocked');
      const msg = err instanceof Error ? err.message : 'Failed to load video URL.';
      setUrlLoadError(msg);
    } finally {
      setIsLoadingUrl(false);
      setUrlLoadStatusText('');
    }
  };

  // Load a saved Recap Job from the History tab (`rI()`)
  const handleSelectHistoryJob = (job: RecapJobRecord) => {
    playUiSound('select');
    uploadedFileRef.current = null;
    setLoadedLocalUploadId(null);
    setUrlLoadError(null);
    setOriginalFilename(job.original_filename || job.title);
    setVideoTitle(job.title);
    setVideoDuration(job.durationSec);
    setMode(job.mode);
    setTranslateAudio(job.translateAudio || 'dub');
    setScriptStyle(job.scriptStyle);
    setTargetLanguage(job.targetLanguage);
    setVoiceGender(
      isFreeTier && !isVoiceAllowedInMode(job.voiceGender, true) ? 'male' : job.voiceGender
    );
    setAspectRatio(job.aspectRatio);
    setBlurRegions(job.blurRegions || []);
    setBlurMode(job.blurRegions && job.blurRegions.length > 0 ? job.blurStyle : 'off');
    setSubtitleConfig(job.subtitleConfig);
    setEffects(job.effects);
    setEditConfig(job.editConfig || DEFAULT_DEEPRECAP_EDIT_CONFIG);
    setCues(job.cues || []);
    setAudioBase64(job.audioBase64);
    const isMuxedUrl = Boolean(job.videoUrl && job.videoUrl.startsWith('/api/recap/video/'));
    setHasMuxedAudio(isMuxedUrl);
    setDubbedVideoUrl(isMuxedUrl ? job.videoUrl : null);
    const extractedJobId = extractJobIdFromVideoUrl(job.videoUrl);
    setLastJobId(extractedJobId);
    setVoiceoverMp3Url(
      extractedJobId && job.translateAudio !== 'captions-only'
        ? `/api/recap/audio/${extractedJobId}_voiceover.mp3`
        : null
    );
    if (job.videoUrl?.includes('island')) setDemoScene('island');
    else if (job.videoUrl?.includes('scifi')) setDemoScene('scifi');
    else setDemoScene('cyberpunk');
    setVideoFileUrl(job.videoUrl);
    setHasLoadedVideo(true);
    setIsDone(true);
    setMobileDrawerOpen(false);
  };

  /**
   * Executes:
   * - Free Mode (`isFreeTier === true`):
   *   Enforces max 3 videos/day (`freeRemaining > 0`) and max 2 minutes (`videoDuration <= 120s`).
   * - Credit / Pro Server Mode (`isFreeTier === false`):
   *   Enforces `proCredits >= creditCost` and deducts exact credits on completion.
   */
  const handleRunAutoFlow = async () => {
    if (!hasLoadedVideo || isGenerating) return;

    if (isFreeTier) {
      if (freeRemaining <= 0) {
        playUiSound('blocked');
        setLimitModalType('daily_limit');
        return;
      }
      if ((videoDuration || 0) > FREE_MAX_DURATION_SEC) {
        playUiSound('blocked');
        setLimitModalType('duration_limit');
        return;
      }
      if (uploadedFileRef.current || loadedLocalUploadId) {
        const freeUserKeysCheck = loadFreeUserApiKeys();
        if (!freeUserKeysCheck.geminiKey || freeUserKeysCheck.geminiKey.trim().length < 12) {
          playUiSound('blocked');
          setStudioErrorMsg(
            uiLang === 'my'
              ? 'Free Mode တွင် Admin ၏ Credit Mode API Key များကို အသုံးပြုခွင့် ပိတ်ထားပါသည်။ ထိပ်ဆုံးရှိ Settings ခလုတ် (/settings) ကိုနှိပ်၍ သင့်ကိုယ်ပိုင် Gemini API Key ထည့်သွင်းပါ (သို့မဟုတ် Credit Mode သို့ ပြောင်းသုံးပါ)။'
              : 'Admin Credit Mode API keys are disabled in Free Mode. Please open Settings (/settings) at the top bar and enter your own Gemini API Key, or switch to Credit Mode.'
          );
          setTimeout(() => {
            studioErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 60);
          return;
        }
      }
    } else {
      if (proCredits < creditCost) {
        playUiSound('blocked');
        setLimitModalType('insufficient_credits');
        return;
      }
    }

    playUiSound('tap');
    setIsGenerating(true);
    setIsDone(false);
    setStudioErrorMsg(null);
    const logs: AutoFlowLogStep[] = [];

    try {
      const safeDur = Math.max(8, videoDuration || 15);

      if (isFreeTier) {
        setRenderProgress(10);
        setRenderMessage('Extracting audio...');
        await new Promise((r) => setTimeout(r, 220));
      } else {
        setRenderProgress(10);
        setRenderMessage('Preparing video upload...');
        await new Promise((r) => setTimeout(r, 150));
      }

      let r2ObjectKeyPayload: string | undefined;
      let localUploadIdPayload: string | undefined;
      if (uploadedFileRef.current) {
        try {
          setRenderProgress(12);
          setRenderMessage('Uploading video directly...');
          // Cloudflare R2 Direct is enabled ONLY in Credit Mode (`!isFreeTier`); Free Mode uses local direct stream
          const uploadRes = await uploadVideoDirect(
            uploadedFileRef.current,
            (pct, detail) => {
              const mapped = Math.min(35, 10 + Math.round((pct / 100) * 25));
              setRenderProgress(mapped);
              setRenderMessage(detail);
            },
            'recap',
            !isFreeTier
          );
          r2ObjectKeyPayload = uploadRes.r2ObjectKey;
          localUploadIdPayload = uploadRes.localUploadId;
          if (uploadRes.localUploadId) {
            setLoadedLocalUploadId(uploadRes.localUploadId);
          }
        } catch (uploadErr) {
          console.warn('Direct upload warning:', uploadErr);
          throw uploadErr;
        }
      } else if (loadedLocalUploadId) {
        localUploadIdPayload = loadedLocalUploadId;
        setRenderProgress(35);
        setRenderMessage('Using loaded URL video...');
      }

      const savedEngineCfg = loadSavedApiEngineConfig();
      const freeUserKeys = isFreeTier ? loadFreeUserApiKeys() : { geminiKey: '', groqKey: '' };
      const requestPayload = {
        asyncMode: true,
        isFreeMode: isFreeTier,
        userGeminiApiKey: isFreeTier && freeUserKeys.geminiKey ? freeUserKeys.geminiKey : undefined,
        userGroqApiKey: isFreeTier && freeUserKeys.groqKey ? freeUserKeys.groqKey : undefined,
        durationSec: safeDur,
        mode,
        translateAudio,
        scriptStyle,
        targetLanguage,
        voiceGender,
        customPrompt:
          mode === 'translate'
            ? buildCinematicTranslateSystemPrompt({ targetLanguage, translateAudio })
            : SCRIPT_STYLE_PROMPTS[scriptStyle].systemPrompt,
        title: videoTitle || originalFilename,
        r2ObjectKey: r2ObjectKeyPayload,
        localUploadId: localUploadIdPayload,
        pitchShift: effects.pitchShift,
        mirrorFlip: effects.mirror,
        effects,
        scriptModel: savedEngineCfg.scriptModel,
        ttsEngine: savedEngineCfg.ttsEngine,
        sttModel: savedEngineCfg.sttModel,
        breathPauseMs: savedEngineCfg.breathPauseMs,
        dynamicTempoFit: savedEngineCfg.dynamicTempoFit,
        subtitleConfig,
        blurEnabled,
        blurRegions,
        aspectRatio,
        editConfig: effectiveEditConfig
      };

      setRenderProgress(37);
      setRenderMessage('Starting recap...');

      const submitAndPollRecapJob = async () => {
        const response = await fetch('/api/recap/free/generate-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload)
        });

        const rawRespText = await response.text();
        let data: any = null;
        if (rawRespText && !rawRespText.trim().startsWith('<')) {
          try {
            data = JSON.parse(rawRespText);
          } catch {}
        }

        if (!data) {
          throw new Error(
            uiLang === 'my'
              ? 'Server ချိတ်ဆက်မှု အချိန်ကြာသွားပါသည် (Cloudflare/Gateway timeout)။ ပြန်လည်ကြိုးစားကြည့်ပါ။'
              : 'Server returned an invalid/HTML gateway response. Please retry.'
          );
        }

        if (data.ok && data.async && data.job_id) {
          const pollJobId = String(data.job_id);
          const pollDeadline = Date.now() + 12 * 60 * 1000;
          let finalPayload: any = null;
          let consecutivePollErrors = 0;
          while (Date.now() < pollDeadline) {
            await new Promise((r) => setTimeout(r, computeNextPollDelayMs(consecutivePollErrors)));
            let stResp: Response;
            let stText = '';
            try {
              stResp = await fetch(`/api/recap/job-status/${encodeURIComponent(pollJobId)}`, {
                cache: 'no-store',
                signal: AbortSignal.timeout(12000)
              });
              stText = await stResp.text();
            } catch {
              consecutivePollErrors++;
              if (consecutivePollErrors >= 3) {
                setRenderMessage(`Reconnecting to server (${consecutivePollErrors}/15)...`);
              }
              if (consecutivePollErrors >= 15) {
                throw new Error(
                  uiLang === 'my'
                    ? 'အင်တာနက်ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည်။ Network ပြန်စစ်ပြီး ထပ်မံကြိုးစားကြည့်ပါ။'
                    : 'Lost network connection while checking recap progress. Please retry.'
                );
              }
              continue;
            }

            let stData: any = null;
            if (stText && !stText.trim().startsWith('<')) {
              try {
                stData = JSON.parse(stText);
              } catch {}
            }
            if (!stData) {
              if (isTransientPollHttpStatus(stResp.status) || consecutivePollErrors < 12) {
                consecutivePollErrors++;
                continue;
              }
              throw new Error(
                uiLang === 'my'
                  ? 'Server တုံ့ပြန်မှု ပုံစံမမှန်ပါ (Gateway timeout)။ ပြန်လည်ကြိုးစားကြည့်ပါ။'
                  : 'Server returned an invalid gateway response while polling.'
              );
            }

            if (isTransientPollHttpStatus(stResp.status) && stData.status !== 'error') {
              consecutivePollErrors++;
              continue;
            }

            consecutivePollErrors = 0;
            if (typeof stData.progress === 'number') {
              setRenderProgress((prev) => Math.max(prev, Math.min(98, stData.progress)));
            }
            if (stData.stage_message) {
              setRenderMessage(sanitizeRecapProgressMessage(String(stData.stage_message)));
            }
            if (stData.status === 'done' && stData.result) {
              finalPayload = stData.result;
              break;
            }
            if (stData.status === 'error' || stData.ok === false) {
              const errObj = new Error(
                (uiLang === 'my' ? stData.error : stData.error_en || stData.error) ||
                  stData.error ||
                  'AI script generation failed'
              ) as Error & { errorCode?: string };
              errObj.errorCode = stData.error_code;
              throw errObj;
            }
          }
          if (!finalPayload) {
            throw new Error(
              uiLang === 'my'
                ? 'Recap ထုတ်လုပ်မှု အချိန်ကျော်လွန်သွားပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။'
                : 'Recap processing timed out. Please retry.'
            );
          }
          return finalPayload;
        } else if (!data.ok) {
          const errObj = new Error(
            (uiLang === 'my' ? data.error : data.error_en || data.error) ||
              data.error ||
              'Failed to generate recap assets'
          ) as Error & { errorCode?: string };
          errObj.errorCode = data.error_code;
          throw errObj;
        }
        return data;
      };

      let data: any;
      try {
        data = await submitAndPollRecapJob();
      } catch (firstPassErr: any) {
        const isOverloadErr =
          firstPassErr?.errorCode === 'overloaded' ||
          String(firstPassErr?.message || '').includes('503');
        if (!isOverloadErr) {
          throw firstPassErr;
        }
        setRenderProgress(58);
        setRenderMessage('Server busy — retrying automatically...');
        await new Promise((r) => setTimeout(r, 3500));
        data = await submitAndPollRecapJob();
      }

      const generatedCues: SubtitleCue[] = data.cues || [];
      const authoritativeDur = Math.round(
        resolveEffectiveVideoDurationSec(Number(data.duration_sec), safeDur, generatedCues)
      );
      setVideoDuration(authoritativeDur);
      setCues(generatedCues);
      setAudioBase64(data.audio_base64);
      setLastJobId(data.job_id || null);
      setVoiceoverMp3Url(data.voiceover_mp3_url || null);

      const hasLocalBlobStage = Boolean(
        uploadedFileRef.current && videoFileUrl && videoFileUrl.startsWith('blob:')
      );

      let finalVideoUrl = videoFileUrl || '';
      if (data.dubbed_video_url) {
        finalVideoUrl = data.dubbed_video_url;
        setDubbedVideoUrl(data.dubbed_video_url);
        if (!hasLocalBlobStage) {
          // URL / demo jobs switch to server-rendered inline stream
          setVideoFileUrl(data.preview_video_url || data.dubbed_video_url);
          setHasMuxedAudio(true);
        } else {
          // Keep the instant local blob: video on stage so screen never goes black or freezes; companion MP3/WAV plays in sync!
          setHasMuxedAudio(false);
        }
      } else {
        setHasMuxedAudio(false);
      }

      setRenderProgress(98);
      setRenderMessage(isFreeTier ? 'Finalizing recap video...' : 'Done!');
      await new Promise((r) => setTimeout(r, 80));

      setRenderProgress(100);
      setIsDone(true);

      const newJob: RecapJobRecord = {
        id: `sw-job-${Date.now()}`,
        ulid: `${isFreeTier ? 'free' : 'pro'}_${Date.now()}`,
        original_filename: originalFilename || 'Video Recap.mp4',
        title: data.title || videoTitle || originalFilename || 'Video Recap',
        sourceUrl: sourceUrlInput || undefined,
        createdAt: 'Just now',
        durationSec: authoritativeDur,
        resolution: effects.outputHD ? '1080p' : '720p',
        mode,
        translateAudio: mode === 'translate' ? translateAudio : undefined,
        scriptStyle,
        targetLanguage,
        voiceGender,
        aspectRatio,
        status: 'done',
        videoUrl: finalVideoUrl,
        audioBase64: data.audio_base64,
        scriptText: data.script_text || '',
        systemPromptUsed:
          mode === 'translate'
            ? buildCinematicTranslateSystemPrompt({ targetLanguage, translateAudio })
            : SCRIPT_STYLE_PROMPTS[scriptStyle].systemPrompt,
        cues: generatedCues,
        highlightClips: data.highlight_clips || [],
        blurRegions,
        blurStyle,
        subtitleConfig,
        effects,
        editConfig: effectiveEditConfig,
        autoFlowLogs: logs
      };
      playUiSound('success');
      onSaveJob(newJob, creditCost);
    } catch (err) {
      playUiSound('error');
      const errMsg =
        err instanceof Error && err.message
          ? err.message
          : uiLang === 'my'
            ? 'Recap ထုတ်လုပ်မှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားကြည့်ပါ။'
            : 'Recap generation failed. Please try again.';
      setStudioErrorMsg(errMsg);
      setTimeout(() => {
        studioErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
      console.error('[RecapStudio] Render failed:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download handlers (StreamWaveAI R2 presigned URL flow + verified in-session Blob fallback so Android Chrome never produces .mp4.html)
  const handleDownloadVideo = async () => {
    if (isExportingVideo) return;
    playUiSound('tap');
    setStudioErrorMsg(null);

    const verifyAndTriggerVideoDownload = async (rawUrl: string): Promise<boolean> => {
      try {
        return await downloadVerifiedMp4File({
          videoUrl: rawUrl,
          jobId: lastJobId,
          rawTitle: `${(originalFilename || 'recap').replace(/\.[^.]+$/, '')}_${isFreeTier ? 'free' : 'pro'}_recap`,
          fallbackFilename: isFreeTier ? 'ttak_free_recap' : 'ttak_pro_recap',
          isFreeMode: isFreeTier,
          onProgress: (pct) => setExportProgressPct((prev) => Math.max(prev, pct))
        });
      } catch {
        return false;
      }
    };

    setIsExportingVideo(true);
    setExportProgressPct(10);
    try {
      // 1. Re-burn MP4 asynchronously on server with polling (or return cached <5ms MP4)
      if (lastJobId) {
        const exportFreeKeys = isFreeTier ? loadFreeUserApiKeys() : { geminiKey: '', groqKey: '' };
        const exportRes = await fetch('/api/recap/render-export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            asyncMode: true,
            jobId: lastJobId,
            durationSec: Math.max(8, videoDuration || 15),
            mode,
            translateAudio,
            cues,
            subtitleConfig,
            blurEnabled,
            blurRegions,
            mirrorFlip: effects.mirror,
            effects,
            aspectRatio,
            editConfig: effectiveEditConfig,
            isFreeMode: isFreeTier,
            userGeminiApiKey:
              isFreeTier && exportFreeKeys.geminiKey ? exportFreeKeys.geminiKey : undefined,
            userGroqApiKey:
              isFreeTier && exportFreeKeys.groqKey ? exportFreeKeys.groqKey : undefined
          })
        });
        const exportRaw = await exportRes.text();
        let exportData: any = null;
        if (exportRaw && !exportRaw.trim().startsWith('<')) {
          try {
            exportData = JSON.parse(exportRaw);
          } catch {}
        }

        if (!exportRes.ok || exportData?.ok === false) {
          throw new Error(
            exportData?.error ||
              (uiLang === 'my'
                ? 'စာတန်းထိုး MP4 Export မအောင်မြင်ပါ။ Video ကို ပြန်လည် Generate လုပ်ပြီး Download ဆွဲပေးပါ။'
                : 'Subtitle burn-in MP4 export failed. Please regenerate and try downloading again.')
          );
        }

        let resolvedExportUrl: string | null = null;
        if (exportData?.ok && exportData.dubbed_video_url) {
          resolvedExportUrl = exportData.dubbed_video_url;
        } else if (exportData?.ok && exportData.pending && exportData.exportId) {
          const exportDeadline = Date.now() + 12 * 60 * 1000;
          const exportId = String(exportData.exportId);
          setExportProgressPct(Number(exportData.progress) || 20);
          let consecutiveExportPollErrors = 0;
          while (Date.now() < exportDeadline) {
            await new Promise((r) => setTimeout(r, computeNextPollDelayMs(consecutiveExportPollErrors)));
            let stResp: Response;
            let stRaw = '';
            try {
              stResp = await fetch(`/api/recap/render-status/${encodeURIComponent(exportId)}`, {
                cache: 'no-store',
                signal: AbortSignal.timeout(12000)
              });
              stRaw = await stResp.text();
            } catch {
              consecutiveExportPollErrors++;
              if (consecutiveExportPollErrors >= 15) {
                throw new Error(
                  uiLang === 'my'
                    ? 'Export status စစ်ဆေးနေစဉ် Network ပြတ်တောက်သွားပါသည်။'
                    : 'Lost connection while rendering subtitled MP4 export.'
                );
              }
              continue;
            }
            let stData: any = null;
            if (stRaw && !stRaw.trim().startsWith('<')) {
              try {
                stData = JSON.parse(stRaw);
              } catch {}
            }
            if (!stData) {
              consecutiveExportPollErrors++;
              continue;
            }
            consecutiveExportPollErrors = 0;
            if (typeof stData.progress === 'number') {
              setExportProgressPct(stData.progress);
            }
            if (stData.status === 'done' && stData.dubbed_video_url) {
              resolvedExportUrl = stData.dubbed_video_url;
              break;
            }
            if (stData.status === 'error' || stData.ok === false) {
              throw new Error(stData.error || 'Subtitle MP4 export render failed');
            }
          }
        }

        if (!resolvedExportUrl) {
          throw new Error(
            uiLang === 'my'
              ? 'စာတန်းထိုး MP4 ဖန်တီးမှု အချိန်ကျော်လွန်သွားပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။'
              : 'Timed out waiting for subtitled MP4 export. Please try again.'
          );
        }

        setExportProgressPct(100);
        setDubbedVideoUrl(resolvedExportUrl);
        const valid = await verifyAndTriggerVideoDownload(resolvedExportUrl);
        if (valid) return;
        throw new Error(
          uiLang === 'my'
            ? 'Export လုပ်ထားသော MP4 ဖိုင်ကို Download ဆွဲ၍မရပါ။ ထပ်မံကြိုးစားကြည့်ပါ။'
            : 'Exported subtitled MP4 failed verification. Please try again.'
        );
      }

      if (dubbedBlobUrl) {
        const validBlob = await verifyAndTriggerVideoDownload(dubbedBlobUrl);
        if (validBlob) return;
      }

      if (dubbedVideoUrl) {
        const valid = await verifyAndTriggerVideoDownload(dubbedVideoUrl);
        if (valid) return;
      }

      throw new Error(
        uiLang === 'my'
          ? 'MP4 ဖိုင် Download ပြုလုပ်၍မရပါ (Server restart ဖြစ်သွားခြင်း သို့မဟုတ် Render မအောင်မြင်ခြင်း ဖြစ်နိုင်ပါသည်)။ Recap ကို ထပ်မံ Generate လုပ်ပြီး Download ပြန်ဆွဲပေးပါ။'
          : 'Could not download a valid MP4 file. Please re-generate the recap and try exporting again.'
      );
    } catch (dlErr) {
      playUiSound('error');
      setStudioErrorMsg(
        dlErr instanceof Error
          ? dlErr.message
          : uiLang === 'my'
            ? 'MP4 Export မအောင်မြင်ပါ။ ထပ်မံကြိုးစားကြည့်ပါ။'
            : 'MP4 Export failed. Please try again.'
      );
      console.error('Download failed:', dlErr);
    } finally {
      setIsExportingVideo(false);
      setExportProgressPct(0);
    }
  };

  // Standalone MP3 Audio Download handler (for CapCut / external audio editing)
  const handleDownloadAudioMp3 = async () => {
    if (isDownloadingMp3) return;
    playUiSound('tap');
    const cleanBaseName = `${(originalFilename || 'recap').replace(/\.[^.]+$/, '')}_${isFreeTier ? 'free' : 'pro'}_audio`;

    setIsDownloadingMp3(true);
    try {
      let targetMp3Url = voiceoverMp3Url;

      // If no pre-generated MP3 URL is available (e.g. older History item), convert audioBase64 WAV to MP3 on server
      if (!targetMp3Url && audioBase64) {
        const convRes = await fetch('/api/recap/convert-wav-to-mp3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64 })
        });
        const convData = await convRes.json();
        if (convData.ok && convData.voiceover_mp3_url) {
          targetMp3Url = convData.voiceover_mp3_url;
          setVoiceoverMp3Url(targetMp3Url);
        }
      }

      if (targetMp3Url) {
        const mp3Resp = await fetch(targetMp3Url);
        if (mp3Resp.ok) {
          const buf = await mp3Resp.arrayBuffer();
          const mp3Blob = new Blob([buf], { type: 'audio/mpeg' });
          const blobUrl = URL.createObjectURL(mp3Blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${cleanBaseName}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          return;
        }
      }

      // Fallback if server MP3 is unreachable
      if (audioBase64) {
        const a = document.createElement('a');
        a.href = `data:audio/mpeg;base64,${audioBase64}`;
        a.download = `${cleanBaseName}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (mp3Err) {
      console.error('MP3 Audio download failed:', mp3Err);
    } finally {
      setIsDownloadingMp3(false);
    }
  };

  const handleDownloadSrt = () => {
    playUiSound('tap');
    const srtContent = exportCuesToSrt(cues);
    const blob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(originalFilename || 'recap').replace(/\.[^.]+$/, '')}_burmese.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredHistory = historyJobs.filter(
    (j) =>
      j.original_filename.toLowerCase().includes(historySearch.toLowerCase()) ||
      j.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  const selectedVoiceObj =
    VOICE_OPTIONS.find((v) => v.id === voiceGender) || VOICE_OPTIONS[0];
  const scalePercent = calculateSubtitleScalePercent(subtitleConfig.fontSize);

  const rightSidebarTab: 'settings' | 'history' =
    activeTab === 'history' ? 'history' : 'settings';

  const freeVoices = VOICE_OPTIONS.filter((v) => v.tier === 'free');
  const proVoices = VOICE_OPTIONS.filter((v) => v.tier === 'pro');

  const handleToggleModeSwitch = () => {
    playUiSound('select');
    if (isFreeTier) {
      onNavigateToProStudio?.();
    } else {
      onNavigateToFreeStudio?.();
    }
  };

  const workflowState = resolveStudioWorkflowStep(hasLoadedVideo, isGenerating, isDone);

  const inspectorContent = (
    <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-3 pb-10">
      {rightSidebarTab === 'settings' ? (
            /* Settings Tab — Clean 4-Tab Sectioned Inspector */
            <>
              {/* Mode & Quota / Credit Info Banner with Smooth Swipe/On-Off Switch */}
              <div className="flex flex-col gap-2 rounded-xl border border-stone-200/90 bg-white/85 px-3 py-2.5 text-[11px] dark:border-slate-800 dark:bg-[#111720]">
                <div className="flex items-center justify-between gap-2">
                  {isFreeTier ? (
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-teal-700 dark:text-teal-300 truncate">
                        {uiLang === 'my'
                          ? `Free Mode · တစ်ရက် ${freeLimit} ပုဒ် (၂:၃၀ မိနစ်)`
                          : `Free Mode · ${freeLimit}/day (Max 2:30m)`}
                      </span>
                      <span className="text-[10px] text-stone-500 dark:text-slate-400 tabular-nums">
                        {uiLang === 'my'
                          ? `ယနေ့ကျန်: ${freeRemaining}/${freeLimit} ပုဒ် · Thiha / Nilar အသံ ၂ မျိုး`
                          : `Left today: ${freeRemaining}/${freeLimit} · Thiha & Nilar TTS`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-bold text-amber-600 dark:text-amber-400 truncate">
                        {uiLang === 'my'
                          ? `Credit Mode · R2 + Brand + အသံ ၁၀ မျိုး`
                          : `Credit Mode · R2 + Brand + All 10 Voices`}
                      </span>
                      <span className="text-[10px] text-stone-500 dark:text-slate-400 tabular-nums">
                        {uiLang === 'my'
                          ? `လက်ကျန်: ${proCredits} Cr · ခန့်မှန်းကုန်ကျ: ${creditCost} Cr`
                          : `Balance: ${proCredits} Cr · Est. cost: ${creditCost} Cr`}
                      </span>
                    </div>
                  )}

                  {/* Swipeable On/Off Switch: Free Mode <-> Credit Mode */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!isFreeTier}
                    aria-label="Switch between Free Mode and Credit Mode"
                    data-testid="studio-mode-swipe-toggle"
                    onPointerDown={(e) => {
                      modeSwipeStartXRef.current = e.clientX;
                      modeJustSwipedRef.current = false;
                    }}
                    onPointerUp={(e) => {
                      const startX = modeSwipeStartXRef.current;
                      modeSwipeStartXRef.current = null;
                      if (startX !== null) {
                        const dx = e.clientX - startX;
                        if (Math.abs(dx) >= 16) {
                          modeJustSwipedRef.current = true;
                          if ((dx > 0 && isFreeTier) || (dx < 0 && !isFreeTier)) {
                            handleToggleModeSwitch();
                          }
                        }
                      }
                    }}
                    onClick={() => {
                      if (modeJustSwipedRef.current) {
                        modeJustSwipedRef.current = false;
                        return;
                      }
                      handleToggleModeSwitch();
                    }}
                    className={`relative inline-flex h-8 w-[124px] shrink-0 touch-pan-y cursor-pointer items-center justify-between rounded-xl border p-1 transition-all duration-200 select-none ${
                      !isFreeTier
                        ? 'border-amber-500/40 bg-amber-500/12'
                        : 'border-teal-500/40 bg-teal-500/12'
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute top-0.5 bottom-0.5 w-[58px] rounded-lg shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        !isFreeTier
                          ? 'translate-x-[58px] bg-amber-500'
                          : 'translate-x-0 bg-teal-600'
                      }`}
                    />
                    <span
                      className={`relative z-10 flex w-[58px] items-center justify-center text-[10px] font-bold transition-colors ${
                        isFreeTier ? 'text-white' : 'text-stone-500 dark:text-slate-400'
                      }`}
                    >
                      Free
                    </span>
                    <span
                      className={`relative z-10 flex w-[58px] items-center justify-center text-[10px] font-bold transition-colors ${
                        !isFreeTier ? 'text-slate-950' : 'text-stone-500 dark:text-slate-400'
                      }`}
                    >
                      Credit
                    </span>
                  </button>
                </div>
              </div>

              {/* 4-Tab Section Bar (VIDEO SIZE · Voice · Captions · Copyright Effects) */}
              <div
                role="tablist"
                aria-label="Edit setting sections"
                className="flex items-center justify-between gap-1 rounded-xl border border-stone-200/90 bg-[#EFECE5] p-1 shrink-0 dark:border-slate-800 dark:bg-[#141B24]"
              >
                {(
                  [
                    {
                      id: 'video',
                      label: 'VIDEO SIZE'
                    },
                    {
                      id: 'voice',
                      label: 'Voice'
                    },
                    {
                      id: 'captions',
                      label: 'Captions'
                    },
                    {
                      id: 'extra',
                      label: 'Copyright Effects'
                    }
                  ] as const
                ).map((sub) => {
                  const active = settingsSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      data-testid={`settings-subtab-${sub.id}`}
                      onClick={() => {
                        playUiSound('select');
                        setSettingsSubTab(sub.id);
                      }}
                      className={`flex min-h-[36px] flex-1 cursor-pointer items-center justify-center rounded-lg px-2 text-[10.5px] tracking-tight whitespace-nowrap shrink-0 transition-all ${
                        active
                          ? 'bg-white font-bold text-stone-900 shadow-xs ring-1 ring-black/[0.04] dark:bg-[#1E293B] dark:text-amber-300 dark:ring-amber-400/20'
                          : 'font-medium text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: VIDEO SIZE · Framing, Fit Mode, Zoom, Blur Watermark & Subtitle Cover Band */}
              {settingsSubTab === 'video' && (
                <div
                  data-testid="settings-panel-video"
                  className="flex flex-col gap-3.5 rounded-2xl border border-stone-200/80 bg-white/85 p-3.5 dark:border-slate-800/90 dark:bg-[#111720]"
                >
                  {/* Aspect Ratio */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-500 dark:text-slate-400">
                        Aspect Ratio
                      </span>
                      <span className="font-mono text-[10px] font-semibold text-stone-400 dark:text-slate-500">
                        {aspectRatio === 'original' ? 'Auto' : aspectRatio}
                      </span>
                    </div>
                    <select
                      data-testid="aspect-ratio-select"
                      value={aspectRatio}
                      onChange={(e) => {
                        playUiSound('select');
                        setAspectRatio(e.target.value as AspectRatioMode);
                      }}
                      className="h-10.5 w-full rounded-xl border border-stone-200/90 bg-white px-3 text-xs font-medium text-stone-900 shadow-2xs outline-none focus:border-amber-500 cursor-pointer dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white"
                    >
                      <option value="original">Auto</option>
                      <option value="9:16">9:16 (Portrait / TikTok)</option>
                      <option value="4:5">4:5 (Instagram / FB Portrait)</option>
                      <option value="1:1">1:1 (Square)</option>
                      <option value="16:9">16:9 (Landscape / YouTube)</option>
                    </select>
                  </div>

                  {/* Fit Mode, Position, Focus & Frame Zoom */}
                  <div
                    data-testid="aspect-framing-card"
                    className="flex flex-col gap-2.5 border-t border-stone-200/70 pt-3 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-stone-800 dark:text-slate-200">
                          Fit Mode
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-slate-500">
                          {editConfig.fitMode === 'pad'
                            ? 'ON · Full Frame (Blur BG)'
                            : 'OFF · Fill Frame (Crop)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {(editConfig.padSize !== 1.0 ||
                          editConfig.padX !== 0 ||
                          editConfig.padY !== 0 ||
                          editConfig.frameZoom !== 100) && (
                          <button
                            type="button"
                            onClick={() => {
                              playUiSound('tap');
                              setEditConfig((prev) => ({
                                ...prev,
                                padSize: 1.0,
                                padX: 0,
                                padY: 0,
                                frameZoom: 100
                              }));
                            }}
                            className="cursor-pointer text-[10px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            Reset
                          </button>
                        )}
                        <span
                          className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            editConfig.fitMode === 'pad'
                              ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                              : 'bg-stone-200/80 text-stone-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {editConfig.fitMode === 'pad' ? 'ON' : 'OFF'}
                        </span>
                        <StreamWaveSwitch
                          testId="fit-mode-switch"
                          ariaLabel="Fit Mode"
                          checked={editConfig.fitMode === 'pad'}
                          onCheckedChange={(checked) => {
                            setEditConfig((prev) => ({
                              ...prev,
                              fitMode: checked ? 'pad' : 'crop'
                            }));
                          }}
                        />
                      </div>
                    </div>

                    {aspectRatio !== 'original' && (
                      <>
                        {editConfig.fitMode === 'pad' ? (
                          <div className="flex flex-col gap-2 pt-0.5">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-stone-500 dark:text-slate-400">
                                  Picture size
                                </span>
                                <span className="font-mono font-semibold text-stone-900 dark:text-white">
                                  {editConfig.padSize.toFixed(2)}×
                                </span>
                              </div>
                              <input
                                type="range"
                                data-testid="pad-size-slider"
                                min={1}
                                max={1.6}
                                step={0.05}
                                value={editConfig.padSize}
                                onChange={(e) =>
                                  setEditConfig((prev) => ({
                                    ...prev,
                                    padSize: Number(e.target.value)
                                  }))
                                }
                                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-stone-500 dark:text-slate-400">
                                    Move L/R
                                  </span>
                                  <span className="font-mono font-semibold text-stone-900 dark:text-white">
                                    {editConfig.padX > 0 ? `+${editConfig.padX}` : editConfig.padX}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  data-testid="pad-x-slider"
                                  min={-100}
                                  max={100}
                                  step={5}
                                  value={editConfig.padX}
                                  onChange={(e) =>
                                    setEditConfig((prev) => ({
                                      ...prev,
                                      padX: Number(e.target.value)
                                    }))
                                  }
                                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                                />
                              </div>

                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-stone-500 dark:text-slate-400">
                                    Move U/D
                                  </span>
                                  <span className="font-mono font-semibold text-stone-900 dark:text-white">
                                    {editConfig.padY > 0 ? `+${editConfig.padY}` : editConfig.padY}
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  data-testid="pad-y-slider"
                                  min={-100}
                                  max={100}
                                  step={5}
                                  value={editConfig.padY}
                                  onChange={(e) =>
                                    setEditConfig((prev) => ({
                                      ...prev,
                                      padY: Number(e.target.value)
                                    }))
                                  }
                                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="text-[11px] text-stone-500 dark:text-slate-400">
                              Focus
                            </span>
                            <div className="inline-flex rounded-xl border border-stone-200/80 bg-[#FAF8F4] p-0.5 dark:border-slate-700/80 dark:bg-[#151C26]">
                              {(
                                [
                                  { id: 'top', label: 'Top' },
                                  { id: 'center', label: 'Center' },
                                  { id: 'bottom', label: 'Bottom' }
                                ] as { id: FocusAnchor; label: string }[]
                              ).map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => {
                                    playUiSound('select');
                                    setEditConfig((prev) => ({ ...prev, focus: opt.id }));
                                  }}
                                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                                    editConfig.focus === opt.id
                                      ? 'bg-amber-500 text-slate-950'
                                      : 'text-stone-500 hover:text-stone-900 dark:text-slate-400 dark:hover:text-white'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Frame Zoom (100% - 130%) */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-500 dark:text-slate-400">
                          Frame Zoom
                        </span>
                        <span className="font-mono font-semibold text-stone-900 dark:text-white">
                          {editConfig.frameZoom}%
                        </span>
                      </div>
                      <input
                        type="range"
                        data-testid="frame-zoom-slider"
                        min={100}
                        max={130}
                        step={5}
                        value={editConfig.frameZoom}
                        onChange={(e) =>
                          setEditConfig((prev) => ({
                            ...prev,
                            frameZoom: Number(e.target.value)
                          }))
                        }
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                      />
                    </div>
                  </div>

                  {/* Blur Watermark + Adjust */}
                  <div className="flex flex-col gap-2 border-t border-stone-200/70 pt-3 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <DottedTooltipLabel
                        label="Blur watermark"
                        tooltip="Hides watermarks, channel logos, or captions with blur."
                      />
                      {blurEnabled && (
                        <button
                          type="button"
                          data-testid="blur-adjust-btn"
                          onClick={() => {
                            playUiSound('tap');
                            const nextEdit = !isOverlayEditMode;
                            setIsOverlayEditMode(nextEdit);
                            if (nextEdit) {
                              setMobileDrawerOpen(false);
                            }
                          }}
                          className="cursor-pointer rounded-lg bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 dark:text-amber-300"
                        >
                          {isOverlayEditMode ? 'Done' : 'Adjust'}
                        </button>
                      )}
                    </div>

                    <select
                      data-testid="blur-mode-select"
                      value={blurMode}
                      onChange={(e) => {
                        playUiSound('select');
                        const next = e.target.value as BlurDropdownMode;
                        setBlurMode(next);
                        if (next !== 'off' && blurRegions.length === 0) {
                          setBlurRegions([
                            {
                              id: `blur-${Date.now()}`,
                              x: 4,
                              y: 72,
                              width: 92,
                              height: 10,
                              blurStrength: 24
                            }
                          ]);
                          setIsOverlayEditMode(true);
                        }
                      }}
                      className="h-10.5 w-full rounded-xl border border-stone-200/90 bg-white px-3 text-xs font-medium text-stone-900 shadow-2xs outline-none focus:border-amber-500 cursor-pointer dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white"
                    >
                      <option value="off">Off (No Blur)</option>
                      <option value="auto">Auto (Device Optimized)</option>
                      <option value="frosted">Frosted Glass (iOS & Desktop)</option>
                      <option value="simple">Simple Blur (Fast for Mobile)</option>
                    </select>
                  </div>

                  {/* Full-Width Original Subtitle Cover Band */}
                  <div className="flex flex-col gap-2 border-t border-stone-200/70 pt-3 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-stone-800 dark:text-slate-200">
                        Subtitle Cover Band
                      </span>
                      <StreamWaveSwitch
                        checked={editConfig.coverSubtitleBand.enabled}
                        onCheckedChange={(checked) => {
                          playUiSound('select');
                          setEditConfig((prev) => ({
                            ...prev,
                            coverSubtitleBand: { ...prev.coverSubtitleBand, enabled: checked }
                          }));
                        }}
                      />
                    </div>

                    {editConfig.coverSubtitleBand.enabled && (
                      <div className="grid grid-cols-3 gap-2 pt-0.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-stone-500 dark:text-slate-400">Height</span>
                            <span className="font-mono font-semibold text-stone-900 dark:text-white">
                              {editConfig.coverSubtitleBand.heightPct}%
                            </span>
                          </div>
                          <input
                            type="range"
                            data-testid="cover-band-height-slider"
                            min={3}
                            max={50}
                            step={1}
                            value={editConfig.coverSubtitleBand.heightPct}
                            onChange={(e) =>
                              setEditConfig((prev) => ({
                                ...prev,
                                coverSubtitleBand: {
                                  ...prev.coverSubtitleBand,
                                  heightPct: Number(e.target.value)
                                }
                              }))
                            }
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-stone-500 dark:text-slate-400">Bottom</span>
                            <span className="font-mono font-semibold text-stone-900 dark:text-white">
                              {editConfig.coverSubtitleBand.bottomPct}%
                            </span>
                          </div>
                          <input
                            type="range"
                            data-testid="cover-band-bottom-slider"
                            min={0}
                            max={60}
                            step={1}
                            value={editConfig.coverSubtitleBand.bottomPct}
                            onChange={(e) =>
                              setEditConfig((prev) => ({
                                ...prev,
                                coverSubtitleBand: {
                                  ...prev.coverSubtitleBand,
                                  bottomPct: Number(e.target.value)
                                }
                              }))
                            }
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-stone-500 dark:text-slate-400">Blur</span>
                            <span className="font-mono font-semibold text-stone-900 dark:text-white">
                              {editConfig.coverSubtitleBand.blurStrength}
                            </span>
                          </div>
                          <input
                            type="range"
                            data-testid="cover-band-blur-slider"
                            min={1}
                            max={40}
                            step={1}
                            value={editConfig.coverSubtitleBand.blurStrength}
                            onChange={(e) =>
                              setEditConfig((prev) => ({
                                ...prev,
                                coverSubtitleBand: {
                                  ...prev.coverSubtitleBand,
                                  blurStrength: Number(e.target.value)
                                }
                              }))
                            }
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: VOICE · Mode (Recap/Translate), AI Voice, Script Style & Language */}
              {settingsSubTab === 'voice' && (
                <div
                  data-testid="settings-panel-voice"
                  className="flex flex-col gap-3.5 rounded-2xl border border-stone-200/80 bg-white/85 p-3.5 dark:border-slate-800/90 dark:bg-[#111720]"
                >
                  {/* What to make */}
                  <div className="flex flex-col gap-1.5">
                    <DottedTooltipLabel
                      label="What to make"
                      tooltip="Choose Recap for full voiceover, or Translate to keep original audio."
                    />
                    <SlidingPillToggle
                      options={[
                        { value: 'recap', label: 'Recap' },
                        { value: 'translate', label: 'Translate' }
                      ]}
                      value={mode}
                      onChange={(val) => {
                        playUiSound('select');
                        setMode(val);
                        if (val === 'translate' && translateAudio === 'captions-only') {
                          setSubtitleConfig({ ...subtitleConfig, enabled: true });
                        }
                      }}
                    />
                  </div>

                  {/* Audio (when Translate is selected) */}
                  {mode === 'translate' && (
                    <div className="flex flex-col gap-1.5 border-t border-stone-200/70 pt-3 dark:border-slate-800">
                      <DottedTooltipLabel
                        label="Audio mode"
                        tooltip="Dub translates voices into your language. Captions only keeps original audio and adds subtitles."
                      />
                      <SlidingPillToggle
                        options={[
                          { value: 'dub', label: 'Dub' },
                          { value: 'captions-only', label: 'Captions only' }
                        ]}
                        value={translateAudio}
                        onChange={(val) => {
                          playUiSound('select');
                          setTranslateAudio(val);
                          if (val === 'captions-only') {
                            setSubtitleConfig({ ...subtitleConfig, enabled: true });
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Voice Selector (Free Mode = Thiha & Nilar; Credit Mode = All 10 Voices) */}
                  {(mode === 'recap' || translateAudio === 'dub') && (
                    <div className="flex flex-col gap-2 border-t border-stone-200/70 pt-3 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-500 dark:text-slate-400">
                          Voice
                        </span>
                        <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                          {isFreeTier ? 'Free: 2 Voices' : 'Credit Mode: All 10 Voices'}
                        </span>
                      </div>
                      <button
                        type="button"
                        data-testid="voice-selector-select"
                        onClick={() => {
                          playUiSound('open');
                          setIsVoicePickerOpen(true);
                        }}
                        className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-stone-200/90 bg-white px-3.5 py-2 text-left text-xs text-stone-900 shadow-2xs transition-colors hover:border-amber-500/60 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white dark:hover:border-amber-400/60"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className="size-5 shrink-0 rounded-full border border-white/30 shadow-xs"
                            style={{ background: selectedVoiceObj.orbGradient }}
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                              {selectedVoiceObj.nameEn.split('·')[0].trim()}
                            </span>
                            <span className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                              {selectedVoiceObj.genderLabel} · {selectedVoiceObj.tone}
                            </span>
                          </div>
                        </div>
                        <ChevronDown className="size-4 shrink-0 text-neutral-400" />
                      </button>

                      {/* Interactive AI Voice Preview Button */}
                      <div className="flex flex-col gap-1.5 pt-0.5">
                        <button
                          type="button"
                          data-testid="preview-voice-btn"
                          onClick={() => handlePreviewVoice()}
                          disabled={isLoadingVoicePreview}
                          className={`inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition-all active:scale-98 disabled:opacity-50 ${
                            isPlayingVoicePreview
                              ? 'border-teal-500/60 bg-teal-500/15 text-teal-700 dark:text-teal-300'
                              : 'border-stone-200/90 bg-[#FAF8F4] text-stone-800 hover:bg-stone-100 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-200 dark:hover:bg-[#1D2735]'
                          }`}
                        >
                          {isLoadingVoicePreview ? (
                            <>
                              <Loader2 className="size-3.5 animate-spin text-teal-500" />
                              <span>Synthesizing AI Voice Sample…</span>
                            </>
                          ) : isPlayingVoicePreview ? (
                            <>
                              <Square className="size-3.5 fill-current text-teal-500" />
                              <span>
                                Stop Sample ({selectedVoiceObj.nameEn.split('·')[0].trim()})
                              </span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="size-3.5 text-amber-500" />
                              <span>
                                Preview AI Voice ({selectedVoiceObj.nameEn.split('·')[0].trim()})
                              </span>
                            </>
                          )}
                        </button>

                        {(isPlayingVoicePreview || voicePreviewSampleLine) && (
                          <div
                            data-testid="voice-preview-sample-banner"
                            className="rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-1.5 text-[11px] text-amber-800 dark:text-amber-300"
                          >
                            <span className="font-semibold">
                              {isPlayingVoicePreview ? '🔊 Playing: ' : 'Sample: '}
                            </span>
                            <span>“{voicePreviewSampleLine}”</span>
                          </div>
                        )}
                      </div>

                      {isFreeTier && (
                        <p className="text-[11px] text-stone-500 dark:text-slate-400">
                          Free Mode includes Thiha (Male) & Nilar (Female).
                        </p>
                      )}
                    </div>
                  )}

                  {/* Script style (Recap only) or Cinematic Translation info (Translate) + Language */}
                  <div className="flex flex-col gap-3 border-t border-stone-200/70 pt-3 dark:border-slate-800">
                    {mode === 'recap' ? (
                      <div className="flex flex-col gap-1.5">
                        <DottedTooltipLabel
                          label="Script style"
                          tooltip="Choose the tone and pacing for your narration."
                        />
                        <select
                          value={scriptStyle}
                          onChange={(e) => {
                            playUiSound('select');
                            setScriptStyle(e.target.value as ScriptStyleId);
                          }}
                          className="h-10.5 w-full rounded-xl border border-stone-200/90 bg-white px-3 text-xs font-medium text-stone-900 shadow-2xs outline-none focus:border-amber-500 cursor-pointer dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white"
                        >
                          <option value="narrator">Fast Recap (အမြန်ဆွဲဆောင် ပြောဟန်)</option>
                          <option value="natural">Natural Flow (သဘာဝ အပြောဟန်)</option>
                          <option value="drama">Storytelling (ရုပ်ရှင်ဇာတ်လမ်း ပြောဟန်)</option>
                          <option value="casual">Gen Z (လူငယ်ဆန်ဆန် သွက်လက်ပြောဟန်)</option>
                          <option value="news">News (သတင်းကြေညာ တင်ဆက်ဟန်)</option>
                          <option value="none">Documentary (မှတ်တမ်းရုပ်ရှင် လေးနက်ပြောဟန်)</option>
                        </select>
                        {SCRIPT_STYLE_PROMPTS[scriptStyle]?.descriptionMy && (
                          <p className="text-[11px] leading-relaxed text-stone-500 dark:text-slate-400">
                            {SCRIPT_STYLE_PROMPTS[scriptStyle].descriptionMy}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div
                        data-testid="translate-dialogue-hint"
                        className="rounded-xl border border-teal-500/30 bg-teal-500/8 px-3 py-2 text-[11px] leading-relaxed text-teal-800 dark:border-teal-500/25 dark:bg-teal-500/10 dark:text-teal-200"
                      >
                        <span className="font-bold block">
                          {translateAudio === 'captions-only'
                            ? 'Captions Only · Original Audio + Movie Subtitles'
                            : 'Translate & Dub · Natural Movie Dialogue Dubbing'}
                        </span>
                        <span className="text-[10px] opacity-85">
                          Translates natural spoken character dialogue line-by-line rather than summarizing like a recap.
                        </span>
                      </div>
                    )}

                    {/* Language */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-stone-500 dark:text-slate-400">
                        Language
                      </span>
                      <div className="flex h-10.5 w-full items-center gap-2 rounded-xl border border-stone-200/90 bg-white px-3 text-xs font-medium text-stone-900 shadow-2xs dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white">
                        <span className="text-sm">
                          {TARGET_LANGUAGES.find((l) => l.code === targetLanguage)?.flag || '🇲🇲'}
                        </span>
                        <select
                          value={targetLanguage}
                          onChange={(e) => {
                            playUiSound('select');
                            setTargetLanguage(e.target.value as TargetLanguageCode);
                          }}
                          className="w-full bg-transparent text-xs font-medium text-stone-900 dark:text-white outline-none cursor-pointer"
                        >
                          {TARGET_LANGUAGES.map((l) => (
                            <option
                              key={l.code}
                              value={l.code}
                              className="bg-white dark:bg-[#151C26] text-stone-900 dark:text-white"
                            >
                              {l.labelEn}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: CAPTIONS · Toggle, Style, Subtitle Language, Burmese Fonts, Colors & Scale */}
              {settingsSubTab === 'captions' && (
                <div
                  data-testid="settings-panel-captions"
                  className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/85 p-3.5 dark:border-slate-800/90 dark:bg-[#111720]"
                >
                  {/* Captions Toggle + Style */}
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900 dark:text-white">
                        Captions
                      </span>
                      <StreamWaveSwitch
                        checked={subtitleConfig.enabled}
                        onCheckedChange={(checked) => {
                          setSubtitleConfig({ ...subtitleConfig, enabled: checked });
                          if (!checked && mode === 'translate' && translateAudio === 'captions-only') {
                            setTranslateAudio('dub');
                          }
                        }}
                      />
                    </div>

                    {subtitleConfig.enabled && (
                      <SlidingPillToggle
                        options={[
                          { value: 'outline_black', label: 'Outline' },
                          { value: 'box_black', label: 'Highlight' }
                        ]}
                        value={subtitleConfig.style}
                        onChange={(val) =>
                          setSubtitleConfig({ ...subtitleConfig, style: val })
                        }
                      />
                    )}
                  </div>

                  {!subtitleConfig.enabled && (
                    <p className="border-t border-stone-200/70 pt-3 text-[11px] text-stone-500 dark:border-slate-800 dark:text-slate-400">
                      Captions are turned off. Turn on Captions to customize language, fonts, colors, and size.
                    </p>
                  )}

                  {subtitleConfig.enabled && (
                    <div className="flex flex-col gap-3 border-t border-stone-200/70 pt-3 dark:border-slate-800">
                      {/* Subtitle Display Language Selector */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-stone-500 dark:text-slate-400">
                            Subtitle Language
                          </span>
                          <span className="shrink-0 whitespace-nowrap font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {isTranslatingSubtitles
                              ? 'Translating...'
                              : (subtitleConfig.subtitleLanguage || 'my') === targetLanguage
                                ? `${(subtitleConfig.subtitleLanguage || 'my').toUpperCase()} SUB`
                                : `${(subtitleConfig.subtitleLanguage || 'my').toUpperCase()} SUB · ${targetLanguage.toUpperCase()} VOICE`}
                          </span>
                        </div>

                        <select
                          data-testid="subtitle-language-select"
                          aria-label="Subtitle display language"
                          value={subtitleConfig.subtitleLanguage || 'my'}
                          disabled={isTranslatingSubtitles}
                          onChange={(e) => {
                            void handleChangeSubtitleLanguage(e.target.value as TargetLanguageCode);
                          }}
                          className="h-10.5 w-full rounded-xl border border-stone-200/90 bg-white px-3 text-xs font-semibold text-stone-900 shadow-2xs outline-none focus:border-amber-500 cursor-pointer dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white"
                        >
                          {TARGET_LANGUAGES.map((langOpt) => (
                            <option key={langOpt.code} value={langOpt.code}>
                              {langOpt.flag} {langOpt.labelEn}{' '}
                              {langOpt.code === targetLanguage
                                ? '(Matches Voice Language)'
                                : '(Translated Subtitles)'}
                            </option>
                          ))}
                        </select>

                        {/* Quick Language Chips */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {TARGET_LANGUAGES.map((langOpt) => {
                            const activeSubLang = subtitleConfig.subtitleLanguage || 'my';
                            const isSelected = activeSubLang === langOpt.code;
                            return (
                              <button
                                key={langOpt.code}
                                type="button"
                                data-testid={`subtitle-lang-chip-${langOpt.code}`}
                                disabled={isTranslatingSubtitles}
                                onClick={() => {
                                  void handleChangeSubtitleLanguage(langOpt.code);
                                }}
                                className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-amber-500/80 bg-amber-500/12 text-amber-800 dark:text-amber-300 shadow-2xs'
                                    : 'border-stone-200/80 bg-[#FAF8F4] text-stone-700 hover:border-stone-300 dark:border-slate-800 dark:bg-[#151C26] dark:text-slate-300'
                                }`}
                              >
                                <span>{langOpt.flag}</span>
                                <span className="truncate">{langOpt.labelEn}</span>
                              </button>
                            );
                          })}
                        </div>

                        {subtitleTranslateError && (
                          <p
                            data-testid="subtitle-translate-error"
                            className="text-[11px] leading-relaxed text-rose-600 dark:text-rose-400"
                          >
                            {subtitleTranslateError}
                          </p>
                        )}

                        {(subtitleConfig.subtitleLanguage || 'my') !== targetLanguage && (
                          <p className="text-[11px] leading-relaxed text-teal-700 dark:text-teal-400">
                            ✓ Voiceover stays{' '}
                            {TARGET_LANGUAGES.find((l) => l.code === targetLanguage)?.labelEn ||
                              targetLanguage}{' '}
                            while on-screen & exported subtitles translate to{' '}
                            {TARGET_LANGUAGES.find((l) => l.code === subtitleConfig.subtitleLanguage)?.labelEn ||
                              subtitleConfig.subtitleLanguage}
                            .
                          </p>
                        )}
                      </div>

                      {(subtitleConfig.subtitleLanguage || 'my') === 'my' && targetLanguage === 'my' && (
                        <div className="flex flex-col gap-2 border-t border-stone-200/70 pt-3 dark:border-slate-800">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-stone-500 dark:text-slate-400">
                              Font Style
                            </span>
                            <span className="shrink-0 whitespace-nowrap font-mono text-[10px] font-bold text-teal-600 dark:text-teal-400">
                              {resolveBurmeseFontMeta(subtitleConfig.fontStyle).badge}
                            </span>
                          </div>
                          <select
                            data-testid="burmese-font-select"
                            value={subtitleConfig.fontStyle}
                            onChange={(e) => {
                              playUiSound('select');
                              setSubtitleConfig({
                                ...subtitleConfig,
                                fontStyle: e.target.value as BurmeseFontStyle
                              });
                            }}
                            style={{
                              fontFamily: resolveBurmeseFontMeta(subtitleConfig.fontStyle).cssFontFamily
                            }}
                            className="h-10.5 w-full rounded-xl border border-stone-200/90 bg-white px-3 text-xs font-semibold text-stone-900 shadow-2xs outline-none focus:border-amber-500 cursor-pointer dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white"
                          >
                            {BURMESE_FONT_STYLES.map((fontOpt) => (
                              <option key={fontOpt.id} value={fontOpt.id}>
                                {fontOpt.label}
                              </option>
                            ))}
                          </select>

                          {/* Visual Myanmar Font Style Quick Chips */}
                          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                            {BURMESE_FONT_STYLES.slice(0, 6).map((fontOpt) => {
                              const isSelected = subtitleConfig.fontStyle === fontOpt.id;
                              return (
                                <button
                                  key={fontOpt.id}
                                  type="button"
                                  data-testid={`burmese-font-chip-${fontOpt.id}`}
                                  onClick={() => {
                                    playUiSound('select');
                                    setSubtitleConfig({
                                      ...subtitleConfig,
                                      fontStyle: fontOpt.id
                                    });
                                  }}
                                  style={{
                                    fontFamily: fontOpt.cssFontFamily,
                                    fontWeight: fontOpt.fontWeight,
                                    letterSpacing: fontOpt.letterSpacing
                                  }}
                                  className={`flex flex-col items-start rounded-xl border px-2.5 py-2 text-left transition-all cursor-pointer ${
                                    isSelected
                                      ? 'border-amber-500/80 bg-amber-500/12 text-amber-800 dark:text-amber-300 shadow-2xs'
                                      : 'border-stone-200/80 bg-[#FAF8F4] text-stone-700 hover:border-stone-300 dark:border-slate-800 dark:bg-[#151C26] dark:text-slate-300'
                                  }`}
                                >
                                  <span className="text-[11px] font-bold leading-snug w-full">
                                    {fontOpt.shortName}
                                  </span>
                                  <span className="text-[10px] opacity-80 leading-relaxed w-full mt-0.5">
                                    စာတန်းထိုး နမူနာအလှ
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Preview Sample Text Header + Light/Dark Switch */}
                      <div className="flex items-center justify-between border-t border-stone-200/70 pt-3 dark:border-slate-800">
                        <span className="text-xs font-medium text-stone-900 dark:text-white">
                          Preview sample text
                        </span>
                        <div className="inline-flex items-center rounded-xl border border-stone-200/80 bg-[#F2EFE9] p-0.5 dark:border-slate-700/80 dark:bg-[#151C26]">
                          <button
                            type="button"
                            onClick={() =>
                              setSubtitleConfig({ ...subtitleConfig, samplePreviewLight: true })
                            }
                            aria-label="Light preview"
                            className={`cursor-pointer rounded-lg p-1.5 transition-all ${
                              subtitleConfig.samplePreviewLight
                                ? 'bg-white text-stone-900 shadow-2xs dark:bg-amber-500 dark:text-slate-950'
                                : 'text-stone-400 hover:text-stone-700 dark:hover:text-slate-200'
                            }`}
                          >
                            <Sun className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSubtitleConfig({ ...subtitleConfig, samplePreviewLight: false })
                            }
                            aria-label="Dark preview"
                            className={`cursor-pointer rounded-lg p-1.5 transition-all ${
                              !subtitleConfig.samplePreviewLight
                                ? 'bg-white text-stone-900 shadow-2xs dark:bg-amber-500 dark:text-slate-950'
                                : 'text-stone-400 hover:text-stone-700 dark:hover:text-slate-200'
                            }`}
                          >
                            <Moon className="size-3" />
                          </button>
                        </div>
                      </div>

                      {/* Preview Box */}
                      <div
                        className={`flex min-h-[104px] w-full items-center justify-center rounded-xl border p-4 text-center shadow-xs transition-colors ${
                          !subtitleConfig.samplePreviewLight
                            ? 'border-slate-800 bg-[#090C10] text-white'
                            : 'border-stone-200/90 bg-[#F7F6F2] text-stone-900'
                        }`}
                      >
                        <span
                          data-testid="sample-caption-preview-text"
                          style={{
                            fontFamily: resolveSubtitleFontMeta(
                              subtitleConfig.fontStyle,
                              subtitleConfig.subtitleLanguage
                            ).cssFontFamily,
                            fontWeight: resolveSubtitleFontMeta(
                              subtitleConfig.fontStyle,
                              subtitleConfig.subtitleLanguage
                            ).fontWeight,
                            letterSpacing: resolveSubtitleFontMeta(
                              subtitleConfig.fontStyle,
                              subtitleConfig.subtitleLanguage
                            ).letterSpacing,
                            fontSize: `${Math.max(7, Math.round(0.4 * subtitleConfig.fontSize))}px`,
                            color:
                              editConfig.captionTextColor ||
                              (subtitleConfig.style === 'box_black'
                                ? '#FDE047'
                                : !subtitleConfig.samplePreviewLight
                                  ? '#FFFFFF'
                                  : '#171717')
                          }}
                          className={`max-w-full overflow-hidden px-2 leading-relaxed font-medium text-ellipsis whitespace-nowrap transition-all select-none ${
                            subtitleConfig.style === 'box_black'
                              ? 'rounded-lg bg-black/90 px-3.5 py-1.5'
                              : !subtitleConfig.samplePreviewLight
                                ? '[text-shadow:0_1.5px_3px_black]'
                                : '[text-shadow:0_1px_2px_rgba(255,255,255,0.8)]'
                          }`}
                        >
                          {TARGET_LANGUAGES.find(
                            (l) => l.code === (subtitleConfig.subtitleLanguage || 'my')
                          )?.sampleCaption || 'ဒီနေရာမှာ စာတန်းထိုး ပေါ်မယ်'}
                        </span>
                      </div>

                      {/* Caption Color Presets & Outline Width */}
                      <div className="flex flex-col gap-2 pt-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-stone-500 dark:text-slate-400">
                            Caption color
                          </span>
                          <div className="flex items-center gap-1.5">
                            {CAPTION_COLOR_PRESETS.map((preset) => {
                              const isSelected = editConfig.captionTextColor === preset.hex;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  data-testid={`caption-color-${preset.id}`}
                                  title={preset.label}
                                  onClick={() => {
                                    playUiSound('select');
                                    setEditConfig((prev) => ({
                                      ...prev,
                                      captionTextColor: preset.hex
                                    }));
                                  }}
                                  className={`flex size-5 cursor-pointer items-center justify-center rounded-full border transition-transform active:scale-90 ${
                                    isSelected
                                      ? 'scale-110 border-amber-500 ring-2 ring-amber-500/35'
                                      : 'border-stone-300 dark:border-slate-700'
                                  }`}
                                  style={{
                                    background:
                                      preset.hex ||
                                      'linear-gradient(135deg, #FFFFFF 50%, #FFE600 50%)'
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {subtitleConfig.style === 'outline_black' && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-stone-500 dark:text-slate-400">
                                Outline thickness
                              </span>
                              <span className="font-mono text-[11px] font-semibold text-stone-900 dark:text-white">
                                {editConfig.captionOutlineWidth}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min={0}
                              max={8}
                              step={1}
                              value={editConfig.captionOutlineWidth}
                              onChange={(e) =>
                                setEditConfig((prev) => ({
                                  ...prev,
                                  captionOutlineWidth: Number(e.target.value)
                                }))
                              }
                              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                            />
                          </div>
                        )}
                      </div>

                      {/* Scale Slider */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-stone-500 dark:text-slate-400">Scale</span>
                          <span className="font-mono text-[11px] font-semibold text-stone-900 dark:text-white">
                            {scalePercent}%
                          </span>
                        </div>
                        <input
                          type="range"
                          data-testid="subtitle-scale-slider"
                          min={12}
                          max={68}
                          step={2}
                          value={subtitleConfig.fontSize}
                          onChange={(e) =>
                            setSubtitleConfig({
                              ...subtitleConfig,
                              fontSize: Number(e.target.value)
                            })
                          }
                          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: COPYRIGHT EFFECTS · Brand Watermark & Logo (Pro) + Anti-Copyright Effects */}
              {settingsSubTab === 'extra' && (
                <div
                  data-testid="settings-panel-extra"
                  className="flex flex-col gap-3.5 rounded-2xl border border-stone-200/80 bg-white/85 p-3.5 dark:border-slate-800/90 dark:bg-[#111720]"
                >
                  {/* Brand Overlay (Channel Watermark Text + Circular Logo — Credit Mode Only) */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      data-testid="brand-overlay-accordion-btn"
                      onClick={() => {
                        playUiSound('tap');
                        setIsBrandCardOpen((o) => !o);
                      }}
                      className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-stone-200/80 bg-[#FAF8F4] px-3 py-2.5 text-left transition-colors hover:bg-stone-100/80 dark:border-slate-800 dark:bg-[#0D1117] dark:hover:bg-[#151C26]"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <SlidersHorizontal className="size-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-semibold text-stone-900 dark:text-white truncate">
                          Brand Watermark & Logo
                        </span>
                        {isFreeTier ? (
                          <span
                            data-testid="brand-overlay-credit-lock-badge"
                            className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                          >
                            <Lock className="size-2.5 shrink-0" />
                            Credit Mode Only
                          </span>
                        ) : (
                          (editConfig.watermarkText.enabled || editConfig.brandLogo.enabled) && (
                            <span className="rounded-md bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold text-teal-600 dark:text-teal-400">
                              Active
                            </span>
                          )
                        )}
                      </div>
                      <ChevronDown
                        className={`size-4 text-stone-400 shrink-0 transition-transform ${
                          isBrandCardOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isBrandCardOpen && (
                      <div className="flex flex-col gap-3 border-t border-stone-200/70 pt-2.5 dark:border-slate-800">
                        {isFreeTier && (
                          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-700 dark:text-amber-300">
                            <span className="font-medium leading-snug">
                              Brand Watermark & Logo is exclusive to Credit Mode.
                            </span>
                            {onNavigateToProStudio && (
                              <button
                                type="button"
                                onClick={() => {
                                  playUiSound('tap');
                                  onNavigateToProStudio();
                                }}
                                className="shrink-0 cursor-pointer rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-slate-950"
                              >
                                Credit Mode
                              </button>
                            )}
                          </div>
                        )}

                        {/* Channel Watermark Text */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Type className="size-3.5 text-stone-500 dark:text-slate-400" />
                              <span className="text-[11px] font-semibold text-stone-900 dark:text-white">
                                Watermark Text
                              </span>
                            </div>
                            <StreamWaveSwitch
                              checked={!isFreeTier && editConfig.watermarkText.enabled}
                              disabled={isFreeTier}
                              locked={isFreeTier}
                              onCheckedChange={(checked) => {
                                if (isFreeTier) return;
                                playUiSound('select');
                                setEditConfig((prev) => ({
                                  ...prev,
                                  watermarkText: { ...prev.watermarkText, enabled: checked }
                                }));
                              }}
                            />
                          </div>

                          {!isFreeTier && editConfig.watermarkText.enabled && (
                            <div className="flex flex-col gap-2 pt-0.5">
                              <input
                                type="text"
                                data-testid="watermark-text-input"
                                maxLength={60}
                                placeholder="@ChannelName"
                                value={editConfig.watermarkText.text}
                                onChange={(e) =>
                                  setEditConfig((prev) => ({
                                    ...prev,
                                    watermarkText: {
                                      ...prev.watermarkText,
                                      text: e.target.value
                                    }
                                  }))
                                }
                                className="h-9 w-full rounded-xl border border-stone-200/90 bg-white px-3 text-xs text-stone-900 outline-none focus:border-amber-500 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white"
                              />

                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-stone-500 dark:text-slate-400">Size</span>
                                    <span className="font-mono font-semibold text-stone-900 dark:text-white">
                                      {editConfig.watermarkText.sizePx}px
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={10}
                                    max={40}
                                    step={1}
                                    value={editConfig.watermarkText.sizePx}
                                    onChange={(e) =>
                                      setEditConfig((prev) => ({
                                        ...prev,
                                        watermarkText: {
                                          ...prev.watermarkText,
                                          sizePx: Number(e.target.value)
                                        }
                                      }))
                                    }
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-stone-500 dark:text-slate-400">Opacity</span>
                                    <span className="font-mono font-semibold text-stone-900 dark:text-white">
                                      {editConfig.watermarkText.opacity}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={10}
                                    max={100}
                                    step={5}
                                    value={editConfig.watermarkText.opacity}
                                    onChange={(e) =>
                                      setEditConfig((prev) => ({
                                        ...prev,
                                        watermarkText: {
                                          ...prev.watermarkText,
                                          opacity: Number(e.target.value)
                                        }
                                      }))
                                    }
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-stone-500 dark:text-slate-400">
                                    Position
                                  </span>
                                  <CompactNineGridPicker
                                    value={editConfig.watermarkText.pos}
                                    onChange={(pos) =>
                                      setEditConfig((prev) => ({
                                        ...prev,
                                        watermarkText: { ...prev.watermarkText, pos, moving: false }
                                      }))
                                    }
                                  />
                                </div>

                                <label className="flex cursor-pointer items-center gap-1.5 text-[10px] font-medium text-stone-600 dark:text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={editConfig.watermarkText.moving}
                                    onChange={(e) =>
                                      setEditConfig((prev) => ({
                                        ...prev,
                                        watermarkText: {
                                          ...prev.watermarkText,
                                          moving: e.target.checked
                                        }
                                      }))
                                    }
                                    className="accent-amber-500"
                                  />
                                  <span>Moving</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Circular Brand Logo */}
                        <div className="flex flex-col gap-2 border-t border-stone-200/70 pt-2.5 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <ImageIcon className="size-3.5 text-stone-500 dark:text-slate-400" />
                              <span className="text-[11px] font-semibold text-stone-900 dark:text-white">
                                Circular Brand Logo
                              </span>
                            </div>
                            <StreamWaveSwitch
                              checked={!isFreeTier && editConfig.brandLogo.enabled}
                              disabled={isFreeTier}
                              locked={isFreeTier}
                              onCheckedChange={(checked) => {
                                if (isFreeTier) return;
                                playUiSound('select');
                                setEditConfig((prev) => ({
                                  ...prev,
                                  brandLogo: { ...prev.brandLogo, enabled: checked }
                                }));
                              }}
                            />
                          </div>

                          {!isFreeTier && editConfig.brandLogo.enabled && (
                            <div className="flex flex-col gap-2 pt-0.5">
                              <input
                                ref={logoFileInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = '';
                                  if (!file) return;
                                  try {
                                    const dataUrl = await processLogoFileToSquarePng(file);
                                    setEditConfig((prev) => ({
                                      ...prev,
                                      brandLogo: { ...prev.brandLogo, dataUrl }
                                    }));
                                  } catch {}
                                }}
                              />
                              <div className="flex items-center gap-2">
                                {editConfig.brandLogo.dataUrl && (
                                  <img
                                    src={editConfig.brandLogo.dataUrl}
                                    alt="Brand logo preview"
                                    className="size-9 shrink-0 rounded-full border border-stone-300 object-cover dark:border-slate-700"
                                  />
                                )}
                                <button
                                  type="button"
                                  data-testid="upload-brand-logo-btn"
                                  onClick={() => logoFileInputRef.current?.click()}
                                  className="h-9 flex-1 cursor-pointer rounded-xl border border-stone-200/90 bg-white px-3 text-[11px] font-semibold text-stone-800 hover:bg-stone-50 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-200 dark:hover:bg-[#1D2735]"
                                >
                                  {editConfig.brandLogo.dataUrl
                                    ? 'Change Logo'
                                    : 'Upload Logo (PNG/JPG)'}
                                </button>
                                {editConfig.brandLogo.dataUrl && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditConfig((prev) => ({
                                        ...prev,
                                        brandLogo: { ...prev.brandLogo, dataUrl: undefined }
                                      }))
                                    }
                                    className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-stone-200/80 text-stone-400 hover:text-red-500 dark:border-slate-700/80"
                                    title="Remove logo"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2.5">
                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-stone-500 dark:text-slate-400">Size</span>
                                    <span className="font-mono font-semibold text-stone-900 dark:text-white">
                                      {editConfig.brandLogo.sizePx}px
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={24}
                                    max={120}
                                    step={4}
                                    value={editConfig.brandLogo.sizePx}
                                    onChange={(e) =>
                                      setEditConfig((prev) => ({
                                        ...prev,
                                        brandLogo: {
                                          ...prev.brandLogo,
                                          sizePx: Number(e.target.value)
                                        }
                                      }))
                                    }
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                                  />
                                </div>

                                <div className="flex flex-col gap-1">
                                  <div className="flex justify-between text-[10px]">
                                    <span className="text-stone-500 dark:text-slate-400">Opacity</span>
                                    <span className="font-mono font-semibold text-stone-900 dark:text-white">
                                      {editConfig.brandLogo.opacity}%
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={10}
                                    max={100}
                                    step={5}
                                    value={editConfig.brandLogo.opacity}
                                    onChange={(e) =>
                                      setEditConfig((prev) => ({
                                        ...prev,
                                        brandLogo: {
                                          ...prev.brandLogo,
                                          opacity: Number(e.target.value)
                                        }
                                      }))
                                    }
                                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-800"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-0.5">
                                <span className="text-[10px] text-stone-500 dark:text-slate-400">
                                  Logo Position
                                </span>
                                <CompactNineGridPicker
                                  value={editConfig.brandLogo.pos}
                                  onChange={(pos) =>
                                    setEditConfig((prev) => ({
                                      ...prev,
                                      brandLogo: { ...prev.brandLogo, pos }
                                    }))
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Anti-Copyright Effects Header & Toggles */}
                  <div className="flex flex-col gap-1 border-t border-stone-200/70 pt-3 dark:border-slate-800">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-stone-900 dark:text-white">
                        Copyright Effects
                      </span>
                      <ShieldCheck className="size-3.5 text-teal-500" />
                    </div>

                    <div className="flex items-center justify-between border-b border-stone-100 py-2 dark:border-slate-800/70">
                      <DottedTooltipLabel
                        label="FHD 1080p"
                        tooltip={
                          isFreeTier
                            ? 'Pro feature — Free plan renders at 720p. Upgrade to unlock 1080p.'
                            : 'Render output at up to 1920×1080. Off = 720p.'
                        }
                      />
                      <StreamWaveSwitch
                        checked={!isFreeTier && effects.outputHD}
                        disabled={isFreeTier}
                        locked={isFreeTier}
                        onCheckedChange={(v) => setEffects({ ...effects, outputHD: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-stone-100 py-2 dark:border-slate-800/70">
                      <DottedTooltipLabel
                        label="Dynamic zoom"
                        tooltip={
                          isFreeTier
                            ? 'Pro feature — Upgrade to unlock dynamic zoom.'
                            : 'Adds subtle zooms to keep viewers engaged.'
                        }
                      />
                      <StreamWaveSwitch
                        checked={!isFreeTier && effects.zoom}
                        disabled={isFreeTier}
                        locked={isFreeTier}
                        onCheckedChange={(v) => setEffects({ ...effects, zoom: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-stone-100 py-2 dark:border-slate-800/70">
                      <DottedTooltipLabel
                        label="Mirror flip"
                        tooltip="Flips the video horizontally to help prevent copyright strikes."
                      />
                      <StreamWaveSwitch
                        checked={effects.mirror}
                        onCheckedChange={(v) => setEffects({ ...effects, mirror: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-stone-100 py-2 dark:border-slate-800/70">
                      <DottedTooltipLabel
                        label="Color shift"
                        tooltip="Subtly shifts tones for a fresh visual look."
                      />
                      <StreamWaveSwitch
                        checked={effects.colorShift}
                        onCheckedChange={(v) => setEffects({ ...effects, colorShift: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-stone-100 py-2 dark:border-slate-800/70">
                      <DottedTooltipLabel
                        label="Slight crop"
                        tooltip="Trims 4% of edges to help pass automated content checks."
                      />
                      <StreamWaveSwitch
                        checked={effects.crop}
                        onCheckedChange={(v) => setEffects({ ...effects, crop: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between border-b border-stone-100 py-2 dark:border-slate-800/70">
                      <DottedTooltipLabel
                        label="Film grain"
                        tooltip="Adds light cinematic texture to frames."
                      />
                      <StreamWaveSwitch
                        checked={effects.grain}
                        onCheckedChange={(v) => setEffects({ ...effects, grain: v })}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 pb-0.5">
                      <DottedTooltipLabel
                        label="Audio pitch"
                        tooltip="Shifts voice pitch by +5% to avoid automated sound matches."
                      />
                      <StreamWaveSwitch
                        checked={effects.pitchShift}
                        onCheckedChange={(v) => setEffects({ ...effects, pitchShift: v })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* History Tab (?tab=history) */
            <div className="flex flex-1 flex-col gap-3.5">
              <input
                type="text"
                placeholder={t.searchByTitle}
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="h-10.5 w-full rounded-xl border border-stone-200/90 bg-white px-3.5 text-xs text-stone-900 shadow-2xs transition-colors outline-none placeholder:text-stone-400 focus:border-amber-500 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white dark:focus:border-amber-400"
              />

              {historyJobs.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
                  <p className="text-sm font-semibold text-stone-900 dark:text-white">
                    No recaps yet
                  </p>
                  <p className="mt-1 text-xs font-normal text-stone-400">
                    Load a video to create your first recap.
                  </p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
                  <p className="text-sm font-semibold text-stone-900 dark:text-white">
                    No matching recaps
                  </p>
                  <p className="mt-1 text-xs font-normal text-stone-400">
                    Try a different search title.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredHistory.map((job) => {
                    const isSelected = hasLoadedVideo && job.original_filename === originalFilename;
                    return (
                      <div
                        key={job.ulid || job.id}
                        onClick={() => handleSelectHistoryJob(job)}
                        className={`group flex w-full cursor-pointer flex-col gap-1 rounded-xl border p-3 text-left text-xs transition-colors ${
                          isSelected
                            ? 'border-amber-500/60 bg-amber-500/10'
                            : 'border-stone-200/80 bg-white/80 hover:bg-stone-100/70 dark:border-slate-800 dark:bg-[#111720] dark:hover:bg-[#151C26]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate font-semibold text-stone-900 dark:text-white">
                            {job.original_filename || 'Video Recap'}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteJob(job.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-opacity cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-stone-400 dark:text-slate-400">
                          <span className="capitalize">{job.status}</span>
                          <span className="font-mono">{job.durationSec ? `${Math.round(job.durationSec)}s` : ''}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden lg:min-h-[calc(100dvh-3.5rem)] lg:flex-row">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
        onChange={(e) => {
          handleFileChange(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* LEFT / CENTER STAGE */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col items-center justify-start lg:justify-center overflow-y-auto bg-[#F7F6F2] p-3 pb-4 sm:p-5 md:p-7 lg:p-9 dark:bg-[#090C10]">
        <div className="flex w-full max-w-4xl flex-col gap-3 sm:gap-4">
          {/* Beginner-Friendly 3-Step Visual Workflow Guide */}
          <div
            data-testid="studio-workflow-steps"
            className="grid grid-cols-3 gap-1.5 sm:gap-2 rounded-2xl border border-stone-200/80 bg-white/80 p-1.5 sm:p-2 shadow-2xs dark:border-slate-800/90 dark:bg-[#0D1117]"
          >
            {[
              {
                num: 1,
                titleMy: 'ဗီဒီယိုထည့်ပါ',
                titleEn: 'Add Video'
              },
              {
                num: 2,
                titleMy: 'အသံ/စာတန်း',
                titleEn: 'Voice & Subs'
              },
              {
                num: 3,
                titleMy: 'Recap ထုတ်မည်',
                titleEn: 'Export Recap'
              }
            ].map((step) => {
              const isActive = workflowState.activeStep === step.num;
              const isCompleted = workflowState.completedSteps.includes(step.num);
              return (
                <div
                  key={step.num}
                  className={`flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-2 py-2 text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500/12 text-amber-700 ring-1 ring-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300'
                      : isCompleted
                        ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300'
                        : 'text-stone-400 dark:text-slate-500'
                  }`}
                >
                  <span
                    className={`flex size-4.5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                      isCompleted
                        ? 'bg-teal-600 text-white'
                        : isActive
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-stone-200/80 text-stone-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="size-2.5 stroke-[3]" /> : step.num}
                  </span>
                  <span className="truncate">{uiLang === 'my' ? step.titleMy : step.titleEn}</span>
                </div>
              );
            })}
          </div>

          {/* User Live Payment Status Tracker on Home Screen (approved/rejected fires strictly once, never repeats after reload) */}
          {latestPayment && shouldShowLatestPaymentBanner && (
            <div
              className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm transition-all ${
                latestPayment.status === 'pending'
                  ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent'
                  : latestPayment.status === 'approved'
                  ? 'border-teal-500/30 bg-teal-500/[0.08]'
                  : 'border-red-500/30 bg-red-500/[0.08]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {latestPayment.status === 'pending' ? (
                    <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-xs">
                      <Clock className="size-5 animate-spin" style={{ animationDuration: '4s' }} />
                      <span className="absolute -top-1 -right-1 flex size-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full size-2.5 bg-amber-500"></span>
                      </span>
                    </div>
                  ) : latestPayment.status === 'approved' ? (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xs">
                      <CheckCircle2 className="size-5" />
                    </div>
                  ) : (
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-xs">
                      <AlertTriangle className="size-5" />
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                          latestPayment.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : latestPayment.status === 'approved'
                            ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300'
                            : 'bg-red-500/20 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {latestPayment.status === 'pending'
                          ? 'ငွေလွှဲ စစ်ဆေးနေဆဲ (Pending)'
                          : latestPayment.status === 'approved'
                          ? 'အတည်ပြုပြီး (Approved)'
                          : 'ငြင်းပယ်ထားပါသည် (Declined)'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-stone-500 dark:text-slate-400">
                        Txn ID: {latestPayment.txnId}
                      </span>
                      <span className="text-[11px] text-stone-400 dark:text-slate-500">
                        · {latestPayment.walletType} ({latestPayment.amountMmk})
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-white">
                      {latestPayment.status === 'pending'
                        ? `Admin ဘက်မှ ${latestPayment.walletType} ငွေလွှဲပြေစာကို စစ်ဆေးအတည်ပြုနေပါသည်`
                        : latestPayment.status === 'approved'
                        ? `ငွေလွှဲ အတည်ပြုပြီးပါပြီ! +${latestPayment.credits} Credits အကောင့်ထဲသို့ ထည့်သွင်းပြီးပါပြီ။`
                        : `ငွေလွှဲ အတည်မပြုနိုင်ပါ (${latestPayment.rejectionReason || 'အချက်အလက် မကိုက်ညီပါ'})`}
                    </h4>

                    <p className="text-[11px] text-stone-500 dark:text-slate-400">
                      {latestPayment.status === 'pending'
                        ? `စစ်ဆေးအတည်ပြုပြီးပါက +${latestPayment.credits} Credits အကောင့်ထဲသို့ အလိုအလျောက် ရောက်ရှိပါမည်။`
                        : latestPayment.status === 'approved'
                        ? 'ယခုအခါ Credit Mode ဖြင့် Recap ဗီဒီယိုများကို အကန့်အသတ်မရှိ စတင်ပြုလုပ်နိုင်ပါပြီ။'
                        : 'ကျေးဇူးပြု၍ Wallet တွင် ပြေစာမှန်ကန်မှု ပြန်လည်စစ်ဆေး၍ အသစ်တင်ပေးပါ။'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onNavigateToWallet && (
                    <button
                      type="button"
                      onClick={() => {
                        playUiSound('tap');
                        onNavigateToWallet();
                      }}
                      className="rounded-xl border border-stone-200/90 dark:border-slate-700/80 bg-white dark:bg-[#151C26] hover:bg-stone-50 dark:hover:bg-[#1D2735] text-stone-800 dark:text-slate-200 text-[11px] font-bold px-3 py-1.5 cursor-pointer shadow-xs"
                    >
                      History
                    </button>
                  )}
                  {latestPayment.status !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => {
                        playUiSound('close');
                        setDismissedPaymentIds((prev) => ({ ...prev, [latestPayment.id]: true }));
                      }}
                      className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 cursor-pointer"
                      title="ပိတ်မည်"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {studioErrorMsg && (
            <div
              ref={studioErrorRef}
              data-testid="studio-error-banner"
              className="flex items-start justify-between gap-3 rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-300 shadow-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <AlertTriangle className="size-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed font-medium break-words">{studioErrorMsg}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {hasLoadedVideo && !isGenerating && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudioErrorMsg(null);
                      void handleRunAutoFlow();
                    }}
                    className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-500/25 dark:text-red-200 transition-colors"
                  >
                    {uiLang === 'my' ? 'ထပ်စမ်းမည်' : 'Retry'}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Dismiss error"
                  onClick={() => setStudioErrorMsg(null)}
                  className="shrink-0 cursor-pointer rounded-lg p-1 text-red-500/80 hover:bg-red-500/15"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          )}

          {hasLoadedVideo ? (
            <CanvasVideoEditor
              videoFileUrl={videoFileUrl}
              demoScene={demoScene}
              videoDuration={videoDuration}
              onDurationLoaded={(dur) => setVideoDuration(Math.round(dur))}
              aspectRatio={aspectRatio}
              blurEnabled={blurEnabled}
              blurStyle={blurStyle}
              blurRegions={blurRegions}
              onChangeBlurRegions={setBlurRegions}
              onEnableBlur={() => {
                if (blurMode === 'off') {
                  setBlurMode('auto');
                }
              }}
              subtitleConfig={subtitleConfig}
              onChangeSubtitleConfig={setSubtitleConfig}
              effects={effects}
              editConfig={effectiveEditConfig}
              cues={cues}
              targetLanguage={targetLanguage}
              audioBase64={
                mode === 'translate' && translateAudio === 'captions-only' ? undefined : audioBase64
              }
              voiceoverAudioUrl={
                mode === 'translate' && translateAudio === 'captions-only'
                  ? null
                  : voiceoverMp3Url
              }
              hasMuxedAudio={
                hasMuxedAudio ||
                Boolean(
                  (uploadedFileRef.current || loadedLocalUploadId) &&
                    mode === 'translate' &&
                    translateAudio === 'captions-only'
                )
              }
              isOverlayEditMode={isOverlayEditMode}
              onToggleOverlayEditMode={setIsOverlayEditMode}
              onRemoveVideo={() => {
                playUiSound('close');
                uploadedFileRef.current = null;
                setLoadedLocalUploadId(null);
                setUrlLoadError(null);
                setHasLoadedVideo(false);
                setVideoFileUrl(null);
                setDubbedVideoUrl(null);
                setHasMuxedAudio(false);
                setIsDone(false);
                setIsOverlayEditMode(false);
              }}
              isRendering={isGenerating}
              renderProgress={renderProgress}
              renderMessage={renderMessage}
            />
          ) : (
            /* Upload / Paste URL Card */
            <div className="flex min-h-[240px] w-full shrink-0 flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-4 shadow-xs sm:min-h-[290px] sm:p-5 md:min-h-[330px] md:p-6 dark:border-slate-800/90 dark:bg-[#111720]">
              <div className="mb-3 flex items-center justify-between gap-2">
                <SlidingPillToggle
                  options={[
                    { value: 'upload', label: 'Upload' },
                    { value: 'tiktok', label: 'Paste URL' }
                  ]}
                  value={inputMode}
                  onChange={(val) => {
                    playUiSound('select');
                    setInputMode(val);
                  }}
                  className="w-56"
                />

                {sourceUrlInput ? (
                  <button
                    type="button"
                    onClick={() => {
                      playUiSound('tap');
                      setSourceUrlInput('');
                    }}
                    className="flex cursor-pointer items-center gap-1 text-xs text-stone-400 transition-colors hover:text-red-500"
                  >
                    <X className="size-3.5" />
                    <span>Clear</span>
                  </button>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-stone-400 dark:text-slate-500">
                    <Film className="size-3 text-amber-500" />
                    <span>MP4 · MOV · WEBM · MKV</span>
                  </span>
                )}
              </div>

              {inputMode === 'upload' ? (
                <div
                  data-testid="upload-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileChange(e.dataTransfer.files?.[0]);
                  }}
                  className="group my-1 flex min-h-[165px] w-full flex-1 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300/90 bg-[#FAF8F4] p-5 transition-all hover:border-amber-500/70 hover:bg-amber-500/[0.03] sm:my-1.5 sm:min-h-[200px] sm:p-7 md:min-h-[220px] dark:border-slate-700/80 dark:bg-[#151C26] dark:hover:border-amber-400/70"
                >
                  <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 transition-transform group-hover:scale-105 dark:text-amber-400">
                    <Upload className="size-5" />
                  </div>
                  <button
                    type="button"
                    className="pointer-events-none inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-slate-950 shadow-sm shadow-amber-500/20 transition-all select-none"
                  >
                    <span>{t.selectVideo}</span>
                  </button>
                  <p className="mt-2.5 text-xs font-normal text-stone-500 dark:text-slate-400">
                    {t.orDropHere}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-stone-400 dark:text-slate-500 text-center">
                    {isFreeTier
                      ? uiLang === 'my'
                        ? `Free Mode: တစ်ရက် ${freeLimit} ပုဒ် · ဗီဒီယို ၁ ပုဒ် အများဆုံး 2:30 မိနစ် (150s)`
                        : `Free Mode: ${freeLimit} videos/day · Max 2:30 mins (150s) per video`
                      : uiLang === 'my'
                        ? `Credit Mode: 1 Credit = 1:10 မိနစ် (70s) · FHD 1080p & AI အသံအစုံ ၁၀ မျိုး`
                        : `Credit Mode: 1 Credit = 1:10 (70s) · FHD 1080p & All 10 AI Voices`}
                  </p>
                </div>
              ) : (
                <div className="my-1 flex min-h-[165px] w-full flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300/90 bg-[#FAF8F4] p-5 sm:my-1.5 sm:min-h-[200px] sm:p-6 dark:border-slate-700/80 dark:bg-[#151C26]">
                  <input
                    type="url"
                    aria-label="Paste video URL"
                    placeholder="TikTok · RedNote (xhslink) · YouTube · FB Link..."
                    value={sourceUrlInput}
                    disabled={isLoadingUrl}
                    onChange={(e) => {
                      setSourceUrlInput(e.target.value);
                      if (urlLoadError) setUrlLoadError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && sourceUrlInput.trim() && !isLoadingUrl) {
                        e.preventDefault();
                        void handleLoadVideoUrl();
                      }
                    }}
                    className="w-full border-none bg-transparent text-center text-sm font-normal text-stone-900 dark:text-white outline-none placeholder:text-stone-400/80 focus:ring-0 md:text-base disabled:opacity-60"
                  />
                  {!urlLoadError && !isLoadingUrl && (
                    <p className="mt-2 text-center text-[11px] font-medium text-stone-400 dark:text-slate-500">
                      {uiLang === 'my'
                        ? 'TikTok & RedNote (Watermark မပါ) · YouTube · FB · IG · Direct MP4'
                        : 'TikTok & RedNote (No Watermark) · YouTube · FB · IG · Direct MP4'}
                    </p>
                  )}
                  {urlLoadError && (
                    <div
                      role="alert"
                      className="mt-3 flex max-w-md items-start gap-2 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-left text-[11px] font-medium text-red-700 dark:text-red-300"
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                      <span>{urlLoadError}</span>
                    </div>
                  )}
                  {sourceUrlInput.trim() && (
                    <button
                      type="button"
                      disabled={isLoadingUrl}
                      onClick={() => void handleLoadVideoUrl()}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-75 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-sm cursor-pointer transition-colors"
                    >
                      {isLoadingUrl ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          <span>{urlLoadStatusText || 'Loading Video...'}</span>
                        </>
                      ) : (
                        <span>Load Video URL</span>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* DESKTOP BOTTOM BAR (lg:flex) */}
          <div className="hidden w-full flex-wrap items-center justify-between gap-3 pt-1 shrink-0 lg:flex">
            <div className="flex items-center gap-2 text-xs font-normal text-stone-500 dark:text-slate-400 truncate">
              {!hasLoadedVideo ? (
                <span>{t.loadVideoFirst}</span>
              ) : isDone ? (
                <span className="font-medium text-teal-700 dark:text-teal-300">{`${videoDuration}s · Done`}</span>
              ) : isFreeTier ? (
                <span
                  className={
                    videoDuration > FREE_MAX_DURATION_SEC
                      ? 'font-semibold text-amber-500'
                      : ''
                  }
                >
                  {videoDuration > FREE_MAX_DURATION_SEC
                    ? `${videoDuration}s video (Exceeds Free 150s / 2:30m limit — Switch to Credit Mode)`
                    : `${videoDuration}s video · 720p · Free (${freeRemaining}/${freeLimit} left today, max 2:30m)`}
                </span>
              ) : (
                <span>
                  {`${videoDuration}s video · ~${creditCost} credit${creditCost !== 1 ? 's' : ''} · ${effects.outputHD ? '1080p' : '720p'}`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isDone && hasLoadedVideo && (
                <>
                  {cues.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadSrt}
                      className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-4 text-xs font-semibold text-stone-700 shadow-2xs transition-all hover:bg-stone-50 active:scale-95 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-200 dark:hover:bg-[#1D2735]"
                    >
                      <FileText className="size-3.5" />
                      <span>.SRT</span>
                    </button>
                  )}

                  {!(mode === 'translate' && translateAudio === 'captions-only') && (
                    <button
                      type="button"
                      data-testid="download-audio-mp3-btn"
                      disabled={isDownloadingMp3}
                      onClick={handleDownloadAudioMp3}
                      title="Download standalone MP3 voiceover audio for CapCut"
                      className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-teal-500/35 bg-teal-500/10 px-4 text-xs font-semibold text-teal-700 shadow-2xs transition-all hover:bg-teal-500/20 active:scale-95 disabled:opacity-50 dark:border-teal-500/35 dark:bg-teal-500/15 dark:text-teal-300 dark:hover:bg-teal-500/25"
                    >
                      {isDownloadingMp3 ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Volume2 className="size-3.5" />
                      )}
                      <span>{uiLang === 'my' ? 'MP3 အသံသီးသန့်' : 'Audio .MP3'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    data-testid="open-thumbnail-studio-btn"
                    onClick={() => {
                      playUiSound(isFreeTier ? 'blocked' : 'tap');
                      setIsThumbnailStudioOpen(true);
                    }}
                    className={`inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-4 text-xs font-bold shadow-2xs transition-all active:scale-95 ${
                      isFreeTier
                        ? 'border-stone-300/80 bg-stone-100/90 text-stone-600 hover:border-amber-500/50 hover:text-amber-700 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-300 dark:hover:border-amber-500/45 dark:hover:text-amber-300'
                        : 'border-amber-500/45 bg-amber-500/12 text-amber-700 hover:bg-amber-500/20 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25'
                    }`}
                  >
                    {isFreeTier ? <Lock className="size-3.5 text-amber-500" /> : <ImageIcon className="size-3.5" />}
                    <span>{uiLang === 'my' ? 'Title & Thumbnail 3ပုံ' : 'Title & 3 Thumbnails'}</span>
                    {isFreeTier && (
                      <span className="rounded-md bg-amber-500/18 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-300">
                        Credit
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    data-testid="download-recap-btn"
                    disabled={isExportingVideo}
                    onClick={handleDownloadVideo}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200/90 bg-white px-5 text-xs font-semibold text-stone-800 shadow-2xs transition-all hover:bg-stone-50 active:scale-95 disabled:opacity-50 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-100 dark:hover:bg-[#1D2735]"
                  >
                    {isExportingVideo ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    <span>
                      {isExportingVideo
                        ? `Exporting ${exportProgressPct > 0 ? `${exportProgressPct}%` : '…'}`
                        : t.downloadBtn}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playUiSound('tap');
                      uploadedFileRef.current = null;
                      setLoadedLocalUploadId(null);
                      setUrlLoadError(null);
                      setHasLoadedVideo(false);
                      setVideoFileUrl(null);
                      setDubbedVideoUrl(null);
                      setLastJobId(null);
                      setVoiceoverMp3Url(null);
                      setHasMuxedAudio(false);
                      setIsDone(false);
                      setIsOverlayEditMode(false);
                    }}
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-4 text-xs font-semibold text-stone-700 shadow-2xs transition-all hover:bg-stone-50 active:scale-95 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-200 dark:hover:bg-[#1D2735]"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>{t.newRecapBtn}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                data-testid="generate-recap-btn"
                disabled={!hasLoadedVideo || isGenerating}
                onClick={handleRunAutoFlow}
                className={`inline-flex h-10.5 cursor-pointer items-center justify-center gap-2 rounded-xl px-6 text-xs font-bold transition-all select-none active:scale-95 disabled:opacity-40 ${
                  isFreeTier && (freeRemaining <= 0 || videoDuration > FREE_MAX_DURATION_SEC)
                    ? 'border border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                <Sparkles className="size-3.5" />
                <span>
                  {isGenerating
                    ? `${renderProgress}% · ${isFreeTier ? 'Rendering…' : 'Processing…'}`
                    : isFreeTier
                      ? freeRemaining <= 0
                        ? 'Daily Limit Reached (0/3)'
                        : videoDuration > FREE_MAX_DURATION_SEC
                          ? 'Exceeds 2:30m Free Limit'
                          : t.generateBtn
                      : `${t.generateBtn} · ${creditCost} cr`}
                </span>
              </button>
            </div>
          </div>

          {/* MOBILE BOTTOM BAR (lg:hidden) */}
          <div className="flex w-full shrink-0 flex-col gap-2.5 px-0.5 pt-1 pb-1 lg:hidden">
            <div className="flex items-center justify-between px-1 text-xs font-normal text-stone-500 dark:text-slate-400">
              <span
                className={
                  hasLoadedVideo && isFreeTier && videoDuration > FREE_MAX_DURATION_SEC
                    ? 'font-semibold text-amber-500'
                    : ''
                }
              >
                {!hasLoadedVideo
                  ? t.loadVideoFirst
                  : isDone
                    ? `${videoDuration}s · Done`
                    : isFreeTier
                      ? videoDuration > FREE_MAX_DURATION_SEC
                        ? `${videoDuration}s (Exceeds Free 2:30m limit)`
                        : `${videoDuration}s video · 720p · Free (${freeRemaining}/${freeLimit} left, max 2:30m)`
                      : `${videoDuration}s video · ~${creditCost} credit${creditCost !== 1 ? 's' : ''}`}
              </span>
              {isDone && cues.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadSrt}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 cursor-pointer"
                >
                  <FileText className="size-3.5" />
                  <span>.SRT</span>
                </button>
              )}
            </div>

            {/* Settings & History Drawer Triggers on Mobile */}
            <div className="grid w-full grid-cols-2 gap-2.5">
              <button
                type="button"
                data-testid="mobile-settings-btn"
                onClick={() => {
                  playUiSound('tap');
                  if (mobileDrawerOpen && rightSidebarTab === 'settings') {
                    setMobileDrawerOpen(false);
                  } else {
                    onChangeTab('settings');
                    setMobileDrawerOpen(true);
                  }
                }}
                className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold shadow-2xs transition-colors ${
                  mobileDrawerOpen && rightSidebarTab === 'settings'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-stone-200/90 bg-white text-stone-900 hover:bg-stone-50 dark:border-slate-800 dark:bg-[#111720] dark:text-white dark:hover:bg-[#151C26]'
                }`}
              >
                <Settings className="size-3.5" />
                <span>{t.settingsTab}</span>
              </button>

              <button
                type="button"
                data-testid="mobile-history-btn"
                onClick={() => {
                  playUiSound('tap');
                  if (mobileDrawerOpen && rightSidebarTab === 'history') {
                    setMobileDrawerOpen(false);
                  } else {
                    onChangeTab('history');
                    setMobileDrawerOpen(true);
                  }
                }}
                className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold shadow-2xs transition-colors ${
                  mobileDrawerOpen && rightSidebarTab === 'history'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-stone-200/90 bg-white text-stone-900 hover:bg-stone-50 dark:border-slate-800 dark:bg-[#111720] dark:text-white dark:hover:bg-[#151C26]'
                }`}
              >
                <Clock className="size-3.5" />
                <span>{t.historyTab}</span>
              </button>
            </div>

            {isDone && hasLoadedVideo ? (
              <div className="flex w-full flex-col gap-2">
                <div className="grid w-full grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    data-testid="mobile-download-recap-btn"
                    disabled={isExportingVideo}
                    onClick={handleDownloadVideo}
                    className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-900 shadow-xs transition-all select-none hover:bg-stone-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-[#151C26] dark:text-white"
                  >
                    {isExportingVideo ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" />
                    ) : (
                      <Download className="size-4 shrink-0" />
                    )}
                    <span className="truncate">
                      {isExportingVideo
                        ? `Exporting ${exportProgressPct > 0 ? `${exportProgressPct}%` : '…'}`
                        : t.downloadBtn}
                    </span>
                  </button>

                  {!(mode === 'translate' && translateAudio === 'captions-only') && (
                    <button
                      type="button"
                      data-testid="mobile-download-audio-mp3-btn"
                      disabled={isDownloadingMp3}
                      onClick={handleDownloadAudioMp3}
                      className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-teal-500/35 bg-teal-500/10 px-3 text-xs font-semibold text-teal-700 shadow-xs transition-all select-none hover:bg-teal-500/20 active:scale-95 disabled:opacity-50 dark:border-teal-500/35 dark:bg-teal-500/15 dark:text-teal-300"
                    >
                      {isDownloadingMp3 ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                      ) : (
                        <Volume2 className="size-4 shrink-0" />
                      )}
                      <span className="truncate">
                        {uiLang === 'my' ? 'MP3 အသံသီးသန့်' : 'Audio .MP3'}
                      </span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  data-testid="mobile-open-thumbnail-studio-btn"
                  onClick={() => {
                    playUiSound(isFreeTier ? 'blocked' : 'tap');
                    setIsThumbnailStudioOpen(true);
                  }}
                  className={`flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold shadow-xs transition-all select-none active:scale-95 ${
                    isFreeTier
                      ? 'border-stone-300/80 bg-stone-100/90 text-stone-700 hover:border-amber-500/50 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-300'
                      : 'border-amber-500/45 bg-amber-500/15 text-amber-800 hover:bg-amber-500/25 dark:border-amber-500/40 dark:bg-amber-500/18 dark:text-amber-200'
                  }`}
                >
                  {isFreeTier ? (
                    <Lock className="size-4 shrink-0 text-amber-500" />
                  ) : (
                    <ImageIcon className="size-4 shrink-0" />
                  )}
                  <span>
                    {uiLang === 'my' ? 'ခေါင်းစဉ် Auto & Thumbnail 3 ပုံထုတ်မည်' : 'Auto Title & 3 Thumbnails'}
                  </span>
                  {isFreeTier && (
                    <span className="rounded-md bg-amber-500/18 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-300">
                      Credit Only
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playUiSound('tap');
                    uploadedFileRef.current = null;
                    setLoadedLocalUploadId(null);
                    setUrlLoadError(null);
                    setHasLoadedVideo(false);
                    setVideoFileUrl(null);
                    setDubbedVideoUrl(null);
                    setLastJobId(null);
                    setVoiceoverMp3Url(null);
                    setHasMuxedAudio(false);
                    setIsDone(false);
                    setIsOverlayEditMode(false);
                  }}
                  className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 shadow-xs transition-all select-none active:scale-95"
                >
                  <RotateCcw className="size-3.5 shrink-0" />
                  <span>{t.newRecapBtn}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="mobile-generate-recap-btn"
                disabled={!hasLoadedVideo || isGenerating}
                onClick={handleRunAutoFlow}
                className={`flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all select-none active:scale-95 disabled:opacity-40 ${
                  isFreeTier && (freeRemaining <= 0 || videoDuration > FREE_MAX_DURATION_SEC)
                    ? 'border border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                }`}
              >
                <Sparkles className="size-3.5" />
                <span>
                  {isGenerating
                    ? `${renderProgress}% · ${isFreeTier ? 'Rendering…' : 'Processing…'}`
                    : isFreeTier
                      ? freeRemaining <= 0
                        ? 'Daily Limit Reached (0/3)'
                        : videoDuration > FREE_MAX_DURATION_SEC
                          ? 'Exceeds 2:30m Free Limit'
                          : t.generateBtn
                      : `${t.generateBtn} · ${creditCost} cr`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DESKTOP RIGHT INSPECTOR SIDEBAR */}
      <aside className="hidden h-full w-full shrink-0 flex-col overflow-hidden border-l border-stone-200/90 bg-[#FAF8F4]/95 backdrop-blur-md lg:flex lg:w-88 xl:w-96 dark:border-slate-800/80 dark:bg-[#0D1117]">
        <div className="px-4 pt-4 pb-2 shrink-0">
          <SlidingPillToggle
            options={[
              {
                value: 'settings',
                label: t.settingsTab,
                testId: 'inspector-tab-settings'
              },
              {
                value: 'history',
                label: t.historyTab,
                testId: 'inspector-tab-history'
              }
            ]}
            value={rightSidebarTab}
            onChange={(tab) => {
              playUiSound('select');
              onChangeTab(tab);
            }}
          />
        </div>
        {inspectorContent}
      </aside>

      {/* MOBILE DOCKED SPLIT SHEET FOR SETTINGS & HISTORY */}
      {mobileDrawerOpen && (
        <div
          data-testid="mobile-settings-sheet"
          className={
            hasLoadedVideo
              ? 'flex h-[44dvh] w-full shrink-0 flex-col overflow-hidden rounded-t-3xl border-t border-stone-200 bg-[#FAF8F4] shadow-[0_-10px_30px_rgba(0,0,0,0.35)] lg:hidden dark:border-slate-800 dark:bg-[#0D1117]'
              : 'fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs lg:hidden'
          }
          onClick={!hasLoadedVideo ? () => setMobileDrawerOpen(false) : undefined}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={
              hasLoadedVideo
                ? 'flex h-full w-full flex-col overflow-hidden'
                : 'flex max-h-[75dvh] w-full flex-col overflow-hidden rounded-t-3xl border-t border-stone-200 bg-[#FAF8F4] shadow-2xl dark:border-slate-800 dark:bg-[#0D1117]'
            }
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0 border-b border-stone-200/70 dark:border-slate-800">
              <div className="w-56">
                <SlidingPillToggle
                  options={[
                    { value: 'settings', label: t.settingsTab },
                    { value: 'history', label: t.historyTab }
                  ]}
                  value={rightSidebarTab}
                  onChange={(tab) => {
                    playUiSound('select');
                    onChangeTab(tab);
                  }}
                />
              </div>
              <button
                type="button"
                data-testid="close-mobile-drawer-btn"
                onClick={() => {
                  playUiSound('close');
                  setMobileDrawerOpen(false);
                }}
                className="flex size-8 cursor-pointer items-center justify-center rounded-xl bg-stone-200/70 text-stone-600 hover:bg-stone-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X className="size-4" />
              </button>
            </div>
            {inspectorContent}
          </div>
        </div>
      )}

      {/* Sleek Custom Voice Picker Modal / Sheet */}
      {isVoicePickerOpen && (
        <div
          data-testid="voice-picker-backdrop"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-xs p-0 sm:p-4"
          onClick={() => setIsVoicePickerOpen(false)}
        >
          <div
            data-testid="voice-picker-modal"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[82dvh] w-full sm:max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-stone-200/90 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#111720]"
          >
            <div className="flex items-center justify-between border-b border-stone-200/70 px-5 pt-4 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  {uiLang === 'my' ? 'AI အသံ ရွေးချယ်ရန်' : 'Select AI Voice'}
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  {isFreeTier
                    ? uiLang === 'my'
                      ? 'Free Mode · Thiha / Nilar (၂ မျိုး)'
                      : 'Free Mode · 2 Voices'
                    : uiLang === 'my'
                      ? 'Credit Mode · အသံအစုံ ၁၀ မျိုး (1 Cr/min)'
                      : 'Credit Mode · All 10 Voices (1 Cr/min)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVoicePickerOpen(false)}
                aria-label="Close Voice Picker"
                className="flex size-8 cursor-pointer items-center justify-center rounded-xl text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-white/[0.08] dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-3 py-3">
              {/* Group 1: Standard Burmese Neural */}
              <div>
                <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
                  <span>Standard Burmese Neural</span>
                  <span>1 Cr/min</span>
                </div>
                <div className="space-y-1">
                  {freeVoices.map((v) => {
                    const isSelected = voiceGender === v.id;
                    const isThisLoading =
                      isLoadingVoicePreview && previewingVoiceId === v.id;
                    const isThisPlaying =
                      isPlayingVoicePreview && previewingVoiceId === v.id;
                    return (
                      <div
                        key={v.id}
                        role="button"
                        tabIndex={0}
                        data-testid={`voice-option-${v.id}`}
                        onClick={() => {
                          playUiSound('select');
                          setVoiceGender(v.id);
                          setIsVoicePickerOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            playUiSound('select');
                            setVoiceGender(v.id);
                            setIsVoicePickerOpen(false);
                          }
                        }}
                        className={`flex min-h-[54px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
                          isSelected
                            ? 'border-amber-500/50 bg-amber-500/10'
                            : 'border-transparent hover:bg-stone-100/80 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`size-8 shrink-0 rounded-full border shadow-xs ${
                              isSelected
                                ? 'border-amber-400 ring-2 ring-amber-500/30'
                                : 'border-white/25'
                            }`}
                            style={{ background: v.orbGradient }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-semibold text-stone-900 dark:text-white">
                                {v.nameEn.split('·')[0].trim()}
                              </span>
                              {isSelected && (
                                <Check className="size-3.5 shrink-0 text-amber-500" />
                              )}
                            </div>
                            <p className="truncate text-[11px] text-stone-500 dark:text-slate-400">
                              {v.genderLabel} · {v.tone}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          data-testid={`voice-row-preview-${v.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewVoice(v.id);
                          }}
                          aria-label={`Preview ${v.nameEn.split('·')[0].trim()}`}
                          className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                            isThisPlaying
                              ? 'border-teal-500/50 bg-teal-500/15 text-teal-500'
                              : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-200/70 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]'
                          }`}
                        >
                          {isThisLoading ? (
                            <Loader2 className="size-3.5 animate-spin text-teal-500" />
                          ) : isThisPlaying ? (
                            <Square className="size-3 fill-current" />
                          ) : (
                            <Play className="size-3.5 fill-current" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: Gemini Studio Pro Voices */}
              <div>
                <div className="flex items-center justify-between px-2 pb-1.5 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                  <span>Gemini Studio Pro Voices</span>
                  <span className={isFreeTier ? 'text-amber-500' : 'text-teal-500'}>
                    {isFreeTier ? 'Credit Mode Only' : '1 Cr/min'}
                  </span>
                </div>
                <div className="space-y-1">
                  {proVoices.map((v) => {
                    const isLocked = isFreeTier && !isVoiceAllowedInMode(v.id, true);
                    const isSelected = voiceGender === v.id;
                    const isThisLoading =
                      isLoadingVoicePreview && previewingVoiceId === v.id;
                    const isThisPlaying =
                      isPlayingVoicePreview && previewingVoiceId === v.id;
                    return (
                      <div
                        key={v.id}
                        role="button"
                        tabIndex={0}
                        data-testid={`voice-option-${v.id}`}
                        onClick={() => {
                          if (isLocked) {
                            playUiSound('blocked');
                            return;
                          }
                          playUiSound('select');
                          setVoiceGender(v.id);
                          setIsVoicePickerOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (isLocked) {
                              playUiSound('blocked');
                              return;
                            }
                            playUiSound('select');
                            setVoiceGender(v.id);
                            setIsVoicePickerOpen(false);
                          }
                        }}
                        className={`flex min-h-[54px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors ${
                          isSelected
                            ? 'border-amber-500/50 bg-amber-500/10'
                            : isLocked
                              ? 'border-transparent opacity-65 hover:bg-stone-100/60 dark:hover:bg-white/[0.03]'
                              : 'border-transparent hover:bg-stone-100/80 dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={`size-8 shrink-0 rounded-full border shadow-xs ${
                              isSelected
                                ? 'border-amber-400 ring-2 ring-amber-500/30'
                                : 'border-white/25'
                            }`}
                            style={{ background: v.orbGradient }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-xs font-semibold text-stone-900 dark:text-white">
                                {v.nameEn.split('·')[0].trim()}
                              </span>
                              {isSelected && (
                                <Check className="size-3.5 shrink-0 text-amber-500" />
                              )}
                              {isLocked && (
                                <Lock className="size-3 shrink-0 text-stone-400" />
                              )}
                            </div>
                            <p className="truncate text-[11px] text-stone-500 dark:text-slate-400">
                              {v.genderLabel} · {v.tone}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          data-testid={`voice-row-preview-${v.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviewVoice(v.id);
                          }}
                          aria-label={`Preview ${v.nameEn.split('·')[0].trim()}`}
                          className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors ${
                            isThisPlaying
                              ? 'border-teal-500/50 bg-teal-500/15 text-teal-500'
                              : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-200/70 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.1]'
                          }`}
                        >
                          {isThisLoading ? (
                            <Loader2 className="size-3.5 animate-spin text-teal-500" />
                          ) : isThisPlaying ? (
                            <Square className="size-3 fill-current" />
                          ) : (
                            <Play className="size-3.5 fill-current" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {isFreeTier && onNavigateToProStudio && (
              <div className="border-t border-stone-200/70 px-4 py-3 dark:border-white/[0.07]">
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('tap');
                    setIsVoicePickerOpen(false);
                    onNavigateToProStudio();
                  }}
                  className="h-10 w-full cursor-pointer rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 shadow-xs transition-all"
                >
                  {uiLang === 'my'
                    ? 'Credit Mode သို့ပြောင်းပြီး အသံ ၁၀ မျိုးလုံး ဖွင့်မည်'
                    : 'Switch to Credit Mode to Unlock All 10 Voices'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUOTA & CREDIT ALERT DIALOGS */}
      {limitModalType && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
          onClick={() => setLimitModalType(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111720]"
          >
            <div className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              {limitModalType === 'insufficient_credits' ? (
                <Crown className="size-6 text-amber-500" />
              ) : limitModalType === 'duration_limit' ? (
                <AlertTriangle className="size-6 text-amber-500" />
              ) : (
                <Zap className="size-6 text-amber-500" />
              )}
            </div>

            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              {limitModalType === 'daily_limit'
                ? uiLang === 'my'
                  ? `ယနေ့ အခမဲ့ Recap ပမာဏ ပြည့်သွားပါပြီ (${freeLimit} / ${freeLimit} ပုဒ်)`
                  : `Daily Free Recap Limit Reached (${freeLimit} / ${freeLimit})`
                : limitModalType === 'duration_limit'
                  ? uiLang === 'my'
                    ? 'Free Mode တွင် 2:30 မိနစ် (150s) အထိသာ ရပါသည်'
                    : 'Free Mode Limit: Max 2:30 Minutes (150s) per Video'
                  : uiLang === 'my'
                    ? 'Credit မလုံလောက်ပါ (Credit ဖြည့်သွင်းပါ)'
                    : 'Server Recap Requires Credits'}
            </h3>

            <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-slate-400">
              {limitModalType === 'daily_limit'
                ? uiLang === 'my'
                  ? `Free Mode ဖြင့် တစ်ရက်လျှင် 2:30 မိနစ်အောက် ဗီဒီယို ${freeLimit} ပုဒ် ထုတ်ယူနိုင်ပြီး ယနေ့အတွက် ပြည့်သွားပါပြီ။ အကန့်အသတ်မဲ့ ဆက်လက်ထုတ်ယူရန် Starter Pack, Creator Pro သို့မဟုတ် Creator Pro Max Plan ကို ရွေးချယ်ပါ။`
                  : `You've used all ${freeLimit} free recaps for today (max 2:30 minutes each). Upgrade to Starter Pack, Creator Pro, or Creator Pro Max to continue generating immediately.`
                : limitModalType === 'duration_limit'
                  ? uiLang === 'my'
                    ? `သင်တင်ထားသော ဗီဒီယိုသည် ${formatDuration(videoDuration)} (${videoDuration}s) ရှိပြီး Free Mode ကန့်သတ်ချက် 2:30 မိနစ် (150s) ထက် ကျော်လွန်နေပါသည်။ Credit Mode တွင် ~${calculateCreditCost(videoDuration, false)} Credits (1:10 = 1 Credit) ဖြင့် FHD 1080p + AI အသံအစုံဖြင့် ထုတ်ယူနိုင်ပါသည်။`
                    : `Your video is ${formatDuration(videoDuration)} (${videoDuration}s), which exceeds the 2:30-minute (150s) Free Mode limit. Switch to Credit Studio (~${calculateCreditCost(videoDuration, false)} credits · 1:10 = 1 Credit) or upgrade your Credit Plan.`
                  : uiLang === 'my'
                    ? `ဤဗီဒီယိုအတွက် ${creditCost} Credits လိုအပ်ပြီး သင့်လက်ကျန်မှာ ${proCredits} Credits ဖြစ်ပါသည်။ Wallet တွင် Plan ဝယ်ယူပါ သို့မဟုတ် Credit ဖြည့်သွင်းပါ။`
                    : `This video requires ${creditCost} credits, and your current balance is ${proCredits} credits. Top up credits or choose a Credit Plan in Wallet.`}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  playUiSound('close');
                  setLimitModalType(null);
                }}
                className="h-9.5 cursor-pointer rounded-xl border border-stone-200 px-4 text-xs font-medium text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {uiLang === 'my' ? 'ပိတ်မည်' : 'Got it'}
              </button>

              {limitModalType === 'duration_limit' && onNavigateToProStudio && (
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('tap');
                    setLimitModalType(null);
                    onNavigateToProStudio();
                  }}
                  className="inline-flex h-9.5 cursor-pointer items-center justify-center rounded-xl border border-teal-500/40 bg-teal-500/15 px-4 text-xs font-semibold text-teal-700 hover:bg-teal-500/25 dark:text-teal-300"
                >
                  {uiLang === 'my' ? 'Credit Studio သို့ပြောင်းမည်' : 'Switch to Credit Studio'}
                </button>
              )}

              {onNavigateToWallet && (
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('tap');
                    setLimitModalType(null);
                    onNavigateToWallet();
                  }}
                  className="inline-flex h-9.5 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 text-xs font-bold text-slate-950 shadow-sm"
                >
                  <Crown className="size-3.5" />
                  <span>{uiLang === 'my' ? 'Credit Plan ကြည့်မည်' : 'Upgrade Plan'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auto Viral Title & 3 Video Thumbnails Studio Modal */}
      <ThumbnailStudioModal
        isOpen={isThumbnailStudioOpen}
        onClose={() => setIsThumbnailStudioOpen(false)}
        userId={userId}
        isFreeTier={isFreeTier}
        uiLang={uiLang}
        videoUrl={dubbedVideoUrl || videoFileUrl}
        videoDuration={videoDuration}
        aspectRatio={aspectRatio}
        lastJobId={lastJobId}
        localUploadId={loadedLocalUploadId}
        scriptText={cues.map((c) => c.text).join(' ')}
        cues={cues}
        videoTitle={videoTitle || originalFilename}
        scriptStyle={scriptStyle}
        targetLanguage={targetLanguage}
        channelTag={effectiveEditConfig.watermarkText.enabled ? effectiveEditConfig.watermarkText.text : ''}
        onSelectTitle={(formatted) => {
          setVideoTitle(formatted);
        }}
        onSwitchToCreditMode={() => {
          if (onNavigateToProStudio) {
            onNavigateToProStudio();
          } else if (onNavigateToWallet) {
            onNavigateToWallet();
          }
        }}
      />
    </div>
  );
};

