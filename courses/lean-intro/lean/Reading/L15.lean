/-! Lesson 15 · Proofs written by an AI. Every piece of Lean quoted in the lesson, in reading order. -/

-- The request: definitions and a statement that you wrote and have read.
def evens : List Nat → List Nat
  | [] => []
  | x :: rest => if x % 2 = 0 then x :: evens rest else evens rest

def Request : Prop :=
  ∀ xs ys : List Nat, evens (xs ++ ys) = evens xs ++ evens ys

-- An honest answer.
namespace Honest

theorem evens_append (xs ys : List Nat) : evens (xs ++ ys) = evens xs ++ evens ys := by
  induction xs with
  | nil => rfl
  | cons x rest ih =>
    simp [evens]
    split <;> simp [ih]

end Honest

theorem accepted : Request :=
  Honest.evens_append

/-- info: 'accepted' depends on axioms: [propext] -/
#guard_msgs in
#print axioms accepted

-- Answer 1: an extra hypothesis.
namespace Narrowed

theorem evens_append (xs ys : List Nat) (h : xs = []) : evens (xs ++ ys) = evens xs ++ evens ys := by
  subst h
  rfl

end Narrowed

/--
error: Type mismatch
  Narrowed.evens_append
has type
  ∀ (xs ys : List Nat), xs = [] → evens (xs ++ ys) = evens xs ++ evens ys
but is expected to have type
  Request
-/
#guard_msgs in
example : Request :=
  Narrowed.evens_append

-- Answer 2: the same words about a different function.
namespace Redefined

def evens (xs : List Nat) : List Nat :=
  xs

theorem evens_append (xs ys : List Nat) : evens (xs ++ ys) = evens xs ++ evens ys := by
  rfl

end Redefined

/--
error: Type mismatch
  Redefined.evens_append
has type
  ∀ (xs ys : List Nat), Redefined.evens (xs ++ ys) = Redefined.evens xs ++ Redefined.evens ys
but is expected to have type
  Request
-/
#guard_msgs in
example : Request :=
  Redefined.evens_append

-- Answer 3: the right statement, resting on an assumption.
namespace Assumed

axiom evens_step (x : Nat) (xs ys : List Nat) :
    evens (x :: (xs ++ ys)) = evens (x :: xs) ++ evens ys

theorem evens_append (xs ys : List Nat) : evens (xs ++ ys) = evens xs ++ evens ys := by
  cases xs with
  | nil => rfl
  | cons x rest => exact evens_step x rest ys

end Assumed

theorem accepted_too_soon : Request :=
  Assumed.evens_append

/-- info: 'accepted_too_soon' depends on axioms: [Assumed.evens_step] -/
#guard_msgs in
#print axioms accepted_too_soon

-- Answer 4: a weaker claim under a similar name.
namespace Weaker

theorem evens_length (xs : List Nat) : (evens xs).length ≤ xs.length := by
  induction xs with
  | nil => simp [evens]
  | cons x rest ih =>
    simp [evens]
    split
    · simp
      omega
    · omega

theorem evens_append_length (xs ys : List Nat) :
    (evens (xs ++ ys)).length ≤ (xs ++ ys).length :=
  evens_length (xs ++ ys)

end Weaker

/--
error: Type mismatch
  Weaker.evens_append_length
has type
  ∀ (xs ys : List Nat), (evens (xs ++ ys)).length ≤ (xs ++ ys).length
but is expected to have type
  Request
-/
#guard_msgs in
example : Request :=
  Weaker.evens_append_length

-- A hypothesis the proof never uses.
/--
warning: Variable name `h` is not explicitly referenced.

Hint: The binding can be removed (if unused) or named `_` (if used implicitly). Alternatively, prefix the name with `_` to silence this warning:
  [apply] _h

Note: This linter can be disabled with `set_option linter.unusedVariables false`
-/
#guard_msgs in
theorem evens_append_short (xs ys : List Nat) (h : xs.length < 100) :
    evens (xs ++ ys) = evens xs ++ evens ys :=
  Honest.evens_append xs ys
