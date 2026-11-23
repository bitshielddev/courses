/-! Lesson 03 · Recursion and termination. Every piece of Lean quoted in the lesson, in reading order. -/

-- This message quotes its own line number, so the definition stays here, where edits below cannot move it.
/--
error: fail to show termination for
  interleave
with errors
failed to infer structural recursion:
Not considering parameter α of interleave:
  it is unchanged in the recursive calls
Cannot use parameter #2:
  failed to eliminate recursive application
    interleave ys xs
Cannot use parameter #3:
  failed to eliminate recursive application
    interleave ys xs


Could not find a decreasing measure.
The basic measures relate at each recursive call as follows:
(<, ≤, =: relation proved, ? all proofs failed, _: no proof attempted)
            x1 x2
1) 29:24-40  ?  ?
Please use `termination_by` to specify a decreasing measure.
-/
#guard_msgs in
def interleave {α : Type} : List α → List α → List α
  | [], ys => ys
  | x :: xs, ys => x :: interleave ys xs

-- A loop becomes a recursion.
def sumTo : Nat → Nat
  | 0 => 0
  | n + 1 => (n + 1) + sumTo n

/-- info: 5050 -/
#guard_msgs in
#eval sumTo 100

theorem sumTo_4 : sumTo 4 = 10 := by
  decide

-- Recursion over a list.
def total : List Nat → Nat
  | [] => 0
  | x :: rest => x + total rest

/-- info: 60 -/
#guard_msgs in
#eval total [10, 20, 30]

def join {α : Type} : List α → List α → List α
  | [], ys => ys
  | x :: xs, ys => x :: join xs ys

/-- info: [1, 2, 3, 4] -/
#guard_msgs in
#eval join [1, 2] [3, 4]

-- An accumulator, in a local helper.
def totalFast (xs : List Nat) : Nat :=
  go 0 xs
where
  go (acc : Nat) : List Nat → Nat
    | [] => acc
    | x :: rest => go (acc + x) rest

/-- info: 60 -/
#guard_msgs in
#eval totalFast [10, 20, 30]

-- Every function must end.
/--
error: fail to show termination for
  forever
with errors
failed to infer structural recursion:
Not considering parameter n of forever:
  it is unchanged in the recursive calls
no parameters suitable for structural recursion

well-founded recursion cannot be used, `forever` does not take any (non-fixed) arguments
-/
#guard_msgs in
def forever (n : Nat) : Nat :=
  forever n + 1

-- Recursion that is not on a smaller piece.
def digits (n : Nat) : Nat :=
  if n < 10 then 1 else 1 + digits (n / 10)

/-- info: 5 -/
#guard_msgs in
#eval digits 12345

def countUp (lo hi : Nat) : List Nat :=
  if lo < hi then lo :: countUp (lo + 1) hi else []

/-- info: [3, 4, 5, 6] -/
#guard_msgs in
#eval countUp 3 7

/--
info: Try this:
  [apply] termination_by hi - lo
-/
#guard_msgs in
def countUp' (lo hi : Nat) : List Nat :=
  if lo < hi then lo :: countUp' (lo + 1) hi else []
termination_by?

-- When Lean cannot find the measure. (The failing version is at the top of this file.)
def interleave' {α : Type} : List α → List α → List α
  | [], ys => ys
  | x :: xs, ys => x :: interleave' ys xs
termination_by xs ys => xs.length + ys.length

/-- info: [1, 10, 2, 20, 3] -/
#guard_msgs in
#eval interleave' [1, 2, 3] [10, 20]

-- A function nobody has proved to end.
/--
error: fail to show termination for
  collatz
with errors
failed to infer structural recursion:
Cannot use parameter n:
  failed to eliminate recursive application
    collatz (n / 2)


failed to prove termination, possible solutions:
  - Use `have`-expressions to prove the remaining goals
  - Use `termination_by` to specify a different well-founded relation
  - Use `decreasing_by` to specify your own tactic for discharging this kind of goal
n : Nat
h✝¹ : ¬n ≤ 1
h✝ : ¬n % 2 = 0
⊢ 3 * n + 1 < n
-/
#guard_msgs in
def collatz (n : Nat) : Nat :=
  if n ≤ 1 then 0
  else if n % 2 = 0 then 1 + collatz (n / 2)
  else 1 + collatz (3 * n + 1)

partial def collatzSteps (n : Nat) : Nat :=
  if n ≤ 1 then 0
  else if n % 2 = 0 then 1 + collatzSteps (n / 2)
  else 1 + collatzSteps (3 * n + 1)

/-- info: 111 -/
#guard_msgs in
#eval collatzSteps 27

-- Fuel.
def collatzFuel : Nat → Nat → Option Nat
  | 0, _ => none
  | fuel + 1, n =>
    if n ≤ 1 then some 0
    else if n % 2 = 0 then (collatzFuel fuel (n / 2)).map (· + 1)
    else (collatzFuel fuel (3 * n + 1)).map (· + 1)

/-- info: some 111 -/
#guard_msgs in
#eval collatzFuel 1000 27

/-- info: none -/
#guard_msgs in
#eval collatzFuel 50 27

-- What `decide` can and cannot run.
/--
error: Tactic `decide` failed to reduce
  @decide (digits 12345 = 5) (instDecidableEqNat (digits 12345) 5)
to `true` or `false`.

After unfolding the instances `instDecidableEqNat` and `Nat.decEq`, reduction got stuck at
  (digits 12345).beq 5
-/
#guard_msgs in
example : digits 12345 = 5 := by
  decide

example : digits 12345 = 5 := by
  simp [digits]

-- Questions.
def mystery : List Nat → Nat
  | [] => 0
  | _ :: rest => 1 + mystery rest

/-- info: 3 -/
#guard_msgs in
#eval mystery [7, 7, 7]

def halve (n : Nat) : List Nat :=
  if n = 0 then [] else n :: halve (n / 2)

/-- info: [10, 5, 2, 1] -/
#guard_msgs in
#eval halve 10
