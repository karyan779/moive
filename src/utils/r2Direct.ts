/**
 * Pure utilities & constants for Cloudflare R2 Direct Upload (Single PUT + Multipart up to 2GB).
 */

export const R2_MULTIPART_THRESHOLD_BYTES = 50 * 1024 * 1024; // 50 MB
export const R2_DEFAULT_PART_SIZE_BYTES = 16 * 1024 * 1024; // 16 MB per part (S3 minimum is 5MB)
export const R2_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB max file size
export const R2_MIN_PART_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB S3 minimum part size

export type DirectUploadStrategy =
  | 'r2_presigned_put'
  | 'r2_multipart'
  | 'local_direct_stream';

export interface R2StoredConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl?: string;
  updatedAt?: number;
}

export interface R2MultipartPartPlan {
  partNumber: number;
  startByte: number;
  endByte: number;
  sizeBytes: number;
}

export interface R2MultipartPlan {
  partSizeBytes: number;
  totalParts: number;
  parts: R2MultipartPartPlan[];
}

export function isValidR2Config(cfg: Partial<R2StoredConfig> | null | undefined): cfg is R2StoredConfig {
  if (!cfg) return false;
  return Boolean(
    cfg.accountId &&
      cfg.accountId.trim().length >= 8 &&
      cfg.accessKeyId &&
      cfg.accessKeyId.trim().length >= 8 &&
      cfg.secretAccessKey &&
      cfg.secretAccessKey.trim().length >= 12 &&
      cfg.bucketName &&
      cfg.bucketName.trim().length >= 2
  );
}

export function maskR2Secret(raw: string): string {
  const clean = (raw || '').trim();
  if (!clean) return '';
  if (clean.length <= 8) return `${clean.slice(0, 2)}••••${clean.slice(-2)}`;
  return `${clean.slice(0, 4)}••••••${clean.slice(-4)}`;
}

export function buildR2Endpoint(accountId: string): string {
  const cleanId = accountId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return `https://${cleanId}.r2.cloudflarestorage.com`;
}

export function sanitizeR2Filename(filename: string): string {
  const base = (filename || 'video.mp4').split(/[\\/]/).pop() || 'video.mp4';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 96) || 'video.mp4';
}

export type R2KeyPrefix = 'uploads' | 'subtitles' | 'outputs';

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function createUploadUlid(nowMs = Date.now()): string {
  let timePart = '';
  let t = Math.max(0, Math.floor(nowMs));
  for (let i = 0; i < 10; i++) {
    timePart = CROCKFORD_BASE32[t % 32] + timePart;
    t = Math.floor(t / 32);
  }
  let randPart = '';
  for (let i = 0; i < 16; i++) {
    randPart += CROCKFORD_BASE32[Math.floor(Math.random() * 32)];
  }
  return `${timePart}${randPart}`;
}

export function getMediaContentType(filename: string, fallbackType?: string): string {
  const lower = (filename || '').toLowerCase();
  if (lower.endsWith('.srt')) return 'application/x-subrip';
  if (lower.endsWith('.vtt')) return 'text/vtt';
  if (lower.endsWith('.mkv')) return 'video/x-matroska';
  if (lower.endsWith('.mov')) return 'video/quicktime';
  if (lower.endsWith('.webm')) return 'video/webm';
  if (lower.endsWith('.mp4')) return 'video/mp4';
  return fallbackType && fallbackType.trim() ? fallbackType.trim() : 'application/octet-stream';
}

export function stripSrtTimestampsToText(rawSrt: string, maxChars = 18000): string {
  if (!rawSrt) return '';
  const lines = rawSrt.replace(/\r\n/g, '\n').split('\n');
  const collected: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^WEBVTT/i.test(trimmed)) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/^\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{3}/.test(trimmed)) continue;
    if (/^\d{1,2}:\d{2}[,.]\d{3}\s*-->\s*\d{1,2}:\d{2}[,.]\d{3}/.test(trimmed)) continue;
    const cleanText = trimmed.replace(/<[^>]+>/g, '').trim();
    if (cleanText) collected.push(cleanText);
  }
  return collected.join(' ').replace(/\s+/g, ' ').trim().slice(0, maxChars);
}

export function buildR2ObjectKey(
  filename: string,
  prefix: R2KeyPrefix = 'uploads',
  nowMs = Date.now(),
  randSuffix?: string
): string {
  const datePart = new Date(nowMs).toISOString().slice(0, 10);
  const safeName = sanitizeR2Filename(filename);
  const suffix =
    (randSuffix || Math.random().toString(36).slice(2, 10)).replace(/[^a-zA-Z0-9_-]/g, '') ||
    'file';
  return `${prefix}/${datePart}/${nowMs}_${suffix}_${safeName}`;
}

export function chooseUploadStrategy(
  fileSizeBytes: number,
  r2Configured: boolean
): DirectUploadStrategy {
  if (!r2Configured) {
    return 'local_direct_stream';
  }
  if (fileSizeBytes > R2_MULTIPART_THRESHOLD_BYTES) {
    return 'r2_multipart';
  }
  return 'r2_presigned_put';
}

export function computeMultipartPlan(
  fileSizeBytes: number,
  requestedPartSizeBytes = R2_DEFAULT_PART_SIZE_BYTES
): R2MultipartPlan {
  const safeFileSize = Math.max(1, Math.floor(fileSizeBytes));
  // Ensure we never exceed S3's 10,000 part limit and stay >= 5MB per part (except last part)
  const minFor10kParts = Math.ceil(safeFileSize / 9500);
  const partSizeBytes = Math.max(
    R2_MIN_PART_SIZE_BYTES,
    requestedPartSizeBytes,
    minFor10kParts
  );

  const parts: R2MultipartPartPlan[] = [];
  let startByte = 0;
  let partNumber = 1;

  while (startByte < safeFileSize) {
    const endByte = Math.min(safeFileSize, startByte + partSizeBytes);
    parts.push({
      partNumber,
      startByte,
      endByte,
      sizeBytes: endByte - startByte
    });
    startByte = endByte;
    partNumber++;
  }

  return {
    partSizeBytes,
    totalParts: parts.length,
    parts
  };
}

export function formatBytesReadable(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function buildPublicR2ObjectUrl(
  publicBaseUrl: string | undefined,
  objectKey: string
): string | undefined {
  const cleanBase = (publicBaseUrl || '').trim().replace(/\/+$/, '');
  if (!cleanBase) return undefined;
  const cleanKey = objectKey.replace(/^\/+/, '');
  return `${cleanBase}/${cleanKey}`;
}
