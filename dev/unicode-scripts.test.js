// Unit tests for unicode-scripts.js core detection logic.
// Run with: npm test

const {
  getCharScript,
  getPermittedScripts,
  isHostnameAllowed,
  decodeHostname,
  getConfusableChars,
  isSingleLocaleScriptMix,
  getEnabledLangScriptSets,
} = require('../extension/unicode-scripts.js');

// ---------------------------------------------------------------------------
// getCharScript
// ---------------------------------------------------------------------------
describe('getCharScript', () => {
  test('Latin letters return Latin', () => {
    expect(getCharScript('a')).toBe('Latin');
    expect(getCharScript('z')).toBe('Latin');
    expect(getCharScript('A')).toBe('Latin');
  });

  test('Cyrillic letters return Cyrillic', () => {
    expect(getCharScript('а')).toBe('Cyrillic'); // U+0430
    expect(getCharScript('р')).toBe('Cyrillic'); // U+0440
  });

  test('Greek letters return Greek', () => {
    expect(getCharScript('ο')).toBe('Greek'); // U+03BF omicron
    expect(getCharScript('α')).toBe('Greek');
  });

  test('Han characters return Han', () => {
    expect(getCharScript('中')).toBe('Han');
  });

  test('Hiragana returns Hiragana', () => {
    expect(getCharScript('あ')).toBe('Hiragana');
  });

  test('digits and hyphens return Common', () => {
    expect(getCharScript('1')).toBe('Common');
    expect(getCharScript('-')).toBe('Common');
  });

  test('RTL/LTR override characters return Unknown (not Common)', () => {
    expect(getCharScript('‮')).toBe('Unknown'); // RIGHT-TO-LEFT OVERRIDE
    expect(getCharScript('‪')).toBe('Unknown'); // LEFT-TO-RIGHT EMBEDDING
    expect(getCharScript('‫')).toBe('Unknown'); // RIGHT-TO-LEFT EMBEDDING
    expect(getCharScript('⁦')).toBe('Unknown'); // LEFT-TO-RIGHT ISOLATE
    expect(getCharScript('⁩')).toBe('Unknown'); // POP DIRECTIONAL ISOLATE
  });
});

