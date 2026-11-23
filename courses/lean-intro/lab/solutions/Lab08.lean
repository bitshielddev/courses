/-!
# Lab 08 · Saying what correct means

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab08.lean

This lab is about statements as much as proofs. In part 2 you write a specification yourself,
and tests tell you whether it says what you meant.
-/

/-! ## Part 1 · A wrong program and a weak specification -/

def Sorted : List Nat → Prop
  | [] => True
  | x :: rest => (∀ y ∈ rest, x ≤ y) ∧ Sorted rest

/-- A "sort" that replaces every element with zero. -/
def zeros (xs : List Nat) : List Nat :=
  xs.map (fun _ => 0)

/-! ### 1. It keeps the length

One half of a specification that sounds reasonable: the output is as long as the input. -/

theorem zeros_length (xs : List Nat) : (zeros xs).length = xs.length := by
  simp [zeros]

/-! ### 2. It does not keep the elements

A claim about every list is refuted by one list. Assume the claim, apply it to a list of
your choice with `have`, and simplify the result into something false. -/

theorem zeros_loses_elements : ¬∀ (xs : List Nat) (v : Nat), (zeros xs).count v = xs.count v := by
  intro h
  have h1 := h [1] 1
  simp [zeros] at h1

/-! ## Part 2 · Write a specification

### 3. State what a maximum is

Say what it means for `m` to be the largest element of `xs`. The three tests below check
your definition: one list where it should hold, and two where it should not. If a test
fails, your statement allows something you did not intend. -/

def IsMax (m : Nat) (xs : List Nat) : Prop :=
  m ∈ xs ∧ ∀ x ∈ xs, x ≤ m

example : IsMax 3 [1, 3, 2] := by
  unfold IsMax
  decide

example : ¬IsMax 5 [1, 3, 2] := by
  unfold IsMax
  decide

example : ¬IsMax 1 [1, 3, 2] := by
  unfold IsMax
  decide

/-! ### 4. A program that meets it

`maxOf_mem` is proved for you. Prove the other half, then put the two together. Your proof
of the last theorem depends on how you wrote `IsMax`. -/

def maxOf : List Nat → Nat
  | [] => 0
  | x :: rest => max x (maxOf rest)

theorem maxOf_mem (xs : List Nat) (h : xs ≠ []) : maxOf xs ∈ xs := by
  induction xs with
  | nil => contradiction
  | cons y rest ih =>
    cases rest with
    | nil => simp [maxOf]
    | cons z rest' =>
      have h1 := ih (by simp)
      grind [maxOf]

theorem maxOf_ge (xs : List Nat) : ∀ x ∈ xs, x ≤ maxOf xs := by
  induction xs with
  | nil => simp
  | cons y rest ih =>
    simp [maxOf]
    grind

theorem maxOf_isMax (xs : List Nat) (h : xs ≠ []) : IsMax (maxOf xs) xs := by
  constructor
  · exact maxOf_mem xs h
  · exact maxOf_ge xs

/-! ## Part 3 · Finish the sorting proof

The lesson proved that insertion sort returns a list in order. That half is repeated here.
You prove the other half: every value occurs as often in the output as in the input. -/

def insertSorted (x : Nat) : List Nat → List Nat
  | [] => [x]
  | y :: rest => if x ≤ y then x :: y :: rest else y :: insertSorted x rest

def insertionSort : List Nat → List Nat
  | [] => []
  | x :: rest => insertSorted x (insertionSort rest)

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

/-! ### 5. Inserting adds exactly one element -/

theorem count_insertSorted (v x : Nat) (xs : List Nat) : (insertSorted x xs).count v = (x :: xs).count v := by
  induction xs with
  | nil => simp [insertSorted]
  | cons y rest ih => grind [insertSorted]

/-! ### 6. Sorting keeps every count

Use the theorem you just proved. `List.count_cons` says how `count` treats `x :: rest`. -/

theorem count_insertionSort (v : Nat) (xs : List Nat) : (insertionSort xs).count v = xs.count v := by
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [insertionSort, count_insertSorted, List.count_cons, ih]

/-! ### 7. The whole specification -/

theorem insertionSort_correct (xs : List Nat) :
    Sorted (insertionSort xs) ∧ ∀ v, (insertionSort xs).count v = xs.count v := by
  constructor
  · exact insertionSort_sorted xs
  · intro v
    exact count_insertionSort v xs

/-! ## Part 4 · Stretch: a round trip

Run-length encoding stores each run of equal values once, with its length. The natural
specification is that decoding gives back what was encoded. -/

def encode : List Nat → List (Nat × Nat)
  | [] => []
  | x :: rest =>
    match encode rest with
    | [] => [(x, 1)]
    | (y, n) :: tail => if x = y then (y, n + 1) :: tail else (x, 1) :: (y, n) :: tail

def decode : List (Nat × Nat) → List Nat
  | [] => []
  | (x, n) :: rest => List.replicate n x ++ decode rest

#guard encode [1, 1, 1, 2, 2, 3] == [(1, 3), (2, 2), (3, 1)]
#guard decode [(1, 3), (2, 2), (3, 1)] == [1, 1, 1, 2, 2, 3]

theorem decode_encode (xs : List Nat) : decode (encode xs) = xs := by
  induction xs with
  | nil => rfl
  | cons x rest ih => grind [encode, decode]
