// Part 6, lessons 20 and 21: Box, Rc, RefCell and Weak, then the linked lists and trees built from them.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 6 · Shared ownership & the wider language';

  (window.C_LESSONS ||= []).push(
    {
      id: 'smart-pointers',
      title: 'Box, Rc & RefCell',
      category: part,
      minutes: 40,
      summary: 'The pointer types for when one owner and compile-time borrows are not enough: what each one costs, what it gives up, and why you reach for them last.',
      topics: ['Box', 'Deref and Drop', 'Rc', 'RefCell and Cell', 'Weak', 'Cycles'],
      sections: [
        {
          title: 'Box<T>: one owner, on the heap',
          body: [
            "Lesson 4 introduced `Box<T>`: a pointer to a value on the heap. The box owns that value. When the box goes out of scope, the value is dropped and its memory is freed. Nothing about ownership changes: there is still one owner, and moving the box moves the value with it.",
            { run: rs`fn main() {
    let boxed = Box::new(41);              // an i32 on the heap, owned by boxed
    let next = *boxed + 1;                 // * reads through the pointer
    println!("{boxed} {next}");

    let big = Box::new([0u8; 1000]);       // a thousand bytes on the heap
    let moved = big;                       // a move copies one pointer, not the bytes
    println!("{} bytes in the variable, {} behind it", std::mem::size_of_val(&moved), moved.len());
}`, name: 'box.rs', expect: '41 42\n8 bytes in the variable, 1000 behind it\n' },
            "A box costs one allocation, and reading through it costs one pointer hop. There are three reasons to pay that.",
            { list: [
              "**A type that contains itself.** A list node holds another list node, and a tree node holds two. Without a pointer in between, such a type would have no finite size.",
              "**A value whose size is not known at compile time.** `Box<dyn Shape>` from lesson 16 is one. The box is the pointer that a trait object has to live behind.",
              "**A large value that should be cheap to move.** Moving a `Box<[u8; 1000]>` copies 8 bytes. Moving the array itself copies all thousand.",
            ] },
            "Here is the first reason in its smallest form. A list is either empty, or a value followed by a list.",
            { run: rs`enum List {
    Cons(i32, List),
    Nil,
}

fn main() {
    let list = List::Cons(1, List::Nil);
    if let List::Cons(first, _) = list {
        println!("{first}");
    }
}`, name: 'infinite.rs', fails: 'E0072' },
            "A variable of type `List` needs room for its largest variant. `Cons` holds an `i32` and a `List`, which may be a `Cons` holding an `i32` and a `List`, and so on without end. The `help:` line names the cure: put a pointer in the middle. A `Box<List>` is 8 bytes, whatever the list behind it looks like.",
            { run: rs`enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};

fn sum(list: &List) -> i32 {
    match list {
        Cons(value, rest) => value + sum(rest),
        Nil => 0,
    }
}

fn main() {
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
    println!("{}", sum(&list));
    println!("{} bytes per List", std::mem::size_of::<List>());
}`, name: 'cons.rs', expect: '6\n16 bytes per List\n' },
            "Sixteen bytes: four for the `i32`, four of padding and eight for the box. `Nil` takes no room of its own. A `Box` is never null, so the compiler uses the null pointer to stand for `Nil`.",
            { compare: "In Python, PHP and TypeScript every object is already a pointer to something on the heap. A class with a field of its own type is nothing special there, because the field holds a reference. In Rust a field is stored inside its parent, so a type cannot contain itself. `Box` is how you ask for the pointer those languages put everywhere." },
            { fromC: "`Box::new` is `malloc`, and the end of the owner's scope is `free`, paired by the compiler. You cannot forget the `free`, run it twice, or use the value after it. `Box<List>` is the `struct List *next` of a C list, with an owner." },
          ],
        },
        {
          title: 'Deref and Drop: how smart pointers work',
          body: [
            "A **smart pointer** is an ordinary struct that holds a pointer and implements two traits. `Deref` says what `*` and `.` reach through it. `Drop` says what happens when it goes away. `Box`, `String` and `Vec` are built this way, and so is everything else in this lesson.",
            "`Deref` has one method, which returns a reference to the target. Here it is on a struct that holds its value directly, to show that nothing about it is special to the heap.",
            { run: rs`use std::ops::Deref;

struct Wrapper<T> {
    value: T,
}

impl<T> Deref for Wrapper<T> {
    type Target = T;

    fn deref(&self) -> &T {
        &self.value
    }
}

fn shout(text: &str) -> String {
    text.to_uppercase()
}

fn main() {
    let name = Wrapper { value: String::from("ferris") };
    println!("{}", *name == "ferris");     // *name is *(name.deref()): the String
    println!("{}", name.len());            // a method of String, found through deref
    println!("{}", shout(&name));          // &Wrapper<String> to &String to &str

    let boxed = Box::new(String::from("boxed"));
    println!("{}", shout(&boxed));         // Box does the same
}`, name: 'deref.rs', expect: 'true\n6\nFERRIS\nBOXED\n' },
            { list: [
              "`*name` means `*(name.deref())`. The compiler inserts the call.",
              "`name.len()` works because a method call looks through `Deref` until it finds the method. This is the automatic dereferencing of lesson 6, extended to your own types.",
              "`shout(&name)` works because of **deref coercion**. Where a `&str` is expected and a `&Wrapper<String>` is given, the compiler calls `deref` as many times as it takes. `String` implements `Deref` with the target `str`, which is why a `&String` has been accepted as a `&str` since lesson 9.",
            ] },
            "`DerefMut` is the same trait for `&mut`. `Box` implements both. Watch for the pointers in this lesson that implement only the first.",
            "`Drop` is the other half. Lesson 4 used it to watch values go. Its `drop` method runs when the owner goes out of scope, and after it the fields are dropped in turn. For a `Box`, this is where the heap memory is freed.",
            { run: rs`struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("dropping {}", self.0);
    }
}

fn main() {
    let _a = Noisy("a");
    let b = Box::new(Noisy("b"));
    {
        let _c = Noisy("c");
        println!("end of the inner block");
    }
    drop(b);                               // early: the Box drops its Noisy, then frees the memory
    println!("end of main");
}`, name: 'drop.rs', expect: 'end of the inner block\ndropping c\ndropping b\nend of main\ndropping a\n' },
            "You cannot call that method yourself.",
            { run: rs`struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("dropping {}", self.0);
    }
}

fn main() {
    let a = Noisy("a");
    a.drop();
    println!("end of main");
}`, name: 'explicit_drop.rs', fails: 'E0040' },
            "If `a.drop()` were allowed, the value would be dropped a second time at the end of the scope, which for a `Box` is a double free. The function `drop(a)` is safe because it takes ownership. It is an empty function, `fn drop<T>(value: T) {}`, and the value dies at its closing brace like any other parameter. Afterward `a` has moved, and nothing is left to drop twice.",
            { compare: "Python's `with`, PHP's `__destruct` and TypeScript's `using` exist to release something at a known point. In Rust every value is released at a known point, decided at compile time. Files, locks and sockets close themselves by the same mechanism that frees memory, and there is no `finally` to write." },
          ],
        },
        {
          title: 'Rc<T>: several owners',
          body: [
            "Ownership so far has been a tree: every value has exactly one owner. Some data is not shaped like that. Two buttons use the same theme. Several orders refer to one customer. A node in a graph is reached from three others. None of the users is the obvious owner, and none should have to outlive the rest.",
            "With a `Box`, the second owner is refused, as lesson 5 would predict.",
            { run: rs`struct Theme {
    name: String,
}

struct Button {
    label: &'static str,
    theme: Box<Theme>,
}

fn main() {
    let theme = Box::new(Theme { name: String::from("dark") });
    let ok = Button { label: "OK", theme };
    let cancel = Button { label: "Cancel", theme };
    println!("{} {} {}", ok.label, cancel.label, cancel.theme.name);
}`, name: 'two_owners.rs', fails: 'E0382' },
            "A reference would do if something else owned the theme and was known to outlive both buttons. When there is no such owner, the value has to stay alive until its last user is gone, whichever that turns out to be. `Rc<T>`, short for reference counted, does that. It puts the value on the heap beside a count of its owners. `Rc::clone` makes another owner and adds one to the count. Dropping an owner subtracts one. When the count reaches zero, the value is dropped.",
            { run: rs`use std::rc::Rc;

struct Theme {
    name: String,
}

struct Button {
    label: &'static str,
    theme: Rc<Theme>,
}

fn main() {
    let theme = Rc::new(Theme { name: String::from("dark") });
    println!("owners: {}", Rc::strong_count(&theme));

    let ok = Button { label: "OK", theme: Rc::clone(&theme) };
    let cancel = Button { label: "Cancel", theme: Rc::clone(&theme) };
    println!("owners: {}", Rc::strong_count(&theme));

    drop(ok);
    println!("owners: {}", Rc::strong_count(&theme));
    println!("{} is {}", cancel.label, cancel.theme.name);
    println!("one Theme: {}", Rc::ptr_eq(&theme, &cancel.theme));
}`, name: 'rc.rs', expect: 'owners: 1\nowners: 3\nowners: 2\nCancel is dark\none Theme: true\n' },
            "Step through a smaller program and watch the count. There is one allocation from start to finish.",
            { trace: {
              title: 'One allocation, and a count of its owners',
              code: rs`use std::rc::Rc;

fn main() {
    let a = Rc::new(42);
    let b = Rc::clone(&a);
    {
        let c = Rc::clone(&a);
        println!("{}", Rc::strong_count(&c));
    }
    drop(a);
    println!("{b}");
}`,
              vars: [
                { id: 'a', type: 'Rc<i32>' },
                { id: 'b', type: 'Rc<i32>' },
                { id: 'c', type: 'Rc<i32>' },
                { id: 'block', name: 'allocation', type: 'count + i32', frame: 'heap', fields: [['strong', 'usize'], ['value', 'i32']] },
              ],
              steps: [
                { line: 4, set: { a: '&block', block: { strong: 1, value: 42 } }, say: "`Rc::new` makes one allocation that holds the value and a count of owners, called the strong count. `a` is the first owner." },
                { line: 5, set: { b: '&block', 'block.strong': 2 }, say: "`Rc::clone` copies the pointer and adds one to the count. Nothing is allocated, and the 42 is not copied." },
                { line: 7, set: { c: '&block', 'block.strong': 3 }, say: "A third owner, inside a block." },
                { line: 8, say: "`strong_count` reads the count through any of the three. It prints 3." },
                { line: 9, set: { 'block.strong': 2 }, hide: ['c'], say: "The block ends and `c` is dropped. Dropping an `Rc` subtracts one. The count is not zero, so the value stays." },
                { line: 10, set: { 'block.strong': 1 }, moved: ['a'], say: "`drop(a)` gives up another owner. The value was created through `a`, and that gives `a` no special standing: `b` keeps it alive." },
                { line: 11, say: "`b` still reaches the value, and prints 42." },
                { line: 12, set: { 'block.strong': 0 }, hide: ['b'], dead: ['block'], say: "`main` ends and the last owner goes. The count reaches zero, so the value is dropped and the allocation is freed." },
              ],
            } },
            { pitfall: "`Rc::clone(&theme)` does not copy the `Theme`. It copies a pointer and adds one to a number. `theme.clone()` would do exactly the same, but the convention is to write `Rc::clone`, so that a reader can tell a cheap new owner from a deep copy at a glance." },
            "Sharing has a price, and the type system collects it at once. An `Rc` gives shared access only.",
            { run: rs`use std::rc::Rc;

fn main() {
    let scores = Rc::new(vec![1, 2, 3]);
    let other = Rc::clone(&scores);
    scores.push(4);
    println!("{other:?}");
}`, name: 'rc_push.rs', fails: 'E0596' },
            "This is the rule from lesson 7 again: many readers or one writer. An `Rc` exists to create several paths to one value, so every path can only read. In the terms of the last section, `Rc` implements `Deref` and not `DerefMut`, which is what the `help:` line says.",
            { compare: "This is memory management you already know. CPython and PHP keep a reference count on every value. In Python, `b = a` adds one to it, and `del b` or the end of a function takes one away. `sys.getrefcount` shows the number. `Rc` is that same mechanism, made opt-in and visible: you ask for it on the values that need it, every increment appears in the source as `Rc::clone`, and everything else in the program stays free of counts. JavaScript engines trace from the roots instead of counting, but what you rely on is the same: a value lives for as long as anyone can reach it." },
            { fromC: "`Rc` is the reference count that C libraries implement by hand, with a `ref` function and an `unref` function that must be called in pairs. Here `Rc::clone` is the `ref`, and the compiler places every `unref`." },
            { tip: "`Rc` is for one thread. Its count is a plain integer that is changed without any locking, and the compiler will not let an `Rc` cross to another thread. `Arc` is the version that can, and lesson 23 covers it." },
          ],
        },
        {
          title: 'RefCell<T> and Cell<T>: borrow rules checked at run time',
          body: [
            "Sometimes the compile-time rule is stricter than the program needs. A method that takes `&self` wants to keep a tally of its calls. A value reached through several `Rc` pointers has to change. The borrow checker can only say no, because it cannot see that the accesses never overlap.",
            "`RefCell<T>` moves the same rule to run time. It wraps a value and keeps a count of the borrows that are out. `borrow()` gives shared access and `borrow_mut()` gives exclusive access, and both work through a plain `&RefCell`. Changing a value through a shared reference is called **interior mutability**.",
            { run: rs`use std::cell::RefCell;

fn main() {
    let log = RefCell::new(Vec::new());    // not declared mut

    log.borrow_mut().push("started");      // a RefMut guard that lives for this statement
    log.borrow_mut().push("loaded");

    let first = log.borrow();              // a Ref guard: a shared borrow
    let second = log.borrow();             // any number of those at once
    println!("{} entries, the first is {}", first.len(), second[0]);
}`, name: 'refcell.rs', expect: '2 entries, the first is started\n' },
            "Neither call returns a plain reference. `borrow` returns a `Ref<T>` and `borrow_mut` returns a `RefMut<T>`. These are small smart pointers called **guards**. A guard gives access through `Deref`, and its `Drop` tells the cell that the borrow is over. The cell allows any number of `Ref` guards or one `RefMut`, never both. It is the rule you know, enforced by counting guards.",
            "Break the rule and there is no compile error, because the compiler is no longer the one checking. The program panics.",
            { run: rs`use std::cell::RefCell;

fn main() {
    let total = RefCell::new(10);

    let mut first = total.borrow_mut();
    *first += 1;
    println!("one writer: {first}");

    let mut second = total.borrow_mut();   // first is still alive
    *second += 1;
    println!("two writers: {second}");
}`, name: 'double_mut.rs', panics: true, expect: 'one writer: 11\n' },
            { pitfall: "Line 8 is the last use of `first`, and its borrow is still alive on line 10. Lesson 7 said that a borrow ends at its last use, and that is true of references. A guard is a value with a `Drop`, so it lives to the end of its scope like any other value. Keep guards short. Use one inside a single statement, as `log.borrow_mut().push(…)` did, or in a small block, or end it early with `drop`." },
            { borrows: {
              title: 'A guard is a borrow that lasts until it is dropped',
              code: rs`let cell = RefCell::new(vec![1, 2]);
{
    let mut writer = cell.borrow_mut();
    writer.push(3);
}
let a = cell.borrow();
let b = cell.borrow();
println!("{} {}", a.len(), b.len());
println!("{}", cell.try_borrow_mut().is_err());
drop(a);
drop(b);
println!("{}", cell.try_borrow_mut().is_err());`,
              spans: [
                { name: 'cell', kind: 'owner', from: 1, to: 12 },
                { name: 'writer', kind: 'mut', from: 3, to: 5 },
                { name: 'a', kind: 'shared', from: 6, to: 10 },
                { name: 'b', kind: 'shared', from: 7, to: 11 },
              ],
              marks: [
                { line: 5, label: "The closing brace drops `writer`, and the cell is free again.", ok: true },
                { line: 9, label: "`a` and `b` are alive, so a writer is refused. `try_borrow_mut` returns `Err` where `borrow_mut` would panic." },
                { line: 12, label: "Both guards have been dropped, and the same call succeeds.", ok: true },
              ],
              caption: "The bars are the guards, not references the compiler tracks. The cell counts them while the program runs, and the program below prints what it finds.",
            } },
            { run: rs`use std::cell::RefCell;

fn main() {
    let cell = RefCell::new(vec![1, 2]);
    {
        let mut writer = cell.borrow_mut();
        writer.push(3);
    }
    let a = cell.borrow();
    let b = cell.borrow();
    println!("{} {}", a.len(), b.len());
    println!("{}", cell.try_borrow_mut().is_err());
    drop(a);
    drop(b);
    println!("{}", cell.try_borrow_mut().is_err());
}`, name: 'guards.rs', expect: '3 3\ntrue\nfalse\n' },
            "For small `Copy` values there is a simpler tool. A `Cell<T>` never hands out a reference to what it holds. `get` copies the value out and `set` replaces it. With no references there is nothing to keep count of, so a `Cell` has no guards and cannot panic.",
            { run: rs`use std::cell::Cell;

struct Sensor {
    reading: i32,
    reads: Cell<u32>,                      // can change through &self
}

impl Sensor {
    fn read(&self) -> i32 {
        self.reads.set(self.reads.get() + 1);
        self.reading
    }
}

fn main() {
    let sensor = Sensor { reading: 21, reads: Cell::new(0) };
    let total = sensor.read() + sensor.read() + sensor.read();
    println!("{total} after {} reads", sensor.reads.get());
}`, name: 'cell.rs', expect: '63 after 3 reads\n' },
            { table: {
              head: ['', '`Cell<T>`', '`RefCell<T>`'],
              rows: [
                ['Suits', '`Copy` values: numbers, `bool`, `char`', 'Anything, including a `String` or a `Vec`'],
                ['Access', '`get` copies the value out, `set` replaces it', '`borrow` and `borrow_mut` return guards'],
                ['Cost at run time', 'None', 'A counter beside the value, checked at every borrow'],
                ['If the rule is broken', 'It cannot be', 'A panic'],
              ],
            } },
            { compare: "A `RefCell` panic is the nearest thing in Rust to Python's `RuntimeError: dictionary changed size during iteration`: the same mistake, caught at the moment it happens instead of before the program runs. JavaScript and PHP report nothing at all." },
          ],
        },
        {
          title: 'Rc<RefCell<T>>: shared and mutable',
          body: [
            "`Rc` gives a value several owners and makes it read-only. `RefCell` lets a value change through a shared reference. Put the cell inside the `Rc`, and you have a value with several owners, any of which can change it.",
            { run: rs`use std::cell::RefCell;
use std::rc::Rc;

struct Player {
    name: &'static str,
    scoreboard: Rc<RefCell<Vec<String>>>,
}

impl Player {
    fn score(&self, points: u32) {
        self.scoreboard.borrow_mut().push(format!("{} +{points}", self.name));
    }
}

fn main() {
    let scoreboard = Rc::new(RefCell::new(Vec::new()));
    let ada = Player { name: "ada", scoreboard: Rc::clone(&scoreboard) };
    let bob = Player { name: "bob", scoreboard: Rc::clone(&scoreboard) };

    ada.score(3);
    bob.score(5);
    ada.score(1);

    println!("{:?}", scoreboard.borrow());
    println!("{} owners", Rc::strong_count(&scoreboard));
}`, name: 'shared_mut.rs', expect: '["ada +3", "bob +5", "ada +1"]\n3 owners\n' },
            "Read the type from the outside in. `Rc<…>` is shared ownership. `RefCell<…>` is the borrow rule, checked while the program runs. `Vec<String>` is the data. Each player holds an `Rc`, reaches the cell through `Deref`, and borrows from the cell for the length of one statement.",
            { compare: "`Rc<RefCell<T>>` is how every object behaves in Python, JavaScript and PHP. Any number of variables refer to one object, any of them can change it, and it lives until the last one lets go. `board = []`, then `ada.board = board` and `bob.board = board`, is the program above. What those languages do for every object without asking, Rust makes you write out, because it costs something: an allocation, a count that changes at every copy, a check at every access, and the old question of who else might change this value while you are using it." },
            "The flexibility comes with the bug it has always come with. A function holds a borrow of the shared value and calls something that, a few calls further down, borrows the same value to change it. In Python that is a list that changes under the loop walking it. Here it is a panic, and the challenge **Two borrows at once** has you repair two of them. Three habits keep it away:",
            { list: [
              "Hold a guard for as short a time as you can, and never across a call into code that might borrow the same cell.",
              "Copy small results out. `let count = shared.borrow().len();` ends the borrow at the semicolon.",
              "For a number or a flag, use `Rc<Cell<T>>`. It has no guards to get wrong.",
            ] },
          ],
        },
        {
          title: 'Cycles leak, and Weak<T> breaks them',
          body: [
            "Reference counting has one well-known weakness. If two values own each other, neither count can reach zero.",
            { run: rs`use std::cell::RefCell;
use std::rc::Rc;

struct Node {
    name: &'static str,
    next: RefCell<Option<Rc<Node>>>,
}

impl Drop for Node {
    fn drop(&mut self) {
        println!("dropping {}", self.name);
    }
}

fn main() {
    {
        let a = Rc::new(Node { name: "a", next: RefCell::new(None) });
        let b = Rc::new(Node { name: "b", next: RefCell::new(Some(Rc::clone(&a))) });
        println!("a line: a has {} owners, b has {}", Rc::strong_count(&a), Rc::strong_count(&b));
    }
    println!("--");
    {
        let a = Rc::new(Node { name: "a", next: RefCell::new(None) });
        let b = Rc::new(Node { name: "b", next: RefCell::new(Some(Rc::clone(&a))) });
        *a.next.borrow_mut() = Some(Rc::clone(&b));    // now a leads to b, and b leads to a
        println!("a cycle: a has {} owners, b has {}", Rc::strong_count(&a), Rc::strong_count(&b));
    }
    println!("end of main");
}`, name: 'cycle.rs', expect: 'a line: a has 2 owners, b has 1\ndropping b\ndropping a\n--\na cycle: a has 2 owners, b has 2\nend of main\n' },
            "In the first block, `b` owns `a` and nothing owns `b`. When the block ends, `b` goes, which releases `a`, and both are dropped. In the second block each owns the other. When the variables go, each count falls from 2 to 1 and stays there. `dropping` is never printed. The two nodes are still allocated, and nothing in the program can reach them.",
            { memory: {
              title: 'After the second block: no variable is left, and neither count is zero',
              vars: [
                { id: 'a', name: 'node a', type: 'count + Node', frame: 'heap', fields: [['strong', 'usize'], ['next', 'Option<Rc<Node>>']] },
                { id: 'b', name: 'node b', type: 'count + Node', frame: 'heap', fields: [['strong', 'usize'], ['next', 'Option<Rc<Node>>']] },
              ],
              set: { a: { strong: 1, next: '&b' }, b: { strong: 1, next: '&a' } },
              caption: "Solid arrows own. Each node is kept alive by the pointer inside the other, and no arrow comes in from the stack. The names and the borrow counter of each `RefCell` are left out.",
            } },
            "This is a **leak**, and Rust permits it. Leaked memory is never read after it is freed and never freed twice, so it breaks none of the guarantees the compiler is there to give. It is a bug all the same. The memory is gone until the program ends, and a `Drop` that should have closed a file or written out a buffer never runs.",
            { compare: "CPython has this problem too, and solves it with a second mechanism: a cycle collector, the `gc` module, which runs now and then to look for groups of objects that refer only to each other. PHP has had one since version 5.3. JavaScript engines do not count at all, so a cycle costs them nothing. Rust has no collector to fall back on. A cycle of `Rc` pointers is leaked for good, so the design has to avoid making one. Python's `weakref` and JavaScript's `WeakRef` are the same tool as the one below." },
            "The fix is to decide which direction owns. A `Weak<T>` points at an `Rc` allocation without being one of its owners. `Rc::downgrade` makes one. The value may be gone by the time you want it, so a `Weak` cannot be dereferenced. You call `upgrade`, which returns `Some` with a new `Rc` if the value is still alive, and `None` if it is not.",
            "The usual shape is a tree. A parent owns its children with `Rc`, and a child points back at its parent with `Weak`.",
            { run: rs`use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Folder {
    name: &'static str,
    parent: RefCell<Weak<Folder>>,          // does not own
    children: RefCell<Vec<Rc<Folder>>>,     // owns
}

impl Drop for Folder {
    fn drop(&mut self) {
        println!("dropping {}", self.name);
    }
}

fn main() {
    let root = Rc::new(Folder { name: "root", parent: RefCell::new(Weak::new()), children: RefCell::new(Vec::new()) });
    let docs = Rc::new(Folder { name: "docs", parent: RefCell::new(Rc::downgrade(&root)), children: RefCell::new(Vec::new()) });
    root.children.borrow_mut().push(Rc::clone(&docs));

    println!("root: {} strong, {} weak", Rc::strong_count(&root), Rc::weak_count(&root));
    println!("docs: {} strong, {} weak", Rc::strong_count(&docs), Rc::weak_count(&docs));

    match docs.parent.borrow().upgrade() {
        Some(parent) => println!("docs is inside {}", parent.name),
        None => println!("docs has no parent"),
    }

    drop(root);
    println!("parent still there: {}", docs.parent.borrow().upgrade().is_some());
}`, name: 'weak.rs', expect: 'root: 1 strong, 1 weak\ndocs: 2 strong, 0 weak\ndocs is inside root\ndropping root\nparent still there: false\ndropping docs\n' },
            { list: [
              "`root` has one owner, the variable. The pointer from `docs` is counted separately, as weak.",
              "`docs` has two owners: the variable, and the list of children inside `root`.",
              "`drop(root)` takes the strong count of the root folder to zero. It is dropped at once, although a `Weak` still points at it. From then on `upgrade` returns `None`.",
              "Both folders are dropped. Ownership runs one way only, so there is no cycle and no leak.",
            ] },
            { aside: "An `Rc` allocation holds two counts. The value is dropped when the strong count reaches zero. The block of memory is given back when the weak count has reached zero as well, because a `Weak` has to be able to look at the counts to learn that the value is gone." },
          ],
        },
        {
          title: 'Reaching for these last',
          body: [
            { table: {
              head: ['Type', 'Owners', 'Changing the value', 'What it costs'],
              rows: [
                ['`T`, with `&T` and `&mut T`', 'One', 'Through `&mut`, checked at compile time', 'Nothing'],
                ['`Box<T>`', 'One', 'Through `&mut`, checked at compile time', 'One allocation'],
                ['`Rc<T>`', 'Several', 'Not possible', 'One allocation and a count'],
                ['`Cell<T>`', 'One', '`get` and `set` through `&`', 'Nothing'],
                ['`RefCell<T>`', 'One', 'Guards through `&`, checked at run time', 'A counter, a check at every borrow, and a panic when the rule is broken'],
                ['`Rc<RefCell<T>>`', 'Several', 'Guards, checked at run time', 'Both of the above'],
                ['`Weak<T>`', 'None', 'Only after `upgrade` succeeds', 'A second count'],
              ],
            } },
            "Coming from a garbage-collected language, the temptation is to answer every borrow error with `Rc<RefCell<T>>`. It works, in the sense that the program compiles. It also rebuilds the object graph you came from, where anything can be changed from anywhere, and it turns the compiler's errors into panics that appear only when the wrong two lines happen to run together. Try these first, in this order.",
            { steps: [
              "**Plain ownership.** Give the data one owner, and lend it out for the length of each call. Most shared state is needed during a call, not stored.",
              "**Indices into a `Vec`.** When values have to refer to one another, keep them all in one `Vec` and store positions instead of pointers. The next lesson builds a tree with parent links this way.",
              "**`Rc<T>` alone.** Shared data that never changes after it is built needs no cell.",
              "**`Rc<RefCell<T>>`**, with `Weak` for every pointer that leads back, when the data really is shared, changing and long-lived: a tree of interface widgets, a list of observers, a graph edited in place.",
            ] },
            "Here is the scoreboard from two sections back, done the first way. `main` owns the list and lends it to each call.",
            { run: rs`struct Player {
    name: &'static str,
}

impl Player {
    fn score(&self, points: u32, scoreboard: &mut Vec<String>) {
        scoreboard.push(format!("{} +{points}", self.name));
    }
}

fn main() {
    let mut scoreboard = Vec::new();       // one owner: main
    let ada = Player { name: "ada" };
    let bob = Player { name: "bob" };

    ada.score(3, &mut scoreboard);         // lent for the length of the call
    bob.score(5, &mut scoreboard);
    ada.score(1, &mut scoreboard);

    println!("{scoreboard:?}");
}`, name: 'plain.rs', expect: '["ada +3", "bob +5", "ada +1"]\n' },
            "The output is the same. There is no allocation for the sharing, no count, no check while the program runs and no possible panic. The compiler can verify this version completely, and that is the reason to prefer it.",
            { native: [
              "A leaked cycle is invisible to the compiler and to ordinary tests. Miri, an interpreter for Rust that lesson 24 introduces, reports any memory that is still allocated when a program ends.",
              { shell: 'rustup +nightly component add miri\ncargo +nightly miri run', name: 'Terminal · run a program under Miri' },
              "The allocation-checked challenges in this lesson make the same check after every test.",
            ] },
          ],
        },
      ],
      takeaways: [
        "`Box<T>` is one owner and one heap allocation. Use it for types that contain themselves, for trait objects and for large values.",
        "A smart pointer is a struct with `Deref` and `Drop`. `Deref` is why `.` and `&` see through it, and `Drop` is where it cleans up.",
        "`Rc<T>` counts owners and gives read-only access. `Rc::clone` copies a pointer and adds one to the count. It is the reference counting of CPython and PHP, made opt-in and visible.",
        "`RefCell<T>` checks many readers or one writer at run time, and panics when the rule is broken. A guard lives until it is dropped, so keep guards short. `Cell<T>` does the job for `Copy` values with no check at all.",
        "`Rc<RefCell<T>>` is the shared, changeable object of garbage-collected languages. A cycle of `Rc` pointers is never freed, so every pointer that leads back should be a `Weak`.",
        "Reach for these last. Plain ownership, lending for the length of a call, and indices into a `Vec` come first.",
      ],
      quiz: [
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`use std::rc::Rc;

fn main() {
    let a = Rc::new(String::from("shared"));
    let b = Rc::clone(&a);
    let list = vec![Rc::clone(&a), Rc::clone(&b)];
    print!("{} ", Rc::strong_count(&a));
    drop(b);
    {
        let _c = Rc::clone(&list[0]);
        print!("{} ", Rc::strong_count(&a));
    }
    drop(list);
    println!("{}", Rc::strong_count(&a));
}`,
          answer: '4 4 1',
          explain: "`a`, `b` and the two pointers in the `Vec` make four owners of one `String`. Dropping `b` leaves three, and `_c` makes four again until its block ends. Dropping the `Vec` drops both of its pointers, which leaves `a` alone.",
          hint: "`Rc::clone(&b)` makes another owner of the value that `a` points to. How many owners does a `Vec` of two pointers hold?",
        },
        {
          q: 'What happens when this program is built and run?',
          code: rs`use std::rc::Rc;

fn main() {
    let name = Rc::new(String::from("ferris"));
    let alias = Rc::clone(&name);
    name.push_str(" the crab");
    println!("{alias}");
}`,
          options: [
            { t: 'It does not compile: an `Rc` gives shared access only', ok: true, why: "An `Rc` creates several paths to one value, so the aliasing rule makes every path read-only. The compiler reports `E0596`. Changing the text needs a `RefCell` inside the `Rc`." },
            { t: 'It prints `ferris the crab`', why: "Python, PHP and JavaScript would, with two names for one object. In Rust, two paths to one value means that neither may change it, unless a `RefCell` moves that check to run time." },
            { t: 'It prints `ferris`, because `alias` has a copy of its own', why: "`Rc::clone` copies a pointer and adds one to a count. There is one `String`. And nothing is printed, because no program is built." },
            { t: 'It panics, because the value has two owners when it is changed', why: "A panic is what a `RefCell` does at run time. An `Rc` by itself has no run-time check. The mistake is found by the compiler." },
          ],
          verify: 'E0596',
        },
        {
          q: 'What happens when this program is built and run?',
          code: rs`use std::cell::RefCell;

fn main() {
    let sizes = RefCell::new(vec![10, 20]);
    sizes.borrow_mut().push(sizes.borrow().len());
    println!("{:?}", sizes.borrow());
}`,
          options: [
            { t: 'It panics on line 5', ok: true, why: "`sizes.borrow_mut()` runs first, and its guard lives to the end of the statement. The argument then calls `sizes.borrow()` while that guard is alive. Reading the length on a line of its own first fixes it." },
            { t: 'It prints `[10, 20, 2]`', why: "A plain `Vec` would: `v.push(v.len())` compiles, because the compiler can see that the length is read before the push begins. A `RefCell` only counts guards, and here two exist at once." },
            { t: 'It does not compile: `sizes` is borrowed mutably and immutably in one statement', why: "Both methods take `&self`, so the compiler sees two shared borrows of the cell and is satisfied. The conflict is between the guards, and those are counted at run time." },
            { t: 'It does not compile: `sizes` is not declared `mut`', why: "`borrow_mut` takes `&self`. Changing a value through a shared reference is what a `RefCell` is for." },
          ],
          verify: 'panics',
        },
        {
          q: 'What does this program print?',
          code: rs`use std::cell::RefCell;
use std::rc::Rc;

fn main() {
    let shared = Rc::new(RefCell::new(1));
    let other = Rc::clone(&shared);
    *shared.borrow_mut() += 10;
    *other.borrow_mut() *= 2;
    println!("{}", shared.borrow());
}`,
          options: [
            { t: '`22`', ok: true, why: "Both names lead to one cell. Each `borrow_mut` guard is a temporary that is dropped at the end of its statement, so the two mutable borrows never overlap." },
            { t: '`11`', why: "That would be right if `Rc::clone` copied the number. It copies the pointer, so `other` changes the same cell." },
            { t: 'Nothing: it panics, because the cell is borrowed mutably twice', why: "Twice, but not at the same time. The first guard is gone before the second is made. A panic takes two guards alive together." },
            { t: 'Nothing: it does not compile, because `shared` is not `mut`', why: "Nothing assigns to the variable `shared`. The change goes through the `RefCell`, which allows it behind a shared reference." },
          ],
          verify: true,
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`use std::rc::Rc;

struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        print!("{} ", self.0);
    }
}

fn main() {
    let a = Rc::new(Noisy("a"));
    let b = Box::new(Noisy("b"));
    let a2 = Rc::clone(&a);
    drop(a);
    print!("1 ");
    drop(b);
    print!("2 ");
    drop(a2);
    println!("3");
}`,
          answer: '1 b 2 a 3',
          explain: "`drop(a)` gives up one of two owners, so the value stays. The `Box` is the only owner of `b`, so dropping it prints at once. Dropping `a2` takes the count to zero, and only then is the first `Noisy` dropped.",
          hint: "Dropping an `Rc` drops the value only when it was the last owner.",
        },
        {
          q: 'Two `Rc` nodes own each other, and every variable that pointed at them has gone out of scope. What happens to the nodes?',
          options: [
            { t: 'They stay allocated until the program ends, and their `Drop` code never runs', ok: true, why: "Each keeps the other's count at 1. Nothing can reach them and nothing will free them. Making one of the two pointers a `Weak` breaks the cycle." },
            { t: 'A cycle collector frees them some time later', why: "CPython and PHP have one for exactly this case. Rust has no collector of any kind." },
            { t: 'They cannot exist: the compiler rejects a program that builds a cycle', why: "The cycle is built at run time through a `RefCell`, where the compiler cannot see it. And a leak breaks none of the safety rules it checks." },
            { t: 'They are freed, and the pointers between them are left dangling', why: "A count of 1 is not zero, so nothing is freed. An `Rc` never frees a value that still has an owner, which is why a cycle leaks instead of crashing." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these pairings of a need and a type fit?',
          options: [
            { t: 'A recursive `enum Expr` whose variants hold sub-expressions: `Box<Expr>`', ok: true, why: "Each sub-expression has one owner, and the box gives the type a finite size." },
            { t: 'Settings loaded once and kept by several long-lived components: `Rc<Settings>`', ok: true, why: "Several owners and no changes, so no cell is needed." },
            { t: 'A tally of calls that a `&self` method keeps: `Cell<u64>`', ok: true, why: "A `Copy` value changed behind a shared reference. `Cell` does it with no run-time check." },
            { t: 'A child node\'s link back to its parent: `Weak<Node>`', ok: true, why: "The parent owns the child. A pointer back must not own, or the two would form a cycle." },
            { t: 'A function that reads a list for the length of one call: `Rc<Vec<T>>`', why: "Lend it, as `&[T]`. Shared ownership is for a value with no single owner that outlives its users." },
            { t: 'A child node\'s link back to its parent: `Rc<Node>`', why: "Parent and child would own each other, and neither would ever be freed." },
          ],
          hint: "Four fit. Ask of each: is there really more than one owner, and does the value change?",
        },
      ],
      challenges: [
        {
          id: 'boxed-list-sum',
          title: 'A list made of boxes',
          level: 'warm-up',
          prompt: [
            "`List` is the type from the lesson: empty, or a value followed by a boxed list. `Cons` and `Nil` are imported, so you can write them without `List::` in front.",
            "Write `sum`, which adds up every value, and `prepend`, which returns a list with `value` in front of the list it was given. The starter's `sum` stops after the first value, and its `prepend` returns the list unchanged.",
          ],
          signature: 'fn sum(list: &List) -> i32\nfn prepend(list: List, value: i32) -> List',
          prelude: rs`enum List {
    Cons(i32, Box<List>),
    Nil,
}

use List::{Cons, Nil};`,
          starter: rs`fn sum(list: &List) -> i32 {
    match list {
        Cons(value, _rest) => *value,
        Nil => 0,
    }
}

fn prepend(list: List, value: i32) -> List {
    list
}`,
          hints: [
            "In `sum`, `rest` is a `&Box<List>`. Passing it to a function that takes `&List` works, because of deref coercion.",
            "`Cons(value, rest) => value + sum(rest)`.",
            "`prepend` builds one new `Cons` and moves the old list into a box: `Cons(value, Box::new(list))`.",
          ],
          solution: rs`fn sum(list: &List) -> i32 {
    match list {
        Cons(value, rest) => value + sum(rest),
        Nil => 0,
    }
}

fn prepend(list: List, value: i32) -> List {
    Cons(value, Box::new(list))
}`,
          tests: [
            { label: 'An empty list sums to zero', body: rs`assert_eq!(sum(&Nil), 0);` },
            { label: 'Adds every value, not only the first', body: rs`let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));
assert_eq!(sum(&list), 6);` },
            { label: 'Handles negative values', body: rs`let list = Cons(-5, Box::new(Cons(5, Box::new(Cons(-7, Box::new(Nil))))));
assert_eq!(sum(&list), -7);` },
            { label: 'prepend puts the value in front of the list', body: rs`let list = prepend(Cons(2, Box::new(Cons(3, Box::new(Nil)))), 1);
match &list {
    Cons(first, rest) => {
        assert_eq!(*first, 1, "the new value should be the first");
        assert_eq!(sum(rest), 5, "the old list should follow it");
    }
    Nil => panic!("prepend returned an empty list"),
}` },
            { label: 'prepend works on an empty list', body: rs`let list = prepend(Nil, 7);
assert_eq!(sum(&list), 7);
let longer = prepend(prepend(list, 8), 9);
assert_eq!(sum(&longer), 24);` },
          ],
        },
        {
          id: 'shared-config',
          title: 'One config, many workers',
          level: 'warm-up',
          prompt: [
            "Every `Worker` keeps the configuration it was started with. The starter gives each worker a copy of the `Config`, so three workers hold three copies of the name. Make them all share the caller's `Config` instead: one allocation, and one more owner per worker.",
            "Then finish `describe`, which should return text such as `worker 2 of api, 3 retries`. `Rc` is already imported.",
          ],
          signature: 'fn make_workers(config: &Rc<Config>, count: usize) -> Vec<Worker>\nfn describe(worker: &Worker) -> String',
          prelude: rs`use std::rc::Rc;

struct Config {
    name: String,
    retries: u32,
}

struct Worker {
    id: usize,
    config: Rc<Config>,
}`,
          starter: rs`fn make_workers(config: &Rc<Config>, count: usize) -> Vec<Worker> {
    let mut workers = Vec::new();
    for id in 0..count {
        // A Config of its own for every worker. They should share the caller's.
        let copy = Config { name: config.name.clone(), retries: config.retries };
        workers.push(Worker { id, config: Rc::new(copy) });
    }
    workers
}

fn describe(worker: &Worker) -> String {
    format!("worker {}", worker.id)
}`,
          hints: [
            "A new owner of an existing `Rc` comes from `Rc::clone`. It takes a reference to the `Rc`, and `config` already is one.",
            "`workers.push(Worker { id, config: Rc::clone(config) });`",
            "Fields are reached straight through the `Rc`: `worker.config.name` and `worker.config.retries`.",
          ],
          solution: rs`fn make_workers(config: &Rc<Config>, count: usize) -> Vec<Worker> {
    let mut workers = Vec::new();
    for id in 0..count {
        workers.push(Worker { id, config: Rc::clone(config) });
    }
    workers
}

fn describe(worker: &Worker) -> String {
    format!("worker {} of {}, {} retries", worker.id, worker.config.name, worker.config.retries)
}`,
          tests: [
            { label: 'Makes one worker for each id', body: rs`let config = Rc::new(Config { name: String::from("api"), retries: 3 });
let workers = make_workers(&config, 3);
assert_eq!(workers.len(), 3);
for (index, worker) in workers.iter().enumerate() {
    assert_eq!(worker.id, index);
}` },
            { label: 'Every worker points at the caller\'s Config', body: rs`let config = Rc::new(Config { name: String::from("api"), retries: 3 });
let workers = make_workers(&config, 4);
for worker in &workers {
    assert!(Rc::ptr_eq(&worker.config, &config), "worker {} has a Config of its own", worker.id);
}` },
            { label: 'The count is one owner per worker, plus the caller', body: rs`let config = Rc::new(Config { name: String::from("jobs"), retries: 1 });
let workers = make_workers(&config, 5);
assert_eq!(Rc::strong_count(&config), 6);
drop(workers);
assert_eq!(Rc::strong_count(&config), 1, "dropping the workers should give their shares back");` },
            { label: 'No workers means no new owners', body: rs`let config = Rc::new(Config { name: String::from("idle"), retries: 0 });
let workers = make_workers(&config, 0);
assert!(workers.is_empty());
assert_eq!(Rc::strong_count(&config), 1);` },
            { label: 'describe reads the name and the retries through the Rc', body: rs`let config = Rc::new(Config { name: String::from("api"), retries: 3 });
let workers = make_workers(&config, 3);
assert_eq!(describe(&workers[2]), "worker 2 of api, 3 retries");
assert_eq!(describe(&workers[0]), "worker 0 of api, 3 retries");` },
          ],
        },
        {
          id: 'shared-counter',
          title: 'A counter with several handles',
          level: 'core',
          prompt: [
            "A `Counter` is a handle on a number. `handle()` returns another handle on the **same** number, so a count made through one shows through all of them. That is what you pass to a callback that has to report back.",
            "The starter's `handle` copies the current value into a counter of its own. Change the struct so that handles share one count, and keep every method taking `&self`.",
          ],
          signature: 'impl Counter {\n    fn new() -> Counter\n    fn handle(&self) -> Counter\n    fn increment(&self)\n    fn get(&self) -> u32\n}',
          starter: rs`use std::cell::Cell;
use std::rc::Rc;

struct Counter {
    count: Cell<u32>,
}

impl Counter {
    fn new() -> Counter {
        Counter { count: Cell::new(0) }
    }

    // Should return another handle on the same count. This one starts a count of its own.
    fn handle(&self) -> Counter {
        Counter { count: Cell::new(self.count.get()) }
    }

    fn increment(&self) {
        self.count.set(self.count.get() + 1);
    }

    fn get(&self) -> u32 {
        self.count.get()
    }
}`,
          hints: [
            "Two handles must lead to one `Cell`, so the cell needs more than one owner.",
            "Make the field `count: Rc<Cell<u32>>`. `increment` and `get` do not change: method calls reach the `Cell` through the `Rc`.",
            "`new` wraps the cell: `Rc::new(Cell::new(0))`. `handle` makes another owner: `Counter { count: Rc::clone(&self.count) }`.",
          ],
          solution: rs`use std::cell::Cell;
use std::rc::Rc;

struct Counter {
    count: Rc<Cell<u32>>,
}

impl Counter {
    fn new() -> Counter {
        Counter { count: Rc::new(Cell::new(0)) }
    }

    fn handle(&self) -> Counter {
        Counter { count: Rc::clone(&self.count) }
    }

    fn increment(&self) {
        self.count.set(self.count.get() + 1);
    }

    fn get(&self) -> u32 {
        self.count.get()
    }
}`,
          solutionNote: "An `Rc<RefCell<u32>>` passes too. For a `Copy` value, `Cell` is the better fit: it has no guards and cannot panic.",
          tests: [
            { label: 'A new counter starts at zero', body: rs`assert_eq!(Counter::new().get(), 0);` },
            { label: 'increment works through a shared reference', body: rs`let counter = Counter::new();
let view = &counter;
view.increment();
view.increment();
assert_eq!(counter.get(), 2);` },
            { label: 'A handle counts on the same number', body: rs`let first = Counter::new();
let second = first.handle();
first.increment();
second.increment();
second.increment();
assert_eq!(first.get(), 3, "increments made through the second handle should show through the first");
assert_eq!(second.get(), 3, "the increment made through the first handle should show through the second");` },
            { label: 'The count outlives the handle it was made through', body: rs`let later = {
    let first = Counter::new();
    first.increment();
    first.handle()
};
later.increment();
assert_eq!(later.get(), 2);` },
            { label: 'A handle moved into a closure reports back', body: rs`let counter = Counter::new();
let handle = counter.handle();
let on_event = move || handle.increment();
on_event();
on_event();
on_event();
assert_eq!(counter.get(), 3);` },
            { label: 'Two new counters stay separate', body: rs`let apples = Counter::new();
let pears = Counter::new();
apples.increment();
assert_eq!(apples.get(), 1);
assert_eq!(pears.get(), 0);` },
          ],
        },
        {
          id: 'double-borrow-panic',
          title: 'Two borrows at once',
          level: 'core',
          kind: 'fix',
          prompt: [
            "An `Inbox` keeps its messages in a `RefCell`, so that every method can take `&self`. Two of its methods panic, because each asks for a mutable borrow while a guard from `borrow()` is still alive. The compiler accepts both. The failing tests show where the panics happen.",
            "Fix `archive` and `answer_questions` so that no two guards overlap. Keep the `RefCell`, and keep every method taking `&self`.",
          ],
          signature: 'fn archive(&self)\nfn answer_questions(&self)',
          starter: rs`use std::cell::RefCell;

struct Inbox {
    messages: RefCell<Vec<String>>,
}

impl Inbox {
    fn new() -> Inbox {
        Inbox { messages: RefCell::new(Vec::new()) }
    }

    fn push(&self, text: &str) {
        self.messages.borrow_mut().push(text.to_string());
    }

    fn all(&self) -> Vec<String> {
        self.messages.borrow().clone()
    }

    /// Replaces every message with one line that says how many there were.
    fn archive(&self) {
        let messages = self.messages.borrow();
        let count = messages.len();
        self.messages.borrow_mut().clear();
        self.push(&format!("{count} archived"));
    }

    /// Adds a reply at the end for every message that ends in a question mark.
    fn answer_questions(&self) {
        for message in self.messages.borrow().iter() {
            if message.ends_with('?') {
                self.push(&format!("re: {message}"));
            }
        }
    }
}`,
          hints: [
            "In `archive`, the guard named `messages` lives until the closing brace of the function, long after its last use. A guard that is never given a name is dropped at the end of its statement.",
            "`let count = self.messages.borrow().len();` reads the length and lets go.",
            "In `answer_questions`, the guard from `borrow()` lives for the whole `for` loop. Finish reading before you start writing: collect the replies into a `Vec<String>` first, and add them once the loop is over.",
          ],
          solution: rs`use std::cell::RefCell;

struct Inbox {
    messages: RefCell<Vec<String>>,
}

impl Inbox {
    fn new() -> Inbox {
        Inbox { messages: RefCell::new(Vec::new()) }
    }

    fn push(&self, text: &str) {
        self.messages.borrow_mut().push(text.to_string());
    }

    fn all(&self) -> Vec<String> {
        self.messages.borrow().clone()
    }

    /// Replaces every message with one line that says how many there were.
    fn archive(&self) {
        // The guard is a temporary: it is gone at the end of this statement.
        let count = self.messages.borrow().len();
        self.messages.borrow_mut().clear();
        self.push(&format!("{count} archived"));
    }

    /// Adds a reply at the end for every message that ends in a question mark.
    fn answer_questions(&self) {
        // Read first. The shared guard ends with this statement.
        let replies: Vec<String> = self.messages.borrow().iter()
            .filter(|message| message.ends_with('?'))
            .map(|message| format!("re: {message}"))
            .collect();
        // Then write.
        self.messages.borrow_mut().extend(replies);
    }
}`,
          tests: [
            { label: 'push and all still work', body: rs`let inbox = Inbox::new();
inbox.push("hello");
inbox.push("lunch?");
assert_eq!(inbox.all(), ["hello", "lunch?"]);` },
            { label: 'archive leaves one line with the count', body: rs`let inbox = Inbox::new();
inbox.push("one");
inbox.push("two");
inbox.push("three");
inbox.archive();
assert_eq!(inbox.all(), ["3 archived"]);` },
            { label: 'archive works on an empty inbox, and twice in a row', body: rs`let inbox = Inbox::new();
inbox.archive();
assert_eq!(inbox.all(), ["0 archived"]);
inbox.archive();
assert_eq!(inbox.all(), ["1 archived"]);` },
            { label: 'answer_questions replies to each question, after the existing messages', body: rs`let inbox = Inbox::new();
inbox.push("lunch?");
inbox.push("the build is green");
inbox.push("ship it?");
inbox.answer_questions();
assert_eq!(inbox.all(), ["lunch?", "the build is green", "ship it?", "re: lunch?", "re: ship it?"]);` },
            { label: 'answer_questions adds nothing when nobody asked', body: rs`let inbox = Inbox::new();
inbox.push("done");
inbox.answer_questions();
assert_eq!(inbox.all(), ["done"]);` },
            { label: 'The inbox can be used again afterward', body: rs`let inbox = Inbox::new();
inbox.push("ready?");
inbox.answer_questions();
inbox.archive();
inbox.push("next");
assert_eq!(inbox.all(), ["2 archived", "next"]);` },
          ],
        },
        {
          id: 'break-the-cycle',
          title: 'Break the cycle',
          level: 'core',
          kind: 'fix',
          track: true,
          prompt: [
            "Folders form a tree. Each folder owns its children and also knows its parent. The starter stores both links as `Rc`, so a parent and its child own each other, and neither is ever freed.",
            "These tests are allocation-checked: a test fails if anything allocated during it is still allocated at its end. With the starter, most assertions pass and the tests fail anyway. Read the note under a failing test.",
            "Change the `parent` link so that a child does not own its parent, and update the three functions that use it. The tests call only the functions, so the field's type is yours to choose.",
          ],
          signature: 'fn folder(name: &str) -> Rc<Folder>\nfn add_child(parent: &Rc<Folder>, child: &Rc<Folder>)\nfn parent_name(folder: &Folder) -> Option<String>\nfn path(folder: &Folder) -> String',
          starter: rs`use std::cell::RefCell;
use std::rc::Rc;

struct Folder {
    name: String,
    parent: RefCell<Option<Rc<Folder>>>,
    children: RefCell<Vec<Rc<Folder>>>,
}

fn folder(name: &str) -> Rc<Folder> {
    Rc::new(Folder {
        name: name.to_string(),
        parent: RefCell::new(None),
        children: RefCell::new(Vec::new()),
    })
}

/// Puts child inside parent.
fn add_child(parent: &Rc<Folder>, child: &Rc<Folder>) {
    parent.children.borrow_mut().push(Rc::clone(child));
    *child.parent.borrow_mut() = Some(Rc::clone(parent));
}

/// The name of the folder this one is inside, if that folder still exists.
fn parent_name(folder: &Folder) -> Option<String> {
    folder.parent.borrow().as_ref().map(|parent| parent.name.clone())
}

/// Every name from the top down, such as "home/ada/notes".
fn path(folder: &Folder) -> String {
    match folder.parent.borrow().as_ref() {
        Some(parent) => format!("{}/{}", path(parent), folder.name),
        None => folder.name.clone(),
    }
}`,
          hints: [
            "Ownership should run one way: down, from parent to child. The link that leads back up should be a `Weak<Folder>`. Import it with `use std::rc::{Rc, Weak};`.",
            "Make the field `parent: RefCell<Weak<Folder>>`. A folder with no parent holds `Weak::new()`, and `add_child` stores `Rc::downgrade(parent)`.",
            "To read the link, call `upgrade()`, which gives an `Option<Rc<Folder>>`: `folder.parent.borrow().upgrade().map(|parent| parent.name.clone())`. `path` matches on the same call.",
          ],
          solution: rs`use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Folder {
    name: String,
    parent: RefCell<Weak<Folder>>,
    children: RefCell<Vec<Rc<Folder>>>,
}

fn folder(name: &str) -> Rc<Folder> {
    Rc::new(Folder {
        name: name.to_string(),
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(Vec::new()),
    })
}

/// Puts child inside parent.
fn add_child(parent: &Rc<Folder>, child: &Rc<Folder>) {
    parent.children.borrow_mut().push(Rc::clone(child));
    *child.parent.borrow_mut() = Rc::downgrade(parent);
}

/// The name of the folder this one is inside, if that folder still exists.
fn parent_name(folder: &Folder) -> Option<String> {
    folder.parent.borrow().upgrade().map(|parent| parent.name.clone())
}

/// Every name from the top down, such as "home/ada/notes".
fn path(folder: &Folder) -> String {
    match folder.parent.borrow().upgrade() {
        Some(parent) => format!("{}/{}", path(&parent), folder.name),
        None => folder.name.clone(),
    }
}`,
          tests: [
            { label: 'A folder by itself has no parent', body: rs`let home = folder("home");
assert_eq!(parent_name(&home), None);
assert_eq!(path(&home), "home");` },
            { label: 'A child knows its parent, and nothing is left allocated', body: rs`let home = folder("home");
let ada = folder("ada");
add_child(&home, &ada);
assert_eq!(parent_name(&ada), Some(String::from("home")));
assert_eq!(parent_name(&home), None);` },
            { label: 'path walks up through every parent', body: rs`let home = folder("home");
let ada = folder("ada");
let notes = folder("notes");
add_child(&home, &ada);
add_child(&ada, &notes);
assert_eq!(path(&notes), "home/ada/notes");
assert_eq!(path(&ada), "home/ada");` },
            { label: 'The parent owns the child, and the child does not own the parent', body: rs`let home = folder("home");
let ada = folder("ada");
let bob = folder("bob");
add_child(&home, &ada);
add_child(&home, &bob);
assert_eq!(std::rc::Rc::strong_count(&ada), 2, "the variable and the parent's list should own a child");
assert_eq!(std::rc::Rc::strong_count(&home), 1, "only the variable should own the parent");` },
            { label: 'A child that outlives its parent has no parent', body: rs`let ada = folder("ada");
{
    let home = folder("home");
    add_child(&home, &ada);
    assert_eq!(path(&ada), "home/ada");
}
assert_eq!(parent_name(&ada), None, "home was dropped, so there is no parent to name");
assert_eq!(path(&ada), "ada");` },
          ],
        },
        {
          id: 'tree-with-parents',
          title: 'A tree that knows its parents',
          level: 'stretch',
          track: true,
          prompt: [
            "Build a tree of numbers in which every node can reach both its children and its parent. Design the node yourself: add the links to `TreeNode`, then write the functions. The tests call only the functions.",
            { list: [
              "`node(value)` makes a node with no parent and no children.",
              "`attach(parent, child)` puts `child` under `parent`. From then on the tree keeps the child alive.",
              "`parent_value(node)` is the value of the node's parent, if it has one that still exists.",
              "`depth(node)` counts the ancestors: 0 for a root, 1 for its children.",
              "`subtree_sum(node)` adds the node's value and the values of everything below it.",
              "`detach(child)` removes `child` from its parent's children and clears its parent link. On a node with no parent it does nothing.",
            ] },
            "The tests are allocation-checked, so a cycle of owners fails them. In `detach`, be careful not to hold a guard on one link while you change another.",
          ],
          signature: 'fn node(value: i32) -> Rc<TreeNode>\nfn attach(parent: &Rc<TreeNode>, child: &Rc<TreeNode>)\nfn parent_value(node: &TreeNode) -> Option<i32>\nfn depth(node: &TreeNode) -> usize\nfn subtree_sum(node: &TreeNode) -> i32\nfn detach(child: &Rc<TreeNode>)',
          starter: rs`use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct TreeNode {
    value: i32,
    // Add a link to the parent, and a list of children.
}

fn node(value: i32) -> Rc<TreeNode> {
    Rc::new(TreeNode { value })
}

fn attach(parent: &Rc<TreeNode>, child: &Rc<TreeNode>) {
}

fn parent_value(node: &TreeNode) -> Option<i32> {
    None
}

fn depth(node: &TreeNode) -> usize {
    0
}

fn subtree_sum(node: &TreeNode) -> i32 {
    node.value
}

fn detach(child: &Rc<TreeNode>) {
}`,
          hints: [
            "The fields from the lesson fit: `parent: RefCell<Weak<TreeNode>>` and `children: RefCell<Vec<Rc<TreeNode>>>`. `attach` pushes `Rc::clone(child)` onto the parent's list and stores `Rc::downgrade(parent)` in the child.",
            "`depth` and `parent_value` both start from `node.parent.borrow().upgrade()`. `depth` is 0 for `None`, and one more than the parent's depth for `Some(parent)`. `subtree_sum` adds `subtree_sum(child)` for each child in `node.children.borrow().iter()`.",
            "In `detach`, take the parent out in a statement of its own: `let parent = child.parent.borrow().upgrade();`. If there is one, `parent.children.borrow_mut().retain(|other| !Rc::ptr_eq(other, child));` removes the child from its list. Then `*child.parent.borrow_mut() = Weak::new();`.",
          ],
          solution: rs`use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct TreeNode {
    value: i32,
    parent: RefCell<Weak<TreeNode>>,
    children: RefCell<Vec<Rc<TreeNode>>>,
}

fn node(value: i32) -> Rc<TreeNode> {
    Rc::new(TreeNode { value, parent: RefCell::new(Weak::new()), children: RefCell::new(Vec::new()) })
}

fn attach(parent: &Rc<TreeNode>, child: &Rc<TreeNode>) {
    parent.children.borrow_mut().push(Rc::clone(child));
    *child.parent.borrow_mut() = Rc::downgrade(parent);
}

fn parent_value(node: &TreeNode) -> Option<i32> {
    node.parent.borrow().upgrade().map(|parent| parent.value)
}

fn depth(node: &TreeNode) -> usize {
    match node.parent.borrow().upgrade() {
        Some(parent) => 1 + depth(&parent),
        None => 0,
    }
}

fn subtree_sum(node: &TreeNode) -> i32 {
    let below: i32 = node.children.borrow().iter().map(|child| subtree_sum(child)).sum();
    node.value + below
}

fn detach(child: &Rc<TreeNode>) {
    // The guard on the parent link ends with this statement.
    let parent = child.parent.borrow().upgrade();
    if let Some(parent) = parent {
        parent.children.borrow_mut().retain(|other| !Rc::ptr_eq(other, child));
    }
    *child.parent.borrow_mut() = Weak::new();
}`,
          tests: [
            { label: 'A lone node is a root', body: rs`let root = node(5);
assert_eq!(parent_value(&root), None);
assert_eq!(depth(&root), 0);
assert_eq!(subtree_sum(&root), 5);` },
            { label: 'attach links parent and child in both directions', body: rs`let root = node(1);
let child = node(2);
attach(&root, &child);
assert_eq!(parent_value(&child), Some(1));
assert_eq!(depth(&child), 1);
assert_eq!(subtree_sum(&root), 3);
assert_eq!(subtree_sum(&child), 2);` },
            { label: 'depth and subtree_sum reach three levels', body: rs`let root = node(10);
let left = node(20);
let right = node(30);
let leaf = node(40);
attach(&root, &left);
attach(&root, &right);
attach(&left, &leaf);
assert_eq!(depth(&leaf), 2);
assert_eq!(parent_value(&leaf), Some(20));
assert_eq!(subtree_sum(&root), 100);
assert_eq!(subtree_sum(&left), 60);` },
            { label: 'The tree keeps its nodes alive', body: rs`let root = {
    let root = node(1);
    let child = node(2);
    let grandchild = node(3);
    attach(&root, &child);
    attach(&child, &grandchild);
    root
};
assert_eq!(subtree_sum(&root), 6, "the child and grandchild variables are gone, but the tree should still own the nodes");` },
            { label: 'A node does not keep its parent alive', body: rs`let leaf = {
    let root = node(1);
    let leaf = node(2);
    attach(&root, &leaf);
    leaf
};
assert_eq!(parent_value(&leaf), None, "the root was dropped");
assert_eq!(depth(&leaf), 0);` },
            { label: 'detach removes the child from its parent', body: rs`let root = node(1);
let keep = node(2);
let gone = node(4);
attach(&root, &keep);
attach(&root, &gone);
detach(&gone);
assert_eq!(parent_value(&gone), None);
assert_eq!(depth(&gone), 0);
assert_eq!(subtree_sum(&root), 3);
assert_eq!(std::rc::Rc::strong_count(&gone), 1, "after detach, only the variable should own the node");
assert_eq!(parent_value(&keep), Some(1));
detach(&root);
assert_eq!(subtree_sum(&root), 3, "detaching a root should change nothing");` },
          ],
        },
      ],
    },

    {
      id: 'linked-structures',
      title: 'Linked lists & trees',
      category: part,
      minutes: 40,
      summary: 'Lists and trees built from boxes: moving a node out from behind a reference, walking a structure with a mutable cursor, dropping a long chain, and what to do when a node needs two owners.',
      topics: ['Option<Box<Node>>', 'take', 'Iterators with a lifetime', 'The link cursor', 'Iterative Drop', 'Search trees', 'Arenas'],
      sections: [
        {
          title: 'Why the classic list is hard here',
          body: [
            "A linked list is the first data structure most courses build, and in Python or TypeScript it takes ten lines. In Rust it is where newcomers meet the borrow checker at its strictest. This lesson builds one anyway, and then a tree, because the moves they force on you are the ones every structure made of pointers needs.",
            { code: `class Node:
    def __init__(self, value, next=None):
        self.value = value
        self.next = next

head = Node(1, Node(2, Node(3)))
cursor = head.next          # a second reference to the node that holds 2
cursor.next = None          # and the list changes through it`, lang: 'python' },
            "Three things in those lines have no direct translation.",
            { list: [
              "**A reference that may be nothing.** `next` is a node or `None`. Rust has no null, so the field is an `Option`.",
              "**A type that contains itself.** A `Node` stored inside a `Node` would have no finite size. Lesson 20 gave the cure: put a `Box` in between.",
              "**Several references to one node.** `head.next` and `cursor` both reach the second node, and either can change it. In Rust a node has one owner, and a `&mut` to it shuts out every other path for as long as it is in use.",
            ] },
            "The first two give the type this lesson is built on. The third is what the rest of the lesson is about.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,               // the next node, or None at the end
}

struct List {
    head: Option<Box<Node>>,               // the first node, or None for an empty list
}

fn main() {
    let third = Node { value: 3, next: None };
    let second = Node { value: 2, next: Some(Box::new(third)) };
    let first = Node { value: 1, next: Some(Box::new(second)) };
    let list = List { head: Some(Box::new(first)) };

    let mut values = Vec::new();
    let mut current = &list.head;
    while let Some(node) = current {
        values.push(node.value);
        current = &node.next;
    }
    println!("{values:?}");

    let link = std::mem::size_of::<Option<Box<Node>>>();
    let node = std::mem::size_of::<Node>();
    println!("{link} bytes for a link, {node} for a node");
}`, name: 'nodes.rs', expect: '[1, 2, 3]\n8 bytes for a link, 16 for a node\n' },
            "An `Option<Box<Node>>` is 8 bytes. A `Box` is never null, so the compiler uses the null pointer to stand for `None`, as lesson 20 showed. In memory this is the nullable `next` of the Python version. The differences are in the type: you cannot follow the pointer without saying what happens for `None`, and the pointer **owns** what it points at.",
            "Lesson 20 wrote a list as an enum, `Cons(i32, Box<List>)` or `Nil`. That form reads well and is awkward to change in place, and it spends an allocation on the final `Nil`. The struct form keeps the end of the list in the link itself, and gives the list a handle, `List`, that can be empty.",
            { memory: {
              title: 'A list of three nodes',
              vars: [
                { id: 'list', type: 'List', fields: [['head', 'Option<Box<Node>>']] },
                { id: 'n1', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
                { id: 'n2', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
                { id: 'n3', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
              ],
              set: { list: { head: '&n1' }, n1: { value: 1, next: '&n2' }, n2: { value: 2, next: '&n3' }, n3: { value: 3, next: 'None' } },
              caption: "Solid arrows own. `list` owns the first node, each node owns the one after it, and nothing else points at any of them. The last link holds `None`.",
            } },
            "Ownership runs in a chain: `list` owns the first node, the first node owns the second, and so on down to the `None`. That is one owner for every node, which is the shape Rust likes. Three operations cause trouble all the same, and they are the middle of this lesson.",
            { list: [
              "**Changing the front.** `push` and `pop` must move a box out of `head` while holding only `&mut self`. Section 2.",
              "**Changing the middle or the end.** That takes a mutable reference that walks down the chain. Section 4.",
              "**More than one way in.** A doubly linked list, or a tree whose nodes know their parents, gives a node two things that point at it. A `Box` cannot do that. Section 7.",
            ] },
            { compare: "In Python, PHP and TypeScript a node is an object on the heap, every variable and field that mentions it is a reference, and the garbage collector frees it when the last reference is gone. Nobody has to say who owns the second node. Rust asks, and for this list the answer is simple: the node in front of it." },
            { tip: "You will rarely need to write a linked list. A `Vec` beats one at almost every job, because its elements sit side by side in memory where the processor's cache finds them, and `VecDeque` covers queues. Lists are worth an hour because they isolate two hard moves: taking a value out of a borrowed place, and walking a mutable reference down a structure. Trees need the same two, and trees you will write." },
          ],
        },
        {
          title: 'A stack: Option<Box<Node>> and take',
          body: [
            "Start with the two operations at the head. `push` puts a new node in front. `pop` removes the first node and returns its value. A list used through those two alone is a stack.",
            "`push` makes a node whose `next` is the old first node, then makes `head` point at the new node. In Python that is `self.head = Node(value, self.head)`. Before trying the same in Rust, look at what it asks for.",
            "`next: self.head` would move the box out of the list and into the new node. For a local variable that is routine: lesson 5 showed the compiler marking a variable as moved and refusing every later use. But `self.head` is not a local. It is part of a list that the caller owns and will go on using, and all this function has is a `&mut` to it. If the move were allowed, `head` would keep the address of the first node while the new node owned it as well. Should the function end at that point, through an early `return` or a panic, the caller would be left with a list whose first node has two owners, and the node would be freed twice.",
            "So the rule, which lesson 5 met with an element of a `Vec` and lesson 13 with an `Option`, is that **a value cannot be moved out from behind a reference**. A borrowed place has to hold a valid value at every moment, because it is not yours to leave empty.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn push(&mut self, value: i32) {
        let node = Box::new(Node { value, next: self.head });
        self.head = Some(node);
    }
}

fn main() {
    let mut list = List { head: None };
    list.push(1);
    list.push(2);
    println!("{}", list.head.is_some());
}`, name: 'push_moves.rs', fails: 'E0507' },
            "`E0507`: cannot move out of `self.head`, which is behind a mutable reference. The note offers a clone, which would copy the whole list in order to add one node. What `push` needs is to move the box out **and leave something valid behind**. For an `Option` the something is obvious: `None`. That is `Option::take` from lesson 13: the `std::mem::take` of lesson 14, as a method. It swaps `None` into the place, returns what was there, and needs only a `&mut`.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn push(&mut self, value: i32) {
        let old_head = self.head.take();           // head is None for a moment
        self.head = Some(Box::new(Node { value, next: old_head }));
    }

    fn pop(&mut self) -> Option<i32> {
        let node = self.head.take()?;              // an empty list returns None here
        self.head = node.next;                     // the second node becomes the first
        Some(node.value)
    }                                              // the popped node's box is freed here

    fn peek(&self) -> Option<i32> {
        self.head.as_ref().map(|node| node.value)
    }

    fn peek_mut(&mut self) -> Option<&mut i32> {
        self.head.as_mut().map(|node| &mut node.value)
    }
}

fn main() {
    let mut list = List { head: None };
    list.push(1);
    list.push(2);
    list.push(3);
    println!("{:?}", list.peek());

    if let Some(top) = list.peek_mut() {
        *top *= 10;
    }
    println!("{:?} {:?}", list.pop(), list.pop());

    list.push(4);
    println!("{:?} {:?} {:?}", list.pop(), list.pop(), list.pop());
}`, name: 'stack.rs', expect: 'Some(3)\nSome(30) Some(2)\nSome(4) Some(1) None\n' },
            { list: [
              "`push`: `take` moves the old first node's box into `old_head` and leaves `None` in `head`. The new node takes ownership of `old_head`, and `head` takes ownership of the new node.",
              "`pop`: after `take`, the list is empty and `node` is a `Box<Node>` that this function owns. The `?` returns `None` if there was no node. `node.next` moves the rest of the list out of the box and back into `head`, and `node.value` copies the number out. Moving a field out of a box you own is allowed. The box itself is freed at the closing brace.",
              "`peek` only looks, so it must not move anything. `as_ref` turns a `&Option<Box<Node>>` into an `Option<&Box<Node>>`, which `map` can consume freely. `as_mut` does the same for `&mut`, and `peek_mut` uses it to hand out a `&mut i32` that points into the first node.",
            ] },
            "Step through `push` and watch who owns what. This is the same function, with the new node given a name so that each move has a line of its own.",
            { trace: {
              title: 'push with take: every node has one owner at every step',
              code: rs`fn push(&mut self, value: i32) {
    let old_head = self.head.take();
    let node = Box::new(Node {
        value,
        next: old_head,
    });
    self.head = Some(node);
}`,
              vars: [
                { id: 'list', type: 'List', fields: [['head', 'Option<Box<Node>>']] },
                { id: 'push.self', name: 'self', type: '&mut List', frame: 'push' },
                { id: 'push.value', name: 'value', type: 'i32', frame: 'push' },
                { id: 'push.old', name: 'old_head', type: 'Option<Box<Node>>', frame: 'push' },
                { id: 'push.node', name: 'node', type: 'Box<Node>', frame: 'push' },
                { id: 'n2', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
                { id: 'n1', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
                { id: 'n3', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
              ],
              steps: [
                { line: 1, set: { list: { head: '&n2' }, n2: { value: 2, next: '&n1' }, n1: { value: 1, next: 'None' }, 'push.self': '&list', 'push.value': 3 }, say: "`list.push(3)` on a list that holds 2 and 1. `self` borrows the list, which is why its arrow is dashed. The solid arrows own." },
                { line: 2, set: { 'list.head': 'None', 'push.old': '&n2' }, say: "`take` moves the box into `old_head` and leaves `None` behind. For this moment the caller's list is empty. It is still a valid list, and the node that holds 2 still has exactly one owner." },
                { line: [3, 4, 5, 6], set: { n3: { value: 3, next: '&n2' }, 'push.node': '&n3' }, moved: ['push.old'], say: "A new node is allocated. `old_head` moves into its `next` field, so the new node now owns the whole of the old list." },
                { line: 7, set: { 'list.head': '&n3' }, moved: ['push.node'], say: "The box moves into `head`. The list is whole again: 3, 2, 1." },
                { line: 8, hide: ['frame:push'], say: "`push` returns and its frame is gone. Three pointers were moved. No node was copied, and none changed its address." },
              ],
            } },
            { pitfall: "Writing `pop` as `self.head.map(|node| …)` looks shorter, but `map` consumes the option it is called on. That is a move out of `self.head`, and it fails with the same `E0507`. The first question of this lesson has you check it. When that error points at an `Option` field, the fix is nearly always one of three methods: `take()` to move the contents out and leave `None`, `as_ref()` to look inside, or `as_mut()` to change what is inside." },
            { compare: "`self.head = Node(value, self.head)` works in Python because both sides are references to objects that the collector looks after. For a moment two names refer to the old first node, and nobody minds. Rust has no such moment. Each box has one owner at every step, which is why `push` is two moves where Python has one assignment. The moves are cheap: a box is 8 bytes, and the nodes stay where they are." },
          ],
        },
        {
          title: 'Walking the list, and an iterator with a lifetime',
          body: [
            "Reading a list needs none of that. A shared reference is `Copy`, so a cursor that only reads is an ordinary variable, and stepping forward is an assignment.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn push(&mut self, value: i32) {
        let old_head = self.head.take();
        self.head = Some(Box::new(Node { value, next: old_head }));
    }

    fn len(&self) -> usize {
        let mut count = 0;
        let mut current = &self.head;              // &Option<Box<Node>>
        while let Some(node) = current {           // node: &Box<Node>
            count += 1;
            current = &node.next;                  // step to the next link
        }
        count
    }

    fn contains(&self, wanted: i32) -> bool {
        let mut current = self.head.as_deref();    // Option<&Node>
        while let Some(node) = current {
            if node.value == wanted {
                return true;
            }
            current = node.next.as_deref();
        }
        false
    }
}

fn main() {
    let mut list = List { head: None };
    for value in [30, 20, 10] {
        list.push(value);
    }
    println!("{} nodes", list.len());
    println!("{} {}", list.contains(20), list.contains(25));
}`, name: 'walk.rs', expect: '3 nodes\ntrue false\n' },
            "Both loops make the same walk. `len` keeps a reference to a link, a `&Option<Box<Node>>`. Matching it against `Some(node)` gives `node` as a reference into the list, because a pattern applied through a reference binds references, as lesson 12 showed. `contains` keeps an `Option<&Node>` instead. `as_deref` from lesson 13 looks inside the option and through the box in one step, which gives a tidier type to store.",
            "A loop inside a method is enough for `len`. For everything else you want the list to work with `for` and with the adapters of lesson 18, and that takes an iterator: a struct that remembers how far it has got.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

struct Iter<'a> {
    next: Option<&'a Node>,                        // the node to hand out next
}

