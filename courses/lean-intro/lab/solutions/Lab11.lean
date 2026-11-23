/-!
# Lab 11 · Loops and mutable variables

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab11.lean

Write each function as a loop: `Id.run do`, a `let mut`, a `for`, and a `return`. The tests
say what it should compute.
-/

/-! ## 1. A running total

The product of the numbers in a list. The product of no numbers is 1. -/

def product (xs : List Nat) : Nat :=
  Id.run do
    let mut result := 1
    for x in xs do
      result := result * x
    return result

#guard product [2, 3, 4] == 24
#guard product [] == 1

/-! ## 2. A condition in the loop

How many elements are zero. -/

def countZeros (xs : List Nat) : Nat :=
  Id.run do
    let mut count := 0
    for x in xs do
      if x = 0 then count := count + 1
    return count

#guard countZeros [0, 3, 0, 0, 5] == 3
#guard countZeros [1, 2] == 0

/-! ## 3. Two variables

The smallest and the largest element, as a pair. For the empty list, return `(0, 0)`. -/

def minMax (xs : List Nat) : Nat × Nat :=
  Id.run do
    match xs with
    | [] => return (0, 0)
    | first :: rest =>
      let mut lo := first
      let mut hi := first
      for x in rest do
        if x < lo then lo := x
        if x > hi then hi := x
      return (lo, hi)

#guard minMax [3, 9, 1, 4] == (1, 9)
#guard minMax [7] == (7, 7)
#guard minMax [] == (0, 0)

/-! ## 4. Leaving early

The first element greater than `limit`, if there is one. -/

def firstAbove (xs : List Nat) (limit : Nat) : Option Nat :=
  Id.run do
    for x in xs do
      if x > limit then return some x
    return none

#guard firstAbove [1, 5, 9, 7] 4 == some 5
#guard firstAbove [1, 2] 4 == none

/-! ## 5. A range

The sum of `i * i` for `i` from 0 up to, and not including, `n`. -/

def sumSquares (n : Nat) : Nat :=
  Id.run do
    let mut total := 0
    for i in [0:n] do
      total := total + i * i
    return total

#guard sumSquares 4 == 14
#guard sumSquares 0 == 0

/-! ## 6. Building an array

The elements of `xs` that are even, in order, as an array. -/

def evensArray (xs : List Nat) : Array Nat :=
  Id.run do
    let mut out := #[]
    for x in xs do
      if x % 2 = 0 then out := out.push x
    return out

#guard evensArray [1, 2, 3, 4, 6] == #[2, 4, 6]
#guard evensArray [1] == #[]

/-! ## 7. A loop is a function

Your `product` is an ordinary function, so facts about it can be proved. The first is
settled by running it. The second says what the loop really is: `simp` unfolds your loop
into a fold, which is what the right-hand side is. -/

theorem product_234 : product [2, 3, 4] = 24 := by
  decide

theorem product_is_fold (xs : List Nat) : product xs = xs.foldl (· * ·) 1 := by
  simp [product]

/-! ## 8. Stopping at the first missing value

The sum of the elements at positions `i` and `j`, or `none` if either position is out of
range. Use `←` inside a `do` block, with no `Id.run`: the block is an `Option`. -/

def sumAt (xs : List Nat) (i j : Nat) : Option Nat :=
  do
    let a ← xs[i]?
    let b ← xs[j]?
    return a + b

#guard sumAt [10, 20, 30] 0 2 == some 40
#guard sumAt [10, 20, 30] 0 5 == none
#guard sumAt [10, 20, 30] 7 1 == none

/-! ## 9. Stretch: failure with a reason

Parse a percentage. `s.toNat?` is `some n` when the string is a natural number. Return the
number when it is at most 100, and otherwise an error message that the tests accept. -/

def parsePercent (s : String) : Except String Nat :=
  match s.toNat? with
  | none => throw "not a number"
  | some n => if n ≤ 100 then pure n else throw "too large"

/-- Turns a result into text, so that the tests can compare it. -/
def describe (r : Except String Nat) : String :=
  match r with
  | .ok n => s!"ok {n}"
  | .error e => s!"error: {e}"

#guard describe (parsePercent "42") == "ok 42"
#guard describe (parsePercent "100") == "ok 100"
#guard describe (parsePercent "250") == "error: too large"
#guard describe (parsePercent "abc") == "error: not a number"
