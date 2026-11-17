import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RotateCw,
  X,
  Plus,
  Check,
  Pencil
} from 'lucide-react';
import {
  formatDuration,
  findActiveCue,
  findDisplayCueAtTime,
  clampBlurRegion,
  computeAspectCanvasLayout,
  resolveBurmeseFontMeta,
  resolveSubtitleFontMeta,
  shouldSyncCompanionAudioTime,
  DEFAULT_DEEPRECAP_EDIT_CONFIG,
  TARGET_LANGUAGES,
  type AspectRatioMode,
  type BlurRegion,
  type BlurStyleMode,
  type BrandGridPos,
  type DeepRecapEditConfig,
  type SubtitleOverlayConfig,
  type AntiCopyrightEffects,
  type SubtitleCue,
  type TargetLanguageCode
} from '../utils/recapEngine';
import { playUiSound } from '../utils/soundEffects';

export type DemoScenePreset = 'cyberpunk' | 'island' | 'scifi';

interface CanvasVideoEditorProps {
  videoFileUrl: string | null;
  demoScene: DemoScenePreset;
  videoDuration: number;
  onDurationLoaded: (sec: number) => void;
  aspectRatio: AspectRatioMode;
  blurEnabled: boolean;
  blurStyle: BlurStyleMode;
  blurRegions: BlurRegion[];
  onChangeBlurRegions: (regions: BlurRegion[]) => void;
  onEnableBlur?: () => void;
  subtitleConfig: SubtitleOverlayConfig;
  onChangeSubtitleConfig: (cfg: SubtitleOverlayConfig) => void;
  effects: AntiCopyrightEffects;
  editConfig?: DeepRecapEditConfig;
  cues: SubtitleCue[];
  targetLanguage: TargetLanguageCode;
  audioBase64?: string;
  voiceoverAudioUrl?: string | null;
  hasMuxedAudio?: boolean;
  isOverlayEditMode: boolean;
  onToggleOverlayEditMode: (editing: boolean) => void;
  onRemoveVideo: () => void;
  isRendering?: boolean;
  renderProgress?: number;
  renderMessage?: string;
}

function getGridPositionStyle(pos: BrandGridPos): React.CSSProperties {
  const row = pos[0]; // 't' | 'm' | 'b'
  const col = pos[1]; // 'l' | 'c' | 'r'
  const style: React.CSSProperties = { position: 'absolute', zIndex: 22 };
  if (row === 't') style.top = '4%';
  else if (row === 'b') style.bottom = '14%';
  else style.top = '50%';

  if (col === 'l') style.left = '4%';
  else if (col === 'r') style.right = '4%';
  else style.left = '50%';

  const tx = col === 'c' ? '-50%' : '0%';
  const ty = row === 'm' ? '-50%' : '0%';
  if (tx !== '0%' || ty !== '0%') {
    style.transform = `translate(${tx}, ${ty})`;
  }
  return style;
}

/**
 * Draws a procedural movie scene when a synthetic demo preset is selected
 */