impl<'a> Iterator for Iter<'a> {
    type Item = &'a i32;

    fn next(&mut self) -> Option<&'a i32> {
        let node = self.next?;
        self.next = node.next.as_deref();
        Some(&node.value)
    }
}

impl List {
    fn push(&mut self, value: i32) {
        let old_head = self.head.take();
        self.head = Some(Box::new(Node { value, next: old_head }));
    }

    fn iter(&self) -> Iter<'_> {
        Iter { next: self.head.as_deref() }
    }
}

fn main() {
    let mut list = List { head: None };
    for value in [30, 20, 10] {
        list.push(value);
    }

    for value in list.iter() {
        if *value > 15 {
            println!("{value} is large");
        }
    }
    let doubled: Vec<i32> = list.iter().map(|value| value * 2).collect();
    let total: i32 = list.iter().sum();
    println!("{doubled:?} {total} {:?}", list.iter().max());

    let first = list.iter().next();                // the iterator is gone after this line
    println!("{first:?}");                         // still good: it borrows from the list
}`, name: 'iter.rs', expect: '20 is large\n30 is large\n[20, 40, 60] 60 Some(30)\nSome(10)\n' },
            "`Iter` holds a reference into the list, so it needs a lifetime parameter, like any struct with a reference in it (lesson 10). `'a` is the time for which the list is borrowed, and it does two jobs.",
            { list: [
              "**The items are `&'a i32`.** They borrow from the list, not from the iterator. That is why `first`, on the last two lines, is still usable after the iterator that produced it has gone.",
              "**The list stays borrowed for as long as an `Iter` exists.** Nothing can change it in the middle of a loop.",
            ] },
            "Inside `next`, `self.next?` reads the field out of `&mut self` with no `take`. An `Option<&Node>` is `Copy`, because a shared reference is, so reading it is a copy and not a move. Compare `self.head.take()?` in `pop`, where the field held an owning box. In the signature of `iter`, the `'_` marks where the elided lifetime goes: the iterator borrows from `self`.",
            "The second job is worth seeing fail. Lesson 14 showed a `Vec` that refused to be changed inside a loop over it. Your iterator gets the same protection from its lifetime, and you wrote no code for it.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

