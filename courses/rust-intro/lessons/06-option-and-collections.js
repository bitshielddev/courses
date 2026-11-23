// Part 4 (Data), lessons 13 and 14: Option and Result, then the standard collections.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 4 · Data';

  // Two functions that several cells of lesson 13 share. Each cell is a whole program, so they are joined in.
  const menu = rs`fn find_price(item: &str) -> Option<u32> {
    match item {
        "tea" => Some(4),
        "cake" => Some(5),
        _ => None,              // not on the menu
    }
}`;
  const age = rs`fn parse_age(text: &str) -> Result<u8, String> {
    let Ok(age) = text.trim().parse::<u8>() else {
        return Err(format!("not a number from 0 to 255: {text}"));
    };
    if age > 130 {
        return Err(format!("not a plausible age: {age}"));
    }
    Ok(age)
}`;

  (window.C_LESSONS ||= []).push(
    {
      id: 'option-and-result',
      title: 'Option & Result',
      category: part,
      minutes: 35,
      summary: 'How Rust puts a missing value and a failed operation into types, and the tools for handling both without a null check or an exception.',
      topics: ['Option', 'unwrap and expect', 'map and and_then', 'Result', 'The ? operator', 'take and as_ref', 'Panic or Result'],
      sections: [
        {
          title: 'Option<T>: a value that might not be there',
          body: [
            "Every language has to decide what a lookup returns when there is nothing to find. Python returns `None`, JavaScript returns `undefined`, and PHP returns `null` or `false`. Each of those is a value that fits in any variable. So any variable might be holding it, and you find out when a method call on it fails at run time.",
            "Rust has no such value. A function that may have nothing to return says so in its return type, `Option<T>`, which is an ordinary enum of the kind lesson 12 covered:",
            { code: rs`enum Option<T> {
    None,       // nothing
    Some(T),    // a value of type T
}` },
            "`T` stands for any type: there is `Option<u32>`, `Option<String>`, `Option<&str>`. Lesson 15 explains how one definition can serve every type. `Option` is used so often that its two variants are in scope everywhere, and you write `Some(4)` and `None` without `Option::` in front.",
            { run: menu + rs`

fn main() {
    for item in ["tea", "scone"] {
        match find_price(item) {
            Some(price) => println!("{item} costs {price}"),
            None => println!("{item} is not on the menu"),
        }
    }
}`, name: 'lookup.rs', expect: 'tea costs 4\nscone is not on the menu\n' },
            "You have met `Option` before: `checked_add` in lesson 2 and `get`, `first` and `last` in lesson 8 all return one, because each may have nothing to give. This lesson is where it gets its full treatment.",
            "An `Option<u32>` is not a `u32`. It is a container that may hold one, and the compiler does not let you use the container as if it were its contents.",
            { run: menu + rs`

fn with_tip(price: u32) -> u32 {
    price + price / 10
}

fn main() {
    let total = with_tip(find_price("tea"));
    println!("{total}");
}`, name: 'not_a_number.rs', fails: 'E0308' },
            "That refusal is the point of the type. The mistake that Python reports as `'NoneType' object has no attribute` and JavaScript as `Cannot read properties of undefined` is a type error here, found before the program exists. To reach the `u32` you have to say what happens when it is missing, and the rest of this lesson is the ways of saying it.",
            { compare: "TypeScript with `strictNullChecks` comes closest: a `number | undefined` must be narrowed before it is used as a number. But the check can be switched off, a `!` overrides it, and anything typed `any` skips it. PHP checks a `?int` when the function is called, at run time, and nothing makes the caller test for `null` before using it. Python's `Optional[int]` is a hint that a separate checker may or may not read. Rust has no way to opt out, and nothing hides inside an ordinary type: a `u32` is always a number, and a `String` is always text." },
            { aside: [
              "Lesson 12 showed that an enum is stored as a tag and its largest payload. An `Option<i32>` is exactly that, and takes 8 bytes. For a reference the compiler does better. A reference is never the address zero, so `Option<&T>` uses zero to mean `None` and needs no tag at all.",
              { run: rs`use std::mem::size_of;

fn main() {
    println!("{} {}", size_of::<i32>(), size_of::<Option<i32>>());
    println!("{} {}", size_of::<&i32>(), size_of::<Option<&i32>>());
    println!("{} {}", size_of::<Box<i32>>(), size_of::<Option<Box<i32>>>());
}`, name: 'option_size.rs', expect: '4 8\n8 8\n8 8\n' },
              "An optional reference or `Box` costs the same eight bytes as the pointer alone. Safety here is paid for at compile time, not at run time.",
            ] },
            { fromC: "`Option<&T>` is the nullable pointer of C, bit for bit: a null address means there is nothing. What changes is that the type says so. A plain `&T` can never be null, and an `Option<&T>` cannot be followed until you have checked it." },
          ],
        },
        {
          title: 'Getting the value out',
          body: [
            "`match`, `if let` and `let else` from lesson 12 are the general tools, and they work on an `Option` as on any enum. For the common cases there are methods, and each one answers the question of what to do about `None`.",
            { run: menu + rs`

fn main() {
    // if let: run a block when there is a value.
    if let Some(price) = find_price("tea") {
        println!("tea: {price}");
    }

    // let else: keep the value, or leave.
    let Some(price) = find_price("cake") else {
        println!("no cake today");
        return;
    };
    println!("cake: {price}");

    // A fallback for the empty case.
    println!("scone: {}", find_price("scone").unwrap_or(0));
    println!("{} {}", find_price("tea").is_some(), find_price("scone").is_none());
}`, name: 'getting_out.rs', expect: 'tea: 4\ncake: 5\nscone: 0\ntrue true\n' },
            { table: {
              head: ['Write', 'For `Some(v)` you get', 'For `None` you get'],
              rows: [
                ['`opt.unwrap_or(fallback)`', '`v`', '`fallback`'],
                ['`opt.unwrap_or_default()`', '`v`', "The type's default value: `0`, `false`, an empty `String`"],
                ['`opt.is_some()`, `opt.is_none()`', '`true`, `false`', '`false`, `true`'],
                ['`opt.expect("why it is there")`', '`v`', 'A panic with your message'],
                ['`opt.unwrap()`', '`v`', 'A panic with a general message'],
              ],
            } },
            "`unwrap` is the blunt one. It hands over the value if there is one, and panics if there is not.",
            { run: menu + rs`

fn main() {
    println!("{}", find_price("tea").unwrap());
    println!("{}", find_price("scone").unwrap());
    println!("not reached");
}`, name: 'unwrap.rs', panics: true, expect: '4\n' },
            "The message names the line and nothing else. It cannot say why you believed there was a value. `expect` is `unwrap` with a message of your own, and the message to write is that reason.",
            { run: rs`fn main() {
    let port: u16 = "8080".parse().expect("the default port is a valid u16");

    let mut queue = Vec::new();
    queue.push("first job");
    let next = queue.first().expect("a job was pushed on the line above");

    println!("{port} {next}");
}`, name: 'expect.rs', expect: '8080 first job\n' },
            "When is a panic an acceptable answer to `None`? When `None` would mean that the program is wrong, and not that the input was unusual.",
            { list: [
              "**In tests and in throwaway code.** A panic fails the test, which is the outcome you want.",
              "**When the surrounding code makes `None` impossible** and the compiler cannot see it, as in both cases above. Prefer `expect`, so that the reason is written down for whoever reads the panic.",
              "**Never on anything from outside the program**: what a user typed, a file, a network reply, another team's data. There the empty case is ordinary, and the program owes its user something better than a panic.",
            ] },
            { pitfall: "The habit from other languages is to test and then use: `if price.is_some() { total += price.unwrap(); }`. It works, but the test and the `unwrap` are two statements that a later edit can pull apart. `if let Some(p) = price { total += p; }` tests and extracts in one step, and leaves no `unwrap` that can go wrong." },
            { native: "Clippy can hold a project to this. Put `#![warn(clippy::unwrap_used)]` at the top of `main.rs` and `cargo clippy` reports every `unwrap`. `clippy::expect_used` does the same for `expect`. Many teams turn the first one on everywhere except in tests." },
          ],
        },
        {
          title: 'Transforming without unwrapping',
          body: [
            "Often you do not want the value out yet. You want to do something to it if it is there, and to leave a `None` alone. That is `map`.",
            "`map` takes the function to apply. The usual way to write a small function on the spot is a **closure**: `|price| price * 2` is a function with one parameter, `price`, which returns `price * 2`. The parameters go between the bars and the body follows them. Lesson 17 explains closures. Until then, read one as a small function without a name.",
            { run: menu + rs`

fn main() {
    let doubled = find_price("tea").map(|price| price * 2);
    let missing = find_price("scone").map(|price| price * 2);
    println!("{doubled:?} {missing:?}");

    // map may change the type inside: Option<u32> becomes Option<String>.
    let label = find_price("cake").map(|price| format!("{price} coins"));
    println!("{label:?}");

    // Chain the steps, and choose a fallback once, at the end.
    let shown = find_price("scone").map(|price| price * 2).unwrap_or(0);
    println!("{shown}");
}`, name: 'map.rs', expect: 'Some(8) None\nSome("5 coins")\n0\n' },
            "`map` is for a step that always succeeds. When the step may itself come up empty, its function returns an `Option`, and `map` would wrap that in a second one. `and_then` runs the step without adding a layer: a `None` at either stage gives `None`.",
            { run: menu + rs`

// Half price, for prices that divide evenly.
fn half(price: u32) -> Option<u32> {
    if price % 2 == 0 { Some(price / 2) } else { None }
}

fn main() {
    println!("{:?}", find_price("tea").map(|price| half(price)));          // one layer too many
    println!("{:?}", find_price("tea").and_then(|price| half(price)));
    println!("{:?}", find_price("cake").and_then(|price| half(price)));    // 5 does not halve
    println!("{:?}", find_price("scone").and_then(half));                  // a function's name works too
}`, name: 'and_then.rs', expect: 'Some(Some(2))\nSome(2)\nNone\nNone\n' },
            { table: {
              head: ['Method', 'Its argument', '`Some(v)` becomes', '`None` becomes'],
              rows: [
                ['`map(f)`', 'A function that returns a plain value', '`Some(f(v))`', '`None`'],
                ['`and_then(f)`', 'A function that returns an `Option`', '`f(v)`', '`None`'],
                ['`filter(test)`', 'A function that returns a `bool`', '`Some(v)` if the test passes, or else `None`', '`None`'],
                ['`or(other)`', 'Another `Option`', '`Some(v)`', '`other`'],
                ['`unwrap_or(fallback)`', 'A plain value', '`v`', '`fallback`'],
                ['`unwrap_or_else(f)`', 'A function that makes the fallback', '`v`', '`f()`, which runs only now'],
                ['`ok_or(reason)`', 'An error value', '`Ok(v)`', '`Err(reason)`'],
              ],
            } },
            { run: menu + rs`

fn main() {
    // filter only looks at the value, so its closure is given a reference: hence the *.
    let cheap = find_price("tea").filter(|price| *price < 5);
    let dear = find_price("cake").filter(|price| *price < 5);
    println!("{cheap:?} {dear:?}");

    let either = find_price("scone").or(find_price("cake"));
    println!("{either:?}");

    // || is a closure with no parameters. It runs only if the fallback is needed.
    let label = find_price("scone")
        .map(|price| format!("{price} coins"))
        .unwrap_or_else(|| String::from("ask at the counter"));
    println!("{label}");
}`, name: 'more_combinators.rs', expect: 'Some(4) None\nSome(5)\nask at the counter\n' },
            { compare: "This is optional chaining. TypeScript's `user?.address?.city ?? \"unknown\"` and PHP's `$user?->address?->city ?? 'unknown'` give up at the first null and fall back at the end. `and_then` is the `?.` and `unwrap_or` is the `??`. Python has neither operator and spells each step as `if x is not None`. The Rust chain is wordier than `?.`, and it is checked: you cannot forget that a step may be empty, because the types do not line up until you have dealt with it." },
            "The last row of the table, `ok_or`, leads to the other type of this lesson. It turns a `None` into a failure with a reason attached.",
          ],
        },
        {
          title: 'Result<T, E>: success or a reason',
          body: [
            "`None` says there is no value. It cannot say why. For an operation that can fail, the reason matters, and the type that carries it is `Result`:",
            { code: rs`enum Result<T, E> {
    Ok(T),      // it worked, and here is the value
    Err(E),     // it failed, and here is why
}` },
            "`Ok` and `Err` are in scope everywhere, as `Some` and `None` are. Turning text into a number is the first fallible operation most programs meet. `parse` returns a `Result`, and you take it apart like any enum.",
            { run: rs`fn main() {
    for text in ["42", "4x2", ""] {
        match text.parse::<i32>() {
            Ok(n) => println!("{text:?} is the number {n}"),
            Err(e) => println!("{text:?} is not a number: {e}"),
        }
    }
}`, name: 'parse.rs', expect: '"42" is the number 42\n"4x2" is not a number: invalid digit found in string\n"" is not a number: cannot parse integer from empty string\n' },
            "When you write a fallible function, `E` is yours to choose. This lesson uses a `String` or a small enum. Lesson 19 is about designing error types that callers can act on.",
            { run: age + rs`

fn main() {
    println!("{:?}", parse_age("41"));
    println!("{:?}", parse_age(" 200 "));
    println!("{:?}", parse_age("forty"));
}`, name: 'parse_age.rs', expect: 'Ok(41)\nErr("not a plausible age: 200")\nErr("not a number from 0 to 255: forty")\n' },
            "`Result` has the methods of `Option`, with the same meanings. `map` and `and_then` act on the `Ok` value and pass an `Err` along untouched. `unwrap_or` supplies a fallback. `unwrap` and `expect` panic on an `Err` and print it. A few more deal with the error side:",
            { table: {
              head: ['Write', 'To get'],
              rows: [
                ['`result.map_err(f)`', 'The same `Result` with its error changed by `f`. An `Ok` is left alone. This is how one error type becomes another'],
                ['`result.ok()`', 'An `Option<T>`: the value is kept and the reason is thrown away'],
                ['`option.ok_or(reason)`', 'A `Result<T, E>`: a `None` is given a reason'],
                ['`result.is_ok()`, `result.is_err()`', 'A `bool`'],
              ],
            } },
            { run: age + rs`

fn main() {
    let doubled = parse_age("21").map(|age| age * 2);
    let failed = parse_age("x").map(|age| age * 2);
    println!("{doubled:?} {failed:?}");

    // map_err changes the error and leaves an Ok alone.
    let labeled = parse_age("x").map_err(|message| format!("age field: {message}"));
    println!("{labeled:?}");

    // ok() keeps the value and drops the reason. ok_or() gives a None a reason.
    println!("{:?} {:?}", parse_age("21").ok(), parse_age("x").ok());
    let nothing: Option<u8> = None;
    println!("{:?}", nothing.ok_or("no age given"));

    println!("{} {}", parse_age("x").unwrap_or(18), parse_age("x").is_err());
}`, name: 'result_methods.rs', expect: 'Ok(42) Err("not a number from 0 to 255: x")\nErr("age field: not a number from 0 to 255: x")\nSome(21) None\nErr("no age given")\n18 true\n' },
            "`expect` on an `Err` panics with your message, and adds the error after it.",
            { run: age + rs`

fn main() {
    let first = parse_age("41").expect("the form has already checked the age");
    println!("{first}");
    let second = parse_age("forty").expect("the form has already checked the age");
    println!("{second}");
}`, name: 'expect_on_err.rs', panics: true, expect: '41\n' },
            "A `Result` exists to be looked at. Calling a fallible function and letting its result fall on the floor is how failures get lost, so the compiler warns when you do. Run this one and read the warning.",
            { run: rs`fn save(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err(String::from("a name is required"));
    }
    println!("saved {name}");
    Ok(())
}

fn main() {
    save("ada");
    save("");
    println!("done");
}`, name: 'unused_result.rs', warns: true, expect: 'saved ada\ndone\n' },
            "The program runs, and the failure of the second call vanishes without a trace. That is why the warning exists. `Ok(())` is what a function returns when it succeeded and has nothing to hand back: `()` is the unit type from lesson 3. The warning also shows the way to say that you mean it: `let _ = save(\"\");` discards the result on purpose.",
            { compare: "An exception travels up the stack out of sight. Nothing in a Python, PHP or TypeScript signature says that a function can throw, or what. A `Result` is in the signature, the caller has to do something with it, and it goes only where the code sends it. PHP's older habit of returning `false` on failure fails in the other direction: `strpos` returns `0` for a match at the start and `false` for no match, and `==` cannot tell them apart. An `Option` or a `Result` keeps the two outcomes in different variants, where they cannot be confused." },
            { fromC: "`Option` replaces `NULL` and sentinel values such as `-1` and `EOF`. `Result` replaces the return code and `errno`. In C nothing stops you from using a return value before checking it. Here the value is inside the `Ok`, and no path to it skips the check." },
          ],
        },
        {
          title: 'The ? operator',
          body: [
            "Handling every `Result` with a `match` is thorough and repetitive. Most of the time, a function that meets an error has one sensible move: stop, and hand the error to its caller. Written out, that is a `match` whose `Err` arm returns. The `?` operator is that `match` in one character.",
            { run: age + rs`

// The long way: every step is a match that returns early on Err.
fn age_gap_long(a: &str, b: &str) -> Result<u8, String> {
    let first = match parse_age(a) {
        Ok(age) => age,
        Err(e) => return Err(e),
    };
    let second = match parse_age(b) {
        Ok(age) => age,
        Err(e) => return Err(e),
    };
    Ok(first.abs_diff(second))
}

// The same function with the ? operator.
fn age_gap(a: &str, b: &str) -> Result<u8, String> {
    let first = parse_age(a)?;
    let second = parse_age(b)?;
    Ok(first.abs_diff(second))
}

fn main() {
    println!("{:?} {:?}", age_gap_long("30", "41"), age_gap("30", "41"));
    println!("{:?}", age_gap("30", "old"));
    println!("{:?}", age_gap("young", "old"));
}`, name: 'question_mark.rs', expect: 'Ok(11) Ok(11)\nErr("not a number from 0 to 255: old")\nErr("not a number from 0 to 255: young")\n' },
            "Read `parse_age(a)?` as: if this is `Ok(v)`, the expression is `v`. If it is `Err(e)`, return `Err(e)` from the function now. The last call shows the early return: `young` fails first, and `old` is never parsed.",
            "`?` returns from the function it is written in, so that function must have a return type an early `Err` fits into.",
            { run: rs`fn main() {
    let age = "41".parse::<u8>()?;
    println!("{age}");
}`, name: 'question_in_main.rs', fails: 'E0277' },
            "`main` returns `()`, and there is nowhere for an `Err` to go. `main` is allowed to return a `Result`, as the `help:` suggests, and lesson 19 shows what happens to the program when it does. Until then, `main` is where errors stop and meet a `match`.",
            "The second requirement is that the error types agree. `parse::<u16>()` fails with a `ParseIntError` from the standard library, and a function declared to return `Result<u16, String>` cannot return one of those. `map_err` converts the error on its way out, and this is its main use.",
            { run: rs`fn parse_port(text: &str) -> Result<u16, String> {
    let port = text.parse::<u16>().map_err(|e| format!("bad port {text:?}: {e}"))?;
    if port < 1024 {
        return Err(format!("port {port} is reserved"));
    }
    Ok(port)
}

fn main() {
    for text in ["8080", "80", "http"] {
        match parse_port(text) {
            Ok(port) => println!("listening on {port}"),
            Err(message) => println!("error: {message}"),
        }
    }
}`, name: 'map_err.rs', expect: 'listening on 8080\nerror: port 80 is reserved\nerror: bad port "http": invalid digit found in string\n' },
            "Lesson 19 teaches `?` to make that conversion by itself. `?` also works on an `Option`, in a function that returns an `Option`: a `None` makes the function return `None`.",
            { run: rs`// The first letter of the second word, as a capital.
fn second_initial(text: &str) -> Option<char> {
    let (_, rest) = text.split_once(' ')?;     // None if there is no space
    let initial = rest.chars().next()?;        // None if nothing follows it
    Some(initial.to_ascii_uppercase())
}

fn main() {
    println!("{:?} {:?} {:?}", second_initial("ada lovelace"), second_initial("ada"), second_initial("ada "));
}`, name: 'question_on_option.rs', expect: "Some('L') None None\n" },
            "`split_once` returns an `Option` holding the text on each side of the first separator. The two kinds of `?` do not mix. Here the same `split_once` is followed by a `?` in a function that returns a `Result`.",
            { run: rs`fn surname(full_name: &str) -> Result<&str, String> {
    let (_, rest) = full_name.split_once(' ')?;
    Ok(rest)
}

fn main() {
    println!("{:?}", surname("ada lovelace"));
}`, name: 'option_in_result.rs', fails: 'E0277' },
            "On `None`, the function would have to return an `Err`, and the compiler will not invent a reason for you. The message names the method that supplies one.",
            { run: rs`fn surname(full_name: &str) -> Result<&str, String> {
    let (_, rest) = full_name.split_once(' ').ok_or(String::from("no surname given"))?;
    Ok(rest)
}

fn main() {
    println!("{:?} {:?}", surname("ada lovelace"), surname("ada"));
}`, name: 'ok_or.rs', expect: 'Ok("lovelace") Err("no surname given")\n' },
            "In the other direction, a `Result` in a function that returns an `Option`, write `.ok()?` to say that the reason is being dropped.",
            { compare: "`?` gives back what exceptions were good at: the successful path reads straight down the page, and failures leave by a side door. What it keeps is visibility. Every place where the function can leave early has a `?` on it, and the signature says what comes out. Do not confuse it with the `?.` of TypeScript and PHP. That operator skips the rest of one expression. Rust's `?` leaves the whole function." },
            { pitfall: "`?` is not a shorter `unwrap`. `unwrap` ends the program when it meets an `Err`. `?` passes the `Err` to the caller, who can still decide what to do with it. In a function that already returns a `Result`, there is rarely a reason to write `unwrap`." },
          ],
        },
        {
          title: 'Option and ownership',
          body: [
            "An `Option<String>` owns its `String`, the way a struct owns its fields. Everything in Part 2 applies to it, and one rule comes up constantly: a value cannot be moved out through a reference.",
            "Here is the bug that rule prevents. Suppose a function that was lent a `Ticket` could move the holder's name out of it. The name's heap buffer would then have two owners: the function's new variable, and the ticket, which still looks intact to whoever lent it. Each would free the buffer when it was done. That is the double free of lesson 5.",
            "The methods of the last sections make this easy to attempt. `map`, `unwrap`, `unwrap_or` and most of the others take the `Option` by value. In the terms of lesson 11 they are `self` methods, and calling one consumes the `Option`. On an `Option<u32>` you never notice, because it is `Copy`. On an `Option<String>` behind a reference, consuming means moving out, and the compiler refuses.",
            { run: rs`struct Ticket {
    holder: Option<String>,
}

fn name_length(ticket: &Ticket) -> usize {
    ticket.holder.map(|name| name.len()).unwrap_or(0)
}

fn main() {
    let ticket = Ticket { holder: Some(String::from("ada")) };
    println!("{}", name_length(&ticket));
}`, name: 'move_out.rs', fails: 'E0507' },
            "The note names the cause: `map` takes ownership of the receiver `self`. The `help:` lines name the fixes, and they are the standard ones.",
            { table: {
              head: ['You want', 'Write', 'You get'],
              rows: [
                ['To look at the value', '`opt.as_ref()`', 'An `Option<&T>`: a new, small `Option` holding a reference. Consume that one as you like'],
                ['To look at text or a list', '`opt.as_deref()`', 'An `Option<&str>` from an `Option<String>`, or an `Option<&[T]>` from an `Option<Vec<T>>`'],
                ['To change the value in place', '`opt.as_mut()`', 'An `Option<&mut T>`'],
                ['To move the value out', '`opt.take()`', 'The `Option<T>` that was there. The place is left holding `None`'],
                ['To swap in a new value', '`opt.replace(v)`', 'The `Option<T>` that was there. The place is left holding `Some(v)`'],
                ['A second, independent copy', '`opt.clone()`', 'An `Option<T>` of your own, at the price of copying what is inside'],
              ],
            } },
            { run: rs`struct Ticket {
    holder: Option<String>,
}

fn name_length(ticket: &Ticket) -> usize {
    ticket.holder.as_ref().map(|name| name.len()).unwrap_or(0)
}

fn holder_name(ticket: &Ticket) -> &str {
    ticket.holder.as_deref().unwrap_or("nobody")
}

fn release(ticket: &mut Ticket) -> Option<String> {
    ticket.holder.take()
}

fn main() {
    let mut ticket = Ticket { holder: Some(String::from("ada")) };
    println!("{} {}", holder_name(&ticket), name_length(&ticket));

    let released = release(&mut ticket);
    println!("{released:?} {:?}", ticket.holder);
    println!("{} {}", holder_name(&ticket), name_length(&ticket));

    let previous = ticket.holder.replace(String::from("grace"));
    println!("{previous:?} {:?}", ticket.holder);
}`, name: 'option_ownership.rs', expect: 'ada 3\nSome("ada") None\nnobody 0\nNone Some("grace")\n' },
            "`as_ref` and `as_deref` borrow, so a shared reference to the ticket is enough. `take` and `replace` change the ticket, so they need `&mut`. `take` is how a value leaves a place that you can reach only through `&mut`. It satisfies the rule by never leaving a hole: at every moment the place holds a valid `Option`, and the buffer has one owner.",
            { trace: {
              title: '`take` moves the value out and leaves `None` behind',
              code: rs`fn main() {
    let mut slot = Some(String::from("ada"));
    let taken = slot.take();
    println!("{slot:?} {taken:?}");
}`,
              vars: [
                { id: 'slot', type: 'Option<String>' },
                { id: 'taken', type: 'Option<String>' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 3, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { slot: '&buf', buf: ["'a'", "'d'", "'a'"] }, say: "`slot` is `Some`, and the `String` inside it owns a buffer on the heap. The figure draws the `Option` as one cell with an arrow to that buffer." },
                { line: 3, set: { taken: '&buf', slot: 'None' }, say: "`take` hands the whole `Option` to `taken` and writes `None` where it was. The bytes on the heap did not move and nothing was allocated. The buffer still has exactly one owner." },
                { line: 4, say: "`slot` was not moved. It is a valid `Option` that happens to be empty, so it can be read, and it could be filled again. This line prints `None Some(\"ada\")`." },
                { line: 5, dead: ['buf'], hide: ['slot', 'taken'], say: "`taken` goes out of scope and frees the buffer. `slot` holds nothing, so it has nothing to free." },
              ],
            } },
            { pitfall: "`opt.clone()` satisfies the compiler too, and the last `help:` line offers it. It copies the text to do so. When you only need to read, reach for `as_ref` or `as_deref`. When you need the value itself, ask whether the place still needs it afterward. If not, `take` it." },
            { aside: "Pattern matching has its own way to borrow, from lesson 12: `if let Some(name) = &ticket.holder` binds `name` as a `&String` and moves nothing. `as_ref` gives a method chain the same thing. `take`, for its part, is a special case of `std::mem::take`, which swaps a type's default value into a place and returns what was there. For an `Option` the default is `None`. Lesson 14 uses `mem::take` on the elements of a `Vec`, and lesson 21 uses `take` on every link of a linked list." },
          ],
        },
        {
          title: 'Panic or Result?',
          body: [
            "Rust has two ways to fail, and they are for different things.",
            { table: {
              head: ['', 'A panic', 'A `Result`'],
              rows: [
                ['It means', 'The program has a bug: something that should be impossible has happened', 'Something went wrong that a correct program has to expect'],
                ['Examples', 'An index past the end, a broken invariant, an `unwrap` on a value you were sure of', 'Bad input, a missing file, a refused connection, a full disk'],
                ['Who deals with it', 'A programmer, later. The thread stops and prints a message', 'The caller, now. It has the context to retry, report or give up'],
                ['In the signature', 'No', 'Yes'],
              ],
            } },
            "The test is who is at fault and who can act. If the caller broke the function's contract, panic: `v[10]` on a slice of three is the caller's bug, and an error value would only give them something else to ignore. If the world did something inconvenient, return a `Result`: a caller who asks for a file that is not there has done nothing wrong, and may well have a plan for that case. And when absence is ordinary and needs no explanation, return an `Option`: the first element of an empty list, a key that is not in a map.",
            { run: rs`// Splits a bill. Zero people is a bug in the caller, so this panics.
fn share(total_cents: u32, people: u32) -> u32 {
    assert!(people > 0, "share called with no people");
    total_cents.div_ceil(people)
}

// Reads the head count from a form field. Bad input is expected, so this returns a Result.
fn read_people(field: &str) -> Result<u32, String> {
    let people = field.trim().parse::<u32>().map_err(|_| format!("not a whole number: {field}"))?;
    if people == 0 {
        return Err(String::from("at least one person has to pay"));
    }
    Ok(people)
}

fn main() {
    for field in ["4", "0", "four"] {
        match read_people(field) {
            Ok(people) => println!("each pays {}", share(1000, people)),
            Err(message) => println!("cannot split: {message}"),
        }
    }
}`, name: 'panic_or_result.rs', expect: 'each pays 250\ncannot split: at least one person has to pay\ncannot split: not a whole number: four\n' },
            "The two functions sit on either side of a boundary. `read_people` faces the outside world and turns whatever arrives into either a good value or an error. `share` is behind it and may assume its arguments make sense. `assert!` panics when its condition is false, and states that assumption in code. Checking at the edge and trusting inside is the usual shape of a Rust program.",
            "The standard library often offers both forms and lets the caller choose: `v[i]` panics and `v.get(i)` returns an `Option`, and `a + b` panics on overflow where `a.checked_add(b)` returns an `Option`. When you are unsure which to write, return the `Result`. A caller can turn an `Err` into a panic with one `expect`, and cannot easily go the other way.",
            { compare: "Python, PHP and TypeScript have one mechanism, the exception, for both jobs. A `TypeError` caused by a bug and a `FileNotFoundError` caused by the world travel the same road, and one broad `except` or `catch` swallows both. Rust separates them. A panic appears in no signature and is not meant to be caught, so do not use one for control flow, as exceptions sometimes are. A `Result` is a value that cannot be overlooked." },
          ],
        },
      ],
      takeaways: [
        "`Option<T>` is `Some(value)` or `None`, and `Result<T, E>` is `Ok(value)` or `Err(reason)`. Both are ordinary enums, and neither can be used as the value inside until the other case is handled.",
        "`map` changes the value inside, `and_then` chains a step that may itself come up empty, and `unwrap_or` ends a chain with a fallback.",
        "`?` returns early with the `None` or the `Err`. The function must return an `Option`, or a `Result` with the same error type. `map_err` and `ok_or` make the types agree.",
        "`unwrap` and `expect` turn the empty case into a panic. Keep them for tests and for cases a correct program cannot reach, and never use them on outside input.",
        "An unused `Result` is a warning, because it is a failure nobody looked at.",
        "Most `Option` methods consume it. Through a reference, use `as_ref` or `as_deref` to look, and `take` to move the value out and leave `None`.",
        "Panic for bugs, return a `Result` for failures a correct program must expect, and return an `Option` when absence is ordinary.",
      ],
      quiz: [
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let a: Option<i32> = Some(4);
    let b: Option<i32> = None;

    let x = a.map(|n| n + 1).unwrap_or(0);
    let y = b.map(|n| n + 1).unwrap_or(0);
    let z = a.filter(|n| *n > 10).map(|n| n * 2);
    println!("{x} {y} {z:?}");
}`,
          answer: '5 0 None',
          explain: "`map` adds one inside the `Some` and leaves the `None` alone, so the fallback is used only for `b`. `filter` turns `Some(4)` into `None` because 4 is not greater than 10, and the `map` after it has nothing to double.",
          hint: "Follow each chain one method at a time, writing down `Some(…)` or `None` after every step.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn half(n: u32) -> Option<u32> {
    if n % 2 == 0 { Some(n / 2) } else { None }
}

fn main() {
    println!("{:?}", Some(12).and_then(half).and_then(half));
    println!("{:?}", Some(10).and_then(half).and_then(half));
    println!("{:?}", Some(12).map(half));
}`,
          answer: 'Some(3)\nNone\nSome(Some(6))',
          explain: "12 halves to 6 and then to 3. 10 halves to 5, which is odd, so the second step gives `None`. `map` does not flatten: it wraps whatever `half` returns, which is already an `Option`, in another `Some`.",
          hint: "`and_then` gives back exactly what the function returns. `map` wraps what the function returns in `Some`.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let good = "7".parse::<i32>().map(|n| n * 3).map_err(|_| "bad");
    let bad = "x7".parse::<i32>().map(|n| n * 3).map_err(|_| "bad");
    let rescued = "x7".parse::<i32>().ok().or(Some(1)).ok_or("none");
    println!("{good:?} {bad:?} {rescued:?}");
}`,
          answer: 'Ok(21) Err("bad") Ok(1)',
          explain: "`map` acts only on an `Ok`, and `map_err` only on an `Err`. In the last chain, `ok()` turns the failed parse into `None`, `or(Some(1))` replaces that with `Some(1)`, and `ok_or` turns a `Some` into an `Ok`. Its reason is never used.",
          hint: "For each method, ask which variant it acts on. The other variant passes through unchanged.",
        },
        {
          q: 'Does this program compile?',
          code: rs`fn doubled(text: &str) -> Option<u32> {
    let n = text.parse::<u32>()?;
    Some(n * 2)
}

fn main() {
    println!("{:?}", doubled("21"));
}`,
          options: [
            { t: 'No: `?` is applied to a `Result` in a function that returns an `Option`', ok: true, why: "`parse` returns a `Result`. On an `Err`, the `?` would have to return `None` and silently throw the reason away, and the compiler will not do that unasked. It reports `E0277` and suggests `.ok()?`, which puts the decision to drop the reason into the code." },
            { t: 'Yes, and it prints `Some(42)`', why: "It would with `.ok()` before the `?`. As written, the `?` has a `Result` in hand and an `Option` to return, and the two do not mix." },
            { t: 'Yes: when the text is not a number, the `?` makes the function return `None`', why: "That is what `.ok()?` does, and you have to write it. Nothing converts an `Err` to a `None` by itself, because a reason would be lost without anyone deciding to lose it." },
            { t: 'No: `?` may only be used in `main`', why: "It is the other way round. `?` works in any function that returns a `Result` or an `Option`, and an ordinary `main` returns neither." },
          ],
          verify: 'E0277',
        },
        {
          q: 'What does this program print?',
          code: rs`fn main() {
    let mut slot = Some(String::from("ada"));
    let taken = slot.take();
    println!("{slot:?} {taken:?}");
}`,
          options: [
            { t: '`None Some("ada")`', ok: true, why: "`take` returns the `Option` that was in `slot` and leaves `None` in its place. `slot` is still a valid variable, which is why it can be printed." },
            { t: '`Some("ada") Some("ada")`', why: "That is what `slot.clone()` gives: two owners and two buffers. `take` moves the one value. It never duplicates it." },
            { t: '`Some("") Some("ada")`', why: "Close: that is `std::mem::take` applied to the `String` inside, which leaves an empty `String` behind. `take` on the `Option` leaves the `Option`'s own default, which is `None`." },
            { t: 'Nothing: it does not compile, because `slot` was moved on line 3', why: "That is what `let taken = slot;` would cause. `take` borrows `slot` mutably, moves the contents out and puts `None` in, so `slot` itself was never moved." },
          ],
          verify: true,
        },
        {
          kind: 'multi',
          q: 'Where is `unwrap` (or better, `expect`) an acceptable choice?',
          options: [
            { t: 'In a unit test, on the result of the function being tested', ok: true, why: "A panic fails the test, and that is the report you want." },
            { t: 'On `"255".parse::<u8>()`, where the text is a literal in the source code', ok: true, why: "The literal cannot change while the program runs, so a failure would be a typo in the program. `expect` with the reason is better still." },
            { t: 'On `list.last()`, on the line after `list.push(item)`', ok: true, why: "The list cannot be empty there, and the compiler cannot see it. `expect(\"just pushed\")` writes the argument down." },
            { t: 'On the number a user typed into a form', why: "Input from outside is wrong all the time. That is an ordinary case to report, not a bug to crash on." },
            { t: 'On reading a configuration file, because the file is always there on your machine', why: "It is there on your machine. Elsewhere it is missing, unreadable or half-written, and a panic gives its user nothing to act on." },
            { t: 'On a lookup whose key arrived in a network request', why: "A stranger chose that key. A missing key is an expected outcome and deserves a proper answer." },
          ],
          hint: "Three are fine. In each of them, the empty case could only mean that the program itself is wrong.",
        },
        {
          kind: 'multi',
          q: 'Which of these situations should be reported with a `Result`, and not with a panic?',
          options: [
            { t: 'The configuration file named on the command line does not exist', ok: true, why: "The program is correct and the world is not as hoped. The caller can print a useful message or fall back to defaults." },
            { t: 'A date typed by a user does not parse', ok: true, why: "Bad input is the normal diet of a parser. The caller will want to ask again." },
            { t: 'A server does not answer before the timeout', ok: true, why: "Networks fail. The caller may retry, try another server or tell the user." },
            { t: 'A function documented to need a non-empty slice is called with an empty one', why: "The caller broke the contract. That is a bug in the calling code, and a panic at the point of the mistake is the most useful report." },
            { t: 'A count that the code only ever increases is found to be negative', why: "A broken invariant means the program's own logic is wrong. Nobody can handle that sensibly at run time. Stop, with `assert!` or `unreachable!`." },
          ],
          hint: "Ask who is at fault. If the answer is the outside world, the caller deserves a value it can act on.",
        },
        {
          q: 'What happens when this program is built and run?',
          code: rs`fn withdraw(balance: &mut u32, amount: u32) -> Result<(), String> {
    if amount > *balance {
        return Err(String::from("insufficient funds"));
    }
    *balance -= amount;
    Ok(())
}

fn main() {
    let mut balance = 50;
    withdraw(&mut balance, 80);
    println!("{balance}");
}`,
          options: [
            { t: 'The compiler warns that a `Result` is unused. The program runs and prints `50`', ok: true, why: "An `Err` is only a value. Nobody looked at it, so nothing happened and the failed withdrawal went unreported. The warning is the compiler pointing at exactly that." },
            { t: 'It panics with `insufficient funds`', why: "That is what an uncaught exception does in Python, PHP or JavaScript. An `Err` does not travel anywhere by itself. It would take an `unwrap` or an `expect` to turn it into a panic." },
            { t: 'It does not compile: every `Result` must be handled', why: "It is a warning, not an error, so the program is built. A project can make it an error with `#![deny(unused_must_use)]`." },
            { t: 'It builds without comment and prints `50`', why: "The output is right, but the build is not silent. `Result` is marked as a type that must be used, and the compiler says so." },
          ],
          verify: 'compiles',
        },
      ],
      challenges: [
        {
          id: 'safe-divide',
          title: 'Division with no answer',
          level: 'warm-up',
          prompt: "Return `a / b` inside `Some`, or `None` when the division has no answer. Dividing by zero is the obvious case, and the starter panics on it. There is one more: `i32::MIN / -1` would be one larger than `i32::MAX`, so it overflows.",
          signature: 'fn safe_divide(a: i32, b: i32) -> Option<i32>',
          starter: rs`fn safe_divide(a: i32, b: i32) -> Option<i32> {
    Some(a / b)
}`,
          hints: [
            "Test for the bad cases first and return `None`. Everything else is `Some(a / b)`.",
            "The overflow case is `a == i32::MIN && b == -1`.",
            "The integers already have this function: `a.checked_div(b)` returns `None` in both cases.",
          ],
          solution: rs`fn safe_divide(a: i32, b: i32) -> Option<i32> {
    if b == 0 || (a == i32::MIN && b == -1) {
        return None;
    }
    Some(a / b)
}`,
          solutionNote: "`a.checked_div(b)` is this function, from the standard library.",
          tests: [
            { label: 'Divides, rounding toward zero', body: rs`assert_eq!(safe_divide(7, 2), Some(3));
assert_eq!(safe_divide(-7, 2), Some(-3));` },
            { label: 'Zero divided by something is zero', body: rs`assert_eq!(safe_divide(0, 5), Some(0));` },
            { label: 'Division by zero is None', body: rs`assert_eq!(safe_divide(1, 0), None);
assert_eq!(safe_divide(0, 0), None);` },
            { label: 'The one division that overflows is None', body: rs`assert_eq!(safe_divide(i32::MIN, -1), None);` },
            { label: 'The extreme values divide normally otherwise', body: rs`assert_eq!(safe_divide(i32::MIN, 1), Some(i32::MIN));
assert_eq!(safe_divide(i32::MAX, -1), Some(-i32::MAX));` },
          ],
        },
        {
          id: 'first-even',
          title: 'The first even number',
          level: 'warm-up',
          prompt: "Return the first even number in the slice, or `None` if it has none. The result holds an `i32` and not a reference. `i32` is `Copy`, so `*value` copies the number out of the slice.",
          signature: 'fn first_even(values: &[i32]) -> Option<i32>',
          starter: rs`fn first_even(values: &[i32]) -> Option<i32> {
    for value in values {
        // Return Some(...) as soon as a value is even.
    }
    None
}`,
          hints: [
            "Inside the loop, `value` is a `&i32`. `value % 2 == 0` works through the reference.",
            "`return Some(*value);` leaves the function from inside the loop. The `None` after the loop is reached only when nothing was even.",
          ],
          solution: rs`fn first_even(values: &[i32]) -> Option<i32> {
    for value in values {
        if value % 2 == 0 {
            return Some(*value);
        }
    }
    None
}`,
          solutionNote: "With the iterator methods of lesson 18 this becomes `values.iter().copied().find(|value| value % 2 == 0)`.",
          tests: [
            { label: 'Finds the first of several even numbers', body: rs`assert_eq!(first_even(&[1, 4, 6]), Some(4));` },
            { label: 'Returns an even first element', body: rs`assert_eq!(first_even(&[2, 1]), Some(2));` },
            { label: 'Returns None when every value is odd', body: rs`assert_eq!(first_even(&[1, 3, 5]), None);` },
            { label: 'Returns None for an empty slice', body: rs`assert_eq!(first_even(&[]), None);` },
            { label: 'Counts zero and negative numbers as even', body: rs`assert_eq!(first_even(&[-3, -8, 0]), Some(-8));
assert_eq!(first_even(&[7, 0]), Some(0));` },
          ],
        },
        {
          id: 'parse-pair',
          title: 'Two numbers and a comma',
          level: 'core',
          prompt: [
            "Parse text such as `3, -4` into a pair of numbers. The starter does it with `unwrap`, so it panics on anything unexpected. Replace each `unwrap` with a `?`, so that bad text comes back as an `Err` the caller can inspect.",
            { list: [
              "With no comma in the text, return `Err(PairError::MissingComma)`.",
              "When a part is not an `i32`, return `Err(PairError::BadNumber(part))`, where `part` is the offending text without the spaces around it. If both parts are bad, report the first.",
            ] },
            "`split_once(',')` returns an `Option` holding the text before and after the first comma. `parse` returns a `Result` whose error type belongs to the standard library. Neither carries a `PairError` yet, so a bare `?` will not compile. `ok_or` and `map_err` put that right.",
          ],
          signature: 'fn parse_pair(text: &str) -> Result<(i32, i32), PairError>',
          prelude: rs`#[derive(Debug, PartialEq)]
enum PairError {
    MissingComma,
    BadNumber(String),
}`,
          starter: rs`fn parse_pair(text: &str) -> Result<(i32, i32), PairError> {
    let (left, right) = text.split_once(',').unwrap();
    let x = left.trim().parse::<i32>().unwrap();
    let y = right.trim().parse::<i32>().unwrap();
    Ok((x, y))
}`,
          hints: [
            "`text.split_once(',')` is an `Option`. `.ok_or(PairError::MissingComma)` turns it into a `Result` with the right error type, and then `?` works on it.",
            "`left.trim().parse::<i32>()` is a `Result` with the wrong error type. `.map_err(|_| PairError::BadNumber(left.trim().to_string()))` replaces the error. The `_` says that the closure ignores the original one.",
            "`let x = left.trim().parse::<i32>().map_err(|_| PairError::BadNumber(left.trim().to_string()))?;` and the same again for `right`. A small helper function saves writing it twice.",
          ],
          solution: rs`fn parse_number(part: &str) -> Result<i32, PairError> {
    let part = part.trim();
    part.parse::<i32>().map_err(|_| PairError::BadNumber(part.to_string()))
}

fn parse_pair(text: &str) -> Result<(i32, i32), PairError> {
    let (left, right) = text.split_once(',').ok_or(PairError::MissingComma)?;
    let x = parse_number(left)?;
    let y = parse_number(right)?;
    Ok((x, y))
}`,
          tests: [
            { label: 'Parses two numbers', body: rs`assert_eq!(parse_pair("3,4"), Ok((3, 4)));` },
            { label: 'Ignores spaces and reads a minus sign', body: rs`assert_eq!(parse_pair(" 3 , -4 "), Ok((3, -4)));` },
            { label: 'Reports a missing comma', body: rs`assert_eq!(parse_pair("34"), Err(PairError::MissingComma));
assert_eq!(parse_pair(""), Err(PairError::MissingComma));` },
            { label: 'Reports the part that is not a number, trimmed', body: rs`assert_eq!(parse_pair("3, four "), Err(PairError::BadNumber(String::from("four"))));` },
            { label: 'Reports the first bad part when both are bad', body: rs`assert_eq!(parse_pair("x, y"), Err(PairError::BadNumber(String::from("x"))));` },
            { label: 'An empty part is a bad number', body: rs`assert_eq!(parse_pair("3,"), Err(PairError::BadNumber(String::new())));` },
            { label: 'A number too large for an i32 is a bad number', body: rs`assert_eq!(parse_pair("1, 99999999999"), Err(PairError::BadNumber(String::from("99999999999"))));` },
          ],
        },
        {
          id: 'chain-lookups',
          title: 'Three lookups in a row',
          level: 'core',
          forbid: ['match', 'if'],
          prompt: [
            "Each employee may have a manager, recorded as the manager's id. `find`, which is written for you, looks an employee up by id.",
            { list: [
              "`manager_of` returns the manager of employee `id`. It is `None` if there is no such employee, if they have no manager, or if their manager's id is not in the list.",
              "`skip_level_name` returns the name of that manager's own manager, or `\"nobody\"` if the chain stops anywhere before that.",
            ] },
            "Write both without `match` and without `if`, which rules out `if let` as well. The combinators of this lesson, or `?`, do the whole job.",
          ],
          signature: 'fn manager_of(staff: &[Employee], id: u32) -> Option<&Employee>\nfn skip_level_name(staff: &[Employee], id: u32) -> &str',
          prelude: rs`struct Employee {
    id: u32,
    name: String,
    manager: Option<u32>,   // the id of this person's manager, if they have one
}

/// The employee with this id, if there is one.
fn find(staff: &[Employee], id: u32) -> Option<&Employee> {
    for employee in staff {
        if employee.id == id {
            return Some(employee);
        }
    }
    None
}

fn employee(id: u32, name: &str, manager: Option<u32>) -> Employee {
    Employee { id, name: name.to_string(), manager }
}

/// The staff the tests use. Grace has no manager. Ada reports to Grace, Linus to Ada and Ken to Linus.
/// Margaret's manager, number 9, is not in the list.
fn sample_staff() -> Vec<Employee> {
    vec![
        employee(1, "Grace", None),
        employee(2, "Ada", Some(1)),
        employee(3, "Linus", Some(2)),
        employee(4, "Margaret", Some(9)),
        employee(5, "Ken", Some(3)),
    ]
}`,
          starter: rs`fn manager_of(staff: &[Employee], id: u32) -> Option<&Employee> {
    // Three steps can come up empty: finding the employee, reading their
    // manager's id, and finding that manager. Chain them.
    find(staff, id)
}

fn skip_level_name(staff: &[Employee], id: u32) -> &str {
    "nobody"
}`,
          hints: [
            "`find(staff, id)` is an `Option<&Employee>`. The next step, reading `.manager`, gives an `Option<u32>`. A step that may itself come up empty goes in `and_then`, not in `map`.",
            "`find(staff, id).and_then(|employee| employee.manager)` is the manager's id, as an `Option<u32>`. One more `and_then` looks that id up. A closure may use `staff` from the function around it.",
            "For `skip_level_name`, use `manager_of` twice: `manager_of(staff, id).and_then(|manager| manager_of(staff, manager.id))`. Then `.map(|boss| boss.name.as_str())` and `.unwrap_or(\"nobody\")`.",
          ],
          solution: rs`fn manager_of(staff: &[Employee], id: u32) -> Option<&Employee> {
    find(staff, id)
        .and_then(|employee| employee.manager)
        .and_then(|manager_id| find(staff, manager_id))
}

fn skip_level_name(staff: &[Employee], id: u32) -> &str {
    manager_of(staff, id)
        .and_then(|manager| manager_of(staff, manager.id))
        .map(|boss| boss.name.as_str())
        .unwrap_or("nobody")
}`,
          solutionNote: "With `?`, the first function is two lines: `let employee = find(staff, id)?;` and then `find(staff, employee.manager?)`. Both versions do the same work.",
          tests: [
            { label: 'Finds a manager', body: rs`let staff = sample_staff();
assert_eq!(manager_of(&staff, 3).map(|manager| manager.name.as_str()), Some("Ada"));
assert_eq!(manager_of(&staff, 2).map(|manager| manager.id), Some(1));` },
            { label: 'Someone without a manager has none', body: rs`let staff = sample_staff();
assert!(manager_of(&staff, 1).is_none());` },
            { label: 'An unknown employee has none', body: rs`let staff = sample_staff();
assert!(manager_of(&staff, 42).is_none());
assert!(manager_of(&[], 1).is_none());` },
            { label: 'A manager who is not in the list counts as none', body: rs`let staff = sample_staff();
assert!(manager_of(&staff, 4).is_none());` },
            { label: 'Names the manager of the manager', body: rs`let staff = sample_staff();
assert_eq!(skip_level_name(&staff, 3), "Grace");
assert_eq!(skip_level_name(&staff, 5), "Ada");` },
            { label: 'Says nobody when the chain stops early', body: rs`let staff = sample_staff();
assert_eq!(skip_level_name(&staff, 2), "nobody", "Ada's manager is Grace, who has no manager");
assert_eq!(skip_level_name(&staff, 1), "nobody");
assert_eq!(skip_level_name(&staff, 4), "nobody");
assert_eq!(skip_level_name(&staff, 42), "nobody");` },
          ],
        },
        {
          id: 'take-the-name',
          title: 'Take the name',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          forbid: ['clone', 'to_string', 'to_owned'],
          prompt: [
            "A `Ticket` may have a holder. These three functions say the right thing and do not compile: each one moves the holder's name out of a ticket that it only borrows.",
            "Repair them without copying any text. `clone` and its relatives are not allowed, and one test checks that the `String` which comes out of `release` is the very one that went in.",
          ],
          signature: 'fn name_length(ticket: &Ticket) -> usize\nfn release(ticket: &mut Ticket) -> Option<String>\nfn transfer(from: &mut Ticket, to: &mut Ticket) -> bool',
          prelude: rs`struct Ticket {
    holder: Option<String>,
}`,
          starter: rs`/// The length of the holder's name, or 0 for an unclaimed ticket. The ticket is not changed.
fn name_length(ticket: &Ticket) -> usize {
    ticket.holder.map(|name| name.len()).unwrap_or(0)
}

/// Removes the holder from the ticket and returns their name.
fn release(ticket: &mut Ticket) -> Option<String> {
    let name = ticket.holder;
    ticket.holder = None;
    name
}

/// Moves the holder of one ticket to another. If the other ticket is
/// already claimed, changes nothing and returns false.
fn transfer(from: &mut Ticket, to: &mut Ticket) -> bool {
    if to.holder.is_some() {
        return false;
    }
    to.holder = from.holder;
    true
}`,
          hints: [
            "All three errors are `E0507`: a `String` is being moved out of a place the function only borrows. Read the `help:` lines, and be suspicious of the ones that offer `clone`.",
            "`name_length` only needs to look. `ticket.holder.as_ref()` is an `Option<&String>`, and `map` can consume that without touching the ticket.",
            "`release` is one call: `ticket.holder.take()` returns what was there and leaves `None`. `transfer` wants the same call on `from.holder`.",
          ],
          solution: rs`/// The length of the holder's name, or 0 for an unclaimed ticket. The ticket is not changed.
fn name_length(ticket: &Ticket) -> usize {
    ticket.holder.as_ref().map(|name| name.len()).unwrap_or(0)
}

/// Removes the holder from the ticket and returns their name.
fn release(ticket: &mut Ticket) -> Option<String> {
    ticket.holder.take()
}

/// Moves the holder of one ticket to another. If the other ticket is
/// already claimed, changes nothing and returns false.
fn transfer(from: &mut Ticket, to: &mut Ticket) -> bool {
    if to.holder.is_some() {
        return false;
    }
    to.holder = from.holder.take();
    true
}`,
          tests: [
            { label: 'Measures the name and leaves the ticket alone', body: rs`let ticket = Ticket { holder: Some(String::from("grace")) };
assert_eq!(name_length(&ticket), 5);
assert_eq!(ticket.holder.as_deref(), Some("grace"));` },
            { label: 'An unclaimed ticket has a name of length 0', body: rs`let ticket = Ticket { holder: None };
assert_eq!(name_length(&ticket), 0);` },
            { label: 'Release moves the name out and leaves the ticket unclaimed', body: rs`let mut ticket = Ticket { holder: Some(String::from("ada")) };
let buffer = ticket.holder.as_ref().unwrap().as_ptr();
let name = release(&mut ticket).expect("release should return the holder's name");
assert_eq!(name, "ada");
assert!(ticket.holder.is_none(), "the ticket should be unclaimed after release");
assert_eq!(name.as_ptr(), buffer, "release should hand over the same String, not a copy of it");` },
            { label: 'Releasing twice gives None the second time', body: rs`let mut ticket = Ticket { holder: Some(String::from("ada")) };
release(&mut ticket);
assert_eq!(release(&mut ticket), None);` },
            { label: 'Transfer moves the holder across', body: rs`let mut from = Ticket { holder: Some(String::from("linus")) };
let mut to = Ticket { holder: None };
assert!(transfer(&mut from, &mut to));
assert_eq!(to.holder.as_deref(), Some("linus"));
assert!(from.holder.is_none(), "the first ticket should be unclaimed after the transfer");` },
            { label: 'Transfer refuses a ticket that is already claimed', body: rs`let mut from = Ticket { holder: Some(String::from("linus")) };
let mut to = Ticket { holder: Some(String::from("ken")) };
assert!(!transfer(&mut from, &mut to));
assert_eq!(from.holder.as_deref(), Some("linus"));
assert_eq!(to.holder.as_deref(), Some("ken"));` },
          ],
        },
        {
          id: 'sum-valid-lines',
          title: 'Add up a file of numbers',
          level: 'stretch',
          prompt: [
            "A text holds one whole number per line. Add them up, and report precisely what went wrong when that is not possible.",
            { list: [
              "Spaces around a number are ignored. Blank lines are skipped, and so are comment lines, whose first character after any spaces is `#`.",
              "Any other line that is not an `i32` ends the work with `Err(SumError::NotANumber(n))`, where `n` is the number of that line, counting every line of the text from 1.",
              "If the total stops fitting in an `i32`, return `Err(SumError::Overflow)`.",
            ] },
            "`text.lines()` gives the lines in order. The starter quietly skips whatever it cannot parse and adds with `+`, so it returns a wrong total for bad input and panics on overflow. Both failures can leave through a `?`.",
          ],
          signature: 'fn sum_valid_lines(text: &str) -> Result<i32, SumError>',
          prelude: rs`#[derive(Debug, PartialEq)]
enum SumError {
    NotANumber(usize),   // the line number, counting from 1
    Overflow,
}`,
          starter: rs`fn sum_valid_lines(text: &str) -> Result<i32, SumError> {
    let mut total = 0;
    for line in text.lines() {
        if let Ok(value) = line.trim().parse::<i32>() {
            total += value;
        }
    }
    Ok(total)
}`,
          hints: [
            "Keep a counter that goes up for every line, skipped or not. After `let line = line.trim();`, the lines to skip are those where `line.is_empty() || line.starts_with('#')`.",
            "`line.parse::<i32>().map_err(|_| SumError::NotANumber(number))?` turns a failed parse into your error and returns it.",
            "`total.checked_add(value)` is an `Option<i32>`, and `ok_or` gives its `None` a reason: `total = total.checked_add(value).ok_or(SumError::Overflow)?;`",
          ],
          solution: rs`fn sum_valid_lines(text: &str) -> Result<i32, SumError> {
    let mut total: i32 = 0;
    let mut number = 0;
    for line in text.lines() {
        number += 1;
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let value = line.parse::<i32>().map_err(|_| SumError::NotANumber(number))?;
        total = total.checked_add(value).ok_or(SumError::Overflow)?;
    }
    Ok(total)
}`,
          tests: [
            { label: 'Adds one number per line', body: rs`assert_eq!(sum_valid_lines("1\n2\n3"), Ok(6));
assert_eq!(sum_valid_lines("-5\n"), Ok(-5));` },
            { label: 'An empty text adds up to zero', body: rs`assert_eq!(sum_valid_lines(""), Ok(0));` },
            { label: 'Skips blank lines and comments, and trims spaces', body: rs`assert_eq!(sum_valid_lines("# totals\n 10 \n\n   # more\n-4\n"), Ok(6));` },
            { label: 'Names the line that is not a number', body: rs`assert_eq!(sum_valid_lines("1\ntwo\n3"), Err(SumError::NotANumber(2)));` },
            { label: 'Counts skipped lines when numbering', body: rs`assert_eq!(sum_valid_lines("# header\n\n5\n5x\n"), Err(SumError::NotANumber(4)));` },
            { label: 'Stops at the first bad line', body: rs`assert_eq!(sum_valid_lines("x\ny"), Err(SumError::NotANumber(1)));
assert_eq!(sum_valid_lines("99999999999"), Err(SumError::NotANumber(1)), "a number too large for an i32 is not an i32");` },
            { label: 'Reports overflow instead of panicking', body: rs`assert_eq!(sum_valid_lines("2147483647\n1"), Err(SumError::Overflow));
assert_eq!(sum_valid_lines("-2147483648\n-1\n5"), Err(SumError::Overflow));
assert_eq!(sum_valid_lines("2147483647\n-1\n1"), Ok(2147483647));` },
          ],
        },
      ],
    },

    {
      id: 'collections',
      title: 'Collections',
      category: part,
      minutes: 40,
      summary: 'Vec and HashMap in daily use: how they grow, who owns what is inside them, the three ways to loop over them, and why they cannot change shape during a loop.',
      topics: ['Vec', 'Growth and capacity', 'Three ways to iterate', 'Moving elements out', 'HashMap', 'The entry API', 'Choosing a collection'],
      sections: [
        {
          title: 'Vec<T>: the growable array',
          body: [
            "Lesson 4 took a `Vec` apart: three words on the stack, which are a pointer, a length and a capacity, and a buffer on the heap that holds the elements side by side. The lessons since then have borrowed it and sliced it. This one is about filling it, emptying it and walking through it, and about the other collection every program uses, the hash map.",
            { run: rs`fn main() {
    let mut scores: Vec<u32> = Vec::new();    // empty, and nothing allocated yet
    scores.push(72);
    scores.push(85);
    scores.push(91);

    let primes = vec![2, 3, 5, 7];             // the vec! macro, for a list you can write down
    let zeros = vec![0; 3];                    // three zeros

    println!("{scores:?} {primes:?} {zeros:?}");
    println!("{} {} {:?}", scores.len(), scores[1], scores.get(9));

    let last = scores.pop();                   // takes the last element off: an Option
    scores.insert(0, 60);                      // at the front: everything after it shifts up
    scores.extend([50, 40]);                   // pushes each element of another sequence
    println!("{last:?} {scores:?} {}", scores.contains(&85));
}`, name: 'vec_basics.rs', expect: '[72, 85, 91] [2, 3, 5, 7] [0, 0, 0]\n3 85 None\nSome(91) [60, 72, 85, 50, 40] true\n' },
            { table: {
              head: ['Method', 'What it does', 'Cost'],
              rows: [
                ['`push(x)`, `pop()`', 'Adds or removes at the end. `pop` returns an `Option`, because the `Vec` may be empty', 'Constant, apart from the occasional regrowth described below'],
                ['`insert(i, x)`, `remove(i)`', 'Adds or removes at position `i`, and shifts every later element along by one', 'Proportional to the number of elements after `i`'],
                ['`v[i]`, `get(i)`', 'Reads one element. The brackets panic past the end, and `get` returns an `Option`', 'Constant'],
                ['`len()`, `is_empty()`', 'The number of elements', 'Constant'],
                ['`extend(other)`, `truncate(n)`, `clear()`', 'Appends a whole sequence, keeps the first `n` elements, or removes all of them', 'Proportional to the elements added or dropped'],
              ],
            } },
            "A `Vec<T>` also does everything a slice does, because a `&Vec<T>` turns into a `&[T]` wherever one is wanted. `first`, `last`, `contains`, `iter`, `sort` and the rest of lesson 8 all work on it.",
            "Where does a pushed element go? Into spare capacity, if there is any. If there is none, the `Vec` gets a larger buffer and moves into it.",
            { trace: {
              title: 'Pushing past the capacity moves the whole buffer',
              code: rs`fn main() {
    let mut v = Vec::new();
    v.push(10);
    v.push(20);
    v.push(30);
    v.push(40);
    v.push(50);
    println!("{v:?}");
}`,
              vars: [
                { id: 'v', type: 'Vec<i32>' },
                { id: 'old', name: 'first buffer', type: 'i32', len: 4, frame: 'heap' },
                { id: 'new', name: 'second buffer', type: 'i32', len: 8, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { v: { ptr: '(none)', len: 0, cap: 0 } }, say: "`Vec::new` allocates nothing. The length and the capacity are 0, and the pointer has no buffer to point at yet." },
                { line: 3, set: { v: { ptr: '&old', len: 1, cap: 4 }, 'old[0]': 10 }, say: "The first `push` needs room, so the `Vec` asks the allocator for a buffer. It asks for four elements, not one. The capacity is 4 and the length is 1." },
                { line: [4, 5, 6], set: { 'v.len': 4, 'old[1]': 20, 'old[2]': 30, 'old[3]': 40 }, say: "The next three pushes go into the spare capacity. Each is one store and one addition to the length. Nothing is allocated." },
                { line: 7, set: { v: { ptr: '&new', len: 5, cap: 8 }, new: [10, 20, 30, 40, 50] }, dead: ['old'], say: "The buffer is full. This `push` asks for a buffer twice as large, copies the four elements across, frees the old buffer, and only then stores the 50. Every element now has a new address." },
                { line: 8, hide: ['old'], say: "The program cannot tell that anything moved. It prints `[10, 20, 30, 40, 50]`." },
                { line: 9, dead: ['new'], hide: ['v'], say: "`v` goes out of scope and frees the buffer it owns." },
              ],
            } },
            "The next program prints the length and the capacity each time the capacity changes.",
            { run: rs`fn main() {
    let mut v = Vec::new();
    let mut capacity = v.capacity();
    println!("len {:2}  capacity {:2}", v.len(), capacity);
    for n in 1..=17 {
        v.push(n * 10);
        if v.capacity() != capacity {
            capacity = v.capacity();
            println!("len {:2}  capacity {:2}", v.len(), capacity);
        }
    }

    // Asking for the room in advance: one allocation, and the buffer never moves.
    let mut planned: Vec<i32> = Vec::with_capacity(17);
    let start = planned.as_ptr();
    for n in 1..=17 {
        planned.push(n * 10);
    }
    println!("moved: {}", planned.as_ptr() != start);
}`, name: 'growth.rs', expect: 'len  0  capacity  0\nlen  1  capacity  4\nlen  5  capacity  8\nlen  9  capacity 16\nlen 17  capacity 32\nmoved: false\n' },
            "Doubling is what keeps `push` cheap on average. A `Vec` that grows to a million elements has moved about twenty times, not a million times. The exact growth steps are a detail of the standard library and not a promise, so do not write code that depends on them. When you know how many elements are coming, `Vec::with_capacity(n)` allocates once.",
            { compare: "A Python list and a JavaScript array are this same structure underneath: a buffer with spare room that grows by a factor when it fills. The difference is what the buffer holds. A `Vec<i32>` of a million numbers is one block of four million bytes with the numbers in it. A Python list of a million integers is a block of a million pointers to integer objects allocated one by one. A PHP array is a different structure altogether, an ordered hash map, even when its keys are 0, 1, 2." },
            { fromC: "`Vec` is the growable array from the C heap lesson: a pointer, a length, a capacity, and a `realloc` that doubles. The bookkeeping you wrote by hand there, including the `free` at the end, is what `push` and the end of a scope now do for you." },
          ],
        },
        {
          title: 'Three ways to iterate',
          body: [
            "A `for` loop over a `Vec` comes in three forms. They are the three ways of holding a value from Part 2: a shared borrow, a mutable borrow, and ownership.",
            { table: {
              head: ['Write', 'Each `x` is', 'The `Vec` afterward'],
              rows: [
                ['`for x in &v`', 'A `&T`: a look at the element', 'Untouched, and still yours'],
                ['`for x in &mut v`', 'A `&mut T`: the element, to change in place', 'Still yours, with the changes'],
                ['`for x in v`', 'A `T`: the element itself', 'Gone. It was moved into the loop'],
              ],
            } },
            { run: rs`fn main() {
    let mut names = vec![String::from("ada"), String::from("grace"), String::from("linus")];

    for name in &names {                // name: &String
        print!("{} ", name.len());
    }
    println!();

    for name in &mut names {            // name: &mut String
        name.push('!');
    }
    println!("{names:?}");

    let mut longest = String::new();
    for name in names {                 // name: String, moved out of the Vec
        if name.len() > longest.len() {
            longest = name;             // kept, without copying a byte of text
        }
    }
    println!("{longest}");
}`, name: 'three_loops.rs', expect: '3 5 5 \n["ada!", "grace!", "linus!"]\ngrace!\n' },
            "The third form hands each element to the loop body by value. That is what lets `longest = name` keep a name without copying it. It also means the `Vec` cannot go on owning those elements. Suppose it did: the `String` now in `longest` would be freed a second time when `names` went out of scope. So `for name in names` moves the whole `Vec` into the loop, and from then on `names` is a moved value like any other in lesson 5.",
            { run: rs`fn main() {
    let names = vec![String::from("ada"), String::from("grace")];
    for name in names {
        println!("{name}");
    }
    println!("{}", names.len());
}`, name: 'after_the_loop.rs', fails: 'E0382' },
            "The `help:` line gives the usual fix, `for name in &names`. Borrow when the loop only looks. Use the consuming form when the loop is the last thing that needs the collection and you want the elements themselves.",
            { list: [
              "`for x in &v` is short for `for x in v.iter()`, the method lesson 8 used on slices, and `for x in &mut v` is short for `for x in v.iter_mut()`. Lesson 18 explains what those methods return.",
              "When you need the position as well, write `for (i, x) in v.iter().enumerate()`.",
              "`for i in 0..v.len()` with `v[i]` in the body also works, and is sometimes the right tool, as the section after next shows. It checks the bounds on every access, and the three forms above do not need to.",
            ] },
            { pitfall: "Over a `Vec<i32>`, `for x in &v` makes `x` a `&i32`, not an `i32`. Arithmetic and printing reach through the reference, so `x + 1` and `println!(\"{x}\")` work and it is easy not to notice. To compare `x` with a number or to store it somewhere, take the value out with `*x`." },
            { compare: "Python and JavaScript have one kind of loop over a list. The loop variable refers to a shared object that the garbage collector keeps alive, and the list is never used up. PHP is closer to Rust: `foreach ($items as $item)` works on copies, and `foreach ($items as &$item)` changes the array in place, with the well-known trap that `$item` still refers to the last element after the loop. Rust's `&mut` borrow ends with the loop, and the trap is gone." },
          ],
        },
        {
          title: 'Elements are owned by the Vec',
          body: [
            "A `Vec<String>` owns its strings, and each string owns its text. That is two levels of ownership, and three allocations for two names.",
            { memory: {
              title: 'A `Vec<String>` holding two names',
              vars: [
                { id: 'names', type: 'Vec<String>' },
                { id: 'e0', name: 'buffer[0]', type: 'String', frame: 'heap' },
                { id: 'e1', name: 'buffer[1]', type: 'String', frame: 'heap', addr: 0x3018 },
                { id: 't0', name: 'text of [0]', type: 'u8', len: 3, frame: 'heap' },
                { id: 't1', name: 'text of [1]', type: 'u8', len: 5, frame: 'heap' },
              ],
              set: {
                names: { ptr: '&e0', len: 2, cap: 2 },
                e0: { ptr: '&t0', len: 3, cap: 3 },
                e1: { ptr: '&t1', len: 5, cap: 5 },
                t0: ["'a'", "'d'", "'a'"],
                t1: ["'g'", "'r'", "'a'", "'c'", "'e'"],
              },
              caption: "`names` owns a buffer in which two `String` values sit side by side, 24 bytes each. Each `String` owns a buffer of its own for its text. Dropping `names` drops both strings and then frees its own buffer: three allocations, released in the right order without a line of code.",
            } },
            "Now picture `let first = names[0];`. It would copy the three words of `buffer[0]` into `first`. Two `String` values would then point at the same text, and the `Vec` would not know that it had given one away. When `first` and `names` were both dropped, the text would be freed twice. For a `Vec<i32>` the same line is harmless, because an `i32` is `Copy` and owns nothing. So the rule is about ownership: indexing lends an element, and it never gives one away.",
            { run: rs`fn main() {
    let names = vec![String::from("ada"), String::from("grace")];
    let first = names[0];
    println!("{first}");
}`, name: 'move_out_of_index.rs', fails: 'E0507' },
            "The compiler offers a borrow and a clone. There are more choices than that, and which one is right depends on what should be left in the `Vec` afterward.",
            { table: {
              head: ['You want', 'Write', 'What happens to the `Vec`'],
              rows: [
                ['To look at an element', '`&names[i]` or `names.get(i)`', 'Nothing. It is a borrow'],
                ['A copy of your own', '`names[i].clone()`', 'Nothing. A second text buffer is allocated'],
                ['The last element', '`names.pop()`', 'It is one shorter. Constant time'],
                ['Element `i`, keeping the order', '`names.remove(i)`', 'Every later element shifts down by one'],
                ['Element `i`, order not needed', '`names.swap_remove(i)`', 'The last element is moved into the gap. Constant time'],
                ['Element `i`, leaving the slot in place', '`std::mem::take(&mut names[i])`', 'Slot `i` holds an empty `String`, the default value of its type'],
                ['Element `i`, with a replacement', '`std::mem::replace(&mut names[i], new)`', 'Slot `i` holds `new`'],
                ['A range of elements', '`names.drain(a..b)`', 'The range is removed, and the gap is closed once at the end'],
                ['All of them', '`for name in names`', 'It is consumed'],
              ],
            } },
            { run: rs`fn main() {
    let mut names = vec![
        String::from("ada"), String::from("grace"), String::from("linus"),
        String::from("ken"), String::from("margaret"),
    ];

    let removed = names.remove(0);                // order kept: the rest shift down
    println!("{removed} {names:?}");

    let swapped = names.swap_remove(0);           // order not kept: the last one fills the gap
    println!("{swapped} {names:?}");

    let taken = std::mem::take(&mut names[1]);    // an empty String is left in its place
    println!("{taken} {names:?}");

    let mut moved = Vec::new();
    for name in names.drain(..2) {                // moves the first two out, then closes the gap
        moved.push(name);
    }
    println!("{moved:?} {names:?}");
}`, name: 'moving_out.rs', expect: 'ada ["grace", "linus", "ken", "margaret"]\ngrace ["margaret", "linus", "ken"]\nlinus ["margaret", "", "ken"]\n["margaret", ""] ["ken"]\n' },
            "Every one of these keeps the promise the failing program broke: at each moment, each `String` has exactly one owner. `mem::take` is the `take` of lesson 13, for any type with a default value. None of the four calls copies any text.",
            "Two more operations work on the whole `Vec` in place. `retain` keeps the elements for which a closure returns true and drops the others, in one pass. The `sort` family reorders the elements.",
            { run: rs`fn main() {
    let mut scores = vec![72, 38, 91, 45, 85, 60];
    scores.retain(|score| *score >= 50);          // keep the passes
    println!("{scores:?}");

    scores.sort();                                // ascending
    println!("{scores:?}");
    scores.sort_by(|a, b| b.cmp(a));              // descending: compare b with a
    println!("{scores:?}");

    let mut words = vec!["pear", "fig", "banana", "kiwi", "apple"];
    words.sort_by_key(|word| word.len());         // by length: equal lengths keep their order
    println!("{words:?}");

    words.sort();                                 // text sorts alphabetically
    println!("{words:?} {:?}", words.binary_search(&"kiwi"));
}`, name: 'retain_and_sort.rs', expect: '[72, 91, 85, 60]\n[60, 72, 85, 91]\n[91, 85, 72, 60]\n["fig", "pear", "kiwi", "apple", "banana"]\n["apple", "banana", "fig", "kiwi", "pear"] Ok(3)\n' },
            { list: [
              "The closure given to `retain` receives a reference to each element, hence `*score`.",
              "`a.cmp(b)` compares two values and says whether the first is less, equal or greater. `sort_by` takes a closure that does that for two elements, and swapping `a` and `b` reverses the order. Lesson 15 covers the trait behind `cmp`.",
              "`sort`, `sort_by` and `sort_by_key` are **stable**: elements that compare equal stay in the order they had. That is why `pear` is still ahead of `kiwi` after the sort by length. `sort_unstable` gives up that promise for a little speed and no extra memory.",
              "`binary_search` works on a sorted slice. It returns a `Result`: `Ok(index)` when the value is found, and `Err(index)` naming the place where it would have to be inserted.",
            ] },
            { pitfall: [
              "`sort` needs a type in which any two values can be put in order. Floating-point numbers do not qualify, because `NaN` is neither less than, equal to nor greater than anything. Sorting a `Vec<f64>` with plain `sort` does not compile.",
              { run: rs`fn main() {
    let mut prices = vec![2.5, 0.99, 12.0];
    prices.sort();
    println!("{prices:?}");
}`, name: 'sort_floats.rs', fails: 'E0277' },
              "Say how to compare them: `prices.sort_by(|a, b| a.total_cmp(b))`. `total_cmp` is a comparison for floats that gives `NaN` a fixed place in the order.",
            ] },
          ],
        },
        {
          title: "Don't change it while you walk it",
          body: [
            "The first section showed a `push` moving the whole buffer. Now put that inside a loop over the same `Vec`. A `for` loop keeps a pointer into the buffer and steps it along. Here is what would happen if the compiler allowed a `push` in the middle.",
            { trace: {
              title: 'If this compiled: the loop would walk a freed buffer',
              code: rs`fn main() {
    let mut v = vec![1, 2, 3, 4];
    for x in &v {
        if *x == 2 {
            v.push(20);
        }
    }
}`,
              vars: [
                { id: 'v', type: 'Vec<i32>' },
                { id: 'x', type: '&i32' },
                { id: 'old', name: 'first buffer', type: 'i32', len: 4, frame: 'heap' },
                { id: 'new', name: 'second buffer', type: 'i32', len: 8, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { v: { ptr: '&old', len: 4, cap: 4 }, old: [1, 2, 3, 4] }, say: "`vec!` allocates exactly what it needs: four elements, in a buffer with a capacity of four. Solid arrows own and dashed arrows borrow." },
                { line: 3, set: { x: '&old[0]' }, say: "The loop borrows `v` and keeps a pointer into its buffer. On the first turn, `x` points at the 1." },
                { line: 3, set: { x: '&old[1]' }, say: "On the second turn, `x` points at the 2, so the `if` is about to run its body." },
                { line: 5, set: { v: { ptr: '&new', len: 5, cap: 8 }, new: [1, 2, 3, 4, 20] }, dead: ['old'], say: "The buffer is full, so `push` moves everything to a larger one and frees the old one. `v` knows about the move. `x` and the loop's own position do not: they still point into the freed buffer." },
                { line: 3, set: { x: '&old[2]' }, say: "The loop steps to its next element, in memory that no longer belongs to the `Vec`. It reads whatever is there now. In C++ this is called iterator invalidation, and it is a famous source of crashes and security holes. Rust rejects the program, so none of this happens." },
              ],
            } },
            "The rule that prevents it is the aliasing rule of lesson 7, with nothing added. `for x in &v` holds a shared borrow of `v` for as long as the loop runs. `push` needs a mutable borrow. The two cannot overlap.",
            { run: rs`fn main() {
    let mut v = vec![1, 2, 3, 4];
    for x in &v {
        if *x == 2 {
            v.push(20);
        }
    }
    println!("{v:?}");
}`, name: 'push_in_loop.rs', fails: 'E0502' },
            "The `help:` at the end of the message names two of the standard fixes. Which one fits depends on what the loop is trying to change.",
            { run: rs`fn main() {
    // Changing elements, not the length: borrow mutably and write through x.
    let mut v = vec![1, 2, 3, 4];
    for x in &mut v {
        *x *= 10;
    }
    println!("{v:?}");

    // Removing elements: retain does the walk and the removal together.
    v.retain(|x| *x != 20);
    println!("{v:?}");

    // Adding elements: loop over the indexes. No borrow lasts from one turn to the next.
    for i in 0..v.len() {              // the range is worked out once, before the first turn
        if v[i] > 25 {
            v.push(v[i] + 1);
        }
    }
    println!("{v:?}");

    // Or collect the changes during the loop, and apply them after it.
    let mut doubles = Vec::new();
    for x in &v {
        if x % 2 == 1 {
            doubles.push(x * 2);
        }
    }
    v.extend(doubles);
    println!("{v:?}");
}`, name: 'four_fixes.rs', expect: '[10, 20, 30, 40]\n[10, 30, 40]\n[10, 30, 40, 31, 41]\n[10, 30, 40, 31, 41, 62, 82]\n' },
            "In the index loop, `0..v.len()` is evaluated once, so the loop visits the three original elements and not the two it appends. A loop that should also process what it adds is a **worklist**, and the shape for that is `while let` with `pop`, which borrows the `Vec` only for the instant of each call.",
            { run: rs`fn main() {
    // Halve each even number until only odd ones are left.
    let mut todo = vec![12, 10];
    let mut done = Vec::new();
    while let Some(n) = todo.pop() {
        if n % 2 == 0 {
            todo.push(n / 2);          // more work, discovered while working
        } else {
            done.push(n);
        }
    }
    println!("{done:?}");
}`, name: 'worklist.rs', expect: '[5, 3]\n' },
            { pitfall: [
              "The borrow checker rules out the dangling pointer. It does not rule out getting the indexes wrong. Removing by index inside an index loop compiles, and is wrong in two ways: after `remove(i)` the next element has slid into slot `i` and is skipped, and the range was computed for the old length.",
              { run: rs`fn main() {
    let mut v = vec![1, 2, 2, 3];
    for i in 0..v.len() {
        println!("i = {i}, v = {v:?}");
        if v[i] == 2 {
            v.remove(i);
        }
    }
    println!("{v:?}");
}`, name: 'remove_in_loop.rs', panics: true, expect: 'i = 0, v = [1, 2, 2, 3]\ni = 1, v = [1, 2, 2, 3]\ni = 2, v = [1, 2, 3]\ni = 3, v = [1, 2, 3]\n' },
              "At `i = 1` the first 2 is removed and the second 2 slides into slot 1. The loop moves on to slot 2 and never looks at it. Then it asks for slot 3 of a `Vec` that now has three elements. The bounds check turns that into a panic and not a read of stray memory. `v.retain(|x| *x != 2)` is the whole loop, done correctly.",
            ] },
            { compare: "Every language has this problem and each answers it differently, at run time. Python quietly skips elements when a list shrinks under a loop, and raises `RuntimeError: dictionary changed size during iteration` for a dict. JavaScript's `for…of` with a `splice` in the body skips elements without a word. PHP's `foreach` walks a copy of the array, so the loop does not see its own changes. Rust gives one answer, when the program is compiled." },
          ],
        },
        {
          title: 'HashMap<K, V>',
          body: [
            "A `HashMap<K, V>` stores values under keys, and finds a value from its key in constant time on average. It is the `dict` of Python, the `Map` of JavaScript, and the associative array of PHP.",
            { run: rs`use std::collections::HashMap;

fn main() {
    let mut stock: HashMap<String, u32> = HashMap::new();
    stock.insert(String::from("tea"), 12);
    stock.insert(String::from("cake"), 3);

    println!("{:?} {:?}", stock.get("tea"), stock.get("scone"));   // Option<&u32>
    println!("{} {}", stock.contains_key("cake"), stock.len());

    let old = stock.insert(String::from("cake"), 5);               // replaces, and returns what was there
    println!("{old:?} {:?}", stock.get("cake"));

    if let Some(count) = stock.get_mut("tea") {                    // Option<&mut u32>
        *count -= 1;
    }
    let gone = stock.remove("cake");                               // Option<u32>: the value, moved out
    println!("{:?} {gone:?} {}", stock.get("tea"), stock.len());
}`, name: 'hashmap_basics.rs', expect: 'Some(12) None\ntrue 2\nSome(3) Some(5)\nSome(11) Some(5) 1\n' },
            "`Vec` is available everywhere, and `HashMap` has to be brought into scope with the `use` line. Lesson 22 covers `use` and the module system. Every lookup returns an `Option`, because any key may be missing. That is lesson 13 at work: there is no `KeyError`, no `undefined` and no `null`.",
            { table: {
              head: ['Method', 'Returns', 'Notes'],
              rows: [
                ['`insert(key, value)`', '`Option<V>`', 'The value that was stored under the key before, if there was one'],
                ['`get(&key)`', '`Option<&V>`', 'A reference to the value, which stays in the map'],
                ['`get_mut(&key)`', '`Option<&mut V>`', 'The value, to change in place'],
                ['`remove(&key)`', '`Option<V>`', 'The value itself, moved out of the map'],
                ['`contains_key(&key)`', '`bool`', ''],
                ['`map[&key]`', 'The value, for reading only', 'Panics if the key is missing'],
                ['`keys()`, `values()`, `for (key, value) in &map`', 'References, one entry at a time', 'In no particular order'],
              ],
            } },
            "The brackets are for a key that must be there. As with `v[i]` on a `Vec`, a miss is treated as a bug in the program.",
            { run: rs`use std::collections::HashMap;

fn main() {
    let mut stock = HashMap::new();
    stock.insert("tea", 12);
    println!("{}", stock["tea"]);
    println!("{}", stock["scone"]);
}`, name: 'missing_key.rs', panics: true, expect: '12\n' },
            "Ownership works as it does for a `Vec`. `insert` takes the key and the value by value, so both move into the map, and the map frees them when it is dropped. Lookups only borrow: `get` takes a reference to a key and returns a reference into the map. A lookup in a map with `String` keys accepts a `&str`, so there is no need to build a `String` just to ask a question.",
            { run: rs`use std::collections::HashMap;

fn main() {
    let mut ages = HashMap::new();
    let name = String::from("ada");
    ages.insert(name, 36);
    println!("{name} is {:?}", ages.get(&name));
}`, name: 'key_moved.rs', fails: 'E0382' },
            "The key now belongs to the map. If the code still needs the name, it can insert `name.clone()`, or use `&str` keys that borrow text owned elsewhere, in which case the map cannot outlive that text. A reference returned by `get` borrows the whole map, for the reason a reference into a `Vec` borrows the whole `Vec`: an `insert` may rebuild the table and move every entry.",
            { pitfall: [
              "In Python, PHP and JavaScript, `stock[\"cake\"] = 3` adds an entry. In Rust the brackets on a map only read.",
              { run: rs`use std::collections::HashMap;

fn main() {
    let mut stock = HashMap::new();
    stock.insert("tea", 12);
    stock["cake"] = 3;
    println!("{stock:?}");
}`, name: 'index_assign.rs', fails: 'E0594' },
              "The reason is that the brackets must produce a place that already holds a value, and a missing key has none. Use `insert`, or the entry API in the next section.",
            ] },
            "A `HashMap` has no order. Run this a few times and watch the lines change places.",
            { run: rs`use std::collections::HashMap;

fn main() {
    let mut stock = HashMap::new();
    for (item, count) in [("tea", 12), ("cake", 3), ("scone", 0), ("jam", 7), ("milk", 2)] {
        stock.insert(item, count);
    }
    for (item, count) in &stock {
        println!("{item}: {count}");
    }
}`, name: 'no_order.rs', varies: true },
            "The order is not the order of insertion and not the order of the keys, and it differs from one run of the same program to the next. Every `HashMap` picks a random seed for its hash function when it is created. This is a defense. A server that puts request fields into a map with a predictable hash can be stalled by a request whose keys were chosen to collide. With a random seed, an attacker cannot know which keys those are.",
            "When output has to be the same every time, sort the keys, or use a `BTreeMap`, which keeps its keys in order at all times.",
            { run: rs`use std::collections::{BTreeMap, HashMap};

fn main() {
    let pairs = [("tea", 12), ("cake", 3), ("scone", 0), ("jam", 7)];

    let mut stock = HashMap::new();
    for (item, count) in pairs {
        stock.insert(item, count);
    }
    // Copy the keys into a Vec, sort it, then look each key up.
    let mut items = Vec::new();
    for item in stock.keys() {
        items.push(*item);
    }
    items.sort();
    for item in &items {
        print!("{item}={} ", stock[item]);
    }
    println!();

    // Or use a map that is always in key order.
    let mut sorted = BTreeMap::new();
    for (item, count) in pairs {
        sorted.insert(item, count);
    }
    println!("{sorted:?}");
}`, name: 'sorted_output.rs', expect: 'cake=3 jam=7 scone=0 tea=12 \n{"cake": 3, "jam": 7, "scone": 0, "tea": 12}\n' },
            { compare: "A Python `dict` and a JavaScript `Map` keep their entries in insertion order, and a PHP array is an ordered map by design. Code in those languages comes to rely on it without anyone deciding to. `HashMap` promises no order and makes the lack of one impossible to miss. For keys in sorted order, use `BTreeMap`. For insertion order, keep a `Vec` of the keys beside the map, or use the `indexmap` crate." },
            { aside: "A key type has to support two things: comparing for equality, and hashing. Integers, `bool`, `char`, `String`, `&str` and tuples of those all do, and `#[derive(PartialEq, Eq, Hash)]` gives both to a type of your own. `f64` does not, because of `NaN` again. Lesson 15 explains the traits involved. Underneath, the table is one flat allocation, like a `Vec`, and it too is rebuilt at a larger size as it fills." },
          ],
        },
        {
          title: 'The entry API',
          body: [
            "Counting things is the classic job for a map. For each word: if it has a count, add one to it, and if it has none, store a count of 1. With the methods so far, that reads:",
            { code: rs`if counts.contains_key(word) {
    *counts.get_mut(word).unwrap() += 1;      // a second lookup, and an unwrap
} else {
    counts.insert(word, 1);                   // a second lookup here as well
}` },
            "It works. It also hashes the key and searches the table twice on every word, and it contains an `unwrap` that is safe only because of the line above it. `entry` does the job with one lookup. It returns the slot for a key, whether or not that slot is filled, and lets you say what to do in each case.",
            { run: rs`use std::collections::HashMap;

fn main() {
    let text = "the cat saw the dog and the dog saw the cat";

    let mut counts: HashMap<&str, u32> = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word).or_insert(0) += 1;
    }

    // Into a Vec of pairs, sorted, so that the output is the same on every run.
    let mut pairs = Vec::new();
    for (word, count) in &counts {
        pairs.push((*word, *count));
    }
    pairs.sort();
    println!("{pairs:?}");
}`, name: 'count_words.rs', expect: '[("and", 1), ("cat", 2), ("dog", 2), ("saw", 2), ("the", 4)]\n' },
            "Read `counts.entry(word).or_insert(0)` from left to right. `entry(word)` finds the slot for `word`. `or_insert(0)` puts a 0 in it if it was empty. Either way it returns a `&mut u32` to the count inside the map, and `*… += 1` adds one through that reference.",
            { table: {
              head: ['Write', 'If the key is missing', 'What you get back'],
              rows: [
                ['`entry(key).or_insert(value)`', 'Stores `value`', 'A `&mut V` to the value in the map, new or old'],
                ['`entry(key).or_insert_with(f)`', 'Calls `f` and stores what it returns', 'The same. `f` runs only when it is needed'],
                ['`entry(key).or_default()`', "Stores the type's default value: `0`, an empty `String`, an empty `Vec`", 'The same'],
                ['`entry(key).and_modify(f).or_insert(value)`', 'Stores `value`', 'The same. When the key is present, `f` is applied to its value'],
              ],
            } },
            { run: rs`use std::collections::HashMap;

fn main() {
    let results = [("red", 3), ("blue", 5), ("red", 4), ("green", 1), ("blue", 2)];

    // or_default: an empty Vec for a team seen for the first time.
    let mut by_team: HashMap<&str, Vec<u32>> = HashMap::new();
    for (team, points) in results {
        by_team.entry(team).or_default().push(points);
    }
    println!("{:?} {:?} {:?}", by_team["red"], by_team["blue"], by_team.get("pink"));

    // and_modify: one action for a key that is there, another for one that is not.
    let mut best: HashMap<&str, u32> = HashMap::new();
    for (team, points) in results {
        best.entry(team)
            .and_modify(|top| *top = (*top).max(points))
            .or_insert(points);
    }
    println!("{} {} {}", best["red"], best["blue"], best["green"]);
}`, name: 'grouping.rs', expect: '[3, 4] [5, 2] None\n4 5 1\n' },
            { compare: "Each language grew its own collection of idioms for this. Python has `counts[word] = counts.get(word, 0) + 1`, then `setdefault`, `defaultdict(list)` and `Counter`. PHP has `$counts[$word] = ($counts[$word] ?? 0) + 1`, and `$groups[$key][] = $value`, which creates the inner array on the way. JavaScript has `map.set(key, (map.get(key) ?? 0) + 1)`. `entry` is one tool that covers all of them, with a single lookup." },
            { pitfall: "`entry` takes the key by value, because it may have to store it. With `String` keys that means building a `String` for every call, `counts.entry(word.to_string())`, even when the key is already in the map and the new `String` is thrown away at once. That is usually fine. In a loop that runs millions of times, try `get_mut` with the borrowed key first, and build the `String` only when that returns `None`." },
          ],
        },
        {
          title: 'Choosing a collection',
          body: [
            "The standard library has eight collections. Two of them do nearly all the work.",
            { table: {
              head: ['Collection', 'It is', 'Use it when'],
              rows: [
                ['`Vec<T>`', 'A growable array', 'Almost always. Order matters, you reach elements by position, and you add at the end'],
                ['`HashMap<K, V>`', 'A hash table', 'You look values up by key, and order does not matter'],
                ['`HashSet<T>`', 'A `HashMap` with keys and no values', 'You only ask whether something is present, or you want each value once'],
                ['`BTreeMap<K, V>`, `BTreeSet<T>`', 'Sorted trees', 'You need the keys in order, or everything between two keys'],
                ['`VecDeque<T>`', 'A ring buffer', 'You add and remove at both ends: a queue'],
                ['`BinaryHeap<T>`', 'A priority queue', 'You always want the largest item next'],
                ['`String`', 'A `Vec<u8>` that is always valid UTF-8', 'Text, as in lesson 9'],
              ],
            } },
            { run: rs`use std::collections::{BTreeSet, HashSet, VecDeque};

fn main() {
    // A set: insert says whether the value was new.
    let mut seen = HashSet::new();
    let mut repeats = Vec::new();
    for n in [3, 7, 3, 9, 7, 3] {
        if !seen.insert(n) {
            repeats.push(n);
        }
    }
    println!("{repeats:?} {}", seen.len());

    // A queue: cheap at both ends.
    let mut queue = VecDeque::new();
    queue.push_back("first");
    queue.push_back("second");
    queue.push_front("urgent");
    println!("{:?} {:?}", queue.pop_front(), queue.pop_front());

    // A sorted set: each value once, and in order.
    let mut ordered = BTreeSet::new();
    for word in ["pear", "fig", "apple", "fig"] {
        ordered.insert(word);
    }
    println!("{ordered:?}");
}`, name: 'other_collections.rs', expect: '[3, 7, 3] 3\nSome("urgent") Some("first")\n{"apple", "fig", "pear"}\n' },
            "They all follow the rules of this lesson. A collection owns what is put into it, lends its contents out through references, returns an `Option` wherever an element may be missing, and cannot change shape while a borrow of it is alive.",
            { tip: "When in doubt, use a `Vec`. Its elements are next to each other in memory, which processors are very good at, so for a few dozen elements a linear search through a `Vec` is often faster than a lookup in a `HashMap`. The eighth collection, `LinkedList`, is almost never the right choice for the opposite reason: every element is a separate allocation somewhere else. Lesson 21 builds a linked list anyway, because it is the classic test of ownership." },
            { native: "The documentation of the `std::collections` module opens with a guide called \"When should you use which collection?\", with the cost of every operation in a table. `rustup doc --std` opens the standard library's documentation in a browser, offline." },
          ],
        },
      ],
      takeaways: [
        "A `Vec<T>` is a pointer, a length and a capacity. `push` is cheap until the capacity runs out, and then the whole buffer moves.",
        "`for x in &v` lends each element, `for x in &mut v` lends it for writing, and `for x in v` hands the elements over and uses up the `Vec`.",
        "A collection owns its elements. Indexing lends one. To move one out, remove it with `pop`, `remove`, `swap_remove` or `drain`, or leave something in its place with `mem::take`.",
        "A collection cannot change shape while a loop borrows it. Use `&mut` to change elements, `retain` to remove them, and an index loop, a second list or a worklist to add them.",
        "`HashMap::insert` moves the key and the value in. `get` returns an `Option<&V>`. The iteration order is unspecified and changes from run to run, so sort before printing.",
        "`map.entry(key)` is the slot for a key, filled or not. `or_insert` and `or_default` fill it if needed and return a `&mut` to the value.",
        "Start with `Vec`, and move to `HashMap`, `HashSet`, `BTreeMap` or `VecDeque` when the way you reach the elements asks for it.",
      ],
      quiz: [
        {
          q: 'What are the types of `a`, `b` and `c` in these three loops?',
          code: rs`let mut words: Vec<String> = vec![String::from("fig"), String::from("pear")];

for a in &words { /* ... */ }
for b in &mut words { /* ... */ }
for c in words { /* ... */ }`,
          options: [
            { t: '`&String`, `&mut String` and `String`', ok: true, why: "A loop over a shared borrow lends each element, a loop over a mutable borrow lends it for writing, and a loop over the `Vec` itself hands each element over." },
            { t: '`String` in all three', why: "That is how Python and JavaScript see a loop: one kind of loop variable. In Rust, what follows `in` decides whether the loop borrows the elements or takes them." },
            { t: '`&String`, `&mut String` and `&String`', why: "The third loop does not borrow. It moves each `String` out, which is why `words` cannot be used after it." },
            { t: '`&Vec<String>`, `&mut Vec<String>` and `Vec<String>`', why: "Those are the types of the expressions after `in`. The loop variable is one element, not the collection." },
          ],
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let mut scores = vec![72, 85, 91];
    let first = scores[0];
    scores.push(60);
    println!("{first} {}", scores.len());
}`,
          options: [
            { t: 'Yes, and it prints `72 4`', ok: true, why: "`scores[0]` is an `i32`, which is `Copy`. `first` is a number of its own and not a reference into the buffer, so no borrow is alive when `push` runs." },
            { t: 'No: `first` borrows from `scores`, and `push` needs a mutable borrow', why: "That would be true of `let first = &scores[0];`. Without the `&`, the number is copied out and the `Vec` is free again at the end of the line." },
            { t: 'No: an element cannot be moved out of a `Vec` by indexing', why: "It cannot be moved, but an `i32` is copied, and a copy leaves the original in place. The rule bites for types that own something, such as `String`." },
            { t: 'Yes, but `first` may be garbage after `push` moves the buffer', why: "That is the danger with a pointer into the buffer in C or C++. `first` is a copy of the value on the stack, and no reference to an element could have survived the `push` anyway." },
          ],
          verify: 'compiles',
        },
        {
          q: 'The same program with names in place of numbers. Does it compile?',
          code: rs`fn main() {
    let mut names = vec![String::from("ada"), String::from("grace")];
    let first = names[0];
    names.push(String::from("linus"));
    println!("{first} {}", names.len());
}`,
          options: [
            { t: 'No: `names[0]` would move a `String` out of the `Vec`', ok: true, why: "A `String` is not `Copy`, so `let first = names[0];` is a move, and the `Vec` would be left owning a string it had given away. The compiler reports `E0507`. Use `&names[0]`, `names[0].clone()`, or one of the removing methods." },
            { t: 'Yes, and it prints `ada 3`', why: "It would if `String` were copied on assignment, as an `i32` is. A `String` moves, and indexing may only lend." },
            { t: 'Yes: `first` takes the string, and `names[0]` is left empty', why: "That is what `std::mem::take(&mut names[0])` does when you ask for it. Plain indexing never changes the `Vec`." },
            { t: 'No: the `push` on line 4 conflicts with the borrow held by `first`', why: "There is no borrow, since there is no `&`. With `let first = &names[0];` this would be the right answer, and the error would be `E0502`." },
          ],
          verify: 'E0507',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let mut numbers = vec![15, 8, 22, 4, 31, 12, 9];
    numbers.retain(|n| n % 2 == 0 || *n > 20);
    numbers.sort_by_key(|n| n % 10);
    println!("{numbers:?}");
}`,
          answer: '[31, 22, 12, 4, 8]',
          explain: "`retain` keeps the even numbers and anything above 20, in their original order: 8, 22, 4, 31, 12. The sort key is the last digit: 8, 2, 4, 1, 2. The sort is stable, so 22 stays ahead of 12, which has the same key.",
          hint: "First cross out what `retain` drops. Then write the last digit under each survivor, and remember that equal keys keep their order.",
        },
        {
          q: 'What is the type of `found`?',
          code: rs`let mut stock: HashMap<String, u32> = HashMap::new();
stock.insert(String::from("tea"), 12);

let found = stock.get("tea");`,
          options: [
            { t: '`Option<&u32>`', ok: true, why: "The key may be missing, hence the `Option`. The value stays in the map, hence the reference. `stock.get(\"tea\").copied()` turns it into an `Option<u32>` when the value is `Copy`." },
            { t: '`u32`', why: "Then a missing key would have to raise an error, as in Python, or produce a made-up value. The brackets, `stock[\"tea\"]`, do give the value directly, and panic when the key is missing." },
            { t: '`Option<u32>`', why: "`get` only lends. It has one signature for every value type, and it could not hand out a `String` or a `Vec` without moving it out of the map. `remove` is the method that returns an `Option<V>`." },
            { t: '`&u32`, which is null when the key is missing', why: "A reference is never null in Rust. A missing value is `None`, and the type says so." },
          ],
        },
        {
          q: 'A program puts the same five entries into a `HashMap` every time it runs, and prints them with a `for` loop. The lines come out in a different order on each run. Why?',
          options: [
            { t: 'Each `HashMap` hashes its keys with a random seed chosen when it is created, and a loop follows the layout of the table', ok: true, why: "The seed stops an attacker from choosing keys that all collide. A side effect is that the order means nothing and is not even repeatable. Sort the keys, or use a `BTreeMap`, when the order matters." },
            { t: 'It is a bug in the program: a `HashMap` keeps its entries in insertion order', why: "That is a Python `dict`, a JavaScript `Map` or a PHP array. A `HashMap` promises no order of any kind." },
            { t: 'The entries are kept in order of their keys, and the keys land at different addresses on each run', why: "Keys in sorted order is what a `BTreeMap` gives. A `HashMap` hashes what a key contains, not where it is stored." },
            { t: 'The `for` loop visits the entries on several threads', why: "A `for` loop runs on the thread it is written in, one entry at a time. Nothing in this program is concurrent." },
          ],
        },
        {
          q: 'What does `*counts.entry(word).or_insert(0) += 1;` gain over testing `contains_key` and then calling `get_mut` or `insert`?',
          options: [
            { t: 'It finds the slot for the key once, then fills it or updates it through the `&mut` it returns', ok: true, why: "The other version hashes the key and searches the table twice, and needs an `unwrap` that is correct only because of the test before it. `entry` has one lookup and no case left unhandled." },
            { t: 'It avoids the panic that `get_mut` causes when the key is missing', why: "`get_mut` does not panic. It returns `None` for a missing key. The brackets, `counts[word]`, are what panic." },
            { t: 'It lets the map be changed while a `for` loop is walking over it', why: "Nothing does that. The loop in the lesson walks over the words of a text, not over the map it is filling." },
            { t: 'It keeps the keys in the order in which they were first seen', why: "A `HashMap` has no order however its entries are inserted." },
          ],
        },
      ],
      challenges: [
        {
          id: 'evens-only',
          title: 'Keep the even numbers',
          level: 'warm-up',
          prompt: "Return a new `Vec` holding the even numbers of the slice, in the order they appear. The slice itself is only borrowed and stays as it is.",
          signature: 'fn evens_only(values: &[i32]) -> Vec<i32>',
          starter: rs`fn evens_only(values: &[i32]) -> Vec<i32> {
    let mut evens = Vec::new();
    for value in values {
        // value is a &i32 here. Push the number when it is even.
    }
    evens
}`,
          hints: [
            "`value % 2 == 0` works through the reference. Negative even numbers and zero pass the test as well.",
            "The `Vec` holds `i32` values, not references, so push `*value`.",
          ],
          solution: rs`fn evens_only(values: &[i32]) -> Vec<i32> {
    let mut evens = Vec::new();
    for value in values {
        if value % 2 == 0 {
            evens.push(*value);
        }
    }
    evens
}`,
          tests: [
            { label: 'Keeps the even numbers in order', body: rs`assert_eq!(evens_only(&[5, 2, 8, 3, 4]), [2, 8, 4]);` },
            { label: 'Returns an empty Vec when every number is odd', body: rs`assert_eq!(evens_only(&[1, 3, 5]), []);` },
            { label: 'Returns an empty Vec for an empty slice', body: rs`assert_eq!(evens_only(&[]), []);` },
            { label: 'Counts zero and negative numbers as even', body: rs`assert_eq!(evens_only(&[-4, -3, 0, 7]), [-4, 0]);` },
            { label: 'Keeps repeated values', body: rs`assert_eq!(evens_only(&[6, 6, 1, 6]), [6, 6, 6]);` },
          ],
        },
        {
          id: 'word-count',
          title: 'Count the words',
          level: 'core',
          prompt: [
            "Count how often each word occurs in a text. Words are separated by whitespace, and capitals do not matter: `The` and `the` are the same word, stored as `the`.",
            "`text.split_whitespace()` gives the words one at a time as `&str`, and `word.to_lowercase()` returns a new `String` in lower case. The starter stores a 1 for every word it meets and never counts further.",
          ],
          signature: 'fn word_count(text: &str) -> HashMap<String, usize>',
          starter: rs`use std::collections::HashMap;

fn word_count(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        counts.insert(word.to_string(), 1);
    }
    counts
}`,
          hints: [
            "`insert` replaces whatever was stored under the key. What you need is the slot for the key, filled or not: `counts.entry(key)`.",
            "`counts.entry(key).or_insert(0)` returns a `&mut usize` to the count in the map. Add one through it with `*… += 1`.",
            "`*counts.entry(word.to_lowercase()).or_insert(0) += 1;`",
          ],
          solution: rs`use std::collections::HashMap;

fn word_count(text: &str) -> HashMap<String, usize> {
    let mut counts = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word.to_lowercase()).or_insert(0) += 1;
    }
    counts
}`,
          tests: [
            { label: 'Counts each distinct word', body: rs`let counts = word_count("the cat and the hat");
assert_eq!(counts.get("the"), Some(&2));
assert_eq!(counts.get("cat"), Some(&1));
assert_eq!(counts.len(), 4);` },
            { label: 'Has no entry for a word that is not in the text', body: rs`let counts = word_count("the cat and the hat");
assert_eq!(counts.get("dog"), None);` },
            { label: 'An empty text has no words', body: rs`assert!(word_count("").is_empty());
assert!(word_count("   ").is_empty());` },
            { label: 'Treats capitals and small letters as one word', body: rs`let counts = word_count("The the THE");
assert_eq!(counts.get("the"), Some(&3));
assert_eq!(counts.len(), 1);` },
            { label: 'Splits on tabs, newlines and repeated spaces', body: rs`let counts = word_count("a\tb\n a   b a");
assert_eq!(counts.get("a"), Some(&3));
assert_eq!(counts.get("b"), Some(&2));
assert_eq!(counts.len(), 2);` },
          ],
        },
        {
          id: 'remove-negatives',
          title: 'Remove the negatives, in place',
          level: 'core',
          track: true,
          prompt: [
            "Remove every negative number from the `Vec` and keep the others in their order.",
            "Do it in place. These tests are allocation-checked, and one of them fails if the function allocates at all. The starter gives the right answer by building a second `Vec` and swapping it in, which is exactly what that test objects to.",
          ],
          signature: 'fn remove_negatives(values: &mut Vec<i32>)',
          starter: rs`fn remove_negatives(values: &mut Vec<i32>) {
    let mut kept = Vec::new();
    for value in values.iter() {
        if *value >= 0 {
            kept.push(*value);
        }
    }
    *values = kept;
}`,
          hints: [
            "The `Vec` already has a buffer large enough for the answer. The work is to slide the numbers you keep toward the front of it and then shorten the `Vec`.",
            "One method does both steps: `retain` keeps the elements for which its closure returns true.",
            "`values.retain(|value| *value >= 0);`",
          ],
          solution: rs`fn remove_negatives(values: &mut Vec<i32>) {
    values.retain(|value| *value >= 0);
}`,
          solutionNote: "By hand it takes two indexes: read every element, copy each one you keep to `values[write]`, add one to `write`, and finish with `values.truncate(write)`. That is what `retain` does inside.",
          tests: [
            { label: 'Removes the negative numbers and keeps the order', body: rs`let mut values = vec![3, -1, 4, -1, -5, 9];
remove_negatives(&mut values);
assert_eq!(values, [3, 4, 9]);` },
            { label: 'Keeps zero', body: rs`let mut values = vec![-2, 0, 2];
remove_negatives(&mut values);
assert_eq!(values, [0, 2]);` },
            { label: 'Leaves a Vec with no negatives as it is', body: rs`let mut values = vec![1, 2, 3];
remove_negatives(&mut values);
assert_eq!(values, [1, 2, 3]);` },
            { label: 'Can remove everything', body: rs`let mut values = vec![-1, -2, -3];
remove_negatives(&mut values);
assert!(values.is_empty());
let mut nothing: Vec<i32> = Vec::new();
remove_negatives(&mut nothing);
assert!(nothing.is_empty());` },
            { label: 'Works in the buffer it was given, without allocating', body: rs`let mut values = vec![5, -3, 8, -1, 0, -7];
let buffer = values.as_ptr();
let before = allocation_count();
remove_negatives(&mut values);
assert_eq!(allocation_count() - before, 0, "remove_negatives should not allocate");
assert_eq!(values, [5, 8, 0]);
assert_eq!(values.as_ptr(), buffer, "the Vec should still use the buffer it had");` },
          ],
        },
        {
          id: 'mutate-while-iterating',
          title: 'Change a Vec during a loop',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          forbid: ['clone', 'to_vec', 'to_owned'],
          prompt: [
            "Both functions change a `Vec` inside a loop over that same `Vec`, and the compiler rejects both. Read the two errors, then rewrite each loop so that the `Vec` is not borrowed by the loop while it changes.",
            "Copying the whole `Vec` and looping over the copy would work, and is not allowed here. One of the tests is there to catch the bug that removing by index introduces.",
          ],
          signature: 'fn echo_evens(values: &mut Vec<i32>)\nfn drop_empty(words: &mut Vec<String>)',
          starter: rs`/// Appends a copy of every even number to the end, in order:
/// [1, 2, 4] becomes [1, 2, 4, 2, 4].
fn echo_evens(values: &mut Vec<i32>) {
    for value in values.iter() {
        if value % 2 == 0 {
            values.push(*value);
        }
    }
}

/// Removes every empty string.
fn drop_empty(words: &mut Vec<String>) {
    for (index, word) in words.iter().enumerate() {
        if word.is_empty() {
            words.remove(index);
        }
    }
}`,
          hints: [
            "Both errors are `E0502`: the loop holds a shared borrow of the `Vec`, and `push` and `remove` need a mutable one. The last line of the message suggests two ways out.",
            "For `echo_evens`, loop over the indexes: `for index in 0..values.len()`. The range is worked out once, so the numbers you append are not visited again. `values[index]` copies an `i32` out, and no borrow outlives that expression.",
            "For `drop_empty`, do not remove by index at all. `words.retain(|word| !word.is_empty());` is the whole function.",
          ],
          solution: rs`/// Appends a copy of every even number to the end, in order:
/// [1, 2, 4] becomes [1, 2, 4, 2, 4].
fn echo_evens(values: &mut Vec<i32>) {
    for index in 0..values.len() {
        if values[index] % 2 == 0 {
            values.push(values[index]);
        }
    }
}

/// Removes every empty string.
fn drop_empty(words: &mut Vec<String>) {
    words.retain(|word| !word.is_empty());
}`,
          tests: [
            { label: 'Appends the even numbers in order', body: rs`let mut values = vec![1, 2, 4];
echo_evens(&mut values);
assert_eq!(values, [1, 2, 4, 2, 4]);` },
            { label: 'Does not echo the numbers it has just appended', body: rs`let mut values = vec![6];
echo_evens(&mut values);
assert_eq!(values, [6, 6]);` },
            { label: 'Leaves a Vec with no even numbers alone', body: rs`let mut values = vec![1, 3];
echo_evens(&mut values);
assert_eq!(values, [1, 3]);
let mut nothing: Vec<i32> = Vec::new();
echo_evens(&mut nothing);
assert!(nothing.is_empty());` },
            { label: 'Removes an empty string', body: rs`let mut words = vec![String::from("a"), String::new(), String::from("b")];
drop_empty(&mut words);
assert_eq!(words, ["a", "b"]);` },
            { label: 'Removes empty strings that are next to each other', body: rs`let mut words = vec![String::new(), String::new(), String::from("x"), String::new(), String::new()];
drop_empty(&mut words);
assert_eq!(words, ["x"]);` },
            { label: 'Can remove everything, and leaves full strings alone', body: rs`let mut words = vec![String::new(), String::new()];
drop_empty(&mut words);
assert!(words.is_empty());
let mut full = vec![String::from("no"), String::from("gaps")];
drop_empty(&mut full);
assert_eq!(full, ["no", "gaps"]);` },
          ],
        },
        {
          id: 'group-by-first-letter',
          title: 'Group words by their first letter',
          level: 'core',
          track: true,
          prompt: [
            "Sort a list of words into groups by first character. The result maps each character to the words that start with it, in the order they came. A word that is empty has no first character and is left out. Capitals are not special: `Apple` goes under `A` and `apple` under `a`.",
            "The function is given the `Vec` by value, so it owns every `String` in it. Move each one into its group. The tests are allocation-checked: they compare the buffers of the strings before and after, and they count allocations, so a solution that copies the text fails.",
            "`word.chars().next()` is the first character of a word, as an `Option<char>`.",
          ],
          signature: 'fn group_by_first_letter(words: Vec<String>) -> HashMap<char, Vec<String>>',
          starter: rs`use std::collections::HashMap;

fn group_by_first_letter(words: Vec<String>) -> HashMap<char, Vec<String>> {
    let mut groups = HashMap::new();
    for word in words {
        // word is a String that this loop owns. Find its first character,
        // then move the word into the group for that character.
    }
    groups
}`,
          hints: [
            "`for word in words` already hands you each `String` by value. `if let Some(letter) = word.chars().next()` gets the first character, and the borrow it needs ends on that line. `letter` is a `char`, which is `Copy`.",
            "`groups.entry(letter).or_default()` is a `&mut Vec<String>`: the group for that letter, created empty if it was not there.",
            "`groups.entry(letter).or_default().push(word);` moves the word in. There is no `&` and no `clone` anywhere.",
          ],
          solution: rs`use std::collections::HashMap;

fn group_by_first_letter(words: Vec<String>) -> HashMap<char, Vec<String>> {
    let mut groups: HashMap<char, Vec<String>> = HashMap::new();
    for word in words {
        if let Some(letter) = word.chars().next() {
            groups.entry(letter).or_default().push(word);
        }
    }
    groups
}`,
          tests: [
            { label: 'Groups words under their first character, in order', body: rs`let words = vec![String::from("apple"), String::from("bean"), String::from("avocado"), String::from("beet")];
let groups = group_by_first_letter(words);
assert_eq!(groups.len(), 2);
assert_eq!(groups[&'a'], ["apple", "avocado"]);
assert_eq!(groups[&'b'], ["bean", "beet"]);` },
            { label: 'An empty list gives an empty map', body: rs`assert!(group_by_first_letter(Vec::new()).is_empty());` },
            { label: 'Leaves out empty words', body: rs`let words = vec![String::new(), String::from("kiwi"), String::new()];
let groups = group_by_first_letter(words);
assert_eq!(groups.len(), 1);
assert_eq!(groups[&'k'], ["kiwi"]);` },
            { label: 'Uses the first character as it is: capitals and accents count', body: rs`let words = vec![String::from("Apple"), String::from("apple"), String::from("éclair")];
let groups = group_by_first_letter(words);
assert_eq!(groups.len(), 3);
assert_eq!(groups[&'A'], ["Apple"]);
assert_eq!(groups[&'é'], ["éclair"]);` },
            { label: 'Hands over the same strings, not copies of them', body: rs`let words = vec![String::from("apricot"), String::from("blackberry"), String::from("almond")];
let buffers = [words[0].as_ptr(), words[1].as_ptr(), words[2].as_ptr()];
let groups = group_by_first_letter(words);
assert_eq!(groups[&'a'][0].as_ptr(), buffers[0], "apricot should be the String that was passed in");
assert_eq!(groups[&'b'][0].as_ptr(), buffers[1], "blackberry should be the String that was passed in");
assert_eq!(groups[&'a'][1].as_ptr(), buffers[2], "almond should be the String that was passed in");` },
            { label: 'Allocates for the map and the groups only, not once per word', body: rs`let mut words = Vec::new();
for word in ["apple", "avocado", "apricot", "almond", "banana", "blueberry", "blackberry", "bilberry"] {
    words.push(String::from(word));
}
let before = allocation_count();
let groups = group_by_first_letter(words);
let made = allocation_count() - before;
assert_eq!(groups[&'a'].len() + groups[&'b'].len(), 8);
assert!(made < 8, "grouping 8 words into 2 groups made {made} allocations: move the strings, do not copy them");` },
          ],
        },
        {
          id: 'top-k-words',
          title: 'The most frequent words',
          level: 'stretch',
          prompt: [
            "Return the `k` most frequent words of a text with their counts, the most frequent first. Words are separated by whitespace and counted in lower case, as in the word count challenge.",
            { list: [
              "Words with the same count come in alphabetical order. Without that rule the answer would depend on the order of a `HashMap`, and would change from run to run.",
              "If the text has fewer than `k` distinct words, return all of them.",
            ] },
            "Count with a `HashMap`, move the pairs into a `Vec`, sort it, and cut it to length. A pair is a tuple, and tuples compare field by field, so `pairs.sort()` on a `Vec<(String, usize)>` sorts by word.",
          ],
          signature: 'fn top_k_words(text: &str, k: usize) -> Vec<(String, usize)>',
          starter: rs`use std::collections::HashMap;

fn top_k_words(text: &str, k: usize) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    // 1. Count the words, in lower case.
    // 2. Move the (word, count) pairs into a Vec.
    // 3. Sort: the highest count first, and alphabetically among equal counts.
    // 4. Keep the first k.
    Vec::new()
}`,
          hints: [
            "`for (word, count) in counts` consumes the map and hands over each pair by value, so `pairs.push((word, count))` moves the `String` without copying it.",
            "Sorting by two rules can be done as two sorts, because `sort_by` is stable. Sort alphabetically first, with `pairs.sort()`. Then sort by count, highest first: pairs with equal counts keep their alphabetical order.",
            "`pairs.sort_by(|a, b| b.1.cmp(&a.1));` puts the highest count first, where `.1` is the second field of a pair. Then `pairs.truncate(k);` keeps at most `k`.",
          ],
          solution: rs`use std::collections::HashMap;

fn top_k_words(text: &str, k: usize) -> Vec<(String, usize)> {
    let mut counts: HashMap<String, usize> = HashMap::new();
    for word in text.split_whitespace() {
        *counts.entry(word.to_lowercase()).or_insert(0) += 1;
    }

    let mut pairs = Vec::new();
    for (word, count) in counts {
        pairs.push((word, count));
    }
    pairs.sort();                              // alphabetical: tuples compare field by field
    pairs.sort_by(|a, b| b.1.cmp(&a.1));       // highest count first; a stable sort keeps ties alphabetical
    pairs.truncate(k);
    pairs
}`,
          solutionNote: "One sort can apply both rules: `pairs.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)))`. `then_with` consults the second comparison only when the first says the two are equal.",
          tests: [
            { label: 'Orders by count, highest first', body: rs`let top = top_k_words("b a b c b a", 3);
assert_eq!(top, [(String::from("b"), 3), (String::from("a"), 2), (String::from("c"), 1)]);` },
            { label: 'Puts words with equal counts in alphabetical order', body: rs`let top = top_k_words("pear fig apple fig pear kiwi", 4);
assert_eq!(top, [(String::from("fig"), 2), (String::from("pear"), 2), (String::from("apple"), 1), (String::from("kiwi"), 1)]);` },
            { label: 'Returns at most k words', body: rs`let top = top_k_words("pear fig apple fig pear kiwi", 1);
assert_eq!(top, [(String::from("fig"), 2)]);
assert!(top_k_words("pear fig", 0).is_empty());` },
            { label: 'Returns every word when k is larger than the number of words', body: rs`let top = top_k_words("tea cake tea", 10);
assert_eq!(top, [(String::from("tea"), 2), (String::from("cake"), 1)]);` },
            { label: 'Counts in lower case', body: rs`let top = top_k_words("The cat the CAT THE", 2);
assert_eq!(top, [(String::from("the"), 3), (String::from("cat"), 2)]);` },
            { label: 'An empty text has no words', body: rs`assert!(top_k_words("", 3).is_empty());` },
          ],
        },
      ],
    },
  );
})();
