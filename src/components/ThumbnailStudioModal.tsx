import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Layers,
  Upload,
  Trash2,
  BookmarkCheck,
  Loader2,
  ArrowRight,
  Wand2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Lock,
  Crown,
  Palette,
  Type as TypeIcon
} from 'lucide-react';
import {
  formatPartBadgeLabel,
  formatSeriesTitleWithPart,
  stripPartSuffixFromTitle,
  wrapBurmeseHeadlineLines,
  balancePosterHeadlineLines,
  extractLocalFallbackTitles,
  buildThumbnailImagePromptTemplate,
  buildGeminiAppQuickPrompt,
  selectBestFramesByIndices,
  normalizeDirectorAnalysisResult,
  buildThumbnailCandidates,
  buildPart2ContinuationCandidates,
  resolveThumbnailDimensions,
  resolveThumbnailFontOption,
  resolveThumbnailColorPreset,
  THUMBNAIL_FONT_OPTIONS,
  THUMBNAIL_COLOR_PRESETS,
  loadSavedSeriesPresets,
  saveSeriesPreset,
  deleteSeriesPreset,
  POSTER_THEME_SPECS,
  type ThumbnailLayoutId,
  type ThumbnailFontId,
  type ThumbnailColorPresetId,
  type ThumbnailPartNumber,
  type VideoFrameOption,
  type ThumbnailCandidate,
  type SavedSeriesPreset
} from '../utils/thumbnailStudio';
import {
  loadFreeUserApiKeys,
  type ScriptStyleId,
  type TargetLanguageCode,
  type SubtitleCue
} from '../utils/recapEngine';
import { playUiSound } from '../utils/soundEffects';

interface ThumbnailStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  isFreeTier: boolean;
  uiLang: 'my' | 'en';
  videoUrl: string | null;
  videoDuration: number;
  aspectRatio: string;
  lastJobId: string | null;
  localUploadId: string | null;
  scriptText: string;
  cues: SubtitleCue[];
  videoTitle: string;
  scriptStyle: ScriptStyleId;
  targetLanguage: TargetLanguageCode;
  channelTag?: string;
  onSelectTitle?: (formattedTitle: string) => void;
  onSwitchToCreditMode?: () => void;
}

/**
 * Grabs up to 6 distinct crisp keyframes directly in the browser from a loaded <video> URL
 * so Gemini can visually scan the movie clip (title cards, characters, climax) & pick hero scenes.
 * Falls back cleanly if CORS / codec blocks canvas extraction.
 */
async function grabClientVideoFrames(
  srcUrl: string,
  durationSec: number,
  count = 6
): Promise<VideoFrameOption[]> {
  if (!srcUrl || typeof document === 'undefined') return [];
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.style.position = 'fixed';
    video.style.left = '-9999px';
    video.style.top = '-9999px';
    video.style.width = '2px';
    video.style.height = '2px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.setAttribute('aria-hidden', 'true');
    if (!srcUrl.startsWith('blob:') && !srcUrl.startsWith('data:')) {
      video.crossOrigin = 'anonymous';
    }
    try {
      document.body.appendChild(video);
    } catch {}

    let settled = false;
    let startedCapture = false;
    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve([]);
      }
    }, 6500);

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      try {
        video.removeAttribute('src');
        video.load();
        if (video.parentNode) video.parentNode.removeChild(video);
      } catch {}
    };

    video.onerror = () => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve([]);
      }
    };

    const runCapture = async () => {
      if (startedCapture || settled) return;
      startedCapture = true;
      try {
        const dur = Math.max(
          4,
          Number.isFinite(video.duration) && video.duration > 1 ? video.duration : durationSec || 20
        );
        const safeCount = count >= 6 ? 6 : 3;
        const fracs =
          safeCount >= 6 ? [0.06, 0.18, 0.34, 0.52, 0.7, 0.86] : [0.16, 0.5, 0.82];
        const labels =
          safeCount >= 6
            ? [
                'Opening Title',
                'Hero Hook',
                'Early Drama',
                'Turning Point',
                'High Tension',
                'Climax Scene'
              ]
            : ['Opening Hook', 'Turning Point', 'Climax Scene'];
        const targetTimes = fracs.map((f) => Math.max(0.25, dur * f));
        const results: VideoFrameOption[] = [];

        const canvas = document.createElement('canvas');
        const targetW = 540;
        const aspect =
          video.videoWidth && video.videoHeight ? video.videoHeight / video.videoWidth : 16 / 9;
        canvas.width = targetW;
        canvas.height = Math.max(280, Math.round(targetW * aspect));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          settled = true;
          cleanup();
          resolve([]);
          return;
        }

        for (let i = 0; i < targetTimes.length; i++) {
          const ts = Math.min(dur - 0.15, targetTimes[i]);
          await new Promise<void>((seekResolve) => {
            let doneSeek = false;
            const tmr = window.setTimeout(() => {
              if (!doneSeek) {
                doneSeek = true;
                seekResolve();
              }
            }, 1400);
            video.onseeked = () => {
              if (!doneSeek) {
                doneSeek = true;
                window.clearTimeout(tmr);
                seekResolve();
              }
            };
            video.currentTime = ts;
          });
          // Wait briefly for Chromium video decoder surface to update
          await new Promise((r) => window.setTimeout(r, 65));

          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            if (dataUrl && dataUrl.length > 500) {
              results.push({
                id: `cli-frame-${i + 1}`,
                label: labels[i] || `Scene ${i + 1}`,
                timeSec: Math.round(ts),
                dataUrl
              });
            }
          } catch {
            settled = true;
            cleanup();
            resolve([]);
            return;
          }
        }

        settled = true;
        cleanup();
        resolve(results);
      } catch {
        if (!settled) {
          settled = true;
          cleanup();
          resolve([]);
        }
      }
    };

    video.onloadeddata = () => {
      void runCapture();
    };
    video.oncanplay = () => {
      void runCapture();
    };

    video.src = srcUrl;
    try {
      video.load();
    } catch {}
  });
}

function buildAtmosphericPosterBackdrop(variantIdx: number): string {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = 720;
  c.height = 1080;
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  const palettes = [
    ['#18181b', '#78350f', '#09090b'],
    ['#0f172a', '#134e4a', '#020617'],
    ['#1e1b4b', '#7f1d1d', '#09090b']
  ];
  const [c1, c2, c3] = palettes[variantIdx % palettes.length];
  const grad = ctx.createLinearGradient(0, 0, 720, 1080);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.5, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 720, 1080);
  const glow = ctx.createRadialGradient(360, 420, 40, 360, 420, 420);
  glow.addColorStop(0, 'rgba(245, 158, 11, 0.34)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 720, 1080);
  return c.toDataURL('image/jpeg', 0.85);
}

/**
 * Draws an ornate scalloped crimson-red & double-gold Movie Poster plaque (`အပိုင်း (၁)` / `အပိုင်း (၂)`)
 * styled after theatrical Burmese movie recap posters.
 */