struct Iter<'a> {
    next: Option<&'a Node>,
}

impl<'a> Iterator for Iter<'a> {
    type Item = &'a i32;

    fn next(&mut self) -> Option<&'a i32> {
        let node = self.next?;
        self.next = node.next.as_deref();
        Some(&node.value)
    }
}

impl List {
    fn push(&mut self, value: i32) {
        let old_head = self.head.take();
        self.head = Some(Box::new(Node { value, next: old_head }));
    }

    fn iter(&self) -> Iter<'_> {
        Iter { next: self.head.as_deref() }
    }
}

fn main() {
    let mut list = List { head: None };
    list.push(2);
    list.push(1);

    for value in list.iter() {
        if *value == 1 {
            list.push(0);                          // changes the list during the walk
        }
    }
    println!("{}", list.iter().count());
}`, name: 'push_while_iterating.rs', fails: 'E0502' },
            { compare: "A hand-written list in Python or TypeScript accepts that loop, and what it does depends on where the new node lands. Pushed at the front, the new node is never visited. Appended at the end, by a loop that appends once for every node it sees, the loop never finishes. Rust refuses the program without knowing what `push` does. `iter` holds a shared borrow, `push` needs an exclusive one, and that is the whole analysis." },
          ],
        },
        {
          title: 'A mutable cursor: the pointer to the link',
          body: [
            "Everything so far happened at the head. To add a node at the end or in the middle, a reference that can change things has to walk down the list. This is the part of Rust that is hardest on newcomers, so take it one step at a time.",
            "Start with `push_back`, which adds a node at the far end. The version everyone writes first walks a `&mut` from node to node until it reaches the last one, and then sets that node's `next`. An empty list has no last node, so it needs a special case as well.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn push_back(&mut self, value: i32) {
        let new = Some(Box::new(Node { value, next: None }));
        match self.head.as_mut() {
            None => self.head = new,               // the special case: no last node
            Some(mut node) => {
                while let Some(next) = node.next.as_mut() {
                    node = next;                   // walk to the last node
                }
                node.next = new;
            }
        }
    }
}

fn main() {
    let mut list = List { head: None };
    list.push_back(10);
    list.push_back(20);
    println!("{}", list.head.is_some());
}`, name: 'walk_the_nodes.rs', fails: 'E0506' },
            "`E0506`: cannot assign to `node.next` because it is borrowed. The borrow is the one in the loop's condition, `node.next.as_mut()`. When that call returns `Some(next)`, the loop stores `next` in `node`, so the borrow has to stay alive for as long as `node` is used, which is to the end of the function. The compiler gives each borrow **one** extent, covering every path the code can take. So on the path where the call returns `None` and the loop ends, `node.next` still counts as borrowed, and the assignment on the next line is refused.",
            "Nothing would go wrong if this ran. When the loop ends, the call has just returned `None`, and a `None` holds no reference to anything. The aliasing rule is not broken here: the compiler's analysis is too coarse to see that it is kept. This is the best-known false alarm in Rust, and the Rust project is developing a more precise analysis, called Polonius, that accepts this function as it stands. Until that arrives the function has to be written another way, and the other way turns out to be the better one.",
            "Change what the cursor points at. Instead of a node, point at a **link**: the place that holds the pointer to a node. `head` is a link, and so is the `next` field of every node. They all have the type `Option<Box<Node>>`, so one variable of type `&mut Option<Box<Node>>` can point at any of them. Appending then has no special case: find the link that holds `None`, and put the new node there.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn push_back(&mut self, value: i32) {
        let mut link = &mut self.head;             // &mut Option<Box<Node>>
        while let Some(node) = link {              // node: &mut Box<Node>
            link = &mut node.next;                 // on to the link inside this node
        }
        *link = Some(Box::new(Node { value, next: None }));
    }

    fn to_vec(&self) -> Vec<i32> {
        let mut values = Vec::new();
        let mut current = &self.head;
        while let Some(node) = current {
            values.push(node.value);
            current = &node.next;
        }
        values
    }
}

