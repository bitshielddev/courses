# Plan: Rust / Field Manual (`rust-intro`)

Working plan for the Rust introduction course. It follows the `create-course` skill (`.claude/skills/create-course/SKILL.md`): brief, scaffold, lessons one part at a time with a check after each, wiring, and deploy only on a go-ahead. It adds one phase the skill calls for when a course needs something the engine lacks: Rust support in the shared engine.

Status (2026-11-23): Phases A to D are done. All 24 lessons are written and pass `npm run check -- rust-intro` (793 programs, plus the interface checks in `courses/rust-intro/checks.cjs`). Phase E is done: the course was deployed on 2026-11-23 to https://rust-intro.courses.bitshield.dev/ and the full suite passes against the live site. Still open: `c-intro` has not been redeployed, so its sidebar link to this course is not live yet. Where this plan and the code disagree about the engine, the code and `.claude/skills/create-course/references/lesson-format.md` are right: a few details changed while building (see "What changed while building" under Phase A).

Contents: [Brief](#1-brief) · [What was tested](#2-what-was-tested-before-planning) · [Steps at a glance](#3-steps-at-a-glance) · [Phase A: engine](#4-phase-a-rust-support-in-the-engine) · [Phase B: scaffold](#5-phase-b-scaffold-the-course) · [Phase C: lessons](#6-phase-c-lessons) · [Lesson plans](#7-lesson-plans) · [Phase D: wiring](#8-phase-d-wire-it-into-the-repository) · [Phase E: deploy](#9-phase-e-preview-and-deploy) · [Risks](#10-risks-and-how-the-plan-handles-them) · [Out of scope](#11-out-of-scope-for-the-first-version)

## 1. Brief

Agreed on 2026-11-22.

| Item | Decision |
| --- | --- |
| Id | `rust-intro`: folder `courses/rust-intro/`, Worker `rust-intro`, `https://rust-intro.courses.bitshield.dev` |
| Audience | Experienced programmers who know Python, PHP or TypeScript and have not managed memory by hand |
| Prerequisites | None. The course stands alone. Short "If you took the C course" notes are a bonus where there is a direct parallel |
| Mode | `compiler`, with a new language setting `rust`. Run cells, predict questions and graded challenges, as in `c-intro` |
| How code runs | The public Rust Playground (`https://play.rust-lang.org/execute`), for now. The endpoint is a setting, so a self-hosted or in-browser replacement can be swapped in later |
| How checks run | Against the local `rustc`, through a small stand-in server that speaks the Playground's protocol. Checking never calls the Playground |
| Size | 24 lessons in 6 parts, about 170 questions and 130 challenges |
| Language level | Rust 2024 edition, stable channel |
| Presentation | Brand "Rust / Field Manual", subtitle "Interactive programming course", version tag "Rust 2024", sidebar links both ways with `c-intro` |
| Storage key | `rust-intro-v1` (the scaffold's default). Never changes after the first deploy |

## 2. What was tested before planning

These are observations from this machine on 2026-11-22, not assumptions.

- **Playground access.** `POST /execute` answers with `access-control-allow-origin: *`, including for a request with `Origin: null` (a page opened from `file://`). A small program came back in 1.5 to 1.9 seconds. The stable channel was Rust 1.100.0.
- **Response shape.** `{ success, exitDetail, stdout, stderr }`. `stderr` carries Cargo's framing lines (`Compiling playground…`, `Finished…`, ``Running `target/debug/playground` ``). A compile failure and a panic both report `Exited with status 101`; only the `Running` line tells them apart.
- **Test harness prototype.** One file holding the learner's code first, then a generated test module and `main`, was compiled with the local `rustc` 1.99.0 and on the Playground. Both gave the same output. It showed that:
  - each test can run under `catch_unwind`, so one failing test doesn't stop the rest;
  - a panic hook can report the `assert_eq!` message with its `left` and `right` values;
  - a counting global allocator can prove "this function did not allocate" and can catch an `Rc` cycle as "2 allocations never freed".
- **Local compiler.** `rustc --error-format=json` reports each diagnostic's error code (`E0382`) and lint name, so the checks can match on codes instead of message text. A cold compile and link of the prototype took 0.9 s. The machine has 10 cores.
- **In-browser alternatives.** `rubri` (Miri in WebAssembly) and `rubrc` (rustc in WebAssembly) were both judged not ready: experimental, and `rubrc` needs cross-origin isolation headers.

Still to test, in step A1: the Playground's response to a program that never finishes, to release mode, to threads, to a very large source, and to too many requests.

## 3. Steps at a glance

| Phase | Steps | Ends when |
| --- | --- | --- |
| A. Engine | A1 to A11 | A sample Rust lesson passes `npm run check`, and every existing course still passes |
| B. Scaffold | B1 to B4 | `courses/rust-intro/` exists with the sample lesson, green |
| C. Lessons | C1 to C6, one per part | All 24 lessons pass, figures reviewed in screenshots |
| D. Wiring | D1 to D5 | READMEs, cross-links, course checks and the skill are up to date |
| E. Deploy | E1 to E4 | Live site verified. Needs an explicit go-ahead (given and done on 2026-11-23) |

**Review points.** Work stops for a look from Dan at three places: after Phase A (the sample lesson running in a browser), after Parts 1 and 2 (tone, difficulty, and how ownership is taught), and before any deploy.

## 4. Phase A: Rust support in the engine

The engine is shared, so every step here ends with `npm run check` across all courses, and no course id appears in `engine/`.

### What changed while building

- There is no language registry. `engine/rust/driver.js` and `runtime.js` define the same two globals as the C modules (`window.CTestDriver`, `window.CCompiler`), and the driver adds an `info` object with the file names and wording `app.js` uses in place of its C defaults.
- `data-language` already existed for syntax highlighting (the Lean course added it), so Rust is one more grammar in `engine/core/ui.js`.
- Recording is part of the checker: `node tools/verify.cjs rust-intro --record`. There is no separate `rust-record` tool.
- The stand-in's address carries a random key, because it runs whatever code it is sent.
- A Playground time-out arrives as HTTP 500 with a "timed out" message, not as an exit status. The runtime turns it into exit 124.
- Rust starters may produce warnings (a stub that ignores its parameters does). Solutions may not.

### A1. Probe the rest of the Playground's behavior

Send a handful of requests by hand and write down the responses: an infinite loop, `mode: "release"`, a program that spawns threads, a source near 128 KB, and what a refused or rate-limited request looks like. The runtime in A3 is written against these notes. Keep it to about ten requests.

### A2. A language setting, with C as the default

- `<body data-language="rust">` selects the language. Without the attribute a page is C, so `c-intro` is untouched.
- Each language module registers one entry: its compiler (`run`, `warm`), its test driver (`build`, `parse`), its tokenizer, its file names (`main.rs`, `predict.rs`, `solution.rs`), and its wording (the editor help line, the "compiler unavailable" message, the badge for tracked challenges).
- `engine/core/app.js` reads the entry instead of naming `window.CCompiler` and `window.CTestDriver`. The places that change: `start()` near line 356, `runCell` (default file name), `predictCard` (`predict.c`), the challenge workspace (`solution.c`, the "Anything you printf…" help line near line 954, the "Heap-checked" badge near line 932), `runTests`, and the warm-up at the end of the file.
- `engine/compiler/` registers itself as `c` and keeps its existing globals, so `c-intro`'s `checks.cjs` passes unchanged.

Done when: `npm run check` passes for `c-intro` and `c-inotify` with no change in behavior.

### A3. `engine/rust/runtime.js`: the Playground client

- `run(source, { release })` posts `{ channel: "stable", mode, edition: "2024", crateType: "bin", tests: false, backtrace: false, code }` and returns the engine's existing result shape, `{ stdout, stderr, exitCode, stage }`.
- It maps the response: `stage` is `run` when the `Running` line is present and `compile` otherwise; `exitCode` comes from `exitDetail`; a killed program becomes exit 124, as a timeout does in the C runtime.
- It removes Cargo's framing lines from `stderr` and shortens `src/main.rs` to `main.rs`.
- One request at a time, with a client-side time limit. A network failure or a refusal rejects with a plain message, which the page shows as "Rust Playground unavailable" with a prompt to try again.
- The endpoint comes from a script-level setting with the public Playground as the default. It is not read from the URL, so a link can't redirect a learner's code to another server.
- The page says once, in lesson 1 and in the challenge help line, that Run sends the editor's code to the Rust Playground.

### A4. `engine/rust/driver.js`: building and reading test programs

The layout the prototype used:

1. The learner's code, starting at line 1, so compiler messages point at the lines the learner sees. A `fn main` in it is renamed, so learners can keep one for experiments.
2. The challenge's `prelude` ("Already declared for you"). Item order doesn't matter in Rust, so it can follow the learner's code.
3. A generated module: the panic hook, the per-test runner, and with `track: true` the counting allocator.
4. `mod fm_tests { use super::*; … }` with one function per test, then `main`.

Details:

- A test `body` is ordinary Rust using `assert!` and `assert_eq!`. A panic fails that test and the next test still runs.
- With `track: true`, tests can call `allocation_count()`, `live_allocations()` and `peak_live_allocations()`, and a test fails if allocations made during it are still live at its end.
- `forbid: ['clone']` is checked in JavaScript before sending: the source is scanned with comments and string literals removed. `unsafe` is forbidden in every challenge unless the challenge sets `unsafe: true`.
- `parse` returns the same shape as the C driver. Failure text is the panic message, which may span lines, so `app.js` shows it preformatted with the label "The test panicked:" in place of "This check was false:".
- A compiler error whose line number is past the learner's code is labeled as coming from the tests. This matters for lifetime challenges, where a wrong signature makes the tests fail to compile.

### A5. Rust highlighting

`engine/core/ui.js` takes its token pattern from the language entry. The Rust pattern covers line and block comments, strings, raw strings and byte strings, character literals as distinct from lifetimes (`'a'` against `'a`), numbers with `_` separators and type suffixes, keywords, macros (`name!`), attributes (`#[…]`), and function calls. Add `token-lifetime` and `token-macro` colors to both themes in `styles.css`. The editor's indent and brace handling already suits Rust.

Lesson files write Rust with ``const rs = String.raw;``. Rust source contains no backticks, so only `${` needs avoiding.

### A6. Cells, questions and a callout for Rust

In `renderBlock` and the question cards in `app.js`, and in `walkBlocks` and `lint` in `tools/verify.cjs`:

| Addition | Meaning | Checked how |
| --- | --- | --- |
| `fails: 'E0382'` on a run cell | The cell is meant not to compile | Compile stage fails and the diagnostics include that code. For the few errors without a code, `fails` is a phrase such as `'lifetime may not live long enough'` |
| `panics: true` | The cell is meant to panic | Run stage, exit 101, and `stdout` equals `expect` |
| `exits: 1` | The cell is meant to end with that status | Run stage and that exit status |
| `release: true` | Compile in release mode | Sent as `mode: "release"`; used to show overflow wrapping |
| `warns`, `varies` | As in C | As in C. `varies` also covers `HashMap` order and thread timing |
| `verify: 'E0382'`, `'compiles'` or `'panics'` on a single-choice question | A "does this compile?" question | The question's `code` must have that outcome. `verify: true` keeps its current meaning |
| `{ fromC: … }` | Callout "If you took the C course" | Prose rules, as for other callouts |

A cell with `fails` or `panics` shows its recorded compiler output under the code before anyone presses Run (see A8), because in this course the error message is the content. Pressing Run compiles it live, and the status line says whether the result is the one the lesson expects.

Optional, if time allows: a "Run it" button on single-choice questions that have `code`, shown after a first wrong answer, as predict questions have.

### A7. Figures

In `engine/core/widgets.js`:

- **A Rust memory model.** Sizes for Rust types on a 64-bit machine (`usize` and references 8 bytes, `char` 4), wider spacing between stack frames, and automatic fields for `String` and `Vec<T>` (pointer, length, capacity), `&str` and `&[T]` (pointer, length), and `Box<T>`. The model is chosen by the page's language, so C figures don't change.
- **A moved state.** `moved: ['s']` in a trace step greys the variable and removes its arrow. The existing `dead` and dangling drawing is reused for "what would happen if Rust allowed this" traces.
- **Borrow kinds.** Arrows are styled by the pointing cell's type: owning, shared (`&T`) or exclusive (`&mut T`).
- **A new `borrows` figure.** Numbered code with one vertical bar per reference, covering the lines on which it is live, colored by kind, with an optional conflict line and note. Used in lessons 7, 10, 17 and 20. It is drawn by hand from the lesson data, so each one sits beside a run cell whose outcome the checks confirm.
- **Reused as they are:** `strip` (UTF-8 bytes with character marks, slices) and `bits` (two's complement and truncation; its labels say `uint8_t`, so give it Rust type names when the page is Rust).

Done when: a sample lesson renders each figure, and `--shots` screenshots look right at desktop and phone width.

### A8. Checking Rust courses

- **`tools/rust-local.cjs`**: a small server on 127.0.0.1 that implements `POST /execute` with the local `rustc`, returning the Playground's response shape including the framing lines. It caches results on disk by source, mode and compiler version, so an unchanged program costs nothing on the next check. It also serves as an offline Playground while writing lessons.
- **`tools/verify.cjs`**: for a Rust course it starts the stand-in, injects its address as the page's endpoint, and then runs the existing compiler-course checks through the page's own runtime and driver. The checks therefore exercise the same code path a learner uses. Before the walk it collects every program and sends them to the stand-in in parallel, which keeps a cold full check to a couple of minutes.
- **New rules**, alongside the existing ones: the cell and question outcomes in A6; a challenge's solution passes every test with no warnings; a starter compiles cleanly and fails at least one test unless `broken` or `starterWarns` says otherwise.
- **Requests.** The "no request to another origin" check allows the stand-in's address and nothing else. A request to the real Playground during a check is a failure.
- **`--live`**: a pre-deploy option that sends about ten programs to the real Playground and compares outcomes with the local ones. It catches a change in the Playground's protocol or compiler.
- **`tools/rust-record.mjs`**: compiles every `fails` and `panics` cell with the local `rustc` and writes their compiler output to a generated data file, `lessons/recorded.js`, which the page loads. The checks fail if a recording is missing or out of date.

### A9. Course tools

- `tools/courses.cjs`: read `data-language`; a Rust compiler course must load `engine/rust/` and must not load the 23 MB C compiler.
- `tools/new-course.mjs`: `--language rust` picks the Rust sample lesson, the Rust engine scripts and the default tag "Rust 2024". `--brand "Rust"` sets the brand name, which is currently fixed as "C".
- `tools/templates/rust-lesson.js`: a minimal sample that passes the checks and shows a run cell, a failing cell, the three question kinds and one challenge.
- `tools/build.mjs` needs no change: it already publishes whichever engine modules a page loads.

### A10. Documentation and the skill

Update `.claude/skills/create-course/SKILL.md` (the language choice, the Playground, the Rust check commands, exemplar lessons once they exist), `references/lesson-format.md` (every addition in A4, A6 and A7), and the root `README.md` (layout and commands).

### A11. Prove it end to end

Scaffold a throwaway `zz-rust-sample` course, run `npm run check`, open it in a browser against the real Playground, run a cell, fail and pass a challenge, then delete `courses/zz-rust-sample/` and `dist/zz-rust-sample/`. **Review point 1.**

## 5. Phase B: Scaffold the course

- **B1.** `npm run new-course -- rust-intro --mode compiler --language rust --brand "Rust" --title "Rust / Field Manual" --summary "An interactive Rust course for programmers who know Python, PHP or TypeScript. Read, run and write Rust in your browser." --tag "Rust 2024"`
- **B2.** `npm run check -- rust-intro` straight away, to start from green.
- **B3.** Edit `index.html` as `c-intro` did: the page title is the brand alone, the sidebar heading is "Contents", and the six lesson scripts and `lessons/recorded.js` are listed in order.
- **B4.** Fill in `courses/rust-intro/README.md`, including the local `rustc` version the lessons were checked with.

## 6. Phase C: Lessons

The sidebar groups by each lesson's `category`, which is the exact part name in the table below.

| Step | File | Part | Lessons |
| --- | --- | --- | --- |
| C1 | `lessons/01-foundations.js` | Part 1 · Foundations | 1 to 3 |
| C2 | `lessons/02-ownership.js` | Part 2 · Ownership | 4 and 5 |
| C2 | `lessons/03-borrowing.js` | Part 2 · Ownership | 6 and 7 |
| C3 | `lessons/04-borrowing-at-work.js` | Part 3 · Borrowing at work | 8 to 10 |
| C4 | `lessons/05-data.js` | Part 4 · Data | 11 and 12 |
| C4 | `lessons/06-option-and-collections.js` | Part 4 · Data | 13 and 14 |
| C5 | `lessons/07-abstraction.js` | Part 5 · Abstraction | 15 to 17 |
| C5 | `lessons/08-iterators-and-errors.js` | Part 5 · Abstraction | 18 and 19 |
| C6 | `lessons/09-shared-ownership.js` | Part 6 · Shared ownership & the wider language | 20 and 21 |
| C6 | `lessons/10-wider-language.js` | Part 6 · Shared ownership & the wider language | 22 and 23 |
| C6 | `lessons/11-unsafe-and-beyond.js` | Part 6 · Shared ownership & the wider language | 24 |

Files are numbered in reading order and hold two or three lessons each, to keep them a workable size. The sidebar groups by `category`, so the split does not show.

**The loop for each lesson:**

1. Write the reading: sections, run cells, figures, callouts.
2. Write the questions. Every wrong option gets a `why` that names the misconception.
3. Write the challenges: prompt, starter, solution, hints that build up, at least three tests with labels that name a behavior.
4. `node tools/verify.cjs rust-intro --only <lesson-id> --record`. Fix and repeat.

**At the end of each part:** `npm run check -- rust-intro`, then `--shots` with `--shot-targets` for that part's figures, and read the pages in a browser. **Review point 2** comes after C2.

**House rules for every lesson**

- Each ownership rule is taught in the same order: the bug it prevents as a memory trace, the rule, the compiler's error in a failing cell, then the standard fixes.
- Compiler errors are shown, not described. If the text says a program is rejected, a `fails` cell proves it.
- `compare` callouts contrast with Python, PHP and TypeScript. `pitfall` covers the mistakes people make. `aside` covers what happens underneath. `native` covers Cargo, Clippy and rust-analyzer on the learner's machine. `fromC` appears once or twice per lesson at most.
- Repair challenges (`kind: 'fix'`, usually `broken: 'compile'`) are central from lesson 5 on, often with `forbid: ['clone']`, because recognizing a borrow error is easier than fixing it well.
- Text types appear in signatures before lesson 9. Until then signatures are given, and lesson 1 says so.
- `Option` is used lightly from lesson 2 (`checked_add`, `get`) with a one-paragraph introduction, and taught fully in lesson 13. Simple closures (`|x| x + 1`) appear from lesson 13 and are taught in lesson 17.
- Output that can differ between runs is either made deterministic (sort before printing, join before printing) or marked `varies`.
- Overflow examples take their operands from a function parameter. The compiler rejects overflow it can compute in advance, which would turn the intended panic into a compile error.
- American spelling, plain second person, short sentences, as in the C course.
- Lesson and challenge ids below are final once deployed. After the first deploy, questions are only appended.

**What each lesson may assume.** A lesson can use anything an earlier lesson taught, and should say so when it leans on something from far back. It must not rely on a later lesson without a sentence that says where the idea is explained.

| By the start of | The learner has seen |
| --- | --- |
| Lesson 4 | `fn`, `let`, `mut`, shadowing, number types, overflow, `as` and `From`, tuples, arrays, blocks and `if` as expressions, `loop`, `while`, `for` over ranges, `match` on simple values, `()` and `!`, stack frames. `Option` only as the result of `checked_add`. Text types only in signatures that were given |
| Lesson 8 | Stack and heap, `Box`, what a `String` and a `Vec` hold, `drop`, moves, `Copy`, `clone`, `&T`, `&mut T`, the aliasing rule, borrows ending at last use |
| Lesson 11 | Slices, `String` and `&str`, UTF-8, lifetimes and elision |
| Lesson 15 | Structs, methods and receivers, `derive`, enums, patterns, `Option`, `Result`, `?`, `Vec`, `HashMap`. Simple closures such as `\|x\| x + 1` have appeared as arguments without explanation |
| Lesson 18 | Traits, generics, bounds, trait objects, closures and the `Fn` traits |
| Lesson 20 | Iterators, custom error types, `From` with `?` |
| Lesson 22 | `Box`, `Rc`, `RefCell`, `Weak`, linked lists and trees |

**Found while writing Part 1.**

- Do not print the debugging form of a standard-library error (`{:?}` of a `TryFromIntError`, a `ParseIntError` and so on). Its text changes between compiler versions, and the Playground's compiler is newer than the local one. Print `is_err()`, or the `{}` form, or match on it.
- A cell that names a variable it never uses must be marked `warns: true`, or use the variable.
- Test bodies are written without indentation and shown to the learner as they are. Give `assert_eq!` a message when the two values alone would not explain the failure.
- A starter should be wrong in a way that fails fast. One that loops for seconds makes the whole check time out.
- `lessons/01-foundations.js` is the exemplar for tone, depth and the shape of questions and challenges.

**How parts 2 to 6 were written.** Lessons 4 to 24 were written by parallel writers, one per file, from this plan and the Part 1 exemplar. Afterwards every sentence that names another lesson was checked against that lesson, and the code of each lesson was scanned for features used before the lesson that teaches them.

**Where the lessons differ from the plans below.**

- Lessons are longer than planned: 9,000 to 34,000 characters of prose each, where Part 1 has 9,000 to 12,000. The stated minutes are the planned ones and are low for the later lessons.
- Most lessons show more failing cells than the plan lists, so that no claim goes unshown. Every planned error code is present.
- Lesson 23 draws the deadlock as a `trace` with one stack frame per thread. Four of its challenges take a plain `fn` parameter so tests can tell which thread ran each call. In `worker-pool` and `channel-pipeline` some wrong answers wait forever instead of failing a test; both prompts say so.
- Lesson 24's `off-by-one-read` reads inside a buffer the program owns, so the wrong answer is repeatable and nothing undefined runs.
- Not checked by the local compiler: the Tokio and Rayon snippets in lesson 23 and the Cargo material in lesson 22, which are `code` blocks inside `native` callouts.

## 7. Lesson plans

Challenge levels: **w** warm-up, **c** core, **s** stretch. "fix" means the starter is broken and the task is to repair it. "track" means the counting allocator is on. Error codes are the ones expected; the checks confirm each when the cell is written.

### Part 1 · Foundations

#### 1. `first-program` · From source to program · 20 min

**Goal.** Run a program, format output, and read a compiler diagnostic.

1. How this manual works: the three tabs, cells that are meant to fail, and that Run sends code to the Rust Playground
2. Compile, then run: a native binary with no interpreter; `cargo new` and `cargo run` in a `native` callout
3. The anatomy of a program: `fn main`, `let`, statements, blocks, comments, and what the `!` in `println!` means
4. `println!` and format strings: `{}`, `{:?}`, `{name}`, width and precision, `{:#?}`; arguments are checked at compile time; `print!`, `eprintln!`, `dbg!`
5. Reading compiler diagnostics: the error code, the marked span, the labels, the `help:` line, `rustc --explain`; warnings and the `_` prefix
6. What Rust leaves out and what it adds: no null, exceptions, inheritance, garbage collector, implicit conversions or truthiness; in exchange ownership, enums with `match`, traits

**Cells that must fail.** `E0425` (unknown name), `E0308` (mismatched types).
**Questions (6).** What `!` marks. `{}` against `{:?}`. Two predict questions on formatting. Which line a diagnostic points at. Select all: features Rust doesn't have.
**Challenges (3).** `to-fahrenheit` (w): finish an arithmetic function. `fix-three-errors` (w, fix, broken compile): repair a program using only its diagnostics. `format-a-row` (c): return a padded, aligned table row with `format!`.

#### 2. `variables-and-types` · Variables, types & conversions · 30 min

**Goal.** Know what a binding is, what the number types mean, and that nothing converts by itself.

1. `let` binds, `mut` permits change
2. Shadowing: a new binding that may change type, against mutation
3. Inference without dynamic typing: types are fixed at compile time; when an annotation is needed
4. Integer types and what a size means: `i8` to `i128`, `u8` to `u128`, `usize`; literals and suffixes; the `bits` widget
5. Overflow is an error, not a surprise: panic in debug, wrap in release; `checked_`, `wrapping_`, `saturating_`; a first look at `Option`
6. Floats, `bool` and `char`: no mixing of `i32` and `f64`; `bool` is not a number; `char` is four bytes
7. Conversions are explicit: `as` truncates silently; `From` and `into` for lossless; `TryFrom` for checked
8. Tuples and arrays: fixed size, destructuring, `[0; 5]`, checked indexing; `const`

**Figures.** `bits` (two's complement, truncation), `strip` (an array).
**Cells that must fail.** `E0384` (assign twice), `E0277` (`i32 + f64`), `E0308` (`if 1`). **Panics:** overflow in debug, index out of range. **Release:** the same overflow wrapping.
**Questions (7).** Shadowing against mutation. Predict shadowing in an inner block. Predict `300 as u8`. What `255u8 + 1` does in debug. Select all: lossless conversions. What `E0384` means. Predict a tuple destructure.
**Challenges (4).** `clamp-to-u8` (w). `average-without-overflow` (c). `seconds-to-hms` (c): return a tuple. `wrapping-checksum` (s): over `[u8; 8]`.
**C note.** C converts between number types silently and leaves signed overflow undefined. Rust does neither.

#### 3. `control-flow` · Expressions, functions & control flow · 30 min

**Goal.** Write functions and control flow the Rust way, where most things have a value.

1. Functions: typed signatures are mandatory, and the checker reads only signatures; no prototypes
2. Blocks are expressions: the last expression is the value; what the semicolon does
3. `if` is an expression: no ternary; the condition must be `bool`; both arms one type
4. Loops: `loop` with `break value`, `while`, `for` over ranges, `rev`, `step_by`, labels
5. `match` on simple values: literals, ranges, `|`, `_`, guards, tuples; exhaustiveness
6. The unit type and the never type: `()` and `!`
7. Scope and the call stack, briefly: locals live in a frame and end at the closing brace

**Figures.** A `trace` of a call pushing and popping a frame.
**Cells that must fail.** `E0308` (stray semicolon: "expected `i32`, found `()`"), `E0308` (arms of different types), `E0004` (non-exhaustive `match`).
**Questions (7).** Predict a block's value. What `fn f() -> i32 { 5; }` produces. Predict `loop` with `break value`. Predict a labeled break. Does a `match` without `_` compile. Select all: which of these are expressions. Predict `rev` and `step_by`.
**Challenges (5).** `fix-the-semicolon` (w, fix, broken compile). `sum-multiples` (w). `fizzbuzz-match` (c): `match` on a tuple. `collatz-steps` (c): `loop` with a break value. `integer-sqrt` (s): binary search without overflow.
**C note.** `match` doesn't fall through and must cover every case. Conditions are never integers.

### Part 2 · Ownership

#### 4. `stack-and-heap` · Where values live · 25 min

**Goal.** A memory model for people who never needed one.

1. What your language has been doing for you: every value a heap object behind a reference, freed by a count or a collector
2. The stack: frames of fixed-size values; `size_of`
3. The heap: memory you ask for; `Box::new`
4. A `String` is three words and a buffer: pointer, length, capacity; growth can move the buffer; `Vec<T>` has the same shape
5. Someone has to free it: leak, use after free and double free as traces; the collector's answer; Rust's answer
6. Scope ends, value dropped: a `Noisy` type that prints when dropped; drop order

**Figures.** `trace` (frames), `memory` (a `Box`), `trace` (a `String` growing and moving), three short traces for the three bugs.
**Questions (6).** Where the text of a `String` lives. `size_of::<String>()`. Select all: values held entirely on the stack. Predict drop order. What happens to the buffer at the closing brace. Why an array's length must be known at compile time.
**Challenges (4).** `boxed-max` (w). `one-allocation` (c, track): build a string of `n` characters with exactly one allocation. `one-at-a-time` (c, track): process several buffers with at most one live at once. `reserve-up-front` (s, track).
**C note.** The stack and heap are the ones from the C memory lesson. What changes is who calls `free`.

#### 5. `ownership` · Ownership & moves · 35 min

**Goal.** Predict when a value moves, and what can be used afterwards.

1. Three rules: one owner, one at a time, dropped when the owner goes
2. Assignment moves: the three words are copied and the source is dead; the double free this prevents
3. `Copy` types: when a move is just a copy
4. `clone`: the explicit deep copy
5. Functions take ownership
6. Returning gives ownership back
7. Moves in everyday code: in a loop, out of a `Vec` by index, partial moves, reassigning a moved variable

**Figures.** Three traces using the moved state: a move, a clone, a pass into a function and the drop there.
**Cells that must fail.** `E0382` three ways (assignment, call, loop), `E0507` (move out of an index).
**Questions (7).** Which line errors. Predict with `Copy` values. What `clone` allocates. Select all: `Copy` types. Does a move in a loop compile. Predict where a moved value is dropped. Why `String` is not `Copy`.
**Challenges (6).** `use-after-move` (w, fix, broken compile, forbid `clone`). `give-it-back` (w). `moved-in-loop` (c, fix, broken compile, forbid `clone`). `swap-owners` (c, track): no allocation. `clone-only-once` (c, track). `take-the-longest` (s, track): move a `String` out of a `Vec` without cloning.
**C note.** A move is a shallow copy plus a rule that the source is dead. It is the "who owns the storage?" convention from the C strings lesson, enforced.

#### 6. `borrowing` · References & borrowing · 30 min

**Goal.** Lend a value without giving it up, and know what a reference guarantees.

1. Lending instead of giving: `&s`
2. References are pointers with guarantees: never null, always valid; automatic dereferencing
3. Shared references are `Copy`
4. A reference can't outlive its owner
5. You can't move out from under a borrow
6. `&T` or `T` in a signature: borrow to read, own to keep; equality against identity

**Figures.** `trace` (a reference to an owner to a buffer), `trace` (what a dangling reference would be), `memory`.
**Cells that must fail.** `E0597`, `E0505`, `E0507`, `E0106`.
**Questions (7).** Does it compile, three variants. Predict through a reference. Select all: what a reference guarantees. Why returning a reference to a local is rejected. `==` on references.
**Challenges (5).** `borrow-dont-move` (w, fix, broken compile). `total-length` (w). `dangling-return` (c, fix, broken compile). `largest-ref` (c): the test checks the result points into the input. `same-or-equal` (s): identity against equality.
**C note.** `&x` and `*p` mean what they meant in C at the machine level. There is no null and no arithmetic, and the compiler tracks how long each one is valid.

#### 7. `mutable-borrows` · Mutable borrows & the aliasing rule · 40 min

**Goal.** Understand the one rule behind most borrow errors, and fix them without `clone`.

1. `&mut T`: borrowing to change
2. The rule: many readers or one writer
3. What the rule prevents: a `Vec` that reallocates under a reference; changing a collection while iterating
4. A borrow lasts until its last use
5. The owner is frozen too
6. Reborrowing and passing `&mut` along
7. Five ways out of a borrow error: shorten the borrow, copy the value out, use an index, split the data, clone when it is truly needed

**Figures.** `trace` (the reallocation and the dangling reference), two `borrows` figures (a conflict; the same code accepted once the last use moves).
**Cells that must fail.** `E0499`, `E0502` twice, `E0506`, `E0596`.
**Questions (8).** Four "does this compile?" questions with timelines. Predict a change through `&mut`. Select all: borrows that may coexist. Why `push` invalidates a reference. What `E0596` asks for.
**Challenges (6).** `bump` (w). `needs-mut` (w, fix, broken compile). `push-while-borrowed` (c, fix, broken compile, forbid `clone`). `swap-in-place` (c, forbid `swap`). `append-all` (c). `double-the-evens` (s, fix).
**C note.** C's out-parameters are `&mut`. `const int *` promised that you wouldn't write; `&T` promises that nobody will.

### Part 3 · Borrowing at work

#### 8. `slices` · Slices · 30 min

**Goal.** Work with parts of sequences without copying them.

1. A view into a sequence: `&[T]` is a pointer and a length
2. Ranges and bounds
3. Indexing is checked: `v[i]` panics, `get` returns an `Option`
4. Write `&[T]`, not `&Vec<T>`; `&mut [T]` changes elements, not length
5. A slice borrows the whole collection
6. Working with slices: `iter`, `contains`, `windows`, `chunks`, `sort`, `split_at_mut`, slice patterns
7. Two indices instead of two references

**Figures.** `memory` (the two-word reference), `strip` (a slice marked over an array).
**Cells that must fail.** `E0502` (push while a slice is held). **Panics:** a range past the end.
**Questions (7).** `size_of::<&[i32]>()`. Predict a range. What `v[10]` does. Select all: arguments a `&[i32]` parameter accepts. Does it compile, two variants. Predict a slice pattern.
**Challenges (6).** `sum-slice` (w). `trim-ends` (w): return a sub-slice. `largest-in-slice` (c): returns `Option<&i32>`. `reverse-in-place` (c, forbid `reverse`). `is-sorted` (c, forbid `is_sorted`): with `windows`. `partition-in-place` (s).
**C note.** A slice is the pointer-and-length pair the C course told you to pass by hand, as one checked value. Arrays don't decay.

#### 9. `strings` · Strings · 40 min

**Goal.** Choose between `String` and `&str`, and handle text as UTF-8.

1. Two types for text: owned `String`, borrowed `&str`, and literals in static storage
2. Building and changing a `String`: `push_str`, `+` moves its left side, `format!` borrows
3. UTF-8: bytes are not characters; `chars`, `bytes`, `char_indices`
4. Why `s[0]` doesn't compile; byte ranges and character boundaries
5. `&str` in signatures: return `&str` for a part of the input, `String` for something new
6. The string toolbox: which methods return views and which allocate
7. Converting between the two

**Figures.** `memory` (a `String`, a `&str` into it, a literal), `strip` (bytes with character marks).
**Cells that must fail.** `E0277` (indexing), `E0382` (after `+`), `E0502` (`clear` while a slice is held), `E0308` (`&str` where `String` is expected). **Panics:** slicing inside a character.
**Questions (8).** Predict `len` against `chars().count()`. Does `s[0]` compile. Predict a slice. Select all: which calls allocate. Select all: what a `&str` parameter accepts. What slicing mid-character does. What `s1 + &s2` does to `s1`. Predict `split` and `trim`.
**Challenges (6).** `count-chars` (w). `shout` (w). `first-word` (c, track): no allocation. `is-palindrome` (c). `char-boundary` (c, fix): the starter panics on non-ASCII text. `common-prefix` (s, track): returns `&str`, no allocation.
**C note.** There is no terminator: the length is stored. `String` is the growable buffer from the C heap lesson with the bookkeeping done.

#### 10. `lifetimes` · Lifetimes · 40 min

**Goal.** Read and write lifetime annotations, and know when to return an owned value.

1. Every reference has a lifetime
2. When the compiler asks for help: `longest`
3. Annotation syntax: annotations describe relationships and extend nothing
4. Elision: why you rarely write them
5. Different lifetimes for different inputs
6. Structs that hold references
7. `'static`, and why adding it is rarely the fix
8. Three fixes when lifetimes fight back: return an owned value, return an index, make the owner live longer

**Figures.** Three `borrows` figures.
**Cells that must fail.** `E0106`, `E0597`, `E0515`, and "lifetime may not live long enough".
**Questions (7).** Which signature needs an annotation. Three "does this compile?" questions. What `'a` means. Select all: valid fixes for `E0515`. What `'static` means.
**Challenges (6).** `annotate-longest` (w, fix, broken compile). `first-or-fallback` (c). `split-pair` (c, forbid `split_once`). `tighter-signature` (c, fix, broken compile): the tests compile only when the result borrows from the first argument alone. `excerpt-struct` (c). `token-cursor` (s): a struct holding `&'a str` and a position.
**C note.** This is the C lesson on pointers that outlive what they point to, checked at compile time. The annotations are the header comments C programmers write by hand.

### Part 4 · Data

#### 11. `structs` · Structs & methods · 35 min

1. Defining and creating; `derive(Debug)`
2. Structs are values, and they move; update syntax and partial moves
3. Methods and `impl`; associated functions
4. Three receivers: `&self`, `&mut self`, `self`
5. Tuple structs and newtypes
6. Borrowing fields separately
7. Derives and layout

**Figures.** `memory` (a struct with a `String` field), `trace` (a partial move).
**Cells that must fail.** `E0382` (partial move), `E0596`, `E0499` (a method call while a field is borrowed), `E0369` (`==` without `PartialEq`), `E0277` (`{:?}` without `Debug`), `E0063` (missing field).
**Questions (7).** Which receiver a method needs. Predict after update syntax. Does it compile, three variants. Select all: what each derive provides. Why two fields can be borrowed at once.
**Challenges (6).** `derive-what-it-needs` (w, fix, broken compile). `rect-methods` (w). `counter` (c). `request-builder` (c): a consuming builder. `newtype-units` (c). `bounded-stack` (s).
**C note.** Same value semantics as C structs, but a copy must be asked for. A method is a function taking a pointer to the struct.

#### 12. `enums-and-matching` · Enums & pattern matching · 35 min

1. An enum is one of several shapes
2. `match` takes them apart
3. The pattern language
4. `if let`, `let else`, `while let`, `matches!`
5. Matching borrows or moves
6. Enums have methods too
7. What an enum costs: a tag and the largest payload

**Figures.** `strip` (tag and payload layout).
**Cells that must fail.** `E0004`, `E0005`, `E0382` (payload moved by a `match`).
**Questions (7).** Predict a `match` with guards and ranges. Does a non-exhaustive `match` compile. What a `match` moved. Predict `while let` over a stack. Size of an enum. Select all: irrefutable patterns. Predict an `@` binding.
**Challenges (6).** `shape-area` (w). `traffic-light` (w). `parse-command` (c). `borrow-in-match` (c, fix, broken compile). `eval-expr` (c): a recursive `Expr` with `Box`. `simplify-expr` (s).
**C note.** This is the tagged union from the C course with the tag checked for you.

#### 13. `option-and-result` · Option & Result · 35 min

1. `Option<T>`: a value that might not be there
2. Getting the value out; when `unwrap` and `expect` are acceptable
3. Transforming without unwrapping: `map`, `and_then`, `ok_or`
4. `Result<T, E>`: success or a reason; ignoring one warns
5. The `?` operator
6. `Option` and ownership: `take`, `as_ref`, `as_deref`
7. Panic or `Result`?

**Cells that must fail.** `E0308` (`Option<i32>` used as `i32`), `E0277` (`?` in a function returning `()`), `E0507`. **Panics:** `unwrap` on `None`. **Warns:** an unused `Result`.
**Questions (8).** Predict three combinator chains. Does `?` compile here. What `take` leaves behind. Select all: acceptable uses of `unwrap`. Panic or `Result` for four cases. What an unused `Result` produces.
**Challenges (6).** `safe-divide` (w). `first-even` (w). `parse-pair` (c): `?` with `map_err`. `chain-lookups` (c, forbid `match` and `if`). `take-the-name` (c, fix, broken compile). `sum-valid-lines` (s).
**C note.** `Option` replaces `NULL` and sentinel values. `Result` replaces return codes and `errno`. The compiler won't let you skip the check.

#### 14. `collections` · Collections · 40 min

1. `Vec<T>`: the growable array
2. Three ways to iterate: `&v`, `&mut v`, `v`
3. Elements are owned by the `Vec`: `swap_remove`, `mem::take`, `drain`, `retain`, sorting
4. Don't change it while you walk it
5. `HashMap<K, V>`: ownership of keys and values, unspecified order
6. The entry API
7. Choosing a collection

**Figures.** `trace` (growth and reallocation), `memory` (a `Vec<String>`).
**Cells that must fail.** `E0382` (use after `for x in v`), `E0507`, `E0502`.
**Questions (7).** Item type of each loop form. Does it compile, two variants. Predict `retain` and `sort_by_key`. What `get` returns. Why output order varies. What `entry` solves.
**Challenges (6).** `evens-only` (w). `word-count` (c). `remove-negatives` (c, track): in place. `mutate-while-iterating` (c, fix, broken compile). `group-by-first-letter` (c, track): move the strings, don't clone them. `top-k-words` (s).
**C note.** `Vec` is the growable array from the C heap lesson: pointer, length, capacity and doubling.

### Part 5 · Abstraction

#### 15. `traits-and-generics` · Traits & generics · 40 min

1. A trait names a capability
2. Default methods and `Self`
3. Generic functions and trait bounds
4. Generic types
5. Monomorphization: generics cost nothing at run time
6. The traits you meet every day: `Debug`, `Display`, `Clone`, `PartialEq`, `Ord`, `Hash`, `Default`, `From`
7. Coherence: who may implement what
8. Associated types, briefly

**Cells that must fail.** `E0369` (`>` on an unbounded `T`), `E0277` (bound not met), `E0117` (orphan rule), `E0599` (trait not in scope), `E0046` (missing method).
**Questions (8).** Structural against nominal. What bound a body needs. Does it compile, three variants. What monomorphization costs. Select all: derivable traits. What `From` gives for free.
**Challenges (6).** `impl-describe` (w). `impl-display` (w). `generic-largest` (c). `from-and-add` (c): `From` and `Add` for a vector type. `missing-bound` (c, fix, broken compile): the tests use a type that isn't `Copy`. `generic-stack` (s).
**C note.** Generics replace the `void *` plus size pattern, with the same machine code as hand-written copies.

#### 16. `trait-objects` · Trait objects & dynamic dispatch · 30 min

1. One list, many types
2. Why `dyn` lives behind a pointer
3. Static or dynamic dispatch
4. Enum or trait object?
5. What can be a trait object
6. Composition instead of inheritance
7. Returning "some type that implements": `impl Trait` against `Box<dyn Trait>`

**Figures.** `memory` (data pointer, vtable pointer, vtable).
**Cells that must fail.** `E0277` (unsized), `E0038`, `E0308` (two types behind one `impl Trait`).
**Questions (7).** `size_of::<&dyn Shape>()`. Static or dynamic for four snippets. Enum or trait for three scenarios. Does it compile, two variants.
**Challenges (5).** `total-area` (w). `shape-factory` (c). `transform-pipeline` (c). `enum-instead` (c, track, forbid `dyn` and `Box`). `logger-fanout` (s): a supertrait and a default method.
**C note.** A trait object is the C course's table of function pointers plus a context pointer, generated and type-checked.

#### 17. `closures` · Closures · 35 min

1. Functions you can write inline
2. Capturing the environment: by reference, by mutable reference, by value
3. `move` closures
4. `Fn`, `FnMut`, `FnOnce`
5. Taking closures as parameters
6. Returning and storing closures
7. What a closure is underneath

**Figures.** `borrows` (a closure holding a mutable borrow while it lives).
**Cells that must fail.** `E0502`, `E0373`, `E0525`, `E0382` (calling an `FnOnce` twice), `E0308` (two closures, two types).
**Questions (7).** Which capture mode. Which trait a closure implements, three snippets. Does it compile, two variants. Predict a counter closure.
**Challenges (6).** `apply-twice` (w). `make-adder` (w). `make-counter` (c): returns `impl FnMut`. `closure-borrows-too-long` (c, fix, broken compile). `callback-registry` (c). `memoize` (s).
**C note.** A closure is the function pointer plus `void *context` pair, with the context struct written by the compiler.

#### 18. `iterators` · Iterators · 40 min

1. One trait, one method
2. `iter`, `iter_mut`, `into_iter` again
3. Adapters are lazy
4. Consumers
5. `collect` and choosing the target
6. Writing your own
7. Loops or chains?

**Figures.** `trace` (one element pulled through `map` and `filter` at a time).
**Cells that must fail.** `E0282` or `E0283` (`collect` with no target type), `E0382` (use after `into_iter`). **Warns:** an unused adapter.
**Questions (8).** Predict three chains. What an unused `map` does. Item type of `enumerate`. Does it compile. Which consumers stop early. Predict `zip` with unequal lengths.
**Challenges (6).** `sum-even-squares` (w, forbid `for`, `while`, `loop`). `initials` (w). `parse-all` (c): collect into a `Result`. `fibonacci-iterator` (c). `run-lengths` (c). `pairs-adapter` (s): an adapter over any iterator.
**C note.** A slice iterator is the two-pointer walk from the C pointer-arithmetic lesson and compiles to the same loop.

#### 19. `error-handling` · Error handling · 35 min

1. An error type of your own
2. `Display` and the `Error` trait
3. `?` converts with `From`
4. `Box<dyn Error>`: any error at all; `main` returning `Result`
5. Adding context; `anyhow` and `thiserror` in a `native` callout
6. Panics, properly
7. Designing with errors: parse, don't validate

**Cells that must fail.** `E0277` (`?` can't convert the error). **Exits 1:** `main` returning `Err`.
**Questions (7).** Why not `String` errors. What `?` calls. Library or application error type, three cases. Predict `main` returning `Err`. Select all: what runs during a panic.
**Challenges (5).** `display-the-error` (w). `from-for-question-mark` (c, fix, broken compile). `parse-config` (c): tests match on error variants. `validated-newtypes` (c). `error-chain` (s): `source()`.
**C note.** `?` returns early and `Drop` frees what was acquired, so there is no `goto cleanup`.

### Part 6 · Shared ownership & the wider language

#### 20. `smart-pointers` · Box, Rc & RefCell · 40 min

1. `Box<T>`: one owner, on the heap
2. `Deref` and `Drop`: how smart pointers work
3. `Rc<T>`: several owners
4. `RefCell<T>`: borrow rules checked at run time; `Cell<T>`
5. `Rc<RefCell<T>>`: shared and mutable
6. Cycles leak; `Weak<T>`
7. Reaching for these last

**Figures.** `trace` (reference counts), `memory` (a cycle), `borrows` (guards from `borrow` and `borrow_mut`).
**Cells that must fail.** `E0072` (recursive type without `Box`), `E0596` (changing through an `Rc`), `E0040`. **Panics:** a second `borrow_mut`.
**Questions (7).** Predict `strong_count`. Compile error or panic, three snippets. Predict drop order. What a cycle leaks. Which tool for four scenarios.
**Challenges (6).** `boxed-list-sum` (w). `shared-config` (w). `shared-counter` (c). `double-borrow-panic` (c, fix). `break-the-cycle` (c, fix, track): the test requires nothing left allocated. `tree-with-parents` (s, track).
**C note.** `Box` is `malloc` and `free` paired by the compiler. `Rc` is the reference count C libraries implement by hand.

#### 21. `linked-structures` · Linked lists & trees · 40 min

1. Why the classic list is hard here
2. A singly linked stack: `Option<Box<Node>>`, `take`
3. Walking the list; an iterator with a lifetime
4. A mutable cursor: the pointer to the link
5. Reversing and dropping; why a long list needs an iterative `Drop`
6. Trees: insert through `&mut Option<Box<Node>>`
7. When nodes need more than one owner: indices into a `Vec`, `Rc` with `Weak`, crates

**Figures.** `memory` (a list), `trace` (`push` with `take`), `trace` (insert through a cursor).
**Cells that must fail.** `E0507` (moving the head out from behind `&mut self`), `E0499` or `E0506` (a naive cursor).
**Questions (6).** Why `take` is needed. Predict after `push` and `pop`. Does the cursor compile, two variants. Which design for a tree with parent links. What drops when the head drops.
**Challenges (6).** `stack-push-pop` (w). `list-sum` (c). `list-reverse` (c, track): no allocation. `append-at-tail` (c). `bst-insert` (c). `arena-tree` (s): index-based, with parents.
**C note.** The cursor is the "pointer to the link" from the C linked-list lesson, line for line.

#### 22. `modules-and-cargo` · Modules, crates & Cargo · 30 min

1. Modules and privacy
2. Privacy protects invariants
3. Paths and `use`
4. From one file to many
5. Cargo and crates.io
6. Tests: the challenges in this course run this kind of function
7. The everyday toolchain: `check`, `clippy`, `rustfmt`, `doc`, rust-analyzer

**Cells that must fail.** `E0603`, `E0616`, `E0451`. Sections 4 to 7 use `code` and `shell` blocks inside `native` callouts, because they need a real machine.
**Questions (6).** What is visible from where, three snippets. Which file `mod parser;` loads. What `Cargo.lock` is for. Select all: where tests can live.
**Challenges (4).** `make-it-public` (w, fix, broken compile). `bank-account` (c): a private balance that can't go negative. `reexport-units` (c): `pub use` so the tests' paths resolve. `catch-the-bugs` (s): write a checker that accepts a correct function and rejects several buggy ones.
**C note.** No headers, include guards or preprocessor. `pub` replaces the file-scope `static`.

#### 23. `concurrency` · Concurrency · 40 min

1. Threads: `spawn` and `join`
2. `move` and `'static`
3. Scoped threads borrow safely
4. `Send` and `Sync`: thread safety in the type system
5. Shared state: `Arc<Mutex<T>>`; the data lives inside the lock
6. Message passing: channels
7. What the compiler can't prevent: deadlocks and logic races
8. Where `async` fits: an orientation, not a lesson

**Figures.** `borrows` (a lock guard's span), a timeline of a deadlock.
**Cells that must fail.** `E0373`, `E0277` (`Rc` across threads), `E0382` (use after `send`).
**Questions (7).** Does it compile, three variants. Why `Rc` isn't `Send`. When a `Mutex` unlocks. Select all: what Rust prevents at compile time. Threads or `async` for three workloads.
**Challenges (6).** `spawn-and-join` (w). `parallel-sum` (c): scoped threads over chunks. `shared-counter-threads` (c). `channel-pipeline` (c). `rc-across-threads` (c, fix, broken compile). `worker-pool` (s). Every test is written to give the same result on every run.

#### 24. `unsafe-and-beyond` · Unsafe Rust & where to go next · 35 min

1. What `unsafe` means: five extra abilities, and nothing else is switched off
2. Raw pointers
3. Undefined behavior is back
4. Safe abstractions over unsafe code: `split_at_mut`, `Vec`
5. Miri: a detector for undefined behavior, in a `native` callout
6. Calling C: `unsafe extern "C"`, `CString`, `repr(C)`
7. Reading macros: what `println!` and `vec!` expand to; a small `macro_rules!`
8. Where to go from here

**Cells that must fail.** `E0133` (dereferencing a raw pointer outside `unsafe`).
**Questions (7).** Select all: what `unsafe` permits. Which operations are safe on a raw pointer. Where the bug is when safe code crashes. Select all: undefined behavior. What a macro expands to. Which tool for three situations.
**Challenges (5).** `raw-read` (w, unsafe). `my-split-at-mut` (c, unsafe, forbid `split_at_mut`). `c-strlen` (c, unsafe): a safe wrapper around a C function. `off-by-one-read` (c, fix, unsafe): a wrong length that gives a wrong, repeatable result. `max-macro` (s).
**C note.** Unsafe Rust is C with better tooling: everything in the C course's undefined-behavior lesson applies inside these blocks.

## 8. Phase D: Wire it into the repository

- **D1.** `courses/rust-intro/checks.cjs`: the interface walk-through that `c-intro` has, for this course. Run a cell, see a failing cell's recorded and live output, answer each question kind, fail then pass a challenge, pass a tracked challenge, reload and confirm progress survived, check the narrow layout.
- **D2.** `courses/rust-intro/README.md`: mode, language, files, storage key, compiler version, how to check, deployment history.
- **D3.** Root `README.md`: a row in the course table.
- **D4.** Cross-links. Add a sidebar link from `rust-intro` to `c-intro`, and one from `c-intro` to `rust-intro`. The second changes `c-intro`'s page, so it reaches learners only when `c-intro` is next deployed. That deploy also carries the engine changes, so it needs a full check of `c-intro` first and its own go-ahead.
- **D5.** Finish the skill update from A10 with the real lessons as exemplars: the `ownership` lesson for failing cells and repair challenges, `mutable-borrows` for the `borrows` figure, and `smart-pointers` for tracked challenges.

## 9. Phase E: Preview and deploy

Each deploy needs an explicit go-ahead. The first one creates a DNS record and a certificate in the `bitshield.dev` zone.

- **E1.** `npm run preview -- rust-intro`, then `node tools/verify.cjs rust-intro --url http://127.0.0.1:8787`.
- **E2.** `node tools/verify.cjs rust-intro --live`, to compare the real Playground with the local compiler on a small sample.
- **E3.** `npm run deploy:dry-run -- rust-intro`.
- **E4.** With the go-ahead: `npm run deploy -- rust-intro`, then verify the live address and record the date, version ID and a note in the course README.

An optional early deploy after Part 2 would let the course be tried on real devices against the real Playground before the remaining 17 lessons are written.

## 10. Risks, and how the plan handles them

| Risk | Handling |
| --- | --- |
| The Playground is down, slow, or refuses the request | Reading never depends on it: failing cells show recorded output. Run and grading show a clear message and can be retried |
| The Playground's owners object to outside use, or change the protocol | The endpoint is one setting. The stand-in server from A8 already implements the protocol, so a self-hosted service is a small step. `--live` catches protocol changes before a deploy |
| The Playground's compiler is newer than the local one (1.100 against 1.99 today) | Checks match error codes, not wording. Recorded output may differ slightly from live output. The course README records the local version; update the local toolchain before each part |
| A learner's code leaves their browser | Stated in lesson 1 and beside the challenge editor |
| Checks become slow with several hundred programs | Disk cache, parallel compilation before the walk, and `--only` while writing |
| Output differs between runs | Made deterministic, or marked `varies` |
| An engine change breaks a C course | Every Phase A step ends with `npm run check` for all courses; `c-intro`'s own interface checks stay as they are |
| Scale: about 12,000 lines of lessons | One part at a time, each ending green; review after Part 2 before the rest is written |

## 11. Out of scope for the first version

- `async` beyond the orientation in lesson 23.
- Writing macros beyond one small `macro_rules!`.
- Running Miri or Clippy from the page. The Playground offers both, so they could be added later.
- A downloadable Cargo workspace of the challenges for people who prefer their own editor.
- A lab-mode follow-on project in Rust, in the manner of `c-inotify`.
