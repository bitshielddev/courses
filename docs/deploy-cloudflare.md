# Deploy a course to Cloudflare Workers

Each course is its own assets-only Worker, named after its folder, on its own custom domain: `courses/<id>/` deploys as the Worker `<id>` at `https://<id>.courses.bitshield.dev`, with a checking copy at `https://<id>.nixprivacy.workers.dev`. There is no Worker script, binding, KV namespace or R2 bucket. Each course's `README.md` records its deployments.

The site needs no compiling. `npm run build -- <id>` (`tools/build.mjs`) copies the course into `dist/<id>/`:

- everything in `public/`
- the course's `publish` list from `course.json`, which overrides a `public/` file of the same name
- each `engine/<module>/` that the course's `index.html` loads. Only compiler courses carry the 22.7 MiB compiler bundle, `engine/compiler/toolchain/toolchain.js`.

The copied `index.html` loads `engine/` instead of `../../engine/`, and cross-course links point to the other course's `data-published-href`. The build fails if any file is over Cloudflare's 25 MiB limit, or if `tools/courses.cjs` finds conflicting settings. `courses/<id>/wrangler.jsonc` points Wrangler at `../../dist/<id>`. `tools/`, `docs/`, `node_modules/` and a course's `README.md`, `checks.cjs`, `course.json` and `wrangler.jsonc` are never uploaded.

`public/` holds what only hosted copies need:

| File | Purpose |
| --- | --- |
| `404.html` | Served with a 404 status for unknown paths (`not_found_handling: 404-page`). |
| `_headers` | A plain-text type for `/health`, and `nosniff` and `Referrer-Policy` on everything. |
| `health` | Returns `ok`, for checks and uptime monitors. |
| `robots.txt` | Allows crawling. |

No file name carries a content hash, so nothing gets a long cache lifetime. Cloudflare's default, `max-age=0, must-revalidate` with an ETag, costs a repeat visitor a 304 per file. The compiler bundle is served with Brotli compression.

## 1. Check

Use Node 22.12 or later (`.node-version` pins 22.16.0) and the committed lockfile:

```bash
npm ci
npm run check -- <id>              # the course from file://, plus every course's settings
npm run deploy:dry-run -- <id>     # builds and validates the upload; publishes nothing
npm run preview -- <id>            # serves dist/<id>/ with Cloudflare's routing on http://localhost:8787
```

With the preview running, the same checks run against the served copy:

```bash
node tools/verify.cjs <id> --url http://127.0.0.1:8787
```

Pass anything Wrangler accepts after the id, such as `npm run preview -- <id> --port 8788`. To preview two courses at once, give the second a different `--port` and `--inspector-port`.

`tools/verify.cjs` needs Google Chrome; set `CHROME` if it is not in `/Applications`.

## 2. Deploy

Deploys are manual. They need a Wrangler login (`npx wrangler login`, once per machine) to the Cloudflare account that owns the `bitshield.dev` zone:

```bash
npx wrangler whoami
npm run deploy -- <id>
```

`npm run deploy` without an id stops and lists the courses.

Each `wrangler.jsonc` declares the course's hostname as a custom domain, so a course's first deploy creates its DNS record and certificate. That fails if the hostname already has a DNS record. The config is the source of truth for the domain: each deploy replaces routes added in the dashboard.

A first deploy can stop straight after `Uploaded <id>` with `This Worker does not exist on your account. [code: 10007]`. The upload worked; Cloudflare's API had not caught up with the new Worker when Wrangler asked about it, so the domain was never attached. Check with `npx wrangler deployments list --config courses/<id>/wrangler.jsonc`, and when that lists the upload, run `npm run deploy -- <id>` again. It uploads nothing new and attaches the domain. This happened on `rust-intro`'s first deploy with Wrangler 4.164.0.

Do not request a new course's hostname before its first deploy, not even to confirm that it is free. The answer is "no such host", and the resolver this machine uses keeps that answer for up to 30 minutes (the zone's negative-cache time), so `curl` and `tools/verify.cjs` cannot reach the live site straight after deploying. If that has happened, check the `workers.dev` copy with `--url`, and check the hostname itself with `curl --resolve <host>:443:<address>`, taking the address from `dig +short <host> @1.1.1.1`.

## 3. Verify

```bash
SITE_URL=https://<id>.courses.bitshield.dev
curl -sS -o /dev/null -w '%{http_code}\n' "$SITE_URL/"               # 200
curl -sS -i "$SITE_URL/health"                                         # 200 text/plain, ok
curl -sS -o /dev/null -w '%{http_code}\n' "$SITE_URL/missing-page"   # 404
node tools/verify.cjs <id> --url "$SITE_URL"                           # the full suite, live
```

For a Rust course the full suite still compiles on this machine: the live page is pointed at the local stand-in for the Rust Playground. Add `--live` to send a sample, one cell and one solution from each lesson, from the live page to the real Playground:

```bash
node tools/verify.cjs <id> --live --url "$SITE_URL"
```

Then add a row to the deployment history in `courses/<id>/README.md` with the date, the version ID Wrangler printed and what changed.

## 4. Roll back

Wrangler commands other than deploy and dev take the course's config:

```bash
npx wrangler deployments list --config courses/<id>/wrangler.jsonc
npx wrangler rollback <version-id> --config courses/<id>/wrangler.jsonc
```

Or use the Worker's **Deployments** tab in the dashboard.
