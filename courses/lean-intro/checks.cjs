// Checks for this course alone, run by tools/verify.cjs after its lab-course checks.
//
// The lessons quote Lean code, Lean's messages and goal states, and hand out Lean files.
// None of it may reach a learner unless Lean itself has accepted it:
//
//   1. lean/Reading/LNN.lean and lean/Labs/LabNN.lean build with no warnings (`lake build --wfail`).
//      The reading files pin quoted messages and goals with `#guard_msgs`.
//   2. The published lab/ folder is exactly what lean/labs.cjs produces from lean/Labs/.
//   3. Each published starter reports nothing but its unfilled holes, and at least one. A lab
//      that plants other faults for the learner to find lists them in `planted` below.
//      Each published solution that prints its axioms prints only the standard ones.
//   4. Every `code` and `text` block in lesson NN, and every question's `code`, comes from that
//      lesson's reading file, starter or solution. Code is compared a paragraph at a time, with
//      comments and spacing ignored, so a block may join definitions that the source separates.
//      A `text` block (a message or a goal) must appear whole. A block that is not Lean
//      (`lang: 'python'`) or is marked `unchecked: true` is exempt; Python blocks must parse.
//   5. Each lesson links to its own starter and solution, and a served copy has the same text.
//
// Needs Lean: https://lean-lang.org/install/ (elan reads the version from lean/lean-toolchain).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const labs = require('./lean/labs.cjs');

const leanDir = path.join(__dirname, 'lean');
const env = { ...process.env, PATH: [process.env.PATH, path.join(os.homedir(), '.elan', 'bin')].join(path.delimiter) };
// Faults a starter is meant to show besides its holes, by file: a test that fails until the
// learner has repaired the program it tests.
const planted = {
  'Lab14.lean': [/Docstring on `#guard_msgs` does not match/],
};
// What a finished proof may rest on. Lesson 13's `bv_decide` adds one more, named after its theorem.
const standardAxioms = /^(propext|Classical\.choice|Quot\.sound|.*\._native\.bv_decide\.ax_\d+_\d+)$/;
const squash = text => text.replace(/\s+/g, ' ').trim();
// Lean source without its comments and `#guard_msgs` lines, which the lessons do not quote.
const bare = text => text.replace(/\/-[\s\S]*?-\//g, ' ').replace(/--.*$/gm, ' ').replace(/^\s*#guard_msgs.*$/gm, ' ');
const paragraphs = text => bare(text).split(/\n\s*\n/).map(squash).filter(Boolean);
const pad = number => String(number).padStart(2, '0');

function run(command, args, input) {
  return new Promise(resolve => {
    const child = spawn(command, args, { cwd: leanDir, env });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', error => resolve({ code: -1, output: error.message }));
    child.on('close', code => resolve({ code, output }));
    if (input !== undefined) child.stdin.end(input);
  });
}

function filesUnder(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? filesUnder(path.join(dir, entry.name), `${prefix}${entry.name}/`)
    : [`${prefix}${entry.name}`]);
}

// Lean prints one "file:line:column: severity: text" header per message; later lines belong to it.
function messages(output) {
  const found = [];
  for (const line of output.split('\n')) {
    const header = line.match(/^.*?:(\d+):\d+: (error|warning|info): (.*)$/);
    if (header) found.push({ line: Number(header[1]), severity: header[2], text: header[3] });
    else if (found.length) found[found.length - 1].text += `\n${line}`;
  }
  return found;
}

function walk(blocks, visit) {
  for (const block of [].concat(blocks ?? [])) {
    if (typeof block === 'string') continue;
    visit(block);
    for (const key of ['pitfall', 'compare', 'aside', 'tip', 'native']) {
      if (block[key] !== undefined) walk(block[key], visit);
    }
    if (block.details) walk(block.body, visit);
  }
}

