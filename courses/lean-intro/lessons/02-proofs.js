// Part 2: Proofs. Stating claims, rewriting, induction, and the tactics that do the routine work.
(() => {
  const lean = String.raw; // lean`…` keeps backslashes as written
  const part = 'Part 2 · Proofs';
  const { fetchLab, checkLab, solution } = window.LEAN_COURSE;

  (window.C_LESSONS ||= []).push(
    {
      id: 'propositions-proofs',
      category: part,
      title: 'Propositions and proofs',
      summary: 'Claims are built from a handful of connectives. Each one has a tactic that proves it and a tactic that uses it, and that table is most of what there is to learn.',
      minutes: 40,
      topics: ['intro', 'exact and apply', 'constructor', 'cases and obtain', 'exists', 'have'],
      sections: [
        {
          title: 'One table',
          body: [
            'So far every proof ended in `omega`, `decide` or `rfl`. Those finish a goal. This lesson is about getting a goal into a shape they can finish, and about claims that are not arithmetic at all.',
            'A claim is built from smaller claims with a few connectives. For each connective there is one way to **prove** it when it is the goal, and one way to **use** it when it is a hypothesis.',
            { table: { head: ['Shape', 'Read it as', 'To prove it', 'To use a hypothesis `h` of this shape'], rows: [
              ['`p → q`', 'if `p` then `q`', '`intro hp`', '`apply h`, or `h hp`'],
              ['`∀ x, p x`', 'for every `x`', '`intro x`', '`h a`'],
              ['`p ∧ q`', '`p` and `q`', '`constructor`', '`obtain ⟨hp, hq⟩ := h`'],
              ['`p ∨ q`', '`p` or `q`', '`left` or `right`', '`cases h with`'],
              ['`∃ x, p x`', 'there is an `x`', '`exists a`', '`obtain ⟨x, hx⟩ := h`'],
              ['`¬p`', 'not `p`', '`intro hp`', '`contradiction`, or `apply h`'],
              ['`p ↔ q`', '`p` exactly when `q`', '`constructor`', '`obtain ⟨forward, backward⟩ := h`'],
            ] } },
            'When you do not know what to do next, look at the shape of the goal and of each hypothesis, and find the row. The rest of this lesson walks through the rows.',
            { tip: 'Each symbol is typed with a backslash: `\\to` for `→`, `\\and` for `∧`, `\\or` for `∨`, `\\not` for `¬`, `\\iff` for `↔`, `\\all` for `∀`, `\\ex` for `∃`, and `\\<` and `\\>` for the angle brackets `⟨` and `⟩`. The bullet `·` is `\\.`.' },
          ],
        },
        {
          title: 'If … then',
          body: [
            'To prove `p → q`, assume `p` and prove `q`. The tactic `intro` moves the assumption above the `⊢` line and gives it a name.',
            { code: lean`theorem pos_of_big (n : Nat) : n > 5 → n > 0 := by
  intro h
  omega`, name: 'Scratch.lean' },
            'The goal before `intro h`, and after it:',
            { text: lean`n : Nat
⊢ n > 5 → n > 0` },
            { text: lean`n : Nat
h : n > 5
⊢ n > 0` },
            'This is why a hypothesis written in the signature, such as `(h : n > 5)`, means the same thing as `n > 5 →` in the statement. Either way it ends up above the line.',
            'A proved theorem is a function. `pos_of_big` takes a number `n` and a proof of `n > 5`, and returns a proof of `n > 0`. You can call it.',
            { code: lean`theorem pos_of_six (n : Nat) (h : n > 5) : n > 0 := by
  exact pos_of_big n h`, name: 'Scratch.lean' },
            '`exact` closes a goal with a proof of exactly that claim. `apply` runs a theorem backwards: if the theorem’s conclusion matches the goal, the goal is replaced by whatever the theorem needs.',
            { code: lean`theorem pos_of_seven (n : Nat) (h : n > 7) : n > 0 := by
  apply pos_of_big
  omega`, name: 'Scratch.lean' },
            'After `apply pos_of_big`, the goal is the theorem’s premise.',
            { text: lean`n : Nat
h : n > 7
⊢ n > 5` },
            { compare: 'Read `theorem pos_of_big (n : Nat) : n > 5 → n > 0` as a function signature, because it is one. Using a theorem is calling it. A library of theorems is a library of functions whose return values are proofs, and `apply` asks: which function returns what I need, and what are its arguments?' },
          ],
        },
        {
          title: 'And',
          body: [
            'To prove `p ∧ q`, prove both. `constructor` splits the goal in two.',
            { code: lean`theorem in_range (n : Nat) (h : n = 7) : 5 < n ∧ n < 10 := by
  constructor
  · omega
  · omega`, name: 'Scratch.lean' },
            { text: lean`case left
n : Nat
h : n = 7
⊢ 5 < n

case right
n : Nat
h : n = 7
⊢ n < 10` },
            'A hypothesis `h : p ∧ q` is two facts in one package. `obtain` unpacks it and names the parts.',
            { code: lean`theorem and_swap (p q : Prop) (h : p ∧ q) : q ∧ p := by
  obtain ⟨hp, hq⟩ := h
  constructor
  · exact hq
  · exact hp`, name: 'Scratch.lean' },
            'After the `obtain` line, `h` is gone and its two halves are separate hypotheses.',
            { text: lean`p q : Prop
hp : p
hq : q
⊢ q ∧ p` },
            'Here `p` and `q` are variables of type `Prop`: they stand for any claims at all. Nothing about them is arithmetic, so `omega` has nothing to work on, and the proof is pure bookkeeping.',
            { aside: ['A proof is a value, and a proposition is its type. A proof of `p ∧ q` is a pair of proofs, and a proof of `p → q` is a function. So the theorem above can be written as an ordinary expression, with no tactics.', { code: lean`theorem and_swap_term (p q : Prop) (h : p ∧ q) : q ∧ p :=
  ⟨h.2, h.1⟩` }, 'Tactics are a convenient way to build such expressions. The kernel only ever sees the expression.'] },
          ],
        },
        {
          title: 'Or',
          body: [
            'To prove `p ∨ q` you choose a side and prove it.',
            { code: lean`theorem small_or_huge (n : Nat) (h : n = 3) : n < 5 ∨ n > 100 := by
  left
  omega`, name: 'Scratch.lean' },
            'A hypothesis `h : p ∨ q` tells you one of two things is true and not which, so you must handle both. `cases` gives one goal for each. In the first you have a proof of `p`, and in the second a proof of `q`.',
            { code: lean`theorem or_swap (p q : Prop) (h : p ∨ q) : q ∨ p := by
  cases h with
  | inl hp =>
    right
    exact hp
  | inr hq =>
    left
    exact hq`, name: 'Scratch.lean' },
            '`inl` and `inr` are the names of the two cases, for the left and right side of the `∨`. This is the same `cases` that split a traffic light into red, amber and green: an “or” is a type with two constructors.',
          ],
        },
        {
          title: 'Not, and contradiction',
          body: [
            '`¬p` is defined as `p → False`. To prove it, assume `p` and derive something impossible.',
            { code: lean`theorem not_below_self (n : Nat) : ¬(n < n) := by
  intro h
  omega`, name: 'Scratch.lean' },
            { text: lean`n : Nat
h : n < n
⊢ False` },
            'The goal `False` can never be proved directly. It can only be reached when the hypotheses contradict each other, as `h` does here by itself. `omega` looks for exactly that.',
            'When a hypothesis and its negation are both present, the tactic `contradiction` closes the goal, whatever the goal is.',
            { code: lean`theorem from_contradiction (p q : Prop) (hp : p) (hnp : ¬p) : q := by
  contradiction`, name: 'Scratch.lean' },
            { pitfall: 'This theorem proves an arbitrary `q`, and that is correct: from contradictory assumptions anything follows. It means a theorem whose hypotheses can never all hold is true and useless. Lesson 14 comes back to this, because it is one of the ways a specification can be worth less than it looks.' },
          ],
        },
        {
          title: 'For every, and there is',
          body: [
            'A hypothesis `h : ∀ x, …` is a function. Apply it to a value to get the fact for that value. `have` adds the result to your hypotheses under a name.',
            { code: lean`theorem grows_twice (f : Nat → Nat) (h : ∀ x, f x > x) : f (f 0) > 1 := by
  have h0 := h 0
  have h1 := h (f 0)
  omega`, name: 'Scratch.lean' },
            { text: lean`f : Nat → Nat
h : ∀ (x : Nat), f x > x
h0 : f 0 > 0
h1 : f (f 0) > f 0
⊢ f (f 0) > 1` },
            '`omega` does not know what `f` is. It treats `f 0` and `f (f 0)` as two unknown numbers, and the two facts you extracted are enough.',
            'To prove `∃ n, …`, supply the value. `exists` then tries to finish the remaining claim, and leaves it for you when it cannot.',
            { code: lean`theorem exists_square : ∃ n : Nat, n * n = 49 := by
  exists 7

theorem exists_bigger (m : Nat) : ∃ n : Nat, n > m := by
  exists m + 1
  omega`, name: 'Scratch.lean' },
            'A hypothesis `h : ∃ k, …` says a value exists without saying which. `obtain` gives it a name, and gives you the fact about it.',
            { code: lean`theorem even_of_double (n : Nat) (h : ∃ k, n = 2 * k) : n % 2 = 0 := by
  obtain ⟨k, hk⟩ := h
  omega`, name: 'Scratch.lean' },
            { text: lean`n k : Nat
hk : n = 2 * k
⊢ n % 2 = 0` },
            'An “if and only if” is two implications. `constructor` splits it, and each half is proved the usual way.',
            { code: lean`theorem even_iff (n : Nat) : n % 2 = 0 ↔ ∃ k, n = 2 * k := by
  constructor
  · intro h
    exists n / 2
    omega
  · intro h
    obtain ⟨k, hk⟩ := h
    omega`, name: 'Scratch.lean' },
          ],
        },
      ],
      takeaways: [
        'Look at the shape of the goal to choose a tactic that proves it, and at the shape of a hypothesis to choose one that uses it.',
        '`intro` assumes. `constructor` splits an “and”. `left` and `right` choose a side of an “or”. `exists` supplies a value.',
        '`obtain` unpacks an “and” or a “there is”. `cases` handles each side of an “or”.',
        'A theorem is a function from proofs to proofs: `apply` runs it backwards, and `have` stores a result.',
        'From contradictory hypotheses anything follows.',
      ],
      quiz: [
        {
          q: 'The goal is `⊢ n > 5 → n > 0`. Which tactic comes first?',
          options: [
            { t: '`intro h`', ok: true, why: 'The goal is an implication. `intro` assumes its left side, leaving `n > 0` to prove.' },
            { t: '`constructor`', why: '`constructor` splits an “and” or an “if and only if”. An implication has one thing to prove, under an assumption.' },
            { t: '`exact h`', why: 'There is no `h` yet. `intro` is what creates it.' },
          ],
        },
        {
          q: 'Inside a proof of `q ∨ p`, the goal panel shows this. What is the next step?',
          code: lean`case inl
p q : Prop
hp : p
⊢ q ∨ p`,
          options: [
            { t: '`right`, then `exact hp`.', ok: true, why: 'You hold a proof of `p`, which is the right side of the goal.' },
            { t: '`left`, then `exact hp`.', why: '`left` commits you to proving `q`, and all you have is `p`.' },
            { t: '`exact hp` straight away.', why: '`hp` proves `p`. The goal is `q ∨ p`, a different claim, so you must choose the side first.' },
          ],
        },
        {
          q: 'Among your hypotheses is `h : ∃ k, n = 2 * k`. How do you use it?',
          options: [
            { t: '`obtain ⟨k, hk⟩ := h`', ok: true, why: 'This names the value that exists and the fact about it.' },
            { t: '`exists k`', why: '`exists` is for proving a goal of that shape. And there is no `k` to give yet: it is hidden inside `h`.' },
            { t: '`intro k`', why: '`intro` works on the goal. It does not unpack a hypothesis.' },
          ],
        },
        {
          q: 'After `intro h` in `not_below_self`, the goal is `False`. Why can `omega` close it?',
          code: lean`n : Nat
h : n < n
⊢ False`,
          options: [
            { t: 'The hypothesis `n < n` is impossible, and `omega` detects contradictory hypotheses.', ok: true, why: 'A goal of `False` is closed by showing the assumptions cannot all hold.' },
            { t: '`False` is a claim that every tactic can prove.', why: '`False` has no proof. It is reachable only from contradictory hypotheses.' },
            { t: '`omega` ignores hypotheses and checks the goal for all `n`.', why: 'It reads the hypotheses. The goal alone, `False`, has nothing to check.' },
          ],
        },
        {
          q: 'With `theorem pos_of_big (n : Nat) : n > 5 → n > 0`, what is the expression `pos_of_big 9`?',
          options: [
            { t: 'A proof of `9 > 5 → 9 > 0`.', ok: true, why: 'The theorem is a function of `n`. Applying it to 9 gives the statement for 9.' },
            { t: 'The number 9, if it is greater than 5.', why: 'A theorem returns a proof, not one of its arguments.' },
            { t: 'The value `true`.', why: 'Proofs are not Booleans. The result is evidence for one particular claim.' },
          ],
        },
        {
          kind: 'multi',
          q: 'For which goals does `constructor` produce two goals?',
          options: [
            { t: '`p ∧ q`', ok: true, why: 'Both halves must be proved.' },
            { t: '`p ↔ q`', ok: true, why: 'It is two implications, one in each direction.' },
            { t: '`p ∨ q`', why: 'Only one side needs proving, and you choose it with `left` or `right`.' },
            { t: '`p → q`', why: 'Use `intro`. There is one claim to prove, under an assumption.' },
          ],
        },
        {
          q: 'After `intro h` the goal is as shown, and `omega` closes it at once. What does that tell you about `omega`?',
          code: lean`n : Nat
h : n > 2 ∧ n < 5
⊢ n = 3 ∨ n = 4`,
          options: [
            { t: 'It handles “and”, “or” and “not” between arithmetic facts by itself.', ok: true, why: 'You do not have to unpack `h` or choose a side when everything inside is linear arithmetic.' },
            { t: 'It tried `n = 3` and `n = 4` and found that both work.', why: '`omega` reasons about the inequalities. It never tests values.' },
            { t: 'The goal was already proved by `intro`.', why: '`intro` only moved the assumption above the line. The goal was still open.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-04-propositions', kind: 'lab', level: 'core', title: 'One exercise for each row of the table',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('04'),
          'Each exercise practises one row of the table from the lesson, and the comment above it says which. Several are about arbitrary claims `p`, `q` and `r`. There is no arithmetic in those, so `omega` cannot help and you have to move the pieces yourself.',
          'Work with the goal panel open. Before each tactic, say to yourself what shape the goal has and what shape each hypothesis has.',
          checkLab('04'),
          solution('04'),
        ],
        hints: [
          'Exercise 3: the pattern `⟨hp, hq, hr⟩` unpacks a three-part “and” in one step. Exercise 5: after `cases h with`, each case uses the implication that matches the fact you have, by `apply hp` or `apply hq`.',
          'Exercise 6: `¬p` in the goal is an implication to `False`, so begin with `intro hp`. Then `apply hnq` changes the goal from `False` to `q`.',
          'Exercise 8: `n = 4 * k` means `n = 2 * (2 * k)`, so the number to supply is `2 * k`. Exercise 9: `h 5` is a proof of `f 5 = 5 + 1`, and `h (f 5)` is a proof of `f (f 5) = f 5 + 1`.',
        ],
        checks: [
          '`lean Lab04.lean` prints nothing: no errors and no `sorry` warnings.',
          'In exercise 5, I saw two cases, each with a different hypothesis.',
          'In exercise 9, I added two facts with `have` and saw them in the goal panel.',
        ],
        notes: [
          { label: 'The goal in exercise 9', placeholder: 'Paste the goal panel just before your final tactic, showing the facts you added.' },
        ],
      }],
    },
    {
      id: 'equality-rewriting',
      category: part,
      title: 'Equality and rewriting',
      summary: 'Most claims about programs are equations. Some hold by computing. For the rest you replace equals by equals, one step at a time or on autopilot.',
      minutes: 40,
      topics: ['rfl', 'rw', 'simp', 'calc', 'Library theorems'],
      sections: [
        {
          title: 'Equal by computing',
          body: [
            'These examples use two small functions.',
            { code: lean`def double (n : Nat) : Nat :=
  n * 2

def quadruple (n : Nat) : Nat :=
  double (double n)`, name: 'Scratch.lean' },
            '`rfl` proves an equation when both sides compute to the same thing.',
            { code: lean`theorem double_3 : double 3 = 6 := by
  rfl

theorem add_zero_right (n : Nat) : n + 0 = n := by
  rfl`, name: 'Scratch.lean' },
            'The second one has a variable and still works. Addition on `Nat` is defined by recursion on its **second** argument, and the case for `0` returns the first argument, so `n + 0` computes to `n` whatever `n` is. Swap the operands and the computation is stuck.',
            { code: lean`theorem zero_add_left (n : Nat) : 0 + n = n := by
  rfl` },
            { text: lean`Tactic ` + '`rfl`' + lean` failed: The left-hand side
  0 + n
is not definitionally equal to the right-hand side
  n` },
            '`0 + n = n` is true, and `omega` proves it. It is not true by computing, because Lean would need to know whether `n` is zero or a successor before it could take a step. The difference between the two is the reason this lesson exists.',
            '`rfl` also sees through definitions and structures. Swapping the fields of a point twice computes back to the point you started with.',
            { code: lean`structure Point where
  x : Int
  y : Int

def Point.swap (p : Point) : Point :=
  { x := p.y, y := p.x }

theorem swap_swap (p : Point) : p.swap.swap = p := by
  rfl`, name: 'Scratch.lean' },
          ],
        },
        {
          title: 'Rewriting with a hypothesis',
          body: [
            'If you know `a = b`, you may replace `a` by `b` anywhere. `rw [h]` does that in the goal.',
            { code: lean`theorem rw_hyp (f : Nat → Nat) (a b : Nat) (h1 : a = b) (h2 : f b = 7) : f a + 1 = 8 := by
  rw [h1]
  rw [h2]`, name: 'Scratch.lean' },
            'The goal before the first rewrite, and after it:',
            { text: lean`f : Nat → Nat
a b : Nat
h1 : a = b
h2 : f b = 7
⊢ f a + 1 = 8` },
            { text: lean`f : Nat → Nat
a b : Nat
h1 : a = b
h2 : f b = 7
⊢ f b + 1 = 8` },
            'The second rewrite turns the goal into `7 + 1 = 8`. After every rewrite, `rw` tries `rfl`, which closes this. Several rewrites can share one pair of brackets: `rw [h1, h2]`.',
            'An equation is used left to right. To use it right to left, put `←` in front, typed `\\l`.',
            { code: lean`theorem rw_back (f : Nat → Nat) (a b : Nat) (h : f a = b) : b + 1 = f a + 1 := by
  rw [← h]`, name: 'Scratch.lean' },
            'To rewrite inside a hypothesis and leave the goal alone, add `at`.',
            { code: lean`theorem rw_at (a b : Nat) (h1 : a = b) (h2 : a + a = 10) : b + b = 10 := by
  rw [h1] at h2
  exact h2`, name: 'Scratch.lean' },
          ],
        },
        {
          title: 'Rewriting with a theorem',
          body: [
            'A theorem that states an equation is a rewrite rule for every value of its variables.',
            { code: lean`theorem double_eq (n : Nat) : double n = n + n := by
  unfold double
  omega

theorem quadruple_eq (n : Nat) : quadruple n = n + n + (n + n) := by
  unfold quadruple
  rw [double_eq]
  rw [double_eq]`, name: 'Scratch.lean' },
            'Watch what the first `rw [double_eq]` does to the goal.',
            { text: lean`n : Nat
⊢ double (double n) = n + n + (n + n)` },
            { text: lean`n : Nat
⊢ double n + double n = n + n + (n + n)` },
            'It found the first place the left side of the rule fits, which is the outer call, with the rule’s `n` standing for `double n`. It rewrote that one instance. The second `rw` then matches `double n` and rewrites both copies of it, because they are the same instance.',
            'Lean’s library has thousands of such theorems. These are a few you will use.',
            { table: { head: ['Name', 'Statement'], rows: [
              ['`Nat.add_comm`', '`n + m = m + n`'],
              ['`Nat.mul_comm`', '`n * m = m * n`'],
              ['`Nat.add_assoc`', '`n + m + k = n + (m + k)`'],
              ['`List.length_append`', '`(xs ++ ys).length = xs.length + ys.length`'],
              ['`List.length_reverse`', '`xs.reverse.length = xs.length`'],
              ['`List.length_map`', '`(xs.map f).length = xs.length`'],
            ] } },
            { code: lean`theorem length_swap (xs ys : List Nat) : (xs ++ ys).length = ys.length + xs.length := by
  rw [List.length_append]
  rw [Nat.add_comm]`, name: 'Scratch.lean' },
            'After the first rewrite the two sides differ only in order.',
            { text: lean`xs ys : List Nat
⊢ xs.length + ys.length = ys.length + xs.length` },
            'A rewrite fails when the left side of the rule does not appear in the goal.',
            { code: lean`example (n : Nat) : n + n = 2 * n := by
  rw [double_eq]` },
            { text: lean`Tactic ` + '`rewrite`' + lean` failed: Did not find an occurrence of the pattern
  double ?n
in the target expression
  n + n = 2 * n` },
            'The message names the pattern it looked for. `?n` is a blank that could have matched anything. There is no `double` in this goal, but there is an `n + n`, which is the rule’s right side: `rw [← double_eq]` would turn it into `double n`.',
            { compare: 'The names follow a convention that works like a search key: the type, then the function, then the shape. `List.length_append` is about `length` applied to an append. Guess a name and `#check` it. This replaces what you would do in Python by reading documentation or trying an expression in the REPL.' },
          ],
        },
        {
          title: 'Rewriting on autopilot',
          body: [
            'Choosing each rule by hand is slow. `simp` rewrites with every theorem the library has marked as a simplification rule, again and again, until none applies. Those rules make things smaller or more standard: `xs ++ []` becomes `xs`, and the length of an append becomes a sum of lengths.',
            { code: lean`theorem length_demo (xs : List Nat) (x : Nat) : (x :: xs ++ [1, 2]).length = xs.length + 3 := by
  simp`, name: 'Scratch.lean' },
            'Write `simp?` to see what it used. Lean answers with a `simp only` call that lists the rules.',
            { text: lean`simp only [List.cons_append, List.length_cons, List.length_append, List.length_nil, Nat.zero_add,
    Nat.reduceAdd, Nat.add_right_cancel_iff, Nat.add_left_cancel_iff]` },
            'Give `simp` extra rules in brackets. A function name unfolds that function. `simp` often stops with arithmetic left over, and then `omega` finishes.',
            { code: lean`theorem double_add (a b : Nat) : double (a + b) = double a + double b := by
  simp [double]
  omega`, name: 'Scratch.lean' },
            { text: lean`a b : Nat
⊢ (a + b) * 2 = a * 2 + b * 2` },
            '`simp at h` simplifies a hypothesis.',
            { code: lean`theorem simp_hyp (xs : List Nat) (h : (xs ++ [0]).length = 5) : xs.length = 4 := by
  simp at h
  exact h`, name: 'Scratch.lean' },
            { text: lean`xs : List Nat
h : xs.length = 4
⊢ xs.length = 4` },
            { pitfall: ['`simp` does not use your hypotheses unless you name them. Here it simplifies `f a + 1 = 1` to `f a = 0` and stops, with the fact it needs in plain view.', { code: lean`example (f : Nat → Nat) (a : Nat) (h : f a = 0) : f a + 1 = 1 := by
  simp` }, { text: lean`unsolved goals
f : Nat → Nat
a : Nat
h : f a = 0
⊢ f a = 0` }, '`simp [h]` proves it.'] },
          ],
        },
        {
          title: 'A chain of steps',
          body: [
            'When a proof is a sequence of equations, `calc` lets you write it the way you would on paper. Each line states the next expression and gives the reason. `_` stands for the previous right-hand side.',
            { code: lean`theorem calc_demo (f : Nat → Nat) (a b : Nat) (h1 : a = b) (h2 : f b = 7) : f a + 1 = 8 := by
  calc f a + 1 = f b + 1 := by rw [h1]
    _ = 7 + 1 := by rw [h2]
    _ = 8 := by rfl`, name: 'Scratch.lean' },
            'A `calc` proof is longer than `rw [h1, h2]`, and someone can read it without a goal panel. Use it when the steps are the point.',
          ],
        },
      ],
      takeaways: [
        '`rfl` proves an equation that holds by computing. `n + 0 = n` does, and `0 + n = n` does not.',
        '`rw [h]` replaces the left side of `h` by its right side. `←` reverses it, and `at` aims it at a hypothesis.',
        '`simp` rewrites with the library’s simplification rules until none applies. Add definitions and hypotheses in brackets.',
        '`simp` often leaves arithmetic, and `omega` finishes it.',
        'Library names say what a theorem is about: `List.length_append`.',
      ],
      quiz: [
        {
          q: '`n + 0 = n` is proved by `rfl`, and `0 + n = n` is not. Why?',
          options: [
            { t: 'Addition recurses on its second argument, so `0 + n` cannot take a step until `n` is known.', ok: true, why: 'With `0` second, the definition applies at once. With an unknown `n` second, it is stuck.' },
            { t: '`rfl` only works when one side is a numeral.', why: '`n + 0 = n` has no numeral on the right, and `rfl` proves it.' },
            { t: '`0 + n = n` is false for some `n`.', why: 'It is true for every `n`, and `omega` proves it. It is just not true by computing.' },
          ],
        },
        {
          q: 'The goal was `a + c = b + c`. After `rw [Nat.add_comm]` it is as shown. What did the rewrite change?',
          code: lean`a b c : Nat
h : a = b
⊢ c + a = b + c`,
          options: [
            { t: 'Only `a + c`, the first place the rule fitted.', ok: true, why: '`rw` fixes the rule’s variables at the first match, here `a` and `c`, and rewrites that instance. `b + c` is a different instance.' },
            { t: 'Both sides, each swapped once.', why: 'The right side is still `b + c`. Only instances with the same `a` and `c` are rewritten.' },
            { t: 'Only the right-hand side.', why: 'The left side changed from `a + c` to `c + a`.' },
          ],
        },
        {
          q: 'What does `rw [h1] at h2` do?',
          options: [
            { t: 'It rewrites inside the hypothesis `h2` and leaves the goal as it was.', ok: true, why: '`at` names where to rewrite.' },
            { t: 'It rewrites the goal with `h1`, then with `h2`.', why: 'That is `rw [h1, h2]`.' },
            { t: 'It replaces `h1` by `h2`.', why: '`h1` is the rule and stays. `h2` is the text being rewritten.' },
          ],
        },
        {
          q: '`simp` leaves this goal unsolved. What is the fix?',
          code: lean`f : Nat → Nat
a : Nat
h : f a = 0
⊢ f a = 0`,
          options: [
            { t: '`simp [h]`, because `simp` uses a hypothesis only when you name it.', ok: true, why: 'By default `simp` uses library rules and nothing from above the line.' },
            { t: '`omega`, because `simp` cannot work with functions.', why: '`simp` got this far with `f` in the goal. What it lacked was permission to use `h`.' },
            { t: '`rw [← h]`, because `h` points the wrong way.', why: 'The direction is fine: `h` turns `f a` into `0`, which is what is wanted.' },
          ],
        },
        {
          q: 'After `simp [double]` the goal is as shown. What finishes it?',
          code: lean`a b : Nat
⊢ (a + b) * 2 = a * 2 + b * 2`,
          options: [
            { t: '`omega`', ok: true, why: 'This is linear arithmetic: multiplication by a constant, and addition.' },
            { t: '`rfl`', why: 'With `a` and `b` unknown, the two sides do not compute to the same expression.' },
            { t: 'Another `simp`', why: '`simp` stopped because no simplification rule applied. Running it again changes nothing.' },
          ],
        },
        {
          q: '`rw [double_eq]` fails on the goal `n + n = 2 * n`, saying it did not find the pattern `double ?n`. What would rewrite this goal?',
          options: [
            { t: '`rw [← double_eq]`, which turns `n + n` into `double n`.', ok: true, why: 'The goal contains the right side of the rule, so the rule has to run backwards.' },
            { t: '`rw [double_eq] at h`', why: 'There is no hypothesis `h` here, and none contains `double` either.' },
            { t: '`unfold double`', why: 'There is no `double` in the goal to unfold. That is what the error says.' },
          ],
        },
        {
          q: '`simp` fails on `a + b = b + a` with “simp made no progress”. Why is `Nat.add_comm` not one of its rules?',
          options: [
            { t: 'Applied over and over, it would swap the operands forever.', ok: true, why: 'A simplification rule must make progress toward a standard form. Swapping has no end.' },
            { t: '`simp` only knows rules about lists.', why: 'It has many rules about numbers. It used `Nat.zero_add` in the lesson.' },
            { t: 'Commutativity needs induction, which `simp` cannot do.', why: '`Nat.add_comm` is already proved, so nothing needs redoing. The problem is using it as a rewrite rule without end.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-05-rewriting', kind: 'lab', level: 'core', title: 'Replace equals by equals',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('05'),
          'Most exercises mention an unknown function `f`. `omega` treats `f a` and `f b` as unrelated numbers even when `a = b`, so arithmetic alone will not close these. You have to rewrite first.',
          'Exercise 10 is a `calc` chain with three holes, one for the reason behind each step.',
          { code: lean`  calc double (f a) = double (f b) := by
        sorry` },
          checkLab('05'),
          solution('05'),
        ],
        hints: [
          'Exercise 3: the goal is `f (f a) = f b`, and `h : f a = b`. Rewriting right to left with `rw [← h]` replaces `b` by `f a`, and then both sides are the same.',
          'Exercise 5: after `unfold triple` the goal is `n + double n = n + (n + n)`. Your own `double_eq` is the rule that rewrites it.',
          'Exercise 9: `simp at h` turns the hypothesis into a statement about `xs.length` and `ys.length`. Exercise 11: `rw [double_eq, double_eq] at h` rewrites both sides of `h`, and `omega` does the rest.',
        ],
        checks: [
          '`lean Lab05.lean` prints nothing: no errors and no `sorry` warnings.',
          'I rewrote right to left with `←` at least once, and inside a hypothesis with `at` at least once.',
          'I ran `simp?` on exercise 7 and read the list of rules it used.',
        ],
        notes: [
          { label: 'What simp used', placeholder: 'Paste the simp only […] line that simp? suggested for exercise 7.' },
        ],
      }],
    },
    {
      id: 'induction',
      category: part,
      title: 'Induction',
      summary: 'A recursive function has a case for the empty value and a case for one more piece. So does a proof about it, and in the second case you get to assume the claim for the smaller value.',
      minutes: 45,
      topics: ['induction … with', 'The induction hypothesis', 'split', 'generalizing', 'Helper lemmas', 'fun_induction'],
      sections: [
        {
          title: 'Why cases are not enough',
          body: [
            'Here is a function that doubles by adding 2 at each step, and a claim about it.',
            { code: lean`def twice : Nat → Nat
  | 0 => 0
  | n + 1 => twice n + 2`, name: 'Scratch.lean' },
            'We want `twice n = 2 * n` for every `n`. `omega` cannot see inside `twice`, and unfolding does not help while `n` is unknown. Try splitting into the two cases of a natural number. Zero is easy. In the other case, after unfolding, the goal panel shows this.',
            { text: lean`case succ
k : Nat
⊢ twice k + 2 = 2 * (k + 1)` },
            'You are stuck. The goal mentions `twice k`, and you know nothing about it. But `twice k = 2 * k` is the very claim you are proving, for a smaller number. If you were allowed to assume it, `omega` would finish.',
          ],
        },
        {
          title: 'Induction gives you the smaller case',
          body: [
            'That assumption is what `induction` adds. It has the same two cases, and in the second it hands you the claim for `k` as a hypothesis.',
            { code: lean`theorem twice_eq (n : Nat) : twice n = 2 * n := by
  induction n with
  | zero => rfl
  | succ k ih =>
    unfold twice
    omega`, name: 'Scratch.lean' },
            { text: lean`case succ
k : Nat
ih : twice k = 2 * k
⊢ twice k + 2 = 2 * (k + 1)` },
            'The hypothesis `ih` is the **induction hypothesis**. The names after `succ` are yours to choose: `k` for the smaller number and `ih` for the claim about it.',
            'Why is assuming the claim allowed? Because the proof is a recipe. It proves the claim for 0 outright. Its second case turns a proof for `k` into a proof for `k + 1`. To get the claim for 3, run the second case three times starting from the first. Every natural number is reached this way.',
            { compare: 'An induction proof is a recursive function. `twice` computes a number for `n + 1` from the number for `n`. `twice_eq` computes a **proof** for `n + 1` from the proof for `n`, and `ih` is its recursive call. If you can write a recursion, you already know the shape of the proof about it.' },
          ],
        },
        {
          title: 'Induction on a list',
          body: [
            'A list is `[]` or `x :: rest`, so induction on a list has those two cases, and the hypothesis is about `rest`.',
            { code: lean`def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

theorem total_append (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  induction xs with
  | nil => simp [total]
  | cons x rest ih =>
    simp [total, ih]
    omega`, name: 'Scratch.lean' },
            'At the start of the `cons` case:',
            { text: lean`case cons
ys : List Nat
x : Nat
rest : List Nat
ih : total (rest ++ ys) = total rest + total ys
⊢ total (x :: rest ++ ys) = total (x :: rest) + total ys` },
            '`simp [total, ih]` unfolds `total` on both sides, which exposes `total (rest ++ ys)`, and rewrites that with `ih`. What is left is arithmetic.',
            { text: lean`case cons
ys : List Nat
x : Nat
rest : List Nat
ih : total (rest ++ ys) = total rest + total ys
⊢ x + (total rest + total ys) = x + total rest + total ys` },
            'There were two lists to choose from. Induct on the one the functions take apart. Both `++` and `total` recurse on their first list, so with `xs` replaced by `x :: rest` they can each take a step. Induction on `ys` would leave `xs ++ …` stuck.',
          ],
        },
        {
          title: 'An if in the goal',
          body: [
            'When a function has an `if`, so does the goal once you unfold it. `split` makes one goal for each branch, and adds the condition as a hypothesis.',
            { code: lean`def evens : List Nat → List Nat
  | [] => []
  | x :: rest => if x % 2 = 0 then x :: evens rest else evens rest

theorem evens_length (xs : List Nat) : (evens xs).length ≤ xs.length := by
  induction xs with
  | nil => simp [evens]
  | cons x rest ih =>
    simp [evens]
    split
    · simp
      omega
    · omega`, name: 'Scratch.lean' },
            'After `simp [evens]`, and then inside the first branch after `split`:',
            { text: lean`case cons
x : Nat
rest : List Nat
ih : (evens rest).length ≤ rest.length
⊢ (if x % 2 = 0 then x :: evens rest else evens rest).length ≤ rest.length + 1` },
            { text: lean`case cons.isTrue
x : Nat
rest : List Nat
ih : (evens rest).length ≤ rest.length
h✝ : x % 2 = 0
⊢ (x :: evens rest).length ≤ rest.length + 1` },
            'The dagger in `h✝` marks a name Lean made up. You cannot type it, and here you do not need to: `omega` reads every hypothesis.',
          ],
        },
        {
          title: 'An accumulator needs a stronger claim',
          body: [
            'Lesson 3 wrote the same sum with a running total. Proving that the two versions agree is the first real verification in this course: a fast implementation against a clear specification.',
            { code: lean`def totalFast (xs : List Nat) : Nat :=
  go 0 xs
where
  go (acc : Nat) : List Nat → Nat
    | [] => acc
    | x :: rest => go (acc + x) rest`, name: 'Scratch.lean' },
            'The helper is where the recursion is, so the proof is about the helper. Its claim has to say what `go` does for **any** starting value: `totalFast.go acc xs = acc + total xs`. Try a plain induction on `xs`, and the second case reaches this.',
            { text: lean`case cons
acc x : Nat
rest : List Nat
ih : totalFast.go acc rest = acc + total rest
⊢ totalFast.go (acc + x) rest = acc + (x + total rest)` },
            'The goal calls `go` with `acc + x`. The hypothesis is about `go` with `acc`. They do not match, and `ih` is useless. The accumulator changes at each step, so the hypothesis must hold for every accumulator. `generalizing acc` asks for that.',
            { code: lean`theorem go_eq (acc : Nat) (xs : List Nat) : totalFast.go acc xs = acc + total xs := by
  induction xs generalizing acc with
  | nil => simp [totalFast.go, total]
  | cons x rest ih =>
    simp [totalFast.go, total, ih]
    omega`, name: 'Scratch.lean' },
            { text: lean`case cons
x : Nat
rest : List Nat
ih : ∀ (acc : Nat), totalFast.go acc rest = acc + total rest
acc : Nat
⊢ totalFast.go (acc + x) rest = acc + (x + total rest)` },
            'Now `ih` starts with `∀ (acc : Nat)`, so it applies to `acc + x`. With the helper done, the theorem you wanted is one line.',
            { code: lean`theorem totalFast_eq (xs : List Nat) : totalFast xs = total xs := by
  simp [totalFast, go_eq]`, name: 'Scratch.lean' },
            { compare: 'This is a loop invariant. In the Python loop `for x in xs: total += x`, the invariant is “`total` equals the starting value plus the sum of the elements seen so far”. `go_eq` is that sentence, and `generalizing acc` is what lets it hold at every trip round the loop, not only the first. Lesson 12 returns to invariants with loop syntax.' },
          ],
        },
        {
          title: 'When you are stuck, state the lemma you need',
          body: [
            'This function reverses a list by moving each head to the end.',
            { code: lean`def slowRev {α : Type} : List α → List α
  | [] => []
  | x :: rest => slowRev rest ++ [x]`, name: 'Scratch.lean' },
            'Reversing twice should give back the list. Induction on `xs`, and `simp [slowRev]` in the second case, leads here.',
            { text: lean`case cons
α : Type
x : α
rest : List α
ih : slowRev (slowRev rest) = rest
⊢ slowRev (slowRev rest ++ [x]) = x :: rest` },
            'The hypothesis is about `slowRev (slowRev rest)`. The goal has `slowRev` of something with `[x]` on the end, and no rule you have says what that is. This is not a dead end. It is a description of a missing fact: what `slowRev` does to a list with an element appended. State that as its own theorem and prove it by its own induction.',
            { code: lean`theorem slowRev_snoc {α : Type} (xs : List α) (x : α) : slowRev (xs ++ [x]) = x :: slowRev xs := by
  induction xs with
  | nil => rfl
  | cons y rest ih => simp [slowRev, ih]

theorem slowRev_slowRev {α : Type} (xs : List α) : slowRev (slowRev xs) = xs := by
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [slowRev, slowRev_snoc, ih]`, name: 'Scratch.lean' },
            'Most of the work in a real proof is this: reading a stuck goal, working out the general fact it is asking for, and proving that first.',
          ],
        },
        {
          title: 'Induction that follows the function',
          body: [
            'Some functions do not recurse on a piece of their argument. `countUp` from lesson 3 recurses on `lo + 1`, and neither `lo` nor `hi` is the right thing to induct on. `fun_induction` gives you a proof with the same cases as the function, and a hypothesis for each recursive call.',
            { code: lean`def countUp (lo hi : Nat) : List Nat :=
  if lo < hi then lo :: countUp (lo + 1) hi else []

theorem countUp_length (lo hi : Nat) : (countUp lo hi).length = hi - lo := by
  fun_induction countUp lo hi with
  | case1 lo h ih =>
    simp [ih]
    omega
  | case2 lo h =>
    simp
    omega`, name: 'Scratch.lean' },
            'There is one case for each branch of the `if`. In the first the condition holds, the function has already been unfolded, and `ih` is the claim for the recursive call. In the second the condition fails and the function returned `[]`.',
            { text: lean`case case1
hi lo : Nat
h : lo < hi
ih : (countUp (lo + 1) hi).length = hi - (lo + 1)
⊢ (lo :: countUp (lo + 1) hi).length = hi - lo` },
            { text: lean`case case2
hi lo : Nat
h : ¬lo < hi
⊢ [].length = hi - lo` },
            'You will use this for binary search in lesson 10, where the recursion is on a shrinking range.',
          ],
        },
      ],
      takeaways: [
        'Induction has a case for the empty value and a case for one more piece, where you may assume the claim for the smaller value.',
        'Induct on the argument the functions take apart.',
        '`split` turns an `if` in the goal into one goal for each branch.',
        'A claim about an accumulator must hold for every accumulator: use `generalizing`.',
        'A stuck goal often describes the lemma you are missing. State it and prove it separately.',
      ],
      quiz: [
        {
          q: 'In the case `| succ k ih =>` of a proof of `twice n = 2 * n`, what is `ih`?',
          options: [
            { t: 'A proof of `twice k = 2 * k`, the claim for the smaller number.', ok: true, why: 'The goal in this case is the claim for `k + 1`, and `ih` is the claim for `k`.' },
            { t: 'A proof of `twice (k + 1) = 2 * (k + 1)`.', why: 'That is the goal of this case. If you had it as a hypothesis there would be nothing to prove.' },
            { t: 'The fact that `k` is smaller than `n`.', why: '`n` has been replaced by `k + 1`. The hypothesis is the theorem’s own statement, with `k` in place of `n`.' },
          ],
        },
        {
          q: 'The second case of an induction shows this. What will let you finish?',
          code: lean`case cons
x : Nat
rest : List Nat
ih : (List.map (fun x => x + 1) rest).length = rest.length
⊢ (List.map (fun x => x + 1) (x :: rest)).length = (x :: rest).length`,
          options: [
            { t: 'Unfold `map` and `length` one step on `x :: rest`, then use `ih`.', ok: true, why: 'One step exposes `(map … rest).length` on the left, which `ih` rewrites to `rest.length`.' },
            { t: 'Another induction, on `rest`.', why: 'You already have the claim for `rest`: it is `ih`. A second induction would only produce the same hypothesis again.' },
            { t: '`omega`, because the goal compares two lengths.', why: '`omega` cannot see inside `List.map`. The lengths have to be simplified first.' },
          ],
        },
        {
          q: 'Why does the proof of `total (xs ++ ys) = total xs + total ys` induct on `xs` and not `ys`?',
          options: [
            { t: '`++` and `total` both recurse on their first list, so only taking `xs` apart lets them compute.', ok: true, why: 'With `xs` as `x :: rest`, both definitions unfold a step. With `ys` taken apart, `xs ++ (y :: rest)` is still stuck.' },
            { t: 'Induction is only allowed on the first variable of a theorem.', why: 'You may induct on any variable. The choice is about which one makes progress.' },
            { t: '`xs` is the longer list.', why: 'Nothing is known about their lengths. The reason is how the functions are defined.' },
          ],
        },
        {
          q: 'A plain induction on `xs` for the accumulator claim reaches this. Why is `ih` no use?',
          code: lean`case cons
acc x : Nat
rest : List Nat
ih : totalFast.go acc rest = acc + total rest
⊢ totalFast.go (acc + x) rest = acc + (x + total rest)`,
          options: [
            { t: 'It is about `go` called with `acc`, and the goal calls `go` with `acc + x`.', ok: true, why: 'The accumulator changes at each call, so the hypothesis has to hold for every accumulator. `generalizing acc` provides that.' },
            { t: 'It is about `rest`, and the goal is about `x :: rest`.', why: 'Both mention `rest` after simplifying. The mismatch is the first argument of `go`.' },
            { t: 'It has the equation the wrong way round.', why: 'The direction is fine. No rewrite in either direction makes `acc` into `acc + x`.' },
          ],
        },
        {
          q: 'What does `split` do?',
          options: [
            { t: 'It makes one goal for each branch of an `if` or `match` in the goal, with the branch’s condition as a hypothesis.', ok: true, why: 'Each branch can then be proved knowing which way the test went.' },
            { t: 'It splits a goal `p ∧ q` into two goals.', why: 'That is `constructor`. `split` is for code that branches.' },
            { t: 'It splits a list into its head and its tail.', why: 'That is `cases` or `induction` on the list.' },
          ],
        },
        {
          q: 'A proof of `slowRev (slowRev xs) = xs` is stuck on this goal. What is the best next move?',
          code: lean`case cons
α : Type
x : α
rest : List α
ih : slowRev (slowRev rest) = rest
⊢ slowRev (slowRev rest ++ [x]) = x :: rest`,
          options: [
            { t: 'State and prove a separate theorem about `slowRev (ys ++ [x])`.', ok: true, why: 'The goal needs to know what `slowRev` does to a list with an element appended. That is a general fact with its own induction.' },
            { t: 'Add `generalizing x` to the induction.', why: 'Nothing here is an accumulator, and `ih` does not mention `x`. Generalizing would not change it.' },
            { t: 'Rewrite with `ih` again.', why: '`ih` needs the pattern `slowRev (slowRev rest)`, and the goal does not contain it.' },
          ],
        },
        {
          kind: 'multi',
          q: 'Which statements about a proof by induction are true?',
          options: [
            { t: 'The first case is proved with no induction hypothesis.', ok: true, why: 'There is no smaller value to assume anything about.' },
            { t: 'The second case proves the claim for `k + 1`, assuming it for `k`.', ok: true, why: 'That step, repeated, reaches every number.' },
            { t: 'Lean checks the claim for small values and extends the pattern.', why: 'Nothing is tested. The two cases together are a complete argument.' },
            { t: 'It can only be used when the function is structurally recursive.', why: '`fun_induction` follows any recursion Lean has accepted, such as `countUp`.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-06-induction', kind: 'lab', level: 'core', title: 'Prove eight facts about recursive functions',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('06'),
          'The functions are defined at the top of the file. Every proof starts with `induction … with` and has two cases. In the second case, read the induction hypothesis in the goal panel before you write anything.',
          'The usual second step is `simp` with the names of the functions in the goal and `ih`, as in `simp [join, ih]`. If arithmetic is left over, add `omega` on the next line.',
          'Exercise 8 asks you to discover a lemma. Its starter has a placeholder statement.',
          { code: lean`theorem slowRev_join {α : Type} (xs ys : List α) : True := by
  sorry` },
          'Attempt `slowRev_slowRev` first and see where it sticks. Then replace `True` with the statement that would unstick it.',
          checkLab('06'),
          solution('06'),
        ],
        hints: [
          'Exercise 6: after `simp [evens]` the goal has an `if`. Use `split`, then `simp [total]` and `omega` in each branch.',
          'Exercise 7: the induction is `induction xs generalizing acc with`. In the second case, `simp [rev.go, slowRev, ih]` is enough.',
          'Exercise 8: the stuck goal contains `slowRev (slowRev rest ++ [x])`. The general fact is what `slowRev` does to any append: `slowRev (xs ++ ys) = slowRev ys ++ slowRev xs`. Prove it by induction on `xs`.',
        ],
        checks: [
          '`lean Lab06.lean` prints nothing: no errors and no `sorry` warnings.',
          'In exercise 7, I saw an induction hypothesis that begins with `∀`.',
          'In exercise 8, I found the lemma by reading the goal where the main proof was stuck.',
        ],
        notes: [
          { label: 'The generalized hypothesis', placeholder: 'Paste the ih line from the second case of exercise 7.' },
          { label: 'Where exercise 8 got stuck', placeholder: 'Paste the goal you could not close before you had the lemma.' },
        ],
      }],
    },
    {
      id: 'automation',
      category: part,
      title: 'Automation',
      summary: 'Four tactics close most routine goals. Know what each one decides, what it says when it fails, and where all of them stop.',
      minutes: 40,
      topics: ['decide', 'omega', 'simp', 'grind', 'exact? and simp?'],
      sections: [
        {
          title: 'Four tools, four jobs',
          body: [
            'You have met all four. This lesson puts them side by side, because choosing between them is most of the skill.',
            { table: { head: ['Tactic', 'What it settles', 'Where it stops'], rows: [
              ['`decide`', 'A claim with no variables, by running it. Also “for every `n` below a bound”.', 'Any variable, and computations too large to run.'],
              ['`omega`', 'Linear arithmetic over `Nat` and `Int`: `+`, `-`, comparisons, and `*`, `/`, `%` by a constant.', 'A product of two variables, and anything that is not a number.'],
              ['`simp`', 'Goals that become obvious after rewriting with library rules and the definitions you name.', 'Goals that need a case split, an idea, or a fact it was not given.'],
              ['`grind`', 'Goals that mix equalities, unknown functions, branches, arithmetic and algebra.', 'Goals that need induction, or a library fact it does not know.'],
            ] } },
            { aside: 'None of these tactics is trusted. Each one searches for a proof, and what it finds is handed to the kernel like a proof you wrote by hand. A bug in `grind` can make it fail to find a proof. It cannot make a false theorem pass.' },
          ],
        },
        {
          title: 'decide: run it',
          body: [
            '`decide` evaluates. It also handles a quantifier over a finite range, by checking every value.',
            { code: lean`example : ∀ n < 10, n * n < 100 := by
  decide

example : (2 : Nat) ^ 64 > 10 ^ 19 := by
  decide`, name: 'Scratch.lean' },
            'It is the right tool for a table of cases or a fact about particular numbers. It is the wrong tool the moment a variable appears, because there is nothing to run.',
          ],
        },
        {
          title: 'omega: linear arithmetic',
          body: [
            'Inside its fragment `omega` is very reliable. It understands remainders by constants, `max` and `min`, truncated subtraction, and the hypotheses above the line.',
            { code: lean`example (a b : Nat) (h1 : a % 4 = 3) (h2 : b = a + 1) : b % 4 = 0 := by
  omega

example (a b c : Nat) : a ≤ max a (max b c) := by
  omega`, name: 'Scratch.lean' },
            'So when `omega` fails, there are two likely causes. Either the claim is false, or it is not linear arithmetic. The message helps you tell which. Here `omega` meets a product of two variables.',
            { code: lean`example (a b : Nat) : (a + b) * (a + b) = a * a + 2 * a * b + b * b := by
  omega` },
            { text: lean`omega could not prove the goal:
a possible counterexample may satisfy the constraints
  f ≥ 0
  e ≥ 0
  d ≥ 0
  c ≥ 0
  c + d + e - f ≥ 1
where
 c := ↑a * ↑a
 d := ↑(2 * a) * ↑b
 e := ↑b * ↑b
 f := ↑(a + b) * ↑(a + b)` },
            'Read the `where` lines. Each product has become a separate unknown: `c`, `d`, `e` and `f`. `omega` does not multiply variables, so it sees four unrelated numbers and, correctly, no reason for the equation to hold. The claim is true. It is just outside what `omega` does, and `grind` proves it.',
            { pitfall: 'When the `where` lines list only your own variables, the claim is probably false. Check it with `#eval` on small numbers before you spend time on a proof. When `omega` fails on a linear claim, there is usually a counterexample to find.' },
          ],
        },
        {
          title: 'simp: rewrite to something simpler',
          body: [
            '`simp` does not decide anything. It rewrites the goal toward a standard form and closes it if that form is trivial. Often it leaves a simpler goal for another tactic.',
            { code: lean`example (xs ys : List Nat) : (xs ++ [1] ++ ys).length = xs.length + ys.length + 1 := by
  simp
  omega`, name: 'Scratch.lean' },
            { text: lean`xs ys : List Nat
⊢ xs.length + (ys.length + 1) = xs.length + ys.length + 1` },
            '`simp_all` is the heavy version. It simplifies every hypothesis as well as the goal, and uses each one to simplify the others.',
            { code: lean`example (xs ys : List Nat) (h : xs = []) : (xs ++ ys).length = ys.length := by
  simp_all`, name: 'Scratch.lean' },
          ],
        },
        {
          title: 'grind: several kinds of reasoning at once',
          body: [
            'Real goals mix things. `grind` combines equational reasoning, case splitting, linear arithmetic and algebra, and keeps going until the facts contradict the negated goal.',
            'It knows that a function gives equal results for equal arguments, which `omega` does not.',
            { code: lean`example (f : Nat → Nat) (a b : Nat) (h1 : f a = b) (h2 : f b = a) : f (f (f a)) = b := by
  grind`, name: 'Scratch.lean' },
            'It splits on the branches of an `if`. This theorem says that clamping always lands in the range. Give `grind` the definition to unfold.',
            { code: lean`def clamp (lo hi x : Int) : Int :=
  if x < lo then lo
  else if x > hi then hi
  else x

theorem clamp_range (lo hi x : Int) (h : lo ≤ hi) : lo ≤ clamp lo hi x ∧ clamp lo hi x ≤ hi := by
  grind [clamp]`, name: 'Scratch.lean' },
            'By hand, the same proof is a `split` for each `if` and an `omega` in each of three branches.',
            { code: lean`theorem clamp_range_by_hand (lo hi x : Int) (h : lo ≤ hi) : lo ≤ clamp lo hi x ∧ clamp lo hi x ≤ hi := by
  unfold clamp
  split
  · omega
  · split
    · omega
    · omega`, name: 'Scratch.lean' },
            'When `grind` fails, it prints a long report. Read the two ends of it. The top lists the facts it was working with, and the bottom shows values it could not rule out.',
            { code: lean`example (n : Nat) (h : n < 5) : n * n < 25 := by
  grind` },
            { text: lean`[cutsat] Assignment satisfying linear constraints
    [assign] n := 0
    [assign] 「↑n ^ 2」 := 25` },
            'It could not rule out `n` being 0 while `n` squared is 25. That is absurd, and it shows what `grind` is missing: a bound on a square is not something its arithmetic knows. The claim is true, and here the honest fix is to check the five cases.',
          ],
        },
        {
          title: 'No tactic does induction for you',
          body: [
            'A claim about a recursive function, for every input, needs induction. `grind [total]` fails on `total (xs ++ ys) = total xs + total ys`, and so does every other tactic in this lesson. You decide what to induct on. Automation then handles each case.',
            { code: lean`theorem total_append (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  induction xs with
  | nil => simp [total]
  | cons x rest ih => grind [total]`, name: 'Scratch.lean' },
            'A theorem, once proved, becomes a tool for automation. Hand it to `grind` or `simp` in brackets.',
            { code: lean`example (xs ys zs : List Nat) : total (xs ++ ys ++ zs) = total zs + total ys + total xs := by
  grind [total_append]`, name: 'Scratch.lean' },
            'The division of labor is the same in larger proofs: you supply the structure, and automation supplies the algebra. Here is the formula for the sum of the first `n` numbers. After unfolding, the second case is an equation with products of variables in it.',
            { code: lean`theorem sumTo_formula (n : Nat) : 2 * sumTo n = n * (n + 1) := by
  induction n with
  | zero => rfl
  | succ k ih =>
    unfold sumTo
    grind`, name: 'Scratch.lean' },
            { text: lean`case succ
k : Nat
ih : 2 * sumTo k = k * (k + 1)
⊢ 2 * (k + 1 + sumTo k) = (k + 1) * (k + 1 + 1)` },
          ],
        },
        {
          title: 'Ask Lean',
          body: [
            'Three tactics answer questions. `exact?` searches the library for a theorem that proves the goal. On `(xs ++ ys).length = xs.length + ys.length` it replies with this.',
            { text: lean`exact List.length_append` },
            '`simp?` and `grind?` report what they used, as a call you can paste in their place. For the list example above, `simp?` suggests this.',
            { text: lean`simp only [List.append_assoc, List.cons_append, List.nil_append, List.length_append, List.length_cons]` },
            'There are two reasons to keep the longer form. It is faster, because nothing is searched. And it is stable: plain `simp` uses whatever rules the library has today, so a proof can break when you upgrade Lean, while `simp only` names its rules.',
            'One more piece of notation saves typing. `t <;> u` runs `u` on every goal that `t` produces.',
            { code: lean`theorem next_cycle (l : Light) : l.next.next.next = l := by
  cases l <;> rfl`, name: 'Scratch.lean' },
          ],
        },
      ],
      takeaways: [
        '`decide` runs a claim that has no variables. `omega` proves linear arithmetic. `simp` rewrites. `grind` combines several kinds of reasoning.',
        'A failed `omega` usually means the claim is false or not linear. Its `where` lines show what it treated as unknown.',
        'No tactic does induction. Choose the structure yourself, and let automation close each case.',
        'A proved theorem can be handed to `simp` or `grind` in brackets.',
        'Whatever a tactic finds is checked by the kernel.',
      ],
      quiz: [
        {
          q: 'Which tactic proves `∀ n < 20, n * n ≠ 50`?',
          options: [
            { t: '`decide`', ok: true, why: 'The range is finite and there is no free variable, so every case can be run.' },
            { t: '`omega`', why: '`n * n` is a product of a variable with itself, which is outside linear arithmetic.' },
            { t: '`rfl`', why: 'The claim is not an equation between two expressions.' },
          ],
        },
        {
          q: '`omega` fails, and its message ends as shown. What does that tell you?',
          code: lean`where
 c := ↑a * ↑a
 d := ↑(2 * a) * ↑b
 e := ↑b * ↑b
 f := ↑(a + b) * ↑(a + b)`,
          options: [
            { t: 'Each product of variables was treated as an unrelated unknown, so the goal is not linear.', ok: true, why: '`omega` does not multiply variables. The claim may well be true, and it needs a different tactic.' },
            { t: 'The claim is false when `a` and `b` are 0.', why: 'The lines are not values of `a` and `b`. They define new unknowns that stand for whole products.' },
            { t: 'The claim would hold over `Int`, and fails over `Nat`.', why: 'The arrows are how `omega` moves `Nat` values into `Int`. They say nothing about the claim.' },
          ],
        },
        {
          q: '`omega` cannot prove `f a = f b` from `h : a = b`. Why not, and what can?',
          options: [
            { t: 'It treats `f a` and `f b` as unrelated numbers. `grind` or `rw [h]` proves it.', ok: true, why: 'That a function gives equal results for equal arguments is not arithmetic. `grind` knows it, and rewriting uses it directly.' },
            { t: 'It cannot use hypotheses. `simp` proves it.', why: '`omega` reads hypotheses. And plain `simp` would not use `h` unless you named it.' },
            { t: 'The claim is false for some functions.', why: 'Every function returns equal results for equal arguments.' },
          ],
        },
        {
          q: 'Which tactic proves `a - b = 0` for natural numbers, given `h : a ≤ b`?',
          options: [
            { t: '`omega`', ok: true, why: 'It knows that subtraction on `Nat` stops at zero.' },
            { t: '`decide`', why: '`a` and `b` are variables, so there is nothing to run.' },
            { t: '`rfl`', why: 'With `a` and `b` unknown, `a - b` does not compute to `0`.' },
          ],
        },
        {
          q: '`grind [total]` fails on `total (xs ++ ys) = total xs + total ys`. What is the best next step?',
          options: [
            { t: 'Induct on `xs`, and let automation close each case.', ok: true, why: 'The claim is about a recursive function on every list. No tactic here chooses an induction for you.' },
            { t: 'Give `grind` more lemmas about `++`.', why: 'It already has them. What is missing is the induction hypothesis, and only `induction` supplies that.' },
            { t: 'Use `decide`.', why: '`xs` and `ys` are variables. There is nothing to evaluate.' },
          ],
        },
        {
          q: '`simp?` prints a `simp only […]` call. Why paste it over the plain `simp`?',
          options: [
            { t: 'It is faster, and it keeps working when the library’s default rules change.', ok: true, why: 'The rules are named, so nothing is searched and nothing depends on today’s rule set.' },
            { t: 'The kernel trusts `simp only` and not `simp`.', why: 'The kernel checks the proof either tactic produces. It trusts neither.' },
            { t: '`simp only` can prove more goals.', why: 'It proves fewer, because it uses only the rules you list.' },
          ],
        },
        {
          kind: 'multi',
          q: 'Which statements about a proof found by `grind` are true?',
          options: [
            { t: 'The kernel checks it, as it checks a proof written by hand.', ok: true, why: 'Every tactic produces a proof for the kernel.' },
            { t: 'A bug in `grind` could make it fail, but could not make a false theorem pass.', ok: true, why: 'A wrong proof is rejected by the kernel.' },
            { t: 'It is weaker evidence than a proof built step by step.', why: 'A checked proof is a checked proof. How it was found does not matter.' },
            { t: '`grind` will try induction when a goal needs it.', why: 'It does not. You choose the induction.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-07-automation', kind: 'lab', level: 'core', title: 'Choose the tool',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('07'),
          'The first six exercises each fall to one tactic, in one case with `omega` after it. Choosing it is the exercise. Try the wrong ones on purpose and read what they say: you will meet those messages again in your own proofs.',
          'From exercise 7 on, automation needs a first step from you: an induction, or a lemma handed over in brackets.',
          'Exercise 10 is false as stated.',
          { code: lean`theorem ex10 (a b c : Nat) : a + (b - c) = a + b - c := by
  sorry` },
          'Find numbers that break it with `#eval`, add the weakest hypothesis that repairs it, and prove the result.',
          checkLab('07'),
          solution('07'),
        ],
        hints: [
          'Exercise 4 has an unknown function and a sum, which is a job for `grind`. Exercise 5 needs the definition: `grind [distance]`.',
          'Exercises 8 and 9 are inductions. In the second case, unfold the function or hand its name to `grind`, and the induction hypothesis does the rest.',
          'Exercise 10: try `a := 0`, `b := 0`, `c := 1`. The left side is `0` and so is the right, so look for a case where truncation matters on one side only: `a := 1`, `b := 0`, `c := 1`. The repair is `(h : c ≤ b)`.',
        ],
        checks: [
          '`lean Lab07.lean` prints nothing: no errors and no `sorry` warnings.',
          'For at least two exercises I tried a tactic that fails and read its message.',
          'For exercise 10, I found numbers that break the original claim.',
        ],
        notes: [
          { label: 'A failure worth keeping', placeholder: 'Paste one failure message you got from the wrong tactic, and say in a sentence what it told you.' },
          { label: 'Counterexample for exercise 10', placeholder: 'Which a, b and c break the claim, and what does each side evaluate to?' },
        ],
      }],
    },
  );
})();
