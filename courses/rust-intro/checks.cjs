// Browser checks for this course alone, run by tools/verify.cjs after its compiler-course checks.
// Drives the page the way a learner would: run and edit code, read a cell that is meant to fail,
// answer each kind of question, fail and pass challenges of each kind, reload, and resize.
// It names lessons and challenges in this course, so it is not shared with other courses.
module.exports = async function checkInterface({ browser, cdp, until, delay, fail, screenshot, all }) {
  const at = 'interface';
  const expect = (condition, message) => { if (!condition) fail(at, message); };
  const go = async (id, tab = 'learn') => {
    await browser((id, tab) => { window.location.hash = tab === 'learn' ? id : `${id}/${tab}`; }, id, tab);
    await until(() => browser((id, tab) => document.querySelector(`#tab-${tab}`)?.getAttribute('aria-selected') === 'true'
      && document.querySelector('.chapter-item.is-active .chapter-title')?.textContent === window.C_LESSONS.find(lesson => lesson.id === id).title, id, tab), `${id} ${tab}`);
  };
  const text = selector => browser(selector => document.querySelector(selector)?.textContent ?? '', selector);
  const click = selector => browser(selector => document.querySelector(selector).click(), selector);
  const type = (selector, value) => browser((selector, value) => {
    const input = document.querySelector(selector);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, selector, value);
  const statusIs = (selector, wanted) => until(async () => (await text(selector)).includes(wanted), `status “${wanted}” in ${selector}`);
  const lessonCalled = id => all.find(item => item.id === id);
  // Every run cell of a lesson, in reading order, including cells inside callouts.
  const cellsOf = lesson => {
    const found = [];
    const walk = value => {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') {
        if (typeof value.run === 'string') found.push(value);
        else Object.values(value).forEach(walk);
      }
    };
    lesson.sections.forEach(section => walk(section.body));
    return found;
  };
  // Marks the run cell that holds `source`, so that plain selectors can reach it.
  const mark = async (source, name) => {
    const marked = await browser((source, name) => {
      const cell = [...document.querySelectorAll('.run-cell')].find(cell => cell.querySelector('.editor-input').value === source);
      if (cell) cell.dataset.check = name;
      return Boolean(cell);
    }, source, name);
    expect(marked, `no cell on the page holds the source of ${name}`);
    return `.run-cell[data-check="${name}"]`;
  };
  const chooseChallenge = async (lesson, id) => {
    const index = lesson.challenges.findIndex(item => item.id === id);
    await browser(index => document.querySelectorAll('.challenge-choice')[index].click(), index);
    await until(() => browser(index => document.querySelectorAll('.challenge-choice')[index].getAttribute('aria-pressed') === 'true', index), `challenge ${id} chosen`);
    return lesson.challenges[index];
  };
  const runTests = async wanted => {
    await click('.challenge-workspace .button-primary');
    await statusIs('.challenge-workspace .runtime-status', wanted);
  };
  const allPassed = challenge => `${challenge.tests.length} of ${challenge.tests.length} tests passed`;

  await browser(() => localStorage.clear());
  await cdp('Page.reload');
  await until(() => browser(() => Boolean(document.querySelector('.chapter-item'))), 'reload');
  expect(await browser(() => window.C_LESSONS.length) === 24, 'the course should have 24 lessons');

  // A runnable cell: run, break, reset.
  const first = lessonCalled('first-program');
  await go('first-program');
  const hello = cellsOf(first).find(cell => cell.expect && !cell.fails && !cell.panics);
  const cell = await mark(hello.run, 'hello');
  await click(`${cell} .button-primary`);
  await statusIs(`${cell} .runtime-status`, 'Program finished');
  expect((await text(`${cell} .console-output`)).trim() === hello.expect.trim(), 'first cell did not print its expected output');
  await type(`${cell} .editor-input`, 'fn main() { let count: i32 = "three"; }');
  expect((await text(`${cell} .editor-highlight`)).startsWith('fn main() { let count: i32 = "three"; }'), 'highlight layer is out of step with the editor');
  await click(`${cell} .button-primary`);
  await statusIs(`${cell} .runtime-status`, 'Compilation failed');
  expect((await text(`${cell} .console-output`)).includes('error[E0308]'), 'compile error is missing its code');
  await click(`${cell} .button-quiet`);
  expect(await browser(cell => document.querySelector(`${cell} .editor-input`).value, cell) === hello.run, 'Reset did not restore the cell');

  // Editor keys: Enter keeps the indent and opens a block, Tab indents.
  await type(`${cell} .editor-input`, 'fn main() {');
  await browser(cell => {
    const input = document.querySelector(`${cell} .editor-input`);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, cell);
  for (const key of [{ key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }]) {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', ...key });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
  }
  const typed = await browser(cell => document.querySelector(`${cell} .editor-input`).value, cell);
  expect(typed === 'fn main() {\n        ', `editor keys produced ${JSON.stringify(typed)}`);
  await click(`${cell} .button-quiet`);

  // A cell that is meant not to compile shows the recorded message first, then the live one.
  const broken = cellsOf(first).find(cell => /^E\d+$/.test(cell.fails || ''));
  const failing = await mark(broken.run, 'fails');
  expect((await text(`${failing} .runtime-status`)).startsWith('Recorded output'), 'a failing cell does not show its recorded output');
  expect((await text(`${failing} .console-output`)).includes(`error[${broken.fails}]`), 'the recorded output is not the compiler error');
  await browser(failing => document.querySelector(failing).scrollIntoView({ block: 'center' }), failing);
  await screenshot('ui-recorded-error');
  await click(`${failing} .button-primary`);
  await statusIs(`${failing} .runtime-status`, 'This does not compile, which is what the example shows.');
  expect((await text(`${failing} .console-output`)).includes(`error[${broken.fails}]`), 'the live output is not the compiler error');

  // A cell that is meant to panic.
  const types = lessonCalled('variables-and-types');
  await go('variables-and-types');
  const panicking = await mark(cellsOf(types).find(cell => cell.panics).run, 'panics');
  expect((await text(`${panicking} .runtime-status`)).startsWith('Recorded output'), 'a panicking cell does not show its recorded output');
  await click(`${panicking} .button-primary`);
  await statusIs(`${panicking} .runtime-status`, 'The program panicked, which is what the example shows.');

  // Questions: single choice, predict, and select-all.
  await go('first-program', 'quiz');
  const card = index => `.quiz-card:nth-of-type(${index + 1})`;
  const answer = async (index, picks) => {
    await browser((selector, picks) => {
      document.querySelectorAll(`${selector} input`).forEach((input, position) => {
        if (input.checked !== picks.includes(position)) input.click();
      });
      document.querySelector(`${selector} .quiz-actions button[type=submit]`).click();
    }, card(index), picks);
  };
  const single = first.quiz.findIndex(question => !question.kind);
  await answer(single, [first.quiz[single].options.findIndex(option => !option.ok)]);
  expect((await text(`${card(single)} .quiz-feedback`)).startsWith('Not quite'), 'wrong choice was not marked');
  await answer(single, [first.quiz[single].options.findIndex(option => option.ok)]);
  expect((await text(`${card(single)} .quiz-feedback`)).startsWith('Correct'), 'right choice was not accepted');
  const predict = first.quiz.findIndex(question => question.kind === 'predict');
  await type(`${card(predict)} .predict-input`, 'nonsense');
  await click(`${card(predict)} button[type=submit]`);
  expect((await text(`${card(predict)} .quiz-feedback`)).startsWith('That is not'), 'wrong prediction was not marked');
  await click(`${card(predict)} .button-secondary`);
  await statusIs(`${card(predict)} .runtime-status`, 'Program finished');
  expect((await text(`${card(predict)} .console-output`)).trim() === first.quiz[predict].answer.trim(), 'Run it did not show the real output');
  await type(`${card(predict)} .predict-input`, first.quiz[predict].answer);
  await click(`${card(predict)} button[type=submit]`);
  expect((await text(`${card(predict)} .quiz-feedback`)).startsWith('Correct'), 'right prediction was not accepted');
  const multi = first.quiz.findIndex(question => question.kind === 'multi');
  const rightPicks = first.quiz[multi].options.flatMap((option, position) => option.ok ? [position] : []);
  await answer(multi, rightPicks.slice(1));
  expect((await text(`${card(multi)} .quiz-feedback`)).startsWith('Not quite'), 'incomplete selection was accepted');
  await answer(multi, rightPicks);
  expect((await text(`${card(multi)} .quiz-feedback`)).startsWith('Correct'), 'complete selection was not accepted');
  expect((await text('#tab-quiz .tab-count')) === `3/${first.quiz.length}`, `question counter shows ${await text('#tab-quiz .tab-count')}`);

  // A challenge: fail, inspect, pass.
  await go('first-program', 'challenge');
  const warmUp = first.challenges[0];
  expect((await text('.challenge-workspace')).includes('Rust Playground'), 'the challenge does not say where the code is sent');
  await runTests('tests passed');
  expect(await browser(() => document.querySelectorAll('.test-result.is-error').length) > 0, 'starter did not fail a test');
  expect((await text('.test-result.is-error .test-failure')).includes('The test stopped with a panic'), 'failed test does not show why it failed');
  await browser(() => document.querySelector('.console').scrollIntoView({ block: 'start' }));
  await delay(200);
  await screenshot('ui-challenge-failed');
  await type('.challenge-workspace .editor-input', warmUp.solution);
  await runTests(allPassed(warmUp));
  expect(await browser(() => document.querySelector('.challenge-choice').classList.contains('is-passed')), 'passed challenge is not ticked');
  expect((await text('.chapter-item.is-active .chapter-status')) === `4/${first.quiz.length + first.challenges.filter(item => item.level !== 'stretch').length}`, `sidebar shows ${await text('.chapter-item.is-active .chapter-status')}`);
  await click('.hint-box .button');
  expect(await browser(() => document.querySelectorAll('.hint-list li').length) === 1, 'hint was not revealed');

  // A repair challenge: the starter does not compile, and the learner sees the compiler's errors.
  const repair = await chooseChallenge(first, 'fix-three-errors');
  await runTests('Compilation failed');
  expect((await text('.challenge-workspace .console-output')).includes('error['), 'a starter that does not compile shows no compiler error');
  await type('.challenge-workspace .editor-input', repair.solution);
  await runTests(allPassed(repair));

  // Progress and drafts survive a reload, under this course's own storage key.
  expect(await browser(() => Boolean(localStorage.getItem('rust-intro-v1'))), 'progress is not saved under rust-intro-v1');
  await cdp('Page.reload');
  await until(() => browser(() => Boolean(document.querySelector('.challenge-workspace .editor-input'))), 'reload on the challenge tab');
  expect(await browser(() => document.querySelectorAll('.challenge-choice')[2].getAttribute('aria-pressed')) === 'true', 'reload did not open the first unfinished challenge');
  await click('.challenge-choice');
  expect(await browser(() => document.querySelector('.challenge-workspace .editor-input').value) === warmUp.solution, 'draft was not restored');
  await statusIs('.challenge-workspace .runtime-status', 'Challenge passed');
  expect((await text('#tab-quiz .tab-count')) === `3/${first.quiz.length}`, 'question progress was not restored');

  // A forbidden identifier is refused even when the tests would pass.
  const ownership = lessonCalled('ownership');
  await go('ownership', 'challenge');
  const noClone = await chooseChallenge(ownership, 'use-after-move');
  expect(noClone.forbid?.includes('clone'), 'use-after-move should forbid clone');
  await type('.challenge-workspace .editor-input', `${noClone.solution}\nfn spare(text: &String) -> String { text.clone() }\n`);
  await runTests('Compilation failed');
  expect((await text('.challenge-workspace .console-output')).includes('`clone` is not allowed in this challenge'), 'a forbidden identifier was not reported');
  await type('.challenge-workspace .editor-input', noClone.solution);
  await runTests(allPassed(noClone));

  // An allocation-checked challenge: the badge, a failing starter, a passing solution.
  const heap = lessonCalled('stack-and-heap');
  await go('stack-and-heap', 'challenge');
  const tracked = await chooseChallenge(heap, 'one-allocation');
  expect((await text('.level-tag.is-heap')) === 'Allocation-checked', 'tracked challenge has no badge');
  await runTests('tests passed');
  expect(await browser(() => document.querySelectorAll('.test-result.is-error').length) > 0, 'tracked starter did not fail a test');
  await browser(() => document.querySelector('.console').scrollIntoView({ block: 'start' }));
  await delay(200);
  await screenshot('ui-allocation-checked');
  await type('.challenge-workspace .editor-input', tracked.solution);
  await runTests(allPassed(tracked));

  // Narrow screens: nothing overflows, and the contents menu opens and closes.
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp('Page.reload');
  await until(() => browser(() => Boolean(document.querySelector('.chapter-item'))), 'mobile reload');
  const narrow = [['ownership', 'learn'], ['mutable-borrows', 'learn'], ['strings', 'learn'], ['enums-and-matching', 'learn'], ['trait-objects', 'learn'],
    ['modules-and-cargo', 'learn'], ['concurrency', 'learn'], ['lifetimes', 'quiz'], ['smart-pointers', 'challenge'], ['unsafe-and-beyond', 'challenge']];
  for (const [id, tab] of narrow) {
    await go(id, tab);
    await delay(150);
    const overflow = await browser(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) fail(at, `${id} ${tab} is ${overflow}px too wide at 390px`);
  }
  await click('.mobile-menu-toggle');
  expect(await browser(() => getComputedStyle(document.querySelector('#sidebar')).display) === 'block', 'contents menu did not open');
  await browser(() => document.querySelectorAll('.chapter-item')[6].click());
  expect(await browser(() => getComputedStyle(document.querySelector('#sidebar')).display) === 'none', 'contents menu did not close');
  await go('mutable-borrows');
  await browser(() => document.querySelector('.figure-borrows').scrollIntoView({ block: 'start' }));
  await delay(600);
  await screenshot('ui-mobile-borrows');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  await browser(() => localStorage.clear());
  return 'cells, recorded and live errors, a panic, editor keys, three question kinds, challenge flow, repair, forbidden names, allocation checks, reload, narrow layout';
};
