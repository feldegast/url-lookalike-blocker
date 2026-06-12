import json, re
from pathlib import Path

staging = Path("dev/review-staging")

# Strip manifest
m = json.loads((staging / "manifest.json").read_text())
m["background"]["scripts"] = [s for s in m["background"]["scripts"] if s != "background-dev.js"]
m["permissions"] = [p for p in m["permissions"] if p != "downloads"]
(staging / "manifest.json").write_text(json.dumps(m, indent=2))
print("manifest.json: removed background-dev.js and downloads")
print("  scripts:", m["background"]["scripts"])
print("  permissions:", m["permissions"])

# Strip pages-dev.js script tag from HTML files
tag = re.compile(r'\s*<script src="pages-dev\.js"></script>')
for name in ("blocked.html", "warning.html", "options.html"):
    p = staging / name
    if p.exists():
        original = p.read_text()
        updated = tag.sub("", original)
        if updated != original:
            p.write_text(updated)
            print(f"{name}: removed pages-dev.js script tag")

# Strip DEV-BEGIN / DEV-END blocks from JS files
dev_block = re.compile(r'\s*// DEV-BEGIN.*?// DEV-END\n?', re.DOTALL)
for p in staging.rglob("*.js"):
    original = p.read_text()
    updated = dev_block.sub("", original)
    if updated != original:
        p.write_text(updated)
        print(f"{p.name}: removed DEV block(s)")

# Verify no dev references remain
issues = []
for f in list(staging.rglob("*.json")) + list(staging.rglob("*.html")) + list(staging.rglob("*.js")):
    text = f.read_text()
    if "-dev.js" in text or "DEV-BEGIN" in text or "_devHooks" in text:
        issues.append(str(f))

if issues:
    for i in issues:
        print(f"WARNING: dev reference still present in {i}")
else:
    print("Verification passed: no dev references remaining")
