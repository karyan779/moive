import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDuration,
  msToSrtTime,
  exportCuesToSrt,
  parseSrtToCues,
  findActiveCue,
  calculateSubtitleScalePercent,
  clampBlurRegion,
  CREDIT_SECONDS_PER_UNIT,
  calculateCreditCost,
  parseDismissedSiteNotificationIds,
  addDismissedSiteNotificationId,
  shouldShowSiteNotification,
  buildSyncedRecapCues,
  splitCuesIntoShortPhrases,
  getVoicePreviewSampleText,
  alignCuesWithAudioSync,
  SCRIPT_STYLE_PROMPTS,
  STREAMWAVE_VOICE_STYLE_PROMPTS,
  FREE_DAILY_VIDEO_LIMIT,
  FREE_MAX_DURATION_SEC,
  VOICE_OPTIONS,
  isVoiceAllowedInMode,
  CREDIT_PLANS,
  resolveMediaContentDisposition,
  isValidPlayableMediaResponse,
  shouldFailInsteadOfWeddingFallback,
  detectGeminiFailureMessage,
  getDefaultAntiCopyrightEffects,
  buildPaymentNoticeKey,
  shouldShowPaymentNotificationBanner,
  isValidMp4BufferHeader,
  sanitizeMp4DownloadName,
  isTransientPollHttpStatus,
  computeNextPollDelayMs,
  shouldSkipWorkersAiForPayloadSize,
  parseWorkersAiWhisperTimedResult,
  formatTimedSttSegments,
  normalizeRecapTimelineCues,
  groupCuesIntoTimedBlocks,
  isTransientModelOverloadError,
  resolveFallbackScriptModels,
  computeGeminiBackoffDelayMs,
  compactMultimodalPartsForOverloadRetry,
  extractReadableGeminiErrorDetail,
  normalizeDialogueSubtitleCues,
  parseTimedSttTranscriptToCues,
  findUncoveredTranscriptSegments,
  mergeMissingDialogueCues,
  applyBurmeseDialogueExclamationRules,
  splitMultiSpeakerDialogueCues,
  buildCinematicTranslateSystemPrompt,
  extractJobIdFromVideoUrl,
  MAX_SAFE_BLOB_DOWNLOAD_BYTES,
  shouldUseBlobDownloadForSize,
  buildDownloadVideoApiPath,
  resolveEffectiveVideoDurationSec,
  shouldSyncCompanionAudioTime,
  RANGE_DOWNLOAD_PROBE_BYTES,
  RANGE_DOWNLOAD_CHUNK_BYTES,
  parseContentRangeTotalBytes,
  computeRangeDownloadChunks,
  extractCustomDomainHostname,
  resolveCustomAuthDomainInfo,
  isGoogleRedirectUriAuthorizedHtml,
  isPrivateOrReservedIp,
  isAllowedPublicVideoStreamUrl,
  extractRedNoteNoteId,
  buildRedNoteCandidatePageUrls,
  selectWatermarkFreeTikTokStreams,
  extractDouyinAwemeId,
  normalizeDouyinPlayUrlToNoWatermark,
  extractDouyinVideoInfoFromHtml,
  clampTimedOverlayRange,
  isTimedOverlayActiveAtTime,
  parseTimecodeToSeconds,
  formatTimedOverlaySec,
  createDefaultTimedBlur,
  createDefaultTimedText,
  buildTimedBlurEnableExpr,
  sanitizeTimedTextForAss,
  COLOR_SHIFT_PRESETS,
  resolveAllowedColorShiftPresetId,
  resolveColorShiftPreset,
  isTimedOverlayFeatureAllowed,
  isCompleteTimecodeInput,
  formatBurmeseCaptionsOnlyPunctuation,
  applyBurmeseCaptionsOnlyPunctuation,
  sanitizeCaptionsOnlyDialogueCues,
  parseFfmpegSilenceDetectToSpeechIntervals,
  formatSpeechIntervalsGuide,
  FREE_BURMESE_FONT_ID,
  isSubtitleLanguageAllowedInMode,
  resolveAllowedSubtitleLanguage,
  isBurmeseFontAllowedInMode,
  resolveAllowedBurmeseFontStyle
} from './recapEngine.ts';

test('formatDuration formats seconds into M:SS and H:MM:SS', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(45), '0:45');
  assert.equal(formatDuration(125.9), '2:05');
  assert.equal(formatDuration(3661), '1:01:01');
  assert.equal(formatDuration(-10), '0:00');
});

test('msToSrtTime and exportCuesToSrt / parseSrtToCues round-trip accurately', () => {
  assert.equal(msToSrtTime(1500), '00:00:01,500');
  assert.equal(msToSrtTime(65432), '00:01:05,432');

  const cues = [
    { id: 'c1', start_ms: 250, end_ms: 3200, text: 'ဒီနေရာမှာ စာတန်းထိုး ပေါ်မယ်' },
    { id: 'c2', start_ms: 3400, end_ms: 6800, text: 'ဒုတိယ စာကြောင်း စမ်းသပ်ချက်' }
  ];
  const srt = exportCuesToSrt(cues);
  assert.ok(srt.includes('00:00:00,250 --> 00:00:03,200'));
  const parsed = parseSrtToCues(srt);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].start_ms, 250);
  assert.equal(parsed[0].end_ms, 3200);
  assert.equal(parsed[1].text, 'ဒုတိယ စာကြောင်း စမ်းသပ်ချက်');
});

test('findActiveCue returns matching cue for timestamp or null in gaps', () => {
  const cues = [
    { id: 'c1', start_ms: 500, end_ms: 2500, text: 'First' },
    { id: 'c2', start_ms: 3000, end_ms: 5000, text: 'Second' }
  ];
  assert.equal(findActiveCue(cues, 200), null);
  assert.equal(findActiveCue(cues, 1500)?.id, 'c1');
  assert.equal(findActiveCue(cues, 2750), null);
  assert.equal(findActiveCue(cues, 3000)?.id, 'c2');
});

test('calculateSubtitleScalePercent matches Stream Wave 44px=100% baseline', () => {
  assert.equal(calculateSubtitleScalePercent(44), 100);
  assert.equal(calculateSubtitleScalePercent(28), 64);
  assert.equal(calculateSubtitleScalePercent(68), 155);
});

test('clampBlurRegion prevents out-of-bounds watermark boxes', () => {
  const clamped = clampBlurRegion({
    id: 'b1',
    x: 85,
    y: 95,
    width: 30,
    height: 20,
    blurStrength: 80
  });
  assert.equal(clamped.width, 30);
  assert.equal(clamped.x, 70); // 100 - 30
  assert.equal(clamped.y, 80); // 100 - 20
  assert.equal(clamped.blurStrength, 60);
});

test('calculateCreditCost computes flat 1 credit per 1:10 (70 seconds) across all AI voices, and 0 for free recap', () => {
  assert.equal(FREE_DAILY_VIDEO_LIMIT, 5);
  assert.equal(FREE_MAX_DURATION_SEC, 160);
  assert.equal(CREDIT_SECONDS_PER_UNIT, 70);

  assert.equal(calculateCreditCost(45, true), 0);
  assert.equal(calculateCreditCost(1, false), 1);
  assert.equal(calculateCreditCost(45, false), 1);
  assert.equal(calculateCreditCost(70, false), 1);
  assert.equal(calculateCreditCost(71, false), 2);
  assert.equal(calculateCreditCost(140, false), 2);
  assert.equal(calculateCreditCost(141, false), 3);

  // Flat 1 credit per 1:10 (70s) across all AI voices
  assert.equal(calculateCreditCost(120, false, { voiceGender: 'kore' }), 2);
  assert.equal(calculateCreditCost(120, false, { voiceGender: 'male' }), 2);
  assert.equal(calculateCreditCost(300, false, { voiceGender: 'aoede' }), 5);

  // Free Mode allows only Thiha (male) and Nilar (female); Credit Mode unlocks all 10 voices
  assert.equal(VOICE_OPTIONS.length, 10);
  assert.equal(isVoiceAllowedInMode('male', true), true);
  assert.equal(isVoiceAllowedInMode('female', true), true);
  assert.equal(isVoiceAllowedInMode('kore', true), false);
  assert.equal(isVoiceAllowedInMode('kore', false), true);
  assert.equal(isVoiceAllowedInMode('zephyr', false), true);

  // Verify the 3 Credit Plans (Starter Pack 100, Creator Pro 260 (+30 bonus), Creator Pro Max 560 (+60 bonus))
  assert.equal(CREDIT_PLANS.length, 3);
  assert.equal(CREDIT_PLANS[0].id, 'starter-pack');
  assert.equal(CREDIT_PLANS[0].credits, 100);
  assert.equal(CREDIT_PLANS[0].bonusCredits, 0);
  assert.equal(CREDIT_PLANS[1].id, 'creator-pro');
  assert.equal(CREDIT_PLANS[1].credits, 260);
  assert.equal(CREDIT_PLANS[1].bonusCredits, 30);
  assert.equal(CREDIT_PLANS[2].id, 'creator-pro-max');
  assert.equal(CREDIT_PLANS[2].credits, 560);
  assert.equal(CREDIT_PLANS[2].bonusCredits, 60);
  for (const plan of CREDIT_PLANS) {
    assert.ok(
      plan.featuresMy.some((f) => f.includes('Channel Watermark & Logo')),
      `Expected Channel Watermark & Logo feature on ${plan.id}`
    );
  }
});

test('splitCuesIntoShortPhrases and buildSyncedRecapCues generate crisp 1-line non-overlapping cues', () => {
  const longCue = [
    {
      id: 'long-1',
      start_ms: 0,
      end_ms: 9000,
      text: 'နောက်ဆုံးမှာတော့ ယောက္ခမဖြစ်သူက အမှန်အတိုင်း ဝန်ခံလာပြီး အဲဒီငွေထဲက နှစ်သိန်းကို သားငယ်လေး အိမ်ဝယ်ဖို့ စရန်ငွေအဖြစ် သုံးလိုက်တယ်လို့ ဆိုလာပါတယ်။'
    }
  ];
  const split = splitCuesIntoShortPhrases(longCue, 54);
  assert.ok(split.length >= 3);
  for (const c of split) {
    assert.ok(c.text.length <= 58, `Expected short 1-line phrase, got: ${c.text}`);
    assert.ok(c.end_ms > c.start_ms);
  }

  const result = buildSyncedRecapCues(20, 'narrator', 'my', 'Custom Action Clip');
  assert.ok(result.cues.length >= 8);
  for (let i = 0; i < result.cues.length; i++) {
    assert.ok(result.cues[i].end_ms > result.cues[i].start_ms);
    if (i > 0) {
      assert.ok(result.cues[i].start_ms >= result.cues[i - 1].end_ms);
    }
  }
  assert.ok(SCRIPT_STYLE_PROMPTS.narrator.systemPrompt.includes('SHORT, PUNCHY 1-LINE PHRASES'));
  assert.ok(SCRIPT_STYLE_PROMPTS.narrator.systemPrompt.includes('STRICT THIRD-PERSON RECAP NARRATION ONLY'));
  assert.ok(SCRIPT_STYLE_PROMPTS.narrator.systemPrompt.includes('ZERO REPETITION'));
  assert.ok(SCRIPT_STYLE_PROMPTS.narrator.systemPrompt.includes('TikTok/Reels'));
  assert.ok(SCRIPT_STYLE_PROMPTS.narrator.systemPrompt.includes('NO REPETITIVE "ပါတယ်/တယ်"'));
  assert.ok(SCRIPT_STYLE_PROMPTS.narrator.systemPrompt.includes('...ဖြစ်သွားရော'));
  assert.ok(STREAMWAVE_VOICE_STYLE_PROMPTS.narrator.includes('STRICTLY AVOID repetitive "...ပါတယ်"'));

  // Verify new Natural Flow ('natural') script style prompt and cues
  assert.equal(SCRIPT_STYLE_PROMPTS.natural.labelEn, 'Natural Flow');
  assert.ok(SCRIPT_STYLE_PROMPTS.natural.systemPrompt.includes('Natural Flow style'));
  assert.ok(SCRIPT_STYLE_PROMPTS.natural.systemPrompt.includes('AVOID repeating "...တယ်", "...ပါတယ်", or "...ဖြစ်ပါတယ်"'));
  assert.ok(SCRIPT_STYLE_PROMPTS.natural.systemPrompt.includes('NATURAL SPOKEN BURMESE FLOW & VARIED ENDINGS'));
  assert.ok(SCRIPT_STYLE_PROMPTS.natural.systemPrompt.includes('...လိုက်တော့တာပေါ့'));
  const naturalResult = buildSyncedRecapCues(20, 'natural', 'my', 'Natural Flow Clip');
  assert.ok(naturalResult.cues.length >= 6);

  // Verify 70-second SaveTik wedding drama cues start with exact StreamWave 1-line phrase
  const weddingResult = buildSyncedRecapCues(
    70,
    'narrator',
    'my',
    'SaveTik.co_7673413291896605967-hd.mp4'
  );
  assert.ok(weddingResult.cues.length >= 15);
  assert.equal(weddingResult.cues[0].text, 'သိန်းသုံးဆယ်ကို ခင်ဗျား ဘယ်မှာ သုံးလိုက်တာလဲ');
  assert.equal(weddingResult.cues[weddingResult.cues.length - 1].end_ms, 70000);

  // Verify voice preview sample text ONLY states who the voice is (no TTAK MOVIE RECAP or movie dialogue)
  const maleSample = getVoicePreviewSampleText('male', 'my');
  const femaleSample = getVoicePreviewSampleText('female', 'my');
  const koreSample = getVoicePreviewSampleText('kore', 'my');
  assert.equal(maleSample, 'မင်္ဂလာပါ၊ ကျွန်တော်ကတော့ သီဟ အသံ ဖြစ်ပါတယ်။');
  assert.equal(femaleSample, 'မင်္ဂလာပါ၊ ကျွန်မကတော့ နီလာ အသံ ဖြစ်ပါတယ်။');
  assert.equal(koreSample, 'မင်္ဂလာပါ၊ ကျွန်တော်ကတော့ Kore အသံ ဖြစ်ပါတယ်။');
  assert.ok(!maleSample.includes('TTAK'));
  assert.ok(!koreSample.includes('TTAK'));

  // Verify 3-Method Audio & Video Sync (Timestamp-anchored + 80-120ms Breath Pause + Dynamic Tempo Fit >= 1.0x + Max Gap Clamp)
  const testCues = [
    { id: 'c1', start_ms: 100, end_ms: 1800, text: 'ပထမ စာကြောင်း' },
    { id: 'c2', start_ms: 2000, end_ms: 3800, text: 'ဒုတိယ စာကြောင်း' }
  ];
  const syncedSchedule = alignCuesWithAudioSync(testCues, [2100, 1500], 100, true);
  assert.equal(syncedSchedule.length, 2);
  // First cue had 2100ms raw spoken duration in an ~1800ms slot -> Dynamic Tempo Fit speeds it up smoothly
  assert.ok(syncedSchedule[0].tempoFactor > 1.0 && syncedSchedule[0].tempoFactor <= 1.24);
  // Second cue starts at least 100ms (breathPauseMs) after first cue ends
  assert.ok(syncedSchedule[1].cue.start_ms >= syncedSchedule[0].cue.end_ms + 100);

  // Verify mid-video gap clamping & that sparse cues NEVER slow down below 1.0x (which makes Burmese TTS sound sluggish/heavy)
  const sparseCues = [
    { id: 's1', start_ms: 100, end_ms: 3000, text: 'အဖွင့် စာကြောင်း' },
    { id: 's2', start_ms: 7500, end_ms: 11500, text: 'အလယ် စာကြောင်း' },
    { id: 's3', start_ms: 15000, end_ms: 18000, text: 'အပိတ် စာကြောင်း' }
  ];
  const continuousSchedule = alignCuesWithAudioSync(sparseCues, [2200, 2400, 2100], 100, true, 18000, 220);
  assert.equal(continuousSchedule.length, 3);
  assert.equal(continuousSchedule[0].tempoFactor, 1.0);
  assert.equal(continuousSchedule[1].tempoFactor, 1.0);
  assert.ok(continuousSchedule[1].cue.start_ms - continuousSchedule[0].cue.end_ms <= 220);
  assert.ok(continuousSchedule[2].cue.start_ms - continuousSchedule[1].cue.end_ms <= 220);

  // Verify 1-cue preview does not slow down artificially even when totalDurationMs is larger
  const previewSchedule = alignCuesWithAudioSync(
    [{ id: 'p1', start_ms: 60, end_ms: 5900, text: 'မင်္ဂလာပါ' }],
    [1900],
    100,
    true,
    6000,
    360
  );
  assert.equal(previewSchedule[0].tempoFactor, 1.0);
});

