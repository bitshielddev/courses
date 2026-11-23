/-! Lesson 05 · Equality and rewriting. Every piece of Lean quoted in the lesson, in reading order. -/

def double (n : Nat) : Nat :=
  n * 2

def quadruple (n : Nat) : Nat :=
  double (double n)

-- Equal by computing.
theorem double_3 : double 3 = 6 := by
  rfl

theorem add_zero_right (n : Nat) : n + 0 = n := by
  rfl

/--
error: Tactic `rfl` failed: The left-hand side
  0 + n
is not definitionally equal to the right-hand side
  n

n : Nat
⊢ 0 + n = n
-/
#guard_msgs in
theorem zero_add_left (n : Nat) : 0 + n = n := by
  rfl

theorem zero_add_left' (n : Nat) : 0 + n = n := by
  omega

structure Point where
  x : Int
  y : Int

def Point.swap (p : Point) : Point :=
  { x := p.y, y := p.x }

theorem swap_swap (p : Point) : p.swap.swap = p := by
  rfl

-- Rewriting with a hypothesis.
theorem rw_hyp (f : Nat → Nat) (a b : Nat) (h1 : a = b) (h2 : f b = 7) : f a + 1 = 8 := by
  rw [h1]
  rw [h2]

/--
trace: f : Nat → Nat
a b : Nat
h1 : a = b
h2 : f b = 7
⊢ f a + 1 = 8
---
trace: f : Nat → Nat
a b : Nat
h1 : a = b
h2 : f b = 7
⊢ f b + 1 = 8
-/
#guard_msgs in
example (f : Nat → Nat) (a b : Nat) (h1 : a = b) (h2 : f b = 7) : f a + 1 = 8 := by
  trace_state
  rw [h1]
  trace_state
  rw [h2]

-- Right to left, and in a hypothesis.
theorem rw_back (f : Nat → Nat) (a b : Nat) (h : f a = b) : b + 1 = f a + 1 := by
  rw [← h]

theorem rw_at (a b : Nat) (h1 : a = b) (h2 : a + a = 10) : b + b = 10 := by
  rw [h1] at h2
  exact h2

-- Rewriting with a theorem.
theorem double_eq (n : Nat) : double n = n + n := by
  unfold double
  omega

theorem quadruple_eq (n : Nat) : quadruple n = n + n + (n + n) := by
  unfold quadruple
  rw [double_eq]
  rw [double_eq]

/--
trace: n : Nat
⊢ double (double n) = n + n + (n + n)
---
trace: n : Nat
⊢ double n + double n = n + n + (n + n)
-/
#guard_msgs in
example (n : Nat) : quadruple n = n + n + (n + n) := by
  unfold quadruple
  trace_state
  rw [double_eq]
  trace_state
  rw [double_eq]

-- The library's theorems, restated so that Lean checks the statements the lesson gives.
example (n m : Nat) : n + m = m + n := Nat.add_comm n m
example (n m : Nat) : n * m = m * n := Nat.mul_comm n m
example (n m k : Nat) : n + m + k = n + (m + k) := Nat.add_assoc n m k
example (xs ys : List Nat) : (xs ++ ys).length = xs.length + ys.length := List.length_append
example (xs : List Nat) : xs.reverse.length = xs.length := List.length_reverse
example (xs : List Nat) (f : Nat → Nat) : (xs.map f).length = xs.length := List.length_map f

theorem length_swap (xs ys : List Nat) : (xs ++ ys).length = ys.length + xs.length := by
  rw [List.length_append]
  rw [Nat.add_comm]

/--
trace: xs ys : List Nat
⊢ xs.length + ys.length = ys.length + xs.length
-/
#guard_msgs in
example (xs ys : List Nat) : (xs ++ ys).length = ys.length + xs.length := by
  rw [List.length_append]
  trace_state
  rw [Nat.add_comm]

-- A rewrite that does not find its pattern.
/--
error: Tactic `rewrite` failed: Did not find an occurrence of the pattern
  double ?n
in the target expression
  n + n = 2 * n

n : Nat
⊢ n + n = 2 * n
-/
#guard_msgs in
example (n : Nat) : n + n = 2 * n := by
  rw [double_eq]

example (n : Nat) : n + n = double n := by
  rw [← double_eq]

-- simp.
theorem length_demo (xs : List Nat) (x : Nat) : (x :: xs ++ [1, 2]).length = xs.length + 3 := by
  simp

/--
info: Try this:
  [apply] simp only [List.cons_append, List.length_cons, List.length_append, List.length_nil, Nat.zero_add,
    Nat.reduceAdd, Nat.add_right_cancel_iff, Nat.add_left_cancel_iff]
-/
#guard_msgs in
example (xs : List Nat) (x : Nat) : (x :: xs ++ [1, 2]).length = xs.length + 3 := by
  simp?

theorem double_add (a b : Nat) : double (a + b) = double a + double b := by
  simp [double]
  omega

/--
trace: a b : Nat
⊢ (a + b) * 2 = a * 2 + b * 2
-/
#guard_msgs in
example (a b : Nat) : double (a + b) = double a + double b := by
  simp [double]
  trace_state
  omega

theorem simp_hyp (xs : List Nat) (h : (xs ++ [0]).length = 5) : xs.length = 4 := by
  simp at h
  exact h

/--
trace: xs : List Nat
h : xs.length = 4
⊢ xs.length = 4
-/
#guard_msgs in
example (xs : List Nat) (h : (xs ++ [0]).length = 5) : xs.length = 4 := by
  simp at h
  trace_state
  exact h

-- simp needs to be told about your hypotheses.
/--
error: unsolved goals
f : Nat → Nat
a : Nat
h : f a = 0
⊢ f a = 0
-/
#guard_msgs in
example (f : Nat → Nat) (a : Nat) (h : f a = 0) : f a + 1 = 1 := by
  simp

example (f : Nat → Nat) (a : Nat) (h : f a = 0) : f a + 1 = 1 := by
  simp [h]

-- calc.
theorem calc_demo (f : Nat → Nat) (a b : Nat) (h1 : a = b) (h2 : f b = 7) : f a + 1 = 8 := by
  calc f a + 1 = f b + 1 := by rw [h1]
    _ = 7 + 1 := by rw [h2]
    _ = 8 := by rfl

-- Questions.
/--
trace: a b c : Nat
h : a = b
⊢ c + a = b + c
-/
#guard_msgs in
example (a b c : Nat) (h : a = b) : a + c = b + c := by
  rw [Nat.add_comm]
  trace_state
  rw [h, Nat.add_comm]

/-- error: `simp` made no progress -/
#guard_msgs in
example (a b : Nat) : a + b = b + a := by
  simp