function drawCrimsonGoldPlaque(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  topY: number,
  fontSize: number,
  fontFamily: string
): number {
  ctx.font = `800 ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  const pillPadX = Math.round(fontSize * 1.38);
  const pillW = Math.round(metrics.width + pillPadX * 2);
  const pillH = Math.round(fontSize * 1.94);
  const pillX = Math.round(centerX - pillW / 2);
  const pillY = Math.round(topY);
  const notch = Math.round(pillH * 0.3);

  const traceScallopedPlaque = (x: number, y: number, w: number, h: number, n: number) => {
    ctx.beginPath();
    ctx.moveTo(x + n, y);
    ctx.lineTo(x + w - n, y);
    ctx.quadraticCurveTo(x + w - n * 0.35, y + h * 0.22, x + w, y + h * 0.5);
    ctx.quadraticCurveTo(x + w - n * 0.35, y + h * 0.78, x + w - n, y + h);
    ctx.lineTo(x + n, y + h);
    ctx.quadraticCurveTo(x + n * 0.35, y + h * 0.78, x, y + h * 0.5);
    ctx.quadraticCurveTo(x + n * 0.35, y + h * 0.22, x + n, y);
    ctx.closePath();
  };

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.88)';
  ctx.shadowBlur = Math.max(10, Math.round(pillH * 0.45));
  ctx.shadowOffsetY = Math.max(2, Math.round(pillH * 0.08));

  traceScallopedPlaque(pillX, pillY, pillW, pillH, notch);

  const redGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
  redGrad.addColorStop(0, '#991b1b');
  redGrad.addColorStop(0.45, '#dc2626');
  redGrad.addColorStop(0.82, '#991b1b');
  redGrad.addColorStop(1, '#450a0a');
  ctx.fillStyle = redGrad;
  ctx.fill();

  // Outer luminous gold border
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = Math.max(1.8, Math.round(fontSize * 0.082));
  ctx.strokeStyle = '#fde047';
  ctx.stroke();

  // Delicate inner inset gold hairline
  const inset = Math.max(2.5, Math.round(pillH * 0.1));
  traceScallopedPlaque(
    pillX + inset,
    pillY + inset,
    pillW - inset * 2,
    pillH - inset * 2,
    Math.max(4, notch - inset * 0.6)
  );
  ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.032));
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.52)';
  ctx.stroke();

  // Left & right ornamental gold diamond pips
  const wingR = Math.max(2, Math.round(pillH * 0.09));
  [pillX + Math.round(notch * 0.66), pillX + pillW - Math.round(notch * 0.66)].forEach((wx) => {
    const wy = pillY + pillH / 2;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(wx, wy - wingR);
    ctx.lineTo(wx + wingR, wy);
    ctx.lineTo(wx, wy + wingR);
    ctx.lineTo(wx - wingR, wy);
    ctx.closePath();
    ctx.fill();
  });

  // Crisp pure white bold badge text with subtle dark depth
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, centerX, pillY + pillH / 2 + Math.max(1, Math.round(fontSize * 0.04)));
  ctx.restore();

  return pillY + pillH;
}

/**
 * Draws floating glowing cinematic embers & fine glowing sparks across the poster.
 */
function drawPosterEmbers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tint: 'gold_orange' | 'crimson_fire' | 'icy_amber'
) {
  // Varied [xRatio, yRatio, radius, angleDeg, elongation]
  const sparkSeeds: Array<[number, number, number, number, number]> = [
    [0.09, 0.08, 2.5, -28, 3.3], [0.22, 0.21, 1.9, -35, 2.5], [0.85, 0.08, 2.8, 32, 3.5],
    [0.91, 0.20, 2.1, 24, 2.7], [0.14, 0.36, 2.0, -20, 2.8], [0.80, 0.33, 2.3, 28, 3.0],
    [0.49, 0.04, 1.7, -12, 2.1], [0.33, 0.27, 1.6, -40, 2.2], [0.69, 0.18, 2.2, 35, 2.6],
    [0.08, 0.56, 1.9, -25, 2.7], [0.93, 0.50, 2.2, 20, 2.8], [0.12, 0.78, 2.4, -32, 3.2],
    [0.88, 0.75, 2.4, 30, 3.0], [0.27, 0.87, 1.6, -18, 2.2], [0.74, 0.89, 1.7, 22, 2.3],
    [0.24, 0.07, 1.5, -30, 2.0], [0.76, 0.12, 1.6, 26, 2.1], [0.42, 0.14, 1.3, -15, 1.8],
    [0.58, 0.11, 1.4, 18, 1.9], [0.18, 0.45, 1.4, -22, 2.0], [0.84, 0.44, 1.5, 25, 2.1]
  ];
  const scaleFactor = Math.min(w, h) / 1080;
  sparkSeeds.forEach(([sx, sy, sr, deg, elong]) => {
    const px = w * sx;
    const py = h * sy;
    const rx = Math.max(2.2, sr * elong * 2.2 * scaleFactor);
    const ry = Math.max(1.2, sr * 1.4 * scaleFactor);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((deg * Math.PI) / 180);

    // Outer fiery halo
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.85);
    if (tint === 'crimson_fire') {
      g.addColorStop(0, 'rgba(254, 240, 138, 0.94)');
      g.addColorStop(0.38, 'rgba(239, 68, 68, 0.68)');
      g.addColorStop(1, 'rgba(220, 38, 38, 0)');
    } else if (tint === 'icy_amber') {
      g.addColorStop(0, 'rgba(224, 242, 254, 0.94)');
      g.addColorStop(0.42, 'rgba(251, 191, 36, 0.58)');
      g.addColorStop(1, 'rgba(14, 165, 233, 0)');
    } else {
      g.addColorStop(0, 'rgba(254, 249, 195, 0.96)');
      g.addColorStop(0.4, 'rgba(249, 115, 22, 0.68)');
      g.addColorStop(1, 'rgba(249, 115, 22, 0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.85, ry * 1.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hot white-gold spark core streak
    ctx.fillStyle = tint === 'icy_amber' ? 'rgba(240, 249, 255, 0.92)' : 'rgba(254, 249, 195, 0.95)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.56, ry * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/**
 * Renders sculptural multi-layer 3D molten-gold Burmese movie poster typography with stacked dark
 * depth extrusion, fiery outer glow halo, metallic gradient fill, and subtle top specular gleam.
 */
function draw3dPosterTextLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  centerX: number,
  y: number,
  titleSize: number,
  gradientStops: [string, string, string, string],
  outlineColor: string,
  glowColor: string,
  baseShadowStop = '#7c2d12',
  contourColor = '#2a0901'
) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // 1. Fiery outer atmospheric glow aura
  ctx.lineWidth = Math.max(5, Math.round(titleSize * 0.24));
  ctx.strokeStyle = outlineColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = Math.max(14, Math.round(titleSize * 0.42));
  ctx.strokeText(line, centerX, y + Math.max(3, Math.round(titleSize * 0.065)));

  // 2. Sculptural multi-layer 3D depth extrusion (stacked dark bevel slices)
  ctx.shadowBlur = 0;
  const extrudeDepth = Math.max(4, Math.round(titleSize * 0.085));
  const extrudeSteps = Math.min(8, Math.max(4, extrudeDepth));
  ctx.lineWidth = Math.max(3.5, Math.round(titleSize * 0.19));
  for (let step = extrudeSteps; step >= 1; step--) {
    const dy = (step / extrudeSteps) * extrudeDepth;
    ctx.strokeStyle = step === extrudeSteps ? '#080506' : outlineColor;
    ctx.strokeText(line, centerX, y + dy);
  }

  // 3. Tight dark metallic contour around foreground letterforms
  ctx.lineWidth = Math.max(2.5, Math.round(titleSize * 0.13));
  ctx.strokeStyle = contourColor;
  ctx.strokeText(line, centerX, y);

  // 4. Rich 5-stop vertical metallic gradient fill
  const fillGrad = ctx.createLinearGradient(0, y, 0, y + titleSize * 1.06);
  fillGrad.addColorStop(0, gradientStops[0]);
  fillGrad.addColorStop(0.24, gradientStops[1]);
  fillGrad.addColorStop(0.58, gradientStops[2]);
  fillGrad.addColorStop(0.86, gradientStops[3]);
  fillGrad.addColorStop(1, baseShadowStop);
  ctx.fillStyle = fillGrad;
  ctx.fillText(line, centerX, y);

  // 5. Subtle warm metallic top highlight sheen for 3D embossed pop
  const sheenGrad = ctx.createLinearGradient(0, y, 0, y + titleSize * 0.42);
  sheenGrad.addColorStop(0, 'rgba(255, 255, 245, 0.46)');
  sheenGrad.addColorStop(0.65, 'rgba(255, 252, 220, 0.12)');
  sheenGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = sheenGrad;
  ctx.fillText(line, centerX, y);
  ctx.restore();
}

/**
 * Unified WYSIWYG poster composition engine used for BOTH card previews and full-HD PNG downloads.
 */
function drawPosterOntoCanvas(
  canvas: HTMLCanvasElement,
  dims: { width: number; height: number },
  img: HTMLImageElement | null,
  params: {
    baseTitle: string;
    partNumber: ThumbnailPartNumber;
    layoutId: ThumbnailLayoutId;
    titleFontId?: ThumbnailFontId;
    titleColorId?: ThumbnailColorPresetId;
    channelTag?: string;
    skipOverlayText?: boolean;
  }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = dims.width;
  const h = dims.height;
  const theme = POSTER_THEME_SPECS[params.layoutId] || POSTER_THEME_SPECS.poster_gold_3d;
  const fontOption = resolveThumbnailFontOption(params.titleFontId);
  const colorPreset = resolveThumbnailColorPreset(params.titleColorId);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#06090e';
  ctx.fillRect(0, 0, w, h);

  if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
    const scaleCover = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const drawW = img.naturalWidth * scaleCover;
    const drawH = img.naturalHeight * scaleCover;
    const drawX = (w - drawW) / 2;
    const drawY = (h - drawH) / 2;
    ctx.save();
    if (!params.skipOverlayText && theme.canvasFilter) {
      ctx.filter = theme.canvasFilter;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  if (params.skipOverlayText) return;

  const fontFamily = fontOption.fontFamily;
  const fontWeight = fontOption.fontWeight;
  const minDim = Math.min(w, h);
  const padX = Math.round(w * 0.065);
  const partBadge = formatPartBadgeLabel(params.partNumber);
  const cleanTitle = stripPartSuffixFromTitle(params.baseTitle) || params.baseTitle.trim();

  // Symmetrical balanced movie-poster headline lockup + generous commanding font scale
  const isLandscape = w > h;
  const lines = cleanTitle ? balancePosterHeadlineLines(cleanTitle, isLandscape) : [];
  let titleSize = Math.round(
    minDim *
      (lines.length >= 3 ? 0.082 : lines.length === 2 ? 0.104 : 0.118) *
      fontOption.sizeMultiplier
  );
  const safeTextMaxW = Math.round(w * 0.88);
  while (titleSize > Math.round(minDim * 0.036) && lines.length > 0) {
    ctx.font = `${fontWeight} ${titleSize}px ${fontFamily}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    if (widest <= safeTextMaxW) break;
    titleSize -= 2;
  }
  const lineHeight = Math.round(titleSize * 1.32);
  const badgeFontSize = Math.max(12, Math.round(minDim * 0.045));

  if (params.layoutId === 'poster_gold_3d' || params.layoutId === 'dramatic_spotlight') {
    // Deep cinematic obsidian upper headroom gradient so the 3D gold Burmese headline pops dramatically
    const topDark = ctx.createLinearGradient(0, 0, 0, h * 0.52);
    topDark.addColorStop(0, 'rgba(3, 6, 10, 0.96)');
    topDark.addColorStop(0.45, 'rgba(5, 9, 13, 0.78)');
    topDark.addColorStop(0.75, 'rgba(6, 11, 15, 0.34)');
    topDark.addColorStop(1, 'rgba(6, 11, 15, 0)');
    ctx.fillStyle = topDark;
    ctx.fillRect(0, 0, w, h * 0.52);

    // Subtle dramatic cinema radial edge vignette framing the hero subject
    const edgeVignette = ctx.createRadialGradient(
      w * 0.5,
      h * 0.58,
      minDim * 0.28,
      w * 0.5,
      h * 0.54,
      Math.max(w, h) * 0.76
    );
    edgeVignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edgeVignette.addColorStop(0.72, 'rgba(2, 6, 10, 0.26)');
    edgeVignette.addColorStop(1, 'rgba(2, 5, 8, 0.72)');
    ctx.fillStyle = edgeVignette;
    ctx.fillRect(0, 0, w, h);

    const botDark = ctx.createLinearGradient(0, h * 0.74, 0, h);
    botDark.addColorStop(0, 'rgba(4, 7, 11, 0)');
    botDark.addColorStop(1, 'rgba(4, 7, 11, 0.76)');
    ctx.fillStyle = botDark;
    ctx.fillRect(0, h * 0.74, w, h * 0.26);

    if (params.layoutId === 'dramatic_spotlight') {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.lineWidth = Math.max(2, Math.round(minDim * 0.007));
      const inset = Math.round(minDim * 0.024);
      ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
      ctx.restore();
    }

    drawPosterEmbers(ctx, w, h, colorPreset.emberTint);

    let lastHeadlineBottomY = Math.round(h * 0.16);
    if (lines.length > 0) {
      const topAnchorY = Math.round(
        h * (lines.length === 1 ? 0.10 : lines.length === 2 ? 0.068 : 0.052)
      );
      ctx.font = `${fontWeight} ${titleSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((line, idx) => {
        const y = topAnchorY + idx * lineHeight;
        lastHeadlineBottomY = y + titleSize * 1.1;
        draw3dPosterTextLine(
          ctx,
          line,
          w / 2,
          y,
          titleSize,
          colorPreset.gradientStops,
          colorPreset.outlineColor,
          colorPreset.glowColor,
          colorPreset.baseShadowStop,
          colorPreset.contourColor
        );
      });
    }

    if (partBadge) {
      drawCrimsonGoldPlaque(
        ctx,
        partBadge,
        w / 2,
        lastHeadlineBottomY + Math.round(h * 0.018),
        badgeFontSize,
        fontFamily
      );
    }
  } else if (params.layoutId === 'cinema_hook') {
    // Inferno Crimson Poster: top dark crimson headroom so 3D title + Part badge never cover the hero character's chest/back
    const topCrimson = ctx.createLinearGradient(0, 0, 0, h * 0.52);
    topCrimson.addColorStop(0, 'rgba(18, 3, 5, 0.96)');
    topCrimson.addColorStop(0.46, 'rgba(26, 5, 8, 0.78)');
    topCrimson.addColorStop(0.76, 'rgba(18, 4, 6, 0.30)');
    topCrimson.addColorStop(1, 'rgba(12, 3, 5, 0)');
    ctx.fillStyle = topCrimson;
    ctx.fillRect(0, 0, w, h * 0.52);

    const crimsonHalo = ctx.createRadialGradient(w / 2, h * 0.18, minDim * 0.05, w / 2, h * 0.18, w * 0.65);
    crimsonHalo.addColorStop(0, 'rgba(220, 38, 38, 0.34)');
    crimsonHalo.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = crimsonHalo;
    ctx.fillRect(0, 0, w, h * 0.5);

    const botScrim = ctx.createLinearGradient(0, h * 0.74, 0, h);
    botScrim.addColorStop(0, 'rgba(10, 2, 4, 0)');
    botScrim.addColorStop(1, 'rgba(10, 2, 4, 0.78)');
    ctx.fillStyle = botScrim;
    ctx.fillRect(0, h * 0.74, w, h * 0.26);

    drawPosterEmbers(ctx, w, h, colorPreset.emberTint);

    let lastCrimsonBottomY = Math.round(h * 0.16);
    if (lines.length > 0) {
      const topAnchorY = Math.round(
        h * (lines.length === 1 ? 0.10 : lines.length === 2 ? 0.068 : 0.052)
      );
      ctx.font = `${fontWeight} ${titleSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((line, idx) => {
        const y = topAnchorY + idx * lineHeight;
        lastCrimsonBottomY = y + titleSize * 1.1;
        const useCustomColor = Boolean(params.titleColorId && params.titleColorId !== 'molten_gold');
        const isLast = idx === lines.length - 1;
        const stops: [string, string, string, string] = useCustomColor
          ? colorPreset.gradientStops
          : isLast
            ? ['#fef08a', '#fb923c', '#ef4444', '#b91c1c']
            : ['#ffffff', '#fef9c3', '#fdba74', '#ea580c'];
        draw3dPosterTextLine(
          ctx,
          line,
          w / 2,
          y,
          titleSize,
          stops,
          useCustomColor ? colorPreset.outlineColor : theme.outlineColor,
          useCustomColor ? colorPreset.glowColor : theme.glowColor,
          useCustomColor ? colorPreset.baseShadowStop : '#7f1d1d',
          useCustomColor ? colorPreset.contourColor : '#2a0901'
        );
      });
    }

    if (partBadge) {
      drawCrimsonGoldPlaque(
        ctx,
        partBadge,
        w / 2,
        lastCrimsonBottomY + Math.round(h * 0.018),
        badgeFontSize,
        fontFamily
      );
    }
  } else {
    // Teal Noir Gold (`viral_split`): top & bottom vignette + golden hairline border + top plaque + bottom gold 3D headline
    const topTeal = ctx.createLinearGradient(0, 0, 0, h * 0.32);
    topTeal.addColorStop(0, 'rgba(4, 14, 22, 0.84)');
    topTeal.addColorStop(1, 'rgba(4, 14, 22, 0)');
    ctx.fillStyle = topTeal;
    ctx.fillRect(0, 0, w, h * 0.32);

    const botTeal = ctx.createLinearGradient(0, h * 0.4, 0, h);
    botTeal.addColorStop(0, 'rgba(4, 12, 20, 0)');
    botTeal.addColorStop(0.55, 'rgba(5, 13, 22, 0.8)');
    botTeal.addColorStop(1, 'rgba(3, 7, 14, 0.96)');
    ctx.fillStyle = botTeal;
    ctx.fillRect(0, h * 0.4, w, h * 0.6);

    // Fine metallic gold poster inner border
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = Math.max(1.5, Math.round(minDim * 0.004));
    const inset = Math.round(minDim * 0.025);
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
    ctx.restore();

    drawPosterEmbers(ctx, w, h, colorPreset.emberTint);

    if (partBadge) {
      drawCrimsonGoldPlaque(ctx, partBadge, w / 2, Math.round(h * 0.06), badgeFontSize, fontFamily);
    }

    if (lines.length > 0) {
      const totalTextH = lines.length * lineHeight;
      const textStartTopY = Math.round(h * 0.92 - totalTextH);
      ctx.font = `${fontWeight} ${titleSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((line, idx) => {
        const y = textStartTopY + idx * lineHeight;
        draw3dPosterTextLine(
          ctx,
          line,
          w / 2,
          y,
          titleSize,
          colorPreset.gradientStops,
          colorPreset.outlineColor,
          colorPreset.glowColor,
          colorPreset.baseShadowStop,
          colorPreset.contourColor
        );
      });
    }
  }

  // Subtle channel tag at bottom-right when configured
  if (params.channelTag && params.channelTag.trim()) {
    const tagSize = Math.max(9, Math.round(minDim * 0.024));
    ctx.save();
    ctx.font = `700 ${tagSize}px "Plus Jakarta Sans", ${fontFamily}`;
    ctx.fillStyle = 'rgba(255,255,255,0.68)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = 'rgba(0,0,0,0.85)';
    ctx.shadowBlur = 6;
    ctx.fillText(params.channelTag.trim(), w - padX, h - Math.round(h * 0.026));
    ctx.restore();
  }
}

/**
 * Renders a crisp high-resolution thumbnail PNG onto an offscreen HTML5 Canvas and returns a PNG Blob.
 */
async function renderThumbnailToPngBlob(params: {
  frameDataUrl: string;
  baseTitle: string;
  partNumber: ThumbnailPartNumber;
  layoutId: ThumbnailLayoutId;
  titleFontId?: ThumbnailFontId;
  titleColorId?: ThumbnailColorPresetId;
  aspectRatio: string;
  channelTag?: string;
  skipOverlayText?: boolean;
}): Promise<Blob | null> {
  const dims = resolveThumbnailDimensions(params.aspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;

  try {
    const fontOpt = resolveThumbnailFontOption(params.titleFontId);
    if (document.fonts && typeof document.fonts.load === 'function') {
      await Promise.race([
        document.fonts.load(fontOpt.loadSpec),
        new Promise((r) => setTimeout(r, 900))
      ]);
    }
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 800))]);
    }
  } catch {}

  const img = await new Promise<HTMLImageElement | null>((resolve) => {
    if (!params.frameDataUrl) {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = params.frameDataUrl;
  });

  drawPosterOntoCanvas(canvas, dims, img, params);

  return await new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    } catch {
      resolve(null);
    }
  });
}

interface PosterPreviewCanvasProps {
  frameDataUrl: string;
  baseTitle: string;
  partNumber: ThumbnailPartNumber;
  layoutId: ThumbnailLayoutId;
  titleFontId: ThumbnailFontId;
  titleColorId: ThumbnailColorPresetId;
  aspectRatio: string;
  channelTag?: string;
  skipOverlayText?: boolean;
  alt: string;
}

const PosterPreviewCanvas: React.FC<PosterPreviewCanvasProps> = ({
  frameDataUrl,
  baseTitle,
  partNumber,
  layoutId,
  titleFontId,
  titleColorId,
  aspectRatio,
  channelTag,
  skipOverlayText,
  alt
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const fullDims = resolveThumbnailDimensions(aspectRatio);
    const previewDims = {
      width: Math.round(fullDims.width * 0.5),
      height: Math.round(fullDims.height * 0.5)
    };
    if (canvas.width !== previewDims.width || canvas.height !== previewDims.height) {
      canvas.width = previewDims.width;
      canvas.height = previewDims.height;
    }

    const paint = async () => {
      try {
        const fontOpt = resolveThumbnailFontOption(titleFontId);
        if (document.fonts && typeof document.fonts.load === 'function') {
          await Promise.race([
            document.fonts.load(fontOpt.loadSpec),
            new Promise((r) => setTimeout(r, 700))
          ]);
        }
        if (document.fonts && document.fonts.ready) {
          await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 600))]);
        }
      } catch {}

      let img: HTMLImageElement | null = null;
      if (frameDataUrl) {
        img = await new Promise<HTMLImageElement | null>((resolve) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = () => resolve(null);
          image.src = frameDataUrl;
        });
      }
      if (cancelled || !canvasRef.current) return;
      drawPosterOntoCanvas(canvasRef.current, previewDims, img, {
        baseTitle,
        partNumber,
        layoutId,
        titleFontId,
        titleColorId,
        channelTag,
        skipOverlayText
      });
    };

    void paint();
    return () => {
      cancelled = true;
    };
  }, [
    aspectRatio,
    baseTitle,
    channelTag,
    frameDataUrl,
    layoutId,
    partNumber,
    skipOverlayText,
    titleColorId,
    titleFontId
  ]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={alt}
      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
    />
  );
};

export const ThumbnailStudioModal: React.FC<ThumbnailStudioModalProps> = ({
  isOpen,
  onClose,
  userId,
  isFreeTier,
  uiLang,
  videoUrl,
  videoDuration,
  aspectRatio,
  lastJobId,
  localUploadId,
  scriptText,
  cues,
  videoTitle,
  scriptStyle,
  targetLanguage,
  channelTag,
  onSelectTitle,
  onSwitchToCreditMode
}) => {
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);
  const [baseTitle, setBaseTitle] = useState('');
  const [partNumber, setPartNumber] = useState<ThumbnailPartNumber>(1);
  const [titleFontId, setTitleFontId] = useState<ThumbnailFontId>('noto_sans');
  const [titleColorId, setTitleColorId] = useState<ThumbnailColorPresetId>('molten_gold');
  const [videoFrames, setVideoFrames] = useState<VideoFrameOption[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [isGeneratingAiPosters, setIsGeneratingAiPosters] = useState(false);
  const [aiPosterError, setAiPosterError] = useState<string | null>(null);
  const [highQualityAiPoster, setHighQualityAiPoster] = useState(true);
  const [directAiTextRender, setDirectAiTextRender] = useState(false);
  const [showPromptBox, setShowPromptBox] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedGeminiAppPrompt, setCopiedGeminiAppPrompt] = useState(false);
  const [directorMeta, setDirectorMeta] = useState<{
    original_title: string;
    detected_genre_burmese?: string;
    visual_hook_summary?: string;
    scannedFrameCount?: number;
    summary_burmese: string;
    scene_descriptions_en: string[];
  }>(() => {
    const init = normalizeDirectorAnalysisResult({});
    return {
      original_title: init.original_title,
      detected_genre_burmese: init.detected_genre_burmese,
      visual_hook_summary: init.visual_hook_summary,
      scannedFrameCount: 0,
      summary_burmese: init.summary_burmese,
      scene_descriptions_en: init.scene_descriptions_en
    };
  });
  const [selectedCardId, setSelectedCardId] = useState<string>('thumb-card-1');
  const [savedSeriesList, setSavedSeriesList] = useState<SavedSeriesPreset[]>([]);
  const [reusedPart1Preset, setReusedPart1Preset] = useState<SavedSeriesPreset | null>(null);
  const [isSavingPng, setIsSavingPng] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [hasManuallyChosenTitle, setHasManuallyChosenTitle] = useState(false);
  const customImageInputRef = useRef<HTMLInputElement>(null);
  const scannedFramesRef = useRef<VideoFrameOption[]>([]);
  const rawVideoFramesRef = useRef<VideoFrameOption[]>([]);
  const hasUserModifiedFramesRef = useRef(false);
  const wasOpenRef = useRef(false);

  const loadTitlesFromServer = useCallback(
    async (explicitScanFrames?: VideoFrameOption[]) => {
      setIsLoadingTitles(true);
      const localNormalized = normalizeDirectorAnalysisResult({
        scriptText,
        cues,
        rawTitle: videoTitle,
        scriptStyle,
        partNumber,
        aspectRatio
      });
      setSuggestedTitles(localNormalized.suggested_titles);
      setDirectorMeta((prev) => ({
        original_title:
          prev.original_title && prev.original_title !== 'Unknown'
            ? prev.original_title
            : localNormalized.original_title,
        detected_genre_burmese: prev.detected_genre_burmese,
        visual_hook_summary: prev.visual_hook_summary,
        scannedFrameCount: prev.scannedFrameCount || 0,
        summary_burmese: localNormalized.summary_burmese,
        scene_descriptions_en: localNormalized.scene_descriptions_en
      }));
      setBaseTitle((prev) => (prev.trim() ? prev : localNormalized.selected_title || ''));

      const framesToScan = (
        explicitScanFrames && explicitScanFrames.length > 0
          ? explicitScanFrames
          : scannedFramesRef.current
      ).filter((f) => Boolean(f?.dataUrl) && !f.id.startsWith('bg-frame-'));

      try {
        const freeKeys = isFreeTier ? loadFreeUserApiKeys() : { geminiKey: '', groqKey: '' };
        const resp = await fetch('/api/recap/suggest-titles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isFreeMode: isFreeTier,
            userGeminiApiKey: isFreeTier && freeKeys.geminiKey ? freeKeys.geminiKey : undefined,
            scriptText,
            cues: cues.slice(0, 28).map((c) => ({ text: c.text })),
            videoTitle,
            scriptStyle,
            targetLanguage,
            partNumber,
            aspectRatio,
            jobId: lastJobId,
            localUploadId,
            videoDuration: Math.max(6, videoDuration || 30),
            scanFrames: framesToScan.slice(0, 6).map((f) => ({
              dataUrl: f.dataUrl,
              timeSec: f.timeSec,
              label: f.label
            }))
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const nextTitles =
            Array.isArray(data?.suggested_titles) && data.suggested_titles.length > 0
              ? data.suggested_titles
              : Array.isArray(data?.titles) && data.titles.length > 0
                ? data.titles
                : null;
          if (data?.ok && nextTitles) {
            setSuggestedTitles(nextTitles.slice(0, 5));
            setDirectorMeta({
              original_title: String(data.original_title || 'Unknown'),
              detected_genre_burmese: data.detected_genre_burmese
                ? String(data.detected_genre_burmese)
                : undefined,
              visual_hook_summary: data.visual_hook_summary
                ? String(data.visual_hook_summary)
                : undefined,
              scannedFrameCount: Number(data.scannedFrameCount || framesToScan.length || 0),
              summary_burmese: String(data.summary_burmese || localNormalized.summary_burmese),
              scene_descriptions_en:
                Array.isArray(data.scene_descriptions_en) && data.scene_descriptions_en.length >= 3
                  ? data.scene_descriptions_en.slice(0, 3)
                  : localNormalized.scene_descriptions_en
            });
            setBaseTitle((prev) =>
              !prev.trim() || localNormalized.suggested_titles.includes(prev)
                ? data.selected_title || nextTitles[0]
                : prev
            );

            // Auto-apply AI-picked best hero character scenes from the scanned video!
            if (!hasUserModifiedFramesRef.current) {
              if (
                Array.isArray(data.best_frame_indices) &&
                data.best_frame_indices.length > 0 &&
                framesToScan.length >= 3
              ) {
                const pickedHeroFrames = selectBestFramesByIndices(
                  framesToScan,
                  data.best_frame_indices
                );
                if (pickedHeroFrames.length > 0) {
                  rawVideoFramesRef.current = pickedHeroFrames;
                  setVideoFrames(pickedHeroFrames);
                }
              } else if (
                Array.isArray(data.selected_frames) &&
                data.selected_frames.length > 0
              ) {
                rawVideoFramesRef.current = data.selected_frames;
                setVideoFrames(data.selected_frames);
              }
            }
          }
        }
      } catch {
        // Local fallback already populated
      } finally {
        setIsLoadingTitles(false);
      }
    },
    [
      aspectRatio,
      cues,
      isFreeTier,
      lastJobId,
      localUploadId,
      partNumber,
      scriptStyle,
      scriptText,
      targetLanguage,
      videoDuration,
      videoTitle
    ]
  );

  const extractThreeFrames = useCallback(async (): Promise<VideoFrameOption[]> => {
    setIsExtractingFrames(true);
    try {
      if (lastJobId || localUploadId) {
        try {
          const resp = await fetch('/api/recap/extract-thumbnails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobId: lastJobId,
              localUploadId,
              durationSec: Math.max(6, videoDuration || 30),
              count: 6
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data?.ok && Array.isArray(data.frames) && data.frames.length > 0) {
              scannedFramesRef.current = data.frames;
              const initialThree = selectBestFramesByIndices(data.frames);
              rawVideoFramesRef.current = initialThree;
              setVideoFrames(initialThree);
              return data.frames;
            }
          }
        } catch {}
      }

      if (videoUrl) {
        const cliFrames = await grabClientVideoFrames(videoUrl, videoDuration, 6);
        if (cliFrames.length >= 2) {
          scannedFramesRef.current = cliFrames;
          const initialThree = selectBestFramesByIndices(cliFrames);
          rawVideoFramesRef.current = initialThree;
          setVideoFrames(initialThree);
          return cliFrames;
        }
      }

      const fallbackBackdrops: VideoFrameOption[] = [
        {
          id: 'bg-frame-1',
          label: 'Key Poster Hook',
          timeSec: Math.round((videoDuration || 30) * 0.16),
          dataUrl: buildAtmosphericPosterBackdrop(0)
        },
        {
          id: 'bg-frame-2',
          label: 'Turning Point',
          timeSec: Math.round((videoDuration || 30) * 0.5),
          dataUrl: buildAtmosphericPosterBackdrop(1)
        },
        {
          id: 'bg-frame-3',
          label: 'Climax Scene',
          timeSec: Math.round((videoDuration || 30) * 0.82),
          dataUrl: buildAtmosphericPosterBackdrop(2)
        }
      ];
      scannedFramesRef.current = [];
      rawVideoFramesRef.current = [];
      setVideoFrames(fallbackBackdrops);
      return [];
    } finally {
      setIsExtractingFrames(false);
    }
  }, [lastJobId, localUploadId, videoDuration, videoUrl]);

  const handleGenerateAiPosters = async () => {
    if (isGeneratingAiPosters) return;
    playUiSound('tap');
    setIsGeneratingAiPosters(true);
    setAiPosterError(null);
    setReusedPart1Preset(null);

    try {
      const freeKeys = isFreeTier ? loadFreeUserApiKeys() : { geminiKey: '', groqKey: '' };
      const sourceSceneFrames = (
        rawVideoFramesRef.current.length > 0 ? rawVideoFramesRef.current : videoFrames
      )
        .filter((f) => Boolean(f?.dataUrl) && !f.id.startsWith('bg-frame-') && !f.isAiPoster)
        .slice(0, 3)
        .map((f) => f.dataUrl);

      const resp = await fetch('/api/recap/generate-poster-art', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFreeMode: isFreeTier,
          userGeminiApiKey: isFreeTier && freeKeys.geminiKey ? freeKeys.geminiKey : undefined,
          sceneDescriptionsEn: directorMeta.scene_descriptions_en,
          selectedTitle: baseTitle,
          partNumber,
          aspectRatio,
          highQuality: highQualityAiPoster,
          directPromptWithText: directAiTextRender,
          referenceFrames: sourceSceneFrames,
          localUploadId,
          jobId: lastJobId
        })
      });
      const data = await resp.json().catch(() => null);
      const returnedFrames = Array.isArray(data?.frames)
        ? data.frames
        : Array.isArray(data?.posters)
          ? data.posters.map((p: any, i: number) => ({
              id: p.id || `ai-poster-${i + 1}`,
              label: p.label || `AI Poster ${i + 1}`,
              timeSec: 0,
              dataUrl: p.dataUrl || p.imageDataUrl || '',
              isAiPoster: true
            }))
          : [];
      if (!resp.ok || !data?.ok || returnedFrames.length === 0) {
        playUiSound('blocked');
        setAiPosterError(
          data?.error ||
            'AI Poster ထုတ်မရပါ — Prompt ကို Copy ယူ၍ သုံးနိုင်သလို Video Scene Poster များကိုလည်း Save နိုင်ပါသည်။'
        );
        return;
      }

      if (
        data?.provider === 'cloudflare-flux' ||
        data?.provider === 'free-ai-poster' ||
        data?.provider === 'cinema-scene-poster' ||
        data?.directPromptWithText === false
      ) {
        setDirectAiTextRender(false);
      }

      hasUserModifiedFramesRef.current = true;
      setVideoFrames(
        returnedFrames.map((f: VideoFrameOption) => ({
          ...f,
          isAiPoster: true
        }))
      );
      setSelectedCardId('thumb-card-1');
      playUiSound('success');
      setSaveFeedback(
        uiLang === 'my'
          ? data?.provider === 'gemini' && data?.sceneBased
            ? 'Gemini Nano Banana ဖြင့် ဗီဒီယိုဇာတ်ကောင်အစစ်မှ 8K Movie Poster ၃ ပုံ ဖန်တီးပြီးပါပြီ — ကြိုက်ရာရွေး Save နိုင်ပါပြီ'
            : data?.provider === 'cloudflare-flux'
              ? data?.sceneBased
                ? 'FLUX-2 AI ဖြင့် ဗီဒီယိုဇာတ်ကောင်အစစ်မှ 8K Photorealistic Movie Poster ၃ ပုံ ဖန်တီးပြီးပါပြီ — 3D ရွှေရောင်ခေါင်းစဉ် + အပိုင်း Badge တွဲ Save နိုင်ပါပြီ'
                : 'FLUX-2 AI Photorealistic Movie Poster ၃ ပုံ ဖန်တီးပြီးပါပြီ — 3D ရွှေရောင်ခေါင်းစဉ် + အပိုင်း Badge တွဲ Save နိုင်ပါပြီ'
              : data?.provider === 'cinema-scene-poster'
                ? 'ဗီဒီယို Scene ဇာတ်ကောင်အစစ်ကို Cinema Poster ၃ ပုံ အလှပြင်ပေးပြီးပါပြီ — 3D ရွှေရောင်ခေါင်းစဉ် + အပိုင်း Badge တွဲ Save နိုင်ပါပြီ'
                : data?.provider === 'free-ai-poster'
                  ? 'AI Movie Poster ၃ ပုံ ထုတ်ပေးပြီးပါပြီ — 3D ရွှေရောင်ခေါင်းစဉ် + အပိုင်း Badge တွဲ Save နိုင်ပါပြီ'
                  : 'AI Movie Poster ၃ ပုံ အသစ်ဖန်တီးပြီးပါပြီ — ကြိုက်ရာပုံရွေးပြီး Save နိုင်ပါပြီ'
          : data?.provider === 'gemini' && data?.sceneBased
            ? 'Transformed 3 real video scenes with Gemini Nano Banana! Pick one to Save & Download.'
            : 'Generated 3 cinematic AI movie posters! Pick one to Save & Download.'
      );
      window.setTimeout(() => setSaveFeedback(null), 5000);
    } catch (err) {
      playUiSound('blocked');
      setAiPosterError(err instanceof Error ? err.message : 'Failed to generate AI posters.');
    } finally {
      setIsGeneratingAiPosters(false);
    }
  };

  // Initialize strictly on modal open transition: extract 6 video keyframes first, then scan them with Gemini Director
  useEffect(() => {
    if (!isOpen || isFreeTier) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    hasUserModifiedFramesRef.current = false;
    setSaveFeedback(null);
    setAiPosterError(null);
    setSavedSeriesList(loadSavedSeriesPresets(userId));
    setReusedPart1Preset(null);
    setHasManuallyChosenTitle(false);
    setBaseTitle('');
    setPartNumber(1);
    setSelectedCardId('thumb-card-1');
    void (async () => {
      const scanned = await extractThreeFrames();
      await loadTitlesFromServer(scanned);
    })();
  }, [isOpen, isFreeTier, userId, loadTitlesFromServer, extractThreeFrames]);

  if (!isOpen) return null;

  if (isFreeTier) {
    return (
      <div
        data-testid="thumbnail-credit-lock-backdrop"
        className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <div
          data-testid="thumbnail-credit-lock-modal"
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/35 bg-white p-5 shadow-2xl dark:border-amber-500/30 dark:bg-[#111720]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
                <Lock className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">
                  {uiLang === 'my' ? 'Credit Mode သီးသန့် Feature' : 'Credit Mode Exclusive'}
                </h3>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  Auto Title &amp; 3 AI Movie Posters Studio
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-stone-600 dark:text-slate-300">
            {uiLang === 'my'
              ? 'Thumbnail Studio (ဗီဒီယို Scan ခေါင်းစဉ် Auto ထုတ်ခြင်း၊ AI Movie Poster ၃ ပုံနှင့် 3D Myanmar Font/Color အလှပြင်ခြင်း) ကို Credit Mode တွင်သာ အခမဲ့ (Credit အပိုမဖြတ်ဘဲ) အသုံးပြုနိုင်ပါသည်။'
              : 'Thumbnail Studio (Video Scan Auto Titles, 3 AI Movie Posters, and 3D Myanmar Font & Color styling) is available exclusively in Credit Mode with 0 extra credits deducted.'}
          </p>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9.5 cursor-pointer rounded-xl border border-stone-200 px-4 text-xs font-semibold text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {uiLang === 'my' ? 'ပိတ်မည်' : 'Close'}
            </button>
            {onSwitchToCreditMode && (
              <button
                type="button"
                data-testid="switch-to-credit-mode-from-thumbnail-btn"
                onClick={() => {
                  playUiSound('tap');
                  onClose();
                  onSwitchToCreditMode();
                }}
                className="inline-flex h-9.5 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-bold text-slate-950 shadow-sm hover:bg-amber-400"
              >
                <Crown className="size-3.5" />
                <span>{uiLang === 'my' ? 'Credit Mode သို့ ပြောင်းမည်' : 'Switch to Credit Mode'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const candidates: ThumbnailCandidate[] = buildThumbnailCandidates({
    frames: videoFrames,
    reusedPart1Preset,
    partNumber
  }).map((c) => ({
    ...c,
    isFullAiRendered: Boolean(c.isAiPoster && directAiTextRender && !c.isReusedPart1Image)
  }));
  const activeCandidate =
    candidates.find((c) => c.id === selectedCardId) || candidates[0] || null;
  const activeIdx = Math.max(0, candidates.findIndex((c) => c.id === selectedCardId));
  const fullFormattedTitle = formatSeriesTitleWithPart(baseTitle, partNumber);
  const partBadgeText = formatPartBadgeLabel(partNumber);
  const liveImagePrompt = buildThumbnailImagePromptTemplate({
    sceneDescriptionEn:
      directorMeta.scene_descriptions_en[activeIdx] || directorMeta.scene_descriptions_en[0] || '',
    selectedTitle: baseTitle,
    partNumber,
    aspectRatio
  });
  const geminiAppQuickPrompt = buildGeminiAppQuickPrompt({
    selectedTitle: baseTitle,
    partNumber,
    aspectRatio,
    sceneDescriptionEn:
      directorMeta.scene_descriptions_en[activeIdx] || directorMeta.scene_descriptions_en[0] || ''
  });

  // Trigger Part 1 -> Part 2 Auto Reuse (restores saved Part 1 title + Part 1 photo & auto stamps Part 2!)
  const handleApplySavedSeriesToPart = (
    preset: SavedSeriesPreset,
    targetPart: number
  ) => {
    playUiSound('success');
    const plan = buildPart2ContinuationCandidates({
      preset,
      currentVideoFrames: videoFrames,
      targetPartNumber: targetPart
    });
    setBaseTitle(plan.baseTitle);
    setPartNumber(plan.partNumber);
    setTitleFontId(plan.titleFontId);
    setTitleColorId(plan.titleColorId);
    setReusedPart1Preset(preset);
    setHasManuallyChosenTitle(false);
    setSelectedCardId('thumb-card-1');
    onSelectTitle?.(formatSeriesTitleWithPart(plan.baseTitle, plan.partNumber));
    setSaveFeedback(
      `အရင် "${plan.baseTitle}" ခေါင်းစဉ်နဲ့ ပုံကို ${formatPartBadgeLabel(plan.partNumber)} အဖြစ် Auto ထည့်သွင်းပြီးပါပြီ`
    );
    window.setTimeout(() => setSaveFeedback(null), 4000);
  };

  // Selecting Part (1) / Part (2): auto-carries saved Part 1 Title & Photo when switching to Part 2+
  const handleSelectPartNumber = (nextPart: ThumbnailPartNumber) => {
    if (
      nextPart &&
      nextPart >= 2 &&
      savedSeriesList.length > 0 &&
      !reusedPart1Preset &&
      !hasManuallyChosenTitle
    ) {
      handleApplySavedSeriesToPart(savedSeriesList[0], nextPart);
      return;
    }
    playUiSound('select');
    setPartNumber(nextPart);
    onSelectTitle?.(formatSeriesTitleWithPart(baseTitle, nextPart));
  };

  const handleCopyFullTitle = async () => {
    if (!fullFormattedTitle) return;
    playUiSound('tap');
    try {
      await navigator.clipboard.writeText(fullFormattedTitle);
      setCopiedTitle(true);
      window.setTimeout(() => setCopiedTitle(false), 1800);
    } catch {}
  };

  const handleUploadCustomPicture = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      playUiSound('success');
      hasUserModifiedFramesRef.current = true;
      setReusedPart1Preset(null);
      setVideoFrames((prev) => {
        const next = [...prev];
        const targetIdx = candidates.findIndex((c) => c.id === selectedCardId);
        const idx = targetIdx >= 0 ? targetIdx : 0;
        const customFrame = {
          id: `custom-${Date.now()}`,
          label: 'Custom Photo',
          timeSec: 0,
          dataUrl
        };
        next[idx] = customFrame;
        const rawCopy = [...(rawVideoFramesRef.current.length ? rawVideoFramesRef.current : next)];
        rawCopy[idx] = customFrame;
        rawVideoFramesRef.current = rawCopy;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const persistCurrentAsSeriesPreset = (): SavedSeriesPreset[] => {
    if (!activeCandidate || !activeCandidate.frameDataUrl) return savedSeriesList;
    const updated = saveSeriesPreset(
      {
        baseTitle: stripPartSuffixFromTitle(baseTitle) || 'Movie Recap',
        partNumber: partNumber || 1,
        layoutId: activeCandidate.layoutId,
        titleFontId,
        titleColorId,
        frameDataUrl: activeCandidate.frameDataUrl,
        aspectRatio,
        channelTag
      },
      userId
    );
    setSavedSeriesList(updated);
    return updated;
  };

  const handleCopyImagePrompt = async () => {
    if (!liveImagePrompt) return;
    playUiSound('tap');
    try {
      await navigator.clipboard.writeText(liveImagePrompt);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {}
  };

  const handleDownloadSelectedThumbnail = async () => {
    if (!activeCandidate || isSavingPng) return;
    playUiSound('tap');
    setIsSavingPng(true);
    try {
      const pngBlob = await renderThumbnailToPngBlob({
        frameDataUrl: activeCandidate.frameDataUrl,
        baseTitle,
        partNumber,
        layoutId: activeCandidate.layoutId,
        titleFontId,
        titleColorId,
        aspectRatio,
        channelTag,
        skipOverlayText: Boolean(activeCandidate.isFullAiRendered)
      });
      if (!pngBlob) return;

      // Save preset automatically so Part 2 / Part 3 can reuse exact Title + Photo in 1 click!
      persistCurrentAsSeriesPreset();
      onSelectTitle?.(fullFormattedTitle);

      const safeSlug =
        (stripPartSuffixFromTitle(baseTitle) || 'ttak_thumbnail')
          .replace(/[^\p{L}\p{M}\p{N}_-]+/gu, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 42) || 'ttak_thumbnail';
      const partSuffix = partNumber ? `_part${partNumber}` : '';
      const blobUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${safeSlug}${partSuffix}_thumbnail.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);

      playUiSound('success');
      setSaveFeedback(
        uiLang === 'my'
          ? `Thumbnail ပုံ (${formatPartBadgeLabel(partNumber) || 'Single'}) Save & Download ပြီးပါပြီ — နောက်တစ်ပိုင်း (${formatPartBadgeLabel((partNumber || 1) + 1)}) မှာ ပြန်သုံးနိုင်ပါပြီ`
          : `Saved & Downloaded PNG + saved series preset for next episode!`
      );
      window.setTimeout(() => setSaveFeedback(null), 5000);
    } finally {
      setIsSavingPng(false);
    }
  };

  return (
    <div
      data-testid="thumbnail-studio-backdrop"
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        data-testid="thumbnail-studio-modal"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92dvh] w-full sm:max-w-6xl flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-stone-200/90 bg-[#FAF8F4] shadow-2xl dark:border-slate-800 dark:bg-[#0D1117]"
      >
        {/* Top Modal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-stone-200/80 bg-white/90 px-4 py-3.5 sm:px-6 dark:border-slate-800 dark:bg-[#111720]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-amber-500" />
              <h2 className="truncate text-sm sm:text-base font-bold text-stone-900 dark:text-white">
                Auto Title &amp; 3 Video Thumbnails Studio
              </h2>
            </div>
            <p className="mt-0.5 truncate text-[11px] text-stone-500 dark:text-slate-400">
              {uiLang === 'my'
                ? 'ခေါင်းစဉ် Auto ရွေးမည် · အပိုင်း (၁)/(၂) သတ်မှတ်မည် · 3 ပုံထဲမှ ကြိုက်ရာ Thumbnail ထုတ် Save မည်'
                : 'Pick auto title, set Part 1 / Part 2 badge, and save any of 3 video-matched thumbnails.'}
            </p>
          </div>
          <button
            type="button"
            data-testid="close-thumbnail-studio-btn"
            aria-label="Close Thumbnail Studio"
            onClick={onClose}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-200/70 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scrollable Workspace Body */}
        <div className="flex-1 space-y-3.5 overflow-y-auto px-4 py-3 sm:px-6">
          {/* SAVED SERIES CONTINUITY (Part 1 -> Part 2 Quick Auto-Apply) */}
          {savedSeriesList.length > 0 && (
            <section
              data-testid="saved-series-section"
              className="rounded-2xl border border-amber-500/35 bg-amber-500/[0.06] p-2.5 sm:p-3 dark:bg-amber-500/[0.08]"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-amber-500" />
                  <span className="text-xs font-bold text-stone-900 dark:text-amber-200">
                    {uiLang === 'my'
                      ? 'အရင် ထုတ်ခဲ့တဲ့ ခေါင်းစဉ်နဲ့ Thumbnail ပုံ ပြန်သုံးမည် (Part 1 → Part 2 Auto)'
                      : 'Reuse Saved Series Title & Photo (Auto Part 2)'}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-stone-500 dark:text-slate-400">
                  {savedSeriesList.length} saved
                </span>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-1">
                {savedSeriesList.map((preset) => {
                  const nextPart = Math.max(2, preset.partNumber + 1);
                  const isActivePreset = reusedPart1Preset?.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      data-testid={`saved-series-card-${preset.id}`}
                      className={`flex shrink-0 items-center gap-2.5 rounded-xl border p-2 transition-all ${
                        isActivePreset
                          ? 'border-amber-500 bg-white shadow-xs dark:bg-[#151C26]'
                          : 'border-stone-200/80 bg-white/80 dark:border-slate-700/80 dark:bg-[#111720]'
                      }`}
                    >
                      <img
                        src={preset.frameDataUrl}
                        alt={preset.baseTitle}
                        className="h-14 w-10 shrink-0 rounded-lg object-cover border border-stone-200 dark:border-slate-700"
                      />
                      <div className="max-w-[175px] min-w-0 space-y-1">
                        <p className="truncate text-[11px] font-bold text-stone-900 dark:text-white">
                          {preset.baseTitle}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            data-testid="apply-part2-preset-btn"
                            onClick={() => handleApplySavedSeriesToPart(preset, nextPart)}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
                          >
                            <span>{formatPartBadgeLabel(nextPart)} Auto ထုတ်</span>
                            <ArrowRight className="size-3" />
                          </button>
                          <button
                            type="button"
                            aria-label="Delete saved series"
                            onClick={() => {
                              playUiSound('tap');
                              const next = deleteSeriesPreset(preset.id, userId);
                              setSavedSeriesList(next);
                              if (reusedPart1Preset?.id === preset.id) {
                                setReusedPart1Preset(null);
                              }
                            }}
                            className="cursor-pointer rounded-lg p-1 text-stone-400 hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* DESKTOP 2-COLUMN WORKSPACE: Titles & Prompt (Left) + 3 Posters (Right) */}
          <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12 items-start">
          {/* STEP 1: AUTO TITLE PICKER + PART (1)/(2) */}
          <section className="lg:col-span-5 rounded-2xl border border-stone-200/90 bg-white p-3.5 dark:border-slate-800 dark:bg-[#111720]">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-900 dark:text-white">
                  1. Video Title (Auto Match) &amp; Part Selection
                </span>
                {isLoadingTitles && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                    <Loader2 className="size-3 animate-spin" />
                    Scanning video &amp; titles...
                  </span>
                )}
              </div>
              <button
                type="button"
                data-testid="regenerate-titles-btn"
                disabled={isLoadingTitles}
                onClick={() => {
                  playUiSound('tap');
                  setHasManuallyChosenTitle(false);
                  void loadTitlesFromServer();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-300"
              >
                <RefreshCw className={`size-3 ${isLoadingTitles ? 'animate-spin' : ''}`} />
                <span>Video Scan &amp; Title အသစ်ရှာ</span>
              </button>
            </div>

            {/* Original Title + Detected Genre + 2-Sentence Video-Scanned Story Summary Strip */}
            {(directorMeta.original_title && directorMeta.original_title !== 'Unknown') ||
            directorMeta.detected_genre_burmese ||
            directorMeta.summary_burmese ? (
              <div className="mb-2.5 rounded-xl border border-stone-200/70 bg-[#FAF8F4] px-3 py-2 text-[11px] text-stone-600 dark:border-slate-800 dark:bg-[#151C26] dark:text-slate-300">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  {directorMeta.scannedFrameCount && directorMeta.scannedFrameCount > 0 ? (
                    <span className="inline-flex items-center rounded-md bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-300">
                      Video Scanned ({directorMeta.scannedFrameCount} frames)
                    </span>
                  ) : null}
                  {directorMeta.original_title && directorMeta.original_title !== 'Unknown' && (
                    <span className="inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      {directorMeta.original_title}
                    </span>
                  )}
                  {directorMeta.detected_genre_burmese && (
                    <span className="inline-flex items-center rounded-md bg-rose-500/12 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
                      {directorMeta.detected_genre_burmese}
                    </span>
                  )}
                </div>
                <span className="leading-relaxed">{directorMeta.summary_burmese}</span>
              </div>
            ) : null}

            {/* 5 Auto Title Suggestion Pills */}
            <div className="mb-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {suggestedTitles.map((titleOpt, idx) => {
                const selected = stripPartSuffixFromTitle(baseTitle) === stripPartSuffixFromTitle(titleOpt);
                const isFifthOdd = suggestedTitles.length === 5 && idx === 4;
                return (
                  <button
                    key={`${idx}-${titleOpt}`}
                    type="button"
                    data-testid={`auto-title-option-${idx}`}
                    onClick={() => {
                      playUiSound('select');
                      const clean = stripPartSuffixFromTitle(titleOpt);
                      setHasManuallyChosenTitle(true);
                      setBaseTitle(clean);
                      onSelectTitle?.(formatSeriesTitleWithPart(clean, partNumber));
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-left text-xs transition-all ${
                      isFifthOdd ? 'sm:col-span-2' : ''
                    } ${
                      selected
                        ? 'border-amber-500 bg-amber-500/12 font-bold text-stone-900 dark:text-amber-300'
                        : 'border-stone-200/80 bg-[#FAF8F4] font-medium text-stone-700 hover:border-amber-500/50 dark:border-slate-800 dark:bg-[#151C26] dark:text-slate-200'
                    }`}
                  >
                    <span className="line-clamp-1">{titleOpt}</span>
                    {selected && <Check className="size-3.5 shrink-0 text-amber-500" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Title Input + Part (1) / Part (2) Segmented Selector */}
            <div className="flex flex-col gap-2.5">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-medium text-stone-500 dark:text-slate-400">
                  Selected Title (Editable)
                </label>
                <input
                  type="text"
                  data-testid="thumbnail-title-input"
                  value={baseTitle}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHasManuallyChosenTitle(true);
                    setBaseTitle(v);
                    onSelectTitle?.(formatSeriesTitleWithPart(v, partNumber));
                  }}
                  placeholder="ခေါင်းစဉ် ရိုက်ထည့်ပါ သို့မဟုတ် အပေါ်မှ Auto ရွေးပါ..."
                  className="h-10.5 w-full rounded-xl border border-stone-200/90 bg-[#FAF8F4] px-3 text-xs font-semibold text-stone-900 outline-none focus:border-amber-500 dark:border-slate-700/80 dark:bg-[#151C26] dark:text-white"
                />
              </div>

              <div className="space-y-1 shrink-0">
                <span className="block text-[11px] font-medium text-stone-500 dark:text-slate-400">
                  Episode / Part Badge
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="part-btn-none"
                    onClick={() => handleSelectPartNumber(null)}
                    className={`h-10.5 cursor-pointer rounded-xl border px-3 text-[11px] font-bold transition-all whitespace-nowrap ${
                      partNumber === null
                        ? 'border-amber-500 bg-amber-500 text-slate-950'
                        : 'border-stone-200 bg-[#FAF8F4] text-stone-600 hover:border-amber-500/40 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-300'
                    }`}
                  >
                    Single
                  </button>
                  {[1, 2, 3].map((p) => {
                    const active = partNumber === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        data-testid={`part-btn-${p}`}
                        onClick={() => handleSelectPartNumber(p)}
                        className={`h-10.5 cursor-pointer rounded-xl border px-3 text-[11px] font-bold transition-all whitespace-nowrap ${
                          active
                            ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-xs'
                            : 'border-stone-200 bg-[#FAF8F4] text-stone-700 hover:border-amber-500/40 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-200'
                        }`}
                      >
                        {formatPartBadgeLabel(p)}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    data-testid="part-btn-increment"
                    onClick={() => handleSelectPartNumber((partNumber || 3) + 1)}
                    className="h-10.5 cursor-pointer rounded-xl border border-stone-200 bg-[#FAF8F4] px-3 text-xs font-bold text-stone-700 hover:border-amber-500/40 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-200"
                    title="Next part number"
                  >
                    {partNumber && partNumber > 3 ? `${formatPartBadgeLabel(partNumber)} +` : '+'}
                  </button>
                </div>
              </div>

              {/* Myanmar Display Font (4 Fonts) + 3D Poster Color Presets (6 Presets) */}
              <div
                data-testid="thumbnail-typography-customizer"
                className="space-y-2.5 rounded-xl border border-stone-200/80 bg-[#FAF8F4] p-2.5 dark:border-slate-800 dark:bg-[#151C26]"
              >
                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-slate-300">
                    <TypeIcon className="size-3.5 text-amber-500" />
                    <span>{uiLang === 'my' ? 'ခေါင်းစဉ် Font အလှ (4 မျိုး)' : 'Title Font Style (4 Fonts)'}</span>
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {THUMBNAIL_FONT_OPTIONS.map((fontOpt) => {
                      const active = titleFontId === fontOpt.id;
                      return (
                        <button
                          key={fontOpt.id}
                          type="button"
                          data-testid={`thumb-font-btn-${fontOpt.id}`}
                          onClick={() => {
                            playUiSound('select');
                            setTitleFontId(fontOpt.id);
                          }}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all ${
                            active
                              ? 'border-amber-500 bg-amber-500/15 text-stone-900 shadow-2xs dark:text-amber-200'
                              : 'border-stone-200/90 bg-white text-stone-700 hover:border-amber-500/40 dark:border-slate-700/80 dark:bg-[#111720] dark:text-slate-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <span
                              className="block truncate text-xs font-bold leading-tight"
                              style={{ fontFamily: fontOpt.fontFamily }}
                            >
                              {fontOpt.sampleMy}
                            </span>
                            <span className="block truncate text-[10px] text-stone-500 dark:text-slate-400">
                              {uiLang === 'my' ? fontOpt.labelMy : fontOpt.label}
                            </span>
                          </div>
                          {active && <Check className="size-3.5 shrink-0 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-600 dark:text-slate-300">
                    <Palette className="size-3.5 text-amber-500" />
                    <span>{uiLang === 'my' ? '3D စာလုံးကာလာ အရောင် (6 မျိုး)' : '3D Title Color Preset (6 Colors)'}</span>
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {THUMBNAIL_COLOR_PRESETS.map((preset) => {
                      const active = titleColorId === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          data-testid={`thumb-color-btn-${preset.id}`}
                          onClick={() => {
                            playUiSound('select');
                            setTitleColorId(preset.id);
                          }}
                          className={`flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left transition-all ${
                            active
                              ? 'border-amber-500 bg-amber-500/15 text-stone-900 shadow-2xs dark:text-amber-200'
                              : 'border-stone-200/90 bg-white text-stone-700 hover:border-amber-500/40 dark:border-slate-700/80 dark:bg-[#111720] dark:text-slate-200'
                          }`}
                        >
                          <span
                            className="size-4 shrink-0 rounded-md border border-black/30 shadow-xs"
                            style={{ background: preset.swatchCss }}
                          />
                          <span className="truncate text-[10px] font-bold">
                            {uiLang === 'my' ? preset.labelMy : preset.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Copyable Combined Video Post Title + AI Image Prompt Drawer */}
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200/70 bg-[#FAF8F4] px-3 py-2 dark:border-slate-800 dark:bg-[#151C26]">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider block">
                  Post Caption Title
                </span>
                <p
                  data-testid="formatted-series-title-preview"
                  className="truncate text-xs font-bold text-stone-900 dark:text-amber-300"
                >
                  {fullFormattedTitle || '—'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  data-testid="toggle-image-prompt-btn"
                  onClick={() => {
                    playUiSound('tap');
                    setShowPromptBox((v) => !v);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#111720] dark:text-slate-200"
                >
                  <span>AI Prompt</span>
                  {showPromptBox ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>
                <button
                  type="button"
                  data-testid="copy-series-title-btn"
                  onClick={handleCopyFullTitle}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-50 dark:border-slate-700 dark:bg-[#111720] dark:text-slate-200"
                >
                  {copiedTitle ? (
                    <>
                      <Check className="size-3.5 text-teal-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy Title</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {showPromptBox && (
              <div
                data-testid="thumbnail-image-prompt-box"
                className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-2.5 dark:bg-amber-500/[0.06]"
              >
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    AI Poster Prompt (Synced with Selected Title &amp; Part)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      data-testid="copy-gemini-app-prompt-btn"
                      onClick={async () => {
                        playUiSound('tap');
                        try {
                          await navigator.clipboard.writeText(geminiAppQuickPrompt);
                          setCopiedGeminiAppPrompt(true);
                          window.setTimeout(() => setCopiedGeminiAppPrompt(false), 1800);
                        } catch {}
                      }}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950 hover:bg-amber-400"
                    >
                      {copiedGeminiAppPrompt ? (
                        <Check className="size-3" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                      <span>{copiedGeminiAppPrompt ? 'Copied!' : 'Gemini App (MM)'}</span>
                    </button>
                    <button
                      type="button"
                      data-testid="copy-image-prompt-btn"
                      onClick={handleCopyImagePrompt}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-amber-500/40 bg-white px-2 py-0.5 text-[10px] font-bold text-stone-800 hover:bg-amber-50 dark:bg-[#111720] dark:text-amber-200"
                    >
                      {copiedPrompt ? <Check className="size-3 text-teal-500" /> : <Copy className="size-3" />}
                      <span>{copiedPrompt ? 'Copied' : 'EN Prompt'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-stone-700 dark:text-amber-100/90 select-all">
                  {geminiAppQuickPrompt}
                </p>
                <p className="mt-1.5 border-t border-amber-500/20 pt-1.5 text-[10px] leading-relaxed text-stone-500 dark:text-slate-400 select-all">
                  {liveImagePrompt}
                </p>
              </div>
            )}
          </section>

          {/* STEP 2: AI MOVIE POSTER & 3 VIDEO-MATCHED THUMBNAIL CARDS */}
          <section className="lg:col-span-7 rounded-2xl border border-stone-200/90 bg-white p-3.5 dark:border-slate-800 dark:bg-[#111720]">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-stone-900 dark:text-white">
                  2. Cinematic Poster &amp; 3 Thumbnail Options
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  {uiLang === 'my'
                    ? 'AI Poster ၃ ပုံ အသစ်ဖန်တီးနိုင်သလို Video Scene ပုံများပေါ်တွင် 3D ရွှေရောင်ခေါင်းစဉ် + အပိုင်း (၁)/(၂) ထိုးပြီး Save နိုင်ပါတယ်'
                    : 'Generate dramatic AI movie poster artwork or style video scenes with 3D Gold typography.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  data-testid="generate-ai-posters-btn"
                  disabled={isGeneratingAiPosters}
                  onClick={handleGenerateAiPosters}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-[11px] font-bold text-slate-950 shadow-xs hover:brightness-105 disabled:opacity-60"
                >
                  {isGeneratingAiPosters ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="size-3.5" />
                  )}
                  <span>
                    {isGeneratingAiPosters
                      ? uiLang === 'my'
                        ? 'AI Poster ထုတ်နေသည်...'
                        : 'Creating AI Posters...'
                      : uiLang === 'my'
                        ? 'AI Poster 3ပုံ ထုတ်မည်'
                        : 'Generate 3 AI Posters'}
                  </span>
                </button>

                <button
                  type="button"
                  data-testid="toggle-hq-poster-btn"
                  onClick={() => {
                    playUiSound('tap');
                    setHighQualityAiPoster((v) => !v);
                  }}
                  title="Use Nano Banana 2.1 High-Quality Poster Model"
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors ${
                    highQualityAiPoster
                      ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                      : 'border-stone-200 bg-stone-50 text-stone-600 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-300'
                  }`}
                >
                  <span>HD 2.1</span>
                </button>

                <button
                  type="button"
                  data-testid="toggle-direct-ai-text-btn"
                  onClick={() => {
                    playUiSound('tap');
                    setDirectAiTextRender((v) => !v);
                  }}
                  title="Let AI render Burmese typography directly inside poster (vs crisp Studio 3D overlay)"
                  className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors ${
                    directAiTextRender
                      ? 'border-red-500 bg-red-500/15 text-red-600 dark:text-red-300'
                      : 'border-stone-200 bg-stone-50 text-stone-600 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-300'
                  }`}
                >
                  <span>AI Text</span>
                </button>

                <input
                  ref={customImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleUploadCustomPicture(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => customImageInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-300"
                >
                  <Upload className="size-3" />
                  <span>Custom Photo</span>
                </button>
                <button
                  type="button"
                  disabled={isExtractingFrames}
                  onClick={() => {
                    playUiSound('tap');
                    hasUserModifiedFramesRef.current = false;
                    setReusedPart1Preset(null);
                    void extractThreeFrames();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-50 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-300"
                >
                  <RefreshCw className={`size-3 ${isExtractingFrames ? 'animate-spin' : ''}`} />
                  <span>Video Frames</span>
                </button>
              </div>
            </div>

            {aiPosterError && (
              <div
                data-testid="ai-poster-error-banner"
                className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-200"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <AlertCircle className="size-4 shrink-0 text-amber-500" />
                  <span>{aiPosterError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowPromptBox(true);
                    void handleCopyImagePrompt();
                  }}
                  className="shrink-0 cursor-pointer rounded-lg bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-slate-950"
                >
                  Copy Prompt
                </button>
              </div>
            )}

            {(isExtractingFrames && videoFrames.length === 0) || isGeneratingAiPosters ? (
              <div className="flex h-52 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-500/40 bg-[#FAF8F4] text-xs text-stone-600 dark:border-amber-500/30 dark:bg-[#151C26] dark:text-slate-300">
                <Loader2 className="size-5 animate-spin text-amber-500" />
                <span className="font-semibold">
                  {isGeneratingAiPosters
                    ? uiLang === 'my'
                      ? 'ဇာတ်လမ်းအလိုက် AI Movie Poster ၃ ပုံ ဖန်တီးနေပါသည်...'
                      : 'Generating 3 dramatic AI movie posters from your story...'
                    : 'Extracting 3 scenes from your video...'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {candidates.map((card, idx) => {
                  const isSelected = selectedCardId === card.id;
                  const cleanCardTitle = stripPartSuffixFromTitle(baseTitle) || baseTitle;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      data-testid={`thumbnail-candidate-${idx + 1}`}
                      onClick={() => {
                        playUiSound('select');
                        setSelectedCardId(card.id);
                      }}
                      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500/35 bg-amber-500/[0.04]'
                          : 'border-stone-200/90 bg-[#FAF8F4] hover:border-amber-500/50 dark:border-slate-800 dark:bg-[#151C26]'
                      }`}
                    >
                      {/* Live WYSIWYG Full-Frame Aspect-Locked Canvas Poster Preview Stage (Never Crops Top Title or Bottom Badge on Mobile) */}
                      <div className="flex w-full items-center justify-center bg-[#06090e] p-2 sm:p-0">
                        <div
                          className={`relative mx-auto w-full overflow-hidden rounded-lg sm:rounded-none bg-slate-950 ${
                            aspectRatio === '16:9' || aspectRatio === '4:3'
                              ? 'max-w-full'
                              : 'max-w-[240px] sm:max-w-none'
                          }`}
                          style={{
                            aspectRatio:
                              aspectRatio === '16:9'
                                ? '16 / 9'
                                : aspectRatio === '1:1'
                                  ? '1 / 1'
                                  : aspectRatio === '4:5'
                                    ? '4 / 5'
                                    : aspectRatio === '4:3'
                                      ? '4 / 3'
                                      : '9 / 16'
                          }}
                        >
                          {card.frameDataUrl ? (
                            <PosterPreviewCanvas
                              frameDataUrl={card.frameDataUrl}
                              baseTitle={cleanCardTitle}
                              partNumber={partNumber}
                              layoutId={card.layoutId}
                              titleFontId={titleFontId}
                              titleColorId={titleColorId}
                              aspectRatio={aspectRatio}
                              channelTag={channelTag}
                              skipOverlayText={Boolean(card.isFullAiRendered)}
                              alt={card.label}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-600">
                              <ImageIcon className="size-8" />
                            </div>
                          )}

                          {/* Corner Selection & Source Status Tags */}
                          <div className="pointer-events-none absolute right-2 bottom-2 left-2 flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1">
                              {isSelected && (
                                <span className="flex size-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 shadow-md">
                                  <Check className="size-3 stroke-[3]" />
                                </span>
                              )}
                              {card.isReusedPart1Image && (
                                <span className="rounded-md bg-teal-600/95 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                                  Part 1 Reused
                                </span>
                              )}
                            </div>
                            {card.isAiPoster && !card.isReusedPart1Image && (
                              <span className="rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold text-slate-950 shadow">
                                AI Poster
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Meta */}
                      <div className="flex items-center justify-between gap-2 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-stone-900 dark:text-white">
                            {idx + 1}. {card.label}
                          </p>
                          <p className="truncate text-[10px] text-stone-500 dark:text-slate-400">
                            {card.subtitle}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-stone-200/80 text-stone-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isSelected ? 'Selected' : 'Select'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          </div>

          {saveFeedback && (
            <div
              data-testid="thumbnail-save-feedback"
              className="flex items-center gap-2 rounded-xl border border-teal-500/35 bg-teal-500/10 px-3.5 py-2.5 text-xs font-semibold text-teal-800 dark:text-teal-200"
            >
              <BookmarkCheck className="size-4 shrink-0 text-teal-500" />
              <span>{saveFeedback}</span>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-stone-200/80 bg-white/95 px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-[#111720]">
          <span className="text-[11px] font-medium text-stone-500 dark:text-slate-400">
            Format: PNG ({aspectRatio === 'original' ? '9:16 HD' : aspectRatio}) · Auto-saves series for Part 2
          </span>
          <div className="flex w-full sm:w-auto items-center justify-end gap-2">
            <button
              type="button"
              data-testid="save-series-template-btn"
              disabled={!activeCandidate || isExtractingFrames}
              onClick={() => {
                playUiSound('success');
                persistCurrentAsSeriesPreset();
                onSelectTitle?.(fullFormattedTitle);
                setSaveFeedback(
                  `"${stripPartSuffixFromTitle(baseTitle)}" (${partBadgeText || 'Series'}) ကို အပိုင်း (၂) မှာ ပြန်သုံးဖို့ Save ထားပြီးပါပြီ`
                );
                window.setTimeout(() => setSaveFeedback(null), 4000);
              }}
              className="inline-flex h-10 flex-1 sm:flex-initial cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 text-xs font-bold text-stone-700 hover:bg-stone-50 disabled:opacity-50 dark:border-slate-700 dark:bg-[#151C26] dark:text-slate-200 dark:hover:bg-[#1D2735]"
            >
              <BookmarkCheck className="size-3.5 text-amber-500" />
              <span>Save Template</span>
            </button>

            <button
              type="button"
              data-testid="download-thumbnail-png-btn"
              disabled={!activeCandidate || isSavingPng}
              onClick={handleDownloadSelectedThumbnail}
              className="inline-flex h-10 flex-1 sm:flex-initial cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 text-xs font-bold text-slate-950 shadow-sm shadow-amber-500/20 disabled:opacity-50"
            >
              {isSavingPng ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              <span>
                {isSavingPng ? 'Rendering PNG...' : 'Save & Download Thumbnail'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
