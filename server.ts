import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { execFile, execFileSync } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Modality } from '@google/genai';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  SCRIPT_STYLE_PROMPTS,
  VOICE_OPTIONS,
  SAVETIK_WEDDING_DRAMA_CUES,
  buildSyncedRecapCues,
  splitCuesIntoShortPhrases,
  getVoicePreviewSampleText,
  alignCuesWithAudioSync,
  computeAspectCanvasLayout,
  DEFAULT_DEEPRECAP_EDIT_CONFIG,
  hexToAssBgr,
  resolveBrandGridCoords,
  computeAssSubtitleFontSize,
  buildAssRoundedBoxPath,
  resolveBurmeseFontMeta,
  resolveSubtitleFontMeta,
  maskApiKeyString,
  parseBulkApiKeysInput,
  isApiKeyQuotaOrLimitError,
  selectNextHealthyPoolKey,
  recordPoolKeyOutcome,
  formatCooldownRemaining,
  getPoolDateKey,
  WORKERS_AI_WHISPER_MODEL,
  buildWorkersAiRunUrl,
  parseWorkersAiWhisperResult,
  parseWorkersAiWhisperTimedResult,
  formatTimedSttSegments,
  normalizeRecapTimelineCues,
  buildChronologicalSceneLockGuide,
  computeAudioScriptWindows,
  sliceTimedTranscriptForWindow,
  normalizeDialogueSubtitleCues,
  parseTimedSttTranscriptToCues,
  buildCinematicTranslateSystemPrompt,
  groupCuesIntoTimedBlocks,
  resolveSttStrategyForMode,
  resolveMediaContentDisposition,
  shouldFailInsteadOfWeddingFallback,
  detectGeminiFailureMessage,
  isTransientModelOverloadError,
  resolveFallbackScriptModels,
  shouldSkipWorkersAiForPayloadSize,
  sanitizeMp4DownloadName,
  resolveEffectiveVideoDurationSec,
  extractCustomDomainHostname,
  resolveCustomAuthDomainInfo,
  isGoogleRedirectUriAuthorizedHtml,
  type AdminApiKeyRecord,
  type AntiCopyrightEffects,
  type ApiProviderType,
  type AspectCanvasLayout,
  type AspectRatioMode,
  type DeepRecapEditConfig,
  type ScriptStyleId,
  type TargetLanguageCode,
  type VoiceGender,
  type SubtitleCue,
  type BlurRegion,
  type SubtitleOverlayConfig,
  type ScriptAiModelId,
  type TtsEngineId,
  type SttEngineId
} from './src/utils/recapEngine.ts';
import {
  R2_MULTIPART_THRESHOLD_BYTES,
  R2_DEFAULT_PART_SIZE_BYTES,
  R2_MAX_UPLOAD_BYTES,
  isValidR2Config,
  maskR2Secret,
  buildR2Endpoint,
  buildR2ObjectKey,
  computeMultipartPlan,
  buildPublicR2ObjectUrl,
  createUploadUlid,
  getMediaContentType,
  stripSrtTimestampsToText,
  type R2KeyPrefix,
  type R2StoredConfig
} from './src/utils/r2Direct.ts';

const require = createRequire(import.meta.url);
const WebSocketClient = require('ws');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOBS_TEMP_DIR = '/tmp/sw_recap_jobs';
if (!fs.existsSync(JOBS_TEMP_DIR)) {
  fs.mkdirSync(JOBS_TEMP_DIR, { recursive: true });
}
const FONTS_DIR = path.join(__dirname, 'public', 'fonts');
const R2_CONFIG_FILE = path.join(JOBS_TEMP_DIR, 'admin_r2_config.json');

function loadR2Config(): R2StoredConfig | null {
  try {
    if (fs.existsSync(R2_CONFIG_FILE)) {
      const raw = JSON.parse(fs.readFileSync(R2_CONFIG_FILE, 'utf-8')) as Partial<R2StoredConfig>;
      if (isValidR2Config(raw)) {
        return {
          accountId: raw.accountId.trim(),
          accessKeyId: raw.accessKeyId.trim(),
          secretAccessKey: raw.secretAccessKey.trim(),
          bucketName: raw.bucketName.trim(),
          publicUrl: raw.publicUrl?.trim() || '',
          updatedAt: raw.updatedAt || Date.now()
        };
      }
    }
  } catch {}

  const envCfg: Partial<R2StoredConfig> = {
    accountId: process.env.R2_ACCOUNT_ID?.trim() || '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID?.trim() || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY?.trim() || '',
    bucketName: process.env.R2_BUCKET_NAME?.trim() || '',
    publicUrl: process.env.R2_PUBLIC_URL?.trim() || ''
  };
  return isValidR2Config(envCfg) ? envCfg : null;
}

function saveR2Config(cfg: R2StoredConfig) {
  fs.writeFileSync(
    R2_CONFIG_FILE,
    JSON.stringify({ ...cfg, updatedAt: Date.now() }, null, 2),
    'utf-8'
  );
}

function clearSavedR2Config() {
  try {
    if (fs.existsSync(R2_CONFIG_FILE)) {
      fs.unlinkSync(R2_CONFIG_FILE);
    }
  } catch {}
}

function createR2S3Client(cfg: R2StoredConfig): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: buildR2Endpoint(cfg.accountId),
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey
    }
  });
}

async function downloadR2ObjectToFile(
  cfg: R2StoredConfig,
  objectKey: string,
  destPath: string
): Promise<boolean> {
  const client = createR2S3Client(cfg);
  const res = await client.send(
    new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: objectKey
    })
  );
  if (!res.Body) return false;
  const writeStream = fs.createWriteStream(destPath);
  const bodyStream =
    typeof (res.Body as any).pipe === 'function'
      ? (res.Body as NodeJS.ReadableStream)
      : Readable.fromWeb(res.Body as any);
  await pipeline(bodyStream, writeStream);
  return fs.existsSync(destPath) && fs.statSync(destPath).size > 0;
}

const r2UploadedExportKeyCache = new Map<string, { objectKey: string; sizeBytes: number; mtimeMs: number }>();

async function uploadLocalFileToR2(
  cfg: R2StoredConfig,
  localPath: string,
  objectKey: string,
  contentType: string,
  downloadFilename?: string
): Promise<{ objectKey: string; publicUrl?: string; signedGetUrl: string }> {
  const client = createR2S3Client(cfg);
  const fileStream = fs.createReadStream(localPath);
  await client.send(
    new PutObjectCommand({
      Bucket: cfg.bucketName,
      Key: objectKey,
      Body: fileStream,
      ContentType: contentType
    })
  );
  const signedGetUrl = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: objectKey,
      ResponseContentType: contentType,
      ...(downloadFilename
        ? { ResponseContentDisposition: `attachment; filename="${downloadFilename}"` }
        : {})
    }),
    { expiresIn: 3600 * 12 }
  );
  return {
    objectKey,
    publicUrl: buildPublicR2ObjectUrl(cfg.publicUrl, objectKey),
    signedGetUrl
  };
}

async function signExistingR2DownloadUrl(
  cfg: R2StoredConfig,
  objectKey: string,
  downloadFilename: string,
  contentType = 'video/mp4'
): Promise<string> {
  const client = createR2S3Client(cfg);
  return await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: cfg.bucketName,
      Key: objectKey,
      ResponseContentType: contentType,
      ResponseContentDisposition: `attachment; filename="${downloadFilename}"`
    }),
    { expiresIn: 3600 * 12 }
  );
}

async function configureR2BucketCors(cfg: R2StoredConfig): Promise<void> {
  const client = createR2S3Client(cfg);
  await client.send(new HeadBucketCommand({ Bucket: cfg.bucketName }));
  await client.send(
    new PutBucketCorsCommand({
      Bucket: cfg.bucketName,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
            MaxAgeSeconds: 86400
          }
        ]
      }
    })
  );
}

const execFilePromise = promisify(execFile);

async function execFileAsync(
  file: string,
  args: string[],
  options: { timeout?: number; maxBuffer?: number } = {}
): Promise<{ stdout: string; stderr: string }> {
  const res = await execFilePromise(file, args, {
    timeout: options.timeout ?? 900_000,
    maxBuffer: options.maxBuffer ?? 32 * 1024 * 1024,
    encoding: 'utf8'
  });
  return {
    stdout: typeof res.stdout === 'string' ? res.stdout : String(res.stdout ?? ''),
    stderr: typeof res.stderr === 'string' ? res.stderr : String(res.stderr ?? '')
  };
}

const EDGE_TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_SEC_MS_GEC_VERSION = '2-143.0.3650.75';
let cachedEdgeGec: { token: string; muid: string; expiresAt: number } | null = null;

function getEdgeDrmTokens(): { token: string; muid: string } {
  const now = Date.now();
  if (cachedEdgeGec && cachedEdgeGec.expiresAt > now) {
    return { token: cachedEdgeGec.token, muid: cachedEdgeGec.muid };
  }
  const drmScript = path.join(__dirname, 'src', 'utils', 'edge_drm.py');
  const token = execFileSync('python3', [drmScript], {
    cwd: path.join(__dirname, 'src', 'utils')
  })
    .toString()
    .trim();
  const muid = crypto.randomBytes(16).toString('hex').toUpperCase();
  cachedEdgeGec = {
    token,
    muid,
    expiresAt: now + 240_000 // Cache for 4 minutes (Edge 5-minute window)
  };
  return { token, muid };
}

function getEdgeNeuralVoiceName(targetLanguage: TargetLanguageCode, voiceGender: VoiceGender): string {
  const isFemale =
    voiceGender === 'female' ||
    voiceGender === 'aoede' ||
    voiceGender === 'leda' ||
    voiceGender === 'zephyr';

  if (targetLanguage === 'my') {
    return isFemale ? 'my-MM-NilarNeural' : 'my-MM-ThihaNeural';
  }
  if (targetLanguage === 'th') {
    return isFemale ? 'th-TH-PremwadeeNeural' : 'th-TH-NiwatNeural';
  }
  if (targetLanguage === 'ja') {
    return isFemale ? 'ja-JP-NanamiNeural' : 'ja-JP-KeitaNeural';
  }
  if (targetLanguage === 'ko') {
    return isFemale ? 'ko-KR-SunHiNeural' : 'ko-KR-InJoonNeural';
  }
  if (targetLanguage === 'zh') {
    return isFemale ? 'zh-CN-XiaoxiaoNeural' : 'zh-CN-YunxiNeural';
  }
  return isFemale ? 'en-US-AriaNeural' : 'en-US-ChristopherNeural';
}

function escapeSsmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

interface VoiceCharacterProfile {
  pitch: string;
  rate: string;
  ffmpegFilter?: string;
}

const VOICE_CHARACTER_PROFILES: Record<VoiceGender, VoiceCharacterProfile> = {
  male: { pitch: '+0Hz', rate: '+7%' },
  female: { pitch: '+0Hz', rate: '+7%' },
  kore: {
    pitch: '-4Hz',
    rate: '+7%',
    ffmpegFilter: 'asetrate=24000*0.98,aresample=24000,atempo=1.0204,equalizer=f=220:t=q:w=1.2:g=2,equalizer=f=3200:t=q:w=1.5:g=2.5'
  },
  aoede: {
    pitch: '+6Hz',
    rate: '+8%',
    ffmpegFilter: 'asetrate=24000*1.03,aresample=24000,atempo=0.9709,treble=g=2.5'
  },
  charon: {
    pitch: '-12Hz',
    rate: '+6%',
    ffmpegFilter: 'asetrate=24000*0.92,aresample=24000,atempo=1.0870,bass=g=3.5:f=140'
  },
  leda: {
    pitch: '+10Hz',
    rate: '+8%',
    ffmpegFilter: 'asetrate=24000*1.05,aresample=24000,atempo=0.9524,equalizer=f=2800:t=q:w=1.4:g=2'
  },
  fenrir: {
    pitch: '-6Hz',
    rate: '+9%',
    ffmpegFilter: 'asetrate=24000*0.96,aresample=24000,atempo=1.0417,equalizer=f=180:t=q:w=1.2:g=3,equalizer=f=2600:t=q:w=1.4:g=3'
  },
  puck: {
    pitch: '+12Hz',
    rate: '+9%',
    ffmpegFilter: 'asetrate=24000*1.06,aresample=24000,atempo=0.9434,treble=g=2'
  },
  orus: {
    pitch: '-9Hz',
    rate: '+6%',
    ffmpegFilter: 'asetrate=24000*0.94,aresample=24000,atempo=1.0638,bass=g=3:f=160'
  },
  zephyr: {
    pitch: '-4Hz',
    rate: '+7%',
    ffmpegFilter: 'asetrate=24000*0.97,aresample=24000,atempo=1.0309,equalizer=f=320:t=q:w=1.3:g=2'
  }
};

/**
 * Synthesizes genuine Microsoft Edge Neural TTS MP3 (`my-MM-ThihaNeural` / `my-MM-NilarNeural`)
 * directly via Microsoft Edge ReadAloud WebSocket with Sec-MS-GEC v2 DRM authentication.
 */
async function synthesizeEdgeNeuralMp3Once(
  text: string,
  edgeVoiceName: string,
  rateStr = '+7%',
  pitchStr = '+0Hz'
): Promise<Buffer | null> {
  try {
    const { token: secMsGec, muid } = getEdgeDrmTokens();
    const connId = crypto.randomBytes(16).toString('hex');
    const reqId = crypto.randomBytes(16).toString('hex');
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${EDGE_TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${EDGE_SEC_MS_GEC_VERSION}&ConnectionId=${connId}`;

    return await new Promise<Buffer | null>((resolve) => {
      const ws = new WebSocketClient(wsUrl, {
        headers: {
          Pragma: 'no-cache',
          Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
          'Cache-Control': 'no-cache',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0',
          Cookie: `muid=${muid};`
        }
      });

      const audioChunks: Buffer[] = [];
      let settled = false;
      const finish = (buf: Buffer | null) => {
        if (settled) return;
        settled = true;
        try {
          ws.close();
        } catch {}
        resolve(buf);
      };

      const timeout = setTimeout(() => {
        finish(audioChunks.length > 0 ? Buffer.concat(audioChunks) : null);
      }, 9500);

      ws.on('open', () => {
        const configMsg =
          `X-Timestamp:${new Date().toString()}\r\n` +
          `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: 'false',
                    wordBoundaryEnabled: 'true'
                  },
                  outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
                }
              }
            }
          });
        ws.send(configMsg);

        const langTag = edgeVoiceName.split('-').slice(0, 2).join('-') || 'my-MM';
        const ssml =
          `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${langTag}'>` +
          `<voice name='${edgeVoiceName}'>` +
          `<prosody pitch='${pitchStr}' rate='${rateStr}' volume='+0%'>${escapeSsmlText(text)}</prosody>` +
          `</voice></speak>`;

        const ssmlMsg =
          `X-RequestId:${reqId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${new Date().toString()}Z\r\n` +
          `Path:ssml\r\n\r\n` +
          ssml;
        ws.send(ssmlMsg);
      });

      ws.on('message', (data: Buffer, isBinary: boolean) => {
        if (isBinary) {
          const headerLen = data.readUInt16BE(0);
          const audioPayload = data.subarray(2 + headerLen);
          if (audioPayload.length > 0) {
            audioChunks.push(audioPayload);
          }
        } else {
          const str = data.toString();
          if (str.includes('Path:turn.end')) {
            clearTimeout(timeout);
            const combined = Buffer.concat(audioChunks);
            finish(combined.length > 200 ? combined : null);
          }
        }
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        finish(null);
      });

      ws.on('close', () => {
        clearTimeout(timeout);
        const combined = Buffer.concat(audioChunks);
        finish(combined.length > 200 ? combined : null);
      });
    });
  } catch (err) {
    console.warn('[Edge Neural TTS] Synthesis warning:', err);
    return null;
  }
}

async function synthesizeEdgeNeuralMp3(
  text: string,
  edgeVoiceName: string,
  rateStr = '+7%',
  pitchStr = '+0Hz'
): Promise<Buffer | null> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const buf = await synthesizeEdgeNeuralMp3Once(text, edgeVoiceName, rateStr, pitchStr);
    if (buf && buf.length > 200) {
      return buf;
    }
    if (attempt === 2) {
      // Refresh DRM token before final attempt in case Edge rotated or throttled the current MUID
      cachedEdgeGec = null;
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 240 * attempt + Math.floor(Math.random() * 120)));
    }
  }
  return null;
}

/**
 * Wraps raw 16-bit PCM mono 24kHz buffer in a valid RIFF WAV header so browsers can decode it natively
 */
function pcm16ToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1): Buffer {
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

/**
 * Generates a speech-cadence synthesized WAV audio buffer as an offline last-resort fallback
 */
function synthesizeCadenceWavBuffer(
  cues: SubtitleCue[],
  durationSec: number,
  voiceGender: VoiceGender
): Buffer {
  const sampleRate = 24000;
  const totalSamples = Math.min(
    sampleRate * 150,
    Math.max(sampleRate * 4, Math.floor(durationSec * sampleRate))
  );
  const pcm = Buffer.alloc(totalSamples * 2);

  const baseFreq =
    voiceGender === 'female' || voiceGender === 'kore' || voiceGender === 'aoede' || voiceGender === 'leda' || voiceGender === 'zephyr'
      ? 205
      : voiceGender === 'puck'
        ? 165
        : 130;

  for (const cue of cues) {
    const startSample = Math.max(0, Math.floor((cue.start_ms / 1000) * sampleRate));
    const endSample = Math.min(totalSamples, Math.floor((cue.end_ms / 1000) * sampleRate));
    const cueLen = endSample - startSample;
    if (cueLen <= 0) continue;

    for (let i = 0; i < cueLen; i++) {
      const sampleIdx = startSample + i;
      const t = i / sampleRate;
      const syllableEnv = 0.55 + 0.45 * Math.sin(2 * Math.PI * 4.5 * t);
      const fadeFrames = Math.min(1200, Math.floor(cueLen * 0.1));
      let edgeEnv = 1;
      if (i < fadeFrames) edgeEnv = i / fadeFrames;
      else if (i > cueLen - fadeFrames) edgeEnv = (cueLen - i) / fadeFrames;

      const f0 = baseFreq * (1 + 0.08 * Math.sin(2 * Math.PI * 1.7 * t) - 0.04 * (i / cueLen));
      const harmonic1 = Math.sin(2 * Math.PI * f0 * t);
      const harmonic2 = 0.45 * Math.sin(2 * Math.PI * f0 * 2 * t);
      const harmonic3 = 0.22 * Math.sin(2 * Math.PI * f0 * 3 * t);
      const signal = (harmonic1 + harmonic2 + harmonic3) * 0.35 * syllableEnv * edgeEnv;

      const intSample = Math.max(-32767, Math.min(32767, Math.floor(signal * 32767)));
      pcm.writeInt16LE(intSample, sampleIdx * 2);
    }
  }

  return pcm16ToWavBuffer(pcm, sampleRate, 1);
}

let geminiTtsCooldownUntil = 0;

/**
 * Synthesizes distinct Studio Pro voices via Gemini 2.5 Flash Preview TTS (`prebuiltVoiceConfig`)
 * and trims leading/trailing silence so previews and dubs start crisply.
 * Note: Quota/rate-limit errors are rethrown when `rethrowOnRotate` is true so the
 * Multi-API Key Pool can immediately auto-switch to the next Admin Gemini key.
 */
async function synthesizeGeminiProVoiceWavBuffer(
  ai: GoogleGenAI,
  text: string,
  geminiVoiceName: string,
  jobId: string,
  maxDurationSec?: number,
  rethrowOnRotate = false
): Promise<{ wavBuffer: Buffer; durationMs: number } | null> {
  if (!rethrowOnRotate && Date.now() < geminiTtsCooldownUntil) {
    return null;
  }
  try {
    const cleanText = text.trim();
    if (!cleanText) return null;

    let ttsResponse: Awaited<ReturnType<typeof ai.models.generateContent>> | null = null;
    for (let ttsAttempt = 0; ttsAttempt < 2; ttsAttempt++) {
      try {
        ttsResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ parts: [{ text: cleanText }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: geminiVoiceName }
              }
            }
          }
        });
        break;
      } catch (ttsErr) {
        if (ttsAttempt === 0 && isTransientModelOverloadError(ttsErr)) {
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }
        throw ttsErr;
      }
    }
    if (!ttsResponse) return null;

    const inlinePart = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlinePart?.data) return null;

    const rawBuffer = Buffer.from(inlinePart.data, 'base64');
    const rawWav =
      rawBuffer.subarray(0, 4).toString('ascii') === 'RIFF'
        ? rawBuffer
        : pcm16ToWavBuffer(rawBuffer, 24000, 1);

    const inWav = path.join(JOBS_TEMP_DIR, `${jobId}_gem_in.wav`);
    const outWav = path.join(JOBS_TEMP_DIR, `${jobId}_gem_out.wav`);
    try {
      fs.writeFileSync(inWav, rawWav);
      await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        inWav,
        '-af',
        'silenceremove=start_periods=1:start_duration=0.04:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_duration=0.04:start_threshold=-45dB,areverse,volume=1.32',
        '-ar',
        '24000',
        '-ac',
        '1',
        '-c:a',
        'pcm_s16le',
        outWav
      ]);

      let finalWav = fs.existsSync(outWav) ? fs.readFileSync(outWav) : rawWav;
      let durationMs = Math.max(400, Math.round((Math.max(0, finalWav.length - 44) / (24000 * 2)) * 1000));

      if (maxDurationSec && durationMs > maxDurationSec * 1000 * 1.05) {
        const stretchFactor = Math.min(1.28, Number((durationMs / (maxDurationSec * 1000)).toFixed(3)));
        if (stretchFactor > 1.02) {
          const fitWav = path.join(JOBS_TEMP_DIR, `${jobId}_gem_fit.wav`);
          try {
            await execFileAsync('ffmpeg', [
              '-y',
              '-i',
              outWav,
              '-af',
              `atempo=${stretchFactor}`,
              '-ar',
              '24000',
              '-ac',
              '1',
              '-c:a',
              'pcm_s16le',
              fitWav
            ]);
            if (fs.existsSync(fitWav)) {
              finalWav = fs.readFileSync(fitWav);
              durationMs = Math.max(400, Math.round((Math.max(0, finalWav.length - 44) / (24000 * 2)) * 1000));
            }
          } finally {
            try {
              if (fs.existsSync(fitWav)) fs.unlinkSync(fitWav);
            } catch {}
          }
        }
      }

      return { wavBuffer: finalWav, durationMs };
    } finally {
      try {
        if (fs.existsSync(inWav)) fs.unlinkSync(inWav);
        if (fs.existsSync(outWav)) fs.unlinkSync(outWav);
      } catch {}
    }
  } catch (err: any) {
    const errInfo = isApiKeyQuotaOrLimitError(err);
    if (rethrowOnRotate && errInfo.shouldRotate) {
      throw err;
    }
    const msg = String(err?.message || err || '');
    if (errInfo.isQuotaLimit) {
      const retryMatch = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
      const retrySec = retryMatch ? Number(retryMatch[1]) : 3600;
      const cooldownMs = Math.min(12 * 3600_000, Math.max(60_000, retrySec * 1000));
      const wasCoolingDown = Date.now() < geminiTtsCooldownUntil;
      geminiTtsCooldownUntil = Date.now() + cooldownMs;
      if (!wasCoolingDown) {
        console.info(
          `[Gemini TTS] Quota reached; switching voices to Neural Character TTS fallback for ${Math.round(cooldownMs / 60_000)}m.`
        );
      }
    } else {
      console.info(`[Gemini TTS:${geminiVoiceName}] Falling back to Neural Character TTS:`, msg.slice(0, 180));
    }
    return null;
  }
}

/**
 * Synthesizes Gemini Pro Studio Voices (~15s scene-locked blocks) so 3+ minute Credit Mode
 * videos stay tightly synced to visual scenes from start to finish instead of drifting.
 */
async function synthesizeGeminiProVoiceCuesWavBuffer(
  ai: GoogleGenAI,
  cues: SubtitleCue[],
  geminiVoiceName: string,
  jobId: string,
  totalDurationSec: number,
  rethrowOnRotate = false
): Promise<{ wavBuffer: Buffer; syncedCues: SubtitleCue[] } | null> {
  if (!cues.length) return null;
  if (cues.length <= 3) {
    const combined = cues.map((c) => c.text.trim()).filter(Boolean).join(' ');
    const single = await synthesizeGeminiProVoiceWavBuffer(
      ai,
      combined,
      geminiVoiceName,
      jobId,
      totalDurationSec,
      rethrowOnRotate
    );
    if (!single) return null;
    return {
      wavBuffer: single.wavBuffer,
      syncedCues: alignCuesProportionallyToAudioDuration(cues, single.durationMs)
    };
  }

  const sampleRate = 24000;
  const blocks = groupCuesIntoTimedBlocks(cues, 15000);
  const blockAudio: Array<{ pcm: Buffer; durationMs: number } | null> = new Array(blocks.length).fill(null);

  const concurrency = 3;
  for (let b = 0; b < blocks.length; b += concurrency) {
    const slice = blocks.slice(b, b + concurrency);
    await Promise.all(
      slice.map(async (block, idx) => {
        const blockIdx = b + idx;
        const slotSec = Math.max(2, (block.endMs - block.startMs) / 1000);
        const res = await synthesizeGeminiProVoiceWavBuffer(
          ai,
          block.combinedText,
          geminiVoiceName,
          `${jobId}_blk${blockIdx}`,
          slotSec * 1.08,
          rethrowOnRotate
        );
        if (res && res.wavBuffer.length > 44) {
          blockAudio[blockIdx] = {
            pcm: res.wavBuffer.subarray(44),
            durationMs: res.durationMs
          };
        }
      })
    );
  }

  if (blockAudio.some((b) => !b)) {
    return null;
  }

  const totalTargetMs = Math.max(4000, Math.round(totalDurationSec * 1000));
  const blockSchedules = alignCuesWithAudioSync(
    blocks.map((blk, i) => ({
      id: `blk-${i}`,
      start_ms: blk.startMs,
      end_ms: blk.endMs,
      text: blk.combinedText
    })),
    blockAudio.map((a) => a?.durationMs || 4000),
    100,
    true,
    totalTargetMs,
    600
  );

  let maxEndMs = totalTargetMs;
  for (const s of blockSchedules) {
    maxEndMs = Math.max(maxEndMs, s.cue.end_ms + 120);
  }
  const masterSamples = Math.max(sampleRate * 2, Math.ceil((maxEndMs / 1000) * sampleRate));
  const masterPcm = Buffer.alloc(masterSamples * 2, 0);
  const syncedCues: SubtitleCue[] = [];
  let cueSeq = 1;

  for (let i = 0; i < blocks.length; i++) {
    const item = blockSchedules[i];
    const audio = blockAudio[i]!;
    let pcm = audio.pcm;

    if (item.tempoFactor > 1.02) {
      const clampedTempo = Math.max(1.0, Math.min(1.26, item.tempoFactor));
      const inRaw = path.join(JOBS_TEMP_DIR, `${jobId}_gblk_in_${i}.pcm`);
      const outStretch = path.join(JOBS_TEMP_DIR, `${jobId}_gblk_out_${i}.pcm`);
      try {
        fs.writeFileSync(inRaw, pcm);
        await execFileAsync('ffmpeg', [
          '-y',
          '-f',
          's16le',
          '-ar',
          String(sampleRate),
          '-ac',
          '1',
          '-i',
          inRaw,
          '-af',
          `atempo=${clampedTempo}`,
          '-f',
          's16le',
          '-acodec',
          'pcm_s16le',
          '-ar',
          String(sampleRate),
          '-ac',
          '1',
          outStretch
        ]);
        if (fs.existsSync(outStretch)) {
          pcm = fs.readFileSync(outStretch);
        }
      } catch {}
      try {
        if (fs.existsSync(inRaw)) fs.unlinkSync(inRaw);
        if (fs.existsSync(outStretch)) fs.unlinkSync(outStretch);
      } catch {}
    }

    const actualBlockMs = Math.max(400, Math.round((Math.floor(pcm.length / 2) / sampleRate) * 1000));
    const startSample = Math.max(0, Math.floor((item.cue.start_ms / 1000) * sampleRate));
    const targetByteOffset = startSample * 2;
    if (targetByteOffset < masterPcm.length) {
      const bytesToCopy = Math.min(pcm.length, masterPcm.length - targetByteOffset);
      pcm.copy(masterPcm, targetByteOffset, 0, bytesToCopy);
    }

    const subCues = blocks[i].cues;
    const weights = subCues.map((c) => Math.max(4, c.text.trim().length));
    const totalWeight = weights.reduce((a, b) => a + b, 0) || subCues.length;
    let subCursor = item.cue.start_ms;
    for (let j = 0; j < subCues.length; j++) {
      const isLast = j === subCues.length - 1;
      const share = isLast
        ? Math.max(320, item.cue.start_ms + actualBlockMs - subCursor)
        : Math.max(320, Math.round((weights[j] / totalWeight) * actualBlockMs));
      const cStart = subCursor;
      const cEnd = Math.max(cStart + 300, isLast ? item.cue.start_ms + actualBlockMs : cStart + share - 40);
      syncedCues.push({
        ...subCues[j],
        id: `cue-${cueSeq++}`,
        start_ms: cStart,
        end_ms: cEnd
      });
      subCursor = cStart + share;
    }
  }

  return {
    wavBuffer: pcm16ToWavBuffer(masterPcm, sampleRate, 1),
    syncedCues
  };
}

function alignCuesProportionallyToAudioDuration(
  cues: SubtitleCue[],
  totalAudioMs: number
): SubtitleCue[] {
  if (!cues.length || totalAudioMs <= 400) return cues;
  const startOffsetMs = 60;
  const usableMs = Math.max(400, totalAudioMs - startOffsetMs - 120);
  const weights = cues.map((c) => Math.max(4, c.text.trim().length));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || cues.length;

  let cursorMs = startOffsetMs;
  return cues.map((c, idx) => {
    const shareMs =
      idx === cues.length - 1
        ? Math.max(350, startOffsetMs + usableMs - cursorMs)
        : Math.max(350, Math.round((weights[idx] / totalWeight) * usableMs));
    const start_ms = cursorMs;
    const end_ms = Math.min(totalAudioMs, start_ms + Math.max(320, shareMs - 60));
    cursorMs = start_ms + shareMs;
    return { ...c, start_ms, end_ms: Math.max(start_ms + 300, end_ms) };
  });
}

/**
 * Generates real spoken Microsoft Edge Neural TTS (`my-MM-ThihaNeural` & `my-MM-NilarNeural`)
 * AND synchronizes each subtitle cue's `start_ms` and `end_ms` using the 3-Method Audio & Video Sync:
 *   1. Timestamp-anchored Timeline (`cue.start_ms` & `cue.end_ms`)
 *   2. Exact Spoken Duration + 80ms–120ms Natural Breath Pause (`breathPauseMs`)
 *   3. Dynamic Tempo Fit (`atempo` when a phrase exceeds its scene window)
 */
