// Browser checks for this course alone, run by tools/verify.cjs after its compiler-course checks.
// Drives the page the way a learner would: run and edit code, answer each kind of question,
// fail and pass a challenge, reload, migrate progress from the first edition, and resize.
// It names lessons and questions in this course, so it is not shared with other courses.
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
  await browser(() => localStorage.clear());
  await cdp('Page.reload');
  await until(() => browser(() => Boolean(document.querySelector('.chapter-item'))), 'reload');

  // A runnable cell: run, break, reset.
  await go('build-and-run');
  await click('.run-cell .button-primary');
  await statusIs('.run-cell .runtime-status', 'Program finished');
  expect((await text('.run-cell .console-output')).includes('Hello from C'), 'first cell did not print its greeting');
  await type('.run-cell .editor-input', 'int main(void) { return 0 }');
  expect((await text('.run-cell .editor-highlight')).startsWith('int main(void) { return 0 }'), 'highlight layer is out of step with the editor');
  await click('.run-cell .button-primary');
  await statusIs('.run-cell .runtime-status', 'Compilation failed');
  expect(/lesson\.c:1:\d+: error/.test(await text('.run-cell .console-output')), 'compile error is missing its location');
  await click('.run-cell .button-quiet');
  expect((await browser(() => document.querySelector('.run-cell .editor-input').value)).includes('Hello from C'), 'Reset did not restore the cell');

  // Editor keys: Enter keeps the indent and opens a block, Tab indents.
  await type('.run-cell .editor-input', 'int main(void) {');
  await browser(() => {
    const input = document.querySelector('.run-cell .editor-input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });
  for (const key of [{ key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, { key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }]) {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', ...key });
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', ...key });
  }
  const typed = await browser(() => document.querySelector('.run-cell .editor-input').value);
  expect(typed === 'int main(void) {\n        ', `editor keys produced ${JSON.stringify(typed)}`);
  await click('.run-cell .button-quiet');

  // Questions: single choice, predict, and select-all.
  await go('build-and-run', 'quiz');
  const lesson = all.find(item => item.id === 'build-and-run');
  const card = index => `.quiz-card:nth-of-type(${index + 1})`;
  const answer = async (index, picks) => {
    await browser((selector, picks) => {
      document.querySelectorAll(`${selector} input`).forEach((input, position) => {
        if (input.checked !== picks.includes(position)) input.click();
      });
      document.querySelector(`${selector} .quiz-actions button[type=submit]`).click();
    }, card(index), picks);
  };
  const single = lesson.quiz.findIndex(question => !question.kind);
  await answer(single, [lesson.quiz[single].options.findIndex(option => !option.ok)]);
  expect((await text(`${card(single)} .quiz-feedback`)).startsWith('Not quite'), 'wrong choice was not marked');
  await answer(single, [lesson.quiz[single].options.findIndex(option => option.ok)]);
  expect((await text(`${card(single)} .quiz-feedback`)).startsWith('Correct'), 'right choice was not accepted');
  const predict = lesson.quiz.findIndex(question => question.kind === 'predict');
  await type(`${card(predict)} .predict-input`, 'nonsense');
  await click(`${card(predict)} button[type=submit]`);
  expect((await text(`${card(predict)} .quiz-feedback`)).startsWith('That is not'), 'wrong prediction was not marked');
  // Leading spaces are part of the output; dropping them is a spacing mistake, shown with dots.
  expect(/^ +\S/.test(lesson.quiz[predict].answer), 'the first predict question should start with padding');
  await type(`${card(predict)} .predict-input`, lesson.quiz[predict].answer.trim());
  await click(`${card(predict)} button[type=submit]`);
  expect((await text(`${card(predict)} .quiz-feedback`)).startsWith('Close: only the spacing'), 'missing padding was accepted or not called a spacing mistake');
  expect((await text(`${card(predict)} .predict-echo-text`)) === lesson.quiz[predict].answer.trim().replace(/ /g, '·'), 'spaces were not shown as dots');
  expect((await text(`${card(predict)} .predict-note`)).includes('\\n'), 'the note about the final newline is missing');
  await browser(selector => document.querySelector(selector).scrollIntoView({ block: 'center' }), card(predict));
  await screenshot('ui-predict-spacing');
  await click(`${card(predict)} .button-secondary`);
  await statusIs(`${card(predict)} .runtime-status`, 'Program finished');
  expect((await text(`${card(predict)} .console-output`)).trim() === lesson.quiz[predict].answer.trim(), 'Run it did not show the real output');
  await type(`${card(predict)} .predict-input`, lesson.quiz[predict].answer);
  await click(`${card(predict)} button[type=submit]`);
  expect((await text(`${card(predict)} .quiz-feedback`)).startsWith('Correct'), 'right prediction was not accepted');
  const multi = lesson.quiz.findIndex(question => question.kind === 'multi');
  const rightPicks = lesson.quiz[multi].options.flatMap((option, position) => option.ok ? [position] : []);
  await answer(multi, rightPicks.slice(1));
  expect((await text(`${card(multi)} .quiz-feedback`)).startsWith('Not quite'), 'incomplete selection was accepted');
  await answer(multi, rightPicks);
  expect((await text(`${card(multi)} .quiz-feedback`)).startsWith('Correct'), 'complete selection was not accepted');
  expect((await text('#tab-quiz .tab-count')) === `3/${lesson.quiz.length}`, `question counter shows ${await text('#tab-quiz .tab-count')}`);
  await screenshot('ui-quiz');

  // A challenge: fail, inspect, pass.
  await go('build-and-run', 'challenge');
  const challenge = lesson.challenges[0];
  await click('.challenge-workspace .button-primary');
  await statusIs('.challenge-workspace .runtime-status', 'tests passed');
  expect(await browser(() => document.querySelectorAll('.test-result.is-error').length) > 0, 'starter did not fail a test');
  expect((await text('.test-result.is-error .test-failure')).includes('This check was false'), 'failed test does not show its check');
  await browser(() => document.querySelector('.console').scrollIntoView({ block: 'start' }));
  await delay(200);
  await screenshot('ui-challenge-failed');
  await type('.challenge-workspace .editor-input', challenge.solution);
  await click('.challenge-workspace .button-primary');
  await statusIs('.challenge-workspace .runtime-status', `${challenge.tests.length} of ${challenge.tests.length} tests passed`);
  expect(await browser(() => document.querySelector('.challenge-choice').classList.contains('is-passed')), 'passed challenge is not ticked');
  expect((await text('.chapter-item.is-active .chapter-status')) === `4/${lesson.quiz.length + lesson.challenges.filter(item => item.level !== 'stretch').length}`, `sidebar shows ${await text('.chapter-item.is-active .chapter-status')}`);
  await click('.hint-box .button');
  expect(await browser(() => document.querySelectorAll('.hint-list li').length) === 1, 'hint was not revealed');

  // Progress and drafts survive a reload.
  await cdp('Page.reload');
  await until(() => browser(() => Boolean(document.querySelector('.challenge-workspace .editor-input'))), 'reload on the challenge tab');
  expect(await browser(() => document.querySelectorAll('.challenge-choice')[1].getAttribute('aria-pressed')) === 'true', 'reload did not open the first unfinished challenge');
  await click('.challenge-choice');
  expect(await browser(() => document.querySelector('.challenge-workspace .editor-input').value) === challenge.solution, 'draft was not restored');
  await statusIs('.challenge-workspace .runtime-status', 'Challenge passed');
  expect((await text('#tab-quiz .tab-count')) === `3/${lesson.quiz.length}`, 'question progress was not restored');

  // Progress from the first edition of the course is carried over.
  await browser(() => {
    localStorage.clear();
    localStorage.setItem('c-field-manual-v1', JSON.stringify({ lastLesson: 'pointers', entries: { pointers: { challengePassed: true, draftVerified: true, draft: '// kept' } } }));
  });
  await cdp('Page.reload');
  await until(() => browser(() => Boolean(document.querySelector('.chapter-item'))), 'reload with old progress');
  await go('pointers', 'challenge');
  await browser(() => [...document.querySelectorAll('.challenge-choice')].find(choice => choice.textContent.includes('Put two values in order')).click());
  expect(await browser(() => document.querySelector('.challenge-workspace .editor-input').value) === '// kept', 'old draft was not migrated');
  expect(await browser(() => document.querySelector('.challenge-choice[aria-pressed=true]').classList.contains('is-passed')), 'old pass was not migrated');
  await browser(() => localStorage.clear());

  // Narrow screens: nothing overflows, and the contents menu opens and closes.
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await cdp('Page.reload');
  await until(() => browser(() => Boolean(document.querySelector('.chapter-item'))), 'mobile reload');
  for (const [id, tab] of [['pointers', 'learn'], ['pointer-arithmetic', 'learn'], ['structs', 'learn'], ['strings', 'quiz'], ['heap', 'challenge'], ['const-and-declarations', 'learn']]) {
    await go(id, tab);
    await delay(150);
    const overflow = await browser(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) fail(at, `${id} ${tab} is ${overflow}px too wide at 390px`);
  }
  await click('.mobile-menu-toggle');
  expect(await browser(() => getComputedStyle(document.querySelector('#sidebar')).display) === 'block', 'contents menu did not open');
  await browser(() => document.querySelectorAll('.chapter-item')[6].click());
  expect(await browser(() => getComputedStyle(document.querySelector('#sidebar')).display) === 'none', 'contents menu did not close');
  await go('pointers');
  await browser(() => document.querySelector('.figure-trace').scrollIntoView({ block: 'start' }));
  await delay(600);
  await screenshot('ui-mobile-trace');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  return 'cells, editor keys, three question kinds, challenge flow, reload, migration, narrow layout';
};