// ---------------------------------------------------------------------------
// getPermittedScripts
// ---------------------------------------------------------------------------
describe('getPermittedScripts', () => {
  test('always includes Latin, Common, Inherited', () => {
    const scripts = getPermittedScripts(['en']);
    expect(scripts.has('Latin')).toBe(true);
    expect(scripts.has('Common')).toBe(true);
    expect(scripts.has('Inherited')).toBe(true);
  });

  test('English locale adds no extra scripts', () => {
    const scripts = getPermittedScripts(['en']);
    expect(scripts.has('Cyrillic')).toBe(false);
    expect(scripts.has('Greek')).toBe(false);
  });

  test('Russian locale adds Cyrillic', () => {
    const scripts = getPermittedScripts(['ru']);
    expect(scripts.has('Cyrillic')).toBe(true);
  });

  test('Japanese locale adds Hiragana, Katakana, Han', () => {
    const scripts = getPermittedScripts(['ja']);
    expect(scripts.has('Hiragana')).toBe(true);
    expect(scripts.has('Katakana')).toBe(true);
    expect(scripts.has('Han')).toBe(true);
  });

  test('multiple locales produce union of scripts', () => {
    const scripts = getPermittedScripts(['en', 'ru', 'el']);
    expect(scripts.has('Cyrillic')).toBe(true);
    expect(scripts.has('Greek')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isHostnameAllowed
// ---------------------------------------------------------------------------
describe('isHostnameAllowed', () => {
  const englishScripts = getPermittedScripts(['en']);
  const russianScripts = getPermittedScripts(['ru']);

  // --- Should be allowed ---
  test('plain Latin domain is allowed for English', () => {
    expect(isHostnameAllowed('example.com', englishScripts).allowed).toBe(true);
  });

  test('plain Latin domain is allowed for Russian', () => {
    expect(isHostnameAllowed('example.com', russianScripts).allowed).toBe(true);
  });

  test('digits and hyphens in domain are allowed', () => {
    expect(isHostnameAllowed('my-site-123.com', englishScripts).allowed).toBe(true);
  });

  // --- Should be blocked ---
  test('Cyrillic domain is blocked for English', () => {
    // аpple.com with Cyrillic а
    const result = isHostnameAllowed('аpple.com', englishScripts);
    expect(result.allowed).toBe(false);
    expect(result.offendingChars.some(c => c.script === 'Cyrillic')).toBe(true);
  });

  test('Greek character in domain is blocked for English', () => {
    // googlе.com with Greek ο
    const result = isHostnameAllowed('gοοgle.com', englishScripts);
    expect(result.allowed).toBe(false);
    expect(result.offendingChars.some(c => c.script === 'Greek')).toBe(true);
  });

  test('Cyrillic domain is allowed for Russian', () => {
    expect(isHostnameAllowed('аpple.com', russianScripts).allowed).toBe(true);
  });

  test('reports all offending characters, not just the first', () => {
    // Domain with both Cyrillic а and Cyrillic о
    const result = isHostnameAllowed('аррӏе.com', englishScripts);
    expect(result.allowed).toBe(false);
    expect(result.offendingChars.length).toBeGreaterThan(1);
  });

  test('domain containing RTL override (U+202E) is blocked', () => {
    const result = isHostnameAllowed('example‮.com', englishScripts);
    expect(result.allowed).toBe(false);
    expect(result.offendingChars[0].script).toBe('Unknown');
  });
});

// ---------------------------------------------------------------------------
// decodeHostname
// ---------------------------------------------------------------------------
describe('decodeHostname', () => {
  test('plain ASCII domain is returned unchanged', () => {
    expect(decodeHostname('https://example.com')).toBe('example.com');
  });

  test('punycode label is decoded to Unicode', () => {
    // xn--pple-43d.com = аpple.com (Cyrillic а)
    expect(decodeHostname('https://xn--pple-43d.com')).toBe('аpple.com');
  });

  test('www prefix is preserved', () => {
    expect(decodeHostname('https://www.example.com')).toBe('www.example.com');
  });

  test('multi-label punycode is fully decoded', () => {
    // xn--80ak6aa92e.com = аррӏе.com (all Cyrillic)
    const decoded = decodeHostname('https://www.xn--80ak6aa92e.com');
    expect(decoded).toMatch(/www\..+\.com/);
  });

  test('invalid URL returns empty string', () => {
    expect(decodeHostname('not-a-url')).toBe('');
  });

  test('zero-width space (U+200B) is stripped from labels', () => {
    expect(decodeHostname('http://exam​ple.com/')).toBe('example.com');
  });

  test('zero-width non-joiner (U+200C) is stripped from labels', () => {
    expect(decodeHostname('http://exam‌ple.com/')).toBe('example.com');
  });

  test('zero-width joiner (U+200D) is stripped from labels', () => {
    expect(decodeHostname('http://exam‍ple.com/')).toBe('example.com');
  });

  test('BOM / ZWNBSP (U+FEFF) is stripped from labels', () => {
    expect(decodeHostname('http://exam﻿ple.com/')).toBe('example.com');
  });

  test('NFKC collapses fullwidth Latin characters', () => {
    expect(decodeHostname('http://ａpple.com/')).toBe('apple.com'); // ａ → a
  });

  test('IDEOGRAPHIC FULL STOP (U+3002) is treated as a label separator', () => {
    // Splitting correctly means the Cyrillic label is detected separately
    const hostname = decodeHostname('http://аpple。com/');
    expect(hostname).toBe('аpple.com');
    expect(hostname.split('.')).toHaveLength(2);
  });

  test('FULLWIDTH FULL STOP (U+FF0E) is treated as a label separator', () => {
    const hostname = decodeHostname('http://example．com/');
    expect(hostname.split('.')).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// getConfusableChars
// ---------------------------------------------------------------------------
describe('getConfusableChars', () => {
  test('plain Latin domain has no confusables', () => {
    expect(getConfusableChars('example.com')).toHaveLength(0);
  });

  test('Cyrillic а is flagged as confusable with a', () => {
    const result = getConfusableChars('аpple.com');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].looksLike).toBe('a');
  });

  test('Greek omicron ο is flagged as confusable with o', () => {
    const result = getConfusableChars('gοοgle.com');
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].looksLike).toBe('o');
  });

  test('each confusable character is reported only once', () => {
    // аpple.com has one distinct confusable character (а)
    const result = getConfusableChars('аpple.com');
    const chars = result.map(c => c.char);
    expect(new Set(chars).size).toBe(chars.length);
  });

  test('each result includes char, looksLike, and script', () => {
    const result = getConfusableChars('аpple.com');
    expect(result[0]).toHaveProperty('char');
    expect(result[0]).toHaveProperty('looksLike');
    expect(result[0]).toHaveProperty('script');
  });

  test('Greek iota (ι) is flagged as confusable with i', () => {
    const result = getConfusableChars('ιntel.com');
    expect(result.some(c => c.char === 'ι' && c.looksLike === 'i')).toBe(true);
  });

  test('Cyrillic QA (ԛ) is flagged as confusable with q', () => {
    const result = getConfusableChars('ԛoogle.com');
    expect(result.some(c => c.char === 'ԛ' && c.looksLike === 'q')).toBe(true);
  });

  test('Cyrillic WE (ԝ) is flagged as confusable with w', () => {
    const result = getConfusableChars('ԝhat.com');
    expect(result.some(c => c.char === 'ԝ' && c.looksLike === 'w')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getCharScript — extended script coverage
// ---------------------------------------------------------------------------
describe('getCharScript — extended scripts', () => {
  test('Arabic letters return Arabic',             () => expect(getCharScript('ع')).toBe('Arabic'));
  test('Hebrew letters return Hebrew',             () => expect(getCharScript('ה')).toBe('Hebrew'));
  test('Hangul letters return Hangul',             () => expect(getCharScript('가')).toBe('Hangul'));
  test('Thai letters return Thai',                 () => expect(getCharScript('ก')).toBe('Thai'));
  test('Lao letters return Lao',                   () => expect(getCharScript('ກ')).toBe('Lao'));
  test('Khmer letters return Khmer',               () => expect(getCharScript('ក')).toBe('Khmer'));
  test('Myanmar letters return Myanmar',           () => expect(getCharScript('က')).toBe('Myanmar'));
  test('Georgian letters return Georgian',         () => expect(getCharScript('გ')).toBe('Georgian'));
  test('Armenian letters return Armenian',         () => expect(getCharScript('Հ')).toBe('Armenian'));
  test('Tamil letters return Tamil',               () => expect(getCharScript('அ')).toBe('Tamil'));
  test('Telugu letters return Telugu',             () => expect(getCharScript('అ')).toBe('Telugu'));
  test('Kannada letters return Kannada',           () => expect(getCharScript('ಅ')).toBe('Kannada'));
  test('Malayalam letters return Malayalam',       () => expect(getCharScript('അ')).toBe('Malayalam'));
  test('Devanagari letters return Devanagari',     () => expect(getCharScript('अ')).toBe('Devanagari'));
  test('Bengali letters return Bengali',           () => expect(getCharScript('অ')).toBe('Bengali'));
  test('Gujarati letters return Gujarati',         () => expect(getCharScript('અ')).toBe('Gujarati'));
  test('Gurmukhi letters return Gurmukhi',         () => expect(getCharScript('ਅ')).toBe('Gurmukhi'));
  test('Oriya letters return Oriya',                 () => expect(getCharScript('ଅ')).toBe('Oriya'));
  test('Sinhala letters return Sinhala',           () => expect(getCharScript('අ')).toBe('Sinhala'));
  test('Mongolian letters return Mongolian',       () => expect(getCharScript('ᠠ')).toBe('Mongolian'));
  test('Tibetan letters return Tibetan',           () => expect(getCharScript('ཀ')).toBe('Tibetan'));
  test('Thaana letters return Thaana',             () => expect(getCharScript('ހ')).toBe('Thaana'));
  test('Canadian Aboriginal letters return Canadian_Aboriginal', () => expect(getCharScript('ᐊ')).toBe('Canadian_Aboriginal'));
  test('Cherokee letters return Cherokee',         () => expect(getCharScript('Ꭰ')).toBe('Cherokee'));
});

// ---------------------------------------------------------------------------
// getPermittedScripts — extended locale coverage
// ---------------------------------------------------------------------------
describe('getPermittedScripts — extended locales', () => {
  test('Greek locale (el) adds Greek',                    () => expect(getPermittedScripts(['el']).has('Greek')).toBe(true));
  test('Arabic locale (ar) adds Arabic',                  () => expect(getPermittedScripts(['ar']).has('Arabic')).toBe(true));
  test('Hebrew locale (he) adds Hebrew',                  () => expect(getPermittedScripts(['he']).has('Hebrew')).toBe(true));
  test('Chinese locale (zh) adds Han',                    () => expect(getPermittedScripts(['zh']).has('Han')).toBe(true));
  test('Korean locale (ko) adds Hangul and Han',          () => {
    const scripts = getPermittedScripts(['ko']);
    expect(scripts.has('Hangul')).toBe(true);
    expect(scripts.has('Han')).toBe(true);
  });
  test('Thai locale (th) adds Thai',                      () => expect(getPermittedScripts(['th']).has('Thai')).toBe(true));
  test('Lao locale (lo) adds Lao',                        () => expect(getPermittedScripts(['lo']).has('Lao')).toBe(true));
  test('Khmer locale (km) adds Khmer',                    () => expect(getPermittedScripts(['km']).has('Khmer')).toBe(true));
  test('Myanmar locale (my) adds Myanmar',                () => expect(getPermittedScripts(['my']).has('Myanmar')).toBe(true));
  test('Georgian locale (ka) adds Georgian',              () => expect(getPermittedScripts(['ka']).has('Georgian')).toBe(true));
  test('Armenian locale (hy) adds Armenian',              () => expect(getPermittedScripts(['hy']).has('Armenian')).toBe(true));
  test('Tamil locale (ta) adds Tamil',                    () => expect(getPermittedScripts(['ta']).has('Tamil')).toBe(true));
  test('Telugu locale (te) adds Telugu',                  () => expect(getPermittedScripts(['te']).has('Telugu')).toBe(true));
  test('Kannada locale (kn) adds Kannada',                () => expect(getPermittedScripts(['kn']).has('Kannada')).toBe(true));
  test('Malayalam locale (ml) adds Malayalam',            () => expect(getPermittedScripts(['ml']).has('Malayalam')).toBe(true));
  test('Hindi locale (hi) adds Devanagari',               () => expect(getPermittedScripts(['hi']).has('Devanagari')).toBe(true));
  test('Bengali locale (bn) adds Bengali',                () => expect(getPermittedScripts(['bn']).has('Bengali')).toBe(true));
  test('Gujarati locale (gu) adds Gujarati',              () => expect(getPermittedScripts(['gu']).has('Gujarati')).toBe(true));
  test('Punjabi locale (pa) adds Gurmukhi',               () => expect(getPermittedScripts(['pa']).has('Gurmukhi')).toBe(true));
  test('Odia/Oriya locale (or) adds Oriya',                  () => expect(getPermittedScripts(['or']).has('Oriya')).toBe(true));
  test('Sinhala locale (si) adds Sinhala',                () => expect(getPermittedScripts(['si']).has('Sinhala')).toBe(true));
  test('Mongolian (China) locale (mn-CN) adds Mongolian', () => expect(getPermittedScripts(['mn-CN']).has('Mongolian')).toBe(true));
  test('Tibetan locale (bo) adds Tibetan',                () => expect(getPermittedScripts(['bo']).has('Tibetan')).toBe(true));
  test('Dhivehi locale (dv) adds Thaana',                 () => expect(getPermittedScripts(['dv']).has('Thaana')).toBe(true));
  test('Inuktitut locale (iu) adds Canadian_Aboriginal',  () => expect(getPermittedScripts(['iu']).has('Canadian_Aboriginal')).toBe(true));
  test('Cherokee locale (chr) adds Cherokee',             () => expect(getPermittedScripts(['chr']).has('Cherokee')).toBe(true));
  test('Serbian locale (sr) adds both Cyrillic and Latin',() => {
    const scripts = getPermittedScripts(['sr']);
    expect(scripts.has('Cyrillic')).toBe(true);
    expect(scripts.has('Latin')).toBe(true);
  });
  test('Marathi locale (mr) adds Devanagari',             () => expect(getPermittedScripts(['mr']).has('Devanagari')).toBe(true));
});

// ---------------------------------------------------------------------------
// isHostnameAllowed — per-script block/allow
// Each unique script: blocked for English, allowed for its locale
// ---------------------------------------------------------------------------
describe('isHostnameAllowed — per-script block/allow', () => {
  const en = getPermittedScripts(['en']);

  const cases = [
    { char: 'ع', script: 'Arabic',             locale: 'ar' },
    { char: 'ה', script: 'Hebrew',             locale: 'he' },
    { char: '中', script: 'Han',               locale: 'zh' },
    { char: '가', script: 'Hangul',            locale: 'ko' },
    { char: 'ก', script: 'Thai',              locale: 'th' },
    { char: 'ກ', script: 'Lao',               locale: 'lo' },
    { char: 'ក', script: 'Khmer',             locale: 'km' },
    { char: 'က', script: 'Myanmar',           locale: 'my' },
    { char: 'გ', script: 'Georgian',          locale: 'ka' },
    { char: 'Հ', script: 'Armenian',          locale: 'hy' },
    { char: 'அ', script: 'Tamil',             locale: 'ta' },
    { char: 'అ', script: 'Telugu',            locale: 'te' },
    { char: 'ಅ', script: 'Kannada',           locale: 'kn' },
    { char: 'അ', script: 'Malayalam',         locale: 'ml' },
    { char: 'अ', script: 'Devanagari',        locale: 'hi' },
    { char: 'অ', script: 'Bengali',           locale: 'bn' },
    { char: 'અ', script: 'Gujarati',          locale: 'gu' },
    { char: 'ਅ', script: 'Gurmukhi',          locale: 'pa' },
    { char: 'ଅ', script: 'Oriya',             locale: 'or' },
    { char: 'අ', script: 'Sinhala',           locale: 'si' },
    { char: 'ᠠ', script: 'Mongolian',         locale: 'mn-CN' },
    { char: 'ཀ', script: 'Tibetan',           locale: 'bo' },
    { char: 'ހ', script: 'Thaana',            locale: 'dv' },
    { char: 'ᐊ', script: 'Canadian_Aboriginal', locale: 'iu' },
    { char: 'Ꭰ', script: 'Cherokee',          locale: 'chr' },
  ];

  cases.forEach(({ char, script, locale }) => {
    test(`${script} char blocked for English`, () => {
      const result = isHostnameAllowed(`${char}test.com`, en);
      expect(result.allowed).toBe(false);
      expect(result.offendingChars.some(c => c.script === script)).toBe(true);
    });

    test(`${script} char allowed for ${locale}`, () => {
      const localeScripts = getPermittedScripts([locale]);
      expect(isHostnameAllowed(`${char}test.com`, localeScripts).allowed).toBe(true);
    });
  });

  // Serbian edge case: Cyrillic allowed, but only because sr permits both scripts
  test('Cyrillic char allowed for Serbian (sr)', () => {
    const srScripts = getPermittedScripts(['sr']);
    expect(isHostnameAllowed('аtest.com', srScripts).allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Previously-failing scripts: getCharScript returns correct script name
// ---------------------------------------------------------------------------
describe('getCharScript — previously failing scripts', () => {
  test('Syriac letter ܡ returns Syriac',     () => expect(getCharScript('ܡ')).toBe('Syriac'));
  test("N'Ko letter ߊ returns Nko",          () => expect(getCharScript('ߊ')).toBe('Nko'));
  test('Ethiopic letter ም returns Ethiopic', () => expect(getCharScript('ም')).toBe('Ethiopic'));
  test('Tifinagh letter ⴰ returns Tifinagh', () => expect(getCharScript('ⴰ')).toBe('Tifinagh'));
  test('Vai letter ꕙ returns Vai',           () => expect(getCharScript('ꕙ')).toBe('Vai'));
  test('Osmanya letter 𐒖 returns Osmanya',   () => expect(getCharScript('𐒖')).toBe('Osmanya'));
});

// ---------------------------------------------------------------------------
// test-urls.html — every script blocked for English (Latin-only) locale
// ---------------------------------------------------------------------------
describe('test-urls.html — blocked for English', () => {
  const en = getPermittedScripts(['en']);

  const cases = [
    // Cyrillic
    ['Cyrillic example domain',       'https://пример.испытание/путь'],
    ['Cyrillic homograph xn--',       'https://xn--pple-43d.com/'],
    // Greek
    ['Greek example domain',          'https://παράδειγμα.δοκιμή/διαδρομή'],
    ['Greek homograph xn--',          'https://xn--ggle-0nda.com/'],
    // Japanese
    ['Japanese xn-- domain',          'https://xn--r8jz45g.xn--zckzah/'],
    // Arabic
    ['Arabic example domain',         'https://مثال.اختبار/مسار'],
    // Hebrew
    ['Hebrew example domain',         'https://דוגמה.בדיקה/נתיב'],
    ['Hebrew xn-- domain',            'https://xn--4db7d.com/'],
    // Korean
    ['Korean example domain',         'https://예제.테스트/경로'],
    ['Korean xn-- domain',            'https://xn--3e0b707e.com/'],
    // Thai
    ['Thai example domain',           'https://ตัวอย่าง.ทดสอบ/เส้นทาง'],
    ['Thai xn-- domain',              'https://xn--o3cw4h.com/'],
    // Devanagari
    ['Devanagari example domain',     'https://उदाहरण.परीक्षा/मार्ग'],
    ['Devanagari xn-- domain',        'https://xn--h2brj9c.com/'],
    // Georgian
    ['Georgian example domain',       'https://მაგალითი.ტესტი/გზა'],
    ['Georgian xn-- domain',          'https://xn--node.com/'],
    // Armenian
    ['Armenian xn-- domain',          'https://xn--y9a3aq.com/'],
    // Chinese
    ['Chinese example domain',        'https://例子.测试/路径'],
    ['Chinese xn-- domain',           'https://xn--fiqs8s.com/'],
    // Bengali
    ['Bengali example domain',        'https://উদাহরণ.পরীক্ষা/পথ'],
    // Tamil
    ['Tamil example domain',          'https://உதாரணம்.சோதனை/பாதை'],
    // Lao
    ['Lao example domain',            'https://ຕົວຢ່າງ.ທົດສອບ/ເສັ້ນທາງ'],
    // Canadian Aboriginal
    ['Canadian Aboriginal domain',    'https://ᐊᐃᐧᐁᐤ.ᑎᐱ/ᒪᓯᓐ'],
    // Cherokee
    ['Cherokee example domain',       'https://ᎠᏓᎨᏫ.ᎤᏬᏂ/ᎧᎾ'],
    // Mongolian
    ['Mongolian example domain',      'https://ᠮᠢᠰᠠᠯ.ᠲᠤᠷᠪᠠ/ᠵᠠᠮ'],
    // Tibetan
    ['Tibetan example domain',        'https://དཔེར་ན.ཚོད་ལྟ/ལམ'],
    // Syriac (previously failing)
    ['Syriac example domain',         'https://ܡܬܠܐ.ܒܘܚܢܐ/ܐܘܪܚܐ'],
    ["N'Ko example domain",           'https://ߡߊ߬ߛߊ߬ߟߌ.ߛߐ߬ߞߐ߲/ߞߊ߲߬ߘߊ'],
    // Ethiopic (previously failing)
    ['Ethiopic example domain',       'https://ምሳሌ.ሙከራ/መንገድ'],
    // Tifinagh (previously failing)
    ['Tifinagh example domain',       'https://ⴰⵎⴰⵣⵉⵖ.ⵜⴰⵙⴰⵔⵓⵜ/ⴰⴱⵔⵉⴷ'],
    // Vai (previously failing)
    ['Vai example domain',            'https://ꕙꔤ.ꕮꕱ/ꕉꔤ'],
    // Osmanya (previously failing)
    ['Osmanya example domain',        'https://𐒖𐒘𐒑𐒖.𐒙𐒖𐒚/𐒖𐒘'],
    // punycode-encoded forms of the previously failing URLs
    ['N\'Ko xn-- encoded',            'https://xn--lsbag2dvai2fc.xn--rsba5an3eub/'],
    ['Tifinagh xn-- encoded',         'https://xn--4lja9esa6b8d.xn--4lja9hdxqf/'],
    ['Vai xn-- encoded',              'https://xn--io8ayd.xn--mq8ag/'],
    ['Osmanya xn-- encoded',          'https://xn--hm8cjabg.xn--mm8cfe/'],
  ];

  cases.forEach(([label, url]) => {
    test(`blocks ${label}`, () => {
      const hostname = decodeHostname(url);
      expect(hostname).not.toBe('');
      expect(isHostnameAllowed(hostname, en).allowed).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// test-urls.html — scripts allowed for their native locale
// ---------------------------------------------------------------------------
describe('test-urls.html — allowed for appropriate locale', () => {
  const cases = [
    ['Cyrillic for Russian (ru)',         'https://пример.испытание/',        'ru'],
    ['Greek for Greek (el)',              'https://παράδειγμα.δοκιμή/',       'el'],
    ['Japanese for Japanese (ja)',        'https://xn--r8jz45g.xn--zckzah/', 'ja'],
    ['Arabic for Arabic (ar)',            'https://مثال.اختبار/',             'ar'],
    ['Hebrew for Hebrew (he)',            'https://דוגמה.בדיקה/',             'he'],
    ['Korean for Korean (ko)',            'https://예제.테스트/',              'ko'],
    ['Thai for Thai (th)',                'https://ตัวอย่าง.ทดสอบ/',          'th'],
    ['Devanagari for Hindi (hi)',         'https://उदाहरण.परीक्षा/',          'hi'],
    ['Georgian for Georgian (ka)',        'https://მაგალითი.ტესტი/',          'ka'],
    ['Armenian for Armenian (hy)',        'https://xn--y9a3aq.com/',          'hy'],
    ['Han for Chinese (zh)',              'https://例子.测试/',                'zh'],
    ['Bengali for Bengali (bn)',          'https://উদাহরণ.পরীক্ষা/',         'bn'],
    ['Tamil for Tamil (ta)',              'https://உதாரணம்.சோதனை/',           'ta'],
    ['Lao for Lao (lo)',                  'https://ຕົວຢ່າງ.ທົດສອບ/',          'lo'],
    ['Canadian_Aboriginal for iu',        'https://ᐊᐃᐧᐁᐤ.ᑎᐱ/',              'iu'],
    ['Cherokee for Cherokee (chr)',       'https://ᎠᏓᎨᏫ.ᎤᏬᏂ/',              'chr'],
    ['Mongolian for Mongolian (mn-CN)',   'https://ᠮᠢᠰᠠᠯ.ᠲᠤᠷᠪᠠ/',            'mn-CN'],
    ['Tibetan for Tibetan (bo)',          'https://དཔེར་ན.ཚོད་ལྟ/',            'bo'],
  ];

  cases.forEach(([label, url, locale]) => {
    test(`allows ${label}`, () => {
      const localeScripts = getPermittedScripts([locale]);
      const hostname = decodeHostname(url);
      expect(hostname).not.toBe('');
      expect(isHostnameAllowed(hostname, localeScripts).allowed).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Full-flow: test URLs from dev/test URLs.txt
// ---------------------------------------------------------------------------
describe('Full detection flow', () => {
  const englishScripts = getPermittedScripts(['en']);

  const shouldBlock = [
    // Cyrillic homographs
    { url: 'https://www.xn--80ak6aa92e.com/', label: 'apple.com all-Cyrillic' },
    { url: 'https://xn--pple-43d.com/',       label: 'аpple.com Cyrillic а' },
    { url: 'https://xn--googl-3we.com/',      label: 'googlе.com Cyrillic е' },
    { url: 'https://xn--aypal-uye.com/',      label: 'рaypal.com Cyrillic р' },
    { url: 'https://xn--microsft-sbh.com/',   label: 'microsоft.com Cyrillic о' },
    { url: 'https://xn--mazon-3ve.com/',      label: 'аmazon.com Cyrillic а' },
    // Greek homographs
    { url: 'https://xn--ggle-0nda.com/',       label: 'google.com Greek ο' },
    { url: 'https://xn--yah-czca.com/',       label: 'yahοο.com Greek ο' },
    { url: 'https://xn--vidia-ece.com/',      label: 'νvidia.com Greek ν' },
  ];

  const shouldAllow = [
    { url: 'https://www.example.com/', label: 'example.com' },
    { url: 'https://www.google.com/',  label: 'google.com' },
  ];

  shouldBlock.forEach(({ url, label }) => {
    test(`blocks ${label}`, () => {
      const hostname = decodeHostname(url);
      expect(isHostnameAllowed(hostname, englishScripts).allowed).toBe(false);
    });
  });

  shouldAllow.forEach(({ url, label }) => {
    test(`allows ${label}`, () => {
      const hostname = decodeHostname(url);
      expect(isHostnameAllowed(hostname, englishScripts).allowed).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// getEnabledLangScriptSets
// ---------------------------------------------------------------------------
describe('getEnabledLangScriptSets', () => {
  test('English locale produces a set containing Latin', () => {
    const sets = getEnabledLangScriptSets(['en'], []);
    expect(sets.some(s => s.has('Latin'))).toBe(true);
  });

  test('Japanese locale produces a set containing Han, Hiragana, Katakana', () => {
    const sets = getEnabledLangScriptSets(['ja'], []);
    expect(sets.some(s => s.has('Han') && s.has('Hiragana') && s.has('Katakana'))).toBe(true);
  });

  test('additional lang scripts are included as sets', () => {
    const sets = getEnabledLangScriptSets(['en'], [['Cyrillic', 'Latin']]);
    expect(sets.some(s => s.has('Cyrillic') && s.has('Latin'))).toBe(true);
  });

  test('empty locales and empty additional produces empty array', () => {
    expect(getEnabledLangScriptSets([], [])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// isSingleLocaleScriptMix
// ---------------------------------------------------------------------------
describe('isSingleLocaleScriptMix', () => {
  const enOnly     = getEnabledLangScriptSets(['en'], []);
  const jaLocale   = getEnabledLangScriptSets(['ja'], []);
  const koLocale   = getEnabledLangScriptSets(['ko'], []);
  const srLocale   = getEnabledLangScriptSets(['sr'], []);
  const enPlusSr   = getEnabledLangScriptSets(['en'], [['Cyrillic', 'Latin']]);
  const enPlusCyrl = getEnabledLangScriptSets(['en'], [['Cyrillic']]); // Russian added, not Serbian

  test('single script returns true', () => {
    expect(isSingleLocaleScriptMix(new Set(['Cyrillic']), enOnly)).toBe(true);
  });

  test('empty set returns true', () => {
    expect(isSingleLocaleScriptMix(new Set(), enOnly)).toBe(true);
  });

  test('Common + Inherited only returns true', () => {
    expect(isSingleLocaleScriptMix(new Set(['Common', 'Inherited']), enOnly)).toBe(true);
  });

  // Japanese: only allowed when Japanese is active (browser locale or explicitly enabled)
  test('Han + Hiragana returns true for Japanese browser locale', () => {
    expect(isSingleLocaleScriptMix(new Set(['Han', 'Hiragana']), jaLocale)).toBe(true);
  });

  test('Han + Hiragana returns false without Japanese locale', () => {
    expect(isSingleLocaleScriptMix(new Set(['Han', 'Hiragana']), enOnly)).toBe(false);
  });

  test('Han + Hiragana + Katakana returns true for Japanese browser locale', () => {
    expect(isSingleLocaleScriptMix(new Set(['Han', 'Hiragana', 'Katakana']), jaLocale)).toBe(true);
  });

  // Korean
  test('Hangul + Han returns true for Korean browser locale', () => {
    expect(isSingleLocaleScriptMix(new Set(['Hangul', 'Han']), koLocale)).toBe(true);
  });

  test('Hangul + Han returns false without Korean locale', () => {
    expect(isSingleLocaleScriptMix(new Set(['Hangul', 'Han']), enOnly)).toBe(false);
  });

  // Serbian: Latin+Cyrillic requires Serbian to be explicitly enabled
  test('Cyrillic + Latin returns false for English-only locale (no Serbian)', () => {
    expect(isSingleLocaleScriptMix(new Set(['Cyrillic', 'Latin']), enOnly)).toBe(false);
  });

  test('Cyrillic + Latin returns false when only Cyrillic is additionally enabled (Russian, not Serbian)', () => {
    expect(isSingleLocaleScriptMix(new Set(['Cyrillic', 'Latin']), enPlusCyrl)).toBe(false);
  });

  test('Cyrillic + Latin returns true for Serbian browser locale', () => {
    expect(isSingleLocaleScriptMix(new Set(['Cyrillic', 'Latin']), srLocale)).toBe(true);
  });

  test('Cyrillic + Latin returns true when Serbian is explicitly enabled', () => {
    expect(isSingleLocaleScriptMix(new Set(['Cyrillic', 'Latin']), enPlusSr)).toBe(true);
  });

  // Cross-locale mixes always false regardless of what is enabled
  test('Latin + Hiragana returns false (no single locale covers both)', () => {
    expect(isSingleLocaleScriptMix(new Set(['Latin', 'Hiragana']), jaLocale)).toBe(false);
  });

  test('Latin + Katakana returns false', () => {
    expect(isSingleLocaleScriptMix(new Set(['Latin', 'Katakana']), jaLocale)).toBe(false);
  });

  test('Latin + Han returns false', () => {
    expect(isSingleLocaleScriptMix(new Set(['Latin', 'Han']), jaLocale)).toBe(false);
  });

  test('Cyrillic + Greek returns false', () => {
    expect(isSingleLocaleScriptMix(new Set(['Cyrillic', 'Greek']), enOnly)).toBe(false);
  });

  test('Greek + Arabic returns false', () => {
    expect(isSingleLocaleScriptMix(new Set(['Greek', 'Arabic']), enOnly)).toBe(false);
  });
});
