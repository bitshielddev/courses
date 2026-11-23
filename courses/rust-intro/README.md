# Rust / Field Manual

An interactive Rust course for programmers who know Python, PHP or TypeScript and have never managed memory by hand. It has 24 lessons in six parts, with 169 questions, 130 graded challenges (23 of them stretch) and 430 runnable cells. Rust code runs through the Rust Playground, so nothing needs installing.

- Mode: **compiler**, language **Rust** (`data-language="rust"`; stable channel, 2024 edition)
- Live: https://rust-intro.courses.bitshield.dev/ (checking copy: https://rust-intro.nixprivacy.workers.dev)
- Local: open [index.html](index.html) straight from this folder. Run and the challenge tests need a network connection, because they call the Playground.
- Saved progress: `localStorage["rust-intro-v1"]`. Never change this key after the first deploy. Lesson ids and challenge ids are part of the saved progress too.
- Links to: [C / Field Manual](../c-intro/README.md), from the sidebar. `c-intro` links back.
- Plan and decisions: [docs/rust-intro-plan.md](../../docs/rust-intro-plan.md).

## Parts

| Part | Lessons |
| --- | --- |
| 1 · Foundations | 1 `first-program`, 2 `variables-and-types`, 3 `control-flow` |
| 2 · Ownership | 4 `stack-and-heap`, 5 `ownership`, 6 `borrowing`, 7 `mutable-borrows` |
| 3 · Borrowing at work | 8 `slices`, 9 `strings`, 10 `lifetimes` |
| 4 · Data | 11 `structs`, 12 `enums-and-matching`, 13 `option-and-result`, 14 `collections` |
| 5 · Abstraction | 15 `traits-and-generics`, 16 `trait-objects`, 17 `closures`, 18 `iterators`, 19 `error-handling` |
| 6 · Shared ownership & the wider language | 20 `smart-pointers`, 21 `linked-structures`, 22 `modules-and-cargo`, 23 `concurrency`, 24 `unsafe-and-beyond` |

## Files

| Path | Contents |
| --- | --- |
| `index.html` | The page. Loads `lessons/recorded.js`, the eleven lesson files, then `engine/core` and `engine/rust`. |
| `lessons/01-foundations.js` … `11-unsafe-and-beyond.js` | Eleven scripts in reading order, two or three lessons each, pushing lessons onto `window.C_LESSONS`. The sidebar groups by each lesson's `category`, so the files don't have to match the parts. |
| `lessons/recorded.js` | Generated. The compiler output of every cell that is meant to fail, which the page shows before Run is pressed. Rewrite it with `node tools/verify.cjs rust-intro --record`; never edit it by hand. |
| `checks.cjs` | Interface checks only this course has: a cell run, edited and reset; recorded and live compiler errors; a panic; the three question kinds; a challenge failing then passing; a repair challenge; a forbidden name; an allocation-checked challenge; reload; the narrow layout. |
| `course.json`, `wrangler.jsonc` | Published files; Worker `rust-intro` on `rust-intro.courses.bitshield.dev`. |

## How code runs

- **In the page**, Run and the challenge tests send the code in the editor to the Rust Playground (`https://play.rust-lang.org`), and the page says so in lesson 1 and beside every challenge editor. No other request leaves the page.
- **In the checks**, nothing is sent anywhere. `tools/verify.cjs` starts `tools/rust-local.cjs`, which answers in the Playground's format using the `rustc` on this machine. The lessons were last checked with **rustc 1.99.0** (2026-09-28).
- On 2026-11-23 `--live` passed against the real Playground (one cell and one solution from each lesson, plus `checks.cjs`), which was running rustc 1.100.0. It passed from the local files before the deploy and from the live site after it.
- The Playground's stable compiler is usually newer than the local one. The checks match error codes, not wording, so recorded output can differ slightly from what a learner sees live. Update the local toolchain and run `--record` before a deploy when that matters.

## Checking and deploying

```bash
npm run check -- rust-intro                              # every lesson, then checks.cjs; 793 programs, cached after the first run
node tools/verify.cjs rust-intro --only ownership        # lessons whose id contains "ownership"; skips checks.cjs
node tools/verify.cjs rust-intro --only ownership --record   # and record the output of its failing cells
node tools/verify.cjs rust-intro --record                # every lesson; drops recorded entries no cell uses
node tools/verify.cjs rust-intro --live --only ownership # one cell and one solution, sent to the real Playground
npm run preview -- rust-intro                            # http://localhost:8787
npm run deploy:dry-run -- rust-intro
npm run deploy -- rust-intro
```

## Deployment history

| Date | Version ID | Notes |
| --- | --- | --- |
| 2026-11-23 | `ddb67f51-cfb8-41a2-83e0-c0ec5ca6dff0` | First deploy: 24 lessons. Full suite passed live, and `--live` passed from the live site against the real Playground. The first attempt uploaded version `7b68fcfa-5f8d-4d13-a265-1fe34011e784` and stopped before attaching the domain (see [the deploy guide](../../docs/deploy-cloudflare.md#2-deploy)); a second run finished it with the same files. |
