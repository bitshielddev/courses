// Part 1: Foundations. The C you half-know, with its sharp edges marked.
(() => {
  const c = String.raw;
  const part = 'Part 1 · Foundations';

  (window.C_LESSONS ||= []).push(
    {
      id: 'build-and-run',
      title: 'From source to program',
      category: part,
      minutes: 20,
      summary: 'What happens between a .c file and a running program, how to read what the compiler tells you, and how to print things.',
      topics: ['Compile and link', 'main', 'printf', 'Diagnostics'],
      sections: [
        {
          title: 'How this manual works',
          body: [
            "Each lesson has three tabs. **Learn** explains the ideas, **Questions** checks that they landed, and **Challenges** has you write C against a set of tests. You already program, so the lessons skip what a loop is and spend their time on what C does differently.",
            "Every dark code block with a **Run** button is live. It is compiled by a real copy of Clang that runs inside this page, and nothing leaves your machine. Edit the code, break it, run it again. Try it now: change the message, or delete a semicolon and see what the compiler says.",
            { run: c`#include <stdio.h>

int main(void) {
    printf("Hello from C\n");
    return 0;
}`, name: 'hello.c', expect: 'Hello from C\n' },
            { aside: "The compiler in this page builds for 32-bit WebAssembly, where `int`, `long` and pointers are all 4 bytes. On your Mac, `long` and pointers are 8 bytes. C allows both. The lessons point out every place where the difference shows." },
          ],
        },
        {
          title: 'Compile, link, run',
          body: [
            "C has no interpreter and no virtual machine. A separate program, the compiler, turns your source into machine code ahead of time, and the result runs directly on the processor. The build has distinct stages, and it helps to know which one is complaining.",
            { steps: [
              "**Preprocess.** Lines starting with `#` are handled first, as text. `#include <stdio.h>` is replaced by the contents of that header file.",
              "**Compile.** Each `.c` file is translated on its own into an object file of machine code. This is where syntax and types are checked.",
              "**Link.** The object files and libraries are joined into one executable. A function that was declared and called but never defined anywhere is reported here.",
              "**Run.** The operating system loads the executable. From here on nothing checks types, array bounds, or whether a pointer is valid.",
            ] },
            { compare: "Python and PHP find most mistakes while the program runs, and report them with a stack trace. TypeScript checks types before running and then erases them. C is closer to TypeScript in timing but stricter in consequence: types decide which machine instructions are generated, and once the program is built there are no types, no bounds checks and no exceptions left to catch a mistake." },
            { native: [
              "Your Mac already has Clang. Save a program as `hello.c`, then build and run it from a terminal:",
              { text: 'clang -std=c17 -Wall -Wextra -g hello.c -o hello\n./hello' },
              "`-std=c17` selects the language version this manual teaches, `-Wall -Wextra` turn on the warnings you want, `-g` adds debug information, and `-o hello` names the output.",
            ] },
          ],
        },
        {
          title: 'The anatomy of a program',
          body: [
            "A C source file is a list of declarations and function definitions. Execution starts at the function named `main`.",
            { run: c`#include <stdio.h>          // Paste in the declarations for printf and friends.

// A function definition: return type, name, parameters, body.
int square(int n) {
    return n * n;
}

int main(void) {            // Execution starts here.
    int side = 7;           // Every variable is declared with a type.
    printf("%d squared is %d\n", side, square(side));
    return 0;               // Exit status. Zero means success.
}`, name: 'anatomy.c', expect: '7 squared is 49\n' },
            { list: [
              "Statements end with `;`. Blocks are wrapped in `{ }`. Whitespace and indentation mean nothing to the compiler.",
              "`int main(void)` says that `main` takes no parameters and returns an `int`. That return value becomes the process exit status, the number a shell sees in `$?`.",
              "`square` is defined above `main` because the compiler reads a file once, top to bottom, and must have seen a name before it is used. The functions lesson shows the other way to arrange that.",
            ] },
            { pitfall: "Calling a function the compiler has not seen yet is an error: `implicit declaration of function`. The fix is to include the header that declares it, or to declare it yourself above the call." },
          ],
        },
        {
          title: 'printf and its format string',
          body: [
            "`printf` does not inspect its arguments. The format string is the only thing telling it how many arguments follow and how to read each one. Each `%` conversion consumes one argument.",
            { table: {
              head: ['Conversion', 'Argument type', 'Notes'],
              rows: [
                ['`%d`', '`int`', 'Also `char` and `short`, which are widened to `int` on the way in.'],
                ['`%u`, `%x`', '`unsigned int`', 'Decimal and hexadecimal.'],
                ['`%ld`, `%lu`', '`long`, `unsigned long`', ''],
                ['`%lld`, `%llu`', '`long long`, `unsigned long long`', ''],
                ['`%zu`', '`size_t`', 'What `sizeof` and `strlen` produce.'],
                ['`%f`', '`double`', 'A `float` argument is widened to `double`.'],
                ['`%c`', '`int` holding a character', ''],
                ['`%s`', '`char *`', 'A string: covered in the strings lesson.'],
                ['`%p`', '`void *`', 'An address.'],
                ['`%%`', 'none', 'A literal percent sign.'],
              ],
            } },
            "Between the `%` and the letter you can ask for a minimum width, left alignment, zero padding, and a precision.",
            { run: c`#include <stdio.h>

int main(void) {
    int count = 42;
    double ratio = 2.0 / 3.0;

    printf("[%d] [%5d] [%-5d] [%05d]\n", count, count, count, count);
    printf("[%f] [%.2f] [%8.3f]\n", ratio, ratio, ratio);
    printf("[%c] [%s] [%x] [%%]\n", 'A', "text", 255);
    printf("%zu bytes in an int\n", sizeof(int));
    return 0;
}`, name: 'formats.c', expect: '[42] [   42] [42   ] [00042]\n[0.666667] [0.67] [   0.667]\n[A] [text] [ff] [%]\n4 bytes in an int\n' },
            { pitfall: "If a conversion does not match its argument, nothing converts the value for you. `printf(\"%d\", 2.5)` reads the wrong bytes and prints nonsense. That is undefined behavior, not a truncation to 2. The compiler warns about it, which is one reason to read warnings." },
            "`printf` adds no newline of its own, so finish lines with `\\n`. For a plain string followed by a newline, `puts(\"done\")` is shorter.",
          ],
        },
        {
          title: 'Reading compiler diagnostics',
          body: [
            "Diagnostics have the shape `file:line:column: severity: message`. An **error** stops the build. A **warning** lets it continue, and is nearly always pointing at a real bug. Work from the top: one missing semicolon can produce several follow-on errors that vanish when the first is fixed.",
            "This program builds, but with two warnings, and prints rubbish. Run it and read the messages. Then fix both lines so that it prints `2.5`.",
            { run: c`#include <stdio.h>

int main(void) {
    int total = 10;
    double share = total / 4;      // Probably not what was meant.
    printf("%d\n", share);         // The wrong conversion for a double.
    return 0;
}`, name: 'warnings.c', warns: true },
            { tip: "The compiler is the only automated check you get, so give it every chance. On your own machine, build with `-Wall -Wextra` always, and add `-Werror` once a project is warning-free so that it stays that way." },
          ],
        },
        {
          title: 'What C leaves out',
          body: [
            "Much of learning C is noticing what is absent and finding where its replacement lives.",
            { table: {
              head: ['You are used to', 'In C'],
              rows: [
                ['Strings as a built-in type', 'Arrays of `char` ending in a zero byte, plus library functions.'],
                ['Lists and dictionaries', 'Fixed-size arrays. Anything growable you build from pointers and `malloc`.'],
                ['Objects and classes', '`struct` for data, plain functions for behavior.'],
                ['Exceptions', 'Return values that you must remember to check.'],
                ['Garbage collection', 'You release heap memory yourself, exactly once.'],
                ['References to objects', 'Explicit pointers: addresses you take, pass, and follow by hand.'],
                ['Modules and namespaces', 'Header files, one global namespace, and naming conventions.'],
              ],
            } },
            "The second part of this manual is about pointers, because nearly every row of that table comes back to them.",
          ],
        },
      ],
      takeaways: [
        "C is compiled ahead of time. Types shape the machine code and then disappear, so nothing checks them at run time.",
        "The compiler reads a file top to bottom, once. A name must be declared before it is used.",
        "`printf` trusts its format string completely. A mismatched conversion is undefined behavior.",
        "Fix the first diagnostic first, and treat warnings as errors.",
      ],
      quiz: [
        {
          q: "You call a function that a header declares, but no file you compiled or linked defines it. Which stage reports the problem?",
          options: [
            { t: 'The preprocessor', why: "The preprocessor only handles `#` lines and text substitution. It has no idea which functions exist." },
            { t: 'The compiler, while translating the file that makes the call', why: "The compiler is satisfied: it saw a declaration, so it knows how to generate the call. It does not know or care where the definition is." },
            { t: 'The linker', ok: true, why: "Each file compiles on its own against declarations. Only the linker sees every object file together and can notice that a definition is missing. The message is usually “undefined symbol” or “undefined reference”." },
            { t: 'The program, at the moment the call executes', why: "A program with an unresolved call is never produced. C does not look functions up by name while running, as Python or PHP do." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    printf("%5.1f|%-4d|%04d\n", 3.14159, 7, 42);
    return 0;
}`,
          answer: '  3.1|7   |0042',
          explain: "`%5.1f` rounds to one decimal and pads to five characters on the left. `%-4d` pads to four on the right. `%04d` pads to four with zeros.",
          hint: "The number before the dot or letter is a minimum width. A minus sign pads on the right instead of the left, and a leading zero pads with zeros.",
        },
        {
          q: 'Which conversion prints the result of `sizeof`?',
          options: [
            { t: '`%d`', why: "`sizeof` produces a `size_t`, which is unsigned and on most desktops wider than `int`. `%d` reads the wrong number of bytes there." },
            { t: '`%zu`', ok: true, why: "`z` is the length modifier for `size_t`, and `u` prints it unsigned. It is correct on every platform." },
            { t: '`%lu`', why: "This happens to work where `size_t` is `unsigned long`, which is true on your Mac but not guaranteed. `%zu` is always right." },
            { t: '`%s`', why: "`%s` expects a pointer to a string and would treat the size as an address to read from." },
          ],
        },
        {
          q: 'What does `printf("%d\\n", 2.5);` do?',
          options: [
            { t: 'Prints 2, because the value is truncated to an `int`', why: "No conversion happens. `printf` receives a `double` and is told to read an `int`." },
            { t: 'Prints 2.5, because `printf` can see the argument is a `double`', why: "`printf` cannot see argument types. The format string is all it has." },
            { t: 'It is undefined behavior, and typically prints an unrelated number', ok: true, why: "The bytes of a `double` are read as if they were an `int`. The compiler warns about the mismatch but still builds the program." },
            { t: 'It always fails to compile', why: "It is a warning, not an error, so a program is produced." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these statements are true?',
          options: [
            { t: '`#include <stdio.h>` is dealt with before the compiler proper sees the code', ok: true, why: "It is a preprocessor directive, replaced by the header's text." },
            { t: 'A running C program checks the types of values as it goes', why: "Types are used to generate code and are then gone." },
            { t: '`return 0;` in `main` reports success to whatever started the program', ok: true, why: "It becomes the process exit status." },
            { t: 'Indentation decides which statements belong to an `if`', why: "Only braces do. Indentation is for people." },
            { t: 'After a warning, the compiler still produces a program', ok: true, why: "Only errors stop the build, which is exactly why warnings are dangerous to ignore." },
          ],
          hint: "Three are true. Think about what is left of your source by the time the program is running.",
        },
      ],
      challenges: [
        {
          id: 'seconds-since-midnight',
          title: 'Seconds since midnight',
          level: 'warm-up',
          prompt: [
            "A first challenge, to get used to the editor. Write your function on the right and run the tests. Each test can be opened to see the code it runs.",
            "Return the number of seconds between midnight and the given time of day.",
          ],
          signature: 'int seconds_since_midnight(int hours, int minutes, int seconds)',
          starter: c`int seconds_since_midnight(int hours, int minutes, int seconds) {
    // Convert everything to seconds and add it up.
    return 0;
}`,
          hints: ["An hour is 3600 seconds and a minute is 60."],
          solution: c`int seconds_since_midnight(int hours, int minutes, int seconds) {
    return hours * 3600 + minutes * 60 + seconds;
}`,
          tests: [
            { label: 'Midnight itself', body: c`CHECK(seconds_since_midnight(0, 0, 0) == 0);` },
            { label: 'Counts minutes and seconds', body: c`CHECK(seconds_since_midnight(0, 1, 30) == 90);` },
            { label: 'Counts hours', body: c`CHECK(seconds_since_midnight(1, 0, 1) == 3601);` },
            { label: 'The last second of the day', body: c`CHECK(seconds_since_midnight(23, 59, 59) == 86399);` },
          ],
        },
        {
          id: 'read-the-diagnostics',
          title: 'Read the diagnostics',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "This code has three mistakes and will not compile. Run the tests, read the compiler output in the console, and fix what it reports. Line numbers in the messages refer to `solution.c`, the file in the editor.",
            "Do not rewrite it. Change only what the diagnostics point to.",
          ],
          signature: 'int cube(int n)\nint sum_of_cubes(int a, int b)',
          starter: c`int cube(int n) {
    return n * n * n
}

void sum_of_cubes(int a, int b) {
    int total = cube(a) + cube(b);
    return totl;
}`,
          hints: [
            "Start with the first error. `expected ';'` names the line where the compiler noticed, which is the line that is missing one.",
            "`use of undeclared identifier` means a name was never declared. Check its spelling.",
            "A function declared `void` returns nothing. This one needs to return an `int`.",
          ],
          solution: c`int cube(int n) {
    return n * n * n;
}

int sum_of_cubes(int a, int b) {
    int total = cube(a) + cube(b);
    return total;
}`,
          tests: [
            { label: 'cube of a positive number', body: c`CHECK(cube(3) == 27);` },
            { label: 'cube of a negative number', body: c`CHECK(cube(-2) == -8);` },
            { label: 'sum of two cubes', body: c`CHECK(sum_of_cubes(1, 2) == 9);` },
            { label: 'cubes that cancel out', body: c`CHECK(sum_of_cubes(-4, 4) == 0);` },
          ],
        },
        {
          id: 'format-price',
          title: 'Format a price',
          level: 'core',
          prompt: [
            "`snprintf` is `printf` that writes into a buffer instead of the screen. Its first two arguments are the buffer and the buffer's size, and the rest are the same as `printf`. It never writes more than the size it is given.",
            "Write a price in cents as dollars and cents: `1205` becomes `$12.05`. The cents always take two digits. `cents` is never negative.",
          ],
          signature: 'void format_price(char *out, size_t capacity, int cents)',
          starter: c`void format_price(char *out, size_t capacity, int cents) {
    // One call to snprintf(out, capacity, "...", ...) is enough.
    snprintf(out, capacity, "?");
}`,
          hints: [
            "Integer division and remainder split the amount: `cents / 100` and `cents % 100`.",
            "`%02d` prints an `int` in at least two characters, padded with zeros.",
          ],
          solution: c`void format_price(char *out, size_t capacity, int cents) {
    snprintf(out, capacity, "$%d.%02d", cents / 100, cents % 100);
}`,
          tests: [
            { label: 'Dollars and cents', body: c`char text[16];
format_price(text, sizeof text, 1205);
CHECK(strcmp(text, "$12.05") == 0);` },
            { label: 'Pads single-digit cents', body: c`char text[16];
format_price(text, sizeof text, 5);
CHECK(strcmp(text, "$0.05") == 0);` },
            { label: 'Whole dollars', body: c`char text[16];
format_price(text, sizeof text, 99900);
CHECK(strcmp(text, "$999.00") == 0);` },
            { label: 'Zero', body: c`char text[16];
format_price(text, sizeof text, 0);
CHECK(strcmp(text, "$0.00") == 0);` },
          ],
        },
      ],
    },

    {
      id: 'types',
      title: 'Types, integers & conversions',
      category: part,
      minutes: 30,
      summary: 'Fixed-width numbers, what happens at their edges, and the silent conversions that cause most arithmetic surprises.',
      topics: ['Integer sizes', 'Signed and unsigned', 'Overflow', 'Conversions', 'Casts'],
      sections: [
        {
          title: 'A type is a size and an interpretation',
          body: [
            "A C variable is a fixed number of bytes, and its type says how many and how to read them. The standard guarantees only minimum sizes, so the same program can see different sizes on different machines. `sizeof` tells you what you have.",
            { table: {
              head: ['Type', 'Guaranteed at least', 'In this page', 'On your Mac'],
              rows: [
                ['`char`', '8 bits', '1 byte', '1 byte'],
                ['`short`', '16 bits', '2', '2'],
                ['`int`', '16 bits', '4', '4'],
                ['`long`', '32 bits', '4', '8'],
                ['`long long`', '64 bits', '8', '8'],
                ['`float`', '', '4', '4'],
                ['`double`', '', '8', '8'],
                ['any pointer', '', '4', '8'],
              ],
            } },
            { run: c`#include <stdio.h>

int main(void) {
    printf("char      %zu\n", sizeof(char));
    printf("short     %zu\n", sizeof(short));
    printf("int       %zu\n", sizeof(int));
    printf("long      %zu\n", sizeof(long));
    printf("long long %zu\n", sizeof(long long));
    printf("float     %zu\n", sizeof(float));
    printf("double    %zu\n", sizeof(double));
    printf("void *    %zu\n", sizeof(void *));
    return 0;
}`, name: 'sizes.c', sizes: true, expect: 'char      1\nshort     2\nint       4\nlong      4\nlong long 8\nfloat     4\ndouble    8\nvoid *    4\n' },
            { compare: "Python integers grow as large as they need to. JavaScript numbers are all 64-bit floats. PHP integers are 64 bits and turn into floats when they overflow. In C you choose a width up front and the value has to fit." },
          ],
        },
        {
          title: 'Signed, unsigned, and the edge of the range',
          body: [
            "Every integer type comes in a signed and an unsigned form. With 32 bits, `int` covers about ±2.1 billion and `unsigned int` covers 0 to about 4.3 billion. `<limits.h>` names the exact limits: `INT_MAX`, `INT_MIN`, `UINT_MAX`.",
            "What happens when arithmetic leaves the range depends on the signedness, and the two cases are not alike:",
            { list: [
              "**Unsigned arithmetic wraps around.** `UINT_MAX + 1` is `0`, and `0u - 1` is `UINT_MAX`. This is fully defined and you may rely on it.",
              "**Signed overflow is undefined behavior.** `INT_MAX + 1` has no defined result. The compiler is allowed to assume it never happens, and optimizes on that assumption.",
            ] },
            { widget: 'bits' },
            { run: c`#include <limits.h>
#include <stdio.h>

int main(void) {
    unsigned int u = UINT_MAX;
    printf("UINT_MAX     = %u\n", u);
    printf("UINT_MAX + 1 = %u\n", u + 1);     // Wraps to 0. Defined.
    printf("0u - 1       = %u\n", 0u - 1);    // Wraps to UINT_MAX. Defined.
    printf("INT_MAX      = %d\n", INT_MAX);
    // INT_MAX + 1 is undefined behavior: test before adding, never after.
    return 0;
}`, name: 'limits.c', expect: 'UINT_MAX     = 4294967295\nUINT_MAX + 1 = 0\n0u - 1       = 4294967295\nINT_MAX      = 2147483647\n' },
            { pitfall: [
              "You cannot detect signed overflow after the fact. `if (a + b < a)` already performed the overflowing addition, and a compiler may delete the test because, by its rules, the condition cannot be true. Check before you add:",
              { code: c`if (b > 0 && a > INT_MAX - b) {
    // a + b would overflow
}` },
            ] },
          ],
        },
        {
          title: 'Fixed-width types and size_t',
          body: [
            "When the exact width matters, as it does for file formats, network protocols and bit manipulation, use the types from `<stdint.h>`. Their names state the width.",
            { code: c`#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

uint8_t  red = 255;          // Exactly 8 bits, unsigned: 0 to 255.
int32_t  offset = -40000;    // Exactly 32 bits, signed.
uint64_t big = 1ULL << 40;   // Exactly 64 bits, unsigned.
size_t   count = 0;          // An unsigned type wide enough for any object's size.
bool     ready = true;       // From <stdbool.h>: holds 1 or 0.` },
            "`size_t` deserves attention. It is the type `sizeof` returns, the type of every length and count in the standard library, and the right type for array indexes. It is unsigned, which matters in the section after next.",
            "A suffix sets the type of a literal: `10u` is `unsigned`, `10L` is `long`, `10ULL` is `unsigned long long`, and `1.5f` is a `float` where plain `1.5` is a `double`.",
          ],
        },
        {
          title: 'char is a small integer',
          body: [
            "A `char` is a one-byte integer. A character literal in single quotes is just a readable way to write the number for that character: `'A'` is 65. That makes character arithmetic ordinary arithmetic.",
            { run: c`#include <stdio.h>

int main(void) {
    char letter = 'A';
    printf("%c is stored as %d\n", letter, letter);
    printf("%c comes next\n", letter + 1);
    printf("'7' - '0' = %d\n", '7' - '0');
    printf("lower case: %c\n", letter + ('a' - 'A'));
    return 0;
}`, name: 'chars.c', expect: "A is stored as 65\nB comes next\n'7' - '0' = 7\nlower case: a\n" },
            "The digits `'0'` to `'9'` are guaranteed to be consecutive, so `c - '0'` converts a digit character to its value. In ASCII the letters are consecutive too.",
            { compare: "Quotes are not interchangeable as they are in Python, PHP and JavaScript. Single quotes make one character, which is a number. Double quotes make a string, which is an array. `'A'` and `\"A\"` are different types, and the second one occupies two bytes: the letter and a terminating zero." },
            { pitfall: "Whether plain `char` is signed or unsigned is up to the platform. It is signed on your Mac and in this page, so a byte above 127 reads back negative. When you mean a raw byte, say `unsigned char` or `uint8_t`." },
          ],
        },
        {
          title: 'Conversions you did not ask for',
          body: [
            "C converts between arithmetic types silently, and two of its rules cause most of the surprises.",
            "**Integer promotion.** Anything narrower than `int` is widened to `int` before arithmetic is done on it. Adding two `uint8_t` values produces an `int`, and the result only wraps if you store it back into something narrow.",
            "**The usual arithmetic conversions.** When an operator's two operands differ in type, one is converted to match the other. `int` with `double` gives `double`, as you would hope. But `int` with `unsigned int` gives `unsigned int`, which means a negative number is reinterpreted as a huge positive one.",
            { run: c`#include <stdint.h>
#include <stdio.h>

int main(void) {
    uint8_t a = 200, b = 100;
    uint8_t narrow = a + b;        // Computed as the int 300, then cut down to 8 bits.
    int wide = a + b;
    printf("narrow = %d, wide = %d\n", narrow, wide);

    int negative = -1;
    unsigned int positive = 1;
    if (negative < positive) {     // negative is converted to unsigned first.
        puts("-1 < 1u");
    } else {
        puts("-1 is NOT less than 1u");
    }
    return 0;
}`, name: 'conversions.c', warns: true, expect: 'narrow = 44, wide = 300\n-1 is NOT less than 1u\n' },
            "The compiler warned about that comparison, and it was right to. This is the usual way the bug arrives in real code:",
            { code: c`// size_t is unsigned. If length is 0, then length - 1 wraps to a huge
// number and the loop runs off the end of the array.
for (size_t i = 0; i < length - 1; ++i) { /* ... */ }

// Rearranged so nothing can go below zero:
for (size_t i = 0; i + 1 < length; ++i) { /* ... */ }` },
          ],
        },
        {
          title: 'Division, floating point, and casts',
          body: [
            "Dividing two integers gives an integer, with the fraction discarded. If either operand is floating-point, the division is floating-point. A **cast**, written `(type)expression`, converts a value explicitly, and where you put it decides which division you get.",
            { run: c`#include <stdio.h>

int main(void) {
    int items = 7, groups = 2;

    printf("%d\n", items / groups);                  // int / int
    printf("%.1f\n", (double)items / groups);        // cast one operand, then divide
    printf("%.1f\n", (double)(items / groups));      // divide first: too late
    printf("%d\n", (int)3.99);                       // truncates toward zero
    printf("%d\n", 0.1 + 0.2 == 0.3);                // binary floating point
    return 0;
}`, name: 'division.c', expect: '3\n3.5\n3.0\n3\n0\n' },
            { list: [
              "Converting floating-point to an integer discards the fraction. If the value does not fit in the target type, the behavior is undefined.",
              "`double` carries 15 to 16 significant decimal digits and `float` about 7. Use `double` unless you have a reason not to.",
              "Floating-point values are binary fractions, so `0.1 + 0.2` is not exactly `0.3`. Compare with a tolerance, never with `==`.",
              "Assigning a wide value to a narrow type compiles without complaint and keeps only the low bits.",
            ] },
          ],
        },
        {
          title: 'Initialize everything',
          body: [
            "A local variable that you declare without a value does not start at zero, or at anything like `None` or `undefined`. It holds whatever bytes were already in that piece of memory. Its value is **indeterminate**, and reading it is undefined behavior.",
            { code: c`int count;                // Indeterminate. Reading it is a bug.
int total = 0;            // Do this instead.
const double rate = 0.2;  // const: may be read but never assigned again.
// rate = 0.3;            // error: cannot assign to variable 'rate'` },
            "Variables declared outside any function are different: they start at zero. The functions lesson covers why. The simple habit that covers every case is to give each variable a value on the line that declares it.",
            { compare: "TypeScript refuses to compile a read of an unassigned `let`. Python raises `NameError`. C compiles the read, perhaps with a warning, and the program runs with garbage in the variable. It may even appear to work until something unrelated changes." },
          ],
        },
      ],
      takeaways: [
        "Sizes vary by platform. Use `sizeof`, and use `<stdint.h>` types when the width matters.",
        "Unsigned arithmetic wraps and you may rely on it. Signed overflow is undefined, so test before the operation.",
        "Mixing signed and unsigned converts the signed value to unsigned. `size_t` is unsigned.",
        "To keep a fraction, cast an operand before dividing.",
        "Initialize every variable where you declare it.",
      ],
      quiz: [
        {
          q: 'What value is stored in `average`?',
          code: c`double average = (double)(5 / 2);`,
          options: [
            { t: '2.5', why: "The parentheses force the integer division to happen first. Cast an operand, as in `(double)5 / 2`, to get 2.5." },
            { t: '2.0', ok: true, why: "`5 / 2` is integer division and gives 2. The cast then converts that 2 to 2.0." },
            { t: '3.0', why: "Integer division discards the fraction. It does not round." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdint.h>
#include <stdio.h>

int main(void) {
    uint8_t level = 250;
    level += 10;
    printf("%d\n", level);
    return 0;
}`,
          answer: '4',
          explain: "`level + 10` is computed as the `int` 260. Storing it back into 8 bits keeps 260 modulo 256, which is 4.",
          hint: "A `uint8_t` holds 0 to 255. Work out 260 modulo 256.",
        },
        {
          q: 'With `int a = -1;` and `unsigned int b = 1;`, what is the value of `a < b`?',
          options: [
            { t: '1, because −1 is less than 1', why: "That is the mathematical answer, but the comparison is not done on those values. `a` is converted to `unsigned int` first." },
            { t: '0, because `a` is converted to `unsigned int` before comparing', ok: true, why: "As an `unsigned int`, −1 becomes `UINT_MAX`, about 4.3 billion, which is not less than 1. The compiler warns about comparing integers of different signs." },
            { t: 'The code does not compile', why: "Mixed-sign comparison is legal C. It earns a warning under `-Wextra`, nothing more." },
          ],
        },
        {
          q: 'What does `sizeof(long)` evaluate to?',
          options: [
            { t: 'Always 4', why: "It is 4 in this page, but that is a property of the platform." },
            { t: 'Always 8', why: "It is 8 on 64-bit macOS and Linux, but 4 on 64-bit Windows and in this page." },
            { t: 'It depends on the platform: 4 in this page, 8 on your Mac', ok: true, why: "The standard promises only that `long` has at least 32 bits. When you need a specific width, use `int32_t` or `int64_t`." },
            { t: 'Always the same as `sizeof(int)`', why: "They happen to match here. They differ on your Mac." },
          ],
        },
        {
          q: 'What does this function print?',
          code: c`void report(void) {
    int n;
    printf("%d\n", n);
}`,
          options: [
            { t: '0, because variables start at zero', why: "Only variables with static storage start at zero. Locals are not initialized." },
            { t: 'It is undefined behavior: `n` holds an indeterminate value', ok: true, why: "`n` is whatever was left in that piece of stack memory. It might be 0 today and something else after an unrelated change." },
            { t: 'It does not compile', why: "It compiles. At best you get a warning that `n` is used uninitialized." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    printf("%d %c\n", 'C' - 'A', 'a' + 2);
    return 0;
}`,
          answer: '2 c',
          explain: "Characters are integers. `'C' - 'A'` is 67 − 65, and `'a' + 2` is the code for `c`, which `%c` prints as a character.",
        },
        {
          kind: 'multi',
          q: 'Which of these expressions have the value 2.5?',
          options: [
            { t: '`5 / 2`', why: "Integer division: 2." },
            { t: '`5 / 2.0`', ok: true, why: "One operand is a `double`, so the division is floating-point." },
            { t: '`(double)5 / 2`', ok: true, why: "The cast applies to 5 before the division." },
            { t: '`(double)(5 / 2)`', why: "The division is done on integers first, giving 2.0." },
            { t: '`5.0f / 2`', ok: true, why: "A `float` operand also makes the division floating-point." },
          ],
          hint: "Check the types of the two operands at the moment the division happens.",
        },
      ],
      challenges: [
        {
          id: 'digit-value',
          title: 'Read a digit',
          level: 'warm-up',
          prompt: "Return the numeric value of a decimal digit character, so `'7'` gives 7. Return −1 for any character that is not a digit.",
          signature: 'int digit_value(char c)',
          starter: c`int digit_value(char c) {
    return -1;
}`,
          hints: [
            "Digits are consecutive: `'0'` is the smallest and `'9'` the largest.",
            "Once you know `c` is a digit, `c - '0'` is its value.",
          ],
          solution: c`int digit_value(char c) {
    if (c < '0' || c > '9') {
        return -1;
    }
    return c - '0';
}`,
          tests: [
            { label: 'Converts the lowest and highest digits', body: c`CHECK(digit_value('0') == 0);
CHECK(digit_value('9') == 9);` },
            { label: 'Converts a digit in the middle', body: c`CHECK(digit_value('4') == 4);` },
            { label: 'Rejects letters', body: c`CHECK(digit_value('a') == -1);
CHECK(digit_value('Z') == -1);` },
            { label: 'Rejects the characters next to the digits', body: c`CHECK(digit_value('/') == -1);
CHECK(digit_value(':') == -1);` },
          ],
        },
        {
          id: 'mean-ints',
          legacy: 'types-and-expressions',
          title: 'Average two integers',
          level: 'core',
          prompt: "Return the arithmetic mean of `a` and `b` as a `double`. Keep halves, so 5 and 6 give 5.5. The answer must also be right when both inputs are as large as an `int` can be.",
          signature: 'double mean_ints(int a, int b)',
          starter: c`double mean_ints(int a, int b) {
    // Compute the mean.
    return 0.0;
}`,
          hints: [
            "At least one operand of the division has to be floating-point, or the half is lost.",
            "`a + b` can overflow an `int` before you divide. Convert one operand to `double` before the addition.",
          ],
          solution: c`double mean_ints(int a, int b) {
    return ((double)a + b) / 2.0;
}`,
          tests: [
            { label: 'Keeps a fractional mean', body: c`CHECK(mean_ints(5, 6) == 5.5);` },
            { label: 'Handles negative inputs', body: c`CHECK(mean_ints(-8, -3) == -5.5);` },
            { label: 'Handles the largest inputs', body: c`CHECK(mean_ints(INT_MAX, INT_MAX) == (double)INT_MAX);` },
            { label: 'Handles values on either side of zero', body: c`CHECK(mean_ints(-3, 2) == -0.5);` },
          ],
        },
        {
          id: 'saturating-add',
          title: 'Add without wrapping',
          level: 'core',
          prompt: "Audio and image code often wants addition that stops at the maximum instead of wrapping around. Return `a + b`, or 255 if the true sum is larger than a `uint8_t` can hold.",
          signature: 'uint8_t saturating_add(uint8_t a, uint8_t b)',
          starter: c`uint8_t saturating_add(uint8_t a, uint8_t b) {
    return a + b;
}`,
          hints: [
            "`a + b` is computed as an `int`, so the sum itself is correct. It only goes wrong when it is stored in 8 bits.",
            "Keep the sum in an `int`, compare it with 255, and return whichever is smaller.",
          ],
          solution: c`uint8_t saturating_add(uint8_t a, uint8_t b) {
    int sum = a + b;
    return sum > 255 ? 255 : (uint8_t)sum;
}`,
          tests: [
            { label: 'Adds small values normally', body: c`CHECK(saturating_add(20, 30) == 50);` },
            { label: 'Reaches the maximum exactly', body: c`CHECK(saturating_add(200, 55) == 255);` },
            { label: 'Stops at the maximum', body: c`CHECK(saturating_add(200, 100) == 255);` },
            { label: 'Stops at the maximum for the largest inputs', body: c`CHECK(saturating_add(255, 255) == 255);` },
          ],
        },
        {
          id: 'add-would-overflow',
          title: 'Predict an overflow',
          level: 'stretch',
          prompt: "Return `true` if `a + b` would not fit in an `int`. You must decide without performing an addition that overflows, because that addition is undefined behavior. Do not use a wider type.",
          signature: 'bool add_would_overflow(int a, int b)',
          starter: c`bool add_would_overflow(int a, int b) {
    return false;
}`,
          hints: [
            "Overflow is only possible when both operands have the same sign. Treat positive `b` and negative `b` as separate cases.",
            "For positive `b`, the sum overflows when `a > INT_MAX - b`. That subtraction cannot overflow.",
            "For negative `b`, the mirror image is `a < INT_MIN - b`.",
          ],
          solution: c`bool add_would_overflow(int a, int b) {
    if (b > 0) {
        return a > INT_MAX - b;
    }
    return a < INT_MIN - b;
}`,
          tests: [
            { label: 'Ordinary sums do not overflow', body: c`CHECK(!add_would_overflow(2, 3));
CHECK(!add_would_overflow(-2, -3));` },
            { label: 'Detects overflow past INT_MAX', body: c`CHECK(add_would_overflow(INT_MAX, 1));
CHECK(add_would_overflow(1, INT_MAX));` },
            { label: 'Detects overflow past INT_MIN', body: c`CHECK(add_would_overflow(INT_MIN, -1));
CHECK(add_would_overflow(-1, INT_MIN));` },
            { label: 'Accepts sums that land exactly on a limit', body: c`CHECK(!add_would_overflow(INT_MAX - 1, 1));
CHECK(!add_would_overflow(INT_MIN + 1, -1));` },
            { label: 'Opposite signs never overflow', body: c`CHECK(!add_would_overflow(INT_MAX, INT_MIN));
CHECK(!add_would_overflow(INT_MIN, INT_MAX));` },
          ],
        },
      ],
    },

    {
      id: 'operators',
      title: 'Operators & expressions',
      category: part,
      minutes: 30,
      summary: 'Most operators look familiar. The differences are in division, in what counts as true, in bit manipulation, and in what C refuses to promise about evaluation order.',
      topics: ['Division and remainder', 'Truth values', 'Bitwise operators', 'Precedence', 'Evaluation order'],
      sections: [
        {
          title: 'Division and remainder',
          body: [
            "Integer division truncates toward zero, and the remainder takes the sign of the left operand. The two always fit together: `(a / b) * b + a % b` equals `a`.",
            { run: c`#include <stdio.h>

int main(void) {
    printf("%d %d\n", 7 / 2, 7 % 2);
    printf("%d %d\n", -7 / 2, -7 % 2);
    printf("%d %d\n", 7 / -2, 7 % -2);
    return 0;
}`, name: 'remainder.c', expect: '3 1\n-3 -1\n-3 1\n' },
            { compare: "Python's `//` rounds down, so `-7 // 2` is −4, and its `%` takes the sign of the right operand, so `-7 % 2` is 1. C, PHP and JavaScript agree with each other on `%`. If you use `%` to wrap an index that can go negative, C gives you a negative index." },
            "Dividing by zero is undefined behavior for integers. There is no exponent operator: `^` is exclusive-or, and `pow` from `<math.h>` works on `double`.",
          ],
        },
        {
          title: 'Comparison, logic, and truth',
          body: [
            "A comparison produces an `int`: 1 for true, 0 for false. Going the other way, any number or pointer can be used as a condition. Zero is false and everything else is true.",
            "`&&` and `||` evaluate left to right and stop as soon as the answer is known. Their result is always 1 or 0, never one of the operands.",
            { run: c`#include <stdio.h>

int main(void) {
    int x = 50;
    printf("%d\n", x > 10);
    printf("%d\n", 0 < x < 10);        // (0 < x) is 1, and 1 < 10 is true.
    printf("%d\n", 0 < x && x < 10);   // What was meant.
    printf("%d\n", !x);
    printf("%d\n", !!x);               // Turns any nonzero value into 1.
    return 0;
}`, name: 'truth.c', warns: true, expect: '1\n1\n0\n0\n1\n' },
            "The compiler warns about the second line, because comparing a 0-or-1 result with 10 can only be true.",
            { compare: "Python chains comparisons, so `0 < x < 10` means what it says. In Python and JavaScript, `a or b` and `a || b` hand back one of the operands. In C the first is a bug that compiles, and the second always yields 1 or 0." },
            { pitfall: "`if (x = 5)` assigns 5 to `x` and then tests the result, which is always true. The compiler warns and suggests extra parentheses if you really meant it. There is no `===`. `==` compares values after the usual conversions, and it never compares the contents of strings." },
          ],
        },
        {
          title: 'Assignment and increment are expressions',
          body: [
            "An assignment has a value, the value that was stored, so assignments can be chained or embedded: `a = b = 0`. The compound forms `+=`, `-=`, `*=`, `/=`, `%=`, `&=`, `|=`, `^=`, `<<=` and `>>=` all exist.",
            "`++i` and `i++` both add one to `i`. They differ only in the value of the expression itself: `++i` gives the new value, `i++` gives the old one. As a statement on its own, either will do.",
            { run: c`#include <stdio.h>

int main(void) {
    int i = 5;
    int a = i++;    // a receives the old value 5. i becomes 6.
    int b = ++i;    // i becomes 7. b receives the new value 7.
    printf("i=%d a=%d b=%d\n", i, a, b);
    return 0;
}`, name: 'increment.c', expect: 'i=7 a=5 b=7\n' },
            "This distinction looks like trivia now. It becomes important with pointers, where `*p++` is one of the most common expressions in C.",
          ],
        },
        {
          title: 'Bitwise operators',
          body: [
            "C exposes the bits of an integer directly, and real C code uses this constantly for flags, masks and packed data.",
            { table: {
              head: ['Operator', 'Meaning', 'Example on 8 bits'],
              rows: [
                ['`a & b`', 'AND: bits set in both', '`1100 & 1010` is `1000`'],
                ['`a | b`', 'OR: bits set in either', '`1100 | 1010` is `1110`'],
                ['`a ^ b`', 'XOR: bits set in exactly one', '`1100 ^ 1010` is `0110`'],
                ['`~a`', 'NOT: every bit flipped', '`~00001111` is `11110000`'],
                ['`a << n`', 'Shift left by n, filling with zeros', '`00000101 << 2` is `00010100`'],
                ['`a >> n`', 'Shift right by n', '`00010100 >> 2` is `00000101`'],
              ],
            } },
            "Four idioms cover most uses. With `1u << n` as a mask that has only bit `n` set:",
            { run: c`#include <stdio.h>

int main(void) {
    unsigned flags = 0;
    flags |= 1u << 3;                    // Set bit 3.
    flags |= 1u << 0;                    // Set bit 0.
    printf("%u\n", flags);               // 9, binary 1001.
    flags &= ~(1u << 0);                 // Clear bit 0.
    printf("%u\n", flags);               // 8, binary 1000.
    flags ^= 1u << 1;                    // Toggle bit 1.
    printf("%u\n", flags);               // 10, binary 1010.
    printf("%u\n", (flags >> 3) & 1u);   // Test bit 3.
    printf("0x%x\n", 0xF0u >> 4);
    return 0;
}`, name: 'bits.c', expect: '9\n8\n10\n1\n0xf\n' },
            { pitfall: "Do bit manipulation on unsigned types. Shifting a negative number, shifting a 1 into the sign bit, and shifting by the full width of the type or more are all undefined or platform-defined. `1 << 31` on a 32-bit `int` is already wrong. `1u << 31` is fine." },
            "Keep `&` and `&&` apart. `1 & 2` is 0, because the two numbers share no bits, while `1 && 2` is 1, because both are nonzero. The bitwise forms also always evaluate both sides.",
          ],
        },
        {
          title: 'The precedence worth remembering',
          body: [
            "From tightest to loosest. You do not need the whole table by heart, only the places where it differs from what you would guess.",
            { table: {
              head: ['Level', 'Operators'],
              rows: [
                ['Postfix', '`f()`  `a[i]`  `s.m`  `p->m`  `x++`  `x--`'],
                ['Unary', '`!`  `~`  `++x`  `--x`  `-x`  `*p`  `&x`  `(type)`  `sizeof`'],
                ['Multiplicative', '`*`  `/`  `%`'],
                ['Additive', '`+`  `-`'],
                ['Shift', '`<<`  `>>`'],
                ['Relational', '`<`  `<=`  `>`  `>=`'],
                ['Equality', '`==`  `!=`'],
                ['Bitwise', '`&`  then  `^`  then  `|`'],
                ['Logical', '`&&`  then  `||`'],
                ['Conditional', '`? :`'],
                ['Assignment', '`=`  `+=`  and the rest'],
                ['Comma', '`,`'],
              ],
            } },
            { list: [
              "**Bitwise operators bind more loosely than comparisons.** `flags & MASK == 0` means `flags & (MASK == 0)`. Always parenthesize: `(flags & MASK) == 0`.",
              "**Shifts bind more loosely than arithmetic.** `1 << n + 1` means `1 << (n + 1)`.",
              "**Postfix binds more tightly than unary.** `*p++` means `*(p++)`, and `&a[i]` means `&(a[i])`. Both matter a great deal in Part 2.",
              "**Unary binds more tightly than everything binary.** `!x == y` means `(!x) == y`.",
            ] },
          ],
        },
        {
          title: 'Evaluation order is mostly unspecified',
          body: [
            "Precedence says how an expression is grouped. It says nothing about which operand is computed first. In `f() + g()`, C does not say whether `f` or `g` runs first, and the same goes for the arguments of a function call.",
            "It gets worse when a variable is modified. Changing a variable twice in one expression, or changing it and separately reading it, with nothing to put the two in order, is undefined behavior:",
            { code: c`i = i++;                      // undefined
a[i] = i++;                   // undefined
printf("%d %d\n", i++, i++);  // undefined` },
            "Only a few constructs guarantee an order: the end of a statement, `&&`, `||`, `?:`, and the comma operator. Each finishes its left side completely before starting the right.",
            { compare: "Python, PHP and JavaScript all evaluate operands left to right, so this class of bug does not exist there. In C the habit to form is one side effect per statement." },
          ],
        },
        {
          title: 'Conditional, comma, and sizeof',
          body: [
            "`condition ? a : b` chooses between two values and evaluates only the chosen one. The comma operator evaluates its left side, throws the result away, and yields its right side. It is rarely seen outside `for` headers.",
            "`sizeof` is an operator, not a function, and it is worked out by the compiler. Its operand is not evaluated at run time. Parentheses are required around a type name and optional around an expression: `sizeof(int)`, `sizeof x`.",
            { run: c`#include <stdio.h>

int main(void) {
    int i = 3;
    size_t size = sizeof(i++);      // The increment never happens.
    printf("%zu %d\n", size, i);
    printf("%s\n", i % 2 == 0 ? "even" : "odd");
    return 0;
}`, name: 'sizeof.c', warns: true, expect: '4 3\nodd\n' },
          ],
        },
      ],
      takeaways: [
        "`/` truncates toward zero and `%` follows the sign of the left operand.",
        "Zero is false, everything else is true, and logical operators always produce 1 or 0.",
        "Parenthesize every bitwise expression that sits next to a comparison.",
        "Do bit manipulation on unsigned types.",
        "C does not promise left-to-right evaluation. Keep to one side effect per statement.",
      ],
      quiz: [
        {
          q: 'What are the values of `-7 / 2` and `-7 % 2`?',
          options: [
            { t: '−4 and 1', why: "That is what Python gives, because it rounds division down. C truncates toward zero." },
            { t: '−3 and −1', ok: true, why: "Division truncates toward zero, and the remainder has the sign of the left operand. Check: −3 × 2 + −1 = −7." },
            { t: '−3 and 1', why: "The quotient is right, but then −3 × 2 + 1 would be −5. The remainder must be −1." },
            { t: '−3.5 and 0', why: "Both operands are `int`, so the division is integer division." },
          ],
        },
        {
          q: 'A colleague writes this to test whether bit 2 is clear. What does the condition actually compute?',
          code: c`if (flags & 4 == 0) {
    start();
}`,
          options: [
            { t: '`(flags & 4) == 0`, as intended', why: "`==` binds more tightly than `&`, so the comparison is grouped first." },
            { t: '`flags & (4 == 0)`, which is `flags & 0`, so `start()` never runs', ok: true, why: "`4 == 0` is 0, and anything AND 0 is 0. Write `(flags & 4) == 0`. The compiler warns about this one too." },
            { t: 'It does not compile', why: "It is valid C. It just does not mean what was intended." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    int i = 5;
    int j = i++ + 1;
    printf("%d %d\n", i, j);
    return 0;
}`,
          answer: '6 6',
          explain: "`i++` yields the old value 5, so `j` is 6. The increment has happened by the end of the statement, so `i` is 6 as well.",
        },
        {
          kind: 'multi',
          q: 'Which of these statements have undefined behavior? Assume `i` is an `int` and `a` is an array of `int`.',
          options: [
            { t: '`i = i++;`', ok: true, why: "`i` is modified twice with nothing ordering the two changes." },
            { t: '`a[i] = i++;`', ok: true, why: "`i` is read to pick the element and separately modified, with no ordering between them." },
            { t: '`x = f() + g();`', why: "The order of the two calls is unspecified, but each call is complete in itself. This is only a problem if `f` and `g` depend on each other." },
            { t: '`if (i++ && i++) { }`', why: "`&&` finishes its left side, including the increment, before starting the right." },
            { t: '`i = i + 1;`', why: "One modification, and the read is used to compute the stored value. This is ordinary." },
          ],
          hint: "Look for a variable that is changed and also read or changed somewhere else in the same expression, with no `&&`, `||`, `?:` or comma in between.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    unsigned x = 0x0F;
    x = (x << 2) | 1u;
    x &= ~0x08u;
    printf("%u\n", x);
    return 0;
}`,
          answer: '53',
          explain: "`0x0F << 2` is binary 111100, which is 60. OR with 1 gives 111101, 61. Clearing the bit worth 8 gives 110101, 53.",
          hint: "Write the value in binary after each line. `0x0F` is 1111.",
        },
        {
          kind: 'predict',
          q: 'How many times is `bump` called? The program prints the count.',
          code: c`#include <stdio.h>

int calls = 0;

int bump(void) {
    ++calls;
    return 1;
}

int main(void) {
    if (0 && bump()) { }
    if (1 || bump()) { }
    if (1 && bump()) { }
    printf("%d\n", calls);
    return 0;
}`,
          answer: '1',
          explain: "`0 && …` and `1 || …` are decided by their left side, so the right side is never evaluated. Only the third condition has to call `bump`.",
        },
        {
          q: 'With `int n = 2;`, what is the value of `1 << n + 1`?',
          options: [
            { t: '5', why: "That would be `(1 << n) + 1`. Addition binds more tightly than shift." },
            { t: '8', ok: true, why: "It is grouped as `1 << (n + 1)`, which is `1 << 3`." },
            { t: '6', why: "A shift left by 3 multiplies by 8, not by 3." },
          ],
        },
      ],
      challenges: [
        {
          id: 'is-power-of-two',
          title: 'Power of two',
          level: 'warm-up',
          prompt: "Return `true` if `x` is a power of two: 1, 2, 4, 8 and so on. Zero is not a power of two. There is a well-known one-line answer using `&`, but a loop is fine.",
          signature: 'bool is_power_of_two(unsigned x)',
          starter: c`bool is_power_of_two(unsigned x) {
    return false;
}`,
          hints: [
            "A power of two has exactly one bit set.",
            "Subtracting 1 from a power of two clears that bit and sets every bit below it, so `x & (x - 1)` is zero. Remember to rule out `x == 0` separately.",
          ],
          solution: c`bool is_power_of_two(unsigned x) {
    return x != 0 && (x & (x - 1)) == 0;
}`,
          tests: [
            { label: 'Accepts small powers of two', body: c`CHECK(is_power_of_two(1));
CHECK(is_power_of_two(2));
CHECK(is_power_of_two(64));` },
            { label: 'Rejects zero', body: c`CHECK(!is_power_of_two(0));` },
            { label: 'Rejects numbers with several bits set', body: c`CHECK(!is_power_of_two(3));
CHECK(!is_power_of_two(12));
CHECK(!is_power_of_two(255));` },
            { label: 'Handles the top bit', body: c`CHECK(is_power_of_two(0x80000000u));
CHECK(!is_power_of_two(0xFFFFFFFFu));` },
          ],
        },
        {
          id: 'count-set-bits',
          title: 'Count the set bits',
          level: 'core',
          prompt: "Return how many bits of `value` are 1. For example, 13 is binary 1101 and has three.",
          signature: 'unsigned count_set_bits(uint32_t value)',
          starter: c`unsigned count_set_bits(uint32_t value) {
    unsigned count = 0;
    // Examine each bit.
    return count;
}`,
          hints: [
            "`value & 1u` is the lowest bit. `value >>= 1` moves the next bit into its place.",
            "Loop until `value` is zero. Because `value` is unsigned, the right shift fills with zeros and the loop ends.",
          ],
          solution: c`unsigned count_set_bits(uint32_t value) {
    unsigned count = 0;
    while (value != 0) {
        count += value & 1u;
        value >>= 1;
    }
    return count;
}`,
          tests: [
            { label: 'Zero has no bits set', body: c`CHECK(count_set_bits(0) == 0);` },
            { label: 'Counts scattered bits', body: c`CHECK(count_set_bits(13) == 3);
CHECK(count_set_bits(0x101) == 2);` },
            { label: 'Counts the top bit', body: c`CHECK(count_set_bits(0x80000000u) == 1);` },
            { label: 'Counts all 32 bits', body: c`CHECK(count_set_bits(0xFFFFFFFFu) == 32);` },
          ],
        },
        {
          id: 'floor-div',
          title: 'Python-style division',
          level: 'core',
          prompt: "Return `a` divided by `b`, rounded down toward negative infinity as Python's `//` does. So 7 and 2 give 3, but −7 and 2 give −4. `b` is never zero, and the inputs are small enough that nothing overflows.",
          signature: 'int floor_div(int a, int b)',
          starter: c`int floor_div(int a, int b) {
    return a / b;
}`,
          hints: [
            "C's answer is already right when the division is exact, and when the true quotient is positive.",
            "The two differ only when there is a remainder and the operands have opposite signs. Then C's quotient is one too high.",
            "The remainder is nonzero when `a % b != 0`. The signs differ when `(a % b < 0) != (b < 0)`.",
          ],
          solution: c`int floor_div(int a, int b) {
    int quotient = a / b;
    int remainder = a % b;
    if (remainder != 0 && (remainder < 0) != (b < 0)) {
        --quotient;
    }
    return quotient;
}`,
          tests: [
            { label: 'Agrees with C for positive operands', body: c`CHECK(floor_div(7, 2) == 3);
CHECK(floor_div(8, 2) == 4);` },
            { label: 'Rounds down for a negative dividend', body: c`CHECK(floor_div(-7, 2) == -4);` },
            { label: 'Rounds down for a negative divisor', body: c`CHECK(floor_div(7, -2) == -4);` },
            { label: 'Two negatives give a positive quotient', body: c`CHECK(floor_div(-7, -2) == 3);` },
            { label: 'Exact divisions need no adjustment', body: c`CHECK(floor_div(-8, 2) == -4);
CHECK(floor_div(0, -5) == 0);` },
          ],
        },
        {
          id: 'rotate-left',
          title: 'Rotate left',
          level: 'stretch',
          prompt: [
            "A rotation is a shift where the bits that fall off one end come back in at the other. Return `value` rotated left by `count` bits, so rotating `0x80000001` by 1 gives `0x00000003`.",
            "`count` may be any value, including 0, 32 and larger. Rotating by 32 leaves the value unchanged. Remember that shifting a 32-bit value by 32 or more is undefined behavior.",
          ],
          signature: 'uint32_t rotate_left(uint32_t value, unsigned count)',
          starter: c`uint32_t rotate_left(uint32_t value, unsigned count) {
    return value << count;
}`,
          hints: [
            "Reduce the count first: `count %= 32`.",
            "The rotation is `(value << count) | (value >> (32 - count))`.",
            "When `count` is 0, that right shift is by 32, which is undefined. Handle zero separately.",
          ],
          solution: c`uint32_t rotate_left(uint32_t value, unsigned count) {
    count %= 32;
    if (count == 0) {
        return value;
    }
    return (value << count) | (value >> (32 - count));
}`,
          tests: [
            { label: 'Rotates by one', body: c`CHECK(rotate_left(0x80000001u, 1) == 0x00000003u);` },
            { label: 'Rotates by a byte', body: c`CHECK(rotate_left(0x12345678u, 8) == 0x34567812u);` },
            { label: 'Rotating by zero changes nothing', body: c`CHECK(rotate_left(0xDEADBEEFu, 0) == 0xDEADBEEFu);` },
            { label: 'Rotating by 32 changes nothing', body: c`CHECK(rotate_left(0xDEADBEEFu, 32) == 0xDEADBEEFu);` },
            { label: 'Counts above 32 wrap around', body: c`CHECK(rotate_left(0x12345678u, 40) == 0x34567812u);` },
          ],
        },
      ],
    },

    {
      id: 'control-flow',
      title: 'Control flow',
      category: part,
      minutes: 22,
      summary: 'The statements are the ones you know. This lesson is about the places where they bite: optional braces, unsigned loop counters, and switch.',
      topics: ['if and else', 'Loops', 'Unsigned counters', 'switch', 'Block scope'],
      sections: [
        {
          title: 'if, else, and why to keep the braces',
          body: [
            "The body of an `if`, `else`, `for` or `while` is a single statement. Braces turn several statements into one. They are optional around a single statement, and leaving them off is where trouble starts.",
            { code: c`if (ready)
    if (count > 0)
        puts("go");
else                      // The indentation lies. This else belongs to the inner if.
    puts("not ready");` },
            "An `else` attaches to the nearest `if` that does not have one yet, whatever the indentation suggests. The same carelessness lets a second statement be added under an `if` that only governs the first. Always write the braces.",
            { compare: "In Python the indentation is the structure. In C the braces are the structure and indentation is decoration, which the compiler ignores completely." },
            "Conditions take any number or pointer, so `if (count)` and `if (!found)` are common. Compare against zero explicitly when it reads better.",
          ],
        },
        {
          title: 'while, do-while, and for',
          body: [
            "`while` tests before each pass. `do … while` tests after, so its body always runs at least once, and it ends with a semicolon. `for` gathers the setup, the test and the step into one header.",
            { run: c`#include <stdio.h>

int main(void) {
    for (int i = 0; i < 3; ++i) {
        printf("for %d\n", i);
    }

    int n = 100;
    while (n > 10) {
        n /= 3;
    }
    printf("while ended at %d\n", n);

    int attempts = 0;
    do {
        ++attempts;                  // Runs once even though the test is false.
    } while (attempts < 1);
    printf("do-while ran %d time\n", attempts);
    return 0;
}`, name: 'loops.c', expect: 'for 0\nfor 1\nfor 2\nwhile ended at 3\ndo-while ran 1 time\n' },
            { list: [
              "A variable declared in a `for` header exists only inside that loop.",
              "Any of the three parts of a `for` header may be empty. `for (;;)` loops forever.",
              "`break` leaves the innermost loop. `continue` skips to its next pass.",
            ] },
            { compare: "There is no `for … in`, no `foreach`, and no iterator protocol. An array does not know its own length. You loop over an index or, as Part 2 shows, over a pointer, and you supply the bound yourself." },
          ],
        },
        {
          title: 'Loop counters and unsigned types',
          body: [
            "Use `size_t` for anything that counts or indexes. Counting upward is uneventful. Counting downward is a trap, because an unsigned value can never be negative:",
            { code: c`for (size_t i = n - 1; i >= 0; --i) {   // i >= 0 is always true.
    use(items[i]);                       // After i reaches 0, --i wraps to a huge value.
}` },
            "The loop never ends, and it reads far outside the array on the way. It also starts wrong when `n` is 0. The standard idiom tests before decrementing:",
            { run: c`#include <stdio.h>

int main(void) {
    size_t n = 4;
    for (size_t i = n; i-- > 0;) {     // Compare the old value, then decrement.
        printf("%zu ", i);
    }
    printf("\n");
    return 0;
}`, name: 'countdown.c', expect: '3 2 1 0 \n' },
            "Read `i-- > 0` as: is `i` still above zero? Then step down, and use the new value in the body. It visits `n - 1` down to `0` and handles `n == 0` correctly by doing nothing.",
          ],
        },
        {
          title: 'switch',
          body: [
            "`switch` jumps to the `case` label that matches an integer value. Labels must be integer constants: there is no switching on strings or ranges.",
            "Execution continues from the label until it meets a `break`, and it runs straight through any labels in between. That fall-through is useful for giving several values one body, and it is a bug when a `break` is simply forgotten.",
            { run: c`#include <stdio.h>

const char *describe(int day) {
    switch (day) {
        case 6:
        case 7:                 // Two labels, one body.
            return "weekend";
        case 5:
            printf("(nearly there) ");
            // No break here, so execution falls into the next case.
        case 1: case 2: case 3: case 4:
            return "weekday";
        default:                // Runs when nothing else matches.
            return "not a day";
    }
}

int main(void) {
    printf("%s\n", describe(7));
    printf("%s\n", describe(5));
    printf("%s\n", describe(9));
    return 0;
}`, name: 'switch.c', expect: 'weekend\n(nearly there) weekday\nnot a day\n' },
            "For now, read `const char *` as the type of a read-only string. The strings lesson explains it properly.",
            { compare: "JavaScript and PHP `switch` fall through in the same way. Python's `match` does not, and it can match on structure, which C's `switch` cannot." },
            { tip: "When a fall-through is deliberate, say so in a comment. To declare a variable inside a `case`, wrap that case's statements in braces." },
          ],
        },
        {
          title: 'Leaving nested loops',
          body: [
            "`break` only leaves one level, and C has no labeled `break`. To leave two loops at once you can set a flag, move the loops into a function and `return`, or use `goto`.",
            { code: c`for (size_t row = 0; row < rows; ++row) {
    for (size_t col = 0; col < cols; ++col) {
        if (grid[row][col] == target) {
            goto found;           // Leaves both loops at once.
        }
    }
}
return false;

found:
return true;` },
            "`goto` jumps to a label in the same function. It has two respectable uses in C: this one, and jumping forward to shared cleanup code at the end of a function, which the dynamic memory lesson shows. Beyond those, prefer a function and a `return`.",
          ],
        },
        {
          title: 'Blocks and scope',
          body: [
            "Every pair of braces opens a scope. A variable declared inside exists from its declaration to the closing brace, and a loop body gets a fresh one on every pass.",
            { code: c`int total = 0;
for (int i = 0; i < 3; ++i) {
    int square = i * i;     // A new square on every pass.
    total += square;
}
// Neither i nor square exists here.` },
            "An inner declaration may reuse an outer name, which hides the outer variable until the block ends. It is legal and almost always a mistake. Declare each variable at its first use, in the smallest block that needs it.",
          ],
        },
      ],
      takeaways: [
        "Braces define structure. Indentation does not. Write the braces every time.",
        "An unsigned counter is never negative: count down with `for (size_t i = n; i-- > 0;)`.",
        "`switch` falls through until it meets a `break`.",
        "C loops are index loops. You bring the bound.",
      ],
      quiz: [
        {
          q: 'What does `f(13)` return?',
          code: c`unsigned f(unsigned n) {
    unsigned steps = 0;
    while (n > 0) {
        n /= 2;
        ++steps;
    }
    return steps;
}`,
          options: [
            { t: '3', why: "After three steps `n` is 1. The condition still holds, so the loop runs once more." },
            { t: '4', ok: true, why: "Integer division takes `n` through 13, 6, 3, 1 and finally 0." },
            { t: '5', why: "There are four divisions. The fifth test finds `n` equal to zero and ends the loop." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    int level = 2;
    switch (level) {
        case 1: printf("one ");
        case 2: printf("two ");
        case 3: printf("three ");
            break;
        case 4: printf("four ");
    }
    printf("\n");
    return 0;
}`,
          answer: 'two three',
          explain: "Execution jumps to `case 2`, prints, and falls through into `case 3` because nothing stops it. The `break` there ends the switch before `case 4`.",
          hint: "Start at the matching label and keep going until you reach a `break`.",
        },
        {
          q: 'What happens when this loop runs?',
          code: c`for (size_t i = 3; i >= 0; --i) {
    printf("%zu\n", i);
}`,
          options: [
            { t: 'It prints 3, 2, 1, 0 and stops', why: "After printing 0, `--i` does not produce −1. `size_t` is unsigned, so it wraps to the largest value." },
            { t: 'It never stops, because `i >= 0` is always true for an unsigned type', ok: true, why: "After 0, the decrement wraps `i` to `SIZE_MAX` and the loop carries on. Use `for (size_t i = 4; i-- > 0;)`." },
            { t: 'It does not compile', why: "It compiles. Some compilers warn that the comparison is always true." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    int sum = 0;
    for (int i = 1; i <= 10; ++i) {
        if (i % 2 == 0) {
            continue;
        }
        if (i > 7) {
            break;
        }
        sum += i;
    }
    printf("%d\n", sum);
    return 0;
}`,
          answer: '16',
          explain: "Even numbers are skipped. The odd numbers 1, 3, 5 and 7 are added, giving 16. At 9 the loop breaks.",
        },
        {
          q: 'After this code runs with `n` starting at 0, what is `n`?',
          code: c`int n = 0;
do {
    n--;
} while (n > 0);`,
          options: [
            { t: '0, because the condition is false from the start', why: "A `do … while` tests after the body, so the body runs once before the condition is looked at." },
            { t: '−1', ok: true, why: "The body runs once, taking `n` to −1. Then the test fails and the loop ends." },
            { t: 'The loop never ends', why: "After one pass `n` is −1, which is not greater than 0." },
          ],
        },
      ],
      challenges: [
        {
          id: 'collatz-steps',
          title: 'Collatz steps',
          level: 'warm-up',
          prompt: "Start from `n`. If it is even, halve it. If it is odd, replace it with `3 * n + 1`. Repeat until it reaches 1, and return how many steps that took. Starting from 6 the sequence is 6, 3, 10, 5, 16, 8, 4, 2, 1, which is 8 steps. `n` is at least 1.",
          signature: 'unsigned collatz_steps(unsigned n)',
          starter: c`unsigned collatz_steps(unsigned n) {
    unsigned steps = 0;
    // Loop until n is 1.
    return steps;
}`,
          hints: ["`n % 2 == 0` tests for even. A `while (n != 1)` loop does the rest."],
          solution: c`unsigned collatz_steps(unsigned n) {
    unsigned steps = 0;
    while (n != 1) {
        if (n % 2 == 0) {
            n /= 2;
        } else {
            n = 3 * n + 1;
        }
        ++steps;
    }
    return steps;
}`,
          tests: [
            { label: 'Starting at 1 takes no steps', body: c`CHECK(collatz_steps(1) == 0);` },
            { label: 'A power of two only halves', body: c`CHECK(collatz_steps(16) == 4);` },
            { label: 'The worked example', body: c`CHECK(collatz_steps(6) == 8);` },
            { label: 'A long sequence', body: c`CHECK(collatz_steps(27) == 111);` },
          ],
        },
        {
          id: 'sum-even-digits',
          legacy: 'control-and-functions',
          title: 'Sum the even digits',
          level: 'core',
          prompt: "Return the sum of the even decimal digits of `value`. For example, 12045 gives 6, because its even digits are 2, 0 and 4.",
          signature: 'unsigned sum_even_digits(unsigned value)',
          starter: c`unsigned sum_even_digits(unsigned value) {
    unsigned total = 0;
    // Examine each decimal digit.
    return total;
}`,
          hints: [
            "`value % 10` is the last decimal digit, and `value /= 10` removes it.",
            "A digit is even when `digit % 2 == 0`.",
          ],
          solution: c`unsigned sum_even_digits(unsigned value) {
    unsigned total = 0;
    while (value > 0) {
        unsigned digit = value % 10;
        if (digit % 2 == 0) {
            total += digit;
        }
        value /= 10;
    }
    return total;
}`,
          tests: [
            { label: 'Filters mixed digits', body: c`CHECK(sum_even_digits(12045u) == 6u);` },
            { label: 'Adds several even digits', body: c`CHECK(sum_even_digits(8642u) == 20u);` },
            { label: 'Handles all-odd digits', body: c`CHECK(sum_even_digits(13579u) == 0u);` },
            { label: 'Handles zero', body: c`CHECK(sum_even_digits(0u) == 0u);` },
          ],
        },
        {
          id: 'days-in-month',
          title: 'Days in a month',
          level: 'core',
          prompt: "Return the number of days in `month`, where 1 is January and 12 is December. February has 29 days when `leap_year` is true and 28 otherwise. Return 0 for a month number that does not exist. Use a `switch`, and let cases share a body where they can.",
          signature: 'int days_in_month(int month, bool leap_year)',
          starter: c`int days_in_month(int month, bool leap_year) {
    switch (month) {
        default:
            return 0;
    }
}`,
          hints: [
            "April, June, September and November have 30 days. Stack their four `case` labels above one `return 30;`.",
            "February is the only month that needs `leap_year`. The conditional operator fits: `leap_year ? 29 : 28`.",
          ],
          solution: c`int days_in_month(int month, bool leap_year) {
    switch (month) {
        case 4: case 6: case 9: case 11:
            return 30;
        case 2:
            return leap_year ? 29 : 28;
        case 1: case 3: case 5: case 7: case 8: case 10: case 12:
            return 31;
        default:
            return 0;
    }
}`,
          tests: [
            { label: 'Months with 31 days', body: c`CHECK(days_in_month(1, false) == 31);
CHECK(days_in_month(8, false) == 31);
CHECK(days_in_month(12, true) == 31);` },
            { label: 'Months with 30 days', body: c`CHECK(days_in_month(4, false) == 30);
CHECK(days_in_month(11, true) == 30);` },
            { label: 'February in an ordinary year', body: c`CHECK(days_in_month(2, false) == 28);` },
            { label: 'February in a leap year', body: c`CHECK(days_in_month(2, true) == 29);` },
            { label: 'Month numbers that do not exist', body: c`CHECK(days_in_month(0, false) == 0);
CHECK(days_in_month(13, true) == 0);
CHECK(days_in_month(-1, false) == 0);` },
          ],
        },
        {
          id: 'sum-below',
          title: 'Stop the runaway loop',
          level: 'core',
          kind: 'fix',
          broken: 'timeout',
          prompt: [
            "This function is meant to add up the whole numbers below `count`, working from the top down. Run the tests and you will find that it never finishes: after 2.5 seconds the page stops it.",
            "Find out why the loop cannot end, and fix it. Keep the loop counting downward and keep `i` unsigned.",
          ],
          signature: 'unsigned sum_below(unsigned count)',
          starter: c`// Returns 0 + 1 + ... + (count - 1).
unsigned sum_below(unsigned count) {
    unsigned total = 0;
    for (unsigned i = count - 1; i >= 0; --i) {
        total += i;
    }
    return total;
}`,
          hints: [
            "What is the value of `i` after `--i` when `i` is 0? `i` is unsigned.",
            "There is a second bug: think about `count - 1` when `count` is 0.",
            "The idiom from the lesson fixes both: `for (unsigned i = count; i-- > 0;)`.",
          ],
          solution: c`// Returns 0 + 1 + ... + (count - 1).
unsigned sum_below(unsigned count) {
    unsigned total = 0;
    for (unsigned i = count; i-- > 0;) {
        total += i;
    }
    return total;
}`,
          tests: [
            { label: 'Nothing is below zero', body: c`CHECK(sum_below(0) == 0);` },
            { label: 'Only zero is below one', body: c`CHECK(sum_below(1) == 0);` },
            { label: 'A small count', body: c`CHECK(sum_below(5) == 10);` },
            { label: 'A larger count', body: c`CHECK(sum_below(100) == 4950);` },
          ],
        },
      ],
    },

    {
      id: 'functions',
      title: 'Functions, scope & storage',
      category: part,
      minutes: 28,
      summary: 'How functions are declared and called, why arguments are always copies, and how long a variable lives. These are the ideas pointers are built on.',
      topics: ['Prototypes', 'Pass by value', 'Storage duration', 'static', 'The call stack'],
      sections: [
        {
          title: 'Declarations and definitions',
          body: [
            "A **definition** is a function with its body. A **declaration**, also called a prototype, is just the first line followed by a semicolon. It tells the compiler the name, the return type and the parameter types, which is everything needed to check and compile a call.",
            "Because the compiler reads top to bottom, a function must be declared before it is called. Putting prototypes at the top lets you order the definitions however you like.",
            { run: c`#include <stdio.h>

unsigned sum_to(unsigned limit);    // Declaration: the body comes later.

int main(void) {
    printf("%u\n", sum_to(5));      // The compiler already knows the types.
    return 0;
}

unsigned sum_to(unsigned limit) {   // Definition.
    unsigned total = 0;
    for (unsigned i = 1; i <= limit; ++i) {
        total += i;
    }
    return total;
}`, name: 'prototype.c', expect: '15\n' },
            "A header file is mostly a collection of prototypes. `#include <stdio.h>` is how your file learns the types of `printf`.",
            { pitfall: "Write `(void)` for a function that takes nothing. In C17 an empty pair of parentheses means that the parameters are unspecified, so `int f();` lets `f(1, 2, 3)` compile unchecked." },
          ],
        },
        {
          title: 'Arguments are copies',
          body: [
            "C has one way to pass an argument: by value. The function receives its own copy of each argument in a new variable. Whatever it does to that copy stays in the function.",
            { trace: {
              title: 'A function changes only its own copy',
              code: c`void add_bonus(int score) {
    score += 10;
}

int main(void) {
    int score = 50;
    add_bonus(score);
    printf("%d\n", score);
    return 0;
}`,
              vars: [
                { id: 'main.score', name: 'score', type: 'int', frame: 'main' },
                { id: 'bonus.score', name: 'score', type: 'int', frame: 'add_bonus' },
              ],
              steps: [
                { line: 6, set: { 'main.score': 50 }, say: "`main` has a local variable `score`, holding 50." },
                { line: 7, set: { 'bonus.score': 50 }, say: "The call creates a new stack frame for `add_bonus`. Its parameter `score` is a separate variable at a separate address, initialized with a copy of the argument." },
                { line: 2, set: { 'bonus.score': 60 }, say: "`score += 10` changes the parameter. The variable in `main` is a different object and is untouched." },
                { line: 3, hide: ['frame:add_bonus'], say: "The function returns and its frame is discarded, taking the 60 with it." },
                { line: 8, say: "Back in `main`, `score` is still 50. That is what gets printed." },
              ],
            } },
            { compare: "Numbers behave this way in Python, PHP and JavaScript too. The difference is everything else. In those languages a list, a dict or an object is passed as a reference to shared data, so a function can modify the caller's object. C has no hidden references. Every argument is copied, including whole structs. For a function to change a caller's variable, the caller must pass that variable's address, explicitly. That is what pointers are for, and Part 2 begins there." },
          ],
        },
        {
          title: 'Return values',
          body: [
            "A function returns one value, or nothing if its return type is `void`. The returned value is copied back to the caller.",
            { code: c`int largest(int a, int b) {
    return a > b ? a : b;
}

void log_value(int value) {     // void: nothing to return.
    printf("value = %d\n", value);
}` },
            "To hand back more than one result, C code either returns a struct or takes the address of somewhere to write each extra result. You have already seen the second pattern from the outside: `snprintf` was given a buffer to fill.",
            { pitfall: "If a function with a return type can reach its closing brace without a `return`, and the caller uses the result, the behavior is undefined. The compiler warns that control reaches the end of a non-void function. Take that warning literally." },
          ],
        },
        {
          title: 'How long a variable lives',
          body: [
            "Every variable has a **storage duration**, which is the stretch of time for which its memory is reserved. Outside that time the variable does not exist.",
            { table: {
              head: ['Duration', 'Which variables', 'Lifetime', 'Starts as'],
              rows: [
                ['Automatic', 'Ordinary locals and parameters', 'From entering the block until leaving it', 'Indeterminate'],
                ['Static', 'Variables outside functions, and locals marked `static`', 'The whole run of the program', 'Zero'],
                ['Allocated', 'Memory from `malloc`', 'Until you call `free`', 'Indeterminate'],
              ],
            } },
            "A `static` local is visible only inside its function but keeps its value from one call to the next. Its initializer runs once, before the program starts.",
            { run: c`#include <stdio.h>

int next_ticket(void) {
    static int issued = 0;    // One variable for the whole program run.
    int scratch = 0;          // A new variable on every call.
    ++issued;
    ++scratch;
    printf("issued=%d scratch=%d\n", issued, scratch);
    return issued;
}

int main(void) {
    next_ticket();
    next_ticket();
    next_ticket();
    return 0;
}`, name: 'static.c', expect: 'issued=1 scratch=1\nissued=2 scratch=1\nissued=3 scratch=1\n' },
            "Static locals are hidden global state. They are handy for counters and caches, and they make a function harder to test and unsafe to call from two threads at once.",
          ],
        },
        {
          title: 'The other meaning of static',
          body: [
            "At the top level of a file, outside any function, `static` means something else. It controls **linkage**: whether the linker lets other source files see the name.",
            { code: c`int request_count;                 // External linkage: any file can use it.
static int cache_hits;             // Internal linkage: private to this file.

static int clamp(int v, int lo, int hi) {   // A private helper function.
    return v < lo ? lo : v > hi ? hi : v;
}

int public_entry(int value) {      // Callable from the whole program.
    return clamp(value, 0, 100);
}` },
            { table: {
              head: ['Where `static` appears', 'What it changes'],
              rows: [
                ['On a local variable', 'Lifetime: the variable lasts for the whole program.'],
                ['On a function or variable outside any function', 'Visibility: the name is private to this source file.'],
              ],
            } },
            { compare: "File-level `static` is the nearest thing C has to a non-exported name in a TypeScript module, or a leading underscore in Python. It is also all there is. C has no namespaces, so every non-static function in a program shares one global space of names. That is why library functions carry prefixes such as `sqlite3_` or `curl_`." },
          ],
        },
        {
          title: 'The call stack',
          body: [
            "Each call reserves a **stack frame**: a block of memory for that call's parameters and locals. Returning releases it. Calls nest, so frames stack up and come off in reverse order. A recursive function gets a fresh frame, with fresh variables, for every call that is still in progress.",
            { run: c`#include <stdio.h>

unsigned long long factorial(unsigned n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);    // This call waits while a new frame does the rest.
}

int main(void) {
    printf("%llu\n", factorial(20));
    return 0;
}`, name: 'factorial.c', expect: '2432902008176640000\n' },
            "The stack has a fixed size, typically 8 MB for a program's main thread on macOS and Linux, and 1 MB in this page. Recursion that goes too deep, or a very large local array, runs off the end. There is no exception to catch. The program crashes. Where the depth depends on input, use a loop.",
          ],
        },
        {
          title: 'Why locals cannot outlive their function',
          body: [
            "Put the last two sections together. A local variable lives in its function's stack frame, and the frame is released when the function returns. So this function hands back the address of something that no longer exists:",
            { code: c`int *broken(void) {
    int value = 42;
    return &value;      // warning: address of stack memory associated with
}                       // local variable 'value' returned` },
            "The caller receives an address, and the address is still a valid number. But the memory behind it now belongs to whichever function is called next. This is a **dangling pointer**, and it is one of the classic C bugs.",
            "You now have the pieces that Part 2 builds on: variables are regions of memory, arguments are copies, and every variable has a lifetime. A pointer is what you get when you treat the location of a variable as a value in its own right.",
          ],
        },
      ],
      takeaways: [
        "Declare before use. A prototype is enough for the compiler to check a call.",
        "Every argument is a copy. A function cannot change a caller's variable unless it is given that variable's address.",
        "Locals live in a stack frame and die when the function returns.",
        "`static` on a local changes its lifetime. `static` at file level changes who can see the name.",
      ],
      quiz: [
        {
          q: 'What does this program print?',
          code: c`void reset(int n) {
    n = 0;
}

int main(void) {
    int n = 9;
    reset(n);
    printf("%d\n", n);
    return 0;
}`,
          options: [
            { t: '0', why: "`reset` set its own parameter to 0. That parameter is a copy with the same name, in a different stack frame." },
            { t: '9', ok: true, why: "The argument was copied into the parameter. Nothing in `reset` can reach the variable in `main`." },
            { t: 'It depends on the compiler', why: "Pass by value is guaranteed by the language. Every compiler prints 9." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int tick(void) {
    static int count = 10;
    count += 5;
    return count;
}

int main(void) {
    tick();
    tick();
    printf("%d\n", tick());
    return 0;
}`,
          answer: '25',
          explain: "`count` is initialized to 10 once, not on every call. The three calls take it to 15, 20 and 25.",
          hint: "A `static` local keeps its value between calls. Its initializer runs only once.",
        },
        {
          q: 'In a file `shapes.c`, what does `static` do here?',
          code: c`static double area(double w, double h) {
    return w * h;
}`,
          options: [
            { t: 'It makes the result be remembered between calls', why: "That is what `static` does to a local variable. On a function it has a different meaning." },
            { t: 'It makes `area` callable only from within `shapes.c`', ok: true, why: "File-level `static` gives a name internal linkage. Other source files cannot see it, and may define their own `area` without a clash." },
            { t: 'It means `area` cannot modify global variables', why: "C has no such restriction. `static` here is purely about visibility to the linker." },
          ],
        },
        {
          q: 'In C17, how do `int f();` and `int f(void);` differ?',
          options: [
            { t: 'They mean the same thing', why: "They do in C++, and from C23 onward. In C17 they differ." },
            { t: '`int f();` leaves the parameters unspecified, so calls are not checked', ok: true, why: "With `int f();` the compiler accepts `f(1, 2, 3)`. With `(void)` it rejects any argument." },
            { t: '`int f();` is a syntax error', why: "It is valid, which is the problem." },
          ],
        },
        {
          q: 'What is wrong with this function?',
          code: c`int *make_counter(void) {
    int counter = 0;
    return &counter;
}`,
          options: [
            { t: 'Nothing. The caller receives a pointer to a counter that starts at 0', why: "`counter` is an automatic variable. It stops existing when `make_counter` returns." },
            { t: 'It returns the address of a local that is destroyed on return', ok: true, why: "The address stays a valid number, but the stack memory it refers to is reused by later calls. Using it is undefined behavior." },
            { t: 'A function cannot return a pointer', why: "Functions return pointers all the time. The problem is which object this one points to." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int depth(int n) {
    if (n == 0) {
        return 0;
    }
    return 1 + depth(n / 2);
}

int main(void) {
    printf("%d\n", depth(40));
    return 0;
}`,
          answer: '6',
          explain: "The calls see 40, 20, 10, 5, 2, 1 and then 0. Each of the six nonzero calls adds 1.",
        },
      ],
      challenges: [
        {
          id: 'declare-before-use',
          title: 'Declare before use',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: "These two functions call each other, so neither can come first. As written the file does not compile. Fix it by adding one line, without changing either function.",
          signature: 'bool is_even(unsigned n)\nbool is_odd(unsigned n)',
          starter: c`bool is_even(unsigned n) {
    return n == 0 ? true : is_odd(n - 1);
}

bool is_odd(unsigned n) {
    return n == 0 ? false : is_even(n - 1);
}`,
          hints: [
            "The error is on the call to `is_odd`, which the compiler has not seen yet.",
            "A prototype above `is_even` solves it: `bool is_odd(unsigned n);`",
          ],
          solution: c`bool is_odd(unsigned n);

bool is_even(unsigned n) {
    return n == 0 ? true : is_odd(n - 1);
}

bool is_odd(unsigned n) {
    return n == 0 ? false : is_even(n - 1);
}`,
          tests: [
            { label: 'Zero is even', body: c`CHECK(is_even(0));
CHECK(!is_odd(0));` },
            { label: 'Recognizes an even number', body: c`CHECK(is_even(10));
CHECK(!is_odd(10));` },
            { label: 'Recognizes an odd number', body: c`CHECK(is_odd(7));
CHECK(!is_even(7));` },
          ],
        },
        {
          id: 'gcd',
          title: 'Greatest common divisor',
          level: 'core',
          prompt: "Return the greatest common divisor of `a` and `b` using Euclid's algorithm: replace the pair `(a, b)` with `(b, a % b)` until `b` is zero, and then `a` is the answer. Define `gcd(n, 0)` and `gcd(0, n)` as `n`. Write it as a loop or recursively.",
          signature: 'unsigned gcd(unsigned a, unsigned b)',
          starter: c`unsigned gcd(unsigned a, unsigned b) {
    return 1;
}`,
          hints: [
            "You need a temporary variable to hold `a % b` while you shift `b` into `a`.",
            "Recursively: `return b == 0 ? a : gcd(b, a % b);`",
          ],
          solution: c`unsigned gcd(unsigned a, unsigned b) {
    while (b != 0) {
        unsigned remainder = a % b;
        a = b;
        b = remainder;
    }
    return a;
}`,
          tests: [
            { label: 'Finds a common factor', body: c`CHECK(gcd(48, 18) == 6);` },
            { label: 'Order does not matter', body: c`CHECK(gcd(18, 48) == 6);` },
            { label: 'Coprime numbers', body: c`CHECK(gcd(17, 5) == 1);` },
            { label: 'Zero with a number', body: c`CHECK(gcd(0, 9) == 9);
CHECK(gcd(9, 0) == 9);` },
            { label: 'Equal numbers', body: c`CHECK(gcd(21, 21) == 21);` },
          ],
        },
        {
          id: 'next-id',
          title: 'Hand out identifiers',
          level: 'core',
          prompt: "Each call returns the next identifier: 1 on the first call, then 2, then 3. The function takes no arguments, and you may not declare a variable outside it.",
          signature: 'int next_id(void)',
          starter: c`int next_id(void) {
    int id = 0;
    ++id;
    return id;
}`,
          hints: [
            "The starter's `id` is created again on every call, so it always returns 1.",
            "A `static` local is initialized once and keeps its value between calls.",
          ],
          solution: c`int next_id(void) {
    static int id = 0;
    ++id;
    return id;
}`,
          tests: [
            { label: 'The first identifier is 1', body: c`CHECK(next_id() == 1);` },
            { label: 'The next call returns 2', body: c`CHECK(next_id() == 2);` },
            { label: 'Later identifiers keep increasing by one', body: c`int a = next_id();
int b = next_id();
int c = next_id();
CHECK(b == a + 1);
CHECK(c == b + 1);` },
          ],
        },
        {
          id: 'fast-power',
          title: 'Fast exponentiation',
          level: 'stretch',
          prompt: [
            "Return `base` raised to `exponent`. Anything to the power 0 is 1. Results that do not fit simply wrap, as unsigned arithmetic does.",
            "Multiplying `exponent` times is too slow: one test uses an exponent of four billion and must finish well inside the time limit. Use **squaring**: if the exponent is even, `b^e` is `(b * b)^(e / 2)`. If it is odd, it is `b * b^(e - 1)`. That needs about 32 steps for any `unsigned` exponent.",
          ],
          signature: 'unsigned long long power(unsigned long long base, unsigned exponent)',
          starter: c`unsigned long long power(unsigned long long base, unsigned exponent) {
    unsigned long long result = 1;
    // Square the base and halve the exponent as you go.
    return result;
}`,
          hints: [
            "Loop while `exponent > 0`. On each pass, if the exponent is odd, multiply `result` by `base`.",
            "Then square `base` and halve `exponent`. The lowest bit of the exponent tells you whether it is odd: `exponent & 1u`.",
          ],
          solution: c`unsigned long long power(unsigned long long base, unsigned exponent) {
    unsigned long long result = 1;
    while (exponent > 0) {
        if (exponent & 1u) {
            result *= base;
        }
        base *= base;
        exponent >>= 1;
    }
    return result;
}`,
          tests: [
            { label: 'Anything to the power zero is one', body: c`CHECK(power(7, 0) == 1);
CHECK(power(0, 0) == 1);` },
            { label: 'Small powers', body: c`CHECK(power(2, 10) == 1024);
CHECK(power(3, 4) == 81);
CHECK(power(5, 1) == 5);` },
            { label: 'A result that needs 64 bits', body: c`CHECK(power(3, 40) == 12157665459056928801ULL);` },
            { label: 'The top bit', body: c`CHECK(power(2, 63) == 9223372036854775808ULL);` },
            { label: 'A four-billion exponent finishes quickly', body: c`CHECK(power(1, 4000000000u) == 1);
CHECK(power(0, 4000000000u) == 0);` },
          ],
        },
      ],
    },
  );
})();
