/**
 * unicode-scripts.js
 *
 * Core detection logic for URL lookalike blocker extension.
 * Handles locale-to-scripts mapping and character script detection.
 */

/**
 * BCP 47 Locale to Unicode Scripts Mapping
 *
 * Maps language codes (BCP 47 format) to their associated Unicode script sets.
 * Always includes: Common, Inherited, Latin (per extension spec)
 *
 * Unicode scripts reference: https://unicode.org/reports/tr24/
 * Script property values: https://www.unicode.org/Public/UCD/latest/ucd/Scripts.txt
 */

const LOCALE_SCRIPTS_MAP = {
  // ========== LATIN-SCRIPT LANGUAGES ==========
  'en': ['Latin'],                              // English
  'es': ['Latin'],                              // Spanish
  'fr': ['Latin'],                              // French
  'de': ['Latin'],                              // German
  'it': ['Latin'],                              // Italian
  'pt': ['Latin'],                              // Portuguese
  'pt-BR': ['Latin'],                           // Portuguese (Brazil)
  'pt-PT': ['Latin'],                           // Portuguese (Portugal)
  'nl': ['Latin'],                              // Dutch
  'sv': ['Latin'],                              // Swedish
  'no': ['Latin'],                              // Norwegian
  'da': ['Latin'],                              // Danish
  'fi': ['Latin'],                              // Finnish
  'pl': ['Latin'],                              // Polish
  'cs': ['Latin'],                              // Czech
  'sk': ['Latin'],                              // Slovak
  'hu': ['Latin'],                              // Hungarian
  'ro': ['Latin'],                              // Romanian
  'tr': ['Latin'],                              // Turkish
  'tr-TR': ['Latin'],                           // Turkish (Turkey)
  'vi': ['Latin'],                              // Vietnamese
  'id': ['Latin'],                              // Indonesian
  'ms': ['Latin'],                              // Malay
  'fil': ['Latin'],                             // Filipino (Tagalog)
  'ca': ['Latin'],                              // Catalan
  'gl': ['Latin'],                              // Galician
  'eu': ['Latin'],                              // Basque

  // ========== CYRILLIC-SCRIPT LANGUAGES ==========
  'ru': ['Cyrillic'],                           // Russian
  'uk': ['Cyrillic'],                           // Ukrainian
  'bg': ['Cyrillic'],                           // Bulgarian
  'sr': ['Cyrillic', 'Latin'],                  // Serbian (both scripts used)
  'sr-Cyrl': ['Cyrillic'],                      // Serbian (Cyrillic)
  'sr-Latn': ['Latin'],                         // Serbian (Latin)
  'mk': ['Cyrillic'],                           // Macedonian
  'be': ['Cyrillic'],                           // Belarusian
  'kk': ['Cyrillic'],                           // Kazakh
  'ky': ['Cyrillic'],                           // Kyrgyz
  'tg': ['Cyrillic'],                           // Tajik
  'uz': ['Cyrillic'],                           // Uzbek (Cyrillic form)
  'uz-Cyrl': ['Cyrillic'],                      // Uzbek (Cyrillic)

  // ========== GREEK-SCRIPT LANGUAGES ==========
  'el': ['Greek'],                              // Greek
  'el-GR': ['Greek'],                           // Greek (Greece)
  'el-CY': ['Greek'],                           // Greek (Cyprus)

  // ========== ARABIC-SCRIPT LANGUAGES ==========
  'ar': ['Arabic'],                             // Arabic (generic)
  'ar-SA': ['Arabic'],                          // Arabic (Saudi Arabia)
  'ar-AE': ['Arabic'],                          // Arabic (UAE)
  'ar-EG': ['Arabic'],                          // Arabic (Egypt)
  'ar-DZ': ['Arabic'],                          // Arabic (Algeria)
  'ar-MA': ['Arabic'],                          // Arabic (Morocco)
  'ar-TN': ['Arabic'],                          // Arabic (Tunisia)
  'ar-JO': ['Arabic'],                          // Arabic (Jordan)
  'ar-SY': ['Arabic'],                          // Arabic (Syria)
  'ar-LB': ['Arabic'],                          // Arabic (Lebanon)
  'ar-IQ': ['Arabic'],                          // Arabic (Iraq)
  'ar-KW': ['Arabic'],                          // Arabic (Kuwait)
  'ar-QA': ['Arabic'],                          // Arabic (Qatar)
  'ar-BH': ['Arabic'],                          // Arabic (Bahrain)
  'ar-OM': ['Arabic'],                          // Arabic (Oman)
  'ar-YE': ['Arabic'],                          // Arabic (Yemen)
  'ur': ['Arabic'],                             // Urdu (uses Arabic-like Nastaliq)
  'ur-PK': ['Arabic'],                          // Urdu (Pakistan)
  'ur-IN': ['Arabic'],                          // Urdu (India)
  'fa': ['Arabic'],                             // Persian/Farsi
  'fa-IR': ['Arabic'],                          // Persian (Iran)
  'ps': ['Arabic'],                             // Pashto

  // ========== HEBREW-SCRIPT LANGUAGES ==========
  'he': ['Hebrew'],                             // Hebrew
  'he-IL': ['Hebrew'],                           // Hebrew (Israel)

  // ========== CHINESE LANGUAGES ==========
  'zh': ['Han'],                                // Chinese (generic)
  'zh-CN': ['Han'],                             // Chinese (Simplified, Mainland China)
  'zh-Hans': ['Han'],                           // Chinese (Simplified)
  'zh-TW': ['Han'],                             // Chinese (Traditional, Taiwan)
  'zh-Hant': ['Han'],                           // Chinese (Traditional)
  'zh-HK': ['Han'],                             // Chinese (Traditional, Hong Kong)
  'zh-MO': ['Han'],                             // Chinese (Traditional, Macau)
  'zh-SG': ['Han'],                             // Chinese (Simplified, Singapore)

  // ========== JAPANESE ==========
  'ja': ['Hiragana', 'Katakana', 'Han'],       // Japanese
  'ja-JP': ['Hiragana', 'Katakana', 'Han'],     // Japanese (Japan)

  // ========== KOREAN ==========
  'ko': ['Hangul', 'Han'],                      // Korean (modern Hangul + legacy Hanja)
  'ko-KR': ['Hangul', 'Han'],                   // Korean (South Korea)
  'ko-KPXX': ['Hangul', 'Han'],                 // Korean (North Korea - KPXX variant)

  // ========== THAI ==========
  'th': ['Thai'],                               // Thai
  'th-TH': ['Thai'],                            // Thai (Thailand)

  // ========== LAO ==========
  'lo': ['Lao'],                                // Lao
  'lo-LA': ['Lao'],                             // Lao (Laos)

  // ========== KHMER ==========
  'km': ['Khmer'],                              // Khmer (Cambodian)
  'km-KH': ['Khmer'],                           // Khmer (Cambodia)

  // ========== BURMESE ==========
  'my': ['Myanmar'],                            // Burmese/Myanmar
  'my-MM': ['Myanmar'],                         // Burmese (Myanmar)

  // ========== GEORGIAN ==========
  'ka': ['Georgian'],                           // Georgian
  'ka-GE': ['Georgian'],                        // Georgian (Georgia)

  // ========== ARMENIAN ==========
  'hy': ['Armenian'],                           // Armenian
  'hy-AM': ['Armenian'],                         // Armenian (Armenia)

  // ========== INDIC SCRIPTS (South and Southeast Asia) ==========
  'ta': ['Tamil'],                              // Tamil
  'ta-IN': ['Tamil'],                           // Tamil (India)
  'ta-LK': ['Tamil'],                           // Tamil (Sri Lanka)
  'te': ['Telugu'],                             // Telugu
  'te-IN': ['Telugu'],                          // Telugu (India)
  'kn': ['Kannada'],                            // Kannada
  'kn-IN': ['Kannada'],                         // Kannada (India)
  'ml': ['Malayalam'],                           // Malayalam
  'ml-IN': ['Malayalam'],                        // Malayalam (India)
  'hi': ['Devanagari'],                         // Hindi
  'hi-IN': ['Devanagari'],                      // Hindi (India)
  'bn': ['Bengali'],                            // Bengali/Bangla
  'bn-BD': ['Bengali'],                         // Bengali (Bangladesh)
  'bn-IN': ['Bengali'],                         // Bengali (India)
  'gu': ['Gujarati'],                           // Gujarati
  'gu-IN': ['Gujarati'],                        // Gujarati (India)
  'pa': ['Gurmukhi'],                           // Punjabi (Gurmukhi script)
  'pa-IN': ['Gurmukhi'],                        // Punjabi (India)
  'pa-PK': ['Arabic'],                          // Punjabi (Pakistan) - uses Arabic
  'or': ['Oriya'],                              // Odia/Oriya (JS Unicode property name is Oriya)
  'or-IN': ['Oriya'],                           // Odia (India)
  'si': ['Sinhala'],                            // Sinhala (Sinhalese)
  'si-LK': ['Sinhala'],                         // Sinhala (Sri Lanka)

  // ========== MONGOLIAN ==========
  'mn': ['Cyrillic'],                           // Mongolian (modern, in Mongolia uses Cyrillic)
  'mn-MN': ['Cyrillic'],                        // Mongolian (Mongolia)
  'mn-CN': ['Mongolian'],                       // Mongolian (China, uses Mongolian script)

  // ========== TIBETAN ==========
  'bo': ['Tibetan'],                            // Tibetan
  'bo-CN': ['Tibetan'],                         // Tibetan (China)

  // ========== DEVANAGARI (also used for Sanskrit, Marathi, etc.) ==========
  'mr': ['Devanagari'],                         // Marathi
  'mr-IN': ['Devanagari'],                      // Marathi (India)
  'sa': ['Devanagari'],                         // Sanskrit
  'sa-IN': ['Devanagari'],                      // Sanskrit (India)

  // ========== THAANA (Maldivian) ==========
  'dv': ['Thaana'],                             // Dhivehi/Maldivian
  'dv-MV': ['Thaana'],                          // Dhivehi (Maldives)

  // ========== CANADIAN ABORIGINAL SYLLABICS ==========
  'iu': ['Canadian_Aboriginal'],                // Inuktitut (Canadian Aboriginal)
  'iu-CA': ['Canadian_Aboriginal'],             // Inuktitut (Canada)

  // ========== CHEROKEE ==========
  'chr': ['Cherokee'],                          // Cherokee
  'chr-US': ['Cherokee'],                       // Cherokee (United States)

  // ========== AFRIKAANS (Latin) ==========
  'af': ['Latin'],                              // Afrikaans
  'af-ZA': ['Latin'],                           // Afrikaans (South Africa)

  // ========== ESPERANTO (Latin) ==========
  'eo': ['Latin'],                              // Esperanto

  // ========== FALLBACK FOR UNKNOWN/GENERIC LOCALES ==========
  'und': ['Latin'],                             // Undefined/Unknown language - default to Latin
};

