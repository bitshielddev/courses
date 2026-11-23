/-!
# Lab 09 · Types that carry proofs

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab09.lean

Some holes are values and some are proofs. A proof field is filled like any other:
`ok := by omega`. When the fact you need comes from another structure's field, bring it
into view first with `have h := r.ok`.
-/

/-! ## 1. A proof as an argument

The caller promises the array is long enough, and Lean uses the promise to accept `a[2]`. -/

def third (a : Array Nat) (h : a.size > 2) : Nat :=
  a[2]

#guard third #[5, 6, 7, 8] (by decide) == 7

/-! ## 2. A test that leaves a proof behind

`if h : … then … else …` names the result of the test, so it can justify the index. -/

def lastOr (a : Array Nat) (fallback : Nat) : Nat :=
  if h : a.size > 0 then a[a.size - 1] else fallback

#guard lastOr #[5, 6, 7] 0 == 7
#guard lastOr #[] 42 == 42

/-! ## 3. A bounded number

`Fin 12` is a number below 12. Build the next hour on a clock. -/

def nextHour (h : Fin 12) : Fin 12 :=
  ⟨(h.val + 1) % 12, by omega⟩

#guard nextHour 3 == 4
#guard nextHour 11 == 0

/-! ## 4. A structure with an invariant

A range of numbers, with a proof that its ends are the right way round. -/

structure Range where
  lo : Nat
  hi : Nat
  ok : lo ≤ hi

def Range.mid (r : Range) : Nat :=
  r.lo + (r.hi - r.lo) / 2

/-- The midpoint is inside the range. -/
theorem Range.mid_in (r : Range) : r.lo ≤ r.mid ∧ r.mid ≤ r.hi := by
  have h := r.ok
  unfold Range.mid
  omega

/-! ## 5. Build a value that has to satisfy the invariant

The lower half of a range, from `lo` to the midpoint. The `ok` field needs a proof. You
have just proved a theorem that contains it: `r.mid_in.1` is its first half. -/

def Range.lower (r : Range) : Range :=
  { lo := r.lo, hi := r.mid, ok := r.mid_in.1 }

def Range.upper (r : Range) : Range :=
  { lo := r.mid, hi := r.hi, ok := r.mid_in.2 }

#guard (Range.mk 10 20 (by decide)).lower.hi == 15
#guard (Range.mk 10 20 (by decide)).upper.lo == 15

/-! ## 6. A fact that follows from the invariant

The two halves have the widths you expect, and together they make up the whole. -/

def Range.width (r : Range) : Nat :=
  r.hi - r.lo

theorem Range.halves (r : Range) : r.lower.width + r.upper.width = r.width := by
  have h := r.ok
  simp [Range.lower, Range.upper, Range.width, Range.mid]
  omega

/-! ## 7. Equal data means equal values

Take the structure apart with `cases p with | mk v h`. After simplifying, the goal is about
the number alone: the proof fields have gone. -/

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

/-! ## 8. Stretch: an interface that keeps a promise

A sorted list packaged with the proof that it is sorted. The theorems about `insertSorted`
are proved for you. Use them to build values of `SortedList`. -/

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

/-- Every list can be turned into a sorted one, an element at a time. -/
def SortedList.ofList : List Nat → SortedList
  | [] => SortedList.empty
  | x :: rest => (SortedList.ofList rest).insert x

#guard (SortedList.ofList [3, 1, 2]).items == [1, 2, 3]
#guard (SortedList.empty.insert 5).items == [5]