fn main() {
    let mut list = List { head: None };
    list.push_back(10);                            // the loop never runs: link is head
    list.push_back(20);
    list.push_back(30);
    println!("{:?}", list.to_vec());
}`, name: 'push_back.rs', expect: '[10, 20, 30]\n' },
            { memory: {
              title: 'push_back(30) on a list of 10 and 20, when the loop has ended',
              vars: [
                { id: 'list', type: 'List', fields: [['head', 'Option<Box<Node>>']] },
                { id: 'link', type: '&mut Option<Box<Node>>', frame: 'push_back' },
                { id: 'n10', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
                { id: 'n20', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
              ],
              set: { list: { head: '&n10' }, n10: { value: 10, next: '&n20' }, n20: { value: 20, next: 'None' }, link: '&n20.next' },
              caption: "`link` points at a field inside the last node, not at a node. Its arrow is dashed because it borrows. `*link = Some(…)` writes into that field. In an empty list the loop body never runs, `link` still points at `list.head`, and the same assignment creates the first node.",
            } },
            "Why is this loop accepted when the last one was not? `while let Some(node) = link` looks inside `*link` first, and borrows from it only if it finds a node. On the path that leaves the loop the link held `None`, nothing was borrowed, and `link` is free for the assignment. On the path that continues, `node` is a mutable borrow made through `link`, and `&mut node.next` is a mutable borrow made through `node`. That newest reference is stored back into `link`, and the old one is never used again. The borrows form a chain, each made from the one before, and only the far end is ever used. At every moment there is exactly one writer.",
            { fromC: "This is the `struct Node **link` of the C course's linked-list lesson, line for line: `link = &head`, then `link = &(*link)->next` for as long as `*link` is not null, then `*link = node`. The difference is what happens when you get it wrong. In C a stale `link` writes into freed memory. Here it does not compile." },
            "That loop runs until it finds `None`. Most cursors have to stop sooner. To keep a list sorted, the cursor must stop at the first node that is not smaller than the new value, so that the new node can go in front of it. Written the natural way, with a `break`, the false alarm is back.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn insert_sorted(&mut self, value: i32) {
        let mut link = &mut self.head;
        while let Some(node) = link {
            if node.value >= value {
                break;                             // insert in front of this node
            }
            link = &mut node.next;
        }
        let rest = link.take();
        *link = Some(Box::new(Node { value, next: rest }));
    }
}

fn main() {
    let mut list = List { head: None };
    list.insert_sorted(20);
    list.insert_sorted(10);
    println!("{}", list.head.is_some());
}`, name: 'sorted_break.rs', fails: 'E0499' },
            "It is the same story on a different path. This time the loop is left at a moment when the pattern did find a node, so `node` borrows from `*link`. On the other path, the one that goes around again, `&mut node.next` is stored into `link`, which keeps that borrow alive to the end of the function. One extent covers every path, so after the `break` the borrow still counts, and `link.take()` is a second mutable borrow of the same place. That is why the first message marks one spot twice, as the second borrow and as the place where the first is `later used`: for all the compiler can tell, `link` is still the reference that the loop stored in it.",
            "Again nothing would go wrong: on the `break` path `node` is never touched again. The way out is to hold no borrow across the decision.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn insert_sorted(&mut self, value: i32) {
        let mut link = &mut self.head;
        while link.as_ref().is_some_and(|node| node.value < value) {
            link = &mut link.as_mut().unwrap().next;
        }
        let rest = link.take();                    // everything from here on, or None
        *link = Some(Box::new(Node { value, next: rest }));
    }

    fn remove(&mut self, value: i32) -> bool {
        let mut link = &mut self.head;
        while link.as_ref().is_some_and(|node| node.value != value) {
            link = &mut link.as_mut().unwrap().next;
        }
        match link.take() {
            Some(node) => {
                *link = node.next;                 // the link now skips the removed node
                true
            }
            None => false,
        }
    }

    fn to_vec(&self) -> Vec<i32> {
        let mut values = Vec::new();
        let mut current = &self.head;
        while let Some(node) = current {
            values.push(node.value);
            current = &node.next;
        }
        values
    }
}

