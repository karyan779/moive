/**
 * TTAK MOVIE RECAP — Interactive UI Sound Synthesizer (kobra-ui WebAudio Engine)
 * Extracted from streamwaveai.com's 0f99cc62e9e80edf.js (Module 296689).
 * Synthesizes crisp tactile sounds (tap, select, toggleOn, toggleOff, open, close,
 * sliderTick, success, error, blocked) using Web Audio API with zero external audio assets.
 */

export type UiSoundName =
  | 'tap'
  | 'select'
  | 'toggleOn'
  | 'toggleOff'
  | 'open'
  | 'close'
  | 'tick'
  | 'sliderTick'
  | 'success'
  | 'error'
  | 'blocked'
  | 'swoosh';

const SOUND_MUTED_KEY = 'ttak-sound-muted';
const SOUND_VOLUME_KEY = 'ttak-sound-volume';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx({ latencyHint: 'interactive' });
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function isUiSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SOUND_MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setUiSoundMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_MUTED_KEY, muted ? '1' : '0');
    window.dispatchEvent(new Event('ttak-sound-change'));
  } catch {
    // ignore storage errors
  }
}

export function getUiSoundVolume(): number {
  if (typeof window === 'undefined') return 0.65;
  try {
    const val = Number(window.localStorage.getItem(SOUND_VOLUME_KEY));
    return Number.isFinite(val) && val > 0 && val <= 1 ? val : 0.65;
  } catch {
    return 0.65;
  }
}

export function setUiSoundVolume(vol: number): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = Math.max(0.05, Math.min(1, vol));
    window.localStorage.setItem(SOUND_VOLUME_KEY, String(clamped));
    window.dispatchEvent(new Event('ttak-sound-change'));
  } catch {
    // ignore
  }
}

interface OscLayerSpec {
  type: OscillatorType;
  freqStart: number;
  freqEnd?: number;
  attack?: number;
  decay: number;
  release?: number;
  gain: number;
  delay?: number;
  fmRatio?: number;
  fmDepth?: number;
  lowpassFreq?: number;
}

function playOscLayer(
  ctx: AudioContext,
  spec: OscLayerSpec,
  masterVolume: number,
  detuneCents = 0
) {
  const now = ctx.currentTime + (spec.delay || 0);
  const attack = spec.attack ?? 0;
  const decay = spec.decay;
  const release = spec.release ?? 0.005;
  const totalDur = attack + decay + release;
  const peakGain = Math.max(0.0001, spec.gain * masterVolume);

  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, now);
  if (attack > 0) {
    env.gain.linearRampToValueAtTime(peakGain, now + attack);
  } else {
    env.gain.setValueAtTime(peakGain, now);
  }
  env.gain.setTargetAtTime(0.0001, now + attack, Math.max(0.003, decay / 3));

  const osc = ctx.createOscillator();
  osc.type = spec.type;
  osc.frequency.setValueAtTime(spec.freqStart, now);
  if (spec.freqEnd && spec.freqEnd !== spec.freqStart) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, spec.freqEnd),
      now + totalDur
    );
  }
  if (detuneCents !== 0) {
    osc.detune.setValueAtTime(detuneCents, now);
  }

  let fmOsc: OscillatorNode | null = null;
  if (spec.fmRatio && spec.fmDepth) {
    fmOsc = ctx.createOscillator();
    fmOsc.type = 'sine';
    fmOsc.frequency.setValueAtTime(spec.freqStart * spec.fmRatio, now);
    const fmGain = ctx.createGain();
    fmGain.gain.setValueAtTime(spec.fmDepth, now);
    fmOsc.connect(fmGain);
    fmGain.connect(osc.frequency);
    fmOsc.start(now);
    fmOsc.stop(now + totalDur + 0.05);
  }

  if (spec.lowpassFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(spec.lowpassFreq, now);
    osc.connect(filter);
    filter.connect(env);
  } else {
    osc.connect(env);
  }

  env.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + totalDur + 0.05);

  osc.onended = () => {
    try {
      osc.disconnect();
      env.disconnect();
      if (fmOsc) fmOsc.disconnect();
    } catch {
      // ignore
    }
  };
}

/**
 * Plays a synthesized kobra-ui sound effect immediately
 */
