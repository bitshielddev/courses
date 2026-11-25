---
name: create-course
description: >-
  Plan, scaffold, write, verify and deploy a new interactive course in this C / Field Manual repository, where each course is a folder under courses/ sharing the lesson engine in engine/. Use it whenever the user wants a new course, tutorial, systems project or lab here ("make a course on sockets", "another project like the inotify one", "start a C course about threads"). Also use it to add a part or several lessons to an existing course, or to change how courses are laid out, checked, built or deployed. It covers choosing between the two modes (compiler: C runs in the browser, or Rust through the Rust Playground, with graded challenges; lab: practical work on Linux with a notebook), the lesson data format, the verifier and Cloudflare deployment.
---

# Create a course

This repository holds several interactive courses that share one lesson engine. Read `README.md` at the root first. It has the course list, the layout and the commands. In short:

- `courses/<id>/` is one course: `index.html`, `lessons/NN-*.js`, `course.json`, `wrangler.jsonc`, an optional `checks.cjs` and a `README.md`.
- `engine/core`, `engine/compiler`, `engine/rust` and `engine/lab` are shared. A course publishes only the modules its page loads.
- `tools/new-course.mjs` scaffolds a course. `tools/verify.cjs` checks courses in headless Chrome. `tools/build.mjs` builds `dist/<id>/`. `tools/cloudflare.mjs` previews and deploys.

The expensive part is the lesson content, not the setup. So most of this skill is about agreeing what to write before writing it, and checking it as you go.

## 1. Agree the brief before creating files

Settle these with the user. Propose sensible answers rather than asking open questions, and ask only about what you can't infer.

**Audience.** Both existing courses are for experienced programmers who know Python, PHP or TypeScript and are newer to C, especially pointers. Lessons compare with those languages in `compare` callouts. Assume the same unless told otherwise.

**Mode.** Each course page runs in exactly one mode, so this decides a lot:

| Choose | When the practical work… | What the learner gets |
| --- | --- | --- |
| `compiler` | runs inside a sandbox: language features, algorithms, data structures, memory, the standard library without files or networking | Run cells, predict-the-output questions and challenges graded by tests, all in the browser |
| `lab` | needs a real OS: files, processes, signals, sockets, inotify, system tools, an editor | Reading, questions and a **Linux lab** tab of instructions, checks to tick and a notebook. Learners compile and run on their own machine, and can download C files |

The browser compiler is Clang 8 targeting 32-bit WebAssembly. It has no stdin, filesystem, network, threads or system calls, and a 2.5 s run limit. If a topic needs any of those, it is a lab course.

A compiler course can teach Rust instead of C (`--language rust`), as `rust-intro` does. Rust is not compiled in the browser: Run and the challenge tests send the code to the Rust Playground, so the learner needs a network connection and the page must say that code leaves the browser. Programs run on a 64-bit machine, threads work, and a run is stopped after about 10 s. The checks never call the Playground; they use the `rustc` on this machine, so it must be installed.

**Id.** Use lower-case words joined by hyphens. By convention, C courses start with `c-` (`c-intro`, `c-inotify`); the scaffold doesn't enforce it. The id becomes the folder, the Cloudflare Worker and `https://<id>.courses.bitshield.dev`. It is hard to change after the first deploy. For a throwaway or test course, use a `zz-` id, skip steps 6 and 7, and afterwards delete both `courses/<id>/` and `dist/<id>/`.

**Scope and depth.** Agree the number of parts and lessons, and roughly how many questions and challenges or labs each lesson has. Default to depth. An early 8-lesson draft of `c-intro`, with one question and one challenge per lesson, was judged "very basic and quite short". It was replaced by 20 lessons with 134 questions and 93 challenges, about 7 questions and 4–6 challenges per lesson. `rust-intro` has 24 lessons with 169 questions and 130 challenges. `c-inotify` has 5 lessons with 2 questions and one lab each, because each lab is long. Confirm the size, because it sets the cost.

**Presentation.** Pages carry the series brand "C / Field Manual" in the top bar. Ask before changing it. Also settle the top-bar subtitle and version tag (for example `C17` or `NixOS`), and whether the course links to or from another course.

A lab course need not be about C or Linux. `lean-intro` teaches Lean, compares with Python only, and carries the brand "Lean / Field Manual". Its page sets four attributes on `<body>` that `references/lesson-format.md` lists under "Page settings": the language `code` blocks are highlighted as, the name of the lab tab, the heading of `compare` callouts, and the note shown when the course is finished.

