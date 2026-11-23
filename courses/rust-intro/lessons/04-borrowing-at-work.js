// Part 3: Borrowing at work. Slices, strings and lifetimes: what references look like in everyday code.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 3 · Borrowing at work';

  (window.C_LESSONS ||= []).push(
    {
      id: 'slices',
      title: 'Slices',
      category: part,
      minutes: 30,
      summary: 'A slice is a view of part of a sequence: a pointer and a length. It lets a function work on any run of elements without copying them and without caring where they are stored.',
      topics: ['&[T]', 'Ranges', 'Checked indexing', '&mut [T]', 'Slice methods', 'Indexes'],
      sections: [
        {
          title: 'A view into a sequence',
          body: [
            "A reference, `&T`, points at one value. Often you want to point at several values in a row instead: a whole `Vec`, the first three elements of an array, everything after a header. That is a **slice**. Its type is written `&[T]`, and it holds two things: a pointer to the first element and the number of elements.",
            { run: rs`fn main() {
    let numbers = vec![10, 20, 30, 40, 50];
    let middle = &numbers[1..4];          // elements 1, 2 and 3

    println!("{middle:?}");
    println!("{} elements, the first is {}", middle.len(), middle[0]);
    println!("{} bytes for &[i32], {} for &i32",
        std::mem::size_of::<&[i32]>(), std::mem::size_of::<&i32>());
}`, name: 'view.rs', expect: '[20, 30, 40]\n3 elements, the first is 20\n16 bytes for &[i32], 8 for &i32\n' },
            "`&numbers[1..4]` did not copy three numbers. It made a two-word value on the stack that points into the buffer `numbers` already owns.",
            { memory: {
              title: '`middle` is a pointer and a length, and nothing else',
              vars: [
                { id: 'numbers', type: 'Vec<i32>' },
                { id: 'middle', type: '&[i32]' },
                { id: 'buf', name: 'buffer', type: 'i32', len: 5, frame: 'heap' },
              ],
              set: { numbers: { ptr: '&buf', len: 5, cap: 5 }, middle: { ptr: '&buf[1]', len: 3 }, buf: [10, 20, 30, 40, 50] },
              caption: "Solid arrows own and dashed arrows borrow. `numbers` owns the buffer and will free it. `middle` only looks at three of its elements.",
            } },
            { strip: {
              title: 'What `&numbers[1..4]` covers',
              cells: [10, 20, 30, 40, 50],
              marks: [{ at: 1, span: 3, label: '`middle`' }],
              dim: [0, 4],
              caption: "The slice starts at index 1 and stops before index 4. Inside the slice the indexes start again at 0, so `middle[0]` is 20.",
            } },
            "A slice is a borrow, like every reference in lesson 6. `middle` does not own the elements, it cannot outlive `numbers`, and nothing is freed when it goes away.",
            { compare: "In Python, `numbers[1:4]` builds a new list and copies three elements into it. `slice` in JavaScript and `array_slice` in PHP copy too. A Rust slice copies nothing. It is a window onto the original, closer to a `memoryview` in Python or a `subarray` of a typed array in JavaScript." },
            { aside: "The type `[T]`, without the `&`, means some number of `T` values side by side. Its size is not known at compile time, so it cannot be a local variable or a parameter by itself. It is always used behind a pointer that carries the length. People say \"slice\" for both `[T]` and `&[T]`." },
            { fromC: "A slice is the pointer-and-length pair that the C course told you to pass by hand, as one value that the compiler and the run-time checks both understand. An array does not decay to a bare pointer and lose its length on the way into a function." },
          ],
        },
        {
          title: 'Ranges and bounds',
          body: [
            "The part you want is named by a range inside the square brackets. These are the ranges that `for` loops use in lesson 3. The start is included and the end is not, unless you write `..=`. Either end can be left out.",
            { run: rs`fn main() {
    let v = [10, 20, 30, 40, 50];

    println!("{:?}", &v[1..4]);      // from 1 up to, but not including, 4
    println!("{:?}", &v[1..=3]);     // from 1 up to and including 3
    println!("{:?}", &v[..2]);       // from the start
    println!("{:?}", &v[3..]);       // to the end
    println!("{:?}", &v[..]);        // everything
    println!("{:?}", &v[2..2]);      // empty, and allowed
    println!("{:?}", &v[5..]);       // empty too: 5 is the position just past the last element
}`, name: 'ranges.rs', expect: '[20, 30, 40]\n[20, 30, 40]\n[10, 20]\n[40, 50]\n[10, 20, 30, 40, 50]\n[]\n[]\n' },
            "`a..b` has `b - a` elements. `&v[..k]` and `&v[k..]` meet at `k` with nothing missed and nothing repeated, which is the reason the end is left out.",
            "The bounds are checked when the program runs. The start must not be past the end, and the end must not be past the length. A range that does not fit is a panic.",
            { run: rs`fn first_n(values: &[i32], n: usize) -> &[i32] {
    &values[..n]
}

fn main() {
    let values = [1, 2, 3];
    println!("{:?}", first_n(&values, 2));
    println!("{:?}", first_n(&values, 5));
}`, name: 'past_the_end.rs', panics: true, expect: '[1, 2]\n' },
            "`first_n` returns a slice of the slice it was given. The result borrows from the argument, and no element is copied on the way in or on the way out.",
            { compare: "Python's `values[:5]` on a list of three quietly returns the three it has, and so do `slice(0, 5)` in JavaScript and `array_slice` in PHP. Rust treats a range that does not fit as a bug in the program. When you mean \"at most `n`\", say so: `&values[..n.min(values.len())]`." },
          ],
        },
        {
          title: 'Indexing is checked',
          body: [
            "One element is read with `view[i]`, as with an array in lesson 2. The index is checked in the same way: past the end is a panic, never a read of whatever lies beyond the slice.",
            "When a missing element is an ordinary case and not a bug, ask with `get`. It returns an `Option`: `Some` holding a reference to the element if the index is in range, and `None` if it is not. Lesson 2 met `Option` as the result of `checked_add`.",
            { run: rs`fn main() {
    let scores = [72, 85, 91];
    let view = &scores[..];

    println!("{:?} {:?}", view.get(1), view.get(7));
    println!("{:?} {:?}", view.first(), view.last());
    println!("{:?} {:?}", view.get(1..3), view.get(2..9));

    match view.get(7) {
        Some(score) => println!("the score is {score}"),
        None => println!("there is no element 7"),
    }

    if let Some(score) = view.get(1) {
        println!("the score is {score}");
    }

    let empty: &[i32] = &[];
    println!("{:?} {}", empty.first(), empty.is_empty());
}`, name: 'get.rs', expect: 'Some(85) None\nSome(72) Some(91)\nSome([85, 91]) None\nthere is no element 7\nthe score is 85\nNone true\n' },
            "A `match` on an `Option` has an arm for each case, and the name inside `Some(…)` is bound to the value. `if let` is a `match` that cares about one case only. Read `if let Some(score) = view.get(1)` as: if there is an element 1, call it `score` and run the block. Lesson 13 covers `Option` in full.",
            "`first` and `last` return an `Option` for the same reason: an empty slice has neither. `get` takes a range as well, and gives `None` where the brackets would panic.",
            { compare: "Python raises `IndexError` for an index that is out of range. JavaScript returns `undefined`. PHP gives a warning and `null`. Rust has two spellings and makes you choose: `v[i]` when an index out of range would be a bug, and `v.get(i)` when it is a case to handle. There is no `v[-1]` either, because an index is a `usize`. Use `last()`." },
            { pitfall: "`values[values.len() - 1]` panics on an empty slice before any element is looked at, because `0 - 1` does not fit in a `usize`. `values.last()` says the same thing and returns `None` instead." },
          ],
        },
        {
          title: 'Write &[T], not &Vec<T>',
          body: [
            "A function that only reads a sequence should take a `&[T]`. It then accepts anything that can be seen as a run of elements.",
            { run: rs`fn total(values: &[i32]) -> i32 {
    let mut sum = 0;
    for value in values {
        sum += value;
    }
    sum
}

fn main() {
    let list = vec![1, 2, 3, 4];
    let fixed = [10, 20, 30];

    println!("{}", total(&list));         // a whole Vec
    println!("{}", total(&fixed));        // a whole array
    println!("{}", total(&list[1..]));    // part of a Vec
    println!("{}", total(&fixed[..2]));   // part of an array
    println!("{}", total(&[]));           // nothing at all
}`, name: 'accepts.rs', expect: '10\n60\n9\n30\n0\n' },
            "`&list` is a `&Vec<i32>`. The compiler converts it to a `&[i32]` for you, because a `Vec` can always be viewed as a slice of its elements. A reference to an array converts in the same way. Inside the loop, `value` is a `&i32`, a reference to one element. `+=` accepts a reference to a number. Where it matters, write `*value` to get the number itself.",
            "The conversion goes one way. A parameter of type `&Vec<i32>` accepts a borrowed `Vec` and nothing else:",
            { run: rs`fn total(values: &Vec<i32>) -> i32 {
    let mut sum = 0;
    for value in values {
        sum += value;
    }
    sum
}

fn main() {
    let fixed = [10, 20, 30];
    println!("{}", total(&fixed));
}`, name: 'too_narrow.rs', fails: 'E0308' },
            "To change elements in place, take a `&mut [T]`.",
            { run: rs`fn double_all(values: &mut [i32]) {
    for value in values.iter_mut() {
        *value *= 2;
    }
}

fn main() {
    let mut list = vec![1, 2, 3, 4];
    double_all(&mut list);            // all of it
    double_all(&mut list[..2]);       // the first two again
    println!("{list:?}");

    let mut grid = [5; 3];
    double_all(&mut grid);
    grid[0] = 0;
    println!("{grid:?}");
}`, name: 'mut_slice.rs', expect: '[4, 8, 6, 8]\n[0, 10, 10]\n' },
            "A `&mut [T]` can overwrite, swap and sort the elements it covers. It cannot add or remove one. Growing may need a bigger buffer, and then the `Vec` has to update its own pointer and capacity, as lesson 4 showed. A slice has no capacity and no way back to the `Vec`, so the methods are simply not there:",
            { run: rs`fn add_zero(values: &mut [i32]) {
    values.push(0);
}

fn main() {
    let mut list = vec![1, 2, 3];
    add_zero(&mut list);
    println!("{list:?}");
}`, name: 'no_push.rs', fails: 'E0599' },
            { table: {
              head: ['Parameter', 'The function can', 'Use it when'],
              rows: [
                ['`&[T]`', 'Read the elements', 'The function only looks. This is the default.'],
                ['`&mut [T]`', 'Read and overwrite elements, swap them, sort them', 'The function changes values in place and the count stays the same.'],
                ['`&mut Vec<T>`', 'All of that, and `push`, `pop`, `clear`', 'The function changes how many elements there are.'],
                ['`Vec<T>`', 'Anything: it owns the elements', 'The function keeps the collection or uses it up.'],
              ],
            } },
            { native: "Clippy has a lint for this, `ptr_arg`. `cargo clippy` warns about a parameter of type `&Vec<T>` or `&String` and suggests the slice type, which every caller can supply." },
          ],
        },
        {
          title: 'A slice borrows the whole collection',
          body: [
            "A slice points into a buffer it does not own. Lesson 7 showed what goes wrong when a `Vec` changes while something points into it: `push` may move the elements to a bigger buffer and free the old one, and the pointer is left aimed at freed memory. A slice is that kind of pointer, with a length attached.",
            "So the rule of lesson 7 applies unchanged. Taking `&v[a..b]` is a shared borrow of `v`. While the slice is in use, `v` can be read by anyone and changed by no one.",
            { run: rs`fn main() {
    let mut readings = vec![3, 8, 2, 9];
    let recent = &readings[2..];      // a shared borrow of readings starts here

    readings.push(7);                 // needs a mutable borrow of readings
    println!("{recent:?}");           // the shared borrow is still in use
}`, name: 'push_under_slice.rs', fails: 'E0502' },
            { borrows: {
              title: '`push` arrives while the slice is still in use',
              code: rs`fn main() {
    let mut readings = vec![3, 8, 2, 9];
    let recent = &readings[2..];

    readings.push(7);
    println!("{recent:?}");
}`,
              spans: [
                { name: 'readings', kind: 'owner', from: 2, to: 6 },
                { name: 'recent', kind: 'shared', from: 3, to: 6 },
                { name: 'push', kind: 'mut', from: 5, to: 5 },
              ],
              marks: [{ line: 5, label: '`push` needs `readings` mutably, and `recent` borrows it from line 3 to line 6.' }],
              caption: "The bar for `recent` runs from where the slice is taken to its last use. Anything that changes `readings` has to fall outside it.",
            } },
            "The borrow is of the collection, not of the elements the slice happens to cover. The compiler does not reason about which indexes are involved, so a write to an element outside the slice is rejected too:",
            { run: rs`fn main() {
    let mut readings = vec![3, 8, 2, 9];
    let head = &readings[..2];        // looks at elements 0 and 1

    readings[3] = 0;                  // changes element 3
    println!("{head:?}");
}`, name: 'write_outside.rs', fails: 'E0502' },
            "The ways out are the ones from lesson 7. The first is to finish with the slice before changing the collection. A borrow ends at its last use, not at the closing brace:",
            { run: rs`fn main() {
    let mut readings = vec![3, 8, 2, 9];
    let recent = &readings[2..];
    println!("{recent:?}");           // the last use of recent: its borrow ends here

    readings.push(7);                 // nothing is borrowed any more
    println!("{readings:?}");
}`, name: 'use_then_change.rs', expect: '[2, 9]\n[3, 8, 2, 9, 7]\n' },
            "The second is to copy out what you need. `to_vec` makes a new `Vec` from a slice, with its own buffer:",
            { run: rs`fn main() {
    let mut readings = vec![3, 8, 2, 9];
    let recent = readings[2..].to_vec();     // a new Vec holding copies of two elements

    readings.push(7);
    println!("{recent:?} {readings:?}");
}`, name: 'copy_out.rs', expect: '[2, 9] [3, 8, 2, 9, 7]\n' },
            "The third is to remember positions instead of holding a slice, which the last section of this lesson is about. For two parts of one slice that must both be changed, the `help:` line of the last error names the tool, `split_at_mut`. It is in the next section.",
            { compare: "Python has this check, at run time and for one case. Take a `memoryview` of a `bytearray` and then append to the `bytearray`, and Python raises `BufferError`, because growing the buffer would leave the view pointing at freed memory. Rust applies the same reasoning to every slice of every collection, before the program exists." },
          ],
        },
        {
          title: 'Working with slices',
          body: [
            "Most of the methods you would look for on a list are defined on slices. A `Vec` and an array have them too, because a method call borrows them as a slice automatically.",
            { table: {
              head: ['Method', 'Gives you'],
              rows: [
                ['`len()`, `is_empty()`', 'The number of elements, and whether it is zero'],
                ['`first()`, `last()`, `get(i)`', 'An `Option` holding a reference to one element'],
                ['`contains(&x)`, `starts_with(&[…])`', 'A `bool`'],
                ['`iter()`, `iter_mut()`', 'The elements one at a time, as `&T` or as `&mut T`'],
                ['`windows(n)`', 'Every run of `n` neighbors, overlapping'],
                ['`chunks(n)`', 'Pieces of `n` elements that do not overlap. The last one may be shorter'],
                ['`split_at(i)`, `split_at_mut(i)`', 'Two slices: before index `i`, and from `i` on'],
                ['`swap(i, j)`, `reverse()`, `sort()`, `fill(x)`', 'Nothing. They change the elements in place and need a `&mut` slice'],
                ['`to_vec()`', 'A new `Vec` with a copy of each element'],
              ],
            } },
            { run: rs`fn main() {
    let temps = [18, 21, 19, 24, 22, 17];
    let view = &temps[..];

    println!("{} {}", view.contains(&24), view.contains(&30));
    println!("{:?} {:?}", view.iter().max(), view.iter().min());

    for pair in view.windows(2) {            // every pair of neighbors, overlapping
        print!("{} ", pair[1] - pair[0]);
    }
    println!();

    for part in view.chunks(4) {             // pieces of 4, and the last may be shorter
        println!("{part:?}");
    }

    let (early, late) = view.split_at(2);    // two slices that meet at index 2
    println!("{early:?} {late:?}");
}`, name: 'reading.rs', expect: 'true false\nSome(24) Some(17)\n3 -2 5 -2 -5 \n[18, 21, 19, 24]\n[22, 17]\n[18, 21] [19, 24, 22, 17]\n' },
            "`contains` takes a reference to the value to look for, hence `&24`. `iter()` walks the elements by reference, and `max` and `min` return an `Option` because the slice might be empty. Each window and each chunk is itself a slice of the original, so none of this copies an element. Lesson 18 is about iterators.",
            "The methods that change elements need the owner to be `mut`:",
            { run: rs`fn main() {
    let mut scores = vec![40, 10, 30, 20, 50];

    scores.sort();                       // a slice method, called on a Vec
    println!("{scores:?}");

    scores[1..4].reverse();              // on a part of it
    println!("{scores:?}");

    scores.swap(0, 4);
    println!("{scores:?}");

    let (left, right) = scores.split_at_mut(2);    // two &mut slices that cannot overlap
    left[0] += right[0];
    right[0] = 0;
    println!("{scores:?}");
}`, name: 'changing.rs', expect: '[10, 20, 30, 40, 50]\n[10, 40, 30, 20, 50]\n[50, 40, 30, 20, 10]\n[80, 40, 0, 20, 10]\n' },
            "`split_at_mut` is the answer to the second error of the last section. It hands back two `&mut` slices that meet at an index and cannot overlap, so both halves can be changed at the same time.",
            { aside: "The compiler cannot see for itself that the two halves are separate: to it, both are borrows of `scores`. `split_at_mut` is written with `unsafe` code inside the standard library, where the reasoning was checked once by people, and it offers a safe function to everyone else. Lesson 24 explains what that means." },
            "A slice can also be taken apart by a pattern. `[first, .., last]` matches a slice of two or more elements, and `rest @ ..` binds whatever is left over as a slice of its own.",
            { run: rs`fn describe(values: &[i32]) -> String {
    match values {
        [] => String::from("empty"),
        [only] => format!("one element: {only}"),
        [first, second] => format!("two: {first} and {second}"),
        [first, .., last] => format!("{} elements, from {first} to {last}", values.len()),
    }
}

fn main() {
    println!("{}", describe(&[]));
    println!("{}", describe(&[7]));
    println!("{}", describe(&[7, 8]));
    println!("{}", describe(&[7, 8, 9, 10]));

    let numbers = [1, 2, 3, 4, 5];
    if let [head, rest @ ..] = &numbers[..] {
        println!("{head}, then {rest:?}");
    }
}`, name: 'patterns.rs', expect: 'empty\none element: 7\ntwo: 7 and 8\n4 elements, from 7 to 10\n1, then [2, 3, 4, 5]\n' },
            "The compiler checks that the arms cover every possible length, as it does for any `match`. Take the first arm away and it reports that `&[]` is not covered.",
            { compare: "`first, *rest = values` in Python and `const [first, ...rest] = values` in JavaScript do the same job, and both copy the rest into a new list. In Rust `rest` is a slice of the same memory." },
          ],
        },
        {
          title: 'Two indexes instead of two references',
          body: [
            "Sooner or later you want to hold on to two elements of one slice and change one of them. Two `&mut` references into the same slice break the rule of one writer:",
            { run: rs`fn main() {
    let mut values = [1, 2, 3, 4];
    let first = &mut values[0];
    let last = &mut values[3];
    *first += *last;
    println!("{values:?}");
}`, name: 'two_references.rs', fails: 'E0499' },
            "You can see that elements 0 and 3 are different. The compiler tracks the borrow of `values` and not the index, so to it these are two mutable borrows of one thing.",
            "Hold positions instead. An index is a `usize`: a plain number that is `Copy` and borrows nothing. Each `values[i]` is a borrow that lasts for one expression.",
            { run: rs`fn main() {
    let mut values = [1, 2, 3, 4];
    let (first, last) = (0, values.len() - 1);     // two positions, which are plain numbers
    values[first] += values[last];                 // each borrow lasts for this statement only
    println!("{values:?}");
}`, name: 'two_indexes.rs', expect: '[5, 2, 3, 4]\n' },
            "This is how in-place algorithms are written in Rust: one `&mut` slice, and two or more indexes into it. Here one index reads ahead while another marks the end of what has been kept.",
            { run: rs`// Moves the distinct values of a sorted slice to its front and returns how many there are.
fn dedup_sorted(values: &mut [i32]) -> usize {
    if values.is_empty() {
        return 0;
    }
    let mut last = 0;                     // the index of the last distinct value kept
    for read in 1..values.len() {         // the index of the value being looked at
        if values[read] != values[last] {
            last += 1;
            values[last] = values[read];
        }
    }
    last + 1
}

fn main() {
    let mut values = [1, 1, 2, 3, 3, 3, 7];
    let count = dedup_sorted(&mut values);
    println!("{:?}", &values[..count]);
}`, name: 'dedup.rs', expect: '[1, 2, 3, 7]\n' },
            "The function returns a count, and the caller turns it into a slice. Returning a position and letting the caller slice is a pattern you will use again in lesson 10.",
            { pitfall: "An index is not tied to the collection it came from, and the compiler does not watch it. If the collection shrinks or is reordered after you saved a position, the index means a different element, or none. That is a bug you find at run time, as a wrong answer or a panic. It is never a read of freed memory." },
            { fromC: "C walks an array with two pointers, and nothing stops them from running off either end or from outliving the array. Rust walks it with two indexes into one slice. Every access is checked against the length, and the slice cannot outlive what it points into." },
          ],
        },
      ],
      takeaways: [
        "A `&[T]` is a pointer and a length: a view of elements that someone else owns. Taking a slice copies nothing.",
        "Ranges and indexes are checked at run time. `v[i]` and `&v[a..b]` panic when they do not fit, and `get` returns an `Option` instead.",
        "Take `&[T]` to read and `&mut [T]` to change elements in place. Only a `&mut Vec<T>` can change the length.",
        "A slice borrows the whole collection for as long as the slice is in use, so the collection cannot be changed underneath it.",
        "For two places in one slice, hold two indexes, or split the slice with `split_at_mut`.",
      ],
      quiz: [
        {
          q: 'What does this program print on a 64-bit machine?',
          code: rs`fn main() {
    println!("{}", std::mem::size_of::<&[i32]>());
}`,
          options: [
            { t: '`16`', ok: true, why: "A reference to a slice is two words: a pointer to the first element and the number of elements. Each is 8 bytes." },
            { t: '`8`', why: "That is a reference to one value, such as `&i32`. A slice reference also has to carry the length, because nothing else records it." },
            { t: '`24`', why: "That is a `Vec` or a `String`: pointer, length and capacity. A slice cannot grow, so it has no capacity." },
            { t: '`4`', why: "That is one `i32`. The question asks for the size of the reference, which is the same whatever the elements are." },
            { t: 'It depends on how many elements the slice has', why: "It would if a slice were a copy, as `numbers[1:4]` is in Python. A slice reference has a fixed size, and the elements stay where they are." },
          ],
          verify: true,
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let v = [10, 20, 30, 40, 50, 60];
    let a = &v[1..5];
    let b = &a[1..3];
    println!("{:?} {} {:?}", b, a.len(), &v[..=1]);
}`,
          answer: '[30, 40] 4 [10, 20]',
          explain: "`a` is `[20, 30, 40, 50]`, four elements. Indexes into `a` start again at 0, so `a[1..3]` is `[30, 40]`. `..=1` includes index 1.",
          hint: "Write out `a` first. The range for `b` counts from the start of `a`, not of `v`.",
        },
        {
          q: 'What happens when this program is built and run?',
          code: rs`fn main() {
    let v = vec![1, 2, 3];
    println!("{}", v[10]);
}`,
          options: [
            { t: 'It panics: the index is out of bounds', ok: true, why: "Every index is compared with the length when the program runs. The message gives both: the len is 3 but the index is 10." },
            { t: 'It prints whatever is in memory after the third element', why: "That is what C does. Rust never reads outside the slice." },
            { t: 'It prints nothing useful, because `v[10]` is an empty value', why: "JavaScript gives `undefined` and PHP gives `null`. Rust has no such value. The method that reports a missing element is `v.get(10)`, which returns `None`." },
            { t: 'It does not compile', why: "The length of a `Vec` is known only when the program runs, so the check has to happen then." },
          ],
          verify: 'panics',
        },
        {
          kind: 'multi',
          q: 'Given `let v = vec![1, 2, 3];` and `let a = [4, 5, 6];`, which of these can be passed to `fn total(values: &[i32]) -> i32`?',
          options: [
            { t: '`&v`', ok: true, why: "A `&Vec<i32>` converts to a `&[i32]` automatically." },
            { t: '`&a`', ok: true, why: "So does a reference to an array of any length." },
            { t: '`&v[1..]`', ok: true, why: "A range of a `Vec` is already a slice." },
            { t: '`v`', why: "That passes the `Vec` itself, which is a different type. Nothing borrows for you: the compiler suggests `&v`." },
            { t: '`a`', why: "C would pass a pointer to the first element. Rust does not turn an array into a slice unless you borrow it." },
            { t: '`&v[0]`', why: "That is a `&i32`, a reference to one element. A one-element slice is `&v[..1]`." },
          ],
          hint: "Three of them are references to a run of elements.",
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let mut v = vec![5, 6, 7, 8];
    let tail = &v[2..];
    let total = tail[0] + tail[1];
    v.push(total);
    println!("{v:?}");
}`,
          options: [
            { t: 'Yes, and it prints `[5, 6, 7, 8, 15]`', ok: true, why: "`tail` is last used on line 4, so its borrow has ended by the time `push` runs. `total` is an `i32`, a copy that borrows nothing." },
            { t: 'No: `v` is still borrowed by `tail` when `push` is called', why: "It would be if `tail` were used after line 5. A borrow lasts until its last use, not until the end of the block." },
            { t: 'No: `total` borrows from `tail`', why: "Adding two `i32` values makes a new `i32`. Numbers are `Copy`, and the result has no connection to the slice." },
            { t: 'Yes, but `tail` now points at freed memory', why: "That cannot happen in safe Rust. If `tail` were still in use, the program would be rejected. It is not in use, so nothing can observe it." },
          ],
          verify: 'compiles',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let mut v = vec![5, 6, 7, 8];
    let head = &v[..2];
    v[3] = 0;
    println!("{head:?} {v:?}");
}`,
          options: [
            { t: 'No: `head` borrows all of `v`, and it is used after the write', ok: true, why: "A slice is a borrow of the collection, whichever elements it covers. The write on line 4 needs `v` mutably while `head` is still in use on line 5." },
            { t: 'Yes: the slice covers elements 0 and 1, and the write is to element 3', why: "That is true, and the compiler does not use it. It tracks the borrow of `v`, not the indexes. `split_at_mut` is the way to tell it that two parts are separate." },
            { t: 'Yes: writing an element does not move the buffer, so nothing can go wrong', why: "The rule is not only about buffers that move. A shared reference promises that the data will not change while it is in use, and line 4 would break that promise." },
            { t: 'No: a `Vec` element cannot be assigned with `v[3] = 0`', why: "It can, when `v` is `mut` and nothing else is borrowing it." },
          ],
          verify: 'E0502',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn classify(values: &[i32]) -> i32 {
    match values {
        [] => 0,
        [x] => *x,
        [first, .., last] => first + last,
    }
}

fn main() {
    let v = [4, 9, 2, 7];
    println!("{} {} {} {}", classify(&v), classify(&v[1..2]), classify(&v[2..2]), classify(&v[1..]));
}`,
          answer: '11 9 0 16',
          explain: "The whole array matches `[first, .., last]`: 4 + 7. `&v[1..2]` is the one element 9. `&v[2..2]` is empty. `&v[1..]` is `[9, 2, 7]`: 9 + 7.",
          hint: "Work out how many elements each slice has before choosing the arm.",
        },
      ],
      challenges: [
        {
          id: 'sum-slice',
          title: 'Add up a slice',
          level: 'warm-up',
          prompt: [
            "Return the sum of the elements. The parameter is a `&[i32]`, so the tests can pass a `Vec`, an array, or a part of either.",
            "Looping over a slice gives a reference to each element.",
          ],
          signature: 'fn sum_slice(values: &[i32]) -> i32',
          starter: rs`fn sum_slice(values: &[i32]) -> i32 {
    let mut total = 0;
    for value in values {
        // value is a &i32: a reference to one element.
    }
    total
}`,
          hints: [
            "`total += value;` works, because `+=` accepts a reference to a number.",
            "`*value` is the number the reference points at, so `total += *value;` says the same thing.",
          ],
          solution: rs`fn sum_slice(values: &[i32]) -> i32 {
    let mut total = 0;
    for value in values {
        total += value;
    }
    total
}`,
          solutionNote: "Once you know iterators, from lesson 18, this is `values.iter().sum()`.",
          tests: [
            { label: 'Adds up a whole Vec', body: rs`let list = vec![1, 2, 3, 4];
assert_eq!(sum_slice(&list), 10);` },
            { label: 'Adds up an array with a negative number', body: rs`assert_eq!(sum_slice(&[10, -20, 30]), 20);` },
            { label: 'Adds up part of a Vec', body: rs`let list = vec![1, 2, 3, 4, 5];
assert_eq!(sum_slice(&list[1..4]), 9);` },
            { label: 'An empty slice sums to 0', body: rs`assert_eq!(sum_slice(&[]), 0);` },
          ],
        },
        {
          id: 'trim-ends',
          title: 'Without the ends',
          level: 'warm-up',
          prompt: [
            "Return the slice without its first and last elements. A slice with fewer than two elements has nothing between its ends, so the result is empty.",
            "The starter is right for long slices. For short ones it panics, in two different ways. The failing tests show you both messages.",
          ],
          signature: 'fn trim_ends(values: &[i32]) -> &[i32]',
          starter: rs`fn trim_ends(values: &[i32]) -> &[i32] {
    &values[1..values.len() - 1]
}`,
          hints: [
            "With one element the range is `1..0`, which starts after it ends. With none, `values.len() - 1` goes below zero.",
            "Deal with the short slices before taking the range: `if values.len() < 2 { … }`.",
            "An empty slice is written `&[]`, or `&values[..0]`.",
          ],
          solution: rs`fn trim_ends(values: &[i32]) -> &[i32] {
    if values.len() < 2 {
        return &[];
    }
    &values[1..values.len() - 1]
}`,
          solutionNote: "A slice pattern says it in one expression: `match values { [_, middle @ .., _] => middle, _ => &[] }`.",
          tests: [
            { label: 'Drops the first and the last of five', body: rs`let values = [1, 2, 3, 4, 5];
assert_eq!(trim_ends(&values), [2, 3, 4]);` },
            { label: 'Two elements leave nothing', body: rs`assert!(trim_ends(&[1, 2]).is_empty());` },
            { label: 'One element leaves nothing', body: rs`assert!(trim_ends(&[9]).is_empty());` },
            { label: 'An empty slice stays empty', body: rs`assert!(trim_ends(&[]).is_empty());` },
            { label: 'The result is a view of the input, not a copy', body: rs`let values = vec![7, 8, 9, 10];
let inner = trim_ends(&values);
assert_eq!(inner.len(), 2);
assert!(std::ptr::eq(&inner[0], &values[1]), "the result must point into the input");` },
          ],
        },
        {
          id: 'largest-in-slice',
          title: 'A reference to the largest',
          level: 'core',
          forbid: ['max', 'max_by', 'max_by_key'],
          prompt: [
            "Return a reference to the largest element, or `None` if the slice is empty. When several elements are equally large, return the first of them.",
            "Write the loop yourself, without the `max` method. The starter shows the two ways to make an `Option`: `None`, and `Some(value)`.",
          ],
          signature: 'fn largest(values: &[i32]) -> Option<&i32>',
          starter: rs`fn largest(values: &[i32]) -> Option<&i32> {
    if values.is_empty() {
        return None;
    }
    // Find the largest element, and return a reference to it.
    Some(&values[0])
}`,
          hints: [
            "Keep a `let mut best = &values[0];`. It is a reference, and a `mut` reference variable can be pointed at another element later.",
            "`for value in values` gives a `&i32` each time. Comparing two references with `>` compares the numbers they point at.",
            "`if value > best { best = value; }`, then `Some(best)` after the loop. The strict `>` keeps the first of several equal elements.",
          ],
          solution: rs`fn largest(values: &[i32]) -> Option<&i32> {
    if values.is_empty() {
        return None;
    }
    let mut best = &values[0];
    for value in values {
        if value > best {
            best = value;
        }
    }
    Some(best)
}`,
          tests: [
            { label: 'Finds the largest in the middle', body: rs`assert_eq!(largest(&[3, 9, 4]), Some(&9));` },
            { label: 'Works when every element is negative', body: rs`assert_eq!(largest(&[-8, -3, -5]), Some(&-3));` },
            { label: 'An empty slice has no largest element', body: rs`assert_eq!(largest(&[]), None);` },
            { label: 'The result points into the slice', body: rs`let values = vec![1, 6, 2];
match largest(&values) {
    Some(found) => assert!(std::ptr::eq(found, &values[1]), "expected a reference to values[1]"),
    None => panic!("expected Some for a slice with elements"),
}` },
            { label: 'Of several equal elements, it returns the first', body: rs`let values = [5, 7, 7, 1];
match largest(&values) {
    Some(found) => assert!(std::ptr::eq(found, &values[1]), "expected a reference to values[1], the first 7"),
    None => panic!("expected Some for a slice with elements"),
}` },
          ],
        },
        {
          id: 'reverse-in-place',
          title: 'Reverse in place',
          level: 'core',
          forbid: ['reverse'],
          prompt: "Reverse the order of the elements, in the slice you are given and without making a second one. The standard library has `reverse` for this. Write it yourself, with two indexes and `swap`.",
          signature: 'fn reverse_in_place(values: &mut [i32])',
          starter: rs`fn reverse_in_place(values: &mut [i32]) {
    let n = values.len();
    // values.swap(i, j) exchanges two elements.
    if n >= 2 {
        values.swap(0, n - 1);
    }
}`,
          hints: [
            "Element `i` changes places with element `n - 1 - i`.",
            "Stop halfway. If the loop runs over every index, each pair is swapped twice and the slice ends as it began.",
            "`for i in 0..n / 2 { values.swap(i, n - 1 - i); }`. An empty slice gives the range `0..0`, so `n - 1` is never computed for it.",
          ],
          solution: rs`fn reverse_in_place(values: &mut [i32]) {
    let n = values.len();
    for i in 0..n / 2 {
        values.swap(i, n - 1 - i);
    }
}`,
          tests: [
            { label: 'Reverses an even number of elements', body: rs`let mut values = [1, 2, 3, 4];
reverse_in_place(&mut values);
assert_eq!(values, [4, 3, 2, 1]);` },
            { label: 'Reverses an odd number of elements', body: rs`let mut values = vec![1, 2, 3, 4, 5];
reverse_in_place(&mut values);
assert_eq!(values, [5, 4, 3, 2, 1]);` },
            { label: 'Leaves an empty slice and a single element alone', body: rs`let mut none: [i32; 0] = [];
reverse_in_place(&mut none);
let mut one = [7];
reverse_in_place(&mut one);
assert_eq!(one, [7]);` },
            { label: 'Reverses only the part it is given', body: rs`let mut values = [1, 2, 3, 4, 5, 6];
reverse_in_place(&mut values[1..5]);
assert_eq!(values, [1, 5, 4, 3, 2, 6]);` },
          ],
        },
        {
          id: 'is-sorted',
          title: 'Is it in order?',
          level: 'core',
          forbid: ['is_sorted', 'is_sorted_by', 'is_sorted_by_key', 'sort', 'sort_unstable'],
          prompt: "Return `true` when no element is smaller than the one before it. Equal neighbors are in order, and so are an empty slice and a slice of one. The standard library calls this `is_sorted`. Write it yourself with `windows(2)`, which gives each pair of neighbors as a slice of two elements.",
          signature: 'fn in_order(values: &[i32]) -> bool',
          starter: rs`fn in_order(values: &[i32]) -> bool {
    for pair in values.windows(2) {
        // pair[0] and pair[1] are two neighbors.
    }
    true
}`,
          hints: [
            "One pair out of order settles the answer, so the function can return `false` from inside the loop.",
            "`if pair[0] > pair[1] { return false; }`",
            "A slice with fewer than two elements has no windows, so the loop does not run and the function returns `true`. No special case is needed.",
          ],
          solution: rs`fn in_order(values: &[i32]) -> bool {
    for pair in values.windows(2) {
        if pair[0] > pair[1] {
            return false;
        }
    }
    true
}`,
          tests: [
            { label: 'Accepts ascending values', body: rs`assert!(in_order(&[1, 2, 5, 9]));` },
            { label: 'Accepts equal neighbors', body: rs`assert!(in_order(&[3, 3, 4, 4]));` },
            { label: 'Rejects a single pair out of order at the end', body: rs`assert!(!in_order(&[1, 2, 5, 4]));` },
            { label: 'Rejects descending values', body: rs`assert!(!in_order(&[9, 5, 2]));` },
            { label: 'Accepts an empty slice and a single element', body: rs`assert!(in_order(&[]));
assert!(in_order(&[42]));` },
          ],
        },
        {
          id: 'partition-in-place',
          title: 'Partition around a pivot',
          level: 'stretch',
          forbid: ['sort', 'sort_unstable', 'to_vec', 'Vec', 'vec'],
          prompt: [
            "Rearrange the slice so that every element smaller than `pivot` comes before every element that is not, and return how many smaller elements there are. The order inside each group does not matter. This is the step at the heart of quicksort.",
            "Do it in one pass over the slice, in place: no sorting and no second buffer. The starter counts the small elements correctly and moves nothing.",
          ],
          signature: 'fn partition(values: &mut [i32], pivot: i32) -> usize',
          starter: rs`fn partition(values: &mut [i32], pivot: i32) -> usize {
    let mut boundary = 0;                 // everything before this index is below the pivot
    for i in 0..values.len() {
        if values[i] < pivot {
            boundary += 1;
        }
    }
    boundary
}`,
          hints: [
            "Two indexes, as in the last section of the lesson. `i` reads every element, and `boundary` is where the next small element belongs.",
            "When `values[i]` is below the pivot, exchange it with the element at `boundary`, and then move `boundary` on by one.",
            "`values.swap(boundary, i);` goes just before `boundary += 1;`.",
          ],
          solution: rs`fn partition(values: &mut [i32], pivot: i32) -> usize {
    let mut boundary = 0;                 // everything before this index is below the pivot
    for i in 0..values.len() {
        if values[i] < pivot {
            values.swap(boundary, i);
            boundary += 1;
        }
    }
    boundary
}`,
          tests: [
            { label: 'Puts the smaller elements first and counts them', body: rs`let mut values = [5, 1, 8, 3, 9, 2];
let count = partition(&mut values, 5);
assert_eq!(count, 3);
for value in &values[..count] {
    assert!(*value < 5, "{value} is in the front part");
}
for value in &values[count..] {
    assert!(*value >= 5, "{value} is in the back part");
}` },
            { label: 'Keeps every element', body: rs`let mut values = [7, 2, 7, 1, 4, 4, 9];
partition(&mut values, 4);
values.sort();
assert_eq!(values, [1, 2, 4, 4, 7, 7, 9]);` },
            { label: 'Handles a pivot below everything and above everything', body: rs`let mut values = [3, 1, 2];
assert_eq!(partition(&mut values, 0), 0);
assert_eq!(partition(&mut values, 10), 3);
values.sort();
assert_eq!(values, [1, 2, 3]);` },
            { label: 'Separates a slice that starts in the wrong order', body: rs`let mut values = [9, 8, 7, 1, 2, 3];
let count = partition(&mut values, 5);
assert_eq!(count, 3);
values[..count].sort();
values[count..].sort();
assert_eq!(values, [1, 2, 3, 7, 8, 9]);` },
            { label: 'Accepts an empty slice', body: rs`let mut none: [i32; 0] = [];
assert_eq!(partition(&mut none, 5), 0);` },
          ],
        },
      ],
    },

    {
      id: 'strings',
      title: 'Strings',
      category: part,
      minutes: 40,
      summary: 'Rust has two types for text. A String owns its bytes, and a &str borrows a run of them from somewhere else. Both hold UTF-8, which decides what an index can and cannot mean.',
      topics: ['String and &str', 'Literals', 'Building text', 'UTF-8', 'Byte ranges', 'Signatures', 'Conversions'],
      sections: [
        {
          title: 'Two types for text',
          body: [
            "Every signature with text in it has been written for you so far, with a promise that this lesson would explain the two types. You already know the shape of both.",
            "A `String` is the value lesson 4 took apart: a pointer, a length and a capacity on the stack, and a buffer on the heap that it owns and will free. A `&str`, read as \"string slice\", is the slice of lesson 8 applied to text: a pointer and a length, looking at bytes that something else owns. `String` is to `&str` what `Vec<T>` is to `&[T]`.",
            { run: rs`fn main() {
    let owned = String::from("new moon");     // a heap buffer, owned by this variable
    let word = &owned[4..];                   // a view of the last four bytes of that buffer
    let literal = "sun";                      // a view of three bytes stored in the program itself

    println!("{owned} / {word} / {literal}");
    println!("{} {} {}", owned.len(), word.len(), literal.len());
    println!("{} bytes for a String, {} for a &str",
        std::mem::size_of::<String>(), std::mem::size_of::<&str>());
}`, name: 'two_types.rs', expect: 'new moon / moon / sun\n8 4 3\n24 bytes for a String, 16 for a &str\n' },
            { memory: {
              title: 'One owner and two views',
              vars: [
                { id: 'owned', type: 'String' },
                { id: 'word', type: '&str' },
                { id: 'literal', type: '&str' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 8, frame: 'heap' },
                { id: 'lit', name: 'the literal "sun"', type: 'u8', len: 3, frame: 'static' },
              ],
              set: {
                owned: { ptr: '&buf', len: 8, cap: 8 },
                word: { ptr: '&buf[4]', len: 4 },
                literal: { ptr: '&lit', len: 3 },
                buf: ["'n'", "'e'", "'w'", "' '", "'m'", "'o'", "'o'", "'n'"],
                lit: ["'s'", "'u'", "'n'"],
              },
              caption: "Solid arrows own and dashed arrows borrow. `owned` will free the heap buffer. `word` looks at four of its bytes. `literal` looks at bytes that belong to the program and are never freed.",
            } },
            "The text of a literal is written into the executable file when the program is compiled, and loaded along with the code. The figure calls that region static. Nothing allocates it and nothing frees it, so a literal is valid for as long as the program runs. A literal is a `&str` that points there. It is not a `String`.",
            "The two types do not stand in for each other. Going from a `String` to a `&str` is a borrow and costs nothing. Going from a `&str` to a `String` needs a new heap buffer and a copy of the bytes, and Rust never allocates without being asked:",
            { run: rs`fn greet(name: String) {
    println!("Hello, {name}");
}

fn main() {
    greet("Ada");
}`, name: 'not_a_string.rs', fails: 'E0308' },
            "The `help:` line shows one way to ask, `\"Ada\".to_string()`, and `String::from(\"Ada\")` does the same. The last section of this lesson lists the conversions. The better fix is often on the other side: a function that only reads its text should not ask for a `String` at all, which is the subject of section 5.",
            { compare: "Python, PHP and JavaScript each have one string type, and the runtime decides how long the bytes stay alive, by counting references or by collecting garbage. Rust has no runtime to do that, so the question of who frees the bytes shows up in the type: a `String` frees them, and a `&str` never does. Strings in Python and JavaScript are also immutable. A Rust `String` declared `mut` is changed in place, like a string in PHP." },
            { aside: "`str` by itself is to `&str` what `[T]` is to `&[T]`: some number of bytes side by side, of a size not known at compile time, and always used behind a pointer. A `&str` is a `&[u8]` with one promise added: the bytes are valid UTF-8. Section 3 is about that promise." },
            { fromC: "There is no terminator. A C string is a bare pointer, and its length is found by walking to the `'\\0'`. A `&str` stores its length, so `len()` reads one field, the text may contain a zero byte, and the middle of a string is itself a string without copying anything. A `String` is the growable buffer you built with `malloc` and `realloc` in the C heap lesson, with the bookkeeping done for you." },
          ],
        },
        {
          title: 'Building and changing a String',
          body: [
            "A `String` declared `mut` grows and shrinks in place. When it runs out of capacity it moves to a bigger buffer, exactly as a `Vec` does in lesson 4.",
            { run: rs`fn main() {
    let mut line = String::new();          // empty, with no heap buffer yet
    line.push_str("tea");                  // append a &str
    line.push(' ');                        // append one char
    line.push_str("for two");
    println!("{line} ({} bytes)", line.len());

    line.insert(0, '>');                   // insert at a byte position
    line.insert_str(1, " ");
    println!("{line}");

    let last = line.pop();                 // remove the last char
    line.truncate(5);                      // keep the first 5 bytes
    println!("{line} {last:?}");

    line.clear();
    println!("[{line}] {}", line.is_empty());
}`, name: 'build.rs', expect: "tea for two (11 bytes)\n> tea for two\n> tea Some('o')\n[] true\n" },
            { list: [
              "`push_str` takes a `&str` and copies its bytes onto the end. `push` takes one `char`.",
              "`insert` and `insert_str` take a position in bytes, and move everything after it along.",
              "`pop` returns an `Option<char>`, because the string may be empty. `truncate` and `clear` shorten the text and keep the buffer.",
              "`String::with_capacity(n)` starts with room for `n` bytes, for when you know roughly how much text is coming.",
            ] },
            "To join two pieces of text there is `+`. It does not treat its two sides alike.",
            { run: rs`fn main() {
    let first = String::from("Ada");
    let second = String::from("Lovelace");

    let full = first + " " + &second;
    println!("{full}");
    println!("{first}");
}`, name: 'plus.rs', fails: 'E0382' },
            "`+` on a `String` is a call to a method with the signature `fn add(self, other: &str) -> String`. The left side is `self`, taken by value, so the `String` moves in, as any `String` passed to a function does in lesson 5. The right side is only borrowed. `add` copies the right side's bytes onto the end of the buffer it was given, and hands that same buffer back as the result. So `first` is gone and `second` is not: the buffer that was `first` now belongs to `full`.",
            "That is efficient, because one buffer is extended and nothing is copied twice. It is also a surprise the first time. When you want to keep every piece, use `format!`, which only borrows what it is given:",
            { run: rs`fn main() {
    let first = String::from("Ada");
    let second = String::from("Lovelace");

    let full = format!("{first} {second}");     // borrows both, and builds a new String
    println!("{full}");
    println!("{first} and {second} are still here");

    let mut list = String::new();
    for n in 1..=3 {
        list += &n.to_string();                 // += is push_str: it borrows the right side
        list += ", ";
    }
    println!("{list}");
}`, name: 'format.rs', expect: 'Ada Lovelace\nAda and Lovelace are still here\n1, 2, 3, \n' },
            { pitfall: [
              "`+` needs an owned `String` on the left, because that is the buffer it appends to, and a `&str` on the right. Two literals have no buffer to grow:",
              { run: rs`fn main() {
    let greeting = "Hello, " + "world";
    println!("{greeting}");
}`, name: 'two_literals.rs', fails: 'E0369' },
              "Write `String::from(\"Hello, \") + \"world\"`, or use `format!`. With two `String`s, borrow the second: `first + &second`.",
            ] },
            { compare: "In Python and JavaScript a string never changes: `s += \"x\"` builds a new string and points the name at it, and `a + b` leaves both `a` and `b` alone. PHP's `.=` appends in place, which is what `push_str` and `+=` do here. None of the three has anything like a `+` that uses up its left side, because none of them tracks who owns a buffer." },
          ],
        },
        {
          title: 'UTF-8: bytes are not characters',
          body: [
            "A `String` and a `&str` always hold text encoded as **UTF-8**. That is a guarantee of the types, and safe code cannot build one that holds anything else. UTF-8 stores each character in one to four bytes.",
            { table: {
              head: ['Characters', 'Bytes each', 'Examples'],
              rows: [
                ['ASCII: English letters, digits, common punctuation', '1', '`a` `7` `?`'],
                ['Accented Latin letters, Greek, Cyrillic, Hebrew, Arabic', '2', '`é` `ñ` `λ` `ж`'],
                ['Most Chinese, Japanese and Korean characters, and many symbols', '3', '`日` `한` `€`'],
                ['Emoji and rarer scripts', '4', '`🦀`'],
              ],
            } },
            "`len()` is the number of bytes, because that is what is stored. The number of characters has to be counted.",
            { run: rs`fn main() {
    for word in ["cafe", "café", "日本語", "🦀🦀"] {
        println!("{word}: {} bytes, {} characters", word.len(), word.chars().count());
    }
}`, name: 'len_and_count.rs', expect: 'cafe: 4 bytes, 4 characters\ncafé: 5 bytes, 4 characters\n日本語: 9 bytes, 3 characters\n🦀🦀: 8 bytes, 2 characters\n' },
            { strip: {
              title: 'The ten bytes of `"aé日🦀"`',
              kicker: 'Bytes, in hexadecimal',
              cells: ['61', 'c3', 'a9', 'e6', '97', 'a5', 'f0', '9f', 'a6', '80'],
              marks: [
                { at: 0, span: 1, label: '`a`' },
                { at: 1, span: 2, label: '`é`' },
                { at: 3, span: 3, label: '`日`' },
                { at: 6, span: 4, label: '`🦀`' },
              ],
              accent: [1, 2, 6, 7, 8, 9],
              ghost: true,
              caption: "Four characters in ten bytes, shaded in turn so that you can see where one stops and the next begins. A character starts at byte 0, 1, 3 and 6, and the text ends at 10. Those five positions are the **character boundaries**. Every other position is in the middle of a character.",
            } },
            "Three methods walk the same text in three ways.",
            { run: rs`fn main() {
    let text = "aé日🦀";

    for byte in text.bytes() {                  // each byte, as a u8
        print!("{byte:02x} ");
    }
    println!();

    for c in text.chars() {                     // each character, as a char
        print!("{c} ");
    }
    println!();

    for (index, c) in text.char_indices() {     // each character, with the byte position where it starts
        print!("{index}:{c} ");
    }
    println!();
}`, name: 'three_views.rs', expect: '61 c3 a9 e6 97 a5 f0 9f a6 80 \na é 日 🦀 \n0:a 1:é 3:日 6:🦀 \n' },
            "`bytes()` gives each byte as a `u8`. `chars()` decodes as it goes and gives each character as a `char`, the four-byte type from lesson 2 that can hold any one of them. `char_indices()` gives each character together with the byte position where it starts. Those positions are the boundaries in the figure.",
            "All three are **iterators**: values that hand out one item at a time. A `for` loop asks for items until none are left. You can also ask by hand: `next()` returns `Some(item)`, or `None` once the iterator has run out. Lesson 18 is about iterators. For this lesson a `for` loop and a few methods are enough: `count()`, `next()`, `last()`, `nth(n)` and `rev()`.",
            { run: rs`fn main() {
    let text = "Año 2024";

    let mut letters = 0;
    let mut digits = 0;
    for c in text.chars() {
        if c.is_alphabetic() {
            letters += 1;
        } else if c.is_ascii_digit() {
            digits += 1;
        }
    }
    println!("{letters} letters, {digits} digits");

    let mut chars = text.chars();
    println!("{:?} {:?}", chars.next(), chars.next());     // asking by hand, twice
    println!("{:?} {:?}", text.chars().last(), text.chars().nth(2));

    let mut reversed = String::new();
    for c in text.chars().rev() {                          // from the back, one character at a time
        reversed.push(c);
    }
    println!("{reversed}");
    println!("{} {} {}", 'a'.len_utf8(), 'ñ'.len_utf8(), '🦀'.len_utf8());
}`, name: 'chars.rs', expect: "3 letters, 4 digits\nSome('A') Some('ñ')\nSome('4') Some('o')\n4202 oñA\n1 2 4\n" },
            "Only `len()` is a quick lookup. There is no stored count of characters and no table of where they start, so `chars().count()` reads the whole text, and `chars().nth(n)` reads as far as character `n`.",
            { compare: "The three languages count three different things. Python's `len(\"café\")` is 4: it counts characters, and it stores text so that `s[i]` is a quick lookup, at the price of up to four bytes for every character in the string. JavaScript's `\"🦀\".length` is 2: it counts 16-bit units, and `s[0]` of that string is half a character. PHP's `strlen(\"café\")` is 5: it counts bytes, as Rust does, and leaves characters to `mb_strlen`. Rust stores text the way PHP does. The difference is in the next section: Rust will not hand you half a character." },
            { aside: [
              "A `char` is one Unicode code point, and that is not always what a reader would call a character. An accented letter can be a single `char`, or a plain letter followed by a combining accent. A flag is two `char`s, and many other emoji are longer sequences.",
              { run: rs`fn main() {
    let one = "\u{e9}";             // é as a single code point
    let two = "e\u{301}";           // e, then a combining acute accent
    println!("{} {}", one.chars().count(), two.chars().count());
    println!("{}", one == two);     // they look the same on screen, and are different bytes
    println!("{}", "🇯🇵".chars().count());
}`, name: 'code_points.rs', expect: '1 2\nfalse\n2\n' },
              "What a reader sees as one unit is called a grapheme cluster. Finding those takes large tables, which the standard library leaves to a library of its own, the `unicode-segmentation` crate. Lesson 22 shows how to add a crate to a project.",
            ] },
          ],
        },
        {
          title: 'Why s[0] does not compile',
          body: [
            "In Python, JavaScript and PHP, `s[0]` is the first character, more or less. In Rust it is an error.",
            { run: rs`fn main() {
    let word = String::from("café");
    let first = word[0];
    println!("{first}");
}`, name: 'index.rs', fails: 'E0277' },
            "This is not a missing feature. Think about what `word[3]` should mean for `café`, whose bytes are `63 61 66 c3 a9`. If it means byte 3, the answer is `c3`, which is half of an `é` and not text at all. If it means character 3, the answer is `é`, but finding it means decoding from the start, and square brackets promise a quick lookup. Rust has you say which of the two you mean.",
            { run: rs`fn main() {
    let word = "café";

    println!("{}", word.as_bytes()[3]);        // the byte at position 3: 195, which is 0xc3
    println!("{:?}", word.chars().nth(3));     // the character at position 3, found by walking
    println!("{:?}", word.chars().nth(4));     // None: there are only four characters
    println!("{:?}", word.chars().next());     // the first character
}`, name: 'byte_or_char.rs', expect: "195\nSome('é')\nNone\nSome('c')\n" },
            "`as_bytes()` views the text as a `&[u8]`, a slice like any in lesson 8, and a slice of bytes can be indexed. `chars().nth(n)` walks to the character and returns an `Option`, because there may be no such character.",
            "A **range** in the brackets is allowed, and it gives a `&str`. Its numbers are byte positions, and both of them must be character boundaries. That is checked when the program runs. A range that cuts a character in two is a panic.",
            { run: rs`fn initial(name: &str) -> &str {
    &name[..1]            // the first byte, which is the first character only in ASCII
}

fn main() {
    println!("{}", initial("Zoë"));
    println!("{}", initial("Émile"));
}`, name: 'boundary.rs', panics: true, expect: 'Z\n' },
            "The message is exact: the end of the range, byte 1, is inside `É`, which occupies bytes `0..2`. The program is stopped because the alternative is a `&str` holding half a character, and that would break the guarantee every other piece of code relies on.",
            { pitfall: "A slice by a fixed number, such as `&name[..1]` or `&line[..80]`, passes every test written in English and panics for the first user called Émile. Ask where the number came from. A position returned by `find` or `char_indices`, or `len()` itself, is a boundary. A count of characters, a column width or a number from a file format is not a byte position at all." },
            "These are the tools for finding a position that is safe to cut at:",
            { run: rs`fn main() {
    let text = "aé日🦀";

    println!("{} {}", text.is_char_boundary(1), text.is_char_boundary(2));
    println!("{:?} {:?}", text.get(1..3), text.get(1..2));     // get checks, and returns an Option

    // The first two characters, however many bytes they take.
    let end = match text.char_indices().nth(2) {
        Some((index, _)) => index,       // where the third character starts
        None => text.len(),              // fewer than three characters: take everything
    };
    println!("{} is {end} bytes", &text[..end]);

    if let Some(at) = text.find('日') {   // find returns a byte position, always on a boundary
        println!("{at}: {}", &text[at..]);
    }

    let (left, right) = text.split_at(3);
    println!("{left} | {right}");
}`, name: 'safe_positions.rs', expect: 'true false\nSome("é") None\naé is 3 bytes\n3: 日🦀\naé | 日🦀\n' },
            { table: {
              head: ['To get', 'Write', 'Cost'],
              rows: [
                ['The length in bytes', '`s.len()`', 'Reads one field'],
                ['The number of characters', '`s.chars().count()`', 'Reads the whole text'],
                ['The first character', '`s.chars().next()`', 'Decodes one character'],
                ['Character number `n`', '`s.chars().nth(n)`', 'Decodes every character up to it'],
                ['One byte', '`s.as_bytes()[i]`', 'One checked lookup'],
                ['Part of the text', '`&s[a..b]`, or `s.get(a..b)` for an `Option`', 'Two boundary checks'],
              ],
            } },
          ],
        },
        {
          title: '&str in signatures',
          body: [
            "Lesson 8 said to write `&[T]`, not `&Vec<T>`. For text the same advice reads: take a `&str`, not a `&String`. A `&str` parameter accepts every kind of text a caller might have.",
            { run: rs`fn count_vowels(text: &str) -> usize {
    let mut count = 0;
    for c in text.chars() {
        if "aeiou".contains(c) {
            count += 1;
        }
    }
    count
}

fn main() {
    let owned = String::from("borrow checker");

    println!("{}", count_vowels("literal"));          // a literal
    println!("{}", count_vowels(&owned));             // a borrowed String
    println!("{}", count_vowels(&owned[..6]));        // part of a String
    println!("{}", count_vowels(owned.as_str()));     // the same borrow, spelled out
}`, name: 'accepts.rs', expect: '3\n4\n2\n4\n' },
            "`&owned` is a `&String`, and the compiler converts it to a `&str` for you, as it converts a `&Vec<T>` to a `&[T]`. Nothing converts the other way. A parameter of type `&String` turns away literals and parts of strings, and gains nothing in return.",
            "For the return type, ask where the bytes of the result live.",
            { list: [
              "**The result is a part of the input.** Return a `&str`. It points into the caller's text, and nothing is allocated or copied.",
              "**The result is new text.** Somebody has to own its bytes, so return a `String`.",
            ] },
            { run: rs`// A part of the input: return a view of it.
fn extension(filename: &str) -> &str {
    match filename.rfind('.') {              // the byte position of the last dot, if there is one
        Some(dot) => &filename[dot + 1..],
        None => "",
    }
}

// New text: return a String that the caller will own.
fn with_extension(stem: &str, ext: &str) -> String {
    format!("{stem}.{ext}")
}

fn main() {
    let name = String::from("report.final.pdf");
    println!("{}", extension(&name));
    println!("[{}]", extension("Makefile"));
    println!("{}", with_extension("notes", "txt"));
}`, name: 'returns.rs', expect: 'pdf\n[]\nnotes.txt\n' },
            "A `&str` that comes back from a function is still a borrow. The signature `fn extension(filename: &str) -> &str` tells the compiler that the result looks into the argument, so the argument stays borrowed for as long as the result is in use. Lesson 10 explains how a signature says that. This is what it buys you:",
            { run: rs`fn extension(filename: &str) -> &str {
    match filename.rfind('.') {
        Some(dot) => &filename[dot + 1..],
        None => "",
    }
}

fn main() {
    let mut name = String::from("report.pdf");
    let ext = extension(&name);       // ext points into the buffer of name
    name.clear();                     // empties that buffer
    println!("{ext}");
}`, name: 'clear_under_view.rs', fails: 'E0502' },
            "`clear` would empty the buffer that `ext` is looking at, and the last line would print whatever was left there. This is the rule of lesson 7, many readers or one writer, doing its ordinary work across a function call.",
            "The other half of the advice is not optional either. A function cannot return a view of text it made itself. A `String` created inside the function is freed when the function returns, as lesson 6 showed, and the view would point at freed memory:",
            { run: rs`fn bracketed(label: &str) -> &str {
    let wide = format!("[{label}]");     // a new String, owned by this function
    &wide                                // a view of it, returned just as wide is freed
}

fn main() {
    println!("{}", bracketed("draft"));
}`, name: 'view_of_local.rs', fails: 'E0515' },
            "Return the `String` itself: make the return type `String` and the last line `wide`. That moves the buffer out to the caller instead of freeing it.",
            "A function that changes the caller's text takes a `&mut String`. It needs the `String` and not a slice of it, because appending may have to move the buffer, and only the owner's pointer and capacity can record that. The reasoning is the same as for `&mut Vec<T>` against `&mut [T]` in lesson 8.",
            { run: rs`fn sign(message: &mut String, name: &str) {
    if !message.ends_with('\n') {
        message.push('\n');
    }
    message.push_str("-- ");
    message.push_str(name);
}

fn main() {
    let mut note = String::from("Back at three.");
    sign(&mut note, "Grace");
    println!("{note}");
}`, name: 'in_place.rs', expect: 'Back at three.\n-- Grace\n' },
            { table: {
              head: ['In a signature', 'It says'],
              rows: [
                ['A parameter `text: &str`', 'The function reads the text. This is the default.'],
                ['A parameter `text: &mut String`', 'The function changes the caller\'s text in place: it appends, truncates or clears.'],
                ['A parameter `text: String`', 'The function keeps the text or uses it up. The caller gives it away.'],
                ['A result of type `&str`', 'A part of one of the arguments. Nothing was allocated.'],
                ['A result of type `String`', 'New text, which the caller now owns.'],
              ],
            } },
            { native: "rust-analyzer writes the inferred type of each `let` beside its name in your editor, in gray. With text that is worth a glance: it tells you whether a variable is a `String` that you own or a `&str` that is borrowing from something. Clippy's `ptr_arg` lint, from lesson 8, also flags a parameter of type `&String`." },
          ],
        },
        {
          title: 'The string toolbox',
          body: [
            "The standard library has a method for most things you do to text. The useful way to sort them is by what they return, because that tells you what they cost. A method that returns a `&str` gives you a view of text you already have. A method that returns a `String` allocated a buffer and wrote new text into it.",
            { table: {
              head: ['Returns', 'Methods', 'Allocates'],
              rows: [
                ['A `&str` into the original', '`trim()`, `trim_start()`, `trim_end()`, `&s[a..b]`', 'No'],
                ['An `Option` holding views', '`strip_prefix(p)`, `strip_suffix(p)`, `split_once(sep)`, `get(a..b)`', 'No'],
                ['An iterator of views', '`split(sep)`, `split_whitespace()`, `lines()`', 'No'],
                ['A position, or yes or no', '`find(p)`, `rfind(p)`, `contains(p)`, `starts_with(p)`, `ends_with(p)`', 'No'],
                ['A new `String`', '`to_uppercase()`, `to_lowercase()`, `replace(a, b)`, `repeat(n)`, `to_string()`', 'Yes'],
                ['Nothing: they change a `String` in place', '`push`, `push_str`, `insert`, `pop`, `truncate`, `clear`', 'Only when the buffer has to grow'],
              ],
            } },
            { run: rs`fn main() {
    let line = "  name = Ada Lovelace  ";

    let trimmed = line.trim();                        // a view without the outer spaces
    println!("[{trimmed}]");

    for part in trimmed.split(" = ") {                // each piece is a view of line
        println!("[{part}]");
    }

    if let Some((key, value)) = trimmed.split_once(" = ") {
        println!("{key} is {value}");
    }

    for word in "one  two\tthree\n".split_whitespace() {
        print!("<{word}>");
    }
    println!();

    println!("{:?}", "a,b,,c".split(',').nth(2));     // split keeps empty pieces
    println!("{:?} {:?}", "v1.2".strip_prefix("v"), "1.2".strip_prefix("v"));
    println!("{} {:?}", line.contains("Ada"), line.find("name"));
}`, name: 'views.rs', expect: '[name = Ada Lovelace]\n[name]\n[Ada Lovelace]\nname is Ada Lovelace\n<one><two><three>\nSome("")\nSome("1.2") None\ntrue Some(2)\n' },
            "`split` does not build a list. It is an iterator that looks for the next separator when the loop asks for the next piece, and each piece is a `&str` into the original text. Walking a megabyte of text with `lines()` and `split` allocates nothing. Where a method takes something to search for, it accepts a `&str` or a single `char`.",
            "The methods that produce new text return a `String`, and leave the original alone:",
            { run: rs`fn main() {
    let title = "Rust in Action";

    let upper = title.to_uppercase();
    let slug = title.to_lowercase().replace(' ', "-");
    let rule = "=".repeat(title.len());
    println!("{upper}\n{slug}\n{rule}");
    println!("{title}");                              // the original is untouched

    println!("{}", "straße".to_uppercase());          // one character became two
    println!("{:?} {}", "42".parse::<i32>(), "4x".parse::<i32>().is_err());
}`, name: 'new_text.rs', expect: 'RUST IN ACTION\nrust-in-action\n==============\nRust in Action\nSTRASSE\nOk(42) true\n' },
            "`to_uppercase` cannot hand back a view, and the German `ß` shows why it cannot even work in place: its upper-case form is `SS`, so the result may be longer than the original. New text needs a buffer of its own.",
            "`parse` turns text into a number, or into any other type that knows how to read itself from text. It returns a `Result`: `Ok(value)`, or an `Err` that says why the text did not fit. Lesson 13 covers `Result`. Until then, `if let Ok(n) = …` runs its block when the parse succeeded, in the way `if let Some(…)` does for an `Option`.",
            "Put together, the view methods take a block of text apart without copying any of it. Every `&str` in this loop points into `report`:",
            { run: rs`fn main() {
    let report = "apples: 3\npears: 12\n\nplums: seven\ncherries: 7\n";

    let mut total = 0;
    for line in report.lines() {                               // a view of each line, without its newline
        if let Some((name, count)) = line.split_once(": ") {   // two views of the line
            if let Ok(n) = count.trim().parse::<u32>() {
                total += n;
                println!("{name:>8} {n:3}");
            }
        }
    }
    println!("{:>8} {total:3}", "total");
}`, name: 'report.rs', expect: '  apples   3\n   pears  12\ncherries   7\n   total  22\n' },
            "The empty line has no `: ` in it, so `split_once` returns `None` and the line is skipped. `seven` is not a number, so `parse` returns an `Err` and that line is skipped too.",
            "Text is compared with the usual operators:",
            { run: rs`fn main() {
    let owned = String::from("tea");
    println!("{} {}", owned == "tea", "tea" == owned);       // String and &str compare by content
    println!("{} {}", "apple" < "banana", "Zebra" < "apple");
    println!("{}", "Content-Type".eq_ignore_ascii_case("content-type"));
}`, name: 'compare.rs', expect: 'true true\ntrue true\ntrue\n' },
            "`==` compares the bytes, and works between a `String` and a `&str` in either order. `<` compares byte by byte. That sorts ASCII words of one case as you expect, and puts every upper-case letter before every lower-case one, which is why `Zebra` comes before `apple`.",
            { compare: "`strip` and `split` in Python, `trim` and `explode` in PHP, and `trim` and `split` in JavaScript all return new strings, and a split builds a whole list of them. The Rust versions return views and build nothing until you ask. To keep the pieces you collect them into a `Vec<&str>`, which lesson 18 shows. That is one allocation for the list, and the pieces still point into the original text." },
          ],
        },
        {
          title: 'Converting between the two',
          body: [
            "Going from owned to borrowed is free and happens all the time. Going from borrowed to owned is an allocation and a copy, so it is always something you write.",
            { table: {
              head: ['From', 'To', 'Write', 'Cost'],
              rows: [
                ['`&str`', '`String`', '`s.to_string()`, `String::from(s)`, `s.to_owned()`, `s.into()`', 'An allocation and a copy'],
                ['`String`', '`&str`', '`&s`, `s.as_str()`, `&s[..]`', 'Nothing'],
                ['`String`', 'A second `String`', '`s.clone()`', 'An allocation and a copy'],
                ['A number', '`String`', '`n.to_string()`, `format!("{n}")`', 'An allocation'],
                ['`&str`', 'A number', '`s.parse::<i32>()`', 'No allocation. The answer is a `Result`'],
                ['`&str`', '`&[u8]`', '`s.as_bytes()`', 'Nothing'],
                ['`&[u8]`', '`&str`', '`std::str::from_utf8(bytes)`', 'A check of every byte. The answer is a `Result`'],
              ],
            } },
            { run: rs`fn main() {
    let borrowed = "tea";

    let a = borrowed.to_string();
    let b = String::from(borrowed);
    let c = borrowed.to_owned();
    let d: String = borrowed.into();
    println!("{}", a == b && b == c && c == d);       // four spellings of one operation

    let view: &str = &a;                              // a pointer and a length: nothing is copied
    println!("{}", view == a.as_str());

    let bytes = view.as_bytes();                      // the same memory, seen as a &[u8]
    println!("{bytes:?}");
    println!("{:?}", std::str::from_utf8(bytes));     // bytes to text is checked

    let half = &"é".as_bytes()[..1];                  // the first of the two bytes of é
    println!("{}", std::str::from_utf8(half).is_err());       // half a character is not text
}`, name: 'conversions.rs', expect: 'true\ntrue\n[116, 101, 97]\nOk("tea")\ntrue\n' },
            "Which spelling you use to go from `&str` to `String` is a matter of taste. `to_string()` and `String::from` are the most common, and this manual uses both.",
            "Which type to hold is a matter of ownership, and the rule of thumb is short:",
            { list: [
              "A parameter that is only read: `&str`.",
              "A result that is part of an argument: `&str`. A result that is new text: `String`.",
              "Text that has to outlive where it came from, because it is stored in a collection or returned from the function that built it: `String`.",
              "A fixed piece of text: a literal, which is a `&str`.",
            ] },
            { pitfall: "When the compiler says `expected String, found &str`, adding `.to_string()` makes the error go away, and every one of them is an allocation and a copy. Before adding it, look at the function you are calling. If it only reads the text, change its parameter to `&str` and no conversion is needed. Convert when something really has to own the text." },
          ],
        },
      ],
      takeaways: [
        "A `String` owns a heap buffer: pointer, length and capacity. A `&str` is a pointer and a length that borrows bytes from a `String`, from a literal or from another `&str`.",
        "Both hold UTF-8. `len()` counts bytes, a character takes one to four of them, and `chars()` decodes them one at a time.",
        "A string has no `s[i]`. A range `&s[a..b]` counts bytes and panics unless both ends are character boundaries, so take positions from `find` and `char_indices`.",
        "Take `&str` as a parameter. Return `&str` for a part of the input and `String` for new text.",
        "`+` moves its left side and borrows its right. `format!` borrows everything it is given.",
        "A method that returns `&str` is a view and allocates nothing. A method that returns `String` allocates. Going from `&str` to `String` is always written out.",
      ],
      quiz: [
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let s = "naïve 🦀";
    println!("{} {}", s.len(), s.chars().count());
}`,
          answer: '11 7',
          explain: "`len()` counts bytes: one each for `n`, `a`, `v`, `e` and the space, two for `ï` and four for the crab. `chars().count()` counts the seven characters.",
          hint: "A letter with an accent takes two bytes in UTF-8, and an emoji takes four.",
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let s = String::from("hello");
    let h = s[0];
    println!("{h}");
}`,
          options: [
            { t: 'No: a string cannot be indexed with a single number', ok: true, why: "The compiler reports `E0277`: `str` cannot be indexed by an integer. Write `s.as_bytes()[0]` for the byte or `s.chars().next()` for the character." },
            { t: 'Yes, and it prints `h`', why: "Python, JavaScript and PHP would. Rust has no `s[i]`, because in UTF-8 it would have to be either a byte that may be half a character, or a slow walk from the start." },
            { t: 'Yes, and it prints `104`', why: "That is the byte, which is what C and Go give you. Rust makes you ask for it by name: `s.as_bytes()[0]`." },
            { t: 'No, but `&s[0]` would compile', why: "Borrowing does not help: a single number is still not an accepted index. A range is, so `&s[0..1]` compiles, and gives a `&str`." },
          ],
          verify: 'E0277',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let s = "héllo wörld";
    let a = &s[..6];
    let b = &s[7..];
    println!("[{a}] [{b}] {}", b.len());
}`,
          answer: '[héllo] [wörld] 6',
          explain: "Ranges count bytes. `é` takes bytes 1 and 2, so the first six bytes are `héllo`, and byte 6 is the space. `wörld` is five characters in six bytes, because of the `ö`.",
          hint: "Number the bytes. `é` and `ö` take two each.",
        },
        {
          kind: 'multi',
          q: 'Given `let s = String::from("  Hello  ");`, which of these allocate a new buffer on the heap?',
          options: [
            { t: '`s.trim()`', why: "It returns a `&str` that points into the buffer of `s`, past the leading spaces." },
            { t: '`s.to_uppercase()`', ok: true, why: "The upper-case text is new, so it needs a buffer of its own. The return type, `String`, says so." },
            { t: '`s.clone()`', ok: true, why: "A clone is a second buffer holding a copy of the bytes." },
            { t: '`&s[2..7]`', why: "A range gives a view: a pointer and a length." },
            { t: '`s.replace("l", "L")`', ok: true, why: "It builds the replaced text in a new `String` and leaves `s` alone." },
            { t: '`s.split(\' \')`', why: "It returns an iterator, and each piece it hands out is a `&str` into `s`." },
            { t: '`format!("{s}!")`', ok: true, why: "`format!` borrows `s` and writes the result into a new `String`." },
          ],
          hint: "Four of them allocate. Look at what each one returns.",
        },
        {
          kind: 'multi',
          q: 'Given `let owned = String::from("hi");`, which of these can be passed to `fn show(text: &str)`?',
          options: [
            { t: '`"hi"`', ok: true, why: "A literal is a `&str`." },
            { t: '`&owned`', ok: true, why: "A `&String` converts to a `&str` automatically." },
            { t: '`&owned[..1]`', ok: true, why: "A range of a `String` is already a `&str`." },
            { t: '`owned.as_str()`', ok: true, why: "It is the same borrow as `&owned`, spelled out." },
            { t: '`owned`', why: "That passes the `String` itself, by value. Nothing borrows for you: the compiler reports `E0308` and suggests `&owned`." },
            { t: "`'h'`", why: "Single quotes make a `char`, which is a different type from a one-character `&str`. Python, PHP and JavaScript do not have that distinction." },
          ],
          hint: "Four of them are borrowed text.",
        },
        {
          q: 'What happens when this program is built and run?',
          code: rs`fn main() {
    let s = String::from("añb");
    let part = &s[0..2];
    println!("{part}");
}`,
          options: [
            { t: 'It panics: byte 2 is not a character boundary', ok: true, why: "`a` is byte 0 and `ñ` is bytes 1 and 2, so the range ends in the middle of `ñ`. The check happens at run time, and the program stops." },
            { t: 'It prints `añ`', why: "It would if ranges counted characters, as `s[0:2]` does in Python. In Rust the numbers are byte positions." },
            { t: 'It prints `a` followed by a broken character', why: "PHP's `substr` does that, and JavaScript can cut a character in half in the same way. A `&str` is guaranteed to be valid UTF-8, so Rust refuses to make this one." },
            { t: 'It does not compile', why: "The compiler does not know what the text holds at run time. Slicing with a range is allowed, and the boundaries are checked when it happens." },
          ],
          verify: 'panics',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn main() {
    let s1 = String::from("tic");
    let s2 = String::from("tac");
    let s3 = s1 + &s2;
    println!("{s1} {s2} {s3}");
}`,
          options: [
            { t: 'No: `s1` was moved by `+` and cannot be used on line 5', ok: true, why: "`+` takes its left side by value, appends to its buffer and returns it as the result. The buffer that was `s1` now belongs to `s3`, and the compiler reports `E0382`." },
            { t: 'Yes, and it prints `tic tac tictac`', why: "In Python, PHP and JavaScript, joining two strings builds a third and leaves both alone. `format!(\"{s1}{s2}\")` behaves like that. `+` does not." },
            { t: 'No: `s2` was moved by `+`', why: "The `&` borrowed `s2`, and the borrow ended when the addition did. `s2` is still usable. It is the left side that moves." },
            { t: 'No: `+` is not defined for strings', why: "It is defined for a `String` on the left and a `&str` on the right, which is what line 4 has." },
          ],
          verify: 'E0382',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn main() {
    let line = " a, b ,c ";
    for part in line.trim().split(',') {
        print!("[{part}]");
    }
    println!();
}`,
          answer: '[a][ b ][c]',
          explain: "`trim` removes the spaces at the two ends of the whole line, giving `a, b ,c`. `split` then cuts at each comma and keeps everything between them, spaces included. To clean each piece, call `part.trim()` inside the loop.",
          hint: "`trim` only touches the two ends of the text it is called on.",
        },
      ],
      challenges: [
        {
          id: 'count-chars',
          title: 'Count one character',
          level: 'warm-up',
          prompt: "Return how many times the character `wanted` appears in `text`. Upper and lower case are different characters. The starter walks the text a character at a time and counts nothing.",
          signature: 'fn count_chars(text: &str, wanted: char) -> usize',
          starter: rs`fn count_chars(text: &str, wanted: char) -> usize {
    let mut count = 0;
    for c in text.chars() {
        // c is a char: one character of the text, however many bytes it takes.
    }
    count
}`,
          hints: [
            "Two `char` values are compared with `==`.",
            "`if c == wanted { count += 1; }`",
          ],
          solution: rs`fn count_chars(text: &str, wanted: char) -> usize {
    let mut count = 0;
    for c in text.chars() {
        if c == wanted {
            count += 1;
        }
    }
    count
}`,
          solutionNote: "With the iterator methods of lesson 18 this is `text.chars().filter(|c| *c == wanted).count()`.",
          tests: [
            { label: 'Counts a letter in an ASCII word', body: rs`assert_eq!(count_chars("banana", 'a'), 3);
