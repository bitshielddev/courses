// Runs Rust for compiler courses whose <body> has data-language="rust".
// Nothing is compiled in the browser: the source is sent to a Rust Playground server and the
// result is read back. It offers the same interface as engine/compiler/runtime.js, so app.js
// and tools/verify.cjs use either one as window.CCompiler.
(() => {
  'use strict';

  const publicPlayground = 'https://play.rust-lang.org';
  const limits = { request: 45000, source: 128 * 1024 };
  let queue = Promise.resolve();

  // tools/verify.cjs sets window.C_PLAYGROUND_URL to its local stand-in before the page loads.
  // A page can name another server with <body data-playground="…">. Neither comes from the
  // address bar, so a link cannot send a learner's code somewhere else.
  const endpoint = () => String(globalThis.C_PLAYGROUND_URL || document.body.dataset.playground || publicPlayground).replace(/\/+$/, '');

  // Cargo and rustc wrap the interesting output in lines about the build itself.
  const framing = [
    /^ *Compiling playground v[^\n]*\n?/gm,
    /^ *Finished `[^\n]*\n?/gm,
    /^ *Running `[^\n]*\n?/gm,
    /^error: could not compile `playground`[^\n]*\n?/gm,
    /^error: aborting due to [^\n]*\n?/gm,
    /^warning: `playground` \(bin "playground"\) generated [^\n]*\n?/gm,
    /^warning: \d+ warnings? emitted\n?/gm,
    /^note: run with `RUST_BACKTRACE=1` environment variable to display a backtrace\n?/gm,
  ];

  // What a learner should read: the compiler's messages and the program's own stderr.
  function tidy(stderr) {
    let text = String(stderr || '').replace(/\r/g, '');
    for (const pattern of framing) text = text.replace(pattern, '');
    return text
      .replace(/\bsrc\/main\.rs\b/g, 'main.rs')
      // The number after a thread's name differs from run to run.
      .replace(/^(thread '[^'\n]*') \(\d+\) /gm, '$1 ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\n+/, '')
      .replace(/\n+$/, '\n')
      .replace(/^\n$/, '');
  }

  function exitCode(data) {
    if (data.success) return 0;
    const status = /Exited with status (\d+)/.exec(data.exitDetail || '');
    if (status) return Number(status[1]);
    const signal = /Exited with signal (\d+)/.exec(data.exitDetail || '');
    return signal ? 128 + Number(signal[1]) : 1;
  }

  async function execute(source, { release = false } = {}) {
    if (new TextEncoder().encode(source).length > limits.source) {
      return { stdout: '', stderr: 'The editor accepts up to 128 KB of Rust source.', exitCode: 1, stage: 'compile' };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), limits.request);
    let response;
    try {
      response = await fetch(`${endpoint()}/execute`, {
        method: 'POST',
        mode: 'cors',
        referrerPolicy: 'no-referrer',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'stable', mode: release ? 'release' : 'debug', edition: '2024', crateType: 'bin', tests: false, backtrace: false, code: source,
        }),
        signal: controller.signal,
      });
    } catch {
      throw new Error(controller.signal.aborted
        ? 'The Rust Playground did not answer in time. Try again.'
        : 'The Rust Playground could not be reached. Check your connection and try again.');
    } finally {
      clearTimeout(timer);
    }
    let data = {};
    try {
      data = await response.json();
    } catch {
      // A proxy or an outage can answer with something that is not JSON.
    }
    if (!response.ok) {
      // The Playground stops a program after about ten seconds and reports that as a server error.
      if (/timed out|deadline/i.test(data.error || '')) {
        return { stdout: '', stderr: 'Stopped: the program ran past the time limit of about 10 seconds.', exitCode: 124, stage: 'run' };
      }
      throw new Error(`The Rust Playground could not run this (HTTP ${response.status}). Wait a moment and try again.`);
    }
    if (typeof data.stderr !== 'string' || typeof data.stdout !== 'string') {
      throw new Error('The Rust Playground sent an answer this page does not understand.');
    }
    // A compile error and a panic both exit with 101. Only a program that started has this line.
    const ran = /^ *Running `/m.test(data.stderr);
    return { stdout: data.stdout, stderr: tidy(data.stderr), exitCode: exitCode(data), stage: ran ? 'run' : 'compile' };
  }

  globalThis.CCompiler = Object.freeze({
    // options.release compiles with optimizations, where integer overflow wraps instead of panicking.
    run(source, options) {
      const result = queue.then(() => execute(source, options));
      queue = result.catch(() => {});
      return result;
    },
    // There is nothing to load ahead of time.
    warm() {},
    tidy,
  });
})();
