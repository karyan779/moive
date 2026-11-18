export type ThumbnailLayoutId =
  | 'poster_gold_3d'
  | 'cinema_hook'
  | 'viral_split'
  | 'dramatic_spotlight';

export type ThumbnailPartNumber = number | null;

export interface VideoFrameOption {
  id: string;
  label: string;
  timeSec: number;
  dataUrl: string;
  isReusedPart1Image?: boolean;
  isAiPoster?: boolean;
}

export interface ThumbnailCandidate {
  id: string;
  label: string;
  subtitle: string;
  timeSec: number;
  frameDataUrl: string;
  layoutId: ThumbnailLayoutId;
  isReusedPart1Image?: boolean;
  isAiPoster?: boolean;
  isFullAiRendered?: boolean;
}

export interface ThumbnailDirectorAnalysis {
  original_title: string;
  summary_burmese: string;
  suggested_titles: string[];
  selected_title: string;
  scene_descriptions_en: string[];
  thumbnail_image_prompt: string;
}

export interface SavedSeriesPreset {
  id: string;
  baseTitle: string;
  partNumber: number;
  layoutId: ThumbnailLayoutId;
  frameDataUrl: string;
  aspectRatio: string;
  channelTag?: string;
  savedAt: number;
}

const SERIES_STORAGE_KEY_PREFIX = 'ttak_saved_series_thumbnails_v1';
const MAX_SAVED_SERIES_PRESETS = 8;

const MYANMAR_DIGITS = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];

export function toMyanmarNumeral(n: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return String(safe)
    .split('')
    .map((ch) => {
      const idx = Number(ch);
      return Number.isInteger(idx) && idx >= 0 && idx <= 9 ? MYANMAR_DIGITS[idx] : ch;
    })
    .join('');
}

export function formatPartBadgeLabel(partNumber: ThumbnailPartNumber): string {
  if (!partNumber || partNumber < 1) return '';
  return `အပိုင်း (${toMyanmarNumeral(partNumber)})`;
}

export function stripPartSuffixFromTitle(rawTitle: string): string {
  const trimmed = String(rawTitle || '').trim();
  if (!trimmed) return '';
  return trimmed
    .replace(
      /\s*(?:[-–—|·:]\s*)?(?:\(\s*)?(?:အပိုင်း|အပိုင်|Part|Ep\.?|Episode)\s*(?:\(\s*[\d၀-၉]+\s*\)|[\d၀-၉]+)\s*(?:\)\s*)?$/i,
      ''
    )
    .replace(/\s*\(\s*[\d၀-၉]+\s*\)\s*$/, '')
    .trim();
}

export function formatSeriesTitleWithPart(
  baseTitle: string,
  partNumber: ThumbnailPartNumber
): string {
  const clean = stripPartSuffixFromTitle(baseTitle);
  if (!clean) return formatPartBadgeLabel(partNumber);
  const badge = formatPartBadgeLabel(partNumber);
  return badge ? `${clean} — ${badge}` : clean;
}

/**
 * Splits text into grapheme/syllable-safe clusters so Myanmar combining vowel signs,
 * medials, asat, and stacked consonants under virama stay attached to their base consonant.
 */
export function splitBurmeseClusters(text: string): string[] {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];

  const clusters: string[] = [];
  const isDependentMark = (cp: number) =>
    (cp >= 0x102b && cp <= 0x103f) ||
    (cp >= 0x1056 && cp <= 0x1059) ||
    (cp >= 0x105e && cp <= 0x1060) ||
    (cp >= 0x1062 && cp <= 0x1064) ||
    (cp >= 0x1067 && cp <= 0x106d) ||
    (cp >= 0x1071 && cp <= 0x1074) ||
    (cp >= 0x1082 && cp <= 0x108d) ||
    cp === 0x109d ||
    (cp >= 0x0300 && cp <= 0x036f);

  for (const ch of Array.from(clean)) {
    const cp = ch.codePointAt(0) || 0;
    if (clusters.length > 0 && isDependentMark(cp)) {
      clusters[clusters.length - 1] += ch;
    } else if (clusters.length > 0 && clusters[clusters.length - 1].endsWith('\u1039')) {
      clusters[clusters.length - 1] += ch;
    } else {
      clusters.push(ch);
    }
  }
  return clusters;
}

