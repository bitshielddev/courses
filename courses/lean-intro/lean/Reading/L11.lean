/-! Lesson 11 · Loops and mutable variables. Every piece of Lean quoted in the lesson, in reading order. -/

-- A loop with a variable that changes.
def sumLoop (xs : List Nat) : Nat := Id.run do
  let mut total := 0
  for x in xs do
    total := total + x
  return total

/-- info: 6 -/
#guard_msgs in
#eval sumLoop [1, 2, 3]

-- It is still a function.
theorem sumLoop_123 : sumLoop [1, 2, 3] = 6 := by
  decide

theorem sumLoop_is_fold (xs : List Nat) : sumLoop xs = xs.foldl (· + ·) 0 := by
  simp [sumLoop]

/--
trace: xs : List Nat
⊢ List.foldl (fun b a => b + a) 0 xs = xs.sum
-/
#guard_msgs in
example (xs : List Nat) : sumLoop xs = xs.sum := by
  simp [sumLoop]
  trace_state
  simp [List.sum_eq_foldl]

-- Conditions, several variables, and leaving early.
def maxLoop (xs : List Nat) : Nat := Id.run do
  let mut best := 0
  for x in xs do
    if x > best then best := x
  return best

/-- info: 9 -/
#guard_msgs in
#eval maxLoop [3, 9, 4]

def indexOf (xs : List Nat) (x : Nat) : Option Nat := Id.run do
  let mut i := 0
  for y in xs do
    if y = x then return some i
    i := i + 1
  return none

/-- info: some 2 -/
#guard_msgs in
#eval indexOf [5, 6, 7] 7

/-- info: none -/
#guard_msgs in
#eval indexOf [5, 6, 7] 9

def sumSmallEvens (xs : List Nat) : Nat := Id.run do
  let mut total := 0
  for x in xs do
    if x % 2 = 1 then continue
    if x > 100 then break
    total := total + x
  return total

/-- info: 6 -/
#guard_msgs in
#eval sumSmallEvens [2, 3, 4, 200, 6]

-- Counting, and building an array.
def fib (n : Nat) : Nat := Id.run do
  let mut a := 0
  let mut b := 1
  for _ in [0:n] do
    (a, b) := (b, a + b)
  return a

/-- info: 55 -/
#guard_msgs in
#eval fib 10

def squares (n : Nat) : Array Nat := Id.run do
  let mut out := #[]
  for i in [0:n] do
    out := out.push (i * i)
  return out

/-- info: #[0, 1, 4, 9, 16] -/
#guard_msgs in
#eval squares 5

-- A loop that proofs cannot follow.
def whileSum (n : Nat) : Nat := Id.run do
  let mut i := 0
  let mut s := 0
  while i < n do
    s := s + i
    i := i + 1
  return s

/-- info: 10 -/
#guard_msgs in
#eval whileSum 5

/--
error: Tactic `decide` failed to reduce
  @decide (whileSum 5 = 10) (instDecidableEqNat (whileSum 5) 10)
to `true` or `false`.

After unfolding the instances `instDecidableEqNat` and `Nat.decEq`, reduction got stuck at
  (whileSum 5).beq 10
-/
#guard_msgs in
example : whileSum 5 = 10 := by
  decide

-- The same notation for a computation that can stop early.
def addFirstTwo (xs : List Nat) : Option Nat := do
  let a ← xs[0]?
  let b ← xs[1]?
  return a + b

/-- info: some 7 -/
#guard_msgs in
#eval addFirstTwo [3, 4, 5]

/-- info: none -/
#guard_msgs in
#eval addFirstTwo [3]

def addFirstTwoByHand (xs : List Nat) : Option Nat :=
  match xs[0]? with
  | none => none
  | some a =>
    match xs[1]? with
    | none => none
    | some b => some (a + b)

theorem addFirstTwo_same (xs : List Nat) : addFirstTwo xs = addFirstTwoByHand xs := by
  unfold addFirstTwo addFirstTwoByHand
  grind

-- Failure with a reason.
def checkedDiv (a b : Nat) : Except String Nat :=
  if b = 0 then throw "division by zero" else pure (a / b)

def average (xs : List Nat) : Except String Nat := do
  let q ← checkedDiv xs.sum xs.length
  return q

/-- info: Except.ok 5 -/
#guard_msgs in
#eval average [4, 6]

/-- info: Except.error "division by zero" -/
#guard_msgs in
#eval average []

-- And for the outside world.
def main : IO Unit := do
  IO.println s!"sum = {sumLoop [1, 2, 3]}"

/-- info: sum = 6 -/
#guard_msgs in
#eval main

-- Questions.
def puzzle (xs : List Nat) : Nat := Id.run do
  let mut n := 0
  for x in xs do
    if x = 0 then return n
    n := n + 1
  return n

/-- info: 2 -/
#guard_msgs in
#eval puzzle [4, 5, 0, 6]
