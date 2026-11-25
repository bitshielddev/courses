# Story Atlas

Story Atlas is an interactive field guide to 50 ideas for improving user stories. It is based on [Fifty Quick Ideas to Improve Your User Stories](https://leanpub.com/50quickideas) by Gojko Adzic and David Evans. Each idea has a workplace example, a question to discuss and links to related ideas.

From this directory, select the Node version in `.node-version`, then run:

```sh
npm ci
npm run dev
```

Edit the entries in [src/data/ideas.json](src/data/ideas.json). Keep each idea's numeric ID stable so shared links such as `/#idea-31` continue to work. Astro prerenders the index and bundles the client-side interactions for an assets-only Cloudflare Worker.

See [Cloudflare deployment](docs/deploy-cloudflare.md) for production commands and the live URL.
