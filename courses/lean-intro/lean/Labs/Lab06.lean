/-!
# Lab 06 · Induction

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab06.lean

Every proof here starts with `induction … with` and has one case for the empty value and one
for a value with one more piece. In the second case, look at the goal panel for the induction
hypothesis before you do anything else.
-/

def countdown : Nat → List Nat
  | 0 => []
  | n + 1 => (n + 1) :: countdown n

def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

def join {α : Type} : List α → List α → List α
  | [], ys => ys
  | x :: xs, ys => x :: join xs ys

def evens : List Nat → List Nat
  | [] => []
  | x :: rest => if x % 2 = 0 then x :: evens rest else evens rest

def slowRev {α : Type} : List α → List α
  | [] => []
  | x :: rest => slowRev rest ++ [x]

def rev {α : Type} (xs : List α) : List α :=
  go [] xs
where
  go (acc : List α) : List α → List α
    | [] => acc
    | x :: rest => go (x :: acc) rest

/-! ## 1. Induction on a number -/

theorem countdown_length (n : Nat) : (countdown n).length = n := by
  --! begin solution
  induction n with
  | zero => rfl
  | succ k ih => simp [countdown, ih]
  --! end solution

/-! ## 2. Induction on a list

`join xs []` computes nothing useful until `xs` is taken apart, so induct on `xs`. -/

theorem join_nil {α : Type} (xs : List α) : join xs [] = xs := by
  --! begin solution
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [join, ih]
  --! end solution

/-! ## 3. Lengths add up -/

theorem length_join {α : Type} (xs ys : List α) : (join xs ys).length = xs.length + ys.length := by
  --! begin solution
  induction xs with
  | nil => simp [join]
  | cons x rest ih =>
    simp [join, ih]
    omega
  --! end solution

/-! ## 4. Three lists

There are three lists to choose from. `join` recurses on its first argument, so that is the
one to induct on. -/

theorem join_assoc {α : Type} (xs ys zs : List α) : join (join xs ys) zs = join xs (join ys zs) := by
  --! begin solution
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [join, ih]
  --! end solution

/-! ## 5. A function applied to every element -/

theorem total_map_double (xs : List Nat) : total (xs.map (· * 2)) = 2 * total xs := by
  --! begin solution
  induction xs with
  | nil => rfl
  | cons x rest ih =>
    simp [total, ih]
    omega
  --! end solution

/-! ## 6. An `if` in the goal

After `simp [evens]` the goal contains an `if`. `split` gives one goal for each branch. -/

theorem total_evens_le (xs : List Nat) : total (evens xs) ≤ total xs := by
  --! begin solution
  induction xs with
  | nil => simp [evens, total]
  | cons x rest ih =>
    simp [evens]
    split
    · simp [total]
      omega
    · simp [total]
      omega
  --! end solution

/-! ## 7. An accumulator

State how `rev.go` relates to `slowRev` for **every** accumulator, and prove that with
`generalizing`. Then the theorem about `rev` is one line. -/

theorem rev_go {α : Type} (acc xs : List α) : rev.go acc xs = slowRev xs ++ acc := by
  --! begin solution
  induction xs generalizing acc with
  | nil => simp [rev.go, slowRev]
  | cons x rest ih => simp [rev.go, slowRev, ih]
  --! end solution

theorem rev_eq {α : Type} (xs : List α) : rev xs = slowRev xs := by
  --! begin solution
  simp [rev, rev_go]
  --! end solution

/-! ## 8. Stretch: find the lemma

Try the second theorem first, and see where you get stuck. The goal you are left with tells
you what the first theorem should say. Replace `True` with that statement, prove it, and use it. -/

--! begin solution
theorem slowRev_join {α : Type} (xs ys : List α) : slowRev (xs ++ ys) = slowRev ys ++ slowRev xs := by
  induction xs with
  | nil => simp [slowRev]
  | cons x rest ih => simp [slowRev, ih]
--! starter
--! | theorem slowRev_join {α : Type} (xs ys : List α) : True := by
--! |   sorry
--! end solution

theorem slowRev_slowRev {α : Type} (xs : List α) : slowRev (slowRev xs) = xs := by
  --! begin solution
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [slowRev, slowRev_join, ih]
  --! end solution
