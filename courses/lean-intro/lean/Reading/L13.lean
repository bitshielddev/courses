import Std.Tactic.BVDecide

/-! Lesson 13 · Machine integers. Every piece of Lean quoted in the lesson, in reading order. -/

-- Numbers that wrap.
/-- info: 0 -/
#guard_msgs in
#eval (255 : UInt8) + 1

/-- info: 255 -/
#guard_msgs in
#eval (0 : UInt8) - 1

/-- info: 144 -/
#guard_msgs in
#eval (200 : UInt8) * 2

/-- info: 1705032704 -/
#guard_msgs in
#eval (3000000000 : UInt32) + 3000000000

-- A fact about natural numbers that is false for machine integers.
example (x : Nat) : x + 1 > x := by
  omega

/--
error: The prover found a counterexample, consider the following assignment:
x = 4294967295
-/
#guard_msgs in
example (x : UInt32) : x + 1 > x := by
  bv_decide

example (x : UInt32) (h : x < 4294967295) : x + 1 > x := by
  bv_decide

-- The midpoint, again.
/-- info: 852516352 -/
#guard_msgs in
#eval ((3000000000 : UInt32) + 3000000000) / 2

/--
error: The prover found a counterexample, consider the following assignment:
hi = 4294967295
lo = 4294967295
-/
#guard_msgs in
theorem mid_naive (lo hi : UInt32) (h : lo ≤ hi) : lo ≤ (lo + hi) / 2 := by
  bv_decide

theorem mid_safe (lo hi : UInt32) (h : lo ≤ hi) :
    lo ≤ lo + (hi - lo) / 2 ∧ lo + (hi - lo) / 2 ≤ hi := by
  bv_decide

theorem mid_safe_64 (lo hi : UInt64) (h : lo ≤ hi) :
    lo ≤ lo + (hi - lo) / 2 ∧ lo + (hi - lo) / 2 ≤ hi := by
  bv_decide

-- Bit tricks, proved for every input.
theorem times_two (x : UInt32) : x <<< 1 = x * 2 := by
  bv_decide

theorem low_bits (x : UInt32) : x % 16 = x &&& 15 := by
  bv_decide

theorem xor_swap (a b : UInt32) :
    let a1 := a ^^^ b
    let b1 := a1 ^^^ b
    let a2 := a1 ^^^ b1
    a2 = b ∧ b1 = a := by
  bv_decide

theorem average_no_overflow (a b : UInt32) :
    (a &&& b) + ((a ^^^ b) >>> 1) = a / 2 + b / 2 + (a &&& b &&& 1) := by
  bv_decide

-- Signed numbers have their own corner.
/--
error: The prover found a counterexample, consider the following assignment:
x = -2147483648
-/
#guard_msgs in
theorem abs_nonneg (x : Int32) : (if x < 0 then -x else x) ≥ 0 := by
  bv_decide

/-- info: -2147483648 -/
#guard_msgs in
#eval -(-2147483648 : Int32)

-- Where the solver stops.
/--
error: The SAT solver timed out while solving the problem.
Consider increasing the timeout with the `timeout` config option.
If solving your problem relies inherently on using associativity or commutativity, consider enabling the `acNf` config option.
-/
#guard_msgs in
example (x y : UInt32) : x * y = y * x := by
  bv_decide

example (x y : UInt32) : x * y = y * x := by
  exact UInt32.mul_comm x y

-- Machine integers against the mathematical ones.
/-- info: 305 -/
#guard_msgs in
#eval (5 : UInt8).toNat + 300

theorem add_exact (a b : UInt8) (h : a.toNat + b.toNat < 256) : (a + b).toNat = a.toNat + b.toNat := by
  grind

theorem overflow_test (a b : UInt8) : (a + b < a) ↔ (a.toNat + b.toNat ≥ 256) := by
  grind

def satAdd (a b : UInt8) : UInt8 :=
  if a + b < a then 255 else a + b

/-- info: 255 -/
#guard_msgs in
#eval satAdd 200 100

theorem satAdd_spec (a b : UInt8) : (satAdd a b).toNat = min 255 (a.toNat + b.toNat) := by
  unfold satAdd
  grind

-- What the proof rests on.
/--
info: 'mid_safe' depends on axioms: [propext, Classical.choice, Quot.sound, mid_safe._native.bv_decide.ax_1_5]
-/
#guard_msgs in
#print axioms mid_safe

/-- info: 'satAdd_spec' depends on axioms: [propext, Classical.choice, Quot.sound] -/
#guard_msgs in
#print axioms satAdd_spec

-- Questions.
/--
error: The prover found a counterexample, consider the following assignment:
x = 0
-/
#guard_msgs in
example (x : UInt8) : x - 1 < x := by
  bv_decide

/-- info: 255 -/
#guard_msgs in
#eval (0 : UInt8) - 1

example (a b : UInt8) : a + b = b + a := by
  bv_decide
