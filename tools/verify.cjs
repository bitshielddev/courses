#!/usr/bin/env node
// Checks courses the way a learner uses them, in headless Chrome.
//
//   node tools/verify.cjs                     every course
//   node tools/verify.cjs c-intro c-inotify   the named courses
//   --only <text>          compiler courses: only lessons whose id contains <text>, skipping checks.cjs (no effect on lab courses)
//   --native               compiler courses: also build each program with the system clang under ASan and UBSan
//   --shots <dir>          save screenshots of a few pages
//   --shot-targets <list>  extra figure screenshots, comma separated: lesson@selector@clicks@nth
//   --probe <file>         one compiler course: instead of checking, run sources against challenge tests.
//                          The file is a JSON list of { name, lesson: <lesson id>, challenge: <challenge id>, source }
//   --url <address>        test a served copy of one course, such as http://localhost:8787 or its live site
//
// First it checks every course's settings (tools/courses.cjs). Then each course gets the
// checks for its mode, from data-mode on its <body>:
//   compiler  lint; run every program, predict question and challenge (the solution passes,
//             the starter does not); render every tab and step through every trace
//   lab       lint; answer every question, fill in and tick every lab, reload, narrow layout
// Both modes check that relative links in the lessons resolve. A course can add browser
// checks of its own in courses/<course>/checks.cjs.
//
// Needs Google Chrome, which it drives headlessly over the DevTools protocol.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { fileURLToPath, pathToFileURL } = require('node:url');
const courses = require('./courses.cjs');

const args = process.argv.slice(2);
const valued = ['--only', '--shots', '--shot-targets', '--probe', '--url'];
const flags = ['--native', ...valued];
const option = name => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const only = option('--only');
const shots = option('--shots');
const native = args.includes('--native');
const served = option('--url');
const chromePath = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const problems = [];
let scope = 'config';
let probed = false;
const fail = (where, message) => {
  problems.push(`${scope} ${where}: ${message}`);
  console.log(`  FAIL ${where}: ${message}`);
};