fn main() {
    let mut list = List { head: None };
    for value in [20, 40, 10, 30] {
        list.insert_sorted(value);
    }
    println!("{:?}", list.to_vec());

    list.insert_sorted(25);                        // in the middle
    list.insert_sorted(5);                         // at the head
    list.insert_sorted(99);                        // at the end
    println!("{:?}", list.to_vec());

    println!("{} {}", list.remove(25), list.remove(7));
    println!("{:?}", list.to_vec());
}`, name: 'cursor.rs', expect: '[10, 20, 30, 40]\n[5, 10, 20, 25, 30, 40, 99]\ntrue false\n[5, 10, 20, 30, 40, 99]\n' },
            { steps: [
              "**Ask with a shared borrow.** `link.as_ref()` gives an `Option<&Box<Node>>`. `is_some_and` is true when the option is `Some` and the closure says yes to what is inside. By the time the condition is a `bool`, that borrow is over.",
              "**Advance with a fresh mutable borrow.** `link.as_mut()` gives an `Option<&mut Box<Node>>`. The condition has just established that it is `Some`, so the `unwrap` cannot fail. The new reference goes straight into `link`, on the only path there is.",
              "**Change the list through `*link`.** When the loop ends, nothing but `link` borrows the list. Inserting is the `push` of section 2 at whichever link the cursor stopped on: `take` what is there, and store a new node that owns it. Removing is `pop` at that link.",
            ] },
            "`push` and `pop` are these two functions with a cursor that never leaves `head`. With a pointer to the link, the front, the middle and the end of a list are one case.",
            { trace: {
              title: 'Inserting 25 through a cursor: the body of insert_sorted',
              code: rs`let mut link = &mut self.head;
while link
    .as_ref()
    .is_some_and(|node| node.value < value)
{
    link = &mut link.as_mut().unwrap().next;
}
let rest = link.take();
let node = Node { value, next: rest };
*link = Some(Box::new(node));`,
              vars: [
                { id: 'list', type: 'List', fields: [['head', 'Option<Box<Node>>']] },
                { id: 'ins.value', name: 'value', type: 'i32', frame: 'insert_sorted' },
                { id: 'ins.link', name: 'link', type: '&mut Option<Box<Node>>', frame: 'insert_sorted' },
                { id: 'ins.rest', name: 'rest', type: 'Option<Box<Node>>', frame: 'insert_sorted' },
                { id: 'n10', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
                { id: 'n20', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
                { id: 'n30', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
                { id: 'n25', name: 'node', type: 'Node', frame: 'heap', fields: [['value', 'i32'], ['next', 'Option<Box<Node>>']] },
              ],
              steps: [
                { line: 1, set: { list: { head: '&n10' }, n10: { value: 10, next: '&n20' }, n20: { value: 20, next: '&n30' }, n30: { value: 30, next: 'None' }, 'ins.value': 25, 'ins.link': '&list.head' }, say: "`list.insert_sorted(25)` on a list of 10, 20 and 30. The condition is spread over three lines here, and the new node has a name. The cursor starts on `head`. Its arrow is dashed: it borrows the link and owns nothing." },
                { line: [2, 3, 4], say: "The condition looks through the link with a shared borrow. There is a node, and 10 is less than 25. The borrow ends with the condition." },
                { line: 6, set: { 'ins.link': '&n10.next' }, say: "The cursor moves to the `next` field inside the node that holds 10. It points at a link, not at a node." },
                { line: [2, 3, 4], say: "This link leads to 20, which is less than 25." },
                { line: 6, set: { 'ins.link': '&n20.next' }, say: "The cursor moves to the link inside the node that holds 20." },
                { line: [2, 3, 4], say: "This link leads to 30, which is not less than 25. The loop ends with the cursor on the link where the new node belongs." },
                { line: 8, set: { 'n20.next': 'None', 'ins.rest': '&n30' }, say: "`take` moves the box out of that link into `rest` and leaves `None`. For this moment the list is cut in two: `list` owns 10 and 20, and `rest` owns 30." },
                { line: [9, 10], set: { n25: { value: 25, next: '&n30' }, 'n20.next': '&n25' }, moved: ['ins.rest'], say: "A new node takes ownership of `rest`, and the link takes ownership of the new node. The list is whole again: 10, 20, 25, 30. That took one allocation and three pointer moves, and the same lines would have worked at the head or at the end." },
              ],
            } },
            { pitfall: "When a cursor will not compile, it is tempting to make the error go away with `clone`, with `Rc<RefCell<Node>>` or with `unsafe`. None of them is needed for a list or a tree in which every node has one owner. Check two things instead: that the cursor points at a link and not at a node, and that the loop's test ends its borrow before the cursor moves." },
          ],
        },
        {
          title: 'Reversing and dropping',
          body: [
            "Reversing a list shows how far `take` goes. No node is allocated, copied or freed. The list is taken apart from the front, and each node becomes the new head of a second list as it comes off.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn push(&mut self, value: i32) {
        let old_head = self.head.take();
        self.head = Some(Box::new(Node { value, next: old_head }));
    }

    fn reverse(&mut self) {
        let mut reversed = None;                   // the nodes already turned around
        let mut rest = self.head.take();           // the nodes still to do
        while let Some(mut node) = rest {
            rest = node.next.take();               // detach it from the nodes after it
            node.next = reversed;                  // it now leads the reversed part
            reversed = Some(node);
        }
        self.head = reversed;
    }

    fn to_vec(&self) -> Vec<i32> {
        let mut values = Vec::new();
        let mut current = &self.head;
        while let Some(node) = current {
            values.push(node.value);
            current = &node.next;
        }
        values
    }
}

fn main() {
    let mut list = List { head: None };
    for value in [4, 3, 2, 1] {
        list.push(value);
    }
    println!("{:?}", list.to_vec());
    list.reverse();
    println!("{:?}", list.to_vec());
}`, name: 'reverse.rs', expect: '[1, 2, 3, 4]\n[4, 3, 2, 1]\n' },
            "Inside the loop, `node` is a `Box<Node>` that the function owns. No borrow is involved, which is why this loop needs none of the care of section 4. Each node has one owner at every step: `rest`, then `node`, then `reversed`. When you can take ownership of the pieces, do. Owning is always easier than borrowing mutably.",
            "Now look at what you have not written: any code to free a list. When a `List` goes out of scope, its `head` is dropped. Dropping a `Box<Node>` drops the `Node`, which drops its fields, and one of those fields is the box of the next node. A `Drop` on `Node` shows the order.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

