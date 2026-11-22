# Lesson format

What `engine/core/app.js` renders and `tools/verify.cjs` checks. Almost every field here is used by an existing lesson. To see one in context, search for it, for example `grep -n "track: true" courses/c-intro/lessons/*.js`.

Contents: [Lesson files](#lesson-files) · [Lesson](#lesson) · [Blocks](#blocks) · [Figures](#figures) · [Questions](#questions) · [Challenges (compiler mode)](#challenges-compiler-mode) · [Labs (lab mode)](#labs-lab-mode) · [The browser compiler](#the-browser-compiler) · [What the verifier enforces](#what-the-verifier-enforces)

## Lesson files

Each part is a classic script (not a module), so it also works from `file://`:

```js
// Part 2: Pointers. One line on what this part covers.
(() => {
  const c = String.raw;            // c`…` keeps backslashes, so C's "\n" stays as written
  const part = 'Part 2 · Pointers'; // the sidebar heading for these lessons

  (window.C_LESSONS ||= []).push(
    { id: 'pointers', /* … */ },
    { id: 'const-and-declarations', /* … */ },
  );
})();
```

Lessons appear in script order, then push order. Write C with `` c`…` ``. In an ordinary string, `'\n'` is a newline character, which is right for `expect` and `answer`. In a `` c`…` `` template, `\n` stays as the two characters C needs.

## Lesson

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique in the course. Used in the URL (`#pointers/quiz`) and as the progress key, so keep it after publishing. |
| `title` | string | Sidebar and page heading. |
| `category` | string | The part's name. Consecutive lessons with the same value are grouped in the sidebar. |
| `minutes` | number | Shown as the reading time. |
| `summary` | string | One or two sentences under the title. |
| `topics` | string[] | Short tags under the title. |
| `sections` | `{ title, body: Block[] }[]` | The **Learn** tab, numbered, with a contents list beside it. |
| `takeaways` | string[] | The "Keep in mind" box at the end of the reading. |
| `quiz` | Question[] | The **Questions** tab. |
| `challenges` | Challenge[], or `[Lab]` (an array holding exactly one lab) | The **Challenges** tab (compiler mode) or the **Linux lab** tab (lab mode). |

A lesson is complete when every question is answered correctly and every non-stretch challenge passes, or in lab mode when every check is ticked.

## Blocks

`body`, callouts, `details` and challenge prompts all hold blocks. Blocks nest: a `run` cell inside a callout is still compiled and checked.

**Prose** means paragraph strings, titles, summaries, takeaways, list items, table cells, callout strings, question text, options, `why`, `explain`, `hint`, trace `say` text, lab checks and test labels. Prose supports only `` `code` `` and `**bold**`. Anything else, links included, shows as literal text. Prose must be one line: a real newline in it fails the check. Code-like fields are exempt and may span lines: `run`, `code`, `shell`, `text`, `expect`, `answer`, `starter`, `solution`, `prelude`, `signature` and test `body`.

| Block | Renders as |
| --- | --- |
| `'A string.'` | A paragraph. |
| `{ run: c`…`, name: 'file.c', expect: 'out\n' }` | **Compiler mode only.** An editable program with a Run button. `expect` is the exact stdout. The verifier requires it unless `warns` or `varies` is set. Every cell must compile and exit 0. To show a compile error, use a `code` block or a challenge with `broken: 'compile'`. |
| `…, warns: true` | The cell is meant to produce a compiler warning; the verifier requires one. |
| `…, varies: true` | The output differs between runs (addresses, for example), so it has no `expect`. |
| `…, sizes: true` | The output depends on type sizes, which differ on 64-bit machines, so `--native` skips comparing stdout. |
| `{ code: c`…` }` | Highlighted read-only C. With `name`, it gets a file label. In lab mode a named `code` block becomes a file card with a Copy button. |
| `{ shell: 'cmd', name: 'Terminal A · what it does' }` | A terminal command card with a Copy button. Name the terminal and the purpose. |
| `{ text: '…' }` | Plain preformatted text, such as output or a diagram. |
| `{ list: [...] }` and `{ steps: [...] }` | Bulleted and numbered lists of prose strings. |
| `{ table: { head: [...], rows: [[...], ...] } }` | A table. Every cell is prose; use `''` for an empty one. |
| `{ compare: … }` | Callout "Coming from Python, PHP or TypeScript". |
| `{ pitfall: … }` | Callout "Pitfall". |
| `{ aside: … }` | Callout "Under the hood". |
| `{ tip: … }` | Callout "Tip". |
| `{ native: … }` | Callout "On your machine". |
| `{ details: 'Summary', body: [...] }` | A collapsed section. |
| `{ link: 'url', label: 'Text', download: 'name.c' }` | A link paragraph. `download` is optional and sets the saved file name. The verifier checks that relative links resolve, both on disk and when served. |
| `{ trace }`, `{ memory }`, `{ strip }`, `{ widget }` | Figures, described in the next section. |

A callout's value is a string or an array of blocks, and it takes an optional `title` that replaces the default label. Use `tip: ['Text', { shell: '…', name: '…' }]` to put a command inside a callout.

## Figures

Memory figures share one model. `vars` declares objects, and values are set by id.

```js
vars: [
  { id: 'n', type: 'int' },                                  // frame defaults to 'main'
  { id: 'p', type: 'int *' },
  { id: 'bonus.score', name: 'score', type: 'int', frame: 'add_bonus' },  // another stack frame
  { id: 'values', type: 'int', len: 4, past: true },         // an array; past adds a "one past the end" slot
  { id: 'point', type: 'struct Point', fields: [['x', 'int'], ['y', 'int']] },
  { id: 'block', type: 'char', len: 8, frame: 'heap' },      // frames: main, a function name, 'heap', 'static'
]
```

Values can be a number or string shown as written (`7`, `"'B'"`, `0.5`), `'&id'` for a pointer drawn as an arrow, `'NULL'`, or `'?'` for indeterminate. An object that is never set is also indeterminate. Set a whole array with `values: [4, 7, 2, 9]` or one element with `'values[2]': 2`. Set a struct with `point: { x: 1, y: 2 }` or `'point.x': 1`. Addresses are invented and kept short: stack frames count down from 0x7fe0, the heap starts at 0x3000 and static storage at 0x1000. Sizes match the browser's wasm32: pointers 4, `char` 1, `short` 2, `double` and `long long` 8, everything else 4. Give a `vars` entry an `addr` to place it exactly.

- **`{ memory: { title, vars, set, show?, dead?, caption } }`** draws a still diagram.
- **`{ trace: { title, code, vars, steps } }`** steps through numbered code. Each step is `{ line: 3 | [3, 4], say: 'prose', set?: {...}, show?: [ids], dead?: [ids], hide?: [ids or 'frame:<name>'] }`. `show` reveals an object that has no value yet, and `dead` marks storage as freed, so pointers to it are drawn as dangling. `hide` removes objects; `'frame:add_bonus'` removes a returned frame. A pointer to a hidden object is drawn as dangling.
- **`{ strip: { title, cells, caption, start?, ghost?, address?: { base, step }, marks?: [{ at, span?, label }], dim?: [i], accent?: [i], kicker? } }`** draws adjacent elements, such as an array or a string, from left to right. Each cell always shows an index underneath, counting up from `start` (default 0). The numbering can't be hidden or reversed, so a strip suits arrays better than binary digits; use the `bits` widget or a `table` for those. `null` in `cells` shows as `?`. `ghost` adds an "end" slot after the last cell. `address` prints `base + step × i` under each cell. `marks` labels a span of cells above the row, `dim` greys the listed cells and `accent` highlights them. `kicker` replaces the small "Layout" label.
- **`{ widget: 'bits' | 'pointerLab' | 'structLayout' | 'cdecl' }`** inserts a self-contained interactive figure written for `c-intro`: bit patterns, pointer arithmetic, struct padding and a declaration reader. A new widget goes in `engine/core/widgets.js`, and the whole block object is passed to it.

## Questions

**Single choice** (the default):

```js
{ q: 'Question text', code: c`optional C shown with the question`,
  options: [
    { t: '`42`', ok: true, why: 'Why this is right.' },
    { t: '`67`', why: 'The misconception behind this answer, and the truth.' },
  ],
  explain: 'Optional: shown after the correct answer.',
  verify: true }   // optional: the verifier runs `code` and expects stdout to equal the right option, minus backticks
```

Exactly one option has `ok`, and every option needs a `why`. `verify` compares the output the same way predict answers are compared: spaces at line ends and blank lines at the start and end are ignored, so a final `\n` doesn't matter. In a lab course a question's `code` is shown but never run, and `verify` is ignored.

**Select all**: `{ kind: 'multi', q, options: [{ t, ok?, why? }], explain?, hint? }`. At least one option is right, and not all of them are. `why` is optional. The feedback lists each option that has one as **Yes:** or **No:**.

**Predict the output** (compiler mode only): `{ kind: 'predict', q, code, answer, explain, hint?, warns? }`. `code` is a complete program. `answer` is its exact stdout without the final newline. Leading spaces count and trailing spaces don't. The verifier runs `code` and compares, so the answer can't drift from the program. Write `answer` as `'line 1\nline 2'` for several lines. After one wrong try the learner can run the program and see its real output. After two, they also see `hint`.

## Challenges (compiler mode)

```js
{
  id: 'swap-ints',                 // unique in the course, and part of the progress key
  title: 'Put two values in order',
  level: 'warm-up',                // 'warm-up' | 'core' | 'stretch' (stretch is optional for completion)
  kind: 'fix',                     // optional: adds a "Fix the bug" badge; the starter is buggy code
  prompt: 'Prose, or an array of blocks.',
  signature: 'void sort_pair(int *a, int *b)',  // optional: shown as code; may be several lines for several functions
  prelude: c`struct Pair { int first; int second; };`,  // optional: "Already declared for you", compiled first
  starter: '…',                    // what the editor starts with
  solution: '…',                   // shown under "Reference solution"; must pass every test silently
  solutionNote: 'Optional prose above the solution.',
  hints: ['First nudge.', 'Stronger.', 'Nearly the answer.'],
  tests: [
    { label: 'Leaves ordered values alone', body: c`int a = 1, b = 2;
sort_pair(&a, &b);
CHECK(a == 1 && b == 2);` },
    // at least three
  ],
  track: true,                     // optional: the checking allocator (below)
  forbid: ['strlen'],              // optional: identifiers the learner's code may not use
  broken: 'compile',               // optional: how the starter fails, if it doesn't just fail a test ('compile' | 'timeout' | 'crash')
  starterWarns: true,              // optional: the starter may produce compiler warnings
}
```

The learner's code is compiled with `stdio.h`, `stdlib.h`, `stddef.h`, `string.h`, `stdint.h`, `stdbool.h`, `limits.h` and `ctype.h` already included. A `main` in it is renamed, so the learner may keep one for experiments. Each test `body` is the body of a `void` function. `CHECK(expr)` fails the test and reports the expression's source text, then lets the test carry on. Guard what comes next when it depends on the check, for example `CHECK(copy != NULL); if (copy != NULL) { … }`. A test can hold several checks. Tests run in order in one process, so static state in the learner's code persists from test to test. A crash stops the remaining tests, which show as "Did not finish". Writing through a null pointer fails the test even though WebAssembly allows it.

With `track: true`, `malloc`, `calloc`, `realloc` and `free` go through a checking allocator. New blocks are filled with `0xCD`, freed blocks with `0xDD`, and addresses are never reused within a test. A leak, a double or invalid free, or a write past the end of a block fails the test that caused it. Tests can use these helpers:

- `LIVE_ALLOCATIONS()` and `ALLOCATION_COUNT()` return `size_t` counts for the current test.
- `BLOCK_SIZE(p)` returns a live block's size, or 0 for NULL or a pointer the allocator doesn't know.
- `FAIL_ALLOCATIONS_AFTER(n)` lets the next `n` allocations succeed and makes every later one return NULL, to test cleanup when memory runs out.

The allocator, its counts and the failure budget reset before every test. The page adds a "Heap-checked" badge and a note explaining the checks by itself, so the prompt needn't.

`legacy` is specific to `c-intro`. It maps a challenge to first-edition progress.

## Labs (lab mode)

In a lab course, `challenges` is an array holding exactly one lab:

```js
challenges: [{
  id: 'build-a-probe',  // unique in the course, and part of the progress key
  kind: 'lab',          // by convention; the engine doesn't read it for labs
  level: 'core',        // keep 'core': a 'stretch' lab would not count towards completing the lesson
  title: 'Ask the compiler about an event',
  prompt: [ 'Instructions as blocks.', { shell: 'cc -std=c17 -Wall probe.c -o probe', name: 'Terminal A · build' } ],
  hints: ['Optional, revealed one at a time.'],
  checks: ['Something the learner observed and ticks off.'],        // all ticked = lab complete
  notes: [{ label: 'Header size', placeholder: 'What to paste here.' }],  // saved notebook fields
  reviewNotes: true,  // optional: open "Read earlier observations" by default
}],
```

The notebook keeps notes and ticks in the browser. Notes from earlier lessons are listed under "Read earlier observations", which lets a later lab ask the learner to compare traces. Lab courses don't load the compiler, so they can't use `run` cells or `predict` questions. Put C sources the learner needs in a published folder such as `lab/` and link them.

## The browser compiler

Compiler courses use Clang 8.0.1 in a Web Worker, targeting 32-bit WebAssembly with WASI libc. The flags are `-std=c17 -Wall -Wextra -Wno-unused-parameter -Werror=implicit-function-declaration`. `int`, `long` and pointers are all 4 bytes; on the learner's Mac `long` and pointers are 8, so mark size-dependent cells with `sizes: true` and say so in a `native` callout. Stdin is empty, and there is no filesystem, network, threads or signals. Compiling may take 15 s and running 2.5 s. A timeout exits with 124. Memory is capped at 64 MiB.

## What the verifier enforces

`npm run check -- <id>` fails on any of these.

**Settings, for every course.** `course.json` has a `title` and a `publish` list that includes `index.html`, and every published path exists. The body's `data-mode` is `compiler` or `lab` and it has a `data-storage-key`. The page loads the engine modules its mode needs, and a lab course doesn't load the compiler. Every local `src` or `href` exists. In `wrangler.jsonc`, the Worker name equals the folder, the assets directory is `../../dist/<id>`, and there is exactly one custom domain, which matches the canonical URL and `og:url`. No two courses share a storage key or domain. Cross-course links have a `data-published-href` that matches the target course's URL.

**Text.** Prose has no control characters (usually an unescaped `\n` in a non-raw string), balanced backticks and balanced `**`.

**Lessons.** Ids are unique. Each lesson has a `title`, `category`, `summary`, `minutes`, `topics`, sections, takeaways, questions and at least one challenge or lab.

**Questions.** A single-choice question has exactly one right option and a `why` on every option. A multi question is neither all right nor all wrong. A predict question has `code`, `answer` and `explain`, and its program prints `answer`.

**Run cells.** Each compiles and exits 0, prints exactly `expect`, and warns only when marked `warns`.

**Challenges.** Ids are unique, the level is valid, there are hints and at least three tests, and the starter differs from the solution. The solution passes every test with no output or warnings. The starter compiles cleanly, unless `broken` or `starterWarns` says otherwise, and fails at least one test. With `--native`, the same holds under the system clang with ASan and UBSan.

**Labs.** Each lesson has exactly one lab, with a prompt, at least one check, and a label on every note.

**In the browser.** Every lesson and tab renders without an uncaught exception, and compiler courses also step through every trace to its end. No page is wider than the window: compiler courses are checked at desktop width, lab courses at 390 px. Relative links resolve. No request goes to another origin. A lab course's walk-through answers every question, ticks every check, reloads, and reaches 100%.