async function until(get, label, tries = 400) {
  for (let i = 0; i < tries; i++) {
    const value = await get();
    if (value) return value;
    await delay(50);
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function walkBlocks(blocks, visit) {
  for (const block of [].concat(blocks ?? [])) {
    if (typeof block === 'string') {
      visit({ prose: block });
      continue;
    }
    visit(block);
    for (const key of ['pitfall', 'compare', 'aside', 'tip', 'native']) {
      if (block[key] !== undefined) walkBlocks(block[key], visit);
    }
    if (block.details) walkBlocks(block.body, visit);
  }
}

// Every block in a lesson, with where it is: the reading, then each challenge or lab prompt.
function lessonBlocks(lesson) {
  const found = [];
  lesson.sections.forEach((section, index) => walkBlocks(section.body, block => found.push({ block, where: `${lesson.id} section ${index + 1}` })));
  lesson.challenges.forEach(challenge => walkBlocks(challenge.prompt, block => found.push({ block, where: `${lesson.id} challenge ${challenge.id}` })));
  return found;
}

function lint(lessons, mode) {
  const ids = new Set();
  const challengeIds = new Set();
  const badText = (where, text) => {
    if (typeof text !== 'string') return fail(where, 'expected a string');
    if (/[\u0000-\u0008\u000a-\u001f]/.test(text)) fail(where, `control character in prose (unescaped backslash?): ${JSON.stringify(text.slice(0, 60))}`);
    if ((text.match(/`/g) || []).length % 2) fail(where, `unbalanced backticks: ${text.slice(0, 60)}`);
    if ((text.match(/\*\*/g) || []).length % 2 && !/`[^`]*\*\*[^`]*`/.test(text)) fail(where, `unbalanced ** markers: ${text.slice(0, 60)}`);
  };
  for (const lesson of lessons) {
    const at = lesson.id;
    if (ids.has(lesson.id)) fail(at, 'duplicate lesson id');
    ids.add(lesson.id);
    for (const field of ['title', 'category', 'summary']) badText(`${at} ${field}`, lesson[field]);
    if (!Number.isFinite(lesson.minutes) || !Array.isArray(lesson.topics)) fail(at, 'needs minutes and a topics list');
    if (!lesson.sections?.length || !lesson.takeaways?.length || !lesson.quiz?.length || !lesson.challenges?.length) {
      fail(at, `missing sections, takeaways, quiz or ${mode === 'lab' ? 'a lab' : 'challenges'}`);
      continue;
    }
    lesson.takeaways.forEach(text => badText(`${at} takeaway`, text));
    lesson.sections.forEach((section, index) => badText(`${at} section ${index + 1} title`, section.title));
    for (const { block, where } of lessonBlocks(lesson)) {
      if (block.prose !== undefined) badText(where, block.prose);
      for (const item of block.list || block.steps || []) badText(`${where} list`, item);
      if (block.table) [block.table.head, ...block.table.rows].flat().forEach(cell => badText(`${where} table`, cell));
      if (block.trace) block.trace.steps.forEach(step => badText(`${where} trace "${block.trace.title}"`, step.say));
      if (mode === 'lab' && block.run !== undefined) fail(where, 'a lab course has no compiler, so it cannot have run cells; use code or shell');
    }
    lesson.quiz.forEach((question, index) => {
      const where = `${at} question ${index + 1}`;
      badText(where, question.q);
      if (question.explain) badText(where, question.explain);
      if (question.hint) badText(where, question.hint);
      if (question.kind === 'predict') {
        if (mode === 'lab') fail(where, 'predict questions need the browser compiler, which a lab course does not load');
        if (!question.code || typeof question.answer !== 'string' || !question.explain) fail(where, 'predict needs code, answer and explain');
        return;
      }
      const right = question.options.filter(option => option.ok).length;
      question.options.forEach(option => {
        badText(where, option.t);
        if (option.why) badText(where, option.why);
        else if (question.kind !== 'multi') fail(where, `option “${option.t}” has no feedback`);
      });
      if (question.kind === 'multi' ? right < 1 || right === question.options.length : right !== 1) fail(where, `${right} options marked correct`);
    });
    if (mode === 'lab') {
      if (lesson.challenges.length !== 1) fail(at, 'a lab lesson has exactly one lab in challenges');
      const lab = lesson.challenges[0];
      const where = `${at} lab ${lab.id}`;
      if (challengeIds.has(lab.id)) fail(where, 'duplicate lab id');
      challengeIds.add(lab.id);
      badText(where, lab.title);
      if (!Array.isArray(lab.prompt) || !lab.prompt.length) fail(where, 'needs a prompt list');
      if (!lab.checks?.length) fail(where, 'needs at least one check for the learner to tick');
      (lab.checks || []).forEach(check => badText(`${where} check`, check));
      (lab.hints || []).forEach(hint => badText(`${where} hint`, hint));
      (lab.notes || []).forEach(note => { if (!note.label) fail(where, 'every note needs a label'); });
      continue;
    }
    lesson.challenges.forEach(challenge => {
      const where = `${at} challenge ${challenge.id}`;
      if (challengeIds.has(challenge.id)) fail(where, 'duplicate challenge id');
      challengeIds.add(challenge.id);
      if (!['warm-up', 'core', 'stretch'].includes(challenge.level)) fail(where, `unknown level ${challenge.level}`);
      (challenge.hints || []).forEach(hint => badText(where, hint));
      if (!challenge.hints?.length) fail(where, 'no hints');
      if (challenge.tests.length < 3) fail(where, 'fewer than three tests');
      if (challenge.starter === challenge.solution) fail(where, 'starter equals solution');
      challenge.tests.forEach(test => badText(where, test.label));
    });
  }
}

function buildNative(name, source, where) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'c-manual-'));
  const file = path.join(dir, `${name}.c`);
  const binary = path.join(dir, name);
  fs.writeFileSync(file, source);
  const compile = spawnSync('/usr/bin/clang', ['-std=c17', '-Wall', '-Wextra', '-Wno-unused-parameter', '-g',
    '-fsanitize=address,undefined', '-fno-sanitize-recover=all', file, '-o', binary], { encoding: 'utf8' });
  if (compile.status !== 0) {
    fail(where, `native build failed:\n${compile.stderr}`);
    return null;
  }
  const run = spawnSync(binary, [], { encoding: 'utf8', timeout: 20000, env: { ...process.env, ASAN_OPTIONS: 'detect_leaks=0' } });
  fs.rmSync(dir, { recursive: true, force: true });
  if (run.status !== 0) fail(where, `native run exited with ${run.status ?? run.signal}:\n${run.stderr.slice(0, 1500)}`);
  return run;
}

// Reads a file the page links to, from disk or over HTTP.
async function readLink(url) {
  if (url.startsWith('file:')) return fs.readFileSync(fileURLToPath(url), 'utf8');
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.text();
}

// Relative links in the lessons, such as lab downloads, must resolve on disk and when served.
async function checkLinks(lessons, page) {
  const links = [];
  for (const lesson of lessons) {
    for (const { block, where } of lessonBlocks(lesson)) {
      if (!block.link || /^[a-z][a-z0-9+.-]*:/i.test(block.link)) continue;
      const url = new URL(block.link, page).href;
      links.push({ url, where, download: block.download });
      try {
        await readLink(url);
      } catch (error) {
        fail(where, `link ${block.link} does not resolve: ${error.code === 'ENOENT' ? 'no such file' : error.message}`);
      }
    }
  }
  return links;
}

// Compiler courses: every program, question and challenge against the bundled compiler,
// then every tab rendered and every trace stepped through.
async function checkCompilerCourse({ browser, screenshot, all }) {
  const lessons = all.filter(lesson => !only || lesson.id.includes(only));
  console.log(`Loaded ${all.length} lessons; checking ${lessons.length}.`);
  const run = source => browser(source => window.CCompiler.run(source), source);
  const runTests = (lessonId, challengeId, source) => browser(async (lessonId, challengeId, source) => {
    const challenge = window.C_LESSONS.find(lesson => lesson.id === lessonId).challenges.find(item => item.id === challengeId);
    const marker = 'FMVERIFY';
    const program = window.CTestDriver.build(source, challenge, marker);
    const result = await window.CCompiler.run(program);
    return { ...result, program, report: window.CTestDriver.parse(result.stdout, marker, challenge.tests.length) };
  }, lessonId, challengeId, source);
  const trim = text => text.replace(/\r/g, '').split('\n').map(line => line.trimEnd()).join('\n').replace(/^\n+|\n+$/g, '');
  let programs = 0;

  if (option('--probe')) {
    for (const probe of JSON.parse(fs.readFileSync(option('--probe'), 'utf8'))) {
      const result = await runTests(probe.lesson, probe.challenge, probe.source);
      console.log(`\n== ${probe.name} (exit ${result.exitCode}, ${result.stage})`);
      if (result.stderr.trim()) console.log(result.stderr.trim().slice(0, 500));
      result.report.tests.forEach((test, index) => console.log(`  #${index + 1} ${test.passed === undefined ? 'not run' : test.passed ? 'pass' : 'FAIL'} ${test.failures.concat(test.notes).join(' | ')}`));
    }
    return { programs, probed: true };
  }

  for (const lesson of lessons) {
    const started = Date.now();
    const before = problems.length;
    const cells = [];
    lesson.sections.forEach((section, index) => walkBlocks(section.body, block => {
      if (block.run !== undefined) cells.push({ ...block, where: `${lesson.id} section ${index + 1} ${block.name || 'cell'}` });
    }));
    for (const cell of cells) {
      const result = await run(cell.run);
      programs++;
      if (result.exitCode !== 0) fail(cell.where, `exit ${result.exitCode}: ${result.stderr.slice(0, 600)}`);
      else if (Boolean(result.stderr.trim()) !== Boolean(cell.warns)) fail(cell.where, cell.warns ? 'expected a compiler warning' : `unexpected compiler output: ${result.stderr.slice(0, 600)}`);
      if (cell.expect !== undefined && result.stdout !== cell.expect) fail(cell.where, `stdout was ${JSON.stringify(result.stdout)}, expected ${JSON.stringify(cell.expect)}`);
      if (cell.expect === undefined && !cell.warns && !cell.varies) fail(cell.where, `no expected output recorded; it printed ${JSON.stringify(result.stdout)}`);
      if (native && !cell.warns && result.exitCode === 0) {
        const local = buildNative('cell', cell.run, cell.where);
        if (local && cell.expect !== undefined && !cell.sizes && local.stdout !== cell.expect) fail(cell.where, `native stdout was ${JSON.stringify(local.stdout)}`);
      }
    }
    for (const [index, question] of lesson.quiz.entries()) {
      const where = `${lesson.id} question ${index + 1}`;
      if (question.kind !== 'predict' && !question.verify) continue;
      const result = await run(question.code);
      programs++;
      const wanted = question.kind === 'predict' ? question.answer : question.options.find(option => option.ok).t.replace(/`/g, '');
      if (result.exitCode !== 0 || (result.stderr.trim() && !question.warns)) fail(where, `exit ${result.exitCode}: ${result.stderr.slice(0, 600)}`);
      else if (trim(result.stdout) !== trim(wanted)) fail(where, `prints ${JSON.stringify(result.stdout)}, but the answer is ${JSON.stringify(wanted)}`);
    }
    for (const challenge of lesson.challenges) {
      const where = `${lesson.id} challenge ${challenge.id}`;
      const solved = await runTests(lesson.id, challenge.id, challenge.solution);
      programs++;
      const output = [solved.report.stdout.trim(), solved.stderr.trim()].filter(Boolean).join('\n');
      if (solved.exitCode !== 0) fail(where, `solution: exit ${solved.exitCode} at ${solved.stage}: ${solved.stderr.slice(0, 900)}`);
      else if (!solved.report.tests.every(test => test.passed)) {
        fail(where, `solution fails: ${solved.report.tests.map((test, i) => test.passed ? '' : `#${i + 1} ${test.failures.concat(test.notes).join('; ')}`).filter(Boolean).join(' | ')}`);
      } else if (output) fail(where, `solution produces output or warnings: ${output.slice(0, 600)}`);
      if (native && solved.exitCode === 0) {
        const local = buildNative('tests', solved.program, where);
        if (local && (local.stdout.match(/FMVERIFY R \d+ 1/g) || []).length !== challenge.tests.length) fail(where, `native solution run did not pass every test:\n${local.stdout.slice(0, 600)}`);
      }
      const started = await runTests(lesson.id, challenge.id, challenge.starter);
      programs++;
      const passed = started.report.tests.filter(test => test.passed).length;
      if (challenge.broken === 'compile') {
        if (started.stage !== 'compile' || started.exitCode === 0) fail(where, 'starter was expected not to compile');
      } else if (challenge.broken === 'timeout') {
        if (started.exitCode !== 124) fail(where, `starter was expected to time out, got exit ${started.exitCode}`);
      } else if (challenge.broken === 'crash') {
        if (started.exitCode === 0 && passed === challenge.tests.length) fail(where, 'starter passes every test');
      } else if (started.exitCode !== 0) {
        fail(where, `starter: exit ${started.exitCode} at ${started.stage}: ${started.stderr.slice(0, 600)}`);
      } else if (passed === challenge.tests.length) {
        fail(where, 'starter passes every test');
      } else if (started.stderr.trim() && !challenge.starterWarns) {
        fail(where, `starter compiles with warnings: ${started.stderr.slice(0, 600)}`);
      }
    }
    console.log(`${problems.length === before ? 'ok  ' : 'FAIL'} ${lesson.id}: ${cells.length} programs, ${lesson.quiz.length} questions, ${lesson.challenges.length} challenges (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  }

  // Render every lesson and tab, and step through each trace, to catch broken figures.
  for (const lesson of lessons) {
    for (const tab of ['learn', 'quiz', 'challenge']) {
      await browser((id, tab) => { window.location.hash = `${id}/${tab}`; }, lesson.id, tab);
      await until(() => browser(tab => document.querySelector(`#tab-${tab}`)?.getAttribute('aria-selected') === 'true', tab), `${lesson.id} ${tab}`);
      if (tab === 'learn') {
        await browser(() => {
          for (const figure of document.querySelectorAll('.figure-trace')) {
            const next = figure.querySelector('.trace-controls .button-primary');
            for (let guard = 0; guard < 80 && !next.disabled; guard++) next.click();
          }
        });
      } else if (tab === 'challenge') {
        const count = await browser(() => document.querySelectorAll('.challenge-choice').length);
        for (let index = 0; index < count; index++) await browser(index => document.querySelectorAll('.challenge-choice')[index].click(), index);
      }
      const overflow = await browser(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 1) fail(`${lesson.id} ${tab}`, `page is ${overflow}px wider than the window`);
    }
  }
  if (shots && lessons.length) {
    const pick = async (id, tab, name, scroll, clicks = 0, nth = 0) => {
      if (!lessons.some(lesson => lesson.id === id)) return;
      await browser((id, tab) => { window.location.hash = `${id}/${tab}`; }, id, tab);
      await delay(350);
      if (scroll) {
        await browser((selector, clicks, nth) => {
          const target = document.querySelectorAll(selector)[nth];
          target?.scrollIntoView({ block: 'start' });
          const restart = target?.querySelector('.trace-controls .button-quiet');
          if (restart && !restart.disabled) restart.click();
          for (let i = 0; i < clicks; i++) target?.querySelector('.trace-controls .button-primary')?.click();
        }, scroll, Number(clicks), Number(nth));
      }
      await delay(1100);
      await screenshot(name);
    };
    await pick(lessons[0].id, 'learn', 'learn-top');
    await pick(lessons[0].id, 'quiz', 'quiz');
    await pick(lessons[0].id, 'challenge', 'challenge');
    for (const [index, target] of (option('--shot-targets') || '').split(',').filter(Boolean).entries()) {
      const [id, selector, clicks, nth] = target.split('@');
      await pick(id, 'learn', `figure-${index + 1}`, selector, clicks, nth);
    }
  }
  return { programs };
}

// Lab courses: walk every lesson on a narrow screen, answer the questions, fill in the
// notebook and tick every check, and confirm that the notebook survives a reload.
async function checkLabCourse({ browser, cdp, screenshot }) {
  const before = problems.length;
  const expect = (condition, message) => { if (!condition) fail('lab', message); };
  const click = selector => browser(selector => document.querySelector(selector).click(), selector);
  await browser(() => localStorage.clear());
  await cdp('Page.reload');
  await until(() => browser(() => document.querySelector('#tab-challenge')?.textContent.includes('Linux lab')), 'lab course home');
  expect(!await browser(() => Boolean(window.CCompiler || window.CTestDriver)), 'loaded the browser compiler or its test driver');
  const lessons = await browser(() => window.C_LESSONS.map(lesson => ({
    title: lesson.title, questions: lesson.quiz.length, notes: lesson.challenges[0].notes?.length || 0,
  })));
  const inspectView = async (lesson, tab) => {
    const view = await browser(tab => ({
      title: document.querySelector('#lesson-title').textContent,
      selected: document.querySelector('#tab-' + tab).getAttribute('aria-selected'),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      editor: Boolean(document.querySelector('.run-cell, .challenge-workspace .editor-input')),
    }), tab);
    expect(view.title === lesson.title && view.selected === 'true', lesson.title + ' did not open on ' + tab);
    expect(view.overflow <= 1 && !view.editor, lesson.title + ' ' + tab + ' overflows or shows an in-browser runner');
  };
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await click('.mobile-menu-toggle');
  await click('.chapter-item');
  expect(await browser(() => document.querySelector('.mobile-menu-toggle').getAttribute('aria-expanded') === 'false'), 'narrow contents menu did not close after selecting a lesson');

  let previousNote;
  for (const [index, lesson] of lessons.entries()) {
    await inspectView(lesson, 'learn');
    await click('#lesson-footer .button-primary');
    await inspectView(lesson, 'quiz');
    if (!index) {
      const corrected = await browser(() => {
        const card = document.querySelector('.quiz-card');
        const wrong = window.C_LESSONS[0].quiz[0].options.findIndex(option => !option.ok);
        const input = card.querySelectorAll('.quiz-options input')[wrong];
        input.click();
        card.querySelector('button[type=submit]').click();
        const explained = Boolean(card.querySelector('.quiz-feedback.is-error p'));
        if (input.type === 'checkbox') input.click();
        return explained;
      });
      expect(corrected, 'first question did not explain an incorrect answer');
    }
    const solved = await browser(index => {
      const cards = [...document.querySelectorAll('.quiz-card')];
      return cards.map((card, position) => {
        const question = window.C_LESSONS[index].quiz[position];
        const controls = [...card.querySelectorAll('.quiz-options input')];
        if (!controls.length) return false;
        question.options.forEach((option, i) => { if (option.ok) controls[i].click(); });
        card.querySelector('button[type=submit]').click();
        return Boolean(card.querySelector('.quiz-feedback.is-success p'));
      });
    }, index);
    expect(solved.length === lesson.questions && solved.length > 0 && solved.every(Boolean), lesson.title + ' quiz did not accept and explain each correct answer');
    await click('#lesson-footer .button-primary');
    await inspectView(lesson, 'challenge');
    const note = lesson.notes ? 'Captured evidence for ' + lesson.title : '';
    if (previousNote) {
      expect(await browser(previous => [...document.querySelectorAll('.earlier-notes pre')].some(entry => entry.textContent === previous), previousNote), lesson.title + ' is missing the previous observation');
    }
    const checked = await browser(note => {
      if (note) {
        const notes = document.querySelector('.lab-notes textarea');
        notes.value = note;
        notes.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const checks = [...document.querySelectorAll('.lab-checks input[type=checkbox]')];
      checks.forEach(input => input.click());
      return checks.length && document.querySelector('.chapter-item.is-active').classList.contains('is-complete');
    }, note);
    if (note) previousNote = note;
    expect(checked, lesson.title + ' did not record the completed lab');
    if (!index) {
      await cdp('Page.reload');
      await until(() => browser(() => Boolean(document.querySelector('.lab-checks input'))), 'saved Linux lab');
      expect(await browser(note => (!note || document.querySelector('.lab-notes textarea').value === note) &&
        [...document.querySelectorAll('.lab-checks input')].every(input => input.checked) &&
        document.querySelector('.chapter-item.is-active').classList.contains('is-complete'), note), 'lab observations, questions or completed checks were lost on reload');
      await click('.lab-checks input');
      expect(!await browser(() => document.querySelector('.chapter-item.is-active').classList.contains('is-complete')), 'unchecking a lab step did not reopen the lesson');
      await click('.lab-checks input');
      await screenshot('ui-project-lab');
    }
    if (index + 1 < lessons.length) await click('#lesson-footer .button-primary');
  }
  expect(await browser(() => document.querySelector('#sidebar-progress-label').textContent === '100%'), 'course progress did not reach 100%');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  console.log(`${before === problems.length ? 'ok  ' : 'FAIL'} lab: ${lessons.length} lessons, quiz feedback, lab notes and checks, reload, mobile navigation`);
}

async function openChrome(page) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'c-manual-chrome-'));
  const chrome = spawn(chromePath, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, '--window-size=1440,960', page], { stdio: 'ignore' });
  let socket;
  const close = async () => {
    socket?.close();
    chrome.kill();
    await delay(200);
    fs.rmSync(profile, { recursive: true, force: true });
  };
  try {
    const portFile = path.join(profile, 'DevToolsActivePort');
    const port = (await until(() => fs.existsSync(portFile) && fs.readFileSync(portFile, 'utf8'), 'Chrome')).split('\n')[0];
    const tab = await until(async () => (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(item => item.url.startsWith(page)), 'the page');
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });
  } catch (error) {
    await close();
    throw error;
  }
  let lastId = 0;
  const pending = new Map();
  const exceptions = [];
  const requests = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    } else if (message.method === 'Runtime.exceptionThrown') {
      const detail = message.params.exceptionDetails;
      exceptions.push(detail.exception?.description || detail.text);
    } else if (message.method === 'Network.requestWillBeSent') {
      requests.push(message.params.request.url);
    }
  };
  const cdp = (method, params = {}) => new Promise(resolve => {
    const id = ++lastId;
    pending.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const browser = async (fn, ...values) => {
    const response = await cdp('Runtime.evaluate', {
      expression: `(${fn})(...${JSON.stringify(values)})`, awaitPromise: true, returnByValue: true,
    });
    const detail = response.result?.exceptionDetails;
    if (response.error || detail) throw new Error(response.error?.message || detail.exception?.description || detail.text);
    return response.result.result.value;
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Network.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 960, deviceScaleFactor: 1, mobile: false });
  return { cdp, browser, exceptions, requests, close };
}

async function verifyCourse(course) {
  scope = course.id;
  const page = served ? new URL(served).href : pathToFileURL(path.join(course.dir, 'index.html')).href;
  console.log(`\n== ${course.id} · ${course.title} · ${course.mode} course${served ? ` at ${page}` : ''}`);
  const shotDir = shots && path.join(shots, course.id);
  const { cdp, browser, exceptions, requests, close } = await openChrome(page);
  try {
    const screenshot = async name => {
      if (!shotDir) return;
      fs.mkdirSync(shotDir, { recursive: true });
      const image = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(shotDir, `${name}.png`), Buffer.from(image.result.data, 'base64'));
    };
    await cdp('Page.reload');
    const compiler = course.mode === 'compiler';
    await until(() => browser(compiler => Boolean(window.C_LESSONS && (!compiler || (window.CCompiler && window.CTestDriver)) && document.querySelector('.chapter-item')), compiler), 'the course to load');
    const all = await browser(() => window.C_LESSONS);
    lint(all, course.mode);
    const links = await checkLinks(all, page);
    const context = { course, page, served, browser, cdp, until, delay, fail, screenshot, all, links, readLink };

    let programs = 0;
    if (compiler) {
      const result = await checkCompilerCourse(context);
      programs = result.programs;
      if (result.probed) {
        probed = true;
        return programs;
      }
    } else {
      await checkLabCourse(context);
    }

    // --only narrows a compiler course to some lessons, so its whole-course checks are skipped.
    // It has no effect on a lab course, whose walk-through always covers every lesson.
    const extra = path.join(course.dir, 'checks.cjs');
    if (fs.existsSync(extra)) {
      const name = path.relative(courses.root, extra);
      if (only && compiler) {
        console.log(`skip ${name} (--only)`);
      } else {
        const before = problems.length;
        const summary = await require(extra)(context);
        console.log(before === problems.length ? `ok   ${name}${summary ? `: ${summary}` : ''}` : `FAIL ${name}`);
      }
    }
    if (exceptions.length) fail('page', `uncaught exceptions:\n${[...new Set(exceptions)].join('\n')}`);
    const origin = new URL(page).origin;
    const external = requests.filter(url => /^https?:/.test(url) && new URL(url).origin !== origin);
    if (external.length) fail('page', `external requests: ${[...new Set(external)].join(', ')}`);
    if (compiler) console.log(`${programs} programs compiled and run.`);
    return programs;
  } finally {
    await close();
  }
}

(async () => {
  const unknownFlags = args.filter(arg => arg.startsWith('--') && !flags.includes(arg));
  if (unknownFlags.includes('--project') || unknownFlags.includes('--project-url')) {
    throw new Error('--project and --project-url are gone: name the course instead, e.g. node tools/verify.cjs c-inotify --url <address>');
  }
  if (unknownFlags.length) throw new Error(`Unknown option ${unknownFlags.join(', ')}. See the top of tools/verify.cjs.`);
  const all = courses.loadAll();
  const named = args.filter((arg, index) => !arg.startsWith('--') && !valued.includes(args[index - 1]));
  const missing = named.filter(id => !all.some(course => course.id === id));
  if (missing.length) throw new Error(`No course called ${missing.join(', ')}. Courses: ${all.map(course => course.id).join(', ')}`);
  const selected = named.length ? all.filter(course => named.includes(course.id)) : all;
  if (served && selected.length !== 1) throw new Error('--url tests one course; name it, e.g. node tools/verify.cjs c-intro --url http://localhost:8787');
  if (option('--probe') && (selected.length !== 1 || selected[0].mode !== 'compiler')) throw new Error('--probe needs exactly one compiler course');

  const configProblems = courses.check(all);
  configProblems.forEach(message => fail('settings', message));
  console.log(`${configProblems.length ? 'FAIL' : 'ok  '} settings: ${all.length} courses, unique Workers, domains and storage keys, cross-course links`);

  let programs = 0;
  for (const course of selected) programs += await verifyCourse(course);

  if (probed) {
    console.log('\nProbe finished. No lesson checks were run.');
    if (problems.length) process.exitCode = 1;
    return;
  }
  console.log(`\n${selected.length} course${selected.length === 1 ? '' : 's'} checked${programs ? `, ${programs} programs compiled and run` : ''}.`);
  if (problems.length) {
    console.log(`${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
    process.exitCode = 1;
  } else {
    console.log('Everything checks out.');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
