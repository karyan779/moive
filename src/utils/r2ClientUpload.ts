import {
  chooseUploadStrategy,
  computeMultipartPlan,
  getMediaContentType,
  stripSrtTimestampsToText,
  R2_MAX_UPLOAD_BYTES
} from './r2Direct';

export type UploadSignEndpointMode = 'recap' | 'movie-recap';

export interface DirectVideoUploadResult {
  strategy: 'r2_presigned_put' | 'r2_multipart' | 'local_direct_stream';
  r2ObjectKey?: string;
  r2Ulid?: string;
  r2PublicUrl?: string;
  localUploadId?: string;
  fileSizeBytes: number;
}

export interface DirectSrtUploadResult {
  strategy: 'r2_presigned_put' | 'local_text';
  r2SrtKey?: string;
  r2SrtUlid?: string;
  srtText: string;
}

export interface R2PublicStatus {
  configured: boolean;
  mode: 'r2_direct' | 'local_stream';
  maxUploadBytes: number;
  multipartThresholdBytes: number;
}

const XHR_DIRECT_TIMEOUT_MS = 7200000; // 2 hours (matches StreamWave timeout: 72e5)
const FORBIDDEN_XHR_HEADERS = new Set(['host', 'content-length', 'origin', 'user-agent']);

function parseJsonTextSafe<T>(rawText: string, fallback: T): T {
  const trimmed = (rawText || '').trim();
  if (!trimmed || trimmed.startsWith('<')) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

export async function fetchR2PublicStatus(): Promise<R2PublicStatus> {
  try {
    const res = await fetch('/api/r2/status');
    if (res.ok) {
      const text = await res.text();
      const parsed = parseJsonTextSafe<R2PublicStatus | null>(text, null);
      if (parsed && typeof parsed.configured === 'boolean') {
        return parsed;
      }
    }
  } catch {}
  return {
    configured: false,
    mode: 'local_stream',
    maxUploadBytes: R2_MAX_UPLOAD_BYTES,
    multipartThresholdBytes: 50 * 1024 * 1024
  };
}

function xhrUploadBinary(
  url: string,
  method: 'PUT' | 'POST',
  body: Blob | File,
  headers: Record<string, string>,
  onLoadedBytes?: (loaded: number) => void
): Promise<{ status: number; responseText: string; etag?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url, true);
    xhr.timeout = XHR_DIRECT_TIMEOUT_MS;
    for (const [k, v] of Object.entries(headers)) {
      if (!FORBIDDEN_XHR_HEADERS.has(k.toLowerCase()) && v) {
        xhr.setRequestHeader(k, v);
      }
    }
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable && onLoadedBytes) {
        onLoadedBytes(ev.loaded);
      }
    };
    xhr.onload = () => {
      const etag = xhr.getResponseHeader('ETag') || xhr.getResponseHeader('etag') || undefined;
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ status: xhr.status, responseText: xhr.responseText || '', etag });
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 140) || xhr.statusText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during direct upload (check R2 CORS)'));
    xhr.ontimeout = () => reject(new Error('Direct upload timed out'));
    xhr.onabort = () => reject(new Error('Upload aborted'));
    xhr.send(body);
  });
}

const LOCAL_STREAM_CHUNK_BYTES = 16 * 1024 * 1024; // 16MB per chunk (well below Cloud Run's 32MB request cap)

async function uploadToLocalDirectStream(
  file: File,
  onProgress?: (pct: number, detail: string) => void
): Promise<DirectVideoUploadResult> {
  const totalBytes = file.size;
  if (totalBytes <= LOCAL_STREAM_CHUNK_BYTES) {
    const resp = await xhrUploadBinary(
      `/api/upload/local-direct?filename=${encodeURIComponent(file.name)}`,
      'POST',
      file,
      { 'Content-Type': 'application/octet-stream' },
      (loaded) => {
        if (onProgress && totalBytes > 0) {
          const pct = Math.min(100, Math.round((loaded / totalBytes) * 100));
          onProgress(pct, `Uploading video ${pct}%…`);
        }
      }
    );
    const parsed = parseJsonTextSafe<{ ok?: boolean; localUploadId?: string; error?: string }>(
      resp.responseText,
      {}
    );
    if (!parsed.ok || !parsed.localUploadId) {
      throw new Error(parsed.error || 'Local direct stream upload failed');
    }
    return {
      strategy: 'local_direct_stream',
      localUploadId: parsed.localUploadId,
      fileSizeBytes: totalBytes
    };
  }

  // Multi-chunk 16MB streaming upload for large 8+ minute videos (>16MB)
  let localUploadId = '';
  let offset = 0;
  let chunkIndex = 0;
  const totalChunks = Math.ceil(totalBytes / LOCAL_STREAM_CHUNK_BYTES);

  while (offset < totalBytes) {
    const end = Math.min(totalBytes, offset + LOCAL_STREAM_CHUNK_BYTES);
    const slice = file.slice(offset, end);
    const query =
      chunkIndex === 0
        ? `filename=${encodeURIComponent(file.name)}`
        : `uploadId=${encodeURIComponent(localUploadId)}&append=1&filename=${encodeURIComponent(file.name)}`;

    const currentOffset = offset;
    const resp = await xhrUploadBinary(
      `/api/upload/local-direct?${query}`,
      'POST',
      slice,
      { 'Content-Type': 'application/octet-stream' },
      (loaded) => {
        if (onProgress && totalBytes > 0) {
          const pct = Math.min(100, Math.round(((currentOffset + loaded) / totalBytes) * 100));
          onProgress(pct, `Uploading video (${chunkIndex + 1}/${totalChunks}) · ${pct}%…`);
        }
      }
    );
    const parsed = parseJsonTextSafe<{ ok?: boolean; localUploadId?: string; error?: string }>(
      resp.responseText,
      {}
    );
    if (!parsed.ok || !parsed.localUploadId) {
      throw new Error(parsed.error || `Chunk ${chunkIndex + 1} upload failed`);
    }
    localUploadId = parsed.localUploadId;
    offset = end;
    chunkIndex++;
  }

  return {
    strategy: 'local_direct_stream',
    localUploadId,
    fileSizeBytes: totalBytes
  };
}

