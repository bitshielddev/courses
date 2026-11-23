#!/usr/bin/env node
// A stand-in for the Rust Playground that runs on this machine with the local rustc.
// tools/verify.cjs starts one to check Rust courses, so checking never calls the public
// Playground. It answers POST <address>/execute in the Playground's format, including the
// lines Cargo prints around a build, because engine/rust/runtime.js reads those.
//
//   node tools/rust-local.cjs          run it by itself and print its address
//
// To try a course page against it, set `window.C_PLAYGROUND_URL = '<address>'` before the page
// loads, or put the address in <body data-playground>. The address contains a random key:
// this server runs whatever code it is sent, so it listens on 127.0.0.1 only and ignores
// requests that do not know the key. Results are cached in node_modules/.cache/rust-playground.

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const cacheDir = path.join(root, 'node_modules', '.cache', 'rust-playground');
const cargoBin = path.join(os.homedir(), '.cargo', 'bin', 'rustc');
const rustc = process.env.RUSTC || (spawnSync('rustc', ['--version']).status === 0 ? 'rustc' : cargoBin);
const runLimit = 10000;
const outputLimit = 256 * 1024;
const signals = { SIGABRT: [6, 'abort program'], SIGSEGV: [11, 'segmentation violation'], SIGKILL: [9, 'kill program'], SIGBUS: [10, 'bus error'], SIGILL: [4, 'illegal instruction'], SIGTRAP: [5, 'trace trap'] };

let version;
function compilerVersion() {
  if (version === undefined) {
    const result = spawnSync(rustc, ['--version'], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error('rustc was not found. Install Rust from https://rustup.rs, or set RUSTC to the compiler.');
    version = result.stdout.trim();
  }
  return version;
}

function collect(command, args, options) {
  return new Promise(resolve => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    const output = { stdout: '', stderr: '' };
    for (const stream of ['stdout', 'stderr']) {
      child[stream].setEncoding('utf8');
      child[stream].on('data', text => {
        if (output[stream].length < outputLimit) output[stream] += text;
      });
    }
    let timedOut = false;
    const timer = options.limit && setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.limit);
    child.on('error', error => resolve({ ...output, stderr: `${output.stderr}${error.message}\n`, status: 1, signal: null, timedOut }));
    child.on('close', (status, signal) => {
      clearTimeout(timer);
      resolve({ ...output, status, signal, timedOut });
    });
  });
}

// Compiles and runs one program. The answer has the Playground's fields, or `timeout: true`.
async function build(code, release) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fm-rust-'));
  try {
    const profile = release ? 'release' : 'debug';
    fs.mkdirSync(path.join(dir, 'src'));
    fs.mkdirSync(path.join(dir, 'target', profile), { recursive: true });
    fs.writeFileSync(path.join(dir, 'src', 'main.rs'), code);
    const binary = path.join('target', profile, 'playground');
    const compiled = await collect(rustc, ['--edition', '2024', '--color', 'never', '--crate-name', 'playground', '-C', 'debuginfo=0',
      ...(release ? ['-C', 'opt-level=3'] : []), '-o', binary, path.join('src', 'main.rs')], { cwd: dir, limit: 120000 });
    let stderr = `   Compiling playground v0.0.1 (/playground)\n${compiled.stderr}`;
    if (compiled.status !== 0) {
      return { success: false, exitDetail: 'Exited with status 101', stdout: '', stderr: `${stderr}error: could not compile \`playground\` (bin "playground") due to previous errors\n` };
    }
    stderr += release
      ? '    Finished `release` profile [optimized] target(s) in 0.50s\n     Running `target/release/playground`\n'
      : '    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.50s\n     Running `target/debug/playground`\n';
    const ran = await collect(path.join(dir, binary), [], { cwd: dir, limit: runLimit });
    if (ran.timedOut) return { timeout: true };
    const [number, meaning] = signals[ran.signal] || [0, 'signal'];
    return {
      success: ran.status === 0,
      exitDetail: ran.signal ? `Exited with signal ${number} (${ran.signal}): ${meaning}` : `Exited with status ${ran.status}`,
      stdout: ran.stdout,
      stderr: stderr + ran.stderr,
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const pending = new Map();

// The same program is compiled once, however often it is asked for: checks repeat most of them.
function execute({ code, mode }) {
  const release = mode === 'release';
  const key = crypto.createHash('sha256').update(`${compilerVersion()}\0${release}\0${code}`).digest('hex');
  const file = path.join(cacheDir, `${key}.json`);
  if (pending.has(key)) return pending.get(key);
  const work = (async () => {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // Not cached yet, or the cache entry is damaged.
    }
    const answer = await build(String(code), release);
    try {
      fs.mkdirSync(cacheDir, { recursive: true });
      const partial = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}`;
      fs.writeFileSync(partial, JSON.stringify(answer));
      fs.renameSync(partial, file);
    } catch {
      // The cache is a convenience. A read-only disk only makes the next check slower.
    }
    return answer;
  })();
  pending.set(key, work);
  work.finally(() => pending.delete(key));
  return work;
}

// Compiling uses every core for a moment, so only a few run at once.
const slots = Math.max(2, Math.min(8, os.cpus().length - 2));
let running = 0;
const waiting = [];
async function limited(job) {
  if (running >= slots) await new Promise(resolve => waiting.push(resolve));
  running += 1;
  try {
    return await job();
  } finally {
    running -= 1;
    waiting.shift()?.();
  }
}

function start({ port = 0 } = {}) {
  compilerVersion();
  const key = crypto.randomBytes(12).toString('hex');
  const server = http.createServer((request, response) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Private-Network': 'true',
      'Access-Control-Max-Age': '3600',
    };
    const send = (status, body) => {
      response.writeHead(status, { ...headers, 'Content-Type': 'application/json' });
      response.end(JSON.stringify(body));
    };
    if (request.url !== `/${key}/execute`) return send(404, { error: 'Not found' });
    if (request.method === 'OPTIONS') {
      response.writeHead(200, headers);
      return response.end();
    }
    if (request.method !== 'POST') return send(405, { error: 'Use POST' });
    let body = '';
    request.setEncoding('utf8');
    request.on('data', text => {
      body += text;
      if (body.length > 1024 * 1024) request.destroy();
    });
    request.on('end', async () => {
      try {
        const answer = await limited(() => execute(JSON.parse(body)));
        if (answer.timeout) send(500, { error: 'The operation timed out: deadline has elapsed' });
        else send(200, answer);
      } catch (error) {
        send(500, { error: error.message });
      }
    });
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/${key}`,
        version: compilerVersion(),
        close: () => new Promise(done => {
          server.closeAllConnections?.();
          server.close(done);
        }),
      });
    });
  });
}

module.exports = { start, execute, compilerVersion };

if (require.main === module) {
  start({ port: Number(process.argv[2]) || 0 }).then(server => {
    console.log(`${server.version}\nLocal Rust Playground stand-in: ${server.url}\nPress Ctrl+C to stop.`);
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
