/-! Lesson 04 · Propositions and proofs. Every piece of Lean quoted in the lesson, in reading order. -/

-- If … then.
theorem pos_of_big (n : Nat) : n > 5 → n > 0 := by
  intro h
  omega

/--
trace: n : Nat
⊢ n > 5 → n > 0
---
trace: n : Nat
h : n > 5
⊢ n > 0
-/
#guard_msgs in
example (n : Nat) : n > 5 → n > 0 := by
  trace_state
  intro h
  trace_state
  omega

-- A theorem is a function from proofs to proofs.
theorem pos_of_seven (n : Nat) (h : n > 7) : n > 0 := by
  apply pos_of_big
  omega

/--
trace: n : Nat
h : n > 7
⊢ n > 5
-/
#guard_msgs in
example (n : Nat) (h : n > 7) : n > 0 := by
  apply pos_of_big
  trace_state
  omega

theorem pos_of_six (n : Nat) (h : n > 5) : n > 0 := by
  exact pos_of_big n h

-- And.
theorem in_range (n : Nat) (h : n = 7) : 5 < n ∧ n < 10 := by
  constructor
  · omega
  · omega

/--
trace: case left
n : Nat
h : n = 7
⊢ 5 < n

case right
n : Nat
h : n = 7
⊢ n < 10
-/
#guard_msgs in
example (n : Nat) (h : n = 7) : 5 < n ∧ n < 10 := by
  constructor
  trace_state
  all_goals omega

theorem and_swap (p q : Prop) (h : p ∧ q) : q ∧ p := by
  obtain ⟨hp, hq⟩ := h
  constructor
  · exact hq
  · exact hp

/--
trace: p q : Prop
hp : p
hq : q
⊢ q ∧ p
-/
#guard_msgs in
example (p q : Prop) (h : p ∧ q) : q ∧ p := by
  obtain ⟨hp, hq⟩ := h
  trace_state
  constructor
  · exact hq
  · exact hp

-- Or.
theorem small_or_huge (n : Nat) (h : n = 3) : n < 5 ∨ n > 100 := by
  left
  omega

theorem or_swap (p q : Prop) (h : p ∨ q) : q ∨ p := by
  cases h with
  | inl hp =>
    right
    exact hp
  | inr hq =>
    left
    exact hq

-- Not.
theorem not_below_self (n : Nat) : ¬(n < n) := by
  intro h
  omega

/--
trace: n : Nat
h : n < n
⊢ False
-/
#guard_msgs in
example (n : Nat) : ¬(n < n) := by
  intro h
  trace_state
  omega

theorem from_contradiction (p q : Prop) (hp : p) (hnp : ¬p) : q := by
  contradiction

-- For all.
theorem grows_twice (f : Nat → Nat) (h : ∀ x, f x > x) : f (f 0) > 1 := by
  have h0 := h 0
  have h1 := h (f 0)
  omega

/--
trace: f : Nat → Nat
h : ∀ (x : Nat), f x > x
h0 : f 0 > 0
h1 : f (f 0) > f 0
⊢ f (f 0) > 1
-/
#guard_msgs in
example (f : Nat → Nat) (h : ∀ x, f x > x) : f (f 0) > 1 := by
  have h0 := h 0
  have h1 := h (f 0)
  trace_state
  omega

-- There exists.
theorem exists_square : ∃ n : Nat, n * n = 49 := by
  exists 7

theorem exists_bigger (m : Nat) : ∃ n : Nat, n > m := by
  exists m + 1
  omega

theorem even_of_double (n : Nat) (h : ∃ k, n = 2 * k) : n % 2 = 0 := by
  obtain ⟨k, hk⟩ := h
  omega

/--
trace: n k : Nat
hk : n = 2 * k
⊢ n % 2 = 0
-/
#guard_msgs in
example (n : Nat) (h : ∃ k, n = 2 * k) : n % 2 = 0 := by
  obtain ⟨k, hk⟩ := h
  trace_state
  omega

-- If and only if.
theorem even_iff (n : Nat) : n % 2 = 0 ↔ ∃ k, n = 2 * k := by
  constructor
  · intro h
    exists n / 2
    omega
  · intro h
    obtain ⟨k, hk⟩ := h
    omega

-- A fact on the way.
theorem with_have (f : Nat → Nat) (a : Nat) (h : ∀ x, f x ≤ x) (ha : a < 10) : f (f a) < 10 := by
  have h1 : f a ≤ a := h a
  have h2 : f (f a) ≤ f a := h (f a)
  omega

-- Under the hood: a proof is a value.
theorem and_swap_term (p q : Prop) (h : p ∧ q) : q ∧ p :=
  ⟨h.2, h.1⟩

-- Questions.
/--
trace: case inl
p q : Prop
hp : p
⊢ q ∨ p
-/
#guard_msgs in
example (p q : Prop) (h : p ∨ q) : q ∨ p := by
  cases h with
  | inl hp =>
    trace_state
    right
    exact hp
  | inr hq =>
    left
    exact hq

/--
trace: n : Nat
h : n > 2 ∧ n < 5
⊢ n = 3 ∨ n = 4
-/
#guard_msgs in
example (n : Nat) : n > 2 ∧ n < 5 → n = 3 ∨ n = 4 := by
  intro h
  trace_state
  omega

example : ¬ ∃ n : Nat, n + 1 = 0 := by
  intro h
  obtain ⟨n, hn⟩ := h
  omega

-- The remaining rows of the lesson's table.
theorem all_intro : ∀ n : Nat, n + 0 = n := by
  intro n
  rfl

theorem iff_use (p q : Prop) (h : p ↔ q) (hp : p) : q := by
  obtain ⟨forward, backward⟩ := h
  exact forward hp

example (n : Nat) : n > 2 ∧ n < 5 → n = 3 ∨ n = 4 := by
  intro h
  omega

example : 9 > 5 → 9 > 0 := pos_of_big 9
