import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Search,
  Play,
  Trash2,
  CreditCard,
  QrCode,
  ShieldCheck,
  Bell,
  Cpu,
  ArrowRight,
  Globe,
  Video,
  Wand2,
  X,
  Subtitles,
  Upload,
  Download,
  FileText,
  Crown,
  Zap,
  Volume2,
  VolumeX,
  Loader2,
  RotateCw,
  Copy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Mail,
  User,
  Send,
  ExternalLink
} from 'lucide-react';
import {
  CREDIT_PLANS,
  TOP_UP_PACKS,
  TARGET_LANGUAGES,
  VOICE_OPTIONS,
  calculateCreditCost,
  exportCuesToSrt,
  formatDuration,
  buildSyncedRecapCues,
  loadFreeUserApiKeys,
  saveFreeUserApiKeys,
  loadSavedApiEngineConfig,
  buildCinematicTranslateSystemPrompt,
  isTransientPollHttpStatus,
  computeNextPollDelayMs,
  maskApiKeyString,
  TELEGRAM_CHANNEL_URL,
  TELEGRAM_ADMIN_HANDLE,
  TELEGRAM_ADMIN_URL,
  type RecapJobRecord,
  type CreditPlanId,
  type CreditPlanDefinition,
  type SubtitleCue,
  type TargetLanguageCode
} from '../utils/recapEngine';
import { uploadVideoDirect } from '../utils/r2ClientUpload';
import {
  playUiSound,
  isUiSoundMuted,
  setUiSoundMuted,
  getUiSoundVolume,
  setUiSoundVolume
} from '../utils/soundEffects';
import { signInWithGooglePopup } from '../firebase';
import type { AppRoute } from './SidebarAndHeader';

/* ============================================================================
 * 1. HISTORY PAGE (/history)
 * ========================================================================== */
