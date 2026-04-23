# url-lookalike-blocker

A Firefox extension that protects against IDN homograph attacks — attempts by attackers to register domain names that look identical to legitimate sites by substituting visually similar characters from other Unicode scripts (e.g. Cyrillic `а` in place of Latin `a`).

**Firefox only.** Chrome's Manifest V3 does not support blocking `webRequest`, which is required for dynamic Unicode script detection.

## How it works

When you navigate to a URL, the extension decodes the hostname from punycode and checks every character against the list of permitted Unicode scripts for your locale. Three things can happen:

1. **Blocked** — a character belongs to a script that is not in your permitted set. Navigation stops and a details page is shown.
2. **Warning** — all characters are from permitted scripts, but the domain contains a known confusable character (a codepoint that visually resembles a different character, e.g. Cyrillic `о` looking like Latin `o`), or the domain mixes characters from two or more different scripts. A warning page is shown with the option to continue or go back.
3. **Allowed** — all characters are from permitted scripts with no confusable or mixed-script concerns.

Latin characters are always permitted — disabling them would block too many legitimate URLs.

## Blocked page

When a URL is blocked, a details page is shown with:
- The original (punycode) and decoded Unicode forms of the domain
- A table of every non-compliant character, its Unicode codepoint, and the script it belongs to

From the blocked page you can:
- **Allow This Domain** — adds the domain to the whitelist so it is never blocked again, then navigates to the URL
- **Go Back** — returns to the previous page
- **Open Extension Settings** — opens the options page in a new tab; if you enable the required scripts and click Apply, the blocked tab automatically navigates back to the URL

## Warning page

When a URL passes the script check but contains confusable characters or mixes scripts, a warning page is shown with the same domain details plus a **Looks like** column identifying what each suspicious character resembles.

From the warning page you can:
- **Allow This Domain** — permanently whitelists the domain
- **Continue Anyway** — allows the domain for this browser session only (cleared on restart)
- **Go Back** — returns to the previous page
- **Open Extension Settings** — opens the options page in a new tab

## Options page

Click the toolbar icon to open the options page in a new tab.

The options page has two sections:

**Whitelisted Domains** — lists domains you have explicitly allowed. Each entry shows the Unicode domain (with suspicious characters highlighted), the punycode form, and the characters that triggered the original block. Entries can be removed here.

**Permitted Scripts** — a table of languages and their Unicode scripts. Check a language to permit all its scripts, or check individual scripts in the same row. Languages that use only the Latin script are listed separately at the bottom and cannot be changed.

Changes are **not saved automatically**. Click **Apply Changes** (or **Apply & Retry** when opened from a blocked page) to save. Closing the tab with unsaved changes will prompt a browser warning. Click **Discard Changes** to reload the page and abandon any changes.

## Known limitations

The extension detects single characters that visually resemble a different character (e.g. Cyrillic `а` looking like Latin `a`). It does not currently detect multi-character sequences that resemble a single character (e.g. `rn` → `m`, `vv` → `w`, `cl` → `d`). Detecting these without a list of known legitimate domains to compare against would produce too many false positives.

## License

Dual-licensed under **GPL-3.0 OR MPL-2.0** — choose whichever suits your use case. See `dual-licensing.md` for details.