/**
 * Gets the permitted Unicode scripts for a given locale.
 *
 * @param {string} locale - BCP 47 locale code (e.g., 'en', 'ja', 'uk')
 * @returns {string[]} Array of permitted Unicode script names
 *
 * Resolution strategy:
 * 1. First, try exact match with full tag (e.g., 'zh-CN')
 * 2. If no exact match, try language-only code (e.g., 'zh')
 * 3. If still no match, try converting script subtag to language lookup
 *    (e.g., from 'zh-Hans' extract 'zh')
 * 4. Default to ['Latin'] for completely unknown locales
 *
 * Note: Always append Common, Inherited, Latin to the result in calling code.
 */
function getScriptsForLocale(locale) {
  // Try exact match first (BCP 47 conventional casing: en-US, zh-TW, sr-Cyrl)
  if (LOCALE_SCRIPTS_MAP[locale]) {
    return LOCALE_SCRIPTS_MAP[locale];
  }

  // Try all-lowercase (handles browsers that send lowercase locale codes)
  const lowerLocale = locale.toLowerCase();
  if (LOCALE_SCRIPTS_MAP[lowerLocale]) {
    return LOCALE_SCRIPTS_MAP[lowerLocale];
  }

  // Try language-only code (before first hyphen)
  const languageOnly = lowerLocale.split('-')[0];
  if (LOCALE_SCRIPTS_MAP[languageOnly]) {
    return LOCALE_SCRIPTS_MAP[languageOnly];
  }

  // Try to extract language from script tag (if present)
  // e.g., 'zh-Hans-CN' -> try 'zh-CN' or 'zh'
  const parts = lowerLocale.split('-');
  if (parts.length >= 3) {
    // Common pattern: lang-Script-Region — skip the middle script subtag
    const langAndRegion = parts[0] + '-' + parts[2].toUpperCase();
    if (LOCALE_SCRIPTS_MAP[langAndRegion]) {
      return LOCALE_SCRIPTS_MAP[langAndRegion];
    }
  }

  // Default: permit Latin for unknown locales
  return ['Latin'];
}