impl Drop for Node {
    fn drop(&mut self) {
        println!("dropping {}, next still attached: {}", self.value, self.next.is_some());
    }
}

fn main() {
    let third = Node { value: 3, next: None };
    let second = Node { value: 2, next: Some(Box::new(third)) };
    let head = Some(Box::new(Node { value: 1, next: Some(Box::new(second)) }));

    println!("the list is built");
    drop(head);
    println!("end of main");
}`, name: 'drop_order.rs', expect: 'the list is built\ndropping 1, next still attached: true\ndropping 2, next still attached: true\ndropping 3, next still attached: false\nend of main\n' },
            "A value's `drop` runs first and its fields are dropped afterward, as lesson 20 said. So the drop of the first node is not finished until the second has been dropped, and the second waits for the third. The calls are **nested**. Dropping the head of a list of a million nodes puts a million unfinished calls on the stack before the first of them returns.",
            "A thread's stack is a few megabytes, and that is not enough. The result is not a panic. The program is stopped on the spot, with a report that the main thread has overflowed its stack. No destructors run and nothing can catch it. Worse, no test with a short list will ever show the problem. The compiler generates a recursive drop because it follows the shape of the type, and the type is recursive. The cure is to write `Drop` for the list yourself and take the chain apart in a loop.",
            { run: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn push(&mut self, value: i32) {
        let old_head = self.head.take();
        self.head = Some(Box::new(Node { value, next: old_head }));
    }

    fn peek(&self) -> Option<i32> {
        self.head.as_ref().map(|node| node.value)
    }
}

impl Drop for List {
    fn drop(&mut self) {
        let mut current = self.head.take();
        while let Some(mut node) = current {
            current = node.next.take();            // detach the rest before this node goes
        }                                          // node is dropped here, alone
    }
}

fn main() {
    let mut list = List { head: None };
    for value in 0..1_000_000 {
        list.push(value);
    }
    println!("a million nodes, and the first holds {:?}", list.peek());
    drop(list);
    println!("dropped with a loop");
}`, name: 'long_drop.rs', expect: 'a million nodes, and the first holds Some(999999)\ndropped with a loop\n' },
            "Each time around, `node.next.take()` moves the rest of the chain out of the node **before** the node is dropped at the end of the loop body. A node whose `next` is `None` has nothing to recurse into, so the loop uses the same small amount of stack for a list of any length. It is `reverse` without the rebuilding. Delete the `impl Drop` block and press Run to see the overflow for yourself.",
            { compare: "A garbage collector follows a long chain with a loop and a work list of its own, so in Python, PHP or TypeScript the length of a list has nothing to do with the depth of the call stack. Rust's drop is ordinary code generated from the type, and it recurses where the type does. You know the limit from the other side: a recursive function in Python gives up at a depth of about a thousand calls." },
            { fromC: "In C you wrote this loop for every list: save `next`, `free` the node, move on. Rust writes the freeing for you and cannot get the order wrong. For a long chain you take the loop back, and the compiler still does the freeing inside it." },
          ],
        },
        {
          title: 'Trees: insert through a pointer to the link',
          body: [
            "A binary search tree is a list whose nodes have two links. Every key in a node's left subtree is smaller than the node's own key, and every key in its right subtree is larger, so a search can discard half of what remains at each step. The ownership is the same chain, branching: the tree owns its root, and each node owns its two children.",
            { run: rs`struct Node {
    key: i32,
    left: Option<Box<Node>>,
    right: Option<Box<Node>>,
}

struct Tree {
    root: Option<Box<Node>>,
}

impl Tree {
    /// Adds key. Returns false if it was already there.
    fn insert(&mut self, key: i32) -> bool {
        let mut link = &mut self.root;
        while let Some(node) = link {
            if key == node.key {
                return false;
            }
            link = if key < node.key { &mut node.left } else { &mut node.right };
        }
        *link = Some(Box::new(Node { key, left: None, right: None }));
        true
    }

    fn contains(&self, key: i32) -> bool {
        let mut current = &self.root;
        while let Some(node) = current {
            if key == node.key {
                return true;
            }
            current = if key < node.key { &node.left } else { &node.right };
        }
        false
    }
}

fn in_order(link: &Option<Box<Node>>, keys: &mut Vec<i32>) {
    if let Some(node) = link {
        in_order(&node.left, keys);
        keys.push(node.key);
        in_order(&node.right, keys);
    }
}

fn height(link: &Option<Box<Node>>) -> usize {
    match link {
        None => 0,
        Some(node) => 1 + height(&node.left).max(height(&node.right)),
    }
}

fn main() {
    let mut tree = Tree { root: None };
    for key in [50, 30, 70, 20, 40, 60, 80] {
        tree.insert(key);
    }
    println!("inserting 40 again: {}", tree.insert(40));
    println!("{} {}", tree.contains(60), tree.contains(65));

    let mut keys = Vec::new();
    in_order(&tree.root, &mut keys);
    println!("{keys:?}, height {}", height(&tree.root));

    let mut chain = Tree { root: None };
    for key in 1..=7 {
        chain.insert(key);
    }
    println!("seven keys inserted in order: height {}", height(&chain.root));
}`, name: 'bst.rs', expect: 'inserting 40 again: false\ntrue false\n[20, 30, 40, 50, 60, 70, 80], height 3\nseven keys inserted in order: height 7\n' },
            "`insert` is `push_back` with a choice of link at each step. The cursor starts on `root`, follows `left` or `right`, and stops on the `None` where the key belongs. An empty tree is not a special case, for the same reason that an empty list was not.",
            "The early `return false` gives the borrow checker no trouble, although the `break` in section 4 did. The difference is what follows. After the `break`, the function went on to use `link` while a borrow made through it still counted as alive. After a `return`, nothing uses `link` at all.",
            "`contains` is the read-only walk of section 3. `in_order` and `height` have to visit both sides of every node, which one cursor cannot do, so they recurse. Passing `&node.left` to a function that takes a `&Option<Box<Node>>` is the cursor again, as a parameter.",
            "Insertion can be written that way too. Each call receives a fresh `&mut` to one link, so there is no variable to reassign and nothing for the borrow checker to object to.",
            { run: rs`struct Node {
    key: i32,
    left: Option<Box<Node>>,
    right: Option<Box<Node>>,
}

fn insert(link: &mut Option<Box<Node>>, key: i32) -> bool {
    match link {
        None => {
            *link = Some(Box::new(Node { key, left: None, right: None }));
            true
        }
        Some(node) if key < node.key => insert(&mut node.left, key),
        Some(node) if key > node.key => insert(&mut node.right, key),
        Some(_) => false,
    }
}

fn in_order(link: &Option<Box<Node>>, keys: &mut Vec<i32>) {
    if let Some(node) = link {
        in_order(&node.left, keys);
        keys.push(node.key);
        in_order(&node.right, keys);
    }
}

fn main() {
    let mut root = None;
    for key in [4, 2, 6, 1, 3, 2] {
        if !insert(&mut root, key) {
            println!("{key} was already there");
        }
    }
    let mut keys = Vec::new();
    in_order(&root, &mut keys);
    println!("{keys:?}");
}`, name: 'bst_recursive.rs', expect: '2 was already there\n[1, 2, 3, 4, 6]\n' },
            "The recursion is as deep as the tree is tall. A balanced tree of a million keys is about 20 levels deep, so recursion is safe there, and so is the compiler's recursive drop. But the last line of the first program shows what sorted input does: every node has only a right child, and the tree is a linked list with a spare field. A million keys inserted in order make a tree a million levels deep, and section 5 applies to it again. Production trees rebalance as they grow. The standard library's `BTreeMap` and `BTreeSet` do, and for an ordered collection they are what you should use.",
          ],
        },
        {
          title: 'When nodes need more than one owner',
          body: [
            "Every structure so far had one way in to each node. Many useful ones do not.",
            { list: [
              "A **doubly linked list**: each node is pointed at by the node before it and by the node after it.",
              "A **tree with parent links**: each node is pointed at by its parent and by every one of its children.",
              "A **graph**: a node may be pointed at by any number of others.",
            ] },
            "`Option<Box<Node>>` cannot express these, because a box is the only owner of what it points at. A plain reference does not work either. A child that holds a `&Node` to its parent keeps the parent borrowed for as long as the child exists, and that includes the moment you try to put the child into it.",
            { run: rs`struct Node<'a> {
    name: &'static str,
    parent: Option<&'a Node<'a>>,
    children: Vec<Node<'a>>,
}

fn main() {
    let mut root = Node { name: "root", parent: None, children: Vec::new() };
    let child = Node { name: "child", parent: Some(&root), children: Vec::new() };
    root.children.push(child);
    println!("{} has {} child", root.name, root.children.len());
}`, name: 'parent_reference.rs', fails: 'E0502' },
            "Three designs do work, and the first is the one to try first.",
            "**Indices into a `Vec`.** Keep every node in one `Vec`, and make each link a position in it. The `Vec` is the single owner of all the nodes. A link is a `usize`: it is `Copy`, it has no lifetime, and the borrow checker has nothing to say about it. Lesson 20 promised a tree with parent links built this way.",
            { run: rs`struct Person {
    name: &'static str,
    manager: Option<usize>,                        // a link up: an index, not a pointer
    reports: Vec<usize>,                           // links down
}

struct Org {
    people: Vec<Person>,                           // the one owner of every node
}

impl Org {
    fn add(&mut self, name: &'static str, manager: Option<usize>) -> usize {
        let id = self.people.len();
        self.people.push(Person { name, manager, reports: Vec::new() });
        if let Some(manager) = manager {
            self.people[manager].reports.push(id);
        }
        id
    }

    /// The names from this person up to the top.
    fn chain(&self, id: usize) -> Vec<&'static str> {
        let mut names = Vec::new();
        let mut current = Some(id);
        while let Some(id) = current {
            names.push(self.people[id].name);
            current = self.people[id].manager;
        }
        names
    }

    /// This person and everyone below them.
    fn headcount(&self, id: usize) -> usize {
        let reports = &self.people[id].reports;
        let below: usize = reports.iter().map(|&report| self.headcount(report)).sum();
        1 + below
    }
}

fn main() {
    let mut org = Org { people: Vec::new() };
    let ada = org.add("ada", None);
    let bob = org.add("bob", Some(ada));
    let cy = org.add("cy", Some(ada));
    let dee = org.add("dee", Some(bob));
    let eve = org.add("eve", Some(dee));

    println!("{:?}", org.chain(eve));
    println!("{} {} {}", org.headcount(ada), org.headcount(bob), org.headcount(cy));
    println!("{} people in one Vec, and dee is number {dee}", org.people.len());
}`, name: 'arena.rs', expect: '["eve", "dee", "bob", "ada"]\n5 3 1\n5 people in one Vec, and dee is number 3\n' },
            "Set this beside the `Folder` tree of lesson 20, which needed `Rc`, `Weak` and two `RefCell`s for the same two kinds of link. Here there are no counts, no guards and no `upgrade`. `add` changes two nodes through one `&mut self`, and `chain` walks upward with a loop over plain numbers. The design is called an **arena**, and it is the usual answer in Rust for trees with parent links and for graphs.",
            "An index is a pointer that the compiler knows nothing about, and that has a price.",
            { list: [
              "Nothing ties an index to its `Vec`. Use it with the wrong arena and you get the wrong node, or a panic if it is out of range. That is a bug, but it is never a read of freed memory.",
              "Removing one node is awkward. `Vec::remove` shifts every later element, which changes the meaning of indices stored all over the tree. Arenas leave a hole instead and reuse it later, and then an old index can quietly come to mean a new node.",
              "All the nodes are freed together, when the `Vec` is. For a tree that is built once and then read, such as a parsed document, that is exactly what you want.",
            ] },
            "**`Rc` and `Weak`.** This is the design of lesson 20: `Rc<RefCell<Node>>` for the links that own, and `Weak` for the links that lead back. Each node is an allocation of its own, a node can be freed by itself, and a handle held elsewhere in the program keeps its node alive. The price is the counts, the borrow checks at run time and the noisier code. It fits when nodes come and go all the time and other parts of the program hold on to individual nodes, as in a tree of interface widgets.",
            "**A crate, or the standard library.** These problems have been solved, and the solutions are one line of configuration away. Lesson 22 shows how to add a crate.",
            { table: {
              head: ['You need', 'Reach for'],
              rows: [
                ['A stack, a queue or a plain sequence', '`Vec` or `VecDeque`, from the standard library'],
                ['An ordered set or map', '`BTreeSet` or `BTreeMap`, from the standard library'],
                ['A list or tree of your own, with one owner for each node', '`Option<Box<Node>>`, as in this lesson'],
                ['Parent links or a graph, built and then read', 'Indices into a `Vec`'],
                ['The same, with nodes removed and their slots reused', 'The `slotmap` crate: an arena whose keys carry a generation number, so a stale key is refused instead of reaching the slot\'s new occupant'],
                ['A graph, with the usual algorithms', 'The `petgraph` crate'],
                ['Nodes that are shared, changed and freed one at a time', '`Rc<RefCell<Node>>` with `Weak`'],
              ],
            } },
            "The standard library has a doubly linked list of its own, `std::collections::LinkedList`. Inside, it and `BTreeMap` are written with raw pointers and `unsafe`, behind an interface that is safe to use. Lesson 24 is about that technique. It is how a new pointer structure gets built once, with great care, and then used by everyone without any.",
            { native: [
              "Adding either crate to a project is one command. Lesson 22 covers Cargo and crates.io.",
              { shell: 'cargo add slotmap\ncargo add petgraph', name: 'Terminal · add an arena or a graph library' },
            ] },
          ],
        },
      ],
      takeaways: [
        "A list node is a value and a `next: Option<Box<Node>>`. Each link owns the node after it, `None` ends the chain, and a link is 8 bytes.",
        "A value cannot be moved out from behind a reference (`E0507`). `take()` moves an `Option`'s contents out and leaves `None`. `as_ref`, `as_mut` and `as_deref` look inside without moving.",
        "Reading is easy: a shared cursor is a variable you reassign. An iterator is a struct that holds an `Option<&'a Node>`, and its lifetime keeps the list from changing while it is in use.",
        "To change the middle or the end, point a `&mut Option<Box<Node>>` at the link, not at the node. If the loop stops early and the cursor is used afterward, test with a short shared borrow (`as_ref`) and advance with a fresh mutable one (`as_mut`).",
        "The generated drop of a chain is recursive, one level for each node. A long list needs a `Drop` that takes the chain apart in a loop.",
        "A `Box` gives a node one owner. For parent links, doubly linked lists and graphs, reach first for indices into a `Vec`, then for `Rc` with `Weak` or a crate. For plain sequences and ordered maps, use `Vec`, `VecDeque` and `BTreeMap`.",
      ],
      quiz: [
        {
          q: 'Does this `pop` compile?',
          code: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn pop(&mut self) -> Option<i32> {
        self.head.map(|node| {
            self.head = node.next;
            node.value
        })
    }
}

fn main() {
    let mut list = List { head: Some(Box::new(Node { value: 1, next: None })) };
    println!("{:?}", list.pop());
}`,
          options: [
            { t: 'No: `map` takes the `Option` by value, and `self.head` cannot be moved out from behind `&mut self`', ok: true, why: "The compiler reports `E0507`. The list belongs to the caller, so `head` must hold a valid value at every moment. `self.head.take().map(…)` compiles: `take` moves the box out and leaves `None` in its place." },
            { t: 'Yes, and it prints `Some(1)`', why: "The logic is right, and in Python the same lines would work, because `self.head` would be one more reference to the node. In Rust `map` consumes the option it is called on, and this option is not the function's to consume." },
            { t: 'No: `node.next` cannot be moved out of a box', why: "It can. Inside the closure `node` would be a `Box<Node>` that the closure owns, and moving a field out of a box you own is allowed. The lesson's `pop` does exactly that. The error is one step earlier, at `self.head.map`." },
            { t: 'No: the closure assigns to `self.head` while `self.head` is borrowed', why: "`map` takes its option by value, so nothing would be borrowed while the closure runs. The compiler has one complaint here, and it is about the move." },
          ],
          verify: 'E0507',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

impl List {
    fn push(&mut self, value: i32) {
        let old_head = self.head.take();
        self.head = Some(Box::new(Node { value, next: old_head }));
    }

    fn pop(&mut self) -> Option<i32> {
        let node = self.head.take()?;
        self.head = node.next;
        Some(node.value)
    }
}

fn main() {
    let mut list = List { head: None };
    list.push(1);
    list.push(2);
    let first = list.pop();
    list.push(3);
    list.push(4);
    let second = list.pop();
    let third = list.pop();
    println!("{first:?} {second:?} {third:?} {:?} {:?}", list.pop(), list.pop());
}`,
          answer: 'Some(2) Some(4) Some(3) Some(1) None',
          explain: "`push` and `pop` both work at the head, so the last value in is the first out. After the first `pop` the list holds only 1. Then 3 and 4 go in front of it, and come off in the order 4, 3. The 1 has been at the bottom throughout, and the fifth `pop` finds the list empty.",
          hint: "Draw the list after each line, with the head on the left. Both operations work on the left end.",
        },
        {
          q: 'Does `cut_at` compile?',
          code: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

/// Cuts the list off in front of the first node that holds value.
fn cut_at(head: &mut Option<Box<Node>>, value: i32) {
    let mut link = head;
    while let Some(node) = link {
        if node.value == value {
            break;
        }
        link = &mut node.next;
    }
    *link = None;
}

fn main() {
    let second = Node { value: 2, next: None };
    let mut head = Some(Box::new(Node { value: 1, next: Some(Box::new(second)) }));
    cut_at(&mut head, 2);
    println!("{}", head.is_some());
}`,
          options: [
            { t: 'No: on the `break` path, the borrow held by `node` still counts as alive when `*link` is assigned', ok: true, why: "This is the false alarm of section 4, reported here as `E0506`. `node` borrows from `*link`, and on the looping path that borrow is stored into `link` and kept. The compiler gives a borrow one extent for all paths, so after the `break` it is still in force. The fix is to test with `link.as_ref().is_some_and(…)` and advance with `link.as_mut().unwrap()`." },
            { t: 'Yes, and it prints `true`', why: "It would print that if it ran, and nothing unsafe would happen. The borrow checker is stricter than this program needs: it does not follow the `break` path separately from the path that keeps the borrow." },
            { t: 'No: `*link = None` would leak the nodes after the cut', why: "Assigning to a place drops the value that was there. The old box, and every node behind it, would be freed by the assignment. Nothing leaks in safe Rust by overwriting an owner." },
            { t: 'No: `link` is a `&mut`, and a `&mut` cannot be reassigned', why: "`link` is declared `let mut`, so the variable can be pointed at another link. The section's `push_back` does it on every pass of its loop. What `&mut` restricts is who else may use the place it points at." },
          ],
          verify: 'E0506',
        },
        {
          q: 'This function also leaves its loop early. Does it compile?',
          code: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

/// Replaces the first old with new. Returns false if old is not in the list.
fn replace_first(head: &mut Option<Box<Node>>, old: i32, new: i32) -> bool {
    let mut link = head;
    while let Some(node) = link {
        if node.value == old {
            node.value = new;
            return true;
        }
        link = &mut node.next;
    }
    false
}

fn main() {
    let second = Node { value: 2, next: None };
    let mut head = Some(Box::new(Node { value: 1, next: Some(Box::new(second)) }));
    let found = replace_first(&mut head, 2, 20);
    let missing = replace_first(&mut head, 7, 70);
    println!("{found} {missing}");
}`,
          options: [
            { t: 'Yes: after the `return`, nothing uses `link` again', ok: true, why: "It prints `true false`. An early exit is not the problem by itself. In `cut_at` the function went on to use `link` after leaving the loop, while a borrow made through it still counted as alive. Here the early path ends the function, and the only use of the list on it is through `node`, the newest borrow." },
            { t: 'No: it leaves the loop early, so it fails like the version with `break`', why: "The `break` version failed because of what came after the loop: a use of `link`. This function uses nothing after its early exit. Look for a use of the cursor after the decision, not for the decision itself." },
            { t: 'No: `node.value = new` changes the list while `link` borrows it', why: "`node` was made from `link`, and `link` is not used while `node` is. That is a chain of reborrows with one end in use, which is one writer. It is what lets any `&mut` be passed down through function calls." },
            { t: 'No: `link = &mut node.next` creates a second mutable borrow of the list on every pass', why: "Each new borrow is made through the previous one, and the previous one is then never used again. Two mutable borrows conflict only when both are in use." },
          ],
          verify: 'compiles',
        },
        {
          q: 'A parser builds a syntax tree once, and later passes read it. Each node needs to reach its children and its parent. Which design fits best?',
          options: [
            { t: 'All the nodes in one `Vec`, with `parent: Option<usize>` and `children: Vec<usize>`', ok: true, why: "An arena. The `Vec` is the one owner, the links are plain numbers, and the borrow checker has nothing to object to. Its weak point, removing single nodes, does not matter for a tree that is built once and freed all together." },
            { t: '`children: Vec<Box<Node>>` and `parent: Option<Box<Node>>`', why: "A box is the only owner of what it points at. A parent that owns its children, with children that own their parent, cannot even be built: the parent would have to be moved into each child." },
            { t: '`children: Vec<Box<Node>>` and `parent: Option<&Node>`', why: "This is how the classes of Python or TypeScript look, where a field is a reference that anyone may hold. In Rust a `&Node` to the parent keeps the parent borrowed for as long as the child exists, so no child could be added to it afterward. A tree cannot borrow from itself." },
            { t: '`children: Vec<Rc<RefCell<Node>>>` and `parent: Option<Rc<RefCell<Node>>>`', why: "Parent and child would own each other, which is the leaking cycle of lesson 20. With the parent link as a `Weak` it would work, at the cost of counts and run-time borrow checks that a build-once tree has no use for." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

impl Drop for Node {
    fn drop(&mut self) {
        print!("{} ", self.value);
    }
}

fn main() {
    let third = Node { value: 3, next: None };
    let second = Node { value: 2, next: Some(Box::new(third)) };
    let mut first = Node { value: 1, next: Some(Box::new(second)) };

    let rest = first.next.take();
    print!("A ");
    drop(first);
    print!("B ");
    drop(rest);
    println!("C");
}`,
          answer: 'A 1 B 2 3 C',
          explain: "`take` detaches the chain behind the first node and gives it to `rest`. Dropping `first` then drops one node, because its `next` is `None`. Dropping `rest` drops the node that holds 2, and with it the node it owns: a node's own `drop` runs first, and its fields go afterward.",
          hint: "After the `take`, what does `first.next` hold? Dropping a node drops everything it still owns, and nothing else.",
        },
      ],
      challenges: [
        {
          id: 'stack-push-pop',
          title: 'Push and pop',
          level: 'warm-up',
          prompt: [
            "`List` is the list from the lesson, used as a stack. Write its three methods.",
            { list: [
              "`push` puts a new node in front of the others.",
              "`pop` removes the first node and returns its value, or `None` for an empty list.",
              "`peek` returns the first value without removing anything.",
            ] },
            "The starter's `push` makes the new node the only node, and forgets the rest of the list.",
          ],
          signature: 'impl List {\n    fn push(&mut self, value: i32)\n    fn pop(&mut self) -> Option<i32>\n    fn peek(&self) -> Option<i32>\n}',
          prelude: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}`,
          starter: rs`impl List {
    fn push(&mut self, value: i32) {
        // The new node should own the old first node. This one forgets it.
        self.head = Some(Box::new(Node { value, next: None }));
    }

    fn pop(&mut self) -> Option<i32> {
        None
    }

    fn peek(&self) -> Option<i32> {
        None
    }
}`,
          hints: [
            "The new node's `next` has to be the old first node. `next: self.head` is refused, because it would move the box out from behind `&mut self`.",
            "`let old_head = self.head.take();` leaves `None` in `head` and gives you the box. Then `self.head = Some(Box::new(Node { value, next: old_head }));`.",
            "`pop` is `let node = self.head.take()?;`, then `self.head = node.next;`, then `Some(node.value)`. `peek` is `self.head.as_ref().map(|node| node.value)`.",
          ],
          solution: rs`impl List {
    fn push(&mut self, value: i32) {
        let old_head = self.head.take();
        self.head = Some(Box::new(Node { value, next: old_head }));
    }

    fn pop(&mut self) -> Option<i32> {
        let node = self.head.take()?;
        self.head = node.next;
        Some(node.value)
    }

    fn peek(&self) -> Option<i32> {
        self.head.as_ref().map(|node| node.value)
    }
}`,
          tests: [
            { label: 'pop and peek on an empty list give None', body: rs`let mut list = List { head: None };
assert_eq!(list.pop(), None);
assert_eq!(list.peek(), None);` },
            { label: 'pop returns the value pushed last', body: rs`let mut list = List { head: None };
list.push(1);
list.push(2);
assert_eq!(list.pop(), Some(2));` },
            { label: 'push keeps the nodes that were already there', body: rs`let mut list = List { head: None };
list.push(1);
list.push(2);
list.push(3);
assert_eq!(list.pop(), Some(3));
assert_eq!(list.pop(), Some(2), "the second pop should reach the node under the top one");
assert_eq!(list.pop(), Some(1));
assert_eq!(list.pop(), None, "three pushes allow three pops");` },
            { label: 'peek shows the top without removing it', body: rs`let mut list = List { head: None };
list.push(7);
list.push(8);
assert_eq!(list.peek(), Some(8));
assert_eq!(list.peek(), Some(8), "peek must not remove anything");
assert_eq!(list.pop(), Some(8));
assert_eq!(list.peek(), Some(7));` },
            { label: 'push and pop can be mixed', body: rs`let mut list = List { head: None };
list.push(1);
list.push(2);
assert_eq!(list.pop(), Some(2));
list.push(3);
assert_eq!(list.pop(), Some(3));
assert_eq!(list.pop(), Some(1), "the value pushed first should still be at the bottom");
assert_eq!(list.pop(), None);` },
            { label: 'A thousand values come back in reverse order', body: rs`let mut list = List { head: None };
for value in 0..1000 {
    list.push(value);
}
for value in (0..1000).rev() {
    assert_eq!(list.pop(), Some(value));
}
assert_eq!(list.pop(), None);` },
          ],
        },
        {
          id: 'list-sum',
          title: 'Sum by iterating',
          level: 'core',
          prompt: [
            "Lesson 20 summed a list with recursion. This time give the list an iterator, and let the iterator do the adding.",
            "`Iter` is declared for you: it holds the node to hand out next. Write its `next`, which returns a reference to that node's value and steps forward. Write `iter`, which starts an iterator on the first node. Then write `sum` with it.",
            "`list_of(&[1, 2, 3])` builds a list for the tests, and you may use it too.",
          ],
          signature: "impl<'a> Iterator for Iter<'a> {\n    type Item = &'a i32;\n    fn next(&mut self) -> Option<&'a i32>\n}\nfn iter(list: &List) -> Iter<'_>\nfn sum(list: &List) -> i32",
          prelude: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

/// A list that holds the given values, in the same order.
fn list_of(values: &[i32]) -> List {
    let mut head = None;
    for &value in values.iter().rev() {
        head = Some(Box::new(Node { value, next: head }));
    }
    List { head }
}`,
          starter: rs`struct Iter<'a> {
    next: Option<&'a Node>,
}

impl<'a> Iterator for Iter<'a> {
    type Item = &'a i32;

    fn next(&mut self) -> Option<&'a i32> {
        // Hand out the current node's value, and step to the node after it.
        None
    }
}

fn iter(list: &List) -> Iter<'_> {
    Iter { next: None }
}