Then write an **outline**: parts, then lessons, and for each lesson its goal, key ideas and planned questions and challenges or labs. Show it to the user and get agreement before writing lesson files. Restructuring a 2,000-line lesson file after the fact is slow, and the outline is where the user's corrections are cheapest.

## 2. Scaffold

```bash
npm run new-course -- <id> --mode compiler|lab --title "Title" --summary "One sentence for search results." [--subtitle "Top-bar subtitle"] [--tag "C17"] [--language rust] [--brand "Rust"]
npm run check -- <id>
```

This creates `courses/<id>/` with one sample lesson that passes every check. The sample comes from `tools/templates/<mode>-lesson.js`. It is a minimal example of the format, not a tour of it; the reference and the exemplar lessons in step 3 show the rest. Run the check straight away so you start from green. Any later failure is then yours.

Without `--subtitle` and `--tag`, a compiler course gets "Interactive programming course" and `C17`. A lab course gets "Linux lab project" and `Linux`, and its sidebar says "Project progress". Change them in `index.html` if the brief says otherwise.

The scaffold gives the course a unique storage key (`<id>-v1`) and a `wrangler.jsonc` whose Worker name matches the folder. Don't copy another course's folder instead. A copied `wrangler.jsonc` keeps the other Worker's name, and a deploy would overwrite that course. `tools/courses.cjs` refuses that, but there's no reason to set it up.

## 3. Write the lessons

Read `references/lesson-format.md` before writing. It documents every lesson field, block, figure, question kind, challenge option and lab field, and what the verifier enforces. Then read the closest existing lessons to match the house style:

- For a compiler course, read `courses/c-intro/lessons/02-pointers.js` for prose, questions, and the `trace`, `memory` and `strip` figures. Read `04-data-and-heap.js` for `prelude`, `track: true` and `FAIL_ALLOCATIONS_AFTER`.
- For a Rust course, read the "Rust courses" section of the reference, then these lessons in `courses/rust-intro/lessons/`: `ownership` in `02-ownership.js` for cells that are meant to fail (`fails`, `panics`), the `moved` state in traces, and repair challenges with `forbid: ['clone']`; `mutable-borrows` in `03-borrowing.js` for the `borrows` figure; `smart-pointers` in `09-shared-ownership.js` for allocation-checked challenges (`track: true`). `01-foundations.js` sets the tone and depth.
- For a lab course, read `courses/c-inotify/lessons/01-anatomy-of-a-save.js`.
- For a lab course in a language other than C, read `courses/lean-intro/README.md` and one of its part files. Its labs are files with holes, generated from one checked source, and its `checks.cjs` makes the language's own compiler confirm every block the lessons quote. Follow that pattern whenever a toolchain can check the content: write the code first, copy it into the lesson, and let a check fail when the two differ.

Split lessons into files by part, `lessons/NN-slug.js`, each pushing its lessons onto `window.C_LESSONS`. A short course may keep two small parts in one file, as `c-inotify` does. The sidebar groups lessons by their `category` string, not by file. Every file needs a `<script defer src="lessons/NN-slug.js">` line in `index.html`, in order and before the engine scripts. To replace the sample, either overwrite `lessons/01-getting-started.js`, or delete it and change its `<script>` line. The settings check fails on a script that doesn't exist.

What makes these courses work, and why:

- **The feedback is the teaching.** Every wrong option in a single-choice question needs a `why` that names the specific misconception, because that text is what the learner reads after a mistake. Write distractors from real misunderstandings, not filler.
- **Nothing claims what it doesn't show.** Run cells have their exact `expect`ed output, and predict answers are checked by running the program. In compiler courses, show behaviour with a runnable program where you can.
- **Explain what C does differently.** The learner already programs, so skip what a loop is. Use `compare` for the contrast with Python, PHP or TypeScript, `pitfall` for the mistakes people actually make, `aside` for what happens underneath, and `native` for how it differs on the learner's own machine (64-bit, ASan). Use a `trace` or `memory` figure whenever the point is about memory.
- **Challenges climb.** Go warm-up, then core, then stretch (stretch doesn't count towards completion). Each challenge needs at least three tests whose labels name a behaviour. Its starter should compile cleanly and fail at least one test. Write two or three hints that build up, the last nearly giving it away. Use `track: true` for anything that allocates, so leaks and overruns fail tests.
- **Labs produce evidence.** Each shell block's `name` says which terminal it runs in and what it does, such as `'Terminal A · create the lab'`. This is a convention, not checked. Checks are facts the learner observed, not "I read the section". Notes ask for pasted output that a later lesson can compare against, because earlier notes reappear in later labs.
- **Match the prose style.** Write in plain second person and short sentences, with no marketing. Use American spelling, as both courses do ("initialize", "recognize"). Inline markup is only `` `code` `` and `**bold**`.

Work one part at a time: write it, run `npm run check -- <id>`, fix it, then go on. The checks pinpoint failures by lesson, section and question. A whole course written blind tends to produce a wall of failures.

A large course can be written by several writers at once, as `rust-intro` was (`docs/rust-intro-plan.md` has the plan they worked from). What made that work: one finished part as the exemplar; a plan that fixes every lesson id, challenge id and section list; a table of what each lesson may assume the learner has seen, so a writer need not read lessons that don't exist yet; one file per writer, of two or three lessons; and each lesson saved to its file as a full draft and brought to `ok` with `--only <lesson>` before the next is started. Afterwards, read every sentence that names another lesson and check the claim against that lesson.

## 4. Verify

```bash
npm run check -- <id>                     # settings of every course, then this course in Chrome
node tools/verify.cjs <id> --only <text>  # compiler courses: lessons whose id contains <text>, skipping checks.cjs
node tools/verify.cjs <id> --native       # compiler courses: also build each program with the system clang under ASan and UBSan
node tools/verify.cjs <id> --shots <dir>  # screenshots, saved in <dir>/<id>/
node tools/verify.cjs <id> --record       # Rust courses: rewrite lessons/recorded.js, the output of cells that are meant to fail
node tools/verify.cjs <id> --live --only <text>  # Rust courses: send one cell and one solution to the real Playground
```

- **`--native`** prints the same lines as a normal run. Only problems show up, plus the extra time.
- **The settings check covers every course.** If another course folder is half-edited, its problems appear in your run too.
- **Screenshots cover little of the page.** The checks can't judge whether a page reads well, so look. For a compiler course, `--shots` saves the top of the first lesson's Learn tab and its Questions and Challenges tabs. Add `--shot-targets <lesson>@<css selector>@<steps>@<nth>` (comma separated) to capture a figure further down, for example `pointers@.figure-trace@3@0`. A lab course gets one shot, of its first lab at phone width. To see everything, open `courses/<id>/index.html` in a browser.
- **`--probe file.json`** helps with a challenge that won't behave. Instead of checking, it runs your sources against the challenge's tests and prints each test's result by number. The JSON is a list of `{ name, lesson: <lesson id>, challenge: <challenge id>, source }`.

Run `npm run check` with no course whenever you change `engine/`, `public/`, `tools/` or another course's settings, because those affect every course. `c-intro` takes about 15 seconds, and a lab course a second or two.

`references/lesson-format.md` ends with the verifier's rules. When a check fails, the message names the field.

## 5. Optional: browser checks for this course alone

The generic checks walk every lesson, question, challenge and lab, and confirm that relative links resolve. Add `courses/<id>/checks.cjs` only for behaviour particular to this course, such as downloads that must contain certain code, or a custom widget. It runs after the generic checks. In a compiler course `--only` skips it.

```js
// courses/<id>/checks.cjs
module.exports = async function checkSomething({ browser, cdp, until, delay, fail, screenshot, all, links, readLink, page, served, course }) {
  // browser(fn, ...args)  run fn in the page and return its (JSON-serialisable) result
  // cdp(method, params)   send a Chrome DevTools command, such as 'Page.reload'
  // until(get, label)     poll get() every 50 ms until it is truthy; throws after 20 s
  // delay(ms)             wait
  // fail(where, message)  record a problem; the check carries on
  // screenshot(name)      save <name>.png when --shots was given
  // all                   window.C_LESSONS, as data
  // links                 relative links found in the lessons: { url (resolved and absolute), where, download }
  // readLink(url)         the text of a link, from disk or over HTTP
  // page, served, course  the page URL, the --url value if any, and the course's settings
  return 'what was checked'; // shown as "ok   courses/<id>/checks.cjs: what was checked" when nothing failed
};
```

See `courses/c-inotify/checks.cjs` for a download check, and `courses/c-intro/checks.cjs` or `courses/rust-intro/checks.cjs` for a full interface walk-through.

## 6. Wire it into the repository

- Fill in `courses/<id>/README.md`: what the course is, its mode, files and storage key.
- Add a row to the course table in the root `README.md`.
- To publish downloads, put them in a folder such as `lab/` and add that folder to `publish` in `course.json`. Lessons link to them relatively (`{ link: 'lab/x.c', label: '…', download: 'x.c' }`), and the checks confirm those links resolve. Shell commands that fetch them, such as `curl -fL https://<id>.courses.bitshield.dev/lab/x.c`, use the absolute published URL. Nothing checks that URL, and it returns 404 until the first deploy, so `curl` it once after deploying. Once published, those paths are public, so don't move them.
- To link two courses, add a sidebar link to the other course:
  `<a class="course-link" href="../<other>/index.html" data-published-href="https://<other>.courses.bitshield.dev/"><small>…</small><span>… <span aria-hidden="true">→</span></span></a>`.
  The `href` works from disk, and the build swaps in `data-published-href`. The settings check confirms that both point at the right course.

## 7. Deploy, only when the user says so

A deploy publishes to the internet. A course's first deploy also creates a DNS record and certificate in the `bitshield.dev` zone. Get the user's go-ahead for each deploy. A request to "create a course" isn't one.

1. `npm run preview -- <id>`, then `node tools/verify.cjs <id> --url http://127.0.0.1:8787`, which checks the built copy as Cloudflare serves it.
2. `npm run deploy:dry-run -- <id>`.
3. With the user's go-ahead: `npm run deploy -- <id>`. It needs a Wrangler login, which the user does once with `npx wrangler login`. If `npx wrangler whoami` fails, ask them to log in. Don't try to work around it. If a first deploy stops after `Uploaded <id>` with error 10007 ("This Worker does not exist"), run the same command again; `docs/deploy-cloudflare.md` explains why.
4. `node tools/verify.cjs <id> --url https://<id>.courses.bitshield.dev/` (for a Rust course, also once with `--live`, which uses the real Playground), then record the date, the version ID Wrangler printed and a one-line note in the course README's deployment history.
5. Add the new course to the parent catalog and publish it as part of the release. Follow [the course catalog instructions](../../../catalog/README.md) and verify the new card on [courses.bitshield.dev](https://courses.bitshield.dev/) links to the live course.

`docs/deploy-cloudflare.md` covers rollback and the details.

## Rules that protect learners and other courses

- **Saved progress is keyed by things that look renameable.** The store is `localStorage[data-storage-key]`, then `lessons[lesson.id]`, then `challenges[challenge.id]`, with quiz answers stored by question index. After a course is published, renaming a lesson or challenge id drops that progress. Inserting a question shifts the saved answers of the questions after it. Append new questions, and keep ids stable. Never change `data-storage-key`. For a deliberate break, `c-intro` shows the pattern: a new key, the old one in `data-legacy-storage-key`, and a `migrate()` in `engine/core/app.js` driven by each challenge's `legacy` id.
- **The folder name is the deployment.** Renaming `courses/<id>/` after a deploy creates a new Worker and domain and orphans the old one.
- **Publish only what learners need.** `course.json`'s `publish` list is an allow-list, so `README.md`, `checks.cjs` and drafts stay out of the upload. Keep it that way, and don't put notes in published folders.
- **The engine is shared.** Any change under `engine/` reaches every course on its next deploy, so check every course afterwards.

## When a course needs something the engine lacks

Extend the engine instead of special-casing a course, and keep course ids out of `engine/`:

- **A new block type**: add a branch in `renderBlock` in `engine/core/app.js`. If the block holds prose, also teach `walkBlocks` and `lint` in `tools/verify.cjs` to find it.
- **A new figure**: write it in `engine/core/widgets.js`, add it to the returned object, and use it as `{ widget: 'name', ... }`. The block object is passed to the widget.
- **Behaviour for a whole mode**: key it off `data-mode`, as the `labMode` flag in `app.js` does.
- **A new mode or engine module**: give it a folder in `engine/`, then teach `tools/courses.cjs` the mode, `tools/verify.cjs` its checks, and `tools/new-course.mjs` its template. The build already publishes any `engine/<module>/` that a page loads.

Then run `npm run check` across every course.
