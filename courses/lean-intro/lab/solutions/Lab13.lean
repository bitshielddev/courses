import Std.Tactic.BVDecide

/-!
# Lab 13 · Machine integers

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab13.lean

`bv_decide` proves a claim about fixed-width integers by checking every bit pattern, or
shows you the pattern that breaks it. Several statements here are false as written. For
those, run `bv_decide`, read the counterexample, and repair the statement before you prove it.
-/

/-! ## 1. Bit tricks that are true

Each of these replaces arithmetic by cheaper bit operations. -/

theorem div_by_eight (x : UInt32) : x >>> 3 = x / 8 := by
  bv_decide

theorem is_even (x : UInt32) : (x % 2 = 0) ↔ (x &&& 1 = 0) := by
  bv_decide

theorem clear_lowest_bit (x : UInt32) (h : x ≠ 0) : (x &&& (x - 1)) < x := by
  bv_decide

/-! ## 2. A false claim about subtraction

This holds for natural numbers that are not zero, and the statement forgot to say so. Find
the input that breaks it, add the hypothesis, and prove the result. -/

theorem pred_lt (x : UInt8) (h : x ≠ 0) : x - 1 < x := by
  bv_decide

/-! ## 3. A false claim about a bound

If `a` and `b` are both below 200, is their sum below 400? Not in 8 bits. Lower the bound on
the inputs until the claim is true, and no further. -/

theorem sum_ge (a b : UInt8) (ha : a < 128) (hb : b < 128) : a + b ≥ a := by
  bv_decide

/-! ## 4. The midpoint, a third way

Another overflow-free midpoint: the bits the two numbers share, plus half of the bits where
they differ. Prove that it lies between them. -/

def mid (lo hi : UInt32) : UInt32 :=
  (lo &&& hi) + ((lo ^^^ hi) >>> 1)

theorem mid_between (lo hi : UInt32) (h : lo ≤ hi) : lo ≤ mid lo hi ∧ mid lo hi ≤ hi := by
  unfold mid
  bv_decide

/-- It is the same midpoint as the subtraction formula from the lesson. -/
theorem mid_same (lo hi : UInt32) (h : lo ≤ hi) : mid lo hi = lo + (hi - lo) / 2 := by
  unfold mid
  bv_decide

/-! ## 5. Absolute difference

Subtracting the smaller from the larger never wraps. Prove that the result is what the same
calculation gives on natural numbers. This mixes machine integers with `Nat`, so it is a job
for `grind`. -/

def absDiff (a b : UInt8) : UInt8 :=
  if a ≥ b then a - b else b - a

#guard absDiff 200 3 == 197
#guard absDiff 3 200 == 197

theorem absDiff_spec (a b : UInt8) :
    (absDiff a b).toNat = if a.toNat ≥ b.toNat then a.toNat - b.toNat else b.toNat - a.toNat := by
  unfold absDiff
  grind

/-! ## 6. A checked addition

Write an addition that reports overflow: `none` when the true sum does not fit in 8 bits,
and `some` of the sum when it does. The test from the lesson detects the wrap. Then prove
that a result, when there is one, is the true sum. -/

def checkedAdd (a b : UInt8) : Option UInt8 :=
  if a + b < a then none else some (a + b)

#guard checkedAdd 200 100 == none
#guard checkedAdd 200 55 == some 255
#guard checkedAdd 0 0 == some 0

theorem checkedAdd_exact (a b c : UInt8) (h : checkedAdd a b = some c) :
    c.toNat = a.toNat + b.toNat := by
  unfold checkedAdd at h
  grind

/-! ## 7. Stretch: a signed corner

For 8-bit signed integers, negating twice gives back the number you started with, even for
the one number whose negation does not fit. Prove it. Then repair the second claim, which
is false for exactly one input. -/

theorem neg_neg (x : Int8) : -(-x) = x := by
  bv_decide

theorem neg_pos (x : Int8) (h : x < 0) (hmin : x ≠ -128) : -x > 0 := by
  bv_decide
