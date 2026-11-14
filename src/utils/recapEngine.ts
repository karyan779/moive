export type AppLanguage = 'my' | 'en' | 'th' | 'zh' | 'ja';

export type RecapMode = 'recap' | 'translate';
export type TranslateAudioMode = 'dub' | 'captions-only';
export type VoiceGender =
  | 'male'
  | 'female'
  | 'kore'
  | 'aoede'
  | 'charon'
  | 'leda'
  | 'fenrir'
  | 'puck'
  | 'orus'
  | 'zephyr';
export type CreditPlanId = 'free' | 'starter-pack' | 'creator-pro' | 'creator-pro-max';
export type ScriptStyleId = 'narrator' | 'drama' | 'casual' | 'news' | 'none';
export type LongFormStyleId = 'educational' | 'dramatic' | 'listicle' | 'documentary' | 'morris';
export type AspectRatioMode = 'original' | '9:16' | '16:9' | '1:1' | '4:5';
export type FramingFitMode = 'pad' | 'crop';
export type FocusAnchor = 'top' | 'center' | 'bottom';
export type BrandGridPos = 'tl' | 'tc' | 'tr' | 'ml' | 'mc' | 'mr' | 'bl' | 'bc' | 'br';
export type TargetLanguageCode = 'my' | 'th' | 'ja' | 'ko' | 'zh' | 'en';
export type BlurStyleMode = 'frosted' | 'simple';
export type SubtitleStyleMode = 'outline_black' | 'box_black';
export type BurmeseFontStyle =
  | 'Yati_Round'
  | 'Pyidaungsu'
  | 'Padauk_Bold'
  | 'Noto_Serif_Bold'
  | 'Noto_Sans_Bold'
  | 'TharLon_Classic'
  | 'A15_Innwa'
  | 'Z06-Walone';

export const FREE_DAILY_VIDEO_LIMIT = 3; // 3 free videos per day
export const FREE_MAX_DURATION_SEC = 150; // 2:30 minutes (150s) max per free video

export interface BlurRegion {
  id: string;
  x: number; // 0..100 percentage
  y: number; // 0..100 percentage
  width: number; // 5..100 percentage
  height: number; // 3..100 percentage
  blurStrength: number; // 10..60 px
}

export interface SubtitleOverlayConfig {
  enabled: boolean;
  style: SubtitleStyleMode;
  fontStyle: BurmeseFontStyle;
  x: number; // 0..100 center x
  y: number; // 0..100 center y
  fontSize: number; // 16..68 (default 44 -> 100%)
  maxWidth: number; // 30..96 percentage
  samplePreviewLight: boolean;
}

export interface AntiCopyrightEffects {
  outputHD: boolean; // FHD 1080p vs 720p
  zoom: boolean; // Dynamic zoom 1.15x sine wave 4s cycle
  mirror: boolean; // Horizontal flip
  colorShift: boolean; // hue-rotate(10deg) saturate(1.1)
  crop: boolean; // Slight crop 4% edge trim
  grain: boolean; // Film grain procedural overlay
  pitchShift: boolean; // Audio pitch +5%
}

export interface CoverSubtitleBandConfig {
  enabled: boolean;
  heightPct: number; // 3..50
  bottomPct: number; // 0..60
  blurStrength: number; // 1..40
}

export interface WatermarkTextConfig {
  enabled: boolean;
  text: string;
  sizePx: number; // 10..40
  opacity: number; // 10..100
  pos: BrandGridPos;
  moving: boolean;
}

export interface BrandLogoConfig {
  enabled: boolean;
  dataUrl?: string;
  sizePx: number; // 24..120
  opacity: number; // 10..100
  pos: BrandGridPos;
}

export interface DeepRecapEditConfig {
  fitMode: FramingFitMode;
  focus: FocusAnchor;
  padSize: number; // 1.0..1.6
  padX: number; // -100..100
  padY: number; // -100..100
  frameZoom: number; // 100..130
  coverSubtitleBand: CoverSubtitleBandConfig;
  watermarkText: WatermarkTextConfig;
  brandLogo: BrandLogoConfig;
  captionTextColor: string; // empty string = default theme color (#FFFFFF / #FDE047)
  captionOutlineWidth: number; // 0..8
}

export const DEFAULT_DEEPRECAP_EDIT_CONFIG: DeepRecapEditConfig = {
  fitMode: 'pad',
  focus: 'center',
  padSize: 1.0,
  padX: 0,
  padY: 0,
  frameZoom: 100,
  coverSubtitleBand: {
    enabled: false,
    heightPct: 14,
    bottomPct: 6,
    blurStrength: 20
  },
  watermarkText: {
    enabled: false,
    text: '',
    sizePx: 18,
    opacity: 75,
    pos: 'tr',
    moving: false
  },
  brandLogo: {
    enabled: false,
    dataUrl: undefined,
    sizePx: 52,
    opacity: 90,
    pos: 'tl'
  },
  captionTextColor: '',
  captionOutlineWidth: 3
};

export const CAPTION_COLOR_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: 'auto', label: 'Default', hex: '' },
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'yellow', label: 'Yellow', hex: '#FFE600' },
  { id: 'cyan', label: 'Cyan', hex: '#7DE3FF' },
  { id: 'pink', label: 'Pink', hex: '#FF8FB1' },
  { id: 'green', label: 'Green', hex: '#8CF0A0' },
  { id: 'orange', label: 'Orange', hex: '#FF9F43' }
];

export interface SubtitleCue {
  id: string;
  start_ms: number;
  end_ms: number;
  text: string;
  originalText?: string;
}

export interface HighlightClip {
  start_ms: number;
  end_ms: number;
  label?: string;
}

export interface AutoFlowLogStep {
  id: string;
  timestamp: string;
  stage: 'upload' | 'extract_audio' | 'transcribe' | 'script_prompt' | 'tts' | 'render' | 'done';
  message: string;
  detail?: string;
  durationMs?: number;
}

export interface RecapJobRecord {
  id: string;
  ulid: string;
  original_filename: string;
  title: string;
  sourceUrl?: string;
  createdAt: string;
  durationSec: number;
  resolution: '720p' | '1080p';
  mode: RecapMode;
  scriptStyle: ScriptStyleId;
  targetLanguage: TargetLanguageCode;
  voiceGender: VoiceGender;
  aspectRatio: AspectRatioMode;
  status: 'done' | 'processing' | 'failed';
  videoUrl: string;
  renderedBlobUrl?: string;
  audioBase64?: string;
  scriptText: string;
  sourceTranscript?: string;
  systemPromptUsed: string;
  cues: SubtitleCue[];
  highlightClips: HighlightClip[];
  blurRegions: BlurRegion[];
  blurStyle: BlurStyleMode;
  subtitleConfig: SubtitleOverlayConfig;
  effects: AntiCopyrightEffects;
  editConfig?: DeepRecapEditConfig;
  autoFlowLogs: AutoFlowLogStep[];
}

export interface ScriptStylePromptDefinition {
  id: ScriptStyleId;
  labelEn: string;
  labelMy: string;
  badge: string;
  descriptionEn: string;
  descriptionMy: string;
  systemPrompt: string;
  pacingWpm: number;
}

export const UPLOADED_VIDEO_PATH =
  '/assets/aistudio/SaveTik.co_7673413291896605967-hd_47ddcad1.mp4';
export const UPLOADED_VIDEO_FILENAME =
  'SaveTik.co_7673413291896605967-hd_47ddcad1.mp4';

