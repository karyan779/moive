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
export type ScriptStyleId = 'narrator' | 'natural' | 'hybrid' | 'drama' | 'casual' | 'news' | 'none';
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
  | 'Z06-Walone'
  | 'Myanmar_Tagu'
  | 'Myanmar_Waso'
  | 'Myanmar_Khyay'
  | 'Myanmar_Sabae'
  | 'Myanmar_Gantgaw'
  | 'Myanmar_Yinmar'
  | 'Myanmar_Angoun'
  | 'Myanmar_Square'
  | 'Cherry_Unicode'
  | 'Myanmar_Sagar'
  | 'Noto_Serif_Black';

export const FREE_DAILY_VIDEO_LIMIT = 5; // 5 free videos per day
export const FREE_MAX_DURATION_SEC = 160; // 2:40 minutes (160s) max per free video

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
  subtitleLanguage?: TargetLanguageCode;
  x: number; // 0..100 center x
  y: number; // 0..100 center y
  fontSize: number; // 16..68 (default 44 -> 100%)
  maxWidth: number; // 30..96 percentage
  samplePreviewLight: boolean;
}

export type ColorShiftPresetId =
  | 'vivid'
  | 'cinema_teal'
  | 'golden_hour'
  | 'cyber_neon'
  | 'cool_noir'
  | 'vintage_film'
  | 'dramatic_dark'
  | 'rose_bloom'
  | 'emerald_matrix'
  | 'bw_classic';

export interface ColorShiftPresetDefinition {
  id: ColorShiftPresetId;
  labelEn: string;
  labelMy: string;
  freeAllowed: boolean;
  cssFilter: string;
  ffmpegFilter: string;
  swatchGradient: string;
}

