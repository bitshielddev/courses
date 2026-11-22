// Copies courses into dist/<course>/ for `wrangler deploy`.
//
//   node tools/build.mjs              build every course
//   node tools/build.mjs c-intro      build the named courses
//
// Nothing is compiled. The build chooses what is published for each course:
//   public/                     the 404 page, headers, health check and robots.txt every course gets
//   the course's publish list   from courses/<course>/course.json (a course file overrides public/)
//   engine/<module>/            each engine module that the course's index.html loads
// and rewrites index.html for its own domain: ../../engine/ becomes engine/, and links to
// other courses use their data-published-href. tools/, docs/ and node_modules/ are never published.
import { cpSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import courses from './courses.cjs';

const all = courses.loadAll();
const wanted = process.argv.slice(2);
const unknown = wanted.filter(id => !all.some(course => course.id === id));
if (unknown.length) {
  console.error(`No course called ${unknown.join(', ')}. Courses: ${all.map(course => course.id).join(', ')}`);
  process.exit(1);
}
const problems = courses.check(all);
if (problems.length) {
  console.error(`Fix these before building:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

// Cloudflare refuses any asset over 25 MiB; fail here rather than mid-upload.
const limit = 25 * 1024 * 1024;

for (const course of all.filter(item => !wanted.length || wanted.includes(item.id))) {
  const dist = path.join(courses.root, 'dist', course.id);
  rmSync(dist, { recursive: true, force: true });
  cpSync(path.join(courses.root, 'public'), dist, { recursive: true });
  for (const entry of course.publish) {
    if (entry !== 'index.html') cpSync(path.join(course.dir, entry), path.join(dist, entry), { recursive: true });
  }
  for (const module of course.engine) {
    cpSync(path.join(courses.engineDir, module), path.join(dist, 'engine', module), { recursive: true });
  }
  const html = course.html
    .replaceAll('"../../engine/', '"engine/')
    .replace(/href="[^"]*" data-published-href="([^"]+)"/g, 'href="$1"');
  writeFileSync(path.join(dist, 'index.html'), html);

  let files = 0;
  let bytes = 0;
  (function walk(directory) {
    for (const name of readdirSync(directory)) {
      const file = path.join(directory, name);
      const stat = statSync(file);
      if (stat.isDirectory()) {
        walk(file);
        continue;
      }
      if (stat.size > limit) throw new Error(`${path.relative(dist, file)} is over Cloudflare's 25 MiB file limit`);
      files += 1;
      bytes += stat.size;
    }
  })(dist);
  console.log(`dist/${course.id}/: ${files} files, ${(bytes / 1024 / 1024).toFixed(2)} MiB (engine: ${course.engine.join(', ')})`);
}
