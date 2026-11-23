// Part 3: Specifications. Writing the statement, putting facts into types, and a full case study.
(() => {
  const lean = String.raw; // lean`…` keeps backslashes as written
  const part = 'Part 3 · Specifications';
  const { fetchLab, checkLab, solution } = window.LEAN_COURSE;

  (window.C_LESSONS ||= []).push(
    {
      id: 'specifications',
      category: part,
      title: 'Saying what correct means',
      summary: 'A proof establishes exactly what its statement says, and no more. Writing a statement that a wrong program cannot satisfy is the hard part of verification.',
      minutes: 45,
      topics: ['Weak specifications', 'Sorted', 'count', 'Refuting a claim', 'Round trips', 'Testing a specification'],
      sections: [
        {
          title: 'A proof is only as good as its statement',
          body: [
            'Until now the statements were handed to you and your job was the proof. In practice it is the other way round. Lean will check any proof, and tools will increasingly write them. What nobody can check for you is whether the theorem says what you meant.',
            'This lesson takes one program and tries three times to say what “correct” means for it. The program is insertion sort.',
            { code: lean`def insertSorted (x : Nat) : List Nat → List Nat
  | [] => [x]
  | y :: rest => if x ≤ y then x :: y :: rest else y :: insertSorted x rest

def insertionSort : List Nat → List Nat
  | [] => []
  | x :: rest => insertSorted x (insertionSort rest)`, name: 'Scratch.lean' },
            '`insertSorted` puts one element into its place in a list that is already in order. `insertionSort` sorts the rest of the list, then inserts the first element. `#eval insertionSort [3, 1, 2, 3, 0]` gives `[0, 1, 2, 3, 3]`.',
            { compare: 'Python’s documentation says that `sorted` returns “a new sorted list from the items in iterable”. That sentence has two halves, and the second one, “from the items”, is easy to read past. Each half becomes part of the theorem, and you are about to see what happens when one is left out.' },
          ],
        },
        {
          title: 'First attempt: the output is in order',
          body: [
            'A list is in order when its first element is at most everything after it, and the rest is in order too. That sentence is a recursive definition.',
            { code: lean`def Sorted : List Nat → Prop
  | [] => True
  | x :: rest => (∀ y ∈ rest, x ≤ y) ∧ Sorted rest`, name: 'Scratch.lean' },
            'It returns a `Prop`: for each list, a claim. `simp [Sorted]` settles the claim for a particular list.',
            { code: lean`example : Sorted [1, 2, 2, 5] := by
  simp [Sorted]

example : ¬Sorted [2, 1] := by
  simp [Sorted]`, name: 'Scratch.lean' },
            'So the specification could be: for every `xs`, `Sorted (insertionSort xs)`. Before proving that, ask what else satisfies it.',
            { code: lean`def lazySort (_ : List Nat) : List Nat :=
  []

theorem lazySort_sorted (xs : List Nat) : Sorted (lazySort xs) := by
  simp [lazySort, Sorted]`, name: 'Scratch.lean' },
            'That is a real theorem, checked by Lean, about a function that throws its input away. The proof is correct. The specification is too weak to be worth proving.',
          ],
        },
        {
          title: 'Second attempt: in order, and the same length',
          body: [
            'The empty list gave it away by being too short, so require the length to be kept. Now this program passes.',
            { code: lean`def zeros (xs : List Nat) : List Nat :=
  xs.map (fun _ => 0)

theorem zeros_sorted (xs : List Nat) : Sorted (zeros xs) := by
  induction xs with
  | nil => simp [zeros, Sorted]
  | cons x rest ih =>
    simp [zeros, Sorted] at *
    exact ih

theorem zeros_length (xs : List Nat) : (zeros xs).length = xs.length := by
  simp [zeros]`, name: 'Scratch.lean' },
            '`zeros [3, 1, 2]` is `[0, 0, 0]`: in order, and three long. The `at *` after `simp` means “in the goal and in every hypothesis”.',
            'Each patch rules out the last wrong program and lets in another. Guessing at properties will not get you there. Go back to the sentence: the output is made **from the items** of the input.',
          ],
        },
        {
          title: 'Third attempt: nothing lost, nothing invented',
          body: [
            'The output must contain the same elements as the input, the same number of times. `xs.count v` is the number of times `v` occurs in `xs`, so the requirement is that every value has the same count before and after.',
            { code: lean`theorem insertionSort_correct (xs : List Nat) :
    Sorted (insertionSort xs) ∧ ∀ v, (insertionSort xs).count v = xs.count v := by
  constructor
  · exact insertionSort_sorted xs
  · intro v
    exact count_insertionSort v xs` },
            'This is the specification. Only one list is in order and has those counts, so a function that satisfies it is a sorting function, and there is no room left for a wrong one.',
            'It rejects `zeros`, and Lean can prove that it does. A claim about every list is refuted by a single list. Assume the claim, apply it to a list of your choice, and simplify the result into something false.',
            { code: lean`theorem zeros_wrong : ¬∀ (xs : List Nat) (v : Nat), (zeros xs).count v = xs.count v := by
  intro h
  have h1 := h [1] 1
  simp [zeros] at h1`, name: 'Scratch.lean' },
            { text: lean`h1 : List.count 1 (zeros [1]) = List.count 1 [1]
⊢ False` },
            'The left side of `h1` is 0 and the right side is 1. `simp` reduces `h1` to `False`, and a false hypothesis closes any goal.',
            { compare: 'In Python the same property is `Counter(out) == Counter(xs)`. A weaker version, `set(out) == set(xs)`, lets through a sort that drops duplicates. When you write a property-based test you face exactly this choice, and the same wrong programs slip past the weak version. A theorem does not make the choice easier. It makes the consequences permanent.' },
          ],
        },
        {
          title: 'Proving the first half',
          body: [
            'Insertion sort is built on `insertSorted`, so the proof is built on a theorem about it: inserting into a list that is in order gives a list that is in order. That proof needs to know which elements the result contains, so there is a helper theorem first.',
            { code: lean`theorem mem_insertSorted (x y : Nat) (xs : List Nat) : y ∈ insertSorted x xs ↔ y = x ∨ y ∈ xs := by
  induction xs with
  | nil => simp [insertSorted]
  | cons z rest ih => grind [insertSorted]

theorem insertSorted_sorted (x : Nat) (xs : List Nat) (h : Sorted xs) : Sorted (insertSorted x xs) := by
  induction xs with
  | nil => simp [insertSorted, Sorted]
  | cons y rest ih =>
    simp [Sorted] at h
    obtain ⟨hy, hrest⟩ := h
    simp [insertSorted]
    split
    · simp [Sorted]
      grind
    · simp [Sorted, mem_insertSorted]
      grind`, name: 'Scratch.lean' },
            'Follow the second branch of the `split`, where `x` is larger than `y` and so goes somewhere in `rest`. Before the last `grind`, the goal panel shows this.',
            { text: lean`case cons.isFalse
x y : Nat
rest : List Nat
ih : Sorted rest → Sorted (insertSorted x rest)
hy : ∀ (y_1 : Nat), y_1 ∈ rest → y ≤ y_1
hrest : Sorted rest
h✝ : ¬x ≤ y
⊢ (y ≤ x ∧ ∀ (a : Nat), a ∈ rest → y ≤ a) ∧ Sorted (insertSorted x rest)` },
            'Read it as an argument. `y` stays at the front, so it must be at most everything behind it. That is `x`, which is larger because the test failed, and the elements of `rest`, which `hy` covers. And the rest must still be in order, which is `ih` applied to `hrest`. Every piece is above the line, and `grind` assembles them.',
            'The whole second case can be written `grind [insertSorted, Sorted, mem_insertSorted]`. The longer version is here so that you can see what the proof is.',
            { code: lean`theorem insertionSort_sorted (xs : List Nat) : Sorted (insertionSort xs) := by
  induction xs with
  | nil => simp [insertionSort, Sorted]
  | cons x rest ih =>
    simp [insertionSort]
    exact insertSorted_sorted x (insertionSort rest) ih`, name: 'Scratch.lean' },
          ],
        },
        {
          title: 'Proving the second half',
          body: [
            'The same plan again: a theorem about one insertion, then an induction that uses it. Inserting `x` changes the counts exactly as putting `x` on the front would.',
            { code: lean`theorem count_insertSorted (v x : Nat) (xs : List Nat) : (insertSorted x xs).count v = (x :: xs).count v := by
  induction xs with
  | nil => simp [insertSorted]
  | cons y rest ih => grind [insertSorted]

theorem count_insertionSort (v : Nat) (xs : List Nat) : (insertionSort xs).count v = xs.count v := by
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [insertionSort, count_insertSorted, List.count_cons, ih]`, name: 'Scratch.lean' },
            'With both halves proved, `insertionSort_correct` above is three lines. Notice how the work was divided. You chose the specification, the helper theorems and the inductions. Automation did every case.',
          ],
        },
        {
          title: 'Three shapes of specification',
          body: [
            'The sorting specification describes the output by its **properties**. Two other shapes are common.',
            { table: { head: ['Shape', 'Says', 'Example'], rows: [
              ['Properties', 'The result has these features.', '`Sorted (sort xs)`, and the counts agree.'],
              ['Agreement', 'A fast program gives the same answer as an obvious one.', '`totalFast xs = total xs` from lesson 6.'],
              ['Round trip', 'Undoing the operation gives back the input.', '`decode (encode xs) = xs`.'],
            ] } },
            'Here is a round trip. Run-length encoding stores each run of equal values once, with its length: `encode [1, 1, 1, 2, 2, 3]` is `[(1, 3), (2, 2), (3, 1)]`.',
            { code: lean`def encode : List Nat → List (Nat × Nat)
  | [] => []
  | x :: rest =>
    match encode rest with
    | [] => [(x, 1)]
    | (y, n) :: tail => if x = y then (y, n + 1) :: tail else (x, 1) :: (y, n) :: tail

def decode : List (Nat × Nat) → List Nat
  | [] => []
  | (x, n) :: rest => List.replicate n x ++ decode rest

theorem decode_encode (xs : List Nat) : decode (encode xs) = xs := by
  induction xs with
  | nil => rfl
  | cons x rest ih => grind [encode, decode]`, name: 'Scratch.lean' },
            'A specification can be wrong in the same way a program can, so test it the same way. Write the definition, then check it against examples where you know the answer, including ones where it should be false.',
            { code: lean`def IsMax (m : Nat) (xs : List Nat) : Prop :=
  m ∈ xs ∧ ∀ x ∈ xs, x ≤ m

example : IsMax 3 [1, 3, 2] := by
  unfold IsMax
  decide

example : ¬IsMax 5 [1, 3, 2] := by
  unfold IsMax
  decide`, name: 'Scratch.lean' },
            'The second example is the important one. Leave out `m ∈ xs`, and 5 counts as the maximum of `[1, 3, 2]`, because it is at least as large as every element. The negative test catches that.',
          ],
        },
      ],
      takeaways: [
        'A theorem proves what it states. Ask which wrong programs would also satisfy it.',
        'Sorting is two claims: the output is in order, and every value occurs as often as it did in the input.',
        'A claim about every input is refuted by one input.',
        'Specifications come as properties, agreement with a simpler program, or a round trip.',
        'Test a specification with examples, including ones where it must be false.',
      ],
      quiz: [
        {
          q: 'Lean accepts `theorem lazySort_sorted (xs : List Nat) : Sorted (lazySort xs)`, where `lazySort` returns `[]`. What does that show?',
          options: [
            { t: '“The output is in order” is too weak a specification for sorting.', ok: true, why: 'A function that discards its input satisfies it, so proving it of a real sort would establish very little.' },
            { t: '`lazySort` is a correct sorting function.', why: 'It returns the empty list for every input. The theorem is true, and it is not the claim you care about.' },
            { t: 'The proof must contain a mistake.', why: 'The proof is right: the empty list is in order. The weakness is in the statement.' },
          ],
        },
        {
          q: 'Which wrong program satisfies “the output is in order and has the same length as the input”?',
          options: [
            { t: 'One that replaces every element with 0.', ok: true, why: 'A list of zeros is in order, and mapping keeps the length. This is `zeros` from the lesson.' },
            { t: 'One that always returns the empty list.', why: 'That fails the length requirement for any non-empty input.' },
            { t: 'One that reverses the input.', why: 'A reversed list is usually not in order.' },
          ],
        },
        {
          q: 'This theorem is provable. Why does it hold?',
          code: lean`def dropAll (_ : List Nat) : List Nat :=
  []

theorem dropAll_subset (xs : List Nat) : ∀ v ∈ dropAll xs, v ∈ xs := by
  simp [dropAll]`,
          options: [
            { t: 'The empty list has no elements, so the claim about each of them has nothing to check.', ok: true, why: 'A “for every” over nothing is true. “Every output element came from the input” does not say that anything was kept.' },
            { t: '`dropAll` keeps every element of `xs`.', why: 'It keeps none. The claim only speaks about elements of the output, and there are none.' },
            { t: '`simp` does not check claims about membership.', why: '`simp` proved it properly. The claim really is true.' },
          ],
        },
        {
          q: 'How do you prove that `∀ xs v, (zeros xs).count v = xs.count v` is false?',
          options: [
            { t: 'Assume it, apply it to one list and value where it fails, and simplify to `False`.', ok: true, why: 'One counterexample refutes a claim about every input. The lesson used `[1]` and `1`.' },
            { t: 'By induction on `xs`.', why: 'Induction proves a claim for every list. Here the claim is false, and one list is enough to show it.' },
            { t: 'It cannot be done. Lean only proves that things are true.', why: '`¬p` is a claim like any other, and `zeros_wrong` is a proved theorem.' },
          ],
        },
        {
          q: 'Why does the specification compare counts, and not just say that the output and the input have the same elements?',
          options: [
            { t: 'A sort that drops duplicates would have the same elements.', ok: true, why: '`[1, 3]` contains exactly the values that `[3, 3, 1]` does. Only the counts show that an element was lost.' },
            { t: 'Membership cannot be stated for lists.', why: '`v ∈ xs` is ordinary Lean, and the lesson used it in `mem_insertSorted`.' },
            { t: 'Counting is faster to compute.', why: 'Nothing is computed. This is a statement in a proof, and its cost is irrelevant.' },
          ],
        },
        {
          q: '`decode (encode xs) = xs` is proved. What does it leave unsaid?',
          options: [
            { t: 'That the encoding is short. An encoder that never merged a run would pass too.', ok: true, why: 'A round trip says no information is lost. It says nothing about how good the encoding is.' },
            { t: 'That `decode` finishes on every input.', why: 'Every Lean function finishes. That was checked when it was defined.' },
            { t: 'What happens for the empty list.', why: 'The theorem is for every `xs`, and the first case of the induction is the empty list.' },
          ],
        },
        {
          q: 'Suppose `IsMax` were defined without `m ∈ xs`, as only `∀ x ∈ xs, x ≤ m`. Which test from the lesson would fail?',
          options: [
            { t: '`¬IsMax 5 [1, 3, 2]`', ok: true, why: '5 is at least every element, so the weaker definition calls it a maximum, and the negation becomes false.' },
            { t: '`IsMax 3 [1, 3, 2]`', why: '3 is still at least every element, so this test passes either way.' },
            { t: 'Neither. Both tests would still pass.', why: 'The negative test exists to catch exactly this omission.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-08-specifications', kind: 'lab', level: 'core', title: 'Write a specification and finish a proof',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('08'),
          'The lab has four parts. In part 1 you prove that a wrong program meets a weak specification, then prove that it fails the right one.',
          'In part 2 you write a specification yourself. The hole is a definition, and three tests below it tell you whether your statement says what you meant.',
          { code: lean`def IsMax (m : Nat) (xs : List Nat) : Prop :=
  sorry` },
          'In part 3 you finish the sorting proof from the lesson: the half about counts. Part 4 is the round trip.',
          checkLab('08'),
          solution('08'),
        ],
        hints: [
          'Exercise 2 follows `zeros_wrong` in the lesson line for line: `intro h`, then `have h1 := h [1] 1`, then `simp [zeros] at h1`.',
          'Exercise 3: the maximum of a list is an element of the list, and no element is larger. Two claims joined by `∧`.',
          'Exercises 5 to 7 are in the lesson under “Proving the second half”. Type them in and watch the goals. For the stretch, `grind [encode, decode]` closes the second case of the induction.',
        ],
        checks: [
          '`lean Lab08.lean` prints nothing: no errors and no `sorry` warnings.',
          'My definition of `IsMax` passes all three tests, including the two where it must be false.',
          'I can say which wrong program each half of the sorting specification rules out.',
        ],
        notes: [
          { label: 'My definition of IsMax', placeholder: 'Paste your definition. If a test failed at first, say which one and what you had left out.' },
          { label: 'What each half rules out', placeholder: 'One sentence for “in order”, and one for “same counts”.' },
        ],
      }],
    },
    {
      id: 'types-that-carry-proofs',
      category: part,
      title: 'Types that carry proofs',
      summary: 'A fact you would check at run time in Python can be part of a type in Lean. Then it is checked once, where the value is made, and every later use may rely on it.',
      minutes: 40,
      topics: ['Array indexing', 'Fin', 'Subtypes', 'Invariants in a structure', 'Vector'],
      sections: [
        {
          title: 'Indexing needs a proof',
          body: [
            'An array is written `#[10, 20, 30]`, and `a.size` is its length. Lesson 2 indexed a list with `xs[i]?`, which returns an `Option`. Plain `a[i]` returns the element itself, and for that Lean has to know the index is in range.',
            { code: lean`def pick (a : Array Nat) (i : Nat) : Nat :=
  a[i]` },
            { text: lean`a : Array Nat
i : Nat
⊢ i < a.size` },
            'The error message ends with the goal Lean could not prove. Nothing above the line says that `i` is small enough, so the definition is rejected.',
            { table: { head: ['Notation', 'Result', 'If the index is out of range'], rows: [
              ['`a[i]?`', '`Option Nat`', 'Returns `none`. Checked at run time.'],
              ['`a[i]!`', '`Nat`', 'The program stops with a panic. Checked at run time.'],
              ['`a[i]`', '`Nat`', 'Cannot happen. A proof is required when the file is checked.'],
            ] } },
            'With the third form there is no check when the program runs, because none is needed.',
          ],
        },
        {
          title: 'Three ways to supply the proof',
          body: [
            'The first way is to make the fact an argument. The caller has to supply a proof, and inside the function Lean finds it.',
            { code: lean`def firstTwo (a : Array Nat) (h : a.size ≥ 2) : Nat :=
  a[0] + a[1]

#eval firstTwo #[10, 20, 30] (by decide)`, name: 'Scratch.lean' },
            'The second way is to test. Writing `if h : …` gives the outcome of the test a name, so the branch where it succeeded has a proof to use.',
            { code: lean`def getOr (a : Array Nat) (i fallback : Nat) : Nat :=
  if h : i < a.size then a[i] else fallback`, name: 'Scratch.lean' },
            'The third way is to change the type of the index. `Fin n` is the type of natural numbers below `n`. A value of it is a number together with a proof that it is small enough, so an index of type `Fin a.size` is always valid.',
            { code: lean`def pickFin (a : Array Nat) (i : Fin a.size) : Nat :=
  a[i]

def nextSlot (i : Fin 4) : Fin 4 :=
  ⟨(i.val + 1) % 4, by omega⟩`, name: 'Scratch.lean' },
            'The angle brackets build a `Fin 4` from its two parts: the number, and the proof that it is below 4. `nextSlot 3` is `0`.',
            { compare: 'In Python you choose between `a[i]`, which may raise `IndexError`, and a guard such as `if i < len(a)`. The guard and the access are separate lines, and nothing connects them: delete the guard and the code still runs until the day it fails. In Lean the access does not compile without the guard, or without a promise from the caller.' },
          ],
        },
        {
          title: 'A value packaged with a fact',
          body: [
            '`Fin` is one instance of a general idea. `{ n : Nat // n > 0 }` is the type of natural numbers `n` for which `n > 0` holds. It is called a **subtype**.',
            { code: lean`def Pos : Type :=
  { n : Nat // n > 0 }

def five : Pos :=
  ⟨5, by decide⟩

def safeDiv (a : Nat) (b : Pos) : Nat :=
  a / b.val`, name: 'Scratch.lean' },
            '`b.val` is the number. The proof is there too, as `b.property`. A value that breaks the condition cannot be built.',
            { code: lean`def zero : Pos :=
  ⟨0, by decide⟩` },
            { text: lean`Tactic ` + '`decide`' + lean` proved that the proposition
  0 > 0
is false` },
            'So `safeDiv` never divides by zero, and no caller has to remember to check. The proof is erased when the program is compiled: at run time a `Pos` is a plain number.',
          ],
        },
        {
          title: 'A structure with an invariant',
          body: [
            'A structure can have a field that is a proof. The field states something that must be true of every value of the type: an **invariant**.',
            { code: lean`structure Range where
  lo : Nat
  hi : Nat
  ok : lo ≤ hi

def tenToTwenty : Range :=
  { lo := 10, hi := 20, ok := by decide }`, name: 'Scratch.lean' },
            'A range with its ends the wrong way round does not compile.',
            { code: lean`def backwards : Range :=
  { lo := 20, hi := 10, ok := by decide }` },
            { text: lean`Tactic ` + '`decide`' + lean` proved that the proposition
  20 ≤ 10
is false` },
            'A function that receives a `Range` may rely on the invariant. Bring it above the line with `have`.',
            { code: lean`def Range.width (r : Range) : Nat :=
  r.hi - r.lo

theorem Range.lo_add_width (r : Range) : r.lo + r.width = r.hi := by
  have h := r.ok
  unfold Range.width
  omega`, name: 'Scratch.lean' },
            { text: lean`r : Range
h : r.lo ≤ r.hi
⊢ r.lo + (r.hi - r.lo) = r.hi` },
            'Without `h` this goal is false, because subtraction stops at zero. The invariant is what makes the function make sense.',
            'A function that returns a `Range` has to prove the invariant for the value it builds.',
            { code: lean`def Range.shift (r : Range) (d : Nat) : Range :=
  { lo := r.lo + d, hi := r.hi + d, ok := by have h := r.ok; omega }`, name: 'Scratch.lean' },
            { compare: 'The Python version checks in `__post_init__` and raises `ValueError`. That check runs every time a range is made, it runs late, and a later assignment to `r.lo` can break what it established. In Lean the check is made once per place in the source that builds a `Range`, before the program exists, and values cannot be changed afterwards. The invariant holds for the lifetime of the value.' },
          ],
        },
        {
          title: 'Equal data means equal values',
          body: [
            'When a structure has a proof field, two values are equal as soon as their data fields are equal. Which proof they carry never matters.',
            { code: lean`structure Percent where
  value : Nat
  ok : value ≤ 100

def Percent.complement (p : Percent) : Percent :=
  { value := 100 - p.value, ok := by omega }

theorem Percent.complement_complement (p : Percent) : p.complement.complement = p := by
  cases p with
  | mk v h =>
    simp [Percent.complement]
    omega`, name: 'Scratch.lean' },
            '`cases p with | mk v h` takes the structure apart into its number `v` and its proof `h`. After `simp`, the goal is about the number alone.',
            { text: lean`case mk
v : Nat
h : v ≤ 100
⊢ 100 - (100 - v) = v` },
            'The goal is true only because of `h`. The invariant earns its place again.',
          ],
        },
        {
          title: 'An interface that keeps a promise',
          body: [
            'Put the last two lessons together. Here is a list packaged with a proof that it is in order, using `Sorted` and `insertSorted_sorted` from lesson 8.',
            { code: lean`structure SortedList where
  items : List Nat
  sorted : Sorted items

def SortedList.empty : SortedList :=
  { items := [], sorted := by simp [Sorted] }

def SortedList.insert (s : SortedList) (x : Nat) : SortedList :=
  { items := insertSorted x s.items, sorted := insertSorted_sorted x s.items s.sorted }`, name: 'Scratch.lean' },
            'There are two ways to get a `SortedList`: start empty, or insert into one you have. Each proves the invariant. So any `SortedList` you are handed is in order, however it was made and whoever made it. A function that needs sorted input, such as the binary search in the next lesson, can ask for one and need no hypothesis.',
            'A type can also carry a number. `Vector Nat n` is an array of exactly `n` numbers, and the length is checked by the type checker.',
            { code: lean`def dot {n : Nat} (a b : Vector Nat n) : Nat :=
  (a.zipWith (· * ·) b).sum`, name: 'Scratch.lean' },
            '`dot #v[1, 2, 3] #v[4, 5, 6]` is 32. Give it vectors of different lengths and it is a type error.',
            { text: lean`Application type mismatch: The argument
  #v[4, 5]
has type
  Vector Nat 2
but is expected to have type
  Vector Nat 3` },
            { table: { head: ['When an operation can fail', 'What the caller sees', 'Use it when'], rows: [
              ['Return an `Option`', 'A value to match on.', 'Failure is normal and the caller decides what to do.'],
              ['Take a proof as an argument', 'An obligation at each call.', 'The caller usually knows the fact already.'],
              ['Put the fact in the type', 'Nothing. It cannot fail.', 'Many functions share the same requirement.'],
            ] } },
          ],
        },
      ],
      takeaways: [
        '`a[i]` needs a proof that the index is in range, and then needs no check at run time.',
        'The proof can come from an argument, from `if h : …`, or from the type of the index.',
        'A subtype or a proof field makes an invalid value impossible to build.',
        'Whoever builds the value proves the invariant. Whoever receives it may use the invariant.',
        'Proofs are erased when the program is compiled.',
      ],
      quiz: [
        {
          q: 'Why is `def pick (a : Array Nat) (i : Nat) : Nat := a[i]` rejected?',
          options: [
            { t: 'Nothing shows that `i` is below `a.size`, and plain indexing requires a proof of that.', ok: true, why: 'The error ends with the goal `i < a.size`, which has no hypothesis to support it.' },
            { t: 'Arrays can only be indexed with a `Fin`.', why: 'A `Nat` index is fine when a proof of the bound is available, as in `firstTwo` and `getOr`.' },
            { t: 'The function might be called with an empty array.', why: 'That is one way the index could be out of range. The complaint is general: no bound on `i` is known at all.' },
          ],
        },
        {
          q: 'In `if h : i < a.size then a[i] else fallback`, what is `h` for?',
          options: [
            { t: 'It names the fact that the test succeeded, so `a[i]` in that branch has its proof.', ok: true, why: 'Without the name, the branch would not know the test had passed.' },
            { t: 'It stores the Boolean result of the test for later use.', why: '`h` is a proof, not a Boolean. It exists only while the file is checked.' },
            { t: 'It is required syntax for any `if` in a definition.', why: 'An ordinary `if` needs no name. The name is there to carry the fact into the branch.' },
          ],
        },
        {
          q: 'What happens with `def zero : Pos := ⟨0, by decide⟩`?',
          options: [
            { t: 'The file does not compile, because `0 > 0` is false.', ok: true, why: 'Building a `Pos` requires a proof that the number is positive, and none exists for 0.' },
            { t: 'It compiles, and a later division by it raises an error.', why: 'Nothing is deferred to run time. The value cannot be built in the first place.' },
            { t: 'It compiles, with the value clamped to 1.', why: 'Lean never repairs a value. It rejects the definition.' },
          ],
        },
        {
          q: 'What does the `ok` field of a `Range` cost when the program runs?',
          options: [
            { t: 'Nothing. Proofs are erased when the program is compiled.', ok: true, why: 'At run time a `Range` is two numbers.' },
            { t: 'One comparison each time a `Range` is built.', why: 'That is the cost of a run-time check. The proof was checked before the program existed.' },
            { t: 'One extra word of memory for each `Range`.', why: 'A proof has no run-time representation.' },
          ],
        },
        {
          q: 'Lean accepts this definition. Why is the index valid?',
          code: lean`def middle (a : Array Nat) (h : a.size > 0) : Nat :=
  a[a.size / 2]`,
          options: [
            { t: 'From `h`, Lean proves that `a.size / 2 < a.size`.', ok: true, why: 'Half of a positive number is smaller than the number. Lean finds this proof itself from the hypothesis in scope.' },
            { t: 'Division rounds down, so the index is always valid.', why: 'For an empty array the index would be 0, which is not below a size of 0. The hypothesis is needed.' },
            { t: 'Lean checks the index when the function is called.', why: 'There is no run-time check. The caller supplies `h`, and the proof is complete before anything runs.' },
          ],
        },
        {
          q: 'Why must `Range.shift` include `ok := by …`?',
          options: [
            { t: 'Every function that builds a `Range` has to prove the invariant for the value it returns.', ok: true, why: 'That obligation is what lets every other function rely on the invariant.' },
            { t: 'Lean cannot copy a proof field from one structure to another.', why: 'It can. But the old proof is about the old numbers, and the new range has different ones.' },
            { t: 'It is optional, and included for documentation.', why: 'Leave the field out and the definition is rejected.' },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these never perform a bounds check when the program runs?',
          options: [
            { t: '`a[i]` with a proof in scope', ok: true, why: 'The proof replaces the check.' },
            { t: '`a[i]` where `i : Fin a.size`', ok: true, why: 'The type of the index is the proof.' },
            { t: '`a[i]!`', why: 'It checks, and stops the program when the index is out of range.' },
            { t: '`a[i]?`', why: 'It checks, and returns `none` when the index is out of range.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-09-proof-carrying-types', kind: 'lab', level: 'core', title: 'Put facts into types',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('09'),
          'Some holes are values and some are proofs. A proof field is filled like any other field.',
          { code: lean`def Range.lower (r : Range) : Range :=
  sorry` },
          'Exercises 4 to 6 build up a `Range` that can be split at its midpoint, which is the step binary search takes. Prove the theorem about the midpoint first. Its two halves are then exactly the proofs the two smaller ranges need.',
          'The stretch exercise builds a `SortedList` interface from the theorems of lesson 8, which are repeated in the file.',
          checkLab('09'),
          solution('09'),
        ],
        hints: [
          'Exercise 2: `if h : a.size > 0 then a[a.size - 1] else fallback`. The name `h` is what makes the index acceptable.',
          'Exercise 5: a theorem that proves `p ∧ q` gives its halves as `.1` and `.2`. So `r.mid_in.1` is a proof of `r.lo ≤ r.mid`, which is the `ok` field for the lower half.',
          'Exercise 6: `simp [Range.lower, Range.upper, Range.width, Range.mid]` unfolds everything, and `omega` finishes once `have h := r.ok` is above the line.',
        ],
        checks: [
          '`lean Lab09.lean` prints nothing: no errors and no `sorry` warnings.',
          'I filled a proof field with a theorem I had just proved.',
          'In exercise 7, I saw the goal after `cases` and `simp`, with the proof field gone.',
        ],
        notes: [
          { label: 'The goal in exercise 7', placeholder: 'Paste the goal panel after simp [Percent.complement].' },
        ],
      }],
    },
    {
      id: 'binary-search',
      category: part,
      title: 'Case study: binary search',
      summary: 'Specify and prove Python’s bisect_left. Lean catches the infinite loop before you write a theorem, and the proof is the invariant you would have drawn on paper.',
      minutes: 50,
      topics: ['bisect_left', 'Termination', 'Loop invariant', 'fun_induction', 'Using a specification'],
      sections: [
        {
          title: 'The function, as Python has it',
          body: [
            'Binary search is short, and it is famous for being written wrong. The usual mistakes are an index one off, a range that stops shrinking, and a midpoint that overflows. Here it is as Python’s `bisect` module has it, without the optional arguments.',
            { code: `def bisect_left(a, x):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid
    return lo`, lang: 'python', name: 'bisect_left.py' },
            'The documentation says what it returns: a position `i` such that every element before `i` is less than `x`, and every element from `i` on is at least `x`. It also says that `a` is assumed to be sorted. Those two sentences are the specification, and the assumption is a hypothesis.',
          ],
        },
        {
          title: 'The program in Lean',
          body: [
            'The loop becomes a recursion on the two bounds.',
            { code: lean`def bisect (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) : Nat :=
  if hlt : lo < hi then
    let mid := lo + (hi - lo) / 2
    if a[mid] < x then bisect a x (mid + 1) hi h
    else bisect a x lo mid (by omega)
  else lo
termination_by hi - lo

def bisectLeft (a : Array Nat) (x : Nat) : Nat :=
  bisect a x 0 a.size (Nat.le_refl _)`, name: 'Scratch.lean' },
            'Everything from lesson 9 is at work. The argument `h` promises that `hi` is within the array. The test is named `hlt`. From those two facts Lean proves that `a[mid]` is in range. The second recursive call has a new upper bound, so it owes a new promise, `mid ≤ a.size`, and `by omega` supplies it. `Nat.le_refl _` is the proof that `a.size ≤ a.size`.',
            'The measure `hi - lo` is the width of the range still to be searched. Lean proved, without being asked, that it gets smaller in both recursive calls. Written out as theorems, the facts it used look like this.',
            { code: lean`example (lo hi size : Nat) (hlt : lo < hi) (h : hi ≤ size) : lo + (hi - lo) / 2 < size := by
  omega

example (lo hi : Nat) (hlt : lo < hi) : hi - (lo + (hi - lo) / 2 + 1) < hi - lo := by
  omega` },
            'Now make the classic mistake. Continue the search from `mid`, not `mid + 1`.',
            { code: lean`def bisectLoop (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) : Nat :=
  if hlt : lo < hi then
    let mid := lo + (hi - lo) / 2
    if a[mid] < x then bisectLoop a x mid hi h
    else bisectLoop a x lo mid (by omega)
  else lo
termination_by hi - lo` },
            { text: lean`mid : Nat := lo + (hi - lo) / 2
h✝ : a[mid] < x
⊢ hi - (lo + (hi - lo) / 2) < hi - lo` },
            'Lean could not prove that the range shrinks, and it is right. When `hi` is `lo + 1`, `mid` equals `lo` and the call repeats with the same arguments. In Python this is a program that hangs on some inputs. Here it is a definition that is refused, with the failing case on the screen.',
          ],
        },
        {
          title: 'The specification',
          body: [
            'First, what “sorted” means for an array: an earlier position never holds a larger element.',
            { code: lean`def SortedArray (a : Array Nat) : Prop :=
  ∀ i j (hi : i < a.size) (hj : j < a.size), i ≤ j → a[i] ≤ a[j]`, name: 'Scratch.lean' },
            'The binders `(hi : i < a.size)` are there because the statement mentions `a[i]`. Even inside a theorem, indexing needs its proof.',
            'Then the documentation’s two sentences, and one more saying that the answer is a valid position.',
            { code: lean`theorem bisectLeft_spec (a : Array Nat) (x : Nat) (hs : SortedArray a) :
    bisectLeft a x ≤ a.size ∧
    (∀ i (_ : i < a.size), i < bisectLeft a x → a[i] < x) ∧
    (∀ i (_ : i < a.size), bisectLeft a x ≤ i → x ≤ a[i])` },
            'Test it against wrong programs, as in lesson 8. Returning 0 every time fails the third line. Returning `a.size` fails the second. Only the dividing point between “less than `x`” and “at least `x`” satisfies both, and in a sorted array there is exactly one.',
          ],
        },
        {
          title: 'A first property: the answer stays in the range',
          body: [
            '`bisect` recurses on a shrinking range, not on a piece of a list, so the proof uses `fun_induction` from lesson 6. It gives one case for each path through the function.',
            { code: lean`theorem bisect_range (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) (hle : lo ≤ hi) :
    lo ≤ bisect a x lo hi h ∧ bisect a x lo hi h ≤ hi := by
  fun_induction bisect a x lo hi h with
  | case1 lo hi h hlt mid hmid ih =>
    have h1 := ih (by omega)
    omega
  | case2 lo hi h hlt mid hmid ih =>
    have h1 := ih (by omega)
    omega
  | case3 lo hi h hlt => omega`, name: 'Scratch.lean' },
            'Case 1 is the path where `a[mid] < x` and the search moved right. The function has been unfolded, so the goal already talks about the recursive call.',
            { text: lean`mid : Nat := lo + (hi - lo) / 2
hmid : a[mid] < x
ih : mid + 1 ≤ hi → mid + 1 ≤ bisect a x (mid + 1) hi h ∧ bisect a x (mid + 1) hi h ≤ hi
hle : lo ≤ hi
⊢ lo ≤ bisect a x (mid + 1) hi h ∧ bisect a x (mid + 1) hi h ≤ hi` },
            'The hypothesis `ih` is an implication, because the theorem has the hypothesis `lo ≤ hi` and the recursive call must satisfy it for its own bounds. `ih (by omega)` supplies that, and what comes back is the claim for the smaller range. The rest is arithmetic.',
            'Case 3 is the path where the range is empty and the function returned `lo`.',
            { text: lean`hlt : ¬lo < hi
hle : lo ≤ hi
⊢ lo ≤ lo ∧ lo ≤ hi` },
          ],
        },
        {
          title: 'The invariant',
          body: [
            'The specification is about the whole array. The recursion is about a part of it. As with the accumulator in lesson 6, the theorem has to describe every call, so it needs to say what is true of the elements outside the range being searched.',
            'Draw the array. Everything to the left of `lo` has been ruled out as too small. Everything from `hi` on is known to be large enough. The search narrows the unknown part in between. That picture is the invariant, and it becomes two hypotheses.',
            { code: lean`theorem bisect_spec (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) (hle : lo ≤ hi)
    (hs : SortedArray a)
    (below : ∀ i (hi' : i < a.size), i < lo → a[i] < x)
    (above : ∀ i (hi' : i < a.size), hi ≤ i → x ≤ a[i]) :
    (∀ i (_ : i < a.size), i < bisect a x lo hi h → a[i] < x) ∧
    (∀ i (_ : i < a.size), bisect a x lo hi h ≤ i → x ≤ a[i]) := by
  fun_induction bisect a x lo hi h with
  | case1 lo hi h hlt mid hmid ih =>
    apply ih
    · omega
    · intro i hi' hi2
      have h1 := hs i mid hi' (by omega) (by omega)
      omega
    · exact above
  | case2 lo hi h hlt mid hmid ih =>
    apply ih
    · omega
    · exact below
    · intro i hi' hi2
      have h1 := hs mid i (by omega) hi' (by omega)
      omega
  | case3 lo hi h hlt =>
    constructor
    · exact below
    · intro i hi' hi2
      exact above i hi' (by omega)`, name: 'Scratch.lean' },
            'It is long, and every line is forced. Take case 1. The search moved right, to the range from `mid + 1` to `hi`. `apply ih` says: the conclusion holds for the smaller range, provided its three hypotheses do. So there are three goals. The bounds are still in order. `above` is unchanged, because `hi` did not move. And `below` must be proved again for the new left edge, `mid + 1`.',
            { text: lean`i : Nat
hi' : i < a.size
hi2 : i < mid + 1
⊢ a[i] < x` },
            'This is the one step in the proof that is about binary search. Why is every element up to `mid` less than `x`? Because the array is sorted, so `a[i] ≤ a[mid]`, and the test just found `a[mid] < x`. `hs i mid …` is that first fact.',
            { text: lean`hi2 : i < mid + 1
h1 : a[i] ≤ a[mid]
⊢ a[i] < x` },
            'With `hmid : a[mid] < x` also above the line, `omega` finishes. Case 2 is the mirror image. Case 3 is the end of the search, where `lo` and `hi` have met and the two hypotheses are the conclusion.',
          ],
        },
        {
          title: 'The theorem a caller wants',
          body: [
            'To get the specification, start the search on the whole array. Nothing is to the left of position 0, and nothing is at or beyond `a.size`, so both parts of the invariant hold for a reason `omega` can see.',
            { code: lean`theorem bisectLeft_spec (a : Array Nat) (x : Nat) (hs : SortedArray a) :
    bisectLeft a x ≤ a.size ∧
    (∀ i (_ : i < a.size), i < bisectLeft a x → a[i] < x) ∧
    (∀ i (_ : i < a.size), bisectLeft a x ≤ i → x ≤ a[i]) := by
  unfold bisectLeft
  constructor
  · exact (bisect_range a x 0 a.size (Nat.le_refl _) (by omega)).2
  · apply bisect_spec
    · omega
    · exact hs
    · intro i _ hi2
      omega
    · intro i hi' hi2
      omega`, name: 'Scratch.lean' },
            'From here on, nobody needs to read `bisect` again. A caller reasons from the specification alone. For example: if `x` is in the array at position `i`, the search returns a position no later than `i`.',
            { code: lean`theorem bisectLeft_le_of_eq (a : Array Nat) (x : Nat) (hs : SortedArray a)
    (i : Nat) (hi : i < a.size) (hx : a[i] = x) : bisectLeft a x ≤ i := by
  have h1 := (bisectLeft_spec a x hs).2.1 i hi
  omega`, name: 'Scratch.lean' },
            'Be exact about what has been established. For every sorted array and every `x`, the function returns the dividing point. It has not been shown to run in logarithmic time: nothing here counts steps. And for an array that is not sorted the theorem is silent, because its hypothesis cannot be supplied.',
            { compare: 'The Python version has the same invariant. It lives in the programmer’s head, or in a comment, and nothing checks that the loop maintains it. The Lean version states it as `below` and `above`, and the proof is the check. If you change `mid + 1` to `mid`, or `<` to `≤`, some line of the proof stops working, and the goal it leaves tells you which case you broke.' },
          ],
        },
      ],
      takeaways: [
        'A wrong recursive call that fails to shrink the range is refused when the function is defined.',
        'The specification is the documentation’s sentence, with “assuming the array is sorted” as a hypothesis.',
        'A theorem about a recursive search must describe every call. The extra hypotheses are the loop invariant.',
        '`fun_induction` gives one case for each path through the function.',
        'Once the specification is proved, callers reason from it and never from the code.',
      ],
      quiz: [
        {
          q: 'Why does `bisect` take the argument `h : hi ≤ a.size`?',
          options: [
            { t: 'With `lo < hi`, it lets Lean prove that `a[mid]` is in range.', ok: true, why: '`mid` is below `hi`, and `h` says `hi` is within the array.' },
            { t: 'It is the measure that shows the function finishes.', why: 'The measure is `hi - lo`, given by `termination_by`.' },
            { t: 'It tells Lean that the array is sorted.', why: 'Sortedness is `SortedArray a`, and the function itself never needs it. Only the theorem does.' },
          ],
        },
        {
          q: 'Lean refuses `bisectLoop` and shows this goal. For which values is it false?',
          code: lean`mid : Nat := lo + (hi - lo) / 2
h✝ : a[mid] < x
⊢ hi - (lo + (hi - lo) / 2) < hi - lo`,
          options: [
            { t: 'When `hi` is `lo + 1`: the midpoint is `lo`, and the range does not shrink.', ok: true, why: 'Then `(hi - lo) / 2` is 0, both sides are 1, and the call would repeat with the same arguments.' },
            { t: 'When `lo` equals `hi`.', why: 'That case never reaches this call, because the branch is guarded by `lo < hi`.' },
            { t: 'When `lo + hi` is too large to represent.', why: 'Natural numbers have no upper limit. Overflow is the subject of lesson 13.' },
          ],
        },
        {
          q: 'By the specification, what does `bisectLeft a x` return when `x` is larger than every element of a sorted `a`?',
          options: [
            { t: '`a.size`', ok: true, why: 'Every element is less than `x`, so the dividing point is after the last one.' },
            { t: '`a.size - 1`', why: 'Then the last element would be at or after the answer, and the third line of the specification would require it to be at least `x`.' },
            { t: '`0`', why: 'Then every element would have to be at least `x`.' },
          ],
        },
        {
          q: 'Why is `bisect_spec` stated with the hypotheses `below` and `above`?',
          options: [
            { t: 'The recursion works on a part of the array, so the claim has to say what is known about the rest.', ok: true, why: 'A statement about the whole array would not apply to a recursive call. This is the accumulator problem from lesson 6 again.' },
            { t: '`fun_induction` requires every theorem to have at least two hypotheses.', why: 'It has no such rule. `bisect_range` has one.' },
            { t: 'They are needed so that `a[i]` is in range.', why: 'That is the job of the binders `(hi\' : i < a.size)`.' },
          ],
        },
        {
          q: 'In case 1 the goal is as shown, and `hmid : a[mid] < x` is among the hypotheses. What is missing, and where does it come from?',
          code: lean`i : Nat
hi' : i < a.size
hi2 : i < mid + 1
⊢ a[i] < x`,
          options: [
            { t: '`a[i] ≤ a[mid]`, from the hypothesis that the array is sorted.', ok: true, why: '`i` is at most `mid`, so sortedness relates the two elements, and `a[mid] < x` finishes the argument.' },
            { t: '`i < lo`, from `below`.', why: '`i` may be anywhere up to `mid`, which is to the right of `lo`. `below` does not cover it.' },
            { t: '`a[i] < x`, from the induction hypothesis.', why: 'The induction hypothesis is what is being applied. This goal is one of the things it asked for.' },
          ],
        },
        {
          q: 'Which of these does `bisectLeft_spec` not establish?',
          options: [
            { t: 'That the search takes a logarithmic number of steps.', ok: true, why: 'Nothing in the statement counts steps. A linear scan could satisfy the same specification.' },
            { t: 'That the answer is at most `a.size`.', why: 'That is the first line of the theorem.' },
            { t: 'That every element before the answer is less than `x`.', why: 'That is the second line of the theorem.' },
          ],
        },
        {
          q: 'What do the theorems say about `bisectLeft` on an array that is not sorted?',
          options: [
            { t: 'Only that the answer is at most `a.size`. The specification needs `hs`, which cannot be supplied.', ok: true, why: '`bisect_range` has no sortedness hypothesis, so it still applies. `bisectLeft_spec` does not.' },
            { t: 'That the function returns 0.', why: 'It returns whatever the comparisons lead to. No theorem describes that.' },
            { t: 'That the call does not compile.', why: 'The function takes any array. Only the theorem asks for a sorted one.' },
          ],
        },
      ],
      challenges: [{
        id: 'lab-10-binary-search', kind: 'lab', level: 'core', title: 'Verify bisect_right',
        prompt: [
          'Put the lab file in your project folder and open it.',
          ...fetchLab('10'),
          'The lesson verified `bisect_left`. In this lab you verify its sibling, which returns the first position whose element is **greater** than `x`. The function is given.',
          { code: lean`def upper (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) : Nat :=
  if hlt : lo < hi then
    let mid := lo + (hi - lo) / 2
    if x < a[mid] then upper a x lo mid (by omega)
    else upper a x (mid + 1) hi h
  else lo
termination_by hi - lo` },
          'Its proofs have the shape of the lesson’s. The difference is that the two branches have changed places: here the first case moves `hi`, and the second moves `lo`. Keep the lesson open and adapt each step. When you are unsure, read the goal: it says which bound moved.',
          'Exercise 5 uses the finished specification without looking inside the function. Exercise 6 combines the two searches.',
          checkLab('10'),
          solution('10'),
        ],
        hints: [
          'Exercise 2: both recursive cases are `have h1 := ih (by omega)` followed by `omega`.',
          'Exercise 3, case 1: `apply ih` leaves three goals. The bounds: `omega`. `below` has not changed: `exact below`. For `above`, take `intro i hi\' hi2`, then get `a[mid] ≤ a[i]` with `have h1 := hs mid i (by omega) hi\' (by omega)`, and finish with `omega`.',
          'Exercise 6: after `by_cases c : bisectRight a x < bisectLeft a x`, apply the second line of `bisectLeft_spec` and the third line of `bisectRight_spec` to the position `bisectRight a x`. One says the element there is less than `x`, and the other says it is greater.',
        ],
        checks: [
          '`lean Lab10.lean` prints nothing: no errors and no `sorry` warnings.',
          'In exercise 3, I can point to the one line in each case that uses the fact that the array is sorted.',
          'In exercise 5, I proved a fact about the search from its specification alone.',
        ],
        notes: [
          { label: 'The step that needed sortedness', placeholder: 'Paste the goal from case 1 of exercise 3 just before and just after your have h1 := hs … line.' },
        ],
      }],
    },
  );
})();