fn sum(list: &List) -> i32 {
    0
}`,
          hints: [
            "`iter` starts on the first node. `list.head` is an `Option<Box<Node>>` and the field wants an `Option<&Node>`. That conversion is `as_deref()`.",
            "In `next`, `let node = self.next?;` copies the reference out of the field, and returns `None` at the end of the list. Step forward with `self.next = node.next.as_deref();`.",
            "Finish `next` with `Some(&node.value)`. With the iterator working, `sum` is `iter(list).sum()`.",
          ],
          solution: rs`struct Iter<'a> {
    next: Option<&'a Node>,
}

impl<'a> Iterator for Iter<'a> {
    type Item = &'a i32;

    fn next(&mut self) -> Option<&'a i32> {
        let node = self.next?;
        self.next = node.next.as_deref();
        Some(&node.value)
    }
}

fn iter(list: &List) -> Iter<'_> {
    Iter { next: list.head.as_deref() }
}

fn sum(list: &List) -> i32 {
    iter(list).sum()
}`,
          tests: [
            { label: 'An empty list yields nothing and sums to zero', body: rs`let list = list_of(&[]);
assert_eq!(iter(&list).next(), None);
assert_eq!(sum(&list), 0);` },
            { label: 'sum adds every value', body: rs`assert_eq!(sum(&list_of(&[1, 2, 3, 4])), 10);
assert_eq!(sum(&list_of(&[-5, 5, -7])), -7);` },
            { label: 'The iterator yields the values in list order', body: rs`let list = list_of(&[3, 1, 2]);
let seen: Vec<i32> = iter(&list).copied().collect();
assert_eq!(seen, [3, 1, 2]);` },
            { label: 'It returns None at the end, and goes on returning it', body: rs`let list = list_of(&[9]);
let mut values = iter(&list);
assert_eq!(values.next(), Some(&9));
assert_eq!(values.next(), None);
assert_eq!(values.next(), None);` },
            { label: 'The adapters of lesson 18 work on it', body: rs`let list = list_of(&[4, 7, 10, 13]);
assert_eq!(iter(&list).filter(|value| **value % 2 == 0).count(), 2);
assert_eq!(iter(&list).max(), Some(&13));
assert_eq!(iter(&list).map(|value| value * 2).collect::<Vec<i32>>(), [8, 14, 20, 26]);` },
            { label: 'Two iterators can walk one list at the same time', body: rs`let list = list_of(&[1, 2, 3]);
let pairs: Vec<(i32, i32)> = iter(&list).zip(iter(&list).skip(1)).map(|(a, b)| (*a, *b)).collect();
assert_eq!(pairs, [(1, 2), (2, 3)]);
assert_eq!(sum(&list), 6, "iterating borrows the list and leaves it as it was");` },
            { label: 'An item outlives the iterator it came from', body: rs`let list = list_of(&[42, 43]);