/**
 * Gets all permitted scripts for a user's locale preference list.
 *
 * @param {string[]} locales - Array of BCP 47 locale codes from navigator.languages
 * @returns {Set<string>} Set of all permitted script names (union of all locales)
 *                        Automatically includes Common, Inherited, Latin
 *
 * Example:
 *   getPermittedScripts(['en', 'ja'])
 *   -> Set { 'Latin', 'Hiragana', 'Katakana', 'Han', 'Common', 'Inherited' }
 */
function getPermittedScripts(locales) {
  const scripts = new Set(['Common', 'Inherited', 'Latin']);

  for (const locale of locales) {
    const localeScripts = getScriptsForLocale(locale);
    for (const script of localeScripts) {
      scripts.add(script);
    }
  }

  return scripts;
}

// Maps characters to the ASCII character they visually resemble.
// Focused on pairs commonly used in IDN homograph attacks.
// Derived from UTS #39 confusables.txt (https://unicode.org/reports/tr39/).
const CONFUSABLES = new Map([
  // --- Cyrillic → Latin ---
  ['а', 'a'],  // а CYRILLIC SMALL LETTER A
  ['е', 'e'],  // е CYRILLIC SMALL LETTER IE
  ['о', 'o'],  // о CYRILLIC SMALL LETTER O
  ['р', 'p'],  // р CYRILLIC SMALL LETTER ER
  ['с', 'c'],  // с CYRILLIC SMALL LETTER ES
  ['х', 'x'],  // х CYRILLIC SMALL LETTER HA
  ['у', 'y'],  // у CYRILLIC SMALL LETTER U
  ['і', 'i'],  // і CYRILLIC SMALL LETTER BYELORUSSIAN-UKRAINIAN I
  ['ӏ', 'l'],  // ӏ CYRILLIC SMALL LETTER PALOCHKA
  ['ѕ', 's'],  // ѕ CYRILLIC SMALL LETTER DZE
  ['ԁ', 'd'],  // ԁ CYRILLIC SMALL LETTER KOMI DE
  ['ԛ', 'q'],  // ԛ CYRILLIC SMALL LETTER QA
  ['ԝ', 'w'],  // ԝ CYRILLIC SMALL LETTER WE
  // --- Greek → Latin ---
  ['ο', 'o'],  // ο GREEK SMALL LETTER OMICRON
  ['ν', 'v'],  // ν GREEK SMALL LETTER NU
  ['υ', 'u'],  // υ GREEK SMALL LETTER UPSILON
  ['α', 'a'],  // α GREEK SMALL LETTER ALPHA
  ['ρ', 'p'],  // ρ GREEK SMALL LETTER RHO
  ['ε', 'e'],  // ε GREEK SMALL LETTER EPSILON
  ['χ', 'x'],  // χ GREEK SMALL LETTER CHI
  ['ι', 'i'],  // ι GREEK SMALL LETTER IOTA
  // --- Latin extended → Latin ASCII (same script, different codepoint) ---
  ['ı', 'i'],  // ı LATIN SMALL LETTER DOTLESS I
  ['ɡ', 'g'],  // ɡ LATIN SMALL LETTER SCRIPT G
  ['ɑ', 'a'],  // ɑ LATIN SMALL LETTER ALPHA
  ['ℓ', 'l'],  // ℓ SCRIPT SMALL L (Common script)
  // --- Armenian → Latin ---
  ['հ', 'h'],  // հ ARMENIAN SMALL LETTER HO
]);

