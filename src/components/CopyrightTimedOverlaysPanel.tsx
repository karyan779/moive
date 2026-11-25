import React, { useState } from 'react';
import { Plus, Trash2, EyeOff, Type, Play, Lock, Minus, Clock } from 'lucide-react';
import {
  clampTimedOverlayRange,
  createDefaultTimedBlur,
  createDefaultTimedText,
  formatTimedOverlaySec,
  isCompleteTimecodeInput,
  isTimedOverlayFeatureAllowed,
  parseTimecodeToSeconds,
  TIMED_TEXT_BG_PRESETS,
  TIMED_TEXT_COLOR_PRESETS,
  type DeepRecapEditConfig,
  type TimedBlurOverlay,
  type TimedTextOverlay
} from '../utils/recapEngine';
import { playUiSound } from '../utils/soundEffects';

interface CopyrightTimedOverlaysPanelProps {
  uiLang: 'my' | 'en';
  isFreeTier: boolean;
  videoDuration: number;
  currentTimeSec: number;
  editConfig: DeepRecapEditConfig;
  onChangeEditConfig: React.Dispatch<React.SetStateAction<DeepRecapEditConfig>>;
  onSeekPreview: (sec: number) => void;
  onEnterEditMode: () => void;
}

interface TimeRangeControlProps {
  uiLang: 'my' | 'en';
  idPrefix: string;
  startSec: number;
  endSec: number;
  maxDuration: number;
  currentTimeSec: number;
  accent: 'amber' | 'teal';
  onChangeRange: (startSec: number, endSec: number) => void;
  onJumpToStart: () => void;
}

const QUICK_END_SECONDS = [5, 10, 15, 30, 60] as const;

