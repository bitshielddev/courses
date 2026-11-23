// Part 1. A sample lesson from tools/new-course.mjs --language rust, with the common blocks, a
// cell that is meant not to compile, the question kinds and a graded challenge. It passes the
// checks. Replace it with the course's own lessons.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
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
            { run: rs`fn main() {
    println!("{}", 6 * 7);
}`, name: 'answer.rs', expect: '42\n' },
            { compare: 'How this differs from Python, PHP or TypeScript.' },
            { pitfall: 'A mistake people make here, and how to recognize it.' },
          ],
        },
        {
          title: 'A program that must not compile',
          body: [
            'A cell with `fails` is meant to be rejected. It names the error code the compiler gives, and the page shows the compiler\'s message before anyone presses Run.',
            { run: rs`fn main() {
    let name = String::from("Ferris");
    let moved = name;
    println!("{name} {moved}");
}`, name: 'moved.rs', fails: 'E0382' },
          ],
        },
      ],
      takeaways: ['The one thing to remember from this lesson.'],
      quiz: [
        {
          q: 'What does `7 / 2` evaluate to in Rust?',
          options: [
            { t: '`3`', ok: true, why: 'Both operands are integers, so the division discards the fraction.' },
            { t: '`3.5`', why: 'That needs floating-point operands, such as `7.0 / 2.0`.' },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let total: i32 = (1..=4).sum();
    println!("{total}");
}`,
          answer: '10',
          explain: 'The range `1..=4` includes both ends, so the sum is 1 + 2 + 3 + 4.',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let count = 5;
    count = 6;
    println!("{count}");
}`,
          options: [
            { t: 'No: `count` is not declared `mut`', ok: true, why: 'A binding is immutable unless it is declared with `let mut`.' },
            { t: 'Yes, and it prints `6`', why: 'That would need `let mut count = 5;`.' },
          ],
          verify: 'E0384',
        },
        {
          kind: 'multi',
          q: 'Which of these are integer types in Rust?',
          options: [
            { t: '`i32`', ok: true },
            { t: '`usize`', ok: true },
            { t: '`f64`', why: 'It is a floating-point type.' },
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
          signature: 'fn add(a: i32, b: i32) -> i32',
          starter: 'fn add(a: i32, b: i32) -> i32 {\n    a - b\n}',
          solution: 'fn add(a: i32, b: i32) -> i32 {\n    a + b\n}',
          hints: ['Use the `+` operator. The last expression of a function is its value.'],
          tests: [
            { label: 'Adds small numbers', body: 'assert_eq!(add(2, 3), 5);' },
            { label: 'Adds negative numbers', body: 'assert_eq!(add(-4, 1), -3);' },
            { label: 'Adds zero', body: 'assert_eq!(add(9, 0), 9);' },
          ],
        },
      ],
    },
  );
})();