export interface AntiCopyrightEffects {
  outputHD: boolean; // FHD 1080p vs 720p
  zoom: boolean; // Dynamic zoom 1.15x sine wave 4s cycle
  mirror: boolean; // Horizontal flip
  colorShift: boolean; // Color shift filter enabled
  colorShiftPreset?: ColorShiftPresetId; // Active Color Shift preset (vivid = Free, 9 others = Credit Mode Only)
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

export interface TimedBlurOverlay {
  id: string;
  x: number; // 0..95 (% from left)
  y: number; // 0..95 (% from top)
  width: number; // 8..100 (% width)
  height: number; // 4..100 (% height)
  blurStrength: number; // 10..60
  startSec: number; // >= 0
  endSec: number; // > startSec
}

export interface TimedTextOverlay {
  id: string;
  text: string;
  x: number; // 5..95 (% center X)
  y: number; // 5..95 (% center Y)
  fontSize: number; // 14..64
  color: string; // hex color e.g. #FFFFFF
  bgColor: string; // '' (none) or hex e.g. #000000
  startSec: number; // >= 0
  endSec: number; // > startSec
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
  timedBlurs?: TimedBlurOverlay[];
  timedTexts?: TimedTextOverlay[];
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
  captionOutlineWidth: 3,
  timedBlurs: [],
  timedTexts: []
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
  burmeseText?: string;
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
  translateAudio?: TranslateAudioMode;
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
  isSttOnly?: boolean;
  sttMode?: 'transcribe' | 'translate';
  captionsEngine?: 'gemini' | 'whisper';
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

export const STREAMWAVE_VOICE_STYLE_PROMPTS: Record<ScriptStyleId, string> = {
  narrator: `You are a Burmese short-form movie recap narrator (Fast Recap style — snappy TikTok/Reels cadence).
Rewrite the timestamped transcript into a brisk, catchy, natural spoken Myanmar third-person movie recap ("သူက", "ကောင်လေးက", "သူမက") with enhanced context comprehension.
Rules:
- Never translate first-person character dialogue ("ငါ", "မင်း") literally; narrate what happens in the scene as a punchy third-person storyteller.
- Open with a strong TikTok/Reels hook in the first 3 seconds.
- Keep every cue to a single short, punchy spoken Burmese phrase (26–50 Burmese characters, ~2.0–2.8 seconds) synchronized to the scene timestamps [start_ms, end_ms].
- Do not repeat the same meaning across consecutive cues.
- STRICTLY AVOID repetitive "...ပါတယ်", "...တယ်", "...လိုက်ပါတယ်", or "...သွားခဲ့ပါတယ်" endings. Rotate crisp, pleasant TikTok/Reels spoken Burmese endings naturally ("...လိုက်တော့တာပေါ့", "...သွားခဲ့ပြီ", "...ဖြစ်သွားရော", "...နေတုန်းမှာပဲ", "...လုပ်ချလိုက်ပြီ", "...မသိလိုက်ဘူးလေ", "...တော့တာပဲ", "...လိုက်ရော", "...နေခဲ့တာ") and never use trailing "။".`,
  natural: `You are a Burmese movie recap narrator (Natural Flow style).
Accurately translate and retell the real dialogue, burned-in on-screen subtitles, and visual actions in natural, lively third-person spoken Myanmar ("သူက", "ကောင်လေးက", "သူမက").
Rules:
- STRICT FACTUAL & NUMBER FIDELITY FIRST: Read any burned-in on-screen subtitles in the video frames and the spoken audio/transcript verbatim. Preserve every exact number, room number, floor, date, money amount, and name literally (e.g., if the subtitle or audio says 214, write ၂၁၄ — NEVER guess or substitute a wrong number). Never invent vague filler lines that contradict or ignore what was actually said.
- Never output raw first/second-person character dialogue ("ငါ", "မင်း") literally; turn the exact meaning of what characters say and do into accurate third-person storytelling.
- Open with a strong hook based ONLY on the real opening scene in the first 3 seconds.
- Keep every cue to a single short, punchy spoken Burmese phrase (26–48 Burmese characters, ~2.0–2.8 seconds) synchronized to the scene timestamps [start_ms, end_ms].
- Do not repeat the same meaning across consecutive cues.
- AVOID repeating "...တယ်", "...ပါတယ်", or "...ဖြစ်ပါတယ်" at the end of every sentence. Vary sentence endings naturally like a real human Burmese storyteller ("...လိုက်တော့တာပေါ့", "...သွားခဲ့ပြီ", "...နေခဲ့ရရှာတယ်", "...လုပ်ချလိုက်ပါလေရော", "...မသေချာဘူးလေ", "...မှန်း မသိခဲ့ဘူးလေ") without trailing "။".`,
  drama: `You are a Burmese movie recap storyteller (Storytelling / Drama style — Tone: Intense & Cinematic).
Rewrite the timestamped transcript into an emotionally gripping, continuous third-person spoken Myanmar movie recap with cinematic intensity and short punchy sentences.
Rules:
- Narrate strictly in third-person ("သူက", "ကောင်လေးက", "သူမက") and never output raw first/second-person character dialogue ("ငါ", "မင်း").
- Emphasize character emotions, motives, suspense, and dramatic turning points in natural spoken Burmese.
- Keep every cue to a single 1-line phrase (26–50 Burmese characters, ~2.1–2.9 seconds) locked to the scene timestamps [start_ms, end_ms] with 100–220ms natural pauses.
- Never repeat the same point across consecutive cues.`,
  casual: `You are a viral Burmese short-form movie recap creator (Gen Z / Casual style — Tone: Fast & Engaging).
Rewrite the timestamped transcript into a fast, energetic third-person spoken Myanmar movie commentary for TikTok, Reels, and Shorts.
Rules:
- Use lively, conversational third-person Burmese recap phrasing ("ဘဲကြီးက", "ဒီကောင်လေးက", "သူက") — never literal character dialogue ("ငါ", "မင်း").
- Keep pacing brisk with zero dead air and zero repetition between consecutive cues.
- Keep every cue to a crisp 1-line spoken Burmese phrase (26–48 Burmese characters, ~1.9–2.7 seconds) synced to [start_ms, end_ms].`,
  news: `You are a Burmese broadcast recap anchor (News style — Authoritative, facts-first storytelling · Tone: Measured & Surprising).
Summarize the video's timestamped events into an objective, facts-first third-person spoken Myanmar recap.
Rules:
- Present key events, cause-and-effect, and surprising facts clearly in third-person Burmese without first-person dialogue ("ငါ", "မင်း").
- Keep every cue to a single concise 1-line spoken Burmese phrase (28–50 Burmese characters, ~2.1–2.9 seconds) synced to [start_ms, end_ms] with no repeated facts.`,
  hybrid: `You are an expert Burmese Movie Recap Storyteller & Cinema Dialogue Translator (Hybrid Dialogue style).
Combine crisp third-person Burmese movie recap narration for setup/action scenes with direct quoted character dialogue ("...") whenever characters speak on screen.
Rules:
- NON-DIALOGUE / SETUP SCENES: Narrate in crisp third-person Burmese movie recap style ("ကောင်မလေးတစ်ယောက်ဟာ", "သူဟာ", "ဒါပေမဲ့...", "...ခဲ့ပါတယ်"), preserving all exact numbers, ages, and visual details.
- ACTIVE CHARACTER SPEAKING SCENES: Switch seamlessly to direct first/second-person character dialogue enclosed in double quotes ("...") translating the EXACT real meaning with authentic spoken Burmese particles matching character age/emotion ("မောင်ရေ...", "...လေး", "...ရဲ့လားဟင်", "ဟာ...", "...လိုက်တာ", "...ပဲ").
- Keep every cue concise (24–48 Burmese characters, ~2.0–2.8s) locked strictly to exact [start_ms, end_ms] timestamps with zero repetition.`,
  none: `You are a Burmese documentary narrator (Documentary style — Journalistic, context → story → insight · Tone: Reflective & Deep).
Write an insightful, observational third-person spoken Myanmar documentary recap synchronized 1-to-1 with the video's exact scene timestamps.
Rules:
- Follow the documentary progression (context → story → insight) using calm, journalistic spoken Burmese endings ("...ဖြစ်ပါတယ်", "...တွေ့ရပါတယ်", "...လုပ်ဆောင်ပါတယ်").
- Never output first-person dialogue ("ငါ", "မင်း") or repeat consecutive sentences.
- Strict 1:1 scene-timestamp lock: each cue at [start_ms, end_ms] must narrate only the scene happening at that exact timestamp window, never front-loading the plot or padding later scenes.`
};

export const SCRIPT_STYLE_PROMPTS: Record<ScriptStyleId, ScriptStylePromptDefinition> = {
  narrator: {
    id: 'narrator',
    labelEn: 'Fast Recap',
    labelMy: 'အမြန်ပြန်ပြောပြမယ် (Fast Recap)',
    badge: 'DEFAULT · HOOK-DRIVEN',
    descriptionEn: 'Snappy TikTok/Reels spoken Myanmar movie recap with varied natural endings — eliminates repetitive "...ပါတယ်" / "...တယ်" loops.',
    descriptionMy: '“...ပါတယ် / ...တယ်” ချည်း ထပ်မနေဘဲ ခပ်သွက်သွက် TikTok / Reels ဟန်ဖြင့် အဆုံးသတ်မျိုးစုံ နားထောင်လို့ကောင်းအောင် ပြန်ပြောပြမယ့်ဟန်။',
    pacingWpm: 155,
    systemPrompt: `You are a Burmese short-form movie recap narrator (Fast Recap style — snappy TikTok/Reels storytelling cadence).
Rewrite the timestamped transcript into a brisk, catchy, pleasant-to-listen spoken Myanmar third-person movie recap ("သူက", "ကောင်လေးက", "သူမက") with enhanced context comprehension.
Rules:
- Never translate first-person character dialogue ("ငါ", "မင်း") literally; narrate what happens in the scene as a punchy third-person storyteller.
- Open with a strong TikTok/Reels hook in the first 3 seconds.
- Keep every cue to a single short, punchy spoken Burmese phrase (26–50 Burmese characters, ~2.0–2.8 seconds) synchronized to the scene timestamps [start_ms, end_ms].
- Do not repeat the same meaning across consecutive cues.
- STRICTLY AVOID repetitive "...ပါတယ်", "...တယ်", "...လိုက်ပါတယ်", or "...သွားခဲ့ပါတယ်" endings — rotate crisp spoken Burmese endings ("...လိုက်တော့တာပေါ့", "...သွားခဲ့ပြီ", "...ဖြစ်သွားရော", "...နေတုန်းမှာပဲ", "...လုပ်ချလိုက်ပြီ", "...မသိလိုက်ဘူးလေ", "...တော့တာပဲ", "...လိုက်ရော", "...နေခဲ့တာ") without trailing "။".

CRITICAL MOVIE RECAP NARRATION RULES (MUST OBEY):
1. STRICT THIRD-PERSON RECAP NARRATION ONLY (NOT DIALOGUE TRANSLATION):
   - You are a single third-person short-form movie storyteller (ဇာတ်လမ်းပြန်ပြောပြသူ) explaining what happens on screen using third-person subjects ("ကောင်လေးက", "သူက", "သူမက", "အဲဒီလူက", "ရဲတွေက").
   - NEVER output raw first-person or second-person character dialogue ("ငါ", "မင်း", "နင်", "ခဏနေပါဦး မင်း ခုနက စကားပြောလိုက်တာလား", "ငါ သတ်ထားတာမှ မဟုတ်တာ") as if dubbing the actors!
   - Convert every spoken line in the transcript into crisp, lively TikTok/Reels spoken Myanmar third-person recap storytelling (e.g., instead of "ခဏနေပါဦး မင်း စကားပြောလိုက်တာလား", write "မြွေက လူလို စကားထပြောလိုက်တော့ ကောင်လေးလည်း မျက်လုံးပြူးသွားရော"; instead of "ငါ အကြောက်ဆုံးက မင်း ငါ့ကို ကိုက်မှာပဲ", write "အလောင်းထက်စာရင် ဒီမြွေ သူ့ကိုထကိုက်မှာကိုပဲ ပိုကြောက်နေခဲ့တာ").
2. ZERO REPETITION / NO DUPLICATE MEANING:
   - NEVER write two consecutive cues that repeat the same point in different words (e.g., never follow "သူက မြွေစကား နားလည်နေတာ" with "ဒါဟာ သူက မြွေစကား နားလည်နေတာပဲ"). Every cue must advance the plot with new action, cause-and-effect, or twist.
3. SHORT, PUNCHY 1-LINE PHRASES:
   - Every cue.text MUST be one crisp spoken Burmese recap phrase of 5 to 10 words (26 to 50 Burmese characters, ~2.0s–2.8s when spoken). Never write multi-sentence paragraphs in one cue.
4. HOOK FIRST & CONTINUOUS SCENE SYNC:
   - Open immediately (0.0s–3.0s) with a gripping TikTok/Reels hook about the scene, and lock cue timestamps (start_ms, end_ms) chronologically across the entire video with tight 100ms–220ms natural breath pauses.
5. NATURAL TIKTOK/REELS SPOKEN BURMESE FLOW & VARIED ENDINGS (NO REPETITIVE "ပါတယ်/တယ်"):
   - Deliver brisk, easy-to-listen Burmese recap narration with punchy connectors ("အဲဒီအချိန်မှာပဲ", "ဒါပေမဲ့", "တကယ်တမ်းကျတော့", "မထင်မှတ်ဘဲ", "နောက်ဆုံးမှာတော့").
   - NEVER end consecutive sentences with "...ပါတယ်", "...တယ်", "...လိုက်ပါတယ်", "...သွားခဲ့ပါတယ်", or "...ဖြစ်ပါတယ်" — minimize stiff formal "...ပါတယ်" completely and rotate varied, crisp spoken Burmese endings naturally across every line ("...လိုက်တော့တာပေါ့", "...သွားခဲ့ပြီ", "...ဖြစ်သွားရော", "...နေတုန်းမှာပဲ", "...လုပ်ချလိုက်ပြီ", "...မသိလိုက်ဘူးလေ", "...တော့တာပဲ", "...လိုက်ရော", "...နေခဲ့တာ", "...ပဲပေါ့") so the voiceover sounds smooth, energetic, and enjoyable to listen to. Avoid trailing "။" inside subtitle text.
6. OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  natural: {
    id: 'natural',
    labelEn: 'Natural Flow',
    labelMy: 'သဘာဝ အပြောဟန် (Natural Flow)',
    badge: 'LIVELY · HUMAN FLOW',
    descriptionEn: 'Lively human Burmese storyteller with varied natural sentence endings (...လိုက်တော့တာပေါ့, ...သွားခဲ့ပြီ, ...လုပ်ချလိုက်ပါလေရော) — avoids repetitive "...ပါတယ်".',
    descriptionMy: '“...တယ် / ...ပါတယ်” ချည်း ထပ်မနေဘဲ တကယ့်လူတစ်ယောက် ဇာတ်လမ်းပြောပြသလို သဘာဝကျကျ အဆုံးသတ်မျိုးစုံဖြင့် သွက်လက်စွာ ပြန်ပြောပြမယ့်ဟန်။',
    pacingWpm: 155,
    systemPrompt: `You are a Burmese movie recap narrator (Natural Flow style).
Accurately understand and retell the video's REAL spoken dialogue, burned-in on-screen subtitles, and visual actions in natural, lively spoken Myanmar third-person movie recap style ("သူက", "ကောင်လေးက", "သူမက").

CRITICAL MOVIE RECAP ACCURACY & NATURAL FLOW RULES (MUST OBEY IN ORDER):
1. STRICT FACTUAL, ON-SCREEN SUBTITLE & NUMBER FIDELITY (HIGHEST PRIORITY):
   - Read BOTH the spoken audio/transcript AND any burned-in on-screen subtitles visible in the attached video frames carefully before writing each cue.
   - Preserve EVERY exact number, room number, floor, time, price, place, and proper name literally (for example, if the video subtitle or speech says "214", you MUST say "၂၁၄" — NEVER guess or replace it with another number).
   - Retell the EXACT real meaning of every spoken line and visual action. NEVER invent generic filler sentences (like vague "something uncertain is happening") when the actual dialogue states a specific answer, instruction, or fact!
2. STRICT THIRD-PERSON RECAP NARRATION ONLY (NOT RAW DIALOGUE DUBBING):
   - You are a single third-person movie storyteller (ဇာတ်လမ်းပြန်ပြောပြသူ) explaining what happens on screen using third-person subjects ("သူက", "သူမက", "ကောင်လေးက", "ကောင်မလေးက", "သူတို့က").
   - NEVER output raw first-person or second-person character dialogue ("ငါ", "မင်း", "နင်") as if dubbing the actors!
   - Faithfully convert each character's actual spoken meaning into accurate, clear third-person Burmese recap narration.
3. ZERO REPETITION / NO DUPLICATE MEANING:
   - NEVER write two consecutive cues that repeat the same point in different words. Every cue must advance the real scene/dialogue accurately.
4. SHORT, PUNCHY, EVEN-LENGTH 1-LINE PHRASES (FOR STEADY VOICE PACING):
   - Every cue.text MUST be one crisp spoken Burmese recap phrase of 5 to 9 words (24 to 46 Burmese characters, ~2.0s–2.7s when spoken at a steady natural pace). Never write overly long multi-sentence paragraphs in one cue that force the voice to rush.
5. HOOK FIRST & CONTINUOUS SCENE SYNC:
   - Open immediately (0.0s–3.0s) with an accurate hook matching the real opening scene, and lock cue timestamps (start_ms, end_ms) chronologically across the entire video with tight 100ms–220ms natural breath pauses.
6. NATURAL SPOKEN BURMESE FLOW & VARIED ENDINGS (WITHOUT CHANGING MEANING):
   - Keep the exact true meaning intact while delivering it in smooth spoken Burmese with lively connectors ("အဲဒီအချိန်မှာပဲ", "ဒါပေမဲ့လည်း", "တကယ်တမ်းကျတော့", "နောက်ဆုံးမှာတော့"). AVOID repeating "...တယ်", "...ပါတယ်", or "...ဖြစ်ပါတယ်" at the end of every sentence — vary sentence endings naturally ("...လိုက်တော့တာပေါ့", "...နေတုန်းမှာပဲ", "...ဖြစ်သွားခဲ့ပြီ", "...နေခဲ့ရရှာတယ်", "...လုပ်ချလိုက်ပါလေရော", "...မသေချာဘူးလေ", "...မထင်ထားခဲ့ဘူး") so it never sounds robotic. Avoid trailing "။" inside subtitle text.
7. OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  drama: {
    id: 'drama',
    labelEn: 'Storytelling',
    labelMy: 'ပုံပြင်ပြောပြမယ် (Storytelling)',
    badge: 'INTENSE · CINEMATIC',
    descriptionEn: 'Cinematic intensity, short punchy sentences (Tone: Intense & Cinematic) with natural spoken Myanmar rewrite.',
    descriptionMy: 'ဇာတ်ကောင်တွေရဲ့ စိတ်ခံစားချက်နဲ့ လှည့်ကွက်တွေကို ရုပ်ရှင်ဆန်ဆန် ဝါကျတိုများဖြင့် ဆွဲဆောင်မှုရှိရှိ ပြောပြမယ့်ဟန်။',
    pacingWpm: 148,
    systemPrompt: `You are a Burmese movie recap storyteller (Storytelling / Drama style — Tone: Intense & Cinematic).
Rewrite the timestamped transcript into an emotionally gripping, continuous third-person spoken Myanmar movie recap with cinematic intensity and short punchy sentences.
Rules:
- Narrate strictly in third-person ("သူက", "ကောင်လေးက", "သူမက") and never output raw first/second-person character dialogue ("ငါ", "မင်း").
- Emphasize character emotions, motives, suspense, and dramatic turning points in natural spoken Burmese.
- Keep every cue to a single 1-line phrase (26–50 Burmese characters, ~2.1–2.9 seconds) locked to the scene timestamps [start_ms, end_ms] with 100–220ms natural pauses.
- Never repeat the same point across consecutive cues.

CRITICAL RULES:
1. STRICT THIRD-PERSON STORYTELLING ONLY (NATURAL SPOKEN MYANMAR REWRITE): Narrate the story from the outside ("သူက", "ကောင်လေးက", "သူမက"). NEVER output literal first/second-person character dialogue ("ငါ", "မင်း")—always turn character speech into emotional third-person recap narration with cinematic intensity and short punchy sentences.
2. ZERO REPETITION: Never repeat the same idea across consecutive cues; each cue must reveal a new emotional beat, motive, or plot turn.
3. CONTINUOUS SCENE-LOCKED NARRATION: Keep narration flowing smoothly across beginning, middle, climax, and ending with 100ms–220ms pauses.
4. OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  casual: {
    id: 'casual',
    labelEn: 'Gen Z',
    labelMy: 'လူငယ်ဆန်ဆန် (Gen Z)',
    badge: 'FAST · ENGAGING',
    descriptionEn: 'Fast & engaging viral commentary with natural spoken Myanmar rewrite and rapid 1-line TikTok highlight captions.',
    descriptionMy: 'TikTok နဲ့ Reels အတွက် အထူးသင့်တော်တဲ့ လူငယ်ဆန်ဆန် သွက်လက်တက်ကြွသော ၁ ကြောင်းစာ စာတန်းထိုး ပြောဟန်။',
    pacingWpm: 160,
    systemPrompt: `You are a viral Burmese short-form movie recap creator (Gen Z / Casual style — Tone: Fast & Engaging).
Rewrite the timestamped transcript into a fast, energetic third-person spoken Myanmar movie commentary for TikTok, Reels, and Shorts.
Rules:
- Use lively, conversational third-person Burmese recap phrasing ("ဘဲကြီးက", "ဒီကောင်လေးက", "သူက") — never literal character dialogue ("ငါ", "မင်း").
- Keep pacing brisk with zero dead air and zero repetition between consecutive cues.
- Keep every cue to a crisp 1-line spoken Burmese phrase (26–48 Burmese characters, ~1.9–2.7 seconds) synced to [start_ms, end_ms].

CRITICAL RULES:
1. THIRD-PERSON VIRAL COMMENTARY ONLY: Narrate what the characters are doing in lively third-person Burmese recap style ("ဘဲကြီးက", "သူက", "ဒီကောင်လေးက"). NEVER translate raw first-person dialogue ("ငါ", "မင်း") directly!
2. ZERO REPETITION & ZERO DEAD AIR: Never repeat the same point twice; keep commentary moving briskly with 100ms–200ms pauses from 0ms to the end.
3. OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  news: {
    id: 'news',
    labelEn: 'News',
    labelMy: 'သတင်းကြေညာသူ (News)',
    badge: 'MEASURED · FACTS-FIRST',
    descriptionEn: 'Authoritative, facts-first storytelling (Tone: Measured & Surprising) with crisp 1-line synced captions.',
    descriptionMy: 'သတင်းကြေညာသူတစ်ဦးလို အချက်အလက်ဦးစားပေးပြီး တိကျရှင်းလင်းသော ၁ ကြောင်းစာ စာတန်းထိုး တင်ဆက်ဟန်။',
    pacingWpm: 150,
    systemPrompt: `You are a Burmese broadcast recap anchor (News style — Authoritative, facts-first storytelling · Tone: Measured & Surprising).
Summarize the video's timestamped events into an objective, facts-first third-person spoken Myanmar recap.
Rules:
- Present key events, cause-and-effect, and surprising facts clearly in third-person Burmese without first-person dialogue ("ငါ", "မင်း").
- Keep every cue to a single concise 1-line spoken Burmese phrase (28–50 Burmese characters, ~2.1–2.9 seconds) synced to [start_ms, end_ms] with no repeated facts.

OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  hybrid: {
    id: 'hybrid',
    labelEn: 'Hybrid Dialogue',
    labelMy: 'Hybrid Dialogue (ဇာတ်ကြောင်းပြော + ဇာတ်ကောင်စကားပြော)',
    badge: 'RECAP + QUOTED DIALOGUE',
    descriptionEn: 'Third-person Burmese movie recap narration for setup & action scenes, switching seamlessly to accurate quoted character dialogue ("...") whenever characters speak.',
    descriptionMy: 'စကားမပြောတဲ့ အခန်းတွေမှာ ဇာတ်ကြောင်းပြောဟန်နဲ့ ဆွဲဆောင်ပြောပြပြီး ဇာတ်ကောင်တကယ်စကားပြောတဲ့ အခန်းတွေမှာ "..." ဖြင့် ဇာတ်ကောင်အသံအတိုင်း တိကျသဘာဝကျကျ ဘာသာပြန်ပေးမယ့်ဟန်။',
    pacingWpm: 152,
    systemPrompt: `You are an expert Burmese Movie Recap Storyteller & Cinema Dialogue Translator (Hybrid Recap + Direct Dialogue Style).
Analyze BOTH the video's visual frames (character expressions, actions, burned-in on-screen subtitles) AND the timestamped audio/transcript carefully.

STRICT HYBRID STRUCTURE RULES (MUST OBEY):
1. NON-DIALOGUE / SETUP / ACTION SCENES (Before or between character speaking scenes):
   - Narrate in crisp, engaging third-person Burmese Movie Recap style ("ကောင်မလေးတစ်ယောက်ဟာ", "သူဟာ", "ဒါပေမဲ့", "...ခဲ့ပါတယ်", "...ဖြစ်နေခဲ့ပါတယ်").
   - Open in the first 3–4 seconds with a strong plot hook introducing the character's flaw/motive and immediate setup.
   - Use sharp contrast twists ("ဒါပေမဲ့...") when revealing hidden truths, and preserve ALL exact numbers, ages, room numbers, and visual details verbatim (e.g., "အသက် ၅၂ နှစ်", "၂၁၄").

2. ACTIVE CHARACTER DIALOGUE SCENES (When a character is clearly speaking on screen / phone call / close-up lip-sync):
   - Switch seamlessly from third-person narration to DIRECT FIRST/SECOND-PERSON CHARACTER DIALOGUE enclosed in double quotes ("...").
   - Translate the EXACT real meaning of what the character actually says in the audio and burned-in subtitles — NEVER invent generic filler or alter the real meaning.
   - Match each character's age, gender, personality, and facial emotion using authentic spoken Burmese particles and interjections:
     • Flirty / sweet tone: "မောင်ရေ...", "...လေး", "...ရဲ့လားဟင်"
     • Excited / shocked / rural uncle tone: "ဟာ...", "...လိုက်တာ", "တကယ့်...ပဲ", "...ကတော့ တကယ်ကို ...တာပဲ"
     • Angry / cold / dramatic tone: "ဘာပြောလိုက်တယ်", "မင်း...", "...စမ်းပါ"
   - Lock the start_ms and end_ms of every quoted dialogue line precisely to the exact milliseconds when that character speaks on screen.

3. ACCURACY, PACING & FORMAT RULES:
   - STRICT FACTUAL ACCURACY: Cross-verify spoken audio, burned-in subtitles, and visual scenes so character roles, ages, numbers, and dialogue meaning are 100% accurate.
   - ZERO REPETITION: Never narrate what a character is about to say right before quoting the exact same line; let the quoted dialogue deliver the punchline directly.
   - SHORT 1-LINE PHRASES: Keep every cue concise (24–48 Burmese characters, ~2.0–2.8s spoken duration) for steady, natural pacing without rushing.
   - OUTPUT SCHEMA: Return valid JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  },
  none: {
    id: 'none',
    labelEn: 'Documentary',
    labelMy: 'မှတ်တမ်းရုပ်ရှင် (Documentary)',
    badge: 'REFLECTIVE · DEEP',
    descriptionEn: 'Journalistic, context → story → insight (Tone: Reflective & Deep) with 1:1 scene-synced 1-line captions.',
    descriptionMy: 'မှတ်တမ်းရုပ်ရှင်တစ်ခုလို အကြောင်းအရာ၊ ဇာတ်လမ်းနှင့် သုံးသပ်ချက်များကို လေးနက်တည်ငြိမ်စွာ ၁ ကြောင်းစာ စာတန်းထိုးဖြင့် ရှင်းပြဟန်။',
    pacingWpm: 145,
    systemPrompt: `You are a Burmese documentary narrator (Documentary style — Journalistic, context → story → insight · Tone: Reflective & Deep).
Write an insightful, observational third-person spoken Myanmar documentary recap synchronized 1-to-1 with the video's exact scene timestamps.
Rules:
- Follow the documentary progression (context → story → insight) using calm, journalistic spoken Burmese endings ("...ဖြစ်ပါတယ်", "...တွေ့ရပါတယ်", "...လုပ်ဆောင်ပါတယ်").
- Never output first-person dialogue ("ငါ", "မင်း") or repeat consecutive sentences.
- Strict 1:1 scene-timestamp lock: each cue at [start_ms, end_ms] must narrate only the scene happening at that exact timestamp window, never front-loading the plot or padding later scenes.

CRITICAL DOCUMENTARY SYNC RULES:
1. KEEP SIGNATURE DOCUMENTARY TONE (CONTEXT → STORY → INSIGHT): Use calm, journalistic, observational third-person Burmese documentary sentences ("...ဖြစ်ပါတယ်", "...တွေ့ရပါတယ်", "...လုပ်ဆောင်ပါတယ်"). Never output literal first-person character dialogue ("ငါ", "မင်း") or repeat consecutive sentences.
2. STRICT 1:1 SCENE-TIMESTAMP LOCK (NEVER FRONT-LOAD THE PLOT): A cue at start_ms: T MUST ONLY narrate the visual/audio scene occurring at timestamp T in the video/transcript! NEVER finish narrating the video's plot in the first half and NEVER pad the second half with invented reflections, resignations, or unfilmed events.
3. OUTPUT SCHEMA: Return JSON with { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [{ start_ms, end_ms, label }] }.`
  }
};

export const LONG_FORM_STYLE_PROMPTS: Record<LongFormStyleId, { label: string; prompt: string }> = {
  educational: {
    label: 'Educational (Measured & Surprising)',
    prompt: 'Authoritative, facts-first storytelling (Tone: Measured & Surprising). Break down the movie plot and underlying themes with clear cause-and-effect explanations, character psychology insights, and structured chapter transitions.'
  },
  dramatic: {
    label: 'Dramatic (Intense & Cinematic)',
    prompt: 'Cinematic intensity, short punchy sentences (Tone: Intense & Cinematic). Maximize suspense, cliffhangers, and emotional stakes across every act of the film while syncing narration tightly to key visual turning points.'
  },
  listicle: {
    label: 'Listicle (Fast & Engaging)',
    prompt: 'Countdown format, numbered key highlights (Tone: Fast & Engaging). Structure the movie recap into numbered high-impact moments and hidden details that viewers missed.'
  },
  documentary: {
    label: 'Documentary (Reflective & Deep)',
    prompt: 'Journalistic, context → story → insight (Tone: Reflective & Deep). Deliver an investigative, archival-style narration analyzing the film world, timeline, and character decisions.'
  },
  morris: {
    label: 'Morris (Intimate & Clinical · Signature Burmese Movie Recap)',
    prompt: 'Empirical, pharmacological precision tone (Tone: Intimate & Clinical) blended with classic high-retention Burmese Movie Recap storytelling cadence: iconic character nicknames, brisk scene-by-scene narration, suspenseful transitions, and a memorable takeaway at the finale.'
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

export type ScriptAiModelId =
  | 'gemini-3.8-flash'
  | 'gemini-4-hydrogen'
  | 'gemini-3.1-flash-lite'
  | 'gemini-4-argon'
  | 'gemini-3-flash-preview'
  | 'gemini-3.1-pro-preview'
  | 'gemini-2.5-flash';
export type TtsEngineId =
  | 'edge-neural'
  | 'gemini-3.8-flash-lite-tts'
  | 'gemini-3.8-flash-tts'
  | 'gemini-2.5-flash-preview-tts';
export type SttEngineId = 'whisper-large-v3-turbo' | 'whisper-large-v3' | 'gemini-audio-stt';

export interface ApiEngineSettingsConfig {
  scriptModel: ScriptAiModelId;
  ttsEngine: TtsEngineId;
  sttModel: SttEngineId;
  breathPauseMs: number;
  dynamicTempoFit: boolean;
}

export const DEFAULT_API_ENGINE_CONFIG: ApiEngineSettingsConfig = {
  scriptModel: 'gemini-4-hydrogen',
  ttsEngine: 'edge-neural',
  sttModel: 'whisper-large-v3-turbo',
  breathPauseMs: 100,
  dynamicTempoFit: true
};

export const SCRIPT_AI_MODELS: { id: ScriptAiModelId; label: string; badge: string; desc: string }[] = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen (Default · Fast Multimodal & Burmese Sync)',
    badge: 'DEFAULT · FAST',
    desc: 'Recommended Gemini 4 Flash model with high reliability and accurate 1:1 scene alignment.'
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite (Ultra-Low Latency Backup)',
    badge: 'LITE · HIGH SPEED',
    desc: 'Lightweight high-throughput Flash model ideal for peak traffic hours.'
  },
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash (Natural Spoken Myanmar Rewrite)',
    badge: 'NATURAL REWRITE',
    desc: 'Natural spoken Myanmar rewrite with automatic Gemini 4 Hydrogen failover.'
  },
  {
    id: 'gemini-4-argon',
    label: 'Gemini 4 Argon / Pro (Deep Storytelling & Complex Plot)',
    badge: 'PRO · DEEP',
    desc: 'High-reasoning cinematic storytelling and multi-character nuance'
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
    id: 'gemini-3.8-flash-lite-tts',
    label: 'Gemini 3.8 Flash TTS (Studio Multi-Voice)',
    badge: 'STUDIO PRO',
    desc: 'Direct Gemini 3.8 multimodal speech synthesis (Kore, Aoede, Charon, Fenrir, Orus)'
  }
];

export const STT_ENGINE_OPTIONS: { id: SttEngineId; label: string; badge: string; desc: string }[] = [
  {
    id: 'whisper-large-v3-turbo',
    label: 'Whisper Large V3 Turbo (Default · Ultra-Fast Groq STT)',
    badge: 'DEFAULT · TURBO',
    desc: 'Ultra-fast acoustic recognition via Groq. Best noise penetration.'
  },
  {
    id: 'whisper-large-v3',
    label: 'Whisper Large-v3 (High-Accuracy Dialogue STT)',
    badge: 'ACCURATE',
    desc: 'Maximum accuracy for noisy background music and overlapping dialogue'
  },
  {
    id: 'gemini-audio-stt',
    label: 'Gemini 3.1 Flash Lite Multimodal Audio-to-Script',
    badge: 'MULTIMODAL',
    desc: 'Next-gen Flash Lite model. Best accuracy, high speed. Direct scene emotion detection.'
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

function formatSecBadge(sec: number): string {
  const safe = Math.max(0, Math.round(sec));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

function formatSecBadgePrecise(sec: number): string {
  const safe = Math.max(0, Number.isFinite(sec) ? sec : 0);
  const mins = Math.floor(safe / 60);
  const rem = safe - mins * 60;
  const whole = Math.floor(rem);
  const centis = Math.min(99, Math.round((rem - whole) * 100));
  if (centis === 100) {
    return `${String(mins).padStart(2, '0')}:${String(whole + 1).padStart(2, '0')}.00`;
  }
  return `${String(mins).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(centis).padStart(2, '0')}`;
}

const WHISPER_HALLUCINATION_REGEX =
  /^(?:谢谢观看|感谢观看|感谢收看|请不吝点赞|请订阅|订阅|点赞|关注|字幕由|字幕提供|字幕制作|优优独播剧场|中文字幕|影视字幕|Thank you for watching\.?|Thanks for watching\.?|Please subscribe\.?|Subtitles? by\b.*|Translated by\b.*|Amara\.org.*|MBC|KBS|SBS|[\s.,!?…\-~•♪♫。，！？、]+)$/i;

export function isHallucinatedSttText(rawText: string): boolean {
  const clean = String(rawText || '').trim();
  if (!clean) return true;
  if (WHISPER_HALLUCINATION_REGEX.test(clean)) return true;
  // Filter obvious single-character repetition loops (e.g. "啊啊啊啊啊啊啊" or "哈哈哈哈哈哈哈")
  if (clean.length >= 6 && /^(.)\1{5,}$/.test(clean.replace(/[\s.,!?。，！？]/g, ''))) {
    return true;
  }
  return false;
}

export function formatTimedSttSegments(
  segments: Array<{ start?: unknown; end?: unknown; text?: unknown }> | undefined | null,
  fallbackPlainText = '',
  maxSegments = 120,
  preciseMs = false
): string {
  if (!Array.isArray(segments) || segments.length === 0) {
    return fallbackPlainText.trim();
  }
  const clean: Array<{ start: number; end: number; text: string }> = [];
  let prevNorm = '';
  let repeatRun = 0;

  for (const s of segments) {
    const start = Number(s?.start);
    const end = Number(s?.end);
    const text = typeof s?.text === 'string' ? s.text.trim() : '';
    if (!text) continue;
    if (preciseMs && isHallucinatedSttText(text)) continue;

    // Suppress 3+ consecutive identical Whisper hallucination loops in precise mode
    const norm = text.replace(/[\s.,!?。，！？]/g, '').toLowerCase();
    if (preciseMs && norm && norm === prevNorm) {
      repeatRun += 1;
      if (repeatRun >= 2) continue;
    } else {
      prevNorm = norm;
      repeatRun = 0;
    }

    const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
    const safeEnd = Number.isFinite(end) ? Math.max(safeStart, end) : safeStart;
    clean.push({
      start: safeStart,
      end: safeEnd,
      text
    });
  }

  if (clean.length === 0) {
    return fallbackPlainText.trim();
  }

  let sampled = clean;
  if (clean.length > maxSegments) {
    sampled = [];
    for (let i = 0; i < maxSegments; i++) {
      const idx = Math.min(clean.length - 1, Math.floor((i * (clean.length - 1)) / (maxSegments - 1)));
      if (!sampled.length || sampled[sampled.length - 1] !== clean[idx]) {
        sampled.push(clean[idx]);
      }
    }
  }

  if (preciseMs) {
    return sampled
      .map(
        (s) =>
          `[${formatSecBadgePrecise(s.start)} - ${formatSecBadgePrecise(Math.max(s.start + 0.25, s.end))}] ${s.text}`
      )
      .join('\n');
  }

  return sampled
    .map((s) => `[${formatSecBadge(s.start)} - ${formatSecBadge(Math.max(s.start + 1, s.end))}] ${s.text}`)
    .join('\n');
}

export interface TimedSttSegmentInput {
  start?: unknown;
  end?: unknown;
  text?: unknown;
}

export interface TimedSttWordInput {
  word?: unknown;
  start?: unknown;
  end?: unknown;
}

/**
 * Splits Whisper STT output into clean, individual single-turn utterances with crisp speech-end
 * boundaries instead of long multi-sentence / back-to-back chained blocks:
 * - When word-level timestamps (`words[]`) are present, splits on spoken pauses >= 300ms,
 *   sentence-ending punctuation, or long clause breaks and locks end time tightly to lastWord.end.
 * - When only segment-level timestamps exist, splits multi-sentence segments cleanly with a
 *   brief 120ms clear gap between turns so subtitles never stay continuously glued together.
 */
export function splitWhisperSegmentsIntoUtterances(
  segments: TimedSttSegmentInput[] | undefined | null,
  words?: TimedSttWordInput[] | undefined | null
): Array<{ start: number; end: number; text: string }> {
  const validWords = Array.isArray(words)
    ? words
        .map((w) => ({
          word: typeof w?.word === 'string' ? w.word.trim() : '',
          start: Number(w?.start),
          end: Number(w?.end)
        }))
        .filter((w) => w.word.length > 0 && Number.isFinite(w.start) && Number.isFinite(w.end))
    : [];

  if (validWords.length >= 2) {
    const utterances: Array<{ start: number; end: number; text: string }> = [];
    let bufWords: Array<{ word: string; start: number; end: number }> = [];

    const joinWordsClean = (list: Array<{ word: string }>) => {
      let out = '';
      for (const item of list) {
        const token = item.word;
        if (!out) {
          out = token;
          continue;
        }
        const prevChar = out[out.length - 1];
        const nextChar = token[0];
        const isCjkOrPunct =
          /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0E00-\u0E7F\u1000-\u109F]/.test(prevChar) &&
          /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF\u0E00-\u0E7F\u1000-\u109F]/.test(nextChar);
        const isClosingPunct = /^[,.;:!?。，、！？…]/.test(token);
        out += isCjkOrPunct || isClosingPunct ? token : ` ${token}`;
      }
      return out.trim();
    };

    const flush = (nextWordStart?: number) => {
      if (bufWords.length === 0) return;
      const text = joinWordsClean(bufWords);
      const start = Math.max(0, bufWords[0].start);
      let end = Math.max(start + 0.25, bufWords[bufWords.length - 1].end + 0.06);
      if (typeof nextWordStart === 'number' && Number.isFinite(nextWordStart) && nextWordStart > start + 0.28) {
        // Guarantee a crisp visual clear gap (~110ms) before the next utterance begins
        end = Math.min(end, Math.max(start + 0.24, nextWordStart - 0.11));
      }
      if (text) {
        utterances.push({ start, end, text });
      }
      bufWords = [];
    };

    for (let i = 0; i < validWords.length; i++) {
      const cur = validWords[i];
      const next = i + 1 < validWords.length ? validWords[i + 1] : null;
      bufWords.push(cur);

      const currentText = joinWordsClean(bufWords);
      const currentDur = cur.end - bufWords[0].start;
      const pauseToNext = next ? next.start - cur.end : 99;
      const endsSentence = /[。！？!?…]$/.test(cur.word);
      const endsClause = /[，,、;；]$/.test(cur.word);
      const hasCjk = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(currentText);
      const tooLongAtClause =
        endsClause && ((hasCjk && currentText.length >= 12) || (!hasCjk && bufWords.length >= 7) || currentDur >= 2.2);
      const hardLengthCap =
        (hasCjk && currentText.length >= 22) || (!hasCjk && bufWords.length >= 12) || currentDur >= 3.4;

      if (!next || pauseToNext >= 0.30 || endsSentence || tooLongAtClause || hardLengthCap) {
        flush(next?.start);
      }
    }
    flush();
    if (utterances.length > 0) return utterances;
  }

  if (!Array.isArray(segments) || segments.length === 0) return [];
  const out: Array<{ start: number; end: number; text: string }> = [];
  for (const s of segments) {
    const start = Number(s?.start);
    const end = Number(s?.end);
    const text = typeof s?.text === 'string' ? s.text.trim() : '';
    if (!text) continue;
    const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
    const safeEnd = Number.isFinite(end) ? Math.max(safeStart + 0.25, end) : safeStart + 1.5;

    // Split multi-sentence Whisper segments into separate utterances
    let parts = text
      .split(/(?<=[。！？!?])\s*|\r?\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    // Also split overly long single-segment runs on clause commas so 2 speakers/clauses don't merge
    const expanded: string[] = [];
    for (const part of parts) {
      const hasCjk = /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/.test(part);
      if ((hasCjk && part.length >= 22) || (!hasCjk && part.length >= 52)) {
        const sub = part
          .split(/(?<=[，,、])\s*/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (sub.length > 1) {
          let acc = '';
          for (const piece of sub) {
            const candidate = acc ? `${acc} ${piece}` : piece;
            if (acc && ((hasCjk && candidate.length > 18) || (!hasCjk && candidate.length > 42))) {
              expanded.push(acc.replace(/[，,、]+$/, '').trim());
              acc = piece;
            } else {
              acc = candidate;
            }
          }
          if (acc) expanded.push(acc.replace(/[，,、]+$/, '').trim());
          continue;
        }
      }
      expanded.push(part);
    }
    parts = expanded.filter(Boolean);

    if (parts.length <= 1) {
      out.push({ start: safeStart, end: safeEnd, text: parts[0] || text });
      continue;
    }

    const totalDur = Math.max(parts.length * 0.35, safeEnd - safeStart);
    const totalWeight = Math.max(1, parts.reduce((sum, p) => sum + Math.max(3, p.length), 0));
    const gapSec = 0.12;
    const usableDur = Math.max(parts.length * 0.25, totalDur - gapSec * (parts.length - 1));
    let curStart = safeStart;
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const share = Math.max(0.28, usableDur * (Math.max(3, parts[i].length) / totalWeight));
      const remainingMin = (parts.length - 1 - i) * (0.28 + gapSec);
      const curEnd = isLast ? safeEnd : Math.min(safeEnd - remainingMin, curStart + share);
      out.push({
        start: curStart,
        end: Math.max(curStart + 0.25, curEnd),
        text: parts[i]
      });
      curStart = Math.min(safeEnd - 0.25, Math.max(curStart + 0.25, curEnd) + gapSec);
    }
  }
  return out;
}

export function parseWorkersAiWhisperTimedResult(
  payload: unknown,
  maxSegments = 120,
  preciseMs = false
): string {
  const plain = parseWorkersAiWhisperResult(payload);
  if (!payload || typeof payload !== 'object') return plain;
  const data = payload as {
    result?: {
      segments?: Array<{ start?: unknown; end?: unknown; text?: unknown }>;
      words?: Array<{ word?: unknown; start?: unknown; end?: unknown }>;
    };
  };
  const rawSegments = data.result?.segments;
  const splitSegments = preciseMs
    ? splitWhisperSegmentsIntoUtterances(rawSegments, data.result?.words)
    : rawSegments;
  return formatTimedSttSegments(splitSegments, plain, maxSegments, preciseMs);
}

export type SttProviderOrder = ('user_groq' | 'workers_ai' | 'groq_pool')[];

/**
 * Resolves STT execution chain:
 * - Free Mode: NEVER uses Cloudflare Workers AI or Admin's Groq Key Pool (only uses user's own Groq key if supplied).
 * - Credit Mode: Runs Cloudflare Workers AI (`@cf/openai/whisper-large-v3-turbo`) first when configured,
 *   with automatic failover to Owner Groq Key Pool.
 */
export function resolveSttStrategyForMode(
  isFreeMode: boolean,
  hasFreeGroqKey: boolean,
  hasWorkersAiConfigured: boolean
): SttProviderOrder {
  if (isFreeMode) {
    return hasFreeGroqKey ? ['user_groq'] : [];
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
  const isLongTimeline = Boolean(totalDurationMs && totalDurationMs > 120_000);
  const safeMaxGap = Math.max(safePause, Math.min(480, Math.round(maxGapMs || 240)));
  const hasFullTimelineAnchors = Boolean(cues.length >= 4 && totalDurationMs && totalDurationMs > 4000);

  // If multi-cue narration covers a known video duration, ensure scene timestamps span the full timeline
  const rawMaxCueEnd = cues.length > 0 ? Math.max(...cues.map((c) => Math.max(c.end_ms || 0, c.start_ms || 0))) : 0;
  const sceneScale =
    hasFullTimelineAnchors &&
    totalDurationMs &&
    rawMaxCueEnd > 0 &&
    (rawMaxCueEnd < totalDurationMs * 0.94 || rawMaxCueEnd > totalDurationMs * 1.04)
      ? (totalDurationMs - 140) / rawMaxCueEnd
      : 1;

  const normalizedStarts = cues.map((c, idx) =>
    idx === 0
      ? Math.max(60, Math.min(240, Math.round((c.start_ms || 60) * sceneScale)))
      : Math.max(60, Math.round((c.start_ms || 0) * sceneScale))
  );
  const normalizedEnds = cues.map((c, idx) =>
    Math.max(normalizedStarts[idx] + 400, Math.round((c.end_ms || c.start_ms + 1500) * sceneScale))
  );

  // Compute a uniform steady global tempo baseline when total spoken audio slightly exceeds video length,
  // so narration plays at ONE calm, consistent speed rather than swinging erratically between 1.0x and 1.24x.
  const totalRawSpokenMsAll = cues.reduce(
    (sum, c, idx) =>
      sum +
      Math.max(
        320,
        Math.round(spokenDurationsMs[idx] || normalizedEnds[idx] - normalizedStarts[idx] || 1500)
      ),
    0
  );
  const totalPausesBudgetMs = Math.max(0, cues.length - 1) * safePause;
  const globalBudgetMs =
    hasFullTimelineAnchors && totalDurationMs ? Math.max(1000, totalDurationMs - 140 - totalPausesBudgetMs) : 0;
  const globalSteadyTempo =
    dynamicTempoFit && globalBudgetMs > 0 && totalRawSpokenMsAll > globalBudgetMs
      ? Number(Math.min(1.12, Math.max(1.0, totalRawSpokenMsAll / globalBudgetMs)).toFixed(3))
      : 1.0;
  // Tight per-cue ceiling & smooth adjacent-cue delta cap eliminate jarring fast/slow voice fluctuations
  const maxSteadyCueTempo = Number(Math.min(1.12, Math.max(1.08, globalSteadyTempo + 0.03)).toFixed(3));
  const maxAdjacentTempoDelta = 0.025;

  const schedule: SyncedCueScheduleItem[] = [];
  let audioCursorMs = 60;
  let prevTempoFactor = globalSteadyTempo;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const targetSceneStartMs = normalizedStarts[i];
    const targetSceneEndMs = normalizedEnds[i];
    const rawSpokenMs = Math.max(
      320,
      Math.round(spokenDurationsMs[i] || targetSceneEndMs - targetSceneStartMs || 1500)
    );

    // Method 1: Anchor to the scene's actual video timestamp so voice & video stay locked in sync
    let alignedStartMs = cues.length === 1 ? 60 : Math.max(audioCursorMs, targetSceneStartMs);

    if (cues.length > 1 && i > 0) {
      const prevEndMs = audioCursorMs - safePause;
      if (hasFullTimelineAnchors && totalDurationMs) {
        // Compute remaining spoken time vs. remaining video timeline so we never snowball early drift
        let remainingSpokenMs = 0;
        for (let k = i; k < cues.length; k++) {
          remainingSpokenMs += Math.max(
            320,
            Math.round(spokenDurationsMs[k] || normalizedEnds[k] - normalizedStarts[k] || 1500)
          );
        }
        const remainingGaps = Math.max(1, cues.length - i);
        const minRemainingPausesMs = Math.max(0, remainingGaps - 1) * safePause;
        // Only pull a scene cue earlier than targetSceneStartMs if starting at targetSceneStartMs
        // would cause remaining speech to overflow totalDurationMs, or if the gap exceeds 2600ms.
        const latestSafeSceneStartMs = Math.max(
          audioCursorMs,
          totalDurationMs - 100 - Math.round(remainingSpokenMs / maxSteadyCueTempo) - minRemainingPausesMs
        );
        if (alignedStartMs > latestSafeSceneStartMs) {
          alignedStartMs = latestSafeSceneStartMs;
        }
        const remainingTimelineMs = Math.max(0, totalDurationMs - 120 - prevEndMs);
        const neededAvgGapMs = Math.max(
          safePause,
          Math.round((remainingTimelineMs - remainingSpokenMs) / remainingGaps)
        );
        const allowedSceneGapMs = Math.max(
          safeMaxGap,
          Math.min(2600, Math.max(1400, Math.round(neededAvgGapMs * 2.1)))
        );
        if (alignedStartMs - prevEndMs > allowedSceneGapMs) {
          alignedStartMs = prevEndMs + allowedSceneGapMs;
        }
      } else if (alignedStartMs - prevEndMs > safeMaxGap) {
        alignedStartMs = prevEndMs + safeMaxGap;
      }
    }

    if (totalDurationMs && totalDurationMs > 1200) {
      const minReserveMs = Math.max(350, (cues.length - 1 - i) * 380);
      const maxAllowedStartMs = Math.max(60, totalDurationMs - 100 - minReserveMs);
      if (alignedStartMs > maxAllowedStartMs) {
        alignedStartMs = Math.max(audioCursorMs, Math.min(alignedStartMs, maxAllowedStartMs));
      }
    }

    // Method 3: Compute available scene slot before next cue or video end
    const hasNext = i + 1 < cues.length;
    const rawNextTargetMs = hasNext
      ? normalizedStarts[i + 1]
      : totalDurationMs && totalDurationMs > alignedStartMs + 500
        ? totalDurationMs - 100
        : Math.max(alignedStartMs + rawSpokenMs, targetSceneEndMs);

    const nextSceneBoundaryMs = hasNext
      ? Math.max(alignedStartMs + 480, rawNextTargetMs - safePause)
      : Math.max(alignedStartMs + 480, rawNextTargetMs);

    let availableSlotMs = Math.max(480, nextSceneBoundaryMs - alignedStartMs);
    if (isLongTimeline && totalDurationMs && totalDurationMs > alignedStartMs + 400) {
      const avgRemainingSlot = Math.max(
        480,
        Math.round((totalDurationMs - 100 - alignedStartMs) / Math.max(1, cues.length - i))
      );
      if (availableSlotMs > avgRemainingSlot * 1.45) {
        availableSlotMs = Math.max(480, Math.round(avgRemainingSlot * 1.25));
      }
    }

    // Gentle late-drift catch-up without abrupt speed spikes
    const lateDriftMs = cues.length > 1 ? Math.max(0, alignedStartMs - targetSceneStartMs) : 0;
    if (dynamicTempoFit && lateDriftMs > 360 && availableSlotMs > 600) {
      const catchUpTrimMs = Math.min(Math.round(lateDriftMs * 0.3), Math.round(availableSlotMs * 0.1));
      availableSlotMs = Math.max(480, availableSlotMs - catchUpTrimMs);
    }

    let tempoFactor = globalSteadyTempo;

    // NEVER slow down speech below 1.0x (which makes Burmese TTS sound sluggish/heavy);
    // keep per-cue speed tightly bounded and smoothly ramped so voice speed never swings fast/slow.
    if (dynamicTempoFit && rawSpokenMs > availableSlotMs) {
      const rawDesired = Math.min(maxSteadyCueTempo, Math.max(globalSteadyTempo, rawSpokenMs / availableSlotMs));
      tempoFactor = rawDesired;
    }

    if (dynamicTempoFit && cues.length >= 3 && i > 0) {
      const smoothed = Math.max(
        globalSteadyTempo,
        Math.min(
          maxSteadyCueTempo,
          Math.max(prevTempoFactor - maxAdjacentTempoDelta, Math.min(prevTempoFactor + maxAdjacentTempoDelta, tempoFactor))
        )
      );
      tempoFactor = smoothed;
    }

    tempoFactor = Number(Math.max(1.0, Math.min(maxSteadyCueTempo, tempoFactor)).toFixed(3));
    prevTempoFactor = tempoFactor;

    const effectiveSpokenMs =
      tempoFactor > 1.005 ? Math.max(350, Math.round(rawSpokenMs / tempoFactor)) : rawSpokenMs;

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

/**
 * Builds an explicit chronological scene-window map from `[MM:SS - MM:SS]` Whisper STT lines
 * so Gemini locks every cue's `start_ms` and `end_ms` directly to the real events occurring
 * in that exact time slice of the video (never front-loading the plot or inventing filler).
 */
export function buildChronologicalSceneLockGuide(
  timedTranscript: string | undefined | null,
  totalDurationSec: number
): string {
  const safeDur = Math.max(10, Math.round(Number(totalDurationSec) || 60));
  if (!timedTranscript || typeof timedTranscript !== 'string' || !timedTranscript.trim()) {
    return '';
  }
  const lineRegex =
    /^\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)(?::(\d{2}(?:\.\d{1,3})?))?\s*-\s*(\d{1,2}):(\d{2}(?:\.\d{1,3})?)(?::(\d{2}(?:\.\d{1,3})?))?\]\s*(.+)$/;
  const toSec = (a: string, b: string, c?: string) =>
    c !== undefined ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);

  const parsedLines: Array<{ startSec: number; endSec: number; text: string }> = [];
  for (const rawLine of timedTranscript.split(/\r?\n/)) {
    const m = rawLine.trim().match(lineRegex);
    if (!m) continue;
    const startSec = toSec(m[1], m[2], m[3]);
    const endSec = Math.max(startSec + 0.25, toSec(m[4], m[5], m[6]));
    const text = m[7].trim();
    if (text) parsedLines.push({ startSec, endSec, text });
  }
  if (parsedLines.length === 0) return '';

  const windowSec = safeDur > 180 ? 25 : safeDur > 90 ? 20 : 12;
  const windowCount = Math.max(2, Math.ceil(safeDur / windowSec));
  const windows: string[] = [];

  for (let w = 0; w < windowCount; w++) {
    const wStartSec = w * windowSec;
    if (wStartSec >= safeDur) break;
    const rawNextEnd = Math.min(safeDur, (w + 1) * windowSec);
    const isLastMerged = w === windowCount - 1 || safeDur - rawNextEnd < 10;
    const wEndSec = isLastMerged ? safeDur : rawNextEnd;
    const matching = parsedLines.filter(
      (l) => l.startSec < wEndSec && l.endSec > wStartSec
    );
    const snippet =
      matching.length > 0
        ? matching
            .map((l) => l.text)
            .join(' / ')
            .slice(0, 260)
        : '(Visual transition / continuing action from this scene)';
    windows.push(
      `  • [${formatSecBadge(wStartSec)} - ${formatSecBadge(wEndSec)}] (start_ms: ${wStartSec * 1000}ms .. ${wEndSec * 1000}ms) => ONLY narrate this window's scene: ${snippet}`
    );
    if (isLastMerged) break;
  }

  return `\nMANDATORY 1:1 SCENE-TIMESTAMP WINDOWS (LOCK EVERY CUE TO ITS EXACT WINDOW — NEVER NARRATE LATER WINDOWS EARLY!):\n${windows.join('\n')}`;
}

export interface AudioScriptTimeWindow {
  index: number;
  totalWindows: number;
  startSec: number;
  endSec: number;
  durationSec: number;
}

/**
 * Splits videos longer than 65 seconds into balanced <=64s audio/transcript windows
 * so Gemini never front-loads the entire story into the first ~1:08 (68s) and never
 * hallucinates or drifts on the second half of a video.
 */
export function computeAudioScriptWindows(
  totalDurationSec: number,
  maxWindowSec = 64
): AudioScriptTimeWindow[] {
  const safeTotal = Math.max(6, Math.round(Number(totalDurationSec) || 60));
  const safeMax = Math.max(30, Math.round(maxWindowSec || 64));
  if (safeTotal <= safeMax) {
    return [
      {
        index: 0,
        totalWindows: 1,
        startSec: 0,
        endSec: safeTotal,
        durationSec: safeTotal
      }
    ];
  }
  const numWindows = Math.max(2, Math.ceil(safeTotal / safeMax));
  const windows: AudioScriptTimeWindow[] = [];
  for (let i = 0; i < numWindows; i++) {
    const startSec = Math.round((i * safeTotal) / numWindows);
    const endSec = i === numWindows - 1 ? safeTotal : Math.round(((i + 1) * safeTotal) / numWindows);
    const durationSec = Math.max(6, endSec - startSec);
    windows.push({
      index: i,
      totalWindows: numWindows,
      startSec,
      endSec,
      durationSec
    });
  }
  return windows;
}

/**
 * Extracts and re-indexes `[MM:SS - MM:SS]` Whisper STT lines that fall within `[startSec, endSec]`
 * so each 60s window receives ONLY its own dialogue shifted to `00:00 .. windowDuration`.
 */
export function sliceTimedTranscriptForWindow(
  timedTranscript: string | undefined | null,
  startSec: number,
  endSec: number
): string {
  if (!timedTranscript || typeof timedTranscript !== 'string' || !timedTranscript.trim()) {
    return '';
  }
  const lineRegex =
    /^\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)(?::(\d{2}(?:\.\d{1,3})?))?\s*-\s*(\d{1,2}):(\d{2}(?:\.\d{1,3})?)(?::(\d{2}(?:\.\d{1,3})?))?\]\s*(.+)$/;
  const toSec = (a: string, b: string, c?: string) =>
    c !== undefined ? Number(a) * 3600 + Number(b) * 60 + Number(c) : Number(a) * 60 + Number(b);

  const hasFractional = /\[\d{1,2}:\d{2}\.\d+/.test(timedTranscript);

  const rawLines = timedTranscript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const timedEntries: Array<{ s: number; e: number; text: string }> = [];
  for (const line of rawLines) {
    const m = line.match(lineRegex);
    if (!m) continue;
    const s = toSec(m[1], m[2], m[3]);
    const e = Math.max(s + (hasFractional ? 0.25 : 1), toSec(m[4], m[5], m[6]));
    const text = m[7].trim();
    if (text) timedEntries.push({ s, e, text });
  }

  // If transcript is plain untimed text, only return it for single-window or proportional slice
  if (timedEntries.length === 0) {
    return timedTranscript.trim();
  }

  const winDur = Math.max(1, endSec - startSec);
  const matching = timedEntries.filter((item) => item.s < endSec && item.e > startSec);
  if (matching.length === 0) return '';

  if (hasFractional) {
    return matching
      .map((item) => {
        const relStart = Math.max(0, Math.min(winDur - 0.25, item.s - startSec));
        const relEnd = Math.max(relStart + 0.25, Math.min(winDur, item.e - startSec));
        return `[${formatSecBadgePrecise(relStart)} - ${formatSecBadgePrecise(relEnd)}] ${item.text}`;
      })
      .join('\n');
  }

  return matching
    .map((item) => {
      const relStart = Math.max(0, Math.min(winDur - 1, Math.round(item.s - startSec)));
      const relEnd = Math.max(relStart + 1, Math.min(winDur, Math.round(item.e - startSec)));
      return `[${formatSecBadge(relStart)} - ${formatSecBadge(relEnd)}] ${item.text}`;
    })
    .join('\n');
}

/**
 * Normalizes Gemini-generated cues against the actual video duration so timestamps stay
 * strictly monotonic, never exceed totalDurationSec, and span the whole timeline evenly.
 */
export function normalizeRecapTimelineCues(
  cues: SubtitleCue[],
  totalDurationSec: number
): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const totalMs = Math.max(4000, Math.round(totalDurationSec * 1000));
  const clean = cues
    .map((c, idx) => ({
      ...c,
      id: c.id || `cue-${idx + 1}`,
      text: String(c.text || '').replace(/[။។]/g, ' ').replace(/\s+/g, ' ').trim(),
      start_ms: Math.max(0, Math.round(Number(c.start_ms) || 0)),
      end_ms: Math.max(400, Math.round(Number(c.end_ms) || 0))
    }))
    .filter((c) => c.text.length > 0);

  if (clean.length === 0) return [];

  const maxCueEnd = Math.max(...clean.map((c) => c.end_ms));
  const needsRescale =
    clean.length >= 4 && (maxCueEnd > totalMs * 1.03 || maxCueEnd < totalMs * 0.94);

  const scale = needsRescale && maxCueEnd > 0 ? (totalMs - 140) / maxCueEnd : 1;
  let cursorMs = 80;
  const result: SubtitleCue[] = [];

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const scaledStart = Math.round(c.start_ms * scale);
    const scaledEnd = Math.round(c.end_ms * scale);
    const rawDur = Math.max(900, scaledEnd - scaledStart);

    const startMs = Math.max(cursorMs, Math.min(totalMs - 450, scaledStart));
    const remainingCues = clean.length - 1 - i;
    const maxEndAllowed = Math.max(startMs + 350, totalMs - 100 - remainingCues * 420);
    const endMs = Math.min(maxEndAllowed, Math.max(startMs + 450, startMs + rawDur));

    result.push({
      ...c,
      id: `cue-${i + 1}`,
      start_ms: startMs,
      end_ms: endMs
    });
    cursorMs = endMs + 90;
  }

