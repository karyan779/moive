import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toMyanmarNumeral,
  formatPartBadgeLabel,
  stripPartSuffixFromTitle,
  formatSeriesTitleWithPart,
  wrapBurmeseHeadlineLines,
  balancePosterHeadlineLines,
  extractLocalFallbackTitles,
  buildThumbnailImagePromptTemplate,
  buildGeminiAppQuickPrompt,
  buildCleanPosterArtworkPrompt,
  buildSceneTransformPosterPrompt,
  selectBestFramesByIndices,
  normalizeDirectorAnalysisResult,
  buildThumbnailCandidates,
  buildPart2ContinuationCandidates,
  resolveThumbnailDimensions,
  resolveThumbnailFontOption,
  resolveThumbnailColorPreset,
  THUMBNAIL_FONT_OPTIONS,
  THUMBNAIL_COLOR_PRESETS,
  POSTER_THEME_SPECS,
  type SavedSeriesPreset
} from './thumbnailStudio';

test('toMyanmarNumeral and formatPartBadgeLabel format Part 1 and Part 2 accurately', () => {
  assert.equal(toMyanmarNumeral(1), '၁');
  assert.equal(toMyanmarNumeral(2), '၂');
  assert.equal(toMyanmarNumeral(12), '၁၂');
  assert.equal(formatPartBadgeLabel(1), 'အပိုင်း (၁)');
  assert.equal(formatPartBadgeLabel(2), 'အပိုင်း (၂)');
  assert.equal(formatPartBadgeLabel(null), '');
});

test('stripPartSuffixFromTitle and formatSeriesTitleWithPart cleanly transition Part 1 to Part 2', () => {
  assert.equal(
    stripPartSuffixFromTitle('မြွေစကားနားလည်တဲ့ကောင်လေး — အပိုင်း (၁)'),
    'မြွေစကားနားလည်တဲ့ကောင်လေး'
  );
  assert.equal(stripPartSuffixFromTitle('Shadow Hero Part 1'), 'Shadow Hero');
  assert.equal(
    formatSeriesTitleWithPart('မြွေစကားနားလည်တဲ့ကောင်လေး — အပိုင်း (၁)', 2),
    'မြွေစကားနားလည်တဲ့ကောင်လေး — အပိုင်း (၂)'
  );
  assert.equal(
    formatSeriesTitleWithPart('မြွေစကားနားလည်တဲ့ကောင်လေး', null),
    'မြွေစကားနားလည်တဲ့ကောင်လေး'
  );
});

test('wrapBurmeseHeadlineLines and balancePosterHeadlineLines create symmetrical poster lockups without splitting marks', () => {
  const headline = 'မထင်မှတ်ထားတဲ့ ဇာတ်သိမ်းပိုင်းမှာ အားလုံးအံ့ဩသွားရတဲ့အဖြစ်';
  const lines = wrapBurmeseHeadlineLines(headline, 18, 3);
  assert.ok(lines.length >= 2 && lines.length <= 3);
  for (const line of lines) {
    const firstCp = line.codePointAt(0) || 0;
    assert.ok(
      !(firstCp >= 0x102b && firstCp <= 0x103f),
      `Line started with orphan combining mark: "${line}"`
    );
  }

  const balanced = balancePosterHeadlineLines('ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ', false);
  assert.deepEqual(balanced, ['ကျောကုန်းပေါ်က', 'သွေးစာလုံး ကျိန်စာ']);

  const mmPrompt = buildGeminiAppQuickPrompt({
    selectedTitle: 'ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ',
    partNumber: 1,
    aspectRatio: '9:16'
  });
  assert.ok(mmPrompt.includes('ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ'));
  assert.ok(mmPrompt.includes('အပိုင်း (၁)'));
  assert.ok(mmPrompt.includes('9:16'));
});

test('extractLocalFallbackTitles derives video-matched titles from cues and script without slicing mid-syllable', () => {
  const titles = extractLocalFallbackTitles({
    rawTitle: 'SaveTik.co_7673413291896605967.mp4',
    cues: [
      { text: 'မထင်မှတ်ထားတဲ့ လျှို့ဝှက်အခန်းထဲက ဇာတ်လမ်းအစ' },
      { text: 'သတို့သမီးရဲ့ လက်ထပ်ပွဲကို ဖျက်ဆီးဖို့ ကြိုးစားချိန်' },
      { text: 'နောက်ဆုံးမှာ အမှန်တရား ပေါ်ထွက်သွားပါတယ်' }
    ]
  });
  assert.ok(titles.length >= 3);
  assert.equal(titles[0], 'မထင်မှတ်ထားတဲ့ လျှို့ဝှက်အခန်းထဲက ဇာတ်လမ်းအစ');
});

