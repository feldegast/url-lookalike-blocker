# Contributing to URL Lookalike Blocker

Thanks for your interest in contributing. The notes below cover the basics — licensing of contributions, how to file issues, and how to submit a pull request.

## Licensing of contributions

This project is dual-licensed under **MPL-2.0 OR GPL-3.0**, with the recipient choosing which terms to comply with. AMO releases are distributed under **MPL-2.0**.

> **By submitting a pull request, you agree that your contribution is licensed under the same terms as this project: MPL-2.0 OR GPL-3.0 at the recipient's choice. You also confirm that you have the right to submit it under these terms — for example, that any code you copy from elsewhere is itself compatible with both MPL-2.0 and GPL-3.0.**

If you cannot agree, please do not submit the contribution. Code that is only compatible with one of the two licences (e.g. GPL-3.0-only snippets from other projects) cannot be merged, because it would prevent continued distribution under MPL-2.0 via AMO.

## Reporting bugs

Open an [issue](https://github.com/feldegast/url-lookalike-blocker/issues) and include:

- Firefox version.
- Operating system.
- A reproducible URL or the steps that triggered the behaviour.
- What you expected vs what happened.
- Any console errors (right-click an extension page → Inspect → Console).

For **security-sensitive** reports — anything that could let a malicious domain bypass the protection — please email aussiefeld@gmail.com instead of opening a public issue.

## Suggesting features

Open an issue describing the use case and the change you have in mind. The `TODO.md` file at the repo root lists planned future work; check there first to avoid duplicates.

## Submitting a pull request

1. **Discuss first** for anything larger than a small bug fix — open an issue describing the change you intend to make. This avoids wasted effort on patches that overlap with planned work or do not fit the project's direction.
2. **Branch from `main`** and keep each PR focused on one concern.
3. **Test your change manually** using the URLs in `dev/test-urls.html`. The detection logic also has Jest tests in `dev/unicode-scripts.test.js` — run `npm test` from the repo root (you will need `npm install` once; `node_modules` is gitignored). Ensure both the existing tests and any you add for new behaviour pass.
4. **Update documentation** if the change affects user-visible behaviour: `README.md`, `help.html`, `dev/test-plan.md`, `dev/amo-submission.txt`, and any relevant images in `extension/img/`.
5. **Match the existing code style** — see the conventions below.
6. **Open the PR** with a clear description of what changed and why. Reference any related issue.

## Code style and conventions

- **No build step.** The extension ships its source files directly. Do not introduce bundlers, minifiers, or transpilers.
- **Developer-only `-dev.js` files.** Files ending in `-dev.js` (currently `background-dev.js` and `pages-dev.js`) live in `extension/` but are **not** bundled into the AMO submission — they're stripped at packaging time (see `RELEASE.md` step 3). They power the "Developer: Capture screenshots" action used to refresh the help-page screenshots in `extension/img/`. New dev-only files should follow the same `-dev.js` suffix so the packaging step excludes them automatically.
- **Vanilla JS.** No frameworks. The extension uses plain `browser.*` MV3 APIs throughout.
- **Comments capture the WHY**, not the WHAT. Named identifiers describe behaviour; comments are reserved for non-obvious constraints, subtle invariants, or workarounds for specific bugs.
- **Match indentation** of the file you are editing (2 spaces).
- **Keep permissions minimal.** Any change that requires a new manifest permission needs justification in the PR description, since the AMO review will ask the same question.

## Regenerating the icon

The icon is generated from two source fonts, only one of which is in the repo:

- **`dev/NotoSansArmenian-Bold.ttf`** — supplied, OFL-licensed. Provides the Armenian Մ and Լ glyphs.
- **`segoeuib.ttf` (Segoe UI Bold)** — *not supplied.* It is a Microsoft proprietary font whose EULA does not permit redistribution. Install it locally before running the scripts:
  - **Windows** — already present at `C:\Windows\Fonts\segoeuib.ttf` (ships with the OS).
  - **Linux** — drop `segoeuib.ttf` into `~/.local/share/fonts/` and run `fc-cache -f`.

Then from the repo root:

```
pip install Pillow fonttools
python dev/render_icon_paths.py     # writes extension/icon.svg (shipped)
python dev/render_help_badges.py    # writes extension/img/badge-{0,1}.svg (shipped)
python dev/render_icon_pillow.py    # writes dev/listing-icons/ PNGs (AMO listing, not shipped)
```

The first two regenerate the assets that ship inside the extension. The third regenerates the PNG listing icons that get uploaded to the AMO listing page (not bundled with the extension). See `dev/README.txt` for the full list of dev-side scripts and their roles.

## Repository layout

- `extension/` — the AMO-submittable extension. Every file here ships.
- `dev/` — development tooling and reference material. Excluded from AMO uploads.
- `TODO.md` — planned future work.
- `CHANGELOG.md` — version history.

`README.md` and `dev/test-plan.md` cover the architecture and manual test coverage in more detail.

## Code of conduct

Be respectful in issues and PR discussions. This is a small project; politeness costs nothing and makes collaboration possible.
