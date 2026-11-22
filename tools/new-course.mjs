// Creates a new course folder with one sample lesson that already passes `npm run check -- <id>`.
// The sample lessons are tools/templates/<mode>-lesson.js.
//
//   node tools/new-course.mjs <id> --mode compiler|lab --title "Title" --summary "One sentence."
//                             [--subtitle "Topbar subtitle"] [--tag "C17"]
//
// <id> becomes the folder courses/<id>/, the Worker name and the hostname <id>.courses.bitshield.dev.
// --mode compiler   lessons with C that runs in the browser, and graded challenges
// --mode lab        lessons whose practical work happens on a Linux machine, with a notebook
// Nothing is deployed. Replace the sample lesson, then follow the course's README.md.
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import courses from './courses.cjs';

const args = process.argv.slice(2);
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const id = args[0];
const mode = option('--mode');
const title = option('--title');
const summary = option('--summary');
const usage = 'Usage: node tools/new-course.mjs <id> --mode compiler|lab --title "Title" --summary "One sentence." [--subtitle "…"] [--tag "…"]';
if (!id || id.startsWith('--') || !courses.modes.includes(mode) || !title || !summary) {
  console.error(usage);
  process.exit(1);
}
if (!courses.idPattern.test(id)) {
  console.error(`"${id}" is not a usable id: use lower-case words joined by hyphens, such as c-sockets.`);
  process.exit(1);
}
const dir = path.join(courses.coursesDir, id);
if (existsSync(dir)) {
  console.error(`courses/${id}/ already exists.`);
  process.exit(1);
}

const lab = mode === 'lab';
const subtitle = option('--subtitle') || (lab ? 'Linux lab project' : 'Interactive programming course');
const tag = option('--tag') || (lab ? 'Linux' : 'C17');
const url = `https://${id}.courses.bitshield.dev/`;
const storageKey = `${id}-v1`;
const today = new Date().toISOString().slice(0, 10);
const html = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='8' fill='%2317211d'/%3E%3Cpath d='m9 13 7 7-7 7m12 0h10' fill='none' stroke='%23bff2cb' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";
const engineScripts = lab
  ? ['core/ui.js', 'core/widgets.js', 'lab/notebook.js', 'core/app.js']
  : ['core/ui.js', 'core/widgets.js', 'compiler/driver.js', 'compiler/runtime.js', 'core/app.js'];
const progress = lab ? 'Project progress' : 'Course progress';

const page = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="${html(summary)}">
    <meta name="theme-color" content="#17211d">
    <title>${html(title)} · C / Field Manual</title>
    <link rel="canonical" href="${url}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${html(title)} · C / Field Manual">
    <meta property="og:description" content="${html(summary)}">
    <meta property="og:url" content="${url}">
    <link rel="icon" href="${icon}">
    <link rel="stylesheet" href="../../engine/core/styles.css">
    <script defer src="lessons/01-getting-started.js"></script>