// Returns all confusable characters found in a hostname, deduplicated.
// Each entry: { char, looksLike, script }
function getConfusableChars(hostname) {
  const found = [];
  const seen = new Set();
  for (const char of hostname) {
    if (!seen.has(char)) {
      const looksLike = CONFUSABLES.get(char);
      if (looksLike !== undefined) {
        found.push({ char, looksLike, script: getCharScript(char) });
        seen.add(char);
      }
    }
  }
  return found;
}

// Returns true if the set of scripts in a single domain label is covered by at
// least one of the user's explicitly enabled language script-sets. Prevents
// false-positive mixed-script warnings for languages like Japanese
// (Han + Hiragana + Katakana) while still flagging cross-locale mixes like
// Latin + Hiragana. enabledLangScriptSets comes from getEnabledLangScriptSets.
function isSingleLocaleScriptMix(labelScripts, enabledLangScriptSets) {
  const scripts = [...labelScripts].filter(s => s !== 'Common' && s !== 'Inherited');
  if (scripts.length <= 1) return true;
  for (const localeSet of enabledLangScriptSets) {
    if (scripts.every(s => localeSet.has(s))) return true;
  }
  return false;
}

// Builds the list of script-sets that represent legitimate single-label script
// combinations for the current user. One Set per locale/language: a label's
// script mix is acceptable if every script in the label is present in at least
// one of these sets.
// locales       — BCP 47 codes from navigator.languages
// additionalLangScripts — array of string arrays from explicitly enabled
//                 languages in the options page, e.g. [['Cyrillic','Latin']]
function getEnabledLangScriptSets(locales, additionalLangScripts) {
  const sets = [];
  for (const locale of (locales || [])) {
    sets.push(new Set(getScriptsForLocale(locale)));
  }
  for (const scripts of (additionalLangScripts || [])) {
    sets.push(new Set(scripts));
  }
  return sets;
}

