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
  decide

/-! ## 2. Remainders -/

theorem ex2 (a : Nat) (h : a % 6 = 5) : a % 2 = 1 ∧ a % 3 = 2 := by
  omega

/-! ## 3. Lists -/

theorem ex3 (xs ys : List Nat) (x : Nat) : (xs ++ x :: ys).reverse.length = ys.length + xs.length + 1 := by
  simp
  omega

/-! ## 4. An unknown function -/

theorem ex4 (f : Nat → Nat) (a b c : Nat) (h1 : a = b) (h2 : f b = c) : f a + f b = 2 * c := by
  grind

/-! ## 5. A definition with an `if` -/

theorem distance_comm (a b : Nat) : distance a b = distance b a := by
  grind [distance]

/-! ## 6. A product of variables -/

theorem ex6 (a b : Nat) : (a + b) * (a + b) = a * a + b * b + 2 * (a * b) := by
  grind

/-! ## 7. Automation needs a lemma

`grind` knows nothing about `total` and `++` together until you prove it. Prove the first
theorem by induction. The second then needs only a hint. -/

theorem total_append (xs ys : List Nat) : total (xs ++ ys) = total xs + total ys := by
  induction xs with
  | nil => simp [total]
  | cons x rest ih => grind [total]

theorem total_swap (xs ys : List Nat) : total (xs ++ ys) = total (ys ++ xs) := by
  grind [total_append]

/-! ## 8. Induction first, algebra second

The first `n` odd numbers add up to `n * n`. -/

theorem sumOdds_eq (n : Nat) : sumOdds n = n * n := by
  induction n with
  | zero => rfl
  | succ k ih =>
    unfold sumOdds
    grind

/-! ## 9. A bound

A list cannot contain more `true` values than it has elements. -/

theorem countTrue_le (bs : List Bool) : countTrue bs ≤ bs.length := by
  induction bs with
  | nil => simp [countTrue]
  | cons b rest ih => grind [countTrue]

/-! ## 10. Stretch: a false claim

`omega` rejects this, because it is false. Find numbers that break it with `#eval`. Then add
the weakest hypothesis that makes the claim true, and prove it. -/

theorem ex10 (a b c : Nat) (h : c ≤ b) : a + (b - c) = a + b - c := by
  omega
