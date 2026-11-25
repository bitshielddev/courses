# Deploy Story Atlas

The `agile-better-stories` Worker serves the static Astro build at [agile-better-stories.courses.bitshield.dev](https://agile-better-stories.courses.bitshield.dev/). Its custom domain and asset routing are set in [wrangler.jsonc](../wrangler.jsonc).

Run these commands from `courses/agile-better-stories/` with the pinned Node version.

```sh
npm ci
npm run check
npm run deploy:dry-run
npm run preview
```

Wrangler serves the production build locally with the same routing and response headers. For a manual release, use a Wrangler login for the account that owns `bitshield.dev`, then run `npm run deploy`. The upload uses only `dist/`.

Check that the live home page displays the atlas, `/#idea-31` opens **Borrow the missing machinery**, `/health` returns `ok` and a missing path returns HTTP 404. For a rollback to an earlier release, find the version using `npx wrangler deployments list` and run `npx wrangler rollback <version-id>`.

## Deployment history

| Date | Version | Release |
| --- | --- | --- |
| 2026-11-24 | `42f564cb-e964-4ca9-bc41-d7fa0879c620` | Initial Story Atlas release with 50 ideas across five topics. |
