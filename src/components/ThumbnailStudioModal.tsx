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
  AlertCircle
} from 'lucide-react';
import {
  formatPartBadgeLabel,
  formatSeriesTitleWithPart,
  stripPartSuffixFromTitle,
  wrapBurmeseHeadlineLines,
  extractLocalFallbackTitles,
  buildThumbnailImagePromptTemplate,
  normalizeDirectorAnalysisResult,
  buildThumbnailCandidates,
  buildPart2ContinuationCandidates,
  resolveThumbnailDimensions,
  loadSavedSeriesPresets,
  saveSeriesPreset,
  deleteSeriesPreset,
  POSTER_THEME_SPECS,
  type ThumbnailLayoutId,
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
}

/**
 * Grabs 3 distinct crisp frames directly in the browser from a loaded <video> URL.
 * Falls back cleanly if CORS / codec blocks canvas extraction.
 */
async function grabClientVideoFrames(
  srcUrl: string,
  durationSec: number
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
    }, 4000);

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
        const targetTimes = [
          Math.max(0.25, dur * 0.16),
          Math.max(0.5, dur * 0.5),
          Math.max(0.8, dur * 0.82)
        ];
        const labels = ['Opening Hook', 'Turning Point', 'Climax Scene'];
        const results: VideoFrameOption[] = [];

        const canvas = document.createElement('canvas');
        const targetW = 640;
        const aspect =
          video.videoWidth && video.videoHeight ? video.videoHeight / video.videoWidth : 16 / 9;
        canvas.width = targetW;
        canvas.height = Math.max(320, Math.round(targetW * aspect));
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
            }, 2200);
            video.onseeked = () => {
              if (!doneSeek) {
                doneSeek = true;
                window.clearTimeout(tmr);
                seekResolve();
              }
            };
            video.currentTime = ts;
          });
          // Wait one animation frame for Chromium video decoder surface to update
          await new Promise((r) => window.setTimeout(r, 80));

          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
            if (dataUrl && dataUrl.length > 500) {
              results.push({
                id: `cli-frame-${i + 1}`,
                label: labels[i],
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
 * Draws an ornate pointed-end crimson-red & gold Movie Poster plaque (`အပိုင်း (၁)` / `အပိုင်း (၂)`).
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
  const pillPadX = Math.round(fontSize * 1.25);
  const pillW = Math.round(metrics.width + pillPadX * 2);
  const pillH = Math.round(fontSize * 1.88);
  const pillX = Math.round(centerX - pillW / 2);
  const pillY = Math.round(topY);
  const notch = Math.round(pillH * 0.28);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.82)';
  ctx.shadowBlur = Math.max(8, Math.round(pillH * 0.4));

  ctx.beginPath();
  ctx.moveTo(pillX + notch, pillY);
  ctx.lineTo(pillX + pillW - notch, pillY);
  ctx.quadraticCurveTo(pillX + pillW, pillY + pillH * 0.5, pillX + pillW - notch, pillY + pillH);
  ctx.lineTo(pillX + notch, pillY + pillH);
  ctx.quadraticCurveTo(pillX, pillY + pillH * 0.5, pillX + notch, pillY);
  ctx.closePath();

  const redGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
  redGrad.addColorStop(0, '#7f1d1d');
  redGrad.addColorStop(0.48, '#dc2626');
  redGrad.addColorStop(1, '#450a0a');
  ctx.fillStyle = redGrad;
  ctx.fill();

  ctx.lineWidth = Math.max(1.5, Math.round(fontSize * 0.075));
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.9)';
  ctx.stroke();

  // Left & right ornamental gold diamond wings
  ctx.shadowBlur = 0;
  const wingR = Math.max(2, Math.round(pillH * 0.1));
  [pillX + Math.round(notch * 0.58), pillX + pillW - Math.round(notch * 0.58)].forEach((wx) => {
    const wy = pillY + pillH / 2;
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(wx, wy - wingR);
    ctx.lineTo(wx + wingR, wy);
    ctx.lineTo(wx, wy + wingR);
    ctx.lineTo(wx - wingR, wy);
    ctx.closePath();
    ctx.fill();
  });

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, centerX, pillY + pillH / 2 + Math.max(1, Math.round(fontSize * 0.04)));
  ctx.restore();

  return pillY + pillH;
}

/**
 * Draws floating glowing cinematic embers / atmospheric particles across the poster.
 */
