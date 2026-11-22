// Part 5: The wider language. The preprocessor, multi-file programs, and undefined behavior.
(() => {
  const c = String.raw;
  const part = 'Part 5 · The wider language';

  (window.C_LESSONS ||= []).push(
    {
      id: 'preprocessor',
      title: 'The preprocessor & multi-file programs',
      category: part,
      minutes: 30,
      summary: 'Macros, conditional compilation, and how a C program is split across headers and source files without any module system.',
      topics: ['#define', 'Macro pitfalls', '#if', 'Headers', 'Include guards', 'Opaque types'],
      sections: [
        {
          title: 'Text substitution before compilation',
          body: [
            "The preprocessor runs before the compiler and knows nothing about C. It works on text. It handles the lines that begin with `#`, replaces macro names wherever they appear, and passes the result on. The compiler never sees a `#define` or the name it defined.",
            { run: c`#include <stdio.h>

#define MAX_USERS 64                 // Every later MAX_USERS is replaced by 64.
#define GREETING "hello"

int main(void) {
    int ids[MAX_USERS];              // The compiler sees: int ids[64];
    printf("%zu\n", sizeof ids / sizeof ids[0]);
    printf("%s from line %d of %s\n", GREETING, __LINE__, __FILE__);
    return 0;
}`, name: 'define.c', sizes: true, expect: '64\nhello from line 9 of lesson.c\n' },
            { list: [
              "A macro has no type and no scope. From the line that defines it to the end of the file, the name is replaced wherever it occurs as a whole word.",
              "`__FILE__` and `__LINE__` are built-in macros that expand to the current file name and line number.",
              "By convention macro names are written in capitals, so that readers know a substitution is happening.",
              "For integer constants, `enum { MAX_USERS = 64 };` does the same job with a real, scoped name that a debugger can show.",
            ] },
            { native: [
              "To see exactly what the compiler is given, ask Clang to stop after preprocessing:",
              { text: 'clang -E program.c' },
            ] },
          ],
        },
        {
          title: 'Function-like macros and their traps',
          body: [
            "A macro can take parameters. It still substitutes text, and the arguments are pasted in unevaluated. That produces two classic surprises.",
            { run: c`#include <stdio.h>

#define BAD_SQUARE(x) x * x
#define SQUARE(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))

int calls = 0;
int next(void) { return ++calls; }

int main(void) {
    printf("%d\n", BAD_SQUARE(1 + 2));     // Expands to: 1 + 2 * 1 + 2
    printf("%d\n", SQUARE(1 + 2));         // Expands to: ((1 + 2) * (1 + 2))
    printf("%d\n", MAX(next(), 0));        // next() appears twice in the expansion.
    printf("next was called %d times\n", calls);
    return 0;
}`, name: 'macros.c', expect: '5\n9\n2\nnext was called 2 times\n' },
            { list: [
              "**Precedence.** The expansion is spliced into the surrounding expression as it stands. Put parentheses around every parameter in the body, and around the body as a whole.",
              "**Repeated evaluation.** An argument is evaluated once for every time it appears in the body. `MAX(next(), 0)` calls `next` twice, and `SQUARE(i++)` modifies `i` twice in one expression, which is undefined behavior. No amount of parentheses fixes this.",
            ] },
            "For anything that could be a function, write a function. A small function marked `static inline` is type-checked, evaluates its arguments once, and compiles to the same code as the macro.",
            { code: c`static inline int square(int x) {
    return x * x;
}` },
            { compare: "Nothing in Python, PHP or TypeScript works like this. The closest picture is a search-and-replace pass run over the source file before it is compiled. Macros survive in C because they can do things functions cannot: work on any type, capture the caller's file and line, turn code into strings, and generate declarations." },
          ],
        },
        {
          title: 'Macros that functions cannot replace',
          body: [
            "Inside a macro body, `#parameter` turns the argument's source text into a string literal. Together with `__FILE__` and `__LINE__` it lets a checking macro report exactly what failed and where. The tests in this manual are written with a macro like this one.",
            { run: c`#include <stdio.h>

// Reports the text and location of a condition that turns out to be false.
#define CHECK(condition) \
    do { \
        if (!(condition)) { \
            printf("line %d: check failed: %s\n", __LINE__, #condition); \
        } \
    } while (0)

#define ARRAY_LEN(array) (sizeof (array) / sizeof (array)[0])

int main(void) {
    int values[] = { 3, 1, 2 };
    CHECK(ARRAY_LEN(values) == 3);
    if (values[0] > 5)
        CHECK(values[1] == 1);         // The do-while makes the macro one statement,
    else                               // so this else still pairs with the if.
        CHECK(values[0] + values[1] == 5);
    return 0;
}`, name: 'check.c', expect: 'line 19: check failed: values[0] + values[1] == 5\n' },
            { list: [
              "A backslash at the end of a line continues the macro onto the next line.",
              "`do { … } while (0)` wraps several statements so that the macro behaves as a single statement and needs a semicolon after it. A bare `{ … }` breaks when the macro is used before an `else`.",
              "`ARRAY_LEN` has to be a macro. A function would receive a pointer and could not see the array's size.",
            ] },
          ],
        },
        {
          title: 'Conditional compilation',
          body: [
            "`#if`, `#ifdef`, `#ifndef`, `#elif`, `#else` and `#endif` include or leave out stretches of source text. The compiler never sees the parts left out, so they need not even be valid for the current platform.",
            { run: c`#include <assert.h>
#include <stdio.h>

#define DEBUG 1

int divide(int a, int b) {
    assert(b != 0);                    // Documents an assumption, and checks it.
    return a / b;
}

int main(void) {
#if DEBUG
    puts("debug build");
#else
    puts("release build");
#endif

#ifdef __wasm__
    puts("compiled for WebAssembly");
#elif defined(__APPLE__)
    puts("compiled for an Apple platform");
#endif

    printf("%d\n", divide(10, 2));
    return 0;
}`, name: 'conditional.c', sizes: true, expect: 'debug build\ncompiled for WebAssembly\n5\n' },
            { list: [
              "Compilers predefine macros that describe the target, such as `__APPLE__`, `__linux__` and `_WIN32`. Portable code branches on them.",
              "A macro can be defined from the command line: `clang -DDEBUG=1 …`. That is how one source tree produces debug and release builds.",
              "`assert(condition)` stops the program with a message if the condition is false. Defining `NDEBUG` removes every assertion, so an assertion must never contain code the program depends on.",
            ] },
          ],
        },
        {
          title: 'Headers and source files',
          body: [
            "A real program is many `.c` files. Each is compiled on its own into an object file, and the linker joins them. A file can only call a function in another file if it has seen a declaration, so declarations that several files need are put in a **header** and included wherever they are used.",
            { code: c`#ifndef COUNTER_H
#define COUNTER_H

#include <stdbool.h>

struct Counter {
    int value;
    int limit;
};

void counter_init(struct Counter *counter, int limit);
bool counter_increment(struct Counter *counter);   // false once the limit is reached

#endif`, name: 'counter.h' },
            { code: c`#include "counter.h"

static bool at_limit(const struct Counter *counter) {   // Private to this file.
    return counter->value >= counter->limit;
}

void counter_init(struct Counter *counter, int limit) {
    counter->value = 0;
    counter->limit = limit;
}

bool counter_increment(struct Counter *counter) {
    if (at_limit(counter)) {
        return false;
    }
    counter->value++;
    return true;
}`, name: 'counter.c' },
            { code: c`#include <stdio.h>
#include "counter.h"

int main(void) {
    struct Counter counter;
    counter_init(&counter, 3);
    while (counter_increment(&counter)) {
        printf("%d\n", counter.value);
    }
    return 0;
}`, name: 'main.c' },
            { native: [
              "Compile each source file to an object file, then link:",
              { text: 'clang -std=c17 -Wall -Wextra -c counter.c     # produces counter.o\nclang -std=c17 -Wall -Wextra -c main.c        # produces main.o\nclang counter.o main.o -o counter_demo        # links them' },
              "Passing both `.c` files to one `clang` command does all three steps. Build tools such as `make` exist to recompile only the files that changed.",
            ] },
            { table: {
              head: ['Goes in the header', 'Goes in one source file'],
              rows: [
                ['Function prototypes', 'Function bodies'],
                ['Struct, enum and typedef definitions that callers need', 'Helper functions, marked `static`'],
                ['Macros and constants that callers need', 'Definitions of variables'],
                ['`extern` declarations of shared variables', 'Types and macros used only in this file'],
              ],
            } },
            { list: [
              "The `#ifndef` … `#define` … `#endif` wrapper is an **include guard**. If the header is included twice in one compilation, perhaps indirectly, the second copy is skipped. Without it, `struct Counter` would be defined twice, which is an error. Many projects use the non-standard but universal `#pragma once` instead.",
              "`#include \"counter.h\"` with quotes looks next to the including file first. Angle brackets search the system directories.",
              "Never put a function body or a variable definition in a header unless it is `static` or `static inline`. Every file that includes it would get its own copy, and the linker would report duplicate symbols.",
            ] },
            { compare: "A header is an interface description that you write and keep in step by hand, like a `.d.ts` file. There is no `import`. `#include` pastes text, and the only privacy a file has is `static`." },
          ],
        },
        {
          title: 'Opaque types',
          body: [
            "The header above shows `struct Counter` to everybody, so any caller can reach into its members. C's way to hide a representation is an **opaque type**. The header declares only that the struct exists. The source file is the one place that defines what is in it.",
            { code: c`struct Stack;                                   // Incomplete: callers cannot see inside.

struct Stack *stack_create(size_t capacity);    // The caller owns the result...
void stack_destroy(struct Stack *stack);        // ...and releases it with this.
bool stack_push(struct Stack *stack, int value);
bool stack_pop(struct Stack *stack, int *out);`, name: 'stack.h' },
            "Callers can hold a `struct Stack *` and pass it to these functions, and that is all. They cannot read a member, and they cannot declare a `struct Stack` variable, because they do not know its size. The library has to allocate it, which is why the pattern always comes with a create function and a destroy function.",
            "You have used an opaque type from the first lesson. `FILE`, behind `printf` and the rest of `<stdio.h>`, is one.",
          ],
        },
        {
          title: 'Variables shared between files',
          body: [
            "A variable that several files use is **defined** in exactly one source file and **declared** with `extern` in a header.",
            { code: c`// settings.h
extern int verbosity;       // A declaration: the variable exists somewhere.

// settings.c
int verbosity = 1;          // The definition: storage is reserved here.` },
            "This is the mechanism for global state. Use it rarely. A function that takes what it needs as parameters can be read, tested and reused on its own. One that reaches for globals cannot.",
          ],
        },
      ],
      takeaways: [
        "The preprocessor substitutes text. It does not know C.",
        "In a macro, parenthesize every parameter and the whole body, and remember that arguments are evaluated each time they appear.",
        "Prefer `static inline` functions and `enum` constants to macros where either will do.",
        "Headers declare. Exactly one source file defines. `static` keeps a name private to its file.",
        "Guard every header against double inclusion.",
      ],
      quiz: [
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

#define SQUARE(x) x * x

int main(void) {
    printf("%d\n", SQUARE(2 + 3));
    return 0;
}`,
          answer: '11',
          explain: "The expansion is `2 + 3 * 2 + 3`. Multiplication binds first, giving 2 + 6 + 3.",
          hint: "Write out the text after substitution, with no added parentheses, and then apply the usual precedence.",
        },
        {
          q: 'With `#define MAX(a, b) ((a) > (b) ? (a) : (b))`, what is the problem with `MAX(i++, limit)`?',
          options: [
            { t: 'Nothing. The macro is fully parenthesized', why: "Parentheses fix precedence. They do nothing about how many times an argument is evaluated." },
            { t: '`i++` appears twice in the expansion, so `i` may be incremented twice', ok: true, why: "The text `i++` is pasted in for each `a`. When `i` is the larger value it is incremented a second time, and the result is not the one a function call would give." },
            { t: 'Macros cannot take expressions as arguments', why: "They take any text. That is exactly the hazard." },
          ],
        },
        {
          q: 'What is the purpose of the `#ifndef UTIL_H` / `#define UTIL_H` / `#endif` wrapper in a header?',
          options: [
            { t: 'It makes the header private to one source file', why: "Any file may still include it. Privacy comes from `static`, or from not putting something in a header at all." },
            { t: 'It makes a second inclusion of the header in the same compilation expand to nothing', ok: true, why: "The first inclusion defines `UTIL_H`. On the second, `#ifndef UTIL_H` is false and everything up to `#endif` is skipped, which avoids defining the same types twice." },
            { t: 'It speeds up the linker', why: "The guard is handled entirely by the preprocessor, long before linking." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these belong in a header file?',
          options: [
            { t: 'The prototype of a function that other files call', ok: true, why: "Callers need the declaration in order to compile." },
            { t: 'The definition of a struct that callers create and use directly', ok: true, why: "Code that declares a variable of the type, or touches its members, must see the full definition." },
            { t: 'The body of an ordinary, non-inline function', why: "Every file that includes the header would define the function, and the linker would see duplicates." },
            { t: 'A `static` helper that only one source file uses', why: "Keep it in that source file. In a header, every includer would get an unused private copy." },
            { t: 'A `#define` constant that callers need', ok: true, why: "Macros are not visible across files any other way." },
          ],
          hint: "A header holds what other files need to know in order to use the code, and nothing that reserves storage or generates machine code.",
        },
        {
          q: 'What does the preprocessor do with `#include "util.h"`?',
          options: [
            { t: 'Records a dependency for the linker to resolve', why: "The linker never hears of header files." },
            { t: 'Replaces the line with the entire text of `util.h`', ok: true, why: "Inclusion is literal. The compiler then sees one long stream of source, as if you had pasted the header in by hand." },
            { t: 'Loads a compiled module', why: "C17 has no modules. Headers are source text." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

#define SAY_TWICE(text) puts(text); puts(text)

int main(void) {
    if (0)
        SAY_TWICE("x");
    puts("done");
    return 0;
}`,
          answer: 'x\ndone',
          explain: "The macro expands to two statements, and only the first is governed by the `if`. The second `puts(\"x\")` always runs. Wrapping the body in `do { … } while (0)` would make it one statement.",
          hint: "Expand the macro by hand. Which statements belong to the `if`?",
        },
        {
          q: 'A library header declares `struct Parser;` and nothing more about it. Why can your code not write `struct Parser p;`?',
          options: [
            { t: 'Because the struct is declared `static`', why: "No `static` is involved, and it would not apply to a type in any case." },
            { t: 'Because the compiler does not know the struct\'s size or members, so it cannot reserve storage', ok: true, why: "The type is incomplete outside the library. You may hold a `struct Parser *`, since every pointer has a known size, and the library must do the allocating." },
            { t: 'Because structs can only be created with `malloc`', why: "A struct whose definition is visible can be an ordinary local variable." },
          ],
        },
      ],
      challenges: [
        {
          id: 'fix-macros',
          title: 'Parenthesize the macros',
          level: 'warm-up',
          kind: 'fix',
          starterWarns: true,
          prompt: [
            "These three macros give wrong answers as soon as they are used inside a larger expression, or handed an argument that is itself an expression.",
            "Fix them by adding parentheses. Keep them as macros, and do not change what they compute.",
          ],
          signature: 'DOUBLE(x)\nMAX(a, b)\nIS_ODD(n)',
          starter: c`#define DOUBLE(x) x + x
#define MAX(a, b) a > b ? a : b
#define IS_ODD(n) n % 2 == 1`,
          hints: [
            "Take the first failing check and write out its expansion by hand.",
            "Each parameter needs its own parentheses, so that an argument such as `2 + 1` stays together.",
            "The whole body needs parentheses too, so that it stays together inside whatever surrounds the macro.",
          ],
          solution: c`#define DOUBLE(x) ((x) + (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define IS_ODD(n) ((n) % 2 == 1)`,
          tests: [
            { label: 'DOUBLE inside a larger expression', body: c`CHECK(DOUBLE(3) * 2 == 12);
CHECK(10 - DOUBLE(2) == 6);` },
            { label: 'MAX inside a larger expression', body: c`CHECK(2 * MAX(1, 3) == 6);
CHECK(MAX(4, 2) + 1 == 5);` },
            { label: 'IS_ODD with an expression as its argument', body: c`CHECK(IS_ODD(2 + 1));
CHECK(!IS_ODD(3 + 1));` },
            { label: 'Operators next to a macro call', body: c`CHECK(!IS_ODD(4));
CHECK(DOUBLE(1 << 2) == 8);` },
          ],
        },
        {
          id: 'array-len-clamp',
          title: 'Two useful macros',
          level: 'core',
          prompt: [
            "Define two macros.",
            "`ARRAY_LEN(array)` is the number of elements in a real array, of any element type.",
            "`CLAMP(x, lo, hi)` is `x` limited to the range from `lo` to `hi`: `lo` if `x` is below it, `hi` if `x` is above it, and otherwise `x`. Its arguments may be arbitrary expressions without side effects, and it may appear inside a larger expression.",
          ],
          signature: 'ARRAY_LEN(array)\nCLAMP(x, lo, hi)',
          starter: c`#define ARRAY_LEN(array) 0
#define CLAMP(x, lo, hi) (x)`,
          hints: [
            "The size of the whole array divided by the size of one element: `sizeof (array) / sizeof (array)[0]`.",
            "`CLAMP` is two conditional operators, one inside the other.",
            "Parenthesize every use of every parameter. One of the tests passes `1 | 2`, and `|` binds more loosely than `<`.",
          ],
          solution: c`#define ARRAY_LEN(array) (sizeof (array) / sizeof (array)[0])
#define CLAMP(x, lo, hi) ((x) < (lo) ? (lo) : (x) > (hi) ? (hi) : (x))`,
          tests: [
            { label: 'ARRAY_LEN counts elements of any type', body: c`int numbers[7];
double ratios[3];
char text[] = "hey";
(void)numbers;
(void)ratios;
(void)text;
CHECK(ARRAY_LEN(numbers) == 7);
CHECK(ARRAY_LEN(ratios) == 3);
CHECK(ARRAY_LEN(text) == 4);` },
            { label: 'CLAMP limits a value on both sides', body: c`CHECK(CLAMP(5, 0, 10) == 5);
CHECK(CLAMP(-3, 0, 10) == 0);
CHECK(CLAMP(42, 0, 10) == 10);
CHECK(CLAMP(0, 0, 10) == 0 && CLAMP(10, 0, 10) == 10);` },
            { label: 'CLAMP accepts expressions as arguments', body: c`CHECK(CLAMP(2 + 20, 0, 5 + 5) == 10);
CHECK(CLAMP(1 | 2, 0, 10) == 3);` },
            { label: 'CLAMP works inside a larger expression', body: c`CHECK(2 * CLAMP(7, 1, 3) == 6);
CHECK(CLAMP(7, 1, 3) + 1 == 4);` },
          ],
        },
        {
          id: 'swap-macro',
          title: 'A macro that is one statement',
          level: 'core',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "`SWAP(type, a, b)` exchanges two variables of the given type. It has to be a macro, because a function could not take the type as an argument.",
            "As written, it breaks the build when it is used as the body of an `if` that has an `else`. Read the error, then rewrite the macro so that it behaves as a single statement.",
          ],
          signature: 'SWAP(type, a, b)',
          starter: c`#define SWAP(type, a, b) { type saved = a; a = b; b = saved; }`,
          hints: [
            "`if (c) SWAP(int, x, y); else …` expands to `if (c) { … }; else …`. The semicolon after the closing brace ends the `if` statement, leaving the `else` with nothing to attach to.",
            "Wrap the body in `do { … } while (0)`, with no semicolon at the end of the macro. The caller's semicolon then completes the statement.",
          ],
          solution: c`#define SWAP(type, a, b) \
    do { \
        type saved = (a); \
        (a) = (b); \
        (b) = saved; \
    } while (0)`,
          tests: [
            { label: 'Swaps two ints', body: c`int x = 1;
int y = 2;
SWAP(int, x, y);
CHECK(x == 2 && y == 1);` },
            { label: 'Works as the body of an if with an else', body: c`int x = 1;
int y = 2;
if (x < y)
    SWAP(int, x, y);
else
    x = 99;
CHECK(x == 2 && y == 1);` },
            { label: 'Swaps other types', body: c`const char *first = "one";
const char *second = "two";
double a = 1.5;
double b = 2.5;
SWAP(const char *, first, second);
SWAP(double, a, b);
CHECK(strcmp(first, "two") == 0 && strcmp(second, "one") == 0);
CHECK(a == 2.5 && b == 1.5);` },
            { label: 'Swaps array elements', body: c`int values[] = { 10, 20, 30 };
SWAP(int, values[0], values[2]);
CHECK(values[0] == 30 && values[1] == 20 && values[2] == 10);` },
          ],
        },
      ],
    },

    {
      id: 'undefined-behavior',
      title: 'Undefined behavior & your toolchain',
      category: part,
      minutes: 30,
      summary: 'What undefined behavior really means, the habits that keep you out of it, and the tools on your own machine that find it for you.',
      topics: ['Kinds of behavior', 'What compilers assume', 'Sanitizers', 'Debugging', 'Next steps'],
      sections: [
        {
          title: 'Three ways of leaving things open',
          body: [
            "The C standard deliberately does not pin everything down, and it uses three different terms for what it leaves open. They are very different in how much they should worry you.",
            { table: {
              head: ['Term', 'Meaning', 'Examples'],
              rows: [
                ['Implementation-defined', 'Each compiler must choose a behavior and document it.', 'The size of `int`. Whether plain `char` is signed. Right-shifting a negative number.'],
                ['Unspecified', 'One of several permitted outcomes happens. Nothing says which, or that it will be the same next time.', 'The order in which a call\'s arguments are evaluated.'],
                ['Undefined', 'The standard places no requirement on the program at all.', 'Everything in the table further down.'],
              ],
            } },
            "The first two are facts about a platform, to be handled with `sizeof`, fixed-width types, and a little care. The third is the one this lesson is about.",
          ],
        },
        {
          title: 'What undefined actually means',
          body: [
            "It is natural to read undefined behavior as “you get whatever the processor happens to do”. That is not the rule, and the difference matters. The rule is that the compiler may assume undefined behavior **never happens**, and may use that assumption when it optimizes.",
            { code: c`int will_overflow(int x) {
    return x + 1 < x;      // Could only be true if x + 1 overflowed.
}` },
            "Signed overflow is undefined, so as far as the compiler is concerned `x + 1` is always greater than `x`. With optimization on, this function compiles to `return 0`. Without it, the function may well return 1 for `INT_MAX`. The same source gives two different answers depending on a build flag.",
            { code: c`int first(const int *p) {
    int value = *p;        // p has been dereferenced, so the compiler concludes it is not null...
    if (p == NULL) {       // ...and is entitled to delete this check.
        return -1;
    }
    return value;
}` },
            "Here the safety check itself disappears, because it comes after the dereference that makes it pointless. This is why undefined behavior cannot be reasoned about locally. Once a program does something undefined, the standard makes no promise about any part of its execution, including the parts that ran earlier.",
          ],
        },
        {
          title: 'The usual suspects',
          body: [
            "Every one of these has come up in an earlier lesson. Seen together, they make a checklist.",
            { table: {
              head: ['Category', 'Example'],
              rows: [
                ['Out-of-bounds access', '`int a[4]; a[4] = 0;`'],
                ['Dangling pointer', 'Using `&local` after the function has returned, or a pointer after `free`.'],
                ['Null dereference', '`int *p = NULL; *p = 1;`'],
                ['Uninitialized read', '`int n; return n;`'],
                ['Signed overflow', '`INT_MAX + 1`'],
                ['Bad shift', '`1 << 32`, or shifting a negative value left'],
                ['Division by zero', '`x / 0`, and `INT_MIN / -1`'],
                ['Modifying a string literal', '`char *s = "hi"; s[0] = \'H\';`'],
                ['Unsequenced modification', '`i = i++;`'],
                ['Mismatched `printf` conversion', '`printf("%d", 2.5);`'],
                ['Bad `free`', 'Freeing twice, or freeing something `malloc` did not return.'],
                ['Wrong pointer type', 'Reading a `float` through an `int *`.'],
                ['Overlapping `memcpy`', 'Use `memmove` when the regions overlap.'],
                ['Falling off a non-void function', 'Using the value of a call that reached the closing brace without a `return`.'],
              ],
            } },
          ],
        },
        {
          title: 'Why it works on my machine',
          body: [
            "The most dangerous property of undefined behavior is that it usually appears to work. The out-of-bounds read returns something plausible, the freed memory still holds the old value, and the program passes its tests. Then a compiler upgrade, an optimization level or a different platform changes the outcome.",
            "This program reads one element past the end of an array on purpose. Run it.",
            { run: c`#include <stdio.h>

int main(void) {
    int before = 111;
    int values[3] = { 1, 2, 3 };
    int after = 222;

    // Undefined behavior, on purpose: index 3 is one past the end.
    printf("values[3] = %d\n", values[3]);
    printf("(before = %d, after = %d)\n", before, after);
    return 0;
}`, name: 'works.c', warns: true, varies: true },
            "The compiler warned, because the index is a constant it can check. The program printed a number anyway and exited normally. With this compiler, today, that number is probably one of the neighboring variables. Nothing in the language says so, and with an index computed at run time there would have been no warning either.",
            "That is the case for the rest of this lesson: you cannot find these bugs by watching the program's output. You need habits that avoid them and tools that detect them.",
          ],
        },
        {
          title: 'Habits that keep you out of trouble',
          body: [
            { list: [
              "**Initialize every variable** where you declare it, pointers included. `NULL` is a far better starting value than garbage.",
              "**An array always travels with its length**, and anything that writes into a buffer is told its capacity.",
              "**Check pointers at the boundaries**: every allocation, every lookup that can fail, and every parameter that is documented as optional.",
              "**Use `size_t` for sizes and counts**, and check the arithmetic whenever a size comes from outside the program.",
              "**Give every allocation one owner**, and decide who that is before writing the code. Set a pointer to `NULL` once you have freed what it pointed to.",
              "**Use `const`** wherever a function only reads.",
              "**State assumptions with `assert`**, so that a violated assumption stops the program at the cause instead of at a distant symptom.",
              "**Build with warnings on** and fix every one.",
            ] },
          ],
        },
        {
          title: 'Tools on your own machine',
          body: [
            "Everything in this manual runs in the page so that you could start immediately. For real work, use the compiler on your Mac, because it comes with tools this page cannot offer. The most important are the **sanitizers**: options that make the compiler add checks to the program, so that undefined behavior is reported the moment it happens.",
            { native: [
              "A good everyday build command:",
              { text: 'clang -std=c17 -Wall -Wextra -Wpedantic -g -fsanitize=address,undefined main.c -o main' },
              "With that, a use after free stops the program with a report like this, abridged:",
              { text: '==4242==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000014\nREAD of size 4 at 0x602000000014 thread T0\n    #0 main demo.c:9\nfreed by thread T0 here:\n    #1 main demo.c:7\npreviously allocated by thread T0 here:\n    #1 main demo.c:4' },
              "It names the line of the bad read, the line that freed the block, and the line that allocated it.",
            ] },
            { table: {
              head: ['Tool', 'What it finds'],
              rows: [
                ['`-Wall -Wextra`', 'Suspicious code at compile time: mismatched formats, missing returns, sign confusion.'],
                ['`-fsanitize=address`', 'Out-of-bounds access, use after free, double free, and at exit, leaks on some platforms.'],
                ['`-fsanitize=undefined`', 'Signed overflow, invalid shifts, null dereference, misaligned access, and more.'],
                ['`leaks --atExit -- ./main`', 'Heap blocks that were never freed. This one is specific to macOS.'],
                ['`lldb ./main`', 'The debugger. `run` starts the program, `bt` shows the call stack after a crash, and `frame variable` shows the locals.'],
                ['`clang --analyze main.c`', 'A static analyzer that traces paths through the code looking for leaks and null dereferences without running it.'],
              ],
            } },
            { tip: "Sanitized builds run perhaps two or three times slower. Use them for all development and testing, and build without them only for the version you ship." },
          ],
        },
        {
          title: 'Where to go from here',
          body: [
            "You now have the core language: its types and conversions, pointers in all their forms, arrays and strings, structs and unions, the heap, and the preprocessor. What remains is mostly library and practice.",
            { list: [
              "**Files and errors.** `<stdio.h>` has `fopen`, `fgets`, `fread`, `fwrite` and `fclose`. Library functions report failure through their return value and the variable `errno`, which `strerror` and `perror` turn into messages.",
              "**Building.** Learn enough `make` or CMake to compile a project of several files with one command.",
              "**Reading real code.** Lua and SQLite are both written in careful, readable C, and are small enough to find your way around. Read how they handle ownership and errors.",
              "**Books.** *The C Programming Language* by Kernighan and Ritchie is short, old, and still the best-written. *Modern C* by Jens Gustedt covers current practice thoroughly. Beej's Guide to C Programming is a friendly reference.",
              "**The next standard.** C23 makes `bool`, `true` and `false` keywords, adds `nullptr`, `typeof` and `constexpr`, and makes an empty parameter list mean no parameters. Everything in this manual remains valid there.",
            ] },
            "The best next step is a small project of your own, built on your Mac with the sanitizers switched on: a command-line tool, a parser for a format you know, or a data structure with tests. The challenges that follow are a last warm-up for that. Each one is a piece of realistic code with realistic bugs.",
          ],
        },
      ],
      takeaways: [
        "Undefined behavior means the compiler may assume it never happens. Its effects are not confined to the line that causes it.",
        "Code with undefined behavior often passes its tests. Output alone tells you nothing.",
        "Initialize, carry lengths and capacities, check pointers, and give every allocation an owner.",
        "On your own machine, develop with `-Wall -Wextra -g -fsanitize=address,undefined`.",
      ],
      quiz: [
        {
          q: 'Which of these is undefined behavior, as opposed to something that merely varies between platforms?',
          options: [
            { t: 'The value of `sizeof(long)`', why: "Implementation-defined. Each compiler picks a value and documents it." },
            { t: 'Whether plain `char` is signed', why: "Implementation-defined." },
            { t: 'Whether `f()` or `g()` is called first in `f() + g()`', why: "Unspecified. Either order may happen, but each call is still well defined." },
            { t: 'The result of `INT_MAX + 1`', ok: true, why: "Signed overflow is undefined. The compiler may assume it never occurs." },
          ],
        },
        {
          q: 'What is the bug?',
          code: c`char *make_id(int n) {
    char text[16];
    snprintf(text, sizeof text, "id-%d", n);
    return text;
}`,
          options: [
            { t: '`snprintf` can overflow the buffer', why: "`snprintf` is given the buffer's size and will not write past it." },
            { t: 'It returns a pointer to a local array, which is destroyed on return', ok: true, why: "The caller receives a dangling pointer. Take a buffer from the caller, or allocate one on the heap." },
            { t: '`%d` is the wrong conversion for `n`', why: "`n` is an `int`, and `%d` is correct for it." },
          ],
        },
        {
          q: 'What is the bug?',
          code: c`int total(const int *values, size_t count) {
    int sum;
    for (size_t i = 0; i < count; ++i) {
        sum += values[i];
    }
    return sum;
}`,
          options: [
            { t: 'The loop reads one element too many', why: "`i < count` visits exactly the elements 0 to `count - 1`." },
            { t: '`sum` is never initialized, so the function adds to an indeterminate value', ok: true, why: "It may happen to start at zero, which is how this bug survives. It needs `int sum = 0;`" },
            { t: 'A `const` pointer cannot be indexed', why: "`const` prevents writing through the pointer. Reading and indexing are fine." },
          ],
        },
        {
          q: 'What is the bug?',
          code: c`char name[5];
strcpy(name, "Linus");`,
          options: [
            { t: 'Nothing. Five letters fit in five bytes', why: "The string also has a terminator, and `strcpy` copies it." },
            { t: '`strcpy` writes six bytes into a five-byte array', ok: true, why: "Five letters plus the terminating zero. The sixth byte lands outside `name`." },
            { t: '`name` must be initialized before it is written to', why: "Writing to an uninitialized array is exactly how you initialize it." },
          ],
        },
        {
          q: 'What is the bug?',
          code: c`unsigned top_bit = 1 << 31;`,
          options: [
            { t: 'Nothing, since the result is stored in an `unsigned`', why: "The shift is carried out before the assignment, in the type of the left operand." },
            { t: 'The literal `1` is a signed `int`, and shifting a 1 into its sign bit is undefined', ok: true, why: "Write `1u << 31`, so that the shift is done on an unsigned value." },
            { t: 'A shift count may not be larger than 16', why: "Counts up to one less than the width of the type are allowed. For a 32-bit type that is 31." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these have undefined behavior? Assume `int` is 32 bits.',
          options: [
            { t: '`int a[4]; a[4] = 0;`', ok: true, why: "Index 4 is one past the last element. Writing there is out of bounds." },
            { t: '`int a[4]; int *p = a + 4;`', why: "Forming the one-past pointer is legal. Only dereferencing it is not." },
            { t: '`unsigned u = 0; u--;`', why: "Unsigned arithmetic wraps. `u` becomes `UINT_MAX`, by definition." },
            { t: '`int i = INT_MAX; i++;`', ok: true, why: "Signed overflow." },
            { t: '`char *s = "hi"; s[0] = \'H\';`', ok: true, why: "A string literal must not be modified." },
          ],
          hint: "Two of these look alarming and are perfectly well defined.",
        },
        {
          q: 'A program containing undefined behavior printed exactly the expected output in every test. What can you conclude?',
          options: [
            { t: 'The undefined behavior is harmless in this program', why: "It is harmless with this compiler, these flags, this platform and these inputs. Any of them can change." },
            { t: 'The compiler has defined the behavior for you', why: "A compiler may document extensions, but an expected output is not a guarantee of anything." },
            { t: 'Nothing. Appearing to work is one of the permitted outcomes', ok: true, why: "This is why sanitizers matter. They report the undefined operation itself, whether or not the output looks right." },
          ],
        },
        {
          q: 'Which tool stops a program at a use after free and shows where the block was allocated and freed?',
          options: [
            { t: '`-Wall -Wextra`', why: "Warnings come from examining the source at compile time. Most use-after-free bugs depend on what happens at run time." },
            { t: '`-fsanitize=address`', ok: true, why: "AddressSanitizer instruments every memory access and keeps track of the state of every heap block." },
            { t: '`-O2`', why: "That turns on optimization. If anything it makes undefined behavior less predictable." },
          ],
        },
      ],
      challenges: [
        {
          id: 'fill-squares',
          title: 'One square too many',
          level: 'warm-up',
          kind: 'fix',
          prompt: "`fill_squares` should write the first `count` square numbers, 0, 1, 4, 9 and so on, into `out`. It writes one element more than it was asked to. The tests put a marker value just past the requested range to catch that.",
          signature: 'void fill_squares(int *out, size_t count)',
          starter: c`// Fills out[0] to out[count - 1] with 0, 1, 4, 9, ...
void fill_squares(int *out, size_t count) {
    for (size_t i = 0; i <= count; ++i) {
        out[i] = (int)(i * i);
    }
}`,
          hints: ["Count the passes the loop makes when `count` is 0."],
          solution: c`// Fills out[0] to out[count - 1] with 0, 1, 4, 9, ...
void fill_squares(int *out, size_t count) {
    for (size_t i = 0; i < count; ++i) {
        out[i] = (int)(i * i);
    }
}`,
          tests: [
            { label: 'Writes the squares', body: c`int out[5] = { -1, -1, -1, -1, -1 };
fill_squares(out, 4);
CHECK(out[0] == 0 && out[1] == 1 && out[2] == 4 && out[3] == 9);` },
            { label: 'Stops at count', body: c`int out[5] = { -1, -1, -1, -1, -1 };
fill_squares(out, 4);
CHECK(out[4] == -1);` },
            { label: 'Writes nothing for a count of zero', body: c`int out[1] = { -1 };
fill_squares(out, 0);
CHECK(out[0] == -1);
fill_squares(NULL, 0);` },
          ],
        },
        {
          id: 'average',
          title: 'An average with four bugs',
          level: 'core',
          kind: 'fix',
          broken: 'crash',
          starterWarns: true,
          prompt: [
            "`average` should return the mean of the first `count` values, rounded toward zero, and 0 for an empty array. It is six lines long and has four separate bugs, each of which you have met in an earlier lesson.",
            "Start with the compiler warning. Then let the failing tests point you to the rest. One of them stops the program outright.",
          ],
          signature: 'int average(const int *values, size_t count)',
          starter: c`// Returns the mean of the first count values, rounded toward zero.
// Returns 0 when count is zero.
int average(const int *values, size_t count) {
    int sum;
    for (size_t i = 0; i < count; ++i) {
        sum += values[i];
    }
    return sum / count;
}`,
          hints: [
            "What value does `sum` start with?",
            "What does the last line do when `count` is zero?",
            "`sum / count` divides an `int` by a `size_t`. Which type is the division carried out in, and what does that do to a negative sum?",
            "Two values near `INT_MAX` overflow an `int` sum. A `long long` has room.",
          ],
          solution: c`// Returns the mean of the first count values, rounded toward zero.
// Returns 0 when count is zero.
int average(const int *values, size_t count) {
    if (count == 0) {
        return 0;
    }
    long long sum = 0;
    for (size_t i = 0; i < count; ++i) {
        sum += values[i];
    }
    return (int)(sum / (long long)count);
}`,
          tests: [
            { label: 'Averages positive values', body: c`const int values[] = { 2, 4, 6 };
CHECK(average(values, 3) == 4);` },
            { label: 'Averages negative values', body: c`const int values[] = { -4, -6 };
CHECK(average(values, 2) == -5);` },
            { label: 'Rounds toward zero', body: c`const int up[] = { 3, 4 };
const int down[] = { -3, -4 };
CHECK(average(up, 2) == 3);
CHECK(average(down, 2) == -3);` },
            { label: 'Handles values near the limit of int', body: c`const int values[] = { INT_MAX, INT_MAX, INT_MAX - 3 };
CHECK(average(values, 3) == INT_MAX - 1);` },
            { label: 'Returns zero for an empty array', body: c`const int values[] = { 9 };
CHECK(average(values, 0) == 0);` },
          ],
        },
        {
          id: 'make-greeting',
          title: 'A greeting that survives',
          level: 'core',
          kind: 'fix',
          track: true,
          starterWarns: true,
          prompt: [
            "`make_greeting` is documented to return a newly allocated string such as `Hello, Ada!`, which the caller frees. It returns a pointer to a local array instead.",
            "Make it do what the documentation says. The name can be any length, so a fixed-size buffer will not do. Return `NULL` if allocation fails.",
          ],
          signature: 'char *make_greeting(const char *name)',
          starter: c`// Returns a newly allocated greeting. The caller frees it.
char *make_greeting(const char *name) {
    char text[64];
    snprintf(text, sizeof text, "Hello, %s!", name);
    return text;
}`,
          hints: [
            "The result needs room for `Hello, ` (7 characters), the name, `!` and a terminator: `strlen(name) + 9` bytes.",
            "Allocate that many bytes, check for `NULL`, and let `snprintf` write into the block, passing the same size.",
          ],
          solution: c`// Returns a newly allocated greeting. The caller frees it.
char *make_greeting(const char *name) {
    size_t size = strlen(name) + sizeof "Hello, !";
    char *text = malloc(size);
    if (text == NULL) {
        return NULL;
    }
    snprintf(text, size, "Hello, %s!", name);
    return text;
}`,
          solutionNote: "`sizeof \"Hello, !\"` is 9: the eight characters of the fixed text plus the terminator. Letting the compiler count avoids an off-by-one.",
          tests: [
            { label: 'Builds the greeting on the heap', body: c`char *greeting = make_greeting("Ada");
CHECK(greeting != NULL);
if (greeting != NULL) {
    CHECK(BLOCK_SIZE(greeting) > 0);
    CHECK(strcmp(greeting, "Hello, Ada!") == 0);
}
free(greeting);` },
            { label: 'Handles an empty name', body: c`char *greeting = make_greeting("");
CHECK(greeting != NULL);
if (greeting != NULL && BLOCK_SIZE(greeting) > 0) {
    CHECK(strcmp(greeting, "Hello, !") == 0);
}
free(greeting);` },
            { label: 'Does not truncate a long name', body: c`char name[101];
memset(name, 'n', 100);
name[100] = '\0';
char *greeting = make_greeting(name);
CHECK(greeting != NULL);
if (greeting != NULL && BLOCK_SIZE(greeting) > 0) {
    CHECK(strlen(greeting) == 108);
    CHECK(greeting[107] == '!');
}
free(greeting);` },
            { label: 'Returns NULL when allocation fails', body: c`FAIL_ALLOCATIONS_AFTER(0);
char *greeting = make_greeting("Ada");
CHECK(greeting == NULL);` },
          ],
        },
        {
          id: 'make-pair',
          title: 'Two bytes short',
          level: 'core',
          kind: 'fix',
          track: true,
          prompt: [
            "`make_pair` builds a string such as `name=Ada` in a new allocation that the caller frees. It appears to work, and it has two bugs: one in the size it asks for, and one in what it does when the allocation fails.",
            "The checking allocator will tell you about both.",
          ],
          signature: 'char *make_pair(const char *key, const char *value)',
          starter: c`// Returns a newly allocated "key=value" string, or NULL if allocation fails.
char *make_pair(const char *key, const char *value) {
    char *text = malloc(strlen(key) + strlen(value));
    strcpy(text, key);
    strcat(text, "=");
    strcat(text, value);
    return text;
}`,
          hints: [
            "Count every byte the result holds: the key, the equals sign, the value, and one more.",
            "`malloc` can return `NULL`. What does `strcpy` do with it?",
          ],
          solution: c`// Returns a newly allocated "key=value" string, or NULL if allocation fails.
char *make_pair(const char *key, const char *value) {
    size_t size = strlen(key) + 1 + strlen(value) + 1;
    char *text = malloc(size);
    if (text == NULL) {
        return NULL;
    }
    snprintf(text, size, "%s=%s", key, value);
    return text;
}`,
          tests: [
            { label: 'Builds the pair', body: c`char *pair = make_pair("name", "Ada");
CHECK(pair != NULL);
if (pair != NULL) {
    CHECK(strcmp(pair, "name=Ada") == 0);
}
free(pair);` },
            { label: 'Handles empty pieces', body: c`char *pair = make_pair("", "");
CHECK(pair != NULL);
if (pair != NULL) {
    CHECK(strcmp(pair, "=") == 0);
}
free(pair);` },
            { label: 'Returns NULL when allocation fails', body: c`FAIL_ALLOCATIONS_AFTER(0);
char *pair = make_pair("key", "value");
CHECK(pair == NULL);
free(pair);` },
          ],
        },
        {
          id: 'split-words',
          title: 'Split a line into words',
          level: 'stretch',
          track: true,
          prompt: [
            "The final challenge uses strings, pointers to pointers and the heap together.",
            "`split_words` returns a newly allocated array of newly allocated strings, one for each word in `text`. Words are separated by one or more spaces, and spaces at either end are ignored. The number of words is stored in `*count`.",
            "If there are no words, return `NULL` with `*count` set to zero. If any allocation fails, free everything allocated so far and return `NULL` with `*count` set to zero.",
            "`free_words` releases everything `split_words` returned. It must accept `NULL`.",
          ],
          signature: 'char **split_words(const char *text, size_t *count)\nvoid free_words(char **words, size_t count)',
          starter: c`void free_words(char **words, size_t count) {
}

char **split_words(const char *text, size_t *count) {
    *count = 0;
    return NULL;
}`,
          hints: [
            "Make two passes over the text. The first only counts words, so that the array of pointers can be allocated at exactly the right size.",
            "In the second pass, for each word: skip spaces, remember where the word starts, advance to its end, allocate `length + 1` bytes, copy the characters, and add the terminator yourself.",
            "Keep track of how many words have been stored so far. If an allocation fails, `free_words(words, stored)` releases exactly those, plus the array.",
            "Set `*count` to zero at the top and to the real count only on success.",
          ],
          solution: c`static size_t count_words(const char *text) {
    size_t words = 0;
    const char *p = text;
    while (*p != '\0') {
        while (*p == ' ') {
            ++p;
        }
        if (*p == '\0') {
            break;
        }
        ++words;
        while (*p != '\0' && *p != ' ') {
            ++p;
        }
    }
    return words;
}

void free_words(char **words, size_t count) {
    if (words == NULL) {
        return;
    }
    for (size_t i = 0; i < count; ++i) {
        free(words[i]);
    }
    free(words);
}

char **split_words(const char *text, size_t *count) {
    *count = 0;
    size_t total = count_words(text);
    if (total == 0) {
        return NULL;
    }
    char **words = malloc(total * sizeof *words);
    if (words == NULL) {
        return NULL;
    }

    size_t stored = 0;
    const char *p = text;
    while (stored < total) {
        while (*p == ' ') {
            ++p;
        }
        const char *start = p;
        while (*p != '\0' && *p != ' ') {
            ++p;
        }
        size_t length = (size_t)(p - start);
        char *word = malloc(length + 1);
        if (word == NULL) {
            free_words(words, stored);
            return NULL;
        }
        memcpy(word, start, length);
        word[length] = '\0';
        words[stored++] = word;
    }
    *count = total;
    return words;
}`,
          tests: [
            { label: 'Splits on single spaces', body: c`size_t count = 0;
char **words = split_words("alpha beta gamma", &count);
CHECK(words != NULL && count == 3);
if (words != NULL && count == 3) {
    CHECK(strcmp(words[0], "alpha") == 0);
    CHECK(strcmp(words[1], "beta") == 0);
    CHECK(strcmp(words[2], "gamma") == 0);
}
free_words(words, count);` },
            { label: 'Ignores extra spaces', body: c`size_t count = 0;
char **words = split_words("   one    two ", &count);
CHECK(words != NULL && count == 2);
if (words != NULL && count == 2) {
    CHECK(strcmp(words[0], "one") == 0);
    CHECK(strcmp(words[1], "two") == 0);
}
free_words(words, count);` },
            { label: 'Each word is its own exact-size allocation', body: c`const char *text = "a bcd";
size_t count = 0;
char **words = split_words(text, &count);
CHECK(words != NULL && count == 2);
if (words != NULL && count == 2) {
    CHECK(BLOCK_SIZE(words) == 2 * sizeof(char *));
    CHECK(BLOCK_SIZE(words[0]) == 2 && BLOCK_SIZE(words[1]) == 4);
    CHECK(ALLOCATION_COUNT() == 3);
}
free_words(words, count);` },
            { label: 'Returns NULL when there are no words', body: c`size_t count = 99;
CHECK(split_words("", &count) == NULL && count == 0);
count = 99;
CHECK(split_words("     ", &count) == NULL && count == 0);
free_words(NULL, 0);` },
            { label: 'Cleans up when the array cannot be allocated', body: c`size_t count = 99;
FAIL_ALLOCATIONS_AFTER(0);
CHECK(split_words("one two", &count) == NULL);
CHECK(count == 0);` },
            { label: 'Cleans up when a word cannot be allocated', body: c`size_t count = 99;
FAIL_ALLOCATIONS_AFTER(2);
CHECK(split_words("one two three", &count) == NULL);
CHECK(count == 0);
CHECK(LIVE_ALLOCATIONS() == 0);` },
          ],
        },
      ],
    },
  );
})();