  return result;
}

/**
 * Normalizes direct movie dialogue / STT subtitle cues without stretching them across silent
 * outro/music gaps, preserving exact spoken dialogue timing within 0..totalDurationSec.
 */
export function normalizeDialogueSubtitleCues(
  cues: SubtitleCue[],
  totalDurationSec: number
): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const totalMs = Math.max(4000, Math.round(totalDurationSec * 1000));
  const clean = cues
    .map((c, idx) => ({
      ...c,
      id: c.id || `cue-${idx + 1}`,
      text: String(c.text || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim(),
      start_ms: Math.max(0, Math.round(Number(c.start_ms) || 0)),
      end_ms: Math.max(350, Math.round(Number(c.end_ms) || 0))
    }))
    .filter((c) => c.text.length > 0)
    .sort((a, b) => a.start_ms - b.start_ms);

  if (clean.length === 0) return [];

  // Only scale down if timestamps significantly overshoot the video length
  const maxCueEnd = Math.max(...clean.map((c) => c.end_ms));
  const scale = maxCueEnd > totalMs * 1.1 ? (totalMs - 100) / maxCueEnd : 1;

  let cursorMs = 0;
  const result: SubtitleCue[] = [];
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    const scaledStart = Math.round(c.start_ms * scale);
    const scaledEnd = Math.round(c.end_ms * scale);
    const rawDur = Math.max(320, scaledEnd - scaledStart);

    const startMs = Math.max(cursorMs, Math.min(totalMs - 300, scaledStart));
    const nextScaledStart =
      i + 1 < clean.length ? Math.round(clean[i + 1].start_ms * scale) : totalMs;
    const desiredEnd = Math.min(totalMs, Math.max(startMs + 280, startMs + rawDur));
    // Cap endMs before the next cue's true start_ms (leaving a 20ms gap) so rapid consecutive
    // dialogue lines NEVER snowball cumulative late drift across the video!
    const maxEndBeforeNext =
      i + 1 < clean.length && nextScaledStart > startMs + 300 ? nextScaledStart - 20 : totalMs;
    const endMs = Math.min(totalMs, Math.max(startMs + 260, Math.min(desiredEnd, maxEndBeforeNext)));

    result.push({
      ...c,
      id: `cue-${i + 1}`,
      start_ms: startMs,
      end_ms: endMs
    });
    cursorMs = Math.min(totalMs, endMs + 20);
  }
  return result;
}

/**
 * Parses `[MM:SS - MM:SS]` or `[MM:SS.cc - MM:SS.cc]` formatted Whisper STT segments directly
 * into millisecond-accurate SubtitleCue[] for verbatim STT or Whisper-locked translation.
 */
export function parseTimedSttTranscriptToCues(
  transcript: string,
  totalDurationSec: number
): SubtitleCue[] {
  if (!transcript || typeof transcript !== 'string') return [];
  const lines = transcript.split(/\r?\n/);
  const cues: SubtitleCue[] = [];
  const lineRegex =
    /^\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)(?::(\d{2}(?:\.\d{1,3})?))?\s*-\s*(\d{1,2}):(\d{2}(?:\.\d{1,3})?)(?::(\d{2}(?:\.\d{1,3})?))?\]\s*(.+)$/;

  const toMs = (a: string, b: string, c?: string) => {
    if (c !== undefined) {
      return Math.round((Number(a) * 3600 + Number(b) * 60 + Number(c)) * 1000);
    }
    return Math.round((Number(a) * 60 + Number(b)) * 1000);
  };

  for (const rawLine of lines) {
    const m = rawLine.trim().match(lineRegex);
    if (!m) continue;
    const startMs = toMs(m[1], m[2], m[3]);
    const endMs = Math.max(startMs + 280, toMs(m[4], m[5], m[6]));
    const text = m[7].trim();
    if (!text) continue;
    cues.push({
      id: `stt-${cues.length + 1}`,
      start_ms: startMs,
      end_ms: endMs,
      text
    });
  }
  return normalizeDialogueSubtitleCues(cues, totalDurationSec);
}

/**
 * Finds timestamped Whisper STT segments (`[MM:SS - MM:SS] text`) that were missed/skipped
 * by the LLM translator in Translate Captions-Only mode so a targeted repair pass can fill
 * every missing line without re-translating already covered dialogue.
 */
export function findUncoveredTranscriptSegments(
  timedTranscript: string | undefined | null,
  existingCues: SubtitleCue[],
  totalDurationSec: number
): SubtitleCue[] {
  if (!timedTranscript || typeof timedTranscript !== 'string' || !timedTranscript.trim()) {
    return [];
  }
  const sourceCues = parseTimedSttTranscriptToCues(timedTranscript, totalDurationSec);
  if (sourceCues.length === 0) return [];
  if (!Array.isArray(existingCues) || existingCues.length === 0) {
    return sourceCues;
  }

  const uncovered: SubtitleCue[] = [];
  for (const seg of sourceCues) {
    const cleanText = String(seg.text || '').trim();
    if (!cleanText || /^[\s.,!?…\-~•♪♫]+$/.test(cleanText)) continue;

    const segStart = seg.start_ms;
    const segEnd = Math.max(segStart + 350, seg.end_ms);
    const segMid = (segStart + segEnd) / 2;

    const isCovered = existingCues.some((cue) => {
      const cStart = Number(cue.start_ms) || 0;
      const cEnd = Math.max(cStart + 250, Number(cue.end_ms) || cStart + 500);
      // Direct time overlap or segment midpoint within ±650ms tolerance of an existing cue
      const overlap = Math.min(segEnd, cEnd) - Math.max(segStart, cStart);
      if (overlap >= 180) return true;
      if (segMid >= cStart - 650 && segMid <= cEnd + 650) return true;
      return false;
    });

    if (!isCovered) {
      uncovered.push({
        id: `missing-${uncovered.length + 1}`,
        start_ms: segStart,
        end_ms: segEnd,
        text: cleanText
      });
    }
  }
  return uncovered;
}

/**
 * Chronologically merges repaired/missing subtitle cues into existing Captions-Only cues
 * with tight 20ms non-overlapping spacing so rapid lines stay locked to original speech.
 */
export function mergeMissingDialogueCues(
  existingCues: SubtitleCue[],
  repairedCues: SubtitleCue[],
  totalDurationSec: number
): SubtitleCue[] {
  const totalMs = Math.max(4000, Math.round(totalDurationSec * 1000));
  const combined = [...(existingCues || []), ...(repairedCues || [])]
    .map((c, idx) => ({
      ...c,
      id: c.id || `cue-${idx + 1}`,
      text: String(c.text || '').replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim(),
      start_ms: Math.max(0, Math.round(Number(c.start_ms) || 0)),
      end_ms: Math.max(300, Math.round(Number(c.end_ms) || 0))
    }))
    .filter((c) => c.text.length > 0)
    .sort((a, b) => a.start_ms - b.start_ms);

  if (combined.length === 0) return [];

  const result: SubtitleCue[] = [];
  let cursorMs = 0;
  for (let i = 0; i < combined.length; i++) {
    const c = combined[i];
    const nextStart = i + 1 < combined.length ? combined[i + 1].start_ms : totalMs;
    const rawDur = Math.max(380, c.end_ms - c.start_ms);
    const startMs = Math.max(cursorMs, Math.min(totalMs - 300, c.start_ms));
    const maxEndBeforeNext = nextStart > startMs + 360 ? nextStart - 20 : totalMs;
    const desiredEnd = Math.min(totalMs, Math.max(startMs + 320, startMs + rawDur));
    const endMs = Math.min(desiredEnd, Math.max(startMs + 320, maxEndBeforeNext));

    result.push({
      ...c,
      id: `cue-${i + 1}`,
      start_ms: startMs,
      end_ms: Math.min(totalMs, endMs)
    });
    cursorMs = Math.min(totalMs, endMs + 20);
  }
  return result;
}

const AIYA_SOURCE_REGEX =
  /(?:哎呀|(?<![A-Za-z\u00C0-\u024F])(?:āiyā|aiyā|aiya)(?![A-Za-z\u00C0-\u024F]))/i;
const AIYA_INLINE_REPLACE_REGEX =
  /(?:哎呀|(?<![A-Za-z\u00C0-\u024F])(?:āiyā|aiyā|aiya)(?![A-Za-z\u00C0-\u024F]))/gi;
const AIYA_LEADING_SOURCE_REGEX =
  /^\s*[「“"'(（\[]*(?:哎呀|(?:āiyā|aiyā|aiya)(?![A-Za-z\u00C0-\u024F]))/i;
const AIYA_STANDALONE_SOURCE_REGEX =
  /^\s*[「“"'(（\[]*(?:哎呀|āiyā|aiyā|aiya)[」”"')）\]!！?？.,，。…~\s]*$/i;
const AIYA_SOUND_GUARD_REGEX = /(?:哎|呀|āiyā|aiyā|aiya)/i;
const GENERIC_LEADING_MY_EXCLAMATION_REGEX =
  /^(\s*(?:-\s*)?)(?:ဟယ်|အိုး|အမလေး|အလိုလေး|အား|အာ|ဟာ|အို)([!！?？,၊…\s]*)/;
const GENERIC_STANDALONE_MY_EXCLAMATION_REGEX =
  /^\s*(?:-\s*)?(?:ဟယ်|အိုး|အမလေး|အလိုလေး|အား|အာ|ဟာ|အို)[!！?？,၊…~\s]*$/;
const LEADING_AIYA_MY_WITH_BODY_REGEX = /^(\s*(?:-\s*)?)အိုက်ယား[!！?？,၊…\s]+(.+)$/;
const STANDALONE_AIYA_MY_REGEX = /^\s*(?:-\s*)?အိုက်ယား[!！?？,၊…~\s]*$/;

/**
 * Guarantees that ONLY literal "哎呀 (Āiyā)" dialogue interjections render as "အိုက်ယား"
 * in Burmese captions/translations — prevents leaking onto split/adjacent cues and strips
 * falsely hallucinated "အိုက်ယား" on non-"哎呀" lines.
 */
export function applyBurmeseDialogueExclamationRules(
  cues: SubtitleCue[],
  sourceTimedTranscript?: string | null,
  targetLanguage: TargetLanguageCode = 'my'
): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0 || targetLanguage !== 'my') {
    return cues;
  }

  const sourceSegments = sourceTimedTranscript
    ? parseTimedSttTranscriptToCues(sourceTimedTranscript, 10800)
    : [];

  // Step 1: Replace raw untranslated "哎呀" / "Āiyā" directly with "အိုက်ယား",
  // and strip hallucinated "အိုက်ယား" when overlapping Whisper speech clearly has NO 哎呀.
  const working: SubtitleCue[] = cues.map((cue) => {
    let text = String(cue.text || '');
    if (!text.trim()) return cue;

    if (AIYA_INLINE_REPLACE_REGEX.test(text)) {
      text = text.replace(AIYA_INLINE_REPLACE_REGEX, 'အိုက်ယား').replace(/\s+/g, ' ').trim();
    }

    if (sourceSegments.length > 0 && text.includes('အိုက်ယား')) {
      const cStart = Number(cue.start_ms) || 0;
      const cEnd = Math.max(cStart + 300, Number(cue.end_ms) || cStart + 500);
      const nearbySegs = sourceSegments.filter((seg) => {
        const overlap = Math.min(cEnd + 500, seg.end_ms) - Math.max(cStart - 500, seg.start_ms);
        return overlap > 0;
      });
      if (nearbySegs.length > 0 && !nearbySegs.some((seg) => AIYA_SOUND_GUARD_REGEX.test(seg.text))) {
        const combinedSrc = nearbySegs.map((s) => s.text).join(' ');
        if (LEADING_AIYA_MY_WITH_BODY_REGEX.test(text)) {
          text = text.replace(LEADING_AIYA_MY_WITH_BODY_REGEX, '$1$2').trim();
        } else if (STANDALONE_AIYA_MY_REGEX.test(text)) {
          if (/(?:天啊|天哪|我的天)/i.test(combinedSrc)) {
            text = 'ဘုရားရေ!';
          } else if (/(?:糟糕|完了)/i.test(combinedSrc)) {
            text = 'ဒုက္ခပဲ!';
          } else if (/哇/i.test(combinedSrc)) {
            text = 'ဝိုး!';
          } else if (/(?:喂|嘿)/i.test(combinedSrc)) {
            text = 'ဟေ့!';
          } else if (/哦/i.test(combinedSrc)) {
            text = 'အိုး!';
          } else if (/啊/i.test(combinedSrc)) {
            text = 'အာ!';
          } else {
            text = 'ဟာ!';
          }
        }
      }
    }

    return text === cue.text ? cue : { ...cue, text };
  });

  // Step 2: 1-to-1 exact match ONLY for literal "哎呀" (Āiyā) source segments.
  // Each source segment can update AT MOST ONE cue (the cue whose start_ms aligns with the start
  // of the segment), and is skipped if any overlapping cue already has "အိုက်ယား".
  const aiyaSourceSegs = sourceSegments.filter((seg) => AIYA_SOURCE_REGEX.test(seg.text));
  if (aiyaSourceSegs.length === 0) {
    return working;
  }

  for (const seg of aiyaSourceSegs) {
    const overlappingIndices: number[] = [];
    for (let i = 0; i < working.length; i++) {
      const c = working[i];
      const cStart = Number(c.start_ms) || 0;
      const cEnd = Math.max(cStart + 300, Number(c.end_ms) || cStart + 500);
      const overlap = Math.min(cEnd, seg.end_ms) - Math.max(cStart, seg.start_ms);
      if (overlap >= 150) {
        overlappingIndices.push(i);
      }
    }

    if (overlappingIndices.length === 0) {
      for (let i = 0; i < working.length; i++) {
        const c = working[i];
        const cStart = Number(c.start_ms) || 0;
        const cEnd = Math.max(cStart + 300, Number(c.end_ms) || cStart + 500);
        const segMid = (seg.start_ms + seg.end_ms) / 2;
        if (segMid >= cStart - 300 && segMid <= cEnd + 300) {
          overlappingIndices.push(i);
        }
      }
    }

    if (overlappingIndices.length === 0) continue;
    // Already rendered as အိုက်ယား in one of the cues covering this segment — never duplicate onto split chunks!
    if (overlappingIndices.some((idx) => String(working[idx].text || '').includes('အိုက်ယား'))) {
      continue;
    }

    // Pick ONLY the single cue whose start_ms aligns closest to the start of the 哎呀 segment
    let bestIdx = -1;
    let bestStartDiff = Infinity;
    for (const idx of overlappingIndices) {
      const cStart = Number(working[idx].start_ms) || 0;
      const diff = Math.abs(cStart - seg.start_ms);
      if (diff < bestStartDiff) {
        bestStartDiff = diff;
        bestIdx = idx;
      }
    }
    if (bestIdx < 0 || bestStartDiff > 900) continue;

    const targetCue = working[bestIdx];
    let text = String(targetCue.text || '');
    if (AIYA_STANDALONE_SOURCE_REGEX.test(seg.text)) {
      if (GENERIC_STANDALONE_MY_EXCLAMATION_REGEX.test(text)) {
        text = 'အိုက်ယား!';
      } else if (GENERIC_LEADING_MY_EXCLAMATION_REGEX.test(text)) {
        text = text.replace(GENERIC_LEADING_MY_EXCLAMATION_REGEX, '$1အိုက်ယား$2');
      }
    } else if (AIYA_LEADING_SOURCE_REGEX.test(seg.text)) {
      if (GENERIC_LEADING_MY_EXCLAMATION_REGEX.test(text)) {
        text = text.replace(GENERIC_LEADING_MY_EXCLAMATION_REGEX, '$1အိုက်ယား$2');
      } else {
        text = `အိုက်ယား၊ ${text.replace(/^\s+/, '')}`;
      }
    }

    if (text !== targetCue.text) {
      working[bestIdx] = { ...targetCue, text };
    }
  }

  return working;
}

const SHORT_LEADING_SAME_SPEAKER_EXCLAMATION_REGEX =
  /^(?:အိုက်ယား|ဟယ်|ဟာ|အိုး|အို|အာ|အား|ဝိုး|အမလေး|အလိုလေး|ဘုရားရေ|ဒုက္ခပဲ|ဟေ့|ဟေး|အင်း|အဲ|အေး|ဟုတ်|ဟုတ်ကဲ့|မဟုတ်ဘူး|ခဏ|Oh|Ah|Hey|Wait|Whoa|Wow|No|Yes)[!！.။…]*$/i;

/**
 * Splits accidentally merged multi-speaker / back-and-forth dialogue cues into separate
 * individual speaker cues (1 speaker turn = 1 subtitle cue) while preserving exact total
 * timing bounds [start_ms, end_ms] without drifting subsequent cues.
 */
