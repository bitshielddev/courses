# Deploy the course catalog

Run these commands from `catalog/` with the Node.js version in `.node-version`.

```sh
npm ci
npm run check
npm run deploy:dry-run
npm run preview
```

The dry run builds the catalog into `dist/` and validates the Worker configuration. The preview serves that build with Cloudflare’s routing and response headers.

## Publish

With a Wrangler login for the account that owns `bitshield.dev`, check the account and deploy.

```sh
npx wrangler whoami
npm run deploy
```

The command rebuilds the static site and uploads the assets to the `bitshield-course-catalog` Worker. The custom domain in `wrangler.jsonc` lets Cloudflare provision the DNS record and certificate for `courses.bitshield.dev`.

## Verify and roll back

Open the catalog, follow each available course link, and check the following responses. Repeat with the `workers.dev` URL printed by Wrangler.

```sh
curl -I https://courses.bitshield.dev/               # 200
curl -i https://courses.bitshield.dev/health         # 200, text/plain, body ok
curl -I https://courses.bitshield.dev/missing-page   # 404
```

To roll back, find the previously working version using `npx wrangler deployments list`, then run `npx wrangler rollback <version-id>`.

## Deployment history

| Date | Version ID | Release |
| --- | --- | --- |
| 2026-11-22 | `2cb8cd4c-1f90-4b8f-bfc7-320d00be4123` | Initial catalog with two published courses, two upcoming courses, and bundled font licenses. |
| 2026-11-23 | `cd71bf9b-a7c2-4b63-b8c4-68f6a2cc36fe` | Rust and Lean moved to available courses, each with a new cover. No courses are in development, so that section is hidden. |