const TimeRangeControl: React.FC<TimeRangeControlProps> = ({
  uiLang,
  idPrefix,
  startSec,
  endSec,
  maxDuration,
  currentTimeSec,
  accent,
  onChangeRange,
  onJumpToStart
}) => {
  const safeMax = Math.max(1, Number.isFinite(maxDuration) && maxDuration > 0 ? maxDuration : 60);
  const clamped = clampTimedOverlayRange(startSec, endSec, safeMax);
  const leftPct = Math.max(0, Math.min(100, (clamped.startSec / safeMax) * 100));
  const widthPct = Math.max(
    1,
    Math.min(100 - leftPct, ((clamped.endSec - clamped.startSec) / safeMax) * 100)
  );
  const playheadPct = Math.max(0, Math.min(100, (currentTimeSec / safeMax) * 100));

  const [startDraft, setStartDraft] = useState<string | null>(null);
  const [endDraft, setEndDraft] = useState<string | null>(null);

  const applyStartValue = (parsed: number) => {
    const nextEnd = parsed >= clamped.endSec ? Math.min(safeMax, parsed + 5) : clamped.endSec;
    const next = clampTimedOverlayRange(parsed, nextEnd, safeMax);
    onChangeRange(next.startSec, next.endSec);
  };

  const applyEndValue = (parsed: number) => {
    const nextStart = parsed <= clamped.startSec ? 0 : clamped.startSec;
    const next = clampTimedOverlayRange(nextStart, parsed, safeMax);
    onChangeRange(next.startSec, next.endSec);
  };

  const commitStart = (raw: string) => {
    setStartDraft(null);
    const parsed = parseTimecodeToSeconds(raw, safeMax);
    if (parsed !== null) {
      applyStartValue(parsed);
    }
  };

  const commitEnd = (raw: string) => {
    setEndDraft(null);
    const parsed = parseTimecodeToSeconds(raw, safeMax);
    if (parsed !== null) {
      applyEndValue(parsed);
    }
  };

  const nudgeStart = (deltaSec: number) => {
    playUiSound('tap');
    setStartDraft(null);
    const nextS = Math.max(0, Math.min(safeMax - 0.5, Math.round(clamped.startSec + deltaSec)));
    applyStartValue(nextS);
  };

  const nudgeEnd = (deltaSec: number) => {
    playUiSound('tap');
    setEndDraft(null);
    const nextE = Math.max(0.5, Math.min(safeMax, Math.round(clamped.endSec + deltaSec)));
    applyEndValue(nextE);
  };

  const barColor =
    accent === 'amber'
      ? 'bg-amber-500/85 dark:bg-amber-400/85'
      : 'bg-teal-500/85 dark:bg-teal-400/85';
  const sliderAccent = accent === 'amber' ? 'accent-amber-500' : 'accent-teal-500';
  const focusRing =
    accent === 'amber'
      ? 'focus:border-amber-500 dark:focus:border-amber-400'
      : 'focus:border-teal-500 dark:focus:border-teal-400';
  const activeChipClass =
    accent === 'amber'
      ? 'border-amber-500 bg-amber-500/20 text-amber-800 dark:border-amber-400 dark:text-amber-200'
      : 'border-teal-500 bg-teal-500/20 text-teal-800 dark:border-teal-400 dark:text-teal-200';
  const durationSpan = Math.max(0.5, Math.round((clamped.endSec - clamped.startSec) * 10) / 10);

  return (
    <div className="flex flex-col gap-2">
      {/* 1) Easy Direct MM:SS Entry + 1-Tap -1s/+1s Steppers */}
      <div className="grid grid-cols-2 gap-2">
        {/* Start Time Box */}
        <div className="flex flex-col gap-1 rounded-lg border border-stone-200/80 bg-white/80 p-1.5 dark:border-slate-700/80 dark:bg-[#0B0F17]">
          <div className="flex items-center justify-between text-[9.5px] font-semibold text-stone-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-2.5" />
              {uiLang === 'my' ? 'စချိန်' : 'Start'}
            </span>
            <button
              type="button"
              onClick={() => {
                playUiSound('tap');
                setStartDraft(null);
                const nowSec = Math.max(0, Math.min(safeMax - 0.5, Math.floor(currentTimeSec)));
                applyStartValue(nowSec);
              }}
              className="cursor-pointer rounded px-1 py-0.2 text-[9px] font-bold text-amber-600 hover:bg-amber-500/15 dark:text-amber-300"
              title={uiLang === 'my' ? 'လက်ရှိဗီဒီယိုအချိန်ကို စချိန်ထားမည်' : 'Set Start to current playhead'}
            >
              {uiLang === 'my' ? 'အခု' : 'Now'}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`${idPrefix} start minus 1 second`}
              onClick={() => nudgeStart(-1)}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 transition-colors hover:bg-stone-200 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Minus className="size-3" />
            </button>
            <input
              type="text"
              inputMode="text"
              aria-label={`${idPrefix} start time`}
              data-testid={`${idPrefix.toLowerCase().replace(/\s+/g, '-')}-start-input`}
              placeholder="0:00"
              value={startDraft !== null ? startDraft : formatTimedOverlaySec(clamped.startSec)}
              onFocus={(e) => {
                setStartDraft(e.target.value);
                e.currentTarget.select();
              }}
              onChange={(e) => {
                const val = e.target.value;
                setStartDraft(val);
                if (isCompleteTimecodeInput(val)) {
                  const parsed = parseTimecodeToSeconds(val, safeMax);
                  if (parsed !== null) applyStartValue(parsed);
                }
              }}
              onBlur={(e) => commitStart(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className={`h-7 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-1 text-center font-mono text-xs font-bold text-stone-900 outline-none dark:border-slate-700 dark:bg-[#111824] dark:text-white ${focusRing}`}
            />
            <button
              type="button"
              aria-label={`${idPrefix} start plus 1 second`}
              onClick={() => nudgeStart(1)}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 transition-colors hover:bg-stone-200 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Plus className="size-3" />
            </button>
          </div>
        </div>

        {/* End Time Box */}
        <div className="flex flex-col gap-1 rounded-lg border border-stone-200/80 bg-white/80 p-1.5 dark:border-slate-700/80 dark:bg-[#0B0F17]">
          <div className="flex items-center justify-between text-[9.5px] font-semibold text-stone-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-2.5" />
              {uiLang === 'my' ? 'ဆုံးချိန် (ဥပမာ 0:11)' : 'End (e.g. 0:11)'}
            </span>
            <button
              type="button"
              onClick={() => {
                playUiSound('tap');
                setEndDraft(null);
                const nowSec = Math.max(1, Math.min(safeMax, Math.ceil(currentTimeSec)));
                applyEndValue(nowSec);
              }}
              className="cursor-pointer rounded px-1 py-0.2 text-[9px] font-bold text-teal-600 hover:bg-teal-500/15 dark:text-teal-300"
              title={uiLang === 'my' ? 'လက်ရှိဗီဒီယိုအချိန်ကို ဆုံးချိန်ထားမည်' : 'Set End to current playhead'}
            >
              {uiLang === 'my' ? 'အခု' : 'Now'}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label={`${idPrefix} end minus 1 second`}
              onClick={() => nudgeEnd(-1)}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 transition-colors hover:bg-stone-200 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Minus className="size-3" />
            </button>
            <input
              type="text"
              inputMode="text"
              aria-label={`${idPrefix} end time`}
              data-testid={`${idPrefix.toLowerCase().replace(/\s+/g, '-')}-end-input`}
              placeholder="0:11"
              value={endDraft !== null ? endDraft : formatTimedOverlaySec(clamped.endSec)}
              onFocus={(e) => {
                setEndDraft(e.target.value);
                e.currentTarget.select();
              }}
              onChange={(e) => {
                const val = e.target.value;
                setEndDraft(val);
                if (isCompleteTimecodeInput(val)) {
                  const parsed = parseTimecodeToSeconds(val, safeMax);
                  if (parsed !== null) applyEndValue(parsed);
                }
              }}
              onBlur={(e) => commitEnd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              className={`h-7 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-1 text-center font-mono text-xs font-bold text-stone-900 outline-none dark:border-slate-700 dark:bg-[#111824] dark:text-white ${focusRing}`}
            />
            <button
              type="button"
              aria-label={`${idPrefix} end plus 1 second`}
              onClick={() => nudgeEnd(1)}
              className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-stone-700 transition-colors hover:bg-stone-200 active:scale-95 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Plus className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* 2) Quick One-Tap End Time Chips (0:05, 0:10, 0:15, 0:30, 1:00, Full) + Preview Jump */}
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex flex-wrap items-center gap-1">
          {QUICK_END_SECONDS.filter((s) => s <= safeMax + 0.5).map((targetSec) => {
            const clampedTarget = Math.min(safeMax, targetSec);
            const isSelected =
              Math.abs(clamped.endSec - clampedTarget) < 0.6 && clamped.startSec < clampedTarget;
            return (
              <button
                key={targetSec}
                type="button"
                onClick={() => {
                  playUiSound('tap');
                  setEndDraft(null);
                  const nextStart = clamped.startSec >= clampedTarget ? 0 : clamped.startSec;
                  const r = clampTimedOverlayRange(nextStart, clampedTarget, safeMax);
                  onChangeRange(r.startSec, r.endSec);
                }}
                className={`cursor-pointer rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-bold transition-colors ${
                  isSelected
                    ? activeChipClass
                    : 'border-stone-200/90 bg-white text-stone-600 hover:border-amber-400 hover:text-amber-700 dark:border-slate-700/80 dark:bg-[#0D1117] dark:text-slate-300 dark:hover:text-amber-300'
                }`}
              >
                {formatTimedOverlaySec(clampedTarget)}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              playUiSound('tap');
              setStartDraft(null);
              setEndDraft(null);
              const r = clampTimedOverlayRange(0, safeMax, safeMax);
              onChangeRange(r.startSec, r.endSec);
            }}
            className={`cursor-pointer rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
              clamped.startSec <= 0.1 && Math.abs(clamped.endSec - safeMax) < 0.6
                ? activeChipClass
                : 'border-stone-200/90 bg-white text-stone-600 hover:border-amber-400 hover:text-amber-700 dark:border-slate-700/80 dark:bg-[#0D1117] dark:text-slate-300 dark:hover:text-amber-300'
            }`}
          >
            {uiLang === 'my' ? 'အပြည့်' : 'Full'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            playUiSound('tap');
            onJumpToStart();
          }}
          title={uiLang === 'my' ? 'ဒီအချိန်သို့ သွားကြည့်မည်' : 'Jump preview to this overlay'}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-stone-700 transition-colors hover:bg-amber-500/20 hover:text-amber-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-amber-300"
        >
          <Play className="size-2.5 fill-current" />
          <span>{durationSpan}s</span>
        </button>
      </div>

      {/* 3) Visual Timeline Bar + Optional Fine Sliders */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-slate-800">
        <div
          className={`absolute top-0 bottom-0 rounded-full transition-all ${barColor}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-stone-900/70 dark:bg-white/80"
          style={{ left: `${playheadPct}%` }}
          title={`Playhead ${formatTimedOverlaySec(currentTimeSec)}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="range"
          aria-label={`${idPrefix} start slider`}
          min={0}
          max={Math.max(0.5, safeMax - 0.5)}
          step={safeMax > 120 ? 1 : 0.5}
          value={clamped.startSec}
          onChange={(e) => {
            setStartDraft(null);
            const s = Number(e.target.value);
            const nextEnd = s >= clamped.endSec - 0.5 ? Math.min(safeMax, s + 1) : clamped.endSec;
            const next = clampTimedOverlayRange(s, nextEnd, safeMax);
            onChangeRange(next.startSec, next.endSec);
          }}
          className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 dark:bg-slate-700 ${sliderAccent}`}
        />
        <input
          type="range"
          aria-label={`${idPrefix} end slider`}
          min={0.5}
          max={safeMax}
          step={safeMax > 120 ? 1 : 0.5}
          value={clamped.endSec}
          onChange={(e) => {
            setEndDraft(null);
            const eVal = Number(e.target.value);
            const nextStart =
              eVal <= clamped.startSec + 0.5 ? Math.max(0, eVal - 1) : clamped.startSec;
            const next = clampTimedOverlayRange(nextStart, eVal, safeMax);
            onChangeRange(next.startSec, next.endSec);
          }}
          className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-stone-200 dark:bg-slate-700 ${sliderAccent}`}
        />
      </div>
    </div>
  );
};

export const CopyrightTimedOverlaysPanel: React.FC<CopyrightTimedOverlaysPanelProps> = ({
  uiLang,
  isFreeTier,
  videoDuration,
  currentTimeSec,
  editConfig,
  onChangeEditConfig,
  onSeekPreview,
  onEnterEditMode
}) => {
  const safeDuration = Math.max(
    1,
    Number.isFinite(videoDuration) && videoDuration > 0 ? videoDuration : 60
  );
  const featureAllowed = isTimedOverlayFeatureAllowed(isFreeTier);
  const timedBlurs = featureAllowed ? editConfig.timedBlurs || [] : [];
  const timedTexts = featureAllowed ? editConfig.timedTexts || [] : [];

  const handleAddTimedBlur = () => {
    if (!featureAllowed) return;
    playUiSound('select');
    const startAt =
      currentTimeSec > 0.5 && currentTimeSec < safeDuration - 1 ? Math.floor(currentTimeSec) : 0;
    const item = createDefaultTimedBlur(safeDuration, timedBlurs.length, startAt);
    onChangeEditConfig((prev) => ({
      ...prev,
      timedBlurs: [...(prev.timedBlurs || []), item]
    }));
    onEnterEditMode();
    onSeekPreview(item.startSec + 0.1);
  };

  const handleUpdateTimedBlur = (id: string, patch: Partial<TimedBlurOverlay>) => {
    if (!featureAllowed) return;
    onChangeEditConfig((prev) => ({
      ...prev,
      timedBlurs: (prev.timedBlurs || []).map((b) => (b.id === id ? { ...b, ...patch } : b))
    }));
  };

  const handleRemoveTimedBlur = (id: string) => {
    if (!featureAllowed) return;
    playUiSound('tap');
    onChangeEditConfig((prev) => ({
      ...prev,
      timedBlurs: (prev.timedBlurs || []).filter((b) => b.id !== id)
    }));
  };

  const handleAddTimedText = () => {
    if (!featureAllowed) return;
    playUiSound('select');
    const startAt =
      currentTimeSec > 0.5 && currentTimeSec < safeDuration - 1 ? Math.floor(currentTimeSec) : 0;
    const item = createDefaultTimedText(safeDuration, timedTexts.length, startAt);
    onChangeEditConfig((prev) => ({
      ...prev,
      timedTexts: [...(prev.timedTexts || []), item]
    }));
    onEnterEditMode();
    onSeekPreview(item.startSec + 0.1);
  };

  const handleUpdateTimedText = (id: string, patch: Partial<TimedTextOverlay>) => {
    if (!featureAllowed) return;
    onChangeEditConfig((prev) => ({
      ...prev,
      timedTexts: (prev.timedTexts || []).map((t) => (t.id === id ? { ...t, ...patch } : t))
    }));
  };

  const handleRemoveTimedText = (id: string) => {
    if (!featureAllowed) return;
    playUiSound('tap');
    onChangeEditConfig((prev) => ({
      ...prev,
      timedTexts: (prev.timedTexts || []).filter((t) => t.id !== id)
    }));
  };

  return (
    <div
      data-testid="copyright-timed-overlays-panel"
      className="mt-2.5 flex flex-col gap-3 border-t border-stone-200/70 pt-3 dark:border-slate-800"
    >
      {/* 1) Timed Blur Section (Credit Mode Only) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <EyeOff className="size-3.5 text-amber-500" />
            <span className="text-[11.5px] font-bold text-stone-900 dark:text-white">
              {uiLang === 'my' ? 'အချိန်သတ်မှတ် Blur ထပ်အုပ်ရန်' : 'Timed Blur Overlay'}
            </span>
            {!featureAllowed ? (
              <span
                data-testid="timed-blur-credit-lock"
                className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300"
              >
                <Lock className="size-2.5" />
                <span>Credit Only</span>
              </span>
            ) : (
              timedBlurs.length > 0 && (
                <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  {timedBlurs.length}
                </span>
              )
            )}
          </div>
          <button
            type="button"
            data-testid="add-timed-blur-btn"
            disabled={!featureAllowed}
            onClick={handleAddTimedBlur}
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10.5px] font-bold whitespace-nowrap shadow-xs transition-colors ${
              featureAllowed
                ? 'cursor-pointer bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95'
                : 'cursor-not-allowed border border-stone-300 bg-stone-200/80 text-stone-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {featureAllowed ? <Plus className="size-3 stroke-[2.5]" /> : <Lock className="size-3" />}
            <span>Add Blur</span>
          </button>
        </div>

        <p className="text-[10.5px] leading-relaxed text-stone-500 dark:text-slate-400">
          {!featureAllowed
            ? uiLang === 'my'
              ? 'အချိန်သတ်မှတ် Blur ထပ်အုပ်ခြင်းကို Credit Mode တွင်သာ အသုံးပြုနိုင်ပါသည်။'
              : 'Timed Blur overlays are available in Credit Mode only.'
            : uiLang === 'my'
              ? `စချိန် / ဆုံးချိန် (ဥပမာ 0:00 – 0:11) ကို တိုက်ရိုက်ရိုက်ထည့်နိုင်ပြီး ဗီဒီယိုပေါ်တွင် လက်ဖြင့်ဆွဲချိန်နိုင်ပါသည်။`
              : `Type exact Start / End times (e.g. 0:00 – 0:11 of ${formatTimedOverlaySec(safeDuration)}) or tap presets. Drag & resize directly on the preview.`}
        </p>

        {featureAllowed && timedBlurs.length > 0 && (
          <div className="flex flex-col gap-2">
            {timedBlurs.map((tb, idx) => (
              <div
                key={tb.id}
                data-testid={`timed-blur-card-${idx}`}
                className="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-2.5 dark:border-amber-400/25 dark:bg-[#111720]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                      Blur #{idx + 1}
                    </span>
                    <span className="rounded bg-stone-200/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-stone-700 dark:bg-slate-800 dark:text-slate-200">
                      {formatTimedOverlaySec(tb.startSec)} – {formatTimedOverlaySec(tb.endSec)}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete timed blur ${idx + 1}`}
                    onClick={() => handleRemoveTimedBlur(tb.id)}
                    className="cursor-pointer rounded-md p-1 text-stone-400 transition-colors hover:bg-red-500/15 hover:text-red-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <TimeRangeControl
                  uiLang={uiLang}
                  idPrefix={`Timed blur ${idx + 1}`}
                  startSec={tb.startSec}
                  endSec={tb.endSec}
                  maxDuration={safeDuration}
                  currentTimeSec={currentTimeSec}
                  accent="amber"
                  onChangeRange={(startSec, endSec) =>
                    handleUpdateTimedBlur(tb.id, { startSec, endSec })
                  }
                  onJumpToStart={() => {
                    onEnterEditMode();
                    onSeekPreview(tb.startSec + 0.1);
                  }}
                />

                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[10px] font-medium text-stone-500 dark:text-slate-400">
                    {uiLang === 'my' ? 'Blur အား' : 'Strength'}
                  </span>
                  <input
                    type="range"
                    aria-label={`Timed blur ${idx + 1} strength`}
                    min={10}
                    max={60}
                    step={2}
                    value={tb.blurStrength}
                    onChange={(e) =>
                      handleUpdateTimedBlur(tb.id, { blurStrength: Number(e.target.value) })
                    }
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-amber-500 dark:bg-slate-700"
                  />
                  <span className="w-6 text-right font-mono text-[10px] text-stone-600 dark:text-slate-300">
                    {tb.blurStrength}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2) Timed Add Text Section (Credit Mode Only) */}
      <div className="flex flex-col gap-2 border-t border-stone-200/70 pt-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Type className="size-3.5 text-teal-500" />
            <span className="text-[11.5px] font-bold text-stone-900 dark:text-white">
              {uiLang === 'my' ? 'စာလုံးအသစ်ထည့်ရန် (Add Text)' : 'Add Timed Text'}
            </span>
            {!featureAllowed ? (
              <span
                data-testid="timed-text-credit-lock"
                className="inline-flex items-center gap-0.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-700 dark:text-amber-300"
              >
                <Lock className="size-2.5" />
                <span>Credit Only</span>
              </span>
            ) : (
              timedTexts.length > 0 && (
                <span className="rounded-md bg-teal-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal-700 dark:text-teal-300">
                  {timedTexts.length}
                </span>
              )
            )}
          </div>
          <button
            type="button"
            data-testid="add-timed-text-btn"
            disabled={!featureAllowed}
            onClick={handleAddTimedText}
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-[10.5px] font-bold whitespace-nowrap shadow-xs transition-colors ${
              featureAllowed
                ? 'cursor-pointer bg-teal-600 text-white hover:bg-teal-500 active:scale-95'
                : 'cursor-not-allowed border border-stone-300 bg-stone-200/80 text-stone-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {featureAllowed ? <Plus className="size-3 stroke-[2.5]" /> : <Lock className="size-3" />}
            <span>Add Text</span>
          </button>
        </div>

        <p className="text-[10.5px] leading-relaxed text-stone-500 dark:text-slate-400">
          {!featureAllowed
            ? uiLang === 'my'
              ? 'စာလုံးအသစ်ထည့်ခြင်း (Add Text) ကို Credit Mode တွင်သာ အသုံးပြုနိုင်ပါသည်။'
              : 'Custom Timed Text overlays are available in Credit Mode only.'
            : uiLang === 'my'
              ? 'အချိန် (ဥပမာ 0:11) ကို တိုက်ရိုက်ရိုက်ချိန်နိုင်ပြီး ဗီဒီယိုပေါ်တွင် စာလုံးကို လက်ဖြင့်ထောက်၍ နေရာနှင့် အကြီးအသေး ဆွဲချိန်နိုင်ပါသည်။'
              : 'Type exact Start / End times (e.g. 0:11) and tap the text on video preview to move or drag-resize font size.'}
        </p>

        {featureAllowed && timedTexts.length > 0 && (
          <div className="flex flex-col gap-2">
            {timedTexts.map((tt, idx) => (
              <div
                key={tt.id}
                data-testid={`timed-text-card-${idx}`}
                className="flex flex-col gap-2 rounded-xl border border-teal-500/30 bg-teal-500/[0.04] p-2.5 dark:border-teal-400/25 dark:bg-[#111720]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300">
                      Text #{idx + 1}
                    </span>
                    <span className="rounded bg-stone-200/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-stone-700 dark:bg-slate-800 dark:text-slate-200">
                      {formatTimedOverlaySec(tt.startSec)} – {formatTimedOverlaySec(tt.endSec)}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete timed text ${idx + 1}`}
                    onClick={() => handleRemoveTimedText(tt.id)}
                    className="cursor-pointer rounded-md p-1 text-stone-400 transition-colors hover:bg-red-500/15 hover:text-red-500"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {/* Text Content Input */}
                <textarea
                  rows={2}
                  aria-label={`Timed text ${idx + 1} content`}
                  value={tt.text}
                  onChange={(e) => handleUpdateTimedText(tt.id, { text: e.target.value })}
                  placeholder={uiLang === 'my' ? 'စာသားရိုက်ထည့်ပါ...' : 'Enter custom text...'}
                  className="w-full resize-none rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-900 outline-none placeholder:text-stone-400 focus:border-teal-500 dark:border-slate-700 dark:bg-[#0D1117] dark:text-white dark:focus:border-teal-400"
                />

                {/* Direct MM:SS Entry + Quick Chips + Timeline */}
                <TimeRangeControl
                  uiLang={uiLang}
                  idPrefix={`Timed text ${idx + 1}`}
                  startSec={tt.startSec}
                  endSec={tt.endSec}
                  maxDuration={safeDuration}
                  currentTimeSec={currentTimeSec}
                  accent="teal"
                  onChangeRange={(startSec, endSec) =>
                    handleUpdateTimedText(tt.id, { startSec, endSec })
                  }
                  onJumpToStart={() => {
                    onEnterEditMode();
                    onSeekPreview(tt.startSec + 0.1);
                  }}
                />

                {/* Font Size + Colors + Box Background */}
                <div className="flex flex-col gap-1.5 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-stone-500 dark:text-slate-400">
                      {uiLang === 'my' ? 'စာလုံးအရွယ်' : 'Size'}
                    </span>
                    <input
                      type="range"
                      aria-label={`Timed text ${idx + 1} font size`}
                      min={14}
                      max={64}
                      step={2}
                      value={tt.fontSize}
                      onChange={(e) =>
                        handleUpdateTimedText(tt.id, { fontSize: Number(e.target.value) })
                      }
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-teal-500 dark:bg-slate-700"
                    />
                    <span className="w-8 text-right font-mono text-[10px] text-stone-600 dark:text-slate-300">
                      {tt.fontSize}px
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {TIMED_TEXT_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.label}
                          aria-label={`Text color ${preset.label}`}
                          onClick={() => handleUpdateTimedText(tt.id, { color: preset.hex })}
                          style={{ backgroundColor: preset.hex }}
                          className={`size-4.5 cursor-pointer rounded-full border transition-transform hover:scale-110 ${
                            tt.color.toUpperCase() === preset.hex.toUpperCase()
                              ? 'scale-110 border-teal-500 ring-2 ring-teal-500/40'
                              : 'border-stone-400/60'
                          }`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[9.5px] text-stone-400">BG:</span>
                      {TIMED_TEXT_BG_PRESETS.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => handleUpdateTimedText(tt.id, { bgColor: bg.hex })}
                          className={`cursor-pointer rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold transition-colors ${
                            (tt.bgColor || '') === bg.hex
                              ? 'border-teal-500 bg-teal-500/15 text-teal-700 dark:text-teal-300'
                              : 'border-stone-200 bg-white text-stone-500 dark:border-slate-700 dark:bg-[#0D1117] dark:text-slate-400'
                          }`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
