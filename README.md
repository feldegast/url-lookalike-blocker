# url-lookalike-blocker

A Firefox extension that prevents IDN homograph attacks by blocking navigation to URLs containing character types that have not been explicitly permitted. If a URL contains characters from multiple scripts, all scripts must be approved. Latin characters are always permitted — disabling them would block too many legitimate URLs.

**Firefox only.** Chrome's Manifest V3 does not support blocking `webRequest`, which is required for dynamic Unicode script detection.

## How it works

When you navigate to a URL, the extension decodes the hostname from punycode and checks every character against the list of permitted Unicode scripts for your locale. If any character belongs to a script that is not permitted, navigation is blocked.

## Blocked page

When a URL is blocked, a details page is shown with:
- The original (punycode) and decoded Unicode forms of the domain
- A table of every non-compliant character, its Unicode codepoint, and the script it belongs to

From the blocked page you can:
- **Allow This Domain** — adds the domain to the whitelist so it is never blocked again, then navigates to the URL
- **Go Back** — returns to the previous page
- **Open Extension Settings** — opens the options page in a new tab; if you enable the required scripts and click Apply, the blocked tab automatically navigates back to the URL

## Options page

Click the toolbar icon to open the options page in a new tab.

The options page has two sections:

**Whitelisted Domains** — lists domains you have explicitly allowed. Entries can be removed here.

**Permitted Scripts** — a tree of languages and their Unicode scripts. Check a language to permit all its scripts, or expand it to enable individual scripts. Languages that use only the Latin script are listed separately at the bottom and cannot be changed.

Changes are **not saved automatically**. Click **Apply Changes** (or **Apply & Retry** when opened from a blocked page) to save. Closing the tab with unsaved changes will prompt a browser warning. Click **Discard Changes** to reload the page and abandon any changes.

## License

Dual-licensed under **GPL-3.0 OR MPL-2.0** — choose whichever suits your use case. See `LICENSE.md` for details.