export function playUiSound(
  sound: UiSoundName,
  options?: { detune?: number; velocity?: number }
): void {
  if (isUiSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const baseVolume = getUiSoundVolume() * (options?.velocity ?? 1);
  const randomJitter = (Math.random() * 2 - 1) * 14;
  const detune = (options?.detune ?? 0) + randomJitter;

  switch (sound) {
    case 'tap':
      playOscLayer(
        ctx,
        {
          type: 'sine',
          freqStart: 1300,
          fmRatio: 0.5,
          fmDepth: 100,
          attack: 0,
          decay: 0.015,
          release: 0.005,
          gain: 0.24
        },
        baseVolume,
        detune
      );
      break;

    case 'select':
      playOscLayer(
        ctx,
        {
          type: 'triangle',
          freqStart: 900,
          freqEnd: 780,
          attack: 0.001,
          decay: 0.055,
          gain: 0.28
        },
        baseVolume,
        detune
      );
      break;

    case 'toggleOn':
      playOscLayer(
        ctx,
        {
          type: 'sine',
          freqStart: 520,
          freqEnd: 880,
          attack: 0.002,
          decay: 0.085,
          gain: 0.3
        },
        baseVolume,
        detune
      );
      break;

    case 'toggleOff':
      playOscLayer(
        ctx,
        {
          type: 'sine',
          freqStart: 780,
          freqEnd: 420,
          attack: 0.002,
          decay: 0.085,
          gain: 0.28
        },
        baseVolume,
        detune
      );
      break;

    case 'open':
      playOscLayer(
        ctx,
        {
          type: 'triangle',
          freqStart: 320,
          freqEnd: 620,
          lowpassFreq: 2600,
          attack: 0.006,
          decay: 0.13,
          gain: 0.25
        },
        baseVolume,
        detune
      );
      break;

    case 'close':
      playOscLayer(
        ctx,
        {
          type: 'triangle',
          freqStart: 560,
          freqEnd: 300,
          lowpassFreq: 2200,
          attack: 0.004,
          decay: 0.11,
          gain: 0.22
        },
        baseVolume,
        detune
      );
      break;

    case 'tick':
    case 'sliderTick':
      playOscLayer(
        ctx,
        {
          type: 'sine',
          freqStart: 760,
          attack: 0,
          decay: 0.012,
          release: 0.004,
          gain: 0.14
        },
        baseVolume,
        detune
      );
      break;

    case 'success':
      playOscLayer(
        ctx,
        {
          type: 'triangle',
          freqStart: 784,
          attack: 0.004,
          decay: 0.16,
          gain: 0.24
        },
        baseVolume,
        0
      );
      playOscLayer(
        ctx,
        {
          type: 'triangle',
          freqStart: 1175,
          attack: 0.004,
          decay: 0.22,
          delay: 0.075,
          gain: 0.2
        },
        baseVolume,
        0
      );
      break;

    case 'error':
      playOscLayer(
        ctx,
        {
          type: 'triangle',
          freqStart: 300,
          lowpassFreq: 1200,
          attack: 0.003,
          decay: 0.13,
          gain: 0.26
        },
        baseVolume,
        0
      );
      playOscLayer(
        ctx,
        {
          type: 'triangle',
          freqStart: 224,
          lowpassFreq: 1000,
          attack: 0.003,
          decay: 0.2,
          delay: 0.09,
          gain: 0.24
        },
        baseVolume,
        0
      );
      break;

    case 'blocked':
      playOscLayer(
        ctx,
        {
          type: 'sine',
          freqStart: 180,
          lowpassFreq: 700,
          attack: 0.004,
          decay: 0.06,
          gain: 0.22
        },
        baseVolume,
        0
      );
      break;

    case 'swoosh':
      playOscLayer(
        ctx,
        {
          type: 'sine',
          freqStart: 300,
          freqEnd: 1800,
          attack: 0.008,
          decay: 0.12,
          release: 0.04,
          gain: 0.14
        },
        baseVolume,
        0
      );
      break;
  }
}

/**
 * Global DOM interaction sound listener matching 0f99cc62e9e80edf.js
 */
export function attachGlobalUiSoundListeners(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  let lastSliderTickTime = 0;

  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || !(e.target instanceof Element)) return;
    const target = e.target;

    // Ignore text inputs / textareas
    if (
      target.closest(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable]'
      )
    ) {
      return;
    }

    // Range sliders
    if (target.closest('input[type="range"], [role="slider"]')) {
      playUiSound('tick');
      return;
    }

    // Select dropdowns
    if (target.closest('select')) {
      playUiSound('select');
      return;
    }

    // Switches / checkboxes
    const switchEl = target.closest(
      '[role="switch"], input[type="checkbox"], input[type="radio"]'
    );
    if (switchEl) {
      if (switchEl.matches(':disabled, [aria-disabled="true"]')) {
        playUiSound('blocked');
        return;
      }
      const isChecked =
        switchEl instanceof HTMLInputElement
          ? switchEl.checked
          : switchEl.getAttribute('aria-checked') === 'true';
      playUiSound(isChecked ? 'toggleOff' : 'toggleOn');
      return;
    }

    // Buttons, links, role="button", clickable cards
    const interactive = target.closest(
      'button, a[href], [role="button"], [role="option"], [role="menuitem"], [data-sound]'
    );
    if (interactive) {
      if (interactive.matches(':disabled, [aria-disabled="true"]')) {
        playUiSound('blocked');
        return;
      }
      const customSound = interactive.getAttribute('data-sound') as UiSoundName | null;
      if (customSound) {
        playUiSound(customSound);
        return;
      }
      playUiSound('tap');
    }
  };

  const handleInput = (e: Event) => {
    if (!(e.target instanceof HTMLInputElement)) return;
    if (e.target.type === 'range') {
      const now = performance.now();
      if (now - lastSliderTickTime > 32) {
        lastSliderTickTime = now;
        const min = Number(e.target.min || 0);
        const max = Number(e.target.max || 100);
        const val = Number(e.target.value || 50);
        const ratio = max > min ? (val - min) / (max - min) : 0.5;
        playUiSound('sliderTick', { detune: Math.round((ratio - 0.5) * 600) });
      }
    }
  };

  const handleChange = (e: Event) => {
    if (e.target instanceof HTMLSelectElement) {
      playUiSound('select');
    }
  };

  document.addEventListener('pointerdown', handlePointerDown, true);
  document.addEventListener('input', handleInput, true);
  document.addEventListener('change', handleChange, true);

  return () => {
    document.removeEventListener('pointerdown', handlePointerDown, true);
    document.removeEventListener('input', handleInput, true);
    document.removeEventListener('change', handleChange, true);
  };
}
