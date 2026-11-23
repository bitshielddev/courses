/-! Lesson 02 · Functions, types and data. Every piece of Lean quoted in the lesson, in reading order. -/

-- Several arguments.
def area (width height : Nat) : Nat :=
  width * height

/-- info: 12 -/
#guard_msgs in
#eval area 3 4

/-- info: area (width height : Nat) : Nat -/
#guard_msgs in
#check area

/-- info: area 3 : Nat → Nat -/
#guard_msgs in
#check area 3

/--
error: Application type mismatch: The argument
  "3"
has type
  String
but is expected to have type
  Nat
in the application
  area "3"
-/
#guard_msgs in
#eval area "3" 4

-- Conditionals and local names.
def clamp (lo hi x : Int) : Int :=
  if x < lo then lo
  else if x > hi then hi
  else x

/-- info: 10 -/
#guard_msgs in
#eval clamp 0 10 15

/-- info: 0 -/
#guard_msgs in
#eval clamp 0 10 (-3)

def hypotSq (a b : Nat) : Nat :=
  let a2 := a * a
  let b2 := b * b
  a2 + b2

/-- info: 25 -/
#guard_msgs in
#eval hypotSq 3 4

-- Anonymous functions.
/-- info: [10, 20, 30] -/
#guard_msgs in
#eval [1, 2, 3].map (fun x => x * 10)

/-- info: [10, 20, 30] -/
#guard_msgs in
#eval [1, 2, 3].map (· * 10)

-- Numbers that never fail.
/-- info: 0 -/
#guard_msgs in
#eval (3 : Nat) - 5

/-- info: -2 -/
#guard_msgs in
#eval (3 : Int) - 5

/-- info: 3 -/
#guard_msgs in
#eval 7 / 2

/-- info: 0 -/
#guard_msgs in
#eval 7 / 0

-- Bool and Prop.
/-- info: 2 + 2 == 4 : Bool -/
#guard_msgs in
#check 2 + 2 == 4

/-- info: 2 + 2 = 4 : Prop -/
#guard_msgs in
#check 2 + 2 = 4

-- Structures.
structure Point where
  x : Int
  y : Int
deriving Repr

def origin : Point :=
  { x := 0, y := 0 }

def Point.shift (p : Point) (dx : Int) : Point :=
  { p with x := p.x + dx }

/-- info: { x := 3, y := 0 } -/
#guard_msgs in
#eval origin.shift 3

/-- info: { x := 0, y := 0 } -/
#guard_msgs in
#eval origin

-- Enumerations and match.
inductive Light where
  | red
  | amber
  | green
deriving Repr

def Light.next : Light → Light
  | .red => .green
  | .green => .amber
  | .amber => .red

/-- info: Light.green -/
#guard_msgs in
#eval Light.red.next

/--
error: Missing cases:
amber
-/
#guard_msgs in
def Light.isStop : Light → Bool
  | .red => true
  | .green => false

theorem next_cycle (l : Light) : l.next.next.next = l := by
  cases l
  · rfl
  · rfl
  · rfl

/--
trace: case red
⊢ Light.red.next.next.next = Light.red

case amber
⊢ Light.amber.next.next.next = Light.amber

case green
⊢ Light.green.next.next.next = Light.green
-/
#guard_msgs in
example (l : Light) : l.next.next.next = l := by
  cases l
  trace_state
  all_goals rfl

-- Constructors that carry data.
inductive Shape where
  | circle (radius : Nat)
  | rect (width height : Nat)

def Shape.area : Shape → Nat
  | .circle r => 3 * r * r
  | .rect w h => w * h

/-- info: 12 -/
#guard_msgs in
#eval (Shape.rect 3 4).area

-- Option.
/-- info: some 20 -/
#guard_msgs in
#eval [10, 20, 30][1]?

/-- info: none -/
#guard_msgs in
#eval [10, 20, 30][7]?

/--
error: Type mismatch
  xs.head?
has type
  Option Nat
but is expected to have type
  Nat
-/
#guard_msgs in
def firstOf (xs : List Nat) : Nat :=
  xs.head?

def firstOr (xs : List Nat) (fallback : Nat) : Nat :=
  match xs.head? with
  | some v => v
  | none => fallback

/-- info: 7 -/
#guard_msgs in
#eval firstOr [] 7

-- Lists and type parameters.
/-- info: [1, 2, 3] -/
#guard_msgs in
#eval 1 :: [2, 3]

/-- info: [1, 2, 3] -/
#guard_msgs in
#eval [1, 2] ++ [3]

/-- info: [2, 4] -/
#guard_msgs in
#eval [1, 2, 3, 4].filter (· % 2 == 0)

/-- info: 10 -/
#guard_msgs in
#eval [1, 2, 3, 4].foldl (· + ·) 0

def second {α : Type} (xs : List α) : Option α :=
  xs[1]?

/-- info: some "b" -/
#guard_msgs in
#eval second ["a", "b", "c"]

/-- info: second [1, 2, 3] : Option Nat -/
#guard_msgs in
#check second [1, 2, 3]

-- Questions.
/-- info: 0 -/
#guard_msgs in
#eval (2 : Nat) - 3 + 1 - 1

/-- info: 1 -/
#guard_msgs in
#eval (2 : Nat) - 3 + 1

def describe (xs : List Nat) : String :=
  match xs with
  | [] => "empty"
  | [x] => s!"just {x}"
  | x :: _ => s!"starts with {x}"

/-- info: "starts with 4" -/
#guard_msgs in
#eval describe [4, 5]