export const HistoryView: React.FC<{
  jobs: RecapJobRecord[];
  onOpenJobInStudio: (job: RecapJobRecord) => void;
  onDeleteJob: (id: string) => void;
}> = ({ jobs, onOpenJobInStudio, onDeleteJob }) => {
  const [query, setQuery] = useState('');
  const filtered = jobs.filter((j) => j.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-slate-100">
            TTAK MOVIE RECAP · History ({jobs.length})
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Click any completed movie recap to reopen its canvas overlays, script prompts, and subtitle cues in the Studio.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="size-3.5 text-stone-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title..."
            className="w-full rounded-xl border border-stone-200 dark:border-slate-700/80 bg-white dark:bg-[#111720] pl-8 pr-3 py-2 text-xs text-stone-900 dark:text-slate-100 outline-none focus:border-amber-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((job) => (
          <div
            key={job.id}
            onClick={() => {
              playUiSound('select');
              onOpenJobInStudio(job);
            }}
            className="group flex flex-col justify-between rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-4 hover:border-amber-500/60 transition-all cursor-pointer"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                  {job.resolution} · {job.durationSec}s
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-stone-400 dark:text-slate-500 tabular-nums">{job.createdAt}</span>
                  <button
                    type="button"
                    aria-label={`Delete ${job.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      playUiSound('tap');
                      onDeleteJob(job.id);
                    }}
                    className="p-1 text-stone-400 hover:text-red-500 cursor-pointer transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100 mb-1.5">
                {job.title}
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                {job.scriptText}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-stone-200/70 dark:border-slate-800/80 text-xs">
              <span className="font-mono text-[11px] text-stone-400 dark:text-slate-500">
                Style: {job.scriptStyle.toUpperCase()} · {job.cues.length} Cues
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                <Play className="size-3 fill-amber-500 text-amber-500" />
                <span>Open in Studio</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================================
 * 1B. AUTO SUBTITLES (STT) STUDIO (/stt)
 *     Shows STT Credit Plan pricing matrix, features unlocked per tier,
 *     audio/video transcription & Burmese translation, live cue editing,
 *     and .SRT / .VTT / .TXT export.
 * ========================================================================== */
export const SttStudioView: React.FC<{
  uiLang: 'my' | 'en';
  proCredits: number;
  activePlanId: CreditPlanId | 'free';
  onDeductCredits: (amount: number) => void;
  onNavigateToWallet: () => void;
}> = ({ uiLang, proCredits, activePlanId, onDeductCredits, onNavigateToWallet }) => {
  const sttFileInputRef = useRef<HTMLInputElement | null>(null);
  const sttFileRef = useRef<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [hasUploadedFile, setHasUploadedFile] = useState<boolean>(false);
  const [durationSec, setDurationSec] = useState<number>(60);
  const [sttMode, setSttMode] = useState<'transcribe' | 'translate'>('translate');
  const [targetLang, setTargetLang] = useState<TargetLanguageCode>('my');
  const [speakerDiarization, setSpeakerDiarization] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [sttProgress, setSttProgress] = useState<number>(0);
  const [sttStatusMsg, setSttStatusMsg] = useState<string>('');
  const [sttErrorMsg, setSttErrorMsg] = useState<string | null>(null);
  const [cues, setCues] = useState<SubtitleCue[]>([
    {
      id: 'stt-sample-1',
      start_ms: 0,
      end_ms: 2800,
      text: 'မင်း ဘယ်တုန်းက ပြန်ရောက်နေတာလဲ။ ငါ့ကို ဘာလို့ ဖုန်းမဆက်တာလဲ။'
    },
    {
      id: 'stt-sample-2',
      start_ms: 3100,
      end_ms: 6200,
      text: 'မနေ့ညကမှ ရောက်တာပါ... မင်းကို စိတ်ပူမှာစိုးလို့ မပြောဖြစ်တာ။'
    }
  ]);

  const sttCreditCost = calculateCreditCost(durationSec, false, {
    isSttMode: true,
    sttWithTranslation: sttMode === 'translate',
    planId: activePlanId
  });

  const handleUploadSttMedia = (file: File | undefined) => {
    if (!file) return;
    playUiSound('open');
    sttFileRef.current = file;
    setHasUploadedFile(true);
    setFileName(file.name);
    setSttErrorMsg(null);
    const tempUrl = URL.createObjectURL(file);
    const media = document.createElement(file.type.startsWith('audio') ? 'audio' : 'video');
    media.preload = 'metadata';
    media.onloadedmetadata = () => {
      if (media.duration && Number.isFinite(media.duration)) {
        setDurationSec(Math.max(6, Math.round(media.duration)));
      }
      URL.revokeObjectURL(tempUrl);
    };
    media.src = tempUrl;
  };

  const handleRunStt = async () => {
    if (isProcessing) return;
    setSttErrorMsg(null);
    if (!sttFileRef.current) {
      playUiSound('blocked');
      setSttErrorMsg(
        uiLang === 'my'
          ? 'ကျေးဇူးပြု၍ စာတန်းထိုးထုတ်ယူလိုသော Video သို့မဟုတ် Audio ဖိုင်ကို အရင် Upload တင်ပေးပါ။'
          : 'Please upload a video or audio file first before generating subtitles.'
      );
      return;
    }
    if (proCredits < sttCreditCost) {
      playUiSound('blocked');
      onNavigateToWallet();
      return;
    }

    playUiSound('tap');
    setIsProcessing(true);
    setSttProgress(8);
    setSttStatusMsg('Uploading media...');

    try {
      const savedEngineCfg = loadSavedApiEngineConfig();
      const uploadRes = await uploadVideoDirect(
        sttFileRef.current,
        (pct, detail) => {
          setSttProgress(Math.min(35, 8 + Math.round((pct / 100) * 27)));
          setSttStatusMsg(detail || 'Uploading media...');
        },
        'recap',
        true
      );

      setSttProgress(38);
      setSttStatusMsg('Extracting speech audio...');

      const systemPrompt = buildCinematicTranslateSystemPrompt({
        targetLanguage: targetLang,
        translateAudio: 'captions-only',
        sttMode,
        speakerDiarization
      });

      const res = await fetch('/api/recap/free/generate-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asyncMode: true,
          isFreeMode: false,
          isSttOnly: true,
          sttMode,
          speakerDiarization,
          durationSec,
          mode: 'translate',
          translateAudio: 'captions-only',
          targetLanguage: targetLang,
          customPrompt: systemPrompt,
          r2ObjectKey: uploadRes.r2ObjectKey,
          localUploadId: uploadRes.localUploadId,
          scriptModel: savedEngineCfg.scriptModel,
          sttModel: savedEngineCfg.sttModel,
          title: fileName
        })
      });

      const rawText = await res.text();
      let data: any = null;
      if (rawText && !rawText.trim().startsWith('<')) {
        try {
          data = JSON.parse(rawText);
        } catch {}
      }
      if (!data) {
        throw new Error(
          uiLang === 'my'
            ? 'Server ချိတ်ဆက်မှု အချိန်ကြာသွားပါသည်။ ထပ်မံကြိုးစားကြည့်ပါ။'
            : 'Server returned an invalid gateway response. Please retry.'
        );
      }

      if (data.ok && data.async && data.job_id) {
        const pollJobId = String(data.job_id);
        const pollDeadline = Date.now() + 10 * 60 * 1000;
        let finalPayload: any = null;
        let consecutiveErrors = 0;

        while (Date.now() < pollDeadline) {
          await new Promise((r) => setTimeout(r, computeNextPollDelayMs(consecutiveErrors)));
          let stResp: Response;
          let stText = '';
          try {
            stResp = await fetch(`/api/recap/job-status/${encodeURIComponent(pollJobId)}`, {
              cache: 'no-store',
              signal: AbortSignal.timeout(12000)
            });
            stText = await stResp.text();
          } catch {
            consecutiveErrors++;
            if (consecutiveErrors >= 15) {
              throw new Error(
                uiLang === 'my'
                  ? 'STT စစ်ဆေးနေစဉ် Network ပြတ်တောက်သွားပါသည်။'
                  : 'Lost connection while checking STT subtitle progress.'
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
          if (!stData || (isTransientPollHttpStatus(stResp.status) && stData.status !== 'error')) {
            consecutiveErrors++;
            continue;
          }
          consecutiveErrors = 0;
          if (typeof stData.progress === 'number') {
            setSttProgress(Math.max(38, Math.min(98, stData.progress)));
          }
          if (stData.stage_message) {
            setSttStatusMsg(String(stData.stage_message));
          }
          if (stData.status === 'done' && stData.result) {
            finalPayload = stData.result;
            break;
          }
          if (stData.status === 'error' || stData.ok === false) {
            throw new Error(
              (uiLang === 'my' ? stData.error : stData.error_en || stData.error) ||
                stData.error ||
                'STT subtitle extraction failed'
            );
          }
        }
        if (!finalPayload) {
          throw new Error(
            uiLang === 'my' ? 'STT စာတန်းထိုး ထုတ်ယူမှု အချိန်ကျော်လွန်သွားပါသည်။' : 'STT processing timed out.'
          );
        }
        data = finalPayload;
      } else if (!data.ok) {
        throw new Error(
          (uiLang === 'my' ? data.error : data.error_en || data.error) ||
            data.error ||
            'STT subtitle extraction failed'
        );
      }

      if (Array.isArray(data.cues) && data.cues.length > 0) {
        setCues(data.cues);
        setSttProgress(100);
        setSttStatusMsg('Done!');
        onDeductCredits(sttCreditCost);
        playUiSound('success');
      } else {
        throw new Error(
          uiLang === 'my'
            ? 'ဤဖိုင်ထဲတွင် စကားပြောအသံ မတွေ့ရှိပါ သို့မဟုတ် STT မအောင်မြင်ပါ။'
            : 'No speech dialogue was detected in this media file.'
        );
      }
    } catch (sttErr) {
      playUiSound('error');
      setSttErrorMsg(
        sttErr instanceof Error
          ? sttErr.message
          : uiLang === 'my'
            ? 'STT စာတန်းထိုး ထုတ်ယူမှု မအောင်မြင်ပါ။'
            : 'Failed to generate STT subtitles.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportFormat = (fmt: 'srt' | 'vtt' | 'txt') => {
    playUiSound('tap');
    let content = '';
    if (fmt === 'srt') {
      content = exportCuesToSrt(cues);
    } else if (fmt === 'vtt') {
      content =
        'WEBVTT\n\n' +
        exportCuesToSrt(cues).replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    } else {
      content = cues.map((c) => c.text).join('\n');
    }
    const baseName = (fileName || 'movie_subtitles').replace(/\.[^.]+$/, '');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_${targetLang}.${fmt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <input
        ref={sttFileInputRef}
        type="file"
        accept="video/*,audio/*"
        onChange={(e) => {
          handleUploadSttMedia(e.target.files?.[0]);
          e.target.value = '';
        }}
        className="hidden"
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-600 dark:text-teal-400 tracking-wide">
            <Subtitles className="size-3.5" />
            <span>TTAK Auto Subtitles (STT) · Whisper v3 Turbo + Gemini Movie Dialogue Translator</span>
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-slate-100">
            {uiLang === 'my'
              ? 'Auto Subtitles (STT) · အသံမှ ရုပ်ရှင်စာတန်းထိုး (.SRT / .VTT) ထုတ်ယူခြင်း'
              : 'Auto Subtitles (STT) · Speech-to-Text & Movie Dialogue SRT Studio'}
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
            {uiLang === 'my'
              ? 'ဗီဒီယို သို့မဟုတ် အသံဖိုင်မှ စကားပြောများကို Recap ပုံစံမဟုတ်ဘဲ မူရင်းရုပ်ရှင်စကားပြောအတိုင်း အချိန်ကိုက် (.SRT / .VTT / .TXT) စာတန်းထိုး ထုတ်ပေးပါသည်။'
              : 'Extract frame-accurate dialogue .SRT, .VTT, and .TXT subtitles with natural movie translation (never summarized like a recap).'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="rounded-xl border border-stone-200 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] px-3.5 py-2 text-right">
            <span className="block text-[10px] text-stone-400 dark:text-slate-500">Estimated STT Cost</span>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
              {sttCreditCost} Credits ({formatDuration(durationSec)})
            </span>
          </div>
          <button
            type="button"
            data-testid="run-stt-btn"
            onClick={handleRunStt}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-3 text-xs font-bold text-slate-950 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{sttProgress > 0 ? `${sttProgress}% · ${sttStatusMsg || 'Transcribing...'}` : 'Transcribing...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                <span>
                  {uiLang === 'my'
                    ? `စာတန်းထိုး ထုတ်မည် (${sttCreditCost} Cr)`
                    : `Generate Subtitles (${sttCreditCost} Cr)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {sttErrorMsg && (
        <div
          data-testid="stt-error-banner"
          className="flex items-start gap-2.5 rounded-2xl border border-red-500/35 bg-red-500/10 p-4 text-xs font-medium text-red-700 dark:text-red-300"
        >
          <AlertTriangle className="size-4 shrink-0 mt-0.5 text-red-500" />
          <span className="flex-1">{sttErrorMsg}</span>
        </div>
      )}

      {/* STT Credit Plan Pricing & Features Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CREDIT_PLANS.map((plan) => {
          const isCurrent = activePlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-4 space-y-2 ${
                isCurrent
                  ? 'border-amber-500/60 bg-amber-500/[0.06] dark:bg-[#141A24]'
                  : 'border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-stone-900 dark:text-slate-100">
                  {plan.name} · STT
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {plan.priceMmk} ({plan.credits} Cr)
                </span>
              </div>
              <p className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                {plan.sttRatePerMin}
              </p>
              <ul className="space-y-1 text-[11px] text-stone-600 dark:text-slate-400">
                {plan.sttFeaturesMy.map((f) => (
                  <li key={f} className="flex items-start gap-1.5">
                    <Check className="size-3.5 text-teal-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Main STT Workspace: Left Controls + Right Interactive Cue Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 space-y-4">
            <h3 className="text-xs font-bold tracking-wide text-stone-500 dark:text-slate-400">
              01. Upload Audio / Video for STT
            </h3>

            <button
              type="button"
              data-testid="stt-upload-btn"
              onClick={() => sttFileInputRef.current?.click()}
              className={`w-full flex flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center cursor-pointer transition-colors ${
                hasUploadedFile
                  ? 'border-teal-500/70 bg-teal-500/[0.05] dark:bg-[#151C26]'
                  : 'border-stone-300 dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#151C26] hover:border-amber-500/70'
              }`}
            >
              <Upload className={`size-6 mb-2 ${hasUploadedFile ? 'text-teal-500' : 'text-amber-500'}`} />
              <p className="text-xs font-bold text-stone-900 dark:text-slate-100">
                {hasUploadedFile
                  ? fileName
                  : uiLang === 'my'
                    ? 'Video / Audio ဖိုင် ရွေးချယ်ရန် နှိပ်ပါ'
                    : 'Click to select Video or Audio file'}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                {hasUploadedFile
                  ? `Duration: ${formatDuration(durationSec)} (${durationSec}s) · Ready`
                  : 'Supports MP4, MP3, WAV, M4A, MKV'}
              </p>
            </button>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                STT Mode & Credit Rate
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('select');
                    setSttMode('transcribe');
                  }}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer ${
                    sttMode === 'transcribe'
                      ? 'border-teal-500 bg-teal-500/10 font-bold text-stone-900 dark:text-white'
                      : 'border-stone-200 dark:border-slate-800 text-stone-500 dark:text-slate-400 hover:border-stone-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="block">Original Speech STT</span>
                  <span className="text-[10px] font-mono tabular-nums text-teal-600 dark:text-teal-400">1 Credit / 1:10 (70s)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('select');
                    setSttMode('translate');
                  }}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer ${
                    sttMode === 'translate'
                      ? 'border-amber-500 bg-amber-500/10 font-bold text-stone-900 dark:text-white'
                      : 'border-stone-200 dark:border-slate-800 text-stone-500 dark:text-slate-400 hover:border-stone-300 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="block">STT + AI Translation</span>
                  <span className="text-[10px] font-mono tabular-nums text-amber-600 dark:text-amber-400">1 Credit / 1:10 (70s)</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                Target Subtitle Language
              </label>
              <select
                value={targetLang}
                onChange={(e) => {
                  playUiSound('select');
                  setTargetLang(e.target.value as TargetLanguageCode);
                }}
                className="h-10 w-full rounded-xl border border-stone-200 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] px-3 text-xs text-stone-900 dark:text-slate-100 outline-none focus:border-amber-500"
              >
                {TARGET_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.labelEn} ({l.labelMy})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-200/70 dark:border-slate-800/80">
              <div>
                <p className="text-xs font-semibold text-stone-900 dark:text-slate-100">
                  Multi-Speaker Diarization
                </p>
                <p className="text-[10px] text-stone-500 dark:text-slate-400">
                  Detect speaker turns (Included in Creator Pro & Pro Max)
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Multi-Speaker Diarization"
                checked={speakerDiarization}
                onChange={(e) => {
                  playUiSound('toggleOn');
                  setSpeakerDiarization(e.target.checked);
                }}
                className="size-4 accent-amber-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right 7 Columns: Editable Timestamped Cues & Export */}
        <div className="lg:col-span-7">
          <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100">
                  Timestamped Subtitle Cues ({cues.length} lines)
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  Click any subtitle line below to edit text before exporting .SRT / .VTT / .TXT
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExportFormat('srt')}
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 cursor-pointer transition-colors"
                >
                  <Download className="size-3.5" />
                  <span>.SRT</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportFormat('vtt')}
                  className="inline-flex items-center gap-1 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 cursor-pointer transition-colors"
                >
                  <Download className="size-3.5" />
                  <span>.VTT</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportFormat('txt')}
                  className="inline-flex items-center gap-1 rounded-xl border border-stone-200 dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#151C26] hover:bg-stone-100 dark:hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-stone-700 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <FileText className="size-3.5" />
                  <span>.TXT</span>
                </button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {cues.map((cue, idx) => (
                <div
                  key={cue.id}
                  className="flex items-start gap-2.5 rounded-xl border border-stone-200/80 dark:border-slate-800/80 bg-[#FAF8F4] dark:bg-[#151C26] p-2.5"
                >
                  <span className="shrink-0 rounded-md bg-white dark:bg-[#0D1117] border border-stone-200/70 dark:border-slate-800 px-2 py-1 font-mono text-[10px] font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                    {formatDuration(cue.start_ms / 1000)} → {formatDuration(cue.end_ms / 1000)}
                  </span>
                  <input
                    type="text"
                    aria-label={`Subtitle cue ${idx + 1}`}
                    value={cue.text}
                    onChange={(e) => {
                      const next = [...cues];
                      next[idx] = { ...cue, text: e.target.value };
                      setCues(next);
                    }}
                    className="w-full bg-transparent text-xs font-medium text-stone-900 dark:text-slate-100 outline-none focus:text-amber-600 dark:focus:text-amber-300"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. WALLET & CREDIT PLANS PAGE (/wallet)
 *    Starter Pack (100 Cr), Creator Pro (260 Cr = 230 + 30 Bonus),
 *    and Creator Pro Max (560 Cr = 500 + 60 Bonus), plus Top-Ups and Rate Matrix.
 * ========================================================================== */
export const WalletView: React.FC<{
  userId?: string;
  proCredits: number;
  activePlanId?: CreditPlanId | 'free';
  onAddCredits: (amount: number, planId?: CreditPlanId) => void;
}> = ({ userId = 'UID-84920', proCredits, activePlanId = 'creator-pro', onAddCredits }) => {
  const [currency, setCurrency] = useState<'MMK' | 'USD'>('MMK');
  const [walletTab, setWalletTab] = useState<'plans' | 'topups' | 'history' | 'rates'>('plans');
  const [qrModalItem, setQrModalItem] = useState<{
    id?: CreditPlanId;
    name: string;
    credits: number;
    minutes: number;
    priceMmk: string;
    priceUsd: string;
  } | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<'wave' | 'kbz'>('wave');
  const [paymentStep, setPaymentStep] = useState<'select' | 'upload' | 'success'>('select');
  const [copiedPhone, setCopiedPhone] = useState<'wave' | 'kbz' | null>(null);
  const [txnId, setTxnId] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [slipBase64, setSlipBase64] = useState<string | null>(null);
  const [transferMsg, setTransferMsg] = useState<string>('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);
  const slipInputRef = useRef<HTMLInputElement | null>(null);

  // User payment submissions history
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

  const fetchUserPayments = async () => {
    try {
      const res = await fetch(`/api/user/payments?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.payments)) {
        setUserPayments(data.payments);
      }
    } catch {}
  };

  useEffect(() => {
    fetchUserPayments();
    const timer = setInterval(fetchUserPayments, 3500);
    return () => clearInterval(timer);
  }, [userId]);

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Wallet Balance & Active Plan Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-wide text-amber-600 dark:text-amber-400">
              TTAK MOVIE RECAP · Credit Wallet & Plans
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-stone-900 dark:text-slate-100 mt-0.5 tabular-nums">
            {proCredits} Pro Credits Available (~{Math.round((proCredits * 70) / 60)} Minutes of Video)
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            1 Credit = 1:10 Min (70s) across all Credit Studios &amp; STT · Plus 5 Free Videos/Day (Max 2:30m each) in Free Mode
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start">
          <div className="inline-flex rounded-xl border border-stone-200 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] p-1">
            <button
              type="button"
              onClick={() => {
                playUiSound('select');
                setCurrency('MMK');
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                currency === 'MMK'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              🇲🇲 MMK (KBZPay / Wave)
            </button>
            <button
              type="button"
              onClick={() => {
                playUiSound('select');
                setCurrency('USD');
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap ${
                currency === 'USD'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-stone-500 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              💳 USD (Stripe)
            </button>
          </div>
        </div>
      </div>

      {/* Telegram Channel & Credit Purchase Admin Contact Card */}
      <div
        data-testid="wallet-telegram-contact-card"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-teal-500/25 bg-teal-500/[0.06] dark:bg-teal-500/[0.08] px-4 py-3.5"
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
            <Send className="size-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-900 dark:text-slate-100">
              Credit ဝယ်ယူရန် & တရားဝင် Telegram Channel
            </p>
            <p className="text-[11px] text-stone-600 dark:text-slate-400">
              Credit ဝယ်ယူလိုပါက Admin <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{TELEGRAM_ADMIN_HANDLE}</span> ထံ ဆက်သွယ်နိုင်ပြီး Updates များအတွက် Channel ကို Join ပါ။
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="wallet-telegram-channel-btn"
            onClick={() => playUiSound('tap')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-500/35 bg-white dark:bg-[#111720] px-3 py-2 text-[11px] font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 transition-colors whitespace-nowrap"
          >
            <Send className="size-3.5" />
            <span>Telegram Channel</span>
            <ExternalLink className="size-3 opacity-75" />
          </a>
          <a
            href={TELEGRAM_ADMIN_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="wallet-telegram-admin-btn"
            onClick={() => playUiSound('tap')}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-[11px] font-bold text-slate-950 transition-colors whitespace-nowrap"
          >
            <span>Admin ဆက်သွယ်ရန် ({TELEGRAM_ADMIN_HANDLE})</span>
            <ExternalLink className="size-3 opacity-85" />
          </a>
        </div>
      </div>

      {/* Wallet Navigation Tabs (Plans | One-Time Top-Ups | Payment History | Rate Guide) */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#0D1117] p-1 w-fit max-w-full">
        {[
          { id: 'plans', label: 'Monthly Credit Plans (Starter / Creator Pro / Pro Max)' },
          { id: 'topups', label: 'Instant Credit Top-Up Packs' },
          {
            id: 'history',
            label: userPayments.length
              ? `ငွေလွှဲမှတ်တမ်း & အခြေအနေ (${userPayments.length})`
              : 'ငွေလွှဲမှတ်တမ်း (Payment History)'
          },
          { id: 'rates', label: 'Credit Deduction & Voice / STT Guide' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              playUiSound('select');
              setWalletTab(tab.id as 'plans' | 'topups' | 'history' | 'rates');
            }}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              walletTab === tab.id
                ? 'bg-amber-500 text-slate-950'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: 3 CREDIT PLANS (Starter Pack, Creator Pro, Creator Pro Max) */}
      {walletTab === 'plans' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {CREDIT_PLANS.map((p: CreditPlanDefinition) => {
            const isCurrentPlan = activePlanId === p.id;
            return (
              <div
                key={p.id}
                data-testid={`plan-card-${p.id}`}
                className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all ${
                  p.popular
                    ? 'border-amber-500/70 bg-white dark:bg-[#141A24]'
                    : 'border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3 text-[11px] font-bold">
                    <span
                      className={
                        p.popular
                          ? 'text-amber-600 dark:text-amber-400 uppercase tracking-wider'
                          : 'text-teal-600 dark:text-teal-400 uppercase tracking-wider'
                      }
                    >
                      {p.badge}
                    </span>
                    {isCurrentPlan && (
                      <span className="text-teal-600 dark:text-teal-400 font-bold">
                        ✓ Active Plan
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-extrabold text-stone-900 dark:text-slate-100">
                    {p.name}
                  </h3>
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                    {p.taglineMy}
                  </p>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold font-mono text-stone-900 dark:text-white tabular-nums">
                      {currency === 'MMK' ? p.priceMmk : p.priceUsd}
                    </span>
                    <span className="text-xs text-stone-400 dark:text-slate-500">/ month</span>
                  </div>

                  {/* Credits & Minutes Highlight Box */}
                  <div className="mt-3 rounded-xl border border-stone-200/80 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-900 dark:text-slate-100 tabular-nums">
                      <span className="flex items-center gap-1.5">
                        <Zap className="size-3.5 text-amber-500 fill-amber-500" />
                        {p.credits.toLocaleString()} Credits / လ
                      </span>
                      <span className="text-teal-600 dark:text-teal-400">
                        {p.minutesIncluded.toLocaleString()} မိနစ် ({(p.minutesIncluded / 60).toFixed(1)} hrs)
                      </span>
                    </div>
                    {p.bonusCredits && p.bonusCredits > 0 ? (
                      <div className="flex items-center justify-between text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        <span>Base {p.baseCredits} Cr + 🎁 {p.bonusCredits} Credits အပို</span>
                        <span className="font-mono font-bold tabular-nums">
                          +{p.bonusCredits} Bonus
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-slate-400">
                      <span>Rate: {p.costPerMinMmk}</span>
                      <span>Max Video: {p.maxVideoDurationLabel}</span>
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-bold tracking-wide text-stone-400 dark:text-slate-500">
                      Recap & Voice Features
                    </p>
                    <ul className="space-y-1.5">
                      {p.featuresMy.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2 text-xs text-stone-700 dark:text-slate-300"
                        >
                          <Check className="size-3.5 text-teal-500 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* STT Specific Features */}
                  <div className="mt-4 pt-3 border-t border-stone-200/70 dark:border-slate-800/80 space-y-1.5">
                    <p className="text-[11px] font-bold tracking-wide text-teal-600 dark:text-teal-400">
                      Auto Subtitles (STT): {p.sttRatePerMin}
                    </p>
                    <ul className="space-y-1">
                      {p.sttFeaturesMy.map((sf) => (
                        <li
                          key={sf}
                          className="flex items-start gap-2 text-[11px] text-stone-600 dark:text-slate-400"
                        >
                          <Subtitles className="size-3 text-teal-500 shrink-0 mt-0.5" />
                          <span>{sf}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playUiSound('open');
                    setQrModalItem({
                      id: p.id,
                      name: p.name,
                      credits: p.credits,
                      minutes: p.minutesIncluded,
                      priceMmk: p.priceMmk,
                      priceUsd: p.priceUsd
                    });
                  }}
                  className={`mt-6 w-full rounded-xl py-3 text-xs font-bold transition-colors cursor-pointer ${
                    p.popular
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      : 'bg-stone-900 hover:bg-stone-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white'
                  }`}
                >
                  {currency === 'MMK'
                    ? `Subscribe ${p.name} (${p.priceMmk})`
                    : `Subscribe ${p.name} (${p.priceUsd})`}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: ONE-TIME TOP-UP PACKS */}
      {walletTab === 'topups' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TOP_UP_PACKS.map((pack) => (
            <div
              key={pack.id}
              className="flex flex-col justify-between rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5"
            >
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  <Zap className="size-3 fill-amber-500 text-amber-500" />
                  Top-Up Pack
                </span>
                <h3 className="text-xl font-extrabold font-mono text-stone-900 dark:text-white mt-2 tabular-nums">
                  +{pack.credits} Credits
                </h3>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                  {pack.minutes} မိနစ် ({pack.labelMy})
                </p>
                <p className="text-lg font-bold font-mono text-stone-900 dark:text-white mt-3 tabular-nums">
                  {currency === 'MMK' ? pack.priceMmk : pack.priceUsd}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">
                  Credits never expire · Works with Recap Studio, Movie Recap & STT
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playUiSound('open');
                  setQrModalItem({
                    name: `${pack.credits} Credits Top-Up`,
                    credits: pack.credits,
                    minutes: pack.minutes,
                    priceMmk: pack.priceMmk,
                    priceUsd: pack.priceUsd
                  });
                }}
                className="mt-5 w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-2.5 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
              >
                Buy +{pack.credits} Credits
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: CREDIT DEDUCTION & VOICE / STT RATE MATRIX */}
      {walletTab === 'rates' && (
        <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-6 space-y-5">
          <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
            TTAK MOVIE RECAP · Credit Calculation & Voice / STT Rules
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.05] p-4 space-y-2">
              <p className="font-bold text-teal-700 dark:text-teal-300">
                1. Free Mode (အခမဲ့ စနစ် — 0 Credits)
              </p>
              <ul className="space-y-1 text-stone-600 dark:text-slate-300">
                <li>• တစ်ရက်လျှင် ဗီဒီယို <strong>5 ပုဒ်</strong> အခမဲ့ ထုတ်ယူနိုင်သည် (5 Videos / Day)</li>
                <li>• ဗီဒီယို ၁ ပုဒ်လျှင် အများဆုံး <strong>2:30 မိနစ် (150 စက္ကန့်)</strong> အထိ ရသည်</li>
                <li>• AI Voice TTS: <strong>Thiha (Male)</strong> နှင့် <strong>Nilar (Female)</strong> ၂ မျိုး သုံးနိုင်သည်</li>
                <li>• On-device WebCodecs 720p HD Export</li>
              </ul>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-4 space-y-2">
              <p className="font-bold text-amber-700 dark:text-amber-300">
                2. Credit Mode (All Studios — 1 Credit = 1:10 / 70s)
              </p>
              <ul className="space-y-1 text-stone-600 dark:text-slate-300">
                <li>• Credit Studio (Recap &amp; Translate): <strong>1 Credit = 1:10 မိနစ် (70s)</strong> (0:01–1:10 = 1 Cr, 1:11–2:20 = 2 Cr)</li>
                <li>• AI Voice အသံအစုံ ၁၀ မျိုး (Thiha, Nilar + Gemini Studio Voices): <strong>1 Credit = 1:10 မိနစ်</strong> တစ်ပြေးညီ</li>
                <li>• Auto Subtitles (STT) &amp; Long-Form Studio: <strong>1 Credit = 1:10 မိနစ် (70s)</strong></li>
                <li>• FHD 1080p Export &amp; Anti-Copyright Effects များအားလုံး ပါဝင်သည်</li>
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs font-bold text-stone-900 dark:text-slate-100 mb-2">
              Available AI Voices ({VOICE_OPTIONS.length} Voices):
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {VOICE_OPTIONS.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-2 rounded-xl border border-stone-200/80 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] p-2 text-[11px]"
                >
                  <span
                    className="size-3.5 shrink-0 rounded-full"
                    style={{ background: v.orbGradient }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-stone-900 dark:text-slate-100">
                      {v.nameEn.split('·')[0]}
                    </p>
                    <p className="text-[9px] text-stone-400 dark:text-slate-500">
                      {v.tier === 'free' ? 'Free & Credit' : 'Credit Mode'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USER PAYMENT SUBMISSION HISTORY & APPROVAL STATUS */}
      {walletTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-4">
            <div>
              <h3 className="text-sm font-bold text-stone-900 dark:text-slate-100">
                ငွေလွှဲမှတ်တမ်းနှင့် အတည်ပြုမှု အခြေအနေ (Payment History)
              </h3>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                သင့်အကောင့်အတွက် တင်ထားသော Wave / KBZ Pay ငွေလွှဲမှုများ
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                playUiSound('tap');
                fetchUserPayments();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] px-3 py-1.5 text-xs font-bold text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCw className="size-3.5" />
              <span>Refresh</span>
            </button>
          </div>

          {userPayments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 dark:border-slate-700 bg-white dark:bg-[#111720] p-10 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#FAF8F4] dark:bg-[#151C26] text-stone-400 dark:text-slate-500">
                <CreditCard className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900 dark:text-slate-100">
                  ငွေလွှဲမှတ်တမ်း မရှိသေးပါ
                </p>
                <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Credit Plan သို့မဟုတ် Instant Top-Up Pack ဝယ်ယူရန် 'Monthly Credit Plans' တက်ဘ်တွင် ငွေလွှဲပြေစာ တင်နိုင်ပါသည်။
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playUiSound('tap');
                  setWalletTab('plans');
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2 cursor-pointer transition-colors"
              >
                <span>Plan များ ကြည့်မည်</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userPayments.map((p) => {
                const isPending = p.status === 'pending';
                const isApproved = p.status === 'approved';
                const isWave = p.walletType.toLowerCase().includes('wave');

                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-4.5 space-y-3 transition-all ${
                      isPending
                        ? 'border-amber-500/35 bg-amber-500/[0.05]'
                        : isApproved
                        ? 'border-teal-500/35 bg-teal-500/[0.05]'
                        : 'border-red-500/35 bg-red-500/[0.05]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={isWave ? '/assets/payment/wavepay.png' : '/assets/payment/kbzpay.png'}
                          alt={p.walletType}
                          className="size-8 object-contain rounded-md"
                        />
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-slate-100">
                            {p.planName}
                          </h4>
                          <p className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            +{p.credits} Credits · {p.amountMmk}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          isPending
                            ? 'text-amber-600 dark:text-amber-400'
                            : isApproved
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {isPending ? (
                          <>
                            <Clock className="size-3.5 animate-spin" />
                            <span>စစ်ဆေးနေဆဲ</span>
                          </>
                        ) : isApproved ? (
                          <>
                            <CheckCircle2 className="size-3.5" />
                            <span>အတည်ပြုပြီး</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="size-3.5" />
                            <span>ငြင်းပယ်</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="rounded-xl border border-stone-200/70 dark:border-slate-800 bg-white/80 dark:bg-[#0D1117]/80 p-3 space-y-1 text-xs">
                      <div className="flex justify-between text-stone-500 dark:text-slate-400">
                        <span>လုပ်ငန်းစဉ် ID:</span>
                        <span className="font-mono font-bold text-stone-900 dark:text-white">{p.txnId}</span>
                      </div>
                      <div className="flex justify-between text-stone-500 dark:text-slate-400">
                        <span>လွှဲသည့် Wallet:</span>
                        <span className="font-bold text-stone-900 dark:text-white">{p.walletType}</span>
                      </div>
                      <div className="flex justify-between text-stone-500 dark:text-slate-400">
                        <span>ရက်စွဲ/အချိန်:</span>
                        <span className="tabular-nums">{new Date(p.createdAt).toLocaleString('my-MM')}</span>
                      </div>
                    </div>

                    <div className="text-[11px]">
                      {isPending ? (
                        <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold">
                          <span>⏳ Admin ဘက်မှ ငွေလွှဲပြေစာ စစ်ဆေးနေပါသည် (မကြာမီ အတည်ပြုပေးပါမည်)</span>
                        </p>
                      ) : isApproved ? (
                        <p className="text-teal-600 dark:text-teal-400 flex items-center gap-1 font-semibold">
                          <span>✅ +{p.credits} Credits ကို သင့်အကောင့်ထဲသို့ ထည့်သွင်းပေးပြီးပါပြီ</span>
                        </p>
                      ) : (
                        <p className="text-red-600 dark:text-red-400 flex items-center gap-1 font-semibold">
                          <span>❌ ငြင်းပယ်ထားပါသည်: {p.rejectionReason || 'အချက်အလက် မကိုက်ညီပါ'}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* WavePay / KBZPay Phone Direct Transfer & Slip Submission Modal */}
      {qrModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-stone-200 dark:border-slate-700/80 bg-white dark:bg-[#111720] p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold tracking-wide text-teal-600 dark:text-teal-400">
                  Direct Bank & Mobile Wallet Transfer
                </span>
                <h3 className="text-base font-extrabold text-stone-900 dark:text-white mt-0.5">
                  {qrModalItem.name} ({qrModalItem.priceMmk})
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close payment modal"
                onClick={() => {
                  playUiSound('close');
                  setQrModalItem(null);
                  setPaymentStep('select');
                  setSlipBase64(null);
                  setTxnId('');
                  setSenderPhone('');
                  setTransferMsg('');
                }}
                className="p-1 text-stone-400 hover:text-stone-900 dark:hover:text-white cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {paymentStep === 'select' && (
              <div className="space-y-4">
                {/* Notice banner */}
                <div className="rounded-xl border border-teal-500/25 bg-teal-500/[0.06] p-3.5 text-xs text-stone-800 dark:text-teal-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-teal-500" />
                    <span>ဖုန်းနံပါတ်ဖြင့် တိုက်ရိုက် ငွေလွှဲပေးချေနိုင်ပါသည်</span>
                  </p>
                  <p className="text-[11px] opacity-85 leading-relaxed">
                    အောက်ပါ Wave Pay သို့မဟုတ် KBZ Pay ဖုန်းနံပါတ်ကို Copy ကူးယူပြီး သတ်မှတ်ထားသော ပမာဏ ({qrModalItem.priceMmk}) ကို လွှဲပေးပါ။
                  </p>
                </div>

                {/* Account Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Wave Pay Card */}
                  <div
                    onClick={() => {
                      playUiSound('select');
                      setSelectedWallet('wave');
                    }}
                    className={`relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                      selectedWallet === 'wave'
                        ? 'border-amber-500 bg-amber-500/[0.08] dark:bg-amber-500/[0.12]'
                        : 'border-stone-200 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src="/assets/payment/wavepay.png"
                          alt="Wave Pay"
                          className="h-8 object-contain rounded-md"
                        />
                        <span className="text-xs font-bold text-stone-900 dark:text-white">Wave Pay</span>
                      </div>
                      {selectedWallet === 'wave' && (
                        <span className="size-4 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 mt-1">
                      <p className="text-[10px] text-stone-500 dark:text-slate-400">Account Name</p>
                      <p className="text-xs font-bold text-stone-900 dark:text-white">KAUNG HTET</p>
                      <p className="text-[10px] text-stone-500 dark:text-slate-400 mt-1">Phone Number</p>
                      <div className="flex items-center justify-between rounded-lg bg-white dark:bg-[#0D1117] px-2.5 py-1.5 border border-stone-200/80 dark:border-slate-800">
                        <span className="font-mono text-xs font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
                          09772350006
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText('09772350006');
                            setCopiedPhone('wave');
                            playUiSound('tap');
                            setTimeout(() => setCopiedPhone(null), 2000);
                          }}
                          className="text-[10px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Copy className="size-3" />
                          <span>{copiedPhone === 'wave' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* KBZ Pay Card */}
                  <div
                    onClick={() => {
                      playUiSound('select');
                      setSelectedWallet('kbz');
                    }}
                    className={`relative flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition-all ${
                      selectedWallet === 'kbz'
                        ? 'border-teal-500 bg-teal-500/[0.08] dark:bg-teal-500/[0.12]'
                        : 'border-stone-200 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src="/assets/payment/kbzpay.png"
                          alt="KBZ Pay"
                          className="h-8 object-contain rounded-md"
                        />
                        <span className="text-xs font-bold text-stone-900 dark:text-white">KBZ Pay</span>
                      </div>
                      {selectedWallet === 'kbz' && (
                        <span className="size-4 rounded-full bg-teal-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 mt-1">
                      <p className="text-[10px] text-stone-500 dark:text-slate-400">Account Name</p>
                      <p className="text-xs font-bold text-stone-900 dark:text-white">Ma Pyone Pyone</p>
                      <p className="text-[10px] text-stone-500 dark:text-slate-400 mt-1">Phone Number</p>
                      <div className="flex items-center justify-between rounded-lg bg-white dark:bg-[#0D1117] px-2.5 py-1.5 border border-stone-200/80 dark:border-slate-800">
                        <span className="font-mono text-xs font-extrabold text-teal-600 dark:text-teal-400 tabular-nums">
                          09797407339
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText('09797407339');
                            setCopiedPhone('kbz');
                            playUiSound('tap');
                            setTimeout(() => setCopiedPhone(null), 2000);
                          }}
                          className="text-[10px] font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <Copy className="size-3" />
                          <span>{copiedPhone === 'kbz' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Telegram Admin Helper */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] px-3 py-2 text-[11px]">
                  <span className="text-stone-700 dark:text-slate-300">
                    Credit ဝယ်ယူရန် Admin ဆက်သွယ်လိုပါက:
                  </span>
                  <a
                    href={TELEGRAM_ADMIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
                  >
                    <span>{TELEGRAM_ADMIN_HANDLE}</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {/* Step Switch Button */}
                <button
                  type="button"
                  onClick={() => {
                    playUiSound('tap');
                    setPaymentStep('upload');
                  }}
                  className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-extrabold text-slate-950 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>ငွေလွှဲပြီးပါပြီ (ငွေလွှဲပြေစာ & ID နံပါတ် ထည့်မည်)</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            )}

            {paymentStep === 'upload' && (
              <div className="space-y-3.5 text-left">
                {/* 6-Digit Transaction ID Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-900 dark:text-white">
                    ငွေလွှဲလုပ်ငန်းစဉ် ID နောက်ဆုံး ၆ လုံး (Transaction ID Last 6 Digits) *
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value.trim())}
                    placeholder="ဥပမာ - 123456"
                    className="w-full h-11 rounded-xl border border-stone-200 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] px-4 font-mono text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-stone-500 dark:text-slate-400">
                    WavePay / KBZPay ပြေစာပေါ်ရှိ Transaction No / လုပ်ငန်းစဉ်အမှတ် နောက်ဆုံး ၆ လုံးကို ထည့်သွင်းပါ
                  </p>
                </div>

                {/* Screenshot Upload Box */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-900 dark:text-white">
                    ငွေလွှဲ Screenshot ပြေစာတင်ရန် (Payment Slip) *
                  </label>
                  <button
                    type="button"
                    onClick={() => slipInputRef.current?.click()}
                    className="w-full flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 dark:border-slate-700 bg-[#FAF8F4] dark:bg-[#151C26] p-4 text-center cursor-pointer hover:border-amber-500 transition-colors"
                  >
                    {slipBase64 ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={slipBase64}
                          alt="Slip Preview"
                          className="size-14 rounded-lg object-cover border border-stone-200 dark:border-slate-700"
                        />
                        <div className="text-left">
                          <p className="text-xs font-bold text-teal-600 dark:text-teal-400">✓ ပြေစာပုံ ရွေးချယ်ပြီးပါပြီ</p>
                          <p className="text-[10px] text-stone-400 dark:text-slate-500">ပုံပြောင်းရန် ဤနေရာကို နှိပ်ပါ</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="size-6 text-amber-500 mb-1" />
                        <p className="text-xs font-bold text-stone-900 dark:text-white">
                          ငွေလွှဲ Screenshot ပုံ ထည့်ပါ
                        </p>
                        <p className="text-[10px] text-stone-400 dark:text-slate-500 mt-0.5">JPG, PNG ဖိုင်များ ရွေးချယ်ပါ</p>
                      </>
                    )}
                  </button>
                  <input
                    ref={slipInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setSlipBase64(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </div>

                {transferMsg && (
                  <p className="text-xs text-red-500 text-center font-semibold">{transferMsg}</p>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStep('select')}
                    className="h-11 px-4 rounded-xl border border-stone-300 dark:border-slate-700 text-xs font-bold text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    နောက်သို့
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingTransfer}
                    onClick={async () => {
                      if (!txnId || txnId.length < 4) {
                        setTransferMsg('လုပ်ငန်းစဉ် ID နောက်ဆုံး ၆ လုံး (အနည်းဆုံး ၄ လုံး) ထည့်ပေးပါ');
                        playUiSound('blocked');
                        return;
                      }
                      if (!slipBase64) {
                        setTransferMsg('ငွေလွှဲ Screenshot ပြေစာပုံ ရွေးချယ်ပေးပါ');
                        playUiSound('blocked');
                        return;
                      }
                      setIsSubmittingTransfer(true);
                      setTransferMsg('');
                      try {
                        const res = await fetch('/api/payments/submit-slip', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            userId: userId || 'UID-84920',
                            planName: qrModalItem.name,
                            credits: qrModalItem.credits,
                            amountMmk: qrModalItem.priceMmk,
                            walletType: selectedWallet === 'wave' ? 'Wave Pay (09772350006)' : 'KBZ Pay (09797407339)',
                            senderPhone: '',
                            txnId,
                            slipBase64
                          })
                        });
                        const data = await res.json();
                        if (data.ok) {
                          playUiSound('success');
                          setPaymentStep('success');
                          fetchUserPayments();
                        } else {
                          setTransferMsg(data.error || 'Failed to submit slip');
                        }
                      } catch {
                        // Fallback activate
                        playUiSound('success');
                        setPaymentStep('success');
                        fetchUserPayments();
                      } finally {
                        setIsSubmittingTransfer(false);
                      }
                    }}
                    className="flex-1 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-extrabold text-slate-950 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                  >
                    {isSubmittingTransfer ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>စစ်ဆေးပြီး ပို့နေပါသည်...</span>
                      </>
                    ) : (
                      <>
                        <Check className="size-4" />
                        <span>ပြေစာ အတည်ပြုချက် တင်မည်</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="py-6 space-y-3 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-teal-500/15 text-teal-500">
                  <Check className="size-8 stroke-[3]" />
                </div>
                <h4 className="text-base font-extrabold text-stone-900 dark:text-white">
                  ငွေလွှဲပြေစာ ပေးပို့ပြီးပါပြီ!
                </h4>
                <p className="text-xs text-stone-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Admin Telegram Bot သို့ အချက်အလက်များ ပေးပို့ထားပြီး ဖြစ်ပါသည်။ စစ်ဆေးအတည်ပြုပြီးသည်နှင့် +{qrModalItem.credits} Credits ကို သင့်အကောင့်ထဲသို့ ထည့်သွင်းပေးသွားမည်ဖြစ်ပါသည်။
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      playUiSound('tap');
                      setQrModalItem(null);
                      setPaymentStep('select');
                    }}
                    className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 py-2.5 text-xs font-bold cursor-pointer transition-colors"
                  >
                    အိုကေ (ပိတ်မည်)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
 * 3. SETTINGS PAGE (/settings)
 *    - Credit Mode users: ZERO API keys needed (uses server-side Owner keys silently)
 *    - Free Mode users: Can enter, save, test, and remove their own Gemini & Groq API keys
 * ========================================================================== */
export const SettingsView: React.FC<{ userEmail?: string }> = () => {
  const initialKeys = loadFreeUserApiKeys();

  // Card 1: Google AI Studio (Free Mode User Key)
  const [geminiKey, setGeminiKey] = useState<string>(initialKeys.geminiKey);
  const [geminiInput, setGeminiInput] = useState<string>(initialKeys.geminiKey);
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [isEditingGemini, setIsEditingGemini] = useState<boolean>(!initialKeys.geminiKey);
  const [testingGemini, setTestingGemini] = useState<boolean>(false);
  const [geminiTestMsg, setGeminiTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Card 2: Groq API Key (Free Mode User Key)
  const [groqKey, setGroqKey] = useState<string>(initialKeys.groqKey);
  const [groqInput, setGroqInput] = useState<string>(initialKeys.groqKey);
  const [showGroqKey, setShowGroqKey] = useState<boolean>(false);
  const [isEditingGroq, setIsEditingGroq] = useState<boolean>(!initialKeys.groqKey);
  const [testingGroq, setTestingGroq] = useState<boolean>(false);
  const [groqTestMsg, setGroqTestMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Card 3: Telegram Notifications state
  const [tgConnected, setTgConnected] = useState<boolean>(false);

  const handleSaveGeminiKey = () => {
    const cleaned = geminiInput.trim();
    if (!cleaned) {
      setGeminiTestMsg({ ok: false, text: 'Gemini API Key ထည့်သွင်းပါ' });
      return;
    }
    playUiSound('success');
    saveFreeUserApiKeys({ geminiKey: cleaned });
    setGeminiKey(cleaned);
    setGeminiInput(cleaned);
    setIsEditingGemini(false);
    setGeminiTestMsg({ ok: true, text: '✓ Free Mode Google AI Studio Key သိမ်းဆည်းပြီးပါပြီ' });
  };

  const handleRemoveGeminiKey = () => {
    playUiSound('tap');
    saveFreeUserApiKeys({ geminiKey: '' });
    setGeminiKey('');
    setGeminiInput('');
    setIsEditingGemini(true);
    setGeminiTestMsg(null);
  };

  const handleTestGemini = async () => {
    if (testingGemini) return;
    const keyToTest = (isEditingGemini ? geminiInput : geminiKey).trim();
    if (!keyToTest) {
      setGeminiTestMsg({ ok: false, text: 'စမ်းသပ်ရန် Gemini API Key ထည့်သွင်းပါ' });
      return;
    }
    playUiSound('tap');
    setTestingGemini(true);
    setGeminiTestMsg(null);
    try {
      const res = await fetch('/api/recap/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'gemini',
          userGeminiApiKey: keyToTest
        })
      });
      const data = await res.json();
      if (data.ok && data.geminiOk !== false) {
        playUiSound('success');
        setGeminiTestMsg({
          ok: true,
          text:
            data.geminiMessage ||
            `✓ Google AI Studio Connected (${data.latencyMs}ms)`
        });
      } else {
        playUiSound('blocked');
        setGeminiTestMsg({
          ok: false,
          text:
            data.geminiError ||
            data.geminiMessage ||
            '✕ Google AI Studio Key မမှန်ကန်ပါ'
        });
      }
    } catch {
      playUiSound('blocked');
      setGeminiTestMsg({ ok: false, text: '✕ Connection test failed' });
    } finally {
      setTestingGemini(false);
    }
  };

  const handleSaveGroqKey = () => {
    const cleaned = groqInput.trim();
    if (!cleaned) {
      setGroqTestMsg({ ok: false, text: 'Groq API Key ထည့်သွင်းပါ' });
      return;
    }
    playUiSound('success');
    saveFreeUserApiKeys({ groqKey: cleaned });
    setGroqKey(cleaned);
    setGroqInput(cleaned);
    setIsEditingGroq(false);
    setGroqTestMsg({ ok: true, text: '✓ Free Mode Groq API Key သိမ်းဆည်းပြီးပါပြီ' });
  };

  const handleRemoveGroqKey = () => {
    playUiSound('tap');
    saveFreeUserApiKeys({ groqKey: '' });
    setGroqKey('');
    setGroqInput('');
    setIsEditingGroq(true);
    setGroqTestMsg(null);
  };

  const handleTestGroq = async () => {
    if (testingGroq) return;
    const keyToTest = (isEditingGroq ? groqInput : groqKey).trim();
    if (!keyToTest) {
      setGroqTestMsg({ ok: false, text: 'စမ်းသပ်ရန် Groq API Key ထည့်သွင်းပါ' });
      return;
    }
    playUiSound('tap');
    setTestingGroq(true);
    setGroqTestMsg(null);
    try {
      const res = await fetch('/api/recap/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'groq',
          userGroqApiKey: keyToTest
        })
      });
      const data = await res.json();
      if (data.ok && data.groqOk !== false) {
        playUiSound('success');
        setGroqTestMsg({
          ok: true,
          text: `✓ Groq API Connected (${data.latencyMs}ms)`
        });
      } else {
        playUiSound('blocked');
        setGroqTestMsg({
          ok: false,
          text: data.groqError || '✕ Groq API Key မမှန်ကန်ပါ'
        });
      }
    } catch {
      playUiSound('blocked');
      setGroqTestMsg({ ok: false, text: '✕ Connection test failed' });
    } finally {
      setTestingGroq(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto px-4 py-5 sm:p-6 max-w-xl mx-auto space-y-5">
      {/* Clean Single Notice: Credit Mode Users Need Zero API Keys */}
      <div
        data-testid="settings-credit-notice"
        className="rounded-2xl border border-teal-500/30 bg-teal-500/[0.07] dark:bg-teal-500/[0.09] px-4 py-3.5 flex items-center gap-3"
      >
        <ShieldCheck className="size-5 shrink-0 text-teal-600 dark:text-teal-400" />
        <p className="text-xs sm:text-sm font-bold text-stone-900 dark:text-slate-100 leading-snug">
          Credit Mode အသုံးပြုသူများ ကိုယ်ပိုင် API Key လုံးဝထည့်စရာ မလိုပါ
        </p>
      </div>

      {/* Card 1: Google AI Studio (Free Mode User API Key) */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/12 text-amber-600 dark:text-amber-400">
              <Cpu className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
                Google AI Studio
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Free Mode အသုံးပြုသူများအတွက် Gemini API Key ထည့်သွင်းရန်
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-slate-700/80 px-3 py-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition-colors whitespace-nowrap"
          >
            <span>Get Key</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        {!isEditingGemini && geminiKey ? (
          <div className="rounded-xl border border-stone-200/80 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-stone-900 dark:text-slate-100">
                  {maskApiKeyString(geminiKey)}
                </span>
                <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                  · Saved (Free Mode)
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveGeminiKey}
                className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
              >
                Remove
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                data-testid="settings-test-gemini-btn"
                disabled={testingGemini}
                onClick={handleTestGemini}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#111720] px-4 text-xs font-semibold text-stone-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {testingGemini ? (
                  <Loader2 className="size-3.5 animate-spin text-amber-500" />
                ) : (
                  <RotateCw className="size-3.5 text-stone-500 dark:text-slate-400" />
                )}
                <span>Test Key</span>
              </button>

              <button
                type="button"
                data-testid="settings-change-gemini-btn"
                onClick={() => {
                  playUiSound('tap');
                  setIsEditingGemini(true);
                  setGeminiTestMsg(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#111720] px-4 text-xs font-semibold text-stone-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Change Key
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="relative">
              <input
                data-testid="settings-gemini-key-input"
                type={showGeminiKey ? 'text' : 'password'}
                value={geminiInput}
                onChange={(e) => setGeminiInput(e.target.value)}
                placeholder="AIzaSy... သို့မဟုတ် AQ... (Gemini API Key ထည့်ပါ)"
                className="w-full h-11 rounded-xl border border-stone-200 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] pl-4 pr-11 text-xs font-mono text-stone-900 dark:text-slate-100 outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowGeminiKey((v) => !v)}
                aria-label="Toggle Gemini Key visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
              >
                {showGeminiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                data-testid="settings-save-gemini-btn"
                onClick={handleSaveGeminiKey}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
              >
                <Check className="size-3.5" />
                <span>Save Key</span>
              </button>

              <button
                type="button"
                data-testid="settings-test-gemini-btn"
                disabled={testingGemini}
                onClick={handleTestGemini}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#111720] px-4 text-xs font-semibold text-stone-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {testingGemini ? (
                  <Loader2 className="size-3.5 animate-spin text-amber-500" />
                ) : (
                  <RotateCw className="size-3.5" />
                )}
                <span>Test</span>
              </button>

              {geminiKey && (
                <button
                  type="button"
                  onClick={() => {
                    setGeminiInput(geminiKey);
                    setIsEditingGemini(false);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {geminiTestMsg && (
          <p
            data-testid="settings-gemini-test-msg"
            className={`text-xs font-semibold pt-0.5 leading-relaxed break-words ${
              geminiTestMsg.ok
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-red-500'
            }`}
          >
            {geminiTestMsg.text}
          </p>
        )}
      </div>

      {/* Card 2: Groq API Key (Free Mode User API Key) */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 items-center justify-center rounded-xl bg-teal-500/12 text-teal-600 dark:text-teal-400">
              <Wand2 className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
                Groq API Key
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-slate-400">
                Free Mode အသုံးပြုသူများအတွက် Groq API Key ထည့်သွင်းရန်
              </p>
            </div>
          </div>

          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 dark:border-slate-700/80 px-3 py-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition-colors whitespace-nowrap"
          >
            <span>Get Key</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        {!isEditingGroq && groqKey ? (
          <div className="rounded-xl border border-stone-200/80 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-stone-900 dark:text-slate-100">
                  {maskApiKeyString(groqKey)}
                </span>
                <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                  · Saved (Free Mode)
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveGroqKey}
                className="text-xs font-semibold text-red-500 hover:underline cursor-pointer"
              >
                Remove
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                data-testid="settings-test-groq-btn"
                disabled={testingGroq}
                onClick={handleTestGroq}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#111720] px-4 text-xs font-semibold text-stone-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {testingGroq ? (
                  <Loader2 className="size-3.5 animate-spin text-amber-500" />
                ) : (
                  <RotateCw className="size-3.5 text-stone-500 dark:text-slate-400" />
                )}
                <span>Test Key</span>
              </button>

              <button
                type="button"
                data-testid="settings-change-groq-btn"
                onClick={() => {
                  playUiSound('tap');
                  setIsEditingGroq(true);
                  setGroqTestMsg(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#111720] px-4 text-xs font-semibold text-stone-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                Change Key
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="relative">
              <input
                data-testid="settings-groq-key-input"
                type={showGroqKey ? 'text' : 'password'}
                value={groqInput}
                onChange={(e) => setGroqInput(e.target.value)}
                placeholder="gsk_... (Groq API Key ထည့်ပါ)"
                className="w-full h-11 rounded-xl border border-stone-200 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] pl-4 pr-11 text-xs font-mono text-stone-900 dark:text-slate-100 outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setShowGroqKey((v) => !v)}
                aria-label="Toggle Groq Key visibility"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer"
              >
                {showGroqKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                data-testid="settings-save-groq-btn"
                onClick={handleSaveGroqKey}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
              >
                <Check className="size-3.5" />
                <span>Save Key</span>
              </button>

              <button
                type="button"
                data-testid="settings-test-groq-btn"
                disabled={testingGroq}
                onClick={handleTestGroq}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-[#111720] px-4 text-xs font-semibold text-stone-800 dark:text-slate-200 hover:bg-stone-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              >
                {testingGroq ? (
                  <Loader2 className="size-3.5 animate-spin text-amber-500" />
                ) : (
                  <RotateCw className="size-3.5" />
                )}
                <span>Test</span>
              </button>

              {groqKey && (
                <button
                  type="button"
                  onClick={() => {
                    setGroqInput(groqKey);
                    setIsEditingGroq(false);
                  }}
                  className="inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-semibold text-stone-500 hover:text-stone-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {groqTestMsg && (
          <p
            data-testid="settings-groq-test-msg"
            className={`text-xs font-semibold pt-0.5 ${
              groqTestMsg.ok
                ? 'text-teal-600 dark:text-teal-400'
                : 'text-red-500'
            }`}
          >
            {groqTestMsg.text}
          </p>
        )}
      </div>

      {/* Card 3: Telegram Notifications */}
      <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-stone-100 dark:bg-slate-800 text-stone-600 dark:text-slate-300">
            <Bell className="size-5" />
          </div>
          <h3 className="text-base font-bold text-stone-900 dark:text-slate-100">
            Telegram Notifications
          </h3>
        </div>

        <div className="rounded-xl border border-stone-200/80 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-stone-900 dark:text-slate-100">
              ချိတ်ဆက်ထားသော အကောင့်
            </span>
            <span
              className={`text-xs font-semibold ${
                tgConnected
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-stone-500 dark:text-slate-400'
              }`}
            >
              · {tgConnected ? 'ချိတ်ဆက်ထားပြီး' : 'မချိတ်ဆက်ရသေးပါ'}
            </span>
          </div>

          <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
            ဗီဒီယိုပြီးဆုံးမှုနှင့် ငွေပေးချေမှု အသိပေးချက်များ ရယူရန် ချိတ်ဆက်ပါ
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                playUiSound('toggleOn');
                setTgConnected((prev) => !prev);
              }}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-500 hover:bg-amber-400 px-5 text-xs font-bold text-slate-950 transition-colors cursor-pointer"
            >
              {tgConnected ? 'ချိတ်ဆက်မှု ဖြုတ်မည်' : 'ချိတ်ဆက်မည်'}
            </button>
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playUiSound('tap')}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-500/15 transition-colors"
            >
              <Send className="size-3.5" />
              <span>Telegram Channel</span>
              <ExternalLink className="size-3" />
            </a>
            <a
              href={TELEGRAM_ADMIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playUiSound('tap')}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 transition-colors"
            >
              <span>Credit ဝယ်ရန် Admin ({TELEGRAM_ADMIN_HANDLE})</span>
              <ExternalLink className="size-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. TTAK MOVIE RECAP LANDING PAGE (/) + GOOGLE SIGN-IN MODAL
 * ========================================================================== */
export const LandingView: React.FC<{
  onNavigate: (route: AppRoute) => void;
  onOpenSignIn: (mode?: 'signin' | 'signup') => void;
}> = ({ onNavigate, onOpenSignIn }) => {
  return (
    <div className="min-h-dvh w-full overflow-y-auto bg-[#090C10] text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navbar (Clean 3-Zone Cinema Header) */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black">
            <Video className="size-4.5" />
          </div>
          <span className="text-base font-extrabold tracking-tight whitespace-nowrap text-white">
            TTAK MOVIE RECAP
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            type="button"
            onClick={() => onNavigate('/app/free-recap')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Recap Studio
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/app/long-form')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Movie Recap
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/stt')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Auto Subtitles
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/wallet')}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Credit Plans
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            data-testid="landing-signin-btn"
            onClick={() => {
              playUiSound('open');
              onOpenSignIn('signin');
            }}
            className="rounded-xl border border-slate-700/80 bg-[#111720] hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors whitespace-nowrap cursor-pointer"
          >
            Sign In
          </button>
          <button
            type="button"
            data-testid="landing-signup-btn"
            onClick={() => {
              playUiSound('tap');
              onOpenSignIn('signup');
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold transition-colors whitespace-nowrap cursor-pointer"
          >
            <span>Continue with Google</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </header>

      {/* Warm Obsidian Editorial Cinema Hero */}
      <section className="relative mx-auto max-w-5xl px-6 pt-14 pb-16 text-center">
        <div className="pointer-events-none absolute inset-x-0 -top-6 h-72 bg-gradient-to-b from-amber-500/12 via-teal-500/5 to-transparent blur-3xl" />

        <p className="relative z-10 text-xs font-semibold tracking-wide text-teal-400 mb-4">
          TTAK MOVIE RECAP · Burmese AI Movie Recap & Auto-Subtitle Studio
        </p>

        <h1 className="relative z-10 text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.08] mb-5 text-white text-balance">
          Any video. <span className="ttak-cine-text">Any language.</span>
        </h1>

        <p className="relative z-10 mx-auto max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
          ဗီဒီယိုတစ်ပုဒ်ထည့်လိုက်ရုံနဲ့ AI က ဇာတ်လမ်းအနှစ်ချုပ် (Movie Recap) ရေးပေးပြီး မြန်မာအသံထပ် (Thiha / Nilar Neural Voice & 10 Studio Voices)၊ စာတန်းထိုးနဲ့ Watermark Blur တွေကို တစ်ခါတည်း အော်တိုလုပ်ပေးမယ့် TTAK MOVIE RECAP Studio ဖြစ်ပါတယ်။
        </p>

        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              playUiSound('tap');
              onOpenSignIn('signup');
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-950 transition-colors cursor-pointer"
          >
            <Sparkles className="size-4" />
            <span>Sign in with Google (5 Free/Day)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playUiSound('tap');
              onNavigate('/wallet');
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 px-6 py-3.5 text-sm font-bold text-teal-300 transition-colors cursor-pointer"
          >
            <Crown className="size-4 text-amber-400" />
            <span>View Credit Plans</span>
          </button>
        </div>
      </section>

      {/* 3-Step Visual Architecture Cards */}
      <section className="mx-auto max-w-6xl px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          {
            step: '01',
            title: 'Upload Video or Paste Link',
            desc: 'Drop any TikTok, Douyin, Bilibili, or full-length movie clip. On-device mediabunny WebCodecs extracts audio & keyframes instantly.',
            icon: Globe
          },
          {
            step: '02',
            title: 'Auto Script Prompt & Burmese TTS',
            desc: 'Choose Fast Recap, Storytelling, Gen Z, News, or Morris style. AI writes time-synced Burmese cues and synthesizes Thiha/Nilar voiceover.',
            icon: Wand2
          },
          {
            step: '03',
            title: 'Watermark Blur & Anti-Copyright Export',
            desc: 'Drag frosted-glass blur boxes over original watermarks, style yellow Highlight captions, apply Dynamic Zoom & Mirror Flip, and download.',
            icon: Video
          }
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.step}
              className="rounded-2xl border border-slate-800/90 bg-[#111720] p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-amber-400 tabular-nums">STEP {card.step}</span>
                <Icon className="size-5 text-teal-400" />
              </div>
              <h3 className="text-base font-bold text-white">{card.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
            </div>
          );
        })}
      </section>
    </div>
  );
};

/* ============================================================================
 * 5. ONE-TAP GOOGLE (GMAIL) AUTH MODAL
 *    - "Continue with Google": Real Firebase GoogleAuthProvider popup chooser
 * ========================================================================== */
export interface AuthenticatedUserPayload {
  userId: string;
  name: string;
  email: string;
  token: string;
  provider?: 'google' | 'email' | 'telegram';
  photoUrl?: string;
}

export const SignInModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  canDismiss?: boolean;
  onSignInSuccess: (user: AuthenticatedUserPayload) => void;
}> = ({ isOpen, onClose, initialMode = 'signin', canDismiss = true, onSignInSuccess }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const resetAll = () => {
    setError('');
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    playUiSound('tap');
    setError('');
    setLoading(true);
    try {
      const popupRes = await signInWithGooglePopup();
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: popupRes.idToken })
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.token || !data.user) {
        playUiSound('blocked');
        setError(data.error || 'Google Sign-In မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။');
        return;
      }

      playUiSound('success');
      onSignInSuccess({
        userId: data.user.userId,
        name: data.user.name,
        email: data.user.email,
        provider: 'google',
        photoUrl: data.user.photoUrl,
        token: data.token
      });
      resetAll();
      onClose();
    } catch (err: any) {
      const code = String(err?.code || '');
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError('');
      } else if (code === 'auth/popup-blocked') {
        playUiSound('blocked');
        setError('Browser မှ Popup ပိတ်ထားပါသည်။ Popups ကို ခွင့်ပြုပြီး ထပ်မံနှိပ်ပါ။');
      } else {
        playUiSound('blocked');
        setError(err?.message || 'Google ဖြင့် ဝင်ရောက်၍ မရပါ။ ထပ်မံကြိုးစားပါ။');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
      onClick={() => {
        if (!canDismiss) return;
        resetAll();
        onClose();
      }}
    >
      <div
        data-testid="auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[390px] overflow-hidden rounded-2xl border border-stone-200 bg-white p-7 shadow-2xl dark:border-slate-800 dark:bg-[#111720]"
      >
        {canDismiss && (
          <button
            type="button"
            onClick={() => {
              resetAll();
              onClose();
            }}
            className="absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        )}

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3.5 flex size-12 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black">
            <Video className="size-5" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
            {initialMode === 'signup' ? 'Get started' : 'Welcome back'}
          </h2>
          <p className="mt-1.5 text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
            Password ရိုက်စရာမလိုဘဲ Gmail (Google) ဖြင့် တစ်ချက်တည်း Sign Up / Sign In ဝင်ရောက်ပါ
          </p>
        </div>

        {error && (
          <p
            data-testid="auth-error-msg"
            className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs font-medium text-red-500"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {/* Primary One-Tap Google / Gmail Login */}
          <button
            id="login-google-btn"
            data-testid="login-google-btn"
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="flex h-11.5 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-5 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 active:scale-99 disabled:opacity-55 dark:border-slate-700 dark:bg-white dark:text-slate-950 dark:hover:bg-stone-100"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin text-stone-600" />
            ) : (
              <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            <span>{loading ? 'Connecting to Google…' : 'Continue with Google'}</span>
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] text-stone-400 dark:text-slate-500">
          Free Mode တွင် တစ်ရက် ၅ ပုဒ် အခမဲ့ အသုံးပြုနိုင်ပါသည်။
        </p>
      </div>
    </div>
  );
};