export const SCRIPT_STYLE_PROMPTS: Record<ScriptStyleId, ScriptStylePromptDefinition> = {
  narrator: {
    id: 'narrator',
    labelEn: 'Fast Recap',
    labelMy: 'အမြန်ပြန်ပြောပြမယ် (Fast Recap)',
    badge: 'DEFAULT · HOOK-DRIVEN',
    descriptionEn: 'Punchy third-person movie narrator with a strong 3-second hook and tight 1-line phrase captions.',
    descriptionMy: 'ကြည့်ရှုသူကို ၃ စက္ကန့်အတွင်း ဆွဲဆောင်နိုင်မယ့် သွက်လက်တိကျသော ၁ ကြောင်းစာ စာတန်းထိုးနှင့် ပြောဟန်။',
    pacingWpm: 150,
    systemPrompt: `You are TTAK MOVIE RECAP's Senior Burmese Movie Recap Narrator ("Fast Recap / narrator" preset).
TASK: Transform the input video's audio speech and visual scenes into a high-retention, CONTINUOUS movie recap script with SHORT 1-LINE PHRASES that keep the narrator speaking smoothly across the ENTIRE video duration.
CRITICAL PACING, SYNC & CAPTION RULES:
1. SHORT 1-LINE PHRASES ONLY: Each cue.text MUST be a natural spoken Burmese phrase of 5 to 9 words (28 to 48 Burmese characters, ~2.2s–2.8s when spoken). Never output huge multi-line paragraphs in one cue.
2. FULL TIMELINE CONTINUITY (85%–95% COVERAGE): Cover the ENTIRE video from 0ms to the end continuously! Leave ONLY 100ms–250ms natural breath gaps between cues. NEVER leave 2s–5s dead-air gaps in the middle or second half of the video.
3. SCENE-MATCHED TIMING: Anchor each cue's start_ms and end_ms directly to what is happening on screen in that exact timestamp window (early scenes, mid-video turning points, climax, and ending).
4. HOOK FIRST (0.0s - 3.0s): Start immediately with the core conflict on screen.
5. NATURAL SPOKEN BURMESE: Write smooth, conversational Burmese suitable for my-MM-ThihaNeural / my-MM-NilarNeural TTS flow. Do NOT include trailing "။" inside subtitle bars.
6. OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  drama: {
    id: 'drama',
    labelEn: 'Storytelling',
    labelMy: 'ပုံပြင်ပြောပြမယ် (Storytelling)',
    badge: 'EMOTIONAL · CINEMATIC',
    descriptionEn: 'Suspenseful, emotional storytelling with short phrase-synced 1-line captions.',
    descriptionMy: 'ဇာတ်ကောင်တွေရဲ့ စိတ်ခံစားချက်နဲ့ လှည့်ကွက်တွေကို ၁ ကြောင်းစာ စာတန်းထိုးဖြင့် ပြောပြမယ့်ဟန်။',
    pacingWpm: 140,
    systemPrompt: `You are TTAK MOVIE RECAP's Cinematic Storytelling Recap Writer ("Storytelling / drama" preset).
TASK: Craft an emotionally immersive, CONTINUOUS movie recap script using SHORT 1-LINE PHRASES (28–48 Burmese characters per cue, 2.2s–3.0s each) that narrates every scene from start to finish without long silent gaps.
RULES:
1. CONTINUOUS NARRATION (85%–95% VIDEO COVERAGE): Keep narration flowing steadily through the beginning, middle, climax, and finale with only 120ms–260ms natural pauses between cues—never leave 2s+ silent gaps halfway through.
2. SCENE-LOCKED TIMESTAMPS: Match every cue to the visual action and emotional turning point at that exact time.
3. OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  casual: {
    id: 'casual',
    labelEn: 'Gen Z',
    labelMy: 'လူငယ်ဆန်ဆန် (Gen Z)',
    badge: 'VIRAL · TIKTOK / REELS',
    descriptionEn: 'Witty, energetic Gen-Z commentary with rapid 1-line TikTok highlight captions.',
    descriptionMy: 'TikTok နဲ့ Reels အတွက် အထူးသင့်တော်တဲ့ လူငယ်ဆန်ဆန် ၁ ကြောင်းစာ စာတန်းထိုး ပြောဟန်။',
    pacingWpm: 158,
    systemPrompt: `You are TTAK MOVIE RECAP's Viral Gen-Z Short-Form Creator ("Gen Z / casual" preset).
TASK: Write a punchy, energetic, continuous short-form recap script for TikTok/Reels with SHORT 1-LINE PHRASES (28–46 Burmese characters per cue, 2.0s–2.6s each).
RULES:
1. ZERO DEAD AIR: Maintain lively continuous commentary across 90%+ of the video timeline from 0ms to end with tight 100ms–200ms pauses between cues.
2. OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  news: {
    id: 'news',
    labelEn: 'News',
    labelMy: 'သတင်းကြေညာသူ (News)',
    badge: 'AUTHORITATIVE · CLEAR',
    descriptionEn: 'Crisp, objective broadcast anchor delivery with short 1-line synced captions.',
    descriptionMy: 'သတင်းကြေညာသူတစ်ဦးလို တိကျရှင်းလင်းသော ၁ ကြောင်းစာ စာတန်းထိုး တင်ဆက်ဟန်။',
    pacingWpm: 145,
    systemPrompt: `You are TTAK MOVIE RECAP's Broadcast News & Fact Recap Anchor ("News / news" preset).
TASK: Summarize the video's events in a clear, continuous broadcast narration with SHORT 1-LINE PHRASES (28–48 Burmese characters per cue, 2.2s–2.8s each) covering 85%–95% of the video duration with only 120ms–250ms pauses.
OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  none: {
    id: 'none',
    labelEn: 'Documentary',
    labelMy: 'မှတ်တမ်းရုပ်ရှင် (Documentary)',
    badge: 'DEEP · OBSERVATIONAL',
    descriptionEn: 'Calm, insightful documentary narration with short 1-line phrase captions.',
    descriptionMy: 'မှတ်တမ်းရုပ်ရှင်တစ်ခုလို လေးနက်တည်ငြိမ်သော ၁ ကြောင်းစာ စာတန်းထိုး ရှင်းပြဟန်။',
    pacingWpm: 135,
    systemPrompt: `You are TTAK MOVIE RECAP's Documentary Narrator ("Documentary / none" preset).
TASK: Write an insightful, continuous documentary narration with SHORT 1-LINE PHRASES (28–48 Burmese characters per cue, 2.3s–3.0s each) covering 85%–95% of the full video duration without multi-second silent gaps.
OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  }
};

export const LONG_FORM_STYLE_PROMPTS: Record<LongFormStyleId, { label: string; prompt: string }> = {
  educational: {
    label: 'Educational',
    prompt: 'Break down the movie plot and underlying themes with clear cause-and-effect explanations, character psychology insights, and structured chapter transitions.'
  },
  dramatic: {
    label: 'Dramatic',
    prompt: 'Maximize suspense, cliffhangers, and emotional stakes across every act of the film while syncing narration tightly to key visual turning points.'
  },
  listicle: {
    label: 'Listicle',
    prompt: 'Structure the movie recap into numbered high-impact moments and hidden details that viewers missed.'
  },
  documentary: {
    label: 'Documentary',
    prompt: 'Deliver an investigative, archival-style narration analyzing the film world, timeline, and character decisions.'
  },
  morris: {
    label: 'Morris (Signature Burmese Movie Recap)',
    prompt: 'Use the classic high-retention Burmese Movie Recap storytelling cadence: iconic character nicknames, brisk scene-by-scene narration, suspenseful transitions, and a memorable moral takeaway at the finale.'
  }
};

export const TARGET_LANGUAGES: {
  code: TargetLanguageCode;
  labelEn: string;
  labelMy: string;
  flag: string;
  sampleCaption: string;
}[] = [
  { code: 'my', labelEn: 'Burmese', labelMy: 'Burmese (မြန်မာ)', flag: '🇲🇲', sampleCaption: 'ဒီနေရာမှာ စာတန်းထိုး ပေါ်မယ်' },
  { code: 'th', labelEn: 'Thai', labelMy: 'Thai (ထိုင်း)', flag: '🇹🇭', sampleCaption: 'คำบรรยายจะปรากฏที่นี่' },
  { code: 'ja', labelEn: 'Japanese', labelMy: 'Japanese (ဂျပန်)', flag: '🇯🇵', sampleCaption: 'ここに字幕が表示されます' },
  { code: 'ko', labelEn: 'Korean', labelMy: 'Korean (ကိုရီးယား)', flag: '🇰🇷', sampleCaption: '여기에 자막이 표시됩니다' },
  { code: 'zh', labelEn: 'Chinese', labelMy: 'Chinese (တရုတ်)', flag: '🇨🇳', sampleCaption: '字幕将显示在这里' },
  { code: 'en', labelEn: 'English', labelMy: 'English (အင်္ဂလိပ်)', flag: '🇬🇧', sampleCaption: 'Subtitles will appear here' }
];

export interface VoiceOptionMeta {
  id: VoiceGender;
  nameEn: string;
  nameMy: string;
  tone: string;
  genderLabel: 'Male' | 'Female' | 'Neutral';
  tier: 'free' | 'pro';
  creditPerMin: number;
  ttsEngineId: string;
  geminiVoice: string;
  orbGradient: string;
}

export const VOICE_OPTIONS: VoiceOptionMeta[] = [
  {
    id: 'male',
    nameEn: 'Thiha · Male (Burmese)',
    nameMy: 'Thiha · Male (Burmese အခမဲ့ & Pro)',
    tone: 'Natural Narrator',
    genderLabel: 'Male',
    tier: 'free',
    creditPerMin: 1,
    ttsEngineId: 'my-MM-ThihaNeural',
    geminiVoice: 'Orus',
    orbGradient: 'radial-gradient(circle at center, #1D4ED8 0%, #2563EB 40%, #60A5FA 75%, #EFF6FF 100%)'
  },
  {
    id: 'female',
    nameEn: 'Nilar · Female (Burmese)',
    nameMy: 'Nilar · Female (Burmese အခမဲ့ & Pro)',
    tone: 'Natural Smooth',
    genderLabel: 'Female',
    tier: 'free',
    creditPerMin: 1,
    ttsEngineId: 'my-MM-NilarNeural',
    geminiVoice: 'Aoede',
    orbGradient: 'radial-gradient(circle at center, #BE185D 0%, #DB2777 40%, #F472B6 75%, #FCE7F3 100%)'
  },
  {
    id: 'kore',
    nameEn: 'Kore · Male (Firm Studio Pro)',
    nameMy: 'Kore · Male (Firm Studio Pro)',
    tone: 'Firm & Authoritative',
    genderLabel: 'Male',
    tier: 'pro',
    creditPerMin: 2,
    ttsEngineId: 'gemini-kore',
    geminiVoice: 'Kore',
    orbGradient: 'radial-gradient(circle at 30% 30%, #34d399, #047857)'
  },
  {
    id: 'aoede',
    nameEn: 'Aoede · Female (Breezy Studio Pro)',
    nameMy: 'Aoede · Female (Breezy Studio Pro)',
    tone: 'Breezy & Expressive',
    genderLabel: 'Female',
    tier: 'pro',
    creditPerMin: 2,
    ttsEngineId: 'gemini-aoede',
    geminiVoice: 'Aoede',
    orbGradient: 'radial-gradient(circle at 30% 30%, #38bdf8, #0284c7)'
  },
  {
    id: 'charon',
    nameEn: 'Charon · Male (Deep Cinema Pro)',
    nameMy: 'Charon · Male (Deep Cinema Pro)',
    tone: 'Deep Cinematic',
    genderLabel: 'Male',
    tier: 'pro',
    creditPerMin: 2,
    ttsEngineId: 'gemini-charon',
    geminiVoice: 'Charon',
    orbGradient: 'radial-gradient(circle at 30% 30%, #a78bfa, #5b21b6)'
  },
  {
    id: 'leda',
    nameEn: 'Leda · Female (Youthful Drama Pro)',
    nameMy: 'Leda · Female (Youthful Drama Pro)',
    tone: 'Youthful & Emotional',
    genderLabel: 'Female',
    tier: 'pro',
    creditPerMin: 2,
    ttsEngineId: 'gemini-leda',
    geminiVoice: 'Leda',
    orbGradient: 'radial-gradient(circle at 30% 30%, #f472b6, #db2777)'
  },
  {
    id: 'fenrir',
    nameEn: 'Fenrir · Male (Action & Thriller Pro)',
    nameMy: 'Fenrir · Male (Action & Thriller Pro)',
    tone: 'Excitable & Intense',
    genderLabel: 'Male',
    tier: 'pro',
    creditPerMin: 2,
    ttsEngineId: 'gemini-fenrir',
    geminiVoice: 'Fenrir',
    orbGradient: 'radial-gradient(circle at 30% 30%, #fb7185, #9f1239)'
  },
  {
    id: 'puck',
    nameEn: 'Puck · Neutral (Upbeat Gen-Z Pro)',
    nameMy: 'Puck · Neutral (Upbeat Gen-Z Pro)',
    tone: 'Upbeat & Fast',
    genderLabel: 'Neutral',
    tier: 'pro',
    creditPerMin: 2,
    ttsEngineId: 'gemini-puck',
    geminiVoice: 'Puck',
    orbGradient: 'radial-gradient(circle at 30% 30%, #fbbf24, #b45309)'
  },
  {
    id: 'orus',
    nameEn: 'Orus · Male (Mature Documentary Pro)',
    nameMy: 'Orus · Male (Mature Documentary Pro)',
    tone: 'Mature & Calm',
    genderLabel: 'Male',
    tier: 'pro',
    creditPerMin: 2,
    ttsEngineId: 'gemini-orus',
    geminiVoice: 'Orus',
    orbGradient: 'radial-gradient(circle at 30% 30%, #60a5fa, #1e3a8a)'
  },
  {
    id: 'zephyr',
    nameEn: 'Zephyr · Female (Smooth Storytelling Pro)',
    nameMy: 'Zephyr · Female (Smooth Storytelling Pro)',
    tone: 'Gentle & Warm',
    genderLabel: 'Female',
    tier: 'pro',
    creditPerMin: 2,
    ttsEngineId: 'gemini-zephyr',
    geminiVoice: 'Zephyr',
    orbGradient: 'radial-gradient(circle at 30% 30%, #c084fc, #6b21a8)'
  }
];

export function isVoiceAllowedInMode(voiceId: VoiceGender, isFreeTier: boolean): boolean {
  if (!isFreeTier) return true; // Credit Mode unlocks all voices
  return voiceId === 'male' || voiceId === 'female'; // Free Mode allows only Thiha Male & Nilar Female
}

/**
 * Returns a natural sample sentence for previewing any AI Voice before generating a video.
 * Only states who the voice is (no brand names or movie dialogue).
 */
export function getVoicePreviewSampleText(
  voiceId: VoiceGender,
  targetLanguage: TargetLanguageCode = 'my'
): string {
  const voiceMeta = VOICE_OPTIONS.find((v) => v.id === voiceId) || VOICE_OPTIONS[0];
  const shortName = voiceMeta.nameEn.split('·')[0].trim();

  if (targetLanguage === 'my') {
    if (voiceId === 'male') {
      return 'မင်္ဂလာပါ၊ ကျွန်တော်ကတော့ သီဟ အသံ ဖြစ်ပါတယ်။';
    }
    if (voiceId === 'female') {
      return 'မင်္ဂလာပါ၊ ကျွန်မကတော့ နီလာ အသံ ဖြစ်ပါတယ်။';
    }
    const pronoun = voiceMeta.genderLabel === 'Female' ? 'ကျွန်မကတော့' : 'ကျွန်တော်ကတော့';
    return `မင်္ဂလာပါ၊ ${pronoun} ${shortName} အသံ ဖြစ်ပါတယ်။`;
  }
  if (targetLanguage === 'th') {
    return `สวัสดีครับ นี่คือเสียงของ ${shortName}`;
  }
  if (targetLanguage === 'ja') {
    return `こんにちは、私は${shortName}の音声です。`;
  }
  if (targetLanguage === 'ko') {
    return `안녕하세요, 저는 ${shortName} 목소리입니다.`;
  }
  if (targetLanguage === 'zh') {
    return `你好，我是 ${shortName} 的声音。`;
  }
  return `Hello, I am the ${shortName} voice.`;
}

export type ScriptAiModelId = 'gemini-3-flash-preview' | 'gemini-3.1-pro-preview' | 'gemini-2.5-flash';
export type TtsEngineId = 'edge-neural' | 'gemini-2.5-flash-preview-tts';
export type SttEngineId = 'whisper-large-v3-turbo' | 'whisper-large-v3' | 'gemini-audio-stt';

export interface ApiEngineSettingsConfig {
  scriptModel: ScriptAiModelId;
  ttsEngine: TtsEngineId;
  sttModel: SttEngineId;
  breathPauseMs: number;
  dynamicTempoFit: boolean;
}

export const DEFAULT_API_ENGINE_CONFIG: ApiEngineSettingsConfig = {
  scriptModel: 'gemini-3-flash-preview',
  ttsEngine: 'edge-neural',
  sttModel: 'whisper-large-v3-turbo',
  breathPauseMs: 100,
  dynamicTempoFit: true
};

export const SCRIPT_AI_MODELS: { id: ScriptAiModelId; label: string; badge: string; desc: string }[] = [
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash Preview (Default · Fast Recap & Short Cues)',
    badge: 'DEFAULT · FAST',
    desc: 'Low-latency Burmese movie recap script & short 1-line subtitle phrase generator'
  },
  {
    id: 'gemini-3.1-pro-preview',
    label: 'Gemini 3.1 Pro Preview (Deep Storytelling & Complex Plot)',
    badge: 'PRO · DEEP',
    desc: 'High-reasoning cinematic storytelling and multi-character nuance'
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash (Balanced Translation & Dubbing)',
    badge: 'BALANCED',
    desc: 'Stable multimodal scene translation and timestamp alignment'
  }
];

export const TTS_ENGINE_OPTIONS: { id: TtsEngineId; label: string; badge: string; desc: string }[] = [
  {
    id: 'edge-neural',
    label: 'Microsoft Edge Neural · my-MM-ThihaNeural & my-MM-NilarNeural (Default)',
    badge: 'BURMESE NEURAL',
    desc: 'Genuine Microsoft Edge ReadAloud Neural Burmese male (Thiha) & female (Nilar) voices'
  },
  {
    id: 'gemini-2.5-flash-preview-tts',
    label: 'Gemini 2.5 Flash Preview TTS (Studio Multi-Voice)',
    badge: 'STUDIO PRO',
    desc: 'Direct Gemini 2.5 multimodal speech synthesis (Kore, Aoede, Charon, Fenrir, Orus)'
  }
];

export const STT_ENGINE_OPTIONS: { id: SttEngineId; label: string; badge: string; desc: string }[] = [
  {
    id: 'whisper-large-v3-turbo',
    label: 'Whisper Large-v3-Turbo (Default · High-Speed Timestamp STT)',
    badge: 'DEFAULT · TURBO',
    desc: 'Extracts exact start_ms & end_ms speech timestamps at 16kHz'
  },
  {
    id: 'whisper-large-v3',
    label: 'Whisper Large-v3 (High-Accuracy Dialogue STT)',
    badge: 'ACCURATE',
    desc: 'Maximum accuracy for noisy background music and overlapping dialogue'
  },
  {
    id: 'gemini-audio-stt',
    label: 'Gemini Multimodal Audio-to-Script (Direct Scene Understanding)',
    badge: 'MULTIMODAL',
    desc: 'Direct audio stream understanding with scene emotion detection'
  }
];

export const WORKERS_AI_WHISPER_MODEL = '@cf/openai/whisper-large-v3-turbo';

export function buildWorkersAiRunUrl(
  accountId: string,
  model: string = WORKERS_AI_WHISPER_MODEL
): string {
  const cleanAccount = accountId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return `https://api.cloudflare.com/client/v4/accounts/${cleanAccount}/ai/run/${model}`;
}

export function parseWorkersAiWhisperResult(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as {
    result?: {
      text?: unknown;
      segments?: Array<{ text?: unknown }>;
    };
  };
  const directText = typeof data.result?.text === 'string' ? data.result.text.trim() : '';
  if (directText) return directText;
  if (Array.isArray(data.result?.segments)) {
    return data.result.segments
      .map((s) => (typeof s?.text === 'string' ? s.text.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim();
  }
  return '';
}

export type SttProviderOrder = ('user_groq' | 'workers_ai' | 'groq_pool')[];

/**
 * Resolves STT execution chain:
 * - Free Mode: NEVER uses Cloudflare Workers AI (uses user's own Groq key if supplied, else Groq pool).
 * - Credit Mode: Runs Cloudflare Workers AI (`@cf/openai/whisper-large-v3-turbo`) first when configured,
 *   with automatic failover to Owner Groq Key Pool.
 */
export function resolveSttStrategyForMode(
  isFreeMode: boolean,
  hasFreeGroqKey: boolean,
  hasWorkersAiConfigured: boolean
): SttProviderOrder {
  if (isFreeMode) {
    return hasFreeGroqKey ? ['user_groq'] : ['groq_pool'];
  }
  return hasWorkersAiConfigured ? ['workers_ai', 'groq_pool'] : ['groq_pool'];
}

export function loadSavedApiEngineConfig(): ApiEngineSettingsConfig {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('ttak_api_engine_config') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        scriptModel: parsed.scriptModel || DEFAULT_API_ENGINE_CONFIG.scriptModel,
        ttsEngine: parsed.ttsEngine || DEFAULT_API_ENGINE_CONFIG.ttsEngine,
        sttModel: parsed.sttModel || DEFAULT_API_ENGINE_CONFIG.sttModel,
        breathPauseMs:
          typeof parsed.breathPauseMs === 'number'
            ? Math.max(80, Math.min(120, parsed.breathPauseMs))
            : DEFAULT_API_ENGINE_CONFIG.breathPauseMs,
        dynamicTempoFit:
          typeof parsed.dynamicTempoFit === 'boolean'
            ? parsed.dynamicTempoFit
            : DEFAULT_API_ENGINE_CONFIG.dynamicTempoFit
      };
    }
  } catch {}
  return { ...DEFAULT_API_ENGINE_CONFIG };
}

export interface FreeUserApiKeysConfig {
  geminiKey: string;
  groqKey: string;
}

const FREE_USER_API_KEYS_STORAGE = 'ttak_free_user_api_keys';

export function loadFreeUserApiKeys(): FreeUserApiKeysConfig {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(FREE_USER_API_KEYS_STORAGE)
        : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        geminiKey: typeof parsed?.geminiKey === 'string' ? parsed.geminiKey.trim() : '',
        groqKey: typeof parsed?.groqKey === 'string' ? parsed.groqKey.trim() : ''
      };
    }
  } catch {}
  return { geminiKey: '', groqKey: '' };
}

export function saveFreeUserApiKeys(next: Partial<FreeUserApiKeysConfig>): FreeUserApiKeysConfig {
  const current = loadFreeUserApiKeys();
  const updated: FreeUserApiKeysConfig = {
    geminiKey: typeof next.geminiKey === 'string' ? next.geminiKey.trim() : current.geminiKey,
    groqKey: typeof next.groqKey === 'string' ? next.groqKey.trim() : current.groqKey
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FREE_USER_API_KEYS_STORAGE, JSON.stringify(updated));
    }
  } catch {}
  return updated;
}

export interface SyncedCueScheduleItem {
  cue: SubtitleCue;
  tempoFactor: number;
  spokenDurationMs: number;
  breathPauseAfterMs: number;
}

/**
 * 3-Method Audio & Video Synchronization Engine (Continuous Recap Architecture):
 * Method 1: Timestamp-anchored Timeline — Anchors each phrase to the scene timeline while preventing multi-second dead-air gaps (`maxGapMs`).
 * Method 2: Spoken Duration & Breath Pause — Uses exact TTS spoken duration in ms and inserts a natural
 *           80ms–120ms breath pause (`breathPauseMs`) between consecutive sentences so speech flows smoothly without overlapping.
 * Method 3: Bidirectional Dynamic Tempo Fit — Speeds up slightly (up to 1.24x) if a phrase exceeds its slot, OR gently relaxes (down to 0.86x)
 *           when `totalDurationMs` is known so narration fills the scene continuously without leaving awkward 2s–4s silent gaps halfway through.
 */
export function alignCuesWithAudioSync(
  cues: SubtitleCue[],
  spokenDurationsMs: number[],
  breathPauseMs = 100,
  dynamicTempoFit = true,
  totalDurationMs?: number,
  maxGapMs = 360
): SyncedCueScheduleItem[] {
  const safePause = Math.max(80, Math.min(120, Math.round(breathPauseMs || 100)));
  const totalRawSpokenMs = cues.reduce(
    (sum, c, idx) =>
      sum + Math.max(320, Math.round(spokenDurationsMs[idx] || c.end_ms - c.start_ms || 1500)),
    0
  );
  const dynamicNeededGap =
    totalDurationMs &&
    totalDurationMs > 120_000 &&
    cues.length > 1 &&
    totalDurationMs > totalRawSpokenMs
      ? Math.round(((totalDurationMs - totalRawSpokenMs) / cues.length) * 1.15)
      : 0;
  const safeMaxGap = Math.max(safePause, Math.round(maxGapMs || 360), dynamicNeededGap);
  const schedule: SyncedCueScheduleItem[] = [];
  let audioCursorMs = 60;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const rawSpokenMs = Math.max(320, Math.round(spokenDurationsMs[i] || cue.end_ms - cue.start_ms || 1500));

    // Method 1: Anchor to scene timestamp, while clamping any excessively long dead-air pause to <= safeMaxGap
    let alignedStartMs = cues.length === 1 ? 60 : Math.max(audioCursorMs, cue.start_ms);
    if (cues.length > 1 && i > 0) {
      const prevEndMs = audioCursorMs - safePause;
      if (alignedStartMs - prevEndMs > safeMaxGap) {
        alignedStartMs = prevEndMs + safeMaxGap;
      }
    }

    // Method 3: Compute available scene slot before next cue or video end
    const hasNext = i + 1 < cues.length;
    const rawNextTargetMs = hasNext
      ? cues[i + 1].start_ms
      : totalDurationMs && totalDurationMs > alignedStartMs + 500
        ? totalDurationMs - 120
        : Math.max(alignedStartMs + rawSpokenMs, cue.end_ms);

    const nextSceneBoundaryMs = hasNext
      ? Math.max(alignedStartMs + 480, rawNextTargetMs - safePause)
      : Math.max(alignedStartMs + 480, rawNextTargetMs);

    const availableSlotMs = Math.max(480, nextSceneBoundaryMs - alignedStartMs);

    let tempoFactor = 1.0;
    let effectiveSpokenMs = rawSpokenMs;

    if (dynamicTempoFit) {
      if (rawSpokenMs > availableSlotMs) {
        tempoFactor = Number(Math.min(1.24, Math.max(1.0, rawSpokenMs / availableSlotMs)).toFixed(3));
        effectiveSpokenMs = Math.max(350, Math.round(rawSpokenMs / tempoFactor));
      } else if (cues.length > 1 && totalDurationMs && availableSlotMs - rawSpokenMs > safeMaxGap) {
        // Gently relax cadence (down to 0.86x) so the narrator fills the scene window smoothly instead of leaving dead air
        const targetFillMs = Math.max(rawSpokenMs, availableSlotMs - Math.min(safeMaxGap, 240));
        const relaxedFactor = Math.max(0.86, Math.min(1.0, rawSpokenMs / targetFillMs));
        if (relaxedFactor < 0.97) {
          tempoFactor = Number(relaxedFactor.toFixed(3));
          effectiveSpokenMs = Math.max(350, Math.round(rawSpokenMs / tempoFactor));
        }
      }
    }

    const alignedEndMs = alignedStartMs + effectiveSpokenMs;

    schedule.push({
      cue: {
        ...cue,
        start_ms: alignedStartMs,
        end_ms: alignedEndMs
      },
      tempoFactor,
      spokenDurationMs: effectiveSpokenMs,
      breathPauseAfterMs: safePause
    });

    // Method 2: Advance cursor by exact spoken duration + natural breath pause
    audioCursorMs = alignedEndMs + safePause;
  }

  return schedule;
}