import {
  computeAspectCanvasLayout,
  hexToAssBgr,
  resolveBrandGridCoords,
  computeAssSubtitleFontSize,
  buildAssRoundedBoxPath,
  BURMESE_FONT_STYLES,
  resolveBurmeseFontMeta,
  OWNER_KEY_LIMIT_COOLDOWN_MS,
  formatCooldownRemaining,
  maskApiKeyString,
  parseBulkApiKeysInput,
  isApiKeyQuotaOrLimitError,
  selectNextHealthyPoolKey,
  recordPoolKeyOutcome,
  type AdminApiKeyRecord
} from './recapEngine.ts';

test('computeAspectCanvasLayout calculates centered foreground and blurred backdrop canvas dimensions', () => {
  // 16:9 landscape converted to 9:16 portrait -> 720x1280 canvas with centered 720x406 video + top/bottom blur fill
  const landscapeToPortrait = computeAspectCanvasLayout(1920, 1080, '9:16');
  assert.equal(landscapeToPortrait.outW, 720);
  assert.equal(landscapeToPortrait.outH, 1280);
  assert.equal(landscapeToPortrait.fgW, 720);
  assert.equal(landscapeToPortrait.fgH, 406);
  assert.equal(landscapeToPortrait.fgX, 0);
  assert.equal(landscapeToPortrait.fgY, 437);
  assert.equal(landscapeToPortrait.needsAspectBlurPad, true);

  // Pad size 1.25x & padY = -100 moves foreground upward cleanly inside 9:16 frame
  const zoomedAndMoved = computeAspectCanvasLayout(1920, 1080, '9:16', {
    fitMode: 'pad',
    padSize: 1.25,
    padX: 100,
    padY: -100,
    frameZoom: 120
  });
  assert.equal(zoomedAndMoved.fgW, 900);
  assert.equal(zoomedAndMoved.fgH, 508);
  assert.equal(zoomedAndMoved.fgX, 0);
  assert.equal(zoomedAndMoved.fgY, 0);
  assert.equal(zoomedAndMoved.needsAspectBlurPad, true);
  assert.equal(zoomedAndMoved.needsCropFill, true);
  assert.equal(zoomedAndMoved.srcCropW, 1600);
  assert.equal(zoomedAndMoved.srcCropH, 900);

  // 4:5 Instagram/FB portrait dimensions (720x900)
  const fourByFive = computeAspectCanvasLayout(1280, 720, '4:5');
  assert.equal(fourByFive.outW, 720);
  assert.equal(fourByFive.outH, 900);
  assert.equal(fourByFive.needsAspectBlurPad, true);

  // Crop fill mode with top/center/bottom focus
  const cropBottom = computeAspectCanvasLayout(720, 1280, '16:9', {
    fitMode: 'crop',
    focus: 'bottom'
  });
  assert.equal(cropBottom.outW, 1280);
  assert.equal(cropBottom.outH, 720);
  assert.equal(cropBottom.needsAspectBlurPad, false);
  assert.equal(cropBottom.needsCropFill, true);
  assert.equal(cropBottom.srcCropW, 720);
  assert.equal(cropBottom.srcCropH, 406);
  assert.equal(cropBottom.srcCropY, 1280 - 406);

  // 9:16 portrait converted to 16:9 landscape -> 1280x720 canvas with centered 406x720 video + left/right blur fill
  const portraitToLandscape = computeAspectCanvasLayout(720, 1280, '16:9');
  assert.equal(portraitToLandscape.outW, 1280);
  assert.equal(portraitToLandscape.outH, 720);
  assert.equal(portraitToLandscape.fgW, 406);
  assert.equal(portraitToLandscape.fgH, 720);
  assert.equal(portraitToLandscape.needsAspectBlurPad, true);

  // 16:9 landscape already matching 16:9 -> no blur padding needed
  const sameAspect = computeAspectCanvasLayout(1280, 720, '16:9');
  assert.equal(sameAspect.needsAspectBlurPad, false);
  assert.equal(sameAspect.outW, 1280);
  assert.equal(sameAspect.outH, 720);

  // Original aspect ratio preserves proportions without blur padding
  const orig = computeAspectCanvasLayout(1280, 720, 'original');
  assert.equal(orig.needsAspectBlurPad, false);
  assert.equal(orig.outW, 1280);
  assert.equal(orig.outH, 720);
});

test('hexToAssBgr and resolveBrandGridCoords produce valid ASS colors and 9-grid coordinates', () => {
  assert.equal(hexToAssBgr('#FFE600'), '&H0000E6FF');
  assert.equal(hexToAssBgr('#7DE3FF', '40'), '&H40FFE37D');
  assert.equal(hexToAssBgr('invalid'), null);

  const tr = resolveBrandGridCoords('tr', 720, 1280, 60, 60, 20);
  assert.equal(tr.x, 640);
  assert.equal(tr.y, 20);
  assert.equal(tr.assAlign, 9);

  const bl = resolveBrandGridCoords('bl', 720, 1280, 0, 0, 24);
  assert.equal(bl.x, 24);
  assert.equal(bl.y, 1256);
  assert.equal(bl.assAlign, 1);
});

test('computeAssSubtitleFontSize and buildAssRoundedBoxPath produce readable sizes and smooth rounded box paths', () => {
  const portraitSize = computeAssSubtitleFontSize(40, 720, 1280);
  assert.equal(portraitSize, 47);

  const fhdPortraitSize = computeAssSubtitleFontSize(44, 1080, 1920);
  assert.equal(fhdPortraitSize, 77);

  const landscapeSize = computeAssSubtitleFontSize(40, 1280, 720);
  assert.ok(landscapeSize >= 48 && landscapeSize <= 58);

  const pathStr = buildAssRoundedBoxPath(320, 64, 12);
  assert.ok(pathStr.startsWith('m 12 0 l 308 0 b '));
  assert.ok(pathStr.includes(' 320 12 l 320 52 b '));
  assert.ok(pathStr.endsWith(' 0 12 b 0 5 5 0 12 0'));
});

test('BURMESE_FONT_STYLES and resolveBurmeseFontMeta map all Myanmar font styles to Unicode-accurate fonts', () => {
  assert.equal(BURMESE_FONT_STYLES.length, 19);
  const validUnicodeFamilies = new Set([
    'Padauk',
    'Pyidaungsu',
    'Noto Serif Myanmar',
    'Noto Serif Myanmar Blk',
    'Noto Sans Myanmar',
    'TharLon',
    'Myanmar Tagu',
    'Myanmar Waso',
    'Myanmar Khyay',
    'Myanmar Sabae',
    'Myanmar Gantgaw',
    'Myanmar Yinmar',
    'Myanmar Angoun',
    'Myanmar Square',
    'Masterpiece Uni Round',
    'Cherry Unicode',
    'Myanmar Sagar'
  ]);
  for (const style of BURMESE_FONT_STYLES) {
    assert.ok(
      validUnicodeFamilies.has(style.assFontName),
      `Expected Unicode font family for ${style.id}, got ${style.assFontName}`
    );
    assert.ok(style.cssFontFamily.length > 5);
    assert.ok(style.pangoFontDesc.length > 5);
    assert.ok(
      style.pangoAssScale >= 0.4 && style.pangoAssScale <= 0.75,
      `Expected calibrated pangoAssScale for ${style.id}, got ${style.pangoAssScale}`
    );
  }

  assert.equal(resolveBurmeseFontMeta('Pyidaungsu').assFontName, 'Pyidaungsu');
  assert.equal(resolveBurmeseFontMeta('Padauk_Bold').assFontName, 'Padauk');
  assert.equal(resolveBurmeseFontMeta('Noto_Serif_Bold').assFontName, 'Noto Serif Myanmar');
  assert.equal(resolveBurmeseFontMeta('TharLon_Classic').assFontName, 'TharLon');
  assert.equal(resolveBurmeseFontMeta('unknown_style').id, 'Yati_Round');
});

test('Admin Multi-API Key Pool rests limited keys for 24 hours, switches immediately, and recovers after 24h', () => {
  assert.equal(OWNER_KEY_LIMIT_COOLDOWN_MS, 86_400_000);

  const bulkInput = `
    AIzaSyKeyOne111111111111111
    AIzaSyKeyTwo222222222222222
    Key3: AIzaSyKeyThree3333333333333
    AIzaSyKeyFour44444444444444, AIzaSyKeyFive55555555555555
    AIzaSyKeySix666666666666666
    AIzaSyKeyOne111111111111111
  `;
  const parsed = parseBulkApiKeysInput(bulkInput, 'gemini');
  assert.equal(parsed.length, 6);
  assert.equal(maskApiKeyString(parsed[0]), 'AIzaSy...1111');

  // Space-separated input from Telegram /addgemini command works identically
  const telegramSpaceParsed = parseBulkApiKeysInput(
    'gsk_AlphaKey111111111111 gsk_BetaKey2222222222222',
    'groq'
  );
  assert.equal(telegramSpaceParsed.length, 2);

  const now = 1_700_000_000_000;
  let pool: AdminApiKeyRecord[] = parsed.map((k, idx) => ({
    id: `gem-${idx + 1}`,
    provider: 'gemini',
    label: `Gemini Key #${idx + 1}`,
    apiKey: k,
    maskedKey: maskApiKeyString(k),
    enabled: true,
    status: 'healthy',
    cooldownUntil: 0,
    usageCount: 0,
    dailyUsageCount: 0,
    failoverCount: 0,
    addedAt: now
  }));

  // 1) Round-robin rotates across healthy keys and increments usage counts
  let cursor = 0;
  const pick1 = selectNextHealthyPoolKey(pool, 'gemini', cursor, now);
  assert.equal(pick1.selected?.id, 'gem-1');
  cursor = pick1.nextCursor;

  pool[0] = recordPoolKeyOutcome(pool[0], { ok: true, nowMs: now });
  assert.equal(pool[0].usageCount, 1);
  assert.equal(pool[0].dailyUsageCount, 1);

  const pick2 = selectNextHealthyPoolKey(pool, 'gemini', cursor, now);
  assert.equal(pick2.selected?.id, 'gem-2');
  cursor = pick2.nextCursor;

  // 2) Simulate Key #3 hitting a 429 RESOURCE_EXHAUSTED quota error -> rests for 24h & skips #3 to #4
  const quotaErr = new Error(
    'ApiError: {"error":{"code":429,"message":"You exceeded your current quota","status":"RESOURCE_EXHAUSTED"}}'
  );
  const errCheck = isApiKeyQuotaOrLimitError(quotaErr);
  assert.equal(errCheck.shouldRotate, true);
  assert.equal(errCheck.isQuotaLimit, true);
  assert.equal(errCheck.cooldownMs, OWNER_KEY_LIMIT_COOLDOWN_MS);

  pool[2] = recordPoolKeyOutcome(pool[2], { ok: false, error: quotaErr, nowMs: now });
  assert.equal(pool[2].status, 'cooldown');
  assert.equal(pool[2].failoverCount, 1);
  assert.equal(pool[2].cooldownUntil, now + 24 * 60 * 60 * 1000);
  assert.equal(formatCooldownRemaining(pool[2].cooldownUntil, now + 60_000), '23h 59m');

  // At +12 hours, Key #3 is STILL resting and skipped in favor of Key #4
  const after12Hours = now + 12 * 60 * 60 * 1000;
  const pickSkipAt12h = selectNextHealthyPoolKey(pool, 'gemini', 2, after12Hours);
  assert.equal(pickSkipAt12h.selected?.id, 'gem-4');

  // 3) After full 24 hours elapse, Key #3 automatically recovers to healthy
  const after24Hours = now + 24 * 60 * 60 * 1000 + 1000;
  const pickRecovered = selectNextHealthyPoolKey(pool, 'gemini', 2, after24Hours);
  assert.equal(pickRecovered.selected?.id, 'gem-3');
  assert.equal(pickRecovered.selected?.status, 'healthy');
  assert.equal(formatCooldownRemaining(pool[2].cooldownUntil, after24Hours), 'Ready');
});

import {
  WORKERS_AI_WHISPER_MODEL,
  buildWorkersAiRunUrl,
  parseWorkersAiWhisperResult,
  resolveSttStrategyForMode,
  resolveStudioWorkflowStep
} from './recapEngine.ts';

test('Cloudflare Workers AI Whisper-Large-V3-Turbo helpers route Credit Mode only and parse transcripts safely', () => {
  assert.equal(WORKERS_AI_WHISPER_MODEL, '@cf/openai/whisper-large-v3-turbo');
  assert.equal(
    buildWorkersAiRunUrl('c5a4beb864d098eae3263c47ec746500'),
    'https://api.cloudflare.com/client/v4/accounts/c5a4beb864d098eae3263c47ec746500/ai/run/@cf/openai/whisper-large-v3-turbo'
  );

  // Direct text parsing + fallback segment concatenation
  assert.equal(
    parseWorkersAiWhisperResult({ success: true, result: { text: '  Hello world  ' } }),
    'Hello world'
  );
  assert.equal(
    parseWorkersAiWhisperResult({
      result: { segments: [{ text: 'First line' }, { text: 'second line' }] }
    }),
    'First line second line'
  );
  assert.equal(parseWorkersAiWhisperResult(null), '');

  // Free Mode must NEVER invoke Cloudflare Workers AI or Admin's Groq Key Pool
  assert.deepEqual(resolveSttStrategyForMode(true, true, true), ['user_groq']);
  assert.deepEqual(resolveSttStrategyForMode(true, false, true), []);

  // Credit Mode uses Cloudflare Workers AI first when configured, with Groq pool failover
  assert.deepEqual(resolveSttStrategyForMode(false, false, true), ['workers_ai', 'groq_pool']);
  assert.deepEqual(resolveSttStrategyForMode(false, false, false), ['groq_pool']);
});

