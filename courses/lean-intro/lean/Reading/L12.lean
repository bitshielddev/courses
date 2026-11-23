import Std.WP
import Std.Tactic.Do

/-! Lesson 12 · Loop invariants. Every piece of Lean quoted in the lesson, in reading order. -/
open Std.WP Lean.Order

set_option experimental.vcgen true

-- The loop from the last lesson.
def sumLoop (xs : List Nat) : Nat := Id.run do
  let mut total := 0
  for x in xs do
    total := total + x
  return total

-- The proof, in four lines.
theorem sumLoop_eq (xs : List Nat) : sumLoop xs = xs.sum := by
  generalize h : sumLoop xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff total => total = pref.sum
  with finish

-- The three obligations the invariant has to meet.
/--
trace: case vc1
xs : List Nat
r : Nat
h : sumLoop xs = r
⊢ 0 = [].sum
case vc2
xs : List Nat
r : Nat
h : sumLoop xs = r
pref✝ : List Nat
cur✝ : Nat
suff✝ : List Nat
_h✝ : xs = pref✝ ++ cur✝ :: suff✝
b✝ : Nat
a✝ : b✝ = pref✝.sum
total : Nat := b✝ + cur✝
⊢ total = (pref✝ ++ [cur✝]).sum
-/
#guard_msgs in
example (xs : List Nat) : sumLoop xs = xs.sum := by
  generalize h : sumLoop xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff total => total = pref.sum
  all_goals trace_state
  all_goals grind

-- An invariant that is true and too weak.
/--
trace: xs : List Nat
r : Nat
h : sumLoop xs = r
a✝¹ : Nat
a✝ : 0 ≤ a✝¹
⊢ a✝¹ = xs.sum
---
warning: declaration uses `sorry`
-/
#guard_msgs in
example (xs : List Nat) : sumLoop xs = xs.sum := by
  generalize h : sumLoop xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff total => total ≥ 0
  case vc2 =>
    trace_state
    sorry
  all_goals sorry

-- An invariant that is false at the start.
/--
trace: xs : List Nat
r : Nat
h : sumLoop xs = r
⊢ 0 = [].sum + 1
---
warning: declaration uses `sorry`
-/
#guard_msgs in
example (xs : List Nat) : sumLoop xs = xs.sum := by
  generalize h : sumLoop xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff total => total = pref.sum + 1
  case vc1 =>
    trace_state
    sorry
  all_goals sorry

-- A condition in the loop.
def maxLoop (xs : List Nat) : Nat := Id.run do
  let mut best := 0
  for x in xs do
    if x > best then best := x
  return best

theorem maxLoop_ge (xs : List Nat) : ∀ x ∈ xs, x ≤ maxLoop xs := by
  generalize h : maxLoop xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff best => ∀ x ∈ pref, x ≤ best
  with finish

-- Two variables.
def sumAndCount (xs : List Nat) : Nat × Nat := Id.run do
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
  with finish

-- Leaving the loop early.
def contains (xs : List Nat) (x : Nat) : Bool := Id.run do
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
  with finish

-- The same theorem as lesson 6 proved by induction.
def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

theorem total_eq_sum (xs : List Nat) : total xs = xs.sum := by
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [total, ih]

theorem sumLoop_eq_total (xs : List Nat) : sumLoop xs = total xs := by
  rw [sumLoop_eq, total_eq_sum]

-- Questions.
def countPos (xs : List Nat) : Nat := Id.run do
  let mut n := 0
  for x in xs do
    if x > 0 then n := n + 1
  return n

theorem countPos_le (xs : List Nat) : countPos xs ≤ xs.length := by
  generalize h : countPos xs = r
  apply Id.of_run_eq_wp h
  vcgen invariants
  · fun pref suff n => n ≤ pref.length
  with finish