export const UI_TRANSLATIONS: Record<'my' | 'en', Record<string, string>> = {
  my: {
    freeRecap: 'Free Recap',
    recapStudio: 'Recap Studio',
    movieRecap: 'Movie Recap',
    autoSubtitles: 'Auto Subtitles',
    history: 'History',
    wallet: 'Wallet',
    settings: 'Settings',
    settingsTab: 'Settings',
    historyTab: 'History',
    promptsTab: 'Flow & Prompts',
    selectVideo: 'ဗီဒီယို ရွေးချယ်ပါ',
    orDropHere: 'သို့မဟုတ် ဤနေရာသို့ ဆွဲထည့်ပါ',
    loadDemoClip: 'ပေးပို့ထားသော ဗီဒီယိုနှင့် နမူနာများ',
    loadVideoFirst: 'Load a video first.',
    generateBtn: 'စတင်ထုတ်ယူမည်',
    generatingBtn: 'Rendering on device…',
    downloadBtn: 'Download',
    newRecapBtn: 'New Recap',
    whatToMake: 'What to make',
    recapOption: 'Recap',
    translateOption: 'Translate',
    audioMode: 'Audio',
    dubOption: 'Dub',
    captionsOnlyOption: 'Captions only',
    voiceLabel: 'Voice',
    scriptStyleLabel: 'Script style',
    aspectLabel: 'Aspect',
    languageLabel: 'Language',
    blurWatermark: 'Blur watermark',
    blurStyleLabel: 'Blur style',
    frostedGlass: 'Frosted Glass (iOS & Desktop)',
    simpleBlur: 'Simple Blur (Fast for Mobile)',
    captionsLabel: 'Captions',
    outlineStyle: 'Outline',
    highlightStyle: 'Highlight',
    fontLabel: 'Font',
    previewSampleText: 'Preview sample text',
    scaleLabel: 'Scale',
    effectsLabel: 'Effects',
    searchByTitle: 'Search by title',
    freeLeftToday: 'အခမဲ့ 3 / 3 ခု',
    editOnVideo: 'Edit',
    doneEditing: 'Done',
    addBlur: 'Add blur',
    removeVideo: 'Remove video'
  },
  en: {
    freeRecap: 'Free Recap',
    recapStudio: 'Credit Studio',
    movieRecap: 'Movie Recap',
    autoSubtitles: 'Auto Subtitles',
    history: 'History',
    wallet: 'Wallet & Plans',
    settings: 'Settings',
    settingsTab: 'Settings',
    historyTab: 'History',
    promptsTab: 'Flow & Prompts',
    selectVideo: 'Select video',
    orDropHere: 'or drop here',
    loadDemoClip: 'Uploaded & Demo Clips',
    loadVideoFirst: 'Load a video first.',
    generateBtn: 'Generate',
    generatingBtn: 'Rendering on device…',
    downloadBtn: 'Download',
    newRecapBtn: 'New Recap',
    whatToMake: 'What to make',
    recapOption: 'Recap',
    translateOption: 'Translate',
    audioMode: 'Audio',
    dubOption: 'Dub',
    captionsOnlyOption: 'Captions only',
    voiceLabel: 'Voice',
    scriptStyleLabel: 'Script style',
    aspectLabel: 'Aspect',
    languageLabel: 'Language',
    blurWatermark: 'Blur watermark',
    blurStyleLabel: 'Blur style',
    frostedGlass: 'Frosted Glass (iOS & Desktop)',
    simpleBlur: 'Simple Blur (Fast for Mobile)',
    captionsLabel: 'Captions',
    outlineStyle: 'Outline',
    highlightStyle: 'Highlight',
    fontLabel: 'Font',
    previewSampleText: 'Preview sample text',
    scaleLabel: 'Scale',
    effectsLabel: 'Effects',
    searchByTitle: 'Search by title',
    freeLeftToday: 'Free 3 / 3 left',
    editOnVideo: 'Edit',
    doneEditing: 'Done',
    addBlur: 'Add blur',
    removeVideo: 'Remove video'
  }
};

/**
 * Exact scene-by-scene Chinese transcript & Burmese Recap Cues for the user's uploaded 70s video:
 * SaveTik.co_7673413291896605967-hd_47ddcad1.mp4
 */
export const SAVETIK_WEDDING_DRAMA_TRANSCRIPT = `[00:00 - 00:05] 30万你到底花哪去了？当然是装修了。呵，装修？
[00:05 - 00:14] 你装修了什么？沙发我3年前买的，电视柜我买的，连窗帘都没换，30万你装修空气了？
[00:14 - 00:24] 我问你最后一次，30万去哪了？家具婚礼装修都是...我儿子给你的钱是让你装修婚房的，不是让你拿办婚礼！
[00:24 - 00:34] 不就是用了20万给他弟付首付吗？都是一家人，他弟结婚买房差20万，先挪一下怎么了？剩下10万不也花在你们婚礼上了吗？
[00:34 - 00:45] 我儿子出30万装修婚房，你们拿20万给亲儿子买房？微微以后嫁进你们家，帮一下亲弟弟怎么了？再说了微微自己还有这套房，以后真不行这套留给她弟不就行了！
[00:45 - 00:57] 你再说一遍（拿出房产证书：林知夏）。你女儿拿我的房子结婚，骗男方30万，现在你又准备把我的房子送给你儿子？你们一家挺会拿别人东西。
[00:57 - 01:10] 房子是假的，30万也骗我，还怎么结婚？你不能走！钱还我，我们结束。我怀孕了！【第二集完】`;

