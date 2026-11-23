// Part 5 (Abstraction), lessons 18 and 19: iterators, and designing with errors.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 5 · Abstraction';

  (window.C_LESSONS ||= []).push(
    {
      id: 'iterators',
      title: 'Iterators',
      category: part,
      minutes: 40,
      summary: 'The one trait behind every for loop, why a chain of adapters does no work until something asks for a value, and how to write an iterator of your own.',
      topics: ['Iterator and next', 'iter, iter_mut, into_iter', 'Lazy adapters', 'Consumers', 'collect', 'Your own iterators'],
      sections: [
        {
          title: 'One trait, one method',
          body: [
            "Every `for` loop you have written in this course runs on one trait from the standard library. Leaving out the methods it provides for free, this is all of it:",
            { code: rs`trait Iterator {
    type Item;                                   // what the iterator produces

    fn next(&mut self) -> Option<Self::Item>;    // the next item, or None when there are no more
}` },
            "`Item` is an associated type, which lesson 15 introduced: each iterator names the one type it produces. `next` is the only method an iterator has to supply. It returns `Some(item)` until the items run out, and `None` after that. You can call it yourself.",
            { run: rs`fn main() {
    let names = vec!["ada", "grace", "linus"];
    let mut it = names.iter();     // an iterator over the Vec: it remembers where it is

    println!("{:?}", it.next());
    println!("{:?}", it.next());
    println!("{:?}", it.next());
    println!("{:?}", it.next());   // nothing left
    println!("{:?}", it.next());   // and it stays that way
}`, name: 'next_by_hand.rs', expect: 'Some("ada")\nSome("grace")\nSome("linus")\nNone\nNone\n' },
            "`next` takes `&mut self`, because an iterator is a value that remembers where it is, and each call moves it along. That is why `it` is declared `mut`.",
            "A `for` loop is this, written for you. The compiler turns the first loop below into the second.",
            { run: rs`fn main() {
    let names = vec!["ada", "grace", "linus"];

    for name in names.iter() {
        print!("{name} ");
    }
    println!();

    // The same loop, the way the compiler sees it.
    let mut it = names.iter();
    while let Some(name) = it.next() {
        print!("{name} ");
    }
    println!();
}`, name: 'for_is_next.rs', expect: 'ada grace linus \nada grace linus \n' },
            { list: [
              "A range such as `0..3` is an iterator already, which is why `for i in 0..3` has worked since lesson 3.",
              "An iterator is used up as it goes. Once `next` has returned `None` there is no rewind. Ask the collection for a new iterator, which costs nothing.",
              "The other seventy or so methods of the trait, such as `map`, `filter` and `sum`, have default bodies written in terms of `next`. The rest of this lesson is about them.",
            ] },
            { compare: "Python's protocol is the same idea: `__next__` returns an item or raises `StopIteration`. A JavaScript iterator's `next()` returns an object with `value` and `done`. PHP's `Iterator` interface needs five methods: `current`, `key`, `next`, `rewind` and `valid`. Rust needs one method, and the end of the sequence is an ordinary `None` in the return type. It is not an exception, and it is not a flag you can forget to test." },
          ],
        },
        {
          title: 'iter, iter_mut, into_iter again',
          body: [
            "Lesson 14 showed three ways to loop over a `Vec`: `for x in &v`, `for x in &mut v` and `for x in v`. Each is a call to one of three methods, and they differ in what `Item` is.",
            { table: {
              head: ['Method', 'The `for` form', '`Item`', 'The collection afterward'],
              rows: [
                ['`v.iter()`', '`for x in &v`', '`&T`', 'Untouched'],
                ['`v.iter_mut()`', '`for x in &mut v`', '`&mut T`', 'Changed in place'],
                ['`v.into_iter()`', '`for x in v`', '`T`', 'Moved into the iterator, and gone'],
              ],
            } },
            "These are the three forms ownership always takes: a shared borrow, a mutable borrow and the value itself. Lesson 11 had the same three as method receivers.",
            { run: rs`fn main() {
    let mut scores = vec![3, 8, 5];

    for score in scores.iter_mut() {       // score: &mut i32
        *score *= 10;
    }
    for score in scores.iter() {           // score: &i32
        print!("{score} ");
    }
    println!();

    let names = vec![String::from("ada"), String::from("grace")];
    let mut loud = Vec::new();
    for name in names.into_iter() {        // name: String, moved out of the Vec
        loud.push(name + "!");
    }
    println!("{loud:?}");
}`, name: 'three_ways.rs', expect: '30 80 50 \n["ada!", "grace!"]\n' },
            "`into_iter` hands out the elements themselves. Each `String` above is moved out of the `Vec` and into `name`, which is why `name + \"!\"` can reuse its buffer without copying. A `Vec` cannot go on owning what it has given away. Suppose it could: after the loop, `names` would still hold pointers to strings that `loud` now owns, and both would free them. That is the double free from lesson 5, and the rule from lesson 5 prevents it. `into_iter` takes the collection by value, so the collection has moved.",
            { run: rs`fn main() {
    let names = vec![String::from("ada"), String::from("grace")];
    let mut it = names.into_iter();
    println!("{:?}", it.next());
    println!("{}", names.len());
}`, name: 'after_into_iter.rs', fails: 'E0382' },
            "The note says it: `into_iter` takes ownership of the receiver `self`, which moves `names`. The fixes are the usual ones for a move.",
            { list: [
              "If you only read the elements, borrow them. Use `names.iter()`, and the `Vec` is still yours afterward.",
              "If you need the elements themselves, let the collection go, and use what you built from it.",
              "If you need both, clone. Cloning only the elements you keep, with `names.iter().cloned()` at the right point in a chain, is cheaper than cloning the whole collection first, which is what the compiler's `help:` offers.",
            ] },
            "How does `for` accept a `Vec`, a reference to one, a range and the result of `names.iter()` alike? It calls `into_iter()` on whatever follows `in`. That method belongs to a second trait, `IntoIterator`, which means \"can be turned into an iterator\". A `Vec<T>` implements it by handing over its elements. A `&Vec<T>` implements it by calling `iter()`, and a `&mut Vec<T>` by calling `iter_mut()`. Every iterator implements it by returning itself.",
            { compare: "Python and JavaScript have one way to loop over a list, and it never uses the list up, because each element is a reference to a shared, garbage-collected object. PHP comes closer: `foreach ($items as $item)` works on copies, and `foreach ($items as &$item)` changes the array in place. Rust has three forms because it has three ways to hold a value, and the `Item` type tells you which one you got." },
            { pitfall: "Over a `Vec<i32>`, `iter()` produces `&i32`, not `i32`. Printing and arithmetic mostly work through the reference, so it is easy not to notice until a type error mentions `&i32` or `&&i32`. To turn an iterator of references to `Copy` values into an iterator of the values, add `.copied()`. For values that are `Clone` but not `Copy`, there is `.cloned()`." },
          ],
        },
        {
          title: 'Adapters are lazy',
          body: [
            "An **adapter** is a method that takes an iterator and returns another iterator. `map` applies a closure to each item. `filter` keeps the items for which a closure returns true. Calling an adapter does none of that work. It only wraps the iterator it was called on in a new one that remembers the closure. Nothing happens until something calls `next` on the result.",
            { run: rs`fn main() {
    let numbers = vec![1, 2, 3];
    numbers.iter().map(|n| {
        println!("visiting {n}");
        n * 2
    });
    println!("done");
}`, name: 'never_runs.rs', warns: true, expect: 'done\n' },
            "Run it. `visiting` is never printed, because nothing ever asked the `Map` for an item. The compiler knows this is nearly always a mistake. It warns that the `Map` is unused, and adds the note `iterators are lazy and do nothing unless consumed`.",
            "When a chain is consumed, the items go through it one at a time. Each call to `next` on the outermost iterator pulls one item through every stage. Step through this chain and watch the order in which things happen.",
            { trace: {
              title: 'One element at a time goes through the whole chain',
              code: rs`fn main() {
    let numbers = [1, 2, 3, 4];
    let out: Vec<i32> = numbers
        .iter()
        .map(|n| n * 3)
        .filter(|m| m % 2 == 0)
        .collect();
    println!("{out:?}");
}`,
              vars: [
                { id: 'numbers', type: 'i32', len: 4 },
                { id: 'n', type: '&i32' },
                { id: 'm', type: 'i32' },
                { id: 'out', type: 'i32', len: 2 },
              ],
              steps: [
                { line: 2, say: 'An array of four numbers.', set: { numbers: [1, 2, 3, 4] } },
                { line: [4, 5, 6], say: 'These three calls build three values, one inside the next: a slice iterator, a `Map` around it and a `Filter` around that. No element has been read and neither closure has run.' },
                { line: 7, say: '`collect` is the consumer. It asks the `Filter` for an item. The `Filter` asks the `Map`, and the `Map` asks the slice iterator.' },
                { line: 4, say: 'The slice iterator hands out a reference to the first element. The arrow is dashed because `n` borrows the element.', set: { n: '&numbers[0]' } },
                { line: 5, say: '`map` runs its closure on that one element: 1 times 3 is 3.', set: { m: 3 } },
                { line: 6, say: '`filter` tests the 3. It is odd, so it is dropped. Nothing reaches `collect` yet, and `filter` asks for another item.' },
                { line: 4, say: 'Only now is the second element read.', set: { n: '&numbers[1]' } },
                { line: 5, say: '`map` again: 2 times 3 is 6.', set: { m: 6 } },
                { line: [6, 7], say: '6 is even. It passes the filter and `collect` stores it. One element has gone all the way through before the third has been touched. The `?` slot has not been written yet.', set: { 'out[0]': 6 } },
                { line: [4, 5], say: '`collect` asks again. The third element is read and mapped to 9.', set: { n: '&numbers[2]', m: 9 } },
                { line: 6, say: '9 is odd, so `filter` drops it and asks for the next.' },
                { line: [4, 5], say: 'The fourth element is read and mapped to 12.', set: { n: '&numbers[3]', m: 12 } },
                { line: [6, 7], say: '12 is even, so it reaches `collect`.', set: { 'out[1]': 12 } },
                { line: 7, say: '`collect` asks once more. The slice iterator is at its end and returns `None`, which `map` and `filter` pass along unchanged. `collect` returns the finished `Vec`.', hide: ['n', 'm'] },
                { line: 8, say: 'The program prints `[6, 12]`. At no point did a list of all the mapped values exist: `m` held one of them at a time.' },
              ],
            } },
            "There was no pass over all the numbers by `map` followed by a pass by `filter`. To prove it, this version prints from inside both closures.",
            { run: rs`fn main() {
    let numbers = [1, 2, 3, 4];
    let out: Vec<i32> = numbers
        .iter()
        .map(|n| {
            println!("map    {n}");
            n * 3
        })
        .filter(|m| {
            println!("filter {m}");
            m % 2 == 0
        })
        .collect();
    println!("{out:?}");
}`, name: 'one_at_a_time.rs', expect: 'map    1\nfilter 3\nmap    2\nfilter 6\nmap    3\nfilter 9\nmap    4\nfilter 12\n[6, 12]\n' },
            { compare: "A Python generator expression such as `(n * 3 for n in numbers)` is lazy in exactly this way, and so are Python 3's `map` and `filter`. JavaScript's array methods are eager: `numbers.map(f).filter(g)` walks the whole array and builds a second array, then walks that one and builds a third. PHP's `array_map` and `array_filter` do the same, while its generators are lazy. A Rust chain builds nothing in between. The only allocation in the example above is the `Vec` that `collect` fills." },
            "Because nothing runs until it is asked for, a chain can start from a sequence with no end and take only what it needs. `1..` is a range that never stops.",
            { run: rs`fn main() {
    let found: Vec<u64> = (1..)                 // 1, 2, 3 and so on, without end
        .map(|n| n * n)
        .filter(|square| square % 10 == 6)
        .take(4)                                // stop after four items
        .collect();
    println!("{found:?}");
}`, name: 'endless.rs', expect: '[16, 36, 196, 256]\n' },
            "The adapters you will use most:",
            { table: {
              head: ['Adapter', 'Produces'],
              rows: [
                ['`map(f)`', '`f(item)` for each item'],
                ['`filter(p)`', 'The items for which `p(&item)` is true'],
                ['`filter_map(f)`', 'What is inside each `Some` that `f(item)` returns. Every `None` is skipped'],
                ['`enumerate()`', 'Pairs `(index, item)`. The index is a `usize` that starts at 0'],
                ['`zip(other)`', 'Pairs `(a, b)` from two iterators. It stops when either runs out'],
                ['`chain(other)`', 'Every item of the first iterator, then every item of the second'],
                ['`take(n)` and `skip(n)`', 'The first `n` items, and everything after them'],
                ['`take_while(p)` and `skip_while(p)`', 'The items before the first one that fails `p`, and the items from that one on'],
                ['`rev()`', 'The items from the back. The iterator must know where its end is, so this is not for `1..`'],
                ['`copied()` and `cloned()`', '`T` from an iterator of `&T`, by copying or cloning each item'],
                ['`flat_map(f)`', 'Every item of every iterator that `f` returns, as one sequence'],
                ['`peekable()`', 'The same items, with an extra method `peek()` that looks at the next one without taking it'],
                ['`inspect(f)`', 'The same items, after showing each one to `f`. It is meant for debugging'],
              ],
            } },
            { run: rs`fn main() {
    let names = ["ada", "grace", "linus"];
    let born = [1815, 1906, 1969, 2001];

    for (i, name) in names.iter().enumerate() {
        print!("{i}:{name} ");
    }
    println!();

    let pairs: Vec<(&str, i32)> = names.iter().copied().zip(born).collect();
    println!("{pairs:?}");

    let line: Vec<i32> = (1..=3).chain(7..=9).rev().skip(1).collect();
    println!("{line:?}");

    let letters: String = names.iter().flat_map(|name| name.chars().take(2)).collect();
    println!("{letters}");
}`, name: 'adapters.rs', expect: '0:ada 1:grace 2:linus \n[("ada", 1815), ("grace", 1906), ("linus", 1969)]\n[8, 7, 3, 2, 1]\nadgrli\n' },
            { pitfall: [
              "`filter` passes its closure a reference to each item, because the item still has to be handed on afterward. Over `iter()` the items are references already, so the closure receives a reference to a reference, `&&i32`. Comparing that with a number is a type error.",
              { run: rs`fn main() {
    let numbers = [3, 8, 1, 9];
    let big: Vec<&i32> = numbers.iter().filter(|n| n > 5).collect();
    println!("{big:?}");
}`, name: 'double_reference.rs', fails: 'E0308' },
              "There are three common ways out. Dereference in the body: `**n > 5`. Take the references apart in the parameter pattern: `|&&n| n > 5`. Or put `.copied()` before the `filter`, so that the items are plain numbers and one `*` is enough.",
            ] },
          ],
        },
        {
          title: 'Consumers',
          body: [
            "A **consumer** is a method that calls `next` in a loop until it has its answer. It takes the iterator by value, uses it up, and returns something that is not an iterator. Without a consumer at the end, a chain does nothing.",
            { table: {
              head: ['Consumer', 'Returns', 'Stops early?'],
              rows: [
                ['`sum()` and `product()`', 'The total. The type of the result must be stated', 'No'],
                ['`count()`', 'The number of items, as a `usize`', 'No'],
                ['`min()` and `max()`', 'An `Option`, which is `None` for an empty iterator', 'No'],
                ['`last()`', 'An `Option` holding the final item', 'No'],
                ['`fold(start, f)`', 'One value, built by calling `f(so_far, item)` for each item in turn', 'No'],
                ['`for_each(f)`', 'Nothing. It calls `f(item)` for its effect', 'No'],
                ['`collect()`', 'A collection. The next section is about it', 'No'],
                ['`find(p)`', 'An `Option` holding the first item for which `p` is true', 'Yes, at the first match'],
                ['`position(p)`', 'An `Option` holding the index of that item', 'Yes, at the first match'],
                ['`any(p)`', '`true` if `p` is true for at least one item', 'Yes, at the first `true`'],
                ['`all(p)`', '`true` if `p` is true for every item', 'Yes, at the first `false`'],
                ['`nth(n)`', 'An `Option` holding item number `n`, counting from 0', 'Yes, when it gets there'],
              ],
            } },
            { run: rs`fn main() {
    let temps = [18, 23, 31, 27, 16];

    let total: i32 = temps.iter().sum();
    let hottest = temps.iter().max();
    let warm_days = temps.iter().filter(|t| **t > 20).count();
    println!("{total} {hottest:?} {warm_days}");

    let first_warm = temps.iter().find(|t| **t > 20);
    let where_it_is = temps.iter().position(|t| *t > 20);
    let any_freezing = temps.iter().any(|t| *t < 0);
    let all_mild = temps.iter().all(|t| *t < 30);
    println!("{first_warm:?} {where_it_is:?} {any_freezing} {all_mild}");

    // fold: start from 0, and for each digit work out the next running value.
    let digits = [4, 0, 9, 6];
    let number = digits.iter().fold(0, |so_far, digit| so_far * 10 + digit);
    println!("{number}");
}`, name: 'consumers.rs', expect: '115 Some(31) 3\nSome(23) Some(1) false false\n4096\n' },
            "`min` and `max` return an `Option` because an empty iterator has no largest item. `sum` needs the annotation on `total` because it can produce more than one type.",
            "The consumers in the lower half of the table stop as soon as the answer is known. `inspect` makes that visible.",
            { run: rs`fn main() {
    let numbers = [4, 9, 12, 7, 20];
    let found = numbers
        .iter()
        .inspect(|n| println!("looking at {n}"))
        .find(|n| **n > 10);
    println!("{found:?}");
}`, name: 'stops_early.rs', expect: 'looking at 4\nlooking at 9\nlooking at 12\nSome(12)\n' },
            { compare: "`fold` is `reduce` in JavaScript, `functools.reduce` in Python and `array_reduce` in PHP. `any` and `all` have the same names in Python, and JavaScript calls them `some` and `every`. What differs is where they sit: at the end of a lazy chain. A `find` that matches the third of a million items runs the `map` before it three times." },
            { tip: "A consumer takes the iterator by value, so one iterator cannot be consumed twice. Build the chain again from the collection. Creating it is free, because all the work happens in the consumer." },
          ],
        },
        {
          title: 'collect and choosing the target',
          body: [
            "`collect` is the consumer that builds a collection out of the items. It can build many kinds: a `Vec`, a `String`, a `HashMap`, a `HashSet` and more. Nothing in the chain says which, so you must.",
            { run: rs`fn main() {
    let numbers = [1, 2, 3];
    let doubled = numbers.iter().map(|n| n * 2).collect();
    println!("{}", doubled.len());
}`, name: 'collect_what.rs', fails: 'type annotations needed' },
            "The `help:` line has the usual fix: give the variable a type. `Vec<_>` is enough, where `_` asks the compiler to work out the element type by itself. The other way is to name the type at the call, with the turbofish you know from `parse::<i32>()`.",
            { run: rs`use std::collections::{HashMap, HashSet};

fn main() {
    let words = ["pear", "fig", "pear", "plum"];

    let list: Vec<&str> = words.iter().copied().collect();
    let unique: HashSet<&str> = words.iter().copied().collect();
    let lengths: HashMap<&str, usize> = words.iter().map(|w| (*w, w.len())).collect();
    let joined: String = words.iter().copied().collect();
    let shouted = words.iter().map(|w| w.to_uppercase()).collect::<Vec<_>>();

    println!("{list:?}");
    println!("{} unique, and fig has {:?} letters", unique.len(), lengths.get("fig"));
    println!("{joined}");
    println!("{shouted:?}");
}`, name: 'targets.rs', expect: '["pear", "fig", "pear", "plum"]\n3 unique, and fig has Some(3) letters\npearfigpearplum\n["PEAR", "FIG", "PEAR", "PLUM"]\n' },
            { list: [
              "The target decides the meaning. The same four words make a list of four or a set of three.",
              "A `HashMap` is collected from pairs `(key, value)`.",
              "A `String` is collected from characters or from pieces of text.",
            ] },
            "`collect` has one more target worth knowing. An iterator whose items are `Result<T, E>` can be collected into a `Result<Vec<T>, E>`. If every item is `Ok`, you get `Ok` with all the values. At the first `Err`, collecting stops, and that error is the result.",
            { run: rs`// Every digit of the text, or the first character that is not a digit.
fn digits(text: &str) -> Result<Vec<u32>, char> {
    text.chars()
        .map(|c| c.to_digit(10).ok_or(c))      // each item is a Result<u32, char>
        .collect()
}

fn main() {
    println!("{:?}", digits("2048"));
    println!("{:?}", digits("20x8?"));
}`, name: 'collect_result.rs', expect: "Ok([2, 0, 4, 8])\nErr('x')\n" },
            "The return type of `digits` is the target here, so the call needs no annotation. The same works for `Option`: an iterator of `Option<T>` collects into an `Option<Vec<T>>`, which is `None` if any item is.",
            { tip: "To join pieces of text with a separator between them, collect into a `Vec` and call `join` on it: `parts.collect::<Vec<_>>().join(\", \")`." },
          ],
        },
        {
          title: 'Writing your own',
          body: [
            "To make a type an iterator, implement the trait: name the `Item` type and write `next`. Every adapter and consumer comes with it.",
            { run: rs`struct Countdown {
    remaining: u32,
}

impl Iterator for Countdown {
    type Item = u32;                          // what next hands out

    fn next(&mut self) -> Option<u32> {
        if self.remaining == 0 {
            return None;                      // finished
        }
        let value = self.remaining;
        self.remaining -= 1;
        Some(value)
    }
}

fn main() {
    let countdown = Countdown { remaining: 3 };
    for n in countdown {
        print!("{n} ");
    }
    println!("liftoff");

    // Adapters and consumers work on it like on any other iterator.
    let even_total: u32 = Countdown { remaining: 6 }.filter(|n| n % 2 == 0).sum();
    let labels: Vec<String> = Countdown { remaining: 3 }.map(|n| format!("T-{n}")).collect();
    println!("{even_total} {labels:?}");
}`, name: 'countdown.rs', expect: '3 2 1 liftoff\n12 ["T-3", "T-2", "T-1"]\n' },
            "An adapter is the same thing with another iterator inside it. This one hands on every second item of whatever it wraps. `I` is the type of the inner iterator, and `I::Item` is the associated type that says what that iterator produces.",
            { run: rs`struct EveryOther<I> {
    inner: I,
}

impl<I: Iterator> Iterator for EveryOther<I> {
    type Item = I::Item;                      // the same items as the iterator inside

    fn next(&mut self) -> Option<I::Item> {
        let keep = self.inner.next();         // pull one item to hand on
        self.inner.next();                    // pull one more and throw it away
        keep
    }
}

fn main() {
    let letters = EveryOther { inner: "abcdefg".chars() };
    println!("{}", letters.collect::<String>());

    let odd: Vec<u32> = EveryOther { inner: 1.. }.take(4).collect();
    println!("{odd:?}");
}`, name: 'every_other.rs', expect: 'aceg\n[1, 3, 5, 7]\n' },
            "This is how `map` and `filter` are built. `numbers.iter().map(f)` returns a struct called `Map` that holds the slice iterator and the closure, and its `next` calls the inner `next` and applies `f` to what comes back. It also shows where the laziness comes from. Creating an `EveryOther` runs no code of yours at all. It only stores a value in a field.",
            "Often you do not need a new type. A function can build a chain and return it. The real type of a chain is long, and it contains closure types that cannot be written down, so the return type is `impl Iterator<Item = …>`, the `impl Trait` of lesson 16.",
            { run: rs`// "Some iterator of u32", without naming its real type.
fn squares_below(limit: u32) -> impl Iterator<Item = u32> {
    (1..).map(|n| n * n).take_while(move |square| *square < limit)
}

fn main() {
    let small: Vec<u32> = squares_below(50).collect();
    println!("{small:?}");

    // from_fn turns a closure into an iterator: each call to it is one next.
    let mut power = 1;
    let doubling = std::iter::from_fn(move || {
        power *= 2;
        if power <= 64 { Some(power) } else { None }
    });
    println!("{:?}", doubling.collect::<Vec<u32>>());
}`, name: 'return_an_iterator.rs', expect: '[1, 4, 9, 16, 25, 36, 49]\n[2, 4, 8, 16, 32, 64]\n' },
            { pitfall: "The closure given to `take_while` is a `move` closure, so that it owns `limit`. The iterator that `squares_below` returns is used after the call has ended, and by then the parameter is gone. Lesson 17 showed the error you get without `move`, `E0373`." },
          ],
        },
        {
          title: 'Loops or chains?',
          body: [
            "Anything a chain does, a loop can do, and the two cost the same. So choose the one that reads better. Here is one calculation written both ways.",
            { run: rs`fn main() {
    // (item, quantity, price)
    let orders = [("tea", 3, 4.5), ("cake", 0, 12.0), ("coffee", 2, 3.25), ("scone", 1, 2.75)];

    let mut total = 0.0;
    for (_, quantity, price) in orders {
        if quantity > 0 {
            total += quantity as f64 * price;
        }
    }

    let same: f64 = orders
        .iter()
        .filter(|(_, quantity, _)| *quantity > 0)
        .map(|(_, quantity, price)| *quantity as f64 * price)
        .sum();

    println!("{total} {same}");
}`, name: 'both_ways.rs', expect: '22.75 22.75\n' },
            { table: {
              head: ['A chain reads better when', 'A loop reads better when'],
              rows: [
                ['Each step is a simple transformation or a test', 'The body does several things, or has effects such as printing'],
                ['The result is one value or one collection', 'One pass produces several results'],
                ['The steps follow each other naturally: select, transform, combine', 'The logic needs `break`, `continue`, or a `return` from the function'],
                ['Nothing in it can fail', 'A step can fail and you want to use `?`'],
              ],
            } },
            { pitfall: "A `?` inside a closure returns from the closure, not from the function around it, so it cannot be used to leave a function from the middle of a chain. When a step can fail, either collect into a `Result`, as in the section on `collect`, or write a loop." },
            { aside: "Each adapter is a generic struct, and every closure has a type of its own. So a chain such as `numbers.iter().map(f).filter(g)` has one exact type: a `Filter` holding a `Map` holding a slice iterator. Generics are compiled by monomorphization, as lesson 15 described. The compiler generates a `next` for exactly that combination and, in a release build, merges the layers into a single loop. No closure is called through a pointer, and nothing is allocated. A chain can even beat a loop that indexes, because `v[i]` checks its index every time and an iterator over a slice has nothing to check. A debug build does not merge the layers, so chains are noticeably slower there." },
            { fromC: "A slice iterator is two pointers: one to the current element and one just past the last. `next` compares them, reads through the first and moves it forward. That is the `for (p = a; p != end; p++)` walk from the pointer arithmetic lesson, and an optimized build compiles a `for` loop over a slice to the same machine code." },
            { native: "Clippy knows many chains that have a shorter spelling. It suggests `find(p)` in place of `filter(p).next()`, `any(p)` in place of `find(p).is_some()`, and `count()` in place of collecting into a `Vec` only to call `len()`. In an editor, rust-analyzer shows the item type after each line of a chain, which is the quickest way to find out where a `&&i32` came from." },
          ],
        },
      ],
      takeaways: [
        "An iterator is anything with `next(&mut self) -> Option<Item>`. A `for` loop calls `into_iter()` and then `next` until it gets `None`.",
        "`iter()` lends the items as `&T`, `iter_mut()` lends them as `&mut T`, and `into_iter()` gives them away and takes the collection with it.",
        "Adapters are lazy. A chain does nothing until a consumer pulls items through it, one at a time, and it builds no collections in between.",
        "`find`, `position`, `any`, `all` and `nth` stop as soon as they know the answer.",
        "`collect` needs a target type: a `Vec`, a `String`, a map, a set, or a `Result` that stops at the first error.",
        "Writing `next` gives a type every adapter and consumer. Chains compile to the same code as loops, so choose the one that reads better.",
      ],
      quiz: [
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let total: i32 = (1..=6).filter(|n| n % 2 == 1).map(|n| n * n).sum();
    println!("{total}");
}`,
          answer: '35',
          explain: "`1..=6` includes 6. The filter keeps 1, 3 and 5. Their squares are 1, 9 and 25, which add up to 35.",
          hint: "Filter first, then square what is left.",
        },
        {
          q: 'What does this program print? The compiler gives a warning when it is built.',
          code: rs`fn main() {
    let numbers = [1, 2, 3];
    let mut count = 0;
    numbers.iter().map(|n| count += n);
    println!("{count}");
}`,
          options: [
            { t: '`0`', ok: true, why: "`map` only builds an iterator. Nothing consumes it, so the closure never runs and `count` is never changed. That is what the warning is about." },
            { t: '`6`', why: "That is what JavaScript's `numbers.map(…)` would give, because array methods there run at once. In Rust the closure runs only when a consumer pulls items. A `for` loop or `for_each` would print 6." },
            { t: '`3`', why: "The closure does not run for the last item only. It does not run at all, because nothing ever calls `next` on the `Map`." },
            { t: '`1`', why: "No item is pulled through when the chain is built, not even the first. Calling `map` reads nothing." },
          ],
          verify: true,
          warns: true,
        },
        {
          q: '`names` is a `Vec<String>`. In `for pair in names.iter().enumerate()`, what is the type of `pair`?',
          options: [
            { t: '`(usize, &String)`', ok: true, why: "`iter()` produces `&String`, and `enumerate` pairs each item with its position, which is a `usize` like every index." },
            { t: '`(usize, String)`', why: "That is what `names.into_iter().enumerate()` would produce. `iter()` only borrows, so the items are references." },
            { t: '`(i32, &String)`', why: "`i32` is what an integer literal becomes when nothing decides otherwise. Positions and lengths are always `usize`." },
            { t: '`(&String, usize)`', why: "That is the order of the callback's parameters in JavaScript's `forEach((value, index) => …)`. Rust puts the index first, as Python's `enumerate` does." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let words = ["alpha", "beta", "gamma", "delta"];
    let picked: Vec<String> = words
        .iter()
        .enumerate()
        .filter(|(i, _)| i % 2 == 0)
        .map(|(i, word)| format!("{i}{}", word.len()))
        .collect();
    println!("{picked:?}");
}`,
          answer: '["05", "25"]',
          explain: "`enumerate` numbers the words from 0. The filter keeps positions 0 and 2, which are `alpha` and `gamma`, both five letters long. The `{:?}` form of a `Vec<String>` shows the quotes.",
          hint: "Which positions are even? Each kept item becomes its position followed by its length.",
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let letters = ['a', 'b', 'c'];
    let it = letters.iter();
    let first = it.next();
    println!("{first:?}");
}`,
          options: [
            { t: 'No: `next` changes the iterator, so `it` must be declared `mut`', ok: true, why: "`next` takes `&mut self`, because it moves the iterator along. The compiler reports `E0596` and suggests `let mut it`." },
            { t: "Yes, and it prints `Some('a')`", why: "It would with `let mut it`. In Python or JavaScript any name for an iterator can advance it. In Rust, advancing changes the value, and changing needs `mut`." },
            { t: "Yes, and it prints `'a'`", why: "Even with `mut` it would not print that. `next` returns an `Option`, because there may be no item left." },
            { t: 'No: an array has no `iter` method', why: "It has. Arrays, slices and `Vec` all offer `iter()`. The problem is the missing `mut`." },
          ],
          verify: 'E0596',
        },
        {
          kind: 'multi',
          q: 'Which of these consumers can stop before the iterator is used up?',
          options: [
            { t: '`find(p)`', ok: true, why: "It stops at the first item for which `p` is true." },
            { t: '`any(p)`', ok: true, why: "One `true` settles the answer." },
            { t: '`all(p)`', ok: true, why: "One `false` settles the answer." },
            { t: '`count()`', why: "It cannot know the count without reaching the end." },
            { t: '`max()`', why: "The largest item might be the last one, so it has to look at them all." },
            { t: '`sum()`', why: "Every item is part of the total." },
          ],
          hint: "Three of them can know the answer before the end.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let names = ["ada", "grace", "linus"];
    let born = [1815, 1906];
    for (name, year) in names.iter().zip(born.iter()) {
        println!("{name} {year}");
    }
    println!("{}", names.iter().zip(born.iter()).count());
}`,
          answer: 'ada 1815\ngrace 1906\n2',
          explain: "`zip` stops as soon as either side runs out. There is no year for `linus`, so there is no third pair, and no error either.",
          hint: "A pair needs one item from each side.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let result: Vec<i32> = [5, 1, 8, 2, 9]
        .iter()
        .map(|n| {
            print!("m{n} ");
            n * 2
        })
        .filter(|d| {
            print!("f{d} ");
            *d > 5
        })
        .take(2)
        .collect();
    println!();
    println!("{result:?}");
}`,
          answer: 'm5 f10 m1 f2 m8 f16\n[10, 16]',
          explain: "Each item goes through `map` and then `filter` before the next one is read. 10 passes, 2 does not, and 16 passes. That makes two items, so `take(2)` stops asking, and 2 and 9 are never read.",
          hint: "One item at a time goes through the whole chain. How many items does `take(2)` let `collect` ask for?",
        },
      ],
      challenges: [
        {
          id: 'sum-even-squares',
          title: 'Sum of the even squares',
          level: 'warm-up',
          forbid: ['for', 'while', 'loop'],
          prompt: [
            "Return the sum of the squares of the even numbers in a slice. For `[1, 2, 3, 4]` the even numbers are 2 and 4, their squares are 4 and 16, and the answer is 20.",
            "Write it as one chain of iterator methods. `for`, `while` and `loop` are not allowed here.",
          ],
          signature: 'fn sum_even_squares(numbers: &[i32]) -> i32',
          starter: rs`fn sum_even_squares(numbers: &[i32]) -> i32 {
    // This adds up every number. Keep only the even ones, and square them first.
    numbers.iter().sum()
}`,
          hints: [
            "After `numbers.iter()` the chain has three parts: a `filter`, a `map` and `sum()`.",
            "`iter()` produces `&i32`, and `filter` hands its closure a reference to that. `|n| *n % 2 == 0` works, because `%` accepts an `&i32` on its left.",
            "`numbers.iter().filter(|n| *n % 2 == 0).map(|n| n * n).sum()`",
          ],
          solution: rs`fn sum_even_squares(numbers: &[i32]) -> i32 {
    numbers.iter().filter(|n| *n % 2 == 0).map(|n| n * n).sum()
}`,
          tests: [
            { label: 'Squares the even numbers and adds them', body: rs`assert_eq!(sum_even_squares(&[1, 2, 3, 4]), 20);` },
            { label: 'An empty slice sums to zero', body: rs`assert_eq!(sum_even_squares(&[]), 0);` },
            { label: 'Odd numbers contribute nothing', body: rs`assert_eq!(sum_even_squares(&[1, 3, 5, 7]), 0);` },
            { label: 'Negative even numbers count', body: rs`assert_eq!(sum_even_squares(&[-2, -3, 6]), 40);` },
            { label: 'Zero is even', body: rs`assert_eq!(sum_even_squares(&[0, 10]), 100);` },
          ],
        },
        {
          id: 'initials',
          title: 'Initials',
          level: 'warm-up',
          prompt: [
            "Return the initials of a name: the first character of each word, as a capital. `initials(\"ada lovelace\")` is `AL`. Words are separated by any amount of white space.",
            "`split_whitespace()` gives an iterator over the words of a `&str`, and `chars()` gives an iterator over the characters of one word. `to_ascii_uppercase()` turns a `char` into its capital.",
          ],
          signature: 'fn initials(name: &str) -> String',
          starter: rs`fn initials(name: &str) -> String {
    // This keeps every word whole. Keep only the first character of each.
    name.split_whitespace().map(|word| word.to_uppercase()).collect()
}`,
          hints: [
            "The first character of a word is `word.chars().next()`, which is an `Option<char>`.",
            "`filter_map` calls a closure that returns an `Option`, and keeps what is inside each `Some`. That turns the words into their first characters in one step.",
            "`name.split_whitespace().filter_map(|word| word.chars().next()).map(|c| c.to_ascii_uppercase()).collect()`",
          ],
          solution: rs`fn initials(name: &str) -> String {
    name.split_whitespace()
        .filter_map(|word| word.chars().next())
        .map(|c| c.to_ascii_uppercase())
        .collect()
}`,
          tests: [
            { label: 'Two words', body: rs`assert_eq!(initials("ada lovelace"), "AL");` },
            { label: 'Capitals stay capitals', body: rs`assert_eq!(initials("Grace Brewster Hopper"), "GBH");` },
            { label: 'Extra white space is ignored', body: rs`assert_eq!(initials("  linus   torvalds "), "LT");` },
            { label: 'One word', body: rs`assert_eq!(initials("plato"), "P");` },
            { label: 'No words, no initials', body: rs`assert_eq!(initials(""), "");
assert_eq!(initials("   "), "");` },
          ],
        },
        {
          id: 'parse-all',
          title: 'All of them, or the first failure',
          level: 'core',
          forbid: ['for', 'while', 'loop'],
          prompt: [
            "A line holds whole numbers separated by commas, such as `4, 8, 15`. Return all of them, or the first piece that is not a number. Spaces around a piece are not part of it.",
            "Do it with one chain that ends in `collect`. The return type is the target: collecting `Result` items into a `Result<Vec<i32>, String>` stops at the first `Err`. Loops are not allowed here. The starter throws bad pieces away where it should report them.",
          ],
          signature: 'fn parse_all(line: &str) -> Result<Vec<i32>, String>',
          starter: rs`fn parse_all(line: &str) -> Result<Vec<i32>, String> {
    // filter_map drops every piece that fails to parse. Report the first one instead.
    let numbers = line
        .split(',')
        .filter_map(|piece| piece.trim().parse().ok())
        .collect();
    Ok(numbers)
}`,
          hints: [
            "Each piece should become a `Result<i32, String>`: the number, or the piece itself as the error.",
            "`piece.parse::<i32>()` gives a `Result` with the standard library's error type. `map_err(|_| piece.to_string())` replaces that error with the text of the piece.",
            "`line.split(',').map(|piece| piece.trim()).map(|piece| piece.parse::<i32>().map_err(|_| piece.to_string())).collect()`, with no `Ok(…)` around it. `collect` builds the `Result`.",
          ],
          solution: rs`fn parse_all(line: &str) -> Result<Vec<i32>, String> {
    line.split(',')
        .map(|piece| piece.trim())
        .map(|piece| piece.parse::<i32>().map_err(|_| piece.to_string()))
        .collect()
}`,
          tests: [
            { label: 'Returns every number', body: rs`assert_eq!(parse_all("1,2,3"), Ok(vec![1, 2, 3]));` },
            { label: 'Ignores spaces around a number', body: rs`assert_eq!(parse_all(" 10 , -20,30 "), Ok(vec![10, -20, 30]));` },
            { label: 'A single number', body: rs`assert_eq!(parse_all("42"), Ok(vec![42]));` },
            { label: 'Reports the piece that is not a number', body: rs`assert_eq!(parse_all("4, 8, x, 15"), Err(String::from("x")));` },
            { label: 'Reports the first bad piece, not the last', body: rs`assert_eq!(parse_all("1, two, 3, four"), Err(String::from("two")));` },
            { label: 'A number too large for an i32 is reported too', body: rs`assert_eq!(parse_all("7, 99999999999"), Err(String::from("99999999999")));` },
          ],
        },
        {
          id: 'fibonacci-iterator',
          title: 'A Fibonacci iterator',
          level: 'core',
          prompt: [
            "Make `Fibonacci` an iterator over the Fibonacci numbers: 0, 1, 1, 2, 3, 5, 8 and so on, each the sum of the two before it. The struct and its constructor are written. `next` is not.",
            "The sequence has no end, so `next` never returns `None`. Whoever uses the iterator decides how much of it to take. The tests go as far as item 90, which still fits in a `u64`.",
          ],
          signature: 'fn fibonacci() -> Fibonacci\nimpl Iterator for Fibonacci    // with Item = u64',
          starter: rs`struct Fibonacci {
    current: u64,
    after: u64,
}

fn fibonacci() -> Fibonacci {
    Fibonacci { current: 0, after: 1 }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<u64> {
        // Hand out current, and move both fields one step along the sequence.
        None
    }
}`,
          hints: [
            "Save `self.current` in a local variable first. It is what this call returns.",
            "Then `self.current` becomes `self.after`, and `self.after` becomes the sum of the two old values.",
            "`let value = self.current; self.current = self.after; self.after += value; Some(value)`",
          ],
          solution: rs`struct Fibonacci {
    current: u64,
    after: u64,
}

fn fibonacci() -> Fibonacci {
    Fibonacci { current: 0, after: 1 }
}

impl Iterator for Fibonacci {
    type Item = u64;

    fn next(&mut self) -> Option<u64> {
        let value = self.current;
        self.current = self.after;
        self.after += value;
        Some(value)
    }
}`,
          tests: [
            { label: 'Starts 0, 1, 1, 2, 3, 5, 8, 13', body: rs`let first: Vec<u64> = fibonacci().take(8).collect();
assert_eq!(first, [0, 1, 1, 2, 3, 5, 8, 13]);` },
            { label: 'Every call to fibonacci() starts from the beginning', body: rs`let mut one = fibonacci();
let _ = one.nth(5);
let mut two = fibonacci();
assert_eq!(two.next(), Some(0));
assert_eq!(one.next(), Some(8));` },
            { label: 'Works with find: the first number above 100', body: rs`assert_eq!(fibonacci().find(|n| *n > 100), Some(144));` },
            { label: 'Works in a chain: the even numbers below four million', body: rs`let total: u64 = fibonacci().take_while(|n| *n < 4_000_000).filter(|n| n % 2 == 0).sum();
assert_eq!(total, 4_613_732);` },
            { label: 'Reaches item 90 without overflow', body: rs`assert_eq!(fibonacci().nth(90), Some(2_880_067_194_370_816_120));` },
          ],
        },
        {
          id: 'run-lengths',
          title: 'Run lengths',
          level: 'core',
          prompt: [
            "Split a text into runs of the same character, and return each run as the character and the number of times it repeats. `run_lengths(\"aaabcc\")` is `[('a', 3), ('b', 1), ('c', 2)]`.",
            "A plain chain cannot do this, because each step has to know what comes next. Drive the iterator yourself. `text.chars().peekable()` is an iterator with one extra method: `peek()` returns a reference to the next item without taking it. The starter treats every character as a run of its own.",
          ],
          signature: 'fn run_lengths(text: &str) -> Vec<(char, usize)>',
          starter: rs`fn run_lengths(text: &str) -> Vec<(char, usize)> {
    // Every character becomes a run of length 1. Equal neighbors should share a run.
    text.chars().map(|c| (c, 1)).collect()
}`,
          hints: [
            "Start with `let mut chars = text.chars().peekable();` and an outer `while let Some(c) = chars.next()`. Each turn of that loop begins a new run.",
            "Inside it, count how many more characters equal `c`. The test is `chars.peek() == Some(&c)`.",
            "In the inner `while`, call `chars.next()` to take the character, and add 1 to the count. After it, push `(c, count)`.",
          ],
          solution: rs`fn run_lengths(text: &str) -> Vec<(char, usize)> {
    let mut runs = Vec::new();
    let mut chars = text.chars().peekable();
    while let Some(c) = chars.next() {
        let mut count = 1;
        // Take characters for as long as the next one is the same.
        while chars.peek() == Some(&c) {
            chars.next();
            count += 1;
        }
        runs.push((c, count));
    }
    runs
}`,
          solutionNote: "A loop over `text.chars()` that looks back at the last run with `runs.last_mut()` works just as well. This version looks ahead instead, with `peek`.",
          tests: [
            { label: 'Counts each run', body: rs`assert_eq!(run_lengths("aaabccdd"), [('a', 3), ('b', 1), ('c', 2), ('d', 2)]);` },
            { label: 'A character can come back in a later run', body: rs`assert_eq!(run_lengths("aabaa"), [('a', 2), ('b', 1), ('a', 2)]);` },
            { label: 'An empty text has no runs', body: rs`assert_eq!(run_lengths(""), []);` },
            { label: 'One long run', body: rs`assert_eq!(run_lengths("zzzzz"), [('z', 5)]);` },
            { label: 'Works on characters outside ASCII', body: rs`assert_eq!(run_lengths("ééé🦀🦀"), [('é', 3), ('🦀', 2)]);` },
          ],
        },
        {
          id: 'pairs-adapter',
          title: 'An adapter for neighbors',
          level: 'stretch',
          prompt: [
            "Write an adapter that pairs each item with the one after it. Over 1, 2, 3, 4 it produces `(1, 2)`, `(2, 3)` and `(3, 4)`. It must work over any iterator whose items can be cloned, and it must stay lazy: it pulls an item from the inner iterator only when `next` needs one.",
            "Every item except the first and the last appears in two pairs, so `next` has to keep the second half of each pair for the following call. That is what the field `previous` is for. The starter produces pairs that do not overlap.",
          ],
          signature: 'fn pairs<I: Iterator>(inner: I) -> Pairs<I>\nimpl Iterator for Pairs<I>    // with Item = (I::Item, I::Item)',
          starter: rs`struct Pairs<I: Iterator> {
    inner: I,
    previous: Option<I::Item>,
}

fn pairs<I: Iterator>(inner: I) -> Pairs<I> {
    Pairs { inner, previous: None }
}

impl<I> Iterator for Pairs<I>
where
    I: Iterator,
    I::Item: Clone,
{
    type Item = (I::Item, I::Item);

    fn next(&mut self) -> Option<Self::Item> {
        // Wrong: this hands out (1, 2) and then (3, 4). The 2 should be used twice.
        let first = self.inner.next()?;
        let second = self.inner.next()?;
        Some((first, second))
    }
}`,
          hints: [
            "On the first call `previous` is `None`. Pull one item from `inner` to fill it. If there is none, the answer is `None`.",
            "Then pull the next item from `inner`. The pair is the stored item and the new one. Before returning, store a clone of the new one in `previous`.",
            "`take()` on an `Option` moves the value out and leaves `None`, and `?` returns `None` early. So after filling `previous`: `let first = self.previous.take()?; let second = self.inner.next()?; self.previous = Some(second.clone()); Some((first, second))`",
          ],
          solution: rs`struct Pairs<I: Iterator> {
    inner: I,
    previous: Option<I::Item>,
}

fn pairs<I: Iterator>(inner: I) -> Pairs<I> {
    Pairs { inner, previous: None }
}

impl<I> Iterator for Pairs<I>
where
    I: Iterator,
    I::Item: Clone,
{
    type Item = (I::Item, I::Item);

    fn next(&mut self) -> Option<Self::Item> {
        // The first call has nothing stored yet.
        if self.previous.is_none() {
            self.previous = self.inner.next();
        }
        let first = self.previous.take()?;
        let second = self.inner.next()?;
        self.previous = Some(second.clone());
        Some((first, second))
    }
}`,
          tests: [
            { label: 'Pairs each item with the one after it', body: rs`let found: Vec<(i32, i32)> = pairs(vec![1, 2, 3, 4].into_iter()).collect();
assert_eq!(found, [(1, 2), (2, 3), (3, 4)]);` },
            { label: 'Fewer than two items make no pairs', body: rs`assert_eq!(pairs(Vec::<i32>::new().into_iter()).count(), 0);
assert_eq!(pairs(vec![7].into_iter()).count(), 0);` },
            { label: 'Works over the characters of a text', body: rs`let found: Vec<(char, char)> = pairs("abc".chars()).collect();
assert_eq!(found, [('a', 'b'), ('b', 'c')]);` },
            { label: 'Is lazy: works on an iterator with no end', body: rs`let found: Vec<(u64, u64)> = pairs(1..).take(3).collect();
assert_eq!(found, [(1, 2), (2, 3), (3, 4)]);` },
            { label: 'Items need Clone, not Copy', body: rs`let words = vec![String::from("a"), String::from("b"), String::from("c")];
let joined: Vec<String> = pairs(words.into_iter()).map(|(left, right)| left + &right).collect();
assert_eq!(joined, ["ab", "bc"]);` },
            { label: 'Chains with other adapters: the steps between neighbors', body: rs`let steps: Vec<i32> = pairs([3, 8, 6, 10].iter()).map(|(a, b)| b - a).collect();
assert_eq!(steps, [5, -2, 4]);` },
          ],
        },
      ],
    },

    {
      id: 'error-handling',
      title: 'Error handling',
      category: part,
      minutes: 35,
      summary: 'Error types a caller can act on, how the question mark converts between them, when one boxed type for every error is the better choice, and what a panic is for.',
      topics: ['Error enums', 'Display and Error', 'From and ?', 'Box<dyn Error>', 'Context and source', 'Panics', "Parse, don't validate"],
      sections: [
        {
          title: 'An error type of your own',
          body: [
            "Lesson 13 gave a function that can fail the return type `Result<T, E>`, and most of its examples used a `String` for `E`. A `String` is fine as a message for a person. It is a poor fit for a caller that has to decide what to do next. This function turns a time such as `14:30` into minutes since midnight, and its caller wants to treat one kind of failure differently from the rest.",
            { run: rs`// "14:30" becomes 870. The error is a message.
fn parse_time(text: &str) -> Result<u32, String> {
    let (hour, minute) = text.split_once(':').ok_or(String::from("no colon"))?;
    let hour: u32 = hour.parse().map_err(|_| format!("{hour:?} is not a number"))?;
    let minute: u32 = minute.parse().map_err(|_| format!("{minute:?} is not a number"))?;
    if hour > 23 {
        return Err(format!("hour {hour} is out of range"));
    }
    if minute > 59 {
        return Err(format!("minute {minute} is out of range"));
    }
    Ok(hour * 60 + minute)
}

fn main() {
    for text in ["14:30", "1430", "14:3o", "25:00"] {
        match parse_time(text) {
            Ok(minutes) => println!("{text}: {minutes} minutes"),
            // A missing colon deserves a suggestion. All the caller has to go on is the wording.
            Err(message) if message == "no colon" => println!("{text}: did you mean HH:MM?"),
            Err(message) => println!("{text}: {message}"),
        }
    }
}`, name: 'string_errors.rs', expect: '14:30: 870 minutes\n1430: did you mean HH:MM?\n14:3o: "3o" is not a number\n25:00: hour 25 is out of range\n' },
            "It works until someone rewords `no colon`. Then the comparison in `main` quietly stops matching, and nothing warns anyone, because both sides are still valid strings. The signature is no help either: `Result<u32, String>` says the function can fail and nothing about how.",
            "Lesson 12 gave you the tool for \"exactly one of these cases\": an enum. Make each way of failing a variant, and let each variant carry the data that describes it.",
            { run: rs`#[derive(Debug, PartialEq)]
enum TimeError {
    MissingColon,
    NotANumber(String),                               // the piece that did not parse
    OutOfRange { field: &'static str, value: u32 },   // field is a literal: "hour" or "minute"
}

fn parse_time(text: &str) -> Result<u32, TimeError> {
    let (hour, minute) = text.split_once(':').ok_or(TimeError::MissingColon)?;
    let hour: u32 = hour.parse().map_err(|_| TimeError::NotANumber(hour.to_string()))?;
    let minute: u32 = minute.parse().map_err(|_| TimeError::NotANumber(minute.to_string()))?;
    if hour > 23 {
        return Err(TimeError::OutOfRange { field: "hour", value: hour });
    }
    if minute > 59 {
        return Err(TimeError::OutOfRange { field: "minute", value: minute });
    }
    Ok(hour * 60 + minute)
}

fn main() {
    for text in ["14:30", "1430", "14:3o", "25:00"] {
        match parse_time(text) {
            Ok(minutes) => println!("{text}: {minutes} minutes"),
            Err(TimeError::MissingColon) => println!("{text}: did you mean HH:MM?"),
            Err(TimeError::OutOfRange { field, value }) => println!("{text}: there is no {field} {value}"),
            Err(other) => println!("{text}: {other:?}"),
        }
    }
    println!("{}", parse_time("9") == Err(TimeError::MissingColon));
}`, name: 'time_error.rs', expect: '14:30: 870 minutes\n1430: did you mean HH:MM?\n14:3o: NotANumber("3o")\n25:00: there is no hour 25\ntrue\n' },
            { list: [
              "The signature now lists every way `parse_time` can fail. It is documentation that the compiler checks.",
              "The caller matches on a variant, not on wording. Rename or remove a variant and every place that handles it stops compiling until it is brought up to date.",
              "The data is typed. `value` is a `u32` the caller can compute with, not digits inside a sentence.",
              "`derive(PartialEq)` lets a test write `assert_eq!(parse_time(\"9\"), Err(TimeError::MissingColon))`. The challenges in this lesson test your code that way.",
            ] },
            { compare: "An error enum does the job of a family of exception classes: `except ValueError` in Python, `catch (InvalidArgumentException $e)` in PHP, a chain of `instanceof` tests inside a `catch` in TypeScript. Two things differ. The list is closed, and it is in the signature. Python and PHP let any function raise anything, and what a function may raise is in its documentation at best. TypeScript gives a caught value the type `unknown`. Here `Result<u32, TimeError>` is the whole story, and a `match` with no catch-all arm stops compiling on the day someone adds a variant." },
            { tip: "An error type does not have to be an enum. When there is only one way to fail, a struct holding the details does the job, and a struct with no fields is enough when there are no details." },
          ],
        },
        {
          title: 'Display and the Error trait',
          body: [
            "An error has two readers. The programmer wants the variant and its fields, which is what `derive(Debug)` prints. The user wants a sentence. That is `Display`, the trait behind `{}`, which you implemented by hand in lesson 15.",
            { run: rs`use std::fmt;

#[derive(Debug)]
enum TimeError {
    MissingColon,
    NotANumber(String),
    OutOfRange { field: &'static str, value: u32 },
}

impl fmt::Display for TimeError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            TimeError::MissingColon => write!(f, "expected HH:MM"),
            TimeError::NotANumber(piece) => write!(f, "{piece:?} is not a number"),
            TimeError::OutOfRange { field, value } => write!(f, "{field} out of range: {value}"),
        }
    }
}

fn main() {
    let errors = [
        TimeError::MissingColon,
        TimeError::NotANumber(String::from("3o")),
        TimeError::OutOfRange { field: "hour", value: 25 },
    ];
    for error in &errors {
        println!("{error}");            // for the user
        println!("    {error:?}");      // for the programmer
    }
    let line = format!("could not read the start time: {}", errors[2]);
    println!("{line}");
}`, name: 'display_error.rs', expect: 'expected HH:MM\n    MissingColon\n"3o" is not a number\n    NotANumber("3o")\nhour out of range: 25\n    OutOfRange { field: "hour", value: 25 }\ncould not read the start time: hour out of range: 25\n' },
            "By convention an error message starts in lower case and has no period at the end. Messages get embedded in longer ones, as the last line shows, and a capital letter and a period in the middle of a sentence read badly.",
            "The standard library has a trait that marks a type as an error. Leaving out a few methods that are rarely used, this is all of it:",
            { code: rs`pub trait Error: Debug + Display {
    // The error underneath this one, if this one wraps another.
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        None
    }
}` },
            "`Error: Debug + Display` names two **supertraits**: a type may implement `Error` only if it also implements `Debug` and `Display`. The one method has a default body. So for a type that already has both forms, the implementation is an empty block.",
            { run: rs`use std::error::Error;
use std::fmt;

#[derive(Debug)]
struct EmptyName;                       // an error with nothing to say beyond its name

impl fmt::Display for EmptyName {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "a name cannot be empty")
    }
}

impl Error for EmptyName {}

// Written once, for any error: yours, or one from the standard library.
fn log(error: &dyn Error) {
    println!("failed: {error}");
}

fn main() {
    log(&EmptyName);

    let not_a_number = "12a".parse::<i32>().unwrap_err();
    log(&not_a_number);
}`, name: 'any_error.rs', expect: 'failed: a name cannot be empty\nfailed: invalid digit found in string\n' },
            "The empty `impl` adds no behavior. What it buys is membership. `log` takes a `&dyn Error`, the trait-object reference from lesson 16, so it accepts a reference to any type that implements `Error`. The standard library's own errors implement it, and now `EmptyName` does. The rest of this lesson uses three things written for \"any error\": the `Box<dyn Error>` type, the `source` chain, and `main`.",
            "The supertraits are enforced. Leave `Display` out and the compiler refuses the `impl`:",
            { run: rs`#[derive(Debug)]
struct EmptyName;

impl std::error::Error for EmptyName {}

fn main() {
    println!("{:?}", EmptyName);
}`, name: 'no_display.rs', fails: 'E0277' },
            { tip: "Derive `Debug` on every error type, and `PartialEq` when the fields allow it, because it makes tests short. Some of the standard library's errors, such as the one for file operations, cannot be compared or cloned. An enum that holds one of those cannot derive `PartialEq` or `Clone` either." },
          ],
        },
        {
          title: '? converts with From',
          body: [
            "So far, every `?` in this lesson came right after an `ok_or` or a `map_err` that had already produced the function's own error type. Take the `map_err` away and see what the compiler says.",
            { run: rs`#[derive(Debug)]
enum TimeError {
    MissingColon,
}

fn parse_hour(text: &str) -> Result<u32, TimeError> {
    let (hour, _minute) = text.split_once(':').ok_or(TimeError::MissingColon)?;
    let hour = hour.parse::<u32>()?;
    Ok(hour)
}

fn main() {
    println!("{:?}", parse_hour("14:30"));
}`, name: 'no_conversion.rs', fails: 'E0277' },
            "Read the last note: the question mark operation implicitly performs a conversion on the error value using the `From` trait. Lesson 13 described `?` as \"give me the value, or return the error\". In full, `value?` stands for this:",
            { code: rs`match value {
    Ok(inner) => inner,
    Err(error) => return Err(From::from(error)),
}` },
            "`From::from(error)` converts the error into whatever error type the function returns. When the two types are the same, that is the conversion from a type to itself, which exists for every type and does nothing. When they differ, the compiler looks for `impl From<TheirError> for YourError`, and the message above names the one it could not find. Lesson 15 introduced `From`. This is the place where you will implement it most often.",
            { run: rs`use std::num::ParseIntError;

#[derive(Debug)]
enum TimeError {
    MissingColon,
    NotANumber(ParseIntError),                        // keeps the original error
    OutOfRange { field: &'static str, value: u32 },
}

impl From<ParseIntError> for TimeError {
    fn from(error: ParseIntError) -> Self {
        TimeError::NotANumber(error)
    }
}

fn parse_time(text: &str) -> Result<u32, TimeError> {
    let (hour, minute) = text.split_once(':').ok_or(TimeError::MissingColon)?;
    let hour: u32 = hour.parse()?;          // a ParseIntError becomes a TimeError here
    let minute: u32 = minute.parse()?;      // and here
    if hour > 23 {
        return Err(TimeError::OutOfRange { field: "hour", value: hour });
    }
    if minute > 59 {
        return Err(TimeError::OutOfRange { field: "minute", value: minute });
    }
    Ok(hour * 60 + minute)
}

fn main() {
    for text in ["14:30", "14:3o", "14:75", "1475"] {
        match parse_time(text) {
            Ok(minutes) => println!("{text}: {minutes} minutes"),
            Err(TimeError::MissingColon) => println!("{text}: expected HH:MM"),
            Err(TimeError::NotANumber(inner)) => println!("{text}: {inner}"),    // the standard library's own message
            Err(TimeError::OutOfRange { field, value }) => println!("{text}: {field} out of range: {value}"),
        }
    }
}`, name: 'from_error.rs', expect: '14:30: 870 minutes\n14:3o: invalid digit found in string\n14:75: minute out of range: 75\n1475: expected HH:MM\n' },
            "The body now reads as the successful path from top to bottom, and each `?` marks a point where the function may leave early. The conversion is declared once, beside the error type, not at every call. The variant holds the `ParseIntError` itself this time, so nothing the standard library knew about the failure is lost.",
            { pitfall: "`From` gives you one conversion for each source type, and it runs with no knowledge of where it was called. `parse_time` can no longer say whether the hour or the minute was the bad one, because both go through the same `from`. When the place matters, keep a `map_err` at that call and put the place into the variant. `?` with `From` is for a conversion that means the same thing everywhere." },
            "Leaving early is safe for the same reason every `return` is: the values the function owns are dropped on the way out. The `Connection` below prints from `drop`, the method that runs when a value is freed. Lesson 20 covers the `Drop` trait in full.",
            { run: rs`struct Connection {
    name: &'static str,
}

impl Drop for Connection {
    fn drop(&mut self) {
        println!("closing {}", self.name);
    }
}

fn copy_setting(text: &str) -> Result<u32, std::num::ParseIntError> {
    let source = Connection { name: "source" };
    let target = Connection { name: "target" };
    let value: u32 = text.parse()?;              // on Err, the function returns from this line
    println!("copied {value} from {} to {}", source.name, target.name);
    Ok(value)
}

fn main() {
    println!("{}", copy_setting("42").is_ok());
    println!("{}", copy_setting("forty-two").is_ok());
}`, name: 'early_return_drops.rs', expect: 'copied 42 from source to target\nclosing target\nclosing source\ntrue\nclosing target\nclosing source\nfalse\n' },
            "Both connections are closed on both paths, in the reverse of the order they were opened, and the function has no code for it.",
            { fromC: "A C function that acquires three resources and can fail in four places ends in a ladder of `goto cleanup` labels, and every early `return` is a chance to leak. Here `?` returns early and `Drop` releases whatever had been acquired by that point. There is no cleanup code to write, so there is none to get wrong." },
            { compare: "`?` is the visible form of what an exception does invisibly. In Python, PHP and TypeScript any call may throw, and you cannot tell from a line of code whether control can leave the function there. A Rust function leaves early only at a `?`, a `return` or a panic, and the first two are on the page. Cleanup is the same contrast. `finally`, Python's `with` and TypeScript's `using` exist because an exception skips the rest of the block. `Drop` runs on every way out." },
          ],
        },
        {
          title: 'Box<dyn Error>: any error at all',
          body: [
            "An error enum earns its keep when callers act differently on different variants. Much code does not. A command-line tool, a script, the top of a request handler: each calls ten things that can fail in ten ways, and whichever fails, the response is the same. Report it and stop. A variant and a `From` for every one of them would be written for a `match` that nobody writes.",
            "For that there is `Box<dyn Error>`. Lesson 16 explained `Box<dyn Trait>`: an owning pointer to a value of some type that implements the trait, with the exact type forgotten. `Box<dyn Error>` is a pointer to some error. The standard library implements `From<E>` for it for every `E` that implements `Error`, so `?` converts any error into it with nothing written by you.",
            { run: rs`use std::error::Error;
use std::fmt;

#[derive(Debug)]
struct TooManyGuests {
    asked: u32,
    seats: u32,
}

impl fmt::Display for TooManyGuests {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{} guests for {} seats", self.asked, self.seats)
    }
}

impl Error for TooManyGuests {}

fn book(guests: &str, seats: &str) -> Result<u32, Box<dyn Error>> {
    let guests: u32 = guests.parse()?;                // a ParseIntError, boxed by ?
    let seats: u32 = seats.parse()?;
    if seats == 0 {
        return Err("the room has no seats".into());   // a message, boxed
    }
    if guests > seats {
        return Err(Box::new(TooManyGuests { asked: guests, seats }));   // your own type, boxed
    }
    Ok(seats - guests)
}

fn main() {
    for (guests, seats) in [("4", "10"), ("four", "10"), ("4", "0"), ("12", "10")] {
        match book(guests, seats) {
            Ok(left) => println!("booked, {left} seats left"),
            Err(error) => println!("cannot book: {error}"),
        }
    }

    // Getting the type back means asking for it by name.
    let error = book("12", "10").unwrap_err();
    if let Some(too_many) = error.downcast_ref::<TooManyGuests>() {
        println!("short by {}", too_many.asked - too_many.seats);
    }
}`, name: 'boxed_error.rs', expect: 'booked, 6 seats left\ncannot book: invalid digit found in string\ncannot book: the room has no seats\ncannot book: 12 guests for 10 seats\nshort by 2\n' },
            { list: [
              "`?` boxed a `ParseIntError` without a `From` of your own.",
              "`\"…\".into()` turns a string literal into a boxed error. This is the one good use of a text error: a one-off message at the top of an application.",
              "The caller prints with `{}` and gets each error's own `Display`, through the vtable from lesson 16.",
            ] },
            "The price is the type. The caller sees \"some error\" and cannot `match` on it. `downcast_ref::<TooManyGuests>()` asks whether the box holds that type and returns an `Option`. It works, and the compiler no longer tells you when a case is missing.",
            { table: {
              head: ['Code', 'Error type', 'Why'],
              rows: [
                ['A library, or any function whose callers branch on the failure', 'An enum or struct of your own that implements `Error`', 'Callers match on it, and the compiler checks that they cover it'],
                ['The top of a program: `main`, one command, one request', '`Box<dyn Error>`, or `anyhow::Error` from the next section', 'Nobody matches. The error is reported and the work stops'],
                ['A test, an example, an experiment', '`Box<dyn Error>`, or `unwrap`', 'The code is its own only caller'],
                ['Almost nowhere', '`String`', 'It cannot be matched on, and it is not an `Error`, so it has no `source`'],
              ],
            } },
            "The question to ask is not \"library or application\" but \"will the caller do anything other than report this?\". A function deep inside an application whose caller retries on one failure and gives up on another needs an enum as much as any library does.",
            "**main can return a Result.** Until now `main` has returned nothing. It may return a `Result` instead, and then `?` works in `main` too.",
            { run: rs`use std::fmt;

#[derive(Debug)]
enum StartupError {
    NoPort,
    PortInUse(u16),
}

impl fmt::Display for StartupError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            StartupError::NoPort => write!(f, "no port was given"),
            StartupError::PortInUse(port) => write!(f, "port {port} is already in use"),
        }
    }
}

impl std::error::Error for StartupError {}

fn listen(port: Option<u16>) -> Result<u16, StartupError> {
    let port = port.ok_or(StartupError::NoPort)?;
    if port == 8080 {
        return Err(StartupError::PortInUse(port));
    }
    Ok(port)
}

fn main() -> Result<(), StartupError> {
    let first = listen(Some(3000))?;
    println!("listening on {first}");
    let second = listen(Some(8080))?;
    println!("listening on {second}");
    Ok(())
}`, name: 'main_returns_err.rs', exits: 1, expect: 'listening on 3000\n' },
            "The second `?` returned an `Err` from `main`. The standard library then printed `Error: ` followed by the error to standard error, and ended the process with status 1. A status other than 0 tells the shell, or whatever started the program, that it failed. A panic ends with 101.",
            { pitfall: "Look at what was printed: `Error: PortInUse(8080)`, not `port 8080 is already in use`. A returned `Err` is shown in its `Debug` form, even though the type has a `Display`. For a tool that people use, that is the wrong form. The usual shape is a `run` function that returns the `Result` and a small `main` that decides how to report it." },
            { run: rs`use std::error::Error;
use std::process::ExitCode;

fn run() -> Result<(), Box<dyn Error>> {
    let workers: u32 = "four".parse()?;
    println!("starting {workers} workers");
    Ok(())
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}");      // the Display form, on standard error
            ExitCode::FAILURE                 // status 1
        }
    }
}`, name: 'run_and_report.rs', exits: 1, expect: '' },
            { aside: "`main` may return any type that implements the `Termination` trait, which turns the value into an exit status. `()` and `ExitCode` implement it, and so does `Result<T, E>` when `E` implements `Debug`. That bound is the reason the message uses the `Debug` form: it is the only thing `main` is allowed to assume about your error." },
          ],
        },
        {
          title: 'Adding context',
          body: [
            "An error that was accurate where it was made can be useless where it is read. `invalid digit found in string` is a complete account of what `parse` saw. To someone who ran your program on a file of 400 lines it says nothing: which line, which file? The code that failed does not know. Its callers do, and each layer should add what it knows as the error passes through on its way up.",
            "The way to add it is to wrap: a new error that holds the context and the original error. The `Error` trait has a method for this, `source`, which section 2 left at its default.",
            { run: rs`use std::error::Error;
use std::fmt;
use std::num::ParseIntError;

#[derive(Debug)]
struct LineError {
    line: usize,
    source: ParseIntError,
}

impl fmt::Display for LineError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "line {} is not a whole number", self.line)
    }
}

impl Error for LineError {
    // The error underneath this one.
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(&self.source)
    }
}

fn total(text: &str) -> Result<i64, LineError> {
    let mut sum = 0;
    for (index, line) in text.lines().enumerate() {
        let amount = line
            .trim()
            .parse::<i64>()
            .map_err(|source| LineError { line: index + 1, source })?;
        sum += amount;
    }
    Ok(sum)
}

// Prints an error, then everything underneath it.
fn report(error: &dyn Error) {
    println!("error: {error}");
    let mut cause = error.source();
    while let Some(inner) = cause {
        println!("  caused by: {inner}");
        cause = inner.source();
    }
}

fn main() {
    println!("{:?}", total("120\n-45\n30").ok());
    if let Err(error) = total("120\n4 5\n30") {
        report(&error);
    }
    if let Err(error) = total("120\n-45\n\n30") {
        report(&error);
    }
}`, name: 'context.rs', expect: 'Some(105)\nerror: line 2 is not a whole number\n  caused by: invalid digit found in string\nerror: line 3 is not a whole number\n  caused by: cannot parse integer from empty string\n' },
            { list: [
              "`LineError` overrides `source` to hand out the error it wraps. `report` follows the chain to its end without knowing any of the types, because every link is a `dyn Error`.",
              "`map_err` does here what `From` cannot: its closure captures `index`, which exists only at this call. Context that is local to one call needs `map_err`.",
              "The `'static` in `&(dyn Error + 'static)` means the wrapped error holds no borrowed data. In practice, build error types from owned values such as `String`, not from `&str` slices of the input.",
            ] },
            { tip: "Say each thing once. A wrapper's `Display` describes its own layer and leaves the inner message to `source`. If it also printed the inner message, every reporter that walks the chain would show the cause twice." },
            { native: [
              "Writing `Display`, `Error` and `From` by hand is repetitive enough that two crates turn up in most projects. Neither is available in the Run cells here, which have only the standard library. Lesson 22 shows how to add a crate with Cargo.",
              { shell: 'cargo add thiserror anyhow', name: 'Terminal · add both crates to a project' },
              "**thiserror** writes the three implementations for an error type from attributes. The enum is still yours, and callers match on it exactly as before, so it suits code that others call.",
              { code: rs`use thiserror::Error;

#[derive(Debug, Error)]
pub enum TimeError {
    #[error("expected HH:MM")]                          // the Display text
    MissingColon,

    #[error("not a number")]
    NotANumber(#[from] std::num::ParseIntError),        // From, and source()

    #[error("{field} out of range: {value}")]
    OutOfRange { field: &'static str, value: u32 },
}` },
              "**anyhow** is `Box<dyn Error>` with the missing parts added. `anyhow::Result<T>` accepts any error through `?`. `context` wraps an error in a message, as `LineError` did by hand. When `main` returns an `anyhow::Error`, the report lists the whole chain.",
              { code: rs`use anyhow::{bail, Context, Result};

fn total(path: &str) -> Result<i64> {
    let text = std::fs::read_to_string(path)
        .with_context(|| format!("could not read {path}"))?;
    let mut sum = 0;
    for (index, line) in text.lines().enumerate() {
        let amount: i64 = line
            .trim()
            .parse()
            .with_context(|| format!("line {} is not a whole number", index + 1))?;
        if amount == 0 {
            bail!("line {} is zero", index + 1);        // return an error made from a message
        }
        sum += amount;
    }
    Ok(sum)
}` },
              "The usual split is `thiserror` in code that others call, and `anyhow` in the program that calls it.",
            ] },
          ],
        },
        {
          title: 'Panics, properly',
          body: [
            "`Result` is for failures a program expects and a caller can handle: bad input, a missing file, a full disk. A **panic** is for the other kind, where the program finds itself in a state its author believed impossible. An index past the end of a slice. An `unwrap` on a `None` that could not happen. Arithmetic that overflowed. These are bugs, no caller can repair a bug, and the honest response is to stop before it does damage.",
            "A panic is not a crash in the sense of reading stray memory. It follows a fixed procedure.",
            { steps: [
              "The message and the location are printed to standard error.",
              "The stack **unwinds**. The function that panicked is abandoned and its local values are dropped, in the usual reverse order. Then the same happens to its caller, and to that function's caller, all the way up.",
              "When the unwinding reaches the top of the thread, the thread ends. If it is the main thread, the process exits with status 101.",
            ] },
            { run: rs`struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("dropping {}", self.0);
    }
}

fn inner(items: &[u32], index: usize) -> u32 {
    let _guard = Noisy("inner's guard");
    let value = items[index];              // out of bounds: the panic starts here
    println!("inner finished");            // never runs
    value
}

fn outer() -> u32 {
    let _file = Noisy("outer's file");
    let value = inner(&[1, 2, 3], 7);
    println!("outer finished");            // never runs
    value
}

fn main() {
    let _log = Noisy("main's log");
    println!("{}", outer());
}`, name: 'unwinding.rs', panics: true, expect: "dropping inner's guard\ndropping outer's file\ndropping main's log\n" },
            "Every destructor ran, innermost first. A file would have been closed and a lock released. Neither `finished` line ran, and `main` never got a value to print: a panic does not come back. The message went to standard error and the `dropping` lines to standard output, so they may be shown apart. In time, the message came first. A variable whose name starts with `_` is one you never read, kept only so that the value lives to the end of the function.",
            "Several macros and methods panic on purpose. Each one says something a little different to the reader.",
            { table: {
              head: ['Write', 'It says'],
              rows: [
                ['`unwrap()`', 'This cannot fail here, and I have not said why. Fine in tests, examples and experiments'],
                ['`expect("why")`', 'This cannot fail here, for this reason. The reason is printed if you were wrong'],
                ['`assert!(condition, "why")`, `assert_eq!`', 'This must hold at this point. `debug_assert!` is the same check, left out of release builds'],
                ['`unreachable!()`', 'The logic rules this branch out, although the compiler cannot see that'],
                ['`todo!()`', 'Not written yet. It has whatever type is needed, so the code around it compiles'],
                ['`panic!("message")`', 'Stop, when none of the others says it better'],
              ],
            } },
            { run: rs`// The slice must not be empty.
fn largest(values: &[i32]) -> i32 {
    *values.iter().max().expect("largest needs at least one value")
}

fn main() {
    println!("{}", largest(&[3, 9, 4]));
    println!("{}", largest(&[]));
}`, name: 'expect.rs', panics: true, expect: '9\n' },
            "Which should a function do, return an `Err` or panic? Ask who is at fault.",
            { list: [
              "**Bad input is not a bug.** Whatever comes from outside the program, such as a file, a person, the network or another process, will be wrong sooner or later. That is an `Err`.",
              "**A broken promise is a bug.** If a function says its slice must not be empty and is handed an empty one, the caller's code is wrong. An error value would only pass the bug along, so a panic is right. Say so in the function's documentation.",
              "**A library panics rarely.** Its author cannot know what the caller is able to recover from, so when in doubt it returns a `Result` and lets the caller choose. `unwrap` is that choice, and it belongs to the caller.",
              "**Give the reader the reason.** An `expect` whose message states why the failure cannot happen is a comment that gets checked.",
            ] },
            { compare: "A panic looks like an uncaught exception: a message, a stack that unwinds, cleanup on the way. The difference is what it is used for. Python and JavaScript have one mechanism for \"the file is missing\" and for \"this index is out of range\", and callers sort the two out by class. PHP comes closest to Rust's split: since version 7 it has `Exception` for conditions a program handles and `Error` for mistakes in the code. Rust makes the split complete. An expected failure is a value in the return type, and a panic is not something callers are meant to catch." },
            { aside: "A panic can be stopped on its way up. `std::panic::catch_unwind` runs a closure and returns an `Err` if it panicked. It is meant for boundaries: a server that must survive a bug in one request, a thread pool, a test runner. The challenge tests in this course use it, which is how the next test still runs after an assertion fails. It is not a `try` block. A program can be built with `panic = \"abort\"`, where a panic ends the process at once with no unwinding and no destructors, so correct code never depends on catching one." },
          ],
        },
        {
          title: "Designing with errors: parse, don't validate",
          body: [
            "The best check is the one you make once. Here are two ways to handle a time of day that arrives as text. The first **validates**: a function looks at the text and answers yes or no.",
            { run: rs`fn is_valid_time(text: &str) -> bool {
    match text.split_once(':') {
        Some((hour, minute)) => {
            hour.parse::<u32>().is_ok_and(|h| h < 24) && minute.parse::<u32>().is_ok_and(|m| m < 60)
        }
        None => false,
    }
}

// Call this only with text that has passed is_valid_time.
fn twelve_hour(text: &str) -> String {
    let (hour, minute) = text.split_once(':').unwrap();
    let hour: u32 = hour.parse().unwrap();
    let minute: u32 = minute.parse().unwrap();
    let suffix = if hour < 12 { "am" } else { "pm" };
    let hour = if hour % 12 == 0 { 12 } else { hour % 12 };
    format!("{hour}:{minute:02} {suffix}")
}

fn main() {
    for text in ["09:15", "17:45", "24:00"] {
        if is_valid_time(text) {
            println!("{}", twelve_hour(text));
        }
    }
}`, name: 'validate.rs', expect: '9:15 am\n5:45 pm\n' },
            "It works, and a comment is all that holds it together. `is_valid_time` found out that the text has a colon and two numbers in range. Then it returned a `bool` and threw the rest away. `twelve_hour` receives a `&str` like any other, so it splits and parses all over again, with three `unwrap` calls that are safe only if every caller, present and future, remembered to validate first. The type `&str` has no way to say \"already checked\".",
            "The second way **parses**: the check returns a value of a new type, and the check is the only way to get one.",
            { run: rs`use std::str::FromStr;

#[derive(Debug, Clone, Copy, PartialEq)]
struct TimeOfDay {
    minutes: u32,                  // since midnight, and always less than 24 * 60
}

#[derive(Debug, PartialEq)]
enum TimeError {
    MissingColon,
    NotANumber,
    OutOfRange,
}

impl FromStr for TimeOfDay {
    type Err = TimeError;

    fn from_str(text: &str) -> Result<Self, Self::Err> {
        let (hour, minute) = text.split_once(':').ok_or(TimeError::MissingColon)?;
        let hour: u32 = hour.parse().map_err(|_| TimeError::NotANumber)?;
        let minute: u32 = minute.parse().map_err(|_| TimeError::NotANumber)?;
        if hour > 23 || minute > 59 {
            return Err(TimeError::OutOfRange);
        }
        Ok(TimeOfDay { minutes: hour * 60 + minute })
    }
}

// No Result, no unwrap and no comment. A TimeOfDay that exists is a valid one.
fn twelve_hour(time: TimeOfDay) -> String {
    let (hour, minute) = (time.minutes / 60, time.minutes % 60);
    let suffix = if hour < 12 { "am" } else { "pm" };
    let hour = if hour % 12 == 0 { 12 } else { hour % 12 };
    format!("{hour}:{minute:02} {suffix}")
}

fn main() -> Result<(), TimeError> {
    let start: TimeOfDay = "09:15".parse()?;
    let end: TimeOfDay = "17:45".parse()?;
    println!("{} to {}", twelve_hour(start), twelve_hour(end));
    println!("{:?}", "24:00".parse::<TimeOfDay>());
    println!("{:?}", "noon".parse::<TimeOfDay>());
    Ok(())
}`, name: 'parse.rs', expect: '9:15 am to 5:45 pm\nErr(OutOfRange)\nErr(MissingColon)\n' },
            "`FromStr` is the trait behind `parse`. Every `\"42\".parse::<i32>()` in this course has been a call to the implementation of `FromStr` for `i32`, and implementing it for your own type makes `text.parse::<TimeOfDay>()` work in the same way. Its associated type `Err` names the error. For a conversion from something other than text, the matching trait is `TryFrom`, which lesson 2 used as `u8::try_from`.",
            "The design is only airtight if `from_str` is the one way to make a `TimeOfDay`. Privacy does that. A field is private to the module that defines its struct, so code elsewhere cannot write `TimeOfDay { minutes: 9999 }` and has to go through `parse`. In a one-file example everything is in the same module, so nothing stops `main` here. Lesson 22 covers modules, and from then on the guarantee is real.",
            { list: [
              "**Check at the edge, once.** Turn raw input into checked types at the point where it enters the program. The code inside works with values that cannot be wrong, so most of it cannot fail and returns no `Result`.",
              "**Let the type carry the proof.** A function that takes a `TimeOfDay` cannot be handed unchecked text. The compiler now enforces the rule that the comment could only state.",
              "**Make the bad state impossible to write down.** Lesson 12 did this with enums, where each variant holds exactly the data its case has. A constructor that returns a `Result` does it for ranges and formats.",
              "**A function that cannot fail should not return a Result.** An error type is a promise about what can go wrong. Do not promise failures that never happen.",
            ] },
            { compare: "TypeScript programmers call a weaker form of this a branded type, and a schema library that turns `unknown` into a typed object does the checking half at run time. Python has `NewType`, and dataclasses that check their fields in `__post_init__`. PHP has value objects whose constructors throw. Each relies on discipline somewhere: a cast, an `any`, a property assigned after construction. With private fields and no null, a Rust value that exists has been through its constructor." },
          ],
        },
      ],
      takeaways: [
        "An error enum lists the ways a function can fail. Callers match on variants, not on message text, and the compiler tells them when a variant is added.",
        "Derive `Debug` for the programmer, implement `Display` for the user, and add `impl Error` so the type works with everything written for errors.",
        "`?` returns early with `From::from(error)`. Implement `From<TheirError> for YourError` to make it convert, and use `map_err` when the conversion needs something local.",
        "`Box<dyn Error>` takes any error through `?` and gives up matching. Use your own type where callers branch on the failure, and a boxed error where they only report it.",
        "`main` may return a `Result`. An `Err` is printed in its `Debug` form and the process exits with status 1.",
        "Add context by wrapping an error, and return the original from `source`.",
        "A panic is for bugs. It unwinds the stack, runs destructors and ends the thread. Anything the outside world can cause is an `Err`.",
        "Parse, don't validate: return a type that proves the check was made, so it is made once.",
      ],
      quiz: [
        {
          q: 'A library function returns `Result<Config, String>`. What is the main cost to the code that calls it?',
          options: [
            { t: 'The caller can tell one failure from another only by comparing message text, which breaks when a message is reworded', ok: true, why: "A `String` can be shown and nothing else. An enum gives the caller variants to match on, puts the list of failures in the signature, and lets the compiler report a case that is not handled." },
            { t: 'A `String` cannot be returned with `?`', why: "It can. `?` works with any error type, as long as the error can be converted into the one the function returns. Converting a type to itself always works." },
            { t: 'The code does not compile, because `String` does not implement `Error`', why: "It is true that `String` does not implement `Error`, but `Result<T, E>` puts no requirement on `E`. Any type can be an error type. The code compiles, and the caller is left with text." },
            { t: 'Building the `String` allocates, and an error must not allocate', why: "There is no such rule. `Box<dyn Error>` allocates as well, and the cost falls on the path that failed. The problem is what the caller can do with the error, not what it cost to make." },
          ],
        },
        {
          q: 'Does this program compile?',
          code: rs`use std::num::ParseFloatError;

#[derive(Debug)]
enum ReadError {
    BadNumber,
}

impl From<ParseFloatError> for ReadError {
    fn from(_: ParseFloatError) -> Self {
        ReadError::BadNumber
    }
}

fn read(text: &str) -> Result<i32, ReadError> {
    let n = text.parse::<i32>()?;
    Ok(n * 2)
}

fn main() {
    println!("{:?}", read("21"));
}`,
          options: [
            { t: 'No: `?` calls `From::from` on a `ParseIntError`, and `ReadError` has a `From` only for `ParseFloatError`', ok: true, why: "`?` returns `Err(From::from(error))`. Parsing an `i32` fails with a `ParseIntError`, so the function needs `impl From<ParseIntError> for ReadError`. The compiler reports `E0277` and names that missing implementation." },
            { t: 'Yes, and it prints `Ok(42)`: the text is a valid number, so no conversion is needed', why: "Python would only notice on the day the failing path ran. Rust checks the types of every path before the program exists, including the `Err` path that this input never takes." },
            { t: 'Yes: `?` uses the `From` that is available, since both are errors from parsing a number', why: "No conversion is ever chosen because it is close. `ParseIntError` and `ParseFloatError` are unrelated types, and `From` must be implemented for the exact one." },
            { t: 'No: `ReadError` does not implement `Display` and `Error`', why: "`?` does not ask for either. Any type can be an error type. Those traits matter for printing, for `Box<dyn Error>` and for `source`." },
          ],
          verify: 'E0277',
        },
        {
          q: 'You are writing a crate that parses dates. Other people\'s programs will call `parse_date`, and some of them want to suggest a correction when the month is out of range. What should the error type be?',
          options: [
            { t: 'An enum of your own that implements `Error`, with a variant for the month', ok: true, why: "The callers branch on the kind of failure, so they need variants to match on. Implementing `Error` lets the callers who only report it put it in a `Box<dyn Error>` with `?`." },
            { t: '`Box<dyn Error>`', why: "It hides the type from the people who need it. They would have to guess a type name and call `downcast_ref`, and nothing would tell them when you add a new kind of failure." },
            { t: '`String`, with a clear message for each case', why: "The callers would have to compare message text to find the month case, and your next rewording would break them without a compile error." },
            { t: 'None: the function should panic on a bad date', why: "A date that comes from a user or a file will be wrong sooner or later. That is expected input, not a bug in the calling program, and a library should let its caller decide what to do." },
          ],
        },
        {
          q: 'You are writing the `main` of a command-line tool. It reads a file, parses it with one crate and uploads the result with another. Whatever fails, the tool prints the problem and exits. What should `run` return as its error type?',
          options: [
            { t: '`Box<dyn Error>`, or `anyhow::Error`', ok: true, why: "Nothing matches on the error. Every failure is handled the same way, so a type that accepts any error through `?` is all that is needed." },
            { t: 'An enum with a variant and a `From` for each crate\'s error type', why: "It would work, and every variant and every `From` would be written for a `match` that nobody writes. An enum pays for itself when a caller acts differently on different variants." },
            { t: '`String`, calling `map_err(|e| e.to_string())` at each step', why: "That is a conversion written by hand at every call, which `Box<dyn Error>` does for you with a plain `?`. It also throws away each error's `source` chain." },
            { t: 'Nothing: call `unwrap` at each step', why: "A missing file is not a bug in the tool. The user would get a panic message with a source location in your code, and exit status 101, for what should be one readable line." },
          ],
        },
        {
          q: 'Inside an online shop\'s own code, `reserve_stock` can fail in two ways. The caller retries when the stock service timed out, and tells the customer when the item is sold out. What should the error type of `reserve_stock` be?',
          options: [
            { t: 'An enum with a variant for each of the two failures', ok: true, why: "The caller does two different things, so it has to tell the failures apart, and a `match` on an enum is the checked way to do that. The question is whether the caller branches, not whether the code is a library." },
            { t: '`Box<dyn Error>`, because this is an application and not a library', why: "Library or application is a rule of thumb for a better question: does the caller do anything other than report the error? Here it does. With a boxed error it would need `downcast_ref`, and the compiler could no longer check that both cases are handled." },
            { t: '`String`, because the customer is shown a message anyway', why: "The retry decision would then hang on the wording of a message. What the customer sees is a job for `Display`." },
            { t: 'A `bool`: `true` for a timeout and `false` for sold out', why: "It tells the two apart today, but it cannot carry any data, a third failure has no value to use, and `Err(true)` says nothing to a reader. That is what variant names are for." },
          ],
        },
        {
          q: 'What happens when this program runs?',
          code: rs`#[derive(Debug)]
enum LoadError {
    Empty,
}

fn first(items: &[i32]) -> Result<i32, LoadError> {
    items.first().copied().ok_or(LoadError::Empty)
}

fn main() -> Result<(), LoadError> {
    println!("{}", first(&[7, 8])?);
    println!("{}", first(&[])?);
    println!("done");
    Ok(())
}`,
          options: [
            { t: 'It prints `7`, then `Error: Empty` on standard error, and exits with status 1', ok: true, why: "The second `?` returns the `Err` from `main`. The standard library prints `Error: ` and the `Debug` form of the value, and the process ends with status 1. `done` is never printed." },
            { t: 'It prints `7`, then panics and exits with status 101', why: "That is what `first(&[]).unwrap()` would do. `?` does not panic. It returns the error to whoever called the function, and for `main` that is the standard library's startup code." },
            { t: 'It prints `7` and `done` and exits with status 0, because nothing handles the error', why: "`?` returns from `main` at the first `Err`, so the third line never runs. And an error returned from `main` is not dropped in silence, the way an unchecked return code is in C or a shell script." },
            { t: 'It does not compile: `main` cannot have a return type', why: "`main` may return a `Result` whose error type implements `Debug`, and `LoadError` derives it." },
          ],
        },
        {
          kind: 'multi',
          q: 'The expression `items[9]` in a function `load` panics, and nothing catches the panic. Which of these happen?',
          options: [
            { t: 'The panic message and its location are printed to standard error', ok: true, why: "That is the first thing a panic does." },
            { t: '`drop` runs for the local values of `load`', ok: true, why: "Unwinding drops the locals of the function that panicked, in reverse order." },
            { t: '`drop` runs for the local values of the functions that called `load`, up to `main`', ok: true, why: "Unwinding continues through every caller. That is how files are closed and locks released even when the program is going down." },
            { t: 'The statements after `items[9]` in `load` run, with a default value in place of the element', why: "Nothing after the panicking expression runs. There is no default: JavaScript would produce `undefined` and carry on, and C would read whatever is next in memory." },
            { t: 'The caller\'s `match` on the result of `load` takes its `Err` arm', why: "A panic is not an `Err`. `load` never returns, so its caller has no value to match on." },
            { t: 'The process exits with status 1', why: "Status 1 is for an `Err` returned from `main`. A panic in the main thread ends the process with 101." },
          ],
          hint: "Three of them happen. Think about what unwinding does to each function on the stack.",
        },
      ],
      challenges: [
        {
          id: 'display-the-error',
          title: 'Give an error a message',
          level: 'warm-up',
          prompt: [
            "`OrderError` already derives `Debug` and has an empty `impl Error`. Its `Display` prints the same vague text for every variant. Give each variant a message of its own, using the data it carries.",
            { table: {
              head: ['Value', 'Message'],
              rows: [
                ['`OrderError::Closed`', '`the shop is closed`'],
                ['`OrderError::OutOfStock(String::from("pears"))`', '`pears are out of stock`'],
                ['`OrderError::TooMany { asked: 12, limit: 10 }`', '`asked for 12, the limit is 10`'],
              ],
            } },
            "Lower case, no period at the end: the tests embed your messages in longer ones.",
          ],
          signature: 'impl fmt::Display for OrderError',
          starter: rs`use std::error::Error;
use std::fmt;

#[derive(Debug)]
pub enum OrderError {
    Closed,
    OutOfStock(String),
    TooMany { asked: u32, limit: u32 },
}

impl fmt::Display for OrderError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "something went wrong")
    }
}

impl Error for OrderError {}`,
          hints: [
            "`match self { … }` with one arm for each variant. Every arm is a `write!(f, …)` with no semicolon after it, so that its `fmt::Result` is the value of the `match`.",
            "Patterns take the data out: `OrderError::OutOfStock(item) => write!(f, \"{item} are out of stock\")`.",
            "The struct-like variant is matched by field name: `OrderError::TooMany { asked, limit } => write!(f, \"asked for {asked}, the limit is {limit}\")`.",
          ],
          solution: rs`use std::error::Error;
use std::fmt;

#[derive(Debug)]
pub enum OrderError {
    Closed,
    OutOfStock(String),
    TooMany { asked: u32, limit: u32 },
}

impl fmt::Display for OrderError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            OrderError::Closed => write!(f, "the shop is closed"),
            OrderError::OutOfStock(item) => write!(f, "{item} are out of stock"),
            OrderError::TooMany { asked, limit } => write!(f, "asked for {asked}, the limit is {limit}"),
        }
    }
}

impl Error for OrderError {}`,
          tests: [
            { label: 'A variant with no data has a fixed message', body: rs`assert_eq!(OrderError::Closed.to_string(), "the shop is closed");` },
            { label: 'A tuple variant puts its value in the message', body: rs`assert_eq!(OrderError::OutOfStock(String::from("pears")).to_string(), "pears are out of stock");
assert_eq!(OrderError::OutOfStock(String::from("figs")).to_string(), "figs are out of stock");` },
            { label: 'A struct variant uses both fields', body: rs`assert_eq!(OrderError::TooMany { asked: 12, limit: 10 }.to_string(), "asked for 12, the limit is 10");
assert_eq!(OrderError::TooMany { asked: 3, limit: 2 }.to_string(), "asked for 3, the limit is 2");` },
            { label: 'The message fits inside a longer one', body: rs`let error = OrderError::Closed;
assert_eq!(format!("order 17 failed: {error}"), "order 17 failed: the shop is closed");` },
            { label: 'It is printed the same way through a Box<dyn Error>', body: rs`let boxed: Box<dyn std::error::Error> = Box::new(OrderError::TooMany { asked: 5, limit: 4 });
assert_eq!(boxed.to_string(), "asked for 5, the limit is 4");` },
          ],
        },
        {
          id: 'from-for-question-mark',
          title: 'Teach ? two conversions',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          forbid: ['map_err'],
          prompt: [
            "`line_total` reads a line such as `3 x 2.50` and returns the quantity times the price. Its body is written the way you would like it to read, with a plain `?` after each `parse`. It does not compile, because nothing says how a `ParseIntError` or a `ParseFloatError` becomes an `ItemError`.",
            "Make it compile without changing `line_total`. A quantity that is not a whole number must come back as `ItemError::BadQuantity`, and a price that is not a number as `ItemError::BadPrice`, each holding the original error. `map_err` is not allowed.",
          ],
          signature: 'fn line_total(line: &str) -> Result<f64, ItemError>',
          starter: rs`use std::num::{ParseFloatError, ParseIntError};

#[derive(Debug, PartialEq)]
pub enum ItemError {
    MissingX,
    BadQuantity(ParseIntError),
    BadPrice(ParseFloatError),
}

pub fn line_total(line: &str) -> Result<f64, ItemError> {
    let (quantity, price) = line.split_once('x').ok_or(ItemError::MissingX)?;
    let quantity = quantity.trim().parse::<u32>()?;
    let price = price.trim().parse::<f64>()?;
    Ok(f64::from(quantity) * price)
}`,
          hints: [
            "The compiler names what is missing: the trait `From<ParseIntError>` is not implemented for `ItemError`. `?` calls `From::from` on the error, so that is the function to supply.",
            "`impl From<ParseIntError> for ItemError { fn from(error: ParseIntError) -> Self { … } }`, with a body that wraps the error in the right variant.",
            "Two blocks, one for each source type. The first returns `ItemError::BadQuantity(error)`. The second is `impl From<ParseFloatError> for ItemError` and returns `ItemError::BadPrice(error)`.",
          ],
          solution: rs`use std::num::{ParseFloatError, ParseIntError};

#[derive(Debug, PartialEq)]
pub enum ItemError {
    MissingX,
    BadQuantity(ParseIntError),
    BadPrice(ParseFloatError),
}

impl From<ParseIntError> for ItemError {
    fn from(error: ParseIntError) -> Self {
        ItemError::BadQuantity(error)
    }
}

impl From<ParseFloatError> for ItemError {
    fn from(error: ParseFloatError) -> Self {
        ItemError::BadPrice(error)
    }
}

pub fn line_total(line: &str) -> Result<f64, ItemError> {
    let (quantity, price) = line.split_once('x').ok_or(ItemError::MissingX)?;
    let quantity = quantity.trim().parse::<u32>()?;
    let price = price.trim().parse::<f64>()?;
    Ok(f64::from(quantity) * price)
}`,
          solutionNote: "Here the source type happens to identify the field: only the quantity is parsed as an integer and only the price as a float. With two integers in the line, `From` could not tell them apart, and you would go back to `map_err`.",
          tests: [
            { label: 'Multiplies quantity by price', body: rs`assert_eq!(line_total("3 x 2.50"), Ok(7.5));
assert_eq!(line_total("10x0.25"), Ok(2.5));` },
            { label: 'A line with no x is MissingX', body: rs`assert_eq!(line_total("3 2.50"), Err(ItemError::MissingX));` },
            { label: 'A quantity that is not a whole number is BadQuantity', body: rs`assert!(matches!(line_total("three x 2.50"), Err(ItemError::BadQuantity(_))));
assert!(matches!(line_total("1.5 x 2.50"), Err(ItemError::BadQuantity(_))));` },
            { label: 'A price that is not a number is BadPrice', body: rs`assert!(matches!(line_total("3 x cheap"), Err(ItemError::BadPrice(_))));
assert!(matches!(line_total("3 x "), Err(ItemError::BadPrice(_))));` },
            { label: 'The quantity is checked before the price', body: rs`assert!(matches!(line_total("many x cheap"), Err(ItemError::BadQuantity(_))));` },
            { label: 'The variant holds the original error', body: rs`let original = "three".parse::<u32>().unwrap_err();
assert_eq!(line_total("three x 1.0"), Err(ItemError::BadQuantity(original)));` },
          ],
        },
        {
          id: 'parse-config',
          title: 'Parse a configuration',
          level: 'core',
          prompt: [
            "Read a small configuration and return a `Config`, or an error that says exactly what is wrong. The tests match on the variants, so the right variant with the right data is the whole task.",
            { list: [
              "Each line has the form `key=value`. Spaces around the key and around the value are ignored, and blank lines are skipped.",
              "A line with no `=` is `MissingEquals { line }`, where `line` counts from 1 and blank lines count too.",
              "The keys are `name` and `port`. Any other key is `UnknownKey` with the key.",
              "The value of `port` must parse as a `u16`. If not, the error is `BadPort` with the value.",
              "The first bad line decides the error. If every line is good but a key never appeared, the error is `MissingKey(\"name\")` or `MissingKey(\"port\")`, and `name` is checked first.",
              "When a key appears twice, the later value wins.",
            ] },
          ],
          signature: 'fn parse_config(text: &str) -> Result<Config, ConfigError>',
          prelude: rs`#[derive(Debug, PartialEq)]
pub struct Config {
    pub name: String,
    pub port: u16,
}

#[derive(Debug, PartialEq)]
pub enum ConfigError {
    MissingEquals { line: usize },
    UnknownKey(String),
    BadPort(String),
    MissingKey(&'static str),
}`,
          starter: rs`pub fn parse_config(text: &str) -> Result<Config, ConfigError> {
    // Two things to remember while reading: Option<String> and Option<u16>.
    Err(ConfigError::MissingKey("name"))
}`,
          hints: [
            "Keep `let mut name = None;` and `let mut port = None;`. Loop with `for (index, line) in text.lines().enumerate()`, trim each line, and `continue` when it is empty.",
            "`line.split_once('=').ok_or(ConfigError::MissingEquals { line: index + 1 })?` gives the key and the value. Then `match key.trim()` with arms for `\"name\"`, `\"port\"` and `other`.",
            "The port arm is `port = Some(value.parse::<u16>().map_err(|_| ConfigError::BadPort(value.to_string()))?)`. After the loop, build the result with `name.ok_or(ConfigError::MissingKey(\"name\"))?` and the same for the port.",
          ],
          solution: rs`pub fn parse_config(text: &str) -> Result<Config, ConfigError> {
    let mut name = None;
    let mut port = None;
    for (index, line) in text.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let (key, value) = line.split_once('=').ok_or(ConfigError::MissingEquals { line: index + 1 })?;
        let value = value.trim();
        match key.trim() {
            "name" => name = Some(value.to_string()),
            "port" => port = Some(value.parse::<u16>().map_err(|_| ConfigError::BadPort(value.to_string()))?),
            other => return Err(ConfigError::UnknownKey(other.to_string())),
        }
    }
    Ok(Config {
        name: name.ok_or(ConfigError::MissingKey("name"))?,
        port: port.ok_or(ConfigError::MissingKey("port"))?,
    })
}`,
          tests: [
            { label: 'Reads both keys', body: rs`assert_eq!(parse_config("name=api\nport=8080"), Ok(Config { name: String::from("api"), port: 8080 }));` },
            { label: 'Ignores spaces, blank lines and the order of keys', body: rs`assert_eq!(parse_config("  port = 443 \n\n name = web \n"), Ok(Config { name: String::from("web"), port: 443 }));` },
            { label: 'A later value replaces an earlier one', body: rs`assert_eq!(parse_config("port=1\nname=a\nport=2"), Ok(Config { name: String::from("a"), port: 2 }));` },
            { label: 'A line with no = reports its line number', body: rs`assert_eq!(parse_config("name=api\n\nport 8080"), Err(ConfigError::MissingEquals { line: 3 }));
assert_eq!(parse_config("oops"), Err(ConfigError::MissingEquals { line: 1 }));` },
            { label: 'An unknown key is reported by name', body: rs`assert_eq!(parse_config("name=api\ncolor = red\nport=1"), Err(ConfigError::UnknownKey(String::from("color"))));` },
            { label: 'A port that is not a u16 carries its text', body: rs`assert_eq!(parse_config("name=api\nport=http"), Err(ConfigError::BadPort(String::from("http"))));
assert_eq!(parse_config("port = 70000"), Err(ConfigError::BadPort(String::from("70000"))));` },
            { label: 'A key that never appears is named, name first', body: rs`assert_eq!(parse_config("name=api"), Err(ConfigError::MissingKey("port")));
assert_eq!(parse_config("port=1"), Err(ConfigError::MissingKey("name")));
assert_eq!(parse_config(""), Err(ConfigError::MissingKey("name")));` },
            { label: 'The first bad line wins over a missing key', body: rs`assert_eq!(parse_config("port=x"), Err(ConfigError::BadPort(String::from("x"))));` },
            { label: 'A caller can branch on the variant', body: rs`let advice = match parse_config("nmae=api\nport=1") {
    Err(ConfigError::UnknownKey(key)) => format!("check the spelling of {key}"),
    Err(_) => String::from("some other problem"),
    Ok(_) => String::from("fine"),
};
assert_eq!(advice, "check the spelling of nmae");` },
          ],
        },
        {
          id: 'validated-newtypes',
          title: 'Types that prove the check',
          level: 'core',
          prompt: [
            "A sign-up form sends a name and an age. Parse each into a type that can only hold a checked value, so that the rest of the program never has to check again. The starter has the types and the trait skeletons, and accepts everything.",
            { list: [
              "`Username` implements `FromStr`. Trim the text first. An empty name is `EmptyName`. More than 12 characters is `NameTooLong` with the number of characters. Otherwise, the first character that is not an ASCII letter, an ASCII digit or `_` is reported as `BadCharacter`.",
              "`Age` implements `TryFrom<u32>`. Below 13 is `TooYoung` with the number, and above 130 is `NotAnAge` with the number.",
              "`signup` builds an `Account` from raw input. It reports a problem with the name before a problem with the age.",
            ] },
            "`TryFrom` works like `FromStr`, for a source that is not text. Its associated type is called `Error`, and implementing it also gives you `value.try_into()`.",
          ],
          signature: 'impl FromStr for Username\nimpl TryFrom<u32> for Age\nfn signup(name: &str, age: u32) -> Result<Account, SignupError>',
          prelude: rs`#[derive(Debug, PartialEq)]
pub enum SignupError {
    EmptyName,
    NameTooLong(usize),
    BadCharacter(char),
    TooYoung(u32),
    NotAnAge(u32),
}`,
          starter: rs`use std::str::FromStr;

#[derive(Debug, PartialEq)]
pub struct Username(String);

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Age(u8);

#[derive(Debug, PartialEq)]
pub struct Account {
    pub name: Username,
    pub age: Age,
}

impl Username {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Age {
    pub fn years(self) -> u8 {
        self.0
    }
}

impl FromStr for Username {
    type Err = SignupError;

    fn from_str(text: &str) -> Result<Self, Self::Err> {
        Ok(Username(text.to_string()))
    }
}

impl TryFrom<u32> for Age {
    type Error = SignupError;

    fn try_from(years: u32) -> Result<Self, Self::Error> {
        Ok(Age(years as u8))
    }
}

pub fn signup(name: &str, age: u32) -> Result<Account, SignupError> {
    Ok(Account { name: name.parse()?, age: age.try_into()? })
}`,
          hints: [
            "In `from_str`: `let text = text.trim();`, then the three checks in order, each ending in `return Err(…)`. Count characters with `text.chars().count()`, not `text.len()`, which counts bytes.",
            "`text.chars().find(|c| !(c.is_ascii_alphanumeric() || *c == '_'))` returns the first character that is not allowed, as an `Option<char>`. Use `if let Some(bad) = …` to return `SignupError::BadCharacter(bad)`.",
            "In `try_from`: `if years < 13 { return Err(SignupError::TooYoung(years)); }`, the same shape for `years > 130`, then `Ok(Age(years as u8))`. The `as` is safe by then, because the value is known to fit. `signup` is already right: two `?` are all it takes.",
          ],
          solution: rs`use std::str::FromStr;

#[derive(Debug, PartialEq)]
pub struct Username(String);

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Age(u8);

#[derive(Debug, PartialEq)]
pub struct Account {
    pub name: Username,
    pub age: Age,
}

impl Username {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Age {
    pub fn years(self) -> u8 {
        self.0
    }
}

impl FromStr for Username {
    type Err = SignupError;

    fn from_str(text: &str) -> Result<Self, Self::Err> {
        let text = text.trim();
        if text.is_empty() {
            return Err(SignupError::EmptyName);
        }
        let length = text.chars().count();
        if length > 12 {
            return Err(SignupError::NameTooLong(length));
        }
        if let Some(bad) = text.chars().find(|c| !(c.is_ascii_alphanumeric() || *c == '_')) {
            return Err(SignupError::BadCharacter(bad));
        }
        Ok(Username(text.to_string()))
    }
}

impl TryFrom<u32> for Age {
    type Error = SignupError;

    fn try_from(years: u32) -> Result<Self, Self::Error> {
        if years < 13 {
            return Err(SignupError::TooYoung(years));
        }
        if years > 130 {
            return Err(SignupError::NotAnAge(years));
        }
        Ok(Age(years as u8))
    }
}

pub fn signup(name: &str, age: u32) -> Result<Account, SignupError> {
    Ok(Account { name: name.parse()?, age: age.try_into()? })
}`,
          solutionNote: "`signup` did not change. Once each type checks itself, putting them together is two `?` and no logic, and no function that receives an `Account` has anything left to check.",
          tests: [
            { label: 'A good name parses, and is trimmed', body: rs`assert_eq!("ada_99".parse::<Username>().map(|name| name.as_str().to_string()), Ok(String::from("ada_99")));
assert_eq!("  grace ".parse::<Username>().map(|name| name.as_str().to_string()), Ok(String::from("grace")));` },
            { label: 'An empty or blank name is EmptyName', body: rs`assert_eq!("".parse::<Username>(), Err(SignupError::EmptyName));
assert_eq!("   ".parse::<Username>(), Err(SignupError::EmptyName));` },
            { label: 'A name over 12 characters is NameTooLong, counted in characters', body: rs`assert_eq!("abcdefghijklm".parse::<Username>(), Err(SignupError::NameTooLong(13)));
assert!("abcdefghijkl".parse::<Username>().is_ok(), "12 characters are allowed");
assert_eq!("ééééééééééééé".parse::<Username>(), Err(SignupError::NameTooLong(13)), "13 characters, although 26 bytes");` },
            { label: 'The first character that is not allowed is reported', body: rs`assert_eq!("ada lovelace".parse::<Username>(), Err(SignupError::BadCharacter(' ')));
assert_eq!("a-b!c".parse::<Username>(), Err(SignupError::BadCharacter('-')));
assert_eq!("zoé".parse::<Username>(), Err(SignupError::BadCharacter('é')));` },
            { label: 'An age from 13 to 130 converts', body: rs`assert_eq!(Age::try_from(13).map(|age| age.years()), Ok(13));
assert_eq!(Age::try_from(130).map(|age| age.years()), Ok(130));` },
            { label: 'An age out of range says which way', body: rs`assert_eq!(Age::try_from(12), Err(SignupError::TooYoung(12)));
assert_eq!(Age::try_from(0), Err(SignupError::TooYoung(0)));
assert_eq!(Age::try_from(131), Err(SignupError::NotAnAge(131)));
assert_eq!(Age::try_from(300), Err(SignupError::NotAnAge(300)), "300 must not wrap around to 44");` },
            { label: 'signup builds an account from good input', body: rs`let account = signup(" linus ", 54).unwrap();
assert_eq!(account.name.as_str(), "linus");
assert_eq!(account.age.years(), 54);` },
            { label: 'signup reports the name before the age', body: rs`assert_eq!(signup("", 5), Err(SignupError::EmptyName));
assert_eq!(signup("ok", 5), Err(SignupError::TooYoung(5)));` },
          ],
        },
        {
          id: 'error-chain',
          title: 'Wrap an error and walk the chain',
          level: 'stretch',
          prompt: [
            "Build the two halves of error context by hand: a wrapper that adds a message to any error, and a function that lists every message from the outermost error down to the first cause.",
            { list: [
              "`ContextError` holds a message and the error it wraps. Its `Display` prints only the message, which is done. Its `source` must return the wrapped error.",
              "`with_context(result, context)` passes an `Ok` through unchanged and wraps an `Err` in a `ContextError`.",
              "`chain(&error)` returns the `Display` text of the error, then of its `source`, then of that error's `source`, until there is none.",
            ] },
            "The tests use `Leaf`, a plain error with a message and no source. `E: Error + 'static` in the signature says that `with_context` accepts any error type that holds no borrowed data, which is what a `Box<dyn Error>` can store.",
          ],
          signature: "fn with_context<T, E: Error + 'static>(result: Result<T, E>, context: &str) -> Result<T, ContextError>\nfn chain(error: &dyn Error) -> Vec<String>",
          prelude: rs`/// A plain error for the tests: a message and no source.
#[derive(Debug, PartialEq)]
pub struct Leaf(pub &'static str);

impl std::fmt::Display for Leaf {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for Leaf {}`,
          starter: rs`use std::error::Error;
use std::fmt;

#[derive(Debug)]
pub struct ContextError {
    context: String,
    source: Box<dyn Error>,
}

impl fmt::Display for ContextError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.context)
    }
}

// The default source() returns None. Override it.
impl Error for ContextError {}

pub fn with_context<T, E: Error + 'static>(result: Result<T, E>, context: &str) -> Result<T, ContextError> {
    todo!()
}

pub fn chain(error: &dyn Error) -> Vec<String> {
    vec![error.to_string()]
}`,
          hints: [
            "`source` has the signature `fn source(&self) -> Option<&(dyn Error + 'static)>`. A `Box<dyn Error>` lends out what it points to with `as_ref()`, so the body is `Some(self.source.as_ref())`.",
            "`with_context` is one `map_err`: `result.map_err(|error| ContextError { context: context.to_string(), source: Box::new(error) })`.",
            "`chain` is the loop from the lesson's `report`, pushing instead of printing: `let mut cause = error.source(); while let Some(inner) = cause { messages.push(inner.to_string()); cause = inner.source(); }`.",
          ],
          solution: rs`use std::error::Error;
use std::fmt;

#[derive(Debug)]
pub struct ContextError {
    context: String,
    source: Box<dyn Error>,
}

impl fmt::Display for ContextError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.context)
    }
}

impl Error for ContextError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        Some(self.source.as_ref())
    }
}

pub fn with_context<T, E: Error + 'static>(result: Result<T, E>, context: &str) -> Result<T, ContextError> {
    result.map_err(|error| ContextError { context: context.to_string(), source: Box::new(error) })
}

pub fn chain(error: &dyn Error) -> Vec<String> {
    let mut messages = vec![error.to_string()];
    let mut cause = error.source();
    while let Some(inner) = cause {
        messages.push(inner.to_string());
        cause = inner.source();
    }
    messages
}`,
          solutionNote: "This is most of what `anyhow` does: a boxed error, a `context` method that wraps it, and a report that walks `source`.",
          tests: [
            { label: 'An Ok passes through unchanged', body: rs`let fine: Result<u32, Leaf> = Ok(5);
assert_eq!(with_context(fine, "reading the count").unwrap(), 5);` },
            { label: 'An Err is wrapped, and Display shows only the context', body: rs`let failed: Result<u32, Leaf> = Err(Leaf("disk full"));
let wrapped = with_context(failed, "saving the draft").unwrap_err();
assert_eq!(wrapped.to_string(), "saving the draft");` },
            { label: 'source returns the wrapped error', body: rs`let failed: Result<u32, Leaf> = Err(Leaf("disk full"));
let wrapped = with_context(failed, "saving the draft").unwrap_err();
let inner = std::error::Error::source(&wrapped).expect("a ContextError always has a source");
assert_eq!(inner.to_string(), "disk full");
assert_eq!(inner.downcast_ref::<Leaf>(), Some(&Leaf("disk full")), "the source is the original error, not a copy of its text");` },
            { label: 'chain of an error with no source is one message', body: rs`assert_eq!(chain(&Leaf("disk full")), ["disk full"]);` },
            { label: 'chain lists the outermost message first', body: rs`let failed: Result<u32, Leaf> = Err(Leaf("disk full"));
let wrapped = with_context(failed, "saving the draft").unwrap_err();
assert_eq!(chain(&wrapped), ["saving the draft", "disk full"]);` },
            { label: 'Contexts stack to any depth', body: rs`let failed: Result<u32, Leaf> = Err(Leaf("disk full"));
let twice = with_context(with_context(failed, "saving the draft"), "closing the editor");
let thrice = with_context(twice, "shutting down").unwrap_err();
assert_eq!(chain(&thrice), ["shutting down", "closing the editor", "saving the draft", "disk full"]);` },
            { label: 'It wraps errors from the standard library too', body: rs`let wrapped = with_context("12a".parse::<i32>(), "reading the age").unwrap_err();
let messages = chain(&wrapped);
assert_eq!(messages.len(), 2);
assert_eq!(messages[0], "reading the age");` },
          ],
        },
      ],
    },
  );
})();
