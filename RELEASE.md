# Release Process

This document describes how to ship a new version of URL Lookalike Blocker to Mozilla AMO and tag it in this repo. The same flow was used for v1.0 (submitted 2026-06-10, tagged at commit `37832e9`) and should apply to every subsequent version.

## Versioning

- Two-part version numbers (e.g. `1.0`, `1.1`, `2.0`). The value in `extension/manifest.json` drives both the AMO release and the git tag.
- The currently shipped version is whatever the most recent `v*` tag points at.
- `CHANGELOG.md` uses [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format. Work-in-progress accumulates under `## [Unreleased]` until release time.

## Pre-submission checklist

Run through this in order on `main` (or a release branch if multiple developers are involved).

### 1. Bump the manifest version

Edit `extension/manifest.json` and set the `version` field to the new value (e.g. `"1.0"` → `"1.1"`).

### 2. Date the CHANGELOG entry

In `CHANGELOG.md`, rename the `## [Unreleased]` heading to `## [<new-version>] — YYYY-MM-DD` using today's date. Optionally add a new empty `## [Unreleased]` heading above it so post-release work has somewhere to land.

### 3. Strip dev-mode files

The dev screenshot capture tool lives in dedicated `*-dev.js` files. Four things must be stripped from the public bundle:

1. **Manifest — scripts array:** remove `"background-dev.js"`
   ```json
   "scripts": ["unicode-scripts.js", "background.js"]
   ```

2. **Manifest — permissions:** remove `"downloads"` (used only by the capture tool)

3. **HTML files — script tags:** remove `<script src="pages-dev.js"></script>` from `blocked.html`, `warning.html`, and `options.html`

4. **JS files — fenced blocks:** remove `// DEV-BEGIN … // DEV-END` blocks from any `.js` file that contains them (currently `options.js`)

The easiest way to do all four correctly is to use `dev/build.sh` (see step 6). If stripping manually, audit afterwards:

```
grep -rn 'pages-dev\|background-dev\|DEV-BEGIN\|DEV-END\|_devHooks\|"downloads"' <staging-dir>/
```

This should return nothing before you zip.

The working files in `extension/` are never modified — the full dev infrastructure remains intact for the next development cycle.

### 4. Regenerate icons if the source changed

If `dev/render_icon_paths.py` or `dev/render_icon_pillow.py` was modified since the last release:

```
python dev/render_icon_paths.py
python dev/render_icon_pillow.py
```

The first command produces `extension/icon.svg` (bundled in the AMO zip). The second produces `dev/listing-icons/icon-{32,64,128}.png` for the AMO listing page. During submission, upload `icon-128.png` separately — AMO auto-downscales it to the smaller sizes. If no icon is supplied separately, AMO may fall back to extracting one from the zip. These files are not bundled with the extension. The extension is SVG-only; there is no `icon.png` to regenerate.

### 5. Recapture help-page screenshots if any UI changed

If any extension page has changed visually since the last release — including text, layout, colours, or new/removed elements — recapture the affected screenshots and update `extension/img/`. Then run:

```
python dev/normalise_screenshots.py extension/img/*.png
python dev/gather-listing-screenshots.py
```

See the runbook at the bottom of `TODO.md` for the full capture workflow. If nothing visual has changed, skip this step.

### 6. Build the submission zips

Run the build script from anywhere inside the repo:

```
bash dev/build.sh
```

This produces two zips in the repo root (both gitignored):

| File | Purpose |
|---|---|
| `url-lookalike-blocker-<version>.zip` | AMO submission — all dev code stripped and verified |
| `url-lookalike-blocker-<version>-dev.zip` | Local testing — full bundle including dev tools |

The script reads the version from `manifest.json` automatically, applies all four strip steps from step 3, runs a verification pass that aborts with a clear error if any dev reference survives, and leaves the working files in `extension/` untouched.

Submit the non-`-dev` zip to AMO.

### 7. Validate locally

Two layers:

- Parse the manifest as JSON to catch syntax errors:

  ```
  python -c "import json; json.load(open('extension/manifest.json')); print('manifest.json valid JSON')"
  ```

- AMO runs an automated validator on upload. If you want to pre-check, you can drag the zip onto the AMO "Validate" page before formal submission.

### 8. Pre-AMO code review (optional but recommended)

A second model can spot fingerprinting, CSP, permission justification, and detection-logic concerns. Drop `dev/review-bundle.zip` into a fresh chat session with the framing in `dev/review-prompt.txt`. The previous reviewer caught the PNG XMP fingerprints and the legacy `bootstrap.js` filename; both turned into shipped fixes before v1.0 reached AMO.

### 9. Commit and push the release commit

Stage `extension/manifest.json`, `CHANGELOG.md`, and any code or asset changes for the release. Push to `main`. The submitted commit is the one whose SHA will be tagged after acceptance.

## Submission

1. Upload `dev/url-lookalike-blocker-<version>-<yyyy-mm-dd>.zip` via the AMO **Edit this version** flow on the existing listing (or **Submit a new add-on** flow for the very first release).
2. Paste reviewer notes from `dev/amo-submission.txt`.
3. Answer the **source-code** question **No** — there is no minification, bundling, or codegen step. AI assistance does not count as "code generation" in Mozilla's sense, as discussed in `CONTRIBUTING.md`.
4. Answer the **data-collection** question **No** — the manifest declares `data_collection_permissions: { "required": ["none"] }`.
5. Listing screenshots: only re-upload if they have changed since the last release. The screenshots described in `dev/amo-submission.txt` apply.

## Post-submission

### After submission

1. **Tag the submitted commit immediately** — the version number is fixed at the point you zip and submit, not when Mozilla approves it:

   ```
   git tag -a v<version> <commit> -m "v<version> — submitted to AMO YYYY-MM-DD"
   git push --tags
   ```

2. **Draft a GitHub Release** on the new tag once AMO accepts it:
   - Title: `v<version>`
   - Body: paste the `## [<version>]` section of `CHANGELOG.md`
   - Attach `dev/review-bundle.zip` as the release asset (consider renaming the file to `url-lookalike-blocker-<version>.zip` first)

3. **Optionally announce** via repo README badge, issue, or wherever you discuss the project.

### If AMO rejects

1. Read the rejection email carefully — Mozilla's reviewers explain what triggered the rejection.
2. Address the issue on a branch off the rejected commit (or `main` if you're solo).
3. **Bump the `manifest.json` version again.** Mozilla will not accept a re-upload of the same version number even after a rejection. If the rejected version was `1.1`, the fixed resubmission becomes `1.1.1` or `1.2`.
4. Run the pre-submission checklist again from step 1.
5. Resubmit via the same listing.

## Reference: v1.0 release

| Aspect | Value |
|---|---|
| Manifest version | `1.0` |
| Submission date | 2026-06-10 |
| Submitted commit | `37832e9` |
| Tag | `v1.0` |
| Min Firefox | 126 |
| Permissions | `webRequest`, `webRequestBlocking`, `storage`, `menus`, `<all_urls>` |
| Data collection declaration | `none` |
| Listing licence | MPL-2.0 (source remains dual-licensed MPL-2.0 OR GPL-3.0) |
| Review verdict at submission | Submitted, awaiting Mozilla review queue |
