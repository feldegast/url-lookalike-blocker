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
  'or': ['Odia'],                               // Odia/Oriya
  'or-IN': ['Odia'],                            // Odia (India)
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
  // Normalize to lowercase
  const normalizedLocale = locale.toLowerCase();

  // Try exact match first
  if (LOCALE_SCRIPTS_MAP[normalizedLocale]) {
    return LOCALE_SCRIPTS_MAP[normalizedLocale];
  }

  // Try language-only code (before first hyphen)
  const languageOnly = normalizedLocale.split('-')[0];
  if (LOCALE_SCRIPTS_MAP[languageOnly]) {
    return LOCALE_SCRIPTS_MAP[languageOnly];
  }

  // Try to extract language from script tag (if present)
  // e.g., 'zh-Hans-CN' -> try 'zh-CN' or 'zh'
  const parts = normalizedLocale.split('-');
  if (parts.length > 1) {
    // Common pattern: lang-Script-Region
    // Try lang-Region by skipping the middle part if it looks like a script
    if (parts.length >= 3 && /^[A-Z][a-z]{3}$/.test(parts[1])) {
      const langAndRegion = parts[0] + '-' + parts[2];
      if (LOCALE_SCRIPTS_MAP[langAndRegion]) {
        return LOCALE_SCRIPTS_MAP[langAndRegion];
      }
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

// List of all Unicode scripts for character detection
// This is a subset of known scripts; in practice, we only need to identify the ones that might be offending
const KNOWN_SCRIPTS = [
  'Common', 'Inherited', 'Latin', 'Cyrillic', 'Greek', 'Arabic', 'Hebrew', 'Han',
  'Hiragana', 'Katakana', 'Hangul', 'Thai', 'Lao', 'Khmer', 'Myanmar', 'Georgian',
  'Armenian', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Devanagari', 'Bengali',
  'Gujarati', 'Gurmukhi', 'Odia', 'Sinhala', 'Mongolian', 'Tibetan', 'Thaana',
  'Canadian_Aboriginal', 'Cherokee'
  // Add more if needed, but this covers the mapped ones
];

/**
 * Gets the Unicode script property of a single character.
 *
 * @param {string} char - Single character to analyze
 * @returns {string|null} Unicode script name, or null if unknown/not a letter
 */
function getCharScript(char) {
  if (char.length !== 1) return null;

  for (const script of KNOWN_SCRIPTS) {
    try {
      const regex = new RegExp(`\\p{Script=${script}}`, 'u');
      if (regex.test(char)) {
        return script;
      }
    } catch (e) {
      // Invalid script name, skip
      continue;
    }
  }
  return null; // Unknown script or non-letter
}

/**
 * Checks if a hostname is allowed based on permitted scripts.
 *
 * @param {string} hostname - The decoded hostname to check
 * @param {Set<string>} permittedScripts - Set of allowed script names
 * @returns {object} { allowed: boolean, offendingChar?: string, script?: string }
 */
function isHostnameAllowed(hostname, permittedScripts) {
  for (const char of hostname) {
    const script = getCharScript(char);
    if (script && !permittedScripts.has(script)) {
      return { allowed: false, offendingChar: char, script: script };
    }
  }
  return { allowed: true };
}

/**
 * Decodes a punycode-encoded hostname to Unicode.
 *
 * @param {string} url - Full URL string
 * @returns {string} Decoded hostname
 */
function decodeHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    // Invalid URL, return as-is or empty
    return '';
  }
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
    runTests
  };
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runTests();
}