async function synthesizeNeuralSpokenWavBuffer(
  cues: SubtitleCue[],
  targetLanguage: TargetLanguageCode,
  voiceGender: VoiceGender,
  jobId: string,
  _pitchShiftEffect = false,
  totalDurationSec?: number,
  breathPauseMs = 100,
  dynamicTempoFit = true
): Promise<{ wavBuffer: Buffer; syncedCues: SubtitleCue[]; voiceEngineUsed: string } | null> {
  try {
    const edgeVoiceName = getEdgeNeuralVoiceName(targetLanguage, voiceGender);
    const voiceProfile = VOICE_CHARACTER_PROFILES[voiceGender] || VOICE_CHARACTER_PROFILES.male;
    const tlMap: Record<TargetLanguageCode, string> = {
      my: 'my',
      th: 'th',
      ja: 'ja',
      ko: 'ko',
      zh: 'zh-CN',
      en: 'en'
    };
    const tl = tlMap[targetLanguage] || 'my';
    const sampleRate = 24000;

    // 1. Synthesize each sentence cue with genuine Microsoft Edge Neural TTS (`my-MM-ThihaNeural` / `my-MM-NilarNeural`)
    //    Use batchSize=2 to prevent Microsoft Edge WebSocket 503 throttling mid-video
    const cueMp3Buffers: Array<Buffer | null> = new Array(cues.length).fill(null);
    const batchSize = cues.length > 14 ? 6 : 2;
    for (let b = 0; b < cues.length; b += batchSize) {
      const slice = cues.slice(b, b + batchSize);
      await Promise.all(
        slice.map(async (cue, idx) => {
          const cleanText = cue.text.trim();
          if (!cleanText) return;

          // Primary: Microsoft Edge Neural TTS (`my-MM-ThihaNeural` / `my-MM-NilarNeural`) with voice-specific prosody
          const edgeBuf = await synthesizeEdgeNeuralMp3(
            cleanText,
            edgeVoiceName,
            voiceProfile.rate,
            voiceProfile.pitch
          );
          if (edgeBuf && edgeBuf.length > 200) {
            cueMp3Buffers[b + idx] = edgeBuf;
            return;
          }

          // Fallback only if Edge WebSocket fails after retries
          try {
            const ttsUrl = `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
              cleanText.slice(0, 175)
            )}&tl=${tl}&client=gtx`;
            const resp = await fetch(ttsUrl, {
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
              }
            });
            if (resp.ok) {
              const arrBuf = await resp.arrayBuffer();
              if (arrBuf.byteLength > 200) {
                cueMp3Buffers[b + idx] = Buffer.from(arrBuf);
              }
            }
          } catch {}
        })
      );
    }

    const validCount = cueMp3Buffers.filter(Boolean).length;
    if (validCount === 0) return null;

    // 2. Decode each cue's Edge Neural MP3 into 24kHz 16-bit mono PCM with gentle silence trimming (-50dB)
    const rawPcmSegments: Array<Buffer | null> = new Array(cues.length).fill(null);
    const rawDurationsMs: number[] = new Array(cues.length).fill(1400);
    const baseFilterChain =
      'silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_duration=0.03:start_threshold=-50dB,areverse,volume=1.45';
    const fullAudioFilter = voiceProfile.ffmpegFilter
      ? `${baseFilterChain},${voiceProfile.ffmpegFilter}`
      : baseFilterChain;

    for (let i = 0; i < cues.length; i++) {
      const mp3Buf = cueMp3Buffers[i];
      if (!mp3Buf) continue;
      const inMp3 = path.join(JOBS_TEMP_DIR, `${jobId}_c${i}.mp3`);
      const outPcm = path.join(JOBS_TEMP_DIR, `${jobId}_c${i}.pcm`);
      try {
        fs.writeFileSync(inMp3, mp3Buf);
        await execFileAsync('ffmpeg', [
          '-y',
          '-i',
          inMp3,
          '-af',
          fullAudioFilter,
          '-f',
          's16le',
          '-acodec',
          'pcm_s16le',
          '-ar',
          String(sampleRate),
          '-ac',
          '1',
          outPcm
        ]);
        if (fs.existsSync(outPcm)) {
          const pcm = fs.readFileSync(outPcm);
          rawPcmSegments[i] = pcm;
          const samples = Math.floor(pcm.length / 2);
          rawDurationsMs[i] = Math.max(320, Math.round((samples / sampleRate) * 1000));
        }
      } catch {}
      try {
        if (fs.existsSync(inMp3)) fs.unlinkSync(inMp3);
        if (fs.existsSync(outPcm)) fs.unlinkSync(outPcm);
      } catch {}
    }

    // 3. Apply the 3-Method Continuous Audio & Video Sync (`alignCuesWithAudioSync`)
    const syncSchedule = alignCuesWithAudioSync(
      cues,
      rawDurationsMs,
      breathPauseMs,
      dynamicTempoFit,
      totalDurationSec ? Math.round(totalDurationSec * 1000) : undefined,
      220
    );

    const syncedCues: SubtitleCue[] = [];
    const placedChunks: Array<{ startSample: number; pcm: Buffer }> = [];
    let maxEndMs = 0;
    let liveCursorMs = 60;

    for (let i = 0; i < syncSchedule.length; i++) {
      const item = syncSchedule[i];
      let pcm = rawPcmSegments[i];

      // Method 3 (Dynamic Tempo Fit): smoothly compress (>1.02x) via FFmpeg `atempo` when a phrase exceeds its slot (never slow down <1.0x)
      if (pcm && pcm.length > 4 && item.tempoFactor > 1.02) {
        const clampedTempo = Math.max(1.0, Math.min(1.26, item.tempoFactor));
        const inRaw = path.join(JOBS_TEMP_DIR, `${jobId}_stretch_in_${i}.pcm`);
        const outStretch = path.join(JOBS_TEMP_DIR, `${jobId}_stretch_out_${i}.pcm`);
        try {
          fs.writeFileSync(inRaw, pcm);
          await execFileAsync('ffmpeg', [
            '-y',
            '-f',
            's16le',
            '-ar',
            String(sampleRate),
            '-ac',
            '1',
            '-i',
            inRaw,
            '-af',
            `atempo=${clampedTempo}`,
            '-f',
            's16le',
            '-acodec',
            'pcm_s16le',
            '-ar',
            String(sampleRate),
            '-ac',
            '1',
            outStretch
          ]);
          if (fs.existsSync(outStretch)) {
            pcm = fs.readFileSync(outStretch);
          }
        } catch {}
        try {
          if (fs.existsSync(inRaw)) fs.unlinkSync(inRaw);
          if (fs.existsSync(outStretch)) fs.unlinkSync(outStretch);
        } catch {}
      }

      const safeStartMs = i === 0 ? item.cue.start_ms : Math.max(liveCursorMs, item.cue.start_ms);

      if (pcm && pcm.length > 4) {
        const actualSamples = Math.floor(pcm.length / 2);
        const actualMs = Math.max(320, Math.round((actualSamples / sampleRate) * 1000));
        const alignedCue: SubtitleCue = {
          ...item.cue,
          start_ms: safeStartMs,
          end_ms: safeStartMs + actualMs
        };
        syncedCues.push(alignedCue);
        const startSample = Math.max(0, Math.floor((alignedCue.start_ms / 1000) * sampleRate));
        placedChunks.push({ startSample, pcm });
        liveCursorMs = alignedCue.end_ms + item.breathPauseAfterMs;
        maxEndMs = Math.max(maxEndMs, liveCursorMs);
      } else {
        const fallbackDur = Math.max(320, item.cue.end_ms - item.cue.start_ms);
        const fallbackCue: SubtitleCue = {
          ...item.cue,
          start_ms: safeStartMs,
          end_ms: safeStartMs + fallbackDur
        };
        syncedCues.push(fallbackCue);
        liveCursorMs = fallbackCue.end_ms + item.breathPauseAfterMs;
        maxEndMs = Math.max(maxEndMs, liveCursorMs);
      }
    }

    let finalSyncedCues = syncedCues;
    const requestedTotalMs = totalDurationSec ? Math.round(totalDurationSec * 1000) : 0;
    const rawSpokenEndMs = finalSyncedCues.length
      ? finalSyncedCues[finalSyncedCues.length - 1].end_ms
      : maxEndMs;
    const targetTotalMs = Math.max(requestedTotalMs, rawSpokenEndMs + 120);
    const totalSamples = Math.max(
      sampleRate * 2,
      Math.ceil((targetTotalMs / 1000) * sampleRate)
    );
    let masterPcm = Buffer.alloc(totalSamples * 2, 0);

    for (const chunk of placedChunks) {
      const targetByteOffset = chunk.startSample * 2;
      if (targetByteOffset < masterPcm.length) {
        const bytesToCopy = Math.min(chunk.pcm.length, masterPcm.length - targetByteOffset);
        chunk.pcm.copy(masterPcm, targetByteOffset, 0, bytesToCopy);
      }
    }

    // If multi-cue narration slightly exceeded video duration, smoothly fit masterPcm within totalDurationSec
    // so the ending sentence never gets cut off when muxed into MP4.
    const capMs = requestedTotalMs > 1500 ? requestedTotalMs - 80 : 0;
    if (finalSyncedCues.length > 1 && capMs > 0 && rawSpokenEndMs > requestedTotalMs + 40) {
      const fitFactor = Number(Math.min(1.32, rawSpokenEndMs / capMs).toFixed(3));
      const spokenSamples = Math.min(masterPcm.length / 2, Math.ceil((rawSpokenEndMs / 1000) * sampleRate));
      const trimmedIn = path.join(JOBS_TEMP_DIR, `${jobId}_fit_in.pcm`);
      const fittedOut = path.join(JOBS_TEMP_DIR, `${jobId}_fit_out.pcm`);
      try {
        fs.writeFileSync(trimmedIn, masterPcm.subarray(0, spokenSamples * 2));
        await execFileAsync('ffmpeg', [
          '-y',
          '-f',
          's16le',
          '-ar',
          String(sampleRate),
          '-ac',
          '1',
          '-i',
          trimmedIn,
          '-af',
          `atempo=${fitFactor}`,
          '-f',
          's16le',
          '-acodec',
          'pcm_s16le',
          '-ar',
          String(sampleRate),
          '-ac',
          '1',
          fittedOut
        ]);
        if (fs.existsSync(fittedOut)) {
          const fittedPcm = fs.readFileSync(fittedOut);
          const fittedMs = Math.max(400, Math.round((Math.floor(fittedPcm.length / 2) / sampleRate) * 1000));
          const timeScale = fittedMs / rawSpokenEndMs;
          finalSyncedCues = finalSyncedCues.map((c) => ({
            ...c,
            start_ms: Math.round(c.start_ms * timeScale),
            end_ms: Math.max(Math.round(c.start_ms * timeScale) + 280, Math.round(c.end_ms * timeScale))
          }));
          const exactSamples = Math.ceil((requestedTotalMs / 1000) * sampleRate);
          const cappedPcm = Buffer.alloc(exactSamples * 2, 0);
          fittedPcm.copy(cappedPcm, 0, 0, Math.min(fittedPcm.length, cappedPcm.length));
          masterPcm = cappedPcm;
        }
      } catch {}
      try {
        if (fs.existsSync(trimmedIn)) fs.unlinkSync(trimmedIn);
        if (fs.existsSync(fittedOut)) fs.unlinkSync(fittedOut);
      } catch {}
    }

    return {
      wavBuffer: pcm16ToWavBuffer(masterPcm, sampleRate, 1),
      syncedCues: finalSyncedCues,
      voiceEngineUsed: edgeVoiceName
    };
  } catch (err) {
    console.warn('[TTS] Neural spoken TTS synthesis warning:', err);
    return null;
  }
}

/**
 * Formats milliseconds into ASS subtitle timestamp H:MM:SS.CC (centiseconds)
 */
function msToAssTime(ms: number): string {
  const safe = Math.max(0, Math.round(ms));
  const hours = Math.floor(safe / 3_600_000);
  const mins = Math.floor((safe % 3_600_000) / 60_000);
  const secs = Math.floor((safe % 60_000) / 1000);
  const cs = Math.floor((safe % 1000) / 10);
  return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Probes display-oriented video width, height (respecting phone rotate/displaymatrix metadata),
 * duration in seconds, and whether an audio stream exists via ffprobe.
 */
async function probeVideoDimensions(videoPath: string): Promise<{
  width: number;
  height: number;
  durationSec: number;
  hasAudio: boolean;
}> {
  let width = 720;
  let height = 1280;
  let durationSec = 0;
  let hasAudio = false;
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'stream=codec_type,width,height,duration,side_data_list:stream_tags=rotate:format=duration',
        '-of',
        'json',
        videoPath
      ],
      { timeout: 30_000 }
    );
    const parsed = JSON.parse(stdout.trim());
    const streams = Array.isArray(parsed?.streams) ? parsed.streams : [];
    const videoStream = streams.find((s: any) => s?.codec_type === 'video' && s?.width > 64 && s?.height > 64);
    const audioStream = streams.find((s: any) => s?.codec_type === 'audio');
    hasAudio = Boolean(audioStream);
    if (videoStream) {
      let w = Number(videoStream.width);
      let h = Number(videoStream.height);
      const tagRot = Number(videoStream?.tags?.rotate || 0);
      const sideRot = Array.isArray(videoStream?.side_data_list)
        ? Number(videoStream.side_data_list.find((d: any) => d?.rotation !== undefined)?.rotation || 0)
        : 0;
      const rot = Math.abs(tagRot || sideRot);
      if (rot === 90 || rot === 270) {
        [w, h] = [h, w];
      }
      width = Math.max(64, w - (w % 2));
      height = Math.max(64, h - (h % 2));
    }
    const formatDur = Number(parsed?.format?.duration);
    const videoDur = Number(videoStream?.duration);
    const audioDur = Number(audioStream?.duration);
    const bestDur =
      Number.isFinite(formatDur) && formatDur > 0.5
        ? formatDur
        : Number.isFinite(videoDur) && videoDur > 0.5
          ? videoDur
          : Number.isFinite(audioDur) && audioDur > 0.5
            ? audioDur
            : 0;
    if (bestDur > 0.5) {
      durationSec = bestDur;
    }
  } catch (probeErr) {
    console.warn('[ffprobe] probeVideoDimensions warning:', probeErr);
  }
  return { width, height, durationSec, hasAudio };
}

/**
 * Writes an uploaded base64 dataUrl brand logo image to a temporary PNG file for FFmpeg overlay
 */
function writeTempBrandLogoFile(editConfig: DeepRecapEditConfig | undefined, jobId: string): string | null {
  try {
    const dataUrl = editConfig?.brandLogo?.enabled ? editConfig.brandLogo.dataUrl : undefined;
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return null;
    const base64Part = dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
    if (base64Part.length < 32) return null;
    const logoPath = path.join(JOBS_TEMP_DIR, `${jobId}_logo.png`);
    fs.writeFileSync(logoPath, Buffer.from(base64Part, 'base64'));
    return fs.existsSync(logoPath) && fs.statSync(logoPath).size > 32 ? logoPath : null;
  } catch {
    return null;
  }
}

const pangoBoxMeasureCache = new Map<string, { w: number; h: number }>();

/**
 * Batch-measures exact pixel bounding boxes for Burmese/multilingual cues using PangoCairo
 * so ASS rounded pill boxes hug every subtitle tightly (with in-memory cache + deterministic heuristic fallback).
 */
function measureCueBoxesWithPango(
  texts: string[],
  pangoPx: number,
  maxTextWidthPx: number,
  pangoFontDesc = 'Padauk Bold'
): { w: number; h: number }[] {
  if (!texts.length) return [];
  const safeMaxW = Math.max(120, Math.round(maxTextWidthPx));
  const results: ({ w: number; h: number } | null)[] = new Array(texts.length).fill(null);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const key = `${pangoFontDesc}|${pangoPx}|${safeMaxW}|${texts[i]}`;
    const cached = pangoBoxMeasureCache.get(key);
    if (cached) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(texts[i]);
    }
  }

  if (uncachedTexts.length === 0) {
    return results as { w: number; h: number }[];
  }

  try {
    const pyCode = `
import ctypes, json, os, sys
data = json.loads(sys.stdin.read())
texts = data["texts"]
font_px = max(12, int(data["fontPx"]))
max_w = max(120, int(data["maxW"]))
font_desc = data.get("fontDesc") or "Padauk Bold"
fonts_dir = data.get("fontsDir") or ""
if fonts_dir and os.path.isdir(fonts_dir):
  fc = ctypes.CDLL("libfontconfig.so.1")
  fc.FcConfigGetCurrent.restype = ctypes.c_void_p
  fc.FcConfigAppFontAddDir.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
  fc.FcConfigAppFontAddDir(fc.FcConfigGetCurrent(), fonts_dir.encode("utf-8"))
cairo = ctypes.CDLL("libcairo.so.2")
pango = ctypes.CDLL("libpango-1.0.so.0")
pangocairo = ctypes.CDLL("libpangocairo-1.0.so.0")
cairo.cairo_image_surface_create.restype = ctypes.c_void_p
cairo.cairo_create.restype = ctypes.c_void_p
cairo.cairo_create.argtypes = [ctypes.c_void_p]
pangocairo.pango_cairo_create_layout.restype = ctypes.c_void_p
pangocairo.pango_cairo_create_layout.argtypes = [ctypes.c_void_p]
pango.pango_font_description_from_string.restype = ctypes.c_void_p
pango.pango_font_description_from_string.argtypes = [ctypes.c_char_p]
pango.pango_layout_set_font_description.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
pango.pango_layout_set_text.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
pango.pango_layout_set_width.argtypes = [ctypes.c_void_p, ctypes.c_int]
pango.pango_layout_set_alignment.argtypes = [ctypes.c_void_p, ctypes.c_int]
pango.pango_layout_get_pixel_size.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int)]
surf = cairo.cairo_image_surface_create(0, 10, 10)
cr = cairo.cairo_create(surf)
layout = pangocairo.pango_cairo_create_layout(cr)
desc = pango.pango_font_description_from_string(f"{font_desc} {font_px}px".encode("utf-8"))
pango.pango_layout_set_font_description(layout, desc)
pango.pango_layout_set_width(layout, max_w * 1024)
pango.pango_layout_set_alignment(layout, 1)
out = []
w = ctypes.c_int()
h = ctypes.c_int()
for t in texts:
  b = t.encode("utf-8")
  pango.pango_layout_set_text(layout, b, len(b))
  pango.pango_layout_get_pixel_size(layout, ctypes.byref(w), ctypes.byref(h))
  out.append({"w": max(24, int(w.value)), "h": max(font_px + 6, int(h.value))})
sys.stdout.write(json.dumps(out))
`;
    const raw = execFileSync('python3', ['-c', pyCode], {
      input: JSON.stringify({
        texts: uncachedTexts,
        fontPx: pangoPx,
        maxW: safeMaxW,
        fontDesc: pangoFontDesc,
        fontsDir: FONTS_DIR
      }),
      timeout: 3000,
      maxBuffer: 2 * 1024 * 1024
    }).toString();
    const parsed = JSON.parse(raw) as { w: number; h: number }[];
    if (Array.isArray(parsed) && parsed.length === uncachedTexts.length) {
      for (let j = 0; j < uncachedIndices.length; j++) {
        const origIdx = uncachedIndices[j];
        const box = parsed[j];
        results[origIdx] = box;
        if (pangoBoxMeasureCache.size > 4000) pangoBoxMeasureCache.clear();
        pangoBoxMeasureCache.set(`${pangoFontDesc}|${pangoPx}|${safeMaxW}|${texts[origIdx]}`, box);
      }
      return results as { w: number; h: number }[];
    }
  } catch {}
  return texts.map((t, idx) => {
    if (results[idx]) return results[idx]!;
    const estW = Math.min(safeMaxW, Math.max(60, Math.round(t.length * pangoPx * 0.62)));
    const lines = Math.max(1, Math.ceil((t.length * pangoPx * 0.62) / safeMaxW));
    return { w: estW, h: Math.round(lines * pangoPx * 1.45) };
  });
}

/**
 * Generates an Advanced SubStation Alpha (.ass) file for:
 * - Burned-in Burmese/multilingual subtitles with calibrated size, Unicode-accurate Myanmar fonts, rounded pill background, custom color & outline thickness
 * - Optional Channel Watermark Text (static 9-grid or smooth moving)
 */
function writeAssSubtitleFile(
  assFilePath: string,
  cues: SubtitleCue[],
  subtitleConfig: SubtitleOverlayConfig | undefined,
  vidW: number,
  vidH: number,
  editConfig?: DeepRecapEditConfig,
  totalDurationSec = 150
): boolean {
  const activeEdit = editConfig || DEFAULT_DEEPRECAP_EDIT_CONFIG;
  const hasCues = Boolean(cues && cues.length > 0 && subtitleConfig?.enabled !== false);
  const wmText = activeEdit.watermarkText?.enabled ? (activeEdit.watermarkText.text || '').trim() : '';
  const hasWatermark = wmText.length > 0;
  if (!hasCues && !hasWatermark) return false;

  const cfg: SubtitleOverlayConfig = subtitleConfig || {
    enabled: true,
    x: 50,
    y: 74,
    fontSize: 40,
    style: 'box_black',
    fontStyle: 'Yati_Round',
    maxWidth: 88,
    samplePreviewLight: false
  };

  const fontMeta = resolveSubtitleFontMeta(
    cfg.fontStyle,
    cfg.subtitleLanguage,
    cues?.[0]?.text || ''
  );
  const scaleFactor = vidW / 540;
  const fontSizePx = computeAssSubtitleFontSize(cfg.fontSize || 40, vidW, vidH);
  const marginSide = Math.max(24, Math.round(vidW * 0.06));
  const posX = Math.max(marginSide + 20, Math.min(vidW - marginSide - 20, Math.round(((cfg.x ?? 50) / 100) * vidW)));
  const posY = Math.max(40, Math.min(vidH - 40, Math.round((Math.min(cfg.y ?? 74, 86) / 100) * vidH)));

  // ASS colors are &HAABBGGRR (Alpha, Blue, Green, Red)
  const isBoxBlack = cfg.style === 'box_black';
  const customPrimary = hexToAssBgr(activeEdit.captionTextColor);
  const primaryColor = customPrimary || (isBoxBlack ? '&H0047E0FD' : '&H00FFFFFF');
  const outlineColor = '&H00000000';
  const backColor = '&H64000000';
  // Use BorderStyle=1 for both modes; Highlight (`box_black`) draws a true smooth rounded-corner pill on Layer 0!
  const borderStyle = 1;
  const customOutline =
    typeof activeEdit.captionOutlineWidth === 'number'
      ? Math.max(0, Math.round(activeEdit.captionOutlineWidth * scaleFactor * 1.15))
      : Math.max(2, Math.round(fontSizePx * 0.1));
  const outlineWidth = isBoxBlack ? Math.max(1.5, Number((fontSizePx * 0.04).toFixed(1))) : customOutline;
  const shadowDepth = isBoxBlack ? 0 : 2;

  // Watermark ASS Style
  const wmOpacity = Math.max(10, Math.min(100, activeEdit.watermarkText?.opacity ?? 75));
  const wmAlphaHex = Math.max(0, Math.min(230, Math.round((1 - wmOpacity / 100) * 255)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  const wmPrimary = `&H${wmAlphaHex}FFFFFF`;
  const wmOutline = `&H${wmAlphaHex}000000`;
  const wmSizePx = Math.max(16, Math.round((activeEdit.watermarkText?.sizePx || 18) * scaleFactor * 1.15));

  const lines: string[] = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${vidW}`,
    `PlayResY: ${vidH}`,
    'WrapStyle: 0',
    'ScaledBorderAndShadow: yes',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: BoxBg,Arial,20,&H24000000,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,0,0,0,1`,
    `Style: Default,${fontMeta.assFontName},${fontSizePx},${primaryColor},&H000000FF,${outlineColor},${backColor},${fontMeta.assBold},0,0,0,100,100,0,0,${borderStyle},${outlineWidth},${shadowDepth},5,${marginSide},${marginSide},12,1`,
    `Style: Watermark,DejaVu Sans,${wmSizePx},${wmPrimary},&H000000FF,${wmOutline},&H64000000,-1,0,0,0,100,100,0,0,1,2,1,5,12,12,12,1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ];

  if (hasCues) {
    const cleanCueList = cues
      .map((cue) => ({
        cue,
        cleanText: (cue.text || '').replace(/\r?\n/g, ' ').replace(/[{}]/g, '').trim()
      }))
      .filter((item) => item.cleanText.length > 0);

    const maxTextWidthPx = Math.max(140, vidW - marginSide * 2);
    // Calibrated per-font Pango px matching libass rendered glyphs inside bundled FONTS_DIR
    const pangoScale = fontMeta.pangoAssScale || 0.70;
    const pangoPx = Math.max(12, Math.round(fontSizePx * pangoScale));
    const measuredBoxes = isBoxBlack
      ? measureCueBoxesWithPango(
          cleanCueList.map((i) => i.cleanText),
          pangoPx,
          maxTextWidthPx,
          fontMeta.pangoFontDesc
        )
      : [];

    const padX = Math.max(20, Math.round(fontSizePx * 0.52));
    const padY = Math.max(11, Math.round(fontSizePx * 0.24));

    for (let idx = 0; idx < cleanCueList.length; idx++) {
      const { cue, cleanText } = cleanCueList[idx];
      const startStr = msToAssTime(cue.start_ms);
      const endStr = msToAssTime(Math.max(cue.start_ms + 300, cue.end_ms));

      if (isBoxBlack && measuredBoxes[idx]) {
        const boxW = Math.min(Math.round(vidW * 0.96), measuredBoxes[idx].w + padX * 2);
        const boxH = Math.max(Math.round(fontSizePx * 1.18), measuredBoxes[idx].h + padY * 2);
        const radius = Math.min(Math.floor(boxH / 2), Math.max(10, Math.round(fontSizePx * 0.30)));
        const pillPath = buildAssRoundedBoxPath(boxW, boxH, radius);
        lines.push(
          `Dialogue: 0,${startStr},${endStr},BoxBg,,0,0,0,,{\\an5\\pos(${posX},${posY})\\p1}${pillPath}{\\p0}`
        );
      }

      lines.push(
        `Dialogue: 1,${startStr},${endStr},Default,,0,0,0,,{\\an5\\pos(${posX},${posY})\\q0}${cleanText}`
      );
    }
  }

  if (hasWatermark) {
    const safeWmText = wmText.replace(/\r?\n/g, ' ').replace(/[{}]/g, '').trim();
    const maxDurMs = Math.max(5000, Math.round(totalDurationSec * 1000) + 1000);
    if (activeEdit.watermarkText.moving) {
      const segMs = 6000;
      const pts = [
        { x: Math.round(vidW * 0.2), y: Math.round(vidH * 0.14) },
        { x: Math.round(vidW * 0.8), y: Math.round(vidH * 0.42) },
        { x: Math.round(vidW * 0.22), y: Math.round(vidH * 0.78) },
        { x: Math.round(vidW * 0.78), y: Math.round(vidH * 0.18) }
      ];
      let curMs = 0;
      let idx = 0;
      while (curMs < maxDurMs) {
        const nextMs = Math.min(maxDurMs, curMs + segMs);
        const p1 = pts[idx % pts.length];
        const p2 = pts[(idx + 1) % pts.length];
        lines.push(
          `Dialogue: 1,${msToAssTime(curMs)},${msToAssTime(nextMs)},Watermark,,0,0,0,,{\\an5\\move(${p1.x},${p1.y},${p2.x},${p2.y})}${safeWmText}`
        );
        curMs = nextMs;
        idx++;
      }
    } else {
      const marginPx = Math.max(16, Math.round(vidW * 0.04));
      const { x, y, assAlign } = resolveBrandGridCoords(
        activeEdit.watermarkText.pos || 'tr',
        vidW,
        vidH,
        0,
        0,
        marginPx
      );
      lines.push(
        `Dialogue: 1,0:00:00.00,${msToAssTime(maxDurMs)},Watermark,,0,0,0,,{\\an${assAlign}\\pos(${x},${y})}${safeWmText}`
      );
    }
  }

  fs.writeFileSync(assFilePath, lines.join('\n'), 'utf8');
  return fs.existsSync(assFilePath);
}

/**
 * Builds an FFmpeg complex filter graph fragment for video that applies:
 * 1) Mirror flip (`hflip`) if enabled
 * 2) Framing & Aspect Ratio (`Pad blur bg` with fast 1/4-res blur OR `Crop fill` top/center/bottom + `Frame Zoom`)
 * 3) Anti-Copyright Visual Effects (`Slight crop`, `Dynamic zoom`, `Color shift`, `Film grain`)
 * 4) Optional Full-Width Original Subtitle Cover Band (`boxblur` strip)
 * 5) User's draggable Blur watermark boxes (`boxblur` over exact x, y, width, height %)
 * 6) Optional Circular Brand Logo image overlay (`[2:v]`)
 * 7) Burned-in Subtitles + Channel Watermark Text (`ass` filter)
 */
function buildVideoBurnFilterGraph(
  vidW: number,
  vidH: number,
  needsDownscale: boolean,
  mirrorFlip: boolean,
  blurEnabled: boolean,
  blurRegions: BlurRegion[] | undefined,
  assFilePath: string | null,
  aspectLayout?: AspectCanvasLayout,
  editConfig?: DeepRecapEditConfig,
  hasBrandLogoInput = false,
  effects?: Partial<AntiCopyrightEffects>
): { filterSteps: string[]; finalVideoLabel: string; hasVisualEdits: boolean } {
  const filterSteps: string[] = [];
  let currentLabel = '[0:v]';
  let stepIdx = 0;

  if (mirrorFlip) {
    const nextLabel = `[vflip${stepIdx++}]`;
    filterSteps.push(`${currentLabel}hflip${nextLabel}`);
    currentLabel = nextLabel;
  }

  // Edge trim from Slight crop (~5.2%) and/or Dynamic zoom (~6.5%)
  const slightCropRatio = effects?.crop ? 0.948 : 1.0;
  const dynamicZoomRatio = effects?.zoom ? 0.935 : 1.0;
  const combinedEdgeKeep = Number((slightCropRatio * dynamicZoomRatio).toFixed(4));
  const combinedEdgeOffset = Number(((1 - combinedEdgeKeep) / 2).toFixed(4));
  const edgeCropExpr =
    combinedEdgeKeep < 0.995
      ? `crop=trunc(iw*${combinedEdgeKeep}/2)*2:trunc(ih*${combinedEdgeKeep}/2)*2:trunc(iw*${combinedEdgeOffset}/2)*2:trunc(ih*${combinedEdgeOffset}/2)*2,`
      : '';

  if (aspectLayout?.needsAspectBlurPad) {
    const bgInLbl = `[vabg_in${stepIdx}]`;
    const fgInLbl = `[vafg_in${stepIdx}]`;
    const bgOutLbl = `[vabg${stepIdx}]`;
    const fgOutLbl = `[vafg${stepIdx}]`;
    const aspectOutLbl = `[vaspect${stepIdx}]`;
    stepIdx++;

    // Fast 1/4-resolution blur for the backdrop (16x faster than full-HD boxblur with identical frosted look)
    const bgSmallW = Math.max(64, Math.round(aspectLayout.outW / 4 / 2) * 2);
    const bgSmallH = Math.max(64, Math.round(aspectLayout.outH / 4 / 2) * 2);

    filterSteps.push(`${currentLabel}split=2${bgInLbl}${fgInLbl}`);
    filterSteps.push(
      `${bgInLbl}scale=${bgSmallW}:${bgSmallH}:force_original_aspect_ratio=increase,crop=${bgSmallW}:${bgSmallH},boxblur=6:2,scale=${aspectLayout.outW}:${aspectLayout.outH}:flags=bilinear,setsar=1,eq=brightness=-0.12:saturation=1.08${bgOutLbl}`
    );
    const fgCropPrefix = aspectLayout.needsCropFill
      ? `crop=${aspectLayout.srcCropW}:${aspectLayout.srcCropH}:${aspectLayout.srcCropX}:${aspectLayout.srcCropY},`
      : '';
    filterSteps.push(
      `${fgInLbl}${fgCropPrefix}${edgeCropExpr}scale=${aspectLayout.fgW}:${aspectLayout.fgH},setsar=1${fgOutLbl}`
    );
    filterSteps.push(
      `${bgOutLbl}${fgOutLbl}overlay=${aspectLayout.fgX}:${aspectLayout.fgY}:shortest=1${aspectOutLbl}`
    );
    currentLabel = aspectOutLbl;
  } else if (aspectLayout?.needsCropFill) {
    const nextLabel = `[vcropfill${stepIdx++}]`;
    filterSteps.push(
      `${currentLabel}crop=${aspectLayout.srcCropW}:${aspectLayout.srcCropH}:${aspectLayout.srcCropX}:${aspectLayout.srcCropY},${edgeCropExpr}scale=${aspectLayout.outW}:${aspectLayout.outH},setsar=1${nextLabel}`
    );
    currentLabel = nextLabel;
  } else if (needsDownscale || edgeCropExpr) {
    const nextLabel = `[vscale${stepIdx++}]`;
    filterSteps.push(`${currentLabel}${edgeCropExpr}scale=${vidW}:${vidH},setsar=1${nextLabel}`);
    currentLabel = nextLabel;
  }

  // Anti-Copyright Color Shift & Film Grain
  if (effects?.colorShift || effects?.grain) {
    const fxParts: string[] = [];
    if (effects?.colorShift) {
      fxParts.push('hue=h=18:s=1.25,eq=contrast=1.06:brightness=0.015');
    }
    if (effects?.grain) {
      fxParts.push('noise=alls=5:allf=t');
    }
    if (fxParts.length > 0) {
      const nextLabel = `[vfx${stepIdx++}]`;
      filterSteps.push(`${currentLabel}${fxParts.join(',')}${nextLabel}`);
      currentLabel = nextLabel;
    }
  }

  // Full-Width Original Subtitle Cover Band
  if (editConfig?.coverSubtitleBand?.enabled) {
    const bandPct = Math.max(3, Math.min(50, editConfig.coverSubtitleBand.heightPct || 14));
    const bottomPct = Math.max(0, Math.min(60, editConfig.coverSubtitleBand.bottomPct ?? 6));
    const strength = Math.max(1, Math.min(40, editConfig.coverSubtitleBand.blurStrength || 20));
    const bw = Math.max(16, vidW - (vidW % 2));
    let bh = Math.max(16, Math.min(vidH, Math.round((bandPct / 100) * vidH)));
    bh = Math.max(16, bh - (bh % 2));
    const bottomPx = Math.round((bottomPct / 100) * vidH);
    let by = Math.max(0, Math.min(vidH - bh, vidH - bottomPx - bh));
    by = by - (by % 2);

    const maxR = Math.max(2, Math.min(22, Math.floor(Math.min(bw, bh) / 4) - 1));
    const lumaR = Math.max(2, Math.min(maxR, Math.round(strength / 1.4)));
    const chromaR = Math.max(1, Math.min(Math.floor(maxR / 2), lumaR));

    const bBase = `[vcband_base${stepIdx}]`;
    const bCrop = `[vcband_crop${stepIdx}]`;
    const bBlur = `[vcband_blur${stepIdx}]`;
    const bOut = `[vcband_out${stepIdx}]`;
    stepIdx++;

    filterSteps.push(`${currentLabel}split=2${bBase}${bCrop}`);
    filterSteps.push(
      `${bCrop}crop=${bw}:${bh}:0:${by},boxblur=${lumaR}:2:${chromaR}:1${bBlur}`
    );
    filterSteps.push(`${bBase}${bBlur}overlay=0:${by}:shortest=1${bOut}`);
    currentLabel = bOut;
  }

  const validBlurs =
    blurEnabled && Array.isArray(blurRegions)
      ? blurRegions.filter((r) => r && r.width > 1 && r.height > 1)
      : [];

  for (let i = 0; i < validBlurs.length; i++) {
    const r = validBlurs[i];
    let bx = Math.max(0, Math.min(vidW - 16, Math.round(((r.x || 0) / 100) * vidW)));
    let by = Math.max(0, Math.min(vidH - 16, Math.round(((r.y || 0) / 100) * vidH)));
    let bw = Math.max(16, Math.min(vidW - bx, Math.round(((r.width || 20) / 100) * vidW)));
    let bh = Math.max(16, Math.min(vidH - by, Math.round(((r.height || 10) / 100) * vidH)));
    // Ensure even dimensions for YUV420p boxblur
    bx = bx - (bx % 2);
    by = by - (by % 2);
    bw = Math.max(16, bw - (bw % 2));
    bh = Math.max(16, bh - (bh % 2));
    if (bx + bw > vidW) bw = Math.max(16, vidW - bx - ((vidW - bx) % 2));
    if (by + bh > vidH) bh = Math.max(16, vidH - by - ((vidH - by) % 2));

    const maxRadius = Math.max(2, Math.min(22, Math.floor(Math.min(bw, bh) / 4) - 1));
    const lumaRadius = Math.max(2, Math.min(maxRadius, Math.round((r.blurStrength ?? 24) / 1.5)));
    const chromaRadius = Math.max(1, Math.min(Math.floor(maxRadius / 2), lumaRadius));

    const baseLbl = `[vbase_${i}]`;
    const cropInLbl = `[vcropin_${i}]`;
    const blurredLbl = `[vblurred_${i}]`;
    const outLbl = `[vovr_${i}]`;

    filterSteps.push(`${currentLabel}split=2${baseLbl}${cropInLbl}`);
    filterSteps.push(
      `${cropInLbl}crop=${bw}:${bh}:${bx}:${by},boxblur=${lumaRadius}:2:${chromaRadius}:1${blurredLbl}`
    );
    filterSteps.push(`${baseLbl}${blurredLbl}overlay=${bx}:${by}:shortest=1${outLbl}`);
    currentLabel = outLbl;
  }

  // Circular Brand Logo Overlay (input [2:v])
  if (hasBrandLogoInput && editConfig?.brandLogo?.enabled) {
    const rawLogoSize = Math.round((editConfig.brandLogo.sizePx || 52) * (vidW / 540));
    const logoSize = Math.max(24, Math.min(Math.round(vidW * 0.25), rawLogoSize - (rawLogoSize % 2)));
    const opacityFloat = Math.max(0.1, Math.min(1.0, (editConfig.brandLogo.opacity ?? 90) / 100)).toFixed(2);
    const marginPx = Math.max(12, Math.round(vidW * 0.035));
    const { x, y } = resolveBrandGridCoords(
      editConfig.brandLogo.pos || 'tl',
      vidW,
      vidH,
      logoSize,
      logoSize,
      marginPx
    );
    const logoRgbaLbl = `[vlogo_rgba${stepIdx}]`;
    const logoOutLbl = `[vlogo_out${stepIdx}]`;
    stepIdx++;
    filterSteps.push(
      `[2:v]scale=${logoSize}:${logoSize},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-W/2,Y-H/2),min(W,H)/2),alpha(X,Y)*${opacityFloat},0)'${logoRgbaLbl}`
    );
    filterSteps.push(`${currentLabel}${logoRgbaLbl}overlay=${x}:${y}:repeatlast=1:shortest=0${logoOutLbl}`);
    currentLabel = logoOutLbl;
  }

  if (assFilePath && fs.existsSync(assFilePath)) {
    const escapedAss = assFilePath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const fontsDirOpt = fs.existsSync(FONTS_DIR)
      ? `:fontsdir='${FONTS_DIR.replace(/\\/g, '/').replace(/:/g, '\\:')}'`
      : '';
    const nextLabel = `[vass${stepIdx++}]`;
    filterSteps.push(`${currentLabel}scale=trunc(iw/2)*2:trunc(ih/2)*2,ass='${escapedAss}'${fontsDirOpt}${nextLabel}`);
    currentLabel = nextLabel;
  }

  const hasVisualEdits = filterSteps.length > 0;
  return {
    filterSteps,
    finalVideoLabel: currentLabel,
    hasVisualEdits
  };
}