export const SAVETIK_WEDDING_DRAMA_CUES: Record<ScriptStyleId, SubtitleCue[]> = {
  narrator: [
    {
      id: 'st-cue-1',
      start_ms: 100,
      end_ms: 2600,
      originalText: '30万你到底花哪去了？',
      text: 'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ'
    },
    {
      id: 'st-cue-2',
      start_ms: 2720,
      end_ms: 5300,
      originalText: '当然是装修了。呵，装修？',
      text: 'အိမ်ပြင်လိုက်တာပါလို့ သတို့သမီးက ပြန်ဖြေပါတယ်'
    },
    {
      id: 'st-cue-3',
      start_ms: 5420,
      end_ms: 8200,
      originalText: '你装修了什么？',
      text: 'အဲဒီအချိန်မှာပဲ အိမ်ရှင်မိန်းကလေး ဝင်လာပြီး'
    },
    {
      id: 'st-cue-4',
      start_ms: 8320,
      end_ms: 11300,
      originalText: '沙发我3年前买的，电视柜我买的',
      text: 'ဆိုဖာနဲ့ပစ္စည်းတွေက ၃ နှစ်ကတည်းက သူမဝယ်ထားတာပါ'
    },
    {
      id: 'st-cue-5',
      start_ms: 11420,
      end_ms: 14500,
      originalText: '连窗帘都没换，30万你装修空气了？',
      text: 'ခန်းဆီးတောင် မလဲဘဲ သိန်းသုံးဆယ်နဲ့ လေထုကို ပြင်လိုက်တာလားလို့ မေးလိုက်ပါတယ်'
    },
    {
      id: 'st-cue-6',
      start_ms: 14620,
      end_ms: 17500,
      originalText: '我问你最后一次，30万去哪了？',
      text: 'သတို့သားကလည်း ဒေါသတကြီးနဲ့ နောက်ဆုံးအကြိမ် ထပ်မေးလိုက်ပြီး'
    },
    {
      id: 'st-cue-7',
      start_ms: 17620,
      end_ms: 20600,
      originalText: '家具婚礼装修都是...',
      text: 'မင်္ဂလာအိမ်ပြင်ဖို့ ပေးထားတဲ့ ငွေတွေ ဘယ်ရောက်သွားလဲလို့ စစ်မေးပါတယ်'
    },
    {
      id: 'st-cue-8',
      start_ms: 20720,
      end_ms: 24100,
      originalText: '我儿子给你的钱是让你装修婚房的，不是让你拿办婚礼！',
      text: 'ယောက္ခမလောင်းကလည်း မင်္ဂလာပွဲအတွက် ပေးတာမဟုတ်ဘူးလို့ ဝင်ပြောပါတယ်'
    },
    {
      id: 'st-cue-9',
      start_ms: 24220,
      end_ms: 27400,
      originalText: '不就是用了20万给他弟付首付吗？',
      text: 'အဲဒီတော့မှ သတို့သမီးအမေက နှစ်သိန်းကို သူ့သားငယ်အတွက် သုံးလိုက်ကြောင်း ဝန်ခံပြီး'
    },
    {
      id: 'st-cue-10',
      start_ms: 27520,
      end_ms: 30800,
      originalText: '都是一家人，他弟结婚买房差20万，先挪一下怎么了？',
      text: 'မောင်လေး အိမ်ဝယ်ဖို့ ငွေလိုနေလို့ ခဏယူသုံးတာ ဘာဖြစ်လဲလို့ ပြန်အော်ပါတယ်'
    },
    {
      id: 'st-cue-11',
      start_ms: 30920,
      end_ms: 34200,
      originalText: '剩下10万不也花在你们婚礼上了吗？',
      text: 'ကျန်တဲ့ တစ်သိန်းကိုတော့ မင်္ဂလာပွဲမှာ သုံးပေးထားတယ်လို့ ဆင်ခြေပေးပါတယ်'
    },
    {
      id: 'st-cue-12',
      start_ms: 34320,
      end_ms: 37600,
      originalText: '我儿子出30万装修婚房，你们拿20万给亲儿子买房？',
      text: 'ငါ့သားပေးတဲ့ အိမ်ပြင်စရိတ်ကို မင်းတို့သားအတွက် အိမ်ဝယ်ပေးရလားလို့ ဒေါသထွက်ကြပြီး'
    },
    {
      id: 'st-cue-13',
      start_ms: 37720,
      end_ms: 41200,
      originalText: '微微以后嫁进你们家，帮一下亲弟弟怎么了？',
      text: 'သမီးက ယူပြီးရင် မောင်လေးကို ကူညီသင့်တယ်လို့ မျက်နှာပြောင်တိုက် ပြောလာပါတယ်'
    },
    {
      id: 'st-cue-14',
      start_ms: 41320,
      end_ms: 45100,
      originalText: '再说了微微自己还有这套房，以后真不行这套留给她弟不就行了！',
      text: 'နောက်ဆုံး ဒီအိမ်ကိုပါ သူ့မောင်လေးအတွက် ပေးလိုက်ရင် ရတာပဲလို့ ပြောချလိုက်ပါတယ်'
    },
    {
      id: 'st-cue-15',
      start_ms: 45220,
      end_ms: 48600,
      originalText: '你再说一遍（拿出房产证书：林知夏）',
      text: 'အဲဒီစကားကြားတာနဲ့ အိမ်ပိုင်ရှင်အစစ်က ဂရန်စာချုပ်ကို ထုတ်ပြလိုက်ပြီး'
    },
    {
      id: 'st-cue-16',
      start_ms: 48720,
      end_ms: 52100,
      originalText: '你女儿拿我的房子结婚，骗男方30万',
      text: 'နင့်သမီးက ငါ့အိမ်ကို ဟန်ဆောင်သုံးပြီး ယောက်ျားဘက်က သိန်းသုံးဆယ် လိမ်ယူထားတာ'
    },
    {
      id: 'st-cue-17',
      start_ms: 52220,
      end_ms: 55600,
      originalText: '现在你又准备把我的房子送给你儿子？',
      text: 'အခု ငါ့အိမ်ကိုပါ နင့်သားလက်ထဲ ထည့်ပေးဖို့ ကြံနေတာလားလို့ ဖွင့်ချလိုက်ပါတယ်'
    },
    {
      id: 'st-cue-18',
      start_ms: 55720,
      end_ms: 58900,
      originalText: '你们一家挺会拿别人东西',
      text: 'တစ်မိသားစုလုံး သူများပစ္စည်းယူဖို့ တော်တော်ကျွမ်းကျင်ကြတယ်လို့ ရှုတ်ချလိုက်ပါတယ်'
    },
    {
      id: 'st-cue-19',
      start_ms: 59020,
      end_ms: 62500,
      originalText: '房子是假的，30万也骗我，还怎么结婚？',
      text: 'အိမ်ကလည်း အတု ငွေလည်း လိမ်သွားတော့ သတို့သားက မင်္ဂလာပွဲကို ချက်ချင်းဖျက်သိမ်းလိုက်ပါတယ်'
    },
    {
      id: 'st-cue-20',
      start_ms: 62620,
      end_ms: 66200,
      originalText: '你不能走！钱还我，我们结束',
      text: 'ပိုက်ဆံပြန်ပေး ငါတို့ပြတ်ပြီဆိုပြီး လှည့်ထွက်သွားချိန်မှာပဲ'
    },
    {
      id: 'st-cue-21',
      start_ms: 66320,
      end_ms: 70000,
      originalText: '我怀孕了！【第二集完】',
      text: 'သတို့သမီးက ကိုယ်ဝန်ရှိနေပြီဆိုပြီး အော်ဟစ်တားဆီးလိုက်ပါတော့တယ်'
    }
  ],
  drama: [
    { id: 'st-drama-1', start_ms: 100, end_ms: 3200, text: 'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ' },
    { id: 'st-drama-2', start_ms: 3320, end_ms: 6800, text: 'ပျော်ရွှင်စရာ မင်္ဂလာဦးနေ့လေးဟာ ရုတ်တရက် မုန်တိုင်းထန်လာပါတယ်' },
    { id: 'st-drama-3', start_ms: 6920, end_ms: 10600, text: 'အိမ်ပြင်ထားတယ်ဆိုတဲ့ မုသားစကားကို အိမ်ရှင်မိန်းကလေးက ဝင်ဖျက်လိုက်ပြီး' },
    { id: 'st-drama-4', start_ms: 10720, end_ms: 14500, text: 'ပရိဘောဂအားလုံးဟာ လွန်ခဲ့တဲ့သုံးနှစ်က သူမဝယ်ထားတာလို့ ဖွင့်ချလိုက်ပါတယ်' },
    { id: 'st-drama-5', start_ms: 14620, end_ms: 19200, text: 'သတို့သားက နောက်ဆုံးအကြိမ် အမှန်တရားကို ဒေါသတကြီး မေးမြန်းချိန်မှာ' },
    { id: 'st-drama-6', start_ms: 19320, end_ms: 24100, text: 'မိခင်ဖြစ်သူက ငွေပေးတာ အိမ်ပြင်ဖို့ဖြစ်ကြောင်း ဝင်ပြောလာပါတယ်' },
    { id: 'st-drama-7', start_ms: 24220, end_ms: 29200, text: 'အဲဒီနောက်မှာတော့ သတို့သမီးအမေက နှစ်သိန်းကို သားငယ်အိမ်ဝယ်ဖို့ ပေးလိုက်ကြောင်း ဝန်ခံလာပါတယ်' },
    { id: 'st-drama-8', start_ms: 29320, end_ms: 34200, text: 'မိသားစုချင်း ကူညီတာ ဘာဖြစ်လဲဆိုပြီး မတရားပြန်ပြောနေကြပါတယ်' },
    { id: 'st-drama-9', start_ms: 34320, end_ms: 39600, text: 'သတို့သားရဲ့ မိခင်ကလည်း ဒေါသအမျက်ချောင်းချောင်း ထွက်လာခဲ့ပြီး' },
    { id: 'st-drama-10', start_ms: 39720, end_ms: 45100, text: 'သူများပိုင်တဲ့ ဒီအိမ်ကိုပါ သူ့သားအတွက် ပေးဖို့ ကြံစည်နေကြပါတယ်' },
    { id: 'st-drama-11', start_ms: 45220, end_ms: 51200, text: 'အိမ်ဂရန်စာချုပ်ကို စားပွဲပေါ်တင်လိုက်ချိန်မှာတော့ အားလုံး မျက်နှာပျက်သွားပြီး' },
    { id: 'st-drama-12', start_ms: 51320, end_ms: 57500, text: 'သူမရဲ့အိမ်ကို ဟန်ဆောင်သုံးပြီး လိမ်ညာနေတဲ့ မျက်နှာဖုံး ကွာကျသွားပါတယ်' },
    { id: 'st-drama-13', start_ms: 57620, end_ms: 63800, text: 'အိမ်လည်းအတု ငွေလည်းအလိမ်ခံရလို့ သတို့သားက လမ်းခွဲဖို့ ဆုံးဖြတ်လိုက်ချိန်မှာ' },
    { id: 'st-drama-14', start_ms: 63920, end_ms: 70000, text: 'သတို့သမီးက ကိုယ်ဝန်ရှိနေပြီလို့ အော်ဟစ်လိုက်ပါတော့တယ်' }
  ],
  casual: [
    { id: 'st-cas-1', start_ms: 100, end_ms: 3200, text: 'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ' },
    { id: 'st-cas-2', start_ms: 3320, end_ms: 7200, text: 'ဘရိုတို့ရေ မင်္ဂလာဆောင်နေ့မှာပဲ ပွဲကြီးပွဲကောင်း စနေပါပြီဗျာ' },
    { id: 'st-cas-3', start_ms: 7320, end_ms: 11200, text: 'အိမ်ရှင်အစစ် မမက ဝင်လာပြီး ဆိုဖာတွေက သူဝယ်ထားတာတဲ့လေ' },
    { id: 'st-cas-4', start_ms: 11320, end_ms: 14500, text: 'သိန်းသုံးဆယ်နဲ့ လေထုကို ပြင်လိုက်တာလားဆိုပြီး တစ်ချက်တည်း ဖဲ့ချလိုက်ပြီ' },
    { id: 'st-cas-5', start_ms: 14620, end_ms: 19400, text: 'ဘဲကြီးကလည်း ဒေါသတွေထွက်ပြီး ငွေဘယ်ရောက်သွားလဲ ထပ်စစ်နေပါပြီ' },
    { id: 'st-cas-6', start_ms: 19520, end_ms: 24200, text: 'သူ့အမေကလည်း အိမ်ပြင်ဖို့ပေးထားတာလို့ ဝင်ပြောနေတုန်းမှာပဲ' },
    { id: 'st-cas-7', start_ms: 24320, end_ms: 29200, text: 'ယောက္ခမက မောင်လေးတိုက်ခန်းဝယ်ဖို့ နှစ်သိန်းကို ဖြတ်စားထားတယ်တဲ့ဗျာ' },
    { id: 'st-cas-8', start_ms: 29320, end_ms: 34200, text: 'မိသားစုချင်းမို့လို့ ယူသုံးတာ ဘာဖြစ်လဲဆိုပြီး ပြန်ဟောက်နေသေးတယ်' },
    { id: 'st-cas-9', start_ms: 34320, end_ms: 39600, text: 'ဒီကြားထဲ မင်္ဂလာအိမ်ကိုပါ သူ့သားကို ပေးမယ်ဆိုပြီး မျက်နှာပြောင်တိုက်နေတုန်း' },
    { id: 'st-cas-10', start_ms: 39720, end_ms: 45100, text: 'အိမ်ရှင်မမက တစ်ချက်တည်း ငြိမ်သွားအောင် လုပ်ပစ်လိုက်ပါတယ်' },
    { id: 'st-cas-11', start_ms: 45220, end_ms: 51400, text: 'အိမ်ဂရန်စာချုပ်ကြီး ထုတ်ပြလိုက်တော့မှ တစ်မိသားစုလုံး ဂျင်းပေါ်သွားရော' },
    { id: 'st-cas-12', start_ms: 51520, end_ms: 57500, text: 'ငါ့အိမ်ကိုပါ သားအတွက် ကြံနေတာလားဆိုပြီး ပွဲကြမ်းပါတော့တယ်' },
    { id: 'st-cas-13', start_ms: 57620, end_ms: 63800, text: 'သတို့သားက ပွဲဖျက်ပြီး ငွေပြန်တောင်းကာ လှည့်အထွက်မှာပဲ' },
    { id: 'st-cas-14', start_ms: 63920, end_ms: 70000, text: 'သတို့သမီးက ဗိုက်ကြီးနေပြီလို့ အော်ချလိုက်တာ လုံးဝရှယ်ပဲ' }
  ],
  news: [
    { id: 'st-news-1', start_ms: 100, end_ms: 3400, text: 'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ' },
    { id: 'st-news-2', start_ms: 3520, end_ms: 8200, text: 'အိမ်ပြင်ဆင်စရိတ် ပျောက်ဆုံးမှုမှ မင်္ဂလာခန်းမအတွင်း အငြင်းပွားမှု စတင်ခဲ့ပါတယ်' },
    { id: 'st-news-3', start_ms: 8320, end_ms: 14500, text: 'ပရိဘောဂများမှာ မူလပိုင်ရှင် ဝယ်ယူထားခြင်းဖြစ်ကြောင်း သိရှိခဲ့ရပါတယ်' },
    { id: 'st-news-4', start_ms: 14620, end_ms: 19400, text: 'သတို့သားမှ ငွေကြေးသုံးစွဲမှုအပေါ် နောက်ဆုံးအကြိမ် ထပ်မံစစ်မေးခဲ့ပါတယ်' },
    { id: 'st-news-5', start_ms: 19520, end_ms: 24200, text: 'မိခင်ဖြစ်သူမှလည်း အိမ်ပြင်ရန်သာ ငွေပေးခဲ့ကြောင်း ပြောကြားခဲ့ပါတယ်' },
    { id: 'st-news-6', start_ms: 24320, end_ms: 29200, text: 'ယောက္ခမဖြစ်သူမှ ငွေနှစ်သိန်းကို မောင်ဖြစ်သူ တိုက်ခန်းဝယ်ရာတွင် သုံးစွဲခဲ့ကြောင်း ဝန်ခံခဲ့ပါတယ်' },
    { id: 'st-news-7', start_ms: 29320, end_ms: 34200, text: 'ကျန်ငွေတစ်သိန်းကိုသာ မင်္ဂလာပွဲအတွက် သုံးစွဲခဲ့ကြောင်း ဖြေရှင်းခဲ့ပါတယ်' },
    { id: 'st-news-8', start_ms: 34320, end_ms: 39600, text: 'ထို့ပြင် လက်ရှိတိုက်ခန်းကိုပါ မောင်ဖြစ်သူအား လွှဲပြောင်းပေးရန် ပြောဆိုခဲ့ပါတယ်' },
    { id: 'st-news-9', start_ms: 39720, end_ms: 45100, text: 'အဆိုပါပြောဆိုမှုအပေါ် နှစ်ဖက်မိသားစုအကြား ပြင်းထန်စွာ ကန့်ကွက်ခဲ့ကြပါတယ်' },
    { id: 'st-news-10', start_ms: 45220, end_ms: 51200, text: 'မူလပိုင်ရှင်မှ အိမ်ပိုင်ဆိုင်မှု ဂရန်စာချုပ်ကို ထုတ်ဖော်ပြသလိုက်ပြီး' },
    { id: 'st-news-11', start_ms: 51320, end_ms: 57500, text: 'မိမိပိုင်ဆိုင်သည့် အိမ်ကို ဟန်ဆောင်သုံးကာ လိမ်လည်ခဲ့ကြောင်း ဖွင့်ချခဲ့ပါတယ်' },
    { id: 'st-news-12', start_ms: 57620, end_ms: 62500, text: 'သတို့သားမှ မင်္ဂလာပွဲကို ချက်ချင်းဖျက်သိမ်းပြီး ငွေပြန်အမ်းရန် တောင်းဆိုခဲ့ပါတယ်' },
    { id: 'st-news-13', start_ms: 62620, end_ms: 66200, text: 'ဆက်ဆံရေးကို အပြီးသတ်ရပ်စဲပြီး ထွက်ခွာရန် ပြင်ဆင်ချိန်တွင်' },
    { id: 'st-news-14', start_ms: 66320, end_ms: 70000, text: 'သတို့သမီးမှ ကိုယ်ဝန်ရှိနေကြောင်း ထုတ်ဖော်ပြောကြားခဲ့ပါတယ်' }
  ],
  none: [
    { id: 'st-doc-1', start_ms: 100, end_ms: 3400, text: 'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ' },
    { id: 'st-doc-2', start_ms: 3520, end_ms: 8200, text: 'မင်္ဂလာခန်းမထဲမှာ ဖုံးကွယ်ထားတဲ့ အမှန်တရားက စတင်ပေါ်ထွက်လာပါတယ်' },
    { id: 'st-doc-3', start_ms: 8320, end_ms: 14500, text: 'ပစ္စည်းအားလုံးဟာ အခြားသူတစ်ဦး ပိုင်ဆိုင်နေကြောင်း ထင်ရှားသွားပါတယ်' },
    { id: 'st-doc-4', start_ms: 14620, end_ms: 19400, text: 'မေးခွန်းတစ်ခုစီတိုင်းဟာ ဖုံးကွယ်ထားတဲ့ အဖြစ်မှန်ကို ဖော်ထုတ်နေပါတယ်' },
    { id: 'st-doc-5', start_ms: 19520, end_ms: 24200, text: 'ယုံကြည်မှု ပျက်ပြားသွားတဲ့အခါ ဆက်ဆံရေးတစ်ခုလုံး ပြိုလဲသွားတတ်ပါတယ်' },
    { id: 'st-doc-6', start_ms: 24320, end_ms: 29200, text: 'တစ်ဖက်သတ် အတ္တနဲ့ ခွင့်ပြုချက်မရှိဘဲ ငွေကြေးလွှဲပြောင်းမှုတွေ ပေါ်ပေါက်လာပါတယ်' },
    { id: 'st-doc-7', start_ms: 29320, end_ms: 34200, text: 'မိသားစုအမည်ခံပြီး ကိုယ်ကျိုးအတွက် အသုံးချခဲ့ကြတာ ဖြစ်ပါတယ်' },
    { id: 'st-doc-8', start_ms: 34320, end_ms: 39600, text: 'ကိုယ်ပိုင်မဟုတ်တဲ့ အိမ်ရာပေါ်မှာပါ လောဘတက်ပြီး ကြံစည်ခဲ့ကြပါတယ်' },
    { id: 'st-doc-9', start_ms: 39720, end_ms: 45100, text: 'အမှန်တရားကို မျက်ကွယ်ပြုထားပေမယ့် အချိန်တန်ရင် ပေါ်ပေါက်လာစမြဲပါ' },
    { id: 'st-doc-10', start_ms: 45220, end_ms: 51200, text: 'တရားဝင် စာရွက်စာတမ်း အထောက်အထားကို ထုတ်ပြလိုက်တဲ့အခါမှာတော့' },
    { id: 'st-doc-11', start_ms: 51320, end_ms: 57500, text: 'နှစ်ပေါင်းများစွာ တည်ဆောက်ထားတဲ့ လိမ်လည်မှုတစ်ခု အဆုံးသတ်သွားပါပြီ' },
    { id: 'st-doc-12', start_ms: 57620, end_ms: 62500, text: 'သစ္စာမဲ့မှုကြောင့် မင်္ဂလာအစီအစဉ်တစ်ခုလုံး ပျက်ပြယ်သွားခဲ့ရပါတယ်' },
    { id: 'st-doc-13', start_ms: 62620, end_ms: 66200, text: 'အတိတ်ရဲ့ အမှားတွေဟာ နောက်ဆုံးမှာ ပြန်လည်ပေးဆပ်ရစမြဲ ဖြစ်ပါတယ်' },
    { id: 'st-doc-14', start_ms: 66320, end_ms: 70000, text: 'ဒီဇာတ်လမ်းဟာ လက်တွေ့ဘဝအတွက် သင်ခန်းစာတစ်ခု ဖြစ်စေခဲ့ပါတယ်' }
  ]
};

/**
 * Splits any long multi-clause subtitle cues into short, punchy 1-line spoken phrases
 * (max ~38 Burmese chars per cue) with proportional start_ms and end_ms so captions
 * never turn into multi-line paragraphs covering the video.
 */
export function splitCuesIntoShortPhrases(
  cues: SubtitleCue[],
  maxCharsPerCue = 54
): SubtitleCue[] {
  if (!cues || cues.length === 0) return [];
  const result: SubtitleCue[] = [];
  let seq = 1;

  for (const cue of cues) {
    const cleaned = (cue.text || '')
      .replace(/[။។]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) continue;

    if (cleaned.length <= maxCharsPerCue) {
      result.push({
        ...cue,
        id: `cue-${seq++}`,
        text: cleaned
      });
      continue;
    }

    // Split along natural Burmese/multilingual phrase boundaries or whitespace
    const tokens = cleaned
      .replace(/(မှာတော့|မှာပဲ|အခါမှာ|ပြီးတော့|ဒါပေမဲ့|ဆိုပြီး|လာပြီး|သွားပြီး|ချိန်မှာ|ပေမဲ့|[၊,;])/g, '$1|')
      .split(/\||\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const phrases: string[] = [];
    let current = '';

    for (const tok of tokens) {
      const candidate = current ? `${current} ${tok}` : tok;
      if (candidate.length > maxCharsPerCue && current.length >= 10) {
        phrases.push(current.replace(/^[၊,\s]+|[၊,\s]+$/g, ''));
        current = tok;
      } else {
        current = candidate;
      }
    }
    if (current.trim()) {
      phrases.push(current.replace(/^[၊,\s]+|[၊,\s]+$/g, ''));
    }

    // If a single continuous token without spaces was still longer than maxCharsPerCue, slice safely at Burmese syllable boundaries
    const finalPhrases: string[] = [];
    for (const p of phrases) {
      if (p.length <= maxCharsPerCue + 6) {
        finalPhrases.push(p);
      } else {
        let idx = 0;
        while (idx < p.length) {
          let end = Math.min(p.length, idx + maxCharsPerCue);
          // Avoid splitting in the middle of a Burmese combining vowel/virama
          while (end < p.length && /[\u102B-\u103F\u1056-\u1059]/.test(p[end])) {
            end++;
          }
          finalPhrases.push(p.slice(idx, end).trim());
          idx = end;
        }
      }
    }

    const totalChars = Math.max(
      1,
      finalPhrases.reduce((acc, p) => acc + p.length, 0)
    );
    const totalDur = Math.max(600, cue.end_ms - cue.start_ms);
    let cursorMs = cue.start_ms;

    finalPhrases.forEach((phraseText, idx) => {
      const isLast = idx === finalPhrases.length - 1;
      const shareMs = isLast
        ? cue.end_ms - cursorMs
        : Math.max(450, Math.round((phraseText.length / totalChars) * totalDur));
      const nextEnd = isLast ? cue.end_ms : Math.min(cue.end_ms - 50, cursorMs + shareMs);
      result.push({
        id: `cue-${seq++}`,
        start_ms: cursorMs,
        end_ms: Math.max(cursorMs + 350, nextEnd),
        text: phraseText,
        originalText: idx === 0 ? cue.originalText : undefined
      });
      cursorMs = nextEnd + 40;
    });
  }

  return result;
}

/**
 * Formats seconds into M:SS or H:MM:SS tabular string
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const totalSec = Math.floor(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Converts milliseconds to standard SRT timestamp (HH:MM:SS,mmm)
 */
export function msToSrtTime(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3600000);
  const minutes = Math.floor((clamped % 3600000) / 60000);
  const seconds = Math.floor((clamped % 60000) / 1000);
  const millis = clamped % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

/**
 * Exports an array of SubtitleCues into valid .srt file content
 */
export function exportCuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const start = msToSrtTime(cue.start_ms);
      const end = msToSrtTime(Math.max(cue.start_ms + 100, cue.end_ms));
      return `${index + 1}\n${start} --> ${end}\n${cue.text.trim()}`;
    })
    .join('\n\n');
}

/**
 * Parses an SRT string into SubtitleCue[]
 */
export function parseSrtToCues(srtContent: string): SubtitleCue[] {
  if (!srtContent || !srtContent.trim()) return [];
  const blocks = srtContent.trim().split(/\r?\n\r?\n/);
  const cues: SubtitleCue[] = [];
  const timeRegex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    const timeLineIdx = lines.findIndex((l) => timeRegex.test(l));
    if (timeLineIdx === -1) continue;
    const match = lines[timeLineIdx].match(timeRegex);
    if (!match) continue;
    const start_ms =
      Number(match[1]) * 3600000 +
      Number(match[2]) * 60000 +
      Number(match[3]) * 1000 +
      Number(match[4]);
    const end_ms =
      Number(match[5]) * 3600000 +
      Number(match[6]) * 60000 +
      Number(match[7]) * 1000 +
      Number(match[8]);
    const text = lines.slice(timeLineIdx + 1).join(' ');
    if (text) {
      cues.push({
        id: `cue-${i + 1}`,
        start_ms,
        end_ms: Math.max(start_ms + 300, end_ms),
        text
      });
    }
  }
  return cues;
}

