// Part 6 (Shared ownership and the wider language), lesson 24: unsafe Rust, calling C, reading macros, and what to do after the course.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 6 · Shared ownership & the wider language';

  (window.C_LESSONS ||= []).push(
    {
      id: 'unsafe-and-beyond',
      title: 'Unsafe Rust & where to go next',
      category: part,
      minutes: 35,
      summary: 'What the unsafe keyword unlocks and what it leaves switched on, how safe interfaces are built over raw pointers, how to call C, how to read a macro, and where to take your Rust from here.',
      topics: ['unsafe', 'Raw pointers', 'Undefined behavior', 'Safe abstractions', 'Miri', 'Calling C', 'macro_rules!', 'Next steps'],
      sections: [
        {
          title: 'What unsafe means',
          body: [
            "Every lesson so far stayed inside **safe Rust**, where the compiler proves that no program reads freed memory, reads past the end of a buffer or races on shared data. The proof is conservative. When the compiler cannot show that something is fine, it says no, even to a program that is fine. Lesson 7 had examples, and you rearranged the code until the compiler could see it.",
            "Some code cannot be rearranged that way. The inside of `Vec` manages a raw allocation. A call into a C library hands control to code the compiler has never seen. A driver writes to an address that the hardware defines. For these, Rust has a second and larger language, entered with the keyword `unsafe`. Inside an `unsafe` block you may do five things that are refused everywhere else.",
            { table: {
              head: ['Inside `unsafe` you may', 'What you take responsibility for'],
              rows: [
                ['Dereference a raw pointer', 'The pointer leads to a live, initialized value of the right type'],
                ['Call an `unsafe` function or method', 'Whatever its documentation lists under "Safety"'],
                ['Read or write a `static mut`, a global that can change', 'No other thread touches it at the same time'],
                ['Implement an `unsafe` trait, with `unsafe impl`', 'The property the trait stands for. `Send` and `Sync` from lesson 23 are the usual ones'],
                ['Read a field of a `union`', 'The field you read is the one that was written. Unions exist mostly to match C data'],
              ],
            } },
            { run: rs`static mut CALLS: u32 = 0;                 // a global that any code may change

/// The element in the middle of the slice.
///
/// # Safety
/// The slice must not be empty.
unsafe fn middle_unchecked(values: &[i32]) -> i32 {
    // SAFETY: the caller promised at least one element, so len / 2 is in range.
    unsafe { *values.get_unchecked(values.len() / 2) }
}

fn main() {
    let numbers = [10, 20, 30];

    let checked = numbers[1];                               // compares 1 with the length first
    // SAFETY: the array has three elements.
    let unchecked = unsafe { middle_unchecked(&numbers) };  // no comparison: the caller vouches for it
    println!("{checked} {unchecked}");

    // SAFETY: this program has one thread, so nothing else touches CALLS meanwhile.
    unsafe { CALLS += 1 };
    let calls = unsafe { CALLS };
    println!("{calls}");
}`, name: 'first_unsafe.rs', expect: '20 20\n1\n' },
            "The keyword plays two parts here. On a declaration, as in `unsafe fn`, it states a contract: this function has conditions the compiler cannot check, and they are written under `# Safety`. On a block, `unsafe { … }`, it accepts a contract: the conditions hold here, and a person checked. The comment that starts `// SAFETY:` is a convention, and a good one. It records why the conditions hold, for the next person who has to check.",
            "`get_unchecked` is a method of slices that skips the bounds check. It is an `unsafe fn` because an index out of range would read memory that is not part of the slice. Many checked methods in the standard library have a twin like this, and the twin's name ends in `_unchecked`.",
            "That list of five is the whole of it. An `unsafe` block does not switch off the borrow checker, the type checker or the tracking of moves. This block contains nothing but safe code with an ordinary mistake in it:",
            { run: rs`fn main() {
    let names = vec![String::from("ada")];
    unsafe {
        let moved = names;
        println!("{}", names.len());
        println!("{}", moved.len());
    }
}`, name: 'still_checked.rs', fails: 'E0382' },
            "The use after a move is rejected as it was in lesson 5. The compiler adds a warning that the `unsafe` block is unnecessary, because nothing in it uses any of the five abilities. Checks at run time stay as well. An ordinary index inside an `unsafe` block is still compared with the length:",
            { run: rs`fn third_plus(values: &[i32; 3], index: usize) -> i32 {
    unsafe {
        let third = *values.as_ptr().add(2);    // an unsafe operation: nothing checks it
        third + values[index]                   // an ordinary index: checked as always
    }
}

fn main() {
    let values = [10, 20, 30];
    println!("{}", third_plus(&values, 0));
    println!("{}", third_plus(&values, 5));
}`, name: 'still_bounds_checked.rs', panics: true, expect: '40\n' },
            "So `unsafe` does not mean that the code is wrong, or that anything goes. It means that for five specific operations, the compiler is no longer the one doing the checking. You are.",
            { compare: "Every language you know has a door like this. Python has `ctypes` and PHP has `FFI`, and either can crash the interpreter with one wrong pointer. TypeScript has `any` and `as`, which switch the type checker off for a value. The difference is how well the damage is marked. An `any` flows silently into everything it touches. An `unsafe` block is a keyword you can search for. The places where memory safety rests on a person's reasoning are the ones that `grep unsafe` lists, and everything outside them is checked as before." },
          ],
        },
        {
          title: 'Raw pointers',
          body: [
            "A reference is a pointer with guarantees: it always leads to a valid value, the borrow rules hold for it, and its lifetime is tracked. A **raw pointer** is the pointer without the guarantees. It has two types, `*const T` for reading and `*mut T` for reading and writing.",
            { table: {
              head: ['', '`&T` and `&mut T`', '`*const T` and `*mut T`'],
              rows: [
                ['Leads to a live, initialized `T`', 'Always', 'Maybe. It can be null, dangling or misaligned'],
                ['Many readers or one writer', 'Enforced', 'Not checked: any number of `*mut T` may point at one value'],
                ['Lifetime', 'Tracked by the compiler', 'None'],
                ['Making one', 'Safe', 'Safe'],
                ['Reading or writing through it', 'Safe', 'Needs `unsafe`'],
                ['Size', 'One word, or two for a slice', 'The same'],
              ],
            } },
            "Making a raw pointer is safe, because an address does no harm until someone uses it. `&raw const value` and `&raw mut value` take the address of a variable. Using the pointer is the step that needs `unsafe`:",
            { run: rs`fn main() {
    let score = 42;
    let pointer = &raw const score;      // making a raw pointer is safe

    println!("{}", *pointer);            // reading through it is not
}`, name: 'deref_outside.rs', fails: 'E0133' },
            "The note lists what the compiler can no longer rule out: a raw pointer may be null, dangling or unaligned. Inside an `unsafe` block, the dereference is accepted, and those become yours to rule out.",
            { run: rs`fn main() {
    let mut score = 42;
    let pointer = &raw mut score;            // *mut i32

    println!("{}", pointer.is_null());       // safe: a question about the pointer itself
    let reader = pointer.cast_const();       // safe: a *const i32 with the same address
    println!("{}", reader == pointer);       // safe: compares two addresses

    // SAFETY: both point at score, which is alive, and no reference to it is in use.
    unsafe {
        *pointer += 1;                       // write through one
        println!("{}", *reader);             // read through the other
    }
    println!("{score}");
}`, name: 'raw_pointers.rs', expect: 'false\ntrue\n43\n43\n' },
            { memory: {
              title: 'A reference and a raw pointer to the same value',
              vars: [
                { id: 'score', type: 'i32' },
                { id: 'reference', type: '&i32' },
                { id: 'pointer', type: '*const i32' },
              ],
              set: { score: 42, reference: '&score', pointer: '&score' },
              caption: "Both hold the same address, and in memory they are the same eight bytes. The dashed arrow is a borrow: the compiler knows about it and keeps `score` alive and unchanged while it is in use. A raw pointer is drawn solid, like an owner, but it owns nothing and borrows nothing. The compiler does not connect it to `score` at all.",
            } },
            "Raw pointers also do arithmetic. `pointer.add(n)` moves forward by `n` elements, not `n` bytes. It is an `unsafe` method, because the result must stay inside the allocation the pointer came from.",
            { run: rs`fn main() {
    let values = [3, 5, 8];
    let first = values.as_ptr();              // *const i32, pointing at element 0

    let mut total = 0;
    for i in 0..values.len() {
        // SAFETY: i is less than the length, so first.add(i) is an element of the array.
        total += unsafe { *first.add(i) };
    }
    println!("{total}");

    println!("{} {}", size_of::<*const i32>(), size_of::<&i32>());
    println!("{}", std::ptr::null::<i32>().is_null());
}`, name: 'pointer_arithmetic.rs', expect: '16\n8 8\ntrue\n' },
            { list: [
              "`as_ptr` and `as_mut_ptr` give a raw pointer to the first element of a slice, a `Vec` or a `String`.",
              "`pointer.read()` and `pointer.write(value)` are method forms of `*pointer` and `*pointer = value`. `write` does not drop the old contents, which is what you want for memory that was never initialized.",
              "`std::ptr::null()` and `std::ptr::null_mut()` make null pointers. Safe Rust has no null, and a raw pointer is how one arrives from C.",
              "`&*pointer` and `&mut *pointer` turn a raw pointer back into a reference. That is the moment every guarantee of a reference has to be true again.",
            ] },
            { compare: "Python, PHP and TypeScript have nothing like this in the language itself. The nearest things are the integer that `id()` returns in CPython, which you cannot follow, and a `ctypes` pointer, which you can. A raw pointer is what all of their references are underneath, with the garbage collector taken away." },
          ],
        },
        {
          title: 'Undefined behavior is back',
          body: [
            "Lesson 6 showed a reference that outlives the value it points to, and the compiler refused it.",
            { run: rs`fn main() {
    let reference: &i32;
    {
        let value = 7;
        reference = &value;
    }
    println!("{reference}");
}`, name: 'dangling_reference.rs', fails: 'E0597' },
            "Here is the same program with a raw pointer where the reference was. Step through it.",
            { trace: {
              title: 'A raw pointer that outlives its value',
              code: rs`fn main() {
    let pointer: *const i32;
    {
        let value = 7;
        pointer = &raw const value;
    }
    let other = 99;
    println!("{}", unsafe { *pointer });
    println!("{other}");
}`,
              vars: [
                { id: 'pointer', type: '*const i32' },
                { id: 'value', type: 'i32' },
                { id: 'other', type: 'i32' },
              ],
              steps: [
                { line: 2, show: ['pointer'], say: "A raw pointer, declared and not yet set." },
                { line: 4, set: { value: 7 }, say: "`value` lives inside the inner block." },
                { line: 5, set: { pointer: '&value' }, say: "`pointer` takes the address of `value`. This is safe code, and the compiler does not record that the two are connected." },
                { line: 6, dead: ['value'], say: "The block ends and the storage of `value` is given back. `pointer` still holds the address. Nothing is wrong yet: a dangling raw pointer is allowed to exist." },
                { line: 7, set: { other: 99 }, say: "A new variable. The figure gives it a slot of its own, but the compiler is free to put it where `value` was." },
                { line: 8, say: "The read goes through an address that no longer belongs to any value. It might find 7, or 99, or something else. The `unsafe` block is where the program claimed that `pointer` was valid, and the claim is false." },
                { line: 9, say: "Whatever was printed on line 8, the program has left the language. Nothing about the rest of the run is promised, this line included." },
              ],
            } },
            "This version compiles without a warning. No cell in this lesson runs it, because there is no output to promise. What it does is **undefined behavior**: the language says nothing at all about what happens. That is a stronger statement than \"it prints garbage\". The compiler optimizes on the assumption that undefined behavior never occurs, so a program that has it may print 7, print 99, crash, or change its mind after the next compiler update. A debug build and a release build can disagree.",
            "Inside `unsafe`, these are the ways to get there:",
            { table: {
              head: ['Undefined behavior', 'For example'],
              rows: [
                ['Reading or writing through a dangling, null or misaligned pointer', 'The program above'],
                ['Reading memory that was never initialized', 'The spare capacity of a `Vec`, read before anything was written to it'],
                ['Breaking the aliasing rule', 'Two `&mut` to one value, or a change to a value while a `&` to it is in use. The rule from lesson 7 binds unsafe code too'],
                ['A data race', 'Two threads using one `static mut` with no lock, at least one of them writing'],
                ['A value its type does not allow', 'A `bool` that is neither 0 nor 1, a `char` that is not a Unicode character, a reference that is null, a `&str` that is not UTF-8'],
                ['Breaking the contract of an `unsafe fn`', '`get_unchecked(9)` on three elements'],
              ],
            } },
            "Safe Rust can do none of these. That is the guarantee the first 23 lessons were about. It helps as much to know what is **not** undefined behavior, although each of these is a bug: integer overflow, an index out of range, `unwrap` on a `None`, a memory leak, a deadlock. Every one has a defined outcome, which is a panic, a wrapped number, memory that stays allocated, or a thread that waits.",
            { pitfall: "The dangerous result of undefined behavior is not a crash. It is the right answer. The program above will very likely print 7 on your machine today. The tests pass, the code ships, and it breaks a year later under a new compiler. Unsafe code cannot be judged by running it and looking at the output." },
            { pitfall: "The aliasing rule catches people who come to unsafe Rust from C. A `&mut T` promises the compiler that nothing else reads or writes the value while the reference is in use, and the optimizer relies on that. Making a second `&mut` to the same value through a raw pointer breaks the promise, even if the code then takes turns politely. The working habit is to stay with raw pointers inside unsafe code, and to make a reference only at a point where the rule holds." },
            { fromC: "Unsafe Rust is C with better tooling. Everything in the C course's lesson on undefined behavior applies inside these blocks: dangling pointers, reads past the end, uninitialized memory, use after free. Two things differ. The blocks are marked and small, so there is far less code to audit. And references bring a rule C does not have for ordinary pointers: a `&mut` must be the only way to reach its value for as long as it is in use." },
          ],
        },
        {
          title: 'Safe abstractions over unsafe code',
          body: [
            "The purpose of `unsafe` is not to write programs in it. It is to build a small piece the compiler cannot verify, and wrap it in a function that safe code cannot misuse. Here is a function the borrow checker will not accept as written: it returns mutable references to two different elements of one slice.",
            { run: rs`fn pair_mut(values: &mut [i32], a: usize, b: usize) -> (&mut i32, &mut i32) {
    (&mut values[a], &mut values[b])
}

fn main() {
    let mut scores = [10, 20, 30, 40];
    let (first, last) = pair_mut(&mut scores, 0, 3);
    *first += *last;
    *last = 0;
    println!("{scores:?}");
}`, name: 'two_elements.rs', fails: 'E0499' },
            "The compiler sees two mutable borrows of `values` and stops. It does not reason about index values, so it cannot know that element `a` and element `b` are different places. You can know that, if you check. Then raw pointers let you say so.",
            { run: rs`// Two different elements of one slice, both mutable at once.
fn pair_mut(values: &mut [i32], a: usize, b: usize) -> (&mut i32, &mut i32) {
    assert!(a != b, "the two indexes must differ");
    assert!(a < values.len() && b < values.len(), "index out of range");
    let start = values.as_mut_ptr();
    // SAFETY: both indexes are in range, and they differ, so the two references lead to
    // different elements of a slice that this function has exclusive access to.
    unsafe { (&mut *start.add(a), &mut *start.add(b)) }
}

fn main() {
    let mut scores = [10, 20, 30, 40];
    let (first, last) = pair_mut(&mut scores, 0, 3);
    *first += *last;
    *last = 0;
    println!("{scores:?}");
}`, name: 'pair_mut.rs', expect: '[50, 20, 30, 0]\n' },
            { list: [
              "The two `assert!` lines are ordinary safe code, and the whole argument rests on them. Without `a != b`, a caller could ask for the same element twice and receive two `&mut` to it. That would be undefined behavior caused by a call with no `unsafe` in it.",
              "`start.add(a)` is the address of element `a`, and `&mut *` turns it back into a reference. That is the step the comment has to justify.",
              "The signature is safe and ordinary. Its elided lifetimes tie both results to the borrow of `values`, so the caller cannot touch the slice while they are alive, and cannot keep them after the slice is gone. The borrow checker goes on protecting every caller.",
            ] },
            "A function like this is called **sound**: no safe code can call it in a way that causes undefined behavior. Bad arguments get a panic, which is defined. A function that is safe to call and can still be driven to undefined behavior by some argument is **unsound**. That is a bug in the function, never in its caller.",
            "The standard library is built this way. The error message above pointed at one example, `split_at_mut`, which cuts one mutable slice into two that do not overlap.",
            { run: rs`fn main() {
    let mut values = [1, 2, 3, 4, 5];
    let (left, right) = values.split_at_mut(2);
    left[0] = 10;
    right[0] = left[1] * 15;
    println!("{left:?} {right:?}");
    println!("{values:?}");
}`, name: 'split_at_mut.rs', expect: '[10, 2] [30, 4, 5]\n[10, 2, 30, 4, 5]\n' },
            { strip: {
              title: 'What `values.split_at_mut(2)` hands back',
              cells: [10, 2, 30, 4, 5],
              marks: [{ at: 0, span: 2, label: '`left`' }, { at: 2, span: 3, label: '`right`' }],
              caption: "One buffer and two mutable slices. No element is in both, so two writers cannot meet. The compiler cannot see that from the body of the function, which is why the body uses raw pointers. A challenge below has you write it.",
            } },
            "`Vec` is the same idea at a larger scale. Lesson 4 drew a `Vec` as a pointer, a length and a capacity. The three fields are private, and the methods keep promises about them that the compiler knows nothing of: the pointer leads to room for `capacity` elements, and the first `len` of them are initialized. `push` checks the capacity, writes one element through a raw pointer and adds one to `len`. Here are the last two steps done by hand.",
            { run: rs`fn main() {
    let mut numbers: Vec<i32> = Vec::with_capacity(4);
    numbers.push(10);
    numbers.push(20);

    let start = numbers.as_mut_ptr();
    // SAFETY: the capacity is at least 4, so slot 2 is inside the allocation, and after
    // the write the first three slots are initialized.
    unsafe {
        start.add(2).write(30);     // the buffer has a third value; the Vec still says two
        numbers.set_len(3);         // now it says three
    }
    println!("{numbers:?} {}", numbers.len());
}`, name: 'by_hand.rs', expect: '[10, 20, 30] 3\n' },
            { strip: {
              title: 'The buffer of `numbers` after the write',
              cells: [10, 20, 30, null],
              marks: [{ at: 0, span: 3, label: '`len` is 3: initialized' }],
              dim: [3],
              kicker: 'Heap',
              caption: "The capacity is 4, so the allocation has a fourth slot. Nothing has been written to it, and reading it would be undefined behavior. `len` is the line between memory that safe code may see and memory it may not.",
            } },
            "`set_len` is an `unsafe` method because every safe method of `Vec` trusts `len`. Set it to 4 here, and `numbers[3]` would pass its bounds check and read memory that nobody wrote. A bounds check is only as good as the number it compares with.",
            { list: [
              "**The unsafe block is small, and the reasoning is not.** To check `pair_mut` you read the asserts above the block. To check `Vec` you read every method that touches `len`. The unit to review is the module, and private fields are what stop code outside it from breaking the promises.",
              "**Safe callers are never to blame.** When a program made only of safe code corrupts memory, the bug is in an `unsafe` block it depends on, or in the code beside that block that failed to keep a promise. That is a short list of places to look.",
              "**Most programs need none of this.** You used `Vec`, `String`, `Rc` and `Mutex` for twenty lessons without writing `unsafe`. Reach for it to build a type of that kind or to call foreign code. It is not a way to quiet the borrow checker.",
            ] },
            { compare: "This is the arrangement Python has with NumPy, and PHP with its extensions written in C: fast code that manages memory by hand, behind an interface the high-level language cannot misuse. When NumPy crashes the interpreter, that is a bug in NumPy, not in your script. Rust puts both sides of the arrangement in one language and marks the border with a keyword." },
          ],
        },
        {
          title: 'Miri: a detector for undefined behavior',
          body: [
            "Testing does not find undefined behavior, because a program that has it can still print the expected output. What is needed is a tool that checks the rules themselves. For Rust that tool is **Miri**. It is an interpreter: it runs your program one operation at a time and tracks, for every byte and every pointer, whether the access about to happen is allowed. Is the memory still allocated? Was it initialized? May this pointer reach it? Do the references still obey the aliasing rule?",
            "Give Miri the dangling-pointer program from the last section, the one that compiles cleanly and probably prints 7. It stops at the read and reports what is wrong, where the memory was created and where it was given back:",
            { text: rs`error: Undefined Behavior: memory access failed: alloc270 has been freed, so this pointer is dangling
 --> src/main.rs:8:29
  |
8 |     println!("{}", unsafe { *pointer });
  |                             ^^^^^^^^ Undefined Behavior occurred here
  |
help: alloc270 was allocated here:
 --> src/main.rs:4:13
  |
4 |         let value = 7;
  |             ^^^^^
help: alloc270 was deallocated here:
 --> src/main.rs:6:5
  |
6 |     }
  |     ^` },
            { native: [
              "Miri comes with the nightly toolchain, which installs beside the stable one. Install it once, then run a program or its tests under it.",
              { shell: 'rustup toolchain install nightly --component miri\ncargo +nightly miri run\ncargo +nightly miri test', name: 'Terminal · install Miri, then run a program or its tests under it' },
              "The Run buttons in this manual do not use Miri. The Rust Playground does offer it: open `play.rust-lang.org`, paste a program and choose Miri from the Tools menu. That is the quickest way to try it on the program from the last section.",
            ] },
            { list: [
              "**It checks what runs.** A branch that no test takes is never examined, so Miri is as good as your tests. Test the edges of every `unsafe` block: empty input, the last element, the largest size.",
              "**A clean run is evidence, not proof.** It says that this run, with these inputs, broke no rule.",
              "**It is slow, and it stays inside Rust.** An interpreted program can be fifty times slower than the compiled one. Miri cannot follow a call into C code, apart from a few common C functions that it imitates.",
            ] },
            { tip: "Clippy helps too. It warns about a public `unsafe fn` whose documentation has no `# Safety` section, and it has an optional lint that asks for a `// SAFETY:` comment on every `unsafe` block." },
          ],
        },
        {
          title: 'Calling C',
          body: [
            "The most common reason to write `unsafe` in an application is to call code that is not Rust. Most operating systems, databases and codecs offer a C interface, and Rust can call C directly: same calling convention, no wrapper layer, no cost. You declare the function, and the linker finds it.",
            { run: rs`use std::ffi::{c_char, CString};

// Functions from the C library, which every Rust program is linked with already.
// The block is unsafe because nothing checks these signatures against the C side.
unsafe extern "C" {
    fn strlen(text: *const c_char) -> usize;    // unsafe to call: needs a valid C string
    safe fn sqrt(value: f64) -> f64;            // declared safe: fine for every argument
}

fn main() {
    println!("{}", sqrt(2.25));                 // no unsafe needed

    // A C string ends at the first zero byte. CString makes a copy with that byte added.
    let text = CString::new("hello, C").expect("the text has no zero byte inside");
    // SAFETY: text owns a buffer that ends in a zero byte and lives to the end of main.
    let length = unsafe { strlen(text.as_ptr()) };
    println!("{length}");

    // A literal with a c prefix gets its zero byte from the compiler.
    // SAFETY: a literal lives for the whole program.
    println!("{}", unsafe { strlen(c"literal".as_ptr()) });

    println!("{}", CString::new("zero\0inside").is_err());
}`, name: 'call_c.rs', expect: '1.5\n8\n7\ntrue\n' },
            { list: [
              "`extern \"C\"` means these functions use the C calling convention. The block itself must be written `unsafe extern`, because the declarations are a claim the compiler has to take on trust. If a signature here disagrees with the real function, every call is undefined behavior.",
              "Inside the block, a function is `unsafe` to call unless it is declared `safe fn`. Use `safe` only when no argument at all can cause trouble. `sqrt` qualifies. `strlen` does not: it reads memory until it finds a zero byte, so it needs a pointer to a properly ended string.",
              "`c_char`, `c_int` and the other names in `std::ffi` are the Rust types that match C's `char`, `int` and so on for the machine you are building for.",
            ] },
            "Text needs care at this border. A Rust `&str` is a pointer and a length, with no terminator, and it may hold zero bytes in the middle. C text has no length and ends at the first zero byte. `CString` is the owned bridge: `CString::new` copies the text into a new buffer and adds the zero byte, and it returns an `Err` if the text already had one inside. `CStr` is the borrowed form, and the pair is to C text what `String` and `&str` are to Rust text.",
            { pitfall: [
              "The pointer from `as_ptr` is valid only while the `CString` is alive. Chain the calls in one statement, and the `CString` is a temporary that is dropped at the semicolon, leaving the pointer dangling. This mistake is common enough that the compiler has a warning for exactly this pattern:",
              { run: rs`use std::ffi::CString;

fn main() {
    let pointer = CString::new("temporary").unwrap().as_ptr();
    println!("{}", pointer.is_null());      // not null, and not valid either
}`, name: 'dangling_cstring.rs', warns: true, expect: 'false\n' },
              "The cell only asks whether the pointer is null, which is safe. Passing it to `strlen` would be undefined behavior. Bind the `CString` to a variable first, as `call_c.rs` does.",
            ] },
            "Structs cross the border too, with one adjustment. Rust is free to reorder the fields of a struct to make it smaller, and it does. C lays fields out in the order they are written. `#[repr(C)]` tells Rust to use C's layout for one type.",
            { run: rs`use std::ffi::c_int;
use std::mem::offset_of;

#[allow(dead_code)]     // these two structs are only measured, never built
struct Compact {
    flag: u8,
    count: u32,
    tag: u8,
}

#[allow(dead_code)]
#[repr(C)]
struct LikeC {
    flag: u8,
    count: u32,
    tag: u8,
}

// The type div_t from C's stdlib.h: two ints, in this order.
#[repr(C)]
struct DivResult {
    quot: c_int,
    rem: c_int,
}

unsafe extern "C" {
    fn div(numerator: c_int, denominator: c_int) -> DivResult;
}

fn main() {
    println!("{} {}", size_of::<Compact>(), size_of::<LikeC>());
    println!("{} {} {}", offset_of!(LikeC, flag), offset_of!(LikeC, count), offset_of!(LikeC, tag));

    // SAFETY: the divisor is not zero, and DivResult has the layout of div_t.
    let result = unsafe { div(17, 5) };
    println!("{} remainder {}", result.quot, result.rem);
}`, name: 'repr_c.rs', expect: '8 12\n0 4 8\n3 remainder 2\n' },
            "`Compact` takes 8 bytes because Rust moved the two `u8` fields together. `LikeC` takes 12, with padding after `flag` and after `tag`, exactly as a C compiler would lay it out. `div` returns a C struct by value, and the call works because `DivResult` matches it field for field.",
            { native: [
              "Declarations for a large C library are not written by hand. The `bindgen` tool reads a C header and writes the `unsafe extern` block and the `repr(C)` types. The `cc` crate compiles C source files as part of `cargo build`. Lesson 22 showed how crates are added.",
              "Calls go the other way as well. A Rust function marked like this can be called from C, and from anything that can call C, which includes Python through `ctypes` and PHP through `FFI`:",
              { code: rs`#[unsafe(no_mangle)]                      // keep the name "add" in the compiled library
pub extern "C" fn add(a: i32, b: i32) -> i32 {
    a + b
}` },
            ] },
            { compare: "Python's `ctypes`, PHP's `FFI` and Node's native add-ons look a function up by name while the program runs, and convert each argument on the way in and out. A Rust call to C is an ordinary machine-level call, resolved when the program is linked. That is why the fast parts of Python and Node packages are increasingly written in Rust, with the `pyo3` and `napi` crates generating the glue." },
          ],
        },
        {
          title: 'Reading macros',
          body: [
            "Every name that ended in `!` in this course was a macro: `println!`, `vec!`, `format!`, `assert_eq!`, `matches!`, `todo!`. A macro is code that writes code. The compiler replaces each macro call with ordinary Rust before it checks types, and then checks the result as if you had typed it. Macros exist for what a function cannot do.",
            { list: [
              "Take any number of arguments, as `vec![1, 2, 3]` and `println!` do. Rust functions have a fixed number of parameters.",
              "Take something that is not a value: a format string to be read at compile time, or the pattern in `matches!(x, Some(_))`.",
              "Know where they were called. `panic!` and `dbg!` report the file and line of the call.",
            ] },
            "It helps to know roughly what the two you use most turn into. The exact output changes between compiler versions, so read these as sketches.",
            { code: rs`// vec![1, 2, 3] becomes, roughly:
<[_]>::into_vec(Box::new([1, 2, 3]))        // an array on the heap, turned into a Vec: one allocation

// println!("{name} is {age}") becomes, roughly:
std::io::_print(format_args!("{name} is {age}\n"));

// and format_args!, which is built into the compiler, becomes a value holding
//   the fixed pieces of text:   "", " is ", "\n"
//   and for each placeholder:   a reference to the value, and the function that formats it
//                               (&name, Display::fmt), (&age, Display::fmt)` },
            "This is why a wrong format string is a compile error, as lesson 1 showed. The string is taken apart while the program is compiled. A `{}` with no argument is noticed then, and so is a `{}` for a type with no `Display`, because the expanded code names `Display::fmt` for that type and the type checker looks for it. Nothing parses the string at run time.",
            "You can write macros of your own with `macro_rules!`. A definition looks like a `match`, except that the patterns match pieces of source code. Here is a small version of `vec!`.",
            { run: rs`macro_rules! my_vec {
    // No arguments.
    () => {
        Vec::new()
    };
    // One or more expressions, separated by commas.
    ( $( $item:expr ),+ ) => {{
        let mut list = Vec::new();
        $( list.push($item); )+
        list
    }};
}

fn main() {
    let empty: Vec<i32> = my_vec![];
    let primes = my_vec![2, 3, 5, 7];
    let words = my_vec!["to", "be"];
    println!("{empty:?} {primes:?} {words:?}");
}`, name: 'my_vec.rs', expect: '[] [2, 3, 5, 7] ["to", "be"]\n' },
            { list: [
              "Each arm is `(pattern) => { template };`. The first arm whose pattern fits the call is used.",
              "`$item:expr` matches one expression and names it `$item`. Other kinds of fragment include `ident` for a name, `ty` for a type and `literal` for a literal.",
              "`$( … ),+` matches the part in parentheses one or more times, with commas between. `*` in place of `+` means zero or more.",
              "In the template, `$( list.push($item); )+` writes that line once for every expression that was matched. `my_vec![2, 3, 5, 7]` expands to four `push` calls.",
              "The template has two pairs of braces. The outer pair belongs to the macro syntax. The inner pair is a block, which makes the expansion one expression with the value `list`.",
            ] },
            "A macro's argument is a piece of syntax, not a value, and that has two consequences worth seeing.",
            { run: rs`macro_rules! square {
    ($value:expr) => {{
        let value = $value;        // evaluate the argument once
        value * value
    }};
}

fn main() {
    let value = 3;                              // the same name the macro uses inside
    println!("{}", square!(value + 1));

    let mut calls = 0;
    let mut next = || {
        calls += 1;
        calls + 4
    };
    println!("{}", square!(next()));
    println!("{calls}");
}`, name: 'square.rs', expect: '16\n25\n1\n' },
            { list: [
              "`square!(value + 1)` is 16. The argument is kept together as one expression, so the expansion multiplies `(value + 1)` by itself.",
              "The `value` inside the macro and the `value` in `main` do not collide, although the expansion puts them in one block. A name created inside a macro is kept apart from the names at the call. This is called **hygiene**.",
              "The template writes `$value` once and stores the result. A template of `$value * $value` would paste `next()` in twice and call the closure twice. An argument is evaluated every time it appears in the template.",
            ] },
            { fromC: "A C macro pastes text, so `#define SQUARE(x) x * x` turns `SQUARE(a + 1)` into `a + 1 * a + 1`, and every C macro is wrapped in parentheses in self-defense. A Rust macro works on parsed syntax, so the argument stays one expression, and its local names cannot capture yours. Evaluating an argument twice is the one classic trap that remains." },
            { native: [
              "To see what any macro call turns into, `derive` lines included, install `cargo-expand` once and run it in a project. The Rust Playground has the same thing under Tools, as \"Expand macros\".",
              { shell: 'cargo install cargo-expand\ncargo expand', name: 'Terminal · print a crate with every macro expanded' },
            ] },
            "`#[derive(Debug)]` and the other attributes that write code are a second kind, the **procedural macro**: a Rust function that runs inside the compiler, receives your item as a stream of tokens and returns more code. That is how `thiserror` wrote the three implementations in lesson 19. Writing one is a topic of its own. Reading what one produced takes only `cargo expand`.",
            { tip: "Write a macro last. A function is easier to read, to test and to get error messages from, and generics cover most of what people first want a macro for. Macros earn their place when the thing that varies is not a value or a type: the number of arguments, a name, a pattern." },
          ],
        },
        {
          title: 'Where to go from here',
          body: [
            "This is the last lesson. Twenty-three lessons ago, a function that returned its last expression was news. Here is what you can do now.",
            { list: [
              "Read a signature and say who owns each value, who borrows it, and for how long.",
              "Read a borrow-checker error, name the bug it prevents, and choose among the standard fixes: rearrange, borrow for a shorter time, clone, or change who owns.",
              "Model data with structs and enums so that states which make no sense do not fit in the types, and handle absence and failure with `Option` and `Result`.",
              "Write code that works for many types with traits and generics, and pass behavior around as closures and iterator chains.",
              "Share data with `Rc` and `Arc` when one owner is not enough, and start threads that the compiler has checked for data races.",
              "Read an `unsafe` block and say what its author is promising.",
            ] },
            "What the course left out is mostly breadth: `async` in depth, the rest of the standard library, the crates real projects are assembled from, procedural macros. None of it asks for a new way of thinking. The hard part of Rust is ownership, and that part is behind you.",
            "The next step is to write a program you want to exist. Porting a script you already have in Python or PHP works well. A command-line tool that reads a file and prints a report is the right size, and it exercises ownership, errors, collections and iterators on a problem you already understand. When the borrow checker objects, clone first and get the program working. Then go back and take the clones out one at a time. Each one you remove is a small exercise in the lessons of Part 2.",
            "These are the places to read next. All of them are free.",
            { link: 'https://doc.rust-lang.org/book/', label: 'The Rust Programming Language' },
            "Known as the Book, and the official text. It covers the same ground as this course in a different order, so it works as a second explanation of anything that has not settled, and its three projects show whole programs: a guessing game, a command-line search tool and a small web server.",
            { link: 'https://rustlings.rust-lang.org/', label: 'Rustlings' },
            "Around a hundred small exercises that you fix in your own editor, with the real compiler watching the files. It is the nearest thing to the challenges here, on your machine, and a good way to get used to working with Cargo.",
            { link: 'https://doc.rust-lang.org/std/', label: 'The standard library documentation' },
            "Read the method lists of `Option`, `Result`, `Iterator`, `Vec`, `str` and `HashMap` from top to bottom once. Most questions that begin \"how do I\" end on one of those pages, and every page links to the source.",
            { link: 'https://doc.rust-lang.org/nomicon/', label: 'The Rustonomicon' },
            "The book about unsafe Rust: what exactly counts as undefined behavior, how `Vec` is implemented from nothing, and what a sound interface owes its callers. Read it before you write unsafe code that others will depend on.",
            { link: 'https://rust-lang.github.io/async-book/', label: 'Asynchronous Programming in Rust' },
            "What `async` and `await` compile to, when a program needs them, and where a runtime such as Tokio comes in. Lesson 23 gave the orientation, and this is the full account.",
            { native: [
              "The Book, the standard library documentation and the Rustonomicon were installed with the compiler. `rustup doc` opens them in a browser, with no network needed.",
              { shell: 'rustup doc --book\nrustup doc --std\nrustup doc --nomicon', name: 'Terminal · open the local copies' },
            ] },
            "The compiler has been arguing with you for 24 lessons, and by now you know that it was usually pointing at a real bug. That is the habit worth keeping: when it says no, find out what it is protecting before you look for a way around it.",
          ],
        },
      ],
      takeaways: [
        "`unsafe` unlocks five operations, of which dereferencing a raw pointer and calling an `unsafe` function matter most. The borrow checker, the type checker and bounds checks stay on.",
        "A raw pointer is an address with a type and no guarantees. Making one is safe. Reading or writing through one is yours to justify.",
        "Undefined behavior means no promise about anything the program does, and it can look like a correct result. Overflow, panics and leaks are bugs, but they are defined.",
        "The pattern is a small `unsafe` block inside a function that checks its arguments, so that no safe caller can cause undefined behavior. If safe code corrupts memory, the bug is in the unsafe code it relies on.",
        "Miri runs a program and reports undefined behavior on the paths that execute. A clean run is evidence, not proof.",
        "C functions are declared in an `unsafe extern \"C\"` block. Text crosses as `CString` and `CStr`, and structs need `#[repr(C)]`.",
        "A macro is expanded into ordinary code at compile time and then type-checked. Its arguments are pieces of syntax, so one that appears twice in the template is evaluated twice.",
      ],
      quiz: [
        {
          kind: 'multi',
          q: 'Which of these does an `unsafe` block allow that safe code does not?',
          options: [
            { t: 'Dereferencing a raw pointer', ok: true, why: "This is the first of the five. Making the pointer is safe, and reading or writing through it needs `unsafe`." },
            { t: 'Calling a function declared `unsafe fn`', ok: true, why: "The block is where the caller accepts the conditions the function documents under `# Safety`." },
            { t: 'Reading or writing a `static mut`', ok: true, why: "A mutable global can be reached from any thread, so the compiler cannot rule out a data race. You have to." },
            { t: 'Holding two `&mut` references to one value at the same time', why: "The borrow checker runs inside the block as it does outside, and reports `E0499`. Forcing it through raw pointers does not make it allowed either: two live `&mut` to one value is undefined behavior." },
            { t: 'Using a value after it has been moved', why: "Moves are tracked inside `unsafe` exactly as elsewhere. The lesson has a cell that is rejected with `E0382` for this." },
            { t: 'Indexing with `values[i]` past the end without a panic', why: "The bounds check of `[]` stays on. Skipping it takes a call to the unsafe method `get_unchecked`, which is the second ability and not a change to indexing." },
          ],
          hint: "Three of them. `unsafe` adds abilities and removes no checks.",
        },
        {
          q: 'Which line stops this program from compiling?',
          code: rs`fn main() {
    let values = [10, 20, 30];
    let first = values.as_ptr();
    let third = first.wrapping_add(2);
    println!("{}", first == third);
    println!("{}", third.is_null());
    println!("{}", *third);
}`,
          options: [
            { t: 'Line 7: reading through a raw pointer needs an `unsafe` block', ok: true, why: "Everything before it only handles addresses. The dereference is the one operation here that depends on the pointer being valid, so it is the one the compiler makes you sign for, with `E0133`." },
            { t: 'Line 3: making a raw pointer needs `unsafe`', why: "Making a raw pointer is safe. An address is only a number until something reads or writes through it." },
            { t: 'Line 4: pointer arithmetic needs `unsafe`', why: "That is true of `add`, which promises that the result stays inside the same allocation. `wrapping_add` makes no promise and only computes an address, so it is safe to call. Using the result is another matter." },
            { t: 'None: it prints `false`, `false` and `30`', why: "That is what it prints once line 7 says `unsafe { *third }`. Comparing pointers and asking `is_null` are safe, and the dereference is not." },
          ],
          verify: 'E0133',
        },
        {
          q: 'A program contains no `unsafe` of its own. It calls `get_pair`, a safe function from a crate, which has an `unsafe` block inside. With some arguments the program corrupts memory. Where is the bug?',
          options: [
            { t: 'In the crate: a safe function must be sound for every argument that safe code can pass', ok: true, why: "The signature of a safe function is a promise that no call can cause undefined behavior. If some arguments would, the function has to check for them and panic or return an error. `get_pair` is unsound." },
            { t: 'In the program: it passed arguments that `get_pair` was not written for', why: "That would be the answer for an `unsafe fn`, whose caller accepts conditions. A safe function has no conditions the caller can break. It may reject bad arguments with a panic, but not with corrupted memory." },
            { t: 'In the compiler: safe Rust cannot corrupt memory', why: "The guarantee is that safe code is memory-safe as long as the unsafe code it relies on is correct. Compiler bugs exist and are rare. The `unsafe` block is the first place to look." },
            { t: 'There is no telling: memory corruption can come from anywhere in a program', why: "In C that is the situation. In Rust the places to look are the `unsafe` blocks and the modules whose invariants they depend on, and a search for the keyword lists them." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these are undefined behavior?',
          options: [
            { t: 'Reading through a raw pointer to a local variable of a function that has returned', ok: true, why: "The storage has been given back. The pointer dangles, and the read may find anything." },
            { t: 'Using raw pointers to make two `&mut` references to the same `i32`, and writing through both', ok: true, why: "A `&mut` must be the only way to reach its value while it is in use. The optimizer relies on that, in unsafe code as well." },
            { t: '`unsafe { std::mem::transmute::<u8, bool>(2) }`, which reinterprets the byte 2 as a `bool`', ok: true, why: "A `bool` must be 0 or 1. Producing any other bit pattern is undefined behavior at once, before the value is used." },
            { t: 'Two threads adding to one `static mut` counter with no lock', ok: true, why: "That is a data race: unsynchronized access from two threads, with at least one write." },
            { t: 'Adding 1 to a `u8` that holds 255', why: "Overflow is defined in Rust: a panic in a debug build and a wrap in a release build. It is a bug, and not undefined behavior. In C, signed overflow is undefined." },
            { t: 'Indexing a `Vec` of three elements with `v[10]`', why: "The bounds check turns this into a panic, which is a defined outcome. Only `get_unchecked(10)` would be undefined behavior." },
            { t: 'Two `Rc` values that own each other and are never freed', why: "A leak is safe. Lesson 20 built this cycle without `unsafe`. Memory that is never freed is never read after being freed." },
          ],
          hint: "Four of them. A panic is a defined outcome, and so is a leak.",
        },
        {
          q: 'When is the format string in `println!("{} items", count)` taken apart?',
          options: [
            { t: 'While the program is compiled: the macro expands to code that holds the pieces, and a missing argument or a type with no `Display` is a compile error', ok: true, why: "`println!` is a macro, so it runs in the compiler. The expansion names the formatting function for each argument, and the type checker verifies it. Nothing reads the string when the program runs." },
            { t: 'While the program runs, each time the line is reached', why: "That is how `printf` works in C and PHP, and the `%` operator in Python. It is why those can fail, or misprint, at run time." },
            { t: 'While the program is compiled, by pasting text as a C `#define` does', why: "A Rust macro works on parsed syntax, not on text, and its output is type-checked like hand-written code. That is the reason the `{}` can be checked against the type of `count`." },
            { t: 'Never: `println!` is a function that takes any number of arguments', why: "Rust functions have a fixed number of parameters. The `!` marks a macro, and taking any number of arguments is one of the things macros are for." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`macro_rules! twice {
    ($value:expr) => {
        $value + $value
    };
}

fn main() {
    let mut count = 0;
    let mut next = || {
        count += 1;
        count * 10
    };
    let total = twice!(next());
    println!("{total} {count}");
}`,
          answer: '30 2',
          explain: "The macro receives the expression `next()`, not its value, and the template writes it twice. The expansion is `next() + next()`, so the closure runs twice: 10 plus 20. A function would have evaluated its argument once. A macro that needs a value twice should store it in a `let` first.",
          hint: "Write out what `twice!(next())` becomes after the template is filled in.",
        },
        {
          kind: 'multi',
          q: 'Which of these pairings of a situation and a tool are right?',
          options: [
            { t: 'The tests pass, and you want to know whether the `unsafe` block they exercise breaks a pointer rule: run the tests under Miri', ok: true, why: "Miri checks each access against the rules, so it catches undefined behavior that happens to produce the right output." },
            { t: 'You want to see the code that a `derive` or a `macro_rules!` call turns into: `cargo expand`', ok: true, why: "It prints the crate with every macro expanded into ordinary Rust." },
            { t: 'You need to call a function from a C library: declare it in an `unsafe extern "C"` block', ok: true, why: "The declaration gives the name and signature, and the linker connects it. For a large library, `bindgen` writes the declarations from the header." },
            { t: 'You want proof that an `unsafe` block is correct for every input: one clean Miri run', why: "Miri examines the runs it is given. Like a test, it can show that a bug is present and cannot show that none is." },
            { t: 'The borrow checker rejects two overlapping `&mut` borrows: put the code in an `unsafe` block', why: "The borrow checker is not switched off inside `unsafe`, so the error stays. If the borrows really overlap, forcing them through raw pointers is undefined behavior. Rearrange the code, or use a safe method such as `split_at_mut`." },
            { t: 'A struct must have the field order a C library expects: add `#[derive(Clone, Copy)]`', why: "Those make the type copyable and say nothing about layout. The attribute for C's field order is `#[repr(C)]`." },
          ],
          hint: "Three pairings are right. Ask of each tool what it checks, and what it cannot.",
        },
      ],
      challenges: [
        {
          id: 'raw-read',
          title: 'Read through a raw pointer',
          level: 'warm-up',
          unsafe: true,
          prompt: [
            "C code hands over an array as a pointer to its first element and a count. Write the function that reads one element from such a pair, and refuses when it should.",
            "`read_at` returns `Some` with element `index` of the `len` values that start at `start`. It returns `None` if `start` is null or if `index` is not less than `len`. The starter reads the first element whatever the index is.",
            "The function is an `unsafe fn`, because it has a condition that it cannot check for itself. The condition is in its documentation. The tests call it inside `unsafe` blocks and keep to that condition.",
          ],
          signature: 'unsafe fn read_at(start: *const i32, len: usize, index: usize) -> Option<i32>',
          starter: rs`/// Element index of the len values that start at start.
///
/// # Safety
/// start must be null, or point to at least len initialized i32 values.
pub unsafe fn read_at(start: *const i32, len: usize, index: usize) -> Option<i32> {
    if start.is_null() || len == 0 {
        return None;
    }
    // SAFETY: start is not null, so the caller promises len values behind it, and len is at least 1.
    Some(unsafe { *start })
}`,
          hints: [
            "The check that is missing compares `index` with `len`. With `index >= len` in the `if`, the separate test for `len == 0` is no longer needed.",
            "`start.add(index)` is a pointer to element `index`. It is an unsafe method, and it belongs inside the same `unsafe` block as the dereference.",
            "`if start.is_null() || index >= len { return None; }` and then `Some(unsafe { *start.add(index) })`. Rewrite the `SAFETY` comment to say why `index` is in range.",
          ],
          solution: rs`/// Element index of the len values that start at start.
///
/// # Safety
/// start must be null, or point to at least len initialized i32 values.
pub unsafe fn read_at(start: *const i32, len: usize, index: usize) -> Option<i32> {
    if start.is_null() || index >= len {
        return None;
    }
    // SAFETY: start is not null, so the caller promises len values behind it, and index < len.
    Some(unsafe { *start.add(index) })
}`,
          tests: [
            { label: 'Reads the first element', body: rs`let values = [10, 20, 30];
assert_eq!(unsafe { read_at(values.as_ptr(), values.len(), 0) }, Some(10));` },
            { label: 'Reads the elements after it', body: rs`let values = [10, 20, 30];
assert_eq!(unsafe { read_at(values.as_ptr(), values.len(), 1) }, Some(20));
assert_eq!(unsafe { read_at(values.as_ptr(), values.len(), 2) }, Some(30));` },
            { label: 'Refuses an index at or past the length', body: rs`let values = [10, 20, 30];
assert_eq!(unsafe { read_at(values.as_ptr(), values.len(), 3) }, None);
assert_eq!(unsafe { read_at(values.as_ptr(), values.len(), usize::MAX) }, None);` },
            { label: 'Refuses a null pointer, whatever the length says', body: rs`assert_eq!(unsafe { read_at(std::ptr::null(), 0, 0) }, None);
assert_eq!(unsafe { read_at(std::ptr::null(), 5, 2) }, None);` },
            { label: 'A length of zero has no elements', body: rs`let values = [10, 20, 30];
assert_eq!(unsafe { read_at(values.as_ptr(), 0, 0) }, None);` },
            { label: 'Respects the length it was given, not the size of the array', body: rs`let values = [10, 20, 30, 40];
let tail = values[1..3].as_ptr();
assert_eq!(unsafe { read_at(tail, 2, 1) }, Some(30));
assert_eq!(unsafe { read_at(tail, 2, 2) }, None, "index 2 is past a length of 2, although the array goes on");` },
          ],
        },
        {
          id: 'my-split-at-mut',
          title: 'Write split_at_mut',
          level: 'core',
          unsafe: true,
          forbid: ['split_at_mut', 'split_at_mut_checked', 'split_at_mut_unchecked'],
          prompt: [
            "Write the standard library's `split_at_mut` yourself: cut one mutable slice into two that do not overlap. The left one holds the elements before index `mid`, and the right one holds the rest.",
            "The starter is safe and wrong. It returns the whole slice on the left and an empty slice on the right, because safe code cannot do better. The two halves have to be built from a raw pointer and a length each, with `std::slice::from_raw_parts_mut(pointer, length)`.",
            "The function is safe to call, so it must be sound for every argument. Keep the `assert!`: a `mid` past the end has to panic.",
          ],
          signature: 'fn my_split_at_mut<T>(values: &mut [T], mid: usize) -> (&mut [T], &mut [T])',
          starter: rs`pub fn my_split_at_mut<T>(values: &mut [T], mid: usize) -> (&mut [T], &mut [T]) {
    assert!(mid <= values.len(), "mid is past the end of the slice");
    // Safe, and wrong: everything on the left, nothing on the right.
    (values, &mut [])
}`,
          hints: [
            "Take what you need from `values` before the unsafe part: `let len = values.len();` and `let start = values.as_mut_ptr();`. After that, work only with `start`.",
            "The left half starts at `start` and has `mid` elements. The right half starts at `start.add(mid)` and has `len - mid` elements.",
            "`unsafe { (std::slice::from_raw_parts_mut(start, mid), std::slice::from_raw_parts_mut(start.add(mid), len - mid)) }`, under a `SAFETY` comment that says why the two ranges are inside the slice and share no element.",
          ],
          solution: rs`pub fn my_split_at_mut<T>(values: &mut [T], mid: usize) -> (&mut [T], &mut [T]) {
    let len = values.len();
    let start = values.as_mut_ptr();
    assert!(mid <= len, "mid is past the end of the slice");
    // SAFETY: mid <= len, so the ranges [0, mid) and [mid, len) both lie inside the slice,
    // and no element is in both. The slice was borrowed mutably, so nothing else can reach it.
    unsafe {
        (
            std::slice::from_raw_parts_mut(start, mid),
            std::slice::from_raw_parts_mut(start.add(mid), len - mid),
        )
    }
}`,
          solutionNote: "The signature does the rest of the work. Its elided lifetimes tie both halves to the borrow of `values`, so a caller can neither keep a half after the slice is gone nor use the slice while a half is alive.",
          tests: [
            { label: 'Cuts the slice at mid', body: rs`let mut values = [1, 2, 3, 4, 5];
let (left, right) = my_split_at_mut(&mut values, 2);
assert_eq!(left, [1, 2]);
assert_eq!(right, [3, 4, 5]);` },
            { label: 'Both halves can be changed while both are alive', body: rs`let mut values = [1, 2, 3, 4, 5];
let (left, right) = my_split_at_mut(&mut values, 2);
left[0] = 10;
right[0] = 30;
left[1] += right[2];
assert_eq!(values, [10, 7, 30, 4, 5]);` },
            { label: 'A mid of 0 or of the length gives one empty half', body: rs`let mut values = [1, 2, 3];
let (left, right) = my_split_at_mut(&mut values, 0);
assert!(left.is_empty());
assert_eq!(right, [1, 2, 3]);
let (left, right) = my_split_at_mut(&mut values, 3);
assert_eq!(left, [1, 2, 3]);
assert!(right.is_empty());` },
            { label: 'Works on an empty slice', body: rs`let mut values: [i32; 0] = [];
let (left, right) = my_split_at_mut(&mut values, 0);
assert!(left.is_empty() && right.is_empty());` },
            { label: 'Works for elements that own heap memory', body: rs`let mut words = vec![String::from("left"), String::from("right"), String::from("end")];
let (left, right) = my_split_at_mut(&mut words, 1);
std::mem::swap(&mut left[0], &mut right[0]);
right[1].push('!');
assert_eq!(words, ["right", "left", "end!"]);` },
            { label: 'Panics when mid is past the end', body: rs`assert!(panics(|| {
    let mut values = [1, 2, 3];
    let _ = my_split_at_mut(&mut values, 4);
}), "a safe function must refuse a mid past the end, not build a slice out of bounds");` },
          ],
        },
        {
          id: 'c-strlen',
          title: 'A safe wrapper around strlen',
          level: 'core',
          unsafe: true,
          forbid: ['len', 'count'],
          prompt: [
            "C's `strlen` takes a pointer to text that ends in a zero byte, and returns the number of bytes before that zero. Its C declaration is `size_t strlen(const char *s);`, and `size_t` is `usize` in Rust.",
            "Declare it, and write `c_length`, a safe function that any Rust code can call with any `&str`. It returns `Some` with the length C reports, or `None` if the text contains a zero byte, because C would stop counting there.",
            "The length has to come from C: `len` and `count` are not allowed in your code. Remember that a `&str` has no zero byte at its end, so its pointer cannot be given to `strlen` as it is.",
          ],
          signature: 'fn c_length(text: &str) -> Option<usize>',
          starter: rs`use std::ffi::{c_char, CString};

// Declare strlen here, in an unsafe extern "C" block.

pub fn c_length(text: &str) -> Option<usize> {
    None
}`,
          hints: [
            "The declaration is `unsafe extern \"C\" { fn strlen(text: *const c_char) -> usize; }`.",
            "`CString::new(text)` copies the text and adds the zero byte. It returns an `Err` when the text has a zero byte inside, and `.ok()?` turns that into returning `None`.",
            "`let owned = CString::new(text).ok()?;` and then `Some(unsafe { strlen(owned.as_ptr()) })`. Keep `owned` in a variable, so that the buffer is alive during the call.",
          ],
          solution: rs`use std::ffi::{c_char, CString};

unsafe extern "C" {
    fn strlen(text: *const c_char) -> usize;
}

pub fn c_length(text: &str) -> Option<usize> {
    let owned = CString::new(text).ok()?;
    // SAFETY: owned is a buffer that ends in a zero byte, and it is alive until this function returns.
    Some(unsafe { strlen(owned.as_ptr()) })
}`,
          solutionNote: "The wrapper is what makes the call safe for everyone else. It owns the three facts `strlen` needs and callers should not have to think about: the pointer is valid, the text is terminated, and the buffer outlives the call.",
          tests: [
            { label: 'Counts the bytes of plain text', body: rs`assert_eq!(c_length("hello"), Some(5));
assert_eq!(c_length("a longer piece of text"), Some(22));` },
            { label: 'The empty string has length 0', body: rs`assert_eq!(c_length(""), Some(0));` },
            { label: 'Counts bytes, not characters', body: rs`assert_eq!(c_length("héllo"), Some(6));
assert_eq!(c_length("🦀"), Some(4));` },
            { label: 'Text with a zero byte inside is refused', body: rs`assert_eq!(c_length("he\0llo"), None);
assert_eq!(c_length("\0"), None);` },
            { label: 'A slice of a longer string is measured by itself', body: rs`let sentence = String::from("hello world, and more after it");
assert_eq!(c_length(&sentence[..5]), Some(5), "the slice has no zero byte of its own, so strlen must not be given its pointer directly");
assert_eq!(c_length(&sentence[6..11]), Some(5));` },
          ],
        },
        {
          id: 'off-by-one-read',
          title: 'One slot too many',
          level: 'core',
          kind: 'fix',
          unsafe: true,
          prompt: [
            "`Stack` keeps up to eight numbers in an array and counts how many slots are in use. `as_slice` hands out the used part without a bounds check, through `std::slice::from_raw_parts(pointer, length)`. The length it passes is wrong.",
            "Nothing crashes, because the extra slot is still inside the array. The answers are simply wrong: a new stack shows a value it never held, and a popped value is still visible. Fix the length, and fix the `SAFETY` comment, which does not justify the code beneath it.",
            "This is how most unsafe bugs look in practice. No tool reports a read inside memory the program owns. Only the invariant tells you it is wrong: the first `len` slots are in use, and no others.",
          ],
          signature: 'fn as_slice(&self) -> &[i32]',
          starter: rs`pub struct Stack {
    slots: [i32; 8],     // storage for up to 8 values
    len: usize,          // how many slots are in use, counted from slot 0
}

impl Stack {
    pub fn new() -> Stack {
        Stack { slots: [0; 8], len: 0 }
    }

    pub fn push(&mut self, value: i32) {
        assert!(self.len < 8, "the stack is full");
        self.slots[self.len] = value;
        self.len += 1;
    }

    pub fn pop(&mut self) -> Option<i32> {
        if self.len == 0 {
            return None;
        }
        self.len -= 1;
        Some(self.slots[self.len])
    }

    /// The values in use, oldest first.
    pub fn as_slice(&self) -> &[i32] {
        // SAFETY: len is at most 8, so the slice stays inside the array.
        unsafe { std::slice::from_raw_parts(self.slots.as_ptr(), self.len + 1) }
    }

    pub fn sum(&self) -> i32 {
        self.as_slice().iter().sum()
    }
}`,
          hints: [
            "Count what `as_slice` returns for a new stack. `len` is 0, and the slice has one element.",
            "The length passed to `from_raw_parts` must be the number of slots in use, which is `self.len`. With `self.len + 1` and a full stack, the slice would have nine elements from an array of eight.",
            "`unsafe { std::slice::from_raw_parts(self.slots.as_ptr(), self.len) }`. The comment should say that `len` never exceeds 8, so the first `len` slots are inside the array, and that every slot is initialized.",
          ],
          solution: rs`pub struct Stack {
    slots: [i32; 8],     // storage for up to 8 values
    len: usize,          // how many slots are in use, counted from slot 0
}

impl Stack {
    pub fn new() -> Stack {
        Stack { slots: [0; 8], len: 0 }
    }

    pub fn push(&mut self, value: i32) {
        assert!(self.len < 8, "the stack is full");
        self.slots[self.len] = value;
        self.len += 1;
    }

    pub fn pop(&mut self) -> Option<i32> {
        if self.len == 0 {
            return None;
        }
        self.len -= 1;
        Some(self.slots[self.len])
    }

    /// The values in use, oldest first.
    pub fn as_slice(&self) -> &[i32] {
        // SAFETY: push never lets len exceed 8, so the first len slots lie inside the array,
        // and all eight slots were initialized by new.
        unsafe { std::slice::from_raw_parts(self.slots.as_ptr(), self.len) }
    }

    pub fn sum(&self) -> i32 {
        self.as_slice().iter().sum()
    }
}`,
          solutionNote: "The safe expression `&self.slots[..self.len]` returns the same slice with a bounds check, and it is what to write unless a measurement shows that the check matters. With a full stack, the starter's version would have built a slice that runs past the end of the array, which is undefined behavior. The tests stop short of that on purpose.",
          tests: [
            { label: 'A new stack shows no values', body: rs`let stack = Stack::new();
assert_eq!(stack.as_slice(), [0; 0]);` },
            { label: 'Shows what was pushed, oldest first', body: rs`let mut stack = Stack::new();
stack.push(4);
stack.push(8);
stack.push(15);
assert_eq!(stack.as_slice(), [4, 8, 15]);` },
            { label: 'A popped value is no longer visible', body: rs`let mut stack = Stack::new();
stack.push(5);
stack.push(6);
stack.push(7);
assert_eq!(stack.pop(), Some(7));
assert_eq!(stack.as_slice(), [5, 6], "slot 2 still holds the 7, but it is not in use");` },
            { label: 'sum adds only the values in use', body: rs`let mut stack = Stack::new();
stack.push(4);
stack.push(9);
assert_eq!(stack.pop(), Some(9));
assert_eq!(stack.sum(), 4);` },
            { label: 'A push after a pop reuses the slot', body: rs`let mut stack = Stack::new();
stack.push(1);
stack.push(2);
assert_eq!(stack.pop(), Some(2));
stack.push(8);
assert_eq!(stack.as_slice(), [1, 8]);
assert_eq!(stack.sum(), 9);` },
          ],
        },
        {
          id: 'max-macro',
          title: 'A max! for any number of arguments',
          level: 'stretch',
          prompt: [
            "Write `max!`, a macro that takes one or more expressions separated by commas and gives the largest. `max!(3, 9, 4)` is 9, and `max!(7)` is 7. It should work for any type that can be compared with `>`.",
            "Each argument must be evaluated exactly once. One test passes calls to a counting closure and checks the count.",
            "The starter accepts any number of arguments and returns the first. Two approaches work. The template can declare a variable and then repeat a comparison for every remaining argument, with `$( … )*`. Or the macro can have two arms and call itself: the largest of one value is that value, and the largest of several is the larger of the first and the largest of the rest.",
          ],
          signature: 'macro_rules! max',
          starter: rs`macro_rules! max {
    ($first:expr $(, $rest:expr)*) => {
        $first
    };
}`,
          hints: [
            "An arm for one argument is `($only:expr) => { $only };`. An arm for more is `($first:expr, $($rest:expr),+) => {{ … }};`. Put the arm for one argument first.",
            "In the second arm, evaluate each side once: `let first = $first;` and `let rest = max!($($rest),+);`. A macro may call itself, and `$($rest),+` writes the remaining arguments back out with commas between them.",
            "The second arm's block ends with `if first > rest { first } else { rest }`. The double braces make the expansion a block, so the two `let` lines are allowed and the `if` is its value.",
          ],
          solution: rs`macro_rules! max {
    ($only:expr) => {
        $only
    };
    ($first:expr, $($rest:expr),+) => {{
        let first = $first;
        let rest = max!($($rest),+);
        if first > rest { first } else { rest }
    }};
}`,
          solutionNote: "The loop form is `let mut largest = $first; $( let next = $rest; if next > largest { largest = next; } )* largest`, in one arm. Both evaluate every argument once, because each `$first` and `$rest` appears once in the template.",
          tests: [
            { label: 'One argument is its own maximum', body: rs`assert_eq!(max!(7), 7);` },
            { label: 'Two arguments, in either order', body: rs`assert_eq!(max!(3, 9), 9);
assert_eq!(max!(9, 3), 9);` },
            { label: 'Any number of arguments, with the largest anywhere', body: rs`assert_eq!(max!(4, 8, 15, 16, 23, 42), 42);
assert_eq!(max!(42, 8, 15), 42);
assert_eq!(max!(1, 50, 3, 7), 50);
assert_eq!(max!(-5, -2, -9), -2);` },
            { label: 'Arguments can be expressions', body: rs`let a = 5;
assert_eq!(max!(a * 2, a + 7, 3), 12);` },
            { label: 'Works for floats and for text', body: rs`assert_eq!(max!(2.5, 1.5, 2.25), 2.5);
assert_eq!(max!("pear", "apple", "fig"), "pear");` },
            { label: 'Evaluates each argument exactly once', body: rs`let mut calls = 0;
let mut next = || {
    calls += 1;
    calls * 10
};
let largest = max!(next(), next(), next());
assert_eq!(largest, 30);
assert_eq!(calls, 3, "three arguments, so the closure must run three times");` },
          ],
        },
      ],
    },
  );
})();