/**
 * Replaces the original foreign speech audio track with the AI Burmese Voiceover WAV
 * AND burns in user-configured Blur Watermark boxes + Burmese Subtitles + Anti-Copyright Effects into a single downloadable MP4!
 */
async function muxVideoWithMixedAudio(
  inputVideoPath: string,
  voiceoverWavPath: string | null,
  outputVideoPath: string,
  mirrorFlip = false,
  keepOriginalAudio = false,
  cues?: SubtitleCue[],
  subtitleConfig?: SubtitleOverlayConfig,
  blurEnabled = false,
  blurRegions?: BlurRegion[],
  jobId = 'mux',
  aspectRatio: AspectRatioMode = 'original',
  editConfig?: DeepRecapEditConfig,
  captionsOnly = false,
  effects?: Partial<AntiCopyrightEffects>,
  fallbackDurationSec?: number
): Promise<boolean> {
  const assPath = path.join(JOBS_TEMP_DIR, `${jobId}_burn.ass`);
  const logoPath = writeTempBrandLogoFile(editConfig, jobId);
  const cleanupTemps = () => {
    try {
      if (fs.existsSync(assPath)) fs.unlinkSync(assPath);
    } catch {}
    try {
      if (logoPath && fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
    } catch {}
  };

  try {
    const {
      width: rawW,
      height: rawH,
      durationSec: vidDur,
      hasAudio: inputHasAudio
    } = await probeVideoDimensions(inputVideoPath);
    const effectiveDur = resolveEffectiveVideoDurationSec(vidDur, fallbackDurationSec, cues);
    const safeDur = Math.max(3, Math.min(10800, Number(effectiveDur.toFixed(2))));

    const isOutputHD = Boolean(effects?.outputHD);
    const maxShortEdge = isOutputHD ? 1080 : 720;

    const aspectLayout = computeAspectCanvasLayout(rawW, rawH, aspectRatio, {
      ...editConfig,
      outputHD: isOutputHD
    });
    const wantsAspectTransform = aspectLayout.needsAspectBlurPad || aspectLayout.needsCropFill;
    const wantsSubtitles = Boolean(cues && cues.length > 0 && subtitleConfig?.enabled !== false);
    const wantsWatermarkText = Boolean(
      editConfig?.watermarkText?.enabled && editConfig.watermarkText.text.trim().length > 0
    );
    const wantsCoverBand = Boolean(editConfig?.coverSubtitleBand?.enabled);
    const wantsBrandLogo = Boolean(logoPath && editConfig?.brandLogo?.enabled);
    const wantsBlurs = Boolean(
      blurEnabled && Array.isArray(blurRegions) && blurRegions.some((r) => r && r.width > 1 && r.height > 1)
    );
    const wantsEffectFilters = Boolean(
      effects?.colorShift || effects?.crop || effects?.zoom || effects?.grain
    );
    const willReencodeVideo =
      mirrorFlip ||
      wantsSubtitles ||
      wantsWatermarkText ||
      wantsCoverBand ||
      wantsBrandLogo ||
      wantsBlurs ||
      wantsAspectTransform ||
      wantsEffectFilters;

    let vidW = rawW;
    let vidH = rawH;
    let needsDownscale = false;
    if (wantsAspectTransform || aspectRatio !== 'original') {
      vidW = aspectLayout.outW;
      vidH = aspectLayout.outH;
    } else if (willReencodeVideo && Math.min(rawW, rawH) > maxShortEdge) {
      const scaleRatio = maxShortEdge / Math.min(rawW, rawH);
      vidW = Math.max(64, Math.round((rawW * scaleRatio) / 2) * 2);
      vidH = Math.max(64, Math.round((rawH * scaleRatio) / 2) * 2);
      needsDownscale = true;
    }
    vidW = Math.max(64, vidW - (vidW % 2));
    vidH = Math.max(64, vidH - (vidH % 2));

    const hasAss =
      wantsSubtitles || wantsWatermarkText
        ? writeAssSubtitleFile(assPath, cues || [], subtitleConfig, vidW, vidH, editConfig, safeDur)
        : false;

    const { filterSteps, finalVideoLabel, hasVisualEdits } = buildVideoBurnFilterGraph(
      vidW,
      vidH,
      needsDownscale,
      mirrorFlip,
      blurEnabled,
      blurRegions,
      hasAss ? assPath : null,
      aspectLayout,
      editConfig,
      wantsBrandLogo,
      effects
    );

    const hasVoiceFile = Boolean(voiceoverWavPath && fs.existsSync(voiceoverWavPath));
    const audioInputArgs = hasVoiceFile
      ? ['-i', voiceoverWavPath!]
      : ['-f', 'lavfi', '-t', String(safeDur), '-i', 'anullsrc=r=24000:cl=mono'];

    const audioFilterPart = captionsOnly
      ? inputHasAudio
        ? `[0:a]volume=1.0,apad=whole_dur=${safeDur}[aout]`
        : `[1:a]volume=0.0,apad=whole_dur=${safeDur}[aout]`
      : keepOriginalAudio && inputHasAudio
        ? `[0:a]volume=0.08[orig];[1:a]volume=1.60,apad=whole_dur=${safeDur}[tts];[orig][tts]amix=inputs=2:duration=first:dropout_transition=2[aout]`
        : `[1:a]volume=1.65,apad=whole_dur=${safeDur}[aout]`;

    const fullFilterComplex = hasVisualEdits
      ? [...filterSteps, audioFilterPart].join(';')
      : audioFilterPart;

    const mapVideoArg = hasVisualEdits ? finalVideoLabel : '0:v:0';
    const targetMaxBitrateKbps = isOutputHD ? 3200 : 1850;
    const targetCrf = isOutputHD
      ? safeDur > 300
        ? '23'
        : '22'
      : safeDur > 300
        ? '24'
        : '23';

    const videoCodecArgs = hasVisualEdits
      ? [
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-threads',
          '2',
          '-g',
          '30',
          '-keyint_min',
          '15',
          '-crf',
          targetCrf,
          '-maxrate',
          `${targetMaxBitrateKbps}k`,
          '-bufsize',
          `${targetMaxBitrateKbps * 2}k`,
          '-pix_fmt',
          'yuv420p'
        ]
      : ['-c:v', 'copy'];

    const extraLogoInputArgs = wantsBrandLogo && logoPath ? ['-i', logoPath] : [];

    try {
      await execFileAsync('ffmpeg', [
        '-y',
        '-i',
        inputVideoPath,
        ...audioInputArgs,
        ...extraLogoInputArgs,
        '-filter_complex',
        fullFilterComplex,
        '-map',
        mapVideoArg,
        '-map',
        '[aout]',
        '-t',
        String(safeDur),
        ...videoCodecArgs,
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
        outputVideoPath
      ]);
      cleanupTemps();
      if (fs.existsSync(outputVideoPath) && fs.statSync(outputVideoPath).size > 1000) {
        return true;
      }
    } catch (innerErr) {
      console.warn('[FFmpeg Burn Mux] Complex filter error:', innerErr);
    }

    // Safe subtitle-only burn retry so subtitles are NEVER silently dropped
    if (hasAss && fs.existsSync(assPath)) {
      try {
        const escapedAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
        const fontsDirOpt = fs.existsSync(FONTS_DIR)
          ? `:fontsdir='${FONTS_DIR.replace(/\\/g, '/').replace(/:/g, '\\:')}'`
          : '';
        await execFileAsync('ffmpeg', [
          '-y',
          '-i',
          inputVideoPath,
          ...audioInputArgs,
          '-filter_complex',
          `[0:v]scale=trunc(iw/2)*2:trunc(ih/2)*2,ass='${escapedAss}'${fontsDirOpt}[vass_safe];${audioFilterPart}`,
          '-map',
          '[vass_safe]',
          '-map',
          '[aout]',
          '-t',
          String(safeDur),
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-threads',
          '2',
          '-g',
          '30',
          '-keyint_min',
          '15',
          '-crf',
          targetCrf,
          '-maxrate',
          `${targetMaxBitrateKbps}k`,
          '-bufsize',
          `${targetMaxBitrateKbps * 2}k`,
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-movflags',
          '+faststart',
          outputVideoPath
        ]);
        cleanupTemps();
        if (fs.existsSync(outputVideoPath) && fs.statSync(outputVideoPath).size > 1000) {
          return true;
        }
      } catch (safeBurnErr) {
        console.warn('[FFmpeg Safe Burn] ASS burn retry failed:', safeBurnErr);
      }
      cleanupTemps();
      return false;
    }

    // Simple copy mux ONLY when no subtitles/overlays were requested
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      inputVideoPath,
      ...audioInputArgs,
      '-filter_complex',
      audioFilterPart,
      '-map',
      '0:v:0',
      '-map',
      '[aout]',
      '-t',
      String(safeDur),
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputVideoPath
    ]);
    cleanupTemps();
    return fs.existsSync(outputVideoPath) && fs.statSync(outputVideoPath).size > 1000;
  } catch (err) {
    cleanupTemps();
    console.warn('[FFmpeg Mux] Failed to mux video and audio:', err);
    return false;
  }
}

/**
 * Generates a standalone downloadable MP4 video with burned-in Subtitles, Blur regions, Watermark & AI Voiceover
 * when no local MP4 file was uploaded (e.g., URL or procedural demo clip).
 */
async function generateStandaloneRecapMp4(
  voiceoverWavPath: string,
  outputVideoPath: string,
  durationSec: number,
  cues?: SubtitleCue[],
  subtitleConfig?: SubtitleOverlayConfig,
  blurEnabled = false,
  blurRegions?: BlurRegion[],
  mirrorFlip = false,
  jobId = 'standalone',
  aspectRatio: AspectRatioMode = 'original',
  editConfig?: DeepRecapEditConfig,
  effects?: Partial<AntiCopyrightEffects>
): Promise<boolean> {
  const assPath = path.join(JOBS_TEMP_DIR, `${jobId}_standalone.ass`);
  const logoPath = writeTempBrandLogoFile(editConfig, `${jobId}_st`);
  const cleanupTemps = () => {
    try {
      if (fs.existsSync(assPath)) fs.unlinkSync(assPath);
    } catch {}
    try {
      if (logoPath && fs.existsSync(logoPath)) fs.unlinkSync(logoPath);
    } catch {}
  };

  try {
    const safeDur = Math.max(4, Math.min(10800, Math.round(durationSec || 15)));
    const isOutputHD = Boolean(effects?.outputHD);
    const vidW =
      aspectRatio === '16:9'
        ? isOutputHD
          ? 1920
          : 1280
        : isOutputHD
          ? 1080
          : 720;
    const vidH =
      aspectRatio === '16:9' || aspectRatio === '1:1'
        ? isOutputHD
          ? 1080
          : 720
        : aspectRatio === '4:5'
          ? isOutputHD
            ? 1350
            : 900
          : isOutputHD
            ? 1920
            : 1280;
    const wantsSubtitles = Boolean(cues && cues.length > 0 && subtitleConfig?.enabled !== false);
    const wantsWatermarkText = Boolean(
      editConfig?.watermarkText?.enabled && editConfig.watermarkText.text.trim().length > 0
    );
    const wantsBrandLogo = Boolean(logoPath && editConfig?.brandLogo?.enabled);

    const hasAss =
      wantsSubtitles || wantsWatermarkText
        ? writeAssSubtitleFile(assPath, cues || [], subtitleConfig, vidW, vidH, editConfig, safeDur)
        : false;

    const { filterSteps, finalVideoLabel, hasVisualEdits } = buildVideoBurnFilterGraph(
      vidW,
      vidH,
      false,
      mirrorFlip,
      blurEnabled,
      blurRegions,
      hasAss ? assPath : null,
      undefined,
      editConfig,
      wantsBrandLogo,
      effects
    );

    const audioFilterPart = `[1:a]volume=1.60,apad=whole_dur=${safeDur}[aout]`;
    const fullFilterComplex = hasVisualEdits
      ? [...filterSteps, audioFilterPart].join(';')
      : audioFilterPart;
    const mapVideoArg = hasVisualEdits ? finalVideoLabel : '0:v:0';
    const extraLogoInputArgs = wantsBrandLogo && logoPath ? ['-i', logoPath] : [];

    const fps = safeDur > 150 ? 12 : 24;
    await execFileAsync('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=#111827:s=${vidW}x${vidH}:r=${fps}:d=${safeDur}`,
      '-i',
      voiceoverWavPath,
      ...extraLogoInputArgs,
      '-filter_complex',
      fullFilterComplex,
      '-map',
      mapVideoArg,
      '-map',
      '[aout]',
      '-t',
      String(safeDur),
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-threads',
      '2',
      '-g',
      '30',
      '-keyint_min',
      '15',
      '-crf',
      isOutputHD ? '19' : '21',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputVideoPath
    ]);
    cleanupTemps();
    return fs.existsSync(outputVideoPath) && fs.statSync(outputVideoPath).size > 1000;
  } catch (err) {
    cleanupTemps();
    console.warn('[FFmpeg Standalone MP4] Failed:', err);
    return false;
  }
}

/**
 * Converts a WAV voiceover file into a 192kbps MP3 file for standalone audio download (CapCut ready)
 */
async function convertWavToMp3(wavPath: string, mp3Path: string): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      wavPath,
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '192k',
      mp3Path
    ]);
    return fs.existsSync(mp3Path) && fs.statSync(mp3Path).size > 400;
  } catch (err) {
    console.warn('[FFmpeg MP3] Failed to convert WAV to MP3:', err);
    return false;
  }
}

// ============================================================================
// OWNER MULTI-API KEY POOL (Code + Env + Telegram Bot Only — Hidden From Web UI)
// - Credit Mode users NEVER enter API keys — requests automatically rotate across
//   Owner Gemini & Groq keys on the server.
// - When a key hits rate/quota limit, it rests for 24 HOURS, immediately sends a
//   Telegram alert to Admin, switches to the next healthy key, and auto-restores
//   after 24 hours.
// ============================================================================
const OWNER_GEMINI_API_KEYS: string[] = [
  // Add Gemini API keys directly here if desired, or add via Telegram Bot: /addgemini <keys>
];

const OWNER_GROQ_API_KEYS: string[] = [
  // Add Groq API keys directly here if desired, or add via Telegram Bot: /addgroq <keys>
];

const OWNER_TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || '8931773634:AAH2f3iOB5rDU3CgTH2nQ3guS1HyqJZXYjM';
const OWNER_TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '1981253384';

const API_KEY_POOL_FILE = path.join(JOBS_TEMP_DIR, 'admin_api_key_pool.json');

interface StoredApiKeyPoolState {
  keys: AdminApiKeyRecord[];
  geminiCursor: number;
  groqCursor: number;
  totalFailovers: number;
}

function getEnvSeedKeys(): AdminApiKeyRecord[] {
  const seeds: AdminApiKeyRecord[] = [];
  const rawGeminiEnv = [
    ...OWNER_GEMINI_API_KEYS,
    process.env.GEMINI_API_KEY || '',
    ...(process.env.GEMINI_API_KEYS || '').split(/[\r\n,;\s]+/)
  ]
    .map((s) => s.trim())
    .filter((s) => s.length >= 12 && s !== 'MY_GEMINI_API_KEY');

  const seenGem = new Set<string>();
  rawGeminiEnv.forEach((keyVal, idx) => {
    if (seenGem.has(keyVal)) return;
    seenGem.add(keyVal);
    seeds.push({
      id: idx === 0 ? 'env_gemini_1' : `env_gemini_${idx + 1}`,
      provider: 'gemini',
      label: idx === 0 ? 'Gemini Key #1' : `Gemini Key #${idx + 1}`,
      apiKey: keyVal,
      maskedKey: maskApiKeyString(keyVal),
      enabled: true,
      status: 'healthy',
      cooldownUntil: 0,
      usageCount: 0,
      dailyUsageCount: 0,
      dailyDateKey: getPoolDateKey(),
      failoverCount: 0,
      addedAt: Date.now(),
      isEnvDefault: true
    });
  });

  const rawGroqEnv = [
    ...OWNER_GROQ_API_KEYS,
    process.env.GROQ_API_KEY || '',
    ...(process.env.GROQ_API_KEYS || '').split(/[\r\n,;\s]+/)
  ]
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);

  const seenGroq = new Set<string>();
  rawGroqEnv.forEach((keyVal, idx) => {
    if (seenGroq.has(keyVal)) return;
    seenGroq.add(keyVal);
    seeds.push({
      id: idx === 0 ? 'env_groq_1' : `env_groq_${idx + 1}`,
      provider: 'groq',
      label: idx === 0 ? 'Groq Key #1' : `Groq Key #${idx + 1}`,
      apiKey: keyVal,
      maskedKey: maskApiKeyString(keyVal),
      enabled: true,
      status: 'healthy',
      cooldownUntil: 0,
      usageCount: 0,
      dailyUsageCount: 0,
      dailyDateKey: getPoolDateKey(),
      failoverCount: 0,
      addedAt: Date.now(),
      isEnvDefault: true
    });
  });

  return seeds;
}

function loadApiKeyPoolState(): StoredApiKeyPoolState {
  let state: StoredApiKeyPoolState = {
    keys: [],
    geminiCursor: 0,
    groqCursor: 0,
    totalFailovers: 0
  };
  try {
    if (fs.existsSync(API_KEY_POOL_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(API_KEY_POOL_FILE, 'utf-8'));
      if (parsed && Array.isArray(parsed.keys)) {
        state = {
          keys: parsed.keys,
          geminiCursor: Number(parsed.geminiCursor) || 0,
          groqCursor: Number(parsed.groqCursor) || 0,
          totalFailovers: Number(parsed.totalFailovers) || 0
        };
      }
    }
  } catch (e) {
    console.warn('Error loading API key pool state:', e);
  }

  // Merge code/env seed keys if not already present, and auto-restore keys whose 24h rest ended
  const now = Date.now();
  const seeds = getEnvSeedKeys();
  let changed = false;
  for (const seed of seeds) {
    if (!state.keys.some((k) => k.apiKey === seed.apiKey && k.provider === seed.provider)) {
      state.keys.unshift(seed);
      changed = true;
    }
  }
  state.keys = state.keys.map((k) => {
    if (k.status === 'cooldown' && k.cooldownUntil <= now) {
      changed = true;
      return { ...k, status: 'healthy' as const, cooldownUntil: 0, lastError: undefined };
    }
    return k;
  });

  if (changed && state.keys.length > 0) {
    saveApiKeyPoolState(state);
  }
  return state;
}

