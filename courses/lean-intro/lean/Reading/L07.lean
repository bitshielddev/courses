/-! Lesson 07 · Automation. Every piece of Lean quoted in the lesson, in reading order. -/

def clamp (lo hi x : Int) : Int :=
  if x < lo then lo
  else if x > hi then hi
  else x

def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

def sumTo : Nat → Nat
  | 0 => 0
  | n + 1 => (n + 1) + sumTo n

-- decide: run it.
example : ∀ n < 10, n * n < 100 := by
  decide

example : (2 : Nat) ^ 64 > 10 ^ 19 := by
  decide

-- omega: linear arithmetic.
example (a b : Nat) (h1 : a % 4 = 3) (h2 : b = a + 1) : b % 4 = 0 := by
  omega

example (a b c : Nat) : a ≤ max a (max b c) := by
  omega

-- omega on a false claim.
/--
error: omega could not prove the goal:
a possible counterexample may satisfy the constraints
  c ≥ 0
where
 c := ↑a
-/
#guard_msgs in
example (a b : Nat) (h : a < b) : a + 2 ≤ b := by
  omega

-- omega meets a product of variables.
/--
error: omega could not prove the goal:
a possible counterexample may satisfy the constraints
  f ≥ 0
  e ≥ 0
  d ≥ 0
  c ≥ 0
  c + d + e - f ≥ 1
where
 c := ↑a * ↑a
 d := ↑(2 * a) * ↑b
 e := ↑b * ↑b
 f := ↑(a + b) * ↑(a + b)
-/
#guard_msgs in
example (a b : Nat) : (a + b) * (a + b) = a * a + 2 * a * b + b * b := by
  omega

example (a b : Nat) : (a + b) * (a + b) = a * a + 2 * a * b + b * b := by
  grind

-- simp: rewrite to a simpler goal.
example (xs ys : List Nat) : (xs ++ [1] ++ ys).length = xs.length + ys.length + 1 := by
  simp
  omega

/--
trace: xs ys : List Nat
⊢ xs.length + (ys.length + 1) = xs.length + ys.length + 1
-/
#guard_msgs in
example (xs ys : List Nat) : (xs ++ [1] ++ ys).length = xs.length + ys.length + 1 := by
  simp
  trace_state
  omega

example (xs ys : List Nat) (h : xs = []) : (xs ++ ys).length = ys.length := by
  simp_all

-- grind: several kinds of reasoning at once.
example (f : Nat → Nat) (a b : Nat) (h1 : f a = b) (h2 : f b = a) : f (f (f a)) = b := by
  grind

theorem clamp_range (lo hi x : Int) (h : lo ≤ hi) : lo ≤ clamp lo hi x ∧ clamp lo hi x ≤ hi := by
  grind [clamp]

example (xs ys : List Nat) : (xs ++ ys).length = (ys ++ xs).length := by
  grind

-- The same theorem by hand, for comparison.
theorem clamp_range_by_hand (lo hi x : Int) (h : lo ≤ hi) : lo ≤ clamp lo hi x ∧ clamp lo hi x ≤ hi := by
  unfold clamp
  split
  · omega
  · split
    · omega
    · omega

-- grind gives up.
/--
error: `grind` failed
case grind
n : Nat
h : n < 5
h_1 : 25 ≤ n * n
⊢ False
[grind] Goal diagnostics
  [facts] Asserted facts
    [prop] n ≤ 4
    [prop] 25 ≤ n * n
  [eqc] True propositions
    [prop] n ≤ 4
    [prop] 25 ≤ n * n
  [ematch] E-matching patterns
    [thm] Nat.pow_pos: [@HPow.hPow `[Nat] `[Nat] `[Nat] `[instHPow] #2 #1]
    [thm] Nat.div_pow_of_pos: [@HPow.hPow `[Nat] `[Nat] `[Nat] `[instHPow] #2 #1]
  [cutsat] Assignment satisfying linear constraints
    [assign] n := 0
    [assign] 「↑n ^ 2」 := 25
-/
#guard_msgs in
example (n : Nat) (h : n < 5) : n * n < 25 := by
  grind

-- No tactic here does induction for you.
-- (Lean's report here is long; the lesson says only that the tactic fails.)
#guard_msgs (drop error) in
example (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  grind [total]

theorem total_append (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  induction xs with
  | nil => simp [total]
  | cons x rest ih => grind [total]

-- A proved theorem becomes a tool for automation.
example (xs ys zs : List Nat) : total (xs ++ ys ++ zs) = total zs + total ys + total xs := by
  grind [total_append]

example (xs ys zs : List Nat) : total (xs ++ ys ++ zs) = total zs + total ys + total xs := by
  simp [total_append]
  omega

-- Induction for the structure, automation for the algebra.
theorem sumTo_formula (n : Nat) : 2 * sumTo n = n * (n + 1) := by
  induction n with
  | zero => rfl
  | succ k ih =>
    unfold sumTo
    grind

/--
trace: case succ
k : Nat
ih : 2 * sumTo k = k * (k + 1)
⊢ 2 * (k + 1 + sumTo k) = (k + 1) * (k + 1 + 1)
-/
#guard_msgs in
example (n : Nat) : 2 * sumTo n = n * (n + 1) := by
  induction n with
  | zero => rfl
  | succ k ih =>
    unfold sumTo
    trace_state
    grind

-- Asking Lean which theorem to use.
/--
info: Try this:
  [apply] exact List.length_append
-/
#guard_msgs in
example (xs ys : List Nat) : (xs ++ ys).length = xs.length + ys.length := by
  exact?

/--
info: Try this:
  [apply] simp only [List.append_assoc, List.cons_append, List.nil_append, List.length_append, List.length_cons]
-/
#guard_msgs in
example (xs ys : List Nat) : (xs ++ [1] ++ ys).length = xs.length + ys.length + 1 := by
  simp?
  omega

/--
info: Try this:
  [apply] grind only
-/
#guard_msgs in
example (f : Nat → Nat) (a b : Nat) (h1 : f a = b) (h2 : f b = a) : f (f (f a)) = b := by
  grind?

-- One tactic for every goal.
inductive Light where
  | red
  | amber
  | green

def Light.next : Light → Light
  | .red => .green
  | .green => .amber
  | .amber => .red

theorem next_cycle (l : Light) : l.next.next.next = l := by
  cases l <;> rfl

-- Questions.
example (a b : Nat) (h : a ≤ b) : a - b = 0 := by
  omega

/--
error: omega could not prove the goal:
a possible counterexample may satisfy the constraints
  e ≥ 0
  d ≥ 0
  d - e ≥ 1
  c ≥ 0
where
 c := ↑b
 d := ↑(f b)
 e := ↑(f a)
-/
#guard_msgs in
example (f : Nat → Nat) (a b : Nat) (h : a = b) : f a = f b := by
  omega

example (f : Nat → Nat) (a b : Nat) (h : a = b) : f a = f b := by
  grind

example : ∃ n < 10, n * n = 49 := by
  decide
