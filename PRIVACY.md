# Privacy Policy — URL Lookalike Blocker

URL Lookalike Blocker collects no data. All hostname checking happens locally in your browser. No information about the URLs you visit, the domains the extension blocks or warns about, or your extension settings is ever transmitted to the extension developer or any third party.

## What is stored

### Synced settings (browser account)

The following settings are stored using your browser's built-in `storage.sync` API and are synced across your devices if you are signed into your browser account (Google account in Chrome; Firefox account in Firefox):

- The set of languages whose Unicode scripts you have permitted beyond your locale defaults.
- The list of domains you have explicitly whitelisted.

This data is transmitted by your browser to Google's or Mozilla's sync servers as part of the normal account sync mechanism. The extension developer has no access to this data.

### Local-only settings

The following preferences are stored using `storage.local` and remain on your device only:

- Your interface preferences: theme choice; whether drop shadows are shown; whether the private-browsing warning is dismissed.

The extension also keeps a small `localStorage` cache of the theme and shadows preferences so they can be applied synchronously on page load, avoiding a brief flash of the previous theme. This cache never leaves your browser.

All stored data is removed if you uninstall the extension.

## What is not collected

The extension does not:

- Send any data to the extension developer or any server other than your browser's own sync service.
- Modify the content of the pages you visit.
- Inject scripts into pages you visit.
- Read or share page contents, cookies, browsing history, or any other browser data.
- Use third-party analytics, tracking, or telemetry services.

## Permissions

The extension requests the minimum permissions needed for its function.

### Firefox

- **`webRequest`** and **`webRequestBlocking`** — to inspect the hostname of each navigation request and redirect to the block or warning page if necessary. The hostname is held in memory only for the duration of the check; it is never stored or transmitted.
- **`storage`** — to persist the preferences listed above.
- **`menus`** — to add "Open Options" and "Help" items to the extension icon's right-click menu.
- **`<all_urls>`** host permission — required by `webRequest` to inspect navigation to any site. The extension does not read page contents on any site; it only inspects the hostname portion of the URL.

### Chrome

- **`webNavigation`** — to intercept HTTP and HTTPS navigations and check the hostname for homograph characters before the page loads.
- **`storage`** — to persist the preferences listed above.
- **`contextMenus`** — to add "Open Options" and "Help" items to the extension icon's right-click menu.
- **`tabs`** — to redirect blocked tabs to the block or warning page, track which tabs are showing a block or warning page, and return focus to a blocked tab after settings are applied.
- **`<all_urls>`** host permission — required by `webNavigation` to intercept navigation to any site. The extension does not read page contents on any site; it only inspects the hostname portion of the URL.

## Contact

Questions or concerns about privacy: open an issue at
[github.com/feldegast/url-lookalike-blocker/issues](https://github.com/feldegast/url-lookalike-blocker/issues)
or email aussiefeld@gmail.com.