test('resolveStudioWorkflowStep maps studio states to beginner 3-step indicator', () => {
  assert.deepEqual(resolveStudioWorkflowStep(false, false, false), {
    activeStep: 1,
    completedSteps: []
  });
  assert.deepEqual(resolveStudioWorkflowStep(true, false, false), {
    activeStep: 2,
    completedSteps: [1]
  });
  assert.deepEqual(resolveStudioWorkflowStep(true, true, true), {
    activeStep: 2,
    completedSteps: [1]
  });
  assert.deepEqual(resolveStudioWorkflowStep(true, false, true), {
    activeStep: 3,
    completedSteps: [1, 2, 3]
  });
});

test('resolveMediaContentDisposition uses inline for playback and attachment only for explicit downloads', () => {
  const inlineRes = resolveMediaContentDisposition('job_123_preview.mp4');
  assert.equal(inlineRes.mode, 'inline');
  assert.equal(inlineRes.headerValue, 'inline; filename="job_123_preview.mp4"');

  const dlFlag = resolveMediaContentDisposition('job_123_preview.mp4', undefined, '1');
  assert.equal(dlFlag.mode, 'attachment');
  assert.equal(dlFlag.headerValue, 'attachment; filename="job_123_preview.mp4"');

  const dlNamed = resolveMediaContentDisposition('job_123_export.mp4', 'my_movie (1).mp4');
  assert.equal(dlNamed.mode, 'attachment');
  assert.equal(dlNamed.safeFilename, 'my_movie _1_.mp4');
  assert.equal(dlNamed.headerValue, 'attachment; filename="my_movie _1_.mp4"');

  const mp3Inline = resolveMediaContentDisposition('job_123_voiceover.mp3', undefined, undefined, '.mp3');
  assert.equal(mp3Inline.mode, 'inline');
  assert.equal(mp3Inline.headerValue, 'inline; filename="job_123_voiceover.mp3"');
});

test('isValidPlayableMediaResponse blocks HTML error/524 pages from downloading as .mp4.html', () => {
  assert.equal(isValidPlayableMediaResponse(200, true, 'video/mp4', 'video/'), true);
  assert.equal(isValidPlayableMediaResponse(206, true, 'video/mp4', 'video/'), true);
  assert.equal(isValidPlayableMediaResponse(200, true, 'text/html; charset=utf-8', 'video/'), false);
  assert.equal(isValidPlayableMediaResponse(524, false, 'text/html', 'video/'), false);
  assert.equal(isValidPlayableMediaResponse(200, true, 'application/json', 'video/'), false);
  assert.equal(isValidPlayableMediaResponse(404, false, 'application/json', 'video/'), false);
});

test('shouldFailInsteadOfWeddingFallback prevents fake wedding drama captions on failed 3-min videos', () => {
  // Real 3-minute uploaded movie where Gemini failed MUST fail clearly instead of showing "သိန်း 30" fallback
  assert.equal(
    shouldFailInsteadOfWeddingFallback({
      isWeddingDemoClip: false,
      usedLiveGemini: false,
      hasUploadedSource: true
    }),
    true
  );
  // Real movie where Gemini succeeded -> OK
  assert.equal(
    shouldFailInsteadOfWeddingFallback({
      isWeddingDemoClip: false,
      usedLiveGemini: true,
      hasUploadedSource: true
    }),
    false
  );
  // Built-in 70.7s SaveTik wedding demo clip -> allowed
  assert.equal(
    shouldFailInsteadOfWeddingFallback({
      isWeddingDemoClip: true,
      usedLiveGemini: false,
      hasUploadedSource: true
    }),
    false
  );

  const noKeyErr = detectGeminiFailureMessage('', false, false);
  assert.equal(noKeyErr.code, 'no_key');
  assert.ok(noKeyErr.messageMy.includes('/addgemini'));

  const quotaErr = detectGeminiFailureMessage('429 RESOURCE_EXHAUSTED quota exceeded', true, true);
  assert.equal(quotaErr.code, 'quota');
});

test('subtitle scale supports smaller sizes down to 12px (27%) for preview and ASS export', () => {
  assert.equal(calculateSubtitleScalePercent(12), 27);
  assert.equal(calculateSubtitleScalePercent(20), 45);
  assert.ok(computeAssSubtitleFontSize(12, 540, 960) < computeAssSubtitleFontSize(28, 540, 960));
});

test('getDefaultAntiCopyrightEffects enables ONLY FHD 1080p in Credit Mode and keeps all optional edits OFF', () => {
  assert.deepEqual(getDefaultAntiCopyrightEffects(false), {
    outputHD: true,
    zoom: false,
    mirror: false,
    colorShift: false,
    crop: false,
    grain: false,
    pitchShift: false
  });
  assert.deepEqual(getDefaultAntiCopyrightEffects(true), {
    outputHD: false,
    zoom: false,
    mirror: false,
    colorShift: false,
    crop: false,
    grain: false,
    pitchShift: false
  });
});

test('shouldShowPaymentNotificationBanner shows approval once and stays hidden across reloads', () => {
  const approved = { id: 'pay-100', status: 'approved' as const, approvedAt: 1700000000000 };
  const key = buildPaymentNoticeKey(approved);

  // Pending always shows unless dismissed in session
  assert.equal(
    shouldShowPaymentNotificationBanner({ id: 'pay-99', status: 'pending' }, {}, {}, {}),
    true
  );
  // First time seeing approved notification -> shows
  assert.equal(shouldShowPaymentNotificationBanner(approved, {}, {}, {}), true);
  // During the SAME page visit (sessionShownKeys populated) -> stays visible until dismissed
  assert.equal(shouldShowPaymentNotificationBanner(approved, {}, { [key]: true }, { [key]: true }), true);
  // After page reload (sessionShownKeys empty, persistedSeenKeys populated) -> NEVER reappears
  assert.equal(shouldShowPaymentNotificationBanner(approved, {}, {}, { [key]: true }), false);
});

test('isValidMp4BufferHeader accepts real MP4 ftyp bytes and rejects HTML/JSON error pages', () => {
  const realMp4Head = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  assert.equal(isValidMp4BufferHeader(realMp4Head, 4096), true);

  const htmlBytes = new TextEncoder().encode('<!DOCTYPE html><html><body>524</body></html>');
  assert.equal(isValidMp4BufferHeader(htmlBytes, 4096), false);

  const jsonBytes = new TextEncoder().encode('{"ok":false,"error":"Not found"}');
  assert.equal(isValidMp4BufferHeader(jsonBytes, 4096), false);

  assert.equal(sanitizeMp4DownloadName('မြန်မာကား.mp4', 'recap_free'), 'recap_free.mp4');
  assert.equal(sanitizeMp4DownloadName('action_movie (2026).mp4'), 'action_movie_2026.mp4');
});

test('polling resilience helpers retry transient Cloudflare/proxy errors with bounded backoff', () => {
  assert.equal(isTransientPollHttpStatus(502), true);
  assert.equal(isTransientPollHttpStatus(524), true);
  assert.equal(isTransientPollHttpStatus(429), true);
  assert.equal(isTransientPollHttpStatus(404), false);
  assert.equal(isTransientPollHttpStatus(200), false);

  assert.equal(computeNextPollDelayMs(0), 1200);
  assert.equal(computeNextPollDelayMs(1), 2000);
  assert.equal(computeNextPollDelayMs(10), 4000);

  assert.equal(shouldSkipWorkersAiForPayloadSize(100), true);
  assert.equal(shouldSkipWorkersAiForPayloadSize(1_100_000), false);
  assert.equal(shouldSkipWorkersAiForPayloadSize(4_000_000), true);
});

test('3+ minute timeline sync helpers format timed STT, normalize cues, group 15s blocks, and avoid drift', () => {
  const timed = parseWorkersAiWhisperTimedResult({
    result: {
      text: 'Hello Wait stop',
      segments: [
        { start: 0, end: 4, text: 'First scene line' },
        { start: 92, end: 97, text: 'Midpoint plot twist' },
        { start: 175, end: 181, text: 'Ending confrontation' }
      ]
    }
  });
  assert.ok(timed.includes('[00:00 - 00:04] First scene line'));
  assert.ok(timed.includes('[01:32 - 01:37] Midpoint plot twist'));
  assert.ok(timed.includes('[02:55 - 03:01] Ending confrontation'));

  // Downsampling caps >120 segments cleanly while keeping timeline endpoints
  const manySegs = Array.from({ length: 200 }, (_, i) => ({
    start: i * 2,
    end: i * 2 + 1.5,
    text: `Seg ${i}`
  }));
  const sampled = formatTimedSttSegments(manySegs, '', 50);
  assert.equal(sampled.split('\n').length, 50);
  assert.ok(sampled.includes('Seg 0'));
  assert.ok(sampled.includes('Seg 199'));

  // Compressed or bunched 3-min cues get rescaled proportionally across 181s
  const compressed = Array.from({ length: 12 }, (_, i) => ({
    id: `c-${i + 1}`,
    start_ms: i * 5000,
    end_ms: i * 5000 + 4000,
    text: `ဇာတ်ဝင်ခန်း အမှတ် ${i + 1} အဖြစ်အပျက်`
  }));
  const normalized = normalizeRecapTimelineCues(compressed, 181);
  assert.equal(normalized.length, 12);
  assert.ok(normalized[normalized.length - 1].end_ms > 150_000);
  assert.ok(normalized[normalized.length - 1].end_ms <= 181_000);
  for (let i = 1; i < normalized.length; i++) {
    assert.ok(normalized[i].start_ms >= normalized[i - 1].end_ms + 80);
  }

  // Group 181s cues into ~15s scene blocks
  const evenCues = Array.from({ length: 45 }, (_, i) => ({
    id: `e-${i + 1}`,
    start_ms: i * 4000,
    end_ms: i * 4000 + 3600,
    text: `စာတန်း ${i + 1}`
  }));
  const blocks = groupCuesIntoTimedBlocks(evenCues, 15000);
  assert.ok(blocks.length >= 10 && blocks.length <= 15);
  assert.ok(blocks[blocks.length - 1].endMs <= 180_000);

  // alignCuesWithAudioSync on 181s prevents 4s-8s dead-air gap explosion and fits within duration
  const longSchedule = alignCuesWithAudioSync(
    evenCues,
    evenCues.map(() => 3400),
    100,
    true,
    181_000,
    360
  );
  assert.equal(longSchedule.length, evenCues.length);
  assert.ok(longSchedule[longSchedule.length - 1].cue.end_ms <= 181_000);
  for (let i = 1; i < longSchedule.length; i++) {
    const gap = longSchedule[i].cue.start_ms - longSchedule[i - 1].cue.end_ms;
    assert.ok(gap >= 100 && gap <= 700, `Unexpected gap ${gap}ms at cue ${i}`);
  }
});

test('503 high-demand model spikes trigger fallback models instead of 24h key cooldown or raw JSON errors', () => {
  const spikeErr = new Error(
    '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}'
  );

  // 1) 503 spike is classified as transient model overload, NOT a 24h API key quota limit
  assert.equal(isTransientModelOverloadError(spikeErr), true);
  const keyCheck = isApiKeyQuotaOrLimitError(spikeErr);
  assert.equal(keyCheck.shouldRotate, false);
  assert.equal(keyCheck.isQuotaLimit, false);
  assert.equal(keyCheck.cooldownMs, 0);

  // 2) 429 quota error is NOT transient overload; still triggers 24h key cooldown
  const quotaErr = new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}');
  assert.equal(isTransientModelOverloadError(quotaErr), false);
  assert.equal(isApiKeyQuotaOrLimitError(quotaErr).shouldRotate, true);

  // 3) Model fallback resolution uses active Gemini 4 Hydrogen / 3.1 Flash Lite / 3.8 Flash and upgrades deprecated models
  assert.deepEqual(resolveFallbackScriptModels('gemini-4-hydrogen'), [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash'
  ]);
  assert.deepEqual(resolveFallbackScriptModels('gemini-3.8-flash'), [
    'gemini-3.8-flash',
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite'
  ]);
  assert.deepEqual(resolveFallbackScriptModels('gemini-3.1-pro-preview'), [
    'gemini-4-argon',
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite'
  ]);
  assert.deepEqual(resolveFallbackScriptModels('gemini-2.5-flash'), [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash'
  ]);
  assert.deepEqual(resolveFallbackScriptModels('gemini-3-flash-preview'), [
    'gemini-4-hydrogen',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash'
  ]);

  // 4) Error message formatter returns clean Burmese/English guidance with NO truncated JSON braces
  const uiErr = detectGeminiFailureMessage(spikeErr.message, true, false);
  assert.equal(uiErr.code, 'overloaded');
  assert.ok(uiErr.messageMy.includes('503'));
  assert.ok(!uiErr.messageMy.includes('{"error"'));
  assert.ok(!uiErr.messageEn.includes('{"error"'));

  // 5) extractReadableGeminiErrorDetail cleans arbitrary SDK JSON payloads
  const cleaned = extractReadableGeminiErrorDetail(
    'ApiError: {"error":{"code":500,"message":"Internal upstream failure occurred."}}'
  );
  assert.equal(cleaned, '500: Internal upstream failure occurred.');

  // 6) Exponential backoff + compact multimodal parts helper for 503 overload retries
  assert.equal(computeGeminiBackoffDelayMs(0, () => 0), 1200);
  assert.equal(computeGeminiBackoffDelayMs(1, () => 0.5), 2950);
  assert.equal(computeGeminiBackoffDelayMs(2, () => 1), 5200);

  const bigParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
  for (let i = 0; i < 16; i++) {
    bigParts.push({ text: `[Visual Scene Frame at 00:${String(i).padStart(2, '0')} (${i * 1000}ms)]` });
    bigParts.push({ inlineData: { mimeType: 'image/jpeg', data: `img_${i}` } });
  }
  bigParts.push({ inlineData: { mimeType: 'audio/mp3', data: 'a'.repeat(1_000_000) } });
  bigParts.push({ text: 'FINAL RECAP PROMPT' });

  const compacted = compactMultimodalPartsForOverloadRetry(bigParts, {
    maxFrames: 4,
    dropLargeAudioWhenTranscriptPresent: true,
    hasTranscript: true
  });
  const keptImages = compacted.filter((p) => p.inlineData?.mimeType === 'image/jpeg');
  assert.equal(keptImages.length, 4);
  assert.equal(keptImages[0].inlineData?.data, 'img_0');
  assert.equal(keptImages[3].inlineData?.data, 'img_15');
  assert.equal(
    compacted.some((p) => p.inlineData?.mimeType === 'audio/mp3'),
    false
  );
  assert.equal(compacted[compacted.length - 1].text, 'FINAL RECAP PROMPT');
});

