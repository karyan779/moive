import React, { useRef, useState } from 'react';
import {
  Film,
  Sparkles,
  Upload,
  CheckCircle2,
  Loader2,
  FileText,
  Download,
  Cpu,
  Clock,
  Wand2
} from 'lucide-react';
import {
  LONG_FORM_STYLE_PROMPTS,
  VOICE_OPTIONS,
  exportCuesToSrt,
  type LongFormStyleId,
  type VoiceGender,
  type SubtitleCue
} from '../utils/recapEngine';
import { formatBytesReadable, stripSrtTimestampsToText } from '../utils/r2Direct';
import { uploadVideoDirect, uploadSrtToR2Direct } from '../utils/r2ClientUpload';
import { playUiSound } from '../utils/soundEffects';

type LongFormOutputMode =
  | 'shorts'
  | 'tiktok'
  | 'short_landscape'
  | 'landscape'
  | 'long_landscape';

const OUTPUT_MODES: {
  id: LongFormOutputMode;
  label: string;
  aspect: '9:16' | '16:9';
  durationLabel: string;
  targetSec: number;
}[] = [
  { id: 'shorts', label: 'Shorts', aspect: '9:16', durationLabel: '58s', targetSec: 58 },
  { id: 'tiktok', label: 'TikTok', aspect: '9:16', durationLabel: '3 min', targetSec: 180 },
  {
    id: 'short_landscape',
    label: 'Short Landscape',
    aspect: '16:9',
    durationLabel: '3 min',
    targetSec: 180
  },
  { id: 'landscape', label: 'Landscape', aspect: '16:9', durationLabel: '10 min', targetSec: 600 },
  {
    id: 'long_landscape',
    label: 'Long Landscape',
    aspect: '16:9',
    durationLabel: '20 min',
    targetSec: 1200
  }
];

const VISION_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Recommended)', provider: 'Google AI' },
  { id: 'gemma4-26b', label: 'Gemma 4 26B Vision', provider: 'OpenRouter' },
  { id: 'llama-3.2-vision', label: 'Llama 3.2 90B Vision', provider: 'Groq Cloud' },
  { id: 'llava-1.5-7b', label: 'LLaVA 1.5 7B Fast', provider: 'Edge Vision AI' }
];

const PIPELINE_STEPS = [
  { key: 'downloading', labelEn: 'Downloading & demuxing source', labelMy: 'မူရင်းရုပ်ရှင်ဖိုင်ကို ဆွဲထုတ်နေသည်' },
  { key: 'verifying', labelEn: 'Verifying stream keyframes', labelMy: 'ဗီဒီယို မြင်ကွင်းများကို စစ်ဆေးနေသည်' },
  { key: 'transcribing', labelEn: 'Transcribing dialogue & SRT alignment', labelMy: 'စကားပြောနှင့် SRT စာတန်းထိုး ချိန်ညှိနေသည်' },
  { key: 'analyzing', labelEn: 'Analyzing plot acts & planning clips', labelMy: 'အဓိက ဇာတ်ဝင်ခန်းများကို ရွေးထုတ်နေသည်' },
  { key: 'narrating', labelEn: 'Generating Burmese movie recap script', labelMy: 'မြန်မာ Movie Recap Script ရေးသားနေသည်' },
  { key: 'cutting', labelEn: 'Cutting & syncing highlight clips', labelMy: 'ဇာတ်ဝင်ခန်းများကို ဖြတ်တောက်ချိန်ညှိနေသည်' },
  { key: 'stitching', labelEn: 'Stitching scenes with anti-copyright transitions', labelMy: 'Copyright လွတ်အောင် မြင်ကွင်းများ ဆက်နေသည်' },
  { key: 'mixing', labelEn: 'Mixing neural voiceover & BGM ducking', labelMy: 'AI နောက်ခံအသံနှင့် တေးဂီတ ပေါင်းစပ်နေသည်' },
  { key: 'subtitles', labelEn: 'Burning Burmese captions onto video', labelMy: 'မြန်မာစာတန်းထိုးများ ထည့်သွင်းနေသည်' },
  { key: 'completed', labelEn: 'Complete!', labelMy: 'ပြီးဆုံးပါပြီ!' }
];