/**
 * Finds the active subtitle cue at a given playback time in milliseconds
 */
export function findActiveCue(cues: SubtitleCue[], currentTimeMs: number): SubtitleCue | null {
  if (!cues || cues.length === 0) return null;
  for (const cue of cues) {
    if (currentTimeMs >= cue.start_ms && currentTimeMs <= cue.end_ms) {
      return cue;
    }
  }
  return null;
}

/**
 * Calculates caption scale percentage matching TTAK MOVIE RECAP's formula: Math.round((fontSize / 44) * 100)
 */
export function calculateSubtitleScalePercent(fontSize: number): number {
  const clamped = Math.max(12, Math.min(68, fontSize));
  return Math.round((clamped / 44) * 100);
}

/**
 * Clamps a BlurRegion within the 0..100 canvas coordinate space
 */
export function clampBlurRegion(region: BlurRegion): BlurRegion {
  const width = Math.max(5, Math.min(100, region.width));
  const height = Math.max(3, Math.min(100, region.height));
  const x = Math.max(0, Math.min(100 - width, region.x));
  const y = Math.max(0, Math.min(100 - height, region.y));
  const blurStrength = Math.max(10, Math.min(60, Math.round(region.blurStrength)));
  return {
    ...region,
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
    width: Number(width.toFixed(1)),
    height: Number(height.toFixed(1)),
    blurStrength
  };
}

export interface AspectCanvasLayout {
  outW: number;
  outH: number;
  fgW: number;
  fgH: number;
  fgX: number;
  fgY: number;
  srcCropW: number;
  srcCropH: number;
  srcCropX: number;
  srcCropY: number;
  fitMode: FramingFitMode;
  needsAspectBlurPad: boolean;
  needsCropFill: boolean;
}

export interface AspectLayoutOptions {
  fitMode?: FramingFitMode;
  focus?: FocusAnchor;
  padSize?: number;
  padX?: number;
  padY?: number;
  frameZoom?: number;
  outputHD?: boolean;
}

function roundEven(n: number, min = 2): number {
  return Math.max(min, Math.round(n / 2) * 2);
}

/**
 * Converts #RRGGBB hex color into ASS &H00BBGGRR format
 */
export function hexToAssBgr(hex: string, alphaHex = '00'): string | null {
  const m = (hex || '').trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const clean = m[1];
  const r = clean.slice(0, 2).toUpperCase();
  const g = clean.slice(2, 4).toUpperCase();
  const b = clean.slice(4, 6).toUpperCase();
  return `&H${alphaHex.toUpperCase()}${b}${g}${r}`;
}

/**
 * Computes X, Y top-left coordinates for a 9-grid position (tl..br) inside containerW x containerH
 */
export function resolveBrandGridCoords(
  pos: BrandGridPos,
  containerW: number,
  containerH: number,
  itemW: number,
  itemH: number,
  margin = 20
): { x: number; y: number; assAlign: number } {
  const safeMargin = Math.max(8, Math.round(margin));
  const maxX = Math.max(safeMargin, containerW - itemW - safeMargin);
  const maxY = Math.max(safeMargin, containerH - itemH - safeMargin);
  const centerX = Math.max(0, Math.round((containerW - itemW) / 2));
  const centerY = Math.max(0, Math.round((containerH - itemH) / 2));

  const row = pos[0]; // 't' | 'm' | 'b'
  const col = pos[1]; // 'l' | 'c' | 'r'

  const x = col === 'l' ? safeMargin : col === 'r' ? maxX : centerX;
  const y = row === 't' ? safeMargin : row === 'b' ? maxY : centerY;

  // ASS alignment numpad: 7 8 9 (top), 4 5 6 (mid), 1 2 3 (bottom)
  const colNum = col === 'l' ? 1 : col === 'c' ? 2 : 3;
  const rowBase = row === 't' ? 6 : row === 'm' ? 3 : 0;
  return { x, y, assAlign: rowBase + colNum };
}

export const TELEGRAM_CHANNEL_URL = 'https://t.me/TTAKVPN';
export const TELEGRAM_ADMIN_HANDLE = '@TTAK19';
export const TELEGRAM_ADMIN_URL = 'https://t.me/TTAK19';

/**
 * Computes exported ASS Fontsize calibrated for Noto Sans Myanmar in libass so downloaded
 * MP4 subtitles visually match the website preview across portrait (9:16, 4:5) & landscape (16:9).
 */
export function computeAssSubtitleFontSize(
  sliderFontSize: number,
  vidW: number,
  vidH: number
): number {
  const safeSlider = Math.max(12, Math.min(72, Number(sliderFontSize) || 40));
  const safeW = Math.max(240, vidW || 720);
  const safeH = Math.max(240, vidH || 1280);
  // Portrait videos use width directly; landscape scales proportionally from height so 16:9 text isn't oversized
  const baseDim = safeW <= safeH ? safeW : Math.round(safeH * 1.15);
  const scaleFactor = baseDim / 540;
  return Math.max(12, Math.round(safeSlider * 0.88 * scaleFactor));
}

/**
 * Generates an ASS vector drawing ({\p1}) rounded-rectangle path centered cleanly inside
 * (0..width, 0..height) using cubic Bezier corner arcs so Highlight captions render with rounded pill corners.
 */
export function buildAssRoundedBoxPath(
  width: number,
  height: number,
  radius: number
): string {
  const w = Math.max(24, Math.round(width));
  const h = Math.max(20, Math.round(height));
  const r = Math.max(4, Math.min(Math.floor(Math.min(w, h) / 2), Math.round(radius)));
  const k = Math.round(r * 0.55228);
  return (
    `m ${r} 0 ` +
    `l ${w - r} 0 ` +
    `b ${w - r + k} 0 ${w} ${r - k} ${w} ${r} ` +
    `l ${w} ${h - r} ` +
    `b ${w} ${h - r + k} ${w - r + k} ${h} ${w - r} ${h} ` +
    `l ${r} ${h} ` +
    `b ${r - k} ${h} 0 ${h - r + k} 0 ${h - r} ` +
    `l 0 ${r} ` +
    `b 0 ${r - k} ${r - k} 0 ${r} 0`
  );
}

/**
 * Computes output canvas & centered/positioned foreground dimensions when converting a video
 * (e.g. 16:9 landscape -> 9:16 portrait, 4:5 portrait, or 1:1 square) with either:
 * - 'pad' mode: blurred full-bleed backdrop + adjustable Picture Size (1.0..1.6x) & X/Y pan (-100..100)
 * - 'crop' mode: cover fill crop anchored to Top / Center / Bottom
 * Plus continuous Frame Zoom (100%..130%) and FHD 1080p vs 720p target sizing.
 */
export function computeAspectCanvasLayout(
  rawW: number,
  rawH: number,
  aspectRatio: AspectRatioMode = 'original',
  options?: AspectLayoutOptions
): AspectCanvasLayout {
  const safeW = roundEven(Math.max(64, Math.round(rawW || 720)), 64);
  const safeH = roundEven(Math.max(64, Math.round(rawH || 1280)), 64);
  const srcRatio = safeW / safeH;

  const fitMode: FramingFitMode = options?.fitMode === 'crop' ? 'crop' : 'pad';
  const focus: FocusAnchor =
    options?.focus === 'top' || options?.focus === 'bottom' ? options.focus : 'center';
  const padSize = Math.max(1.0, Math.min(1.6, Number(options?.padSize ?? 1.0) || 1.0));
  const padX = Math.max(-100, Math.min(100, Number(options?.padX ?? 0) || 0));
  const padY = Math.max(-100, Math.min(100, Number(options?.padY ?? 0) || 0));
  const frameZoom = Math.max(100, Math.min(130, Number(options?.frameZoom ?? 100) || 100));
  const zoomFactor = frameZoom / 100;
  const isHD1080 = Boolean(options?.outputHD);
  const maxShortEdge = isHD1080 ? 1080 : 720;

  let targetRatio = srcRatio;
  let outW = safeW;
  let outH = safeH;

  if (aspectRatio === '9:16') {
    targetRatio = 9 / 16;
    outW = isHD1080 ? 1080 : 720;
    outH = isHD1080 ? 1920 : 1280;
  } else if (aspectRatio === '16:9') {
    targetRatio = 16 / 9;
    outW = isHD1080 ? 1920 : 1280;
    outH = isHD1080 ? 1080 : 720;
  } else if (aspectRatio === '1:1') {
    targetRatio = 1;
    outW = isHD1080 ? 1080 : 720;
    outH = isHD1080 ? 1080 : 720;
  } else if (aspectRatio === '4:5') {
    targetRatio = 4 / 5;
    outW = isHD1080 ? 1080 : 720;
    outH = isHD1080 ? 1350 : 900;
  } else if (Math.min(safeW, safeH) > maxShortEdge) {
    const scaleRatio = maxShortEdge / Math.min(safeW, safeH);
    outW = roundEven(safeW * scaleRatio, 64);
    outH = roundEven(safeH * scaleRatio, 64);
  }

  const ratioDiffers = aspectRatio !== 'original' && Math.abs(srcRatio - targetRatio) > 0.03;

  // Crop (fill) mode or Frame Zoom > 100%
  if (fitMode === 'crop' && aspectRatio !== 'original') {
    let baseCropW = safeW;
    let baseCropH = safeH;
    if (srcRatio > targetRatio) {
      baseCropW = Math.min(safeW, safeH * targetRatio);
    } else if (srcRatio < targetRatio) {
      baseCropH = Math.min(safeH, safeW / targetRatio);
    }
    const srcCropW = roundEven(baseCropW / zoomFactor, 32);
    const srcCropH = roundEven(baseCropH / zoomFactor, 32);
    const srcCropX = Math.max(0, Math.round((safeW - srcCropW) / 2));
    const maxCropY = Math.max(0, safeH - srcCropH);
    const srcCropY =
      focus === 'top' ? 0 : focus === 'bottom' ? maxCropY : Math.round(maxCropY / 2);

    return {
      outW,
      outH,
      fgW: outW,
      fgH: outH,
      fgX: 0,
      fgY: 0,
      srcCropW,
      srcCropH,
      srcCropX,
      srcCropY,
      fitMode: 'crop',
      needsAspectBlurPad: false,
      needsCropFill: ratioDiffers || zoomFactor > 1.001
    };
  }

  // Original ratio or matching ratio in pad mode
  const srcCropW = zoomFactor > 1.001 ? roundEven(safeW / zoomFactor, 32) : safeW;
  const srcCropH = zoomFactor > 1.001 ? roundEven(safeH / zoomFactor, 32) : safeH;
  const srcCropX = Math.max(0, Math.round((safeW - srcCropW) / 2));
  const srcCropY = Math.max(0, Math.round((safeH - srcCropH) / 2));

  if (!ratioDiffers) {
    if (aspectRatio !== 'original' && Math.min(safeW, safeH) > maxShortEdge) {
      const scaleRatio = maxShortEdge / Math.min(safeW, safeH);
      outW = roundEven(safeW * scaleRatio, 64);
      outH = roundEven(safeH * scaleRatio, 64);
    }
    return {
      outW,
      outH,
      fgW: outW,
      fgH: outH,
      fgX: 0,
      fgY: 0,
      srcCropW,
      srcCropH,
      srcCropX,
      srcCropY,
      fitMode: 'pad',
      needsAspectBlurPad: false,
      needsCropFill: zoomFactor > 1.001
    };
  }

  let baseW: number;
  let baseH: number;
  if (srcRatio >= targetRatio) {
    baseW = outW;
    baseH = roundEven(outW / srcRatio, 16);
  } else {
    baseH = outH;
    baseW = roundEven(outH * srcRatio, 16);
  }

  const fgW = roundEven(baseW * padSize, 16);
  const fgH = roundEven(baseH * padSize, 16);

  const centerX = (outW - fgW) / 2;
  const centerY = (outH - fgH) / 2;
  const panRangeX = Math.abs(outW - fgW) / 2;
  const panRangeY = Math.abs(outH - fgH) / 2;

  const fgX = Math.round(centerX + (padX / 100) * panRangeX);
  const fgY = Math.round(centerY + (padY / 100) * panRangeY);

  return {
    outW,
    outH,
    fgW,
    fgH,
    fgX,
    fgY,
    srcCropW,
    srcCropH,
    srcCropX,
    srcCropY,
    fitMode: 'pad',
    needsAspectBlurPad: true,
    needsCropFill: zoomFactor > 1.001
  };
}

export interface CreditCalculationOptions {
  voiceId?: VoiceGender;
  voiceGender?: VoiceGender;
  enableVision?: boolean;
  useVision?: boolean;
  isSttMode?: boolean;
  sttTranslate?: boolean;
  sttWithTranslation?: boolean;
  planId?: CreditPlanId;
}

/**
 * Calculates credit cost matching DevTools formula (`eR` in submit_form_only.js):
 * - Free Tier: 0 credits (uses 1 of 3 daily 2-minute free videos)
 * - Base rate: 1 Credit per started minute (`Math.ceil(durationSec / 60)`)
 * - Standard Voice (Thiha / Nilar): +0 Cr/min (1 Cr/min total)
 * - Pro Gemini Studio Voice (Kore, Aoede, Charon, Leda, Fenrir, Puck, Orus, Zephyr): +1 Cr/min (2 Cr/min total)
 * - Vision AI Scene Detection: +1 Cr/min
 * - STT Mode: 1 Cr/min (Transcription only) or 2 Cr/min (STT + AI Translation), with 15% discount on Creator Pro Max
 */
export function calculateCreditCost(
  durationSec: number,
  isFreeTier: boolean,
  _options?: CreditCalculationOptions
): number {
  if (isFreeTier) return 0;
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 1;
  // Flat rate across all AI voices: 1 minute = 1 Credit
  const minutes = Math.max(1, Math.ceil(durationSec / 60));
  return minutes;
}

export interface CreditPlanDefinition {
  id: Exclude<CreditPlanId, 'free'>;
  name: string;
  badge: string;
  badgeEn: string;
  badgeMy: string;
  taglineEn: string;
  taglineMy: string;
  credits: number;
  baseCredits?: number;
  bonusCredits?: number;
  minutesIncluded: number;
  standardMinutes: number;
  hoursLabel: string;
  maxVideoDurationMin: number;
  maxVideoDurationLabel: string;
  storageDays: number;
  priceMmk: string;
  priceUsd: string;
  costPerMinMmk: string;
  perMinMmk: number;
  popular?: boolean;
  isPopular?: boolean;
  ttsAccessLabel: string;
  sttRatePerMin: string;
  sttRateLabel: string;
  featuresMy: string[];
  featuresEn: string[];
  sttFeaturesMy: string[];
  sttFeaturesEn: string[];
}

