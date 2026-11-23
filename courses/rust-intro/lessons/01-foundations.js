// Part 1: Foundations. The parts of Rust that look familiar, and where they stop being familiar.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 1 · Foundations';
  // A table row as the format-a-row challenge wants it: the name in 10 columns, the price in 8.
  const row = (name, price) => `${name.padEnd(10)} | ${price.padStart(8)}`;

  (window.C_LESSONS ||= []).push(
    {
      id: 'first-program',
      title: 'From source to program',
      category: part,
      minutes: 20,
      summary: 'How Rust source becomes a running program, how to print things, and how to read what the compiler tells you.',
      topics: ['Compile and run', 'main', 'println!', 'Diagnostics'],
      sections: [
        {
          title: 'How this manual works',
          body: [
            "Each lesson has three tabs. **Learn** explains the ideas, **Questions** checks that they landed, and **Challenges** has you write Rust against a set of tests. You already program, so the lessons skip what a loop is and spend their time on what Rust does differently.",
            "Every dark code block with a **Run** button is live. Run sends the code in that block to the Rust Playground, a service run by the Rust project. It compiles the code with the current stable compiler and sends back the output. That takes a second or two and needs a network connection. Edit the code, break it, run it again.",
            { run: rs`fn main() {
    println!("Hello from Rust");
}`, name: 'hello.rs', expect: 'Hello from Rust\n' },
            "Some examples are meant to fail. A block that already shows compiler output before you press Run is one of them. In Rust the compiler's message is often the lesson, so read it first, and then see whether you can change the code to satisfy it.",
            { aside: "The Playground builds for a 64-bit Linux machine. Sizes there match a current Mac or PC: a pointer is 8 bytes. Programs get no input, and one that runs for more than about ten seconds is stopped." },
          ],
        },
        {
          title: 'Compile, then run',
          body: [
            "Rust has no interpreter and no virtual machine. The compiler, `rustc`, turns your source into machine code ahead of time, and the result runs directly on the processor. Nothing of the language runs alongside it: no garbage collector, no runtime that looks up names or checks types.",
            { steps: [
              "**Check.** The compiler parses the source and checks it: names, types, that every case is handled, and that every value is used only while it is valid. Most of this manual is about this stage.",
              "**Generate.** The checked program is translated to machine code and optimized.",
              "**Link.** Your code and the standard library are joined into one executable file.",
              "**Run.** The operating system loads the executable. A few checks remain at run time, such as array bounds, but there are no types left to inspect.",
            ] },
            { compare: "Python and PHP find most mistakes while the program runs, and report them with a stack trace. TypeScript checks types before running, then erases them and hands the program to a JavaScript engine. Rust checks more than any of them before a program exists at all: types, missing cases, the use of freed memory, and data shared unsafely between threads. What it accepts runs with no interpreter underneath." },
            { native: [
              "Install Rust with `rustup` from rustup.rs. It brings `rustc`, the compiler, and `cargo`, the tool you use every day. Cargo creates projects, builds them, runs them, runs their tests and fetches libraries.",
              { shell: 'cargo new hello\ncd hello\ncargo run', name: 'Terminal · create a project and run it' },
              "`cargo run` makes a **debug** build: quick to compile, not optimized, with extra checks. `cargo run --release` makes an optimized build. The Run buttons in this manual make debug builds.",
            ] },
          ],
        },
        {
          title: 'The anatomy of a program',
          body: [
            "A Rust source file is a list of items: functions, types, constants. Execution starts at the function named `main`.",
            { run: rs`// A function: name, parameters with their types, return type, body.
fn square(n: i32) -> i32 {
    n * n                       // The last expression is the return value.
}

fn main() {                     // Execution starts here.
    let side = 7;               // A variable. Its type, i32, is inferred.
    println!("{} squared is {}", side, square(side));
}`, name: 'anatomy.rs', expect: '7 squared is 49\n' },
            { list: [
              "`fn` defines a function. `main` takes no parameters and returns nothing.",
              "Statements end with `;`. Blocks are wrapped in `{ }`. Indentation means nothing to the compiler.",
              "`let` declares a variable. `i32` is a 32-bit signed integer, the type an integer gets when nothing asks for another.",
              "`square` could just as well be defined below `main`. The order of items in a file does not matter.",
              "`println!` ends in `!` because it is a **macro**, not a function. A macro is expanded into ordinary code while the program is compiled. That is how `println!` can take any number of arguments and check them against its format string.",
            ] },
            { pitfall: "There is no `return` in `square`, and no semicolon after `n * n`. Both are deliberate. A function returns the value of its last expression, and a semicolon there would throw that value away. Lesson 3 comes back to this, because it is the first error most people meet." },
          ],
        },
        {
          title: 'println! and format strings',
          body: [
            "`println!` takes a format string, then the values to put into it. Each `{}` takes the next value. Inside the braces you can name a variable, choose how the value is shown, and set a width.",
            { table: {
              head: ['Placeholder', 'Prints', 'Notes'],
              rows: [
                ['`{}`', 'The value, formatted for a reader', 'Numbers, text, characters and booleans have this form. Arrays and tuples do not.'],
                ['`{:?}`', 'The value, formatted for a programmer', 'Works on nearly every type. Text is shown with its quotes.'],
                ['`{:#?}`', 'The same, spread over several lines', 'For nested data.'],
                ['`{name}`', 'The variable `name`', 'Only a plain variable name fits here, not an expression.'],
                ['`{:5}` `{:<5}` `{:^5}` `{:>5}`', 'At least 5 columns wide', 'Numbers align right and text aligns left unless you say otherwise.'],
                ['`{:05}` `{:.2}` `{:8.3}`', 'Zero padding, decimals, both', 'Decimals are rounded.'],
                ['`{:x}` `{:b}` `{:#x}`', 'Hexadecimal, binary, with a prefix', ''],
                ['`{{` and `}}`', 'A literal brace', ''],
              ],
            } },
            { run: rs`fn main() {
    let count = 42;
    let ratio = 2.0 / 3.0;
    let name = "Ferris";

    println!("[{}] [{:5}] [{:<5}] [{:05}]", count, count, count, count);
    println!("[{:.2}] [{:8.3}]", ratio, ratio);
    println!("[{name}] [{name:?}] [{count:x}] [{count:#b}] [{{}}]");
    println!("{:?}", (count, name, [1, 2, 3]));
}`, name: 'formats.rs', expect: '[42] [   42] [42   ] [00042]\n[0.67] [   0.667]\n[Ferris] ["Ferris"] [2a] [0b101010] [{}]\n(42, "Ferris", [1, 2, 3])\n' },
            "The format string is checked when the program is compiled. A placeholder with no value to fill it is an error, not a run-time surprise.",
            { run: rs`fn main() {
    let width = 3;
    println!("{} by {}", width);
}`, name: 'mismatch.rs', fails: '2 positional arguments in format string' },
            { list: [
              "`print!` is `println!` without the newline, and `eprintln!` writes to standard error.",
              "`format!` builds the text and returns it instead of printing it.",
              "`dbg!(expression)` prints the file, the line and the value to standard error, and gives the value back, so it can be wrapped around part of a larger expression.",
            ] },
            { compare: "`{name}` reads like a Python f-string or a JavaScript template literal, and `format!` is the counterpart of `sprintf`. The difference is the checking: a wrong argument count or a type that cannot be printed stops the build. `printf` in PHP or C finds out while running, if at all." },
            { tip: "Text has two types in Rust, `&str` and `String`, and lesson 9 is about the difference. Until then, any signature that involves text is written for you." },
          ],
        },
        {
          title: 'Reading compiler diagnostics',
          body: [
            "The Rust compiler's messages are long because they do part of the teaching. Every one has the same parts, and it pays to read all of them.",
            { run: rs`fn main() {
    let total = 10;
    let share = totl / 4;
    println!("{share}");
}`, name: 'typo.rs', fails: 'E0425' },
            { steps: [
              "`error[E0425]` is the severity and a code. The code identifies the kind of mistake, and the lessons refer to errors by it.",
              "`--> main.rs:3:17` is the file, the line and the column.",
              "The excerpt shows your code with `^^^^` under the exact span the compiler means, and a label beside it.",
              "`help:` suggests a fix. It is right often enough that you should always read it.",
              "The last line names `rustc --explain E0425`, which prints a longer explanation with examples.",
            ] },
            "Types are checked in the same way. This call passes a floating-point number where the function asks for an integer. Nothing converts it for you.",
            { run: rs`fn half(n: i32) -> i32 {
    n / 2
}

fn main() {
    let result = half(7.0);
    println!("{result}");
}`, name: 'mismatched.rs', fails: 'E0308' },
            "An **error** stops the build, so no program is produced. A **warning** lets it continue. This program builds and runs, and the compiler still has something to say about it.",
            { run: rs`fn main() {
    let total = 10;
    let spare = 3;
    println!("{total}");
}`, name: 'warning.rs', warns: true, expect: '10\n' },
            { tip: "Work from the top. One mistake can produce several messages, and the later ones often vanish when the first is fixed. Treat warnings as bugs you have not met yet." },
            { native: [
              "Two commands give you these messages without building a program:",
              { shell: 'cargo check     # the checks only: fast\ncargo clippy    # several hundred extra lints for likely mistakes and unidiomatic code', name: 'Terminal · check without building' },
            ] },
          ],
        },
        {
          title: 'What Rust leaves out, and what it adds',
          body: [
            "Much of learning Rust is noticing what is absent, and finding the type that took its place.",
            { table: {
              head: ['You are used to', 'In Rust'],
              rows: [
                ['`null`, `None` or `undefined` turning up anywhere', 'There is no null. A value that may be absent has the type `Option<T>`, and the compiler makes you handle the empty case.'],
                ['Exceptions', 'A function that can fail returns a `Result<T, E>`. A bug that cannot be handled is a panic, which stops the thread.'],
                ['Classes and inheritance', '`struct` and `enum` for data, `impl` blocks for methods, and traits for shared behavior. There is no inheritance.'],
                ['A garbage collector or reference counts', 'Ownership. Every value has one owner and is freed when that owner goes out of scope. The compiler checks it.'],
                ['Values that convert themselves, and truthy values', 'No implicit conversions and no truthiness. An `if` takes a `bool` and nothing else.'],
                ['Variables you can reassign', 'Variables are immutable unless declared `mut`.'],
                ['Objects shared and changed from anywhere', 'Data can have many readers or one writer at a time. The compiler checks that too.'],
              ],
            } },
            "Part 2 is about ownership, because most rows of that table come back to it.",
          ],
        },
      ],
      takeaways: [
        "Rust is compiled ahead of time to machine code. No interpreter and no garbage collector runs beside your program.",
        "A function returns the value of its last expression. `println!` is a macro, and its format string is checked against its arguments at compile time.",
        "A diagnostic has a code, an exact location, labels and often a `help:` line with the fix. Start with the first one.",
        "Most of what Rust removes (null, exceptions, implicit conversions) comes back as a type that the compiler makes you handle.",
      ],
      quiz: [
        {
          q: 'What does the `!` in `println!` tell you?',
          options: [
            { t: 'It is a macro, expanded into ordinary code at compile time', ok: true, why: "Every macro call ends in `!`. Being a macro is what lets `println!` take any number of arguments and check them against the format string." },
            { t: 'It can fail, so the call needs error handling', why: "That is what a `!` or `?` means in some other languages. In Rust the `!` marks a macro and says nothing about failure." },
            { t: 'It changes its arguments in place', why: "That is the convention for `!` in Ruby. `println!` only reads its arguments." },
            { t: 'It is a function built into the compiler', why: "It is defined in the standard library, as a macro. Functions never have `!` in their names." },
          ],
        },
        {
          q: 'Given `let pair = (1, "one");`, which call compiles?',
          options: [
            { t: '`println!("{}", pair);`', why: "`{}` asks for the form meant for readers, and a tuple has none. The compiler reports `E0277` and suggests `{:?}`." },
            { t: '`println!("{:?}", pair);`', ok: true, why: "`{:?}` is the debugging form, which tuples, arrays and most other types have. It prints `(1, \"one\")`." },
            { t: '`println!(pair);`', why: "The first argument must be a string literal, because the macro reads it at compile time." },
            { t: '`println!("{pair.0}");`', why: "Only a plain variable name can go inside the braces. For anything else, pass it as an argument: `println!(\"{}\", pair.0)`." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    println!("{:5.1}|{:<4}|{:04}", 3.14159, 7, 42);
}`,
          answer: '  3.1|7   |0042',
          explain: "`{:5.1}` rounds to one decimal and pads to five columns. Numbers align right. `{:<4}` aligns left in four columns, and `{:04}` pads to four with zeros.",
          hint: "The number before the dot is a minimum width. `<` aligns left, and a leading zero pads with zeros.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let name = "Ada";
    let year = 1843;
    println!("{name:?} wrote it in {year}, or {year:#x} in hex");
}`,
          answer: '"Ada" wrote it in 1843, or 0x733 in hex',
          explain: "`{name:?}` is the debugging form, which shows text with its quotes. `{year:#x}` is hexadecimal with the `0x` prefix.",
          hint: "What does `:?` add to a piece of text?",
        },
        {
          q: 'What happens when this program is built and run?',
          code: rs`fn double(n: i32) -> i32 {
    n * 2
}

fn main() {
    let text = "21";
    let answer = double(text);
    println!("{answer}");
}`,
          options: [
            { t: 'The build fails at the call on line 7: expected `i32`, found `&str`', ok: true, why: "The argument is text and the parameter is an integer. The compiler reports `E0308` at the call and adds a note pointing at the definition of `double`." },
            { t: 'It prints `42`, because the text is converted to a number', why: "PHP and JavaScript would do that. Rust never converts between types on its own. You would write `text.parse()` and deal with the case where it is not a number." },
            { t: 'It builds, and fails with an error when line 7 runs', why: "Python would do that. In Rust the types are checked before any program exists, so there is nothing to run." },
            { t: 'The build fails at line 1, where `double` is defined', why: "The definition is correct. The mistake is in the call, and that is where the error is reported." },
          ],
          verify: 'E0308',
        },
        {
          kind: 'multi',
          q: 'Which of these does Rust not have?',
          options: [
            { t: 'A `null` value', ok: true, why: "An absent value is `None`, one of the two cases of `Option<T>`." },
            { t: 'Exceptions with `try` and `catch`', ok: true, why: "Failure is an ordinary return value of type `Result<T, E>`." },
            { t: 'Inheritance between types', ok: true, why: "Behavior is shared through traits, and data by putting one struct inside another." },
            { t: 'A garbage collector', ok: true, why: "Memory is freed when the owner of a value goes out of scope." },
            { t: 'Closures', why: "It has them, written `|x| x + 1`. Lesson 17 covers them." },
            { t: 'Generic types', why: "It has them: `Vec<T>` and `Option<T>` are generic. Lesson 15 covers them." },
          ],
          hint: "Four are missing. The two that Rust has are things you would not want to give up.",
        },
      ],
      challenges: [
        {
          id: 'to-fahrenheit',
          title: 'Celsius to Fahrenheit',
          level: 'warm-up',
          prompt: [
            "A first challenge, to get used to the editor. Change the function on the right and run the tests. Each test can be opened to see the code it runs.",
            "Convert a temperature from degrees Celsius to degrees Fahrenheit: multiply by nine fifths and add 32.",
          ],
          signature: 'fn to_fahrenheit(celsius: f64) -> f64',
          starter: rs`fn to_fahrenheit(celsius: f64) -> f64 {
    // The last expression is the return value, so it has no semicolon.
    celsius + 32.0
}`,
          hints: [
            "`f64` is a floating-point number. Its literals need a decimal point: `9.0`, not `9`.",
            "`celsius * 9.0 / 5.0 + 32.0`, with no semicolon after it.",
          ],
          solution: rs`fn to_fahrenheit(celsius: f64) -> f64 {
    celsius * 9.0 / 5.0 + 32.0
}`,
          tests: [
            { label: 'Freezing point', body: rs`assert_eq!(to_fahrenheit(0.0), 32.0);` },
            { label: 'Boiling point', body: rs`assert_eq!(to_fahrenheit(100.0), 212.0);` },
            { label: 'Where the two scales meet', body: rs`assert_eq!(to_fahrenheit(-40.0), -40.0);` },
            { label: 'Body temperature, to within rounding', body: rs`assert!((to_fahrenheit(37.0) - 98.6).abs() < 1e-9);` },
          ],
        },
        {
          id: 'fix-three-errors',
          title: 'Read the diagnostics',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "This code has three mistakes and will not compile. Run the tests, read the compiler output in the console, and fix what it reports. Line numbers in the messages refer to `solution.rs`, the file in the editor.",
            "Do not rewrite it. Change only what the diagnostics point to. Fixing one error can reveal the next, so expect to run the tests more than once.",
          ],
          signature: 'fn cube(n: i32) -> i32\nfn sum_of_cubes(a: i32, b: i32) -> i32',
          starter: rs`fn cube(n: i32) -> i32 {
    n * n * n;
}

fn sum_of_cubes(a: i32, b: i32) {
    let total = cube(a) + cube(b);
    totl
}`,
          hints: [
            "`cannot find value` means a name was never declared. The `help:` line suggests the name you meant.",
            "`expected i32, found ()` on a function means its body produced no value. The compiler points at a semicolon and offers to remove it.",
            "A function with no `->` returns nothing. `sum_of_cubes` needs `-> i32`.",
          ],
          solution: rs`fn cube(n: i32) -> i32 {
    n * n * n
}

fn sum_of_cubes(a: i32, b: i32) -> i32 {
    let total = cube(a) + cube(b);
    total
}`,
          tests: [
            { label: 'cube of a positive number', body: rs`assert_eq!(cube(3), 27);` },
            { label: 'cube of a negative number', body: rs`assert_eq!(cube(-2), -8);` },
            { label: 'sum of two cubes', body: rs`assert_eq!(sum_of_cubes(1, 2), 9);` },
            { label: 'cubes that cancel out', body: rs`assert_eq!(sum_of_cubes(-4, 4), 0);` },
          ],
        },
        {
          id: 'format-a-row',
          title: 'Format a table row',
          level: 'core',
          prompt: [
            "`format!` works like `println!`, but returns the text instead of printing it. The signature is written for you: `&str` is text the function is given, and `String` is text it creates. Lesson 9 covers both.",
            "Return one row of a price list. The name is aligned left in 10 columns. Then comes a space, a `|` and a space. Then the price, aligned right in 8 columns with 2 decimals. So `format_row(\"tea\", 3.5)` is `tea` and seven spaces, then ` | `, then four spaces and `3.50`.",
          ],
          signature: 'fn format_row(name: &str, price: f64) -> String',
          starter: rs`fn format_row(name: &str, price: f64) -> String {
    format!("{name} | {price}")
}`,
          hints: [
            "A width goes after a colon: `{name:<10}` is `name`, aligned left in 10 columns.",
            "Width and decimals combine as `{price:8.2}`. Numbers align right by default.",
            "`format!(\"{name:<10} | {price:8.2}\")`",
          ],
          solution: rs`fn format_row(name: &str, price: f64) -> String {
    format!("{name:<10} | {price:8.2}")
}`,
          tests: [
            { label: 'Pads a short name and a small price', body: `assert_eq!(format_row("tea", 3.5), "${row('tea', '3.50')}");` },
            { label: 'Shows two decimals for a whole number', body: `assert_eq!(format_row("espresso", 12.0), "${row('espresso', '12.00')}");` },
            { label: 'Rounds to two decimals', body: `assert_eq!(format_row("cake", 4.999), "${row('cake', '5.00')}");` },
            { label: 'Does not cut a long name short', body: `assert_eq!(format_row("double espresso", 1.25), "${row('double espresso', '1.25')}");` },
          ],
        },
      ],
    },

    {
      id: 'variables-and-types',
      title: 'Variables, types & conversions',
      category: part,
      minutes: 30,
      summary: 'What a binding is, what the number types mean at their edges, and why nothing converts unless you ask.',
      topics: ['let and mut', 'Shadowing', 'Integer types', 'Overflow', 'Conversions', 'Tuples and arrays'],
      sections: [
        {
          title: 'let binds, mut permits change',
          body: [
            "`let` gives a name to a value. Unless you add `mut`, the name is bound once and cannot be assigned again.",
            { run: rs`fn main() {
    let count = 5;
    count = 6;
    println!("{count}");
}`, name: 'immutable.rs', fails: 'E0384' },
            "The message says what to do. With `mut`, the variable can change. There is no `++`: write `count += 1`.",
            { run: rs`fn main() {
    let mut count = 5;
    count += 1;
    println!("{count}");
}`, name: 'mutable.rs', expect: '6\n' },
            { compare: "A plain `let` is closest to `const` in TypeScript, and `let mut` is TypeScript's `let`. But `const` only stops you from pointing the name at something else: `const list = []; list.push(1)` is allowed. In Rust, immutability reaches the value. Without `mut` you cannot push to a list either. Python and PHP have no equivalent." },
            "Immutable by default is a choice about reading code: a `mut` tells you which values to keep an eye on. The compiler holds you to it in the other direction as well, and warns about a `mut` that is never used.",
          ],
        },
        {
          title: 'Shadowing',
          body: [
            "A second `let` with the same name is not an assignment. It creates a new variable, which hides the old one from that line on. The new variable can have a different type.",
            { run: rs`fn main() {
    let input = "1024";            // text
    let input = input.len();       // a number: a new variable with the same name
    let input = input * 2;
    println!("{input}");

    let width = 10;
    {
        let width = width + 5;     // hides the outer one, inside this block only
        println!("inner {width}");
    }
    println!("outer {width}");
}`, name: 'shadowing.rs', expect: '8\ninner 15\nouter 10\n' },
            "Shadowing is how you convert a value step by step without inventing names like `input_text` and `input_length`. It is different from mutation. A `mut` variable keeps its type for life:",
            { run: rs`fn main() {
    let mut size = 5;
    size = "five";
    println!("{size}");
}`, name: 'retype.rs', fails: 'E0308' },
            { compare: "In Python, `x = \"42\"` followed by `x = int(x)` rebinds the name to a value of another type, and nobody thinks twice. Shadowing gives you that habit back while every variable keeps one fixed type." },
          ],
        },
        {
          title: 'Inference without dynamic typing',
          body: [
            "Every variable has one type, fixed when the program is compiled. You rarely write it, because the compiler works it out from the value and from how the variable is used later.",
            { run: rs`fn main() {
    let a = 5;            // i32: what an integer literal is when nothing says otherwise
    let b = 2.5;          // f64: the same, for a number with a decimal point
    let c: u8 = 200;      // an annotation
    let d = 7u64;         // a suffix on the literal
    let e = b * 2.0;      // f64, because b is
    let mut total = 0;    // u8, decided by the next line
    total += c;
    println!("{a} {b} {c} {d} {e} {total}");
}`, name: 'inference.rs', expect: '5 2.5 200 7 5 200\n' },
            "Look at `total`. Its type comes from a line further down. Inference reads the whole function, not one line at a time.",
            "Sometimes there is nothing to infer from. `parse` can produce many types, and this program never says which one it wants.",
            { run: rs`fn main() {
    let n = "42".parse().unwrap();
    println!("{n}");
}`, name: 'ambiguous.rs', fails: 'type annotations needed' },
            "Either annotate the variable, `let n: i32 = …`, or name the type at the call: `\"42\".parse::<i32>()`.",
            { compare: "TypeScript infers in much the same way, but its types are erased before the program runs, and `any` lets you step outside them. Python's type hints are not enforced at all. In Rust the types decide what machine code is generated, so there is no way to be wrong about them at run time." },
          ],
        },
        {
          title: 'Integer types and what a size means',
          body: [
            "An integer type is a number of bits and a way of reading them. You choose it, and it never changes.",
            { table: {
              head: ['Type', 'Bits', 'Range'],
              rows: [
                ['`i8`, `u8`', '8', '−128 to 127, and 0 to 255'],
                ['`i16`, `u16`', '16', '−32,768 to 32,767, and 0 to 65,535'],
                ['`i32`, `u32`', '32', 'About ±2.1 billion, and 0 to about 4.3 billion'],
                ['`i64`, `u64`', '64', 'About ±9.2 × 10¹⁸, and 0 to about 1.8 × 10¹⁹'],
                ['`i128`, `u128`', '128', 'Larger than you will need'],
                ['`isize`, `usize`', 'The size of a pointer: 64 here', 'Lengths and indexes are always `usize`'],
              ],
            } },
            "`i` types are signed and `u` types are not. Literals can carry `_` as a separator and be written in other bases: `1_000_000`, `0xff`, `0b1010`. `b'A'` is the `u8` with the character code of A.",
            { run: rs`fn main() {
    println!("{} to {}", i8::MIN, i8::MAX);
    println!("{} to {}", u8::MIN, u8::MAX);
    println!("{}", i32::MAX);
    println!("{}", u64::MAX);
    println!("{} bits in a usize", usize::BITS);
    println!("{} {} {}", 1_000_000, 0xff, b'A');
}`, name: 'ranges.rs', expect: '-128 to 127\n0 to 255\n2147483647\n18446744073709551615\n64 bits in a usize\n1000000 255 65\n' },
            { widget: 'bits' },
            { compare: "A Python integer grows as large as it needs to. A JavaScript number is a 64-bit float, exact for integers only up to 2⁵³. A PHP integer is 64 bits and turns into a float when it overflows. All three hide the size from you. Rust makes you pick one, which is the price of knowing exactly what is stored." },
          ],
        },
        {
          title: 'Overflow is an error, not a surprise',
          body: [
            "What happens when a result does not fit? Rust treats that as a bug in the program. In a debug build, the program panics: it stops with a message that says where.",
            { run: rs`fn add(a: u8, b: u8) -> u8 {
    a + b
}

fn main() {
    println!("{}", add(200, 50));
    println!("{}", add(200, 100));
}`, name: 'overflow.rs', panics: true, expect: '250\n' },
            "A release build leaves the check out for speed, and the value wraps around. This is the same program built in release mode:",
            { run: rs`fn add(a: u8, b: u8) -> u8 {
    a + b
}

fn main() {
    println!("{}", add(200, 50));
    println!("{}", add(200, 100));
}`, name: 'overflow_release.rs', release: true, expect: '250\n44\n' },
            "Neither is something to rely on. When a calculation can go past the edge, say what should happen. Every integer type has these methods:",
            { run: rs`fn main() {
    let big: u8 = 200;
    println!("{:?}", big.checked_add(100));      // None: it did not fit
    println!("{:?}", big.checked_add(50));       // Some(250)
    println!("{}", big.wrapping_add(100));       // 44: wrap around
    println!("{}", big.saturating_add(100));     // 255: stop at the limit
    println!("{:?}", big.overflowing_add(100));  // (44, true): the wrapped value, and whether it wrapped
}`, name: 'explicit.rs', expect: 'None\nSome(250)\n44\n255\n(44, true)\n' },
            "`checked_add` returns an `Option`: either `Some(value)` or `None`. That is how Rust says there may be no answer. You will see it often before lesson 13 explains it in full.",
            { pitfall: "Subtraction overflows too. Lengths and indexes are `usize`, which cannot go below zero, so `items.len() - 1` panics when the collection is empty. Test for emptiness first, or use `checked_sub`." },
            { fromC: "In C, unsigned arithmetic wraps and signed overflow is undefined behavior, which the compiler may assume never happens. Rust defines both: a panic in a debug build, a wrap in a release build, and a method for each behavior you might want on purpose." },
          ],
        },
        {
          title: 'Floats, bool and char',
          body: [
            "`f64` is the floating-point type you want unless you have a reason for `f32`. Integers and floats do not mix in one expression:",
            { run: rs`fn main() {
    let count = 3;
    let price = 2.5;
    println!("{}", count * price);
}`, name: 'mixed.rs', fails: 'E0277' },
            "`bool` is a type of its own with two values, `true` and `false`. It is not a number, and no other type stands in for it. An `if` takes a `bool` and nothing else:",
            { run: rs`fn main() {
    let items = 3;
    if items {
        println!("not empty");
    }
}`, name: 'truthy.rs', fails: 'E0308' },
            { compare: "Python, JavaScript and PHP all treat some values as true or false: `0`, `\"\"`, an empty list, `None` or `null`, and in PHP the string `\"0\"`. Each has its own list and its own surprises. Rust has no list. You write the comparison you mean: `items > 0`, or `!names.is_empty()`." },
            "`char` is one Unicode character, in single quotes. It takes four bytes, because that is what it takes to hold any of them. It is not a small integer and not a one-character string.",
            { run: rs`fn main() {
    let letter = 'é';
    let crab = '🦀';
    println!("{letter} {crab}");
    println!("{} {}", letter as u32, crab as u32);
    println!("{} bytes each", std::mem::size_of::<char>());
    println!("{}", 'a' < 'b');
}`, name: 'chars.rs', expect: 'é 🦀\n233 129408\n4 bytes each\ntrue\n' },
          ],
        },
        {
          title: 'Conversions are explicit',
          body: [
            "Rust never converts a number from one type to another by itself, not even from `i32` to `i64`. There are three ways to ask, and they differ in what happens when the value does not fit.",
            "`as` always succeeds, and changes the value silently when it has to:",
            { run: rs`fn main() {
    println!("{}", 300_i32 as u8);       // 44: the high bits are dropped
    println!("{}", -1_i32 as u32);       // 4294967295: the same bits, read as unsigned
    println!("{}", 3.99_f64 as i32);     // 3: toward zero
    println!("{}", 1e20_f64 as i32);     // 2147483647: a float stops at the limit
    println!("{}", 'A' as u8);           // 65
    println!("{}", 7_i32 as f64 / 2.0);  // 3.5
}`, name: 'as.rs', expect: '44\n4294967295\n3\n2147483647\n65\n3.5\n' },
            "`From` and `into` exist only between types where nothing can be lost, so they cannot fail. `TryFrom` and `try_into` exist where something can be lost, and they return a `Result` that says whether it was.",
            { run: rs`fn main() {
    let small: u8 = 200;
    let wide = i32::from(small);        // always fits
    let wider: i64 = wide.into();       // the same kind of conversion, written from the other side

    let back = u8::try_from(wide);      // may not fit, so the answer is a Result
    let too_big = u8::try_from(1000);
    println!("{wide} {wider} {back:?} {}", too_big.is_err());
}`, name: 'from.rs', expect: '200 200 Ok(200) true\n' },
            "Leaving the conversion out is a type error, and the `help:` line tells you which conversion fits:",
            { run: rs`fn main() {
    let wide: i32 = 70_000;
    let small: u8 = wide;
    println!("{small}");
}`, name: 'narrowing.rs', fails: 'E0308' },
            { table: {
              head: ['Write', 'When', 'If the value does not fit'],
              rows: [
                ['`value as u8`', 'You know it fits, or you want the wrap', 'It is changed silently'],
                ['`i64::from(value)` or `value.into()`', 'The target holds every value of the source', 'Cannot happen. A conversion that could lose something does not compile'],
                ['`u8::try_from(value)`', 'The value comes from outside and might not fit', 'You get an `Err` to handle'],
                ['`text.parse::<i32>()`', 'Text to a number', 'You get an `Err` to handle'],
              ],
            } },
            { compare: "PHP evaluates `\"5\" + 3` to 8. JavaScript evaluates `\"5\" * 2` to 10 and `\"5\" + 3` to `\"53\"`. Python refuses to add text to a number but mixes integers and floats freely. Rust does none of it. The reward is that a value never changes type behind your back." },
          ],
        },
        {
          title: 'Tuples and arrays',
          body: [
            "A **tuple** groups a fixed number of values that may have different types. A function returns several values by returning a tuple. An **array** holds a fixed number of values of one type, and that number is part of its type: `[i32; 3]` and `[i32; 4]` are different types.",
            { run: rs`fn main() {
    let point = (3, -4.5, 'x');
    let (x, y, label) = point;            // take it apart
    println!("{x} {y} {label} {}", point.0);

    let mut scores = [0; 4];              // four zeros: the type is [i32; 4]
    scores[1] = 7;
    let copy = scores;                    // an array is a value: this copies all four
    scores[2] = 9;
    println!("{scores:?} {copy:?} {}", scores.len());
    println!("{}", copy == [0, 7, 0, 0]);
}`, name: 'tuples_arrays.rs', expect: '3 -4.5 x 3\n[0, 7, 9, 0] [0, 7, 0, 0] 4\ntrue\n' },
            { strip: { title: 'A `[i32; 4]` is four `i32` values side by side', cells: [0, 7, 9, 0], address: { base: 0x7fe0, step: 4 }, caption: 'There is nothing else: no header and no stored length. The length is known from the type, so `len()` costs nothing.' } },
            "Indexing is checked every time. An index past the end is a panic, not a read of whatever happens to be next in memory.",
            { run: rs`fn pick(values: [i32; 3], index: usize) -> i32 {
    values[index]
}

fn main() {
    let values = [10, 20, 30];
    println!("{}", pick(values, 2));
    println!("{}", pick(values, 3));
}`, name: 'bounds.rs', panics: true, expect: '30\n' },
            { compare: "A tuple is like a Python tuple with a fixed type for each position. An array is not like a Python list, a JavaScript array or a PHP array: it cannot grow. The growable sequence is `Vec`, which lesson 14 covers, and it is what you will use most of the time." },
            "A `const` is a value fixed at compile time. It needs a type and is written in capitals: `const MAX_PLAYERS: u32 = 8;`. Use it for the numbers a program is built around.",
            { fromC: "Rust arrays know their length, are copied by assignment, compared with `==`, and passed to and returned from functions whole. They do not decay to pointers, and an index out of range stops the program instead of reading a neighbor." },
          ],
        },
      ],
      takeaways: [
        "`let` binds once. `let mut` allows change, and a second `let` makes a new variable that shadows the first.",
        "Every variable has one type, fixed at compile time. The compiler infers it from the whole function.",
        "Overflow is a bug: a panic in a debug build and a wrap in a release build. Use the `checked_`, `wrapping_` and `saturating_` methods to say what you want.",
        "Nothing converts by itself. `as` is quick and lossy, `From` cannot lose anything, and `TryFrom` tells you when it would.",
        "An array has a fixed length that is part of its type, and every index is checked.",
      ],
      quiz: [
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let total = 10;
    let total = total * 2;
    total = total + 1;
    println!("{total}");
}`,
          options: [
            { t: 'No: line 4 assigns to a variable that is not `mut`', ok: true, why: "Line 3 creates a new variable that shadows the first, and the new one is immutable too. Line 4 is an assignment, which needs `mut`, or another `let`." },
            { t: 'Yes, and it prints `21`', why: "It would with `let total = total + 1;` on line 4. Shadowing and assignment look alike but are different things." },
            { t: 'No: line 3 declares `total` a second time', why: "Declaring a name again is allowed. It is called shadowing, and line 3 is fine." },
            { t: 'Yes, and it prints `20`', why: "A program with an error in it is not built at all, so nothing is printed." },
          ],
          verify: 'E0384',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let x = 1;
    {
        let x = x + 10;
        println!("{x}");
    }
    let x = x * 2;
    println!("{x}");
}`,
          answer: '11\n2',
          explain: "The inner `x` exists only inside the block. After the closing brace, `x` is the outer variable again, still 1, and the last `let` shadows it with 2.",
          hint: "Which `x` does the last `let` read on its right-hand side?",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let a = 258_i32 as u8;
    let b = -3_i32 as u8;
    let c = 2.9_f64 as u8;
    println!("{a} {b} {c}");
}`,
          answer: '2 253 2',
          explain: "`as` keeps the low 8 bits of an integer: 258 is 256 + 2, and −3 has the same low bits as 253. A float is cut off toward zero.",
          hint: "A `u8` holds 0 to 255. Take the first two values modulo 256.",
        },
        {
          q: 'What does this program do when it is built in debug mode and run?',
          code: rs`fn next(level: u8) -> u8 {
    level + 1
}

fn main() {
    println!("{}", next(255));
}`,
          options: [
            { t: 'It panics: attempt to add with overflow', ok: true, why: "256 does not fit in a `u8`. A debug build checks every arithmetic operation and stops the program." },
            { t: 'It prints `0`', why: "That is what a release build does, and what `level.wrapping_add(1)` asks for in any build." },
            { t: 'It prints `256`', why: "The result has the type `u8`, which cannot hold 256. Nothing widens it, as Python or PHP would." },
            { t: 'It does not compile', why: "The compiler cannot know which values `next` will be called with. The check has to happen at run time." },
          ],
          verify: 'panics',
        },
        {
          kind: 'multi',
          q: 'Which of these conversions compile?',
          options: [
            { t: '`i64::from(7_i32)`', ok: true, why: "Every `i32` fits in an `i64`." },
            { t: '`i32::from(7_i64)`', why: "An `i64` may not fit, so there is no `From`. Use `i32::try_from`." },
            { t: '`f64::from(7_i32)`', ok: true, why: "An `f64` can represent every `i32` exactly." },
            { t: '`f32::from(7_i32)`', why: "An `f32` has only 24 bits of precision, so large `i32` values would be rounded. There is no `From`." },
            { t: '`u32::from(\'a\')`', ok: true, why: "Every `char` has a code that fits in a `u32`." },
            { t: '`u8::from(300_i32)`', why: "An `i32` may not fit in a `u8`. `From` is not offered, whatever the value happens to be." },
          ],
          hint: "Three compile. `From` exists only where no value of the source type can be lost.",
        },
        {
          q: 'What is the type of `total`?',
          code: rs`fn main() {
    let mut total = 0;
    let step: u16 = 500;
    total += step;
    println!("{total}");
}`,
          options: [
            { t: '`u16`', ok: true, why: "The literal `0` has no type of its own. Line 4 adds a `u16` to `total`, which settles it." },
            { t: '`i32`', why: "`i32` is the fallback when nothing else decides. Here line 4 decides." },
            { t: '`i32` on line 2, then `u16` from line 4 on', why: "A variable has one type for its whole life. Inference looks at the whole function before choosing it." },
            { t: 'The program does not compile, because `0` is an `i32` and `step` is a `u16`', why: "An integer literal takes whatever integer type the context needs." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let mut grid = [[0; 3]; 2];
    grid[1][2] = 5;
    let (first, second) = (grid[0], grid[1]);
    println!("{:?} {:?} {}", first, second, grid.len());
}`,
          answer: '[0, 0, 0] [0, 0, 5] 2',
          explain: "`[[0; 3]; 2]` is two arrays of three zeros. `grid.len()` counts the outer array, which has two elements.",
          hint: "Read the type from the inside out: three zeros, twice.",
        },
      ],
      challenges: [
        {
          id: 'clamp-to-u8',
          title: 'Clamp to a byte',
          level: 'warm-up',
          prompt: "A color channel is a `u8`. Convert an `i32` to one, so that anything below 0 becomes 0 and anything above 255 becomes 255. The starter uses `as`, which wraps instead.",
          signature: 'fn clamp_to_u8(value: i32) -> u8',
          starter: rs`fn clamp_to_u8(value: i32) -> u8 {
    value as u8
}`,
          hints: [
            "Bring the value into range while it is still an `i32`, then convert.",
            "Integers have a `clamp(min, max)` method.",
            "`value.clamp(0, 255) as u8`. The `as` is safe now, because the value is known to fit.",
          ],
          solution: rs`fn clamp_to_u8(value: i32) -> u8 {
    value.clamp(0, 255) as u8
}`,
          tests: [
            { label: 'Keeps a value that fits', body: rs`assert_eq!(clamp_to_u8(100), 100);` },
            { label: 'Stops at 255', body: rs`assert_eq!(clamp_to_u8(300), 255);` },
            { label: 'Stops at 0', body: rs`assert_eq!(clamp_to_u8(-5), 0);` },
            { label: 'Keeps both ends of the range', body: rs`assert_eq!(clamp_to_u8(0), 0);
assert_eq!(clamp_to_u8(255), 255);` },
            { label: 'Handles the smallest i32', body: rs`assert_eq!(clamp_to_u8(i32::MIN), 0);` },
          ],
        },
        {
          id: 'average-without-overflow',
          title: 'Average without overflow',
          level: 'core',
          prompt: "Return the average of two `u32` values, rounded down. The starter is correct until `a + b` no longer fits in a `u32`. Then it panics, and the failing test shows you the message.",
          signature: 'fn average(a: u32, b: u32) -> u32',
          starter: rs`fn average(a: u32, b: u32) -> u32 {
    (a + b) / 2
}`,
          hints: [
            "The sum of two `u32` values always fits in a `u64`.",
            "Convert both to `u64`, add, halve, and convert back. The result is at most `u32::MAX`, so `as u32` loses nothing.",
            "`((a as u64 + b as u64) / 2) as u32`",
          ],
          solution: rs`fn average(a: u32, b: u32) -> u32 {
    ((a as u64 + b as u64) / 2) as u32
}`,
          solutionNote: "It can also be done without a wider type: `a / 2 + b / 2 + (a % 2 + b % 2) / 2`.",
          tests: [
            { label: 'Two small numbers', body: rs`assert_eq!(average(2, 4), 3);` },
            { label: 'Rounds down', body: rs`assert_eq!(average(3, 4), 3);` },
            { label: 'Two odd numbers', body: rs`assert_eq!(average(3, 5), 4);` },
            { label: 'The largest value, twice', body: rs`assert_eq!(average(u32::MAX, u32::MAX), u32::MAX);` },
            { label: 'The largest value and zero', body: rs`assert_eq!(average(u32::MAX, 0), 2_147_483_647);` },
          ],
        },
        {
          id: 'seconds-to-hms',
          title: 'Hours, minutes, seconds',
          level: 'core',
          prompt: "Split a number of seconds into hours, minutes and seconds, and return all three as a tuple.",
          signature: 'fn to_hms(total_seconds: u32) -> (u32, u32, u32)',
          starter: rs`fn to_hms(total_seconds: u32) -> (u32, u32, u32) {
    (0, 0, total_seconds)
}`,
          hints: [
            "`/` on integers discards the remainder, and `%` gives it.",
            "Hours are `total_seconds / 3600`. Minutes are what is left of the hour, divided by 60.",
            "`(total_seconds / 3600, total_seconds % 3600 / 60, total_seconds % 60)`",
          ],
          solution: rs`fn to_hms(total_seconds: u32) -> (u32, u32, u32) {
    (total_seconds / 3600, total_seconds % 3600 / 60, total_seconds % 60)
}`,
          tests: [
            { label: 'Zero', body: rs`assert_eq!(to_hms(0), (0, 0, 0));` },
            { label: 'Less than a minute', body: rs`assert_eq!(to_hms(59), (0, 0, 59));` },
            { label: 'Exactly an hour', body: rs`assert_eq!(to_hms(3600), (1, 0, 0));` },
            { label: 'One of each', body: rs`assert_eq!(to_hms(3661), (1, 1, 1));` },
            { label: 'The last second of a day', body: rs`assert_eq!(to_hms(86_399), (23, 59, 59));` },
          ],
        },
        {
          id: 'wrapping-checksum',
          title: 'A checksum that wraps',
          level: 'stretch',
          kind: 'fix',
          prompt: [
            "A simple checksum adds up the bytes of a message, lets the sum wrap around at 256, and then flips every bit of the result. The `!` operator flips the bits of an integer.",
            "The starter adds the bytes with `+=`, which panics as soon as the sum passes 255, and it forgets the last step. Fix both.",
          ],
          signature: 'fn checksum(bytes: [u8; 8]) -> u8',
          starter: rs`fn checksum(bytes: [u8; 8]) -> u8 {
    let mut sum = 0;
    for byte in bytes {
        sum += byte;
    }
    sum
}`,
          hints: [
            "`sum.wrapping_add(byte)` returns the wrapped sum. It does not change `sum`, so assign the result.",
            "The return value is `!sum`.",
          ],
          solution: rs`fn checksum(bytes: [u8; 8]) -> u8 {
    let mut sum: u8 = 0;
    for byte in bytes {
        sum = sum.wrapping_add(byte);
    }
    !sum
}`,
          tests: [
            { label: 'All zeros', body: rs`assert_eq!(checksum([0; 8]), 255);` },
            { label: 'A sum that fits', body: rs`assert_eq!(checksum([1, 2, 3, 4, 5, 6, 7, 8]), 219);` },
            { label: 'A sum that wraps once', body: rs`assert_eq!(checksum([128, 128, 0, 0, 0, 0, 0, 1]), 254);` },
            { label: 'A sum that wraps many times', body: rs`assert_eq!(checksum([255; 8]), 7);` },
          ],
        },
      ],
    },

    {
      id: 'control-flow',
      title: 'Expressions, functions & control flow',
      category: part,
      minutes: 30,
      summary: 'Functions, loops and branches in a language where nearly everything produces a value, and where a match must cover every case.',
      topics: ['Functions', 'Expressions', 'if', 'Loops', 'match', 'Unit and never'],
      sections: [
        {
          title: 'Functions have typed signatures',
          body: [
            "A function names the type of every parameter, and of its result after `->`. Nothing here is inferred.",
            { run: rs`fn main() {
    let size = area(3, 4);
    println!("{size} {}", is_large(size));
}

// Defined after main: the order of items in a file does not matter.
fn area(width: u32, height: u32) -> u32 {
    width * height
}

fn is_large(size: u32) -> bool {
    size > 10
}`, name: 'functions.rs', expect: '12 true\n' },
            { list: [
              "A function with no `->` returns nothing useful. Its return type is `()`, covered below.",
              "There are no default arguments, no keyword arguments and no overloading: one name, one signature.",
              "Names use `snake_case`. The compiler warns about `camelCase` function and variable names.",
            ] },
            "Types inside a function body are inferred, so why not these? Because the signature is a contract. The compiler checks each body against its own signature, and each call against the signature of the function it calls. It never looks inside another function to check a call. Errors stay where the mistake is, and a function's signature tells you everything a caller can rely on. Part 2 depends on this.",
            { compare: "Type hints in Python and PHP are optional, and TypeScript infers return types. Here the full signature is required. It reads as documentation that cannot go out of date." },
            { fromC: "There are no prototypes and no header files. A function can be called from a line above its definition, because the compiler reads the whole file before checking any of it." },
          ],
        },
        {
          title: 'Blocks are expressions',
          body: [
            "Nearly everything in Rust produces a value. A block, `{ … }`, runs its statements and then has the value of its last expression, provided that expression has no semicolon after it.",
            { run: rs`fn main() {
    let total = {
        let price = 40;
        let tax = price / 5;
        price + tax              // no semicolon: this is the value of the block
    };
    println!("{total}");
}`, name: 'block.rs', expect: '48\n' },
            "A function body is a block, which is why a function returns its last expression. `return` exists too, for leaving early.",
            { run: rs`fn first_digit(mut n: u32) -> u32 {
    if n == 0 {
        return 0;                // leave early
    }
    while n >= 10 {
        n /= 10;
    }
    n                            // the value of the function
}

fn main() {
    println!("{} {} {}", first_digit(0), first_digit(7), first_digit(4096));
}`, name: 'early_return.rs', expect: '0 7 4\n' },
            "A semicolon turns an expression into a statement and throws its value away. A block that ends in a statement has the value `()`. So one stray semicolon changes what a function returns:",
            { run: rs`fn double(n: i32) -> i32 {
    n * 2;
}

fn main() {
    println!("{}", double(21));
}`, name: 'semicolon.rs', fails: 'E0308' },
            { compare: "Python, PHP and JavaScript draw a firm line between statements and expressions, and a function returns nothing unless it says `return`. An arrow function with an expression body, `x => x * 2`, is the nearest thing to how every Rust block behaves." },
          ],
        },
        {
          title: 'if is an expression',
          body: [
            "`if` produces the value of whichever branch runs, so it does the job of the `? :` operator, which Rust does not have.",
            { run: rs`fn main() {
    let temperature = 31;
    let label = if temperature > 30 { "hot" } else if temperature > 15 { "mild" } else { "cold" };
    println!("{label}");

    let fee = 100 + if temperature > 30 { 20 } else { 0 };
    println!("{fee}");
}`, name: 'if_value.rs', expect: 'hot\n120\n' },
            { list: [
              "The condition takes no parentheses, and the braces are required.",
              "The condition must be a `bool`. There is no truthiness.",
              "When the `if` is used for its value, every branch must produce the same type, and there must be an `else`.",
            ] },
            { run: rs`fn main() {
    let count = 3;
    let shown = if count > 0 { count } else { "none" };
    println!("{shown}");
}`, name: 'branches.rs', fails: 'E0308' },
          ],
        },
        {
          title: 'Loops',
          body: [
            "There are three loops. `loop` repeats until a `break`. `while` repeats while a condition holds. `for` walks through a range or a collection. There is no loop with a counter, a test and a step in its header.",
            { run: rs`fn main() {
    // loop: the value after break becomes the value of the loop.
    let mut n = 1;
    let first_over_1000 = loop {
        n *= 2;
        if n > 1000 {
            break n;
        }
    };
    println!("{first_over_1000}");

    let mut countdown = 3;
    while countdown > 0 {
        print!("{countdown} ");
        countdown -= 1;
    }
    println!("liftoff");

    for i in 0..3 {
        print!("{i} ");
    }
    for i in (1..=3).rev() {
        print!("{i} ");
    }
    for i in (0..10).step_by(4) {
        print!("{i} ");
    }
    for value in [10, 20, 30] {
        print!("{value} ");
    }
    println!();
}`, name: 'loops.rs', expect: '1024\n3 2 1 liftoff\n0 1 2 3 2 1 0 4 8 10 20 30 \n' },
            { table: {
              head: ['Range', 'Values'],
              rows: [
                ['`0..3`', '0, 1, 2. The end is left out.'],
                ['`0..=3`', '0, 1, 2, 3. The end is included.'],
                ['`(0..3).rev()`', '2, 1, 0'],
                ['`(0..10).step_by(4)`', '0, 4, 8'],
                ["`'a'..='e'`", 'The characters a to e'],
              ],
            } },
            "`break` and `continue` act on the innermost loop. To reach an outer one, label it. A label starts with a single quote.",
            { run: rs`fn main() {
    let mut found = (0, 0);
    'rows: for row in 1..10 {
        for column in 1..10 {
            if row * column == 42 {
                found = (row, column);
                break 'rows;         // leaves both loops
            }
        }
    }
    println!("{found:?}");
}`, name: 'labels.rs', expect: '(6, 7)\n' },
            { compare: "`for i in 0..3` is Python's `for i in range(3)`. When you need the position as well as the value, there is `for (i, value) in list.iter().enumerate()`, as in Python. PHP's `break 2` is a labeled break with a number where the label should be." },
            { pitfall: "To count down, reverse a range: `for i in (0..n).rev()`. A hand-written loop that decrements a `usize` and tests `i >= 0` never ends, because a `usize` is never negative. It panics instead, when it tries to go below zero." },
          ],
        },
        {
          title: 'match on simple values',
          body: [
            "`match` compares a value against a list of patterns, top to bottom, and runs the first arm that fits. It is an expression, so every arm must produce the same type.",
            { run: rs`fn main() {
    for n in [0, 3, 7, 12, 40, -5] {
        let size = match n {
            0 => "zero",
            1 | 2 | 3 => "small",          // any of these
            4..=9 => "medium",             // a range
            n if n < 0 => "negative",      // a guard: any n for which the condition holds
            _ => "large",                  // everything else
        };
        println!("{n}: {size}");
    }
}`, name: 'match.rs', expect: '0: zero\n3: small\n7: medium\n12: large\n40: large\n-5: negative\n' },
            "A `match` must cover every possible value. That is checked when the program is compiled, against the type and not against the values you expect.",
            { run: rs`fn main() {
    let day = 3_u8;
    let kind = match day {
        1..=5 => "weekday",
        6 | 7 => "weekend",
    };
    println!("{kind}");
}`, name: 'exhaustive.rs', fails: 'E0004' },
            "A `u8` can be 0, or 8, or 200, and the compiler lists what is missing. Add an arm for the rest, usually `_`. This looks like pedantry on a number. It becomes one of the most useful checks in the language once you match on your own types, in lesson 12.",
            "Matching on a tuple tests several values at once:",
            { run: rs`fn main() {
    for n in 9..=15 {
        match (n % 3, n % 5) {
            (0, 0) => println!("FizzBuzz"),
            (0, _) => println!("Fizz"),
            (_, 0) => println!("Buzz"),
            _ => println!("{n}"),
        }
    }
}`, name: 'fizzbuzz.rs', expect: 'Fizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n' },
            { compare: "A `switch` in PHP or JavaScript falls through from one case to the next unless you `break`, and says nothing if no case fits. Python's `match` has similar patterns but no check that they cover everything. PHP 8's `match` expression is the closest relative, and it finds a missing case by throwing at run time." },
            { fromC: "No arm falls through into the next, so there is no `break` to forget. And a `match` that misses a case does not compile, where a C `switch` would silently do nothing." },
          ],
        },
        {
          title: 'The unit type and the never type',
          body: [
            "Two types appear in error messages before anyone explains them.",
            "`()` is called **unit**. It is a tuple with nothing in it, and it has exactly one value, also written `()`. It is what a function without `->` returns, what a block ending in a semicolon produces, and what an `if` without an `else` produces. When an error says `expected i32, found ()`, look for a stray semicolon or a missing `else`.",
            "`!` is called **never**. It is the type of an expression that does not finish: `return`, `break`, `continue`, a call to `panic!`, or a `loop` with no `break`. Because such an expression produces no value at all, it is accepted wherever any type is expected.",
            { run: rs`fn digit(c: char) -> u32 {
    match c {
        '0'..='9' => c as u32 - '0' as u32,
        _ => panic!("not a digit: {c}"),     // never returns, so it fits where a u32 is expected
    }
}

fn main() {
    let nothing = println!("printing has no result");
    println!("{nothing:?}");
    println!("{}", digit('7'));
}`, name: 'unit_never.rs', expect: 'printing has no result\n()\n7\n' },
            { tip: "`todo!()` is a placeholder for code you have not written. It has the never type, so a function whose body is `todo!()` compiles whatever its return type. It panics if it is ever reached." },
          ],
        },
        {
          title: 'Scope and the call stack, briefly',
          body: [
            "A variable lives from its `let` to the end of the block it is in. Each call to a function gets a region of memory called a **stack frame**, which holds its parameters and local variables. Returning discards the frame.",
            { trace: {
              title: 'A call pushes a frame, and a return discards it',
              code: rs`fn area(width: u32, height: u32) -> u32 {
    let result = width * height;
    result
}

fn main() {
    let w = 3;
    let total = area(w, 4);
    println!("{total}");
}`,
              vars: [
                { id: 'w', type: 'u32' },
                { id: 'total', type: 'u32' },
                { id: 'area.width', name: 'width', type: 'u32', frame: 'area' },
                { id: 'area.height', name: 'height', type: 'u32', frame: 'area' },
                { id: 'area.result', name: 'result', type: 'u32', frame: 'area' },
              ],
              steps: [
                { line: 7, say: '`main` has a frame for its variables. `w` is set.', set: { w: 3 } },
                { line: 8, say: 'The call begins. A new frame is pushed for `area`, and the arguments are copied into its parameters.', set: { 'area.width': 3, 'area.height': 4 } },
                { line: 2, say: '`result` is a local variable of `area`, so it lives in that frame.', set: { 'area.result': 12 } },
                { line: 3, say: 'The last expression is the return value. It is copied back to the caller.' },
                { line: 8, say: '`area` has returned. Its frame is gone, and with it `width`, `height` and `result`.', set: { total: 12 }, hide: ['frame:area'] },
                { line: 9, say: 'When `main` ends, its frame goes the same way.' },
              ],
            } },
            "For the numbers used so far, that is the whole story: passing a value copies it, and everything is cleaned up when the frame goes. Text, lists and anything else that owns memory outside its frame need more than that. Part 2 is about what.",
          ],
        },
      ],
      takeaways: [
        "A function signature states every type, and the compiler checks calls against signatures alone.",
        "A block has the value of its last expression. A semicolon after that expression throws the value away and leaves `()`.",
        "`if`, `match` and `loop` are expressions. When their value is used, every branch must have the same type.",
        "`for` walks ranges and collections. `0..n` leaves out the end and `0..=n` includes it.",
        "A `match` must cover every value of the type, and the compiler says which ones are missing.",
      ],
      quiz: [
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let x = 5;
    let y = {
        let x = x * 2;
        x + 1
    };
    println!("{x} {y}");
}`,
          answer: '5 11',
          explain: "The block has its own `x`, which is 10, and its value is `x + 1`. Outside the block, `x` is still 5.",
          hint: "The inner `let x` shadows only inside the braces.",
        },
        {
          q: 'Does this program compile?',
          code: rs`fn area(width: u32, height: u32) -> u32 {
    width * height;
}

fn main() {
    println!("{}", area(3, 4));
}`,
          options: [
            { t: 'No: the semicolon makes the body produce `()` instead of a `u32`', ok: true, why: "With the semicolon, `width * height;` is a statement and its value is discarded. The compiler reports `E0308` and offers to remove the semicolon." },
            { t: 'Yes: the semicolon is optional and changes nothing', why: "It is optional in JavaScript. In Rust it is the difference between producing a value and discarding it." },
            { t: 'No: a function needs a `return` statement', why: "It does not. Removing the semicolon is enough, because the last expression of the body is the return value." },
            { t: 'Yes, and it returns 0', why: "There is no default return value. A body that produces no `u32` is a type error." },
          ],
          verify: 'E0308',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let mut n = 6;
    let mut steps = 0;
    let count = loop {
        if n == 1 {
            break steps;
        }
        n = if n % 2 == 0 { n / 2 } else { 3 * n + 1 };
        steps += 1;
    };
    println!("{count}");
}`,
          answer: '8',
          explain: "The values of `n` are 6, 3, 10, 5, 16, 8, 4, 2, 1. That is eight steps, and `break steps` makes 8 the value of the loop.",
          hint: "Write down each value of `n` until it reaches 1, and count the arrows between them.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let mut count = 0;
    'outer: for a in 0..4 {
        for b in 0..4 {
            if b > a {
                continue 'outer;
            }
            if a + b == 4 {
                break 'outer;
            }
            count += 1;
        }
    }
    println!("{count}");
}`,
          answer: '5',
          explain: "For `a` = 0 the count rises once before `b` exceeds `a`. For `a` = 1 it rises twice. For `a` = 2 it rises twice, and then `a + b` is 4 and `break 'outer` ends both loops.",
          hint: "`continue 'outer` moves on to the next `a`. `break 'outer` ends everything.",
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let score = 72_u32;
    let grade = match score {
        90..=100 => 'A',
        70..=89 => 'B',
        0..=69 => 'C',
    };
    println!("{grade}");
}`,
          options: [
            { t: 'No: scores above 100 are not covered', ok: true, why: "`score` is a `u32`, which goes far beyond 100. The compiler checks the patterns against the type and reports `E0004`, naming the missing range." },
            { t: 'Yes, and it prints `B`', why: "It would if the patterns covered every `u32`. Adding `_ => '?'` is enough." },
            { t: 'No: a range cannot be used as a pattern', why: "It can. `90..=100` is a valid pattern." },
            { t: 'Yes, but it would fail at run time for a score above 100', why: "That is what PHP's `match` does. Rust finds the gap at compile time, so the failure cannot happen." },
          ],
          verify: 'E0004',
        },
        {
          kind: 'multi',
          q: 'Which of these can stand on the right of `let v: i32 = …;`?',
          options: [
            { t: '`if ready { 1 } else { 2 }`', ok: true, why: "An `if` with an `else` has the value of the branch that runs." },
            { t: '`match n { 0 => 10, _ => 20 }`', ok: true, why: "A `match` has the value of the arm that runs." },
            { t: '`{ let t = 3; t * t }`', ok: true, why: "A block has the value of its last expression." },
            { t: '`loop { break 5; }`', ok: true, why: "A `loop` has the value given to `break`." },
            { t: '`while n > 0 { n -= 1; }`', why: "A `while` loop can end without a `break`, so it has no value to give. Its type is `()`." },
            { t: '`if ready { 1 }`', why: "Without an `else` there is no value when the condition is false, so the type is `()`." },
          ],
          hint: "Four of them always end with an `i32` in hand.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    for i in (0..=10).rev().step_by(3) {
        print!("{i} ");
    }
    println!();
}`,
          answer: '10 7 4 1',
          explain: "`0..=10` includes 10. Reversed, it starts at 10, and `step_by(3)` takes every third value from there.",
          hint: "Reverse first, then step.",
        },
      ],
      challenges: [
        {
          id: 'fix-the-semicolon',
          title: 'The value of a branch',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: "This function should return the larger of two numbers. It does not compile. Read the message, then make the smallest change that fixes it.",
          signature: 'fn larger(a: i32, b: i32) -> i32',
          starter: rs`fn larger(a: i32, b: i32) -> i32 {
    if a > b {
        a;
    } else {
        b;
    }
}`,
          hints: [
            "`expected i32, found ()` means that something which should produce a number produces nothing.",
            "Each branch is a block. A block has the value of its last expression only if no semicolon follows it.",
          ],
          solution: rs`fn larger(a: i32, b: i32) -> i32 {
    if a > b {
        a
    } else {
        b
    }
}`,
          tests: [
            { label: 'The second is larger', body: rs`assert_eq!(larger(3, 5), 5);` },
            { label: 'The first is larger', body: rs`assert_eq!(larger(9, 2), 9);` },
            { label: 'Equal values', body: rs`assert_eq!(larger(4, 4), 4);` },
            { label: 'Negative values', body: rs`assert_eq!(larger(-7, -3), -3);` },
          ],
        },
        {
          id: 'sum-multiples',
          title: 'Multiples of 3 or 5',
          level: 'warm-up',
          prompt: "Return the sum of every number below `limit` that is a multiple of 3 or of 5. For a limit of 10 those are 3, 5, 6 and 9, which add up to 23.",
          signature: 'fn sum_multiples(limit: u32) -> u32',
          starter: rs`fn sum_multiples(limit: u32) -> u32 {
    let mut total = 0;
    for n in 0..limit {
        // Add n to the total when it is a multiple of 3 or of 5.
    }
    total
}`,
          hints: [
            "`n % 3 == 0` is true for a multiple of 3. `||` means or.",
            "`if n % 3 == 0 || n % 5 == 0 { total += n; }`",
          ],
          solution: rs`fn sum_multiples(limit: u32) -> u32 {
    let mut total = 0;
    for n in 0..limit {
        if n % 3 == 0 || n % 5 == 0 {
            total += n;
        }
    }
    total
}`,
          tests: [
            { label: 'Below 10', body: rs`assert_eq!(sum_multiples(10), 23);` },
            { label: 'Nothing below zero', body: rs`assert_eq!(sum_multiples(0), 0);` },
            { label: 'Counts 15 once, not twice', body: rs`assert_eq!(sum_multiples(16), 60);` },
            { label: 'Below 1000', body: rs`assert_eq!(sum_multiples(1000), 233_168);` },
          ],
        },
        {
          id: 'fizzbuzz-match',
          title: 'FizzBuzz with one match',
          level: 'core',
          forbid: ['if'],
          prompt: [
            "Return `Fizz` for a multiple of 3, `Buzz` for a multiple of 5, `FizzBuzz` for a multiple of both, and otherwise the number itself as text.",
            "Use one `match` on the tuple `(n % 3, n % 5)`, with no `if` anywhere. The starter shows how to make a `String`: `String::from(\"Fizz\")` for fixed text, and `n.to_string()` for a number.",
          ],
          signature: 'fn fizzbuzz(n: u32) -> String',
          starter: rs`fn fizzbuzz(n: u32) -> String {
    match (n % 3, n % 5) {
        (0, 0) => String::from("FizzBuzz"),
        _ => n.to_string(),
    }
}`,
          hints: [
            "`_` in one position of a tuple pattern matches anything there: `(0, _)` is any multiple of 3.",
            "Order matters. `(0, 0)` has to come before `(0, _)`, or it would never be reached.",
          ],
          solution: rs`fn fizzbuzz(n: u32) -> String {
    match (n % 3, n % 5) {
        (0, 0) => String::from("FizzBuzz"),
        (0, _) => String::from("Fizz"),
        (_, 0) => String::from("Buzz"),
        _ => n.to_string(),
    }
}`,
          tests: [
            { label: 'An ordinary number', body: rs`assert_eq!(fizzbuzz(1), "1");
assert_eq!(fizzbuzz(98), "98");` },
            { label: 'A multiple of 3', body: rs`assert_eq!(fizzbuzz(3), "Fizz");` },
            { label: 'A multiple of 5', body: rs`assert_eq!(fizzbuzz(10), "Buzz");` },
            { label: 'A multiple of both', body: rs`assert_eq!(fizzbuzz(30), "FizzBuzz");` },
          ],
        },
        {
          id: 'collatz-steps',
          title: 'Count the Collatz steps',
          level: 'core',
          prompt: "Start with a number. If it is even, halve it. If it is odd, multiply it by 3 and add 1. Repeat until it reaches 1, and return how many steps that took. Starting from 6 the values are 6, 3, 10, 5, 16, 8, 4, 2, 1, which is 8 steps. `start` is never 0.",
          signature: 'fn collatz_steps(start: u64) -> u32',
          starter: rs`fn collatz_steps(start: u64) -> u32 {
    let mut n = start;
    let mut steps = 0;
    // Loop until n is 1, counting the steps.
    steps
}`,
          hints: [
            "`while n != 1 { … }` is the shape. Inside, replace `n` and add one to `steps`.",
            "`n = if n % 2 == 0 { n / 2 } else { 3 * n + 1 };`",
          ],
          solution: rs`fn collatz_steps(start: u64) -> u32 {
    let mut n = start;
    let mut steps = 0;
    while n != 1 {
        n = if n % 2 == 0 { n / 2 } else { 3 * n + 1 };
        steps += 1;
    }
    steps
}`,
          tests: [
            { label: 'Already at 1', body: rs`assert_eq!(collatz_steps(1), 0);` },
            { label: 'From 6', body: rs`assert_eq!(collatz_steps(6), 8);` },
            { label: 'From 27, which climbs to 9232 on the way', body: rs`assert_eq!(collatz_steps(27), 111);` },
            { label: 'From 97', body: rs`assert_eq!(collatz_steps(97), 118);` },
          ],
        },
        {
          id: 'integer-sqrt',
          title: 'A square root that cannot overflow',
          level: 'stretch',
          kind: 'fix',
          forbid: ['sqrt', 'f64', 'f32', 'u128'],
          prompt: [
            "`integer_sqrt(n)` returns the largest `r` for which `r * r` is at most `n`. The starter finds it by binary search, and it is right for small numbers. For large ones it panics in two places: when it adds `low` and `high`, and when it multiplies `mid` by itself.",
            "Make it work for every `u64`, without floating-point numbers and without a wider integer type.",
          ],
          signature: 'fn integer_sqrt(n: u64) -> u64',
          starter: rs`fn integer_sqrt(n: u64) -> u64 {
    let (mut low, mut high) = (0, n);
    while low < high {
        let mid = (low + high + 1) / 2;
        if mid * mid <= n {
            low = mid;
        } else {
            high = mid - 1;
        }
    }
    low
}`,
          hints: [
            "The midpoint can be reached from `low` without ever adding `low` and `high`: go half of the distance between them.",
            "The search needs the midpoint rounded up. `low + (high - low) / 2 + (high - low) % 2` does that without overflowing.",
            "`mid * mid <= n` says the same as `mid <= n / mid`, and a division cannot overflow. `mid` is never 0 here.",
          ],
          solution: rs`fn integer_sqrt(n: u64) -> u64 {
    let (mut low, mut high) = (0, n);
    while low < high {
        // The midpoint, rounded up, without adding low and high together.
        let mid = low + (high - low) / 2 + (high - low) % 2;
        // mid * mid could overflow. A division cannot.
        if mid <= n / mid {
            low = mid;
        } else {
            high = mid - 1;
        }
    }
    low
}`,
          tests: [
            { label: 'Zero and one', body: rs`assert_eq!(integer_sqrt(0), 0);
assert_eq!(integer_sqrt(1), 1);` },
            { label: 'Just below and exactly on a square', body: rs`assert_eq!(integer_sqrt(15), 3);
assert_eq!(integer_sqrt(16), 4);` },
            { label: 'A million', body: rs`assert_eq!(integer_sqrt(1_000_000), 1000);` },
            { label: 'A large power of two', body: rs`assert_eq!(integer_sqrt(1 << 62), 1 << 31);` },
            { label: 'The largest u64', body: rs`assert_eq!(integer_sqrt(u64::MAX), 4_294_967_295);` },
          ],
        },
      ],
    },
  );
})();