test('Translate & STT dialogue helpers preserve silent gaps, parse Whisper lines, enforce cinematic prompts, and match export jobIds', () => {
  // 1) Dialogue cue normalizer must preserve silent gaps (never stretch 0-12s dialogue over a 60s silent outro)
  const sparseDialogue = [
    { id: 'c1', start_ms: 1200, end_ms: 3600, text: 'မင်း ဘာလို့ ဒီကိုရောက်နေတာလဲ။' },
    { id: 'c2', start_ms: 14500, end_ms: 17200, text: 'ငါ မင်းကို ရှာနေတာ ကြာပြီ။' }
  ];
  const normalized = normalizeDialogueSubtitleCues(sparseDialogue, 60);
  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].start_ms, 1200);
  assert.equal(normalized[0].end_ms, 3600);
  assert.equal(normalized[1].start_ms, 14500);
  assert.equal(normalized[1].end_ms, 17200);

  // 2) parseTimedSttTranscriptToCues parses timed Whisper lines cleanly
  const whisperText = `[00:02 - 00:05] Where have you been all night?\n[00:06 - 00:09] I was looking for you everywhere.`;
  const parsedStt = parseTimedSttTranscriptToCues(whisperText, 20);
  assert.equal(parsedStt.length, 2);
  assert.equal(parsedStt[0].start_ms, 2000);
  assert.equal(parsedStt[0].end_ms, 5000);
  assert.equal(parsedStt[0].text, 'Where have you been all night?');

  // 3) Cinematic translate prompt enforces first/second-person movie subtitles and bans recap narration
  const dubPrompt = buildCinematicTranslateSystemPrompt({
    targetLanguage: 'my',
    translateAudio: 'dub'
  });
  assert.ok(dubPrompt.includes('Movie Dialogue Translator'));
  assert.ok(dubPrompt.includes('NOT A MOVIE RECAP'));

  const verbatimSttPrompt = buildCinematicTranslateSystemPrompt({
    targetLanguage: 'my',
    translateAudio: 'captions-only',
    sttMode: 'transcribe',
    speakerDiarization: true
  });
  assert.ok(verbatimSttPrompt.includes('VERBATIM'));
  assert.ok(verbatimSttPrompt.includes('Speaker'));

  // 4) extractJobIdFromVideoUrl recovers jobId from preview, recap, AND exported MP4 URLs
  assert.equal(extractJobIdFromVideoUrl('/api/recap/video/job_1700_abc_preview.mp4'), 'job_1700_abc');
  assert.equal(extractJobIdFromVideoUrl('/api/recap/video/job_1700_abc_recap.mp4'), 'job_1700_abc');
  assert.equal(extractJobIdFromVideoUrl('/api/recap/video/job_1700_abc_export_9f8e7d6c5b.mp4'), 'job_1700_abc');
  assert.equal(extractJobIdFromVideoUrl('blob:https://example.com/123'), null);

  // 5) StreamWaveAI download path builder & mobile-safe Blob RAM threshold
  assert.equal(shouldUseBlobDownloadForSize(0), true);
  assert.equal(shouldUseBlobDownloadForSize(50 * 1024 * 1024), true);
  assert.equal(shouldUseBlobDownloadForSize(MAX_SAFE_BLOB_DOWNLOAD_BYTES), true);
  assert.equal(shouldUseBlobDownloadForSize(MAX_SAFE_BLOB_DOWNLOAD_BYTES + 1), false);

  const proDlApi = buildDownloadVideoApiPath(
    'job_1700_abc',
    'movie_recap.mp4',
    '/api/recap/video/job_1700_abc_export_12ab.mp4?t=123',
    false
  );
  assert.equal(
    proDlApi,
    '/api/recap/job_1700_abc/download/video?name=movie_recap.mp4&file=job_1700_abc_export_12ab.mp4'
  );

  const freeDlApi = buildDownloadVideoApiPath(
    'job_1700_free',
    '1000101658_free_recap.mp4',
    '/api/recap/video/job_1700_free_recap.mp4',
    true
  );
  assert.equal(
    freeDlApi,
    '/api/recap/job_1700_free/download/video?name=1000101658_free_recap.mp4&file=job_1700_free_recap.mp4&free=1'
  );

  // 6) resolveEffectiveVideoDurationSec never truncates a 2-minute video to 15s if ffprobe returns 0
  assert.equal(resolveEffectiveVideoDurationSec(123.667, 15), 123.67);
  assert.equal(resolveEffectiveVideoDurationSec(0, 124), 124);
  assert.equal(
    resolveEffectiveVideoDurationSec(0, 0, [{ id: 'c1', start_ms: 118000, end_ms: 123572, text: 'End' }]),
    123.57
  );
  assert.equal(resolveEffectiveVideoDurationSec(0, 0, []), 15);

  // 7) shouldSyncCompanionAudioTime blocks seek-past-duration thrashing & micro-seeks
  assert.equal(shouldSyncCompanionAudioTime(21.0, 0.2, 15.05, false, 0.85), false);
  assert.equal(shouldSyncCompanionAudioTime(21.0, 20.6, 123.67, false, 0.85), false);
  assert.equal(shouldSyncCompanionAudioTime(21.0, 18.0, 123.67, false, 0.85), true);
  assert.equal(shouldSyncCompanionAudioTime(21.0, 18.0, 123.67, true, 0.85), false);

  // 8) HTTP 206 Range download chunking splits 48.7MB export into <=8MB chunks under Cloud Run 32MB limit
  const total48Mb = 48_709_617;
  assert.equal(
    parseContentRangeTotalBytes('bytes 0-65535/48709617', '65536', 206),
    total48Mb
  );
  assert.equal(parseContentRangeTotalBytes(null, '12000000', 200), 12_000_000);
  assert.equal(parseContentRangeTotalBytes(null, '65536', 206), 0);

  const rangeChunks = computeRangeDownloadChunks(total48Mb, RANGE_DOWNLOAD_PROBE_BYTES);
  assert.equal(rangeChunks.length, 6);
  assert.equal(rangeChunks[0].start, 65536);
  assert.equal(rangeChunks[rangeChunks.length - 1].end, total48Mb - 1);

  let coveredBytes = RANGE_DOWNLOAD_PROBE_BYTES;
  for (let i = 0; i < rangeChunks.length; i++) {
    const c = rangeChunks[i];
    const span = c.end - c.start + 1;
    assert.ok(span > 0 && span <= RANGE_DOWNLOAD_CHUNK_BYTES);
    if (i > 0) {
      assert.equal(c.start, rangeChunks[i - 1].end + 1);
    }
    coveredBytes += span;
  }
  assert.equal(coveredBytes, total48Mb);

  // 9) Custom domain authDomain resolution for ttakb.site vs built-in Cloud Run / Firebase domains
  assert.equal(extractCustomDomainHostname('ttakb.site'), 'ttakb.site');
  assert.equal(extractCustomDomainHostname('https://ttakb.site/admin'), 'ttakb.site');
  assert.equal(extractCustomDomainHostname('www.ttakb.site:443'), 'www.ttakb.site');
  assert.equal(extractCustomDomainHostname('localhost:3000'), null);
  assert.equal(extractCustomDomainHostname('127.0.0.1'), null);
  assert.equal(
    extractCustomDomainHostname('ais-dev-iwslrdcjvk4m6m3i2tsp6k-944018305379.asia-southeast1.run.app'),
    null
  );
  assert.equal(extractCustomDomainHostname('brilliant-turbine-fdzcr.firebaseapp.com'), null);

  const domainInfo = resolveCustomAuthDomainInfo({
    windowHost: 'localhost',
    appUrl: 'https://ttakb.site/admin',
    defaultAuthDomain: 'brilliant-turbine-fdzcr.firebaseapp.com',
    projectId: 'brilliant-turbine-fdzcr'
  });
  assert.equal(domainInfo.customDomain, 'ttakb.site');
  assert.equal(domainInfo.requiredRedirectUri, 'https://ttakb.site/__/auth/handler');
  assert.equal(domainInfo.requiredJsOrigin, 'https://ttakb.site');

  assert.equal(
    isGoogleRedirectUriAuthorizedHtml('<html>Error 400: redirect_uri_mismatch</html>', 400),
    false
  );
  assert.equal(
    isGoogleRedirectUriAuthorizedHtml('<html>redirect_uri_mismatch</html>', 200),
    false
  );
  assert.equal(
    isGoogleRedirectUriAuthorizedHtml('<html><title>Sign in - Google Accounts</title></html>', 200),
    true
  );
});

test('alignCuesWithAudioSync keeps 123.67s 44-cue movie recap locked to video scene timestamps without snowballing 28s early', () => {
  const totalDurationMs = 123_670;
  const rawCues = Array.from({ length: 44 }, (_, idx) => {
    const startMs = Math.round((idx / 44) * 102_000); // Even if Gemini cues ended around 102s
    return {
      id: `cue-${idx + 1}`,
      start_ms: startMs,
      end_ms: startMs + 2200,
      text: `ဇာတ်ဝင်ခန်း အမှတ် ${idx + 1} မှာ ကောင်လေးက အိတ်ကြီးကို ဆွဲတင်လိုက်ပါတယ်`
    };
  });

  const normalized = normalizeRecapTimelineCues(rawCues, 123.67);
  assert.equal(normalized.length, 44);
  assert.ok(
    normalized[normalized.length - 1].end_ms >= 120_000,
    `Expected normalized cues to reach near 123.67s, got ${normalized[normalized.length - 1].end_ms}`
  );

  // Spoken TTS durations average ~1950ms per cue (85.8s total speech across 123.67s video)
  const spokenDurations = normalized.map(() => 1950);
  const synced = alignCuesWithAudioSync(normalized, spokenDurations, 100, true, totalDurationMs, 220);
  assert.equal(synced.length, 44);

  // Mid-video and late-video cues must stay locked near their scene timestamps (not pulled 15s-28s early)
  const cue13 = synced[13].cue; // ~36.5s scene
  assert.ok(cue13.start_ms >= 34_500 && cue13.start_ms <= 38_500, `Cue 13 drifted to ${cue13.start_ms}ms`);

  const cue31 = synced[31].cue; // ~87.1s scene
  assert.ok(cue31.start_ms >= 84_000 && cue31.start_ms <= 90_000, `Cue 31 drifted to ${cue31.start_ms}ms`);

  const lastCue = synced[synced.length - 1].cue;
  assert.ok(
    lastCue.end_ms >= 120_500 && lastCue.end_ms <= totalDurationMs,
    `Expected last cue to finish near 123.67s (not 95s early!), got ${lastCue.end_ms}ms`
  );

  // Verify splitCuesIntoShortPhrases splits 63-char sentence into balanced halves without 1-word orphan "သိလိုက်ပါတယ်"
  const orphanTest = splitCuesIntoShortPhrases(
    [
      {
        id: 'o-1',
        start_ms: 15000,
        end_ms: 17400,
        text: 'ကောင်လေးဟာ တစ်ခုခုတော့ မှားနေပြီဆိုတာကို ချက်ချင်းပဲ သိလိုက်ပါတယ်'
      }
    ],
    54
  );
  for (const part of orphanTest) {
    assert.ok(part.text.length >= 18, `Expected balanced phrase >= 18 chars, got orphan: "${part.text}"`);
  }
});

import {
  resolveSubtitleFontMeta,
  doesTextMatchSubtitleLanguage,
  needsSubtitleTranslation,
  parseTranslatedSubtitleChunkOutput,
  sanitizeRecapProgressMessage,
  buildChronologicalSceneLockGuide,
  computeAudioScriptWindows,
  sliceTimedTranscriptForWindow,
  decodeSignedTokenPayload,
  parsePersistedAuthUser,
  encodeAuthUserCacheHeader,
  shouldAutoRedirectAuthenticatedRoot
} from './recapEngine.ts';

test('resolveSubtitleFontMeta selects native fonts for Burmese, Korean, English, Thai, Chinese, and Japanese subtitles', () => {
  assert.equal(resolveSubtitleFontMeta('Yati_Round', 'my').assFontName, 'Padauk');
  assert.equal(resolveSubtitleFontMeta('Yati_Round', 'ko').assFontName, 'Noto Sans KR');
  assert.equal(resolveSubtitleFontMeta('Yati_Round', 'en', 'Subtitles here').assFontName, 'DejaVu Sans');
  assert.equal(resolveSubtitleFontMeta('Yati_Round', 'th').assFontName, 'Noto Sans Thai');
  assert.equal(resolveSubtitleFontMeta('Yati_Round', 'zh').assFontName, 'Noto Sans SC');
  assert.equal(resolveSubtitleFontMeta('Yati_Round', 'ja').assFontName, 'Noto Sans JP');
});

test('buildChronologicalSceneLockGuide and Documentary preset enforce 1:1 scene-timestamp lock across 146.89s video', () => {
  assert.ok(SCRIPT_STYLE_PROMPTS.none.systemPrompt.includes('STRICT 1:1 SCENE-TIMESTAMP LOCK'));
  assert.ok(SCRIPT_STYLE_PROMPTS.none.systemPrompt.includes('KEEP SIGNATURE DOCUMENTARY TONE'));

  const sampleTimedTranscript = [
    '[00:00 - 00:18] Principal Li wakes up early in a panic',
    '[00:25 - 00:35] Principal Li promises higher exam scores on the phone',
    '[00:40 - 01:28] Principal Li scolds teachers at the meeting and takes photos',
    '[01:49 - 02:10] His wife sees strange cursed words appearing on his back',
    '[02:11 - 02:27] The doctor at the hospital finds nothing medically wrong'
  ].join('\n');

  const guide = buildChronologicalSceneLockGuide(sampleTimedTranscript, 146.89);
  assert.ok(guide.includes('MANDATORY 1:1 SCENE-TIMESTAMP WINDOWS'));
  assert.ok(guide.includes('[00:00 - 00:20] (start_ms: 0ms .. 20000ms)'));
  assert.ok(guide.includes('[02:00 - 02:27] (start_ms: 120000ms .. 147000ms)'));
  assert.ok(guide.includes('The doctor at the hospital finds nothing medically wrong'));
});

test('computeAudioScriptWindows and sliceTimedTranscriptForWindow isolate 1:08+ (68s+) scenes into dedicated windows', () => {
  assert.equal(computeAudioScriptWindows(58, 64).length, 1);

  const windows125 = computeAudioScriptWindows(125, 64);
  assert.equal(windows125.length, 2);
  assert.equal(windows125[0].startSec, 0);
  assert.equal(windows125[0].endSec, 63);
  assert.equal(windows125[1].startSec, 63);
  assert.equal(windows125[1].endSec, 125);

  const sampleTranscript = [
    '[00:00 - 00:20] Opening confrontation in the hall',
    '[00:21 - 00:58] Guard discovers the hidden key',
    '[01:08 - 01:32] Secret vault opens and alarm rings',
    '[01:35 - 02:04] Hero escapes on the rooftop'
  ].join('\n');

  const win1Slice = sliceTimedTranscriptForWindow(sampleTranscript, 0, 63);
  assert.ok(win1Slice.includes('Opening confrontation in the hall'));
  assert.ok(!win1Slice.includes('Secret vault opens and alarm rings'));

  const win2Slice = sliceTimedTranscriptForWindow(sampleTranscript, 63, 125);
  assert.ok(!win2Slice.includes('Opening confrontation in the hall'));
  assert.ok(win2Slice.includes('[00:05 - 00:29] Secret vault opens and alarm rings'));
  assert.ok(win2Slice.includes('[00:32 - 01:01] Hero escapes on the rooftop'));
});