export const CREDIT_PLANS: CreditPlanDefinition[] = [
  {
    id: 'starter-pack',
    name: 'Starter Pack',
    badge: 'STARTER · ENTRY PRO',
    badgeEn: 'STARTER · ENTRY PRO',
    badgeMy: 'စတင်သုံးစွဲသူများအတွက် အထူးသင့်တော်',
    taglineEn: 'Start creating watermark-free FHD 1080p recaps with all AI voices',
    taglineMy: 'Watermark မပါဘဲ FHD 1080p နှင့် AI အသံအစုံ စတင်အသုံးပြုလိုသူများအတွက်',
    credits: 100,
    baseCredits: 100,
    bonusCredits: 0,
    minutesIncluded: 100,
    standardMinutes: 100,
    hoursLabel: '1.7 hrs (၁၀၀ မိနစ်)',
    maxVideoDurationMin: 15,
    maxVideoDurationLabel: 'Up to 15 mins / video',
    storageDays: 14,
    priceMmk: '15,000 MMK',
    priceUsd: '$4.99',
    costPerMinMmk: '~150 MMK / min',
    perMinMmk: 150,
    ttsAccessLabel: 'All 10 AI Voices (Thiha, Nilar + 8 Studio Voices)',
    sttRatePerMin: '1 Cr / min (~150 MMK/min)',
    sttRateLabel: '1 Cr / min (~150 MMK/min) · SRT, VTT, TXT Export',
    featuresMy: [
      '100 Credits / လ (ဗီဒီယို အရှည် ၁၀၀ မိနစ်စာ)',
      'Channel Watermark & Logo (ကိုယ်ပိုင် Channel နာမည် / Logo ထည့်သွင်းအသုံးပြုနိုင်သည်)',
      'ဗီဒီယို တစ်ပုဒ်လျှင် အများဆုံး ၁၅ မိနစ် အထိ ထုတ်ယူနိုင်မည်',
      'AI Voice အသံအစုံ (Thiha, Nilar + Studio Pro အသံ ၁၀ မျိုးလုံး ပွင့်မည်)',
      'FHD 1080p ကြည်လင်ပြတ်သားမှုနှင့် Anti-Copyright Effects များ ပါဝင်သည်',
      '၁၄ ရက် Cloud History သိမ်းဆည်းမှု'
    ],
    featuresEn: [
      '100 Credits / month (100 mins standard video)',
      'Channel Watermark & Logo (Custom @ChannelName & logo burn-in)',
      'Up to 15 minutes max duration per video',
      'All 10 AI Voices Unlocked (Thiha, Nilar + 8 Gemini Studio Voices)',
      'FHD 1080p Resolution & Anti-Copyright Effects (Mirror, Color, Crop, Pitch)',
      '14-day Cloud Storage'
    ],
    sttFeaturesMy: [
      'Whisper Large-V3-Turbo စာတန်းထိုး ထုတ်ယူမှု (1 Credit / 1 မိနစ်)',
      '.SRT, .VTT နှင့် .TXT ဖိုင်များ အကန့်အသတ်မရှိ ဒေါင်းလုဒ်ဆွဲနိုင်သည်',
      'မြန်မာ နှင့် အင်္ဂလိပ် စာတန်းထိုး အချိန်ကိုက် တည်းဖြတ်နိုင်သည်'
    ],
    sttFeaturesEn: [
      'Whisper Large-V3-Turbo transcription (1 Credit / 1 min)',
      'Unlimited .SRT, .VTT, and .TXT subtitle exports',
      'Interactive timestamp & Burmese cue editor'
    ]
  },
  {
    id: 'creator-pro',
    name: 'Creator Pro',
    badge: 'MOST POPULAR · +30 BONUS',
    badgeEn: 'MOST POPULAR · +30 BONUS',
    badgeMy: 'အလူကြိုက်အများဆုံး · +30 Credit အပို',
    taglineEn: 'For TikTok, YouTube & Facebook Movie Recap Creators (+30 Bonus Credits included)',
    taglineMy: 'TikTok, YouTube နှင့် Facebook Movie Recap Page များအတွက် (+30 Credit အပိုပါဝင်သည်)',
    credits: 260,
    baseCredits: 230,
    bonusCredits: 30,
    minutesIncluded: 260,
    standardMinutes: 260,
    hoursLabel: '4.3 hrs (၂၆၀ မိနစ်)',
    maxVideoDurationMin: 45,
    maxVideoDurationLabel: 'Up to 45 mins / video',
    storageDays: 30,
    priceMmk: '35,000 MMK',
    priceUsd: '$11.99',
    costPerMinMmk: '~135 MMK / min (+30 Bonus Cr)',
    perMinMmk: 135,
    popular: true,
    isPopular: true,
    ttsAccessLabel: 'All 10 AI Voices + Emotion & Pacing Control',
    sttRatePerMin: '1 Cr / min (~135 MMK/min) + Multi-Language Translation',
    sttRateLabel: '1 Cr / min (~135 MMK/min) + Multi-Language AI Translation',
    featuresMy: [
      '260 Credits / လ (230 Base + 🎁 30 Credits အပို — စုစုပေါင်း မိနစ် ၂၆၀ စာ)',
      'Channel Watermark & Logo (ကိုယ်ပိုင် Channel နာမည် / Logo ထည့်သွင်းအသုံးပြုနိုင်သည်)',
      'ဗီဒီယို တစ်ပုဒ်လျှင် ၄၅ မိနစ်အထိ (Long-Form Movie Recap Studio ပွင့်မည်)',
      'Priority Cloud GPU Queue (၂ ဆ ပိုမြန်သော Server Render)',
      'AI Voice အသံအစုံ (၁၀ မျိုးလုံး) + Morris / Storytelling / Gen Z စတိုင်အစုံ',
      'FHD 1080p + Dynamic Zoom + Film Grain (Copyright Strike ကာကွယ်မှု အပြည့်အစုံ)'
    ],
    featuresEn: [
      '260 Credits / month (230 Base + 30 Bonus Credits · 260 mins video)',
      'Channel Watermark & Logo (Custom @ChannelName & logo burn-in)',
      'Up to 45 minutes per video + Full Long-Form Movie Recap Studio',
      'Priority Cloud GPU Rendering Queue (2x faster server encoding)',
      'All 10 Premium AI Voices + Full Morris & Storytelling Presets',
      'FHD 1080p + Dynamic Zoom + Film Grain Anti-Copyright Suite'
    ],
    sttFeaturesMy: [
      'Pro STT + AI ဘာသာပြန် စနစ် (တရုတ်/ကိုရီးယား/ဂျပန်/ထိုင်း မှ မြန်မာသို့ တိုက်ရိုက်ပြန်ဆိုမှု)',
      '1 Credit / 1 မိနစ် (~135 MMK/min သာ ကျသင့်မည်)',
      'စကားပြော အရှိန်နှင့် စာကြောင်းအရှည် အော်တို ချိန်ညှိပေးသည့် Smart Sync'
    ],
    sttFeaturesEn: [
      'Pro STT + Direct AI Translation (ZH/KO/JA/TH/EN to Burmese)',
      'Effective cost ~135 MMK / min (1 Credit/min)',
      'Smart Sync automatic line-length & reading-speed balancing'
    ]
  },
  {
    id: 'creator-pro-max',
    name: 'Creator Pro Max',
    badge: 'PRO MAX · +60 BONUS',
    badgeEn: 'PRO MAX · +60 BONUS',
    badgeMy: 'အမြင့်ဆုံး Pro Max · +60 Credit အပို',
    taglineEn: 'For power creators, MCN agencies & daily full-length movie recap channels (+60 Bonus)',
    taglineMy: 'နေ့စဉ် ရုပ်ရှင်ကားရှည်ကြီးများ ထုတ်လုပ်သော Channel ကြီးများအတွက် (+60 Credit အပိုပါဝင်သည်)',
    credits: 560,
    baseCredits: 500,
    bonusCredits: 60,
    minutesIncluded: 560,
    standardMinutes: 560,
    hoursLabel: '9.3 hrs (၅၆၀ မိနစ်)',
    maxVideoDurationMin: 180,
    maxVideoDurationLabel: 'Unlimited (2hr+ Full Movies)',
    storageDays: 90,
    priceMmk: '75,000 MMK',
    priceUsd: '$24.99',
    costPerMinMmk: '~134 MMK / min (+60 Bonus Cr)',
    perMinMmk: 134,
    ttsAccessLabel: 'All 10+ Studio Voices + Multi-Speaker Dialogue & Custom Prosody',
    sttRatePerMin: '15% STT Discount (~114 MMK/min) + Speaker Diarization',
    sttRateLabel: '15% STT Discount (~114 MMK/min) + Speaker Diarization & Batch Export',
    featuresMy: [
      '560 Credits / လ (500 Base + 🎁 60 Credits အပို — စုစုပေါင်း မိနစ် ၅၆၀ စာ)',
      'Channel Watermark & Logo (ကိုယ်ပိုင် Channel နာမည် / Logo ထည့်သွင်းအသုံးပြုနိုင်သည်)',
      'ဗီဒီယိုကြာချိန် အကန့်အသတ်မရှိ (၂ နာရီ+ ရုပ်ရှင်ကားကြီးများနှင့် Series များ)',
      'First in Processing Queue (Dedicated Ultra-Fast GPU — စောင့်ဆိုင်းရန်မလိုပါ)',
      'AI Voice အသံအစုံ + Multi-Speaker (ဇာတ်ကောင်အလိုက် အသံခွဲပြောသည့် စနစ်)',
      '4K / FHD 1080p Ultra Bitrate + Vision AI Auto Scene Cutter + ၉၀ ရက် Cloud Storage'
    ],
    featuresEn: [
      '560 Credits / month (500 Base + 60 Bonus Credits · 560 mins video)',
      'Channel Watermark & Logo (Custom @ChannelName & logo burn-in)',
      'Unlimited Video Duration (2hr+ full movies & multi-episode series)',
      'First in Processing Queue (Dedicated Ultra-Fast Cloud GPU nodes)',
      'All 10+ Studio AI Voices + Multi-Speaker Dialogue Mode',
      '4K / FHD 1080p Ultra Bitrate + Vision AI Scene Slicing + Full Copyright Shield'
    ],
    sttFeaturesMy: [
      'STT Credit 15% အထူးလျှော့ဈေး (~114 MMK/min သာ ကျသင့်မည်)',
      'Multi-Speaker Diarization (ဇာတ်ကောင် တစ်ဦးချင်းစီ အသံခွဲခြားပေးသည့် စနစ်)',
      '၂ နာရီကျော် ရုပ်ရှင်ကားကြီးများ တစ်ခါတည်း .SRT / .VTT / .TXT ထုတ်ယူနိုင်သည်'
    ],
    sttFeaturesEn: [
      '15% STT Credit Discount (~114 MMK/min lowest rate)',
      'Multi-Speaker Diarization (automatic character speaker tagging)',
      'Full-length 2hr+ movie batch .SRT / .VTT / .TXT subtitle extraction'
    ]
  }
];

export const TOP_UP_PACKS = [
  {
    id: 'topup-60',
    name: '60 Credits Instant Pack',
    credits: 60,
    minutes: 60,
    priceMmk: '6,500 MMK',
    priceUsd: '$2.49',
    labelMy: '၁ နာရီစာ အပိုဖြည့်သွင်းမည်',
    descMy: '၆၀ မိနစ်စာ (၁ နာရီ) ချက်ချင်းဖြည့်သွင်းမည်'
  },
  {
    id: 'topup-200',
    name: '200 Credits Booster Pack',
    credits: 200,
    minutes: 200,
    priceMmk: '18,000 MMK',
    priceUsd: '$6.49',
    labelMy: '၃ နာရီ ၂၀ မိနစ်စာ အပိုဖြည့်မည်',
    descMy: '၂၀၀ မိနစ်စာ (၃ နာရီ ၂၀ မိနစ်) ချက်ချင်းဖြည့်သွင်းမည်'
  },
  {
    id: 'topup-500',
    name: '500 Credits Pro Pack',
    credits: 500,
    minutes: 500,
    priceMmk: '38,000 MMK',
    priceUsd: '$13.49',
    labelMy: '၈ နာရီ ၂၀ မိနစ်စာ အပိုဖြည့်မည်',
    descMy: '၅၀၀ မိနစ်စာ (၈ နာရီ ၂၀ မိနစ်) ချက်ချင်းဖြည့်သွင်းမည်'
  },
  {
    id: 'topup-1000',
    name: '1,000 Credits Studio Pack',
    credits: 1000,
    minutes: 1000,
    priceMmk: '68,000 MMK',
    priceUsd: '$23.99',
    labelMy: '၁၆ နာရီ ၄၀ မိနစ်စာ အထူးသက်သာနှုန်း',
    descMy: '၁,၀၀၀ မိနစ်စာ (၁၆ နာရီ ၄၀ မိနစ်) အထူးသက်သာနှုန်းဖြင့် ဖြည့်သွင်းမည်'
  }
];

/**
 * Builds deterministic time-synced Burmese/multilingual subtitle cues across any video duration
 */
