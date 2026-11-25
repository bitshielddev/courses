# C / Field Manual courses

Interactive field manuals for programming and product teams. Each course is a static site on its own Cloudflare Worker and subdomain. The programming courses share a lesson engine and also open straight from disk (`file://`). The Agile short course uses Astro and has its own local development commands.

Browse the [course catalog](https://courses.bitshield.dev/) for live courses and courses in development. The [catalog project](catalog/README.md) is a separate Astro site.

| Course | Mode | Live | Local |
| --- | --- | --- | --- |
| [C / Field Manual](courses/c-intro/README.md): C17 for programmers who know Python, PHP or TypeScript. 20 lessons with questions and graded challenges. | compiler | https://c-intro.courses.bitshield.dev | [index.html](courses/c-intro/index.html) |
| [Anatomy of a Neovim save](courses/c-inotify/README.md): systems project 01. Build an inotify monitor in C on NixOS and use it to find out what `:w` does. | lab | https://c-inotify.courses.bitshield.dev | [index.html](courses/c-inotify/index.html) |
| [Rust / Field Manual](courses/rust-intro/README.md): Rust for programmers who know Python, PHP or TypeScript. 24 lessons on ownership, borrowing and the rest of the language, with questions and graded challenges. | compiler (Rust) | https://rust-intro.courses.bitshield.dev | [index.html](courses/rust-intro/index.html) |
| [Lean / Field Manual](courses/lean-intro/README.md): proving programs correct in Lean 4, for programmers who know Python. 16 lessons, each with a lab that Lean itself checks. | lab | https://lean-intro.courses.bitshield.dev | [index.html](courses/lean-intro/index.html) |
| [User Story Mapping](courses/agile-user-story-mapping/README.md) takes a team from a one-line request to a story map, a first release and a build plan in nine lessons, with a cheat sheet and a team workshop. | Astro short course | https://agile-user-mapping-stories.courses.bitshield.dev | [Local setup](courses/agile-user-story-mapping/README.md#local-development) |

A course using the shared lesson engine is in one of two **modes**, set by `data-mode` on its page's `<body>`:

- **compiler**: C compiles and runs in the browser with a bundled WebAssembly Clang. Lessons have runnable cells, predict-the-output questions and challenges graded by tests. A compiler course with `data-language="rust"` on `<body>` teaches Rust instead: its code runs through the Rust Playground, and the checks use the `rustc` on this machine.
- **lab**: the practical work happens on the learner's own machine. The **Linux lab** tab gives instructions, checks to tick and a notebook saved in the browser. The compiler isn't loaded. A lab course in another language renames the tab and chooses its highlighting with attributes on `<body>`, as `lean-intro` does.

## Layout

```
courses/<id>/          one folder per course; <id> is also its Worker name and subdomain
  index.html           the page: loads its lessons, then the engine from ../../engine/
  lessons/NN-*.js      one script per part, each pushing lessons onto window.C_LESSONS
  course.json          title, summary and the files the build publishes
  wrangler.jsonc       the Worker and its custom domain
  checks.cjs           optional browser checks that only this course needs
  README.md            notes and deployment history (not published)
  lab/ …               anything else the course publishes, listed in course.json
engine/                the shared lesson engine; each course publishes the modules it loads
  core/                page logic, markup helpers, figures and styles (every course)
  compiler/            in-browser C compiler and challenge test driver (compiler courses)
  rust/                Rust Playground client and challenge test driver (Rust compiler courses)
  lab/                 Linux lab notebook (lab courses)
public/                404 page, headers, health check and robots.txt, copied into every course
tools/
  courses.cjs          finds courses and checks their settings agree
  new-course.mjs       creates a course folder with a sample lesson that passes the checks
  verify.cjs           checks courses in headless Chrome
  rust-local.cjs       stands in for the Rust Playground during checks, using the local rustc
  build.mjs            copies courses into dist/<id>/
  cloudflare.mjs       runs Wrangler for one course: preview, dry run or deploy
  templates/           the sample lessons new-course.mjs starts from
docs/                  deployment guide
dist/<id>/             build output (not committed)
```

The build rewrites `../../engine/` to `engine/` and points cross-course links at their published addresses, so each course deploys on its own. `tools/courses.cjs` stops the build and the checks if two courses share a Worker, domain or storage key. It also stops them if a page loads a missing file or a cross-course link goes to the wrong address.

## Commands

Commands that take a course take its id after `--`. `check` and `build` without one cover every course.

```bash
npm run check                          # every course; needs Google Chrome
npm run check -- c-inotify             # one course
node tools/verify.cjs c-intro --native # also build each program with the system clang under ASan and UBSan
npm run build -- c-intro               # dist/c-intro/
npm run preview -- c-intro             # served by Wrangler on http://localhost:8787
npm run deploy:dry-run -- c-intro      # validate the upload; publishes nothing
npm run deploy -- c-intro              # publish (see docs/deploy-cloudflare.md)
```

## Adding a course

```bash
npm run new-course -- c-sockets --mode lab --title "Talking over sockets" --summary "One sentence for search results."
npm run check -- c-sockets
```

This creates `courses/c-sockets/` with one sample lesson that already passes the checks. Replace that lesson with real ones. Claude Code has a project skill for the whole process, from planning the lessons to the first deploy: [.claude/skills/create-course](.claude/skills/create-course/SKILL.md).

## Deploying

See [docs/deploy-cloudflare.md](docs/deploy-cloudflare.md).