function drawPosterEmbers(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tint: 'gold_orange' | 'crimson_fire' | 'icy_amber'
) {
  // Varied [xRatio, yRatio, radius, angleDeg, elongation]
  const sparkSeeds: Array<[number, number, number, number, number]> = [
    [0.09, 0.11, 2.4, -28, 3.2], [0.22, 0.24, 1.8, -35, 2.4], [0.85, 0.09, 2.8, 32, 3.4],
    [0.91, 0.22, 2.0, 24, 2.6], [0.15, 0.39, 1.9, -20, 2.8], [0.79, 0.35, 2.2, 28, 2.9],
    [0.49, 0.04, 1.6, -12, 2.0], [0.34, 0.29, 1.5, -40, 2.1], [0.69, 0.20, 2.1, 35, 2.5],
    [0.08, 0.57, 1.8, -25, 2.7], [0.93, 0.51, 2.1, 20, 2.8], [0.13, 0.79, 2.3, -32, 3.1],
    [0.87, 0.76, 2.4, 30, 3.0], [0.28, 0.87, 1.6, -18, 2.2], [0.73, 0.89, 1.7, 22, 2.3],
    [0.24, 0.08, 1.4, -30, 1.9], [0.76, 0.14, 1.5, 26, 2.0]
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
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.7);
    if (tint === 'crimson_fire') {
      g.addColorStop(0, 'rgba(254, 240, 138, 0.92)');
      g.addColorStop(0.38, 'rgba(239, 68, 68, 0.65)');
      g.addColorStop(1, 'rgba(220, 38, 38, 0)');
    } else if (tint === 'icy_amber') {
      g.addColorStop(0, 'rgba(224, 242, 254, 0.92)');
      g.addColorStop(0.42, 'rgba(251, 191, 36, 0.55)');
      g.addColorStop(1, 'rgba(14, 165, 233, 0)');
    } else {
      g.addColorStop(0, 'rgba(254, 249, 195, 0.95)');
      g.addColorStop(0.42, 'rgba(249, 115, 22, 0.62)');
      g.addColorStop(1, 'rgba(249, 115, 22, 0)');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 1.7, ry * 1.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hot white-gold spark core streak
    ctx.fillStyle = tint === 'icy_amber' ? 'rgba(240, 249, 255, 0.9)' : 'rgba(254, 249, 195, 0.92)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.55, ry * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/**
 * Renders 3D embossed Burmese poster typography onto a Canvas context with thick dark extrude,
 * atmospheric glow, vertical metallic gradient fill, and subtle top gleam.
 */
function draw3dPosterTextLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  centerX: number,
  y: number,
  titleSize: number,
  gradientStops: [string, string, string, string],
  outlineColor: string,
  glowColor: string
) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;

  // 1. Deep 3D extrude + outer atmospheric aura
  ctx.lineWidth = Math.max(4, Math.round(titleSize * 0.25));
  ctx.strokeStyle = outlineColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = Math.max(10, Math.round(titleSize * 0.34));
  ctx.strokeText(line, centerX, y + Math.max(2, Math.round(titleSize * 0.055)));

  // 2. Crisp dark contour around letters
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2.5, Math.round(titleSize * 0.14));
  ctx.strokeStyle = '#1f0802';
  ctx.strokeText(line, centerX, y);

  // 3. Vertical 4-stop metallic gradient fill
  const fillGrad = ctx.createLinearGradient(0, y, 0, y + titleSize * 1.05);
  fillGrad.addColorStop(0, gradientStops[0]);
  fillGrad.addColorStop(0.32, gradientStops[1]);
  fillGrad.addColorStop(0.7, gradientStops[2]);
  fillGrad.addColorStop(1, gradientStops[3]);
  ctx.fillStyle = fillGrad;
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
    channelTag?: string;
    skipOverlayText?: boolean;
  }
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = dims.width;
  const h = dims.height;
  const theme = POSTER_THEME_SPECS[params.layoutId] || POSTER_THEME_SPECS.poster_gold_3d;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#070a10';
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

  const fontFamily = '"Noto Sans Myanmar", "Pyidaungsu", "Padauk", sans-serif';
  const minDim = Math.min(w, h);
  const padX = Math.round(w * 0.065);
  const partBadge = formatPartBadgeLabel(params.partNumber);
  const cleanTitle = stripPartSuffixFromTitle(params.baseTitle) || params.baseTitle.trim();

  // Compute wrapped headline lines + pixel-fitted font size
  const isLandscape = w > h;
  const maxCharsPerLine = isLandscape ? 19 : 9;
  const lines = cleanTitle ? wrapBurmeseHeadlineLines(cleanTitle, maxCharsPerLine, 3) : [];
  let titleSize = Math.round(
    minDim * (lines.length >= 3 ? 0.076 : lines.length === 2 ? 0.092 : 0.106)
  );
  const safeTextMaxW = Math.round(w * 0.87);
  while (titleSize > Math.round(minDim * 0.036) && lines.length > 0) {
    ctx.font = `900 ${titleSize}px ${fontFamily}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 0);
    if (widest <= safeTextMaxW) break;
    titleSize -= 2;
  }
  const lineHeight = Math.round(titleSize * 1.34);
  const badgeFontSize = Math.max(11, Math.round(minDim * 0.044));

  if (params.layoutId === 'poster_gold_3d' || params.layoutId === 'dramatic_spotlight') {
    // Rich upper atmospheric vignette + subtle bottom edge vignette
    const topDark = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    topDark.addColorStop(0, 'rgba(4, 7, 12, 0.94)');
    topDark.addColorStop(0.55, 'rgba(6, 10, 14, 0.68)');
    topDark.addColorStop(1, 'rgba(6, 10, 14, 0)');
    ctx.fillStyle = topDark;
    ctx.fillRect(0, 0, w, h * 0.5);

    const botDark = ctx.createLinearGradient(0, h * 0.72, 0, h);
    botDark.addColorStop(0, 'rgba(5, 8, 12, 0)');
    botDark.addColorStop(1, 'rgba(5, 8, 12, 0.72)');
    ctx.fillStyle = botDark;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    if (params.layoutId === 'dramatic_spotlight') {
      ctx.save();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.72)';
      ctx.lineWidth = Math.max(2, Math.round(minDim * 0.007));
      const inset = Math.round(minDim * 0.024);
      ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
      ctx.restore();
    }

    drawPosterEmbers(ctx, w, h, theme.emberTint);

    let lastHeadlineBottomY = Math.round(h * 0.16);
    if (lines.length > 0) {
      const topAnchorY = Math.round(h * (lines.length === 1 ? 0.105 : lines.length === 2 ? 0.075 : 0.06));
      ctx.font = `900 ${titleSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((line, idx) => {
        const y = topAnchorY + idx * lineHeight;
        lastHeadlineBottomY = y + titleSize * 1.08;
        draw3dPosterTextLine(
          ctx,
          line,
          w / 2,
          y,
          titleSize,
          theme.gradientStops,
          theme.outlineColor,
          theme.glowColor
        );
      });
    }

    if (partBadge) {
      drawCrimsonGoldPlaque(
        ctx,
        partBadge,
        w / 2,
        lastHeadlineBottomY + Math.round(h * 0.02),
        badgeFontSize,
        fontFamily
      );
    }
  } else if (params.layoutId === 'cinema_hook') {
    // Inferno Crimson Poster: fiery dark crimson lower vignette + top soft darkness
    const topVignette = ctx.createLinearGradient(0, 0, 0, h * 0.28);
    topVignette.addColorStop(0, 'rgba(10, 3, 5, 0.76)');
    topVignette.addColorStop(1, 'rgba(10, 3, 5, 0)');
    ctx.fillStyle = topVignette;
    ctx.fillRect(0, 0, w, h * 0.28);

    const botScrim = ctx.createLinearGradient(0, h * 0.36, 0, h);
    botScrim.addColorStop(0, 'rgba(12, 3, 5, 0)');
    botScrim.addColorStop(0.5, 'rgba(24, 5, 8, 0.78)');
    botScrim.addColorStop(1, 'rgba(8, 2, 4, 0.96)');
    ctx.fillStyle = botScrim;
    ctx.fillRect(0, h * 0.36, w, h * 0.64);

    // Warm crimson spotlight glow behind lower headline
    const crimsonHalo = ctx.createRadialGradient(w / 2, h * 0.84, minDim * 0.05, w / 2, h * 0.84, w * 0.65);
    crimsonHalo.addColorStop(0, 'rgba(220, 38, 38, 0.34)');
    crimsonHalo.addColorStop(1, 'rgba(220, 38, 38, 0)');
    ctx.fillStyle = crimsonHalo;
    ctx.fillRect(0, h * 0.45, w, h * 0.55);

    drawPosterEmbers(ctx, w, h, 'crimson_fire');

    const totalTextH = lines.length * lineHeight;
    const textStartTopY = Math.round(h * 0.92 - totalTextH);
    if (partBadge) {
      const plaqueH = Math.round(badgeFontSize * 1.88);
      drawCrimsonGoldPlaque(
        ctx,
        partBadge,
        w / 2,
        textStartTopY - plaqueH - Math.round(h * 0.022),
        badgeFontSize,
        fontFamily
      );
    }

    if (lines.length > 0) {
      ctx.font = `900 ${titleSize}px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      lines.forEach((line, idx) => {
        const y = textStartTopY + idx * lineHeight;
        const isLast = idx === lines.length - 1;
        const stops: [string, string, string, string] = isLast
          ? ['#fef08a', '#fb923c', '#ef4444', '#b91c1c']
          : ['#ffffff', '#f8fafc', '#fef9c3', '#cbd5e1'];
        draw3dPosterTextLine(
          ctx,
          line,
          w / 2,
          y,
          titleSize,
          stops,
          theme.outlineColor,
          theme.glowColor
        );
      });
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

    drawPosterEmbers(ctx, w, h, 'icy_amber');

    if (partBadge) {
      drawCrimsonGoldPlaque(ctx, partBadge, w / 2, Math.round(h * 0.06), badgeFontSize, fontFamily);
    }

    if (lines.length > 0) {
      const totalTextH = lines.length * lineHeight;
      const textStartTopY = Math.round(h * 0.92 - totalTextH);
      ctx.font = `900 ${titleSize}px ${fontFamily}`;
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
          theme.gradientStops,
          theme.outlineColor,
          theme.glowColor
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
  aspectRatio: string;
  channelTag?: string;
  skipOverlayText?: boolean;
}): Promise<Blob | null> {
  const dims = resolveThumbnailDimensions(params.aspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;

  try {
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
        channelTag,
        skipOverlayText
      });
    };

    void paint();
    return () => {
      cancelled = true;
    };
  }, [aspectRatio, baseTitle, channelTag, frameDataUrl, layoutId, partNumber, skipOverlayText]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={alt}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
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
  onSelectTitle
}) => {
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isLoadingTitles, setIsLoadingTitles] = useState(false);
  const [baseTitle, setBaseTitle] = useState('');
  const [partNumber, setPartNumber] = useState<ThumbnailPartNumber>(1);
  const [videoFrames, setVideoFrames] = useState<VideoFrameOption[]>([]);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [isGeneratingAiPosters, setIsGeneratingAiPosters] = useState(false);
  const [aiPosterError, setAiPosterError] = useState<string | null>(null);
  const [highQualityAiPoster, setHighQualityAiPoster] = useState(false);
  const [directAiTextRender, setDirectAiTextRender] = useState(false);
  const [showPromptBox, setShowPromptBox] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [directorMeta, setDirectorMeta] = useState<{
    original_title: string;
    summary_burmese: string;
    scene_descriptions_en: string[];
  }>(() => {
    const init = normalizeDirectorAnalysisResult({});
    return {
      original_title: init.original_title,
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
  const wasOpenRef = useRef(false);

  const loadTitlesFromServer = useCallback(async () => {
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
    setDirectorMeta({
      original_title: localNormalized.original_title,
      summary_burmese: localNormalized.summary_burmese,
      scene_descriptions_en: localNormalized.scene_descriptions_en
    });
    setBaseTitle((prev) => (prev.trim() ? prev : localNormalized.selected_title || ''));

    try {
      const freeKeys = isFreeTier ? loadFreeUserApiKeys() : { geminiKey: '', groqKey: '' };
      const resp = await fetch('/api/recap/suggest-titles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isFreeMode: isFreeTier,
          userGeminiApiKey: isFreeTier && freeKeys.geminiKey ? freeKeys.geminiKey : undefined,
          scriptText,
          cues: cues.slice(0, 24).map((c) => ({ text: c.text })),
          videoTitle,
          scriptStyle,
          targetLanguage,
          partNumber,
          aspectRatio
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
        }
      }
    } catch {
      // Local fallback already populated
    } finally {
      setIsLoadingTitles(false);
    }
  }, [aspectRatio, cues, isFreeTier, partNumber, scriptStyle, scriptText, targetLanguage, videoTitle]);

  const extractThreeFrames = useCallback(async () => {
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
              durationSec: Math.max(6, videoDuration || 30)
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data?.ok && Array.isArray(data.frames) && data.frames.length > 0) {
              setVideoFrames(data.frames);
              return;
            }
          }
        } catch {}
      }

      if (videoUrl) {
        const cliFrames = await grabClientVideoFrames(videoUrl, videoDuration);
        if (cliFrames.length >= 2) {
          setVideoFrames(cliFrames);
          return;
        }
      }

      setVideoFrames([
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
      ]);
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

      if (data?.provider === 'free-ai-poster' || data?.directPromptWithText === false) {
        setDirectAiTextRender(false);
      }

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
          ? data?.provider === 'free-ai-poster'
            ? 'Free AI Movie Poster ၃ ပုံ ထုတ်ပေးပြီးပါပြီ — 3D ရွှေရောင်ခေါင်းစဉ် + အပိုင်း Badge တွဲ Save နိုင်ပါပြီ'
            : 'AI Movie Poster ၃ ပုံ အသစ်ဖန်တီးပြီးပါပြီ — ကြိုက်ရာပုံရွေးပြီး Save နိုင်ပါပြီ'
          : 'Generated 3 cinematic AI movie posters! Pick one to Save & Download.'
      );
      window.setTimeout(() => setSaveFeedback(null), 4500);
    } catch (err) {
      playUiSound('blocked');
      setAiPosterError(err instanceof Error ? err.message : 'Failed to generate AI posters.');
    } finally {
      setIsGeneratingAiPosters(false);
    }
  };

  // Initialize strictly on modal open transition so background prop updates never wipe active selections
  useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;
    setSaveFeedback(null);
    setAiPosterError(null);
    setSavedSeriesList(loadSavedSeriesPresets(userId));
    setReusedPart1Preset(null);
    setHasManuallyChosenTitle(false);
    setBaseTitle('');
    setPartNumber(1);
    setSelectedCardId('thumb-card-1');
    void loadTitlesFromServer();
    void extractThreeFrames();
  }, [isOpen, userId, loadTitlesFromServer, extractThreeFrames]);

  if (!isOpen) return null;

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
      setReusedPart1Preset(null);
      setVideoFrames((prev) => {
        const next = [...prev];
        const targetIdx = candidates.findIndex((c) => c.id === selectedCardId);
        const idx = targetIdx >= 0 ? targetIdx : 0;
        next[idx] = {
          id: `custom-${Date.now()}`,
          label: 'Custom Photo',
          timeSec: 0,
          dataUrl
        };
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
                    AI generating titles...
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
                <span>Auto Title အသစ်ရှာ</span>
              </button>
            </div>

            {/* Original Title + 2-Sentence Story Summary Strip */}
            {(directorMeta.original_title && directorMeta.original_title !== 'Unknown') ||
            directorMeta.summary_burmese ? (
              <div className="mb-2.5 rounded-xl border border-stone-200/70 bg-[#FAF8F4] px-3 py-2 text-[11px] text-stone-600 dark:border-slate-800 dark:bg-[#151C26] dark:text-slate-300">
                {directorMeta.original_title && directorMeta.original_title !== 'Unknown' && (
                  <span className="mr-2 inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    {directorMeta.original_title}
                  </span>
                )}
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
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                    AI Poster Image Prompt (Synced with Selected Title &amp; Part)
                  </span>
                  <button
                    type="button"
                    data-testid="copy-image-prompt-btn"
                    onClick={handleCopyImagePrompt}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-amber-500/40 bg-white px-2 py-0.5 text-[10px] font-bold text-stone-800 hover:bg-amber-50 dark:bg-[#111720] dark:text-amber-200"
                  >
                    {copiedPrompt ? <Check className="size-3 text-teal-500" /> : <Copy className="size-3" />}
                    <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-stone-600 dark:text-slate-300 select-all">
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
                      {/* Live WYSIWYG High-Res Canvas Poster Preview Stage */}
                      <div
                        className="relative mx-auto w-full overflow-hidden bg-slate-950"
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
                                    : '9 / 16',
                          maxHeight: '340px'
                        }}
                      >
                        {card.frameDataUrl ? (
                          <PosterPreviewCanvas
                            frameDataUrl={card.frameDataUrl}
                            baseTitle={cleanCardTitle}
                            partNumber={partNumber}
                            layoutId={card.layoutId}
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
                              AI Art
                            </span>
                          )}
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