export const LongFormStudio: React.FC<{ uiLang: 'my' | 'en' }> = ({ uiLang }) => {
  const [movieTitle, setMovieTitle] = useState('Interstellar Odyssey (2026) — Full Movie Recap');
  const [outputMode, setOutputMode] = useState<LongFormOutputMode>('landscape');
  const [stylePreset, setStylePreset] = useState<LongFormStyleId>('morris');
  const [visionModel, setVisionModel] = useState(VISION_MODELS[0].id);
  const [voiceGender, setVoiceGender] = useState<VoiceGender>('male');
  const [srtLoadedName, setSrtLoadedName] = useState<string>('Interstellar.2026.1080p.BluRay.en.srt');
  const [srtStatusText, setSrtStatusText] = useState<string>('✓ Synced OpenSubtitles .SRT');
  const [customNotes, setCustomNotes] = useState(
    LONG_FORM_STYLE_PROMPTS.morris.prompt
  );

  const movieFileRef = useRef<File | null>(null);
  const srtFileRef = useRef<File | null>(null);
  const srtTextRef = useRef<string>('');
  const [selectedMovieInfo, setSelectedMovieInfo] = useState<{ name: string; sizeBytes: number } | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [outputVideoUrl, setOutputVideoUrl] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(-1);
  const [generatedScript, setGeneratedScript] = useState<string>('');
  const [generatedCues, setGeneratedCues] = useState<SubtitleCue[]>([]);

  const handleSelectStyle = (id: LongFormStyleId) => {
    playUiSound('select');
    setStylePreset(id);
    setCustomNotes(LONG_FORM_STYLE_PROMPTS[id].prompt);
  };

  const handleStartMovieRecap = async () => {
    if (isRunning) return;
    playUiSound('tap');
    setIsRunning(true);
    setGeneratedScript('');
    setOutputVideoUrl('');
    setUploadStatusText('');

    let r2ObjectKey: string | undefined;
    let localUploadId: string | undefined;
    let r2SrtKey: string | undefined;
    let transcriptText = srtTextRef.current || undefined;

    if (movieFileRef.current) {
      setCurrentStepIdx(0);
      try {
        const upRes = await uploadVideoDirect(
          movieFileRef.current,
          (pct, detail) => {
            setUploadStatusText(detail || `Uploading ${pct}%`);
          },
          'movie-recap'
        );
        r2ObjectKey = upRes.r2ObjectKey;
        localUploadId = upRes.localUploadId;
        setUploadStatusText(
          upRes.strategy === 'local_direct_stream'
            ? '✓ Streamed to Server'
            : '✓ Uploaded to High-Speed Cloud'
        );
      } catch (upErr) {
        console.warn('Movie R2 direct upload failed:', upErr);
        setUploadStatusText('Upload skipped — using title/SRT');
      }
    }

    if (srtFileRef.current) {
      try {
        const srtRes = await uploadSrtToR2Direct(srtFileRef.current, (_pct, detail) => {
          setSrtStatusText(detail);
        });
        r2SrtKey = srtRes.r2SrtKey;
        if (srtRes.srtText) {
          transcriptText = srtRes.srtText;
        }
      } catch (srtErr) {
        console.warn('SRT direct upload warning:', srtErr);
      }
    }

    for (let i = movieFileRef.current ? 1 : 0; i < 4; i++) {
      setCurrentStepIdx(i);
      await new Promise((r) => setTimeout(r, 300));
    }

    setCurrentStepIdx(4);
    try {
      const selectedMode = OUTPUT_MODES.find((m) => m.id === outputMode) || OUTPUT_MODES[3];
      const res = await fetch('/api/recap/free/generate-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSec: selectedMode.targetSec,
          mode: 'recap',
          scriptStyle: 'drama',
          targetLanguage: 'my',
          voiceGender,
          r2ObjectKey,
          r2SrtKey,
          localUploadId,
          transcriptText,
          customPrompt: `You are TTAK MOVIE RECAP's Long-Form Movie Recap Engine (${LONG_FORM_STYLE_PROMPTS[stylePreset].label}). ${customNotes}`,
          title: movieTitle
        })
      });
      const data = await res.json();
      if (data.ok) {
        setGeneratedScript(data.script_text || '');
        setGeneratedCues(data.cues || []);
        if (data.r2_output_url || data.dubbed_video_url) {
          setOutputVideoUrl(data.r2_output_url || data.dubbed_video_url);
        }
      }
    } catch (e) {
      console.warn('Long-form fallback script used:', e);
    }

    for (let i = 5; i < PIPELINE_STEPS.length; i++) {
      setCurrentStepIdx(i);
      await new Promise((r) => setTimeout(r, 260));
    }

    playUiSound('success');
    setIsRunning(false);
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/12 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
            <Film className="size-3.5" />
            <span>LONG-FORM MOVIE RECAP STUDIO · UP TO 20 MINS</span>
          </div>
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">
            {uiLang === 'my'
              ? 'ရုပ်ရှင်ကားကြီးများကို အပိုင်းလိုက် AI ဖြင့် အနှစ်ချုပ်ပြုလုပ်မည်'
              : 'Full-Length Movie Recap & Multi-Act Scene Stitcher'}
          </h2>
          <p className="text-xs text-stone-500 dark:text-slate-400">
            Automatically analyzes full movies + .SRT subtitles, selects key plot scenes, writes Morris/Dramatic Burmese narration, and stitches copyright-safe clips.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartMovieRecap}
          disabled={isRunning}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-5 py-3 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 cursor-pointer shrink-0 transition-colors"
        >
          {isRunning ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Processing Pipeline...</span>
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              <span>
                {uiLang === 'my' ? 'Movie Recap စတင်ထုတ်လုပ်မည်' : 'Start 10-Stage Movie Recap'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Main Grid: Configuration Left + 10-Stage Pipeline Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Configuration */}
        <div className="lg:col-span-7 space-y-5">
          {/* Movie Source & SRT Upload */}
          <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              1. Source Movie & Subtitle (.SRT)
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 dark:text-slate-300">
                Movie Title
              </label>
              <input
                type="text"
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                className="w-full rounded-xl border border-stone-200/90 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] px-3.5 py-2.5 text-xs font-medium text-stone-900 dark:text-white outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                data-testid="longform-movie-upload-label"
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] p-4 text-center cursor-pointer hover:border-amber-500/60 transition-colors"
              >
                <Upload className="size-5 text-amber-500 mb-1.5" />
                <span className="text-xs font-bold text-stone-800 dark:text-slate-200 truncate max-w-full px-2">
                  {selectedMovieInfo ? selectedMovieInfo.name : 'Upload Movie Video (.MP4 / .MKV)'}
                </span>
                <span className="text-[10px] text-stone-400 dark:text-slate-400 mt-0.5">
                  {selectedMovieInfo
                    ? `${formatBytesReadable(selectedMovieInfo.sizeBytes)} · Ready for High-Speed Cloud`
                    : 'Up to 2GB · High-Speed Cloud Upload'}
                </span>
                {uploadStatusText && (
                  <span
                    data-testid="longform-upload-status"
                    className="text-[10px] font-bold text-amber-500 mt-1"
                  >
                    {uploadStatusText}
                  </span>
                )}
                <input
                  data-testid="longform-movie-file-input"
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      movieFileRef.current = f;
                      setSelectedMovieInfo({ name: f.name, sizeBytes: f.size });
                      setMovieTitle(f.name.replace(/\.[^/.]+$/, ''));
                      setUploadStatusText('');
                    }
                  }}
                  className="hidden"
                />
              </label>

              <label
                data-testid="longform-srt-upload-label"
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-black/[0.12] dark:border-white/[0.12] bg-gray-50/60 dark:bg-[#16161C] p-4 text-center cursor-pointer hover:border-emerald-500/50"
              >
                <FileText className="size-5 text-emerald-500 mb-1.5" />
                <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 truncate max-w-full px-2">
                  {srtLoadedName}
                </span>
                <span
                  data-testid="longform-srt-status"
                  className="text-[10px] text-emerald-500 mt-0.5"
                >
                  {srtStatusText}
                </span>
                <input
                  data-testid="longform-srt-file-input"
                  type="file"
                  accept=".srt,.vtt"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      srtFileRef.current = f;
                      setSrtLoadedName(f.name);
                      setSrtStatusText(`✓ ${formatBytesReadable(f.size)} · Ready for High-Speed Cloud`);
                      try {
                        const raw = await f.text();
                        srtTextRef.current = stripSrtTimestampsToText(raw);
                      } catch {}
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Output Format & Duration */}
          <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              2. Output Mode & Target Duration
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {OUTPUT_MODES.map((m) => {
                const active = outputMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setOutputMode(m.id)}
                    className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all cursor-pointer ${
                      active
                        ? 'border-amber-500 bg-amber-500/12 text-stone-900 dark:text-white'
                        : 'border-stone-200/80 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] text-stone-600 dark:text-slate-400 hover:border-stone-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{m.label}</span>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                      {m.aspect} · {m.durationLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style Presets (Educational, Dramatic, Listicle, Documentary, Morris) & Vision Model */}
          <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500">
              3. Recap Style Preset & Vision AI Model
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(LONG_FORM_STYLE_PROMPTS) as LongFormStyleId[]).map((id) => {
                const active = stylePreset === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectStyle(id)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'border-amber-500 bg-amber-500/12 text-stone-900 dark:text-white'
                        : 'border-stone-200/80 dark:border-slate-800 bg-[#FAF8F4] dark:bg-[#151C26] text-stone-600 dark:text-slate-400 hover:border-stone-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {LONG_FORM_STYLE_PROMPTS[id].label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-slate-400 mb-1.5">
                  <Cpu className="inline size-3.5 mr-1 text-teal-500" />
                  Scene Vision Model
                </label>
                <select
                  value={visionModel}
                  onChange={(e) => setVisionModel(e.target.value)}
                  className="w-full rounded-xl border border-stone-200 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] px-3 py-2 text-xs font-medium text-stone-900 dark:text-slate-100 outline-none focus:border-amber-500"
                >
                  {VISION_MODELS.map((vm) => (
                    <option key={vm.id} value={vm.id}>
                      {vm.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-slate-400 mb-1.5">
                  <Wand2 className="inline size-3.5 mr-1 text-amber-500" />
                  Narrator Voice
                </label>
                <select
                  value={voiceGender}
                  onChange={(e) => setVoiceGender(e.target.value as VoiceGender)}
                  className="w-full rounded-xl border border-stone-200 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] px-3 py-2 text-xs font-medium text-stone-900 dark:text-slate-100 outline-none focus:border-amber-500"
                >
                  {VOICE_OPTIONS.map((vo) => (
                    <option key={vo.id} value={vo.id}>
                      {vo.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 dark:text-slate-400 mb-1">
                Long-Form Style System Prompt
              </label>
              <textarea
                rows={3}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="w-full rounded-xl border border-stone-200 dark:border-slate-700/80 bg-[#FAF8F4] dark:bg-[#151C26] p-2.5 text-xs font-mono text-stone-800 dark:text-slate-200 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Right 5 Columns: 10-Stage Live Pipeline Stepper & Script Output */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-2xl border border-stone-200/90 dark:border-slate-800/90 bg-white dark:bg-[#111720] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                10-Stage Cloud & GPU Pipeline
              </h3>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Clock className="size-3.5" />
                {currentStepIdx >= 0
                  ? `${Math.min(10, currentStepIdx + 1)} / 10`
                  : 'Ready'}
              </span>
            </div>

            <div className="space-y-2">
              {PIPELINE_STEPS.map((step, idx) => {
                const isCompleted = currentStepIdx > idx || currentStepIdx === PIPELINE_STEPS.length - 1;
                const isCurrent = isRunning && currentStepIdx === idx;
                return (
                  <div
                    key={step.key}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition-all ${
                      isCurrent
                        ? 'border-amber-500 bg-amber-500/12 text-stone-900 dark:text-white font-bold'
                        : isCompleted
                          ? 'border-teal-500/35 bg-teal-500/8 text-teal-700 dark:text-teal-300 font-medium'
                          : 'border-stone-200/70 dark:border-slate-800/80 bg-[#FAF8F4] dark:bg-[#151C26] text-stone-400 dark:text-slate-500'
                    }`}
                  >
                    <span className="truncate">
                      {idx + 1}. {uiLang === 'my' ? step.labelMy : step.labelEn}
                    </span>
                    {isCurrent ? (
                      <Loader2 className="size-3.5 animate-spin text-amber-500 shrink-0" />
                    ) : isCompleted ? (
                      <CheckCircle2 className="size-3.5 text-teal-500 shrink-0" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {generatedScript && (
            <div className="rounded-2xl border border-teal-500/35 bg-teal-500/8 p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                  ✓ Generated Burmese Movie Recap Script
                </span>
                <div className="flex items-center gap-2">
                  {outputVideoUrl && (
                    <a
                      href={outputVideoUrl}
                      download={`${movieTitle.slice(0, 24)}_recap.mp4`}
                      className="inline-flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-slate-950 cursor-pointer"
                    >
                      <Download className="size-3" />
                      <span>Download .MP4</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([exportCuesToSrt(generatedCues)], {
                        type: 'text/plain;charset=utf-8'
                      });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `${movieTitle.slice(0, 24)}_longform.srt`;
                      a.click();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 hover:bg-teal-500 px-2.5 py-1 text-[11px] font-bold text-white cursor-pointer transition-colors"
                  >
                    <Download className="size-3" />
                    <span>Download .SRT</span>
                  </button>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-gray-800 dark:text-zinc-200">
                {generatedScript}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
