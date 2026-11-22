// Builds one course and runs Wrangler with that course's config.
//
//   node tools/cloudflare.mjs preview <course>   serve dist/<course>/ locally on http://localhost:8787
//   node tools/cloudflare.mjs dry-run <course>   validate the upload; publishes nothing
//   node tools/cloudflare.mjs deploy <course>    publish to Cloudflare (needs `npx wrangler login`)
//
// Anything after the course goes to Wrangler, such as `--port 8788`. Other Wrangler commands
// take the config directly, for example:
//   npx wrangler deployments list --config courses/<course>/wrangler.jsonc
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import courses from './courses.cjs';

const commands = { preview: ['dev'], 'dry-run': ['deploy', '--dry-run'], deploy: ['deploy'] };
const [command, id, ...extra] = process.argv.slice(2);
const known = courses.list();
if (!commands[command] || !known.includes(id)) {
  console.error(`Usage: node tools/cloudflare.mjs <${Object.keys(commands).join('|')}> <course>\nCourses: ${known.join(', ')}`);
  process.exit(1);
}

const run = (program, args) => {
  const result = spawnSync(program, args, { cwd: courses.root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run(process.execPath, [path.join(courses.root, 'tools/build.mjs'), id]);
// Run from the repository root so Wrangler keeps one login and account cache in .wrangler/.
run(path.join(courses.root, 'node_modules/.bin/wrangler'), [...commands[command], '--config', `courses/${id}/wrangler.jsonc`, ...extra]);