assert_eq!(count_chars("banana", 'n'), 2);` },
            { label: 'Returns 0 when the character is absent, or the text is empty', body: rs`assert_eq!(count_chars("banana", 'x'), 0);
assert_eq!(count_chars("", 'a'), 0);` },
            { label: 'Treats upper and lower case as different', body: rs`assert_eq!(count_chars("Anna", 'a'), 1);` },
            { label: 'Counts characters that take several bytes', body: rs`assert_eq!(count_chars("été à la crème brûlée", 'é'), 3);
assert_eq!(count_chars("🦀a🦀b🦀", '🦀'), 3);` },
          ],
        },
        {
          id: 'shout',
          title: 'Shout it',
          level: 'warm-up',
          prompt: [
            "Return the text in upper case, with an exclamation mark added at the end. The result is new text, so the function returns a `String`.",
            "The starter makes a `String` holding a copy of the text and returns it as it is.",
          ],
          signature: 'fn shout(text: &str) -> String',
          starter: rs`fn shout(text: &str) -> String {
    let loud = text.to_string();
    loud
}`,
          hints: [
            "`text.to_uppercase()` returns a new `String` in upper case.",
            "A `String` declared `mut` can be extended: `loud.push('!')`.",
            "`let mut loud = text.to_uppercase();`, then `loud.push('!');`, then `loud`. In one line: `format!(\"{}!\", text.to_uppercase())`.",
          ],
          solution: rs`fn shout(text: &str) -> String {
    let mut loud = text.to_uppercase();
    loud.push('!');
    loud
}`,
          tests: [
            { label: 'Raises the case and adds the mark', body: rs`assert_eq!(shout("hello"), "HELLO!");` },
            { label: 'Leaves digits and punctuation alone', body: rs`assert_eq!(shout("stop, 2 3"), "STOP, 2 3!");` },
            { label: 'Handles letters outside ASCII', body: rs`assert_eq!(shout("café"), "CAFÉ!");` },
            { label: 'An empty text becomes a lone mark', body: rs`assert_eq!(shout(""), "!");` },
            { label: 'The caller keeps the original text', body: rs`let quiet = String::from("psst");
let loud = shout(&quiet);
assert_eq!(quiet, "psst");
assert_eq!(loud, "PSST!");` },
          ],
        },
        {
          id: 'first-word',
          title: 'The first word, as a view',
          level: 'core',
          track: true,
          prompt: [
            "Return the first word of the text: skip any whitespace at the start, and stop before the next whitespace character. If there is no word, return an empty `&str`.",
            "The result must be a part of the input. The tests count allocations, and this function should make none.",
          ],
          signature: 'fn first_word(text: &str) -> &str',
          starter: rs`fn first_word(text: &str) -> &str {
    // Skip the whitespace at the start, then find where the word ends.
    text
}`,
          hints: [
            "`text.trim_start()` is a view of the text without its leading whitespace. It allocates nothing.",
            "Walk what is left with `char_indices()`. The first character for which `c.is_whitespace()` is true marks the end of the word, and its index is a byte position you can slice at.",
            "Inside the loop: `if c.is_whitespace() { return &text[..index]; }`. If the loop finishes, the whole of what is left is the word.",
          ],
          solution: rs`fn first_word(text: &str) -> &str {
    let text = text.trim_start();
    for (index, c) in text.char_indices() {
        if c.is_whitespace() {
            return &text[..index];
        }
    }
    text
}`,
          solutionNote: "The toolbox has this ready-made: `text.split_whitespace().next()` is an `Option` holding the first word, and `unwrap_or(\"\")` supplies the empty answer. Lesson 13 covers `unwrap_or`.",
          tests: [
            { label: 'Returns the word before the first space', body: rs`assert_eq!(first_word("hello world"), "hello");` },
            { label: 'Skips whitespace at the start', body: rs`assert_eq!(first_word("   two words"), "two");
assert_eq!(first_word("\t\n tabbed line"), "tabbed");` },
            { label: 'A single word is returned whole', body: rs`assert_eq!(first_word("alone"), "alone");
assert_eq!(first_word("alone   "), "alone");` },
            { label: 'Empty or blank text has no first word', body: rs`assert_eq!(first_word(""), "");
assert_eq!(first_word("    "), "");` },
            { label: 'Works on text outside ASCII', body: rs`assert_eq!(first_word("über cool"), "über");
assert_eq!(first_word(" 日本語 のテキスト"), "日本語");` },
            { label: 'Allocates nothing, and the result points into the input', body: rs`let text = String::from("  gamma delta");
let before = allocation_count();
let word = first_word(&text);
assert_eq!(allocation_count() - before, 0, "first_word must not allocate");
assert_eq!(word, "gamma");
assert!(std::ptr::eq(word.as_ptr(), text[2..].as_ptr()), "the result must be a part of the input");` },
          ],
        },
        {
          id: 'is-palindrome',
          title: 'Palindromes in any alphabet',
          level: 'core',
          prompt: [
            "Return `true` when the text reads the same in both directions, ignoring case and ignoring every character that is not a letter or a digit. So `A man, a plan, a canal: Panama` is a palindrome. A text with no letters or digits at all counts as one too.",
            "The starter compares bytes from the two ends. It is right for a lower-case ASCII word and wrong for everything else.",
          ],
          signature: 'fn is_palindrome(text: &str) -> bool',
          starter: rs`fn is_palindrome(text: &str) -> bool {
    let bytes = text.as_bytes();
    let n = bytes.len();
    for i in 0..n / 2 {
        if bytes[i] != bytes[n - 1 - i] {
            return false;
        }
    }
    true
}`,
          hints: [
            "Bytes are the wrong unit: the two bytes of `é` read backwards are not an `é`. Collect the characters you care about first, then compare those.",
            "`text.to_lowercase()` deals with case. Walk its `chars()`, and push each one for which `c.is_alphanumeric()` is true onto a `Vec` made with `Vec::new()`.",
            "A `Vec<char>` can be indexed, so the starter's loop works on it unchanged: compare `letters[i]` with `letters[n - 1 - i]`.",
          ],
          solution: rs`fn is_palindrome(text: &str) -> bool {
    let mut letters = Vec::new();
    for c in text.to_lowercase().chars() {
        if c.is_alphanumeric() {
            letters.push(c);
        }
    }
    let n = letters.len();
    for i in 0..n / 2 {
        if letters[i] != letters[n - 1 - i] {
            return false;
        }
    }
    true
}`,
          solutionNote: "A `Vec<char>` spends four bytes on each character to buy indexing, which is the trade Python makes for every string. Lesson 18 shows how to compare the characters from both ends without storing them.",
          tests: [
            { label: 'Accepts a lower-case palindrome and rejects a near miss', body: rs`assert!(is_palindrome("level"));
assert!(!is_palindrome("lever"));` },
            { label: 'Ignores case', body: rs`assert!(is_palindrome("Racecar"));` },
            { label: 'Ignores spaces and punctuation', body: rs`assert!(is_palindrome("A man, a plan, a canal: Panama"));
assert!(!is_palindrome("A man, a plan, a canoe: Panama"));` },
            { label: 'Compares characters, not bytes', body: rs`assert!(is_palindrome("été"));
assert!(is_palindrome("Été"));
assert!(is_palindrome("たけやぶやけた"));
assert!(!is_palindrome("日本"));` },
            { label: 'Accepts text with nothing to compare', body: rs`assert!(is_palindrome(""));
assert!(is_palindrome("?!"));
assert!(is_palindrome("x"));` },
          ],
        },
        {
          id: 'char-boundary',
          title: 'Cut on a character',
          level: 'core',
          kind: 'fix',
          prompt: [
            "`truncate_chars` returns at most the first `max` characters of the text, as a view of it. A user interface would call it to shorten a name that is too long for its column.",
            "The starter treats `max` as a number of bytes. That is right for ASCII. For other text it returns too little, or panics by cutting a character in two. Make it count characters.",
          ],
          signature: 'fn truncate_chars(text: &str, max: usize) -> &str',
          starter: rs`fn truncate_chars(text: &str, max: usize) -> &str {
    if text.len() <= max {
        text
    } else {
        &text[..max]
    }
}`,
          hints: [
            "You need the byte position where character number `max` starts. Everything before that position is the first `max` characters.",
            "`text.char_indices().nth(max)` is an `Option`. It is `Some((index, c))` when the text has more than `max` characters, and `None` when it does not.",
            "`match text.char_indices().nth(max) { Some((index, _)) => &text[..index], None => text }`",
          ],
          solution: rs`fn truncate_chars(text: &str, max: usize) -> &str {
    match text.char_indices().nth(max) {
        Some((index, _)) => &text[..index],
        None => text,
    }
}`,
          tests: [
            { label: 'Shortens ASCII text', body: rs`assert_eq!(truncate_chars("hello world", 5), "hello");` },
            { label: 'Leaves text alone when it is short enough', body: rs`assert_eq!(truncate_chars("hi", 5), "hi");
assert_eq!(truncate_chars("hello", 5), "hello");` },
            { label: 'Does not cut a two-byte character in half', body: rs`assert_eq!(truncate_chars("héllo", 2), "hé");` },
            { label: 'Counts characters, not bytes', body: rs`assert_eq!(truncate_chars("日本語のテキスト", 3), "日本語");
assert_eq!(truncate_chars("🦀🦀🦀", 1), "🦀");` },
            { label: 'Keeps the whole text when it has exactly max characters', body: rs`assert_eq!(truncate_chars("日本", 2), "日本");` },
            { label: 'A limit of zero gives an empty view of the input', body: rs`let text = String::from("añil");
let cut = truncate_chars(&text, 0);
assert_eq!(cut, "");
assert!(std::ptr::eq(cut.as_ptr(), text.as_ptr()), "the result must be a part of the input");` },
          ],
        },
        {
          id: 'common-prefix',
          title: 'The shared beginning',
          level: 'stretch',
          track: true,
          prompt: [
            "Return the longest beginning that `a` and `b` have in common, as a view of `a`. For `interstellar` and `internet` that is `inter`. The tests count allocations, and this function should make none.",
            "The signature has a notation you have not met. With two `&str` parameters, the compiler cannot tell which of them the result borrows from, so the signature has to say. The `'a` marks tie the result to the first parameter. Lesson 10 is about this notation. Leave the signature as it is.",
            "Compare characters, not bytes. `ñ` and `ò` are different characters whose encodings start with the same byte.",
          ],
          signature: "fn common_prefix<'a>(a: &'a str, b: &str) -> &'a str",
          starter: rs`fn common_prefix<'a>(a: &'a str, b: &str) -> &'a str {
    // Walk both texts a character at a time. Return the part of a before the first difference.
    let _ = b;
    &a[..0]
}`,
          hints: [
            "Walk `a` with `char_indices()`, so that you have a byte position to cut at when the texts part ways.",
            "Keep an iterator over the other text beside the loop: `let mut others = b.chars();`. Each call to `others.next()` gives `Some(c)` with the next character of `b`, or `None` when `b` has run out.",
            "Inside the loop: `if others.next() != Some(c) { return &a[..index]; }`. That covers a different character and the end of `b` in one test. If the loop finishes, all of `a` is the prefix.",
          ],
          solution: rs`fn common_prefix<'a>(a: &'a str, b: &str) -> &'a str {
    let mut others = b.chars();
    for (index, c) in a.char_indices() {
        if others.next() != Some(c) {
            return &a[..index];
        }
    }
    a
}`,
          tests: [
            { label: 'Finds a shared beginning', body: rs`assert_eq!(common_prefix("interstellar", "internet"), "inter");` },
            { label: 'One text is the beginning of the other', body: rs`assert_eq!(common_prefix("car", "carpet"), "car");
assert_eq!(common_prefix("carpet", "car"), "car");
assert_eq!(common_prefix("same", "same"), "same");` },
            { label: 'Texts with nothing in common share an empty beginning', body: rs`assert_eq!(common_prefix("abc", "xyz"), "");
assert_eq!(common_prefix("", "abc"), "");
assert_eq!(common_prefix("abc", ""), "");` },
            { label: 'Stops before two characters that share a first byte', body: rs`assert_eq!(common_prefix("año", "aòo"), "a");
assert_eq!(common_prefix("日本", "日曜"), "日");` },
            { label: 'Shares whole characters outside ASCII', body: rs`assert_eq!(common_prefix("naïve", "naïf"), "naï");
assert_eq!(common_prefix("🦀🦀x", "🦀🦀y"), "🦀🦀");` },
            { label: 'Allocates nothing, and the result is a view of a', body: rs`let a = String::from("prefix-one");
let b = String::from("prefix-two");
let before = allocation_count();
let shared = common_prefix(&a, &b);
assert_eq!(allocation_count() - before, 0, "common_prefix must not allocate");
assert_eq!(shared, "prefix-");
assert!(std::ptr::eq(shared.as_ptr(), a.as_ptr()), "the result must point into a");` },
          ],
        },
      ],
    },

    {
      id: 'lifetimes',
      title: 'Lifetimes',
      category: part,
      minutes: 40,
      summary: 'Every reference is valid for a stretch of the program, and the compiler checks that it is never used beyond it. This lesson covers the notation that describes those stretches in a signature, and what to do when no annotation can help.',
      topics: ['Lifetimes', 'Annotations', 'Elision', 'Structs with references', "'static", 'Owned or borrowed'],
      sections: [
        {
          title: 'Every reference has a lifetime',
          body: [
            "Lesson 6 gave the rule in one line: a reference must not outlive the value it points to. This lesson is about how the compiler checks that rule, and about the notation you write when it cannot check it alone.",
            "Every reference is in use for some stretch of the program, from the point where it is created to the last point where it is used. That stretch is called its **lifetime**. Every value has a stretch of its own: it is alive from its `let` until its owner goes out of scope. The check is a comparison of the two. The lifetime of a reference has to fit inside the life of the value it borrows from.",
            { run: rs`fn main() {
    let view;
    {
        let text = String::from("short-lived");
        view = &text[..5];
    }                         // text is freed here
    println!("{view}");       // and view is used here
}`, name: 'outlives.rs', fails: 'E0597' },
            { borrows: {
              title: 'The reference is used after its owner is gone',
              code: rs`fn main() {
    let view;
    {
        let text = String::from("short-lived");
        view = &text[..5];
    }
    println!("{view}");
}`,
              spans: [
                { name: 'text', kind: 'owner', from: 4, to: 6 },
                { name: 'view', kind: 'shared', from: 5, to: 7 },
              ],
              marks: [{ line: 7, label: '`view` is used here, and `text` was freed by the closing brace on line 6.' }],
              caption: "The bar of a reference has to end no later than the bar of its owner. This one runs a line too far.",
            } },
            "If this program were allowed to run, line 7 would read five bytes from a heap buffer that was freed on line 6. Lesson 6 traced that bug step by step. The fix here is to finish with the reference while its owner is still alive:",
            { run: rs`fn main() {
    let view;
    {
        let text = String::from("short-lived");
        view = &text[..5];
        println!("{view}");   // the last use of view: its lifetime ends here
    }                         // text is freed here, one line later
}`, name: 'fits.rs', expect: 'short\n' },
            "Three facts about lifetimes are worth fixing in your mind before the notation arrives.",
            { list: [
              "**The compiler works them out.** A lifetime follows from where a reference is created and where it is last used. You do not set one, and you cannot lengthen one by writing something.",
              "**They exist only while compiling.** At run time a reference is an address, plus a length for a slice. Nothing in the running program records how long it is valid, and nothing checks.",
              "**Inside one function, no help is needed.** The compiler sees every reference being made and every use of it. Every program in lessons 6 to 9 passed this check without a word from you.",
            ] },
            { compare: "In Python, PHP and JavaScript this question cannot come up, because a reference keeps its target alive. An object survives for as long as anything can reach it, and the runtime pays for that with reference counts or a garbage collector. A Rust reference keeps nothing alive. The value is freed when its owner goes out of scope, on schedule, and the compiler proves beforehand that no reference is used after that." },
            { fromC: "This is the C lesson on pointers that outlive what they point to: the address of a local returned from its function, a pointer used after `free`. C leaves those to your care, and to tools such as AddressSanitizer that catch them while the program runs. Rust finds them at compile time, and lifetimes are how." },
          ],
        },
        {
          title: 'When the compiler asks for help',
          body: [
            "The compiler checks one function at a time. Lesson 3 said that a call is checked against the signature of the function being called, and never against its body. For a function that returns a reference, that leaves a question which the signature has to answer: what does the result borrow from?",
            "Here is a function that returns the longer of two pieces of text.",
            { run: rs`fn longest(a: &str, b: &str) -> &str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let first = String::from("lifetime");
    let second = String::from("borrow");
    println!("{}", longest(&first, &second));
}`, name: 'longest.rs', fails: 'E0106' },
            "The body is fine. It returns one of its two arguments, and both are valid references. The complaint is about the signature, and the `help:` text says exactly what is missing: the return type contains a borrowed value, but the signature does not say whether it is borrowed from `a` or from `b`.",
            "To see why that matters, stand where a caller stands.",
            { code: rs`let result = longest(&first, &second);
drop(second);                // is this allowed?
println!("{result}");` },
            "If `result` points into `first`, this is fine. If it points into `second`, the last line reads freed memory. Which of the two it is depends on the lengths of two strings when the program runs. The compiler needs an answer that holds for every call, and the only place it looks for one is the signature.",
            "With one reference coming in, the answer is obvious, which is why `fn extension(filename: &str) -> &str` in lesson 9 needed nothing extra. With two, you have to say.",
          ],
        },
        {
          title: 'Lifetime annotations',
          body: [
            "The fix is the one the compiler printed.",
            { run: rs`fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let first = String::from("lifetime");
    let second = String::from("borrow");
    let result = longest(&first, &second);
    println!("{result}");
}`, name: 'annotated.rs', expect: 'lifetime\n' },
            { list: [
              "`<'a>` after the function's name declares a **lifetime parameter**. Its name starts with an apostrophe and is usually a single lower-case letter. The loop labels of lesson 3 are written the same way and have nothing to do with it.",
              "`&'a str` is read as \"a reference to a `str` that is valid for at least `'a`\". A mutable one is written `&'a mut String`.",
              "Using the same `'a` in three places is the point: it links the two parameters and the result.",
            ] },
            "Read the whole signature like this. There is some stretch of the program, call it `'a`. Both arguments are valid for all of it, and the result is valid for it and no longer. You never say what `'a` is. At each call the compiler picks it: the longest stretch for which both arguments are valid, which is where their lives overlap. In practice the argument that dies first sets the limit.",
            "So for a caller, the signature of `longest` means one thing: the result may be used only while both arguments are still alive.",
            { run: rs`fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let first = String::from("lifetime");
    let result;
    {
        let second = String::from("borrow");
        result = longest(&first, &second);
    }                                   // second is freed here
    println!("{result}");               // result may point into second
}`, name: 'shorter.rs', fails: 'E0597' },
            { borrows: {
              title: 'The result is tied to both arguments',
              code: rs`fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let first = String::from("lifetime");
    let result;
    {
        let second = String::from("borrow");
        result = longest(&first, &second);
    }
    println!("{result}");
}`,
              spans: [
                { name: 'first', kind: 'owner', from: 6, to: 13 },
                { name: 'second', kind: 'owner', from: 9, to: 11 },
                { name: 'result', kind: 'shared', from: 10, to: 12 },
              ],
              marks: [{ line: 12, label: '`result` may borrow from `second`, and the bar of `second` ended on line 11.' }],
              caption: "The signature says the result borrows from both arguments, so the bar of `result` has to fit inside the bars of both owners. It fits inside `first` and not inside `second`.",
            } },
            "When this program runs, `result` would point into `first`, which is still alive on line 12. The program is rejected all the same. The compiler does not run `longest`, and it does not read the body of `longest` while it checks `main`. The signature says the result may borrow from either argument, so both must outlive it.",
            "That strictness buys something. The body of `longest` can be rewritten tomorrow to prefer the shorter text, and no caller will start reading freed memory because of it. As long as the signature stays the same, every call that compiled still compiles and is still safe.",
            "**An annotation describes. It does not extend.** Writing `'a` never makes a value live longer, and it produces no code. It states how the lifetimes of the inputs and the output are related, and the compiler holds both sides to that statement. Callers must keep the arguments alive while they use the result, which is the error above. And the body must return something that really is valid for `'a`:",
            { run: rs`fn joined<'a>(a: &'a str, b: &'a str) -> &'a str {
    let both = format!("{a}{b}");     // a new String, owned by this function
    &both                             // claimed to be valid for 'a, and freed at the closing brace
}

fn main() {
    println!("{}", joined("life", "time"));
}`, name: 'joined.rs', fails: 'E0515' },
            "The signature promises a result that lives as long as the arguments do. `both` lives until the closing brace, and no annotation changes that. This is the `E0515` you met in lesson 9, and the last section of this lesson lists the ways out.",
            { compare: "A lifetime parameter is a generic parameter, and TypeScript's generics are the closest thing you know. `function longest<T>(a: T, b: T): T` uses one `T` in three places to say that three types are the same, without saying what `T` is, and each call fills it in. `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str` does that for validity instead of type: one `'a` in three places, filled in at each call. Python and PHP have no counterpart. The nearest thing is a sentence in the documentation: the returned view is only valid while the buffer is." },
            { fromC: "C programmers write this information as comments in header files. `strchr` returns a pointer into the string it was given. `getenv` returns a pointer you must not free. The result of `asctime` is overwritten by the next call. A lifetime annotation is that comment moved into the signature, where the compiler checks the function against it, and every caller too." },
          ],
        },
        {
          title: 'Elision: why you rarely write them',
          body: [
            "If every function that returns a reference needed annotations, lessons 8 and 9 would have been full of them. `fn first_n(values: &[i32], n: usize) -> &[i32]` and `fn extension(filename: &str) -> &str` have lifetime parameters too. The compiler filled them in, by three fixed rules known as the **elision rules**.",
            { steps: [
              "Each reference among the parameters gets a lifetime parameter of its own.",
              "If that makes exactly one lifetime among the parameters, every reference in the result gets it.",
              "If one of the parameters is `&self` or `&mut self`, every reference in the result gets the lifetime of `self`. This is the rule for methods, which lesson 11 introduces.",
            ] },
            "If a reference in the result still has no lifetime after the three rules, the compiler stops and asks, with `E0106`.",
            { table: {
              head: ['You write', 'The compiler reads', 'Why'],
              rows: [
                ['`fn trim(text: &str) -> &str`', "`fn trim<'a>(text: &'a str) -> &'a str`", 'Rule 2: one reference comes in, so the result borrows from it.'],
                ['`fn first_n(values: &[i32], n: usize) -> &[i32]`', "`fn first_n<'a>(values: &'a [i32], n: usize) -> &'a [i32]`", '`n` is not a reference, so there is still only one lifetime.'],
                ['`fn show(a: &str, b: &str)`', "`fn show<'a, 'b>(a: &'a str, b: &'b str)`", 'Rule 1. Nothing is returned, so there is nothing to link.'],
                ['`fn longest(a: &str, b: &str) -> &str`', '`E0106`', 'Two lifetimes come in, and no rule chooses between them.'],
                ['`fn make() -> &str`', '`E0106`', 'No reference comes in, so there is nothing for the result to borrow from.'],
              ],
            } },
            "The two functions below are the same function. The first is what you write, and the second is what the compiler reads.",
            { run: rs`fn first_word(text: &str) -> &str {
    match text.find(' ') {
        Some(end) => &text[..end],
        None => text,
    }
}

fn first_word_in_full<'a>(text: &'a str) -> &'a str {
    match text.find(' ') {
        Some(end) => &text[..end],
        None => text,
    }
}

fn main() {
    let title = String::from("field manual");
    println!("{} {}", first_word(&title), first_word_in_full(&title));
}`, name: 'elided.rs', expect: 'field field\n' },
            "The rules look at the signature and nothing else. They are not inference: the compiler does not read the body to find out where the result really comes from. That keeps a signature meaningful by itself. It also means the rules are sometimes stricter than the body needs, as section 7 shows.",
            { native: "rust-analyzer can show the lifetimes that elision filled in, as gray hints inside the signature. The setting is called lifetime elision hints. Clippy works from the other side: its `needless_lifetimes` lint flags annotations that the rules would have supplied anyway, so that the ones left in your code are the ones that say something." },
          ],
        },
        {
          title: 'Different lifetimes for different inputs',
          body: [
            "`longest` gave both parameters the same `'a` because its result can come from either. When the result can only come from one of them, give `'a` to that one alone.",
            { run: rs`// The result is a part of text. It never points into marker.
fn after<'a>(text: &'a str, marker: &str) -> &'a str {
    match text.find(marker) {
        Some(at) => &text[at + marker.len()..],
        None => "",
    }
}

fn main() {
    let line = String::from("level=warn msg=disk almost full");
    let message;
    {
        let marker = String::from("msg=");
        message = after(&line, &marker);
    }                                // marker is freed here, and nothing borrows from it
    println!("{message}");
}`, name: 'after.rs', expect: 'disk almost full\n' },
            { borrows: {
              title: 'The result is tied to the first argument only',
              code: rs`// The result is a part of text. It never points into marker.
fn after<'a>(text: &'a str, marker: &str) -> &'a str {
    match text.find(marker) {
        Some(at) => &text[at + marker.len()..],
        None => "",
    }
}

fn main() {
    let line = String::from("level=warn msg=disk almost full");
    let message;
    {
        let marker = String::from("msg=");
        message = after(&line, &marker);
    }
    println!("{message}");
}`,
              spans: [
                { name: 'line', kind: 'owner', from: 10, to: 17 },
                { name: 'marker', kind: 'owner', from: 13, to: 15 },
                { name: 'message', kind: 'shared', from: 14, to: 16 },
              ],
              marks: [{ line: 15, label: '`marker` is freed while `message` is still in use. The signature says `message` does not borrow from it.', ok: true }],
              caption: "The same shape of program as the last figure, and this time it is accepted. The bar of `message` only has to fit inside the bar of `line`.",
            } },
            "`marker` has no named lifetime. By rule 1 it gets one of its own, unrelated to `'a`, so the compiler knows the result has nothing to do with it. The caller is free to drop the marker, change it or reuse it while still holding the result. Had the signature used `'a` for both parameters, this `main` would be rejected with the `E0597` of section 3, for no reason the body could justify. A signature should promise as little as the body needs. Challenge 4 has you repair one that promises too much.",
            "The compiler checks the body against the signature as well. Suppose the function is changed to return the marker itself when the text does not contain it:",
            { run: rs`fn after_or_marker<'a, 'b>(text: &'a str, marker: &'b str) -> &'a str {
    match text.find(marker) {
        Some(at) => &text[at + marker.len()..],
        None => marker,                  // not a part of text
    }
}

fn main() {
    println!("{}", after_or_marker("msg=hello", "msg="));
}`, name: 'wrong_source.rs', fails: 'lifetime may not live long enough' },
            "The second lifetime has a name here, `'b`, so that the message can refer to it. The function promised data that is valid for `'a`, one arm returns data that is valid for `'b`, and nothing says that `'b` lasts as long as `'a`. This error has no code. The bound the compiler suggests, `'b: 'a`, is read \"`'b` outlives `'a`\" and would make the function compile.",
            "The plainer fix is to be honest in the signature. The result can now come from either parameter, so both get `'a`, as in `longest`. Callers lose the freedom shown in the figure, because the function no longer deserves it.",
            "Name a second lifetime when there is a second relationship to describe: a function that returns two references from two different sources, for example. A parameter that has nothing to do with the result needs no name at all.",
          ],
        },
        {
          title: 'Structs that hold references',
          body: [
            "So far, references have lived in local variables and passed through functions. They can also be stored inside a value of a type of your own. A **struct** is a type you define by naming its fields, and lesson 11 covers structs in full. This section needs only three things: a definition, a value built with `Name { field: value }`, and a field read with a dot.",
            "A struct that holds a reference must not outlive what the reference points to, so the struct's type carries a lifetime parameter. There is no elision for fields:",
            { run: rs`struct Hit {
    line: usize,
    text: &str,
}

fn main() {
    let document = String::from("one fish\ntwo fish");
    let hit = Hit { line: 1, text: &document[..8] };
    println!("line {}: {}", hit.line, hit.text);
}`, name: 'field.rs', fails: 'E0106' },
            "Declare the lifetime after the struct's name, and use it in the field:",
            { run: rs`struct Hit<'a> {
    line: usize,        // a plain number
    text: &'a str,      // a view of one line of the document that was searched
}

// Finds the first line that contains word.
fn search<'a>(document: &'a str, word: &str) -> Option<Hit<'a>> {
    let mut number = 0;
    for found in document.lines() {
        number += 1;
        if found.contains(word) {
            return Some(Hit { line: number, text: found });
        }
    }
    None
}

fn main() {
    let document = String::from("one fish\ntwo fish\nred fish\nblue fish");

    if let Some(hit) = search(&document, "red") {
        println!("line {}: {}", hit.line, hit.text);
    }
    match search(&document, "green") {
        Some(hit) => println!("line {}: {}", hit.line, hit.text),
        None => println!("no green fish"),
    }
}`, name: 'hit.rs', expect: 'line 3: red fish\nno green fish\n' },
            "`Hit<'a>` is read as \"a `Hit` that borrows from something valid for `'a`\". The signature of `search` says that the `Hit` it returns borrows from `document` and not from `word`. From there on a `Hit` is an ordinary value: it can be stored, passed along and returned. The compiler tracks the borrow inside it wherever it goes, and rejects any use of a `Hit` after the document it looks into has been freed. Question 3 puts that to the test.",
            "The `'a` of a `Hit<'a>` belongs to the document, not to the `Hit`. A reference copied out of a `Hit` stays valid after the `Hit` itself is gone:",
            { run: rs`struct Hit<'a> {
    line: usize,
    text: &'a str,
}

fn main() {
    let document = String::from("one fish\ntwo fish");

    let text;
    {
        let hit = Hit { line: 2, text: &document[9..] };
        println!("line {}", hit.line);
        text = hit.text;          // a copy of the reference that hit holds
    }                             // hit is gone. document is not.
    println!("{text}");
}`, name: 'outlives_the_struct.rs', expect: 'line 2\ntwo fish\n' },
            "Where a type with a lifetime parameter appears in a signature that elision can handle, write `'_` in its place, as in `Hit<'_>`. It means that a lifetime goes here and the usual rules say which. This program leaves it out. Run it and read the warning, then add `<'_>` after `Hit` on line 6 and run it again.",
            { run: rs`struct Hit<'a> {
    line: usize,
    text: &'a str,
}

fn first_line(document: &str) -> Hit {
    Hit { line: 1, text: document.lines().next().unwrap_or("") }
}

fn main() {
    let hit = first_line("one fish\ntwo fish");
    println!("line {}: {}", hit.line, hit.text);
}`, name: 'hidden.rs', warns: true, expect: 'line 1: one fish\n' },
            "The warning exists because a bare `Hit` in a signature hides the fact that something is being borrowed. `unwrap_or(\"\")` takes the value out of an `Option`, or the empty text if there is none. Lesson 13 covers it.",
            { compare: "An object that holds a reference to another object is the everyday case in Python, PHP and JavaScript, and nobody thinks about it, because the reference keeps the other object alive. In Rust the default is the opposite. A struct owns its fields, and a field that borrows is the special case, marked with `<'a>` everywhere the type is named." },
            { pitfall: "A struct with a reference inside is a short-lived view: a search hit, a parser's position in its input, one row of a table that is being read. It is the wrong tool for data that has to stay around. If a struct is kept in a collection, returned up through several functions or held between requests, give it `String` fields and let it own its text. A sign that you chose wrong is `<'a>` spreading to every type and function that touches the struct." },
          ],
        },
        {
          title: "'static, and why adding it is rarely the fix",
          body: [
            "One lifetime has a name of its own. `'static` is the whole run of the program. A `&'static str` is a reference to text that is never freed, and every string literal is one, because its bytes are part of the program, as lesson 9 showed.",
            "You write `'static` in a signature when a function hands out such data and the elision rules would say something stricter. This function returns one of three literals. By rule 2, its result is tied to `code`:",
            { run: rs`fn language(code: &str) -> &str {
    match code {
        "nl" => "Dutch",
        "pt" => "Portuguese",
        _ => "unknown",
    }
}

fn main() {
    let name;
    {
        let code = String::from("pt");
        name = language(&code);
    }
    println!("{name}");
}`, name: 'too_strict.rs', fails: 'E0597' },
            "The result never points into `code`. The rules do not read the body, so they cannot know that. Say what is true, and the same `main` compiles:",
            { run: rs`fn language(code: &str) -> &'static str {
    match code {
        "nl" => "Dutch",
        "pt" => "Portuguese",
        _ => "unknown",
    }
}

fn main() {
    let name;
    {
        let code = String::from("pt");
        name = language(&code);
    }                           // code is freed, and name does not borrow from it
    println!("{name}");
}`, name: 'static_result.rs', expect: 'Portuguese\n' },
            "That is the good use of `'static`: describing data that really does live for the whole program, such as a literal or a `const`.",
            "The bad use is as a way to quiet an error. The compiler itself sometimes brings it up: its help for `E0106` on a function with no reference parameters mentions `'static`, and adds that this is uncommon. It is tempting to type it and see what happens. What happens is the next error:",
            { run: rs`fn banner(width: usize) -> &'static str {
    let line = "=".repeat(width);
    &line
}

fn main() {
    println!("{}", banner(12));
}`, name: 'static_claim.rs', fails: 'E0515' },
            "`'static` is a claim about the data, and the compiler checks it like any other. `line` is a local `String`, freed at the closing brace. The annotation did not make it immortal, because an annotation extends nothing. If you typed `'static` to make an error go away, take it out and read the next section.",
            { aside: "`'static` does not mean that the data is in static storage, and it does not mean that it cannot change. It says that nothing limits how long the value may be kept. You will meet it again as a bound on a type, written `T: 'static`, which means the type holds no reference that could expire. Lesson 23 needs that for threads, which may outlive the function that started them." },
          ],
        },
        {
          title: 'Three fixes when lifetimes fight back',
          body: [
            "Sometimes no annotation will do, because the problem is not in the notation. The data does not live where the reference needs it to. An annotation can only describe the program you wrote, so the program has to change. There are three standard moves.",
            "**Return an owned value.** When a function makes new data, hand the caller the data and not a reference to it. This is the fix for `E0515`, and lesson 9 gave the rule for text: `&str` for a part of the input, `String` for something new.",
            { run: rs`fn banner(width: usize) -> String {
    "=".repeat(width)                   // the String moves out to the caller
}

fn joined(a: &str, b: &str) -> String {
    format!("{a}{b}")
}

fn main() {
    let line = banner(12);
    println!("{line}\n{}\n{line}", joined("life", "time"));
}`, name: 'owned.rs', expect: '============\nlifetime\n============\n' },
            "Moving a `String` out copies three words, as lesson 5 showed. The allocation was needed either way, so nothing was lost by returning the owner instead of a view.",
            "**Return an index.** A position is a plain number. It borrows nothing, so it has no lifetime and can outlast anything. Lesson 8 ended on this pattern. It is the move to make when the caller wants to change the collection after finding something in it.",
            { run: rs`// Where the longest word is, as a start and an end in bytes.
fn longest_word(text: &str) -> (usize, usize) {
    let mut best = (0, 0);
    let mut start = 0;
    for word in text.split(' ') {
        let end = start + word.len();
        if word.len() > best.1 - best.0 {
            best = (start, end);
        }
        start = end + 1;                // step over the space
    }
    best
}

fn main() {
    let mut text = String::from("a quick brown fox");

    let (start, end) = longest_word(&text);       // two numbers: the borrow of text ends here
    let shouted = text[start..end].to_uppercase();
    text.replace_range(start..end, &shouted);     // so text is free to be changed
    println!("{text}");
}`, name: 'index.rs', expect: 'a QUICK brown fox\n' },
            "Had `longest_word` returned a `&str`, `text` would still be borrowed when `replace_range` asks to change it. That is the `E0502` of lesson 9, where `clear` was refused for the same reason. The price of an index is the pitfall from lesson 8: nothing ties it to the text, so keeping it correct is your job.",
            "**Make the owner live longer.** If the reference is right and the owner dies too soon, move the owner. Declare it in an enclosing scope, or one level up the call stack, so that it outlasts every use of the reference. The most common case hardly looks like a lifetime problem: a value that was never given a name.",
            { run: rs`fn main() {
    let name = String::from("  Ada  ").trim();
    println!("[{name}]");
}`, name: 'temporary.rs', fails: 'E0716' },
            "`String::from` makes a `String`, and `trim` borrows it. No variable owns that `String`, so it is freed at the semicolon, and `name` is left looking at nothing. The compiler's suggestion is the fix: give the owner a `let` of its own. The first program of this lesson is repaired in the same way, by declaring `text` outside the inner block.",
            { run: rs`fn main() {
    let padded = String::from("  Ada  ");    // the owner has a name, and lives to the end of main
    let name = padded.trim();
    println!("[{name}]");

    let text = String::from("short-lived");  // declared outside the block this time
    let view;
    {
        view = &text[..5];
    }
    println!("{view}");
}`, name: 'named_owner.rs', expect: '[Ada]\nshort\n' },
            { table: {
              head: ['The compiler says', 'It usually means', 'What to do'],
              rows: [
                ['`E0106` missing lifetime specifier', 'A signature returns a reference, and the elision rules cannot tell where from.', 'Name the parameter the result borrows from. If there is none, return an owned value.'],
                ['`E0515` cannot return reference to local variable', 'The function created the data it is trying to lend.', 'Return the owned value.'],
                ['`E0597` does not live long enough', 'The owner is freed before the last use of the reference.', 'Move the owner outward, or finish with the reference sooner.'],
                ['`E0716` temporary value dropped while borrowed', 'The owner never had a name.', 'Give it a `let`.'],
                ['lifetime may not live long enough', 'The body returns something the signature did not promise.', 'Make the signature say what the body does.'],
              ],
            } },
            { pitfall: "`clone()` and `to_string()` are the first move in disguise. They make an owned copy, and an owned value has no lifetime to argue about. That is a fine answer when the data is small or really must be owned. It is a poor reflex. Ask first whether the function should have returned a view or an index, or whether the owner is simply declared in the wrong place." },
          ],
        },
      ],
      takeaways: [
        "A lifetime is the stretch of the program in which a reference is used. It has to fit inside the life of the value it borrows from, and the check happens only at compile time.",
        "A signature that returns a reference must say what the result borrows from. `fn f<'a>(x: &'a str, y: &str) -> &'a str` ties the result to `x` and not to `y`.",
        "Annotations describe how lifetimes are related. They never make anything live longer.",
        "The elision rules fill in the common cases: one reference coming in, or a `&self`. With two candidates you choose, and you tie the result only to the parameters it can really come from.",
        "A struct that holds a reference has a lifetime parameter and cannot outlive what it borrows from. Use one for short-lived views, and owned fields for data that stays.",
        "`'static` describes data that lives for the whole program, such as a literal. It is not a way to quiet an error.",
        "When no annotation works, change the program: return an owned value, return an index, or make the owner live longer.",
      ],
      quiz: [
        {
          q: 'One of the five functions stops this program from compiling. Which?',
          code: rs`fn trim(text: &str) -> &str { text.trim() }

fn show(a: &str, b: &str) { println!("{a} {b}"); }

fn nth(values: &[i32], n: usize) -> &i32 { &values[n] }

fn count(a: &str, b: &str) -> usize { a.len() + b.len() }

fn pick(a: &str, b: &str) -> &str { if a.is_empty() { b } else { a } }

fn main() {
    show(trim(" a "), pick("", "b"));
    println!("{} {}", nth(&[1, 2, 3], 1), count("a", "b"));
}`,
          options: [
            { t: '`pick`', ok: true, why: "Two references come in and one goes out. No elision rule says which of the two the result borrows from, so the compiler reports `E0106` and asks for an annotation." },
            { t: '`trim`', why: "One reference comes in, so by the second elision rule the result borrows from it." },
            { t: '`show`', why: "Nothing is returned, so there is no result to tie to anything. Each parameter gets a lifetime of its own." },
            { t: '`nth`', why: "`n` is a plain number. Only one parameter is a reference, so the result borrows from `values`." },
            { t: '`count`', why: "The result is a number, which borrows nothing. Lifetimes matter only when a reference comes out." },
          ],
          verify: 'E0106',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() >= b.len() { a } else { b }
}

fn main() {
    let outer = String::from("outer");
    {
        let inner = String::from("in");
        let result = longest(&outer, &inner);
        println!("{result}");
    }
    println!("{outer}");
}`,
          options: [
            { t: 'Yes, and it prints `outer` twice', ok: true, why: "At the call, `'a` is chosen as a stretch for which both arguments are valid, and the inner block is one. `result` is used only inside that block, so it fits." },
            { t: 'No: `outer` and `inner` live for different lengths of time, and the signature wants the same `\'a` for both', why: "The signature does not ask for two values that live equally long. It asks for one stretch during which both are valid, and the compiler picks the part where they overlap. A reference that is valid for longer is always accepted where a shorter one would do." },
            { t: 'No: `inner` does not live long enough', why: "That is the error you would get if `result` were used after the inner block. Its last use is on line 10, where `inner` is still alive." },
            { t: 'Yes, and `result` is a copy of the longer text', why: "It compiles, and nothing is copied. `result` is a `&str` that points into the buffer of `outer`." },
          ],
          verify: 'compiles',
        },
        {
          q: 'Does this program compile?',
          code: rs`struct Parser<'a> {
    input: &'a str,
}

fn main() {
    let parser;
    {
        let source = String::from("1 + 2");
        parser = Parser { input: &source };
    }
    println!("{}", parser.input);
}`,
          options: [
            { t: 'No: `source` is freed while `parser` still borrows from it', ok: true, why: "A `Parser<'a>` holds a reference, and the compiler tracks that borrow exactly as it tracks a bare `&str`. `source` is freed on line 10 and `parser.input` is used on line 11, so it reports `E0597`." },
            { t: 'Yes, and it prints `1 + 2`, because the struct keeps the text alive', why: "An object in Python, PHP or JavaScript would, because a reference there keeps its target alive. A Rust reference keeps nothing alive, whether it sits in a variable or in a field." },
            { t: 'Yes, and it prints `1 + 2`, because the struct holds its own copy of the text', why: "The field is a `&'a str`: a pointer and a length. For the struct to own the text, the field would be a `String`." },
            { t: 'No: a variable cannot be declared on one line and given its value on another', why: "It can, as `let view;` was in the first example of the lesson. The compiler checks that it is assigned once before it is read." },
          ],
          verify: 'E0597',
        },
        {
          q: 'Does this program compile?',
          code: rs`fn label<'a>() -> &'a str {
    let text = String::from("made here");
    &text
}

fn main() {
    println!("{}", label());
}`,
          options: [
            { t: 'No: `text` is freed when `label` returns, whatever the signature says', ok: true, why: "The compiler reports `E0515`. The annotation promises the caller a reference that is valid for `'a`, and the body cannot keep the promise with a local that dies at the closing brace." },
            { t: 'Yes: `\'a` tells the compiler to keep `text` alive for as long as the caller uses the result', why: "An annotation describes how long data is valid. It never extends it. Nothing in Rust keeps a local alive after its function has returned." },
            { t: 'Yes: the text is on the heap, so it survives the return', why: "The buffer is on the heap, and its owner, `text`, is on the stack. When the owner goes out of scope the buffer is freed, as lesson 4 showed." },
            { t: 'No: a lifetime parameter has to appear in at least one parameter', why: "It does not. The signature is accepted, and a body that returned a literal would satisfy it. The error is in this body." },
          ],
          verify: 'E0515',
        },
        {
          q: "What does the signature `fn longest<'a>(a: &'a str, b: &'a str) -> &'a str` tell a caller?",
          options: [
            { t: 'The result may be used only while both arguments are still valid', ok: true, why: "The result may borrow from either argument, so the compiler makes sure that neither is freed or changed while the result is in use." },
            { t: 'The two arguments must be created in the same scope', why: "They need not be. `'a` is not the life of either argument. It is a stretch during which both are valid, and the compiler finds one at each call." },
            { t: 'Both arguments are kept alive until the result is no longer used', why: "That is how a garbage collector behaves. In Rust nothing is kept alive: if an argument would be freed too early, the program is rejected instead." },
            { t: 'The result is a new string that lives as long as the arguments', why: "No string is made. The result is one of the two references that came in, and its type says how long that reference may be used." },
          ],
        },
        {
          kind: 'multi',
          q: 'This function is rejected with `E0515`. Which of these changes would fix it?',
          code: rs`fn greeting(name: &str) -> &str {
    let text = format!("Hello, {name}");
    &text
}`,
          options: [
            { t: 'Change the return type to `String` and return `text` itself', ok: true, why: "The buffer moves out to the caller, who becomes its owner." },
            { t: 'Take a `&mut String` from the caller and append the greeting to it, returning nothing', ok: true, why: "Then the caller owns the buffer from the start, and the function only writes into it." },
            { t: "Write the signature as `fn greeting<'a>(name: &'a str) -> &'a str`", why: "That is what elision already wrote for you. It describes a result that borrows from `name`, and `text` is still a local that is freed at the closing brace." },
            { t: "Change the return type to `&'static str`", why: "`'static` claims that the data lives for the whole program. `text` lives until the function returns, so the same error comes back." },
            { t: 'Return `&text.clone()`', why: "The clone is a second `String`, owned by nobody, and freed even sooner than `text`. A reference to it cannot leave the function either." },
          ],
          hint: "Two of them. In both, something outside the function owns the text.",
        },
        {
          q: "What does the type `&'static str` say?",
          options: [
            { t: 'The text it points to is valid for the rest of the program, as a string literal is', ok: true, why: "`'static` is the lifetime that covers the whole run. A literal qualifies because its bytes are part of the program and are never freed." },
            { t: 'The text is kept alive for as long as this reference exists', why: "No reference keeps anything alive in Rust. `'static` is a statement about data that already lives forever, and the compiler rejects it for data that does not." },
            { t: 'The text keeps its value from one call to the next, like a `static` variable in C or PHP', why: "The word is shared and the meaning is not. As a lifetime, `'static` says for how long a reference is valid, and nothing about variables inside functions." },
            { t: 'The text cannot be changed', why: "No `&str` allows changes, whatever its lifetime. `'static` is about how long, not about read-only." },
          ],
        },
      ],
      challenges: [
        {
          id: 'annotate-longest',
          title: 'Say where the result comes from',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "`longer` returns whichever of two slices has more elements, and the first of them when they tie. Lifetimes are not only for text: any reference in a result has one.",
            "The body is correct. The signature does not compile, because it does not say which argument the result borrows from. Add the annotations and change nothing else.",
          ],
          starter: rs`fn longer(a: &[i32], b: &[i32]) -> &[i32] {
    if a.len() >= b.len() {
        a
    } else {
        b
    }
}`,
          hints: [
            "The result can be `a` or `b`, so it has to be tied to both of them.",
            "Declare a lifetime after the function's name, `fn longer<'a>(…)`. Then put `'a` after the `&` of both parameters and of the result.",
            "`fn longer<'a>(a: &'a [i32], b: &'a [i32]) -> &'a [i32]`",
          ],
          solution: rs`fn longer<'a>(a: &'a [i32], b: &'a [i32]) -> &'a [i32] {
    if a.len() >= b.len() {
        a
    } else {
        b
    }
}`,
          tests: [
            { label: 'Returns the slice with more elements', body: rs`assert_eq!(longer(&[1, 2, 3], &[4, 5]), [1, 2, 3]);
assert_eq!(longer(&[1], &[4, 5]), [4, 5]);` },
            { label: 'Returns the first when both are equally long', body: rs`let a = [1, 2];
let b = [3, 4];
assert!(std::ptr::eq(longer(&a, &b).as_ptr(), a.as_ptr()), "expected the first argument");` },
            { label: 'Accepts empty slices', body: rs`let none: [i32; 0] = [];
assert_eq!(longer(&none, &[7]), [7]);
assert!(longer(&none, &none).is_empty());` },
            { label: 'Accepts arguments that live in different scopes', body: rs`let outer = vec![1, 2, 3];
{
    let inner = vec![4, 5];
    let result = longer(&outer, &inner);
    assert!(std::ptr::eq(result.as_ptr(), outer.as_ptr()), "the result must be one of the arguments, not a copy");
}` },
          ],
        },
        {
          id: 'first-or-fallback',
          title: 'Stop copying',
          level: 'core',
          prompt: [
            "`first_or_fallback` returns the first word of `text`, or `fallback` when the text has no words. The starter returns a `String`. That is an allocation and a copy on every call, for a result that is always a part of one of the arguments.",
            "Change it to return a `&str`, a view of whichever argument the answer comes from. The compiler will then ask a question about the signature. Answer it.",
          ],
          starter: rs`fn first_or_fallback(text: &str, fallback: &str) -> String {
    match text.split_whitespace().next() {
        Some(word) => word.to_string(),
        None => fallback.to_string(),
    }
}`,
          hints: [
            "Change the return type to `&str` and take out the two `to_string()` calls. The compiler now reports `E0106`: it wants to know which parameter the result borrows from.",
            "Look at the two arms of the `match`. One returns a part of `text`, and the other returns `fallback`. The result can come from either.",
            "`fn first_or_fallback<'a>(text: &'a str, fallback: &'a str) -> &'a str`",
          ],
          solution: rs`fn first_or_fallback<'a>(text: &'a str, fallback: &'a str) -> &'a str {
    match text.split_whitespace().next() {
        Some(word) => word,
        None => fallback,
    }
}`,
          tests: [
            { label: 'Returns the first word', body: rs`assert_eq!(first_or_fallback("hello world", "none"), "hello");
assert_eq!(first_or_fallback("  padded  ", "none"), "padded");` },
            { label: 'Returns the fallback for empty or blank text', body: rs`assert_eq!(first_or_fallback("", "empty"), "empty");
assert_eq!(first_or_fallback("   ", "blank"), "blank");` },
            { label: 'The word is a view of the text, not a copy', body: rs`let text = String::from("alpha beta");
let word = first_or_fallback(&text, "none");
assert!(std::ptr::eq(word.as_ptr(), text.as_ptr()), "the result must point into text");` },
            { label: 'The fallback comes back as it is, not as a copy', body: rs`let fallback = String::from("nothing here");
let word = first_or_fallback("", &fallback);
assert!(std::ptr::eq(word.as_ptr(), fallback.as_ptr()), "the result must point at fallback");` },
            { label: 'Accepts arguments from different scopes, and a literal', body: rs`let text = String::from("  spaced out");
{
    let fallback = String::from("x");
    assert_eq!(first_or_fallback(&text, &fallback), "spaced");
}
assert_eq!(first_or_fallback(&text, "literal"), "spaced");` },
          ],
        },
        {
          id: 'split-pair',
          title: 'Two views of one text',
          level: 'core',
          forbid: ['split_once'],
          prompt: [
            "Split `text` at the first occurrence of `separator`, and return the part before it and the part after it. Return `None` when the separator does not occur. The standard library has `split_once` for this. Write it yourself, with `find`.",
            "Read the signature before you start. Both halves carry `'a`, the lifetime of `text`, and `separator` has no name at all. The halves are views of the text, and the separator is only looked at during the call. The last test relies on that: it frees the separator and then uses the halves.",
          ],
          signature: "fn split_pair<'a>(text: &'a str, separator: &str) -> Option<(&'a str, &'a str)>",
          starter: rs`fn split_pair<'a>(text: &'a str, separator: &str) -> Option<(&'a str, &'a str)> {
    // Find where the separator starts. The halves are the text before it and the text after it.
    None
}`,
          hints: [
            "`text.find(separator)` returns an `Option<usize>`: the byte position where the separator starts.",
            "The part before it is `&text[..at]`. The part after it starts where the separator ends, at `at + separator.len()`.",
            "`match text.find(separator) { Some(at) => Some((&text[..at], &text[at + separator.len()..])), None => None }`",
          ],
          solution: rs`fn split_pair<'a>(text: &'a str, separator: &str) -> Option<(&'a str, &'a str)> {
    match text.find(separator) {
        Some(at) => Some((&text[..at], &text[at + separator.len()..])),
        None => None,
    }
}`,
          tests: [
            { label: 'Splits at the separator', body: rs`assert_eq!(split_pair("key=value", "="), Some(("key", "value")));` },
            { label: 'Splits at the first of several separators', body: rs`assert_eq!(split_pair("a=b=c", "="), Some(("a", "b=c")));` },
            { label: 'Handles a separator of several bytes', body: rs`assert_eq!(split_pair("nombre: Zoë", ": "), Some(("nombre", "Zoë")));
assert_eq!(split_pair("température → 21", " → "), Some(("température", "21")));` },
            { label: 'Returns None when the separator is missing', body: rs`assert_eq!(split_pair("no separator here", "="), None);
assert_eq!(split_pair("", "="), None);` },
            { label: 'Either half may be empty', body: rs`assert_eq!(split_pair("=value", "="), Some(("", "value")));
assert_eq!(split_pair("key=", "="), Some(("key", "")));` },
            { label: 'The halves are views of the text, and outlive the separator', body: rs`let text = String::from("left|right");
let halves;
{
    let separator = String::from("|");
    halves = split_pair(&text, &separator);
}
match halves {
    Some((left, right)) => {
        assert_eq!((left, right), ("left", "right"));
        assert!(std::ptr::eq(left.as_ptr(), text.as_ptr()), "the first half must point into text");
        assert!(std::ptr::eq(right.as_ptr(), text[5..].as_ptr()), "the second half must point into text");
    }
    None => panic!("expected the text to be split at the bar"),
}` },
          ],
        },
        {
          id: 'tighter-signature',
          title: 'Promise less',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "`without_prefix` returns `text` with `prefix` removed from its start, or all of `text` when it does not start with the prefix. The body is correct, and the function compiles by itself.",
            "Its signature claims more than it needs to. By giving both parameters the lifetime `'a`, it tells every caller that the result may borrow from `prefix`, so a caller has to keep the prefix alive for as long as it uses the result. One of the tests does not: it builds the prefix in an inner block. The compiler's error is therefore in the test, not in your code. Read it, then change the signature so that the result borrows from `text` alone.",
          ],
          starter: rs`fn without_prefix<'a>(text: &'a str, prefix: &'a str) -> &'a str {
    if text.starts_with(prefix) {
        &text[prefix.len()..]
    } else {
        text
    }
}`,
          hints: [
            "The error says that `prefix` does not live long enough. The test never uses `prefix` after the call. It is the signature that makes the compiler think the result might.",
            "Both branches of the `if` return a part of `text`. Nothing that is returned ever points into `prefix`.",
            "Take the `'a` off the second parameter: `fn without_prefix<'a>(text: &'a str, prefix: &str) -> &'a str`.",
          ],
          solution: rs`fn without_prefix<'a>(text: &'a str, prefix: &str) -> &'a str {
    if text.starts_with(prefix) {
        &text[prefix.len()..]
    } else {
        text
    }
}`,
          tests: [
            { label: 'Removes a prefix that is there', body: rs`assert_eq!(without_prefix("re: hello", "re: "), "hello");
assert_eq!(without_prefix("über-cool", "über-"), "cool");` },
            { label: 'Returns the whole text when the prefix is absent', body: rs`assert_eq!(without_prefix("hello", "re: "), "hello");
assert_eq!(without_prefix("", "re: "), "");` },
            { label: 'The result does not borrow from the prefix', body: rs`let text = String::from("re: lunch");
let subject;
{
    let prefix = String::from("re: ");
    subject = without_prefix(&text, &prefix);
}
assert_eq!(subject, "lunch");` },
            { label: 'The result is a view of the text', body: rs`let text = String::from("v2.1");
let version = without_prefix(&text, "v");
assert!(std::ptr::eq(version.as_ptr(), text[1..].as_ptr()), "the result must point into text");` },
          ],
        },
        {
          id: 'excerpt-struct',
          title: 'A struct of views',
          level: 'core',
          prompt: [
            "`excerpt` finds the first occurrence of a word in a text and returns the three parts around it: the text before the word, the word, and the text after it. The starter copies each part into a `String` of its own, which is three allocations for something that could be three views.",
            "Change `Excerpt` so that its fields are `&str` slices of `text`, and change `excerpt` to match. The struct needs a lifetime parameter, and so does the function. An `Excerpt` must stay usable after the `word` it was searched with is gone.",
          ],
          starter: rs`struct Excerpt {
    before: String,
    matched: String,
    after: String,
}

fn excerpt(text: &str, word: &str) -> Option<Excerpt> {
    match text.find(word) {
        Some(at) => Some(Excerpt {
            before: text[..at].to_string(),
            matched: text[at..at + word.len()].to_string(),
            after: text[at + word.len()..].to_string(),
        }),
        None => None,
    }
}`,
          hints: [
            "Start with the struct. Change each field to `&str`, and the compiler reports `E0106`: a reference in a struct needs a named lifetime. Declare it on the struct, `struct Excerpt<'a>`, and use it in every field: `&'a str`.",
            "Now the function. It returns an `Excerpt<'a>` and has two reference parameters. Which of them do the three views point into?",
            "`fn excerpt<'a>(text: &'a str, word: &str) -> Option<Excerpt<'a>>`. In the body, each `text[…].to_string()` becomes `&text[…]`.",
          ],
          solution: rs`struct Excerpt<'a> {
    before: &'a str,
    matched: &'a str,
    after: &'a str,
}

fn excerpt<'a>(text: &'a str, word: &str) -> Option<Excerpt<'a>> {
    match text.find(word) {
        Some(at) => Some(Excerpt {
            before: &text[..at],
            matched: &text[at..at + word.len()],
            after: &text[at + word.len()..],
        }),
        None => None,
    }
}`,
          tests: [
            { label: 'Finds the word and the text on both sides', body: rs`match excerpt("the quick brown fox", "quick") {
    Some(found) => {
        assert_eq!(found.before, "the ");
        assert_eq!(found.matched, "quick");
        assert_eq!(found.after, " brown fox");
    }
    None => panic!("expected to find the word"),
}` },
            { label: 'Returns None when the word is absent', body: rs`assert!(excerpt("nothing to see", "quick").is_none());` },
            { label: 'A word at the start or the end leaves an empty side', body: rs`match excerpt("début et fin", "début") {
    Some(found) => {
        assert_eq!(found.before, "");
        assert_eq!(found.after, " et fin");
    }
    None => panic!("expected to find the word at the start"),
}
match excerpt("début et fin", "fin") {
    Some(found) => {
        assert_eq!(found.before, "début et ");
        assert_eq!(found.after, "");
    }
    None => panic!("expected to find the word at the end"),
}` },
            { label: 'The three parts are views of the text, not copies', body: rs`let text = String::from("needle in a haystack");
match excerpt(&text, "in") {
    Some(found) => {
        assert!(std::ptr::eq(found.before.as_ptr(), text.as_ptr()), "before must point into text");
        assert!(std::ptr::eq(found.matched.as_ptr(), text[7..].as_ptr()), "matched must point into text");
        assert!(std::ptr::eq(found.after.as_ptr(), text[9..].as_ptr()), "after must point into text");
    }
    None => panic!("expected to find the word"),
}` },
            { label: 'An excerpt outlives the word it was searched with', body: rs`let text = String::from("one two three");
let found;
{
    let word = String::from("two");
    found = excerpt(&text, &word);
}
match found {
    Some(parts) => assert_eq!(parts.matched, "two"),
    None => panic!("expected to find the word"),
}` },
          ],
        },
        {
          id: 'token-cursor',
          title: 'A cursor over text',
          level: 'stretch',
          prompt: [
            "A `Cursor` reads tokens out of a text, one per call, and remembers how far it has got. It holds a view of the whole text and a byte position, and copies nothing. Lesson 11 turns a function like `next_token` into a method.",
            "`next_token` skips whitespace and returns the next token, moving `pos` to just past it. A token is a run of letters, digits and underscores, or else one single character of any other kind. So `x=42;` holds four tokens: `x`, `=`, `42` and `;`. When only whitespace is left, it returns `None`.",
            "Read the signature first. A `&mut Cursor<'a>` involves two lifetimes: how long the cursor is borrowed for, which is one call, and `'a`, how long the text is valid. The token is given `'a`. It is a view of the text, so it stays usable while the cursor moves on, and after the cursor is gone. Two of the tests depend on that.",
          ],
          signature: "fn next_token<'a>(cursor: &mut Cursor<'a>) -> Option<&'a str>",
          starter: rs`struct Cursor<'a> {
    text: &'a str,      // the whole input
    pos: usize,         // the byte position of the first character not yet read
}

fn next_token<'a>(cursor: &mut Cursor<'a>) -> Option<&'a str> {
    // Skip whitespace from cursor.pos on, find where the token ends, and move cursor.pos there.
    None
}`,
          hints: [
            "Begin with `let text = cursor.text;`. That copies the reference out of the cursor. The copy is a `&'a str`, so a slice of it has the lifetime the signature promises.",
            "`let rest = text[cursor.pos..].trim_start();` is what is left, without leading whitespace. Its length tells you where the token starts: `text.len() - rest.len()`.",
            "Walk `rest.char_indices()`. A character belongs to a word when `c.is_alphanumeric() || c == '_'`. Stop before the first one that does not, unless it is the very first character: then the token is that one character, which is `c.len_utf8()` bytes long.",
          ],
          solution: rs`struct Cursor<'a> {
    text: &'a str,      // the whole input
    pos: usize,         // the byte position of the first character not yet read
}

fn next_token<'a>(cursor: &mut Cursor<'a>) -> Option<&'a str> {
    let text = cursor.text;                     // a copy of the reference, valid for 'a
    let rest = text[cursor.pos..].trim_start();
    let start = text.len() - rest.len();

    let mut end = start;
    for (index, c) in rest.char_indices() {
        let in_word = c.is_alphanumeric() || c == '_';
        if index > 0 && !in_word {
            break;                              // a word ends before this character
        }
        end = start + index + c.len_utf8();
        if !in_word {
            break;                              // any other character is a token by itself
        }
    }

    cursor.pos = end;
    if start == end {
        None
    } else {
        Some(&text[start..end])
    }
}`,
          tests: [
            { label: 'Reads words separated by spaces', body: rs`let mut cursor = Cursor { text: "let total", pos: 0 };
assert_eq!(next_token(&mut cursor), Some("let"));
assert_eq!(next_token(&mut cursor), Some("total"));
assert_eq!(next_token(&mut cursor), None);` },
            { label: 'A character that is not part of a word is a token by itself', body: rs`let mut cursor = Cursor { text: "x=42;", pos: 0 };
assert_eq!(next_token(&mut cursor), Some("x"));
assert_eq!(next_token(&mut cursor), Some("="));
assert_eq!(next_token(&mut cursor), Some("42"));
assert_eq!(next_token(&mut cursor), Some(";"));
assert_eq!(next_token(&mut cursor), None);
let mut cursor = Cursor { text: "max_len+1", pos: 0 };
assert_eq!(next_token(&mut cursor), Some("max_len"));
assert_eq!(next_token(&mut cursor), Some("+"));
assert_eq!(next_token(&mut cursor), Some("1"));` },
            { label: 'Skips whitespace of every kind', body: rs`let mut cursor = Cursor { text: "  \t one\n two  ", pos: 0 };
assert_eq!(next_token(&mut cursor), Some("one"));
assert_eq!(next_token(&mut cursor), Some("two"));
assert_eq!(next_token(&mut cursor), None);` },
            { label: 'Returns None for empty or blank text, as often as it is asked', body: rs`let mut cursor = Cursor { text: "", pos: 0 };
assert_eq!(next_token(&mut cursor), None);
let mut cursor = Cursor { text: "   ", pos: 0 };
assert_eq!(next_token(&mut cursor), None);
assert_eq!(next_token(&mut cursor), None);` },
            { label: 'Moves pos to just past the token', body: rs`let mut cursor = Cursor { text: "ab  cd", pos: 0 };
next_token(&mut cursor);
assert_eq!(cursor.pos, 2);
next_token(&mut cursor);
assert_eq!(cursor.pos, 6);` },
            { label: 'Handles text outside ASCII', body: rs`let mut cursor = Cursor { text: "añadir(café) → 日本", pos: 0 };
assert_eq!(next_token(&mut cursor), Some("añadir"));
assert_eq!(next_token(&mut cursor), Some("("));
assert_eq!(next_token(&mut cursor), Some("café"));
assert_eq!(next_token(&mut cursor), Some(")"));
assert_eq!(next_token(&mut cursor), Some("→"));
assert_eq!(next_token(&mut cursor), Some("日本"));
assert_eq!(next_token(&mut cursor), None);` },
            { label: 'Tokens are views of the text, and outlive the cursor', body: rs`let text = String::from("first second");
let a;
let b;
{
    let mut cursor = Cursor { text: &text, pos: 0 };
    a = next_token(&mut cursor);
    b = next_token(&mut cursor);
}
assert_eq!((a, b), (Some("first"), Some("second")));
match b {
    Some(token) => assert!(std::ptr::eq(token.as_ptr(), text[6..].as_ptr()), "a token must point into the text"),
    None => panic!("expected a second token"),
}` },
          ],
        },
      ],
    },
  );
})();
