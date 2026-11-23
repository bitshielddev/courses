import Std.WP
import Std.Tactic.Do

/-!
# Lab 12 · Loop invariants

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab12.lean

Every proof here is the same four lines, and the only thing you have to think of is the
invariant:

    generalize h : f xs = r
    apply Id.of_run_eq_wp h
    vcgen invariants
    · fun pref suff v => …
    with finish

`pref` is the part of the list the loop has finished with, and `v` is the loop's variable.
The invariant says what `v` is, in terms of `pref`. A good first guess is the theorem's own
right-hand side, with `xs` replaced by `pref`.
-/

open Std.WP Lean.Order

set_option experimental.vcgen true

/-! ## 1. A count -/

def countZeros (xs : List Nat) : Nat := Id.run do
  let mut count := 0
  for x in xs do
    if x = 0 then count := count + 1
  return count

theorem countZeros_eq (xs : List Nat) : countZeros xs = xs.count 0 := by
  generalize h : countZeros xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff count => count = pref.count 0
  with finish

/-! ## 2. A sum of some of the elements -/

def sumEvens (xs : List Nat) : Nat := Id.run do
  let mut total := 0
  for x in xs do
    if x % 2 = 0 then total := total + x
  return total

theorem sumEvens_eq (xs : List Nat) : sumEvens xs = (xs.filter (· % 2 = 0)).sum := by
  generalize h : sumEvens xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff total => total = (pref.filter (· % 2 = 0)).sum
  with finish

/-! ## 3. A flag

`xs.all p` is `true` when `p` holds of every element. Say that the loop computes it. Then
the claim a reader would expect follows in one line, because `simp` knows what `all` means. -/

def allBelow (xs : List Nat) (limit : Nat) : Bool := Id.run do
  let mut ok := true
  for x in xs do
    if x ≥ limit then ok := false
  return ok

theorem allBelow_eq (xs : List Nat) (limit : Nat) : allBelow xs limit = xs.all (· < limit) := by
  generalize h : allBelow xs limit = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff ok => ok = pref.all (· < limit)
  with finish

theorem allBelow_iff (xs : List Nat) (limit : Nat) :
    allBelow xs limit = true ↔ ∀ x ∈ xs, x < limit := by
  simp [allBelow_eq]

/-! ## 4. An inequality

This theorem is a bound, not an equation, so the invariant is a bound too. -/

def countBig (xs : List Nat) (limit : Nat) : Nat := Id.run do
  let mut n := 0
  for x in xs do
    if x > limit then n := n + 1
  return n

theorem countBig_le (xs : List Nat) (limit : Nat) : countBig xs limit ≤ xs.length := by
  generalize h : countBig xs limit = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff n => n ≤ pref.length
  with finish

/-! ## 5. Two variables

With two `let mut` variables the invariant takes them as a pair: `fun pref suff ⟨lo, hi⟩ => …`.
State one fact about each, joined by `∧`. -/

def lowHigh (xs : List Nat) (start : Nat) : Nat × Nat := Id.run do
  let mut lo := start
  let mut hi := start
  for x in xs do
    if x < lo then lo := x
    if x > hi then hi := x
  return (lo, hi)

theorem lowHigh_bounds (xs : List Nat) (start : Nat) :
    ∀ x ∈ xs, (lowHigh xs start).1 ≤ x ∧ x ≤ (lowHigh xs start).2 := by
  generalize h : lowHigh xs start = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff ⟨lo, hi⟩ => ∀ x ∈ pref, lo ≤ x ∧ x ≤ hi
  with finish

/-! ## 6. An invariant that is too weak

Try the invariant `fun pref suff total => total ≥ 0` first, with `all_goals trace_state` in
place of `with finish`, and read the goal that cannot be proved. It is true, and it says
nothing about what `total` holds. Then give the invariant that does. -/

def sumDoubled (xs : List Nat) : Nat := Id.run do
  let mut total := 0
  for x in xs do
    total := total + 2 * x
  return total

theorem sumDoubled_eq (xs : List Nat) : sumDoubled xs = 2 * xs.sum := by
  generalize h : sumDoubled xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff total => total = 2 * pref.sum
  with finish

/-! ## 7. Stretch: leaving the loop early

A loop with an early `return` needs two statements. `onContinue` holds while the loop is
still running. `onReturn` holds if it left early with the value `ret`. The half-brackets
`⌜ ⌝` are typed `\ulc` and `\urc`. The lesson's proof about `contains` is the model. -/

def hasZero (xs : List Nat) : Bool := Id.run do
  for x in xs do
    if x = 0 then return true
  return false

theorem hasZero_iff (xs : List Nat) : hasZero xs = true ↔ 0 ∈ xs := by
  generalize h : hasZero xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · Invariant.withEarlyReturnNewDo
      (onReturn := fun ret _ => ⌜ret = true ∧ 0 ∈ xs⌝)
      (onContinue := fun pref suff _ => ⌜0 ∉ pref⌝)
  with finish
