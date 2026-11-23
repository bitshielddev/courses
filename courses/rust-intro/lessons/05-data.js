// Part 4: Data (first half). Structs with their methods, then enums and the patterns that take them apart.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 4 · Data';

  (window.C_LESSONS ||= []).push(
    {
      id: 'structs',
      title: 'Structs & methods',
      category: part,
      minutes: 35,
      summary: 'How to define your own types, attach functions to them, and say in each method\'s signature whether it reads the value, changes it or uses it up.',
      topics: ['struct', 'derive', 'Partial moves', 'impl and methods', 'Receivers', 'Newtypes', 'Field borrows', 'Layout'],
      sections: [
        {
          title: 'Defining and creating a struct',
          body: [
            "A **struct** is a type you define by naming its fields and their types. A value of that type always has every field, and each field always holds a value of its declared type.",
            { run: rs`struct User {
    name: String,
    age: u32,
    active: bool,
}

fn main() {
    let name = String::from("Ada");
    let mut user = User {
        name,                      // short for name: name
        age: 36,
        active: true,
    };

    user.age += 1;                 // fields are reached with a dot
    println!("{} is {}, active: {}", user.name, user.age, user.active);
}`, name: 'define.rs', expect: 'Ada is 37, active: true\n' },
            { list: [
              "Type names are written in `UpperCamelCase` and field names in `snake_case`.",
              "The fields can be given in any order. When a variable has the same name as a field, `name` alone is short for `name: name`.",
              "Mutability belongs to the variable, not to a field. `let mut user` makes every field assignable, and there is no way to mark one field as changeable or as read-only.",
            ] },
            "No constructor runs, and a field you leave out gets no default value. Creating a struct means giving every field. Leave one out and no program is built:",
            { run: rs`struct User {
    name: String,
    age: u32,
    active: bool,
}

fn main() {
    let user = User { name: String::from("Ada"), age: 36 };
    println!("{} {} {}", user.name, user.age, user.active);
}`, name: 'missing_field.rs', fails: 'E0063' },
            { compare: "A struct is closest to a Python `@dataclass`, a PHP class that has only typed properties, or a TypeScript `interface` for a plain object. The differences are in what it rules out. You cannot add a field to one value while the program runs, as you can with a Python or JavaScript object. No field can be `null`, `None` or `undefined` unless its type says so with `Option`. And two struct types with the same fields are different types. TypeScript would treat them as interchangeable, because it compares shapes. Rust compares names." },
            "A new struct cannot be printed yet. `{}` is the form meant for a reader, and the compiler cannot guess what a reader should see. `{:?}` is the form meant for you, and the compiler can write that one, but only when asked:",
            { run: rs`struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User { name: String::from("Ada"), age: 36 };
    println!("{:?}", user);
}`, name: 'no_debug.rs', fails: 'E0277' },
            "The `help:` line gives the fix. `#[derive(Debug)]` above the definition asks the compiler to generate the debugging form from the fields. `{:?}` prints it on one line, and `{:#?}` spreads it over several.",
            { run: rs`#[derive(Debug)]
struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User { name: String::from("Ada"), age: 36 };
    println!("{} is {}", user.name, user.age);
    println!("{:?}", user);
    println!("{user:#?}");
}`, name: 'debug.rs', expect: 'Ada is 36\nUser { name: "Ada", age: 36 }\nUser {\n    name: "Ada",\n    age: 36,\n}\n' },
            "`#[derive(…)]` is an **attribute**: a note to the compiler about the item that follows. `Debug` is a **trait**, which is a named capability that a type can have. Lesson 15 is about traits. Until then, read `derive(Debug)` as a request: write the obvious code for this capability, field by field. The last section of this lesson lists the other capabilities you can ask for in the same way.",
            { tip: "Put `#[derive(Debug)]` on every struct you write unless you have a reason not to. `dbg!(&user)` then prints the value with the file and the line it was called from." },
          ],
        },
        {
          title: 'Structs are values, and they move',
          body: [
            "A struct is stored wherever its variable is. Its fields lie side by side, with no pointer in between and no header in front. The `String` inside a `User` is the same three words lesson 4 showed: a pointer, a length and a capacity. The text itself is on the heap.",
            { memory: {
              title: 'A `User` in the stack frame, and the one buffer it owns',
              vars: [
                { id: 'user', type: 'User', fields: [['name.ptr', 'pointer'], ['name.len', 'usize'], ['name.cap', 'usize'], ['age', 'u32'], ['active', 'bool']] },
                { id: 'buf', name: 'buffer', type: 'u8', len: 3, frame: 'heap' },
              ],
              set: { user: { 'name.ptr': '&buf', 'name.len': 3, 'name.cap': 3, age: 36, active: 'true' }, buf: ["'A'", "'d'", "'a'"] },
              caption: "The struct is 32 bytes in the frame: 24 for the `String`, 4 for the `u32`, 1 for the `bool` and 3 unused. The solid arrow is ownership: `user` owns `name`, and `name` owns the buffer.",
            } },
            "So everything Part 2 said about a `String` holds for a struct that contains one. The struct owns its fields, and the fields own their buffers. Assigning the struct, passing it to a function or returning it **moves** it: the bytes in the frame are copied to the new place, and the old variable can no longer be used. When the owner goes out of scope, each field is dropped in turn.",
            "The same goes for a struct made only of numbers, which is more surprising. A `u32` is `Copy`. A struct of two of them is not, until you say so.",
            { run: rs`struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let a = Point { x: 1, y: 2 };
    let b = a;
    println!("{} {}", a.x, b.y);
}`, name: 'point_moves.rs', fails: 'E0382' },
            "The compiler will not decide this for you, because being `Copy` is a promise about the type's future. If `Point` were `Copy` automatically, adding a `String` field one day would quietly break every caller that relied on it. You ask with a derive, and the compiler checks that every field is `Copy` too.",
            { run: rs`#[derive(Debug, Clone, Copy)]
struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let a = Point { x: 1, y: 2 };
    let mut b = a;                 // a copy: both stay usable
    b.x = 10;
    println!("{a:?} {b:?} {}", a.x + b.y);
}`, name: 'point_copy.rs', expect: 'Point { x: 1, y: 2 } Point { x: 10, y: 2 } 3\n' },
            { compare: "In Python, PHP and JavaScript a variable holds a reference to an object, so `b = a` gives two names for one object, and a change made through `b` shows through `a`. In Rust, `let b = a` never produces two names for one value. Either the value moved and `a` is finished, or the type is `Copy` and there are two independent values." },
            "**Struct update syntax** builds a new struct from an old one. You write the fields that differ, and `..old` supplies the rest.",
            { run: rs`struct Config {
    host: String,
    port: u16,
    retries: u32,
    verbose: bool,
}

fn main() {
    let base = Config { host: String::from("localhost"), port: 8080, retries: 3, verbose: false };

    let loud = Config { verbose: true, ..base };

    println!("{} {} {} {}", loud.host, loud.port, loud.retries, loud.verbose);
    println!("{} {} {}", base.port, base.retries, base.verbose);
}`, name: 'update.rs', expect: 'localhost 8080 3 true\n8080 3 false\n' },
            "`..base` looks like the spread in JavaScript's `{ ...base, verbose: true }`, and it is not a copy. Each field it supplies is moved or copied by the usual rule. `port` and `retries` are `Copy`, so `base` still has them. `host` is a `String`, so it moved into `loud`, and `base.host` is gone. `base` is now **partially moved**.",
            "A partial move is the one place where the compiler tracks ownership below the level of a variable. Step through one, and watch what would go wrong if the rule were looser.",
            { trace: {
              title: 'Moving one field out of a struct',
              code: rs`struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User {
        name: String::from("Ada"),
        age: 36,
    };
    let name = user.name;
    let age = user.age;
    println!("{name} {age}");
}`,
              vars: [
                { id: 'user', type: 'User', fields: [['name.ptr', 'pointer'], ['name.len', 'usize'], ['name.cap', 'usize'], ['age', 'u32']] },
                { id: 'name', type: 'String' },
                { id: 'age', type: 'u32' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 3, frame: 'heap' },
              ],
              steps: [
                { line: [7, 10], set: { user: { 'name.ptr': '&buf', 'name.len': 3, 'name.cap': 3, age: 36 }, buf: ["'A'", "'d'", "'a'"] }, say: "`user` owns both of its fields. The `name` field owns the buffer on the heap." },
                { line: 11, set: { name: { ptr: '&buf', len: 3, cap: 3 } }, moved: ['user.name.ptr', 'user.name.len', 'user.name.cap'], say: "The three words of the `String` are copied into the new variable `name`, which now owns the buffer. The field `user.name` is marked as moved. If it were still usable there would be two owners of one buffer, and it would be freed twice." },
                { line: 12, set: { age: 36 }, say: "`age` is a `u32`, which is `Copy`. Reading it copies the number and takes nothing away from `user`." },
                { line: 13, say: "At this point `user.age` can be used and `user.name` cannot. `user` as a whole cannot be used either, because part of it is missing." },
                { line: 14, dead: ['buf'], hide: ['name', 'age', 'user'], say: "`main` ends. `name` is dropped and frees the buffer. For `user`, the compiler drops only the fields that were not moved out. The `age` has nothing to free, so the buffer is freed exactly once." },
              ],
            } },
            "The rule: after a field has been moved out, the remaining fields can still be used one at a time, but the struct as a whole cannot be used, borrowed or passed on. There is no whole value left to hand over.",
            { run: rs`#[derive(Debug)]
struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User { name: String::from("Ada"), age: 36 };
    let name = user.name;                  // moves the String out of the struct
    println!("{name} is {}", user.age);    // allowed: age was not moved
    println!("{user:?}");                  // not allowed: this needs all of user
}`, name: 'partial_move.rs', fails: 'E0382' },
            "The message says `borrow of partially moved value`, and its note names the field that left. There are four standard ways out:",
            { list: [
              "**Borrow the field** when you only need to look at it: `let name = &user.name;`.",
              "**Clone the field** when you need a second owned copy: `let name = user.name.clone();`.",
              "**Put a value back.** If the variable is `mut`, assigning a new value to the moved field makes the struct whole again.",
              "**Take the whole struct apart** when you are done with it: `let User { name, age } = user;` moves every field into a variable of its own, so nothing is left half-used. This is a pattern, and lesson 12 has many more.",
            ] },
            { run: rs`#[derive(Debug)]
struct User {
    name: String,
    age: u32,
}

fn main() {
    let mut user = User { name: String::from("Ada"), age: 36 };

    let borrowed = &user.name;                 // 1. borrow the field
    println!("{borrowed}, {user:?}");

    let copy = user.name.clone();              // 2. clone the field
    println!("{copy}, {user:?}");

    let taken = user.name;                     // a partial move...
    user.name = String::from("Grace");         // 3. ...repaired by putting a value back
    println!("{taken}, {user:?}");

    let User { name, age } = user;             // 4. take the whole struct apart
    println!("{name} {age}");
}`, name: 'partial_fixes.rs', expect: 'Ada, User { name: "Ada", age: 36 }\nAda, User { name: "Ada", age: 36 }\nAda, User { name: "Grace", age: 36 }\nGrace 36\n' },
            { fromC: "A C struct has the same layout and the same value semantics: assignment copies the bytes. The difference is what happens to the source. C lets you go on using both copies, which is how two structs come to hold the same `malloc` pointer and free it twice. In Rust the copy is a move unless the type is `Copy`, and a type that owns heap memory cannot be `Copy`. A copy has to be asked for." },
          ],
        },
        {
          title: 'Methods and impl',
          body: [
            "Functions that belong to a type go in an `impl` block. A function whose first parameter is some form of `self` is a **method**, and is called with a dot on a value. A function in the block with no `self` parameter is an **associated function**, and is called on the type's name with `::`.",
            { run: rs`#[derive(Debug)]
struct Span {
    start: u32,
    end: u32,                              // one past the last position, as in a range
}

impl Span {
    // An associated function: no self. Called as Span::new(…).
    fn new(start: u32, end: u32) -> Self {
        Self { start, end }
    }

    fn single(at: u32) -> Self {
        Self::new(at, at + 1)
    }

    // A method: self is the value the method was called on.
    fn len(&self) -> u32 {
        self.end - self.start
    }

    fn overlaps(&self, other: &Span) -> bool {
        self.start < other.end && other.start < self.end
    }
}

fn main() {
    let morning = Span::new(9, 12);
    let lunch = Span::single(12);
    let meeting = Span::new(11, 13);

    println!("{morning:?} covers {} hours", morning.len());
    println!("{} {}", morning.overlaps(&lunch), morning.overlaps(&meeting));
    println!("{}", Span::len(&meeting));       // the same call, written as a plain function
}`, name: 'impl.rs', expect: 'Span { start: 9, end: 12 } covers 3 hours\nfalse true\n2\n' },
            { list: [
              "`Self`, with a capital, is the type the `impl` block is for. `Self { start, end }` and `Span { start, end }` mean the same thing here.",
              "`&self` is short for `self: &Self`. The method borrows the value it is called on.",
              "`new` is not a keyword, and nothing calls it for you. It is the conventional name for the function that builds a value. A type can have several such functions under different names, which is how Rust manages without overloading.",
              "A type can have any number of `impl` blocks, and they can come anywhere in the file.",
            ] },
            "`meeting.len()` and `Span::len(&meeting)` are the same call. The dot form reads the method's signature and borrows for you: it passes `&meeting` because `len` asks for `&self`. That is why you never have to write `(&meeting).len()`.",
            { compare: "Python makes you write `self` as the first parameter, and so does Rust. In PHP and TypeScript, `$this` and `this` are implicit. The Rust form carries more information than any of them, because the way `self` is written says what the method may do to the value. The next section is about that. An associated function is what the others call a static method. There are no classes, so there is nothing to inherit from. Lesson 15 covers how types share behavior." },
            { fromC: "A method is an ordinary function whose first parameter is a pointer to the struct: `span_len(const struct Span *span)` in C. The dot is only a way to find the function and fill in that first argument." },
          ],
        },
        {
          title: 'Three receivers: &self, &mut self and self',
          body: [
            "The `self` parameter is called the **receiver**. It comes in three forms, and they are the three ways of passing any value that Part 2 described: a shared borrow, a mutable borrow, or a move.",
            { table: {
              head: ['Receiver', 'The method', 'The caller', 'Typical names'],
              rows: [
                ['`&self`', 'Reads the value', 'Keeps the value, and may hold other shared borrows of it', '`len`, `is_empty`, `name`'],
                ['`&mut self`', 'Changes the value in place', 'Needs a `let mut` variable or a `&mut`, with no other borrow in use', '`push`, `clear`, `set_name`'],
                ['`self`', 'Takes ownership, usually to turn the value into something else', 'Cannot use the value afterwards, unless the type is `Copy`', '`into_bytes`, `build`, `finish`'],
              ],
            } },
            { run: rs`struct Draft {
    title: String,
    words: u32,
}

impl Draft {
    fn new(title: &str) -> Self {
        Self { title: String::from(title), words: 0 }
    }

    fn summary(&self) -> String {              // reads
        format!("{} ({} words)", self.title, self.words)
    }

    fn write(&mut self, words: u32) {          // changes
        self.words += words;
    }

    fn publish(self) -> String {               // consumes
        self.title                             // the String moves out to the caller
    }
}

fn main() {
    let mut draft = Draft::new("On Receivers");
    draft.write(250);
    draft.write(100);
    println!("{}", draft.summary());

    let title = draft.publish();               // draft is moved into the method
    println!("published: {title}");
}`, name: 'receivers.rs', expect: 'On Receivers (350 words)\npublished: On Receivers\n' },
            "Each call borrows or moves exactly as the signature says. `draft.write(250)` passes `&mut draft`, so `draft` has to be declared `mut`. Forget that, and the error is the one from lesson 7:",
            { run: rs`struct Counter {
    count: u32,
}

impl Counter {
    fn increment(&mut self) {
        self.count += 1;
    }
}

fn main() {
    let counter = Counter { count: 0 };
    counter.increment();
    println!("{}", counter.count);
}`, name: 'not_mut.rs', fails: 'E0596' },
            "`draft.publish()` passes `draft` itself. After the call the variable has been moved, and using it again is the `E0382` from lesson 5:",
            { run: rs`struct Draft {
    title: String,
}

impl Draft {
    fn publish(self) -> String {
        self.title
    }
}

fn main() {
    let draft = Draft { title: String::from("On Receivers") };
    let title = draft.publish();
    println!("{title} {}", draft.title);
}`, name: 'consumed.rs', fails: 'E0382' },
            "That error is a feature you can design with. A method that takes `self` makes using the value afterwards a compile error. A `Draft` that has been published cannot be written to again, because there is no `Draft` any more. No flag has to be checked while the program runs, and no exception has to be thrown.",
            "How to choose: start with `&self`. Use `&mut self` when the method has to change a field. Use `self` when the value should not be used after the call, because it was turned into something else or gave its contents away.",
            "A consuming method that returns `Self` gives you chaining, in the style known as a **builder**. Each call takes the value, changes it and hands it back. Writing `mut self` is the same as `self` with the parameter declared mutable inside the method. It is still a move, not a borrow.",
            { run: rs`struct Query {
    table: String,
    filters: Vec<String>,
    max_rows: u32,
}

impl Query {
    fn new(table: &str) -> Self {
        Self { table: String::from(table), filters: Vec::new(), max_rows: 100 }
    }

    fn filter(mut self, condition: &str) -> Self {
        self.filters.push(String::from(condition));
        self                                   // hand the value back
    }

    fn limit(mut self, max_rows: u32) -> Self {
        self.max_rows = max_rows;
        self
    }
}

fn main() {
    let query = Query::new("users").filter("age > 30").filter("active").limit(10);
    println!("{} {:?} {}", query.table, query.filters, query.max_rows);
}`, name: 'builder.rs', expect: 'users ["age > 30", "active"] 10\n' },
            { compare: "In Python, PHP or TypeScript a chain like this works because each method returns `self`, `$this` or `this`: a reference to the one object that everything shares. Nothing is shared here. One `Query` travels through the chain, moved from call to call, and comes to rest in the variable `query`. Only its few words on the stack were ever copied." },
            { pitfall: "With a consuming builder, `query.limit(10);` on a line of its own moves `query` into the method and throws away what comes back. The next use of `query` is then `E0382`. Keep the whole chain in one expression, or write `let query = query.limit(10);`." },
          ],
        },
        {
          title: 'Tuple structs and newtypes',
          body: [
            "A struct's fields need not have names. A **tuple struct** has a name for the type and positions for the fields, which are reached with `.0`, `.1` and so on, as in a tuple.",
            { run: rs`#[derive(Debug, Clone, Copy, PartialEq)]
struct Rgb(u8, u8, u8);

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
struct Meters(f64);

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
struct Feet(f64);

impl Feet {
    fn to_meters(self) -> Meters {
        Meters(self.0 * 0.3048)
    }
}

fn main() {
    let orange = Rgb(255, 165, 0);
    let Rgb(red, green, blue) = orange;        // taken apart like a tuple
    println!("{orange:?} {red} {green} {blue} {}", orange.1);

    let runway = Meters(2500.0);
    let needed = Feet(6000.0).to_meters();
    println!("{:.1} {}", needed.0, needed < runway);
    println!("{} {}", std::mem::size_of::<Meters>(), std::mem::size_of::<f64>());
}`, name: 'tuple_structs.rs', expect: 'Rgb(255, 165, 0) 255 165 0 165\n1828.8 true\n8 8\n' },
            "A struct with a single field, wrapped around an existing type, is called a **newtype**. `Meters` and `Feet` both hold an `f64`, and they are two different types. One cannot be passed where the other is expected:",
            { run: rs`struct Meters(f64);
struct Feet(f64);

fn climb_time(height: Meters) -> f64 {
    height.0 / 5.0
}

fn main() {
    let height = Feet(3000.0);
    println!("{}", climb_time(height));
    println!("{}", climb_time(Meters(height.0)));
}`, name: 'units.rs', fails: 'E0308' },
            "That refusal is the purpose of the type. A function that takes `Meters` cannot be handed a length in feet by accident. The check costs nothing when the program runs: a `Meters` is 8 bytes, the same as the `f64` inside it, and the wrapper leaves no trace in the machine code.",
            { list: [
              "**Units and identifiers.** `Meters` and `Feet`, or `UserId(u64)` and `OrderId(u64)`. The compiler keeps them apart, where two bare numbers would be swapped without a word.",
              "**Values that carry a guarantee.** Give the newtype a `new` that checks its input, and every function that receives one can rely on the check. Lesson 22 shows how to keep the field private, so that `new` is the only way in.",
              "**Your own methods on someone else's type.** You can write an `impl` block for the wrapper, which you cannot do for `f64` itself.",
            ] },
            { pitfall: "The protection lasts only until someone reaches inside. `Meters(height.0)` on the last line of that program takes the number out of a `Feet` and relabels it as meters, and with the line above it removed, the compiler accepts the program. Write conversions once, as methods like `to_meters`, and keep `.0` out of the rest of the code." },
            { compare: "TypeScript's `type Meters = number` is an alias: `Meters` and `Feet` are both plain `number`, and mixing them is accepted. Python's `typing.NewType` is seen by a type checker and gone when the program runs. A PHP class that wraps a float does keep units apart, at the price of an object for every value. A Rust newtype is checked by the compiler and costs nothing at run time. Rust has aliases too, written `type Meters = f64;`, and they give no protection either." },
            "A struct can also have no fields at all: `struct Marker;`. It takes no memory. It earns its place once traits arrive, in lesson 15.",
          ],
        },
        {
          title: 'Borrowing fields separately',
          body: [
            "The rule from lesson 7 is that a value can have any number of shared borrows or one mutable borrow at a time. For a struct, the compiler applies that rule to each field on its own, as long as it can see which fields you touch. Mutable borrows of two different fields do not overlap, so both are allowed.",
            { run: rs`struct Player {
    name: String,
    score: u32,
    history: Vec<u32>,
}

fn main() {
    let mut player = Player { name: String::from("Ada"), score: 0, history: Vec::new() };

    let name = &mut player.name;           // a mutable borrow of one field
    let history = &mut player.history;     // and of another: no conflict
    player.score += 10;                    // a third field, used directly
    history.push(10);
    name.push('!');

    println!("{} {} {:?}", player.name, player.score, player.history);
}`, name: 'disjoint.rs', expect: 'Ada! 10 [10]\n' },
            "This works because all three uses are written out in one function body, where the compiler can see that they name different fields. A method call hides that. `add_point(&mut self)` asks for a mutable borrow of the **whole** struct, whatever its body goes on to touch:",
            { run: rs`struct Player {
    name: String,
    score: u32,
}

impl Player {
    fn add_point(&mut self) {
        self.score += 1;
    }
}

fn main() {
    let mut player = Player { name: String::from("Ada"), score: 0 };
    let name = &mut player.name;
    player.add_point();                    // needs all of player
    name.push('!');                        // name is still in use here
    println!("{} {}", player.name, player.score);
}`, name: 'whole_struct.rs', fails: 'E0499' },
            { borrows: {
              title: 'A method call borrows the whole struct',
              code: rs`let mut player = Player { name: String::from("Ada"), score: 0 };
let name = &mut player.name;
player.add_point();
name.push('!');
println!("{} {}", player.name, player.score);`,
              spans: [
                { name: 'player', kind: 'owner', from: 1, to: 5 },
                { name: 'name', kind: 'mut', from: 2, to: 4 },
                { name: 'add_point', kind: 'mut', from: 3, to: 3 },
              ],
              marks: [{ line: 3, label: '`add_point` takes `&mut self`, which is all of `player`, while `name` holds a mutable borrow of one of its fields from line 2 to line 4.' }],
              caption: "The bar for `name` covers a part of `player`. The call on line 3 needs every part, so it cannot fall inside that bar.",
            } },
            "`add_point` changes only `score`, and `name` borrows only `name`. A person can see that nothing collides, and the compiler refuses all the same. This is the rule from lesson 3 at work: a call is checked against the signature of the function and never against its body. The signature says `&mut self`, and `self` is the whole `Player`. If the compiler looked inside instead, editing the body of `add_point` could break callers in other files without its signature changing at all.",
            "The standard fixes:",
            { list: [
              "**Reorder.** Finish with the field borrow before the method call. A borrow ends at its last use.",
              "**Pass the field, not the struct.** A helper written as `fn bump(score: &mut u32)` borrows one field, and its signature says so.",
              "**Use the fields directly** instead of calling the method, when the code is somewhere that may touch them.",
              "**Split the struct.** If two groups of fields are always borrowed apart, they may want to be two structs, each with its own methods.",
            ] },
            { run: rs`struct Player {
    name: String,
    score: u32,
}

impl Player {
    fn add_point(&mut self) {
        self.score += 1;
    }
}

fn bump(score: &mut u32) {
    *score += 1;
}

fn main() {
    let mut player = Player { name: String::from("Ada"), score: 0 };

    let name = &mut player.name;
    bump(&mut player.score);               // borrows the score field only
    name.push('!');                        // the last use of name
    player.add_point();                    // now all of player is free to borrow

    println!("{} {}", player.name, player.score);
}`, name: 'whole_struct_fixed.rs', expect: 'Ada! 2\n' },
            { compare: "None of this has a counterpart in Python, PHP or TypeScript, where any code that holds a reference to an object may change any of its fields at any moment. The Rust rule costs you some rearranging. What it buys is that while you hold `&mut player.name`, no other code can change that name or free it." },
          ],
        },
        {
          title: 'Derives and layout',
          body: [
            "`derive` generates the code for a capability from the fields of a type. These are the ones you will use all the time.",
            { table: {
              head: ['Derive', 'Gives you', 'Requires'],
              rows: [
                ['`Debug`', '`{:?}` and `{:#?}`', 'Every field is `Debug`'],
                ['`Clone`', '`.clone()`: a copy made field by field, heap buffers included', 'Every field is `Clone`'],
                ['`Copy`', 'Assignment and passing copy the value instead of moving it', 'Every field is `Copy`, and `Clone` is derived as well'],
                ['`PartialEq`', '`==` and `!=`, true when every field is equal', 'Every field is `PartialEq`'],
                ['`Eq`', 'Nothing new to call. It states that `==` has no odd cases, which map keys need', '`PartialEq`, and no `f32` or `f64` field, because a NaN is not equal to itself'],
                ['`PartialOrd`, `Ord`', '`<`, `>` and sorting. Fields are compared in the order they are declared', 'The same of every field'],
                ['`Hash`', 'Use as a key in a `HashMap`, which lesson 14 covers', 'Every field is `Hash`'],
                ['`Default`', '`Type::default()`, with every field at its default: zero, `false`, empty text', 'Every field is `Default`'],
              ],
            } },
            "None of them is on unless you ask. Two structs cannot even be compared:",
            { run: rs`struct Point {
    x: i32,
    y: i32,
}

fn main() {
    let a = Point { x: 1, y: 2 };
    let b = Point { x: 1, y: 2 };
    println!("{}", a == b);
}`, name: 'no_eq.rs', fails: 'E0369' },
            { run: rs`#[derive(Debug, Clone, PartialEq, PartialOrd, Default)]
struct Release {
    major: u32,
    minor: u32,
    tag: String,
}

fn main() {
    let a = Release { major: 1, minor: 4, tag: String::from("beta") };
    let b = a.clone();                                 // Clone: a full copy, tag included
    let c = Release { minor: 10, ..a.clone() };        // update syntax from a copy, so a stays whole

    println!("{}", a == b);                            // PartialEq: every field is equal
    println!("{}", a < c);                             // PartialOrd: major ties, so minor decides
    println!("{:?}", Release::default());              // Default
    println!("{:?}", Release { major: 2, ..Default::default() });
}`, name: 'derives.rs', expect: 'true\ntrue\nRelease { major: 0, minor: 0, tag: "" }\nRelease { major: 2, minor: 0, tag: "" }\n' },
            "A derive is checked like any other code. Asking for `Copy` on a struct that owns a `String` is refused, because copying those three words would make two owners of one buffer:",
            { run: rs`#[derive(Debug, Clone, Copy)]
struct User {
    name: String,
    age: u32,
}

fn main() {
    let user = User { name: String::from("Ada"), age: 36 };
    println!("{} {}", user.name, user.age);
}`, name: 'copy_string.rs', fails: 'E0204' },
            { compare: "Python gives every object `==` (by identity unless you define `__eq__`), a `repr`, and a place in a `dict`. A dataclass adds field-by-field equality for free. PHP's `==` compares objects property by property, and JavaScript's `===` compares identity. Rust gives a new type none of these until you ask. In return, the derive line tells a reader everything a value of the type can do." },
            "**Layout.** A struct takes the space of its fields plus padding, and nothing else: no type tag, no hidden pointer, no reference count. Each field sits at an address that is a multiple of its own alignment, which can leave gaps. Rust is free to reorder the fields to make the gaps smaller, so the order in memory is not promised to be the order you wrote.",
            { run: rs`#![allow(dead_code)]           // these types are only measured, never used
use std::mem::size_of;

struct Reading {
    flag: u8,
    value: u32,
    channel: u8,
}

#[repr(C)]                     // keep the fields in the order written, as C does
struct ReadingInOrder {
    flag: u8,
    value: u32,
    channel: u8,
}

struct User {
    name: String,
    age: u32,
    active: bool,
}

struct Meters(f64);
struct Marker;

fn main() {
    println!("Reading: {}", size_of::<Reading>());
    println!("ReadingInOrder: {}", size_of::<ReadingInOrder>());
    println!("User: {}", size_of::<User>());
    println!("Meters: {}, Marker: {}", size_of::<Meters>(), size_of::<Marker>());
}`, name: 'layout.rs', expect: 'Reading: 8\nReadingInOrder: 12\nUser: 32\nMeters: 8, Marker: 0\n' },
            "The six bytes of fields in a `Reading` fit in 8 once the two single bytes sit next to each other. Kept in the order written, the `u32` has to start at a multiple of 4. That leaves three unused bytes after `flag` and three more after `channel`, for 12 in all. A `User` is the 32 bytes of the first figure in this lesson.",
            { aside: "A Python object carries a reference count, a pointer to its type, and storage for the names of its attributes as well as their values. PHP and JavaScript objects have headers of their own. A Rust `Point { x: i32, y: i32 }` is 8 bytes. A `Vec` of a million of them is one block of 8 megabytes with no pointers inside it, which is a large part of why Rust programs are kind to the processor's cache." },
            { native: "rust-analyzer shows a type's size and alignment when you hover over its name. It also fills in what the compiler asks for: on a struct literal with fields missing, the quick fix \"Fill struct fields\" writes them out, and on a type it offers to generate `new`, getters and `impl` blocks." },
          ],
        },
      ],
      takeaways: [
        "A struct is a value. Its fields lie side by side wherever the variable is, and it owns them. Assigning or passing it moves it, unless you derive `Copy`.",
        "Moving one field out leaves the struct partially moved: the other fields stay usable and the whole does not. Borrow or clone the field, put a value back, or take the whole struct apart.",
        "The receiver says what a method does to its value: `&self` reads it, `&mut self` changes it, and `self` consumes it.",
        "A newtype gives an existing type a new name that the compiler keeps apart from the original, at no cost when the program runs.",
        "Inside one function, fields are borrowed separately. A method call borrows the whole struct, because calls are checked against signatures.",
        "Nothing comes for free: printing, comparing, cloning and copying are each asked for with `derive`.",
      ],
      quiz: [
        {
          q: 'A `Playlist` owns a `Vec<String>` of track names. Its method `into_tracks` should hand that `Vec` to the caller without copying a single track, and the playlist is of no use afterwards. Which receiver does the method need?',
          options: [
            { t: '`self`', ok: true, why: "The method takes ownership of the playlist, so it may move the `Vec` out and return it. The caller cannot use the playlist afterwards, which is what the description asks for. Names that start with `into_` conventionally take `self`." },
            { t: '`&self`', why: "A shared borrow may look at the `Vec` but may not move it out. The method would have to return a clone, which copies every track." },
            { t: '`&mut self`', why: "A mutable borrow may change the playlist but has to leave a valid one behind, and moving the field out would leave a hole in a value the caller still owns. It could swap an empty `Vec` in, but then the caller keeps a playlist that the description says is finished." },
            { t: 'None: `fn into_tracks() -> Vec<String>`', why: "Without a `self` parameter it is an associated function, called as `Playlist::into_tracks()`. It has no playlist to take the tracks from." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`#[derive(Debug, Clone, Copy)]
struct Settings {
    volume: u8,
    brightness: u8,
    muted: bool,
}

fn main() {
    let base = Settings { volume: 5, brightness: 7, muted: false };
    let night = Settings { brightness: 1, ..base };
    let mut loud = Settings { volume: 9, ..night };
    loud.muted = true;

    println!("{} {} {}", base.brightness, night.volume, night.muted);
    println!("{loud:?}");
}`,
          answer: '7 5 false\nSettings { volume: 9, brightness: 1, muted: true }',
          explain: "`..base` fills in `volume` and `muted` for `night`, and `..night` fills in `brightness` and `muted` for `loud`. Each struct is a separate value, so setting `loud.muted` changes neither `night` nor `base`.",
          hint: "Update syntax copies the fields you did not write. It does not link the two structs.",
        },
        {
          q: 'Does this program compile?',
          code: rs`struct Account {
    owner: String,
    balance: i64,
    frozen: bool,
}

fn main() {
    let first = Account { owner: String::from("Ada"), balance: 100, frozen: false };
    let second = Account { owner: String::from("Grace"), ..first };
    println!("{} {}", first.owner, first.balance);
    println!("{} {} {}", second.owner, second.balance, second.frozen);
}`,
          options: [
            { t: 'Yes: `..first` supplied only `balance` and `frozen`, and both are `Copy`', ok: true, why: "`owner` is written out for `second`, so `..first` has two fields left to supply, and both are copied. Nothing was moved out of `first`, and it is still whole." },
            { t: 'No: `..first` moves `first`, so line 10 uses a moved value', why: "Update syntax does not move the struct as a whole. Each field it supplies is moved or copied by itself, and here every one of them is `Copy`." },
            { t: 'No: `first.owner` was moved into `second`', why: "It would have been if `second` had not been given an `owner` of its own. Delete `owner: String::from(\"Grace\"),` and line 10 fails with `E0382`." },
            { t: 'Yes: update syntax clones every field it takes', why: "It never clones. A `String` field taken through `..first` is moved. That is the difference from JavaScript's `{ ...first }`, which copies references and leaves both objects usable." },
          ],
          verify: 'compiles',
        },
        {
          q: 'Does this program compile?',
          code: rs`struct Inventory {
    items: Vec<String>,
    checked: u32,
}

impl Inventory {
    fn mark_checked(&mut self) {
        self.checked += 1;
    }
}

fn main() {
    let mut stock = Inventory { items: vec![String::from("lamp")], checked: 0 };
    let first = &stock.items[0];
    stock.mark_checked();
    println!("{first} {}", stock.checked);
}`,
          options: [
            { t: 'No: `mark_checked` borrows all of `stock` mutably while `first` still borrows a part of it', ok: true, why: "`first` is used on line 16, so its shared borrow is alive across line 15. The call needs `&mut stock`, the whole struct, and the compiler reports `E0502`. Printing `first` before the call fixes it." },
            { t: 'Yes: `first` borrows `items`, and the method changes only `checked`', why: "That reasoning holds when both uses are written as field accesses in one function. A method call is checked against its signature, and `&mut self` means the whole struct, whatever the body touches." },
            { t: 'Yes: `first` is a shared borrow, and shared borrows never conflict', why: "They never conflict with each other. A shared borrow and a mutable borrow of the same value cannot overlap, which is the aliasing rule." },
            { t: 'No: `stock.items[0]` moves the `String` out of the `Vec`', why: "The `&` in front makes it a borrow of the element. Line 14 is fine. The trouble starts on line 15." },
          ],
          verify: 'E0502',
        },
        {
          q: 'Does this program compile?',
          code: rs`#[derive(Debug)]
struct Size {
    width: u32,
    height: u32,
}

fn area(size: Size) -> u32 {
    size.width * size.height
}

fn main() {
    let size = Size { width: 3, height: 4 };
    let total = area(size);
    println!("{total} {size:?}");
}`,
          options: [
            { t: 'No: `size` was moved into `area`, because `Size` is not `Copy`', ok: true, why: "A struct is `Copy` only if it derives it, even when every field is. Add `Clone, Copy` to the derive line, or let `area` take `&Size`." },
            { t: 'Yes: both fields are `u32`, which is `Copy`, so the struct is copied', why: "Fields that are `Copy` make the derive possible. They do not make the struct `Copy` by themselves, because that would turn adding a field into a breaking change." },
            { t: 'Yes: structs are passed by reference, as objects are in Python, PHP and TypeScript', why: "A struct is a value. Passing it hands over the bytes themselves and ends the caller's use of the variable. A reference has to be written: `&size`." },
            { t: 'No: `Size` must derive `Clone` before it can be passed to a function', why: "Passing never needs `Clone`. Any value can be moved into a function. The error is the use of `size` on line 14, after the move." },
          ],
          verify: 'E0382',
        },
        {
          kind: 'multi',
          q: 'A struct is declared with `#[derive(Debug, Clone, PartialEq)]`, and `a` and `b` are two values of it. Which of these compile?',
          options: [
            { t: '`println!("{a:?}");`', ok: true, why: "`Debug` provides the `{:?}` form." },
            { t: '`println!("{a}");`', why: "`{}` needs a trait called `Display`, which cannot be derived, because the compiler cannot know what a reader should see. Lesson 15 shows how to write it." },
            { t: '`let c = a.clone();`', ok: true, why: "`Clone` provides `.clone()`." },
            { t: '`let c = a; let d = a;`', why: "The second statement uses a value that has moved. Assignment copies only when the type is `Copy`, and `Copy` is not in the list." },
            { t: '`if a != b { return; }`', ok: true, why: "`PartialEq` provides both `==` and `!=`." },
            { t: '`if a < b { return; }`', why: "Ordering comes from `PartialOrd`, which is a separate derive." },
          ],
          hint: "Three compile. Match each line to the one capability it needs.",
        },
        {
          q: 'Why does the compiler accept the two mutable borrows on lines 8 and 9?',
          code: rs`struct Pair {
    left: Vec<i32>,
    right: Vec<i32>,
}

fn main() {
    let mut pair = Pair { left: vec![1], right: vec![2] };
    let a = &mut pair.left;
    let b = &mut pair.right;
    a.push(10);
    b.push(20);
    println!("{:?} {:?}", pair.left, pair.right);
}`,
          options: [
            { t: 'They borrow different fields, and inside one function the compiler tracks borrows field by field', ok: true, why: "`pair.left` and `pair.right` are separate places that cannot overlap, and the compiler can see both paths written out. Neither borrow gives a way to reach the other field." },
            { t: 'The first borrow ends as soon as the second one starts', why: "Both are still in use on lines 10 and 11, so they are alive together. If both borrowed `pair.left`, this would be `E0499`." },
            { t: 'A `Vec` keeps its elements on the heap, so borrowing it does not borrow the struct', why: "Where the elements live makes no difference. Two `&mut` to two `u32` fields are accepted in the same way. What matters is that the two fields are different places." },
            { t: 'The one-mutable-borrow rule is enforced only across function calls', why: "It is enforced everywhere. It is across a call that this stops working: a method taking `&mut self` borrows every field at once, because only its signature is consulted." },
          ],
          verify: 'compiles',
        },
      ],
      challenges: [
        {
          id: 'derive-what-it-needs',
          title: 'Derive what it needs',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "The three functions below are correct, and none of them compiles, because a `Card` cannot do anything yet. Run the tests and read the errors. Each one names the trait that is missing.",
            "Add one `#[derive(…)]` line above the struct with what the functions need, and nothing they do not need. Leave the functions as they are.",
          ],
          signature: 'fn log_line(card: &Card) -> String\nfn is_pair(a: &Card, b: &Card) -> bool\nfn stronger(a: &Card, b: &Card) -> Card',
          starter: rs`struct Card {
    rank: u8,
    suit: char,
}

// What a programmer wants to see in a log.
fn log_line(card: &Card) -> String {
    format!("played {:?}", card)
}

// True when both players hold the same card.
fn is_pair(a: &Card, b: &Card) -> bool {
    a == b
}

// The stronger of two cards, as a new value. The rank decides, then the suit.
fn stronger(a: &Card, b: &Card) -> Card {
    if a > b { a.clone() } else { b.clone() }
}`,
          hints: [
            "Each error names a trait: `Debug` for `{:?}`, `PartialEq` for `==`, and `PartialOrd` for `>`.",
            "The error on `a.clone()` says that `Card` does not implement `Clone`, so the reference was cloned instead. That one is fixed by a derive too.",
            "`#[derive(Debug, Clone, PartialEq, PartialOrd)]` on the line above `struct Card`.",
          ],
          solution: rs`#[derive(Debug, Clone, PartialEq, PartialOrd)]
struct Card {
    rank: u8,
    suit: char,
}

// What a programmer wants to see in a log.
fn log_line(card: &Card) -> String {
    format!("played {:?}", card)
}

// True when both players hold the same card.
fn is_pair(a: &Card, b: &Card) -> bool {
    a == b
}

// The stronger of two cards, as a new value. The rank decides, then the suit.
fn stronger(a: &Card, b: &Card) -> Card {
    if a > b { a.clone() } else { b.clone() }
}`,
          solutionNote: "The derived comparison goes through the fields in the order they are declared, so `rank` is compared first and `suit` only breaks a tie. Swap the two fields and `stronger` changes its answers.",
          tests: [
            { label: 'log_line shows the type name and every field', body: rs`let card = Card { rank: 12, suit: 'h' };
assert_eq!(log_line(&card), "played Card { rank: 12, suit: 'h' }");` },
            { label: 'is_pair compares both fields', body: rs`let queen = Card { rank: 12, suit: 'h' };
assert!(is_pair(&queen, &Card { rank: 12, suit: 'h' }));
assert!(!is_pair(&queen, &Card { rank: 12, suit: 's' }), "same rank, different suit");
assert!(!is_pair(&queen, &Card { rank: 11, suit: 'h' }), "same suit, different rank");` },
            { label: 'stronger picks the higher rank, whichever side it is on', body: rs`let low = Card { rank: 3, suit: 's' };
let high = Card { rank: 9, suit: 'c' };
assert!(is_pair(&stronger(&low, &high), &high));
assert!(is_pair(&stronger(&high, &low), &high));` },
            { label: 'stronger lets the suit decide when the ranks tie', body: rs`let clubs = Card { rank: 7, suit: 'c' };
let spades = Card { rank: 7, suit: 's' };
assert!(is_pair(&stronger(&clubs, &spades), &spades), "'s' comes after 'c'");` },
            { label: 'stronger returns a new card and leaves both arguments usable', body: rs`let a = Card { rank: 2, suit: 'd' };
let b = Card { rank: 5, suit: 'd' };
let best = stronger(&a, &b);
assert_eq!(best.rank + a.rank + b.rank, 12);
assert_eq!(best.suit, 'd');` },
          ],
        },
        {
          id: 'rect-methods',
          title: 'Methods for a rectangle',
          level: 'warm-up',
          prompt: [
            "Give `Rect` its methods. `new` is written for you, and the others return placeholder values.",
            { list: [
              "`Rect::square(side)` builds a rectangle with equal sides.",
              "`area` and `perimeter` return what their names say.",
              "`is_square` is true when the sides are equal.",
              "`can_hold(&other)` is true when `other` fits inside without being turned: it is no wider and no taller.",
              "`scale(factor)` multiplies both sides by `factor`, in place.",
            ] },
          ],
          signature: 'impl Rect {\n    fn new(width: u32, height: u32) -> Self\n    fn square(side: u32) -> Self\n    fn area(&self) -> u32\n    fn perimeter(&self) -> u32\n    fn is_square(&self) -> bool\n    fn can_hold(&self, other: &Rect) -> bool\n    fn scale(&mut self, factor: u32)\n}',
          starter: rs`#[derive(Debug, Clone, PartialEq)]
struct Rect {
    width: u32,
    height: u32,
}

impl Rect {
    fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }

    fn square(side: u32) -> Self {
        Self::new(side, 0)
    }

    fn area(&self) -> u32 {
        0
    }

    fn perimeter(&self) -> u32 {
        0
    }

    fn is_square(&self) -> bool {
        false
    }

    fn can_hold(&self, other: &Rect) -> bool {
        false
    }

    fn scale(&mut self, factor: u32) {
        // Change self.width and self.height.
    }
}`,
          hints: [
            "Inside a method, the fields are `self.width` and `self.height`. Another rectangle's fields are `other.width` and `other.height`.",
            "`can_hold` needs both conditions: `self.width >= other.width && self.height >= other.height`.",
            "`scale` assigns through `self`: `self.width *= factor;` and the same for the height. That is allowed because the receiver is `&mut self`.",
          ],
          solution: rs`#[derive(Debug, Clone, PartialEq)]
struct Rect {
    width: u32,
    height: u32,
}

impl Rect {
    fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }

    fn square(side: u32) -> Self {
        Self::new(side, side)
    }

    fn area(&self) -> u32 {
        self.width * self.height
    }

    fn perimeter(&self) -> u32 {
        2 * (self.width + self.height)
    }

    fn is_square(&self) -> bool {
        self.width == self.height
    }

    fn can_hold(&self, other: &Rect) -> bool {
        self.width >= other.width && self.height >= other.height
    }

    fn scale(&mut self, factor: u32) {
        self.width *= factor;
        self.height *= factor;
    }
}`,
          tests: [
            { label: 'square builds equal sides', body: rs`assert_eq!(Rect::square(4), Rect::new(4, 4));` },
            { label: 'area and perimeter', body: rs`let page = Rect::new(3, 5);
assert_eq!(page.area(), 15);
assert_eq!(page.perimeter(), 16);
assert_eq!(Rect::new(0, 9).area(), 0);` },
            { label: 'is_square is true only for equal sides', body: rs`assert!(Rect::new(6, 6).is_square());
assert!(!Rect::new(6, 7).is_square());` },
            { label: 'can_hold needs room in both directions', body: rs`let frame = Rect::new(8, 5);
assert!(frame.can_hold(&Rect::new(8, 5)), "a rectangle holds one of its own size");
assert!(frame.can_hold(&Rect::new(2, 3)));
assert!(!frame.can_hold(&Rect::new(9, 1)), "too wide");
assert!(!frame.can_hold(&Rect::new(1, 6)), "too tall");` },
            { label: 'scale changes the rectangle it is called on', body: rs`let mut tile = Rect::new(2, 3);
tile.scale(4);
assert_eq!(tile, Rect::new(8, 12));
tile.scale(1);
assert_eq!(tile.area(), 96);` },
          ],
        },
        {
          id: 'counter',
          title: 'A counter with a step',
          level: 'core',
          prompt: [
            "Finish `Counter`. The tests call these four functions:",
            { list: [
              "`Counter::new(step)` starts at zero.",
              "`value` returns the current count.",
              "`tick` adds the step to the count and returns the new count. It never overflows: once the count would pass `u32::MAX`, it stays there.",
              "`reset` sets the count back to zero and returns what it was.",
            ] },
            "The starter gives every method `&self`. Two of them need a different receiver, and the compiler will say so as soon as you assign to a field.",
          ],
          starter: rs`struct Counter {
    count: u32,
    step: u32,
}

impl Counter {
    fn new(step: u32) -> Self {
        Self { count: 0, step }
    }

    fn value(&self) -> u32 {
        self.count
    }

    fn tick(&self) -> u32 {
        self.count + self.step
    }

    fn reset(&self) -> u32 {
        self.count
    }
}`,
          hints: [
            "A method that changes a field takes `&mut self`. The error says that `self.count` is behind a `&` reference and cannot be assigned to, and its `help:` line shows the change to make.",
            "For `tick`, lesson 2 had the method you need: `self.count.saturating_add(self.step)` stops at the largest value instead of overflowing.",
            "`reset` has to remember the old count before it overwrites it: `let old = self.count; self.count = 0; old`.",
          ],
          solution: rs`struct Counter {
    count: u32,
    step: u32,
}

impl Counter {
    fn new(step: u32) -> Self {
        Self { count: 0, step }
    }

    fn value(&self) -> u32 {
        self.count
    }

    fn tick(&mut self) -> u32 {
        self.count = self.count.saturating_add(self.step);
        self.count
    }

    fn reset(&mut self) -> u32 {
        let old = self.count;
        self.count = 0;
        old
    }
}`,
          tests: [
            { label: 'A new counter starts at zero', body: rs`let counter = Counter::new(5);
assert_eq!(counter.value(), 0);` },
            { label: 'tick adds the step and returns the new count', body: rs`let mut counter = Counter::new(3);
assert_eq!(counter.tick(), 3);
assert_eq!(counter.tick(), 6);
assert_eq!(counter.value(), 6, "the count must be stored, not only returned");` },
            { label: 'value does not change the counter', body: rs`let mut counter = Counter::new(2);
counter.tick();
assert_eq!(counter.value(), 2);
assert_eq!(counter.value(), 2);` },
            { label: 'reset returns the old count and starts again', body: rs`let mut counter = Counter::new(4);
counter.tick();
counter.tick();
assert_eq!(counter.reset(), 8);
assert_eq!(counter.value(), 0);
assert_eq!(counter.tick(), 4, "the step survives a reset");` },
            { label: 'tick stops at u32::MAX instead of overflowing', body: rs`let mut counter = Counter::new(u32::MAX - 1);
assert_eq!(counter.tick(), u32::MAX - 1);
assert_eq!(counter.tick(), u32::MAX);
assert_eq!(counter.tick(), u32::MAX);` },
            { label: 'Two counters do not share anything', body: rs`let mut a = Counter::new(1);
let mut b = Counter::new(10);
a.tick();
b.tick();
b.tick();
assert_eq!((a.value(), b.value()), (1, 20));` },
          ],
        },
        {
          id: 'request-builder',
          title: 'A builder that is used up',
          level: 'core',
          track: true,
          forbid: ['clone'],
          prompt: [
            "`RequestBuilder` collects the parts of an HTTP request one call at a time, and `build` turns it into a finished `Request`. Every method takes the builder by value, so the calls chain, and a builder that has been built cannot be used again.",
            { list: [
              "`RequestBuilder::new(url)` starts with the method `GET`, no headers and a timeout of 30 seconds. It is written for you.",
              "`method`, `header` and `timeout` each change one thing and return the builder. `header` adds to the list, and the others replace what was there.",
              "`build` moves the four fields into a `Request`. Nothing is copied: the tests count allocations to check, and `clone` is not available.",
            ] },
            "Turn a `&str` into a `String` with `String::from(text)`, and add to a `Vec` with `push`.",
          ],
          signature: 'impl RequestBuilder {\n    fn new(url: &str) -> Self\n    fn method(self, method: &str) -> Self\n    fn header(self, line: &str) -> Self\n    fn timeout(self, secs: u32) -> Self\n    fn build(self) -> Request\n}',
          prelude: rs`#[derive(Debug, PartialEq)]
struct Request {
    method: String,
    url: String,
    headers: Vec<String>,
    timeout_secs: u32,
}`,
          starter: rs`struct RequestBuilder {
    method: String,
    url: String,
    headers: Vec<String>,
    timeout_secs: u32,
}

impl RequestBuilder {
    fn new(url: &str) -> Self {
        Self { method: String::from("GET"), url: String::from(url), headers: Vec::new(), timeout_secs: 30 }
    }

    // Each of these should change one field and hand the builder back.
    fn method(self, method: &str) -> Self {
        self
    }

    fn header(self, line: &str) -> Self {
        self
    }

    fn timeout(self, secs: u32) -> Self {
        self
    }

    // Move the fields of the builder into a Request.
    fn build(self) -> Request {
        Request { method: String::new(), url: String::new(), headers: Vec::new(), timeout_secs: 0 }
    }
}`,
          hints: [
            "To change a field of a value you were given by value, declare the receiver `mut self`. The method still takes ownership, and returning `self` gives it back.",
            "`fn timeout(mut self, secs: u32) -> Self { self.timeout_secs = secs; self }`. The other two have the same shape, with `String::from` and `push`.",
            "`build` owns `self`, so it may move each field out: `Request { method: self.method, url: self.url, headers: self.headers, timeout_secs: self.timeout_secs }`. Moving every field out of a struct you own is allowed.",
          ],
          solution: rs`struct RequestBuilder {
    method: String,
    url: String,
    headers: Vec<String>,
    timeout_secs: u32,
}

impl RequestBuilder {
    fn new(url: &str) -> Self {
        Self { method: String::from("GET"), url: String::from(url), headers: Vec::new(), timeout_secs: 30 }
    }

    fn method(mut self, method: &str) -> Self {
        self.method = String::from(method);
        self
    }

    fn header(mut self, line: &str) -> Self {
        self.headers.push(String::from(line));
        self
    }

    fn timeout(mut self, secs: u32) -> Self {
        self.timeout_secs = secs;
        self
    }

    // Every field moves out of the builder, which is allowed because build owns it.
    fn build(self) -> Request {
        Request { method: self.method, url: self.url, headers: self.headers, timeout_secs: self.timeout_secs }
    }
}`,
          tests: [
            { label: 'Defaults: GET, no headers, 30 seconds', body: rs`let request = RequestBuilder::new("/health").build();
assert_eq!(request, Request { method: String::from("GET"), url: String::from("/health"), headers: vec![], timeout_secs: 30 });` },
            { label: 'method and timeout each replace one field', body: rs`let request = RequestBuilder::new("/users").method("POST").timeout(5).build();
assert_eq!(request.method, "POST");
assert_eq!(request.timeout_secs, 5);
assert_eq!(request.url, "/users");
assert!(request.headers.is_empty());` },
            { label: 'Headers pile up in the order given', body: rs`let request = RequestBuilder::new("/")
    .header("Accept: text/html")
    .header("Cache-Control: no-cache")
    .build();
assert_eq!(request.headers, ["Accept: text/html", "Cache-Control: no-cache"]);` },
            { label: 'The last call to a setter wins', body: rs`let request = RequestBuilder::new("/").timeout(1).method("PUT").timeout(60).method("DELETE").build();
assert_eq!((request.method.as_str(), request.timeout_secs), ("DELETE", 60));` },
            { label: 'A half-finished builder can be passed on and finished later', body: rs`let partial = RequestBuilder::new("/search").header("Accept: */*");
let finished = partial.timeout(10);
let request = finished.build();
assert_eq!(request.headers.len(), 1);
assert_eq!(request.timeout_secs, 10);` },
            { label: 'build moves the fields without allocating', body: rs`let builder = RequestBuilder::new("/reports/2024").method("PATCH").header("X-Trace: 1");
let before = allocation_count();
let request = builder.build();
assert_eq!(allocation_count() - before, 0, "build must move the builder's strings, not make new ones");
assert_eq!(request.url, "/reports/2024");
assert_eq!(request.method, "PATCH");` },
          ],
        },
        {
          id: 'newtype-units',
          title: 'Meters and feet',
          level: 'core',
          prompt: [
            "A bridge's height is recorded in meters and a truck's in feet. `Meters` and `Feet` are newtypes over `f64`, so the two cannot be confused in a function call. One foot is exactly 0.3048 meters.",
            { list: [
              "`Feet::to_meters` and `Meters::to_feet` convert. The starter relabels the number without changing it.",
              "`Meters::plus` adds two lengths.",
              "`clearance(bridge, truck)` is the room left above the truck, in meters. It is negative when the truck is too tall.",
            ] },
            "The starter's `clearance` shows how a newtype is defeated: it reaches into both values with `.0` and subtracts feet from meters. The types allowed it, because `.0` is a bare `f64` again. Convert first, and stay inside the types.",
          ],
          signature: 'impl Feet { fn to_meters(self) -> Meters }\nimpl Meters { fn to_feet(self) -> Feet; fn plus(self, other: Meters) -> Meters }\nfn clearance(bridge: Meters, truck: Feet) -> Meters',
          prelude: rs`// True when two numbers agree to within rounding.
fn close(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-9
}`,
          starter: rs`#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
struct Meters(f64);

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
struct Feet(f64);

impl Feet {
    fn to_meters(self) -> Meters {
        Meters(self.0)
    }
}

impl Meters {
    fn to_feet(self) -> Feet {
        Feet(self.0)
    }

    fn plus(self, other: Meters) -> Meters {
        self
    }
}

fn clearance(bridge: Meters, truck: Feet) -> Meters {
    Meters(bridge.0 - truck.0)
}`,
          hints: [
            "`self.0` is the `f64` inside. `Meters(self.0 * 0.3048)` wraps the converted number in the other type.",
            "Going the other way divides: `Feet(self.0 / 0.3048)`. `plus` is `Meters(self.0 + other.0)`.",
            "In `clearance`, convert before subtracting: `let truck = truck.to_meters();` and then `Meters(bridge.0 - truck.0)`. Both numbers are meters now.",
          ],
          solution: rs`#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
struct Meters(f64);

#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
struct Feet(f64);

impl Feet {
    fn to_meters(self) -> Meters {
        Meters(self.0 * 0.3048)
    }
}

impl Meters {
    fn to_feet(self) -> Feet {
        Feet(self.0 / 0.3048)
    }

    fn plus(self, other: Meters) -> Meters {
        Meters(self.0 + other.0)
    }
}

fn clearance(bridge: Meters, truck: Feet) -> Meters {
    let truck = truck.to_meters();
    Meters(bridge.0 - truck.0)
}`,
          solutionNote: "The receivers are `self`, by value, and the values can still be used after a call. That is because both types derive `Copy`: a method that takes `self` consumes the value only when the type is not `Copy`.",
          tests: [
            { label: 'One foot is 0.3048 meters', body: rs`assert!(close(Feet(1.0).to_meters().0, 0.3048));
assert!(close(Feet(10.0).to_meters().0, 3.048));` },
            { label: 'to_feet goes the other way', body: rs`assert!(close(Meters(0.3048).to_feet().0, 1.0));
assert!(close(Meters(3.048).to_feet().0, 10.0));` },
            { label: 'A round trip ends where it began', body: rs`let start = Meters(12.5);
let back = start.to_feet().to_meters();
assert!(close(back.0, start.0), "got {back:?}");` },
            { label: 'plus adds two lengths', body: rs`assert_eq!(Meters(1.5).plus(Meters(2.0)), Meters(3.5));` },
            { label: 'clearance converts the truck to meters first', body: rs`let room = clearance(Meters(4.0), Feet(10.0));
assert!(close(room.0, 0.952), "4 m minus 10 ft is 0.952 m, got {room:?}");` },
            { label: 'clearance is negative when the truck is too tall', body: rs`assert!(clearance(Meters(3.0), Feet(13.0)) < Meters(0.0));
assert!(clearance(Meters(4.5), Feet(13.0)) > Meters(0.0));` },
          ],
        },
        {
          id: 'bounded-stack',
          title: 'A stack that never allocates',
          level: 'stretch',
          track: true,
          prompt: [
            "A `BoundedStack` holds up to `CAPACITY` numbers in an array inside the struct, and a count of how many are in use. Nothing lives on the heap, so the tests check that not one allocation is made.",
            { list: [
              "`new` makes an empty stack. `len`, `is_empty` and `is_full` report on it.",
              "`push` adds a value on top and returns `true`. On a full stack it changes nothing and returns `false`.",
              "`pop` removes the top value and returns it in `Some`, or returns `None` when the stack is empty. `peek` does the same without removing anything.",
              "`as_slice` borrows the values in use, oldest first. Slots beyond `len` are not part of the stack, whatever they happen to hold.",
            ] },
            "The whole design rests on one fact that every method must keep true: `len` is never larger than `CAPACITY`, and the values in use are `items[0]` to `items[len - 1]`.",
          ],
          signature: 'impl BoundedStack {\n    fn new() -> Self\n    fn len(&self) -> usize\n    fn is_empty(&self) -> bool\n    fn is_full(&self) -> bool\n    fn push(&mut self, value: i32) -> bool\n    fn pop(&mut self) -> Option<i32>\n    fn peek(&self) -> Option<i32>\n    fn as_slice(&self) -> &[i32]\n}',
          prelude: rs`const CAPACITY: usize = 4;`,
          starter: rs`struct BoundedStack {
    items: [i32; CAPACITY],
    len: usize,
}

impl BoundedStack {
    fn new() -> Self {
        Self { items: [0; CAPACITY], len: 0 }
    }

    fn len(&self) -> usize {
        self.len
    }

    fn is_empty(&self) -> bool {
        true
    }

    fn is_full(&self) -> bool {
        false
    }

    fn push(&mut self, value: i32) -> bool {
        false
    }

    fn pop(&mut self) -> Option<i32> {
        None
    }

    fn peek(&self) -> Option<i32> {
        None
    }

    fn as_slice(&self) -> &[i32] {
        &self.items
    }
}`,
          hints: [
            "`push` writes to `self.items[self.len]` and then adds one to `self.len`, after checking that the stack is not full. `pop` does the reverse: subtract one, then read `self.items[self.len]`.",
            "Check for the empty stack before subtracting. `self.len - 1` on a `usize` of zero panics. `if self.len == 0 { return None; }` at the top of `pop` and `peek` takes care of it.",
            "`as_slice` is `&self.items[..self.len]`. The result borrows from `self`, and lifetime elision gives it the lifetime of `&self` without your writing it.",
          ],
          solution: rs`struct BoundedStack {
    items: [i32; CAPACITY],
    len: usize,
}

impl BoundedStack {
    fn new() -> Self {
        Self { items: [0; CAPACITY], len: 0 }
    }

    fn len(&self) -> usize {
        self.len
    }

    fn is_empty(&self) -> bool {
        self.len == 0
    }

    fn is_full(&self) -> bool {
        self.len == CAPACITY
    }

    fn push(&mut self, value: i32) -> bool {
        if self.is_full() {
            return false;
        }
        self.items[self.len] = value;
        self.len += 1;
        true
    }

    fn pop(&mut self) -> Option<i32> {
        if self.is_empty() {
            return None;
        }
        self.len -= 1;
        Some(self.items[self.len])
    }

    fn peek(&self) -> Option<i32> {
        if self.is_empty() {
            return None;
        }
        Some(self.items[self.len - 1])
    }

    // The values in use, and nothing past them.
    fn as_slice(&self) -> &[i32] {
        &self.items[..self.len]
    }
}`,
          solutionNote: "`pop` does not erase the slot it gives up. It only moves `len`, and `as_slice` stops at `len`, so the stale number can never be seen. A `Vec` works the same way with its length and capacity.",
          tests: [
            { label: 'A new stack is empty', body: rs`let mut stack = BoundedStack::new();
assert_eq!(stack.len(), 0);
assert!(stack.is_empty());
assert!(!stack.is_full());
assert_eq!(stack.peek(), None);
assert_eq!(stack.pop(), None);
assert!(stack.as_slice().is_empty(), "no values are in use yet");` },
            { label: 'pop returns values in the reverse order of push', body: rs`let mut stack = BoundedStack::new();
assert!(stack.push(10));
assert!(stack.push(20));
assert!(stack.push(30));
assert_eq!(stack.len(), 3);
assert_eq!(stack.pop(), Some(30));
assert_eq!(stack.pop(), Some(20));
assert_eq!(stack.pop(), Some(10));
assert_eq!(stack.pop(), None);
assert!(stack.is_empty());` },
            { label: 'peek shows the top and leaves it there', body: rs`let mut stack = BoundedStack::new();
stack.push(7);
stack.push(8);
assert_eq!(stack.peek(), Some(8));
assert_eq!(stack.peek(), Some(8));
assert_eq!(stack.len(), 2);` },
            { label: 'push refuses a fifth value and changes nothing', body: rs`let mut stack = BoundedStack::new();
for value in 1..=4 {
    assert!(stack.push(value), "there is room for {value}");
}
assert!(stack.is_full());
assert!(!stack.push(5), "the stack holds only CAPACITY values");
assert_eq!(stack.len(), 4);
assert_eq!(stack.as_slice(), [1, 2, 3, 4]);` },
            { label: 'as_slice covers only the values in use, oldest first', body: rs`let mut stack = BoundedStack::new();
stack.push(5);
stack.push(6);
stack.push(7);
stack.pop();
assert_eq!(stack.as_slice(), [5, 6]);` },
            { label: 'Room freed by pop is used again', body: rs`let mut stack = BoundedStack::new();
for value in 1..=4 {
    stack.push(value);
}
stack.pop();
stack.pop();
assert!(stack.push(30));
assert!(stack.push(40));
assert!(!stack.push(50));
assert_eq!(stack.as_slice(), [1, 2, 30, 40]);
assert_eq!(stack.peek(), Some(40));` },
            { label: 'Nothing is allocated on the heap', body: rs`let mut stack = BoundedStack::new();
stack.push(1);
stack.push(2);
stack.pop();
let total: i32 = stack.as_slice().iter().sum();
assert_eq!(total, 1);
assert_eq!(allocation_count(), 0, "the values live inside the struct, so nothing needs the heap");` },
          ],
        },
      ],
    },

    {
      id: 'enums-and-matching',
      title: 'Enums & pattern matching',
      category: part,
      minutes: 35,
      summary: 'Types whose values are one of several shapes, and the patterns that tell the shapes apart and take them to pieces, with the compiler checking that no case is forgotten.',
      topics: ['enum', 'Variants with data', 'match', 'Patterns', 'if let and let else', 'Moves in patterns', 'Layout'],
      sections: [
        {
          title: 'An enum is one of several shapes',
          body: [
            "A struct says that a value has this field **and** that field. An **enum** says that a value is this variant **or** that one. You list the variants, and a value of the type is always exactly one of them.",
            { run: rs`#[derive(Debug, Clone, Copy, PartialEq)]
enum Direction {
    North,
    East,
    South,
    West,
}

fn main() {
    let heading = Direction::East;
    let all = [Direction::North, Direction::East, Direction::South, Direction::West];

    println!("{heading:?}");
    println!("{}", heading == Direction::East);
    println!("{all:?}");
}`, name: 'variants.rs', expect: 'East\ntrue\n[North, East, South, West]\n' },
            "A variant lives inside its enum's name, so it is written `Direction::East`. The derives from lesson 11 work on an enum as they do on a struct.",
            { compare: "So far this is the `enum` of PHP 8.1, Python's `enum.Enum`, or a TypeScript union of string literals such as `'north' | 'east'`. Unlike a string, a `Direction` cannot be misspelled, and it cannot hold anything but the four variants listed." },
            "What sets a Rust enum apart is that each variant can carry data of its own, and different variants can carry different data.",
            { run: rs`#[derive(Debug)]
enum Event {
    Quit,                          // no data
    KeyPress(char),                // one value, by position, like a tuple struct
    Click { x: i32, y: i32 },      // named fields, like a struct
    Paste(String),                 // a variant can own heap data
}

fn main() {
    let events = [
        Event::KeyPress('q'),
        Event::Click { x: 40, y: 12 },
        Event::Paste(String::from("hello")),
        Event::Quit,
    ];
    println!("{:?}", events[1]);

    for event in &events {
        match event {
            Event::Quit => println!("quit"),
            Event::KeyPress(key) => println!("key {key}"),
            Event::Click { x, y } => println!("click at {x},{y}"),
            Event::Paste(text) => println!("paste of {} bytes", text.len()),
        }
    }
}`, name: 'payloads.rs', expect: 'Click { x: 40, y: 12 }\nkey q\nclick at 40,12\npaste of 5 bytes\nquit\n' },
            { list: [
              "A variant's name is also how you build a value: `Event::KeyPress('q')`, `Event::Click { x: 40, y: 12 }`, or plain `Event::Quit`.",
              "All four are values of the one type `Event`. They sit in the same array, and a function that takes an `Event` accepts any of them.",
              "An `Event::Paste` owns its `String`. When the `Event` is dropped, the buffer is freed, as it would be for a struct field.",
              "The `match` at the end is how the data comes back out. The next section takes it apart.",
            ] },
            { compare: "TypeScript gets close with a discriminated union, `{ kind: 'click', x: number, y: number } | { kind: 'paste', text: string }`, told apart by a `kind` field that you maintain by hand. Python uses several dataclasses joined in a `Union`, or a class hierarchy and `isinstance`. A PHP enum case cannot carry data of its own, so PHP reaches for subclasses too. In all three the set of cases is open, or is checked only by a separate tool. A Rust enum is closed: every variant is listed in one place, and the compiler knows the list." },
            "The best use of this is to make states that should not exist impossible to write down. Here are two ways to model a network connection.",
            { code: rs`// With a struct, every field exists in every state.
struct ConnectionFlags {
    connected: bool,
    connecting: bool,
    attempt: u32,          // means something only while connecting
    session_id: u32,       // means something only while connected
}

// With an enum, each state has exactly the data that belongs to it.
enum Connection {
    Disconnected,
    Connecting { attempt: u32 },
    Connected { session_id: u32 },
}` },
            "The struct can say `connected: true, connecting: true`. It can hold a `session_id` while disconnected. Every function that receives one has to decide what such a value means, or trust that nobody ever builds it. The enum cannot express either mistake. There is no session id to read unless the value is `Connected`, and it cannot be `Connected` and `Connecting` at once.",
            "You have been using an enum since lesson 2. `Option<T>` is defined in the standard library as `enum Option<T> { None, Some(T) }`, and it is how Rust manages without `null`: a value that may be missing has a different type from one that is always there. Lesson 13 covers `Option` and its sibling `Result` in full. In this lesson, `Some` and `None` are simply two more variants to match on.",
            { fromC: "This is the tagged union from the C course: a `union` for the payload, and beside it an `enum` that says which member is live. In C, keeping the tag and the union in step is your job, and reading the wrong member goes unnoticed. Rust stores the tag for you and will not let you read a payload without checking it." },
          ],
        },
        {
          title: 'match takes them apart',
          body: [
            "Look again at the `match` in that program. Each arm starts with a **pattern**. `Event::Click { x, y }` asks whether the value is the `Click` variant and, if it is, creates two new variables, `x` and `y`, holding its fields. Testing and unpacking are one step, and there is no other way in. An `Event` has no `.x`, because an `Event` that is a `Quit` has no `x` to give:",
            { run: rs`enum Event {
    Quit,
    Click { x: i32, y: i32 },
}

fn main() {
    let event = Event::Click { x: 40, y: 12 };
    println!("{}", event.x);
}`, name: 'no_field.rs', fails: 'E0609' },
            "So a payload can never be read from the wrong variant. And because the compiler knows the full list of variants, it can check that every one of them has an arm. Here a new variant, `Scroll`, has been added to the enum, and `describe` has not caught up:",
            { run: rs`enum Event {
    Quit,
    KeyPress(char),
    Click { x: i32, y: i32 },
    Scroll(i32),                   // new
}

fn describe(event: Event) -> String {
    match event {
        Event::Quit => String::from("quit"),
        Event::KeyPress(key) => format!("key {key}"),
        Event::Click { x, y } => format!("click at {x},{y}"),
    }
}

fn main() {
    println!("{}", describe(Event::Scroll(-3)));
}`, name: 'new_variant.rs', fails: 'E0004' },
            "This is the check that lesson 3 said would matter. Add a variant to an enum, and the compiler walks you through every `match` in the program that needs to learn about it. In Python, PHP or TypeScript the new case would slip into an `else` branch, or into nothing at all, and you would hear about it from a user.",
            { pitfall: "A catch-all arm, `_ => …`, switches that check off for the `match` it is in. A variant added later lands in it without a word. On your own enums, list the variants. Keep `_` for types with too many values to list, such as numbers and text." },
            "A `match` is an expression, as in lesson 3. Each arm produces a value, and a payload is in scope only inside its own arm.",
            { run: rs`#[derive(Clone, Copy)]
enum Transaction {
    Deposit(u32),
    Withdraw(u32),
    Fee { percent: u32 },
    Close,
}

fn apply(balance: u32, transaction: Transaction) -> u32 {
    match transaction {
        Transaction::Deposit(amount) => balance + amount,
        Transaction::Withdraw(amount) => balance.saturating_sub(amount),
        Transaction::Fee { percent } => balance - balance * percent / 100,
        Transaction::Close => 0,
    }
}

fn main() {
    let history = [
        Transaction::Deposit(200),
        Transaction::Withdraw(50),
        Transaction::Fee { percent: 10 },
        Transaction::Withdraw(500),
        Transaction::Deposit(40),
        Transaction::Close,
    ];

    let mut balance = 0;
    for transaction in history {
        balance = apply(balance, transaction);
        print!("{balance} ");
    }
    println!();
}`, name: 'apply.rs', expect: '200 150 135 0 40 0 \n' },
            { compare: "A `switch` on the `kind` field of a TypeScript union narrows the type inside each `case`, which is the nearest relative. Getting it to complain about a missing case takes a trick with the `never` type in the `default` branch. Python's `match` and PHP's `match` check nothing ahead of time. In Rust the complaint is the default, and it costs nothing to keep." },
          ],
        },
        {
          title: 'The pattern language',
          body: [
            "Lesson 3 covered literals, ranges, `|`, `_` and guards. Patterns go further: they can follow the shape of any value, to any depth. A pattern does two jobs at once. It **tests** whether the value has a certain shape, and it **binds** names to the parts you ask for.",
            { table: {
              head: ['Pattern', 'Fits', 'Binds'],
              rows: [
                ['`name`', 'Anything', 'The whole value, as `name`'],
                ['`_`', 'Anything', 'Nothing'],
                ['`Point { x, y }`', 'Any `Point`', 'Both fields'],
                ['`Point { x: 0, y }`', 'A `Point` whose `x` is 0', '`y`'],
                ['`Point { x, .. }`', 'Any `Point`', '`x`. The `..` stands for the fields you leave out'],
                ['`(a, _)` and `[first, .., last]`', 'Tuples, arrays and slices', 'The parts that are named'],
                ["`Event::KeyPress('a'..='z')`", 'That variant, when its payload fits the inner pattern', 'Nothing'],
                ['`Some(Event::Click { x, .. })`', 'Patterns nest to any depth', '`x`'],
                ['`n @ 1..=9`', 'A value in the range', 'That value, as `n`'],
                ['`&value`', 'A reference', 'What the reference points at, which must be `Copy`'],
                ['`pattern if condition`', 'The pattern, when the condition also holds', 'Whatever the pattern binds'],
              ],
            } },
            "Struct patterns first. A field can be tested against a value, bound to a variable or skipped, in any mix.",
            { run: rs`struct Point {
    x: i32,
    y: i32,
}

fn locate(point: Point) -> String {
    match point {
        Point { x: 0, y: 0 } => String::from("at the origin"),
        Point { x, y: 0 } => format!("on the x axis at {x}"),
        Point { x: 0, y } => format!("on the y axis at {y}"),
        Point { x, y } if x == y => format!("on the diagonal at {x}"),
        Point { x, .. } if x < 0 => String::from("somewhere on the left"),
        Point { .. } => String::from("somewhere on the right"),
    }
}

fn main() {
    for (x, y) in [(0, 0), (3, 0), (0, -2), (4, 4), (-1, 5), (2, 7)] {
        println!("{}", locate(Point { x, y }));
    }
}`, name: 'struct_patterns.rs', expect: 'at the origin\non the x axis at 3\non the y axis at -2\non the diagonal at 4\nsomewhere on the left\nsomewhere on the right\n' },
            "Patterns nest. An enum inside an `Option` is matched in one step, and the innermost payload can be tested against a range or a list of alternatives. `name @ pattern` tests the value against the pattern and also keeps it under a name, which a bare range cannot do.",
            { run: rs`enum Event {
    KeyPress(char),
    Click { x: i32, y: i32 },
    Scroll(i32),
}

fn react(event: Option<Event>) -> String {
    match event {
        None => String::from("nothing happened"),
        Some(Event::KeyPress(digit @ '0'..='9')) => format!("digit {digit}"),
        Some(Event::KeyPress('q' | 'Q')) => String::from("quit"),
        Some(Event::KeyPress(other)) => format!("key {other}"),
        Some(Event::Click { x, y: 0..=20 }) => format!("toolbar, column {x}"),
        Some(Event::Click { .. }) => String::from("click in the page"),
        Some(Event::Scroll(lines @ (-3..=-1 | 1..=3))) => format!("small scroll of {lines}"),
        Some(Event::Scroll(lines)) => format!("scroll of {lines}"),
    }
}

fn main() {
    let events = [
        Some(Event::KeyPress('7')),
        Some(Event::KeyPress('Q')),
        Some(Event::KeyPress('x')),
        Some(Event::Click { x: 300, y: 12 }),
        Some(Event::Click { x: 300, y: 400 }),
        Some(Event::Scroll(-2)),
        Some(Event::Scroll(40)),
        None,
    ];
    for event in events {
        println!("{}", react(event));
    }
}`, name: 'nested.rs', expect: 'digit 7\nquit\nkey x\ntoolbar, column 300\nclick in the page\nsmall scroll of -2\nscroll of 40\nnothing happened\n' },
            { pitfall: "A bare name in a pattern always creates a new variable. `match n { limit => … }` does not compare `n` with a variable called `limit` that happens to exist. It fits every value and calls it `limit`. To compare against a variable, use a guard: `x if x == limit`." },
            "Patterns are not only for `match`. Every `let`, every function parameter and every `for` takes one. You have been writing the simplest pattern, a bare name, all along.",
            { run: rs`struct Point {
    x: i32,
    y: i32,
}

fn length_squared(&Point { x, y }: &Point) -> i32 {          // a pattern in a parameter
    x * x + y * y
}

fn main() {
    let (name, age) = ("Ada", 36);                           // a tuple pattern
    let Point { x, y: height } = Point { x: 3, y: 4 };       // a struct pattern that renames y
    let [first, .., last] = [10, 20, 30, 40];                // an array pattern
    println!("{name} {age} {x} {height} {first} {last}");

    for (index, letter) in ['a', 'b'].iter().enumerate() {   // a tuple pattern in a for
        println!("{index} {letter}");
    }
    println!("{}", length_squared(&Point { x: 3, y: 4 }));
}`, name: 'everywhere.rs', expect: 'Ada 36 3 4 10 40\n0 a\n1 b\n25\n' },
            "These places have no second arm to fall back on, so they accept only a pattern that cannot fail, which is called **irrefutable**. `(name, age)` fits every pair, and `Point { x, y }` fits every `Point`. `Some(n)` does not fit every `Option`. It is **refutable**, and a plain `let` turns it down:",
            { run: rs`fn main() {
    let numbers = [3, 8];
    let first = numbers.first();       // an Option<&i32>: None when there are no elements
    let Some(n) = first;
    println!("{n}");
}`, name: 'refutable.rs', fails: 'E0005' },
            "The message names the case that is not covered, and its `help:` line points at `let … else`, which is in the next section.",
            { compare: "Destructuring in JavaScript (`const { x, y } = point`) and unpacking in Python (`a, b = pair`) are the irrefutable half of this. Python's `match` statement has most of the rest, including `|`, guards and class patterns. What neither has is the checking: that a `let` pattern cannot fail, and that the arms of a `match` leave nothing out." },
          ],
        },
        {
          title: 'if let, let else, while let and matches!',
          body: [
            "A `match` with one interesting arm and a `_ => {}` beside it is common enough to have shorter forms. Each of them takes a refutable pattern and says what happens when it does not fit.",
            { run: rs`#[derive(Clone, Copy)]
enum Reading {
    Celsius(f64),
    Humidity(u8),
    Offline,
}

// if let: a block that runs when the pattern fits, and an optional else for when it does not.
fn humidity_bar(reading: Reading) -> String {
    if let Reading::Humidity(percent) = reading {
        "#".repeat(percent as usize / 10)
    } else {
        String::from("-")
    }
}

// let else: bind when the pattern fits, or leave. The else block may not fall through.
fn to_fahrenheit(reading: Reading) -> Option<f64> {
    let Reading::Celsius(degrees) = reading else {
        return None;
    };
    Some(degrees * 9.0 / 5.0 + 32.0)
}

fn main() {
    for reading in [Reading::Celsius(20.0), Reading::Humidity(60), Reading::Offline] {
        // matches!: does the pattern fit? It gives a bool and binds nothing.
        let online = !matches!(reading, Reading::Offline);
        println!("{:<6} {:?} {online}", humidity_bar(reading), to_fahrenheit(reading));
    }
}`, name: 'shorter_forms.rs', expect: '-      Some(68.0) true\n###### None true\n-      None false\n' },
            { list: [
              "**`if let pattern = value { … }`** runs the block when the pattern fits, with its bindings in scope. Like any `if`, it can have an `else` and can be used for its value.",
              "**`let pattern = value else { … };`** is the reverse. When the pattern fits, its bindings are ordinary variables for the rest of the function, with no extra nesting. When it does not, the `else` block runs, and that block must leave: `return`, `break`, `continue` or a panic. Those have the never type from lesson 3, which is how the compiler knows that execution cannot carry on without the bindings.",
              "**`matches!(value, pattern)`** is a `bool`. Use it in a condition when you need to know the variant and nothing inside it.",
            ] },
            "`let else` is the guard clause you write at the top of a function in any language: check for the bad case and return early. The difference is what you hold afterwards. In TypeScript, after `if (user === null) return;` the variable is still the same nullable one, and a type checker has to work out that it is safe. Here the line produces a new variable of the payload's own type.",
            "**`while let`** repeats for as long as the pattern fits. `pop` takes the last element off a `Vec` and returns it in a `Some`, or returns `None` when there is nothing left, so the pair works through a stack until it is empty. That holds even when the body pushes more work onto it.",
            { run: rs`fn main() {
    let mut stack = vec![1, 2, 3];

    while let Some(top) = stack.pop() {
        print!("{top} ");
        if top == 3 {
            stack.push(10);            // the loop will see this one too
        }
    }
    println!();
    println!("{} left", stack.len());
}`, name: 'while_let.rs', expect: '3 10 2 1 \n0 left\n' },
            { pitfall: "An `if let` followed by a chain of `else if let` is a `match` in disguise, and it has lost the exhaustiveness check: a new variant falls silently into the final `else`. When you find yourself testing a third variant, write the `match`." },
            { native: "Clippy knows these forms. It suggests `if let` for a `match` with one real arm, and `matches!` for a `match` that only produces `true` and `false`. In rust-analyzer, the quick fix \"Fill match arms\" on an unfinished `match` writes one arm for every missing variant." },
          ],
        },
        {
          title: 'Matching borrows or moves',
          body: [
            "A pattern that binds a name has to get the payload into that name somehow. For a `Copy` payload such as a number, it copies. For a payload that owns something, the rules of Part 2 apply, and there are the usual three choices: borrow it, borrow it mutably, or move it.",
            "The first program in this lesson looped over `&events`, so its `match` was looking at references, and nothing was moved. Without that `&`, the `match` is given the value itself, and each binding takes its payload **by value**. For a `String` that is a move out of the enum. If the enum stayed usable afterwards, the binding and the enum would both own one buffer, which is the double free from lesson 5. So the compiler treats the enum as partially moved, as it does a struct with a field taken out:",
            { run: rs`#[derive(Debug)]
enum Entry {
    Note(String),
    Todo { title: String, done: bool },
    Divider,
}

fn main() {
    let entry = Entry::Note(String::from("call the bank"));

    match entry {
        Entry::Note(text) => println!("note of {} bytes", text.len()),
        Entry::Todo { title, done } => println!("{title}: {done}"),
        Entry::Divider => println!("----"),
    }

    println!("{entry:?}");
}`, name: 'match_moves.rs', fails: 'E0382' },
            "Nothing in the arm needed to own the text. It only asked for its length. The standard fixes follow from what the arm really needs:",
            { list: [
              "**Match on a reference** when the arms only look: `match &entry`. Every binding becomes a shared reference to the payload, and the enum is untouched. This is the fix nine times out of ten.",
              "**Match on a mutable reference** when an arm changes a payload in place: `match &mut entry` makes every binding a `&mut`.",
              "**Bind nothing** when you only need to know the variant. `Entry::Note(_)` and `Entry::Todo { .. }` test without taking anything.",
              "**Let it move** when you are finished with the enum and want to keep what was inside. That is what matching by value is for.",
            ] },
            { run: rs`#[derive(Debug)]
enum Entry {
    Note(String),
    Todo { title: String, done: bool },
    Divider,
}

fn main() {
    let mut entries = [
        Entry::Note(String::from("call the bank")),
        Entry::Todo { title: String::from("buy milk"), done: false },
        Entry::Divider,
    ];

    for entry in &entries {                    // entry is a &Entry
        match entry {
            Entry::Note(text) => println!("note: {text}"),                      // text is a &String
            Entry::Todo { title, done } => println!("todo: {title}, done: {done}"),
            Entry::Divider => println!("----"),
        }
    }

    for entry in &mut entries {                // entry is a &mut Entry
        match entry {
            Entry::Note(text) => text.push('!'),                                // text is a &mut String
            Entry::Todo { done, .. } => *done = true,                           // done is a &mut bool
            Entry::Divider => {}
        }
    }
    println!("{:?}", entries[1]);

    for entry in entries {                     // entry is an Entry, and the loop owns it
        match entry {
            Entry::Note(text) => println!("kept {text}"),                       // text is a String
            Entry::Todo { title, .. } => println!("kept {title}"),
            Entry::Divider => println!("nothing to keep"),
        }
    }
}`, name: 'match_refs.rs', expect: 'note: call the bank\ntodo: buy milk, done: false\n----\nTodo { title: "buy milk", done: true }\nkept call the bank!\nkept buy milk\nnothing to keep\n' },
            "The three loops hand out `&Entry`, `&mut Entry` and `Entry` in turn, and lesson 14 looks at those loop forms. The patterns are identical in all three. When the value being matched is a reference and the pattern is written without a `&`, the compiler looks through the reference and makes every binding a reference of the same kind. You write `Entry::Note(text)` each time, and get a `&String`, a `&mut String` or a `String` depending on what you matched on.",
            "What you cannot do is go through a reference and then take the payload by value. The function below was lent an `Entry` and tries to walk off with the `String` inside it:",
            { run: rs`enum Entry {
    Note(String),
    Divider,
}

fn text_of(entry: &Entry) -> String {
    match *entry {
        Entry::Note(text) => text,
        Entry::Divider => String::from("----"),
    }
}

fn main() {
    let note = Entry::Note(String::from("call the bank"));
    println!("{} {}", text_of(&note), text_of(&Entry::Divider));
}`, name: 'move_out_of_borrow.rs', fails: 'E0507' },
            "The `help:` line says to drop the `*`. Then `text` is a `&String`, and the function has to be honest about what it returns: a borrow of the entry's text, or a clone of it. Returning the borrow costs nothing, and lifetime elision ties the result to `entry`.",
            { run: rs`enum Entry {
    Note(String),
    Divider,
}

fn text_of(entry: &Entry) -> &str {
    match entry {
        Entry::Note(text) => text,         // a &String, which passes as a &str
        Entry::Divider => "----",
    }
}

fn main() {
    let note = Entry::Note(String::from("call the bank"));
    println!("{} {}", text_of(&note), text_of(&Entry::Divider));
}`, name: 'borrow_from_enum.rs', expect: 'call the bank ----\n' },
            { aside: "Older code, and the compiler's own suggestion in the first error above, use the keyword `ref` inside a pattern: `Entry::Note(ref text)` binds `text` as a reference instead of moving the payload. Matching on `&entry` does that for every binding at once, and it is what people write now." },
            { compare: "In Python's `match`, in TypeScript's narrowing and in PHP, taking a field out of an object gives you one more reference to the same data, and the question of who owns it never comes up. In Rust a pattern is one more place where a value can move. The same three choices appear as everywhere else, and you make the choice by what you match on." },
          ],
        },
        {
          title: 'Enums have methods too',
          body: [
            "An enum takes an `impl` block as a struct does, and the three receivers mean what they meant in lesson 11. The body of a method is usually a `match self`. Here is the connection from the first section, with its behavior attached.",
            { run: rs`#[derive(Debug)]
enum Connection {
    Disconnected,
    Connecting { attempt: u32 },
    Connected { session: u32 },
}

impl Connection {
    fn new() -> Self {
        Self::Disconnected                         // Self works for variants too
    }

    fn is_up(&self) -> bool {
        matches!(self, Self::Connected { .. })
    }

    fn describe(&self) -> String {                 // self is a &Connection, so nothing moves
        match self {
            Self::Disconnected => String::from("offline"),
            Self::Connecting { attempt } => format!("connecting, attempt {attempt}"),
            Self::Connected { session } => format!("online, session {session}"),
        }
    }

    // Takes the old state and returns the new one.
    fn dial(self) -> Self {
        match self {
            Self::Disconnected => Self::Connecting { attempt: 1 },
            Self::Connecting { attempt } if attempt < 3 => Self::Connecting { attempt: attempt + 1 },
            Self::Connecting { .. } => Self::Disconnected,              // give up after three attempts
            Self::Connected { session } => Self::Connected { session }, // already up: no change
        }
    }

    fn answered(self, session: u32) -> Self {
        match self {
            Self::Connecting { .. } => Self::Connected { session },
            other => other,                        // a bare name fits anything, and keeps it
        }
    }
}

fn main() {
    let mut line = Connection::new();
    for _ in 0..5 {
        line = line.dial();
        println!("{}", line.describe());
    }

    line = line.answered(77);
    println!("{}, up: {}", line.describe(), line.is_up());

    line = line.dial();
    println!("{line:?}");
}`, name: 'methods.rs', expect: 'connecting, attempt 1\nconnecting, attempt 2\nconnecting, attempt 3\noffline\nconnecting, attempt 1\nonline, session 77, up: true\nConnected { session: 77 }\n' },
            "`dial` and `answered` take `self` by value and return the next state. The caller writes `line = line.dial();`, and the old state is gone the moment the new one exists. A state machine written this way cannot be left half updated, and no state can hold another state's data. `describe` and `is_up` take `&self`, so they match on a reference and move nothing.",
            { compare: "In Python, PHP or TypeScript this would be a class with a `state` field, some other fields that are valid only in some states, and methods that begin by checking `state`. Each of those checks runs every time and can be forgotten. Here the checks are the arms of a `match`, and a forgotten one does not compile." },
          ],
        },
        {
          title: 'What an enum costs: a tag and the largest payload',
          body: [
            "An enum value has to be large enough for its biggest variant, plus a small number that records which variant it currently is. That number is the **tag**. The Rust documentation calls it the discriminant.",
            { run: rs`#![allow(dead_code)]           // these types are only measured, never used
use std::mem::size_of;

enum Direction { North, East, South, West }

enum Pixel {
    Off,
    Gray(u8),
    Rgb(u8, u8, u8),
}

enum Event {
    Quit,
    KeyPress(char),
    Click { x: i32, y: i32 },
}

fn main() {
    println!("Direction: {}", size_of::<Direction>());    // a tag and nothing else
    println!("Pixel: {}", size_of::<Pixel>());            // a tag and room for three bytes
    println!("Event: {}", size_of::<Event>());            // a tag and room for two i32
    println!("{}", Direction::South as u8);               // the tag of a variant without data
}`, name: 'sizes.rs', expect: 'Direction: 1\nPixel: 4\nEvent: 12\n2\n' },
            { strip: {
              title: 'A `Pixel` is four bytes, whichever variant it holds',
              kicker: 'Pixel::Rgb(255, 165, 0)',
              cells: [2, 255, 165, 0],
              marks: [{ at: 0, label: 'tag' }, { at: 1, span: 3, label: 'payload' }],
              caption: "The first byte says which variant this is, and the compiler picks the numbers: here 0 for `Off`, 1 for `Gray` and 2 for `Rgb`. The other three bytes are the payload of the largest variant.",
            } },
            { strip: {
              title: 'The same four bytes holding a `Gray`',
              kicker: 'Pixel::Gray(128)',
              cells: [1, 128, null, null],
              marks: [{ at: 0, label: 'tag' }, { at: 1, label: 'payload' }],
              dim: [2, 3],
              caption: "A smaller variant leaves the rest unused. `Pixel::Off` uses the tag alone. A `match` reads the tag first, and that is the only way the program knows what the other bytes mean.",
            } },
            "Nothing is on the heap unless a payload puts it there, and there is no pointer to follow: an array of a thousand `Pixel` values is 4,000 bytes side by side. The price is that every value is as large as the largest variant. One rarely used variant with a big payload makes all of them big.",
            { fromC: "The layout is the one you would write by hand in C: `struct { uint8_t tag; union { … } payload; }`. `sizeof` follows the same rule, the largest member plus the tag, rounded up for alignment." },
            "The compiler leaves the tag out when the payload has bit patterns to spare. A reference is never null, so an `Option<&T>` uses the null address to mean `None` and is the same size as a plain reference. So is an `Option<Box<T>>`. `Option` replaced the null pointer, and where a null pointer would have done the job it costs exactly as much.",
            { run: rs`use std::mem::size_of;

fn main() {
    // Every bit pattern of a u32 is a valid number, so the Option needs a tag of its own.
    println!("{} {}", size_of::<u32>(), size_of::<Option<u32>>());
    // A reference and a Box are never null, so None can be the null address.
    println!("{} {}", size_of::<&u32>(), size_of::<Option<&u32>>());
    println!("{} {}", size_of::<Box<u32>>(), size_of::<Option<Box<u32>>>());
}`, name: 'niche.rs', expect: '4 8\n8 8\n8 8\n' },
            "An enum can contain itself, and that is how trees are built. The size rule gets in the way: a variant that held another value of its own type directly would need room for itself inside itself. So a recursive variant holds a `Box`, the owning pointer from lesson 4, which has a fixed size whatever it points at. Lesson 20 tells the full story.",
            { run: rs`enum Tree {
    Leaf(i32),
    Node(Box<Tree>, Box<Tree>),
}

fn sum(tree: &Tree) -> i32 {
    match tree {
        Tree::Leaf(value) => *value,                           // value is a &i32
        Tree::Node(left, right) => sum(left) + sum(right),     // left is a &Box<Tree>
    }
}

fn main() {
    let tree = Tree::Node(
        Box::new(Tree::Leaf(1)),
        Box::new(Tree::Node(Box::new(Tree::Leaf(2)), Box::new(Tree::Leaf(3)))),
    );
    println!("{}", sum(&tree));
}`, name: 'tree.rs', expect: '6\n' },
            "`sum(left)` passes a `&Box<Tree>` where a `&Tree` is expected. The compiler looks through the box for you, in the same way that it passes a `&String` where a `&str` is expected.",
            { compare: "Every value in Python, PHP and JavaScript already carries a tag: the type information in its object header, which is what `isinstance`, `instanceof` and `typeof` read. Rust has no such header. An enum is the one place where a value says at run time what it is, and it pays for that with a byte or so, in line, with no allocation." },
          ],
        },
      ],
      takeaways: [
        "An enum value is exactly one of its variants, and each variant can carry data of its own. Use one where a struct would need flags and fields that only sometimes mean something.",
        "A `match` on an enum must cover every variant. Avoid `_` on your own enums, so that a new variant shows up as a compile error at every `match`.",
        "A pattern tests a shape and binds its parts, to any depth. `let`, parameters and `for` take patterns that cannot fail. `if let`, `let else` and `while let` take the ones that can.",
        "Binding a payload by value moves it. Match on `&value` to look, on `&mut value` to change, and on the value itself to take.",
        "An enum is as large as its largest variant plus a tag. The tag disappears where the payload has a spare bit pattern, as in `Option<&T>`.",
      ],
      quiz: [
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`#[derive(Clone, Copy)]
enum Reading {
    Celsius(i32),
    Offline,
}

fn label(reading: Reading) -> &'static str {
    match reading {
        Reading::Celsius(t) if t < 0 => "ice",
        Reading::Celsius(0..=15) => "cold",
        Reading::Celsius(t) if t % 2 == 0 => "even",
        Reading::Celsius(16..=30) => "mild",
        Reading::Celsius(_) => "hot",
        Reading::Offline => "?",
    }
}

fn main() {
    let readings = [
        Reading::Celsius(0),
        Reading::Celsius(-4),
        Reading::Celsius(22),
        Reading::Celsius(25),
        Reading::Celsius(40),
        Reading::Offline,
    ];
    for reading in readings {
        print!("{} ", label(reading));
    }
    println!();
}`,
          answer: 'cold ice even mild even ?',
          explain: "The arms are tried from the top, and the first one that fits wins. 0 fails the first guard and fits `0..=15`. 22 is in `16..=30`, but the arm with the guard `t % 2 == 0` comes first. 25 fails that guard and falls to `mild`. 40 is even, so it never reaches `hot`.",
          hint: "For each value, start at the top arm every time. An arm with a guard fits only when its condition is true.",
        },
        {
          q: 'Does this program compile?',
          code: rs`enum Status {
    Active,
    Suspended { days: u32 },
    Closed,
}

fn can_log_in(status: &Status) -> bool {
    match status {
        Status::Active => true,
        Status::Suspended { days } if *days == 0 => true,
        Status::Closed => false,
    }
}

fn main() {
    println!("{}", can_log_in(&Status::Suspended { days: 3 }));
    println!("{} {}", can_log_in(&Status::Active), can_log_in(&Status::Closed));
}`,
          options: [
            { t: 'No: `Suspended` is handled only when the guard holds, so some values have no arm', ok: true, why: "An arm with a guard covers only the values that pass it, and the compiler does not try to work out which those are. `Suspended { days: 3 }` has nowhere to go. The error is `E0004`, with a note that arms with guards do not count." },
            { t: 'Yes: every variant appears in an arm', why: "Appearing is not enough when the arm has an `if`. The compiler counts a guarded arm as covering nothing for certain, so `Suspended` still needs an arm without a guard." },
            { t: 'Yes, and a suspension with days left makes the `match` produce `false`', why: "There is no default result. PHP's `match` throws at run time when nothing fits, and Python's does nothing. Rust refuses to build the program." },
            { t: 'No: a pattern cannot be followed by `if`', why: "It can. That is a guard, from lesson 3, and this one is fine. What is missing is an arm for when the guard is false." },
          ],
          verify: 'E0004',
        },
        {
          q: 'Does this program compile?',
          code: rs`#[derive(Debug)]
enum Job {
    Email { to: String, body: String },
    Sleep(u32),
}

fn main() {
    let job = Job::Sleep(5);
    match job {
        Job::Email { to, .. } => println!("mail for {to}"),
        Job::Sleep(seconds) => println!("sleep for {seconds}"),
    }
    println!("{job:?}");
}`,
          options: [
            { t: 'No: the `Email` arm moves `to` out of `job`, so `job` cannot be used as a whole afterwards', ok: true, why: "`match job` matches by value, and `to` is a `String`, so that arm moves it. The compiler reports `E0382` on line 13. `match &job` fixes it." },
            { t: 'Yes: when it runs, `job` is a `Sleep`, whose payload is `Copy`, so nothing moves', why: "Moves are decided when the program is compiled, from the code and not from the values. The compiler has to allow for the `Email` arm running, whatever `job` holds this time." },
            { t: 'Yes: a `match` only inspects its value', why: "That is true when you match on a reference. Matching on `job` itself lets every binding take its payload by value." },
            { t: 'No: the `..` in the pattern moves every remaining field of the variant', why: "`..` ignores the fields it stands for and moves nothing. Only `to` was bound, so only `to` can move. The program is rejected because of `to` alone." },
          ],
          verify: 'E0382',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let mut stack = vec![1, 2, 3];
    let mut total = 0;

    while let Some(top) = stack.pop() {
        if top % 2 == 1 && top > 1 {
            stack.push(top - 1);
        }
        total += top;
        print!("{top} ");
    }
    println!("= {total}");
}`,
          answer: '3 2 2 1 = 8',
          explain: "`pop` takes from the end, so 3 comes first. It is odd and above 1, so a 2 is pushed, and the stack is `[1, 2, 2]`. Both 2s come off next, then 1, which is odd but not above 1. `pop` then returns `None`, the pattern no longer fits, and the loop ends.",
          hint: "Write the stack down after each pass. `pop` removes the last element, and `push` adds a new last element.",
        },
        {
          q: 'How many bytes is a `Packet`?',
          code: rs`#![allow(dead_code)]

enum Packet {
    Ping,
    Data([u8; 6]),
    Ack(u8),
}

fn main() {
    println!("{}", std::mem::size_of::<Packet>());
}`,
          options: [
            { t: '`7`', ok: true, why: "Six bytes for the largest payload, `Data`, and one for the tag. Every field is a `u8`, so nothing needs padding." },
            { t: '`6`', why: "That is the largest payload with nowhere to record which variant is present. A `[u8; 6]` has no spare bit patterns for the compiler to use, so the tag needs a byte of its own." },
            { t: '`8`', why: "That adds up all the payloads, six and one, plus a tag. A struct works like that. In an enum only one variant exists at a time, so the variants share the same bytes." },
            { t: '`1`', why: "That is the tag alone. The payload is stored in the value itself, not behind a pointer as the fields of a Python or JavaScript object are." },
          ],
          verify: true,
        },
        {
          kind: 'multi',
          q: 'Given `pair: (i32, i32)`, `point: Point` with fields `x` and `y`, and `maybe: Option<i32>`, which of these `let` statements compile?',
          options: [
            { t: '`let (a, b) = pair;`', ok: true, why: "A tuple pattern made of names fits every pair." },
            { t: '`let Point { x, .. } = point;`', ok: true, why: "A struct has only one shape, so a struct pattern that tests no field values always fits." },
            { t: '`let Some(n) = maybe;`', why: "`maybe` could be `None`, and a plain `let` has nowhere to go then. This is `E0005`. Use `if let`, `let … else` or a `match`." },
            { t: '`let (0, b) = pair;`', why: "The literal `0` is a test that can fail. A pattern is irrefutable only if every part of it is." },
            { t: '`let n = maybe;`', ok: true, why: "A bare name fits anything. Here `n` is the whole `Option<i32>`, not the number inside it." },
            { t: '`let _ = maybe;`', ok: true, why: "`_` fits anything and binds nothing." },
          ],
          hint: "Ask of each one: is there any value of that type the pattern would not fit?",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn classify(n: u32) -> String {
    match n {
        0 => String::from("zero"),
        small @ 1..=9 => format!("digit {small}"),
        teen @ 13..=19 if teen % 2 == 1 => format!("odd teen {teen}"),
        other @ 10..=99 => format!("ends in {}", other % 10),
        _ => String::from("big"),
    }
}

fn main() {
    for n in [7, 15, 16, 40, 100] {
        println!("{}", classify(n));
    }
}`,
          answer: 'digit 7\nodd teen 15\nends in 6\nends in 0\nbig',
          explain: "`name @ range` tests the value against the range and binds it to the name, so the arm can use the number it matched. 16 is in `13..=19` but fails the guard, so it moves on to the next arm, where `other` is 16.",
          hint: "The name before `@` holds the whole value that was matched, not the start of the range.",
        },
      ],
      challenges: [
        {
          id: 'shape-area',
          title: 'The area of a shape',
          level: 'warm-up',
          prompt: [
            "Return the area of a `Shape`. The starter handles circles and sends everything else to a `_` arm that returns zero.",
            "Replace the `_` arm with one arm for each remaining variant. With no `_`, the compiler tells you if you leave one out. A triangle's area is half of its base times its height.",
          ],
          signature: 'fn area(shape: Shape) -> f64',
          prelude: rs`#[derive(Debug, Clone, Copy, PartialEq)]
enum Shape {
    Circle { radius: f64 },
    Rect { width: f64, height: f64 },
    Triangle { base: f64, height: f64 },
    Square(f64),
}`,
          starter: rs`use std::f64::consts::PI;

fn area(shape: Shape) -> f64 {
    match shape {
        Shape::Circle { radius } => PI * radius * radius,
        _ => 0.0,
    }
}`,
          hints: [
            "A variant with named fields is matched as `Shape::Rect { width, height }`, and the names become variables inside the arm.",
            "A variant with a positional field is matched as `Shape::Square(side)`. You choose the name.",
            "`Shape::Triangle { base, height } => base * height / 2.0,` and the other two follow the same shape.",
          ],
          solution: rs`use std::f64::consts::PI;

fn area(shape: Shape) -> f64 {
    match shape {
        Shape::Circle { radius } => PI * radius * radius,
        Shape::Rect { width, height } => width * height,
        Shape::Triangle { base, height } => base * height / 2.0,
        Shape::Square(side) => side * side,
    }
}`,
          tests: [
            { label: 'A circle: pi times the radius squared', body: rs`let got = area(Shape::Circle { radius: 2.0 });
assert!((got - 12.566370614359172).abs() < 1e-9, "got {got}");` },
            { label: 'A rectangle: width times height', body: rs`assert_eq!(area(Shape::Rect { width: 3.0, height: 4.5 }), 13.5);` },
            { label: 'A triangle: half of base times height', body: rs`assert_eq!(area(Shape::Triangle { base: 6.0, height: 5.0 }), 15.0);` },
            { label: 'A square: the side squared', body: rs`assert_eq!(area(Shape::Square(1.5)), 2.25);` },
            { label: 'A shape with a zero side has no area', body: rs`assert_eq!(area(Shape::Rect { width: 0.0, height: 9.0 }), 0.0);
assert_eq!(area(Shape::Square(0.0)), 0.0);
assert_eq!(area(Shape::Circle { radius: 0.0 }), 0.0);` },
          ],
        },
        {
          id: 'traffic-light',
          title: 'A traffic light',
          level: 'warm-up',
          prompt: [
            "Give `Light` its three methods. Each one is a `match self` with an arm for every variant.",
            { list: [
              "`next` returns the light that follows: red, then green, then yellow, then red again.",
              "`seconds` is how long the light stays on: 30 for red, 25 for green, 5 for yellow.",
              "`after(changes)` returns the light that is showing after that many changes. `after(0)` is the light itself.",
            ] },
            "`Light` derives `Copy`, so a method that takes `self` does not use the value up.",
          ],
          signature: 'impl Light {\n    fn next(self) -> Light\n    fn seconds(self) -> u32\n    fn after(self, changes: u32) -> Light\n}',
          starter: rs`#[derive(Debug, Clone, Copy, PartialEq)]
enum Light {
    Red,
    Green,
    Yellow,
}

impl Light {
    fn next(self) -> Light {
        self
    }

    fn seconds(self) -> u32 {
        0
    }

    fn after(self, changes: u32) -> Light {
        self
    }
}`,
          hints: [
            "`match self { Light::Red => Light::Green, … }`. Inside the `impl` block you can also write `Self::Red`.",
            "`seconds` has the same shape, with a number on the right of each arrow.",
            "For `after`, keep a `let mut light = self;` and replace it with `light.next()` in a loop that runs `changes` times.",
          ],
          solution: rs`#[derive(Debug, Clone, Copy, PartialEq)]
enum Light {
    Red,
    Green,
    Yellow,
}

impl Light {
    fn next(self) -> Light {
        match self {
            Light::Red => Light::Green,
            Light::Green => Light::Yellow,
            Light::Yellow => Light::Red,
        }
    }

    fn seconds(self) -> u32 {
        match self {
            Light::Red => 30,
            Light::Green => 25,
            Light::Yellow => 5,
        }
    }

    fn after(self, changes: u32) -> Light {
        let mut light = self;
        for _ in 0..changes {
            light = light.next();
        }
        light
    }
}`,
          tests: [
            { label: 'next follows the cycle red, green, yellow', body: rs`assert_eq!(Light::Red.next(), Light::Green);
assert_eq!(Light::Green.next(), Light::Yellow);
assert_eq!(Light::Yellow.next(), Light::Red);` },
            { label: 'Three changes come back to the start', body: rs`for light in [Light::Red, Light::Green, Light::Yellow] {
    assert_eq!(light.next().next().next(), light);
}` },
            { label: 'seconds: 30 for red, 25 for green, 5 for yellow', body: rs`assert_eq!(Light::Red.seconds(), 30);
assert_eq!(Light::Green.seconds(), 25);
assert_eq!(Light::Yellow.seconds(), 5);` },
            { label: 'after(0) is the light itself', body: rs`assert_eq!(Light::Green.after(0), Light::Green);` },
            { label: 'after counts changes around the cycle', body: rs`assert_eq!(Light::Red.after(1), Light::Green);
assert_eq!(Light::Red.after(2), Light::Yellow);
assert_eq!(Light::Yellow.after(4), Light::Red);
assert_eq!(Light::Green.after(300), Light::Green);` },
          ],
        },
        {
          id: 'parse-command',
          title: 'Parse a command',
          level: 'core',
          prompt: [
            "A robot reads one command per line. Turn a line of text into a `Command`:",
            { table: {
              head: ['Line', 'Command'],
              rows: [
                ['`stop`', '`Command::Stop`'],
                ['`forward 12`', '`Command::Forward(12)`, for any whole number that fits a `u32`'],
                ['`turn left`, `turn right`', '`Command::Turn(Side::Left)`, `Command::Turn(Side::Right)`'],
                ['`say` and then any text', '`Command::Say` with the rest of the line, spaces and all'],
                ['Anything else', '`Command::Unknown`'],
              ],
            } },
            "`line.split_once(' ')` cuts a `&str` at its first space. It returns `Some((before, after))`, or `None` when there is no space. The starter matches on that, and string literals work as patterns: `Some((\"turn\", \"left\"))` fits exactly that pair.",
            "`text.parse::<u32>()` returns a `Result`, another enum from the standard library: `Ok(number)` when the text is a number, and `Err(_)` when it is not. Lesson 13 covers it. Here it is two more variants to match on.",
          ],
          signature: 'fn parse_command(line: &str) -> Command',
          prelude: rs`#[derive(Debug, PartialEq)]
enum Side {
    Left,
    Right,
}

#[derive(Debug, PartialEq)]
enum Command {
    Forward(u32),
    Turn(Side),
    Say(String),
    Stop,
    Unknown,
}`,
          starter: rs`fn parse_command(line: &str) -> Command {
    match line.split_once(' ') {
        None if line == "stop" => Command::Stop,
        None => Command::Unknown,
        Some((_verb, _rest)) => Command::Unknown,
    }
}`,
          hints: [
            "Add arms above the last one, most specific first: `Some((\"turn\", \"left\")) => Command::Turn(Side::Left),`.",
            "`Some((\"say\", text)) => Command::Say(String::from(text)),` binds whatever follows the first space.",
            "For `forward`, bind the second half and match again: `Some((\"forward\", steps)) => match steps.parse::<u32>() { Ok(n) => Command::Forward(n), Err(_) => Command::Unknown },`.",
          ],
          solution: rs`fn parse_command(line: &str) -> Command {
    match line.split_once(' ') {
        None if line == "stop" => Command::Stop,
        None => Command::Unknown,
        Some(("forward", steps)) => match steps.parse::<u32>() {
            Ok(steps) => Command::Forward(steps),
            Err(_) => Command::Unknown,
        },
        Some(("turn", "left")) => Command::Turn(Side::Left),
        Some(("turn", "right")) => Command::Turn(Side::Right),
        Some(("say", text)) => Command::Say(String::from(text)),
        Some(_) => Command::Unknown,
    }
}`,
          solutionNote: "The last arm is `Some(_)` and not `_`. `Option` has two variants and will never get a third, so nothing is lost here, but the habit of naming what is left makes the arms easier to read.",
          tests: [
            { label: 'stop, alone on the line', body: rs`assert_eq!(parse_command("stop"), Command::Stop);` },
            { label: 'forward with a number of steps', body: rs`assert_eq!(parse_command("forward 12"), Command::Forward(12));
assert_eq!(parse_command("forward 0"), Command::Forward(0));` },
            { label: 'turn left and turn right', body: rs`assert_eq!(parse_command("turn left"), Command::Turn(Side::Left));
assert_eq!(parse_command("turn right"), Command::Turn(Side::Right));` },
            { label: 'say keeps the rest of the line, spaces included', body: rs`assert_eq!(parse_command("say hello"), Command::Say(String::from("hello")));
assert_eq!(parse_command("say turn left now"), Command::Say(String::from("turn left now")));` },
            { label: 'forward needs a whole number that is not negative', body: rs`for line in ["forward ten", "forward -3", "forward 2.5", "forward 3 4"] {
    assert_eq!(parse_command(line), Command::Unknown, "for the line {line:?}");
}` },
            { label: 'Anything else is Unknown', body: rs`for line in ["", "jump", "forward", "turn around", "stop now", "STOP", "say"] {
    assert_eq!(parse_command(line), Command::Unknown, "for the line {line:?}");
}` },
          ],
        },
        {
          id: 'borrow-in-match',
          title: 'Look, change or take',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          forbid: ['clone'],
          prompt: [
            "Three functions match on a `Message`. Two of them do not compile, because what they match on does not fit what their arms do.",
            { list: [
              "`log_message` only reads the message, and has to hand it back whole.",
              "`shout` changes a text message in place and leaves the others alone.",
              "`into_body` uses the message up and keeps its text. It is correct as it stands: it owns the message, and moving the payload out is the point.",
            ] },
            "Fix the two broken functions by changing what is matched on or what is borrowed. The arms can stay as they are, and `clone` is not available.",
          ],
          signature: 'fn log_message(message: Message, log: &mut Vec<String>) -> Message\nfn shout(message: &mut Message)\nfn into_body(message: Message) -> String',
          prelude: rs`#[derive(Debug, PartialEq)]
enum Message {
    Text(String),
    Rename { from: String, to: String },
    Ping,
}`,
          starter: rs`// Adds a one-line summary of the message to the log, then returns the message unchanged.
fn log_message(message: Message, log: &mut Vec<String>) -> Message {
    match message {
        Message::Text(body) => log.push(format!("text: {body}")),
        Message::Rename { from, to } => log.push(format!("rename: {from} to {to}")),
        Message::Ping => log.push(String::from("ping")),
    }
    message
}

// Makes a text message louder, in place.
fn shout(message: &Message) {
    match message {
        Message::Text(body) => body.push('!'),
        Message::Rename { .. } | Message::Ping => {}
    }
}

// Uses the message up and keeps its text.
fn into_body(message: Message) -> String {
    match message {
        Message::Text(body) => body,
        Message::Rename { to, .. } => to,
        Message::Ping => String::new(),
    }
}`,
          hints: [
            "In `log_message`, the arms bind `body`, `from` and `to` by value, which moves them out of `message` before the last line returns it. The arms only read. What could they match on instead?",
            "`match &message { … }` makes every binding a shared reference. `format!` is happy with those, and `message` is still whole on the last line.",
            "In `shout`, `body` is a `&String` because `message` is a `&Message`. Bindings take the kind of the reference that is matched. Change the parameter to `message: &mut Message` and `body` becomes a `&mut String`.",
          ],
          solution: rs`// Adds a one-line summary of the message to the log, then returns the message unchanged.
fn log_message(message: Message, log: &mut Vec<String>) -> Message {
    match &message {
        Message::Text(body) => log.push(format!("text: {body}")),
        Message::Rename { from, to } => log.push(format!("rename: {from} to {to}")),
        Message::Ping => log.push(String::from("ping")),
    }
    message
}

// Makes a text message louder, in place.
fn shout(message: &mut Message) {
    match message {
        Message::Text(body) => body.push('!'),
        Message::Rename { .. } | Message::Ping => {}
    }
}

// Uses the message up and keeps its text.
fn into_body(message: Message) -> String {
    match message {
        Message::Text(body) => body,
        Message::Rename { to, .. } => to,
        Message::Ping => String::new(),
    }
}`,
          solutionNote: "Three functions, three ways to match: on `&message` to look, on a `&mut Message` to change, and on the `Message` itself to take. The patterns in the arms are the same in all three.",
          tests: [
            { label: 'log_message records a text and returns the message whole', body: rs`let mut log = Vec::new();
let back = log_message(Message::Text(String::from("hi there")), &mut log);
assert_eq!(log, ["text: hi there"]);
assert_eq!(back, Message::Text(String::from("hi there")));` },
            { label: 'log_message records a rename and a ping, in order', body: rs`let mut log = Vec::new();
let rename = Message::Rename { from: String::from("a.txt"), to: String::from("b.txt") };
let back = log_message(rename, &mut log);
log_message(Message::Ping, &mut log);
assert_eq!(log, ["rename: a.txt to b.txt", "ping"]);
assert_eq!(back, Message::Rename { from: String::from("a.txt"), to: String::from("b.txt") });` },
            { label: 'shout changes a text in place', body: rs`let mut message = Message::Text(String::from("fire"));
shout(&mut message);
shout(&mut message);
assert_eq!(message, Message::Text(String::from("fire!!")));` },
            { label: 'shout leaves other messages alone', body: rs`let mut rename = Message::Rename { from: String::from("a"), to: String::from("b") };
shout(&mut rename);
assert_eq!(rename, Message::Rename { from: String::from("a"), to: String::from("b") });
let mut ping = Message::Ping;
shout(&mut ping);
assert_eq!(ping, Message::Ping);` },
            { label: 'into_body keeps the text of each kind of message', body: rs`assert_eq!(into_body(Message::Text(String::from("hello"))), "hello");
assert_eq!(into_body(Message::Rename { from: String::from("old"), to: String::from("new") }), "new");
assert_eq!(into_body(Message::Ping), "");` },
          ],
        },
        {
          id: 'eval-expr',
          title: 'Evaluate an expression tree',
          level: 'core',
          prompt: [
            "An `Expr` is a small arithmetic expression in one variable, `x`, stored as a tree. `Add`, `Mul` and `Neg` hold other expressions, so those variants keep them in a `Box`: a recursive type needs a pointer in the loop to have a known size, and lesson 20 explains why.",
            { list: [
              "`eval(expr, x)` returns the value of the expression for the given `x`.",
              "`show(expr)` writes it out as text. A number is its digits and the variable is `x`. `Add` is `(left + right)` and `Mul` is `(left * right)`, always in parentheses. `Neg` is a `-` directly in front of what it negates.",
            ] },
            "Both functions take `&Expr`, so the bindings in your patterns are references. A `&Box<Expr>` can be passed straight to a function that expects a `&Expr`. The helpers `num`, `var`, `neg`, `add` and `mul` only make the tests shorter to read.",
          ],
          signature: 'fn eval(expr: &Expr, x: i64) -> i64\nfn show(expr: &Expr) -> String',
          prelude: rs`#[derive(Debug, PartialEq)]
enum Expr {
    Num(i64),
    Var,                             // the variable x
    Neg(Box<Expr>),
    Add(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
}

// Shorthand for building expressions.
fn num(n: i64) -> Expr { Expr::Num(n) }
fn var() -> Expr { Expr::Var }
fn neg(inner: Expr) -> Expr { Expr::Neg(Box::new(inner)) }
fn add(left: Expr, right: Expr) -> Expr { Expr::Add(Box::new(left), Box::new(right)) }
fn mul(left: Expr, right: Expr) -> Expr { Expr::Mul(Box::new(left), Box::new(right)) }`,
          starter: rs`fn eval(expr: &Expr, x: i64) -> i64 {
    match expr {
        Expr::Num(n) => *n,
        _ => 0,
    }
}

fn show(expr: &Expr) -> String {
    match expr {
        Expr::Num(n) => n.to_string(),
        _ => String::from("?"),
    }
}`,
          hints: [
            "`Expr::Var => x` in `eval`, and `Expr::Var => String::from(\"x\")` in `show`. Replace each `_` arm with one arm for every remaining variant.",
            "The recursive arms call the function again on the parts: `Expr::Add(left, right) => eval(left, x) + eval(right, x)`.",
            "In `show`, build the text from the text of the parts: `Expr::Add(left, right) => format!(\"({} + {})\", show(left), show(right))`, and `Expr::Neg(inner) => format!(\"-{}\", show(inner))`.",
          ],
          solution: rs`fn eval(expr: &Expr, x: i64) -> i64 {
    match expr {
        Expr::Num(n) => *n,
        Expr::Var => x,
        Expr::Neg(inner) => -eval(inner, x),
        Expr::Add(left, right) => eval(left, x) + eval(right, x),
        Expr::Mul(left, right) => eval(left, x) * eval(right, x),
    }
}

fn show(expr: &Expr) -> String {
    match expr {
        Expr::Num(n) => n.to_string(),
        Expr::Var => String::from("x"),
        Expr::Neg(inner) => format!("-{}", show(inner)),
        Expr::Add(left, right) => format!("({} + {})", show(left), show(right)),
        Expr::Mul(left, right) => format!("({} * {})", show(left), show(right)),
    }
}`,
          tests: [
            { label: 'A number is itself, and x is whatever was passed', body: rs`assert_eq!(eval(&num(42), 7), 42);
assert_eq!(eval(&var(), 7), 7);
assert_eq!(eval(&var(), -3), -3);` },
            { label: 'One operation on two leaves', body: rs`assert_eq!(eval(&add(num(2), num(3)), 0), 5);
assert_eq!(eval(&mul(num(4), var()), 5), 20);
assert_eq!(eval(&neg(var()), 9), -9);` },
            { label: 'Nested: 3 * (x + 1) at x = 4 is 15', body: rs`let expr = mul(num(3), add(var(), num(1)));
assert_eq!(eval(&expr, 4), 15);` },
            { label: 'x * x - x + 2 at several values of x', body: rs`let expr = add(add(mul(var(), var()), neg(var())), num(2));
assert_eq!(eval(&expr, 0), 2);
assert_eq!(eval(&expr, 3), 8);
assert_eq!(eval(&expr, -2), 8);
assert_eq!(eval(&expr, 10), 92);` },
            { label: 'show writes leaves and single operations', body: rs`assert_eq!(show(&num(7)), "7");
assert_eq!(show(&var()), "x");
assert_eq!(show(&add(var(), num(1))), "(x + 1)");
assert_eq!(show(&mul(num(2), var())), "(2 * x)");
assert_eq!(show(&neg(var())), "-x");` },
            { label: 'show nests parentheses as the tree nests', body: rs`let expr = mul(num(3), add(var(), num(1)));
assert_eq!(show(&expr), "(3 * (x + 1))");
assert_eq!(show(&neg(add(num(1), neg(var())))), "-(1 + -x)");
assert_eq!(eval(&expr, 1), 6, "the expression is still usable after show");` },
          ],
        },
        {
          id: 'simplify-expr',
          title: 'Simplify an expression tree',
          level: 'stretch',
          forbid: ['clone'],
          prompt: [
            "`simplify` takes an `Expr` by value and returns an equal but smaller one. Simplify the parts of an expression first, and then look at what they became:",
            { table: {
              head: ['After simplifying the parts', 'Result'],
              rows: [
                ['Two numbers added or multiplied, or a number negated', 'One number: `2 + 3` is `5`, and `-(7)` is `-7`'],
                ['`0 + e` or `e + 0`', '`e`'],
                ['`1 * e` or `e * 1`', '`e`'],
                ['`0 * e` or `e * 0`', '`0`'],
                ['`-(-e)`', '`e`'],
                ['Anything else', 'The same operation, rebuilt around the simplified parts'],
              ],
            } },
            "The function owns its argument, so it can take the tree apart and reuse the pieces. `*left` on a `Box<Expr>` moves the `Expr` out of the box, which only a `Box` allows. The starter does this for `Add` and then matches on the pair of simplified parts. Nothing needs to be copied, and `clone` is not available.",
          ],
          signature: 'fn simplify(expr: Expr) -> Expr',
          prelude: rs`#[derive(Debug, PartialEq)]
enum Expr {
    Num(i64),
    Var,                             // the variable x
    Neg(Box<Expr>),
    Add(Box<Expr>, Box<Expr>),
    Mul(Box<Expr>, Box<Expr>),
}

// Shorthand for building expressions.
fn num(n: i64) -> Expr { Expr::Num(n) }
fn var() -> Expr { Expr::Var }
fn neg(inner: Expr) -> Expr { Expr::Neg(Box::new(inner)) }
fn add(left: Expr, right: Expr) -> Expr { Expr::Add(Box::new(left), Box::new(right)) }
fn mul(left: Expr, right: Expr) -> Expr { Expr::Mul(Box::new(left), Box::new(right)) }`,
          starter: rs`fn simplify(expr: Expr) -> Expr {
    match expr {
        // *left moves the Expr out of its Box.
        Expr::Add(left, right) => match (simplify(*left), simplify(*right)) {
            (Expr::Num(a), Expr::Num(b)) => Expr::Num(a + b),
            (left, right) => Expr::Add(Box::new(left), Box::new(right)),
        },
        other => other,
    }
}`,
          hints: [
            "Add arms to the inner `match`, above its last one. A pattern with alternatives can bind the same name on both sides: `(Expr::Num(0), other) | (other, Expr::Num(0)) => other`.",
            "`Mul` has the same structure with three special cases. Put the zero rule before the one rule: `(Expr::Num(0), _) | (_, Expr::Num(0)) => Expr::Num(0)`.",
            "`Neg` matches on one simplified part: `Expr::Neg(inner) => match simplify(*inner) { Expr::Num(n) => Expr::Num(-n), Expr::Neg(twice) => *twice, other => Expr::Neg(Box::new(other)) }`.",
          ],
          solution: rs`fn simplify(expr: Expr) -> Expr {
    match expr {
        Expr::Num(_) | Expr::Var => expr,
        Expr::Neg(inner) => match simplify(*inner) {
            Expr::Num(n) => Expr::Num(-n),
            Expr::Neg(twice) => *twice,
            other => Expr::Neg(Box::new(other)),
        },
        // *left moves the Expr out of its Box.
        Expr::Add(left, right) => match (simplify(*left), simplify(*right)) {
            (Expr::Num(a), Expr::Num(b)) => Expr::Num(a + b),
            (Expr::Num(0), other) | (other, Expr::Num(0)) => other,
            (left, right) => Expr::Add(Box::new(left), Box::new(right)),
        },
        Expr::Mul(left, right) => match (simplify(*left), simplify(*right)) {
            (Expr::Num(a), Expr::Num(b)) => Expr::Num(a * b),
            (Expr::Num(0), _) | (_, Expr::Num(0)) => Expr::Num(0),
            (Expr::Num(1), other) | (other, Expr::Num(1)) => other,
            (left, right) => Expr::Mul(Box::new(left), Box::new(right)),
        },
    }
}`,
          solutionNote: "The first arm returns `expr` after matching on it. That is allowed because `Expr::Num(_) | Expr::Var` binds nothing, so nothing was moved out. The other arms bind the boxes, and in those arms `expr` is gone.",
          tests: [
            { label: 'Leaves come back as they are', body: rs`assert_eq!(simplify(num(5)), num(5));
assert_eq!(simplify(var()), var());` },
            { label: 'Constants fold into one number', body: rs`assert_eq!(simplify(add(num(2), num(3))), num(5));
assert_eq!(simplify(mul(num(4), num(5))), num(20));
assert_eq!(simplify(neg(num(7))), num(-7));` },
            { label: 'Adding zero disappears, on either side', body: rs`assert_eq!(simplify(add(num(0), var())), var());
assert_eq!(simplify(add(var(), num(0))), var());` },
            { label: 'Multiplying by one disappears, on either side', body: rs`assert_eq!(simplify(mul(num(1), var())), var());
assert_eq!(simplify(mul(var(), num(1))), var());` },
            { label: 'Multiplying by zero is zero, whatever the other side is', body: rs`assert_eq!(simplify(mul(num(0), var())), num(0));
assert_eq!(simplify(mul(add(var(), num(9)), num(0))), num(0));` },
            { label: 'A double negation cancels', body: rs`assert_eq!(simplify(neg(neg(var()))), var());
assert_eq!(simplify(neg(neg(neg(var())))), neg(var()));` },
            { label: 'The parts are simplified before the whole', body: rs`assert_eq!(simplify(add(mul(var(), num(1)), mul(num(2), num(0)))), var(), "(x * 1) + (2 * 0)");
assert_eq!(simplify(mul(add(num(1), num(1)), var())), mul(num(2), var()), "(1 + 1) * x");
assert_eq!(simplify(neg(add(num(0), neg(var())))), var(), "-(0 + -x)");
assert_eq!(simplify(mul(add(num(3), num(-3)), mul(var(), var()))), num(0), "(3 + -3) * (x * x)");` },
            { label: 'What cannot be simplified is rebuilt unchanged', body: rs`assert_eq!(simplify(add(var(), var())), add(var(), var()));
assert_eq!(simplify(add(mul(var(), num(3)), num(1))), add(mul(var(), num(3)), num(1)));
assert_eq!(simplify(neg(mul(var(), var()))), neg(mul(var(), var())));` },
          ],
        },
      ],
    },
  );
})();
