/-! Lesson 09 · Types that carry proofs. Every piece of Lean quoted in the lesson, in reading order. -/

-- Indexing needs a proof.
/--
error: failed to prove index is valid, possible solutions:
  - Use `have`-expressions to prove the index is valid
  - Use `a[i]!` notation instead, runtime check is performed, and 'Panic' error message is produced if index is not valid
  - Use `a[i]?` notation instead, result is an `Option` type
  - Use `a[i]'h` notation instead, where `h` is a proof that index is valid
a : Array Nat
i : Nat
⊢ i < a.size
-/
#guard_msgs in
def pick (a : Array Nat) (i : Nat) : Nat :=
  a[i]

-- Three ways to supply it.
def firstTwo (a : Array Nat) (h : a.size ≥ 2) : Nat :=
  a[0] + a[1]

/-- info: 30 -/
#guard_msgs in
#eval firstTwo #[10, 20, 30] (by decide)

def getOr (a : Array Nat) (i fallback : Nat) : Nat :=
  if h : i < a.size then a[i] else fallback

/-- info: 20 -/
#guard_msgs in
#eval getOr #[10, 20, 30] 1 0

/-- info: 0 -/
#guard_msgs in
#eval getOr #[10, 20, 30] 9 0

-- A number that is known to be small enough.
def pickFin (a : Array Nat) (i : Fin a.size) : Nat :=
  a[i]

def nextSlot (i : Fin 4) : Fin 4 :=
  ⟨(i.val + 1) % 4, by omega⟩

/-- info: 0 -/
#guard_msgs in
#eval nextSlot 3

-- A value packaged with a fact about it.
def Pos : Type :=
  { n : Nat // n > 0 }

def five : Pos :=
  ⟨5, by decide⟩

def safeDiv (a : Nat) (b : Pos) : Nat :=
  a / b.val

/-- info: 3 -/
#guard_msgs in
#eval safeDiv 17 five

/--
error: Tactic `decide` proved that the proposition
  0 > 0
is false
-/
#guard_msgs in
def zero : Pos :=
  ⟨0, by decide⟩

theorem safeDiv_le (a : Nat) (b : Pos) : safeDiv a b ≤ a := by
  unfold safeDiv
  exact Nat.div_le_self a b.val

-- A structure with an invariant.
structure Range where
  lo : Nat
  hi : Nat
  ok : lo ≤ hi

def tenToTwenty : Range :=
  { lo := 10, hi := 20, ok := by decide }

/--
error: Tactic `decide` proved that the proposition
  20 ≤ 10
is false
-/
#guard_msgs in
def backwards : Range :=
  { lo := 20, hi := 10, ok := by decide }

def Range.width (r : Range) : Nat :=
  r.hi - r.lo

theorem Range.lo_add_width (r : Range) : r.lo + r.width = r.hi := by
  have h := r.ok
  unfold Range.width
  omega

/--
trace: r : Range
h : r.lo ≤ r.hi
⊢ r.lo + (r.hi - r.lo) = r.hi
-/
#guard_msgs in
example (r : Range) : r.lo + r.width = r.hi := by
  have h := r.ok
  unfold Range.width
  trace_state
  omega

def Range.shift (r : Range) (d : Nat) : Range :=
  { lo := r.lo + d, hi := r.hi + d, ok := by have h := r.ok; omega }

theorem Range.shift_width (r : Range) (d : Nat) : (r.shift d).width = r.width := by
  simp [Range.shift, Range.width]
  omega

-- Two values are equal when their data is equal. The proofs never matter.
structure Percent where
  value : Nat
  ok : value ≤ 100

def Percent.complement (p : Percent) : Percent :=
  { value := 100 - p.value, ok := by omega }

theorem Percent.complement_complement (p : Percent) : p.complement.complement = p := by
  cases p with
  | mk v h =>
    simp [Percent.complement]
    omega

/--
trace: case mk
v : Nat
h : v ≤ 100
⊢ 100 - (100 - v) = v
-/
#guard_msgs in
example (p : Percent) : p.complement.complement = p := by
  cases p with
  | mk v h =>
    simp [Percent.complement]
    trace_state
    omega

-- A list that cannot be out of order.
def Sorted : List Nat → Prop
  | [] => True
  | x :: rest => (∀ y ∈ rest, x ≤ y) ∧ Sorted rest

def insertSorted (x : Nat) : List Nat → List Nat
  | [] => [x]
  | y :: rest => if x ≤ y then x :: y :: rest else y :: insertSorted x rest

theorem mem_insertSorted (x y : Nat) (xs : List Nat) : y ∈ insertSorted x xs ↔ y = x ∨ y ∈ xs := by
  induction xs with
  | nil => simp [insertSorted]
  | cons z rest ih => grind [insertSorted]

theorem insertSorted_sorted (x : Nat) (xs : List Nat) (h : Sorted xs) : Sorted (insertSorted x xs) := by
  induction xs with
  | nil => simp [insertSorted, Sorted]
  | cons y rest ih => grind [insertSorted, Sorted, mem_insertSorted]

structure SortedList where
  items : List Nat
  sorted : Sorted items

def SortedList.empty : SortedList :=
  { items := [], sorted := by simp [Sorted] }

def SortedList.insert (s : SortedList) (x : Nat) : SortedList :=
  { items := insertSorted x s.items, sorted := insertSorted_sorted x s.items s.sorted }

/-- info: [1, 2, 3] -/
#guard_msgs in
#eval ((SortedList.empty.insert 3).insert 1 |>.insert 2).items

-- The length in the type.
def dot {n : Nat} (a b : Vector Nat n) : Nat :=
  (a.zipWith (· * ·) b).sum

/-- info: 32 -/
#guard_msgs in
#eval dot #v[1, 2, 3] #v[4, 5, 6]

/--
error: Application type mismatch: The argument
  #v[4, 5]
has type
  Vector Nat 2
but is expected to have type
  Vector Nat 3
in the application
  dot #v[1, 2, 3] #v[4, 5]
-/
#guard_msgs in
#check dot #v[1, 2, 3] #v[4, 5]

-- Questions.
def middle (a : Array Nat) (h : a.size > 0) : Nat :=
  a[a.size / 2]

/-- info: 30 -/
#guard_msgs in
#eval middle #[10, 20, 30, 40] (by decide)