// List of Unicode scripts for character detection.
// Always-permitted scripts are listed first so getCharScript returns early for
// the most common case (ASCII / Latin characters on Latin-locale hostnames).
const KNOWN_SCRIPTS = [
  'Common', 'Inherited', 'Latin',
  // High-traffic scripts
  'Cyrillic', 'Greek', 'Arabic', 'Hebrew', 'Han',
  'Hiragana', 'Katakana', 'Hangul', 'Thai', 'Devanagari',
  // Other scripts present in the locale map
  'Lao', 'Khmer', 'Myanmar', 'Georgian', 'Armenian',
  'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali',
  'Gujarati', 'Gurmukhi', 'Oriya', 'Sinhala', 'Mongolian',
  'Tibetan', 'Thaana', 'Canadian_Aboriginal', 'Cherokee',
  // Extended: scripts used in actual IDN registrations
  'Ethiopic', 'Syriac', 'Nko', 'Tifinagh', 'Vai', 'Osmanya',
  'Adlam', 'Bamum', 'Balinese', 'Batak', 'Bopomofo',
  'Buginese', 'Buhid', 'Cham', 'Coptic', 'Glagolitic',
  'Hanunoo', 'Javanese', 'Kayah_Li', 'Lisu', 'Mandaic',
  'Meetei_Mayek', 'Miao', 'New_Tai_Lue', 'Newa', 'Nushu',
  'Ogham', 'Ol_Chiki', 'Osage', 'Pahawh_Hmong', 'Phags_Pa',
  'Rejang', 'Runic', 'Samaritan', 'Saurashtra', 'Sharada',
  'Shavian', 'Sundanese', 'Syloti_Nagri', 'Tagalog', 'Tagbanwa',
  'Tai_Le', 'Tai_Tham', 'Tai_Viet', 'Takri', 'Tirhuta',
  'Ugaritic', 'Warang_Citi', 'Yi', 'Deseret', 'Limbu',
  'Lepcha', 'Sora_Sompeng', 'Chakma', 'Mro', 'Pau_Cin_Hau',
  'Mende_Kikakui', 'Old_Hungarian', 'Zanabazar_Square',
];

// Compiled once at load time; getCharScript uses these instead of constructing
// new RegExp objects on every cache miss.
const SCRIPT_REGEXES = (() => {
  const m = new Map();
  for (const script of KNOWN_SCRIPTS) {
    try { m.set(script, new RegExp(`\\p{Script=${script}}`, 'u')); }
    catch (e) { /* skip any script names the current JS engine doesn't support */ }
  }
  return m;
})();

/**
 * Gets the Unicode script property of a single character.
 *
 * @param {string} char - Single character to analyze
 * @returns {string|null} Unicode script name, or null if unknown/not a letter
 */
// Per-character script lookup cache. Avoids reconstructing 70+ RegExp objects
// for every character on every uncached hostname.
const scriptCache = new Map();

function getCharScript(char) {
  const hit = scriptCache.get(char);
  if (hit !== undefined) return hit;

  function cache(val) { scriptCache.set(char, val); return val; }

  // Supplementary-plane characters (code point > U+FFFF, e.g. Osmanya U+10480+)
  // occupy two UTF-16 code units and have .length === 2. Count code points via
  // spread so they are processed correctly instead of being silently dropped.
  if ([...char].length !== 1) return cache(null);

  const code = char.codePointAt(0);
  // Directional control characters (LTR/RTL overrides, embeds, isolates — U+202A–202E,
  // U+2066–2069) are Unicode Script=Common, so they would otherwise be silently permitted.
  // No legitimate hostname contains them; return 'Unknown' so they trigger a block.
  if ((code >= 0x202A && code <= 0x202E) || (code >= 0x2066 && code <= 0x2069)) {
    return cache('Unknown');
  }
  // Fast-range detection for Cyrillic to avoid any engine-specific Unicode script edge cases
  if (
    (code >= 0x0400 && code <= 0x04FF) ||
    (code >= 0x0500 && code <= 0x052F) ||
    (code >= 0x2DE0 && code <= 0x2DFF) ||
    (code >= 0xA640 && code <= 0xA69F)
  ) {
    return cache('Cyrillic');
  }

  for (const [script, regex] of SCRIPT_REGEXES) {
    if (regex.test(char)) {
      return cache(script);
    }
  }

  // Safety net: any non-ASCII character that reached this point was not matched
  // by any known script — treat it as 'Unknown' so it is blocked rather than
  // silently permitted. ASCII characters (code <= 0x7F) are left as null so
  // that hyphens, dots, and digits are correctly ignored.
  if (code > 0x7F) return cache('Unknown');

  return cache(null);
}