module.exports = async function checkLean({ all, links, readLink, fail }) {
  if (spawnSync('lake', ['--version'], { cwd: leanDir, env }).status !== 0) {
    fail('lean', 'Lean is not installed, so the Lean in this course cannot be checked. See https://lean-lang.org/install/');
    return undefined;
  }

  // 1. Everything quoted or handed out builds cleanly.
  const build = await run('lake', ['build', '--wfail']);
  if (build.code !== 0) fail('lean', `lake build --wfail failed in lean/:\n${build.output.trim()}`);

  // 2. The published lab files are current.
  const generated = labs.generate();
  const published = filesUnder(labs.labDir);
  for (const name of Object.keys(generated)) {
    if (!published.includes(name)) fail('lab', `lab/${name} is missing; run node courses/lean-intro/lean/labs.cjs`);
    else if (fs.readFileSync(path.join(labs.labDir, name), 'utf8') !== generated[name]) fail('lab', `lab/${name} is out of date; run node courses/lean-intro/lean/labs.cjs`);
  }
  for (const name of published) {
    if (!(name in generated)) fail('lab', `lab/${name} is not produced by lean/labs.cjs; remove it`);
  }

  // 3. A starter has holes and nothing else wrong with it.
  const starters = Object.keys(generated).filter(name => /^Lab\d\d\.lean$/.test(name));
  await Promise.all(starters.map(async name => {
    const result = await run('lean', [path.join(labs.labDir, name)]);
    const problems = messages(result.output).filter(message => message.severity !== 'info');
    const expected = message => message.text.includes('sorry') || (planted[name] || []).some(pattern => pattern.test(message.text));
    if (!problems.length) fail('lab', `${name}: the starter has no hole left to fill`);
    for (const message of problems.filter(message => !expected(message))) fail('lab', `${name}:${message.line}: the starter reports more than a hole: ${message.text.split('\n')[0]}`);
  }));
  await Promise.all(starters.filter(name => generated[`solutions/${name}`].includes('#print axioms')).map(async name => {
    const result = await run('lean', [path.join(labs.labDir, 'solutions', name)]);
    for (const message of messages(result.output)) {
      const listed = message.text.match(/depends on axioms: \[([^\]]*)\]/);
      const extra = listed ? listed[1].split(',').map(axiom => axiom.trim()).filter(axiom => !standardAxioms.test(axiom)) : [];
      if (extra.length) fail('lab', `solutions/${name}:${message.line}: the solution still depends on ${extra.join(', ')}`);
    }
  }));

  // 4 and 5. Each lesson quotes only what its sources contain, and links to its own files.
  const python = spawnSync('python3', ['--version']).status === 0;
  let quoted = 0;
  for (const [index, lesson] of all.entries()) {
    const number = pad(index + 1);
    const lab = `Lab${number}.lean`;
    const reading = path.join(leanDir, 'Reading', `L${number}.lean`);
    if (!fs.existsSync(reading) || !(lab in generated)) {
      fail(lesson.id, `lesson ${number} needs lean/Reading/L${number}.lean and lean/Labs/${lab}`);
      continue;
    }
    const sources = [fs.readFileSync(reading, 'utf8'), generated[lab], generated[`solutions/${lab}`]].join('\n');
    const whole = squash(sources);
    const code = squash(bare(sources));
    const quotes = [];
    const collect = where => block => {
      if (block.unchecked) return;
      if (block.code !== undefined) quotes.push({ where, text: block.code, lang: block.lang ?? 'lean' });
      if (block.text !== undefined) quotes.push({ where, text: block.text, lang: 'message' });
    };
    lesson.sections.forEach((section, position) => walk(section.body, collect(`section ${position + 1}`)));
    walk(lesson.challenges[0].prompt, collect('lab'));
    lesson.quiz.forEach((question, position) => {
      if (question.code !== undefined && !question.unchecked) quotes.push({ where: `question ${position + 1}`, text: question.code, lang: question.lang ?? 'lean' });
    });
    for (const quote of quotes) {
      quoted += 1;
      const shown = JSON.stringify(quote.text.slice(0, 60));
      if (quote.lang === 'message') {
        if (!whole.includes(squash(quote.text))) fail(lesson.id, `${quote.where}: this message or goal is not in lean/Reading/L${number}.lean: ${shown}`);
      } else if (quote.lang === 'lean') {
        // A question may quote a goal as its `code`; that matches the source whole, as a message does.
        const missing = whole.includes(squash(quote.text)) ? undefined : paragraphs(quote.text).find(paragraph => !code.includes(paragraph));
        if (missing) fail(lesson.id, `${quote.where}: this Lean is not in lean/Reading/L${number}.lean or the lab files: ${JSON.stringify(missing.slice(0, 70))}`);
      } else if (quote.lang === 'python' && python) {
        const parsed = await run('python3', ['-c', 'import ast, sys; ast.parse(sys.stdin.read())'], quote.text);
        if (parsed.code !== 0) fail(lesson.id, `${quote.where}: this Python does not parse: ${shown}`);
      }
    }
    for (const name of [lab, `solutions/${lab}`]) {
      const link = links.find(item => new URL(item.url).pathname.endsWith(`/lab/${name}`) && item.where.startsWith(`${lesson.id} `));
      if (!link) {
        fail(lesson.id, `the lab does not link to lab/${name}`);
        continue;
      }
      const text = await readLink(link.url).catch(error => fail(lesson.id, error.message));
      if (typeof text === 'string' && text !== generated[name]) fail(lesson.id, `the copy of lab/${name} being served differs from the source`);
    }
  }
  return `${all.length} lessons, ${quoted} quoted blocks and ${starters.length} labs checked by Lean`;
};
