/-!
# Lab 14 · What did you prove?

A colleague hands you this file and says that the five deliverables in it are done. It
compiles. Lean reports a warning near the top and one failing test, and you are told that
neither matters. Audit the file, then repair it. (The two warnings near the end are holes
left for you: they are part of the repair of deliverable 5.)

You are done when this command prints the five `#print axioms` lines, with nothing in them
beyond `propext`, `Classical.choice` and `Quot.sound`, and prints nothing else:

    lean Lab14.lean

Five faults are planted, one for each kind the lesson described. Find each before you fix
it, and note how you found it.
-/

def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

/-! ## Deliverable 1 · `total` distributes over `++`

It is proved from a helper. Look at the helper. -/

theorem total_append (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  sorry

theorem deliverable1 (xs ys zs : List Nat) :
    total (xs ++ ys ++ zs) = total xs + total ys + total zs := by
  rw [total_append, total_append]

/-! ## Deliverable 2 · the fast sum agrees with the clear one

The statement is right. Ask what the proof rests on. To repair it, replace the `axiom` by a
`theorem` with the same statement, and prove it. -/

def totalFast (xs : List Nat) : Nat :=
  go 0 xs
where
  go (acc : Nat) : List Nat → Nat
    | [] => acc
    | x :: rest => go (acc + x) rest

axiom go_eq (acc : Nat) (xs : List Nat) : totalFast.go acc xs = acc + total xs

theorem deliverable2 (xs : List Nat) : totalFast xs = total xs := by
  simp [totalFast, go_eq]

/-! ## Deliverable 3 · clamping stays in range

Read the hypotheses. Can any caller supply both? Remove the one that does not belong, and
prove what is left. -/

def clamp (lo hi x : Nat) : Nat :=
  if x < lo then lo else if x > hi then hi else x

theorem deliverable3 (lo hi x : Nat) (h : lo ≤ hi) (h2 : hi < lo) :
    lo ≤ clamp lo hi x ∧ clamp lo hi x ≤ hi := by
  omega

/-! ## Deliverable 4 · filtering keeps only positive numbers

The theorem is true. Read the definition it is stated with, and ask which lists satisfy it.
Correct the definition. The proof may need to change with it. -/

def keepPositive (xs : List Nat) : List Nat :=
  xs.filter (· > 0)

def AllPositive (xs : List Nat) : Prop :=
  ∀ x ∈ xs, x ≥ 0

theorem deliverable4 (xs : List Nat) : AllPositive (keepPositive xs) := by
  simp [AllPositive]

/-! ## Deliverable 5 · a count, with a faster implementation behind it

The theorem is proved, and the test under it fails: `#guard_msgs` compares what `#eval`
prints with the comment above it. Find out what runs when `countZeros` is called. Repair the implementation, then prove the theorem that entitles it to stand in
for the definition. -/

def countZerosFast (xs : List Nat) : Nat :=
  go 0 xs
where
  go (acc : Nat) : List Nat → Nat
    | [] => acc
    | x :: rest => go (if x = 0 then acc else acc + 1) rest

@[implemented_by countZerosFast]
def countZeros : List Nat → Nat
  | [] => 0
  | x :: rest => (if x = 0 then 1 else 0) + countZeros rest

theorem deliverable5 (xs : List Nat) : countZeros xs ≤ xs.length := by
  induction xs with
  | nil => simp [countZeros]
  | cons x rest ih =>
    simp [countZeros]
    split <;> omega

/-- info: 2 -/
#guard_msgs in
#eval countZeros [0, 7, 0, 3, 5]

theorem countZerosFast_go (acc : Nat) (xs : List Nat) :
    countZerosFast.go acc xs = acc + countZeros xs := by
  sorry

/-- The fact that justifies the `implemented_by` attribute above. -/
theorem countZerosFast_eq (xs : List Nat) : countZerosFast xs = countZeros xs := by
  sorry

/-! ## The audit

Leave these five lines in the file. They are the report. -/

#print axioms deliverable1
#print axioms deliverable2
#print axioms deliverable3
#print axioms deliverable4
#print axioms deliverable5
