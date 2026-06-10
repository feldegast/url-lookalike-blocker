# Release Process

This document describes how to ship a new version of URL Lookalike Blocker to Mozilla AMO and tag it in this repo. The same flow was used for v1.0 (submitted 2026-06-10, tagged at commit `47d0ade`) and should apply to every subsequent version.

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

The dev screenshot capture tool lives in two dedicated files that are **not bundled in the AMO submission**. They reference `captureVisibleTab()` and `downloads.download()` — APIs that AMO reviewers would question regardless of reachability in a domain-blocking extension.

**Files to exclude from the staging copy:**

- `extension/background-dev.js`
- `extension/pages-dev.js`

**Manifest edit — remove `background-dev.js` from the scripts array:**
```json
"scripts": ["unicode-scripts.js", "background.js"]   ← remove "background-dev.js"
```

**Manifest edit — remove the dev-only permission:**
```json
"downloads"   ← delete this line from the permissions array
```

**HTML edits — remove the `pages-dev.js` script tag from each page:**
```html
<script src="pages-dev.js"></script>   ← delete from blocked.html, warning.html, options.html
```

The simplest approach is to perform these edits on the staging copy (created in step 6) rather than on the working files, so the development environment remains fully intact for the next cycle.

After the submission is accepted and you return to development, restore the staging copy to its dev-ready state (or simply use the working files directly — they are already the dev-ready versions).

### 4. Regenerate icons if the source changed

If `dev/render_icon_paths.py` or `dev/render_icon_pillow.py` was modified since the last release:

```
python dev/render_icon_paths.py
python dev/render_icon_pillow.py
python dev/render_listing_icons.py
```

The three commands produce `extension/icon.svg`, `extension/icon.png`, and `dev/listing-icons/icon-{32,64,128}.png` respectively. Only the first two are bundled into the AMO zip; the listing icons are uploaded separately on the AMO listing page if you want crisp small-size renders.

### 5. Strip PNG metadata if screenshots were updated

If new screenshots were added or replaced in `extension/img/`:

```
python dev/strip-png-metadata.py
```

This removes Adobe XMP metadata (Photoshop version, edit-history timestamps, timezone) that Photoshop adds to exported PNGs. Pillow-rendered PNGs do not need this but the script is safe to run on every PNG either way.

### 6. Build the submission zip

The zip must contain only files inside `extension/`, with `manifest.json` at the **zip root** (not under an `extension/` subdirectory). Exclude `extension/img/working files/` (Photoshop source files).

Using PowerShell on Windows:

```
$staging = "dev/review-staging"
if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
Copy-Item -Recurse extension $staging
Remove-Item -Recurse -Force "$staging/img/working files" -ErrorAction SilentlyContinue
if (Test-Path "dev/review-bundle.zip") { Remove-Item "dev/review-bundle.zip" }
Compress-Archive -Path "$staging/*" -DestinationPath "dev/review-bundle.zip"
Remove-Item -Recurse -Force $staging
```

The `dev/review-bundle.zip` filename is conventional; rename if you want a version-stamped artifact for the GitHub release later.

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

1. Upload `dev/review-bundle.zip` via the AMO **Edit this version** flow on the existing listing (or **Submit a new add-on** flow for the very first release).
2. Paste reviewer notes from `dev/amo-submission.txt`.
3. Answer the **source-code** question **No** — there is no minification, bundling, or codegen step. AI assistance does not count as "code generation" in Mozilla's sense, as discussed in `CONTRIBUTING.md`.
4. Answer the **data-collection** question **No** — the manifest declares `data_collection_permissions: { "required": ["none"] }`.
5. Listing screenshots: only re-upload if they have changed since the last release. The screenshots described in `dev/amo-submission.txt` apply.

## Post-submission

### When AMO accepts

Mozilla sends an email once the version is published — typically 1–7 days. Then:

1. **Tag the released commit:**

   ```
   git tag -a v<version> <commit> -m "v<version> — submitted to AMO YYYY-MM-DD"
   git push --tags
   ```

2. **Draft a GitHub Release** on the new tag:
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
| Submitted commit | `47d0ade` |
| Tag | `v1.0` |
| Min Firefox | 126 |
| Permissions | `webRequest`, `webRequestBlocking`, `storage`, `menus`, `<all_urls>` |
| Data collection declaration | `none` |
| Listing licence | MPL-2.0 (source remains dual-licensed MPL-2.0 OR GPL-3.0) |
| Review verdict at submission | Submitted, awaiting Mozilla review queue |