function saveApiKeyPoolState(state: StoredApiKeyPoolState) {
  try {
    fs.writeFileSync(API_KEY_POOL_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Error saving API key pool state:', e);
  }
}

async function notifyTelegramKeyLimitAndSwitch(
  failedKey: AdminApiKeyRecord,
  nextKey: AdminApiKeyRecord | null,
  reason: string,
  cooldownUntil: number
) {
  try {
    const providerTitle = failedKey.provider === 'gemini' ? 'Gemini API Key' : 'Groq API Key';
    const todayKey = getPoolDateKey();
    const todayUsed = failedKey.dailyDateKey === todayKey ? failedKey.dailyUsageCount || 0 : 0;
    const resumeTime = new Date(cooldownUntil).toLocaleString('en-GB', {
      timeZone: 'Asia/Yangon'
    });

    const lines = [
      `⚠️ [API KEY LIMIT ALERT · 24H REST]`,
      `━━━━━━━━━━━━━━━━━━━`,
      `🔑 ${providerTitle}: ${failedKey.label} (${failedKey.maskedKey})`,
      `❗ အကြောင်းအရင်း: ${reason}`,
      `📊 သုံးစွဲထားမှု: စုစုပေါင်း ${failedKey.usageCount || 0}x | ယနေ့ ${todayUsed}x | Limit ဖြစ်မှု ${failedKey.failoverCount || 1}x`,
      `⏳ 24 Hours (24 နာရီ) ပေးနားထားပါပြီ`,
      `🕒 Auto ပြန်ဖွင့်မည့်အချိန်: ${resumeTime}`,
      `━━━━━━━━━━━━━━━━━━━`,
      nextKey
        ? `🔄 နောက် Key (${nextKey.label} · ${nextKey.maskedKey}) သို့ အလိုအလျောက် ပြောင်းလဲသုံးစွဲနေပါပြီ!`
        : `🚨 လောလောဆယ် Healthy Key မကျန်တော့ပါ! Telegram Bot မှ /addgemini သို့မဟုတ် /addgroq ဖြင့် Key အသစ် ထည့်သွင်းပါ။`
    ];

    await fetch(`https://api.telegram.org/bot${OWNER_TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: OWNER_TELEGRAM_ADMIN_CHAT_ID,
        text: lines.join('\n'),
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔑 API Keys & Limit စစ်မည်', callback_data: 'cmd_keys' },
              { text: '🔓 24h Rest အားလုံး ဖွင့်မည်', callback_data: 'cmd_keys_reset_all' }
            ]
          ]
        }
      })
    });
  } catch (e) {
    console.warn('notifyTelegramKeyLimitAndSwitch error:', e);
  }
}

async function executeWithGeminiKeyPool<T>(
  runner: (ai: GoogleGenAI, keyRec: AdminApiKeyRecord) => Promise<T>
): Promise<{ result: T; keyRec: AdminApiKeyRecord } | null> {
  const initialState = loadApiKeyPoolState();
  const enabledCount = initialState.keys.filter(
    (k) => k.provider === 'gemini' && k.enabled && k.apiKey.trim().length > 0
  ).length;
  if (enabledCount === 0) return null;

  const maxAttempts = Math.min(Math.max(1, enabledCount), 12);
  const triedIds = new Set<string>();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const state = loadApiKeyPoolState();
    const { selected, nextCursor, updatedKeys } = selectNextHealthyPoolKey(
      state.keys,
      'gemini',
      state.geminiCursor
    );
    state.keys = updatedKeys;
    if (!selected || triedIds.has(selected.id)) {
      break;
    }
    triedIds.add(selected.id);
    state.geminiCursor = nextCursor;
    saveApiKeyPoolState(state);

    const ai = new GoogleGenAI({
      apiKey: selected.apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    try {
      const result = await runner(ai, selected);
      const latest = loadApiKeyPoolState();
      latest.keys = latest.keys.map((k) =>
        k.id === selected.id ? recordPoolKeyOutcome(k, { ok: true }) : k
      );
      saveApiKeyPoolState(latest);
      return { result, keyRec: selected };
    } catch (err) {
      const errInfo = isApiKeyQuotaOrLimitError(err);
      const latest = loadApiKeyPoolState();
      const nowMs = Date.now();
      let updatedFailedKey: AdminApiKeyRecord = selected;
      latest.keys = latest.keys.map((k) => {
        if (k.id === selected.id) {
          updatedFailedKey = recordPoolKeyOutcome(k, { ok: false, error: err, nowMs });
          return updatedFailedKey;
        }
        return k;
      });
      if (errInfo.shouldRotate) {
        latest.totalFailovers = (latest.totalFailovers || 0) + 1;
        saveApiKeyPoolState(latest);
        const nextPick = selectNextHealthyPoolKey(
          latest.keys,
          'gemini',
          latest.geminiCursor,
          nowMs
        );
        const nextHealthy =
          nextPick.selected && nextPick.selected.id !== selected.id ? nextPick.selected : null;
        console.info(
          `[Gemini Key Pool] ${selected.label} (${selected.maskedKey}) hit limit (${errInfo.reason}); resting 24h & switching to ${nextHealthy ? nextHealthy.label : 'fallback'}...`
        );
        void notifyTelegramKeyLimitAndSwitch(
          updatedFailedKey,
          nextHealthy,
          errInfo.reason,
          updatedFailedKey.cooldownUntil
        );
        continue;
      }
      saveApiKeyPoolState(latest);
      throw err;
    }
  }
  return null;
}

async function executeWithGroqKeyPool<T>(
  runner: (apiKey: string, keyRec: AdminApiKeyRecord) => Promise<T>
): Promise<{ result: T; keyRec: AdminApiKeyRecord } | null> {
  const initialState = loadApiKeyPoolState();
  const enabledCount = initialState.keys.filter(
    (k) => k.provider === 'groq' && k.enabled && k.apiKey.trim().length > 0
  ).length;
  if (enabledCount === 0) return null;

  const maxAttempts = Math.min(Math.max(1, enabledCount), 12);
  const triedIds = new Set<string>();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const state = loadApiKeyPoolState();
    const { selected, nextCursor, updatedKeys } = selectNextHealthyPoolKey(
      state.keys,
      'groq',
      state.groqCursor
    );
    state.keys = updatedKeys;
    if (!selected || triedIds.has(selected.id)) {
      break;
    }
    triedIds.add(selected.id);
    state.groqCursor = nextCursor;
    saveApiKeyPoolState(state);

    try {
      const result = await runner(selected.apiKey, selected);
      const latest = loadApiKeyPoolState();
      latest.keys = latest.keys.map((k) =>
        k.id === selected.id ? recordPoolKeyOutcome(k, { ok: true }) : k
      );
      saveApiKeyPoolState(latest);
      return { result, keyRec: selected };
    } catch (err) {
      const errInfo = isApiKeyQuotaOrLimitError(err);
      const latest = loadApiKeyPoolState();
      const nowMs = Date.now();
      let updatedFailedKey: AdminApiKeyRecord = selected;
      latest.keys = latest.keys.map((k) => {
        if (k.id === selected.id) {
          updatedFailedKey = recordPoolKeyOutcome(k, { ok: false, error: err, nowMs });
          return updatedFailedKey;
        }
        return k;
      });
      if (errInfo.shouldRotate) {
        latest.totalFailovers = (latest.totalFailovers || 0) + 1;
        saveApiKeyPoolState(latest);
        const nextPick = selectNextHealthyPoolKey(
          latest.keys,
          'groq',
          latest.groqCursor,
          nowMs
        );
        const nextHealthy =
          nextPick.selected && nextPick.selected.id !== selected.id ? nextPick.selected : null;
        console.info(
          `[Groq Key Pool] ${selected.label} (${selected.maskedKey}) hit limit (${errInfo.reason}); resting 24h & switching to ${nextHealthy ? nextHealthy.label : 'fallback'}...`
        );
        void notifyTelegramKeyLimitAndSwitch(
          updatedFailedKey,
          nextHealthy,
          errInfo.reason,
          updatedFailedKey.cooldownUntil
        );
        continue;
      }
      saveApiKeyPoolState(latest);
      throw err;
    }
  }
  return null;
}

async function transcribeWithDirectGroqKey(
  audioBuffer: Buffer,
  apiKey: string,
  sttModel: SttEngineId = 'whisper-large-v3-turbo'
): Promise<string> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' });
  form.append('file', blob, 'audio.mp3');
  form.append('model', sttModel === 'whisper-large-v3' ? 'whisper-large-v3' : 'whisper-large-v3-turbo');
  form.append('response_format', 'verbose_json');
  form.append('temperature', '0');
  form.append('timestamp_granularities[]', 'segment');

  const resp = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: form,
    signal: AbortSignal.timeout(25000)
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Groq STT status: ${resp.status} ${errBody}`);
  }
  const data = (await resp.json()) as {
    text?: string;
    segments?: Array<{ start?: number; end?: number; text?: string }>;
  };
  return formatTimedSttSegments(data?.segments, String(data?.text || '').trim());
}

async function transcribeAudioWithGroqPool(
  audioBuffer: Buffer,
  sttModel: SttEngineId = 'whisper-large-v3-turbo'
): Promise<{ text: string; keyLabel: string } | null> {
  if (!audioBuffer || audioBuffer.length < 200) return null;
  try {
    const res = await executeWithGroqKeyPool(async (apiKey, keyRec) => {
      const text = await transcribeWithDirectGroqKey(audioBuffer, apiKey, sttModel);
      return { text, keyLabel: keyRec.label };
    });
    return res?.result && res.result.text ? res.result : null;
  } catch {
    return null;
  }
}

function loadCloudflareWorkersAiConfig(): { accountId: string; apiToken: string } | null {
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || '').trim();
  const apiToken = (process.env.CLOUDFLARE_WORKERS_AI_TOKEN || '').trim();
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

async function transcribeAudioWithWorkersAi(
  audioBuffer: Buffer,
  sttModel: SttEngineId = 'whisper-large-v3-turbo'
): Promise<string | null> {
  const cfg = loadCloudflareWorkersAiConfig();
  if (!cfg || !audioBuffer || shouldSkipWorkersAiForPayloadSize(audioBuffer.length)) return null;
  const modelId =
    sttModel === 'whisper-large-v3' ? '@cf/openai/whisper' : WORKERS_AI_WHISPER_MODEL;
  try {
    const resp = await fetch(buildWorkersAiRunUrl(cfg.accountId, modelId), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio: audioBuffer.toString('base64'),
        vad_filter: true
      }),
      signal: AbortSignal.timeout(22000)
    });
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      console.warn(`[Workers AI STT] ${modelId} status ${resp.status}:`, errBody.slice(0, 160));
      return null;
    }
    const json = await resp.json();
    const parsedText = parseWorkersAiWhisperTimedResult(json);
    return parsedText || null;
  } catch (err) {
    console.warn('[Workers AI STT] Request failed:', err);
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support uploading video files up to 150MB in base64 JSON payload
  app.use(express.json({ limit: '150mb' }));

  // ============================================================================
  // CLOUDFLARE R2 DIRECT UPLOAD (Presigned PUT + Multipart + Local Stream Fallback)
  // ============================================================================
  app.get('/api/r2/status', (_req, res) => {
    const cfg = loadR2Config();
    res.json({
      configured: Boolean(cfg),
      mode: cfg ? 'r2_direct' : 'local_stream',
      maxUploadBytes: R2_MAX_UPLOAD_BYTES,
      multipartThresholdBytes: R2_MULTIPART_THRESHOLD_BYTES
    });
  });

  async function createSignedR2PutPayload(
    cfg: R2StoredConfig,
    opts: { filename: string; contentType?: string; prefix: R2KeyPrefix }
  ) {
    const ulid = createUploadUlid();
    const resolvedType = getMediaContentType(opts.filename, opts.contentType || 'video/mp4');
    const objectKey = buildR2ObjectKey(opts.filename, opts.prefix, Date.now(), ulid.slice(-8));
    const client = createR2S3Client(cfg);
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: cfg.bucketName,
        Key: objectKey,
        ContentType: resolvedType
      }),
      { expiresIn: 900 }
    );
    return {
      ok: true as const,
      ulid,
      key: objectKey,
      url,
      headers: { 'Content-Type': resolvedType },
      objectKey,
      uploadUrl: url,
      publicUrl: buildPublicR2ObjectUrl(cfg.publicUrl, objectKey)
    };
  }

  // StreamWave-compatible presign route for Recap Studio
  app.post('/api/upload/sign', async (req, res) => {
    try {
      const cfg = loadR2Config();
      if (!cfg) {
        return res.status(400).json({ ok: false, error: 'Cloudflare R2 Direct is not configured yet' });
      }
      const body = (req.body || {}) as {
        filename?: string;
        content_type?: string;
        contentType?: string;
        size?: number;
        sizeBytes?: number;
      };
      const sizeVal = Number(body.size ?? body.sizeBytes ?? 0);
      if (sizeVal > R2_MAX_UPLOAD_BYTES) {
        return res.status(413).json({ ok: false, error: 'File exceeds 2GB maximum upload size' });
      }
      const payload = await createSignedR2PutPayload(cfg, {
        filename: body.filename || 'video.mp4',
        contentType: body.content_type || body.contentType || 'video/mp4',
        prefix: 'uploads'
      });
      res.json(payload);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to generate R2 presigned URL'
      });
    }
  });

  // StreamWave-compatible presign route for Long-Form Movie Recap (video + srt)
  app.post('/api/movie-recap/upload/sign', async (req, res) => {
    try {
      const cfg = loadR2Config();
      if (!cfg) {
        return res.status(400).json({ ok: false, error: 'Cloudflare R2 Direct is not configured yet' });
      }
      const body = (req.body || {}) as {
        filename?: string;
        content_type?: string;
        contentType?: string;
        size?: number;
        sizeBytes?: number;
        upload_type?: 'video' | 'srt';
      };
      const sizeVal = Number(body.size ?? body.sizeBytes ?? 0);
      if (sizeVal > R2_MAX_UPLOAD_BYTES) {
        return res.status(413).json({ ok: false, error: 'File exceeds 2GB maximum upload size' });
      }
      const isSrt = body.upload_type === 'srt' || /\.(srt|vtt)$/i.test(body.filename || '');
      const payload = await createSignedR2PutPayload(cfg, {
        filename: body.filename || (isSrt ? 'subtitles.srt' : 'movie.mp4'),
        contentType:
          body.content_type ||
          body.contentType ||
          (isSrt ? 'application/x-subrip' : 'video/mp4'),
        prefix: isSrt ? 'subtitles' : 'uploads'
      });
      res.json(payload);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to sign movie recap upload'
      });
    }
  });

  app.post('/api/r2/presign-put', async (req, res) => {
    try {
      const cfg = loadR2Config();
      if (!cfg) {
        return res.status(400).json({ ok: false, error: 'Cloudflare R2 Direct is not configured yet' });
      }
      const { filename = 'video.mp4', contentType = 'video/mp4', sizeBytes = 0 } = (req.body || {}) as {
        filename?: string;
        contentType?: string;
        sizeBytes?: number;
      };
      if (Number(sizeBytes) > R2_MAX_UPLOAD_BYTES) {
        return res.status(413).json({ ok: false, error: 'File exceeds 2GB maximum upload size' });
      }
      const payload = await createSignedR2PutPayload(cfg, {
        filename,
        contentType,
        prefix: 'uploads'
      });
      res.json(payload);
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to generate R2 presigned URL'
      });
    }
  });

  app.post('/api/r2/multipart/create', async (req, res) => {
    try {
      const cfg = loadR2Config();
      if (!cfg) {
        return res.status(400).json({ ok: false, error: 'Cloudflare R2 Direct is not configured yet' });
      }
      const { filename = 'movie.mp4', contentType = 'video/mp4', sizeBytes = 0 } = (req.body || {}) as {
        filename?: string;
        contentType?: string;
        sizeBytes?: number;
      };
      if (Number(sizeBytes) > R2_MAX_UPLOAD_BYTES) {
        return res.status(413).json({ ok: false, error: 'File exceeds 2GB maximum upload size' });
      }
      const objectKey = buildR2ObjectKey(filename, 'uploads');
      const plan = computeMultipartPlan(Math.max(1, Number(sizeBytes) || R2_DEFAULT_PART_SIZE_BYTES));
      const client = createR2S3Client(cfg);
      const created = await client.send(
        new CreateMultipartUploadCommand({
          Bucket: cfg.bucketName,
          Key: objectKey,
          ContentType: contentType || 'video/mp4'
        })
      );
      res.json({
        ok: true,
        uploadId: created.UploadId,
        objectKey,
        partSizeBytes: plan.partSizeBytes,
        totalParts: plan.totalParts
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to create R2 multipart upload'
      });
    }
  });

  app.post('/api/r2/multipart/sign-part', async (req, res) => {
    try {
      const cfg = loadR2Config();
      if (!cfg) {
        return res.status(400).json({ ok: false, error: 'Cloudflare R2 Direct is not configured' });
      }
      const { objectKey, uploadId, partNumber } = (req.body || {}) as {
        objectKey?: string;
        uploadId?: string;
        partNumber?: number;
      };
      if (!objectKey || !uploadId || !partNumber || partNumber < 1) {
        return res.status(400).json({ ok: false, error: 'Missing objectKey, uploadId, or partNumber' });
      }
      const client = createR2S3Client(cfg);
      const uploadUrl = await getSignedUrl(
        client,
        new UploadPartCommand({
          Bucket: cfg.bucketName,
          Key: objectKey,
          UploadId: uploadId,
          PartNumber: Number(partNumber)
        }),
        { expiresIn: 1800 }
      );
      res.json({ ok: true, uploadUrl });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to sign multipart part'
      });
    }
  });

  app.post('/api/r2/multipart/complete', async (req, res) => {
    try {
      const cfg = loadR2Config();
      if (!cfg) {
        return res.status(400).json({ ok: false, error: 'Cloudflare R2 Direct is not configured' });
      }
      const { objectKey, uploadId, parts = [] } = (req.body || {}) as {
        objectKey?: string;
        uploadId?: string;
        parts?: Array<{ PartNumber: number; ETag: string }>;
      };
      if (!objectKey || !uploadId || !Array.isArray(parts) || parts.length === 0) {
        return res.status(400).json({ ok: false, error: 'Missing multipart completion payload' });
      }
      const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);
      const client = createR2S3Client(cfg);
      await client.send(
        new CompleteMultipartUploadCommand({
          Bucket: cfg.bucketName,
          Key: objectKey,
          UploadId: uploadId,
          MultipartUpload: { Parts: sortedParts }
        })
      );
      res.json({
        ok: true,
        objectKey,
        publicUrl: buildPublicR2ObjectUrl(cfg.publicUrl, objectKey)
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to complete R2 multipart upload'
      });
    }
  });

  app.post('/api/r2/multipart/abort', async (req, res) => {
    try {
      const cfg = loadR2Config();
      if (!cfg) {
        return res.json({ ok: true });
      }
      const { objectKey, uploadId } = (req.body || {}) as { objectKey?: string; uploadId?: string };
      if (objectKey && uploadId) {
        const client = createR2S3Client(cfg);
        await client.send(
          new AbortMultipartUploadCommand({
            Bucket: cfg.bucketName,
            Key: objectKey,
            UploadId: uploadId
          })
        );
      }
      res.json({ ok: true });
    } catch {
      res.json({ ok: true });
    }
  });

  // Streaming binary local fallback upload (supports 16MB chunked append so >32MB videos never hit Cloud Run's 32MB limit)
  app.post('/api/upload/local-direct', async (req, res) => {
    try {
      const existingId =
        typeof req.query.uploadId === 'string'
          ? req.query.uploadId.replace(/[^a-zA-Z0-9_-]/g, '')
          : '';
      const isAppend = req.query.append === '1' && existingId.length > 0;
      const localUploadId = isAppend
        ? existingId
        : `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const destPath = path.join(JOBS_TEMP_DIR, `${localUploadId}_upload.mp4`);
      const writeStream = fs.createWriteStream(destPath, { flags: isAppend ? 'a' : 'w' });
      await pipeline(req, writeStream);
      const size = fs.existsSync(destPath) ? fs.statSync(destPath).size : 0;
      if (size <= 0) {
        try {
          fs.unlinkSync(destPath);
        } catch {}
        return res.status(400).json({ ok: false, error: 'Empty upload stream' });
      }
      res.json({ ok: true, localUploadId, sizeBytes: size });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Local direct stream failed'
      });
    }
  });

  // Serve generated/muxed recap MP4 videos with inline playback & explicit HTTP 206 Range seeking support
  app.get('/api/recap/video/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(JOBS_TEMP_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(404).json({ ok: false, error: 'Rendered video not found' });
      return;
    }
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      res.status(404).json({ ok: false, error: 'Rendered video not readable' });
      return;
    }
    const fileSize = stat.size;
    const disp = resolveMediaContentDisposition(
      safeName,
      typeof req.query.name === 'string' ? req.query.name : undefined,
      typeof req.query.dl === 'string' ? req.query.dl : undefined,
      '.mp4'
    );
    const fullDispHeader =
      disp.mode === 'attachment'
        ? `${disp.headerValue}; filename*=UTF-8''${encodeURIComponent(disp.safeFilename)}`
        : disp.headerValue;
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', fullDispHeader);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Cache-Control',
      disp.mode === 'attachment' ? 'no-store' : 'private, max-age=3600'
    );

    const range = req.headers.range;
    if (range && fileSize > 0) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(fileSize - 1, parseInt(match[2], 10)) : fileSize - 1;
        if (start >= 0 && start < fileSize && start <= end) {
          const chunkSize = end - start + 1;
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          res.setHeader('Content-Length', String(chunkSize));
          const stream = fs.createReadStream(filePath, { start, end });
          stream.on('error', () => {
            if (!res.headersSent) res.status(500).end();
            else res.destroy();
          });
          stream.pipe(res);
          return;
        }
        res.status(416);
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        res.end();
        return;
      }
    }

    res.setHeader('Content-Length', String(fileSize));
    const fullStream = fs.createReadStream(filePath);
    fullStream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ ok: false, error: 'Failed to stream rendered MP4' });
      } else {
        res.destroy();
      }
    });
    fullStream.pipe(res);
  });

  // StreamWaveAI-compatible video download resolver:
  // Returns a direct R2 presigned attachment URL when R2 is enabled (bypassing proxy/Cloudflare HTML issues),
  // or a verified local `/api/recap/video/...` attachment URL in Free / local VPS mode.
  app.get('/api/recap/:jobId/download/video', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const safeJobId = String(req.params.jobId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!safeJobId) {
        res.status(400).json({ ok: false, error: 'Invalid jobId' });
        return;
      }

      const requestedFile =
        typeof req.query.file === 'string' ? path.basename(req.query.file) : '';
      let targetFilePath: string | null = null;

      if (
        requestedFile &&
        requestedFile.startsWith(`${safeJobId}_`) &&
        requestedFile.endsWith('.mp4')
      ) {
        const candidate = path.join(JOBS_TEMP_DIR, requestedFile);
        if (fs.existsSync(candidate) && fs.statSync(candidate).size > 512) {
          targetFilePath = candidate;
        }
      }

      if (!targetFilePath) {
        const cachedExport = renderedJobExportCache.get(safeJobId);
        if (
          cachedExport &&
          fs.existsSync(cachedExport.outputVideoPath) &&
          fs.statSync(cachedExport.outputVideoPath).size > 512
        ) {
          targetFilePath = cachedExport.outputVideoPath;
        }
      }

      if (!targetFilePath) {
        try {
          const entries = fs
            .readdirSync(JOBS_TEMP_DIR)
            .filter(
              (f) =>
                f.startsWith(`${safeJobId}_`) &&
                (f.includes('_export_') || f.endsWith('_recap.mp4')) &&
                f.endsWith('.mp4')
            )
            .map((f) => {
              const fp = path.join(JOBS_TEMP_DIR, f);
              return { fp, mtimeMs: fs.statSync(fp).mtimeMs, size: fs.statSync(fp).size };
            })
            .filter((x) => x.size > 512)
            .sort((a, b) => b.mtimeMs - a.mtimeMs);
          if (entries.length > 0) {
            targetFilePath = entries[0].fp;
          }
        } catch {}
      }

      if (!targetFilePath || !fs.existsSync(targetFilePath)) {
        res.status(404).json({ ok: false, error: 'Rendered video file not found' });
        return;
      }

      const stat = fs.statSync(targetFilePath);
      const localFilename = path.basename(targetFilePath);
      const safeDownloadName = sanitizeMp4DownloadName(
        typeof req.query.name === 'string' ? req.query.name : localFilename,
        `${safeJobId}_recap`
      );
      const isFreeReq = req.query.free === '1' || req.query.free === 'true';
      const r2Cfg = !isFreeReq ? loadR2Config() : null;

      if (r2Cfg) {
        try {
          const cachedR2 = r2UploadedExportKeyCache.get(targetFilePath);
          let objectKey = '';
          if (
            cachedR2 &&
            cachedR2.sizeBytes === stat.size &&
            Math.abs(cachedR2.mtimeMs - stat.mtimeMs) < 10
          ) {
            objectKey = cachedR2.objectKey;
          } else {
            const outKey = buildR2ObjectKey(localFilename, 'outputs');
            const uploaded = await uploadLocalFileToR2(
              r2Cfg,
              targetFilePath,
              outKey,
              'video/mp4',
              safeDownloadName
            );
            objectKey = uploaded.objectKey;
            r2UploadedExportKeyCache.set(targetFilePath, {
              objectKey,
              sizeBytes: stat.size,
              mtimeMs: stat.mtimeMs
            });
          }
          const signedUrl = await signExistingR2DownloadUrl(
            r2Cfg,
            objectKey,
            safeDownloadName,
            'video/mp4'
          );
          res.json({
            ok: true,
            storage: 'r2',
            url: signedUrl,
            filename: safeDownloadName,
            sizeBytes: stat.size
          });
          return;
        } catch (r2DlSignErr) {
          console.warn('[Download] R2 presign fallback to local stream:', r2DlSignErr);
        }
      }

      res.json({
        ok: true,
        storage: 'local',
        url: `/api/recap/video/${encodeURIComponent(localFilename)}?dl=1&name=${encodeURIComponent(safeDownloadName)}`,
        filename: safeDownloadName,
        sizeBytes: stat.size
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to prepare video download URL'
      });
    }
  });

  // Serve standalone MP3 voiceover audio files with inline playback and explicit HTTP 206 Range seeking support
  app.get('/api/recap/audio/:filename', (req, res) => {
    const safeName = path.basename(req.params.filename);
    const filePath = path.join(JOBS_TEMP_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(404).json({ ok: false, error: 'Audio file not found' });
      return;
    }
    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch {
      res.status(404).json({ ok: false, error: 'Audio file not readable' });
      return;
    }
    const fileSize = stat.size;
    const disp = resolveMediaContentDisposition(
      safeName,
      typeof req.query.name === 'string' ? req.query.name : undefined,
      typeof req.query.dl === 'string' ? req.query.dl : undefined,
      '.mp3'
    );
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', disp.headerValue);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader(
      'Cache-Control',
      disp.mode === 'attachment' ? 'no-store' : 'private, max-age=3600'
    );

    const range = req.headers.range;
    if (range && fileSize > 0) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(fileSize - 1, parseInt(match[2], 10)) : fileSize - 1;
        if (start >= 0 && start < fileSize && start <= end) {
          const chunkSize = end - start + 1;
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
          res.setHeader('Content-Length', String(chunkSize));
          const stream = fs.createReadStream(filePath, { start, end });
          stream.on('error', () => {
            if (!res.headersSent) res.status(500).end();
            else res.destroy();
          });
          stream.pipe(res);
          return;
        }
        res.status(416);
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        res.end();
        return;
      }
    }

    res.setHeader('Content-Length', String(fileSize));
    const fullStream = fs.createReadStream(filePath);
    fullStream.on('error', () => {
      if (!res.headersSent) res.status(404).end();
      else res.destroy();
    });
    fullStream.pipe(res);
  });

  // Convert WAV base64 to standalone MP3 on demand (for History jobs or direct MP3 export)
  app.post('/api/recap/convert-wav-to-mp3', async (req, res) => {
    try {
      const { audioBase64 } = (req.body || {}) as { audioBase64?: string };
      if (!audioBase64 || audioBase64.length < 40) {
        res.status(400).json({ ok: false, error: 'Missing audioBase64' });
        return;
      }
      const tempId = `mp3_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const wavPath = path.join(JOBS_TEMP_DIR, `${tempId}.wav`);
      const mp3Filename = `${tempId}_voiceover.mp3`;
      const mp3Path = path.join(JOBS_TEMP_DIR, mp3Filename);

      const cleanB64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(wavPath, Buffer.from(cleanB64, 'base64'));
      const ok = await convertWavToMp3(wavPath, mp3Path);
      try {
        fs.unlinkSync(wavPath);
      } catch {}

      if (!ok) {
        res.status(500).json({ ok: false, error: 'MP3 conversion failed' });
        return;
      }
      res.json({
        ok: true,
        voiceover_mp3_url: `/api/recap/audio/${mp3Filename}`
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'MP3 conversion failed'
      });
    }
  });

  // In-memory cache of rendered MP4 exports keyed by jobId + editSignature so unchanged or pre-warmed exports download in <5ms
  const renderedJobExportCache = new Map<
    string,
    { signature: string; outFilename: string; outputVideoPath: string }
  >();

  interface RenderExportJobStatus {
    exportId: string;
    jobId: string;
    signature: string;
    status: 'processing' | 'done' | 'error';
    progress: number;
    stageMessage: string;
    dubbedVideoUrl?: string;
    error?: string;
    createdAt: number;
  }

  const renderExportJobs = new Map<string, RenderExportJobStatus>();
  const renderExportInFlightBySignature = new Map<string, string>();

  function pruneOldExportJobs() {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [k, v] of renderExportJobs.entries()) {
      if (v.createdAt < cutoff) {
        renderExportJobs.delete(k);
        if (renderExportInFlightBySignature.get(v.signature) === k) {
          renderExportInFlightBySignature.delete(v.signature);
        }
      }
    }
  }

  function computeRenderExportSignature(payload: {
    jobId: string;
    mode?: string;
    translateAudio?: string;
    aspectRatio?: string;
    mirrorFlip?: boolean;
    effects?: Partial<AntiCopyrightEffects>;
    blurEnabled?: boolean;
    blurRegions?: BlurRegion[];
    subtitleConfig?: SubtitleOverlayConfig;
    editConfig?: DeepRecapEditConfig;
    cues?: SubtitleCue[];
  }): string {
    return crypto
      .createHash('sha1')
      .update(
        JSON.stringify({
          j: payload.jobId,
          m: payload.mode || 'recap',
          ta: payload.translateAudio || 'dub',
          ar: payload.aspectRatio || 'original',
          mf: Boolean(payload.mirrorFlip ?? payload.effects?.mirror),
          fx: {
            hd: Boolean(payload.effects?.outputHD),
            zm: Boolean(payload.effects?.zoom),
            cs: Boolean(payload.effects?.colorShift),
            cr: Boolean(payload.effects?.crop),
            gr: Boolean(payload.effects?.grain)
          },
          be: Boolean(payload.blurEnabled),
          br: payload.blurRegions || [],
          sc: payload.subtitleConfig || null,
          ec: payload.editConfig || null,
          cues: (payload.cues || []).map((c) => [c.start_ms, c.end_ms, c.text])
        })
      )
      .digest('hex');
  }

  async function fetchGtxJsonIpv4(url: string, timeoutMs = 6000): Promise<any> {
    try {
      const sec = Math.max(2, Math.ceil(timeoutMs / 1000));
      const { stdout } = await execFileAsync('curl', ['-4', '-s', '-m', String(sec), url], {
        maxBuffer: 2 * 1024 * 1024
      });
      if (stdout && stdout.trim().startsWith('[')) {
        return JSON.parse(stdout);
      }
    } catch {}
    return null;
  }

  async function translateSubtitleCuesToLanguage(
    cues: SubtitleCue[],
    targetSubtitleLang?: TargetLanguageCode,
    allowOwnerGeminiPool = true
  ): Promise<SubtitleCue[]> {
    if (!Array.isArray(cues) || cues.length === 0) return [];
    const withBurmeseSaved = cues.map((c) => ({
      ...c,
      burmeseText: c.burmeseText || c.text
    }));
    const lang = targetSubtitleLang || 'my';
    if (lang === 'my') {
      return withBurmeseSaved.map((c) => ({
        ...c,
        text: c.burmeseText || c.text
      }));
    }

    const tlMap: Record<TargetLanguageCode, string> = {
      my: 'my',
      en: 'en',
      ko: 'ko',
      th: 'th',
      zh: 'zh-CN',
      ja: 'ja'
    };
    const langFullNameMap: Record<TargetLanguageCode, string> = {
      my: 'Burmese',
      en: 'English',
      ko: 'Korean',
      th: 'Thai',
      zh: 'Simplified Chinese',
      ja: 'Japanese'
    };
    const tl = tlMap[lang] || 'en';
    const translatedCues: SubtitleCue[] = [...withBurmeseSaved];

    // Primary: Context-aware Gemini AI translation when pool keys are allowed (Credit Mode only)
    if (allowOwnerGeminiPool) {
      try {
        const geminiSubRes = await executeWithGeminiKeyPool(async (ai) => {
          const numberedInput = withBurmeseSaved
            .map((c, idx) => `${idx + 1}. ${String(c.burmeseText || c.text || '').replace(/\r?\n/g, ' ').trim()}`)
            .join('\n');
          const subModels = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
          for (const subModel of subModels) {
            try {
              const resp = await ai.models.generateContent({
                model: subModel,
                contents: `Translate the following ${withBurmeseSaved.length} Burmese movie recap subtitle lines into natural, accurate ${langFullNameMap[lang] || 'English'} subtitles.\nKeep the exact 1-to-1 line count (${withBurmeseSaved.length} items) and preserve character names, numbers, and dramatic meaning accurately.\n\n${numberedInput}`,
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      lines: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      }
                    },
                    required: ['lines']
                  }
                }
              });
              if (resp.text) return JSON.parse(resp.text);
            } catch (subErr: any) {
              const msg = String(subErr?.message || subErr || '');
              if (msg.includes('404') || msg.toLowerCase().includes('not found')) continue;
              throw subErr;
            }
          }
          return null;
        });
        const aiLines = geminiSubRes?.result?.lines;
        if (Array.isArray(aiLines) && aiLines.length === withBurmeseSaved.length) {
          return withBurmeseSaved.map((c, idx) => ({
            ...c,
            text: String(aiLines[idx] || c.text).trim() || c.text
          }));
        }
      } catch {}
    }

    const batchSize = 20;

    for (let i = 0; i < withBurmeseSaved.length; i += batchSize) {
      const slice = withBurmeseSaved.slice(i, i + batchSize);
      const sourceLines = slice.map((c) =>
        String(c.burmeseText || c.text || '')
          .replace(/\r?\n/g, ' ')
          .trim()
      );
      const joined = sourceLines.join('\n');
      if (!joined.trim()) continue;

      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=my&tl=${encodeURIComponent(
          tl
        )}&dt=t&q=${encodeURIComponent(joined)}`;
        const data = await fetchGtxJsonIpv4(url, 6500);
        if (Array.isArray(data?.[0])) {
          const fullTranslated = data[0].map((seg: any) => String(seg?.[0] || '')).join('');
          const outLines = fullTranslated
            .split(/\r?\n/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
          if (outLines.length === slice.length) {
            for (let j = 0; j < slice.length; j++) {
              translatedCues[i + j] = {
                ...slice[j],
                text: outLines[j] || slice[j].text
              };
            }
            continue;
          }
        }
      } catch {}

      // Fallback per-cue translation if batch line count differed
      await Promise.all(
        slice.map(async (cueItem, j) => {
          const src = sourceLines[j];
          if (!src) return;
          try {
            const singleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=my&tl=${encodeURIComponent(
              tl
            )}&dt=t&q=${encodeURIComponent(src)}`;
            const d = await fetchGtxJsonIpv4(singleUrl, 5000);
            if (Array.isArray(d?.[0])) {
              const txt = d[0]
                .map((seg: any) => String(seg?.[0] || ''))
                .join('')
                .replace(/\r?\n/g, ' ')
                .trim();
              if (txt) {
                translatedCues[i + j] = { ...cueItem, text: txt };
              }
            }
          } catch {}
        })
      );
    }

    return translatedCues;
  }

  // Live endpoint to switch subtitle display language (e.g. Burmese -> English / Korean / Thai / Chinese / Japanese)
  // while keeping the spoken Voice Script in Burmese!
  app.post('/api/recap/translate-subtitles', async (req, res) => {
    try {
      const {
        cues = [],
        subtitleLanguage = 'my',
        isFreeMode = false
      } = (req.body || {}) as {
        cues?: SubtitleCue[];
        subtitleLanguage?: TargetLanguageCode;
        isFreeMode?: boolean;
      };
      const translated = await translateSubtitleCuesToLanguage(
        cues,
        subtitleLanguage,
        !isFreeMode
      );
      res.json({ ok: true, subtitleLanguage, cues: translated });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: err?.message ? String(err.message) : 'Failed to translate subtitles'
      });
    }
  });

  // Re-burn / Export MP4 with latest user-edited Subtitle position/scale/style, Blur regions, and Anti-Copyright Effects
  // Supports non-blocking `asyncMode: true` with `/api/recap/render-status/:exportId` polling to prevent Cloudflare 100s 524 timeouts!
  app.post('/api/recap/render-export', async (req, res) => {
    try {
      pruneOldExportJobs();
      const {
        jobId,
        durationSec = 15,
        cues = [],
        subtitleConfig,
        blurEnabled = false,
        blurRegions = [],
        mirrorFlip = false,
        effects,
        aspectRatio = 'original',
        editConfig,
        isFreeMode = false,
        mode = 'recap',
        translateAudio = 'dub',
        asyncMode = false
      } = (req.body || {}) as {
        jobId?: string;
        durationSec?: number;
        cues?: SubtitleCue[];
        subtitleConfig?: SubtitleOverlayConfig;
        blurEnabled?: boolean;
        blurRegions?: BlurRegion[];
        mirrorFlip?: boolean;
        effects?: Partial<AntiCopyrightEffects>;
        aspectRatio?: AspectRatioMode;
        editConfig?: DeepRecapEditConfig;
        isFreeMode?: boolean;
        mode?: 'recap' | 'translate';
        translateAudio?: 'dub' | 'captions-only';
        asyncMode?: boolean;
      };

      const isCaptionsOnly = mode === 'translate' && translateAudio === 'captions-only';
      const safeJobId = (jobId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!safeJobId) {
        res.status(400).json({ ok: false, error: 'Missing jobId' });
        return;
      }

      const effectiveExportEditConfig: DeepRecapEditConfig | undefined =
        isFreeMode && editConfig
          ? {
              ...editConfig,
              watermarkText: { ...editConfig.watermarkText, enabled: false },
              brandLogo: { ...editConfig.brandLogo, enabled: false }
            }
          : editConfig;

      const effectiveExportEffects: Partial<AntiCopyrightEffects> = {
        outputHD: isFreeMode ? false : Boolean(effects?.outputHD ?? true),
        zoom: isFreeMode ? false : Boolean(effects?.zoom),
        mirror: Boolean(effects?.mirror ?? mirrorFlip),
        colorShift: Boolean(effects?.colorShift),
        crop: Boolean(effects?.crop),
        grain: Boolean(effects?.grain),
        pitchShift: Boolean(effects?.pitchShift)
      };

      const signature = computeRenderExportSignature({
        jobId: safeJobId,
        mode,
        translateAudio,
        aspectRatio,
        mirrorFlip: effectiveExportEffects.mirror,
        effects: effectiveExportEffects,
        blurEnabled,
        blurRegions,
        subtitleConfig,
        editConfig: effectiveExportEditConfig,
        cues
      });

      const cachedExport = renderedJobExportCache.get(safeJobId);
      if (
        cachedExport &&
        cachedExport.signature === signature &&
        fs.existsSync(cachedExport.outputVideoPath) &&
        fs.statSync(cachedExport.outputVideoPath).size > 1000
      ) {
        res.json({
          ok: true,
          cached: true,
          status: 'done',
          dubbed_video_url: `/api/recap/video/${cachedExport.outFilename}`
        });
        return;
      }

      const inputVideoPath = path.join(JOBS_TEMP_DIR, `${safeJobId}_input.mp4`);
      const voiceoverWavPath = path.join(JOBS_TEMP_DIR, `${safeJobId}_voiceover.wav`);
      const hasInputVideo = fs.existsSync(inputVideoPath);
      const hasVoiceoverWav = fs.existsSync(voiceoverWavPath);
      if (!hasVoiceoverWav && !isCaptionsOnly) {
        res.status(404).json({ ok: false, error: 'Voiceover audio not found for job' });
        return;
      }
      if (isCaptionsOnly && !hasInputVideo) {
        res.status(404).json({ ok: false, error: 'Source video expired on server. Please regenerate.' });
        return;
      }

      const outFilename = `${safeJobId}_export_${signature.slice(0, 10)}.mp4`;
      const outputVideoPath = path.join(JOBS_TEMP_DIR, outFilename);

      if (fs.existsSync(outputVideoPath) && fs.statSync(outputVideoPath).size > 1000) {
        renderedJobExportCache.set(safeJobId, { signature, outFilename, outputVideoPath });
        res.json({
          ok: true,
          cached: true,
          status: 'done',
          dubbed_video_url: `/api/recap/video/${outFilename}`
        });
        return;
      }

      const executeExportWork = async (onStep?: (pct: number, msg: string) => void): Promise<boolean> => {
        onStep?.(35, 'Rendering subtitles & effects with FFmpeg...');
        const expTag = `${safeJobId}_exp_${signature.slice(0, 6)}`;
        const ok = hasInputVideo
          ? await muxVideoWithMixedAudio(
              inputVideoPath,
              hasVoiceoverWav ? voiceoverWavPath : null,
              outputVideoPath,
              Boolean(effectiveExportEffects.mirror),
              false,
              cues,
              subtitleConfig,
              Boolean(blurEnabled),
              blurRegions,
              expTag,
              aspectRatio,
              effectiveExportEditConfig,
              isCaptionsOnly,
              effectiveExportEffects,
              durationSec
            )
          : await generateStandaloneRecapMp4(
              voiceoverWavPath,
              outputVideoPath,
              durationSec,
              cues,
              subtitleConfig,
              Boolean(blurEnabled),
              blurRegions,
              Boolean(effectiveExportEffects.mirror),
              expTag,
              aspectRatio,
              effectiveExportEditConfig,
              effectiveExportEffects
            );
        if (ok) {
          renderedJobExportCache.set(safeJobId, { signature, outFilename, outputVideoPath });
        }
        return ok;
      };

      if (asyncMode) {
        const existingExportId = renderExportInFlightBySignature.get(signature);
        if (existingExportId && renderExportJobs.has(existingExportId)) {
          const existingJob = renderExportJobs.get(existingExportId)!;
          if (existingJob.status === 'processing') {
            res.json({
              ok: true,
              pending: true,
              exportId: existingJob.exportId,
              status: existingJob.status,
              progress: existingJob.progress,
              stage_message: existingJob.stageMessage
            });
            return;
          }
          if (existingJob.status === 'done' && existingJob.dubbedVideoUrl) {
            res.json({
              ok: true,
              cached: true,
              status: 'done',
              exportId: existingJob.exportId,
              dubbed_video_url: existingJob.dubbedVideoUrl
            });
            return;
          }
        }

        const exportId = `exp_${safeJobId}_${signature.slice(0, 8)}_${Date.now().toString(36)}`;
        const statusRec: RenderExportJobStatus = {
          exportId,
          jobId: safeJobId,
          signature,
          status: 'processing',
          progress: 18,
          stageMessage: 'Starting MP4 video render...',
          createdAt: Date.now()
        };
        renderExportJobs.set(exportId, statusRec);
        renderExportInFlightBySignature.set(signature, exportId);

        void (async () => {
          try {
            const ok = await executeExportWork((pct, msg) => {
              const cur = renderExportJobs.get(exportId);
              if (cur && cur.status === 'processing') {
                cur.progress = pct;
                cur.stageMessage = msg;
              }
            });
            const cur = renderExportJobs.get(exportId);
            if (!cur) return;
            if (ok) {
              cur.status = 'done';
              cur.progress = 100;
              cur.stageMessage = 'MP4 export complete!';
              cur.dubbedVideoUrl = `/api/recap/video/${outFilename}`;
            } else {
              cur.status = 'error';
              cur.error = 'Failed to export video with edits';
            }
          } catch (bgErr) {
            const cur = renderExportJobs.get(exportId);
            if (cur) {
              cur.status = 'error';
              cur.error = bgErr instanceof Error ? bgErr.message : 'Export failed';
            }
          } finally {
            if (renderExportInFlightBySignature.get(signature) === exportId) {
              renderExportInFlightBySignature.delete(signature);
            }
          }
        })();

        res.json({
          ok: true,
          pending: true,
          exportId,
          status: 'processing',
          progress: 18,
          stage_message: statusRec.stageMessage
        });
        return;
      }

      const ok = await executeExportWork();
      if (!ok) {
        res.status(500).json({ ok: false, error: 'Failed to export video with edits' });
        return;
      }

      res.json({
        ok: true,
        cached: false,
        status: 'done',
        dubbed_video_url: `/api/recap/video/${outFilename}`
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Export failed'
      });
    }
  });

  app.get('/api/recap/render-status/:exportId', (req, res) => {
    const safeId = (req.params.exportId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const job = renderExportJobs.get(safeId);
    if (!job) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(404).json({ ok: false, error: 'Export job not found' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: job.status !== 'error',
      exportId: job.exportId,
      status: job.status,
      progress: job.progress,
      stage_message: job.stageMessage,
      dubbed_video_url: job.dubbedVideoUrl,
      error: job.error
    });
  });

  // Health & Engine status route (never exposes Owner API key counts or pool details)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      engine: 'TTAK MOVIE RECAP WebCodecs + FFmpeg Audio Mixer',
      freeMaxDurationSec: 150,
      freeDailyLimit: 3,
      workersAiConfigured: Boolean(loadCloudflareWorkersAiConfig()),
      models: {
        script: 'gemini-3-flash-preview',
        tts: 'gemini-2.5-flash-preview-tts',
        stt: 'whisper-large-v3-turbo'
      }
    });
  });

  // Live API Key Test Route for Free Mode User Keys (/settings) — never leaks Owner keys
  app.post('/api/recap/test-connection', async (req, res) => {
    const startedAt = Date.now();
    try {
      const {
        provider,
        userGeminiApiKey,
        userGroqApiKey,
        scriptModel = 'gemini-3-flash-preview'
      } = (req.body || {}) as {
        provider?: 'gemini' | 'groq';
        userGeminiApiKey?: string;
        userGroqApiKey?: string;
        scriptModel?: ScriptAiModelId;
      };

      let geminiOk = true;
      let geminiError: string | undefined;
      let groqOk = true;
      let groqError: string | undefined;

      if (provider === 'gemini' || userGeminiApiKey) {
        const cleanGem = (userGeminiApiKey || '').trim();
        if (!cleanGem || cleanGem.length < 12) {
          geminiOk = false;
          geminiError = 'Google AI Studio API Key ပုံစံ မမှန်ကန်ပါ';
        } else {
          try {
            const userAi = new GoogleGenAI({
              apiKey: cleanGem,
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
            });
            await userAi.models.generateContent({
              model: scriptModel,
              contents: 'Reply with OK.'
            });
            geminiOk = true;
          } catch (err: any) {
            geminiOk = false;
            geminiError = err?.message ? String(err.message).slice(0, 120) : 'Invalid Gemini API Key';
          }
        }
      }

      if (provider === 'groq' || userGroqApiKey) {
        const cleanGroq = (userGroqApiKey || '').trim();
        if (!cleanGroq || cleanGroq.length < 12) {
          groqOk = false;
          groqError = 'Groq API Key ပုံစံ မမှန်ကန်ပါ';
        } else {
          try {
            const gResp = await fetch('https://api.groq.com/openai/v1/models', {
              headers: { Authorization: `Bearer ${cleanGroq}` },
              signal: AbortSignal.timeout(7000)
            });
            if (!gResp.ok) {
              groqOk = false;
              groqError = `Groq API error (${gResp.status})`;
            } else {
              groqOk = true;
            }
          } catch (err: any) {
            groqOk = false;
            groqError = err?.message ? String(err.message).slice(0, 120) : 'Groq connection failed';
          }
        }
      }

      const latencyMs = Math.max(18, Date.now() - startedAt);
      res.json({
        ok: true,
        latencyMs,
        geminiOk,
        geminiError,
        groqOk,
        groqError
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        error: err instanceof Error ? err.message : 'Engine connection test failed'
      });
    }
  });

  interface RecapGenerationJobState {
    jobId: string;
    status: 'processing' | 'done' | 'error';
    progress: number;
    stageMessage: string;
    result?: Record<string, any>;
    error?: string;
    errorEn?: string;
    errorCode?: string;
    createdAt: number;
  }

  const recapGenerationJobs = new Map<string, RecapGenerationJobState>();

  function saveRecapJobStatusToDisk(job: RecapGenerationJobState) {
    try {
      const safeId = job.jobId.replace(/[^a-zA-Z0-9_-]/g, '');
      if (!safeId) return;
      fs.writeFileSync(
        path.join(JOBS_TEMP_DIR, `${safeId}_status.json`),
        JSON.stringify(job),
        'utf-8'
      );
    } catch {}
  }

  function loadRecapJobStatusFromDisk(safeId: string): RecapGenerationJobState | null {
    try {
      const fp = path.join(JOBS_TEMP_DIR, `${safeId}_status.json`);
      if (!fs.existsSync(fp)) return null;
      return JSON.parse(fs.readFileSync(fp, 'utf-8')) as RecapGenerationJobState;
    } catch {
      return null;
    }
  }

  function pruneOldRecapJobs() {
    const cutoff = Date.now() - 45 * 60 * 1000;
    for (const [k, v] of recapGenerationJobs.entries()) {
      if (v.createdAt < cutoff) {
        recapGenerationJobs.delete(k);
        try {
          const fp = path.join(JOBS_TEMP_DIR, `${k.replace(/[^a-zA-Z0-9_-]/g, '')}_status.json`);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        } catch {}
      }
    }
  }

  async function runRecapAssetGenerationPipeline(
    jobId: string,
    startTime: number,
    rawBody: any,
    onProgress: (pct: number, msg: string) => void
  ): Promise<{ ok: true; payload: Record<string, any> } | { ok: false; statusCode: number; error: string; errorEn?: string; errorCode?: string }> {
    const {
      isFreeMode = false,
      userGeminiApiKey,
      userGroqApiKey,
      durationSec = 15,
      mode = 'recap',
      translateAudio = 'dub',
      scriptStyle = 'narrator',
      targetLanguage = 'my',
      voiceGender = 'male',
      customPrompt,
      transcriptText,
      title,
      videoBase64,
      r2ObjectKey,
      r2SrtKey,
      localUploadId,
      pitchShift = false,
      mirrorFlip = false,
      effects,
      scriptModel = 'gemini-3-flash-preview',
      ttsEngine = 'edge-neural',
      sttModel = 'whisper-large-v3-turbo',
      breathPauseMs = 100,
      dynamicTempoFit = true,
      subtitleConfig,
      blurEnabled = false,
      blurRegions = [],
      aspectRatio = 'original',
      editConfig,
      isSttOnly = false,
      sttMode = 'translate',
      speakerDiarization = false
    } = (rawBody || {}) as {
      isFreeMode?: boolean;
      userGeminiApiKey?: string;
      userGroqApiKey?: string;
      durationSec?: number;
      mode?: 'recap' | 'translate';
      translateAudio?: 'dub' | 'captions-only';
      scriptStyle?: ScriptStyleId;
      targetLanguage?: TargetLanguageCode;
      voiceGender?: VoiceGender;
      customPrompt?: string;
      transcriptText?: string;
      title?: string;
      videoBase64?: string;
      r2ObjectKey?: string;
      r2SrtKey?: string;
      localUploadId?: string;
      pitchShift?: boolean;
      mirrorFlip?: boolean;
      effects?: Partial<AntiCopyrightEffects>;
      scriptModel?: ScriptAiModelId;
      ttsEngine?: TtsEngineId;
      sttModel?: SttEngineId;
      breathPauseMs?: number;
      dynamicTempoFit?: boolean;
      subtitleConfig?: SubtitleOverlayConfig;
      blurEnabled?: boolean;
      blurRegions?: BlurRegion[];
      aspectRatio?: AspectRatioMode;
      editConfig?: DeepRecapEditConfig;
      isSttOnly?: boolean;
      sttMode?: 'transcribe' | 'translate';
      speakerDiarization?: boolean;
    };

    const effectiveServerEffects: Partial<AntiCopyrightEffects> = {
      outputHD: isFreeMode ? false : Boolean(effects?.outputHD ?? true),
      zoom: isFreeMode ? false : Boolean(effects?.zoom),
      mirror: Boolean(effects?.mirror ?? mirrorFlip),
      colorShift: Boolean(effects?.colorShift),
      crop: Boolean(effects?.crop),
      grain: Boolean(effects?.grain),
      pitchShift: Boolean(effects?.pitchShift ?? pitchShift)
    };

    const freeGeminiKey =
      isFreeMode && typeof userGeminiApiKey === 'string' && userGeminiApiKey.trim().length >= 12
        ? userGeminiApiKey.trim()
        : '';
    const freeGroqKey =
      isFreeMode && typeof userGroqApiKey === 'string' && userGroqApiKey.trim().length >= 12
        ? userGroqApiKey.trim()
        : '';

    let inputVideoPath: string | null = null;
    let extractedAudioBase64: string | null = null;
    let extractedAudioBuffer: Buffer | null = null;
    let probedDuration = Number(durationSec) || 15;
    const r2Config = loadR2Config();
    const effectiveServerR2Config = isFreeMode ? null : r2Config;
    const effectiveServerEditConfig: DeepRecapEditConfig | undefined =
      isFreeMode && editConfig
        ? {
            ...editConfig,
            watermarkText: { ...editConfig.watermarkText, enabled: false },
            brandLogo: { ...editConfig.brandLogo, enabled: false }
          }
        : editConfig;

    let effectiveTranscriptText = transcriptText || '';

    onProgress(38, 'Preparing video & extracting audio...');

    if (!effectiveTranscriptText && r2SrtKey && effectiveServerR2Config) {
      const candidateSrtPath = path.join(JOBS_TEMP_DIR, `${jobId}_subtitles.srt`);
      try {
        const downloadedSrt = await downloadR2ObjectToFile(effectiveServerR2Config, r2SrtKey, candidateSrtPath);
        if (downloadedSrt && fs.existsSync(candidateSrtPath)) {
          effectiveTranscriptText = stripSrtTimestampsToText(
            fs.readFileSync(candidateSrtPath, 'utf-8')
          );
          try {
            fs.unlinkSync(candidateSrtPath);
          } catch {}
        }
      } catch (srtDlErr) {
        console.warn('[R2 Direct] Failed to download SRT from R2:', srtDlErr);
      }
    }

    const candidateInputPath = path.join(JOBS_TEMP_DIR, `${jobId}_input.mp4`);
    if (r2ObjectKey && effectiveServerR2Config) {
      try {
        const downloaded = await downloadR2ObjectToFile(effectiveServerR2Config, r2ObjectKey, candidateInputPath);
        if (downloaded) {
          inputVideoPath = candidateInputPath;
        }
      } catch (r2DlErr) {
        console.warn('[R2 Direct] Failed to download object from R2:', r2DlErr);
      }
    } else if (localUploadId) {
      const safeLocId = localUploadId.replace(/[^a-zA-Z0-9_-]/g, '');
      const localSrcPath = path.join(JOBS_TEMP_DIR, `${safeLocId}_upload.mp4`);
      if (fs.existsSync(localSrcPath)) {
        try {
          fs.renameSync(localSrcPath, candidateInputPath);
          inputVideoPath = candidateInputPath;
        } catch {
          fs.copyFileSync(localSrcPath, candidateInputPath);
          inputVideoPath = candidateInputPath;
        }
      }
    } else if (videoBase64 && videoBase64.length > 100) {
      try {
        const cleanB64 = videoBase64.replace(/^data:[^;]+;base64,/, '');
        fs.writeFileSync(candidateInputPath, Buffer.from(cleanB64, 'base64'));
        inputVideoPath = candidateInputPath;
      } catch (writeErr) {
        console.warn('[Upload] Could not write uploaded video buffer:', writeErr);
        inputVideoPath = null;
      }
    }

    if (inputVideoPath && fs.existsSync(inputVideoPath)) {
      try {
        const probedMeta = await probeVideoDimensions(inputVideoPath);
        probedDuration = resolveEffectiveVideoDurationSec(probedMeta.durationSec, durationSec);

        const extractedMp3Path = path.join(JOBS_TEMP_DIR, `${jobId}_extracted.mp3`);
        const maxExtractSec = isFreeMode
          ? 150
          : Math.max(150, Math.min(3600, Math.ceil(probedDuration || 600)));
        const audioBitrate = maxExtractSec > 240 ? '32k' : '48k';
        try {
          await execFileAsync('ffmpeg', [
            '-y',
            '-i',
            inputVideoPath,
            '-t',
            String(maxExtractSec),
            '-vn',
            '-ar',
            '16000',
            '-ac',
            '1',
            '-b:a',
            audioBitrate,
            extractedMp3Path
          ]);
          if (fs.existsSync(extractedMp3Path) && fs.statSync(extractedMp3Path).size > 200) {
            extractedAudioBuffer = fs.readFileSync(extractedMp3Path);
            extractedAudioBase64 = extractedAudioBuffer.toString('base64');
          }
          fs.unlinkSync(extractedMp3Path);
        } catch {}
      } catch (probeErr) {
        console.warn('[Upload] Could not probe uploaded video:', probeErr);
      }
    }

    const isTranslateMode = mode === 'translate' || Boolean(isSttOnly);
    const isCaptionsOnlyMode = isTranslateMode && (translateAudio === 'captions-only' || Boolean(isSttOnly));
    const safeDuration = Math.max(6, Math.min(isFreeMode ? 150 : 10800, probedDuration));
    const styleDef = SCRIPT_STYLE_PROMPTS[scriptStyle] || SCRIPT_STYLE_PROMPTS.narrator;
    const systemInstruction =
      customPrompt?.trim() ||
      (isTranslateMode
        ? buildCinematicTranslateSystemPrompt({
            targetLanguage,
            translateAudio: isCaptionsOnlyMode ? 'captions-only' : 'dub',
            sttMode: isSttOnly ? sttMode : 'translate',
            speakerDiarization: Boolean(speakerDiarization)
          })
        : styleDef.systemPrompt);

    const fallbackAssets = buildSyncedRecapCues(
      safeDuration,
      scriptStyle,
      targetLanguage,
      title
    );

    let finalTitle = fallbackAssets.title;
    let finalScriptText = fallbackAssets.scriptText;
    let finalCues = fallbackAssets.cues;
    let finalHighlights = fallbackAssets.highlightClips;
    let usedLiveGemini = false;
    let geminiFailureReason = '';

    const hasRealUserUpload = Boolean(
      r2ObjectKey || localUploadId || (videoBase64 && videoBase64.length > 100)
    );
    const isExplicitSaveTikDemoTitle = String(title || '').includes('7673413291896605967');
    const isWeddingDramaClip =
      !isTranslateMode &&
      targetLanguage === 'my' &&
      Math.abs(safeDuration - 70.7) <= 2.5 &&
      (!hasRealUserUpload || isExplicitSaveTikDemoTitle);

    if (isWeddingDramaClip) {
      const rawSceneCues = SAVETIK_WEDDING_DRAMA_CUES[scriptStyle] || SAVETIK_WEDDING_DRAMA_CUES.narrator;
      finalCues = rawSceneCues.map((c, idx) => ({ ...c, id: `cue-${idx + 1}` }));
      finalScriptText = finalCues.map((c) => c.text).join(' ');
    }

    // 1b. Speech-to-Text pre-pass (strict 35s overall ceiling so 48% NEVER stalls indefinitely)
    onProgress(48, 'Listening to original audio with AI...');
    let groqTranscript = '';
    let sttProviderUsed: 'cloudflare-workers-ai' | 'groq' | 'none' = 'none';
    if (!isWeddingDramaClip && !effectiveTranscriptText && extractedAudioBuffer) {
      const sttOrder = resolveSttStrategyForMode(
        Boolean(isFreeMode),
        Boolean(freeGroqKey),
        Boolean(loadCloudflareWorkersAiConfig())
      );
      const runSttChain = async () => {
        for (const step of sttOrder) {
          if (groqTranscript) break;
          if (step === 'user_groq' && freeGroqKey) {
            try {
              const t = await transcribeWithDirectGroqKey(extractedAudioBuffer!, freeGroqKey, sttModel);
              if (t) {
                groqTranscript = t;
                sttProviderUsed = 'groq';
              }
            } catch {}
          } else if (step === 'workers_ai' && !isFreeMode) {
            const cfText = await transcribeAudioWithWorkersAi(extractedAudioBuffer!, sttModel);
            if (cfText) {
              groqTranscript = cfText;
              sttProviderUsed = 'cloudflare-workers-ai';
            } else {
              onProgress(52, 'Checking speech timing & continuing to script...');
            }
          } else if (step === 'groq_pool') {
            onProgress(53, 'Transcribing dialogue with Whisper AI...');
            const sttRes = await transcribeAudioWithGroqPool(extractedAudioBuffer!, sttModel);
            if (sttRes?.text) {
              groqTranscript = sttRes.text;
              sttProviderUsed = 'groq';
            }
          }
        }
      };
      let sttCapTimer: ReturnType<typeof setTimeout> | null = null;
      await Promise.race([
        runSttChain(),
        new Promise<void>((resolve) => {
          sttCapTimer = setTimeout(() => {
            console.warn('[STT] Reached 35s cap at 48%; proceeding directly to Gemini audio script generation');
            resolve();
          }, 35000);
        })
      ]).finally(() => {
        if (sttCapTimer) clearTimeout(sttCapTimer);
      });
    }

    // 2. Generate Script & Continuous Scene-Matched Subtitle Cues
    onProgress(58, 'Writing time-synced script & subtitles with AI...');
    const poolState = loadApiKeyPoolState();
    const hasHealthyPoolGeminiKey = poolState.keys.some(
      (k) => k.provider === 'gemini' && k.enabled && k.apiKey.trim().length > 0
    );
    // Free Mode strictly uses ONLY the user's own Gemini API key (`freeGeminiKey`) and NEVER touches the Admin's Owner API Key Pool!
    const hasAnyGeminiKey = isFreeMode
      ? Boolean(freeGeminiKey)
      : Boolean(hasHealthyPoolGeminiKey);

    if (!isWeddingDramaClip) {
      try {
        const langLabel =
          targetLanguage === 'my'
            ? 'Burmese (မြန်မာဘာသာ စကားပြောဟန်)'
            : targetLanguage === 'th'
              ? 'Thai'
              : targetLanguage === 'ja'
                ? 'Japanese'
                : targetLanguage === 'ko'
                  ? 'Korean'
                  : targetLanguage === 'zh'
                    ? 'Chinese'
                    : 'English';

        const effectiveContext = effectiveTranscriptText || groqTranscript;
        const isLongTimeline = safeDuration > 110;
        const isDocumentaryOrDrama = scriptStyle === 'none' || scriptStyle === 'drama';
        const targetSecPerCue = isDocumentaryOrDrama
          ? safeDuration > 240
            ? 3.4
            : 3.2
          : safeDuration > 240
            ? 3.0
            : 2.8;
        const cueCount = Math.max(6, Math.min(120, Math.round(safeDuration / targetSecPerCue)));
        const phraseLengthRule =
          'Each cue.text MUST be one complete, natural spoken phrase of 5 to 9 words (26 to 48 Burmese characters, ~2.0s–2.8s when spoken cleanly in one breath). Never cut sentences awkwardly in half or write giant multi-sentence paragraphs.';
        const q1Sec = Math.round(safeDuration * 0.25);
        const q2Sec = Math.round(safeDuration * 0.55);
        const q3Sec = Math.round(safeDuration * 0.82);
        const timelineAnchorNote = isLongTimeline && !isTranslateMode
          ? `\n- MULTI-MINUTE SYNC ANCHORS: Distribute cues smoothly across ALL acts—Opening (0s–${q1Sec}s), Rising Conflict (${q1Sec}s–${q2Sec}s), Turning Point & Climax (${q2Sec}s–${q3Sec}s), and Finale (${q3Sec}s–${Math.round(safeDuration)}s)—locked directly to the timestamped transcript/audio at those exact seconds!`
          : '';
        const timeWindows = computeAudioScriptWindows(safeDuration, 180);

        const extractVisualKeyframesForSegment = async (
          srcVideoPath: string | null,
          segStartSec: number,
          segDurSec: number,
          segTag: string
        ): Promise<Array<{ relSec: number; timeBadge: string; base64: string }>> => {
          if (!srcVideoPath || !fs.existsSync(srcVideoPath) || isTranslateMode) return [];
          const stepSec = Math.max(5, Math.ceil(segDurSec / 22));
          const maxFrames = Math.min(24, Math.max(4, Math.ceil(segDurSec / stepSec)));
          const patternPrefix = `${jobId}_vkf_${segTag}_`;
          const outPattern = path.join(JOBS_TEMP_DIR, `${patternPrefix}%02d.jpg`);
          try {
            await execFileAsync('ffmpeg', [
              '-y',
              '-ss',
              String(Math.max(0, segStartSec)),
              '-t',
              String(Math.max(4, segDurSec)),
              '-i',
              srcVideoPath,
              '-vf',
              `fps=1/${stepSec},scale=320:-2`,
              '-frames:v',
              String(maxFrames),
              '-q:v',
              '6',
              outPattern
            ]);
            const files = fs
              .readdirSync(JOBS_TEMP_DIR)
              .filter((f) => f.startsWith(patternPrefix) && f.endsWith('.jpg'))
              .sort();
            const frames: Array<{ relSec: number; timeBadge: string; base64: string }> = [];
            for (let idx = 0; idx < files.length; idx++) {
              const fp = path.join(JOBS_TEMP_DIR, files[idx]);
              try {
                const buf = fs.readFileSync(fp);
                if (buf.length > 200) {
                  const relSec = Math.min(Math.max(0, Math.round(segDurSec - 1)), idx * stepSec);
                  const mm = String(Math.floor(relSec / 60)).padStart(2, '0');
                  const ss = String(relSec % 60).padStart(2, '0');
                  frames.push({
                    relSec,
                    timeBadge: `${mm}:${ss}`,
                    base64: buf.toString('base64')
                  });
                }
              } catch {}
              try {
                fs.unlinkSync(fp);
              } catch {}
            }
            return frames;
          } catch {
            try {
              const leftovers = fs
                .readdirSync(JOBS_TEMP_DIR)
                .filter((f) => f.startsWith(patternPrefix));
              for (const lf of leftovers) {
                try {
                  fs.unlinkSync(path.join(JOBS_TEMP_DIR, lf));
                } catch {}
              }
            } catch {}
            return [];
          }
        };

        const buildPromptForWindow = (
          winDurSec: number,
          winContext: string,
          winIndex: number,
          totalWins: number,
          winStartSec: number,
          winEndSec: number,
          prevSummaryHint: string,
          hasVisualKeyframes = false
        ) => {
          const winCueCount = Math.max(4, Math.min(60, Math.round(winDurSec / targetSecPerCue)));
          const winSceneGuide = !isTranslateMode
            ? buildChronologicalSceneLockGuide(winContext, winDurSec)
            : '';
          const partBadge =
            totalWins > 1
              ? `\nVideo Segment: Part ${winIndex + 1} of ${totalWins} (Global video time ${Math.floor(winStartSec / 60)}:${String(Math.round(winStartSec % 60)).padStart(2, '0')} to ${Math.floor(winEndSec / 60)}:${String(Math.round(winEndSec % 60)).padStart(2, '0')}; output cue timestamps MUST be relative to this segment from 0ms to ${Math.round(winDurSec * 1000)}ms).${
                  winIndex > 0
                    ? `\nCONTINUATION & CHARACTER CONSISTENCY RULE: This is Part ${winIndex + 1} starting at ${Math.floor(winStartSec / 60)}:${String(Math.round(winStartSec % 60)).padStart(2, '0')}. Keep exact character roles from earlier segments (e.g. Principal "ကျောင်းအုပ်ကြီး", Teacher "ဆရာ", Student "ကျောင်းသူလေး") and do NOT restart the opening hook!${prevSummaryHint ? ` Previous story context: "${prevSummaryHint}" — continue seamlessly without repeating.` : ''}`
                    : '\nSEGMENT 1 RULE: Narrate ONLY the events in this first segment. Do NOT guess or invent how the movie ends later!'
                }`
              : '';
          const visualKeyframeNotice = hasVisualKeyframes
            ? `\n- MULTIMODAL VISUAL SCENE KEYFRAMES ATTACHED: Timestamped video keyframes [Visual Scene Frame at MM:SS] are attached above! Whenever there is a non-dialogue / silent action stretch (such as [00:53 - 01:08] or [01:18 - 01:59]), LOOK directly at the visual keyframes at those exact timestamps and narrate what is visually happening on screen in synchronization with the character roles established in the audio/transcript!`
            : '';

          if (isTranslateMode) {
            return `Segment Duration: ${winDurSec} seconds (${Math.round(winDurSec * 1000)} ms).${partBadge}
STT Engine: ${sttModel}.
Task: ${
              isSttOnly && sttMode === 'transcribe'
                ? 'Verbatim Speech-to-Text (STT) Subtitles in Original Spoken Language (DO NOT translate, DO NOT summarize).'
                : `Cinematic Movie Dialogue Translation (${isCaptionsOnlyMode ? 'Captions Only — Subtitles Match Original Audio' : 'Dialogue Dubbing'})`
            }.
Target Language: ${isSttOnly && sttMode === 'transcribe' ? 'Original Spoken Language of Audio' : langLabel}.
Video Title / Filename: ${title || 'Movie Clip'}.
${winContext ? `Timestamped Source Speech Transcript for this segment (0ms to ${Math.round(winDurSec * 1000)}ms):\n${winContext}` : 'Listen carefully to the attached audio segment and transcribe/translate every spoken dialogue line at its exact timestamp.'}

CRITICAL DIALOGUE & TIMING RULES:
- ONLY output actual spoken dialogue / speech cues heard in THIS segment (NEVER summarize or narrate like a third-person movie recap!).
- Lock every cue start_ms and end_ms directly to the exact milliseconds within this segment (0ms to ${Math.floor(winDurSec * 1000)}ms). Leave non-dialogue/music pauses silent.
- All timestamps (start_ms, end_ms) MUST be in MILLISECONDS and strictly increasing.
- ${isCaptionsOnlyMode ? 'Keep each subtitle cue concise and cinematic (1 clean line, 4 to 12 words, 20 to 54 characters).' : phraseLengthRule}`;
          }

          return `Segment Duration: ${winDurSec} seconds (${Math.round(winDurSec * 1000)} ms).${partBadge}
STT Engine: ${sttModel}.
Mode: Movie Recap (${styleDef.labelEn}) — STRICT THIRD-PERSON MOVIE STORYTELLER (NOT DIALOGUE TRANSLATION).
Target Language: ${langLabel}.
Video Title / Filename: ${title || 'Dramatic Movie Clip'}.
${winContext ? `Timestamped Source Transcript / Scene Timeline for THIS segment (LOCK every cue's start_ms & end_ms directly to these exact [MM:SS - MM:SS] timestamps and visual keyframes from 0ms to ${Math.round(winDurSec * 1000)}ms — cross-verify with the attached audio & visual frames to keep exact character roles like Principal/Teacher/Student consistent throughout the entire video, and convert dialogue + visual action into accurate 3rd-person narration!):\n${winContext}${winSceneGuide}` : 'Examine the attached timestamped visual keyframes and audio segment carefully, and narrate ONLY what actually happens and is spoken in this segment in third-person movie recap style from 0ms to ' + Math.round(winDurSec * 1000) + 'ms.'}

CRITICAL MOVIE RECAP NARRATION & TIMESTAMP SYNC RULES:
- STRICT FACTUAL ACCURACY TO SOURCE VIDEO FRAMES, AUDIO & TRANSCRIPT: Translate and narrate ONLY the real dialogue, visual scenes, plot events, numbers, and character actions present in THIS segment. Never invent unrelated storylines!${visualKeyframeNotice}${timelineAnchorNote}
- CHARACTER CONSISTENCY ACROSS ENTIRE TIMELINE: Maintain the exact same character identities and roles (e.g., if a character is introduced as the School Principal "ကျောင်းအုပ်ကြီး" or Teacher "ဆရာ" at 0:00, keep calling them "ကျောင်းအုပ်ကြီး" / "ဆရာ" when they reappear at 1:09 — never switch them to a factory boss or unrelated person!).
- STRICT THIRD-PERSON RECAP NARRATION ONLY: You are a movie recap narrator telling the story to viewers in third person ("ကောင်လေးက", "သူက", "သူမက", "ကျောင်းအုပ်ကြီးက", "ဆရာက"). NEVER write first-person or second-person character dialogue ("ငါ", "မင်း", "နင်") as if dubbing the actors! Always convert character dialogue into reported third-person Burmese recap narration.
- STRICT 1:1 SCENE-TIMESTAMP LOCK: A cue at start_ms: T MUST ONLY narrate the visual/audio scene happening at timestamp T in this segment (0ms to ${Math.floor(winDurSec * 1000 - 100)}ms)!
- ZERO REPETITION: Never write two consecutive cues with the same meaning.
- Generate approximately ${winCueCount} non-overlapping spoken recap cues in ${langLabel} spanning this entire ${winDurSec}s segment from ~80ms up to ${Math.floor(winDurSec * 1000 - 100)}ms!
- All timestamps (start_ms, end_ms) MUST be in MILLISECONDS (0 to ${Math.round(winDurSec * 1000)}) and strictly increasing.
- ${phraseLengthRule}`;
        };

        const runScriptRequestWithParts = async (
          ai: GoogleGenAI,
          partsPayload: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>
        ) => {
          const candidateModels = resolveFallbackScriptModels(
            scriptModel || 'gemini-3-flash-preview'
          );
          let lastScriptErr: unknown = null;

          for (let modelIdx = 0; modelIdx < candidateModels.length; modelIdx++) {
            const targetModel = candidateModels[modelIdx];
            const maxAttemptsForModel = modelIdx === 0 ? 2 : 1;

            for (let attemptIdx = 0; attemptIdx < maxAttemptsForModel; attemptIdx++) {
              let reqTimer: ReturnType<typeof setTimeout> | null = null;
              try {
                if (modelIdx > 0 || attemptIdx > 0) {
                  onProgress(
                    60,
                    modelIdx > 0
                      ? `Switching to backup AI model (${targetModel})...`
                      : 'Retrying AI script generation...'
                  );
                }

                return await Promise.race([
                  ai.models.generateContent({
                    model: targetModel,
                    contents: { parts: partsPayload },
                    config: {
                      systemInstruction,
                      responseMimeType: 'application/json',
                      responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                          title: { type: Type.STRING },
                          scriptText: { type: Type.STRING },
                          cues: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                start_ms: { type: Type.INTEGER },
                                end_ms: { type: Type.INTEGER },
                                text: { type: Type.STRING }
                              },
                              required: ['start_ms', 'end_ms', 'text']
                            }
                          },
                          highlight_clips: {
                            type: Type.ARRAY,
                            items: {
                              type: Type.OBJECT,
                              properties: {
                                start_ms: { type: Type.INTEGER },
                                end_ms: { type: Type.INTEGER },
                                label: { type: Type.STRING }
                              },
                              required: ['start_ms', 'end_ms']
                            }
                          }
                        },
                        required: ['title', 'scriptText', 'cues']
                      }
                    }
                  }),
                  new Promise<never>((_, reject) => {
                    reqTimer = setTimeout(
                      () => reject(new Error(`Gemini script request (${targetModel}) timed out after 55s`)),
                      55000
                    );
                  })
                ]);
              } catch (err) {
                lastScriptErr = err;
                const keyErrInfo = isApiKeyQuotaOrLimitError(err);
                if (keyErrInfo.shouldRotate) {
                  throw err;
                }
                const errText = err instanceof Error ? err.message : String(err || '');
                const isModelNotFound =
                  errText.includes('404') || errText.toLowerCase().includes('not found');
                if (isModelNotFound) {
                  console.warn(`[Gemini Script] Model ${targetModel} unavailable (404); trying next fallback model.`);
                  break;
                }
                if (isTransientModelOverloadError(err)) {
                  console.warn(
                    `[Gemini Script] Model ${targetModel} hit transient 503/overload (attempt ${attemptIdx + 1}/${maxAttemptsForModel}).`
                  );
                  if (attemptIdx + 1 < maxAttemptsForModel) {
                    const jitterMs = 900 + Math.floor(Math.random() * 500);
                    await new Promise((r) => setTimeout(r, jitterMs));
                    continue;
                  }
                  break;
                }
                throw err;
              } finally {
                if (reqTimer) clearTimeout(reqTimer);
              }
            }
          }

          throw lastScriptErr || new Error('All Gemini script model candidates failed');
        };

        const invokeGeminiWithParts = async (
          partsPayload: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>
        ) => {
          if (isFreeMode) {
            if (!freeGeminiKey) {
              throw new Error(
                'Free Mode REQUIRES your own Gemini API Key in Settings (/settings). Admin Credit Mode API keys are blocked in Free Mode.'
              );
            }
            return await runScriptRequestWithParts(
              new GoogleGenAI({
                apiKey: freeGeminiKey,
                httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
              }),
              partsPayload
            );
          }
          return (await executeWithGeminiKeyPool((ai) => runScriptRequestWithParts(ai, partsPayload)))?.result;
        };

        const parseWindowResponseCues = (
          parsedObj: any,
          winDurSec: number,
          winOffsetMs: number
        ): SubtitleCue[] => {
          if (!Array.isArray(parsedObj?.cues) || parsedObj.cues.length === 0) return [];
          const maxReturnedEnd = Math.max(
            ...parsedObj.cues.map((c: { end_ms?: number }) => Number(c.end_ms) || 0)
          );
          const unitMultiplier =
            maxReturnedEnd > 0 && maxReturnedEnd <= winDurSec * 1.5 ? 1000 : 1;
          const winDurMs = Math.round(winDurSec * 1000);

          const rawWinCues: SubtitleCue[] = parsedObj.cues
            .map((c: { start_ms: number; end_ms: number; text: string }, idx: number) => {
              let rawStart = Math.round((Number(c.start_ms) || 0) * unitMultiplier);
              let rawEnd = Math.round((Number(c.end_ms) || 0) * unitMultiplier);
              // If Gemini returned global timestamps instead of window-relative timestamps, rebase them
              if (winOffsetMs > 0 && rawStart >= winOffsetMs - 1500) {
                rawStart = Math.max(0, rawStart - winOffsetMs);
                rawEnd = Math.max(rawStart + 800, rawEnd - winOffsetMs);
              }
              const startMs = Math.max(0, Math.min(winDurMs - 400, rawStart || idx * 2500));
              const endMs = Math.max(startMs + 800, Math.min(winDurMs, rawEnd || startMs + 2400));
              return {
                id: `cue-w-${idx + 1}`,
                start_ms: startMs,
                end_ms: endMs,
                text: String(c.text || '').trim()
              };
            })
            .filter((c: SubtitleCue) => c.text.length > 0);

          if (rawWinCues.length === 0) return [];
          const splitWin = splitCuesIntoShortPhrases(rawWinCues, isTranslateMode ? 54 : 64);
          const normWin = isTranslateMode
            ? normalizeDialogueSubtitleCues(splitWin, winDurSec)
            : normalizeRecapTimelineCues(splitWin, winDurSec);
          return normWin.map((c) => ({
            ...c,
            start_ms: c.start_ms + winOffsetMs,
            end_ms: c.end_ms + winOffsetMs
          }));
        };

        let multiWindowSucceeded = false;
        if (timeWindows.length > 1) {
          try {
            const stitchedCues: SubtitleCue[] = [];
            let storyContextHint = '';
            for (const win of timeWindows) {
              const pct = 58 + Math.round(((win.index + 1) / timeWindows.length) * 12);
              onProgress(
                pct,
                `Writing accurate scene script (Part ${win.index + 1}/${timeWindows.length}: ${Math.floor(win.startSec / 60)}:${String(Math.round(win.startSec % 60)).padStart(2, '0')}–${Math.floor(win.endSec / 60)}:${String(Math.round(win.endSec % 60)).padStart(2, '0')})...`
              );

              let winAudioBase64: string | null = null;
              let winAudioBuffer: Buffer | null = null;
              if (inputVideoPath && fs.existsSync(inputVideoPath)) {
                const winMp3Path = path.join(JOBS_TEMP_DIR, `${jobId}_win_${win.index}.mp3`);
                try {
                  await execFileAsync('ffmpeg', [
                    '-y',
                    '-ss',
                    String(win.startSec),
                    '-t',
                    String(win.durationSec),
                    '-i',
                    inputVideoPath,
                    '-vn',
                    '-ar',
                    '16000',
                    '-ac',
                    '1',
                    '-b:a',
                    '48k',
                    winMp3Path
                  ]);
                  if (fs.existsSync(winMp3Path) && fs.statSync(winMp3Path).size > 200) {
                    winAudioBuffer = fs.readFileSync(winMp3Path);
                    winAudioBase64 = winAudioBuffer.toString('base64');
                  }
                  if (fs.existsSync(winMp3Path)) fs.unlinkSync(winMp3Path);
                } catch {}
              }

              const winKeyframes = await extractVisualKeyframesForSegment(
                inputVideoPath,
                win.startSec,
                win.durationSec,
                `w${win.index}`
              );

              let winTranscript = sliceTimedTranscriptForWindow(
                effectiveContext,
                win.startSec,
                win.endSec
              );
              if (!winTranscript && winAudioBuffer) {
                try {
                  if (freeGroqKey) {
                    winTranscript = await transcribeWithDirectGroqKey(winAudioBuffer, freeGroqKey, sttModel);
                  } else if (!isFreeMode) {
                    const poolStt = await transcribeAudioWithGroqPool(winAudioBuffer, sttModel);
                    if (poolStt?.text) winTranscript = poolStt.text;
                  }
                } catch {}
              }

              const winPrompt = buildPromptForWindow(
                win.durationSec,
                winTranscript,
                win.index,
                timeWindows.length,
                win.startSec,
                win.endSec,
                storyContextHint,
                winKeyframes.length > 0
              );
              const winParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
              for (const kf of winKeyframes) {
                winParts.push({
                  text: `[Visual Scene Frame at ${kf.timeBadge} (${kf.relSec * 1000}ms)]`
                });
                winParts.push({
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: kf.base64
                  }
                });
              }
              if (winAudioBase64) {
                winParts.push({
                  inlineData: {
                    mimeType: 'audio/mp3',
                    data: winAudioBase64
                  }
                });
              } else if (extractedAudioBase64) {
                winParts.push({
                  inlineData: {
                    mimeType: 'audio/mp3',
                    data: extractedAudioBase64
                  }
                });
              }
              winParts.push({ text: winPrompt });

              const winResp = await invokeGeminiWithParts(winParts);
              if (!winResp?.text) {
                throw new Error(`Empty Gemini response for window ${win.index + 1}`);
              }
              const winParsed = JSON.parse(winResp.text);
              if (win.index === 0 && winParsed.title) {
                finalTitle = winParsed.title;
              }
              const winCues = parseWindowResponseCues(
                winParsed,
                win.durationSec,
                Math.round(win.startSec * 1000)
              );
              if (winCues.length === 0) {
                throw new Error(`Zero cues parsed for window ${win.index + 1}`);
              }
              storyContextHint = [
                winCues[0]?.text,
                winCues[Math.floor(winCues.length / 2)]?.text,
                winCues[winCues.length - 1]?.text
              ]
                .filter(Boolean)
                .join(' -> ');
              stitchedCues.push(...winCues);
            }

            if (stitchedCues.length > 0) {
              let seamCursorMs = 60;
              finalCues = stitchedCues.map((c, idx) => {
                const s = Math.max(seamCursorMs, c.start_ms);
                const e = Math.max(s + 450, c.end_ms);
                seamCursorMs = e + 90;
                return {
                  ...c,
                  id: `cue-${idx + 1}`,
                  start_ms: s,
                  end_ms: e
                };
              });
              finalScriptText = finalCues.map((c) => c.text).join(' ');
              usedLiveGemini = true;
              multiWindowSucceeded = true;
            }
          } catch (winErr) {
            console.warn('[Gemini Multi-Window] Falling back to single-pass script generation:', winErr);
          }
        }

        if (!multiWindowSucceeded) {
          const singlePassKeyframes = await extractVisualKeyframesForSegment(
            inputVideoPath,
            0,
            safeDuration,
            'full'
          );
          const singlePassPrompt = buildPromptForWindow(
            safeDuration,
            effectiveContext,
            0,
            1,
            0,
            safeDuration,
            '',
            singlePassKeyframes.length > 0
          );
          const contentsParts: Array<
            { text: string } | { inlineData: { mimeType: string; data: string } }
          > = [];
          for (const kf of singlePassKeyframes) {
            contentsParts.push({
              text: `[Visual Scene Frame at ${kf.timeBadge} (${kf.relSec * 1000}ms)]`
            });
            contentsParts.push({
              inlineData: {
                mimeType: 'image/jpeg',
                data: kf.base64
              }
            });
          }
          if (extractedAudioBase64) {
            contentsParts.push({
              inlineData: {
                mimeType: 'audio/mp3',
                data: extractedAudioBase64
              }
            });
          }
          contentsParts.push({ text: singlePassPrompt });

          const response = await invokeGeminiWithParts(contentsParts);
          if (response?.text) {
            const parsed = JSON.parse(response.text);
            if (parsed.title) finalTitle = parsed.title;
            const parsedSingleCues = parseWindowResponseCues(parsed, safeDuration, 0);
            if (parsedSingleCues.length > 0) {
              finalCues = parsedSingleCues.map((c, idx) => ({ ...c, id: `cue-${idx + 1}` }));
              finalScriptText = finalCues.map((c) => c.text).join(' ');
              if (Array.isArray(parsed.highlight_clips) && parsed.highlight_clips.length > 0) {
                finalHighlights = parsed.highlight_clips;
              }
              usedLiveGemini = true;
            }
          } else if (!hasAnyGeminiKey) {
            geminiFailureReason = 'No Gemini API Key configured';
          } else {
            geminiFailureReason = 'Gemini returned empty script or all keys exhausted quota';
          }
        }
      } catch (err: any) {
        geminiFailureReason = err?.message ? String(err.message) : String(err || 'Gemini error');
        console.warn('Gemini script generation fell back:', geminiFailureReason);
      }
    }

    // For Verbatim Original Speech STT mode, timed Whisper segments can satisfy cues directly if Gemini failed
    if (isSttOnly && sttMode === 'transcribe' && !usedLiveGemini && groqTranscript) {
      const parsedWhisperCues = parseTimedSttTranscriptToCues(groqTranscript, safeDuration);
      if (parsedWhisperCues.length > 0) {
        finalCues = parsedWhisperCues;
        finalScriptText = finalCues.map((c) => c.text).join(' ');
        usedLiveGemini = true;
      }
    }

    const hasUploadedSource = Boolean(
      inputVideoPath ||
        r2ObjectKey ||
        localUploadId ||
        (videoBase64 && videoBase64.length > 100)
    );
    if (
      shouldFailInsteadOfWeddingFallback({
        isWeddingDemoClip: isWeddingDramaClip,
        usedLiveGemini,
        hasUploadedSource
      })
    ) {
      const errMeta = detectGeminiFailureMessage(
        geminiFailureReason,
        hasAnyGeminiKey,
        Boolean(isFreeMode)
      );
      return {
        ok: false,
        statusCode: 502,
        error: errMeta.messageMy,
        errorEn: errMeta.messageEn,
        errorCode: errMeta.code
      };
    }

    if (isSttOnly) {
      onProgress(100, 'Done!');
      return {
        ok: true,
        payload: {
          ok: true,
          job_id: jobId,
          title: finalTitle,
          script_text: finalScriptText,
          system_prompt_used: systemInstruction,
          cues: finalCues,
          highlight_clips: [],
          stt_provider: sttProviderUsed,
          used_live_gemini: usedLiveGemini,
          elapsed_ms: Date.now() - startTime
        }
      };
    }

    // 3. Synthesize Real Spoken Voiceover WAV (skip completely in Captions-Only mode to preserve original audio & save quota)
    let voiceoverWavBuffer: Buffer | null = null;
    const voiceDef = VOICE_OPTIONS.find((v) => v.id === voiceGender) || VOICE_OPTIONS[0];
    if (!isCaptionsOnlyMode) {
      onProgress(74, 'Synthesizing AI voiceover...');
      const useGeminiPrimary =
        !isFreeMode &&
        (ttsEngine === 'gemini-2.5-flash-preview-tts' || voiceDef.tier === 'pro');

      if (useGeminiPrimary) {
        try {
          const geminiTtsRun = await executeWithGeminiKeyPool(async (ai) => {
            return await synthesizeGeminiProVoiceCuesWavBuffer(
              ai,
              finalCues,
              voiceDef.geminiVoice,
              jobId,
              safeDuration,
              true
            );
          });
          if (geminiTtsRun?.result) {
            voiceoverWavBuffer = geminiTtsRun.result.wavBuffer;
            finalCues = geminiTtsRun.result.syncedCues;
            finalScriptText = finalCues.map((c) => c.text).join(' ');
          }
        } catch {}
      }

      if (!voiceoverWavBuffer) {
        const neuralResult = await synthesizeNeuralSpokenWavBuffer(
          finalCues,
          targetLanguage,
          voiceGender,
          jobId,
          pitchShift,
          safeDuration,
          breathPauseMs,
          dynamicTempoFit
        );

        if (neuralResult) {
          voiceoverWavBuffer = neuralResult.wavBuffer;
          finalCues = neuralResult.syncedCues;
          finalScriptText = finalCues.map((c) => c.text).join(' ');
        }
      }

      if (!voiceoverWavBuffer && !isFreeMode) {
        try {
          const geminiFallbackRun = await executeWithGeminiKeyPool(async (ai) => {
            return await synthesizeGeminiProVoiceCuesWavBuffer(
              ai,
              finalCues,
              voiceDef.geminiVoice,
              jobId,
              safeDuration,
              true
            );
          });
          if (geminiFallbackRun?.result) {
            voiceoverWavBuffer = geminiFallbackRun.result.wavBuffer;
            finalCues = geminiFallbackRun.result.syncedCues;
            finalScriptText = finalCues.map((c) => c.text).join(' ');
          }
        } catch {}
      }

      if (!voiceoverWavBuffer) {
        voiceoverWavBuffer = synthesizeCadenceWavBuffer(finalCues, safeDuration, voiceGender);
      }
    }

    finalCues = isTranslateMode
      ? normalizeDialogueSubtitleCues(splitCuesIntoShortPhrases(finalCues, 54), safeDuration)
      : splitCuesIntoShortPhrases(finalCues, 64);
    finalCues = finalCues.map((c) => ({ ...c, burmeseText: c.burmeseText || c.text }));
    finalScriptText = finalCues.map((c) => c.burmeseText || c.text).join(' ');

    if (
      subtitleConfig?.subtitleLanguage &&
      subtitleConfig.subtitleLanguage !== targetLanguage
    ) {
      onProgress(84, `Translating subtitles to ${subtitleConfig.subtitleLanguage.toUpperCase()}...`);
      finalCues = await translateSubtitleCuesToLanguage(
        finalCues,
        subtitleConfig.subtitleLanguage,
        !isFreeMode
      );
    }

    let voiceoverWavPath: string | null = null;
    let audioBase64: string | undefined = undefined;
    let voiceoverMp3Url: string | undefined = undefined;

    if (voiceoverWavBuffer) {
      voiceoverWavPath = path.join(JOBS_TEMP_DIR, `${jobId}_voiceover.wav`);
      fs.writeFileSync(voiceoverWavPath, voiceoverWavBuffer);
      audioBase64 =
        voiceoverWavBuffer.length <= 2_500_000
          ? voiceoverWavBuffer.toString('base64')
          : undefined;

      onProgress(88, 'Syncing voiceover & video...');
      const mp3Filename = `${jobId}_voiceover.mp3`;
      const voiceoverMp3Path = path.join(JOBS_TEMP_DIR, mp3Filename);
      if (await convertWavToMp3(voiceoverWavPath, voiceoverMp3Path)) {
        voiceoverMp3Url = `/api/recap/audio/${mp3Filename}`;
      }
    } else {
      onProgress(88, 'Syncing subtitles & original audio...');
    }

    // 4. Mux fast preview MP4 (<2s async -c:v copy) so Cloudflare/Nginx never time out
    let dubbedVideoUrl: string | undefined = undefined;
    let previewVideoUrl: string | undefined = undefined;
    const outFilename = `${jobId}_recap.mp4`;
    const outputVideoPath = path.join(JOBS_TEMP_DIR, outFilename);
    const previewFilename = `${jobId}_preview.mp4`;
    const previewVideoPath = path.join(JOBS_TEMP_DIR, previewFilename);

    const initialSignature = computeRenderExportSignature({
      jobId,
      mode,
      translateAudio,
      aspectRatio,
      mirrorFlip: effectiveServerEffects.mirror,
      effects: effectiveServerEffects,
      blurEnabled,
      blurRegions,
      subtitleConfig,
      editConfig: effectiveServerEditConfig,
      cues: finalCues
    });

    if (inputVideoPath && fs.existsSync(inputVideoPath)) {
      const previewOk = await muxVideoWithMixedAudio(
        inputVideoPath,
        voiceoverWavPath,
        previewVideoPath,
        false,
        false,
        undefined,
        undefined,
        false,
        undefined,
        'mux_prev',
        'original',
        undefined,
        isCaptionsOnlyMode,
        undefined,
        safeDuration
      );
      if (previewOk) {
        previewVideoUrl = `/api/recap/video/${previewFilename}`;
        dubbedVideoUrl = previewVideoUrl;
      } else {
        const muxSuccess = await muxVideoWithMixedAudio(
          inputVideoPath,
          voiceoverWavPath,
          outputVideoPath,
          Boolean(effectiveServerEffects.mirror),
          false,
          finalCues,
          subtitleConfig,
          Boolean(blurEnabled),
          blurRegions,
          jobId,
          aspectRatio,
          effectiveServerEditConfig,
          isCaptionsOnlyMode,
          effectiveServerEffects,
          safeDuration
        );
        if (muxSuccess) {
          dubbedVideoUrl = `/api/recap/video/${outFilename}`;
          renderedJobExportCache.set(jobId, {
            signature: initialSignature,
            outFilename,
            outputVideoPath
          });
        }
      }
    } else if (voiceoverWavPath) {
      const previewOk = await generateStandaloneRecapMp4(
        voiceoverWavPath,
        previewVideoPath,
        safeDuration
      );
      if (previewOk) {
        previewVideoUrl = `/api/recap/video/${previewFilename}`;
      }

      if (safeDuration > 120 && previewVideoUrl) {
        dubbedVideoUrl = previewVideoUrl;
      } else {
        const standaloneOk = await generateStandaloneRecapMp4(
          voiceoverWavPath,
          outputVideoPath,
          safeDuration,
          finalCues,
          subtitleConfig,
          Boolean(blurEnabled),
          blurRegions,
          Boolean(effectiveServerEffects.mirror),
          jobId,
          aspectRatio,
          effectiveServerEditConfig,
          effectiveServerEffects
        );
        if (standaloneOk) {
          dubbedVideoUrl = `/api/recap/video/${outFilename}`;
          renderedJobExportCache.set(jobId, {
            signature: initialSignature,
            outFilename,
            outputVideoPath
          });
        } else if (previewVideoUrl) {
          dubbedVideoUrl = previewVideoUrl;
        }
      }
    }

    onProgress(97, isCaptionsOnlyMode ? 'Finalizing subtitled video...' : 'Finalizing recap video...');
    let r2OutputUrl: string | undefined = undefined;
    if (effectiveServerR2Config && dubbedVideoUrl && fs.existsSync(outputVideoPath)) {
      try {
        const outKey = buildR2ObjectKey(`${jobId}_recap.mp4`, 'outputs');
        const uploadedOut = await uploadLocalFileToR2(effectiveServerR2Config, outputVideoPath, outKey, 'video/mp4');
        r2OutputUrl = uploadedOut.publicUrl || uploadedOut.signedGetUrl;
      } catch (r2UpErr) {
        console.warn('[R2 Direct] Output mirror upload skipped:', r2UpErr);
      }
    }

    return {
      ok: true,
      payload: {
        ok: true,
        job_id: jobId,
        duration_sec: safeDuration,
        title: finalTitle,
        script_text: finalScriptText,
        system_prompt_used: systemInstruction,
        cues: finalCues,
        highlight_clips: finalHighlights,
        translate_audio: mode === 'translate' ? translateAudio : undefined,
        audio_base64: audioBase64,
        audio_mime: voiceoverWavBuffer ? 'audio/wav' : undefined,
        voiceover_mp3_url: voiceoverMp3Url,
        preview_video_url: previewVideoUrl || dubbedVideoUrl,
        dubbed_video_url: dubbedVideoUrl,
        r2_output_url: r2OutputUrl,
        storage_mode: effectiveServerR2Config ? 'r2_direct' : 'local_stream',
        stt_provider: sttProviderUsed,
        voice_engine: isCaptionsOnlyMode ? 'original-audio' : voiceDef.ttsEngineId,
        used_live_gemini: usedLiveGemini,
        elapsed_ms: Date.now() - startTime
      }
    };
  }

  // TTAK MOVIE RECAP Free Recap & Studio Auto-Flow Asset Generator + Audio/Video Mixer
  // Supports `asyncMode: true` + `/api/recap/job-status/:jobId` polling so long 3+ min videos never hit Cloudflare's 100s timeout!
  app.post('/api/recap/free/generate-assets', async (req, res) => {
    pruneOldRecapJobs();
    const startTime = Date.now();
    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const asyncMode = Boolean(req.body?.asyncMode);

    if (asyncMode) {
      const initialJob: RecapGenerationJobState = {
        jobId,
        status: 'processing',
        progress: 38,
        stageMessage: 'Preparing video & extracting audio...',
        createdAt: Date.now()
      };
      recapGenerationJobs.set(jobId, initialJob);
      saveRecapJobStatusToDisk(initialJob);

      void (async () => {
        try {
          const outcome = await runRecapAssetGenerationPipeline(
            jobId,
            startTime,
            req.body,
            (pct, msg) => {
              const cur = recapGenerationJobs.get(jobId);
              if (cur && cur.status === 'processing') {
                cur.progress = pct;
                cur.stageMessage = msg;
                saveRecapJobStatusToDisk(cur);
              }
            }
          );
          const cur = recapGenerationJobs.get(jobId);
          if (!cur) return;
          if (outcome.ok) {
            cur.status = 'done';
            cur.progress = 100;
            cur.stageMessage = 'Done!';
            cur.result = outcome.payload;
          } else {
            cur.status = 'error';
            cur.error = outcome.error;
            cur.errorEn = outcome.errorEn;
            cur.errorCode = outcome.errorCode;
          }
          saveRecapJobStatusToDisk(cur);
        } catch (err) {
          const cur = recapGenerationJobs.get(jobId);
          if (cur) {
            cur.status = 'error';
            cur.error = err instanceof Error ? err.message : 'Failed to generate recap assets';
            saveRecapJobStatusToDisk(cur);
          }
        }
      })();

      res.json({
        ok: true,
        async: true,
        job_id: jobId,
        status: 'processing',
        progress: 38,
        stage_message: initialJob.stageMessage
      });
      return;
    }

    try {
      const outcome = await runRecapAssetGenerationPipeline(jobId, startTime, req.body, () => {});
      if (!outcome.ok) {
        res.status(outcome.statusCode).json({
          ok: false,
          error: outcome.error,
          error_en: outcome.errorEn,
          error_code: outcome.errorCode
        });
        return;
      }
      res.json(outcome.payload);
    } catch (error) {
      console.error('Error in /api/recap/free/generate-assets:', error);
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to generate recap assets'
      });
    }
  });

  app.get('/api/recap/job-status/:jobId', (req, res) => {
    const safeId = (req.params.jobId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const job = recapGenerationJobs.get(safeId) || loadRecapJobStatusFromDisk(safeId);
    if (!job) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(404).json({ ok: false, error: 'Recap job not found' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: job.status !== 'error',
      job_id: job.jobId,
      status: job.status,
      progress: job.progress,
      stage_message: job.stageMessage,
      result: job.status === 'done' ? job.result : undefined,
      error: job.error,
      error_en: job.errorEn,
      error_code: job.errorCode
    });
  });

  // Standalone TTS endpoint for Voice Preview before generating video + regenerating cues
  const ttsPreviewCache = new Map<
    string,
    { audio_base64: string; voice_engine: string; tts_provider: string; sample_text: string; expiresAt: number }
  >();

  app.post('/api/recap/tts', async (req, res) => {
    const jobId = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    try {
      const {
        text,
        voiceGender = 'male',
        targetLanguage = 'my',
        durationSec = 5,
        ttsEngine
      } = req.body as {
        text?: string;
        voiceGender?: VoiceGender;
        targetLanguage?: TargetLanguageCode;
        durationSec?: number;
        ttsEngine?: TtsEngineId;
      };
      const voiceDef = VOICE_OPTIONS.find((v) => v.id === voiceGender) || VOICE_OPTIONS[0];
      const sampleText =
        text && text.trim().length > 0
          ? text.trim()
          : getVoicePreviewSampleText(voiceGender, targetLanguage);

      const cacheKey = `${voiceGender}:${targetLanguage}:${ttsEngine || 'auto'}:${sampleText}`;
      const cached = ttsPreviewCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        res.json({
          ok: true,
          sample_text: cached.sample_text,
          audio_base64: cached.audio_base64,
          voice_engine: cached.voice_engine,
          tts_provider: cached.tts_provider
        });
        return;
      }

      const useGeminiPreview =
        voiceDef.tier === 'pro' || ttsEngine === 'gemini-2.5-flash-preview-tts';

      let wavBuf: Buffer | null = null;
      let providerUsed = voiceDef.ttsEngineId;

      if (useGeminiPreview) {
        try {
          const geminiPreviewRun = await executeWithGeminiKeyPool(async (ai) => {
            return await synthesizeGeminiProVoiceWavBuffer(
              ai,
              sampleText,
              voiceDef.geminiVoice,
              jobId,
              undefined,
              true
            );
          });
          if (geminiPreviewRun?.result) {
            wavBuf = geminiPreviewRun.result.wavBuffer;
            providerUsed = `gemini-2.5-flash-preview-tts:${voiceDef.geminiVoice}`;
          }
        } catch {}
      }

      const cues: SubtitleCue[] = [
        {
          id: 'preview-1',
          start_ms: 60,
          end_ms: Math.max(2500, durationSec * 1000 - 100),
          text: sampleText
        }
      ];

      if (!wavBuf) {
        const neuralRes = await synthesizeNeuralSpokenWavBuffer(
          cues,
          targetLanguage,
          voiceGender,
          jobId,
          true,
          durationSec
        );
        if (neuralRes) {
          wavBuf = neuralRes.wavBuffer;
          providerUsed = `${neuralRes.voiceEngineUsed}:${voiceGender}`;
        }
      }

      if (!wavBuf) {
        wavBuf = synthesizeCadenceWavBuffer(cues, durationSec, voiceGender);
      }

      const audioBase64 = wavBuf.toString('base64');
      if (ttsPreviewCache.size >= 64) {
        const firstKey = ttsPreviewCache.keys().next().value;
        if (firstKey) ttsPreviewCache.delete(firstKey);
      }
      ttsPreviewCache.set(cacheKey, {
        audio_base64: audioBase64,
        voice_engine: voiceDef.ttsEngineId,
        tts_provider: providerUsed,
        sample_text: sampleText,
        expiresAt: Date.now() + 6 * 3600_000
      });

      res.json({
        ok: true,
        sample_text: sampleText,
        audio_base64: audioBase64,
        voice_engine: voiceDef.ttsEngineId,
        tts_provider: providerUsed
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // ============================================================================
  // TELEGRAM BOT & PAYMENT APPROVAL SYSTEM
  // Bot: @ttakrecap_bot (8931773634:AAH2f3iOB5rDU3CgTH2nQ3guS1HyqJZXYjM)
  // Admin Chat ID: 1981253384
  // Mobile Wallets:
  //   Wave Pay: 09772350006 (KAUNG HTET)
  //   KBZ Pay: 09797407339 (Ma Pyone Pyone)
  // ============================================================================
  const TELEGRAM_BOT_TOKEN = '8931773634:AAH2f3iOB5rDU3CgTH2nQ3guS1HyqJZXYjM';
  const TELEGRAM_ADMIN_CHAT_ID = '1981253384';
  const PAYMENT_FILE = path.join(JOBS_TEMP_DIR, 'payment_submissions.json');
  const USER_BALANCES_FILE = path.join(JOBS_TEMP_DIR, 'user_balances.json');

  interface UserBalanceRecord {
    credits: number;
    activePlanId?: string;
    lastUpdated: number;
  }

  function loadUserBalances(): Record<string, UserBalanceRecord> {
    try {
      if (fs.existsSync(USER_BALANCES_FILE)) {
        return JSON.parse(fs.readFileSync(USER_BALANCES_FILE, 'utf-8'));
      }
    } catch (e) {
      console.warn('Error reading user balances:', e);
    }
    return {};
  }

  function saveUserBalances(data: Record<string, UserBalanceRecord>) {
    try {
      fs.writeFileSync(USER_BALANCES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Error saving user balances:', e);
    }
  }

  function grantUserCredits(userId: string, credits: number, planName?: string): number {
    const balances = loadUserBalances();
    const current = balances[userId]?.credits || 0;
    const newTotal = current + credits;
    balances[userId] = {
      credits: newTotal,
      activePlanId: planName || balances[userId]?.activePlanId || 'starter-pack',
      lastUpdated: Date.now()
    };
    saveUserBalances(balances);
    return newTotal;
  }

  // Persistent User Accounts, Sessions & Daily Free Mode Usage Tracking
  const USERS_FILE = path.join(JOBS_TEMP_DIR, 'users.json');
  const SESSIONS_FILE = path.join(JOBS_TEMP_DIR, 'user_sessions.json');
  const USER_USAGE_FILE = path.join(JOBS_TEMP_DIR, 'user_daily_usage.json');
  const FREE_DAILY_VIDEO_LIMIT_SERVER = 5;

  function getMyanmarDateKey(): string {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Yangon' }).format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }

  interface StoredUserAccount {
    userId: string;
    name: string;
    email: string;
    provider: 'google' | 'email' | 'telegram';
    photoUrl?: string;
    telegramChatId?: string;
    passwordHash?: string;
    passwordSalt?: string;
    createdAt: number;
  }

  interface StoredSession {
    token: string;
    userId: string;
    createdAt: number;
    expiresAt: number;
  }

  interface UserDailyUsageRecord {
    dateKey: string;
    freeVideosUsedToday: number;
    totalFreeVideos: number;
    totalPaidVideos: number;
    lastUsedAt: number;
    lastMode?: 'free' | 'paid';
  }

  function loadUsers(): StoredUserAccount[] {
    try {
      if (fs.existsSync(USERS_FILE)) {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      }
    } catch {}
    return [];
  }

  function saveUsers(users: StoredUserAccount[]) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Error saving users:', e);
    }
  }

  function loadSessions(): Record<string, StoredSession> {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
      }
    } catch {}
    return {};
  }

  function saveSessions(sessions: Record<string, StoredSession>) {
    try {
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Error saving sessions:', e);
    }
  }

  function loadUserUsageMap(): Record<string, UserDailyUsageRecord> {
    try {
      if (fs.existsSync(USER_USAGE_FILE)) {
        return JSON.parse(fs.readFileSync(USER_USAGE_FILE, 'utf-8'));
      }
    } catch {}
    return {};
  }

  function saveUserUsageMap(usageMap: Record<string, UserDailyUsageRecord>) {
    try {
      fs.writeFileSync(USER_USAGE_FILE, JSON.stringify(usageMap, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Error saving user daily usage:', e);
    }
  }

  function getUserFreeUsageSnapshot(userId: string) {
    const todayKey = getMyanmarDateKey();
    const usageMap = loadUserUsageMap();
    const rec = usageMap[userId];
    const freeUsedToday = rec && rec.dateKey === todayKey ? Math.max(0, rec.freeVideosUsedToday || 0) : 0;
    const freeRemaining = Math.max(0, FREE_DAILY_VIDEO_LIMIT_SERVER - freeUsedToday);
    return {
      dateKey: todayKey,
      freeUsedToday,
      freeRemaining,
      freeLimit: FREE_DAILY_VIDEO_LIMIT_SERVER,
      usedFreeToday: freeUsedToday > 0,
      totalFreeVideos: rec?.totalFreeVideos || 0,
      totalPaidVideos: rec?.totalPaidVideos || 0,
      lastUsedAt: rec?.lastUsedAt || 0,
      lastMode: rec?.lastMode
    };
  }

  function recordUserFreeUsage(userId: string) {
    const todayKey = getMyanmarDateKey();
    const usageMap = loadUserUsageMap();
    const prev = usageMap[userId];
    const prevTodayCount = prev && prev.dateKey === todayKey ? Math.max(0, prev.freeVideosUsedToday || 0) : 0;
    const nextTodayCount = prevTodayCount + 1;
    usageMap[userId] = {
      dateKey: todayKey,
      freeVideosUsedToday: nextTodayCount,
      totalFreeVideos: (prev?.totalFreeVideos || 0) + 1,
      totalPaidVideos: prev?.totalPaidVideos || 0,
      lastUsedAt: Date.now(),
      lastMode: 'free'
    };
    saveUserUsageMap(usageMap);
    return getUserFreeUsageSnapshot(userId);
  }

  function recordUserPaidUsage(userId: string) {
    if (!userId) return;
    const todayKey = getMyanmarDateKey();
    const usageMap = loadUserUsageMap();
    const prev = usageMap[userId];
    const prevTodayCount = prev && prev.dateKey === todayKey ? Math.max(0, prev.freeVideosUsedToday || 0) : 0;
    usageMap[userId] = {
      dateKey: todayKey,
      freeVideosUsedToday: prevTodayCount,
      totalFreeVideos: prev?.totalFreeVideos || 0,
      totalPaidVideos: (prev?.totalPaidVideos || 0) + 1,
      lastUsedAt: Date.now(),
      lastMode: 'paid'
    };
    saveUserUsageMap(usageMap);
  }

  function getWebsiteUserStats() {
    const users = loadUsers();
    const balances = loadUserBalances();
    const payments = loadPayments();

    const enriched = users.map((u) => {
      const bal = balances[u.userId] || { credits: 0, activePlanId: 'free', lastUpdated: 0 };
      const hasApprovedPayment = payments.some(
        (p) => p.userId === u.userId && p.status === 'approved'
      );
      const isPaidUser =
        (bal.credits || 0) > 0 ||
        Boolean(bal.activePlanId && bal.activePlanId !== 'free') ||
        hasApprovedPayment;
      const usage = getUserFreeUsageSnapshot(u.userId);
      return {
        ...u,
        credits: bal.credits || 0,
        activePlanId: bal.activePlanId || 'free',
        isPaidUser,
        usage
      };
    });

    const sorted = [...enriched].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const paidUsers = sorted.filter((u) => u.isPaidUser);
    const freeUsers = sorted.filter((u) => !u.isPaidUser);
    const activeFreeTodayUsers = sorted.filter((u) => u.usage.usedFreeToday);
    const totalFreeVideosToday = sorted.reduce((acc, u) => acc + u.usage.freeUsedToday, 0);

    return {
      dateKey: getMyanmarDateKey(),
      totalUsers: sorted.length,
      freeUsersCount: freeUsers.length,
      paidUsersCount: paidUsers.length,
      activeFreeTodayCount: activeFreeTodayUsers.length,
      totalFreeVideosToday,
      users: sorted,
      freeUsers,
      paidUsers,
      activeFreeTodayUsers
    };
  }

  interface PaymentRecord {
    id: string;
    userId: string;
    planName: string;
    credits: number;
    amountMmk: string;
    walletType: string;
    walletAccountName: string;
    walletPhone: string;
    senderPhone: string;
    txnId: string;
    slipBase64?: string | null;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    createdAt: number;
    approvedAt?: number;
    telegramDelivered: boolean;
    telegramError?: string;
  }

  function loadPayments(): PaymentRecord[] {
    try {
      if (fs.existsSync(PAYMENT_FILE)) {
        const raw = fs.readFileSync(PAYMENT_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Error reading payment submissions:', e);
    }
    // Seed initial realistic payment records
    const initialRecords: PaymentRecord[] = [
      {
        id: 'txn_seed_1',
        userId: 'UID-84920',
        planName: 'Starter Pack',
        credits: 500,
        amountMmk: '12,000 MMK',
        walletType: 'KBZ Pay',
        walletAccountName: 'Ma Pyone Pyone',
        walletPhone: '09797407339',
        senderPhone: '09965412890',
        txnId: '521409',
        slipBase64: null,
        status: 'pending',
        createdAt: Date.now() - 25 * 60 * 1000,
        telegramDelivered: false
      },
      {
        id: 'txn_seed_2',
        userId: 'UID-38192',
        planName: 'Creator Pro',
        credits: 1500,
        amountMmk: '30,000 MMK',
        walletType: 'Wave Pay',
        walletAccountName: 'KAUNG HTET',
        walletPhone: '09772350006',
        senderPhone: '09781234567',
        txnId: '894120',
        slipBase64: null,
        status: 'pending',
        createdAt: Date.now() - 45 * 60 * 1000,
        telegramDelivered: false
      },
      {
        id: 'txn_seed_3',
        userId: 'UID-91823',
        planName: 'Creator Pro Max',
        credits: 3500,
        amountMmk: '65,000 MMK',
        walletType: 'Wave Pay',
        walletAccountName: 'KAUNG HTET',
        walletPhone: '09772350006',
        senderPhone: '09420088912',
        txnId: '310948',
        slipBase64: null,
        status: 'approved',
        createdAt: Date.now() - 3 * 3600 * 1000,
        approvedAt: Date.now() - 2 * 3600 * 1000,
        telegramDelivered: true
      }
    ];
    savePayments(initialRecords);
    return initialRecords;
  }

  function savePayments(records: PaymentRecord[]) {
    try {
      fs.writeFileSync(PAYMENT_FILE, JSON.stringify(records, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Error saving payment submissions:', e);
    }
  }

  const PUBLIC_ADMIN_URL =
    process.env.APP_URL ||
    'https://ais-pre-iwslrdcjvk4m6m3i2tsp6k-944018305379.asia-southeast1.run.app/admin';

  async function notifyTelegramAdmin(
    text: string,
    photoBase64?: string | null,
    replyMarkup?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (photoBase64 && photoBase64.startsWith('data:image')) {
        const matches = photoBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches && matches[2]) {
          try {
            const imageBuffer = Buffer.from(matches[2], 'base64');
            const formData = new FormData();
            formData.append('chat_id', TELEGRAM_ADMIN_CHAT_ID);
            formData.append('caption', text);
            if (replyMarkup) {
              formData.append('reply_markup', JSON.stringify(replyMarkup));
            }
            const blob = new Blob([imageBuffer], { type: `image/${matches[1] || 'jpeg'}` });
            formData.append('photo', blob, `slip_${Date.now()}.${matches[1] || 'jpg'}`);

            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
              method: 'POST',
              body: formData
            });
            const resJson = (await response.json()) as any;
            if (resJson.ok) {
              return { success: true };
            }
          } catch (photoErr) {
            console.warn('sendPhoto error, falling back to sendMessage:', photoErr);
          }
        }
      }

      const postBody: Record<string, any> = {
        chat_id: TELEGRAM_ADMIN_CHAT_ID,
        text: text
      };
      if (replyMarkup) {
        postBody.reply_markup = replyMarkup;
      }

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postBody)
      });
      const resJson = (await response.json()) as any;
      if (resJson.ok) {
        return { success: true };
      }
      return { success: false, error: resJson.description || 'Telegram API returned error' };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  // Answer callback queries from inline buttons
  async function answerTelegramCallbackQuery(queryId: string, text?: string, showAlert = false) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: queryId,
          text: text,
          show_alert: showAlert
        })
      });
    } catch (e) {
      console.warn('answerTelegramCallbackQuery error:', e);
    }
  }

  async function sendTelegramUserStatsReport(
    chatId: string,
    filter: 'all' | 'free' | 'paid' | 'free_active' = 'all'
  ) {
    try {
      const stats = getWebsiteUserStats();
      const targetList =
        filter === 'paid'
          ? stats.paidUsers
          : filter === 'free'
            ? stats.freeUsers
            : filter === 'free_active'
              ? stats.activeFreeTodayUsers
              : stats.users;

      const titleMap: Record<typeof filter, string> = {
        all: '👥 Website Sign Up Users အားလုံး',
        free: '🆓 Free Users စာရင်း',
        paid: '💎 Paid Users စာရင်း',
        free_active: `🎬 ယနေ့ (${stats.dateKey}) Free Mode သုံးနေသူများ`
      };

      const lines: string[] = [
        `📊 [TTAK RECAP] ${titleMap[filter]}`,
        `━━━━━━━━━━━━━━━━━━━`,
        `👥 စုစုပေါင်း Sign Up: ${stats.totalUsers} ဦး`,
        `🆓 Free Users: ${stats.freeUsersCount} ဦး | 💎 Paid Users: ${stats.paidUsersCount} ဦး`,
        `🎬 ယနေ့ Free Mode သုံးနေသူ: ${stats.activeFreeTodayCount} ဦး (စုစုပေါင်း ${stats.totalFreeVideosToday} ပုဒ်)`,
        `━━━━━━━━━━━━━━━━━━━`
      ];

      if (targetList.length === 0) {
        lines.push(`ℹ️ ဤစာရင်းတွင် User မရှိသေးပါ။`);
      } else {
        const shown = targetList.slice(0, 15);
        shown.forEach((u, idx) => {
          const typeTag = u.isPaidUser ? `💎 Paid (${u.credits} Cr)` : `🆓 Free`;
          const freeStatus = u.usage.usedFreeToday
            ? `သုံးနေသည် (${u.usage.freeUsedToday}/${u.usage.freeLimit} ပုဒ်ပြီး)`
            : `မသုံးသေးပါ (0/${u.usage.freeLimit} ပုဒ်)`;
          lines.push(
            `${idx + 1}. ${u.userId} · ${u.email}\n   └ ${typeTag} | Free Daily: ${freeStatus}`
          );
        });
        if (targetList.length > 15) {
          lines.push(`\n… နှင့် အခြား User ${targetList.length - 15} ဦး ထပ်မံရှိပါသေးသည်။\n(အသေးစိတ်စစ်ရန် /user <UID သို့မဟုတ် Gmail> ဟု ပို့ပါ)`);
        }
      }

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join('\n').slice(0, 4000),
          reply_markup: {
            inline_keyboard: [
              [
                { text: `👥 All (${stats.totalUsers})`, callback_data: 'cmd_users' },
                { text: `🎬 Free Active (${stats.activeFreeTodayCount})`, callback_data: 'cmd_free_active' }
              ],
              [
                { text: `🆓 Free (${stats.freeUsersCount})`, callback_data: 'cmd_free_users' },
                { text: `💎 Paid (${stats.paidUsersCount})`, callback_data: 'cmd_paid_users' }
              ],
              [
                { text: '👑 Admin Panel', callback_data: 'cmd_admin' }
              ]
            ]
          }
        })
      });
    } catch (e) {
      console.warn('sendTelegramUserStatsReport error:', e);
    }
  }

  async function notifyNewUserSignup(user: StoredUserAccount) {
    try {
      const stats = getWebsiteUserStats();
      const methodLabel =
        user.provider === 'google'
          ? 'Google / Gmail (One-Tap)'
          : user.provider === 'telegram'
            ? 'Telegram OTP'
            : 'Email';
      const msg = [
        `🆕 [TTAK RECAP] Website Sign Up အသစ်!`,
        `━━━━━━━━━━━━━━━━━━━`,
        `🪪 User ID: ${user.userId}`,
        `👤 Name: ${user.name}`,
        `📧 Gmail / Email: ${user.email}`,
        `🔐 Login Method: ${methodLabel}`,
        `🆓 Free Daily Usage: 0 / ${FREE_DAILY_VIDEO_LIMIT_SERVER} ပုဒ် (သုံးမထားသေးပါ)`,
        `━━━━━━━━━━━━━━━━━━━`,
        `👥 စုစုပေါင်း Sign Up: ${stats.totalUsers} ဦး`,
        `🆓 Free Users: ${stats.freeUsersCount} ဦး | 💎 Paid Users: ${stats.paidUsersCount} ဦး`,
        `⏰ အချိန်: ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })}`
      ].join('\n');

      await notifyTelegramAdmin(msg, null, {
        inline_keyboard: [
          [
            { text: `👥 Users စာရင်း (${stats.totalUsers})`, callback_data: 'cmd_users' },
            { text: '🎬 Daily Free Usage စစ်မည်', callback_data: 'cmd_free_active' }
          ]
        ]
      });
    } catch (e) {
      console.warn('notifyNewUserSignup error:', e);
    }
  }

  async function sendTelegramApiKeysReport(chatId: string) {
    try {
      const state = loadApiKeyPoolState();
      const now = Date.now();
      const todayKey = getPoolDateKey(now);

      const gemKeys = state.keys.filter((k) => k.provider === 'gemini');
      const groqKeys = state.keys.filter((k) => k.provider === 'groq');

      const formatList = (list: AdminApiKeyRecord[], offset: number) => {
        if (list.length === 0) {
          return ['  (Key မထည့်ရသေးပါ)'];
        }
        return list.map((k, idx) => {
          const num = offset + idx + 1;
          const isCooling = k.status === 'cooldown' && k.cooldownUntil > now;
          const isInvalid = k.status === 'invalid';
          const statusLabel = !k.enabled
            ? '⏸️ Paused'
            : isCooling
              ? `⏳ 24h Rest (${formatCooldownRemaining(k.cooldownUntil, now)} ကျန်)`
              : isInvalid
                ? `❌ Invalid (${formatCooldownRemaining(k.cooldownUntil, now)} ကျန်)`
                : '✅ Ready';
          const dailyUsed = k.dailyDateKey === todayKey ? k.dailyUsageCount || 0 : 0;
          return `${num}. ${k.label} (${k.maskedKey}) · ${statusLabel}\n   └ သုံးပြီး: စုစုပေါင်း ${k.usageCount || 0}x (ယနေ့ ${dailyUsed}x) | Limit Hits: ${k.failoverCount || 0}x`;
        });
      };

      const gemReady = gemKeys.filter((k) => k.enabled && k.status === 'healthy').length;
      const groqReady = groqKeys.filter((k) => k.enabled && k.status === 'healthy').length;

      const lines = [
        `🔑 [TTAK OWNER API KEYS & LIMIT MONITOR]`,
        `━━━━━━━━━━━━━━━━━━━`,
        `🤖 Gemini Keys (${gemReady}/${gemKeys.length} Ready):`,
        ...formatList(gemKeys, 0),
        `━━━━━━━━━━━━━━━━━━━`,
        `🎙️ Groq STT Keys (${groqReady}/${groqKeys.length} Ready):`,
        ...formatList(groqKeys, gemKeys.length),
        `━━━━━━━━━━━━━━━━━━━`,
        `⚡ စုစုပေါင်း Limit Auto-Switch: ${state.totalFailovers || 0} ကြိမ်`,
        `📌 Commands: /addgemini <keys> · /addgroq <keys> · /resetkeys · /resetkey <#> · /delkey <#>`
      ];

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join('\n').slice(0, 4000),
          reply_markup: {
            inline_keyboard: [
              [
                { text: '➕ Gemini Key ထည့်နည်း', callback_data: 'cmd_keys_add_gemini' },
                { text: '➕ Groq Key ထည့်နည်း', callback_data: 'cmd_keys_add_groq' }
              ],
              [
                { text: '🔓 24h Rest အားလုံး ပြန်ဖွင့်', callback_data: 'cmd_keys_reset_all' },
                { text: '🔄 Refresh Keys', callback_data: 'cmd_keys' }
              ],
              [{ text: '👑 Admin Panel', callback_data: 'cmd_admin' }]
            ]
          }
        })
      });
    } catch (e) {
      console.warn('sendTelegramApiKeysReport error:', e);
    }
  }

  // Send Admin Dashboard message in Telegram
  async function sendTelegramAdminDashboard(chatId: string) {
    try {
      const all = loadPayments();
      const pending = all.filter((p) => p.status === 'pending');
      const approvedCount = all.filter((p) => p.status === 'approved').length;
      const stats = getWebsiteUserStats();

      const inlineKeyboard: any[][] = [];

      // Add 1-tap approve buttons for up to 4 pending items
      if (pending.length > 0) {
        for (const p of pending.slice(0, 4)) {
          inlineKeyboard.push([
            {
              text: `✅ အတည်ပြု: ${p.txnId} (+${p.credits} Cr)`,
              callback_data: `approve_${p.id}`
            },
            {
              text: `❌ ငြင်း: ${p.txnId}`,
              callback_data: `reject_${p.id}`
            }
          ]);
        }
      }

      // User & Daily Free Usage Inspection Buttons
      inlineKeyboard.push([
        {
          text: `👥 Users (${stats.totalUsers}) & Free Daily`,
          callback_data: 'cmd_users'
        },
        {
          text: `🎬 ယနေ့ Free သုံးသူ (${stats.activeFreeTodayCount})`,
          callback_data: 'cmd_free_active'
        }
      ]);

      inlineKeyboard.push([
        {
          text: `🆓 Free (${stats.freeUsersCount})`,
          callback_data: 'cmd_free_users'
        },
        {
          text: `💎 Paid (${stats.paidUsersCount})`,
          callback_data: 'cmd_paid_users'
        }
      ]);

      // Owner API Keys Management Button (Telegram Admin Only)
      inlineKeyboard.push([
        {
          text: `🔑 Owner API Keys & Limit စစ်မည်`,
          callback_data: 'cmd_keys'
        }
      ]);

      // Add link to Web Admin Panel
      inlineKeyboard.push([
        {
          text: `🌐 Web Admin Panel ဖွင့်မည်`,
          url: PUBLIC_ADMIN_URL
        }
      ]);

      // Add refresh button
      inlineKeyboard.push([
        {
          text: `🔄 စာရင်း ပြန်စစ်မည် (Refresh)`,
          callback_data: `cmd_admin`
        }
      ]);

      let messageText = [
        `👑 [TTAK RECAP] ADMIN CONTROL PANEL`,
        `━━━━━━━━━━━━━━━━━━━`,
        `👥 Website Sign Up စုစုပေါင်း: ${stats.totalUsers} ဦး`,
        `🆓 Free Users: ${stats.freeUsersCount} ဦး | 💎 Paid Users: ${stats.paidUsersCount} ဦး`,
        `🎬 ယနေ့ Free Mode သုံးနေသူ: ${stats.activeFreeTodayCount} ဦး (ဗီဒီယို ${stats.totalFreeVideosToday} ပုဒ်)`,
        `━━━━━━━━━━━━━━━━━━━`,
        `📊 စစ်ဆေးရန် ပြေစာများ (Pending): ${pending.length} ခု`,
        `✅ အတည်ပြုပြီး (Approved): ${approvedCount} ခု`,
        `💰 လက်ခံ Wallet များ:`,
        `  • Wave: 09772350006 (KAUNG HTET)`,
        `  • KBZ: 09797407339 (Ma Pyone Pyone)`,
        `━━━━━━━━━━━━━━━━━━━`,
        `🔍 Bot Commands: /keys · /addgemini · /addgroq · /resetkeys · /users · /user <UID>`
      ].join('\n');

      if (pending.length > 0) {
        messageText += `\n👇 အောက်ပါ ခလုတ်များဖြင့် တိုက်ရိုက် အတည်ပြု/စစ်ဆေးနိုင်ပါသည်:`;
      } else {
        messageText += `\n✨ စစ်ဆေးရန် ပြေစာ မရှိသေးပါ (All Clear)`;
      }

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          reply_markup: {
            inline_keyboard: inlineKeyboard
          }
        })
      });
    } catch (e) {
      console.warn('sendTelegramAdminDashboard error:', e);
    }
  }

  // Handle incoming Telegram Updates (Messages & Button Clicks)
  async function handleTelegramUpdate(update: any) {
    try {
      // 1. If user sent a message (or edited message)
      const incomingMessage = update.message || update.edited_message;
      if (incomingMessage) {
        const chatId = String(incomingMessage.chat?.id);
        const text = (incomingMessage.text || '').trim();
        const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase();

        if (cmd === '/id' || (chatId !== TELEGRAM_ADMIN_CHAT_ID && cmd === '/start')) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🪪 သင့် Telegram Chat ID: ${chatId}\n\nWebsite Sign Up / Login စာမျက်နှာတွင် ဤ Chat ID ကို ထည့်သွင်း၍ OTP ကုဒ် ရယူနိုင်ပါသည်။`
            })
          });
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && (cmd === '/admin' || cmd === '/start' || cmd === '/pending')) {
          await sendTelegramAdminDashboard(chatId);
          return;
        }

        // Owner API Key Management Commands (Admin Chat ID ONLY)
        if (
          chatId === TELEGRAM_ADMIN_CHAT_ID &&
          (cmd === '/keys' || cmd === '/apikeys' || cmd === '/keylimit' || cmd === '/keystats')
        ) {
          await sendTelegramApiKeysReport(chatId);
          return;
        }

        if (
          chatId === TELEGRAM_ADMIN_CHAT_ID &&
          (cmd === '/addgemini' || cmd === '/addgroq')
        ) {
          const isGeminiCmd = cmd === '/addgemini';
          const provider: ApiProviderType = isGeminiCmd ? 'gemini' : 'groq';
          const rawBody = text.replace(/^\/add(?:gemini|groq)(?:@[a-zA-Z0-9_]+)?\s*/i, '').trim();

          if (!rawBody) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: isGeminiCmd
                  ? `➕ Gemini API Key ထည့်သွင်းနည်း:\n/addgemini KEY1 KEY2 ...\n(တစ်ကြောင်းစီ သို့မဟုတ် Space ခြားပြီး Key ၅-၆ ခု တစ်ပြိုင်နက် ထည့်နိုင်ပါသည်)`
                  : `➕ Groq API Key ထည့်သွင်းနည်း:\n/addgroq gsk_KEY1 gsk_KEY2 ...\n(တစ်ကြောင်းစီ သို့မဟုတ် Space ခြားပြီး Key ၅-၆ ခု တစ်ပြိုင်နက် ထည့်နိုင်ပါသည်)`
              })
            });
            return;
          }

          const parsedKeys = parseBulkApiKeysInput(rawBody, provider);
          if (parsedKeys.length === 0) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ မှန်ကန်သော API Key မတွေ့ရှိပါ (Key အရှည် အနည်းဆုံး ၁၂ လုံး ရှိရပါမည်)`
              })
            });
            return;
          }

          const state = loadApiKeyPoolState();
          let existingCount = state.keys.filter((k) => k.provider === provider).length;
          const addedList: string[] = [];
          let skippedDup = 0;

          for (const keyVal of parsedKeys) {
            if (state.keys.some((k) => k.provider === provider && k.apiKey === keyVal)) {
              skippedDup++;
              continue;
            }
            existingCount++;
            const rec: AdminApiKeyRecord = {
              id: `${provider}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              provider,
              label: `${provider === 'gemini' ? 'Gemini' : 'Groq'} Key #${existingCount}`,
              apiKey: keyVal,
              maskedKey: maskApiKeyString(keyVal),
              enabled: true,
              status: 'healthy',
              cooldownUntil: 0,
              usageCount: 0,
              dailyUsageCount: 0,
              dailyDateKey: getPoolDateKey(),
              failoverCount: 0,
              addedAt: Date.now(),
              isEnvDefault: false
            };
            state.keys.push(rec);
            addedList.push(`• ${rec.label} (${rec.maskedKey})`);
          }

          saveApiKeyPoolState(state);
          const totalProviderCount = state.keys.filter((k) => k.provider === provider).length;
          const summaryMsg = [
            addedList.length > 0
              ? `✅ ${provider.toUpperCase()} API Key ${addedList.length} ခု ထည့်သွင်းပြီးပါပြီ!`
              : `ℹ️ ထည့်ထားပြီးသား Duplicate Key များသာ ဖြစ်နေပါသည်`,
            ...addedList,
            skippedDup > 0 ? `⏭️ Duplicate ကျော်လိုက်မှု: ${skippedDup} ခု` : '',
            `📦 စုစုပေါင်း ${provider.toUpperCase()} Keys: ${totalProviderCount} ခု`
          ]
            .filter(Boolean)
            .join('\n');

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: summaryMsg,
              reply_markup: {
                inline_keyboard: [[{ text: '🔑 API Keys & Limit စစ်မည်', callback_data: 'cmd_keys' }]]
              }
            })
          });
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && cmd === '/resetkeys') {
          const state = loadApiKeyPoolState();
          state.keys = state.keys.map((k) => ({
            ...k,
            status: 'healthy',
            cooldownUntil: 0,
            lastError: undefined
          }));
          saveApiKeyPoolState(state);
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: '🔓 24h Rest ကျနေသော Owner API Key အားလုံးကို ပြန်လည်ဖွင့်ပေးပြီးပါပြီ!'
            })
          });
          await sendTelegramApiKeysReport(chatId);
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && cmd === '/resetkey') {
          const arg = text.replace(/^\/resetkey(?:@[a-zA-Z0-9_]+)?\s*/i, '').trim();
          const state = loadApiKeyPoolState();
          const ordered = [
            ...state.keys.filter((k) => k.provider === 'gemini'),
            ...state.keys.filter((k) => k.provider === 'groq')
          ];
          const numIdx = parseInt(arg, 10);
          const target =
            !Number.isNaN(numIdx) && numIdx >= 1 && numIdx <= ordered.length
              ? ordered[numIdx - 1]
              : state.keys.find((k) => k.id === arg);

          if (!target) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ Key "${arg}" မတွေ့ရှိပါ (/keys ဖြင့် နံပါတ်စစ်ပါ)`
              })
            });
            return;
          }
          state.keys = state.keys.map((k) =>
            k.id === target.id
              ? { ...k, status: 'healthy', cooldownUntil: 0, lastError: undefined }
              : k
          );
          saveApiKeyPoolState(state);
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🔓 ${target.label} (${target.maskedKey}) ကို 24h Rest မှ ပြန်ဖွင့်ပေးပြီးပါပြီ!`
            })
          });
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && cmd === '/delkey') {
          const arg = text.replace(/^\/delkey(?:@[a-zA-Z0-9_]+)?\s*/i, '').trim();
          const state = loadApiKeyPoolState();
          const ordered = [
            ...state.keys.filter((k) => k.provider === 'gemini'),
            ...state.keys.filter((k) => k.provider === 'groq')
          ];
          const numIdx = parseInt(arg, 10);
          const target =
            !Number.isNaN(numIdx) && numIdx >= 1 && numIdx <= ordered.length
              ? ordered[numIdx - 1]
              : state.keys.find((k) => k.id === arg);

          if (!target) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ Key "${arg}" မတွေ့ရှိပါ (/keys ဖြင့် နံပါတ်စစ်ပါ)`
              })
            });
            return;
          }
          if (target.isEnvDefault) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `⚠️ ${target.label} သည် server.ts / env default key ဖြစ်သောကြောင့် Bot မှ ဖျက်၍မရပါ။`
              })
            });
            return;
          }
          state.keys = state.keys.filter((k) => k.id !== target.id);
          saveApiKeyPoolState(state);
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🗑️ ${target.label} (${target.maskedKey}) ကို ဖယ်ရှားပြီးပါပြီ!`
            })
          });
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && (cmd === '/users' || cmd === '/stats')) {
          await sendTelegramUserStatsReport(chatId, 'all');
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && (cmd === '/free' || cmd === '/freeusage' || cmd === '/daily')) {
          await sendTelegramUserStatsReport(chatId, 'free_active');
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && cmd === '/freeusers') {
          await sendTelegramUserStatsReport(chatId, 'free');
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && cmd === '/paid') {
          await sendTelegramUserStatsReport(chatId, 'paid');
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && cmd === '/user') {
          const query = text.replace(/^\/user(?:@[a-zA-Z0-9_]+)?\s*/i, '').trim().toLowerCase();
          if (!query) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `🔍 User တစ်ဦးချင်းစီ အသေးစိတ်စစ်ရန်:\n/user <UID သို့မဟုတ် Gmail>\nဥပမာ: /user UID-84920 သို့မဟုတ် /user mgkaung@gmail.com`
              })
            });
            return;
          }

          const stats = getWebsiteUserStats();
          const matched = stats.users.filter(
            (u) =>
              u.userId.toLowerCase().includes(query) ||
              u.email.toLowerCase().includes(query) ||
              u.name.toLowerCase().includes(query)
          );

          if (matched.length === 0) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ "${query}" နှင့် ကိုက်ညီသော Website User မတွေ့ရှိပါ။`
              })
            });
            return;
          }

          const detailBlocks = matched.slice(0, 5).map((u) => {
            const typeText = u.isPaidUser ? `💎 Paid User (${u.credits} Credits)` : `🆓 Free User (0 Credits)`;
            const dailyStatus = u.usage.usedFreeToday
              ? `✅ ယနေ့ Free Mode သုံးနေသည် (${u.usage.freeUsedToday}/${u.usage.freeLimit} ပုဒ် ပြီး, ကျန် ${u.usage.freeRemaining} ပုဒ်)`
              : `⏸️ ယနေ့ Free Mode မသုံးသေးပါ (0/${u.usage.freeLimit} ပုဒ်)`;
            return [
              `🪪 User ID: ${u.userId}`,
              `👤 Name: ${u.name}`,
              `📧 Gmail / Email: ${u.email}`,
              `🏷️ အမျိုးအစား: ${typeText}`,
              `🎬 Free Daily (${u.usage.dateKey}): ${dailyStatus}`,
              `📈 စုစုပေါင်း: Free ${u.usage.totalFreeVideos} ပုဒ် | Paid ${u.usage.totalPaidVideos} ပုဒ်`,
              `📅 Sign Up: ${new Date(u.createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Yangon' })}`
            ].join('\n');
          });

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `🔍 [User စစ်ဆေးချက်]\n━━━━━━━━━━━━━━━━━━━\n${detailBlocks.join('\n━━━━━━━━━━━━━━━━━━━\n')}`
            })
          });
          return;
        }

        if (chatId === TELEGRAM_ADMIN_CHAT_ID && cmd === '/help') {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: [
                `🤖 [TTAK RECAP] Admin Bot Commands:`,
                `• /admin - Admin Control Panel & Live Summary`,
                `• /keys - Owner API Keys Usage & 24h Limit စစ်ရန်`,
                `• /addgemini <keys> - Gemini API Key များ ထည့်ရန်`,
                `• /addgroq <keys> - Groq API Key များ ထည့်ရန်`,
                `• /resetkeys - 24h Rest Key အားလုံး ပြန်ဖွင့်ရန်`,
                `• /resetkey <#> - Key နံပါတ်တစ်ခုချင်း ပြန်ဖွင့်ရန်`,
                `• /delkey <#> - Key ဖယ်ရှားရန်`,
                `• /users - Sign Up Users အားလုံးနှင့် Daily Free Usage`,
                `• /free - ယနေ့ Free Mode သုံးနေသူများ (X/5 ပုဒ်)`,
                `• /paid - Paid Users စာရင်း`,
                `• /user <UID သို့မဟုတ် Gmail> - User တစ်ဦးချင်းစီ အသေးစိတ်စစ်ရန်`,
                `• /approve <Txn ID> - ငွေလွှဲ အတည်ပြုရန်`
              ].join('\n')
            })
          });
          return;
        }

        if (cmd === '/approve') {
          const parts = text.split(/\s+/);
          const query = parts[1];
          if (!query) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: 'အသုံးပြုပုံ - /approve <Txn ID နောက်ဆုံး ၆ လုံး>\nဥပမာ: /approve 464566'
              })
            });
            return;
          }

          const records = loadPayments();
          const target = records.find(
            (r) => r.txnId.toLowerCase().includes(query.toLowerCase()) || r.id === query
          );

          if (!target) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ Txn ID: "${query}" နှင့် ကိုက်ညီသော ငွေလွှဲပြေစာ မတွေ့ရှိပါ`
              })
            });
            return;
          }

          target.status = 'approved';
          target.approvedAt = Date.now();
          savePayments(records);

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ [အတည်ပြုပြီး] Txn ID: ${target.txnId} (+${target.credits} Credits) အား အောင်မြင်စွာ အတည်ပြုပြီး အကောင့်ထဲသို့ ထည့်သွင်းပေးပြီးပါပြီ!`
            })
          });
          return;
        }

        // Default reply with Admin options
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `မင်္ဂလာပါ! Admin Panel, Owner API Keys နှင့် User Usage များကို ကြည့်ရှုလိုပါက အောက်ပါ ခလုတ်များကို နှိပ်ပါ:`,
            reply_markup: {
              inline_keyboard: [
                [{ text: '👑 Admin Control Panel ဖွင့်မည်', callback_data: 'cmd_admin' }],
                [{ text: '🔑 Owner API Keys & Limit စစ်မည်', callback_data: 'cmd_keys' }],
                [
                  { text: '👥 Users & Daily Free စစ်မည်', callback_data: 'cmd_users' },
                  { text: '🎬 ယနေ့ Free သုံးနေသူများ', callback_data: 'cmd_free_active' }
                ],
                [{ text: '🌐 Web Admin Panel သို့ သွားမည်', url: PUBLIC_ADMIN_URL }]
              ]
            }
          })
        });
      }

      // 2. If user tapped an Inline Button (callback query)
      if (update.callback_query) {
        const queryId = update.callback_query.id;
        const data = update.callback_query.data as string;
        const chatId = String(update.callback_query.message?.chat?.id || TELEGRAM_ADMIN_CHAT_ID);
        const messageId = update.callback_query.message?.message_id;

        if (data === 'cmd_admin') {
          await answerTelegramCallbackQuery(queryId, '🔄 Loading Admin Panel...');
          await sendTelegramAdminDashboard(chatId);
          return;
        }

        if (data === 'cmd_keys') {
          if (chatId !== TELEGRAM_ADMIN_CHAT_ID) {
            await answerTelegramCallbackQuery(queryId, 'Admin Only', true);
            return;
          }
          await answerTelegramCallbackQuery(queryId, '🔑 Loading Owner API Keys...');
          await sendTelegramApiKeysReport(chatId);
          return;
        }

        if (data === 'cmd_keys_add_gemini' || data === 'cmd_keys_add_groq') {
          if (chatId !== TELEGRAM_ADMIN_CHAT_ID) {
            await answerTelegramCallbackQuery(queryId, 'Admin Only', true);
            return;
          }
          const isGem = data === 'cmd_keys_add_gemini';
          await answerTelegramCallbackQuery(queryId, isGem ? 'Gemini Key ထည့်နည်း' : 'Groq Key ထည့်နည်း');
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: isGem
                ? `➕ Gemini API Key များ ထည့်သွင်းရန် Bot ထဲသို့ ဤပုံစံအတိုင်း ပို့ပေးပါ:\n\n/addgemini AIzaSyKey1 AIzaSyKey2 AIzaSyKey3`
                : `➕ Groq API Key များ ထည့်သွင်းရန် Bot ထဲသို့ ဤပုံစံအတိုင်း ပို့ပေးပါ:\n\n/addgroq gsk_Key1 gsk_Key2 gsk_Key3`
            })
          });
          return;
        }

        if (data === 'cmd_keys_reset_all') {
          if (chatId !== TELEGRAM_ADMIN_CHAT_ID) {
            await answerTelegramCallbackQuery(queryId, 'Admin Only', true);
            return;
          }
          const state = loadApiKeyPoolState();
          state.keys = state.keys.map((k) => ({
            ...k,
            status: 'healthy',
            cooldownUntil: 0,
            lastError: undefined
          }));
          saveApiKeyPoolState(state);
          await answerTelegramCallbackQuery(queryId, '🔓 24h Rest Keys အားလုံး ပြန်ဖွင့်ပြီးပါပြီ!', true);
          await sendTelegramApiKeysReport(chatId);
          return;
        }

        if (data === 'cmd_users') {
          await answerTelegramCallbackQuery(queryId, '📊 Loading Users...');
          await sendTelegramUserStatsReport(chatId, 'all');
          return;
        }

        if (data === 'cmd_free_users') {
          await answerTelegramCallbackQuery(queryId, '🆓 Loading Free Users...');
          await sendTelegramUserStatsReport(chatId, 'free');
          return;
        }

        if (data === 'cmd_paid_users') {
          await answerTelegramCallbackQuery(queryId, '💎 Loading Paid Users...');
          await sendTelegramUserStatsReport(chatId, 'paid');
          return;
        }

        if (data === 'cmd_free_active') {
          await answerTelegramCallbackQuery(queryId, '🎬 Loading Active Free Users...');
          await sendTelegramUserStatsReport(chatId, 'free_active');
          return;
        }

        if (data.startsWith('approve_')) {
          const id = data.replace('approve_', '');
          const records = loadPayments();
          let target = records.find((r) => r.id === id);

          if (!target) {
            const msgText = String(
              update.callback_query.message?.caption || update.callback_query.message?.text || ''
            );
            const uidMatch = msgText.match(/Website User ID:\s*([^\n\r]+)/i);
            const planMatch = msgText.match(/Credit Plan:\s*([^\n\r(]+)\s*\(\+(\d+)\s*Credits\)/i);
            const amountMatch = msgText.match(/ငွေလွှဲပမာဏ:\s*([^\n\r]+)/i);
            const txnMatch = msgText.match(/\(Txn ID\):\s*([^\n\r]+)/i);
            if (uidMatch && planMatch) {
              const reconstructed: PaymentRecord = {
                id,
                userId: uidMatch[1].trim(),
                planName: planMatch[1].trim(),
                credits: parseInt(planMatch[2], 10) || 100,
                amountMmk: amountMatch ? amountMatch[1].trim() : '15,000 MMK',
                walletType: 'Wave Pay',
                walletAccountName: 'KAUNG HTET',
                walletPhone: '09772350006',
                senderPhone: '',
                txnId: txnMatch ? txnMatch[1].trim() : '000000',
                slipBase64: null,
                status: 'pending',
                createdAt: Date.now(),
                telegramDelivered: true
              };
              records.unshift(reconstructed);
              target = reconstructed;
            }
          }

          if (!target) {
            await answerTelegramCallbackQuery(queryId, '❌ ပြေစာ မတွေ့ရှိပါ', true);
            return;
          }

          target.status = 'approved';
          target.approvedAt = Date.now();
          savePayments(records);

          // Auto-grant credits directly to the user's persistent balance using User ID
          const targetUserId = target.userId || 'UID-UNKNOWN';
          const newBalance = grantUserCredits(targetUserId, target.credits, target.planName);

          await answerTelegramCallbackQuery(
            queryId,
            `✅ Auto Approved! User ID: ${targetUserId} ထံသို့ +${target.credits} Credits အား Auto ထည့်သွင်းပေးပြီးပါပြီ။`,
            true
          );

          // Update Telegram notification message
          const approvedText = [
            `✅ [APPROVED] အောင်မြင်စွာ အတည်ပြုပြီးပါပြီ!`,
            `━━━━━━━━━━━━━━━━━━━`,
            `👤 Website User ID: ${targetUserId}`,
            `📦 Plan: ${target.planName} (+${target.credits} Credits)`,
            `💰 ပမာဏ: ${target.amountMmk}`,
            `🔢 Txn ID: ${target.txnId}`,
            `📱 လွှဲသူ: ${target.senderPhone}`,
            `⚡ Bot မှ User ID (${targetUserId}) ထံသို့ +${target.credits} Credits အား Auto ပေါင်းထည့်ပေးပြီးပါပြီ!`,
            `📊 User ၏ လက်ရှိ စုစုပေါင်း Credit: ${newBalance} Credits`,
            `⏰ အတည်ပြုချိန်: ${new Date().toLocaleString('my-MM')}`
          ].join('\n');

          if (messageId) {
            try {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageCaption`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  caption: approvedText
                })
              });
            } catch {
              try {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    text: approvedText
                  })
                });
              } catch (e) {
                console.warn('editMessage error:', e);
              }
            }
          }
          return;
        }

        if (data.startsWith('reject_')) {
          const id = data.replace('reject_', '');
          const records = loadPayments();
          const target = records.find((r) => r.id === id);

          if (target) {
            target.status = 'rejected';
            savePayments(records);
            await answerTelegramCallbackQuery(queryId, '❌ ငွေလွှဲအား ငြင်းပယ်ပြီးပါပြီ (Declined)', true);
            const declinedText = [
              `❌ [DECLINED] ငြင်းပယ်ထားပါသည်`,
              `━━━━━━━━━━━━━━━━━━━`,
              `👤 Website User ID: ${target.userId || 'N/A'}`,
              `📦 Plan: ${target.planName}`,
              `🔢 Txn ID: ${target.txnId}`,
              `📱 လွှဲသူ: ${target.senderPhone}`,
              `Status: Declined`
            ].join('\n');

            if (messageId) {
              try {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageCaption`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    caption: declinedText
                  })
                });
              } catch {
                try {
                  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: chatId,
                      message_id: messageId,
                      text: declinedText
                    })
                  });
                } catch {}
              }
            }
          }
          return;
        }
      }
    } catch (e) {
      console.warn('handleTelegramUpdate error:', e);
    }
  }

  // Optional Webhook Fallback Endpoint (if Telegram webhook is pointed to this server)
  app.post('/api/telegram/webhook', async (req, res) => {
    try {
      await handleTelegramUpdate(req.body);
      res.status(200).json({ ok: true });
    } catch (e: any) {
      res.status(200).json({ ok: false, error: e?.message });
    }
  });

  // Telegram Long Polling Background Loop
  let lastTelegramUpdateId = 0;
  let isTelegramPollingStarted = false;

  async function clearTelegramWebhookForPolling() {
    try {
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`,
        { signal: AbortSignal.timeout(10000) }
      );
    } catch (e) {
      console.warn('deleteWebhook warning:', e);
    }
  }

  function startTelegramBotPolling() {
    if (isTelegramPollingStarted) return;
    const isAiStudioContainer =
      fs.existsSync('/app/applet') && process.env.ENABLE_TELEGRAM_POLLING !== 'true';
    if (process.env.DISABLE_TELEGRAM_POLLING === 'true' || isAiStudioContainer) {
      console.log('🤖 Telegram Bot polling skipped in AI Studio preview container (active on VPS).');
      return;
    }
    isTelegramPollingStarted = true;

    console.log(`🤖 Telegram Bot polling started for @ttakrecap_bot...`);

    const allowedUpdatesParam = encodeURIComponent(
      JSON.stringify(['message', 'edited_message', 'callback_query'])
    );

    const poll = async () => {
      // Ensure any conflicting external webhook is removed before long-polling
      await clearTelegramWebhookForPolling();

      while (true) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastTelegramUpdateId + 1}&timeout=10&allowed_updates=${allowedUpdatesParam}`,
            { signal: AbortSignal.timeout(20000) }
          );
          const data = (await res.json()) as any;
          if (data.ok && Array.isArray(data.result)) {
            for (const update of data.result) {
              lastTelegramUpdateId = Math.max(lastTelegramUpdateId, update.update_id);
              await handleTelegramUpdate(update);
            }
          } else if (data.error_code === 409) {
            // If an external webhook was re-attached (409 Conflict), delete it automatically
            console.warn('⚠️ Telegram getUpdates 409 Conflict detected — clearing webhook...');
            await clearTelegramWebhookForPolling();
            await new Promise((r) => setTimeout(r, 2000));
          } else if (!data.ok) {
            await new Promise((r) => setTimeout(r, 2000));
          }
        } catch {
          // Wait briefly before retrying polling
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    };

    poll();
  }

  // Start polling immediately
  startTelegramBotPolling();

  // User balance & Free Mode daily quota query endpoint
  app.get('/api/user/credits', (req, res) => {
    try {
      const userId = (req.query.userId as string) || '';
      const balances = loadUserBalances();
      const rec = balances[userId] || { credits: 0, activePlanId: 'free', lastUpdated: Date.now() };
      const freeUsage = getUserFreeUsageSnapshot(userId);
      res.json({
        ok: true,
        userId,
        credits: typeof rec.credits === 'number' ? rec.credits : 0,
        activePlanId: rec.activePlanId || 'free',
        freeRemaining: freeUsage.freeRemaining,
        freeUsedToday: freeUsage.freeUsedToday,
        freeLimit: freeUsage.freeLimit
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Record daily Free Mode video usage & notify Admin on Telegram Bot
  app.post('/api/user/free-usage', async (req, res) => {
    try {
      const { userId = '' } = req.body as { userId?: string };
      if (!userId) {
        return res.status(400).json({ ok: false, error: 'userId is required' });
      }
      const usage = recordUserFreeUsage(userId);
      const user = loadUsers().find((u) => u.userId === userId);
      const stats = getWebsiteUserStats();

      const msg = [
        `🎬 [FREE MODE] ယနေ့ ဗီဒီယို အသုံးပြုမှု`,
        `━━━━━━━━━━━━━━━━━━━`,
        `🪪 User ID: ${userId}`,
        `📧 Gmail / Email: ${user?.email || 'Guest'}`,
        `📊 ယနေ့ Free Mode သုံးပြီးမှု: ${usage.freeUsedToday} / ${usage.freeLimit} ပုဒ် (ကျန် ${usage.freeRemaining} ပုဒ်)`,
        `🏷️ အခြေအနေ: Daily Free Mode အသုံးပြုနေသည်`,
        `👥 Users: ${stats.totalUsers} (Free: ${stats.freeUsersCount} | Paid: ${stats.paidUsersCount})`
      ].join('\n');

      notifyTelegramAdmin(msg, null, {
        inline_keyboard: [
          [{ text: '🎬 ယနေ့ Free သုံးနေသူများ စစ်မည်', callback_data: 'cmd_free_active' }]
        ]
      }).catch(() => {});

      res.json({
        ok: true,
        freeUsedToday: usage.freeUsedToday,
        freeRemaining: usage.freeRemaining,
        freeLimit: usage.freeLimit
      });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // User credit deduction endpoint
  app.post('/api/user/deduct-credits', (req, res) => {
    try {
      const { userId, amount = 1 } = req.body as { userId: string; amount?: number };
      const balances = loadUserBalances();
      const current = balances[userId]?.credits || 0;
      const nextCredits = Math.max(0, current - Number(amount));
      balances[userId] = {
        credits: nextCredits,
        activePlanId: balances[userId]?.activePlanId || 'free',
        lastUpdated: Date.now()
      };
      saveUserBalances(balances);
      recordUserPaidUsage(userId);
      res.json({ ok: true, credits: nextCredits });
    } catch (e) {
      res.status(500).json({ ok: false, error: String(e) });
    }
  });

  // Submit payment slip from Wallet modal
  app.post('/api/payments/submit-slip', async (req, res) => {
    try {
      const {
        userId = 'UID-84920',
        planName = 'Starter Pack (100 Credits)',
        credits = 100,
        amountMmk = '15,000 MMK',
        walletType = 'Wave Pay (09772350006)',
        senderPhone = '',
        txnId = '',
        slipBase64 = null
      } = req.body as {
        userId?: string;
        planName?: string;
        credits?: number;
        amountMmk?: string;
        walletType?: string;
        senderPhone?: string;
        txnId?: string;
        slipBase64?: string | null;
      };

      const isWave = walletType.toLowerCase().includes('wave');
      const walletAccountName = isWave ? 'KAUNG HTET' : 'Ma Pyone Pyone';
      const walletPhone = isWave ? '09772350006' : '09797407339';
      const cleanWalletName = isWave ? 'Wave Pay' : 'KBZ Pay';

      const cleanUserId = userId.trim() || 'UID-UNKNOWN';

      const newRecord: PaymentRecord = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: cleanUserId,
        planName,
        credits: Number(credits) || 150,
        amountMmk,
        walletType: cleanWalletName,
        walletAccountName,
        walletPhone,
        senderPhone,
        txnId,
        slipBase64,
        status: 'pending',
        createdAt: Date.now(),
        telegramDelivered: false
      };

      const senderPhoneClean = (senderPhone || '').trim();

      const captionLines = [
        `🔔 [TTAK RECAP] ငွေလွှဲအသစ် ရောက်ရှိလာပါသည်!`,
        `━━━━━━━━━━━━━━━━━━━`,
        `👤 Website User ID: ${cleanUserId}`,
        `📦 Credit Plan: ${planName} (+${credits} Credits)`,
        `💰 ငွေလွှဲပမာဏ: ${amountMmk}`,
        `🔢 လုပ်ငန်းစဉ်အမှတ် (Txn ID): ${txnId}`,
        ...(senderPhoneClean ? [`📱 လွှဲသူဖုန်း: ${senderPhoneClean}`] : []),
        `🏦 လက်ခံ Wallet: ${cleanWalletName} (${walletPhone} · ${walletAccountName})`,
        `⏰ အချိန်: ${new Date().toLocaleString('my-MM')}`,
        `━━━━━━━━━━━━━━━━━━━`,
        `👇 အောက်ပါ ခလုတ်များဖြင့် Approve / Decline ပြုလုပ်နိုင်ပါသည်:`
      ];
      const captionText = captionLines.join('\n');

      const inlineKeyboard = {
        inline_keyboard: [
          [
            {
              text: `✅ Approve (+${newRecord.credits} Credits)`,
              callback_data: `approve_${newRecord.id}`
            },
            {
              text: `❌ Decline`,
              callback_data: `reject_${newRecord.id}`
            }
          ]
        ]
      };

      const tgResult = await notifyTelegramAdmin(captionText, slipBase64, inlineKeyboard);
      newRecord.telegramDelivered = tgResult.success;
      if (!tgResult.success) {
        newRecord.telegramError = tgResult.error;
      }

      const all = loadPayments();
      all.unshift(newRecord);
      savePayments(all);

      res.json({
        ok: true,
        submission: newRecord,
        telegramDelivered: tgResult.success,
        telegramError: tgResult.error
      });
    } catch (error) {
      console.error('Error submitting slip:', error);
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // User Payment History & Live Approval Status (Scoped to Website User ID)
  app.get('/api/user/payments', (req, res) => {
    try {
      const userId = (req.query.userId as string) || '';
      if (!userId.trim()) {
        return res.json({ ok: true, payments: [] });
      }
      const records = loadPayments();
      const userRecords = records
        .filter((r) => r.userId === userId.trim())
        .map((r) => ({
          id: r.id,
          userId: r.userId,
          planName: r.planName,
          credits: r.credits,
          amountMmk: r.amountMmk,
          walletType: r.walletType,
          txnId: r.txnId,
          status: r.status,
          rejectionReason: r.rejectionReason,
          createdAt: r.createdAt,
          approvedAt: r.approvedAt
        }))
        .sort((a, b) => b.createdAt - a.createdAt);

      res.json({ ok: true, payments: userRecords });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  const ADMIN_SECRET_PIN = '198125'; // 6-digit Secret Admin PIN (Derived from Admin Telegram ID 1981253384)

  function isAuthorizedAdmin(req: express.Request): boolean {
    const key =
      req.headers['x-admin-key'] ||
      req.query.adminKey ||
      (req.body && req.body.adminKey);
    return key === ADMIN_SECRET_PIN;
  }

  // Admin PIN verification route
  app.post('/api/admin/verify-pin', (req, res) => {
    const { pin } = req.body as { pin: string };
    if (pin === ADMIN_SECRET_PIN) {
      res.json({ ok: true });
    } else {
      res.status(401).json({ ok: false, error: 'Admin PIN မမှန်ကန်ပါ (Invalid Admin PIN)' });
    }
  });

  // Get all payment submissions for Admin Panel
  app.get('/api/admin/payments', (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
      }
      const records = loadPayments();
      res.json({
        ok: true,
        payments: records,
        config: {
          telegramBot: '@ttakrecap_bot',
          adminChatId: '1981253384',
          wavePay: { phone: '09772350006', name: 'KAUNG HTET' },
          kbzPay: { phone: '09797407339', name: 'Ma Pyone Pyone' }
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Approve a payment submission
  app.post('/api/admin/payments/approve', async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
      }
      const { id } = req.body as { id: string };
      const records = loadPayments();
      const target = records.find((r) => r.id === id);
      if (!target) {
        return res.status(404).json({ ok: false, error: 'Payment record not found' });
      }

      target.status = 'approved';
      target.approvedAt = Date.now();
      savePayments(records);

      // Auto-grant credits directly to the user's persistent balance using User ID
      const targetUserId = target.userId || 'UID-UNKNOWN';
      const newBalance = grantUserCredits(targetUserId, target.credits, target.planName);

      // Notify Telegram
      await notifyTelegramAdmin(
        `✅ [TTAK RECAP] ငွေလွှဲ အတည်ပြုပြီးပါပြီ!\n` +
        `• Website User ID: ${targetUserId}\n` +
        `• Plan: ${target.planName} (+${target.credits} Credits)\n` +
        `• ပမာဏ: ${target.amountMmk}\n` +
        `• လွှဲသူ: ${target.senderPhone}\n` +
        `• Txn ID: ${target.txnId}\n` +
        `• Auto Credit ထည့်ပြီး လက်ရှိ Balance: ${newBalance} Credits`
      );

      res.json({ ok: true, payment: target, newBalance });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Reject a payment submission
  app.post('/api/admin/payments/reject', async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
      }
      const { id, reason = 'အချက်အလက် မကိုက်ညီပါ သို့မဟုတ် ငွေလွှဲပြေစာ မမှန်ကန်ပါ' } = req.body as {
        id: string;
        reason?: string;
      };
      const records = loadPayments();
      const target = records.find((r) => r.id === id);
      if (!target) {
        return res.status(404).json({ ok: false, error: 'Payment record not found' });
      }

      target.status = 'rejected';
      target.rejectionReason = reason;
      savePayments(records);

      // Notify Telegram
      await notifyTelegramAdmin(
        `❌ [TTAK RECAP] ငွေလွှဲ ငြင်းပယ်ထားပါသည်\n` +
        `• Txn ID: ${target.txnId}\n` +
        `• လွှဲသူ: ${target.senderPhone}\n` +
        `• အကြောင်းပြချက်: ${reason}`
      );

      res.json({ ok: true, payment: target });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Telegram test ping endpoint for Admin
  app.post('/api/admin/telegram-test', async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
      }
      const pingText =
        `🚀 [TTAK RECAP BOT TEST]\n` +
        `Bot Token: 8931773634:AAH2f3iOB5rDU3CgTH2nQ3guS1HyqJZXYjM\n` +
        `Admin ID: 1981253384\n` +
        `Status: Active & Connected!\n` +
        `အချိန်: ${new Date().toLocaleString('my-MM')}`;

      const tgResult = await notifyTelegramAdmin(pingText);
      res.json({
        ok: tgResult.success,
        error: tgResult.error,
        botUsername: '@ttakrecap_bot',
        adminChatId: TELEGRAM_ADMIN_CHAT_ID
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Manual Credit Granting by Admin
  app.post('/api/admin/manual-credit', async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
      }
      const { targetPhoneOrEmail, credits, reason = 'Admin Manual Bonus' } = req.body as {
        targetPhoneOrEmail: string;
        credits: number;
        reason?: string;
      };

      const manualRecord: PaymentRecord = {
        id: `manual_${Date.now()}`,
        userId: targetPhoneOrEmail,
        planName: `Manual Grant (+${credits} Cr)`,
        credits: Number(credits) || 100,
        amountMmk: '0 MMK (Admin Grant)',
        walletType: 'Admin Direct',
        walletAccountName: 'System Admin',
        walletPhone: 'DIRECT',
        senderPhone: targetPhoneOrEmail,
        txnId: `ADM${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'approved',
        createdAt: Date.now(),
        approvedAt: Date.now(),
        telegramDelivered: false
      };

      grantUserCredits(targetPhoneOrEmail, Number(credits) || 100, reason);

      const all = loadPayments();
      all.unshift(manualRecord);
      savePayments(all);

      await notifyTelegramAdmin(
        `🎁 [TTAK RECAP] Manual Credit Grant!\n` +
        `• User: ${targetPhoneOrEmail}\n` +
        `• Added: +${credits} Credits\n` +
        `• Reason: ${reason}`
      );

      res.json({ ok: true, record: manualRecord });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // ============================================================================
  // ADMIN CLOUDFLARE R2 DIRECT CONFIGURATION & AUTO-CORS SETUP
  // ============================================================================
  app.get('/api/admin/r2-config', (req, res) => {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
    }
    const cfg = loadR2Config();
    if (!cfg) {
      return res.json({
        ok: true,
        configured: false,
        accountId: '',
        accessKeyIdMasked: '',
        secretAccessKeyMasked: '',
        bucketName: '',
        publicUrl: ''
      });
    }
    res.json({
      ok: true,
      configured: true,
      accountId: cfg.accountId,
      accessKeyIdMasked: maskR2Secret(cfg.accessKeyId),
      secretAccessKeyMasked: maskR2Secret(cfg.secretAccessKey),
      bucketName: cfg.bucketName,
      publicUrl: cfg.publicUrl || '',
      updatedAt: cfg.updatedAt
    });
  });

  app.post('/api/admin/r2-config', async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
      }
      const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl = '' } = (req.body || {}) as {
        accountId?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        bucketName?: string;
        publicUrl?: string;
      };
      const existing = loadR2Config();
      const candidate: R2StoredConfig = {
        accountId: (accountId || existing?.accountId || '').trim(),
        accessKeyId: (accessKeyId || existing?.accessKeyId || '').trim(),
        secretAccessKey: (secretAccessKey || existing?.secretAccessKey || '').trim(),
        bucketName: (bucketName || existing?.bucketName || '').trim(),
        publicUrl: publicUrl.trim()
      };
      if (!isValidR2Config(candidate)) {
        return res.status(400).json({
          ok: false,
          error: 'Account ID, Access Key ID, Secret Access Key နှင့် Bucket Name အပြည့်အစုံ ထည့်သွင်းပါ'
        });
      }
      saveR2Config(candidate);
      res.json({
        ok: true,
        configured: true,
        accountId: candidate.accountId,
        accessKeyIdMasked: maskR2Secret(candidate.accessKeyId),
        secretAccessKeyMasked: maskR2Secret(candidate.secretAccessKey),
        bucketName: candidate.bucketName,
        publicUrl: candidate.publicUrl || ''
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post('/api/admin/r2-test-cors', async (req, res) => {
    try {
      if (!isAuthorizedAdmin(req)) {
        return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
      }
      const { accountId, accessKeyId, secretAccessKey, bucketName, publicUrl = '' } = (req.body || {}) as {
        accountId?: string;
        accessKeyId?: string;
        secretAccessKey?: string;
        bucketName?: string;
        publicUrl?: string;
      };
      const existing = loadR2Config();
      const candidate: R2StoredConfig = {
        accountId: (accountId || existing?.accountId || '').trim(),
        accessKeyId: (accessKeyId || existing?.accessKeyId || '').trim(),
        secretAccessKey: (secretAccessKey || existing?.secretAccessKey || '').trim(),
        bucketName: (bucketName || existing?.bucketName || '').trim(),
        publicUrl: (publicUrl ?? existing?.publicUrl ?? '').trim()
      };
      if (!isValidR2Config(candidate)) {
        return res.status(400).json({
          ok: false,
          error: 'စမ်းသပ်ရန် R2 Credentials အပြည့်အစုံ ထည့်သွင်းပါ'
        });
      }
      await configureR2BucketCors(candidate);
      saveR2Config(candidate);
      res.json({
        ok: true,
        message: `✓ R2 Bucket "${candidate.bucketName}" ချိတ်ဆက်ပြီး Browser Direct Upload CORS ကို Auto-Setup လုပ်ပြီးပါပြီ!`
      });
    } catch (error) {
      res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : 'R2 connection or CORS setup failed'
      });
    }
  });

  app.delete('/api/admin/r2-config', (req, res) => {
    if (!isAuthorizedAdmin(req)) {
      return res.status(403).json({ ok: false, error: 'Access Denied: Admin PIN Required' });
    }
    clearSavedR2Config();
    res.json({ ok: true, configured: false });
  });

  // ============================================================================
  // REAL USER AUTHENTICATION (Sign Up, Sign In, Persistent UID & Sessions)
  // ============================================================================
  const FIREBASE_CONFIG_FILE = path.join(process.cwd(), 'firebase-applet-config.json');
  function getFirebaseAppletConfig(): {
    projectId: string;
    apiKey: string;
    authDomain: string;
    oAuthClientId: string;
  } {
    try {
      if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf-8'));
        return {
          projectId: String(parsed?.projectId || 'brilliant-turbine-fdzcr'),
          apiKey: String(parsed?.apiKey || ''),
          authDomain: String(parsed?.authDomain || 'brilliant-turbine-fdzcr.firebaseapp.com'),
          oAuthClientId: String(
            parsed?.oAuthClientId ||
              '631636882768-gveb2b4oirdu0j1g7fc9kle343q9202h.apps.googleusercontent.com'
          )
        };
      }
    } catch {}
    return {
      projectId: 'brilliant-turbine-fdzcr',
      apiKey: '',
      authDomain: 'brilliant-turbine-fdzcr.firebaseapp.com',
      oAuthClientId: '631636882768-gveb2b4oirdu0j1g7fc9kle343q9202h.apps.googleusercontent.com'
    };
  }

  function getFirebaseApiKey(): string {
    return getFirebaseAppletConfig().apiKey;
  }

  const customDomainRedirectCache = new Map<
    string,
    { ready: boolean; checkedAt: number }
  >();

  async function checkGoogleRedirectUriReady(
    customDomain: string,
    oAuthClientId: string,
    forceRefresh = false
  ): Promise<boolean> {
    if (process.env.FORCE_CUSTOM_AUTH_DOMAIN === 'true') {
      return true;
    }
    const cleanDomain = extractCustomDomainHostname(customDomain);
    if (!cleanDomain || !oAuthClientId) return false;

    const cached = customDomainRedirectCache.get(cleanDomain);
    if (!forceRefresh && cached && Date.now() - cached.checkedAt < 25_000) {
      return cached.ready;
    }

    try {
      const redirectUri = `https://${cleanDomain}/__/auth/handler`;
      const probeUrl =
        `https://accounts.google.com/o/oauth2/auth?response_type=code` +
        `&client_id=${encodeURIComponent(oAuthClientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${encodeURIComponent('openid email profile')}`;

      const [oauthResp, handlerResp] = await Promise.all([
        fetch(probeUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(4500)
        }),
        fetch(redirectUri, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(4500)
        }).catch(() => null)
      ]);
      const html = await oauthResp.text();
      const handlerHtml = handlerResp ? await handlerResp.text().catch(() => '') : '';
      const handlerProxyReady = handlerHtml.includes('fireauth.oauthhelper.widget.initialize');
      const ready =
        isGoogleRedirectUriAuthorizedHtml(html, oauthResp.status) && handlerProxyReady;
      customDomainRedirectCache.set(cleanDomain, { ready, checkedAt: Date.now() });
      return ready;
    } catch {
      return cached ? cached.ready : false;
    }
  }

  function hashUserPassword(password: string, salt: string): string {
    return crypto.scryptSync(password, salt, 64).toString('hex');
  }

  function generateUniqueUserId(existingUsers: StoredUserAccount[]): string {
    let uid = '';
    do {
      uid = `UID-${Math.floor(10000 + Math.random() * 90000)}`;
    } while (existingUsers.some((u) => u.userId === uid));
    return uid;
  }

  const SESSION_HMAC_KEY = crypto
    .createHash('sha256')
    .update(process.env.SESSION_SECRET || `ttak-session-hmac-v1:${TELEGRAM_BOT_TOKEN}`)
    .digest();
  const REVOKED_TOKENS_FILE = path.join(JOBS_TEMP_DIR, 'revoked_tokens.json');

  function loadRevokedTokenHashes(): string[] {
    try {
      if (fs.existsSync(REVOKED_TOKENS_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(REVOKED_TOKENS_FILE, 'utf-8'));
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {}
    return [];
  }

  function revokeSessionToken(token: string) {
    try {
      const h = crypto.createHash('sha256').update(token).digest('hex');
      const list = loadRevokedTokenHashes();
      if (!list.includes(h)) {
        list.push(h);
        fs.writeFileSync(REVOKED_TOKENS_FILE, JSON.stringify(list.slice(-500)), 'utf-8');
      }
    } catch {}
  }

  function signUserSessionToken(user: StoredUserAccount): string {
    const payloadObj = {
      userId: user.userId,
      name: user.name,
      email: user.email,
      provider: user.provider,
      photoUrl: user.photoUrl,
      telegramChatId: user.telegramChatId,
      iat: Date.now(),
      exp: Date.now() + 365 * 24 * 3600 * 1000 // 1 year persistent session
    };
    const payloadB64 = Buffer.from(JSON.stringify(payloadObj), 'utf-8').toString('base64url');
    const sigB64 = crypto
      .createHmac('sha256', SESSION_HMAC_KEY)
      .update(payloadB64)
      .digest('base64url');
    return `ttak1.${payloadB64}.${sigB64}`;
  }

  function verifySignedSessionToken(token: string): (StoredUserAccount & { exp: number }) | null {
    try {
      if (!token.startsWith('ttak1.')) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const [, payloadB64, sigB64] = parts;
      const expectedSig = crypto
        .createHmac('sha256', SESSION_HMAC_KEY)
        .update(payloadB64)
        .digest('base64url');
      const a = Buffer.from(sigB64);
      const b = Buffer.from(expectedSig);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      const h = crypto.createHash('sha256').update(token).digest('hex');
      if (loadRevokedTokenHashes().includes(h)) return null;
      const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as any;
      if (!decoded?.userId || !decoded?.email || Number(decoded.exp || 0) < Date.now()) {
        return null;
      }
      return {
        userId: String(decoded.userId),
        name: String(decoded.name || 'Creator'),
        email: String(decoded.email),
        provider: decoded.provider || 'google',
        photoUrl: decoded.photoUrl,
        telegramChatId: decoded.telegramChatId,
        createdAt: Number(decoded.iat || Date.now()),
        exp: Number(decoded.exp)
      };
    } catch {
      return null;
    }
  }

  function createSessionForUser(userOrId: StoredUserAccount | string): string {
    const users = loadUsers();
    const user =
      typeof userOrId === 'string'
        ? users.find((u) => u.userId === userOrId)
        : userOrId;
    const token = user ? signUserSessionToken(user) : crypto.randomBytes(32).toString('hex');
    const sessions = loadSessions();
    sessions[token] = {
      token,
      userId: user ? user.userId : String(userOrId),
      createdAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 3600 * 1000
    };
    saveSessions(sessions);
    return token;
  }

  function setAuthSessionCookies(res: express.Response, token: string, user: StoredUserAccount) {
    try {
      const maxAge = 365 * 24 * 3600;
      const userJson = encodeURIComponent(
        JSON.stringify({
          userId: user.userId,
          name: user.name,
          email: user.email,
          provider: user.provider,
          photoUrl: user.photoUrl
        })
      );
      res.setHeader('Set-Cookie', [
        `ttak_auth_token=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`,
        `ttak_auth_user=${userJson}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
      ]);
    } catch {}
  }

  function clearAuthSessionCookies(res: express.Response) {
    try {
      res.setHeader('Set-Cookie', [
        'ttak_auth_token=; Path=/; Max-Age=0; SameSite=Lax',
        'ttak_auth_user=; Path=/; Max-Age=0; SameSite=Lax'
      ]);
    } catch {}
  }

  function readCookieValueFromReq(req: express.Request, name: string): string {
    const raw = req.headers.cookie;
    if (!raw || typeof raw !== 'string') return '';
    for (const part of raw.split(';')) {
      const idx = part.indexOf('=');
      if (idx === -1) continue;
      const k = part.slice(0, idx).trim();
      if (k === name) {
        try {
          return decodeURIComponent(part.slice(idx + 1).trim());
        } catch {
          return part.slice(idx + 1).trim();
        }
      }
    }
    return '';
  }

  const pendingTelegramOtps = new Map<string, { code: string; chatId: string; expiresAt: number }>();

  // One-Click Google / Gmail Sign-In & Auto Sign-Up (via verified Firebase Auth ID Token)
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { idToken = '' } = req.body as { idToken?: string };
      if (!idToken) {
        return res.status(400).json({ ok: false, error: 'Google ID token is required' });
      }

      const apiKey = getFirebaseApiKey();
      if (!apiKey) {
        return res.status(500).json({ ok: false, error: 'Firebase Auth is not configured on server' });
      }

      const lookupResp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        }
      );
      const lookupData = (await lookupResp.json()) as any;
      const fbUser = lookupData?.users?.[0];
      if (!lookupResp.ok || !fbUser?.email) {
        return res.status(401).json({
          ok: false,
          error: 'Google အကောင့် အတည်ပြု၍ မရပါ။ ထပ်မံကြိုးစားပါ။'
        });
      }

      const cleanEmail = String(fbUser.email).trim().toLowerCase();
      const displayName =
        String(fbUser.displayName || '').trim() || cleanEmail.split('@')[0] || 'Creator';
      const photoUrl = fbUser.photoUrl ? String(fbUser.photoUrl) : undefined;

      const users = loadUsers();
      let user = users.find((u) => u.email === cleanEmail);
      if (!user) {
        user = {
          userId: generateUniqueUserId(users),
          name: displayName,
          email: cleanEmail,
          provider: 'google',
          photoUrl,
          createdAt: Date.now()
        };
        users.push(user);
        saveUsers(users);

        const balances = loadUserBalances();
        if (!balances[user.userId]) {
          balances[user.userId] = { credits: 0, activePlanId: 'free', lastUpdated: Date.now() };
          saveUserBalances(balances);
        }

        notifyNewUserSignup(user).catch(() => {});
      } else {
        let updated = false;
        if (user.name !== displayName && displayName) {
          user.name = displayName;
          updated = true;
        }
        if (photoUrl && user.photoUrl !== photoUrl) {
          user.photoUrl = photoUrl;
          updated = true;
        }
        if (user.provider !== 'google') {
          user.provider = 'google';
          updated = true;
        }
        if (updated) saveUsers(users);
      }

      const token = createSessionForUser(user);
      setAuthSessionCookies(res, token, user);
      res.json({
        ok: true,
        token,
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          provider: user.provider,
          photoUrl: user.photoUrl
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post('/api/auth/signup', (req, res) => {
    try {
      const { name = '', email = '', password = '' } = req.body as {
        name?: string;
        email?: string;
        password?: string;
      };

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim() || cleanEmail.split('@')[0] || 'Creator';

      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ ok: false, error: 'မှန်ကန်သော Email / Gmail လိပ်စာ ထည့်သွင်းပါ' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ ok: false, error: 'စကားဝှက် (Password) အနည်းဆုံး ၆ လုံး ထည့်သွင်းပါ' });
      }

      const users = loadUsers();
      if (users.some((u) => u.email === cleanEmail)) {
        return res.status(409).json({
          ok: false,
          error: 'ဤ Email ဖြင့် အကောင့်ရှိပြီးသား ဖြစ်ပါသည်။ Sign In မှ ဝင်ရောက်ပါ။'
        });
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashUserPassword(password, salt);
      const newUser: StoredUserAccount = {
        userId: generateUniqueUserId(users),
        name: cleanName,
        email: cleanEmail,
        provider: 'email',
        passwordHash,
        passwordSalt: salt,
        createdAt: Date.now()
      };

      users.push(newUser);
      saveUsers(users);

      // Initialize 0-credit balance record for the new user
      const balances = loadUserBalances();
      if (!balances[newUser.userId]) {
        balances[newUser.userId] = { credits: 0, activePlanId: 'free', lastUpdated: Date.now() };
        saveUserBalances(balances);
      }

      notifyNewUserSignup(newUser).catch(() => {});

      const token = createSessionForUser(newUser);
      setAuthSessionCookies(res, token, newUser);
      res.json({
        ok: true,
        token,
        user: {
          userId: newUser.userId,
          name: newUser.name,
          email: newUser.email,
          provider: newUser.provider
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { email = '', password = '' } = req.body as { email?: string; password?: string };
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanEmail || !password) {
        return res.status(400).json({ ok: false, error: 'Email နှင့် Password နှစ်ခုလုံး ထည့်သွင်းပါ' });
      }

      const users = loadUsers();
      const user = users.find((u) => u.email === cleanEmail && u.provider === 'email');
      if (!user || !user.passwordHash || !user.passwordSalt) {
        return res.status(401).json({
          ok: false,
          error: 'Email သို့မဟုတ် Password မှားယွင်းနေပါသည် (အကောင့်မရှိသေးပါက Sign Up လုပ်ပါ)'
        });
      }

      const computedHash = hashUserPassword(password, user.passwordSalt);
      const valid = crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(user.passwordHash, 'hex')
      );
      if (!valid) {
        return res.status(401).json({ ok: false, error: 'Email သို့မဟုတ် Password မှားယွင်းနေပါသည်' });
      }

      const token = createSessionForUser(user);
      setAuthSessionCookies(res, token, user);
      res.json({
        ok: true,
        token,
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          provider: user.provider
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post('/api/auth/telegram/send-code', async (req, res) => {
    try {
      const { chatId = '' } = req.body as { chatId?: string };
      const cleanChatId = chatId.trim();
      if (!/^\d{5,15}$/.test(cleanChatId)) {
        return res.status(400).json({
          ok: false,
          error: 'Telegram တွင် @ttakrecap_bot ထံ /id ဟု ပို့ပြီး ရရှိသော ဂဏန်း Chat ID ကို ထည့်သွင်းပါ'
        });
      }

      const otpCode = String(Math.floor(100000 + Math.random() * 900000));
      pendingTelegramOtps.set(cleanChatId, {
        code: otpCode,
        chatId: cleanChatId,
        expiresAt: Date.now() + 5 * 60_000
      });

      const tgResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: `🔐 [TTAK RECAP] Login / Sign Up OTP ကုဒ်: ${otpCode}\n\nဤကုဒ်သည် ၅ မိနစ်အတွင်း သက်တမ်းရှိပါသည်။`
        })
      });
      const tgJson = (await tgResp.json()) as any;
      if (!tgJson.ok) {
        return res.status(400).json({
          ok: false,
          error: 'Bot မှ မက်ဆေ့ချ်ပို့၍မရပါ။ ဦးစွာ Telegram တွင် @ttakrecap_bot ကို Start နှိပ်ပေးပါ။'
        });
      }

      res.json({ ok: true, message: 'Telegram Bot မှတစ်ဆင့် OTP ကုဒ် ၆ လုံး ပေးပို့ပြီးပါပြီ' });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post('/api/auth/telegram/verify-code', (req, res) => {
    try {
      const { chatId = '', code = '', name = '' } = req.body as {
        chatId?: string;
        code?: string;
        name?: string;
      };
      const cleanChatId = chatId.trim();
      const cleanCode = code.trim();

      const pending = pendingTelegramOtps.get(cleanChatId);
      if (!pending || pending.expiresAt < Date.now() || pending.code !== cleanCode) {
        return res.status(401).json({ ok: false, error: 'OTP ကုဒ် မှားယွင်းနေပါသည် သို့မဟုတ် သက်တမ်းကုန်သွားပါပြီ' });
      }
      pendingTelegramOtps.delete(cleanChatId);

      const users = loadUsers();
      let user = users.find((u) => u.telegramChatId === cleanChatId);
      if (!user) {
        user = {
          userId: generateUniqueUserId(users),
          name: name.trim() || `TG-${cleanChatId.slice(-4)}`,
          email: `tg_${cleanChatId}@telegram.ttak`,
          provider: 'telegram',
          telegramChatId: cleanChatId,
          createdAt: Date.now()
        };
        users.push(user);
        saveUsers(users);

        const balances = loadUserBalances();
        if (!balances[user.userId]) {
          balances[user.userId] = { credits: 0, activePlanId: 'free', lastUpdated: Date.now() };
          saveUserBalances(balances);
        }

        notifyNewUserSignup(user).catch(() => {});
      }

      const token = createSessionForUser(user);
      setAuthSessionCookies(res, token, user);
      res.json({
        ok: true,
        token,
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          provider: user.provider
        }
      });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const authHeader = req.headers.authorization || '';
      const queryToken = typeof req.query.token === 'string' ? req.query.token.trim() : '';
      const cookieToken = readCookieValueFromReq(req, 'ttak_auth_token');
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : String(req.headers['x-auth-token'] || queryToken || cookieToken || '').trim();

      const rawUserCacheHeader = String(req.headers['x-auth-user-cache'] || '').trim();
      const cookieUserJson = readCookieValueFromReq(req, 'ttak_auth_user');

      if (!token && !rawUserCacheHeader && !cookieUserJson) {
        return res.status(401).json({ ok: false, error: 'Not authenticated' });
      }

      // Check if token was explicitly revoked via Sign Out
      if (token) {
        const h = crypto.createHash('sha256').update(token).digest('hex');
        if (loadRevokedTokenHashes().includes(h)) {
          return res.status(401).json({ ok: false, error: 'Session signed out' });
        }
      }

      // 1) Fast path: verify durable HMAC-signed session token (works even after container restarts!)
      const signedPayload = token ? verifySignedSessionToken(token) : null;
      if (signedPayload) {
        const users = loadUsers();
        let user =
          users.find((u) => u.userId === signedPayload.userId) ||
          users.find((u) => u.email === signedPayload.email);
        if (!user) {
          user = {
            userId: signedPayload.userId,
            name: signedPayload.name,
            email: signedPayload.email,
            provider: signedPayload.provider,
            photoUrl: signedPayload.photoUrl,
            telegramChatId: signedPayload.telegramChatId,
            createdAt: signedPayload.createdAt
          };
          users.push(user);
          saveUsers(users);
          const balances = loadUserBalances();
          if (!balances[user.userId]) {
            balances[user.userId] = { credits: 0, activePlanId: 'free', lastUpdated: Date.now() };
            saveUserBalances(balances);
          }
        }
        setAuthSessionCookies(res, token, user);
        return res.json({
          ok: true,
          token,
          user: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            provider: user.provider,
            photoUrl: user.photoUrl
          }
        });
      }

      // 2) Legacy random hex session lookup
      const sessions = loadSessions();
      const session = token ? sessions[token] : undefined;
      if (session && session.expiresAt >= Date.now()) {
        const users = loadUsers();
        const user = users.find((u) => u.userId === session.userId);
        if (user) {
          const upgradedToken = createSessionForUser(user);
          setAuthSessionCookies(res, upgradedToken, user);
          return res.json({
            ok: true,
            token: upgradedToken,
            user: {
              userId: user.userId,
              name: user.name,
              email: user.email,
              provider: user.provider,
              photoUrl: user.photoUrl
            }
          });
        }
      }

      // 3) Seamless restoration from client's persisted user cache (`x-auth-user-cache` or `ttak_auth_user` cookie)
      // when a Cloud Run instance cold-started or a legacy hex token was used before `ttak1.` tokens.
      let cachedProfile: any = null;
      if (rawUserCacheHeader) {
        try {
          cachedProfile = JSON.parse(Buffer.from(rawUserCacheHeader, 'base64').toString('utf-8'));
        } catch {}
      }
      if (!cachedProfile && cookieUserJson) {
        try {
          cachedProfile = JSON.parse(cookieUserJson);
        } catch {}
      }
      if (cachedProfile && typeof cachedProfile.userId === 'string' && typeof cachedProfile.email === 'string') {
        const cleanUserId = cachedProfile.userId.trim();
        const cleanEmail = cachedProfile.email.trim().toLowerCase();
        if (cleanUserId && cleanEmail) {
          const users = loadUsers();
          let user =
            users.find((u) => u.userId === cleanUserId) ||
            users.find((u) => u.email === cleanEmail);
          if (!user) {
            user = {
              userId: cleanUserId,
              name: String(cachedProfile.name || cleanEmail.split('@')[0] || 'Creator').trim(),
              email: cleanEmail,
              provider:
                cachedProfile.provider === 'google' ||
                cachedProfile.provider === 'email' ||
                cachedProfile.provider === 'telegram'
                  ? cachedProfile.provider
                  : 'google',
              photoUrl: typeof cachedProfile.photoUrl === 'string' ? cachedProfile.photoUrl : undefined,
              createdAt: Date.now()
            };
            users.push(user);
            saveUsers(users);
            const balances = loadUserBalances();
            if (!balances[user.userId]) {
              balances[user.userId] = { credits: 0, activePlanId: 'free', lastUpdated: Date.now() };
              saveUserBalances(balances);
            }
          }
          const freshToken = createSessionForUser(user);
          setAuthSessionCookies(res, freshToken, user);
          return res.json({
            ok: true,
            token: freshToken,
            user: {
              userId: user.userId,
              name: user.name,
              email: user.email,
              provider: user.provider,
              photoUrl: user.photoUrl
            }
          });
        }
      }

      return res.status(401).json({ ok: false, error: 'Session expired' });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const cookieToken = readCookieValueFromReq(req, 'ttak_auth_token');
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : String(req.headers['x-auth-token'] || cookieToken || '').trim();
      if (token) {
        revokeSessionToken(token);
        const sessions = loadSessions();
        if (sessions[token]) {
          delete sessions[token];
          saveSessions(sessions);
        }
      }
      clearAuthSessionCookies(res);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ ok: false, error: String(error) });
    }
  });

  // Checks custom domain status & whether https://<domain>/__/auth/handler is authorized in Google Cloud Console
  app.get('/api/auth/google-domain-status', async (req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const fbCfg = getFirebaseAppletConfig();
      const queryDomain = typeof req.query.domain === 'string' ? req.query.domain : '';
      const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '');
      const info = resolveCustomAuthDomainInfo({
        windowHost: queryDomain || forwardedHost,
        envAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
        appUrl: process.env.APP_URL,
        defaultAuthDomain: fbCfg.authDomain,
        projectId: fbCfg.projectId
      });

      const force = req.query.force === '1' || req.query.force === 'true';
      const customDomainRedirectReady = info.customDomain
        ? await checkGoogleRedirectUriReady(info.customDomain, fbCfg.oAuthClientId, force)
        : false;

      const activeAuthDomain =
        info.customDomain && customDomainRedirectReady
          ? info.customDomain
          : fbCfg.authDomain;

      res.json({
        ok: true,
        customDomain: info.customDomain,
        customDomainRedirectReady,
        activeAuthDomain,
        defaultAuthDomain: fbCfg.authDomain,
        requiredRedirectUri: info.requiredRedirectUri,
        requiredJsOrigin: info.requiredJsOrigin,
        oauthClientId: fbCfg.oAuthClientId,
        gcpCredentialsUrl: info.gcpCredentialsUrl,
        gcpConsentScreenUrl: info.gcpConsentScreenUrl
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: String(err) });
    }
  });

  // Built-in Firebase `/__/auth/*` & `/__/firebase/*` Reverse Proxy so custom domains (e.g. ttakb.site)
  // serve `/__/auth/handler` directly without needing manual Nginx rewrite rules
  app.all(['/__/auth/*', '/__/firebase/*'], async (req, res) => {
    try {
      const fbCfg = getFirebaseAppletConfig();
      const upstreamBase = `https://${fbCfg.authDomain}`;
      const upstreamUrl = `${upstreamBase}${req.originalUrl}`;
      const reqHost = extractCustomDomainHostname(
        String(req.headers['x-forwarded-host'] || req.headers.host || '')
      );

      if (req.path === '/__/firebase/init.json') {
        let initObj: Record<string, any> = {
          projectId: fbCfg.projectId,
          apiKey: fbCfg.apiKey,
          authDomain: reqHost || fbCfg.authDomain
        };
        try {
          if (fs.existsSync(FIREBASE_CONFIG_FILE)) {
            const rawCfg = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf-8'));
            initObj = {
              ...rawCfg,
              authDomain: reqHost || rawCfg.authDomain || fbCfg.authDomain
            };
          }
        } catch {}
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json(initObj);
        return;
      }

      const fetchInit: RequestInit = {
        method: req.method,
        headers: {
          'User-Agent': String(req.headers['user-agent'] || 'Mozilla/5.0'),
          Accept: String(req.headers.accept || '*/*')
        },
        signal: AbortSignal.timeout(10000)
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        if (typeof req.body === 'string') {
          fetchInit.body = req.body;
        } else if (typeof req.body === 'object') {
          const params = new URLSearchParams();
          for (const [k, v] of Object.entries(req.body)) {
            if (v !== undefined && v !== null) params.set(k, String(v));
          }
          fetchInit.body = params.toString();
          (fetchInit.headers as Record<string, string>)['Content-Type'] =
            'application/x-www-form-urlencoded';
        }
      }

      const upstreamResp = await fetch(upstreamUrl, fetchInit);
      const contentType = upstreamResp.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      const cacheControl = upstreamResp.headers.get('cache-control');
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl);
      }
      const buf = Buffer.from(await upstreamResp.arrayBuffer());
      res.status(upstreamResp.status).send(buf);
    } catch (proxyErr) {
      res.status(502).send(`Firebase Auth Proxy Error: ${String(proxyErr)}`);
    }
  });

  // Ensure unknown /api/* routes (including missing video/audio assets) always return JSON 404, never SPA index.html
  app.all('/api/*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({ ok: false, error: 'API endpoint or media file not found' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TTAK MOVIE RECAP Studio server running on http://localhost:${PORT}`);
  });
}

startServer();

