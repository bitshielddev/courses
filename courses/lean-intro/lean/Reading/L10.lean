/-! Lesson 10 · Case study: binary search. Every piece of Lean quoted in the lesson, in reading order. -/

-- The program.
def bisect (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) : Nat :=
  if hlt : lo < hi then
    let mid := lo + (hi - lo) / 2
    if a[mid] < x then bisect a x (mid + 1) hi h
    else bisect a x lo mid (by omega)
  else lo
termination_by hi - lo

def bisectLeft (a : Array Nat) (x : Nat) : Nat :=
  bisect a x 0 a.size (Nat.le_refl _)

/-- info: 1 -/
#guard_msgs in
#eval bisectLeft #[1, 3, 3, 5, 8] 3

/-- info: 3 -/
#guard_msgs in
#eval bisectLeft #[1, 3, 3, 5, 8] 4

/-- info: 5 -/
#guard_msgs in
#eval bisectLeft #[1, 3, 3, 5, 8] 9

/-- info: 0 -/
#guard_msgs in
#eval bisectLeft #[] 9

-- The two facts Lean proved for itself while accepting the definition.
example (lo hi size : Nat) (hlt : lo < hi) (h : hi ≤ size) : lo + (hi - lo) / 2 < size := by
  omega

example (lo hi : Nat) (hlt : lo < hi) : hi - (lo + (hi - lo) / 2 + 1) < hi - lo := by
  omega

example (lo hi : Nat) (hlt : lo < hi) : lo + (hi - lo) / 2 - lo < hi - lo := by
  omega

-- The specification.
def SortedArray (a : Array Nat) : Prop :=
  ∀ i j (hi : i < a.size) (hj : j < a.size), i ≤ j → a[i] ≤ a[j]

-- A first property: the answer stays in the range.
theorem bisect_range (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) (hle : lo ≤ hi) :
    lo ≤ bisect a x lo hi h ∧ bisect a x lo hi h ≤ hi := by
  fun_induction bisect a x lo hi h with
  | case1 lo hi h hlt mid hmid ih =>
    have h1 := ih (by omega)
    omega
  | case2 lo hi h hlt mid hmid ih =>
    have h1 := ih (by omega)
    omega
  | case3 lo hi h hlt => omega

/--
trace: case case1
a : Array Nat
x hi✝ lo hi : Nat
h : hi ≤ a.size
hlt : lo < hi
mid : Nat := lo + (hi - lo) / 2
hmid : a[mid] < x
ih : mid + 1 ≤ hi → mid + 1 ≤ bisect a x (mid + 1) hi h ∧ bisect a x (mid + 1) hi h ≤ hi
hle : lo ≤ hi
⊢ lo ≤ bisect a x (mid + 1) hi h ∧ bisect a x (mid + 1) hi h ≤ hi
---
trace: case case3
a : Array Nat
x hi✝ lo hi : Nat
h : hi ≤ a.size
hlt : ¬lo < hi
hle : lo ≤ hi
⊢ lo ≤ lo ∧ lo ≤ hi
-/
#guard_msgs in
example (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) (hle : lo ≤ hi) :
    lo ≤ bisect a x lo hi h ∧ bisect a x lo hi h ≤ hi := by
  fun_induction bisect a x lo hi h with
  | case1 lo hi h hlt mid hmid ih =>
    trace_state
    have h1 := ih (by omega)
    omega
  | case2 lo hi h hlt mid hmid ih =>
    have h1 := ih (by omega)
    omega
  | case3 lo hi h hlt =>
    trace_state
    omega

