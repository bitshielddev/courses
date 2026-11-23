// Part 4: Imperative code. Loops that are still functions, their invariants, and integers that wrap.
(() => {
  const lean = String.raw; // lean`…` keeps backslashes as written
  const part = 'Part 4 · Imperative code';
  const { fetchLab, checkLab, solution } = window.LEAN_COURSE;

  (window.C_LESSONS ||= []).push(
    {
      id: 'loops',
      category: part,
      title: 'Loops and mutable variables',
      summary: 'Lean has for loops, variables you can reassign, and early return. They are notation for the recursive functions you already know, which is why you can still prove things about them.',
      minutes: 35,
      topics: ['do notation', 'let mut', 'for and ranges', 'return, break, continue', 'Option and Except', 'IO'],
      sections: [
        {
          title: 'A loop with a variable that changes',
          body: [
            'This is the sum from lesson 3, written the way you would write it in Python.',
            { code: lean`def sumLoop (xs : List Nat) : Nat := Id.run do
  let mut total := 0
  for x in xs do
    total := total + x
  return total`, name: 'Scratch.lean' },
            '`do` starts a block of statements. `let mut` declares a variable that may be reassigned, and `total := …` reassigns it. The `for` loop visits each element in turn, and `return` gives the result. `Id.run` says that the block does nothing but compute a value: no input, no output, no failure.',
            '`sumLoop [1, 2, 3]` is 6. Nothing about the type gives the loop away: `sumLoop` is a function from `List Nat` to `Nat`, like `total`.',
            { compare: 'The body is the Python function line for line: `total = 0`, `for x in xs:`, `total += x`, `return total`. The differences are that a variable must be declared `mut` before it can change, and that the change is visible only inside this block. No other function can see `total` or alter it.' },
          ],
        },
        {
          title: 'It is still a function',
          body: [
            'A claim about one input can be settled by running the loop, as before.',
            { code: lean`theorem sumLoop_123 : sumLoop [1, 2, 3] = 6 := by
  decide`, name: 'Scratch.lean' },
            'More interesting is what the loop is. Ask `simp` to unfold it.',
            { code: lean`theorem sumLoop_is_fold (xs : List Nat) : sumLoop xs = xs.foldl (· + ·) 0 := by
  simp [sumLoop]`, name: 'Scratch.lean' },
            'That proof needed nothing else, because a fold is what the loop turns into. With the claim stated against `xs.sum`, the goal after `simp [sumLoop]` shows it.',
            { text: lean`xs : List Nat
⊢ List.foldl (fun b a => b + a) 0 xs = xs.sum` },
            'The mutable variable has become the accumulator of a fold: a function that takes the value so far and the next element, and returns the new value. This is the `go` helper from lesson 3, generated for you. There is no hidden state and no assignment once Lean has finished translating.',
            { aside: 'When a block has several mutable variables, they travel together as a tuple. An early `return` becomes a value that says “stop, with this result”, which the rest of the loop passes along untouched. The translation is mechanical, and everything it produces is ordinary Lean.' },
          ],
        },
        {
          title: 'Conditions, early exit and counting',
          body: [
            'Inside a `do` block an `if` may stand alone, without `else`. `return` leaves the function from anywhere, including the middle of a loop.',
            { code: lean`def maxLoop (xs : List Nat) : Nat := Id.run do
  let mut best := 0
  for x in xs do
    if x > best then best := x
  return best

def indexOf (xs : List Nat) (x : Nat) : Option Nat := Id.run do
  let mut i := 0
  for y in xs do
    if y = x then return some i
    i := i + 1
  return none`, name: 'Scratch.lean' },
            '`indexOf [5, 6, 7] 7` is `some 2`, and `indexOf [5, 6, 7] 9` is `none`. `continue` skips to the next element and `break` leaves the loop.',
            { code: lean`def sumSmallEvens (xs : List Nat) : Nat := Id.run do
  let mut total := 0
  for x in xs do
    if x % 2 = 1 then continue
    if x > 100 then break
    total := total + x
  return total`, name: 'Scratch.lean' },
            'A range `[0:n]` counts from 0 up to, and not including, `n`. Two variables can be assigned at once. Arrays grow with `push`.',
            { code: lean`def fib (n : Nat) : Nat := Id.run do
  let mut a := 0
  let mut b := 1
  for _ in [0:n] do
    (a, b) := (b, a + b)
  return a

def squares (n : Nat) : Array Nat := Id.run do
  let mut out := #[]
  for i in [0:n] do
    out := out.push (i * i)
  return out`, name: 'Scratch.lean' },
            '`fib 10` is 55, and `squares 5` is `#[0, 1, 4, 9, 16]`.',
            { aside: '`out.push` looks as if it must copy the array each time, since values never change. It does not. When nothing else refers to an array, Lean reuses its memory and updates it in place. The program has the meaning of the copying version and the cost of the mutating one.' },
            { pitfall: ['Lean also has `while`. A `while` loop might not finish, so Lean builds it on a `partial` function, and proofs cannot follow it. `decide` cannot even run one.', { code: lean`def whileSum (n : Nat) : Nat := Id.run do
  let mut i := 0
  let mut s := 0
  while i < n do
    s := s + i
    i := i + 1
  return s` }, { text: 'Tactic `decide` failed to reduce' }, 'In code you mean to verify, use a `for` over a list or a range, or a recursive function with a measure.'] },
          ],
        },
        {
          title: 'The same notation for a computation that can stop',
          body: [
            '`do` is not only for loops. Without `Id.run`, a block takes its meaning from its type. When the type is an `Option`, each `←` unwraps a value, and the first `none` ends the whole block.',
            { code: lean`def addFirstTwo (xs : List Nat) : Option Nat := do
  let a ← xs[0]?
  let b ← xs[1]?
  return a + b`, name: 'Scratch.lean' },
            '`addFirstTwo [3, 4, 5]` is `some 7`, and `addFirstTwo [3]` is `none`. The block is shorthand for the nested matches you would otherwise write, and Lean can prove that the two are the same function.',
            { code: lean`def addFirstTwoByHand (xs : List Nat) : Option Nat :=
  match xs[0]? with
  | none => none
  | some a =>
    match xs[1]? with
    | none => none
    | some b => some (a + b)

theorem addFirstTwo_same (xs : List Nat) : addFirstTwo xs = addFirstTwoByHand xs := by
  unfold addFirstTwo addFirstTwoByHand
  grind`, name: 'Scratch.lean' },
            '`Except String Nat` is a result that is either a number or an error message. `throw` produces the error, `pure` wraps a plain value, and `←` passes an error straight up to the caller.',
            { code: lean`def checkedDiv (a b : Nat) : Except String Nat :=
  if b = 0 then throw "division by zero" else pure (a / b)

def average (xs : List Nat) : Except String Nat := do
  let q ← checkedDiv xs.sum xs.length
  return q`, name: 'Scratch.lean' },
            '`average [4, 6]` is `Except.ok 5`, and `average []` is `Except.error "division by zero"`.',
            { compare: 'This is exception handling with the exceptions in the type. In Python any call may raise, and the signature does not say so. Here a function that can fail returns an `Except`, a function that returns `Nat` cannot fail, and `←` marks every place where control might leave early. If you have seen `?` in Rust, `←` is the same idea.' },
          ],
        },
        {
          title: 'And for the outside world',
          body: [
            'Reading a file or printing a line is not a computation from inputs to an output, so it cannot have a type like `Nat`. Such actions have the type `IO`, and the same `do` notation sequences them.',
            { code: lean`def main : IO Unit := do
  IO.println s!"sum = {sumLoop [1, 2, 3]}"`, name: 'Scratch.lean' },
            'A program’s entry point is `main`. Lesson 16 builds one and runs it.',
            'The type is a boundary. A function whose type does not mention `IO` cannot print, read or depend on the time, so its result depends only on its arguments. Everything you have proved so far is about functions on that side of the line, and in a well-structured program most of the logic lives there, with a thin layer of `IO` around it.',
          ],
        },
      ],
      takeaways: [
        '`Id.run do` with `let mut` and `for` is loop syntax for a function with no effects.',
        'Lean translates the loop into a fold, with the mutable variables as its accumulator.',
        '`decide` runs a loop over a list, and `simp` unfolds one into the fold it stands for.',
        'In an `Option` or `Except` block, `←` unwraps a value or stops the block.',
        'Effects on the outside world have the type `IO`. Without it, a function depends only on its arguments.',
      ],
      quiz: [
        {
          q: 'What is the type of `sumLoop`, and what does that tell a caller?',
          options: [
            { t: '`List Nat → Nat`. It is an ordinary function, and the loop inside it is invisible from outside.', ok: true, why: 'The mutable variable exists only inside the block. Callers see a function from lists to numbers.' },
            { t: '`List Nat → IO Nat`, because it uses a mutable variable.', why: '`let mut` is local and has no effect on the outside world, so `IO` does not appear.' },
            { t: '`List Nat → Id Nat`, so callers must unwrap the result.', why: '`Id.run` has already done that. The declared return type is `Nat`.' },
          ],
        },
        {
          q: 'After `simp [sumLoop]` the goal is as shown. What has happened to `total`?',
          code: lean`xs : List Nat
⊢ List.foldl (fun b a => b + a) 0 xs = xs.sum`,
          options: [
            { t: 'It has become the accumulator `b` of a fold, starting at 0.', ok: true, why: 'Each trip round the loop is one call of the function, taking the value so far and the next element.' },
            { t: 'It has been removed, because it was never used.', why: 'It carries the running sum. It is still there, as the fold’s first argument.' },
            { t: 'It is stored in memory that the fold reads and writes.', why: 'There is no memory cell. The value is passed from one call to the next as an argument.' },
          ],
        },
        {
          q: 'What does `#eval puzzle [4, 5, 0, 6]` show?',
          code: lean`def puzzle (xs : List Nat) : Nat := Id.run do
  let mut n := 0
  for x in xs do
    if x = 0 then return n
    n := n + 1
  return n`,
          options: [
            { t: '`2`', ok: true, why: 'It counts elements until the first zero, and returns from inside the loop when it finds one.' },
            { t: '`4`', why: 'That would be the result if there were no zero. The `return` inside the loop leaves the function early.' },
            { t: '`3`', why: 'The count is not increased for the zero itself: `return` comes before `n := n + 1`.' },
          ],
        },
        {
          q: 'Why should code you intend to verify avoid `while`?',
          options: [
            { t: 'It is built on a `partial` function, so proofs cannot follow what it does.', ok: true, why: 'A `while` loop may not finish. A `for` over a list or a range always does, and Lean can reason about it.' },
            { t: 'It is slower than a `for` loop.', why: 'Speed is not the issue. The loop runs perfectly well.' },
            { t: 'It cannot use mutable variables.', why: 'It can, and the example in the lesson has two.' },
          ],
        },
        {
          q: 'In `let a ← xs[0]?` inside an `Option` block, what happens when the list is empty?',
          options: [
            { t: 'The whole block evaluates to `none`, and the lines after it do not run.', ok: true, why: '`←` unwraps a `some`, and on `none` it ends the block with `none`.' },
            { t: '`a` is bound to 0 and the block continues.', why: 'Lean never invents a default. The `none` is passed up.' },
            { t: 'The program stops with an error.', why: 'Nothing panics. A missing value is an ordinary result of type `Option`.' },
          ],
        },
        {
          q: 'A function has type `List Nat → Nat`. Which of these can it not do?',
          options: [
            { t: 'Print a message while it runs.', ok: true, why: 'Printing is an `IO` action, and `IO` is not in the type.' },
            { t: 'Use a `for` loop with a mutable variable.', why: '`sumLoop` has this type and does exactly that.' },
            { t: 'Return early from the middle of a loop.', why: 'An early `return` is part of the notation and has no effect outside the function.' },
          ],
        },
        {
          kind: 'multi',
          q: 'Which statements about `average` from the lesson are true?',
          options: [
            { t: 'Its type says it can fail, and with what kind of error.', ok: true, why: 'It returns `Except String Nat`: a number, or a message.' },
            { t: 'If `checkedDiv` fails, `average` returns the same error without running `return q`.', ok: true, why: '`←` passes an error up and ends the block.' },
            { t: 'A caller can use its result as a `Nat` directly.', why: 'The result is an `Except`. The caller has to handle both cases, or use `←` in a block of its own.' },
            { t: 'It may raise an exception that its type does not mention.', why: 'There are no hidden exceptions. Every way it can end is in the type.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-11-loops', kind: 'lab', level: 'core', title: 'Write nine loops',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('11'),
          'Each exercise is a function to write as a loop, with tests under it. The hole is the whole body, so begin each one with `Id.run do`.',
          { code: lean`def product (xs : List Nat) : Nat :=
  sorry` },
          'Exercise 7 proves two things about the first loop you wrote. Exercises 8 and 9 use `do` for values that may be missing or wrong, and those blocks have no `Id.run`.',
          checkLab('11'),
          solution('11'),
        ],
        hints: [
          'Exercise 3 needs a starting value for the smallest element, and 0 will not do. Match on the list first: for `first :: rest`, start both variables at `first` and loop over `rest`.',
          'Exercise 7: `decide` runs your loop for the first theorem. For the second, `simp [product]` unfolds the loop into a fold, and that is the whole proof.',
          'Exercise 9: `match s.toNat? with`, then `throw "not a number"` in the `none` case, and in the `some n` case `pure n` or `throw "too large"`. The tests check those exact messages.',
        ],
        checks: [
          '`lean Lab11.lean` prints nothing: no errors and no `sorry` warnings.',
          'I used an early `return` in one loop and a range in another.',
          'In exercise 7, I saw my loop turn into a fold.',
        ],
        notes: [
          { label: 'My loop as a fold', placeholder: 'Copy the statement of product_is_fold, and say in one sentence what its right-hand side tells you about your loop.' },
        ],
      }],
    },
    {
      id: 'loop-invariants',
      category: part,
      title: 'Loop invariants',
      summary: 'To prove a loop correct you say what is true every time round it. Lean turns that one sentence into the obligations it implies, and automation discharges them.',
      minutes: 40,
      topics: ['Invariants', 'vcgen', 'Verification conditions', 'Weak and wrong invariants', 'Early return'],
      sections: [
        {
          title: 'What is true every time round',
          body: [
            'Take the loop from the last lesson.',
            { code: lean`def sumLoop (xs : List Nat) : Nat := Id.run do
  let mut total := 0
  for x in xs do
    total := total + x
  return total`, name: 'Scratch.lean' },
            'Stop it in the middle. Some elements have been visited and some have not. What can you say about `total`? It is the sum of the visited ones. That sentence is true before the first element, after the last, and at every point between. It is the loop’s **invariant**.',
            'An invariant has to meet three obligations.',
            { steps: [
              'It holds before the loop starts, when nothing has been visited.',
              'If it holds before one trip round the loop, it holds after it.',
              'When everything has been visited, it gives you the claim you wanted.',
            ] },
            'This is induction: the first obligation is the empty case, the second is the step, and the third connects the result to your theorem. In lesson 6 you did it by hand for the helper `go`, with `generalizing acc`. Now Lean does the bookkeeping, and you supply the sentence.',
          ],
        },
        {
          title: 'The proof, in four lines',
          body: [
            'The tools for this live in the standard library. Put these lines at the top of the file.',
            { code: lean`import Std.WP
import Std.Tactic.Do
open Std.WP Lean.Order

set_option experimental.vcgen true`, name: 'Scratch.lean' },
            { code: lean`theorem sumLoop_eq (xs : List Nat) : sumLoop xs = xs.sum := by
  generalize h : sumLoop xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff total => total = pref.sum
  with finish`, name: 'Scratch.lean' },
            'Line by line:',
            { table: { head: ['Line', 'What it does'], rows: [
              ['`generalize h : sumLoop xs = r`', 'Gives the loop’s result a name, `r`. The goal becomes `r = xs.sum`.'],
              ['`apply Id.of_run_eq_wp h`', 'Restates the goal as a claim about running the program: when it finishes, its result has this property.'],
              ['`vcgen invariants`', 'Walks through the program and writes down everything that must be true for the claim to hold. For each loop it takes one invariant from you.'],
              ['`· fun pref suff total => …`', 'The invariant. `pref` is the list of elements visited so far, `suff` is the rest, and `total` is the mutable variable.'],
              ['`with finish`', 'Runs `grind` on each obligation that is left.'],
            ] } },
            'The four lines are the same for every loop in this lesson. The only line you have to think about is the invariant.',
            { native: '`vcgen` arrived in Lean 4.35 and is marked experimental, which is why the `set_option` line is there: without it every use prints a warning. Its details may change in later versions. The project you created in lesson 1 is pinned to 4.36.0, so these proofs will keep working there. The idea underneath, an invariant and its three obligations, is more than fifty years old and will not change.' },
          ],
        },
        {
          title: 'The obligations',
          body: [
            'The things `vcgen` writes down are called **verification conditions**. To see them, replace `with finish` by `all_goals trace_state`. For `sumLoop` with the invariant above, two are left for you.',
            { text: lean`case vc1
xs : List Nat
r : Nat
h : sumLoop xs = r
⊢ 0 = [].sum` },
            'This is the first obligation. Before the loop, `total` is 0 and the visited part is empty.',
            { text: lean`pref✝ : List Nat
cur✝ : Nat
suff✝ : List Nat
_h✝ : xs = pref✝ ++ cur✝ :: suff✝
b✝ : Nat
a✝ : b✝ = pref✝.sum
total : Nat := b✝ + cur✝
⊢ total = (pref✝ ++ [cur✝]).sum` },
            'This is the second. The list is split into what was visited, the current element and the rest. `b✝` is the old value of the variable, and `a✝` says the invariant held for it. The loop body has run, giving the new `total`. The goal is the invariant again, with the current element moved into the visited part.',
            'The third obligation is not shown, because Lean closed it without help. At the end of the loop the visited part is all of `xs`, so the invariant reads `total = xs.sum`, which is the claim.',
          ],
        },
        {
          title: 'When the invariant is wrong',
          body: [
            'Most of the skill is in recognising a bad invariant from the obligation that fails. There are two ways to go wrong.',
            'An invariant can be true and **too weak**. `total ≥ 0` holds at every step. But at the end it has to deliver the theorem, and it cannot.',
            { code: lean`  vcgen invariants
  · fun pref suff total => total ≥ 0` },
            { text: lean`a✝¹ : Nat
a✝ : 0 ≤ a✝¹
⊢ a✝¹ = xs.sum` },
            'All you know about the final value is that it is not negative, and you are asked to show that it is the sum. The third obligation fails. An invariant has to record everything the loop has achieved so far, not merely something true.',
            'An invariant can also be **false**. `total = pref.sum + 1` is wrong from the first moment.',
            { text: lean`xs : List Nat
r : Nat
h : sumLoop xs = r
⊢ 0 = [].sum + 1` },
            'The first obligation fails. When the second one fails, the invariant holds at the start and is broken by the loop body, which usually means it describes the wrong thing.',
            { tip: 'To find an invariant, take the theorem you want and replace the whole list by the visited part. The theorem says `sumLoop xs = xs.sum`, so the invariant is `total = pref.sum`. This works more often than not.' },
          ],
        },
        {
          title: 'Conditions and several variables',
          body: [
            'An `if` in the loop body needs nothing new from you. `vcgen` follows both branches. Here the theorem is a bound, so the invariant is a bound too.',
            { code: lean`def maxLoop (xs : List Nat) : Nat := Id.run do
  let mut best := 0
  for x in xs do
    if x > best then best := x
  return best

theorem maxLoop_ge (xs : List Nat) : ∀ x ∈ xs, x ≤ maxLoop xs := by
  generalize h : maxLoop xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff best => ∀ x ∈ pref, x ≤ best
  with finish`, name: 'Scratch.lean' },
            'With two mutable variables the invariant receives them as a pair, and says something about each.',
            { code: lean`def sumAndCount (xs : List Nat) : Nat × Nat := Id.run do
  let mut total := 0
  let mut count := 0
  for x in xs do
    total := total + x
    count := count + 1
  return (total, count)

theorem sumAndCount_eq (xs : List Nat) : sumAndCount xs = (xs.sum, xs.length) := by
  generalize h : sumAndCount xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff ⟨total, count⟩ => total = pref.sum ∧ count = pref.length
  with finish`, name: 'Scratch.lean' },
          ],
        },
        {
          title: 'Leaving the loop early',
          body: [
            'A loop with a `return` inside can end in two ways, and the invariant has to cover both. It is given in two parts: what holds while the loop is still running, and what holds if it left early with a result.',
            { code: lean`def contains (xs : List Nat) (x : Nat) : Bool := Id.run do
  for y in xs do
    if y = x then return true
  return false

theorem contains_iff (xs : List Nat) (x : Nat) : contains xs x = true ↔ x ∈ xs := by
  generalize h : contains xs x = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · Invariant.withEarlyReturnNewDo
      (onReturn := fun ret _ => ⌜ret = true ∧ x ∈ xs⌝)
      (onContinue := fun pref suff _ => ⌜x ∉ pref⌝)
  with finish`, name: 'Scratch.lean' },
            'While the loop continues, `x` has not been seen among the visited elements. If it returned early, the result is `true` and `x` is in the list. The brackets `⌜ ⌝` mark an ordinary claim, and the `_` stands for the mutable variables, of which this loop has none.',
            'The notation is heavier than the idea. If you remember one thing from this section, remember the two questions: what is true while it is still going, and what is true if it stopped?',
          ],
        },
        {
          title: 'Two routes to the same theorem',
          body: [
            'You can now prove a fact about summing a list in two ways: by induction on a recursive function, and by an invariant on a loop. They are the same argument in different clothes. And the two programs can be connected, so that everything proved about one holds for the other.',
            { code: lean`theorem total_eq_sum (xs : List Nat) : total xs = xs.sum := by
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [total, ih]

theorem sumLoop_eq_total (xs : List Nat) : sumLoop xs = total xs := by
  rw [sumLoop_eq, total_eq_sum]`, name: 'Scratch.lean' },
            'This is the pattern for verified software at any scale. A clear definition says what the answer is. An efficient program computes it. A theorem connects them, and afterwards you reason about the clear one and run the fast one.',
          ],
        },
      ],
      takeaways: [
        'An invariant says what is true every time round the loop, in terms of the elements visited so far.',
        'It must hold at the start, survive one trip round the loop, and give the theorem at the end.',
        'Which obligation fails tells you what is wrong: false at the start, broken by the body, or too weak to finish.',
        'A first guess: take the theorem and replace the whole list by the visited part.',
        'The four lines around the invariant are the same every time.',
      ],
      quiz: [
        {
          q: 'In `fun pref suff total => total = pref.sum`, what is `pref`?',
          options: [
            { t: 'The elements the loop has already visited.', ok: true, why: 'The invariant describes the variable in terms of the part of the list that is behind you.' },
            { t: 'The elements the loop has not reached yet.', why: 'That is `suff`. The two together make up the whole list.' },
            { t: 'The previous value of `total`.', why: 'The third argument is the variable. `pref` is a list.' },
          ],
        },
        {
          q: 'With some invariant, the proof stops at this obligation. What is wrong with the invariant?',
          code: lean`a✝¹ : Nat
a✝ : 0 ≤ a✝¹
⊢ a✝¹ = xs.sum`,
          options: [
            { t: 'It is true and too weak: at the end of the loop it does not give the theorem.', ok: true, why: 'Knowing that the result is not negative cannot show that it is the sum.' },
            { t: 'It is false before the loop starts.', why: 'That would show as a failed obligation about the initial value, with nothing above the line about a loop result.' },
            { t: 'It mentions the wrong variable.', why: 'It mentions the right one. It just says too little about it.' },
          ],
        },
        {
          q: 'Which obligation fails for the invariant `total = pref.sum + 1` on `sumLoop`?',
          options: [
            { t: 'The first: before the loop, `total` is 0 and `pref.sum + 1` is 1.', ok: true, why: 'The goal is `0 = [].sum + 1`, which is false.' },
            { t: 'The third: at the end it does not give the theorem.', why: 'It does not, but the proof never gets that far. The claim is already false at the start.' },
            { t: 'None. It is off by a constant, which `grind` corrects.', why: 'Nothing corrects an invariant. It is a claim, and this one is false.' },
          ],
        },
        {
          q: 'You want to prove `countZeros xs = xs.count 0` for a loop with a variable `count`. What is a good invariant?',
          options: [
            { t: '`fun pref suff count => count = pref.count 0`', ok: true, why: 'It is the theorem with the whole list replaced by the visited part.' },
            { t: '`fun pref suff count => count = xs.count 0`', why: 'That is false until the loop has finished. Before the first element `count` is 0.' },
            { t: '`fun pref suff count => count ≤ pref.length`', why: 'True at every step, and too weak to give an equation at the end.' },
          ],
        },
        {
          q: 'How does the invariant for a loop with two mutable variables receive them?',
          options: [
            { t: 'As a pair, taken apart with `⟨total, count⟩`.', ok: true, why: 'Several variables travel together as a tuple, as the last lesson said.' },
            { t: 'As two separate invariants, one for each.', why: 'There is one invariant for each loop. It can say something about both variables with `∧`.' },
            { t: 'Only the first variable is available.', why: 'All of them are. The invariant for `sumAndCount` constrains both.' },
          ],
        },
        {
          q: 'How does this lesson’s method relate to the induction with `generalizing acc` in lesson 6?',
          options: [
            { t: 'It is the same argument. The invariant is the generalized claim, and `vcgen` writes the induction.', ok: true, why: 'Both say what the accumulated value is after any number of elements, and both prove it by a step from one element to the next.' },
            { t: 'It is a different kind of proof that the kernel checks less strictly.', why: 'What `vcgen` produces is checked by the kernel like any other proof.' },
            { t: 'Induction is for lists and invariants are for arrays.', why: 'Every loop in this lesson runs over a list.' },
          ],
        },
        {
          q: 'A loop contains `return true`. What does its invariant need that a simple loop’s does not?',
          options: [
            { t: 'A second part, saying what holds if the loop left early.', ok: true, why: 'The loop can end in two ways. `onContinue` covers the normal path and `onReturn` the early exit.' },
            { t: 'A proof that the loop finishes.', why: 'A `for` over a list always finishes. Nothing extra is needed for that.' },
            { t: 'Nothing. Early return is handled automatically.', why: 'The exit itself is. But what is known at that point is something only you can state.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-12-invariants', kind: 'lab', level: 'core', title: 'Find seven invariants',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('12'),
          'The loops are written for you. Each theorem is one hole, and every hole is filled by the same four lines with a different invariant. The comment at the top of the file repeats them.',
          'Before you write an invariant, say it aloud as a sentence about the elements visited so far. Then use the tip from the lesson: take the right-hand side of the theorem and put `pref` where it has `xs`.',
          'Exercise 6 asks you to try a weak invariant first and read the obligation that fails. Use `all_goals trace_state` in place of `with finish` to see the obligations.',
          checkLab('12'),
          solution('12'),
        ],
        hints: [
          'Exercise 2: the theorem’s right-hand side is `(xs.filter (· % 2 = 0)).sum`, so the invariant is `fun pref suff total => total = (pref.filter (· % 2 = 0)).sum`.',
          'Exercise 3: the invariant for the first theorem is `fun pref suff ok => ok = pref.all (· < limit)`. The second theorem is then `simp [allBelow_eq]`.',
          'Exercise 5: with two variables, write `fun pref suff ⟨lo, hi⟩ => ∀ x ∈ pref, lo ≤ x ∧ x ≤ hi`. Exercise 7 copies the proof of `contains_iff` with `0` in place of `x`.',
        ],
        checks: [
          '`lean Lab12.lean` prints nothing: no errors and no `sorry` warnings.',
          'For exercise 6, I saw the obligation that a too-weak invariant cannot meet.',
          'I can state each invariant as a sentence about the elements visited so far.',
        ],
        notes: [
          { label: 'The obligation that failed', placeholder: 'Paste the goal from exercise 6 that total ≥ 0 could not prove.' },
          { label: 'One invariant in words', placeholder: 'Pick an exercise and write its invariant as an English sentence.' },
        ],
      }],
    },
    {
      id: 'machine-integers',
      category: part,
      title: 'Machine integers',
      summary: 'Real programs count in 8, 32 or 64 bits, and arithmetic that overflows wraps round. Facts you proved about natural numbers can be false there, and Lean will show you the input that breaks them.',
      minutes: 40,
      topics: ['UInt8 to UInt64', 'Wraparound', 'bv_decide', 'Counterexamples', 'The midpoint bug', 'toNat'],
      sections: [
        {
          title: 'Numbers that wrap',
          body: [
            '`Nat` has no largest number. A machine register does. Lean has the fixed-width types a C or Rust programmer expects: `UInt8`, `UInt16`, `UInt32` and `UInt64` without a sign, and `Int8` to `Int64` with one. Arithmetic on them keeps the low bits of the result and discards the rest.',
            { table: { head: ['Expression', 'Value', 'Why'], rows: [
              ['`(255 : UInt8) + 1`', '`0`', '256 does not fit in 8 bits.'],
              ['`(0 : UInt8) - 1`', '`255`', 'Subtraction wraps the other way.'],
              ['`(200 : UInt8) * 2`', '`144`', '400 minus 256.'],
              ['`(3000000000 : UInt32) + 3000000000`', '`1705032704`', 'Six billion does not fit in 32 bits.'],
            ] } },
            'No error is raised and nothing is flagged. The program carries on with the wrong number.',
            { compare: 'A Python `int` grows as needed, so it behaves like Lean’s `Nat` and `Int`. You meet wraparound in Python only through NumPy arrays or `struct`. In C, Rust and every systems language it is the default, and Rust makes you choose: `a + b` panics on overflow in a debug build, and `wrapping_add` and `checked_add` say which behavior you mean.' },
          ],
        },
        {
          title: 'True for numbers, false for machines',
          body: [
            'Adding one makes a number larger. Over `Nat` that is a theorem.',
            { code: lean`example (x : Nat) : x + 1 > x := by
  omega`, name: 'Scratch.lean' },
            'State the same thing for 32-bit integers and it is false. The tactic for fixed-width integers is `bv_decide`. Add `import Std.Tactic.BVDecide` at the top of the file to use it.',
            { code: lean`example (x : UInt32) : x + 1 > x := by
  bv_decide` },
            { text: lean`The prover found a counterexample, consider the following assignment:
x = 4294967295` },
            'It does not just fail. It hands you the input: the largest 32-bit value, whose successor is 0. Exclude that one value and the claim is true, and `bv_decide` proves it for the other 4,294,967,295.',
            { code: lean`example (x : UInt32) (h : x < 4294967295) : x + 1 > x := by
  bv_decide`, name: 'Scratch.lean' },
            { aside: '`bv_decide` does not try the values one at a time. It turns the claim into a formula about the individual bits and gives that to a SAT solver, a program that searches for an assignment of bits that makes a formula true. The solver either finds bits that break your claim, which become the counterexample, or produces a certificate that none exist, which Lean checks.' },
          ],
        },
        {
          title: 'The midpoint, again',
          body: [
            'Lesson 10 computed the middle of a range as `lo + (hi - lo) / 2`. The obvious formula is `(lo + hi) / 2`, and over `Nat` the two are equal. In 32 bits the obvious one overflows.',
            { code: lean`theorem mid_naive (lo hi : UInt32) (h : lo ≤ hi) : lo ≤ (lo + hi) / 2 := by
  bv_decide` },
            { text: lean`The prover found a counterexample, consider the following assignment:
hi = 4294967295
lo = 4294967295` },
            'The sum wraps before the division happens, and the “midpoint” comes out below `lo`. For a search over an array, that is an index far outside the range you were looking at. The Java standard library’s binary search had exactly this bug for nearly ten years, because it takes an array of more than a billion elements to trigger it.',
            'The subtraction form cannot overflow, and here that is a theorem about every pair of 32-bit values, and of 64-bit values too.',
            { code: lean`theorem mid_safe (lo hi : UInt32) (h : lo ≤ hi) :
    lo ≤ lo + (hi - lo) / 2 ∧ lo + (hi - lo) / 2 ≤ hi := by
  bv_decide

theorem mid_safe_64 (lo hi : UInt64) (h : lo ≤ hi) :
    lo ≤ lo + (hi - lo) / 2 ∧ lo + (hi - lo) / 2 ≤ hi := by
  bv_decide`, name: 'Scratch.lean' },
            'No test suite covers 2 to the power 128 pairs of inputs. This does.',
          ],
        },
        {
          title: 'Bit tricks, proved for every input',
          body: [
            'Low-level code replaces arithmetic with shifts and masks. Each replacement is a claim that two expressions agree on every input, which is exactly what `bv_decide` settles.',
            { code: lean`theorem times_two (x : UInt32) : x <<< 1 = x * 2 := by
  bv_decide

theorem low_bits (x : UInt32) : x % 16 = x &&& 15 := by
  bv_decide

theorem average_no_overflow (a b : UInt32) :
    (a &&& b) + ((a ^^^ b) >>> 1) = a / 2 + b / 2 + (a &&& b &&& 1) := by
  bv_decide`, name: 'Scratch.lean' },
            '`<<<` and `>>>` shift, `&&&` is bitwise and, and `^^^` is exclusive or. The third theorem is an average that never overflows: the bits the two numbers share, plus half of the bits where they differ.',
            'Signed integers have a corner of their own. The absolute value of a number should not be negative.',
            { code: lean`theorem abs_nonneg (x : Int32) : (if x < 0 then -x else x) ≥ 0 := by
  bv_decide` },
            { text: lean`The prover found a counterexample, consider the following assignment:
x = -2147483648` },
            'The most negative 32-bit number has no positive counterpart, so negating it gives itself back. Every language with fixed-width signed integers has this corner, and code that calls `abs` and then assumes a non-negative result has a bug at exactly one input.',
            { pitfall: ['The solver has limits. Multiplication of two 32-bit values is a very large formula, and a claim that depends on its algebra can run out of time.', { code: lean`example (x y : UInt32) : x * y = y * x := by
  bv_decide` }, { text: lean`The SAT solver timed out while solving the problem.` }, 'That is not a counterexample. The claim is true, and the library has it as `UInt32.mul_comm`. A timeout means only that this tool could not decide.'] },
          ],
        },
        {
          title: 'Machine integers against the real ones',
          body: [
            'A specification is usually about true numbers: “the result is the sum”. The program computes in 8 or 64 bits. To connect them, `x.toNat` gives the natural number a machine integer stands for. Claims that mix the two are outside what `bv_decide` handles, and `grind` takes over.',
            { code: lean`theorem add_exact (a b : UInt8) (h : a.toNat + b.toNat < 256) : (a + b).toNat = a.toNat + b.toNat := by
  grind`, name: 'Scratch.lean' },
            'Read it as a contract: if the true sum fits, the machine sum is the true sum. The hypothesis is the precondition a caller has to meet.',
            'A program can also detect the overflow. This is the standard test: an unsigned sum has wrapped exactly when it is smaller than one of its operands.',
            { code: lean`theorem overflow_test (a b : UInt8) : (a + b < a) ↔ (a.toNat + b.toNat ≥ 256) := by
  grind`, name: 'Scratch.lean' },
            'With that test you can write an addition that stops at the largest value, and prove what it computes against the real numbers.',
            { code: lean`def satAdd (a b : UInt8) : UInt8 :=
  if a + b < a then 255 else a + b

theorem satAdd_spec (a b : UInt8) : (satAdd a b).toNat = min 255 (a.toNat + b.toNat) := by
  unfold satAdd
  grind`, name: 'Scratch.lean' },
            'This is the shape of a verified low-level function. The code is in machine integers, with the tricks a machine needs. The theorem is in true numbers, and says what the code means.',
          ],
        },
        {
          title: 'What these proofs rest on',
          body: [
            'One thing is different about a proof by `bv_decide`, and lesson 14 will come back to it. Ask Lean what a theorem depends on.',
            { code: lean`#print axioms mid_safe` },
            { text: lean`'mid_safe' depends on axioms: [propext, Classical.choice, Quot.sound, mid_safe._native.bv_decide.ax_1_5]` },
            'The first three are standard and appear under most theorems. The fourth was added by `bv_decide`. Checking the solver’s certificate is a large computation, so Lean runs it as compiled code and records, as an axiom, that it trusts the outcome. The theorem is as reliable as Lean’s compiler, which is a larger thing to trust than its kernel.',
            'Compare a proof by `grind`, which leaves nothing extra.',
            { text: lean`'satAdd_spec' depends on axioms: [propext, Classical.choice, Quot.sound]` },
          ],
        },
      ],
      takeaways: [
        'Fixed-width arithmetic wraps without any error, so facts about natural numbers can be false for machine integers.',
        '`bv_decide` proves a claim for every bit pattern, or shows the input that breaks it.',
        '`(lo + hi) / 2` overflows. `lo + (hi - lo) / 2` does not, and that is a theorem.',
        '`toNat` connects a machine integer to the number it stands for, and `grind` handles claims that mix the two.',
        'A timeout is not a counterexample, and a proof by `bv_decide` trusts the compiler as well as the kernel.',
      ],
      quiz: [
        {
          q: 'What is `(200 : UInt8) * 2`?',
          options: [
            { t: '`144`', ok: true, why: 'The true product is 400. Eight bits hold values up to 255, and 400 − 256 is 144.' },
            { t: '`400`', why: '400 needs nine bits. A `UInt8` keeps only the low eight.' },
            { t: '`255`', why: 'That would be saturating arithmetic. Ordinary machine arithmetic wraps.' },
          ],
        },
        {
          q: '`bv_decide` rejects `x - 1 < x` for `x : UInt8`. Which input does it report?',
          options: [
            { t: '`x = 0`, because `0 - 1` wraps to 255.', ok: true, why: '255 is not less than 0. For every other value the claim holds.' },
            { t: '`x = 255`, the largest value.', why: '`255 - 1` is 254, which is less than 255. The trouble is at the other end.' },
            { t: 'None. It times out.', why: 'This claim is small. The solver answers at once, with a counterexample.' },
          ],
        },
        {
          q: 'Why is `(lo + hi) / 2` a wrong midpoint for 32-bit integers when it is right for natural numbers?',
          options: [
            { t: 'The sum can exceed 32 bits and wrap before the division.', ok: true, why: 'With both values near the top of the range, the wrapped sum is small, and half of it is below `lo`.' },
            { t: 'Division rounds differently on machine integers.', why: 'Unsigned division rounds down in both. The error is in the addition.' },
            { t: 'It is right for both. The bug needs signed integers.', why: '`bv_decide` gives a counterexample for `UInt32`, which has no sign.' },
          ],
        },
        {
          q: 'What does `bv_decide` do when a claim is false?',
          options: [
            { t: 'It reports values for the variables that break the claim.', ok: true, why: 'The solver finds bits that falsify the formula, and Lean translates them back into your variables.' },
            { t: 'It fails with a list of unsolved goals.', why: 'That is how a tactic such as `simp` fails. `bv_decide` gives a concrete input.' },
            { t: 'It proves the negation of the claim.', why: 'It reports an error with the counterexample. Nothing is added to the file.' },
          ],
        },
        {
          q: '`bv_decide` times out on `x * y = y * x`. What follows?',
          options: [
            { t: 'Nothing about whether it is true. The solver ran out of time, and the library proves it as `UInt32.mul_comm`.', ok: true, why: 'A timeout is the absence of an answer. Multiplication is hard at the level of bits.' },
            { t: 'The claim is false for some large inputs.', why: 'A false claim produces a counterexample, not a timeout.' },
            { t: 'Multiplication is not supported.', why: 'It is supported, and `x <<< 1 = x * 2` was proved in the lesson. It is expensive when two variables are multiplied.' },
          ],
        },
        {
          q: '`#print axioms mid_safe` lists an axiom named after the theorem, as well as the three standard ones. What does it tell you?',
          options: [
            { t: 'The proof relies on a result computed by compiled code, so it trusts Lean’s compiler as well as its kernel.', ok: true, why: '`bv_decide` runs the certificate check natively and records that trust as an axiom.' },
            { t: 'The theorem contains a `sorry`.', why: 'A `sorry` shows up as `sorryAx`. This axiom has a different name and a different meaning.' },
            { t: 'The theorem has not really been proved.', why: 'It has, on the assumption that the compiled check ran correctly. That assumption is what the axiom states.' },
          ],
        },
        {
          q: 'Why does `abs_nonneg` fail for `Int32` at `-2147483648`?',
          options: [
            { t: 'Its negation is not representable in 32 bits, so negating it gives the same number back.', ok: true, why: 'The range runs from −2147483648 to 2147483647. There is no +2147483648.' },
            { t: 'The comparison `x < 0` is wrong for the smallest value.', why: 'The comparison is right: the value is negative. The negation is what fails.' },
            { t: 'Signed integers are not supported by `bv_decide`.', why: 'They are. It found this counterexample.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-13-machine-integers', kind: 'lab', level: 'core', title: 'Prove the tricks and find the corners',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('13'),
          'Most holes are one line: `bv_decide`, sometimes after `unfold`. The work is in the statements. Three of them are false as written.',
          { code: lean`theorem pred_lt (x : UInt8) : x - 1 < x := by
  sorry` },
          'For those, put `bv_decide` in place of `sorry`, read the counterexample, and repair the statement with the weakest hypothesis that makes it true. Then the same `bv_decide` proves it.',
          'Exercises 5 and 6 connect machine integers to natural numbers with `toNat`. Those are for `grind`.',
          checkLab('13'),
          solution('13'),
        ],
        hints: [
          'Exercise 3: with both inputs below 128 the true sum is below 256, so it cannot wrap. That is the largest bound that works.',
          'Exercise 6: the function is `if a + b < a then none else some (a + b)`. For the theorem, `unfold checkedAdd at h` and then `grind`.',
          'Exercise 7: the one input that breaks `neg_pos` is the most negative value, `-128`. Add the hypothesis `(hmin : x ≠ -128)`.',
        ],
        checks: [
          '`lean Lab13.lean` prints nothing: no errors and no `sorry` warnings.',
          'For each false statement, I read the counterexample before I changed anything.',
          'I ran `#print axioms` on one theorem proved by `bv_decide` and one proved by `grind`, and compared them.',
        ],
        notes: [
          { label: 'Three counterexamples', placeholder: 'For exercises 2, 3 and 7, paste the assignment that bv_decide reported.' },
          { label: 'Axioms compared', placeholder: 'Paste the two #print axioms lines.' },
        ],
      }],
    },
  );
})();