test('parsePersistedAuthUser, decodeSignedTokenPayload, and shouldAutoRedirectAuthenticatedRoot preserve login across page reloads on custom domains', () => {
  const samplePayload = {
    userId: 'UID-77889',
    name: 'Aung Kyaw',
    email: 'aungkyawbk96@gmail.com',
    provider: 'google',
    exp: Date.now() + 365 * 24 * 3600 * 1000
  };
  const payloadB64 = Buffer.from(JSON.stringify(samplePayload), 'utf-8').toString('base64url');
  const fakeSignedToken = `ttak1.${payloadB64}.fakesig`;

  const decoded = decodeSignedTokenPayload(fakeSignedToken);
  assert.ok(decoded);
  assert.equal(decoded?.userId, 'UID-77889');
  assert.equal(decoded?.email, 'aungkyawbk96@gmail.com');

  // Even if localStorage cache is empty, cookie + signed token hydrates the user immediately
  const fromCookie = parsePersistedAuthUser({
    cachedUserJson: null,
    storedToken: null,
    cookieString: `theme=dark; ttak_auth_token=${encodeURIComponent(fakeSignedToken)}`
  });
  assert.equal(fromCookie.user?.userId, 'UID-77889');
  assert.equal(fromCookie.token, fakeSignedToken);

  const encodedHeader = encodeAuthUserCacheHeader(fromCookie.user);
  assert.ok(encodedHeader.length > 10);

  assert.equal(shouldAutoRedirectAuthenticatedRoot('/', true), true);
  assert.equal(shouldAutoRedirectAuthenticatedRoot('/', false), false);
  assert.equal(shouldAutoRedirectAuthenticatedRoot('/wallet', true), false);
});

import { findDisplayCueAtTime } from './recapEngine.ts';

test('findDisplayCueAtTime holds previous cue during mid-video breath pauses (e.g. 1:10 / 70.8s) instead of falling back to cue-1', () => {
  const sampleCues = [
    {
      id: 'cue-1',
      start_ms: 60,
      end_ms: 2800,
      text: 'တစ်ကျောင်းလုံးကြောက်ရတဲ့ ကျောင်းအုပ်ကြီး ရောက်လာတဲ့အခါမှာတော့'
    },
    {
      id: 'cue-24',
      start_ms: 68545,
      end_ms: 70713,
      text: 'နံရံမှာ ချိတ်ထားတဲ့ ပန်းချီကားထဲက အနီရောင် အမြစ်တွေကလည်း စတင်လှုပ်ရှားလာပါတယ်'
    },
    {
      id: 'cue-25',
      start_ms: 71299,
      end_ms: 73619,
      text: 'ကျောင်းအုပ်ကြီးကတော့ ဆရာတွေကို လစာပေးထားရကျိုးမနပ်ဘူးဆိုပြီး ဒေါသတကြီး အော်ဟစ်နေပါတယ်'
    }
  ];

  // At 1:10.8 (70800ms), between cue-24 (ends 70713ms) and cue-25 (starts 71299ms):
  // Must hold cue-24 and NEVER fall back to cue-1!
  const heldAt70s = findDisplayCueAtTime(sampleCues, 70800, 1800);
  assert.ok(heldAt70s);
  assert.equal(heldAt70s?.id, 'cue-24');
  assert.notEqual(heldAt70s?.id, 'cue-1');
});

import {
  computeVisualKeyframePlan,
  parseFfmpegShowinfoPtsTimes
} from './recapEngine.ts';

test('computeVisualKeyframePlan, parseFfmpegShowinfoPtsTimes, and alignCuesWithAudioSync lock final-14s climax scenes', () => {
  // 1) Short clip (<= 24s) or non-final window uses lightweight single pass
  const shortPlan = computeVisualKeyframePlan(18, 22, true);
  assert.equal(shortPlan.useTwoPassTail, false);
  assert.ok(shortPlan.mainIntervalSec <= 2.6);

  const win1Plan = computeVisualKeyframePlan(59.36, 16, false);
  assert.equal(win1Plan.useTwoPassTail, false);
  assert.equal(win1Plan.mainMaxFrames, 16);

  // 2) Final 59.36s window (e.g. 0:59..1:58.72 of 118.72s clip) reserves dense ending tail inside <=22 frames
  const planFinal = computeVisualKeyframePlan(59.36, 22, true);
  assert.equal(planFinal.useTwoPassTail, true);
  assert.ok(planFinal.tailDurationSec >= 8 && planFinal.tailDurationSec <= 12);
  assert.ok(planFinal.tailStartSec >= 47 && planFinal.tailStartSec <= 52);
  assert.ok(planFinal.tailMaxFrames >= 6 && planFinal.tailMaxFrames <= 8);
  assert.ok(planFinal.tailIntervalSec <= 1.75);
  assert.ok(planFinal.mainMaxFrames + planFinal.tailMaxFrames <= 22);

  // 3) parseFfmpegShowinfoPtsTimes parses FFmpeg showinfo stderr accurately with pass offset
  const sampleStderr = [
    '[Parsed_showinfo_2 @ 0x1] n:   0 pts:      0 pts_time:0       pos: 100',
    '[Parsed_showinfo_2 @ 0x1] n:   1 pts: 117000 pts_time:1.3     pos: 200',
    '[Parsed_showinfo_2 @ 0x1] n:   2 pts: 711000 pts_time:7.9     pos: 300',
    '[Parsed_showinfo_2 @ 0x1] n:   3 pts:1182000 pts_time:13.1333 pos: 400'
  ].join('\n');
  const parsedPts = parseFfmpegShowinfoPtsTimes(sampleStderr, 104.72);
  assert.deepEqual(parsedPts, [104.72, 106.02, 112.62, 117.85]);

  // 4) Late-video drift catch-up: if mid-video TTS phrases ran 3s longer than slots, final climax recovers inside 118.72s
  const totalMs = 118_720;
  const cues119 = Array.from({ length: 40 }, (_, i) => {
    const s = Math.round((i / 40) * 114_000) + 100;
    return {
      id: `k-${i + 1}`,
      start_ms: s,
      end_ms: s + 2400,
      text: `ဇာတ်ဝင်ခန်း ${i + 1} စာသား`
    };
  });
  const spokenMs = cues119.map((_, i) => (i >= 18 && i <= 26 ? 3350 : 2550));
  const synced = alignCuesWithAudioSync(cues119, spokenMs, 100, true, totalMs, 220);
  assert.equal(synced.length, 40);
  assert.ok(
    synced[synced.length - 1].cue.end_ms <= totalMs + 120,
    `Expected final cue to fit video ending, got ${synced[synced.length - 1].cue.end_ms}ms`
  );
  // Confirm climax cue (~111s) is not stranded many seconds late
  const climaxCue = synced[38].cue;
  assert.ok(
    Math.abs(climaxCue.start_ms - cues119[38].start_ms) <= 2200,
    `Expected climax cue start ${climaxCue.start_ms}ms within 2.2s of scene ${cues119[38].start_ms}ms`
  );
});

test('isApiKeyQuotaOrLimitError uses 90s cooldown for temporary RPM/TPM 429 bursts and 24h cooldown for daily quota exhaustion', () => {
  const transientRpm = isApiKeyQuotaOrLimitError(
    new Error('429 Too Many Requests: Requests per minute limit exceeded, please retry in 18s')
  );
  assert.equal(transientRpm.shouldRotate, true);
  assert.equal(transientRpm.isQuotaLimit, true);
  assert.equal(transientRpm.cooldownMs, 90_000);

  const geminiRpmWithResourceExhausted = isApiKeyQuotaOrLimitError(
    new Error(
      'ApiError: {"error":{"code":429,"message":"You exceeded your current quota, Quota exceeded for quota metric \'Generate Content API requests per minute\'","status":"RESOURCE_EXHAUSTED"}}'
    )
  );
  assert.equal(geminiRpmWithResourceExhausted.shouldRotate, true);
  assert.equal(geminiRpmWithResourceExhausted.cooldownMs, 90_000);

  const dailyQuota = isApiKeyQuotaOrLimitError(
    new Error(
      'ApiError: {"error":{"code":429,"message":"You exceeded your current quota: GenerateContentRequestsPerDay","status":"RESOURCE_EXHAUSTED"}}'
    )
  );
  assert.equal(dailyQuota.shouldRotate, true);
  assert.equal(dailyQuota.cooldownMs, OWNER_KEY_LIMIT_COOLDOWN_MS);
});

import {
  parseAndNormalizeVideoSourceUrl,
  buildSafeFetchedVideoFilename
} from './recapEngine.ts';

test('parseAndNormalizeVideoSourceUrl extracts social links from share text, blocks SSRF hosts, and classifies platforms', () => {
  const tiktokShort = parseAndNormalizeVideoSourceUrl('Check out this clip https://vt.tiktok.com/ZSptXq56x/!');
  assert.equal(tiktokShort.valid, true);
  assert.equal(tiktokShort.platform, 'tiktok');
  assert.equal(tiktokShort.normalizedUrl, 'https://vt.tiktok.com/ZSptXq56x/');

  const ytShort = parseAndNormalizeVideoSourceUrl('https://youtube.com/shorts/abc123XYZ');
  assert.equal(ytShort.valid, true);
  assert.equal(ytShort.platform, 'youtube');

  const fbWatch = parseAndNormalizeVideoSourceUrl('https://fb.watch/xyz987/');
  assert.equal(fbWatch.valid, true);
  assert.equal(fbWatch.platform, 'facebook');

  const directMp4 = parseAndNormalizeVideoSourceUrl('https://cdn.example.com/movies/clip_01.mp4?token=1');
  assert.equal(directMp4.valid, true);
  assert.equal(directMp4.platform, 'direct');

  // Blocks SSRF/private/invalid URLs cleanly
  assert.equal(parseAndNormalizeVideoSourceUrl('http://127.0.0.1:3000/secret.mp4').valid, false);
  assert.equal(parseAndNormalizeVideoSourceUrl('http://169.254.169.254/latest/meta-data').valid, false);
  assert.equal(parseAndNormalizeVideoSourceUrl('not a valid link').valid, false);

  assert.equal(
    buildSafeFetchedVideoFilename('#movierecap အပိုင်း (၁)', 'tiktok', 'loc_12345678'),
    'movierecap.mp4'
  );
  assert.equal(
    buildSafeFetchedVideoFilename('မြန်မာဇာတ်ကား', 'tiktok', 'loc_12345678'),
    'tiktok_345678.mp4'
  );
  assert.equal(
    buildSafeFetchedVideoFilename('Epic Action Scene 2026', 'youtube', 'loc_12345678'),
    'Epic_Action_Scene_2026.mp4'
  );
});

import {
  extractRedNoteVideoInfoFromHtml,
  normalizeRedNoteCanonicalUrl
} from './recapEngine.ts';

test('RedNote (Xiaohongshu) helpers parse share snippets, normalize domains, and extract watermark-free streams', () => {
  // 1) Handles Chinese RedNote mobile share text with bare xhslink.com URL and trailing punctuation
  const shareSnippet = parseAndNormalizeVideoSourceUrl(
    '68 某博主发布了一篇小红书笔记，快来看吧！ xhslink.com/a/K9xYz123！复制本条信息，打开【小红书】'
  );
  assert.equal(shareSnippet.valid, true);
  assert.equal(shareSnippet.platform, 'rednote');
  assert.equal(shareSnippet.normalizedUrl, 'https://xhslink.com/a/K9xYz123');

  const fullXhs = parseAndNormalizeVideoSourceUrl(
    'https://www.xiaohongshu.com/discovery/item/673a1b2c000000001e01a2b3?xsec_token=abc123'
  );
  assert.equal(fullXhs.valid, true);
  assert.equal(fullXhs.platform, 'rednote');

  const rednoteDomain = parseAndNormalizeVideoSourceUrl(
    'https://www.rednote.com/explore/673a1b2c000000001e01a2b3'
  );
  assert.equal(rednoteDomain.valid, true);
  assert.equal(rednoteDomain.platform, 'rednote');
  assert.equal(
    normalizeRedNoteCanonicalUrl(rednoteDomain.normalizedUrl),
    'https://www.xiaohongshu.com/explore/673a1b2c000000001e01a2b3'
  );

  // 2) Extracts watermark-free originVideoKey & stream.h264 masterUrl while rejecting watermarked URLs
  const mockXhsHtml = `
    <html>
      <head><meta property="og:title" content="Awesome Movie Clip - 小红书"></head>
      <body>
        <script>
          window.__INITIAL_STATE__={
            "note":{
              "title":"Awesome Movie Clip",
              "duration":45000,
              "video":{
                "consumer":{"originVideoKey":"pre_post\\u002F01e7abc123.mp4"},
                "media":{
                  "stream":{
                    "h264":[
                      {"masterUrl":"http:\\u002F\\u002Fsns-video-bd.xhscdn.com\\u002Fstream\\u002F110\\u002F258\\u002Fclean_hd.mp4?sign=1&amp;watermark=0"},
                      {"masterUrl":"http:\\u002F\\u002Fsns-video-bd.xhscdn.com\\u002Fstream\\u002Fwm_bad.mp4?watermark=1"}
                    ]
                  }
                }
              }
            }
          };
        </script>
      </body>
    </html>
  `;
  const extracted = extractRedNoteVideoInfoFromHtml(mockXhsHtml);
  assert.equal(extracted.title, 'Awesome Movie Clip');
  assert.equal(extracted.durationSec, 45);
  assert.equal(extracted.videoUrls[0], 'https://sns-video-bd.xhscdn.com/pre_post/01e7abc123.mp4');
  assert.ok(
    extracted.videoUrls.includes(
      'https://sns-video-bd.xhscdn.com/stream/110/258/clean_hd.mp4?sign=1&watermark=0'
    )
  );
  assert.equal(
    extracted.videoUrls.some((u) => u.includes('wm_bad') || u.includes('watermark=1')),
    false
  );
});

test('Site online notification helpers show active update once, hide across reloads after X dismiss, and re-show only on new Telegram update ID', () => {
  const firstNotice = {
    id: 'notif_1001_abc',
    message: 'Website Update v2.5 တင်ပြီးပါပြီ (1:30 = 1 Credit)',
    updatedAt: 1795000000000,
    active: true
  };

  // Fresh user with empty storage sees the active announcement
  const initialDismissed = parseDismissedSiteNotificationIds(null);
  assert.deepEqual(initialDismissed, []);
  assert.equal(shouldShowSiteNotification(firstNotice, initialDismissed), true);

  // User clicks X -> saved ID stays hidden across reloads
  const afterDismiss = addDismissedSiteNotificationId(initialDismissed, firstNotice.id);
  const reloadedDismissed = parseDismissedSiteNotificationIds(JSON.stringify(afterDismiss));
  assert.equal(shouldShowSiteNotification(firstNotice, reloadedDismissed), false);

  // Admin clears notification (/clearnotify) -> hidden
  assert.equal(shouldShowSiteNotification({ ...firstNotice, active: false }, []), false);
  assert.equal(shouldShowSiteNotification(null, []), false);

  // Admin posts a brand-new announcement (/notify) -> new ID appears once to everyone
  const secondNotice = {
    id: 'notif_2002_def',
    message: 'Natural Flow Script Style အသစ် ထည့်သွင်းပြီးပါပြီ',
    updatedAt: 1795003600000,
    active: true
  };
  assert.equal(shouldShowSiteNotification(secondNotice, reloadedDismissed), true);
});

