// `theme` picks the jacket colour and the diagram on a card's cover (see CourseCard.astro).
// `cover` is the word printed on the jacket: keep it to four letters or fewer.
export const availableCourses = [
  {
    id: 'c-intro',
    title: 'Introduction to C',
    format: 'Language course',
    lessons: 20,
    description: 'Get to grips with pointers, memory, and data structures. Write and run C17 in your browser.',
    url: 'https://c-intro.courses.bitshield.dev/',
    cover: 'C17',
    theme: 'forest',
  },
  {
    id: 'c-inotify',
    title: 'Anatomy of a Neovim save',
    format: 'Systems lab',
    lessons: 5,
    description: 'Build an inotify monitor in C, then trace what Linux does when you save a file in Neovim.',
    url: 'https://c-inotify.courses.bitshield.dev/',
    cover: ':w',
    theme: 'orange',
  },
  {
    id: 'rust-intro',
    title: 'Introduction to Rust',
    format: 'Language course',
    lessons: 24,
    description: 'Work through ownership, borrowing, and error handling. Write and run Rust in your browser.',
    url: 'https://rust-intro.courses.bitshield.dev/',
    cover: 'Rust',
    theme: 'ochre',
  },
  {
    id: 'lean-intro',
    title: 'Introduction to Lean',
    format: 'Language course',
    lessons: 16,
    description: 'Write programs in Lean 4, state what they should do, and prove that they do it. The labs run on your own machine.',
    url: 'https://lean-intro.courses.bitshield.dev/',
    cover: 'Lean',
    theme: 'navy',
  },
  {
    id: 'agile-better-stories',
    title: 'Story Atlas',
    format: 'Agile field guide',
    ideas: 50,
    description: 'Explore how to write, discuss and split better user stories, with examples and questions to bring to your team.',
    url: 'https://agile-better-stories.courses.bitshield.dev/',
    cover: 'Map',
    theme: 'parchment',
  },
  {
    id: 'agile-user-story-mapping',
    title: 'User Story Mapping',
    format: 'Agile short course',
    lessons: 9,
    description: 'The main ideas of Jeff Patton’s book in about 45 minutes. Follow one repair café request from a story map to a first release and a build plan.',
    url: 'https://agile-user-mapping-stories.courses.bitshield.dev/',
    cover: 'USM',
    theme: 'sage',
  },
] as const;

// Courses that are announced but not published. With none listed, the catalog leaves out
// the "In development" section and its link in the header.
export const upcomingCourses: { title: string; description: string }[] = [];
