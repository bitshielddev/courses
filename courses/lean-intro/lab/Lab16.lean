/-!
# Lab 16 · From proof to running code

Replace every `sorry`, then build this file into a program and run it.

    lean Lab16.lean

prints nothing when the holes are filled. The lesson shows how to build and run the
executable, and how to compare it with Python on random inputs.
-/

/-! ## The verified part

Insertion sort and its specification, from lesson 8. The proofs are complete: this part of
the program is correct for every input. -/

def insertSorted (x : Nat) : List Nat → List Nat
  | [] => [x]
  | y :: rest => if x ≤ y then x :: y :: rest else y :: insertSorted x rest

def insertionSort : List Nat → List Nat
  | [] => []
  | x :: rest => insertSorted x (insertionSort rest)

def Sorted : List Nat → Prop
  | [] => True
  | x :: rest => (∀ y ∈ rest, x ≤ y) ∧ Sorted rest

theorem mem_insertSorted (x y : Nat) (xs : List Nat) : y ∈ insertSorted x xs ↔ y = x ∨ y ∈ xs := by
  induction xs with
  | nil => simp [insertSorted]
  | cons z rest ih => grind [insertSorted]

theorem insertSorted_sorted (x : Nat) (xs : List Nat) (h : Sorted xs) : Sorted (insertSorted x xs) := by
  induction xs with
  | nil => simp [insertSorted, Sorted]
  | cons y rest ih => grind [insertSorted, Sorted, mem_insertSorted]

theorem insertionSort_sorted (xs : List Nat) : Sorted (insertionSort xs) := by
  induction xs with
  | nil => simp [insertionSort, Sorted]
  | cons x rest ih =>
    simp [insertionSort]
    exact insertSorted_sorted x (insertionSort rest) ih

theorem count_insertSorted (v x : Nat) (xs : List Nat) : (insertSorted x xs).count v = (x :: xs).count v := by
  induction xs with
  | nil => simp [insertSorted]
  | cons y rest ih => grind [insertSorted]

theorem count_insertionSort (v : Nat) (xs : List Nat) : (insertionSort xs).count v = xs.count v := by
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [insertionSort, count_insertSorted, List.count_cons, ih]

/-! ## 1. Text in

Turn the command-line arguments into numbers. `String.toNat?` is `some n` for a string of
digits and `none` for anything else. Return `none` if any argument is not a number.
`List.mapM` applies a function that may fail to each element, and stops at the first failure. -/

def parseNumbers (args : List String) : Option (List Nat) :=
  sorry

#guard parseNumbers ["3", "10", "2"] == some [3, 10, 2]
#guard parseNumbers [] == some []
#guard parseNumbers ["3", "x"] == none
#guard parseNumbers ["-1"] == none

/-! ## 2. Text out

The numbers separated by single spaces, with no space at either end. `toString` turns a
number into text, and `" ".intercalate` joins a list of strings with spaces. -/

def render (xs : List Nat) : String :=
  sorry

#guard render [2, 3, 10] == "2 3 10"
#guard render [7] == "7"
#guard render [] == ""

/-! ## 3. The program

`main` is complete. It returns the exit code: 1 when an argument is not a number. -/

def main (args : List String) : IO UInt32 := do
  match parseNumbers args with
  | none =>
    IO.eprintln "usage: sorter NUMBER..."
    return 1
  | some xs =>
    IO.println (render (insertionSort xs))
    return 0

/-! ## 4. One more guarantee

Nothing above says the program prints as many numbers as it was given. Prove it. Both
theorems follow from `count_insertionSort` or need only a short induction of their own. -/

theorem length_insertSorted (x : Nat) (xs : List Nat) : (insertSorted x xs).length = xs.length + 1 := by
  sorry

theorem length_insertionSort (xs : List Nat) : (insertionSort xs).length = xs.length := by
  sorry
