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
- **Vanilla JS.** No frameworks. The extension uses plain `browser.*` MV3 APIs throughout.
- **Comments capture the WHY**, not the WHAT. Named identifiers describe behaviour; comments are reserved for non-obvious constraints, subtle invariants, or workarounds for specific bugs.
- **Match indentation** of the file you are editing (2 spaces).
- **Keep permissions minimal.** Any change that requires a new manifest permission needs justification in the PR description, since the AMO review will ask the same question.

## Repository layout

- `extension/` — the AMO-submittable extension. Every file here ships.
- `dev/` — development tooling and reference material. Excluded from AMO uploads.
- `TODO.md` — planned future work.
- `CHANGELOG.md` — version history.

`README.md` and `dev/test-plan.md` cover the architecture and manual test coverage in more detail.

## Code of conduct

Be respectful in issues and PR discussions. This is a small project; politeness costs nothing and makes collaboration possible.
