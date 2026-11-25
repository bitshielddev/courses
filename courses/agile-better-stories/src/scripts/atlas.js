import { topics } from '../data/topics.js';

const byId = id => document.getElementById(id);
const ideas = JSON.parse(byId('ideas').textContent);
const ideaById = new Map(ideas.map(idea => [idea.id, idea]));
const topicByKey = new Map(topics.map(topic => [topic.key, topic]));
const search = byId('search');
const detail = byId('detail');
const controls = document.querySelectorAll('[data-filter]');
const pageTitle = document.title;

function normalise(text) {
  return text.toLocaleLowerCase('en').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '');
}

// Keep the original Astro-rendered cards in place as the reader filters them.
const entries = Array.from(byId('cards').children, item => {
  const link = item.querySelector('.idea-card');
  const idea = ideaById.get(Number(link.hash.slice('#idea-'.length)));
  const text = [idea.title, idea.sourceTitle, idea.topic, idea.advice, idea.example, idea.prompt].join(' ');
  return { item, topic: idea.topic, text: normalise(text) };
});

let activeTopic = 'all';

function updateIndex() {
  const query = search.value.trim();
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  let count = 0;
  for (const { item, topic, text } of entries) {
    const matches = (activeTopic === 'all' || activeTopic === topic) && terms.every(term => text.includes(term));
    item.hidden = !matches;
    if (matches) count++;
  }

  let status = count + (count === 1 ? ' idea' : ' ideas');
  if (activeTopic !== 'all') status += ' in ' + topicByKey.get(activeTopic).name;
  if (query) status += ' matching “' + query + '”';
  byId('result-status').textContent = status;
  byId('empty').hidden = count > 0;
  byId('clear-search').hidden = !search.value;
  controls.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeTopic)));
}

for (const button of controls) {
  button.addEventListener('click', () => {
    activeTopic = button.dataset.filter;
    const fromMap = button.classList.contains('pin');
    if (fromMap) search.value = '';
    updateIndex();
    if (fromMap) {
      byId('index-title').focus({ preventScroll: true });
      byId('index').scrollIntoView({ block: 'start' });
    }
  });
}

search.addEventListener('input', updateIndex);
byId('clear-search').addEventListener('click', () => {
  search.value = '';
  updateIndex();
  search.focus();
});
byId('reset').addEventListener('click', () => {
  activeTopic = 'all';
  search.value = '';
  updateIndex();
  search.focus();
});

let currentIdea;
let opener;
let closing = false;
let lastDraw;

// Each visit within the reader keeps its own Back/Forward entry. Close returns
// to the index in one step, even after a chain of connected ideas.
function openIdea(idea, trigger) {
  if (!idea || currentIdea === idea || closing) return;
  if (!detail.open) opener = trigger;
  const depth = detail.open ? history.state?.atlasDepth || 0 : 0;
  history.pushState({ atlasDepth: depth + 1 }, '', '#idea-' + idea.id);
  renderRoute();
}

function removeIdeaHash() {
  const url = new URL(location.href);
  url.hash = '';
  history.replaceState(null, '', url);
}

function closeReader() {
  if (closing) return;
  const depth = history.state?.atlasDepth;
  if (depth > 0) {
    closing = true;
    history.go(-depth);
  } else {
    // A shared URL may be the very first entry in this tab.
    removeIdeaHash();
    renderRoute();
  }
}

function decorativeSpan(className, text = '') {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function relatedLink(id) {
  const other = ideaById.get(id);
  const link = document.createElement('a');
  link.href = '#idea-' + other.id;
  link.dataset.topic = other.topic;
  link.append(other.title, decorativeSpan('related-arrow', '↗'));
  return link;
}

function renderRoute() {
  const match = /^#idea-(\d+)$/.exec(location.hash);
  let idea = match && ideaById.get(Number(match[1]));
  if (closing) {
    closing = false;
    // The first entry in a related-idea chain may itself have been shared.
    if (idea) removeIdeaHash();
    idea = undefined;
  }

  if (!idea) {
    currentIdea = undefined;
    document.title = pageTitle;
    if (detail.open) {
      detail.close();
      if (opener?.isConnected && opener.getClientRects().length) {
        opener.focus({ preventScroll: true });
      } else {
        byId('index-title').focus();
      }
    }
    return;
  }

  if (currentIdea === idea && detail.open) return;
  currentIdea = idea;
  detail.dataset.topic = idea.topic;
  const topicName = topicByKey.get(idea.topic).name;
  const number = String(idea.id).padStart(2, '0');
  byId('detail-label').replaceChildren(decorativeSpan('mark'), topicName + ' · № ' + number);
  byId('detail-title').textContent = idea.title;
  byId('advice').textContent = idea.advice;
  byId('example').textContent = idea.example;
  byId('prompt').textContent = idea.prompt;
  byId('related').replaceChildren(...idea.related.map(relatedLink));
  byId('copy').textContent = 'Copy link to this idea';
  byId('copy-status').textContent = '';
  byId('copy-fallback').hidden = true;
  document.title = idea.title + ' · Story Atlas';
  if (!detail.open) detail.showModal();
  detail.scrollTop = 0;
  byId('detail-title').focus({ preventScroll: true });
}

document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const link = event.target.closest('a[href^="#idea-"]');
  if (!link) return;
  event.preventDefault();
  openIdea(ideaById.get(Number(link.hash.slice('#idea-'.length))), link);
});
window.addEventListener('popstate', renderRoute);
window.addEventListener('hashchange', renderRoute);
byId('close').addEventListener('click', closeReader);
detail.addEventListener('cancel', event => {
  event.preventDefault();
  closeReader();
});
detail.addEventListener('click', event => {
  if (event.target !== detail) return;
  const { left, right, top, bottom } = detail.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) closeReader();
});
byId('draw').addEventListener('click', event => {
  const choices = ideas.filter(idea => idea !== lastDraw);
  lastDraw = choices[Math.floor(Math.random() * choices.length)] || ideas[0];
  openIdea(lastDraw, event.currentTarget);
});
byId('copy').addEventListener('click', async () => {
  const idea = currentIdea;
  const value = location.href;
  try {
    await navigator.clipboard.writeText(value);
    if (currentIdea === idea) byId('copy-status').textContent = 'Link copied.';
  } catch {
    if (currentIdea !== idea) return;
    const field = byId('copy-fallback');
    field.value = value;
    field.hidden = false;
    field.focus();
    field.select();
    byId('copy-status').textContent = 'Copy the selected link.';
  }
});