/**
 * Splits Burmese / multilingual headline text into balanced lines while keeping
 * Myanmar combining vowel signs, medials, asat, and virama attached to their base consonant.
 */
export function wrapBurmeseHeadlineLines(
  text: string,
  maxCharsPerLine = 20,
  maxLines = 3
): string[] {
  const clusters = splitBurmeseClusters(text);
  if (clusters.length === 0) return [];

  const lines: string[] = [];
  let currentClusters: string[] = [];
  let lastSpaceClusterIdx = -1;

  for (const cluster of clusters) {
    currentClusters.push(cluster);
    if (cluster === ' ') {
      lastSpaceClusterIdx = currentClusters.length - 1;
    }

    if (currentClusters.length >= maxCharsPerLine && cluster !== ' ') {
      if (lastSpaceClusterIdx > Math.floor(currentClusters.length * 0.4)) {
        const linePart = currentClusters.slice(0, lastSpaceClusterIdx).join('').trim();
        currentClusters = currentClusters.slice(lastSpaceClusterIdx + 1);
        lastSpaceClusterIdx = currentClusters.lastIndexOf(' ');
        if (linePart) lines.push(linePart);
      } else {
        lines.push(currentClusters.join('').trim());
        currentClusters = [];
        lastSpaceClusterIdx = -1;
      }

      if (lines.length >= maxLines) {
        break;
      }
    }
  }

  const remaining = currentClusters.join('').trim();
  if (remaining && lines.length < maxLines) {
    lines.push(remaining);
  } else if (remaining && lines.length === maxLines) {
    const lastIdx = lines.length - 1;
    const combinedClusters = splitBurmeseClusters(`${lines[lastIdx]} ${remaining}`);
    if (combinedClusters.length <= maxCharsPerLine + 4) {
      lines[lastIdx] = combinedClusters.join('').trim();
    } else {
      lines[lastIdx] = `${lines[lastIdx]}…`;
    }
  }

  return lines.filter(Boolean);
}

/**
 * Resolves high-resolution PNG export canvas dimensions matching the project's aspect ratio.
 */
export function resolveThumbnailDimensions(aspectRatio: string): {
  width: number;
  height: number;
  cssAspect: string;
} {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1280, height: 720, cssAspect: '16 / 9' };
    case '4:5':
      return { width: 1080, height: 1350, cssAspect: '4 / 5' };
    case '4:3':
      return { width: 1280, height: 960, cssAspect: '4 / 3' };
    case '1:1':
      return { width: 1080, height: 1080, cssAspect: '1 / 1' };
    case '9:16':
    default:
      return { width: 1080, height: 1920, cssAspect: '9 / 16' };
  }
}

/**
 * Derives video-matched Burmese/English fallback recap titles directly from the video's
 * generated script/cues and filename so title auto-selection always works instantly.
 */