-- The invariant, and the theorem that it is maintained.
theorem bisect_spec (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) (hle : lo ≤ hi)
    (hs : SortedArray a)
    (below : ∀ i (hi' : i < a.size), i < lo → a[i] < x)
    (above : ∀ i (hi' : i < a.size), hi ≤ i → x ≤ a[i]) :
    (∀ i (_ : i < a.size), i < bisect a x lo hi h → a[i] < x) ∧
    (∀ i (_ : i < a.size), bisect a x lo hi h ≤ i → x ≤ a[i]) := by
  fun_induction bisect a x lo hi h with
  | case1 lo hi h hlt mid hmid ih =>
    apply ih
    · omega
    · intro i hi' hi2
      have h1 := hs i mid hi' (by omega) (by omega)
      omega
    · exact above
  | case2 lo hi h hlt mid hmid ih =>
    apply ih
    · omega
    · exact below
    · intro i hi' hi2
      have h1 := hs mid i (by omega) hi' (by omega)
      omega
  | case3 lo hi h hlt =>
    constructor
    · exact below
    · intro i hi' hi2
      exact above i hi' (by omega)

/--
trace: case case1.below
a : Array Nat
x hi✝ : Nat
hs : SortedArray a
lo hi : Nat
h : hi ≤ a.size
hlt : lo < hi
mid : Nat := lo + (hi - lo) / 2
hmid : a[mid] < x
ih :
  mid + 1 ≤ hi →
    (∀ (i : Nat) (hi' : i < a.size), i < mid + 1 → a[i] < x) →
      (∀ (i : Nat) (hi' : i < a.size), hi ≤ i → x ≤ a[i]) →
        (∀ (i : Nat) (x_1 : i < a.size), i < bisect a x (mid + 1) hi h → a[i] < x) ∧
          ∀ (i : Nat) (x_1 : i < a.size), bisect a x (mid + 1) hi h ≤ i → x ≤ a[i]
hle : lo ≤ hi
below : ∀ (i : Nat) (hi' : i < a.size), i < lo → a[i] < x
above : ∀ (i : Nat) (hi' : i < a.size), hi ≤ i → x ≤ a[i]
i : Nat
hi' : i < a.size
hi2 : i < mid + 1
⊢ a[i] < x
---
trace: case case1.below
a : Array Nat
x hi✝ : Nat
hs : SortedArray a
lo hi : Nat
h : hi ≤ a.size
hlt : lo < hi
mid : Nat := lo + (hi - lo) / 2
hmid : a[mid] < x
ih :
  mid + 1 ≤ hi →
    (∀ (i : Nat) (hi' : i < a.size), i < mid + 1 → a[i] < x) →
      (∀ (i : Nat) (hi' : i < a.size), hi ≤ i → x ≤ a[i]) →
        (∀ (i : Nat) (x_1 : i < a.size), i < bisect a x (mid + 1) hi h → a[i] < x) ∧
          ∀ (i : Nat) (x_1 : i < a.size), bisect a x (mid + 1) hi h ≤ i → x ≤ a[i]
hle : lo ≤ hi
below : ∀ (i : Nat) (hi' : i < a.size), i < lo → a[i] < x
above : ∀ (i : Nat) (hi' : i < a.size), hi ≤ i → x ≤ a[i]
i : Nat
hi' : i < a.size
hi2 : i < mid + 1
h1 : a[i] ≤ a[mid]
⊢ a[i] < x
-/
#guard_msgs in
example (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) (hle : lo ≤ hi)
    (hs : SortedArray a)
    (below : ∀ i (hi' : i < a.size), i < lo → a[i] < x)
    (above : ∀ i (hi' : i < a.size), hi ≤ i → x ≤ a[i]) :
    (∀ i (_ : i < a.size), i < bisect a x lo hi h → a[i] < x) ∧
    (∀ i (_ : i < a.size), bisect a x lo hi h ≤ i → x ≤ a[i]) := by
  fun_induction bisect a x lo hi h with
  | case1 lo hi h hlt mid hmid ih =>
    apply ih
    · omega
    · intro i hi' hi2
      trace_state
      have h1 := hs i mid hi' (by omega) (by omega)
      trace_state
      omega
    · exact above
  | case2 lo hi h hlt mid hmid ih =>
    apply ih
    · omega
    · exact below
    · intro i hi' hi2
      have h1 := hs mid i (by omega) hi' (by omega)
      omega
  | case3 lo hi h hlt =>
    constructor
    · exact below
    · intro i hi' hi2
      exact above i hi' (by omega)

-- The theorem a caller wants.
theorem bisectLeft_spec (a : Array Nat) (x : Nat) (hs : SortedArray a) :
    bisectLeft a x ≤ a.size ∧
    (∀ i (_ : i < a.size), i < bisectLeft a x → a[i] < x) ∧
    (∀ i (_ : i < a.size), bisectLeft a x ≤ i → x ≤ a[i]) := by
  unfold bisectLeft
  constructor
  · exact (bisect_range a x 0 a.size (Nat.le_refl _) (by omega)).2
  · apply bisect_spec
    · omega
    · exact hs
    · intro i _ hi2
      omega
    · intro i hi' hi2
      omega

-- Using the theorem.
theorem bisectLeft_le_of_eq (a : Array Nat) (x : Nat) (hs : SortedArray a)
    (i : Nat) (hi : i < a.size) (hx : a[i] = x) : bisectLeft a x ≤ i := by
  have h1 := (bisectLeft_spec a x hs).2.1 i hi
  omega

-- A bug that never gets as far as a proof.
/--
error: failed to prove termination, possible solutions:
  - Use `have`-expressions to prove the remaining goals
  - Use `termination_by` to specify a different well-founded relation
  - Use `decreasing_by` to specify your own tactic for discharging this kind of goal
a : Array Nat
x lo hi : Nat
h : hi ≤ a.size
hlt : lo < hi
mid : Nat := lo + (hi - lo) / 2
h✝ : a[mid] < x
⊢ hi - (lo + (hi - lo) / 2) < hi - lo
-/
#guard_msgs in
def bisectLoop (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) : Nat :=
  if hlt : lo < hi then
    let mid := lo + (hi - lo) / 2
    if a[mid] < x then bisectLoop a x mid hi h
    else bisectLoop a x lo mid (by omega)
  else lo
termination_by hi - lo
