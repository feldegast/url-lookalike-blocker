// Unit tests for unicode-scripts.js core detection logic.
// Run with: npm test

const {
  getCharScript,
  getPermittedScripts,
  isHostnameAllowed,
  decodeHostname,
  getConfusableChars,
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
