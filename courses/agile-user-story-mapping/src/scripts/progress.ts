// Each lesson saves its own completion so separate reading tabs can work independently.
const key = (slug: string) => 'bitshield.story-mapping.v2.lesson.' + slug;
const lessonLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-course-lesson]'));
const quiz = document.querySelector<HTMLFormElement>('[data-quiz]');
const sessionDone = new Set<string>();

function isDone(slug: string) {
  if (sessionDone.has(slug)) return true;
  try { return localStorage.getItem(key(slug)) === 'complete'; }
  catch { return false; }
}

function refreshProgress() {
  const completed = lessonLinks.filter(link => {
    const finished = isDone(link.dataset.courseLesson!);
    link.classList.toggle('is-complete', finished);
    if (finished) link.setAttribute('aria-label', (link.querySelector('strong')?.textContent || link.lastElementChild?.textContent) + ', completed');
    else link.removeAttribute('aria-label');
    return finished;
  });
  const count = completed.length;
  const progress = document.querySelector<HTMLElement>('[data-progress]');
  if (progress) {
    progress.hidden = count === 0;
    progress.textContent = count === lessonLinks.length ? 'All ' + count + ' lesson checks complete.' : count + ' of ' + lessonLinks.length + ' lesson checks complete.';
  }
  const start = document.querySelector<HTMLAnchorElement>('[data-start]');
  if (!start || !lessonLinks.length) return;
  const remaining = lessonLinks.find(link => !link.classList.contains('is-complete'));
  start.href = remaining?.href ?? '/cheat-sheet/';
  start.querySelector('span')!.textContent = !count ? 'Start the course' : remaining ? 'Continue course' : 'Open the cheat sheet';
}

if (quiz) {
  const slug = quiz.dataset.quiz!;
  const feedback = quiz.querySelector<HTMLElement>('.feedback')!;
  const inputs = Array.from(quiz.querySelectorAll<HTMLInputElement>('input'));
  function showFeedback(input: HTMLInputElement) {
    const correct = input.dataset.correct === 'true';
    feedback.dataset.result = correct ? 'correct' : 'retry';
    const heading = document.createElement('strong');
    heading.textContent = correct ? 'That works.' : 'Try another choice.';
    feedback.replaceChildren(heading, ' ' + input.dataset.feedback);
  }
  quiz.hidden = false;
  if (isDone(slug)) {
    const correct = inputs.find(input => input.dataset.correct === 'true')!;
    correct.checked = true;
    showFeedback(correct);
  }
  quiz.addEventListener('change', () => {
    feedback.replaceChildren();
    delete feedback.dataset.result;
  });
  quiz.addEventListener('submit', event => {
    event.preventDefault();
    const selected = inputs.find(input => input.checked);
    if (!selected) return;
    showFeedback(selected);
    if (selected.dataset.correct === 'true') {
      sessionDone.add(slug);
      try { localStorage.setItem(key(slug), 'complete'); } catch { /* Still works in this page. */ }
      refreshProgress();
    }
  });
}
refreshProgress();
window.addEventListener('pageshow', refreshProgress);
window.addEventListener('storage', refreshProgress);
