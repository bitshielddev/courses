/-!
# Lab 04 · Propositions and proofs

Replace every `sorry`. You are done when this command prints nothing:

    lean Lab04.lean

Read the shape of the goal before you choose a tactic. The table in the lesson says which
tactic proves each shape, and which one uses a hypothesis of that shape.
-/

/-! ## 1. If … then

Name the assumption, then finish with arithmetic. -/

theorem ex1 (n : Nat) : n > 10 → n > 5 := by
  --! begin solution
  intro h
  omega
  --! end solution

/-! ## 2. And, in the goal

Two claims, so two goals. -/

theorem ex2 (n : Nat) (h : n = 4) : n > 2 ∧ n < 6 := by
  --! begin solution
  constructor
  · omega
  · omega
  --! end solution

/-! ## 3. And, in a hypothesis

`p`, `q` and `r` are arbitrary claims, so there is no arithmetic to fall back on.
Take `h` apart: `obtain ⟨hp, hq, hr⟩ := h` names all three pieces. -/

theorem ex3 (p q r : Prop) (h : p ∧ q ∧ r) : r ∧ p := by
  --! begin solution
  obtain ⟨hp, hq, hr⟩ := h
  constructor
  · exact hr
  · exact hp
  --! end solution

/-! ## 4. Or, in the goal

Choose the side you can prove. -/

theorem ex4 (p q : Prop) (hq : q) : p ∨ q := by
  --! begin solution
  right
  exact hq
  --! end solution

/-! ## 5. Or, in a hypothesis

You do not know which side of `h` holds, so handle both. -/

theorem ex5 (p q r : Prop) (h : p ∨ q) (hp : p → r) (hq : q → r) : r := by
  --! begin solution
  cases h with
  | inl h1 =>
    apply hp
    exact h1
  | inr h2 =>
    apply hq
    exact h2
  --! end solution

/-! ## 6. Not

`¬p` means `p → False`. Assume `p` and reach a contradiction. -/

theorem ex6 (p q : Prop) (hnq : ¬q) (h : p → q) : ¬p := by
  --! begin solution
  intro hp
  apply hnq
  apply h
  exact hp
  --! end solution

/-! ## 7. There exists, in the goal

Supply the number. -/

theorem ex7 : ∃ n : Nat, n * n = 81 ∧ n > 5 := by
  --! begin solution
  exists 9
  --! end solution

/-! ## 8. There exists, in a hypothesis

Take the witness out of `h`, then supply your own. -/

theorem ex8 (n : Nat) (h : ∃ k, n = 4 * k) : ∃ m, n = 2 * m := by
  --! begin solution
  obtain ⟨k, hk⟩ := h
  exists 2 * k
  omega
  --! end solution

/-! ## 9. For all, in a hypothesis

`h` is a function. Apply it to the values you need and name the results with `have`. -/

theorem ex9 (f : Nat → Nat) (h : ∀ x, f x = x + 1) : f (f 5) = 7 := by
  --! begin solution
  have h5 := h 5
  have h6 := h (f 5)
  omega
  --! end solution

/-! ## 10. Use a theorem you proved

`ex1` is a function too: `ex1 n` is a proof of `n > 10 → n > 5`. -/

theorem ex10 (n : Nat) (h : n > 20) : n > 5 := by
  --! begin solution
  apply ex1
  omega
  --! end solution

/-! ## 11. Stretch: if and only if

Two directions. One takes a witness apart and the other supplies one. -/

theorem ex11 (n : Nat) : (∃ k, n = 2 * k + 1) ↔ n % 2 = 1 := by
  --! begin solution
  constructor
  · intro h
    obtain ⟨k, hk⟩ := h
    omega
  · intro h
    exists n / 2
    omega
  --! end solution
