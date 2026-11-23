/-! Lesson 01 · First contact. Every piece of Lean quoted in the lesson, in reading order. -/

def double (n : Nat) : Nat :=
  n * 2

/-- info: 42 -/
#guard_msgs in
#eval double 21

/-- info: double (n : Nat) : Nat -/
#guard_msgs in
#check double

/-- info: double 21 = 42 : Prop -/
#guard_msgs in
#check double 21 = 42

-- Application binds tighter than any operator.
/-- info: 5 -/
#guard_msgs in
#eval double 2 + 1

/-- info: 6 -/
#guard_msgs in
#eval double (2 + 1)

theorem double_21 : double 21 = 42 := by
  decide

/--
error: Tactic `decide` proved that the proposition
  double 21 = 43
is false
-/
#guard_msgs in
theorem double_21_wrong : double 21 = 43 := by
  decide

theorem double_eq (n : Nat) : double n = n + n := by
  unfold double
  omega

-- The goal before and after `unfold`.
/--
trace: n : Nat
⊢ double n = n + n
---
trace: n : Nat
⊢ n * 2 = n + n
-/
#guard_msgs in
example (n : Nat) : double n = n + n := by
  trace_state
  unfold double
  trace_state
  omega

-- A hole.
/-- warning: declaration uses `sorry` -/
#guard_msgs in
theorem double_pos (n : Nat) (h : n > 0) : double n > 0 := by
  sorry

-- Questions.
/--
trace: a b : Nat
h : a = b + 1
⊢ double a = double b + 2
-/
#guard_msgs in
example (a b : Nat) (h : a = b + 1) : double a = double b + 2 := by
  trace_state
  unfold double
  omega

/--
error: omega could not prove the goal:
a possible counterexample may satisfy the constraints
  a ≥ 0
where
 a := ↑n
-/
#guard_msgs in
example (n : Nat) : double n = n + n + 1 := by
  unfold double
  omega