export function extractLocalFallbackTitles(params: {
  scriptText?: string;
  cues?: Array<{ text: string }>;
  rawTitle?: string;
  scriptStyle?: string;
}): string[] {
  const cues = Array.isArray(params.cues)
    ? params.cues.map((c) => String(c?.text || '').trim()).filter((t) => t.length >= 6)
    : [];
  const rawTitle = stripPartSuffixFromTitle(
    String(params.rawTitle || '')
      .replace(/\.(mp4|mov|webm|mkv|avi)$/i, '')
      .replace(/SaveTik\.co_\d+[^ ]*/i, '')
      .replace(/[_-]+/g, ' ')
      .trim()
  );

  const candidates: string[] = [];
  const pushClean = (val: string) => {
    const clean = stripPartSuffixFromTitle(
      String(val || '')
        .replace(/[။\.!]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    );
    if (!clean || clean.length < 4) return;
    const clusters = splitBurmeseClusters(clean);
    let clipped = clean;
    if (clusters.length > 34) {
      const slice = clusters.slice(0, 34);
      const lastSpace = slice.lastIndexOf(' ');
      clipped =
        lastSpace >= 16
          ? slice.slice(0, lastSpace).join('').trim()
          : slice.join('').trim();
    }
    if (!candidates.some((c) => c === clipped)) {
      candidates.push(clipped);
    }
  };

  if (cues.length > 0) {
    pushClean(cues[0]);
    const midCue = cues[Math.floor(cues.length * 0.45)];
    if (midCue) pushClean(midCue);
    const climaxCue = cues[Math.max(0, cues.length - 2)];
    if (climaxCue) pushClean(climaxCue);
  }

  if (params.scriptText && candidates.length < 3) {
    const sentences = params.scriptText
      .split(/[။\n.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 8);
    for (const s of sentences.slice(0, 3)) {
      pushClean(s);
    }
  }

  if (rawTitle && !/^(recap|video|movie clip|dramatic movie clip)$/i.test(rawTitle)) {
    pushClean(rawTitle);
  }

  if (candidates.length === 0) {
    pushClean('မထင်မှတ်ထားတဲ့ ဇာတ်လမ်းအလှည့်အပြောင်း');
    pushClean('နောက်ဆုံးအချိန်ထိ ရင်ခုန်ရမယ့် ဇာတ်ကားကောင်း');
    pushClean('ဘယ်သူမှ မသိခဲ့တဲ့ လျှို့ဝှက်ချက်');
  } else if (candidates.length === 1) {
    pushClean(`${candidates[0]} — ရင်ခုန်စရာ ဇာတ်သိမ်း`);
    pushClean('မထင်မှတ်ထားတဲ့ ဇာတ်လမ်းအလှည့်အပြောင်း');
  } else if (candidates.length === 2) {
    pushClean('နောက်ဆုံးအချိန်ထိ ရင်ခုန်ရမယ့် ဇာတ်ကား');
  }

  return candidates.slice(0, 5);
}

/**
 * Formats the exact user-requested "thumbnail_image_prompt" template,
 * dynamically syncing selected Burmese title, Part badge, and aspect ratio.
 */
export function buildThumbnailImagePromptTemplate(params: {
  sceneDescriptionEn: string;
  selectedTitle: string;
  partNumber?: ThumbnailPartNumber;
  aspectRatio?: string;
}): string {
  const ratio =
    params.aspectRatio === '16:9' ||
    params.aspectRatio === '1:1' ||
    params.aspectRatio === '4:5' ||
    params.aspectRatio === '4:3'
      ? params.aspectRatio
      : '9:16';
  const orientation = ratio === '16:9' || ratio === '4:3' ? 'horizontal' : 'vertical';
  const cleanScene =
    String(params.sceneDescriptionEn || '')
      .replace(/^dramatic scene depicting\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim() ||
    'a tense protagonist standing inside a dimly lit shadowy corridor surrounded by eerie sparks and dramatic rim lighting';
  const cleanTitle =
    stripPartSuffixFromTitle(params.selectedTitle) || 'မထင်မှတ်ထားတဲ့ လျှို့ဝှက်ဇာတ်လမ်း';
  const partText = formatPartBadgeLabel(
    params.partNumber === undefined ? 1 : params.partNumber
  );

  const badgeClause = partText
    ? `At the top center, bold glowing cinematic Burmese typography reading '${cleanTitle}' and directly below it a sleek red badge with the text '${partText}'. Render only the Burmese text listed above. Do not add any other words, Chinese/English text, watermarks, or borders.`
    : `At the top center, bold glowing cinematic Burmese typography reading '${cleanTitle}'. Render only the Burmese text listed above. Do not add any other words, Chinese/English text, watermarks, or borders.`;

  return `Flat front-facing full-bleed cinematic movie recap poster design for a ${orientation} ${ratio} video thumbnail. Dramatic scene depicting ${cleanScene}. High-contrast dramatic lighting, suspenseful cinematic atmosphere, ultra-detailed digital poster art. ${badgeClause}`;
}

/**
 * Builds an AI image generation prompt for clean full-bleed poster artwork (negative dark space
 * at upper third) so crisp Burmese 3D typography + red Part badge overlay cleanly without text artifacts.
 */
export function buildCleanPosterArtworkPrompt(params: {
  sceneDescriptionEn: string;
  aspectRatio?: string;
  styleVariant?: 'crimson_corridor' | 'golden_drama' | 'dark_mystery';
}): string {
  const ratio =
    params.aspectRatio === '16:9' ||
    params.aspectRatio === '1:1' ||
    params.aspectRatio === '4:5' ||
    params.aspectRatio === '4:3'
      ? params.aspectRatio
      : '9:16';
  const cleanScene =
    String(params.sceneDescriptionEn || '').replace(/\s+/g, ' ').trim() ||
    'intense dramatic movie protagonist in moody atmospheric lighting with suspenseful expression';
  const moodBoost =
    params.styleVariant === 'golden_drama'
      ? 'blazing amber rim lighting against obsidian shadows, swirling golden fire embers, dramatic depth of field'
      : params.styleVariant === 'dark_mystery'
        ? 'cold cyan and deep blood-crimson chiaroscuro spotlight, volumetric rain mist, glowing embers'
        : 'cinematic teal and fiery crimson backlighting, razor-sharp key light, drifting glowing embers and volumetric haze';

  return `Flat front-facing full-bleed theatrical IMAX movie poster illustration for ${ratio} vertical aspect ratio. Dramatic scene depicting ${cleanScene}. ${moodBoost}, hyper-detailed digital key art, ultra-crisp dramatic focus on characters and action in the lower two-thirds, dark moody uncluttered atmospheric backdrop in the top third reserved for typography. Strictly NO text, NO letters, NO Burmese/Chinese/English words, NO logos, NO watermarks, NO borders.`;
}

/**
 * Normalizes AI Director analysis JSON and builds resilient local fallbacks when offline.
 */
export function normalizeDirectorAnalysisResult(params: {
  raw?: Partial<ThumbnailDirectorAnalysis> | null;
  scriptText?: string;
  cues?: Array<{ text: string }>;
  rawTitle?: string;
  scriptStyle?: string;
  partNumber?: ThumbnailPartNumber;
  aspectRatio?: string;
}): ThumbnailDirectorAnalysis {
  const localFallbacks = extractLocalFallbackTitles({
    scriptText: params.scriptText,
    cues: params.cues,
    rawTitle: params.rawTitle,
    scriptStyle: params.scriptStyle
  });

  const rawTitles = Array.isArray(params.raw?.suggested_titles)
    ? params.raw!.suggested_titles
        .map((t) => stripPartSuffixFromTitle(String(t || '').trim()))
        .filter((t) => t.length >= 4)
    : [];
  const defaultExtraTitles = [
    'ဘယ်သူမှ မထင်မှတ်ထားတဲ့ လျှို့ဝှက်အမှန်တရား',
    'နောက်ဆုံးစက္ကန့်အထိ ရင်ခုန်ရမယ့် ဇာတ်သိမ်း',
    'အတိတ်က ကျိန်စာကြောင့် ပြောင်းလဲသွားတဲ့ ဘဝ',
    'တိတ်ဆိတ်မှုနောက်ကွယ်က ကြောက်မက်ဖွယ် လျှို့ဝှက်ချက်',
    'အသက်နဲ့ရင်းပြီး ဖော်ထုတ်ခဲ့ရတဲ့ အဖြစ်မှန်'
  ];
  const suggested_titles = Array.from(
    new Set([...rawTitles, ...localFallbacks, ...defaultExtraTitles])
  ).slice(0, 5);

  const selected_title =
    stripPartSuffixFromTitle(String(params.raw?.selected_title || '').trim()) ||
    suggested_titles[0] ||
    'မထင်မှတ်ထားတဲ့ ဇာတ်လမ်းအလှည့်အပြောင်း';

  const original_title = String(params.raw?.original_title || '').trim() || 'Unknown';
  const summary_burmese =
    String(params.raw?.summary_burmese || '').trim() ||
    (localFallbacks.slice(0, 2).join('။ ') + '။');

  const rawScenes = Array.isArray(params.raw?.scene_descriptions_en)
    ? params.raw!.scene_descriptions_en.map((s) => String(s || '').trim()).filter(Boolean)
    : [];
  const defaultScenes = [
    'a tense protagonist turning slightly in a shadowed atmospheric hallway illuminated by flickering fluorescent light, glowing red tension aura and floating fiery sparks around them',
    'a dramatic close-up of two opposing characters in deep emotional shock under high-contrast crimson and teal rim lighting, storm haze and cinematic suspense',
    'a lone mysterious figure facing a looming dark revelation in pouring rain with dramatic backlit silhouettes, glowing amber embers, and intense theatrical shadows'
  ];
  const scene_descriptions_en = [
    rawScenes[0] || defaultScenes[0],
    rawScenes[1] || defaultScenes[1],
    rawScenes[2] || defaultScenes[2]
  ];

  const thumbnail_image_prompt = buildThumbnailImagePromptTemplate({
    sceneDescriptionEn: scene_descriptions_en[0],
    selectedTitle: selected_title,
    partNumber: params.partNumber === undefined ? 1 : params.partNumber,
    aspectRatio: params.aspectRatio
  });

  return {
    original_title,
    summary_burmese,
    suggested_titles,
    selected_title,
    scene_descriptions_en,
    thumbnail_image_prompt
  };
}

export interface PosterThemeVisualSpec {
  id: ThumbnailLayoutId;
  headlinePlacement: 'top' | 'bottom';
  badgeStyle: 'crimson_gold_ribbon' | 'crimson_banner';
  gradientStops: [string, string, string, string];
  outlineColor: string;
  glowColor: string;
  emberTint: 'gold_orange' | 'crimson_fire' | 'icy_amber';
  canvasFilter: string;
}

export const POSTER_THEME_SPECS: Record<ThumbnailLayoutId, PosterThemeVisualSpec> = {
  poster_gold_3d: {
    id: 'poster_gold_3d',
    headlinePlacement: 'top',
    badgeStyle: 'crimson_gold_ribbon',
    gradientStops: ['#fffbeb', '#fde047', '#f59e0b', '#c2410c'],
    outlineColor: '#1b0701',
    glowColor: 'rgba(234, 88, 12, 0.92)',
    emberTint: 'gold_orange',
    canvasFilter: 'contrast(1.13) saturate(1.18) brightness(0.97)'
  },
  cinema_hook: {
    id: 'cinema_hook',
    headlinePlacement: 'bottom',
    badgeStyle: 'crimson_gold_ribbon',
    gradientStops: ['#ffffff', '#fef08a', '#fb923c', '#dc2626'],
    outlineColor: '#160405',
    glowColor: 'rgba(220, 38, 38, 0.92)',
    emberTint: 'crimson_fire',
    canvasFilter: 'contrast(1.16) saturate(1.22) brightness(0.95)'
  },
  viral_split: {
    id: 'viral_split',
    headlinePlacement: 'bottom',
    badgeStyle: 'crimson_gold_ribbon',
    gradientStops: ['#fef9c3', '#facc15', '#f59e0b', '#b45309'],
    outlineColor: '#050b14',
    glowColor: 'rgba(245, 158, 11, 0.88)',
    emberTint: 'icy_amber',
    canvasFilter: 'contrast(1.15) saturate(1.14) brightness(0.96)'
  },
  dramatic_spotlight: {
    id: 'dramatic_spotlight',
    headlinePlacement: 'top',
    badgeStyle: 'crimson_gold_ribbon',
    gradientStops: ['#fff7ed', '#fdba74', '#f59e0b', '#9a3412'],
    outlineColor: '#120703',
    glowColor: 'rgba(245, 158, 11, 0.9)',
    emberTint: 'gold_orange',
    canvasFilter: 'contrast(1.14) saturate(1.16)'
  }
};

export const LAYOUT_OPTIONS: Array<{
  id: ThumbnailLayoutId;
  label: string;
  subtitle: string;
}> = [
  {
    id: 'poster_gold_3d',
    label: '3D Gold Poster',
    subtitle: 'Top molten 3D gold · Crimson ribbon badge'
  },
  {
    id: 'cinema_hook',
    label: 'Inferno Crimson',
    subtitle: 'Blazing lower 3D title · Gold-crimson lockup'
  },
  {
    id: 'viral_split',
    label: 'Teal Noir Gold',
    subtitle: 'Noir spotlight frame · High-impact 3D gold'
  },
  {
    id: 'dramatic_spotlight',
    label: 'Spotlight Poster',
    subtitle: 'Centered cover headline · Gold frame'
  }
];

/**
 * Builds the 3 ready-to-save Thumbnail candidates.
 * - For normal / Part 1 flow: Card 1 uses the screenshot-matched 3D Gold Poster layout,
 *   while Cards 2 & 3 showcase Cinema Hook & Viral Bold poster styles.
 * - For Part 1 -> Part 2 continuation: injects the saved Part 1 thumbnail picture into Card 1
 *   AND keeps the exact Part 1 Title with `အပိုင်း (၂)` auto-stamped across all 3 options!
 */
export function buildThumbnailCandidates(params: {
  frames: VideoFrameOption[];
  reusedPart1Preset?: SavedSeriesPreset | null;
  partNumber: ThumbnailPartNumber;
}): ThumbnailCandidate[] {
  const frames = params.frames.filter((f) => Boolean(f?.dataUrl));
  const fallbackFrame = frames[0]?.dataUrl || '';

  const f0 = frames[0]?.dataUrl || fallbackFrame;
  const f1 = frames[1]?.dataUrl || f0;
  const f2 = frames[2]?.dataUrl || f1 || f0;

  if (params.reusedPart1Preset && params.reusedPart1Preset.frameDataUrl) {
    const preset = params.reusedPart1Preset;
    const partLabel = formatPartBadgeLabel(params.partNumber || 2);
    return [
      {
        id: 'thumb-card-1',
        label: `အရင် ပုံ + ${partLabel || 'Auto'}`,
        subtitle: `Saved Part ${preset.partNumber} Poster · Auto Updated`,
        timeSec: frames[0]?.timeSec || 0,
        frameDataUrl: preset.frameDataUrl,
        layoutId: preset.layoutId || 'poster_gold_3d',
        isReusedPart1Image: true,
        isAiPoster: Boolean(frames[0]?.isAiPoster)
      },
      {
        id: 'thumb-card-2',
        label: frames[1]?.label || 'Dramatic Poster 2',
        subtitle: LAYOUT_OPTIONS[1].label,
        timeSec: frames[1]?.timeSec || 0,
        frameDataUrl: f1 || preset.frameDataUrl,
        layoutId: 'cinema_hook',
        isAiPoster: Boolean(frames[1]?.isAiPoster)
      },
      {
        id: 'thumb-card-3',
        label: frames[2]?.label || 'Climax Poster 3',
        subtitle: LAYOUT_OPTIONS[2].label,
        timeSec: frames[2]?.timeSec || 0,
        frameDataUrl: f2 || preset.frameDataUrl,
        layoutId: 'viral_split',
        isAiPoster: Boolean(frames[2]?.isAiPoster)
      }
    ];
  }

  return [
    {
      id: 'thumb-card-1',
      label: frames[0]?.label || 'Key Poster Hook',
      subtitle: LAYOUT_OPTIONS[0].label,
      timeSec: frames[0]?.timeSec || 0,
      frameDataUrl: f0,
      layoutId: 'poster_gold_3d',
      isAiPoster: Boolean(frames[0]?.isAiPoster)
    },
    {
      id: 'thumb-card-2',
      label: frames[1]?.label || 'Turning Point',
      subtitle: LAYOUT_OPTIONS[1].label,
      timeSec: frames[1]?.timeSec || 0,
      frameDataUrl: f1,
      layoutId: 'cinema_hook',
      isAiPoster: Boolean(frames[1]?.isAiPoster)
    },
    {
      id: 'thumb-card-3',
      label: frames[2]?.label || 'Climax Scene',
      subtitle: LAYOUT_OPTIONS[2].label,
      timeSec: frames[2]?.timeSec || 0,
      frameDataUrl: f2,
      layoutId: 'viral_split',
      isAiPoster: Boolean(frames[2]?.isAiPoster)
    }
  ];
}

export function buildPart2ContinuationCandidates(params: {
  preset: SavedSeriesPreset;
  currentVideoFrames: VideoFrameOption[];
  targetPartNumber?: number;
}): {
  baseTitle: string;
  partNumber: number;
  layoutId: ThumbnailLayoutId;
  candidates: ThumbnailCandidate[];
} {
  const partNumber = Math.max(2, params.targetPartNumber ?? params.preset.partNumber + 1);
  const baseTitle = stripPartSuffixFromTitle(params.preset.baseTitle) || params.preset.baseTitle;
  const candidates = buildThumbnailCandidates({
    frames: params.currentVideoFrames,
    reusedPart1Preset: params.preset,
    partNumber
  });
  return {
    baseTitle,
    partNumber,
    layoutId: params.preset.layoutId || 'poster_gold_3d',
    candidates
  };
}

function getSeriesStorageKey(userId?: string): string {
  const cleanUser = (userId || 'guest').replace(/[^a-zA-Z0-9_-]/g, '');
  return `${SERIES_STORAGE_KEY_PREFIX}_${cleanUser || 'guest'}`;
}

export function loadSavedSeriesPresets(userId?: string): SavedSeriesPreset[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(getSeriesStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SavedSeriesPreset =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.baseTitle === 'string' &&
          typeof item.frameDataUrl === 'string' &&
          item.frameDataUrl.length > 20
      )
      .slice(0, MAX_SAVED_SERIES_PRESETS);
  } catch {
    return [];
  }
}

export function saveSeriesPreset(
  preset: Omit<SavedSeriesPreset, 'id' | 'savedAt'> & { id?: string },
  userId?: string
): SavedSeriesPreset[] {
  const existing = loadSavedSeriesPresets(userId);
  const cleanBase = stripPartSuffixFromTitle(preset.baseTitle) || preset.baseTitle.trim();
  const nextItem: SavedSeriesPreset = {
    id: preset.id || `series_${Date.now()}`,
    baseTitle: cleanBase,
    partNumber: Math.max(1, Math.floor(preset.partNumber || 1)),
    layoutId: preset.layoutId || 'cinema_hook',
    frameDataUrl: preset.frameDataUrl,
    aspectRatio: preset.aspectRatio || '9:16',
    channelTag: preset.channelTag,
    savedAt: Date.now()
  };

  // Replace existing series with the same baseTitle so Part 1 -> Part 2 updates cleanly
  const deduped = existing.filter(
    (item) =>
      stripPartSuffixFromTitle(item.baseTitle).toLowerCase() !== cleanBase.toLowerCase() &&
      item.id !== nextItem.id
  );
  const nextList = [nextItem, ...deduped].slice(0, MAX_SAVED_SERIES_PRESETS);

  if (typeof window !== 'undefined' && window.localStorage) {
    const key = getSeriesStorageKey(userId);
    for (let limit = nextList.length; limit >= 1; limit--) {
      try {
        window.localStorage.setItem(key, JSON.stringify(nextList.slice(0, limit)));
        return nextList.slice(0, limit);
      } catch {
        // Trim oldest entries if localStorage quota is tight
      }
    }
  }
  return nextList;
}

export function deleteSeriesPreset(presetId: string, userId?: string): SavedSeriesPreset[] {
  const existing = loadSavedSeriesPresets(userId);
  const next = existing.filter((p) => p.id !== presetId);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(getSeriesStorageKey(userId), JSON.stringify(next));
    } catch {}
  }
  return next;
}
