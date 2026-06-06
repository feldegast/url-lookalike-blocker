# TODO / Future Features

## Active — restore box-shadow rules after screenshot recapture

Box-shadow CSS rules across `extension/blocked.html`, `extension/warning.html`, `extension/options.html`, and `extension/help.html` (~19 declarations total) have been commented out with `/* ... */` markers as of 2026-06-07 so help-page screenshots can be captured without shadow halos bleeding into the crops. The shipped UI is meant to keep its drop shadows — they "look good, just a pain for cropping". Once the screenshot recapture pass is complete, uncomment every `/* box-shadow: ... */` declaration in the four HTML files. Find them with `grep -rn "/\* box-shadow" extension/*.html`.

## Dark Mode / Light Mode Theming

**Goal:** Make the options, block, and warning pages respect the user's OS dark/light preference rather than always showing a white background.

**Approach:** Use the `prefers-color-scheme` CSS media query across all three HTML files (`options.html`, `blocked.html`, `warning.html`). No JavaScript needed — CSS-only change.

**Decided against** Firefox Theme API (too many theme combinations to test) — OS-level dark/light covers the vast majority of users with minimal complexity.

## Domain Age Check (RDAP)

**Goal:** Catch typosquatting by flagging recently registered domains.

**Approach:** Query RDAP (free, standard HTTP/JSON protocol — e.g. `https://rdap.org/domain/<hostname>`) to retrieve the domain registration date, then display it as extra context on the block page alongside the existing character table. Not a blocking condition on its own — too noisy — just an informational signal for the user.

**Only run on already-flagged domains** to avoid adding latency to normal browsing. Cache results in `browser.storage.local` so repeat visits don't re-query.

**Concerns to address before implementing:**
- RDAP coverage gaps for some ccTLDs
- Rate limits on public RDAP servers
- The async lookup should not delay the block page render — fetch in parallel and update the page if/when the result arrives
- Consider making this an opt-in setting in the options page