/**
 * Uploads a video file directly to Cloudflare R2 via StreamWave-compatible presign routes
 * (`/api/upload/sign` or `/api/movie-recap/upload/sign`) for <=50MB, or presigned
 * R2 Multipart Upload for >50MB up to 2GB. Falls back gracefully to `/api/upload/local-direct`
 * when R2 credentials are not configured yet or CORS rejects browser PUT.
 */
export async function uploadVideoDirect(
  file: File,
  onProgress?: (pct: number, detail: string) => void,
  endpointMode: UploadSignEndpointMode = 'recap',
  useR2Direct = true
): Promise<DirectVideoUploadResult> {
  if (file.size > R2_MAX_UPLOAD_BYTES) {
    throw new Error('Video exceeds maximum 2GB upload limit');
  }

  if (!useR2Direct) {
    return await uploadToLocalDirectStream(file, onProgress);
  }

  const status = await fetchR2PublicStatus();
  const strategy = chooseUploadStrategy(file.size, status.configured);

  if (strategy === 'local_direct_stream') {
    return await uploadToLocalDirectStream(file, onProgress);
  }

  const contentType = getMediaContentType(file.name, file.type || 'video/mp4');

  if (strategy === 'r2_presigned_put') {
    try {
      onProgress?.(2, 'Preparing High-Speed Cloud Upload…');
      const signUrl =
        endpointMode === 'movie-recap' ? '/api/movie-recap/upload/sign' : '/api/upload/sign';
      const presignRes = await fetch(signUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: contentType,
          size: file.size,
          ...(endpointMode === 'movie-recap' ? { upload_type: 'video' } : {})
        })
      });
      const presignData = (await presignRes.json()) as {
        ok?: boolean;
        ulid?: string;
        key?: string;
        url?: string;
        headers?: Record<string, string>;
        publicUrl?: string;
        error?: string;
      };
      if (!presignRes.ok || !presignData.ok || !presignData.url || !presignData.key) {
        throw new Error(presignData.error || 'Failed to generate R2 presigned URL');
      }

      const uploadHeaders =
        presignData.headers && Object.keys(presignData.headers).length > 0
          ? presignData.headers
          : { 'Content-Type': contentType };

      await xhrUploadBinary(
        presignData.url,
        'PUT',
        file,
        uploadHeaders,
        (loaded) => {
          if (onProgress && file.size > 0) {
            const pct = Math.min(100, Math.round((loaded / file.size) * 100));
            onProgress(pct, `Uploading to High-Speed Cloud (${pct}%)…`);
          }
        }
      );

      onProgress?.(100, '✓ Uploaded to High-Speed Cloud!');
      return {
        strategy: 'r2_presigned_put',
        r2ObjectKey: presignData.key,
        r2Ulid: presignData.ulid,
        r2PublicUrl: presignData.publicUrl,
        fileSizeBytes: file.size
      };
    } catch (r2Err) {
      console.warn('[R2 Direct] Falling back to local stream upload:', r2Err);
      return await uploadToLocalDirectStream(file, onProgress);
    }
  }

  // R2 Multipart (> 50MB up to 2GB)
  let activeUploadId = '';
  let activeObjectKey = '';
  try {
    onProgress?.(2, 'Initializing High-Speed Cloud Upload…');
    const createRes = await fetch('/api/r2/multipart/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        contentType,
        sizeBytes: file.size
      })
    });
    const createData = (await createRes.json()) as {
      ok?: boolean;
      uploadId?: string;
      objectKey?: string;
      partSizeBytes?: number;
      error?: string;
    };
    if (!createRes.ok || !createData.ok || !createData.uploadId || !createData.objectKey) {
      throw new Error(createData.error || 'Failed to initialize R2 multipart upload');
    }

    activeUploadId = createData.uploadId;
    activeObjectKey = createData.objectKey;
    const plan = computeMultipartPlan(file.size, createData.partSizeBytes);
    const completedParts: Array<{ PartNumber: number; ETag: string }> = [];
    let uploadedBytesCompleted = 0;

    for (const part of plan.parts) {
      const signRes = await fetch('/api/r2/multipart/sign-part', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectKey: activeObjectKey,
          uploadId: activeUploadId,
          partNumber: part.partNumber
        })
      });
      const signData = (await signRes.json()) as { ok?: boolean; uploadUrl?: string; error?: string };
      if (!signRes.ok || !signData.ok || !signData.uploadUrl) {
        throw new Error(signData.error || `Failed to sign part ${part.partNumber}`);
      }

      const chunkBlob = file.slice(part.startByte, part.endByte);
      const putResult = await xhrUploadBinary(
        signData.uploadUrl,
        'PUT',
        chunkBlob,
        {},
        (loaded) => {
          const totalLoaded = uploadedBytesCompleted + loaded;
          const pct = Math.min(99, Math.round((totalLoaded / file.size) * 100));
          onProgress?.(
            pct,
            `Uploading Cloud Part (${part.partNumber}/${plan.totalParts}) · ${pct}%…`
          );
        }
      );

      uploadedBytesCompleted += part.sizeBytes;
      const cleanEtag = (putResult.etag || `"part-${part.partNumber}"`).replace(/^"+|"+$/g, '');
      completedParts.push({
        PartNumber: part.partNumber,
        ETag: `"${cleanEtag}"`
      });
    }

    const completeRes = await fetch('/api/r2/multipart/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objectKey: activeObjectKey,
        uploadId: activeUploadId,
        parts: completedParts
      })
    });
    const completeData = (await completeRes.json()) as {
      ok?: boolean;
      objectKey?: string;
      publicUrl?: string;
      error?: string;
    };
    if (!completeRes.ok || !completeData.ok) {
      throw new Error(completeData.error || 'Failed to complete R2 multipart upload');
    }

    onProgress?.(100, '✓ Uploaded to High-Speed Cloud!');
    return {
      strategy: 'r2_multipart',
      r2ObjectKey: activeObjectKey,
      r2PublicUrl: completeData.publicUrl,
      fileSizeBytes: file.size
    };
  } catch (multipartErr) {
    if (activeUploadId && activeObjectKey) {
      try {
        await fetch('/api/r2/multipart/abort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ objectKey: activeObjectKey, uploadId: activeUploadId })
        });
      } catch {}
    }
    console.warn('[R2 Multipart] Falling back to local stream upload:', multipartErr);
    return await uploadToLocalDirectStream(file, onProgress);
  }
}

