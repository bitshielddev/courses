// Part 1: Lean as a language. Running code, types and data, and recursion that provably ends.
(() => {
  const lean = String.raw; // lean`…` keeps backslashes as written
  const part = 'Part 1 · Lean as a language';
  const { fetchLab, checkLab, solution } = window.LEAN_COURSE;

  (window.C_LESSONS ||= []).push(
    {
      id: 'first-contact',
      category: part,
      title: 'First contact',
      summary: 'Install Lean, run a function, and prove a first theorem about it. A test checks the inputs you thought of. A theorem covers all of them.',
      minutes: 30,
      topics: ['Installing Lean', '#eval and #check', 'theorem', 'The goal panel', 'sorry'],
      sections: [
        {
          title: 'A test checks some inputs. A theorem covers all of them',
          body: [
            'Here is a function and its tests in Python.',
            { code: `def double(n):
    return n * 2

assert double(21) == 42
assert double(0) == 0`, lang: 'python', name: 'double.py' },
            'The two assertions check two inputs. They say nothing about 22, or about the input that arrives in production next year. You can add more cases, or generate thousands at random, and you still have a sample.',
            'Here is the same function in Lean, with a claim about **every** natural number.',
            { code: lean`def double (n : Nat) : Nat :=
  n * 2

theorem double_eq (n : Nat) : double n = n + n := by
  unfold double
  omega`, name: 'Scratch.lean' },
            'The last two lines are a proof. Lean checks it when it checks the file, the way a compiler checks types. If the proof were wrong, or the claim false, the file would not compile. Nothing runs, and no inputs are tried.',
            'Lean is one language with two jobs. It is a functional programming language with a compiler, and its type checker is strict enough to check proofs. In this course you write programs in Lean, state what **correct** means as a theorem, and prove it.',
            { compare: 'Think of a theorem as a test with no sample. `assert double(n) == n + n` inside a loop checks the values the loop reaches. `double_eq` is checked once, before the program exists, for all of them. It costs nothing at run time: a proof is erased when the program is compiled.' },
          ],
        },
        {
          title: 'Install Lean and create a project',
          body: [
            'Lean is installed through **elan**, a small tool that downloads the Lean version each project asks for. It plays the part of `pyenv`. The build tool and package manager is **lake**, and it comes with Lean.',
            'The official route is to install VS Code and its Lean 4 extension, which sets up elan for you. Follow the guide, then come back.',
            { link: 'https://lean-lang.org/install/', label: 'Lean · install guide' },
            'If you prefer a terminal, this installs elan on macOS or Linux. Open a new terminal afterwards so that `lake` and `lean` are on your path.',
            { shell: 'curl https://elan.lean-lang.org/elan-init.sh -sSf | sh', name: 'Terminal · install elan (macOS or Linux)' },
            'Now create the project you will use for the whole course. The `+…` part selects Lean 4.36.0, the version these lessons were checked against, and records it in the file `lean-toolchain`. The first run downloads that version.',
            { shell: lean`lake +leanprover/lean4:v4.36.0 new field_manual
cd field_manual
cat lean-toolchain
lake build`, name: 'Terminal · create the project' },
            'The build should end with `Build completed successfully`. Open the `field_manual` folder in your editor and create a file named `Scratch.lean` beside `lakefile.toml`. You will type the examples from each lesson into it.',
            { native: 'Lean is edited through its language server. VS Code with the Lean 4 extension is the supported setup. Neovim with the `lean.nvim` plugin also works well. Whichever you choose, you need the panel that shows Lean’s messages and the current goal: VS Code calls it the **InfoView**, and these lessons call it the goal panel.' },
            { tip: 'In VS Code, the first Lean file you open may take a minute while the toolchain is prepared. If the goal panel is not visible, open the command palette and run “Lean 4: Infoview: Toggle Infoview”.' },
          ],
        },
        {
          title: 'Run code where you write it',
          body: [
            'A Lean file is checked continuously as you type. Two commands ask questions about your code. `#eval` runs an expression and shows the result. `#check` shows a type without running anything.',
            { code: lean`def double (n : Nat) : Nat :=
  n * 2

#eval double 21
#check double`, name: 'Scratch.lean' },
            'Put the cursor on the `#eval` line. The goal panel shows the first message below, and the `#check` line shows the second.',
            { text: lean`42` },
            { text: lean`double (n : Nat) : Nat` },
            'Read the definition from left to right. `(n : Nat)` is a parameter named `n` of type `Nat`, the natural numbers: 0, 1, 2 and so on, with no upper limit. The `: Nat` after it is the return type. The body follows `:=`. There is no `return`: the body is an expression, and its value is the result.',
            'A function call has no parentheses and no commas: `double 21`. Parentheses only group. Application binds tighter than any operator, so `double 2 + 1` means `(double 2) + 1`, which is 5. Write `double (2 + 1)` to get 6.',
            { compare: 'A Python type hint such as `def double(n: int) -> int` is a comment that tools may check. In Lean the types are part of the program. `double "21"` is rejected before anything runs, and so is a body whose value is not a `Nat`.' },
            { tip: ['To check a file from a terminal, run `lean` on it from the project folder. It prints what the goal panel would show, with line numbers.', { shell: 'lean Scratch.lean', name: 'Terminal · check one file' }] },
          ],
        },
        {
          title: 'A first theorem',
          body: [
            'A claim such as `double 21 = 42` is an expression too. Its type is `Prop`, the type of propositions: statements that can be proved.',
            { code: lean`#check double 21 = 42` },
            { text: lean`double 21 = 42 : Prop` },
            'A theorem gives a proposition a name and a proof.',
            { code: lean`theorem double_21 : double 21 = 42 := by
  decide`, name: 'Scratch.lean' },
            'It has the same shape as a definition: a name, a colon, what it claims, then `:=` and the proof. The word `by` starts a proof written as **tactics**, which are commands that work on the claim until nothing is left to show. `decide` is a tactic for claims with no variables: it evaluates both sides and compares them.',
            'Now try a false claim.',
            { code: lean`theorem double_21_wrong : double 21 = 43 := by
  decide` },
            { text: lean`Tactic ` + '`decide`' + lean` proved that the proposition
  double 21 = 43
is false` },
            'That is an error, and it is reported while you edit. A false theorem never becomes part of a program.',
            '`decide` works by running the computation, so it needs concrete values. To prove something for every `n` you have to reason. Type this version and put the cursor at the end of each line in turn.',
            { code: lean`theorem double_eq (n : Nat) : double n = n + n := by
  unfold double
  omega`, name: 'Scratch.lean' },
            'With the cursor after `by`, the goal panel shows what you know and what is left to prove.',
            { text: lean`n : Nat
⊢ double n = n + n` },
            'Everything above the `⊢` line is a **hypothesis**: something you may use. Here it is only that `n` is some natural number. The line after `⊢` is the **goal**. `unfold double` replaces the function by its body, and the goal changes.',
            { text: lean`n : Nat
⊢ n * 2 = n + n` },
            'This is plain arithmetic. `omega` is a tactic that proves claims built from `+`, multiplication by a constant, `=`, `<` and `≤` over natural numbers and integers. It closes the goal, and the panel reports that no goals remain.',
            { aside: 'A tactic does not decide what is true. It builds a proof, and a small program called the **kernel** then checks that proof step by step. If `omega` had a bug and built nonsense, the kernel would reject it. Lesson 14 looks at exactly what you are trusting.' },
          ],
        },
        {
          title: 'An honest hole',
          body: [
            'You will not always know how to finish a proof. `sorry` closes any goal, and marks the result as unfinished.',
            { code: lean`theorem double_pos (n : Nat) (h : n > 0) : double n > 0 := by
  sorry` },
            { text: 'declaration uses `sorry`' },
            'The file still compiles, with that warning. This is how you sketch a large proof: state the steps, `sorry` each one, then fill them in. It is also how the labs in this course are written. Each lab is a Lean file full of holes, and it is finished when Lean has nothing left to report.',
            'This theorem also takes a second argument, `(h : n > 0)`. It is a hypothesis: the claim is only made for an `n` that is positive. Inside the proof, `h` appears above the `⊢` line.',
            { pitfall: 'A theorem proved with `sorry` proves nothing, and so does every theorem that uses it. The warning is easy to miss in a large build. Lesson 14 shows how to audit a finished proof for holes.' },
          ],
        },
      ],
      takeaways: [
        'A proof is checked when the file is checked. A wrong proof is a compile error, and a correct one costs nothing at run time.',
        '`#eval` runs an expression and `#check` shows its type. The statement of a theorem is itself an expression, of type `Prop`.',
        'In the goal panel, hypotheses are above `⊢` and the claim still to prove is below it.',
        '`decide` evaluates a claim that has no variables. `unfold` then `omega` handles linear arithmetic with variables.',
        '`sorry` closes any goal and leaves a warning. A lab is done when Lean reports nothing.',
      ],
      quiz: [
        {
          q: 'A Python test asserts `double(n) == n + n` for every `n` from 0 to 999. What does the Lean theorem `double_eq` add?',
          options: [
            { t: 'It covers every natural number, including the ones no test ran.', ok: true, why: 'The statement quantifies over all `n : Nat`, and the proof is checked for that statement as a whole.' },
            { t: 'It makes the same check, but faster, because Lean is compiled.', why: 'No inputs are tried at all. The proof is an argument about `n * 2` and `n + n` for an arbitrary `n`.' },
            { t: 'It adds a check that runs each time `double` is called.', why: 'A theorem is checked once, when the file is checked. Nothing is added to the compiled function.' },
          ],
        },
        {
          q: 'What does `#eval double 2 + 1` show?',
          options: [
            { t: '`5`', ok: true, why: 'Application binds tighter than `+`, so this is `(double 2) + 1`.' },
            { t: '`6`', why: 'That is `double (2 + 1)`. Without parentheses the function takes only the `2`.' },
            { t: 'An error, because the argument needs parentheses.', why: 'A call needs no parentheses. They are only for grouping.' },
          ],
        },
        {
          q: 'You add this theorem to a file. What happens?',
          code: lean`theorem double_21_wrong : double 21 = 43 := by
  decide`,
          options: [
            { t: 'Lean reports an error when it checks the file.', ok: true, why: '`decide` evaluates the claim, finds it false and fails. There is no theorem named `double_21_wrong` afterwards.' },
            { t: 'The file compiles, and the program fails when that line runs.', why: 'A theorem is never run. Its proof is checked with the rest of the file.' },
            { t: 'The file compiles with a warning that the theorem is false.', why: 'Only `sorry` produces a warning. A proof that does not work is an error.' },
          ],
        },
        {
          q: 'The goal panel shows this. What may you use, and what must you show?',
          code: lean`a b : Nat
h : a = b + 1
⊢ double a = double b + 2`,
          options: [
            { t: 'You may use `h`. You must show the line after `⊢`.', ok: true, why: 'Lines above `⊢` are hypotheses, given to you. The line below is the goal.' },
            { t: 'You must show both `h` and the line after `⊢`.', why: '`h` is an assumption of the theorem. Whoever uses the theorem has to supply it.' },
            { t: 'The line after `⊢` is already proved. You must show `h`.', why: 'It is the other way round: `⊢` marks what is still to be proved.' },
          ],
        },
        {
          q: 'Why does `decide` prove `double 21 = 42` but not `double n = n + n` for a variable `n`?',
          options: [
            { t: 'It works by evaluating the claim, and there is no single value of `n` to evaluate.', ok: true, why: 'A claim about every `n` covers infinitely many cases. It needs an argument, such as unfolding the definition and using arithmetic.' },
            { t: 'It only works on `Bool`, and `=` produces a `Prop`.', why: '`double 21 = 42` is a `Prop` too, and `decide` proves it. The difference is the variable.' },
            { t: '`double` has to be marked as computable before `decide` can run it.', why: 'Ordinary definitions are computable. `decide` ran `double 21` without any marking.' },
          ],
        },
        {
          q: 'A file contains a theorem whose proof is `sorry`. It compiles with one warning. What do you know about the theorem?',
          options: [
            { t: 'Its statement makes sense to Lean. Nothing says it is true.', ok: true, why: 'The statement type-checks, so it is a well-formed claim. `sorry` stands in for a proof that does not exist yet.' },
            { t: 'Lean tried it on sample inputs and found no counterexample.', why: 'Lean does not test claims. `sorry` is accepted without any evidence.' },
            { t: 'It is true, but the proof was too slow to finish.', why: '`sorry` is something a person writes. Lean never inserts it to save time.' },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these does Lean check when it checks your file, before any program runs?',
          options: [
            { t: 'That every function body has the type its signature promises.', ok: true, why: 'Type checking covers every definition.' },
            { t: 'That every theorem’s proof establishes its statement.', ok: true, why: 'Proof checking is part of type checking.' },
            { t: 'That each `#guard` expression evaluates to `true`.', ok: true, why: '`#guard` runs its expression while the file is checked, like `#eval`.' },
            { t: 'That each function finishes quickly on large inputs.', why: 'Lean checks that a function terminates, as lesson 3 shows, but says nothing about how long it takes.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-01-first-contact', kind: 'lab', level: 'core', title: 'Fill your first holes',
        prompt: [
          'Put the lab file in your `field_manual` folder, beside `lakefile.toml`, and open it in your editor.',
          ...fetchLab('01'),
          'Every `sorry` is a hole. The first is a function body and the rest are proofs. The comments in the file say what each one wants. Keep the goal panel open and move the cursor through a proof to watch the goal change.',
          'A `#guard` line is a test that runs while the file is checked. It reports an error until the expression after it is `true`.',
          { code: lean`#guard triple 7 == 21
#guard triple 0 == 0` },
          'Check the whole file from a terminal whenever you like. Each remaining hole produces a warning, and each test that cannot run yet produces an error. You are finished when the command prints nothing.',
          checkLab('01'),
          'Exercise 6 is different: its statement is false, so it cannot be proved as written. Use `#eval` to find an `n` that breaks it, correct the right-hand side, and prove the corrected claim.',
          solution('01'),
        ],
        hints: [
          'Every proof here follows the pattern from the lesson: `unfold` the functions that appear in the goal, then let `omega` do the arithmetic. Exercise 2 has no variables, so `decide` is enough.',
          'If `omega` fails, read the goal. A name such as `triple` that is still there is opaque to `omega`: unfold it first. `unfold triple double` unfolds both.',
          'For exercise 6, compare `#eval double (0 + 1)` with `#eval double 0 + 1`. Doubling the next number adds 2, so the statement should end in `double n + 2`.',
        ],
        checks: [
          '`lean Lab01.lean` prints nothing: no errors and no `sorry` warnings.',
          'I stepped through a proof and saw the goal change after `unfold`.',
          'For exercise 6, I found an input that breaks the original claim before I changed it.',
        ],
        notes: [
          { label: 'A goal, before and after', placeholder: 'Paste the goal panel for exercise 3 with the cursor before unfold triple, and again after it.' },
          { label: 'Counterexample for exercise 6', placeholder: 'Which n did you try, and what did each side evaluate to?' },
        ],
      }],
    },
    {
      id: 'functions-types-data',
      category: part,
      title: 'Functions, types and data',
      summary: 'Enough of Lean as a programming language to write the programs you will verify: several arguments, structures, enumerations, Option and lists.',
      minutes: 35,
      topics: ['Currying', 'Nat and Int', 'structure', 'inductive and match', 'Option', 'List'],
      sections: [
        {
          title: 'Functions of several arguments',
          body: [
            'Parameters of the same type can share one pair of parentheses.',
            { code: lean`def area (width height : Nat) : Nat :=
  width * height

#eval area 3 4`, name: 'Scratch.lean' },
            { text: lean`12` },
            'A function of two arguments is really a function that takes the first and returns a function waiting for the second. Giving it one argument is not an error. `#check area 3` shows what you get.',
            { text: lean`area 3 : Nat → Nat` },
            'Read `Nat → Nat` as “a function from `Nat` to `Nat`”. An argument of the wrong type is an error, found when the file is checked. Here is `#eval area "3" 4`.',
            { text: lean`Application type mismatch: The argument
  "3"
has type
  String
but is expected to have type
  Nat
in the application
  area "3"` },
            '`if` is an expression with a value, so it always has an `else`. `let` names an intermediate value.',
            { code: lean`def clamp (lo hi x : Int) : Int :=
  if x < lo then lo
  else if x > hi then hi
  else x

def hypotSq (a b : Nat) : Nat :=
  let a2 := a * a
  let b2 := b * b
  a2 + b2`, name: 'Scratch.lean' },
            'A function without a name is written `fun x => …`. A centered dot is shorthand for the same thing: `(· * 10)` means `fun x => x * 10`. Both lines below evaluate to `[10, 20, 30]`.',
            { code: lean`#eval [1, 2, 3].map (fun x => x * 10)
#eval [1, 2, 3].map (· * 10)` },
            { pitfall: 'A negative argument needs parentheses. `clamp 0 10 -3` is read as `(clamp 0 10) - 3`, a subtraction from a function, which is a type error. Write `clamp 0 10 (-3)`.' },
            { compare: 'In Python, `area(3)` raises `TypeError` when that line runs. In Lean, `area 3` is a value: a function you can pass to `map`. And where Python reports a wrong argument type only when the call is reached, Lean reports it for code that never runs.' },
          ],
        },
        {
          title: 'Numbers that never fail',
          body: [
            'A Lean function returns a value for every input of its type. Nothing raises an exception. That shapes how numbers behave, and you need to know it before you prove anything about them.',
            { table: { head: ['Expression', 'Value', 'Why'], rows: [
              ['`(3 : Nat) - 5`', '`0`', 'There is no natural number below zero, so subtraction stops there.'],
              ['`(3 : Int) - 5`', '`-2`', '`Int` has negative numbers.'],
              ['`7 / 2`', '`3`', 'Division on `Nat` rounds down.'],
              ['`7 / 0`', '`0`', 'Division by zero is defined to be zero.'],
            ] } },
            'The annotation `(3 : Nat)` says which type a literal has. Without one, a literal such as `7` is a `Nat`.',
            'Lean has two kinds of truth. `2 + 2 == 4` is a `Bool`: a value, `true` or `false`, computed at run time. `2 + 2 = 4` is a `Prop`: a claim that can be proved. You can write either in an `if`, because Lean knows how to decide equality of numbers.',
            { code: lean`#check 2 + 2 == 4
#check 2 + 2 = 4` },
            { text: lean`2 + 2 == 4 : Bool` },
            { text: lean`2 + 2 = 4 : Prop` },
            { pitfall: 'Truncated subtraction is the most common surprise in proofs about natural numbers. `a - b + b = a` is false when `b` is larger than `a`. The claim needs the hypothesis `b ≤ a`, and `omega` knows this.' },
          ],
        },
        {
          title: 'Structures',
          body: [
            'A structure groups named fields.',
            { code: lean`structure Point where
  x : Int
  y : Int
deriving Repr

def origin : Point :=
  { x := 0, y := 0 }

def Point.shift (p : Point) (dx : Int) : Point :=
  { p with x := p.x + dx }

#eval origin.shift 3`, name: 'Scratch.lean' },
            { text: lean`{ x := 3, y := 0 }` },
            '`deriving Repr` asks Lean to generate the code that turns a `Point` into text for display. A function named `Point.shift` can be called with a dot: `origin.shift 3` is `Point.shift origin 3`.',
            'Values never change. `{ p with x := … }` builds a new point and leaves `p` as it was. After the call above, `origin` is still `{ x := 0, y := 0 }`.',
            { compare: 'A structure is a `@dataclass(frozen=True)`. There is no assignment to a field, no `self`, and no aliasing to think about: two names can never observe each other’s changes, because there are no changes. That is a large part of why Lean programs are easier to prove things about than Python programs.' },
          ],
        },
        {
          title: 'Enumerations and match',
          body: [
            'An `inductive` type lists its possible values, called **constructors**. A function on it gives one case for each.',
            { code: lean`inductive Light where
  | red
  | amber
  | green
deriving Repr

def Light.next : Light → Light
  | .red => .green
  | .green => .amber
  | .amber => .red`, name: 'Scratch.lean' },
            'The cases must cover every constructor. Leave one out and the definition is rejected.',
            { code: lean`def Light.isStop : Light → Bool
  | .red => true
  | .green => false` },
            { text: lean`Missing cases:
amber` },
            'A type with three values allows a proof you could not write for numbers: check each value. The tactic `cases l` splits the goal into one goal for each constructor.',
            { code: lean`theorem next_cycle (l : Light) : l.next.next.next = l := by
  cases l
  · rfl
  · rfl
  · rfl`, name: 'Scratch.lean' },
            'After `cases l` the goal panel shows three goals.',
            { text: lean`case red
⊢ Light.red.next.next.next = Light.red

case amber
⊢ Light.amber.next.next.next = Light.amber

case green
⊢ Light.green.next.next.next = Light.green` },
            'Each `·` focuses on the next goal. `rfl` proves an equation whose two sides compute to the same value, and here they do: three steps from red lead back to red.',
            'A constructor can carry data, and a pattern names the data it carries.',
            { code: lean`inductive Shape where
  | circle (radius : Nat)
  | rect (width height : Nat)

def Shape.area : Shape → Nat
  | .circle r => 3 * r * r
  | .rect w h => w * h`, name: 'Scratch.lean' },
            { compare: 'This is an `Enum`, and with data it is a set of dataclasses joined by `|`. The difference is the exhaustiveness check. A Python `match` with a forgotten case falls through and returns `None`. Add a constructor to a Lean type and every function that ignores it stops compiling.' },
          ],
        },
        {
          title: 'Option in place of None',
          body: [
            'Indexing a list can fail. `xs[i]?` returns an `Option`: either `some v` or `none`.',
            { code: lean`#eval [10, 20, 30][1]?
#eval [10, 20, 30][7]?` },
            { text: lean`some 20` },
            { text: lean`none` },
            '`Option Nat` is a different type from `Nat`, so you cannot use the result as a number by accident. `xs.head?` is the first element of a list, if there is one.',
            { code: lean`def firstOf (xs : List Nat) : Nat :=
  xs.head?` },
            { text: lean`Type mismatch
  xs.head?
has type
  Option Nat
but is expected to have type
  Nat` },
            'To get at the value you say what happens in both cases.',
            { code: lean`def firstOr (xs : List Nat) (fallback : Nat) : Nat :=
  match xs.head? with
  | some v => v
  | none => fallback`, name: 'Scratch.lean' },
            { compare: 'In Python, `None` travels until something does arithmetic on it, and the traceback points at the victim, not the cause. In Lean a value of type `Nat` is always a number. A possibly missing value has a type that says so, and the compiler makes you handle it where it appears.' },
          ],
        },
        {
          title: 'Lists and type parameters',
          body: [
            'A list is either empty, `[]`, or an element in front of another list, `x :: rest`. The bracket notation is shorthand: `[1, 2, 3]` is `1 :: 2 :: 3 :: []`. Lists are immutable, like everything else.',
            { table: { head: ['Expression', 'Value'], rows: [
              ['`1 :: [2, 3]`', '`[1, 2, 3]`'],
              ['`[1, 2] ++ [3]`', '`[1, 2, 3]`'],
              ['`[1, 2, 3, 4].filter (· % 2 == 0)`', '`[2, 4]`'],
              ['`[1, 2, 3, 4].foldl (· + ·) 0`', '`10`'],
            ] } },
            'A function can work for any element type. The braces declare a type parameter that Lean fills in from the argument.',
            { code: lean`def second {α : Type} (xs : List α) : Option α :=
  xs[1]?

#eval second ["a", "b", "c"]`, name: 'Scratch.lean' },
            { text: lean`some "b"` },
            { tip: 'Type `\\a` in the editor to get `α`, and `\\to` to get `→`. Every symbol in these lessons has such an abbreviation. In VS Code, hover over a symbol to see how to type it.' },
          ],
        },
      ],
      takeaways: [
        'A call with too few arguments is a function. A call with the wrong type of argument is an error before anything runs.',
        'Functions are total. `Nat` subtraction stops at zero and division by zero is zero, and proofs have to account for both.',
        '`==` computes a `Bool`. `=` states a `Prop`.',
        'A `match` must cover every constructor, and `cases` in a proof gives one goal for each.',
        'A value that may be missing has type `Option`, and the compiler makes you handle `none`.',
      ],
      quiz: [
        {
          q: 'With `def area (width height : Nat) : Nat`, what does `#check area 3` show?',
          options: [
            { t: '`area 3 : Nat → Nat`', ok: true, why: 'One argument is supplied. The result is a function that waits for the height.' },
            { t: 'An error, because an argument is missing.', why: 'That is Python’s behavior. A Lean function takes its arguments one at a time, and stopping early gives a function.' },
            { t: '`area 3 : Nat`', why: 'It would be a `Nat` only with both arguments.' },
          ],
        },
        {
          q: 'What does `#eval (2 : Nat) - 3 + 1` show?',
          options: [
            { t: '`1`', ok: true, why: '`2 - 3` is `0` in `Nat`, and then `0 + 1` is `1`.' },
            { t: '`0`', why: 'That would be the answer over `Int`, where `2 - 3` is `-1`. In `Nat` the subtraction has already stopped at `0`.' },
            { t: 'An error, because the result would be negative.', why: 'No arithmetic on `Nat` raises an error. Subtraction is defined to stop at zero.' },
          ],
        },
        {
          q: 'A new constructor `flashing` is added to `Light`. What happens to `Light.next`, which has no case for it?',
          options: [
            { t: 'It no longer compiles: Lean reports the missing case.', ok: true, why: 'A `match` must cover every constructor, so the gap is found when the file is checked.' },
            { t: 'It compiles, and fails at run time when given `flashing`.', why: 'That is how a Python `match` or dictionary lookup behaves. Lean has no run-time match failure.' },
            { t: 'It compiles, and returns `flashing` unchanged.', why: 'Lean never invents a default case.' },
          ],
        },
        {
          q: 'After `def q := { p with x := 5 }`, what is `p.x`?',
          options: [
            { t: 'Whatever it was before. `q` is a new value.', ok: true, why: '`with` copies the structure with one field replaced. Nothing is modified.' },
            { t: '`5`, because `q` and `p` are the same object.', why: 'There is no shared mutable object in Lean. `q` is a separate value.' },
            { t: 'The line is rejected, because structures cannot be changed.', why: 'They cannot be changed, and `with` does not change one. It builds another.' },
          ],
        },
        {
          q: 'Why is `xs.head? + 1` rejected when `xs : List Nat`?',
          options: [
            { t: '`xs.head?` has type `Option Nat`, and the `none` case has not been handled.', ok: true, why: 'An `Option Nat` is not a `Nat`. A `match` or a default is needed to get a number out.' },
            { t: 'Lean cannot tell whether `xs` is empty until the program runs.', why: 'True, and that is the reason the type is `Option`. The error itself is a type mismatch, found without running anything.' },
            { t: 'Addition is not defined for elements of a list.', why: 'The elements are `Nat`, which can be added. The value being added here is not an element. It is an `Option`.' },
          ],
        },
        {
          q: 'In the proof of `next_cycle`, why are there three `· rfl` lines?',
          code: lean`theorem next_cycle (l : Light) : l.next.next.next = l := by
  cases l
  · rfl
  · rfl
  · rfl`,
          options: [
            { t: '`cases l` made one goal for each constructor of `Light`, and each is closed by computing.', ok: true, why: 'With `l` replaced by a concrete light, both sides evaluate to the same value, which is what `rfl` checks.' },
            { t: 'One `rfl` is needed for each `.next` in the statement.', why: 'A single `rfl` evaluates the whole left-hand side. The three lines are for the three lights.' },
            { t: 'The first `rfl` proves the claim, and the others are required by the syntax.', why: 'Each bullet closes a different goal. Remove one and a goal is left unproved.' },
          ],
        },
        {
          q: 'What does `#eval describe [4, 5]` show?',
          code: lean`def describe (xs : List Nat) : String :=
  match xs with
  | [] => "empty"
  | [x] => s!"just {x}"
  | x :: _ => s!"starts with {x}"`,
          options: [
            { t: '`"starts with 4"`', ok: true, why: 'The list is not empty and does not have exactly one element, so the third pattern matches, with `x` bound to 4.' },
            { t: '`"just 4"`', why: '`[x]` matches a list with exactly one element. This one has two.' },
            { t: '`"empty"`', why: '`[]` matches only the empty list.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-02-data', kind: 'lab', level: 'core', title: 'Write the functions the tests describe',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('02'),
          'This lab is mostly programming. Each exercise has `#guard` tests under it, and the tests are the specification: read them before you write the function.',
          'Two exercises end in a catch-all case. Replace that line with one case for each constructor.',
          { code: lean`def Direction.turnRight : Direction → Direction
  | _ => sorry` },
          'Exercise 5 is a proof about every direction. Use `cases`, as the lesson did for the traffic light.',
          checkLab('02'),
          solution('02'),
        ],
        hints: [
          'For `distance`, test which number is larger before you subtract. `if a ≥ b then … else …` is an expression, so it can be the whole body.',
          'For `lookupOr`, match on `xs[i]?`. There are two cases, `some v` and `none`.',
          'In exercise 5, `cases d` leaves four goals. Each one is closed by `rfl`, on its own line starting with `·`.',
        ],
        checks: [
          '`lean Lab02.lean` prints nothing: no errors and no `sorry` warnings.',
          'Every catch-all `| _ => sorry` is replaced by one case for each constructor.',
          'In exercise 5, I saw four goals in the goal panel after `cases d`.',
        ],
        notes: [
          { label: 'Goals after cases', placeholder: 'Paste the goal panel from exercise 5 with the cursor just after cases d.' },
        ],
      }],
    },
    {
      id: 'recursion-termination',
      category: part,
      title: 'Recursion and termination',
      summary: 'Lean’s core language has no loops. Repetition is recursion, and Lean accepts a recursive function only when it can see that the function finishes.',
      minutes: 35,
      topics: ['Pattern matching on Nat', 'Recursion on lists', 'Accumulators', 'termination_by', 'partial and fuel'],
      sections: [
        {
          title: 'A loop becomes a recursion',
          body: [
            'Here is a loop that adds the numbers from 1 to `n`.',
            { code: `def sum_to(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total`, lang: 'python', name: 'sum_to.py' },
            'It works by changing `total`. Lean has no variables that change, so the same computation is written as a function that calls itself.',
            { code: lean`def sumTo : Nat → Nat
  | 0 => 0
  | n + 1 => (n + 1) + sumTo n

#eval sumTo 100`, name: 'Scratch.lean' },
            { text: lean`5050` },
            'The two lines are patterns for the argument. A natural number is either `0` or one more than another number. The pattern `n + 1` matches any positive number and names its predecessor `n`: called with 5, it binds `n` to 4.',
            'Because the function is defined by cases, a claim about one value can be settled by running it.',
            { code: lean`theorem sumTo_4 : sumTo 4 = 10 := by
  decide`, name: 'Scratch.lean' },
            { aside: 'Lean does have `for` loops and mutable variables, in a notation that lesson 11 introduces. They are translated into functions like this one. Learning recursion first means that when you come to prove a loop correct, you know what it really is.' },
          ],
        },
        {
          title: 'Recursion over a list',
          body: [
            'A list is either `[]` or `x :: rest`, so a function over a list has those two cases.',
            { code: lean`def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

#eval total [10, 20, 30]`, name: 'Scratch.lean' },
            { text: lean`60` },
            'With two arguments, each case is a pair of patterns. This function joins two lists by taking the first apart.',
            { code: lean`def join {α : Type} : List α → List α → List α
  | [], ys => ys
  | x :: xs, ys => x :: join xs ys`, name: 'Scratch.lean' },
            'Notice the shape that keeps appearing: one case for the empty value, and one case that handles the first piece and recurses on the rest. Proofs about these functions will have the same two cases. That is induction, and it is lesson 6.',
          ],
        },
        {
          title: 'Accumulators and local helpers',
          body: [
            '`total` does its addition after the recursive call returns, so a long list needs a deep stack. The usual fix is a helper that carries the running result in an extra argument. `where` introduces a helper that belongs to one definition.',
            { code: lean`def totalFast (xs : List Nat) : Nat :=
  go 0 xs
where
  go (acc : Nat) : List Nat → Nat
    | [] => acc
    | x :: rest => go (acc + x) rest`, name: 'Scratch.lean' },
            'The recursive call is the last thing `go` does, and Lean compiles such a call into a jump. This is the Python loop again: `acc` is `total`, and each call is one trip round the loop.',
            'The helper’s full name is `totalFast.go`. You will need that name when you prove that `totalFast` and `total` agree.',
          ],
        },
        {
          title: 'Every function must end',
          body: [
            'Lean checks that a recursive function finishes on every input. This one does not.',
            { code: lean`def forever (n : Nat) : Nat :=
  forever n + 1` },
            { text: lean`fail to show termination for
  forever` },
            'The reason is not tidiness. A definition is also a fact that proofs may use. If Lean accepted `forever`, then `forever 0 = forever 0 + 1` would be a fact, and from it follows `0 = 1`. Once one false statement is provable, every statement is, and the proof checker is worthless.',
            'The functions so far passed the check without comment because each recursive call was on a piece of the argument: `n` from `n + 1`, `rest` from `x :: rest`. Lean calls this **structural recursion**. A piece of a value is smaller than the value, so the recursion has to stop.',
          ],
        },
        {
          title: 'When the argument is not a piece',
          body: [
            'This function counts decimal digits. Its recursive call is on `n / 10`, which is not a piece of `n`.',
            { code: lean`def digits (n : Nat) : Nat :=
  if n < 10 then 1 else 1 + digits (n / 10)`, name: 'Scratch.lean' },
            'Lean accepts it anyway. It looks for a **measure**: a natural number computed from the arguments that gets smaller at every recursive call. Here the measure is `n` itself, and Lean proves that `n / 10 < n` whenever `n < 10` is false.',
            'The measure need not be an argument. In the next function `lo` goes up, and what goes down is the distance left to cover. Add `termination_by?` after a definition to see the measure Lean found.',
            { code: lean`def countUp (lo hi : Nat) : List Nat :=
  if lo < hi then lo :: countUp (lo + 1) hi else []`, name: 'Scratch.lean' },
            { text: lean`termination_by hi - lo` },
            'Sometimes Lean cannot find a measure. This function swaps its two lists at every call, so neither list shrinks every time.',
            { code: lean`def interleave {α : Type} : List α → List α → List α
  | [], ys => ys
  | x :: xs, ys => x :: interleave ys xs` },
            { text: lean`Could not find a decreasing measure.` },
            'What shrinks is the two lengths together. Say so with `termination_by`, and Lean checks your claim.',
            { code: lean`def interleave' {α : Type} : List α → List α → List α
  | [], ys => ys
  | x :: xs, ys => x :: interleave' ys xs
termination_by xs ys => xs.length + ys.length`, name: 'Scratch.lean' },
            { pitfall: ['`decide` and `rfl` cannot run a function that needed a measure. They work by unfolding definitions inside the proof checker, and these definitions are sealed. `decide` fails on `digits 12345 = 5` with this message.', { text: 'Tactic `decide` failed to reduce' }, '`#eval` and `#guard` still work, because they run compiled code. In a proof, `simp [digits]` unfolds the function step by step and does prove the claim.'] },
          ],
        },
        {
          title: 'When nobody knows',
          body: [
            'Some functions are not known to finish. Halve an even number, replace an odd `n` by `3 * n + 1`, and count the steps until you reach 1. Whether that always ends is a famous open problem.',
            { code: lean`def collatz (n : Nat) : Nat :=
  if n ≤ 1 then 0
  else if n % 2 = 0 then 1 + collatz (n / 2)
  else 1 + collatz (3 * n + 1)` },
            'Lean tries `n` as the measure and shows you the step it could not prove. It is not true, so no proof will be found.',
            { text: lean`n : Nat
h✝¹ : ¬n ≤ 1
h✝ : ¬n % 2 = 0
⊢ 3 * n + 1 < n` },
            'You have two honest ways out. The first is `partial def`. The function compiles and runs, but Lean hides its body from proofs, so nothing false can be derived from it and nothing at all can be proved about it.',
            { code: lean`partial def collatzSteps (n : Nat) : Nat :=
  if n ≤ 1 then 0
  else if n % 2 = 0 then 1 + collatzSteps (n / 2)
  else 1 + collatzSteps (3 * n + 1)`, name: 'Scratch.lean' },
            'The second is **fuel**: an extra argument that counts down, with a result that says when it ran out. The recursion is structural in the fuel, so Lean accepts it, and you can still prove things about it.',
            { code: lean`def collatzFuel : Nat → Nat → Option Nat
  | 0, _ => none
  | fuel + 1, n =>
    if n ≤ 1 then some 0
    else if n % 2 = 0 then (collatzFuel fuel (n / 2)).map (· + 1)
    else (collatzFuel fuel (3 * n + 1)).map (· + 1)`, name: 'Scratch.lean' },
            '`collatzFuel 1000 27` is `some 111`, and `collatzFuel 50 27` is `none`. `Option.map` applies a function to the value inside a `some` and leaves `none` alone.',
            { compare: 'Python will run any `while True`. Lean makes you choose: prove the function ends, bound it with fuel, or mark it `partial` and give up proving things about it. The cost is real. The payoff is that a function with a theorem about it can never hang.' },
          ],
        },
      ],
      takeaways: [
        'Repetition is recursion: a case for the empty value, and a case that handles one piece and recurses on the rest.',
        'An accumulator in a `where` helper is the loop with a running total.',
        'Lean requires every function to finish, because an endless function would let you prove false statements.',
        'Recursion on a piece of the argument is accepted as it stands. Otherwise Lean looks for a measure, and `termination_by` lets you name one.',
        '`partial` gives up proofs about a function. Fuel keeps them.',
      ],
      quiz: [
        {
          q: 'What does `#eval mystery [7, 7, 7]` show?',
          code: lean`def mystery : List Nat → Nat
  | [] => 0
  | _ :: rest => 1 + mystery rest`,
          options: [
            { t: '`3`', ok: true, why: 'It adds 1 for each element and ignores the element’s value: this is the length.' },
            { t: '`21`', why: 'That would be the sum. The pattern `_` throws the element away, and each step adds 1.' },
            { t: '`7`', why: 'The function never looks at an element. It counts them.' },
          ],
        },
        {
          q: '`sumTo 5` reaches the case `| n + 1 => (n + 1) + sumTo n`. What is `n` there?',
          options: [
            { t: '`4`', ok: true, why: 'The pattern `n + 1` is matched against 5, so `n` is the predecessor.' },
            { t: '`5`', why: 'The whole pattern `n + 1` stands for 5. `n` is one less.' },
            { t: '`6`', why: 'A pattern takes a value apart. It does not add to it.' },
          ],
        },
        {
          q: 'Why does Lean refuse `def forever (n : Nat) : Nat := forever n + 1`?',
          options: [
            { t: 'Its defining equation would let you prove `0 = 1`, and then anything.', ok: true, why: 'A definition is a fact that proofs can use. This one says a number equals itself plus one.' },
            { t: 'It would overflow the stack when run.', why: 'It would, but that is not why. `partial def forever` is accepted, and loops just the same. What Lean protects is its logic.' },
            { t: 'A recursive function has to be written with pattern matching.', why: '`digits` uses `if` and is accepted. The problem here is that the argument never changes.' },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these definitions from the lesson does Lean accept with no `termination_by` line?',
          options: [
            { t: '`total`, which recurses on `rest`.', ok: true, why: 'Structural recursion: `rest` is a piece of `x :: rest`.' },
            { t: '`digits`, which recurses on `n / 10`.', ok: true, why: 'Lean finds the measure `n` and proves `n / 10 < n` itself.' },
            { t: '`interleave`, which swaps its two lists.', why: 'Neither list shrinks at every call. You have to supply the sum of the lengths.' },
            { t: '`collatz`, which recurses on `3 * n + 1`.', why: 'No measure is known. Lean reports the step it cannot prove.' },
          ],
        },
        {
          q: 'Lean rejects `collatz` and prints this goal. What is it telling you?',
          code: lean`n : Nat
h✝¹ : ¬n ≤ 1
h✝ : ¬n % 2 = 0
⊢ 3 * n + 1 < n`,
          options: [
            { t: 'With `n` as the measure, this call would need a smaller argument, and that cannot be proved.', ok: true, why: 'The goal is the obligation for the odd case. It is false, so `n` is not a decreasing measure.' },
            { t: 'The function returns the wrong number of steps for odd inputs.', why: 'Lean has not judged the result. It has only failed to show that the recursion stops.' },
            { t: 'You should add `3 * n + 1 < n` as a hypothesis of the function.', why: 'No odd number above 1 satisfies it, so the function could then never be called in that case.' },
          ],
        },
        {
          q: 'What do you give up by writing `partial def`?',
          options: [
            { t: 'Proofs about the function. Its body is hidden from the logic.', ok: true, why: 'It still compiles and runs. Lean treats it as an unknown function, so no theorem can mention what it computes.' },
            { t: 'Speed. A partial function is interpreted.', why: 'It is compiled like any other function.' },
            { t: 'The ability to call it from an ordinary function.', why: 'Any function may call it. Only reasoning about it is lost.' },
          ],
        },
        {
          q: 'What does `#eval halve 10` show?',
          code: lean`def halve (n : Nat) : List Nat :=
  if n = 0 then [] else n :: halve (n / 2)`,
          options: [
            { t: '`[10, 5, 2, 1]`', ok: true, why: 'Each step keeps `n` and continues with `n / 2`, rounding down. `1 / 2` is `0`, which ends the list.' },
            { t: '`[10, 5, 2, 1, 0]`', why: 'When `n` is 0 the function returns `[]`. Zero is never put in the list.' },
            { t: '`[5, 2, 1]`', why: 'The first element is `n` itself, before any halving.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-03-recursion', kind: 'lab', level: 'core', title: 'Write eight recursions',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('03'),
          'Exercises 1 to 5 are structural: write the empty case and the case for one more piece. Where a definition ends in a catch-all, replace it with your own cases.',
          { code: lean`def factorial : Nat → Nat
  | _ => sorry` },
          'Exercise 6 recurses on `n / 2`. Lean finds the measure. Add `termination_by?` after your definition to see it, then remove the line again.',
          'Exercise 7 needs a `termination_by` line from you. Write the function first and read the error.',
          checkLab('03'),
          solution('03'),
        ],
        hints: [
          'For `rev`, the accumulator holds what has been reversed so far. Each step moves one element from the front of the list to the front of the accumulator.',
          'For `alternate`, the recursive call is `alternate ys xs`: the lists swap places, so that the next element comes from the other one. The measure is `xs.length + ys.length`, written after the definition as `termination_by xs ys => xs.length + ys.length`.',
          'For the stretch exercise, copy the shape of `collatzFuel` from the lesson: no fuel gives `none`, and otherwise each recursive call is made with `fuel` and has `.map (· + 1)` applied to its result.',
        ],
        checks: [
          '`lean Lab03.lean` prints nothing: no errors and no `sorry` warnings.',
          'I saw the measure Lean chose for `halvings` with `termination_by?`.',
          'I saw Lean reject `alternate` without a measure, and accept it with one.',
        ],
        notes: [
          { label: 'The measure for halvings', placeholder: 'Paste the line that termination_by? suggested.' },
          { label: 'The error for alternate', placeholder: 'Paste the last few lines of the error you got before adding termination_by.' },
        ],
      }],
    },
  );
})();
