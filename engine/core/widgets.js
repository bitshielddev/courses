// Interactive figures used inside lessons: memory diagrams, step-through
// traces, the declaration reader, and a few small labs.
window.CWidgets = (() => {
  'use strict';

  const { element, inline, prose, icon, button, codeView } = window.CUI;
  const hex = value => `0x${value.toString(16)}`;

  function figure(className, title, kicker) {
    const node = element('figure', `figure ${className}`);
    if (title) {
      const caption = element('figcaption', 'figure-title');
      if (kicker) caption.append(element('span', 'figure-kicker', kicker));
      caption.append(inline(element('span'), title));
      node.append(caption);
    }
    return node;
  }

  /* ---------- Memory model shared by diagrams and traces ---------- */

  // A Rust page draws memory as a 64-bit machine has it: the Playground's, and the learner's own.
  const rust = document.body.dataset.language === 'rust';

  function rustSize(type) {
    if (/^(?:u8|i8|bool)$/.test(type)) return 1;
    if (/^(?:u16|i16)$/.test(type)) return 2;
    if (/^(?:u32|i32|f32|char)$/.test(type)) return 4;
    if (/^(?:u128|i128)$/.test(type)) return 16;
    return 8;
  }

  // The words a Rust value with a heap buffer or a length keeps in its own storage.
  function rustFields(type) {
    if (/^(?:String|Vec<.*>)$/.test(type)) return [['ptr', 'pointer'], ['len', 'usize'], ['cap', 'usize']];
    if (/^&(?:'\w+ )?(?:mut )?(?:str|\[.*\])$/.test(type)) return [['ptr', 'pointer'], ['len', 'usize']];
    return null;
  }

  function sizeOf(type) {
    if (rust) return rustSize(type);
    if (/\*\s*$/.test(type) || type.includes('(*')) return 4;
    if (/\bchar\b/.test(type)) return 1;
    if (/\bshort\b/.test(type)) return 2;
    if (/\b(double|long long|u?int64_t)\b/.test(type)) return 8;
    return 4;
  }

  function buildModel(vars) {
    const frames = [];
    const cells = new Map();
    const groups = new Map();
    let stackFrames = 0;

    function frameFor(id) {
      let frame = frames.find(item => item.id === id);
      if (frame) return frame;
      if (id === 'heap') frame = { id, label: 'Heap', next: 0x3000, kind: 'heap' };
      else if (id === 'static') frame = { id, label: 'Static storage', next: 0x1000, kind: 'static' };
      else frame = { id, label: `Stack frame: ${id}()`, next: 0x7fe0 - (rust ? 0x100 : 0x40) * stackFrames++, kind: 'stack' };
      frame.groups = [];
      frames.push(frame);
      return frame;
    }

    for (const given of vars) {
      // On a Rust page a String, a Vec or a slice reference gets its pointer, length and capacity without being asked.
      const spec = rust && !given.len && !given.fields && rustFields(given.type) ? { ...given, fields: rustFields(given.type) } : given;
      const frame = frameFor(spec.frame || 'main');
      const name = spec.name ?? spec.id;
      const group = { id: spec.id, name, type: spec.type, frame, cells: [], compound: Boolean(spec.len || spec.fields) };
      const parts = spec.len
        ? Array.from({ length: spec.len }, (_, index) => ({ id: `${spec.id}[${index}]`, label: /\s/.test(name) ? `[${index}]` : `${name}[${index}]`, type: spec.type }))
        : spec.fields
          ? spec.fields.map(([field, type]) => ({ id: `${spec.id}.${field}`, label: `.${field}`, type }))
          : [{ id: spec.id, label: name, type: spec.type }];
      const align = Math.max(...parts.map(part => sizeOf(part.type)));
      const boundary = frame.kind === 'heap' ? 16 : align;
      let address = spec.addr ?? Math.ceil(frame.next / boundary) * boundary;
      group.address = address;
      for (const part of parts) {
        const size = sizeOf(part.type);
        address = Math.ceil(address / size) * size;
        const cell = { ...part, address, group };
        address += size;
        group.cells.push(cell);
        cells.set(cell.id, cell);
      }
      if (spec.len && spec.past) {
        const cell = { id: `${spec.id}[${spec.len}]`, label: 'one past the end', type: '', address, group, ghost: true };
        group.cells.push(cell);
        cells.set(cell.id, cell);
      }
      if (spec.len) group.typeLabel = `${spec.type}[${spec.len}]`;
      frame.next = address;
      frame.groups.push(group);
      groups.set(group.id, group);
    }
    return { frames, cells, groups };
  }

  // Applies steps[0..upTo] and returns what memory looks like afterwards.
  function stateAt(model, steps, upTo) {
    const values = new Map();
    const visible = new Set();
    const dead = new Set();
    // Rust: variables whose value has been moved out. Their storage is still there; using it is an error.
    const moved = new Set();
    let changed = new Set();

    const cellsOf = id => model.groups.has(id) ? model.groups.get(id).cells : [model.cells.get(id)];
    function assign(id, value) {
      const group = model.groups.get(id);
      if (group && group.compound) {
        const entries = Array.isArray(value)
          ? value.map((item, index) => [`${id}[${index}]`, item])
          : Object.entries(value).map(([field, item]) => [`${id}.${field}`, item]);
        entries.forEach(([cell, item]) => assign(cell, item));
        return;
      }
      const cell = model.cells.get(id);
      if (!cell) throw new Error(`Unknown memory cell “${id}” in a trace.`);
      values.set(id, value);
      changed.add(id);
      moved.delete(id);
      cell.group.cells.forEach(item => visible.add(item.id));
    }

    for (let index = 0; index <= upTo; index++) {
      const step = steps[index];
      changed = new Set();
      for (const id of step.show || []) {
        cellsOf(id).forEach(cell => {
          visible.add(cell.id);
          changed.add(cell.id);
        });
      }
      for (const [id, value] of Object.entries(step.set || {})) assign(id, value);
      for (const id of step.dead || []) {
        cellsOf(id).forEach(cell => {
          dead.add(cell.id);
          changed.add(cell.id);
        });
      }
      for (const id of step.moved || []) {
        cellsOf(id).forEach(cell => {
          moved.add(cell.id);
          changed.add(cell.id);
        });
      }
      for (const id of step.hide || []) {
        const frame = model.frames.find(item => `frame:${item.id}` === id);
        const targets = frame ? frame.groups.flatMap(group => group.cells) : cellsOf(id);
        targets.forEach(cell => {
          visible.delete(cell.id);
          values.delete(cell.id);
          dead.delete(cell.id);
          moved.delete(cell.id);
        });
      }
    }
    return { values, visible, dead, moved, changed };
  }

  function describeValue(model, state, value) {
    if (value === undefined || value === '?') return { text: '?', kind: 'unknown', title: 'Indeterminate: never assigned' };
    if (typeof value === 'string' && value.startsWith('&')) {
      const id = value.slice(1);
      const target = model.cells.get(id) ?? model.groups.get(id)?.cells[0];
      if (!target) throw new Error(`Unknown pointer target “${value}” in a trace.`);
      const gone = !state.visible.has(target.id);
      const freed = state.dead.has(target.id);
      return {
        text: hex(target.address),
        kind: gone || freed ? 'dangling' : 'pointer',
        target: gone ? null : target.id,
        title: gone ? 'Dangling: the object it pointed to no longer exists'
          : freed ? 'Dangling: this storage has been freed'
            : `Holds the address of ${target.ghost ? 'the position one past the end' : id}`,
      };
    }
    if (value === 'NULL') return { text: 'NULL', kind: 'null', title: 'The null pointer: points at nothing' };
    return { text: String(value), kind: 'value' };
  }

  function renderMemory(model, state) {
    const root = element('div', 'mem');
    const frames = element('div', 'mem-frames');
    const pointers = [];
    for (const frame of model.frames) {
      const groups = frame.groups.filter(group => group.cells.some(cell => state.visible.has(cell.id)));
      if (!groups.length) continue;
      const section = element('section', `mem-frame is-${frame.kind}`);
      section.append(element('h4', 'mem-frame-label', frame.label));
      for (const group of groups) {
        const box = element('div', 'mem-group');
        if (group.compound) {
          box.classList.add('is-compound');
          const head = element('div', 'mem-group-head');
          head.append(element('span', 'mem-name', group.name), element('span', 'mem-type', group.typeLabel || group.type));
          box.append(head);
        }
        for (const cell of group.cells) {
          const row = element('div', 'mem-cell');
          row.dataset.cell = cell.id;
          row.append(element('span', 'mem-addr', hex(cell.address)));
          const label = element('span', 'mem-label');
          label.append(element('span', 'mem-name', cell.label));
          if (cell.type && !(group.compound && !cell.label.startsWith('.'))) label.append(element('span', 'mem-type', cell.type));
          row.append(label);
          if (cell.ghost) {
            row.classList.add('is-ghost');
            row.append(element('span', 'mem-value', 'not an element'));
          } else {
            const shown = describeValue(model, state, state.values.get(cell.id));
            const gone = state.moved.has(cell.id);
            const value = element('span', `mem-value is-${gone ? 'moved' : shown.kind}`, shown.text);
            if (shown.title) value.title = shown.title;
            if (gone) value.append(element('span', 'mem-flag', 'moved'));
            else if (shown.kind === 'dangling') value.append(element('span', 'mem-flag', 'dangling'));
            row.append(value);
            // A reference borrows what it points at; anything else that holds an address owns it.
            const borrowed = /^&/.test(group.type || '') || /^&/.test(cell.type || '');
            if (shown.target && !gone) pointers.push({ from: cell.id, to: shown.target, dangling: shown.kind === 'dangling', borrowed });
          }
          if (state.moved.has(cell.id)) {
            row.classList.add('is-moved');
            row.title = 'Moved: the value now belongs to another owner, and this variable cannot be used';
          }
          if (state.dead.has(cell.id)) {
            row.classList.add('is-dead');
            row.title = 'Freed: this storage no longer belongs to the program';
          }
          if (state.changed.has(cell.id)) row.classList.add('is-changed');
          box.append(row);
        }
        section.append(box);
      }
      frames.append(section);
    }
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'mem-arrows');
    svg.setAttribute('aria-hidden', 'true');
    root.append(frames, svg);

    function drawArrows() {
      const bounds = root.getBoundingClientRect();
      if (!bounds.width) return;
      svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
      svg.replaceChildren();
      const lanes = new Map();
      pointers.forEach((pointer, index) => {
        const from = root.querySelector(`[data-cell="${CSS.escape(pointer.from)}"] .mem-value`);
        const to = root.querySelector(`[data-cell="${CSS.escape(pointer.to)}"]`);
        if (!from || !to) return;
        const a = from.getBoundingClientRect();
        const b = to.getBoundingClientRect();
        const x = a.right - bounds.left;
        const y1 = a.top + a.height / 2 - bounds.top;
        const used = lanes.get(pointer.to) || 0;
        lanes.set(pointer.to, used + 1);
        const y2 = b.top + b.height / 2 - bounds.top + (used ? 5 * used : 0);
        const x2 = b.right - bounds.left;
        const self = pointer.from === pointer.to;
        const reach = self ? 16 : 14 + Math.min(26, Math.abs(y2 - y1) / 5) + 6 * (index % 3);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M ${x} ${y1} C ${x + reach} ${y1}, ${x2 + reach} ${y2}, ${x2 + 5} ${y2}`);
        path.setAttribute('class', `mem-arrow${pointer.dangling ? ' is-dangling' : pointer.borrowed ? ' is-borrowed' : ''}`);
        const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        head.setAttribute('d', `M ${x2 + 1} ${y2} l 7 -4 v 8 Z`);
        head.setAttribute('class', `mem-arrow-head${pointer.dangling ? ' is-dangling' : ''}`);
        svg.append(path, head);
      });
    }

    return { node: root, drawArrows, pointers };
  }

  function watchLayout(host, draw) {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(host);
    schedule();
    return schedule;
  }

  function memory(spec) {
    const node = figure('figure-memory', spec.title, 'Memory');
    const model = buildModel(spec.vars);
    const state = stateAt(model, [{ set: spec.set, show: spec.show, dead: spec.dead, moved: spec.moved }], 0);
    state.changed = new Set();
    const view = renderMemory(model, state);
    node.append(view.node);
    if (spec.caption) node.append(prose('p', 'figure-caption', spec.caption));
    watchLayout(node, view.drawArrows);
    return node;
  }

  function trace(spec) {
    const node = figure('figure-trace', spec.title, 'Step through');
    node.tabIndex = 0;
    const model = buildModel(spec.vars);
    const body = element('div', 'trace-body');
    const code = codeView(spec.code, { numbered: true });
    code.classList.add('trace-code');
    const memoryHost = element('div', 'trace-memory');
    body.append(code, memoryHost);
    const note = element('p', 'trace-note');
    note.setAttribute('role', 'status');
    const counter = element('span', 'trace-counter');
    const back = button('Back', 'secondary', () => go(position - 1), 'back');
    const next = button('Next', 'primary', () => go(position + 1), 'arrow', 'end');
    const restart = button('Restart', 'quiet', () => go(0), 'reset');
    const controls = element('div', 'trace-controls');
    controls.append(back, next, counter, restart);
    const footer = element('div', 'trace-footer');
    footer.append(note, controls);
    node.append(body, footer);
    let position = 0;
    let view;
    const redraw = watchLayout(node, () => view?.drawArrows());

    function go(target) {
      position = Math.max(0, Math.min(spec.steps.length - 1, target));
      const step = spec.steps[position];
      view = renderMemory(model, stateAt(model, spec.steps, position));
      memoryHost.replaceChildren(view.node);
      if (!view.node.querySelector('.mem-cell')) {
        memoryHost.append(element('p', 'trace-empty', 'No objects exist yet.'));
      }
      const lines = [].concat(step.line ?? []);
      code.rows.forEach((row, index) => row.classList.toggle('is-current', lines.includes(index + 1)));
      const current = code.rows[lines[0] - 1];
      if (current && code.scrollHeight > code.clientHeight) {
        code.scrollTop = Math.max(0, current.offsetTop - code.clientHeight / 2);
      }
      note.replaceChildren();
      inline(note, step.say);
      counter.textContent = `Step ${position + 1} of ${spec.steps.length}`;
      back.disabled = position === 0;
      next.disabled = position === spec.steps.length - 1;
      restart.disabled = position === 0;
      redraw();
    }

    node.addEventListener('keydown', event => {
      if (event.target.closest('button')) return;
      if (event.key === 'ArrowRight') go(position + 1);
      else if (event.key === 'ArrowLeft') go(position - 1);
      else return;
      event.preventDefault();
    });
    go(0);
    return node;
  }

  /* ---------- How long each borrow lasts ---------- */

  // Numbered code with one bar per variable or reference, covering the lines on which it is in
  // use. Each span is { name, kind, from, to }: kind is 'owner' (the value is alive), 'shared'
  // (a & borrow), 'mut' (a &mut borrow) or 'moved' (the variable can no longer be used).
  // marks: [{ line, label, ok? }] point at a line: where two bars conflict, or where they do not.
  function borrows(spec) {
    const words = { owner: 'owns the value', shared: 'shared borrow', mut: 'mutable borrow', moved: 'moved, unusable' };
    const node = figure('figure-borrows', spec.title, spec.kicker || 'Borrows');
    const body = element('div', 'borrows-body');
    const code = codeView(spec.code, { numbered: true });
    code.classList.add('trace-code', 'borrows-code');
    const lanes = element('div', 'borrows-lanes');
    lanes.setAttribute('role', 'list');
    const bars = spec.spans.map(span => {
      const lane = element('div', 'borrow-lane');
      lane.setAttribute('role', 'listitem');
      const kind = words[span.kind] ? span.kind : 'shared';
      const to = span.to ?? span.from;
      lane.setAttribute('aria-label', `${span.name}: ${words[kind]}, ${span.from === to ? `line ${span.from}` : `lines ${span.from} to ${to}`}`);
      const name = element('span', 'borrow-name', span.name);
      const track = element('div', 'borrow-track');
      const bar = element('span', `borrow-bar is-${kind}`);
      bar.title = lane.getAttribute('aria-label');
      track.append(bar);
      lane.append(name, track);
      lanes.append(lane);
      return { from: span.from, to, bar, track };
    });
    body.append(code, lanes);
    node.append(body);
    for (const mark of spec.marks || []) code.rows[mark.line - 1]?.classList.add(mark.ok ? 'is-fine' : 'is-conflict');

    const kinds = [...new Set(spec.spans.map(span => (words[span.kind] ? span.kind : 'shared')))];
    const legend = element('p', 'borrows-legend');
    for (const kind of kinds) {
      const entry = element('span', 'borrows-key');
      entry.append(element('span', `borrow-bar is-${kind}`), document.createTextNode(words[kind]));
      legend.append(entry);
    }
    node.append(legend);
    if (spec.marks?.length) {
      const notes = element('ul', 'borrows-notes');
      for (const mark of spec.marks) {
        const item = element('li', mark.ok ? 'is-fine' : 'is-conflict');
        item.append(element('span', 'borrows-line', `Line ${mark.line}`));
        inline(item, ` ${mark.label}`);
        notes.append(item);
      }
      node.append(notes);
    }
    if (spec.caption) node.append(prose('p', 'figure-caption', spec.caption));

    // The bars are placed against the code's own rows, so they stay aligned at any width.
    watchLayout(node, () => {
      for (const { from, to, bar, track } of bars) {
        const first = code.rows[from - 1];
        const last = code.rows[to - 1];
        if (!first || !last) continue;
        const origin = track.getBoundingClientRect().top;
        const top = first.getBoundingClientRect().top - origin;
        bar.style.top = `${top + 3}px`;
        bar.style.height = `${Math.max(6, last.getBoundingClientRect().bottom - first.getBoundingClientRect().top - 6)}px`;
      }
    });
    return node;
  }

  /* ---------- A row of adjacent elements (arrays and strings) ---------- */

  function stripCells(cells, { start = 0, ghost = false, address } = {}) {
    const row = element('div', 'strip-row');
    const total = cells.length + (ghost ? 1 : 0);
    row.style.setProperty('--cells', total);
    const nodes = [];
    for (let index = 0; index < total; index++) {
      const past = index >= cells.length;
      const cell = element('div', `strip-cell${past ? ' is-ghost' : ''}`);
      const value = past ? '' : cells[index];
      const box = element('span', 'strip-value', value === null ? '?' : String(value));
      if (value === null) box.classList.add('is-unknown');
      cell.append(box, element('span', 'strip-index', past ? 'end' : String(start + index)));
      if (address) cell.append(element('span', 'strip-address', hex(address.base + address.step * index)));
      row.append(cell);
      nodes.push(cell);
    }
    return { row, nodes };
  }

  function strip(spec) {
    const node = figure('figure-strip', spec.title, spec.kicker || 'Layout');
    const wrap = element('div', 'strip');
    if (spec.marks?.length) {
      const marks = element('div', 'strip-marks');
      marks.style.setProperty('--cells', spec.cells.length + (spec.ghost ? 1 : 0));
      for (const mark of spec.marks) {
        const label = prose('span', 'strip-mark', mark.label);
        label.style.gridColumn = `${mark.at + 1} / span ${mark.span || 1}`;
        marks.append(label);
      }
      wrap.append(marks);
    }
    const { row, nodes } = stripCells(spec.cells, spec);
    for (const index of spec.dim || []) nodes[index]?.classList.add('is-dim');
    for (const index of spec.accent || []) nodes[index]?.classList.add('is-active');
    wrap.append(row);
    node.append(wrap);
    if (spec.caption) node.append(prose('p', 'figure-caption', spec.caption));
    return node;
  }

  /* ---------- Pointer arithmetic lab ---------- */

  function pointerLab() {
    const values = [12, 24, 36, 48];
    const base = 0x1000;
    let position = 0;
    const node = figure('figure-lab', 'Move `p` across `int a[4]`', 'Try it');
    node.append(prose('p', 'figure-caption', 'Each `int` is four bytes here, so every step of one element changes the address by four.'));
    const wrap = element('div', 'strip');
    const marks = element('div', 'strip-marks');
    marks.style.setProperty('--cells', values.length + 1);
    const marker = element('span', 'strip-mark is-pointer', 'p');
    marks.append(marker);
    const { row, nodes } = stripCells(values, { ghost: true, address: { base, step: 4 } });
    wrap.append(marks, row);
    const controls = element('div', 'lab-controls');
    const back = button('--p', 'secondary', () => move(position - 1));
    const forward = button('++p', 'secondary', () => move(position + 1));
    const home = button('p = a', 'quiet', () => move(0));
    const end = button('p = a + 4', 'quiet', () => move(values.length));
    controls.append(back, forward, home, end);
    const readout = element('dl', 'lab-readout');
    const status = element('p', 'lab-status');
    status.setAttribute('role', 'status');
    node.append(wrap, controls, readout, status);

    function entry(term, value, state) {
      const item = element('div', `lab-entry${state ? ` is-${state}` : ''}`);
      item.append(element('dt', '', term), element('dd', '', value));
      return item;
    }

    function move(target) {
      position = Math.max(0, Math.min(values.length, target));
      const past = position === values.length;
      marker.style.gridColumn = `${position + 1}`;
      nodes.forEach((cell, index) => cell.classList.toggle('is-active', index === position));
      back.disabled = position === 0;
      forward.disabled = past;
      readout.replaceChildren(
        entry('p', `a + ${position}`),
        entry('address', hex(base + 4 * position)),
        entry('p - a', String(position)),
        entry('*p', past ? 'undefined behavior' : String(values[position]), past ? 'error' : ''),
        entry('p[-1]', position === 0 ? 'undefined behavior' : String(values[position - 1]), position === 0 ? 'error' : ''),
      );
      status.replaceChildren();
      inline(status, past
        ? '`p` is one past the end. You may hold it, compare it, and subtract with it. You may not dereference it.'
        : position === 0
          ? '`p` points at the first element. Stepping back from here would leave the array, which is undefined even without a dereference.'
          : `\`p\` points at \`a[${position}]\`. \`*p\`, \`p[0]\` and \`a[${position}]\` all name the same \`int\`.`);
    }

    move(0);
    return node;
  }

  /* ---------- Eight bits, two readings ---------- */

  function bits() {
    let value = 250;
    const node = figure('figure-lab', 'One byte, two interpretations', 'Try it');
    const [unsignedName, signedName] = rust ? ['u8', 'i8'] : ['uint8_t', 'int8_t'];
    node.append(prose('p', 'figure-caption', `Click a bit to flip it, or step the value. The same eight bits are read as \`${unsignedName}\` and as \`${signedName}\`.`));
    const row = element('div', 'bit-row');
    const cells = Array.from({ length: 8 }, (_, index) => {
      const bit = 7 - index;
      const cell = element('button', 'bit-cell');
      cell.type = 'button';
      cell.append(element('span', 'bit-value'), element('span', 'bit-weight', String(2 ** bit)));
      cell.addEventListener('click', () => update(value ^ (1 << bit)));
      row.append(cell);
      return cell;
    });
    const controls = element('div', 'lab-controls');
    controls.append(
      button('− 1', 'secondary', () => update(value - 1, 'minus')),
      button('+ 1', 'secondary', () => update(value + 1, 'plus')),
      button('Set 255', 'quiet', () => update(255)),
      button('Set 127', 'quiet', () => update(127)),
    );
    const readout = element('dl', 'lab-readout');
    const status = element('p', 'lab-status');
    status.setAttribute('role', 'status');
    node.append(row, controls, readout, status);

    function update(next, action) {
      const wrapped = ((next % 256) + 256) % 256;
      const signed = wrapped > 127 ? wrapped - 256 : wrapped;
      let message = 'The bits do not record which reading is intended. The type of the expression decides.';
      if (rust && action === 'plus' && next === 256) message = 'Eight bits cannot hold 256, so the bits wrap to 0. Rust does not let that pass silently: `255u8 + 1` panics in a debug build, and `wrapping_add` asks for the wrap.';
      else if (rust && action === 'minus' && next === -1) message = 'The bits wrap from 0 to 255. In Rust `0u8 - 1` panics in a debug build. This is why a `usize` index that counts down past zero needs care.';
      else if (action === 'plus' && next === 256) message = '`uint8_t` arithmetic wraps: 255 + 1 gives 0. Unsigned wraparound is defined behavior.';
      else if (action === 'minus' && next === -1) message = '`uint8_t` arithmetic wraps: 0 − 1 gives 255. This is how `size_t` loops that count down below zero go wrong.';
      else if (action === 'plus' && wrapped === 128) message = `The top bit is now set. Read as \`${signedName}\`, the value jumped from 127 to −128.`;
      value = wrapped;
      cells.forEach((cell, index) => {
        const on = Boolean(value & (1 << (7 - index)));
        cell.classList.toggle('is-on', on);
        cell.firstChild.textContent = on ? '1' : '0';
        cell.setAttribute('aria-label', `Bit worth ${2 ** (7 - index)}: ${on ? 'on' : 'off'}`);
        cell.setAttribute('aria-pressed', String(on));
      });
      const item = (term, text) => {
        const wrap = element('div', 'lab-entry');
        wrap.append(element('dt', '', term), element('dd', '', text));
        return wrap;
      };
      readout.replaceChildren(
        item(unsignedName, String(value)),
        item(signedName, String(signed)),
        item('hex', `0x${value.toString(16).padStart(2, '0')}`),
        item('binary', value.toString(2).padStart(8, '0')),
      );
      status.replaceChildren();
      inline(status, message);
    }

    update(value);
    return node;
  }

  /* ---------- Struct layout and padding ---------- */

  function structLayout(spec) {
    const types = { char: 1, short: 2, int: 4, float: 4, double: 8 };
    const original = spec.members || [['tag', 'char'], ['value', 'double'], ['flag', 'char'], ['count', 'int']];
    let members = original.map(member => [...member]);
    const node = figure('figure-lab', 'Member order changes the size', 'Try it');
    node.append(prose('p', 'figure-caption', 'Each member must start at a multiple of its own size. Reorder the members and watch the padding move.'));
    const layout = element('div', 'layout-lab');
    const list = element('ol', 'layout-members');
    const grid = element('div', 'layout-grid');
    const summary = element('p', 'lab-status');
    summary.setAttribute('role', 'status');
    const controls = element('div', 'lab-controls');
    controls.append(
      button('Largest first', 'secondary', () => {
        members = [...members].sort((a, b) => types[b[1]] - types[a[1]]);
        render();
      }),
      button('Reset order', 'quiet', () => {
        members = original.map(member => [...member]);
        render();
      }, 'reset'),
    );
    layout.append(list, grid);
    node.append(layout, controls, summary);

    function render() {
      let offset = 0;
      const bytes = [];
      const placed = members.map(([name, type], index) => {
        const size = types[type];
        while (offset % size) bytes[offset++] = null;
        const start = offset;
        for (let count = 0; count < size; count++) bytes[offset++] = index;
        return { name, type, start, size };
      });
      const align = Math.max(...members.map(([, type]) => types[type]));
      while (offset % align) bytes[offset++] = null;
      const padding = bytes.filter(owner => owner === null).length;

      list.replaceChildren(...placed.map((member, index) => {
        const item = element('li', `layout-member tone-${index % 5}`);
        const text = element('span', 'layout-member-text');
        text.append(element('code', '', `${member.type} ${member.name};`), element('span', 'layout-offset', `offset ${member.start}`));
        const up = button('Up', 'quiet', () => swap(index, index - 1));
        const down = button('Down', 'quiet', () => swap(index, index + 1));
        up.setAttribute('aria-label', `Move ${member.name} up`);
        down.setAttribute('aria-label', `Move ${member.name} down`);
        up.disabled = index === 0;
        down.disabled = index === placed.length - 1;
        item.append(text, up, down);
        return item;
      }));
      grid.replaceChildren(...bytes.map((owner, index) => {
        const cell = element('span', owner === null ? 'layout-byte is-padding' : `layout-byte tone-${owner % 5}`);
        const first = owner !== null && placed[owner].start === index;
        cell.textContent = first ? placed[owner].name : '';
        cell.title = owner === null ? `Byte ${index}: padding` : `Byte ${index}: ${placed[owner].name}`;
        return cell;
      }));
      summary.replaceChildren();
      inline(summary, `\`sizeof(struct Record)\` is **${offset} bytes**: ${offset - padding} of data and ${padding} of padding.`
        + (padding > align - 1 ? ' Try putting the largest members first.' : ' This is as tight as these members can be packed.'));
    }

    function swap(a, b) {
      [members[a], members[b]] = [members[b], members[a]];
      render();
      list.querySelectorAll('.layout-member')[b]?.querySelector('button:not(:disabled)')?.focus();
    }

    render();
    return node;
  }

  /* ---------- Declaration reader ---------- */

  const qualifiers = new Set(['const', 'volatile', 'restrict']);
  const storage = new Set(['static', 'extern', 'register', 'typedef', 'auto', 'inline']);
  const typeWords = new Set(['void', 'char', 'short', 'int', 'long', 'float', 'double', 'signed', 'unsigned', '_Bool', 'bool']);
  const tagWords = new Set(['struct', 'union', 'enum']);
  const knownTypes = new Set([
    'size_t', 'ptrdiff_t', 'intptr_t', 'uintptr_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t',
    'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'FILE', 'va_list', 'wchar_t',
  ]);
  const isName = token => token !== undefined && /^[A-Za-z_]\w*$/.test(token);
  const isReserved = token => qualifiers.has(token) || storage.has(token) || typeWords.has(token) || tagWords.has(token);

  function parseDeclaration(text) {
    const tokens = text.trim().replace(/;\s*$/, '').match(/\.\.\.|[A-Za-z_]\w*|\d+|\S/g) || [];
    let position = 0;
    const peek = (offset = 0) => tokens[position + offset];
    const take = () => tokens[position++];
    const fail = message => { throw new Error(message); };
    const expect = token => {
      if (peek() !== token) fail(peek() === undefined ? `The declaration ends before the closing “${token}”.` : `Expected “${token}” but found “${peek()}”.`);
      position++;
    };
    const startsType = (token, after) => isReserved(token) || knownTypes.has(token) || (isName(token) && (isName(after) || after === '*'));

    function specifiers() {
      const quals = [];
      const words = [];
      let named = false;
      for (;;) {
        const token = peek();
        if (qualifiers.has(token)) quals.push(take());
        else if (storage.has(token)) take();
        else if (typeWords.has(token)) {
          words.push(take());
          named = true;
        } else if (tagWords.has(token)) {
          const kind = take();
          if (!isName(peek()) || isReserved(peek())) fail(`“${kind}” needs a tag name after it.`);
          words.push(`${kind} ${take()}`);
          named = true;
        } else if (!named && isName(token)) {
          words.push(take());
          named = true;
        } else break;
      }
      if (!named) fail('Start with a type, such as “int” or “const char”.');
      return [...new Set(quals), ...words].join(' ');
    }

    function declarator(abstract) {
      const pointers = [];
      while (peek() === '*') {
        take();
        const quals = [];
        while (qualifiers.has(peek())) quals.push(take());
        pointers.push(quals);
      }
      const direct = directDeclarator(abstract);
      return {
        name: direct.name,
        apply: base => direct.apply(pointers.reduce((to, quals) => ({ kind: 'pointer', quals, to }), base)),
      };
    }

    function directDeclarator(abstract) {
      let name = null;
      let inner = null;
      const parameterList = abstract && (peek(1) === ')' || peek(1) === '...' || startsType(peek(1), peek(2)));
      if (peek() === '(' && !parameterList) {
        take();
        inner = declarator(abstract);
        expect(')');
        name = inner.name;
      } else if (isName(peek()) && !isReserved(peek())) {
        name = take();
      } else if (!abstract) {
        fail(peek() === undefined ? 'Add the name being declared.' : `Expected a name but found “${peek()}”.`);
      }
      const suffixes = [];
      for (;;) {
        if (peek() === '[') {
          take();
          const size = [];
          while (peek() !== ']') {
            if (peek() === undefined) fail('An array suffix is missing its “]”.');
            size.push(take());
          }
          take();
          suffixes.push({ kind: 'array', size: size.join(' ') });
        } else if (peek() === '(') {
          take();
          suffixes.push({ kind: 'function', ...parameters() });
        } else break;
      }
      return {
        name,
        apply(base) {
          const type = suffixes.reduceRight((inside, suffix) => suffix.kind === 'array'
            ? { kind: 'array', size: suffix.size, of: inside }
            : { kind: 'function', params: suffix.params, variadic: suffix.variadic, returns: inside }, base);
          return inner ? inner.apply(type) : type;
        },
      };
    }

    function parameters() {
      if (peek() === ')') {
        take();
        return { params: null, variadic: false };
      }
      if (peek() === 'void' && peek(1) === ')') {
        position += 2;
        return { params: [], variadic: false };
      }
      const params = [];
      for (;;) {
        if (peek() === '...') {
          take();
          expect(')');
          return { params, variadic: true };
        }
        const base = specifiers();
        params.push(declarator(true).apply({ kind: 'base', text: base }));
        if (peek() === ',') {
          take();
          continue;
        }
        expect(')');
        return { params, variadic: false };
      }
    }

    const base = specifiers();
    const parsed = declarator(false);
    if (peek() !== undefined) fail(`Unexpected “${peek()}” after the declaration. Enter one declaration at a time.`);
    const type = parsed.apply({ kind: 'base', text: base });
    validate(type);
    return { name: parsed.name, type };
  }

  function validate(type) {
    if (type.kind === 'function') {
      if (type.returns.kind === 'array') throw new Error('A function cannot return an array. Return a pointer, or wrap the array in a struct.');
      if (type.returns.kind === 'function') throw new Error('A function cannot return a function. Return a pointer to one.');
      (type.params || []).forEach(validate);
      validate(type.returns);
    } else if (type.kind === 'array') {
      if (type.of.kind === 'function') throw new Error('An array cannot hold functions. Use an array of pointers to functions.');
      validate(type.of);
    } else if (type.kind === 'pointer') validate(type.to);
  }

  function plural(text) {
    if (/^(struct|union|enum) /.test(text) || /_t$/.test(text)) return `${text} values`;
    return text === 'void' ? text : `${text}s`;
  }

  function parameterText(type) {
    if (type.params === null) return 'unspecified arguments';
    if (!type.params.length) return 'no arguments';
    return `(${type.params.map(param => phrase(param)).join(', ')}${type.variadic ? ', ...' : ''})`;
  }

  const article = text => (/^[aeiou]/i.test(text) ? 'an' : 'a');

  // A nested type reads better with an article: "pointer to an array of 4 ints".
  function nested(type) {
    const text = phrase(type);
    return type.kind === 'base' ? text : `${article(text)} ${text}`;
  }

  function phrase(type, many = false) {
    if (type.kind === 'base') return many ? plural(type.text) : type.text;
    if (type.kind === 'pointer') {
      return `${type.quals.length ? `${type.quals.join(' ')} ` : ''}${many ? `pointers to ${phrase(type.to)}` : `pointer to ${nested(type.to)}`}`;
    }
    if (type.kind === 'array') return `${many ? 'arrays' : 'array'} of ${type.size ? `${type.size} ` : ''}${phrase(type.of, true)}`;
    return `${many ? 'functions' : 'function'} taking ${parameterText(type)} and returning ${nested(type.returns)}`;
  }

  function describeDeclaration(text) {
    const { name, type } = parseDeclaration(text);
    const description = phrase(type);
    const steps = [{ token: name, text: `${name} is…` }];
    for (let node = type; node; node = node.to || node.of || node.returns) {
      if (node.kind === 'array') steps.push({ token: `[${node.size}]`, text: `an array of ${node.size}…`.replace('of …', 'of…') });
      else if (node.kind === 'pointer') steps.push({ token: `*${node.quals.length ? ` ${node.quals.join(' ')}` : ''}`, text: `${node.quals.length ? `${node.quals.join(' ')} ` : ''}pointer to…` });
      else if (node.kind === 'function') steps.push({ token: '( )', text: `function taking ${parameterText(node)}, returning…` });
      else steps.push({ token: node.text, text: node.text });
    }
    return { name, sentence: `${name} is ${article(description)} ${description}`, steps };
  }

  function cdecl(spec) {
    const examples = spec.examples || [
      'int *p',
      'const char *name',
      'char *const cursor',
      'int *ids[4]',
      'int (*row)[4]',
      'char **argv',
      'int (*compare)(const void *, const void *)',
      'void (*handlers[8])(int)',
      'const char *(*lookup(int code))(void)',
    ];
    const node = figure('figure-lab', 'Declaration reader', 'Try it');
    node.append(prose('p', 'figure-caption', 'Type any declaration, or pick one. The reader starts at the name and works outward: `[]` and `()` on the right bind before `*` on the left.'));
    const form = element('form', 'cdecl-form');
    const input = element('input', 'cdecl-input');
    input.type = 'text';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('aria-label', 'C declaration');
    form.append(input);
    const chips = element('div', 'cdecl-examples');
    for (const example of examples) {
      const chip = element('button', 'cdecl-chip', example);
      chip.type = 'button';
      chip.addEventListener('click', () => {
        input.value = example;
        update();
      });
      chips.append(chip);
    }
    const result = element('div', 'cdecl-result');
    result.setAttribute('role', 'status');
    node.append(form, chips, result);

    function update() {
      result.replaceChildren();
      if (!input.value.trim()) return;
      try {
        const reading = describeDeclaration(input.value);
        result.classList.remove('is-error');
        result.append(element('p', 'cdecl-sentence', `${reading.sentence}.`));
        const list = element('ol', 'cdecl-steps');
        for (const step of reading.steps) {
          const item = element('li', 'cdecl-step');
          item.append(element('code', '', step.token), element('span', '', step.text));
          list.append(item);
        }
        result.append(list);
      } catch (error) {
        result.classList.add('is-error');
        result.append(element('p', 'cdecl-sentence', error.message));
      }
    }

    form.addEventListener('submit', event => event.preventDefault());
    input.addEventListener('input', update);
    input.value = spec.start || examples[3];
    update();
    return node;
  }

  return { memory, trace, strip, borrows, pointerLab, bits, structLayout, cdecl, describeDeclaration, buildModel, stateAt, icon };
})();
