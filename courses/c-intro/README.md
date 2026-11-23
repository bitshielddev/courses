# C / Field Manual

An interactive C17 course for programmers who know Python, PHP or TypeScript. It has 20 lessons in five parts, with 134 questions and 93 graded challenges. C compiles and runs in the browser with a bundled WebAssembly Clang, so nothing needs installing.

- Mode: **compiler**
- Live: https://c-intro.courses.bitshield.dev (checking copy: https://c-intro.nixprivacy.workers.dev)
- Local: open [index.html](index.html) straight from this folder.
- Saved progress: `localStorage["c-field-manual-v2"]`. Progress from the first edition (`c-field-manual-v1`) is migrated on first load through each challenge's `legacy` id. Never change either key.
- Links to: [Anatomy of a Neovim save](../c-inotify/README.md) and [Rust / Field Manual](../rust-intro/README.md), from the sidebar. The Rust link was added on 2026-11-23, the day `rust-intro` went live. It is in this folder but not in the live copy of this course: it reaches learners with the next deploy of `c-intro`, which also carries the engine changes made for Rust.

## Files

| Path | Contents |
| --- | --- |
| `index.html` | The page. Loads the five lesson files, then `engine/core` and `engine/compiler`. |
| `lessons/01-foundations.js` … `05-wider-language.js` | One file per part. |
| `checks.cjs` | Interface checks only this course has: cells, editor keys, the three question kinds, a challenge failing then passing, reload, first-edition migration and the narrow layout. |
| `course.json`, `wrangler.jsonc` | Published files; Worker `c-intro` on `c-intro.courses.bitshield.dev`. |

## Checking and deploying

```bash
npm run check -- c-intro
node tools/verify.cjs c-intro --native        # also ASan and UBSan builds with the system clang
node tools/verify.cjs c-intro --only heap     # lessons whose id contains "heap"; skips checks.cjs
npm run deploy -- c-intro
```

## Deployment history

| Date | Version ID | Notes |
| --- | --- | --- |
| 2026-11-18 | `8f5aafe6-5e6e-4fa6-b9a3-cb6912e932cf` | First deploy: 20 lessons. Full suite passed live. |
| 2026-11-18 | `39c7d7d7-fc45-48c8-a2fd-65aa9c8f627f` | Predict questions: note that the final `\n` needs no typing, leading spaces now count, spacing mistakes shown with dots. |
| 2026-11-18 | `15aafe41-4adb-4886-a700-8c36596acb77` | Linked the first systems project from the foundation course sidebar. |