/**
 * Uploads an .SRT / .VTT subtitle file directly to cloud storage using
 * `/api/movie-recap/upload/sign` (`upload_type: 'srt'`), matching StreamWave's Long-Form studio.
 * Always extracts clean transcript text locally too as fallback/context.
 */
export async function uploadSrtToR2Direct(
  file: File,
  onProgress?: (pct: number, detail: string) => void
): Promise<DirectSrtUploadResult> {
  const rawText = await file.text();
  const srtText = stripSrtTimestampsToText(rawText);

  const status = await fetchR2PublicStatus();
  if (!status.configured) {
    onProgress?.(100, '✓ .SRT Subtitle Parsed');
    return { strategy: 'local_text', srtText };
  }

  try {
    const contentType = getMediaContentType(file.name, 'application/x-subrip');
    onProgress?.(10, 'Preparing .SRT Cloud Upload…');
    const signRes = await fetch('/api/movie-recap/upload/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        content_type: contentType,
        size: file.size,
        upload_type: 'srt'
      })
    });
    const signData = (await signRes.json()) as {
      ok?: boolean;
      ulid?: string;
      key?: string;
      url?: string;
      headers?: Record<string, string>;
      error?: string;
    };
    if (!signRes.ok || !signData.ok || !signData.url || !signData.key) {
      throw new Error(signData.error || 'Failed to sign SRT upload');
    }

    await xhrUploadBinary(
      signData.url,
      'PUT',
      file,
      signData.headers && Object.keys(signData.headers).length > 0
        ? signData.headers
        : { 'Content-Type': contentType },
      (loaded) => {
        if (onProgress && file.size > 0) {
          const pct = Math.min(100, Math.round((loaded / file.size) * 100));
          onProgress(pct, `Uploading .SRT (${pct}%)…`);
        }
      }
    );

    onProgress?.(100, '✓ .SRT Uploaded to High-Speed Cloud');
    return {
      strategy: 'r2_presigned_put',
      r2SrtKey: signData.key,
      r2SrtUlid: signData.ulid,
      srtText
    };
  } catch (err) {
    console.warn('[R2 Direct .SRT] Using local parsed subtitle fallback:', err);
    onProgress?.(100, '✓ .SRT Parsed Locally');
    return { strategy: 'local_text', srtText };
  }
}
