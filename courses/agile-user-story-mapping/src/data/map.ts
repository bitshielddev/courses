// The one repair café story map. Every figure and exercise in the course reads from here,
// so the reader sees the same cards on every page.

export const activities = [
  { id: 'find', name: 'Find a session' },
  { id: 'book', name: 'Book a slot' },
  { id: 'arrive', name: 'Arrive' },
  { id: 'repair', name: 'Get it repaired' },
] as const;

export type ActivityId = (typeof activities)[number]['id'];

// Tasks are in narrative flow: the order in which Sam's visit is told.
export const tasks = [
  { id: 'date', activity: 'find', name: 'See the next date', clue: 'Sam is still deciding whether there is a session worth going to.' },
  { id: 'item', activity: 'find', name: 'Check my item can be fixed', clue: 'This is part of choosing a session. Sam wants one where somebody repairs lamps.' },
  { id: 'time', activity: 'book', name: 'Choose a time', clue: 'Sam has picked a session and is now reserving a place in it.' },
  { id: 'details', activity: 'book', name: 'Leave my details', clue: 'A name and an item turn an enquiry into a booking the café can see.' },
  { id: 'checkin', activity: 'arrive', name: 'Check in at the door', clue: 'The booking is made. This is the moment Sam reaches the café.' },
  { id: 'wait', activity: 'arrive', name: 'Wait my turn', clue: 'Sam is in the building and has not yet reached a repairer.' },
  { id: 'fault', activity: 'repair', name: 'Explain the fault', clue: 'Sam is now sitting with the repairer, which is what the visit was for.' },
  { id: 'home', activity: 'repair', name: 'Take it home', clue: 'The repair ends here, whether or not the lamp works again.' },
] as const;

export type TaskId = (typeof tasks)[number]['id'];

export const releases = [
  { id: 1, name: 'Electricals Saturday', outcome: 'Visitors with small electrical items book ahead and are seen by a repairer.' },
  { id: 2, name: 'Any bench, booked online', outcome: 'Any visitor books for themselves, with no volunteer answering the phone.' },
  { id: 3, name: 'Regulars', outcome: 'Visitors come back, and the quieter benches fill up.' },
] as const;

export interface Card {
  id: string;
  task: TaskId;
  title: string;
  release: 1 | 2 | 3;
  // Shown under the title in the slicing exercise.
  detail: string;
  // In the exercise, a card either gives the visitor a way through its task or is an extra.
  role: 'way' | 'extra';
  // Why the card is not needed in the first release. Release 1 cards have none.
  later?: string;
  // Cards found by asking "what about…?" in lesson 5 carry the question and what it uncovered.
  whatAbout?: { question: string; kind: 'Alternative' | 'Variation' | 'Exception' | 'Detail'; found: string };
}

