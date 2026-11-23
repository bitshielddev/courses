#!/usr/bin/env node
// Turns each lab source, Labs/LabNN.lean, into the two files a learner downloads:
//
//   ../lab/LabNN.lean             the starter, with each solution replaced by a hole
//   ../lab/solutions/LabNN.lean   the same file with the solutions left in
//
//   node courses/lean-intro/lean/labs.cjs          write both folders
//
// A solution is marked in the source by comment lines, so the source itself is checked by Lean:
//
//       theorem two_plus_two : 2 + 2 = 4 := by
//         --! begin solution
//         rfl
//         --! end solution
//
// The starter gets `sorry` in its place, indented like the marker. To give the starter
// something other than `sorry`, add a starter section; each `--! |` line is copied without
// its marker, at the marker's indentation:
//
//         --! begin solution
//         | [] => 0
//         | _ :: rest => 1 + length rest
//         --! starter
//         --! | | _ => sorry
//         --! end solution
//
// Lines outside the markers appear in both files. Anything in Labs/static/ is published
// unchanged, for the few files that are not Lean. ../checks.cjs fails when the published
// files differ from what this produces.
const fs = require('node:fs');
const path = require('node:path');

const sourceDir = path.join(__dirname, 'Labs');
const labDir = path.join(__dirname, '..', 'lab');

function split(name, source) {
  const starter = [];
  const solution = [];
  let mode = 'both';
  let indent = '';
  let custom = null;
  source.split('\n').forEach((line, index) => {
    const marker = line.match(/^(\s*)--! ?(.*)$/);
    const where = `${name}:${index + 1}`;
    if (!marker) {
      if (mode === 'starter') throw new Error(`${where}: only "--! |" lines may follow "--! starter"`);
      if (mode !== 'solution') starter.push(line);
      solution.push(line);
      return;
    }
    const command = marker[2].trim();
    if (command === 'begin solution') {
      if (mode !== 'both') throw new Error(`${where}: a solution is already open`);
      mode = 'solution';
      indent = marker[1];
      custom = null;
    } else if (command === 'starter') {
      if (mode !== 'solution') throw new Error(`${where}: "--! starter" belongs inside a solution`);
      mode = 'starter';
      custom = [];
    } else if (command === 'end solution') {
      if (mode === 'both') throw new Error(`${where}: no solution is open`);
      starter.push(...(custom ?? [`${indent}sorry`]));
      mode = 'both';
    } else if (marker[2].startsWith('|')) {
      if (mode !== 'starter') throw new Error(`${where}: "--! |" belongs after "--! starter"`);
      const text = marker[2].slice(1).replace(/^ /, '');
      custom.push(text ? indent + text : '');
    } else {
      throw new Error(`${where}: unknown marker "${line.trim()}"`);
    }
  });
  if (mode !== 'both') throw new Error(`${name}: a solution is never closed`);
  return { starter: starter.join('\n'), solution: solution.join('\n') };
}

// Every published file, as { 'LabNN.lean': text, 'solutions/LabNN.lean': text, 'name.py': text }.
function generate() {
  const files = {};
  const staticDir = path.join(sourceDir, 'static');
  for (const name of fs.existsSync(staticDir) ? fs.readdirSync(staticDir).sort() : []) {
    files[name] = fs.readFileSync(path.join(staticDir, name), 'utf8');
  }
  for (const name of fs.readdirSync(sourceDir).filter(file => /^Lab\d\d\.lean$/.test(file)).sort()) {
    const { starter, solution } = split(name, fs.readFileSync(path.join(sourceDir, name), 'utf8'));
    files[name] = starter;
    files[`solutions/${name}`] = solution;
  }
  return files;
}

module.exports = { generate, labDir };

if (require.main === module) {
  const files = generate();
  fs.rmSync(labDir, { recursive: true, force: true });
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(labDir, name)), { recursive: true });
    fs.writeFileSync(path.join(labDir, name), text);
  }
  console.log(`Wrote ${Object.keys(files).length} files to ${path.relative(process.cwd(), labDir)}/`);
}
