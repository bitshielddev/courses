// Part 2: Pointers and arrays. The core of the course.
(() => {
  const c = String.raw;
  const part = 'Part 2 · Pointers & arrays';

  (window.C_LESSONS ||= []).push(
    {
      id: 'memory',
      title: 'Memory, objects & addresses',
      category: part,
      minutes: 18,
      summary: 'Before pointers make sense, variables have to stop being names and become places. This lesson builds that picture.',
      topics: ['Addresses', 'Objects', 'Stack, heap, static', 'Copy semantics'],
      sections: [
        {
          title: 'Memory is a row of numbered bytes',
          body: [
            "A running program sees its memory as one long row of bytes. Each byte has a number, its **address**. A variable is a run of consecutive bytes somewhere in that row. The C standard calls such a run an **object**, a word that has nothing to do with classes.",
            "The type of an object answers two questions: how many bytes it occupies, and how to interpret them.",
            { memory: {
              title: 'Three local variables',
              vars: [
                { id: 'count', type: 'int' },
                { id: 'grade', type: 'char' },
                { id: 'ratio', type: 'double' },
              ],
              set: { count: 7, grade: "'B'", ratio: 0.5 },
              caption: "The left column is each object's address. These are invented and kept short: real addresses are longer and change from run to run. `count` takes four bytes, so `grade` starts four further on.",
            } },
            "Look at the gap between `grade` and `ratio`. A `char` needs one byte, yet `ratio` starts four bytes later. Most types must begin at an address that is a multiple of their own size, and the compiler leaves unused **padding** bytes to arrange it. The structs lesson returns to this.",
          ],
        },
        {
          title: 'Asking where something is',
          body: [
            "The unary `&` operator gives the address of an object. `printf` prints an address with `%p`, which expects the type `void *`, hence the cast.",
            { run: c`#include <stdio.h>

int main(void) {
    int first = 10;
    int second = 20;
    double wide = 1.5;

    printf("first  is at %p and holds %d\n", (void *)&first, first);
    printf("second is at %p and holds %d\n", (void *)&second, second);
    printf("wide   is at %p and holds %.1f\n", (void *)&wide, wide);
    printf("sizes: %zu %zu %zu\n", sizeof first, sizeof second, sizeof wide);
    return 0;
}`, name: 'addresses.c', varies: true },
            "Run it. The particular numbers are unimportant. What matters is that every variable has one, that neighbors sit a few bytes apart, and that an address is just a number the program can print, store and pass around.",
            "`&` needs something that has a location: a variable, an array element such as `values[2]`, or a struct member such as `point.x`. A bare value has none, so `&5` and `&(a + b)` do not compile.",
          ],
        },
        {
          title: 'Three places an object can live',
          body: [
            "Where an object is stored decides how long it exists. There are three regions, and you met their lifetimes in the last lesson.",
            { table: {
              head: ['Region', 'What lives there', 'Created', 'Destroyed'],
              rows: [
                ['Static storage', 'Variables outside functions, `static` locals, string literals', 'Before `main` starts', 'When the program exits'],
                ['The stack', 'Parameters and ordinary locals', 'On entry to their function or block', 'On leaving it'],
                ['The heap', 'Blocks you request with `malloc`', 'When you ask', 'When you call `free`'],
              ],
            } },
            { memory: {
              title: 'One object in each region',
              vars: [
                { id: 'attempts', type: 'int', frame: 'main' },
                { id: 'block', name: '(unnamed)', type: 'int', frame: 'heap' },
                { id: 'launches', type: 'int', frame: 'static' },
              ],
              set: { attempts: 3, block: 42, launches: 0 },
              caption: "The regions sit far apart in the address space. Heap objects have no names. The only way to reach one is through its address, which is one of the reasons pointers exist.",
            } },
            "This matters because an address stays the same number after the object behind it is gone. Every pointer bug in this part of the manual is some version of holding an address for longer than the object lasted, or of stepping outside the object.",
          ],
        },
        {
          title: 'Assignment copies bytes',
          body: [
            "`b = a` copies the bytes of `a` into the bytes of `b`. Afterward there are two independent objects with equal contents. That holds for every type, including structs, which are copied whole.",
            { run: c`#include <stdio.h>

struct Point { int x, y; };

int main(void) {
    struct Point a = { 1, 2 };
    struct Point b = a;      // Copies both members. b is a separate object.
    b.x = 99;

    printf("a.x=%d b.x=%d\n", a.x, b.x);
    printf("different addresses: %d\n", &a != &b);
    return 0;
}`, name: 'copies.c', expect: 'a.x=1 b.x=99\ndifferent addresses: 1\n' },
            { compare: [
              "This is the mental model to replace. In Python, `b = a` makes `b` a second name for the same list. JavaScript and PHP objects behave the same way: variables hold references, and assignment shares.",
              "In C a variable does not refer to storage somewhere else. It **is** the storage. Assignment copies, passing an argument copies, and returning copies. Nothing is ever shared unless you share an address yourself, and when you do, it is visible in the code as a `&` or a `*`.",
            ] },
          ],
        },
        {
          title: 'Nothing checks your reads and writes',
          body: [
            "C will read or write through any address you give it. It does not check that an object lives there, that the object has the type you claim, or that you are still inside the array you started in. There is no bounds check and no null check.",
            "Touching memory that is not a live object of the right type is **undefined behavior**. The standard places no requirements at all on what happens next. In practice you see one of these:",
            { list: [
              "The operating system stops the program: a segmentation fault. This is the lucky case, because you find out.",
              "The read returns whatever bytes happened to be there.",
              "The write silently changes some unrelated variable, and the program misbehaves much later, somewhere else.",
              "Nothing visible happens today, and it breaks after an unrelated change or a compiler upgrade.",
            ] },
            { aside: "A program in this page gets one flat block of WebAssembly memory with no protected regions, so a bad read here usually returns garbage instead of crashing. Even address 0 is readable. On your Mac the same mistake very often ends in `Segmentation fault`. Neither outcome is promised by the language, and that is the point." },
            "The rest of Part 2 is about holding addresses and using them while staying inside what you own.",
          ],
        },
      ],
      takeaways: [
        "An object is a run of bytes at an address. Its type gives the length and the interpretation.",
        "`&x` is the address of `x`.",
        "Static storage, the stack and the heap differ in how long their objects live.",
        "Assignment, argument passing and return all copy. Sharing happens only through addresses.",
        "C does not check memory accesses. A bad one is undefined behavior, which may or may not crash.",
      ],
      quiz: [
        {
          q: 'After these three lines, what is the value of `a`?',
          code: c`int a = 5;
int b = a;
b = 9;`,
          options: [
            { t: '5', ok: true, why: "`b = a` copied the value into a separate object. Changing `b` afterward has nothing to do with `a`." },
            { t: '9', why: "That would need `b` to be another name for `a`. In C each variable is its own storage, and assignment copies." },
            { t: 'Indeterminate', why: "Both variables were initialized. Nothing here is indeterminate." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these objects still exist after the function that created them has returned?',
          options: [
            { t: 'A local declared `static int calls;`', ok: true, why: "A `static` local has static storage duration and lasts for the whole program." },
            { t: 'A variable declared outside any function', ok: true, why: "Static storage: it exists from before `main` until exit." },
            { t: 'A block from `malloc` that has not been freed', ok: true, why: "Heap memory lasts until `free` is called on it, regardless of which function allocated it." },
            { t: 'An ordinary local `int total;`', why: "Automatic storage: gone when the function returns." },
            { t: 'One of the function\'s parameters', why: "Parameters are locals. They live in the function's stack frame." },
          ],
          hint: "Three do. Only the stack is tied to function calls.",
        },
        {
          q: 'What does the expression `&total` evaluate to?',
          options: [
            { t: 'The value stored in `total`', why: "That is what plain `total` gives you." },
            { t: 'The address at which `total` is stored', ok: true, why: "Unary `&` produces the location of its operand. The next lesson gives that value a type: pointer to whatever `total` is." },
            { t: 'A copy of `total`', why: "`&` does not copy the object. It reports where the object is." },
            { t: 'The size of `total` in bytes', why: "That is `sizeof total`." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    int grid[5] = { 0 };
    printf("%zu %zu\n", sizeof grid[0], sizeof grid);
    return 0;
}`,
          answer: '4 20',
          explain: "One element is an `int`, four bytes. The array is five of them in a row with nothing else: no length field, no header.",
        },
        {
          q: 'Which of these expressions does not compile?',
          options: [
            { t: '`&count`', why: "A variable has a location, so its address can be taken." },
            { t: '`&values[2]`', why: "An array element is an object with a location." },
            { t: '`&(count + 1)`', ok: true, why: "`count + 1` is a computed value, not an object. It has no address to take." },
            { t: '`&point.x`', why: "A struct member is an object inside the struct, with its own address." },
          ],
        },
        {
          q: 'A program reads through an address where no object lives. What does C guarantee?',
          options: [
            { t: 'The program stops with an error', why: "A crash is common on desktop systems, but nothing in the language promises one." },
            { t: 'The read returns 0', why: "It returns whatever is there, if it returns at all." },
            { t: 'Nothing: the behavior is undefined', ok: true, why: "It might crash, return garbage, or appear to work. That uncertainty is why these bugs are hard to find and why the later lessons spend so much time on staying in bounds." },
          ],
        },
      ],
      challenges: [
        {
          id: 'same-object',
          title: 'Same value or same object?',
          level: 'warm-up',
          prompt: [
            "The parameters `a` and `b` each hold the address of an `int`. The next lesson covers the `const int *` type properly. For now you only need two facts: comparing `a == b` compares the two addresses, and `*a` is the `int` stored at address `a`.",
            "Write both functions. `same_object` is true when the two addresses are the same address. `same_value` is true when the two ints are equal, wherever they live.",
          ],
          signature: 'bool same_object(const int *a, const int *b)\nbool same_value(const int *a, const int *b)',
          starter: c`bool same_object(const int *a, const int *b) {
    return false;
}

bool same_value(const int *a, const int *b) {
    return false;
}`,
          hints: [
            "`same_object` compares the addresses themselves: `a == b`.",
            "`same_value` compares what is stored at them: `*a == *b`.",
          ],
          solution: c`bool same_object(const int *a, const int *b) {
    return a == b;
}

bool same_value(const int *a, const int *b) {
    return *a == *b;
}`,
          tests: [
            { label: 'Two variables holding equal values are different objects', body: c`int first = 7;
int second = 7;
CHECK(same_value(&first, &second));
CHECK(!same_object(&first, &second));` },
            { label: 'A variable is the same object as itself', body: c`int only = 3;
CHECK(same_object(&only, &only));
CHECK(same_value(&only, &only));` },
            { label: 'Different values', body: c`int first = 1;
int second = 2;
CHECK(!same_value(&first, &second));
CHECK(!same_object(&first, &second));` },
          ],
        },
        {
          id: 'swapped-copy',
          title: 'Return a changed copy',
          level: 'warm-up',
          prompt: "A struct argument is copied into the function, and a struct return value is copied back out. Return a `Pair` whose members are those of `pair` exchanged. The caller's struct is unaffected whatever you do.",
          prelude: c`struct Pair {
    int first;
    int second;
};`,
          signature: 'struct Pair swapped(struct Pair pair)',
          starter: c`struct Pair swapped(struct Pair pair) {
    return pair;
}`,
          hints: [
            "`pair` is your own copy, so you may modify it freely and then return it.",
            "Exchanging two members needs a temporary `int`.",
          ],
          solution: c`struct Pair swapped(struct Pair pair) {
    int saved = pair.first;
    pair.first = pair.second;
    pair.second = saved;
    return pair;
}`,
          tests: [
            { label: 'Returns the members exchanged', body: c`struct Pair original = { 1, 2 };
struct Pair result = swapped(original);
CHECK(result.first == 2 && result.second == 1);` },
            { label: 'Leaves the argument alone', body: c`struct Pair original = { 5, -5 };
swapped(original);
CHECK(original.first == 5 && original.second == -5);` },
            { label: 'Equal members', body: c`struct Pair original = { 4, 4 };
struct Pair result = swapped(original);
CHECK(result.first == 4 && result.second == 4);` },
          ],
        },
        {
          id: 'byte-at',
          title: 'Pick out one byte',
          level: 'core',
          prompt: "A `uint32_t` is four bytes. Number them by significance, with byte 0 the least significant, so that the value `0x11223344` has byte 0 equal to `0x44` and byte 3 equal to `0x11`. Return the requested byte. `index` is always 0, 1, 2 or 3.",
          signature: 'uint8_t byte_at(uint32_t value, unsigned index)',
          starter: c`uint8_t byte_at(uint32_t value, unsigned index) {
    return 0;
}`,
          hints: [
            "Shifting right by 8 moves byte 1 into the position of byte 0.",
            "Shift right by `8 * index`, then keep the low eight bits with `& 0xFF`.",
          ],
          solution: c`uint8_t byte_at(uint32_t value, unsigned index) {
    return (value >> (8 * index)) & 0xFF;
}`,
          tests: [
            { label: 'The least significant byte', body: c`CHECK(byte_at(0x11223344u, 0) == 0x44);` },
            { label: 'The middle bytes', body: c`CHECK(byte_at(0x11223344u, 1) == 0x33);
CHECK(byte_at(0x11223344u, 2) == 0x22);` },
            { label: 'The most significant byte', body: c`CHECK(byte_at(0x11223344u, 3) == 0x11);` },
            { label: 'High bits do not leak into the result', body: c`CHECK(byte_at(0xFFFFFF00u, 0) == 0x00);
CHECK(byte_at(0xABCDEF01u, 3) == 0xAB);` },
          ],
        },
      ],
    },

    {
      id: 'pointers',
      title: 'Pointers & dereferencing',
      category: part,
      minutes: 40,
      summary: 'A pointer is a variable that holds an address. This lesson covers taking addresses, following them, passing them to functions, and the ways a pointer goes bad.',
      topics: ['&', '*', 'Aliasing', 'Out-parameters', 'NULL', 'Dangling pointers'],
      sections: [
        {
          title: 'A pointer is a variable that holds an address',
          body: [
            "You can take the address of an object with `&`. A **pointer** is a variable whose value is such an address. Its type records what kind of object lives there.",
            { code: c`int score = 10;
int *p = &score;     // p is a pointer to int, holding the address of score.` },
            { memory: {
              title: '`p` points to `score`',
              vars: [
                { id: 'score', type: 'int' },
                { id: 'p', type: 'int *' },
              ],
              set: { score: 10, p: '&score' },
              caption: "`p` is an ordinary variable with storage and an address of its own. What it stores is the address of `score`. The arrow is only a way to draw that.",
            } },
            "Every pointer type names its target: `int *` points to an `int`, `double *` to a `double`, `char *` to a `char`. The address itself is the same kind of number in every case. The target type tells the compiler how many bytes to read at that address and how to interpret them.",
          ],
        },
        {
          title: 'Dereferencing: following the address',
          body: [
            "The unary `*` operator follows a pointer. If `p` points to `score`, then `*p` **is** `score`: not a copy of its value, but the same object under another name. You can read it and you can assign to it.",
            { run: c`#include <stdio.h>

int main(void) {
    int score = 10;
    int *p = &score;

    printf("score = %d, *p = %d\n", score, *p);
    *p = 11;                    // Write through the pointer.
    printf("score = %d\n", score);
    score = 12;                 // Change the variable directly.
    printf("*p = %d\n", *p);
    printf("p == &score: %d\n", p == &score);
    return 0;
}`, name: 'deref.c', expect: 'score = 10, *p = 10\nscore = 11\n*p = 12\np == &score: 1\n' },
            "`&` and `*` undo each other. `*&score` is `score`, and `&*p` is `p`.",
            { compare: "A Python or JavaScript variable that holds an object is a reference you can never see or manipulate: the language follows it for you every time. A C pointer is that reference made into a value. You create it with `&`, you follow it with `*`, and nothing happens automatically." },
          ],
        },
        {
          title: 'One symbol, two jobs',
          body: [
            "The star means different things in a declaration and in an expression, and this is the main source of early confusion.",
            { table: {
              head: ['Code', 'Where', 'Meaning'],
              rows: [
                ['`int *p;`', 'A declaration', '`p` is a pointer to `int`. The star is part of the type.'],
                ['`*p = 5;`', 'An expression', 'The object that `p` points to. The star is an operator.'],
                ['`&x`', 'An expression', 'The address of `x`.'],
                ['`a * b`', 'Between two values', 'Multiplication.'],
              ],
            } },
            "The declaration syntax was designed to look like the use. `int *p;` can be read as: `*p` is an `int`. Once that clicks, declarations stop looking arbitrary.",
            { pitfall: [
              "In a declaration, the star belongs to the name and not to the type on the left:",
              { code: c`int* a, b;      // a is a pointer to int. b is a plain int.
int *c, *d;     // Both are pointers.` },
              "This is why this manual writes `int *p` with the star against the name. The safest habit is one declaration per line.",
            ] },
          ],
        },
        {
          title: 'Two pointers, one object',
          body: [
            "Copying a pointer copies the address, not the object it points to. Afterward two pointers lead to one object, which is called **aliasing**. Step through this and watch which box each line changes.",
            { trace: {
              title: 'Re-aiming a pointer versus writing through it',
              code: c`int x = 3;
int y = 9;
int *p = &x;
int *q = p;
p = &y;
*q = 7;
*p = *q + 1;`,
              vars: [
                { id: 'x', type: 'int' },
                { id: 'y', type: 'int' },
                { id: 'p', type: 'int *' },
                { id: 'q', type: 'int *' },
              ],
              steps: [
                { line: 1, set: { x: 3 }, say: "An `int` called `x`." },
                { line: 2, set: { y: 9 }, say: "Another, called `y`." },
                { line: 3, set: { p: '&x' }, say: "`p` holds the address of `x`." },
                { line: 4, set: { q: '&x' }, say: "`q = p` copies the address stored in `p`. Now both point to `x`. No `int` was copied or changed." },
                { line: 5, set: { p: '&y' }, say: "Assigning to `p` itself changes where `p` points. `q` still points to `x`, and neither `int` has changed." },
                { line: 6, set: { x: 7 }, say: "Assigning to `*q` changes the object `q` points to. That object is `x`." },
                { line: 7, set: { y: 8 }, say: "`*q` reads `x`, which is 7. Adding 1 gives 8, and `*p` stores it in `y`." },
              ],
            } },
            "Keep these two operations apart and most pointer code becomes readable: `p = …` changes where the pointer points, and `*p = …` changes the thing it points to.",
          ],
        },
        {
          title: 'Passing addresses to functions',
          body: [
            "Arguments are still copied. But when the argument is an address, the function's copy holds the same address, so the function can reach the caller's object through it. This is how a C function changes a variable that belongs to its caller.",
            { trace: {
              title: 'swap works on its caller\'s variables',
              code: c`void swap(int *a, int *b) {
    int saved = *a;
    *a = *b;
    *b = saved;
}

int main(void) {
    int left = 1;
    int right = 2;
    swap(&left, &right);
    printf("%d %d\n", left, right);
    return 0;
}`,
              vars: [
                { id: 'left', type: 'int', frame: 'main' },
                { id: 'right', type: 'int', frame: 'main' },
                { id: 'a', type: 'int *', frame: 'swap' },
                { id: 'b', type: 'int *', frame: 'swap' },
                { id: 'saved', type: 'int', frame: 'swap' },
              ],
              steps: [
                { line: 8, set: { left: 1 }, say: "`main` declares `left`." },
                { line: 9, set: { right: 2 }, say: "And `right`." },
                { line: 10, set: { a: '&left', b: '&right' }, say: "The call evaluates `&left` and `&right` and copies those two addresses into the parameters `a` and `b`, which live in a new frame for `swap`." },
                { line: 2, set: { saved: 1 }, say: "`*a` follows `a` back into `main`'s frame and reads `left`. The value 1 is saved locally." },
                { line: 3, set: { left: 2 }, say: "`*b` reads `right`, and `*a = …` stores it in `left`. `swap` has just modified a variable it cannot name." },
                { line: 4, set: { right: 1 }, say: "The saved value goes into `right` through `b`." },
                { line: 5, hide: ['frame:swap'], say: "`swap` returns. Its frame, with `a`, `b` and `saved`, is gone. The changes it made to `main`'s variables remain." },
                { line: 11, say: "`main` prints `2 1`." },
              ],
            } },
            { compare: "In Python and JavaScript you cannot write a `swap(a, b)` for two integers at all. In PHP you would declare `function swap(&$a, &$b)` and the call would look like any other. C puts the `&` at the call site, where you can see it. If a call passes `x` and not `&x`, the function cannot change `x`." },
          ],
        },
        {
          title: 'Out-parameters',
          body: [
            "A function has one return value. The standard way to produce more is to take pointers to places where the extra results should go. A very common shape returns success or failure and delivers the actual answer through a pointer.",
            { run: c`#include <stdbool.h>
#include <stdio.h>

// Returns false if there is nothing to average, leaving *result untouched.
bool average(int total, int count, double *result) {
    if (count == 0) {
        return false;
    }
    *result = (double)total / count;
    return true;
}

int main(void) {
    double mean = 0.0;
    if (average(17, 4, &mean)) {
        printf("mean = %.2f\n", mean);
    }
    if (!average(17, 0, &mean)) {
        puts("nothing to average");
    }
    return 0;
}`, name: 'outparam.c', expect: 'mean = 4.25\nnothing to average\n' },
            "You have used this pattern from the outside already: `snprintf` fills a buffer whose address you supply. Much of the standard library works this way.",
          ],
        },
        {
          title: 'NULL: a pointer to nothing',
          body: [
            "`NULL` is a pointer value that is guaranteed not to point to any object. It is how C says not found, not set, or not wanted. A pointer converts to false when it is null and true otherwise.",
            { code: c`int *found = NULL;          // Deliberately points at nothing.

if (found != NULL) {        // Or simply: if (found)
    printf("%d\n", *found); // Only dereference after checking.
}` },
            "Dereferencing a null pointer is undefined behavior. On your Mac it reliably crashes, which makes it the easiest pointer bug to find. In this page it does not crash at all, as the last lesson explained, so do not use a crash as your test.",
            { tip: "An API that fills optional results often accepts `NULL` to mean that the caller does not want that one. The function then has to check each pointer before writing through it. You will write one in the challenges." },
          ],
        },
        {
          title: 'Pointers that outlive what they point to',
          body: [
            "A pointer does not keep its target alive. There is no reference count and no garbage collector watching. If the object goes away, the pointer keeps the same number and becomes a **dangling pointer**.",
            { trace: {
              title: 'Returning the address of a local',
              code: c`int *newest(void) {
    int value = 42;
    return &value;
}

int main(void) {
    int *p = newest();
    printf("%d\n", *p);
    return 0;
}`,
              vars: [
                { id: 'p', type: 'int *', frame: 'main' },
                { id: 'value', type: 'int', frame: 'newest' },
              ],
              steps: [
                { line: 7, show: ['p'], say: "`main` has a pointer `p`. It has no value until the call to `newest` returns." },
                { line: 2, set: { value: 42 }, say: "Inside `newest`, `value` lives in that call's stack frame." },
                { line: 3, say: "The function returns the address of `value`. The address is a perfectly good number." },
                { line: 7, set: { p: '&value' }, hide: ['frame:newest'], say: "`newest` has returned and its frame has been released. `p` holds an address where no object lives any more." },
                { line: 8, say: "`*p` reads memory that now belongs to whichever function is called next. This is undefined behavior. It often prints 42 anyway, because nothing has reused the bytes yet, which makes the bug easy to miss." },
              ],
            } },
            "There are three ways to end up with a pointer you must not follow:",
            { list: [
              "**Uninitialized.** `int *p;` followed by `*p = 5;` writes through whatever garbage address `p` happens to contain.",
              "**Dangling.** The target's lifetime ended: a local whose function returned, or a heap block that was freed.",
              "**Out of bounds.** The pointer was moved past the end of the array it started in. That is the subject of the arrays lessons.",
            ] },
            "A function may safely return a pointer to something that outlives the call: static storage, heap memory, or an object the caller passed in.",
          ],
        },
      ],
      takeaways: [
        "`&x` produces the address of `x`. `*p` is the object `p` points to.",
        "`p = …` changes where `p` points. `*p = …` changes what it points to.",
        "A function can change a caller's variable only if it is handed that variable's address.",
        "Check for `NULL` before dereferencing a pointer that may be null.",
        "A pointer does not keep its target alive. It must not be used after the target is gone.",
      ],
      quiz: [
        {
          q: 'What are `x` and `y` after the last assignment?',
          code: c`int x = 3;
int y = 9;
int *p = &x;
int *q = p;
p = &y;
*q = 7;`,
          options: [
            { t: 'x = 3, y = 7', why: "Re-aiming `p` did not move `q`. `q` still holds the address of `x`." },
            { t: 'x = 7, y = 9', ok: true, why: "`q` received a copy of the address of `x`. Writing through `q` changes `x`. The assignment to `p` only changed where `p` points." },
            { t: 'x = 3, y = 9', why: "The last line writes through `q` to the `int` at the address it holds, so something changed." },
          ],
        },
        {
          q: 'Given `double rate = 0.5;`, which declaration correctly stores the address of `rate`?',
          options: [
            { t: '`double p = &rate;`', why: "`p` would be a `double`, and an address is not a `double`." },
            { t: '`double *p = rate;`', why: "This tries to use the value 0.5 as an address. You need `&rate`." },
            { t: '`double *p = &rate;`', ok: true, why: "`p` has type pointer to `double`, and `&rate` is the address of a `double`." },
            { t: '`int *p = &rate;`', why: "The pointer's target type must match the object. Reading a `double` through an `int *` would misinterpret its bytes." },
          ],
        },
        {
          q: 'What are the types of `a` and `b`?',
          code: c`int* a, b;`,
          options: [
            { t: 'Both are pointers to `int`', why: "The star attaches to the name that follows it, not to `int`. Only `a` gets it." },
            { t: '`a` is a pointer to `int`, and `b` is an `int`', ok: true, why: "Write `int *a, *b;` for two pointers, or better, declare one variable per line." },
            { t: 'Both are `int`', why: "`a` does have a star in front of it once the spacing is ignored." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    int a = 1;
    int b = 2;
    int *p = &a;
    *p += b;
    p = &b;
    *p *= 10;
    printf("%d %d\n", a, b);
    return 0;
}`,
          answer: '3 20',
          explain: "While `p` points to `a`, `*p += b` makes `a` 3. Then `p` is re-aimed at `b`, and `*p *= 10` makes `b` 20.",
          hint: "Track where `p` points before each line that uses `*p`.",
        },
        {
          q: 'After `clear(q)` returns, what is true of `q`?',
          code: c`void clear(int *p) {
    p = NULL;
}

int main(void) {
    int n = 5;
    int *q = &n;
    clear(q);
    /* here */
}`,
          options: [
            { t: '`q` is `NULL`', why: "`clear` set its own parameter `p` to `NULL`. That parameter is a copy of `q`." },
            { t: '`q` still points to `n`', ok: true, why: "A pointer argument is passed by value like any other. To change the caller's pointer, the function would need the address of the pointer, which a later lesson covers." },
            { t: '`n` is 0', why: "Nothing in `clear` writes through the pointer. `*p = 0` would have done that." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

void bump_both(int *a, int *b) {
    *a += 1;
    *b += 1;
}

int main(void) {
    int n = 5;
    bump_both(&n, &n);
    printf("%d\n", n);
    return 0;
}`,
          answer: '7',
          explain: "Both parameters hold the address of the same `int`, so both increments land on `n`.",
        },
        {
          kind: 'multi',
          q: 'Which of these have undefined behavior?',
          options: [
            { t: '`int *p; *p = 1;`', ok: true, why: "`p` was never given an address. It writes through whatever value it happens to hold." },
            { t: '`int *p = NULL; if (p) { *p = 1; }`', why: "The check prevents the dereference." },
            { t: '`int x = 1; int *p = &x; *p = 2;`', why: "An ordinary write to a live object." },
            { t: '`int *p = NULL; *p = 1;`', ok: true, why: "A null pointer does not point to an object." },
            { t: 'Calling a function that returns `&local` and reading through the result', ok: true, why: "The local was destroyed when the function returned. The pointer dangles." },
          ],
          hint: "For each one, ask whether the pointer holds the address of an object that exists at the moment of the dereference.",
        },
      ],
      challenges: [
        {
          id: 'swap-ints',
          title: 'Swap two integers',
          level: 'warm-up',
          prompt: "Exchange the values of the two `int` objects that `a` and `b` point to. Type it out yourself instead of copying the lesson: the point is to get `*` under your fingers.",
          signature: 'void swap_ints(int *a, int *b)',
          starter: c`void swap_ints(int *a, int *b) {
    // Exchange *a and *b.
}`,
          hints: [
            "Save `*a` in a local `int` before you overwrite it.",
            "Assigning `a = b` would only change your local copies of the addresses. Every assignment here needs a star.",
          ],
          solution: c`void swap_ints(int *a, int *b) {
    int saved = *a;
    *a = *b;
    *b = saved;
}`,
          tests: [
            { label: 'Exchanges two values', body: c`int first = 3;
int second = 8;
swap_ints(&first, &second);
CHECK(first == 8 && second == 3);` },
            { label: 'Works with negative values', body: c`int first = -1;
int second = 0;
swap_ints(&first, &second);
CHECK(first == 0 && second == -1);` },
            { label: 'Swapping a variable with itself changes nothing', body: c`int only = 6;
swap_ints(&only, &only);
CHECK(only == 6);` },
          ],
        },
        {
          id: 'order-pair',
          legacy: 'pointers',
          title: 'Put two values in order',
          level: 'core',
          prompt: "Given pointers to two `int` objects, rearrange the values if necessary so that `*first` is less than or equal to `*second`. The two pointers may also refer to the same object.",
          signature: 'void order_pair(int *first, int *second)',
          starter: c`void order_pair(int *first, int *second) {
    // Order the values through the pointers.
}`,
          hints: [
            "Compare `*first` with `*second`. Comparing `first` with `second` would compare addresses.",
            "When the values are the wrong way round, save one in a local `int` before overwriting it.",
          ],
          solution: c`void order_pair(int *first, int *second) {
    if (*first > *second) {
        int saved = *first;
        *first = *second;
        *second = saved;
    }
}`,
          tests: [
            { label: 'Swaps values that are out of order', body: c`int first = 14;
int second = -2;
order_pair(&first, &second);
CHECK(first == -2 && second == 14);` },
            { label: 'Leaves ordered values in place', body: c`int first = -5;
int second = 12;
order_pair(&first, &second);
CHECK(first == -5 && second == 12);` },
            { label: 'Handles two pointers to the same object', body: c`int value = 5;
order_pair(&value, &value);
CHECK(value == 5);` },
          ],
        },
        {
          id: 'divide',
          title: 'Divide with a status',
          level: 'core',
          prompt: [
            "Divide `dividend` by `divisor`. On success, store the quotient in `*quotient` and the remainder in `*remainder`, and return `true`.",
            "If `divisor` is zero, return `false` and store nothing. A caller that does not want one of the results passes `NULL` for it, and you must not write through a null pointer.",
          ],
          signature: 'bool divide(int dividend, int divisor, int *quotient, int *remainder)',
          starter: c`bool divide(int dividend, int divisor, int *quotient, int *remainder) {
    return false;
}`,
          hints: [
            "Deal with the zero divisor first, before touching either pointer.",
            "Guard each store separately: `if (quotient != NULL) { *quotient = …; }`",
          ],
          solution: c`bool divide(int dividend, int divisor, int *quotient, int *remainder) {
    if (divisor == 0) {
        return false;
    }
    if (quotient != NULL) {
        *quotient = dividend / divisor;
    }
    if (remainder != NULL) {
        *remainder = dividend % divisor;
    }
    return true;
}`,
          tests: [
            { label: 'Delivers both results', body: c`int quotient = 0;
int remainder = 0;
CHECK(divide(17, 5, &quotient, &remainder));
CHECK(quotient == 3 && remainder == 2);` },
            { label: 'Refuses to divide by zero and writes nothing', body: c`int quotient = 111;
int remainder = 222;
CHECK(!divide(17, 0, &quotient, &remainder));
CHECK(quotient == 111 && remainder == 222);` },
            { label: 'Accepts NULL for the remainder', body: c`int quotient = 0;
CHECK(divide(20, 6, &quotient, NULL));
CHECK(quotient == 3);` },
            { label: 'Accepts NULL for the quotient', body: c`int remainder = 0;
CHECK(divide(20, 6, NULL, &remainder));
CHECK(remainder == 2);` },
            { label: 'Accepts NULL for both', body: c`CHECK(divide(8, 2, NULL, NULL));
CHECK(!divide(8, 0, NULL, NULL));` },
          ],
        },
        {
          id: 'larger',
          title: 'Return a pointer',
          level: 'core',
          prompt: "Return whichever of the two pointers leads to the larger `int`. If the values are equal, return `a`. You are returning one of the addresses you were given, not a value and not the address of anything new.",
          signature: 'int *larger(int *a, int *b)',
          starter: c`int *larger(int *a, int *b) {
    return NULL;
}`,
          hints: [
            "Compare the values with `*a` and `*b`. Return `a` or `b`, without a star.",
            "Returning a pointer you were given is safe: the objects belong to the caller and outlive this call.",
          ],
          solution: c`int *larger(int *a, int *b) {
    return *b > *a ? b : a;
}`,
          tests: [
            { label: 'Returns the address of the larger value', body: c`int low = 3;
int high = 30;
CHECK(larger(&low, &high) == &high);
CHECK(larger(&high, &low) == &high);` },
            { label: 'Prefers the first on a tie', body: c`int first = 7;
int second = 7;
CHECK(larger(&first, &second) == &first);` },
            { label: 'The result can be written through', body: c`int low = -4;
int high = 9;
*larger(&low, &high) = 0;
CHECK(low == -4 && high == 0);` },
          ],
        },
        {
          id: 'clamp-to-zero',
          title: 'Missing stars',
          level: 'core',
          kind: 'fix',
          starterWarns: true,
          prompt: [
            "This function should set the caller's value to zero when it is negative, and report whether it changed anything. It compiles, with a warning, and does nothing useful.",
            "Read the warning, then decide for each use of `value` whether the code means the pointer or the `int` it points to.",
          ],
          signature: 'bool clamp_to_zero(int *value)',
          starter: c`// Sets *value to zero if it is negative.
// Returns true if it changed anything.
bool clamp_to_zero(int *value) {
    if (value < 0) {
        value = 0;
        return true;
    }
    return false;
}`,
          hints: [
            "`value < 0` compares an address with zero. The warning says so.",
            "`value = 0` makes the local pointer null. The caller never sees that. To store into the caller's `int`, write `*value = 0`.",
          ],
          solution: c`// Sets *value to zero if it is negative.
// Returns true if it changed anything.
bool clamp_to_zero(int *value) {
    if (*value < 0) {
        *value = 0;
        return true;
    }
    return false;
}`,
          tests: [
            { label: 'Raises a negative value to zero', body: c`int reading = -12;
CHECK(clamp_to_zero(&reading));
CHECK(reading == 0);` },
            { label: 'Leaves a positive value alone', body: c`int reading = 12;
CHECK(!clamp_to_zero(&reading));
CHECK(reading == 12);` },
            { label: 'Zero counts as unchanged', body: c`int reading = 0;
CHECK(!clamp_to_zero(&reading));
CHECK(reading == 0);` },
          ],
        },
        {
          id: 'sort-three',
          title: 'Sort three values',
          level: 'stretch',
          prompt: "Rearrange three values through their pointers so that `*a <= *b <= *c`. The three pointers refer to three different objects. A helper function that orders two values will make this short.",
          signature: 'void sort_three(int *a, int *b, int *c)',
          starter: c`void sort_three(int *a, int *b, int *c) {
    // Three compare-and-swap steps are enough.
}`,
          hints: [
            "Write `static void order(int *x, int *y)` that swaps when `*x > *y`.",
            "Order `a` and `b`, then `b` and `c`. Now the largest is in `c`. One more step finishes the job.",
            "When you call the helper you already have pointers, so pass `a` and `b`, not `&a` and `&b`.",
          ],
          solution: c`static void order(int *x, int *y) {
    if (*x > *y) {
        int saved = *x;
        *x = *y;
        *y = saved;
    }
}

void sort_three(int *a, int *b, int *c) {
    order(a, b);
    order(b, c);
    order(a, b);
}`,
          tests: [
            { label: 'Reverses a descending triple', body: c`int a = 3, b = 2, c = 1;
sort_three(&a, &b, &c);
CHECK(a == 1 && b == 2 && c == 3);` },
            { label: 'Leaves a sorted triple alone', body: c`int a = 1, b = 2, c = 3;
sort_three(&a, &b, &c);
CHECK(a == 1 && b == 2 && c == 3);` },
            { label: 'Handles every other arrangement', body: c`int orders[4][3] = { { 1, 3, 2 }, { 2, 1, 3 }, { 2, 3, 1 }, { 3, 1, 2 } };
for (int i = 0; i < 4; ++i) {
    sort_three(&orders[i][0], &orders[i][1], &orders[i][2]);
    CHECK(orders[i][0] == 1 && orders[i][1] == 2 && orders[i][2] == 3);
}` },
            { label: 'Handles duplicates and negatives', body: c`int a = 5, b = -5, c = 5;
sort_three(&a, &b, &c);
CHECK(a == -5 && b == 5 && c == 5);` },
          ],
        },
      ],
    },

    {
      id: 'const-and-declarations',
      title: 'const & reading declarations',
      category: part,
      minutes: 25,
      summary: 'Where const goes and what it protects, and a reliable method for reading any C declaration, however many stars and brackets it has.',
      topics: ['const', 'Pointer to const', 'Declaration syntax', 'typedef'],
      sections: [
        {
          title: 'Two things can be const',
          body: [
            "A pointer involves two objects: the pointer, and the thing it points to. `const` can apply to either, and where you write it decides which.",
            { table: {
              head: ['Declaration', 'Read it as', '`*p = 1;`', '`p = &other;`'],
              rows: [
                ['`int *p`', 'pointer to `int`', 'allowed', 'allowed'],
                ['`const int *p`', 'pointer to `const int`', 'error', 'allowed'],
                ['`int *const p`', '`const` pointer to `int`', 'allowed', 'error'],
                ['`const int *const p`', '`const` pointer to `const int`', 'error', 'error'],
              ],
            } },
            "Read from the name leftward. In `int *const p`, the nearest thing to `p` is `const`, so the pointer itself is fixed. In `const int *p`, the nearest thing is `*`, so `p` is an ordinary pointer, and what it points to is a `const int`. Put briefly: `const` before the star protects the target, and `const` after the star pins the pointer.",
            "Remove the `//` from each error line in turn and read what the compiler says.",
            { run: c`#include <stdio.h>

int main(void) {
    int a = 1, b = 2;

    const int *view = &a;     // May not write through view.
    view = &b;                // Re-aiming it is fine.
    // *view = 5;             // error: read-only variable is not assignable

    int *const anchor = &a;   // May not be re-aimed.
    *anchor = 5;              // Writing through it is fine.
    // anchor = &b;           // error: cannot assign to variable 'anchor'

    printf("%d %d %d\n", a, *view, *anchor);
    return 0;
}`, name: 'const.c', expect: '5 2 5\n' },
            "`int const *p` means the same as `const int *p`. You will meet both spellings.",
          ],
        },
        {
          title: 'const restricts the pointer, not the object',
          body: [
            "`const int *view = &a;` does not make `a` constant. `a` is still an ordinary `int` and can change through its own name or through another pointer. The `const` says only that this particular pointer may not be used to change it. Think of it as a read-only view.",
            "Adding `const` is always safe, so the conversion from `int *` to `const int *` happens implicitly. Going the other way would discard a promise, so the compiler warns. If you force it with a cast and then write to an object that really was declared `const`, the behavior is undefined.",
            { code: c`int counter = 0;
const int *reader = &counter;    // Fine: adds a restriction.
counter = 1;                     // Fine: counter itself is not const.

const int limit = 10;
int *writer = &limit;            // warning: discards the const qualifier
*writer = 11;                    // Undefined behavior: limit is really const.` },
          ],
        },
        {
          title: 'const in function signatures',
          body: [
            "The most valuable use of `const` is on pointer parameters. It tells the caller that the function will only read through the pointer, and the compiler enforces it inside the function.",
            { code: c`size_t strlen(const char *s);                       // Reads s.
char *strcpy(char *dst, const char *src);           // Writes dst, reads src.
void *memcpy(void *dst, const void *src, size_t n); // Writes dst, reads src.` },
            "When you read an unfamiliar C API, the `const`s tell you which way the data flows. When you write one, make every pointer parameter `const` unless the function has to write through it. That also lets callers pass the address of data that is genuinely constant.",
            { run: c`#include <stdio.h>

int total(const int *a, const int *b) {   // Promises to read only.
    return *a + *b;
}

int main(void) {
    const int limit = 100;     // Genuinely read-only.
    int used = 40;             // An ordinary int.
    printf("%d\n", total(&limit, &used));   // Both are accepted.
    return 0;
}`, name: 'readonly.c', expect: '140\n' },
            { compare: "TypeScript's `readonly` and `Readonly<T>` are the closest relatives: a compile-time restriction on one reference, with no effect on the object or on other references to it. Python and PHP have nothing comparable for function parameters." },
          ],
        },
        {
          title: 'Reading a declaration from the inside out',
          body: [
            "Declarations combine three building blocks around a name: `*` on the left for pointer to, `[n]` on the right for array of, and `(parameters)` on the right for function taking. The method for reading any of them:",
            { steps: [
              "Start at the name.",
              "Read to the right while you can: `[n]` is “array of n”, `(…)` is “function taking … and returning”.",
              "Then read to the left: each `*` is “pointer to”.",
              "Parentheses group, exactly as in an expression. Finish what is inside a pair before stepping outside it.",
              "The type at the far left comes last.",
            ] },
            { table: {
              head: ['Declaration', 'Reading'],
              rows: [
                ['`int *ids[4]`', '`ids` is an array of 4 pointers to `int`'],
                ['`int (*row)[4]`', '`row` is a pointer to an array of 4 `int`s'],
                ['`int *find(void)`', '`find` is a function taking no arguments and returning a pointer to `int`'],
                ['`int (*op)(int)`', '`op` is a pointer to a function taking an `int` and returning `int`'],
                ['`const char *names[]`', '`names` is an array of pointers to `const char`'],
              ],
            } },
            "The right-hand side wins because `[]` and `()` are postfix operators and bind more tightly than the prefix `*`, the same precedence rule as in expressions. This is the mirror principle again: `int *ids[4]` says that `*ids[i]` is an `int`, and in that expression the index is applied first.",
            { widget: 'cdecl' },
          ],
        },
        {
          title: 'typedef: naming a type',
          body: [
            "`typedef` gives a type a new name. Write an ordinary declaration, put `typedef` in front, and the name you declared becomes the name of the type instead of a variable.",
            { code: c`typedef unsigned char Byte;                 // Byte is another name for unsigned char.
typedef struct Point Point;                 // Lets you write Point instead of struct Point.
typedef int (*Compare)(const void *, const void *);
                                            // Compare is a pointer-to-function type.

Byte flags = 0;
Compare order = NULL;` },
            "A `typedef` does not create a new type. `Byte` and `unsigned char` are completely interchangeable. Its job is readability, and it earns its keep most with function pointers, which a later lesson covers.",
            { pitfall: [
              "Avoid hiding a pointer inside a typedef. `const` then applies to the hidden pointer and not to what it points at:",
              { code: c`typedef char *String;
const String s = buffer;    // This is char *const s, not const char *s.
s[0] = 'x';                 // Allowed. The characters are not protected.` },
            ] },
          ],
        },
        {
          title: 'restrict and volatile, briefly',
          body: [
            "Two more qualifiers appear in real code. You will read them far more often than you write them.",
            { list: [
              "`restrict` on a pointer parameter is a promise by the caller that, during the call, the memory is reached only through that pointer. It lets the compiler optimize, and breaking the promise is undefined behavior. This is why `memcpy`, whose parameters are `restrict`, must not be given overlapping buffers.",
              "`volatile` tells the compiler that an object can change without the program touching it, or that reads and writes have effects of their own, so it must not optimize accesses away. It is used for hardware registers and for variables shared with signal handlers.",
            ] },
          ],
        },
      ],
      takeaways: [
        "`const` before the star protects the target. `const` after the star pins the pointer.",
        "A pointer to `const` is a read-only view. It says nothing about the object or about other pointers to it.",
        "Make pointer parameters `const` unless the function writes through them.",
        "Read declarations from the name outward: right first, then left, parentheses first of all.",
      ],
      quiz: [
        {
          q: 'Given `const char *msg = "hi";`, which of these statements compile?',
          options: [
            { t: 'Only `msg = "yo";`', ok: true, why: "`msg` is a non-const pointer to `const char`. It may be re-aimed, but the characters may not be changed through it." },
            { t: 'Only `msg[0] = \'H\';`', why: "The `const` sits before the star, so it protects the characters. This is the line the compiler rejects." },
            { t: 'Both', why: "Writing through `msg` is rejected because it points to `const char`." },
            { t: 'Neither', why: "The pointer itself is not `const`, so it can be pointed at a different string." },
          ],
        },
        {
          q: 'Given `int *const p = &a;`, what is allowed?',
          options: [
            { t: '`*p = 3;` is allowed, and `p = &b;` is not', ok: true, why: "`const` after the star applies to the pointer. The `int` it points to is freely writable." },
            { t: '`p = &b;` is allowed, and `*p = 3;` is not', why: "That describes `const int *p`, with the `const` before the star." },
            { t: 'Neither is allowed', why: "That would be `const int *const p`." },
          ],
        },
        {
          q: 'What is `names`?',
          code: c`char *names[4];`,
          options: [
            { t: 'A pointer to an array of 4 `char`s', why: "That would need parentheses: `char (*names)[4]`. Without them, `[4]` binds to the name first." },
            { t: 'An array of 4 pointers to `char`', ok: true, why: "Start at `names`, read right to find `[4]`, then left to find `*`: an array of 4 pointers to `char`." },
            { t: 'A 4-character string', why: "That is `char names[4]`, without the star." },
          ],
        },
        {
          q: 'What is `grid`?',
          code: c`int (*grid)[3];`,
          options: [
            { t: 'An array of 3 pointers to `int`', why: "That is `int *grid[3]`. Here the parentheses make the star bind to the name first." },
            { t: 'A pointer to an array of 3 `int`s', ok: true, why: "Inside the parentheses: `grid` is a pointer. Outside, to the right: to an array of 3. Then the base type: `int`. Adding 1 to it moves a whole row of three ints." },
            { t: 'A function returning a pointer to `int`', why: "A function declarator needs a parameter list in parentheses to the right of the name." },
          ],
        },
        {
          kind: 'multi',
          q: 'Given these declarations, which calls compile without a diagnostic?',
          code: c`void show(const int *p);
void bump(int *p);

const int limit = 3;
int n = 5;`,
          options: [
            { t: '`show(&n)`', ok: true, why: "`int *` converts to `const int *` implicitly. Adding a restriction is safe." },
            { t: '`show(&limit)`', ok: true, why: "The types match exactly." },
            { t: '`bump(&n)`', ok: true, why: "The types match exactly." },
            { t: '`bump(&limit)`', why: "`&limit` is a `const int *`. Passing it where an `int *` is wanted would let `bump` write to a constant, so the compiler warns." },
          ],
          hint: "A function that asks for a pointer to `const` accepts both kinds of argument. A function that asks for a plain pointer does not.",
        },
        {
          q: 'What does `const` protect here?',
          code: c`typedef char *String;
const String title = buffer;`,
          options: [
            { t: 'The characters: `title[0] = \'x\'` is an error', why: "The typedef hides a pointer, and `const` applies to that whole type, which is the pointer." },
            { t: 'The pointer: `title = other` is an error, but the characters can be changed', ok: true, why: "`const String` is `char *const`. This surprise is the usual argument against putting pointers inside typedefs." },
            { t: 'Both the pointer and the characters', why: "Only one `const` was written, and it landed on the pointer." },
          ],
        },
        {
          q: 'What is `lookup`?',
          code: c`double *(*lookup)(int);`,
          options: [
            { t: 'A function taking an `int` and returning a pointer to a pointer to `double`', why: "The parentheses around `*lookup` make `lookup` itself a pointer." },
            { t: 'A pointer to a function taking an `int` and returning a pointer to `double`', ok: true, why: "Inside the parentheses: a pointer. To the right: to a function taking `int`. To the left: returning a pointer. Base type: `double`." },
            { t: 'A pointer to a `double` function result', why: "Follow the steps: name, then right, then left, then the base type." },
          ],
        },
      ],
      challenges: [
        {
          id: 'copy-int',
          title: 'Put const where it belongs',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "`copy_int` copies one `int` to another through two pointers. Whoever wrote the signature put both `const`s in the wrong place, and the body no longer compiles.",
            "Fix the signature only. The function must be able to write through `dst`, must be unable to write through `src`, and must accept the address of a `const int` as its source.",
          ],
          signature: 'void copy_int(/* fix me */ dst, /* fix me */ src)',
          starter: c`// Copies the int at src into the int at dst.
void copy_int(const int *dst, int *const src) {
    *dst = *src;
}`,
          hints: [
            "`const int *dst` promises not to write through `dst`, which is the one thing this function has to do.",
            "`int *const src` pins the local pointer and protects nothing the caller cares about. The protection wanted is on the target: `const int *src`.",
          ],
          solution: c`// Copies the int at src into the int at dst.
void copy_int(int *dst, const int *src) {
    *dst = *src;
}`,
          tests: [
            { label: 'Copies the value', body: c`int source = 7;
int target = 0;
copy_int(&target, &source);
CHECK(target == 7 && source == 7);` },
            { label: 'Accepts a const source', body: c`const int source = -3;
int target = 0;
copy_int(&target, &source);
CHECK(target == -3);` },
            { label: 'The signature promises not to modify the source', body: c`CHECK(_Generic(&copy_int, void (*)(int *, const int *): 1, default: 0));` },
          ],
        },
        {
          id: 'four-declarations',
          title: 'Write four declarations',
          level: 'core',
          prompt: [
            "Each variable in the editor is described in a comment and declared, for now, as a plain `int`. Replace each declaration with one that matches its description.",
            "The tests check the exact type of each variable. Use the declaration reader in the lesson to check your work.",
          ],
          starter: c`int home = 0;

// scores: an array of 3 pointers to int
int scores;

// row: a pointer to an array of 3 ints
int row;

// label: a pointer to const char
int label;

// origin: a const pointer to int, pointing at home.
// A const variable has to be initialized where it is declared.
int origin;`,
          hints: [
            "`[3]` to the right of a name binds before `*` to its left, so `int *scores[3]` is already an array of pointers.",
            "To make the star bind first, wrap it with the name in parentheses: `int (*row)[3]`.",
            "For `origin`, the `const` goes after the star: `int *const origin = &home;`",
          ],
          solution: c`int home = 0;

// scores: an array of 3 pointers to int
int *scores[3];

// row: a pointer to an array of 3 ints
int (*row)[3];

// label: a pointer to const char
const char *label;

// origin: a const pointer to int, pointing at home.
// A const variable has to be initialized where it is declared.
int *const origin = &home;`,
          tests: [
            { label: 'scores is an array of 3 pointers to int', body: c`CHECK(_Generic(&scores, int *(*)[3]: 1, default: 0));` },
            { label: 'row is a pointer to an array of 3 ints', body: c`CHECK(_Generic(&row, int (**)[3]: 1, default: 0));` },
            { label: 'label is a pointer to const char', body: c`CHECK(_Generic(&label, const char **: 1, default: 0));` },
            { label: 'origin is a const pointer to int that points at home', body: c`CHECK(_Generic(&origin, int *const *: 1, default: 0));
CHECK((uintptr_t)origin == (uintptr_t)&home);` },
          ],
        },
        {
          id: 'closer-to-zero',
          title: 'A read-only result',
          level: 'core',
          prompt: "Return whichever pointer leads to the value nearer to zero. On a tie, return `a`. The function only reads, so it takes pointers to `const` and returns one. The values are small enough that negating them cannot overflow.",
          signature: 'const int *closer_to_zero(const int *a, const int *b)',
          starter: c`const int *closer_to_zero(const int *a, const int *b) {
    return a;
}`,
          hints: [
            "Work out the two distances from zero first: `*a < 0 ? -*a : *a`.",
            "Return `b` only when its distance is strictly smaller.",
          ],
          solution: c`const int *closer_to_zero(const int *a, const int *b) {
    int distance_a = *a < 0 ? -*a : *a;
    int distance_b = *b < 0 ? -*b : *b;
    return distance_b < distance_a ? b : a;
}`,
          tests: [
            { label: 'Compares positive values', body: c`const int near = 2;
const int far = 9;
CHECK(closer_to_zero(&near, &far) == &near);
CHECK(closer_to_zero(&far, &near) == &near);` },
            { label: 'Compares by distance, not by value', body: c`const int negative = -3;
const int positive = 8;
CHECK(closer_to_zero(&positive, &negative) == &negative);` },
            { label: 'Prefers the first on a tie', body: c`const int minus = -4;
const int plus = 4;
CHECK(closer_to_zero(&minus, &plus) == &minus);
CHECK(closer_to_zero(&plus, &minus) == &plus);` },
            { label: 'Works with ordinary ints too', body: c`int zero = 0;
int other = -1;
CHECK(closer_to_zero(&other, &zero) == &zero);` },
          ],
        },
      ],
    },

    {
      id: 'arrays',
      title: 'Arrays & how they decay',
      category: part,
      minutes: 35,
      summary: 'An array is a row of objects and nothing else. Understanding how it turns into a pointer explains why functions need a length and why sizeof sometimes lies.',
      topics: ['Layout', 'Bounds', 'Array-to-pointer decay', 'Array parameters', '2D arrays'],
      sections: [
        {
          title: 'An array is objects side by side',
          body: [
            "`int values[4]` reserves four `int` objects in a row, with nothing before, between or after them. There is no header and no stored length. The array is its elements.",
            { strip: {
              title: '`int values[4] = { 4, 7, 2, 9 };`',
              cells: [4, 7, 2, 9],
              address: { base: 0x1000, step: 4 },
              caption: "Sixteen bytes in total. Element `i` starts `i × sizeof(int)` bytes from the beginning.",
            } },
            { run: c`#include <stdio.h>

int main(void) {
    int values[] = { 4, 7, 2, 9 };        // Length taken from the initializer.
    int sparse[6] = { 1, 2 };             // Elements without a value become zero.
    size_t count = sizeof values / sizeof values[0];

    printf("%zu elements in %zu bytes\n", count, sizeof values);
    for (size_t i = 0; i < 6; ++i) {
        printf("%d ", sparse[i]);
    }
    printf("\n");
    return 0;
}`, name: 'arrays.c', expect: '4 elements in 16 bytes\n1 2 0 0 0 0 \n' },
            { list: [
              "`{ 0 }` is the idiom for an array of all zeros.",
              "A local array with no initializer at all holds indeterminate values, like any other local.",
              "`sizeof array / sizeof array[0]` is the element count. It works only where the array itself is in scope, for a reason this lesson is about to explain.",
            ] },
            { compare: "A Python list, a PHP array and a JavaScript array all know their length, can grow, and do something defined when you index past the end. A C array has a size fixed when it is declared, stores no length anywhere, and has no idea when you step outside it." },
          ],
        },
        {
          title: 'Nobody checks the index',
          body: [
            "Valid indexes run from 0 to length − 1. Anything else compiles, runs, and reads or writes whatever happens to be next to the array in memory.",
            { strip: {
              title: 'One step too far',
              cells: [4, 7, 2, 9],
              ghost: true,
              marks: [{ at: 4, label: '`values[4]`' }],
              caption: "There is no fifth element. The memory after the array belongs to something else, perhaps another local variable.",
            } },
            { code: c`int values[4] = { 4, 7, 2, 9 };
for (int i = 0; i <= 4; ++i) {   // <= makes one pass too many.
    values[i] = 0;               // The last write lands outside the array.
}` },
            "That stray write is undefined behavior. A typical result is that some neighboring variable silently changes value. The off-by-one comparison, `<=` where `<` was meant, is the most common way to cause it.",
          ],
        },
        {
          title: 'Arrays decay to pointers',
          body: [
            "Here is the rule that connects arrays to everything in the previous lessons. In almost every expression, the name of an array is converted to a pointer to its first element. People call this **decay**.",
            { code: c`int values[4] = { 4, 7, 2, 9 };
int *p = values;          // Exactly the same as: int *p = &values[0];` },
            { memory: {
              title: '`p` points at the first element',
              vars: [
                { id: 'values', type: 'int', len: 4 },
                { id: 'p', type: 'int *' },
              ],
              set: { values: [4, 7, 2, 9], p: '&values[0]' },
            } },
            "The conversion does not happen in two places that matter: as the operand of `sizeof`, which is why `sizeof values` gives 16, and as the operand of `&`, where `&values` is a pointer to the whole array.",
            { run: c`#include <stdio.h>

int main(void) {
    int values[4] = { 4, 7, 2, 9 };
    int *p = values;                     // Decays to &values[0].

    printf("%d\n", p == &values[0]);     // Same address, same type.
    printf("%d %d\n", *p, p[2]);         // A pointer can be indexed too.
    printf("%zu %zu\n", sizeof values, sizeof p);   // The array, then just a pointer.
    return 0;
}`, name: 'decay.c', sizes: true, expect: '1\n4 2\n16 4\n' },
            "An array is not a pointer. The array is the sixteen bytes of elements. The pointer is a separate four-byte or eight-byte variable holding an address. But the array converts to a pointer so readily that most code handles arrays entirely through pointers.",
          ],
        },
        {
          title: 'Arrays as function parameters',
          body: [
            "You cannot pass an array by value. When you write a call such as `sum(values, 4)`, the array decays and the function receives a pointer to the first element. A parameter written as `int values[]`, or even `int values[10]`, is silently rewritten by the compiler to `int *values`.",
            "Three consequences follow, and each is a classic surprise.",
            { list: [
              "**The function can modify the caller's elements.** It has their address.",
              "**The function does not know the length.** A pointer carries no size, so the length must be passed separately.",
              "**`sizeof` on the parameter gives the size of a pointer**, not of the array.",
            ] },
            { run: c`#include <stdio.h>

// "const int values[]" in a parameter list means exactly "const int *values".
int sum(const int values[], size_t length) {
    int total = 0;
    for (size_t i = 0; i < length; ++i) {
        total += values[i];
    }
    return total;
}

void double_all(int *values, size_t length) {
    for (size_t i = 0; i < length; ++i) {
        values[i] *= 2;              // Changes the caller's array.
    }
}

int main(void) {
    int values[] = { 4, 7, 2 };
    size_t length = sizeof values / sizeof values[0];

    double_all(values, length);
    printf("%d\n", sum(values, length));
    printf("%d\n", sum(values + 1, 2));   // Any run of ints will do: skip the first.
    return 0;
}`, name: 'parameters.c', expect: '26\n18\n' },
            "The last line shows something an array type could not do. Because the function only needs an address and a count, you can hand it any part of an array.",
            { compare: "A Python function that receives a list can also mutate the caller's list, so the behavior feels familiar. The mechanism is different, and so are the gaps: there is no `len()`, and nothing stops the function from walking past the end." },
          ],
        },
        {
          title: 'No assignment, no comparison, no return',
          body: [
            "Because an array name decays to a pointer, the operations you might expect on whole arrays do not exist.",
            { code: c`int a[3] = { 1, 2, 3 };
int b[3];

// b = a;                    // error: array type 'int [3]' is not assignable
memcpy(b, a, sizeof a);      // Copies all 12 bytes. Declared in <string.h>.

if (a == b) { }              // Compiles, but compares two addresses: always false.
if (memcmp(a, b, sizeof a) == 0) { }   // Compares the contents.` },
            "A function cannot return an array either. The usual alternatives are to have the caller pass in an array to fill, as you just saw, or to allocate one on the heap and return a pointer to it, which the dynamic memory lesson covers. Returning a pointer to a local array is the dangling pointer bug again.",
          ],
        },
        {
          title: 'Arrays of arrays',
          body: [
            "A two-dimensional array is an array whose elements are arrays. `int grid[2][3]` is two rows, each an array of three ints, laid out one row after the other in a single block of six ints.",
            { strip: {
              title: '`int grid[2][3]` in memory',
              cells: [1, 2, 3, 4, 5, 6],
              marks: [{ at: 0, span: 3, label: '`grid[0]`' }, { at: 3, span: 3, label: '`grid[1]`' }],
              caption: "`grid[1][0]` is the fourth `int`. The compiler finds `grid[r][c]` at position `r × 3 + c`, which is why it has to know the row length.",
            } },
            { run: c`#include <stdio.h>

int sum_grid(int grid[][3], size_t rows) {   // Really: int (*grid)[3]
    int total = 0;
    for (size_t r = 0; r < rows; ++r) {
        for (size_t col = 0; col < 3; ++col) {
            total += grid[r][col];
        }
    }
    return total;
}

int main(void) {
    int grid[2][3] = {
        { 1, 2, 3 },
        { 4, 5, 6 },
    };
    printf("%d\n", sum_grid(grid, 2));
    printf("%zu bytes, %zu per row\n", sizeof grid, sizeof grid[0]);
    return 0;
}`, name: 'grid.c', expect: '21\n24 bytes, 12 per row\n' },
            "When `grid` is passed to a function it decays one level, to a pointer to its first row: `int (*)[3]`. That is the pointer-to-array type from the last lesson, and it explains the parameter syntax. Only the first dimension may be left empty, because every later dimension is part of the element type.",
          ],
        },
        {
          title: 'Sizes, and where big arrays go',
          body: [
            "The length of an array with static storage must be a compile-time constant. The idiomatic ways to name one are a macro or an enumeration constant. In C, unlike C++, a `const int` does not count.",
            { code: c`#define MAX_USERS 64            // The preprocessor substitutes 64 before compiling.
enum { BUFFER_SIZE = 256 };     // A true integer constant, known to the compiler.

static int user_ids[MAX_USERS];
char line[BUFFER_SIZE];` },
            "A local array may have a length computed at run time, which makes it a variable-length array. It lives on the stack, and if it turns out to be too large there is no error to catch: the program overruns its stack. Use fixed sizes for small local arrays and the heap for anything large or sized by input.",
          ],
        },
      ],
      takeaways: [
        "An array is its elements in a row. It stores no length, and nothing checks an index.",
        "In almost every expression an array name becomes a pointer to its first element.",
        "A function that takes an array really takes a pointer. Pass the length alongside it.",
        "`sizeof array / sizeof array[0]` works only where the array itself was declared.",
        "Arrays cannot be assigned, compared with `==`, or returned. Use `memcpy`, `memcmp`, and out-parameters.",
      ],
      quiz: [
        {
          q: 'What does `sizeof values` measure inside `print_values`?',
          code: c`void print_values(int values[10]) {
    printf("%zu\n", sizeof values);
}`,
          options: [
            { t: 'The number of elements in the caller\'s array', why: "The parameter carries only an address. The caller has to supply the element count separately." },
            { t: 'The number of bytes in ten `int`s', why: "The `[10]` in a parameter is ignored. The declaration is adjusted to `int *values`." },
            { t: 'The size of a pointer to `int`', ok: true, why: "The parameter has type `int *`, whatever the brackets say. `sizeof` measures that pointer: 4 in this page and 8 on your Mac." },
          ],
        },
        {
          q: 'What is the value of `a[4]`?',
          code: c`int a[5] = { 1, 2 };`,
          options: [
            { t: '0', ok: true, why: "When an initializer list is shorter than the array, the remaining elements are set to zero." },
            { t: '2', why: "The last value in the list is not repeated." },
            { t: 'Indeterminate', why: "That would be true with no initializer at all. A partial initializer zeroes the rest." },
            { t: 'It is out of bounds', why: "An array of 5 has indexes 0 to 4, so `a[4]` is the last element." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

void fill(int values[], size_t n) {
    for (size_t i = 0; i < n; ++i) {
        values[i] = (int)(i * i);
    }
}

int main(void) {
    int data[4] = { 9, 9, 9, 9 };
    fill(data, 3);
    printf("%d %d %d %d\n", data[0], data[1], data[2], data[3]);
    return 0;
}`,
          answer: '0 1 4 9',
          explain: "`fill` receives a pointer to `data[0]` and writes into the caller's array. It was told to fill three elements, so the fourth keeps its 9.",
        },
        {
          q: 'Given `int values[4];`, which statement is true?',
          options: [
            { t: 'In most expressions, `values` gives the same pointer as `&values[0]`', ok: true, why: "That is array-to-pointer decay. The exceptions are the operands of `sizeof` and `&`." },
            { t: '`values = other;` copies another array into it', why: "Arrays are not assignable. Use `memcpy` or a loop." },
            { t: '`sizeof values` is the size of a pointer', why: "`sizeof` is one of the places where the array does not decay. It gives 16." },
            { t: '`values[4]` is the last element', why: "The last element is `values[3]`. Index 4 is one past the end." },
          ],
        },
        {
          q: 'In `int grid[2][3];`, how far from the start of the array is `grid[1][0]`?',
          options: [
            { t: 'One `int`', why: "That is `grid[0][1]`. The first index selects a whole row." },
            { t: 'Two `int`s', why: "Each row has three ints, so the second row starts three in." },
            { t: 'Three `int`s', ok: true, why: "Rows are stored one after another. Row 1 begins after the three ints of row 0, twelve bytes in." },
          ],
        },
        {
          kind: 'multi',
          q: 'Given `int a[3] = { 1, 2, 3 };` and `int b[3];`, which of these make `b` hold the same values as `a`?',
          options: [
            { t: '`b = a;`', why: "It does not compile: an array is not assignable." },
            { t: '`memcpy(b, a, sizeof a);`', ok: true, why: "It copies the 12 bytes of `a` into `b`." },
            { t: '`for (size_t i = 0; i < 3; ++i) { b[i] = a[i]; }`', ok: true, why: "Element-by-element assignment works for any element type." },
            { t: '`memcpy(b, a, 3);`', why: "The count is in bytes. This copies three bytes, which is less than one `int`." },
          ],
          hint: "`memcpy` counts bytes, not elements.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    double samples[6] = { 0 };
    printf("%zu\n", sizeof samples / sizeof samples[0]);
    return 0;
}`,
          answer: '6',
          explain: "48 bytes divided by the 8 bytes of one `double`. `samples` is a real array here, so `sizeof` sees all of it.",
        },
      ],
      challenges: [
        {
          id: 'count-above',
          legacy: 'arrays',
          title: 'Count values above a threshold',
          level: 'warm-up',
          prompt: "Return how many of the first `length` elements are strictly greater than `threshold`. An empty input may be passed as `NULL` with a length of zero.",
          signature: 'size_t count_above(const int values[], size_t length, int threshold)',
          starter: c`size_t count_above(const int values[], size_t length, int threshold) {
    size_t count = 0;
    // Check each element.
    return count;
}`,
          hints: [
            "Start the index at zero and continue while it is strictly less than `length`.",
            "An element equal to the threshold does not count.",
          ],
          solution: c`size_t count_above(const int values[], size_t length, int threshold) {
    size_t count = 0;
    for (size_t i = 0; i < length; ++i) {
        if (values[i] > threshold) {
            ++count;
        }
    }
    return count;
}`,
          tests: [
            { label: 'Applies a strict threshold', body: c`const int values[] = { 5, 2, 5, 9, 10 };
CHECK(count_above(values, 5, 5) == 2);` },
            { label: 'Works with negative values', body: c`const int values[] = { -9, -3, -4, -1 };
CHECK(count_above(values, 4, -4) == 2);` },
            { label: 'Uses the length it was given', body: c`const int values[] = { 3, 2, 6, 9 };
CHECK(count_above(values, 2, 4) == 0);` },
            { label: 'Accepts an empty input', body: c`CHECK(count_above(NULL, 0, 4) == 0);` },
          ],
        },
        {
          id: 'reverse-ints',
          title: 'Reverse in place',
          level: 'core',
          prompt: "Reverse the order of the first `length` elements, without using a second array. The length may be zero.",
          signature: 'void reverse_ints(int *values, size_t length)',
          starter: c`void reverse_ints(int *values, size_t length) {
    // Swap elements from the two ends, moving inward.
}`,
          hints: [
            "Element `i` trades places with element `length - 1 - i`.",
            "Stop at the middle: loop while `i < length / 2`. That bound also keeps `length - 1` from being evaluated when the length is zero.",
          ],
          solution: c`void reverse_ints(int *values, size_t length) {
    for (size_t i = 0; i < length / 2; ++i) {
        int saved = values[i];
        values[i] = values[length - 1 - i];
        values[length - 1 - i] = saved;
    }
}`,
          tests: [
            { label: 'Reverses an even number of elements', body: c`int values[] = { 1, 2, 3, 4 };
reverse_ints(values, 4);
CHECK(values[0] == 4 && values[1] == 3 && values[2] == 2 && values[3] == 1);` },
            { label: 'Reverses an odd number of elements', body: c`int values[] = { 7, 8, 9 };
reverse_ints(values, 3);
CHECK(values[0] == 9 && values[1] == 8 && values[2] == 7);` },
            { label: 'Touches only the first length elements', body: c`int values[] = { 1, 2, 3, 99 };
reverse_ints(values, 3);
CHECK(values[0] == 3 && values[2] == 1 && values[3] == 99);` },
            { label: 'Handles one element and none', body: c`int values[] = { 5 };
reverse_ints(values, 1);
CHECK(values[0] == 5);
reverse_ints(values, 0);
CHECK(values[0] == 5);` },
          ],
        },
        {
          id: 'largest',
          title: 'One pass too many',
          level: 'core',
          kind: 'fix',
          prompt: [
            "`largest` should return the biggest of the first `length` elements. `length` is at least 1. It has two bugs, and some of the tests catch each.",
            "Open the failing tests to see the inputs that expose them.",
          ],
          signature: 'int largest(const int *values, size_t length)',
          starter: c`int largest(const int *values, size_t length) {
    int best = 0;
    for (size_t i = 0; i <= length; ++i) {
        if (values[i] > best) {
            best = values[i];
        }
    }
    return best;
}`,
          hints: [
            "Which indexes does `i <= length` visit? Count them.",
            "What does the function return when every element is negative? Starting from 0 is a guess about the data. Start from an element instead.",
          ],
          solution: c`int largest(const int *values, size_t length) {
    int best = values[0];
    for (size_t i = 1; i < length; ++i) {
        if (values[i] > best) {
            best = values[i];
        }
    }
    return best;
}`,
          tests: [
            { label: 'Finds the largest element', body: c`const int values[] = { 3, 9, 4 };
CHECK(largest(values, 3) == 9);` },
            { label: 'Stops at the length it was given', body: c`const int values[] = { 3, 9, 4, 100 };
CHECK(largest(values, 3) == 9);` },
            { label: 'Handles values that are all negative', body: c`const int values[] = { -8, -3, -5, -20 };
CHECK(largest(values, 3) == -3);` },
            { label: 'Handles a single element', body: c`const int values[] = { -7, 50 };
CHECK(largest(values, 1) == -7);` },
          ],
        },
        {
          id: 'remove-value',
          title: 'Remove a value in place',
          level: 'core',
          prompt: [
            "Remove every element equal to `target` from the first `length` elements, closing the gaps so that the survivors stay in their original order at the front of the array. Return the new length.",
            "The elements beyond the new length may be left holding anything. Do not use a second array.",
          ],
          signature: 'size_t remove_value(int *values, size_t length, int target)',
          starter: c`size_t remove_value(int *values, size_t length, int target) {
    return length;
}`,
          hints: [
            "Use two indexes: one reads every element, the other marks where the next survivor should be written.",
            "When `values[read]` is not the target, copy it to `values[write]` and advance `write`. At the end, `write` is the new length.",
          ],
          solution: c`size_t remove_value(int *values, size_t length, int target) {
    size_t write = 0;
    for (size_t read = 0; read < length; ++read) {
        if (values[read] != target) {
            values[write] = values[read];
            ++write;
        }
    }
    return write;
}`,
          tests: [
            { label: 'Removes scattered matches and keeps the order', body: c`int values[] = { 4, 1, 4, 2, 3, 4 };
CHECK(remove_value(values, 6, 4) == 3);
CHECK(values[0] == 1 && values[1] == 2 && values[2] == 3);` },
            { label: 'Returns the same length when nothing matches', body: c`int values[] = { 1, 2, 3 };
CHECK(remove_value(values, 3, 9) == 3);
CHECK(values[0] == 1 && values[1] == 2 && values[2] == 3);` },
            { label: 'Can remove everything', body: c`int values[] = { 6, 6, 6 };
CHECK(remove_value(values, 3, 6) == 0);` },
            { label: 'Handles an empty array', body: c`int values[] = { 1 };
CHECK(remove_value(values, 0, 1) == 0);
CHECK(values[0] == 1);` },
          ],
        },
        {
          id: 'transpose',
          title: 'Transpose a matrix',
          level: 'core',
          prompt: "Transpose a 3 × 3 matrix in place: the element at row `r`, column `c` trades places with the one at row `c`, column `r`. The diagonal stays where it is.",
          signature: 'void transpose3(int matrix[3][3])',
          starter: c`void transpose3(int matrix[3][3]) {
    // Swap matrix[r][c] with matrix[c][r].
}`,
          hints: [
            "If you swap for every pair of `r` and `c`, each pair gets swapped twice and ends up back where it began.",
            "Visit only the elements above the diagonal: let `c` start at `r + 1`.",
          ],
          solution: c`void transpose3(int matrix[3][3]) {
    for (size_t r = 0; r < 3; ++r) {
        for (size_t col = r + 1; col < 3; ++col) {
            int saved = matrix[r][col];
            matrix[r][col] = matrix[col][r];
            matrix[col][r] = saved;
        }
    }
}`,
          tests: [
            { label: 'Turns rows into columns', body: c`int matrix[3][3] = { { 1, 2, 3 }, { 4, 5, 6 }, { 7, 8, 9 } };
transpose3(matrix);
CHECK(matrix[0][0] == 1 && matrix[0][1] == 4 && matrix[0][2] == 7);
CHECK(matrix[1][0] == 2 && matrix[1][1] == 5 && matrix[1][2] == 8);
CHECK(matrix[2][0] == 3 && matrix[2][1] == 6 && matrix[2][2] == 9);` },
            { label: 'Leaves a symmetric matrix unchanged', body: c`int matrix[3][3] = { { 1, 7, 8 }, { 7, 2, 9 }, { 8, 9, 3 } };
transpose3(matrix);
CHECK(matrix[0][1] == 7 && matrix[1][0] == 7 && matrix[1][2] == 9 && matrix[2][0] == 8);` },
            { label: 'Transposing twice restores the original', body: c`int matrix[3][3] = { { 0, 1, 2 }, { 3, 4, 5 }, { 6, 7, 8 } };
transpose3(matrix);
transpose3(matrix);
CHECK(matrix[0][1] == 1 && matrix[1][0] == 3 && matrix[2][1] == 7);` },
          ],
        },
        {
          id: 'rotate-ints',
          title: 'Rotate an array',
          level: 'stretch',
          prompt: [
            "Rotate the first `length` elements to the left by `shift` positions. Rotating `{1, 2, 3, 4, 5}` left by 2 gives `{3, 4, 5, 1, 2}`. `shift` may be larger than `length`, and `length` may be zero.",
            "There is a neat way to do it with no second array: reverse the first `shift` elements, reverse the rest, then reverse the whole thing.",
          ],
          signature: 'void rotate_ints(int *values, size_t length, size_t shift)',
          starter: c`void rotate_ints(int *values, size_t length, size_t shift) {
    // Three reversals do it.
}`,
          hints: [
            "Write a helper that reverses `count` elements starting at a pointer. To reverse the tail, pass it `values + shift`.",
            "Reduce the shift first with `shift %= length`, and return early when `length` is zero so that you never take a remainder by zero.",
          ],
          solution: c`static void reverse(int *values, size_t count) {
    for (size_t i = 0; i < count / 2; ++i) {
        int saved = values[i];
        values[i] = values[count - 1 - i];
        values[count - 1 - i] = saved;
    }
}

void rotate_ints(int *values, size_t length, size_t shift) {
    if (length == 0) {
        return;
    }
    shift %= length;
    reverse(values, shift);
    reverse(values + shift, length - shift);
    reverse(values, length);
}`,
          tests: [
            { label: 'Rotates by two', body: c`int values[] = { 1, 2, 3, 4, 5 };
rotate_ints(values, 5, 2);
CHECK(values[0] == 3 && values[1] == 4 && values[2] == 5 && values[3] == 1 && values[4] == 2);` },
            { label: 'A shift of zero or of the full length changes nothing', body: c`int values[] = { 1, 2, 3 };
rotate_ints(values, 3, 0);
CHECK(values[0] == 1 && values[2] == 3);
rotate_ints(values, 3, 3);
CHECK(values[0] == 1 && values[2] == 3);` },
            { label: 'Shifts larger than the length wrap around', body: c`int values[] = { 1, 2, 3, 4 };
rotate_ints(values, 4, 9);
CHECK(values[0] == 2 && values[1] == 3 && values[2] == 4 && values[3] == 1);` },
            { label: 'Leaves elements beyond the length alone', body: c`int values[] = { 1, 2, 3, 77 };
rotate_ints(values, 3, 1);
CHECK(values[0] == 2 && values[1] == 3 && values[2] == 1 && values[3] == 77);` },
            { label: 'Handles an empty array', body: c`int values[] = { 8 };
rotate_ints(values, 0, 5);
CHECK(values[0] == 8);` },
          ],
        },
      ],
    },

    {
      id: 'pointer-arithmetic',
      title: 'Pointer arithmetic',
      category: part,
      minutes: 35,
      summary: 'Adding to a pointer, subtracting pointers, and walking a range. This is also where array indexing turns out to be pointer arithmetic in disguise.',
      topics: ['Scaling', 'a[i] and *(a + i)', 'Half-open ranges', 'ptrdiff_t', '*p++'],
      sections: [
        {
          title: 'Adding to a pointer moves by whole elements',
          body: [
            "If `p` points to an element of an array, `p + 1` points to the next element. Not the next byte: the next element. The compiler multiplies the number you add by the size of the type the pointer points to.",
            { widget: 'pointerLab' },
            { run: c`#include <stdio.h>

int main(void) {
    int values[] = { 12, 24, 36, 48 };
    int *p = values;

    printf("%d %d\n", *p, *(p + 2));
    printf("p + 1 is %td bytes further on\n", (char *)(p + 1) - (char *)p);
    p += 3;                      // Move the pointer itself.
    printf("%d\n", *p);
    return 0;
}`, name: 'scaling.c', expect: '12 36\np + 1 is 4 bytes further on\n48\n' },
            "The step follows the pointer's type. Adding 1 to a `char *` moves one byte, to a `double *` eight bytes, and to a pointer to a 40-byte struct, 40 bytes. You think in elements and the compiler handles the bytes.",
          ],
        },
        {
          title: 'Indexing is pointer arithmetic',
          body: [
            "C defines the subscript operator in terms of pointer arithmetic. `a[i]` means `*(a + i)`, by definition. When `a` is an array it decays to a pointer first, and then the arithmetic happens.",
            { table: {
              head: ['Subscript form', 'Pointer form'],
              rows: [
                ['`a[i]`', '`*(a + i)`'],
                ['`&a[i]`', '`a + i`'],
                ['`a[0]`', '`*a`'],
                ['`&a[0]`', '`a`'],
              ],
            } },
            "A few consequences are worth knowing:",
            { list: [
              "Any pointer can be subscripted, not just an array name. `p[2]` is `*(p + 2)`.",
              "A negative subscript is legal when the pointer is not at the start of the array: `p[-1]` is the element before the one `p` points to.",
              "Since addition commutes, `2[a]` compiles and means `a[2]`. Do not write it. It is only useful as proof of the definition.",
            ] },
          ],
        },
        {
          title: 'Walking a range with two pointers',
          body: [
            "The most common way to describe part of an array is with two pointers: one to the first element, and one to the position just **past** the last. The first is included and the second is not, which is called a half-open range.",
            { trace: {
              title: 'Summing a range',
              code: c`int sum(const int *first, const int *end) {
    int total = 0;
    for (const int *p = first; p != end; ++p) {
        total += *p;
    }
    return total;
}

int main(void) {
    int values[3] = { 4, 7, 2 };
    int result = sum(values, values + 3);
    printf("%d\n", result);
    return 0;
}`,
              vars: [
                { id: 'values', type: 'int', len: 3, past: true, frame: 'main' },
                { id: 'result', type: 'int', frame: 'main' },
                { id: 'first', type: 'const int *', frame: 'sum' },
                { id: 'end', type: 'const int *', frame: 'sum' },
                { id: 'total', type: 'int', frame: 'sum' },
                { id: 'p', type: 'const int *', frame: 'sum' },
              ],
              steps: [
                { line: 10, set: { values: [4, 7, 2] }, say: "An array of three ints. The dashed row marks the position just after it. Nothing is stored there, but it has an address." },
                { line: 11, set: { first: '&values[0]', end: '&values[3]' }, say: "`values` decays to a pointer to element 0. `values + 3` is the address one past the last element. Computing it and comparing against it are both legal." },
                { line: 2, set: { total: 0 }, say: "The running total starts at zero." },
                { line: 3, set: { p: '&values[0]' }, say: "`p` starts at `first`. It is not equal to `end`, so the loop body runs." },
                { line: 4, set: { total: 4 }, say: "`*p` reads `values[0]`." },
                { line: 3, set: { p: '&values[1]' }, say: "`++p` moves to the next `int`, four bytes on. Still not `end`." },
                { line: 4, set: { total: 11 }, say: "`*p` reads `values[1]`." },
                { line: 3, set: { p: '&values[2]' }, say: "On to the last element." },
                { line: 4, set: { total: 13 }, say: "`*p` reads `values[2]`." },
                { line: 3, set: { p: '&values[3]' }, say: "`++p` now makes `p` equal to `end`. The condition fails and the loop stops. `p` is never dereferenced here." },
                { line: 6, set: { result: 13 }, hide: ['frame:sum'], say: "The total is returned and stored in `result`." },
                { line: 12, say: "The program prints 13." },
              ],
            } },
            "Half-open ranges are used throughout C, and later in C++ and Rust, because the arithmetic is clean:",
            { list: [
              "The number of elements is `end - first`.",
              "An empty range is simply `first == end`, with no special case.",
              "Where one range ends, the next begins: `[a, m)` and `[m, b)` share the pointer `m` without overlapping.",
            ] },
          ],
        },
        {
          title: 'Subtracting and comparing pointers',
          body: [
            "Subtracting one pointer from another gives the number of elements between them, as a signed integer of type `ptrdiff_t`, which `printf` prints with `%td`. Pointers into the same array can also be compared with `<` and `>`.",
            { run: c`#include <stddef.h>
#include <stdio.h>

int main(void) {
    int values[] = { 3, 6, 9, 12, 15 };
    int *first = values;
    int *end = values + 5;
    int *nine = &values[2];

    ptrdiff_t length = end - first;
    printf("%td elements\n", length);
    printf("9 is at offset %td\n", nine - first);
    printf("%td remain after it\n", end - nine - 1);
    printf("%d\n", nine < end);
    return 0;
}`, name: 'difference.c', expect: '5 elements\n9 is at offset 2\n2 remain after it\n1\n' },
            { pitfall: "Subtraction and the ordering comparisons `<`, `<=`, `>` and `>=` are defined only for two pointers into the same array, counting its one-past position. Between unrelated objects the result is undefined. `==` and `!=` are fine between any two pointers of the same type." },
          ],
        },
        {
          title: '*p++ and its relatives',
          body: [
            "Postfix operators bind more tightly than prefix ones, so `*p++` means `*(p++)`. It yields the element `p` points to and then advances `p`. This one expression is the heart of most C loops that copy or scan.",
            { table: {
              head: ['Expression', 'Its value', 'What changes'],
              rows: [
                ['`*p++`', 'The element `p` points to', '`p` moves to the next element'],
                ['`(*p)++`', 'The element\'s old value', 'The element is incremented'],
                ['`*++p`', 'The next element', '`p` moves first'],
                ['`++*p`', 'The element\'s new value', 'The element is incremented'],
              ],
            } },
            { run: c`#include <stdio.h>

int main(void) {
    int values[] = { 10, 20, 30 };
    int *p = values;

    int a = *p++;      // Read values[0], then move p to values[1].
    int b = (*p)++;    // Read values[1], then increment values[1] itself.
    int c = *++p;      // Move p to values[2], then read it.

    printf("%d %d %d\n", a, b, c);
    printf("%d %d %d\n", values[0], values[1], values[2]);
    return 0;
}`, name: 'increments.c', expect: '10 20 30\n10 21 30\n' },
            "With that in hand, the classic copy loop reads naturally. Each pass copies one element and steps both pointers:",
            { code: c`while (count-- > 0) {
    *dst++ = *src++;
}` },
          ],
        },
        {
          title: 'How far a pointer may go',
          body: [
            "For an array of `n` elements, the pointers you may legally **form** are `a` through `a + n`. The ones you may **dereference** are `a` through `a + n - 1`.",
            { strip: {
              title: 'Legal positions for a pointer into `int a[4]`',
              cells: [12, 24, 36, 48],
              ghost: true,
              marks: [{ at: 0, label: '`a`' }, { at: 3, label: '`a + 3`' }, { at: 4, label: '`a + 4`' }],
              caption: "`a + 4` may be held, compared and subtracted, but not dereferenced. `a + 5` and `a - 1` may not even be computed.",
            } },
            { list: [
              "Merely computing a pointer before the start or more than one past the end is undefined behavior, whether or not you follow it.",
              "A single object counts as an array of one, so `&x + 1` is a legal one-past pointer.",
              "A `void *` has no element size, so standard C does not allow arithmetic on it. Convert to `char *` or `unsigned char *` to step through bytes.",
            ] },
          ],
        },
        {
          title: 'Indexes or pointers?',
          body: [
            "The two styles compile to the same machine code, so choose the one that reads better.",
            { code: c`// With an index: clearest when you also need the position.
for (size_t i = 0; i < length; ++i) {
    if (values[i] < 0) {
        printf("negative at %zu\n", i);
    }
}

// With pointers: clearest for scanning, and for handing on part of an array.
for (const int *p = values; p != values + length; ++p) {
    if (*p < 0) {
        return p;
    }
}` },
            "Whichever you use, a read-only walk should use a pointer to `const`.",
          ],
        },
      ],
      takeaways: [
        "`p + n` moves `n` elements, not `n` bytes.",
        "`a[i]` is defined as `*(a + i)`. Subscripting works on any pointer.",
        "Describe part of an array as a half-open range: a pointer to the first element and a pointer one past the last.",
        "`*p++` reads the element and then advances the pointer.",
        "You may form the one-past pointer but not dereference it. Anything beyond is undefined even to compute.",
      ],
      quiz: [
        {
          q: 'Which of these expressions is safe to evaluate?',
          code: c`int values[] = { 8, 3, 4 };
int *first = values;
int *end = values + 3;`,
          options: [
            { t: '`*end`', why: "`end` is one past the array. There is no element there to read." },
            { t: '`end - first`', ok: true, why: "Both pointers belong to the same array, counting its one-past position. The difference is 3." },
            { t: '`*(first - 1)`', why: "Forming a pointer before the first element is undefined even before the dereference." },
          ],
        },
        {
          q: 'An `int *p` holds the address `0x1000`, and an `int` is 4 bytes. What address is `p + 3`?',
          options: [
            { t: '`0x1003`', why: "The 3 counts elements, not bytes." },
            { t: '`0x100c`', ok: true, why: "Three elements of four bytes each is twelve bytes, and twelve is `0xc` in hexadecimal." },
            { t: '`0x1012`', why: "Twelve in decimal is `c` in hexadecimal, not `12`." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    int v[] = { 5, 6, 7 };
    int *p = v + 1;
    int x = *p--;
    int y = *p;
    *++p += 10;
    printf("%d %d %d %d %d\n", x, y, v[0], v[1], v[2]);
    return 0;
}`,
          answer: '6 5 5 16 7',
          explain: "`*p--` reads `v[1]`, which is 6, and then moves `p` back to `v[0]`. `y` reads 5. `*++p += 10` moves `p` forward to `v[1]` first and then adds 10 to that element.",
          hint: "For each line, decide two things separately: which element is read or written, and where `p` points afterward.",
        },
        {
          q: 'With `int a[8];`, what is the value of `&a[5] - &a[2]`?',
          options: [
            { t: '3', ok: true, why: "Pointer subtraction counts elements. The result has type `ptrdiff_t`." },
            { t: '12', why: "That is the distance in bytes. Subtraction divides by the element size for you." },
            { t: 'It does not compile', why: "Subtracting two pointers into the same array is well defined." },
          ],
        },
        {
          kind: 'multi',
          q: 'With `int a[5];` and an index `i` in range, which expressions mean the same as `a[i]`?',
          options: [
            { t: '`*(a + i)`', ok: true, why: "This is the definition of `a[i]`." },
            { t: '`i[a]`', ok: true, why: "`i[a]` is `*(i + a)`, and addition commutes. Legal, and never worth writing." },
            { t: '`*a + i`', why: "The star binds first. This is the first element plus `i`." },
            { t: '`(&a[0])[i]`', ok: true, why: "`&a[0]` is the pointer that `a` decays to." },
            { t: '`*(&a[i])`', ok: true, why: "`*` and `&` cancel." },
          ],
          hint: "Four of the five are equivalent. Check precedence on the remaining one.",
        },
        {
          q: 'Pointers `p` and `q` point into two different arrays. What can you rely on?',
          options: [
            { t: '`p < q` tells you which array is at the lower address', why: "Ordering comparisons between pointers into different arrays are undefined." },
            { t: '`q - p` gives the distance between the arrays', why: "Subtraction is defined only within one array." },
            { t: 'Only `p == q` and `p != q`', ok: true, why: "Equality is defined for any two pointers of the same type. Ordering and subtraction need both pointers to be in the same array." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    const char *text = "pointer";
    const char *end = text;
    while (*end != '\0') {
        ++end;
    }
    printf("%td %c\n", end - text, *(end - 1));
    return 0;
}`,
          answer: '7 r',
          explain: "The loop walks `end` forward to the zero byte that terminates the string. The difference is the length, 7, and the character just before the terminator is the last letter.",
        },
      ],
      challenges: [
        {
          id: 'sum-range',
          title: 'Sum a range',
          level: 'warm-up',
          prompt: "Return the sum of the ints from `first` up to but not including `end`. Walk the range with a pointer. Do not use an index. The range may be empty.",
          signature: 'int sum_range(const int *first, const int *end)',
          starter: c`int sum_range(const int *first, const int *end) {
    int total = 0;
    // Walk a pointer from first to end.
    return total;
}`,
          hints: [
            "`for (const int *p = first; p != end; ++p)` visits each element in the range.",
            "Inside the loop, `*p` is the current element.",
          ],
          solution: c`int sum_range(const int *first, const int *end) {
    int total = 0;
    for (const int *p = first; p != end; ++p) {
        total += *p;
    }
    return total;
}`,
          tests: [
            { label: 'Sums a whole array', body: c`const int values[] = { 4, 7, 2 };
CHECK(sum_range(values, values + 3) == 13);` },
            { label: 'Sums part of an array', body: c`const int values[] = { 100, 1, 2, 3, 100 };
CHECK(sum_range(values + 1, values + 4) == 6);` },
            { label: 'An empty range sums to zero', body: c`const int values[] = { 9 };
CHECK(sum_range(values, values) == 0);
CHECK(sum_range(values + 1, values + 1) == 0);` },
          ],
        },
        {
          id: 'find-last',
          legacy: 'pointer-arithmetic',
          title: 'Find the last match',
          level: 'core',
          prompt: "Search from `first` up to but not including `end`. Return the offset from `first` of the last occurrence of `target`, or −1 if the range is empty or has no match. Both pointers belong to the same array, counting its one-past position, and `first` is not after `end`.",
          signature: 'ptrdiff_t find_last(const int *first, const int *end, int target)',
          starter: c`ptrdiff_t find_last(const int *first, const int *end, int target) {
    // Walk the range with a pointer.
    return -1;
}`,
          hints: [
            "Searching backward finds the last match first. Start a cursor at `end`.",
            "Check that the cursor is not yet at `first` before you decrement it, so that it never goes below the start.",
            "After decrementing, compare `*cursor` with the target. `cursor - first` is the offset.",
          ],
          solution: c`ptrdiff_t find_last(const int *first, const int *end, int target) {
    const int *cursor = end;
    while (cursor != first) {
        --cursor;
        if (*cursor == target) {
            return cursor - first;
        }
    }
    return -1;
}`,
          tests: [
            { label: 'Returns the last occurrence', body: c`const int values[] = { 9, 4, 9, 2, 9 };
CHECK(find_last(values, values + 5, 9) == 4);` },
            { label: 'Offsets are relative to the start of the range', body: c`const int values[] = { 7, 8, 1, 8 };
CHECK(find_last(values + 1, values + 3, 8) == 0);` },
            { label: 'Reports a missing target', body: c`const int values[] = { 2, 1, 4 };
CHECK(find_last(values, values + 3, 6) == -1);` },
            { label: 'Handles an empty range', body: c`const int values[] = { 5 };
CHECK(find_last(values + 1, values + 1, 5) == -1);` },
          ],
        },
        {
          id: 'reverse-range',
          title: 'Reverse a range',
          level: 'core',
          prompt: "Reverse the elements from `first` up to but not including `end`, in place. Use two pointers that move toward each other. The range may be empty or hold a single element.",
          signature: 'void reverse_range(int *first, int *end)',
          starter: c`void reverse_range(int *first, int *end) {
    // Move first forward and end backward until they meet.
}`,
          hints: [
            "`end` points one past the last element, so the last element is at `end - 1`.",
            "Loop while `first < end`. In the body, step `end` back with `--end`, then stop if it has met `first`, then swap `*first` with `*end` and step `first` forward.",
            "A compact form that does the same thing: `while (first < end && first < --end)`, swapping and then incrementing `first` in the body.",
          ],
          solution: c`void reverse_range(int *first, int *end) {
    while (first < end && first < --end) {
        int saved = *first;
        *first = *end;
        *end = saved;
        ++first;
    }
}`,
          tests: [
            { label: 'Reverses an even number of elements', body: c`int values[] = { 1, 2, 3, 4 };
reverse_range(values, values + 4);
CHECK(values[0] == 4 && values[1] == 3 && values[2] == 2 && values[3] == 1);` },
            { label: 'Reverses an odd number of elements', body: c`int values[] = { 1, 2, 3, 4, 5 };
reverse_range(values, values + 5);
CHECK(values[0] == 5 && values[1] == 4 && values[2] == 3 && values[3] == 2 && values[4] == 1);` },
            { label: 'Reverses only the range it was given', body: c`int values[] = { 1, 2, 3, 4, 5 };
reverse_range(values + 1, values + 4);
CHECK(values[0] == 1 && values[1] == 4 && values[2] == 3 && values[3] == 2 && values[4] == 5);` },
            { label: 'Handles one element and none', body: c`int values[] = { 6, 7 };
reverse_range(values, values + 1);
reverse_range(values + 1, values + 1);
CHECK(values[0] == 6 && values[1] == 7);` },
          ],
        },
        {
          id: 'copy-unique',
          title: 'Copy without repeats',
          level: 'core',
          prompt: [
            "Copy the range from `first` up to `end` into the array starting at `out`, skipping any element that equals the one just before it. So `1 1 2 2 2 3 1` becomes `1 2 3 1`.",
            "Return a pointer one past the last element you wrote, so that the caller can work out how many were written by subtracting. `out` has room for the whole input and does not overlap it.",
          ],
          signature: 'int *copy_unique(const int *first, const int *end, int *out)',
          starter: c`int *copy_unique(const int *first, const int *end, int *out) {
    return out;
}`,
          hints: [
            "The first element of a non-empty range is always copied. After that, compare each element with its predecessor: `*p != *(p - 1)`.",
            "`*out++ = *p;` writes one element and advances the output pointer in a single step.",
            "When the loop finishes, `out` already points one past the last element written. Return it.",
          ],
          solution: c`int *copy_unique(const int *first, const int *end, int *out) {
    for (const int *p = first; p != end; ++p) {
        if (p == first || *p != *(p - 1)) {
            *out++ = *p;
        }
    }
    return out;
}`,
          tests: [
            { label: 'Collapses runs of equal values', body: c`const int values[] = { 1, 1, 2, 2, 2, 3, 1 };
int out[7] = { 0 };
int *stop = copy_unique(values, values + 7, out);
CHECK(stop - out == 4);
CHECK(out[0] == 1 && out[1] == 2 && out[2] == 3 && out[3] == 1);` },
            { label: 'Copies everything when nothing repeats', body: c`const int values[] = { 4, 5, 6 };
int out[3] = { 0 };
int *stop = copy_unique(values, values + 3, out);
CHECK(stop == out + 3);
CHECK(out[0] == 4 && out[1] == 5 && out[2] == 6);` },
            { label: 'Writes nothing for an empty range', body: c`const int values[] = { 4 };
int out[1] = { 99 };
CHECK(copy_unique(values, values, out) == out);
CHECK(out[0] == 99);` },
            { label: 'Does not write past what it returns', body: c`const int values[] = { 8, 8, 8, 8 };
int out[4] = { -1, -1, -1, -1 };
int *stop = copy_unique(values, values + 4, out);
CHECK(stop - out == 1);
CHECK(out[0] == 8 && out[1] == -1 && out[2] == -1 && out[3] == -1);` },
          ],
        },
        {
          id: 'lower-bound',
          title: 'Binary search with pointers',
          level: 'stretch',
          prompt: [
            "The range from `first` to `end` is sorted in ascending order. Return a pointer to the first element that is not less than `target`. If every element is less, return `end`. This is the position where `target` could be inserted to keep the range sorted.",
            "Use binary search: keep narrowing a half-open range by looking at its middle element.",
          ],
          signature: 'const int *lower_bound(const int *first, const int *end, int target)',
          starter: c`const int *lower_bound(const int *first, const int *end, int target) {
    return end;
}`,
          hints: [
            "The middle of the range is `first + (end - first) / 2`. You cannot add two pointers, but you can add half their difference to one of them.",
            "If `*middle < target`, the answer lies after the middle: set `first = middle + 1`. Otherwise the middle itself may be the answer: set `end = middle`.",
            "Loop while `first != end`. When they meet, that pointer is the answer.",
          ],
          solution: c`const int *lower_bound(const int *first, const int *end, int target) {
    while (first != end) {
        const int *middle = first + (end - first) / 2;
        if (*middle < target) {
            first = middle + 1;
        } else {
            end = middle;
        }
    }
    return first;
}`,
          tests: [
            { label: 'Finds a value that is present', body: c`const int values[] = { 2, 4, 6, 8, 10 };
CHECK(lower_bound(values, values + 5, 6) == values + 2);` },
            { label: 'Finds the insertion point for a missing value', body: c`const int values[] = { 2, 4, 6, 8, 10 };
CHECK(lower_bound(values, values + 5, 7) == values + 3);` },
            { label: 'Returns the first of several equal values', body: c`const int values[] = { 1, 3, 3, 3, 9 };
CHECK(lower_bound(values, values + 5, 3) == values + 1);` },
            { label: 'Handles targets beyond either end', body: c`const int values[] = { 5, 6, 7 };
CHECK(lower_bound(values, values + 3, 1) == values);
CHECK(lower_bound(values, values + 3, 99) == values + 3);` },
            { label: 'Handles an empty range', body: c`const int values[] = { 5 };
CHECK(lower_bound(values, values, 5) == values);` },
          ],
        },
      ],
    },
  );
})();