export function buildSyncedRecapCues(
  durationSec: number,
  style: ScriptStyleId,
  targetLanguage: TargetLanguageCode,
  customTitle?: string
): { title: string; scriptText: string; cues: SubtitleCue[]; highlightClips: HighlightClip[] } {
  // If this is the 70s uploaded Chinese wedding drama video and targetLanguage is Burmese, use exact scene cues
  if (targetLanguage === 'my' && Math.abs((durationSec || 70) - 70) <= 10) {
    const rawExactCues = SAVETIK_WEDDING_DRAMA_CUES[style] || SAVETIK_WEDDING_DRAMA_CUES.narrator;
    const exactCues = splitCuesIntoShortPhrases(rawExactCues, 54);
    return {
      title:
        customTitle ||
        'မင်္ဂလာဆောင်နေ့က ယွမ် ၃ သိန်းနဲ့ အိမ်အတု လိမ်လည်မှု (SaveTik Wedding Drama Recap)',
      scriptText: exactCues.map((c) => c.text).join(' '),
      cues: exactCues,
      highlightClips: [
        { start_ms: 0, end_ms: 14500, label: '300,000 Yuan Confrontation' },
        { start_ms: 24300, end_ms: 45200, label: '200k Brother Down Payment & House Plot' },
        { start_ms: 45300, end_ms: 70000, label: 'Real Owner Property Deed & Finale' }
      ]
    };
  }

  const safeDurationMs = Math.max(8000, Math.round((durationSec || 24) * 1000));
  const segmentsByLang: Record<TargetLanguageCode, Record<ScriptStyleId, string[]>> = {
    my: {
      narrator: [
        'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ',
        'အိမ်ပြင်လိုက်တာပါလို့ သတို့သမီးက ပြန်ဖြေပါတယ်',
        'အဲဒီအချိန်မှာပဲ အိမ်ရှင်မိန်းကလေး ဝင်လာပြီး',
        'ဆိုဖာနဲ့ပစ္စည်းတွေက သူမဝယ်ထားတာလို့ ဖော်ထုတ်ပါတယ်',
        'ယောက္ခမဖြစ်သူကလည်း အမှန်အတိုင်း ဝန်ခံလာပြီး',
        'နှစ်သိန်းကို သားငယ်လေး အိမ်ဝယ်ဖို့ သုံးလိုက်တာပါ',
        'အိမ်ပိုင်ရှင်အစစ်က ပိုင်ဆိုင်မှုစာချုပ်ကို ထုတ်ပြလိုက်တော့',
        'သတို့သားက မင်္ဂလာပွဲကို ချက်ချင်းဖျက်သိမ်းသွားပါတယ်'
      ],
      drama: [
        'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ',
        'ပျော်ရွှင်စရာ မင်္ဂလာဦးနေ့လေးဟာ မုန်တိုင်းထန်လာပါတယ်',
        'အိမ်ပိုင်ရှင်မိန်းကလေးက အမှန်တရားကို ဖော်ထုတ်လိုက်ချိန်မှာ',
        'ဖုံးကွယ်ထားတဲ့ လျှို့ဝှက်ချက်အားလုံး ပေါ်ထွက်လာခဲ့ပါတယ်',
        'နောက်ဆုံးမှာတော့ သတို့သားက လမ်းခွဲပြီး ထွက်သွားခဲ့ပါတယ်'
      ],
      casual: [
        'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ',
        'ဘရိုတို့ရေ မင်္ဂလာဆောင်နေ့မှာပဲ ပွဲကြီးပွဲကောင်း စပါပြီ',
        'အိမ်ရှင်အစစ် မမက ဝင်လာပြီး အကုန်ဖဲ့ချလိုက်ပြီလေ',
        'မောင်လေး တိုက်ခန်းဝယ်ဖို့ နှစ်သိန်းကို အလစ်သုတ်သွားတာတဲ့ဗျာ',
        'သတို့သားက ပွဲဖျက်ပြီး လှည့်ထွက်သွားတာ လုံးဝရှယ်ပဲ'
      ],
      news: [
        'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ',
        'အိမ်ပြင်ဆင်စရိတ် ပျောက်ဆုံးမှုမှ အငြင်းပွားမှု စတင်ခဲ့ပါတယ်',
        'နှစ်သိန်းကို မောင်ဖြစ်သူ တိုက်ခန်းဝယ်ရာတွင် သုံးစွဲခဲ့ပါတယ်',
        'မူလပိုင်ရှင်မှ အိမ်ပိုင်ဆိုင်မှုစာချုပ်ကို ထုတ်ဖော်ပြသခဲ့ပါတယ်',
        'သတို့သားမှ မင်္ဂလာပွဲကို ချက်ချင်း ဖျက်သိမ်းခဲ့ပါတယ်'
      ],
      none: [
        'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ',
        'မင်္ဂလာခန်းမထဲမှာ အမှန်တရားက ရုပ်လုံးပေါ်လာနေပါတယ်',
        'ယုံကြည်မှု ပျက်ပြားသွားတဲ့အခါ ဆက်ဆံရေး ပြိုလဲသွားတတ်ပါတယ်',
        'စာရွက်စာတမ်း အထောက်အထားနဲ့ လိမ်လည်မှု အဆုံးသတ်သွားပါပြီ',
        'ဒီဇာတ်လမ်းဟာ လက်တွေ့ဘဝအတွက် သင်ခန်းစာတစ်ခု ဖြစ်စေခဲ့ပါတယ်'
      ]
    },
    en: {
      narrator: [
        'Where did you spend the 300,000 yuan?',
        'She claimed she spent it renovating the house',
        'Then the real homeowner walked into the room',
        'She bought the sofa and furniture three years ago',
        'The mother admitted giving 200k to her younger son',
        'The real owner placed the property deed on the table',
        'The groom immediately canceled the wedding and left'
      ],
      drama: [
        'Where did you spend the 300,000 yuan?',
        'Behind calm eyes lies a buried family secret',
        'Every step closer reveals the cost of deception',
        'Truth becomes undeniable when the deed appears',
        'That final revelation changes their destiny forever'
      ],
      casual: [
        'Where did you spend the 300,000 yuan?',
        'She claimed she renovated, but the real owner walked in',
        'Turns out she gave 200k to her younger brother',
        'Then the owner dropped the property deed on the table',
        'The groom walked out on the spot—wildest ending ever'
      ],
      news: [
        'Where did you spend the 300,000 yuan?',
        'The renovation fund was diverted to the bride’s brother',
        'The real property owner presented legal documentation',
        'The groom terminated the marriage ceremony immediately',
        'The confrontation exposed a major financial deception'
      ],
      none: [
        'Where did you spend the 300,000 yuan?',
        'The camera captures the unspoken family tension',
        'Material ambition collides with legal reality',
        'Truth becomes undeniable when proof is shown',
        'What remains is a portrait of broken trust'
      ]
    },
    th: {
      narrator: [
        'เงินสามแสนหยวน คุณเอาไปใช้ที่ไหนหมด',
        'เจ้าสาวอ้างว่านำไปตกแต่งเรือนหอทั้งหมด',
        'แต่เจ้าของบ้านตัวจริงเดินเข้ามาเปิดโปงความจริง',
        'แม่เจ้าสาวยอมรับว่านำเงินไปดาวน์บ้านให้น้องชาย',
        'เจ้าบ่าวยกเลิกงานแต่งทันทีและเดินจากไป'
      ],
      drama: [
        'เงินสามแสนหยวน คุณเอาไปใช้ที่ไหนหมด',
        'ภายใต้แววตาที่นิ่งสงบ มีความลับซ่อนอยู่',
        'ทุกก้าวที่เดินหน้าคือราคาของคำลวง',
        'โฉนดที่ดินเปิดโปงความจริงทั้งหมดบนโต๊ะ',
        'วินาทีสุดท้ายเปลี่ยนชีวิตพวกเขาไปตลอดกาล'
      ],
      casual: [
        'เงินสามแสนหยวน คุณเอาไปใช้ที่ไหนหมด',
        'ฉากเปิดงานแต่งสุดพีคตั้งแต่ต้นคลิป',
        'เจ้าของบ้านตัวจริงเอาโฉนดมาวางกลางโต๊ะ',
        'เจ้าบ่าวเทงานแต่งกลางคันทันที',
        'ตอนจบคือเกินคาดมากทุกคน'
      ],
      news: [
        'เงินสามแสนหยวน คุณเอาไปใช้ที่ไหนหมด',
        'ตรวจสอบพบการนำเงินไปซื้อบ้านให้น้องชาย',
        'เจ้าของกรรมสิทธิ์ตัวจริงนำเอกสารมาแสดง',
        'ฝ่ายชายประกาศยุติการแต่งงานทันที',
        'สรุปเหตุการณ์สำคัญในคลิปวิดีโอนี้'
      ],
      none: [
        'เงินสามแสนหยวน คุณเอาไปใช้ที่ไหนหมด',
        'เบื้องหลังภาพงานมงคลมีความขัดแย้งซ่อนอยู่',
        'ความจริงปรากฏชัดด้วยหลักฐานโฉนดที่ดิน',
        'ความซื่อสัตย์คือหัวใจของการเริ่มต้นชีวิตคู่',
        'บทเรียนราคาแพงของการหลอกลวง'
      ]
    },
    ja: {
      narrator: [
        '30万元をいったいどこに使ったんだ？',
        '新婦は新居の改装に使ったと嘘をつきます',
        'そこへ本当の家の持ち主が現れて暴きます',
        '母親は20万元を弟の頭金に使ったと認めました',
        '新郎は即座に破談を宣言して立ち去りました'
      ],
      drama: [
        '30万元をいったいどこに使ったんだ？',
        '華やかな結婚式の裏の嘘がついに暴かれます',
        '偽りの新居がすべての信頼を壊しました',
        '不動産権利書が突きつけられた決定的な瞬間',
        '二人の未来は永遠に終わりを迎えました'
      ],
      casual: [
        '30万元をいったいどこに使ったんだ？',
        '最初からいきなり修羅場すぎる展開です',
        '実は他人の家を勝手に使っていました',
        '本物のオーナーが権利書を出した瞬間ヤバすぎ',
        '新郎も即決で破談にして帰るのが爽快です'
      ],
      news: [
        '30万元をいったいどこに使ったんだ？',
        '改装資金20万元が親族に流用されていました',
        '会場の住宅も第三者の所有物と判明しました',
        '所有者が権利証を提示し事態が発覚しました',
        '新郎側は即座に婚約破棄を通告しています'
      ],
      none: [
        '30万元をいったいどこに使ったんだ？',
        '華やかな儀式の裏に人間関係の脆さが浮かびます',
        '一枚の権利書が虚構の結婚を終わらせました',
        '信頼を失った後に残るのは後悔だけです',
        '誠実さを問いかける一幕です'
      ]
    },
    ko: {
      narrator: [
        '30만 위안을 도대체 어디에 쓴 거야?',
        '신부는 신혼집 인테리어에 썼다고 거짓말합니다',
        '진짜 집주인이 나타나 모든 사실을 폭로합니다',
        '신부 어머니는 남동생 집 계약금으로 썼다고 말합니다',
        '신랑은 즉시 파혼을 선언하고 떠나버립니다'
      ],
      drama: [
        '30만 위안을 도대체 어디에 쓴 거야?',
        '감추려 했던 거짓말이 마침내 드러납니다',
        '가짜 신혼집이 모든 신뢰를 무너뜨렸습니다',
        '등기증이 놓인 순간 모든 변명은 끝났습니다',
        '마지막 순간이 깊은 파국을 남깁니다'
      ],
      casual: [
        '30만 위안을 도대체 어디에 쓴 거야?',
        '시작하자마자 눈을 뗄 수 없는 참교육 장면',
        '사실 남의 집을 몰래 신혼집으로 쓴 거였네요',
        '진짜 집주인이 등기증 꺼낼 때 표정이 압권입니다',
        '신랑도 미련 없이 바로 손절하고 나가버리네요'
      ],
      news: [
        '30만 위안을 도대체 어디에 쓴 거야?',
        '인테리어 자금 20만 위안이 처남에게 유용되었습니다',
        '신혼집 역시 타인의 소유물임이 확인되었습니다',
        '신랑 측은 즉각 혼인 취소를 통보했습니다',
        '화제가 된 드라마 영상의 핵심 요약입니다'
      ],
      none: [
        '30만 위안을 도대체 어디에 쓴 거야?',
        '화려한 예식장 너머로 거짓의 민낯이 드러납니다',
        '문서 한 장으로 증명된 진실 앞의 침묵',
        '신뢰가 무너진 자리에는 차가운 이별만 남았습니다',
        '정직의 가치를 다시 생각하게 하는 장면입니다'
      ]
    },
    zh: {
      narrator: [
        '三十万你到底花哪去了？',
        '新娘谎称用来装修了这套婚房',
        '真正的房东林知夏走出来当众揭穿',
        '丈母娘承认拿二十万给弟弟付了首付',
        '林知夏直接拍出房产证书揭穿骗婚',
        '新郎看清真相后当场悔婚转身离开'
      ],
      drama: [
        '三十万你到底花哪去了？',
        '喜庆的婚礼现场瞬间变成修罗场',
        '不仅挪用二十万还妄想侵占别人的房产',
        '当房产证摆上桌面的那一刻谎言碎裂',
        '新郎果断止损离去留下一家人破防'
      ],
      casual: [
        '三十万你到底花哪去了？',
        '家人们注意看三十万装修空气的名场面',
        '拿别人租的房子当婚房还挪用二十万',
        '美女房东直接掏出房产证全场安静了',
        '新郎当场退婚走人这结局太解气了'
      ],
      news: [
        '三十万你到底花哪去了？',
        '男方出资三十万但家具均为原房东购置',
        '女方承认将二十万挪作弟弟购房首付',
        '产权人林知夏出示房产证书证实假冒',
        '最终男方当场宣布解除婚约要求退款'
      ],
      none: [
        '三十万你到底花哪去了？',
        '三十万元的去向折射出巨大的裂痕',
        '一纸房产证书揭开了借房骗婚的真相',
        '当信任彻底崩塌果断转身是唯一解脱',
        '这一幕冲突令人深思婚姻的本质'
      ]
    }
  };

  const baseLines = segmentsByLang[targetLanguage]?.[style] || segmentsByLang.my.narrator;
  const targetCueCount = Math.max(
    baseLines.length,
    Math.min(160, Math.round(safeDurationMs / 4200))
  );
  const lines: string[] = Array.from({ length: targetCueCount }, (_, i) => baseLines[i % baseLines.length]);
  const count = lines.length;
  const slotMs = Math.floor(safeDurationMs / count);

  const rawCues: SubtitleCue[] = lines.map((text, idx) => {
    const start_ms = idx * slotMs + 120;
    const end_ms = Math.min(safeDurationMs - 80, (idx + 1) * slotMs - 80);
    return {
      id: `cue-${idx + 1}`,
      start_ms,
      end_ms: Math.max(start_ms + 600, end_ms),
      text
    };
  });

  const cues = splitCuesIntoShortPhrases(rawCues, 54);

  const highlightClips: HighlightClip[] = [
    { start_ms: 0, end_ms: Math.min(4000, Math.floor(safeDurationMs * 0.35)), label: 'Opening Hook' },
    {
      start_ms: Math.floor(safeDurationMs * 0.4),
      end_ms: Math.floor(safeDurationMs * 0.75),
      label: 'Core Twist'
    },
    {
      start_ms: Math.floor(safeDurationMs * 0.78),
      end_ms: safeDurationMs,
      label: 'Climax Finale'
    }
  ];

  const defaultTitle =
    customTitle ||
    (targetLanguage === 'my'
      ? `ရုပ်ရှင် အနှစ်ချုပ် (${SCRIPT_STYLE_PROMPTS[style].labelEn})`
      : `Movie Recap (${SCRIPT_STYLE_PROMPTS[style].labelEn})`);

  return {
    title: defaultTitle,
    scriptText: cues.map((c) => c.text).join(' '),
    cues,
    highlightClips
  };
}

export const INITIAL_HISTORY_JOBS: RecapJobRecord[] = [];

export interface BurmeseFontStyleMeta {
  id: BurmeseFontStyle;
  label: string;
  shortName: string;
  badge: string;
  sampleMy: string;
  cssFontFamily: string;
  assFontName: string;
  pangoFontDesc: string;
  pangoAssScale: number;
  assBold: -1 | 0;
  fontWeight: number;
  letterSpacing?: string;
}

/**
 * Curated Unicode-Accurate Myanmar Font Styles (`စာမှန်တဲ့ Myanmar Font Style အလှများ`)
 * Every style maps to a genuine OpenType/HarfBuzz Unicode Myanmar font bundled in `/public/fonts/*.ttf`
 * so stacked consonants (`ပါဌ်ဆင့်`), medials (`ြ ျ ွ ှ`), and vowels render 100% accurately (`စာမှန်`)
 * on BOTH live web preview and exported FFmpeg MP4 videos.
 */
export const BURMESE_FONT_STYLES: BurmeseFontStyleMeta[] = [
  {
    id: 'Yati_Round',
    label: 'Yati Round · စာလုံးဝိုင်း ခေတ်မီအလှ (Unicode စာမှန်)',
    shortName: 'Yati Round (စာလုံးဝိုင်း)',
    badge: 'ROUND · MODERN',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Padauk", "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif',
    assFontName: 'Padauk',
    pangoFontDesc: 'Padauk Bold',
    pangoAssScale: 0.70,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0.01em'
  },
  {
    id: 'Pyidaungsu',
    label: 'Pyidaungsu Bold · ပြည်ထောင်စု စာလုံးအလှ (Official Unicode)',
    shortName: 'Pyidaungsu (ပြည်ထောင်စု)',
    badge: 'OFFICIAL · CLEAR',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Pyidaungsu", "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif',
    assFontName: 'Pyidaungsu',
    pangoFontDesc: 'Pyidaungsu Bold',
    pangoAssScale: 0.60,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0em'
  },
  {
    id: 'Padauk_Bold',
    label: 'Padauk Studio · ပိတောက် စာလုံးထူအလှ (Recap Popular)',
    shortName: 'Padauk Bold (ပိတောက်)',
    badge: 'POPULAR · BOLD',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Padauk", "Pyidaungsu", "Noto Sans Myanmar", sans-serif',
    assFontName: 'Padauk',
    pangoFontDesc: 'Padauk Bold',
    pangoAssScale: 0.70,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0.015em'
  },
  {
    id: 'Noto_Serif_Bold',
    label: 'Myanmar Cinema Serif · ရုပ်ရှင်စာတန်းထိုး အလှ (Editorial)',
    shortName: 'Cinema Serif (ရုပ်ရှင်စတိုင်)',
    badge: 'CINEMA · SERIF',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Noto Serif Myanmar", "Pyidaungsu", serif',
    assFontName: 'Noto Serif Myanmar',
    pangoFontDesc: 'Noto Serif Myanmar Bold',
    pangoAssScale: 0.42,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0.01em'
  },
  {
    id: 'Noto_Sans_Bold',
    label: 'Noto Sans Clean · ခေတ်မီ စာလုံးသန့်အလှ ( Crisp HD )',
    shortName: 'Noto Sans (စာလုံးသန့်)',
    badge: 'CRISP · HD',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif',
    assFontName: 'Noto Sans Myanmar',
    pangoFontDesc: 'Noto Sans Myanmar Bold',
    pangoAssScale: 0.48,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0em'
  },
  {
    id: 'TharLon_Classic',
    label: 'TharLon Classic · သာလွန် စာလုံးသွယ်အလှ (Unicode)',
    shortName: 'TharLon (သာလွန်)',
    badge: 'CLASSIC · SLIM',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"TharLon", "Pyidaungsu", "Noto Sans Myanmar", sans-serif',
    assFontName: 'TharLon',
    pangoFontDesc: 'TharLon Regular',
    pangoAssScale: 0.70,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em'
  },
  {
    id: 'A15_Innwa',
    label: 'Innwa Unicode · အင်းဝ ရိုးရာစာလုံးအလှ (Unicode စာမှန်)',
    shortName: 'Innwa (အင်းဝ)',
    badge: 'TRADITIONAL',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Noto Serif Myanmar", "Pyidaungsu", "Noto Sans Myanmar", serif',
    assFontName: 'Noto Serif Myanmar',
    pangoFontDesc: 'Noto Serif Myanmar Bold',
    pangoAssScale: 0.42,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0em'
  },
  {
    id: 'Z06-Walone',
    label: 'Walone Style · ဝလုံး စာလုံးဝိုင်းအလှ (Unicode စာမှန်)',
    shortName: 'Walone (ဝလုံးဝိုင်း)',
    badge: 'WALONE · ROUND',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Padauk", "Noto Sans Myanmar", sans-serif',
    assFontName: 'Padauk',
    pangoFontDesc: 'Padauk Bold',
    pangoAssScale: 0.70,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0.02em'
  }
];

export function resolveBurmeseFontMeta(fontStyle?: BurmeseFontStyle | string): BurmeseFontStyleMeta {
  const found = BURMESE_FONT_STYLES.find((f) => f.id === fontStyle);
  return found || BURMESE_FONT_STYLES[0];
}

/* ============================================================================
 * ADMIN OWNER MULTI-API KEY POOL & AUTO-FAILOVER / ROTATION ENGINE
 * Supports 5-6+ Gemini API keys & 5-6+ Groq API keys managed by Admin Owner.
 * Credit Mode users NEVER enter API keys — requests automatically rotate and
 * fail over to the next healthy key when any key hits a rate/quota limit,
 * resting the limited key for 24 hours before automatically re-enabling it.
 * ========================================================================== */
export type ApiProviderType = 'gemini' | 'groq';

export const OWNER_KEY_LIMIT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 Hours rest on limit/quota

export interface AdminApiKeyRecord {
  id: string;
  provider: ApiProviderType;
  label: string;
  apiKey: string;
  maskedKey: string;
  enabled: boolean;
  status: 'healthy' | 'cooldown' | 'invalid';
  cooldownUntil: number;
  usageCount: number;
  dailyUsageCount?: number;
  dailyDateKey?: string;
  failoverCount: number;
  lastUsedAt?: number;
  lastError?: string;
  addedAt: number;
  isEnvDefault?: boolean;
}

export function getPoolDateKey(nowMs = Date.now()): string {
  try {
    return new Date(nowMs).toLocaleDateString('en-CA', { timeZone: 'Asia/Yangon' });
  } catch {
    return new Date(nowMs).toISOString().slice(0, 10);
  }
}

