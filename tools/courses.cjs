// Finds the courses under courses/ and checks that their settings agree.
// build.mjs, verify.cjs, cloudflare.mjs and new-course.mjs all use it, so a course that
// would deploy over another, share its saved progress or link to a missing page is
// caught before anything is built.
//
// A course is a folder courses/<id>/ holding course.json. Its <id> is also its Worker name
// and the first label of its hostname. See README.md for the layout.

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const coursesDir = path.join(root, 'courses');
const engineDir = path.join(root, 'engine');
const idPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const modes = ['compiler', 'lab'];

// Wrangler configs are JSONC: drop comments and trailing commas, leaving strings alone.
function readJsonc(file) {
  const text = fs.readFileSync(file, 'utf8')
    .replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (match, string) => string ?? '')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(text);
}

const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value]));
const isExternal = reference => /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(reference);

function list() {
  if (!fs.existsSync(coursesDir)) return [];
  return fs.readdirSync(coursesDir)
    .filter(name => fs.existsSync(path.join(coursesDir, name, 'course.json')))
    .sort();
}

// Reads one course's settings. Problems are collected, not thrown, so every one is reported.
function load(id) {
  const dir = path.join(coursesDir, id);
  const course = { id, dir, problems: [], engine: [], references: [], crossLinks: [] };
  const problem = message => course.problems.push(message);
  if (!idPattern.test(id)) problem('the folder name must be lower-case words joined by hyphens, such as c-sockets');

  try {
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'course.json'), 'utf8'));
    course.title = meta.title;
    course.summary = meta.summary;
    course.publish = meta.publish;
  } catch (error) {
    problem(`course.json: ${error.message}`);
  }
  if (typeof course.title !== 'string' || !course.title) problem('course.json needs a "title"');
  if (!Array.isArray(course.publish) || !course.publish.includes('index.html')) {
    problem('course.json needs a "publish" list that includes "index.html"');
    course.publish = ['index.html'];
  }
  for (const entry of course.publish) {
    const target = path.resolve(dir, String(entry));
    if (typeof entry !== 'string' || !entry || path.relative(dir, target).startsWith('..') || path.isAbsolute(entry)) {
      problem(`course.json publishes ${JSON.stringify(entry)}, which is not a path inside the course folder`);
    } else if (!fs.existsSync(target)) {
      problem(`course.json publishes ${entry}, which does not exist`);
    }
  }

  const page = path.join(dir, 'index.html');
  course.html = fs.existsSync(page) ? fs.readFileSync(page, 'utf8') : '';
  if (!course.html) problem('index.html is missing');
  const body = attributes(course.html.match(/<body\b[^>]*>/)?.[0] ?? '');
  course.mode = body['data-mode'];
  course.storageKey = body['data-storage-key'];
  course.legacyStorageKey = body['data-legacy-storage-key'];
  if (!modes.includes(course.mode)) problem(`<body data-mode> must be one of ${modes.join(', ')}, not ${JSON.stringify(course.mode)}`);
  if (!course.storageKey) problem('<body> needs a data-storage-key for saved progress');
  course.canonical = attributes(course.html.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0] ?? '').href;
  const ogUrl = attributes(course.html.match(/<meta\b[^>]*property="og:url"[^>]*>/)?.[0] ?? '').content;
  if (ogUrl && ogUrl !== course.canonical) problem(`og:url ${ogUrl} differs from the canonical URL ${course.canonical}`);

  // Every local file the page loads must exist. Files under engine/ decide which engine
  // modules are published with the course.
  for (const [, reference] of course.html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
    if (isExternal(reference)) continue;
    const target = path.resolve(dir, reference.split(/[?#]/)[0]);
    course.references.push({ reference, target });
    if (!fs.existsSync(target)) problem(`index.html refers to ${reference}, which does not exist`);
    const inEngine = path.relative(engineDir, target);
    if (!inEngine.startsWith('..') && !path.isAbsolute(inEngine)) {
      const module = inEngine.split(path.sep)[0];
      if (!course.engine.includes(module)) course.engine.push(module);
      if (!reference.startsWith('../../engine/')) problem(`index.html should load engine files as ../../engine/…, not ${reference}`);
    } else if (path.relative(dir, target).startsWith('..') && !path.relative(coursesDir, target).startsWith('..')) {
      // A link into another course folder must say where that course is published.
      const tag = course.html.slice(0, course.html.indexOf(`"${reference}"`)).match(/<a\b[^>]*$/)?.[0];
      if (!tag) problem(`index.html loads ${reference} from another course`);
    } else if (path.relative(dir, target).startsWith('..')) {
      problem(`index.html refers to ${reference}, outside both the course and engine/`);
    } else {
      const top = path.relative(dir, target).split(path.sep)[0];
      if (!course.publish.includes(top)) problem(`index.html loads ${reference}, but course.json does not publish ${top}`);
    }
  }
  for (const [tag] of course.html.matchAll(/<a\b[^>]*>/g)) {
    const link = attributes(tag);
    if (link['data-published-href']) course.crossLinks.push({ href: link.href, published: link['data-published-href'] });
    else if (link.href && !isExternal(link.href) && path.relative(dir, path.resolve(dir, link.href)).startsWith('..')) {
      problem(`the link to ${link.href} needs data-published-href with the other course's address`);
    }
  }
  if (!course.engine.includes('core')) problem('index.html does not load the engine (../../engine/core/)');
  if (course.mode === 'compiler' && !course.engine.includes('compiler')) problem('a compiler course must load ../../engine/compiler/driver.js and runtime.js');
  if (course.mode === 'lab' && !course.engine.includes('lab')) problem('a lab course must load ../../engine/lab/notebook.js');
  if (course.mode === 'lab' && course.engine.includes('compiler')) problem('a lab course should not load the 23 MB browser compiler');

  try {
    const wrangler = readJsonc(path.join(dir, 'wrangler.jsonc'));
    course.worker = wrangler.name;
    course.assets = wrangler.assets?.directory && path.resolve(dir, wrangler.assets.directory);
    course.domains = (wrangler.routes || []).filter(route => route.custom_domain).map(route => route.pattern);
  } catch (error) {
    problem(`wrangler.jsonc: ${error.message}`);
  }
  if (course.worker !== undefined && course.worker !== id) problem(`wrangler.jsonc names the Worker "${course.worker}"; it must be "${id}", the folder name`);
  if (course.assets !== undefined && course.assets !== path.join(root, 'dist', id)) problem(`wrangler.jsonc assets.directory must be ../../dist/${id}`);
  if (course.domains && course.domains.length !== 1) problem('wrangler.jsonc needs exactly one custom-domain route');
  course.url = course.domains?.length ? `https://${course.domains[0]}/` : undefined;
  if (course.url && course.canonical !== course.url) problem(`the canonical URL ${course.canonical} should be ${course.url}, the custom domain in wrangler.jsonc`);
  return course;
}

function loadAll() {
  return list().map(load);
}

// Problems in each course and between courses, as "course: message" strings.
function check(courses) {
  const problems = courses.flatMap(course => course.problems.map(message => `${course.id}: ${message}`));
  const byIndex = new Map(courses.map(course => [path.join(course.dir, 'index.html'), course]));
  const claimed = new Map();
  const claim = (kind, value, course) => {
    if (!value) return;
    const key = `${kind}\0${value}`;
    if (claimed.has(key)) problems.push(`${course.id}: ${kind} ${value} is already used by ${claimed.get(key)}`);
    else claimed.set(key, course.id);
  };
  for (const course of courses) {
    // Courses opened from file:// share one localStorage, so their keys must differ.
    for (const key of [course.storageKey, course.legacyStorageKey]) claim('storage key', key, course);
    for (const domain of course.domains || []) claim('domain', domain, course);
    for (const link of course.crossLinks) {
      const target = byIndex.get(path.resolve(course.dir, link.href));
      if (!target) problems.push(`${course.id}: the link ${link.href} does not lead to another course's index.html`);
      else if (target.url && link.published !== target.url) problems.push(`${course.id}: the link to ${target.id} is published as ${link.published}, but ${target.id} is at ${target.url}`);
    }
  }
  return problems;
}

module.exports = { root, coursesDir, engineDir, idPattern, modes, list, load, loadAll, check, readJsonc };
