// Part 1. A sample lesson from tools/new-course.mjs, with the common blocks, all three question
// kinds and a graded challenge. It passes the checks. Replace it with the course's own lessons.
(() => {
  const c = String.raw;
  const part = 'Part 1 · Getting started';

  (window.C_LESSONS ||= []).push(
    {
      id: 'getting-started',
      title: 'Sample lesson',
      category: part,
      minutes: 10,
      summary: 'A placeholder that shows the lesson format. Replace it.',
      topics: ['Sample'],
      sections: [
        {
          title: 'A program you can run',
          body: [
            'Prose is a plain string. It supports `code` and **bold**, nothing else.',
            { run: c`#include <stdio.h>

int main(void) {
    printf("%d\n", 6 * 7);
    return 0;
}`, name: 'answer.c', expect: '42\n' },
            { compare: 'How this differs from Python, PHP or TypeScript.' },
            { pitfall: 'A mistake people make here, and how to recognize it.' },
          ],
        },
      ],
      takeaways: ['The one thing to remember from this lesson.'],
      quiz: [
        {
          q: 'What does `6 * 7` evaluate to in C?',
          options: [
            { t: '`42`', ok: true, why: 'Both operands are `int`, so this is integer multiplication.' },
            { t: '`67`', why: 'C has no string repetition or concatenation with `*`.' },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    printf("%d\n", 7 / 2);
    return 0;
}`,
          answer: '3',
          explain: 'Dividing one `int` by another discards the fraction.',
        },
        {
          kind: 'multi',
          q: 'Which of these are integer types in C?',
          options: [
            { t: '`int`', ok: true },
            { t: '`long`', ok: true },
            { t: '`double`', why: 'It is a floating-point type.' },
          ],
          hint: 'There are two.',
        },
      ],
      challenges: [
        {
          id: 'sample-add',
          title: 'Add two numbers',
          level: 'warm-up',
          prompt: 'Return the sum of `a` and `b`.',
          signature: 'int add(int a, int b)',
          starter: 'int add(int a, int b) {\n    return 0;\n}',
          solution: 'int add(int a, int b) {\n    return a + b;\n}',
          hints: ['Use the `+` operator.'],
          tests: [
            { label: 'Adds small numbers', body: 'CHECK(add(2, 3) == 5);' },
            { label: 'Adds negative numbers', body: 'CHECK(add(-4, 1) == -3);' },
            { label: 'Adds zero', body: 'CHECK(add(9, 0) == 9);' },
          ],
        },
      ],
    },
  );
})();