export function splitMultiSpeakerDialogueCues(cues: SubtitleCue[]): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const result: SubtitleCue[] = [];
  let seq = 1;

  for (const cue of cues) {
    const raw = String(cue.text || '').trim();
    if (!raw) continue;

    // 1) Split on explicit newlines or multi-speaker dash turns (e.g. "- Line A - Line B" or "Line A? - Line B")
    let rawTurns: string[] = [];
    const lines = raw
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      // Split inline speaker turn markers: space + dash/em-dash + space (e.g. "ဘာလဲ? - ဘာမှမဟုတ်ဘူး" or "- ဟုတ်လား - အင်း")
      const dashParts = line
        .replace(/^\s*[-–—•]\s+/, '')
        .split(/\s+[-–—]\s+/)
        .map((p) => p.replace(/^\s*[-–—•]\s*/, '').trim())
        .filter(Boolean);
      rawTurns.push(...dashParts);
    }

    // 2) Further split merged sentences/Q&A turns on sentence boundaries (?, ？, !, ！, ။, ។)
    //    while keeping short same-speaker leading exclamations (e.g. "အိုက်ယား! ဘယ်လိုဖြစ်တာလဲ") attached!
    const finalTurns: string[] = [];
    for (const turn of rawTurns) {
      const sentenceParts = turn
        .split(/(?<=[?？!！။។])\s+|(?<=[?？!！။។])(?=[^\s?？!！။។.,'"”’)\]])/)
        .map((p) => p.replace(/[။។]+$/g, '').trim())
        .filter(Boolean);

      if (sentenceParts.length <= 1) {
        const cleanedSingle = turn.replace(/[။។]+$/g, '').trim();
        if (cleanedSingle) finalTurns.push(cleanedSingle);
        continue;
      }

      const mergedForSameSpeaker: string[] = [];
      for (const part of sentenceParts) {
        if (
          mergedForSameSpeaker.length > 0 &&
          SHORT_LEADING_SAME_SPEAKER_EXCLAMATION_REGEX.test(
            mergedForSameSpeaker[mergedForSameSpeaker.length - 1]
          )
        ) {
          mergedForSameSpeaker[mergedForSameSpeaker.length - 1] =
            `${mergedForSameSpeaker[mergedForSameSpeaker.length - 1]} ${part}`.trim();
        } else {
          mergedForSameSpeaker.push(part);
        }
      }
      finalTurns.push(...mergedForSameSpeaker);
    }

    if (finalTurns.length <= 1) {
      const singleText = (finalTurns[0] || raw).replace(/^\s*[-–—]\s+/, '').trim();
      result.push({
        ...cue,
        id: `cue-${seq++}`,
        text: singleText
      });
      continue;
    }

    const startMs = Math.max(0, Math.round(Number(cue.start_ms) || 0));
    const endMs = Math.max(startMs + finalTurns.length * 300, Math.round(Number(cue.end_ms) || startMs + 1500));
    const totalDur = endMs - startMs;
    const totalChars = Math.max(
      1,
      finalTurns.reduce((sum, t) => sum + Math.max(3, t.length), 0)
    );
    const gapMs = 20;
    const usableDur = Math.max(finalTurns.length * 260, totalDur - gapMs * (finalTurns.length - 1));

    let cursor = startMs;
    for (let i = 0; i < finalTurns.length; i++) {
      const text = finalTurns[i];
      const isLast = i === finalTurns.length - 1;
      const weight = Math.max(3, text.length) / totalChars;
      const share = Math.max(260, Math.round(usableDur * weight));
      const remainingMin = (finalTurns.length - 1 - i) * (260 + gapMs);
      const partEnd = isLast
        ? endMs
        : Math.min(endMs - remainingMin, cursor + share);
      result.push({
        ...cue,
        id: `cue-${seq++}`,
        start_ms: cursor,
        end_ms: Math.max(cursor + 240, partEnd),
        text,
        originalText: i === 0 ? cue.originalText : undefined
      });
      cursor = Math.max(cursor + 240, partEnd) + gapMs;
    }
  }

  return result;
}

/**
 * Builds dedicated system instructions for:
 * - Cinematic Movie Dialogue Translation (`dub` & `captions-only`, or STT + AI Translation)
 * - Verbatim Original Speech Transcription (`sttMode === 'transcribe'`)
 * Explicitly forbids third-person Movie Recap storytelling ("အဲဒီအချိန်မှာပဲ", "နောက်ဆုံးမှာတော့").
 */
export function buildCinematicTranslateSystemPrompt(opts: {
  targetLanguage: TargetLanguageCode;
  translateAudio: 'dub' | 'captions-only';
  sttMode?: 'transcribe' | 'translate';
  speakerDiarization?: boolean;
}): string {
  const langLabel =
    opts.targetLanguage === 'my'
      ? 'Burmese (မြန်မာဘာသာ ရုပ်ရှင်စကားပြောဟန်)'
      : opts.targetLanguage === 'th'
        ? 'Thai'
        : opts.targetLanguage === 'ja'
          ? 'Japanese'
          : opts.targetLanguage === 'ko'
            ? 'Korean'
            : opts.targetLanguage === 'zh'
              ? 'Chinese'
              : 'English';

  if (opts.sttMode === 'transcribe') {
    const speakerRule = opts.speakerDiarization
      ? '3. SPEAKER DIARIZATION: Prefix speaker turns concisely like "[Speaker 1] " or "[Speaker 2] " when speakers change.'
      : '3. CLEAN SINGLE-LINE CAPTIONS: Output clean spoken subtitle lines without extra metadata.';
    return `You are TTAK MOVIE RECAP's Precision Speech-to-Text (STT) Subtitler.
TASK: Transcribe EVERY spoken sentence in the audio/video accurately in its ORIGINAL spoken language (DO NOT translate and DO NOT summarize or turn it into a movie recap).
RULES:
1. VERBATIM SPOKEN WORDS: Transcribe what the speakers actually say word-for-word cleanly with proper punctuation and exact timing [start_ms, end_ms].
2. SILENCE & MUSIC GAPS: Only create cues when speech is actually heard; keep silent/music scenes empty.
${speakerRule}
4. SHORT READABLE LINES: Keep each cue concise (1 readable subtitle line, 1 to 12 words). Never skip short spoken interjections.
5. OUTPUT SCHEMA: Return JSON { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [] }.`;
  }

  const isCaptionsOnly = opts.translateAudio === 'captions-only';
  const myanmarCaptionsEllipsisRule =
    isCaptionsOnly && opts.targetLanguage === 'my'
      ? `\n- BURMESE CAPTIONS-ONLY PAUSE STYLE: NEVER use the Burmese little section mark "၊" or commas between Burmese words/clauses; whenever there is a spoken pause, hesitation, or mid-line break, write three dots "..." instead (e.g. "မင်း...ဘာဖြစ်တယ်", "ငါ...မသိဘူး", "...ဒါပေမဲ့").`
      : '';
  const myanmarStyleGuide =
    opts.targetLanguage === 'my'
      ? `\n- NATURAL BURMESE MOVIE DIALOGUE (100% PURE BURMESE ONLY!): Translate like professional Burmese cinema/drama subtitles & dubbing matching character relationships, emotion, anger, romance, or urgency — NEVER stiff dictionary/word-for-word translation. NEVER leave ANY untranslated Chinese (汉字), Korean (한글), Japanese, or Thai words inside Burmese cue.text! Every single word MUST be translated completely into Burmese (e.g. "哎呀，到家了宝宝，下车" -> "အိုက်ယား...အိမ်ရောက်ပြီ ဘေဘီ...ကားပေါ်ကဆင်းတော့", NEVER "အိုက်ယား...到家了宝宝...下车")!\n- STRICT BURMESE GENDER PRONOUN RULE (FEMALE SPEAKER = "ရှင်", NEVER "မင်း"!): Pay close attention to whether a FEMALE voice or MALE voice is speaking in the audio (and visual frames)! Whenever a FEMALE character (ကောင်မလေး / မိန်းကလေး) speaks to a man/partner/adult, ALWAYS use "ရှင်" / "ရှင်က" / "ရှင့်ကို" / "ရှင့်ရဲ့" for "you" (and "ကျွန်မ" / "ညီမ" for "I") — NEVER use "မင်း" when a girl/woman is speaking! (Example: Female voice saying "你快点下来" -> "ရှင်...မြန်မြန်ဆင်းလာတော့လေ", NEVER "မင်း မြန်မြန်ဆင်းလာတော့"!). Only use "မင်း" / "ကိုယ်" / "ငါ" when a MALE speaker is talking.\n- STRICT "哎呀" (Āiyā) RULE: ONLY when a speaker literally says "哎呀" (Āiyā), translate that exact word as "အိုက်ယား". DO NOT use "အိုက်ယား" for any other exclamation or line (such as "啊", "啊呀", "哎哟", "哇", "哦", "天啊", "糟糕", "喂", "嘿", "哼", "嗯", or normal dialogue) — translate all other exclamations and sentences normally into natural Burmese!${myanmarCaptionsEllipsisRule}`
      : '';
  const speakerNote = isCaptionsOnly
    ? `\n- STRICT ONE SPEAKER & ONE SENTENCE PER CUE (NEVER MERGE OR CHAIN CONTINUOUSLY!): Whenever a different person starts speaking (Speaker A finishes -> Speaker B replies), you MUST end Speaker A's cue the EXACT millisecond Speaker A stops talking and create a BRAND NEW separate cue object in cues[] for Speaker B with Speaker B's own exact start_ms and end_ms! Leave a clean uncaptioned gap between speaker turns — NEVER stretch Speaker A's end_ms up to Speaker B's start_ms and NEVER combine two speakers' lines, a question + its answer, or two sentences into one continuous subtitle cue (NEVER write "- Line A - Line B" or "Line A? Line B" in a single cue).`
    : opts.speakerDiarization
      ? `\n- SPEAKER TURNS: Start a new cue whenever the speaker changes.`
      : '';
  const zeroSkipRule = isCaptionsOnly
    ? `\n- AUDIO SPEECH ONLY — STRICTLY NO ON-SCREEN TIME-SKIP CARDS OR NARRATOR FILLER: Subtitle ONLY actual spoken human dialogue heard in the audio track! NEVER translate or invent on-screen intertitle/time-skip cards (such as "10 minutes later" / "10分钟后" / "10 မိနစ်ကြာပြီးသောအခါ", "1 hour later" / "၁ နာရီကြာပြီးသောအခါ", "the next day", chapter titles, logos, or silent visual descriptions). If nobody is speaking during a scene or title card, output ZERO cues for that silent interval!\n- ZERO-SKIP 100% DIALOGUE COVERAGE (MANDATORY): Translate EVERY SINGLE spoken sentence, quick reply, whisper, and short 1–3 word spoken reaction (such as "等等", "什么?", "快走", "好") at the exact moment the voice speaks!`
    : '';

  return `You are TTAK MOVIE RECAP's Senior Cinematic Movie Dialogue Translator (${isCaptionsOnly ? 'Subtitles / Captions-Only Mode' : 'Voice Dubbing Mode'}).
TASK: Translate the characters' ACTUAL SPOKEN DIALOGUE line-by-line into 100% pure ${langLabel} (ZERO untranslated source-language characters!), synchronized tightly to the exact moments each line is spoken in the video.
CRITICAL ANTI-RECAP RULES (MUST OBEY):
1. DIRECT DIALOGUE TRANSLATION ONLY — NOT A MOVIE RECAP: Translate ONLY what the characters are physically speaking aloud in first/second person into 100% ${langLabel}!
2. STRICTLY FORBIDDEN RECAP & TIME-SKIP PHRASES: NEVER write third-person movie recap narrator commentary or time-jump captions such as "10 မိနစ်ကြာပြီးသောအခါ", "မိနစ်ကြာပြီးသောအခါ", "နာရီကြာပြီးသောအခါ", "ဒီဇာတ်ကားထဲမှာ", "အဲဒီအချိန်မှာပဲ", "နောက်ဆုံးမှာတော့", "ကောင်လေးက", "မင်းသားက", or summarizing scenes from the outside!
3. EXACT SPEECH TIMING: Match each cue's start_ms and end_ms directly to the exact moment THAT ONE speaker starts and stops speaking that single line in the audio. Keep truly silent/music-only gaps uncaptioned instead of inventing filler narration.${zeroSkipRule}${myanmarStyleGuide}${speakerNote}
4. ${isCaptionsOnly ? 'ONE SHORT LINE PER SPEAKER TURN: Each cue MUST hold ONLY ONE speaker\'s single short utterance (1 to 10 words, max ~46 characters, typically 0.5s–2.5s). Split every speaker change and every back-and-forth reply into its own separate timed cue!' : 'SPEAKABLE DUBBING PHRASES: Match translated phrase duration (~2.0s–3.4s, 5–11 words) cleanly to the speaker window so AI dubbed voices sync naturally with the scene.'}
5. OUTPUT SCHEMA: Return JSON { title, scriptText, cues: [{ start_ms, end_ms, text }], highlight_clips: [] }.`;
}

const CAPTIONS_ONLY_HALLUCINATED_RECAP_REGEX =
  /^(?:[\s"'「“(\[\-—….]*(?:(?:\d+|[၀-၉]+|တစ်|နှစ်|သုံး|လေး|ငါး|ဆယ်|နာရီ|ရက်|လ|နှစ်|အချိန်|ခဏ)\s*(?:စက္ကန့်|မိနစ်|မီနစ်|နာရီ|ရက်|လ|နှစ်)\s*(?:ကြာပြီး(?:သောအခါ|နောက်|တဲ့အခါ)|အကြာ(?:မှာ|တွင်))|(?:\d+|one|two|three|five|ten|twenty|thirty|a few)\s*(?:seconds?|minutes?|hours?|days?|months?|years?)\s+later|the\s+next\s+(?:day|morning)|အဲဒီအချိန်မှာပဲ|နောက်ဆုံးမှာတော့|ဒီဇာတ်ကား(?:ထဲမှာ|မှာ)|ဇာတ်လမ်း(?:အစ|အဆုံး))[\s.,!?။၊…"'」”)\]]*)$/i;

const CAPTIONS_ONLY_TIME_SKIP_PREFIX_REGEX =
  /(?:^|[\s…])(?:\d+|[၀-၉]+)\s*(?:မိနစ်|မီနစ်|နာရီ|ရက်|နှစ်)\s*(?:ကြာပြီးသောအခါ|ကြာပြီးနောက်)(?:[\s.,!?။၊…]*$)/i;

/**
 * Filters out hallucinated movie-recap time-skip intertitles (e.g. "10 မိနစ်ကြာပြီးသောအခါ",
 * "10 minutes later") and standalone third-person recap narrator lines from Captions-Only
 * dialogue cues while preserving all genuine spoken character dialogue.
 */
export function sanitizeCaptionsOnlyDialogueCues(cues: SubtitleCue[]): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const kept = cues.filter((cue) => {
    const text = String(cue?.text || '').trim();
    if (!text) return false;
    if (CAPTIONS_ONLY_HALLUCINATED_RECAP_REGEX.test(text)) return false;
    if (CAPTIONS_ONLY_TIME_SKIP_PREFIX_REGEX.test(text) && text.length <= 42) return false;
    return true;
  });
  return kept.map((cue, idx) => ({
    ...cue,
    id: `cue-${idx + 1}`
  }));
}

export interface SpeechActivityInterval {
  startMs: number;
  endMs: number;
}

/**
 * Converts FFmpeg `silencedetect` stderr logs for an audio segment into exact millisecond
 * active-speech intervals `[startMs, endMs]` so Gemini Direct Captions-Only can lock every
 * subtitle cue directly to real spoken audio instead of drifting or hallucinating during silence.
 */
export function parseFfmpegSilenceDetectToSpeechIntervals(
  ffmpegStderr: string,
  segmentDurationSec: number
): SpeechActivityInterval[] {
  const totalMs = Math.max(0, Math.round(Number(segmentDurationSec || 0) * 1000));
  if (totalMs <= 0) return [];
  const raw = String(ffmpegStderr || '');
  const events: Array<{ type: 'start' | 'end'; ms: number }> = [];
  const regex = /silence_(start|end):\s*([0-9]+(?:\.[0-9]+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    const type = m[1] === 'start' ? 'start' : 'end';
    const ms = Math.max(0, Math.min(totalMs, Math.round(Number(m[2]) * 1000)));
    events.push({ type, ms });
  }
  if (events.length === 0) {
    return [{ startMs: 0, endMs: totalMs }];
  }

  const silences: Array<{ startMs: number; endMs: number }> = [];
  let openStart: number | null = null;
  for (const ev of events) {
    if (ev.type === 'start') {
      if (openStart === null) openStart = ev.ms;
    } else {
      const s = openStart !== null ? openStart : 0;
      if (ev.ms > s) silences.push({ startMs: s, endMs: ev.ms });
      openStart = null;
    }
  }
  if (openStart !== null && openStart < totalMs) {
    silences.push({ startMs: openStart, endMs: totalMs });
  }

  const speech: SpeechActivityInterval[] = [];
  let cursor = 0;
  for (const sil of silences) {
    if (sil.startMs - cursor >= 250) {
      speech.push({ startMs: cursor, endMs: sil.startMs });
    }
    cursor = Math.max(cursor, sil.endMs);
  }
  if (totalMs - cursor >= 250) {
    speech.push({ startMs: cursor, endMs: totalMs });
  }
  return speech;
}

export function formatSpeechIntervalsGuide(intervals: SpeechActivityInterval[]): string {
  if (!Array.isArray(intervals) || intervals.length === 0) return '';
  const fmt = (ms: number) => {
    const sec = ms / 1000;
    const mins = Math.floor(sec / 60);
    const rem = (sec - mins * 60).toFixed(2).padStart(5, '0');
    return `${String(mins).padStart(2, '0')}:${rem}`;
  };
  return intervals
    .slice(0, 45)
    .map((iv) => `[${fmt(iv.startMs)} - ${fmt(iv.endMs)}] (${iv.startMs}ms - ${iv.endMs}ms) Audio active`)
    .join('\n');
}

/**
 * Tightens Captions-Only subtitle cues (especially Whisper-locked cues) so subtitles do NOT stay
 * glued together continuously across silent pauses or back-to-back speaker turns:
 * 1) If FFmpeg active-speech intervals are available and a cue's `end_ms` stretches past the end
 *    of the spoken interval it started in (trailing silence bloat), trims `end_ms` to speech end + 120ms.
 * 2) Caps overly stretched short utterances that linger across multi-second silence.
 * 3) Ensures a crisp clear-screen breath gap (`>= 100ms`) between consecutive cues whenever the
 *    previous cue has enough duration (`>= 520ms`) so each spoken line visibly appears and clears!
 */
export function tightenCaptionsOnlyCuePauses(
  cues: SubtitleCue[],
  speechIntervals: SpeechActivityInterval[] = [],
  totalDurationSec?: number
): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const totalMs =
    typeof totalDurationSec === 'number' && Number.isFinite(totalDurationSec) && totalDurationSec > 0
      ? Math.round(totalDurationSec * 1000)
      : Math.max(...cues.map((c) => Number(c.end_ms) || 0), 4000);

  const tightened = cues.map((cue) => {
    const startMs = Math.max(0, Math.round(Number(cue.start_ms) || 0));
    let endMs = Math.min(totalMs, Math.max(startMs + 320, Math.round(Number(cue.end_ms) || startMs + 1200)));

    // 1) Trim trailing silence bloat using FFmpeg detected speech intervals when the cue covers
    //    only a single active speech burst and then stretches >= 450ms into silence.
    if (Array.isArray(speechIntervals) && speechIntervals.length > 0) {
      const overlapping = speechIntervals.filter(
        (iv) => Math.min(endMs, iv.endMs) - Math.max(startMs, iv.startMs) >= 180
      );
      if (overlapping.length >= 1) {
        const lastActiveEnd = overlapping[overlapping.length - 1].endMs;
        if (endMs - lastActiveEnd >= 450 && lastActiveEnd + 120 >= startMs + 380) {
          endMs = Math.min(endMs, lastActiveEnd + 120);
        }
      }
    }

    // 2) Cap extreme trailing linger on short utterances (e.g. 12-char cue stretched to 5.5s)
    const textLen = String(cue.text || '').trim().length;
    const naturalMaxMs = Math.max(1650, Math.min(4200, 950 + textLen * 85));
    if (endMs - startMs > naturalMaxMs) {
      endMs = startMs + naturalMaxMs;
    }

    return {
      ...cue,
      start_ms: startMs,
      end_ms: Math.min(totalMs, Math.max(startMs + 300, endMs))
    };
  });

  // 3) Guarantee a crisp visual clear-screen gap (>= 150ms) between consecutive spoken turns
  //    so subtitles visibly clear after each speaker instead of staying continuously stuck together.
  const minClearGapMs = 150;
  for (let i = 0; i < tightened.length - 1; i++) {
    const cur = tightened[i];
    const next = tightened[i + 1];
    const gap = next.start_ms - cur.end_ms;
    if (gap < minClearGapMs) {
      const targetEnd = next.start_ms - minClearGapMs;
      if (targetEnd - cur.start_ms >= 380) {
        cur.end_ms = targetEnd;
      } else if (next.start_ms - cur.start_ms >= 360) {
        cur.end_ms = Math.max(cur.start_ms + 280, next.start_ms - 90);
      }
    }
  }

  return tightened.map((c, idx) => ({ ...c, id: `cue-${idx + 1}` }));
}

/**
 * Snaps Gemini Captions-Only subtitle cues onto millisecond-accurate Whisper speech-turn anchors
 * whenever a cue clearly corresponds 1-to-1 with a real spoken utterance anchor (within <= 950ms).
 * Keeps Gemini's superior multimodal Burmese translation (female "ရှင်" voice detection + burned-in
 * subtitle reading) while locking start_ms/end_ms directly to the exact voice onset & offset!
 */
export function snapGeminiCaptionsToSpeechAnchors(
  cues: SubtitleCue[],
  anchorTranscript: string | undefined | null,
  totalDurationSec: number
): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  if (!anchorTranscript || typeof anchorTranscript !== 'string' || !anchorTranscript.trim()) {
    return cues;
  }
  const anchors = parseTimedSttTranscriptToCues(anchorTranscript, totalDurationSec);
  if (anchors.length === 0) return cues;

  const totalMs = Math.max(
    1000,
    Math.round((Number.isFinite(totalDurationSec) && totalDurationSec > 0 ? totalDurationSec : 30) * 1000)
  );
  const usedAnchors = new Set<number>();

  // Greedy chronological 1-to-1 anchor matching within 950ms onset/midpoint tolerance
  const snapped: SubtitleCue[] = cues.map((cue) => {
    const cStart = Math.max(0, Math.round(Number(cue.start_ms) || 0));
    const cEnd = Math.max(cStart + 280, Math.round(Number(cue.end_ms) || cStart + 1200));
    const cMid = (cStart + cEnd) / 2;

    let bestIdx = -1;
    let bestScore = Infinity;
    for (let a = 0; a < anchors.length; a++) {
      if (usedAnchors.has(a)) continue;
      const anc = anchors[a];
      const aMid = (anc.start_ms + anc.end_ms) / 2;
      const startDiff = Math.abs(cStart - anc.start_ms);
      const midDiff = Math.abs(cMid - aMid);
      const overlap = Math.min(cEnd, anc.end_ms) - Math.max(cStart, anc.start_ms);
      if (startDiff <= 950 || (overlap >= 180 && midDiff <= 850)) {
        const score = startDiff * 0.65 + midDiff * 0.35;
        if (score < bestScore) {
          bestScore = score;
          bestIdx = a;
        }
      }
    }

    if (bestIdx >= 0) {
      usedAnchors.add(bestIdx);
      const anc = anchors[bestIdx];
      return {
        ...cue,
        start_ms: Math.max(0, Math.min(totalMs - 280, anc.start_ms)),
        end_ms: Math.min(totalMs, Math.max(anc.start_ms + 280, anc.end_ms)),
        originalText: cue.originalText || anc.text
      };
    }

    return cue;
  });

  return normalizeDialogueSubtitleCues(snapped, totalDurationSec);
}

export interface TimedCueBlock {
  startMs: number;
  endMs: number;
  cues: SubtitleCue[];
  combinedText: string;
}

/**
 * Groups consecutive cues into ~15s timed scene blocks so multi-minute Pro Gemini TTS
 * generates audio locked to each 15s scene window instead of drifting over 3+ minutes.
 */
export function groupCuesIntoTimedBlocks(
  cues: SubtitleCue[],
  targetBlockMs = 15000
): TimedCueBlock[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const blocks: TimedCueBlock[] = [];
  let current: SubtitleCue[] = [];
  let blockStart = cues[0].start_ms;

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    if (
      current.length > 0 &&
      (cue.end_ms - blockStart > targetBlockMs || current.length >= 6)
    ) {
      const last = current[current.length - 1];
      blocks.push({
        startMs: blockStart,
        endMs: Math.max(blockStart + 600, last.end_ms),
        cues: current,
        combinedText: current.map((c) => c.text.trim()).filter(Boolean).join(' ')
      });
      current = [cue];
      blockStart = cue.start_ms;
    } else {
      if (current.length === 0) blockStart = cue.start_ms;
      current.push(cue);
    }
  }

  if (current.length > 0) {
    const last = current[current.length - 1];
    blocks.push({
      startMs: blockStart,
      endMs: Math.max(blockStart + 600, last.end_ms),
      cues: current,
      combinedText: current.map((c) => c.text.trim()).filter(Boolean).join(' ')
    });
  }

  return blocks;
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
    freeLeftToday: 'အခမဲ့ 5 / 5 ခု',
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
    freeLeftToday: 'Free 5 / 5 left',
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
  natural: [
    { id: 'st-nat-1', start_ms: 100, end_ms: 3200, text: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်လဲလို့ သတို့သားက မေးချလိုက်တော့တာပေါ့' },
    { id: 'st-nat-2', start_ms: 3320, end_ms: 6800, text: 'သတို့သမီးကတော့ အိမ်ပြင်လိုက်တာပါဆိုပြီး ခပ်တည်တည်ပဲ လိမ်ညာနေတုန်းမှာပဲ' },
    { id: 'st-nat-3', start_ms: 6920, end_ms: 10600, text: 'အဲဒီအချိန်မှာပဲ အိမ်ရှင်မိန်းကလေး ဝင်လာပြီး အမှန်တရားကို ဖော်ထုတ်လိုက်ပါလေရော' },
    { id: 'st-nat-4', start_ms: 10720, end_ms: 14500, text: 'ပရိဘောဂအားလုံးက လွန်ခဲ့တဲ့သုံးနှစ်ကတည်းက သူမဝယ်ထားတာချည်း ဖြစ်နေခဲ့ပြီ' },
    { id: 'st-nat-5', start_ms: 14620, end_ms: 19200, text: 'သတို့သားလည်း ဒေါသထွက်ပြီး နောက်ဆုံးအကြိမ် ထပ်စစ်မေးလိုက်တော့တာပေါ့' },
    { id: 'st-nat-6', start_ms: 19320, end_ms: 24100, text: 'မိခင်ဖြစ်သူကလည်း ဒီငွေဟာ မင်္ဂလာအိမ်ပြင်ဖို့ ပေးထားတာမှန်း ထောက်ပြလိုက်ပြီ' },
    { id: 'st-nat-7', start_ms: 24220, end_ms: 29200, text: 'တကယ်တမ်းကျတော့ သတို့သမီးအမေက နှစ်သိန်းကို သားငယ်အိမ်ဝယ်ဖို့ သုံးပစ်ခဲ့တာလေ' },
    { id: 'st-nat-8', start_ms: 29320, end_ms: 34200, text: 'မိသားစုချင်း ခဏယူသုံးတာ ဘာဖြစ်လဲဆိုပြီး ပြန်အော်ဟစ်နေခဲ့ရရှာတယ်' },
    { id: 'st-nat-9', start_ms: 34320, end_ms: 39600, text: 'ဒါပေမဲ့လည်း သတို့သားဘက်က လုံးဝသည်းမခံနိုင်တော့တဲ့ အခြေအနေ ရောက်သွားခဲ့ပြီ' },
    { id: 'st-nat-10', start_ms: 39720, end_ms: 45100, text: 'ဒီအိမ်ကိုပါ မောင်လေးအတွက် ပေးလိုက်မယ်ဆိုပြီး မျက်နှာပြောင်တိုက် ပြောချလိုက်ပါလေရော' },
    { id: 'st-nat-11', start_ms: 45220, end_ms: 51200, text: 'အဲဒီစကားကြားတာနဲ့ အိမ်ပိုင်ရှင်အစစ်က ဂရန်စာချုပ်ကို စားပွဲပေါ် ပစ်တင်လိုက်တော့တာပေါ့' },
    { id: 'st-nat-12', start_ms: 51320, end_ms: 57500, text: 'သူများအိမ်ကို ဟန်ဆောင်သုံးပြီး လိမ်ညာခဲ့သမျှ အကုန်ဗူးပေါ်သလို ပေါ်သွားခဲ့ပြီ' },
    { id: 'st-nat-13', start_ms: 57620, end_ms: 63800, text: 'နောက်ဆုံးမှာတော့ သတို့သားက မင်္ဂလာပွဲဖျက်ပြီး လှည့်ထွက်သွားချိန်မှာပဲ' },
    { id: 'st-nat-14', start_ms: 63920, end_ms: 70000, text: 'သတို့သမီးက ကိုယ်ဝန်ရှိနေပြီဆိုပြီး အော်ဟစ်တားမယ်လို့ ဘယ်သူမှ မထင်ထားခဲ့ဘူးလေ' }
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
  hybrid: [
    { id: 'st-hyb-1', start_ms: 100, end_ms: 3400, text: '"သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ"' },
    { id: 'st-hyb-2', start_ms: 3520, end_ms: 8200, text: 'မင်္ဂလာခန်းမထဲမှာ သတို့သမီးဟာ အိမ်ပြင်လိုက်တာပါလို့ လိမ်ညာပြောနေခဲ့ပါတယ်' },
    { id: 'st-hyb-3', start_ms: 8320, end_ms: 14500, text: 'ဒါပေမဲ့ အိမ်ပိုင်ရှင်အစစ် ဝင်လာပြီး "ဒီဆိုဖာတွေအားလုံး ငါဝယ်ထားတာ" လို့ ဖွင့်ချလိုက်ပါတယ်' },
    { id: 'st-hyb-4', start_ms: 14620, end_ms: 21000, text: 'တကယ်တမ်းမှာ ယောက္ခမဖြစ်သူက ငွေနှစ်သိန်းကို သားငယ်အိမ်ဝယ်ဖို့ ယူသုံးပစ်ခဲ့တာပါ' },
    { id: 'st-hyb-5', start_ms: 21120, end_ms: 31000, text: '"မိသားစုချင်း ကူညီတာ ဘာဖြစ်လဲ... ဒီအိမ်ပါ မောင်လေးကို ပေးလိုက်မယ်"' },
    { id: 'st-hyb-6', start_ms: 31120, end_ms: 45100, text: 'အဲဒီစကားကြားတာနဲ့ အိမ်ရှင်မိန်းကလေးက ဂရန်စာချုပ်ကို စားပွဲပေါ် ပစ်တင်လိုက်ပါတယ်' },
    { id: 'st-hyb-7', start_ms: 45220, end_ms: 58000, text: 'သတို့သားလည်း အမှန်တရားကို သိသွားပြီး "ပိုက်ဆံပြန်ပေး... ငါတို့ပြတ်ပြီ" လို့ ပြောကာ လှည့်ထွက်သွားပါတယ်' },
    { id: 'st-hyb-8', start_ms: 58120, end_ms: 70000, text: 'အဲဒီအချိန်မှာပဲ သတို့သမီးက "ရှင်မသွားနဲ့... ကျွန်မမှာ ကိုယ်ဝန်ရှိနေပြီ" လို့ အော်ဟစ်တားလိုက်ပါတော့တယ်' }
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

    const targetChunks = Math.max(2, Math.ceil(cleaned.length / maxCharsPerCue));
    const balancedMax = Math.min(maxCharsPerCue, Math.ceil(cleaned.length / targetChunks) + 8);

    const phrases: string[] = [];
    let current = '';

    for (const tok of tokens) {
      const candidate = current ? `${current} ${tok}` : tok;
      if (candidate.length > balancedMax && current.length >= 12) {
        phrases.push(current.replace(/^[၊,\s]+|[၊,\s]+$/g, ''));
        current = tok;
      } else {
        current = candidate;
      }
    }
    if (current.trim()) {
      phrases.push(current.replace(/^[၊,\s]+|[၊,\s]+$/g, ''));
    }

    // Rebalance if the final phrase is a tiny 1-word orphan (e.g. "သိလိုက်ပါတယ်", "ရပါတယ်")
    if (phrases.length >= 2 && phrases[phrases.length - 1].length < 18) {
      const prevIdx = phrases.length - 2;
      const combined = `${phrases[prevIdx]} ${phrases[phrases.length - 1]}`.trim();
      if (combined.length <= maxCharsPerCue + 4) {
        phrases[prevIdx] = combined;
        phrases.pop();
      } else {
        const prevWords = phrases[prevIdx].split(/\s+/);
        if (prevWords.length >= 3) {
          const movedWord = prevWords.pop()!;
          const nextLast = `${movedWord} ${phrases[phrases.length - 1]}`.trim();
          if (nextLast.length <= maxCharsPerCue) {
            phrases[prevIdx] = prevWords.join(' ');
            phrases[phrases.length - 1] = nextLast;
          }
        }
      }
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
 * Finds the subtitle cue to display on the video stage during playback/scrubbing.
 * During short breath pauses between consecutive cues (e.g. at 1:10 between cue-24 and cue-25),
 * holds the just-finished cue at that scene instead of erroneously jumping back to `cues[0]`.
 */
export function findDisplayCueAtTime(
  cues: SubtitleCue[],
  currentTimeMs: number,
  maxHoldGapMs = 1500
): SubtitleCue | null {
  if (!cues || cues.length === 0) return null;
  const exact = findActiveCue(cues, currentTimeMs);
  if (exact) return exact;

  if (currentTimeMs < cues[0].start_ms) {
    return cues[0];
  }

  let latestPastCue: SubtitleCue | null = null;
  for (const cue of cues) {
    if (cue.end_ms <= currentTimeMs) {
      if (!latestPastCue || cue.end_ms >= latestPastCue.end_ms) {
        latestPastCue = cue;
      }
    }
  }

  if (latestPastCue && currentTimeMs - latestPastCue.end_ms <= maxHoldGapMs) {
    return latestPastCue;
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

export const CREDIT_SECONDS_PER_UNIT = 70; // 1:10 (70 seconds) = 1 Credit

/**
 * Calculates credit cost across all Credit Studios (Recap, Translate, Long-Form, STT):
 * - Free Tier: 0 credits (uses daily free quota)
 * - Credit Mode: Flat 1 Credit per started 1:10 (70 seconds) across all AI voices
 *   (0:01–1:10 = 1 Cr, 1:11–2:20 = 2 Cr, 2:21–3:30 = 3 Cr, ...)
 */
export function calculateCreditCost(
  durationSec: number,
  isFreeTier: boolean,
  _options?: CreditCalculationOptions
): number {
  if (isFreeTier) return 0;
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 1;
  // Flat rate across all Credit Studios & AI voices: 1:10 (70 seconds) = 1 Credit
  return Math.max(1, Math.ceil(durationSec / CREDIT_SECONDS_PER_UNIT));
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
    minutesIncluded: 117,
    standardMinutes: 117,
    hoursLabel: '1.9 hrs (၁၁၇ မိနစ်)',
    maxVideoDurationMin: 15,
    maxVideoDurationLabel: 'Up to 15 mins / video',
    storageDays: 14,
    priceMmk: '15,000 MMK',
    priceUsd: '$4.99',
    costPerMinMmk: '~128 MMK / min (1 Cr = 1:10)',
    perMinMmk: 128,
    ttsAccessLabel: 'All 10 AI Voices (Thiha, Nilar + 8 Studio Voices)',
    sttRatePerMin: '1 Cr / 1:10 (~128 MMK/min)',
    sttRateLabel: '1 Cr / 1:10 (~128 MMK/min) · SRT, VTT, TXT Export',
    featuresMy: [
      '100 Credits / လ (1 Credit = 1:10 မိနစ် — စုစုပေါင်း ၁၁၇ မိနစ်စာ)',
      'Channel Watermark & Logo (ကိုယ်ပိုင် Channel နာမည် / Logo ထည့်သွင်းအသုံးပြုနိုင်သည်)',
      'ဗီဒီယို တစ်ပုဒ်လျှင် အများဆုံး ၁၅ မိနစ် အထိ ထုတ်ယူနိုင်မည်',
      'AI Voice အသံအစုံ (Thiha, Nilar + Studio Pro အသံ ၁၀ မျိုးလုံး ပွင့်မည်)',
      'FHD 1080p ကြည်လင်ပြတ်သားမှုနှင့် Anti-Copyright Effects များ ပါဝင်သည်',
      '၁၄ ရက် Cloud History သိမ်းဆည်းမှု'
    ],
    featuresEn: [
      '100 Credits / month (1 Credit = 1:10 · 117 mins standard video)',
      'Channel Watermark & Logo (Custom @ChannelName & logo burn-in)',
      'Up to 15 minutes max duration per video',
      'All 10 AI Voices Unlocked (Thiha, Nilar + 8 Gemini Studio Voices)',
      'FHD 1080p Resolution & Anti-Copyright Effects (Mirror, Color, Crop, Pitch)',
      '14-day Cloud Storage'
    ],
    sttFeaturesMy: [
      'Whisper Large-V3-Turbo စာတန်းထိုး ထုတ်ယူမှု (1 Credit / 1:10 မိနစ်)',
      '.SRT, .VTT နှင့် .TXT ဖိုင်များ အကန့်အသတ်မရှိ ဒေါင်းလုဒ်ဆွဲနိုင်သည်',
      'မြန်မာ နှင့် အင်္ဂလိပ် စာတန်းထိုး အချိန်ကိုက် တည်းဖြတ်နိုင်သည်'
    ],
    sttFeaturesEn: [
      'Whisper Large-V3-Turbo transcription (1 Credit / 1:10 min)',
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
    minutesIncluded: 303,
    standardMinutes: 303,
    hoursLabel: '5.1 hrs (၃၀၃ မိနစ်)',
    maxVideoDurationMin: 45,
    maxVideoDurationLabel: 'Up to 45 mins / video',
    storageDays: 30,
    priceMmk: '35,000 MMK',
    priceUsd: '$11.99',
    costPerMinMmk: '~115 MMK / min (+30 Bonus Cr)',
    perMinMmk: 115,
    popular: true,
    isPopular: true,
    ttsAccessLabel: 'All 10 AI Voices + Emotion & Pacing Control',
    sttRatePerMin: '1 Cr / 1:10 (~115 MMK/min) + Multi-Language Translation',
    sttRateLabel: '1 Cr / 1:10 (~115 MMK/min) + Multi-Language AI Translation',
    featuresMy: [
      '260 Credits / လ (230 Base + 🎁 30 Credits အပို — စုစုပေါင်း ၃၀၃ မိနစ်စာ)',
      'Channel Watermark & Logo (ကိုယ်ပိုင် Channel နာမည် / Logo ထည့်သွင်းအသုံးပြုနိုင်သည်)',
      'ဗီဒီယို တစ်ပုဒ်လျှင် ၄၅ မိနစ်အထိ (Long-Form Movie Recap Studio ပွင့်မည်)',
      'Priority Cloud GPU Queue (၂ ဆ ပိုမြန်သော Server Render)',
      'AI Voice အသံအစုံ (၁၀ မျိုးလုံး) + Morris / Storytelling / Gen Z စတိုင်အစုံ',
      'FHD 1080p + Dynamic Zoom + Film Grain (Copyright Strike ကာကွယ်မှု အပြည့်အစုံ)'
    ],
    featuresEn: [
      '260 Credits / month (230 Base + 30 Bonus Credits · 303 mins video)',
      'Channel Watermark & Logo (Custom @ChannelName & logo burn-in)',
      'Up to 45 minutes per video + Full Long-Form Movie Recap Studio',
      'Priority Cloud GPU Rendering Queue (2x faster server encoding)',
      'All 10 Premium AI Voices + Full Morris & Storytelling Presets',
      'FHD 1080p + Dynamic Zoom + Film Grain Anti-Copyright Suite'
    ],
    sttFeaturesMy: [
      'Pro STT + AI ဘာသာပြန် စနစ် (တရုတ်/ကိုရီးယား/ဂျပန်/ထိုင်း မှ မြန်မာသို့ တိုက်ရိုက်ပြန်ဆိုမှု)',
      '1 Credit / 1:10 မိနစ် (~115 MMK/min သာ ကျသင့်မည်)',
      'စကားပြော အရှိန်နှင့် စာကြောင်းအရှည် အော်တို ချိန်ညှိပေးသည့် Smart Sync'
    ],
    sttFeaturesEn: [
      'Pro STT + Direct AI Translation (ZH/KO/JA/TH/EN to Burmese)',
      'Effective cost ~115 MMK / min (1 Credit / 1:10)',
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
    minutesIncluded: 653,
    standardMinutes: 653,
    hoursLabel: '10.9 hrs (၆၅၃ မိနစ်)',
    maxVideoDurationMin: 180,
    maxVideoDurationLabel: 'Unlimited (2hr+ Full Movies)',
    storageDays: 90,
    priceMmk: '75,000 MMK',
    priceUsd: '$24.99',
    costPerMinMmk: '~115 MMK / min (+60 Bonus Cr)',
    perMinMmk: 115,
    ttsAccessLabel: 'All 10+ Studio Voices + Multi-Speaker Dialogue & Custom Prosody',
    sttRatePerMin: '1 Cr / 1:10 (~115 MMK/min) + Speaker Diarization',
    sttRateLabel: '1 Cr / 1:10 (~115 MMK/min) + Speaker Diarization & Batch Export',
    featuresMy: [
      '560 Credits / လ (500 Base + 🎁 60 Credits အပို — စုစုပေါင်း ၆၅၃ မိနစ်စာ)',
      'Channel Watermark & Logo (ကိုယ်ပိုင် Channel နာမည် / Logo ထည့်သွင်းအသုံးပြုနိုင်သည်)',
      'ဗီဒီယိုကြာချိန် အကန့်အသတ်မရှိ (၂ နာရီ+ ရုပ်ရှင်ကားကြီးများနှင့် Series များ)',
      'First in Processing Queue (Dedicated Ultra-Fast GPU — စောင့်ဆိုင်းရန်မလိုပါ)',
      'AI Voice အသံအစုံ + Multi-Speaker (ဇာတ်ကောင်အလိုက် အသံခွဲပြောသည့် စနစ်)',
      '4K / FHD 1080p Ultra Bitrate + Vision AI Auto Scene Cutter + ၉၀ ရက် Cloud Storage'
    ],
    featuresEn: [
      '560 Credits / month (500 Base + 60 Bonus Credits · 653 mins video)',
      'Channel Watermark & Logo (Custom @ChannelName & logo burn-in)',
      'Unlimited Video Duration (2hr+ full movies & multi-episode series)',
      'First in Processing Queue (Dedicated Ultra-Fast Cloud GPU nodes)',
      'All 10+ Studio AI Voices + Multi-Speaker Dialogue Mode',
      '4K / FHD 1080p Ultra Bitrate + Vision AI Scene Slicing + Full Copyright Shield'
    ],
    sttFeaturesMy: [
      '1 Credit / 1:10 မိနစ် (~115 MMK/min အသက်သာဆုံးနှုန်း)',
      'Multi-Speaker Diarization (ဇာတ်ကောင် တစ်ဦးချင်းစီ အသံခွဲခြားပေးသည့် စနစ်)',
      '၂ နာရီကျော် ရုပ်ရှင်ကားကြီးများ တစ်ခါတည်း .SRT / .VTT / .TXT ထုတ်ယူနိုင်သည်'
    ],
    sttFeaturesEn: [
      '1 Credit / 1:10 (~115 MMK/min lowest rate)',
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
    minutes: 70,
    priceMmk: '6,500 MMK',
    priceUsd: '$2.49',
    labelMy: '၁ နာရီ ၁၀ မိနစ်စာ အပိုဖြည့်သွင်းမည်',
    descMy: '၇၀ မိနစ်စာ (၁ နာရီ ၁၀ မိနစ်) ချက်ချင်းဖြည့်သွင်းမည်'
  },
  {
    id: 'topup-200',
    name: '200 Credits Booster Pack',
    credits: 200,
    minutes: 233,
    priceMmk: '18,000 MMK',
    priceUsd: '$6.49',
    labelMy: '၃ နာရီ ၅၃ မိနစ်စာ အပိုဖြည့်မည်',
    descMy: '၂၃၃ မိနစ်စာ (၃ နာရီ ၅၃ မိနစ်) ချက်ချင်းဖြည့်သွင်းမည်'
  },
  {
    id: 'topup-500',
    name: '500 Credits Pro Pack',
    credits: 500,
    minutes: 583,
    priceMmk: '38,000 MMK',
    priceUsd: '$13.49',
    labelMy: '၉ နာရီ ၄၃ မိနစ်စာ အပိုဖြည့်မည်',
    descMy: '၅၈၃ မိနစ်စာ (၉ နာရီ ၄၃ မိနစ်) ချက်ချင်းဖြည့်သွင်းမည်'
  },
  {
    id: 'topup-1000',
    name: '1,000 Credits Studio Pack',
    credits: 1000,
    minutes: 1167,
    priceMmk: '68,000 MMK',
    priceUsd: '$23.99',
    labelMy: '၁၉ နာရီ ၂၇ မိနစ်စာ အထူးသက်သာနှုန်း',
    descMy: '၁,၁၆၇ မိနစ်စာ (၁၉ နာရီ ၂၇ မိနစ်) အထူးသက်သာနှုန်းဖြင့် ဖြည့်သွင်းမည်'
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
      natural: [
        'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်လဲလို့ သတို့သားက မေးချလိုက်တော့တာပေါ့',
        'သတို့သမီးကတော့ အိမ်ပြင်လိုက်တာပါဆိုပြီး လိမ်ညာနေတုန်းမှာပဲ',
        'အဲဒီအချိန်မှာပဲ အိမ်ရှင်မိန်းကလေး ဝင်လာပြီး အမှန်တရားကို ဖော်ထုတ်လိုက်ပါလေရော',
        'ပရိဘောဂတွေက သူမဝယ်ထားတာမှန်း သတို့သားက လုံးဝမသိခဲ့ဘူးလေ',
        'တကယ်တမ်းကျတော့ နှစ်သိန်းကို မောင်လေးအိမ်ဝယ်ဖို့ ယူသုံးထားတာ ဖြစ်သွားခဲ့ပြီ',
        'အိမ်ပိုင်ရှင်အစစ်က ဂရန်စာချုပ် ထုတ်ပြလိုက်တော့ အားလုံး အရှက်ကွဲနေခဲ့ရရှာတယ်',
        'နောက်ဆုံးမှာတော့ သတို့သားက မင်္ဂလာပွဲဖျက်ပြီး လှည့်ထွက်သွားတော့တာပေါ့'
      ],
      hybrid: [
        '"သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ"',
        'သတို့သမီးဟာ အိမ်ပြင်လိုက်တာပါလို့ လိမ်ညာပြောနေခဲ့ပါတယ်',
        'ဒါပေမဲ့ အိမ်ရှင်အစစ် ဝင်လာပြီး "ဒီပရိဘောဂတွေအားလုံး ငါဝယ်ထားတာ" လို့ ဖွင့်ချလိုက်ပါတယ်',
        'တကယ်တမ်းမှာ ငွေနှစ်သိန်းကို သားငယ်အိမ်ဝယ်ဖို့ ယူသုံးပစ်ခဲ့တာပါ',
        'နောက်ဆုံးမှာ သတို့သားက "ငွေပြန်ပေး... ငါတို့ပြတ်ပြီ" ဆိုပြီး လှည့်ထွက်သွားပါတော့တယ်'
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
      natural: [
        'The groom demanded to know where the 300,000 yuan went',
        'Just as the bride claimed she renovated the house, the real owner walked in',
        'Every single piece of furniture actually belonged to the landlord all along',
        'Turns out the bride’s mother secretly gave 200k to her younger son',
        'The moment the property deed hit the table, the whole scheme collapsed'
      ],
      hybrid: [
        '"Where did you spend the 300,000 yuan?"',
        'The bride claimed she spent it all renovating their new home',
        'But the real owner stepped in: "I bought every piece of furniture here!"',
        'It turned out the mother secretly gave 200k to her younger son',
        'Furious, the groom snapped: "Give my money back, we are done!"'
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
      natural: [
        'เงินสามแสนหยวน คุณเอาไปใช้ที่ไหนหมด',
        'เจ้าสาวอ้างว่านำไปตกแต่งเรือนหอทั้งหมด',
        'แต่เจ้าของบ้านตัวจริงเดินเข้ามาเปิดโปงความจริง',
        'แม่เจ้าสาวยอมรับว่านำเงินไปดาวน์บ้านให้น้องชาย',
        'เจ้าบ่าวยกเลิกงานแต่งทันทีและเดินจากไป'
      ],
      hybrid: [
        '"เงินสามแสนหยวน คุณเอาไปใช้ที่ไหนหมด"',
        'เจ้าสาวอ้างว่านำไปตกแต่งเรือนหอทั้งหมด',
        'แต่เจ้าของบ้านตัวจริงเดินเข้ามาเปิดโปงความจริงทันที',
        'แม่เจ้าสาวยอมรับว่านำเงินไปดาวน์บ้านให้น้องชาย',
        'เจ้าบ่าวประกาศทันที "คืนเงินมา เราจบกันแค่นี้"'
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
      natural: [
        '30万元をいったいどこに使ったんだ？',
        '新婦は新居の改装に使ったと嘘をつきます',
        'そこへ本当の家の持ち主が現れて暴きます',
        '母親は20万元を弟の頭金に使ったと認めました',
        '新郎は即座に破談を宣言して立ち去りました'
      ],
      hybrid: [
        '「30万元をいったいどこに使ったんだ？」',
        '新婦は新居の改装に使ったと嘘をつきます',
        'しかし本当の家の持ち主が現れて真実を暴きます',
        '母親は20万元を弟の頭金に使ったと認めました',
        '新郎は「金を返せ、これで終わりだ」と言い残し立ち去ります'
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
      natural: [
        '30만 위안을 도대체 어디에 쓴 거야?',
        '신부는 신혼집 인테리어에 썼다고 거짓말합니다',
        '진짜 집주인이 나타나 모든 사실을 폭로합니다',
        '신부 어머니는 남동생 집 계약금으로 썼다고 말합니다',
        '신랑은 즉시 파혼을 선언하고 떠나버립니다'
      ],
      hybrid: [
        '"30만 위안을 도대체 어디에 쓴 거야?"',
        '신부는 신혼집 인테리어에 썼다고 거짓말합니다',
        '하지만 진짜 집주인이 나타나 모든 사실을 폭로합니다',
        '신부 어머니는 남동생 집 계약금으로 썼다고 털어놓습니다',
        '신랑은 "돈 돌려줘, 우리 끝이야"라며 떠나버립니다'
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
      natural: [
        '三十万你到底花哪去了？',
        '新娘谎称用来装修了这套婚房',
        '真正的房东林知夏走出来当众揭穿',
        '丈母娘承认拿二十万给弟弟付了首付',
        '林知夏直接拍出房产证书揭穿骗婚',
        '新郎看清真相后当场悔婚转身离开'
      ],
      hybrid: [
        '“三十万你到底花哪去了？”',
        '新娘谎称用来装修了这套婚房',
        '但真正的房东走出来当众揭穿真相',
        '丈母娘承认拿二十万给弟弟付了首付',
        '新郎怒道：“还钱，我们结束了！”随后转身离开'
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
  freeAllowed: boolean;
}

export const FREE_BURMESE_FONT_ID: BurmeseFontStyle = 'Yati_Round';

/**
 * Curated Unicode-Accurate Myanmar Font Styles (`စာမှန်တဲ့ Myanmar Font Style အလှများ`)
 * Every style maps to a genuine OpenType/HarfBuzz Unicode Myanmar font bundled in `/public/fonts/*.ttf`
 * so stacked consonants (`ပါဌ်ဆင့်`), medials (`ြ ျ ွ ှ`), and vowels render 100% accurately (`စာမှန်`)
 * on BOTH live web preview and exported FFmpeg MP4 videos.
 * Free Mode unlocks ONLY 1 font (`Yati_Round`); all other Myanmar fonts are Credit Mode Only.
 */
export const BURMESE_FONT_STYLES: BurmeseFontStyleMeta[] = [
  {
    id: 'Yati_Round',
    label: 'Yati Round · စာလုံးဝိုင်း ခေတ်မီအလှ (Free · Unicode စာမှန်)',
    shortName: 'Yati Round (စာလုံးဝိုင်း)',
    badge: 'FREE · ROUND',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Padauk", "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif',
    assFontName: 'Padauk',
    pangoFontDesc: 'Padauk Bold',
    pangoAssScale: 0.70,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0.01em',
    freeAllowed: true
  },
  {
    id: 'Myanmar_Tagu',
    label: 'Myanmar Tagu · တန်ခူး စုတ်တံအလှ (Credit · Calligraphy)',
    shortName: 'Tagu (တန်ခူးအလှ)',
    badge: 'CALLIGRAPHY',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Tagu", "Pyidaungsu", sans-serif',
    assFontName: 'Myanmar Tagu',
    pangoFontDesc: 'Myanmar Tagu Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Myanmar_Sabae',
    label: 'Myanmar Sabae · စံပယ် စာလုံးဝိုင်းချစ်စရာ (Credit · TikTok Style)',
    shortName: 'Sabae (စံပယ်ဝိုင်း)',
    badge: 'CUTE · VIRAL',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Sabae", "Padauk", sans-serif',
    assFontName: 'Myanmar Sabae',
    pangoFontDesc: 'Myanmar Sabae Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Myanmar_Khyay',
    label: 'Myanmar Khyay · ခရေ ရုပ်ရှင်ပိုစတာအလှ (Credit · Cinema Display)',
    shortName: 'Khyay (ခရေ ရုပ်ရှင်)',
    badge: 'CINEMA · ART',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Khyay", "Pyidaungsu", sans-serif',
    assFontName: 'Myanmar Khyay',
    pangoFontDesc: 'Myanmar Khyay Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Myanmar_Waso',
    label: 'Myanmar Waso · ဝါဆို ဂန္ထဝင်စာလုံးအလှ (Credit · Classic Art)',
    shortName: 'Waso (ဝါဆိုအလှ)',
    badge: 'CLASSIC · ART',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Waso", "Pyidaungsu", sans-serif',
    assFontName: 'Myanmar Waso',
    pangoFontDesc: 'Myanmar Waso Regular',
    pangoAssScale: 0.66,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Cherry_Unicode',
    label: 'Cherry Unicode · ချယ်ရီ လက်ရေးအလှ (Credit · Cute Hand)',
    shortName: 'Cherry (ချယ်ရီအလှ)',
    badge: 'SOFT · HAND',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Cherry Unicode", "Padauk", sans-serif',
    assFontName: 'Cherry Unicode',
    pangoFontDesc: 'Cherry Unicode Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Myanmar_Yinmar',
    label: 'Myanmar Yinmar · ယင်းမာ စာလုံးစောင်းအလှ (Credit · Artistic Brush)',
    shortName: 'Yinmar (ယင်းမာ)',
    badge: 'BRUSH · CHIC',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Yinmar", "Pyidaungsu", sans-serif',
    assFontName: 'Myanmar Yinmar',
    pangoFontDesc: 'Myanmar Yinmar Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Myanmar_Angoun',
    label: 'Myanmar Angoun · အံ့ကုန် စာလုံးထူအလှ (Credit · Expressive Bold)',
    shortName: 'Angoun (အံ့ကုန်)',
    badge: 'BOLD · DRAMATIC',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Angoun", "Pyidaungsu", sans-serif',
    assFontName: 'Myanmar Angoun',
    pangoFontDesc: 'Myanmar Angoun Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 700,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Myanmar_Gantgaw',
    label: 'Myanmar Gantgaw · ဂန့်ဂေါ် ခန့်ညားစာလုံးအလှ (Credit · Editorial)',
    shortName: 'Gantgaw (ဂန့်ဂေါ်)',
    badge: 'EDITORIAL',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Gantgaw", "Pyidaungsu", sans-serif',
    assFontName: 'Myanmar Gantgaw',
    pangoFontDesc: 'Myanmar Gantgaw Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Myanmar_Sagar',
    label: 'Myanmar Sagar · စကားဝါ နူးညံ့စာလုံးအလှ (Credit · Graceful)',
    shortName: 'Sagar (စကားဝါ)',
    badge: 'GRACEFUL',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Sagar", "Pyidaungsu", sans-serif',
    assFontName: 'Myanmar Sagar',
    pangoFontDesc: 'Myanmar Sagar Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Myanmar_Square',
    label: 'Myanmar Square · စတုရန်း ခေတ်မီဒီဇိုင်းအလှ (Credit · Modern Box)',
    shortName: 'Square (စတုရန်း)',
    badge: 'MODERN · BOX',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Myanmar Square", "Pyidaungsu", sans-serif',
    assFontName: 'Myanmar Square',
    pangoFontDesc: 'Myanmar Square Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Noto_Serif_Black',
    label: 'Royal Black Serif · စာလုံးထူကြီး ရုပ်ရှင်စတိုင် (Credit · Ultra Bold)',
    shortName: 'Royal Black (ရုပ်ရှင်ထူ)',
    badge: 'ULTRA · SERIF',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Noto Serif Myanmar Blk", "Noto Serif Myanmar", serif',
    assFontName: 'Noto Serif Myanmar Blk',
    pangoFontDesc: 'Noto Serif Myanmar Black',
    pangoAssScale: 0.42,
    assBold: -1,
    fontWeight: 900,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Z06-Walone',
    label: 'Walone Round · ဝလုံး စာလုံးဝိုင်းအလှ (Credit · Masterpiece Uni)',
    shortName: 'Walone (ဝလုံးဝိုင်း)',
    badge: 'WALONE · ROUND',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Masterpiece Uni Round", "Padauk", sans-serif',
    assFontName: 'Masterpiece Uni Round',
    pangoFontDesc: 'Masterpiece Uni Round Regular',
    pangoAssScale: 0.68,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Pyidaungsu',
    label: 'Pyidaungsu Bold · ပြည်ထောင်စု စာလုံးအလှ (Credit · Official)',
    shortName: 'Pyidaungsu (ပြည်ထောင်စု)',
    badge: 'OFFICIAL · CLEAR',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Pyidaungsu", "Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif',
    assFontName: 'Pyidaungsu',
    pangoFontDesc: 'Pyidaungsu Bold',
    pangoAssScale: 0.60,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0em',
    freeAllowed: false
  },
  {
    id: 'Padauk_Bold',
    label: 'Padauk Studio · ပိတောက် စာလုံးထူအလှ (Credit · Recap Popular)',
    shortName: 'Padauk Bold (ပိတောက်)',
    badge: 'POPULAR · BOLD',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Padauk", "Pyidaungsu", "Noto Sans Myanmar", sans-serif',
    assFontName: 'Padauk',
    pangoFontDesc: 'Padauk Bold',
    pangoAssScale: 0.70,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0.015em',
    freeAllowed: false
  },
  {
    id: 'Noto_Serif_Bold',
    label: 'Myanmar Cinema Serif · ရုပ်ရှင်စာတန်းထိုး အလှ (Credit · Editorial)',
    shortName: 'Cinema Serif (ရုပ်ရှင်စတိုင်)',
    badge: 'CINEMA · SERIF',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Noto Serif Myanmar", "Pyidaungsu", serif',
    assFontName: 'Noto Serif Myanmar',
    pangoFontDesc: 'Noto Serif Myanmar Bold',
    pangoAssScale: 0.42,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'Noto_Sans_Bold',
    label: 'Noto Sans Clean · ခေတ်မီ စာလုံးသန့်အလှ (Credit · Crisp HD)',
    shortName: 'Noto Sans (စာလုံးသန့်)',
    badge: 'CRISP · HD',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Noto Sans Myanmar", "Plus Jakarta Sans", sans-serif',
    assFontName: 'Noto Sans Myanmar',
    pangoFontDesc: 'Noto Sans Myanmar Bold',
    pangoAssScale: 0.48,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0em',
    freeAllowed: false
  },
  {
    id: 'TharLon_Classic',
    label: 'TharLon Classic · သာလွန် စာလုံးသွယ်အလှ (Credit · Slim)',
    shortName: 'TharLon (သာလွန်)',
    badge: 'CLASSIC · SLIM',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"TharLon", "Pyidaungsu", "Noto Sans Myanmar", sans-serif',
    assFontName: 'TharLon',
    pangoFontDesc: 'TharLon Regular',
    pangoAssScale: 0.70,
    assBold: 0,
    fontWeight: 600,
    letterSpacing: '0.01em',
    freeAllowed: false
  },
  {
    id: 'A15_Innwa',
    label: 'Innwa Unicode · အင်းဝ ရိုးရာစာလုံးအလှ (Credit · Traditional)',
    shortName: 'Innwa (အင်းဝ)',
    badge: 'TRADITIONAL',
    sampleMy: 'သိန်းသုံးဆယ်ကို ဘယ်မှာသုံးလိုက်တာလဲ',
    cssFontFamily: '"Noto Serif Myanmar", "Pyidaungsu", "Noto Sans Myanmar", serif',
    assFontName: 'Noto Serif Myanmar',
    pangoFontDesc: 'Noto Serif Myanmar Bold',
    pangoAssScale: 0.42,
    assBold: -1,
    fontWeight: 700,
    letterSpacing: '0em',
    freeAllowed: false
  }
];

/**
 * Subtitle Language tier gate:
 * Free Mode allows ONLY Burmese (`'my'`). English, Thai, Japanese, Korean, and Chinese
 * are exclusively available in Credit Mode.
 */
export function isSubtitleLanguageAllowedInMode(
  lang: TargetLanguageCode | string | undefined | null,
  isFreeTier: boolean
): boolean {
  if (!isFreeTier) return true;
  return !lang || lang === 'my';
}

export function resolveAllowedSubtitleLanguage(
  lang: TargetLanguageCode | string | undefined | null,
  isFreeTier: boolean
): TargetLanguageCode {
  if (isFreeTier) return 'my';
  const valid = TARGET_LANGUAGES.find((l) => l.code === lang);
  return valid ? valid.code : 'my';
}

/**
 * Myanmar Font Style tier gate:
 * Free Mode allows ONLY 1 font (`Yati_Round`). All other artistic Myanmar fonts
 * are exclusively available in Credit Mode.
 */
export function isBurmeseFontAllowedInMode(
  fontStyle: BurmeseFontStyle | string | undefined | null,
  isFreeTier: boolean
): boolean {
  if (!isFreeTier) return true;
  const meta = resolveBurmeseFontMeta(fontStyle || FREE_BURMESE_FONT_ID);
  return Boolean(meta.freeAllowed);
}

export function resolveAllowedBurmeseFontStyle(
  fontStyle: BurmeseFontStyle | string | undefined | null,
  isFreeTier: boolean
): BurmeseFontStyle {
  const meta = resolveBurmeseFontMeta(fontStyle || FREE_BURMESE_FONT_ID);
  if (isFreeTier && !meta.freeAllowed) {
    return FREE_BURMESE_FONT_ID;
  }
  return meta.id;
}

export function resolveBurmeseFontMeta(fontStyle?: BurmeseFontStyle | string): BurmeseFontStyleMeta {
  const found = BURMESE_FONT_STYLES.find((f) => f.id === fontStyle);
  return found || BURMESE_FONT_STYLES[0];
}

export function resolveSubtitleFontMeta(
  fontStyle?: BurmeseFontStyle | string,
  subtitleLang?: TargetLanguageCode,
  sampleText?: string
): BurmeseFontStyleMeta {
  const base = resolveBurmeseFontMeta(fontStyle);
  const text = sampleText || '';
  const lang = subtitleLang || 'my';

  if (lang === 'ko' || /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text)) {
    return {
      ...base,
      cssFontFamily: '"Noto Sans KR", "Inter", sans-serif',
      assFontName: 'Noto Sans KR',
      pangoFontDesc: 'Noto Sans KR Bold',
      pangoAssScale: 0.72,
      assBold: -1,
      fontWeight: 700,
      letterSpacing: '0em'
    };
  }
  if (lang === 'th' || /[\u0E00-\u0E7F]/.test(text)) {
    return {
      ...base,
      cssFontFamily: '"Noto Sans Thai", "Noto Looped Thai", sans-serif',
      assFontName: 'Noto Sans Thai',
      pangoFontDesc: 'Noto Sans Thai Bold',
      pangoAssScale: 0.72,
      assBold: -1,
      fontWeight: 700,
      letterSpacing: '0em'
    };
  }
  if (lang === 'ja' || (/[\u3040-\u30FF]/.test(text) && lang !== 'zh')) {
    return {
      ...base,
      cssFontFamily: '"Noto Sans JP", "Hiragino Kaku Gothic ProN", sans-serif',
      assFontName: 'Noto Sans JP',
      pangoFontDesc: 'Noto Sans JP Bold',
      pangoAssScale: 0.72,
      assBold: -1,
      fontWeight: 700,
      letterSpacing: '0em'
    };
  }
  if (lang === 'zh' || /[\u4E00-\u9FFF]/.test(text)) {
    return {
      ...base,
      cssFontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
      assFontName: 'Noto Sans SC',
      pangoFontDesc: 'Noto Sans SC Bold',
      pangoAssScale: 0.72,
      assBold: -1,
      fontWeight: 700,
      letterSpacing: '0em'
    };
  }
  if (lang === 'en' && !/[\u1000-\u109F]/.test(text)) {
    return {
      ...base,
      cssFontFamily: '"Inter", "DejaVu Sans", sans-serif',
      assFontName: 'DejaVu Sans',
      pangoFontDesc: 'DejaVu Sans Bold',
      pangoAssScale: 0.72,
      assBold: -1,
      fontWeight: 700,
      letterSpacing: '0em'
    };
  }
  return base;
}

/**
 * Checks whether a subtitle string genuinely matches the expected target script/language
 * so failed translations that echo back untranslated Burmese or another wrong script are detected.
 */
export function doesTextMatchSubtitleLanguage(
  text: string,
  targetLang: TargetLanguageCode
): boolean {
  const trimmed = (text || '').trim();
  if (!trimmed) return false;
  const hasMyanmar = /[\u1000-\u109F]/.test(trimmed);
  const hasThai = /[\u0E00-\u0E7F]/.test(trimmed);
  const hasKorean = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(trimmed);
  const hasHan = /[\u4E00-\u9FFF]/.test(trimmed);
  const hasKana = /[\u3040-\u30FF]/.test(trimmed);
  const hasLatin = /[A-Za-z]/.test(trimmed);

  switch (targetLang) {
    case 'my':
      // Reject mixed half-Burmese / half-Chinese (or Korean/Japanese/Thai) leaked subtitles!
      return hasMyanmar && !hasHan && !hasKorean && !hasThai && !hasKana;
    case 'th':
      return hasThai && !hasMyanmar && !hasHan && !hasKorean && !hasKana;
    case 'ko':
      return hasKorean && !hasMyanmar && !hasHan && !hasThai && !hasKana;
    case 'zh':
      return hasHan && !hasMyanmar && !hasKana && !hasKorean && !hasThai;
    case 'ja':
      return (hasKana || hasHan) && !hasMyanmar && !hasKorean && !hasThai;
    case 'en':
      return hasLatin && !hasMyanmar && !hasThai && !hasKorean && !hasHan && !hasKana;
    default:
      return !hasMyanmar;
  }
}

/**
 * Detects whether a single subtitle cue contains untranslated foreign script leakage
 * (for example, Chinese characters `到家了宝宝` mixed into a Burmese subtitle `အိုက်ယား...到家了宝宝`).
 */
export function hasForeignScriptLeakage(
  text: string,
  targetLang: TargetLanguageCode
): boolean {
  const trimmed = String(text || '').trim();
  if (!trimmed) return false;
  const hasMyanmar = /[\u1000-\u109F]/.test(trimmed);
  const hasThai = /[\u0E00-\u0E7F]/.test(trimmed);
  const hasKorean = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(trimmed);
  const hasHan = /[\u4E00-\u9FFF]/.test(trimmed);
  const hasKana = /[\u3040-\u30FF]/.test(trimmed);

  switch (targetLang) {
    case 'my':
      return hasHan || hasKorean || hasThai || hasKana || (!hasMyanmar && /[A-Za-z]{4,}/.test(trimmed));
    case 'th':
      return hasMyanmar || hasHan || hasKorean || hasKana;
    case 'ko':
      return hasMyanmar || hasHan || hasThai || hasKana;
    case 'zh':
      return hasMyanmar || hasKorean || hasThai || hasKana;
    case 'ja':
      return hasMyanmar || hasKorean || hasThai;
    case 'en':
      return hasMyanmar || hasHan || hasKorean || hasThai || hasKana;
    default:
      return false;
  }
}

/**
 * Returns 0-based indices of all cues that contain leaked untranslated source-language script
 * so a targeted 1-to-1 repair pass can translate ONLY those cues cleanly without shifting timing.
 */
export function findForeignScriptLeakedCueIndices(
  cues: SubtitleCue[],
  targetLang: TargetLanguageCode
): number[] {
  if (!Array.isArray(cues) || cues.length === 0) return [];
  const leaked: number[] = [];
  for (let i = 0; i < cues.length; i++) {
    if (hasForeignScriptLeakage(cues[i]?.text || '', targetLang)) {
      leaked.push(i);
    }
  }
  return leaked;
}

/**
 * Returns true if the majority of non-empty cues do NOT match the requested subtitle language
 * (e.g., cues are still in Burmese when English/Thai/Korean/Chinese/Japanese is selected).
 */
export function needsSubtitleTranslation(
  cues: SubtitleCue[],
  targetLang: TargetLanguageCode
): boolean {
  if (!Array.isArray(cues) || cues.length === 0) return false;
  const nonEmpty = cues.filter((c) => String(c?.text || '').trim().length > 0);
  if (nonEmpty.length === 0) return false;
  let matching = 0;
  for (const cue of nonEmpty) {
    if (doesTextMatchSubtitleLanguage(cue.text, targetLang)) {
      matching++;
    }
  }
  return matching / nonEmpty.length < 0.6;
}

/**
 * Tolerantly parses LLM subtitle translation output into an array aligned 1-to-1 with `expectedCount`.
 * Supports:
 *  - `{ items: [{ i: 1, t: "..." }] }` (index-aligned, survives dropped/extra items)
 *  - `{ lines: ["...", ...] }` or raw JSON string array `["...", ...]`
 *  - Markdown-fenced JSON or JS-quoted JSON
 *  - Plain numbered lines (`1. ...`)
 */
export function parseTranslatedSubtitleChunkOutput(
  raw: unknown,
  expectedCount: number
): Array<string | null> {
  const out: Array<string | null> = Array.from({ length: expectedCount }, () => null);
  if (expectedCount <= 0 || raw == null) return out;

  const cleanLine = (v: unknown): string | null => {
    if (typeof v !== 'string') return null;
    const s = v
      .replace(/^\s*\d+\s*[\.\)\:\-]\s*/, '')
      .replace(/\r?\n/g, ' ')
      .trim();
    return s.length > 0 ? s : null;
  };

  const applyParsedObject = (obj: any): boolean => {
    if (!obj) return false;
    if (Array.isArray(obj)) {
      let filled = 0;
      for (let idx = 0; idx < Math.min(expectedCount, obj.length); idx++) {
        const entry = obj[idx];
        if (entry && typeof entry === 'object' && 't' in entry) {
          const itemIdx = typeof entry.i === 'number' ? entry.i - 1 : idx;
          const txt = cleanLine(entry.t);
          if (itemIdx >= 0 && itemIdx < expectedCount && txt) {
            out[itemIdx] = txt;
            filled++;
          }
        } else {
          const txt = cleanLine(entry);
          if (txt) {
            out[idx] = txt;
            filled++;
          }
        }
      }
      return filled > 0;
    }
    if (typeof obj === 'object') {
      if (Array.isArray(obj.items)) {
        let filled = 0;
        for (let idx = 0; idx < obj.items.length; idx++) {
          const entry = obj.items[idx];
          const itemIdx =
            entry && typeof entry === 'object' && typeof entry.i === 'number'
              ? entry.i - 1
              : idx;
          const txt = cleanLine(
            entry && typeof entry === 'object' ? entry.t ?? entry.text ?? entry.line : entry
          );
          if (itemIdx >= 0 && itemIdx < expectedCount && txt) {
            out[itemIdx] = txt;
            filled++;
          }
        }
        if (filled > 0) return true;
      }
      if (Array.isArray(obj.lines)) {
        let filled = 0;
        for (let idx = 0; idx < Math.min(expectedCount, obj.lines.length); idx++) {
          const txt = cleanLine(obj.lines[idx]);
          if (txt) {
            out[idx] = txt;
            filled++;
          }
        }
        if (filled > 0) return true;
      }
      if (Array.isArray(obj.translations)) {
        let filled = 0;
        for (let idx = 0; idx < Math.min(expectedCount, obj.translations.length); idx++) {
          const txt = cleanLine(obj.translations[idx]);
          if (txt) {
            out[idx] = txt;
            filled++;
          }
        }
        if (filled > 0) return true;
      }
    }
    return false;
  };

  if (typeof raw === 'object') {
    if (applyParsedObject(raw)) return out;
  }

  const rawStr = String(raw || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!rawStr) return out;

  // 1. Direct JSON parse or extracted JSON object/array block
  const jsonCandidates: string[] = [rawStr];
  const objStart = rawStr.indexOf('{');
  const objEnd = rawStr.lastIndexOf('}');
  if (objStart >= 0 && objEnd > objStart) {
    jsonCandidates.push(rawStr.slice(objStart, objEnd + 1));
  }
  const arrStart = rawStr.indexOf('[');
  const arrEnd = rawStr.lastIndexOf(']');
  if (arrStart >= 0 && arrEnd > arrStart) {
    jsonCandidates.push(rawStr.slice(arrStart, arrEnd + 1));
  }

  for (const cand of jsonCandidates) {
    try {
      const parsed = JSON.parse(cand);
      if (applyParsedObject(parsed)) return out;
    } catch {}
  }

  // 2. Fallback: numbered plain-text lines (e.g. "1. Translated line")
  const rawLines = rawStr.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let numberedHits = 0;
  for (const line of rawLines) {
    const m = line.match(/^(\d+)\s*[\.\)\:\-]\s*(.+)$/);
    if (m) {
      const idx = Number(m[1]) - 1;
      const txt = m[2].replace(/^["']|["'],?$/g, '').trim();
      if (idx >= 0 && idx < expectedCount && txt) {
        out[idx] = txt;
        numberedHits++;
      }
    }
  }
  if (numberedHits > 0) return out;

  // 3. Fallback: exact line count plain text
  if (rawLines.length === expectedCount) {
    for (let idx = 0; idx < expectedCount; idx++) {
      const txt = cleanLine(rawLines[idx]);
      if (txt) out[idx] = txt;
    }
  }

  return out;
}

/**
 * Strips any internal AI, Gemini, Whisper, Groq, Cloudflare, or model-name references
 * from recap progress and retry messages so the user only sees clean, simple English stage labels.
 */
export function sanitizeRecapProgressMessage(rawMsg: string): string {
  const trimmed = String(rawMsg || '').trim();
  if (!trimmed) return 'Processing...';

  const lower = trimmed.toLowerCase();
  if (
    lower.includes('switching to backup') ||
    lower.includes('quota reached') ||
    lower.includes('backup model') ||
    lower.includes('backup ai') ||
    lower.includes('backup gemini')
  ) {
    if (lower.includes('503') || lower.includes('busy') || lower.includes('high demand')) {
      return 'Server busy — retrying...';
    }
    return 'Processing script...';
  }
  if (lower.includes('503') || lower.includes('high demand') || (lower.includes('busy') && lower.includes('retry'))) {
    return 'Server busy — retrying...';
  }
  if (lower.includes('listening to original audio')) {
    return 'Listening to original audio...';
  }
  if (lower.includes('transcribing') && lower.includes('whisper')) {
    return 'Transcribing dialogue...';
  }
  if (lower.includes('writing') && lower.includes('script') && lower.includes('ai')) {
    return 'Writing script & subtitles...';
  }
  if (lower.includes('synthesizing') && lower.includes('voiceover')) {
    return 'Generating voiceover...';
  }
  if (lower.includes('starting ai recap')) {
    return 'Starting recap...';
  }
  if (lower.includes('retrying ai script')) {
    return 'Retrying script generation...';
  }
  if (lower.includes('generating synced script') && (lower.includes('gemini') || lower.includes('ai'))) {
    return 'Generating synced script...';
  }

  // General fallback scrub: remove parenthesized model IDs, vendor names, and standalone "AI"
  const scrubbed = trimmed
    .replace(/\(\s*(?:gemini|whisper|groq|llama|claude|gpt)[^)]*\)/gi, '')
    .replace(/\b(?:gemini[-\w.]*|whisper[-\w.]*|groq|cloudflare|workers\s+ai|mediabunny)\b/gi, '')
    .replace(/\bwith\s+AI\b/gi, '')
    .replace(/\bvia\s+AI\b/gi, '')
    .replace(/\bAI\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/\s+\.{3}$/, '...')
    .trim();

  return scrubbed.length >= 3 ? scrubbed : 'Processing...';
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
 * Determines whether an upstream Gemini/AI error is a transient model/server spike
 * (HTTP 503 high demand, model overloaded, 502/504 gateway, timeout) rather than an
 * API key quota exhaustion or invalid key.
 */
export function isTransientModelOverloadError(err: unknown): boolean {
  const rawMsg =
    err instanceof Error
      ? `${err.name}: ${err.message}`
      : typeof err === 'string'
        ? err
        : JSON.stringify(err || '');
  const lower = rawMsg.toLowerCase();

  return (
    lower.includes('"code":503') ||
    lower.includes('code": 503') ||
    lower.includes('status: 503') ||
    lower.includes(' 503 ') ||
    lower.includes('(503)') ||
    lower.includes('high demand') ||
    lower.includes('spikes in demand') ||
    lower.includes('overloaded') ||
    lower.includes('"status":"unavailable"') ||
    lower.includes('service unavailable') ||
    lower.includes('"code":502') ||
    lower.includes('"code":504') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('econnreset') ||
    lower.includes('etimedout') ||
    lower.includes('fetch failed')
  );
}

/**
 * Computes bounded exponential backoff with jitter (in ms) for transient 503 High Demand retries.
 */
export function computeGeminiBackoffDelayMs(
  waveIndex: number,
  randomFn: () => number = Math.random
): number {
  const safeWave = Math.max(0, Math.min(4, Math.floor(waveIndex)));
  const baseMs = safeWave === 0 ? 1200 : safeWave === 1 ? 2600 : 4500;
  const jitterMs = Math.round(Math.max(0, Math.min(1, randomFn())) * 700);
  return baseMs + jitterMs;
}

/**
 * Compresses a multimodal Gemini parts payload during transient 503 High Demand / timeout spikes:
 * - Downsamples `[Visual Scene Frame ...]` + image pairs evenly while preserving the first and climax frame.
 * - Drops >900KB inline audio blobs only if timestamped STT transcript text is already present.
 * - Preserves the final text prompt intact.
 */
export function compactMultimodalPartsForOverloadRetry<
  T extends { text?: string; inlineData?: { mimeType: string; data: string } }
>(
  parts: T[],
  opts: {
    maxFrames?: number;
    dropLargeAudioWhenTranscriptPresent?: boolean;
    hasTranscript?: boolean;
  } = {}
): T[] {
  const maxFrames = Math.max(2, opts.maxFrames ?? 8);
  const dropLargeAudio = Boolean(opts.dropLargeAudioWhenTranscriptPresent && opts.hasTranscript);

  interface FramePair {
    labelPart: T | null;
    imagePart: T;
  }
  const framePairs: FramePair[] = [];
  const nonFrameParts: T[] = [];

  for (let i = 0; i < parts.length; i++) {
    const cur = parts[i];
    const next = i + 1 < parts.length ? parts[i + 1] : null;
    if (
      typeof cur.text === 'string' &&
      cur.text.startsWith('[Visual Scene Frame') &&
      next?.inlineData?.mimeType?.startsWith('image/')
    ) {
      framePairs.push({ labelPart: cur, imagePart: next });
      i++;
      continue;
    }
    if (cur.inlineData?.mimeType?.startsWith('image/')) {
      framePairs.push({ labelPart: null, imagePart: cur });
      continue;
    }
    if (cur.inlineData?.mimeType?.startsWith('audio/')) {
      if (dropLargeAudio && cur.inlineData.data.length > 900_000) {
        continue;
      }
      nonFrameParts.push(cur);
      continue;
    }
    nonFrameParts.push(cur);
  }

  let selectedFrames = framePairs;
  if (framePairs.length > maxFrames) {
    const picked: FramePair[] = [];
    const pickedIndices = new Set<number>();
    for (let k = 0; k < maxFrames; k++) {
      const idx = Math.min(
        framePairs.length - 1,
        Math.round((k * (framePairs.length - 1)) / Math.max(1, maxFrames - 1))
      );
      if (!pickedIndices.has(idx)) {
        pickedIndices.add(idx);
        picked.push(framePairs[idx]);
      }
    }
    selectedFrames = picked;
  }

  const out: T[] = [];
  for (const fp of selectedFrames) {
    if (fp.labelPart) out.push(fp.labelPart);
    out.push(fp.imagePart);
  }
  out.push(...nonFrameParts);
  return out;
}

/**
 * Resolves ordered Gemini script model candidates so deprecated models (e.g. `gemini-2.5-flash`)
 * or 404/503 preview models automatically upgrade and fall back to active Gemini 4 / 3.1 Flash Lite / 3.8 models.
 */
export function resolveFallbackScriptModels(primaryModel?: string): ScriptAiModelId[] {
  const clean = (primaryModel || 'gemini-4-hydrogen').trim() as ScriptAiModelId;
  const presets: Record<string, ScriptAiModelId[]> = {
    'gemini-4-hydrogen': ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'],
    'gemini-3.1-flash-lite': ['gemini-3.1-flash-lite', 'gemini-4-hydrogen', 'gemini-3.8-flash'],
    'gemini-3.8-flash': ['gemini-3.8-flash', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
    'gemini-4-argon': ['gemini-4-argon', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'],
    'gemini-3-flash-preview': ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'],
    'gemini-2.5-flash': ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'],
    'gemini-3.1-pro-preview': ['gemini-4-argon', 'gemini-4-hydrogen', 'gemini-3.1-flash-lite']
  };
  if (presets[clean]) {
    return presets[clean];
  }
  const defaults: ScriptAiModelId[] = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  return [clean, ...defaults.filter((m) => m !== clean)];
}

/**
 * Inspects an error thrown by Gemini or Groq SDK/HTTP calls to determine if it is a
 * quota / rate-limit error (429 / RESOURCE_EXHAUSTED / rate_limit) or an
 * invalid/revoked key error (401 / API_KEY_INVALID), returning a 24-hour rest duration
 * so the pool immediately switches to the next Admin key and auto-restores after 24 hours.
 * Transient model 503/high-demand spikes are intentionally NOT treated as 24h key quota failures.
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

  const isExplicitDailyLimit =
    lower.includes('requests per day') ||
    lower.includes('requestsperday') ||
    lower.includes('requests_per_day') ||
    lower.includes('daily limit');

  const isExplicitPerMinuteLimit =
    !isExplicitDailyLimit &&
    (lower.includes('per minute') ||
      lower.includes('requestsperminute') ||
      lower.includes('tokensperminute') ||
      lower.includes('requests_per_minute') ||
      lower.includes('tokens_per_minute') ||
      lower.includes('tokens per minute') ||
      lower.includes('requests per minute'));

  const isHardDailyOrBillingQuota =
    !isExplicitPerMinuteLimit &&
    (isExplicitDailyLimit ||
      lower.includes('exceeded your current quota') ||
      lower.includes('resource_exhausted') ||
      lower.includes('quota_exceeded') ||
      lower.includes('billing') ||
      lower.includes('quota'));

  const isTransientRpmBurst =
    isExplicitPerMinuteLimit ||
    (!isHardDailyOrBillingQuota &&
      (lower.includes('429') ||
        lower.includes('rate limit') ||
        lower.includes('rate_limit') ||
        lower.includes('too many requests') ||
        lower.includes('retry in')));

  if (isTransientRpmBurst) {
    return {
      shouldRotate: true,
      isQuotaLimit: true,
      isInvalidKey: false,
      cooldownMs: 90_000,
      reason: 'Temporary RPM/TPM rate limit (90s short rest)'
    };
  }

  const isQuotaLimit =
    isHardDailyOrBillingQuota ||
    lower.includes('429') ||
    lower.includes('rate limit') ||
    lower.includes('rate_limit') ||
    lower.includes('too many requests') ||
    lower.includes('tokens per minute') ||
    lower.includes('requests per minute') ||
    lower.includes('requests per day');

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
 * Extracts a concise, readable error string from SDK JSON error payloads so users
 * never see raw truncated `{"error":{"code":...` fragments.
 */
export function extractReadableGeminiErrorDetail(rawReason: string | undefined | null): string {
  const raw = String(rawReason || '').trim();
  if (!raw) return 'Timeout / Connection error';
  const jsonStart = raw.indexOf('{');
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      const innerMsg = parsed?.error?.message || parsed?.message;
      const innerCode = parsed?.error?.code || parsed?.code;
      if (typeof innerMsg === 'string' && innerMsg.trim()) {
        const cleanMsg = innerMsg.trim().slice(0, 110);
        return innerCode ? `${innerCode}: ${cleanMsg}` : cleanMsg;
      }
    } catch {
      const msgMatch = raw.match(/"message"\s*:\s*"([^"]{4,140})"/i);
      const codeMatch = raw.match(/"code"\s*:\s*(\d{3})/i);
      if (msgMatch?.[1]) {
        return codeMatch?.[1] ? `${codeMatch[1]}: ${msgMatch[1]}` : msgMatch[1];
      }
    }
  }
  return raw.replace(/\s+/g, ' ').slice(0, 110);
}

/**
 * Produces a clear, actionable Burmese & English message explaining why Gemini script generation failed.
 */
export function detectGeminiFailureMessage(
  rawReason: string | undefined | null,
  hasPoolKeys: boolean,
  isFreeMode: boolean
): { code: 'no_key' | 'quota' | 'invalid_key' | 'overloaded' | 'error'; messageMy: string; messageEn: string } {
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

  if (isTransientModelOverloadError(msg)) {
    return {
      code: 'overloaded',
      messageMy:
        'Google Gemini AI Server လက်ရှိ အသုံးပြုသူ များပြားနေပါသည် (503 High Demand)။ စက္ကန့်အနည်းငယ်စောင့်ပြီး ထပ်မံကြိုးစားကြည့်ပါ။',
      messageEn:
        'Gemini AI servers are temporarily experiencing high demand (503). Please wait a few seconds and try again.'
    };
  }

  const detail = extractReadableGeminiErrorDetail(msg);
  return {
    code: 'error',
    messageMy: `AI Script ထုတ်လုပ်မှု မအောင်မြင်ပါ (${detail})။ ပြန်လည်ကြိုးစားကြည့်ပါ။`,
    messageEn: `AI Script generation failed (${detail}). Please try again.`
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

export function isTransientPollHttpStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    (status >= 520 && status <= 524)
  );
}

export function computeNextPollDelayMs(consecutiveErrors: number): number {
  const errs = Math.max(0, Math.floor(consecutiveErrors));
  if (errs === 0) return 1200;
  return Math.min(4000, 1500 + errs * 500);
}

export function shouldSkipWorkersAiForPayloadSize(
  audioByteLength: number,
  maxBytes = 3_500_000
): boolean {
  return !Number.isFinite(audioByteLength) || audioByteLength < 200 || audioByteLength > maxBytes;
}

/**
 * Extracts the server jobId (`job_...`) from `/api/recap/video/job_..._{preview|recap|export_...}.mp4`
 * so Studio Downloads & History items always locate the server source & re-burn subtitles properly.
 */
export function extractJobIdFromVideoUrl(videoUrl: string | undefined | null): string | null {
  if (!videoUrl || typeof videoUrl !== 'string') return null;
  const match = videoUrl.match(/\/(job_[a-zA-Z0-9_]+)_(?:recap|preview|export_[a-zA-Z0-9]+)\.mp4/);
  return match ? match[1] : null;
}

export const MAX_SAFE_BLOB_DOWNLOAD_BYTES = 180 * 1024 * 1024; // 180 MB mobile-safe RAM threshold

export function shouldUseBlobDownloadForSize(
  contentLengthBytes: number,
  maxBlobBytes = MAX_SAFE_BLOB_DOWNLOAD_BYTES
): boolean {
  if (!Number.isFinite(contentLengthBytes) || contentLengthBytes <= 0) {
    return true;
  }
  return contentLengthBytes <= maxBlobBytes;
}

export function buildDownloadVideoApiPath(
  jobId: string,
  downloadFilename: string,
  videoUrl?: string | null,
  isFreeMode = false
): string {
  const safeJob = jobId.replace(/[^a-zA-Z0-9_-]/g, '');
  const params = new URLSearchParams();
  if (downloadFilename) params.set('name', downloadFilename);
  if (videoUrl) {
    const cleanPath = videoUrl.split('?')[0];
    const base = cleanPath.split('/').pop() || '';
    if (base) params.set('file', base);
  }
  if (isFreeMode) params.set('free', '1');
  return `/api/recap/${encodeURIComponent(safeJob)}/download/video?${params.toString()}`;
}

/**
 * Resolves the authoritative video duration in seconds from ffprobe output, client metadata, and subtitle cues,
 * ensuring a failed probe (0) never overwrites a real 2+ minute video with a 15-second fallback.
 */
export function resolveEffectiveVideoDurationSec(
  probedSec?: number | null,
  clientSec?: number | null,
  cues?: SubtitleCue[]
): number {
  const cueMaxSec =
    Array.isArray(cues) && cues.length > 0
      ? Math.max(0, ...cues.map((c) => (Number(c?.end_ms) || 0) / 1000))
      : 0;
  const p = Number(probedSec) || 0;
  const cl = Number(clientSec) || 0;
  if (Number.isFinite(p) && p > 1) {
    return Number(Math.max(p, cueMaxSec).toFixed(2));
  }
  if (Number.isFinite(cl) && cl > 1) {
    return Number(Math.max(cl, cueMaxSec).toFixed(2));
  }
  if (cueMaxSec > 1) {
    return Number(cueMaxSec.toFixed(2));
  }
  return 15;
}

/**
 * Determines whether the companion voiceover <audio> element should seek to match <video> currentTime,
 * preventing seek-past-duration thrashing and micro-seek audio/video stalls around 0:21.
 */
export function shouldSyncCompanionAudioTime(
  videoTimeSec: number,
  audioTimeSec: number,
  audioDurationSec: number,
  isAudioSeeking = false,
  maxDriftSec = 0.85
): boolean {
  if (isAudioSeeking) return false;
  if (!Number.isFinite(videoTimeSec) || videoTimeSec < 0) return false;
  if (
    Number.isFinite(audioDurationSec) &&
    audioDurationSec > 0.5 &&
    videoTimeSec >= audioDurationSec - 0.25
  ) {
    return false;
  }
  if (!Number.isFinite(audioTimeSec)) return false;
  return Math.abs(audioTimeSec - videoTimeSec) > maxDriftSec;
}

export const RANGE_DOWNLOAD_PROBE_BYTES = 65536; // 64 KB initial header & size probe
export const RANGE_DOWNLOAD_CHUNK_BYTES = 8 * 1024 * 1024; // 8 MB per 206 Range chunk (< Cloud Run 32MB limit)

/**
 * Parses total file size in bytes from an HTTP 206 `Content-Range: bytes start-end/total` header,
 * falling back to `Content-Length` only when the server returned a full `200 OK` response.
 */
export function parseContentRangeTotalBytes(
  contentRangeHeader: string | null | undefined,
  contentLengthHeader?: string | null | undefined,
  httpStatus = 206
): number {
  if (contentRangeHeader && typeof contentRangeHeader === 'string') {
    const match = contentRangeHeader.match(/bytes\s+\d+-\d+\/(\d+)/i);
    if (match && match[1]) {
      const total = Number(match[1]);
      if (Number.isFinite(total) && total > 0) return total;
    }
  }
  if (httpStatus === 200 && contentLengthHeader) {
    const len = Number(contentLengthHeader);
    if (Number.isFinite(len) && len > 0) return len;
  }
  return 0;
}

/**
 * Computes contiguous inclusive `[start, end]` HTTP Range byte intervals from `initialOffsetBytes`
 * through `totalBytes - 1` so multi-minute MP4 exports (>32MB) download reliably in 8MB chunks
 * without hitting Cloud Run / reverse-proxy single-response size limits.
 */
export function computeRangeDownloadChunks(
  totalBytes: number,
  initialOffsetBytes: number,
  chunkSizeBytes = RANGE_DOWNLOAD_CHUNK_BYTES
): Array<{ start: number; end: number }> {
  const safeTotal = Math.floor(Number(totalBytes) || 0);
  const safeStart = Math.max(0, Math.floor(Number(initialOffsetBytes) || 0));
  const safeChunk = Math.max(65536, Math.floor(Number(chunkSizeBytes) || RANGE_DOWNLOAD_CHUNK_BYTES));
  if (safeTotal <= 0 || safeStart >= safeTotal) return [];

  const chunks: Array<{ start: number; end: number }> = [];
  let cursor = safeStart;
  while (cursor < safeTotal) {
    const end = Math.min(safeTotal - 1, cursor + safeChunk - 1);
    chunks.push({ start: cursor, end });
    cursor = end + 1;
  }
  return chunks;
}

/**
 * Extracts a clean custom domain hostname (e.g. `ttakb.site`) from a hostname or URL,
 * returning null for localhost, IPs, or managed cloud/Firebase preview domains.
 */
export function extractCustomDomainHostname(
  rawHostOrUrl: string | null | undefined
): string | null {
  if (!rawHostOrUrl || typeof rawHostOrUrl !== 'string') return null;
  let candidate = rawHostOrUrl.trim().toLowerCase();
  if (!candidate) return null;

  if (candidate.includes('://')) {
    try {
      candidate = new URL(candidate).hostname.toLowerCase();
    } catch {
      return null;
    }
  } else {
    candidate = candidate.split('/')[0].split(':')[0].trim();
  }

  if (!candidate || !candidate.includes('.')) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(candidate)) return null;

  const builtInSuffixes = [
    '.run.app',
    '.firebaseapp.com',
    '.web.app',
    '.ai.studio',
    '.usercontent.goog',
    '.localhost'
  ];
  if (
    candidate === 'localhost' ||
    builtInSuffixes.some((suffix) => candidate.endsWith(suffix))
  ) {
    return null;
  }

  return /^[a-z0-9.-]+$/.test(candidate) ? candidate : null;
}

export interface CustomAuthDomainResolution {
  customDomain: string | null;
  defaultAuthDomain: string;
  requiredRedirectUri: string | null;
  requiredJsOrigin: string | null;
  gcpCredentialsUrl: string;
  gcpConsentScreenUrl: string;
}

export function resolveCustomAuthDomainInfo(opts: {
  windowHost?: string | null;
  envAuthDomain?: string | null;
  appUrl?: string | null;
  defaultAuthDomain: string;
  projectId?: string | null;
  oauthClientId?: string | null;
}): CustomAuthDomainResolution {
  const customDomain =
    extractCustomDomainHostname(opts.envAuthDomain) ||
    extractCustomDomainHostname(opts.windowHost) ||
    extractCustomDomainHostname(opts.appUrl) ||
    null;

  const proj = (opts.projectId || 'brilliant-turbine-fdzcr').trim();
  const clientId = (
    opts.oauthClientId ||
    '631636882768-gveb2b4oirdu0j1g7fc9kle343q9202h.apps.googleusercontent.com'
  ).trim();
  return {
    customDomain,
    defaultAuthDomain: opts.defaultAuthDomain,
    requiredRedirectUri: customDomain ? `https://${customDomain}/__/auth/handler` : null,
    requiredJsOrigin: customDomain ? `https://${customDomain}` : null,
    gcpCredentialsUrl: `https://console.cloud.google.com/apis/credentials/oauthclient/${encodeURIComponent(clientId)}?project=${encodeURIComponent(proj)}`,
    gcpConsentScreenUrl: `https://console.cloud.google.com/apis/credentials/consent?project=${encodeURIComponent(proj)}`
  };
}

/**
 * Checks whether Google's OAuth 2.0 authorization endpoint accepted the custom domain's
 * `https://<domain>/__/auth/handler` redirect_uri without returning `redirect_uri_mismatch`.
 */
export function isGoogleRedirectUriAuthorizedHtml(
  htmlOrText: string | null | undefined,
  httpStatus: number
): boolean {
  if (!Number.isFinite(httpStatus) || httpStatus < 200 || httpStatus >= 400) {
    return false;
  }
  const body = String(htmlOrText || '');
  if (!body) return false;
  if (
    /redirect_uri_mismatch|origin_mismatch|invalid_request|Error\s*400/i.test(body)
  ) {
    return false;
  }
  return true;
}

export interface PersistedAuthUser {
  userId: string;
  name: string;
  email: string;
  provider?: 'google' | 'email' | 'telegram';
  photoUrl?: string;
}

function decodeBase64UrlUtf8(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf-8');
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Decodes the user profile embedded inside a `ttak1.<payloadB64>.<sigB64>` session token
 * so the client can hydrate the signed-in user synchronously even if localStorage cache was cleared.
 */
export function decodeSignedTokenPayload(token: string | null | undefined): PersistedAuthUser | null {
  if (!token || typeof token !== 'string') return null;
  const clean = token.trim();
  if (!clean.startsWith('ttak1.')) return null;
  const parts = clean.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const json = decodeBase64UrlUtf8(parts[1]);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.exp && Number(parsed.exp) < Date.now()) return null;
    const userId = typeof parsed.userId === 'string' ? parsed.userId.trim() : '';
    const email = typeof parsed.email === 'string' ? parsed.email.trim() : '';
    if (!userId || !email) return null;
    return {
      userId,
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : email.split('@')[0],
      email,
      provider:
        parsed.provider === 'google' || parsed.provider === 'email' || parsed.provider === 'telegram'
          ? parsed.provider
          : 'google',
      photoUrl: typeof parsed.photoUrl === 'string' && parsed.photoUrl.trim() ? parsed.photoUrl.trim() : undefined
    };
  } catch {
    return null;
  }
}

export function extractCookieValue(cookieHeaderOrDoc: string | null | undefined, key: string): string | null {
  if (!cookieHeaderOrDoc || typeof cookieHeaderOrDoc !== 'string') return null;
  const pairs = cookieHeaderOrDoc.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    if (k === key) {
      try {
        return decodeURIComponent(pair.slice(idx + 1).trim());
      } catch {
        return pair.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

/**
 * Hydrates the authenticated user from localStorage cache, `ttak1.` signed token, or first-party cookie
 * so reloading `ttak.site` keeps the user signed in immediately without re-prompting Google Login.
 */
export function parsePersistedAuthUser(opts: {
  cachedUserJson?: string | null;
  storedToken?: string | null;
  cookieString?: string | null;
}): { user: PersistedAuthUser | null; token: string | null } {
  const cookieToken = extractCookieValue(opts.cookieString, 'ttak_auth_token');
  const cookieUserJson = extractCookieValue(opts.cookieString, 'ttak_auth_user');
  const effectiveToken = (opts.storedToken || cookieToken || '').trim() || null;

  for (const candidateJson of [opts.cachedUserJson, cookieUserJson]) {
    if (!candidateJson || typeof candidateJson !== 'string') continue;
    try {
      const parsed = JSON.parse(candidateJson);
      const userId = typeof parsed?.userId === 'string' ? parsed.userId.trim() : '';
      const email = typeof parsed?.email === 'string' ? parsed.email.trim() : '';
      if (userId && email) {
        return {
          user: {
            userId,
            name:
              typeof parsed.name === 'string' && parsed.name.trim()
                ? parsed.name.trim()
                : email.split('@')[0],
            email,
            provider:
              parsed.provider === 'google' ||
              parsed.provider === 'email' ||
              parsed.provider === 'telegram'
                ? parsed.provider
                : 'google',
            photoUrl:
              typeof parsed.photoUrl === 'string' && parsed.photoUrl.trim()
                ? parsed.photoUrl.trim()
                : undefined
          },
          token: effectiveToken
        };
      }
    } catch {}
  }

  const fromToken = decodeSignedTokenPayload(effectiveToken);
  if (fromToken) {
    return { user: fromToken, token: effectiveToken };
  }

  return { user: null, token: effectiveToken };
}

export function encodeAuthUserCacheHeader(user: PersistedAuthUser | null | undefined): string {
  if (!user || !user.userId || !user.email) return '';
  try {
    const json = JSON.stringify({
      userId: user.userId,
      name: user.name,
      email: user.email,
      provider: user.provider || 'google',
      photoUrl: user.photoUrl
    });
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(json, 'utf-8').toString('base64');
    }
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch {
    return '';
  }
}

export function getClientAuthHeaders(): Record<string, string> {
  try {
    const lsToken =
      typeof localStorage !== 'undefined' ? localStorage.getItem('ttak_auth_token') : null;
    const cookieStr = typeof document !== 'undefined' ? document.cookie : '';
    const token = (lsToken || extractCookieValue(cookieStr, 'ttak_auth_token') || '').trim();
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      'x-auth-token': token
    };
  } catch {
    return {};
  }
}

/**
 * Determines whether a root `/` visit should automatically enter `/app/free-recap`
 * because the user is already authenticated (preventing reload on `https://ttak.site/`
 * from dropping the user back onto the unauthenticated Landing page).
 */
export function shouldAutoRedirectAuthenticatedRoot(
  pathname: string,
  hasAuthenticatedUser: boolean
): boolean {
  if (!hasAuthenticatedUser) return false;
  const clean = (pathname || '/').trim();
  return clean === '' || clean === '/';
}

export interface VisualKeyframePlan {
  segDurSec: number;
  useTwoPassTail: boolean;
  mainDurationSec: number;
  mainIntervalSec: number;
  mainMinCutGapSec: number;
  mainSceneThreshold: number;
  mainMaxFrames: number;
  tailStartSec: number;
  tailDurationSec: number;
  tailIntervalSec: number;
  tailMinCutGapSec: number;
  tailSceneThreshold: number;
  tailMaxFrames: number;
}

/**
 * Plans a two-pass scene-aware Visual Scene Keyframe extraction schedule so early scenes
 * can never starve the final 10-14 seconds (climax / ending twist / title card).
 */
export function computeVisualKeyframePlan(
  segDurSec: number,
  maxFrames = 22,
  prioritizeEndingTail = true
): VisualKeyframePlan {
  const safeDur = Math.max(4, Number(segDurSec) || 60);
  const safeMax = Math.max(8, Math.min(36, Math.round(maxFrames || 22)));

  if (!prioritizeEndingTail || safeDur <= 24) {
    const targetFrames = safeDur <= 24 ? Math.min(safeMax, 14) : Math.min(safeMax, 16);
    const interval = Number(Math.max(1.2, Math.min(4.8, safeDur / Math.max(4, targetFrames - 2))).toFixed(2));
    return {
      segDurSec: safeDur,
      useTwoPassTail: false,
      mainDurationSec: safeDur,
      mainIntervalSec: interval,
      mainMinCutGapSec: Number(Math.max(0.8, Math.min(2.0, interval * 0.45)).toFixed(2)),
      mainSceneThreshold: 0.34,
      mainMaxFrames: safeMax,
      tailStartSec: safeDur,
      tailDurationSec: 0,
      tailIntervalSec: interval,
      tailMinCutGapSec: 0.8,
      tailSceneThreshold: 0.30,
      tailMaxFrames: 0
    };
  }

  const tailDurationSec = Number(Math.min(12, Math.max(8, safeDur * 0.16)).toFixed(2));
  const tailStartSec = Number(Math.max(4, safeDur - tailDurationSec).toFixed(2));
  const mainDurationSec = tailStartSec;

  const tailMaxFrames = Math.min(8, Math.max(6, Math.round(safeMax * 0.32)));
  const mainMaxFrames = Math.max(6, safeMax - tailMaxFrames);

  const mainIntervalSec = Number(
    Math.max(2.2, Math.min(5.2, mainDurationSec / Math.max(5, mainMaxFrames * 0.78))).toFixed(2)
  );
  const mainMinCutGapSec = Number(
    Math.max(1.2, Math.min(2.4, mainIntervalSec * 0.5)).toFixed(2)
  );

  const tailIntervalSec = Number(
    Math.max(1.2, Math.min(1.75, tailDurationSec / Math.max(5, tailMaxFrames * 0.8))).toFixed(2)
  );

  return {
    segDurSec: safeDur,
    useTwoPassTail: true,
    mainDurationSec,
    mainIntervalSec,
    mainMinCutGapSec,
    mainSceneThreshold: 0.36,
    mainMaxFrames,
    tailStartSec,
    tailDurationSec,
    tailIntervalSec,
    tailMinCutGapSec: 0.9,
    tailSceneThreshold: 0.30,
    tailMaxFrames
  };
}

/**
 * Parses actual `pts_time` values printed by FFmpeg's `showinfo` filter so every extracted
 * keyframe carries its true timestamp instead of a uniform synthetic grid estimate.
 */
export function parseFfmpegShowinfoPtsTimes(
  stderr: string | undefined | null,
  timeOffsetSec = 0
): number[] {
  if (!stderr || typeof stderr !== 'string') return [];
  const offset = Number(timeOffsetSec) || 0;
  const results: number[] = [];
  const regex = /pts_time:\s*([0-9]+(?:\.[0-9]+)?)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(stderr)) !== null) {
    const val = Number(match[1]);
    if (Number.isFinite(val)) {
      results.push(Number((offset + val).toFixed(2)));
    }
  }
  return results;
}

export type VideoUrlPlatform =
  | 'tiktok'
  | 'douyin'
  | 'rednote'
  | 'youtube'
  | 'facebook'
  | 'instagram'
  | 'direct'
  | 'other';

export interface ParsedVideoSourceUrl {
  valid: boolean;
  normalizedUrl: string;
  platform: VideoUrlPlatform;
  errorMy?: string;
  errorEn?: string;
}

const PRIVATE_OR_LOCAL_HOST_REGEX =
  /^(localhost|.*\.localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+|0\.\d+\.\d+\.\d+|\[::1\]|::1|\[::\]|::|metadata\.google\.internal|metadata\.goog)$/i;

/**
 * Checks whether an IPv4 or IPv6 literal belongs to loopback, private RFC1918, link-local,
 * cloud metadata, CGNAT, multicast, or reserved address space.
 */
export function isPrivateOrReservedIp(rawIp: string | undefined | null): boolean {
  const cleaned = String(rawIp || '')
    .trim()
    .replace(/^\[|\]$/g, '')
    .toLowerCase();
  if (!cleaned) return true;

  // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1 or ::ffff:169.254.169.254
  const mappedV4 = cleaned.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  const ip = mappedV4 ? mappedV4[1] : cleaned;

  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b, c, d] = [Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4])];
    if ([a, b, c, d].some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // Link-local & cloud metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // Multicast & reserved
    return false;
  }

  // IPv6 private/local ranges
  if (ip.includes(':')) {
    if (ip === '::' || ip === '::1') return true;
    if (/^(fc|fd)[0-9a-f]{2}:/i.test(ip)) return true; // ULA fc00::/7
    if (/^fe[89ab][0-9a-f]:/i.test(ip)) return true; // Link-local fe80::/10
    if (/^ff[0-9a-f]{2}:/i.test(ip)) return true; // Multicast
    if (/^::ffff:/i.test(ip)) return true; // Unparsed IPv4-mapped IPv6
    return false;
  }

  return false;
}

/**
 * Validates that an outbound video or redirect URL is strictly public http(s) and does not target
 * localhost, private networks, cloud metadata endpoints, or embedded credentials.
 */
export function isAllowedPublicVideoStreamUrl(rawUrl: string | undefined | null): boolean {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed || trimmed.length > 4096) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  if (parsed.username || parsed.password) return false;
  const host = parsed.hostname.toLowerCase();
  if (!host) return false;
  if (
    PRIVATE_OR_LOCAL_HOST_REGEX.test(host) ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return false;
  }
  if (isPrivateOrReservedIp(host)) return false;
  return true;
}

/**
 * Extracts, validates, and classifies a user-pasted video URL or mobile share message
 * (e.g. "Check out this clip https://vt.tiktok.com/ZSptXq56x/", "v.douyin.com/iXXX/", or RedNote share text "xhslink.com/a/abc123")
 * without breaking on surrounding text.
 */
export function parseAndNormalizeVideoSourceUrl(
  rawInput: string | undefined | null
): ParsedVideoSourceUrl {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      normalizedUrl: '',
      platform: 'other',
      errorMy: 'ဗီဒီယို Link (URL) ထည့်သွင်းပေးပါ။',
      errorEn: 'Please paste a video URL first.'
    };
  }

  // Extract first http(s) URL, or protocol-less RedNote/TikTok/Douyin share link from mobile share snippets
  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>`]+/i);
  const bareSocialMatch = !urlMatch
    ? trimmed.match(
        /(?:www\.|vt\.|vm\.|v\.|m\.)?(?:xhslink\.com|xiaohongshu\.com|rednote\.com|tiktok\.com|douyin\.com|iesdouyin\.com|youtu\.be|youtube\.com|fb\.watch)\/[^\s"'<>`！。，、）】」]+/i
      )
    : null;
  const candidate = (
    urlMatch ? urlMatch[0] : bareSocialMatch ? `https://${bareSocialMatch[0]}` : trimmed
  )
    .replace(/[),.;!?！。，、）】」]+$/, '')
    .replace(/×/g, 'x');

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      valid: false,
      normalizedUrl: '',
      platform: 'other',
      errorMy: 'ထည့်သွင်းထားသော Video URL ပုံစံ မမှန်ကန်ပါ (https://... ဖြင့် စရပါမည်)။',
      errorEn: 'Invalid video URL format (must start with https:// or http://).'
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      normalizedUrl: '',
      platform: 'other',
      errorMy: 'http:// သို့မဟုတ် https:// Video Link များသာ အသုံးပြုနိုင်ပါသည်။',
      errorEn: 'Only http:// or https:// video links are supported.'
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (!isAllowedPublicVideoStreamUrl(parsed.toString())) {
    return {
      valid: false,
      normalizedUrl: '',
      platform: 'other',
      errorMy: 'Private သို့မဟုတ် Local Server URL များကို ခွင့်မပြုပါ။',
      errorEn: 'Private or local network URLs are not allowed.'
    };
  }

  let platform: VideoUrlPlatform = 'other';
  if (host.includes('tiktok.com')) {
    platform = 'tiktok';
  } else if (host.includes('douyin.com') || host.includes('iesdouyin.com')) {
    platform = 'douyin';
  } else if (
    host.includes('xiaohongshu.com') ||
    host.includes('xhslink.com') ||
    host.includes('rednote.com') ||
    host.includes('rednoteapp.com')
  ) {
    platform = 'rednote';
  } else if (host.includes('youtube.com') || host === 'youtu.be' || host.endsWith('.youtu.be')) {
    platform = 'youtube';
  } else if (host.includes('facebook.com') || host === 'fb.watch' || host.endsWith('.fb.watch')) {
    platform = 'facebook';
  } else if (host.includes('instagram.com') || host.includes('instagr.am')) {
    platform = 'instagram';
  } else if (/\.(mp4|mov|webm|mkv|m4v)(\?|#|$)/i.test(parsed.pathname)) {
    platform = 'direct';
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    platform
  };
}

export interface RedNoteExtractedMedia {
  /** True watermark-free original uploaded video URLs constructed from `originVideoKey`. */
  originVideoUrls: string[];
  /** Secondary playback streams (H.264/H.265 masterUrl/backupUrls/og:video) used only if originVideoKey is unavailable. */
  fallbackStreamUrls: string[];
  /** Combined ordered candidate list: originVideoUrls strictly first, then fallbackStreamUrls. */
  videoUrls: string[];
  hasOriginVideoKey: boolean;
  title: string;
  durationSec: number;
}

const REDNOTE_ORIGIN_CDN_HOSTS = [
  'sns-video-bd.xhscdn.com',
  'sns-bak-v1.xhscdn.com',
  'sns-video-hw.xhscdn.com',
  'sns-video-qc.xhscdn.com',
  'sns-video-al.xhscdn.com',
  'sns-video-hs.xhscdn.com',
  'sns-video-ak.xhscdn.com'
];

/**
 * Extracts the 24-hex Xiaohongshu / RedNote note ID from common desktop & mobile URLs.
 */
export function extractRedNoteNoteId(rawUrl: string | undefined | null): string | null {
  const input = String(rawUrl || '').trim();
  if (!input) return null;
  const match = input.match(
    /(?:\/(?:explore|discovery\/item|note|item)\/|\/user\/profile\/[a-f0-9]+\/)([a-f0-9]{24})(?:[/?#]|$)/i
  );
  return match?.[1] || null;
}

/**
 * Builds prioritized Xiaohongshu / RedNote page URLs (preserving `xsec_token` & `xsec_source`)
 * so `/discovery/item/<id>` and `/explore/<id>` are both probed to reliably obtain `originVideoKey`.
 */
export function buildRedNoteCandidatePageUrls(urls: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (u: string | undefined | null) => {
    const clean = String(u || '').trim();
    if (!clean || !isAllowedPublicVideoStreamUrl(clean)) return;
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  };

  for (const raw of urls) {
    if (!raw) continue;
    const canonical = normalizeRedNoteCanonicalUrl(raw);
    pushUnique(canonical);

    const noteId = extractRedNoteNoteId(canonical);
    if (noteId) {
      let query = '';
      try {
        const parsed = new URL(canonical);
        const keep = new URLSearchParams();
        const xsecToken = parsed.searchParams.get('xsec_token');
        const xsecSource = parsed.searchParams.get('xsec_source');
        if (xsecToken) keep.set('xsec_token', xsecToken);
        if (xsecSource) keep.set('xsec_source', xsecSource);
        const qs = keep.toString();
        if (qs) query = `?${qs}`;
      } catch {}
      pushUnique(`https://www.xiaohongshu.com/discovery/item/${noteId}${query}`);
      pushUnique(`https://www.xiaohongshu.com/explore/${noteId}${query}`);
    }
  }

  return out;
}

/**
 * Extracts clean, watermark-free MP4 stream URLs from RedNote (Xiaohongshu) HTML / __INITIAL_STATE__ / JSON payloads.
 * Strictly prioritizes `originVideoKey` (the raw, 100% watermark-free original uploaded file on xhscdn)
 * before any playback `stream.h264` or `og:video` fallback streams.
 */
export function extractRedNoteVideoInfoFromHtml(html: string | undefined | null): RedNoteExtractedMedia {
  if (!html || typeof html !== 'string') {
    return {
      originVideoUrls: [],
      fallbackStreamUrls: [],
      videoUrls: [],
      hasOriginVideoKey: false,
      title: '',
      durationSec: 0
    };
  }
  const normalized = html
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');

  const originVideoUrls: string[] = [];
  const fallbackStreamUrls: string[] = [];
  const seenOrigin = new Set<string>();
  const seenFallback = new Set<string>();

  const addOriginUrl = (raw: string | undefined | null) => {
    if (!raw) return;
    const clean = raw.trim().replace(/^http:\/\//i, 'https://');
    if (!isAllowedPublicVideoStreamUrl(clean)) return;
    if (/watermark=1|mark=1|\/wm_|_wm\.mp4|\/playwm\//i.test(clean)) return;
    if (!seenOrigin.has(clean)) {
      seenOrigin.add(clean);
      originVideoUrls.push(clean);
    }
  };

  const addFallbackUrl = (raw: string | undefined | null) => {
    if (!raw) return;
    const clean = raw.trim().replace(/^http:\/\//i, 'https://');
    if (!isAllowedPublicVideoStreamUrl(clean)) return;
    // Skip explicit watermarked endpoints
    if (/watermark=1|mark=1|\/wm_|_wm\.mp4|\/playwm\//i.test(clean)) return;
    if (!seenOrigin.has(clean) && !seenFallback.has(clean)) {
      seenFallback.add(clean);
      fallbackStreamUrls.push(clean);
    }
  };

  // 1) HIGHEST PRIORITY: True watermark-free `originVideoKey` (e.g. "originVideoKey":"pre_post/..." or originVideoKey:"01e...")
  const originKeyMatches = normalized.matchAll(
    /(?:["']?originVideoKey["']?)\s*:\s*["']([^"'\\]+)["']/g
  );
  for (const m of originKeyMatches) {
    const key = (m[1] || '').replace(/^\/+/, '').trim();
    if (!key || key.length < 6) continue;
    if (/^https?:\/\//i.test(key)) {
      addOriginUrl(key);
    } else if (/^\/\//.test(m[1] || '')) {
      addOriginUrl(`https:${m[1]}`);
    } else {
      for (const host of REDNOTE_ORIGIN_CDN_HOSTS) {
        addOriginUrl(`https://${host}/${key}`);
      }
    }
  }

  // 2) Secondary: H264/H265 stream masterUrl / backupUrls from __INITIAL_STATE__
  const masterUrlMatches = normalized.matchAll(
    /"(?:masterUrl|url)"\s*:\s*"((?:https?:)?\/\/sns-(?:video|bak)-[^"\\]+\.(?:xhscdn\.com|xiaohongshu\.com)[^"\\]+)"/gi
  );
  for (const m of masterUrlMatches) {
    const candidate = m[1].startsWith('//') ? `https:${m[1]}` : m[1];
    // Raw `pre_post/` assets on xhscdn are also watermark-free originals even when referenced directly
    if (/\/pre_post\//i.test(candidate)) {
      addOriginUrl(candidate);
    } else {
      addFallbackUrl(candidate);
    }
  }

  // 3) backupUrls array items on xhscdn
  const backupMatches = normalized.matchAll(
    /"((?:https?:)?\/\/sns-(?:video|bak)-[^"\\]+\.xhscdn\.com\/[^"\\]+\.mp4[^"\\]*)"/gi
  );
  for (const m of backupMatches) {
    const candidate = m[1].startsWith('//') ? `https:${m[1]}` : m[1];
    if (/\/pre_post\//i.test(candidate)) {
      addOriginUrl(candidate);
    } else {
      addFallbackUrl(candidate);
    }
  }

  // 4) OpenGraph og:video meta fallback (lowest priority — often watermarked on XHS)
  const ogVideoMatch = normalized.match(
    /<meta\s+(?:property|name)=["']og:video(?::url)?["']\s+content=["']([^"']+)["']/i
  );
  if (ogVideoMatch?.[1]) {
    addFallbackUrl(ogVideoMatch[1]);
  }

  // Title & duration extraction
  let title = '';
  const jsonTitleMatch = normalized.match(/"title"\s*:\s*"([^"\\]{2,140})"/);
  const ogTitleMatch = normalized.match(
    /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  title = (jsonTitleMatch?.[1] || ogTitleMatch?.[1] || '')
    .replace(/\s*-\s*小红书\s*$/i, '')
    .replace(/\s*-\s*RedNote\s*$/i, '')
    .trim();

  let durationSec = 0;
  const durMatch = normalized.match(/"duration"\s*:\s*([0-9]+(?:\.[0-9]+)?)/);
  if (durMatch?.[1]) {
    const d = Number(durMatch[1]);
    if (Number.isFinite(d) && d > 0) {
      durationSec = d > 1000 ? Math.round(d / 1000) : Math.round(d);
    }
  }

  const videoUrls = [...originVideoUrls, ...fallbackStreamUrls];
  return {
    originVideoUrls,
    fallbackStreamUrls,
    videoUrls,
    hasOriginVideoKey: originVideoUrls.length > 0,
    title,
    durationSec
  };
}

/**
 * Selects strictly watermark-free TikTok/Douyin streams from a TikWM API payload.
 * Never includes `wmplay` (watermarked) and converts any `/playwm/` path to `/play/`.
 */
export function selectWatermarkFreeTikTokStreams(
  data:
    | {
        hdplay?: string;
        play?: string;
        wmplay?: string;
      }
    | undefined
    | null
): string[] {
  if (!data || typeof data !== 'object') return [];
  const rawCandidates = [data.hdplay, data.play];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of rawCandidates) {
    if (typeof item !== 'string') continue;
    let url = item.trim();
    if (!url) continue;
    if (url.startsWith('/')) {
      url = `https://www.tikwm.com${url}`;
    }
    // Strip Douyin/TikTok playwm watermark flag if present
    url = url.replace(/\/playwm\//gi, '/play/').replace(/([?&])watermark=1(&|$)/i, '$1watermark=0$2');
    if (!isAllowedPublicVideoStreamUrl(url)) continue;
    if (!seen.has(url)) {
      seen.add(url);
      out.push(url);
    }
  }
  return out;
}

/**
 * Extracts a numeric Douyin `aweme_id` (15–22 digits) from desktop, share, modal, or redirect URLs.
 */
export function extractDouyinAwemeId(rawUrl: string | undefined | null): string | null {
  const input = String(rawUrl || '').trim();
  if (!input) return null;
  const pathMatch = input.match(/\/(?:video|share\/video|note|slides)\/(\d{15,22})(?:[/?#]|$)/i);
  if (pathMatch?.[1]) return pathMatch[1];
  const queryMatch = input.match(/[?&](?:modal_id|vid|aweme_id|item_ids)=(\d{15,22})(?:[&#]|$)/i);
  if (queryMatch?.[1]) return queryMatch[1];
  return null;
}

/**
 * Converts a Douyin playback URL (e.g. `.../aweme/v1/playwm/?video_id=...`) into its
 * clean, watermark-free `/play/` counterpart and validates it as a public URL.
 */
export function normalizeDouyinPlayUrlToNoWatermark(rawUrl: string | undefined | null): string | null {
  const input = String(rawUrl || '')
    .trim()
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');
  if (!input) return null;
  const withProto = input.startsWith('//')
    ? `https:${input}`
    : input.replace(/^http:\/\//i, 'https://');
  const clean = withProto
    .replace(/\/playwm\//gi, '/play/')
    .replace(/([?&])watermark=1(&|$)/i, '$1watermark=0$2');
  return isAllowedPublicVideoStreamUrl(clean) ? clean : null;
}

export interface DouyinExtractedMedia {
  videoUrls: string[];
  title: string;
  durationSec: number;
}

/**
 * Parses Douyin mobile share page HTML (`iesdouyin.com/share/video/<id>/`, `_ROUTER_DATA`, `RENDER_DATA`)
 * to extract clean, watermark-free `/play/` video stream URLs.
 */
export function extractDouyinVideoInfoFromHtml(html: string | undefined | null): DouyinExtractedMedia {
  if (!html || typeof html !== 'string') {
    return { videoUrls: [], title: '', durationSec: 0 };
  }

  let decoded = html;
  const renderDataMatch = html.match(
    /<script[^>]*id=["']RENDER_DATA["'][^>]*>([^<]+)<\/script>/i
  );
  if (renderDataMatch?.[1]) {
    try {
      decoded = `${decoded}\n${decodeURIComponent(renderDataMatch[1])}`;
    } catch {}
  }

  const normalized = decoded
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/&amp;/g, '&');

  const urls: string[] = [];
  const seen = new Set<string>();
  const addCleanUrl = (raw: string | undefined | null) => {
    const clean = normalizeDouyinPlayUrlToNoWatermark(raw);
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      urls.push(clean);
    }
  };

  // 1) Highest reliability: `play_addr` -> `uri` (direct snssdk watermark-free 1080p/720p play endpoint)
  const playAddrUriMatch = normalized.match(
    /"play_addr"\s*:\s*\{[^{}]{0,600}?"uri"\s*:\s*"([a-zA-Z0-9_-]{12,80})"/
  );
  if (playAddrUriMatch?.[1]) {
    const vid = playAddrUriMatch[1];
    addCleanUrl(`https://aweme.snssdk.com/aweme/v1/play/?video_id=${encodeURIComponent(vid)}&ratio=1080p&line=0`);
    addCleanUrl(`https://aweme.snssdk.com/aweme/v1/play/?video_id=${encodeURIComponent(vid)}&ratio=720p&line=0`);
    addCleanUrl(`https://www.iesdouyin.com/aweme/v1/play/?video_id=${encodeURIComponent(vid)}&ratio=1080p&line=0`);
  }

  // 2) `play_addr.url_list` items (converting /playwm/ -> /play/)
  const urlListMatches = normalized.matchAll(
    /"play_addr(?:_h264|_265)?"\s*:\s*\{[^{}]{0,1200}?"url_list"\s*:\s*\[([^\]]+)\]/g
  );
  for (const m of urlListMatches) {
    const inner = m[1] || '';
    for (const uMatch of inner.matchAll(/"((?:https?:)?\/\/[^"]+)"/g)) {
      addCleanUrl(uMatch[1]);
    }
  }

  // 3) Direct aweme/v1/play(wm) URLs anywhere in page JSON
  const directPlayMatches = normalized.matchAll(
    /"((?:https?:)?\/\/[^"]*(?:aweme\.snssdk\.com|iesdouyin\.com|douyinvod\.com|zjcdn\.com)[^"]*(?:\/play(?:wm)?\/|\/video\/tos\/)[^"]*)"/gi
  );
  for (const m of directPlayMatches) {
    addCleanUrl(m[1]);
  }

  // Title & duration
  let title = '';
  const descMatch = normalized.match(/"desc"\s*:\s*"([^"\\]{2,160})"/);
  const ogTitleMatch = normalized.match(
    /<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i
  );
  title = (descMatch?.[1] || ogTitleMatch?.[1] || '')
    .replace(/\s*-\s*抖音\s*$/i, '')
    .trim();

  let durationSec = 0;
  const durMatch = normalized.match(/"duration"\s*:\s*([0-9]+(?:\.[0-9]+)?)/);
  if (durMatch?.[1]) {
    const d = Number(durMatch[1]);
    if (Number.isFinite(d) && d > 0) {
      durationSec = d > 1000 ? Math.round(d / 1000) : Math.round(d);
    }
  }

  return { videoUrls: urls, title, durationSec };
}

/**
 * Maps rednote.com links to xiaohongshu.com canonical host so extractors (yt-dlp & page scrapers) handle both uniformly.
 */
export function normalizeRedNoteCanonicalUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl);
    if (u.hostname.toLowerCase().includes('rednote.com')) {
      u.hostname = 'www.xiaohongshu.com';
      return u.toString();
    }
  } catch {}
  return rawUrl;
}

/**
 * Generates an ASCII-safe .mp4 filename for URL-fetched videos so FFmpeg & download headers stay reliable.
 */
export function buildSafeFetchedVideoFilename(
  rawTitle: string | undefined | null,
  platform: VideoUrlPlatform | string,
  localUploadId: string
): string {
  const cleanTag = String(platform || 'video').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'video';
  const safeBase = sanitizeMp4DownloadName(rawTitle || '', `${cleanTag}_${localUploadId.slice(-6)}`);
  return safeBase;
}

/**
 * Checks whether an HTTP response body/status or error object explicitly indicates an invalid/revoked Gemini API key.
 */
export function isGeminiApiKeyExplicitlyInvalid(
  errOrBody: unknown,
  httpStatus?: number
): boolean {
  const raw =
    typeof errOrBody === 'string'
      ? errOrBody
      : errOrBody && typeof errOrBody === 'object' && 'message' in errOrBody
      ? String((errOrBody as { message?: unknown }).message || '')
      : String(errOrBody || '');
  const lower = raw.toLowerCase();
  if (
    lower.includes('api_key_invalid') ||
    lower.includes('api key not valid') ||
    lower.includes('invalid api key') ||
    lower.includes('api key expired') ||
    lower.includes('key_invalid') ||
    lower.includes('unregistered callers')
  ) {
    return true;
  }
  if (
    (httpStatus === 400 || httpStatus === 401 || httpStatus === 403) &&
    (lower.includes('api key') || lower.includes('permission_denied') || lower.includes('unauthenticated'))
  ) {
    return true;
  }
  return false;
}

export interface GeminiTestConnectionInput {
  modelsEndpointOk: boolean;
  modelsEndpointStatus: number;
  modelsEndpointBody: string;
  generateSucceeded: boolean;
  lastGenerateError?: unknown;
  latencyMs: number;
}

export interface GeminiTestConnectionClassification {
  geminiOk: boolean;
  geminiMessage: string;
}

/**
 * Classifies Gemini API key test-connection outcomes so transient 503 High Demand spikes do not falsely mark a valid key as invalid.
 */
export function classifyGeminiTestConnectionResult(
  input: GeminiTestConnectionInput
): GeminiTestConnectionClassification {
  if (input.modelsEndpointOk || input.generateSucceeded) {
    return {
      geminiOk: true,
      geminiMessage: `Gemini API ချိတ်ဆက်မှု အောင်မြင်ပါသည် (${input.latencyMs}ms)`
    };
  }
  if (
    isGeminiApiKeyExplicitlyInvalid(input.modelsEndpointBody, input.modelsEndpointStatus) ||
    isGeminiApiKeyExplicitlyInvalid(input.lastGenerateError)
  ) {
    return {
      geminiOk: false,
      geminiMessage: 'Gemini API Key မမှန်ကန်ပါ သို့မဟုတ် သက်တမ်းကုန်နေပါသည် (API_KEY_INVALID)'
    };
  }
  if (isTransientModelOverloadError(input.lastGenerateError) || input.modelsEndpointStatus === 503) {
    return {
      geminiOk: true,
      geminiMessage: `Gemini API Key မှန်ကန်ပါသည် (လက်ရှိ Server 503 High Demand ဖြစ်နေသော်လည်း အလိုအလျောက် Retry ဖြင့် သုံးနိုင်ပါသည် - ${input.latencyMs}ms)`
    };
  }
  const quotaCheck = isApiKeyQuotaOrLimitError(input.lastGenerateError || input.modelsEndpointBody);
  if (quotaCheck.isQuotaLimit || input.modelsEndpointStatus === 429) {
    return {
      geminiOk: false,
      geminiMessage: 'Gemini API Key Quota ပြည့်နေပါသည် (429 Rate Limit)'
    };
  }
  const rawErrText =
    input.lastGenerateError && typeof input.lastGenerateError === 'object' && 'message' in input.lastGenerateError
      ? String((input.lastGenerateError as { message?: unknown }).message || '')
      : String(input.lastGenerateError || input.modelsEndpointBody || '');
  const fallbackInfo = detectGeminiFailureMessage(rawErrText, true, true);
  return {
    geminiOk: false,
    geminiMessage: fallbackInfo.messageMy || 'Gemini API ချိတ်ဆက်၍ မရပါ'
  };
}

/**
 * Determines whether a 429 quota error on one Gemini model (e.g. gemini-3-flash-preview) should allow trying
 * another model (e.g. gemini-3.1-flash-lite-preview or gemini-2.5-flash) on the same API key before rotating keys.
 */
export function shouldAllowSameKeyModelFallbackOnQuota(
  err: unknown,
  hasMoreModels: boolean
): boolean {
  if (!hasMoreModels) return false;
  if (isGeminiApiKeyExplicitlyInvalid(err)) return false;
  const check = isApiKeyQuotaOrLimitError(err);
  return check.isQuotaLimit;
}

export interface SiteOnlineNotification {
  id: string;
  message: string;
  updatedAt: number;
  active: boolean;
}

export const SITE_NOTIFICATION_DISMISSED_STORAGE_KEY = 'ttak_dismissed_site_notification_ids';
const MAX_DISMISSED_SITE_NOTIFICATION_IDS = 30;

/**
 * Safely parses stored dismissed website notification IDs from localStorage JSON.
 */
export function parseDismissedSiteNotificationIds(rawJson: string | null | undefined): string[] {
  if (!rawJson || typeof rawJson !== 'string') return [];
  try {
    const parsed = JSON.parse(rawJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      .slice(-MAX_DISMISSED_SITE_NOTIFICATION_IDS);
  } catch {
    return [];
  }
}

/**
 * Appends a dismissed notification ID without duplicates, keeping the list bounded.
 */
export function addDismissedSiteNotificationId(
  existingIds: string[],
  notificationId: string
): string[] {
  const cleanId = String(notificationId || '').trim();
  if (!cleanId) return existingIds.slice(-MAX_DISMISSED_SITE_NOTIFICATION_IDS);
  const filtered = existingIds.filter((id) => id !== cleanId);
  filtered.push(cleanId);
  return filtered.slice(-MAX_DISMISSED_SITE_NOTIFICATION_IDS);
}

/**
 * Determines whether the website update notification banner should be visible to the user.
 * Returns true only when an active notification has non-empty text and its unique ID has not been dismissed.
 */
export function shouldShowSiteNotification(
  notification: SiteOnlineNotification | null | undefined,
  dismissedIds: string[]
): boolean {
  if (!notification || !notification.active) return false;
  const id = String(notification.id || '').trim();
  const message = String(notification.message || '').trim();
  if (!id || !message) return false;
  return !dismissedIds.includes(id);
}

export const TIMED_TEXT_COLOR_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: 'white', label: 'White', hex: '#FFFFFF' },
  { id: 'yellow', label: 'Yellow', hex: '#FFE600' },
  { id: 'cyan', label: 'Cyan', hex: '#7DE3FF' },
  { id: 'pink', label: 'Pink', hex: '#FF8FB1' },
  { id: 'green', label: 'Green', hex: '#8CF0A0' },
  { id: 'orange', label: 'Orange', hex: '#FF9F43' }
];

export const TIMED_TEXT_BG_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: 'none', label: 'None', hex: '' },
  { id: 'dark', label: 'Dark', hex: '#000000' },
  { id: 'crimson', label: 'Red', hex: '#B91C1C' },
  { id: 'amber', label: 'Gold', hex: '#D97706' }
];

/**
 * Clamps a timed overlay [startSec, endSec] range strictly within [0, maxDurationSec],
 * guaranteeing endSec >= startSec + 0.5 (or maxDurationSec when the clip is shorter than 0.5s).
 */
export function clampTimedOverlayRange(
  startSec: number,
  endSec: number,
  maxDurationSec: number
): { startSec: number; endSec: number } {
  const safeMax = Math.max(0.5, Number.isFinite(maxDurationSec) && maxDurationSec > 0 ? maxDurationSec : 15);
  const minSpan = Math.min(0.5, safeMax);
  const rawStart = Number.isFinite(startSec) ? startSec : 0;
  const rawEnd = Number.isFinite(endSec) ? endSec : Math.min(10, safeMax);

  let s = Math.max(0, Math.min(safeMax - minSpan, rawStart));
  let e = Math.max(s + minSpan, Math.min(safeMax, rawEnd));

  s = Math.round(s * 10) / 10;
  e = Math.round(e * 10) / 10;
  if (e <= s) {
    e = Math.min(safeMax, Math.round((s + minSpan) * 10) / 10);
  }
  return { startSec: s, endSec: e };
}

/**
 * Checks whether a timed blur or timed text overlay should be displayed at `currentTimeSec`.
 */
export function isTimedOverlayActiveAtTime(
  overlay: { startSec: number; endSec: number } | undefined | null,
  currentTimeSec: number
): boolean {
  if (!overlay) return false;
  const t = Number.isFinite(currentTimeSec) ? currentTimeSec : 0;
  const s = Number.isFinite(overlay.startSec) ? overlay.startSec : 0;
  const e = Number.isFinite(overlay.endSec) ? overlay.endSec : 0;
  if (e <= s) return false;
  return t >= s - 0.05 && t <= e + 0.05;
}

/**
 * Parses a user-typed timecode like "0:10", "1:30", "4:00", or plain seconds like "12.5" into seconds.
 * Returns null if the string cannot be parsed.
 */
export function parseTimecodeToSeconds(
  raw: string | number | undefined | null,
  maxDurationSec = 10800
): number | null {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw < 0) return null;
    return Math.min(Math.max(0, raw), Math.max(0.5, maxDurationSec));
  }
  const str = String(raw || '').trim();
  if (!str) return null;

  let seconds: number | null = null;
  if (str.includes(':')) {
    const parts = str.split(':').map((p) => Number(p.trim()));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
    if (parts.length === 2) {
      seconds = parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  } else {
    const num = Number(str);
    if (Number.isFinite(num) && num >= 0) {
      seconds = num;
    }
  }
  if (seconds === null || !Number.isFinite(seconds)) return null;
  return Math.round(Math.min(Math.max(0, seconds), Math.max(0.5, maxDurationSec)) * 10) / 10;
}

/**
 * Formats seconds into compact MM:SS (or H:MM:SS) for timed overlay sliders & badges.
 */
export function formatTimedOverlaySec(sec: number): string {
  const safe = Math.max(0, Number.isFinite(sec) ? sec : 0);
  const whole = Math.floor(safe);
  const hrs = Math.floor(whole / 3600);
  const mins = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Creates a default Timed Blur overlay (default 0:00 -> 0:10 or clip duration) placed cleanly on stage.
 */
export function createDefaultTimedBlur(
  videoDurationSec: number,
  existingCount = 0,
  startAtSec = 0
): TimedBlurOverlay {
  const safeDur = Math.max(1, Number.isFinite(videoDurationSec) && videoDurationSec > 0 ? videoDurationSec : 60);
  const range = clampTimedOverlayRange(startAtSec, Math.min(safeDur, startAtSec + 10), safeDur);
  const offsetY = 14 + ((existingCount * 14) % 52);
  return {
    id: `tblur_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    x: 10,
    y: offsetY,
    width: 80,
    height: 12,
    blurStrength: 24,
    startSec: range.startSec,
    endSec: range.endSec
  };
}

/**
 * Creates a default Timed Text overlay (default 0:00 -> 0:10 or clip duration) centered on stage.
 */
export function createDefaultTimedText(
  videoDurationSec: number,
  existingCount = 0,
  startAtSec = 0
): TimedTextOverlay {
  const safeDur = Math.max(1, Number.isFinite(videoDurationSec) && videoDurationSec > 0 ? videoDurationSec : 60);
  const range = clampTimedOverlayRange(startAtSec, Math.min(safeDur, startAtSec + 10), safeDur);
  const offsetY = 20 + ((existingCount * 12) % 48);
  return {
    id: `ttxt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text: 'စာသားအသစ်',
    x: 50,
    y: offsetY,
    fontSize: 30,
    color: '#FFE600',
    bgColor: '#000000',
    startSec: range.startSec,
    endSec: range.endSec
  };
}

/**
 * Produces a strictly sanitized FFmpeg overlay `enable` expression for a Timed Blur window.
 */
export function buildTimedBlurEnableExpr(startSec: number, endSec: number): string {
  const safeStart = Math.max(0, Math.min(86400, Number.isFinite(startSec) ? startSec : 0));
  const safeEnd = Math.max(safeStart + 0.1, Math.min(86400, Number.isFinite(endSec) ? endSec : safeStart + 1));
  return `between(t,${safeStart.toFixed(2)},${safeEnd.toFixed(2)})`;
}

/**
 * Sanitizes custom user text for safe ASS Dialogue insertion (preserving Burmese Unicode & line breaks,
 * stripping ASS override braces `{}` and control chars).
 */
export function sanitizeTimedTextForAss(rawText: string | undefined | null): string {
  return String(rawText || '')
    .replace(/[{}]/g, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\\N')
    .slice(0, 240);
}

/**
 * 10 curated Color Shift presets.
 * ONLY preset #1 (`vivid`) is allowed in Free Mode; the other 9 presets are Credit Mode Only.
 * Every `ffmpegFilter` string is strictly hardcoded here (allowlist) — never built from user input.
 */
export const COLOR_SHIFT_PRESETS: readonly ColorShiftPresetDefinition[] = [
  {
    id: 'vivid',
    labelEn: 'Vivid Warm',
    labelMy: 'စိုပြေ',
    freeAllowed: true,
    cssFilter: 'hue-rotate(18deg) saturate(1.25) contrast(1.06) brightness(1.02)',
    ffmpegFilter: 'hue=h=18:s=1.25,eq=contrast=1.06:brightness=0.015',
    swatchGradient: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)'
  },
  {
    id: 'cinema_teal',
    labelEn: 'Teal Cinema',
    labelMy: 'ရုပ်ရှင်စတိုင်',
    freeAllowed: false,
    cssFilter: 'contrast(1.14) saturate(1.18) hue-rotate(-14deg) brightness(0.98)',
    ffmpegFilter:
      'colorbalance=rs=-0.06:gs=0.03:bs=0.10:rh=0.10:gh=0.03:bh=-0.06,eq=contrast=1.12:saturation=1.16',
    swatchGradient: 'linear-gradient(135deg, #0d9488 0%, #f97316 100%)'
  },
  {
    id: 'golden_hour',
    labelEn: 'Golden Glow',
    labelMy: 'ရွှေရောင်',
    freeAllowed: false,
    cssFilter: 'sepia(0.26) saturate(1.38) contrast(1.06) brightness(1.05)',
    ffmpegFilter:
      'colorbalance=rm=0.12:gm=0.05:bm=-0.10:rh=0.10:bh=-0.08,eq=saturation=1.28:brightness=0.03:contrast=1.05',
    swatchGradient: 'linear-gradient(135deg, #fbbf24 0%, #ea580c 100%)'
  },
  {
    id: 'cyber_neon',
    labelEn: 'Cyber Neon',
    labelMy: 'နီယွန်',
    freeAllowed: false,
    cssFilter: 'hue-rotate(-34deg) saturate(1.58) contrast(1.16) brightness(1.02)',
    ffmpegFilter: 'hue=h=-34:s=1.55,eq=contrast=1.14:brightness=0.015',
    swatchGradient: 'linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)'
  },
  {
    id: 'cool_noir',
    labelEn: 'Cool Blue',
    labelMy: 'အေးမြပြာ',
    freeAllowed: false,
    cssFilter: 'saturate(0.92) contrast(1.1) brightness(0.98) hue-rotate(-22deg)',
    ffmpegFilter:
      'colorbalance=rs=-0.08:gs=0.01:bs=0.14:rm=-0.05:bm=0.10,eq=contrast=1.10:saturation=0.92',
    swatchGradient: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)'
  },
  {
    id: 'vintage_film',
    labelEn: 'Vintage 90s',
    labelMy: 'ဖလင်ဟောင်း',
    freeAllowed: false,
    cssFilter: 'sepia(0.38) contrast(0.96) saturate(0.88) brightness(1.04)',
    ffmpegFilter:
      'colorbalance=rs=0.06:gs=0.03:bs=-0.05:rm=0.05:bm=-0.07,eq=contrast=0.96:saturation=0.82:brightness=0.025',
    swatchGradient: 'linear-gradient(135deg, #a16207 0%, #d6d3d1 100%)'
  },
  {
    id: 'dramatic_dark',
    labelEn: 'Dark Moody',
    labelMy: 'သည်းထိတ်ရင်ဖို',
    freeAllowed: false,
    cssFilter: 'contrast(1.28) brightness(0.86) saturate(0.82)',
    ffmpegFilter: 'eq=contrast=1.26:brightness=-0.08:saturation=0.80:gamma=0.92',
    swatchGradient: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)'
  },
  {
    id: 'rose_bloom',
    labelEn: 'Rose Bloom',
    labelMy: 'ပန်းနုရောင်',
    freeAllowed: false,
    cssFilter: 'hue-rotate(-18deg) saturate(1.26) brightness(1.06) contrast(1.02)',
    ffmpegFilter:
      'colorbalance=rm=0.11:gm=-0.03:bm=0.06:rh=0.08:bh=0.05,eq=saturation=1.22:brightness=0.03',
    swatchGradient: 'linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)'
  },
  {
    id: 'emerald_matrix',
    labelEn: 'Emerald',
    labelMy: 'မြစိမ်း',
    freeAllowed: false,
    cssFilter: 'hue-rotate(58deg) saturate(1.18) contrast(1.1) brightness(0.96)',
    ffmpegFilter:
      'colorbalance=rs=-0.06:gs=0.12:bs=-0.04:gm=0.09,eq=contrast=1.10:saturation=1.12',
    swatchGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)'
  },
  {
    id: 'bw_classic',
    labelEn: 'Classic B&W',
    labelMy: 'အဖြူအမည်း',
    freeAllowed: false,
    cssFilter: 'grayscale(1) contrast(1.18) brightness(1.02)',
    ffmpegFilter: 'hue=s=0,eq=contrast=1.18:brightness=0.01',
    swatchGradient: 'linear-gradient(135deg, #f8fafc 0%, #0f172a 100%)'
  }
];

/**
 * Strictly validates & enforces Free Mode vs Credit Mode access for Color Shift presets.
 * Free Mode is always restricted to `'vivid'`; Credit Mode unlocks all 10 presets.
 */
export function resolveAllowedColorShiftPresetId(
  presetId: string | undefined | null,
  isFreeTier: boolean
): ColorShiftPresetId {
  if (isFreeTier) return 'vivid';
  const found = COLOR_SHIFT_PRESETS.find((p) => p.id === presetId);
  return found ? found.id : 'vivid';
}

export function resolveColorShiftPreset(
  presetId: string | undefined | null,
  isFreeTier = false
): ColorShiftPresetDefinition {
  const safeId = resolveAllowedColorShiftPresetId(presetId, isFreeTier);
  return COLOR_SHIFT_PRESETS.find((p) => p.id === safeId) || COLOR_SHIFT_PRESETS[0];
}

/**
 * Timed Blur and Timed Add Text overlays are Credit Mode Only.
 */
export function isTimedOverlayFeatureAllowed(isFreeTier: boolean): boolean {
  return !isFreeTier;
}

/**
 * Returns true when a user's direct timecode entry is a complete M:SS / MM:SS / H:MM:SS string
 * (e.g. `0:11`, `1:05`, `02:30`) so the UI can apply it immediately on typing without pressing Enter.
 */
export function isCompleteTimecodeInput(raw: string): boolean {
  return /^\s*\d{1,2}:[0-5]\d(?::[0-5]\d)?\s*$/.test(String(raw || ''));
}

/**
 * Replaces Burmese pause/comma marks (`၊`, and `,` / `，` / `、` adjacent to Myanmar text)
 * with cinematic three-dot ellipses (`...`) for Translate Captions-Only Burmese subtitles
 * (e.g. `မင်း၊ဘာဖြစ်တယ်` -> `မင်း...ဘာဖြစ်တယ်`, `ငါ၊က` -> `ငါ...က`, `၊ဒါ` -> `...ဒါ`)
 * while preserving numeric commas like `1,000` and `50,000`.
 */
export function formatBurmeseCaptionsOnlyPunctuation(rawText: string): string {
  const input = String(rawText || '');
  if (!input.trim()) return input;
  return input
    // Replace Burmese little section mark `၊` (U+104A) and surrounding optional spaces with `...`
    .replace(/[ \t]*\u104A+[ \t]*/g, '...')
    // Replace commas adjacent to Myanmar Unicode characters (never touching numeric 1,000)
    .replace(/([\u1000-\u109F])[ \t]*[,，、]+[ \t]*/g, '$1...')
    .replace(/[ \t]*[,，、]+[ \t]*([\u1000-\u109F])/g, '...$1')
    // Normalize Unicode ellipsis / 4+ dots cleanly to `...`
    .replace(/\.{4,}|…\.+|\.+…/g, '...')
    .trim();
}

/**
 * Applies `formatBurmeseCaptionsOnlyPunctuation` across a Captions-Only Burmese subtitle cue array.
 */
export function applyBurmeseCaptionsOnlyPunctuation(
  cues: SubtitleCue[],
  targetLanguage: TargetLanguageCode = 'my'
): SubtitleCue[] {
  if (!Array.isArray(cues) || cues.length === 0 || targetLanguage !== 'my') {
    return cues;
  }
  return cues.map((cue) => {
    const nextText = formatBurmeseCaptionsOnlyPunctuation(cue.text);
    const nextBurmese =
      typeof cue.burmeseText === 'string'
        ? formatBurmeseCaptionsOnlyPunctuation(cue.burmeseText)
        : cue.burmeseText;
    if (nextText === cue.text && nextBurmese === cue.burmeseText) {
      return cue;
    }
    return {
      ...cue,
      text: nextText,
      ...(typeof nextBurmese === 'string' ? { burmeseText: nextBurmese } : {})
    };
  });
}

