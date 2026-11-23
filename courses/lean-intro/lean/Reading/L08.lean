/-! Lesson 08 · Saying what correct means. Every piece of Lean quoted in the lesson, in reading order. -/

-- The program.
def insertSorted (x : Nat) : List Nat → List Nat
  | [] => [x]
  | y :: rest => if x ≤ y then x :: y :: rest else y :: insertSorted x rest

def insertionSort : List Nat → List Nat
  | [] => []
  | x :: rest => insertSorted x (insertionSort rest)

/-- info: [0, 1, 2, 3, 3] -/
#guard_msgs in
#eval insertionSort [3, 1, 2, 3, 0]

-- First attempt at a specification: the output is in order.
def Sorted : List Nat → Prop
  | [] => True
  | x :: rest => (∀ y ∈ rest, x ≤ y) ∧ Sorted rest

example : Sorted [1, 2, 2, 5] := by
  simp [Sorted]

example : ¬Sorted [2, 1] := by
  simp [Sorted]

-- A wrong program that meets it.
def lazySort (_ : List Nat) : List Nat :=
  []

theorem lazySort_sorted (xs : List Nat) : Sorted (lazySort xs) := by
  simp [lazySort, Sorted]

-- Second attempt: in order, and the same length.
def zeros (xs : List Nat) : List Nat :=
  xs.map (fun _ => 0)

/-- info: [0, 0, 0] -/
#guard_msgs in
#eval zeros [3, 1, 2]

theorem zeros_sorted (xs : List Nat) : Sorted (zeros xs) := by
  induction xs with
  | nil => simp [zeros, Sorted]
  | cons x rest ih =>
    simp [zeros, Sorted] at *
    exact ih

theorem zeros_length (xs : List Nat) : (zeros xs).length = xs.length := by
  simp [zeros]

-- Third attempt: in order, and every value occurs as often as before.
/-- info: 2 -/
#guard_msgs in
#eval [3, 1, 2, 3, 0].count 3

theorem zeros_wrong : ¬∀ (xs : List Nat) (v : Nat), (zeros xs).count v = xs.count v := by
  intro h
  have h1 := h [1] 1
  simp [zeros] at h1

/--
trace: h : ∀ (xs : List Nat) (v : Nat), List.count v (zeros xs) = List.count v xs
h1 : List.count 1 (zeros [1]) = List.count 1 [1]
⊢ False
-/
#guard_msgs in
example : ¬∀ (xs : List Nat) (v : Nat), (zeros xs).count v = xs.count v := by
  intro h
  have h1 := h [1] 1
  trace_state
  simp [zeros] at h1

-- Proving the first half: the output is in order.
theorem mem_insertSorted (x y : Nat) (xs : List Nat) : y ∈ insertSorted x xs ↔ y = x ∨ y ∈ xs := by
  induction xs with
  | nil => simp [insertSorted]
  | cons z rest ih => grind [insertSorted]

theorem insertSorted_sorted (x : Nat) (xs : List Nat) (h : Sorted xs) : Sorted (insertSorted x xs) := by
  induction xs with
  | nil => simp [insertSorted, Sorted]
  | cons y rest ih =>
    simp [Sorted] at h
    obtain ⟨hy, hrest⟩ := h
    simp [insertSorted]
    split
    · simp [Sorted]
      grind
    · simp [Sorted, mem_insertSorted]
      grind

/--
trace: case cons.isFalse
x y : Nat
rest : List Nat
ih : Sorted rest → Sorted (insertSorted x rest)
hy : ∀ (y_1 : Nat), y_1 ∈ rest → y ≤ y_1
hrest : Sorted rest
h✝ : ¬x ≤ y
⊢ (y ≤ x ∧ ∀ (a : Nat), a ∈ rest → y ≤ a) ∧ Sorted (insertSorted x rest)
-/
#guard_msgs in
example (x : Nat) (xs : List Nat) (h : Sorted xs) : Sorted (insertSorted x xs) := by
  induction xs with
  | nil => simp [insertSorted, Sorted]
  | cons y rest ih =>
    simp [Sorted] at h
    obtain ⟨hy, hrest⟩ := h
    simp [insertSorted]
    split
    · simp [Sorted]
      grind
    · simp [Sorted, mem_insertSorted]
      trace_state
      grind

theorem insertionSort_sorted (xs : List Nat) : Sorted (insertionSort xs) := by
  induction xs with
  | nil => simp [insertionSort, Sorted]
  | cons x rest ih =>
    simp [insertionSort]
    exact insertSorted_sorted x (insertionSort rest) ih

-- Proving the second half: nothing is lost and nothing is invented.
theorem count_insertSorted (v x : Nat) (xs : List Nat) : (insertSorted x xs).count v = (x :: xs).count v := by
  induction xs with
  | nil => simp [insertSorted]
  | cons y rest ih => grind [insertSorted]

theorem count_insertionSort (v : Nat) (xs : List Nat) : (insertionSort xs).count v = xs.count v := by
  induction xs with
  | nil => rfl
  | cons x rest ih => simp [insertionSort, count_insertSorted, List.count_cons, ih]

-- The specification, as one theorem.
theorem insertionSort_correct (xs : List Nat) :
    Sorted (insertionSort xs) ∧ ∀ v, (insertionSort xs).count v = xs.count v := by
  constructor
  · exact insertionSort_sorted xs
  · intro v
    exact count_insertionSort v xs

-- A specification can be tested, too.
def IsMax (m : Nat) (xs : List Nat) : Prop :=
  m ∈ xs ∧ ∀ x ∈ xs, x ≤ m

example : IsMax 3 [1, 3, 2] := by
  unfold IsMax
  decide

example : ¬IsMax 5 [1, 3, 2] := by
  unfold IsMax
  decide

-- Another shape of specification: a round trip.
def encode : List Nat → List (Nat × Nat)
  | [] => []
  | x :: rest =>
    match encode rest with
    | [] => [(x, 1)]
    | (y, n) :: tail => if x = y then (y, n + 1) :: tail else (x, 1) :: (y, n) :: tail

def decode : List (Nat × Nat) → List Nat
  | [] => []
  | (x, n) :: rest => List.replicate n x ++ decode rest

/-- info: [(1, 3), (2, 2), (3, 1)] -/
#guard_msgs in
#eval encode [1, 1, 1, 2, 2, 3]

theorem decode_encode (xs : List Nat) : decode (encode xs) = xs := by
  induction xs with
  | nil => rfl
  | cons x rest ih => grind [encode, decode]

-- Questions.
def dropAll (_ : List Nat) : List Nat :=
  []

theorem dropAll_subset (xs : List Nat) : ∀ v ∈ dropAll xs, v ∈ xs := by
  simp [dropAll]

example : ¬Sorted [1, 3, 2] := by
  simp [Sorted]
