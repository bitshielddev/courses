# Bitshield course catalog

The Astro site at [courses.bitshield.dev](https://courses.bitshield.dev/) lists the available courses and previews the courses in development. Each published course opens on its own subdomain.

Every new course, lab and standalone guide published in this repository gets a listing in [the course catalog](src/data/courses.ts). Add it to `availableCourses` using the verified live URL from its Wrangler config, and remove any matching entry from `upcomingCourses`. A new theme needs a jacket colour in [base.css](src/styles/base.css) and a diagram in [CourseCard.astro](src/components/CourseCard.astro). While `upcomingCourses` is empty, the page leaves out the "In development" section and its header link.

From `catalog/`, select the Node.js version pinned in `.node-version`, then install the dependencies and start Astro.

```sh
fnm use --install-if-missing
npm ci
npm run dev
```

After the course is live, deploy the catalog separately and verify the new card links to it on the public catalog. See the [Cloudflare deployment guide](docs/deploy-cloudflare.md).

## Design

The course cards borrow their direct links from the syllabus at [MIT’s Missing Semester](https://missing.csail.mit.edu/) and their short, task-focused descriptions from the approach used by [Exploratorium Science Snacks](https://www.exploratorium.edu/snacks). The terminal mark carries over from the courses themselves. The green and orange cover colors and their diagrams come from the [field-manual still life](src/assets/field-manuals.webp). The Rust and Lean cards, added when those courses were published, use an ochre and a navy jacket chosen to sit beside them. Each diagram shows one idea from its course: stacked memory for C, a timeline of events for the Neovim save, a value moving out of its slot for Rust, and two premises above a conclusion for Lean.

<details>
<summary>ImageGen prompt for the masthead</summary>

Generated with the built-in ImageGen tool.

> Create a photorealistic editorial STILL LIFE photograph for the right side of an independent technical publisher’s website. Wide landscape 3:2 frame. On a warm pale ivory matte paper tabletop (#f4f2e9, no horizon), a tight sculptural arrangement of TWO tactile clothbound vintage computer science field manuals, with extremely accurate letterpress cover design. View from above at a steep angle, looking down from slightly in front, making the covers clearly readable and the ivory page blocks/shadows visible at the bottom. Frame the whole arrangement with narrow clear margins around every edge. Uppermost deep petroleum teal forest-green manual slightly counterclockwise pointing top toward upper left; modestly worn corners, linen buckram texture, an elegant real off-white wireframe geometric cube diagram on its cover, and the beautifully typeset ivory uppercase title “FIELD MANUAL” on two lines in strong compact modernist Swiss grotesk lettering, just those words on this cover. Below and offset toward right lies a contrasting vermilion-orange paperback rotated somewhat clockwise with partial dark ink architectural wireframe diagram and small, unobtrusive typographic marks, no other large readable words. Include a single cream punched programming card peeking out at the bottom right. Screenprinted retro scientific reference-book art direction, clean well-lit product photograph, extremely tactile print and paper detail, sharply defined afternoon shadows angled lower-right, restrained 1970s computer manual design. Substantial size in frame, interesting diagonal arrangement like a fine stationery catalog. Pure tabletop to all four edges. No computers, people, hands, extra desk props, plants, overlay text, UI, graphics outside the photographed books, large logos, photographic borders or watermarks.

</details>
