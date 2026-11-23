/-!
# Lab 03 · Recursion and termination

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab03.lean

Where a definition ends in `| _ => sorry`, replace that line with your own cases.
-/

/-! ## 1. Recursion on a number

`factorial 5` is `5 * 4 * 3 * 2 * 1`, and `factorial 0` is `1`. -/

def factorial : Nat → Nat
  --! begin solution
  | 0 => 1
  | n + 1 => (n + 1) * factorial n
  --! starter
  --! | | _ => sorry
  --! end solution

#guard factorial 0 == 1
#guard factorial 5 == 120

/-! ## 2. Recursion on the second argument

`power b n` is `b` multiplied by itself `n` times. -/

def power (b : Nat) : Nat → Nat
  --! begin solution
  | 0 => 1
  | n + 1 => b * power b n
  --! starter
  --! | | _ => sorry
  --! end solution

#guard power 2 10 == 1024
#guard power 7 0 == 1
#guard power 0 3 == 0

/-! ## 3. Facts by computing

Both functions are structurally recursive, so `decide` can run them. -/

theorem factorial_5 : factorial 5 = 120 := by
  --! begin solution
  decide
  --! end solution

theorem power_2_10 : power 2 10 = 1024 := by
  --! begin solution
  decide
  --! end solution

/-! ## 4. Recursion on a list

Keep the even numbers, in order. Write the recursion yourself. Do not call `filter`. -/

def evens : List Nat → List Nat
  --! begin solution
  | [] => []
  | x :: rest => if x % 2 = 0 then x :: evens rest else evens rest
  --! starter
  --! | | _ => sorry
  --! end solution

#guard evens [1, 2, 3, 4, 6] == [2, 4, 6]
#guard evens [1, 3] == []
#guard evens [] == []

/-! ## 5. An accumulator

Reverse a list. `go` carries the part reversed so far. -/

def rev {α : Type} (xs : List α) : List α :=
  go [] xs
where
  go (acc : List α) : List α → List α
    --! begin solution
    | [] => acc
    | x :: rest => go (x :: acc) rest
    --! starter
    --! | | _ => sorry
    --! end solution

#guard rev [1, 2, 3] == [3, 2, 1]
#guard rev ([] : List Nat) == []
#guard rev ["a", "b"] == ["b", "a"]

/-! ## 6. Recursion that is not on a smaller piece

`halvings n` is the list `n, n / 2, n / 4, …` down to 1. It is empty for 0.
Lean finds the measure itself. -/

def halvings (n : Nat) : List Nat :=
  --! begin solution
  if n = 0 then [] else n :: halvings (n / 2)
  --! end solution

#guard halvings 10 == [10, 5, 2, 1]
#guard halvings 1 == [1]
#guard halvings 0 == []

/-! ## 7. Name the measure

Take one element from each list in turn, starting with the first list. When one runs out,
the rest of the other follows. The natural way to write this swaps the two lists in the
recursive call, and then Lean needs a `termination_by` line from you. -/

--! begin solution
def alternate {α : Type} : List α → List α → List α
  | [], ys => ys
  | x :: xs, ys => x :: alternate ys xs
termination_by xs ys => xs.length + ys.length
--! starter
--! | def alternate {α : Type} : List α → List α → List α
--! |   | _, _ => sorry
--! end solution

#guard alternate [1, 2, 3] [10, 20] == [1, 10, 2, 20, 3]
#guard alternate [] [5, 6] == [5, 6]
#guard alternate [5, 6] [] == [5, 6]

/-! ## 8. Stretch: fuel

Count the steps the Collatz process takes to reach 1 from `n`: halve an even number, and
replace an odd `n` by `3 * n + 1`. Nobody has proved that this always ends, so recurse on a
budget instead. Return `none` when the budget runs out. -/

def collatz : Nat → Nat → Option Nat
  --! begin solution
  | 0, _ => none
  | fuel + 1, n =>
    if n ≤ 1 then some 0
    else if n % 2 = 0 then (collatz fuel (n / 2)).map (· + 1)
    else (collatz fuel (3 * n + 1)).map (· + 1)
  --! starter
  --! | | _, _ => sorry
  --! end solution

#guard collatz 1000 1 == some 0
#guard collatz 1000 6 == some 8
#guard collatz 1000 27 == some 111
#guard collatz 50 27 == none
