# Lean / Field Manual

An interactive Lean 4 course for programmers who know Python. Write programs, state what correct means as a theorem, and prove it.

- Mode: **lab** (lessons and questions in the browser; the practical work is done in Lean on the learner's machine, with a notebook)
- Lean version: **4.36.0**, pinned in `lean/lean-toolchain` and in the project each learner creates in lesson 1
- Live: https://lean-intro.courses.bitshield.dev/ (checking copy: https://lean-intro.nixprivacy.workers.dev)
- Local: open [index.html](index.html) straight from this folder.
- Saved progress: `localStorage["lean-intro-v1"]`. Never change this key after the first deploy.

The audience knows Python and has not used Lean or a proof assistant. Comparisons are with Python, in `compare` callouts headed "Coming from Python". C is not assumed. A later course is planned on verifying Rust with Lean; lessons 11 to 13 and 16 prepare for it.

## Lessons

16 lessons in 5 parts, each with reading, six or seven questions and one lab. 127 questions and labs in all.

| Part | Lessons |
| --- | --- |
| 1 · Lean as a language | `first-contact`, `functions-types-data`, `recursion-termination` |
| 2 · Proofs | `propositions-proofs`, `equality-rewriting`, `induction`, `automation` |
| 3 · Specifications | `specifications`, `types-that-carry-proofs`, `binary-search` |
| 4 · Imperative code | `loops`, `loop-invariants`, `machine-integers` |
| 5 · Trust and AI | `what-did-you-prove`, `ai-written-proofs`, `proof-to-running-code` |

Lesson ids and lab ids (`lab-NN-…`) are progress keys. Keep them once the course is deployed, and append new questions instead of inserting them.

## Files

| Path | Contents | Published |
| --- | --- | --- |
| `index.html` | The page. Its `<body>` sets `data-language="lean"`, `data-lab-title`, `data-compare-label` and `data-finished-label`. | yes |
| `lessons/00-shared.js` | The blocks every lab uses: how to fetch the lab file, how to check it, where the solutions are. | yes |
| `lessons/01-…js` to `05-…js` | One script per part. | yes |
| `lab/LabNN.lean` | Lab NN as the learner receives it, with holes. **Generated.** | yes |
| `lab/solutions/LabNN.lean` | The same file with the holes filled. **Generated.** | yes |
| `lab/difftest.py` | Lesson 16's comparison of the Lean program with Python. **Generated** (copied). | yes |
| `lean/Labs/LabNN.lean` | The source of both lab files: the solution, with markers round each part the learner writes. | no |
| `lean/Labs/static/` | Files published into `lab/` unchanged. | no |
| `lean/Reading/LNN.lean` | Every piece of Lean that lesson NN quotes, and every message and goal, pinned with `#guard_msgs`. | no |
| `lean/labs.cjs` | Writes `lab/` from `lean/Labs/`. | no |
| `lean/fill-guards.cjs` | Fills `/-- ?? -/` placeholders in a reading file with what Lean prints. | no |
| `checks.cjs` | This course's checks, run by `npm run check`. | no |

## Nothing reaches a learner unless Lean accepted it

The lessons quote Lean code, Lean's error messages and goal states, and hand out Lean files. A model writing those from memory will get some of them wrong, so none of them is written from memory. `checks.cjs` enforces five things:

1. `lean/Reading/` and `lean/Labs/` build with no warnings (`lake build --wfail`).
2. `lab/` is exactly what `lean/labs.cjs` produces.
3. Each starter reports nothing but its holes. Lab 14 plants one failing test on purpose, which is listed in `planted`. Each solution that prints its axioms prints only the standard ones.
4. Every `code` and `text` block in lesson NN, and every question's `code`, is found in `Reading/LNN.lean` or that lesson's lab files. Code is compared a paragraph at a time, ignoring comments and spacing. A `text` block (a message or a goal) must appear whole.
5. Each lesson links to its own lab and solution, and a served copy matches the source.

Two fields on a block opt out of rule 4: `lang: 'python'` (or any language but Lean), and `unchecked: true`, used for terminal output that is not Lean's. Python blocks must at least parse. Inline code in prose is not checked by a tool, so check any such claim by adding it to the reading file.

The checks need Lean on the machine: install [elan](https://lean-lang.org/install/), which reads the version from `lean/lean-toolchain`.

## Writing or changing a lesson

Write the Lean first.

1. Add the code the lesson will quote to `lean/Reading/LNN.lean`. Above a command whose message or goal the lesson shows, write `/-- ?? -/` and `#guard_msgs in`, with `trace_state` inside a proof where a goal is wanted. Then run `node courses/lean-intro/lean/fill-guards.cjs Reading/LNN.lean`, which replaces each placeholder with Lean's real output.
2. Write the lab in `lean/Labs/LabNN.lean` as a complete, proved file. Mark each part the learner writes:

   ```lean
   theorem triple_eq (n : Nat) : triple n = n + n + n := by
     --! begin solution
     unfold triple
     omega
     --! end solution
   ```

   The starter gets `sorry` there. To give the starter something else, such as a false statement to repair, add a `--! starter` section of `--! |` lines. `lean/labs.cjs` documents the markers.
3. `node courses/lean-intro/lean/labs.cjs` regenerates `lab/`.
4. Copy code and messages into the lesson from the reading file, never from memory, and run `npm run check -- lean-intro`.

Lesson summaries, lesson titles and notebook placeholders are shown as plain text, so they take no backticks.

## What was checked, and how

- Every lab's published solution was run in a fresh project made with `lake +leanprover/lean4:v4.36.0 new`, the way a learner would: `lean LabNN.lean` prints nothing, except the audit lines that labs 14 and 15 ask for.
- Lesson 16 was followed end to end in that project: `lean --run`, the executable target, `lake build sorter`, and `difftest.py` against the built program.
- Not checked on this machine: `lake check`, which lesson 14 describes from the Lean 4.35 release notes. It needs Linux. The editor steps in lesson 1 (VS Code, the goal panel) follow Lean's install guide and were not exercised here.

## Things that will need attention

- **`vcgen` is experimental.** Lesson 12 depends on it. It arrived in Lean 4.35, replacing `mvcgen`, and its syntax may change. The pinned toolchain keeps the lesson working; moving to a newer Lean means rebuilding `Reading/L12.lean` and `Labs/Lab12.lean` and reading what changed.
- **Quoted messages are pinned to 4.36.0.** A newer Lean words some errors differently. `lake build --wfail` reports each difference, and `fill-guards.cjs` does not overwrite a filled docstring, so a person decides.
- `Reading/L03.lean` quotes one message that contains its own line number. That definition is kept at the top of the file so edits below do not move it.
- `Reading/L13.lean` takes about ten seconds to build, because one example waits for the bit-level solver to time out.

## Checking and deploying

```bash
npm run check -- lean-intro
npm run preview -- lean-intro            # http://localhost:8787
npm run deploy:dry-run -- lean-intro
npm run deploy -- lean-intro
```

The lab commands in the lessons fetch files from `https://lean-intro.courses.bitshield.dev/lab/…`. Those paths are public since the first deploy, so do not move or rename them. The download links beside them also work from disk.

## Deployment history

| Date | Version ID | Notes |
| --- | --- | --- |
| 2026-11-23 | `6e501ee8-0744-438a-bf00-cdfd058839b7` | First deploy: 16 lessons. Full suite passed on the `workers.dev` copy. On the course address the home page, health check, 404 page and five lab files were fetched and matched the source. |
