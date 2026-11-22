(() => {
  'use strict';

  const { element, inline, prose, icon, button, codeView, createEditor, copyText } = window.CUI;
  const widgets = window.CWidgets;
  const driver = window.CTestDriver;
  const lessons = window.C_LESSONS || [];
  // Each course page sets these on <body>. See the course skill or README for the meanings.
  // data-mode: "compiler" (graded C challenges in the browser) or "lab" (a notebook for work done on Linux).
  // data-storage-key: where this course keeps progress. Never change it once the course is published.
  // data-legacy-storage-key: optional older key whose progress is migrated on first load.
  const { mode = 'compiler', storageKey, legacyStorageKey: legacyKey } = document.body.dataset;
  const labMode = mode === 'lab';
  const siteName = document.querySelector('.brand-name')?.textContent.trim() || document.title;
  const tabs = [
    { id: 'learn', title: 'Learn', icon: 'book' },
    { id: 'quiz', title: 'Questions', icon: 'check-circle' },
    { id: 'challenge', title: labMode ? 'Linux lab' : 'Challenges', icon: labMode ? 'terminal' : 'code' },
  ];
  const levels = { 'warm-up': 'Warm-up', core: 'Core', stretch: 'Stretch' };
  const callouts = {
    pitfall: ['Pitfall', 'alert'],
    compare: ['Coming from Python, PHP or TypeScript', 'swap'],
    aside: ['Under the hood', 'layers'],
    tip: ['Tip', 'bulb'],
    native: ['On your machine', 'laptop'],
  };

  const byId = id => document.getElementById(id);
  const pad = number => String(number).padStart(2, '0');

  if (!lessons.length) {
    byId('lesson-summary').textContent = 'The lesson files could not be loaded. Keep the tutorial files together and reopen index.html.';
    return;
  }
  if (!storageKey) {
    byId('lesson-summary').textContent = 'This page has no data-storage-key on its <body>, so progress cannot be saved.';
    return;
  }

  const save = readSave();
  let currentIndex = Math.max(0, lessons.findIndex(lesson => lesson.id === save.last?.lesson));
  let currentTab = 'learn';
  let active = null;
  const runs = new Map();
  const cellDrafts = new Map();
  const previousDrafts = new Map();
  const selectedChallenge = new Map();
  const listeners = new Set();
  const cleanups = [];
  const chapterButtons = [];
  const tabButtons = [];
  const sidebar = byId('sidebar');
  const menuToggle = document.querySelector('.mobile-menu-toggle');

  /* ---------- Saved progress ---------- */

  function readSave() {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey));
      if (stored?.lessons && typeof stored.lessons === 'object' && !Array.isArray(stored.lessons)) return stored;
      const legacy = legacyKey && JSON.parse(localStorage.getItem(legacyKey));
      if (legacy?.entries && typeof legacy.entries === 'object') return migrate(legacy);
    } catch {
      // A browser can disable Web Storage for locally opened files.
    }
    return { lessons: {}, last: null };
  }

  // Carries challenge drafts and passes over from the first edition of the course.
  function migrate(legacy) {
    const next = { lessons: {}, last: null };
    for (const lesson of lessons) {
      for (const challenge of lesson.challenges) {
        const old = challenge.legacy && legacy.entries[challenge.legacy];
        if (!old) continue;
        const entry = (next.lessons[lesson.id] ??= { quiz: {}, challenges: {} });
        entry.challenges[challenge.id] = {
          draft: typeof old.draft === 'string' ? old.draft : undefined,
          passed: Boolean(old.challengePassed),
          verified: Boolean(old.draftVerified),
        };
      }
    }
    return next;
  }

  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(save));
      return true;
    } catch {
      // Keep the current session usable even when saving is unavailable.
      return false;
    }
  }

  function entryFor(lesson) {
    const entry = (save.lessons[lesson.id] ??= {});
    entry.quiz ??= {};
    entry.challenges ??= {};
    return entry;
  }

  const quizState = (lesson, index) => (entryFor(lesson).quiz[index] ??= {});
  const challengeState = (lesson, challenge) => (entryFor(lesson).challenges[challenge.id] ??= {});

  function stats(lesson) {
    const entry = save.lessons[lesson.id];
    const passed = challenge => Boolean(entry?.challenges?.[challenge.id]?.passed);
    const required = lesson.challenges.filter(challenge => challenge.level !== 'stretch');
    const stretch = lesson.challenges.filter(challenge => challenge.level === 'stretch');
    const quizDone = lesson.quiz.filter((_, index) => entry?.quiz?.[index]?.passed).length;
    const requiredDone = required.filter(passed).length;
    const total = lesson.quiz.length + required.length;
    const done = quizDone + requiredDone;
    return {
      quizDone,
      challengesDone: lesson.challenges.filter(passed).length,
      total,
      done,
      complete: done === total,
      stretch: stretch.length,
      stretchDone: stretch.filter(passed).length,
    };
  }

  /* ---------- Contents and progress ---------- */

  function renderContents() {
    let category = '';
    for (const [index, lesson] of lessons.entries()) {
      if (lesson.category !== category) {
        category = lesson.category;
        byId('chapter-list').append(element('p', 'chapter-group-label', category));
      }
      const chapter = element('button', 'chapter-item');
      chapter.type = 'button';
      chapter.append(element('span', 'chapter-index', pad(index + 1)));
      const copy = element('span', 'chapter-copy');
      copy.append(element('span', 'chapter-title', lesson.title));
      chapter.append(copy, element('span', 'chapter-status'));
      chapter.addEventListener('click', () => navigate(index));
      byId('chapter-list').append(chapter);
      chapterButtons.push(chapter);
    }
    byId('lesson-count').textContent = `${lessons.length} lessons`;
  }

  function renderProgress() {
    const all = lessons.map(stats);
    const completed = all.filter(item => item.complete).length;
    const total = all.reduce((sum, item) => sum + item.total, 0);
    const done = all.reduce((sum, item) => sum + item.done, 0);
    const stretch = all.reduce((sum, item) => sum + item.stretch, 0);
    const stretchDone = all.reduce((sum, item) => sum + item.stretchDone, 0);
    const percent = Math.round(100 * done / total);
    byId('top-progress-label').textContent = `${completed} / ${lessons.length} lessons`;
    byId('sidebar-progress-label').textContent = `${percent}%`;
    const bar = byId('sidebar-progress-bar');
    bar.setAttribute('aria-valuemax', total);
    bar.setAttribute('aria-valuenow', done);
    bar.setAttribute('aria-valuetext', `${done} of ${total} exercises complete`);
    byId('top-progress-fill').style.width = `${percent}%`;
    byId('sidebar-progress-fill').style.width = `${percent}%`;
    byId('progress-caption').textContent = labMode
      ? `${done} of ${total} questions and labs complete`
      : `${done} of ${total} exercises · ${stretchDone} of ${stretch} stretch challenges`;

    chapterButtons.forEach((chapter, index) => {
      const item = all[index];
      const current = currentIndex === index;
      chapter.classList.toggle('is-active', current);
      chapter.classList.toggle('is-complete', item.complete);
      if (current) chapter.setAttribute('aria-current', 'step');
      else chapter.removeAttribute('aria-current');
      chapter.setAttribute('aria-label', `${lessons[index].title}, ${item.complete ? 'complete' : `${item.done} of ${item.total} exercises done`}`);
      const status = chapter.querySelector('.chapter-status');
      status.replaceChildren();
      if (item.complete) status.append(icon('check'));
      else if (item.done) status.append(element('span', 'chapter-fraction', `${item.done}/${item.total}`));
      else if (current) status.append(icon('chevron'));
    });

    const lesson = lessons[currentIndex];
    const item = all[currentIndex];
    const counts = [null, [item.quizDone, lesson.quiz.length], [item.challengesDone, lesson.challenges.length]];
    tabButtons.forEach((tab, index) => {
      const count = counts[index];
      const counter = tab.querySelector('.tab-count');
      counter.hidden = !count;
      if (!count) return;
      counter.textContent = `${count[0]}/${count[1]}`;
      counter.classList.toggle('is-complete', count[0] === count[1]);
      tab.setAttribute('aria-label', `${tabs[index].title}, ${count[0]} of ${count[1]} done`);
    });
  }

  function buildTabs() {
    tabs.forEach((tab, index) => {
      const node = element('button', 'tab-button');
      node.type = 'button';
      node.id = `tab-${tab.id}`;
      node.setAttribute('role', 'tab');
      node.setAttribute('aria-controls', 'lesson-stage');
      const count = element('span', 'tab-count');
      count.hidden = true;
      node.append(icon(tab.icon, 'tab-icon'), element('span', '', tab.title), count);
      node.addEventListener('click', () => selectTab(tab.id));
      node.addEventListener('keydown', event => {
        const keyTargets = {
          ArrowLeft: (index + tabs.length - 1) % tabs.length,
          ArrowRight: (index + 1) % tabs.length,
          Home: 0,
          End: tabs.length - 1,
        };
        if (!Object.hasOwn(keyTargets, event.key)) return;
        event.preventDefault();
        selectTab(tabs[keyTargets[event.key]].id, true);
      });
      byId('lesson-tabs').append(node);
      tabButtons.push(node);
    });
  }

  function openMenu(open) {
    menuToggle.setAttribute('aria-expanded', String(open));
    sidebar.classList.toggle('is-open', open);
  }

  /* ---------- Navigation ---------- */

  function readHash() {
    const [id, tab] = window.location.hash.slice(1).split('/');
    return { index: lessons.findIndex(lesson => lesson.id === id), tab: tabs.some(item => item.id === tab) ? tab : 'learn' };
  }

  function writeHash(push) {
    const hash = `#${lessons[currentIndex].id}${currentTab === 'learn' ? '' : `/${currentTab}`}`;
    if (window.location.hash === hash) return;
    try {
      if (push) window.history.pushState(null, '', hash);
      else window.history.replaceState(null, '', hash);
    } catch {
      window.location.hash = hash;
    }
  }

  function navigate(index, { tab = 'learn', updateHash = true, focus = true } = {}) {
    const lesson = lessons[index];
    if (!lesson) return;
    currentIndex = index;
    currentTab = tab;
    save.last = { lesson: lesson.id };
    persist();
    if (updateHash) writeHash(true);
    openMenu(false);

    byId('lesson-category').textContent = lesson.category;
    byId('lesson-kicker').textContent = `Lesson ${pad(index + 1)}`;
    byId('lesson-title').textContent = lesson.title;
    byId('lesson-summary').textContent = lesson.summary;
    document.title = `${lesson.title} · ${siteName}`;
    const duration = element('span', 'lesson-duration');
    duration.append(icon('clock'), element('span', '', `${lesson.minutes} min`));
    byId('lesson-meta').replaceChildren(duration, ...lesson.topics.map(topic => element('span', 'topic-tag', topic)));
    renderTab();
    // Keep the current lesson visible in the contents list without moving the page.
    const list = byId('chapter-list');
    const current = chapterButtons[index];
    if (current.offsetTop < list.scrollTop || current.offsetTop + current.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = current.offsetTop - list.clientHeight / 2;
    }
    if (focus) {
      window.scrollTo(0, 0);
      byId('lesson-title').focus({ preventScroll: true });
    }
  }

  function selectTab(id, focus = false) {
    if (currentTab !== id) {
      currentTab = id;
      writeHash(false);
      renderTab();
    }
    if (focus) {
      byId(`tab-${id}`).focus({ preventScroll: true });
      byId('lesson-tabs').scrollIntoView({ block: 'start' });
    }
  }

  function renderTab() {
    const lesson = lessons[currentIndex];
    cleanups.splice(0).forEach(cleanup => cleanup());
    listeners.clear();
    for (const tab of tabButtons) {
      const selected = tab.id === `tab-${currentTab}`;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    const stage = byId('lesson-stage');
    stage.setAttribute('aria-labelledby', `tab-${currentTab}`);
    stage.className = `lesson-layout is-${currentTab}`;
    stage.replaceChildren();
    if (currentTab === 'learn') renderLearn(stage, lesson);
    if (currentTab === 'quiz') renderQuiz(stage, lesson);
    if (currentTab === 'challenge') {
      if (labMode) {
        stage.className = 'lesson-layout is-linux-lab';
        window.CLocalLab.render(stage, lesson, { lessons, challengeState, renderBlock, hintBox, persist, renderProgress, renderFooter });
      } else {
        renderChallenge(stage, lesson);
      }
    }
    renderProgress();
    renderFooter();
  }

  function renderFooter() {
    const lesson = lessons[currentIndex];
    const main = element('div', 'lesson-footer-main');
    const next = element('div', 'lesson-footer-next');
    const note = element('span', 'lesson-footer-note');
    const item = stats(lesson);
    if (currentTab === 'learn') {
      if (currentIndex > 0) main.append(button('Previous lesson', 'secondary', () => navigate(currentIndex - 1), 'back'));
      next.append(button(`Answer ${lesson.quiz.length} questions`, 'primary', () => selectTab('quiz', true), 'arrow', 'end'));
    } else if (currentTab === 'quiz') {
      main.append(button('Back to the lesson', 'secondary', () => selectTab('learn', true), 'back'));
      next.append(button(labMode ? 'Open the Linux lab' : 'Open the challenges', 'primary', () => selectTab('challenge', true), 'arrow', 'end'));
    } else {
      main.append(button('Back to the questions', 'secondary', () => selectTab('quiz', true), 'back'));
      if (item.complete) note.append(icon('check'), element('span', '', 'Lesson complete'));
      const position = selectedChallenge.get(lesson.id) ?? 0;
      const unfinished = lesson.challenges.findIndex((challenge, index) => index > position && !challengeState(lesson, challenge).passed);
      if (unfinished !== -1) {
        next.append(button('Next challenge', item.complete ? 'secondary' : 'primary', () => chooseChallenge(lesson, unfinished), 'arrow', 'end'));
      }
      if (currentIndex < lessons.length - 1) {
        next.append(button('Next lesson', item.complete || unfinished === -1 ? 'primary' : 'secondary', () => navigate(currentIndex + 1), 'arrow', 'end'));
      } else {
        const incomplete = lessons.findIndex(other => !stats(other).complete);
        if (incomplete === -1) note.replaceChildren(icon('check'), element('span', '', labMode ? 'Project complete' : 'Course complete'));
        else if (incomplete !== currentIndex) next.append(button('Resume unfinished lessons', 'primary', () => navigate(incomplete), 'arrow', 'end'));
      }
    }
    if (note.hasChildNodes()) main.append(note);
    if (next.hasChildNodes()) main.append(next);
    byId('lesson-footer').replaceChildren(main);
  }

  /* ---------- Running C ---------- */

  const notify = () => listeners.forEach(listener => listener());

  async function start(key, program, finish) {
    if (active) return;
    active = key;
    notify();
    let result;
    try {
      result = await window.CCompiler.run(program);
    } catch (error) {
      result = { unavailable: true, stdout: '', stderr: error.message || String(error), exitCode: 1, stage: 'load' };
    }
    finish(result);
    active = null;
    notify();
  }

  const joinOutput = (stdout, stderr) => [stdout.trimEnd(), stderr.trimEnd()].filter(Boolean).join('\n\n');

  function summarize(result, stdout = result.stdout) {
    const outputText = joinOutput(stdout, result.stderr);
    if (result.unavailable) return { state: 'error', message: 'Compiler unavailable', outputText };
    if (result.exitCode !== 0) {
      const message = result.stage === 'compile' ? 'Compilation failed'
        : result.exitCode === 124 ? 'Stopped: time limit reached'
          : `Program exited with status ${result.exitCode}`;
      return { state: 'error', message, outputText };
    }
    const warned = Boolean(result.stderr.trim());
    return { state: warned ? 'warning' : 'success', message: warned ? 'Finished, with compiler warnings' : 'Program finished', outputText };
  }

  function codeCard(filename, actions = [], glyph = 'code') {
    const card = element('div', 'code-card');
    const bar = element('div', 'code-card-bar');
    const file = element('span', 'code-filename');
    file.append(icon(glyph), element('span', '', filename));
    bar.append(file);
    if (actions.length) {
      const group = element('div', 'code-card-actions');
      group.append(...actions);
      bar.append(group);
    }
    card.append(bar);
    return card;
  }

  function consoleView(label, clear) {
    const box = element('div', 'console');
    const heading = element('div', 'console-heading');
    const title = element('span', 'console-label');
    title.append(icon('terminal'), element('span', '', label));
    const clearControl = element('button', 'console-clear', 'Clear');
    clearControl.type = 'button';
    clearControl.setAttribute('aria-label', `Clear ${label.toLowerCase()}`);
    clearControl.addEventListener('click', clear);
    const output = element('pre', 'console-output');
    output.tabIndex = 0;
    output.setAttribute('aria-label', label);
    const status = element('p', 'runtime-status');
    status.setAttribute('role', 'status');
    heading.append(title, clearControl);
    box.append(heading, output, status);
    return {
      node: box,
      update({ message, state, outputText, placeholder }) {
        box.classList.toggle('has-output', Boolean(outputText));
        status.className = `runtime-status${state ? ` is-${state}` : ''}`;
        if (status.textContent !== message) status.textContent = message;
        output.dataset.empty = String(!outputText);
        output.dataset.state = state || '';
        const shown = outputText || placeholder;
        if (output.textContent !== shown) output.textContent = shown;
        clearControl.disabled = !outputText || state === 'running';
      },
    };
  }

  // An editable program with its own Run button and output.
  function runCell(key, source, filename = 'main.c') {
    const editor = createEditor({
      value: cellDrafts.get(key) ?? source,
      label: `Edit ${filename}`,
      minRows: 1,
      maxRows: 34,
      onInput(value) {
        if (value === source) cellDrafts.delete(key);
        else cellDrafts.set(key, value);
        update();
      },
      onRun: () => run.click(),
    });
    const reset = button('Reset', 'quiet', () => {
      editor.value = source;
      cellDrafts.delete(key);
      runs.delete(key);
      update();
    }, 'reset');
    const run = button('Run', 'primary', () => {
      const program = editor.value;
      start(key, program, result => runs.set(key, { source: program, ...summarize(result) }));
    }, 'play');
    const card = codeCard(filename, [reset, run]);
    card.classList.add('run-cell');
    const output = consoleView('Output', () => {
      runs.get(key).outputText = '';
      update();
    });
    card.append(editor.node, output.node);

    function update() {
      const running = active === key;
      const result = runs.get(key);
      const stale = result && result.source !== editor.value;
      run.disabled = Boolean(active);
      run.querySelector('.button-label').textContent = running ? 'Running…' : 'Run';
      reset.hidden = editor.value === source && !result;
      output.node.hidden = !running && !result;
      output.update({
        message: running ? 'Compiling and running…' : stale ? `${result.message} (before your latest edit)` : result?.message || '',
        state: running ? 'running' : result?.state,
        outputText: running ? '' : result?.outputText,
        placeholder: running ? 'Waiting for output…' : 'No output.',
      });
    }

    listeners.add(update);
    update();
    return card;
  }

  /* ---------- Learn ---------- */

  function renderBlock(item, key) {
    if (typeof item === 'string') return prose('p', 'section-body', item);
    if (item.details) {
      const details = element('details', 'hint-details');
      details.append(element('summary', '', item.details));
      item.body.forEach((part, index) => details.append(renderBlock(part, `${key}.${index}`)));
      return details;
    }
    if (item.link) {
      const link = element('a', 'resource-link', item.label);
      link.href = item.link;
      if (item.download) link.download = item.download;
      const paragraph = element('p', 'section-body');
      paragraph.append(link);
      return paragraph;
    }
    if (item.shell !== undefined || (labMode && item.code !== undefined && item.name)) {
      const shell = item.shell !== undefined;
      const source = shell ? item.shell : item.code;
      const copy = button('Copy', 'quiet', () => copyText(source, copy), 'copy');
      const card = codeCard(item.name || 'Terminal', [copy], shell ? 'terminal' : 'code');
      card.classList.add('lab-code');
      const code = shell ? element('pre', 'shell-command', source) : codeView(source, { block: true });
      code.tabIndex = 0;
      card.append(code);
      return card;
    }
    if (item.code !== undefined) {
      if (!item.name) return codeView(item.code);
      const file = element('div', 'named-code');
      file.append(element('p', 'named-code-label', item.name), codeView(item.code));
      return file;
    }
    if (item.text !== undefined) return element('pre', 'inline-code-block is-plain', item.text);
    if (item.run !== undefined) return runCell(key, item.run, item.name);
    if (item.list || item.steps) {
      const list = element(item.steps ? 'ol' : 'ul', 'section-list');
      (item.list || item.steps).forEach(entry => list.append(prose('li', '', entry)));
      return list;
    }
    if (item.table) {
      const wrap = element('div', 'table-wrap');
      const table = element('table', 'section-table');
      const head = element('tr');
      item.table.head.forEach(cell => head.append(prose('th', '', cell)));
      const body = element('tbody');
      item.table.rows.forEach(cells => {
        const row = element('tr');
        cells.forEach(cell => row.append(prose('td', '', cell)));
        body.append(row);
      });
      const header = element('thead');
      header.append(head);
      table.append(header, body);
      wrap.append(table);
      wrap.tabIndex = 0;
      return wrap;
    }
    if (item.trace) return widgets.trace(item.trace);
    if (item.memory) return widgets.memory(item.memory);
    if (item.strip) return widgets.strip(item.strip);
    if (item.widget) return widgets[item.widget](item);
    const kind = Object.keys(callouts).find(name => item[name] !== undefined);
    if (kind) {
      const [label, glyph] = callouts[kind];
      const box = element('aside', `callout is-${kind}`);
      const heading = element('p', 'callout-label');
      heading.append(icon(glyph, 'callout-icon'), element('span', '', item.title || label));
      box.append(heading);
      [].concat(item[kind]).forEach((part, index) => box.append(renderBlock(part, `${key}.${index}`)));
      return box;
    }
    throw new Error(`Unknown lesson block: ${JSON.stringify(item).slice(0, 80)}`);
  }

  function renderLearn(stage, lesson) {
    const article = element('article', 'lesson-panel reading');
    const toc = element('nav', 'lesson-toc');
    toc.setAttribute('aria-label', 'Sections in this lesson');
    toc.append(element('p', 'lesson-toc-label', 'In this lesson'));
    const links = [];
    lesson.sections.forEach((section, index) => {
      const block = element('section', 'section-block');
      block.id = `section-${index + 1}`;
      const heading = element('h2', 'section-title');
      heading.append(element('span', 'section-number', pad(index + 1)), inline(element('span'), section.title));
      block.append(heading);
      section.body.forEach((item, position) => block.append(renderBlock(item, `${lesson.id}:${index}.${position}`)));
      article.append(block);

      const link = element('button', 'lesson-toc-link');
      link.type = 'button';
      inline(link, section.title);
      link.addEventListener('click', () => {
        block.scrollIntoView({ block: 'start' });
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      });
      toc.append(link);
      links.push(link);
    });

    const takeaway = element('aside', 'takeaway');
    takeaway.append(element('h2', 'takeaway-label', 'Keep in mind'));
    const points = element('ul', 'takeaway-list');
    lesson.takeaways.forEach(point => points.append(prose('li', '', point)));
    takeaway.append(points);
    article.append(takeaway);
    stage.append(article, toc);

    if (window.IntersectionObserver) {
      const blocks = [...article.querySelectorAll('.section-block')];
      const seen = new Set();
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) seen.add(entry.target);
          else seen.delete(entry.target);
        }
        const first = blocks.findIndex(block => seen.has(block));
        links.forEach((link, index) => link.classList.toggle('is-current', index === first));
      }, { rootMargin: '-90px 0px -55% 0px' });
      blocks.forEach(block => observer.observe(block));
      cleanups.push(() => observer.disconnect());
    }
  }

  /* ---------- Questions ---------- */

  // Spaces at the ends of lines and blank lines around the output do not count;
  // leading spaces do, because field widths are often what a question is about.
  const normalize = text => text.replace(/\r/g, '').split('\n').map(line => line.trimEnd()).join('\n').replace(/^\n+|\n+$/g, '');

  function renderQuiz(stage, lesson) {
    const column = element('div', 'quiz-column');
    const summary = element('p', 'quiz-summary');
    summary.setAttribute('role', 'status');
    column.append(summary);

    function refresh() {
      const done = stats(lesson).quizDone;
      summary.textContent = done === lesson.quiz.length
        ? `All ${done} questions answered correctly.`
        : `${done} of ${lesson.quiz.length} answered correctly. Wrong answers cost nothing: read the feedback and try again.`;
      renderProgress();
      renderFooter();
    }

    lesson.quiz.forEach((question, index) => {
      column.append(question.kind === 'predict'
        ? predictCard(lesson, question, index, refresh)
        : choiceCard(lesson, question, index, refresh));
    });
    stage.append(column);
    refresh();
  }

  function questionShell(lesson, question, index) {
    const card = element('section', 'quiz-card');
    const head = element('div', 'quiz-card-head');
    const kinds = { predict: 'Predict the output', multi: 'Select all that apply' };
    head.append(element('span', 'quiz-number', `Question ${index + 1}`));
    if (kinds[question.kind]) head.append(element('span', 'quiz-kind', kinds[question.kind]));
    const badge = element('span', 'quiz-badge');
    badge.append(icon('check'), element('span', '', 'Correct'));
    head.append(badge);
    const title = prose('h2', 'quiz-question', question.q);
    title.id = `question-${lesson.id}-${index}`;
    card.append(head, title);
    if (question.code && question.kind !== 'predict') card.append(codeView(question.code));
    const feedback = element('div', 'quiz-feedback');
    feedback.setAttribute('role', 'status');
    return { card, badge, feedback, titleId: title.id };
  }

  function showFeedback(feedback, good, heading, parts) {
    feedback.hidden = false;
    feedback.classList.toggle('is-success', good);
    feedback.classList.toggle('is-error', !good);
    feedback.replaceChildren(element('strong', '', heading), ...parts.filter(Boolean).map(part => prose('p', '', part)));
  }

  function choiceCard(lesson, question, index, refresh) {
    const state = quizState(lesson, index);
    const multi = question.kind === 'multi';
    const { card, badge, feedback, titleId } = questionShell(lesson, question, index);
    const form = element('form', 'quiz-form');
    const options = element('div', 'quiz-options');
    options.setAttribute('role', multi ? 'group' : 'radiogroup');
    options.setAttribute('aria-labelledby', titleId);
    const picked = () => multi ? (state.picks || []) : (state.pick === undefined ? [] : [state.pick]);
    const controls = question.options.map((option, position) => {
      const label = element('label', 'quiz-option');
      const input = element('input', 'quiz-radio');
      input.type = multi ? 'checkbox' : 'radio';
      input.name = `answer-${lesson.id}-${index}`;
      input.checked = picked().includes(position);
      input.addEventListener('change', () => {
        if (multi) {
          const set = new Set(state.picks || []);
          if (input.checked) set.add(position);
          else set.delete(position);
          state.picks = [...set].sort((a, b) => a - b);
        } else {
          state.pick = position;
        }
        state.checked = false;
        persist();
        update();
      });
      const marker = element('span', `option-marker${multi ? ' is-box' : ''}`, String.fromCharCode(65 + position));
      marker.setAttribute('aria-hidden', 'true');
      label.append(input, marker, prose('span', 'option-text', option.t));
      options.append(label);
      return label;
    });
    const submit = element('button', 'button button-primary', 'Check answer');
    submit.type = 'submit';
    const actions = element('div', 'quiz-actions');
    actions.append(submit);
    form.append(options, actions, feedback);
    card.append(form);

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!picked().length || state.checked) return;
      state.checked = true;
      const right = question.options.every((option, position) => Boolean(option.ok) === picked().includes(position));
      if (right) state.passed = true;
      else state.tries = (state.tries || 0) + 1;
      persist();
      update();
      refresh();
    });

    function update() {
      const picks = picked();
      const right = question.options.every((option, position) => Boolean(option.ok) === picks.includes(position));
      controls.forEach((label, position) => {
        const chosen = picks.includes(position);
        const option = question.options[position];
        label.classList.toggle('is-selected', chosen);
        label.classList.toggle('is-correct', Boolean(state.checked && chosen && (multi ? right : option.ok)));
        label.classList.toggle('is-incorrect', Boolean(state.checked && chosen && !multi && !option.ok));
      });
      card.classList.toggle('is-passed', Boolean(state.passed));
      badge.hidden = !state.passed;
      submit.disabled = !picks.length || Boolean(state.checked);
      feedback.hidden = !state.checked;
      if (!state.checked) return;
      if (multi) {
        if (right) {
          showFeedback(feedback, true, 'Correct', [
            question.explain,
            ...question.options.filter(option => option.why).map(option => `${option.ok ? '**Yes:**' : '**No:**'} ${option.t}. ${option.why}`),
          ]);
        } else {
          const wanted = question.options.filter(option => option.ok).length;
          const hits = picks.filter(position => question.options[position].ok).length;
          const extra = picks.length - hits;
          showFeedback(feedback, false, 'Not quite', [
            `${wanted} of the options are correct. You selected ${hits} of them${extra ? ` and ${extra} that should not be selected` : ''}.`,
            state.tries >= 2 ? question.hint : '',
          ]);
        }
      } else {
        const option = question.options[state.pick];
        showFeedback(feedback, Boolean(option.ok), option.ok ? 'Correct' : 'Not quite', [option.why, option.ok ? question.explain : '']);
      }
    }

    update();
    return card;
  }

  function predictCard(lesson, question, index, refresh) {
    const state = quizState(lesson, index);
    const key = `${lesson.id}:quiz.${index}`;
    const { card, badge, feedback, titleId } = questionShell(lesson, question, index);
    const program = codeCard('predict.c');
    program.append(codeView(question.code, { numbered: true }));
    const form = element('form', 'quiz-form');
    const lines = question.answer.split('\n').length;
    const input = element(lines > 1 ? 'textarea' : 'input', 'predict-input');
    if (lines > 1) input.rows = lines;
    else input.type = 'text';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-labelledby', titleId);
    input.placeholder = lines > 1 ? `The program prints ${lines} lines` : 'Type exactly what the program prints';
    const note = prose('p', 'predict-note', lines > 1
      ? 'Press Enter between lines. The final `\\n` needs no typing. Spaces count, except at the ends of lines.'
      : 'Type the line as it appears on screen. The `\\n` that ends it needs no typing. Spaces count, except at the end of the line.');
    note.id = `${titleId}-note`;
    input.setAttribute('aria-describedby', note.id);
    input.value = state.text || '';
    const submit = element('button', 'button button-primary', 'Check answer');
    submit.type = 'submit';
    const run = button('Run it', 'secondary', () => {
      start(key, question.code, result => runs.set(key, summarize(result)));
    }, 'play');
    const actions = element('div', 'quiz-actions');
    actions.append(submit, run);
    const output = consoleView('Actual output', () => {
      runs.delete(key);
      update();
    });
    output.node.classList.add('is-compact');
    form.append(input, note, actions, feedback, output.node);
    card.append(program, form);

    input.addEventListener('input', () => {
      state.text = input.value;
      state.checked = false;
      persist();
      update();
    });
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!input.value.trim() || state.checked) return;
      state.checked = true;
      if (normalize(input.value) === normalize(question.answer)) state.passed = true;
      else state.tries = (state.tries || 0) + 1;
      persist();
      update();
      refresh();
    });

    function update() {
      const right = normalize(input.value) === normalize(question.answer);
      const running = active === key;
      const result = runs.get(key);
      card.classList.toggle('is-passed', Boolean(state.passed));
      badge.hidden = !state.passed;
      submit.disabled = !input.value.trim() || Boolean(state.checked);
      run.hidden = !(state.passed || state.tries);
      run.disabled = Boolean(active);
      feedback.hidden = !state.checked;
      if (state.checked) {
        const squash = text => text.replace(/\s+/g, '');
        const spacing = !right && squash(input.value) === squash(question.answer);
        showFeedback(feedback, right, right ? 'Correct' : spacing ? 'Close: only the spacing is wrong' : 'That is not what it prints', right
          ? [question.explain]
          : [
            spacing ? 'Every character is right, but the spaces are not. Work out how wide each field is.' : 'Trace it one statement at a time and try again.',
            state.tries >= 2 ? question.hint || 'Run it and work backwards from the real output.' : '',
          ]);
        if (!right && input.value.includes(' ')) feedback.append(spacesShown(input.value));
      }
      output.node.hidden = !running && !result;
      output.update({
        message: running ? 'Compiling and running…' : result?.message || '',
        state: running ? 'running' : result?.state,
        outputText: running ? '' : result?.outputText,
        placeholder: running ? 'Waiting for output…' : 'No output.',
      });
    }

    listeners.add(update);
    update();
    return card;
  }

  // The learner's answer with each space drawn as a dot, so padding can be counted.
  function spacesShown(text) {
    const figure = element('div', 'predict-echo');
    figure.append(element('span', 'predict-echo-label', 'Your answer, with each space shown as a dot'));
    const pre = element('pre', 'predict-echo-text');
    for (const part of normalize(text).split(/( +)/)) {
      if (!part) continue;
      pre.append(part.startsWith(' ') ? element('span', 'predict-space', '·'.repeat(part.length)) : document.createTextNode(part));
    }
    figure.append(pre);
    return figure;
  }

  /* ---------- Challenges ---------- */

  function chooseChallenge(lesson, index) {
    selectedChallenge.set(lesson.id, index);
    renderTab();
    byId('lesson-tabs').scrollIntoView({ block: 'start' });
  }

  function hintBox(hints, state) {
    const box = element('div', 'hint-box');
    const list = element('ol', 'hint-list');
    const reveal = button('', 'secondary', () => {
      state.hints = Math.min(hints.length, (state.hints || 0) + 1);
      persist();
      update();
    }, 'bulb');
    function update() {
      const shown = state.hints || 0;
      list.replaceChildren(...hints.slice(0, shown).map(hint => prose('li', '', hint)));
      list.hidden = !shown;
      reveal.hidden = shown >= hints.length;
      reveal.querySelector('.button-label').textContent = shown ? `Show hint ${shown + 1} of ${hints.length}` : `Show a hint (${hints.length} available)`;
    }
    box.append(list, reveal);
    update();
    return box;
  }

  function renderChallenge(stage, lesson) {
    const position = Math.min(selectedChallenge.get(lesson.id) ?? Math.max(0, lesson.challenges.findIndex(item => !challengeState(lesson, item).passed)), lesson.challenges.length - 1);
    selectedChallenge.set(lesson.id, position);
    const challenge = lesson.challenges[position];
    const state = challengeState(lesson, challenge);
    const key = `${lesson.id}:challenge.${challenge.id}`;

    const picker = element('div', 'challenge-picker');
    picker.setAttribute('role', 'group');
    picker.setAttribute('aria-label', 'Challenges in this lesson');
    const pickerItems = lesson.challenges.map((item, index) => {
      const choice = element('button', 'challenge-choice');
      choice.type = 'button';
      choice.setAttribute('aria-pressed', String(index === position));
      const status = element('span', 'challenge-choice-status');
      const text = element('span', 'challenge-choice-text');
      text.append(element('span', 'challenge-choice-title', item.title), element('span', 'challenge-choice-level', `${levels[item.level]}${item.kind === 'fix' ? ' · Fix the bug' : ''}`));
      choice.append(element('span', 'challenge-choice-number', String(index + 1)), text, status);
      choice.addEventListener('click', () => {
        if (index !== position) chooseChallenge(lesson, index);
      });
      picker.append(choice);
      return { item, choice, status };
    });

    const panel = element('section', 'lesson-panel challenge-panel');
    const task = element('div', 'challenge-prompt');
    const tags = element('div', 'challenge-tags');
    tags.append(element('span', `level-tag is-${challenge.level}`, levels[challenge.level]));
    if (challenge.kind === 'fix') {
      const fix = element('span', 'level-tag is-fix');
      fix.append(icon('bug'), element('span', '', 'Fix the bug'));
      tags.append(fix);
    }
    if (challenge.track) tags.append(element('span', 'level-tag is-heap', 'Heap-checked'));
    task.append(tags, element('h2', 'section-title', challenge.title));
    [].concat(challenge.prompt).forEach((part, index) => task.append(renderBlock(part, `${key}.prompt.${index}`)));
    if (challenge.signature) task.append(codeView(challenge.signature));
    panel.append(task);
    if (challenge.prelude) {
      const provided = element('div', 'challenge-provided');
      provided.append(element('h3', 'challenge-subtitle', 'Already declared for you'), codeView(challenge.prelude));
      panel.append(provided);
    }
    if (challenge.track) {
      panel.append(prose('p', 'challenge-note', 'These tests run with a checking allocator. A leak, a double free, or a write past the end of a block fails the test that caused it.'));
    }

    if (challenge.hints?.length) panel.append(hintBox(challenge.hints, state));
    const solution = element('details', 'hint-details solution-details');
    solution.append(element('summary', '', 'Reference solution'));
    if (challenge.solutionNote) solution.append(prose('p', 'solution-note', challenge.solutionNote));
    solution.append(codeView(challenge.solution));
    panel.append(solution);

    const workspace = element('aside', 'workspace challenge-workspace');
    const help = element('p', 'workspace-note', 'Ctrl + Enter or ⌘ + Enter runs the tests. Tab indents; press Esc and then Tab to leave the editor. Anything you printf appears in the console.');
    help.id = 'editor-help';
    const editor = createEditor({
      value: typeof state.draft === 'string' ? state.draft : challenge.starter,
      label: 'Edit solution.c',
      describedBy: 'editor-help',
      minRows: 12,
      maxRows: 30,
      onInput(value) {
        previousDrafts.delete(key);
        store(value);
      },
      onRun: () => run.click(),
    });
    const reset = button('Reset', 'quiet', () => {
      if (previousDrafts.has(key)) {
        editor.value = previousDrafts.get(key);
        previousDrafts.delete(key);
      } else {
        previousDrafts.set(key, editor.value);
        editor.value = challenge.starter;
      }
      store(editor.value);
      editor.focus();
    }, 'reset');
    const run = button('Run tests', 'primary', () => runTests(lesson, challenge, key, editor.value), 'play');
    const card = codeCard('solution.c', [reset, run]);
    card.append(editor.node);
    const output = consoleView('Console', () => {
      runs.get(key).outputText = '';
      update();
    });
    const results = element('ul', 'test-results');
    results.setAttribute('aria-label', 'Test cases');
    const rows = challenge.tests.map(test => {
      const row = element('li', 'test-result');
      const details = element('details', 'test-details');
      const summary = element('summary', 'test-summary');
      const badge = element('span', 'test-result-state');
      summary.append(element('span', 'test-result-label', test.label), badge);
      const report = element('div', 'test-report');
      details.append(summary, report, codeView(test.body));
      row.append(details);
      results.append(row);
      return { row, details, badge, report };
    });
    const testsHeading = element('h3', 'challenge-subtitle tests-heading', `Tests (${challenge.tests.length})`);
    workspace.append(card, help, output.node, testsHeading, results);
    stage.append(picker, panel, workspace);

    function store(value) {
      if (value !== (state.draft ?? challenge.starter)) state.verified = false;
      state.draft = value;
      persist();
      update();
    }

    function update() {
      const running = active === key;
      const result = runs.get(key);
      const current = result?.source === editor.value;
      run.disabled = Boolean(active);
      reset.disabled = running || (editor.value === challenge.starter && !previousDrafts.has(key));
      reset.querySelector('.button-label').textContent = previousDrafts.has(key) ? 'Undo reset' : 'Reset';
      run.querySelector('.button-label').textContent = running ? 'Running…' : 'Run tests';
      let message = active ? 'Compiler busy' : 'Ready';
      if (state.passed) message = state.verified ? 'Challenge passed' : 'Passed earlier. Run the tests to check this draft.';
      if (result) message = current ? result.message : 'Code changed. Run the tests to check this draft.';
      if (running) message = 'Compiling and running the tests…';
      output.update({
        message,
        state: running ? 'running' : current ? result.state : state.verified ? 'success' : '',
        outputText: running || !current ? '' : result.outputText,
        placeholder: running ? 'Waiting for test results…'
          : current || state.verified ? 'No compiler messages or program output.' : 'Compiler messages and program output appear here.',
      });
      const ranAny = current && result.tests?.some(test => test.passed !== undefined);
      rows.forEach(({ row, details, badge, report }, index) => {
        const test = current ? result.tests?.[index] : undefined;
        const passed = running ? undefined : current ? test?.passed : state.verified || undefined;
        const skipped = !running && current && passed === undefined;
        row.classList.toggle('is-success', passed === true);
        row.classList.toggle('is-error', passed === false);
        const text = passed === true ? 'Passed' : passed === false ? 'Failed' : skipped ? (ranAny ? 'Did not finish' : 'Not run') : 'Pending';
        if (badge.textContent !== text) {
          badge.replaceChildren();
          if (passed !== undefined) badge.append(icon(passed ? 'check' : 'cross'));
          badge.append(document.createTextNode(text));
        }
        report.replaceChildren();
        if (passed === false) {
          for (const failure of test.failures) {
            const line = element('p', 'test-failure');
            line.append(element('span', '', 'This check was false: '), element('code', '', failure));
            report.append(line);
          }
          for (const note of test.notes) report.append(element('p', 'test-failure', `${note}.`));
        }
        report.hidden = !report.hasChildNodes();
        if (passed === false && result.firstFailure === index) details.open = true;
      });
      pickerItems.forEach(({ item, choice, status }) => {
        const done = Boolean(challengeState(lesson, item).passed);
        choice.classList.toggle('is-passed', done);
        status.replaceChildren();
        if (done) status.append(icon('check'));
        choice.setAttribute('aria-label', `${item.title}, ${levels[item.level]}${done ? ', passed' : ''}`);
      });
    }

    listeners.add(update);
    update();
  }

  function runTests(lesson, challenge, key, source) {
    const marker = `FM${Math.random().toString(36).slice(2)}`;
    start(key, driver.build(source, challenge, marker), result => {
      const report = driver.parse(result.stdout, marker, challenge.tests.length);
      const summary = summarize(result, report.stdout);
      const passed = report.tests.filter(test => test.passed).length;
      const total = challenge.tests.length;
      if (!result.unavailable && result.stage !== 'compile') {
        const finished = report.tests.every(test => test.passed !== undefined);
        summary.message = finished ? `${passed} of ${total} tests passed`
          : `${summary.message} after ${passed} of ${total} tests passed`;
        summary.state = passed === total ? 'success' : 'error';
        if (passed === total) {
          const state = challengeState(lesson, challenge);
          state.passed = true;
          if ((state.draft ?? challenge.starter) === source) state.verified = true;
          persist();
        }
      }
      runs.set(key, { source, tests: report.tests, firstFailure: report.tests.findIndex(test => test.passed === false), ...summary });
    }).then(() => {
      renderProgress();
      if (currentTab === 'challenge') renderFooter();
    });
  }

  /* ---------- Start ---------- */

  menuToggle.addEventListener('click', () => openMenu(menuToggle.getAttribute('aria-expanded') === 'false'));
  sidebar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      openMenu(false);
      menuToggle.focus();
    }
  });
  const followHash = () => {
    const { index, tab } = readHash();
    if (index >= 0 && (index !== currentIndex || tab !== currentTab)) navigate(index, { tab, updateHash: false, focus: index !== currentIndex });
  };
  window.addEventListener('hashchange', followHash);
  window.addEventListener('popstate', followHash);
  document.querySelector('.brand').addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(0);
  });

  renderContents();
  buildTabs();
  const initial = readHash();
  navigate(initial.index >= 0 ? initial.index : currentIndex, { tab: initial.index >= 0 ? initial.tab : 'learn', updateHash: false, focus: false });

  // Load the compiler in the background so the first Run responds quickly.
  if (window.CCompiler) {
    const warm = () => window.CCompiler.warm();
    if (window.requestIdleCallback) window.requestIdleCallback(warm, { timeout: 4000 });
    else setTimeout(warm, 1500);
  }
})();
