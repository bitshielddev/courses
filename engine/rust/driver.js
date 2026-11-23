// Builds the Rust test program for a challenge and reads its results back.
// It offers the same interface as engine/compiler/driver.js, plus `info`: the file names and
// wording app.js uses in place of its C defaults.
window.CTestDriver = (() => {
  'use strict';

  const info = {
    language: 'rust',
    cellName: 'main.rs',
    predictName: 'predict.rs',
    solutionName: 'solution.rs',
    help: 'Ctrl + Enter or ⌘ + Enter runs the tests. Tab indents; press Esc and then Tab to leave the editor. Anything you print with println! appears in the console. Running sends this code to the Rust Playground.',
    unavailable: 'Rust Playground unavailable',
    exits: { 101: 'Program panicked' },
    failureLabel: 'The test stopped with a panic: ',
    trackedLabel: 'Allocation-checked',
    trackedNote: 'These tests run with a counting allocator. They can check how many allocations your code makes, and a test fails if memory allocated during it is never freed.',
  };

  // Comments, strings and character literals become spaces, so that only code is searched.
  function codeOnly(source) {
    return source.replace(
      /\/\/[^\n]*|\/\*[\s\S]*?\*\/|b?r#"[\s\S]*?"#|b?r"[^"]*"|b?"(?:\\[\s\S]|[^"\\])*"|b?'(?:\\[^\n']{1,12}|[^'\\\n])'/g,
      match => match.replace(/[^\n]/g, ' '),
    );
  }

  // Identifiers the learner's code may not use: the challenge's `forbid` list, and `unsafe`
  // unless the challenge sets `unsafe: true`.
  function forbidden(source, challenge) {
    const names = [...(challenge.forbid || []), ...(challenge.unsafe ? [] : ['unsafe'])];
    const code = codeOnly(source);
    return names.filter(name => new RegExp(`(?<![A-Za-z0-9_])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z0-9_])`).test(code));
  }

  // A counting allocator for the memory challenges. Every allocation and release goes through
  // it, so a test can ask how many were made and the runner can see what is still live.
  const tracker = String.raw`
    use std::alloc::{GlobalAlloc, Layout, System};
    use std::sync::atomic::AtomicIsize;

    pub struct Counting;
    static ALLOCATIONS: AtomicUsize = AtomicUsize::new(0);
    static LIVE: AtomicIsize = AtomicIsize::new(0);
    static PEAK: AtomicIsize = AtomicIsize::new(0);
    static ALLOCATIONS_AT_START: AtomicUsize = AtomicUsize::new(0);
    static LIVE_AT_START: AtomicIsize = AtomicIsize::new(0);

    unsafe impl GlobalAlloc for Counting {
        unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
            ALLOCATIONS.fetch_add(1, SeqCst);
            let live = LIVE.fetch_add(1, SeqCst) + 1;
            PEAK.fetch_max(live, SeqCst);
            unsafe { System.alloc(layout) }
        }
        unsafe fn dealloc(&self, pointer: *mut u8, layout: Layout) {
            LIVE.fetch_sub(1, SeqCst);
            unsafe { System.dealloc(pointer, layout) }
        }
    }

    #[global_allocator]
    static ALLOCATOR: Counting = Counting;

    fn start_counting() {
        ALLOCATIONS_AT_START.store(ALLOCATIONS.load(SeqCst), SeqCst);
        LIVE_AT_START.store(LIVE.load(SeqCst), SeqCst);
        PEAK.store(LIVE.load(SeqCst), SeqCst);
    }

    /// Allocations made since this test began. Growing a Vec or String counts as one.
    pub fn allocation_count() -> usize { ALLOCATIONS.load(SeqCst) - ALLOCATIONS_AT_START.load(SeqCst) }
    /// Allocations made since this test began that have not been freed yet.
    pub fn live_allocations() -> isize { LIVE.load(SeqCst) - LIVE_AT_START.load(SeqCst) }
    /// The most allocations that were live at one moment since this test began.
    pub fn peak_live_allocations() -> isize { PEAK.load(SeqCst) - LIVE_AT_START.load(SeqCst) }
`;

  function support(marker, userLines, starts, tracked) {
    return String.raw`
mod fm_support {
    #![allow(dead_code, unused_imports)]
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering::SeqCst};

    const MARKER: &str = "${marker}";
    const USER_LINES: u32 = ${userLines};
    // The line of the generated file on which each test's body begins.
    const TEST_STARTS: [u32; ${starts.length}] = [${starts.join(', ')}];
    static INDEX: AtomicUsize = AtomicUsize::new(0);
    static QUIET: AtomicBool = AtomicBool::new(false);
${tracked ? tracker : ''}
    pub fn install() {
        // Printing once and naming this thread makes the standard library set up what it
        // allocates lazily, before any test starts counting.
        println!();
        let _ = std::thread::current();
        std::panic::set_hook(Box::new(|report| {
            if QUIET.load(SeqCst) { return; }
            let payload = report.payload();
            let text = payload.downcast_ref::<&str>().map(|text| text.to_string())
                .or_else(|| payload.downcast_ref::<String>().cloned())
                .unwrap_or_else(|| String::from("panicked"));
            let index = INDEX.load(SeqCst);
            let line = report.location().map(|at| at.line()).unwrap_or(0);
            // Where it happened: a line of the learner's code, or a line of this test's body.
            let (place, number) = if line >= 1 && line <= USER_LINES { ('U', line) }
                else if index < TEST_STARTS.len() && line >= TEST_STARTS[index] { ('T', line - TEST_STARTS[index] + 1) }
                else { ('X', 0) };
            println!("\n{MARKER} F {index} {place}{number} {}", text.replace('\\', "\\\\").replace('\n', "\\n").replace('\r', ""));
        }));
    }

    /// True if running the closure panics. The panic is not reported as a failure, so a test
    /// can check that code refuses bad input.
    pub fn panics<R>(body: impl FnOnce() -> R) -> bool {
        QUIET.store(true, SeqCst);
        let outcome = std::panic::catch_unwind(std::panic::AssertUnwindSafe(body));
        QUIET.store(false, SeqCst);
        outcome.is_err()
    }

    pub fn run(index: usize, body: fn()) {
        use std::io::Write;
        INDEX.store(index, SeqCst);
        QUIET.store(false, SeqCst);${tracked ? '\n        start_counting();' : ''}
        let outcome = std::panic::catch_unwind(body);
        #[allow(unused_mut)]
        let mut passed = outcome.is_ok();${tracked ? String.raw`
        if passed && live_allocations() != 0 {
            passed = false;
            let left = live_allocations();
            println!("\n{MARKER} N {index} {left} allocation{} made during this test {} never freed", if left == 1 { "" } else { "s" }, if left == 1 { "was" } else { "were" });
        }` : ''}
        drop(outcome);
        println!("\n{MARKER} R {index} {}", passed as u8);
        let _ = std::io::stdout().flush();
    }
}
`;
  }

  const lineCount = text => text.split('\n').length;

  function build(source, challenge, marker) {
    const tracked = Boolean(challenge.track);
    // The learner's code comes first, so the compiler's line numbers are the editor's.
    // A main of their own is renamed and kept, so they can leave experiments in place.
    const user = source.replace(/\bfn\s+main\s*\(/, 'fn fm_user_main(');
    const ownMain = user !== source;
    const head = [
      user,
      challenge.prelude ? `// Already declared for you.\n${challenge.prelude}` : '',
      ...forbidden(source, challenge).map(name => `compile_error!("\`${name}\` is not allowed in this challenge.");`),
      'mod fm_tests {',
      '    #![allow(unused_imports, unused_variables, unused_mut, dead_code)]',
      '    use super::*;',
      `    use super::fm_support::${tracked ? '{allocation_count, live_allocations, panics, peak_live_allocations}' : 'panics'};`,
    ].filter(Boolean).join('\n');
    let line = lineCount(head);
    const starts = [];
    const cases = challenge.tests.map((test, index) => {
      starts.push(line + 2);
      const text = `    pub fn case_${index}() {\n${test.body}\n    }`;
      line += lineCount(text);
      return text;
    });
    return [
      head,
      ...cases,
      '}',
      support(marker, lineCount(source), starts, tracked),
      'fn main() {',
      '    fm_support::install();',
      ...challenge.tests.map((_, index) => `    fm_support::run(${index}, fm_tests::case_${index});`),
      ownMain ? '    let _ = fm_user_main;' : '',
      '}',
      '',
    ].filter(part => part !== '').join('\n');
  }

  // Removes the marker lines from stdout and returns what they reported.
  function parse(stdout, marker, count) {
    const tests = Array.from({ length: count }, () => ({ passed: undefined, failures: [], notes: [] }));
    const cleaned = stdout.replace(
      new RegExp(`\\n?^${marker} ([RFN]) (\\d+) (.*)\\r?\\n`, 'gm'),
      (_, kind, index, detail) => {
        const test = tests[Number(index)];
        if (!test) return '';
        if (kind === 'R') test.passed = detail === '1';
        if (kind === 'N') test.notes.push(detail);
        if (kind === 'F') {
          const [, place, number, text] = /^([UTX])(\d+) ([\s\S]*)$/.exec(detail) || [null, 'X', '0', detail];
          const message = text.replace(/\\(\\|n)/g, (_, escaped) => (escaped === 'n' ? '\n' : '\\'));
          const where = place === 'U' ? `line ${number} of your code: ` : place === 'T' ? `line ${number} of this test: ` : '';
          test.failures.push(where + message);
        }
        return '';
      },
    );
    // install() prints one empty line before the first test.
    return { stdout: cleaned.replace(/^\n/, ''), tests };
  }

  return { build, parse, info, forbidden };
})();
