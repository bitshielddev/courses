/-! Lesson 16 · From proof to running code. Every piece of Lean quoted in the lesson, in reading order. -/

-- The verified part: the program and its specification, from lesson 8.
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

-- The unverified part: text in, text out.
def parseNumbers (args : List String) : Option (List Nat) :=
  args.mapM String.toNat?

def render (xs : List Nat) : String :=
  " ".intercalate (xs.map toString)

/-- info: some [3, 10, 2] -/
#guard_msgs in
#eval parseNumbers ["3", "10", "2"]

/-- info: none -/
#guard_msgs in
#eval parseNumbers ["3", "x"]

/-- info: "2 3 10" -/
#guard_msgs in
#eval render [2, 3, 10]

def main (args : List String) : IO UInt32 := do
  match parseNumbers args with
  | none =>
    IO.eprintln "usage: sorter NUMBER..."
    return 1
  | some xs =>
    IO.println (render (insertionSort xs))
    return 0

/--
info: 2 3 10
---
info: 0
-/
#guard_msgs in
#eval main ["3", "10", "2"]

-- A fact about the unverified part that is worth having.
theorem render_single (n : Nat) : render [n] = toString n := by
  simp [render]
