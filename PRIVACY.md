# Privacy Policy — URL Lookalike Blocker

URL Lookalike Blocker collects no data. All processing happens locally in your browser. No information about the URLs you visit, the domains the extension blocks or warns about, or your extension settings is ever transmitted to any server, including ours.

## What is stored locally

The extension uses your browser's built-in `storage.local` API to remember your preferences across sessions. The stored values are:

- The set of languages whose Unicode scripts you have permitted beyond your locale defaults.
- The list of domains you have explicitly whitelisted.
- Your interface preferences: theme choice; whether drop shadows are shown; whether the private-browsing warning is dismissed.

The extension also keeps a small `localStorage` cache of two preferences (your theme and the show-shadows setting) so the next page-load can apply them synchronously and avoid a brief flash of the previous theme. This cache contains only those two values and never leaves your browser.

Everything listed above is stored on your device only and is removed if you uninstall the extension.

## What is not collected

The extension does not:

- Send any data to any server.
- Modify the content of the pages you visit.
- Inject scripts into pages you visit.
- Read or share page contents, cookies, browsing history, or any other browser data.
- Use third-party analytics, tracking, or telemetry services.

The `data_collection_permissions` field in the extension's manifest is declared as `"none"`, which Firefox uses to surface the no-collection status to you.

## Permissions

The extension requests the minimum permissions needed for its function:

- **`webRequest`** and **`webRequestBlocking`** — to inspect the hostname of each navigation request and redirect to the block or warning page if necessary. The hostname is held in memory only for the duration of the check; it is never stored or transmitted.
- **`storage`** — to persist the preferences listed above.
- **`menus`** — to add "Open Options" and "Help" items to the extension icon's right-click menu.
- **`<all_urls>`** host permission — required by `webRequest` to inspect navigation to any site. The extension does not read page contents on any site; it only inspects the hostname portion of the URL.

## Contact

Questions or concerns about privacy: open an issue at
[github.com/feldegast/url-lookalike-blocker/issues](https://github.com/feldegast/url-lookalike-blocker/issues)
or email aussiefeld@gmail.com.
