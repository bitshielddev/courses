// Part 1. A sample lesson from tools/new-course.mjs, with reading, a question and a Linux lab.
// It passes the checks. Replace it with the course's own lessons.
(() => {
  const part = 'Part 1 · Getting started';

  (window.C_LESSONS ||= []).push(
    {
      id: 'getting-started',
      category: part,
      title: 'Sample lesson',
      summary: 'A placeholder that shows the lesson format. Replace it.',
      minutes: 10,
      topics: ['Sample'],
      sections: [
        {
          title: 'Check the machine',
          body: [
            'Prose is a plain string. It supports `code` and **bold**, nothing else.',
            { shell: 'uname -sr', name: 'Terminal · kernel version' },
            { tip: 'Practical advice for the learner’s own machine.' },
          ],
        },
      ],
      takeaways: ['The one thing to remember from this lesson.'],
      quiz: [
        {
          q: 'What does `uname -s` print on Linux?',
          options: [
            { t: '`Linux`', ok: true, why: 'It prints the kernel name.' },
            { t: 'The host name', why: 'That is `uname -n`.' },
          ],
        },
      ],
      challenges: [{
        id: 'record-the-machine',
        kind: 'lab',
        level: 'core',
        title: 'Record your machine',
        prompt: [
          'Run the command and record what it printed.',
          { shell: 'uname -sr', name: 'Terminal · record the kernel' },
        ],
        hints: ['Copy the whole line, including the version number.'],
        checks: ['I ran `uname -sr` and recorded its output.'],
        notes: [{ label: 'Kernel', placeholder: 'Paste the output of uname -sr.' }],
      }],
    },
  );
})();
