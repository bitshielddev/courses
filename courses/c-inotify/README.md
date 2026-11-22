# Anatomy of a Neovim save

Systems project 01. Build a C17 monitor for one scratch directory, then compare a shell append, a rename over an existing file, and your own Neovim `:w`. Each lesson has reading, questions with feedback, and a NixOS lab. The browser stores the lab notebook and progress. The C is compiled and run in a Linux terminal.

- Mode: **lab**
- Live: https://c-inotify.courses.bitshield.dev
- Local: open [index.html](index.html) straight from this folder.
- Saved progress: `localStorage["c-field-manual-inotify-v1"]`. Never change it.
- Links to: [C / Field Manual](../c-intro/README.md), from the sidebar.

## Files

| Path | Contents |
| --- | --- |
| `index.html` | The page. Loads the lessons, then `engine/core` and `engine/lab`. No compiler. |
| `lessons/01-anatomy-of-a-save.js` | Five lessons: build the monitor, then investigate a save. |
| `lab/watch-start.c`, `lab/watch.c`, `lab/check-watch.sh` | The C starter, the reference monitor and the watcher self-test. Learners `curl` them from `/lab/`, so keep those paths. |
| `checks.cjs` | Confirms each download holds the program the lessons describe. |
| `course.json`, `wrangler.jsonc` | Published files; Worker `c-inotify` on `c-inotify.courses.bitshield.dev`. |

## Checking and deploying

```bash
npm run check -- c-inotify
npm run deploy -- c-inotify
node tools/verify.cjs c-inotify --url https://c-inotify.courses.bitshield.dev/
```

## Deployment history

| Date | Version ID | Notes |
| --- | --- | --- |
| 2026-11-18 | `6f44809d-a718-46d2-b3f5-94c7c5ab00c3` | Five lessons, ten questions, native C starter, reference monitor and self-test. |
