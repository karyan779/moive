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
  calculateCreditCost,
  buildSyncedRecapCues,
  splitCuesIntoShortPhrases,
  getVoicePreviewSampleText,
  alignCuesWithAudioSync,
  SCRIPT_STYLE_PROMPTS,
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
  sanitizeMp4DownloadName
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

test('calculateCreditCost computes flat 1 credit per 60 seconds across all AI voices, and 0 for free recap', () => {
  assert.equal(FREE_DAILY_VIDEO_LIMIT, 3);
  assert.equal(FREE_MAX_DURATION_SEC, 150);

  assert.equal(calculateCreditCost(45, true), 0);
  assert.equal(calculateCreditCost(45, false), 1);
  assert.equal(calculateCreditCost(125, false), 3);

  // Flat 1 credit per minute across all AI voices
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
  assert.ok(SCRIPT_STYLE_PROMPTS.narrator.systemPrompt.includes('SHORT 1-LINE PHRASES'));

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

  // Verify 3-Method Audio & Video Sync (Timestamp-anchored + 80-120ms Breath Pause + Bidirectional Dynamic Tempo Fit + Max Gap Clamp)
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

  // Verify mid-video gap clamping & gentle bidirectional tempo relaxation when cues are sparse
  const sparseCues = [
    { id: 's1', start_ms: 100, end_ms: 3000, text: 'အဖွင့် စာကြောင်း' },
    { id: 's2', start_ms: 7500, end_ms: 11500, text: 'အလယ် စာကြောင်း' },
    { id: 's3', start_ms: 15000, end_ms: 18000, text: 'အပိတ် စာကြောင်း' }
  ];
  const continuousSchedule = alignCuesWithAudioSync(sparseCues, [2200, 2400, 2100], 100, true, 18000, 360);
  assert.equal(continuousSchedule.length, 3);
  assert.ok(continuousSchedule[0].tempoFactor >= 0.86 && continuousSchedule[0].tempoFactor < 1.0);
  assert.ok(continuousSchedule[1].cue.start_ms - continuousSchedule[0].cue.end_ms <= 360);
  assert.ok(continuousSchedule[2].cue.start_ms - continuousSchedule[1].cue.end_ms <= 360);

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
  assert.equal(BURMESE_FONT_STYLES.length, 8);
  const validUnicodeFamilies = new Set([
    'Padauk',
    'Pyidaungsu',
    'Noto Serif Myanmar',
    'Noto Sans Myanmar',
    'TharLon'
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

  // Free Mode must NEVER invoke Cloudflare Workers AI
  assert.deepEqual(resolveSttStrategyForMode(true, true, true), ['user_groq']);
  assert.deepEqual(resolveSttStrategyForMode(true, false, true), ['groq_pool']);

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