renderRoute();
// A browser may restore the search field when returning to the page.
window.addEventListener('pageshow', updateIndex);

// The relief map uses the same coordinates as its HTML topic buttons.
const map = document.querySelector('.map-art');
const mapWidth = 600;
const mapHeight = 300;
const terrain = [
  { width: 91, height: 73, tilt: -0.40 },
  { width: 90, height: 82, tilt: 0.28 },
  { width: 123, height: 69, tilt: -0.43 },
  { width: 107, height: 83, tilt: 0.18 },
  { width: 102, height: 71, tilt: -0.48 }
];

function drawLandform(pen, topic, index) {
  const { width, height, tilt } = terrain[index];
  pen.save();
  pen.translate(mapWidth * topic.x / 100, mapHeight * topic.y / 100);
  pen.rotate(tilt);
  for (let band = 0; band < 10; band++) {
    const radius = 1.20 - band * 0.098;
    pen.beginPath();
    for (let step = 0; step <= 150; step++) {
      const angle = step / 150 * Math.PI * 2;
      const wobble = 1 + 0.10 * Math.sin(3 * angle + index * 0.8 + radius)
        + 0.085 * Math.cos(5 * angle + index - radius) + 0.035 * Math.sin(9 * angle + 2 * index);
      const x = Math.cos(angle) * width * radius * wobble;
      const y = Math.sin(angle) * height * radius * wobble;
      if (step === 0) pen.moveTo(x, y);
      else pen.lineTo(x, y);
    }
    pen.closePath();
    pen.fillStyle = topic.colour;
    pen.globalAlpha = band === 0 ? 0.25 : 0.045;
    pen.fill();
    const majorContour = band % 3 === 0;
    pen.strokeStyle = majorContour ? '#607363' : '#83907b';
    pen.globalAlpha = majorContour ? 0.72 : 0.63;
    pen.lineWidth = majorContour ? 0.90 : 0.65;
    pen.stroke();
  }
  pen.restore();
}

function drawMap() {
  const bounds = map.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  map.width = Math.round(bounds.width * ratio);
  map.height = Math.round(bounds.height * ratio);
  const pen = map.getContext('2d');
  if (!pen) return;
  pen.scale(map.width / mapWidth, map.height / mapHeight);
  pen.fillStyle = '#e9efdf';
  pen.fillRect(0, 0, mapWidth, mapHeight);
  topics.forEach((topic, index) => drawLandform(pen, topic, index));

  pen.lineWidth = 0.6;
  pen.strokeStyle = '#526b612b';
  pen.setLineDash([2, 4]);
  pen.beginPath();
  for (let x = 20; x < mapWidth; x += 40) {
    pen.moveTo(x, 0);
    pen.lineTo(x, mapHeight);
  }
  for (let y = 20; y < mapHeight; y += 40) {
    pen.moveTo(0, y);
    pen.lineTo(mapWidth, y);
  }
  pen.stroke();

  // Keep the paper grain in the same places when the canvas resizes.
  let seed = 49;
  function randomFraction() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  pen.fillStyle = '#61745b63';
  for (let speck = 0; speck < 1300; speck++) {
    pen.fillRect(randomFraction() * mapWidth, randomFraction() * mapHeight, 0.7, 0.7);
  }

  pen.lineWidth = 1.45;
  pen.strokeStyle = '#664d3fbb';
  pen.setLineDash([3, 4]);
  pen.beginPath();
  pen.moveTo(108, 114);
  pen.bezierCurveTo(162, 154, 195, 37, 276, 66);
  pen.bezierCurveTo(359, 75, 322, 135, 456, 111);
  pen.bezierCurveTo(465, 176, 294, 144, 246, 222);
  pen.bezierCurveTo(327, 291, 356, 210, 468, 237);
  pen.stroke();
  pen.setLineDash([]);

  // Compass and scale marks along the frame.
  pen.lineWidth = 1;
  pen.strokeStyle = pen.fillStyle = '#354c47';
  pen.beginPath();
  pen.arc(568, 29, 11.5, 0, Math.PI * 2);
  pen.stroke();
  pen.beginPath();
  pen.moveTo(568, 11);
  pen.lineTo(571.5, 31);
  pen.lineTo(564.5, 31);
  pen.closePath();
  pen.fill();
  pen.beginPath();
  pen.moveTo(568, 47);
  pen.lineTo(571.5, 28);
  pen.lineTo(564.5, 28);
  pen.closePath();
  pen.stroke();
  pen.strokeStyle = '#708577';
  pen.lineWidth = 0.7;
  pen.beginPath();
  for (let x = 12; x < mapWidth; x += 12) {
    const length = x % 60 === 0 ? 6 : 2.5;
    pen.moveTo(x, 0);
    pen.lineTo(x, length);
    pen.moveTo(x, mapHeight);
    pen.lineTo(x, mapHeight - length);
  }
  pen.stroke();
}
new ResizeObserver(drawMap).observe(map);