let first = iter(&list).next();
assert_eq!(first, Some(&42));` },
          ],
        },
        {
          id: 'list-reverse',
          title: 'Reverse in place',
          level: 'core',
          track: true,
          prompt: [
            "Reverse a list by relinking the nodes it already has.",
            "The starter gives the right answer the expensive way: it builds a second list with a new allocation for every node, then drops the first. These tests count allocations, and they also check that the very same nodes are in the list afterward. Rewrite `reverse` so that it allocates nothing.",
            "`list_of`, `values_of` and `node_addresses` are for the tests.",
          ],
          signature: 'fn reverse(list: &mut List)',
          prelude: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

/// A list that holds the given values, in the same order.
fn list_of(values: &[i32]) -> List {
    let mut head = None;
    for &value in values.iter().rev() {
        head = Some(Box::new(Node { value, next: head }));
    }
    List { head }
}

/// The values in the list, from the head.
fn values_of(list: &List) -> Vec<i32> {
    let mut values = Vec::new();
    let mut current = list.head.as_deref();
    while let Some(node) = current {
        values.push(node.value);
        current = node.next.as_deref();
    }
    values
}

/// Where each node sits in memory, from the head. An address is shown here as a plain number.
fn node_addresses(list: &List) -> Vec<usize> {
    let mut addresses = Vec::new();
    let mut current = list.head.as_deref();
    while let Some(node) = current {
        addresses.push(node as *const Node as usize);
        current = node.next.as_deref();
    }
    addresses
}`,
          starter: rs`fn reverse(list: &mut List) {
    // Right answer, wrong cost: a new node for every old one.
    let mut reversed = None;
    let mut current = &list.head;
    while let Some(node) = current {
        reversed = Some(Box::new(Node { value: node.value, next: reversed }));
        current = &node.next;
    }
    list.head = reversed;
}`,
          hints: [
            "Do not read the values at all. Move the boxes: take the whole chain out of `list.head`, then peel nodes off its front one at a time.",
            "Keep two owners. `rest` holds the nodes still to do, starting as `list.head.take()`. `reversed` holds the nodes already done, starting as `None`. Loop with `while let Some(mut node) = rest`.",
            "In the loop: `rest = node.next.take();` then `node.next = reversed;` then `reversed = Some(node);`. After it, `list.head = reversed;`.",
          ],
          solution: rs`fn reverse(list: &mut List) {
    let mut reversed = None;
    let mut rest = list.head.take();
    while let Some(mut node) = rest {
        rest = node.next.take();
        node.next = reversed;
        reversed = Some(node);
    }
    list.head = reversed;
}`,
          tests: [
            { label: 'Reverses the order of the values', body: rs`let mut list = list_of(&[1, 2, 3, 4]);
reverse(&mut list);
assert_eq!(values_of(&list), [4, 3, 2, 1]);` },
            { label: 'Leaves an empty list and a single node as they were', body: rs`let mut empty = list_of(&[]);
reverse(&mut empty);
assert!(empty.head.is_none());
let mut one = list_of(&[7]);
reverse(&mut one);
assert_eq!(values_of(&one), [7]);` },
            { label: 'Makes no allocation', body: rs`let mut list = list_of(&[1, 2, 3, 4, 5]);
let before = allocation_count();
reverse(&mut list);
let made = allocation_count() - before;
assert_eq!(made, 0, "reverse should relink the nodes that exist, not allocate new ones");
assert_eq!(values_of(&list), [5, 4, 3, 2, 1]);` },
            { label: 'The same nodes are in the list afterward, in the opposite order', body: rs`let mut list = list_of(&[10, 20, 30]);
let mut expected = node_addresses(&list);
expected.reverse();
reverse(&mut list);
assert_eq!(node_addresses(&list), expected, "each node should stay where it is in memory, with only its next link changed");` },
            { label: 'Reversing twice gives the original list back', body: rs`let mut list = list_of(&[5, 6, 7, 8, 9]);
reverse(&mut list);
reverse(&mut list);
assert_eq!(values_of(&list), [5, 6, 7, 8, 9]);` },
          ],
        },
        {
          id: 'append-at-tail',
          title: 'Work at the tail',
          level: 'core',
          prompt: [
            "Write the two operations at the far end of the list. Both walk a cursor of type `&mut Option<Box<Node>>` from `list.head`.",
            { list: [
              "`push_back` adds a node after the last one. Its cursor runs to the `None` at the end.",
              "`pop_back` removes the last node and returns its value, or `None` for an empty list. Its cursor has to stop one link sooner, on the link that leads to the last node, and then use that link. That is a loop that stops early, so it needs the idiom of section 4.",
            ] },
            "The starter's `push_back` is right only for an empty list.",
          ],
          signature: 'fn push_back(list: &mut List, value: i32)\nfn pop_back(list: &mut List) -> Option<i32>',
          prelude: rs`struct Node {
    value: i32,
    next: Option<Box<Node>>,
}

struct List {
    head: Option<Box<Node>>,
}

/// A list that holds the given values, in the same order.
fn list_of(values: &[i32]) -> List {
    let mut head = None;
    for &value in values.iter().rev() {
        head = Some(Box::new(Node { value, next: head }));
    }
    List { head }
}

/// The values in the list, from the head.
fn values_of(list: &List) -> Vec<i32> {
    let mut values = Vec::new();
    let mut current = list.head.as_deref();
    while let Some(node) = current {
        values.push(node.value);
        current = node.next.as_deref();
    }
    values
}`,
          starter: rs`fn push_back(list: &mut List, value: i32) {
    // Right for an empty list only. Walk a cursor to the last link instead.
    if list.head.is_none() {
        list.head = Some(Box::new(Node { value, next: None }));
    }
}

fn pop_back(list: &mut List) -> Option<i32> {
    None
}`,
          hints: [
            "Start both with `let mut link = &mut list.head;`. For `push_back`, `while let Some(node) = link { link = &mut node.next; }` leaves the cursor on the `None` at the end, and `*link = Some(…)` fills it.",
            "`pop_back` stops on the link whose node has nothing after it. Test with a shared borrow that ends at once: `while link.as_ref().is_some_and(|node| node.next.is_some())`.",
            "The body of that loop is `link = &mut link.as_mut().unwrap().next;`. After it, `link.take().map(|node| node.value)` removes the last node and returns its value, and gives `None` when the list was empty.",
          ],
          solution: rs`fn push_back(list: &mut List, value: i32) {
    let mut link = &mut list.head;
    while let Some(node) = link {
        link = &mut node.next;
    }
    *link = Some(Box::new(Node { value, next: None }));
}

fn pop_back(list: &mut List) -> Option<i32> {
    let mut link = &mut list.head;
    while link.as_ref().is_some_and(|node| node.next.is_some()) {
        link = &mut link.as_mut().unwrap().next;
    }
    link.take().map(|node| node.value)
}`,
          tests: [
            { label: 'push_back into an empty list makes the first node', body: rs`let mut list = list_of(&[]);
push_back(&mut list, 5);
assert_eq!(values_of(&list), [5]);` },
            { label: 'push_back adds after the last node', body: rs`let mut list = list_of(&[1, 2]);
push_back(&mut list, 3);
assert_eq!(values_of(&list), [1, 2, 3]);` },
            { label: 'Several values keep their order', body: rs`let mut list = list_of(&[]);
for value in [4, 8, 15, 16] {
    push_back(&mut list, value);
}
assert_eq!(values_of(&list), [4, 8, 15, 16]);` },
            { label: 'pop_back on an empty list is None', body: rs`let mut list = list_of(&[]);
assert_eq!(pop_back(&mut list), None);
assert!(list.head.is_none());` },
            { label: 'pop_back removes and returns the last value', body: rs`let mut list = list_of(&[1, 2, 3]);
assert_eq!(pop_back(&mut list), Some(3));
assert_eq!(values_of(&list), [1, 2], "the nodes in front of the last one should stay");
assert_eq!(pop_back(&mut list), Some(2));
assert_eq!(values_of(&list), [1]);` },
            { label: 'pop_back empties a list of one node', body: rs`let mut list = list_of(&[9]);
assert_eq!(pop_back(&mut list), Some(9));
assert!(list.head.is_none(), "the head link should hold None again");
assert_eq!(pop_back(&mut list), None);` },
            { label: 'The two work together', body: rs`let mut list = list_of(&[1]);
push_back(&mut list, 2);
push_back(&mut list, 3);
assert_eq!(pop_back(&mut list), Some(3));
push_back(&mut list, 4);
assert_eq!(values_of(&list), [1, 2, 4]);` },
          ],
        },
        {
          id: 'bst-insert',
          title: 'Insert in a tree',
          level: 'core',
          prompt: [
            "`Tree` is a binary search tree of `i32` keys: smaller keys to the left of a node, larger keys to the right, and no key twice.",
            "Write `insert`, which adds a key in the right place and returns `true`, or returns `false` and changes nothing if the key is already there. Write `contains`, which says whether a key is in the tree. A loop with a cursor and a recursive helper are both fine.",
            "The starter's `insert` is right only for an empty tree. `in_order` and `height` are for the tests.",
          ],
          signature: 'fn insert(tree: &mut Tree, key: i32) -> bool\nfn contains(tree: &Tree, key: i32) -> bool',
          prelude: rs`struct TreeNode {
    key: i32,
    left: Option<Box<TreeNode>>,
    right: Option<Box<TreeNode>>,
}

struct Tree {
    root: Option<Box<TreeNode>>,
}

/// The keys as an in-order walk finds them: sorted, if the tree is built correctly.
fn in_order(tree: &Tree) -> Vec<i32> {
    fn visit(link: &Option<Box<TreeNode>>, keys: &mut Vec<i32>) {
        if let Some(node) = link {
            visit(&node.left, keys);
            keys.push(node.key);
            visit(&node.right, keys);
        }
    }
    let mut keys = Vec::new();
    visit(&tree.root, &mut keys);
    keys
}

/// The number of nodes on the longest path down from the root.
fn height(tree: &Tree) -> usize {
    fn below(link: &Option<Box<TreeNode>>) -> usize {
        match link {
            None => 0,
            Some(node) => 1 + below(&node.left).max(below(&node.right)),
        }
    }
    below(&tree.root)
}`,
          starter: rs`fn insert(tree: &mut Tree, key: i32) -> bool {
    // Right for an empty tree only. Walk down to the empty link where key belongs.
    if tree.root.is_none() {
        tree.root = Some(Box::new(TreeNode { key, left: None, right: None }));
        return true;
    }
    false
}

fn contains(tree: &Tree, key: i32) -> bool {
    false
}`,
          hints: [
            "Start a cursor on the root link: `let mut link = &mut tree.root;`. While it leads to a node, compare keys and move the cursor to that node's `left` or `right` link.",
            "`while let Some(node) = link { if key == node.key { return false; } link = if key < node.key { &mut node.left } else { &mut node.right }; }`",
            "After the loop the cursor is on the empty link where the key belongs: `*link = Some(Box::new(TreeNode { key, left: None, right: None }));` and return `true`. `contains` is the same walk with `&` in place of `&mut`, returning `true` when the keys match and `false` after the loop.",
          ],
          solution: rs`fn insert(tree: &mut Tree, key: i32) -> bool {
    let mut link = &mut tree.root;
    while let Some(node) = link {
        if key == node.key {
            return false;
        }
        link = if key < node.key { &mut node.left } else { &mut node.right };
    }
    *link = Some(Box::new(TreeNode { key, left: None, right: None }));
    true
}

fn contains(tree: &Tree, key: i32) -> bool {
    let mut current = &tree.root;
    while let Some(node) = current {
        if key == node.key {
            return true;
        }
        current = if key < node.key { &node.left } else { &node.right };
    }
    false
}`,
          tests: [
            { label: 'The first key becomes the root', body: rs`let mut tree = Tree { root: None };
assert!(insert(&mut tree, 50));
assert_eq!(in_order(&tree), [50]);
assert_eq!(height(&tree), 1);` },
            { label: 'A smaller key goes left and a larger key goes right', body: rs`let mut tree = Tree { root: None };
assert!(insert(&mut tree, 50));
assert!(insert(&mut tree, 30));
assert!(insert(&mut tree, 70));
let root = tree.root.as_ref().expect("the tree should have a root");
assert_eq!(root.key, 50);
assert_eq!(root.left.as_ref().map(|node| node.key), Some(30));
assert_eq!(root.right.as_ref().map(|node| node.key), Some(70));` },
            { label: 'An in-order walk finds the keys sorted', body: rs`let mut tree = Tree { root: None };
for key in [50, 30, 70, 20, 40, 60, 80, 35] {
    assert!(insert(&mut tree, key), "{key} is new, so insert should return true");
}
assert_eq!(in_order(&tree), [20, 30, 35, 40, 50, 60, 70, 80]);
assert_eq!(height(&tree), 4, "35 belongs under 40, which is under 30, which is under 50");` },
            { label: 'A key that is already there is refused', body: rs`let mut tree = Tree { root: None };
for key in [5, 3, 8] {
    insert(&mut tree, key);
}
assert!(!insert(&mut tree, 3), "3 is already in the tree");
assert!(!insert(&mut tree, 5));
assert_eq!(in_order(&tree), [3, 5, 8], "a refused key must not add a node");` },
            { label: 'contains finds what was inserted and nothing else', body: rs`let mut tree = Tree { root: None };
assert!(!contains(&tree, 1), "an empty tree contains nothing");
for key in [50, 30, 70, 20, 40] {
    insert(&mut tree, key);
}
for key in [50, 30, 70, 20, 40] {
    assert!(contains(&tree, key), "{key} was inserted");
}
for key in [10, 35, 60, 99] {
    assert!(!contains(&tree, key), "{key} was never inserted");
}` },
            { label: 'Keys inserted in increasing order form a chain', body: rs`let mut tree = Tree { root: None };
for key in 1..=6 {
    insert(&mut tree, key);
}
assert_eq!(in_order(&tree), [1, 2, 3, 4, 5, 6]);
assert_eq!(height(&tree), 6, "each key is larger than every key before it, so each node has only a right child");` },
          ],
        },
        {
          id: 'arena-tree',
          title: 'A tree in a Vec',
          level: 'stretch',
          prompt: [
            "The stretch challenge of lesson 20 built a tree with parent links out of `Rc`, `Weak` and `RefCell`. Build one here on indices. Every node lives in the tree's `Vec`, a node is named by its position there, and the links are plain `usize` values. Add the link fields to `Node`, then write the methods. The tests call only the methods.",
            { list: [
              "`add(value, parent)` adds a node under `parent`, or as a root when `parent` is `None`, and returns the new node's index.",
              "`parent(id)` is the index of the node's parent, if it has one.",
              "`depth(id)` counts the ancestors: 0 for a root, 1 for its children.",
              "`subtree_sum(id)` adds the node's value and the values of everything below it.",
              "`move_under(id, new_parent)` moves a node, with everything below it, to a new parent. The tests never move a node under itself or under one of its own descendants.",
              "`common_ancestor(a, b)` is the deepest node that has both `a` and `b` in its subtree, counting a node as part of its own subtree. It is `None` when the two are in separate trees.",
            ] },
          ],
          signature: 'impl Tree {\n    fn new() -> Tree\n    fn add(&mut self, value: i32, parent: Option<usize>) -> usize\n    fn parent(&self, id: usize) -> Option<usize>\n    fn depth(&self, id: usize) -> usize\n    fn subtree_sum(&self, id: usize) -> i32\n    fn move_under(&mut self, id: usize, new_parent: usize)\n    fn common_ancestor(&self, a: usize, b: usize) -> Option<usize>\n}',
          starter: rs`struct Node {
    value: i32,
    // Add the links: a parent index and child indices.
}

struct Tree {
    nodes: Vec<Node>,
}

impl Tree {
    fn new() -> Tree {
        Tree { nodes: Vec::new() }
    }

    fn add(&mut self, value: i32, parent: Option<usize>) -> usize {
        self.nodes.push(Node { value });
        self.nodes.len() - 1
    }

    fn parent(&self, id: usize) -> Option<usize> {
        None
    }

    fn depth(&self, id: usize) -> usize {
        0
    }

    fn subtree_sum(&self, id: usize) -> i32 {
        self.nodes[id].value
    }

    fn move_under(&mut self, id: usize, new_parent: usize) {
    }

    fn common_ancestor(&self, a: usize, b: usize) -> Option<usize> {
        None
    }
}`,
          hints: [
            "Give `Node` two more fields: `parent: Option<usize>` and `children: Vec<usize>`. In `add`, a parent also has to learn about its new child: `self.nodes[parent].children.push(id)`.",
            "`depth` walks upward: `let mut current = self.nodes[id].parent; while let Some(parent) = current { depth += 1; current = self.nodes[parent].parent; }`. `subtree_sum` adds `self.subtree_sum(child)` for each child. An index is `Copy`, so iterate with `.iter().map(|&child| …)`.",
            "`move_under`: if `self.nodes[id].parent` is `Some(old)`, remove the node from the old list with `self.nodes[old].children.retain(|&child| child != id);`. Then push `id` onto the new parent's children and set `self.nodes[id].parent = Some(new_parent)`. For `common_ancestor`, collect `a` and all its ancestors into a `Vec`, then walk up from `b` and return the first index that the `Vec` contains.",
          ],
          solution: rs`struct Node {
    value: i32,
    parent: Option<usize>,
    children: Vec<usize>,
}

struct Tree {
    nodes: Vec<Node>,
}

impl Tree {
    fn new() -> Tree {
        Tree { nodes: Vec::new() }
    }

    fn add(&mut self, value: i32, parent: Option<usize>) -> usize {
        let id = self.nodes.len();
        self.nodes.push(Node { value, parent, children: Vec::new() });
        if let Some(parent) = parent {
            self.nodes[parent].children.push(id);
        }
        id
    }

    fn parent(&self, id: usize) -> Option<usize> {
        self.nodes[id].parent
    }

    fn depth(&self, id: usize) -> usize {
        let mut depth = 0;
        let mut current = self.nodes[id].parent;
        while let Some(parent) = current {
            depth += 1;
            current = self.nodes[parent].parent;
        }
        depth
    }

    fn subtree_sum(&self, id: usize) -> i32 {
        let node = &self.nodes[id];
        let below: i32 = node.children.iter().map(|&child| self.subtree_sum(child)).sum();
        node.value + below
    }

    fn move_under(&mut self, id: usize, new_parent: usize) {
        if let Some(old_parent) = self.nodes[id].parent {
            self.nodes[old_parent].children.retain(|&child| child != id);
        }
        self.nodes[new_parent].children.push(id);
        self.nodes[id].parent = Some(new_parent);
    }

    fn common_ancestor(&self, a: usize, b: usize) -> Option<usize> {
        // a and every node above it, then the first of those met on the way up from b.
        let mut above_a = Vec::new();
        let mut current = Some(a);
        while let Some(id) = current {
            above_a.push(id);
            current = self.nodes[id].parent;
        }
        let mut current = Some(b);
        while let Some(id) = current {
            if above_a.contains(&id) {
                return Some(id);
            }
            current = self.nodes[id].parent;
        }
        None
    }
}`,
          solutionNote: "Compare `move_under` with `detach` in lesson 20. There is no guard to keep short and no `upgrade`: three statements change three nodes through one `&mut self`.",
          tests: [
            { label: 'A root has no parent and depth 0', body: rs`let mut tree = Tree::new();
let root = tree.add(5, None);
assert_eq!(tree.parent(root), None);
assert_eq!(tree.depth(root), 0);
assert_eq!(tree.subtree_sum(root), 5);` },
            { label: 'add links a child to its parent, in both directions', body: rs`let mut tree = Tree::new();
let root = tree.add(1, None);
let child = tree.add(2, Some(root));
assert_ne!(root, child, "every node needs an index of its own");
assert_eq!(tree.parent(child), Some(root));
assert_eq!(tree.depth(child), 1);
assert_eq!(tree.subtree_sum(root), 3, "the root should know about its child");
assert_eq!(tree.subtree_sum(child), 2);` },
            { label: 'depth and subtree_sum reach three levels', body: rs`let mut tree = Tree::new();
let root = tree.add(10, None);
let left = tree.add(20, Some(root));
let right = tree.add(30, Some(root));
let leaf = tree.add(40, Some(left));
assert_eq!(tree.depth(leaf), 2);
assert_eq!(tree.parent(leaf), Some(left));
assert_eq!(tree.subtree_sum(root), 100);
assert_eq!(tree.subtree_sum(left), 60);
assert_eq!(tree.subtree_sum(right), 30);` },
            { label: 'move_under takes a node and everything below it', body: rs`let mut tree = Tree::new();
let root = tree.add(1, None);
let left = tree.add(10, Some(root));
let right = tree.add(100, Some(root));
let leaf = tree.add(1000, Some(left));
tree.move_under(left, right);
assert_eq!(tree.parent(left), Some(right));
assert_eq!(tree.depth(left), 2);
assert_eq!(tree.depth(leaf), 3, "the leaf moves with its parent");
assert_eq!(tree.subtree_sum(right), 1110);
assert_eq!(tree.subtree_sum(root), 1111, "the node should be a child of its new parent only");` },
            { label: 'move_under gives a root a parent', body: rs`let mut tree = Tree::new();
let first = tree.add(1, None);
let second = tree.add(2, None);
tree.move_under(second, first);
assert_eq!(tree.parent(second), Some(first));
assert_eq!(tree.depth(second), 1);
assert_eq!(tree.subtree_sum(first), 3);` },
            { label: 'common_ancestor finds where two paths to the root meet', body: rs`let mut tree = Tree::new();
let root = tree.add(0, None);
let a = tree.add(0, Some(root));
let b = tree.add(0, Some(root));
let a1 = tree.add(0, Some(a));
let a2 = tree.add(0, Some(a));
let a11 = tree.add(0, Some(a1));
assert_eq!(tree.common_ancestor(a11, a2), Some(a));
assert_eq!(tree.common_ancestor(a11, b), Some(root));
assert_eq!(tree.common_ancestor(a1, a11), Some(a1), "a node counts as part of its own subtree");
assert_eq!(tree.common_ancestor(b, b), Some(b));
let other = tree.add(0, None);
assert_eq!(tree.common_ancestor(a, other), None, "two separate trees share no ancestor");` },
          ],
        },
      ],
    },
  );
})();