export function drawProceduralMovieFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  scene: DemoScenePreset
) {
  ctx.save();
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (scene === 'cyberpunk') {
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(0.55, '#1e1b4b');
    grad.addColorStop(1, '#0f172a');
  } else if (scene === 'island') {
    grad.addColorStop(0, '#0c4a6e');
    grad.addColorStop(0.5, '#0284c7');
    grad.addColorStop(1, '#064e3b');
  } else {
    grad.addColorStop(0, '#18181b');
    grad.addColorStop(0.5, '#3b0764');
    grad.addColorStop(1, '#09090b');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const t = timeSec;
  for (let i = 0; i < 7; i++) {
    const xPos = ((i * 190 + t * (28 + i * 7)) % (width + 160)) - 80;
    const bHeight = height * (0.28 + (i % 3) * 0.12);
    ctx.fillStyle =
      scene === 'cyberpunk'
        ? `rgba(56, 189, 248, ${0.08 + (i % 3) * 0.04})`
        : scene === 'island'
          ? `rgba(52, 211, 153, ${0.09 + (i % 2) * 0.04})`
          : `rgba(232, 121, 249, ${0.08 + (i % 3) * 0.04})`;
    ctx.fillRect(xPos, height - bHeight - height * 0.15, 65 + (i % 2) * 30, bHeight);
  }

  const centerX = width * 0.5 + Math.sin(t * 1.4) * (width * 0.08);
  const centerY = height * 0.44 + Math.cos(t * 2.1) * (height * 0.03);
  const radial = ctx.createRadialGradient(
    centerX,
    centerY,
    10,
    centerX,
    centerY,
    Math.min(width, height) * 0.32
  );
  radial.addColorStop(
    0,
    scene === 'cyberpunk'
      ? 'rgba(232, 121, 249, 0.55)'
      : scene === 'island'
        ? 'rgba(250, 204, 21, 0.5)'
        : 'rgba(56, 189, 248, 0.55)'
  );
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(centerX, centerY, Math.min(width, height) * 0.32, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = `700 ${Math.max(13, Math.round(width * 0.035))}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('【 原始电影字幕水印 · ORIGINAL WATERMARK 】', width * 0.5, height * 0.835);
  ctx.restore();
}

/**
 * Draws the Burmese/Multilingual subtitle box directly onto a 2D canvas (for on-device video export)
 */
export function drawSubtitleOnCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string,
  config: SubtitleOverlayConfig
) {
  if (!config.enabled || !text) return;
  ctx.save();

  const scaleFactor = width / 540;
  const pxSize = Math.max(7, Math.round(config.fontSize * 0.35 * scaleFactor));
  const fontMeta = resolveSubtitleFontMeta(config.fontStyle, config.subtitleLanguage, text);
  ctx.font = `${fontMeta.fontWeight} ${pxSize}px ${fontMeta.cssFontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxLineWidth = width * 0.92;
  let pxFit = pxSize;
  ctx.font = `${fontMeta.fontWeight} ${pxFit}px ${fontMeta.cssFontFamily}`;
  // Keep short subtitle phrases on a single horizontal line by gently fitting font size if needed
  while (ctx.measureText(text).width > maxLineWidth && pxFit > 11) {
    pxFit -= 1;
    ctx.font = `${fontMeta.fontWeight} ${pxFit}px ${fontMeta.cssFontFamily}`;
  }

  const visibleLines = [text.trim()];
  const lineHeight = Math.round(1.32 * pxFit);
  const totalHeight = visibleLines.length * lineHeight;
  const centerX = (width * config.x) / 100;
  const centerY = (height * config.y) / 100;

  if (config.style === 'box_black') {
    let maxMeasured = 0;
    for (const l of visibleLines) {
      maxMeasured = Math.max(maxMeasured, ctx.measureText(l).width);
    }
    const padX = Math.round(0.55 * pxSize);
    const padY = Math.round(0.28 * pxSize);
    const boxW = maxMeasured + padX * 2;
    const boxH = totalHeight + padY * 2;
    const boxX = centerX - boxW / 2;
    const boxY = centerY - boxH / 2;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.86)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, Math.min(8, Math.round(0.28 * pxSize)));
    ctx.fill();

    ctx.fillStyle = '#FDE047';
    visibleLines.forEach((line, idx) => {
      const ly = centerY - totalHeight / 2 + lineHeight * (idx + 0.5);
      ctx.fillText(line, centerX, ly);
    });
  } else {
    ctx.lineWidth = Math.max(3, Math.round(0.16 * pxSize));
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#FFFFFF';
    visibleLines.forEach((line, idx) => {
      const ly = centerY - totalHeight / 2 + lineHeight * (idx + 0.5);
      ctx.strokeText(line, centerX, ly);
      ctx.fillText(line, centerX, ly);
    });
  }

  ctx.restore();
}

export const CanvasVideoEditor: React.FC<CanvasVideoEditorProps> = ({
  videoFileUrl,
  demoScene,
  videoDuration,
  onDurationLoaded,
  aspectRatio,
  blurEnabled,
  blurStyle,
  blurRegions,
  onChangeBlurRegions,
  onEnableBlur,
  subtitleConfig,
  onChangeSubtitleConfig,
  effects,
  editConfig,
  cues,
  targetLanguage,
  audioBase64,
  voiceoverAudioUrl = null,
  hasMuxedAudio = false,
  isOverlayEditMode,
  onToggleOverlayEditMode,
  onRemoveVideo,
  isRendering = false,
  renderProgress = 0,
  renderMessage = ''
}) => {
  const activeEdit = editConfig || DEFAULT_DEEPRECAP_EDIT_CONFIG;
  const outerPlayerRef = useRef<HTMLDivElement | null>(null);
  const innerStageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const demoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRotatedLandscapeFs, setIsRotatedLandscapeFs] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);
  const [selectedBlurIdx, setSelectedBlurIdx] = useState<number | null>(
    blurRegions.length > 0 ? 0 : null
  );
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(
    null
  );

  const [companionBlobUrl, setCompanionBlobUrl] = useState<string | null>(null);
  const [stageVideoBlobUrl, setStageVideoBlobUrl] = useState<string | null>(null);
  const preserveStageTimeOnSrcSwapRef = useRef<number | null>(null);
  const lastAudioSessionKeyRef = useRef<string>('');
  const lastUserSeekAtRef = useRef<number>(0);

  // Upgrade server-streamed `/api/recap/video/...` URLs into in-memory Blob URLs so seeking/scrubbing works instantaneously without proxy Range resets
  useEffect(() => {
    let revokedVideoUrl: string | null = null;
    let cancelled = false;

    if (!videoFileUrl || videoFileUrl.startsWith('blob:') || videoFileUrl.startsWith('/api/demo-video')) {
      setStageVideoBlobUrl(null);
      return;
    }

    if (videoFileUrl.startsWith('/api/recap/video/')) {
      fetch(videoFileUrl, { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => {
          if (!cancelled && b && b.size > 1024) {
            revokedVideoUrl = URL.createObjectURL(
              b.type && b.type.includes('video') ? b : new Blob([b], { type: 'video/mp4' })
            );
            if (videoRef.current && videoRef.current.currentTime > 0.25) {
              preserveStageTimeOnSrcSwapRef.current = videoRef.current.currentTime;
            }
            setStageVideoBlobUrl(revokedVideoUrl);
          }
        })
        .catch(() => {});
    } else {
      setStageVideoBlobUrl(null);
    }

    return () => {
      cancelled = true;
      if (revokedVideoUrl) {
        try {
          URL.revokeObjectURL(revokedVideoUrl);
        } catch {}
      }
    };
  }, [videoFileUrl]);

  const effectiveStageVideoSrc = stageVideoBlobUrl || videoFileUrl || undefined;

  useEffect(() => {
    if (hasMuxedAudio) {
      setCompanionBlobUrl(null);
      return;
    }
    let revokedUrl: string | null = null;
    let cancelled = false;

    if (audioBase64) {
      try {
        const binStr = atob(audioBase64);
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) {
          bytes[i] = binStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        revokedUrl = URL.createObjectURL(blob);
        setCompanionBlobUrl(revokedUrl);
      } catch {
        setCompanionBlobUrl(`data:audio/wav;base64,${audioBase64}`);
      }
    } else if (voiceoverAudioUrl) {
      // Set direct URL immediately so playback starts without delay, then upgrade to in-memory Blob URL so 2+ min streams never stall at 0:21
      setCompanionBlobUrl(voiceoverAudioUrl);
      fetch(voiceoverAudioUrl, { credentials: 'same-origin' })
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => {
          if (!cancelled && b && b.size > 512) {
            revokedUrl = URL.createObjectURL(b);
            setCompanionBlobUrl(revokedUrl);
          }
        })
        .catch(() => {});
    } else {
      setCompanionBlobUrl(null);
    }

    return () => {
      cancelled = true;
      if (revokedUrl) {
        try {
          URL.revokeObjectURL(revokedUrl);
        } catch {}
      }
    };
  }, [hasMuxedAudio, audioBase64, voiceoverAudioUrl]);

  const companionAudioSrc = hasMuxedAudio
    ? null
    : companionBlobUrl ||
      (audioBase64 ? `data:audio/wav;base64,${audioBase64}` : voiceoverAudioUrl || null);

  useEffect(() => {
    setVideoLoadError(null);
  }, [videoFileUrl]);

  // Refs for pointer-captured dragging
  const blurMoveRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const blurResizeRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    origWidth: number;
    origHeight: number;
  } | null>(null);

  const subMoveRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const subScaleRef = useRef<{ startClientX: number; startSize: number } | null>(null);
  const timelineScrubRef = useRef<boolean>(false);

  const blurRegionsRef = useRef(blurRegions);
  blurRegionsRef.current = blurRegions;
  const subtitleConfigRef = useRef(subtitleConfig);
  subtitleConfigRef.current = subtitleConfig;
  const onChangeBlurRegionsRef = useRef(onChangeBlurRegions);
  onChangeBlurRegionsRef.current = onChangeBlurRegions;
  const onChangeSubtitleConfigRef = useRef(onChangeSubtitleConfig);
  onChangeSubtitleConfigRef.current = onChangeSubtitleConfig;

  const isProceduralDemo = Boolean(videoFileUrl && videoFileUrl.startsWith('/api/demo-video'));

  // Helper to convert pointer clientX/clientY to 0..100 stage coordinates
  const getStagePercentCoords = useCallback((clientX: number, clientY: number) => {
    const el = innerStageRef.current || outerPlayerRef.current;
    const rect = el?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 };
    }
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
    };
  }, []);

  // Unified move & end handlers for window pointer/touch/mouse events so touch dragging never drops
  const handleGlobalDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (blurMoveRef.current) {
        const { index, startX, startY, origX, origY } = blurMoveRef.current;
        const { x, y } = getStagePercentCoords(clientX, clientY);
        const dx = x - startX;
        const dy = y - startY;
        const list = blurRegionsRef.current;
        const cur = list[index];
        if (cur) {
          const nextX = Math.max(0, Math.min(100 - cur.width, origX + dx));
          const nextY = Math.max(0, Math.min(100 - cur.height, origY + dy));
          const nextList = [...list];
          nextList[index] = {
            ...cur,
            x: Math.round(10 * nextX) / 10,
            y: Math.round(10 * nextY) / 10
          };
          onChangeBlurRegionsRef.current(nextList);
        }
      } else if (blurResizeRef.current) {
        const { index, startX, startY, origWidth, origHeight } = blurResizeRef.current;
        const { x, y } = getStagePercentCoords(clientX, clientY);
        const dx = x - startX;
        const dy = y - startY;
        const list = blurRegionsRef.current;
        const cur = list[index];
        if (cur) {
          const nextW = Math.max(10, Math.min(100 - cur.x, origWidth + dx));
          const nextH = Math.max(4, Math.min(100 - cur.y, origHeight + dy));
          const nextList = [...list];
          nextList[index] = {
            ...cur,
            width: Math.round(10 * nextW) / 10,
            height: Math.round(10 * nextH) / 10
          };
          onChangeBlurRegionsRef.current(nextList);
        }
      } else if (subMoveRef.current) {
        const { startX, startY, origX, origY } = subMoveRef.current;
        const { x, y } = getStagePercentCoords(clientX, clientY);
        const dx = x - startX;
        const dy = y - startY;
        const nextX = Math.round(Math.min(95, Math.max(5, origX + dx)) * 10) / 10;
        const nextY = Math.round(Math.min(96, Math.max(4, origY + dy)) * 10) / 10;
        onChangeSubtitleConfigRef.current({
          ...subtitleConfigRef.current,
          x: nextX,
          y: nextY
        });
      } else if (subScaleRef.current) {
        const dx = clientX - subScaleRef.current.startClientX;
        const nextFontSize = Math.max(
          12,
          Math.min(68, Math.round(subScaleRef.current.startSize + 0.25 * dx))
        );
        onChangeSubtitleConfigRef.current({
          ...subtitleConfigRef.current,
          fontSize: nextFontSize
        });
      }
    },
    [getStagePercentCoords]
  );

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (
        blurMoveRef.current ||
        blurResizeRef.current ||
        subMoveRef.current ||
        subScaleRef.current
      ) {
        handleGlobalDragMove(e.clientX, e.clientY);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (
        (blurMoveRef.current ||
          blurResizeRef.current ||
          subMoveRef.current ||
          subScaleRef.current) &&
        e.touches.length > 0
      ) {
        e.preventDefault();
        handleGlobalDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onEnd = () => {
      blurMoveRef.current = null;
      blurResizeRef.current = null;
      subMoveRef.current = null;
      subScaleRef.current = null;
      timelineScrubRef.current = false;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [handleGlobalDragMove]);

  // Native Fullscreen + Escape key listener
  useEffect(() => {
    const onFsChange = () => {
      if (document.fullscreenElement) {
        setIsFullscreen(true);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setIsRotatedLandscapeFs(false);
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => {
      const next = !prev;
      if (!next) {
        setIsRotatedLandscapeFs(false);
      }
      if (next) {
        if (outerPlayerRef.current && outerPlayerRef.current.requestFullscreen) {
          outerPlayerRef.current.requestFullscreen().catch(() => {});
        }
      } else if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return next;
    });
  }, []);

  // Automatically unmute AI voiceover and mute original foreign speech when a genuinely new Recap audio session arrives
  // (Never reset currentTime to 0 when companionBlobUrl upgrades from HTTP URL to in-memory blob: URL!)
  useEffect(() => {
    const sessionKey = `${hasMuxedAudio ? 'mux' : 'sep'}:${voiceoverAudioUrl || ''}:${audioBase64 ? audioBase64.slice(0, 32) : ''}`;
    if (!companionAudioSrc && !hasMuxedAudio) {
      lastAudioSessionKeyRef.current = '';
      return;
    }
    const isNewAudioSession = lastAudioSessionKeyRef.current !== sessionKey;
    lastAudioSessionKeyRef.current = sessionKey;

    setIsMuted(false);
    setIsPlaying(true);
    if (videoRef.current) {
      if (isNewAudioSession) {
        videoRef.current.currentTime = 0;
        setCurrentTime(0);
      }
      videoRef.current.muted = !hasMuxedAudio && Boolean(companionAudioSrc);
      videoRef.current.volume = hasMuxedAudio ? 1.0 : 0.0;
      videoRef.current.play().catch(() => {});
    }
  }, [companionAudioSrc, hasMuxedAudio, voiceoverAudioUrl, audioBase64]);

  // Sync synthesized voiceover audio element when audioBase64 or voiceoverAudioUrl updates (used when hasMuxedAudio is false)
  useEffect(() => {
    if (!companionAudioSrc || hasMuxedAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(companionAudioSrc);
    } else if (audioRef.current.src !== companionAudioSrc) {
      audioRef.current.src = companionAudioSrc;
    }
    audioRef.current.loop = false;
    audioRef.current.preload = 'auto';
    audioRef.current.volume = 1.0;
    audioRef.current.muted = isMuted;
    audioRef.current.playbackRate = 1.0;
    const targetTime = videoRef.current?.currentTime || currentTime || 0;
    const aDur = audioRef.current.duration;
    if (!Number.isFinite(aDur) || aDur <= 0 || targetTime < aDur - 0.25) {
      try {
        audioRef.current.currentTime = targetTime;
      } catch {}
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [companionAudioSrc, hasMuxedAudio, effects.pitchShift]);

  // Sync HTML5 video + companion voiceover play/pause and mute state
  useEffect(() => {
    const a = audioRef.current;
    if (a && companionAudioSrc && !hasMuxedAudio) {
      a.muted = isMuted;
      a.volume = 1.0;
      if (isPlaying) {
        a.play().catch(() => {});
      } else {
        a.pause();
      }
    }

    if (isProceduralDemo) return;
    const v = videoRef.current;
    if (!v) return;

    if (!hasMuxedAudio && companionAudioSrc) {
      // Mute original foreign speech on the video element while companion AI voiceover plays
      v.muted = true;
      v.volume = 0.0;
    } else {
      v.muted = isMuted;
      v.volume = 1.0;
    }

    if (isPlaying) {
      v.play().catch(() => {});
      if (bgVideoRef.current) {
        bgVideoRef.current.muted = true;
        bgVideoRef.current.play().catch(() => {});
      }
    } else {
      v.pause();
      if (bgVideoRef.current) {
        bgVideoRef.current.pause();
      }
    }
  }, [isProceduralDemo, isPlaying, isMuted, companionAudioSrc, hasMuxedAudio, effectiveStageVideoSrc]);

  // Procedural demo scene loop (when a demo preset is active)
  useEffect(() => {
    if (!isProceduralDemo) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      if (isPlaying && !timelineScrubRef.current) {
        setCurrentTime((prev) => {
          const next = prev + dt;
          if (next >= (videoDuration || 15)) {
            if (audioRef.current && companionAudioSrc && !hasMuxedAudio) {
              audioRef.current.currentTime = 0;
            }
            return 0;
          }
          return next;
        });
      }
      const canvas = demoCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawProceduralMovieFrame(ctx, canvas.width, canvas.height, currentTime, demoScene);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isProceduralDemo, isPlaying, currentTime, demoScene, videoDuration, companionAudioSrc, hasMuxedAudio]);

  // Direct seek to an exact second on video, backdrop video, and companion voiceover audio
  const seekToSecond = useCallback(
    (rawSec: number) => {
      const v = videoRef.current;
      const effectiveDur =
        v?.duration && Number.isFinite(v.duration) && v.duration > 0.5
          ? v.duration
          : videoDuration || 15;
      const targetSec = Math.max(0, Math.min(effectiveDur, rawSec));
      lastUserSeekAtRef.current = performance.now();
      setCurrentTime(targetSec);

      if (!isProceduralDemo && v) {
        try {
          if (typeof v.fastSeek === 'function' && timelineScrubRef.current) {
            v.fastSeek(targetSec);
          } else {
            v.currentTime = targetSec;
          }
        } catch {
          try {
            v.currentTime = targetSec;
          } catch {}
        }
      }
      if (!isProceduralDemo && bgVideoRef.current) {
        try {
          bgVideoRef.current.currentTime = targetSec;
        } catch {}
      }
      if (audioRef.current && companionAudioSrc && !hasMuxedAudio) {
        try {
          const aDur = audioRef.current.duration;
          if (!Number.isFinite(aDur) || aDur <= 0.5 || targetSec < aDur - 0.1) {
            audioRef.current.currentTime = targetSec;
          }
        } catch {}
      }
    },
    [isProceduralDemo, videoDuration, companionAudioSrc, hasMuxedAudio]
  );

  // Seek helper for timeline bar pointer/touch clientX
  const seekFromPointer = useCallback(
    (clientX: number) => {
      const bar = timelineRef.current;
      if (!bar) return;
      const rect = bar.getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const effectiveDur =
        videoRef.current?.duration &&
        Number.isFinite(videoRef.current.duration) &&
        videoRef.current.duration > 0.5
          ? videoRef.current.duration
          : videoDuration || 15;
      seekToSecond(ratio * effectiveDur);
    },
    [videoDuration, seekToSecond]
  );

  const seekFromPointerRef = useRef(seekFromPointer);
  seekFromPointerRef.current = seekFromPointer;

  useEffect(() => {
    const onScrubMove = (e: PointerEvent) => {
      if (timelineScrubRef.current) {
        seekFromPointerRef.current(e.clientX);
      }
    };
    const onScrubTouchMove = (e: TouchEvent) => {
      if (timelineScrubRef.current && e.touches.length > 0) {
        e.preventDefault();
        seekFromPointerRef.current(e.touches[0].clientX);
      }
    };
    window.addEventListener('pointermove', onScrubMove);
    window.addEventListener('touchmove', onScrubTouchMove, { passive: false });
    return () => {
      window.removeEventListener('pointermove', onScrubMove);
      window.removeEventListener('touchmove', onScrubTouchMove);
    };
  }, []);

  // Add new blur box (matches rd() in submit_form_only.js which also calls eL(true) to enable blur)
  const handleAddBlur = () => {
    playUiSound('tap');
    onEnableBlur?.();
    const offsetY = 20 + ((blurRegions.length * 14) % 36);
    const newRegion: BlurRegion = clampBlurRegion({
      id: `blur-${Date.now()}`,
      x: 15,
      y: offsetY,
      width: 70,
      height: 14,
      blurStrength: 24
    });
    const updated = [...blurRegions, newRegion];
    onChangeBlurRegions(updated);
    setSelectedBlurIdx(updated.length - 1);
    onToggleOverlayEditMode(true);
  };

  // Compute aspect ratio math
  const { aspectNum, aspectCss } = React.useMemo(() => {
    if (aspectRatio === '16:9') return { aspectNum: 16 / 9, aspectCss: '16 / 9' };
    if (aspectRatio === '1:1') return { aspectNum: 1, aspectCss: '1 / 1' };
    if (aspectRatio === '4:5') return { aspectNum: 4 / 5, aspectCss: '4 / 5' };
    if (aspectRatio === '9:16') return { aspectNum: 9 / 16, aspectCss: '9 / 16' };
    if (videoDimensions && videoDimensions.width > 0 && videoDimensions.height > 0) {
      return {
        aspectNum: videoDimensions.width / videoDimensions.height,
        aspectCss: `${videoDimensions.width} / ${videoDimensions.height}`
      };
    }
    return { aspectNum: 9 / 16, aspectCss: '9 / 16' };
  }, [aspectRatio, videoDimensions]);

  const hasAspectMismatch =
    aspectRatio !== 'original' &&
    (!videoDimensions ||
      Math.abs(aspectNum - videoDimensions.width / Math.max(1, videoDimensions.height)) > 0.03);
  const showBlurredBackdrop =
    !isProceduralDemo &&
    Boolean(videoFileUrl) &&
    activeEdit.fitMode === 'pad' &&
    hasAspectMismatch;

  const liveStageLayout = React.useMemo(() => {
    const srcW = videoDimensions?.width || 1280;
    const srcH = videoDimensions?.height || 720;
    return computeAspectCanvasLayout(srcW, srcH, aspectRatio, activeEdit);
  }, [videoDimensions, aspectRatio, activeEdit]);

  const fgFrameStyle = React.useMemo((): React.CSSProperties => {
    if (!showBlurredBackdrop || !liveStageLayout.needsAspectBlurPad) {
      return {
        position: 'relative',
        width: '100%',
        height: '100%'
      };
    }
    const leftPct = (liveStageLayout.fgX / liveStageLayout.outW) * 100;
    const topPct = (liveStageLayout.fgY / liveStageLayout.outH) * 100;
    const widthPct = (liveStageLayout.fgW / liveStageLayout.outW) * 100;
    const heightPct = (liveStageLayout.fgH / liveStageLayout.outH) * 100;
    return {
      position: 'absolute',
      left: `${leftPct}%`,
      top: `${topPct}%`,
      width: `${widthPct}%`,
      height: `${heightPct}%`,
      overflow: 'hidden'
    };
  }, [showBlurredBackdrop, liveStageLayout]);

  const frameZoomScale = Math.max(1, Math.min(1.3, (activeEdit.frameZoom || 100) / 100));
  const slightCropScale = effects.crop ? 1.055 : 1;
  const dynamicZoomScale = effects.zoom
    ? Number((1 + 0.075 * (0.5 + 0.5 * Math.sin((currentTime * Math.PI) / 2.2))).toFixed(4))
    : 1;
  const totalVideoScale = Number((frameZoomScale * slightCropScale * dynamicZoomScale).toFixed(4));
  const colorShiftFilter = effects.colorShift
    ? 'hue-rotate(18deg) saturate(1.25) contrast(1.06) brightness(1.02)'
    : undefined;

  const cropObjectPosition =
    activeEdit.focus === 'top'
      ? 'center top'
      : activeEdit.focus === 'bottom'
        ? 'center bottom'
        : 'center center';

  // Active subtitle cue at current playback time, or held cue during short breath pauses (never flash cues[0] mid-video!)
  const activeCue = findActiveCue(cues, currentTime * 1000);
  const displayCue = findDisplayCueAtTime(cues, currentTime * 1000, 1800);
  const activeSubLang = subtitleConfig.subtitleLanguage || targetLanguage;
  const langSample =
    TARGET_LANGUAGES.find((l) => l.code === activeSubLang)?.sampleCaption ||
    'ဒီနေရာမှာ စာတန်းထိုး ပေါ်မယ်';
  const displayedSubtitleText = isOverlayEditMode
    ? activeCue?.text || displayCue?.text || cues[0]?.text || langSample
    : cues.length > 0
      ? displayCue?.text || ''
      : langSample;

  const flipX = effects.mirror ? -1 : 1;

  // Exact player container aspect-ratio math from submit_form_only.js (tx & ri) so 16:9, 9:16, and 1:1 frames fit tightly with zero excess black bars
  const outerStageStyle: React.CSSProperties | undefined = isFullscreen
    ? undefined
    : {
        aspectRatio: aspectCss,
        height: aspectNum < 1 ? 'min(68vh, 600px)' : 'auto',
        width:
          aspectNum < 1
            ? `min(calc(min(68vh, 600px) * ${aspectNum}), 100%)`
            : `min(100%, calc(min(68vh, 600px) * ${aspectNum}))`,
        maxHeight: 'min(68vh, 600px)',
        maxWidth: '100%'
      };

  const innerStageStyle: React.CSSProperties = isFullscreen
    ? {
        aspectRatio: aspectCss,
        width: `min(100vw, calc(100vh * ${aspectNum}))`,
        height: `min(100vh, calc(100vw / ${aspectNum}))`,
        maxWidth: '100vw',
        maxHeight: '100vh'
      }
    : {
        aspectRatio: aspectCss,
        width: '100%',
        height: '100%',
        maxWidth: '100%',
        maxHeight: '100%'
      };

  return (
    <div className="flex w-full shrink-0 flex-col items-center justify-center py-1 touch-none select-none">
      {/* Outer Player Stage */}
      <div
        ref={outerPlayerRef}
        data-testid="outer-player-stage"
        style={outerStageStyle}
        className={`group/player relative flex items-center justify-center transition-all select-none ${
          isFullscreen
            ? 'fixed inset-0 z-[9999] m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden rounded-none border-0 bg-black shadow-none'
            : 'w-auto max-w-full overflow-hidden rounded-2xl border border-stone-300/90 bg-black shadow-2xl dark:border-slate-800'
        }`}
      >
        {/* Inner Stage Container */}
        <div
          ref={innerStageRef}
          style={innerStageStyle}
          className="relative flex items-center justify-center overflow-hidden bg-black"
        >
          {/* Crisp Native HD Video / Canvas Layer */}
          <div
            className="relative flex shrink-0 items-center justify-center overflow-hidden"
            style={
              isFullscreen && isRotatedLandscapeFs
                ? {
                    width: '100dvh',
                    height: '100dvw',
                    transform: `rotate(90deg) ${flipX === -1 ? 'scaleX(-1)' : ''}`
                  }
                : {
                    width: '100%',
                    height: '100%',
                    transform: flipX === -1 ? 'scaleX(-1)' : undefined
                  }
            }
          >
            {isProceduralDemo ? (
              <canvas
                ref={demoCanvasRef}
                width={720}
                height={1280}
                style={{
                  transform: totalVideoScale > 1.001 ? `scale(${totalVideoScale})` : undefined,
                  filter: colorShiftFilter
                }}
                className="relative z-10 h-full w-full object-contain transition-transform duration-150"
              />
            ) : (
              <>
                {showBlurredBackdrop && (
                  <video
                    ref={bgVideoRef}
                    data-testid="stage-blurred-backdrop-video"
                    src={effectiveStageVideoSrc}
                    aria-hidden="true"
                    tabIndex={-1}
                    disablePictureInPicture
                    playsInline
                    muted
                    loop
                    autoPlay
                    style={
                      effects.colorShift
                        ? { filter: 'blur(24px) brightness(0.68) saturate(1.25) hue-rotate(18deg)' }
                        : undefined
                    }
                    className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.68] saturate-110"
                  />
                )}
                <div style={fgFrameStyle} className="z-10 overflow-hidden">
                  <video
                    ref={videoRef}
                    data-testid="stage-video-element"
                    src={effectiveStageVideoSrc}
                    onTimeUpdate={(e) => {
                      if (
                        timelineScrubRef.current ||
                        performance.now() - lastUserSeekAtRef.current < 350
                      ) {
                        return;
                      }
                      const t = e.currentTarget.currentTime;
                      setCurrentTime(t);
                      if (
                        bgVideoRef.current &&
                        !bgVideoRef.current.seeking &&
                        Math.abs(bgVideoRef.current.currentTime - t) > 1.25
                      ) {
                        bgVideoRef.current.currentTime = t;
                      }
                      if (audioRef.current && companionAudioSrc && !hasMuxedAudio) {
                        const a = audioRef.current;
                        const aDur = a.duration;
                        const withinAudioRange =
                          !Number.isFinite(aDur) || aDur <= 0.5 || t < aDur - 0.25;
                        if (withinAudioRange) {
                          if (
                            shouldSyncCompanionAudioTime(
                              t,
                              a.currentTime,
                              aDur,
                              a.seeking,
                              0.85
                            )
                          ) {
                            a.currentTime = t;
                          }
                          if (isPlaying && a.paused && !e.currentTarget.paused) {
                            a.play().catch(() => {});
                          }
                        } else if (!a.paused) {
                          a.pause();
                        }
                      }
                    }}
                    onSeeked={(e) => {
                      const t = e.currentTarget.currentTime;
                      setCurrentTime(t);
                      if (bgVideoRef.current && !bgVideoRef.current.seeking) {
                        bgVideoRef.current.currentTime = t;
                      }
                      if (audioRef.current && companionAudioSrc && !hasMuxedAudio) {
                        const aDur = audioRef.current.duration;
                        if (!Number.isFinite(aDur) || aDur <= 0.5 || t < aDur - 0.2) {
                          audioRef.current.currentTime = t;
                          if (isPlaying && audioRef.current.paused) {
                            audioRef.current.play().catch(() => {});
                          }
                        }
                      }
                    }}
                    onWaiting={() => {
                      if (audioRef.current && companionAudioSrc && !hasMuxedAudio && !audioRef.current.paused) {
                        audioRef.current.pause();
                      }
                    }}
                    onPlaying={() => {
                      if (
                        audioRef.current &&
                        companionAudioSrc &&
                        !hasMuxedAudio &&
                        isPlaying &&
                        audioRef.current.paused
                      ) {
                        const t = videoRef.current?.currentTime || 0;
                        const aDur = audioRef.current.duration;
                        if (!Number.isFinite(aDur) || aDur <= 0.5 || t < aDur - 0.25) {
                          audioRef.current.currentTime = t;
                          audioRef.current.play().catch(() => {});
                        }
                      }
                    }}
                    onPlay={() => {
                      setIsPlaying(true);
                      if (bgVideoRef.current) {
                        bgVideoRef.current.muted = true;
                        bgVideoRef.current.play().catch(() => {});
                      }
                      if (audioRef.current && companionAudioSrc && !hasMuxedAudio) {
                        const t = videoRef.current?.currentTime || 0;
                        const aDur = audioRef.current.duration;
                        if (!Number.isFinite(aDur) || aDur <= 0.5 || t < aDur - 0.25) {
                          audioRef.current.play().catch(() => {});
                        }
                      }
                    }}
                    onPause={() => {
                      if (bgVideoRef.current) {
                        bgVideoRef.current.pause();
                      }
                      if (audioRef.current && companionAudioSrc && !hasMuxedAudio) {
                        audioRef.current.pause();
                      }
                    }}
                    onError={() => {
                      setVideoLoadError('Video stream could not be decoded.');
                    }}
                    onLoadedMetadata={(e) => {
                      setVideoLoadError(null);
                      const v = e.currentTarget;
                      if (v.videoWidth && v.videoHeight) {
                        setVideoDimensions({ width: v.videoWidth, height: v.videoHeight });
                      }
                      if (v.duration && Number.isFinite(v.duration)) {
                        onDurationLoaded(v.duration);
                      }
                      if (
                        preserveStageTimeOnSrcSwapRef.current !== null &&
                        preserveStageTimeOnSrcSwapRef.current > 0.25
                      ) {
                        const restoreT = preserveStageTimeOnSrcSwapRef.current;
                        preserveStageTimeOnSrcSwapRef.current = null;
                        try {
                          v.currentTime = restoreT;
                          setCurrentTime(restoreT);
                        } catch {}
                      }
                      if (bgVideoRef.current) {
                        bgVideoRef.current.currentTime = v.currentTime;
                      }
                      if (!hasMuxedAudio && companionAudioSrc) {
                        v.muted = true;
                        v.volume = 0.0;
                      } else {
                        v.muted = isMuted;
                        v.volume = 1.0;
                      }
                    }}
                    style={{
                      objectPosition:
                        activeEdit.fitMode === 'crop' && aspectRatio !== 'original'
                          ? cropObjectPosition
                          : 'center center',
                      transform: totalVideoScale > 1.001 ? `scale(${totalVideoScale})` : undefined,
                      filter: colorShiftFilter
                    }}
                    className={`h-full w-full ${
                      effects.zoom && isPlaying ? '' : 'transition-transform duration-150'
                    } ${
                      activeEdit.fitMode === 'crop' && aspectRatio !== 'original'
                        ? 'object-cover'
                        : showBlurredBackdrop || effects.crop || effects.zoom || frameZoomScale > 1.001
                          ? 'object-cover'
                          : 'object-contain'
                    }`}
                    playsInline
                    preload="auto"
                    muted={isMuted || (!hasMuxedAudio && Boolean(companionAudioSrc))}
                    loop
                    autoPlay
                  />
                  {videoLoadError && (
                    <div
                      data-testid="stage-video-error-overlay"
                      className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 px-6 text-center text-xs text-amber-300"
                    >
                      <span>{videoLoadError}</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Cinematic Film Grain Overlay when enabled */}
            {effects.grain && (
              <div
                data-testid="stage-film-grain"
                aria-hidden="true"
                style={{
                  backgroundImage:
                    'radial-gradient(rgba(255,255,255,0.16) 1px, transparent 0), radial-gradient(rgba(0,0,0,0.22) 1px, transparent 0)',
                  backgroundSize: '3px 3px, 4px 4px',
                  backgroundPosition: '0 0, 1.5px 1.5px'
                }}
                className="pointer-events-none absolute inset-0 z-15 opacity-35 mix-blend-overlay"
              />
            )}
          </div>

          {/* Full-Width Original Subtitle Cover Band Overlay */}
          {activeEdit.coverSubtitleBand.enabled && (
            <div
              data-testid="stage-cover-subtitle-band"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: `${Math.max(0, Math.min(60, activeEdit.coverSubtitleBand.bottomPct))}%`,
                height: `${Math.max(3, Math.min(50, activeEdit.coverSubtitleBand.heightPct))}%`,
                backdropFilter: `blur(${Math.max(2, Math.min(34, activeEdit.coverSubtitleBand.blurStrength * 0.85))}px)`,
                WebkitBackdropFilter: `blur(${Math.max(2, Math.min(34, activeEdit.coverSubtitleBand.blurStrength * 0.85))}px)`,
                backgroundColor: 'rgba(10, 10, 14, 0.22)',
                zIndex: 18
              }}
              className={`pointer-events-none transition-all ${
                isOverlayEditMode ? 'border-y border-dashed border-white/75' : ''
              }`}
            />
          )}

          {/* Circular Brand Logo Overlay */}
          {activeEdit.brandLogo.enabled && activeEdit.brandLogo.dataUrl && (
            <img
              data-testid="stage-brand-logo"
              src={activeEdit.brandLogo.dataUrl}
              alt="Channel Logo"
              style={{
                ...getGridPositionStyle(activeEdit.brandLogo.pos),
                width: `${Math.max(20, Math.min(86, Math.round(activeEdit.brandLogo.sizePx * 0.55)))}px`,
                height: `${Math.max(20, Math.min(86, Math.round(activeEdit.brandLogo.sizePx * 0.55)))}px`,
                opacity: Math.max(0.1, Math.min(1, activeEdit.brandLogo.opacity / 100))
              }}
              className="pointer-events-none rounded-full border border-white/25 object-cover shadow-lg select-none"
            />
          )}

          {/* Channel Watermark Text Overlay (Static 9-grid or Smooth Moving) */}
          {activeEdit.watermarkText.enabled && activeEdit.watermarkText.text.trim().length > 0 && (
            <div
              data-testid="stage-watermark-text"
              style={{
                ...(activeEdit.watermarkText.moving
                  ? {
                      position: 'absolute',
                      zIndex: 22,
                      left: `${8 + Math.abs(((currentTime * 0.11) % 2) - 1) * 66}%`,
                      top: `${10 + Math.abs((((currentTime + 2.3) * 0.08) % 2) - 1) * 62}%`
                    }
                  : getGridPositionStyle(activeEdit.watermarkText.pos)),
                fontSize: `${Math.max(9, Math.min(24, Math.round(activeEdit.watermarkText.sizePx * 0.55)))}px`,
                opacity: Math.max(0.1, Math.min(1, activeEdit.watermarkText.opacity / 100))
              }}
              className="pointer-events-none font-bold tracking-wide text-white whitespace-nowrap [text-shadow:0_1.5px_4px_rgba(0,0,0,0.85)] select-none"
            >
              {activeEdit.watermarkText.text}
            </div>
          )}

          {/* Top-Left Button: + Add blur (when editing) OR Remove video (✕) */}
          {isOverlayEditMode ? (
            <button
              type="button"
              data-testid="stage-add-blur-btn"
              onClick={handleAddBlur}
              className="absolute top-3.5 left-3.5 z-40 flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-400/40 bg-[#0D1117]/88 px-3.5 text-xs font-semibold tracking-wide text-amber-300 shadow-lg backdrop-blur-xl transition-all hover:bg-[#151C26] active:scale-95"
            >
              <Plus className="size-3.5 stroke-[2.5]" />
              <span>Add blur</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="stage-remove-video-btn"
              onClick={() => {
                if (isFullscreen) {
                  setIsFullscreen(false);
                  setIsRotatedLandscapeFs(false);
                }
                onRemoveVideo();
              }}
              title="Remove video"
              className="absolute top-3.5 left-3.5 z-40 flex size-9 cursor-pointer items-center justify-center rounded-xl border border-white/15 bg-[#0D1117]/85 text-white shadow-lg backdrop-blur-xl transition-all hover:bg-red-500/80 active:scale-95"
            >
              <X className="size-4 stroke-[2.2]" />
            </button>
          )}

          {/* Top-Right Controls: Rotate (when in Fullscreen) + Edit / Done */}
          <div className="absolute top-3.5 right-3.5 z-40 flex items-center gap-2">
            {isFullscreen && (
              <button
                type="button"
                data-testid="stage-rotate-fs-btn"
                onClick={() => setIsRotatedLandscapeFs((r) => !r)}
                title="Rotate Fullscreen 90°"
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-[#0D1117]/85 px-3.5 text-xs font-semibold text-white shadow-lg backdrop-blur-xl transition-all hover:bg-[#151C26] active:scale-95"
              >
                <RotateCw className="size-3.5 stroke-[2.2]" />
                <span>{isRotatedLandscapeFs ? 'Portrait' : 'Rotate'}</span>
              </button>
            )}

            {isOverlayEditMode ? (
              <button
                type="button"
                data-testid="stage-done-edit-btn"
                onClick={() => onToggleOverlayEditMode(false)}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-400/50 bg-amber-500 px-3.5 text-xs font-bold tracking-wide text-slate-950 shadow-lg transition-all hover:bg-amber-400 active:scale-95"
              >
                <Check className="size-3.5 stroke-[2.5]" />
                <span>Done</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="stage-edit-btn"
                onClick={() => onToggleOverlayEditMode(true)}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-[#0D1117]/85 px-3.5 text-xs font-semibold tracking-wide text-white shadow-lg backdrop-blur-xl transition-all hover:border-amber-400/40 hover:bg-[#151C26] active:scale-95"
              >
                <Pencil className="size-3.5 stroke-[2.2] text-amber-400" />
                <span>Edit</span>
              </button>
            )}
          </div>

          {/* Interactive Draggable & Resizable Blur Regions */}
          {blurEnabled &&
            blurRegions.map((region, idx) => (
              <div
                key={region.id}
                data-testid={`blur-region-${idx}`}
                style={{
                  position: 'absolute',
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                  zIndex: 20,
                  touchAction: 'none',
                  willChange: 'left, top, width, height'
                }}
                className={`rounded-md select-none cursor-grab active:cursor-grabbing ${
                  isOverlayEditMode
                    ? 'border-2 border-white/85 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                    : 'hover:border hover:border-white/50'
                }`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (!isOverlayEditMode) {
                    onToggleOverlayEditMode(true);
                  }
                  setSelectedBlurIdx(idx);
                  const { x, y } = getStagePercentCoords(e.clientX, e.clientY);
                  blurMoveRef.current = {
                    index: idx,
                    startX: x,
                    startY: y,
                    origX: region.x,
                    origY: region.y
                  };
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                }}
                onTouchStart={(e) => {
                  if (e.touches.length === 0) return;
                  e.stopPropagation();
                  if (!isOverlayEditMode) {
                    onToggleOverlayEditMode(true);
                  }
                  setSelectedBlurIdx(idx);
                  const { x, y } = getStagePercentCoords(
                    e.touches[0].clientX,
                    e.touches[0].clientY
                  );
                  blurMoveRef.current = {
                    index: idx,
                    startX: x,
                    startY: y,
                    origX: region.x,
                    origY: region.y
                  };
                }}
                onPointerMove={(e) => {
                  if (!blurMoveRef.current || blurMoveRef.current.index !== idx) return;
                  handleGlobalDragMove(e.clientX, e.clientY);
                }}
                onPointerUp={(e) => {
                  blurMoveRef.current = null;
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {}
                }}
              >
                <div
                  className="pointer-events-none absolute inset-0 rounded-md"
                  style={{
                    backdropFilter: `blur(${Math.max(12, Math.min(36, (region.blurStrength ?? 24) / 1.1))}px)`,
                    WebkitBackdropFilter: `blur(${Math.max(12, Math.min(36, (region.blurStrength ?? 24) / 1.1))}px)`,
                    backgroundColor:
                      blurStyle === 'frosted'
                        ? 'rgba(255, 255, 255, 0.12)'
                        : 'rgba(0, 0, 0, 0.28)'
                  }}
                />

                {isOverlayEditMode && (
                  <>
                    {selectedBlurIdx === idx && (
                      <div
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="pointer-events-auto absolute -top-10 left-1/2 z-40 flex h-8 -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-[#18181B]/90 px-3 text-[11px] whitespace-nowrap text-white shadow-[0_4px_16px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-xl select-none"
                      >
                        <span className="text-[10px] font-medium text-white/70">Blur</span>
                        <input
                          type="range"
                          min={10}
                          max={60}
                          step={2}
                          value={region.blurStrength ?? 22}
                          onChange={(ev) => {
                            const val = Number(ev.target.value);
                            const nextList = [...blurRegions];
                            nextList[idx] = { ...region, blurStrength: val };
                            onChangeBlurRegions(nextList);
                          }}
                          className="h-1 w-18 cursor-pointer appearance-none rounded-full bg-white/30 accent-white"
                        />
                        <span className="w-4 text-right font-mono text-[10px] text-white/90">
                          {region.blurStrength ?? 22}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextList = blurRegions.filter((_, i) => i !== idx);
                        onChangeBlurRegions(nextList);
                        setSelectedBlurIdx(nextList.length === 0 ? null : Math.max(0, idx - 1));
                      }}
                      title="Delete blur"
                      className="absolute -top-3.5 -right-3.5 z-30 flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/25 bg-[#18181B]/90 text-white shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-xl transition-transform hover:bg-black active:scale-90"
                    >
                      <X className="size-3.5 stroke-[2.5]" />
                    </button>

                    <div
                      data-testid={`blur-resize-handle-${idx}`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const { x, y } = getStagePercentCoords(e.clientX, e.clientY);
                        blurResizeRef.current = {
                          index: idx,
                          startX: x,
                          startY: y,
                          origWidth: region.width,
                          origHeight: region.height
                        };
                        try {
                          e.currentTarget.setPointerCapture(e.pointerId);
                        } catch {}
                      }}
                      onTouchStart={(e) => {
                        if (e.touches.length === 0) return;
                        e.stopPropagation();
                        const { x, y } = getStagePercentCoords(
                          e.touches[0].clientX,
                          e.touches[0].clientY
                        );
                        blurResizeRef.current = {
                          index: idx,
                          startX: x,
                          startY: y,
                          origWidth: region.width,
                          origHeight: region.height
                        };
                      }}
                      onPointerMove={(e) => {
                        if (!blurResizeRef.current || blurResizeRef.current.index !== idx) return;
                        handleGlobalDragMove(e.clientX, e.clientY);
                      }}
                      onPointerUp={(e) => {
                        blurResizeRef.current = null;
                        try {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        } catch {}
                      }}
                      className="absolute -right-2 -bottom-2 z-30 size-4.5 cursor-se-resize touch-none rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] ring-2 ring-black/40 transition-transform active:scale-125"
                    />
                  </>
                )}
              </div>
            ))}

          {/* Interactive Draggable & Resizable Subtitle Box */}
          {subtitleConfig.enabled && (isOverlayEditMode || displayedSubtitleText.trim().length > 0) && (
            <div
              data-testid="subtitle-overlay-box"
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (!isOverlayEditMode) {
                  onToggleOverlayEditMode(true);
                }
                const { x, y } = getStagePercentCoords(e.clientX, e.clientY);
                subMoveRef.current = {
                  startX: x,
                  startY: y,
                  origX: subtitleConfig.x,
                  origY: subtitleConfig.y
                };
                try {
                  e.currentTarget.setPointerCapture(e.pointerId);
                } catch {}
              }}
              onTouchStart={(e) => {
                if (e.touches.length === 0) return;
                e.stopPropagation();
                if (!isOverlayEditMode) {
                  onToggleOverlayEditMode(true);
                }
                const { x, y } = getStagePercentCoords(
                  e.touches[0].clientX,
                  e.touches[0].clientY
                );
                subMoveRef.current = {
                  startX: x,
                  startY: y,
                  origX: subtitleConfig.x,
                  origY: subtitleConfig.y
                };
              }}
              onPointerMove={(e) => {
                if (!subMoveRef.current) return;
                handleGlobalDragMove(e.clientX, e.clientY);
              }}
              onPointerUp={(e) => {
                subMoveRef.current = null;
                try {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                } catch {}
              }}
              style={{
                position: 'absolute',
                left: `${subtitleConfig.x}%`,
                top: `${Math.min(subtitleConfig.y, 82)}%`,
                transform: 'translate(-50%, -50%)',
                width: 'max-content',
                maxWidth: '96%',
                zIndex: 25,
                touchAction: 'none',
                willChange: 'left, top'
              }}
              className={`flex w-max max-w-[96%] flex-col items-center justify-center text-center select-none cursor-grab active:cursor-grabbing ${
                isOverlayEditMode
                  ? 'relative rounded-xl border-2 border-white/85 bg-black/30 px-2 py-0.5 shadow-[0_6px_20px_rgba(0,0,0,0.35)]'
                  : 'hover:rounded-xl hover:border hover:border-white/40 px-0.5 py-0.5'
              }`}
            >
              <span
                style={{
                  fontFamily: resolveSubtitleFontMeta(
                    subtitleConfig.fontStyle,
                    subtitleConfig.subtitleLanguage,
                    displayedSubtitleText
                  ).cssFontFamily,
                  fontWeight: resolveSubtitleFontMeta(
                    subtitleConfig.fontStyle,
                    subtitleConfig.subtitleLanguage,
                    displayedSubtitleText
                  ).fontWeight,
                  letterSpacing: resolveSubtitleFontMeta(
                    subtitleConfig.fontStyle,
                    subtitleConfig.subtitleLanguage,
                    displayedSubtitleText
                  ).letterSpacing,
                  fontSize: `${Math.max(7, Math.min(24, Math.round(0.32 * subtitleConfig.fontSize)))}px`,
                  lineHeight: 1.35,
                  color:
                    activeEdit.captionTextColor ||
                    (subtitleConfig.style === 'box_black' ? '#FDE047' : '#FFFFFF'),
                  ...(subtitleConfig.style !== 'box_black'
                    ? {
                        textShadow:
                          activeEdit.captionOutlineWidth <= 0
                            ? '0 2px 6px rgba(0,0,0,0.6)'
                            : `0 2px 4px #000, -${Math.max(1, activeEdit.captionOutlineWidth * 0.55)}px -${Math.max(1, activeEdit.captionOutlineWidth * 0.55)}px 0 #000, ${Math.max(1, activeEdit.captionOutlineWidth * 0.55)}px -${Math.max(1, activeEdit.captionOutlineWidth * 0.55)}px 0 #000, -${Math.max(1, activeEdit.captionOutlineWidth * 0.55)}px ${Math.max(1, activeEdit.captionOutlineWidth * 0.55)}px 0 #000, ${Math.max(1, activeEdit.captionOutlineWidth * 0.55)}px ${Math.max(1, activeEdit.captionOutlineWidth * 0.55)}px 0 #000`
                      }
                    : {})
                }}
                className={`font-bold select-none whitespace-nowrap ${
                  subtitleConfig.style === 'box_black'
                    ? 'rounded-lg bg-black/85 px-3 py-1 shadow-md'
                    : 'px-2 py-0.5'
                }`}
              >
                {displayedSubtitleText}
              </span>

              {isOverlayEditMode && (
                <div
                  data-testid="subtitle-scale-handle"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    subScaleRef.current = {
                      startClientX: e.clientX,
                      startSize: subtitleConfig.fontSize
                    };
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {}
                  }}
                  onTouchStart={(e) => {
                    if (e.touches.length === 0) return;
                    e.stopPropagation();
                    subScaleRef.current = {
                      startClientX: e.touches[0].clientX,
                      startSize: subtitleConfig.fontSize
                    };
                  }}
                  onPointerMove={(e) => {
                    if (!subScaleRef.current) return;
                    handleGlobalDragMove(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    subScaleRef.current = null;
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {}
                  }}
                  className="absolute -right-2 -bottom-2 z-30 size-5 cursor-se-resize touch-none rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.5)] ring-2 ring-black/40 transition-transform active:scale-125"
                />
              )}
            </div>
          )}

          {/* Bottom Floating Timeline Bar (z-40 so it is always clickable) */}
          {!isOverlayEditMode && (
            <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-40 flex h-11 items-center gap-2 rounded-2xl border border-white/15 bg-[#0D1117]/90 px-3.5 text-xs text-white shadow-xl backdrop-blur-xl transition-opacity duration-200 select-none">
              <button
                type="button"
                data-testid="stage-play-pause-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                }}
                className="flex size-7.5 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-transform hover:bg-white/10 active:scale-90"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="size-4 stroke-[2.5] text-amber-400" />
                ) : (
                  <Play className="size-4 stroke-[2.5] fill-amber-400 text-amber-400" />
                )}
              </button>

              {/* Pointer-Captured & Native Range Scrubber Timeline */}
              <div
                ref={timelineRef}
                data-testid="stage-timeline-scrubber"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  timelineScrubRef.current = true;
                  seekFromPointer(e.clientX);
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                  } catch {}
                }}
                onPointerMove={(e) => {
                  if (timelineScrubRef.current) {
                    e.stopPropagation();
                    seekFromPointer(e.clientX);
                  }
                }}
                onPointerUp={(e) => {
                  timelineScrubRef.current = false;
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {}
                }}
                onTouchStart={(e) => {
                  if (e.touches.length > 0) {
                    e.stopPropagation();
                    timelineScrubRef.current = true;
                    seekFromPointer(e.touches[0].clientX);
                  }
                }}
                onTouchMove={(e) => {
                  if (timelineScrubRef.current && e.touches.length > 0) {
                    e.stopPropagation();
                    seekFromPointer(e.touches[0].clientX);
                  }
                }}
                onTouchEnd={() => {
                  timelineScrubRef.current = false;
                }}
                className="group/timeline relative mx-1 flex h-7 flex-1 cursor-pointer touch-none items-center select-none"
              >
                <input
                  type="range"
                  aria-label="Seek video timeline"
                  min={0}
                  max={Math.max(1, videoDuration || 15)}
                  step={0.1}
                  value={Math.min(Math.max(0, currentTime), Math.max(1, videoDuration || 15))}
                  onChange={(e) => {
                    e.stopPropagation();
                    seekToSecond(Number(e.target.value));
                  }}
                  className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
                />
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20 transition-all group-hover/timeline:h-2">
                  <div
                    className="pointer-events-none h-full rounded-full bg-amber-400"
                    style={{
                      width: `${videoDuration > 0 ? Math.min(100, (currentTime / videoDuration) * 100) : 0}%`
                    }}
                  />
                </div>
                <div
                  className="pointer-events-none absolute size-3.5 -translate-x-1/2 rounded-full bg-amber-400 shadow-md ring-2 ring-slate-950/60 transition-opacity"
                  style={{
                    left: `${videoDuration > 0 ? Math.min(100, (currentTime / videoDuration) * 100) : 0}%`
                  }}
                />
              </div>

              <div className="shrink-0 font-mono text-[11px] font-medium text-white/90 tabular-nums">
                {formatDuration(currentTime)} / {formatDuration(videoDuration)}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  data-testid="stage-mute-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="flex size-7.5 cursor-pointer items-center justify-center rounded-lg transition-transform hover:bg-white/10 active:scale-90"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </button>

                <button
                  type="button"
                  data-testid="stage-fullscreen-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFullscreen();
                  }}
                  className="flex size-7.5 cursor-pointer items-center justify-center rounded-lg transition-transform hover:bg-white/10 active:scale-90"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="size-4 stroke-[2.5]" />
                  ) : (
                    <Maximize2 className="size-4 stroke-[2.5]" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rendering Progress Backdrop Overlay */}
        {isRendering && (
          <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl bg-[#090C10]/65 backdrop-blur-xl transition-all duration-300 select-none">
            <span className="text-3xl font-bold tracking-tight text-amber-400 tabular-nums drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)]">
              {renderProgress}%
            </span>
            <span className="mt-1.5 text-xs font-medium tracking-normal text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.6)]">
              {renderMessage || 'Rendering on device…'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
