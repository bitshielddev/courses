// Part 5 (Abstraction), lessons 15 to 17: traits and generics, trait objects, and closures.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 5 · Abstraction';

  (window.C_LESSONS ||= []).push(
    {
      id: 'traits-and-generics',
      title: 'Traits & generics',
      category: part,
      minutes: 40,
      summary: 'How Rust shares behavior between types without inheritance: traits that a type implements explicitly, and generic code that is checked once and compiled separately for each type that uses it.',
      topics: ['Traits', 'Default methods', 'Trait bounds', 'Generic types', 'Monomorphization', 'Standard traits', 'The orphan rule'],
      sections: [
        {
          title: 'A trait names a capability',
          body: [
            "You have used traits since lesson 1. `{}` works on a type that implements `Display`, `==` works on one that implements `PartialEq`, and the `#[derive(Debug)]` of lesson 11 wrote an implementation of `Debug` for you. A **trait** is a named set of methods that a type can promise to have. It is Rust's counterpart of an interface.",
            { run: rs`struct Book {
    title: String,
    cents: u32,
}

struct Coffee {
    shots: u32,
}

// The trait: what it means to have a price. No body, so each type writes its own.
trait Priced {
    fn price(&self) -> u32;         // in cents
}

// The promise is made in a block of its own, one per type.
impl Priced for Book {
    fn price(&self) -> u32 {
        self.cents
    }
}

impl Priced for Coffee {
    fn price(&self) -> u32 {
        250 + 60 * self.shots
    }
}

fn main() {
    let book = Book { title: String::from("Dune"), cents: 1299 };
    let coffee = Coffee { shots: 2 };
    println!("{} costs {}", book.title, book.price());
    println!("coffee costs {}", coffee.price());
}`, name: 'priced.rs', expect: 'Dune costs 1299\ncoffee costs 370\n' },
            { list: [
              "`trait Priced { … }` lists method signatures. A type implements the trait by providing every one of them.",
              "`impl Priced for Book { … }` is where `Book` makes the promise. It stands apart from the struct, and apart from any `impl Book` block that holds the type's own methods.",
              "Once the block exists, `price` is called like any other method.",
            ] },
            "Two things about that `impl` block set Rust apart from the interfaces you know. The first is that it is **required**. A type that happens to have a method called `price` with the right signature does not implement `Priced`. Only an `impl Priced for …` block does, and section 3 shows the compiler turning away a type that has the method and not the block.",
            "The second is that the block is separate from the type. So you can write one for a type that already exists, including a type you did not define:",
            { run: rs`trait Priced {
    fn price(&self) -> u32;
}

// A bare number of cents has a price: itself.
impl Priced for u32 {
    fn price(&self) -> u32 {
        *self
    }
}

// So does a pair of (price for one, how many).
impl Priced for (u32, u32) {
    fn price(&self) -> u32 {
        self.0 * self.1
    }
}

fn main() {
    let tip: u32 = 150;
    let pens: (u32, u32) = (120, 3);
    println!("{} {}", tip.price(), pens.price());
}`, name: 'builtin.rs', expect: '150 360\n' },
            { compare: "A TypeScript interface is **structural**: any object with a `price(): number` method fits it, whether or not its author ever heard of the interface. Python's duck typing is the same idea checked while the program runs, and a `Protocol` is the same idea for the type checker. Rust is **nominal**: a type has a capability only where an `impl` block says so. PHP's `implements` is nominal too, but it has to be written on the class itself, so you cannot add an interface to a class from someone else's library. In Rust you can, as long as the trait is yours." },
            "The explicit block makes a trait a promise about meaning, not only about spelling. Two types can both have a method called `draw`, where one paints a picture and the other takes a card from a deck. Under structural typing they are interchangeable. Under nominal typing somebody has to say that they are.",
          ],
        },
        {
          title: 'Default methods and Self',
          body: [
            "A trait method can come with a body. A type that implements the trait then gets that method without writing it, and may replace it with a version of its own.",
            { run: rs`trait Priced {
    fn price(&self) -> u32;                             // required

    fn label(&self) -> String {                         // provided: built on price()
        format!("{}.{:02}", self.price() / 100, self.price() % 100)
    }

    fn costs_more_than(&self, other: &Self) -> bool {   // Self: the type implementing the trait
        self.price() > other.price()
    }
}

struct Book {
    cents: u32,
}

struct Sample;

impl Priced for Book {
    fn price(&self) -> u32 {
        self.cents
    }
}

impl Priced for Sample {
    fn price(&self) -> u32 {
        0
    }

    fn label(&self) -> String {                         // replaces the default
        String::from("free")
    }
}

fn main() {
    let cheap = Book { cents: 950 };
    let dear = Book { cents: 1299 };
    println!("{} {} {}", cheap.label(), dear.label(), Sample.label());
    println!("{}", dear.costs_more_than(&cheap));
}`, name: 'defaults.rs', expect: '9.50 12.99 free\ntrue\n' },
            "A default method can call the other methods of the trait, including the ones that have no body yet. That is the usual design: a few required methods, and a larger set of provided ones built on them. `Iterator`, the subject of lesson 18, requires one method and provides more than seventy.",
            "`Self` with a capital S is the type the trait is being implemented for. Inside `impl Priced for Book`, the parameter `other: &Self` means `other: &Book`. A book can therefore be compared with a book, and comparing a book with a `Sample` is a type error. The lower-case `self` is the value the method was called on, as in lesson 11.",
            "Leave out a required method and the `impl` block is rejected:",
            { run: rs`trait Priced {
    fn price(&self) -> u32;

    fn label(&self) -> String {
        format!("{}.{:02}", self.price() / 100, self.price() % 100)
    }
}

struct Coffee {
    shots: u32,
}

impl Priced for Coffee {
    fn label(&self) -> String {
        format!("coffee with {} shots", self.shots)
    }
}

fn main() {
    let coffee = Coffee { shots: 2 };
    println!("{}", coffee.label());
}`, name: 'missing.rs', fails: 'E0046' },
            { compare: "A default method does the job of a method on an abstract base class in Python or PHP, or of a method in a PHP `trait`. The difference is that nothing is inherited. There is no parent object, no `super`, and no field that comes along: a Rust trait has no fields at all. Data lives in structs, and a trait can only reach it through the methods it requires." },
          ],
        },
        {
          title: 'Generic functions and trait bounds',
          body: [
            "A function that should work for several types takes a **type parameter**, written in angle brackets after its name. Here is a first attempt at the larger of two values of any type:",
            { run: rs`fn max_of<T>(a: T, b: T) -> T {
    if a > b { a } else { b }
}

fn main() {
    println!("{}", max_of(3, 8));
}`, name: 'max_of.rs', fails: 'E0369' },
            "This message shows how Rust generics differ from duck typing and from C++ templates. `main` only ever passes integers, and integers can be compared. The compiler does not look at that. It checks the body of `max_of` **once, for every `T` there could ever be**, and an arbitrary `T` has no `>`. A generic function may do to a `T` only what its signature says a `T` can do.",
            "The signature says it with a **trait bound**. `T: PartialOrd` reads: any type `T`, provided it implements `PartialOrd`, the trait behind `<` and `>`.",
            { run: rs`fn max_of<T: PartialOrd>(a: T, b: T) -> T {
    if a > b { a } else { b }
}

fn main() {
    println!("{}", max_of(3, 8));
    println!("{}", max_of(2.5, 0.1));
    println!("{}", max_of("pear", "apple"));
    println!("{}", max_of(String::from("kiwi"), String::from("fig")));
}`, name: 'bounded.rs', expect: '8\n2.5\npear\nkiwi\n' },
            "The compiler works out `T` from the arguments of each call. When it cannot, name the type with the turbofish from lesson 2: `max_of::<u8>(3, 8)`.",
            "A bound cuts both ways. Inside the function it is what permits `>`. At every call it is a requirement that the argument type must meet. Your own traits work as bounds in exactly the same way:",
            { run: rs`trait Priced {
    fn price(&self) -> u32;
}

struct Book {
    cents: u32,
}

impl Priced for Book {
    fn price(&self) -> u32 {
        self.cents
    }
}

struct Ticket {
    cents: u32,
}

impl Ticket {
    fn price(&self) -> u32 {        // the right name and the right types, but no impl Priced
        self.cents
    }
}

fn total<T: Priced>(items: &[T]) -> u32 {
    let mut sum = 0;
    for item in items {
        sum += item.price();
    }
    sum
}

fn main() {
    println!("{}", total(&[Book { cents: 1299 }, Book { cents: 950 }]));
    println!("{}", Ticket { cents: 500 }.price());
    println!("{}", total(&[Ticket { cents: 500 }]));
}`, name: 'unmet.rs', fails: 'E0277' },
            "`Ticket` has a `price` method that would do the job. It still is not `Priced`, because no `impl Priced for Ticket` says so. This is the nominal rule of section 1 at work. The fix is a three-line `impl Priced for Ticket` block whose `price` returns `self.cents`.",
            "Bounds can be combined and written in several places:",
            { table: {
              head: ['Write', 'Meaning'],
              rows: [
                ['`fn show<T: Display>(item: T)`', 'One bound on one parameter.'],
                ['`fn show<T: Display + PartialOrd>(a: T, b: T)`', 'Several bounds, joined with `+`. The type must meet all of them.'],
                ['`fn pair_up<K, V>(key: K, value: V) -> String where K: Display, V: Debug`', 'The same thing in a `where` clause after the signature, which reads better when the list is long.'],
                ['`fn shout(item: impl Display)`', 'A type parameter you do not need to name. It means the same as `fn shout<T: Display>(item: T)`.'],
              ],
            } },
            { run: rs`use std::fmt::{Debug, Display};

// Two bounds on one parameter.
fn announce<T: PartialOrd + Display>(a: T, b: T) -> String {
    if a > b { format!("{a} beats {b}") } else { format!("{b} beats {a}") }
}

// Two parameters, with the bounds moved to a where clause.
fn pair_up<K, V>(key: K, value: V) -> String
where
    K: Display,
    V: Debug,
{
    format!("{key} = {value:?}")
}

// impl Trait in a parameter: a type parameter without a name.
fn shout(item: impl Display) -> String {
    format!("{item}!")
}

fn main() {
    println!("{}", announce(3, 8));
    println!("{}", pair_up("sizes", [1, 2, 3]));
    println!("{}", shout(2.5));
}`, name: 'bounds.rs', expect: '8 beats 3\nsizes = [1, 2, 3]\n2.5!\n' },
            { compare: "TypeScript's `<T extends HasPrice>` is the closest relative: there too the body is checked against the constraint. Two things differ. A TypeScript constraint is structural, and the types are erased before the program runs. Python checks nothing until the line executes, so a function that calls `.price()` works on whatever has one and raises `AttributeError` on whatever does not. PHP has no generics in the language, and tools such as PHPStan read them from comments." },
            { tip: "Start with no bounds and add what the compiler asks for. Every bound is a restriction on every caller, so a bound the body does not use only makes the function harder to call. The message for a missing bound nearly always names the trait to add." },
          ],
        },
        {
          title: 'Generic types',
          body: [
            "Types take parameters too. You have used several: `Vec<T>`, `Option<T>`, `Result<T, E>` and `HashMap<K, V>` are ordinary generic types from the standard library. `Option` is defined like this:",
            { code: rs`enum Option<T> {
    Some(T),
    None,
}` },
            "Your own types can do the same. The parameter is declared after the type's name, and again after `impl`:",
            { run: rs`#[derive(Debug)]
struct Pair<T> {
    first: T,
    second: T,
}

impl<T> Pair<T> {                         // methods of every Pair<T>
    fn new(first: T, second: T) -> Self {
        Pair { first, second }
    }

    fn swap(self) -> Self {
        Pair { first: self.second, second: self.first }
    }
}

impl<T: PartialOrd> Pair<T> {             // methods only of a Pair whose items can be compared
    fn larger(&self) -> &T {
        if self.first > self.second { &self.first } else { &self.second }
    }
}

fn main() {
    let numbers = Pair::new(3, 9);
    let words = Pair::new(String::from("pear"), String::from("apple"));
    println!("{} {}", numbers.larger(), words.larger());
    println!("{:?}", numbers.swap());
}`, name: 'pair.rs', expect: '9 pear\nPair { first: 9, second: 3 }\n' },
            "`impl<T> Pair<T>` reads: for every type `T`, here are methods of `Pair<T>`. The first `<T>` declares the parameter and the second uses it. The second block adds a bound, so `larger` exists only on pairs whose items can be compared. A `Pair` of something that cannot be compared is still a good `Pair`: it has `new` and `swap`, and no `larger`. Put a bound on the `impl` block or the function that needs it, not on the struct.",
            "`Pair<i32>` and `Pair<String>` are two different types. A function that takes a `Pair<i32>` does not accept a `Pair<String>`, in the same way that a `Vec<i32>` is not a `Vec<String>`.",
            "A trait can be implemented for a generic type, under a condition. This is how the standard library says that a `Vec<T>` can be printed with `{:?}` whenever a `T` can. Here, a list of priced things gets a price of its own:",
            { run: rs`trait Priced {
    fn price(&self) -> u32;
}

struct Book {
    cents: u32,
}

impl Priced for Book {
    fn price(&self) -> u32 {
        self.cents
    }
}

// For every T that is Priced, a Vec<T> is Priced as well.
impl<T: Priced> Priced for Vec<T> {
    fn price(&self) -> u32 {
        let mut sum = 0;
        for item in self {
            sum += item.price();
        }
        sum
    }
}

fn main() {
    let basket = vec![Book { cents: 1299 }, Book { cents: 950 }];
    let order = vec![basket, vec![Book { cents: 400 }]];    // a Vec<Vec<Book>>
    println!("{}", order.price());
}`, name: 'conditional.rs', expect: '2649\n' },
            "`order` is a `Vec<Vec<Book>>`. It is `Priced` because a `Vec<Book>` is, which in turn is because a `Book` is. The compiler follows that chain for you, to any depth.",
          ],
        },
        {
          title: 'Monomorphization: generics cost nothing at run time',
          body: [
            "What does the compiler produce for a generic function? Not one function that inspects its argument while the program runs. For each concrete type the program uses it with, the compiler generates a separate copy with the type filled in. The process is called **monomorphization**.",
            { run: rs`use std::mem::size_of_val;

struct Pair<T> {
    first: T,
    second: T,
}

fn larger<T: PartialOrd>(pair: &Pair<T>) -> &T {
    if pair.first > pair.second { &pair.first } else { &pair.second }
}

fn main() {
    let bytes = Pair { first: 200_u8, second: 7_u8 };
    let floats = Pair { first: 0.5_f64, second: 2.5_f64 };
    println!("{} from a Pair of {} bytes", larger(&bytes), size_of_val(&bytes));
    println!("{} from a Pair of {} bytes", larger(&floats), size_of_val(&floats));
}`, name: 'mono.rs', expect: '200 from a Pair of 2 bytes\n2.5 from a Pair of 16 bytes\n' },
            { memory: {
              title: 'One definition, two types with different layouts',
              vars: [
                { id: 'bytes', type: 'Pair<u8>', fields: [['first', 'u8'], ['second', 'u8']] },
                { id: 'floats', type: 'Pair<f64>', fields: [['first', 'f64'], ['second', 'f64']] },
              ],
              set: { bytes: { first: 200, second: 7 }, floats: { first: 0.5, second: 2.5 } },
              caption: "A `Pair<u8>` is two bytes side by side, and a `Pair<f64>` is two 8-byte numbers. Neither stores anything that says which type it is. Code that handles one cannot handle the other, so the compiler produces a version of `larger` for each.",
            } },
            "The compiled program holds two structs and two functions, as if you had written this by hand:",
            { code: rs`struct PairU8 { first: u8, second: u8 }
struct PairF64 { first: f64, second: f64 }

fn larger_u8(pair: &PairU8) -> &u8 { … }       // compares two bytes
fn larger_f64(pair: &PairF64) -> &f64 { … }    // compares two floating-point numbers` },
            { list: [
              "**At run time it costs nothing.** Each copy knows its types exactly, so `>` is a direct call that the optimizer can inline. No type is looked up and no value is wrapped in an object.",
              "**At compile time it costs something.** Every type you use a generic function with is one more function to compile and one more in the executable. A program that uses `Vec` with thirty element types contains thirty versions of `push`.",
              "**There is no type to inspect.** Generic code does not ask what `T` is and branch on the answer, the way `typeof` or `isinstance` would. Everything it does with a `T` goes through the traits in its bounds.",
            ] },
            { compare: "TypeScript erases generics: an `Array<number>` and an `Array<string>` are the same JavaScript array at run time, holding values that carry their own type tags. Python's `list[int]` is a hint that nothing enforces. In both, one function body handles every type by checking tags as it runs. Rust goes the other way: many bodies, each for one type, with nothing left to check." },
            { fromC: "This replaces the `void *` plus element size pattern of `qsort`, where one compiled function handles every type through untyped pointers and a comparison callback. A monomorphized sort is the machine code you would get from writing the sort out by hand for each element type, and the element type is checked." },
          ],
        },
        {
          title: 'The traits you meet every day',
          body: [
            "A small set of standard traits appears in almost every program. Most of them can be written for you by `#[derive]`, which lesson 11 introduced. Deriving a trait works when every field of the type already implements it.",
            { table: {
              head: ['Trait', 'What the type gains', 'Derive?'],
              rows: [
                ['`Debug`', '`{:?}` formatting, for programmers', 'Yes'],
                ['`Display`', '`{}` formatting, for readers, and `to_string()`', 'No. Only you know how the value should read'],
                ['`Clone`', '`.clone()`, an explicit copy', 'Yes'],
                ['`Copy`', 'Assignment copies instead of moving (lesson 5)', 'Yes, when every field is `Copy`'],
                ['`PartialEq`, `Eq`', '`==` and `!=`. `Eq` adds the promise that every value equals itself, which a float cannot make because of `NaN`', 'Yes'],
                ['`PartialOrd`, `Ord`', '`<`, `>` and the rest. `Ord` promises a total order, which `sort` and `max` need', 'Yes. Fields are compared in the order they are declared'],
                ['`Hash`', 'Use as a key in a `HashMap`, together with `Eq`', 'Yes'],
                ['`Default`', '`Type::default()`, with every field at its own default', 'Yes'],
                ['`From<T>`', '`Type::from(value)`, and `value.into()`', 'No'],
              ],
            } },
            { run: rs`use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Default)]
struct Version {
    major: u32,
    minor: u32,
}

fn main() {
    let old = Version { major: 1, minor: 9 };
    let new = Version { major: 1, minor: 10 };
    let copy = old;                                     // Copy: old is still usable

    println!("{old:?}");                                // Debug
    println!("{} {}", old == copy, old < new);          // PartialEq, PartialOrd
    println!("{:?}", Version::default());               // Default

    let mut all = vec![new, old, Version::default()];
    all.sort();                                         // Ord
    println!("{:?}", all[2]);

    let mut names = HashMap::new();                     // Hash and Eq: a Version can be a key
    names.insert(old, "stable");
    println!("{:?}", names.get(&Version { major: 1, minor: 9 }));
}`, name: 'derived.rs', expect: 'Version { major: 1, minor: 9 }\ntrue true\nVersion { major: 0, minor: 0 }\nVersion { major: 1, minor: 10 }\nSome("stable")\n' },
            "The derived comparison goes field by field in the order the fields are declared, so `major` is compared first. That makes 1.10 newer than 1.9, which comparing the texts `\"1.10\"` and `\"1.9\"` would get wrong.",
            "`Display` and `From` are written by hand. Both have a fixed shape that is worth knowing by heart.",
            { run: rs`use std::fmt;

struct Version {
    major: u32,
    minor: u32,
}

impl fmt::Display for Version {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "v{}.{}", self.major, self.minor)     // write! is println! aimed at f
    }
}

impl From<(u32, u32)> for Version {
    fn from(pair: (u32, u32)) -> Self {
        Version { major: pair.0, minor: pair.1 }
    }
}

fn main() {
    let a = Version::from((1, 10));
    let b: Version = (2, 0).into();             // From gives into() for free
    println!("{a} then {b}");
    let text = a.to_string();                   // Display gives to_string() for free
    println!("{} characters", text.len());
}`, name: 'display_from.rs', expect: 'v1.10 then v2.0\n5 characters\n' },
            "Two methods in that program were never written: `into` and `to_string`. The standard library holds one implementation of `Into<U> for T` that covers every pair of types where `U: From<T>`, and one implementation of `ToString` that covers every type with `Display`. They are generic `impl` blocks like the one for `Vec<T>` in section 4. They are why you implement `From` and `Display`, and never `Into` or `ToString`.",
            { native: [
              "In an editor with rust-analyzer, write an empty block such as `impl fmt::Display for Version {}` and take the quick fix **Implement missing members**. It fills in the signature of every required method.",
              { shell: 'cargo doc --open', name: 'Terminal · build and open the documentation of your project' },
              "Each type's page in that documentation lists the traits it implements, including the ones it got from generic `impl` blocks.",
            ] },
          ],
        },
        {
          title: 'Coherence: who may implement what',
          body: [
            "You can implement your trait for anyone's type, and anyone's trait for your type. What you cannot do is implement someone else's trait for someone else's type:",
            { run: rs`use std::fmt;

impl fmt::Display for Vec<i32> {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{} numbers", self.len())
    }
}

fn main() {
    println!("{}", vec![1, 2, 3]);
}`, name: 'orphan.rs', fails: 'E0117' },
            "This is the **orphan rule**: an `impl` block is allowed only if the trait or the type is defined in the current crate. A crate is one library or one program, and lesson 22 covers them. Without the rule, two libraries could each implement `Display` for `Vec<i32>`, and a program that used both would have two answers to what `{}` prints. With it, a trait has at most one implementation for a type in the whole program. That property is called **coherence**.",
            "The way around it is the newtype pattern from lesson 11. Wrap the foreign type in a struct of your own, and implement the trait for the wrapper:",
            { run: rs`use std::fmt;

struct Scores(Vec<i32>);                // our own type, so any trait may be implemented for it

impl fmt::Display for Scores {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{} scores: {:?}", self.0.len(), self.0)
    }
}

fn main() {
    println!("{}", Scores(vec![72, 95, 88]));
}`, name: 'newtype.rs', expect: '3 scores: [72, 95, 88]\n' },
            "The other half of the rule is about calling. A trait's methods can be used only where the trait is in scope. In the next program the trait and its implementation for `u32` sit inside a module, which is a namespace that lesson 22 explains, and `main` has not imported the trait:",
            { run: rs`mod shop {
    pub trait Priced {
        fn price(&self) -> u32;
    }

    impl Priced for u32 {
        fn price(&self) -> u32 {
            *self
        }
    }
}

fn main() {
    let cents: u32 = 499;
    println!("{}", cents.price());
}`, name: 'not_in_scope.rs', fails: 'E0599' },
            "The method exists, and the compiler says where. Adding `use shop::Priced;` as the first line makes it callable. The same applies to standard traits that are not imported automatically: reading a file needs `use std::io::Read;`, and `write!` into a `String` needs `use std::fmt::Write;`. In each case the `help:` line names the `use` to add.",
            { compare: "JavaScript lets any file add a method to `String.prototype`, and Python lets any module patch a class. The new method is then visible everywhere, and two libraries that pick the same name overwrite each other. A Rust trait method on a foreign type is visible only in code that imports the trait, and two traits with a method of the same name can exist side by side." },
          ],
        },
        {
          title: 'Associated types, briefly',
          body: [
            "Operators are trait methods. `a + b` calls `Add::add(a, b)`, `a == b` calls `PartialEq::eq(&a, &b)`, and `a[i]` goes through `Index`. To give a type of yours a `+`, implement `std::ops::Add`:",
            { run: rs`use std::ops::Add;

#[derive(Debug, Clone, Copy, PartialEq)]
struct Money {
    cents: i64,
}

impl Add for Money {
    type Output = Money;                    // an associated type: what + produces

    fn add(self, other: Money) -> Money {
        Money { cents: self.cents + other.cents }
    }
}

fn main() {
    let total = Money { cents: 1299 } + Money { cents: 370 };
    println!("{total:?}");
}`, name: 'add.rs', expect: 'Money { cents: 1669 }\n' },
            "`type Output = Money;` is an **associated type**. The trait leaves a type open, and each implementation fills it in. It differs from a type parameter in who chooses. The caller picks the `T` of a `Vec<T>`. For `Money + Money` there is one `Output`, fixed by the `impl`, which is why the result needs no annotation.",
            "You will write associated types rarely and read them often. `Iterator` has one called `Item`, the type of the values it produces, and lesson 18 is built on it. In a bound, an associated type is named inside the angle brackets:",
            { run: rs`use std::ops::Add;

// Any T that can be copied, and added to another T to give a T.
fn sum_all<T: Copy + Add<Output = T>>(start: T, items: &[T]) -> T {
    let mut total = start;
    for &item in items {
        total = total + item;
    }
    total
}

fn main() {
    println!("{}", sum_all(0, &[1, 2, 3]));
    println!("{}", sum_all(0.5, &[1.5, 2.0]));
}`, name: 'sum_all.rs', expect: '6\n4\n' },
            { pitfall: "Give a type an operator only where its meaning is obvious: adding amounts, vectors or durations. `+` on two `Money` values is clear to every reader. `+` on two users is a puzzle, and a method with a name would serve them better." },
          ],
        },
      ],
      takeaways: [
        "A trait is a named set of methods. A type implements it only through an explicit `impl Trait for Type` block: having methods with the right names is not enough.",
        "A generic function is checked once against its bounds and may use only what they grant. Every caller must meet the same bounds.",
        "Generics are compiled separately for each concrete type. They cost compile time and code size, and nothing while the program runs.",
        "Derive `Debug`, `Clone`, `PartialEq`, `Eq`, `PartialOrd`, `Ord`, `Hash` and `Default`. Write `Display` and `From` by hand, and get `to_string` and `into` for free.",
        "You may implement a trait for a type only if one of the two is yours, and a trait's methods can be called only where the trait is in scope.",
      ],
      quiz: [
        {
          q: 'A TypeScript function typed `(item: { price(): number }) => number` accepts any object that has a `price` method. In Rust, `Ticket` has a method `fn price(&self) -> u32` in its own `impl Ticket` block. What does `fn total<T: Priced>(items: &[T]) -> u32` need before it accepts a slice of tickets?',
          options: [
            { t: 'An `impl Priced for Ticket` block', ok: true, why: "Traits are nominal. A type implements a trait only where an `impl` block says so, however well its methods happen to match." },
            { t: 'Nothing: `Ticket` already has the method the trait asks for', why: "That is structural typing, as in TypeScript, or duck typing, as in Python. Rust reports `E0277`: the trait bound `Ticket: Priced` is not satisfied." },
            { t: '`#[derive(Priced)]` above the struct', why: "`derive` exists only for traits that come with a derive macro, such as `Debug` and `Clone`. A trait of your own has none. An ordinary `impl` block is what is needed." },
            { t: 'The struct must be declared as `struct Ticket: Priced`', why: "That is where PHP's `implements` and a Python base class go: on the type's own declaration. Rust has no such syntax. The promise goes in a separate block, which is why it can be made for types that already exist." },
          ],
        },
        {
          q: 'This function does not compile as written. Which bounds on `T` does its body need, and no more?',
          code: rs`fn report<T>(items: &[T], wanted: &T) -> String {
    let mut count = 0;
    for item in items {
        if item == wanted {
            count += 1;
        }
    }
    format!("{wanted:?} appears {count} times")
}`,
          options: [
            { t: '`T: PartialEq + Debug`', ok: true, why: "`==` needs `PartialEq` and `{:?}` needs `Debug`. Nothing else is done to a `T`. The items are only borrowed, so neither `Clone` nor `Copy` is involved." },
            { t: '`T: PartialEq + Display`', why: "`Display` is the trait behind `{}`. This format string uses `{:?}`, which is `Debug`." },
            { t: '`T: PartialEq + Debug + Copy`', why: "That compiles, but `Copy` is never used: the function compares and prints through references. The extra bound would only stop callers from passing a slice of `String`s." },
            { t: 'None. `==` and `{:?}` are checked at each call, against the type that is passed', why: "A C++ template and a Python function behave that way. Rust checks the body once, against the bounds, so the signature has to grant both operations." },
          ],
        },
        {
          q: 'Does this program compile?',
          code: rs`fn print_all<T>(items: &[T]) {
    for item in items {
        println!("{item}");
    }
}

fn main() {
    print_all(&[1, 2, 3]);
}`,
          options: [
            { t: 'No: the body prints a `T` with `{}`, and nothing says that a `T` implements `Display`', ok: true, why: "A generic body is checked against its bounds alone. `T` has none, so an item can be moved or borrowed and nothing more. The fix is `T: std::fmt::Display`." },
            { t: 'Yes, and it prints `1`, `2` and `3`, because the only call passes integers', why: "It would in a language that checks generic code at each use. Rust checks `print_all` by itself, for every possible `T`, before it looks at any call." },
            { t: 'No: a slice of `T` cannot be walked with `for` unless `T` has a bound', why: "It can. Walking a slice asks nothing of the element type. Printing each element does." },
            { t: 'Yes, but it would fail at run time for a type that cannot be printed', why: "There is no run-time check that could fail. Whether a type can be printed is settled when the program is compiled, from the bound." },
          ],
          verify: 'E0277',
        },
        {
          q: 'Does this program compile?',
          code: rs`trait Doubled {
    fn doubled(&self) -> Self;
}

impl Doubled for i32 {
    fn doubled(&self) -> Self {
        self * 2
    }
}

impl Doubled for String {
    fn doubled(&self) -> Self {
        format!("{self}{self}")
    }
}

fn main() {
    let n: i32 = 21;
    println!("{} {}", n.doubled(), String::from("ab").doubled());
}`,
          options: [
            { t: 'Yes, and it prints `42 abab`', ok: true, why: "The trait is defined here, so it may be implemented for any type, including types from the standard library. `Self` is `i32` in the first block and `String` in the second." },
            { t: 'No: `i32` and `String` are not defined in this program, so it may not implement a trait for them', why: "The orphan rule needs the trait or the type to be local, and here the trait is. What it refuses is a foreign trait for a foreign type, such as `Display` for `Vec<i32>`." },
            { t: 'No: built-in types such as `i32` cannot be given new methods', why: "They can, through a trait. The method is then available wherever the trait is in scope." },
            { t: 'No: one method cannot return an `i32` in one place and a `String` in another', why: "`Self` stands for the implementing type, so each `impl` block has its own concrete signature. Nothing about the return type is decided at run time." },
          ],
          verify: 'compiles',
        },
        {
          q: 'Does this program compile?',
          code: rs`trait Priced {
    fn price(&self) -> u32;

    fn costs_more_than(&self, other: &Self) -> bool {
        self.price() > other.price()
    }
}

struct Book {
    cents: u32,
}

struct Coffee {
    shots: u32,
}

impl Priced for Book {
    fn price(&self) -> u32 {
        self.cents
    }
}

impl Priced for Coffee {
    fn price(&self) -> u32 {
        250 + 60 * self.shots
    }
}

fn main() {
    let book = Book { cents: 1299 };
    let coffee = Coffee { shots: 2 };
    println!("{}", book.costs_more_than(&coffee));
}`,
          options: [
            { t: 'No: `other` must be a `&Book`, and it is given a `&Coffee`', ok: true, why: "In `impl Priced for Book`, `Self` is `Book`, so the method is `costs_more_than(&self, other: &Book)`. To compare across types the parameter would have to be generic, for example `other: &impl Priced`." },
            { t: 'Yes, and it prints `true`, because both types are `Priced`', why: "An interface type in TypeScript or PHP works that way: a parameter typed `Priced` accepts any implementer. `Self` is narrower. It means the very same type." },
            { t: 'No: a default method cannot call `price`, which has no body', why: "It can. A default method may call any method of the trait, and each implementer supplies the missing ones." },
            { t: 'No: `Coffee` does not define `costs_more_than`', why: "It has the method, from the default body in the trait. The error is in the argument, not in a missing method." },
          ],
          verify: 'E0308',
        },
        {
          q: 'A program calls a generic `max_of<T: PartialOrd>` with `i32` arguments, with `f64` arguments and with `String` arguments. What does the compiled program contain?',
          options: [
            { t: 'Three versions of `max_of`, one per type, each calling that type\'s comparison directly', ok: true, why: "This is monomorphization. It costs compile time and executable size, and nothing while the program runs." },
            { t: 'One `max_of`, which finds the right comparison from a type tag stored in each value', why: "Python and JavaScript work that way, because every value there carries its type. Rust values carry no tag, and a generic call is resolved at compile time." },
            { t: 'One `max_of` that works on pointers, with the types erased', why: "TypeScript erases generics, and Java compiles them to one method over object references. Rust does this only when you ask for it with `dyn`, the subject of lesson 16." },
            { t: 'A version of `max_of` for every type that implements `PartialOrd`', why: "Only for the types the program really uses it with. A generic function that is never called produces no machine code at all." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these traits can `#[derive]` write for a struct whose fields are all `u32`?',
          options: [
            { t: '`Debug`', ok: true, why: "The derived version prints the struct's name and its fields." },
            { t: '`Clone`', ok: true, why: "It clones every field." },
            { t: '`PartialEq`', ok: true, why: "It compares field by field." },
            { t: '`Hash`', ok: true, why: "It hashes every field, so the struct can be a `HashMap` key once it is also `Eq`." },
            { t: '`Default`', ok: true, why: "Every field gets its own default, which is 0 for a `u32`." },
            { t: '`Display`', why: "There is no derive for `Display`. How a value should read to a person is your decision, so you write `fmt` yourself." },
            { t: '`From<u32>`', why: "A conversion has to say what happens to each field, so it is written by hand." },
          ],
          hint: "Five can be derived. The other two need a decision that only you can make.",
        },
        {
          q: 'Given only this implementation, which line compiles?',
          code: rs`struct Celsius(f64);
struct Fahrenheit(f64);

impl From<Celsius> for Fahrenheit {
    fn from(c: Celsius) -> Self {
        Fahrenheit(c.0 * 9.0 / 5.0 + 32.0)
    }
}`,
          options: [
            { t: '`let f: Fahrenheit = Celsius(100.0).into();`', ok: true, why: "Implementing `From<Celsius> for Fahrenheit` gives `Into<Fahrenheit> for Celsius` for free, through a generic `impl` in the standard library." },
            { t: '`let c: Celsius = Fahrenheit(212.0).into();`', why: "That is the opposite direction, which needs `From<Fahrenheit> for Celsius`. A conversion one way says nothing about the way back." },
            { t: '`let f: Fahrenheit = Celsius(100.0);`', why: "Nothing converts by itself, even where a `From` exists. The conversion has to be asked for with `from` or `into`." },
            { t: '`let f = Celsius(100.0) as Fahrenheit;`', why: "`as` works between primitive types only. It never calls `From`." },
          ],
        },
      ],
      challenges: [
        {
          id: 'impl-describe',
          title: 'Three types, one trait',
          level: 'warm-up',
          prompt: [
            "The trait `Describe` and two structs are declared for you. Implement the trait three times: for `Book`, for `Point`, and for `bool`, a type you did not define. The starter has the three blocks with placeholder bodies.",
            { list: [
              "A `Book` describes itself as its title, then the page count in parentheses: `Dune (412 pages)`.",
              "A `Point` gives its coordinates: `(3, -4)`.",
              "A `bool` says `yes` or `no`.",
            ] },
          ],
          signature: 'impl Describe for Book\nimpl Describe for Point\nimpl Describe for bool',
          prelude: rs`trait Describe {
    fn describe(&self) -> String;
}

struct Book {
    title: String,
    pages: u32,
}

struct Point {
    x: i32,
    y: i32,
}`,
          starter: rs`impl Describe for Book {
    fn describe(&self) -> String {
        String::new()
    }
}

impl Describe for Point {
    fn describe(&self) -> String {
        String::new()
    }
}

impl Describe for bool {
    fn describe(&self) -> String {
        String::new()
    }
}`,
          hints: [
            "Inside `impl Describe for Book`, `self` is a `&Book`, so its fields are `self.title` and `self.pages`.",
            "`format!` builds a `String`: `format!(\"{} ({} pages)\", self.title, self.pages)`.",
            "In the block for `bool`, `self` is a `&bool`. Dereference it to test it: `if *self { String::from(\"yes\") } else { String::from(\"no\") }`.",
          ],
          solution: rs`impl Describe for Book {
    fn describe(&self) -> String {
        format!("{} ({} pages)", self.title, self.pages)
    }
}

impl Describe for Point {
    fn describe(&self) -> String {
        format!("({}, {})", self.x, self.y)
    }
}

impl Describe for bool {
    fn describe(&self) -> String {
        if *self { String::from("yes") } else { String::from("no") }
    }
}`,
          tests: [
            { label: 'A book gives its title and page count', body: rs`let book = Book { title: String::from("Dune"), pages: 412 };
assert_eq!(book.describe(), "Dune (412 pages)");` },
            { label: 'A point gives its coordinates', body: rs`assert_eq!(Point { x: 3, y: -4 }.describe(), "(3, -4)");` },
            { label: 'A bool says yes or no', body: rs`assert_eq!(true.describe(), "yes");
assert_eq!(false.describe(), "no");` },
            { label: 'All three satisfy a `T: Describe` bound', body: rs`fn twice<T: Describe>(item: &T) -> String {
    format!("{0} {0}", item.describe())
}
assert_eq!(twice(&Point { x: 0, y: 1 }), "(0, 1) (0, 1)");
assert_eq!(twice(&false), "no no");
assert_eq!(twice(&Book { title: String::from("Emma"), pages: 474 }), "Emma (474 pages) Emma (474 pages)");` },
          ],
        },
        {
          id: 'impl-display',
          title: 'A color you can print',
          level: 'warm-up',
          prompt: [
            "`Rgb` is a color. Implement `Display` for it, so that `{}` prints the form used on the web: a `#`, then each channel as two lowercase hexadecimal digits. Red 255, green 128 and blue 0 make `#ff8000`.",
            "Lesson 1 listed the placeholder you need: `{:02x}` is hexadecimal, padded with zeros to two digits. The starter has the `impl` block with the right signature. `write!` works like `println!`, except that it writes to the formatter `f`, and its result is the result of `fmt`.",
          ],
          signature: 'impl fmt::Display for Rgb',
          prelude: rs`struct Rgb {
    red: u8,
    green: u8,
    blue: u8,
}`,
          starter: rs`use std::fmt;

impl fmt::Display for Rgb {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "#")
    }
}`,
          hints: [
            "The fields are `self.red`, `self.green` and `self.blue`. `write!(f, …)` takes a format string and then the values, like `println!`.",
            "`{:02x}` prints a number in hexadecimal, at least two digits wide, padded with zeros.",
            "`write!(f, \"#{:02x}{:02x}{:02x}\", self.red, self.green, self.blue)`, with no semicolon after it: it is the return value.",
          ],
          solution: rs`use std::fmt;

impl fmt::Display for Rgb {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "#{:02x}{:02x}{:02x}", self.red, self.green, self.blue)
    }
}`,
          tests: [
            { label: 'Orange', body: rs`assert_eq!(format!("{}", Rgb { red: 255, green: 128, blue: 0 }), "#ff8000");` },
            { label: 'Pads small values with a zero', body: rs`assert_eq!(format!("{}", Rgb { red: 0, green: 10, blue: 1 }), "#000a01");` },
            { label: 'to_string() comes for free', body: rs`assert_eq!(Rgb { red: 18, green: 52, blue: 86 }.to_string(), "#123456");` },
            { label: 'Works inside a longer format string', body: rs`let white = Rgb { red: 255, green: 255, blue: 255 };
assert_eq!(format!("color: {white};"), "color: #ffffff;");` },
          ],
        },
        {
          id: 'generic-largest',
          title: 'The largest of anything',
          level: 'core',
          prompt: [
            "Return a reference to the largest item of a slice, or `None` if the slice is empty. It must work for any type whose values can be compared, including types that cannot be copied. If several items are equally large, return the first of them.",
            "The starter compiles, because it never looks at the items. As soon as you compare two of them the compiler will ask for something, and it will say what.",
          ],
          signature: 'fn largest<T>(items: &[T]) -> Option<&T>     // plus the bound the body turns out to need',
          starter: rs`fn largest<T>(items: &[T]) -> Option<&T> {
    None
}`,
          hints: [
            "Compare two items with `>` and read the error. It names the trait to add after `T` in the angle brackets.",
            "Keep a reference to the best item so far, not the item itself. `items.first()` returns an `Option<&T>`, which is `None` for an empty slice, and `?` returns that `None` straight away.",
            "With `T: PartialOrd`: `let mut best = items.first()?;` then `for item in items { if item > best { best = item; } }` and finally `Some(best)`. `>` keeps the first of several equal items, where `>=` would keep the last.",
          ],
          solution: rs`fn largest<T: PartialOrd>(items: &[T]) -> Option<&T> {
    let mut best = items.first()?;
    for item in items {
        if item > best {
            best = item;
        }
    }
    Some(best)
}`,
          tests: [
            { label: 'Integers', body: rs`assert_eq!(largest(&[3, 8, 5]), Some(&8));` },
            { label: 'Floating-point numbers', body: rs`assert_eq!(largest(&[0.5, -2.0, 0.25]), Some(&0.5));` },
            { label: 'An empty slice has no largest item', body: rs`let empty: [i32; 0] = [];
assert_eq!(largest(&empty), None);` },
            { label: 'Strings, which cannot be copied', body: rs`let words = vec![String::from("pear"), String::from("apple"), String::from("quince")];
assert_eq!(largest(&words), Some(&words[2]));` },
            { label: 'A type that can only be compared: no Copy, no Clone', body: rs`#[derive(Debug, PartialEq, PartialOrd)]
struct Score(u32);
let scores = [Score(40), Score(95), Score(70)];
assert_eq!(largest(&scores), Some(&scores[1]));` },
            { label: 'The first of several equal items', body: rs`let items = [7, 9, 9, 2];
let found = largest(&items).unwrap();
assert!(std::ptr::eq(found, &items[1]), "expected a reference to the first 9, at index 1");` },
          ],
        },
        {
          id: 'from-and-add',
          title: 'Conversions and operators for a vector',
          level: 'core',
          broken: 'compile',
          prompt: [
            "`Vec2` is a position or an offset on a grid. Give it two abilities by implementing two standard traits.",
            { list: [
              "`From<(i32, i32)>`, so that `Vec2::from((3, 4))` and `(3, 4).into()` both build one.",
              "`Add`, so that `a + b` adds two vectors field by field.",
            ] },
            "The editor starts almost empty, and the tests will not compile until both `impl` blocks exist. That is deliberate: the compiler's messages name the trait that is missing. Section 6 of the lesson has the shape of a `From` implementation, and section 8 the shape of `Add`.",
          ],
          signature: 'impl From<(i32, i32)> for Vec2\nimpl Add for Vec2',
          prelude: rs`#[derive(Debug, Clone, Copy, PartialEq)]
struct Vec2 {
    x: i32,
    y: i32,
}`,
          starter: rs`use std::ops::Add;

// impl From<(i32, i32)> for Vec2 { … }

// impl Add for Vec2 { … }`,
          hints: [
            "`From` has one method: `fn from(pair: (i32, i32)) -> Self`. The parts of a tuple are `pair.0` and `pair.1`.",
            "`Add` needs two things inside its block: `type Output = Vec2;` and `fn add(self, other: Vec2) -> Vec2`.",
            "The body of `add` is `Vec2 { x: self.x + other.x, y: self.y + other.y }`. You never write `into`: it exists as soon as `From` does.",
          ],
          solution: rs`use std::ops::Add;

impl From<(i32, i32)> for Vec2 {
    fn from(pair: (i32, i32)) -> Self {
        Vec2 { x: pair.0, y: pair.1 }
    }
}

impl Add for Vec2 {
    type Output = Vec2;

    fn add(self, other: Vec2) -> Vec2 {
        Vec2 { x: self.x + other.x, y: self.y + other.y }
    }
}`,
          tests: [
            { label: 'Builds a Vec2 from a tuple', body: rs`assert_eq!(Vec2::from((3, 4)), Vec2 { x: 3, y: 4 });` },
            { label: 'into() comes with From', body: rs`let v: Vec2 = (-1, 7).into();
assert_eq!(v, Vec2 { x: -1, y: 7 });` },
            { label: 'Adds field by field', body: rs`assert_eq!(Vec2 { x: 1, y: 2 } + Vec2 { x: 10, y: 20 }, Vec2 { x: 11, y: 22 });` },
            { label: 'Both operands stay usable, because Vec2 is Copy', body: rs`let a = Vec2 { x: 1, y: 1 };
let b = Vec2 { x: 2, y: 3 };
let sum = a + b + a;
assert_eq!(sum, Vec2 { x: 4, y: 5 });` },
            { label: 'Satisfies an `Add<Output = T>` bound', body: rs`fn double<T: Copy + std::ops::Add<Output = T>>(value: T) -> T {
    value + value
}
assert_eq!(double(Vec2::from((5, -2))), Vec2 { x: 10, y: -4 });` },
          ],
        },
        {
          id: 'missing-bound',
          title: 'Generic in name only',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          forbid: ['clone'],
          prompt: [
            "`first_difference` compares two slices position by position and describes the first place where they differ. It looks only at positions that both slices have, and returns `None` if those are all equal.",
            "It was written for integers and then made generic by replacing `i32` with `T`, which was not enough. Fix it so that it compiles, without changing what it does.",
            "The tests call it with `String`s as well as numbers, so the items cannot be copied. `clone` is not allowed either: nothing here needs a second copy of anything.",
          ],
          signature: 'fn first_difference<T>(left: &[T], right: &[T]) -> Option<String>     // plus the bounds it needs',
          starter: rs`fn first_difference<T>(left: &[T], right: &[T]) -> Option<String> {
    let shared = left.len().min(right.len());
    for i in 0..shared {
        let a = left[i];
        let b = right[i];
        if a != b {
            return Some(format!("index {i}: {a:?} vs {b:?}"));
        }
    }
    None
}`,
          hints: [
            "There are two kinds of error here. One kind names a missing trait: `!=` needs `PartialEq`, and `{:?}` needs `Debug`. Add both bounds to `T`, joined with `+`.",
            "The other kind is `cannot move out of type [T]`. `let a = left[i];` tries to take the item out of the slice. A `T: Copy` bound would silence it for numbers, but the tests pass `String`s.",
            "Borrow instead: `let a = &left[i];` and `let b = &right[i];`. Comparing and printing both work through references, so the rest stays as it is. The signature becomes `fn first_difference<T: PartialEq + std::fmt::Debug>(…)`.",
          ],
          solution: rs`use std::fmt::Debug;

fn first_difference<T: PartialEq + Debug>(left: &[T], right: &[T]) -> Option<String> {
    let shared = left.len().min(right.len());
    for i in 0..shared {
        let a = &left[i];
        let b = &right[i];
        if a != b {
            return Some(format!("index {i}: {a:?} vs {b:?}"));
        }
    }
    None
}`,
          tests: [
            { label: 'Finds the first difference between two lists of numbers', body: rs`assert_eq!(first_difference(&[1, 2, 3, 4], &[1, 2, 5, 9]), Some(String::from("index 2: 3 vs 5")));` },
            { label: 'Equal slices have no difference', body: rs`assert_eq!(first_difference(&[4, 5, 6], &[4, 5, 6]), None);` },
            { label: 'Works for strings, which cannot be copied', body: rs`let left = vec![String::from("ada"), String::from("bob")];
let right = vec![String::from("ada"), String::from("eve")];
assert_eq!(first_difference(&left, &right), Some(String::from("index 1: \"bob\" vs \"eve\"")));
assert_eq!(left.len(), 2, "the inputs are only borrowed");` },
            { label: 'Looks only at positions both slices have', body: rs`assert_eq!(first_difference(&[1, 2], &[1, 2, 3]), None);
let nothing: [i32; 0] = [];
assert_eq!(first_difference(&nothing, &[7]), None);` },
            { label: 'Asks for nothing beyond PartialEq and Debug', body: rs`#[derive(Debug, PartialEq)]
struct Tag(char);
assert_eq!(first_difference(&[Tag('a')], &[Tag('b')]), Some(String::from("index 0: Tag('a') vs Tag('b')")));` },
          ],
        },
        {
          id: 'generic-stack',
          title: 'A stack of anything',
          level: 'stretch',
          broken: 'compile',
          prompt: [
            "This `Stack` works, but only for `i32`. Make it generic, so that the same code gives a `Stack<String>`, a `Stack<f64>` or a stack of anything else.",
            { list: [
              "`new`, `push`, `pop`, `peek`, `len` and `is_empty` exist for **every** `T`, with no bounds.",
              "`max` returns a reference to the largest item, and exists only where `T: PartialOrd`.",
              "`Stack<T>` implements `From<Vec<T>>`. The last element of the vector becomes the top of the stack.",
            ] },
            "The tests use a `Stack<String>` and a stack of a type that cannot be compared, so they will not compile until the type is generic and every bound is in the right place.",
          ],
          signature: 'struct Stack<T>\nimpl<T> Stack<T>\nimpl<T: PartialOrd> Stack<T>\nimpl<T> From<Vec<T>> for Stack<T>',
          starter: rs`struct Stack {
    items: Vec<i32>,
}

impl Stack {
    fn new() -> Self {
        Stack { items: Vec::new() }
    }

    fn push(&mut self, item: i32) {
        self.items.push(item);
    }

    fn pop(&mut self) -> Option<i32> {
        self.items.pop()
    }

    fn peek(&self) -> Option<&i32> {
        self.items.last()
    }

    fn len(&self) -> usize {
        self.items.len()
    }

    fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    fn max(&self) -> Option<&i32> {
        let mut best = self.items.first()?;
        for item in &self.items {
            if item > best {
                best = item;
            }
        }
        Some(best)
    }
}

impl From<Vec<i32>> for Stack {
    fn from(items: Vec<i32>) -> Self {
        Stack { items }
    }
}`,
          hints: [
            "Declare the parameter on the struct, `struct Stack<T> { items: Vec<T> }`, and then on the block: `impl<T> Stack<T>`. Inside, every `i32` becomes `T`.",
            "`max` compares items, so it needs `T: PartialOrd`. Putting that bound on the whole `impl` block would take `push` and `pop` away from types that cannot be compared. Move `max` into a second block: `impl<T: PartialOrd> Stack<T> { … }`.",
            "The conversion is generic as well: `impl<T> From<Vec<T>> for Stack<T> { fn from(items: Vec<T>) -> Self { Stack { items } } }`.",
          ],
          solution: rs`struct Stack<T> {
    items: Vec<T>,
}

impl<T> Stack<T> {
    fn new() -> Self {
        Stack { items: Vec::new() }
    }

    fn push(&mut self, item: T) {
        self.items.push(item);
    }

    fn pop(&mut self) -> Option<T> {
        self.items.pop()
    }

    fn peek(&self) -> Option<&T> {
        self.items.last()
    }

    fn len(&self) -> usize {
        self.items.len()
    }

    fn is_empty(&self) -> bool {
        self.items.is_empty()
    }
}

impl<T: PartialOrd> Stack<T> {
    fn max(&self) -> Option<&T> {
        let mut best = self.items.first()?;
        for item in &self.items {
            if item > best {
                best = item;
            }
        }
        Some(best)
    }
}

impl<T> From<Vec<T>> for Stack<T> {
    fn from(items: Vec<T>) -> Self {
        Stack { items }
    }
}`,
          tests: [
            { label: 'A stack of numbers: last in, first out', body: rs`let mut stack = Stack::new();
stack.push(1);
stack.push(2);
assert_eq!(stack.len(), 2);
assert_eq!(stack.pop(), Some(2));
assert_eq!(stack.pop(), Some(1));
assert_eq!(stack.pop(), None);
assert!(stack.is_empty());` },
            { label: 'A stack of strings', body: rs`let mut stack: Stack<String> = Stack::new();
stack.push(String::from("first"));
stack.push(String::from("second"));
assert_eq!(stack.peek(), Some(&String::from("second")));
assert_eq!(stack.pop(), Some(String::from("second")));
assert_eq!(stack.len(), 1);` },
            { label: 'max works on anything that can be compared', body: rs`let mut stack = Stack::new();
for x in [2.5, 9.0, -1.0] {
    stack.push(x);
}
assert_eq!(stack.max(), Some(&9.0));
let empty: Stack<u8> = Stack::new();
assert_eq!(empty.max(), None);
let words = Stack::from(vec!["pear", "apple"]);
assert_eq!(words.max(), Some(&"pear"));` },
            { label: 'A stack of a type that cannot be compared still pushes and pops', body: rs`struct Opaque;
let mut stack = Stack::new();
stack.push(Opaque);
stack.push(Opaque);
assert_eq!(stack.len(), 2);
assert!(stack.pop().is_some());
assert!(stack.peek().is_some());` },
            { label: 'From a Vec: its last element is on top', body: rs`let mut stack = Stack::from(vec!['a', 'b', 'c']);
assert_eq!(stack.pop(), Some('c'));
assert_eq!(stack.peek(), Some(&'b'));` },
          ],
        },
      ],
    },

    {
      id: 'trait-objects',
      title: 'Trait objects & dynamic dispatch',
      category: part,
      minutes: 30,
      summary: 'How one list holds values of several types: a pointer to the value paired with a pointer to a table of its methods. When that beats generics, when an enum beats both, and what Rust offers in place of inheritance.',
      topics: ['dyn Trait', 'Fat pointers', 'Vtables', 'Static and dynamic dispatch', 'Enum or trait object', 'Dyn compatibility', 'Supertraits', 'impl Trait'],
      sections: [
        {
          title: 'One list, many types',
          body: [
            "Lesson 15 gave you generic functions. `fn total<T: Priced>(items: &[T])` works for any type that implements the trait, and the compiler makes a copy of it for each type. But a `T` stands for **one** type at each use. A `&[T]` is a slice of books or a slice of coffees, never some of each. This program wants a list that holds squares and rectangles together:",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn total_area<T: Shape>(shapes: &[T]) -> f64 {
    let mut sum = 0.0;
    for shape in shapes {
        sum += shape.area();
    }
    sum
}

fn main() {
    let shapes = vec![Square(2.0), Rect(2.0, 3.0)];
    println!("{}", total_area(&shapes));
}`, name: 'mixed.rs', fails: 'E0308' },
            "A `Vec<T>` stores its elements side by side in slots of one size, and the code that reads a slot is compiled for one type. The first element settled `T` as `Square`, and a `Rect` is not a `Square`. It does not help that both implement `Shape`, because `Shape` is a trait and not a type that a slot could have.",
            "The type you are looking for is written `dyn Shape`. It means **some value whose type implements `Shape`**, where the type is known only while the program runs. `dyn` is short for dynamic. Such a value is called a **trait object**, and it is always handled through a pointer. Here the pointer is a `Box`, the owning pointer to one value on the heap from lesson 4:",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    let mut sum = 0.0;
    for shape in shapes {
        sum += shape.area();
    }
    sum
}

fn main() {
    let shapes: Vec<Box<dyn Shape>> = vec![
        Box::new(Square(2.0)),
        Box::new(Rect(2.0, 3.0)),
        Box::new(Square(0.5)),
    ];
    for shape in &shapes {
        println!("{}", shape.area());
    }
    println!("total {}", total_area(&shapes));
}`, name: 'boxed.rs', expect: '4\n6\n0.25\ntotal 10.25\n' },
            { list: [
              "`Box<dyn Shape>` is a box that owns some shape. Every such box has the same size, whatever it points to, so a `Vec` of them has slots of one size.",
              "`Box::new(Square(2.0))` is a `Box<Square>`. The vector's type is written out, so each box is converted to a `Box<dyn Shape>` on the way in. From then on the compiler no longer knows which elements are squares.",
              "`shape.area()` looks like any other method call. Which `area` runs is decided for each element while the program runs. That is **dynamic dispatch**, and section 3 sets it beside what generics do.",
            ] },
            "A trait object does not have to be owned. `&dyn Shape` borrows one, and `&mut dyn Shape` borrows one mutably. A function that only reads a shape takes `&dyn Shape`. It then accepts a value of any implementing type, wherever that value lives:",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn describe(shape: &dyn Shape) -> String {
    format!("area {}", shape.area())
}

fn main() {
    let square = Square(2.0);                               // on the stack
    let boxed: Box<dyn Shape> = Box::new(Rect(2.0, 3.0));   // on the heap

    println!("{}", describe(&square));                      // a &Square becomes a &dyn Shape
    println!("{}", describe(boxed.as_ref()));               // as_ref borrows what is in the box
}`, name: 'borrowed.rs', expect: 'area 4\narea 6\n' },
            { pitfall: [
              "The conversion from `Box<Square>` to `Box<dyn Shape>` happens only where the compiler already knows that a trait object is wanted: a `let` with a type, a function argument, a return value. Leave the annotation off the vector and its element type is inferred from the first element, which puts you back at the first error.",
              { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn main() {
    let shapes = vec![Box::new(Square(2.0)), Box::new(Rect(2.0, 3.0))];
    for shape in &shapes {
        println!("{}", shape.area());
    }
}`, name: 'no_annotation.rs', fails: 'E0308' },
              "When a list of boxes is rejected with `expected Square, found Rect`, look for the missing `Vec<Box<dyn Shape>>`.",
            ] },
            { compare: "A Python list holds whatever you put in it, and `shape.area()` is looked up by name when the line runs. A PHP array is the same, and a TypeScript `Shape[]` is the same with a type check in front. All three work because every value there is a heap object behind a reference, and every object carries a pointer to its class. `Vec<Box<dyn Shape>>` is that arrangement built on request: the `Box` is the reference, and `dyn` is the lookup while the program runs. The difference is that in Rust you ask for it. A `Vec<Square>`, with no boxes and no lookup, is what you get when you do not." },
          ],
        },
        {
          title: 'Why dyn lives behind a pointer',
          body: [
            "Why the box? Why not a parameter of type `dyn Shape`, or a `Vec<dyn Shape>`? Try it:",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn describe(shape: dyn Shape) -> String {
    format!("area {}", shape.area())
}

fn main() {
    println!("{}", describe(Square(2.0)));
}`, name: 'unsized.rs', fails: 'E0277' },
            "The first error is the one to read. `Sized` is a trait that the compiler implements for every type whose size it knows, and so far that was nearly every type you met. A `Square` is 8 bytes and a `Rect` is 16. A `dyn Shape` might be either, or a type from a library that does not exist yet, so it has no size of its own. A parameter, a local variable and a slot in a `Vec` all need a size that is fixed when the program is compiled. Without one the compiler cannot lay out a stack frame or work out where element `i` of a vector starts.",
            "You have met two types like this before: `str` in lesson 9 and `[T]` in lesson 8. The remedy is the same for all three, and both `help:` lines suggest it. You never hold a `str`, you hold a `&str` or a `String`. You never hold a `dyn Shape`, you hold a `&dyn Shape` or a `Box<dyn Shape>`. A pointer has a known size whatever it points to.",
            "A reference to a slice carries a second word, the length. A pointer to a trait object carries a second word too:",
            { run: rs`use std::mem::{size_of, size_of_val};

trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn main() {
    println!("Square: {} bytes, Rect: {} bytes", size_of::<Square>(), size_of::<Rect>());
    println!("&Square: {}, Box<Square>: {}", size_of::<&Square>(), size_of::<Box<Square>>());
    println!("&dyn Shape: {}, Box<dyn Shape>: {}", size_of::<&dyn Shape>(), size_of::<Box<dyn Shape>>());

    let square = Square(2.0);
    let rect = Rect(2.0, 3.0);
    let shapes: [&dyn Shape; 2] = [&square, &rect];
    for shape in shapes {
        // size_of_val asks the value behind the reference for its size, while the program runs.
        println!("area {} in {} bytes", shape.area(), size_of_val(shape));
    }
}`, name: 'fat.rs', expect: 'Square: 8 bytes, Rect: 16 bytes\n&Square: 8, Box<Square>: 8\n&dyn Shape: 16, Box<dyn Shape>: 16\narea 4 in 8 bytes\narea 6 in 16 bytes\n' },
            "A `&dyn Shape` or a `Box<dyn Shape>` is a **fat pointer**, two words wide. The first word is the address of the value. The second is the address of a **vtable**: a table that the compiler builds once for each pairing of a type with a trait it is used as. The table holds the type's size and alignment, the function that drops it, and the address of each method of the trait.",
            { memory: {
              title: 'Two `Box<dyn Shape>` values: `a` owns a `Square` and `b` owns a `Rect`',
              vars: [
                { id: 'a', type: 'Box<dyn Shape>', fields: [['data', 'pointer'], ['vtable', 'pointer']] },
                { id: 'b', type: 'Box<dyn Shape>', fields: [['data', 'pointer'], ['vtable', 'pointer']] },
                { id: 'square', name: 'a Square', type: 'Square', frame: 'heap', fields: [['0', 'f64']] },
                { id: 'rect', name: 'a Rect', type: 'Rect', frame: 'heap', fields: [['0', 'f64'], ['1', 'f64']] },
                { id: 'vs', name: 'vtable for Square as Shape', type: 'vtable', frame: 'static', fields: [['drop', 'fn'], ['size', 'usize'], ['align', 'usize'], ['area', 'fn']] },
                { id: 'vr', name: 'vtable for Rect as Shape', type: 'vtable', frame: 'static', fields: [['drop', 'fn'], ['size', 'usize'], ['align', 'usize'], ['area', 'fn']] },
              ],
              set: {
                a: { data: '&square', vtable: '&vs' },
                b: { data: '&rect', vtable: '&vr' },
                square: { 0: '2.0' },
                rect: { 0: '2.0', 1: '3.0' },
                vs: { drop: 'drop a Square', size: 8, align: 8, area: 'Square::area' },
                vr: { drop: 'drop a Rect', size: 16, align: 8, area: 'Rect::area' },
              },
              caption: "Each box is two words: where the value is, and where the table for its type is. The two tables are part of the compiled program, one per type, and every trait object of that type points at the same one. A plain `Box<Square>` would be the first word alone.",
            } },
            "A call such as `a.area()` compiles to three steps: read the second word to find the table, read the table's `area` entry to find the function, and call it with the first word as `self`. The `size_of_val` call in the last cell read the `size` entry in the same way. When a `Box<dyn Shape>` is dropped, it calls the `drop` entry and then frees `size` bytes.",
            { pitfall: [
              "A reference to a box is not a reference to a trait object. `&boxed` is a `&Box<dyn Shape>`: one word, pointing at the two words of the box. A function that asks for `&dyn Shape` does not accept it, and the message is a confusing one, because the compiler tries to treat the box itself as the shape:",
              { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn describe(shape: &dyn Shape) -> String {
    format!("area {}", shape.area())
}

fn main() {
    let boxed: Box<dyn Shape> = Box::new(Square(2.0));
    println!("{}", describe(&boxed));
}`, name: 'ref_to_box.rs', fails: 'E0277' },
              "Pass `boxed.as_ref()` or `&*boxed`, which borrow what the box points to. Method calls need no such care: `boxed.area()` looks through the box by itself.",
            ] },
            { aside: "Once a `Box<Square>` has become a `Box<dyn Shape>`, the type is forgotten, not merely hidden. Nothing in the fat pointer says `Square`, and there is no `isinstance` or `instanceof` to ask. All that is left is what the table holds: the methods of the trait. If code needs to know what kind of shape it has, either the trait offers a method that says, or the design wants an enum, which section 4 comes to." },
            { fromC: "This is the table of function pointers from the C lesson on function pointers, together with the `void *context` that every C callback carries. A C program builds the table by hand, fills in each slot, and casts the context back to the type it hopes it is. Here the compiler generates the table, and checks every slot and every call against the trait." },
          ],
        },
        {
          title: 'Static or dynamic dispatch',
          body: [
            "You now have two ways to write a function that accepts any shape:",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

// Static dispatch: the compiler makes one copy of this function for each type it is called with.
fn double_static<T: Shape>(shape: &T) -> f64 {
    shape.area() * 2.0
}

// Dynamic dispatch: this function is compiled once, and finds area through the vtable.
fn double_dynamic(shape: &dyn Shape) -> f64 {
    shape.area() * 2.0
}

fn main() {
    let square = Square(2.0);
    let rect = Rect(2.0, 3.0);
    println!("{} {}", double_static(&square), double_static(&rect));
    println!("{} {}", double_dynamic(&square), double_dynamic(&rect));
}`, name: 'dispatch.rs', expect: '8 12\n8 12\n' },
            "The output is the same and the machine code is not. **Dispatch** is the step of deciding which function a call runs. For `double_static` the compiler decides, twice, because monomorphization produces a `double_static` for `Square` and another for `Rect`, each with its own `area` built in. For `double_dynamic` there is one function, and the decision is made on every call by reading the vtable.",
            { table: {
              head: ['', 'Generic: `T: Shape`', 'Trait object: `dyn Shape`'],
              rows: [
                ['Which method runs is decided', 'When the program is compiled', 'While it runs, from the vtable'],
                ['Copies of the function in the program', 'One for each type it is used with', 'One'],
                ['The call to `area`', 'A direct call, which the optimizer can inline', 'A read from the table and an indirect call, which it can rarely inline'],
                ['One collection holding several types', 'No. A `Vec<T>` has one `T`', 'Yes'],
                ['Where the value is', 'Wherever you put it', 'Behind a pointer, usually in a heap allocation of its own'],
                ['Which traits it works with', 'Any', 'Only traits that are dyn compatible (section 5)'],
              ],
            } },
            "The indirect call itself is cheap: one more read from memory and a jump. What costs more is what the optimizer can no longer do. It does not know which `area` will run, so it can rarely paste the body into the loop that calls it and simplify the two together. For a method that does real work, such as formatting text or writing to a file, the difference cannot be measured. For a tiny method called in a tight loop over millions of elements, it can.",
            { list: [
              "**Start with generics.** They are what the standard library uses nearly everywhere, they cost nothing at run time, and the compiler keeps full knowledge of the type.",
              "**Use `dyn` when the types really are mixed while the program runs:** the widgets of a window, a list of handlers read from a configuration file, plugins.",
              "**Use `dyn` to save code size and compile time** when a large function would otherwise be copied for dozens of types and the speed of the call does not matter.",
            ] },
            { pitfall: "`impl Shape` and `dyn Shape` look alike and mean opposite things. `fn show(shape: &impl Shape)` is a generic function, as lesson 15 said: static dispatch, one copy per type. `fn show(shape: &dyn Shape)` is one function with dynamic dispatch." },
            { compare: "In Python, PHP and JavaScript every method call is dynamic, and more so than a vtable call. The method is found by looking its name up in a dictionary on the object or its class while the program runs, which is why you can replace a method on a live object there. Those languages offer no static alternative, so the question never comes up. Rust offers both, and makes you write `dyn` wherever the dynamic kind is used, so the cost is visible in the types." },
            { native: "Clippy flags a parameter of type `&Box<dyn Shape>`, for the same reason it flags `&Vec<T>` and `&String`: the function is asking for more than it needs. Take `&dyn Shape`, which accepts a shape in a box, on the stack or inside another struct." },
          ],
        },
        {
          title: 'Enum or trait object?',
          body: [
            "Lesson 12 already had a way to put several kinds of thing in one list, which was an enum:",
            { run: rs`use std::mem::size_of;

enum Shape {
    Square(f64),
    Rect(f64, f64),
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Square(side) => side * side,
            Shape::Rect(width, height) => width * height,
        }
    }
}