export function maskApiKeyString(rawKey: string): string {
  const clean = (rawKey || '').trim();
  if (!clean) return '••••••••';
  if (clean.length <= 10) {
    return `${clean.slice(0, 3)}•••${clean.slice(-2)}`;
  }
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

export function formatCooldownRemaining(cooldownUntil: number, nowMs = Date.now()): string {
  const diffMs = Math.max(0, cooldownUntil - nowMs);
  if (diffMs <= 0) return 'Ready';
  const totalMin = Math.ceil(diffMs / 60000);
  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Parses single or multi-line / space / comma-separated bulk API keys pasted by the Admin Owner
 * (e.g., 5–6 Gemini keys or 5–6 Groq keys at once), deduplicating and validating format.
 */
export function parseBulkApiKeysInput(rawInput: string, _provider?: ApiProviderType): string[] {
  if (!rawInput || typeof rawInput !== 'string') return [];
  const tokens = rawInput
    .split(/[\r\n,;\s]+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length >= 12 &&
        !line.endsWith(':') &&
        !line.startsWith('#') &&
        !line.startsWith('//')
    );

  const seen = new Set<string>();
  const validKeys: string[] = [];
  for (const token of tokens) {
    const parts =
      token.includes(':') && !token.startsWith('AIza') && !token.startsWith('gsk_')
        ? token.split(':').slice(1).join(':').trim()
        : token.trim();
    const cleaned = parts.replace(/\s+/g, '');
    if (cleaned.length >= 12 && !seen.has(cleaned)) {
      seen.add(cleaned);
      validKeys.push(cleaned);
    }
  }
  return validKeys;
}

/**
 * Inspects an error thrown by Gemini or Groq SDK/HTTP calls to determine if it is a
 * quota / rate-limit error (429 / RESOURCE_EXHAUSTED / rate_limit / overloaded) or an
 * invalid/revoked key error (401 / 403 / API_KEY_INVALID), returning a 24-hour rest duration
 * so the pool immediately switches to the next Admin key and auto-restores after 24 hours.
 */
export function isApiKeyQuotaOrLimitError(err: unknown): {
  shouldRotate: boolean;
  isQuotaLimit: boolean;
  isInvalidKey: boolean;
  cooldownMs: number;
  reason: string;
} {
  const rawMsg =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === 'string'
        ? err
        : JSON.stringify(err || '');
  const lower = rawMsg.toLowerCase();

  const isInvalidKey =
    lower.includes('api_key_invalid') ||
    lower.includes('invalid api key') ||
    lower.includes('invalid_api_key') ||
    lower.includes('api key not valid') ||
    lower.includes('unauthorized') ||
    lower.includes('"code":401') ||
    lower.includes('status: 401');

  if (isInvalidKey) {
    return {
      shouldRotate: true,
      isQuotaLimit: false,
      isInvalidKey: true,
      cooldownMs: OWNER_KEY_LIMIT_COOLDOWN_MS,
      reason: 'Invalid or unauthorized API key (401/Key Invalid)'
    };
  }

  const isQuotaLimit =
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('tokens per minute') ||
    lower.includes('requests per minute') ||
    lower.includes('requests per day') ||
    lower.includes('overloaded') ||
    lower.includes('503');

  if (isQuotaLimit) {
    return {
      shouldRotate: true,
      isQuotaLimit: true,
      isInvalidKey: false,
      cooldownMs: OWNER_KEY_LIMIT_COOLDOWN_MS,
      reason: 'Rate limit or quota reached (24h rest)'
    };
  }

  return {
    shouldRotate: false,
    isQuotaLimit: false,
    isInvalidKey: false,
    cooldownMs: 0,
    reason: rawMsg.slice(0, 140) || 'Unknown error'
  };
}

/**
 * Round-robin selector across all enabled keys for `provider`.
 * 1) Automatically refreshes any key whose 24-hour `cooldownUntil` has expired (`<= nowMs`).
 * 2) Selects the next `healthy` key starting at `startCursor` so Credit Mode traffic distributes
 *    evenly across all Owner keys.
 * 3) If all enabled keys are currently in cooldown, falls back to the key whose cooldown expires soonest.
 */
export function selectNextHealthyPoolKey(
  keys: AdminApiKeyRecord[],
  provider: ApiProviderType,
  startCursor = 0,
  nowMs = Date.now()
): {
  selected: AdminApiKeyRecord | null;
  nextCursor: number;
  updatedKeys: AdminApiKeyRecord[];
} {
  const updatedKeys = keys.map((k) => {
    if (k.provider === provider && k.status === 'cooldown' && k.cooldownUntil <= nowMs) {
      return {
        ...k,
        status: 'healthy' as const,
        cooldownUntil: 0,
        lastError: undefined
      };
    }
    return k;
  });

  const providerEnabled = updatedKeys.filter(
    (k) => k.provider === provider && k.enabled && k.apiKey.trim().length > 0
  );

  if (providerEnabled.length === 0) {
    return { selected: null, nextCursor: 0, updatedKeys };
  }

  const total = providerEnabled.length;
  const safeStart = ((startCursor % total) + total) % total;

  for (let offset = 0; offset < total; offset++) {
    const idx = (safeStart + offset) % total;
    const candidate = providerEnabled[idx];
    if (candidate.status === 'healthy') {
      return {
        selected: candidate,
        nextCursor: (idx + 1) % total,
        updatedKeys
      };
    }
  }

  // Fallback if all enabled keys are in temporary cooldown: pick the one with earliest cooldownUntil
  const coolingCandidates = providerEnabled
    .filter((k) => k.status === 'cooldown')
    .sort((a, b) => a.cooldownUntil - b.cooldownUntil);

  if (coolingCandidates.length > 0) {
    const best = coolingCandidates[0];
    const pickedIdx = providerEnabled.findIndex((k) => k.id === best.id);
    return {
      selected: best,
      nextCursor: ((pickedIdx >= 0 ? pickedIdx : 0) + 1) % total,
      updatedKeys
    };
  }

  return { selected: null, nextCursor: safeStart, updatedKeys };
}

/**
 * Updates a pool key record after an API call succeeds or fails with a quota/rate-limit error.
 * Tracks both lifetime `usageCount` and today's `dailyUsageCount`, resting limited keys for 24 hours.
 */
export function recordPoolKeyOutcome(
  key: AdminApiKeyRecord,
  outcome: {
    ok: boolean;
    error?: unknown;
    nowMs?: number;
    cooldownMsOverride?: number;
  }
): AdminApiKeyRecord {
  const now = outcome.nowMs ?? Date.now();
  const todayKey = getPoolDateKey(now);
  const currentDaily = key.dailyDateKey === todayKey ? key.dailyUsageCount || 0 : 0;

  if (outcome.ok) {
    return {
      ...key,
      status: 'healthy',
      cooldownUntil: 0,
      usageCount: (key.usageCount || 0) + 1,
      dailyUsageCount: currentDaily + 1,
      dailyDateKey: todayKey,
      lastUsedAt: now,
      lastError: undefined
    };
  }

  const errInfo = isApiKeyQuotaOrLimitError(outcome.error);
  const cooldownMs =
    typeof outcome.cooldownMsOverride === 'number'
      ? outcome.cooldownMsOverride
      : errInfo.cooldownMs || OWNER_KEY_LIMIT_COOLDOWN_MS;

  if (errInfo.isInvalidKey) {
    return {
      ...key,
      status: 'invalid',
      cooldownUntil: now + cooldownMs,
      dailyUsageCount: currentDaily,
      dailyDateKey: todayKey,
      failoverCount: (key.failoverCount || 0) + 1,
      lastUsedAt: now,
      lastError: errInfo.reason
    };
  }

  if (errInfo.isQuotaLimit || errInfo.shouldRotate) {
    return {
      ...key,
      status: 'cooldown',
      cooldownUntil: now + cooldownMs,
      dailyUsageCount: currentDaily,
      dailyDateKey: todayKey,
      failoverCount: (key.failoverCount || 0) + 1,
      lastUsedAt: now,
      lastError: errInfo.reason
    };
  }

  return {
    ...key,
    dailyUsageCount: currentDaily,
    dailyDateKey: todayKey,
    lastUsedAt: now,
    lastError: errInfo.reason
  };
}

export interface StudioWorkflowStepState {
  activeStep: 1 | 2 | 3;
  completedSteps: number[];
}

/**
 * Resolves which of the 3 visual workflow steps (1: Load Video, 2: Configure/Generate, 3: Export)
 * is currently active for the beginner-friendly progress bar above the studio canvas.
 */
export function resolveStudioWorkflowStep(
  hasLoadedVideo: boolean,
  isGenerating: boolean,
  isDone: boolean
): StudioWorkflowStepState {
  if (!hasLoadedVideo) {
    return { activeStep: 1, completedSteps: [] };
  }
  if (isDone && !isGenerating) {
    return { activeStep: 3, completedSteps: [1, 2, 3] };
  }
  return { activeStep: 2, completedSteps: [1] };
}

/**
 * Resolves Content-Disposition header for media serving:
 * - Default is `inline` so HTML5 <video> and <audio> tags can play and seek cleanly on mobile & desktop browsers.
 * - Switches to `attachment` only when `?dl=1` or `?name=...` download query params are requested.
 */
export function resolveMediaContentDisposition(
  rawFilename: string,
  requestedName?: string,
  forceDownload?: string | boolean,
  defaultExtension = '.mp4'
): {
  mode: 'inline' | 'attachment';
  safeFilename: string;
  headerValue: string;
} {
  const cleanedExt = defaultExtension.startsWith('.') ? defaultExtension : `.${defaultExtension}`;
  const rawBase = (requestedName || '').trim() || rawFilename.trim() || `media${cleanedExt}`;
  const sanitized = rawBase.replace(/[^a-zA-Z0-9._\-\s]/g, '_').replace(/\s+/g, ' ').trim() || `media${cleanedExt}`;
  const safeFilename = sanitized.toLowerCase().endsWith(cleanedExt.toLowerCase())
    ? sanitized
    : `${sanitized}${cleanedExt}`;

  const wantsDownload =
    forceDownload === true ||
    forceDownload === '1' ||
    forceDownload === 'true' ||
    (typeof requestedName === 'string' && requestedName.trim().length > 0);

  const mode = wantsDownload ? 'attachment' : 'inline';
  return {
    mode,
    safeFilename,
    headerValue: `${mode}; filename="${safeFilename}"`
  };
}

/**
 * Verifies HTTP response status and MIME headers before triggering a browser MP4/MP3 download
 * so Cloudflare HTML timeouts or 404 SPA fallbacks never get saved as `.mp4.html`.
 */
export function isValidPlayableMediaResponse(
  status: number,
  ok: boolean,
  contentType: string | null | undefined,
  expectedPrefix: 'video/' | 'audio/' = 'video/'
): boolean {
  if (!ok || status < 200 || status >= 300) return false;
  const ct = String(contentType || '').toLowerCase();
  if (!ct) return false;
  if (ct.includes('text/html') || ct.includes('application/json') || ct.includes('text/plain')) {
    return false;
  }
  return ct.includes(expectedPrefix) || ct.includes('application/octet-stream');
}

/**
 * Guards against silently replacing a real user-uploaded video with the hardcoded 70s wedding drama
 * ("သိန်း 30") template whenever live Gemini script generation fails or has no API key.
 */
export function shouldFailInsteadOfWeddingFallback(opts: {
  isWeddingDemoClip: boolean;
  usedLiveGemini: boolean;
  hasUploadedSource: boolean;
}): boolean {
  if (opts.usedLiveGemini || opts.isWeddingDemoClip) {
    return false;
  }
  return opts.hasUploadedSource;
}

/**
 * Produces a clear, actionable Burmese & English message explaining why Gemini script generation failed.
 */
export function detectGeminiFailureMessage(
  rawReason: string | undefined | null,
  hasPoolKeys: boolean,
  isFreeMode: boolean
): { code: 'no_key' | 'quota' | 'invalid_key' | 'error'; messageMy: string; messageEn: string } {
  const msg = String(rawReason || '').trim();
  const lower = msg.toLowerCase();

  if (!hasPoolKeys || lower.includes('no gemini') || lower.includes('missing api key')) {
    return {
      code: 'no_key',
      messageMy: isFreeMode
        ? 'Free Mode တွင် AI Script ထုတ်ရန် Settings ထဲ၌ သင့် Gemini API Key ထည့်သွင်းပေးပါ။'
        : 'Server တွင် Gemini API Key မရှိသေးပါ (Telegram Bot မှ /addgemini သို့မဟုတ် Admin Panel မှ ထည့်သွင်းပါ)။',
      messageEn: isFreeMode
        ? 'Please add your Gemini API Key in Settings to generate AI scripts in Free Mode.'
        : 'No active Gemini API Key on server (add one via Telegram Bot /addgemini or Admin Panel).'
    };
  }

  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('resource_exhausted') ||
    lower.includes('rate limit')
  ) {
    return {
      code: 'quota',
      messageMy: isFreeMode
        ? 'သင့် Gemini API Key Quota ပြည့်သွားပါပြီ။ ခဏစောင့်ပြီး ပြန်စမ်းပါ သို့မဟုတ် Key အသစ်ထည့်ပါ။'
        : 'Server ရှိ Gemini API Key Quota ပြည့်သွားပါပြီ (/addgemini ဖြင့် Key အသစ်ထည့်ပါ)။',
      messageEn: 'Gemini API quota exceeded. Please add another key or retry shortly.'
    };
  }

  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('400') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return {
      code: 'invalid_key',
      messageMy: 'Gemini API Key မမှန်ကန်ပါ သို့မဟုတ် ခွင့်ပြုချက်မရှိပါ။ Key ကို ပြန်စစ်ဆေးပါ။',
      messageEn: 'Gemini API key is invalid or unauthorized. Please check your key.'
    };
  }

  return {
    code: 'error',
    messageMy: `AI Script ထုတ်လုပ်မှု မအောင်မြင်ပါ (${msg ? msg.slice(0, 90) : 'Timeout / Connection error'})။ ပြန်လည်ကြိုးစားကြည့်ပါ။`,
    messageEn: `AI Script generation failed (${msg ? msg.slice(0, 90) : 'Timeout / Connection error'}). Please try again.`
  };
}

/**
 * Default anti-copyright / edit toggles:
 * - Credit Mode (!isFreeTier): ONLY FHD 1080p (outputHD) is enabled by default; all optional edit switches start OFF until user enables them.
 * - Free Mode (isFreeTier): all switches including outputHD start OFF.
 */
export function getDefaultAntiCopyrightEffects(isFreeTier: boolean): AntiCopyrightEffects {
  return {
    outputHD: !isFreeTier,
    zoom: false,
    mirror: false,
    colorShift: false,
    crop: false,
    grain: false,
    pitchShift: false
  };
}

export interface PaymentNoticeIdentity {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedAt?: number;
}

export function buildPaymentNoticeKey(payment: PaymentNoticeIdentity): string {
  return `${payment.id}:${payment.status}:${payment.approvedAt || 0}`;
}

/**
 * Ensures Admin Credit Approval / Rejection notification appears strictly once when newly approved/rejected
 * and NEVER re-appears on subsequent page reloads. Pending receipts remain visible while waiting.
 */
export function shouldShowPaymentNotificationBanner(
  payment: PaymentNoticeIdentity | null | undefined,
  dismissedSessionIds: Record<string, boolean>,
  sessionShownKeys: Record<string, boolean>,
  persistedSeenKeys: Record<string, boolean>
): boolean {
  if (!payment || !payment.id) return false;
  if (dismissedSessionIds[payment.id]) return false;
  if (payment.status === 'pending') return true;
  const key = buildPaymentNoticeKey(payment);
  if (sessionShownKeys[key]) return true;
  if (persistedSeenKeys[key]) return false;
  return true;
}

/**
 * Validates the first bytes of a downloaded video payload to guarantee it is not HTML or JSON
 * (which Android/Chrome would otherwise save as `...mp4.html`) and contains valid MP4 `ftyp` or binary payload.
 */
export function isValidMp4BufferHeader(headBytes: Uint8Array, totalBytes = headBytes.length): boolean {
  if (!headBytes || headBytes.length < 12 || totalBytes < 512) return false;
  let prefix = '';
  const limit = Math.min(32, headBytes.length);
  for (let i = 0; i < limit; i++) {
    prefix += String.fromCharCode(headBytes[i]);
  }
  const trimmed = prefix.trimStart().toLowerCase();
  if (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<head') ||
    trimmed.startsWith('<body') ||
    trimmed.startsWith('<script') ||
    trimmed.startsWith('<?xml') ||
    trimmed.startsWith('{')
  ) {
    return false;
  }
  // ISO BMFF / MP4 box header has `ftyp` at bytes 4..7 (or moov/mdat/free/wide boxes)
  const boxType =
    String.fromCharCode(headBytes[4]) +
    String.fromCharCode(headBytes[5]) +
    String.fromCharCode(headBytes[6]) +
    String.fromCharCode(headBytes[7]);
  if (boxType === 'ftyp' || boxType === 'moov' || boxType === 'mdat' || boxType === 'free' || boxType === 'wide') {
    return true;
  }
  return false;
}

export function sanitizeMp4DownloadName(rawTitle: string | undefined | null, fallback = 'ttak_recap'): string {
  const base = String(rawTitle || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return `${base || fallback}.mp4`;
}





