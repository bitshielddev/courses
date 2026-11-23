// Part 2 (Ownership), lessons 4 and 5: where values live in memory, and what it means to own one.
(() => {
  const rs = String.raw; // rs`…` keeps backslashes, so Rust's "\n" stays as written
  const part = 'Part 2 · Ownership';
  // The bytes of a piece of text, as the memory figures show them in a heap buffer.
  const bytes = text => [...text].map(letter => `'${letter}'`);

  (window.C_LESSONS ||= []).push(
    {
      id: 'stack-and-heap',
      title: 'Where values live',
      category: part,
      minutes: 25,
      summary: 'The two places a program keeps its data, what a String is made of, and who gives heap memory back.',
      topics: ['Stack frames', 'size_of', 'Box', 'String and Vec', 'Leaks and dangling pointers', 'Drop'],
      sections: [
        {
          title: 'What your language has been doing for you',
          body: [
            "In Python, PHP and JavaScript you have never had to say where a value is stored, or when its memory is given back. The language decides both, in the same way for every value. Rust expects you to know. This lesson has little new syntax. Its job is to give you a picture of memory, and the next three lessons stand on it.",
            "Start with four lines of Python.",
            { code: rs`a = [1, 2, 3]      # a list is created, and a refers to it
b = a              # b refers to the same list
b.append(4)
print(a)           # [1, 2, 3, 4]`, lang: 'python' },
            "Three things happened there that no line of the program asked for.",
            { steps: [
              "**The list went on the heap.** The **heap** is a large pool of memory from which a running program takes blocks of any size. In these languages nearly every value lives there: lists, strings, objects, and in Python even integers.",
              "**The variables hold references.** `a` is not the list. It is the address of the list. `b = a` copies that address, so there are two names for one object, and a change made through one name shows through the other.",
              "**Something decides when to free it.** Python and PHP keep a count beside every object: the number of references to it. When the count reaches zero, the object is freed. A JavaScript engine instead stops from time to time, finds every object that can still be reached, and frees the rest. That is a tracing **garbage collector**.",
            ] },
            { memory: {
              title: 'The Python program, after `b = a` and the `append`',
              vars: [
                { id: 'a', type: 'reference' },
                { id: 'b', type: 'reference' },
                { id: 'list', name: 'list object', type: 'object', frame: 'heap', fields: [['refcount', 'usize'], ['len', 'usize'], ['items', 'pointer']] },
                { id: 'items', name: 'items', type: 'i64', len: 4, frame: 'heap' },
              ],
              set: { a: '&list', b: '&list', list: { refcount: 2, len: 4, items: '&items' }, items: [1, 2, 3, 4] },
              caption: "Simplified from what CPython does. Both variables hold the same address. The count of 2 is how the runtime knows that the list is still in use.",
            } },
            "This design is comfortable. It also has costs that you may never have had a reason to look at.",
            { list: [
              "Every value carries a header with its type and its count. In CPython the integer `1` takes 28 bytes.",
              "Every use of a value follows a pointer, and every assignment updates a count. Where there is a collector, it pauses the program at moments it chooses.",
              "Two names for one object means that a function you call can change your list. A mistake about who else holds a reference is a bug that no tool reports.",
            ] },
            "Rust does not make one decision for every value. Each type says where its data lives, nothing is counted while the program runs, and memory is given back at a point you can see in the source.",
            { table: {
              head: ['Question', 'Python, PHP, JavaScript', 'Rust'],
              rows: [
                ['Where does a value live?', 'On the heap, behind a reference', 'In the stack frame, unless its type asks for heap memory'],
                ['What does a variable hold?', 'A reference to the value', 'The value itself'],
                ['When is the memory given back?', 'When a count reaches zero, or when a collector next runs', 'When the variable that owns the value goes out of scope'],
                ['What does `b = a` do?', 'It makes a second reference to one object', 'Lesson 5 is about this'],
              ],
            } },
            { compare: "PHP is the exception when it comes to arrays. `$b = $a` behaves as if the whole array were copied, and PHP makes that affordable by sharing the storage until one of the two is changed. PHP objects behave like Python's: `$b = $a` gives two handles to one object. So even among the languages you know, `b = a` has no single meaning. Keep that in mind for lesson 5." },
          ],
        },
        {
          title: 'The stack: fixed sizes and no bookkeeping',
          body: [
            "Lesson 3 ended with the call stack. Each call gets a **frame** for its parameters and local variables, and returning discards the frame. That works because the compiler knows the size of every local before the program runs. It lays out each function's frame once, at compile time, and every variable is a fixed position inside it.",
            "`size_of` reports how many bytes a type takes.",
            { run: rs`use std::mem::size_of;      // lets the lines below write size_of for std::mem::size_of

fn main() {
    println!("u8          {}", size_of::<u8>());
    println!("i32         {}", size_of::<i32>());
    println!("f64         {}", size_of::<f64>());
    println!("(i32, i32)  {}", size_of::<(i32, i32)>());
    println!("[i32; 3]    {}", size_of::<[i32; 3]>());
    println!("[u8; 1000]  {}", size_of::<[u8; 1000]>());
}`, name: 'sizes.rs', expect: 'u8          1\ni32         4\nf64         8\n(i32, i32)  8\n[i32; 3]    12\n[u8; 1000]  1000\n' },
            "A tuple or an array is its parts side by side. There is no header, no count and no pointer. Step through a program that keeps everything on the stack, and watch the addresses.",
            { trace: {
              title: 'Frames are pushed and popped, and their memory is used again',
              code: rs`fn sum(values: [i32; 3]) -> i32 {
    values[0] + values[1] + values[2]
}

fn larger(a: i32, b: i32) -> i32 {
    if a > b { a } else { b }
}

fn main() {
    let scores = [70, 85, 92];
    let total = sum(scores);
    let best = larger(total, 250);
    println!("{total} {best}");
}`,
              vars: [
                { id: 'scores', type: 'i32', len: 3 },
                { id: 'total', type: 'i32' },
                { id: 'best', type: 'i32' },
                { id: 'sum.values', name: 'values', type: 'i32', len: 3, frame: 'sum' },
                { id: 'larger.a', name: 'a', type: 'i32', frame: 'larger', addr: 0x7ee0 },
                { id: 'larger.b', name: 'b', type: 'i32', frame: 'larger' },
              ],
              steps: [
                { line: 10, set: { scores: [70, 85, 92] }, say: "The frame of `main` has room for three `i32` values, then `total`, then `best`. The array is in the frame itself: twelve bytes, side by side." },
                { line: 11, set: { 'sum.values': [70, 85, 92] }, say: "Calling `sum` pushes a new frame. The argument is copied into the parameter. That means all three numbers, because an array is its elements and nothing more." },
                { line: 2, say: "`sum` reads its own copy. The additions need no storage that outlasts the expression." },
                { line: 11, set: { total: 247 }, hide: ['frame:sum'], say: "`sum` returns 247, which is copied into `total`. Its frame is discarded by moving one address, the **stack pointer**, back to where it was. Nothing is searched for and nothing is erased." },
                { line: 12, set: { 'larger.a': 247, 'larger.b': 250 }, say: "The frame for `larger` is pushed where the frame of `sum` was a moment ago. Look at the addresses: they are the ones `values` had." },
                { line: 6, say: "250 is the larger of the two." },
                { line: 12, set: { best: 250 }, hide: ['frame:larger'], say: "`larger` returns, and its frame goes too." },
                { line: 14, say: "When `main` returns, its frame is discarded in the same way. The program never asked for memory and never had to give any back." },
              ],
            } },
            "That is why the stack is fast. Making room for a frame is one subtraction, and releasing it is one addition. There are no records to keep about which parts are in use, because the part in use is always everything up to the stack pointer.",
            "The price is two restrictions.",
            { list: [
              "**Every size is fixed at compile time.** A frame cannot hold something whose size is only known while the program runs: text typed by a user, or a list that grows.",
              "**Nothing in a frame outlasts the call.** A value that is needed after its function returns must be copied out, as `sum` copied 247 back to `main`, or it must live somewhere else.",
            ] },
            "The first restriction is why the length of an array is part of its type. It has to be a constant, and a variable will not do, even one that is obviously 3.",
            { run: rs`fn main() {
    let n = 3;
    let values = [0; n];
    println!("{values:?}");
}`, name: 'runtime_length.rs', fails: 'E0435' },
            "The `help:` line offers the only way out, which is to make `n` a `const`: a value fixed before the program runs.",
            { compare: "A local variable in Python or JavaScript also has a slot in a frame. That slot holds a reference, and the value it refers to is on the heap. In Rust the slot holds the value. `let scores = [70, 85, 92];` puts twelve bytes of numbers in the frame and nothing anywhere else." },
            { aside: "The stack is small on purpose: 8 MiB for the main thread on Linux and macOS, and 2 MiB for each further thread that a Rust program starts. A local `[u8; 100_000_000]`, or a recursion that never ends, runs off the end of it. The overflow is detected, and the program is stopped with a message that it `has overflowed its stack`." },
          ],
        },
        {
          title: 'The heap: memory you ask for',
          body: [
            "The **heap** has neither restriction. While it runs, a program can ask for a block of any size, and the block stays until it is given back. The part of the program that hands out blocks and takes them back is the **allocator**, and asking it for a block is called **allocating**.",
            "The simplest way to put a value on the heap is `Box::new`. It allocates room for the value, puts the value there, and gives you a `Box<T>`: a pointer to it.",
            { run: rs`fn main() {
    let on_stack = 41;
    let boxed = Box::new(41);                 // four bytes on the heap, and their address in boxed

    println!("{}", on_stack + *boxed);        // * follows the pointer to the value
    println!("{boxed}");                      // println! follows it for you

    let mut counter = Box::new(0);
    *counter += 5;                            // change the value on the heap
    println!("{counter}");

    let big = Box::new([0_u8; 100_000]);      // a hundred thousand bytes on the heap
    println!("{} {}", big.len(), std::mem::size_of::<Box<[u8; 100_000]>>());
}`, name: 'box.rs', expect: '82\n41\n5\n100000 8\n' },
            "The last line shows what a box is. However large the value, the `Box` in the frame is one address: 8 bytes.",
            { memory: {
              title: 'A `Box<i32>` is one pointer in the frame and one value on the heap',
              vars: [
                { id: 'on_stack', type: 'i32' },
                { id: 'boxed', type: 'Box<i32>' },
                { id: 'value', name: 'allocation', type: 'i32', frame: 'heap' },
              ],
              set: { on_stack: 41, boxed: '&value', value: 41 },
              caption: "The arrow is solid because `boxed` owns the allocation: when `boxed` goes away, the four bytes on the heap are freed. From lesson 6 on, a dashed arrow will mean a pointer that only borrows.",
            } },
            { table: {
              head: ['', 'Stack', 'Heap'],
              rows: [
                ['Size of a value', 'Fixed when the program is compiled', 'Chosen while it runs'],
                ['How long a value lasts', 'Until its function returns', 'Until the block is given back'],
                ['Cost of making room', 'One subtraction', 'A search through the allocator\'s records'],
                ['How it is reached', 'Directly, at a fixed position in the frame', 'Through a pointer'],
                ['How it is given back', 'By returning', 'By someone, exactly once'],
              ],
            } },
            "You will rarely box a number. `Box` earns its place for values that are large, for types that contain themselves (lesson 21), and for values whose exact type is only known while the program runs (lesson 16). It is here because it is the simplest thing that owns heap memory: one pointer and one allocation. The types you will use every day are built the same way, with a little more in the frame.",
            { compare: "In Python, `x = 41` already does what `Box::new(41)` does. The number goes on the heap and the variable holds a pointer to it. Java draws the same line between `int` and `Integer`. In Rust the boxed form is the exception, and you can see it in the type." },
            { aside: "An allocation is not free. The allocator keeps records of which blocks are in use, has to find one that fits, and has to cope with blocks of every size coming back in any order. One allocation costs tens of nanoseconds, where a slot in a frame costs nothing extra. That is no cost at all when it happens once, and a large one inside a loop that runs a million times. It is why three of this lesson's challenges count allocations." },
            { fromC: "The stack and the heap are the ones from the C memory lesson, and `Box::new(41)` is a `malloc` followed by a store. What changes in Rust is who calls `free`. The last section shows that nobody writes that call." },
          ],
        },
        {
          title: 'A String is three words and a buffer',
          body: [
            "Text that can grow cannot live in a frame, because its size is not known at compile time. So a `String` is in two parts. The bytes of the text are in a block on the heap, called the **buffer**. In the frame is a handle of fixed size, made of three values:",
            { list: [
              "a **pointer** to the buffer,",
              "the **length**: how many bytes of the buffer hold text,",
              "the **capacity**: how many bytes the buffer has room for.",
            ] },
            "Each of the three is one **word**, which is 8 bytes on a 64-bit machine. A `String` therefore takes 24 bytes of its frame, however long the text is.",
            { run: rs`fn main() {
    let mut text = String::with_capacity(4);      // a buffer with room for 4 bytes, none in use
    println!("{text:?} len {} capacity {}", text.len(), text.capacity());

    text.push_str("Rus");                         // append some text
    text.push('t');                               // append one character
    println!("{text:?} len {} capacity {}", text.len(), text.capacity());

    text.push('!');                               // no room left: the String gets a larger buffer
    println!("{text:?} len {} capacity {}", text.len(), text.capacity());

    println!("{} bytes in the frame", std::mem::size_of::<String>());
}`, name: 'string_parts.rs', expect: '"" len 0 capacity 4\n"Rust" len 4 capacity 4\n"Rust!" len 5 capacity 8\n24 bytes in the frame\n' },
            "The interesting line is the last `push`. Step through the same program and watch what the fifth byte costs.",
            { trace: {
              title: 'A `String` outgrows its buffer',
              code: rs`fn main() {
    let mut text = String::with_capacity(4);
    text.push_str("Rus");
    text.push('t');
    text.push('!');
    println!("{text}");
}`,
              vars: [
                { id: 'text', type: 'String' },
                { id: 'old', name: 'first buffer', type: 'u8', len: 4, frame: 'heap' },
                { id: 'new', name: 'second buffer', type: 'u8', len: 8, frame: 'heap' },
              ],
              steps: [
                { line: 2, show: ['old'], set: { text: { ptr: '&old', len: 0, cap: 4 } }, say: "`with_capacity(4)` allocates a buffer of four bytes. The three words in the frame record where it is, that none of it is in use, and that it has room for four. The bytes themselves hold nothing meaningful yet." },
                { line: 3, set: { 'old[0]': "'R'", 'old[1]': "'u'", 'old[2]': "'s'", 'text.len': 3 }, say: "`push_str` copies three bytes into the buffer and updates the length. The pointer and the capacity stay as they were." },
                { line: 4, set: { 'old[3]': "'t'", 'text.len': 4 }, say: "One more byte. The buffer is now full: the length equals the capacity." },
                { line: 5, show: ['new'], set: { 'new[0]': "'R'", 'new[1]': "'u'", 'new[2]': "'s'", 'new[3]': "'t'" }, say: "There is no room for `!`. The `String` asks the allocator for a larger buffer and copies the four bytes across." },
                { line: 5, dead: ['old'], set: { 'text.ptr': '&new', 'text.cap': 8 }, say: "It frees the old buffer and points at the new one. The text now lives at a different address, and the handle in the frame is the only thing that had to be told." },
                { line: 5, hide: ['old'], set: { 'new[4]': "'!'", 'text.len': 5 }, say: "Now the byte fits. Three of the eight bytes are spare, so the next three pushes will not allocate." },
                { line: 6, say: "`println!` follows the pointer and prints `len` bytes: `Rust!`." },
                { line: 7, dead: ['new'], hide: ['text'], say: "`main` ends. `text` goes out of scope, and its buffer is freed. The last section of this lesson is about this step." },
              ],
            } },
            "Growing costs an allocation, a copy of everything stored so far, and a release. To keep that rare, a `String` that runs out of room asks for at least twice what it had, so a thousand pushes cause about ten allocations and not a thousand. When you know the final size in advance, `String::with_capacity(n)` reserves it at the start, and nothing is ever copied.",
            { pitfall: "Capacity is room, not content. `String::with_capacity(100)` is an empty string whose `len()` is 0. In the other direction, `String::new()` allocates nothing at all: the first buffer is requested by the first push." },
            "A `Vec<T>` is the growable list: what Python calls a `list`, and JavaScript and PHP call an array. It has the same three words. Its buffer holds values of type `T` side by side, and its length and capacity count elements instead of bytes. The `vec!` macro makes one from a list of elements, or from one element and a count. Lesson 14 covers its methods, and until then `push`, `len` and indexing are enough.",
            { run: rs`fn main() {
    let mut scores = Vec::with_capacity(4);
    scores.push(70);
    scores.push(85);
    scores.push(92);
    println!("{scores:?} len {} capacity {}", scores.len(), scores.capacity());
    println!("{}", scores[1] + scores[2]);        // indexed like an array, and checked like one

    let names = vec![String::from("Ada"), String::from("Grace")];
    println!("{names:?} {}", names.len());

    let n = 5;
    let zeros = vec![0_u8; n];                    // n zeros: this length can be a variable
    println!("{zeros:?}");

    println!("{} {} {}",
        std::mem::size_of::<Vec<i32>>(),
        std::mem::size_of::<Vec<String>>(),
        std::mem::size_of::<Vec<[u8; 1000]>>());
}`, name: 'vec_parts.rs', expect: '[70, 85, 92] len 3 capacity 4\n177\n["Ada", "Grace"] 2\n[0, 0, 0, 0, 0]\n24 24 24\n' },
            { memory: {
              title: '`scores`: a `Vec<i32>` with three elements and room for four',
              vars: [
                { id: 'scores', type: 'Vec<i32>' },
                { id: 'buf', name: 'buffer', type: 'i32', len: 4, frame: 'heap' },
              ],
              show: ['buf'],
              set: { scores: { ptr: '&buf', len: 3, cap: 4 }, 'buf[0]': 70, 'buf[1]': 85, 'buf[2]': 92 },
              caption: "The fourth slot is allocated and not yet in use, so it shows as `?`. `scores.len()` reads the length from the frame. It does not count anything.",
            } },
            "The elements of a `Vec` can own heap memory of their own. `names` above is three allocations: one buffer that holds two `String` handles, and one buffer of text for each handle.",
            { memory: {
              title: '`names`: a `Vec<String>` owns its buffer, and each `String` in it owns its text',
              vars: [
                { id: 'names', type: 'Vec<String>' },
                { id: 'e0', name: 'buffer[0]', type: 'String', frame: 'heap' },
                { id: 'e1', name: 'buffer[1]', type: 'String', frame: 'heap', addr: 0x3018 },
                { id: 'ada', name: 'text of buffer[0]', type: 'u8', len: 3, frame: 'heap' },
                { id: 'grace', name: 'text of buffer[1]', type: 'u8', len: 5, frame: 'heap' },
              ],
              set: { names: { ptr: '&e0', len: 2, cap: 2 }, e0: { ptr: '&ada', len: 3, cap: 3 }, e1: { ptr: '&grace', len: 5, cap: 5 }, ada: bytes('Ada'), grace: bytes('Grace') },
              caption: "Only the first three words are in the frame. Everything else hangs from them, and goes when `names` goes.",
            } },
            { pitfall: [
              "Reserving room in a `Vec` does not create elements. An index must be below the length, whatever the capacity is.",
              { run: rs`fn main() {
    let scores: Vec<i32> = Vec::with_capacity(10);
    println!("len {}", scores.len());
    println!("{}", scores[0]);
}`, name: 'room_is_not_content.rs', panics: true, expect: 'len 0\n' },
            ] },
            { compare: "A Python `list` and a JavaScript array are this same structure underneath: a pointer, a length, and a capacity that grows by a factor when it runs out. The difference is in the buffer. Theirs holds references to objects that live elsewhere on the heap. A `Vec<i32>` holds the numbers themselves, side by side, which is a large part of why a loop over one is so much faster." },
            { aside: "The text of a literal such as `\"Rus\"` is stored in the program file itself, and is there for the whole run. `String::from` and `push_str` copy it into a heap buffer, which is why a `String` can be changed and a literal cannot. A literal has the type `&str`. Lesson 9 untangles the two." },
          ],
        },
        {
          title: 'Someone has to free it',
          body: [
            "A frame is released by returning. A heap block is released only when someone gives it back to the allocator, and that has to happen exactly once, after the block's last use. Every language with a heap needs an answer to the question of who does it.",
            "The oldest answer is that you do. C has a function called `free`, and the programmer calls it by hand. To show what that is like, the next three figures are written in a Rust that does not exist. It has no rules about who owns what, and a `free` function to call when you believe you are finished with a value. Each figure is a bug that freeing by hand allows.",
            { trace: {
              title: 'Imaginary Rust, freeing by hand: a leak',
              code: rs`fn banner() {
    let text = String::from("hello");
    println!("{text}");
}                    // no free(text)

fn main() {
    banner();
    banner();
}`,
              vars: [
                { id: 'banner.text', name: 'text', type: 'String', frame: 'banner' },
                { id: 'b1', name: 'first buffer', type: 'u8', len: 5, frame: 'heap' },
                { id: 'b2', name: 'second buffer', type: 'u8', len: 5, frame: 'heap' },
              ],
              steps: [
                { line: 7, say: "`main` calls `banner`." },
                { line: 2, set: { 'banner.text': { ptr: '&b1', len: 5, cap: 5 }, b1: bytes('hello') }, say: "The frame of `banner` holds the three words. The five bytes of text are on the heap." },
                { line: 4, hide: ['frame:banner'], say: "`banner` returns without freeing the buffer. Its frame is discarded, and the only copy of the buffer's address goes with it. The block is still allocated, and no line of the program can ever reach it again. That is a **leak**." },
                { line: 2, set: { 'banner.text': { ptr: '&b2', len: 5, cap: 5 }, b2: bytes('hello') }, say: "The second call allocates another buffer." },
                { line: 4, hide: ['frame:banner'], say: "And loses that one too. A function that does this once for every request will, given time, use all the memory the machine has." },
              ],
            } },
            { trace: {
              title: 'Imaginary Rust, freeing by hand: use after free',
              code: rs`fn main() {
    let text = String::from("hello");
    free(text);           // imaginary
    let pin = String::from("90210");
    println!("{text}");
}`,
              vars: [
                { id: 'text', type: 'String' },
                { id: 'pin', type: 'String' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 5, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { text: { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('hello') }, say: "`text` points at a five-byte buffer." },
                { line: 3, dead: ['buf'], say: "`free` gives the five bytes back to the allocator. Nothing happens to `text`. It still holds the address of memory that the program no longer owns. A pointer like that is called **dangling**." },
                { line: 4, hide: ['buf'], say: "The next line asks for five bytes. The allocator has a block of exactly that size, which it was given a moment ago." },
                { line: 4, set: { pin: { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('90210') }, say: "So `pin` gets the same address. Two variables now point at the same bytes, and only one of them should." },
                { line: 5, say: "The program reads `text` and prints `90210`, which is another variable's data. In a real program it could be another user's password. Or the block might not have been reused yet, and the line would seem to work. This is a **use after free**." },
              ],
            } },
            { trace: {
              title: 'Imaginary Rust, freeing by hand: double free',
              code: rs`fn main() {
    let text = String::from("hello");
    free(text);
    let pin = String::from("90210");
    free(text);           // by mistake
    println!("{pin}");
}`,
              vars: [
                { id: 'text', type: 'String' },
                { id: 'pin', type: 'String' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 5, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { text: { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('hello') }, say: "The same beginning: `text` points at a five-byte buffer." },
                { line: 3, dead: ['buf'], say: "The buffer is given back. So far this is correct, provided `text` is never used again." },
                { line: 4, hide: ['buf'], say: "As before, the allocator has a freed block of the right size ready for the next request." },
                { line: 4, set: { pin: { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('90210') }, say: "`pin` is given the block that `text` used to have." },
                { line: 5, dead: ['buf'], say: "`free(text)` runs a second time. The allocator is handed an address and frees whatever is there now, which is the buffer of `pin`." },
                { line: 6, say: "`pin` did nothing wrong, and it dangles. A **double free** breaks a part of the program that is nowhere near the mistake. It can also damage the allocator's own records, and then the crash comes later still." },
              ],
            } },
            "A C compiler rejects none of these programs, and none of them is certain to crash. They work on the day they are tested and fail months later, or never fail and quietly hand one user's data to another. Microsoft and the Chrome team at Google have each reported that about 70 percent of their serious security bugs are memory errors in C and C++ code, the family that use after free and double free belong to.",
            "**The collector's answer** is to take the job away from you. The runtime tracks every reference and frees an object when none is left. Use after free and double free cannot happen, because you never free anything. You saw the price in the first section: a header on every value, counting or pauses while the program runs, and no say over when the memory comes back. Leaks do not go away either. An entry that nobody removes from a long-lived cache keeps its object alive forever.",
            "**Rust's answer** is a rule that the compiler checks before the program runs: every value has exactly one **owner**, which is a variable or another value that contains it. When the owner goes out of scope, the value is **dropped**, and any heap memory it holds is freed at that point, by code the compiler put there.",
            { table: {
              head: ['', 'Freeing by hand (C)', 'A collector (Python, PHP, JavaScript)', 'Ownership (Rust)'],
              rows: [
                ['Leak', 'One forgotten `free`', 'Only through a reference you forgot you kept', 'Not by forgetting. It takes a cycle of shared owners, which lesson 20 covers'],
                ['Use after free', 'Compiles, and may seem to work', 'Cannot happen', 'Does not compile'],
                ['Double free', 'Compiles, and corrupts the heap', 'Cannot happen', 'Cannot happen: one owner, dropped once'],
                ['Cost while the program runs', 'None', 'A header on every value, and counting or pauses', 'None'],
              ],
            } },
            "There is no `free` to call, so it cannot be forgotten or called twice. There is no collector, so nothing is tracked while the program runs. What remains is use after free: the compiler has to be certain that nothing can reach a value once its owner is gone. Making it certain is the work of ownership and borrowing, and it is why lessons 5 to 7 exist.",
          ],
        },
        {
          title: 'Scope ends, value dropped',
          body: [
            "You have been relying on the rule already. Every `String` and `Vec` in this lesson was freed by the closing brace of the block in which its variable was declared. Here is the leaking program from the last section again, this time as real Rust.",
            { trace: {
              title: 'Real Rust: the buffer goes when its owner goes',
              code: rs`fn banner() {
    let text = String::from("hello");
    println!("{text}");
}

fn main() {
    banner();
    banner();
}`,
              vars: [
                { id: 'banner.text', name: 'text', type: 'String', frame: 'banner' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 5, frame: 'heap' },
              ],
              steps: [
                { line: 7, say: "`main` calls `banner`." },
                { line: 2, set: { 'banner.text': { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('hello') }, say: "`text` is the owner of the buffer." },
                { line: 4, dead: ['buf'], hide: ['frame:banner'], say: "The closing brace. `text` goes out of scope, and it owns the buffer, so the compiler has placed the code that frees it here. Then the frame is discarded." },
                { line: 8, hide: ['buf'], say: "Nothing is left behind by the first call." },
                { line: 2, set: { 'banner.text': { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('hello') }, say: "The second call allocates again. The allocator may well hand out the same block, and that is harmless now, because nothing still points at it." },
                { line: 4, dead: ['buf'], hide: ['frame:banner'], say: "And it is freed again at the same brace. The program can call `banner` a million times and never hold more than one buffer." },
              ],
            } },
            "Dropping is silent, so here is a type that prints a line when it is dropped. `struct` defines a type of your own, and `impl Drop` gives it code to run at the moment a value of that type is dropped. Lessons 11 and 15 explain both. For now they are a way to make an invisible event print something. `&'static str` is the type of a literal such as `\"temp\"`. The leading underscore in `_a` tells the compiler that the variable is unused on purpose.",
            { run: rs`struct Noisy(&'static str);           // holds a name to print

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("  dropped {}", self.0);
    }
}

fn work() {
    let _temp = Noisy("temp");
    println!("  inside work");
}

fn main() {
    let _a = Noisy("a");
    {
        let _b = Noisy("b");
        println!("end of the inner block");
    }
    let _c = Noisy("c");
    work();
    println!("end of main");
}`, name: 'noisy.rs', expect: 'end of the inner block\n  dropped b\n  inside work\n  dropped temp\nend of main\n  dropped c\n  dropped a\n' },
            { list: [
              "`b` is dropped at the closing brace of the inner block, before the next line of `main` runs.",
              "`temp` is dropped when `work` returns, as its frame is discarded.",
              "At the end of `main`, `c` is dropped before `a`. Variables are dropped in the reverse of the order in which they were declared, as frames are popped in the reverse of the order in which they were pushed. A later value may depend on an earlier one, so the later one goes first.",
            ] },
            "To end a value's life before the closing brace, pass it to `drop`. And dropping goes all the way down: a `Box` drops what it points at and then frees the allocation, and a `Vec` drops each element and then frees its buffer.",
            { run: rs`struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("  dropped {}", self.0);
    }
}

fn main() {
    let first = Noisy("first");
    let _list = vec![Noisy("x"), Noisy("y")];
    let _boxed = Box::new(Noisy("in a box"));

    drop(first);                           // dropped here, not at the closing brace
    println!("end of main");
}`, name: 'drop_early.rs', expect: '  dropped first\nend of main\n  dropped in a box\n  dropped x\n  dropped y\n' },
            "So what happens to the use-after-free program? Here it is with the real `drop` in place of the imaginary `free`.",
            { run: rs`fn main() {
    let text = String::from("hello");
    drop(text);
    let pin = String::from("90210");
    println!("{text} {pin}");
}`, name: 'use_after_drop.rs', fails: 'E0382' },
            "It is not a bug waiting for a bad day. It is not a program at all. The message says that `text` was **moved** into `drop`, and that it cannot be used after that. Moving is the subject of lesson 5.",
            { aside: "Nothing runs at a closing brace to work out what needs freeing. While it compiles a function, the compiler knows which variables are alive at each exit, and it writes the calls to their cleanup code at exactly those places. A type with nothing to clean up, such as `i32`, gets no call at all. This is what people mean when they say that Rust manages memory at compile time." },
            { compare: "Python's `with` block and `__del__` method, PHP's `__destruct`, and `try` with `finally` in JavaScript all exist to run cleanup at a known moment. In Rust every value gets that without asking, and for more than memory. A file is closed, a lock is released and a network connection is shut down when its owner goes out of scope, by the same mechanism that frees a `String`." },
            { native: "To see every allocation one of your own programs makes, use a profiler that records them. On macOS that is the Allocations template of Instruments, which the `cargo-instruments` plugin can start for a Cargo project. On Linux, `heaptrack` and the DHAT tool of Valgrind do the same job. The challenges in this lesson use a counting allocator built into the page." },
          ],
        },
      ],
      takeaways: [
        "A stack frame holds values whose size is known at compile time. A call reserves it and the return releases it, with no bookkeeping.",
        "The heap provides blocks of any size for as long as they are needed. `Box::new(value)` puts one value there and keeps a pointer to it in the frame.",
        "A `String` or a `Vec` is three words in the frame (pointer, length, capacity) and a buffer on the heap. Growing past the capacity allocates a new buffer and copies the contents.",
        "Heap memory has to be freed exactly once, after its last use. Freeing by hand allows leaks, use after free and double free.",
        "In Rust every value has one owner, and is dropped when its owner goes out of scope. Locals are dropped in the reverse of the order in which they were declared.",
      ],
      quiz: [
        {
          q: 'Inside `main`, a program runs `let name = String::from("Ferris");`. Where are the six bytes of text?',
          options: [
            { t: 'In a buffer on the heap, which `name` points to', ok: true, why: "The frame holds only the pointer, the length and the capacity. The bytes are in a heap block, which is what lets the text grow." },
            { t: 'In the stack frame of `main`, inside `name`', why: "`name` takes 24 bytes of the frame whatever the text is: three words. A frame slot has a size fixed at compile time, so it cannot hold text that may grow." },
            { t: 'In the program file, where the literal `"Ferris"` is stored', why: "The literal is there, and `String::from` copies it into a new heap buffer. The `String` owns that copy and can change it." },
            { t: 'Wherever the garbage collector decided to put it', why: "That describes Python or JavaScript. Rust has no collector. The `String` asked the allocator for the block, and will give it back when `name` goes out of scope." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`use std::mem::size_of;

fn main() {
    println!("{} {} {}",
        size_of::<(String, u64)>(),
        size_of::<[String; 2]>(),
        size_of::<Box<String>>());
}`,
          answer: '32 48 8',
          explain: "A `String` is three words, 24 bytes, however long its text is. With a `u64` beside it that makes 32. Two of them side by side make 48. A `Box` is one pointer, 8 bytes, whatever it points at.",
          hint: "`size_of` counts the bytes in the frame. A `String` puts three 8-byte words there, and a `Box` puts one.",
        },
        {
          kind: 'multi',
          q: 'Which of these variables have all of their data in the stack frame?',
          options: [
            { t: '`let a = 7_u64;`', ok: true, why: "Eight bytes in the frame." },
            { t: '`let b = (1.5, \'x\', true);`', ok: true, why: "A tuple is its parts side by side, and each of these has a fixed size." },
            { t: '`let c = [0_u8; 64];`', ok: true, why: "An array is its elements side by side: 64 bytes in the frame." },
            { t: '`let d = Box::new(7_u64);`', why: "The frame holds a pointer. The 7 is on the heap, which is the whole purpose of a `Box`." },
            { t: '`let e = String::from("hi");`', why: "The frame holds the pointer, the length and the capacity. The two bytes of text are in a heap buffer." },
            { t: '`let f = vec![1, 2, 3];`', why: "A `Vec` is built like a `String`: three words in the frame and the elements in a heap buffer." },
          ],
          hint: "Three of them. Ask of each type whether its size is fixed at compile time, and whether it had to ask the allocator for anything.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("drop {}", self.0);
    }
}

fn main() {
    let _a = Noisy("a");
    let _b = Noisy("b");
    {
        let _c = Noisy("c");
        println!("inner");
    }
    println!("outer");
}`,
          answer: 'inner\ndrop c\nouter\ndrop b\ndrop a',
          explain: "`_c` is dropped at the closing brace of the inner block, before `outer` is printed. At the end of `main` the remaining variables are dropped in the reverse of the order in which they were declared: `_b`, then `_a`.",
          hint: "A value is dropped at the closing brace of the block its variable was declared in. Within one block, the last one declared goes first.",
        },
        {
          q: 'What happens to the heap buffer of `text` at the line marked `here`?',
          code: rs`fn main() {
    {
        let text = String::from("temporary");
        println!("{}", text.len());
    }   // here
    println!("done");
}`,
          options: [
            { t: 'It is freed at that brace, before `done` is printed', ok: true, why: "`text` goes out of scope at the closing brace of its block. It owns the buffer, so the compiler placed the code that frees it there." },
            { t: 'It is marked as unused, and freed when the collector next runs', why: "That is JavaScript. There is no collector in a Rust program, and nothing runs later to tidy up." },
            { t: 'It stays allocated until `main` returns', why: "Python and JavaScript's `var` scope a variable to the whole function. In Rust the scope is the block, and the value is dropped at the end of it." },
            { t: 'Nothing. It leaks unless the program calls `drop(text)`', why: "That would be freeing by hand, as in C. Rust inserts the call for you. `drop` is only needed to end a value's life early." },
          ],
        },
        {
          q: 'This program is rejected. Why can the length of an array not come from a parameter?',
          code: rs`fn zeros(n: usize) -> [i32; n] {
    [0; n]
}

fn main() {
    println!("{:?}", zeros(3));
}`,
          options: [
            { t: 'An array lives inside a stack frame, and the layout of every frame is fixed when the program is compiled', ok: true, why: "The compiler must know how many bytes `zeros` returns and how much room each caller reserves for them. With `n` chosen at run time it cannot, so the length has to be a constant. A `Vec<i32>` puts the elements on the heap and has no such limit." },
            { t: 'Arrays are immutable, so their length cannot be computed', why: "A `let mut` array can have its elements changed. The length is fixed for a different reason: it decides how many bytes the value takes in the frame." },
            { t: 'Rust has no way to store a sequence whose length is chosen at run time', why: "It has `Vec<T>`, which keeps its elements in a heap buffer of whatever size is needed. `vec![0; n]` works with a variable `n`." },
            { t: 'Bounds checking needs to know the length in advance', why: "A `Vec` checks every index against a length stored at run time. Checking is not what forces the length of an array to be a constant." },
          ],
          verify: 'E0435',
        },
      ],
      challenges: [
        {
          id: 'boxed-max',
          title: 'The larger of two boxes',
          level: 'warm-up',
          prompt: [
            "Each argument is a `Box<i32>`: a pointer to a number on the heap. Return a box that holds the larger of the two numbers.",
            "The starter follows both pointers correctly and then does the wrong thing with what it finds.",
          ],
          signature: 'fn boxed_max(a: Box<i32>, b: Box<i32>) -> Box<i32>',
          starter: rs`fn boxed_max(a: Box<i32>, b: Box<i32>) -> Box<i32> {
    let larger = *a + *b;      // *a is the number that a points to
    Box::new(larger)
}`,
          hints: [
            "`*a` and `*b` are plain `i32` values. Compare them as you would any two numbers.",
            "`if *a > *b { *a } else { *b }` is the larger number. `Box::new` puts it on the heap.",
          ],
          solution: rs`fn boxed_max(a: Box<i32>, b: Box<i32>) -> Box<i32> {
    let larger = if *a > *b { *a } else { *b };
    Box::new(larger)
}`,
          solutionNote: "`if *a > *b { a } else { b }` also passes, and allocates nothing: it hands back one of the two boxes it was given. Passing a box on like that is called a move, and lesson 5 is about it.",
          tests: [
            { label: 'The second is larger', body: rs`assert_eq!(*boxed_max(Box::new(3), Box::new(9)), 9);` },
            { label: 'The first is larger', body: rs`assert_eq!(*boxed_max(Box::new(12), Box::new(-4)), 12);` },
            { label: 'Equal values', body: rs`assert_eq!(*boxed_max(Box::new(7), Box::new(7)), 7);` },
            { label: 'Two negative values', body: rs`assert_eq!(*boxed_max(Box::new(-8), Box::new(-3)), -3);` },
          ],
        },
        {
          id: 'one-allocation',
          title: 'A ruler in one allocation',
          level: 'core',
          track: true,
          prompt: [
            "`ruler(n)` returns a line of `n` characters: a `|` at every position that is a multiple of 10, and a `-` everywhere else. So `ruler(12)` is `|---------|-`. Each of these characters takes one byte.",
            "The starter builds the right text the way you would in Python or JavaScript, where a string cannot be changed: every pass makes a new string out of the old one and one more character. In Rust that is at least one allocation and a copy of the whole line on every pass.",
            "Make `ruler` ask for memory once. Change the `String` in place, and give it the room it needs before the loop starts. The tests count allocations: `allocation_count()` is the number made since the test began.",
          ],
          signature: 'fn ruler(n: usize) -> String',
          starter: rs`fn ruler(n: usize) -> String {
    let mut line = String::new();
    for i in 0..n {
        let mark = if i % 10 == 0 { '|' } else { '-' };
        line = format!("{line}{mark}");      // a whole new String on every pass
    }
    line
}`,
          hints: [
            "`line.push(mark)` appends one character to the `String` that already exists. No new `String` is made, and nothing is copied unless the buffer is full.",
            "That leaves the allocations a `String` makes each time it outgrows its buffer. The function knows how long the result will be before it pushes anything.",
            "`let mut line = String::with_capacity(n);` before the loop, and `line.push(mark);` inside it.",
          ],
          solution: rs`fn ruler(n: usize) -> String {
    let mut line = String::with_capacity(n);     // room for all n bytes, requested once
    for i in 0..n {
        let mark = if i % 10 == 0 { '|' } else { '-' };
        line.push(mark);                         // changes the String in place
    }
    line
}`,
          tests: [
            { label: 'Marks every tenth position', body: rs`assert_eq!(ruler(12), "|---------|-");
assert_eq!(ruler(1), "|");` },
            { label: 'An empty ruler is empty, and allocates nothing', body: rs`let line = ruler(0);
assert_eq!(line, "");
assert_eq!(allocation_count(), 0, "an empty String needs no buffer");` },
            { label: 'A ruler of 100 takes one allocation', body: rs`let line = ruler(100);
assert_eq!(line.len(), 100);
assert_eq!(allocation_count(), 1, "allocations made by ruler(100)");` },
            { label: 'A ruler of 10,000 still takes one', body: rs`let line = ruler(10_000);
assert_eq!(line.len(), 10_000);
assert_eq!(allocation_count(), 1, "allocations made by ruler(10_000)");` },
          ],
        },
        {
          id: 'one-at-a-time',
          title: 'One block at a time',
          level: 'core',
          track: true,
          prompt: [
            "`load_block(index, size)` is written for you. It returns a `Vec<u8>` of `size` bytes, which stands for a block of a large file. `checksum_all(blocks, size)` adds up every byte of blocks `0`, `1`, and so on up to `blocks`.",
            "The starter gets the right total the way you might in Python: it loads everything into a list, then adds it up. So every block is in memory at the same moment. With real blocks of a gigabyte each, that is the difference between a program that runs and one that does not.",
            "Rewrite it so that at most one block is alive at any time. A value is freed when its variable goes out of scope, so decide where each block's scope should end. The tests read `peak_live_allocations()`: the largest number of allocations that existed at one moment during the test.",
          ],
          signature: 'fn checksum_all(blocks: u8, size: usize) -> u64',
          prelude: rs`/// Loads block number index: size bytes in a buffer on the heap.
fn load_block(index: u8, size: usize) -> Vec<u8> {
    let mut block = vec![0; size];
    for i in 0..size {
        block[i] = (i as u8).wrapping_mul(7).wrapping_add(index);
    }
    block
}`,
          starter: rs`fn checksum_all(blocks: u8, size: usize) -> u64 {
    // Load everything first.
    let mut loaded = Vec::new();
    for index in 0..blocks {
        loaded.push(load_block(index, size));
    }

    // Then add it all up.
    let mut sum = 0;
    for b in 0..loaded.len() {
        for i in 0..size {
            sum += loaded[b][i] as u64;
        }
    }
    sum
}`,
          hints: [
            "The list `loaded` is the problem: it keeps every block alive until the function returns. You do not need a list at all.",
            "Use one loop. Inside it, load a block into a local variable and add up its bytes straight away.",
            "A variable declared inside the body of a `for` loop goes out of scope at the end of each pass. `for index in 0..blocks { let block = load_block(index, size); for i in 0..size { sum += block[i] as u64; } }` frees each block before the next is loaded.",
          ],
          solution: rs`fn checksum_all(blocks: u8, size: usize) -> u64 {
    let mut sum = 0;
    for index in 0..blocks {
        let block = load_block(index, size);     // allocated here
        for i in 0..size {
            sum += block[i] as u64;
        }
    }                                            // and freed here, before the next one is loaded
    sum
}`,
          tests: [
            { label: 'Adds up every byte of every block', body: rs`assert_eq!(checksum_all(3, 4), 138);
assert_eq!(checksum_all(2, 300), 74_984);` },
            { label: 'No blocks, or empty blocks, add up to zero', body: rs`assert_eq!(checksum_all(0, 10), 0);
assert_eq!(checksum_all(4, 0), 0);` },
            { label: 'Holds at most one block at a time', body: rs`assert_eq!(checksum_all(5, 1000), 632_340);
assert_eq!(peak_live_allocations(), 1, "the most allocations alive at one moment");` },
            { label: 'Allocates nothing except the five blocks', body: rs`assert_eq!(checksum_all(5, 1000), 632_340);
assert_eq!(allocation_count(), 5, "allocations made by checksum_all(5, 1000)");` },
          ],
        },
        {
          id: 'reserve-up-front',
          title: 'Reserve exactly enough',
          level: 'stretch',
          track: true,
          prompt: [
            "`chant(word, times)` repeats `word`, with a comma and a space between one copy and the next. `chant(\"ho\", 3)` is `ho, ho, ho`. In the signature, `&str` is text the function is given to read. `word.len()` is its length in bytes, and `push_str(word)` appends it.",
            "The starter is correct, and reallocates as the text grows. Work out the exact number of bytes the result needs before building it, and reserve that much. The tests check that `chant` allocates once, and that the buffer has no room left over.",
            "Take care with `times` of 0. Lesson 2 warned about subtracting from a `usize`.",
          ],
          signature: 'fn chant(word: &str, times: usize) -> String',
          starter: rs`fn chant(word: &str, times: usize) -> String {
    let mut out = String::new();
    for i in 0..times {
        if i > 0 {
            out.push_str(", ");
        }
        out.push_str(word);
    }
    out
}`,
          hints: [
            "Count the bytes: `times` copies of `word`, and one two-byte separator between each pair of neighbors. How many separators are there?",
            "There are `times - 1` separators, which underflows when `times` is 0. Return `String::new()` early in that case. It allocates nothing.",
            "`let needed = word.len() * times + 2 * (times - 1);` and then `let mut out = String::with_capacity(needed);`. The loop stays as it is.",
          ],
          solution: rs`fn chant(word: &str, times: usize) -> String {
    if times == 0 {
        return String::new();
    }
    // Every copy of the word, and a two-byte separator between each pair of neighbors.
    let needed = word.len() * times + 2 * (times - 1);
    let mut out = String::with_capacity(needed);
    for i in 0..times {
        if i > 0 {
            out.push_str(", ");
        }
        out.push_str(word);
    }
    out
}`,
          tests: [
            { label: 'Joins the copies with a comma and a space', body: rs`assert_eq!(chant("ho", 3), "ho, ho, ho");
assert_eq!(chant("hey", 1), "hey");` },
            { label: 'No copies: an empty String and no allocation', body: rs`let line = chant("hey", 0);
assert_eq!(line, "");
assert_eq!(allocation_count(), 0, "an empty String needs no buffer");` },
            { label: 'Allocates exactly once', body: rs`let line = chant("hip hip", 200);
assert_eq!(line.len(), 1798);
assert_eq!(allocation_count(), 1, "allocations made by chant");` },
            { label: 'One copy takes one allocation too', body: rs`let line = chant("hooray", 1);
assert_eq!(line, "hooray");
assert_eq!(allocation_count(), 1, "allocations made by chant");` },
            { label: 'Reserves exactly what it uses', body: rs`let line = chant("abc", 50);
assert_eq!(line.len(), 248);
assert_eq!(line.capacity(), 248, "the capacity of the result");` },
          ],
        },
      ],
    },

    {
      id: 'ownership',
      title: 'Ownership & moves',
      category: part,
      minutes: 35,
      summary: 'What it means for a variable to own a value, why assigning or passing a String gives it away, and how to ask for a second copy when you need one.',
      topics: ['Owners', 'Moves', 'Copy', 'clone', 'Passing and returning', 'E0382'],
      sections: [
        {
          title: 'Three rules',
          body: [
            "Lesson 4 ended with Rust's answer to the question of who frees heap memory: each value has one owner, and is dropped when that owner goes out of scope. Set out in full, ownership is three rules.",
            { steps: [
              "Every value has an **owner**: a variable, or another value that contains it. A `Vec` owns its elements, and a tuple owns its fields.",
              "A value has exactly **one** owner at a time.",
              "When the owner goes out of scope, the value is **dropped**.",
            ] },
            "You have seen the first and the third at work. This lesson is about the second, and about what it does to code you would write without a thought in any other language: `let b = a;`, a function call, a `return`. Each of those hands a value from one owner to another. In Rust's vocabulary, the value **moves**.",
            "The second rule is what makes the third one safe. If two variables owned one buffer, each would free it at its own closing brace. With exactly one owner there is exactly one place where the buffer is freed, and the compiler can find that place without running the program.",
            "The rules hold for every value. They only bite for a value that owns something outside its frame, as a `String` owns its buffer, so the examples use `String`. Everything said about it is also true of `Vec`, of `Box`, and of any type built from them.",
            { compare: "In Python and PHP a value has as many owners as there are references to it, and a count stored beside the value keeps track of them while the program runs. Rust's second rule is what makes the count unnecessary. With one owner, the place where a value dies is known when the program is compiled." },
          ],
        },
        {
          title: 'Assignment moves',
          body: [
            "What should `let b = a;` do when `a` is a `String`? Remember what a `String` is: three words in the frame, and a buffer on the heap. The cheap thing is to copy the three words. Suppose Rust did that and nothing more.",
            { trace: {
              title: 'Not what Rust does: both variables stay usable',
              code: rs`fn main() {
    let a = String::from("hello");
    let b = a;
    println!("{b}");
}`,
              vars: [
                { id: 'a', type: 'String' },
                { id: 'b', type: 'String' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 5, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { a: { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('hello') }, say: "`a` owns a buffer of five bytes." },
                { line: 3, set: { b: { ptr: '&buf', len: 5, cap: 5 } }, say: "The three words are copied into `b`. The heap is not touched, so this costs the same however long the text is. Two handles now point at one buffer." },
                { line: 4, say: "Printing through `b` works, and so would printing through `a`. Nothing has gone wrong yet." },
                { line: 5, dead: ['buf'], hide: ['b'], say: "At the closing brace the variables are dropped, the last one declared first. `b` frees the buffer." },
                { line: 5, say: "Then `a` is dropped, and frees the same buffer a second time. That is the double free from lesson 4, produced by two ordinary lines and no mistake on the programmer's part." },
              ],
            } },
            "There are two ways out. One is to copy the buffer as well, so that each variable has its own. Then every assignment of a `String` would hide an allocation and a copy of unknown length behind an `=`. The other is to keep the single buffer and say that only one of the two variables may use it. Rust takes the second.",
            "**Assigning a value that owns heap memory moves it.** The words in the frame are copied to the new variable. The old variable is finished: the compiler rejects any later use of it, and does not drop it.",
            { trace: {
              title: 'What Rust does: the value moves',
              code: rs`fn main() {
    let a = String::from("hello");
    let b = a;
    println!("{b}");
}`,
              vars: [
                { id: 'a', type: 'String' },
                { id: 'b', type: 'String' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 5, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { a: { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('hello') }, say: "The same beginning: `a` owns the buffer." },
                { line: 3, set: { b: { ptr: '&buf', len: 5, cap: 5 } }, moved: ['a'], say: "The three words are copied into `b`, exactly as before. The difference is in the compiler's books: `a` is now marked as moved from. Its bytes are still in the frame, and no code is allowed to read them." },
                { line: 4, say: "`b` is the owner now, and is used like any other variable." },
                { line: 5, dead: ['buf'], hide: ['a', 'b'], say: "At the closing brace `b` is dropped and frees the buffer. `a` is not dropped, because it owns nothing. One buffer, freed once." },
              ],
            } },
            "The last step says that `a` is not dropped. The `Noisy` type from lesson 4 can check that claim. If a move left two owners behind, this program would print its `dropped` line twice.",
            { run: rs`struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("dropped {}", self.0);
    }
}

fn main() {
    let a = Noisy("the value");
    let _b = a;                         // a move: still one value, and _b owns it now
    println!("end of main");
}`, name: 'dropped_once.rs', expect: 'end of main\ndropped the value\n' },
            "Using the old variable is what the compiler refuses.",
            { run: rs`fn main() {
    let a = String::from("hello");
    let b = a;
    println!("{a} {b}");
}`, name: 'moved.rs', fails: 'E0382' },
            "You will see `E0382` more than any other error in your first weeks, so read every part of it.",
            { steps: [
              "`borrow of moved value: a` is the summary. The line tried to use `a`, and its value had gone elsewhere. Printing only needs to look at a value, and the compiler calls that borrowing it.",
              "The first label, on line 2, says why the assignment was a move and not a copy: `String` does not implement `Copy`. The next section is about that.",
              "`value moved here`, on line 3, marks where the value went.",
              "`value borrowed here after move`, on line 4, marks the use that is not allowed.",
              "The `help:` line offers `.clone()`. It would compile. Whether it is what you want is a question the compiler cannot answer for you.",
            ] },
            "The right fix depends on what you meant.",
            { table: {
              head: ['What you meant', 'What to do'],
              rows: [
                ['The value has a new home, and the old name was used by mistake', 'Use the new owner. Here, print `b` twice'],
                ['To use the value first, and hand it over afterward', 'Reorder the lines so that the move comes last'],
                ['To have two independent values', 'Ask for a copy with `clone`, covered below'],
                ['To let other code look at the value without giving it up', 'Lend it with a reference, which is lesson 6'],
              ],
            } },
            "Reordering is the fix people overlook. A value can be used as often as you like before it moves.",
            { run: rs`fn main() {
    let a = String::from("hello");
    println!("{a} has {} bytes", a.len());    // use it while a is still the owner
    let b = a;                                // then move it
    println!("{b}");
}`, name: 'use_then_move.rs', expect: 'hello has 5 bytes\nhello\n' },
            { compare: "Nothing in Python, PHP or JavaScript behaves like this. There, `b = a` on a list or an object makes a second reference, and both names stay good for as long as you like. The nearest everyday thing to a move is handing someone a paper ticket. You had it, now they have it, and at no point were there two." },
            { aside: "A move costs what copying three integers costs, and that is all that happens in the running program. No memory is cleared and nothing is counted. That a variable has been moved from is something the compiler knows about each line while it checks the program, and the knowledge is gone by the time the program runs." },
            { fromC: "A move is a shallow copy, plus a rule that the source is dead. It answers the question that the C strings lesson kept asking in comments, \"who owns this storage?\", and here the compiler holds you to the answer." },
          ],
        },
        {
          title: 'Copy types: when a move is only a copy',
          body: [
            "Lesson 2 assigned integers and arrays from one variable to another, and both stayed usable. Those were not exceptions to the rule. They are the cases where the rule has nothing to protect.",
            "An `i32` is four bytes in the frame and owns nothing else. Copying those bytes gives two complete, independent values, and there is nothing that could be freed twice. Types like that are marked `Copy`. Assigning one copies its bytes, as a move does, and the source stays usable.",
            { run: rs`fn main() {
    let a = 5;
    let b = a;                      // a copy: both stay usable

    let point = (3.5, 'x');
    let same = point;               // a tuple of Copy types is Copy

    let mut grid = [1, 2, 3];
    let saved = grid;               // and so is an array of them
    grid[0] = 99;

    println!("{a} {b} {point:?} {same:?} {grid:?} {saved:?}");
}`, name: 'copy.rs', expect: "5 5 (3.5, 'x') (3.5, 'x') [99, 2, 3] [1, 2, 3]\n" },
            { table: {
              head: ['`Copy`: assignment copies', 'Not `Copy`: assignment moves'],
              rows: [
                ['Every integer and floating-point type', '`String`'],
                ['`bool` and `char`', '`Vec<T>`, whatever `T` is'],
                ['A tuple or an array whose parts are all `Copy`: `(i32, f64)`, `[u8; 16]`', '`Box<T>`, whatever `T` is'],
                ['A shared reference, `&T`, which lesson 6 introduces', 'A tuple or an array with any part that is not `Copy`: `(i32, String)`, `[String; 2]`'],
              ],
            } },
            "The test is whether copying the bytes in the frame gives a complete, independent value. For a type that owns a heap buffer it does not: the copy would be a second handle to the same buffer, which is the bug the first trace showed. A type that does something when it is dropped can never be `Copy`.",
            "One part that is not `Copy` is enough to make the whole value move, including the parts that are.",
            { run: rs`fn main() {
    let entry = (1, String::from("one"));
    let other = entry;                  // the whole tuple moves, the number too
    println!("{} {}", entry.0, other.1);
}`, name: 'mixed_tuple.rs', fails: 'E0382' },
            "The word **trait** in the error message means a named ability that a type can have. `Copy` is the ability to be duplicated by copying bytes. Lesson 15 covers traits, and lesson 11 shows how to give the ability to a type of your own. Until you do, your own types move.",
            { pitfall: "`Copy` is decided by the type and not by the size. A `[u8; 4096]` is `Copy`, and assigning it copies four thousand bytes without a word. A `String` that holds one letter is not, and assigning it copies 24 bytes. Do not read `Copy` as meaning small." },
            { native: "rust-analyzer shows the type of every variable beside its name, so you can tell at a glance whether an assignment will move or copy. `cargo clippy` reports a `.clone()` called on a `Copy` type, where it does nothing that a plain assignment would not." },
          ],
        },
        {
          title: 'clone: the explicit deep copy',
          body: [
            "When you do want two independent strings, say so. `clone` allocates a new buffer, copies the contents into it, and returns a new value that owns it. The original is untouched.",
            { run: rs`fn main() {
    let a = String::from("hello");
    let mut b = a.clone();              // a second buffer with the same bytes
    b.push_str(", world");
    println!("{a}");
    println!("{b}");
}`, name: 'clone.rs', expect: 'hello\nhello, world\n' },
            { trace: {
              title: 'A clone: two owners, two buffers',
              code: rs`fn main() {
    let a = String::from("hello");
    let mut b = a.clone();
    b.make_ascii_uppercase();
    println!("{a} {b}");
}`,
              vars: [
                { id: 'a', type: 'String' },
                { id: 'b', type: 'String' },
                { id: 'buf', name: 'buffer of a', type: 'u8', len: 5, frame: 'heap' },
                { id: 'copy', name: 'buffer of b', type: 'u8', len: 5, frame: 'heap' },
              ],
              steps: [
                { line: 2, set: { a: { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('hello') }, say: "`a` owns a buffer of five bytes." },
                { line: 3, set: { b: { ptr: '&copy', len: 5, cap: 5 }, copy: bytes('hello') }, say: "`clone` asks the allocator for a second buffer and copies the five bytes into it. This is the expensive operation that an assignment refused to do behind your back. `a` is not moved, and stays usable." },
                { line: 4, set: { copy: bytes('HELLO') }, say: "Changing `b` changes its own buffer. The buffer of `a` is a different block of memory." },
                { line: 5, say: "Both variables are usable, and the line prints `hello HELLO`." },
                { line: 6, dead: ['buf', 'copy'], hide: ['a', 'b'], say: "Each owner is dropped and frees its own buffer. Two allocations, and two frees." },
              ],
            } },
            "What a clone costs depends on the type. For a `String` it is one allocation and a copy of the text. A collection clones everything it owns, all the way down:",
            { run: rs`fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];
    let mut backup = names.clone();     // three allocations: the list, and each name
    backup.push(String::from("Linus"));
    println!("{names:?}");
    println!("{backup:?}");
}`, name: 'clone_deep.rs', expect: '["Ada", "Grace"]\n["Ada", "Grace", "Linus"]\n' },
            { compare: "`clone` is `copy.deepcopy` in Python and `structuredClone` in JavaScript. A PHP array is the one place you have had it for free: `$b = $a` gives an independent array, with the copying put off until one of the two is changed. What differs is the default. Those languages share unless you ask for a copy, and a forgotten copy is a bug in which two parts of a program change one object. Rust moves unless you ask for a copy, and a forgotten copy is a compile error." },
            { pitfall: "The `help:` line suggests `.clone()` for nearly every move error, and it always compiles. Reaching for it by reflex gives you a program that allocates on every other line. Treat each `clone` as a decision: do I need two independent values here? Often the better fix is to reorder two lines, to take the value back from a function, or to borrow, which is lesson 6. Several challenges in this lesson forbid `clone` for that reason." },
          ],
        },
        {
          title: 'Functions take ownership',
          body: [
            "Passing an argument is an assignment to the parameter, so it follows the same rule. A `Copy` value is copied. Anything else moves into the function. The parameter is the new owner, and when the function returns, the parameter goes out of scope and the value is dropped.",
            { trace: {
              title: 'A `String` moves into a function and is dropped there',
              code: rs`fn announce(message: String) {
    println!("{message}");
}

fn main() {
    let text = String::from("hello");
    announce(text);
    println!("back in main");
}`,
              vars: [
                { id: 'text', type: 'String' },
                { id: 'announce.message', name: 'message', type: 'String', frame: 'announce' },
                { id: 'buf', name: 'buffer', type: 'u8', len: 5, frame: 'heap' },
              ],
              steps: [
                { line: 6, set: { text: { ptr: '&buf', len: 5, cap: 5 }, buf: bytes('hello') }, say: "`text` owns the buffer." },
                { line: 7, set: { 'announce.message': { ptr: '&buf', len: 5, cap: 5 } }, moved: ['text'], say: "The call copies the three words into the parameter `message`, in the new frame, and `text` is moved from. The buffer has not been copied and has not changed address. Only its owner is different." },
                { line: 2, say: "`announce` uses its parameter like any local variable." },
                { line: 3, dead: ['buf'], hide: ['frame:announce'], say: "`announce` returns. `message` goes out of scope, and it is the owner, so the buffer is freed here, inside the call." },
                { line: 8, say: "Back in `main`, `text` is still in the frame and still unusable. The value it used to own no longer exists." },
                { line: 9, hide: ['text'], say: "`main` ends. There is nothing left to free." },
              ],
            } },
            "Using `text` after the call is the use after free from lesson 4: it would read a buffer that `announce` has already freed. It does not compile.",
            { run: rs`fn announce(message: String) {
    println!("{message}");
}

fn main() {
    let text = String::from("hello");
    announce(text);
    println!("{}", text.len());
}`, name: 'moved_into_call.rs', fails: 'E0382' },
            "This time there is a `note:` as well. It points at the parameter and says that it takes ownership, and it suggests changing the parameter to borrow instead. That is the fix you will usually want, and lesson 6 teaches it.",
            "A `Copy` argument is copied into the parameter, so the caller's variable is untouched. Every function in Part 1 worked this way.",
            { run: rs`fn square(n: i32) -> i32 {
    n * n
}

fn main() {
    let side = 7;
    println!("{}", square(side));
    println!("{side}");                // still usable: the call copied it
}`, name: 'copy_into_call.rs', expect: '49\n7\n' },
            "Lesson 3 said that the compiler checks a call against the signature of the function and never looks inside its body. Here is the payoff. A parameter of type `String` means: give me this value, and I will keep it or destroy it. You can tell from the signature alone whether your variable survives a call.",
            { compare: "In Python or JavaScript, passing a list to a function gives the function a reference to your list. Whether it will only read the list, change it, or keep it in a global for later is something you learn from the documentation, or from a bug. A Rust signature states it. `String` takes the value away. The two borrowing forms in lessons 6 and 7 are the other two possibilities: look, and change." },
          ],
        },
        {
          title: 'Returning gives ownership back',
          body: [
            "A return value moves the other way: out of the function and into the caller's variable. This is how a value outlasts the function that made it.",
            { run: rs`fn make_label(id: u32) -> String {
    let label = format!("item-{id}");      // label owns a new buffer
    label                                  // moved out to the caller, so it is not dropped here
}

fn main() {
    let first = make_label(7);             // first is the owner now
    println!("{first}");
}`, name: 'return_moves.rs', expect: 'item-7\n' },
            "`label` is a local variable of `make_label`, and that frame is discarded on return. The text survives because ownership of the buffer moved to `first` before the frame went. Three words were copied, and the heap was not touched.",
            "A function can take a value, change it, and hand it back. A parameter can be declared `mut` like any other variable. The function owns the value, so it may change it.",
            { run: rs`fn shout(mut text: String) -> String {
    text.make_ascii_uppercase();           // changes the buffer in place
    text.push('!');
    text                                   // and gives the value back
}

fn main() {
    let quiet = String::from("hello");
    let loud = shout(quiet);               // quiet moves in, and the value comes back as loud
    println!("{loud}");
}`, name: 'take_and_return.rs', expect: 'HELLO!\n' },
            "Now the awkward case. A function that only wants to look at a `String` still takes it away from the caller. To let the caller go on using the value, the function has to hand it back, next to its real answer:",
            { run: rs`fn measure(text: String) -> (String, usize) {
    let length = text.len();
    (text, length)                         // the String goes back, with the answer
}

fn main() {
    let title = String::from("Ownership");
    let (title, length) = measure(title);  // take it back, under the same name
    println!("{title} is {length} bytes long");
}`, name: 'give_it_back.rs', expect: 'Ownership is 9 bytes long\n' },
            "This works, and it is clumsy. Every function that only reads a value has to return it, and every caller has to catch it again. What you want is to **lend** the value: let the function use it while you remain the owner. That is a reference, written `&`, and lesson 6 is about it. In this lesson's challenges you will pass values in and take them back the long way, so that you know what references save you from.",
            { aside: "Returning a `String` does not copy its text, however long it is. Only the three words travel, and the compiler usually arranges for the function to build them directly in the caller's frame, so that even they are not copied." },
          ],
        },
        {
          title: 'Moves in everyday code',
          body: [
            "Most `E0382` errors come from a handful of situations. Here they are, with the way out of each.",
            "**In a loop.** The body of a loop runs many times, and a value can only be moved once.",
            { run: rs`fn announce(message: String) {
    println!("{message}");
}

fn main() {
    let text = String::from("hello");
    for _ in 0..3 {
        announce(text);
    }
}`, name: 'moved_in_loop.rs', fails: 'E0382' },
            "The label says `value moved here, in previous iteration of loop`. The first pass gives `text` away, and the second has nothing to give. If `announce` handed the value back, as `measure` did, each pass could take it back:",
            { run: rs`fn announce(message: String) -> String {
    println!("{message}");
    message                              // hand it back
}

fn main() {
    let mut text = String::from("hello");
    for _ in 0..3 {
        text = announce(text);           // moved out, and moved back in
    }
    println!("{} bytes, and still ours", text.len());
}`, name: 'loop_take_back.rs', expect: 'hello\nhello\nhello\n5 bytes, and still ours\n' },
            "That cell also shows that a variable which has been moved from is not gone for good. Assigning it a new value makes it usable again, and `text = announce(text)` does so on every pass. The variable has to be `mut`.",
            "The compiler does not run your program to see which lines are reached. It follows every path the code could take. A move inside a loop is accepted when no pass can come after it:",
            { run: rs`fn consume(text: String) {
    println!("consumed {text}");
}

fn main() {
    let text = String::from("once");
    for attempt in 1..=3 {
        println!("attempt {attempt}");
        if attempt == 2 {
            consume(text);
            break;                       // no pass can follow the move
        }
    }
}`, name: 'move_then_break.rs', expect: 'attempt 1\nattempt 2\nconsumed once\n' },
            "**A `for` loop over a `Vec`.** Writing `for name in names` moves the whole list into the loop, which then hands you its elements one at a time, each one yours to keep. When the loop ends, the list is gone.",
            { run: rs`fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];
    for name in names {
        println!("{name}");
    }
    println!("{}", names.len());
}`, name: 'loop_takes_the_list.rs', fails: 'E0382' },
            "The `help:` line suggests `&names`, which lends the list to the loop. Until lesson 6, either loop over the indexes with `for i in 0..names.len()`, or let the loop have the list when you are finished with it.",
            "**Out of a `Vec` by index.** Indexing with a `Copy` element copies it out, as `scores[1]` did in lesson 4. Suppose that indexing could move a `String` out in the same way.",
            { memory: {
              title: 'Not what Rust does: `let first = names[0];` moves a `String` out of the buffer',
              vars: [
                { id: 'names', type: 'Vec<String>' },
                { id: 'first', type: 'String' },
                { id: 'e0', name: 'buffer[0]', type: 'String', frame: 'heap' },
                { id: 'e1', name: 'buffer[1]', type: 'String', frame: 'heap', addr: 0x3018 },
                { id: 'ada', name: 'text', type: 'u8', len: 3, frame: 'heap' },
              ],
              set: { names: { ptr: '&e0', len: 2, cap: 2 }, first: { ptr: '&ada', len: 3, cap: 3 }, e0: { ptr: '&ada', len: 3, cap: 3 }, e1: { ptr: '0x3040', len: 5, cap: 5 }, ada: bytes('Ada') },
              caption: "`first` and slot 0 of the buffer both hold a handle to the same three bytes. The text of the second name is left out of the picture. At the closing brace `first` is dropped and frees them. Then `names`, which still has a length of 2, drops both of its elements and frees the same three bytes again.",
            } },
            "The compiler can mark a variable as moved from, because it follows each variable by name. It cannot follow each index, because an index is computed while the program runs. So it refuses.",
            { run: rs`fn main() {
    let names = vec![String::from("Ada"), String::from("Grace")];
    let first = names[0];
    println!("{first}");
}`, name: 'move_out_of_index.rs', fails: 'E0507' },
            "To take an element out, use a method that also tells the `Vec` it is gone. To leave it in place, clone it, or borrow it once you have read lesson 6.",
            { run: rs`fn main() {
    let mut names = vec![String::from("Ada"), String::from("Grace"), String::from("Linus")];

    let copy = names[0].clone();          // a new String; the Vec keeps its own
    let last = names.pop();               // moves the last element out, if there is one
    let first = names.remove(0);          // moves element 0 out and shifts the rest down
    println!("{copy} {last:?} {first} {names:?}");
}`, name: 'take_from_vec.rs', expect: 'Ada Some("Linus") Ada ["Grace"]\n' },
            { list: [
              "`pop` returns an `Option`, because the list may be empty. Lesson 13 covers `Option`.",
              "`remove(i)` keeps the order, and pays for it by moving every later element down one place.",
              "`swap_remove(i)` moves element `i` out and puts the last element in its place. It is the cheap one when the order does not matter.",
            ] },
            "**Out of a tuple, one field at a time.** Fields are different from indexes. They have names the compiler can see, so it tracks each one separately. After one field has moved out, the others are still usable.",
            { run: rs`fn main() {
    let pair = (String::from("left"), String::from("right"));
    let left = pair.0;                    // moves one field out
    println!("{left} {}", pair.1);        // the other field is still in place

    let both = (String::from("up"), String::from("down"));
    let (up, down) = both;                // or take the tuple apart, moving every field
    println!("{up} {down}");
}`, name: 'partial_move.rs', expect: 'left right\nup down\n' },
            "What you lose is the tuple as a whole. It has a hole in it, and the compiler says so.",
            { run: rs`fn main() {
    let pair = (String::from("left"), String::from("right"));
    let left = pair.0;
    println!("{left} {pair:?}");
}`, name: 'partially_moved.rs', fails: 'E0382' },
            { tip: "When `E0382` appears, find the line labeled `value moved here` and ask what you meant by it. If the move was intended, the later use is the mistake. If it was not, the fix belongs on that line: a value taken back, a reference from lesson 6, or a `clone`." },
          ],
        },
      ],
      takeaways: [
        "Every value has exactly one owner, and is dropped when that owner goes out of scope.",
        "Assigning a value, passing it to a function and returning it all move it. The bytes in the frame are copied, nothing on the heap is touched, and the source can no longer be used.",
        "`Copy` types are copied instead, and the source stays usable: numbers, `bool`, `char`, and tuples and arrays made only of those.",
        "`clone` makes an independent deep copy, and its cost is visible in the source. Use it when you need two values, not to quiet the compiler.",
        "A signature says whether a call takes your value. A function that only looks at a value must hand it back, until lesson 6 introduces references.",
        "`E0382` means a value was used after it moved. Use the new owner, reorder, take the value back, or clone.",
      ],
      quiz: [
        {
          q: 'The compiler rejects one line of this program. Which one?',
          code: rs`fn consume(text: String) {
    println!("{text}");
}

fn main() {
    let note = String::from("remember");
    let copy = note.clone();
    let moved = note;
    consume(copy);
    println!("{moved}");
    println!("{note}");
}`,
          options: [
            { t: 'Line 11: `note` was moved to `moved` on line 8', ok: true, why: "Line 8 moves the value out of `note`, so line 11 has nothing to print. Every other line uses a variable that still owns its value at that point." },
            { t: 'Line 8: `note` cannot be moved after it has been cloned', why: "`clone` only reads `note`. It leaves the value whole, and the value can be moved afterward like any other." },
            { t: 'Line 10: `moved` shares a buffer with `copy`, which `consume` has freed', why: "That is how it would go wrong if `clone` copied only the handle, as an assignment does in Python. `clone` made a second buffer, so `copy` and `moved` have nothing in common, and freeing one does not touch the other." },
            { t: 'Line 9: `copy` came from `note`, which has been moved', why: "A clone is independent of its source from the moment it exists. What happens to `note` later does not affect it." },
          ],
          verify: 'E0382',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`fn bump(mut n: i32) -> i32 {
    n += 1;
    n
}

fn main() {
    let a = 10;
    let b = a;
    let c = bump(a);
    let mut pair = (a, b);
    let saved = pair;
    pair.0 = 99;
    println!("{a} {b} {c} {} {}", pair.0, saved.0);
}`,
          answer: '10 10 11 99 10',
          explain: "Every value here is `Copy`. `bump` changes its own copy of `a`, so `a` is still 10. `saved` is a copy of the tuple made before `pair.0` was changed, so it still holds 10.",
          hint: "Nothing in this program moves. Each assignment and each call makes an independent copy.",
        },
        {
          q: 'How many allocations does line 3 make?',
          code: rs`fn main() {
    let team = vec![String::from("Ada"), String::from("Grace"), String::from("Linus")];
    let backup = team.clone();
    println!("{} {}", team.len(), backup.len());
}`,
          options: [
            { t: 'Four: one for the new list, and one for each of the three names', ok: true, why: "Cloning a `Vec` allocates a new buffer and clones every element into it. Each element is a `String`, and cloning a `String` allocates a buffer for its text." },
            { t: 'One: the new list holds the same three names', why: "That is a shallow copy, which is what `list.copy()` in Python and the spread syntax in JavaScript make. In Rust two lists cannot own the same `String`, so `clone` copies each name as well." },
            { t: 'None: `clone` copies the three words in the frame', why: "Copying the three words is what a move does. `clone` exists to do what a move does not: make a second buffer with the same contents." },
            { t: 'Three: one for each name, and the list buffer is shared', why: "A buffer has one owner. `backup` needs a buffer of its own to hold its three `String` handles." },
          ],
          explain: "The later challenges in this lesson count allocations, so you can watch a clone cost one.",
        },
        {
          kind: 'multi',
          q: 'Which of these types are `Copy`?',
          options: [
            { t: '`u64`', ok: true, why: "Eight bytes that own nothing else." },
            { t: '`(i32, bool)`', ok: true, why: "A tuple is `Copy` when every part of it is." },
            { t: '`[f64; 3]`', ok: true, why: "An array is `Copy` when its element type is." },
            { t: '`char`', ok: true, why: "Four bytes that own nothing else." },
            { t: '`String`', why: "It owns a heap buffer. Copying its three words would make a second owner of that buffer." },
            { t: '`Vec<u8>`', why: "The elements are `Copy`, but the `Vec` owns the buffer they live in, and a buffer has one owner." },
            { t: '`(i32, String)`', why: "One part that is not `Copy` is enough to make the whole tuple move." },
            { t: '`Box<i32>`', why: "An `i32` is `Copy`. A `Box` holding one is not, because the box owns a heap allocation." },
          ],
          hint: "Four of them. Ask of each type whether it owns anything on the heap.",
        },
        {
          q: 'Does this program compile?',
          code: rs`fn consume(text: String) {
    println!("{text}");
}

fn main() {
    let text = String::from("once");
    for attempt in 1..=3 {
        if attempt == 2 {
            consume(text);
        }
    }
}`,
          options: [
            { t: 'No: the call is inside a loop, and the compiler cannot rule out reaching it twice', ok: true, why: "You can see that the condition holds on one pass only. The compiler does not evaluate conditions. It sees a move that a later pass of the loop could reach again, and reports `E0382` with the label `value moved here, in previous iteration of loop`." },
            { t: 'Yes: the condition is true only once, so `text` is moved only once', why: "That is true when the program runs, and the compiler does not run it. It checks every path the code could take, and one of those paths reaches the call on two different passes." },
            { t: 'Yes: each pass of the loop gets its own copy of `text`', why: "Nothing is copied unless you call `clone`. There is one `String`, declared before the loop." },
            { t: 'No: `text` would have to be declared `mut` to be moved', why: "Moving a value out of a variable does not need `mut`. Only changing the value, or assigning the variable again, does." },
          ],
          explain: "A `break` after the call makes it compile, as in the lesson, because then no pass can follow the move.",
          verify: 'E0382',
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: rs`struct Noisy(&'static str);

impl Drop for Noisy {
    fn drop(&mut self) {
        println!("drop {}", self.0);
    }
}

fn consume(value: Noisy) {
    println!("consume has {}", value.0);
}

fn main() {
    let a = Noisy("a");
    let b = Noisy("b");
    consume(a);
    let _c = b;
    println!("end of main");
}`,
          answer: 'consume has a\ndrop a\nend of main\ndrop b',
          explain: "`a` moves into `consume`, which owns it from then on and drops it when it returns, before `end of main`. `b` moves to `_c`, which is dropped at the end of `main`. Each value is dropped once, by whoever owns it last, and a variable that was moved from drops nothing.",
          hint: "A value is dropped when its current owner goes out of scope. Who owns `a` after the call begins?",
        },
        {
          q: 'Why is `String` not a `Copy` type?',
          options: [
            { t: 'Copying its three words would give two owners of one buffer, and each would free it', ok: true, why: "A copy of the handle is not an independent value. Both copies would point at the same heap buffer, and both would free it when dropped. So assignment moves, and a real copy has to be asked for with `clone`." },
            { t: 'A `String` is too large to copy cheaply', why: "Size is not the test. A `[u8; 4096]` is `Copy`, and the part of a `String` that an assignment copies is only 24 bytes." },
            { t: 'A `String` can be changed, and `Copy` types are read-only', why: "An `i32` declared with `let mut` can be changed, and it is `Copy`. Mutability and `Copy` have nothing to do with each other." },
            { t: 'Text can contain characters that take several bytes', why: "That affects how a `String` is indexed, which lesson 9 covers. It has no bearing on who owns the buffer." },
          ],
        },
      ],
      challenges: [
        {
          id: 'use-after-move',
          title: 'Length first',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          forbid: ['clone'],
          prompt: [
            "`with_length` should hand back the tag it was given, together with the tag's length in bytes. It does not compile. Read the diagnostic to see where `tag` moves and where it is used afterward.",
            "Fix it without `clone`. The tests check that the `String` that comes back is the one that went in.",
          ],
          signature: 'fn with_length(tag: String) -> (String, usize)',
          starter: rs`fn with_length(tag: String) -> (String, usize) {
    (tag, tag.len())
}`,
          hints: [
            "The parts of a tuple are evaluated from left to right. By the time `tag.len()` runs, `tag` has already moved into the tuple.",
            "`tag.len()` gives a `usize`, which is `Copy`. Once the length is in a variable of its own, it no longer depends on `tag`.",
            "Put `let length = tag.len();` on a line of its own, then return `(tag, length)`.",
          ],
          solution: rs`fn with_length(tag: String) -> (String, usize) {
    let length = tag.len();     // read the length while tag still owns the text
    (tag, length)               // then move tag into the result
}`,
          tests: [
            { label: 'Returns the tag and its length', body: rs`let (tag, length) = with_length(String::from("urgent"));
assert_eq!(tag, "urgent");
assert_eq!(length, 6);` },
            { label: 'An empty tag has length 0', body: rs`let (tag, length) = with_length(String::new());
assert_eq!(tag, "");
assert_eq!(length, 0);` },
            { label: 'A longer tag', body: rs`let (tag, length) = with_length(String::from("needs review today"));
assert_eq!(tag, "needs review today");
assert_eq!(length, 18);` },
            { label: 'Hands back the same buffer, not a copy of it', body: rs`let original = String::from("fragile");
let address = original.as_ptr();
let (tag, _) = with_length(original);
assert!(tag.as_ptr() == address, "the tag that came back is a copy in a new buffer");` },
          ],
        },
        {
          id: 'give-it-back',
          title: 'Give it back',
          level: 'warm-up',
          prompt: [
            "`total` takes a list of scores, adds them up, and hands the list back together with the sum, so that the caller can go on using it.",
            "The starter adds correctly. Then it returns a new, empty list, and the caller's list is dropped at the closing brace. Return the list that was passed in.",
          ],
          signature: 'fn total(scores: Vec<i32>) -> (Vec<i32>, i32)',
          starter: rs`fn total(scores: Vec<i32>) -> (Vec<i32>, i32) {
    let mut sum = 0;
    for i in 0..scores.len() {
        sum += scores[i];
    }
    (Vec::new(), sum)
}`,
          hints: [
            "When the loop ends, the function still owns `scores`. Indexing reads an `i32`, which is `Copy`, so nothing has moved.",
            "Moving `scores` into the tuple hands it to the caller: `(scores, sum)`.",
          ],
          solution: rs`fn total(scores: Vec<i32>) -> (Vec<i32>, i32) {
    let mut sum = 0;
    for i in 0..scores.len() {
        sum += scores[i];
    }
    (scores, sum)
}`,
          tests: [
            { label: 'Adds up the scores', body: rs`let (_, sum) = total(vec![70, 85, 92]);
assert_eq!(sum, 247);` },
            { label: 'Gives the list back unchanged', body: rs`let (scores, _) = total(vec![70, 85, 92]);
assert_eq!(scores, [70, 85, 92]);` },
            { label: 'An empty list comes back empty, with a total of 0', body: rs`let (scores, sum) = total(Vec::new());
assert_eq!(scores.len(), 0);
assert_eq!(sum, 0);` },
            { label: 'The caller gets its own buffer back, not a copy of it', body: rs`let scores = vec![1, 2, 3];
let address = scores.as_ptr();
let (scores, _) = total(scores);
assert!(scores.as_ptr() == address, "the list that came back is a different one");` },
            { label: 'The list can be passed in and taken back again', body: rs`let scores = vec![1, 2, 3];
let (scores, first) = total(scores);
let (scores, second) = total(scores);
assert_eq!((first, second), (6, 6));
assert_eq!(scores, [1, 2, 3]);` },
          ],
        },
        {
          id: 'moved-in-loop',
          title: 'Bar by bar',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          forbid: ['clone'],
          prompt: [
            "`add_bar` is written for you. It takes a chart, adds one row of `#` characters to it, and returns it. `build_chart(3)` should produce three rows, of 1, 2 and 3 characters, each ending in a newline.",
            "The starter does not compile. The first call to `add_bar` takes `chart` away, which leaves nothing for the second pass of the loop, or for the last line. Fix it without `clone`. Look at what `add_bar` returns.",
          ],
          signature: 'fn build_chart(rows: u32) -> String',
          prelude: rs`/// Adds one row to the chart: width '#' characters and a newline. Hands the chart back.
fn add_bar(mut chart: String, width: u32) -> String {
    for _ in 0..width {
        chart.push('#');
    }
    chart.push('\n');
    chart
}`,
          starter: rs`fn build_chart(rows: u32) -> String {
    let chart = String::new();
    for width in 1..=rows {
        add_bar(chart, width);
    }
    chart
}`,
          hints: [
            "`add_bar` returns the chart it was given, with a row added. The starter throws that return value away.",
            "A variable that has been moved from can be assigned a new value, and is usable again from then on. Assigning needs `let mut`.",
            "Declare `let mut chart`, and write `chart = add_bar(chart, width);` in the loop.",
          ],
          solution: rs`fn build_chart(rows: u32) -> String {
    let mut chart = String::new();
    for width in 1..=rows {
        chart = add_bar(chart, width);     // moved in, and the result moved back
    }
    chart
}`,
          tests: [
            { label: 'Three rows', body: rs`assert_eq!(build_chart(3), "#\n##\n###\n");` },
            { label: 'One row', body: rs`assert_eq!(build_chart(1), "#\n");` },
            { label: 'No rows', body: rs`assert_eq!(build_chart(0), "");` },
            { label: 'Twelve rows end with a bar of twelve', body: rs`let chart = build_chart(12);
assert!(chart.ends_with("\n############\n"), "the last row is wrong");
assert_eq!(chart.len(), 90);` },
          ],
        },
        {
          id: 'swap-owners',
          title: 'Swap owners',
          level: 'core',
          track: true,
          prompt: [
            "`swap_owners` takes a pair of strings and returns them the other way around. The starter does it the way the compiler's `help:` line would suggest: it clones both strings, which is two allocations and two copies of text. The originals are then dropped at the closing brace.",
            "The function owns the pair, so it can move the strings instead. Return the same two strings, swapped, without allocating. The tests count allocations, and check that the buffers that come back are the ones that went in.",
          ],
          signature: 'fn swap_owners(pair: (String, String)) -> (String, String)',
          starter: rs`fn swap_owners(pair: (String, String)) -> (String, String) {
    let first = pair.0.clone();
    let second = pair.1.clone();
    (second, first)
}`,
          hints: [
            "A move copies three words and allocates nothing. The function owns `pair`, so it is free to move the fields out of it.",
            "Fields can be moved out one at a time, as `pair.0` and `pair.1`, or all at once with `let (first, second) = pair;`.",
            "`(pair.1, pair.0)` is a complete body.",
          ],
          solution: rs`fn swap_owners(pair: (String, String)) -> (String, String) {
    let (first, second) = pair;     // move both fields out of the tuple
    (second, first)                 // and into a new one, the other way around
}`,
          tests: [
            { label: 'Swaps the two strings', body: rs`let swapped = swap_owners((String::from("left"), String::from("right")));
assert_eq!(swapped.0, "right");
assert_eq!(swapped.1, "left");` },
            { label: 'Works when one of them is empty', body: rs`let swapped = swap_owners((String::new(), String::from("only")));
assert_eq!(swapped.0, "only");
assert_eq!(swapped.1, "");` },
            { label: 'Allocates nothing', body: rs`let pair = (String::from("left"), String::from("right"));
let before = allocation_count();
let swapped = swap_owners(pair);
assert_eq!(allocation_count() - before, 0, "allocations made by swap_owners");
assert_eq!(swapped.0, "right");` },
            { label: 'Returns the buffers it was given', body: rs`let pair = (String::from("left"), String::from("right"));
let (left, right) = (pair.0.as_ptr(), pair.1.as_ptr());
let swapped = swap_owners(pair);
assert!(swapped.0.as_ptr() == right && swapped.1.as_ptr() == left, "the strings that came back are copies");` },
          ],
        },
        {
          id: 'clone-only-once',
          title: 'One clone fewer',
          level: 'core',
          track: true,
          prompt: [
            "`copies(text, n)` returns a list of `n` strings, each equal to `text`. The starter clones `text` once for every one of them. Then the function ends, and the original, which it owns, is dropped unused.",
            "The original can be one of the `n`. Clone only as often as you must: once to get two strings, `n - 1` times to get `n`, and not at all when `n` is 1. When `n` is 0, return an empty list.",
            "The tests count allocations. The list's buffer is one, and it is already reserved at its final size. Each clone is one more.",
          ],
          signature: 'fn copies(text: String, n: usize) -> Vec<String>',
          starter: rs`fn copies(text: String, n: usize) -> Vec<String> {
    let mut all = Vec::with_capacity(n);
    for _ in 0..n {
        all.push(text.clone());
    }
    all
}`,
          hints: [
            "The loop cannot push `text` itself: the first pass would move it, and the second would have nothing to push. But the loop does not have to make all `n`.",
            "Let the loop make `n - 1` clones with `for _ in 1..n`. That range is empty when `n` is 0 or 1.",
            "After the loop, `text` is still yours to move. `if n > 0 { all.push(text); }` puts the original in as the last element.",
          ],
          solution: rs`fn copies(text: String, n: usize) -> Vec<String> {
    let mut all = Vec::with_capacity(n);
    for _ in 1..n {
        all.push(text.clone());     // n - 1 clones
    }
    if n > 0 {
        all.push(text);             // the original goes in last, by a move
    }
    all
}`,
          tests: [
            { label: 'Returns n equal strings', body: rs`assert_eq!(copies(String::from("ab"), 3), ["ab", "ab", "ab"]);
assert_eq!(copies(String::from("solo"), 1), ["solo"]);` },
            { label: 'No copies: an empty list, and no allocation', body: rs`let text = String::from("ab");
let before = allocation_count();
let all = copies(text, 0);
assert_eq!(all.len(), 0);
assert_eq!(allocation_count() - before, 0, "allocations made by copies(text, 0)");` },
            { label: 'One copy needs no clone', body: rs`let text = String::from("only");
let before = allocation_count();
let all = copies(text, 1);
assert_eq!(allocation_count() - before, 1, "allocations made by copies(text, 1): the list, and no clones");
assert_eq!(all, ["only"]);` },
            { label: 'Four copies need three clones', body: rs`let text = String::from("echo");
let before = allocation_count();
let all = copies(text, 4);
assert_eq!(allocation_count() - before, 4, "allocations made by copies(text, 4): the list, and three clones");
assert_eq!(all, ["echo", "echo", "echo", "echo"]);` },
            { label: 'The original is one of the results', body: rs`let text = String::from("echo");
let address = text.as_ptr();
let all = copies(text, 3);
let mut found = false;
for i in 0..all.len() {
    if all[i].as_ptr() == address {
        found = true;
    }
}
assert!(found, "every result is a clone, and the original was dropped");` },
          ],
        },
        {
          id: 'take-the-longest',
          title: 'Take the longest',
          level: 'stretch',
          track: true,
          prompt: [
            "`take_longest` is given a list of words and returns the longest. If several are equally long, it returns the first of them. For an empty list it returns an empty `String`.",
            "The starter finds the right word and then clones it. Writing `words[best]` alone would be `E0507`, because a `Vec` does not let an element be moved out by index. But the function owns the whole list, and the list is about to be dropped anyway.",
            "Move the winning word out instead of copying it. The tests check that nothing is allocated, and that the `String` returned is the very one that was in the list.",
          ],
          signature: 'fn take_longest(words: Vec<String>) -> String',
          starter: rs`fn take_longest(words: Vec<String>) -> String {
    if words.is_empty() {
        return String::new();
    }
    let mut best = 0;
    for i in 1..words.len() {
        if words[i].len() > words[best].len() {
            best = i;
        }
    }
    words[best].clone()
}`,
          hints: [
            "There are two ways to move a `String` out of a `Vec` that you own: a method that removes one element, or a `for` loop over the list itself, which hands you every element in turn.",
            "The first way: declare the parameter as `mut words: Vec<String>`, keep the search as it is, and end with `words.swap_remove(best)`.",
            "The second way: start with `let mut longest = String::new();`. Then `for word in words { if word.len() > longest.len() { longest = word; } }`, and return `longest`.",
          ],
          solution: rs`fn take_longest(words: Vec<String>) -> String {
    let mut longest = String::new();       // an empty String has no buffer
    for word in words {                    // the loop takes the list, and hands over one word at a time
        if word.len() > longest.len() {
            longest = word;                // move the word in; the previous longest is dropped
        }
    }
    longest
}`,
          solutionNote: "The other way keeps the starter's search. Declare the parameter as `mut words`, and replace the last line with `words.swap_remove(best)`, which moves one element out and fills the gap with the last one.",
          tests: [
            { label: 'Finds the longest word', body: rs`let words = vec![String::from("fig"), String::from("banana"), String::from("kiwi")];
assert_eq!(take_longest(words), "banana");` },
            { label: 'The first of several equally long words wins', body: rs`let words = vec![String::from("fig"), String::from("pear"), String::from("plum")];
assert_eq!(take_longest(words), "pear");` },
            { label: 'A single word, and an empty list', body: rs`assert_eq!(take_longest(vec![String::from("alone")]), "alone");
assert_eq!(take_longest(Vec::new()), "");` },
            { label: 'Allocates nothing', body: rs`let words = vec![String::from("fig"), String::from("banana"), String::from("kiwi")];
let before = allocation_count();
let longest = take_longest(words);
assert_eq!(allocation_count() - before, 0, "allocations made by take_longest");
assert_eq!(longest, "banana");` },
            { label: 'Returns the String that was in the list, not a copy', body: rs`let words = vec![String::from("fig"), String::from("banana"), String::from("kiwi")];
let address = words[1].as_ptr();
let longest = take_longest(words);
assert!(longest.as_ptr() == address, "the String returned has a buffer of its own");` },
          ],
        },
      ],
    },
  );
})();