test('Multilingual subtitle helpers detect untranslated Burmese and parse indexed/JSON/numbered LLM outputs for all 6 languages', () => {
  assert.equal(doesTextMatchSubtitleLanguage('ကျောကုန်းပေါ်က ကျိန်စာ', 'my'), true);
  assert.equal(doesTextMatchSubtitleLanguage('ကျောကုန်းပေါ်က ကျိန်စာ', 'en'), false);
  assert.equal(doesTextMatchSubtitleLanguage('The curse on his back changed everything.', 'en'), true);
  assert.equal(doesTextMatchSubtitleLanguage('เพราะคำสาปบนแผ่นหลัง', 'th'), true);
  assert.equal(doesTextMatchSubtitleLanguage('등 뒤의 저주로 모든 것이 변했다', 'ko'), true);
  assert.equal(doesTextMatchSubtitleLanguage('背上的血字诅咒改变了他的一生', 'zh'), true);
  assert.equal(doesTextMatchSubtitleLanguage('背中の呪いが彼の人生を変えた', 'ja'), true);

  const burmeseCues = [
    { id: '1', start_ms: 0, end_ms: 2000, text: 'ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ' },
    { id: '2', start_ms: 2000, end_ms: 4000, text: 'သူ့ဘဝတစ်ခုလုံး ပြောင်းလဲသွားခဲ့တယ်' }
  ];
  assert.equal(needsSubtitleTranslation(burmeseCues, 'my'), false);
  assert.equal(needsSubtitleTranslation(burmeseCues, 'en'), true);
  assert.equal(needsSubtitleTranslation(burmeseCues, 'th'), true);
  assert.equal(needsSubtitleTranslation(burmeseCues, 'ko'), true);
  assert.equal(needsSubtitleTranslation(burmeseCues, 'zh'), true);
  assert.equal(needsSubtitleTranslation(burmeseCues, 'ja'), true);

  // Indexed JSON survives missing item without discarding other lines
  const indexed = parseTranslatedSubtitleChunkOutput(
    '```json\n{"items":[{"i":1,"t":"First line"},{"i":3,"t":"Third line"}]}\n```',
    3
  );
  assert.deepEqual(indexed, ['First line', null, 'Third line']);

  // Object response from Cloudflare Workers AI
  const cfObj = parseTranslatedSubtitleChunkOutput({ lines: ['1. สวัสดี', '2. ลาก่อน'] }, 2);
  assert.deepEqual(cfObj, ['สวัสดี', 'ลาก่อน']);

  // Plain numbered text fallback
  const numbered = parseTranslatedSubtitleChunkOutput('1. 안녕하세요\n2. 감사합니다', 2);
  assert.deepEqual(numbered, ['안녕하세요', '감사합니다']);
});

test('sanitizeRecapProgressMessage removes all AI, Gemini, Whisper, and model names while preserving clean English progress', () => {
  const samples = [
    'Switching to backup AI model (gemini-3.1-flash-lite)...',
    'Gemini AI busy (503) — optimizing payload & retrying with backup model...',
    'Listening to original audio with AI...',
    'Transcribing dialogue with Whisper AI...',
    'Writing time-synced script & subtitles with AI...',
    'Synthesizing AI voiceover...',
    'Starting AI recap job...',
    'gemini-4-hydrogen quota reached — switching to backup Gemini model...',
    'Gemini limit/busy — generating synced script via backup AI engine...'
  ];
  for (const s of samples) {
    const cleaned = sanitizeRecapProgressMessage(s);
    assert.ok(cleaned.length >= 6, `Expected non-empty clean string for: ${s}`);
    assert.equal(/\b(AI|Gemini|Whisper|Groq|Cloudflare)\b/i.test(cleaned), false, `Found forbidden word in: ${cleaned}`);
    assert.equal(/gemini-[\w.-]+/i.test(cleaned), false, `Found model ID in: ${cleaned}`);
  }
  assert.equal(sanitizeRecapProgressMessage('Syncing voiceover & video...'), 'Syncing voiceover & video...');
  assert.equal(sanitizeRecapProgressMessage('Finalizing recap video...'), 'Finalizing recap video...');
});

test('Natural Flow prompt enforces exact number/on-screen subtitle accuracy and alignCuesWithAudioSync keeps steady voice speed without fast-slow swings', () => {
  // 1) Natural Flow prompt must require exact number & on-screen subtitle fidelity alongside varied Burmese endings
  const naturalPrompt = SCRIPT_STYLE_PROMPTS.natural.systemPrompt;
  assert.ok(naturalPrompt.includes('burned-in on-screen subtitles'));
  assert.ok(naturalPrompt.includes('exact number'));
  assert.ok(naturalPrompt.includes('NEVER invent generic filler'));
  assert.ok(naturalPrompt.includes('...လိုက်တော့တာပေါ့'));

  // 2) 212s (3:32) recap with alternating short & long spoken cues must NOT swing abruptly between 1.00x and 1.24x
  const totalMs = 212_000;
  const cues212 = Array.from({ length: 72 }, (_, idx) => {
    const startMs = Math.round((idx / 72) * 208_000) + 100;
    return {
      id: `nf-${idx + 1}`,
      start_ms: startMs,
      end_ms: startMs + 2500,
      text: `အခန်း ၂၁၄ ဇာတ်ဝင်ခန်း ${idx + 1}`
    };
  });
  const alternatingSpokenMs = cues212.map((_, idx) => (idx % 2 === 0 ? 3450 : 1850));
  const steadySchedule = alignCuesWithAudioSync(cues212, alternatingSpokenMs, 100, true, totalMs, 220);

  assert.equal(steadySchedule.length, 72);
  for (let i = 0; i < steadySchedule.length; i++) {
    assert.ok(
      steadySchedule[i].tempoFactor >= 1.0 && steadySchedule[i].tempoFactor <= 1.12,
      `Cue ${i} tempoFactor ${steadySchedule[i].tempoFactor} exceeded steady 1.0x–1.12x range`
    );
    if (i > 0) {
      const delta = Math.abs(steadySchedule[i].tempoFactor - steadySchedule[i - 1].tempoFactor);
      assert.ok(
        delta <= 0.03,
        `Adjacent cue speed swing too large between cue ${i - 1} (${steadySchedule[i - 1].tempoFactor}) and cue ${i} (${steadySchedule[i].tempoFactor})`
      );
    }
  }
});

test('Hybrid Dialogue Script Style registers cleanly with Burmese narrator + quoted dialogue rules without altering existing styles', () => {
  const hybrid = SCRIPT_STYLE_PROMPTS.hybrid;
  assert.equal(hybrid.id, 'hybrid');
  assert.equal(hybrid.labelEn, 'Hybrid Dialogue');
  assert.ok(hybrid.labelMy.includes('ဇာတ်ကြောင်းပြော + ဇာတ်ကောင်စကားပြော'));
  assert.ok(hybrid.descriptionMy.includes('"..."'));
  assert.ok(hybrid.systemPrompt.includes('STRICT HYBRID STRUCTURE RULES'));
  assert.ok(hybrid.systemPrompt.includes('DIRECT FIRST/SECOND-PERSON CHARACTER DIALOGUE'));
  assert.ok(hybrid.systemPrompt.includes('NON-DIALOGUE / SETUP / ACTION SCENES'));

  const synced = buildSyncedRecapCues(30, 'hybrid', 'my', 'Demo Clip');
  assert.ok(synced.cues.length >= 4);
  assert.ok(synced.cues.some((c) => c.text.includes('"')));
});

test('Translate Captions-Only helpers catch missed lines, preserve dense STT segments, merge cleanly, and enforce 哎呀 (Āiyā) -> အိုက်ယား', () => {
  // 1) System prompt enforces Zero-Skip 100% coverage, 1-word short lines, and 哎呀 -> အိုက်ယား
  const captionsPrompt = buildCinematicTranslateSystemPrompt({
    targetLanguage: 'my',
    translateAudio: 'captions-only',
    sttMode: 'translate'
  });
  assert.ok(captionsPrompt.includes('ZERO-SKIP 100% DIALOGUE COVERAGE'));
  assert.ok(captionsPrompt.includes('STRICT ONE SPEAKER'));
  assert.ok(captionsPrompt.includes('1 to 10 words'));
  assert.ok(captionsPrompt.includes('哎呀'));
  assert.ok(captionsPrompt.includes('အိုက်ယား'));

  // 2) Dense Whisper transcript (>120 segments) preserves every segment when maxSegments = 1000
  const denseSegments = Array.from({ length: 185 }, (_, i) => ({
    start: i * 1.5,
    end: i * 1.5 + 1.2,
    text: `台词 ${i + 1}`
  }));
  const fullTimed = formatTimedSttSegments(denseSegments, '', 1000);
  assert.equal(fullTimed.split('\n').length, 185);

  // 3) findUncoveredTranscriptSegments detects missed lines (including short 哎呀! exclamation)
  const sourceTranscript = [
    '[00:01 - 00:03] 你怎么回来了？',
    '[00:05 - 00:06] 哎呀！',
    '[00:10 - 00:13] 快点跟我走吧。',
    '[00:18 - 00:20] 等等我！'
  ].join('\n');
  const partialTranslated = [
    { id: 'cue-1', start_ms: 1000, end_ms: 3000, text: 'မင်း ဘယ်လိုပြန်ရောက်လာတာလဲ' },
    { id: 'cue-2', start_ms: 10000, end_ms: 13000, text: 'ငါနဲ့ မြန်မြန်လိုက်ခဲ့ပါ' }
  ];
  const missed = findUncoveredTranscriptSegments(sourceTranscript, partialTranslated, 25);
  assert.equal(missed.length, 2);
  assert.equal(missed[0].text, '哎呀！');
  assert.equal(missed[1].text, '等等我！');

  // 4) mergeMissingDialogueCues inserts repaired cues chronologically without overlaps
  const repaired = [
    { id: 'rep-1', start_ms: 5000, end_ms: 6000, text: 'အိုက်ယား!' },
    { id: 'rep-2', start_ms: 18000, end_ms: 20000, text: 'ငါ့ကို ခဏစောင့်ဦး!' }
  ];
  const merged = mergeMissingDialogueCues(partialTranslated, repaired, 25);
  assert.equal(merged.length, 4);
  assert.equal(merged[1].text, 'အိုက်ယား!');
  assert.equal(merged[3].text, 'ငါ့ကို ခဏစောင့်ဦး!');
  for (let i = 1; i < merged.length; i++) {
    assert.ok(merged[i].start_ms >= merged[i - 1].end_ms, 'Merged cues must not overlap');
  }

  // 5) applyBurmeseDialogueExclamationRules: ONLY literal 哎呀 (Āiyā) -> အိုက်ယား; never leaks onto split/neighbor/other lines
  const rawBurmeseCues = [
    { id: 'cue-1', start_ms: 1000, end_ms: 3000, text: 'မင်း ဘယ်လိုပြန်ရောက်လာတာလဲ' },
    { id: 'cue-2', start_ms: 5000, end_ms: 6000, text: 'ဟယ်!' },
    { id: 'cue-3', start_ms: 7000, end_ms: 8500, text: '哎呀၊ မြန်မြန်လုပ်ပါ' },
    // Second split chunk of the [00:07 - 00:10] segment — must NOT get duplicated အိုက်ယား!
    { id: 'cue-4', start_ms: 8520, end_ms: 10000, text: 'ငါတို့ နောက်ကျတော့မယ်' },
    { id: 'cue-5', start_ms: 11000, end_ms: 13000, text: 'Āiyā! ဘယ်လိုဖြစ်တာလဲ' },
    // Non-哎呀 exclamations (天啊 / 啊呀 / 哇) — must NEVER become အိုက်ယား!
    { id: 'cue-6', start_ms: 14000, end_ms: 16000, text: 'အိုက်ယား၊ မြန်မြန်ပြေးတော့!' },
    { id: 'cue-7', start_ms: 17000, end_ms: 18500, text: 'ဟယ်၊ နာလိုက်တာ' },
    { id: 'cue-8', start_ms: 19000, end_ms: 20500, text: 'အိုက်ယား!' }
  ];
  const sourceWithAiya = [
    '[00:01 - 00:03] 你怎么回来了？',
    '[00:05 - 00:06] 哎呀！',
    '[00:07 - 00:10] 哎呀，快点吧，我们要迟到了',
    '[00:11 - 00:13] 哎呀，怎么回事',
    '[00:14 - 00:16] 天啊，快跑吧！',
    '[00:17 - 00:18] 啊呀，真疼！',
    '[00:19 - 00:20] 哇！'
  ].join('\n');
  const normalizedBurmese = applyBurmeseDialogueExclamationRules(rawBurmeseCues, sourceWithAiya, 'my');
  assert.equal(normalizedBurmese[0].text, 'မင်း ဘယ်လိုပြန်ရောက်လာတာလဲ');
  assert.equal(normalizedBurmese[1].text, 'အိုက်ယား!');
  assert.equal(normalizedBurmese[2].text, 'အိုက်ယား၊ မြန်မြန်လုပ်ပါ');
  assert.equal(normalizedBurmese[3].text, 'ငါတို့ နောက်ကျတော့မယ်');
  assert.equal(normalizedBurmese[4].text, 'အိုက်ယား! ဘယ်လိုဖြစ်တာလဲ');
  assert.equal(normalizedBurmese[5].text, 'မြန်မြန်ပြေးတော့!');
  assert.equal(normalizedBurmese[6].text, 'ဟယ်၊ နာလိုက်တာ');
  assert.equal(normalizedBurmese[7].text, 'ဝိုး!');
});

