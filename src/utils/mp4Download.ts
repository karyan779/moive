import {
  RANGE_DOWNLOAD_CHUNK_BYTES,
  RANGE_DOWNLOAD_PROBE_BYTES,
  buildDownloadVideoApiPath,
  computeRangeDownloadChunks,
  extractJobIdFromVideoUrl,
  isValidMp4BufferHeader,
  isValidPlayableMediaResponse,
  parseContentRangeTotalBytes,
  sanitizeMp4DownloadName,
  shouldUseBlobDownloadForSize
} from './recapEngine';

export interface VerifiedMp4DownloadOptions {
  videoUrl: string;
  jobId?: string | null;
  rawTitle?: string | null;
  fallbackFilename?: string;
  isFreeMode?: boolean;
  onProgress?: (pct: number) => void;
}

function triggerAnchorBlobDownload(blobUrl: string, downloadFilename: string): void {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = downloadFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Triggers a guaranteed `.mp4` download across Android Chrome, iOS Safari, and Desktop browsers:
 * 1. If a server jobId is available in R2 mode, resolves `/api/recap/:jobId/download/video`
 *    to obtain a direct Cloudflare R2 Presigned GET URL (`ResponseContentDisposition: attachment`)
 *    and navigates via `window.location.assign(url)` (matching StreamWaveAI's zero-proxy pattern).
 * 2. Otherwise probes the first 64KB via `Range: bytes=0-65535` to verify MP4 `ftyp` magic bytes
 *    and discover exact file size, then downloads remaining bytes in 8MB HTTP 206 Range chunks.
 *    Each 8MB chunk stays well below Cloud Run's 32MB response limit and assembles into a verified
 *    `video/mp4` Blob so multi-minute videos (48MB+) download 100% cleanly without failing or saving `.mp4.html`.
 */
export async function downloadVerifiedMp4File(opts: VerifiedMp4DownloadOptions): Promise<boolean> {
  const {
    videoUrl,
    jobId,
    rawTitle,
    fallbackFilename = 'ttak_recap',
    isFreeMode = false,
    onProgress
  } = opts;

  if (!videoUrl) return false;

  const downloadFilename = sanitizeMp4DownloadName(rawTitle, fallbackFilename);
  const isBlobUrl = videoUrl.startsWith('blob:');

  if (isBlobUrl) {
    const resp = await fetch(videoUrl, { method: 'GET', cache: 'no-store' });
    if (!resp.ok) return false;
    const rawBlob = await resp.blob();
    const headBuf = new Uint8Array(await rawBlob.slice(0, 32).arrayBuffer());
    if (!isValidMp4BufferHeader(headBuf, rawBlob.size)) return false;

    triggerAnchorBlobDownload(videoUrl, downloadFilename);
    return true;
  }

  const effectiveJobId = jobId || extractJobIdFromVideoUrl(videoUrl);
  let targetUrl = videoUrl;

  // Step 1: Try StreamWaveAI-style `/api/recap/:jobId/download/video` endpoint first
  if (effectiveJobId) {
    try {
      const apiPath = buildDownloadVideoApiPath(
        effectiveJobId,
        downloadFilename,
        videoUrl,
        isFreeMode
      );
      const metaResp = await fetch(apiPath, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin'
      });
      const metaText = await metaResp.text();
      if (metaText && !metaText.trim().startsWith('<')) {
        const metaJson = JSON.parse(metaText) as {
          ok?: boolean;
          storage?: 'r2' | 'local';
          url?: string;
        };
        if (metaResp.ok && metaJson.ok && metaJson.url) {
          if (metaJson.storage === 'r2' && /^https?:\/\//i.test(metaJson.url)) {
            onProgress?.(100);
            window.location.assign(metaJson.url);
            return true;
          }
          targetUrl = metaJson.url;
        }
      }
    } catch {
      // Fall back to direct verified stream below
    }
  }

  // Ensure local stream URL carries explicit attachment filename params
  const sep = targetUrl.includes('?') ? '&' : '?';
  const dlUrl =
    targetUrl.startsWith('/api/recap/video/') && !targetUrl.includes('dl=1')
      ? `${targetUrl}${sep}dl=1&name=${encodeURIComponent(downloadFilename)}`
      : targetUrl;

  onProgress?.(10);

  // Step 2: Probe first 64KB via HTTP Range so even >32MB videos never fail on Cloud Run's 32MB response cap
  const probeEndByte = RANGE_DOWNLOAD_PROBE_BYTES - 1;
  const probeResp = await fetch(dlUrl, {
    method: 'GET',
    headers: {
      Range: `bytes=0-${probeEndByte}`
    },
    cache: 'no-store',
    credentials: 'same-origin'
  });

  const contentType = probeResp.headers.get('content-type');
  if (!isValidPlayableMediaResponse(probeResp.status, probeResp.ok, contentType, 'video/')) {
    return false;
  }

  const totalBytes = parseContentRangeTotalBytes(
    probeResp.headers.get('content-range'),
    probeResp.headers.get('content-length'),
    probeResp.status
  );

  // If the server returned 206 Partial Content and we know totalBytes
  if (probeResp.status === 206 && totalBytes > 0) {
    const firstChunkBuf = new Uint8Array(await probeResp.arrayBuffer());
    if (!isValidMp4BufferHeader(firstChunkBuf.subarray(0, 64), totalBytes)) {
      return false;
    }

    // If total file size exceeds mobile RAM threshold (>180MB), navigate directly
    if (!shouldUseBlobDownloadForSize(totalBytes)) {
      onProgress?.(100);
      window.location.assign(dlUrl);
      return true;
    }

    const blobParts: BlobPart[] = [firstChunkBuf as unknown as BlobPart];
    let bytesLoaded = firstChunkBuf.byteLength;

    if (bytesLoaded < totalBytes) {
      const remainingRanges = computeRangeDownloadChunks(
        totalBytes,
        bytesLoaded,
        RANGE_DOWNLOAD_CHUNK_BYTES
      );

      for (const range of remainingRanges) {
        let chunkBuf: Uint8Array | null = null;
        let lastErr: unknown = null;

        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const chunkResp = await fetch(dlUrl, {
              method: 'GET',
              headers: {
                Range: `bytes=${range.start}-${range.end}`
              },
              cache: 'no-store',
              credentials: 'same-origin'
            });
            const chunkType = chunkResp.headers.get('content-type');
            if (
              chunkResp.status !== 206 ||
              !isValidPlayableMediaResponse(chunkResp.status, chunkResp.ok, chunkType, 'video/')
            ) {
              throw new Error(`Unexpected chunk status ${chunkResp.status}`);
            }
            const arr = new Uint8Array(await chunkResp.arrayBuffer());
            const expectedLen = range.end - range.start + 1;
            if (arr.byteLength !== expectedLen) {
              throw new Error(
                `Incomplete chunk bytes (${arr.byteLength} of ${expectedLen})`
              );
            }
            chunkBuf = arr;
            break;
          } catch (err) {
            lastErr = err;
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
            }
          }
        }

        if (!chunkBuf) {
          console.error('[MP4 Range Download] Chunk failed after 3 attempts:', lastErr);
          return false;
        }

        blobParts.push(chunkBuf as unknown as BlobPart);
        bytesLoaded += chunkBuf.byteLength;
        if (onProgress) {
          const pct = Math.max(12, Math.min(99, Math.round((bytesLoaded / totalBytes) * 100)));
          onProgress(pct);
        }
      }
    }

    if (bytesLoaded < totalBytes) {
      return false;
    }

    onProgress?.(100);
    const mp4Blob = new Blob(blobParts, { type: 'video/mp4' });
    const blobUrl = URL.createObjectURL(mp4Blob);
    triggerAnchorBlobDownload(blobUrl, downloadFilename);
    setTimeout(() => {
      try {
        URL.revokeObjectURL(blobUrl);
      } catch {}
    }, 120000);
    return true;
  }

  // Fallback when server returned 200 OK (entire file in response)
  const contentLength = Number(probeResp.headers.get('content-length') || 0);
  if (
    !shouldUseBlobDownloadForSize(contentLength) &&
    probeResp.body &&
    typeof probeResp.body.getReader === 'function'
  ) {
    const reader = probeResp.body.getReader();
    try {
      const { value, done } = await reader.read();
      if (done || !value || !isValidMp4BufferHeader(value.subarray(0, 64), contentLength)) {
        return false;
      }
    } finally {
      reader.cancel().catch(() => {});
    }
    onProgress?.(100);
    window.location.assign(dlUrl);
    return true;
  }

  const rawBlob = await probeResp.blob();
  const headBuf = new Uint8Array(await rawBlob.slice(0, 64).arrayBuffer());
  if (!isValidMp4BufferHeader(headBuf, rawBlob.size)) {
    return false;
  }

  onProgress?.(100);
  const mp4Blob = new Blob([rawBlob], { type: 'video/mp4' });
  const blobUrl = URL.createObjectURL(mp4Blob);
  triggerAnchorBlobDownload(blobUrl, downloadFilename);
  setTimeout(() => {
    try {
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 120000);
  return true;
}
