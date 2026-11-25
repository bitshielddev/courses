# User Story Mapping

A short, interactive course based on Jeff Patton’s *User Story Mapping* (O’Reilly, 2014). It follows one request at a community repair café from a one-line ask to a story map, a first release and a build plan.

## Local development

From this directory, select the Node.js version in `.node-version` and run the following commands.

```sh
npm ci
npm run dev
```

The nine lessons take about 45 minutes and follow the six steps of story mapping from chapter 5 of the book. Each lesson states one idea, shows it on the café’s map, and has an exercise, three key points, a check question and a prompt to take back to work. Passing a lesson check saves progress in the current browser. The [cheat sheet](src/pages/cheat-sheet.astro) puts the method on one printable page, and the [workshop](src/pages/workshop.astro) has two printable team exercises.

## Where the content lives

| File | Contents |
| --- | --- |
| [src/data/lessons.ts](src/data/lessons.ts) | Lesson order, parts, the six steps, key points, check questions, team prompts and chapter references. |
| [src/pages/lessons/](src/pages/lessons/) | The prose of each lesson, one `.astro` file per lesson, wrapped in [Lesson.astro](src/components/Lesson.astro). |
| [src/data/map.ts](src/data/map.ts) | The repair café story map: activities, tasks, body cards, releases and Noor’s original backlog. Every map figure and exercise reads from this file, so a card changed here changes on every page. |
| [src/components/](src/components/) | The map figure and the exercises: card sorting, backlog to map, What-About, release slicing and the assumption choice. |

Two retired lesson addresses redirect to their replacements through [public/_redirects](public/_redirects).

The source EPUB stays in the course root as local reference material. Astro builds the site from `src/` and `public/`, and Git ignores the EPUB.

See the [Cloudflare deployment guide](docs/deploy-cloudflare.md) for checks, the course address and the catalog release.
