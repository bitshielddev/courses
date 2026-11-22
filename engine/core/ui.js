// Shared DOM helpers, the C syntax highlighter, and the code editor.
window.CUI = (() => {
  'use strict';

  const paths = {
    book: '<path d="M12 5v15M12 5C8 3 5 3 2 4v14c3-1 6-1 10 1 4-2 7-2 10-1V4c-3-1-6-1-10 1Z"/>',
    'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    terminal: '<path d="m4 6 6 6-6 6m9 0h7"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    reset: '<path d="M3 11a9 9 0 1 1 3 8m-3-8V5m0 6h6"/>',
    cross: '<path d="m6 6 12 12M18 6 6 18"/>',
    alert: '<path d="M12 4 2.5 20h19L12 4Zm0 6v4.5m0 2.5v.5"/>',
    swap: '<path d="M4 8h14m-4-4 4 4-4 4M20 16H6m4-4-4 4 4 4"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
    bulb: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-.7.7-1 1.4-1 2H9c0-.6-.3-1.3-1-2Z"/>',
    laptop: '<path d="M5 6h14v10H5zM2 19h20"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.8-4.5 4.2 1.1 6-5.4-3-5.4 3 1.1-6L3.2 9.400l6.1-.8L12 3Z"/>',
    bug: '<path d="M8 8a4 4 0 0 1 8 0v7a4 4 0 0 1-8 0V8Zm0 3H4m4 4H4m16-4h-4m4 4h-4M9 4 7.500 2.500M15 4l1.500-1.500M12 12v7"/>',
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Inline markup: `code` and **strong**. Everything else is literal text.
  function inline(node, text) {
    String(text).split(/`([^`]+)`/).forEach((part, index) => {
      if (!part) return;
      if (index % 2) {
        node.append(element('code', '', part));
        return;
      }
      part.split(/\*\*([^*]+)\*\*/).forEach((piece, position) => {
        if (piece) node.append(position % 2 ? element('strong', '', piece) : document.createTextNode(piece));
      });
    });
    return node;
  }

  function prose(tag, className, text) {
    return inline(element(tag, className), text);
  }

  function icon(name, className = 'button-icon') {
    const wrapper = element('span', className);
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round">${paths[name]}</svg>`;
    return wrapper;
  }

  function button(label, variant, handler, iconName, iconPosition = 'start') {
    const node = element('button', `button button-${variant}`);
    node.type = 'button';
    if (iconName && iconPosition === 'start') node.append(icon(iconName));
    node.append(element('span', 'button-label', label));
    if (iconName && iconPosition === 'end') node.append(icon(iconName));
    if (handler) node.addEventListener('click', handler);
    return node;
  }

  const keywords = [
    'auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern',
    'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return', 'short', 'signed',
    'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while',
    '_Bool', '_Static_assert', '_Generic', '_Alignof', 'bool', 'true', 'false', 'NULL', 'size_t', 'ptrdiff_t',
    'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t', 'uintptr_t',
  ];
  const tokenPattern = new RegExp([
    String.raw`(^[\t ]*#[^\n]*)`,
    String.raw`(\/\/[^\n]*|\/\*[\s\S]*?\*\/)`,
    String.raw`("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')`,
    String.raw`(\b(?:0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)[uUlLfF]*\b)`,
    String.raw`(\b(?:${keywords.join('|')})\b)`,
    String.raw`(\b[A-Za-z_]\w*(?=[\t ]*\())`,
  ].join('|'), 'gm');
  const tokenClasses = ['preprocessor', 'comment', 'string', 'number', 'keyword', 'function'];

  // Calls emit(text, tokenClass) for each run of source text, in order.
  function tokenize(source, emit) {
    let cursor = 0;
    for (const match of source.matchAll(tokenPattern)) {
      if (match.index > cursor) emit(source.slice(cursor, match.index));
      emit(match[0], tokenClasses[match.slice(1).findIndex(value => value !== undefined)]);
      cursor = match.index + match[0].length;
    }
    if (cursor < source.length) emit(source.slice(cursor));
  }

  function codeView(source, { numbered = false, block = false } = {}) {
    const pre = element('pre', numbered || block ? 'code-view' : 'inline-code-block');
    if (numbered) pre.classList.add('has-line-numbers');
    const code = element('code');
    pre.append(code);
    const rows = [];
    let sourceText;

    function startLine() {
      const row = element('span', 'source-line');
      if (numbered) {
        const number = element('span', 'line-number', String(rows.length + 1));
        number.setAttribute('aria-hidden', 'true');
        row.append(number);
      }
      sourceText = element('span', 'source-text');
      row.append(sourceText);
      code.append(row);
      rows.push(row);
    }

    startLine();
    tokenize(source, (fragment, token) => {
      fragment.split('\n').forEach((part, index) => {
        if (index > 0) {
          code.append(document.createTextNode('\n'));
          startLine();
        }
        if (part) sourceText.append(token ? element('span', `token-${token}`, part) : document.createTextNode(part));
      });
    });
    pre.tabIndex = 0;
    pre.rows = rows;
    return pre;
  }

  // A textarea layered over a highlighted copy of its text.
  function createEditor({ value, label, describedBy, onInput, onRun, minRows = 3, maxRows = 30 }) {
    const wrap = element('div', 'editor-wrap');
    const gutter = element('pre', 'editor-gutter');
    gutter.setAttribute('aria-hidden', 'true');
    const surface = element('div', 'editor-surface');
    const highlight = element('pre', 'editor-highlight');
    highlight.setAttribute('aria-hidden', 'true');
    const input = element('textarea', 'editor-input');
    input.setAttribute('aria-label', label);
    if (describedBy) input.setAttribute('aria-describedby', describedBy);
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.spellcheck = false;
    input.wrap = 'off';
    input.value = value;
    surface.append(highlight, input);
    wrap.append(gutter, surface);
    let releaseTab = false;

    function sync() {
      highlight.scrollTop = input.scrollTop;
      highlight.scrollLeft = input.scrollLeft;
      gutter.scrollTop = input.scrollTop;
    }

    function refresh() {
      const text = input.value;
      highlight.replaceChildren();
      tokenize(text, (fragment, token) => {
        highlight.append(token ? element('span', `token-${token}`, fragment) : document.createTextNode(fragment));
      });
      highlight.append(document.createTextNode('\n'));
      const lines = text.split('\n').length;
      gutter.textContent = Array.from({ length: lines }, (_, index) => index + 1).join('\n');
      wrap.style.setProperty('--rows', Math.min(Math.max(lines, minRows), maxRows));
      sync();
    }

    function replace(start, end, text, selectStart, selectEnd) {
      input.focus();
      input.setSelectionRange(start, end);
      // insertText keeps the browser's undo history intact.
      let done = false;
      try {
        done = document.execCommand('insertText', false, text);
      } catch {
        done = false;
      }
      if (!done) {
        input.setRangeText(text, start, end, 'end');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (selectStart !== undefined) input.setSelectionRange(selectStart, selectEnd ?? selectStart);
    }

    function indentSelection(outdent) {
      const text = input.value;
      const { selectionStart: start, selectionEnd: end } = input;
      if (start === end && !outdent) {
        const column = start - (text.lastIndexOf('\n', start - 1) + 1);
        replace(start, end, ' '.repeat(4 - column % 4));
        return;
      }
      const from = text.lastIndexOf('\n', start - 1) + 1;
      const until = end > start && text[end - 1] === '\n' ? end - 1 : end;
      const to = text.indexOf('\n', until) === -1 ? text.length : text.indexOf('\n', until);
      const lines = text.slice(from, to).split('\n');
      let firstShift = 0;
      const changed = lines.map((line, index) => {
        const next = outdent ? line.replace(/^( {1,4}|\t)/, '') : line.trim() ? `    ${line}` : line;
        if (index === 0) firstShift = next.length - line.length;
        return next;
      }).join('\n');
      const delta = changed.length - (to - from);
      replace(from, to, changed, Math.max(from, start + firstShift), start === end ? Math.max(from, start + firstShift) : end + delta);
    }

    function newline() {
      const text = input.value;
      const { selectionStart: start, selectionEnd: end } = input;
      const lineStart = text.lastIndexOf('\n', start - 1) + 1;
      const indent = text.slice(lineStart, start).match(/^[\t ]*/)[0];
      const opens = /[{(\[]\s*$/.test(text.slice(lineStart, start));
      const closes = opens && /^\s*[})\]]/.test(text.slice(end));
      const inner = opens ? `${indent}    ` : indent;
      if (closes) replace(start, end, `\n${inner}\n${indent}`, start + 1 + inner.length);
      else replace(start, end, `\n${inner}`);
    }

    input.addEventListener('scroll', sync);
    input.addEventListener('input', () => {
      refresh();
      onInput?.(input.value);
    });
    input.addEventListener('keydown', event => {
      if (event.isComposing) return;
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        onRun?.();
        return;
      }
      if (event.key === 'Escape') {
        releaseTab = true;
        return;
      }
      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (releaseTab) return;
        event.preventDefault();
        indentSelection(event.shiftKey);
      } else if (event.key === 'Enter' && !event.shiftKey && !event.altKey) {
        event.preventDefault();
        newline();
      } else if (event.key === '}' && input.selectionStart === input.selectionEnd) {
        const text = input.value;
        const start = input.selectionStart;
        const lineStart = text.lastIndexOf('\n', start - 1) + 1;
        const before = text.slice(lineStart, start);
        if (before.length >= 4 && !before.trim()) {
          event.preventDefault();
          replace(start - 4, start, '}');
        }
      }
      if (!['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)) releaseTab = false;
    });
    input.addEventListener('blur', () => { releaseTab = false; });

    refresh();
    return {
      node: wrap,
      input,
      get value() { return input.value; },
      set value(text) {
        input.value = text;
        refresh();
      },
      focus() { input.focus(); },
    };
  }

  async function copyText(source, control) {
    const label = control.querySelector('.button-label');
    const original = label.textContent;
    try {
      await navigator.clipboard.writeText(source);
    } catch {
      const text = element('textarea');
      text.value = source;
      text.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.append(text);
      text.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch {
        // Leave the source selectable when the browser blocks clipboard writes.
      } finally {
        text.remove();
        if (control.isConnected) control.focus();
      }
      if (!copied) {
        label.textContent = 'Copy unavailable';
        return;
      }
    }
    label.textContent = 'Copied';
    setTimeout(() => { label.textContent = original; }, 1500);
  }

  return { element, inline, prose, icon, button, tokenize, codeView, createEditor, copyText };
})();
