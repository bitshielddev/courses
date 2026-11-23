#!/usr/bin/env node
// Fills in `#guard_msgs` placeholders in the reading files with what Lean actually prints.
//
//   node courses/lean-intro/lean/fill-guards.cjs Reading/L04.lean [more files]
//
// While writing a reading file, put a placeholder above a command whose message or goal the
// lesson will quote:
//
//     /-- ?? -/
//     #guard_msgs in
//     #eval double 21
//
// This runs Lean on the file and replaces each placeholder with the real message, so the text
// quoted in a lesson is copied from Lean and never typed by hand. Docstrings that are already
// filled in are left alone: when Lean's output changes, `lake build --wfail` reports the
// difference and a person decides what to do about it.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const env = { ...process.env, PATH: [process.env.PATH, path.join(os.homedir(), '.elan', 'bin')].join(path.delimiter) };
const mismatch = '❌️ Docstring on `#guard_msgs` does not match generated message:';

for (const name of process.argv.slice(2)) {
  const file = path.resolve(__dirname, name);
  // Filling one placeholder moves the lines below it, so go round until none is left.
  for (let filled = 0; ; ) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const result = spawnSync('lean', ['--json', file], { cwd: __dirname, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const found = result.stdout.split('\n').filter(Boolean).map(line => JSON.parse(line))
      .filter(message => message.data.startsWith(mismatch) && lines[message.pos.line - 2]?.trim() === '/-- ?? -/')
      .sort((a, b) => b.pos.line - a.pos.line);
    if (!found.length) {
      const left = lines.filter(line => line.trim() === '/-- ?? -/').length;
      console.log(`${name}: filled ${filled} placeholder${filled === 1 ? '' : 's'}${left ? `, ${left} left (is each directly above "#guard_msgs in"?)` : ''}`);
      break;
    }
    // Bottom to top, so earlier line numbers stay valid within this pass.
    for (const message of found) {
      const actual = message.data.slice(mismatch.length).split('\n')
        .filter(line => line.startsWith('+'))
        .map(line => line.slice(2));
      const indent = lines[message.pos.line - 2].match(/^\s*/)[0];
      const text = actual.length === 1 && actual[0].length < 90
        ? [`${indent}/-- ${actual[0]} -/`]
        : [`${indent}/--`, ...actual, `${indent}-/`];
      lines.splice(message.pos.line - 2, 1, ...text);
      filled += 1;
    }
    fs.writeFileSync(file, lines.join('\n'));
  }
}
