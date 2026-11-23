/-!
# Lab 10 · Case study: binary search

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab10.lean

The lesson verified `bisectLeft`, which finds the first position whose element is not below
`x`. Here you verify its sibling, which finds the first position whose element is above
`x`. Python calls them `bisect_left` and `bisect_right`. The proofs have the same shape as
the lesson's, with the roles of the two branches exchanged. Keep the lesson open beside this.
-/

def SortedArray (a : Array Nat) : Prop :=
  ∀ i j (hi : i < a.size) (hj : j < a.size), i ≤ j → a[i] ≤ a[j]

/-! ## 1. The midpoint

Two facts the search relies on. The first is what lets Lean accept `a[mid]`. -/

theorem mid_bounds (lo hi : Nat) (h : lo < hi) :
    lo ≤ lo + (hi - lo) / 2 ∧ lo + (hi - lo) / 2 < hi := by
  --! begin solution
  omega
  --! end solution

/-- For natural numbers, which never overflow, the usual formula gives the same midpoint. -/
theorem mid_same (lo hi : Nat) (h : lo ≤ hi) : lo + (hi - lo) / 2 = (lo + hi) / 2 := by
  --! begin solution
  omega
  --! end solution

/-! ## The program to verify -/

def upper (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) : Nat :=
  if hlt : lo < hi then
    let mid := lo + (hi - lo) / 2
    if x < a[mid] then upper a x lo mid (by omega)
    else upper a x (mid + 1) hi h
  else lo
termination_by hi - lo

def bisectRight (a : Array Nat) (x : Nat) : Nat :=
  upper a x 0 a.size (Nat.le_refl _)

#guard bisectRight #[1, 3, 3, 5, 8] 3 == 3
#guard bisectRight #[1, 3, 3, 5, 8] 4 == 3
#guard bisectRight #[1, 3, 3, 5, 8] 0 == 0
#guard bisectRight #[1, 3, 3, 5, 8] 8 == 5

/-! ## 2. The answer stays in the range

In the two recursive cases, `ih` is an implication. Give it the fact it asks for with
`have h1 := ih (by omega)`, then finish with arithmetic. -/

theorem upper_range (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) (hle : lo ≤ hi) :
    lo ≤ upper a x lo hi h ∧ upper a x lo hi h ≤ hi := by
  fun_induction upper a x lo hi h with
  | case1 lo hi h hlt mid hmid ih =>
    --! begin solution
    have h1 := ih (by omega)
    omega
    --! end solution
  | case2 lo hi h hlt mid hmid ih =>
    --! begin solution
    have h1 := ih (by omega)
    omega
    --! end solution
  | case3 lo hi h hlt =>
    --! begin solution
    omega
    --! end solution

/-! ## 3. The invariant

`below` says everything left of `lo` is at most `x`. `above` says everything from `hi` on
is greater than `x`. If both hold when the search starts, they hold of its answer.

In `case1` the test `x < a[mid]` succeeded and the search continues in `lo … mid`, so it is
`above` that has to be proved again for the new bound. In `case2` it is `below`. Each time,
`hs` relates the element you are asked about to `a[mid]`. -/

theorem upper_spec (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) (hle : lo ≤ hi)
    (hs : SortedArray a)
    (below : ∀ i (hi' : i < a.size), i < lo → a[i] ≤ x)
    (above : ∀ i (hi' : i < a.size), hi ≤ i → x < a[i]) :
    (∀ i (_ : i < a.size), i < upper a x lo hi h → a[i] ≤ x) ∧
    (∀ i (_ : i < a.size), upper a x lo hi h ≤ i → x < a[i]) := by
  fun_induction upper a x lo hi h with
  | case1 lo hi h hlt mid hmid ih =>
    --! begin solution
    apply ih
    · omega
    · exact below
    · intro i hi' hi2
      have h1 := hs mid i (by omega) hi' (by omega)
      omega
    --! end solution
  | case2 lo hi h hlt mid hmid ih =>
    --! begin solution
    apply ih
    · omega
    · intro i hi' hi2
      have h1 := hs i mid hi' (by omega) (by omega)
      omega
    · exact above
    --! end solution
  | case3 lo hi h hlt =>
    --! begin solution
    constructor
    · exact below
    · intro i hi' hi2
      exact above i hi' (by omega)
    --! end solution

/-! ## 4. The theorem a caller wants

Start the search on the whole array. Nothing is left of position 0 and nothing is at or
beyond `a.size`, so both invariants hold for a reason `omega` can see. -/

theorem bisectRight_spec (a : Array Nat) (x : Nat) (hs : SortedArray a) :
    bisectRight a x ≤ a.size ∧
    (∀ i (_ : i < a.size), i < bisectRight a x → a[i] ≤ x) ∧
    (∀ i (_ : i < a.size), bisectRight a x ≤ i → x < a[i]) := by
  --! begin solution
  unfold bisectRight
  constructor
  · exact (upper_range a x 0 a.size (Nat.le_refl _) (by omega)).2
  · apply upper_spec
    · omega
    · exact hs
    · intro i _ hi2
      omega
    · intro i hi' hi2
      omega
  --! end solution

/-! ## 5. Use the theorem

If `x` is in the array at position `i`, the answer is beyond `i`. You do not need to look
inside `upper` again. The specification is enough. -/

theorem bisectRight_gt_of_eq (a : Array Nat) (x : Nat) (hs : SortedArray a)
    (i : Nat) (hi : i < a.size) (hx : a[i] = x) : i < bisectRight a x := by
  --! begin solution
  have h1 := (bisectRight_spec a x hs).2.2 i hi
  omega
  --! end solution

/-! ## 6. Stretch: the two searches bracket the copies of `x`

`bisectLeft` and its specification from the lesson are given. Show that it never returns a
later position than `bisectRight`. Suppose it did, and ask both specifications about the
position `bisectRight a x`: they contradict each other. `by_cases c : p` splits a proof into
the case where `p` holds and the case where it does not. -/

def bisect (a : Array Nat) (x lo hi : Nat) (h : hi ≤ a.size) : Nat :=
  if hlt : lo < hi then
    let mid := lo + (hi - lo) / 2
    if a[mid] < x then bisect a x (mid + 1) hi h
    else bisect a x lo mid (by omega)
  else lo
termination_by hi - lo

def bisectLeft (a : Array Nat) (x : Nat) : Nat :=
  bisect a x 0 a.size (Nat.le_refl _)

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

theorem left_le_right (a : Array Nat) (x : Nat) (hs : SortedArray a) :
    bisectLeft a x ≤ bisectRight a x := by
  --! begin solution
  have hl := bisectLeft_spec a x hs
  have hr := bisectRight_spec a x hs
  by_cases c : bisectRight a x < bisectLeft a x
  · have h1 := hl.2.1 (bisectRight a x) (by omega) c
    have h2 := hr.2.2 (bisectRight a x) (by omega) (Nat.le_refl _)
    omega
  · omega
  --! end solution