test('buildThumbnailImagePromptTemplate and normalizeDirectorAnalysisResult follow exact movie poster director spec', () => {
  const prompt = buildThumbnailImagePromptTemplate({
    sceneDescriptionEn: 'a scarred man in a dim hallway with glowing crimson runes on his back',
    selectedTitle: 'ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ',
    partNumber: 1,
    aspectRatio: '9:16'
  });
  assert.ok(prompt.startsWith('Flat front-facing full-bleed ultra-photorealistic 8K live-action cinematic movie recap poster photograph for a vertical 9:16 video thumbnail'));
  assert.ok(prompt.includes("reading 'ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ'"));
  assert.ok(prompt.includes("a sleek red badge with the text 'အပိုင်း (၁)'"));
  assert.ok(prompt.includes('NO cartoon, NO anime, NO illustration'));
  assert.ok(prompt.includes('Do not add any other words, Chinese/English text, watermarks, or borders.'));

  const cleanArtPrompt = buildCleanPosterArtworkPrompt({
    sceneDescriptionEn: 'two rivals standing inside a dimly lit hallway with tense expressions',
    aspectRatio: '9:16',
    styleVariant: 'dark_mystery'
  });
  assert.ok(cleanArtPrompt.includes('Ultra-photorealistic 8K live-action'));
  assert.ok(cleanArtPrompt.includes('NO cartoon, NO anime'));
  assert.ok(cleanArtPrompt.includes('NO text, NO letters'));

  const normalized = normalizeDirectorAnalysisResult({
    raw: {
      original_title: '《怨尸》 (Yuàn Shī)',
      detected_genre_burmese: 'သရဲ / ကျိန်စာ',
      best_frame_indices: [1, 3, 5, 3],
      summary_burmese: 'ပထမစာကြောင်း။ ဒုတိယစာကြောင်း။',
      suggested_titles: ['ခေါင်းစဉ် ၁', 'ခေါင်းစဉ် ၂', 'ခေါင်းစဉ် ၃', 'ခေါင်းစဉ် ၄', 'ခေါင်းစဉ် ၅'],
      selected_title: 'ခေါင်းစဉ် ၁',
      scene_descriptions_en: ['scene 1', 'scene 2', 'scene 3']
    },
    partNumber: 2,
    aspectRatio: '9:16'
  });
  assert.equal(normalized.suggested_titles.length, 5);
  assert.equal(normalized.original_title, '《怨尸》 (Yuàn Shī)');
  assert.equal(normalized.detected_genre_burmese, 'သရဲ / ကျိန်စာ');
  assert.deepEqual(normalized.best_frame_indices, [1, 3, 5]);
  assert.ok(normalized.thumbnail_image_prompt.includes("reading 'ခေါင်းစဉ် ၁'"));
  assert.ok(normalized.thumbnail_image_prompt.includes("'အပိုင်း (၂)'"));
});

test('buildSceneTransformPosterPrompt preserves real video character & selectBestFramesByIndices picks AI hero scenes', () => {
  const cleanTransform = buildSceneTransformPosterPrompt({
    sceneDescriptionEn: 'man seen from behind in dark corridor with cracked veins and glowing red characters on his back',
    aspectRatio: '9:16',
    styleVariant: 'crimson_corridor',
    directPromptWithText: false
  });
  assert.ok(cleanTransform.includes('attached real live-action video frame as the exact character and scene reference'));
  assert.ok(cleanTransform.includes('do NOT replace them with a different person'));
  assert.ok(cleanTransform.includes('NO cartoon, NO anime'));
  assert.ok(cleanTransform.includes('Strictly NO added text'));

  const directTextTransform = buildSceneTransformPosterPrompt({
    sceneDescriptionEn: 'man seen from behind in dark corridor with cracked veins',
    aspectRatio: '9:16',
    directPromptWithText: true,
    selectedTitle: 'ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ',
    partNumber: 1
  });
  assert.ok(directTextTransform.includes("reading 'ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ'"));
  assert.ok(directTextTransform.includes("reading 'အပိုင်း (၁)'"));

  const sixFrames = [0, 1, 2, 3, 4, 5].map((i) => ({
    id: `f-${i}`,
    label: `Frame ${i}`,
    timeSec: i * 10,
    dataUrl: `data:image/jpeg;base64,FRAME_${i}`
  }));
  const picked = selectBestFramesByIndices(sixFrames, [2, 5, 1]);
  assert.equal(picked.length, 3);
  assert.equal(picked[0].id, 'f-2');
  assert.equal(picked[1].id, 'f-5');
  assert.equal(picked[2].id, 'f-1');
});

