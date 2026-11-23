/-!
# Lab 02 · Functions, types and data

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab02.lean

Each `#guard` is a test. Read the tests to see what a function should do.
-/

/-! ## 1. Several arguments

The largest of three numbers. `max a b` is in the library. -/

def max3 (a b c : Nat) : Nat :=
  sorry

#guard max3 1 2 3 == 3
#guard max3 9 2 3 == 9
#guard max3 1 7 3 == 7

/-! ## 2. Subtraction that stops at zero

The distance between two natural numbers. Remember that `3 - 10` is `0` in `Nat`. -/

def distance (a b : Nat) : Nat :=
  sorry

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
  sorry

def Rect.widen (r : Rect) (extra : Nat) : Rect :=
  sorry

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
  | _ => sorry

#guard Direction.north.turnRight == .east
#guard Direction.west.turnRight == .north

/-! ## 5. A fact about every direction

There are four cases. Split on them, and each one is settled by computing. -/

theorem four_rights (d : Direction) : d.turnRight.turnRight.turnRight.turnRight = d := by
  sorry

/-! ## 6. `Option` in place of a crash

Division that says so when there is no answer. -/

def safeDiv (a b : Nat) : Option Nat :=
  sorry

#guard safeDiv 7 2 == some 3
#guard safeDiv 7 0 == none
#guard safeDiv 0 5 == some 0

/-! ## 7. Use an `Option`

The element at index `i`, or `fallback` when the list is too short. -/

def lookupOr (xs : List Nat) (i fallback : Nat) : Nat :=
  sorry

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
  | _ => sorry

def Shape.area : Shape → Nat
  | _ => sorry

#guard (Shape.circle 5).corners == 0
#guard (Shape.rect 2 3).corners == 4
#guard (Shape.rect 2 3).area == 6
#guard (Shape.square 4).area == 16
#guard (Shape.circle 2).area == 12

/-! ## 9. Stretch: a pipeline

Add up the even numbers in a list, using `filter` and `foldl`. -/

def sumOfEvens (xs : List Nat) : Nat :=
  sorry

#guard sumOfEvens [1, 2, 3, 4] == 6
#guard sumOfEvens [1, 3] == 0
#guard sumOfEvens [] == 0
