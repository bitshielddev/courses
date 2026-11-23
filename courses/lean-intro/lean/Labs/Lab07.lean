/-!
# Lab 07 · Automation

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab07.lean

The first six can each be closed by one tactic, sometimes after unfolding a definition.
Choosing it is the exercise: `decide`, `omega`, `simp` or `grind`. Try the wrong ones too, and
read what they say. The rest need a first step from you before automation can finish.
-/

def distance (a b : Nat) : Nat :=
  if a ≥ b then a - b else b - a

def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

def sumOdds : Nat → Nat
  | 0 => 0
  | n + 1 => sumOdds n + (2 * n + 1)

def countTrue : List Bool → Nat
  | [] => 0
  | b :: rest => (if b then 1 else 0) + countTrue rest

/-! ## 1. Nothing but numbers below a bound -/

theorem ex1 : ∀ n < 30, n * n ≠ 200 := by
  --! begin solution
  decide
  --! end solution

/-! ## 2. Remainders -/

theorem ex2 (a : Nat) (h : a % 6 = 5) : a % 2 = 1 ∧ a % 3 = 2 := by
  --! begin solution
  omega
  --! end solution

/-! ## 3. Lists -/

theorem ex3 (xs ys : List Nat) (x : Nat) : (xs ++ x :: ys).reverse.length = ys.length + xs.length + 1 := by
  --! begin solution
  simp
  omega
  --! end solution

/-! ## 4. An unknown function -/

theorem ex4 (f : Nat → Nat) (a b c : Nat) (h1 : a = b) (h2 : f b = c) : f a + f b = 2 * c := by
  --! begin solution
  grind
  --! end solution

/-! ## 5. A definition with an `if` -/

theorem distance_comm (a b : Nat) : distance a b = distance b a := by
  --! begin solution
  grind [distance]
  --! end solution

/-! ## 6. A product of variables -/

theorem ex6 (a b : Nat) : (a + b) * (a + b) = a * a + b * b + 2 * (a * b) := by
  --! begin solution
  grind
  --! end solution

/-! ## 7. Automation needs a lemma

`grind` knows nothing about `total` and `++` together until you prove it. Prove the first
theorem by induction. The second then needs only a hint. -/

theorem total_append (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  --! begin solution
  induction xs with
  | nil => simp [total]
  | cons x rest ih => grind [total]
  --! end solution

theorem total_swap (xs ys : List Nat) : total (xs ++ ys) = total (ys ++ xs) := by
  --! begin solution
  grind [total_append]
  --! end solution

/-! ## 8. Induction first, algebra second

The first `n` odd numbers add up to `n * n`. -/

theorem sumOdds_eq (n : Nat) : sumOdds n = n * n := by
  --! begin solution
  induction n with
  | zero => rfl
  | succ k ih =>
    unfold sumOdds
    grind
  --! end solution

/-! ## 9. A bound

A list cannot contain more `true` values than it has elements. -/

theorem countTrue_le (bs : List Bool) : countTrue bs ≤ bs.length := by
  --! begin solution
  induction bs with
  | nil => simp [countTrue]
  | cons b rest ih => grind [countTrue]
  --! end solution

/-! ## 10. Stretch: a false claim

`omega` rejects this, because it is false. Find numbers that break it with `#eval`. Then add
the weakest hypothesis that makes the claim true, and prove it. -/

--! begin solution
theorem ex10 (a b c : Nat) (h : c ≤ b) : a + (b - c) = a + b - c := by
  omega
--! starter
--! | theorem ex10 (a b c : Nat) : a + (b - c) = a + b - c := by
--! |   sorry
--! end solution