export const cards: Card[] = [
  {
    id: 'poster', task: 'date', title: 'Read the poster in the library', release: 1, role: 'way',
    detail: 'A poster by the library desk gives the date, the room and a phone number.',
    whatAbout: { question: 'What about people who never look online?', kind: 'Alternative', found: 'Many visitors are regulars at the library. A poster by the desk reaches them without a website.' },
  },
  {
    id: 'dates-page', task: 'date', title: 'See all dates on a web page', release: 2, role: 'way',
    detail: 'A page on the library website lists every session this year.',
    later: 'A page of dates needs building and keeping up to date. One poster can announce one Saturday.',
  },
  {
    id: 'alerts', task: 'date', title: 'Get a message when dates are added', release: 3, role: 'extra',
    detail: 'Sign up once and hear about each new session.',
    later: 'Alerts help people come back. This release is about one Saturday.',
  },
  {
    id: 'items', task: 'item', title: 'See which items this session takes', release: 1, role: 'way',
    detail: 'The notice names the item types and the repairer on duty.',
  },
  {
    id: 'filter', task: 'item', title: 'Filter dates by item type', release: 2, role: 'way',
    detail: 'Choose “lamp” and see only the sessions with an electrical repairer.',
    later: 'A filter only earns its place once there are several sessions and benches to choose between.',
  },
  {
    id: 'unusual', task: 'item', title: 'Ask about an unusual item', release: 3, role: 'extra',
    detail: 'Send a photo and ask whether anyone can repair it.',
    later: 'Unusual items are rare. Lamps, kettles and toasters are what fill the electrical bench.',
  },
  {
    id: 'phone', task: 'time', title: 'Agree a time by phone', release: 1, role: 'way',
    detail: 'A volunteer answers, offers the free slots and agrees one.',
    whatAbout: { question: 'What about visitors who would rather talk to someone?', kind: 'Alternative', found: 'A phone call does the same job as a form, and a volunteer can answer questions a form cannot.' },
  },
  {
    id: 'form', task: 'time', title: 'Pick a slot on a form', release: 2, role: 'way',
    detail: 'An online form shows the free slots and takes the booking.',
    later: 'A form needs building. A volunteer with a phone can take six bookings this week.',
  },
  {
    id: 'waiting', task: 'time', title: 'Join a waiting list', release: 3, role: 'extra',
    detail: 'When the session is full, leave a number in case a slot frees up.',
    later: 'A waiting list matters once sessions fill up. Nobody knows yet whether they will.',
  },
  {
    id: 'door-list', task: 'details', title: 'Have my name put on the door list', release: 1, role: 'way',
    detail: 'The booking, with name, item and time, goes on the list the door volunteer holds.',
    whatAbout: { question: 'What about the volunteer at the door? How do they know who booked?', kind: 'Detail', found: 'This is the hole from lesson 3. Every booking has to end up on a list that the door volunteer can read.' },
  },
  {
    id: 'confirm', task: 'details', title: 'Get a confirmation message', release: 2, role: 'extra',
    detail: 'A text or email repeats the time and the room.',
    later: 'On the phone, the volunteer confirms the time out loud.',
  },
  {
    id: 'cancel', task: 'details', title: 'Cancel or move my booking', release: 2, role: 'extra',
    detail: 'Change the slot without ringing anyone.',
    later: 'With six slots, a visitor can ring the same number to change one.',
  },
  {
    id: 'name', task: 'checkin', title: 'Give my name', release: 1, role: 'way',
    detail: 'The door volunteer finds the name on the list and ticks it.',
    whatAbout: { question: 'What about a visitor whose phone battery is flat?', kind: 'Alternative', found: 'Checking in cannot depend on the visitor’s phone. A name is always available.' },
  },
  {
    id: 'walk-in', task: 'checkin', title: 'Turn up without a booking', release: 2, role: 'extra',
    detail: 'The door volunteer fits walk-ins around the booked slots.',
    later: 'Walk-ins carry on exactly as they do today. This release is for visitors who book.',
    whatAbout: { question: 'What about people who just turn up?', kind: 'Variation', found: 'Some visitors will never book. The café has to decide what happens to them at the door.' },
  },
  {
    id: 'code', task: 'checkin', title: 'Show a booking code', release: 3, role: 'way',
    detail: 'The visitor shows the code the form sent and a volunteer scans it.',
    later: 'A code needs a form to send it, a scanner to read it and a charged phone to show it.',
  },
  {
    id: 'called', task: 'wait', title: 'Be called from the door list', release: 1, role: 'way',
    detail: 'The door volunteer calls the next name when a bench is free.',
  },
  {
    id: 'queue', task: 'wait', title: 'Follow the queue on my phone', release: 3, role: 'way',
    detail: 'See how many visitors are ahead of you.',
    later: 'Calling a name across the room already works.',
  },
  {
    id: 'describe', task: 'fault', title: 'Describe the fault when booking', release: 2, role: 'extra',
    detail: 'Say what is wrong in advance so the repairer can bring parts.',
    later: 'Useful, but the visitor can explain the fault at the bench as they do today.',
  },
  {
    id: 'result', task: 'home', title: 'Have the result noted on the door list', release: 1, role: 'way',
    detail: 'The volunteer marks each visitor as seen, and each item as fixed or not.',
    whatAbout: { question: 'What about knowing whether any of this worked?', kind: 'Detail', found: 'The outcome from lesson 2 is “more visitors are seen by a repairer”. Somebody has to record it.' },
  },
  {
    id: 'advice', task: 'home', title: 'Get advice when it can’t be fixed', release: 2, role: 'extra',
    detail: 'Leave with a note of the part to order or where to recycle the item.',
    later: 'The repairer already gives this advice in person.',
    whatAbout: { question: 'What about a lamp that cannot be fixed?', kind: 'Exception', found: 'Not every repair succeeds. The visit still needs a decent ending.' },
  },
  {
    id: 'history', task: 'home', title: 'See my past repairs', release: 3, role: 'extra',
    detail: 'A returning visitor can look up what was done last time.',
    later: 'A history only helps returning visitors, and the pilot is a single Saturday.',
  },
];

export const tasksOf = (activity: ActivityId) => tasks.filter((task) => task.activity === activity);
export const cardsOf = (task: TaskId, release?: number) =>
  cards.filter((card) => card.task === task && (release === undefined || card.release === release));
export const taskName = (id: TaskId) => tasks.find((task) => task.id === id)!.name;

// Noor's original backlog, in her ranking. Lesson 3 lays it out as a map.
export const backlog: { title: string; activity: ActivityId | null; note?: string }[] = [
  { title: 'Calendar of sessions', activity: 'find' },
  { title: 'Online booking form', activity: 'book' },
  { title: 'Reminder emails', activity: 'book' },
  { title: 'Repairer profiles with photos', activity: 'find' },
  { title: 'Filter sessions by item type', activity: 'find' },
  { title: 'Waiting list', activity: 'book' },
  { title: 'Text message confirmations', activity: 'book' },
  { title: 'Cancel or move a booking', activity: 'book' },
  { title: 'Rota editor for volunteers', activity: null, note: 'Noor’s job, before any visit starts' },
  { title: 'Repair history for returning visitors', activity: 'repair' },
  { title: 'Donate button', activity: null, note: 'Not a step in anyone’s visit' },
  { title: 'Feedback survey', activity: 'repair' },
];