${engineScripts.map(file => `    <script defer src="../../engine/${file}"></script>`).join('\n')}
  </head>
  <body data-mode="${mode}" data-storage-key="${storageKey}">
    <a class="skip-link" href="#lesson-title">Skip to the lesson</a>
    <header class="topbar">
      <a class="brand" href="#" aria-label="${html(title)}, first lesson">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 6 6-6 6m9 0h7"/></svg>
        </span>
        <span class="brand-text">
          <span class="brand-name">C <span class="brand-divider">/</span> Field Manual</span>
          <span class="brand-subtitle">${html(subtitle)}</span>
        </span>
      </a>
      <div class="topbar-meta">
        <span class="version-tag"><span class="version-dot" aria-hidden="true"></span>${html(tag)}</span>
        <div class="top-progress">
          <span id="top-progress-label">0 lessons</span>
          <span class="top-progress-track" aria-hidden="true"><span id="top-progress-fill" class="top-progress-fill"></span></span>
        </div>
        <button class="mobile-menu-toggle" type="button" aria-controls="sidebar" aria-expanded="false">Contents</button>
      </div>
    </header>

    <div class="app-shell">
      <aside id="sidebar" class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-heading">
            <h2 id="contents-title" class="sidebar-title">${html(title)}</h2>
            <span id="lesson-count" class="sidebar-eyebrow"></span>
          </div>
          <nav id="chapter-list" class="chapter-list" aria-labelledby="contents-title"></nav>
          <div class="sidebar-progress">
            <div class="sidebar-progress-heading">
              <span>${progress}</span>
              <span id="sidebar-progress-label">0%</span>
            </div>
            <div id="sidebar-progress-bar" class="sidebar-progress-track" role="progressbar" aria-label="${progress}" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0">
              <span id="sidebar-progress-fill" class="sidebar-progress-fill"></span>
            </div>
            <p class="progress-caption" id="progress-caption"></p>
          </div>
        </div>
      </aside>

      <main id="main-content" class="main-content">
        <header class="lesson-header" id="lesson-header">
          <div class="lesson-breadcrumb">
            <span id="lesson-category"></span>
            <span aria-hidden="true">/</span>
            <span id="lesson-kicker" class="lesson-kicker"></span>
          </div>
          <h1 class="lesson-title" tabindex="-1" id="lesson-title">${html(title)}</h1>
          <p id="lesson-summary" class="lesson-summary"></p>
          <div id="lesson-meta" class="lesson-meta"></div>
        </header>
        <div class="lesson-tabs" role="tablist" aria-label="Lesson activities" id="lesson-tabs"></div>
        <div id="lesson-stage" class="lesson-layout" role="tabpanel" tabindex="-1"></div>
        <footer id="lesson-footer" class="lesson-footer"></footer>
        <noscript><p>Enable JavaScript in your browser to take the interactive course.</p></noscript>
      </main>
    </div>
  </body>
</html>
`;

const wrangler = `{
  "$schema": "../../node_modules/wrangler/config-schema.json",
  // Must match the folder name. tools/courses.cjs refuses anything else, so one course cannot deploy over another.
  "name": "${id}",
  // The Workers runtime version. Set it when the course is created; change it on purpose, not on every deploy.
  "compatibility_date": "${today}",
  // Assets only: no Worker script. \`npm run deploy -- ${id}\` builds dist/${id}/ first. Paths are relative to this file.
  "assets": {
    "directory": "../../dist/${id}",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  },
  "workers_dev": true,
  // The first deploy creates the DNS record and certificate in the bitshield.dev zone.
  "routes": [{ "pattern": "${id}.courses.bitshield.dev", "custom_domain": true }]
}
`;

const readme = `# ${title}

${summary}

- Mode: **${mode}**${lab ? ' (lessons in the browser, practical work on Linux with a notebook)' : ' (C compiles and runs in the browser; graded challenges)'}
- Live: ${url} (not deployed yet)
- Local: open [index.html](index.html) straight from this folder.
- Saved progress: \`localStorage["${storageKey}"]\`. Never change this key after the first deploy.

## Files

| Path | Contents |
| --- | --- |
| \`index.html\` | The page. Loads the lessons, then the engine from \`../../engine/\`. |
| \`lessons/\` | One script per part, each pushing lessons onto \`window.C_LESSONS\`. |
| \`course.json\` | Title, summary and the files to publish. |
| \`wrangler.jsonc\` | The Cloudflare Worker and its domain. |

## Checking and deploying

\`\`\`bash
npm run check -- ${id}
npm run preview -- ${id}            # http://localhost:8787
npm run deploy:dry-run -- ${id}
npm run deploy -- ${id}
\`\`\`

## Deployment history

| Date | Version ID | Notes |
| --- | --- | --- |
`;

mkdirSync(path.join(dir, 'lessons'), { recursive: true });
writeFileSync(path.join(dir, 'index.html'), page);
copyFileSync(path.join(courses.root, 'tools', 'templates', `${mode}-lesson.js`), path.join(dir, 'lessons', '01-getting-started.js'));
writeFileSync(path.join(dir, 'course.json'), `${JSON.stringify({ title, summary, publish: ['index.html', 'lessons'] }, null, 2)}\n`);
writeFileSync(path.join(dir, 'wrangler.jsonc'), wrangler);
writeFileSync(path.join(dir, 'README.md'), readme);

const problems = courses.check(courses.loadAll());
if (problems.length) {
  console.error(`Created courses/${id}/, but the course settings have problems:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Created courses/${id}/ (${mode} course, ${url}).
Next:
  npm run check -- ${id}     the sample lesson should pass
  open courses/${id}/index.html
Then replace the sample: overwrite lessons/01-getting-started.js, or delete it and change its
<script> line in index.html to load the new lesson files.`);
