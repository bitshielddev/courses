# Deploy User Story Mapping

The `agile-user-mapping-stories` Worker serves this course at [agile-user-mapping-stories.courses.bitshield.dev](https://agile-user-mapping-stories.courses.bitshield.dev/). Its [Wrangler configuration](../wrangler.jsonc) publishes the Astro build in `dist/`.

## Prepare the release

From `courses/agile-user-story-mapping/`, use the Node.js version in `.node-version` and install the locked dependencies. The dry run builds the course and validates the upload. The preview serves that build with Cloudflare’s routing and headers.

```sh
npm ci
npm run check
npm run deploy:dry-run
npm run preview
```

Open the preview, follow a lesson, try its exercise and check question, and check a release slice in lesson 6. Open the cheat sheet and the workshop as well.

## Publish and verify

Confirm that Wrangler is signed in to the account that owns `bitshield.dev`. The first production deployment creates the custom domain and provisions its certificate.

```sh
npx wrangler whoami
npm run deploy
```

Run these checks against the custom domain and the `workers.dev` address printed by Wrangler.

```sh
SITE_URL=https://agile-user-mapping-stories.courses.bitshield.dev
curl -I "$SITE_URL/"                 # 200
curl -i "$SITE_URL/health"           # 200, text/plain, body ok
curl -I "$SITE_URL/workshop"         # redirect to /workshop/
curl -I "$SITE_URL/workshop/"        # 200
curl -I "$SITE_URL/cheat-sheet/"     # 200
curl -I "$SITE_URL/lessons/frame-the-outcome/"  # 301 to /lessons/outcomes-over-output/
curl -I "$SITE_URL/missing-page"     # 404
curl -I "$SITE_URL/user-story-mapping.epub"  # 404
```

Once the course responds at its custom domain, deploy the catalog using its [deployment guide](../../../catalog/docs/deploy-cloudflare.md). Follow the course card from [courses.bitshield.dev](https://courses.bitshield.dev/) to check its destination.

Use `npx wrangler deployments list` to find a previous version and `npx wrangler rollback <version-id>` to restore it.

## Deployment history

| Date | Version ID | Release |
| --- | --- | --- |
| 2026-11-25 | `36549d8f-739b-4ed7-ac51-c2735829da91` | First release with five lessons, the repair café map workshop and a printable team exercise. |
