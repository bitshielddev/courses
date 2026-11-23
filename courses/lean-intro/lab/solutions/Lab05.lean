/-!
# Lab 05 · Equality and rewriting

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab05.lean

Most of these mention an unknown function `f`. Arithmetic cannot see inside `f`, so `omega`
alone will not do: you have to rewrite.
-/

def double (n : Nat) : Nat :=
  n * 2

def triple (n : Nat) : Nat :=
  n + double n

structure Pair where
  first : Nat
  second : Nat

def Pair.swap (p : Pair) : Pair :=
  { first := p.second, second := p.first }

/-! ## 1. Equal by computing -/

theorem ex1 : triple 5 = 15 := by
  rfl

theorem ex1b (p : Pair) : p.swap.swap = p := by
  rfl

/-! ## 2. Rewrite with hypotheses

Rewrite `a` to `b`, then use what you know about `f b`. -/

theorem ex2 (f : Nat → Nat) (a b : Nat) (h1 : a = b) (h2 : f b = 0) : f a + 1 = 1 := by
  rw [h1, h2]

/-! ## 3. Rewrite right to left

The goal mentions `b`, and `h` turns `f a` into `b`. Run it backwards with `←`. -/

theorem ex3 (f : Nat → Nat) (a b : Nat) (h : f a = b) : f (f a) = f b := by
  rw [← h]

/-! ## 4. Rewrite in a hypothesis

Make `h2` talk about `b`, then it is exactly the goal. -/

theorem ex4 (f : Nat → Nat) (a b : Nat) (h1 : a = b) (h2 : f a = 3) : f b = 3 := by
  rw [h1] at h2
  exact h2

/-! ## 5. Prove a lemma, then rewrite with it -/

theorem double_eq (n : Nat) : double n = n + n := by
  unfold double
  omega

theorem triple_eq (n : Nat) : triple n = n + (n + n) := by
  unfold triple
  rw [double_eq]

/-! ## 6. Rewrite with the library

`List.length_reverse` says `xs.reverse.length = xs.length`.
`List.length_append` says `(xs ++ ys).length = xs.length + ys.length`. -/

theorem ex6 (xs ys : List Nat) : (xs ++ ys).reverse.length = xs.length + ys.length := by
  rw [List.length_reverse, List.length_append]

/-! ## 7. Let `simp` find the lemmas -/

theorem ex7 (xs : List Nat) : ([0] ++ xs ++ [0]).reverse.length = xs.length + 2 := by
  simp

/-! ## 8. `simp` with a definition, then arithmetic

`simp [double]` unfolds `double` and tidies up. It leaves arithmetic for `omega`. -/

theorem ex8 (a b : Nat) : double (a + b + 1) = double a + double b + 2 := by
  simp [double]
  omega

/-! ## 9. Simplify a hypothesis

`h` says something about the length of a longer list. Simplify it until `omega` can use it. -/

theorem ex9 (xs ys : List Nat) (h : (xs ++ ys ++ [7]).length = 10) : xs.length ≤ 9 := by
  simp at h
  omega

/-! ## 10. A chain

Fill in the reason for each step. -/

theorem ex10 (f : Nat → Nat) (a b : Nat) (h1 : a = b) (h2 : f b = 2) : double (f a) = 4 := by
  calc double (f a) = double (f b) := by
        rw [h1]
    _ = double 2 := by
        rw [h2]
    _ = 4 := by
        rfl

/-! ## 11. Stretch: cancel a doubling

Rewrite both sides of `h` with your lemma from exercise 5, then finish with arithmetic. -/

theorem ex11 (a b : Nat) (h : double a = double b) : a = b := by
  rw [double_eq, double_eq] at h
  omega
