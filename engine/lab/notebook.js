// The Linux lab notebook, used by courses whose <body> has data-mode="lab".
// The learner runs the experiments on Linux. Only the notebook lives in this page.
window.CLocalLab = (() => {
  'use strict';

  const { element, inline, prose } = window.CUI;

  function render(stage, lesson, { lessons, challengeState, renderBlock, hintBox, persist, renderProgress, renderFooter }) {
    const lab = lesson.challenges[0];
    const state = challengeState(lesson, lab);
    state.checks ??= [];
    state.notes ??= [];

    const instructions = element('article', 'lesson-panel challenge-prompt');
    instructions.append(element('h2', 'section-title', lab.title));
    lab.prompt.forEach((item, index) => instructions.append(renderBlock(item, `${lesson.id}:lab.${index}`)));
    if (lab.hints?.length) instructions.append(hintBox(lab.hints, state));

    const notebook = element('section', 'lab-notebook');
    notebook.append(element('h2', 'section-title', 'Lab notebook'));
    const saveNote = element('p', 'workspace-note', lab.notes?.length
      ? 'Record what happened on your machine. Your notes and checks are saved in this browser.'
      : 'Use the checks below to record your results.');
    notebook.append(saveNote);
    function saveNotebook() {
      if (!persist()) saveNote.textContent = 'Browser storage is unavailable. Copy any observations you want to keep before leaving.';
    }

    const earlier = element('details', 'hint-details earlier-notes');
    earlier.open = Boolean(lab.reviewNotes);
    earlier.append(element('summary', '', 'Read earlier observations'));
    for (const previous of lessons.slice(0, lessons.indexOf(lesson))) {
      const activity = previous.challenges[0];
      const saved = challengeState(previous, activity);
      for (const [index, field] of (activity.notes || []).entries()) {
        const value = saved.notes?.[index];
        if (!value?.trim()) continue;
        earlier.append(prose('h3', 'notebook-label', field.label), element('pre', 'notebook-entry', value));
      }
    }
    if (earlier.children.length > 1) notebook.append(earlier);

    const notes = element('div', 'lab-notes');
    for (const [index, field] of (lab.notes || []).entries()) {
      const label = element('label', 'notebook-field');
      const input = element('textarea', 'notebook-entry');
      input.rows = 4;
      input.spellcheck = false;
      input.placeholder = field.placeholder || '';
      input.value = state.notes[index] || '';
      input.addEventListener('input', () => {
        state.notes[index] = input.value;
        saveNotebook();
      });
      label.append(prose('span', 'notebook-label', field.label), input);
      notes.append(label);
    }
    notebook.append(notes);

    const checks = element('fieldset', 'lab-checks');
    checks.append(element('legend', 'notebook-label', 'Check off what you verified on Linux'));
    const status = element('p', 'lab-check-status');
    status.setAttribute('role', 'status');
    function updateStatus() {
      const done = lab.checks.filter((_, index) => state.checks[index]).length;
      status.textContent = done === lab.checks.length ? 'Lab complete' : `${done} of ${lab.checks.length} checks complete`;
      state.passed = done === lab.checks.length;
    }
    lab.checks.forEach((criterion, index) => {
      const label = element('label', 'lab-check');
      const input = element('input');
      input.type = 'checkbox';
      input.checked = Boolean(state.checks[index]);
      input.addEventListener('change', () => {
        state.checks[index] = input.checked;
        updateStatus();
        saveNotebook();
        renderProgress();
        renderFooter();
      });
      label.append(input, inline(element('span'), criterion));
      checks.append(label);
    });
    updateStatus();
    notebook.append(checks, status);
    stage.append(instructions, notebook);
  }

  return { render };
})();