test('Precise millisecond STT formatting filters hallucinations and normalizeDialogueSubtitleCues prevents cumulative snowball drift', () => {
  const noisySegments = [
    { start: 0.42, end: 1.18, text: '你好！' },
    { start: 1.25, end: 1.92, text: '谢谢观看' }, // hallucination — must be dropped
    { start: 2.05, end: 2.75, text: '你来啦？' },
    { start: 2.8, end: 3.1, text: '啊啊啊啊啊啊啊' }, // repetition loop — must be dropped
    { start: 3.22, end: 4.05, text: '快进来吧' }
  ];
  const preciseTimed = formatTimedSttSegments(noisySegments, '', 1000, true);
  assert.ok(preciseTimed.includes('[00:00.42 - 00:01.18] 你好！'));
  assert.ok(preciseTimed.includes('[00:02.05 - 00:02.75] 你来啦？'));
  assert.ok(preciseTimed.includes('[00:03.22 - 00:04.05] 快进来吧'));
  assert.ok(!preciseTimed.includes('谢谢观看'));
  assert.ok(!preciseTimed.includes('啊啊啊啊啊啊啊'));

  // Parse back with millisecond precision preserved (not rounded to whole seconds!)
  const parsedMsCues = parseTimedSttTranscriptToCues(preciseTimed, 10);
  assert.equal(parsedMsCues.length, 3);
  assert.equal(parsedMsCues[0].start_ms, 420);
  assert.equal(parsedMsCues[0].end_ms, 1180);
  assert.equal(parsedMsCues[1].start_ms, 2050);
  assert.equal(parsedMsCues[2].start_ms, 3220);

  // Rapid slightly overlapping cues must NOT snowball late drift across 10 consecutive lines
  const rapidOverlapping = Array.from({ length: 10 }, (_, i) => ({
    id: `r-${i + 1}`,
    start_ms: i * 1000,
    end_ms: i * 1000 + 1350, // 350ms overlap with next cue
    text: `စာကြောင်း ${i + 1}`
  }));
  const driftFree = normalizeDialogueSubtitleCues(rapidOverlapping, 15);
  assert.equal(driftFree.length, 10);
  // Last cue MUST still start right at ~9000ms (0ms snowball drift, NOT pushed to 12500ms!)
  assert.equal(driftFree[9].start_ms, 9000);
  for (let i = 1; i < driftFree.length; i++) {
    assert.ok(driftFree[i].start_ms >= driftFree[i - 1].end_ms, 'Must remain non-overlapping');
  }
});

test('splitMultiSpeakerDialogueCues separates merged two-speaker turns & Q&A into individual timed cues without splitting same-speaker exclamations', () => {
  const mergedGeminiCues = [
    { id: 'c1', start_ms: 1000, end_ms: 4200, text: '- မင်းဘယ်သွားမလို့လဲ? - ငါအိမ်ပြန်တော့မယ်' },
    { id: 'c2', start_ms: 4500, end_ms: 7500, text: 'ဟေ့ ခဏနေဦး! ဘာဖြစ်လို့လဲ?' },
    { id: 'c3', start_ms: 8000, end_ms: 10000, text: 'အိုက်ယား! ဘယ်လိုဖြစ်တာလဲ' },
    { id: 'c4', start_ms: 10500, end_ms: 13500, text: 'မင်းဒီကိုဘာလာလုပ်တာလဲ။ ငါမင်းကိုလာရှာတာ။' }
  ];

  const split = splitMultiSpeakerDialogueCues(mergedGeminiCues);
  assert.equal(split.length, 7);
  assert.equal(split[0].text, 'မင်းဘယ်သွားမလို့လဲ?');
  assert.equal(split[1].text, 'ငါအိမ်ပြန်တော့မယ်');
  assert.equal(split[0].start_ms, 1000);
  assert.equal(split[1].end_ms, 4200);
  assert.ok(split[1].start_ms > split[0].end_ms);

  assert.equal(split[2].text, 'ဟေ့ ခဏနေဦး!');
  assert.equal(split[3].text, 'ဘာဖြစ်လို့လဲ?');

  // Same-speaker leading exclamation stays intact as ONE cue
  assert.equal(split[4].text, 'အိုက်ယား! ဘယ်လိုဖြစ်တာလဲ');

  // Two Burmese sentences separated by ။ split cleanly into 2 individual cues
  assert.equal(split[5].text, 'မင်းဒီကိုဘာလာလုပ်တာလဲ');
  assert.equal(split[6].text, 'ငါမင်းကိုလာရှာတာ');
});