/**
 * Checks if a hostname is allowed based on permitted scripts.
 *
 * @param {string} hostname - The decoded hostname to check
 * @param {Set<string>} permittedScripts - Set of allowed script names
 * @returns {object} { allowed: boolean, offendingChar?: string, script?: string }
 */
function isHostnameAllowed(hostname, permittedScripts) {
  const seen = new Map(); // char -> script, deduped
  for (const char of hostname) {
    const script = getCharScript(char);
    if (script && !permittedScripts.has(script) && !seen.has(char)) {
      seen.set(char, script);
    }
  }
  if (seen.size > 0) {
    const offendingChars = Array.from(seen.entries()).map(([char, script]) => ({ char, script }));
    return { allowed: false, offendingChar: offendingChars[0].char, script: offendingChars[0].script, offendingChars };
  }
  return { allowed: true };
}

/**
 * Minimal punycode decoder (RFC 3492)
 * Decodes xn-- prefixed labels to Unicode
 *
 * @param {string} punycode - Punycode label (without xn-- prefix)
 * @returns {string} Decoded Unicode string
 */
function decodePunycode(punycode) {
  // Minimal punycode decoder for IDN homograph detection
  // Based on RFC 3492 simplified implementation
  const BASE = 36;
  const TMIN = 1;
  const TMAX = 26;
  const SKEW = 38;
  const DAMP = 700;
  const INITIAL_BIAS = 72;
  const INITIAL_N = 128;

  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;
  let output = [];

  // Split at last hyphen delimiter
  const lastHyphen = punycode.lastIndexOf('-');
  let encoded;
  if (lastHyphen >= 0) {
    // Add basic code points before the delimiter
    for (let j = 0; j < lastHyphen; j++) {
      output.push(punycode.charCodeAt(j));
    }
    encoded = punycode.slice(lastHyphen + 1);
  } else {
    encoded = punycode;
  }

  let pos = 0;
  while (pos < encoded.length) {
    let oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      const cp = encoded.charCodeAt(pos++);
      let val;
      if (cp >= 48 && cp <= 57) {
        val = cp - 22; // '0'..'9' -> 26..35
      } else if (cp >= 65 && cp <= 90) {
        val = cp - 65; // 'A'..'Z' -> 0..25
      } else if (cp >= 97 && cp <= 122) {
        val = cp - 97; // 'a'..'z' -> 0..25
      } else {
        return punycode; // Invalid character
      }
      if (pos > encoded.length) return punycode; // Invalid
      i += val * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (val < t) break;
      w *= BASE - t;
    }
    bias = adapt(i - oldi, output.length + 1, oldi === 0);
    n += Math.floor(i / (output.length + 1));
    i %= output.length + 1;
    output.splice(i, 0, n);
    i++;
  }

  return String.fromCodePoint(...output);
}

/**
 * Adapt bias for punycode decoding
 */
