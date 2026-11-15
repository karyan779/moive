import test from 'node:test';
import assert from 'node:assert/strict';
import {
  R2_MULTIPART_THRESHOLD_BYTES,
  R2_DEFAULT_PART_SIZE_BYTES,
  isValidR2Config,
  maskR2Secret,
  buildR2Endpoint,
  sanitizeR2Filename,
  buildR2ObjectKey,
  chooseUploadStrategy,
  computeMultipartPlan,
  formatBytesReadable,
  buildPublicR2ObjectUrl,
  createUploadUlid,
  getMediaContentType,
  stripSrtTimestampsToText,
  formatUploadMbProgress,
  shouldAbortStalledUpload
} from './r2Direct.ts';

test('isValidR2Config and maskR2Secret validate and safely mask R2 credentials', () => {
  assert.equal(isValidR2Config(null), false);
  assert.equal(
    isValidR2Config({
      accountId: 'short',
      accessKeyId: '12345678',
      secretAccessKey: '123456789012',
      bucketName: 'my-bucket'
    }),
    false
  );
  assert.equal(
    isValidR2Config({
      accountId: 'a1b2c3d4e5f60718293a',
      accessKeyId: 'r2accesskey123456',
      secretAccessKey: 'r2secretaccesskey1234567890',
      bucketName: 'ttak-videos'
    }),
    true
  );

  assert.equal(maskR2Secret('r2accesskey123456'), 'r2ac••••••3456');
  assert.equal(buildR2Endpoint('a1b2c3d4e5f6'), 'https://a1b2c3d4e5f6.r2.cloudflarestorage.com');
});

test('sanitizeR2Filename and buildR2ObjectKey produce safe S3 object keys', () => {
  assert.equal(sanitizeR2Filename('../../My Movie (1080p)!.mp4'), 'My_Movie_1080p_.mp4');
  const key = buildR2ObjectKey('My Movie.mp4', 'uploads', 1730000000000, 'abc123');
  assert.ok(key.startsWith('uploads/2024-10-27/1730000000000_abc123_My_Movie.mp4'));
  const srtKey = buildR2ObjectKey('Interstellar.en.srt', 'subtitles', 1730000000000, 'srt01');
  assert.ok(srtKey.startsWith('subtitles/2024-10-27/1730000000000_srt01_Interstellar.en.srt'));
  assert.equal(
    buildPublicR2ObjectUrl('https://cdn.example.com/', key),
    `https://cdn.example.com/${key}`
  );
  assert.equal(buildPublicR2ObjectUrl('', key), undefined);
});

test('createUploadUlid, getMediaContentType, and stripSrtTimestampsToText behave like StreamWave upload sign flow', () => {
  const ulid = createUploadUlid(1730000000000);
  assert.equal(ulid.length, 26);
  assert.match(ulid, /^[0-9A-HJKMNP-TV-Z]{26}$/);

  assert.equal(getMediaContentType('movie.srt'), 'application/x-subrip');
  assert.equal(getMediaContentType('movie.vtt'), 'text/vtt');
  assert.equal(getMediaContentType('movie.mkv'), 'video/x-matroska');
  assert.equal(getMediaContentType('movie.mp4'), 'video/mp4');

  const rawSrt = `1
00:00:01,000 --> 00:00:03,500
<i>Hello world</i>

2
00:00:04,000 --> 00:00:06,000
Time to leave Earth.`;
  assert.equal(stripSrtTimestampsToText(rawSrt), 'Hello world Time to leave Earth.');
});

test('chooseUploadStrategy routes small vs >50MB files and local fallback cleanly', () => {
  assert.equal(chooseUploadStrategy(10 * 1024 * 1024, false), 'local_direct_stream');
  assert.equal(chooseUploadStrategy(200 * 1024 * 1024, false), 'local_direct_stream');
  assert.equal(chooseUploadStrategy(R2_MULTIPART_THRESHOLD_BYTES, true), 'r2_presigned_put');
  assert.equal(chooseUploadStrategy(R2_MULTIPART_THRESHOLD_BYTES + 1, true), 'r2_multipart');
});

test('computeMultipartPlan splits up to 2GB into exact contiguous byte ranges', () => {
  const plan120MB = computeMultipartPlan(120 * 1024 * 1024);
  assert.equal(plan120MB.partSizeBytes, R2_DEFAULT_PART_SIZE_BYTES);
  assert.equal(plan120MB.totalParts, 8);
  assert.equal(plan120MB.parts[0].partNumber, 1);
  assert.equal(plan120MB.parts[0].startByte, 0);
  assert.equal(plan120MB.parts[0].endByte, R2_DEFAULT_PART_SIZE_BYTES);
  assert.equal(plan120MB.parts[7].endByte, 120 * 1024 * 1024);

  const summed = plan120MB.parts.reduce((acc, p) => acc + p.sizeBytes, 0);
  assert.equal(summed, 120 * 1024 * 1024);

  assert.equal(formatBytesReadable(1536), '1.5 KB');
  assert.equal(formatBytesReadable(104857600), '100.0 MB');
  assert.equal(formatBytesReadable(2 * 1024 * 1024 * 1024), '2.00 GB');
  assert.equal(formatUploadMbProgress(5 * 1024 * 1024, 20 * 1024 * 1024), '5.0 / 20.0 MB');
  assert.equal(shouldAbortStalledUpload(19999, 20000), false);
  assert.equal(shouldAbortStalledUpload(20000, 20000), true);
});
