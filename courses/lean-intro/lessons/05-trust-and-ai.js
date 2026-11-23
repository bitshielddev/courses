// Part 5: Trust and AI. What a checked proof does and does not establish, proofs you did not write, and running the result.
(() => {
  const lean = String.raw; // lean`…` keeps backslashes as written
  const part = 'Part 5 · Trust and AI';
  const { fetchLab, checkLab, solution } = window.LEAN_COURSE;

  (window.C_LESSONS ||= []).push(
    {
      id: 'what-did-you-prove',
      category: part,
      title: 'What did you prove?',
      summary: 'Lean accepted the file. That settles one question and leaves several open. This lesson is the audit: six ways a checked theorem can be worth less than it looks, and how to find each.',
      minutes: 40,
      topics: ['#print axioms', 'sorry and axiom', 'Vacuous hypotheses', 'Hollow definitions', 'implemented_by', 'The trusted base'],
      sections: [
        {
          title: 'What the check covers',
          body: [
            'When Lean accepts a theorem, a small program called the kernel has confirmed one thing: the statement follows from the definitions it mentions and the axioms it uses. That guarantee is strong, and it is narrow. It says nothing about whether the statement is the one you wanted, whether the axioms are acceptable, or whether the program that runs is the one the theorem describes.',
            { table: { head: ['The theorem is accepted, and yet', 'How you find out'], rows: [
              ['A proof it depends on is unfinished.', '`#print axioms` shows `sorryAx`.'],
              ['It rests on something that was assumed, not proved.', '`#print axioms` shows the assumption by name.'],
              ['Its hypotheses can never all be true.', 'Read them. No tool reports this.'],
              ['A definition in the statement does not mean what its name says.', 'Read the definitions. No tool reports this.'],
              ['The code that runs is not the code that was proved.', 'Look for `implemented_by` and `extern`.'],
              ['The proof trusts compiled code.', '`#print axioms` shows an axiom named after the theorem.'],
            ] } },
            'The rest of the lesson is one example of each.',
          ],
        },
        {
          title: 'What a theorem rests on',
          body: [
            '`#print axioms` lists every axiom a theorem depends on, however indirectly. These examples use a one-line function: `def rev (xs : List Nat) : List Nat := xs.reverse`.',
            { code: lean`theorem two_plus_two : 2 + 2 = 4 :=
  rfl

#print axioms two_plus_two`, name: 'Scratch.lean' },
            { text: lean`'two_plus_two' does not depend on any axioms` },
            'Most theorems use a few. These are from a proof by `simp` and a proof by `omega`.',
            { text: lean`'rev_length' depends on axioms: [propext]` },
            { text: lean`'succ_le' depends on axioms: [propext, Quot.sound]` },
            'Three axioms are part of Lean’s standard logic. Tactics use them freely, and a proof that depends on them is an ordinary proof.',
            { table: { head: ['Axiom', 'What it says'], rows: [
              ['`propext`', 'Two claims that imply each other are equal.'],
              ['`Quot.sound`', 'Elements that a quotient type identifies are equal in it.'],
              ['`Classical.choice`', 'Something that exists can be picked. This is what allows “either `p` holds or it does not” for any `p`.'],
            ] } },
            'Anything else in the list needs an explanation.',
          ],
        },
        {
          title: 'A hole underneath, and an assumption',
          body: [
            'A `sorry` produces a warning at the theorem that contains it. A theorem that **uses** that one gets no warning of its own.',
            { code: lean`theorem rev_length_helper (xs : List Nat) : (rev xs).length = xs.length := by
  sorry

theorem rev_append_length (xs ys : List Nat) : (rev (xs ++ ys)).length = xs.length + ys.length := by
  rw [rev_length_helper]
  simp`, name: 'Scratch.lean' },
            { text: lean`'rev_append_length' depends on axioms: [propext, sorryAx]` },
            '`sorryAx` is the axiom behind `sorry`: it claims that anything is true. In a large project the warning is one line among thousands, in a file you may never open. The axiom list is where it cannot hide.',
            'The keyword `axiom` declares a claim to be true with no proof at all, and with no warning.',
            { code: lean`axiom rev_length_assumed (xs : List Nat) : (rev xs).length = xs.length

theorem rev_length_again (xs : List Nat) : (rev xs).length = xs.length :=
  rev_length_assumed xs`, name: 'Scratch.lean' },
            { text: lean`'rev_length_again' depends on axioms: [rev_length_assumed]` },
            'This axiom happens to be true. Nothing requires that. One false axiom is enough to prove every statement there is.',
            { code: lean`axiom one_is_two : 1 = 2

theorem anything : 2 + 2 = 5 := by
  have h := one_is_two
  omega`, name: 'Scratch.lean' },
            { text: lean`'anything' depends on axioms: [one_is_two, propext, Quot.sound]` },
            'The file compiles cleanly, and `anything` is a theorem.',
          ],
        },
        {
          title: 'Hypotheses nobody can meet',
          body: [
            'Lesson 4 noted that from contradictory assumptions anything follows. Here is what that looks like in a specification.',
            { code: lean`theorem always_42 (n : Nat) (h : n < 0) : n = 42 := by
  omega`, name: 'Scratch.lean' },
            { text: lean`'always_42' depends on axioms: [propext, Quot.sound]` },
            'Nothing is wrong with the proof or its axioms. The theorem is true, and it can never be used, because no natural number is below zero. A precondition that is too strong does the same thing less visibly: the theorem holds, and the callers you care about cannot supply what it asks for.',
            'No command detects this. Read the hypotheses and ask who could satisfy them. When it is not obvious, prove that someone can.',
            { code: lean`theorem positive_exists : ∃ n : Nat, n > 5 := by
  exists 6`, name: 'Scratch.lean' },
          ],
        },
        {
          title: 'Definitions that do not mean what their names say',
          body: [
            'A theorem is a statement about definitions, and a name is only a name.',
            { code: lean`def AllPositive (xs : List Nat) : Prop :=
  ∀ x ∈ xs, x ≥ 0

theorem everything_is_positive (xs : List Nat) : AllPositive xs := by
  simp [AllPositive]`, name: 'Scratch.lean' },
            'Every natural number is at least 0, so every list is “all positive”, including `[0, 0]`. A theorem such as `AllPositive (keepPositive xs)` would be true, and so would the same theorem about a function that kept everything. The fault is one character in a definition that the theorem’s statement does not show.',
            'So reading the statement is not enough. Read every definition it mentions, and every definition those mention, until you reach ones you trust. That set is what you are really relying on, and keeping it small is a reason to write specifications with simple, short definitions.',
          ],
        },
        {
          title: 'The program that runs is not the program that was proved',
          body: [
            'A theorem is about a definition. What runs is compiled code. Usually the second is produced from the first, but Lean lets you break that link on purpose.',
            { code: lean`def quick (n : Nat) : Nat :=
  n + 1

@[implemented_by quick]
def careful (n : Nat) : Nat :=
  n

theorem careful_id (n : Nat) : careful n = n :=
  rfl`, name: 'Scratch.lean' },
            'The attribute tells the compiler to run `quick` wherever `careful` is called. The theorem is proved, correctly, about the definition. Now run it: `#eval careful 5` prints this.',
            { text: lean`6` },
            { text: lean`'careful_id' does not depend on any axioms` },
            'The proof is spotless, and the program does something else. Nothing checks that the replacement agrees with the original. Lean’s library uses `implemented_by` for speed, and each use is a promise made by a person.',
            { pitfall: 'When you review code that is claimed to be verified, search it for `implemented_by`, `extern`, `partial` and `unsafe`. Each one marks a place where what is proved and what runs have been allowed to differ. An `implemented_by` should come with a theorem saying that the two functions are equal.' },
          ],
        },
        {
          title: 'Trusting more than the kernel',
          body: [
            'Some tactics do not hand the kernel a full proof. `native_decide` evaluates a claim with compiled code and takes the answer on trust. It records that as an axiom of its own.',
            { code: lean`theorem squares_small : ∀ n < 1000, n * n < 1000000 := by
  native_decide`, name: 'Scratch.lean' },
            { text: lean`'squares_small' depends on axioms: [squares_small._native.native_decide.ax_1_1]` },
            'You saw the same thing under `bv_decide` in lesson 13. An axiom with `_native` in its name means that a compiled program said so. That is usually acceptable, and it is a different promise: the claim is as reliable as Lean’s compiler and the machine it ran on, not just the kernel.',
            'This is the **trusted base**: everything that has to be right for the theorem to mean what it says. For an ordinary proof it is the kernel, which is small enough to have been reimplemented independently more than once. Add `native_decide` and it includes the compiler. Run the program and it includes the compiler, the runtime, the operating system and the hardware. Verification does not remove trust. It tells you exactly where the trust is.',
            { native: 'Since Lean 4.35 there is a command for auditing a whole project, `lake check`. It rebuilds the project, replays every proof through the kernel, and fails if anything uses an axiom outside the standard three. It runs the code in a sandbox that is available only on Linux, so on macOS it reports that it cannot run.' },
          ],
        },
        {
          title: 'A check you can keep in the file',
          body: [
            'One fault remains: a theorem that is true and proved, and is not the theorem you asked for. Guard against it by writing the statement once, by itself, and checking any proof against it.',
            { code: lean`def Request : Prop :=
  ∀ xs : List Nat, (rev xs).length = xs.length

example : Request :=
  rev_length`, name: 'Scratch.lean' },
            'The `example` type-checks only if `rev_length` proves exactly `Request`. A theorem that proves something narrower does not fit.',
            { code: lean`theorem rev_length_short (xs : List Nat) (h : xs.length < 100) : (rev xs).length = xs.length := by
  simp [rev]` },
            { text: lean`Type mismatch
  rev_length_short
has type
  ∀ (xs : List Nat), xs.length < 100 → (rev xs).length = xs.length
but is expected to have type
  Request` },
            'With the statement fixed in one place, you review that place carefully once, and Lean compares every candidate against it. The next lesson relies on this.',
          ],
        },
      ],
      takeaways: [
        'A checked theorem follows from its definitions and axioms. Whether those are the right ones is a separate question.',
        '`#print axioms` reveals a `sorry` or an `axiom` anywhere underneath, and proofs that trust compiled code.',
        'It does not reveal hypotheses that cannot be met, or definitions that mean less than their names. Those you find by reading.',
        '`implemented_by` lets the program that runs differ from the definition that was proved.',
        'Fix the statement in one place and check proofs against it.',
      ],
      quiz: [
        {
          q: '`#print axioms t` prints `[propext, sorryAx]`, and `t` itself has no warning. What does that mean?',
          options: [
            { t: 'Something `t` depends on, perhaps several steps away, was closed with `sorry`.', ok: true, why: 'The warning sits on the theorem that contains the `sorry`. The axiom list follows it into everything that uses that theorem.' },
            { t: '`t` is proved, and `sorryAx` is one of the standard axioms.', why: 'The standard axioms are `propext`, `Quot.sound` and `Classical.choice`. `sorryAx` means a proof is missing.' },
            { t: 'Lean made a mistake, because a `sorry` always gives a warning.', why: 'It does, at the theorem where it is written. That may be in another file.' },
          ],
        },
        {
          q: 'How can `theorem anything : 2 + 2 = 5` be accepted?',
          options: [
            { t: 'It uses the axiom `one_is_two`, and from one false axiom everything follows.', ok: true, why: 'An axiom is assumed without proof. If it is false, the logic proves every statement.' },
            { t: '`omega` has a bug with small numbers.', why: '`omega` did its job: from `1 = 2` among the hypotheses, the goal does follow.' },
            { t: 'Addition on `Nat` can overflow.', why: '`Nat` has no largest value and never overflows.' },
          ],
        },
        {
          q: '`always_42` depends only on standard axioms. Why is it still worthless?',
          options: [
            { t: 'Its hypothesis `n < 0` can never hold, so the theorem can never be applied.', ok: true, why: 'A claim made under an impossible assumption is true and says nothing.' },
            { t: 'It should have been proved by `decide`.', why: 'Which tactic found the proof makes no difference to what was proved.' },
            { t: 'Standard axioms are not allowed in theorems about numbers.', why: 'They are allowed everywhere. `omega` uses them routinely.' },
          ],
        },
        {
          q: 'What is wrong with this theorem?',
          code: lean`theorem impossible_square (n : Nat) (h : n > 10) (h2 : n < 5) : n * n = 7 := by
  omega`,
          options: [
            { t: 'No number is above 10 and below 5, so it says nothing about any number.', ok: true, why: 'The two hypotheses contradict each other, which is how `omega` managed to prove a claim about a product.' },
            { t: 'It uses `omega` on a product of variables.', why: 'That would normally fail. Here `omega` never looks at the product, because the hypotheses are already contradictory.' },
            { t: 'It needs `#print axioms` to show `sorryAx`.', why: 'There is no `sorry`. The axiom list would look perfectly normal.' },
          ],
        },
        {
          q: '`everything_is_positive` proves `AllPositive xs` for every list, including `[0]`. What went wrong?',
          options: [
            { t: 'The definition says `x ≥ 0`, which is true of every natural number, so the name promises more than the definition delivers.', ok: true, why: 'The theorem is correct about the definition as written. The definition is the fault.' },
            { t: '`simp` proved a false statement.', why: 'The statement is true. Every natural number is at least 0.' },
            { t: 'The theorem needs a hypothesis that the list is not empty.', why: 'That would not help. The definition would still hold of every list.' },
          ],
        },
        {
          q: '`careful_id` proves `careful n = n`, and `#eval careful 5` prints 6. How can both be true?',
          options: [
            { t: '`implemented_by` makes the compiler run a different function, and nothing checks that the two agree.', ok: true, why: 'The theorem is about the definition. The evaluation runs the replacement.' },
            { t: 'The theorem was proved with `rfl`, which does not check definitions.', why: '`rfl` checked the definition correctly: `careful n` does compute to `n` there.' },
            { t: '`#eval` rounds its result.', why: '`#eval` printed exactly what the replacement function returned.' },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these does `#print axioms` reveal?',
          options: [
            { t: 'A `sorry` in a theorem this one depends on.', ok: true, why: 'It appears as `sorryAx`.' },
            { t: 'An `axiom` used anywhere underneath.', ok: true, why: 'It is listed by name.' },
            { t: 'A proof by `native_decide` or `bv_decide`.', ok: true, why: 'Each adds an axiom with `_native` in its name.' },
            { t: 'Hypotheses that contradict each other.', why: 'The axioms are normal. Only reading the statement shows this.' },
            { t: 'A function replaced at run time with `implemented_by`.', why: 'The proof does not involve the replacement, so nothing shows.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-14-audit', kind: 'lab', level: 'core', title: 'Audit a delivery, then repair it',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('14'),
          'This lab is different. The file is a piece of work handed to you as finished: five deliverables, each a theorem. It compiles. One fault of each kind from the lesson is planted in it, apart from the last.',
          'Audit first. The file ends with five lines that print what each deliverable rests on. Run it and read them.',
          checkLab('14'),
          'Two faults show there. The others you find by reading: the hypotheses of deliverable 3, the definition behind deliverable 4, and the attribute above deliverable 5, where a test also fails.',
          'Then repair each one. Prove the helper. Turn the axiom into a theorem and prove it. Remove the hypothesis that cannot be met. Correct the definition. Fix the fast implementation, and prove that it equals the function it stands in for.',
          'You are finished when the command prints the five audit lines and nothing else, and none of them lists anything beyond the three standard axioms.',
          solution('14'),
        ],
        hints: [
          'Deliverables 1 and 2 are proofs you have written before: `total_append` is in lesson 6, and `go_eq` is the accumulator proof with `generalizing acc`. To repair deliverable 2, change the word `axiom` to `theorem` and add `:= by` with a proof.',
          'Deliverable 3 assumes both `lo ≤ hi` and `hi < lo`. Delete the second. The proof then needs to look inside `clamp`: `grind [clamp]`. Deliverable 4: change `≥` to `>` in `AllPositive`, and give `simp` the name `keepPositive` as well.',
          'Deliverable 5: the helper adds one for an element that is not zero, and it should be the other way round. Then `countZerosFast_go` is an accumulator proof again: induct on `xs` generalizing `acc`, `simp [countZerosFast.go, countZeros, ih]`, then `split <;> omega`.',
        ],
        checks: [
          '`lean Lab14.lean` prints five audit lines and nothing else.',
          'No audit line lists anything beyond `propext`, `Classical.choice` and `Quot.sound`.',
          'I found the faults in deliverables 3 and 4 by reading, before I looked at the hints.',
          'I proved that the fast implementation in deliverable 5 equals the definition it replaces.',
        ],
        notes: [
          { label: 'The audit, before', placeholder: 'Paste the five #print axioms lines from the file as you received it.' },
          { label: 'How I found each fault', placeholder: 'One line for each deliverable: what was wrong, and what told you.' },
          { label: 'The audit, after', placeholder: 'Paste the five lines again when you have finished.' },
        ],
      }],
    },
    {
      id: 'ai-written-proofs',
      category: part,
      title: 'Proofs written by an AI',
      summary: 'A proof is hard to write and easy to check, which makes it a good job to hand to a machine. Your part is the one Lean cannot do: deciding what was asked, and confirming that it is what was answered.',
      minutes: 35,
      topics: ['Who checks what', 'Acceptance theorems', 'Four bad answers', 'Reading a diff', 'Working with an assistant'],
      sections: [
        {
          title: 'You review the question. Lean reviews the answer',
          body: [
            'Code written by an AI assistant has to be reviewed by someone who could have written it, because nothing else stands between a plausible mistake and production. A proof is different. If Lean accepts it, it is a proof, whoever or whatever produced it and however odd it looks. An assistant can try fifty approaches, and the forty-nine that fail cost you nothing.',
            'That moves the human work. Lesson 14 listed what the kernel does not check: whether the statement is the one you wanted, what the definitions mean, and what was assumed. An assistant under pressure to make a file compile can get any of those wrong, and unlike a wrong proof, a wrong statement compiles.',
            { table: { head: ['Question', 'Who answers it'], rows: [
              ['Is this proof correct?', 'Lean.'],
              ['Does the theorem say what I asked for?', 'You, once, by writing the statement. Lean, every time after, by comparing.'],
              ['Do the definitions mean what I think?', 'You, by reading them.'],
              ['What does it rest on?', '`#print axioms`.'],
            ] } },
          ],
        },
        {
          title: 'Write the request so that it can be checked',
          body: [
            'Put what you are asking for in one place, as definitions and a named statement. This part you write, or read word by word.',
            { code: lean`def evens : List Nat → List Nat
  | [] => []
  | x :: rest => if x % 2 = 0 then x :: evens rest else evens rest

def Request : Prop :=
  ∀ xs ys : List Nat, evens (xs ++ ys) = evens xs ++ evens ys`, name: 'Request.lean' },
            'An answer is accepted by a theorem whose statement is the request and whose proof is the submitted theorem. Here is an honest answer, in a namespace of its own, and its acceptance.',
            { code: lean`namespace Honest

theorem evens_append (xs ys : List Nat) : evens (xs ++ ys) = evens xs ++ evens ys := by
  induction xs with
  | nil => rfl
  | cons x rest ih =>
    simp [evens]
    split <;> simp [ih]

end Honest

theorem accepted : Request :=
  Honest.evens_append

#print axioms accepted`, name: 'Scratch.lean' },
            { text: lean`'accepted' depends on axioms: [propext]` },
            'Two checks, both mechanical. The acceptance theorem compiles, so the answer states exactly what was requested. The axiom list is standard, so nothing was assumed. You did not have to read the proof.',
          ],
        },
        {
          title: 'Four answers that compile and are wrong',
          body: [
            'Each of these is a file that builds without an error. Each is something an assistant might produce when the honest proof is hard, because each is a way to make the build pass.',
            '**An extra hypothesis.** The theorem is proved only for a case where it is easy.',
            { code: lean`theorem evens_append (xs ys : List Nat) (h : xs = []) : evens (xs ++ ys) = evens xs ++ evens ys := by
  subst h
  rfl` },
            { text: lean`Type mismatch
  Narrowed.evens_append
has type
  ∀ (xs ys : List Nat), xs = [] → evens (xs ++ ys) = evens xs ++ evens ys
but is expected to have type
  Request` },
            '**The same words about a different function.** The answer defines its own `evens`, which does nothing, and proves the theorem about that. The statement reads the same, character for character.',
            { code: lean`namespace Redefined

def evens (xs : List Nat) : List Nat :=
  xs

theorem evens_append (xs ys : List Nat) : evens (xs ++ ys) = evens xs ++ evens ys := by
  rfl

end Redefined` },
            { text: lean`Type mismatch
  Redefined.evens_append
has type
  ∀ (xs ys : List Nat), Redefined.evens (xs ++ ys) = Redefined.evens xs ++ Redefined.evens ys
but is expected to have type
  Request` },
            'The acceptance theorem is not fooled, because `Request` refers to your `evens` and not to a name.',
            '**A weaker claim under a similar name.** A theorem called `evens_append_length` that bounds a length is true, and useful, and not what was asked. It fails acceptance in the same way.',
            '**The right statement, resting on an assumption.** This one passes the acceptance theorem.',
            { code: lean`namespace Assumed

axiom evens_step (x : Nat) (xs ys : List Nat) :
    evens (x :: (xs ++ ys)) = evens (x :: xs) ++ evens ys

theorem evens_append (xs ys : List Nat) : evens (xs ++ ys) = evens xs ++ evens ys := by
  cases xs with
  | nil => rfl
  | cons x rest => exact evens_step x rest ys

end Assumed

theorem accepted_too_soon : Request :=
  Assumed.evens_append` },
            { text: lean`'accepted_too_soon' depends on axioms: [Assumed.evens_step]` },
            'The hard step was declared true and given a name that sounds like a lemma. The statement is exactly right, and only the axiom list shows that nothing was proved. This is why acceptance takes two checks and not one.',
          ],
        },
        {
          title: 'Signals worth reading',
          body: [
            'Beyond the two checks, a few things in an assistant’s output deserve your attention even when everything compiles.',
            { list: [
              '**A change outside a proof.** If a definition or a theorem statement changed, the question changed. Look at the difference in version control, and review every line that is not inside a proof.',
              '**New trust.** A new `axiom`, `sorry`, `native_decide`, `implemented_by`, `partial` or `unsafe` is a request to trust something. Each one needs a reason.',
              '**An unused hypothesis.** Lean warns when a hypothesis is never used. That means the theorem could have been stated without it.',
            ] },
            { code: lean`theorem evens_append_short (xs ys : List Nat) (h : xs.length < 100) :
    evens (xs ++ ys) = evens xs ++ evens ys :=
  Honest.evens_append xs ys` },
            { text: 'Variable name `h` is not explicitly referenced.' },
            'It is easiest to keep the request in a file that the assistant is not asked to edit, and have the proofs import it. Then “did the question change?” is answered by whether that file changed.',
            { compare: 'In a Python review you read the diff and ask whether the code is right. Here you read a much smaller diff, the lines outside the proofs, and ask whether the question is still the one you posed. The proofs can be long, strange and machine-written, and you may skip them. It is an unusual feeling at first.' },
          ],
        },
        {
          title: 'Working with an assistant',
          body: [
            'What helps in practice, with any assistant that can edit files and run commands:',
            { steps: [
              'Give it the request and tell it not to change the statement or the definitions.',
              'Let it run `lean` on the file itself. The errors are precise, and an assistant that can read them repairs its own mistakes. It will often guess the name of a library theorem that does not exist, and the compiler tells it so.',
              'When it is stuck, ask for the goal it cannot close, and then for the lemma that would close it. That is the method from lesson 6, and it works for assistants as it does for people.',
              'Ask for small theorems with names. A hundred-line proof that breaks is hard to repair. Ten lemmas are easy.',
              'When it reports success, run the two checks yourself: the acceptance theorem, and `#print axioms`.',
            ] },
            'You do not need to understand every step of a proof you accept. You do need to understand every word of the statement and of the definitions under it. Read a proof anyway when you will have to maintain it, when it is slow, or when you want to learn how it was done.',
            'This changes which skills from this course matter most. Finding a proof by hand is becoming a smaller part of the work. Writing a statement that means what you intend, and auditing what comes back, are becoming most of it. Lessons 8 and 14 were about exactly that.',
          ],
        },
      ],
      takeaways: [
        'Lean checks the proof. You are responsible for the statement, the definitions and what is assumed.',
        'Write the request as a named statement, and accept an answer with a theorem of that type.',
        'The acceptance theorem catches a changed statement or a changed definition. `#print axioms` catches an assumption.',
        'Review every line of a change that is not inside a proof.',
        'You may skip a proof. You may not skip the statement.',
      ],
      quiz: [
        {
          q: 'An assistant gives you a proof that Lean accepts. What is still yours to check?',
          options: [
            { t: 'That the theorem is the one you asked for, stated with the definitions you intended, and what it assumes.', ok: true, why: 'The kernel has confirmed that the proof establishes the statement. Whether it is the right statement is outside its job.' },
            { t: 'Each step of the proof, in case the kernel missed something.', why: 'A proof the kernel accepts is correct. Reading it adds no safety.' },
            { t: 'Nothing. A checked proof needs no review.', why: 'A checked proof of the wrong statement is still the wrong statement.' },
          ],
        },
        {
          q: 'Why does the acceptance theorem reject this answer?',
          code: lean`Type mismatch
  Narrowed.evens_append
has type
  ∀ (xs ys : List Nat), xs = [] → evens (xs ++ ys) = evens xs ++ evens ys
but is expected to have type
  Request`,
          options: [
            { t: 'The answer has an extra hypothesis, `xs = []`, so it proves less than was asked.', ok: true, why: 'It holds only for an empty first list. `Request` is about every list.' },
            { t: 'The answer uses a different name for the theorem.', why: 'Names are irrelevant. The types differ.' },
            { t: 'The proof inside the answer is wrong.', why: 'The proof is fine for what it claims. The claim is too narrow.' },
          ],
        },
        {
          q: 'The second bad answer has a statement that reads exactly like the request. How was it different?',
          options: [
            { t: 'It defined its own `evens` and proved the theorem about that function.', ok: true, why: 'The mismatch message shows `Redefined.evens`. The request refers to your definition, not to the short name.' },
            { t: 'It proved the theorem only for short lists.', why: 'That was the first bad answer. This one has no extra hypothesis.' },
            { t: 'It used an axiom.', why: 'That was a different answer, and it passed the acceptance theorem.' },
          ],
        },
        {
          q: '`theorem accepted_too_soon : Request := Assumed.evens_append` compiles. Why should the answer still be rejected?',
          options: [
            { t: '`#print axioms` shows that it depends on `Assumed.evens_step`, which was declared and never proved.', ok: true, why: 'The statement is right and the hard step was assumed. Only the axiom list reveals it.' },
            { t: 'An acceptance theorem should be proved with tactics.', why: 'How the acceptance theorem is written does not matter. What the answer rests on does.' },
            { t: 'The answer used `cases` where it should have used `induction`.', why: 'Any proof the kernel accepts is fine. The objection is to the axiom.' },
          ],
        },
        {
          q: 'Lean warns that a hypothesis `h` is not referenced. What does that suggest about the theorem?',
          options: [
            { t: 'It is true without `h`, so it has been stated more narrowly than necessary.', ok: true, why: 'A hypothesis that the proof never uses restricts the theorem and buys nothing.' },
            { t: 'The proof is incomplete.', why: 'The proof is complete. It simply did not need the hypothesis.' },
            { t: 'The hypothesis is false.', why: 'Nothing is known about whether it holds. Only that it was not used.' },
          ],
        },
        {
          kind: 'multi',
          q: 'Everything compiles. Which changes in an assistant’s work still need your review?',
          options: [
            { t: 'A changed definition that the statement mentions.', ok: true, why: 'The statement now means something else.' },
            { t: 'A changed theorem statement.', ok: true, why: 'That is the question itself.' },
            { t: 'A new `axiom`.', ok: true, why: 'It is an assumption, whatever it is called.' },
            { t: 'A different tactic inside a proof.', why: 'Lean checks proofs. How one is found is not your concern.' },
          ],
        },
        {
          q: 'Do you need to read an accepted proof line by line?',
          options: [
            { t: 'Not for correctness. You do need to read the statement, the definitions and the axiom list.', ok: true, why: 'Correctness of the proof is the kernel’s job. The rest is yours.' },
            { t: 'Yes, always, because machine-written proofs are unreliable.', why: 'An unreliable author is exactly what the kernel protects you from.' },
            { t: 'No, and the statement need not be read either if the names are sensible.', why: 'A name is only a name. Lesson 14 had a definition called `AllPositive` that held of every list.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-15-acceptance', kind: 'lab', level: 'core', title: 'Accept or reject three answers',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('15'),
          'The file holds three requests and an assistant’s answer to each. All three answers compile. Each request has an acceptance theorem with a hole.',
          { code: lean`theorem accepted1 : Request1 :=
  sorry` },
          'For each one, try the submitted theorem in the hole. If it fits, check what it rests on before you accept it. If it does not fit, or rests on something it should not, write the proof yourself.',
          'The last theorem in the file is a new request. If you have an AI assistant, give it the file and ask for the proof, then audit what it returns as you audited the three answers. If you do not, prove it yourself.',
          checkLab('15'),
          'You are finished when the command prints the four audit lines at the end of the file and nothing else, and none lists anything beyond the three standard axioms.',
          solution('15'),
        ],
        hints: [
          'Try `Answer2.total_append` in the second hole. It fits. Then add `#print axioms Answer2.total_append` and read the result.',
          'One answer is sound, one rests on an axiom, and one has a hypothesis that was not in the request. The two you reject are proofs you have written before, in lessons 6 and 8.',
          'For the last theorem, induct on `xs`. In the second case `simp [slowRev, total]` leaves a goal about `total (slowRev rest ++ [x])`, and `accepted2 (slowRev rest) [x]` says what that is.',
        ],
        checks: [
          '`lean Lab15.lean` prints four audit lines and nothing else.',
          'No audit line lists anything beyond `propext`, `Classical.choice` and `Quot.sound`.',
          'I can say why I accepted or rejected each of the three answers.',
          'For the last request, I checked that the statement and definitions were unchanged before I accepted a proof.',
        ],
        notes: [
          { label: 'Three verdicts', placeholder: 'For each answer: accepted or rejected, and the one observation that decided it.' },
          { label: 'The last request', placeholder: 'Who proved it, you or an assistant? If an assistant, what did it get wrong on the way, and what did you check at the end?' },
        ],
      }],
    },
    {
      id: 'proof-to-running-code',
      category: part,
      title: 'From proof to running code',
      summary: 'Build a verified function into a program you can run, see exactly which parts of it the theorems cover, and test the whole thing against Python. Then a map of where to go next.',
      minutes: 35,
      topics: ['main and IO', 'lake build', 'The verified core', 'Differential testing', 'What comes next'],
      sections: [
        {
          title: 'A program with a proved core',
          body: [
            'Everything so far lived in the editor. A Lean file can also be a program. This one sorts the numbers given on its command line, using the insertion sort that lesson 8 proved correct.',
            'It has two parts. The core is pure functions with theorems about them: `insertionSort`, `insertionSort_sorted` and `count_insertionSort`, exactly as before. Around it is a thin shell that turns text into numbers and numbers into text.',
            { code: lean`def parseNumbers (args : List String) : Option (List Nat) :=
  args.mapM String.toNat?

def render (xs : List Nat) : String :=
  " ".intercalate (xs.map toString)

def main (args : List String) : IO UInt32 := do
  match parseNumbers args with
  | none =>
    IO.eprintln "usage: sorter NUMBER..."
    return 1
  | some xs =>
    IO.println (render (insertionSort xs))
    return 0`, name: 'Lab16.lean' },
            '`String.toNat?` is `some n` for a string of digits. `mapM` applies it to every argument and gives `none` if any one fails. `main` receives the arguments and returns the exit code.',
            'This is the shape to aim for in any verified program: as much logic as possible in pure functions that can be specified, and an `IO` layer too simple to hide much.',
          ],
        },
        {
          title: 'Run it, then build it',
          body: [
            'Lean can run a file directly. This is the quickest way to try a program.',
            { shell: 'lean --run Lab16.lean 30 4 17', name: 'Terminal · run without building' },
            { text: '4 17 30', unchecked: true },
            'To get a real executable, tell `lake` about it. Add these lines to the end of `lakefile.toml` in your project.',
            { code: `[[lean_exe]]
name = "sorter"
root = "Lab16"`, lang: 'toml', name: 'lakefile.toml' },
            { shell: lean`lake build sorter
.lake/build/bin/sorter 9 8 7
.lake/build/bin/sorter 9 x`, name: 'Terminal · build and run' },
            'Lean compiles your definitions to C and then to machine code. The result is one file of about two megabytes that needs no Lean installation to run. The second run prints the usage line and exits with status 1.',
            { aside: 'The proofs are not in the executable. They were checked when the file was compiled and then discarded, along with every proof argument and proof field. `Nat` is compiled to a machine word when the number is small and to a big number when it is not, so unlike the fixed-width types of lesson 13 it never wraps.' },
          ],
        },
        {
          title: 'What the theorems say about this program',
          body: [
            'Be precise about what you can now claim.',
            { table: { head: ['Part', 'Status'], rows: [
              ['`insertionSort`', 'Proved, for every list: the output is in order and has the same elements.'],
              ['`parseNumbers` and `render`', 'Not proved. Tested with a few examples.'],
              ['`main`', 'Not proved. It is five lines, and it is where a mistake would have to be.'],
              ['The compiler, the runtime, the machine', 'Trusted.'],
            ] } },
            'So the claim is not “this program is correct”. It is “if the numbers are parsed and printed correctly, and the compiler is right, the output is the input sorted”. That is narrower than it sounded at the start of the course, and far more than testing gives. Every possible list is covered in the part where sorting bugs live.',
            'The unproved parts can shrink. `render` and `parseNumbers` are pure functions, and facts about them can be proved like any others, for instance that parsing what `render` prints gives back the list. Each such theorem moves a line of the table from “tested” to “proved”.',
          ],
        },
        {
          title: 'Checking a proved program against an unproved one',
          body: [
            'There is one more thing you can do with a verified function, and it connects this course to the Python you write every day. Use it as an **oracle**: run it and another implementation on the same random inputs, and compare.',
            { code: `import random
import subprocess
import sys

program = sys.argv[1] if len(sys.argv) > 1 else ".lake/build/bin/sorter"
trials = 300
random.seed(2026)

for trial in range(trials):
    numbers = [random.randrange(1000) for _ in range(random.randrange(15))]
    result = subprocess.run([program, *map(str, numbers)], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"the program failed on {numbers}: {result.stderr.strip()}")
        sys.exit(1)
    printed = [int(word) for word in result.stdout.split()]
    if printed != sorted(numbers):
        print(f"MISMATCH on {numbers}")
        print(f"  Lean:   {printed}")
        print(f"  Python: {sorted(numbers)}")
        sys.exit(1)

print(f"{trials} random lists: the Lean program and Python's sorted() agree on every one")`, lang: 'python', name: 'difftest.py' },
            'This is called differential testing. Here it tests the things the theorems do not reach: the parsing, the printing and the compiler. Pointed the other way, it tests Python against a specification.',
            'That second direction is how verification reaches code that Lean cannot read. Lean cannot prove anything about a Python function directly: Python has no precise definition to reason from, and any value may be changed by code elsewhere. But you can write the same logic in Lean, prove what matters about it, and then compare the two on millions of random inputs. Amazon builds its Cedar authorization language this way: a model in Lean with proofs, a production implementation in Rust, and random testing that the two agree before every release.',
            { link: 'https://lean-lang.org/use-cases/cedar/', label: 'Lean · how Cedar is verified' },
            { pitfall: 'The link between the model and the real code is a test, with everything that implies. It finds differences on the inputs it tries. A proof about the Lean model is a proof about the Lean model. Say so plainly when you describe what you have.' },
          ],
        },
        {
          title: 'Where this goes next',
          body: [
            'You can now write a program in Lean, say what correct means for it, prove it by induction or with an invariant, reason about machine integers, audit a proof you did not write, and run the result. The next steps depend on what you want to verify.',
            '**Real Rust code.** A tool called Aeneas translates Rust into Lean, so that a theorem is about the code that `cargo` builds and not about a model of it. It works because Rust’s ownership rules rule out the shared mutable state that makes other languages hard to reason about. What it produces will look familiar: `do` blocks whose steps can fail, as in lesson 11, over fixed-width integers, as in lesson 13, with loops that need the invariants of lessons 6 and 12. That is the subject of the course planned to follow this one.',
            { link: 'https://github.com/AeneasVerif/aeneas', label: 'Aeneas · verifying Rust programs in Lean' },
            '**More Lean.** Two free books go deeper than this course in each direction. The reference manual covers the loop verifier in full.',
            { link: 'https://lean-lang.org/functional_programming_in_lean/', label: 'Functional Programming in Lean · the language, for programmers' },
            { link: 'https://lean-lang.org/theorem_proving_in_lean4/', label: 'Theorem Proving in Lean 4 · the logic and the tactics' },
            { link: 'https://lean-lang.org/doc/tutorials/4.35.0/vcgen/', label: 'Lean tutorial · verifying imperative programs with vcgen' },
            '**Other tools.** Lean is one family of several. Dafny and Verus have you annotate code with contracts and let a solver find the proofs, with less control and less effort. TLA+ checks designs of concurrent and distributed systems before any code exists. The ideas you have learned, specification, invariant, counterexample and trusted base, are the same in all of them.',
            'This course left out a great deal: type classes, the standard library’s data structures, mathematics in Mathlib, writing your own tactics, and concurrency. None of it changes the habit that matters most, which you already have. Before you believe that something is proved, ask what exactly was stated, about which definitions, resting on what.',
          ],
        },
      ],
      takeaways: [
        'A verified program is a proved core of pure functions inside a thin, simple `IO` shell.',
        '`lean --run` runs a file. An executable target in `lakefile.toml` and `lake build` produce a native program.',
        'State exactly which parts the theorems cover and which parts are tested or trusted.',
        'A verified function is an oracle: compare any other implementation with it on random inputs.',
        'Ask what was stated, about which definitions, resting on what.',
      ],
      quiz: [
        {
          q: 'Which part of the `sorter` program do the theorems cover?',
          options: [
            { t: '`insertionSort`. Parsing, printing and `main` are tested, not proved.', ok: true, why: 'The theorems are about a function from lists to lists. Text handling is outside them.' },
            { t: 'The whole program, because it is written in Lean.', why: 'A language does not prove anything. Only the functions that have theorems are covered.' },
            { t: 'Nothing, because the proofs are removed from the executable.', why: 'They were checked before being removed. The compiled function is the one that was proved.' },
          ],
        },
        {
          q: 'What is the difference between `lean --run Lab16.lean 3 1 2` and building with `lake build sorter`?',
          options: [
            { t: 'The first runs the file directly. The second produces a native executable that needs no Lean to run.', ok: true, why: 'Both run the same definitions. Only the second leaves a program you can ship.' },
            { t: 'The first skips the proofs, and the second checks them.', why: 'Both check the whole file before anything runs.' },
            { t: 'The first is for tests and cannot take arguments.', why: 'It takes arguments after the file name, as the example shows.' },
          ],
        },
        {
          q: 'Suppose `parseNumbers` had a bug that dropped the last argument. Would `insertionSort_sorted` and `count_insertionSort` catch it?',
          options: [
            { t: 'No. They describe sorting a list, and the list would already be wrong. The differential test would catch it.', ok: true, why: 'The fault is in the unproved shell. Comparing whole-program output with Python exposes it.' },
            { t: 'Yes, because the output would have fewer elements than the input.', why: 'The theorems compare the output of the sort with its own input list, which has already lost the element.' },
            { t: 'Yes, because the file would no longer compile.', why: 'A wrong parser is a perfectly valid program.' },
          ],
        },
        {
          q: 'What does the differential test add to what the theorems already give?',
          options: [
            { t: 'Evidence about the whole compiled program, including the parts with no proof, on the inputs tried.', ok: true, why: 'The proofs cover every input for the core. The test covers sampled inputs for everything.' },
            { t: 'A proof that the program is correct for every input.', why: 'A test is evidence about the inputs it ran. It proves nothing about the rest.' },
            { t: 'Nothing. It repeats what was proved.', why: 'The proofs say nothing about parsing, printing or the compiler.' },
          ],
        },
        {
          q: 'How can Lean help with code that stays in Python?',
          options: [
            { t: 'Write the logic as a model in Lean, prove properties of the model, and compare the Python against it on random inputs.', ok: true, why: 'The proofs are about the model, and testing links the model to the real code.' },
            { t: 'Lean can check Python source files directly.', why: 'It cannot. Python has no precise definition for Lean to reason from.' },
            { t: 'It cannot help at all.', why: 'A proved model is a much stronger oracle than a hand-written list of test cases.' },
          ],
        },
        {
          q: 'Before you believe that something has been proved, what should you ask?',
          options: [
            { t: 'What exactly was stated, about which definitions, resting on what.', ok: true, why: 'Those three questions cover every fault from lesson 14.' },
            { t: 'How long the proof is.', why: 'Length says nothing. A one-line proof by `grind` and a hundred-line one are equally checked.' },
            { t: 'Who wrote the proof.', why: 'The kernel does not care, and neither should you. The statement is what needs an owner.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-16-running-code', kind: 'lab', level: 'core', title: 'Build it, run it, and compare it with Python',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('16'),
          'Fill the holes first. Two are the functions that turn text into numbers and back, with tests under them. Two are theorems that add a guarantee the file did not have: the program prints as many numbers as it was given.',
          checkLab('16'),
          'Now make it a program. Add the three lines from the lesson to `lakefile.toml`, then build and run.',
          { shell: lean`lake build sorter
.lake/build/bin/sorter 30 4 17
.lake/build/bin/sorter 30 four 17; echo "exit status $?"`, name: 'Terminal · build and run' },
          'Last, compare it with Python. Fetch the test script into the project folder and run it. It needs Python 3 and nothing else.',
          { link: 'lab/difftest.py', label: 'Download difftest.py', download: 'difftest.py' },
          { shell: 'python3 difftest.py', name: 'Terminal · 300 random lists against sorted()' },
          'To see what the test is for, break the unproved part on purpose. Change `render` so that it prints the numbers in the order `xs.reverse`, rebuild, and run the script again. Then put it back.',
          solution('16'),
        ],
        hints: [
          '`parseNumbers` is `args.mapM String.toNat?`, and `render` is `" ".intercalate (xs.map toString)`.',
          'Both theorems are inductions on `xs`. For `length_insertSorted`, the second case is `grind [insertSorted]`. For `length_insertionSort`, it is `simp [insertionSort, length_insertSorted, ih]`.',
          'If `lake build sorter` says there is no such target, check that the three lines are at the end of `lakefile.toml`, that `root` is `"Lab16"` with a capital L, and that `Lab16.lean` is in the same folder as the lakefile.',
        ],
        checks: [
          '`lean Lab16.lean` prints nothing: no errors and no `sorry` warnings.',
          'I built `sorter` and ran it on numbers of my own, and on an argument that is not a number.',
          '`python3 difftest.py` reported that the two programs agree on every list.',
          'I broke `render`, saw the test fail, and repaired it.',
        ],
        notes: [
          { label: 'The comparison', placeholder: 'Paste the line that difftest.py printed, and the first MISMATCH it printed when you broke render.' },
          { label: 'What is proved, tested and trusted', placeholder: 'In your own words, for your sorter: one line each for what is proved, what is only tested, and what is trusted.' },
        ],
      }],
    },
  );
})();
