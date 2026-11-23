// Part 2: Ownership, continued. References: lending a value without giving it up, and the rule that keeps every reference valid.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 2 · Ownership';

  (window.C_LESSONS ||= []).push(
    {
      id: 'borrowing',
      title: 'References & borrowing',
      category: part,
      minutes: 30,
      summary: 'A reference lets code use a value without owning it. This lesson covers what a reference is, what the compiler guarantees about it, and how to choose between borrowing and owning in a signature.',
      topics: ['&T', 'Dereferencing', 'Shared references', 'Dangling references', 'Borrow or own', 'Identity'],
      sections: [
        {
          title: 'Lending instead of giving',
          body: [
            "Lesson 5 ended on an awkward pattern. A function that takes a `String` takes ownership of it. So a function that only wants to look at the text has to hand it back when it is done, and the caller has to catch it.",
            { run: rs`fn measure(text: String) -> (String, usize) {
    let length = text.len();
    (text, length)                         // hand the String back, with the answer
}

fn main() {
    let title = String::from("tide tables");
    let (title, length) = measure(title);  // give it away, and take it back
    println!("{title}: {length} bytes");
}`, name: 'give_back.rs', expect: 'tide tables: 11 bytes\n' },
            "That works, and nobody wants to write it. `measure` never needed to own the text. It needed to read it for a moment. Rust has a way to say exactly that: a **reference**.",
            { run: rs`fn measure(text: &String) -> usize {       // &String: a reference to a String
    text.len()
}

fn main() {
    let title = String::from("tide tables");
    let length = measure(&title);          // &title: lend it, and keep owning it
    println!("{title}: {length} bytes");   // title was never given away
}`, name: 'lend.rs', expect: 'tide tables: 11 bytes\n' },
            { list: [
              "`&title` makes a reference to `title`. Making a reference is called **borrowing**, and the reference is often called a borrow.",
              "`&String` in the signature is the type of that reference. The `&` appears on both sides: the function asks for a loan, and the caller can see that it is giving one.",
              "`measure` does not own the `String`. When `text` goes out of scope at the end of `measure`, nothing is dropped and nothing is freed. A reference going away has no effect on the value.",
              "`title` owns the `String` from start to finish. It is dropped once, at the end of `main`, exactly as before.",
            ] },
            "Step through a shorter version and watch what the call actually passes.",
            { trace: {
              title: 'A reference points at the owner, and the owner points at the buffer',
              code: rs`fn measure(text: &String) -> usize {
    text.len()
}

fn main() {
    let title = String::from("tide");
    let length = measure(&title);
    println!("{title}: {length}");
}`,
              vars: [
                { id: 'title', type: 'String' },
                { id: 'length', type: 'usize' },
                { id: 'measure.text', name: 'text', type: '&String', frame: 'measure' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 4, frame: 'heap' },
              ],
              steps: [
                { line: 6, set: { title: { ptr: '&buf', len: 4, cap: 4 }, buf: ["'t'", "'i'", "'d'", "'e'"] }, say: "`title` owns a `String`: three words in the frame of `main`, and a buffer on the heap. The solid arrow means ownership." },
                { line: 7, set: { 'measure.text': '&title' }, say: "The call pushes a frame for `measure`. Its parameter holds one thing: the address of `title`. The dashed arrow means a borrow. Only that address was copied, and `title` has not moved." },
                { line: 2, say: "`text.len()` follows the reference to `title` and reads its length. Reaching the text itself would take two hops: to `title`, then to the buffer." },
                { line: 7, set: { length: 4 }, hide: ['frame:measure'], say: "`measure` returns and its frame is discarded. A reference owns nothing, so nothing is dropped. The loan is over." },
                { line: 8, say: "`title` is still the owner, and it is used as if nothing had happened." },
                { line: 9, dead: ['buf'], hide: ['title', 'length'], say: "`main` ends. `title` is dropped and the buffer is freed, once, by its one owner." },
              ],
            } },
            { compare: "In Python and JavaScript, and for objects in PHP, you have been passing references all along. `measure(title)` hands the function a reference to the same object, and nothing in the call says so. What is new in Rust is everything around the reference. It is asked for in the signature and granted at the call, both with `&`. The function cannot hold on to it after the call unless its signature says so. And through a plain `&` the function can only read. PHP's `function f(&$x)` is the nearest thing in syntax, and it marks only the function's side." },
            "This lesson is about `&T`, the reference that reads. Lesson 7 covers `&mut T`, the reference that can change what it points at.",
          ],
        },
        {
          title: 'References are pointers with guarantees',
          body: [
            "At run time a reference is one machine word: the address of the value it points at. Nothing else is stored. A `&String` and a `&i32` are both 8 bytes here, whatever the size of the thing they point at.",
            { run: rs`use std::mem::size_of;

fn main() {
    let count = 41;
    let r = &count;                  // r holds the address of count

    println!("{}", *r + 1);          // *r is the value that r points at
    println!("{}", r + 1);           // + accepts a reference to a number, and follows it for you
    println!("{r}");                 // println! follows it too: this prints the value, not the address

    let name = String::from("Ferris");
    let n = &name;
    let nn = &n;                     // a reference to a reference
    println!("{} {} {}", (*n).len(), n.len(), nn.len());    // a method call follows references for you
    println!("{} {} {}", size_of::<&i32>(), size_of::<&String>(), size_of::<Option<&String>>());
}`, name: 'deref.rs', expect: '42\n42\n41\n6 6 6\n8 8 8\n' },
            "The `*` operator **dereferences**: `*r` is the value that `r` points at. You need it less often than you might expect, because the places where references are used most follow them automatically.",
            { list: [
              "A method call through a reference dereferences as many times as it takes. `n.len()` and `(*n).len()` are the same call, and `nn.len()` reaches the same `String` through two references. There is no separate operator for calling through a pointer.",
              "`println!` and the other formatting macros print the value behind a reference.",
              "Arithmetic and comparison operators are defined for references to numbers, and work on the numbers.",
            ] },
            "Where a plain value is required, a reference will not do. The compiler says exactly what is missing:",
            { run: rs`fn main() {
    let count = 41;
    let r = &count;
    let next: i32 = r;
    println!("{next}");
}`, name: 'needs_star.rs', fails: 'E0308' },
            "`*r` is the fix. For a `Copy` type such as `i32`, dereferencing copies the value out. For a `String` it cannot, and section 5 shows why.",
            { memory: {
              title: 'A reference is an address, stored like any other value',
              vars: [
                { id: 'count', type: 'i32' },
                { id: 'r', type: '&i32' },
                { id: 'name', type: 'String' },
                { id: 'n', type: '&String' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 6, frame: 'heap' },
              ],
              set: { count: 41, r: '&count', name: { ptr: '&buf', len: 6, cap: 6 }, n: '&name', buf: ["'F'", "'e'", "'r'", "'r'", "'i'", "'s'"] },
              caption: "Solid arrows own and dashed arrows borrow. `r` points at another variable in the same frame. `n` points at `name`, and `name` owns the buffer. A reference can point at anything that has an address: the stack, the heap, or the inside of a larger value.",
            } },
            "So far this is a pointer, as in C. What makes it a reference is what the compiler guarantees about it.",
            { list: [
              "**It is never null.** A reference always points at a value. No `None`, `null` or `undefined` hides inside a `&String`. A reference that may be absent has the type `Option<&String>`, and the compiler makes you deal with the empty case before you use it. Lesson 13 covers `Option`.",
              "**It always points at a live value of its type.** A reference is made from an existing value with `&`, never from a number, and it cannot be moved along to a neighboring address with arithmetic. The compiler rejects any program in which a reference could be used after its value is gone. Sections 4 and 5 are about that.",
              "**The value does not change underneath it.** While a `&T` is in use, nothing changes the value, not even its owner. Lesson 7 is about that.",
            ] },
            "All three are proved when the program is compiled. Nothing is checked while it runs, so a reference costs exactly what a bare address costs.",
            { compare: "A variable that holds an object in Python, PHP or JavaScript is an address underneath as well. The runtime keeps the address valid by keeping the object alive for as long as anyone can reach it, which is the collector's job. And the variable can be `None`, `null` or `undefined` at any moment, which is why `'NoneType' object has no attribute` and `Cannot read properties of undefined` are among the most common errors those languages produce. A Rust reference gets its validity from the compiler instead of from a collector, and it has no empty state at all." },
            { aside: "The last line of the program above printed 8 for `Option<&String>` too. A reference is never the address zero, so the compiler uses zero to mean `None`. An optional reference costs no extra space, and the type still forces the check that a C programmer has to remember." },
            { fromC: "`&x` and `*p` mean what they meant in C at the machine level: take an address, and follow one. What is gone is everything that made pointers dangerous. There is no null reference, no arithmetic on references and no uninitialized reference, and the compiler tracks how long each one is valid." },
          ],
        },
        {
          title: 'Shared references are Copy',
          body: [
            "Lesson 5 divided types into those that move and those that are `Copy`. A reference `&T` is `Copy`, whatever `T` is. Assigning it or passing it copies the address, and the original reference stays usable. The value it points at is neither copied nor moved.",
            { run: rs`fn longer(a: &String, b: &String) -> bool {
    a.len() > b.len()
}

fn main() {
    let title = String::from("Dune");
    let sequel = String::from("Dune Messiah");

    let first = &title;
    let second = first;                      // copies the address: first stays usable
    println!("{first} {second} {title}");    // three ways to read one String

    println!("{}", longer(&sequel, first));
    println!("{}", longer(first, first));    // the same reference, passed twice
    println!("{first}");                     // and still usable afterwards
}`, name: 'copy_refs.rs', expect: 'Dune Dune Dune\ntrue\nfalse\nDune\n' },
            "This is why `&T` is called a **shared reference**. Any number of them can point at one value at the same time, and the owner can go on reading it too. They can coexist because none of them is able to change anything.",
            "A variable that holds a reference can itself be `mut`. That lets you point it at something else. It does not let you change what it points at.",
            { run: rs`fn main() {
    let short = String::from("ox");
    let long = String::from("albatross");

    let mut pick = &short;          // mut: pick can be pointed somewhere else
    println!("{pick}");
    if long.len() > pick.len() {
        pick = &long;               // pointed at the other String. Neither String changed or moved.
    }
    println!("{pick} {short} {long}");
}`, name: 'repoint.rs', expect: 'ox\nalbatross ox albatross\n' },
            "Borrowing also solves the loop problem from lesson 5. `for name in names` moves the `Vec` into the loop and each `String` out of it, so `names` is gone afterwards. `for name in &names` borrows the `Vec`, and gives the loop a `&String` for each element.",
            { run: rs`fn main() {
    let names = vec![String::from("Ada"), String::from("Grace"), String::from("Linus")];

    let mut bytes = 0;
    for name in &names {             // name is a &String
        bytes += name.len();
    }

    let first = &names[0];           // a reference to one element, where it sits in the Vec
    println!("{bytes} bytes in {} names, starting with {first}", names.len());
}`, name: 'borrow_loop.rs', expect: '13 bytes in 3 names, starting with Ada\n' },
            "`&names[0]` borrows the element in place. Without the `&` it would be an attempt to move the `String` out of the `Vec`, which lesson 5 showed is an error.",
            { compare: "A list of strings in Python is a list of references already, and `for name in names` hands you each one. The Rust loop does the same with `&names`. The difference is that you chose it. `for name in names`, without the `&`, is also valid Rust and means something else: take the list apart and give me the elements to keep." },
          ],
        },
        {
          title: "A reference can't outlive its owner",
          body: [
            "A reference is an address, and an address is only as good as what is stored there. Here is the bug that the next rule prevents. Suppose the compiler accepted this program, and step through what the machine would do.",
            { trace: {
              title: 'If this were allowed: a reference that outlives its value',
              code: rs`fn main() {
    let r;
    {
        let word = String::from("tide");
        r = &word;
    }
    println!("{r}");
}`,
              vars: [
                { id: 'r', type: '&String' },
                { id: 'word', type: 'String' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 4, frame: 'heap' },
              ],
              steps: [
                { line: 2, show: ['r'], say: "`r` is declared without a value. That is allowed, provided it is assigned before it is read." },
                { line: 4, set: { word: { ptr: '&buf', len: 4, cap: 4 }, buf: ["'t'", "'i'", "'d'", "'e'"] }, say: "Inside the block, `word` owns a `String` with its buffer on the heap." },
                { line: 5, set: { r: '&word' }, say: "`r` borrows `word`. Up to here everything is valid." },
                { line: 6, dead: ['buf'], hide: ['word'], say: "The block ends. `word` goes out of scope, so its `String` is dropped and the buffer is freed. `r` still holds the address where `word` used to be." },
                { line: 7, say: "`println!` would follow `r` to a stack slot that no longer holds a `String`, take whatever three words are there now, and follow one of them into freed memory. That is a **dangling reference**. Reading through it is the use after free from lesson 4." },
              ],
            } },
            "The rule: **a reference must not be used after the value it points at is gone.** The compiler checks it by comparing two stretches of the program: the lines on which the reference is used, and the lines on which the value exists.",
            { run: rs`fn main() {
    let r;
    {
        let word = String::from("tide");
        r = &word;
    }
    println!("{r}");
}`, name: 'outlives.rs', fails: 'E0597' },
            "Read the labels from top to bottom: where `word` is declared, where it is borrowed, where it is dropped while still borrowed, and where the borrow is used later. It is the trace above, drawn by the compiler.",
            "There are two ways out. Make the value live long enough, by declaring the owner in the outer scope. Or do not borrow at all: move the value out of the block, so that the outer variable owns it.",
            { run: rs`fn main() {
    // Fix 1: the owner is declared outside, so it is still there when r is used.
    let word = String::from("tide");
    let r;
    {
        r = &word;
    }
    println!("{r}");

    // Fix 2: move instead of borrowing. kept becomes the owner, and nothing is dropped at the brace.
    let kept;
    {
        let inner = String::from("ebb");
        kept = inner;
    }
    println!("{kept}");
}`, name: 'outlives_fixed.rs', expect: 'tide\nebb\n' },
            "The usual way to meet this rule is to return a reference to a local variable. The local is dropped when the function returns, which is the moment the caller receives the reference.",
            { run: rs`fn make_greeting() -> &String {
    let greeting = String::from("hello");
    &greeting
}

fn main() {
    let text = make_greeting();
    println!("{text}");
}`, name: 'return_local.rs', fails: 'E0106' },
            "The compiler stops at the signature, before it looks at the body. The line to read is the first `help:`. The return type contains a borrowed value, and there is no value for it to be borrowed from. A function with no reference among its parameters has nothing that will still exist after it returns, so it has nothing to lend. The last `help:` gives the fix, which is to return an owned value. The suggestion between them, `'static`, is for data that is built into the program and lives for the whole run, and it is not what this function needs. The word **lifetime** in the message is the compiler's name for the stretch of the program in which a reference is valid. Lesson 10 covers lifetimes, and nothing before it needs you to write one.",
            "When the function does take a reference, the signature is plausible, because the result could borrow from the argument. The compiler then checks the body, and the same mistake gets a different code:",
            { run: rs`fn shout(text: &String) -> &String {
    let loud = text.to_uppercase();      // a new String, owned by this function
    &loud
}

fn main() {
    let word = String::from("hello");
    println!("{}", shout(&word));
}`, name: 'return_local_too.rs', fails: 'E0515' },
            "Both messages lead to the same fix: return the value, not a reference to it. Returning moves the `String` to the caller, as in lesson 5. Three words are copied and the buffer stays where it is.",
            { run: rs`fn make_greeting() -> String {
    let greeting = String::from("hello");
    greeting                             // moved out to the caller: nothing is freed here
}

fn shout(text: &String) -> String {      // borrows its input, owns its output
    text.to_uppercase()
}

fn main() {
    let text = make_greeting();
    println!("{text} {}", shout(&text));
}`, name: 'return_owned.rs', expect: 'hello HELLO\n' },
            "A function can return a reference when the reference points into something the caller already owns:",
            { run: rs`fn first(names: &Vec<String>) -> &String {
    &names[0]                            // points into the caller's Vec, which outlives the call
}

fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];
    let leader = first(&names);
    println!("{leader} leads {} people", names.len());
}`, name: 'return_borrowed.rs', expect: 'Ada leads 2 people\n' },
            "With one reference going in and one coming out, the compiler takes the result to be borrowed from the argument, and checks every caller on that basis. A function that takes two references and returns one has to say which of them the result borrows from. That is what lifetime annotations are for, in lesson 10.",
            { compare: "You cannot write this bug in Python, PHP or JavaScript, because a reference there keeps its object alive. Return a reference to a local and the object simply lives on. The price is a collector or a reference count on every object, and never knowing quite when anything is freed. Rust turns it around. The owner decides when a value dies, and the compiler rejects every reference that would still be looking." },
            { fromC: "This is `return &local;` from the C pointers lesson, which a C compiler answers with a warning at best. Here it is an error, and so are the indirect versions that no C compiler notices." },
          ],
        },
        {
          title: "You can't move out from under a borrow",
          body: [
            "A value can disappear from under a reference in a second way: it can be moved. A move hands the value to a new owner, who will drop it on a schedule of its own, and the old variable is left holding nothing.",
            "The rule: **while a value is borrowed, its owner can neither move it nor drop it.** A loan suspends that part of ownership until the loan is over.",
            "`drop`, from lesson 4, makes the shortest example, because it takes ownership of a value and frees it at once. If this program were accepted, line 4 would free the buffer and line 5 would read it.",
            { run: rs`fn main() {
    let title = String::from("Dune");
    let r = &title;
    drop(title);              // moves title into drop, which frees it
    println!("{r}");          // r would point at a String that is gone
}`, name: 'move_while_borrowed.rs', fails: 'E0505' },
            "The `help:` at the bottom of the message offers a `clone`. That would compile, and it is seldom the best answer. A loan is over after the last use of the reference, so swapping two lines can be the whole fix:",
            { run: rs`fn archive(text: String) -> usize {       // takes ownership
    text.len()
}

fn main() {
    let title = String::from("Dune");
    let r = &title;
    println!("{r}");                      // the last use of r: the loan ends here
    let size = archive(title);            // so title is free to move
    println!("{size}");
}`, name: 'borrow_then_move.rs', expect: 'Dune\n4\n' },
            "Lesson 7 looks closely at where a borrow ends. The other fixes are the ones you would expect: have the function borrow too, or give it a `clone` to own.",
            "The opposite direction is closed as well. A reference lets you look at a value. It does not let you take it. Moving the `String` out through `r` would leave `title` owning nothing, without `title` knowing.",
            { run: rs`fn main() {
    let title = String::from("Dune");
    let r = &title;
    let taken = *r;           // try to move the String out through the reference
    println!("{taken}");
}`, name: 'move_through_ref.rs', fails: 'E0507' },
            "On a `Copy` type, `*r` copies the value, which is why `*r + 1` worked on an `i32`. On a `String` it would have to be a move, and a borrower is not the owner. The two `help:` lines name what you may have meant instead:",
            { run: rs`fn main() {
    let title = String::from("Dune");
    let r = &title;

    let also = r;                    // copy the reference: one more borrow of the same String
    let mut copy = r.clone();        // or clone: a new String with a buffer of its own
    copy.push_str(" Messiah");       // changing the copy does not touch the original

    println!("{also} | {copy} | {title}");
}`, name: 'through_ref.rs', expect: 'Dune | Dune Messiah | Dune\n' },
            { pitfall: "On a reference, `clone()` does not copy the reference. A method call follows references, so `r.clone()` reaches the `String` and makes a deep copy of it, with a new buffer and a new owner. To get another reference, plain assignment is enough, because references are `Copy`." },
            { table: {
              head: ['While a `&T` to a value is in use', 'Allowed?'],
              rows: [
                ['The owner reads the value', 'Yes'],
                ['More `&T` references are made, from the owner or by copying', 'Yes'],
                ['The owner moves the value or drops it', 'No: `E0505`'],
                ['The owner goes out of scope', 'No: `E0597`'],
                ['The value is moved out through the reference', 'No, whether or not anything else is going on: `E0507`'],
                ['Anyone changes the value', 'No. Lesson 7 covers this'],
              ],
            } },
          ],
        },
        {
          title: '&T or T in a signature',
          body: [
            "Every parameter is now a decision, and the decision is part of the contract between a function and its callers. Borrow to read. Own to keep.",
            { table: {
              head: ['Signature', 'The function gets', 'The caller is left with', 'Use it when'],
              rows: [
                ['`fn f(text: &String)`', 'A look at the value, until it returns', 'The value, untouched and still owned', 'The function only reads. This is the default.'],
                ['`fn f(text: String)`', 'Ownership. It may keep the value, change it or drop it.', 'Nothing. The argument has moved.', 'The function stores the value somewhere, or uses it up.'],
                ['`fn f(n: i32)`', 'A copy of its own', 'The original', 'The type is `Copy` and small. A reference to an `i32` is bigger than the `i32`.'],
                ['`fn f() -> String`', '', 'A new value that it owns', 'The function creates something.'],
                ['`fn f(list: &Vec<String>) -> &String`', 'A look', 'A reference into something it already owns', 'The function picks out a part of its argument.'],
              ],
            } },
            { run: rs`fn count_long(words: &Vec<String>, min: usize) -> usize {    // reads, so it borrows
    let mut count = 0;
    for word in words {              // words is a &Vec<String>, so word is a &String
        if word.len() >= min {
            count += 1;
        }
    }
    count
}

fn main() {
    let mut shelf = Vec::new();
    let title = String::from("Solaris");
    shelf.push(title);                        // push keeps the String, so it takes ownership
    shelf.push(String::from("Ubik"));
    shelf.push(String::from("Neuromancer"));

    println!("{}", count_long(&shelf, 5));    // lent
    println!("{}", count_long(&shelf, 8));    // and lent again
    println!("{shelf:?}");
}`, name: 'read_or_keep.rs', expect: '2\n1\n["Solaris", "Ubik", "Neuromancer"]\n' },
            "`push` is declared to take its argument by value, because the `Vec` keeps what it is given. After line 14, `title` has moved and the `Vec` owns the text. `count_long` only looks, so it takes a reference, and the caller can lend the same `Vec` as often as it likes. You can read all of that from the signatures without opening either function.",
            { tip: "This lesson writes `&String` and `&Vec<String>` because those are the types you know. Lessons 8 and 9 introduce `&[T]` and `&str`, which do the same job and accept more kinds of argument. From then on, those are what you will write in signatures." },
            "One more habit needs adjusting. In Rust, `==` on two references compares the values they point at. It never compares the addresses. To ask whether two references point at the very same value, use `std::ptr::eq`.",
            { run: rs`fn main() {
    let a = String::from("tide");
    let b = String::from("tide");       // equal text, in a second String with its own buffer
    let (ra, rb, again) = (&a, &b, &a);

    println!("{}", ra == rb);                   // true: == compares the two Strings
    println!("{}", std::ptr::eq(ra, rb));       // false: they are two different Strings
    println!("{}", std::ptr::eq(ra, again));    // true: both point at a
}`, name: 'identity.rs', expect: 'true\nfalse\ntrue\n' },
            { compare: "Python has both questions as operators: `==` compares values and `is` compares identity. PHP has both for objects too, spelled `==` and `===`. So `==` in Rust is the `==` of those languages, and `std::ptr::eq` is `is` or `===`. JavaScript has only identity for objects and arrays: `[1, 2] === [1, 2]` is `false`, and nothing built in compares contents. In Rust, `==` compares contents for every type that can be compared, through as many references as it takes. Identity matters much less here. With one owner for each value and no hidden sharing, two values that are equal are nearly always interchangeable." },
            { pitfall: [
              "`==` wants the same kind of thing on both sides. A reference compared with a plain value does not compile:",
              { run: rs`fn main() {
    let limit = 10;
    let r = &limit;
    println!("{}", r == 10);
}`, name: 'uneven.rs', fails: 'E0277' },
              "Dereference the left side, `*r == 10`, or borrow the right side, `r == &10`.",
            ] },
            { native: "rust-analyzer shows the type of every variable beside it in your editor, including the `&`. When a borrow error makes no sense, check whether the variable in question is a `String` or a `&String` before you read the message again. Half the time, that is the whole answer." },
          ],
        },
      ],
      takeaways: [
        "`&value` borrows: it makes a reference, and the owner keeps the value. A function that only reads should take `&T`.",
        "A reference is one address. It is never null and it always points at a live value, and the compiler proves that instead of checking it at run time.",
        "`&T` is `Copy`. Any number of shared references can read one value at the same time.",
        "A reference cannot outlive the value it points at. Return an owned value, not a reference to a local variable.",
        "While a value is borrowed, its owner cannot move it or drop it. A value can never be moved out through a reference.",
        "`==` on references compares what they point at. `std::ptr::eq` compares the addresses.",
      ],
      quiz: [
        {
          q: 'Does this program compile?',
          code: rs`fn show(text: &String) {
    println!("{text}");
}

fn main() {
    let title = String::from("Dune");
    show(&title);
    show(&title);
    let shelf = title;
    println!("{shelf}");
}`,
          options: [
            { t: 'Yes, and it prints `Dune` three times', ok: true, why: "Each `&title` lends the `String` for the length of one call. When `show` returns, the loan is over and `title` still owns the value. So it can be lent again, and finally moved to `shelf`." },
            { t: 'No: `title` was moved into `show` on line 7', why: "It would have been if the parameter were `text: String` and the call `show(title)`. With `&`, the function receives an address and the owner keeps the value." },
            { t: 'No: a value can be borrowed only once', why: "A value can be borrowed any number of times, one after another or at the same time, as long as the references are shared ones." },
            { t: 'No: `title` cannot be moved on line 9 after it has been borrowed', why: "A value cannot be moved while a borrow is still in use. Both loans ended when their calls returned, and nothing refers to `title` any more." },
          ],
          verify: 'compiles',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let r;
    {
        let n = 5;
        r = &n;
    }
    println!("{r}");
}`,
          options: [
            { t: 'No: `n` is gone at the closing brace on line 6, and `r` is used after it', ok: true, why: "`r` holds the address of the variable `n`, and `n` stops existing when its block ends. The compiler reports `E0597`: `n` does not live long enough." },
            { t: 'Yes, and it prints `5`, because `i32` is `Copy`', why: "`Copy` would matter if line 5 were `r = n`, which copies the number. `r = &n` stores the address of `n`, and it is the address that goes stale." },
            { t: 'Yes, and it prints `5`, because the reference keeps `n` alive', why: "That is how Python, PHP and JavaScript work: a value lives for as long as anything refers to it. In Rust a reference has no say. The owner's scope decides, and the compiler rejects a reference that would outlast it." },
            { t: 'No: line 2 declares `r` without giving it a value', why: "Declaring a variable and assigning it later is allowed, provided it is assigned before it is read. The compiler takes the type of `r` from line 5." },
          ],
          verify: 'E0597',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let name = String::from("Ada");
    let r = &name;
    let owner = name;
    println!("{r} {owner}");
}`,
          options: [
            { t: 'No: line 4 moves `name` while `r` still borrows it', ok: true, why: "`r` is used on line 5, so the loan is still running on line 4. Moving a borrowed value is `E0505`. After the move, `r` would point at a variable that no longer holds anything." },
            { t: 'Yes, and it prints `Ada Ada`: `r` follows the text to its new owner', why: "It would in Python or JavaScript, where a reference points at the heap object and does not care which variable holds it. This reference points at the variable `name` on the stack, and after the move `name` holds nothing usable." },
            { t: 'Yes, and it prints `Ada Ada`: a move copies the three words, so `name` can still be read through `r`', why: "The bytes of `name` are indeed still there after a move. The compiler treats them as dead all the same, because two usable owners of one buffer would mean two frees. A reference is not a way around that." },
            { t: 'No: `name` is not `mut`, so it cannot be moved', why: "Moving does not need `mut`. `mut` is about changing a value in place, and a move only changes who owns it." },
          ],
          verify: 'E0505',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let low = 3;
    let high = 8;
    let mut r = &low;
    let a = *r * 2;
    r = &high;
    let b = *r * 2;
    println!("{a} {b} {low} {}", r == &8);
}`,
          answer: '6 16 3 true',
          explain: "`r` first points at `low`, so `a` is 6. Line 6 points `r` at `high`. It writes nothing into `low`, which is still 3. Then `b` is 16, and `r == &8` compares the values that the two references point at.",
          hint: "`r = &high` changes where `r` points. Does it change `low`?",
        },
        {
          kind: 'multi',
          q: 'Which of these are true of a `&String`?',
          options: [
            { t: 'It is never null', ok: true, why: "There is no null reference. A reference that may be absent is an `Option<&String>`." },
            { t: 'Whenever it is used, the `String` it points at still exists', ok: true, why: "A program in which a reference could be used after its value has been dropped or moved is rejected, with `E0597` or `E0505`." },
            { t: 'It keeps the `String` alive: the value is freed when the last reference to it goes away', why: "That is what a garbage collector or a reference count guarantees. In Rust the owner's scope decides when the value dies. The reference never extends that. The compiler rejects the program instead." },
            { t: 'It holds its own copy of the text', why: "A reference is one address, 8 bytes. The text exists once, in the buffer that the owner manages." },
            { t: 'It can be copied, and all the copies can be used at the same time', ok: true, why: "`&T` is `Copy`, and any number of shared references may read one value." },
            { t: 'The `String` can be moved out through it with `*`', why: "That is `E0507`. A reference lets you look, and `*r` can only copy out a `Copy` type. To get a `String` of your own, call `clone`." },
          ],
          hint: "Three are true. A reference is an address that the compiler has checked, and nothing more.",
        },
        {
          q: 'Why does the compiler reject this function?',
          code: rs`fn make_label() -> &String {
    let label = String::from("draft");
    &label
}`,
          options: [
            { t: '`label` is dropped when the function returns, so the reference would point at freed memory', ok: true, why: "A local variable lives in the function's stack frame, and its `String` is dropped when the frame goes. The caller would receive the address of something that no longer exists. Return the `String` itself, which moves it to the caller." },
            { t: 'A function can never return a reference', why: "It can, when the reference points into something that outlives the call, such as an argument: `fn first(names: &Vec<String>) -> &String`." },
            { t: 'Returning would need a copy of the text, and `String` is not `Copy`', why: "A reference copies nothing, which is the problem here and not the cure. Returning the `String` by value does not copy the text either. It moves three words to the caller." },
            { t: 'Rust could keep `label` alive as Python would, but only if you ask for it with a keyword', why: "A plain reference has no way to ask. Keeping a value alive because something refers to it takes a collector or a reference count. Lesson 20 covers `Rc`, the type that counts, and it is a different type from `&`." },
          ],
        },
        {
          q: 'What does this program print?',
          code: rs`fn main() {
    let a = String::from("moss");
    let b = String::from("moss");
    let (x, y) = (&a, &b);
    println!("{} {}", x == y, std::ptr::eq(x, y));
}`,
          options: [
            { t: '`true false`', ok: true, why: "`==` on references compares the values behind them, and the two texts are equal. `std::ptr::eq` compares the addresses, and `a` and `b` are two separate `String` values." },
            { t: '`false false`', why: "That is `===` on two objects in JavaScript or PHP, or `is` in Python: a comparison of identity. In Rust, `==` compares values, and it looks through references to do it." },
            { t: '`true true`', why: "Equal text does not make two `String` values one. Each `String::from` allocates its own buffer. Rust never merges values behind your back, as Python does for some small strings and numbers." },
            { t: 'It does not compile: references cannot be compared with `==`', why: "They can, when both sides are references to a type that can be compared. What does not compile is a reference on one side and a plain value on the other, such as `x == a`." },
          ],
          verify: true,
        },
      ],
      challenges: [
        {
          id: 'borrow-dont-move',
          title: "Borrow, don't move",
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          forbid: ['clone'],
          prompt: [
            "`longer_of` takes ownership of two `String` values and gives back the longer one, or the first when they are equally long. Owning them is right for this function, because the result is one of the arguments, moved back out.",
            "Its helper is the problem. `byte_count` only needs to look at a text, and it takes ownership of it. After `byte_count(a)` there is no `a` left to return, and the compiler reports `E0382`, the use of a moved value from lesson 5.",
            "Change `byte_count` so that it borrows, and change the two calls to match. Do not use `clone`. The compiler offers it, and it would copy both texts to answer a question about their lengths.",
          ],
          signature: 'fn byte_count(text: &String) -> usize\nfn longer_of(a: String, b: String) -> String',
          starter: rs`fn byte_count(text: String) -> usize {
    text.len()
}

fn longer_of(a: String, b: String) -> String {
    if byte_count(a) >= byte_count(b) {
        a
    } else {
        b
    }
}`,
          hints: [
            "The `note:` in the compiler's output points at the parameter of `byte_count` and says that it takes ownership of the value. `text: String` moves, and `text: &String` borrows.",
            "The body of `byte_count` stays as it is, because `text.len()` works through a reference.",
            "The calls become `byte_count(&a) >= byte_count(&b)`. Both loans are over before `a` or `b` is returned.",
          ],
          solution: rs`fn byte_count(text: &String) -> usize {
    text.len()
}

fn longer_of(a: String, b: String) -> String {
    if byte_count(&a) >= byte_count(&b) {
        a
    } else {
        b
    }
}`,
          tests: [
            { label: 'Returns the second when it is longer', body: rs`assert_eq!(longer_of(String::from("ox"), String::from("heron")), "heron");` },
            { label: 'Returns the first when it is longer', body: rs`assert_eq!(longer_of(String::from("albatross"), String::from("wren")), "albatross");` },
            { label: 'Returns the first when both are equally long', body: rs`assert_eq!(longer_of(String::from("left"), String::from("rite")), "left");` },
            { label: 'Copes with empty text', body: rs`assert_eq!(longer_of(String::new(), String::from("a")), "a");
assert_eq!(longer_of(String::new(), String::new()), "");` },
            { label: 'The result is the argument itself, moved back out', body: rs`let first = String::from("albatross");
let buffer = first.as_ptr();
let result = longer_of(first, String::from("wren"));
assert_eq!(result.as_ptr(), buffer, "the result should use the buffer of the argument, not a copy of it");` },
          ],
        },
        {
          id: 'total-length',
          title: 'Total length',
          level: 'warm-up',
          prompt: [
            "Return the total number of bytes in all the words. The function borrows the list, so the caller still has it afterwards.",
            "Looping over a `&Vec<String>` gives a `&String` for each element. The starter counts the words instead of their bytes.",
          ],
          signature: 'fn total_length(words: &Vec<String>) -> usize',
          starter: rs`fn total_length(words: &Vec<String>) -> usize {
    let mut total = 0;
    for word in words {
        // word is a &String: a reference to one element.
        total += 1;
    }
    total
}`,
          hints: [
            "`word.len()` works through the reference. A method call follows references for you.",
            "`total += word.len();`",
          ],
          solution: rs`fn total_length(words: &Vec<String>) -> usize {
    let mut total = 0;
    for word in words {
        total += word.len();
    }
    total
}`,
          tests: [
            { label: 'Adds up three words', body: rs`let words = vec![String::from("a"), String::from("bc"), String::from("def")];
assert_eq!(total_length(&words), 6);` },
            { label: 'Counts bytes, not words', body: rs`let words = vec![String::from("lighthouse")];
assert_eq!(total_length(&words), 10);` },
            { label: 'An empty list has a total of 0', body: rs`let words: Vec<String> = Vec::new();
assert_eq!(total_length(&words), 0);` },
            { label: 'The list is only borrowed, so it can be used again', body: rs`let words = vec![String::from("ebb"), String::from("flow")];
assert_eq!(total_length(&words), 7);
assert_eq!(total_length(&words), 7);
assert_eq!(words.len(), 2);` },
          ],
        },
        {
          id: 'dangling-return',
          title: 'Nothing to borrow from',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "Both functions build a new `String` and try to return a reference to it. The `String` is a local variable, dropped when the function returns, so the reference would dangle. The compiler rejects the two functions with two different errors. Fix the first, run the tests again, and read the second.",
            "Change the functions so that the caller receives the text. `framed` must still only borrow its argument.",
          ],
          signature: 'fn rule() -> String\nfn framed(text: &String) -> String',
          starter: rs`fn rule() -> &String {
    let line = String::from("---");
    &line
}

fn framed(text: &String) -> &String {
    let line = rule();
    let result = format!("{line} {text} {line}");
    &result
}`,
          hints: [
            "`E0106` says the return type holds a borrowed value with nothing to borrow it from. `rule` has no parameters, so there is nothing it could lend.",
            "Return the value itself. Change `-> &String` to `-> String`, and return `line` in place of `&line`. Returning moves the `String` to the caller.",
            "`framed` needs the same change: `-> String`, and `result` without the `&` as the last expression.",
          ],
          solution: rs`fn rule() -> String {
    String::from("---")
}

fn framed(text: &String) -> String {
    let line = rule();
    format!("{line} {text} {line}")
}`,
          tests: [
            { label: 'rule returns three dashes', body: rs`assert_eq!(rule(), "---");` },
            { label: 'framed puts a rule on each side', body: rs`let word = String::from("tide");
assert_eq!(framed(&word), "--- tide ---");` },
            { label: 'framed leaves its argument as it was', body: rs`let word = String::from("ebb");
assert_eq!(framed(&word).len(), 11);
assert_eq!(word, "ebb");` },
            { label: 'An empty text still gets both rules', body: rs`assert_eq!(framed(&String::new()), "---  ---");` },
          ],
        },
        {
          id: 'largest-ref',
          title: 'A reference to the longest',
          level: 'core',
          prompt: [
            "Return a reference to the longest word in the list. When several words are equally long, return the first of them. The list is never empty.",
            "The result must be a reference to the element where it sits inside the list, and the tests check that with `std::ptr::eq`. No `String` needs to be copied.",
          ],
          signature: 'fn longest(words: &Vec<String>) -> &String',
          starter: rs`fn longest(words: &Vec<String>) -> &String {
    // Find the longest word, and return a reference to it.
    &words[0]
}`,
          hints: [
            "Keep the best so far in `let mut best = &words[0];`. The `mut` lets you point `best` at another element. It does not let you change any word.",
            "`for word in words` gives a `&String` each time, because `words` is a reference to the `Vec`.",
            "`if word.len() > best.len() { best = word; }`, and `best` as the last expression. The strict `>` keeps the first of several equally long words.",
          ],
          solution: rs`fn longest(words: &Vec<String>) -> &String {
    let mut best = &words[0];
    for word in words {
        if word.len() > best.len() {
            best = word;
        }
    }
    best
}`,
          tests: [
            { label: 'Finds the longest in the middle', body: rs`let words = vec![String::from("ox"), String::from("albatross"), String::from("wren")];
assert_eq!(longest(&words), "albatross");` },
            { label: 'Finds the longest at the end', body: rs`let words = vec![String::from("ox"), String::from("wren"), String::from("heron")];
assert_eq!(longest(&words), "heron");` },
            { label: 'A list of one word', body: rs`let words = vec![String::from("ox")];
assert_eq!(longest(&words), "ox");` },
            { label: 'The result points into the list', body: rs`let words = vec![String::from("ox"), String::from("albatross"), String::from("wren")];
let found = longest(&words);
assert!(std::ptr::eq(found, &words[1]), "expected a reference to words[1]");` },
            { label: 'Of several equally long words, it returns the first', body: rs`let words = vec![String::from("ox"), String::from("heron"), String::from("egret"), String::from("crane")];
let found = longest(&words);
assert!(std::ptr::eq(found, &words[1]), "expected a reference to words[1], the first word of five letters");` },
          ],
        },
        {
          id: 'same-or-equal',
          title: 'The same String, or an equal one',
          level: 'stretch',
          prompt: [
            "A `Vec<&String>` is a list of references. Several of them may point at the same `String`, and different `String` values may hold the same text.",
            "Write two counts. `distinct_values` is the number of different texts in the list. `distinct_objects` is the number of different `String` values that the references point at. Take the list `[&a, &b, &a]`, where `a` and `b` both hold `\"x\"`: it has one distinct value and two distinct objects.",
            "`refs[i]` is a `&String`. Indexing copies it out of the list, which is allowed because references are `Copy`.",
          ],
          signature: 'fn distinct_values(refs: &Vec<&String>) -> usize\nfn distinct_objects(refs: &Vec<&String>) -> usize',
          starter: rs`fn distinct_values(refs: &Vec<&String>) -> usize {
    // Count each text once: skip an element if an earlier one is equal to it.
    refs.len()
}

fn distinct_objects(refs: &Vec<&String>) -> usize {
    // Count each String once: skip an element if an earlier one is the very same String.
    refs.len()
}`,
          hints: [
            "For each position `i`, look at the positions before it. If none of them matches, this is the first time the element appears, so count it.",
            "Two nested loops: `for i in 0..refs.len()`, and inside it `for j in 0..i`. Keep a `let mut seen = false;` for each `i`.",
            "The two functions differ in one expression. `refs[j] == refs[i]` compares the texts, and `std::ptr::eq(refs[j], refs[i])` compares the addresses.",
          ],
          solution: rs`fn distinct_values(refs: &Vec<&String>) -> usize {
    let mut count = 0;
    for i in 0..refs.len() {
        let mut seen = false;
        for j in 0..i {
            if refs[j] == refs[i] {
                seen = true;
            }
        }
        if !seen {
            count += 1;
        }
    }
    count
}

fn distinct_objects(refs: &Vec<&String>) -> usize {
    let mut count = 0;
    for i in 0..refs.len() {
        let mut seen = false;
        for j in 0..i {
            if std::ptr::eq(refs[j], refs[i]) {
                seen = true;
            }
        }
        if !seen {
            count += 1;
        }
    }
    count
}`,
          tests: [
            { label: 'Three different texts are three values and three objects', body: rs`let (a, b, c) = (String::from("red"), String::from("green"), String::from("blue"));
let refs = vec![&a, &b, &c];
assert_eq!(distinct_values(&refs), 3);
assert_eq!(distinct_objects(&refs), 3);` },
            { label: 'One String listed twice is one value and one object', body: rs`let a = String::from("red");
let refs = vec![&a, &a];
assert_eq!(distinct_values(&refs), 1);
assert_eq!(distinct_objects(&refs), 1);` },
            { label: 'Two Strings with equal text are one value and two objects', body: rs`let (a, b) = (String::from("x"), String::from("x"));
let refs = vec![&a, &b, &a];
assert_eq!(distinct_values(&refs), 1, "the texts are all equal");
assert_eq!(distinct_objects(&refs), 2, "a and b are separate Strings");` },
            { label: 'A longer mixed list', body: rs`let (a, b, c) = (String::from("x"), String::from("x"), String::from("y"));
let refs = vec![&a, &b, &a, &c, &b, &c];
assert_eq!(distinct_values(&refs), 2);
assert_eq!(distinct_objects(&refs), 3);` },
            { label: 'A clone is equal to its original, and is a different object', body: rs`let a = String::from("tide");
let copy = a.clone();
let refs = vec![&a, &copy];
assert_eq!(distinct_values(&refs), 1);
assert_eq!(distinct_objects(&refs), 2);` },
            { label: 'An empty list has neither', body: rs`let refs: Vec<&String> = Vec::new();
assert_eq!(distinct_values(&refs), 0);
assert_eq!(distinct_objects(&refs), 0);` },
          ],
        },
      ],
    },

    {
      id: 'mutable-borrows',
      title: 'Mutable borrows & the aliasing rule',
      category: part,
      minutes: 40,
      summary: 'A mutable reference lets code change a value it does not own. One rule decides which references may be in use together: many readers or one writer. This lesson covers the rule, the bugs it prevents, and how to fix the errors it produces without reaching for clone.',
      topics: ['&mut T', 'Many readers or one writer', 'Invalidated references', 'Where a borrow ends', 'Reborrowing', 'Fixing borrow errors'],
      sections: [
        {
          title: '&mut T: borrowing to change',
          body: [
            "A `&T` lets code read a value it does not own. It does not let that code change anything.",
            { run: rs`fn add_exclamation(text: &String) {
    text.push_str("!");
}

fn main() {
    let greeting = String::from("hello");
    add_exclamation(&greeting);
    println!("{greeting}");
}`, name: 'read_only.rs', fails: 'E0596' },
            "The message names the cure. Changing a borrowed value takes a different kind of reference, a **mutable reference**, written `&mut`.",
            { run: rs`fn add_exclamation(text: &mut String) {         // asks for a mutable borrow
    text.push_str("!");
}

fn main() {
    let mut greeting = String::from("hello");   // the owner must be mut
    add_exclamation(&mut greeting);             // and the call says &mut
    add_exclamation(&mut greeting);
    println!("{greeting}");
}`, name: 'mutable_ref.rs', expect: 'hello!!\n' },
            "Three things have to agree, and all three are visible in the source.",
            { list: [
              "The parameter type is `&mut String`. The function announces that it may change its argument.",
              "The call says `&mut greeting`. The caller can see, without opening the function, that `greeting` may be different afterwards.",
              "The owner is declared `let mut`. You cannot lend a permission that you do not have.",
            ] },
            "Leave out the third and the compiler reports `E0596` again, this time about the owner:",
            { run: rs`fn main() {
    let greeting = String::from("hello");
    let r = &mut greeting;
    r.push_str("!");
    println!("{greeting}");
}`, name: 'owner_not_mut.rs', fails: 'E0596' },
            "A method call follows a mutable reference just as it follows a shared one, so `text.push_str(\"!\")` needs no `*`. Assignment and the arithmetic operators do need it. To store a new value in the place a reference points at, write `*r = …`.",
            { run: rs`fn add_bonus(score: &mut i32, bonus: i32) {
    *score += bonus;              // *score is the i32 that score points at
}

fn reset(score: &mut i32) {
    *score = 0;                   // store a new value through the reference
}

fn main() {
    let mut score = 10;
    add_bonus(&mut score, 5);
    println!("{score}");
    reset(&mut score);
    println!("{score}");

    let mut scores = vec![10, 20, 30];
    let slot = &mut scores[1];    // a mutable reference to one element
    *slot += 5;
    for value in &mut scores {    // value is a &mut i32, for each element in turn
        *value *= 2;
    }
    println!("{scores:?}");
}`, name: 'star_assign.rs', expect: '15\n0\n[20, 50, 60]\n' },
            "That makes three ways to loop over a `Vec`, and the `&` decides what each one hands you.",
            { table: {
              head: ['Loop', 'Each element arrives as', 'Afterwards'],
              rows: [
                ['`for x in v`', '`T`, moved out of the `Vec`', '`v` is gone'],
                ['`for x in &v`', '`&T`', '`v` is untouched'],
                ['`for x in &mut v`', '`&mut T`', '`v` is still yours, and may have changed'],
              ],
            } },
            { pitfall: [
              "Without the `*`, an assignment tries to replace the reference itself and not the value it points at. The types do not match, and the `help:` line supplies the star.",
              { run: rs`fn reset(score: &mut i32) {
    score = 0;
}

fn main() {
    let mut score = 10;
    reset(&mut score);
    println!("{score}");
}`, name: 'missing_star.rs', fails: 'E0308' },
            ] },
            { compare: "In Python, PHP and JavaScript, a function that is given a list or an object can always change it, and nothing at the call says whether it will. `sorted(items)` and `items.sort()` look alike on the page, and you have to know which of them changes `items`. In Rust the call tells you. `total(&items)` cannot change `items`, and `sort(&mut items)` may. PHP's `function f(array &$items)` grants the same power and marks it on the function's side only." },
            { fromC: "This is the out-parameter from the C course: `void add_bonus(int *score, int bonus)`, called as `add_bonus(&score, 5)`, with `*score += bonus` inside. The syntax has hardly changed. What has changed is the subject of the next section." },
          ],
        },
        {
          title: 'The rule: many readers or one writer',
          body: [
            "Lesson 6 showed that any number of `&T` references may point at one value. A `&mut T` is another matter. A reader relies on the value staying as it is. A writer is about to change it, and the change may free part of it. Let both loose on one value and the reader can be left looking at memory that is no longer there. The next section steps through exactly that case.",
            "Rust prevents it with one rule. **At any moment, a value may have any number of shared references or exactly one mutable reference. Never both, and never two mutable ones.** Many readers, or one writer.",
            "A second route to the same value is called an **alias**, so this is known as the aliasing rule: a value that can be changed has no aliases, and a value with aliases cannot be changed. A `&mut T` is therefore more than a permission to write. It is a guarantee of exclusive access. While it is in use, it is the only way to reach the value.",
            "Two writers:",
            { run: rs`fn main() {
    let mut text = String::from("ab");
    let first = &mut text;
    let second = &mut text;       // a second writer, while the first is still in use
    first.push_str("c");
    second.push_str("d");
    println!("{text}");
}`, name: 'two_writers.rs', fails: 'E0499' },
            "A reader and a writer:",
            { run: rs`fn main() {
    let mut text = String::from("ab");
    let reader = &text;
    let writer = &mut text;       // a writer, while a reader is still in use
    writer.push_str("c");
    println!("{reader}");
}`, name: 'reader_and_writer.rs', fails: 'E0502' },
            "Both messages carry three labels, and the labels always mark the same three places: where the first borrow is made, where the second one collides with it, and where the first is used afterwards. Every borrow error has this shape. Find the three places and you have understood the error. The compiler says `immutable borrow` where this manual says shared borrow. Both mean a `&T`.",
            { table: {
              head: ['In use at the same time', 'Allowed?'],
              rows: [
                ['`&T` and `&T`, in any number', 'Yes'],
                ['`&T` and `&mut T`', 'No: `E0502`'],
                ['`&mut T` and `&mut T`', 'No: `E0499`'],
              ],
            } },
            { compare: "Python, PHP and JavaScript have no rule like this, so here is what it buys, in terms you know. In those languages any two parts of a program can hold the same list or object, and either can change it. A whole family of bugs follows: the function that sorts its argument in place and surprises its caller, the default argument in Python that quietly accumulates values, the cached object that somebody edits. The defenses are habits and libraries: defensive copies, frozen objects, `readonly` properties, immutable collections. Rust's rule is that same defense, checked by the compiler. Hold a `&T` and the value will not change while you hold it. Hold a `&mut T` and nobody else is looking." },
            { fromC: "`&T` resembles `const int *`, with one large difference. `const int *` promised that you would not write through that pointer, and said nothing about anybody else. `&T` promises that nobody writes at all for as long as it is in use." },
          ],
        },
        {
          title: 'What the rule prevents',
          body: [
            "The rule is not about tidiness. Without it, two ordinary lines of code corrupt memory. Lesson 4 showed a `String` outgrowing its buffer: the push that does not fit allocates a bigger buffer, copies everything across and frees the old one. A `Vec` grows in the same way. Now suppose a reference to an element is held while that happens.",
            { trace: {
              title: 'If this were allowed: `push` moves the buffer under a reference',
              code: rs`fn main() {
    let mut scores = vec![10, 20, 30];
    let first = &scores[0];
    scores.push(40);
    println!("{first}");
}`,
              vars: [
                { id: 'scores', type: 'Vec<i32>' },
                { id: 'first', type: '&i32' },
                { id: 'old', name: 'buffer', type: 'i32', len: 3, frame: 'heap' },
                { id: 'new', name: 'bigger', type: 'i32', len: 6, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { scores: { ptr: '&old', len: 3, cap: 3 }, old: [10, 20, 30] }, say: "`scores` owns a buffer with room for exactly three elements, and it is full." },
                { line: 3, set: { first: '&old[0]' }, say: "`first` borrows the first element. It holds an address inside the buffer, not the address of `scores`." },
                { line: 4, set: { new: [10, 20, 30] }, say: "There is no room for a fourth element. `push` allocates a bigger buffer and copies the three elements across." },
                { line: 4, set: { 'new[3]': 40, scores: { ptr: '&new', len: 4, cap: 6 } }, dead: ['old'], say: "It stores 40, points `scores` at the new buffer, and frees the old one. Nothing told `first`." },
                { line: 5, say: "`println!` would read through `first`: an address in memory that has been handed back to the allocator. It is a use after free, and it began as two ordinary lines." },
              ],
            } },
            "The compiler knows nothing about buffers or capacity. It reads signatures. `push` asks for a mutable borrow of the `Vec`, `first` is a shared borrow of the same `Vec`, and `first` is used afterwards. That is a reader and a writer at the same time.",
            { run: rs`fn main() {
    let mut scores = vec![10, 20, 30];
    let first = &scores[0];       // a shared borrow of scores
    scores.push(40);              // push needs a mutable borrow of scores
    println!("{first}");          // the shared borrow is still in use
}`, name: 'push_under_reference.rs', fails: 'E0502' },
            { borrows: {
              title: 'The writer arrives while the reader is still in use',
              code: rs`fn main() {
    let mut scores = vec![10, 20, 30];
    let first = &scores[0];
    scores.push(40);
    println!("{first}");
}`,
              spans: [
                { name: 'scores', kind: 'owner', from: 2, to: 6 },
                { name: 'first', kind: 'shared', from: 3, to: 5 },
                { name: 'push', kind: 'mut', from: 4, to: 4 },
              ],
              marks: [{ line: 4, label: '`push` needs `scores` mutably, and `first` has it borrowed from line 3 to line 5.' }],
              caption: "Each bar covers the lines on which something is in use. `first` is a shared borrow of `scores` from the line that makes it to the line that last reads it. The mutable borrow that `push` needs falls inside that bar.",
            } },
            "A shared borrow of one element blocks every change to the `Vec`, including changes that would do no harm, such as a `push` when there is room to spare. The compiler does not weigh each case. It applies a rule that is always safe, and leaves you to restructure the few programs where the rule is stricter than it needs to be. The last section of this lesson shows how.",
            "The same bug has a second and more familiar disguise: changing a collection while looping over it. `for score in &scores` borrows `scores` for the whole loop, because the loop keeps its place inside the buffer from one pass to the next.",
            { run: rs`fn main() {
    let mut scores = vec![10, 20, 30];
    for score in &scores {              // the loop borrows scores until it ends
        if *score > 15 {
            scores.push(*score * 2);    // and push wants it mutably in the middle
        }
    }
    println!("{scores:?}");
}`, name: 'push_in_loop.rs', fails: 'E0502' },
            { compare: "You have met this bug. In Python, appending to a list inside a `for` loop over it never ends, removing from it skips elements, and adding a key to a dictionary raises `RuntimeError: dictionary changed size during iteration`, but only when that line happens to run. A `for…of` loop in JavaScript chases the growing array as well. PHP's `foreach` avoids the question by looping over a copy. Each language picked an answer and you have to remember which. Rust refuses to compile the program, and the `help:` line names the two usual fixes." },
            { aside: "C++ has the same growable array, `std::vector`, and no such rule. The program in the trace compiles there, and the documentation of every container lists which operations invalidate which references. Reading through an invalidated reference is one of the most common sources of security bugs in C and C++ programs. The aliasing rule is how Rust removes that whole class without a garbage collector." },
          ],
        },
        {
          title: 'A borrow lasts until its last use',
          body: [
            "The rule says \"at the same time\", so everything depends on when a borrow begins and ends. It begins where the reference is made. It ends at the **last use** of that reference, not at the closing brace of its block. After its last use a reference still exists as a variable, but nothing will ever look through it again, so it no longer counts.",
            "Take the rejected program from the last section and swap two lines.",
            { run: rs`fn main() {
    let mut scores = vec![10, 20, 30];
    let first = &scores[0];       // a shared borrow of scores begins
    println!("{first}");          // its last use: the borrow ends here
    scores.push(40);              // nothing is borrowed any more
    println!("{scores:?}");
}`, name: 'last_use.rs', expect: '10\n[10, 20, 30, 40]\n' },
            { borrows: {
              title: 'The same lines in another order: the reader is finished first',
              code: rs`fn main() {
    let mut scores = vec![10, 20, 30];
    let first = &scores[0];
    println!("{first}");
    scores.push(40);
    println!("{scores:?}");
}`,
              spans: [
                { name: 'scores', kind: 'owner', from: 2, to: 7 },
                { name: 'first', kind: 'shared', from: 3, to: 4 },
                { name: 'push', kind: 'mut', from: 5, to: 5 },
              ],
              marks: [{ line: 5, label: '`first` was last used on line 4, so `push` has `scores` to itself.', ok: true }],
              caption: "In the first figure the bar for `first` reached past the `push`. Here it ends on line 4, and the two bars do not overlap. Fixing a borrow error is mostly a matter of seeing these bars.",
            } },
            "This is why every borrow error has a label with the words `later used` in it: `borrow later used here`, or `immutable borrow later used here`, or `first borrow later used by call`. It marks the end of the bar. If that use were not there, or came earlier, there would be no error.",
            "Borrows can follow one another as often as you like, readers and writers in turn:",
            { run: rs`fn main() {
    let mut text = String::from("ab");

    let a = &text;
    let b = &text;
    println!("{a} {b}");          // the last use of a and of b

    let w = &mut text;            // the readers are finished, so a writer may start
    w.push_str("c");              // the last use of w

    let again = &text;            // and a reader may follow the writer
    println!("{again}");
}`, name: 'turns.rs', expect: 'ab ab\nabc\n' },
            "A borrow made for a call, such as `add_exclamation(&mut greeting)`, ends when the call returns. That is why two such calls in a row were accepted in the first section. There is one case to watch, and lesson 6 prepared it. When a function returns a reference, the result is taken to be borrowed from the argument, so the borrow goes on for as long as the result is in use. One of the questions for this lesson turns on that.",
            { tip: "When a borrow error surprises you, look for the `later used` label before anything else. It is often a line you had forgotten about, and often that line can move." },
            { aside: "The compiler's developers call this behavior non-lexical lifetimes. Before 2018 a borrow lasted to the end of its block, and people wrapped lines in an extra `{ }` to end one early. You will still find that advice in old answers. It is rarely needed now." },
          ],
        },
        {
          title: 'The owner is frozen too',
          body: [
            "The rule covers every way of reaching a value, and the owner's own name is one of them. While a value is borrowed, its owner is restricted as well.",
            "While a shared borrow is in use, the owner may read the value and may not change it. That holds for a plain integer on the stack too, where nothing could be freed:",
            { run: rs`fn main() {
    let mut level = 1;
    let r = &level;           // a shared borrow of level
    level = 2;                // the owner tries to change it
    println!("{r} {level}");
}`, name: 'assign_while_borrowed.rs', fails: 'E0506' },
            "While a mutable borrow is in use, the owner may not even read. The `&mut` is the only way in.",
            { run: rs`fn main() {
    let mut level = 1;
    let w = &mut level;       // a mutable borrow of level
    let seen = level;         // the owner tries to read it
    *w += 1;
    println!("{seen}");
}`, name: 'read_while_mut_borrowed.rs', fails: 'E0503' },
            { table: {
              head: ['While the value has', 'The owner may read it', 'The owner may change, move or drop it'],
              rows: [
                ['No borrow in use', 'Yes', 'Yes'],
                ['Shared borrows in use', 'Yes', 'No: `E0506`, `E0505`'],
                ['A mutable borrow in use', 'No: `E0503`', 'No: `E0506`, `E0505`'],
              ],
            } },
            "Until the borrow ends, work through the reference. After its last use, the owner has everything back.",
            { run: rs`fn main() {
    let mut level = 1;
    let w = &mut level;
    *w += 1;
    let seen = *w;            // read through the one reference that is allowed in
    *w += 1;                  // the last use of w
    level += 10;              // the owner has everything back
    println!("{seen} {level}");
}`, name: 'through_the_writer.rs', expect: '2 13\n' },
            { aside: "Why freeze the owner of an integer, where no memory is at stake? Because a guarantee without exceptions is worth more. Code that holds a `&i32` knows the number is the same on every read, so the compiler can read it once and keep it in a register. Code that holds a `&mut i32` knows that nothing else can see its half-finished work. A C compiler can assume neither: any two pointers might alias, so a write through one forces a fresh read through the other. And when threads arrive in lesson 23, this same rule is what rules out data races." },
          ],
        },
        {
          title: 'Reborrowing and passing &mut along',
          body: [
            "`&T` is `Copy`. `&mut T` cannot be, because a copy would be a second writer. Assigning a mutable reference to another variable moves it, as assigning a `String` does:",
            { run: rs`fn main() {
    let mut count = 0;
    let a = &mut count;
    let b = a;            // a &mut is not Copy: this moves it into b
    *b += 1;
    *a += 10;
    println!("{count}");
}`, name: 'moved_writer.rs', fails: 'E0382' },
            "And yet a function that receives a `&mut` can pass it to another function, several times over:",
            { run: rs`fn length(text: &String) -> usize {
    text.len()
}

fn add_exclamation(text: &mut String) {
    text.push_str("!");
}

fn shout(text: &mut String) {
    add_exclamation(text);        // pass the &mut along
    add_exclamation(text);        // and again: it was not moved away
    if length(text) < 8 {         // a &mut String can be lent as a &String
        text.push_str("?");
    }
}

fn main() {
    let mut word = String::from("hey");
    shout(&mut word);
    println!("{word}");
}`, name: 'pass_along.rs', expect: 'hey!!?\n' },
            "If passing `text` moved it, the second call would be a use of a moved value. What happens is a **reborrow**. Where a `&mut` is passed to a `&mut` parameter, the compiler passes `&mut *text`: a new and shorter mutable borrow of the same `String`, taken through `text`. While the reborrow is in use, `text` is frozen, exactly as an owner would be. When the call returns, the reborrow ends and `text` works again. There is still one writer at any moment. They take turns.",
            "A reborrow can be written out by hand:",
            { run: rs`fn main() {
    let mut count = 0;
    let a = &mut count;

    let b = &mut *a;      // a reborrow: b borrows the value through a
    *b += 1;              // while b is in use, a is frozen
    *a += 10;             // b is finished, so a works again

    let seen = &*a;       // a shared reborrow: read-only, through a
    println!("{seen}");
    println!("{count}");
}`, name: 'reborrow.rs', expect: '11\n11\n' },
            "A mutable reference can always be lent out as a shared one, as `length(text)` did above. The other direction does not exist. Nothing turns a `&T` into a `&mut T`.",
            { table: {
              head: ['', '`&T`', '`&mut T`'],
              rows: [
                ['Called', 'A shared reference', 'A mutable reference, or an exclusive one'],
                ['Lets you', 'Read', 'Read and change'],
                ['How many at once', 'Any number', 'One, with no `&T` beside it'],
                ['Assigning it', 'Copies it', 'Moves it'],
                ['Passing it to a function', 'Copies it', 'Reborrows it for the call'],
                ['The owner meanwhile', 'May read', 'May do nothing'],
              ],
            } },
          ],
        },
        {
          title: 'Five ways out of a borrow error',
          body: [
            "When the compiler reports `E0499`, `E0502`, `E0505` or `E0506`, find the three places first: the borrow, the conflict and the later use. Then choose among five fixes, roughly in this order.",
            { table: {
              head: ['Fix', 'What you change', 'What it costs'],
              rows: [
                ['Shorten the borrow', 'Reorder, so that the last use of the reference comes before the conflicting line', 'Nothing'],
                ['Copy the value out', 'Keep the value and not a reference to it, when the type is `Copy`', 'A few bytes'],
                ['Use an index', 'Remember a position, and look the element up again when you need it', 'A bounds check, and an index can go out of date'],
                ['Split the data', 'Borrow two different variables or fields, or collect the changes separately and apply them afterwards', 'Sometimes a temporary collection'],
                ['Clone', 'Make an independent copy, which no borrow connects to the original', 'An allocation and a copy of the data'],
              ],
            } },
            "Here are the first three, applied to the program from section 3.",
            { run: rs`fn main() {
    // 1. Shorten the borrow: finish with the reference before the change.
    let mut scores = vec![10, 20, 30];
    let first = &scores[0];
    println!("{first}");
    scores.push(40);

    // 2. Copy the value out: an i32 is Copy, so first is a number and borrows nothing.
    let first = scores[0];
    scores.push(50);
    println!("{first}");

    // 3. Use an index: a position is a plain usize. The element is looked up when it is needed.
    let last = scores.len() - 1;
    scores.push(60);
    scores[last] += 1;
    println!("{} {scores:?}", scores[last]);
}`, name: 'ways_out.rs', expect: '10\n10\n51 [10, 20, 30, 40, 51, 60]\n' },
            "An index also rescues the loop from section 3. The range `0..scores.len()` is worked out once, before the loop starts, and nothing stays borrowed from one pass to the next.",
            { run: rs`fn main() {
    let mut scores = vec![10, 20, 30];
    for i in 0..scores.len() {            // the length is read once, here
        if scores[i] > 15 {
            scores.push(scores[i] * 2);   // scores[i] * 2 is a plain i32 before push begins
        }
    }
    println!("{scores:?}");
}`, name: 'index_loop.rs', expect: '[10, 20, 30, 40, 60]\n' },
            { pitfall: "An index is the one fix that trades a compile-time check for a run-time one. A reference cannot go out of date, because the compiler will not let the collection change underneath it. An index can. Insert or remove an element, and every index after that point refers to a different element or to none, and the compiler has nothing to say about it. The stretch challenge of this lesson is a bug of that kind." },
            "Splitting relies on the fact that the compiler tracks each variable separately, and each field of a tuple separately. Two mutable borrows are fine when they are borrows of different things.",
            { run: rs`fn move_points(from: &mut i32, to: &mut i32, amount: i32) {
    *from -= amount;
    *to += amount;
}

fn main() {
    let mut home = 50;
    let mut away = 5;
    move_points(&mut home, &mut away, 20);       // two writers, to two variables
    println!("{home} {away}");

    let mut pair = (50, 5);
    move_points(&mut pair.0, &mut pair.1, 20);   // two writers, to two fields of one tuple
    println!("{pair:?}");
}`, name: 'split.rs', expect: '30 25\n(30, 25)\n' },
            "Two elements of one `Vec` are not tracked separately. Indexing borrows the whole `Vec`, so the compiler sees two mutable borrows of the same thing:",
            { run: rs`fn move_points(from: &mut i32, to: &mut i32, amount: i32) {
    *from -= amount;
    *to += amount;
}

fn main() {
    let mut team = vec![50, 5];
    move_points(&mut team[0], &mut team[1], 20);
    println!("{team:?}");
}`, name: 'two_elements.rs', fails: 'E0499' },
            "The `help:` line names a method made for this, `split_at_mut`, which lesson 8 covers. The simpler fix is to borrow the whole `Vec` once and say which elements with indexes:",
            { run: rs`fn move_points(team: &mut Vec<i32>, from: usize, to: usize, amount: i32) {
    team[from] -= amount;         // each line borrows team for a moment, one after the other
    team[to] += amount;
}

fn main() {
    let mut team = vec![50, 5];
    move_points(&mut team, 0, 1, 20);
    println!("{team:?}");
}`, name: 'one_borrow_two_indexes.rs', expect: '[30, 25]\n' },
            "Data can be split in time as well. To change a collection according to what is in it, read it first and gather the changes in a second collection, then apply them when the reading is over. This is the other fix that the compiler suggested for the loop.",
            { run: rs`fn main() {
    let mut scores = vec![10, 20, 30];

    let mut extra = Vec::new();
    for score in &scores {            // read scores and write extra: two different values
        if *score > 15 {
            extra.push(*score * 2);
        }
    }
    scores.append(&mut extra);        // the loop is over: move everything from extra into scores
    println!("{scores:?} {extra:?}");
}`, name: 'collect_then_apply.rs', expect: '[10, 20, 30, 40, 60] []\n' },
            "Last comes `clone`. A clone is an independent value, so no borrow connects it to the original. It is the right tool when you really need two copies: the old value and the new one, or a value that must outlive the collection it came from.",
            { run: rs`fn main() {
    let mut names = vec![String::from("Ada"), String::from("Grace")];

    let before = names[0].clone();        // the old text has to survive the change
    names[0].push_str(" Lovelace");
    names.push(String::from("Linus"));

    println!("{before} is now {}", names[0]);
}`, name: 'clone_when_needed.rs', expect: 'Ada is now Ada Lovelace\n' },
            { pitfall: "`clone` makes nearly every borrow error go away, and that is the trouble with it. Cloning a `Vec` so that you can read the copy while changing the original pays for an allocation and a copy of every element. It can also hide a real mistake, because the code is now reading data that is out of date. Try the first four fixes before it. Several challenges in this lesson forbid `clone` for that reason." },
            { native: [
              "Every error code has a longer explanation with examples of the usual fixes, and Clippy flags a `clone()` on a `Copy` type, where `*r` would do.",
              { shell: 'rustc --explain E0502\ncargo clippy', name: 'Terminal · explain an error code, and lint the project' },
            ] },
          ],
        },
      ],
      takeaways: [
        "`&mut T` borrows a value in order to change it. The owner must be `mut`, the call says `&mut`, and assigning through the reference takes `*`.",
        "Many readers or one writer: at any moment a value has any number of `&T` references, or exactly one `&mut T`.",
        "The rule stops a collection from changing while a reference or a loop points into it. That is how Rust rules out dangling references without a garbage collector.",
        "A borrow lasts from the line that makes the reference to the reference's last use. The `later used` label in an error marks its end.",
        "While a value is borrowed, its owner is restricted too: it may only read under `&`, and may do nothing under `&mut`.",
        "A `&mut` is moved by assignment and reborrowed when it is passed to a function, so it can be passed along again and again.",
        "To fix a borrow error: shorten the borrow, copy the value out, use an index or split the data. Clone only when two copies are really needed.",
      ],
      quiz: [
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let mut total = 10;
    let a = &mut total;
    *a += 1;
    let b = &mut total;
    *b += 1;
    println!("{total}");
}`,
          options: [
            { t: 'Yes, and it prints `12`', ok: true, why: "`a` is in use from line 3 to line 4, and `b` from line 5 to line 6. The two stretches do not overlap, so there is one writer at a time. By line 7 neither is in use, and the owner can read." },
            { t: 'No: line 5 makes a second mutable borrow of `total`', why: "It would be an error if `a` were used after line 5. The rule counts borrows that are in use at the same time, not borrows written in the same block, and the last use of `a` is on line 4." },
            { t: 'No: `total` is still mutably borrowed when line 7 reads it', why: "The last use of `b` is on line 6. A borrow ends at its last use, not at the closing brace." },
            { t: 'Yes, and it prints `10`', why: "That would be the result if `a` and `b` were copies of the number. A `&mut i32` is the address of `total`, and `*a += 1` changes `total` itself." },
          ],
          verify: 'compiles',
        },
        {
          q: 'The same lines in a different order. Does this program compile?',
          code: rs`fn main() {
    let mut total = 10;
    let a = &mut total;
    let b = &mut total;
    *b += 1;
    *a += 1;
    println!("{total}");
}`,
          options: [
            { t: 'No: `a` is still in use on line 6, so line 4 makes a second writer', ok: true, why: "`a` is in use from line 3 to line 6, and `b` from line 4 to line 5, inside it. Two mutable borrows of one value overlap, which is `E0499`." },
            { t: 'Yes, and it prints `12`: the two writes happen one after the other', why: "The rule is not about two writes at the same instant. It is about two references being usable over the same stretch of code. With a `Vec` in place of the integer, a write through `b` could free the memory that `a` points into, and the compiler applies one rule to both cases." },
            { t: 'Yes, and it prints `12`: an `i32` is `Copy`, so each reference gets its own', why: "`Copy` describes what happens when the number itself is assigned. `&mut total` takes the address of the one `total` there is." },
            { t: 'No: a value can be mutably borrowed only once in a function', why: "It can be borrowed any number of times, one after the other. Move line 6 above line 4 and this program compiles, because `a` is then finished before `b` begins." },
          ],
          verify: 'E0499',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn first(names: &Vec<String>) -> &String {
    &names[0]
}

fn main() {
    let mut names = vec![String::from("Ada")];
    let leader = first(&names);
    names.push(String::from("Grace"));
    println!("{leader}");
}`,
          options: [
            { t: 'No: `leader` keeps `names` borrowed from line 7 to line 9, and line 8 needs it mutably', ok: true, why: "The reference that `first` returns points into `names`, so the shared borrow made on line 7 lasts for as long as `leader` is in use. The `push` on line 8 falls inside it, which is `E0502`." },
            { t: 'Yes: the borrow `&names` ended when `first` returned', why: "That is true of a call that returns nothing borrowed. Here the result is a reference into the argument, which the compiler reads from the signature of `first`. The loan continues through `leader`." },
            { t: 'Yes: `leader` points at the text `Ada`, and `push` does not touch that text', why: "`leader` is a `&String`. It points at the three-word `String` value, and that value sits in the buffer of the `Vec`. If `push` moves the buffer, `leader` points at freed memory, although the text itself has not moved." },
            { t: 'No: `names` was moved into `first` on line 7', why: "`&names` lends the `Vec`. Nothing has moved, and the error is about a borrow, not about ownership." },
          ],
          verify: 'E0502',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let mut count = 1;
    let r = &count;
    count += 1;
    println!("{r}");
}`,
          options: [
            { t: 'No: line 4 changes `count` while `r` still borrows it', ok: true, why: "`r` is in use from line 3 to line 5. While a shared borrow is in use nothing changes the value, and that includes its owner. The error is `E0506`." },
            { t: 'Yes, and it prints `2`: `r` sees the new value', why: "A pointer in C would see it, and so would a JavaScript closure that had captured the variable. A `&T` promises more: the value does not change for as long as the reference is in use." },
            { t: 'Yes, and it prints `1`: `r` holds the value that `count` had on line 3', why: "That describes `let r = count;`, which copies the number. `&count` is the address of `count`, not a snapshot of it." },
            { t: 'No: `count` can be changed only through a `&mut` reference', why: "An owner changes its value directly whenever nothing is borrowing it. Move line 5 above line 4 and the program compiles." },
          ],
          verify: 'E0506',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn grow(n: &mut i32, by: i32) {
    *n += by;
}

fn main() {
    let mut a = 1;
    let mut b = 10;
    grow(&mut a, 5);
    let r = &mut b;
    grow(r, a);
    *r *= 2;
    println!("{a} {b}");
}`,
          answer: '6 32',
          explain: "`grow(&mut a, 5)` changes `a` itself to 6. `grow(r, a)` reborrows `r` for the call and adds a copy of `a`, so `b` is 16. `r` was not moved away, so `*r *= 2` still works and makes `b` 32.",
          hint: "Each call writes through its first argument into a variable of `main`. Which variable does `r` point at?",
        },
        {
          kind: 'multi',
          q: 'Which of these may be in use at the same time?',
          options: [
            { t: 'Two `&text` references to one `String`', ok: true, why: "Any number of shared references may read one value." },
            { t: 'A `&text` and a `&mut text` to one `String`', why: "A reader and a writer: `E0502`." },
            { t: 'Two `&mut text` references to one `String`', why: "Two writers: `E0499`." },
            { t: '`&mut a` and `&mut b`, where `a` and `b` are different variables', ok: true, why: "The rule is about references to the same value. Two values can have a writer each." },
            { t: '`&mut pair.0` and `&mut pair.1`, two fields of one tuple', ok: true, why: "The compiler tracks the fields of a tuple separately, so these are borrows of different things." },
            { t: '`&scores[0]` and `&mut scores[1]`, two elements of one `Vec`', why: "Indexing borrows the whole `Vec`, so this is a reader and a writer of the same value. Use indexes, or `split_at_mut`, which lesson 8 introduces." },
          ],
          hint: "Three may. Ask of each pair whether both references reach the same value, and whether one of them can write.",
        },
        {
          q: 'Why does `scores.push(40)` have to be rejected while `first`, made by `let first = &scores[0];`, is still in use?',
          options: [
            { t: 'When the buffer is full, `push` moves the elements to a new buffer and frees the old one, which `first` points into', ok: true, why: "`first` holds an address inside the buffer. After the move it would point at freed memory. The compiler does not know this. It only applies the rule, and the rule exists because of cases like this one." },
            { t: '`push` changes the value of `scores[0]`', why: "`push` never changes the value of an existing element. The danger is that it may move all of them somewhere else." },
            { t: '`first` holds a copy of the element, and the copy would be out of date', why: "A reference holds an address, not a copy. If `first` were a copy, made with `let first = scores[0];`, nothing would be borrowed and the `push` would be accepted." },
            { t: 'It does not have to be: the compiler rejects it only when the `Vec` is full', why: "Capacity is known only when the program runs. The compiler decides from the kinds of borrow alone, so it rejects the `push` whether or not there is room." },
          ],
        },
        {
          q: 'This program is rejected with `E0596`: cannot borrow `*items` as mutable, as it is behind a `&` reference. Which change is it asking for?',
          code: rs`fn clear_all(items: &Vec<i32>) {
    items.clear();
}

fn main() {
    let mut items = vec![1, 2, 3];
    clear_all(&items);
    println!("{}", items.len());
}`,
          options: [
            { t: 'A mutable reference: the parameter becomes `items: &mut Vec<i32>`, and the call becomes `clear_all(&mut items)`', ok: true, why: "`clear` changes the `Vec`, and a `&Vec<i32>` only reads. The function has to ask for `&mut`, and the caller has to grant it." },
            { t: 'A mutable variable: the parameter becomes `mut items: &Vec<i32>`', why: "That makes the variable `items` assignable, so it could be pointed at another `Vec`. It is still a shared reference, and it still cannot change what it points at." },
            { t: 'A dereference: the call becomes `(*items).clear()`', why: "A method call dereferences already. The reference is a shared one however you spell the call." },
            { t: 'A clone: the call becomes `items.clone().clear()`', why: "That compiles, which is what makes it the worst answer. It clears a temporary copy and leaves the caller's `Vec` as it was." },
          ],
          verify: 'E0596',
        },
      ],
      challenges: [
        {
          id: 'bump',
          title: 'Bump a counter',
          level: 'warm-up',
          prompt: "Add `amount` to the number that `counter` points at. The starter copies the number out of the caller's variable and changes the copy, so the caller sees no difference.",
          signature: 'fn bump(counter: &mut i32, amount: i32)',
          starter: rs`fn bump(counter: &mut i32, amount: i32) {
    let mut copy = *counter;      // copies the number out of the caller's variable
    copy += amount;               // and changes the copy
}`,
          hints: [
            "`*counter` on the right of an `=` reads the caller's number. `*counter` on the left of `=` or `+=` writes to it.",
            "`*counter += amount;` is the whole body.",
          ],
          solution: rs`fn bump(counter: &mut i32, amount: i32) {
    *counter += amount;
}`,
          tests: [
            { label: "Changes the caller's variable", body: rs`let mut hits = 0;
bump(&mut hits, 1);
assert_eq!(hits, 1);` },
            { label: 'Every call adds again', body: rs`let mut hits = 5;
bump(&mut hits, 10);
bump(&mut hits, 10);
bump(&mut hits, 1);
assert_eq!(hits, 26);` },
            { label: 'A negative amount subtracts', body: rs`let mut balance = 3;
bump(&mut balance, -5);
assert_eq!(balance, -2);` },
            { label: 'Works on one element of a Vec', body: rs`let mut scores = vec![1, 2, 3];
bump(&mut scores[1], 10);
assert_eq!(scores, [1, 12, 3]);` },
          ],
        },
        {
          id: 'needs-mut',
          title: 'Three places for mut',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "`add_tag` should add ` [done]` to the end of the caller's `String`. `tagged_twice` should return a new `String`: a copy of `word` with the tag added twice, leaving `word` as it was.",
            "The logic is right and the permissions are wrong. Three things are missing, and the compiler shows them to you one at a time, so expect to run the tests three times.",
            "The `clone` in `tagged_twice` is meant to be there. The function returns a new `String` and must not change its argument.",
          ],
          signature: 'fn add_tag(text: &mut String)\nfn tagged_twice(word: &String) -> String',
          starter: rs`fn add_tag(text: &String) {
    text.push_str(" [done]");
}

fn tagged_twice(word: &String) -> String {
    let result = word.clone();
    add_tag(&result);
    add_tag(&result);
    result
}`,
          hints: [
            "The first `E0596` is in `add_tag`. `push_str` changes the text, and `text` is a `&String`, which only reads. The parameter has to be `&mut String`.",
            "Now the calls no longer match: `add_tag(&result)` passes a shared reference where a mutable one is expected. Write `add_tag(&mut result)`.",
            "The last `E0596` is about the owner. `result` can be borrowed mutably only if it is declared `let mut result`.",
          ],
          solution: rs`fn add_tag(text: &mut String) {
    text.push_str(" [done]");
}

fn tagged_twice(word: &String) -> String {
    let mut result = word.clone();
    add_tag(&mut result);
    add_tag(&mut result);
    result
}`,
          tests: [
            { label: 'add_tag changes the String it is lent', body: rs`let mut task = String::from("wash");
add_tag(&mut task);
assert_eq!(task, "wash [done]");` },
            { label: 'add_tag can be called again on the same String', body: rs`let mut task = String::new();
add_tag(&mut task);
add_tag(&mut task);
assert_eq!(task, " [done] [done]");` },
            { label: 'tagged_twice returns the text with two tags', body: rs`let word = String::from("dry");
assert_eq!(tagged_twice(&word), "dry [done] [done]");` },
            { label: 'tagged_twice leaves its argument as it was', body: rs`let word = String::from("fold");
let tagged = tagged_twice(&word);
assert_eq!(word, "fold");
assert_eq!(tagged.len(), word.len() + 14);` },
          ],
        },
        {
          id: 'push-while-borrowed',
          title: 'A new best score',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          forbid: ['clone'],
          prompt: [
            "`record` adds a new score to the end of the list. It returns how far the new score is above the best score that was there before, or 0 if it is not a new best. The list is never empty.",
            "The starter finds the previous best as a reference into the list, pushes the new score, and then reads the reference. Run the tests and find the three labels of `E0502`: the borrow, the conflict and the later use.",
            "Fix it without `clone`. The function needs one number from the list, not a second list.",
          ],
          signature: 'fn record(scores: &mut Vec<i32>, score: i32) -> i32',
          starter: rs`fn record(scores: &mut Vec<i32>, score: i32) -> i32 {
    let mut best = &scores[0];
    for i in 1..scores.len() {
        if scores[i] > *best {
            best = &scores[i];
        }
    }

    scores.push(score);

    if score > *best {
        score - *best
    } else {
        0
    }
}`,
          hints: [
            "The three labels: `best` borrows `scores` on line 2, `push` needs `scores` mutably on line 9, and `best` is read again on line 11.",
            "Two of the five fixes fit. Copy the value out, so that `best` is an `i32` and not a `&i32`. Or shorten the borrow, by working out the answer before the `push`.",
            "`let mut best = scores[0];`, then `best = scores[i];` in the loop, and no `*` anywhere.",
          ],
          solution: rs`fn record(scores: &mut Vec<i32>, score: i32) -> i32 {
    let mut best = scores[0];
    for i in 1..scores.len() {
        if scores[i] > best {
            best = scores[i];
        }
    }

    scores.push(score);

    if score > best {
        score - best
    } else {
        0
    }
}`,
          solutionNote: "`best` is now an `i32`, a copy that borrows nothing, so the list is free to change. Shortening the borrow works as well: keep the reference, work out the result before the `push`, and return it afterwards.",
          tests: [
            { label: 'A new best returns the margin over the old one', body: rs`let mut scores = vec![10, 30, 20];
assert_eq!(record(&mut scores, 45), 15);` },
            { label: 'The new score is added at the end', body: rs`let mut scores = vec![10, 30, 20];
record(&mut scores, 45);
assert_eq!(scores, [10, 30, 20, 45]);` },
            { label: 'A score below the best returns 0 and is still added', body: rs`let mut scores = vec![10, 30, 20];
assert_eq!(record(&mut scores, 25), 0);
assert_eq!(scores, [10, 30, 20, 25]);` },
            { label: 'A score equal to the best is not a new best', body: rs`let mut scores = vec![10, 30, 20];
assert_eq!(record(&mut scores, 30), 0);` },
            { label: 'Finds the old best at either end of the list', body: rs`let mut falling = vec![50, 20];
assert_eq!(record(&mut falling, 60), 10);
let mut rising = vec![20, 50];
assert_eq!(record(&mut rising, 60), 10);` },
            { label: 'Works on a list of one score', body: rs`let mut scores = vec![7];
assert_eq!(record(&mut scores, 9), 2);
assert_eq!(scores, [7, 9]);` },
          ],
        },
        {
          id: 'swap-in-place',
          title: 'Swap, then sort three',
          level: 'core',
          forbid: ['swap'],
          prompt: [
            "Write `swap_values`, which exchanges the two numbers its arguments point at. The standard library has `std::mem::swap` for this, and this challenge does not allow it. Do it with a temporary variable.",
            "Then write `sort_three`, which puts three numbers in ascending order by calling `swap_values`. Passing `a` along to another function reborrows it, so `a` can be used again on the next line.",
          ],
          signature: 'fn swap_values(a: &mut i32, b: &mut i32)\nfn sort_three(a: &mut i32, b: &mut i32, c: &mut i32)',
          starter: rs`fn swap_values(a: &mut i32, b: &mut i32) {
    // Exchange *a and *b.
}

fn sort_three(a: &mut i32, b: &mut i32, c: &mut i32) {
    // Compare two at a time, and call swap_values(a, b) when they are out of order.
}`,
          hints: [
            "`*a = *b;` overwrites the first number, so save it first: `let old_a = *a;`. An `i32` is `Copy`, so that line copies the value out.",
            "For `sort_three`: after `if *a > *b { swap_values(a, b); }`, the smaller of the first two is in `a`. Do the same for `b` and `c`, and the largest of the three is in `c`.",
            "One more comparison of `a` and `b` finishes it. That is three `if` statements, for the pairs `a b`, then `b c`, then `a b` again.",
          ],
          solution: rs`fn swap_values(a: &mut i32, b: &mut i32) {
    let old_a = *a;
    *a = *b;
    *b = old_a;
}

fn sort_three(a: &mut i32, b: &mut i32, c: &mut i32) {
    if *a > *b {
        swap_values(a, b);
    }
    if *b > *c {
        swap_values(b, c);
    }
    if *a > *b {
        swap_values(a, b);
    }
}`,
          tests: [
            { label: 'swap_values exchanges two numbers', body: rs`let (mut x, mut y) = (1, 2);
swap_values(&mut x, &mut y);
assert_eq!((x, y), (2, 1));` },
            { label: 'swap_values twice puts them back', body: rs`let (mut x, mut y) = (-7, 40);
swap_values(&mut x, &mut y);
swap_values(&mut x, &mut y);
assert_eq!((x, y), (-7, 40));` },
            { label: 'sort_three reverses a descending triple', body: rs`let (mut x, mut y, mut z) = (3, 2, 1);
sort_three(&mut x, &mut y, &mut z);
assert_eq!((x, y, z), (1, 2, 3));` },
            { label: 'sort_three handles every order of three numbers', body: rs`for (p, q, r) in [(1, 2, 3), (1, 3, 2), (2, 1, 3), (2, 3, 1), (3, 1, 2), (3, 2, 1)] {
    let (mut x, mut y, mut z) = (p, q, r);
    sort_three(&mut x, &mut y, &mut z);
    assert_eq!((x, y, z), (1, 2, 3), "starting from {p}, {q}, {r}");
}` },
            { label: 'sort_three copes with equal numbers', body: rs`let (mut x, mut y, mut z) = (2, 1, 2);
sort_three(&mut x, &mut y, &mut z);
assert_eq!((x, y, z), (1, 2, 2));` },
          ],
        },
        {
          id: 'append-all',
          title: 'Append a borrowed list',
          level: 'core',
          prompt: [
            "Add a copy of every `String` in `src` to the end of `dest`, in order. `src` must be the same afterwards.",
            "`dest` is borrowed mutably, because it grows. `src` is only read, so it is a shared borrow, and that has a consequence: its `String` values cannot be moved out. `dest` needs `String` values of its own, so this is a place where `clone` belongs.",
            "Notice what the signature rules out. A caller cannot pass the same `Vec` as both arguments, because that would be a `&mut` and a `&` to one value. Your loop never has to wonder whether `src` is growing while it is being read.",
          ],
          signature: 'fn append_all(dest: &mut Vec<String>, src: &Vec<String>)',
          starter: rs`fn append_all(dest: &mut Vec<String>, src: &Vec<String>) {
    for word in src {
        // word is a &String. dest holds String values, so it needs one of its own.
    }
}`,
          hints: [
            "`dest.push(word)` does not compile: the `Vec` holds `String` values, and `word` is a `&String`.",
            "`*word` cannot be moved out from behind a shared reference. That was `E0507` in lesson 6. The new list needs a copy. `clone` makes one, and so does the `to_string` that the compiler suggests.",
            "`dest.push(word.clone());`",
          ],
          solution: rs`fn append_all(dest: &mut Vec<String>, src: &Vec<String>) {
    for word in src {
        dest.push(word.clone());
    }
}`,
          tests: [
            { label: 'Appends the words in order', body: rs`let mut dest = vec![String::from("a")];
let src = vec![String::from("b"), String::from("c")];
append_all(&mut dest, &src);
assert_eq!(dest, ["a", "b", "c"]);` },
            { label: 'The source is the same afterwards', body: rs`let mut dest = Vec::new();
let src = vec![String::from("ebb"), String::from("flow")];
append_all(&mut dest, &src);
assert_eq!(src, ["ebb", "flow"]);` },
            { label: 'Appending an empty list changes nothing', body: rs`let mut dest = vec![String::from("a")];
let src: Vec<String> = Vec::new();
append_all(&mut dest, &src);
assert_eq!(dest, ["a"]);` },
            { label: 'The same source can be appended twice', body: rs`let mut dest = Vec::new();
let src = vec![String::from("x"), String::from("y")];
append_all(&mut dest, &src);
append_all(&mut dest, &src);
assert_eq!(dest, ["x", "y", "x", "y"]);` },
          ],
        },
        {
          id: 'double-the-evens',
          title: 'Double the evens',
          level: 'stretch',
          kind: 'fix',
          prompt: [
            "Every even number in the list should appear twice in a row: `[1, 2, 3, 4]` becomes `[1, 2, 2, 3, 4, 4]`. The list is changed in place, through the `&mut`.",
            "The starter uses an index loop, which is one of the ways to change a `Vec` while walking over it. It compiles, and it is wrong: run the tests and look at what it produces. An index borrows nothing, so the compiler cannot notice when an `insert` shifts the elements along and the index stops meaning what it did.",
            "Fix it. Building the result in a new `Vec` and storing it with `*values = …` is the simplest way. Doing it in place with a `while` loop is possible too.",
          ],
          signature: 'fn double_the_evens(values: &mut Vec<i32>)',
          starter: rs`fn double_the_evens(values: &mut Vec<i32>) {
    for i in 0..values.len() {
        if values[i] % 2 == 0 {
            values.insert(i, values[i]);    // put a copy at position i, and shift the rest along
        }
    }
}`,
          hints: [
            "After `insert(i, …)` the copy is at `i` and the original has moved to `i + 1`, so the next pass meets the same even number again. The range `0..values.len()` was also fixed before the list grew, so the loop stops too early.",
            "Sidestep both problems: read from `values`, and push onto a second `Vec`. Push each number once, and once more if it is even.",
            "Start with `let mut result = Vec::new();`, fill it in a loop over `0..values.len()`, and finish with `*values = result;`. Assigning through the `&mut` replaces the caller's `Vec`, and the old one is dropped.",
          ],
          solution: rs`fn double_the_evens(values: &mut Vec<i32>) {
    let mut result = Vec::new();
    for i in 0..values.len() {
        result.push(values[i]);
        if values[i] % 2 == 0 {
            result.push(values[i]);
        }
    }
    *values = result;
}`,
          solutionNote: "In place, the loop has to step over the copy it has just inserted: `let mut i = 0; while i < values.len() { if values[i] % 2 == 0 { values.insert(i, values[i]); i += 1; } i += 1; }`. Every `insert` shifts the rest of the list, so that version does more work on a long list.",
          tests: [
            { label: 'Repeats each even number once', body: rs`let mut values = vec![1, 2, 3, 4];
double_the_evens(&mut values);
assert_eq!(values, [1, 2, 2, 3, 4, 4]);` },
            { label: 'Leaves a list of odd numbers alone', body: rs`let mut values = vec![1, 3, 5];
double_the_evens(&mut values);
assert_eq!(values, [1, 3, 5]);` },
            { label: 'Repeats every element when all are even', body: rs`let mut values = vec![2, 4];
double_the_evens(&mut values);
assert_eq!(values, [2, 2, 4, 4]);` },
            { label: 'Handles zero, and equal neighbors', body: rs`let mut values = vec![0, 6, 6, 1];
double_the_evens(&mut values);
assert_eq!(values, [0, 0, 6, 6, 6, 6, 1]);` },
            { label: 'Negative even numbers count as even', body: rs`let mut values = vec![-2, -1];
double_the_evens(&mut values);
assert_eq!(values, [-2, -2, -1]);` },
            { label: 'An empty list stays empty', body: rs`let mut values: Vec<i32> = Vec::new();
double_the_evens(&mut values);
assert!(values.is_empty());` },
          ],
        },
      ],
    },
  );
})();