function adapt(delta, numpoints, first) {
  const BASE = 36;
  const TMIN = 1;
  const TMAX = 26;
  const SKEW = 38;
  const DAMP = 700;
  
  delta = first ? Math.floor(delta / DAMP) : Math.floor(delta / 2);
  delta += Math.floor(delta / numpoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) / 2) {
    delta = Math.floor(delta / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor((BASE - TMIN + 1) * delta / (delta + SKEW));
}

/**
 * Decodes a punycode-encoded hostname to Unicode.
 * Handles domains with multiple labels (e.g., www.xn--example.com)
 *
 * @param {string} url - Full URL string
 * @returns {string} Decoded hostname
 */
function decodeHostname(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch (e) {
    // Some IDN hostnames fail IDNA validation in the URL parser (e.g. mixed-script
    // domains like xn--ggle-0nd42c.com). Fall back to regex extraction so we still
    // scan the raw punycode labels rather than passing the URL through unblocked.
    const match = url.match(/^[a-z][a-z0-9+\-.]*:\/\/([^/?#@]+)/i);
    if (!match) return '';
    hostname = match[1].replace(/:\d+$/, '');
  }
  try {
    // Normalise Unicode dot variants to ASCII '.' before splitting into labels.
    // The WHATWG URL parser handles these in the main path, but the regex fallback
    // above does not. U+3002 IDEOGRAPHIC FULL STOP, U+FF0E FULLWIDTH FULL STOP,
    // U+FF61 HALFWIDTH IDEOGRAPHIC FULL STOP.
    hostname = hostname.replace(/[。．｡]/g, '.');
    return hostname.split('.').map(label => {
      const decoded = label.toLowerCase().startsWith('xn--')
        ? decodePunycode(label.slice(4))
        : label;
      // Strip invisible format characters — none are valid in a hostname label:
      // U+200B ZWS, U+200C ZWNJ, U+200D ZWJ, U+FEFF BOM/ZWNBSP.
      // Then apply NFKC to collapse compatibility variants
      // (e.g. fullwidth Latin ａ→a, ℓ→l) so they can't bypass script detection.
      return decoded.replace(/[\u200B-\u200D\uFEFF]/g, '').normalize('NFKC');
    }).join('.');
  } catch (e) {
    return '';
  }
}

// Maps human-readable language names (as shown in the options UI) to the
// Unicode scripts required to write them. Used to derive permitted scripts
// from the user's enabled-language list.
const LANGUAGE_SCRIPTS = {
  'English': ['Latin'],
  'Spanish': ['Latin'],
  'French': ['Latin'],
  'German': ['Latin'],
  'Italian': ['Latin'],
  'Portuguese': ['Latin'],
  'Dutch': ['Latin'],
  'Swedish': ['Latin'],
  'Norwegian': ['Latin'],
  'Danish': ['Latin'],
  'Finnish': ['Latin'],
  'Polish': ['Latin'],
  'Czech': ['Latin'],
  'Slovak': ['Latin'],
  'Hungarian': ['Latin'],
  'Romanian': ['Latin'],
  'Turkish': ['Latin'],
  'Vietnamese': ['Latin'],
  'Indonesian': ['Latin'],
  'Malay': ['Latin'],
  'Filipino': ['Latin'],
  'Catalan': ['Latin'],
  'Galician': ['Latin'],
  'Basque': ['Latin'],
  'Afrikaans': ['Latin'],
  'Esperanto': ['Latin'],
  'Russian': ['Cyrillic'],
  'Ukrainian': ['Cyrillic'],
  'Bulgarian': ['Cyrillic'],
  'Serbian': ['Cyrillic', 'Latin'],
  'Macedonian': ['Cyrillic'],
  'Belarusian': ['Cyrillic'],
  'Kazakh': ['Cyrillic'],
  'Kyrgyz': ['Cyrillic'],
  'Tajik': ['Cyrillic'],
  'Uzbek': ['Cyrillic'],
  'Mongolian': ['Cyrillic'],
  'Greek': ['Greek'],
  'Arabic': ['Arabic'],
  'Urdu': ['Arabic'],
  'Persian': ['Arabic'],
  'Pashto': ['Arabic'],
  'Hebrew': ['Hebrew'],
  'Japanese': ['Han', 'Hiragana', 'Katakana'],
  'Chinese (Simplified)': ['Han'],
  'Chinese (Traditional)': ['Han'],
  'Korean': ['Han', 'Hangul'],
  'Hindi': ['Devanagari'],
  'Marathi': ['Devanagari'],
  'Sanskrit': ['Devanagari'],
  'Bengali': ['Bengali'],
  'Punjabi (Gurmukhi)': ['Gurmukhi'],
  'Gujarati': ['Gujarati'],
  'Odia': ['Oriya'],
  'Tamil': ['Tamil'],
  'Telugu': ['Telugu'],
  'Kannada': ['Kannada'],
  'Malayalam': ['Malayalam'],
  'Thai': ['Thai'],
  'Lao': ['Lao'],
  'Khmer': ['Khmer'],
  'Burmese': ['Myanmar'],
  'Sinhala': ['Sinhala'],
  'Armenian': ['Armenian'],
  'Georgian': ['Georgian'],
  'Canadian Aboriginal': ['Canadian_Aboriginal'],
  'Cherokee': ['Cherokee']
};

// Scripts always permitted regardless of settings — hardcoded in request filtering.
const ALWAYS_PERMITTED = new Set(['Latin', 'Common', 'Inherited']);

// Derives everything needed from a set/array of enabled language names:
//   additionalScripts    — non-always-permitted scripts to add to the blocking filter
//   additionalLangScripts — per-language script arrays for isSingleLocaleScriptMix
//   derivedLanguages     — languages auto-enabled because all their scripts are
//                          already permitted by another enabled language; never
//                          stored, used only for UI display (checkboxes + colouring)
//
// permittedBase: optional extra scripts to include when computing derivedLanguages
// (options.js passes getLocaleScripts() so locale-seeded scripts count toward
// derivation; background.js omits it and ignores derivedLanguages entirely).
function computeScriptsFromLanguages(enabledLanguages, permittedBase) {
  const enabled = enabledLanguages instanceof Set ? enabledLanguages : new Set(enabledLanguages);
  const additionalScripts = new Set();
  const additionalLangScripts = [];

  for (const lang of enabled) {
    const scripts = LANGUAGE_SCRIPTS[lang];
    if (!scripts) continue;
    additionalLangScripts.push(scripts);
    for (const s of scripts) {
      if (!ALWAYS_PERMITTED.has(s)) additionalScripts.add(s);
    }
  }

  // Build the full permitted set used for derivation.
  const permittedForDerivation = new Set([...ALWAYS_PERMITTED, ...additionalScripts, ...(permittedBase || [])]);

  // Derive auto-enabled languages: a language is derived when it has exactly one
  // non-always-permitted script and that script is already permitted through
  // another enabled language (or the locale).
  const derivedLanguages = new Set();
  for (const [lang, scripts] of Object.entries(LANGUAGE_SCRIPTS)) {
    if (enabled.has(lang)) continue;
    const nonAlways = scripts.filter(s => !ALWAYS_PERMITTED.has(s));
    if (scripts.length === 1 && nonAlways.length === 1 && permittedForDerivation.has(nonAlways[0])) {
      derivedLanguages.add(lang);
    }
  }

  return { additionalScripts, additionalLangScripts, derivedLanguages };
}

// Test cases as per prompt
function runTests() {
  console.log('Running tests for unicode-scripts.js');

  // Test 1: Clean Latin domain (should allow)
  const permittedLatin = getPermittedScripts(['en']);
  const result1 = isHostnameAllowed('example.com', permittedLatin);
  console.log('Test 1 (example.com):', result1.allowed ? 'PASS' : 'FAIL');

  // Test 2: Mixed Cyrillic/Latin homograph attack (should block for English user)
  const result2 = isHostnameAllowed('аррӏе.com', permittedLatin); // Cyrillic 'а' and 'ӏ' look like 'a' and 'l'
  console.log('Test 2 (аррӏе.com):', !result2.allowed ? 'PASS' : 'FAIL', result2.offendingChar, result2.script);

  // Test 3: Legitimate Japanese domain (should allow for Japanese user)
  const permittedJa = getPermittedScripts(['ja']);
  const result3 = isHostnameAllowed('例え.テスト', permittedJa); // Japanese characters
  console.log('Test 3 (例え.テスト):', result3.allowed ? 'PASS' : 'FAIL');

  // Test 4: Whitelisted domain (simulate whitelist check)
  // For this test, assume whitelist contains 'аррӏе.com'
  const whitelist = new Set(['аррӏе.com']);
  const hostname4 = 'аррӏе.com';
  const isWhitelisted = whitelist.has(hostname4);
  const result4 = isHostnameAllowed(hostname4, permittedLatin);
  const final4 = isWhitelisted || result4.allowed;
  console.log('Test 4 (whitelisted аррӏе.com):', final4 ? 'PASS' : 'FAIL');

  console.log('Tests completed.');
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getScriptsForLocale,
    getPermittedScripts,
    getCharScript,
    isHostnameAllowed,
    decodeHostname,
    getConfusableChars,
    isSingleLocaleScriptMix,
    getEnabledLangScriptSets,
    LANGUAGE_SCRIPTS,
    ALWAYS_PERMITTED,
    computeScriptsFromLanguages,
    runTests
  };
}

// Run tests only when executed directly (node unicode-scripts.js), not when imported
if (typeof module !== 'undefined' && require.main === module) {
  runTests();
}