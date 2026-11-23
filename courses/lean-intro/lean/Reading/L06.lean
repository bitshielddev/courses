/-! Lesson 06 · Induction. Every piece of Lean quoted in the lesson, in reading order. -/

def twice : Nat → Nat
  | 0 => 0
  | n + 1 => twice n + 2

-- Case analysis alone gets stuck.
/--
trace: case succ
k : Nat
⊢ twice k + 2 = 2 * (k + 1)
---
warning: declaration uses `sorry`
-/
#guard_msgs in
example (n : Nat) : twice n = 2 * n := by
  cases n with
  | zero => rfl
  | succ k =>
    unfold twice
    trace_state
    sorry

-- Induction supplies the missing fact.
theorem twice_eq (n : Nat) : twice n = 2 * n := by
  induction n with
  | zero => rfl
  | succ k ih =>
    unfold twice
    omega

/--
trace: case succ
k : Nat
ih : twice k = 2 * k
⊢ twice k + 2 = 2 * (k + 1)
-/
#guard_msgs in
example (n : Nat) : twice n = 2 * n := by
  induction n with
  | zero => rfl
  | succ k ih =>
    unfold twice
    trace_state
    omega

-- Induction on a list.
def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

theorem total_append (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  induction xs with
  | nil => simp [total]
  | cons x rest ih =>
    simp [total, ih]
    omega

/--
trace: case cons
ys : List Nat
x : Nat
rest : List Nat
ih : total (rest ++ ys) = total rest + total ys
⊢ total (x :: rest ++ ys) = total (x :: rest) + total ys
---
trace: case cons
ys : List Nat
x : Nat
rest : List Nat
ih : total (rest ++ ys) = total rest + total ys
⊢ x + (total rest + total ys) = x + total rest + total ys
-/
#guard_msgs in
example (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  induction xs with
  | nil => simp [total]
  | cons x rest ih =>
    trace_state
    simp [total, ih]
    trace_state
    omega

-- A goal with an `if` in it.
def evens : List Nat → List Nat
  | [] => []
  | x :: rest => if x % 2 = 0 then x :: evens rest else evens rest

theorem evens_length (xs : List Nat) : (evens xs).length ≤ xs.length := by
  induction xs with
  | nil => simp [evens]
  | cons x rest ih =>
    simp [evens]
    split
    · simp
      omega
    · omega

/--
trace: case cons
x : Nat
rest : List Nat
ih : (evens rest).length ≤ rest.length
⊢ (if x % 2 = 0 then x :: evens rest else evens rest).length ≤ rest.length + 1
---
trace: case cons.isTrue
x : Nat
rest : List Nat
ih : (evens rest).length ≤ rest.length
h✝ : x % 2 = 0
⊢ (x :: evens rest).length ≤ rest.length + 1
-/
#guard_msgs in
example (xs : List Nat) : (evens xs).length ≤ xs.length := by
  induction xs with
  | nil => simp [evens]
  | cons x rest ih =>
    simp [evens]
    trace_state
    split
    · trace_state
      simp
      omega
    · omega

-- An accumulator needs a stronger claim.
def totalFast (xs : List Nat) : Nat :=
  go 0 xs
where
  go (acc : Nat) : List Nat → Nat
    | [] => acc
    | x :: rest => go (acc + x) rest

/--
trace: case cons
acc x : Nat
rest : List Nat
ih : totalFast.go acc rest = acc + total rest
⊢ totalFast.go (acc + x) rest = acc + (x + total rest)
---
warning: declaration uses `sorry`
-/
#guard_msgs in
example (acc : Nat) (xs : List Nat) : totalFast.go acc xs = acc + total xs := by
  induction xs with
  | nil => simp [totalFast.go, total]
  | cons x rest ih =>
    simp [totalFast.go, total]
    trace_state
    sorry

theorem go_eq (acc : Nat) (xs : List Nat) : totalFast.go acc xs = acc + total xs := by
  induction xs generalizing acc with
  | nil => simp [totalFast.go, total]
  | cons x rest ih =>
    simp [totalFast.go, total, ih]
    omega

/--
trace: case cons
x : Nat
rest : List Nat
ih : ∀ (acc : Nat), totalFast.go acc rest = acc + total rest
acc : Nat
⊢ totalFast.go (acc + x) rest = acc + (x + total rest)
-/
#guard_msgs in
example (acc : Nat) (xs : List Nat) : totalFast.go acc xs = acc + total xs := by
  induction xs generalizing acc with
  | nil => simp [totalFast.go, total]
  | cons x rest ih =>
    simp [totalFast.go, total]
    trace_state
    simp [ih]
    omega

theorem totalFast_eq (xs : List Nat) : totalFast xs = total xs := by
  simp [totalFast, go_eq]

-- When you are stuck, state the lemma you need.
def slowRev {α : Type} : List α → List α
  | [] => []
  | x :: rest => slowRev rest ++ [x]

/--
trace: case cons
α : Type
x : α
rest : List α
ih : slowRev (slowRev rest) = rest
⊢ slowRev (slowRev rest ++ [x]) = x :: rest
---
warning: declaration uses `sorry`
-/
#guard_msgs in
example {α : Type} (xs : List α) : slowRev (slowRev xs) = xs := by
  induction xs with
  | nil => rfl
  | cons x rest ih =>
    simp [slowRev]
    trace_state
    sorry

theorem slowRev_snoc {α : Type} (xs : List α) (x : α) : slowRev (xs ++ [x]) = x :: slowRev xs := by
  induction xs with
  | nil => rfl
  | cons y rest ih => simp [slowRev, ih]

theorem slowRev_slowRev {α : Type} (xs : List α) : slowRev (slowRev xs) = xs := by
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [slowRev, slowRev_snoc, ih]

-- Induction that follows the function.
def countUp (lo hi : Nat) : List Nat :=
  if lo < hi then lo :: countUp (lo + 1) hi else []

theorem countUp_length (lo hi : Nat) : (countUp lo hi).length = hi - lo := by
  fun_induction countUp lo hi with
  | case1 lo h ih =>
    simp [ih]
    omega
  | case2 lo h =>
    simp
    omega

/--
trace: case case1
hi lo : Nat
h : lo < hi
ih : (countUp (lo + 1) hi).length = hi - (lo + 1)
⊢ (lo :: countUp (lo + 1) hi).length = hi - lo
---
trace: case case2
hi lo : Nat
h : ¬lo < hi
⊢ [].length = hi - lo
-/
#guard_msgs in
example (lo hi : Nat) : (countUp lo hi).length = hi - lo := by
  fun_induction countUp lo hi with
  | case1 lo h ih =>
    trace_state
    simp [ih]
    omega
  | case2 lo h =>
    trace_state
    simp
    omega

-- Questions.
/--
trace: case cons
x : Nat
rest : List Nat
ih : (List.map (fun x => x + 1) rest).length = rest.length
⊢ (List.map (fun x => x + 1) (x :: rest)).length = (x :: rest).length
-/
#guard_msgs in
example (xs : List Nat) : (xs.map (· + 1)).length = xs.length := by
  induction xs with
  | nil => rfl
  | cons x rest ih =>
    trace_state
    simp