test('VPS URL fetcher safety guards block private/loopback/metadata hosts while allowing public video CDNs', () => {
  assert.equal(isAllowedPublicVideoStreamUrl('https://sns-video-bd.xhscdn.com/pre_post/abc123.mp4'), true);
  assert.equal(isAllowedPublicVideoStreamUrl('https://aweme.snssdk.com/aweme/v1/play/?video_id=v0300'), true);
  assert.equal(isAllowedPublicVideoStreamUrl('http://127.0.0.1:3000/secret'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('http://localhost/admin'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('http://169.254.169.254/latest/meta-data/'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('http://10.0.0.1/internal.mp4'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('http://192.168.1.5/video.mp4'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('http://172.16.0.12/video.mp4'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('http://[::1]/video.mp4'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('http://metadata.google.internal/computeMetadata/v1/'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('https://user:pass@example.com/v.mp4'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('file:///etc/passwd'), false);
  assert.equal(isAllowedPublicVideoStreamUrl('javascript:alert(1)'), false);

  assert.equal(isPrivateOrReservedIp('127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('::ffff:127.0.0.1'), true);
  assert.equal(isPrivateOrReservedIp('::ffff:169.254.169.254'), true);
  assert.equal(isPrivateOrReservedIp('fc00::1'), true);
  assert.equal(isPrivateOrReservedIp('fe80::1'), true);
  assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
  assert.equal(isPrivateOrReservedIp('2606:4700:4700::1111'), false);

  // Protocol-less v.douyin.com mobile share snippet parses cleanly as Douyin
  const douyinShare = parseAndNormalizeVideoSourceUrl('3.89 复制打开抖音，看看视频 v.douyin.com/iR8xYz9A/ 很好看');
  assert.equal(douyinShare.valid, true);
  assert.equal(douyinShare.platform, 'douyin');
  assert.equal(douyinShare.normalizedUrl, 'https://v.douyin.com/iR8xYz9A/');
});

test('RedNote (Xiaohongshu) extractor prioritizes raw watermark-free originVideoKey ahead of fallback streams and builds discovery/item URLs', () => {
  const noteUrl = 'https://www.xiaohongshu.com/explore/67a1b2c3d4e5f60123456789?xsec_token=AB12CD&xsec_source=pc_feed';
  assert.equal(extractRedNoteNoteId(noteUrl), '67a1b2c3d4e5f60123456789');

  const pages = buildRedNoteCandidatePageUrls([noteUrl]);
  assert.ok(
    pages.includes(
      'https://www.xiaohongshu.com/discovery/item/67a1b2c3d4e5f60123456789?xsec_token=AB12CD&xsec_source=pc_feed'
    )
  );
  assert.ok(
    pages.includes(
      'https://www.xiaohongshu.com/explore/67a1b2c3d4e5f60123456789?xsec_token=AB12CD&xsec_source=pc_feed'
    )
  );

  const mockXhsHtml = `
    <meta property="og:video" content="https://sns-video-qc.xhscdn.com/stream/110/watermarked_preview.mp4" />
    <script>
      window.__INITIAL_STATE__ = {
        "title": "北京旅行Vlog - 小红书",
        "duration": 24000,
        "consumer": {"originVideoKey": "pre_post\\u002F1040g00g31cleanraw.mp4"},
        "stream": {
          "h264": [
            {"masterUrl": "https://sns-video-hw.xhscdn.com/stream/1/110/258/transcoded.mp4"},
            {"masterUrl": "https://sns-video-hw.xhscdn.com/stream/110/clip.mp4?watermark=1"}
          ]
        }
      };
    </script>
  `;
  const extracted = extractRedNoteVideoInfoFromHtml(mockXhsHtml);
  assert.equal(extracted.hasOriginVideoKey, true);
  assert.equal(extracted.title, '北京旅行Vlog');
  assert.equal(extracted.durationSec, 24);
  assert.equal(
    extracted.originVideoUrls[0],
    'https://sns-video-bd.xhscdn.com/pre_post/1040g00g31cleanraw.mp4'
  );
  assert.ok(
    extracted.originVideoUrls.includes(
      'https://sns-bak-v1.xhscdn.com/pre_post/1040g00g31cleanraw.mp4'
    )
  );
  // Watermarked stream MUST be excluded
  assert.equal(
    extracted.videoUrls.some((u) => u.includes('watermark=1')),
    false
  );
  // Origin video URLs MUST come strictly before fallback streams
  assert.equal(extracted.videoUrls[0], extracted.originVideoUrls[0]);
  assert.ok(
    extracted.fallbackStreamUrls.includes(
      'https://sns-video-hw.xhscdn.com/stream/1/110/258/transcoded.mp4'
    )
  );
});

test('TikTok & Douyin resolvers strictly exclude watermarked streams and rewrite Douyin /playwm/ to /play/', () => {
  // TikWM must ONLY pick hdplay and play — NEVER wmplay
  const tikStreams = selectWatermarkFreeTikTokStreams({
    hdplay: '/video/media/hdplay/73991234.mp4',
    play: 'https://v16m.tiktokcdn.com/clean_play.mp4',
    wmplay: 'https://v16m.tiktokcdn.com/watermarked_wmplay.mp4'
  });
  assert.deepEqual(tikStreams, [
    'https://www.tikwm.com/video/media/hdplay/73991234.mp4',
    'https://v16m.tiktokcdn.com/clean_play.mp4'
  ]);
  assert.equal(tikStreams.some((u) => u.includes('wmplay')), false);

  // Douyin aweme_id extraction across share, video, and modal URLs
  assert.equal(
    extractDouyinAwemeId('https://www.douyin.com/video/7412345678901234567'),
    '7412345678901234567'
  );
  assert.equal(
    extractDouyinAwemeId('https://www.iesdouyin.com/share/video/7412345678901234567/?region=CN'),
    '7412345678901234567'
  );
  assert.equal(
    extractDouyinAwemeId('https://www.douyin.com/discover?modal_id=7412345678901234567'),
    '7412345678901234567'
  );

  // /playwm/ -> /play/ and watermark=1 -> watermark=0 rewrite
  assert.equal(
    normalizeDouyinPlayUrlToNoWatermark(
      'http://aweme.snssdk.com/aweme/v1/playwm/?video_id=v0300fg10000clean&watermark=1&ratio=720p'
    ),
    'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0300fg10000clean&watermark=0&ratio=720p'
  );

  // Douyin mobile share page _ROUTER_DATA HTML extraction produces clean /play/ URLs
  const mockDouyinHtml = `
    <script>
      window._ROUTER_DATA = {
        "loaderData": {
          "video_(id)/page": {
            "videoInfoRes": {
              "item_list": [{
                "desc": "精彩剧情剪辑 - 抖音",
                "duration": 19500,
                "video": {
                  "play_addr": {
                    "uri": "v0300fg10000douyinclean99",
                    "url_list": [
                      "https://aweme.snssdk.com/aweme/v1/playwm/?video_id=v0300fg10000douyinclean99&ratio=720p&line=0"
                    ]
                  }
                }
              }]
            }
          }
        }
      };
    </script>
  `;
  const dyInfo = extractDouyinVideoInfoFromHtml(mockDouyinHtml);
  assert.equal(dyInfo.title, '精彩剧情剪辑');
  assert.equal(dyInfo.durationSec, 20);
  assert.ok(dyInfo.videoUrls.length >= 2);
  assert.ok(dyInfo.videoUrls[0].includes('/aweme/v1/play/?video_id=v0300fg10000douyinclean99'));
  assert.equal(
    dyInfo.videoUrls.some((u) => u.includes('/playwm/')),
    false
  );
});

test('Copyright Settings Timed Blur & Timed Text helpers enforce exact time windows on a 4:00 video and sanitize FFmpeg/ASS outputs', () => {
  // 4:00 (240s) video with first 10 seconds timed blur
  const introBlur = createDefaultTimedBlur(240, 0, 0);
  assert.equal(introBlur.startSec, 0);
  assert.equal(introBlur.endSec, 10);
  assert.equal(isTimedOverlayActiveAtTime(introBlur, 0), true);
  assert.equal(isTimedOverlayActiveAtTime(introBlur, 5.2), true);
  assert.equal(isTimedOverlayActiveAtTime(introBlur, 10), true);
  assert.equal(isTimedOverlayActiveAtTime(introBlur, 10.5), false);
  assert.equal(isTimedOverlayActiveAtTime(introBlur, 235), false);

  // Short 6s video clamps default 10s span down to 6s
  const shortText = createDefaultTimedText(6, 0, 0);
  assert.equal(shortText.startSec, 0);
  assert.equal(shortText.endSec, 6);

  // Range clamping handles reversed/overflowing inputs cleanly
  assert.deepEqual(clampTimedOverlayRange(-5, 999, 240), { startSec: 0, endSec: 240 });
  assert.deepEqual(clampTimedOverlayRange(30, 20, 240), { startSec: 30, endSec: 30.5 });

  // Timecode parser & formatter
  assert.equal(parseTimecodeToSeconds('0:10', 240), 10);
  assert.equal(parseTimecodeToSeconds('1:30', 240), 90);
  assert.equal(parseTimecodeToSeconds('4:00', 240), 240);
  assert.equal(parseTimecodeToSeconds('12.5', 240), 12.5);
  assert.equal(parseTimecodeToSeconds('bad', 240), null);
  assert.equal(formatTimedOverlaySec(0), '0:00');
  assert.equal(formatTimedOverlaySec(10), '0:10');
  assert.equal(formatTimedOverlaySec(240), '4:00');

  // FFmpeg enable expression & ASS Burmese text sanitization
  assert.equal(buildTimedBlurEnableExpr(0, 10), 'between(t,0.00,10.00)');
  assert.equal(buildTimedBlurEnableExpr(15.5, 42.25), 'between(t,15.50,42.25)');
  assert.equal(
    sanitizeTimedTextForAss('{\\pos(0,0)}အပိုင်း (၁)\nမြန်မာစာတန်းထိုး'),
    '\\pos(0,0)အပိုင်း (၁)\\Nမြန်မာစာတန်းထိုး'
  );
});

test('10 Color Shift presets enforce 1 Free preset (vivid) and 9 Credit-Only presets, plus Credit-Only Timed Overlays & direct 0:11 entry', () => {
  // Exactly 10 unique presets
  assert.equal(COLOR_SHIFT_PRESETS.length, 10);
  const uniqueIds = new Set(COLOR_SHIFT_PRESETS.map((p) => p.id));
  assert.equal(uniqueIds.size, 10);

  // Strictly 1 preset allowed in Free Mode (vivid), 9 Credit Mode Only
  const freePresets = COLOR_SHIFT_PRESETS.filter((p) => p.freeAllowed);
  const creditOnlyPresets = COLOR_SHIFT_PRESETS.filter((p) => !p.freeAllowed);
  assert.equal(freePresets.length, 1);
  assert.equal(freePresets[0].id, 'vivid');
  assert.equal(creditOnlyPresets.length, 9);

  // Every preset has non-empty CSS filter, safe FFmpeg filter, and swatch gradient
  for (const preset of COLOR_SHIFT_PRESETS) {
    assert.ok(preset.cssFilter.length > 5, `Preset ${preset.id} missing cssFilter`);
    assert.ok(preset.ffmpegFilter.length > 5, `Preset ${preset.id} missing ffmpegFilter`);
    assert.ok(preset.swatchGradient.includes('gradient'), `Preset ${preset.id} missing swatchGradient`);
    // Free Mode always forces 'vivid'
    assert.equal(resolveAllowedColorShiftPresetId(preset.id, true), 'vivid');
    // Credit Mode unlocks every preset
    assert.equal(resolveAllowedColorShiftPresetId(preset.id, false), preset.id);
  }

  // Unknown or untrusted filter string falls back safely to vivid allowlist entry
  assert.equal(resolveAllowedColorShiftPresetId('invalid;rm -rf /', false), 'vivid');
  assert.equal(resolveColorShiftPreset('bw_classic', false).ffmpegFilter, 'hue=s=0,eq=contrast=1.18:brightness=0.01');
  assert.equal(resolveColorShiftPreset('bw_classic', true).id, 'vivid');

  // Timed Blur & Timed Add Text are strictly Credit Mode Only
  assert.equal(isTimedOverlayFeatureAllowed(true), false);
  assert.equal(isTimedOverlayFeatureAllowed(false), true);

  // Direct MM:SS typing helper commits complete 0:11 immediately without prematurely snapping on 0:1
  assert.equal(isCompleteTimecodeInput('0:11'), true);
  assert.equal(isCompleteTimecodeInput('1:05'), true);
  assert.equal(isCompleteTimecodeInput('0:1'), false);
  assert.equal(isCompleteTimecodeInput('0:'), false);
  assert.equal(isCompleteTimecodeInput('0:65'), false);
  assert.equal(parseTimecodeToSeconds('0:11', 240), 11);
});

test('Translate Captions-Only Burmese punctuation converts ၊ and Myanmar-adjacent commas to ... while preserving numbers', () => {
  assert.equal(formatBurmeseCaptionsOnlyPunctuation('မင်း၊ဘာဖြစ်တယ်'), 'မင်း...ဘာဖြစ်တယ်');
  assert.equal(formatBurmeseCaptionsOnlyPunctuation('ငါ၊က'), 'ငါ...က');
  assert.equal(formatBurmeseCaptionsOnlyPunctuation('၊ဒါ'), '...ဒါ');
  assert.equal(formatBurmeseCaptionsOnlyPunctuation('ဟုတ်တယ်၊ ငါသွားမယ်'), 'ဟုတ်တယ်...ငါသွားမယ်');
  assert.equal(formatBurmeseCaptionsOnlyPunctuation('မင်း, ဘာဖြစ်တယ်'), 'မင်း...ဘာဖြစ်တယ်');
  assert.equal(formatBurmeseCaptionsOnlyPunctuation('ငါ，မသိဘူး'), 'ငါ...မသိဘူး');
  assert.equal(formatBurmeseCaptionsOnlyPunctuation('ကျပ် 1,000 ပေးမယ်'), 'ကျပ် 1,000 ပေးမယ်');
  assert.equal(formatBurmeseCaptionsOnlyPunctuation('မင်း....ဘာလဲ'), 'မင်း...ဘာလဲ');

  const cues = [
    { id: 'c1', start_ms: 0, end_ms: 1500, text: 'မင်း၊ဘာဖြစ်တယ်', burmeseText: 'မင်း၊ဘာဖြစ်တယ်' },
    { id: 'c2', start_ms: 1600, end_ms: 3000, text: 'ငါ၊က 1,000 ပေးခဲ့တယ်' }
  ];
  const formatted = applyBurmeseCaptionsOnlyPunctuation(cues, 'my');
  assert.equal(formatted[0].text, 'မင်း...ဘာဖြစ်တယ်');
  assert.equal(formatted[0].burmeseText, 'မင်း...ဘာဖြစ်တယ်');
  assert.equal(formatted[1].text, 'ငါ...က 1,000 ပေးခဲ့တယ်');

  // Non-Burmese captions remain untouched
  const enCues = [{ id: 'e1', start_ms: 0, end_ms: 1500, text: 'Wait, what happened?' }];
  assert.equal(applyBurmeseCaptionsOnlyPunctuation(enCues, 'en')[0].text, 'Wait, what happened?');

  // Captions-Only Burmese system prompt explicitly instructs using "..." instead of "၊"
  const capPrompt = buildCinematicTranslateSystemPrompt({
    targetLanguage: 'my',
    translateAudio: 'captions-only'
  });
  assert.ok(capPrompt.includes('...'));
  assert.ok(capPrompt.includes('၊'));
  assert.ok(capPrompt.includes('10 မိနစ်ကြာပြီးသောအခါ'));
});

test('Subtitle Language Free Mode allows ONLY Burmese (my) and locks English/Thai/Japanese/Korean/Chinese to Credit Mode', () => {
  assert.equal(isSubtitleLanguageAllowedInMode('my', true), true);
  for (const lockedLang of ['en', 'th', 'ja', 'ko', 'zh'] as const) {
    assert.equal(isSubtitleLanguageAllowedInMode(lockedLang, true), false);
    assert.equal(resolveAllowedSubtitleLanguage(lockedLang, true), 'my');
    // All languages unlocked in Credit Mode
    assert.equal(isSubtitleLanguageAllowedInMode(lockedLang, false), true);
    assert.equal(resolveAllowedSubtitleLanguage(lockedLang, false), lockedLang);
  }
  assert.equal(resolveAllowedSubtitleLanguage('my', false), 'my');
});

test('Myanmar Font catalog includes new artistic Unicode fonts with strictly 1 Free font and all others Credit Mode Only', () => {
  assert.ok(BURMESE_FONT_STYLES.length >= 18, `Expected >= 18 Myanmar fonts, got ${BURMESE_FONT_STYLES.length}`);
  const uniqueIds = new Set(BURMESE_FONT_STYLES.map((f) => f.id));
  assert.equal(uniqueIds.size, BURMESE_FONT_STYLES.length);

  const freeFonts = BURMESE_FONT_STYLES.filter((f) => f.freeAllowed);
  const creditFonts = BURMESE_FONT_STYLES.filter((f) => !f.freeAllowed);
  assert.equal(freeFonts.length, 1);
  assert.equal(freeFonts[0].id, FREE_BURMESE_FONT_ID);
  assert.equal(creditFonts.length, BURMESE_FONT_STYLES.length - 1);

  for (const font of BURMESE_FONT_STYLES) {
    assert.ok(font.cssFontFamily.length > 0);
    assert.ok(font.assFontName.length > 0);
    if (font.freeAllowed) {
      assert.equal(isBurmeseFontAllowedInMode(font.id, true), true);
      assert.equal(resolveAllowedBurmeseFontStyle(font.id, true), font.id);
    } else {
      assert.equal(isBurmeseFontAllowedInMode(font.id, true), false);
      assert.equal(resolveAllowedBurmeseFontStyle(font.id, true), FREE_BURMESE_FONT_ID);
    }
    // Every font unlocked in Credit Mode
    assert.equal(isBurmeseFontAllowedInMode(font.id, false), true);
    assert.equal(resolveAllowedBurmeseFontStyle(font.id, false), font.id);
  }
});

test('Translate Captions-Only anti-hallucination strips time-skip/recap filler and parses FFmpeg silence intervals accurately', () => {
  const mixedCues = [
    { id: 'c1', start_ms: 500, end_ms: 2100, text: 'မင်း ဘယ်သွားမလို့လဲ' },
    { id: 'c2', start_ms: 2500, end_ms: 4200, text: '10 မိနစ်ကြာပြီးသောအခါ' },
    { id: 'c3', start_ms: 4400, end_ms: 5900, text: '၁၀ မီနစ်ကြာပြီးသောအခါ...' },
    { id: 'c4', start_ms: 6100, end_ms: 7500, text: '10 minutes later' },
    { id: 'c5', start_ms: 7800, end_ms: 9100, text: 'အဲဒီအချိန်မှာပဲ' },
    { id: 'c6', start_ms: 9400, end_ms: 11200, text: 'ငါ...အခုပဲ ပြန်လာမယ်' }
  ];
  const cleaned = sanitizeCaptionsOnlyDialogueCues(mixedCues);
  assert.equal(cleaned.length, 2);
  assert.equal(cleaned[0].text, 'မင်း ဘယ်သွားမလို့လဲ');
  assert.equal(cleaned[1].text, 'ငါ...အခုပဲ ပြန်လာမယ်');

  const ffmpegStderr = `
[silencedetect @ 0x1] silence_start: 0
[silencedetect @ 0x1] silence_end: 1.25 | silence_duration: 1.25
[silencedetect @ 0x1] silence_start: 4.80
[silencedetect @ 0x1] silence_end: 6.40 | silence_duration: 1.60
[silencedetect @ 0x1] silence_start: 11.10
`;
  const intervals = parseFfmpegSilenceDetectToSpeechIntervals(ffmpegStderr, 15);
  assert.deepEqual(intervals, [
    { startMs: 1250, endMs: 4800 },
    { startMs: 6400, endMs: 11100 }
  ]);
  const guide = formatSpeechIntervalsGuide(intervals);
  assert.ok(guide.includes('[00:01.25 - 00:04.80]'));
  assert.ok(guide.includes('6400ms - 11100ms'));
});

import {
  hasForeignScriptLeakage,
  findForeignScriptLeakedCueIndices,
  splitWhisperSegmentsIntoUtterances,
  tightenCaptionsOnlyCuePauses
} from './recapEngine.ts';

test('Mixed-language Burmese+Chinese leakage detection catches half-translated Gemini subtitles while accepting pure Burmese', () => {
  // Exact screenshot bugs reported by user:
  assert.equal(doesTextMatchSubtitleLanguage('အိုက်ယား...到家了宝宝...下车', 'my'), false);
  assert.equal(doesTextMatchSubtitleLanguage('အိုက်ယား...这怎么抱嘛...你看你下临了', 'my'), false);
  assert.equal(hasForeignScriptLeakage('အိုက်ယား...到家了宝宝...下车', 'my'), true);
  assert.equal(hasForeignScriptLeakage('အိုက်ယား...အိမ်ရောက်ပြီ ဘေဘီ...ကားပေါ်ကဆင်းတော့', 'my'), false);
  assert.equal(doesTextMatchSubtitleLanguage('အိုက်ယား...အိမ်ရောက်ပြီ ဘေဘီ...ကားပေါ်ကဆင်းတော့', 'my'), true);

  const cues = [
    { id: 'c1', start_ms: 1000, end_ms: 2800, text: 'အိမ်ရောက်ပြီ ဘေဘီ...ကားပေါ်ကဆင်းတော့' },
    { id: 'c2', start_ms: 3200, end_ms: 5400, text: 'အိုက်ယား...到家了宝宝...下车' },
    { id: 'c3', start_ms: 6000, end_ms: 8200, text: 'မင်း မြန်မြန်ဆင်းလာတော့လေ' },
    { id: 'c4', start_ms: 8500, end_ms: 10500, text: 'အိုက်ယား...这怎么抱嘛...你看你下临了' }
  ];
  assert.deepEqual(findForeignScriptLeakedCueIndices(cues, 'my'), [1, 3]);
  assert.equal(needsSubtitleTranslation(cues, 'my'), true);

  // Prompt explicitly enforces 100% pure Burmese with zero mixed Chinese characters
  const prompt = buildCinematicTranslateSystemPrompt({
    targetLanguage: 'my',
    translateAudio: 'captions-only'
  });
  assert.ok(prompt.includes('100% PURE BURMESE ONLY'));
});

test('splitWhisperSegmentsIntoUtterances breaks chained Whisper segments into crisp utterance-by-utterance turns with clear gaps', () => {
  // 1) Word-level timestamps with spoken pause >= 0.30s between two utterances
  const words = [
    { word: '哎呀', start: 1.0, end: 1.3 },
    { word: '到家了', start: 1.32, end: 1.75 },
    { word: '宝宝下车', start: 1.78, end: 2.35 },
    // 0.65s spoken pause here -> must split into a brand-new utterance!
    { word: '你快点', start: 3.0, end: 3.45 },
    { word: '下来了', start: 3.48, end: 3.95 }
  ];
  const fromWords = splitWhisperSegmentsIntoUtterances([], words);
  assert.equal(fromWords.length, 2);
  assert.equal(fromWords[0].text, '哎呀到家了宝宝下车');
  assert.equal(fromWords[1].text, '你快点下来了');
  assert.ok(
    fromWords[1].start - fromWords[0].end >= 0.1,
    `Expected >= 0.10s clear gap between utterances, got ${fromWords[1].start - fromWords[0].end}s`
  );

  // English word-level tokens still preserve word spaces while splitting on pauses
  const enWords = splitWhisperSegmentsIntoUtterances([], [
    { word: 'Wait', start: 0.5, end: 0.8 },
    { word: 'here.', start: 0.85, end: 1.2 },
    { word: 'Come', start: 1.7, end: 1.95 },
    { word: 'now', start: 2.0, end: 2.3 }
  ]);
  assert.equal(enWords.length, 2);
  assert.equal(enWords[0].text, 'Wait here.');
  assert.equal(enWords[1].text, 'Come now');

  // 2) Fallback segment-only input with two chained sentences in one Whisper block
  const chainedSegs = [
    { start: 10.0, end: 16.0, text: '哎呀到家了宝宝下车。你快点下来了我！' }
  ];
  const fromSegs = splitWhisperSegmentsIntoUtterances(chainedSegs);
  assert.equal(fromSegs.length, 2);
  assert.ok(fromSegs[1].start - fromSegs[0].end >= 0.1);
});

test('tightenCaptionsOnlyCuePauses trims trailing silence bloat and guarantees crisp clear-screen gaps between consecutive Whisper subtitles', () => {
  // Chained back-to-back Whisper cues (end === next.start) + trailing silence bloat on cue 2
  const stuckWhisperCues = [
    { id: 'w1', start_ms: 1000, end_ms: 4000, text: 'အိမ်ရောက်ပြီ ဘေဘီ' },
    { id: 'w2', start_ms: 4000, end_ms: 9500, text: 'ကားပေါ်က မြန်မြန်ဆင်းတော့' },
    { id: 'w3', start_ms: 9500, end_ms: 11200, text: 'အင်းပါ လာပြီ' }
  ];
  const speechIntervals = [
    { startMs: 1000, endMs: 2600 },
    { startMs: 4000, endMs: 5800 },
    { startMs: 9500, endMs: 10900 }
  ];

  const tightened = tightenCaptionsOnlyCuePauses(stuckWhisperCues, speechIntervals, 15);
  assert.equal(tightened.length, 3);
  // Cue 1 should trim down near speech end (2600 + 120 = 2720ms) instead of lingering to 4000ms
  assert.ok(tightened[0].end_ms <= 2800, `Expected cue 1 end <= 2800ms, got ${tightened[0].end_ms}`);
  // Cue 2 should trim down near speech end (5800 + 120 = 5920ms) instead of lingering to 9500ms!
  assert.ok(tightened[1].end_ms <= 6100, `Expected cue 2 end <= 6100ms, got ${tightened[1].end_ms}`);

  // Even without speech intervals, consecutive glued cues get a crisp >= 100ms clear gap
  const tightenedNoIntervals = tightenCaptionsOnlyCuePauses(
    [
      { id: 'a1', start_ms: 1000, end_ms: 2500, text: 'ဟယ်လို' },
      { id: 'a2', start_ms: 2500, end_ms: 4000, text: 'ဘာဖြစ်လို့လဲ' }
    ],
    [],
    10
  );
  assert.ok(
    tightenedNoIntervals[1].start_ms - tightenedNoIntervals[0].end_ms >= 100,
    `Expected >= 100ms visual clear gap, got ${tightenedNoIntervals[1].start_ms - tightenedNoIntervals[0].end_ms}ms`
  );
});



