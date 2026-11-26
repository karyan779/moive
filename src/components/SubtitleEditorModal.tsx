import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Search,
  Replace,
  FileText,
  Download,
  Trash2,
  Play,
  Check,
  Edit3
} from 'lucide-react';
import type { SubtitleCue, TargetLanguageCode } from '../utils/recapEngine';
import {
  updateSubtitleCueText,
  deleteSubtitleCueById,
  replaceSubtitleTextAcrossCues
} from '../utils/recapEngine';

interface SubtitleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiLang: 'my' | 'en';
  cues: SubtitleCue[];
  activeSubtitleLang: TargetLanguageCode;
  currentTimeSec: number;
  onChangeCues: (nextCues: SubtitleCue[]) => void;
  onSeekToSec: (sec: number) => void;
  onDownloadSrt: () => void;
  onDownloadTxt: () => void;
}

function formatCueTimecode(ms: number): string {
  const totalSec = Math.max(0, (Number(ms) || 0) / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = Math.floor(totalSec % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const SubtitleEditorModal: React.FC<SubtitleEditorModalProps> = ({
  isOpen,
  onClose,
  uiLang,
  cues,
  activeSubtitleLang,
  currentTimeSec,
  onChangeCues,
  onSeekToSec,
  onDownloadSrt,
  onDownloadTxt
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [replaceFeedback, setReplaceFeedback] = useState<string | null>(null);
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const currentMs = Math.round((currentTimeSec || 0) * 1000);

  const activeCueId = useMemo(() => {
    const match = cues.find((c) => currentMs >= c.start_ms && currentMs <= c.end_ms);
    return match?.id || null;
  }, [cues, currentMs]);

  const filteredCues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cues;
    return cues.filter(
      (c) =>
        String(c.text || '').toLowerCase().includes(q) ||
        String(c.originalText || '').toLowerCase().includes(q)
    );
  }, [cues, searchQuery]);

  if (!isOpen) return null;

  const handleApplyReplaceAll = () => {
    if (!findText.trim()) return;
    const result = replaceSubtitleTextAcrossCues(cues, findText, replaceText, activeSubtitleLang);
    if (result.matchCount > 0) {
      onChangeCues(result.cues);
      setReplaceFeedback(
        uiLang === 'my'
          ? `${result.matchCount} နေရာ ပြင်ဆင်ပြီးပါပြီ`
          : `Replaced ${result.matchCount} match${result.matchCount !== 1 ? 'es' : ''}`
      );
    } else {
      setReplaceFeedback(
        uiLang === 'my' ? 'တူညီသော စာလုံးမတွေ့ပါ' : 'No matching text found'
      );
    }
    window.setTimeout(() => setReplaceFeedback(null), 2600);
  };

  const handleJumpToActive = () => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={uiLang === 'my' ? 'စာတန်းထိုး စာသားပြင်ဆင်ရန်' : 'Edit Subtitle Text'}
      data-testid="subtitle-editor-modal"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-stone-200/90 bg-[#FAF8F4] shadow-2xl sm:rounded-2xl dark:border-slate-700/80 dark:bg-[#0F151E]">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-stone-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#131A24]">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Edit3 className="size-4" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-stone-900 dark:text-white">
                {uiLang === 'my' ? 'Subtitle / Text ပြင်ဆင်ရန်' : 'Edit Subtitles & Text'}
              </h2>
              <p className="truncate text-[11px] text-stone-500 dark:text-slate-400">
                {uiLang === 'my'
                  ? `စာကြောင်း ${cues.length} ကြောင်း · ပြင်လိုက်တာနဲ့ Preview, .SRT, .TXT နဲ့ MP4 Export မှာ ချက်ချင်းပြောင်းပါမယ်`
                  : `${cues.length} lines · Edits sync live to preview, .SRT, .TXT & MP4 export`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close subtitle editor"
            className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-stone-200/80 bg-stone-50 text-stone-600 transition-colors hover:bg-stone-100 dark:border-slate-700/80 dark:bg-[#18212E] dark:text-slate-300 dark:hover:bg-[#202B3C]"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Toolbar: Search + Find & Replace + Export Buttons */}
        <div className="flex flex-col gap-2 border-b border-stone-200/80 bg-white/80 px-4 py-2.5 dark:border-slate-800/80 dark:bg-[#111720]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter subtitle lines"
                placeholder={uiLang === 'my' ? 'စာသားရှာရန်...' : 'Search subtitles...'}
                className="h-9 w-full rounded-xl border border-stone-200/90 bg-white pr-3 pl-8 text-xs text-stone-900 outline-none focus:border-amber-500 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowFindReplace((v) => !v)}
              className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors ${
                showFindReplace
                  ? 'border-amber-500/60 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'border-stone-200/90 bg-white text-stone-700 hover:bg-stone-50 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-200 dark:hover:bg-[#1D2735]'
              }`}
            >
              <Replace className="size-3.5" />
              <span>{uiLang === 'my' ? 'အစားထိုး' : 'Replace'}</span>
            </button>

            {activeCueId && (
              <button
                type="button"
                onClick={handleJumpToActive}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-teal-500/40 bg-teal-500/10 px-3 text-xs font-semibold text-teal-700 transition-colors hover:bg-teal-500/20 dark:text-teal-300"
              >
                <Play className="size-3" />
                <span>{uiLang === 'my' ? 'လက်ရှိနေရာ' : 'Current'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onDownloadTxt}
              data-testid="subtitle-editor-download-txt"
              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-stone-200/90 bg-white px-2.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-200 dark:hover:bg-[#1D2735]"
            >
              <Download className="size-3" />
              <span>.TXT</span>
            </button>

            <button
              type="button"
              onClick={onDownloadSrt}
              className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-stone-200/90 bg-white px-2.5 text-xs font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-slate-200 dark:hover:bg-[#1D2735]"
            >
              <FileText className="size-3" />
              <span>.SRT</span>
            </button>
          </div>

          {showFindReplace && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-2">
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                aria-label="Find word to replace"
                placeholder={uiLang === 'my' ? 'မှားနေတဲ့စာလုံး...' : 'Find text...'}
                className="h-8 min-w-[120px] flex-1 rounded-lg border border-stone-200/90 bg-white px-2.5 text-xs text-stone-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-[#151C26] dark:text-white"
              />
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                aria-label="Replacement text"
                placeholder={uiLang === 'my' ? 'ပြင်မည့်စာလုံး...' : 'Replace with...'}
                className="h-8 min-w-[120px] flex-1 rounded-lg border border-stone-200/90 bg-white px-2.5 text-xs text-stone-900 outline-none focus:border-amber-500 dark:border-slate-700 dark:bg-[#151C26] dark:text-white"
              />
              <button
                type="button"
                data-testid="subtitle-editor-replace-all-btn"
                onClick={handleApplyReplaceAll}
                disabled={!findText.trim()}
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg bg-amber-500 px-3 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400 disabled:opacity-40"
              >
                <span>{uiLang === 'my' ? 'အားလုံးပြင်မည်' : 'Replace All'}</span>
              </button>
              {replaceFeedback && (
                <span className="w-full text-[11px] font-semibold text-teal-600 dark:text-teal-400">
                  {replaceFeedback}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Editable Cue Rows */}
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 sm:px-4">
          {filteredCues.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-stone-400 dark:text-slate-500">
              {uiLang === 'my'
                ? 'ရှာဖွေထားသော စာတန်းမတွေ့ပါ'
                : 'No subtitle lines match your filter.'}
            </div>
          ) : (
            filteredCues.map((cue, idx) => {
              const isActive = cue.id === activeCueId;
              const origIdx = cues.findIndex((c) => c.id === cue.id);
              const lineNum = origIdx >= 0 ? origIdx + 1 : idx + 1;
              return (
                <div
                  key={cue.id}
                  ref={isActive ? activeRowRef : undefined}
                  data-testid={`subtitle-cue-row-${lineNum}`}
                  className={`flex flex-col gap-1.5 rounded-xl border p-2.5 transition-colors ${
                    isActive
                      ? 'border-amber-500/70 bg-amber-500/[0.08] dark:border-amber-400/60 dark:bg-amber-500/[0.1]'
                      : 'border-stone-200/90 bg-white dark:border-slate-800 dark:bg-[#131A24]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex min-w-[26px] items-center justify-center rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-600 dark:bg-slate-800 dark:text-slate-300">
                        #{lineNum}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSeekToSec(cue.start_ms / 1000)}
                        title={uiLang === 'my' ? 'ဒီအချိန်သို့ ဗီဒီယိုရွှေ့ကြည့်ရန်' : 'Jump video to this line'}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-teal-700 transition-colors hover:bg-teal-500/20 dark:text-teal-300"
                      >
                        <Play className="size-2.5 fill-current" />
                        <span>
                          {formatCueTimecode(cue.start_ms)} – {formatCueTimecode(cue.end_ms)}
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => onChangeCues(deleteSubtitleCueById(cues, cue.id))}
                      aria-label={`Delete subtitle line ${lineNum}`}
                      title={uiLang === 'my' ? 'ဒီစာကြောင်းဖျက်ရန်' : 'Delete line'}
                      className="inline-flex size-7 cursor-pointer items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  {cue.originalText && cue.originalText !== cue.text && (
                    <p className="truncate px-1 text-[11px] text-stone-400 dark:text-slate-500">
                      {cue.originalText}
                    </p>
                  )}

                  <textarea
                    rows={2}
                    value={cue.text}
                    aria-label={`Subtitle line ${lineNum} text`}
                    onChange={(e) => {
                      onChangeCues(
                        updateSubtitleCueText(cues, cue.id, e.target.value, activeSubtitleLang)
                      );
                    }}
                    className="w-full resize-none rounded-lg border border-stone-200/90 bg-[#FAF8F4] px-3 py-2 text-sm leading-relaxed text-stone-900 outline-none focus:border-amber-500 focus:bg-white dark:border-slate-700/80 dark:bg-[#0D131C] dark:text-slate-100 dark:focus:border-amber-400"
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-stone-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-[#131A24]">
          <span className="text-[11px] text-stone-500 dark:text-slate-400">
            {uiLang === 'my'
              ? 'ပြင်ဆင်မှုများ အလိုအလျောက် သိမ်းဆည်းပြီးဖြစ်ပါသည်'
              : 'All edits are saved live automatically'}
          </span>
          <button
            type="button"
            onClick={onClose}
            data-testid="subtitle-editor-done-btn"
            className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-amber-500 px-5 text-xs font-bold text-slate-950 shadow-sm transition-colors hover:bg-amber-400 active:scale-95"
          >
            <Check className="size-3.5" />
            <span>{uiLang === 'my' ? 'ပြီးပါပြီ' : 'Done'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