fn main() {
    let shapes = vec![Shape::Square(2.0), Shape::Rect(2.0, 3.0), Shape::Square(0.5)];
    for shape in &shapes {
        println!("{}", shape.area());
    }
    println!("each slot is {} bytes", size_of::<Shape>());
}`, name: 'as_enum.rs', expect: '4\n6\n0.25\neach slot is 24 bytes\n' },
            "Here `Shape` is a type again, with a size: the largest variant plus a tag, as lesson 12 described. The three values sit side by side in the vector's one buffer, with no boxes. Both designs give you one list of mixed shapes and one `area` call that does the right thing for each element. They differ in what is easy to add later, and in where the values live.",
            { table: {
              head: ['', 'Enum', 'Trait object'],
              rows: [
                ['The set of kinds', '**Closed.** Listed in one place and known to the compiler', '**Open.** Any code, in any crate, can add a type by implementing the trait'],
                ['Adding a kind', 'Add a variant, then fix every `match` the compiler points at', 'Add a struct and an `impl` block. No existing code changes'],
                ['Adding an operation', 'Write one new function with a `match`. No existing code changes', 'Add a method to the trait, then write it for every type'],
                ['Storage', 'Inline. Every value takes the size of the largest variant plus a tag', 'Behind a pointer. Every value takes its own size, usually in its own allocation'],
                ['A call', 'A `match` on the tag, which can be inlined', 'An indirect call through the vtable'],
                ['Looking inside', '`match` and `if let` reach every field', 'Only the methods of the trait. The type is forgotten'],
              ],
            } },
            "Neither is the modern form of the other. The question that separates them is **who will add what**.",
            { list: [
              "If you can list every case today, and the list is yours to change, use an **enum**: the tokens of a language, the states of a connection, the messages of a protocol. You get exhaustive matching, values stored inline, and any number of operations added without touching the type.",
              "If code that you will never see must be able to add cases, use a **trait**: plugins, handlers that users of a library write, a test double standing in for a database. With an enum those users would have to edit your source.",
              "If you are unsure, start with the enum. Turning a small enum into a trait later is mechanical, and the compiler finds every `match` that has to change.",
            ] },
            { compare: "A class hierarchy in Python, PHP or TypeScript is always the open design: anyone may write a subclass. The closed design exists there too, as a TypeScript union such as `{ kind: 'square', side: number } | { kind: 'rect', … }` with a `switch` on `kind`, or as Python's `match` over a few dataclasses. In languages built on classes, subclassing is the habit even for a fixed set of cases. In Rust the enum is at least as common as the trait object, and it is the first one to reach for." },
          ],
        },
        {
          title: 'What can be a trait object',
          body: [
            "Not every trait can follow `dyn`. Add one method to `Shape` and the list of boxes stops compiling:",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
    fn scaled(&self, factor: f64) -> Self;
}

struct Square(f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }

    fn scaled(&self, factor: f64) -> Self {
        Square(self.0 * factor)
    }
}

fn main() {
    let shapes: Vec<Box<dyn Shape>> = vec![Box::new(Square(2.0))];
    println!("{}", shapes[0].area());
}`, name: 'not_dyn.rs', fails: 'E0038' },
            "The note gives the reason in one phrase: the compiler must be able to build a vtable. Every call on a `dyn Shape` goes through the table, made by code that does not know the type behind the pointer. `scaled` returns `Self`. For a square that is 8 bytes and for a rectangle 16, so a caller holding only a `dyn Shape` could not know how much room to set aside for the result. No table entry for `scaled` could ever be called.",
            "A trait that can be used with `dyn` is called **dyn compatible**. Older books and older compilers say **object safe** for the same thing. The rules come down to one test: can each method be called by someone who has nothing but the two words of the fat pointer?",
            { table: {
              head: ['A method that', 'With `dyn`?', 'Why'],
              rows: [
                ['Takes `&self` or `&mut self`, and otherwise uses ordinary types', 'Yes', 'The receiver is the data pointer, and everything else has a known type and size'],
                ['Returns `Self`, or takes another `Self` as a parameter', 'No', 'The size and type of `Self` are unknown at the call'],
                ['Has a type parameter of its own, such as `fn fits<T: Shape>(&self, other: &T)`', 'No', 'Generics are compiled once per type, so the table would need an entry for every `T` there could ever be'],
                ['Has no `self`, such as `fn new() -> Self`', 'No', 'There is no value, so there is no vtable pointer to follow'],
              ],
            } },
            "This explains some facts about the standard library. `Clone` cannot be a trait object, because `clone` returns `Self`. `PartialEq` cannot, because `eq` takes another `Self`. `Debug` and `Display` can.",
            "There are two ways to keep such a method and still use `dyn`. One is to change its signature so that it mentions a trait object where it mentioned `Self`. The other is to fence the method off with `where Self: Sized`, which leaves it out of the vtable: it exists on concrete types and not on `dyn Shape`.",
            { run: rs`trait Shape {
    fn area(&self) -> f64;

    // Fix 1: return a trait object where Self was. Callable through dyn Shape.
    fn scaled(&self, factor: f64) -> Box<dyn Shape>;

    // Fix 2: keep Self, and leave the method out of the vtable. Callable on concrete types only.
    fn larger(self, other: Self) -> Self
    where
        Self: Sized,
    {
        if self.area() >= other.area() { self } else { other }
    }
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }

    fn scaled(&self, factor: f64) -> Box<dyn Shape> {
        Box::new(Square(self.0 * factor))
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }

    fn scaled(&self, factor: f64) -> Box<dyn Shape> {
        Box::new(Rect(self.0 * factor, self.1 * factor))
    }
}

fn main() {
    let best = Square(1.0).larger(Square(2.0));         // two Squares in, a Square out
    let shapes: Vec<Box<dyn Shape>> = vec![Box::new(best), Box::new(Rect(2.0, 3.0))];
    for shape in &shapes {
        let bigger = shape.scaled(3.0);                 // through the vtable
        println!("{} -> {}", shape.area(), bigger.area());
    }
}`, name: 'dyn_again.rs', expect: '4 -> 36\n6 -> 54\n' },
            "`Iterator` uses the second fix throughout. Its adapters, such as `map` and `filter`, are generic methods marked `where Self: Sized`, which is why a `Box<dyn Iterator<Item = u32>>` is allowed although the trait has dozens of generic methods. Lesson 18 covers them.",
          ],
        },
        {
          title: 'Composition instead of inheritance',
          body: [
            "Rust has no inheritance. A struct cannot extend another struct, and there is no `super`. A base class in Python, PHP or TypeScript does three jobs at once, and Rust has a separate tool for each of them:",
            { table: {
              head: ['A base class gives you', 'In Rust'],
              rows: [
                ['Fields that every subclass has', 'A struct that the other structs hold as a field. This is **composition**'],
                ['Method bodies that every subclass has', 'Default methods on a trait, or methods on the inner struct'],
                ['One variable or list that takes any subclass', 'A generic `T: Trait`, or a trait object `dyn Trait`'],
              ],
            } },
            "Here is the standard example for inheritance, a set of user-interface widgets, built from those three parts:",
            { run: rs`// What a base class would hold: the data that every widget has.
struct Frame {
    x: i32,
    y: i32,
    visible: bool,
}

impl Frame {
    fn at(x: i32, y: i32) -> Frame {
        Frame { x, y, visible: true }
    }
}

struct Label {
    frame: Frame,               // a Label has a Frame, where a subclass would be one
    text: String,
}

struct Button {
    frame: Frame,
    caption: String,
    presses: u32,
}

// What a base class would do: the behavior that every widget has.
trait Widget {
    fn frame(&self) -> &Frame;          // required: where the shared data is
    fn content(&self) -> String;        // required: the part that differs

    fn render(&self) -> String {        // provided: written once, for every widget
        let frame = self.frame();
        if frame.visible {
            format!("({}, {}) {}", frame.x, frame.y, self.content())
        } else {
            String::from("(hidden)")
        }
    }
}

impl Widget for Label {
    fn frame(&self) -> &Frame {
        &self.frame
    }

    fn content(&self) -> String {
        self.text.clone()
    }
}

impl Widget for Button {
    fn frame(&self) -> &Frame {
        &self.frame
    }

    fn content(&self) -> String {
        format!("[{}] pressed {} times", self.caption, self.presses)
    }
}

fn main() {
    let mut cancel = Button { frame: Frame::at(0, 20), caption: String::from("Cancel"), presses: 0 };
    cancel.frame.visible = false;

    let screen: Vec<Box<dyn Widget>> = vec![
        Box::new(Label { frame: Frame::at(0, 0), text: String::from("Save changes?") }),
        Box::new(Button { frame: Frame::at(0, 10), caption: String::from("OK"), presses: 2 }),
        Box::new(cancel),
    ];
    for widget in &screen {
        println!("{}", widget.render());
    }
}`, name: 'widgets.rs', expect: '(0, 0) Save changes?\n(0, 10) [OK] pressed 2 times\n(hidden)\n' },
            { list: [
              "`Label` and `Button` each **have** a `Frame`. Nothing is inherited, so the shared field is reached by its name: `cancel.frame.visible`.",
              "`render` is written once, in the trait. A trait has no fields, so `render` asks for the frame through a required method, and each type answers in one line.",
              "`Vec<Box<dyn Widget>>` is the list of any kind of widget.",
            ] },
            "What you give up is the implicit part, and that is mostly a gain. No method is overridden three levels up, no constructor forgets to call its parent's, and a type's `impl` blocks list everything it can do. What you pay is the one-line forwarding method in each type.",
            "A trait can also require another trait. `trait Shape: Display` says that anything implementing `Shape` must implement `Display` as well. `Display` is then a **supertrait** of `Shape`:",
            { run: rs`use std::fmt;

// To be a Shape, a type must also be Display.
trait Shape: fmt::Display {
    fn area(&self) -> f64;

    fn report(&self) -> String {
        format!("{self} covers {}", self.area())     // {self} works because of the supertrait
    }
}

struct Square(f64);

impl fmt::Display for Square {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "a square of side {}", self.0)
    }
}

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn main() {
    let shape: Box<dyn Shape> = Box::new(Square(1.5));
    println!("{}", shape.report());
    println!("{shape}");                // a dyn Shape can be printed: its vtable has Display too
}`, name: 'supertrait.rs', expect: 'a square of side 1.5 covers 2.25\na square of side 1.5\n' },
            "The supertrait buys two things. Inside the trait, default methods may use what the supertrait offers, as `report` does. Outside it, anyone holding a `T: Shape` or a `dyn Shape` may use it too.",
            { pitfall: "Read `trait Shape: Display` as **Shape requires Display**, not as Shape is a kind of Display. Nothing is passed down. `Square` still writes both `impl` blocks, and it could not implement `Shape` without the other one." },
            { compare: "In Python, `class Button(Widget)` links the class to its parent, and every attribute lookup walks that chain while the program runs. `extends` in PHP and TypeScript does the same with the types checked earlier. One keyword hands you the parent's fields, its methods and a place in every list of the parent type, whether or not you wanted all three. A PHP `trait` and a Python mixin are ways to hand out method bodies without the rest. In Rust the three always come separately, and a type takes the ones it needs." },
          ],
        },
        {
          title: 'Returning some type that implements: impl Trait or Box<dyn Trait>',
          body: [
            "A function can return a value without naming its type. Lesson 15 used `impl Trait` for a parameter. As a return type it means: this function returns **one** concrete type that implements the trait, and the caller is told only the trait.",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn unit() -> impl Shape {
    Square(1.0)
}

fn main() {
    let shape = unit();
    println!("{}", shape.area());
    println!("{} bytes, and no box", std::mem::size_of_val(&shape));
}`, name: 'impl_return.rs', expect: '1\n8 bytes, and no box\n' },
            "Nothing is boxed and nothing is dynamic. The compiler knows that `shape` is a `Square`, keeps it on the stack and calls `Square::area` directly. Only the signature hides the type. That lets a library change which type it returns without breaking its callers. It is also the only way to return a type that has no name you could write down, which is true of every closure, in lesson 17, and of most iterator chains, in lesson 18.",
            "One concrete type is meant literally. Two branches that return different types are rejected, even though both implement the trait:",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn make(kind: &str) -> impl Shape {
    if kind == "square" {
        Square(2.0)
    } else {
        Rect(2.0, 3.0)
    }
}

fn main() {
    println!("{}", make("square").area());
}`, name: 'two_types.rs', fails: 'E0308' },
            "The caller has to set aside room for the result, and an `impl Shape` has one size, fixed when the program is compiled. A value that is a square on some calls and a rectangle on others is a different thing. It is a trait object, and the `help:` line says so:",
            { run: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

struct Rect(f64, f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.0 * self.1
    }
}

fn make(kind: &str) -> Box<dyn Shape> {
    if kind == "square" {
        Box::new(Square(2.0))
    } else {
        Box::new(Rect(2.0, 3.0))
    }
}

fn main() {
    for kind in ["square", "rect"] {
        println!("{kind}: {}", make(kind).area());
    }
}`, name: 'factory.rs', expect: 'square: 4\nrect: 6\n' },
            { table: {
              head: ['', '`-> impl Shape`', '`-> Box<dyn Shape>`'],
              rows: [
                ['Types it can return', 'Exactly one, chosen by the function', 'Any mix, chosen while the program runs'],
                ['Where the result lives', 'Wherever the caller puts it, usually the stack', 'On the heap'],
                ['Calls on the result', 'Static', 'Through the vtable'],
                ['Typical use', 'Closures, iterator chains, hiding a type from callers', 'Factories, parsers, anything decided by input'],
              ],
            } },
            { tip: "Three spellings, three meanings. `fn f(shape: impl Shape)` is a generic function: the caller picks the type. `fn f() -> impl Shape` returns one type that the function picks and keeps to itself. `dyn Shape`, behind a pointer, is any type at all, settled while the program runs." },
          ],
        },
      ],
      takeaways: [
        "`dyn Trait` stands for any value whose type implements the trait. It has no size of its own, so it lives behind a pointer: `&dyn Trait`, `&mut dyn Trait` or `Box<dyn Trait>`.",
        "That pointer is two words: the address of the value, and the address of a vtable holding the type's size, its destructor and its methods. A call through it is looked up while the program runs.",
        "Generics are static dispatch: a copy per type, direct calls, one type per collection. Trait objects are dynamic dispatch: one copy, indirect calls, mixed collections. Start with generics.",
        "Use an enum for a closed set of cases that you own, and a trait for a set that other code must be able to extend.",
        "A trait is dyn compatible only if every method can be called without knowing the type: no `Self` in the return type or the parameters, and no generic methods, unless the method is marked `where Self: Sized`.",
        "There is no inheritance. Share data by putting a struct inside a struct, share behavior with default methods and supertraits, and substitute one type for another through a trait.",
        "`-> impl Trait` returns one concrete type without naming it. `-> Box<dyn Trait>` returns whichever type the run decides on.",
      ],
      quiz: [
        {
          q: 'What does this program print? It is built for a 64-bit machine.',
          code: rs`use std::mem::size_of;

trait Shape {
    fn area(&self) -> f64;
}

struct Square(f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn main() {
    let square = Square(3.0);
    let shape: &dyn Shape = &square;
    println!("{} {}", shape.area(), size_of::<&dyn Shape>());
}`,
          options: [
            { t: '`9 16`', ok: true, why: "A `&dyn Shape` is a fat pointer: 8 bytes for the address of the value and 8 for the address of the vtable." },
            { t: '`9 8`', why: "That is the size of a `&Square`. C++ and Java keep the pointer to the method table inside each object, so a reference there is one word. Rust keeps it in the reference, which is why a `Square` itself is just its 8 bytes of data." },
            { t: '`9 24`', why: "That adds the 8 bytes of the square to the pointer. A reference never contains the value it points to." },
            { t: 'It cannot be known until the program runs, because it depends on the type behind the reference', why: "What varies is the size of the value behind the pointer. The pointer is 16 bytes whatever it points to, and that fixed size is the reason a `dyn Shape` is always kept behind one." },
          ],
          verify: true,
        },
        {
          kind: 'multi',
          q: '`Shape` is a trait with a method `area`, and `Square` implements it. In which of these functions is the call to `area` found through a vtable while the program runs?',
          options: [
            { t: '`fn f(s: &dyn Shape) -> f64 { s.area() }`', ok: true, why: "A `&dyn Shape` is a fat pointer, and the call reads the address of `area` from its vtable." },
            { t: '`fn f(all: &[Box<dyn Shape>]) -> f64 { all[0].area() }`', ok: true, why: "Each box is a fat pointer. What the first element is cannot be known before the program runs." },
            { t: '`fn f<T: Shape>(s: &T) -> f64 { s.area() }`', why: "A generic function is compiled once for each type, and each copy calls that type's `area` directly." },
            { t: '`fn f(s: &impl Shape) -> f64 { s.area() }`', why: "`impl Shape` in a parameter is a generic without a name. It is dispatched statically, exactly like `T: Shape`." },
            { t: '`fn f(s: &Square) -> f64 { s.area() }`', why: "The type is known exactly, so this is a direct call to `Square::area`. Implementing a trait does not make a type's methods virtual, as declaring them in a Java interface would." },
          ],
          hint: "Dynamic dispatch happens only where the type says `dyn`.",
        },
        {
          q: 'You are writing a JSON parser. A parsed value is null, a boolean, a number, a string, an array of values, or an object. How should the type of a value be modeled?',
          options: [
            { t: 'An enum with one variant for each kind of value', ok: true, why: "The JSON specification fixes the six kinds, and they will not change. With an enum, every function that handles a value can `match` on all six with the compiler checking that none is missed, and small values are stored inline." },
            { t: 'A trait `JsonValue` implemented by six structs and held as `Box<dyn JsonValue>`', why: "This is the class hierarchy you would write in PHP or Java. It keeps the set of kinds open, which nobody needs here, and it limits what code can do with a value to the methods of the trait, with no way to match on what kind it is." },
            { t: 'A generic `Value<T>`, so that each kind is its own type', why: "A generic type is fixed when the program is compiled. What a document holds is known only once it has been read." },
            { t: 'A struct with six `Option` fields, of which one is `Some`', why: "That type can also hold a value with two fields set, or none, and every function has to rule those out by hand. An enum makes them impossible to build." },
          ],
        },
        {
          q: 'A text editor is published as a library, and its users add their own commands. A command has a name and a `run` method. The people writing commands work in other crates, which the library never sees. How should the editor hold its list of commands?',
          options: [
            { t: 'As a `Vec<Box<dyn Command>>`, where `Command` is a trait', ok: true, why: "The set is open: code written later, somewhere else, has to be able to add to it. Anyone can implement a trait for a type of their own, and a list of trait objects holds them together." },
            { t: 'As a `Vec<Command>`, where `Command` is an enum with a variant for each command', why: "Only the crate that defines an enum can add a variant to it. Users would have to edit the library's source to add a command." },
            { t: 'As a `Vec<T>` with the bound `T: Command`', why: "A `Vec<T>` holds one type. It could hold many copies of one user's command, and never two different commands." },
            { t: 'As a list of the users\' own structs. Anything with a `run` method can be called', why: "That is duck typing, as in Python. A `Vec` needs one element type, and Rust calls a method only where the type, or a trait it implements, promises that the method exists." },
          ],
        },
        {
          q: 'An interpreter has an `Expr` type with five kinds of node: number, variable, sum, product and negation. The grammar is settled. What keeps growing is the list of things done to a tree: evaluate it, print it, simplify it, count its nodes, and a new pass most months. Enum or trait?',
          options: [
            { t: 'An enum, with each pass written as a function that matches on it', ok: true, why: "The kinds are fixed and the operations grow. With an enum a new pass is one new function, and no existing code changes. Lesson 12 built its `Expr` this way." },
            { t: 'A trait `Expr` with one method for each pass, implemented by five structs', why: "Then each new pass means adding a method to the trait and writing it in all five `impl` blocks. A trait makes new types cheap and new operations expensive, which is the wrong way round for this program." },
            { t: 'A trait, because a tree needs `Box` for its children anyway, so `Box<dyn Expr>` costs nothing extra', why: "A recursive enum does keep its children in boxes, as lesson 12 showed, but those are plain one-word pointers. A `Box<dyn Expr>` adds a vtable pointer and gives up `match`." },
            { t: 'It makes no difference, because both compile to the same thing', why: "They differ in the running program. An enum is a tag and a payload, taken apart with `match`. A trait object is a pointer and a vtable, and what it points to can no longer be inspected." },
          ],
        },
        {
          q: 'Does this program compile?',
          code: rs`trait Shape {
    fn area(&self) -> f64;

    fn fits_inside<T: Shape>(&self, other: &T) -> bool {
        self.area() <= other.area()
    }
}

struct Square(f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn main() {
    let small = Square(1.0);
    let large = Square(3.0);
    let shape: &dyn Shape = &small;
    println!("{}", shape.fits_inside(&large));
}`,
          options: [
            { t: 'No: `fits_inside` has a type parameter, so `Shape` cannot be used with `dyn`', ok: true, why: "A generic method is compiled separately for each `T`, and a vtable has a fixed list of entries. The compiler reports `E0038` at `&dyn Shape`. Calling `small.fits_inside(&large)` on the `Square` itself would be fine." },
            { t: 'Yes, and it prints `true`', why: "It would if `shape` were a `&Square`. Making a `&dyn Shape` is what needs a vtable, and this trait cannot have one." },
            { t: 'No: a method with a default body cannot be called through a trait object', why: "It can. A default method gets a table entry for each type like any other method. The trouble is the type parameter `T`." },
            { t: 'No: `&small` is a `&Square`, and a `&dyn Shape` was expected', why: "That conversion is made for you wherever a `&dyn Shape` is expected, as long as the trait is dyn compatible. This one is not." },
          ],
          verify: 'E0038',
        },
        {
          q: 'The same program, with one change: `fits_inside` now takes `other: &dyn Shape` where it had a type parameter. Does it compile?',
          code: rs`trait Shape {
    fn area(&self) -> f64;

    fn fits_inside(&self, other: &dyn Shape) -> bool {
        self.area() <= other.area()
    }
}

struct Square(f64);

impl Shape for Square {
    fn area(&self) -> f64 {
        self.0 * self.0
    }
}

fn main() {
    let small = Square(1.0);
    let large = Square(3.0);
    let shape: &dyn Shape = &small;
    println!("{}", shape.fits_inside(&large));
}`,
          options: [
            { t: 'Yes, and it prints `true`', ok: true, why: "No method has a type parameter or mentions `Self` outside its receiver, so the trait is dyn compatible. `&large` becomes a `&dyn Shape` at the call, and the comparison makes two calls through vtables." },
            { t: 'No: a trait cannot mention `dyn Shape` inside its own definition', why: "It can. `dyn Shape` is an ordinary type that may appear anywhere behind a pointer, including in the trait's own methods." },
            { t: 'No: `&large` is a `&Square`, not a `&dyn Shape`', why: "A reference to a type that implements the trait converts to a reference to the trait object wherever one is expected, and a function argument is such a place." },
            { t: 'Yes, but it panics, because `small` is on the stack and a trait object must be in a `Box`', why: "A trait object needs a pointer, and any pointer will do. A `&dyn Shape` borrows a value wherever it lives, and the heap is not involved." },
          ],
          verify: 'compiles',
        },
      ],
      challenges: [
        {
          id: 'total-area',
          title: 'The area of a mixed list',
          level: 'warm-up',
          prompt: [
            "Add up the areas of a list of shapes. The list holds `Box<dyn Shape>`, so its elements can be circles, rectangles, or types that this function has never heard of.",
          ],
          signature: 'fn total_area(shapes: &[Box<dyn Shape>]) -> f64',
          prelude: rs`trait Shape {
    fn area(&self) -> f64;
}

struct Circle {
    radius: f64,
}

struct Rect {
    width: f64,
    height: f64,
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        std::f64::consts::PI * self.radius * self.radius
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.width * self.height
    }
}`,
          starter: rs`fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    // Each element is a box that owns some shape.
    0.0
}`,
          hints: [
            "Walk the slice with `for shape in shapes`. Each `shape` is a `&Box<dyn Shape>`.",
            "Call `shape.area()` on it. The method call looks through the reference and the box, and the vtable finds the right `area`.",
            "`let mut sum = 0.0; for shape in shapes { sum += shape.area(); } sum`",
          ],
          solution: rs`fn total_area(shapes: &[Box<dyn Shape>]) -> f64 {
    let mut sum = 0.0;
    for shape in shapes {
        sum += shape.area();
    }
    sum
}`,
          tests: [
            { label: 'Rectangles only', body: rs`let shapes: Vec<Box<dyn Shape>> = vec![
    Box::new(Rect { width: 1.0, height: 1.0 }),
    Box::new(Rect { width: 2.0, height: 2.0 }),
    Box::new(Rect { width: 3.0, height: 3.0 }),
];
assert_eq!(total_area(&shapes), 14.0);` },
            { label: 'A circle and a rectangle in one list', body: rs`let shapes: Vec<Box<dyn Shape>> = vec![
    Box::new(Rect { width: 2.0, height: 3.0 }),
    Box::new(Circle { radius: 1.0 }),
];
let expected = 6.0 + std::f64::consts::PI;
assert!((total_area(&shapes) - expected).abs() < 1e-9, "expected about 9.14");` },
            { label: 'An empty list has no area', body: rs`let shapes: Vec<Box<dyn Shape>> = Vec::new();
assert_eq!(total_area(&shapes), 0.0);` },
            { label: 'A type the function has never heard of', body: rs`struct Triangle {
    base: f64,
    height: f64,
}
impl Shape for Triangle {
    fn area(&self) -> f64 {
        self.base * self.height / 2.0
    }
}
let shapes: Vec<Box<dyn Shape>> = vec![
    Box::new(Triangle { base: 4.0, height: 5.0 }),
    Box::new(Rect { width: 2.0, height: 3.0 }),
];
assert_eq!(total_area(&shapes), 16.0);` },
          ],
        },
        {
          id: 'shape-factory',
          title: 'A shape from a description',
          level: 'core',
          prompt: [
            "Shapes arrive as text from a file: a kind, and then its measurements. Build the shape that a description asks for.",
            { list: [
              "`\"circle\"` takes one number, the radius.",
              "`\"square\"` takes one number, the side.",
              "`\"rect\"` takes two numbers, the width and then the height.",
            ] },
            "Return `None` for a kind you do not know, and for a known kind with the wrong number of measurements. The branches of your function build three different types, so the return type cannot be `impl Shape`.",
          ],
          signature: 'fn make_shape(kind: &str, sizes: &[f64]) -> Option<Box<dyn Shape>>',
          prelude: rs`trait Shape {
    fn name(&self) -> String;
    fn area(&self) -> f64;
}

struct Circle {
    radius: f64,
}

struct Square {
    side: f64,
}

struct Rect {
    width: f64,
    height: f64,
}

impl Shape for Circle {
    fn name(&self) -> String {
        String::from("circle")
    }

    fn area(&self) -> f64 {
        std::f64::consts::PI * self.radius * self.radius
    }
}

impl Shape for Square {
    fn name(&self) -> String {
        String::from("square")
    }

    fn area(&self) -> f64 {
        self.side * self.side
    }
}

impl Shape for Rect {
    fn name(&self) -> String {
        String::from("rect")
    }

    fn area(&self) -> f64 {
        self.width * self.height
    }
}`,
          starter: rs`fn make_shape(kind: &str, sizes: &[f64]) -> Option<Box<dyn Shape>> {
    // Circles only so far, and nothing checks how many sizes there are.
    if kind == "circle" {
        Some(Box::new(Circle { radius: sizes[0] }))
    } else {
        None
    }
}`,
          hints: [
            "Each branch builds a different struct. Wrap each one in `Box::new(…)` and then in `Some(…)`. The return type is written out, so a `Box<Circle>` or a `Box<Rect>` is converted to a `Box<dyn Shape>` for you.",
            "Check the number of sizes before you index: `sizes.len() == 1`. Or match on the slice itself with the slice patterns of lesson 8. `[radius]` matches a slice of exactly one element.",
            "`match (kind, sizes) { (\"circle\", [radius]) => Some(Box::new(Circle { radius: *radius })), … , _ => None }`, with one arm for each kind.",
          ],
          solution: rs`fn make_shape(kind: &str, sizes: &[f64]) -> Option<Box<dyn Shape>> {
    match (kind, sizes) {
        ("circle", [radius]) => Some(Box::new(Circle { radius: *radius })),
        ("square", [side]) => Some(Box::new(Square { side: *side })),
        ("rect", [width, height]) => Some(Box::new(Rect { width: *width, height: *height })),
        _ => None,
    }
}`,
          tests: [
            { label: 'A circle from one number', body: rs`let shape = make_shape("circle", &[2.0]).expect("a circle");
assert_eq!(shape.name(), "circle");
assert!((shape.area() - 4.0 * std::f64::consts::PI).abs() < 1e-9, "a circle of radius 2 has an area of about 12.57");` },
            { label: 'A square from one number', body: rs`let shape = make_shape("square", &[3.0]).expect("a square");
assert_eq!(shape.name(), "square");
assert_eq!(shape.area(), 9.0);` },
            { label: 'A rectangle from two numbers', body: rs`let shape = make_shape("rect", &[2.0, 4.5]).expect("a rectangle");
assert_eq!(shape.name(), "rect");
assert_eq!(shape.area(), 9.0);` },
            { label: 'An unknown kind gives None', body: rs`assert!(make_shape("hexagon", &[1.0]).is_none());
assert!(make_shape("", &[]).is_none());` },
            { label: 'The wrong number of sizes gives None', body: rs`assert!(make_shape("circle", &[]).is_none(), "a circle needs a radius");
assert!(make_shape("circle", &[1.0, 2.0]).is_none(), "a circle takes one number only");
assert!(make_shape("square", &[1.0, 2.0]).is_none(), "a square takes one number only");
assert!(make_shape("rect", &[5.0]).is_none(), "a rectangle needs two numbers");
assert!(make_shape("rect", &[1.0, 2.0, 3.0]).is_none(), "a rectangle takes two numbers only");` },
            { label: 'Shapes of different types go into one list', body: rs`let mut shapes: Vec<Box<dyn Shape>> = Vec::new();
for (kind, sizes) in [("square", vec![1.0]), ("blob", vec![1.0]), ("rect", vec![2.0, 3.0]), ("square", vec![2.0])] {
    if let Some(shape) = make_shape(kind, &sizes) {
        shapes.push(shape);
    }
}
let mut names = Vec::new();
let mut total = 0.0;
for shape in &shapes {
    names.push(shape.name());
    total += shape.area();
}
assert_eq!(names, ["square", "rect", "square"]);
assert_eq!(total, 11.0);` },
          ],
        },
        {
          id: 'transform-pipeline',
          title: 'A pipeline of text transforms',
          level: 'core',
          prompt: [
            "A `Transform` turns one piece of text into another. Three small transforms and a `Pipeline` are declared for you. Write the five `impl` blocks.",
            { list: [
              "`Trim` removes the white space at both ends. `Upper` converts to upper case. `Replace` replaces every occurrence of `from` with `to`.",
              "`Pipeline::new()` makes an empty pipeline, and `then` adds a step to the end and returns the pipeline, so calls can be chained.",
              "A `Pipeline` is itself a `Transform`. Its `apply` runs the input through every step in the order the steps were added. An empty pipeline returns its input unchanged.",
            ] },
            "The steps are stored as `Box<dyn Transform>`, so a pipeline can hold transforms that are written later, including other pipelines.",
          ],
          signature: 'impl Transform for Trim\nimpl Transform for Upper\nimpl Transform for Replace\nimpl Pipeline {\n    fn new() -> Self\n    fn then(self, step: Box<dyn Transform>) -> Self\n}\nimpl Transform for Pipeline',
          prelude: rs`trait Transform {
    fn apply(&self, input: &str) -> String;
}

struct Trim;

struct Upper;

struct Replace {
    from: String,
    to: String,
}

struct Pipeline {
    steps: Vec<Box<dyn Transform>>,
}`,
          starter: rs`impl Transform for Trim {
    fn apply(&self, input: &str) -> String {
        input.to_string()
    }
}

impl Transform for Upper {
    fn apply(&self, input: &str) -> String {
        input.to_string()
    }
}

impl Transform for Replace {
    fn apply(&self, input: &str) -> String {
        input.to_string()
    }
}

impl Pipeline {
    fn new() -> Self {
        Pipeline { steps: Vec::new() }
    }

    fn then(self, step: Box<dyn Transform>) -> Self {
        // Add the step before handing the pipeline back.
        self
    }
}

impl Transform for Pipeline {
    fn apply(&self, input: &str) -> String {
        input.to_string()
    }
}`,
          hints: [
            "The three small types are one line each: `input.trim().to_string()`, `input.to_uppercase()` and `input.replace(&self.from, &self.to)`.",
            "`then` takes `self` by value, so it may change it and hand it back. Declare the parameter as `mut self`, push the step onto `self.steps`, and return `self`.",
            "In the pipeline's `apply`, keep the text so far in a `String` and feed it to each step: `let mut text = input.to_string(); for step in &self.steps { text = step.apply(&text); } text`.",
          ],
          solution: rs`impl Transform for Trim {
    fn apply(&self, input: &str) -> String {
        input.trim().to_string()
    }
}

impl Transform for Upper {
    fn apply(&self, input: &str) -> String {
        input.to_uppercase()
    }
}

impl Transform for Replace {
    fn apply(&self, input: &str) -> String {
        input.replace(&self.from, &self.to)
    }
}

impl Pipeline {
    fn new() -> Self {
        Pipeline { steps: Vec::new() }
    }

    fn then(mut self, step: Box<dyn Transform>) -> Self {
        self.steps.push(step);
        self
    }
}

impl Transform for Pipeline {
    fn apply(&self, input: &str) -> String {
        let mut text = input.to_string();
        for step in &self.steps {
            text = step.apply(&text);
        }
        text
    }
}`,
          tests: [
            { label: 'Each small transform works by itself', body: rs`assert_eq!(Trim.apply("  hi there  "), "hi there");
assert_eq!(Upper.apply("hi"), "HI");
let dashes = Replace { from: String::from("-"), to: String::from(" ") };
assert_eq!(dashes.apply("a-b-c"), "a b c");` },
            { label: 'An empty pipeline returns its input unchanged', body: rs`assert_eq!(Pipeline::new().apply(" as is "), " as is ");` },
            { label: 'Steps run in the order they were added', body: rs`let trim_first = Pipeline::new()
    .then(Box::new(Trim))
    .then(Box::new(Replace { from: String::from(" "), to: String::from("-") }));
assert_eq!(trim_first.apply(" a b "), "a-b");

let trim_last = Pipeline::new()
    .then(Box::new(Replace { from: String::from(" "), to: String::from("-") }))
    .then(Box::new(Trim));
assert_eq!(trim_last.apply(" a b "), "-a-b-");` },
            { label: 'Takes a transform it has never heard of', body: rs`struct Exclaim;
impl Transform for Exclaim {
    fn apply(&self, input: &str) -> String {
        format!("{input}!")
    }
}
let shout = Pipeline::new().then(Box::new(Upper)).then(Box::new(Exclaim));
assert_eq!(shout.apply("hey"), "HEY!");` },
            { label: 'A pipeline is a Transform, so pipelines nest', body: rs`let clean = Pipeline::new().then(Box::new(Trim)).then(Box::new(Upper));
let outer = Pipeline::new()
    .then(Box::new(clean))
    .then(Box::new(Replace { from: String::from("A"), to: String::from("4") }));
let as_object: &dyn Transform = &outer;
assert_eq!(as_object.apply("  banana "), "B4N4N4");` },
          ],
        },
        {
          id: 'enum-instead',
          title: 'An enum instead',
          level: 'core',
          track: true,
          forbid: ['dyn', 'Box'],
          broken: 'compile',
          prompt: [
            "This code was written with trait objects, and it works. A profile shows that most of its time goes into the allocator: every shape is a heap block of its own, and `scale_all` makes another block for every shape it scales. There are three kinds of shape and there will not be a fourth, so nothing here needs an open set.",
            "Rewrite it around an enum. `Shape` becomes an `enum` with the three variants shown in the signature. `area` and `scaled` become methods on it that `match`, and `scale_all` returns a `Vec<Shape>`. What the functions compute stays the same.",
            "`dyn` and `Box` are not allowed here, so the code is rejected as it stands. The tests count allocations: `scale_all` must make exactly one, however many shapes it is given.",
          ],
          signature: 'enum Shape {\n    Circle { radius: f64 },\n    Rect { width: f64, height: f64 },\n    Triangle { base: f64, height: f64 },\n}\nimpl Shape {\n    fn area(&self) -> f64\n    fn scaled(&self, factor: f64) -> Shape\n}\nfn scale_all(shapes: &[Shape], factor: f64) -> Vec<Shape>',
          starter: rs`use std::f64::consts::PI;

trait Shape {
    fn area(&self) -> f64;
    fn scaled(&self, factor: f64) -> Box<dyn Shape>;
}

struct Circle {
    radius: f64,
}

struct Rect {
    width: f64,
    height: f64,
}

struct Triangle {
    base: f64,
    height: f64,
}

impl Shape for Circle {
    fn area(&self) -> f64 {
        PI * self.radius * self.radius
    }

    fn scaled(&self, factor: f64) -> Box<dyn Shape> {
        Box::new(Circle { radius: self.radius * factor })
    }
}

impl Shape for Rect {
    fn area(&self) -> f64 {
        self.width * self.height
    }

    fn scaled(&self, factor: f64) -> Box<dyn Shape> {
        Box::new(Rect { width: self.width * factor, height: self.height * factor })
    }
}

impl Shape for Triangle {
    fn area(&self) -> f64 {
        self.base * self.height / 2.0
    }

    fn scaled(&self, factor: f64) -> Box<dyn Shape> {
        Box::new(Triangle { base: self.base * factor, height: self.height * factor })
    }
}

fn scale_all(shapes: &[Box<dyn Shape>], factor: f64) -> Vec<Box<dyn Shape>> {
    let mut scaled = Vec::new();
    for shape in shapes {
        scaled.push(shape.scaled(factor));
    }
    scaled
}`,
          hints: [
            "Start with the type: `enum Shape { Circle { radius: f64 }, Rect { width: f64, height: f64 }, Triangle { base: f64, height: f64 } }`. The trait and the three structs go away.",
            "`area` and `scaled` move into one `impl Shape` block, and each becomes a `match self { … }` with an arm for each variant. `scaled` returns a plain value such as `Shape::Circle { radius: radius * factor }`, with no box around it.",
            "A vector that grows as you push may allocate several times. Reserve the room first with `Vec::with_capacity(shapes.len())`, and `scale_all` makes one allocation for any number of shapes.",
          ],
          solution: rs`use std::f64::consts::PI;

enum Shape {
    Circle { radius: f64 },
    Rect { width: f64, height: f64 },
    Triangle { base: f64, height: f64 },
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle { radius } => PI * radius * radius,
            Shape::Rect { width, height } => width * height,
            Shape::Triangle { base, height } => base * height / 2.0,
        }
    }

    fn scaled(&self, factor: f64) -> Shape {
        match self {
            Shape::Circle { radius } => Shape::Circle { radius: radius * factor },
            Shape::Rect { width, height } => Shape::Rect { width: width * factor, height: height * factor },
            Shape::Triangle { base, height } => Shape::Triangle { base: base * factor, height: height * factor },
        }
    }
}

fn scale_all(shapes: &[Shape], factor: f64) -> Vec<Shape> {
    let mut scaled = Vec::with_capacity(shapes.len());
    for shape in shapes {
        scaled.push(shape.scaled(factor));
    }
    scaled
}`,
          tests: [
            { label: 'Each variant computes its own area', body: rs`assert_eq!(Shape::Rect { width: 2.0, height: 3.0 }.area(), 6.0);
assert_eq!(Shape::Triangle { base: 4.0, height: 5.0 }.area(), 10.0);
let circle = Shape::Circle { radius: 1.0 };
assert!((circle.area() - std::f64::consts::PI).abs() < 1e-9, "a circle of radius 1 has an area of about 3.14");` },
            { label: 'scaled multiplies every measurement and keeps the kind', body: rs`match (Shape::Rect { width: 2.0, height: 3.0 }).scaled(2.0) {
    Shape::Rect { width, height } => {
        assert_eq!(width, 4.0);
        assert_eq!(height, 6.0);
    }
    _ => panic!("a scaled Rect should still be a Rect"),
}
assert_eq!(Shape::Triangle { base: 4.0, height: 5.0 }.scaled(0.5).area(), 2.5);
assert!(matches!(Shape::Circle { radius: 1.0 }.scaled(3.0), Shape::Circle { radius } if radius == 3.0));` },
            { label: 'A list of shapes is one heap block, and a shape by itself is none', body: rs`let alone = Shape::Circle { radius: 1.0 };
assert_eq!(allocation_count(), 0, "an enum value is stored inline");
let shapes = vec![alone, Shape::Rect { width: 2.0, height: 3.0 }, Shape::Triangle { base: 4.0, height: 5.0 }];
assert_eq!(allocation_count(), 1, "the buffer of the Vec should be the only allocation");
assert_eq!(shapes.len(), 3);` },
            { label: 'scale_all makes one allocation for six shapes', body: rs`let shapes = vec![
    Shape::Circle { radius: 1.0 },
    Shape::Rect { width: 2.0, height: 3.0 },
    Shape::Triangle { base: 4.0, height: 5.0 },
    Shape::Rect { width: 1.0, height: 1.0 },
    Shape::Rect { width: 5.0, height: 2.0 },
    Shape::Triangle { base: 2.0, height: 2.0 },
];
let before = allocation_count();
let bigger = scale_all(&shapes, 3.0);
assert_eq!(allocation_count() - before, 1, "reserve room for every shape up front, and allocate nothing for each shape");
assert_eq!(bigger.len(), 6);
assert_eq!(bigger[1].area(), 54.0);
assert_eq!(bigger[5].area(), 18.0);
assert_eq!(shapes[1].area(), 6.0, "the originals are left as they were");` },
            { label: 'Scaling an empty list allocates nothing', body: rs`let nothing: Vec<Shape> = Vec::new();
let scaled = scale_all(&nothing, 2.0);
assert!(scaled.is_empty());
assert_eq!(allocation_count(), 0);` },
          ],
        },
        {
          id: 'logger-fanout',
          title: 'One log line, many destinations',
          level: 'stretch',
          broken: 'compile',
          prompt: [
            "A `Logger` writes lines somewhere. `Memory`, declared for you, keeps them in a vector, so that the tests can read them back. `Fanout`, also declared for you, borrows any number of loggers and is meant to pass every line to all of them. Both already implement `Named`.",
            "The starter has a `Logger` trait that works for `Memory`, with two weaknesses. Every logger has to write its own `log`, and a logger has no name unless you know its concrete type. Fix both, and make `Fanout` a logger:",
            { list: [
              "Make `Named` a supertrait of `Logger`.",
              "Give `log` a default body in the trait. It builds the line `[name] level: message` from `self.name()` and hands it to `self.write`. For a `Memory` labeled `disk`, `log(\"warn\", \"almost full\")` writes `[disk] warn: almost full`.",
              "Implement `Logger` for `Fanout` by writing `write` alone: it passes the line to every target, in the order they were added.",
            ] },
            "The tests define a logger of their own that has only `write`, and they call `name` on a `&dyn Logger`. So they do not compile until `log` has a default and `Named` is a supertrait.",
          ],
          signature: 'trait Logger: Named {\n    fn write(&mut self, line: &str);\n    fn log(&mut self, level: &str, message: &str) { … }\n}\nimpl Logger for Memory\nimpl Logger for Fanout<\'_>',
          prelude: rs`trait Named {
    fn name(&self) -> String;
}

struct Memory {
    label: String,
    lines: Vec<String>,
}

impl Named for Memory {
    fn name(&self) -> String {
        self.label.clone()
    }
}

// Borrows its targets, so whoever owns them can read them afterward.
struct Fanout<'a> {
    targets: Vec<&'a mut dyn Logger>,
}

impl<'a> Fanout<'a> {
    fn new() -> Self {
        Fanout { targets: Vec::new() }
    }

    fn add(&mut self, target: &'a mut dyn Logger) {
        self.targets.push(target);
    }
}

impl Named for Fanout<'_> {
    fn name(&self) -> String {
        String::from("fanout")
    }
}`,
          starter: rs`trait Logger {
    fn write(&mut self, line: &str);
    fn log(&mut self, level: &str, message: &str);
}

impl Logger for Memory {
    fn write(&mut self, line: &str) {
        self.lines.push(line.to_string());
    }

    fn log(&mut self, level: &str, message: &str) {
        let line = format!("[{}] {level}: {message}", self.label);
        self.write(&line);
    }
}

// impl Logger for Fanout<'_> { … }`,
          hints: [
            "`trait Logger: Named { … }` makes `Named` a supertrait. Inside the trait, and on any `dyn Logger`, `self.name()` is then available.",
            "Move the body of `log` into the trait, with `self.name()` where it had `self.label`, and delete `log` from the `impl` block for `Memory`. A default method may call `name` and `write` although the trait does not know yet how either is done.",
            "`impl Logger for Fanout<'_> { fn write(&mut self, line: &str) { for target in &mut self.targets { target.write(line); } } }`. It needs no `log`: the default builds the line once, with the fanout's own name, and calls this `write`.",
          ],
          solution: rs`trait Logger: Named {
    fn write(&mut self, line: &str);

    fn log(&mut self, level: &str, message: &str) {
        let line = format!("[{}] {level}: {message}", self.name());
        self.write(&line);
    }
}

impl Logger for Memory {
    fn write(&mut self, line: &str) {
        self.lines.push(line.to_string());
    }
}

impl Logger for Fanout<'_> {
    fn write(&mut self, line: &str) {
        for target in &mut self.targets {
            target.write(line);
        }
    }
}`,
          tests: [
            { label: 'A logger stamps each line with its own name', body: rs`let mut disk = Memory { label: String::from("disk"), lines: Vec::new() };
disk.log("warn", "almost full");
disk.log("info", "cleaned up");
assert_eq!(disk.lines, ["[disk] warn: almost full", "[disk] info: cleaned up"]);` },
            { label: 'A logger that writes only `write` gets `log` from the trait', body: rs`struct Last {
    line: String,
    count: u32,
}
impl Named for Last {
    fn name(&self) -> String {
        String::from("last")
    }
}
impl Logger for Last {
    fn write(&mut self, line: &str) {
        self.line = line.to_string();
        self.count += 1;
    }
}
let mut last = Last { line: String::new(), count: 0 };
last.log("debug", "one");
last.log("debug", "two");
assert_eq!(last.line, "[last] debug: two");
assert_eq!(last.count, 2);` },
            { label: 'The name is reachable through a `&dyn Logger`', body: rs`fn name_of(logger: &dyn Logger) -> String {
    logger.name()
}
let disk = Memory { label: String::from("disk"), lines: Vec::new() };
assert_eq!(name_of(&disk), "disk");
assert_eq!(name_of(&Fanout::new()), "fanout");` },
            { label: 'A fanout passes each line to every target, in order', body: rs`let mut a = Memory { label: String::from("a"), lines: Vec::new() };
let mut b = Memory { label: String::from("b"), lines: Vec::new() };
let mut fanout = Fanout::new();
fanout.add(&mut a);
fanout.add(&mut b);
fanout.write("a raw line");
fanout.log("error", "disk full");
assert_eq!(a.lines, ["a raw line", "[fanout] error: disk full"]);
assert_eq!(b.lines, a.lines);` },
            { label: 'Fanouts nest, because a fanout is a logger', body: rs`let mut a = Memory { label: String::from("a"), lines: Vec::new() };
let mut b = Memory { label: String::from("b"), lines: Vec::new() };
let mut inner = Fanout::new();
inner.add(&mut a);
let mut outer = Fanout::new();
outer.add(&mut inner);
outer.add(&mut b);
outer.log("info", "hello");
assert_eq!(a.lines, ["[fanout] info: hello"]);
assert_eq!(b.lines, ["[fanout] info: hello"]);` },
          ],
        },
      ],
    },

    {
      id: 'closures',
      title: 'Closures',
      category: part,
      minutes: 35,
      summary: 'Functions written inline that can use the variables around them. How a closure borrows or takes what it uses, what move changes, and the three traits that say how a closure may be called.',
      topics: ['Closure syntax', 'Captures', 'move', 'Fn, FnMut, FnOnce', 'Closures as parameters', 'Returning closures', 'Box<dyn Fn>'],
      sections: [
        {
          title: 'Functions you can write inline',
          body: [
            "You have been handing closures to methods since lesson 13: `map(|x| x + 1)`, `unwrap_or_else(|| 0)`, `sort_by_key(|word| word.len())`. A **closure** is a function written as an expression, at the place where it is needed. Its parameters go between two vertical bars and its body follows.",
            { run: rs`fn main() {
    let add_one = |x| x + 1;                        // one parameter, and a body of one expression
    let area = |width: u32, height: u32| -> u32 {   // types written out, and a block for a body
        width * height
    };
    let greet = || println!("hello");               // no parameters

    println!("{} {}", add_one(41), area(3, 4));
    greet();

    let doubled = Some(21).map(|n| n * 2);          // handed straight to a method
    println!("{doubled:?}");
}`, name: 'syntax.rs', expect: '42 12\nhello\nSome(42)\n' },
            { list: [
              "The types of the parameters and of the result are usually left out. The compiler infers them from how the closure is used, as it does for a `let`.",
              "A body that is a single expression needs no braces.",
              "A closure is a value. It can be kept in a variable, passed to a function and returned from one.",
            ] },
            "So far that is a shorter way to write a function. The reason closures exist is the next step: a closure can use the variables of the scope it is written in. A function cannot, even one defined inside another function:",
            { run: rs`fn main() {
    let limit = 10;

    fn is_small(n: i32) -> bool {
        n < limit
    }

    println!("{}", is_small(3));
}`, name: 'inner_fn.rs', fails: 'E0434' },
            "The `help:` line names the fix. Written as a closure, the same test compiles:",
            { run: rs`fn main() {
    let limit = 10;
    let is_small = |n: i32| n < limit;      // limit comes from the scope around the closure

    println!("{} {}", is_small(3), is_small(30));
}`, name: 'capture.rs', expect: 'true false\n' },
            "The closure is said to **capture** `limit`, and the variables it captures are its **environment**. Most of this lesson is about how capturing works. In a language without a garbage collector it raises two questions that need answers before the program runs: how long must `limit` live, and who may change it while the closure exists?",
            { pitfall: [
              "A closure is not generic. The types it infers are settled by its first use, and after that they are as fixed as if you had written them:",
              { run: rs`fn main() {
    let same = |x| x;
    let n = same(5);
    let s = same("five");
    println!("{n} {s}");
}`, name: 'not_generic.rs', fails: 'E0308' },
              "For one piece of code that works on several types, write a generic `fn`, as in lesson 15.",
            ] },
            { compare: "Python has `lambda x: x + 1`, limited to one expression. JavaScript and TypeScript have arrow functions, `x => x + 1`. PHP has `fn($x) => $x + 1` and the longer `function ($x) use ($limit) { … }`. In all of them the runtime keeps a captured variable alive for as long as any closure refers to it, and frees it some time afterward. Rust has no runtime to do that. A closure either borrows what it uses, under the rules of lessons 6 and 7, or owns it." },
          ],
        },
        {
          title: 'Capturing the environment',
          body: [
            "For each variable a closure uses, the compiler picks the least demanding way to capture it that lets the body compile. There are three ways, and they are the three ways of handing a value over that you already know.",
            { table: {
              head: ['The body', 'The closure holds', 'Meanwhile, outside the closure'],
              rows: [
                ['Only reads the variable', 'A shared reference, `&T`', 'The variable can be read and cannot be changed'],
                ['Changes the variable', 'A mutable reference, `&mut T`', 'The variable cannot be used at all'],
                ['Gives the value away, or uses it up', 'The value itself', 'The variable has been moved out of'],
              ],
            } },
            { run: rs`fn main() {
    let name = String::from("Ada");
    let greet = || println!("hello, {name}");   // only reads name: holds &name
    greet();
    greet();
    println!("{name} is still here");           // reading beside a shared borrow is fine

    let mut count = 0;
    let mut bump = || count += 1;               // changes count: holds &mut count
    bump();
    bump();
    println!("count is {count}");               // bump is not used again, so its borrow is over

    let text = String::from("farewell");
    let finish = || text;                       // returns text: has to own it
    let got = finish();
    println!("{got}");
}`, name: 'modes.rs', expect: 'hello, Ada\nhello, Ada\nAda is still here\ncount is 2\nfarewell\n' },
            "You never write which of the three you want. The body decides. `println!` only reads `name`, so the first closure borrows it. `count += 1` has to write, so the second closure borrows `count` mutably. That closure is itself declared `mut`, because calling it changes what it holds. The third closure returns `text`, which gives the `String` away, so `text` moves into the closure at the moment the closure is created.",
            "The first two closures are borrowers like any other. A closure's borrows begin where it is created and end at its last use, and in between the rule of lesson 7 applies: many readers or one writer.",
            "Lesson 7 showed what that rule prevents. A `push` may move a vector's buffer, so nothing may look at the vector while something else is able to push to it. A closure that pushes is such a writer for as long as it may still be called:",
            { run: rs`fn main() {
    let mut log = Vec::new();
    let mut record = |line: &str| log.push(line.to_string());

    record("start");
    println!("{} lines so far", log.len());
    record("end");
}`, name: 'held.rs', fails: 'E0502' },
            { borrows: {
              title: '`record` holds `log` mutably from where it is created to its last call',
              code: rs`fn main() {
    let mut log = Vec::new();
    let mut record = |line: &str| log.push(line.to_string());

    record("start");
    println!("{} lines so far", log.len());
    record("end");
}`,
              spans: [
                { name: 'log', kind: 'owner', from: 2, to: 7 },
                { name: 'record', kind: 'mut', from: 3, to: 7 },
                { name: 'log.len()', kind: 'shared', from: 6, to: 6 },
              ],
              marks: [{ line: 6, label: '`log.len()` reads `log`, and the closure `record` borrows it mutably from line 3 to line 7.' }],
              caption: "The closure is not running on line 6. It still holds its `&mut log`, because line 7 will call it again. The borrow belongs to the closure value, not to a call.",
            } },
            "There are three standard ways out.",
            { steps: [
              "**Finish with the closure first.** Its borrow ends at its last call. If nothing touches the vector between the calls, nothing conflicts.",
              "**Pass the data in.** A closure borrows only what it captures. If it receives the vector as a parameter, it captures nothing, and each call borrows the vector for the length of that call.",
              "**Return the value.** Often the closure has no need to write anywhere. Let it compute a result and return it, and let the caller store it.",
            ] },
            "The first fix moves one line:",
            { run: rs`fn main() {
    let mut log = Vec::new();
    let mut record = |line: &str| log.push(line.to_string());

    record("start");
    record("end");                              // the last use of record: its borrow ends here
    println!("{} lines", log.len());
}`, name: 'finish_first.rs', expect: '2 lines\n' },
            "The second keeps the lines in their order and changes what the closure captures:",
            { run: rs`fn main() {
    let mut log = Vec::new();
    let record = |log: &mut Vec<String>, line: &str| log.push(line.to_string());

    record(&mut log, "start");                  // log is lent for this call only
    println!("{} lines so far", log.len());
    record(&mut log, "end");
    println!("{log:?}");
}`, name: 'pass_it_in.rs', expect: '1 lines so far\n["start", "end"]\n' },
            "This `record` captures nothing, so it holds no borrow between calls. It does not even need to be `mut`.",
            { compare: "PHP makes you choose: `function () use ($count)` copies the value in when the closure is created, and `use (&$count)` shares the variable. Python and JavaScript always share the variable itself. That is the source of a well-known surprise, where closures made in a loop all see the last value of the loop variable. In Rust a closure that borrows a variable freezes it for everyone else. Nothing can change the variable behind the closure's back, and nothing can read it while the closure might change it. `E0502` above is that guarantee being enforced." },
          ],
        },
        {
          title: 'move closures',
          body: [
            "A closure that borrows cannot live longer than what it borrows. That is the rule of lesson 6: a reference may not outlive its owner. It bites as soon as a closure leaves the function that made it:",
            { run: rs`fn make_greeter(greeting: String) -> impl Fn(&str) -> String {
    |name| format!("{greeting}, {name}")
}

fn main() {
    let greet = make_greeter(String::from("Hello"));
    println!("{}", greet("Ada"));
}`, name: 'outlives.rs', fails: 'E0373' },
            "The return type is the `impl Trait` of lesson 16: some type that can be called with a `&str` and returns a `String`. Section 4 explains `Fn`. The trouble is in the body. `greeting` is a parameter of `make_greeter`, so it is dropped when `make_greeter` returns. The closure only reads it, so it captured a reference. Returning the closure would hand the caller a reference to a `String` that has just been freed. It is the dangling reference of lesson 6 with a closure wrapped around it.",
            "The `help:` line has the fix. The keyword `move` in front of a closure makes it capture **every** variable it uses by value. The closure then owns its environment and can go wherever it likes:",
            { run: rs`fn make_greeter(greeting: String) -> impl Fn(&str) -> String {
    move |name| format!("{greeting}, {name}")       // greeting now lives inside the closure
}

fn main() {
    let greet = make_greeter(String::from("Hello"));
    println!("{}", greet("Ada"));
    println!("{}", greet("Grace"));
}`, name: 'moved_in.rs', expect: 'Hello, Ada\nHello, Grace\n' },
            "`move` brings variables into the closure by the rules of lesson 5. A `String` or a `Vec` is moved, and the original variable can no longer be used. A `Copy` type such as an integer is copied, and that case holds a surprise:",
            { run: rs`fn main() {
    let mut count = 0;
    let mut next = move || {
        count += 1;             // the closure's own count, copied in when it was created
        count
    };

    println!("{} {}", next(), next());
    println!("{count}");        // main's count was never touched
}`, name: 'own_copy.rs', expect: '1 2\n0\n' },
            "The closure counts with a private copy, which lives inside the closure for as long as the closure does. From the line where the closure is created, `main`'s `count` is a different variable. A closure that keeps state of its own between calls is useful, and the `make-counter` challenge builds one. It is a bug when you expected the outer variable to change.",
            "The other place where `move` is nearly always needed is a thread. A new thread may still be running after the function that started it has returned, so its closure has to own what it uses. The reasoning is the one behind `E0373` above. Lesson 23 explains `spawn` and `join`. For now, notice the `move`:",
            { run: rs`use std::thread;

fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];

    let handle = thread::spawn(move || names.len());    // names moves into the new thread
    println!("{}", handle.join().unwrap());
}`, name: 'thread.rs', expect: '2\n' },
            { tip: [
              "`move` is all or nothing: every variable the closure uses is moved in. To move some and only borrow others, make the choice yourself on the line before. A shared reference is `Copy`, so a `move` closure that uses a reference takes a copy of the reference, and the value behind it stays where it was.",
              { run: rs`fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];
    let limit = 1;

    let borrowed = &names;                              // decide here: names is only lent
    let over_limit = move || borrowed.len() > limit;    // moves in a reference and a number

    println!("{}", over_limit());
    println!("{names:?}");                              // names is still here
}`, name: 'move_a_reference.rs', expect: 'true\n["Ada", "Grace"]\n' },
              "When the closure really needs a value of its own and you need yours too, clone it first and let the closure take the clone.",
            ] },
          ],
        },
        {
          title: 'Fn, FnMut, FnOnce',
          body: [
            "How a closure gets hold of its variables is one question. What it does with them when it is called is another, and the answer decides which of three traits the closure implements. They line up with the three method receivers of lesson 11.",
            { table: {
              head: ['Trait', 'A call takes', 'The body', 'Can be called'],
              rows: [
                ['`FnOnce`', '`self`: the closure itself', 'May use up what it captured', 'Once'],
                ['`FnMut`', '`&mut self`', 'May change what it captured, and uses nothing up', 'Any number of times, by whoever has mutable access to it'],
                ['`Fn`', '`&self`', 'Only reads what it captured, or captured nothing', 'Any number of times, through a shared reference too'],
              ],
            } },
            "The compiler implements these for each closure by looking at its body. You never write the `impl` yourself.",
            "The three are nested. A closure that only reads can certainly be called by someone who is allowed to mutate it, or by someone who means to call it only once. So every `Fn` closure is also `FnMut`, and every `FnMut` closure is also `FnOnce`. In the terms of lesson 16, `FnMut` is a supertrait of `Fn`, and `FnOnce` is a supertrait of `FnMut`.",
            { run: rs`fn needs_fn<F: Fn() -> usize>(f: F) -> usize {
    f() + f()
}

fn needs_fn_mut<F: FnMut() -> usize>(mut f: F) -> usize {
    f() + f()
}

fn needs_fn_once<F: FnOnce() -> usize>(f: F) -> usize {
    f()
}

fn main() {
    let name = String::from("Ferris");

    // Only reads name. It is Fn, and therefore FnMut and FnOnce as well.
    println!("{}", needs_fn(|| name.len()));
    println!("{}", needs_fn_mut(|| name.len()));
    println!("{}", needs_fn_once(|| name.len()));

    // Changes calls. It is FnMut and FnOnce, and not Fn.
    let mut calls = 0;
    println!("{}", needs_fn_mut(|| { calls += 1; calls }));
    println!("{}", needs_fn_once(|| { calls += 1; calls }));

    // Uses name up. It is FnOnce and nothing more.
    println!("{}", needs_fn_once(move || name.into_bytes().len()));
}`, name: 'three_traits.rs', expect: '12\n12\n6\n3\n3\n6\n' },
            "`F: Fn() -> usize` is a trait bound like those of lesson 15, with a syntax of its own: the parameter types in parentheses, then the return type. Section 5 has more of them.",
            "Two errors come out of this. A closure that is only `FnOnce` is consumed by the call, so calling it a second time is a use after a move:",
            { run: rs`fn main() {
    let name = String::from("Ada");
    let welcome = move || name + ", welcome";

    println!("{}", welcome());
    println!("{}", welcome());
}`, name: 'once.rs', fails: 'E0382' },
            "The first note says why. The `+` of lesson 9 takes its left side by value, so the body moves `name` out of the closure, and after one call the closure has nothing left to run with. The second error appears when a function asks for more than a closure can do:",
            { run: rs`fn call_twice<F: Fn() -> String>(action: F) -> String {
    format!("{} {}", action(), action())
}

fn main() {
    let name = String::from("Ada");
    let shout = move || name + "!";
    println!("{}", call_twice(shout));
}`, name: 'needs_more.rs', fails: 'E0525' },
            "`call_twice` asks for `Fn` because it calls `action` twice. A closure that can run only once does not qualify, and the message says which variable makes it so. If the closure has no real need to use `name` up, let it read instead:",
            { run: rs`fn call_twice<F: Fn() -> String>(action: F) -> String {
    format!("{} {}", action(), action())
}

fn main() {
    let name = String::from("Ada");
    let shout = move || format!("{name}!");     // still a move closure, and now it only reads name
    println!("{}", call_twice(shout));
}`, name: 'reads_instead.rs', expect: 'Ada! Ada!\n' },
            { pitfall: "`move` and `FnOnce` are easy to mix up, and they are separate things. `move` is about how variables get **into** the closure, once, when it is created. `Fn`, `FnMut` and `FnOnce` are about what the body does with them at each **call**. The last closure is a `move` closure and it is `Fn`: it owns `name`, and it only ever reads it." },
          ],
        },
        {
          title: 'Taking closures as parameters',
          body: [
            "A function that takes a closure is generic over it, with one of the three traits as the bound. Choose the trait by what the function does with the closure.",
            { run: rs`// Fn: called several times, and changes nothing.
fn apply_to_all<F: Fn(i32) -> i32>(values: &mut [i32], f: F) {
    for value in values.iter_mut() {
        *value = f(*value);
    }
}

// FnMut: called several times, and may keep state between the calls. Note the mut.
fn repeat<F: FnMut()>(times: u32, mut action: F) {
    for _ in 0..times {
        action();
    }
}

// FnOnce: called at most once, so the closure may use up what it captured.
fn or_else<F: FnOnce() -> String>(value: Option<String>, fallback: F) -> String {
    match value {
        Some(text) => text,
        None => fallback(),
    }
}

fn double(n: i32) -> i32 {
    n * 2
}

fn main() {
    let mut values = [1, 2, 3];
    let offset = 10;
    apply_to_all(&mut values, |n| n + offset);
    apply_to_all(&mut values, double);              // a plain function fits as well
    println!("{values:?}");

    let mut ticks = 0;
    repeat(3, || ticks += 1);
    println!("{ticks}");

    let fallback_name = String::from("anonymous");
    println!("{}", or_else(None, move || fallback_name));
}`, name: 'parameters.rs', expect: '[22, 24, 26]\n3\nanonymous\n' },
            { list: [
              "`F: Fn(i32) -> i32` is ordinary generic code. The compiler makes a copy of `apply_to_all` for each closure it is called with, and it can inline the closure's body into the loop. A closure handed to `map` or `sort_by_key` costs no more than the same code written out in a loop by hand.",
              "A parameter with an `FnMut` bound has to be declared `mut` before it can be called, as `mut action` is, because each call may change the closure's own state.",
              "A named function such as `double` implements all three traits, so it can go wherever a closure can.",
              "`f: impl Fn(i32) -> i32` in the parameter list means the same as a named `F` with that bound, as lesson 15 said of `impl Trait`.",
            ] },
            "Which trait should your function ask for? The least it needs, because that accepts the most closures:",
            { table: {
              head: ['The function calls the closure', 'Ask for', 'The standard library does so in'],
              rows: [
                ['At most once', '`FnOnce`', '`Option::map`, `unwrap_or_else`, `thread::spawn`'],
                ['Several times, one call after another', '`FnMut`', '`sort_by_key`, `retain`, and the iterator methods of lesson 18'],
                ['Several times, through a shared reference or from several threads at once', '`Fn`', 'Rarely. It is what you ask of a handler that a server calls for many requests at the same time'],
              ],
            } },
            "For the caller it runs the other way. An `Fn` closure can be passed to any of the three, and a closure that is only `FnOnce` fits an `FnOnce` parameter and nothing else.",
            { native: "Hover over a closure in an editor with rust-analyzer and it lists what the closure captures and how: by immutable borrow, by mutable borrow or by move. Clippy has a lint for the opposite of a missing closure: it flags `map(|n| double(n))`, a closure that only passes its argument on, and suggests `map(double)`." },
          ],
        },
        {
          title: 'Returning and storing closures',
          body: [
            "Every closure has a type of its own, which the compiler invents and which has no name you could write. Two closures have two different types, even when they look alike:",
            { run: rs`fn main() {
    let bonus = 10;
    let add = |x: i32| x + bonus;
    let scale = |x: i32| x * bonus;

    let steps = vec![add, scale];
    println!("{}", steps.len());
}`, name: 'two_types.rs', fails: 'E0308' },
            "The notes say it outright: no two closures have the same type, and a `Vec` needs one element type. This is the problem lesson 16 started from, one list and many types, and both of that lesson's answers apply here.",
            "**One closure type that is never named: `impl Fn`.** A function that returns a closure cannot write its type, so it describes it by a trait. **One of several closure types: `Box<dyn Fn>`.** To return one closure out of several from a `match`, or to keep different closures in one vector, turn them into trait objects. `dyn Fn(i32) -> i32` is a trait object type, and it lives behind a pointer like any other.",
            { run: rs`// One closure type, hidden behind impl Fn.
fn between(low: i32, high: i32) -> impl Fn(i32) -> bool {
    move |n| low <= n && n <= high
}

// One of three closure types, chosen while the program runs: a trait object.
fn operation(symbol: char) -> Box<dyn Fn(i32, i32) -> i32> {
    match symbol {
        '+' => Box::new(|a, b| a + b),
        '*' => Box::new(|a, b| a * b),
        _ => Box::new(|a, _| a),
    }
}

fn main() {
    let is_teen = between(13, 19);
    println!("{} {}", is_teen(15), is_teen(30));
    println!("{} {}", operation('+')(6, 7), operation('*')(6, 7));

    let bonus = 10;
    let steps: Vec<Box<dyn Fn(i32) -> i32>> = vec![
        Box::new(move |x| x + bonus),
        Box::new(move |x| x * bonus),
        Box::new(|x| x - 1),
    ];
    let mut value = 5;
    for step in &steps {
        value = step(value);
    }
    println!("{value}");
}`, name: 'returned.rs', expect: 'true false\n13 42\n149\n' },
            "The costs are those of lesson 16: a heap allocation for each box, and a call through a vtable. For a callback that runs when a button is pressed, that is nothing. In the innermost loop of a computation, prefer the generic form.",
            "A struct field needs a type as well. One choice is to make the struct generic over the closure, as in `struct Retry<F: Fn() -> bool> { action: F }`. That keeps static dispatch, and gives a `Retry` holding one closure a different type from a `Retry` holding another. The other choice is to box the closure, which is the usual one when a struct holds a list of them:",
            { run: rs`struct Validator {
    rules: Vec<(String, Box<dyn Fn(&str) -> bool>)>,
}

impl Validator {
    fn new() -> Self {
        Validator { rules: Vec::new() }
    }

    fn rule(mut self, name: &str, check: impl Fn(&str) -> bool + 'static) -> Self {
        self.rules.push((name.to_string(), Box::new(check)));
        self
    }

    // The names of the rules that the input breaks.
    fn failures(&self, input: &str) -> Vec<&str> {
        let mut failed = Vec::new();
        for (name, check) in &self.rules {
            if !check(input) {
                failed.push(name.as_str());
            }
        }
        failed
    }
}

fn main() {
    let min_len = 8;
    let validator = Validator::new()
        .rule("long enough", move |text| text.len() >= min_len)
        .rule("has a digit", |text| text.chars().any(|c| c.is_ascii_digit()));

    println!("{:?}", validator.failures("hunter2"));
    println!("{:?}", validator.failures("swordfish"));
    println!("{:?}", validator.failures("correct horse 9"));
}`, name: 'validator.rs', expect: '["long enough"]\n["has a digit"]\n[]\n' },
            "One part of `impl Fn(&str) -> bool + 'static` is new. A boxed closure in a struct field may be kept for any length of time, so it must not borrow from a local variable that will be gone by then. `'static`, from lesson 10, says exactly that: the closure holds no reference that could expire. A `Box<dyn Fn(…)>` written in a struct field or in a signature carries the same requirement without spelling it out. In practice it means that a stored closure which uses local variables has to be a `move` closure, as the first rule is. The second rule captures nothing, so it qualifies as it stands.",
          ],
        },
        {
          title: 'What a closure is underneath',
          body: [
            "A closure is not a special kind of object. The compiler turns each one into a struct with one field for each captured variable, and puts the body in a method. Written by hand, `move |x| x + n` is this:",
            { run: rs`// What the compiler generates for:   let add_n = move |x| x + n;
struct AddN {
    n: i32,                                 // one field for each captured variable
}

impl AddN {
    fn call(&self, x: i32) -> i32 {         // &self, because the body only reads n
        x + self.n
    }
}

fn main() {
    let n = 10;
    let by_closure = move |x: i32| x + n;
    let by_hand = AddN { n };

    println!("{} {}", by_closure(5), by_hand.call(5));
    println!("{} {}", std::mem::size_of_val(&by_closure), std::mem::size_of_val(&by_hand));
}`, name: 'by_hand.rs', expect: '15 15\n4 4\n' },
            "The struct the compiler generates implements `Fn`, `FnMut` and `FnOnce` where this one has a method named `call`, and that is the whole difference. `call` takes `&self` because the body only reads `n`. A body that changed `n` would need `&mut self`, and that closure would be `FnMut`. A body that gave `n` away would need `self`, and that closure would be `FnOnce`. The three traits are the three receivers.",
            "So a closure is exactly as big as what it captures, and it lives wherever you put it:",
            { run: rs`use std::mem::size_of_val;

fn main() {
    let small: u8 = 7;
    let name = String::from("Ferris");

    let nothing = |x: i32| x + 1;           // captures nothing
    let by_ref = || name.len();             // captures &name
    let copied = move || small + 1;         // captures a u8
    println!("{} {} {}", size_of_val(&nothing), size_of_val(&by_ref), size_of_val(&copied));
    println!("{} {} {}", nothing(1), by_ref(), copied());

    let owned = move || name.len();         // captures the String itself
    println!("{} {}", size_of_val(&owned), owned());

    let plain: fn(i32) -> i32 = nothing;    // no captures: it converts to a function pointer
    println!("{} {}", size_of_val(&plain), plain(41));
}`, name: 'sizes.rs', expect: '0 8 1\n2 6 8\n24 6\n8 42\n' },
            { list: [
              "A closure that captures nothing takes up zero bytes. All there is to it is its code, and the compiler knows which code from the closure's type.",
              "Capturing by reference stores a pointer, 8 bytes. Capturing a `String` with `move` stores the `String`: 24 bytes, the three words of lesson 4.",
              "Creating a closure allocates nothing on the heap, and calling one is a direct call that the optimizer can inline.",
              "A closure that captures nothing converts to a plain function pointer, written `fn(i32) -> i32` with a lower-case `fn`. That is one word, the address of the code.",
            ] },
            { aside: "A `Box<dyn Fn(i32) -> i32>` is the fat pointer of lesson 16. Its data pointer leads to the struct of captured variables, now on the heap, and its vtable holds the entry for the call along with the size and the destructor." },
            { fromC: "The C lesson on function pointers ended with the pattern that every C library uses for callbacks: a function pointer, and a `void *context` that the library hands back on each call. A closure is that pair. The compiler writes the context struct, fills it in and passes it as `self`, so the cast back from `void *` is gone, and so is the question of who frees the context." },
            { compare: "In Python, JavaScript and PHP a closure is an object on the heap that refers to its captured variables, which are kept on the heap too. Creating one allocates, and calling one goes through a pointer. A Rust closure is a plain value, as large as its captures and stored inline, and a call to it compiles to the same code as its body written out in place. That is why Rust uses closures freely in its innermost loops, as the iterators of lesson 18 do." },
          ],
        },
      ],
      takeaways: [
        "A closure is a function written inline that can use the variables of the scope around it. For each one, the compiler picks the least the body needs: a shared borrow, a mutable borrow, or the value itself.",
        "A closure that borrows is a borrower from the line where it is created to its last call. In between, the usual rule holds: many readers or one writer.",
        "`move` makes a closure own everything it uses. A closure needs it when it outlives the scope it was made in: when it is returned, stored, or sent to a thread. A `Copy` value is copied in, and the original goes its own way.",
        "`Fn` only reads its captures, `FnMut` changes them, and `FnOnce` uses them up. Every `Fn` is also `FnMut`, and every `FnMut` is also `FnOnce`. A function should ask for the weakest of the three it can work with.",
        "Every closure has a type of its own that cannot be named. Take a closure with a generic `F: Fn(…)`, return one with `impl Fn(…)`, and keep several together as `Box<dyn Fn(…)>`.",
        "Underneath, a closure is a struct of its captured variables with the body as a method. It is as big as what it captures, it is not on the heap unless you box it, and calls to it can be inlined.",
      ],
      quiz: [
        {
          q: 'How does this closure capture `names` and `limit`?',
          code: rs`let mut names = vec![String::from("Ada")];
let limit = 3;

let mut add = |name: &str| {
    if names.len() < limit {
        names.push(name.to_string());
    }
};
add("Grace");`,
          options: [
            { t: '`names` by mutable reference and `limit` by shared reference', ok: true, why: "The choice is made for each variable separately, and it is the least the body needs. `push` needs `&mut names`. The comparison only reads `limit`, so `&limit` is enough." },
            { t: 'Both by mutable reference, because the closure is declared `mut`', why: "The `mut` on `add` is what allows the closure to be called, since calling it changes what it holds. It does not set how each variable is captured. `limit` is only read." },
            { t: '`names` by mutable reference, and `limit` by value because a `usize` is `Copy`', why: "Without `move`, being `Copy` changes nothing: the closure holds a `&limit`. Only a `move` closure would copy the number in." },
            { t: 'Both by value: a closure takes a copy of its environment when it is created', why: "That is what `use ($names, $limit)` does in PHP. In Rust it happens only with `move`, and it would move the vector, not copy it." },
          ],
        },
        {
          q: 'Which of the three closure traits does `greet` implement?',
          code: rs`let name = String::from("Ada");
let greet = move || println!("hello, {name}");`,
          options: [
            { t: '`Fn`, `FnMut` and `FnOnce`', ok: true, why: "The body only reads `name`, so a call needs nothing more than `&self`. That makes the closure `Fn`, and every `Fn` closure is `FnMut` and `FnOnce` as well. `move` decided that the closure owns `name`, not how it may be called." },
            { t: '`FnOnce` only, because of `move`', why: "`move` is about how `name` gets into the closure. The traits are about what the body does with it at each call, and this body only reads it. The closure can be called as often as you like." },
            { t: '`FnMut` and `FnOnce`, but not `Fn`, because it prints', why: "Printing changes the terminal, not the closure. The three traits describe what a call does to the captured variables, and nothing here changes `name`." },
            { t: '`Fn` only: a closure implements exactly one of the three', why: "The traits are nested, not exclusive. Whatever can be called through `&self` can also be called through `&mut self` or by value." },
          ],
        },
        {
          q: 'Which of the three closure traits does `remember` implement?',
          code: rs`let mut seen = Vec::new();
let mut remember = |x: i32| {
    seen.push(x);
    seen.len()
};`,
          options: [
            { t: '`FnMut` and `FnOnce`, but not `Fn`', ok: true, why: "`push` changes the captured vector, so a call needs `&mut self`. That rules out `Fn`, which gets only `&self`. Nothing is used up, so the closure can be called again and again." },
            { t: '`Fn`, `FnMut` and `FnOnce`', why: "`Fn` promises that a call changes nothing the closure holds, so that it can be called through a shared reference. This body pushes to `seen`." },
            { t: '`FnOnce` only', why: "`FnOnce` alone is for a closure that uses up something it captured. `seen` is changed and stays where it is, so a second call is fine." },
            { t: '`FnMut` only: `FnOnce` is for closures that consume their captures', why: "`FnOnce` means callable at least once, and every closure is. It is the widest of the three traits, not a special case." },
          ],
        },
        {
          q: 'Which of the three closure traits does `finish` implement?',
          code: rs`let buffer = String::from("data");
let finish = move || buffer.into_bytes();`,
          options: [
            { t: '`FnOnce` only', ok: true, why: "`into_bytes` takes the `String` by value, so the call moves `buffer` out of the closure. After one call there is nothing left to run a second with, and the compiler would reject a second call with `E0382`." },
            { t: '`Fn`, `FnMut` and `FnOnce`: it only reads `buffer` to convert it', why: "`into_bytes` has the receiver `self`. It consumes the `String` and reuses its buffer for the `Vec<u8>`. A method that only read it, such as `as_bytes`, would leave the closure `Fn`." },
            { t: '`FnMut` and `FnOnce`: it changes `buffer`', why: "It does more than change it. The value leaves the closure for good, which a `&mut self` call is not allowed to do." },
            { t: 'None. A closure that consumes its captures has to be written as a `fn`', why: "A `fn` cannot capture anything at all. This is an ordinary closure, and `FnOnce` exists for exactly this case." },
          ],
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];
    let count = move || names.len();

    println!("{}", count());
    println!("{}", names.len());
}`,
          options: [
            { t: 'No: `names` was moved into the closure, so `main` can no longer use it', ok: true, why: "`move` takes every captured variable by value, whatever the body does with it. A `Vec` is not `Copy`, so the vector now belongs to the closure, and the last line is rejected with `E0382`." },
            { t: 'Yes, and it prints `2` twice, because the closure only reads `names`', why: "That is what happens without `move`: the closure would borrow `names`, and a shared borrow lets `main` read as well. `move` overrides the choice the body would have made." },
            { t: 'Yes: `move` gives the closure its own copy of the vector', why: "It does for `Copy` types such as integers. A `Vec` is moved, not copied. A second vector needs an explicit `clone`." },
            { t: 'No: a `move` closure can be called only once, and `count()` used it up', why: "`move` does not make a closure `FnOnce`. This closure only reads `names`, so it is `Fn` and could be called any number of times. The error is at `names.len()`." },
          ],
          verify: 'E0382',
        },
        {
          q: 'The same program without `move`. Does it compile?',
          code: rs`fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];
    let count = || names.len();

    println!("{}", count());
    println!("{}", names.len());
}`,
          options: [
            { t: 'Yes, and it prints `2` twice', ok: true, why: "The body only reads `names`, so the closure captures a shared reference. Shared borrows can coexist, so `main` may read the vector too." },
            { t: 'No: `names` is borrowed by the closure, so `main` cannot touch it', why: "That would be true of a mutable borrow. This closure only reads, and any number of readers may look at a value at the same time." },
            { t: 'No: a closure that uses a local variable must be declared `move`', why: "`move` is needed only when the closure outlives the variable, as when it is returned or sent to a thread. This closure is used and dropped inside `main`, where `names` lives." },
            { t: 'Yes, but the second line prints `0`, because the closure took the elements', why: "`len` only reads. Nothing was moved or emptied, and a closure that borrows cannot take anything away." },
          ],
          verify: 'compiles',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let mut total = 0;
    let mut add = |n: i32| {
        total += n;
        total
    };

    add(5);
    add(10);
    let last = add(1);
    println!("{last} {total}");
}`,
          answer: '16 16',
          explain: "There is no `move`, so the closure borrows `total` mutably and each call changes the variable in `main`. The borrow ends with the last call, and `println!` may then read `total`. With `move` the closure would count with a copy of its own, and the program would print `16 0`.",
          hint: "Does the closure hold `total` itself, or a copy of it? Look for the keyword that would make it a copy.",
        },
      ],
      challenges: [
        {
          id: 'apply-twice',
          title: 'Apply it twice',
          level: 'warm-up',
          prompt: [
            "Call `f` on `x`, call it again on the result, and return that. `apply_twice(|n| n + 3, 10)` is 16.",
            "In the starter, `F` has no bound, so the body cannot call `f` at all. Give `F` a bound that says what it is: something that can be called with an `i32` and returns an `i32`.",
          ],
          signature: 'fn apply_twice<F>(f: F, x: i32) -> i32     // plus a bound on F',
          starter: rs`fn apply_twice<F>(f: F, x: i32) -> i32 {
    // Without a bound, f is just some value: it cannot be called.
    x
}`,
          hints: [
            "A bound for a closure is written like a signature: `F: Fn(i32) -> i32`.",
            "With the bound in place, `f(x)` is a call, and its result can be given to `f` again.",
            "`fn apply_twice<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 { f(f(x)) }`",
          ],
          solution: rs`fn apply_twice<F: Fn(i32) -> i32>(f: F, x: i32) -> i32 {
    f(f(x))
}`,
          tests: [
            { label: 'Applies a closure twice', body: rs`assert_eq!(apply_twice(|n: i32| n + 3, 10), 16);` },
            { label: 'The second call receives the result of the first', body: rs`assert_eq!(apply_twice(|n: i32| n * n, 3), 81);` },
            { label: 'Takes a closure that captures a variable', body: rs`let step = 7;
assert_eq!(apply_twice(|n: i32| n - step, 20), 6);
assert_eq!(step, 7);` },
            { label: 'Takes a plain function', body: rs`fn double(n: i32) -> i32 {
    n * 2
}
assert_eq!(apply_twice(double, 5), 20);` },
          ],
        },
        {
          id: 'make-adder',
          title: 'A closure that remembers a number',
          level: 'warm-up',
          prompt: [
            "Return a closure that adds `n` to its argument. With `let add = make_adder(5);`, the call `add(10)` gives 15.",
            "The starter returns a closure that ignores `n`. Once you use `n` in the body the compiler will object, and its `help:` line names the keyword that section 3 was about.",
          ],
          signature: 'fn make_adder(n: i32) -> impl Fn(i32) -> i32',
          starter: rs`fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    |x| x
}`,
          hints: [
            "The body is `x + n`. `n` is a parameter of `make_adder`, so it is gone when `make_adder` returns, and the closure is used after that.",
            "A closure that outlives the variables it uses has to own them. `move` in front of the closure copies `n` into it.",
            "`move |x| x + n`",
          ],
          solution: rs`fn make_adder(n: i32) -> impl Fn(i32) -> i32 {
    move |x| x + n
}`,
          tests: [
            { label: 'Adds the number it was made with', body: rs`let add = make_adder(5);
assert_eq!(add(10), 15);
assert_eq!(add(-5), 0);` },
            { label: 'Each adder keeps its own number', body: rs`let add_one = make_adder(1);
let take_ten = make_adder(-10);
assert_eq!(add_one(1), 2);
assert_eq!(take_ten(1), -9);
assert_eq!(add_one(take_ten(100)), 91);` },
            { label: 'Still works after the variable it was made from is gone', body: rs`let add = {
    let amount = 100;
    make_adder(amount)
};
assert_eq!(add(1), 101);` },
            { label: 'Fits wherever an `Fn(i32) -> i32` is expected', body: rs`fn twice(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    f(f(x))
}
assert_eq!(twice(make_adder(4), 1), 9);` },
          ],
        },
        {
          id: 'make-counter',
          title: 'A closure that counts',
          level: 'core',
          prompt: [
            "Return a closure that counts. Its first call returns `start`, and each later call returns `step` more than the call before. `make_counter(10, 5)` gives 10, then 15, then 20.",
            "The closure has to remember where it is between calls, so it changes something that it captured. That makes it `FnMut`, as the return type says. The starter returns `start` every time.",
          ],
          signature: 'fn make_counter(start: u32, step: u32) -> impl FnMut() -> u32',
          starter: rs`fn make_counter(start: u32, step: u32) -> impl FnMut() -> u32 {
    // The closure needs a variable of its own to count with.
    move || start
}`,
          hints: [
            "Declare a variable in `make_counter` that holds the value to return next: `let mut next = start;`. The closure will capture it.",
            "The closure must be a `move` closure, so that it owns `next` and `step` once `make_counter` has returned. `next` then lives inside the closure, and every counter has one of its own.",
            "`move || { let current = next; next += step; current }`",
          ],
          solution: rs`fn make_counter(start: u32, step: u32) -> impl FnMut() -> u32 {
    let mut next = start;
    move || {
        let current = next;
        next += step;
        current
    }
}`,
          tests: [
            { label: 'Counts up from the start', body: rs`let mut counter = make_counter(0, 1);
assert_eq!(counter(), 0);
assert_eq!(counter(), 1);
assert_eq!(counter(), 2);` },
            { label: 'Takes steps of the size it was given', body: rs`let mut counter = make_counter(10, 5);
assert_eq!(counter(), 10);
assert_eq!(counter(), 15);
assert_eq!(counter(), 20);` },
            { label: 'Two counters do not share a count', body: rs`let mut a = make_counter(1, 1);
let mut b = make_counter(100, 100);
assert_eq!(a(), 1);
assert_eq!(b(), 100);
assert_eq!(a(), 2);
assert_eq!(a(), 3);
assert_eq!(b(), 200);` },
            { label: 'Can be handed to a function that takes an FnMut', body: rs`fn take_three(mut f: impl FnMut() -> u32) -> [u32; 3] {
    [f(), f(), f()]
}
assert_eq!(take_three(make_counter(1, 2)), [1, 3, 5]);` },
            { label: 'Keeps its count when it is moved to another variable', body: rs`let mut first = make_counter(7, 1);
assert_eq!(first(), 7);
let mut second = first;
assert_eq!(second(), 8);` },
          ],
        },
        {
          id: 'closure-borrows-too-long',
          title: 'A helper that holds on too long',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "`camel_words` splits a name written in camel case into its words, in lower case: `parseHttpRequest` becomes `parse`, `http` and `request`. A word ends where the next capital letter begins, and at the end of the name.",
            "Pushing the finished word happens in two places, so the author wrote a helper closure, `flush`. The compiler rejects the function. Read the error and repair the function without changing what it returns.",
            "Keep the helper. Writing its body out twice would compile and would teach you nothing. A closure borrows only what it captures, so ask what `flush` really has to capture.",
          ],
          signature: 'fn camel_words(name: &str) -> Vec<String>',
          starter: rs`fn camel_words(name: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current = String::new();

    let mut flush = || {
        if !current.is_empty() {
            words.push(current.clone());
            current.clear();
        }
    };

    for c in name.chars() {
        if c.is_uppercase() {
            flush();
        }
        current.push(c.to_ascii_lowercase());
    }
    flush();
    words
}`,
          hints: [
            "`flush` changes `current` and `words`, so it borrows both mutably from the line where it is created to its last call, which comes after the loop. `current.push(…)` inside the loop falls in the middle of that.",
            "The second fix of section 2 applies: pass the data in. Give the closure two parameters, `|current: &mut String, words: &mut Vec<String>|`, and it captures nothing.",
            "Each call then lends the two variables for that call alone: `flush(&mut current, &mut words);`. The body of the closure stays as it is, and `flush` no longer has to be `mut`.",
          ],
          solution: rs`fn camel_words(name: &str) -> Vec<String> {
    let mut words = Vec::new();
    let mut current = String::new();

    // Captures nothing: what it works on is lent to it at each call.
    let flush = |current: &mut String, words: &mut Vec<String>| {
        if !current.is_empty() {
            words.push(current.clone());
            current.clear();
        }
    };

    for c in name.chars() {
        if c.is_uppercase() {
            flush(&mut current, &mut words);
        }
        current.push(c.to_ascii_lowercase());
    }
    flush(&mut current, &mut words);
    words
}`,
          tests: [
            { label: 'Splits at each capital letter', body: rs`assert_eq!(camel_words("parseHttpRequest"), ["parse", "http", "request"]);` },
            { label: 'A name with no capitals is one word', body: rs`assert_eq!(camel_words("total"), ["total"]);` },
            { label: 'A leading capital does not make an empty word', body: rs`assert_eq!(camel_words("VecDeque"), ["vec", "deque"]);` },
            { label: 'Single letters are words too', body: rs`assert_eq!(camel_words("xYZ"), ["x", "y", "z"]);` },
            { label: 'An empty name has no words', body: rs`assert!(camel_words("").is_empty());` },
          ],
        },
        {
          id: 'callback-registry',
          title: 'A registry of event handlers',
          level: 'core',
          prompt: [
            "A `Registry` keeps handlers for named events. `on` registers a handler under an event name. `emit` calls every handler registered under that name with a value, in the order they were registered, and returns what they returned.",
            "The handlers are closures of many different types, so they are stored as `Box<dyn FnMut(i32) -> i32>`. They are `FnMut` so that a handler can keep state of its own from one event to the next, such as a running total.",
            "The starter compiles and stores nothing. Decide what the struct holds, then write the three methods.",
          ],
          signature: 'struct Registry { … }\nimpl Registry {\n    fn new() -> Self\n    fn on(&mut self, event: &str, handler: Box<dyn FnMut(i32) -> i32>)\n    fn emit(&mut self, event: &str, value: i32) -> Vec<i32>\n}',
          starter: rs`struct Registry {
    // Keep each event name together with its handler.
}

impl Registry {
    fn new() -> Self {
        Registry {}
    }

    fn on(&mut self, event: &str, handler: Box<dyn FnMut(i32) -> i32>) {
        // Store the handler under the event's name.
    }

    fn emit(&mut self, event: &str, value: i32) -> Vec<i32> {
        // Call each handler registered for this event, in order, and collect the results.
        Vec::new()
    }
}`,
          hints: [
            "The struct needs one field, a vector of pairs: `handlers: Vec<(String, Box<dyn FnMut(i32) -> i32>)>`. `on` pushes `(event.to_string(), handler)`. The box is a trait object already, so it goes in as it is.",
            "Calling an `FnMut` needs mutable access to it, so `emit` has to walk the vector mutably: `for (name, handler) in self.handlers.iter_mut()`.",
            "Inside that loop: `if name.as_str() == event { results.push(handler(value)); }`, with `let mut results = Vec::new();` before it and `results` after it.",
          ],
          solution: rs`struct Registry {
    handlers: Vec<(String, Box<dyn FnMut(i32) -> i32>)>,
}

impl Registry {
    fn new() -> Self {
        Registry { handlers: Vec::new() }
    }

    fn on(&mut self, event: &str, handler: Box<dyn FnMut(i32) -> i32>) {
        self.handlers.push((event.to_string(), handler));
    }

    fn emit(&mut self, event: &str, value: i32) -> Vec<i32> {
        let mut results = Vec::new();
        for (name, handler) in self.handlers.iter_mut() {
            if name.as_str() == event {
                results.push(handler(value));
            }
        }
        results
    }
}`,
          tests: [
            { label: 'A handler receives the value, and its result comes back', body: rs`let mut registry = Registry::new();
registry.on("double", Box::new(|x| x * 2));
assert_eq!(registry.emit("double", 21), [42]);` },
            { label: 'Only the handlers for that event run, in the order they were registered', body: rs`let mut registry = Registry::new();
registry.on("price", Box::new(|x| x + 1));
registry.on("stock", Box::new(|x| x * 100));
registry.on("price", Box::new(|x| x - 1));
registry.on("price", Box::new(|x| x * 2));
assert_eq!(registry.emit("price", 10), [11, 9, 20]);
assert_eq!(registry.emit("stock", 3), [300]);` },
            { label: 'An event that nobody listens to gives an empty list', body: rs`let mut registry = Registry::new();
registry.on("open", Box::new(|x| x));
assert!(registry.emit("close", 1).is_empty());
assert!(Registry::new().emit("open", 1).is_empty());` },
            { label: 'A handler keeps its own state between events', body: rs`let mut registry = Registry::new();
let mut total = 0;
registry.on("add", Box::new(move |x| {
    total += x;
    total
}));
assert_eq!(registry.emit("add", 5), [5]);
assert_eq!(registry.emit("add", 10), [15]);
assert_eq!(registry.emit("add", 1), [16]);` },
            { label: 'A handler owns what it captured, after the scope it came from has ended', body: rs`let mut registry = Registry::new();
{
    let prices = vec![250, 400, 120];
    registry.on("price-of", Box::new(move |index| prices[index as usize]));
}
assert_eq!(registry.emit("price-of", 1), [400]);
assert_eq!(registry.emit("price-of", 2), [120]);` },
          ],
        },
        {
          id: 'memoize',
          title: 'Remember the answers',
          level: 'stretch',
          prompt: [
            "`memoize` wraps a function in a cache. It takes a function `f` and returns a closure that gives the same answers as `f`, and calls `f` only once for each distinct argument. A later call with an argument it has seen returns the stored result.",
            "The starter has the right shape and no cache. It hands `f` straight back, which compiles because `f` already is an `FnMut(A) -> R`. Return a closure of your own that owns both `f` and a `HashMap`. As you write it the compiler will ask for bounds on `A` and `R`: add them to the `where` clause.",
            "The tests count how often the wrapped function really runs.",
          ],
          signature: 'fn memoize<A, R, F>(f: F) -> impl FnMut(A) -> R\nwhere\n    F: FnMut(A) -> R,     // plus the bounds on A and R that the body needs',
          starter: rs`fn memoize<A, R, F>(f: F) -> impl FnMut(A) -> R
where
    F: FnMut(A) -> R,
{
    // No cache yet: every call goes straight to f.
    f
}`,
          hints: [
            "The closure you return needs two things that outlive the call to `memoize`: the function and the cache. Make `let mut cache = HashMap::new();` and return a `move` closure, which takes both along.",
            "A `HashMap` key must be `Eq + Hash`. The argument is needed twice, as the key and to call `f`, and the result is needed twice, in the cache and as the return value. So `A: Eq + Hash + Clone` and `R: Clone`, with `use std::hash::Hash;` at the top.",
            "Inside the closure: `if let Some(result) = cache.get(&arg) { return result.clone(); }`, then `let result = f(arg.clone()); cache.insert(arg, result.clone()); result`. Calling `f` needs `mut f: F` in the parameter list, because `f` is `FnMut`.",
          ],
          solution: rs`use std::collections::HashMap;
use std::hash::Hash;

fn memoize<A, R, F>(mut f: F) -> impl FnMut(A) -> R
where
    A: Eq + Hash + Clone,
    R: Clone,
    F: FnMut(A) -> R,
{
    let mut cache: HashMap<A, R> = HashMap::new();
    move |arg: A| {
        if let Some(result) = cache.get(&arg) {
            return result.clone();
        }
        let result = f(arg.clone());
        cache.insert(arg, result.clone());
        result
    }
}`,
          tests: [
            { label: 'Gives the same answers as the function', body: rs`let mut square = memoize(|n: u64| n * n);
assert_eq!(square(12), 144);
assert_eq!(square(3), 9);
assert_eq!(square(12), 144);` },
            { label: 'Runs the function once for each distinct argument', body: rs`let mut calls = 0;
{
    let mut square = memoize(|n: u64| {
        calls += 1;
        n * n
    });
    assert_eq!(square(12), 144);
    assert_eq!(square(12), 144);
    assert_eq!(square(3), 9);
    assert_eq!(square(12), 144);
    assert_eq!(square(3), 9);
}
assert_eq!(calls, 2, "the function should have run once for 12 and once for 3");` },
            { label: 'Works for arguments and results that are not Copy', body: rs`let mut calls = 0;
{
    let mut shout = memoize(|word: String| {
        calls += 1;
        word.to_uppercase()
    });
    assert_eq!(shout(String::from("closure")), "CLOSURE");
    assert_eq!(shout(String::from("closure")), "CLOSURE");
    assert_eq!(shout(String::from("fn")), "FN");
}
assert_eq!(calls, 2, "the function should have run once for each distinct word");` },
            { label: 'Each memoized function has a cache of its own', body: rs`let mut double = memoize(|n: i32| n * 2);
let mut negate = memoize(|n: i32| -n);
assert_eq!(double(4), 8);
assert_eq!(negate(4), -4);
assert_eq!(double(4), 8);
assert_eq!(negate(4), -4);` },
          ],
        },
      ],
    },
  );
})();
