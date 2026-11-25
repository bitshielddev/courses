// Lesson metadata: order, navigation, key points, the check question and the team prompt.
// The lesson prose lives in src/pages/lessons/<slug>.astro.

// Jeff Patton's six steps to story mapping (chapter 5). Lessons 2 to 8 follow them in order.
export const steps = [
  { id: 'frame', name: 'Frame', long: 'Frame the problem', gist: 'Who is it for, and why are we building it?' },
  { id: 'map', name: 'Map', long: 'Map the big picture', gist: 'Tell the whole story, a mile wide and an inch deep.' },
  { id: 'explore', name: 'Explore', long: 'Explore', gist: 'Go deep: other users, other ways, things that go wrong.' },
  { id: 'release', name: 'Release', long: 'Slice out a release strategy', gist: 'Cut away what the outcome does not need.' },
  { id: 'learn', name: 'Learn', long: 'Slice out a learning strategy', gist: 'Test your riskiest assumptions with small experiments.' },
  { id: 'build', name: 'Build', long: 'Slice out a development strategy', gist: 'Decide what to build first so you finish on time.' },
] as const;

export type StepId = (typeof steps)[number]['id'];

export const parts = [
  { id: 'why', title: 'Why map?' },
  { id: 'make', title: 'Build the map' },
  { id: 'slice', title: 'Slice the map' },
  { id: 'use', title: 'Use the map' },
] as const;

export type PartId = (typeof parts)[number]['id'];

export interface Lesson {
  slug: string;
  title: string;
  part: PartId;
  step: StepId | null;
  minutes: number;
  summary: string;
  bridge: string;
  keyPoints: [string, string, string];
  exercise: { prompt: string; options: { label: string; feedback: string; correct: boolean }[] };
  takeaway: string;
  chapters: string;
}

