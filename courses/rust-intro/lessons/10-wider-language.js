// Part 6, lessons 22 and 23: organizing a program into modules and crates with Cargo, and running code on several threads.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 6 · Shared ownership & the wider language';

  // The Span module of lesson 22, shared by the cell that runs and the two that are refused.
  const spanModule = rs`mod span {
    pub struct Span {
        start: u32,                            // private, although Span is pub
        end: u32,
    }

    impl Span {
        // The only way to make a Span from outside. It refuses a backwards one.
        pub fn new(start: u32, end: u32) -> Option<Span> {
            if start <= end { Some(Span { start, end }) } else { None }
        }

        // Relies on start <= end. Without it, the subtraction would overflow.
        pub fn len(&self) -> u32 {
            self.end - self.start
        }

        // Moves both ends together, so the fact stays true.
        pub fn shift(&mut self, by: u32) {
            self.start += by;
            self.end += by;
        }
    }
}
`;

  (window.C_LESSONS ||= []).push(
    {
      id: 'modules-and-cargo',
      title: 'Modules, crates & Cargo',
      category: part,
      minutes: 30,
      summary: 'How a Rust program is divided into modules, what privacy is for, and the tools that turn a folder of files into a tested program with dependencies.',
      topics: ['mod and pub', 'Invariants', 'use and pub use', 'Files and crates', 'Cargo', 'Tests', 'Tooling'],
      sections: [
        {
          title: 'Modules and privacy',
          body: [
            "Every program so far has been one flat list of items, and any of them could use any other. That stops working at a few thousand lines. A **module** is a named group of items. It does two jobs at once: it gives its items a path, and it draws a line around them that outside code needs permission to cross.",
            { run: rs`mod kitchen {
    pub fn order(dish: &str) -> String {
        format!("{} for table 4", cook(dish))
    }

    fn cook(dish: &str) -> String {            // no pub: private to kitchen
        format!("hot {dish}")
    }
}

fn main() {
    println!("{}", kitchen::order("soup"));
}`, name: 'kitchen.rs', expect: 'hot soup for table 4\n' },
            "Inside the braces, `order` calls `cook` by its plain name. From outside, the path is `kitchen::order`: the module, two colons, the item. You have written paths like this since `String::from` and `std::collections::HashMap`.",
            "Everything in a module is **private** unless it is marked `pub`. `main` is outside `kitchen`, so it may call `order`. It may not call `cook`.",
            { run: rs`mod kitchen {
    pub fn order(dish: &str) -> String {
        format!("{} for table 4", cook(dish))
    }

    fn cook(dish: &str) -> String {
        format!("hot {dish}")
    }
}

fn main() {
    println!("{}", kitchen::order("soup"));
    println!("{}", kitchen::cook("soup"));
}`, name: 'private_fn.rs', fails: 'E0603' },
            "The note under the error points at the definition, which is where a `pub` would go if `cook` were meant for outside use. Often it is not, and then the error is doing its job. `cook` is a detail of the kitchen. Nothing outside can come to depend on it, so it can be renamed, split or deleted without reading the rest of the program.",
            "The whole rule is one sentence: **a private item can be used by the module it is declared in and by everything inside that module.** So privacy only blocks looking in from outside. A nested module sees the private items of the modules around it. A parent does not see into its children.",
            { run: rs`mod bakery {
    fn oven_temperature() -> u32 {             // private to bakery
        220
    }

    pub mod bread {
        pub fn bake() -> String {
            // A child may use its parent's private items. super is "my parent module".
            format!("bread at {} degrees", super::oven_temperature())
        }

        fn recipe() -> &'static str {          // private to bread
            "flour, water, salt, time"
        }

        pub fn ingredients() -> usize {
            recipe().split(", ").count()
        }
    }

    pub fn menu() -> String {
        // bake and ingredients are pub, so bakery may call them.
        // bread::recipe() would be refused here: a parent cannot see into its child.
        format!("{} ({} ingredients)", bread::bake(), bread::ingredients())
    }
}

fn main() {
    println!("{}", bakery::menu());
    println!("{}", bakery::bread::bake());
}`, name: 'inside_out.rs', expect: 'bread at 220 degrees (4 ingredients)\nbread at 220 degrees\n' },
            "The file itself is a module too, called the **crate root**. `bakery` and `main` are both items of the root, which is why `main` can name `bakery` although nothing marks it `pub`. From there a path is checked one step at a time. `bakery::bread::bake` works from `main` because `bread` is `pub` inside `bakery`, and `bake` is `pub` inside `bread`. Take the `pub` off `mod bread` and the path stops at its second step, however public `bake` is.",
            { table: {
              head: ['Written', 'Who can use the item'],
              rows: [
                ['nothing', 'The module it is declared in, and the modules inside that one.'],
                ['`pub`', 'Anyone who can reach the module it is in.'],
                ['`pub(crate)`', 'All of this crate, and no other crate. Section 4 says what a crate is.'],
                ['`pub(super)`', 'The parent module, and everything inside the parent.'],
              ],
            } },
            { compare: "Python has no privacy at all: `_name` is a convention, and `__name` is renamed, not hidden. In PHP and TypeScript, `private` belongs to a class. The nearest thing you know is `export` in a TypeScript or JavaScript file: a name that is not exported cannot be imported. `pub` is that `export`, with two differences. Modules nest, inside one file or across many, and every level decides again what it passes on. And one default covers everything: functions, types, constants, fields and modules themselves are private until marked." },
            { fromC: "There are no header files, no include guards and no preprocessor pasting text into text. A module's interface is the set of items marked `pub`, and the compiler reads it from the same source as the bodies. The default is also the other way around. A C function is visible to the whole program unless it is marked `static`. A Rust function is private unless it is marked `pub`." },
          ],
        },
        {
          title: 'Privacy protects invariants',
          body: [
            "Hiding helper functions is tidy. Hiding **fields** does something stronger: it lets a type make a promise that no code outside its module is able to break.",
            "A struct's fields have a privacy of their own. `pub struct` lets outside code name the type. Each field stays private unless it is marked as well.",
            { run: spanModule + rs`
fn main() {
    let mut line = span::Span::new(2, 9).unwrap();
    line.shift(10);
    println!("length {}", line.len());
    println!("backwards allowed: {}", span::Span::new(9, 2).is_some());
}`, name: 'span.rs', expect: 'length 7\nbackwards allowed: false\n' },
            "`start <= end` is an **invariant** of `Span`: a fact that holds for every value of the type, all the time. `new` establishes it, `shift` preserves it, and `len` relies on it without checking. Because the fields are private, the code inside `mod span` is the only code that could ever break it. To be sure that `len` cannot overflow, you read one module and not the whole program.",
            "Outside code cannot get around `new` by writing the struct out in full.",
            { run: spanModule + rs`
fn main() {
    let mut line = span::Span::new(2, 9).unwrap();
    line.shift(10);
    let backwards = span::Span { start: 9, end: 2 };
    println!("{} {}", line.len(), backwards.len());
}`, name: 'literal.rs', fails: 'E0451' },
            "And it cannot reach in afterwards.",
            { run: spanModule + rs`
fn main() {
    let mut line = span::Span::new(2, 9).unwrap();
    line.shift(10);
    line.end = 0;
    println!("{}", line.len());
}`, name: 'reach_in.rs', fails: 'E0616' },
            "Two codes, one idea. `E0451` is building a struct that has a private field, and `E0616` is reading or writing one.",
            "You have relied on this since Part 2. A `Vec` keeps its length within its capacity, and its pointer aimed at that much memory. A `String` promises that its bytes are valid UTF-8, which is why no method on `&str` has to check the encoding again. Those are invariants behind private fields, in modules of the standard library. Lesson 19's advice to parse instead of validating stands on the same ground: if a `Username` can only be made by a constructor that checks, then holding one is proof that the check happened. Lesson 24 shows what is at stake when the code that relies on an invariant is `unsafe`.",
            { list: [
              "A getter gives read access without write access: `pub fn start(&self) -> u32 { self.start }`. A method and a field may share a name.",
              "A tuple struct marks its fields the same way: `pub struct Meters(pub f64);`. Without the inner `pub`, only the module can wrap a number or get it back out.",
              "An enum is different. The variants of a `pub enum`, and the data in them, are all public. An enum exists to be matched on, and a hidden variant would make that impossible.",
              "The boundary is the module, not the type. Two types in one module can use each other's private fields, and so can a plain function written beside them.",
            ] },
            { compare: "In PHP and TypeScript, `private` is per class, and there are ways around it. PHP has reflection. TypeScript's check is gone by the time the program runs, and `(account as any).balance = -1` gets past it before then. Python relies on everyone honoring `_balance`. Rust has no reflection and no cast that reaches a private field, so safe code outside the module cannot touch one. An invariant guarded this way is a property of the program, not of its authors' discipline." },
            { pitfall: "Marking every field `pub` to get going is the habit to resist. Once a field is public, a value of the type can hold anything, and every method has to cope with that. Public fields are right for plain data with no rules, such as a point with an `x` and a `y`. As soon as there is a rule about what the fields may hold, keep them private and give the type a constructor." },
          ],
        },
        {
          title: 'Paths and use',
          body: [
            "A path names an item by its place in the tree of modules. What a path starts with decides where the search begins.",
            { table: {
              head: ['Starts with', 'Begins at', 'Example'],
              rows: [
                ['`crate::`', 'The root of this crate', '`crate::shop::pricing::with_tax`'],
                ['`super::`', 'The parent of the current module', '`super::oven_temperature()`'],
                ['A name in scope, or `self::`', 'The current module', '`pricing::with_tax`'],
                ['The name of another crate', 'That crate\'s root', '`std::collections::HashMap`'],
              ],
            } },
            "`use` brings the last name of a path into scope, so the rest of the module can write the short form.",
            { run: rs`mod shop {
    pub mod pricing {
        pub struct Price {
            pub cents: u64,
        }

        pub fn with_tax(price: &Price) -> Price {
            Price { cents: price.cents + price.cents / 5 }
        }
    }

    pub mod receipt {
        // A path from the crate root: it stays right if this module is moved.
        use crate::shop::pricing::{self, Price};

        pub fn line(name: &str, price: &Price) -> String {
            let total = pricing::with_tax(price);
            format!("{name:<8}{:>4}.{:02}", total.cents / 100, total.cents % 100)
        }
    }
}

use shop::pricing::Price;
use shop::receipt::line as receipt_line;

fn main() {
    let tea = Price { cents: 350 };
    println!("{}", receipt_line("tea", &tea));
    println!("{}", receipt_line("teapot", &Price { cents: 2400 }));
}`, name: 'paths.rs', expect: 'tea        4.20\nteapot    28.80\n' },
            { list: [
              "`use a::b::Item;` brings in one name.",
              "`use a::b::{self, Item, other};` brings in several from one place. `self` inside the braces is the module `b` itself.",
              "`use a::b::Item as Other;` renames, for when two names would collide.",
              "`use a::b::*;` brings in everything public. Keep it for tests, because a reader can no longer tell where a name came from.",
            ] },
            "A `use` applies to the module it is written in, and not to the modules inside that one. That is why `receipt` has a `use` line of its own, although the root imports `Price` too. By convention, a type is imported under its own name (`Price`, `HashMap`) and a function through its module (`pricing::with_tax`), so that a call shows where the function lives.",
            "Some names need no `use`: `Vec`, `String`, `Option`, `Some`, `Result`, `Box`, `Clone`, `Iterator` and a few dozen others. They are in the **prelude**, a short list of standard-library names that the compiler brings into every module.",
            "A `use` is private, like everything else: it makes a name for the module's own code. `pub use` puts that name on the module's public face. It is called a **re-export**, and it separates where an item is defined from where its users find it.",
            { run: rs`mod graphics {
    mod shapes {                               // private: an internal arrangement
        pub struct Circle {
            pub radius: f64,
        }

        pub fn area(circle: &Circle) -> f64 {
            std::f64::consts::PI * circle.radius * circle.radius
        }
    }

    mod colors {
        pub fn hex(red: u8, green: u8, blue: u8) -> String {
            format!("#{red:02x}{green:02x}{blue:02x}")
        }
    }

    // The public face of graphics: three names, wherever they happen to be defined.
    pub use colors::hex as color;
    pub use shapes::{area, Circle};
}

fn main() {
    let dot = graphics::Circle { radius: 2.0 };
    println!("{:.2} {}", graphics::area(&dot), graphics::color(255, 128, 0));
}`, name: 'reexport.rs', expect: '12.57 #ff8000\n' },
            "`main` writes `graphics::Circle` and never learns that a module called `shapes` exists. The path `graphics::shapes::Circle` is closed to it, because `shapes` is private. The author of `graphics` can split, merge or rename the inner modules, and no user has to change a line.",
            "Libraries do this constantly. `std::collections::HashMap` is defined two modules further down than its path suggests, in a private module of the standard library. The path you write is a re-export.",
            { compare: "`use` looks like `import` and does less. In Python, `import parser` finds a file and runs it. In TypeScript, `import { parse } from './parser'` names a file. A Rust `use` never loads or runs anything. It gives a shorter name to an item that is already part of the crate. What makes code part of the crate is `mod`, which the next section turns to. PHP is the nearest match: `use App\\Billing\\Invoice;` is also only an alias, and finding the file is the autoloader's job." },
          ],
        },
        {
          title: 'From one file to many',
          body: [
            "Inline modules are real Rust, and they are what a page with one editor can run. A project does not keep everything in one file. Here is a small program written the inline way first. It counts the words in a text. A `BTreeMap` is a map that keeps its keys in order, so the output is the same on every run, and its `entry` works like the `HashMap` one in lesson 14.",
            { run: rs`mod parser {
    use std::collections::BTreeMap;

    mod tokens {
        pub fn split(text: &str) -> impl Iterator<Item = &str> {
            text.split(|c: char| !c.is_alphanumeric())
                .filter(|word| !word.is_empty())
        }
    }

    pub fn count_words(text: &str) -> BTreeMap<String, usize> {
        let mut counts = BTreeMap::new();
        for word in tokens::split(text) {
            *counts.entry(word.to_lowercase()).or_insert(0) += 1;
        }
        counts
    }
}

mod report {
    use std::collections::BTreeMap;

    pub fn render(counts: &BTreeMap<String, usize>) -> String {
        let mut out = String::new();
        for (word, count) in counts {
            out.push_str(&format!("{count:>3}  {word}\n"));
        }
        out
    }
}

fn main() {
    let counts = parser::count_words("The cat saw the other cat.");
    print!("{}", report::render(&counts));
}`, name: 'wordcount.rs', expect: '  2  cat\n  1  other\n  1  saw\n  2  the\n' },
            "To split it up, replace a module's braces with a semicolon and move what was between them into a file named after the module. `mod parser;` says: this module exists, and its body is in another file.",
            { native: [
              "The same program as four source files. Nothing inside any module changes: not a path, not a `pub`.",
              { text: 'wordcount/\n├── Cargo.toml\n└── src/\n    ├── main.rs            the crate root: declares parser and report\n    ├── parser.rs          the module parser: declares tokens\n    ├── parser/\n    │   └── tokens.rs      the module parser::tokens\n    └── report.rs          the module report' },
              { code: rs`mod parser;          // the body of this module is in src/parser.rs
mod report;          // and this one in src/report.rs

fn main() {
    let counts = parser::count_words("The cat saw the other cat.");
    print!("{}", report::render(&counts));
}`, name: 'src/main.rs' },
              { code: rs`use std::collections::BTreeMap;

mod tokens;          // src/parser/tokens.rs

pub fn count_words(text: &str) -> BTreeMap<String, usize> {
    let mut counts = BTreeMap::new();
    for word in tokens::split(text) {
        *counts.entry(word.to_lowercase()).or_insert(0) += 1;
    }
    counts
}`, name: 'src/parser.rs' },
              { code: rs`pub fn split(text: &str) -> impl Iterator<Item = &str> {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|word| !word.is_empty())
}`, name: 'src/parser/tokens.rs' },
              { code: rs`use std::collections::BTreeMap;

pub fn render(counts: &BTreeMap<String, usize>) -> String {
    let mut out = String::new();
    for (word, count) in counts {
        out.push_str(&format!("{count:>3}  {word}\n"));
    }
    out
}`, name: 'src/report.rs' },
              { shell: 'cargo run', name: 'Terminal · build all four files and run' },
            ] },
            "The compiler opens one file, the crate root, and follows `mod` lines from there. Where it looks for a module's file depends only on where the `mod` line is written.",
            { table: {
              head: ['The line', 'Written in', 'Loads'],
              rows: [
                ['`mod parser;`', '`src/main.rs`, the crate root', '`src/parser.rs`'],
                ['`mod tokens;`', '`src/parser.rs`', '`src/parser/tokens.rs`'],
                ['`mod tokens;`', '`src/parser/mod.rs`, the older name for `src/parser.rs`', '`src/parser/tokens.rs`'],
              ],
            } },
            "The folders mirror the module tree: the children of `parser` live in a folder called `parser`. You will meet `parser/mod.rs` in older projects. It means the same as `parser.rs`, and having both is an error.",
            { pitfall: "A file that no `mod` line names is not part of the program. The compiler never opens it, so it reports nothing about it: no errors inside it, and no complaint that it is unused. When code in a new file seems to be ignored, the `mod` line is missing. And a `mod` line goes in exactly one place, the parent module. Every other file reaches the module with a path such as `crate::parser::count_words`. Writing `mod parser;` a second time somewhere else would declare a second module, not refer to the first." },
            "A **crate** is what the compiler builds in one go: one tree of modules with one root. A **binary crate** has a `main`, and its root is `src/main.rs`. A **library crate** has no `main`, its root is `src/lib.rs`, and it exists to be used by other crates. A **package** is a folder with a `Cargo.toml`, and it can hold both. Once a program grows, the usual arrangement is a library that holds the logic and a small binary that calls it.",
            { native: [
              { code: rs`pub mod parser;
pub mod report;`, name: 'src/lib.rs' },
              { code: rs`use wordcount::{parser, report};

fn main() {
    let counts = parser::count_words("The cat saw the other cat.");
    print!("{}", report::render(&counts));
}`, name: 'src/main.rs' },
              "The binary is a crate of its own, and it reaches the library by the package's name, `wordcount`. It sees what the library marks `pub` and nothing else, exactly as a stranger's program would. This is where `pub(crate)` earns its place: it is for items that the whole library shares and no user should see.",
            ] },
            { compare: "Python and TypeScript take the module tree from the file system: a file is a module because it exists, and an import names its path. Rust builds the tree from `mod` declarations, and the files follow from the tree. PHP is the nearest again. PSR-4 autoloading maps `App\\Parser\\Tokens` to `src/Parser/Tokens.php`, much as `mod` lines map `crate::parser::tokens` to `src/parser/tokens.rs`. The difference is when a mistake shows. A missing Rust file stops the build. A missing PHP class is found when that line runs." },
          ],
        },
        {
          title: 'Cargo and crates.io',
          body: [
            "Cargo is the build tool, the package manager and the test runner behind one command. It has been in the \"On your machine\" boxes since lesson 1. This section is about the part with no counterpart in this page: other people's code.",
            { native: [
              "`cargo new wordcount` writes `src/main.rs` and a manifest, `Cargo.toml`. Add `--lib` for a library with `src/lib.rs`.",
              { code: `[package]
name = "wordcount"
version = "0.1.0"
edition = "2024"

[dependencies]`, name: 'Cargo.toml', lang: 'toml' },
            ] },
            "The standard library is small on purpose. It has no regular expressions, no random numbers, no JSON, no HTTP client and no calendar dates. Those come from crates published on **crates.io**, the public registry. A dependency is one line under `[dependencies]`, and `cargo add` writes it for you.",
            { native: [
              { shell: 'cargo add regex', name: 'Terminal · add a dependency' },
              { code: `[dependencies]
regex = "1.13.2"`, name: 'Cargo.toml', lang: 'toml' },
              "Your number will be newer: `cargo add` takes the latest release. In the code, the crate's name is the first step of a path, the way `std` is.",
              { code: rs`use regex::Regex;

fn main() {
    let date = Regex::new(r"\d{4}-\d{2}-\d{2}").unwrap();
    let text = "released 2025-02-20, patched 2025-03-18";
    for found in date.find_iter(text) {
        println!("{}", found.as_str());
    }
}`, name: 'src/main.rs' },
              { shell: 'cargo run', name: 'Terminal · download, compile and run' },
              { text: '2025-02-20\n2025-03-18' },
              "The first `cargo run` downloads `regex` and the crates it depends on in turn, and compiles them all. Later builds reuse the result.",
            ] },
            "A version in `Cargo.toml` is a requirement, not an exact version. It names the oldest release you accept and allows newer ones that promise to be compatible.",
            { table: {
              head: ['Written', 'Accepts'],
              rows: [
                ['`"1.13.2"`', 'From 1.13.2 up to, and not including, 2.0.0.'],
                ['`"1"`', 'Any 1.x release.'],
                ['`"0.9"`', 'From 0.9.0 up to, and not including, 0.10.0. Before 1.0, the second number is the one that signals a breaking change.'],
                ['`"=1.13.2"`', 'That release and no other.'],
              ],
            } },
            "A range means the same manifest could build with different versions on different days. `Cargo.lock` prevents that. The first build picks one exact version of every dependency, and of every dependency of a dependency, and writes them all to that file. Every later build uses those versions, on your machine, on a colleague's and on the build server, until you run `cargo update`. Commit `Cargo.lock` along with `Cargo.toml`.",
            { table: {
              head: ['Command', 'What it does'],
              rows: [
                ['`cargo build`', 'Compiles the package and its dependencies into `target/debug`.'],
                ['`cargo run`', 'Builds, then runs the binary.'],
                ['`cargo build --release`', 'An optimized build, in `target/release`. Use it for anything you measure or ship.'],
                ['`cargo add name`', 'Adds the newest release of a crate to `Cargo.toml`.'],
                ['`cargo update`', 'Moves the locked versions to the newest that `Cargo.toml` allows.'],
                ['`cargo tree`', 'Prints the tree of dependencies.'],
              ],
            } },
            "A crate can make parts of itself optional, as named **features**. `cargo add serde --features derive` writes a line such as `serde = { version = \"1.0.229\", features = [\"derive\"] }`, which switches on the part of `serde` that generates conversion code for your types. A feature you leave off is not compiled.",
            { compare: "`Cargo.toml` is `package.json`, `composer.json` or `pyproject.toml`. `Cargo.lock` is `package-lock.json`, `composer.lock` or `uv.lock`. crates.io is npm, Packagist or PyPI. Two things differ. The project has no `node_modules` or `vendor` folder and no virtual environment to activate: sources are downloaded once to a cache in your home directory, and compiled into the project's `target` folder. And dependencies are compiled into the executable. What you ship is one file, which needs no interpreter and no installed packages where it runs." },
            { aside: "A dependency is a crate like yours. Cargo calls `rustc` once for each, in dependency order, and keeps the results in `target`. That is why the first build of a project takes a while and the next takes a second. It is also why `std` never needed adding: it is a crate that every program is linked with." },
          ],
        },
        {
          title: 'Tests: what the challenges have been running',
          body: [
            "A test is a function with `#[test]` above it. It passes if it returns and fails if it panics. `assert!`, `assert_eq!` and `assert_ne!` are macros that panic with a description of what was wrong. There is no framework to install and no class to extend.",
            { native: [
              "Unit tests go in the file they test, in a child module.",
              { code: rs`use std::collections::BTreeMap;

mod tokens;

pub fn count_words(text: &str) -> BTreeMap<String, usize> {
    let mut counts = BTreeMap::new();
    for word in tokens::split(text) {
        *counts.entry(word.to_lowercase()).or_insert(0) += 1;
    }
    counts
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn counts_repeated_words() {
        let counts = count_words("the cat saw the other cat");
        assert_eq!(counts["the"], 2);
        assert_eq!(counts["cat"], 2);
        assert_eq!(counts.len(), 4);
    }

    #[test]
    fn ignores_case_and_punctuation() {
        let counts = count_words("Stop. STOP! stop?");
        assert_eq!(counts.len(), 1);
        assert_eq!(counts["stop"], 3);
    }

    #[test]
    fn splits_on_anything_that_is_not_a_letter_or_digit() {
        let words: Vec<&str> = tokens::split("a-b, c").collect();
        assert_eq!(words, ["a", "b", "c"]);
    }

    #[test]
    #[should_panic(expected = "no entry")]
    fn a_missing_word_has_no_entry() {
        let counts = count_words("one two");
        counts.get("three").expect("no entry");
    }
}`, name: 'src/parser.rs' },
              { shell: 'cargo test', name: 'Terminal · build and run every test' },
              { text: 'running 4 tests\ntest parser::tests::counts_repeated_words ... ok\ntest parser::tests::ignores_case_and_punctuation ... ok\ntest parser::tests::splits_on_anything_that_is_not_a_letter_or_digit ... ok\ntest parser::tests::a_missing_word_has_no_entry - should panic ... ok\n\ntest result: ok. 4 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.00s' },
            ] },
            { list: [
              "`#[cfg(test)]` compiles the module only for `cargo test`. In a normal build the tests do not exist, so they cost nothing.",
              "`use super::*;` brings in everything from the parent module. Now the rule from the first section pays off: a child module may use its parent's private items. `tests` calls `tokens::split`, which no code outside `parser` can reach. Unit tests can test private functions, and they need no special access to do it.",
              "`#[should_panic]` turns the rule around: the test passes only if its body panics.",
              "A test may return a `Result` and use `?`. Returning `Err` fails it.",
              "`cargo test stop` runs only the tests with `stop` in their names.",
              "Tests run on several threads at once and in no fixed order, so one test must not depend on what another did.",
            ] },
            "When an `assert_eq!` fails, the report shows both values. Change the `3` in the second test to a `2` and `cargo test` prints this, among the passes:",
            { text: "---- parser::tests::ignores_case_and_punctuation stdout ----\n\nthread 'parser::tests::ignores_case_and_punctuation' (48213) panicked at src/parser.rs:29:9:\nassertion `left == right` failed\n  left: 3\n right: 2\n\ntest result: FAILED. 3 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out" },
            "Tests can live in three places, and the place decides what they can see.",
            { table: {
              head: ['Where', 'What it can use', 'Good for'],
              rows: [
                ['A `#[cfg(test)] mod tests` inside a source file', 'Everything in that module, private items included', 'Unit tests'],
                ['A file in `tests/`, beside `src/`', 'Only what the library marks `pub`. Each file is a crate of its own.', 'Testing the library the way a user calls it'],
                ['A code block in a `///` comment', 'Only what the library marks `pub`', 'Examples in the documentation, which then cannot go out of date'],
              ],
            } },
            { native: [
              { code: rs`use wordcount::parser::count_words;

#[test]
fn an_empty_text_has_no_words() {
    assert!(count_words("").is_empty());
}`, name: 'tests/counts.rs' },
              "The second and third kinds need a library crate, because they use it from outside. `cargo test` runs all three kinds.",
            ] },
            "**The challenges in this course are tests of the first kind.** When you press the button, the page puts one file together: your code first, so that the compiler's line numbers are the editor's, and then a child module that holds the tests. For the first challenge of lesson 1 it looked like this.",
            { code: rs`fn to_fahrenheit(celsius: f64) -> f64 {          // your code, from line 1
    celsius * 9.0 / 5.0 + 32.0
}

mod fm_tests {
    use super::*;                                // so the tests can call private functions

    pub fn case_0() {                            // "Freezing point"
        assert_eq!(to_fahrenheit(0.0), 32.0);
    }

    pub fn case_1() {                            // "Boiling point"
        assert_eq!(to_fahrenheit(100.0), 212.0);
    }
}

fn main() {
    // Calls each case, catches its panic if there is one, and prints the result for the page.
}` },
            "The one difference from `cargo test` is who calls the functions. The Playground runs programs, not test suites, so the page supplies a `main` that calls each test, catches the panic if there is one, and reports. A test runner is no more than that, and a small one fits in a cell.",
            { run: rs`use std::panic;

// The middle value of three. One branch is wrong.
fn middle(a: i32, b: i32, c: i32) -> i32 {
    if (a <= b && b <= c) || (c <= b && b <= a) {
        b
    } else if (b <= a && a <= c) || (c <= a && a <= b) {
        a
    } else {
        b
    }
}

fn middle_of_sorted() {
    assert_eq!(middle(1, 2, 3), 2);
}

fn middle_comes_first() {
    assert_eq!(middle(2, 1, 3), 2);
}

fn middle_comes_last() {
    assert_eq!(middle(1, 3, 2), 2);
}

fn main() {
    panic::set_hook(Box::new(|_| {}));         // do not print the panic messages

    // fn() is the type of a plain function that takes and returns nothing.
    let tests: [(&str, fn()); 3] = [
        ("middle_of_sorted", middle_of_sorted),
        ("middle_comes_first", middle_comes_first),
        ("middle_comes_last", middle_comes_last),
    ];

    let mut failed = 0;
    for (name, test) in tests {
        // catch_unwind calls the function, and returns Err if it panicked.
        let passed = panic::catch_unwind(test).is_ok();
        if !passed {
            failed += 1;
        }
        println!("test {name} ... {}", if passed { "ok" } else { "FAILED" });
    }
    println!("{} passed; {failed} failed", tests.len() - failed);
}`, name: 'tiny_runner.rs', expect: 'test middle_of_sorted ... ok\ntest middle_comes_first ... ok\ntest middle_comes_last ... FAILED\n2 passed; 1 failed\n' },
            "A function's name is a value: `middle_of_sorted`, without parentheses, has the type `fn()` and can sit in an array. `catch_unwind` stops a panic where it is called, instead of letting it end the program. It is meant for exactly this kind of boundary, a test runner or a thread pool, and not for handling errors.",
            "Two of the three tests pass. Had the third not been written, the bug in the last branch of `middle` would have gone unnoticed. A set of tests is as good as the cases in it, and the last challenge of this lesson is about choosing them.",
            { compare: "pytest, PHPUnit, Jest and Vitest are separate tools, each with its own discovery rules, fixtures and assertion library. Rust's test support is part of the language and of Cargo: an attribute, three macros, one command. An assertion is a plain panic. What you may miss, such as parameterized cases, property tests or mocks, comes from crates listed under `[dev-dependencies]`, which are compiled for tests only." },
          ],
        },
        {
          title: 'The everyday toolchain',
          body: [
            "Five commands cover most of a working day. All of them come with a default `rustup` installation. If `cargo clippy` or `cargo fmt` is reported as not installed, `rustup component add clippy rustfmt` adds them.",
            { table: {
              head: ['Command', 'What it does', 'When'],
              rows: [
                ['`cargo check`', 'Runs every check and generates no code, which makes it several times faster than a build.', 'All the time, while writing'],
                ['`cargo clippy`', 'The same checks, plus several hundred lints for likely bugs and for code that has a more idiomatic form.', 'Before each commit'],
                ['`cargo fmt`', 'Rewrites the source in the standard style.', 'On save'],
                ['`cargo test`', 'Builds and runs unit tests, the files in `tests/` and the examples in the documentation.', 'Before each commit, and on the build server'],
                ['`cargo doc --open`', 'Builds HTML documentation for your crate and every dependency, and opens it.', 'When finding your way around an API'],
              ],
            } },
            "**Clippy** teaches idiomatic Rust one warning at a time. This function compiles without a word from `rustc`.",
            { code: rs`fn total(values: &[u32]) -> u32 {
    let mut sum = 0;
    for i in 0..values.len() {
        sum += values[i];
    }
    sum
}` },
            "Clippy reports that the loop variable `i` is only used to index `values`, and suggests `for value in values`. Each lint has a name, here `needless_range_loop`, and a page that explains the reasoning. Reading those pages is one of the quickest ways to pick up the idioms.",
            "**rustfmt**, behind `cargo fmt`, ends arguments about layout. There is one style and nearly every Rust project uses it, so code from a stranger's crate reads like your own.",
            "**Doc comments** start with `///` and describe the item below them, in Markdown. `cargo doc` turns them into pages like the standard library's own, and docs.rs hosts those pages for every crate on crates.io. A code block in a doc comment is compiled and run by `cargo test`, so an example in the documentation is also a test.",
            { native: [
              { code: rs`/// Counts how often each word appears, ignoring case.
///
/// ${'```'}
/// let counts = wordcount::parser::count_words("to be or not to be");
/// assert_eq!(counts["be"], 2);
/// ${'```'}
pub fn count_words(text: &str) -> BTreeMap<String, usize> {`, name: 'src/parser.rs' },
            ] },
            "**rust-analyzer** is the language server behind Rust support in VS Code, Zed, Neovim and others. It runs the compiler's checks as you type and puts the results in the editor.",
            { list: [
              "Errors and warnings appear on the line, with the same text you have been reading in this course.",
              "Inferred types are shown beside each `let`, which helps most with long iterator chains.",
              "Go to definition works into the standard library and into every dependency, because their source is on your disk.",
              "Many `help:` suggestions become one-key fixes: add a missing `use`, fill in the arms of a `match`, add the `mut` the compiler asked for.",
            ] },
            "**Editions** explain the `edition = \"2024\"` line in `Cargo.toml`. Rust makes a change that could break existing code only in a new edition, of which there have been four: 2015, 2018, 2021 and 2024. Each crate names its own edition, crates of different editions work together in one program, and every compiler supports them all. So `rustup update`, which brings a new compiler every six weeks, does not break code that compiled before.",
            { tip: "A routine worth having from the first project: `cargo fmt`, `cargo clippy` and `cargo test` before every commit. Most Rust projects run those three on their build server, and reject a change that fails any of them." },
          ],
        },
      ],
      takeaways: [
        "A module is a namespace and a privacy boundary. An item is private unless marked `pub`, and private means usable by the module it is declared in and by everything inside that module.",
        "Private fields let a type keep an invariant, because only the code in its module can break it. `E0451` and `E0616` are the compiler holding outside code to that.",
        "`use` shortens a path and loads nothing. `pub use` re-exports a name, so a module's public face does not have to match its layout.",
        "`mod name;` declares a module whose body is in `name.rs`. A file that no `mod` line names is not compiled.",
        "`Cargo.toml` says which versions you accept, and `Cargo.lock` records which ones you got. Commit both.",
        "A test is a function that passes unless it panics. Unit tests sit in a child module of the code they test, which is why they can reach private items.",
      ],
      quiz: [
        {
          q: 'Does this program compile?',
          code: rs`mod audio {
    pub mod codec {
        fn decode() -> u32 {
            44100
        }

        pub fn rate() -> u32 {
            decode()
        }
    }

    pub fn play() -> u32 {
        codec::decode()
    }
}

fn main() {
    println!("{} {}", audio::play(), audio::codec::rate());
}`,
          options: [
            { t: 'No: `play` cannot call `decode`, which is private to `codec`', ok: true, why: "A private item is usable inside the module that declares it and in the modules inside that one. `audio` is the parent of `codec`, so it is outside. The compiler reports `E0603` on line 13." },
            { t: 'Yes: a module can use everything in the modules it contains', why: "It is the other way around. A child sees its parents' private items, and a parent sees only what its children mark `pub`. Containing a module gives no access to its details." },
            { t: 'No: `main` cannot call `audio::codec::rate`, because `rate` calls a private function', why: "Privacy checks the path you write, not what the function does once it is called. `rate` is `pub` in a `pub` module, and calling private helpers is what public functions are for." },
            { t: 'No: `mod audio` is not `pub`, so `main` cannot name it', why: "`audio` and `main` are both items of the crate root, and items in the same module see each other without `pub`." },
          ],
          verify: 'E0603',
        },
        {
          q: 'Does this program compile?',
          code: rs`mod shop {
    fn tax(cents: u64) -> u64 {
        cents / 5
    }

    pub mod checkout {
        pub fn total(cents: u64) -> u64 {
            cents + super::tax(cents)
        }
    }
}

fn main() {
    println!("{}", shop::checkout::total(500));
}`,
          options: [
            { t: 'Yes, and it prints `600`', ok: true, why: "`tax` is private to `shop`, and `checkout` is inside `shop`, so it may use it. `super::` names the parent module. This is the same access that lets a `tests` module call the private functions of the code it tests." },
            { t: 'No: `tax` is private, and `checkout` is a different module', why: "Different, but nested inside the module that declares `tax`. Private means private to that module and everything in it." },
            { t: 'No: `super::` can only reach items marked `pub`', why: "`super::` only says where the path starts. Whether the item may be used is decided by the privacy rule, and a child may use its parent's private items." },
            { t: 'No: `main` ends up running `tax`, which it is not allowed to see', why: "`main` names `shop::checkout::total`, and every step of that path is visible to it. What `total` calls is the business of `total`. Otherwise a public function could never have a private helper." },
          ],
          verify: 'compiles',
        },
        {
          q: 'Does this program compile?',
          code: rs`mod bank {
    pub struct Account {
        balance: i64,
    }

    pub struct Auditor;

    impl Auditor {
        pub fn inspect(&self, account: &Account) -> i64 {
            account.balance
        }
    }

    pub fn open(balance: i64) -> Account {
        Account { balance }
    }
}

fn main() {
    let account = bank::open(50);
    println!("{}", bank::Auditor.inspect(&account));
}`,
          options: [
            { t: 'Yes, and it prints `50`', ok: true, why: "The privacy boundary is the module, not the type. `Auditor::inspect` and `open` are written inside `mod bank`, where `balance` is declared, so both may use the field." },
            { t: 'No: `balance` is private to `Account`, and `Auditor` is another type', why: "That is how `private` works in PHP, TypeScript and Java, where the class is the boundary. In Rust the module is. Everything in `bank` can use the field, whichever type's `impl` it sits in." },
            { t: 'No: `main` cannot hold a value that has a private field', why: "Holding a value, passing it on and calling its public methods never touch the field. `main` would be refused only if it wrote `account.balance`, which is `E0616`." },
            { t: 'No: `open` builds an `Account` with a struct literal, which private fields forbid', why: "They forbid it from outside the module, as `E0451`. `open` is inside `bank`. A constructor function like this one is exactly how a type with private fields gets built." },
          ],
          verify: 'compiles',
        },
        {
          q: 'In a Cargo project, `src/main.rs` contains `mod parser;` and `src/parser.rs` contains `mod tokens;`. Which file holds the body of `tokens`?',
          options: [
            { t: '`src/parser/tokens.rs`', ok: true, why: "`tokens` is declared inside `parser`, so it is the module `parser::tokens`, and the children of `parser` live in the folder `src/parser`. The folders follow the module tree." },
            { t: '`src/tokens.rs`', why: "That would be a module declared in the crate root, with `mod tokens;` in `main.rs`. A module declared inside `parser` is looked for one folder down." },
            { t: 'Any file named `tokens.rs`: the compiler searches the project for it', why: "Nothing is searched. The location follows from where the `mod` line is written, and a file in any other place is not found." },
            { t: 'None is needed until some file writes `use parser::tokens`', why: "That is the Python and TypeScript model, where an import names a file and loads it. In Rust, `use` only shortens a path. The `mod` line is the declaration, and its file must exist or the build fails." },
          ],
        },
        {
          q: 'What is `Cargo.lock` for?',
          options: [
            { t: 'It records the exact version of every dependency that was chosen, so that every build uses the same ones', ok: true, why: "`Cargo.toml` gives ranges, and a range can match a newer release tomorrow. The lock file pins what was picked, for direct dependencies and for theirs, until you run `cargo update`." },
            { t: 'It stops two `cargo` commands from building the same project at once', why: "Cargo does take a lock while it builds, but that one lives in the `target` folder. `Cargo.lock` is a list of versions, and it belongs in version control." },
            { t: 'It lists the versions you are willing to accept, and you edit it by hand', why: "That describes `Cargo.toml`. Cargo writes `Cargo.lock`, and you change it with `cargo update`, not with an editor." },
            { t: 'It holds the compiled dependencies, so that they are not rebuilt', why: "Compiled code goes in the `target` folder, which is not committed. `Cargo.lock` is a small text file of names, versions and checksums." },
          ],
        },
        {
          kind: 'multi',
          q: 'Where can tests that `cargo test` runs be written?',
          options: [
            { t: 'In a `#[cfg(test)] mod tests` inside the file they test', ok: true, why: "The usual home of unit tests. As a child module, it can use the private items of the code beside it." },
            { t: 'In a file under `tests/`, next to `src/`', ok: true, why: "An integration test. Each file there is compiled as a crate of its own and sees only the library's `pub` items." },
            { t: 'In a code block inside a `///` comment', ok: true, why: "A doc test. The example is compiled and run, so the documentation cannot drift away from the code." },
            { t: 'As `#[test]` functions directly in `src/lib.rs`, with no `tests` module', ok: true, why: "Any function marked `#[test]` in any module of the crate is run. The `tests` module is a convention that keeps test helpers out of normal builds." },
            { t: 'In `Cargo.toml`, under `[dev-dependencies]`', why: "That section lists crates that are compiled only for tests, such as a property-testing library. It holds no test code." },
            { t: 'Only outside the crate, because tests cannot use private items', why: "Unit tests can, and that is the reason they sit in a child module: a child may use its parent's private items." },
          ],
          hint: "Four of these are places for test code. Think of unit tests, integration tests and examples in the documentation.",
        },
      ],
      challenges: [
        {
          id: 'make-it-public',
          title: 'Open the right doors',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "Everything in this module is private, so nothing outside it can use it. The tests are outside: they are written in a module beside `library`, and they reach in through paths such as `library::Book::new` and `library::limits::reading_hours`.",
            "Add `pub` where it is needed and nowhere else. The two fields and `tidy` are details that should stay private. Every step of a path needs its own `pub`: the module, the type, and the function or method.",
            "The compiler reports each closed door as `E0603` or `E0624`. An error whose line number is past the end of your code is in a test. Read the note under it, which points at the definition in your code.",
          ],
          starter: rs`mod library {
    struct Book {
        title: String,
        pages: u32,
    }

    impl Book {
        fn new(title: &str, pages: u32) -> Book {
            Book { title: tidy(title), pages }
        }

        fn title(&self) -> &str {
            &self.title
        }

        fn is_long(&self) -> bool {
            self.pages > limits::LONG_BOOK
        }
    }

    // A helper for this module only.
    fn tidy(title: &str) -> String {
        title.trim().to_string()
    }

    mod limits {
        const LONG_BOOK: u32 = 400;

        fn reading_hours(pages: u32) -> u32 {
            pages.div_ceil(40)
        }
    }
}`,
          hints: [
            "Start with the errors inside your own code. `is_long` uses `limits::LONG_BOOK`, and a parent module cannot see a private item of its child.",
            "For `library::Book::new` the tests need `pub struct Book` and `pub fn new`. Methods are private by default, like every other item.",
            "Seven additions in all: `pub struct Book`, `pub fn` on `new`, `title` and `is_long`, `pub mod limits`, `pub const LONG_BOOK` and `pub fn reading_hours`.",
          ],
          solution: rs`mod library {
    pub struct Book {
        title: String,
        pages: u32,
    }

    impl Book {
        pub fn new(title: &str, pages: u32) -> Book {
            Book { title: tidy(title), pages }
        }

        pub fn title(&self) -> &str {
            &self.title
        }

        pub fn is_long(&self) -> bool {
            self.pages > limits::LONG_BOOK
        }
    }

    // A helper for this module only.
    fn tidy(title: &str) -> String {
        title.trim().to_string()
    }

    pub mod limits {
        pub const LONG_BOOK: u32 = 400;

        pub fn reading_hours(pages: u32) -> u32 {
            pages.div_ceil(40)
        }
    }
}`,
          solutionNote: "`mod library` itself needs no `pub`. It is an item of the crate root, and the tests are in a module inside the root, so they can see it.",
          tests: [
            { label: 'A book can be made and asked for its title', body: rs`let book = library::Book::new("  Dune ", 612);
assert_eq!(book.title(), "Dune");` },
            { label: 'is_long compares the pages with the limit', body: rs`assert!(library::Book::new("Dune", 612).is_long());
assert!(!library::Book::new("Emma", 400).is_long());` },
            { label: 'The limit can be read from outside', body: rs`assert_eq!(library::limits::LONG_BOOK, 400);` },
            { label: 'reading_hours can be called through its path', body: rs`assert_eq!(library::limits::reading_hours(100), 3);
assert_eq!(library::limits::reading_hours(400), 10);` },
          ],
        },
        {
          id: 'bank-account',
          title: 'A balance that cannot go negative',
          level: 'core',
          prompt: [
            "`bank::Account` holds a balance in cents. The field is private, so the methods in this module are the only code that can change it. That makes them responsible for the invariant: **the balance is never negative.**",
            "Finish `deposit`, `withdraw` and `transfer_to`. Each returns `Ok(())` when it did the work. An amount that is zero or negative is refused with `Refused::NotPositive`. Taking out more than the account holds is refused with `Refused::InsufficientFunds`. A refused call must leave every balance as it was.",
            "The starter does the arithmetic and none of the refusing. Look at what a deposit of `-500` does to it.",
          ],
          signature: 'impl Account {\n    pub fn new() -> Account\n    pub fn balance(&self) -> i64\n    pub fn deposit(&mut self, cents: i64) -> Result<(), Refused>\n    pub fn withdraw(&mut self, cents: i64) -> Result<(), Refused>\n    pub fn transfer_to(&mut self, other: &mut Account, cents: i64) -> Result<(), Refused>\n}',
          starter: rs`mod bank {
    #[derive(Debug, PartialEq)]
    pub enum Refused {
        NotPositive,           // the amount was zero or negative
        InsufficientFunds,     // the account does not hold that much
    }

    pub struct Account {
        balance: i64,          // in cents, and never negative
    }

    impl Account {
        pub fn new() -> Account {
            Account { balance: 0 }
        }

        pub fn balance(&self) -> i64 {
            self.balance
        }

        pub fn deposit(&mut self, cents: i64) -> Result<(), Refused> {
            self.balance += cents;
            Ok(())
        }

        pub fn withdraw(&mut self, cents: i64) -> Result<(), Refused> {
            self.balance -= cents;
            Ok(())
        }

        // Moves cents from this account to the other, or changes neither.
        pub fn transfer_to(&mut self, other: &mut Account, cents: i64) -> Result<(), Refused> {
            self.balance -= cents;
            other.balance += cents;
            Ok(())
        }
    }
}`,
          hints: [
            "Return early when the call must be refused, before anything changes: `if cents <= 0 { return Err(Refused::NotPositive); }`.",
            "`withdraw` has a second refusal after that one: `if cents > self.balance { return Err(Refused::InsufficientFunds); }`. Taking out exactly the balance is allowed.",
            "`transfer_to` is a withdrawal followed by a deposit: `self.withdraw(cents)?;` then `other.deposit(cents)`. If the withdrawal is refused, `?` returns before the other account is touched.",
          ],
          solution: rs`mod bank {
    #[derive(Debug, PartialEq)]
    pub enum Refused {
        NotPositive,           // the amount was zero or negative
        InsufficientFunds,     // the account does not hold that much
    }

    pub struct Account {
        balance: i64,          // in cents, and never negative
    }

    impl Account {
        pub fn new() -> Account {
            Account { balance: 0 }
        }

        pub fn balance(&self) -> i64 {
            self.balance
        }

        pub fn deposit(&mut self, cents: i64) -> Result<(), Refused> {
            if cents <= 0 {
                return Err(Refused::NotPositive);
            }
            self.balance += cents;
            Ok(())
        }

        pub fn withdraw(&mut self, cents: i64) -> Result<(), Refused> {
            if cents <= 0 {
                return Err(Refused::NotPositive);
            }
            if cents > self.balance {
                return Err(Refused::InsufficientFunds);
            }
            self.balance -= cents;
            Ok(())
        }

        // Moves cents from this account to the other, or changes neither.
        pub fn transfer_to(&mut self, other: &mut Account, cents: i64) -> Result<(), Refused> {
            self.withdraw(cents)?;
            other.deposit(cents)
        }
    }
}`,
          solutionNote: "`transfer_to` reuses the two methods that already guard the invariant, so it has no checks of its own to get wrong. It also needs no check for a transfer from an account to itself: `account.transfer_to(&mut account, 5)` asks for two `&mut` to one value, and the aliasing rule of lesson 7 refuses it.",
          tests: [
            { label: 'A new account is empty', body: rs`assert_eq!(bank::Account::new().balance(), 0);` },
            { label: 'Deposits add up', body: rs`let mut account = bank::Account::new();
assert_eq!(account.deposit(1_000), Ok(()));
assert_eq!(account.deposit(250), Ok(()));
assert_eq!(account.balance(), 1_250);` },
            { label: 'A deposit of zero or less is refused and changes nothing', body: rs`let mut account = bank::Account::new();
account.deposit(1_000).unwrap();
assert_eq!(account.deposit(-500), Err(bank::Refused::NotPositive), "a negative deposit is a withdrawal with no checks");
assert_eq!(account.deposit(0), Err(bank::Refused::NotPositive));
assert_eq!(account.balance(), 1_000);` },
            { label: 'A withdrawal within the balance succeeds, down to zero', body: rs`let mut account = bank::Account::new();
account.deposit(1_000).unwrap();
assert_eq!(account.withdraw(400), Ok(()));
assert_eq!(account.balance(), 600);
assert_eq!(account.withdraw(600), Ok(()), "taking out exactly the balance is allowed");
assert_eq!(account.balance(), 0);` },
            { label: 'An overdraft is refused and changes nothing', body: rs`let mut account = bank::Account::new();
account.deposit(300).unwrap();
assert_eq!(account.withdraw(301), Err(bank::Refused::InsufficientFunds));
assert_eq!(account.balance(), 300);` },
            { label: 'A withdrawal of zero or less is refused', body: rs`let mut account = bank::Account::new();
assert_eq!(account.withdraw(-50), Err(bank::Refused::NotPositive), "a negative withdrawal would add money");
assert_eq!(account.withdraw(0), Err(bank::Refused::NotPositive));
assert_eq!(account.balance(), 0);` },
            { label: 'A transfer moves money from one account to the other', body: rs`let mut ada = bank::Account::new();
let mut bob = bank::Account::new();
ada.deposit(900).unwrap();
assert_eq!(ada.transfer_to(&mut bob, 350), Ok(()));
assert_eq!(ada.balance(), 550);
assert_eq!(bob.balance(), 350);` },
            { label: 'A refused transfer changes neither account', body: rs`let mut ada = bank::Account::new();
let mut bob = bank::Account::new();
ada.deposit(100).unwrap();
bob.deposit(40).unwrap();
assert_eq!(ada.transfer_to(&mut bob, 101), Err(bank::Refused::InsufficientFunds));
assert_eq!(ada.transfer_to(&mut bob, -40), Err(bank::Refused::NotPositive), "a negative transfer would pull money out of the other account");
assert_eq!(ada.balance(), 100, "the sender must keep its money when the transfer is refused");
assert_eq!(bob.balance(), 40, "the receiver must not change when the transfer is refused");` },
          ],
        },
        {
          id: 'reexport-units',
          title: 'A flat front for a deep module',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "The module `units` is organized into inner modules, and that arrangement is its own business. Its users, here the tests, want three names directly under `units`: the type `units::Meters`, and the functions `units::feet` and `units::to_celsius`.",
            "Add `pub use` lines so that those paths resolve. Keep `length`, `imperial` and `temperature` private, and leave the functions where they are defined. Notice that the third name is not what its function is called.",
            "One of the three is two modules down. A `pub use` is checked like any other path, so `units` can only re-export what `units` itself can see. Until the names exist, the tests fail to compile with `E0425`, and the note under each error says where the item it could not reach is defined.",
          ],
          starter: rs`mod units {
    mod length {
        pub struct Meters(pub f64);

        mod imperial {
            use super::Meters;

            pub fn feet(feet: f64) -> Meters {
                Meters(feet * 0.3048)
            }
        }
    }

    mod temperature {
        pub fn fahrenheit_to_celsius(degrees: f64) -> f64 {
            (degrees - 32.0) * 5.0 / 9.0
        }
    }

    // Your pub use lines go here, and one goes inside length.
}`,
          hints: [
            "Begin with the nearest one: `pub use length::Meters;` inside `units`. `as` gives a re-export another name: `pub use temperature::fahrenheit_to_celsius as to_celsius;`.",
            "`pub use length::imperial::feet;` is refused with `E0603`, because `imperial` is private to `length` and `units` is outside `length`. Let `length` pass the name up first.",
            "Inside `length`, write `pub use imperial::feet;`. Now `feet` is a public name of `length`, and `units` can write `pub use length::{feet, Meters};`.",
          ],
          solution: rs`mod units {
    mod length {
        pub struct Meters(pub f64);

        mod imperial {
            use super::Meters;

            pub fn feet(feet: f64) -> Meters {
                Meters(feet * 0.3048)
            }
        }

        pub use imperial::feet;
    }

    mod temperature {
        pub fn fahrenheit_to_celsius(degrees: f64) -> f64 {
            (degrees - 32.0) * 5.0 / 9.0
        }
    }

    pub use length::{feet, Meters};
    pub use temperature::fahrenheit_to_celsius as to_celsius;
}`,
          solutionNote: "Each module passes up what its parent should see, one level at a time. `pub(super) mod imperial` would also let `units` name `length::imperial::feet`, at the price of `units` knowing how `length` is laid out inside.",
          tests: [
            { label: 'units::Meters names the type', body: rs`let height = units::Meters(1.5);
assert_eq!(height.0, 1.5);` },
            { label: 'units::feet reaches the function two modules down', body: rs`let length: units::Meters = units::feet(10.0);
assert!((length.0 - 3.048).abs() < 1e-9);` },
            { label: 'units::to_celsius is the temperature function under a new name', body: rs`assert_eq!(units::to_celsius(212.0), 100.0);
assert_eq!(units::to_celsius(32.0), 0.0);` },
            { label: 'units::Meters and the result of units::feet are one type', body: rs`let mut lengths = vec![units::Meters(2.0)];
lengths.push(units::feet(100.0));
let total: f64 = lengths.iter().map(|length| length.0).sum();
assert!((total - 32.48).abs() < 1e-9);` },
          ],
        },
        {
          id: 'catch-the-bugs',
          title: 'Tests that catch bugs',
          level: 'stretch',
          prompt: [
            "This time you write the tests. A function `is_sorted(values: &[i32]) -> bool` should return `true` when no element is smaller than the one before it. So an empty slice is sorted, a slice of one element is sorted, and equal neighbors are fine.",
            "Write `accepts`, which is given an implementation of `is_sorted` as a function value and decides whether it is correct. It must return `true` for a correct implementation and `false` for a wrong one. You cannot look inside the function you are given. All you can do is call it with inputs of your choosing and compare the answers with what you know is right.",
            "The tests hand `accepts` two correct implementations and eight buggy ones, each wrong in a different way. Open a test to read the implementation it uses. `fn(&[i32]) -> bool` is the type of a plain function with that signature.",
          ],
          signature: 'fn accepts(is_sorted: fn(&[i32]) -> bool) -> bool',
          starter: rs`fn accepts(is_sorted: fn(&[i32]) -> bool) -> bool {
    // One case is not much of a test suite.
    is_sorted(&[1, 2, 3])
}`,
          hints: [
            "Think about where implementations go wrong: at the edges. No elements, one element, equal neighbors, a descent at the very start, a descent at the very end.",
            "Make a table of inputs and expected answers, and require every one to match: `let cases: [(&[i32], bool); 2] = [(&[], true), (&[2, 1], false)];` then `cases.iter().all(|(input, expected)| is_sorted(input) == *expected)`.",
            "These cases catch all eight: `[]`, `[7]`, `[1, 2, 3]` and `[2, 2, 3]` are sorted. `[2, 1, 3]`, `[1, 3, 2]` and `[3, 2, 1]` are not.",
          ],
          solution: rs`fn accepts(is_sorted: fn(&[i32]) -> bool) -> bool {
    let cases: [(&[i32], bool); 7] = [
        (&[], true),                 // nothing to be out of order
        (&[7], true),
        (&[1, 2, 3], true),
        (&[2, 2, 3], true),          // equal neighbors
        (&[2, 1, 3], false),         // a descent at the start
        (&[1, 3, 2], false),         // a descent at the end
        (&[3, 2, 1], false),         // descending all the way
    ];
    cases.iter().all(|(input, expected)| is_sorted(input) == *expected)
}`,
          solutionNote: "Every case is there because some plausible implementation gets it wrong. That is the question to ask of any test you write: which bug would this catch that the others would miss?",
          tests: [
            { label: 'Accepts a correct implementation', body: rs`fn correct(values: &[i32]) -> bool {
    values.windows(2).all(|pair| pair[0] <= pair[1])
}
assert!(accepts(correct), "this implementation is right, so one of your expected answers must be wrong");` },
            { label: 'Accepts a correct implementation written with a loop', body: rs`fn correct_loop(values: &[i32]) -> bool {
    let mut index = 1;
    while index < values.len() {
        if values[index] < values[index - 1] {
            return false;
        }
        index += 1;
    }
    true
}
assert!(accepts(correct_loop), "this implementation is right, so one of your expected answers must be wrong");` },
            { label: 'Rejects one that says yes to everything', body: rs`fn always_yes(_values: &[i32]) -> bool {
    true
}
assert!(!accepts(always_yes), "no case of yours has an unsorted input");` },
            { label: 'Rejects one that says no to everything', body: rs`fn always_no(_values: &[i32]) -> bool {
    false
}
assert!(!accepts(always_no), "no case of yours has a sorted input");` },
            { label: 'Rejects one that calls an empty slice unsorted', body: rs`fn empty_is_unsorted(values: &[i32]) -> bool {
    !values.is_empty() && values.windows(2).all(|pair| pair[0] <= pair[1])
}
assert!(!accepts(empty_is_unsorted), "it is only wrong for an empty slice");` },
            { label: 'Rejects one that demands strictly rising values', body: rs`fn strict(values: &[i32]) -> bool {
    values.windows(2).all(|pair| pair[0] < pair[1])
}
assert!(!accepts(strict), "it is only wrong when two neighbors are equal");` },
            { label: 'Rejects one that looks at the first pair only', body: rs`fn first_pair_only(values: &[i32]) -> bool {
    values.len() < 2 || values[0] <= values[1]
}
assert!(!accepts(first_pair_only), "it misses a descent after the second element");` },
            { label: 'Rejects one that skips the first element', body: rs`fn skips_first(values: &[i32]) -> bool {
    values.iter().skip(1).zip(values.iter().skip(2)).all(|(left, right)| left <= right)
}
assert!(!accepts(skips_first), "it misses a descent between the first two elements");` },
            { label: 'Rejects one that compares everything with the first element', body: rs`fn at_least_the_first(values: &[i32]) -> bool {
    values.iter().all(|value| *value >= values[0])
}
assert!(!accepts(at_least_the_first), "it misses a descent between two later elements that are both above the first");` },
            { label: 'Rejects one that accepts falling order as well', body: rs`fn either_direction(values: &[i32]) -> bool {
    values.windows(2).all(|pair| pair[0] <= pair[1]) || values.windows(2).all(|pair| pair[0] >= pair[1])
}
assert!(!accepts(either_direction), "it is only wrong for a slice that falls all the way");` },
          ],
        },
      ],
    },

    {
      id: 'concurrency',
      title: 'Concurrency',
      category: part,
      minutes: 40,
      summary: 'How to run code on several threads at once, and how ownership, borrowing and two marker traits turn data races into compile errors. Then the bugs that are still yours to prevent.',
      topics: ['spawn and join', "move and 'static", 'Scoped threads', 'Send and Sync', 'Arc<Mutex<T>>', 'Channels', 'Deadlocks', 'async'],
      sections: [
        {
          title: 'Threads: spawn and join',
          body: [
            "Every program so far has run on one thread: one sequence of instructions with one stack. A **thread** is a second such sequence in the same process. The operating system runs threads at the same time on separate cores when it has them, and makes them take turns when it does not. Each thread has a stack of its own. The heap and the static data are shared.",
            "`thread::spawn` takes a closure and starts a new thread that runs it. It returns at once with a `JoinHandle`. Calling `join` on the handle waits for the thread to finish and gives you the value its closure returned.",
            { run: rs`use std::thread;

// How many primes are there below limit? Slow on purpose: it tries every divisor.
fn count_primes(limit: u32) -> usize {
    (2..limit).filter(|n| (2..*n).all(|d| n % d != 0)).count()
}

fn main() {
    let small = thread::spawn(|| count_primes(1_000));  // starts running now
    let large = thread::spawn(|| count_primes(5_000));  // and so does this one

    println!("two threads are counting");               // main does not wait for them

    let small = small.join().unwrap();                  // wait, and take the result
    let large = large.join().unwrap();
    println!("{small} primes below 1000, {large} below 5000");
}`, name: 'spawn.rs', expect: 'two threads are counting\n168 primes below 1000, 669 below 5000\n' },
            "The first `println!` may run before the two spawned threads have started, while they are counting, or after they have finished. The program is written so that it does not matter. The spawned threads print nothing, and `main` prints their results only after `join` has returned.",
            "That is the discipline for this whole lesson. **Nothing fixes the order in which threads run.** Two threads that both print interleave their lines differently from one run to the next. So the programs here let threads compute and return, and print on one thread after joining.",
            "`join` returns a `Result`. A panic ends the thread it happens on and no other, and the thread that joins it gets an `Err`.",
            { run: rs`use std::{panic, thread};

fn main() {
    panic::set_hook(Box::new(|_| {}));          // do not print the panic message

    let careful = thread::spawn(|| 10 / 2);
    let careless = thread::spawn(|| {
        let empty: Vec<u32> = Vec::new();
        empty[0]                                // out of bounds: this thread panics
    });

    println!("careful returned {:?}", careful.join().ok());
    println!("careless returned {:?}", careless.join().ok());
    println!("main is still running");
}`, name: 'panic_in_thread.rs', expect: 'careful returned Some(5)\ncareless returned None\nmain is still running\n' },
            "`ok()` turns each `Result` into an `Option` so that it can be printed. The usual call is `handle.join().unwrap()`, which passes a panic on to the thread that joins.",
            { pitfall: "When `main` returns, the process ends, and every other thread is stopped wherever it happens to be. A thread you never join may not have finished, or even started. Join every handle, unless the thread is meant to be cut off when the program ends." },
            { compare: "Python has threads, but the standard interpreter's global lock lets only one of them run Python code at a time. PHP gives each request a process of its own. JavaScript has one thread, and a Web Worker shares nothing with it. Rust threads are operating-system threads that compute at the same time on separate cores and share one address space. That is the fast arrangement and the dangerous one, and this lesson is about how the compiler makes it safe." },
            { aside: "A spawned thread gets a stack of 2 MiB unless you ask for another size, as lesson 4 mentioned. A few dozen threads cost nothing worth counting. Tens of thousands do, and the last section says what is used instead." },
          ],
        },
        {
          title: "move and 'static",
          body: [
            "Lesson 17 ended its section on `move` with a thread, and left the reason for this lesson. Take the `move` away and the compiler refuses the program.",
            { run: rs`use std::thread;

fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];

    let handle = thread::spawn(|| names.len());
    println!("{}", handle.join().unwrap());
}`, name: 'borrowed_by_thread.rs', fails: 'E0373' },
            "This is `E0373`, the error lesson 17 showed for a closure returned from a function, and the reason is the same. The closure only reads `names`, so it captures a reference. A spawned thread runs for as long as it likes. The function that started it could return first, and the thread would then be reading a `Vec` that has been freed. It is the dangling reference of lesson 6, held by a second thread.",
            "This `main` joins the thread on the next line, so here the `Vec` would outlive it. The compiler does not reason about that. It checks the call against the signature of `spawn`.",
            { code: rs`pub fn spawn<F, T>(f: F) -> JoinHandle<T>
where
    F: FnOnce() -> T + Send + 'static,
    T: Send + 'static,` },
            { list: [
              "`FnOnce() -> T` is a closure that is called once and returns a `T`.",
              "`'static` means the closure holds no reference that could expire, as lesson 10 put it. A closure that owns a `Vec` is `'static`. One that holds a reference to a local variable is not.",
              "`Send` means the closure and its result may be handed to another thread. Section 4 is about this bound.",
            ] },
            "The fix is in the `help:` line. `move` makes the closure own what it uses, at the price lesson 5 taught: the value is gone from `main`.",
            { run: rs`use std::thread;

fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];

    let handle = thread::spawn(move || names.len());
    println!("{} of {:?}", handle.join().unwrap(), names);
}`, name: 'moved_away.rs', fails: 'E0382' },
            "`names` belongs to the other thread from the `spawn` onward, whether or not that thread has finished. When the spawner wants the value back, the thread can return it.",
            { run: rs`use std::thread;

fn main() {
    let mut names = vec![String::from("Ada"), String::from("Grace")];

    let handle = thread::spawn(move || {
        names.push(String::from("Barbara"));    // this thread owns names now
        names                                   // returning it hands it back
    });

    let names = handle.join().unwrap();
    println!("{names:?}");
}`, name: 'moved_in.rs', expect: '["Ada", "Grace", "Barbara"]\n' },
            "Ownership went to the thread and came back through `join`. At every moment exactly one thread could reach the `Vec`, so nothing had to be locked. When `main` needs the data at the same time as the thread, there are three more ways: clone it for the thread, share it with an `Arc` as section 4 does, or lend it to a scoped thread, which is the next section.",
            "A `Copy` value is copied into a `move` closure, which makes a loop of threads easy to write.",
            { run: rs`use std::thread;

fn main() {
    let mut handles = Vec::new();
    for id in 1..=4u64 {
        handles.push(thread::spawn(move || id * id));   // each closure has its own id
    }

    // Join in the order of spawning. The threads may finish in any order.
    let squares: Vec<u64> = handles
        .into_iter()
        .map(|handle| handle.join().unwrap())
        .collect();
    println!("{squares:?}");
}`, name: 'squares.rs', expect: '[1, 4, 9, 16]\n' },
            "The results are in the order of the handles, which is the order of spawning, whichever thread finished first. Collect results this way and the output is the same on every run.",
            { pitfall: "Spawn every thread before you join the first. It is tempting to write one chain: `(1..=4).map(|id| thread::spawn(move || id * id)).map(|handle| handle.join().unwrap())`. Iterators are lazy, as lesson 18 showed, so that chain spawns the first thread and joins it before it spawns the second. The work runs one thread at a time. Collect the handles into a `Vec` first." },
            { compare: "In Python, `threading.Thread(target=work, args=(names,))` gives the thread another reference to the same list, and nothing stops both threads from changing it. JavaScript is stricter than you may remember. `worker.postMessage(buffer, [buffer])` transfers an `ArrayBuffer`, and afterwards the sender's `buffer` has a length of zero. That is a move, enforced while the program runs. Rust's `move` is the same idea, enforced by the compiler and available for every type." },
          ],
        },
        {
          title: 'Scoped threads borrow safely',
          body: [
            "Moving data into a thread and back out is clumsy when the thread only needs to look at something for a while. The obstacle was that a spawned thread may outlive its spawner. A **scoped thread** may not, so it is allowed to borrow.",
            { run: rs`use std::thread;

fn main() {
    let names = vec!["Ada", "Grace", "Barbara"];
    let mut longest = 0;
    let mut letters = 0;

    thread::scope(|s| {
        s.spawn(|| longest = names.iter().map(|name| name.len()).max().unwrap_or(0));
        s.spawn(|| letters = names.iter().map(|name| name.len()).sum());
    });                             // returns when both threads have finished

    println!("{} names, {letters} letters, the longest has {longest}", names.len());
}`, name: 'scope.rs', expect: '3 names, 15 letters, the longest has 7\n' },
            "`thread::scope` runs the closure you give it and passes it a handle, here `s`. Threads started with `s.spawn` belong to the scope, and `scope` does not return until all of them have finished. Because they cannot outlive the call, they may borrow anything that outlives the call. Neither closure has a `move`.",
            "Look at what the closures borrow, with lesson 7 in mind. Both hold `&names`: many readers. One holds `&mut longest` and the other `&mut letters`: one writer for each variable. The aliasing rule is satisfied, and the compiler checked it across two threads with the rule it has used all along.",
            "The bug that rule prevents has a name here. A **data race** is two threads using the same memory at the same time, at least one of them writing, with nothing to coordinate them. Take two threads that each run `total += 1`. That statement is three steps: read, add, write back. Here is one way the six steps can fall.",
            { text: 'thread A              thread B              total\nread total: 0                               0\n                      read total: 0         0\nadd one: 1                                  0\n                      add one: 1            0\nwrite 1                                     1\n                      write 1               1' },
            "Two additions, and `total` is 1. Whether a run interleaves this way depends on timing, so the bug shows up once in a thousand runs and never while you are watching. In C and C++ a data race is undefined behavior. In Rust it is a compile error, and no new rule is needed for it.",
            { run: rs`use std::thread;

fn main() {
    let mut total = 0;

    thread::scope(|s| {
        s.spawn(|| total += 1);
        s.spawn(|| total += 1);
    });

    println!("{total}");
}`, name: 'two_writers.rs', fails: 'E0499' },
            "`E0499` is the error from lesson 7: two mutable borrows of one variable, alive at the same time. A data race needs two paths to one value with a writer among them, and that is exactly what the aliasing rule forbids. Lesson 7 said this was coming. There are three standard fixes.",
            { steps: [
              "**Give each thread its own piece.** Split the data so that each thread gets a `&mut` to a different part.",
              "**Return a value and combine afterwards.** Each thread computes a result, and one thread adds the results up.",
              "**Coordinate the access.** When threads really must change one value, put it in a `Mutex` or an atomic, as section 5 does.",
            ] },
            { run: rs`use std::thread;

fn brightness(pixels: &[u8]) -> u32 {
    pixels.iter().map(|pixel| u32::from(*pixel)).sum()
}

fn main() {
    let mut pixels = vec![10u8, 20, 30, 40, 50, 60, 70, 80];

    // Fix 1: chunks_mut hands each thread a mutable slice that overlaps no other.
    thread::scope(|s| {
        for band in pixels.chunks_mut(3) {
            s.spawn(|| {
                for pixel in band {
                    *pixel = 255 - *pixel;
                }
            });
        }
    });
    println!("{pixels:?}");

    // Fix 2: each thread returns a number, and one thread adds them up.
    let (left, right) = pixels.split_at(pixels.len() / 2);
    let total = thread::scope(|s| {
        let first = s.spawn(|| brightness(left));
        let second = s.spawn(|| brightness(right));
        first.join().unwrap() + second.join().unwrap()
    });
    println!("{total}");
}`, name: 'pieces.rs', expect: '[245, 235, 225, 215, 205, 195, 185, 175]\n1680\n' },
            "`chunks_mut` is the `chunks` of lesson 8 for mutable slices: it cuts a slice into pieces that cannot overlap. Three threads each change a different part of one `Vec`, with no lock and no copying. In the second half, `s.spawn` returns a handle whose `join` gives the closure's result, and `scope` returns whatever its closure returns, which is how `total` gets out.",
            { aside: "`thread::scope` is an ordinary library function. It rests on one fact: it does not return, even when a thread panics, until every thread spawned inside it has ended. Use scoped threads when a function wants several cores for one piece of work. Use `thread::spawn` for a thread that outlives the function that starts it, such as a background worker." },
            { native: [
              "For work spread over a collection, most projects use the crate **Rayon** instead of spawning threads by hand. It keeps a pool of threads, one for each core.",
              { shell: 'cargo add rayon', name: 'Terminal · add the dependency' },
              { code: rs`use rayon::prelude::*;

fn main() {
    let pixels = vec![10u8, 20, 30, 40, 50, 60, 70, 80];
    let total: u32 = pixels.par_iter().map(|pixel| u32::from(*pixel)).sum();
    println!("{total}");
}`, name: 'src/main.rs' },
              "`par_iter` in place of `iter` is the whole change, and its closures are checked by the rules on this page.",
            ] },
          ],
        },
        {
          title: 'Send and Sync: thread safety in the type system',
          body: [
            "The aliasing rule covers references. Some types share data without a reference in sight, and `Rc` is the one you know. Lesson 20 warned that an `Rc` is for one thread: `Rc::clone` and `drop` change the count of owners with a plain read, add and write. Two threads doing that to one count can lose an update, and a count that is one too low frees the value while an owner is still using it. So this must not compile.",
            { run: rs`use std::rc::Rc;
use std::thread;

fn main() {
    let scores = Rc::new(vec![3, 5, 8]);
    let for_thread = Rc::clone(&scores);

    let handle = thread::spawn(move || for_thread.iter().sum::<i32>());
    println!("{} {}", handle.join().unwrap(), scores.len());
}`, name: 'rc_thread.rs', fails: 'E0277' },
            "The closure owns `for_thread`, so `move` has dealt with `'static`. What fails is the other bound on `spawn`: an `Rc<Vec<i32>>` cannot be sent between threads safely. The notes spell out the chain. `Send` is not implemented for the `Rc`, so the closure that captured it is not `Send` either.",
            "Thread safety in Rust is stated with two traits. Neither has any methods.",
            { table: {
              head: ['Trait', 'A type has it when'],
              rows: [
                ['`Send`', 'A value of the type may be moved to another thread.'],
                ['`Sync`', 'A value of the type may be used from several threads at once through shared references. Put exactly: `T` is `Sync` when `&T` is `Send`.'],
              ],
            } },
            "Both are **auto traits**. Nobody writes `impl Send` for an ordinary type. A struct, an enum, a tuple or a closure is `Send` if everything in it is `Send`, and the same goes for `Sync`. A handful of types in the standard library opt out, and whatever contains one of them loses the trait as well.",
            { table: {
              head: ['Type', '`Send`', '`Sync`', 'Why'],
              rows: [
                ['`i32`, `String`, `Vec<T>`, `Box<T>` and most other types', 'Yes', 'Yes', 'Nothing in them is shared behind the scenes.'],
                ['`Rc<T>`', 'No', 'No', 'The count of owners is changed with no coordination.'],
                ['`Cell<T>`, `RefCell<T>`', 'Yes', 'No', 'Moving one to another thread is harmless. Two threads using one through `&` would change it at the same time.'],
                ['`Arc<T>`', 'Yes', 'Yes', 'The count is atomic. `T` must be `Send` and `Sync` itself.'],
                ['`Mutex<T>`', 'Yes', 'Yes', 'The lock lets one thread in at a time. `T` must be `Send`.'],
                ['Raw pointers, in lesson 24', 'No', 'No', 'The compiler knows nothing about what they point to.'],
              ],
            } },
            "The fix for the program above is the pointer lesson 20 promised. `Arc<T>` is `Rc<T>` with an **atomic** count: one that the processor changes in a single indivisible step, so no update can be lost. Everything else is the same: `Arc::new`, `Arc::clone`, `Arc::strong_count`, read-only access, and `Weak` for a pointer that must not own.",
            { run: rs`use std::sync::Arc;
use std::thread;

fn main() {
    let scores = Arc::new(vec![3, 5, 8, 13]);

    let mut handles = Vec::new();
    for skip in 0..3 {
        let scores = Arc::clone(&scores);       // one more owner, for this thread
        handles.push(thread::spawn(move || scores.iter().skip(skip).sum::<i32>()));
    }

    for handle in handles {
        println!("{}", handle.join().unwrap());
    }
    println!("owners left: {}", Arc::strong_count(&scores));
}`, name: 'arc.rs', expect: '29\n26\n21\nowners left: 1\n' },
            "`let scores = Arc::clone(&scores);` is the idiom to remember. Inside the loop body it shadows the name with a new owner, and `move` takes that owner into the thread. Each thread drops its `Arc` when its closure ends, so after the joins only `main` holds one.",
            "`Rc` still earns its place. An atomic update costs more than a plain one, and the compiler makes the cheaper pointer safe to offer by stopping it from ever reaching a second thread.",
            "`Sync` is the half of the pair that scoped threads lean on. The two scoped threads that read `names` each held a `&Vec<&str>`, which is allowed because a `Vec<&str>` is `Sync`. A `RefCell` is not. Here are the two writers of section 3 again, with the total in a `RefCell`.",
            { run: rs`use std::cell::RefCell;
use std::thread;

fn main() {
    let total = RefCell::new(0);

    thread::scope(|s| {
        s.spawn(|| *total.borrow_mut() += 1);
        s.spawn(|| *total.borrow_mut() += 1);
    });

    println!("{}", total.borrow());
}`, name: 'refcell_shared.rs', fails: 'E0277' },
            "Both closures capture `&total`, a shared reference, so the aliasing rule has no objection this time. `Sync` stops the program: a `RefCell<i32>` cannot be shared between threads safely. One of the notes says that `&RefCell<i32>` would have to be `Send`, which is the definition of `Sync` from the table. The reason is in `borrow_mut`, which counts borrows with a plain integer. Two threads would race on that count before they reached the number.",
            "The compiler has no special knowledge of threads. `thread::spawn` and `s.spawn` ask for `Send` in their signatures, as any library can, and the bound is checked the way `T: Display` is.",
            { compare: "None of the languages you know puts this in its types. Python and Java say in their documentation which classes are safe to share, and TypeScript never has to ask, because workers share nothing. So an object that is not thread-safe can be handed to two threads without a word from any tool. In Rust the hand-over is a type error that names the type at fault, even when it is buried three structs deep." },
            { tip: "You will almost never implement these traits yourself. Writing `unsafe impl Send for MyType {}` overrules the compiler, and it needs the `unsafe` keyword because nothing can check the claim. Lesson 24 covers that." },
          ],
        },
        {
          title: 'Shared state: Arc<Mutex<T>>',
          body: [
            "An `Arc` gives several threads one value, read-only, for the reason an `Rc` is read-only: it makes many paths to one value. In lesson 20 the way to change a value behind an `Rc` was a `RefCell`, and the last cell showed that a `RefCell` may not be shared between threads. Its thread-safe counterpart is the **mutex**, and every type from lesson 20 has one.",
            { table: {
              head: ['On one thread', 'Across threads', 'What changes'],
              rows: [
                ['`Rc<T>`', '`Arc<T>`', 'The count is atomic.'],
                ['`RefCell<T>`', '`Mutex<T>`', 'When the value is in use, `lock` waits. `borrow_mut` panics.'],
                ['`RefCell<T>` with many readers', '`RwLock<T>`', 'Many readers or one writer, with waiting.'],
                ['`Cell<T>`', '`AtomicU32`, `AtomicBool` and the other atomics', 'Each change is one indivisible step.'],
                ['`Rc<RefCell<T>>`', '`Arc<Mutex<T>>`', 'Both of the above.'],
              ],
            } },
            "A `Mutex<T>` wraps a value, as a `RefCell<T>` does. `lock()` asks for exclusive access, and waits if another thread has it. What comes back is a **guard**, the idea you met as `RefMut` in lesson 20: a small value that reaches the data through `Deref`, and whose `Drop` releases the lock.",
            { run: rs`use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    let total = Arc::new(Mutex::new(0u32));

    let mut handles = Vec::new();
    for _ in 0..4 {
        let total = Arc::clone(&total);
        handles.push(thread::spawn(move || {
            for _ in 0..1_000 {
                // Wait for the lock, and hold it while reading, adding and writing.
                let mut guard = total.lock().unwrap();
                *guard += 1;
            }   // guard is dropped here, which releases the lock
        }));
    }
    for handle in handles {
        handle.join().unwrap();
    }

    println!("{}", total.lock().unwrap());
}`, name: 'mutex.rs', expect: '4000\n' },
            "Four threads, a thousand additions each, and the answer is 4000 on every run. This is the `total += 1` that lost an update in section 3. Read the type from the outside in, as you read `Rc<RefCell<T>>`: `Arc` gives the value several owners, `Mutex` lets one thread at a time change it, and `u32` is the data.",
            "**The data lives inside the lock.** In other languages a mutex is a separate object that sits beside the data, and locking it first is a rule that programmers are trusted to follow. Here the `u32` is inside the `Mutex`, and the only path to it is a guard, which exists only while the lock is held. You cannot forget to lock. You cannot forget to unlock either, because the guard's `Drop` does it on every way out of the scope, including an early `return`, a `?` and a panic.",
            { borrows: {
              title: 'A lock is held for exactly as long as its guard is alive',
              code: rs`let stock = Mutex::new(vec![1, 2]);
{
    let mut guard = stock.lock().unwrap();
    guard.push(3);
}
let count = stock.lock().unwrap().len();
let held = stock.lock().unwrap();
println!("{count} {}", stock.try_lock().is_ok());
drop(held);
println!("{count} {}", stock.try_lock().is_ok());`,
              spans: [
                { name: 'stock', kind: 'owner', from: 1, to: 10 },
                { name: 'guard', kind: 'mut', from: 3, to: 5 },
                { name: 'unnamed', kind: 'mut', from: 6, to: 6 },
                { name: 'held', kind: 'mut', from: 7, to: 9 },
              ],
              marks: [
                { line: 5, label: "The closing brace drops `guard`, and the lock is released.", ok: true },
                { line: 6, label: "This guard has no name. It is a temporary, dropped at the semicolon. The number it read stays in `count`.", ok: true },
                { line: 8, label: "`held` is alive, so the lock is taken, and `try_lock` reports that at once. A call to `lock` here would never return." },
                { line: 10, label: "`drop(held)` released the lock early, and the same call succeeds.", ok: true },
              ],
              caption: "The bars are guards, as in the `RefCell` figure of lesson 20. Whoever holds the guard holds the only `&mut` to the data. The program below prints what the figure claims.",
            } },
            { run: rs`use std::sync::Mutex;

fn main() {
    let stock = Mutex::new(vec![1, 2]);
    {
        let mut guard = stock.lock().unwrap();
        guard.push(3);
    }
    let count = stock.lock().unwrap().len();
    let held = stock.lock().unwrap();
    println!("{count} {}", stock.try_lock().is_ok());
    drop(held);
    println!("{count} {}", stock.try_lock().is_ok());
}`, name: 'guards.rs', expect: '3 false\n3 true\n' },
            { pitfall: "A guard is a value with a `Drop`, so it lives to the end of its scope and not to its last use. With a `RefCell`, a guard that lived too long cost a panic. With a `Mutex` it costs time, because every other thread that wants the lock waits. Hold a guard within one statement or a short block, or `drop` it, and never across slow work such as reading a file. And never call `lock` on a mutex that the same thread already holds. That call does not return, because the thread is waiting for itself." },
            "`lock` returns a `Result`, which is why every call ends in `unwrap`. The `Err` case is called **poisoning**. A thread that panics while it holds a guard may have left the data half changed, so from then on `lock` returns `Err` to everyone. `unwrap` passes the panic on, which is nearly always right, because the data can no longer be trusted.",
            { run: rs`use std::sync::Mutex;
use std::{panic, thread};

fn main() {
    panic::set_hook(Box::new(|_| {}));          // do not print the panic message
    let ledger = Mutex::new(vec![100, 200]);

    thread::scope(|s| {
        let writer = s.spawn(|| {
            let mut entries = ledger.lock().unwrap();
            entries.push(300);
            let missing = entries[7];   // out of bounds: panics with the lock held
            entries.push(missing);
        });
        println!("the writer panicked: {}", writer.join().is_err());
    });

    println!("lock now returns Err: {}", ledger.lock().is_err());
}`, name: 'poisoned.rs', expect: 'the writer panicked: true\nlock now returns Err: true\n' },
            "That program has a `Mutex` and no `Arc`. The two do separate jobs. The `Mutex` makes a value changeable through a shared reference. The `Arc` keeps a value alive for threads made with `thread::spawn`, which may outlive the function that created it. Scoped threads cannot, so they borrow a `Mutex` like anything else.",
            "For a single number or flag there is something lighter. An **atomic** is the `Cell` of the table above: no guard and no waiting, only methods that each read, change and write in one indivisible step.",
            { run: rs`use std::sync::atomic::{AtomicU32, Ordering};
use std::thread;

fn main() {
    let hits = AtomicU32::new(0);

    thread::scope(|s| {
        for _ in 0..4 {
            s.spawn(|| {
                for _ in 0..1_000 {
                    // Read, add and write as one step.
                    hits.fetch_add(1, Ordering::Relaxed);
                }
            });
        }
    });

    println!("{}", hits.load(Ordering::Relaxed));
}`, name: 'atomic.rs', expect: '4000\n' },
            "The `Ordering` argument says how strictly the operation is ordered against what other threads do to other memory. `Relaxed` is enough for a counter that is read after the threads are done. Use `Ordering::SeqCst` elsewhere until you have studied the rest.",
            { compare: "Python's `with lock:` and Java's `synchronized` leave the link between a lock and its data to convention: the lock is one object, the data is another, and a comment says which protects which. Code that forgets the lock compiles and usually works. Rust puts the two in one type, and the guard is to a lock what `with` is to a file: it cannot be left open." },
          ],
        },
        {
          title: 'Message passing: channels',
          body: [
            "A lock lets threads take turns at one value. The other way to organize threads is to give every value one owner at a time and pass it along. A **channel** is a queue with two ends: one thread puts values in at the sending end, and another takes them out at the receiving end.",
            { run: rs`use std::sync::mpsc;
use std::thread;

fn main() {
    let (sender, receiver) = mpsc::channel();

    let producer = thread::spawn(move || {
        for word in ["alpha", "beta", "gamma"] {
            // The String moves into the channel.
            sender.send(word.to_uppercase()).unwrap();
        }
        // The closure ends here, and sender is dropped with it.
    });

    // Waits for each message in turn, and stops when the channel has closed.
    for message in receiver {
        println!("received {message}");
    }
    producer.join().unwrap();
}`, name: 'channel.rs', expect: 'received ALPHA\nreceived BETA\nreceived GAMMA\n' },
            { list: [
              "`mpsc::channel()` returns the two ends. The type of the messages is inferred from what is sent, here `String`.",
              "`send` never waits, because the queue grows as needed. `recv` waits for the next message, and iterating over the receiver calls it in a loop.",
              "A channel is **closed** when every sender has been dropped. `recv` then returns `Err`, and the loop ends. Here that happens when the producer's closure finishes.",
              "Messages from one sender arrive in the order in which they were sent, so this output is the same on every run.",
            ] },
            "`send` takes its argument by value. The message moves into the channel, and the thread that sent it has nothing left to touch.",
            { run: rs`use std::sync::mpsc;
use std::thread;

fn main() {
    let (sender, receiver) = mpsc::channel();

    let producer = thread::spawn(move || {
        let report = String::from("42 rows");
        sender.send(report).unwrap();
        println!("sent {report}");
    });

    println!("{}", receiver.recv().unwrap());
    producer.join().unwrap();
}`, name: 'use_after_send.rs', fails: 'E0382' },
            "`E0382` was the first ownership error of the course, and this is its most useful setting. Once `report` is sent, another thread may be reading it, changing it or freeing it. Where `send` passes a reference, as it does in most languages, the sender can go on using the object, and two threads share it with no lock. Here the sender's access ends at the `send`. Two threads never hold the same message, so there is nothing to lock.",
            "`mpsc` stands for multiple producer, single consumer. A sender can be cloned, and each clone can go to a thread of its own. There is one receiver.",
            { run: rs`use std::sync::mpsc;
use std::thread;

fn main() {
    let (sender, receiver) = mpsc::channel();

    for id in 1..=3u32 {
        let sender = sender.clone();        // a sender of its own for each producer
        thread::spawn(move || {
            for step in 1..=2 {
                sender.send(id * 10 + step).unwrap();
            }
        });
    }
    drop(sender);                           // main's sender: see the pitfall below

    // collect returns once the channel has closed.
    let mut received: Vec<u32> = receiver.iter().collect();
    received.sort();                        // arrival order differs from run to run
    println!("{received:?}");
}`, name: 'producers.rs', expect: '[11, 12, 21, 22, 31, 32]\n' },
            "Each producer's two messages arrive in order, but the three streams interleave differently on every run, so the program sorts before it prints. No handle is joined, and none needs to be: `collect` returns only when the channel has closed, and by then every producer has finished.",
            { pitfall: "Take out the line `drop(sender)` and this program never ends. `main` still holds the original sender, and a channel closes only when **every** sender is gone, so the receiver waits for a message that `main` itself could still send. The compiler has no objection. A program that waits forever is not a memory error, and the next section is about bugs of that kind." },
            "A third arrangement is the **pipeline**: each stage is a thread that receives from one channel, does one job, and sends its result into the next. One of the challenges builds a stage. When a producer can outrun its consumer, `mpsc::sync_channel(100)` makes a channel that holds at most 100 messages, and its `send` waits while the channel is full.",
            { table: {
              head: ['Reach for', 'When'],
              rows: [
                ['A channel', 'Work or data flows one way: producers and a consumer, the stages of a pipeline, results coming back.'],
                ['A `Mutex`', 'Several threads read and update the same state in place: a cache, a set of counters.'],
                ['Neither', 'Each thread can own its piece, or borrow it in a scope, and return a result.'],
              ],
            } },
            { compare: "A Web Worker's `postMessage` is a channel, and so are `queue.Queue` between Python threads and a `chan` in Go, whose motto fits this section: do not communicate by sharing memory, share memory by communicating. The difference is what becomes of the message. JavaScript copies it. Python passes a reference and trusts the sender not to touch the object again. Rust moves it, so the sender cannot." },
          ],
        },
        {
          title: 'What the compiler cannot prevent',
          body: [
            "Everything that has gone wrong so far was stopped before a program existed. That guarantee has an exact scope. Safe Rust has no **data races**, which is a guarantee about memory. It does not say that your threads make progress, or that they do things in a sensible order.",
            "A **deadlock** is two threads that each wait for something the other holds. The classic case has two locks and two threads that each want both. Here two accounts each sit in a `Mutex`, and a payment locks the account that pays and then the account that is paid.",
            { code: rs`fn pay(from: &Mutex<i64>, to: &Mutex<i64>, amount: i64) {
    let mut from = from.lock().unwrap();        // first the account that pays
    let mut to = to.lock().unwrap();            // then the account that is paid
    *from -= amount;
    *to += amount;
}

// Thread A runs pay(&alice, &bob, 10), and thread B runs pay(&bob, &alice, 5).` },
            "This compiles, each call is correct by itself, and most runs finish. Step through the run that does not. For the figure, each thread's call is written out as a function of its own, and the accounts are statics so that both functions can name them.",
            { trace: {
              title: 'Two threads, two locks, opposite order',
              code: rs`static ALICE: Mutex<i64> = Mutex::new(100);
static BOB: Mutex<i64> = Mutex::new(100);

fn thread_a() {         // alice pays bob
    let mut from = ALICE.lock().unwrap();
    let mut to = BOB.lock().unwrap();
    *from -= 10;
    *to += 10;
}

fn thread_b() {         // bob pays alice
    let mut from = BOB.lock().unwrap();
    let mut to = ALICE.lock().unwrap();
    *from -= 5;
    *to += 5;
}`,
              vars: [
                { id: 'alice', name: 'ALICE', type: 'Mutex<i64>', frame: 'static', fields: [['lock', ''], ['balance', 'i64']] },
                { id: 'bob', name: 'BOB', type: 'Mutex<i64>', frame: 'static', fields: [['lock', ''], ['balance', 'i64']] },
                { id: 'a.from', name: 'from', type: 'MutexGuard<i64>', frame: 'thread_a' },
                { id: 'a.to', name: 'to', type: 'MutexGuard<i64>', frame: 'thread_a' },
                { id: 'b.from', name: 'from', type: 'MutexGuard<i64>', frame: 'thread_b' },
                { id: 'b.to', name: 'to', type: 'MutexGuard<i64>', frame: 'thread_b' },
              ],
              steps: [
                { line: [1, 2], set: { alice: { lock: 'free', balance: 100 }, bob: { lock: 'free', balance: 100 } }, say: "Two accounts, each in a `Mutex`, and both locks are free. Thread A is about to run `thread_a` and thread B is about to run `thread_b`, each on a stack of its own." },
                { line: 5, set: { 'a.from': '&alice', 'alice.lock': 'held by A' }, say: "Thread A goes first and locks `ALICE`. The lock was free, so `lock` returns a guard at once. The arrow shows which lock a guard holds." },
                { line: 12, set: { 'b.from': '&bob', 'bob.lock': 'held by B' }, say: "Before A gets any further, thread B runs its first line and locks `BOB`, which was free too." },
                { line: 6, set: { 'a.to': 'waiting' }, say: "A asks for `BOB`. B holds it, so A's call to `lock` does not return." },
                { line: 13, set: { 'b.to': 'waiting' }, say: "B asks for `ALICE`. A holds it, so B waits as well. B would release `BOB` at the end of its function, and it cannot get there." },
                { line: [6, 13], say: "Each thread holds one lock and waits for the other. Neither call will ever return, and no guard will ever be dropped. Nothing has crashed and no memory has been misused. The two threads wait forever, and so does anyone who joins them." },
              ],
            } },
            "A deadlock needs a cycle: A waits for B, and B waits for A. The cycle is the part you control. **If every thread takes its locks in the same order, no cycle can form.** Whoever gets the first lock will get the second, because anyone else who wants the second is still waiting for the first, and holds nothing. Here the order is by account number: `pay` locks the lower `id` first, whichever way the money goes.",
            { run: rs`use std::sync::Mutex;
use std::thread;

struct Account {
    id: u32,
    balance: Mutex<i64>,
}

fn pay(from: &Account, to: &Account, amount: i64) {
    // Lock the lower id first, whichever way the money goes.
    // A guard is a value, so the if can hand back two of them.
    let (mut from_balance, mut to_balance) = if from.id < to.id {
        let from_guard = from.balance.lock().unwrap();
        let to_guard = to.balance.lock().unwrap();
        (from_guard, to_guard)
    } else {
        let to_guard = to.balance.lock().unwrap();
        let from_guard = from.balance.lock().unwrap();
        (from_guard, to_guard)
    };

    *from_balance -= amount;
    *to_balance += amount;
}

fn main() {
    let alice = Account { id: 1, balance: Mutex::new(5_000) };
    let bob = Account { id: 2, balance: Mutex::new(5_000) };

    thread::scope(|s| {
        s.spawn(|| {
            for _ in 0..1_000 {
                pay(&alice, &bob, 2);           // locks alice, then bob
            }
        });
        s.spawn(|| {
            for _ in 0..1_000 {
                pay(&bob, &alice, 1);           // locks alice, then bob, as well
            }
        });
    });

    let alice_balance = *alice.balance.lock().unwrap();
    let bob_balance = *bob.balance.lock().unwrap();
    println!("alice {alice_balance}, bob {bob_balance}");
}`, name: 'lock_order.rs', expect: 'alice 4000, bob 6000\n' },
            "Two thousand payments in opposite directions, and the program finishes every time with the same balances. Thread B asks for `alice` first although it pays from `bob`. If A holds `alice`, B waits there with nothing in its hands, and A is free to take `bob`.",
            "A **logic race**, also called a race condition, is the other bug the compiler cannot see. Every access is properly locked, so there is no data race, and the result still depends on timing. The usual form is check, then act.",
            { code: rs`fn withdraw(account: &Mutex<i64>, amount: i64) -> bool {
    if *account.lock().unwrap() >= amount {     // lock, check, unlock
        *account.lock().unwrap() -= amount;     // lock again, change, unlock
        true
    } else {
        false
    }
}` },
            "Each of the two lines takes the lock, and each guard is a temporary that is gone before the next line runs. Between them the lock is free. With a balance of 100, two threads can each check that 80 is there, and then each take 80. The balance is now -60, and both threads followed the locking rules to the letter. The rule that was broken, that a balance never goes below zero, is one the compiler has never heard of. The fix is to hold one guard across the check and the change.",
            { run: rs`use std::sync::Mutex;
use std::thread;

fn withdraw(account: &Mutex<i64>, amount: i64) -> bool {
    let mut balance = account.lock().unwrap();  // one guard for check and change
    if *balance >= amount {
        *balance -= amount;
        true
    } else {
        false
    }
}

fn main() {
    let account = Mutex::new(100);
    let mut succeeded = 0;

    thread::scope(|s| {
        let mut handles = Vec::new();
        for _ in 0..4 {
            handles.push(s.spawn(|| withdraw(&account, 80)));
        }
        for handle in handles {
            if handle.join().unwrap() {
                succeeded += 1;
            }
        }
    });

    let balance = *account.lock().unwrap();
    println!("{succeeded} of 4 withdrawals succeeded, and the balance is {balance}");
}`, name: 'check_and_act.rs', expect: '1 of 4 withdrawals succeeded, and the balance is 20\n' },
            "Which of the four threads gets the money differs from run to run, and that is fine. Exactly one does, every time. A lock protects an invariant only if it is held for the whole of every step that could break it.",
            { table: {
              head: ['The compiler prevents', 'Still yours to prevent'],
              rows: [
                ['Two threads changing one value with no lock and no atomic', 'A deadlock: threads waiting for each other in a cycle'],
                ['A thread using a local variable of a function that has returned', 'A guard held too long, with other threads queued behind it'],
                ['An `Rc` or a `RefCell` reaching a second thread', 'Check, then act: one decision spread over two lockings'],
                ['Reaching the data in a `Mutex` without its lock', 'A channel that never closes, because a sender is still alive'],
                ['Using a message after sending it', 'Results that depend on which thread ran first'],
              ],
            } },
            { tip: [
              "Four habits keep the right-hand column short.",
              { list: [
                "Prefer not to share. Move data into a thread, lend it to a scope, or send it through a channel.",
                "Hold one lock at a time when you can. When a step needs two, take them in the same order everywhere.",
                "Keep guards short, and do not hold one across a call that may wait: `join`, `recv`, reading a file, or code you did not write.",
                "Keep each check and the change that depends on it under one guard.",
              ] },
            ] },
          ],
        },
        {
          title: 'Where async fits',
          body: [
            "You will meet `async` and `.await` within an hour of reading real Rust, in any program that talks to a network. This section says what they are for and how they relate to threads. It is an orientation, and nothing in it runs on this page.",
            "Threads solve the problem of doing several computations at once. A server has a different problem: **waiting** for many things at once. A chat server with 20,000 open connections is doing almost nothing, because nearly every connection is idle. A thread for each one means 20,000 stacks, and an operating system that spends its time switching between threads that have nothing to do.",
            "An `async fn` does not run when it is called. It returns a **future**: a value that describes work still to be done. The compiler turns the function's body into a state machine, with one state for each place where the function may have to wait, and `.await` marks those places. In this sketch, `fetch` stands for a function from an HTTP client crate.",
            { code: rs`async fn page_length(url: &str) -> usize {
    let response = fetch(url).await;        // may pause here until the server answers
    let body = response.text().await;       // and here, until the body has arrived
    body.len()
}

async fn report() {
    let pending = page_length("https://www.rust-lang.org");  // nothing has run yet
    let length = pending.await;                              // now it runs
    println!("{length} bytes");
}` },
            "A future does nothing until something drives it. That something is a **runtime**: a library that keeps a queue of futures, called tasks, and runs each one until it reaches an `.await` that is not ready. Then it sets that task aside and runs another on the same thread. A waiting task costs the size of its state machine, often a few hundred bytes, and not a stack, so a handful of threads can serve tens of thousands of connections.",
            "The standard library defines the `Future` trait and contains no runtime. You choose one as a crate, and **Tokio** is the most widely used.",
            { native: [
              { shell: 'cargo add tokio --features full', name: 'Terminal · add the runtime' },
              { code: rs`use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let listener = TcpListener::bind("127.0.0.1:8080").await?;

    loop {
        // Waits for the next client without holding on to a thread.
        let (mut socket, _address) = listener.accept().await?;

        // A task for this connection. A task is not a thread.
        tokio::spawn(async move {
            let (mut reader, mut writer) = socket.split();
            // Sends back whatever arrives, until the client disconnects.
            let _ = tokio::io::copy(&mut reader, &mut writer).await;
        });
    }
}`, name: 'src/main.rs' },
              "A server that echoes whatever each client sends. `tokio::spawn` starts a task, and one process can hold a very large number of them. `#[tokio::main]` starts the runtime and hands it the future that `main` returns.",
            ] },
            "Nearly everything in this lesson carries over.",
            { list: [
              "`tokio::spawn` has the bounds of `thread::spawn`: the future must be `Send` and `'static`. That is why `async move` appears, and why a future that keeps an `Rc` across an `.await` is refused.",
              "Shared state is still `Arc<Mutex<T>>`, and tasks still talk through channels.",
              "Deadlocks and logic races are exactly as possible as before.",
            ] },
            { table: {
              head: ['The work', 'Reach for', 'Why'],
              rows: [
                ['Resizing 2,000 photos, parsing a large file', 'Threads: scoped threads, or Rayon', 'The work needs cores. A long computation in an async task never reaches an `.await`, so every task queued on that thread waits behind it.'],
                ['A chat server or a crawler with thousands of connections', '`async` with a runtime', 'Nearly all the time goes to waiting, and a waiting task is cheap.'],
                ['A command-line tool that reads a few files', 'Neither', 'Plain code that waits where it stands is the simplest thing that works.'],
              ],
            } },
            { compare: "JavaScript's `async` and `await` look the same and differ in two ways. A JavaScript promise starts running when it is created, and a Rust future does nothing until it is awaited or spawned. And JavaScript's event loop is built in and runs on one thread, where Rust's runtime is a crate that usually runs tasks on several threads, which is where `Send` comes in. Python's `asyncio` is the closer relative: a coroutine does nothing until it is awaited, and you start the event loop yourself." },
            "One question is left over. `Arc` and `Mutex` let several threads reach one value and change it, which the borrow checker would never allow in code of your own. Yet they are ordinary library types. Their insides are written in a part of Rust where the programmer vouches for what the compiler cannot check. The last lesson opens that door. It is marked `unsafe`.",
          ],
        },
      ],
      takeaways: [
        "`thread::spawn` starts an operating-system thread and returns a handle. `join` waits for the thread and returns its result, or `Err` if it panicked. Collect results in the order of the handles, never in the order of finishing.",
        "A spawned thread may outlive its spawner, so its closure must be `'static`: use `move`, and get values back through `join`. A scoped thread cannot outlive `thread::scope`, so it may borrow.",
        "A data race needs two paths to one value with a writer among them. The aliasing rule of lesson 7 forbids that across threads exactly as it does within one.",
        "`Send` means a value may move to another thread, and `Sync` means it may be shared between threads by reference. The compiler derives both from a type's fields. `Rc` and `RefCell` lack them, and `Arc` and `Mutex` are their thread-safe counterparts.",
        "A `Mutex<T>` owns its data. The only way in is a guard, and the lock is held for exactly as long as the guard lives. Keep guards short.",
        "`send` moves a value into a channel, so two threads never hold the same message. A channel closes when every sender has been dropped.",
        "The compiler prevents data races. Deadlocks, check-then-act races and waits that never end are still yours. Take locks in one fixed order, and keep each check and its change under one guard.",
        "Threads are for computing in parallel. `async` is for waiting on many things at once, and it needs a runtime such as Tokio.",
      ],
      quiz: [
        {
          q: 'Does this program compile?',
          code: rs`use std::thread;

fn main() {
    let readings = vec![4, 8, 15, 16, 23, 42];

    let handle = thread::spawn(|| readings.iter().sum::<i32>());
    let total = handle.join().unwrap();

    println!("{total} from {} readings", readings.len());
}`,
          options: [
            { t: 'No: the closure borrows `readings`, and a spawned thread may not hold a borrow of a local variable', ok: true, why: "`thread::spawn` requires a `'static` closure, because nothing ties the thread's life to the function that started it. The compiler reports `E0373`. The `join` on the next line does not change that: the call is checked against the signature of `spawn`, not against what `main` goes on to do." },
            { t: 'Yes: `main` joins the thread before `readings` goes out of scope', why: "That is true of this program, and the compiler does not use it. `spawn` accepts only closures that are `'static`, whatever happens afterwards. `thread::scope` is the tool that turns \"finished before this point\" into something the compiler can rely on." },
            { t: 'Yes: the closure only reads, and any number of readers is allowed', why: "Many readers is the aliasing rule, and it is satisfied here. The rule that fails is the other one about references: a borrow may not outlive its owner, and a spawned thread has no known end." },
            { t: 'No: a `Vec` cannot be used from two threads', why: "A `Vec<i32>` is `Send` and `Sync`. Inside `thread::scope` this closure would be accepted as it stands. The problem is how long the borrow might last, not the type." },
          ],
          verify: 'E0373',
        },
        {
          q: 'Does this program compile?',
          code: rs`use std::thread;

fn main() {
    let readings = vec![4, 8, 15, 16, 23, 42];
    let (low, high) = readings.split_at(3);

    let total = thread::scope(|s| {
        let first = s.spawn(|| low.iter().sum::<i32>());
        let second = s.spawn(|| high.iter().sum::<i32>());
        first.join().unwrap() + second.join().unwrap()
    });

    println!("{total} from {} readings", readings.len());
}`,
          options: [
            { t: 'Yes, and it prints `108 from 6 readings`', ok: true, why: "A scoped thread has finished by the time `thread::scope` returns, so it may borrow from the function around it. Both closures hold shared references into `readings`, which is many readers and no writer." },
            { t: 'No: the closures need `move`, as every closure given to a thread does', why: "`move` is what `thread::spawn` needs, because its threads may outlive their spawner. Scoped threads cannot, so they may borrow. A `move` here would do no harm either: it would move the two slice references, not the `Vec`." },
            { t: 'No: `readings` is used on the last line, after two threads borrowed it', why: "The threads' borrows end when `scope` returns, because both threads have finished by then. After that `main` has `readings` to itself again." },
            { t: 'No: `low` and `high` point into one `Vec`, so the two threads would share memory', why: "They do share one allocation, and that is fine. `split_at` gives two slices that do not overlap, and both are only read. Sharing is a problem only when one of the parties writes." },
          ],
          verify: 'compiles',
        },
        {
          q: 'Does this program compile?',
          code: rs`use std::thread;

fn main() {
    let mut readings = vec![4, 8, 15, 16, 23, 42];

    thread::scope(|s| {
        s.spawn(|| readings.push(108));
        s.spawn(|| println!("{} readings", readings.len()));
    });
}`,
          options: [
            { t: 'No: one thread borrows `readings` mutably while the other borrows it as well', ok: true, why: "`push` needs `&mut readings` and `len` needs `&readings`, and both closures are alive inside one scope. A writer together with a reader breaks the aliasing rule of lesson 7, and the compiler reports `E0502`. Here the rule has prevented a data race: `push` may move the buffer while the other thread is reading the length." },
            { t: 'Yes: scoped threads are allowed to borrow local variables', why: "They are, under the rule that governs every borrow: many readers or one writer. A scope lifts the `'static` requirement and nothing else." },
            { t: 'Yes, and it prints `6 readings` or `7 readings`, depending on timing', why: "That is what the same program would do in Java or Go, or worse: the reading thread could see the list halfway through growing. Rust refuses to build it." },
            { t: 'No: `readings` would have to be put in an `Arc` first', why: "An `Arc` shares ownership, and ownership is not the problem, since scoped threads may borrow. An `Arc` would also make the `Vec` read-only. What lets two threads change one value is a `Mutex`." },
          ],
          verify: 'E0502',
        },
        {
          q: 'An `Rc<String>` cannot be moved into a spawned thread, even with `move`. Why is `Rc` not `Send`?',
          options: [
            { t: 'Its count of owners is changed by an ordinary read, add and write, so two threads could lose an update', ok: true, why: "If one thread clones an `Rc` while another drops one, both may read the same count and write back different answers. A count that ends up too low frees the `String` while an owner is still using it. `Arc` makes each change to the count one atomic step, which is why it is `Send`." },
            { t: 'A `String` is not safe to read from two threads', why: "`String` is `Send` and `Sync`, and an `Arc<String>` crosses threads without complaint. Even an `Rc<i32>` is not `Send`. The trouble is in the pointer, not in what it points to." },
            { t: 'Each thread has a heap of its own, and an `Rc` points into the heap of the thread that made it', why: "Each thread has a **stack** of its own. The heap belongs to the whole process, which is what makes sharing between threads both possible and dangerous." },
            { t: 'A value with several owners cannot be moved at all', why: "Moving an `Rc` around on one thread is fine: it is a pointer, and the count does not change. The danger is two `Rc` pointers to one allocation on different threads, and the compiler cannot tell whether a given `Rc` is the only one. So no `Rc` may cross." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`use std::sync::Mutex;

fn main() {
    let stock = Mutex::new(5);

    let seen = *stock.lock().unwrap();
    print!("{} ", stock.try_lock().is_ok());

    let guard = stock.lock().unwrap();
    print!("{} ", stock.try_lock().is_ok());

    drop(guard);
    println!("{} {seen}", stock.try_lock().is_ok());
}`,
          answer: 'true false true 5',
          explain: "A lock is released when its guard is dropped. On line 6 the guard is a temporary: the `*` copies the number out, and the guard is gone at the semicolon, so the `try_lock` on line 7 succeeds. On line 9 the guard has a name and lives until it is dropped, so the lock is still held on line 10. `drop(guard)` releases it early. `try_lock` returns at once instead of waiting, which is the only reason line 10 does not hang.",
          hint: "`try_lock` returns `Ok` only if nobody holds the lock at that moment. Ask of each call: is a guard alive?",
        },
        {
          kind: 'multi',
          q: 'Which of these mistakes does the compiler refuse, so that no program is built?',
          options: [
            { t: 'Two threads push to the same `Vec` through plain references, with no lock', ok: true, why: "Two writers to one value is `E0499`, on one thread or on several." },
            { t: 'A spawned thread keeps a reference to a local variable of the function that started it', ok: true, why: "`thread::spawn` requires `'static`, so this is `E0373`." },
            { t: 'An `Rc` is cloned, and one of the clones is moved into another thread', ok: true, why: "`Rc` is not `Send`, so the closure that captured it is not either: `E0277`." },
            { t: 'A thread reads the value inside a `Mutex` without locking it', ok: true, why: "There is no way to write that. The value can be reached only through the guard that `lock` returns." },
            { t: 'Two threads each hold one lock and wait for the lock the other holds', why: "A deadlock. Each thread obeys every ownership rule while it waits forever." },
            { t: 'A thread checks a balance under one locking and withdraws under a second, and another thread gets in between', why: "A logic race. Every access is locked, so there is no data race, and the broken invariant is one the compiler does not know about." },
            { t: 'A receiver waits forever because one `Sender` was never dropped', why: "Waiting is not a memory error. The program hangs, and the compiler has nothing to say." },
          ],
          hint: "Four are refused. The compiler guards memory: who may reach a value, and for how long. It does not check that threads make progress.",
        },
        {
          q: 'Three programs. The first resizes 2,000 photos on a machine with 8 cores. The second is a chat server that holds 50,000 connections, most of them idle. The third is a command-line tool that reads a settings file and adds up one column of a CSV file. Which choice suits all three?',
          options: [
            { t: 'Threads for the photos, `async` for the chat server, plain sequential code for the tool', ok: true, why: "Resizing is computation, and computation needs cores: scoped threads or Rayon. The chat server spends its time waiting on many sockets, which is what `async` tasks make cheap. The tool has nothing to do at the same time as anything else, so neither earns its complexity." },
            { t: '`async` for all three, because it is the modern replacement for threads', why: "`async` does not make computation faster. A task that resizes a photo keeps its thread until it is done, and stalls every task queued behind it. `async` is a tool for waiting, and it runs on top of threads, not in place of them." },
            { t: '`async` for the photos, because that is the heavy work, and threads for the chat server', why: "That is the wrong way around. Heavy computation is what threads are for. Fifty thousand threads, nearly all asleep, cost fifty thousand stacks and a great deal of switching." },
            { t: 'Threads for all three: `async` only matters in languages with a global lock', why: "The global lock is why Python threads cannot compute in parallel, and Rust has none. But the case for `async` is the cost of a thread that waits, which is the same in every language. A waiting task costs a few hundred bytes." },
          ],
        },
      ],
      challenges: [
        {
          id: 'spawn-and-join',
          title: 'One thread for each job',
          level: 'warm-up',
          prompt: [
            "`run_all` is given a list of inputs and a function, `work`. It should call `work` on every input, each call on a thread of its own, and return the results **in the order of the inputs**.",
            "The starter makes the calls one after another on the thread that called it. `fn(u64) -> u64` is the type of a plain function, as in lesson 22. A function value is `Copy`, so a `move` closure gets a copy of `work` for itself.",
            "Open the third test to see how a test can tell which thread a call ran on.",
          ],
          signature: 'fn run_all(jobs: Vec<u64>, work: fn(u64) -> u64) -> Vec<u64>',
          starter: rs`use std::thread;

fn run_all(jobs: Vec<u64>, work: fn(u64) -> u64) -> Vec<u64> {
    // Every call runs here, on the calling thread.
    // Give each call a thread of its own.
    let mut results = Vec::new();
    for job in jobs {
        results.push(work(job));
    }
    results
}`,
          hints: [
            "Two loops. The first spawns a thread for each job and keeps its `JoinHandle` in a `Vec`. The second joins the handles in the same order.",
            "`handles.push(thread::spawn(move || work(job)));` The `move` gives the thread its own `job` and its own copy of `work`.",
            "`handles.into_iter().map(|handle| handle.join().unwrap()).collect()` joins in the order of spawning and builds the result.",
          ],
          solution: rs`use std::thread;

fn run_all(jobs: Vec<u64>, work: fn(u64) -> u64) -> Vec<u64> {
    let mut handles = Vec::new();
    for job in jobs {
        handles.push(thread::spawn(move || work(job)));
    }
    handles.into_iter().map(|handle| handle.join().unwrap()).collect()
}`,
          solutionNote: "The results come back in the order of the handles, whichever thread finished first. Spawning and joining inside one loop would pass these tests as well, and it would run the jobs one at a time. The tests can see which thread ran a job, and not when.",
          tests: [
            { label: 'Returns the results in the order of the inputs', body: rs`fn square(n: u64) -> u64 {
    n * n
}
assert_eq!(run_all(vec![3, 1, 4, 1, 5], square), [9, 1, 16, 1, 25]);` },
            { label: 'An empty list gives an empty result', body: rs`fn double(n: u64) -> u64 {
    n * 2
}
assert!(run_all(Vec::new(), double).is_empty());` },
            { label: 'No job runs on the calling thread', body: rs`use std::sync::Mutex;
use std::thread::{self, ThreadId};

// Every call notes which thread it is running on.
static RAN_ON: Mutex<Vec<ThreadId>> = Mutex::new(Vec::new());
fn noted(n: u64) -> u64 {
    RAN_ON.lock().unwrap().push(thread::current().id());
    n + 1
}

assert_eq!(run_all(vec![10, 20, 30], noted), [11, 21, 31]);
let ran_on = RAN_ON.lock().unwrap();
assert_eq!(ran_on.len(), 3, "work should be called once for each job");
assert!(!ran_on.contains(&thread::current().id()), "a job ran on the thread that called run_all");` },
            { label: 'Each job gets a thread of its own', body: rs`use std::collections::HashSet;
use std::sync::Mutex;
use std::thread::{self, ThreadId};

static RAN_ON: Mutex<Vec<ThreadId>> = Mutex::new(Vec::new());
fn noted(n: u64) -> u64 {
    RAN_ON.lock().unwrap().push(thread::current().id());
    n
}

run_all((1..=8).collect(), noted);
let distinct: HashSet<ThreadId> = RAN_ON.lock().unwrap().iter().copied().collect();
assert_eq!(distinct.len(), 8, "eight jobs should run on eight different threads");` },
            { label: 'The order holds when a later job finishes first', body: rs`// The first jobs count down from the largest numbers, so they tend to finish last.
fn countdown(n: u64) -> u64 {
    let mut left = (5 - n) * 50_000;
    while left > 0 {
        left -= 1;
    }
    n
}
let results = run_all(vec![0, 1, 2, 3, 4], countdown);
assert_eq!(results, [0, 1, 2, 3, 4], "the results must follow the inputs, not the order of finishing");` },
          ],
        },
        {
          id: 'parallel-sum',
          title: 'Add up a slice on several threads',
          level: 'core',
          forbid: ['to_vec', 'to_owned', 'clone'],
          prompt: [
            "`parallel_sum` adds up `cost(value)` for every value in a slice. Think of `cost` as expensive, so that the work is worth dividing. Cut the slice into at most `threads` chunks, give each chunk to a scoped thread that adds up its part, and add the partial sums together.",
            "The slice is borrowed and stays borrowed. `thread::spawn` would refuse it, and copying it is not allowed in this challenge. `threads` is at least 1. Make the chunks as even as `chunks` makes them: none longer than the length divided by `threads`, rounded up. The sum of an empty slice is 0.",
            "The starter gives the right answer and does all the work on the thread that called it.",
          ],
          signature: 'fn parallel_sum(values: &[u64], threads: usize, cost: fn(u64) -> u64) -> u64',
          starter: rs`use std::thread;

fn parallel_sum(values: &[u64], threads: usize, cost: fn(u64) -> u64) -> u64 {
    // Correct, and all on the calling thread.
    // threads is not used yet.
    values.iter().map(|value| cost(*value)).sum()
}`,
          hints: [
            "`values.chunks(size)` cuts the slice into pieces of `size` elements, the last one perhaps shorter. With `size = values.len().div_ceil(threads)` there are at most `threads` pieces.",
            "`chunks(0)` panics, and an empty slice makes that size zero. `.max(1)` on the size takes care of it.",
            "Inside `thread::scope(|s| { … })`, spawn a thread for each chunk and push its handle to a `Vec`: `s.spawn(move || chunk.iter().map(|value| cost(*value)).sum::<u64>())`. After the loop, add up `handle.join().unwrap()` over the handles. That sum is the value of the scope's closure, and so of the function.",
          ],
          solution: rs`use std::thread;

fn parallel_sum(values: &[u64], threads: usize, cost: fn(u64) -> u64) -> u64 {
    let size = values.len().div_ceil(threads).max(1);

    thread::scope(|s| {
        let mut handles = Vec::new();
        for chunk in values.chunks(size) {
            handles.push(s.spawn(move || {
                chunk.iter().map(|value| cost(*value)).sum::<u64>()
            }));
        }
        handles.into_iter().map(|handle| handle.join().unwrap()).sum()
    })
}`,
          solutionNote: "The `move` moves a slice reference and a function value into each thread, and both are `Copy`. The numbers stay where they are, borrowed by every thread at once: many readers and no writer. With Rayon the whole function is `values.par_iter().map(|value| cost(*value)).sum()`.",
          tests: [
            { label: 'Adds up the cost of every element', body: rs`fn same(n: u64) -> u64 {
    n
}
let values: Vec<u64> = (1..=100).collect();
assert_eq!(parallel_sum(&values, 4, same), 5050);` },
            { label: 'Applies cost to each element before adding', body: rs`fn square(n: u64) -> u64 {
    n * n
}
assert_eq!(parallel_sum(&[1, 2, 3, 4, 5, 6, 7], 3, square), 140);` },
            { label: 'An empty slice is 0, with any number of threads', body: rs`fn same(n: u64) -> u64 {
    n
}
assert_eq!(parallel_sum(&[], 4, same), 0);
assert_eq!(parallel_sum(&[], 1, same), 0);` },
            { label: 'Four threads share the work, and none of them is the caller', body: rs`use std::collections::HashSet;
use std::sync::Mutex;
use std::thread::{self, ThreadId};

// Every call notes which thread it is running on.
static RAN_ON: Mutex<Vec<ThreadId>> = Mutex::new(Vec::new());
fn noted(n: u64) -> u64 {
    RAN_ON.lock().unwrap().push(thread::current().id());
    n
}

let values: Vec<u64> = (1..=40).collect();
assert_eq!(parallel_sum(&values, 4, noted), 820);
let distinct: HashSet<ThreadId> = RAN_ON.lock().unwrap().iter().copied().collect();
assert!(!distinct.contains(&thread::current().id()), "an element was handled on the thread that called parallel_sum");
assert_eq!(distinct.len(), 4, "40 elements with threads = 4 should be handled by 4 threads");` },
            { label: 'No thread handles more than its share', body: rs`use std::collections::HashMap;
use std::sync::Mutex;
use std::thread::{self, ThreadId};

static RAN_ON: Mutex<Vec<ThreadId>> = Mutex::new(Vec::new());
fn noted(n: u64) -> u64 {
    RAN_ON.lock().unwrap().push(thread::current().id());
    n
}

let values: Vec<u64> = (1..=10).collect();
assert_eq!(parallel_sum(&values, 4, noted), 55);
let mut share: HashMap<ThreadId, usize> = HashMap::new();
for id in RAN_ON.lock().unwrap().iter() {
    *share.entry(*id).or_insert(0) += 1;
}
assert_eq!(share.values().sum::<usize>(), 10, "cost should be called once for each element");
assert!(share.len() <= 4, "10 elements with threads = 4 were spread over {} threads", share.len());
assert!(share.values().all(|count| *count <= 3), "one thread handled more than 3 of the 10 elements");` },
            { label: 'More threads than elements still gives the right sum', body: rs`fn same(n: u64) -> u64 {
    n
}
assert_eq!(parallel_sum(&[5, 6, 7], 8, same), 18);
assert_eq!(parallel_sum(&[9], 2, same), 9);` },
          ],
        },
        {
          id: 'shared-counter-threads',
          title: 'A counter for several threads',
          level: 'core',
          prompt: [
            "In lesson 20 you built a `Counter` whose handles all count on one number, out of `Rc<Cell<u32>>`. That one is for a single thread. Build it again so that handles can be moved into threads, and so that one counter can be shared between threads by reference.",
            "`handle()` returns another handle on the same count. `increment` adds one. `try_increment(limit)` adds one only if the count is below `limit`, and returns whether it did. However many threads call it at the same time, the count must never pass the limit.",
            "The starter compiles and counts nothing. Choose the field. If you try the types of lesson 20 first, the errors will point into the tests, at the lines that start threads. They are worth reading.",
          ],
          signature: 'impl Counter {\n    fn new() -> Counter\n    fn handle(&self) -> Counter\n    fn increment(&self)\n    fn get(&self) -> u32\n    fn try_increment(&self, limit: u32) -> bool\n}',
          starter: rs`use std::sync::{Arc, Mutex};

struct Counter {
    // What goes here, so that every handle reaches
    // the same number from any thread?
}

impl Counter {
    fn new() -> Counter {
        Counter {}
    }

    // Another handle on the same count.
    fn handle(&self) -> Counter {
        Counter {}
    }

    fn increment(&self) {}

    fn get(&self) -> u32 {
        0
    }

    // Adds one only if the count is below limit.
    // Returns whether it did.
    fn try_increment(&self, limit: u32) -> bool {
        false
    }
}`,
          hints: [
            "The field is the thread-safe pair of the one in lesson 20: `count: Arc<Mutex<u32>>`. `new` builds `Arc::new(Mutex::new(0))`, and `handle` makes another owner with `Arc::clone(&self.count)`.",
            "`increment` is one statement: `*self.count.lock().unwrap() += 1;`. `get` copies the number out: `*self.count.lock().unwrap()`.",
            "`try_increment` has to check and add under one guard. Start with `let mut count = self.count.lock().unwrap();`, then `if *count < limit { *count += 1; true } else { false }`. Calling `get` and then `increment` locks twice, and another thread can get in between.",
          ],
          solution: rs`use std::sync::{Arc, Mutex};

struct Counter {
    count: Arc<Mutex<u32>>,
}

impl Counter {
    fn new() -> Counter {
        Counter { count: Arc::new(Mutex::new(0)) }
    }

    // Another handle on the same count.
    fn handle(&self) -> Counter {
        Counter { count: Arc::clone(&self.count) }
    }

    fn increment(&self) {
        *self.count.lock().unwrap() += 1;
    }

    fn get(&self) -> u32 {
        *self.count.lock().unwrap()
    }

    // Adds one only if the count is below limit.
    // Returns whether it did.
    fn try_increment(&self, limit: u32) -> bool {
        // One guard for the check and the change.
        let mut count = self.count.lock().unwrap();
        if *count < limit {
            *count += 1;
            true
        } else {
            false
        }
    }
}`,
          solutionNote: "An `Arc<AtomicU32>` passes as well. `increment` becomes `fetch_add`, and `try_increment` needs `try_update`, which retries until its check and its change have happened as one step. With a `Mutex`, holding the guard does that job and reads like ordinary code.",
          tests: [
            { label: 'A new counter starts at zero', body: rs`assert_eq!(Counter::new().get(), 0);` },
            { label: 'A handle counts on the same number', body: rs`let first = Counter::new();
let second = first.handle();
first.increment();
second.increment();
second.increment();
assert_eq!(first.get(), 3, "increments made through the second handle should show through the first");
assert_eq!(second.get(), 3, "the increment made through the first handle should show through the second");` },
            { label: 'Handles moved into four threads lose no increment', body: rs`use std::thread;

let counter = Counter::new();
let mut spawned = Vec::new();
for _ in 0..4 {
    let handle = counter.handle();
    spawned.push(thread::spawn(move || {
        for _ in 0..1_000 {
            handle.increment();
        }
    }));
}
for join_handle in spawned {
    join_handle.join().unwrap();
}
assert_eq!(counter.get(), 4_000);` },
            { label: 'One counter can be shared by reference between scoped threads', body: rs`use std::thread;

let counter = Counter::new();
thread::scope(|s| {
    for _ in 0..3 {
        s.spawn(|| {
            for _ in 0..500 {
                counter.increment();
            }
        });
    }
});
assert_eq!(counter.get(), 1_500);` },
            { label: 'try_increment stops at the limit', body: rs`let counter = Counter::new();
let results: Vec<bool> = (0..5).map(|_| counter.try_increment(3)).collect();
assert_eq!(results, [true, true, true, false, false]);
assert_eq!(counter.get(), 3);` },
            { label: 'Eight threads cannot push a count past its limit', body: rs`use std::sync::Barrier;
use std::thread;

// 1,000 counters, each with room for one increment. Eight threads try every one of them.
let counters: Vec<Counter> = (0..1_000).map(|_| Counter::new()).collect();
let start = Barrier::new(8);
let mut succeeded = 0;
thread::scope(|s| {
    let mut spawned = Vec::new();
    for _ in 0..8 {
        spawned.push(s.spawn(|| {
            start.wait();                       // wait until all eight threads are ready
            counters.iter().filter(|counter| counter.try_increment(1)).count()
        }));
    }
    for join_handle in spawned {
        succeeded += join_handle.join().unwrap();
    }
});
assert!(counters.iter().all(|counter| counter.get() == 1), "a count went past its limit of 1");
assert_eq!(succeeded, 1_000, "try_increment returned true more often than there was room");` },
            { label: 'Two new counters stay separate', body: rs`let apples = Counter::new();
let pears = Counter::new();
apples.increment();
assert_eq!(apples.get(), 1);
assert_eq!(pears.get(), 0);` },
          ],
        },
        {
          id: 'channel-pipeline',
          title: 'A stage in a pipeline',
          level: 'core',
          prompt: [
            "A pipeline is a row of threads joined by channels. Write one stage of it. `stage` is given the receiving end of a channel and a function. It starts a thread that takes each number from `input`, applies `step` to it, and sends the result into a new channel. `stage` returns the receiving end of that new channel **at once**, while its thread carries on working.",
            "When `input` closes, the stage's thread ends. That drops its sender, which closes the output, and so the next stage ends as well. The tests build pipelines by handing one stage's output to the next: `stage(stage(input, double), add_one)`.",
            "The starter returns the receiving end of a channel that nobody will ever send into. If a run is stopped for taking too long, some thread is waiting for the input to close when it should be passing values on.",
          ],
          signature: 'fn stage(input: Receiver<u64>, step: fn(u64) -> u64) -> Receiver<u64>',
          starter: rs`use std::sync::mpsc::{self, Receiver};
use std::thread;

fn stage(input: Receiver<u64>, step: fn(u64) -> u64) -> Receiver<u64> {
    let (sender, output) = mpsc::channel();
    // Nothing reads input, and sender is dropped
    // when this function returns.
    output
}`,
          hints: [
            "Make the output channel, spawn a thread, and return the output's receiver. The thread needs `input`, `step` and the sender, so its closure is a `move` closure.",
            "Inside the thread: `for value in input { … }`. The loop ends by itself when the input channel closes.",
            "In the loop: `if sender.send(step(value)).is_err() { break; }`. `send` fails only when nobody is listening any more, and then there is no point in going on. When the loop ends, the closure ends, `sender` is dropped, and the output closes.",
          ],
          solution: rs`use std::sync::mpsc::{self, Receiver};
use std::thread;

fn stage(input: Receiver<u64>, step: fn(u64) -> u64) -> Receiver<u64> {
    let (sender, output) = mpsc::channel();

    thread::spawn(move || {
        for value in input {
            if sender.send(step(value)).is_err() {
                break;                  // the next stage is gone: stop working
            }
        }
        // The closure ends here. That drops sender, which closes the output.
    });

    output
}`,
          solutionNote: "Nobody joins the stage's thread, and nobody needs to. It ends when its input closes, and the closing of its output tells the next stage. Dropping the first sender and letting the closing travel down the row is the usual way to shut a pipeline down.",
          tests: [
            { label: 'A stage applies its step to every value, in order', body: rs`use std::sync::mpsc;

fn double(n: u64) -> u64 {
    n * 2
}
let (numbers, input) = mpsc::channel();
let output = stage(input, double);
for n in [1, 2, 3] {
    assert!(numbers.send(n).is_ok(), "the stage has stopped listening to its input");
}
drop(numbers);                                  // closes the input
let results: Vec<u64> = output.iter().collect();
assert_eq!(results, [2, 4, 6]);` },
            { label: 'A result is ready while the input is still open', body: rs`use std::sync::mpsc;

fn double(n: u64) -> u64 {
    n * 2
}
let (numbers, input) = mpsc::channel();
let output = stage(input, double);
assert!(numbers.send(21).is_ok(), "the stage has stopped listening to its input");
assert_eq!(output.recv().ok(), Some(42), "the stage should pass each value on as soon as it arrives");
assert!(numbers.send(5).is_ok(), "the stage has stopped listening to its input");
assert_eq!(output.recv().ok(), Some(10));` },
            { label: 'The output closes when the input closes', body: rs`use std::sync::mpsc;

fn same(n: u64) -> u64 {
    n
}
let (numbers, input) = mpsc::channel();
let output = stage(input, same);
assert!(numbers.send(7).is_ok(), "the stage has stopped listening to its input");
drop(numbers);
assert_eq!(output.recv().ok(), Some(7));
assert!(output.recv().is_err(), "after the last value, recv should report that the channel is closed");` },
            { label: 'Three stages in a row work as a pipeline', body: rs`use std::sync::mpsc;

fn double(n: u64) -> u64 {
    n * 2
}
fn add_one(n: u64) -> u64 {
    n + 1
}
fn square(n: u64) -> u64 {
    n * n
}
let (numbers, input) = mpsc::channel();
let output = stage(stage(stage(input, double), add_one), square);
for n in 1..=5 {
    assert!(numbers.send(n).is_ok(), "the first stage has stopped listening to its input");
}
drop(numbers);
let results: Vec<u64> = output.iter().collect();
assert_eq!(results, [9, 25, 49, 81, 121]);` },
          ],
        },
        {
          id: 'rc-across-threads',
          title: 'From Rc<RefCell> to threads',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "`length_histogram` counts how many words there are of each length. It is given the words in batches. It starts one thread for each batch, and every thread adds what it finds to one shared map. A `BTreeMap` is the map from lesson 14 that keeps its keys in order.",
            "It was written the way lesson 20 shares a changing value on one thread, with `Rc<RefCell<…>>`, and the compiler refuses it. Keep the design: one thread for each batch, and one map that they all update. Change the types that make it unsafe.",
            "Fix what the first error names and run the tests again. There are two layers, and the compiler reports them one at a time.",
          ],
          signature: 'fn length_histogram(batches: Vec<Vec<String>>) -> BTreeMap<usize, u32>',
          starter: rs`use std::cell::RefCell;
use std::collections::BTreeMap;
use std::rc::Rc;
use std::thread;

fn length_histogram(batches: Vec<Vec<String>>) -> BTreeMap<usize, u32> {
    let histogram = Rc::new(RefCell::new(BTreeMap::new()));

    let mut handles = Vec::new();
    for batch in batches {
        let histogram = Rc::clone(&histogram);
        handles.push(thread::spawn(move || {
            for word in batch {
                *histogram.borrow_mut().entry(word.len()).or_insert(0) += 1;
            }
        }));
    }
    for handle in handles {
        handle.join().unwrap();
    }

    histogram.borrow().clone()
}`,
          hints: [
            "The first error says that an `Rc` cannot be sent between threads. Its thread-safe counterpart has the same functions: `Arc::new` and `Arc::clone`, from `std::sync`.",
            "The next error says that a `RefCell` cannot be shared between threads. Its counterpart is `Mutex`, and `borrow_mut()` becomes `lock().unwrap()`.",
            "Three lines change besides the imports: `Arc::new(Mutex::new(BTreeMap::new()))` at the top, `*histogram.lock().unwrap().entry(word.len()).or_insert(0) += 1;` in the thread, and `histogram.lock().unwrap().clone()` at the end.",
          ],
          solution: rs`use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use std::thread;

fn length_histogram(batches: Vec<Vec<String>>) -> BTreeMap<usize, u32> {
    let histogram = Arc::new(Mutex::new(BTreeMap::new()));

    let mut handles = Vec::new();
    for batch in batches {
        let histogram = Arc::clone(&histogram);
        handles.push(thread::spawn(move || {
            for word in batch {
                *histogram.lock().unwrap().entry(word.len()).or_insert(0) += 1;
            }
        }));
    }
    for handle in handles {
        handle.join().unwrap();
    }

    histogram.lock().unwrap().clone()
}`,
          solutionNote: "The translation is mechanical because the two pairs are one design: shared ownership around a check of the aliasing rule at run time. What differs is what happens on a conflict. A second `borrow_mut` panics, and a second `lock` waits its turn. Another sound design needs no shared map at all: each thread builds and returns a map of its own, and the function merges them after the joins.",
          tests: [
            { label: 'Counts words by length across batches', body: rs`let batches = vec![
    vec![String::from("a"), String::from("bb"), String::from("cc")],
    vec![String::from("dd"), String::from("eee")],
];
let histogram = length_histogram(batches);
assert_eq!(histogram.get(&1), Some(&1));
assert_eq!(histogram.get(&2), Some(&3));
assert_eq!(histogram.get(&3), Some(&1));
assert_eq!(histogram.len(), 3);` },
            { label: 'No batches gives an empty map', body: rs`assert!(length_histogram(Vec::new()).is_empty());` },
            { label: 'An empty batch among the others changes nothing', body: rs`let batches = vec![vec![String::from("four")], Vec::new(), vec![String::from("five")]];
let histogram = length_histogram(batches);
assert_eq!(histogram.get(&4), Some(&2));
assert_eq!(histogram.len(), 1);` },
            { label: 'No count is lost when eight threads update the map at once', body: rs`let batch: Vec<String> = (0..500).map(|n| "x".repeat(n % 5 + 1)).collect();
let histogram = length_histogram(vec![batch; 8]);
for length in 1..=5 {
    assert_eq!(histogram.get(&length), Some(&800), "words of length {length}");
}` },
            { label: 'The keys come out in order', body: rs`let batches = vec![vec![String::from("nine nine"), String::from("to")], vec![String::from("fiver")]];
let lengths: Vec<usize> = length_histogram(batches).into_keys().collect();
assert_eq!(lengths, [2, 5, 9]);` },
          ],
        },
        {
          id: 'worker-pool',
          title: 'A pool of workers',
          level: 'stretch',
          prompt: [
            "`run_all` in the first challenge started a thread for every job. With ten thousand jobs that is ten thousand threads. A **worker pool** starts a fixed number of threads, and each one takes job after job from a shared queue until the queue is empty.",
            "Write `run_pool`. It starts exactly `workers` threads, however many jobs there are, and `workers` is at least 1. Every job runs once, on one of those threads and never on the caller's. The results come back in the order of the jobs, whichever worker ran them, so keep each job's index with it.",
            "The starter is the solution of the first challenge: the right results, and a thread for each job. The tools are all in the lesson. A queue that several threads take from needs a `Mutex`. Results can come back through a channel, through the values the threads return, or through a second `Mutex`.",
            "Some mistakes here stop the clock instead of failing a test. If a run is stopped for taking too long, a thread is waiting for something that will never happen. One cause is a worker that holds the queue's lock **while it runs a job**, so that no other worker can take one. Another is a channel that never closes.",
          ],
          signature: 'fn run_pool(jobs: Vec<u64>, workers: usize, work: fn(u64) -> u64) -> Vec<u64>',
          starter: rs`use std::thread;

fn run_pool(jobs: Vec<u64>, workers: usize, work: fn(u64) -> u64) -> Vec<u64> {
    // One thread for each job, however many there are.
    // workers is not used yet.
    let mut handles = Vec::new();
    for job in jobs {
        handles.push(thread::spawn(move || work(job)));
    }
    handles.into_iter().map(|handle| handle.join().unwrap()).collect()
}`,
          hints: [
            "Put the jobs where every worker can take the next one: `let queue = Mutex::new(jobs.into_iter().enumerate());`. An iterator behind a `Mutex` is a queue, and `enumerate` pairs each job with its index.",
            "With `thread::scope`, the workers can borrow `queue` and a `Mutex<Vec<u64>>` for the results, and no `Arc` is needed. Each worker loops: take the next job, stop if there is none, run it, store the result at its index.",
            "Take the job in a statement of its own: `let next = queue.lock().unwrap().next();`. The guard is a temporary, gone at the semicolon, so the lock is free while `work` runs. Then `let Some((index, job)) = next else { break };`. A `while let` with the lock in its condition would keep the guard alive through the whole loop body.",
          ],
          solution: rs`use std::sync::Mutex;
use std::thread;

fn run_pool(jobs: Vec<u64>, workers: usize, work: fn(u64) -> u64) -> Vec<u64> {
    let results = Mutex::new(vec![0; jobs.len()]);
    let queue = Mutex::new(jobs.into_iter().enumerate());

    thread::scope(|s| {
        for _ in 0..workers {
            s.spawn(|| {
                loop {
                    // The guard is a temporary of this statement,
                    // so the lock is free while the job runs.
                    let next = queue.lock().unwrap().next();
                    let Some((index, job)) = next else { break };
                    let result = work(job);
                    results.lock().unwrap()[index] = result;
                }
            });
        }
    });

    results.into_inner().unwrap()
}`,
          solutionNote: "Scoped threads keep this short. The workers borrow the queue and the results, and once they are gone `into_inner` takes the results out of the `Mutex` without locking it. A pool that lives longer than one call cannot borrow. Its workers are made with `thread::spawn`, and jobs reach them through a channel whose receiver sits in an `Arc<Mutex<Receiver<Job>>>`. A `Receiver` is `Send` and not `Sync`, and the `Mutex` is what lets several workers take turns at it.",
          tests: [
            { label: 'Returns the results in the order of the jobs', body: rs`fn square(n: u64) -> u64 {
    n * n
}
assert_eq!(run_pool(vec![3, 1, 4, 1, 5, 9, 2, 6], 3, square), [9, 1, 16, 1, 25, 81, 4, 36]);` },
            { label: 'Eight jobs run on at most two threads, and never on the caller', body: rs`use std::collections::HashSet;
use std::sync::Mutex;
use std::thread::{self, ThreadId};

// Every call notes which thread it is running on.
static RAN_ON: Mutex<Vec<ThreadId>> = Mutex::new(Vec::new());
fn noted(n: u64) -> u64 {
    RAN_ON.lock().unwrap().push(thread::current().id());
    n + 1
}

assert_eq!(run_pool(vec![0, 1, 2, 3, 4, 5, 6, 7], 2, noted), [1, 2, 3, 4, 5, 6, 7, 8]);
let ran_on = RAN_ON.lock().unwrap();
assert_eq!(ran_on.len(), 8, "work should be called once for each job");
let distinct: HashSet<ThreadId> = ran_on.iter().copied().collect();
assert!(!distinct.contains(&thread::current().id()), "a job ran on the thread that called run_pool");
assert!(distinct.len() <= 2, "8 jobs ran on {} threads, and the pool has 2 workers", distinct.len());` },
            { label: 'Three workers run three jobs at the same time', body: rs`use std::sync::Barrier;

// Each call waits here until three calls are waiting, and then all three go on.
// Three workers that each take a job get through. If only one job can run at a
// time, nobody gets through, and the run is stopped for taking too long.
static ALL_BUSY: Barrier = Barrier::new(3);
fn wait_for_two_others(n: u64) -> u64 {
    ALL_BUSY.wait();
    n * 10
}
assert_eq!(run_pool(vec![1, 2, 3, 4, 5, 6], 3, wait_for_two_others), [10, 20, 30, 40, 50, 60]);` },
            { label: 'More workers than jobs still finishes', body: rs`fn double(n: u64) -> u64 {
    n * 2
}
assert_eq!(run_pool(vec![7, 8], 8, double), [14, 16]);
assert!(run_pool(Vec::new(), 4, double).is_empty());` },
          ],
        },
      ],
    },
  );
})();
