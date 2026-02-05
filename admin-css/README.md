# admin.css refactor (no behavior change)

Goal: make `admin.css` easier to maintain **without changing anything shipped**.

- `admin.css` remains the canonical, shipped CSS file.
- `admin-css/parts/` contains the same content split into logical sections.
- `scripts/split-admin-css.mjs` regenerates the parts from `admin.css`.
- `scripts/verify-admin-css.mjs` asserts the concatenation of parts equals `admin.css` byte-for-byte.

## Workflow

1) Edit the appropriate file in `admin-css/parts/`.
2) (Optional) Rebuild `admin.css` by concatenating the parts in the order listed in `admin-css/manifest.json`.
3) Run verification:

- `node scripts/verify-admin-css.mjs`

## Notes

- Markers used to split are the existing `/* ========== ... ========== */` section headers.
- This setup is intentionally conservative: it adds structure without changing runtime loading.