export const lessons: Lesson[] = [
  {
    slug: 'shared-understanding',
    title: 'Stories build shared understanding',
    part: 'why',
    step: null,
    minutes: 4,
    summary: 'A story is a reason to talk until everyone pictures the same thing. Writing it down comes second.',
    bridge: 'Start here. Before any map, this lesson covers what a story is for. It also introduces the repair café that you will follow for the rest of the course.',
    keyPoints: [
      'A shared document does not give people a shared understanding. Talking it through, with something to point at, does.',
      'A story has three parts: a card, a conversation and a confirmation. The conversation is the essential one.',
      'Record what you agreed so that the people who were there can remember it. Retell it to anyone who was not.',
    ],
    exercise: {
      prompt: 'Noor rewrites the request as “As a visitor, I want a booking calendar so that I can plan my visit.” What should the team do with it?',
      options: [
        { label: 'Estimate it and put it in the next sprint.', feedback: 'The sentence is in the standard format, but the three pictures are still different. An estimate now would be for whichever picture the estimator has in mind.', correct: false },
        { label: 'Ask Noor to add detail until the card needs no explanation.', feedback: 'More writing gives people more to interpret. They would still fill the gaps differently, and nobody would notice.', correct: false },
        { label: 'Sit down with Noor and someone who has queued at the door, and talk through last Saturday.', feedback: 'The format gives the team a who, a what and a why to start from. The conversation is where they find out that Sam wants to avoid a wasted trip, which may not need a calendar at all.', correct: true },
      ],
    },
    takeaway: 'Pick one card from your backlog. Ask two teammates, separately, to sketch what they think it will look like when it is done. Compare the sketches before you discuss anything else.',
    chapters: 'Read This First · Ch. 6, The Real Story About Stories · Ch. 7, Telling Better Stories',
  },
  {
    slug: 'outcomes-over-output',
    title: 'Outcomes over output',
    part: 'why',
    step: 'frame',
    minutes: 4,
    summary: 'Frame the idea before you map it: who it is for, what should change for them and why the café cares.',
    bridge: 'Lesson 1 showed that one request can hide three different pictures. Before the team can agree on a picture, it has to agree on a purpose. This is step 1 of mapping: frame the problem.',
    keyPoints: [
      'Output is what you build. Outcome is what people do differently. Impact is what the organisation gains over time.',
      'There is always more to build than there is time to build it. Aim for less output and more outcome.',
      'Frame the idea first: who it is for, what should change for them, how you will know and why the organisation cares.',
    ],
    exercise: {
      prompt: 'Which piece of evidence would tell the team most directly that the outcome was achieved?',
      options: [
        { label: 'Two hundred people opened the booking page in its first month.', feedback: 'That shows interest in the output. A visitor can open the page and still bring a lamp on a day when Ade is away.', correct: false },
        { label: 'Every feature on Noor’s list shipped before the summer.', feedback: 'That measures output. It says how much was built and nothing about what visitors did.', correct: false },
        { label: 'At the door, nine in ten visitors are seen by a repairer, up from three in four.', feedback: 'This is a change in what happens to visitors. The door volunteer can observe it after the release and compare it with earlier sessions.', correct: true },
      ],
    },
    takeaway: 'Take a feature your team is building now. Write one sentence each for its output, its outcome and its impact. If the outcome is hard to write, find out who asked for the feature and what they hoped would change.',
    chapters: 'Read This First · Ch. 2, Plan to Build Less · Ch. 13, Start with Opportunities',
  },
  {
    slug: 'from-backlog-to-map',
    title: 'From backlog to map',
    part: 'why',
    step: 'map',
    minutes: 4,
    summary: 'See why a ranked list hides the big picture, and what a story map shows that a list cannot.',
    bridge: 'The team has framed the idea: fewer wasted trips for visitors. Next it has to decide what to build. This lesson looks at the usual way of organising that work and where it goes wrong.',
    keyPoints: [
      'A flat backlog ranks stories and loses the journey that connects them.',
      'A story map lays the same cards out from left to right in the order of the user’s story, with detail running downwards.',
      'Laying the story out exposes holes and lopsided areas. Cover the whole breadth of the journey before you go deep.',
    ],
    exercise: {
      prompt: 'Noor’s list has five items about booking and none about arriving at the door. What does that tell the team?',
      options: [
        { label: 'Booking is the most valuable part, so it deserved the most items.', feedback: 'The count shows where Noor’s attention went while writing the list. A visitor with a perfect booking still has to be recognised at the door.', correct: false },
        { label: 'The list went deep on one step before it covered the whole visit.', feedback: 'The map makes the gap visible. Sketch every step of the journey thinly first, then decide where depth is worth having.', correct: true },
        { label: 'Arriving needs no software, so it was right to leave it off.', feedback: 'It may need none. The team should decide that knowingly, because the door volunteer still needs some way to tell who has booked.', correct: false },
      ],
    },
    takeaway: 'Write the top fifteen items of your backlog on separate notes. Lay them out in the order a user would meet them. Look for the step with nothing under it.',
    chapters: 'Ch. 1, The Big Picture',
  },
  {
    slug: 'build-the-backbone',
    title: 'Build the backbone',
    part: 'make',
    step: 'map',
    minutes: 5,
    summary: 'Tell one visit a step at a time, then group the steps into the few activities that carry the whole story.',
    bridge: 'Lesson 3 showed what a map reveals. Now you build one from nothing, the way Patton teaches it, by telling the story first. This is step 2: map the big picture.',
    keyPoints: [
      'A task is a short verb phrase for something a person does. Tasks sit from left to right in narrative flow, the order in which you would tell the story.',
      'An activity groups the tasks done towards one goal. The row of activities is the backbone, and it tells the whole story at a glance.',
      'Map the breadth of the journey before the depth, and include the steps that happen away from the software.',
    ],
    exercise: {
      prompt: 'Which card is written as a user task at a useful size?',
      options: [
        { label: 'Booking database', feedback: 'That names something the team would build. A task says what a person does and starts with a verb.', correct: false },
        { label: 'Choose a time for my visit', feedback: 'This is a short verb phrase for something Sam does and would finish in one go.', correct: true },
        { label: 'Get my lamp working again', feedback: 'That is Sam’s goal for the whole visit. Every card on the map serves it, so it is too big to be one task.', correct: false },
      ],
    },
    takeaway: 'Try Patton’s own ten-minute warm-up. Each person writes what they did this morning between waking and starting work, one task per note. Combine the notes in order, then name the activities above them.',
    chapters: 'Ch. 5, You Already Know How · Ch. 1, The Big Picture',
  },
  {
    slug: 'explore-the-details',
    title: 'Explore the details',
    part: 'make',
    step: 'explore',
    minutes: 6,
    summary: 'Go down from each task into the details, the alternatives and the things that go wrong. This gives the map its depth.',
    bridge: 'You have a backbone and eight tasks, which describe the visit when everything goes well. Step 3 is to explore: go beneath each task and ask what else could happen there.',
    keyPoints: [
      'The body of the map holds details, alternatives, variations and exceptions beneath each task.',
      'Ask “what about…?” at every task to find them. A growing map means growing understanding, and nothing on it is a commitment yet.',
      'Map how things work now to understand the problem, and how they will work later to design the answer.',
    ],
    exercise: {
      prompt: 'A teammate asks, “What about visitors who turn up without a booking?” Where does that go?',
      options: [
        { label: 'Nowhere yet. It is out of scope until booking works.', feedback: 'Deciding what to build comes in the next lesson. For now the card goes on the map, so that the decision is made knowingly.', correct: false },
        { label: 'On a new card under “Check in at the door”.', feedback: 'It is a variation on arriving, so it sits beneath that task. Whether the first release handles it is a separate decision.', correct: true },
        { label: 'On the backbone, as a new activity.', feedback: 'The backbone holds the big steps that every visit goes through. A walk-in still arrives and checks in, by a different route.', correct: false },
      ],
    },
    takeaway: 'Stand at one column of a map, or one area of your backlog. Give the group three minutes to write a card for every “what about…?” they can think of. Sort the cards under the tasks they belong to.',
    chapters: 'Ch. 5, You Already Know How · Ch. 1, The Big Picture · Ch. 14, Using Discovery to Build Shared Understanding',
  },
  {
    slug: 'slice-a-release',
    title: 'Slice a release',
    part: 'slice',
    step: 'release',
    minutes: 7,
    summary: 'Cut across the map to find the smallest release that produces the outcome you framed.',
    bridge: 'The map now holds far more than the café can build, which is normal for a healthy map. Step 4 turns it into a plan by slicing it.',
    keyPoints: [
      'A slice cuts across the whole map, so every release is a complete journey for someone.',
      'Choose the slice by outcome. Name who it is for and what should change, and keep only what that needs.',
      'The minimum viable product is the smallest release that achieves its outcome. Further slices, each with its own outcome, make the roadmap.',
    ],
    exercise: {
      prompt: 'Ade runs the electrical bench this Saturday. Which first release lets a visitor complete the visit the team promised?',
      options: [
        { label: 'A directory of every repairer, with photos and reviews.', feedback: 'This is a finished feature from one column. Tell the rest of the story. How does the visitor get a slot, and how does the door volunteer know about it?', correct: false },
        { label: 'A poster naming the date and the items, a phone booking and the visitor’s name on the door list.', feedback: 'It is thin, and it crosses the whole map. A visitor can find a session, book, arrive and be seen, so the café can observe the outcome on Saturday.', correct: true },
        { label: 'A polished online booking form, with check-in to follow next month.', feedback: 'Booking would work well and the visit would still fail at the door. A slice has to reach the far end of the map.', correct: false },
      ],
    },
    takeaway: 'Write the outcome of your next release at the left of your map or backlog. Move below the line everything that the outcome does not need. Read across what is left and check that a user could get from start to finish.',
    chapters: 'Ch. 2, Plan to Build Less · Ch. 5, You Already Know How',
  },
  {
    slug: 'slice-to-learn',
    title: 'Slice to learn',
    part: 'slice',
    step: 'learn',
    minutes: 5,
    summary: 'Treat the first release as a guess. Find the assumption most likely to sink it and test that as cheaply as you can.',
    bridge: 'The team has a first slice it believes in, and belief is not evidence. Step 5 is a learning strategy: work out what you are assuming, and test it before you build around it.',
    keyPoints: [
      'A release plan is a hypothesis. Name the assumptions beneath it and find the one that is both uncertain and fatal.',
      'Run the smallest test that could prove that assumption wrong. Use real users and measure what they do.',
      'Decide beforehand what result would change the plan. When you get that result, change the map.',
    ],
    exercise: {
      prompt: 'The team wants to know whether visitors will book ahead. Which test answers that for the least effort?',
      options: [
        { label: 'Survey last month’s visitors: “Would you book a slot if you could?”', feedback: 'It is cheap, but it measures what people say. Many will say yes to be agreeable and still turn up unannounced.', correct: false },
        { label: 'Build the online booking form and see how many people use it.', feedback: 'That would answer the question after weeks of work on a form. The answer might make the form pointless.', correct: false },
        { label: 'Print a phone number on this month’s poster and count calls against walk-ins.', feedback: 'It needs no software, it measures real behaviour and it gives an answer within one session. Set the threshold first, such as half of the electrical visitors booking.', correct: true },
      ],
    },
    takeaway: 'List five things that must be true for your next release to succeed. Mark the one you are least sure of that would also hurt most. Agree the cheapest test you could run this week and the result that would change your plan.',
    chapters: 'Ch. 3, Plan to Learn Faster · Ch. 15, Using Discovery for Validated Learning',
  },
  {
    slug: 'slice-to-build',
    title: 'Slice to build',
    part: 'slice',
    step: 'build',
    minutes: 5,
    summary: 'Once you know what to release, slice it again to decide what to build first, so that you finish on time.',
    bridge: 'The poster test worked. Most electrical visitors booked ahead, and more of them were seen. Noor now wants release 2, online booking for every bench, ready for the café’s Big Fix day in ten weeks. The date cannot move. Step 6 is a development strategy.',
    keyPoints: [
      'Slice a release again into a build order. These slices are checkpoints for the team, and you do not ship them.',
      'Work like a painter: a thin version of everything first, then build it up, then refine. Iterate to improve and increment to add.',
      'The opening game gets the release working end to end and tackles the risky parts. The midgame rounds it out. The endgame polishes, and gives way if time runs short.',
    ],
    exercise: {
      prompt: 'Three weeks in, which state of the work should reassure Noor most about the Big Fix date?',
      options: [
        { label: 'The booking form is finished and polished. The door list has not been started.', feedback: 'One corner of the painting is perfect. Nobody yet knows whether a booking reaches the door, and that hand-over is where the surprises are.', correct: false },
        { label: 'A rough form saves a booking, and the booking shows up on a plain door list.', feedback: 'It is thin and it works from one end to the other. The risky hand-over is proven early, and the remaining work is building up and polishing.', correct: true },
        { label: 'Every screen is designed in detail and approved. Building starts next week.', feedback: 'Detailed designs feel like progress, but nothing has run. The team has no evidence of its real pace or of where the technical trouble lies.', correct: false },
      ],
    },
    takeaway: 'Take a feature your team is about to start. Ask together what the thinnest version is that works from end to end. Build that first and look at it as a team before you decide what to build up.',
    chapters: 'Ch. 4, Plan to Finish on Time',
  },
  {
    slug: 'from-card-to-software',
    title: 'From card to working software',
    part: 'use',
    step: null,
    minutes: 5,
    summary: 'Take one card off the map, talk it into something buildable, then check what you built against the outcome you started with.',
    bridge: 'The map has done its planning work. You know what to release, what to test and what to build first. This last lesson follows a single card from the map into working software, and back again.',
    keyPoints: [
      'Break stories down progressively: need-sized for users, outcome-sized for a release and a few days of work for the team.',
      'A small group talks each card through just before building it, and agrees the examples that confirm it is done.',
      'Review everything you build, measure the outcome after release and put what you learn back on the map.',
    ],
    exercise: {
      prompt: 'Release 2 ships on time with every card done. The door tally still shows one visitor in four leaving unseen. What should the team do?',
      options: [
        { label: 'Call it a success, because the release was delivered as planned.', feedback: 'The output was delivered. The outcome that the team framed in lesson 2 has not happened, and it was the reason for building anything.', correct: false },
        { label: 'Build the release 3 features, since more features should help.', feedback: 'They might help. The team does not yet know why visitors are leaving, so it would be guessing again.', correct: false },
        { label: 'Go to the door, find out who is leaving unseen and why, and put that on the map.', feedback: 'The tally tells the team where to look, and talking to those visitors tells it what to try next. The next slice starts from what was observed.', correct: true },
      ],
    },
    takeaway: 'Before your next story is built, get three people round it for fifteen minutes: one who knows the user, one who will build it and one who will test it. Leave with three examples that you all accept as proof that it is done.',
    chapters: 'Ch. 6, The Real Story About Stories · Ch. 11, Rock Breaking · Ch. 16, Refine, Define, and Build · Ch. 18, Learn from Everything You Build',
  },
];

export const totalMinutes = lessons.reduce((total, lesson) => total + lesson.minutes, 0);
export const lessonNumber = (slug: string) => lessons.findIndex((lesson) => lesson.slug === slug) + 1;
export const lessonHref = (slug: string) => '/lessons/' + slug + '/';
