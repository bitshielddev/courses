/-!
# Lab 02 · Functions, types and data

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab02.lean

Each `#guard` is a test. Read the tests to see what a function should do.
-/

/-! ## 1. Several arguments

The largest of three numbers. `max a b` is in the library. -/

def max3 (a b c : Nat) : Nat :=
  --! begin solution
  max a (max b c)
  --! end solution

#guard max3 1 2 3 == 3
#guard max3 9 2 3 == 9
#guard max3 1 7 3 == 7

/-! ## 2. Subtraction that stops at zero

The distance between two natural numbers. Remember that `3 - 10` is `0` in `Nat`. -/

def distance (a b : Nat) : Nat :=
  --! begin solution
  if a ≥ b then a - b else b - a
  --! end solution

#guard distance 3 10 == 7
#guard distance 10 3 == 7
#guard distance 4 4 == 0

/-! ## 3. A structure

`r.width` reads a field. `{ r with width := … }` copies `r` with one field changed. -/

structure Rect where
  width : Nat
  height : Nat
deriving Repr, DecidableEq

def Rect.area (r : Rect) : Nat :=
  --! begin solution
  r.width * r.height
  --! end solution

def Rect.widen (r : Rect) (extra : Nat) : Rect :=
  --! begin solution
  { r with width := r.width + extra }
  --! end solution

def card : Rect :=
  { width := 3, height := 4 }

#guard card.area == 12
#guard card.widen 2 == { width := 5, height := 4 }
#guard (card.widen 2).area == 20

/-! ## 4. An enumeration

Replace the catch-all case with one case for each direction. -/

inductive Direction where
  | north
  | east
  | south
  | west
deriving Repr, DecidableEq

def Direction.turnRight : Direction → Direction
  --! begin solution
  | .north => .east
  | .east => .south
  | .south => .west
  | .west => .north
  --! starter
  --! | | _ => sorry
  --! end solution

#guard Direction.north.turnRight == .east
#guard Direction.west.turnRight == .north

/-! ## 5. A fact about every direction

There are four cases. Split on them, and each one is settled by computing. -/

theorem four_rights (d : Direction) : d.turnRight.turnRight.turnRight.turnRight = d := by
  --! begin solution
  cases d
  · rfl
  · rfl
  · rfl
  · rfl
  --! end solution

/-! ## 6. `Option` in place of a crash

Division that says so when there is no answer. -/

def safeDiv (a b : Nat) : Option Nat :=
  --! begin solution
  if b = 0 then none else some (a / b)
  --! end solution

#guard safeDiv 7 2 == some 3
#guard safeDiv 7 0 == none
#guard safeDiv 0 5 == some 0

/-! ## 7. Use an `Option`

The element at index `i`, or `fallback` when the list is too short. -/

def lookupOr (xs : List Nat) (i fallback : Nat) : Nat :=
  --! begin solution
  match xs[i]? with
  | some v => v
  | none => fallback
  --! end solution

#guard lookupOr [10, 20, 30] 1 0 == 20
#guard lookupOr [10, 20, 30] 5 99 == 99
#guard lookupOr [] 0 7 == 7

/-! ## 8. Cases that carry data

A circle has no corners. -/

inductive Shape where
  | circle (radius : Nat)
  | rect (width height : Nat)
  | square (side : Nat)

def Shape.corners : Shape → Nat
  --! begin solution
  | .circle _ => 0
  | .rect _ _ => 4
  | .square _ => 4
  --! starter
  --! | | _ => sorry
  --! end solution

def Shape.area : Shape → Nat
  --! begin solution
  | .circle r => 3 * r * r
  | .rect w h => w * h
  | .square s => s * s
  --! starter
  --! | | _ => sorry
  --! end solution

#guard (Shape.circle 5).corners == 0
#guard (Shape.rect 2 3).corners == 4
#guard (Shape.rect 2 3).area == 6
#guard (Shape.square 4).area == 16
#guard (Shape.circle 2).area == 12

/-! ## 9. Stretch: a pipeline

Add up the even numbers in a list, using `filter` and `foldl`. -/

def sumOfEvens (xs : List Nat) : Nat :=
  --! begin solution
  (xs.filter (· % 2 == 0)).foldl (· + ·) 0
  --! end solution

#guard sumOfEvens [1, 2, 3, 4] == 6
#guard sumOfEvens [1, 3] == 0
#guard sumOfEvens [] == 0