test('buildPart2ContinuationCandidates preserves Part 1 poster + Title and auto-applies Part 2 across 3 thumbnails', () => {
  const part1Preset: SavedSeriesPreset = {
    id: 'series_1',
    baseTitle: 'မြွေစကားနားလည်တဲ့ကောင်လေး',
    partNumber: 1,
    layoutId: 'poster_gold_3d',
    frameDataUrl: 'data:image/jpeg;base64,PART1_SAVED_IMAGE',
    aspectRatio: '9:16',
    savedAt: Date.now()
  };

  const part2Result = buildPart2ContinuationCandidates({
    preset: part1Preset,
    currentVideoFrames: [
      { id: 'f1', label: 'Opening', timeSec: 4, dataUrl: 'data:image/jpeg;base64,P2_FRAME_1' },
      { id: 'f2', label: 'Middle', timeSec: 22, dataUrl: 'data:image/jpeg;base64,P2_FRAME_2' },
      { id: 'f3', label: 'Climax', timeSec: 48, dataUrl: 'data:image/jpeg;base64,P2_FRAME_3' }
    ],
    targetPartNumber: 2
  });

  assert.equal(part2Result.baseTitle, 'မြွေစကားနားလည်တဲ့ကောင်လေး');
  assert.equal(part2Result.partNumber, 2);
  assert.equal(part2Result.candidates.length, 3);
  assert.equal(part2Result.candidates[0].frameDataUrl, 'data:image/jpeg;base64,PART1_SAVED_IMAGE');
  assert.equal(part2Result.candidates[0].isReusedPart1Image, true);
  assert.equal(part2Result.candidates[0].layoutId, 'poster_gold_3d');
  assert.equal(part2Result.candidates[1].frameDataUrl, 'data:image/jpeg;base64,P2_FRAME_2');
  assert.equal(part2Result.candidates[2].frameDataUrl, 'data:image/jpeg;base64,P2_FRAME_3');

  const normalThree = buildThumbnailCandidates({
    frames: [
      { id: 'f1', label: 'Opening', timeSec: 3, dataUrl: 'data:image/jpeg;base64,F1' },
      { id: 'f2', label: 'Middle', timeSec: 15, dataUrl: 'data:image/jpeg;base64,F2' },
      { id: 'f3', label: 'Climax', timeSec: 28, dataUrl: 'data:image/jpeg;base64,F3' }
    ],
    partNumber: 1
  });
  assert.equal(normalThree.length, 3);
  assert.equal(normalThree[0].layoutId, 'poster_gold_3d');
  assert.equal(normalThree[1].layoutId, 'cinema_hook');
  assert.equal(normalThree[2].layoutId, 'viral_split');
});

test('resolveThumbnailDimensions maps aspect ratios and POSTER_THEME_SPECS defines all 3 poster styles', () => {
  assert.deepEqual(resolveThumbnailDimensions('9:16'), { width: 1080, height: 1920, cssAspect: '9 / 16' });
  assert.deepEqual(resolveThumbnailDimensions('16:9'), { width: 1280, height: 720, cssAspect: '16 / 9' });
  assert.deepEqual(resolveThumbnailDimensions('1:1'), { width: 1080, height: 1080, cssAspect: '1 / 1' });

  (['poster_gold_3d', 'cinema_hook', 'viral_split', 'dramatic_spotlight'] as const).forEach((id) => {
    const spec = POSTER_THEME_SPECS[id];
    assert.equal(spec.badgeStyle, 'crimson_gold_ribbon');
    assert.equal(spec.gradientStops.length, 4);
    assert.ok(spec.glowColor.length > 0);
  });
});

test('THUMBNAIL_FONT_OPTIONS (4 fonts) and THUMBNAIL_COLOR_PRESETS (6 3D colors) resolve cleanly and persist into Part 2', () => {
  assert.equal(THUMBNAIL_FONT_OPTIONS.length, 4);
  assert.equal(THUMBNAIL_COLOR_PRESETS.length, 6);

  assert.equal(resolveThumbnailFontOption('noto_serif').id, 'noto_serif');
  assert.equal(resolveThumbnailFontOption('unknown_font').id, 'noto_sans');
  assert.equal(resolveThumbnailColorPreset('electric_cyan').id, 'electric_cyan');
  assert.equal(resolveThumbnailColorPreset('unknown_color').id, 'molten_gold');

  for (const preset of THUMBNAIL_COLOR_PRESETS) {
    assert.equal(preset.gradientStops.length, 4);
    assert.ok(preset.swatchCss.includes('linear-gradient'));
    assert.ok(preset.outlineColor.startsWith('#'));
  }

  const savedPart1: SavedSeriesPreset = {
    id: 'series_styled',
    baseTitle: 'ကျောကုန်းပေါ်က သွေးစာလုံး ကျိန်စာ',
    partNumber: 1,
    layoutId: 'poster_gold_3d',
    titleFontId: 'noto_serif',
    titleColorId: 'inferno_crimson',
    frameDataUrl: 'data:image/jpeg;base64,PART1_IMG',
    aspectRatio: '9:16',
    savedAt: Date.now()
  };

  const part2 = buildPart2ContinuationCandidates({
    preset: savedPart1,
    currentVideoFrames: [
      { id: 'f1', label: 'Hero', timeSec: 5, dataUrl: 'data:image/jpeg;base64,F1' }
    ]
  });
  assert.equal(part2.titleFontId, 'noto_serif');
  assert.equal(part2.titleColorId, 'inferno_crimson');
});
