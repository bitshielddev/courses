/-!
# Lab 01 · First contact

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab01.lean

Keep the goal panel open while you work. Put the cursor at the end of a tactic line to see
what is left to prove.
-/

def double (n : Nat) : Nat :=
  n * 2

/-! ## 1. Write a function

`#guard` is a test: it reports an error unless its expression evaluates to `true`. -/

def triple (n : Nat) : Nat :=
  --! begin solution
  n * 3
  --! end solution

#guard triple 7 == 21
#guard triple 0 == 0

/-! ## 2. A fact about one input

There are no variables here, so Lean can decide the claim by evaluating both sides. -/

theorem triple_7 : triple 7 = 21 := by
  --! begin solution
  decide
  --! end solution

/-! ## 3. A fact about every input

Unfold the definition first. Then the goal is plain arithmetic. -/

theorem triple_eq (n : Nat) : triple n = n + n + n := by
  --! begin solution
  unfold triple
  omega
  --! end solution

/-! ## 4. Two calls

`unfold double` rewrites every use of `double` in the goal. -/

theorem double_double (n : Nat) : double (double n) = 4 * n := by
  --! begin solution
  unfold double
  omega
  --! end solution

/-! ## 5. Use a hypothesis

`h` is a fact you may assume. `omega` reads the hypotheses as well as the goal. -/

theorem double_lt (a b : Nat) (h : a < b) : double a < double b := by
  --! begin solution
  unfold double
  omega
  --! end solution

/-! ## 6. Fix a false claim

This statement is false, so no proof exists. Find an input that breaks it with `#eval`,
correct the right-hand side, then prove the corrected statement. -/

--! begin solution
theorem double_succ (n : Nat) : double (n + 1) = double n + 2 := by
  unfold double
  omega
--! starter
--! | theorem double_succ (n : Nat) : double (n + 1) = double n + 1 := by
--! |   sorry
--! end solution

/-! ## 7. Stretch: two definitions at once

`unfold` takes several names. -/

theorem triple_double (n : Nat) : triple (double n) = double (triple n) := by
  --! begin solution
  unfold triple double
  omega
  --! end solution
