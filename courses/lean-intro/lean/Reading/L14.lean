/-! Lesson 14 · What did you prove? Every piece of Lean quoted in the lesson, in reading order. -/

def rev (xs : List Nat) : List Nat :=
  xs.reverse

-- What a theorem rests on.
theorem two_plus_two : 2 + 2 = 4 :=
  rfl

/-- info: 'two_plus_two' does not depend on any axioms -/
#guard_msgs in
#print axioms two_plus_two

theorem rev_length (xs : List Nat) : (rev xs).length = xs.length := by
  simp [rev]

/-- info: 'rev_length' depends on axioms: [propext] -/
#guard_msgs in
#print axioms rev_length

theorem succ_le (a b : Nat) (h : a < b) : a + 1 ≤ b := by
  omega

/-- info: 'succ_le' depends on axioms: [propext, Quot.sound] -/
#guard_msgs in
#print axioms succ_le

-- 1. A hole somewhere underneath.
/-- warning: declaration uses `sorry` -/
#guard_msgs in
theorem rev_length_helper (xs : List Nat) : (rev xs).length = xs.length := by
  sorry

theorem rev_append_length (xs ys : List Nat) : (rev (xs ++ ys)).length = xs.length + ys.length := by
  rw [rev_length_helper]
  simp

/-- info: 'rev_append_length' depends on axioms: [propext, sorryAx] -/
#guard_msgs in
#print axioms rev_append_length

-- 2. An assumption dressed as a fact.
axiom rev_length_assumed (xs : List Nat) : (rev xs).length = xs.length

theorem rev_length_again (xs : List Nat) : (rev xs).length = xs.length :=
  rev_length_assumed xs

/-- info: 'rev_length_again' depends on axioms: [rev_length_assumed] -/
#guard_msgs in
#print axioms rev_length_again

axiom one_is_two : 1 = 2

theorem anything : 2 + 2 = 5 := by
  have h := one_is_two
  omega

/-- info: 'anything' depends on axioms: [one_is_two, propext, Quot.sound] -/
#guard_msgs in
#print axioms anything

-- 3. Hypotheses that nobody can meet.
theorem always_42 (n : Nat) (h : n < 0) : n = 42 := by
  omega

/-- info: 'always_42' depends on axioms: [propext, Quot.sound] -/
#guard_msgs in
#print axioms always_42

theorem positive_exists : ∃ n : Nat, n > 5 := by
  exists 6

-- 4. A definition that does not mean what its name says.
def AllPositive (xs : List Nat) : Prop :=
  ∀ x ∈ xs, x ≥ 0

theorem everything_is_positive (xs : List Nat) : AllPositive xs := by
  simp [AllPositive]

/-- info: 'everything_is_positive' depends on axioms: [propext, Quot.sound] -/
#guard_msgs in
#print axioms everything_is_positive

-- 5. The program that runs is not the program that was proved.
def quick (n : Nat) : Nat :=
  n + 1

@[implemented_by quick]
def careful (n : Nat) : Nat :=
  n

theorem careful_id (n : Nat) : careful n = n :=
  rfl

/-- info: 6 -/
#guard_msgs in
#eval careful 5

/-- info: 'careful_id' does not depend on any axioms -/
#guard_msgs in
#print axioms careful_id

-- 6. Trusting more than the kernel.
theorem squares_small : ∀ n < 1000, n * n < 1000000 := by
  native_decide

/-- info: 'squares_small' depends on axioms: [squares_small._native.native_decide.ax_1_1] -/
#guard_msgs in
#print axioms squares_small

-- A check you can keep in the file.
def Request : Prop :=
  ∀ xs : List Nat, (rev xs).length = xs.length

example : Request :=
  rev_length

-- (Lean's linter points out that `h` is never used. The lesson on AI-written proofs returns to that.)
set_option linter.unusedVariables false in
theorem rev_length_short (xs : List Nat) (h : xs.length < 100) : (rev xs).length = xs.length := by
  simp [rev]

/--
error: Type mismatch
  rev_length_short
has type
  ∀ (xs : List Nat), xs.length < 100 → (rev xs).length = xs.length
but is expected to have type
  Request
-/
#guard_msgs in
example : Request :=
  rev_length_short

-- Questions.
theorem impossible_square (n : Nat) (h : n > 10) (h2 : n < 5) : n * n = 7 := by
  omega
