// Part 3: Pointers at work. Strings, pointers to pointers, raw memory, function pointers.
(() => {
  const c = String.raw;
  const part = 'Part 3 · Pointers at work';

  (window.C_LESSONS ||= []).push(
    {
      id: 'strings',
      title: 'C strings',
      category: part,
      minutes: 40,
      summary: 'C has no string type. It has arrays of char, a convention about a zero byte, and a library. Nearly everything about C strings follows from the pointer rules you already know.',
      topics: ['Null terminator', 'Literals', 'string.h', 'Buffers', 'snprintf', 'Ownership'],
      sections: [
        {
          title: 'A string is a char array with a zero at the end',
          body: [
            "A C string is a sequence of `char`s followed by a byte with the value zero, written `'\\0'` and called the **null terminator**. That is the whole definition. Nothing records the length. Every function that handles a string is given the address of its first character and reads forward until it meets the zero.",
            { strip: {
              title: '`char word[8] = "cat";`',
              cells: ["'c'", "'a'", "'t'", "'\\0'", "'\\0'", "'\\0'", "'\\0'", "'\\0'"],
              dim: [4, 5, 6, 7],
              marks: [{ at: 0, span: 3, label: 'the text: `strlen` is 3' }, { at: 3, label: 'terminator' }],
              caption: "The text needs four bytes, counting its terminator. The array has eight. An initializer zero-fills whatever it does not cover.",
            } },
            { run: c`#include <stdio.h>
#include <string.h>

int main(void) {
    char word[8] = "cat";       // Three letters, a terminator, and four spare bytes.

    printf("%s\n", word);
    printf("strlen %zu, sizeof %zu\n", strlen(word), sizeof word);
    printf("word[3] is %d\n", word[3]);   // The terminator has the value 0.

    word[0] = 'b';              // An array of char is writable.
    word[3] = 's';              // Overwrite the terminator...
    word[4] = '\0';             // ...and put a new one after it.
    printf("%s\n", word);
    return 0;
}`, name: 'strings.c', expect: 'cat\nstrlen 3, sizeof 8\nword[3] is 0\nbats\n' },
            "Three different numbers are in play, and confusing them causes most string bugs:",
            { list: [
              "The **length** of the text: `strlen(word)`, here 3. It is found by scanning, so it costs time proportional to the length.",
              "The **space the text needs**: the length plus one for the terminator, here 4.",
              "The **capacity** of the buffer holding it: here 8. Only you know this number. No function can discover it from a pointer.",
            ] },
            { compare: "A string in Python, JavaScript or PHP is a value that knows its own length, and in the first two it cannot be modified. A C string is a region of memory you manage. It has no length field, it can be changed in place, and it has a fixed capacity that nothing enforces." },
          ],
        },
        {
          title: 'Literals, arrays and pointers',
          body: [
            "A string literal such as `\"cat\"` is an array of four `char`s stored in static memory for the life of the program. You can use it in two quite different ways.",
            { code: c`char buffer[] = "cat";        // An array of 4 chars of your own, filled by copying the literal.
const char *label = "cat";    // A pointer to the literal itself.` },
            { memory: {
              title: 'An array that owns its characters, and a pointer that borrows them',
              vars: [
                { id: 'buffer', type: 'char', len: 4, frame: 'main' },
                { id: 'label', type: 'const char *', frame: 'main' },
                { id: 'lit', name: 'the literal "cat"', type: 'char', len: 4, frame: 'static' },
              ],
              set: {
                buffer: ["'c'", "'a'", "'t'", "'\\0'"],
                lit: ["'c'", "'a'", "'t'", "'\\0'"],
                label: '&lit[0]',
              },
            } },
            { table: {
              head: ['', '`char buffer[] = "cat";`', '`const char *label = "cat";`'],
              rows: [
                ['What it is', 'Four characters', 'One pointer'],
                ['`sizeof`', '4', 'The size of a pointer'],
                ['Can you change the characters?', 'Yes', 'No: the literal is read-only'],
                ['Can it refer to a different string later?', 'No: arrays are not assignable', 'Yes: `label = "dog";`'],
              ],
            } },
            { pitfall: "For historical reasons a string literal has type `char[]`, not `const char[]`, so `char *s = \"cat\"; s[0] = 'b';` compiles. It is undefined behavior, and on most systems it crashes, because literals live in read-only memory. Always point at a literal with `const char *`, and the compiler will stop you." },
          ],
        },
        {
          title: 'Walking a string',
          body: [
            "Since a string is an address and a terminator, the natural loop moves a pointer forward until it reaches the zero. This trace copies a string by hand. It is exactly the range walk from the last lesson, with the terminator standing in for the end pointer.",
            { trace: {
              title: 'Copying a string one character at a time',
              code: c`void copy(char *dst, const char *src) {
    while (*src != '\0') {
        *dst = *src;
        ++dst;
        ++src;
    }
    *dst = '\0';
}

int main(void) {
    char out[4];
    copy(out, "hi");
    puts(out);
    return 0;
}`,
              vars: [
                { id: 'out', type: 'char', len: 4, frame: 'main' },
                { id: 'dst', type: 'char *', frame: 'copy' },
                { id: 'src', type: 'const char *', frame: 'copy' },
                { id: 'lit', name: 'the literal "hi"', type: 'char', len: 3, frame: 'static' },
              ],
              steps: [
                { line: 11, show: ['out'], set: { lit: ["'h'", "'i'", "'\\0'"] }, say: "`out` is a local array of four chars with indeterminate contents. The literal `\"hi\"` already exists in static storage: two letters and a terminator." },
                { line: 12, set: { dst: '&out[0]', src: '&lit[0]' }, say: "Both arguments are arrays, so both decay. `dst` points at the first byte of `out`, and `src` at the first byte of the literal." },
                { line: 2, say: "`*src` is `'h'`, which is not the terminator, so the loop body runs." },
                { line: 3, set: { 'out[0]': "'h'" }, say: "One character is copied through the two pointers." },
                { line: [4, 5], set: { dst: '&out[1]', src: '&lit[1]' }, say: "Both pointers step forward one `char`." },
                { line: 3, set: { 'out[1]': "'i'" }, say: "`*src` is `'i'`, so the loop runs again and copies it." },
                { line: [4, 5], set: { dst: '&out[2]', src: '&lit[2]' }, say: "Both pointers step forward again." },
                { line: 2, say: "Now `*src` is the terminator. The loop ends without copying it." },
                { line: 7, set: { 'out[2]': "'\\0'" }, say: "So the function has to write a terminator itself. Leave this line out and `out` is not a string: whatever reads it next will run on past the end." },
                { line: 13, hide: ['frame:copy'], say: "`puts` prints `hi`. The last byte of `out` was never written, and that is fine, because every string function stops at the terminator." },
              ],
            } },
            "Experienced C programmers compress that loop using the fact that an assignment has a value. The copied character is itself the loop test, so the terminator is copied and then ends the loop:",
            { code: c`while ((*dst++ = *src++) != '\0') {
}` },
          ],
        },
        {
          title: 'The string library',
          body: [
            "`<string.h>` has the basic operations. All of them take pointers and trust you about the memory behind those pointers.",
            { table: {
              head: ['Function', 'What it does'],
              rows: [
                ['`strlen(s)`', 'Counts the characters before the terminator.'],
                ['`strcmp(a, b)`', 'Compares contents. Returns a negative number, zero, or a positive number.'],
                ['`strncmp(a, b, n)`', 'The same, looking at no more than `n` characters.'],
                ['`strchr(s, ch)`', 'Returns a pointer to the first `ch` in `s`, or `NULL`.'],
                ['`strrchr(s, ch)`', 'The same for the last `ch`.'],
                ['`strstr(s, sub)`', 'Returns a pointer to the first occurrence of `sub` in `s`, or `NULL`.'],
                ['`strcpy(dst, src)`, `strcat(dst, src)`', 'Copy and append with no size limit. Avoid them.'],
              ],
            } },
            { run: c`#include <stdio.h>
#include <string.h>

int main(void) {
    const char *path = "src/main.c";

    printf("%d\n", strcmp("apple", "apple") == 0);   // Equal contents.
    printf("%d\n", strcmp("apple", "banana") < 0);   // "apple" sorts first.

    const char *slash = strchr(path, '/');           // A pointer into path, or NULL.
    if (slash != NULL) {
        printf("directory is %td characters long\n", slash - path);
        printf("file name: %s\n", slash + 1);        // A string can start anywhere.
    }
    printf("%s\n", strstr(path, ".c") != NULL ? "C source" : "something else");
    return 0;
}`, name: 'library.c', expect: '1\n1\ndirectory is 3 characters long\nfile name: main.c\nC source\n' },
            "Notice what the search functions return: a pointer **into the string you passed**. No new string is made. `slash + 1` is a perfectly good string, because it is an address followed eventually by a terminator. It shares its bytes with `path`.",
            { pitfall: [
              "`==` between two strings compares their addresses, not their characters:",
              { code: c`if (name == "admin") { }              // Compares two pointers. Almost never true.
if (strcmp(name, "admin") == 0) { }   // Compares the contents.` },
              "And because `strcmp` returns 0 for equal strings, `if (strcmp(a, b))` means “if they differ”.",
            ] },
            { compare: "Slicing in Python or `substr` in PHP builds a new string. In C the tail of a string costs nothing, since it is just a pointer further along. A piece from the front or the middle has no terminator of its own, so you either copy it somewhere or carry a length alongside the pointer." },
          ],
        },
        {
          title: 'Buffers and capacity',
          body: [
            "Producing a string means writing into a buffer that somebody owns, and the writer has to know how big it is. `strcpy` does not ask. It copies until the source's terminator, however small the destination, and writes straight past the end. This **buffer overflow** is the most exploited bug in the history of software.",
            "The rule is simple: every function that writes a string takes the capacity of the destination. The most useful one already in the library is `snprintf`. It never writes more than the size you give it, it always terminates the result, and it returns the length the full text would have had, so you can tell whether it was cut short.",
            { run: c`#include <stdio.h>

int main(void) {
    char small[8];

    int needed = snprintf(small, sizeof small, "%s-%d", "release", 2026);
    printf("wanted %d characters, stored \"%s\"\n", needed, small);
    if ((size_t)needed >= sizeof small) {
        puts("the text was truncated");
    }

    needed = snprintf(small, sizeof small, "v%d", 7);
    printf("wanted %d characters, stored \"%s\"\n", needed, small);
    return 0;
}`, name: 'capacity.c', expect: 'wanted 12 characters, stored "release"\nthe text was truncated\nwanted 2 characters, stored "v7"\n' },
            { pitfall: "`strncpy` looks like the safe version of `strcpy` and is not. When the source is too long it fills the buffer and leaves off the terminator, so the result is not a string. Use `snprintf`, or `memcpy` with lengths you have checked." },
          ],
        },
        {
          title: 'Characters and bytes',
          body: [
            "`<ctype.h>` classifies and converts single characters: `isdigit`, `isalpha`, `isspace`, `isupper`, `toupper`, `tolower` and more. Their argument must be a character value converted to `unsigned char`. Passing a plain `char` that happens to be negative is undefined behavior, so cast first.",
            { run: c`#include <ctype.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    char text[] = "Hello, World 42";
    int letters = 0, digits = 0;

    for (char *p = text; *p != '\0'; ++p) {
        unsigned char ch = (unsigned char)*p;
        if (isalpha(ch)) { ++letters; }
        if (isdigit(ch)) { ++digits; }
        *p = (char)toupper(ch);          // Modify the array in place.
    }
    printf("%s: %d letters, %d digits\n", text, letters, digits);
    printf("%zu\n", strlen("naïve"));
    return 0;
}`, name: 'ctype.c', expect: 'HELLO, WORLD 42: 10 letters, 2 digits\n6\n' },
            "The last line prints 6 for a five-letter word. A `char` is a byte, and in UTF-8 any character outside ASCII takes two to four bytes. C strings carry UTF-8 without trouble, because no byte of a multi-byte character is zero. But `strlen` counts bytes, and indexing lands on bytes, not on characters.",
          ],
        },
        {
          title: 'Numbers to strings and back',
          body: [
            "To turn a number into text, format it with `snprintf`. To go the other way, use `strtol`, which reports how much of the input it understood.",
            { run: c`#include <stdio.h>
#include <stdlib.h>

int main(void) {
    const char *input = "42 apples";
    char *end = NULL;
    long value = strtol(input, &end, 10);    // end is set to where parsing stopped.

    printf("value = %ld\n", value);
    printf("unparsed: \"%s\"\n", end);
    printf("parsed anything: %d\n", end != input);
    return 0;
}`, name: 'strtol.c', expect: 'value = 42\nunparsed: " apples"\nparsed anything: 1\n' },
            "Look at the second argument. `strtol` wants to give back a pointer, the place where it stopped, and its return value is already taken by the number. So it takes the address of your pointer and writes into it. That is a pointer to a pointer, and it is the subject of the next lesson.",
            { tip: "Avoid `atoi`. It cannot report failure: it returns 0 both for `\"0\"` and for `\"banana\"`." },
          ],
        },
        {
          title: 'Who owns the storage?',
          body: [
            "A function that produces a string has to put the characters somewhere that will still exist after it returns. There are three sound choices.",
            { list: [
              "**The caller provides a buffer and its capacity.** This is the most common design, and the one `snprintf` uses. Nothing needs to be freed.",
              "**Return a pointer to a string literal**, typed `const char *`. This suits fixed messages, like the day names in the `switch` example.",
              "**Allocate on the heap and return the pointer.** The caller then has to free it. The dynamic memory lesson covers this.",
            ] },
            "What does not work is the thing that feels most natural coming from other languages: building the string in a local array and returning it.",
            { code: c`const char *greeting(const char *name) {
    char text[64];
    snprintf(text, sizeof text, "Hello, %s", name);
    return text;            // Dangling: text is destroyed when the function returns.
}` },
          ],
        },
      ],
      takeaways: [
        "A string is characters followed by `'\\0'`. Text of length n needs n + 1 bytes.",
        "Keep length, space needed and buffer capacity apart. Only you know the capacity.",
        "Point at literals with `const char *`. To get a string you can modify, make an array.",
        "Compare with `strcmp`, never `==`.",
        "Any function that writes a string must be told the capacity. Reach for `snprintf`.",
      ],
      quiz: [
        {
          q: 'For `char word[8] = "cat";`, what are `strlen(word)` and `sizeof word`?',
          options: [
            { t: '3 and 8', ok: true, why: "`strlen` counts the three characters before the terminator. `sizeof` measures all eight bytes of the array." },
            { t: '4 and 8', why: "The terminator occupies a byte, but `strlen` does not count it." },
            { t: '3 and 4', why: "The text needs four bytes with its terminator. The array was declared with eight." },
          ],
        },
        {
          q: 'Both `a` and `b` have type `const char *`. What does `a == b` test?',
          options: [
            { t: 'Whether the two strings contain the same characters', why: "That is what `strcmp(a, b) == 0` tests. `==` knows nothing about what the pointers point to." },
            { t: 'Whether the two pointers hold the same address', ok: true, why: "Two strings with identical contents at different addresses compare unequal." },
            { t: 'Whether the two strings have the same length', why: "`==` on pointers looks only at the addresses." },
          ],
        },
        {
          q: 'What happens here?',
          code: c`char *s = "hello";
s[0] = 'J';`,
          options: [
            { t: '`s` becomes "Jello"', why: "The pointer leads to the literal itself, and a literal must not be modified." },
            { t: 'It is undefined behavior, and usually crashes', ok: true, why: "String literals are typically placed in read-only memory. Declaring `s` as `const char *` would turn this into a compile error. `char s[] = \"hello\";` would give you a copy you can change." },
            { t: 'It does not compile', why: "Unfortunately it does. A literal's type is not `const` in C." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>
#include <string.h>

int main(void) {
    char s[] = "a\0b";
    printf("%zu %zu\n", strlen(s), sizeof s);
    return 0;
}`,
          answer: '1 4',
          explain: "The array holds `a`, a zero, `b`, and the terminator the literal always gets: four bytes. `strlen` stops at the first zero.",
          hint: "The literal contains a zero byte in the middle, and gets another at the end.",
        },
        {
          q: 'How many bytes must a buffer have to hold `"hello"` followed by `", "` followed by `"world"` as one string?',
          options: [
            { t: '12', why: "That is the number of characters: 5 + 2 + 5. The terminator needs a byte too." },
            { t: '13', ok: true, why: "Twelve characters plus one terminator. The terminators of the three pieces do not add up: only the final one is kept." },
            { t: '15', why: "Each piece has its own terminator where it is stored, but the joined string needs only one." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>
#include <string.h>

int main(void) {
    const char *text = "field manual";
    const char *space = strchr(text, ' ');
    printf("%s|%td\n", space + 1, space - text);
    return 0;
}`,
          answer: 'manual|5',
          explain: "`strchr` returns a pointer to the space inside `text`. One past it is the string `manual`, and the pointer difference is the number of characters before the space.",
        },
        {
          q: 'What does `strcmp("apple", "apricot")` return?',
          options: [
            { t: 'A negative number', ok: true, why: "The strings first differ at index 2, where `'p'` comes before `'r'`. The first string sorts earlier, so the result is negative." },
            { t: 'Zero', why: "Zero means the strings are identical." },
            { t: 'A positive number', why: "Positive would mean the first string sorts after the second." },
            { t: '`false`', why: "`strcmp` returns an `int` that orders the strings. It is not a yes-or-no answer, and treating it as one inverts the meaning." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these are sound ways for a function to hand a string back to its caller?',
          options: [
            { t: 'Write it into a buffer the caller passed in, along with the buffer\'s capacity', ok: true, why: "The caller owns the storage, so it outlives the call." },
            { t: 'Return a string literal as a `const char *`', ok: true, why: "Literals have static storage and last for the whole program." },
            { t: 'Build it in a local `char` array and return the array', why: "The array is destroyed on return. The caller gets a dangling pointer." },
            { t: 'Allocate it with `malloc` and document that the caller must free it', ok: true, why: "Heap memory lasts until it is freed." },
          ],
          hint: "Ask of each: does the storage still exist after the function has returned?",
        },
      ],
      challenges: [
        {
          id: 'my-strlen',
          title: 'Measure a string',
          level: 'warm-up',
          forbid: ['strlen'],
          prompt: "Return the number of characters before the terminator. Calling `strlen` is not allowed here: walk the string yourself.",
          signature: 'size_t my_strlen(const char *text)',
          starter: c`size_t my_strlen(const char *text) {
    return 0;
}`,
          hints: [
            "Advance a second pointer from `text` until it points at `'\\0'`.",
            "The length is the distance between the two pointers. Subtracting them gives a `ptrdiff_t`, which you can cast to `size_t`.",
          ],
          solution: c`size_t my_strlen(const char *text) {
    const char *end = text;
    while (*end != '\0') {
        ++end;
    }
    return (size_t)(end - text);
}`,
          tests: [
            { label: 'Measures an ordinary string', body: c`CHECK(my_strlen("pointer") == 7);` },
            { label: 'The empty string has length zero', body: c`CHECK(my_strlen("") == 0);` },
            { label: 'Stops at the first terminator', body: c`CHECK(my_strlen("ab\0cd") == 2);` },
            { label: 'Counts spaces and punctuation', body: c`CHECK(my_strlen("a b, c!") == 7);` },
          ],
        },
        {
          id: 'starts-with',
          title: 'Test a prefix',
          level: 'warm-up',
          prompt: "Return `true` if `text` begins with `prefix`. Every string begins with the empty string.",
          signature: 'bool starts_with(const char *text, const char *prefix)',
          starter: c`bool starts_with(const char *text, const char *prefix) {
    return false;
}`,
          hints: [
            "Walk both strings together while the prefix has characters left.",
            "If the characters ever differ, the answer is false. That includes `text` ending early, because its terminator will not equal the prefix character.",
            "`strncmp(text, prefix, strlen(prefix)) == 0` is the library way to say it.",
          ],
          solution: c`bool starts_with(const char *text, const char *prefix) {
    while (*prefix != '\0') {
        if (*text != *prefix) {
            return false;
        }
        ++text;
        ++prefix;
    }
    return true;
}`,
          tests: [
            { label: 'Recognizes a prefix', body: c`CHECK(starts_with("pointer", "point"));` },
            { label: 'Rejects a mismatch', body: c`CHECK(!starts_with("pointer", "paint"));` },
            { label: 'A string is a prefix of itself', body: c`CHECK(starts_with("same", "same"));` },
            { label: 'A prefix longer than the text does not match', body: c`CHECK(!starts_with("po", "pointer"));` },
            { label: 'The empty prefix always matches', body: c`CHECK(starts_with("anything", ""));
CHECK(starts_with("", ""));` },
          ],
        },
        {
          id: 'copy-cstr',
          legacy: 'strings',
          title: 'Copy into a bounded buffer',
          level: 'core',
          prompt: "Copy the whole of `src`, including its terminator, into `dst` if it fits. Return `true` on success. If it does not fit, return `false` and leave `dst` untouched. `capacity` is the number of bytes available at `dst`, and the buffers do not overlap. When `capacity` is zero, `dst` may be `NULL`.",
          signature: 'bool copy_cstr(char *dst, size_t capacity, const char *src)',
          starter: c`bool copy_cstr(char *dst, size_t capacity, const char *src) {
    // Check the space before writing anything.
    return false;
}`,
          hints: [
            "`strlen(src)` is the number of characters. The copy fits when that is strictly less than `capacity`, leaving room for the terminator.",
            "Once you know it fits, `memcpy(dst, src, length + 1)` copies the text and its terminator together.",
          ],
          solution: c`bool copy_cstr(char *dst, size_t capacity, const char *src) {
    size_t length = strlen(src);
    if (length >= capacity) {
        return false;
    }
    memcpy(dst, src, length + 1);
    return true;
}`,
          tests: [
            { label: 'Copies text that fits exactly', body: c`char dst[4] = { 'x', 'x', 'x', 'x' };
CHECK(copy_cstr(dst, sizeof dst, "cat"));
CHECK(memcmp(dst, "cat", sizeof dst) == 0);` },
            { label: 'Refuses text that is one byte too long', body: c`char dst[3] = "OK";
CHECK(!copy_cstr(dst, sizeof dst, "cat"));
CHECK(memcmp(dst, "OK", sizeof dst) == 0);` },
            { label: 'Copies only the terminator of an empty string', body: c`char dst[] = { 'x', 'y' };
CHECK(copy_cstr(dst, sizeof dst, ""));
CHECK(dst[0] == '\0' && dst[1] == 'y');` },
            { label: 'Handles a destination with no room at all', body: c`CHECK(!copy_cstr(NULL, 0, ""));` },
          ],
        },
        {
          id: 'reverse-cstr',
          title: 'Reverse a string in place',
          level: 'core',
          prompt: "Reverse the characters of `text` where they stand. The terminator stays at the end. `text` is a writable array, not a literal.",
          signature: 'void reverse_cstr(char *text)',
          starter: c`void reverse_cstr(char *text) {
    // Find the end, then swap inward from both ends.
}`,
          hints: [
            "Find the last character first: it is at `text + strlen(text) - 1`. Be careful with the empty string, where that subtraction would step before the array.",
            "Using a pointer one past the last character avoids the problem: start `end` at `text + strlen(text)` and pre-decrement it inside the loop, as in the range reversal from the last lesson.",
          ],
          solution: c`void reverse_cstr(char *text) {
    char *first = text;
    char *end = text + strlen(text);
    while (first < end && first < --end) {
        char saved = *first;
        *first = *end;
        *end = saved;
        ++first;
    }
}`,
          tests: [
            { label: 'Reverses an even-length string', body: c`char text[] = "abcd";
reverse_cstr(text);
CHECK(strcmp(text, "dcba") == 0);` },
            { label: 'Reverses an odd-length string', body: c`char text[] = "hello";
reverse_cstr(text);
CHECK(strcmp(text, "olleh") == 0);` },
            { label: 'Leaves the terminator and the bytes after it alone', body: c`char text[8] = "abc";
text[4] = 'Z';
reverse_cstr(text);
CHECK(memcmp(text, "cba\0Z", 5) == 0);` },
            { label: 'Handles one character and none', body: c`char one[] = "x";
char none[] = "";
reverse_cstr(one);
reverse_cstr(none);
CHECK(strcmp(one, "x") == 0);
CHECK(none[0] == '\0');` },
          ],
        },
        {
          id: 'copy-truncated',
          title: 'The missing terminator',
          level: 'core',
          kind: 'fix',
          prompt: [
            "`copy_truncated` should copy as much of `src` as fits and always leave `dst` holding a properly terminated string. `capacity` is at least 1. It has two bugs.",
            "The tests fill the destination with `x` first, so you can see exactly which bytes the function wrote. Open a failing test to compare.",
          ],
          signature: 'void copy_truncated(char *dst, size_t capacity, const char *src)',
          starter: c`// Copies at most capacity - 1 characters of src into dst,
// and always terminates dst.
void copy_truncated(char *dst, size_t capacity, const char *src) {
    size_t i = 0;
    while (src[i] != '\0' && i < capacity) {
        dst[i] = src[i];
        ++i;
    }
}`,
          hints: [
            "Where does the function write a terminator?",
            "When the source is long, how many characters does the loop copy, and how much room does that leave for the terminator?",
            "Stop the loop at `capacity - 1` characters, and write `dst[i] = '\\0'` after it.",
          ],
          solution: c`// Copies at most capacity - 1 characters of src into dst,
// and always terminates dst.
void copy_truncated(char *dst, size_t capacity, const char *src) {
    size_t i = 0;
    while (src[i] != '\0' && i + 1 < capacity) {
        dst[i] = src[i];
        ++i;
    }
    dst[i] = '\0';
}`,
          tests: [
            { label: 'Terminates a short copy', body: c`char dst[8];
memset(dst, 'x', sizeof dst);
copy_truncated(dst, sizeof dst, "hi");
CHECK(memcmp(dst, "hi\0xxxxx", 8) == 0);` },
            { label: 'Cuts a long source and still terminates', body: c`char dst[8];
memset(dst, 'x', sizeof dst);
copy_truncated(dst, 4, "abcdef");
CHECK(memcmp(dst, "abc\0xxxx", 8) == 0);` },
            { label: 'Copies a source that fits exactly', body: c`char dst[8];
memset(dst, 'x', sizeof dst);
copy_truncated(dst, 4, "abc");
CHECK(memcmp(dst, "abc\0xxxx", 8) == 0);` },
            { label: 'A capacity of one leaves room only for the terminator', body: c`char dst[4];
memset(dst, 'x', sizeof dst);
copy_truncated(dst, 1, "abc");
CHECK(memcmp(dst, "\0xxx", 4) == 0);` },
          ],
        },
        {
          id: 'parse-uint',
          title: 'Parse an unsigned number',
          level: 'stretch',
          prompt: [
            "Convert a string of decimal digits to an `unsigned`. On success store the value in `*out` and return `true`.",
            "Return `false`, leaving `*out` untouched, if the string is empty, contains anything other than the digits 0 to 9, or represents a number larger than `UINT_MAX`. Do not use `strtol`, `strtoul` or `atoi`, and do not use a wider type to detect the overflow.",
          ],
          forbid: ['strtol', 'strtoul', 'atoi', 'sscanf'],
          signature: 'bool parse_uint(const char *text, unsigned *out)',
          starter: c`bool parse_uint(const char *text, unsigned *out) {
    return false;
}`,
          hints: [
            "Build the value in a local variable, one digit at a time: `value = value * 10 + digit`. Store into `*out` only at the very end.",
            "Before each step, check that it will not overflow. `value * 10 + digit` exceeds `UINT_MAX` exactly when `value > (UINT_MAX - digit) / 10`.",
            "Reject the empty string up front: `if (*text == '\\0') return false;`",
          ],
          solution: c`bool parse_uint(const char *text, unsigned *out) {
    if (*text == '\0') {
        return false;
    }
    unsigned value = 0;
    for (const char *p = text; *p != '\0'; ++p) {
        if (*p < '0' || *p > '9') {
            return false;
        }
        unsigned digit = (unsigned)(*p - '0');
        if (value > (UINT_MAX - digit) / 10) {
            return false;
        }
        value = value * 10 + digit;
    }
    *out = value;
    return true;
}`,
          tests: [
            { label: 'Parses ordinary numbers', body: c`unsigned value = 0;
CHECK(parse_uint("42", &value) && value == 42);
CHECK(parse_uint("0", &value) && value == 0);
CHECK(parse_uint("007", &value) && value == 7);` },
            { label: 'Parses the largest value', body: c`unsigned value = 0;
CHECK(parse_uint("4294967295", &value));
CHECK(value == 4294967295u);` },
            { label: 'Rejects values that are too large', body: c`unsigned value = 123;
CHECK(!parse_uint("4294967296", &value));
CHECK(!parse_uint("99999999999999999999", &value));
CHECK(value == 123);` },
            { label: 'Rejects the empty string', body: c`unsigned value = 123;
CHECK(!parse_uint("", &value));
CHECK(value == 123);` },
            { label: 'Rejects anything that is not a digit', body: c`unsigned value = 123;
CHECK(!parse_uint("12a", &value));
CHECK(!parse_uint("-5", &value));
CHECK(!parse_uint(" 5", &value));
CHECK(!parse_uint("5 ", &value));
CHECK(value == 123);` },
          ],
        },
      ],
    },

    {
      id: 'pointer-to-pointer',
      title: 'Pointers to pointers',
      category: part,
      minutes: 30,
      summary: 'A pointer is an object, so it has an address of its own. Taking that address is how a function changes a caller\'s pointer, and it is what an array of strings really is.',
      topics: ['int **', 'Changing a caller\'s pointer', 'Arrays of pointers', 'argv'],
      sections: [
        {
          title: 'A pointer has an address too',
          body: [
            "Nothing new is needed for this lesson, only the nerve to apply the same rule twice. A pointer variable occupies memory, so `&` can take its address. The result is a pointer to a pointer.",
            { memory: {
              title: 'Two levels of indirection',
              vars: [
                { id: 'value', type: 'int' },
                { id: 'p', type: 'int *' },
                { id: 'pp', type: 'int **' },
              ],
              set: { value: 5, p: '&value', pp: '&p' },
            } },
            { table: {
              head: ['Expression', 'Type', 'What it is'],
              rows: [
                ['`pp`', '`int **`', 'The address of `p`'],
                ['`*pp`', '`int *`', '`p` itself, so the address of `value`'],
                ['`**pp`', '`int`', '`value` itself'],
              ],
            } },
            { run: c`#include <stdio.h>

int main(void) {
    int value = 5;
    int *p = &value;
    int **pp = &p;

    printf("%d %d %d\n", value, *p, **pp);
    **pp = 6;                    // Follow two arrows, then write.
    printf("%d\n", value);
    printf("%d\n", *pp == p);    // *pp is p itself.
    return 0;
}`, name: 'levels.c', expect: '5 5 5\n6\n1\n' },
            "Each star in the declaration is one arrow to follow. `int **pp` says that `**pp` is an `int`.",
          ],
        },
        {
          title: 'Letting a function change your pointer',
          body: [
            "The rule from the pointers lesson was: to let a function change a variable of type `T`, pass it a `T *`. That holds when `T` is itself a pointer type. To let a function change your `int *`, you pass an `int **`.",
            { trace: {
              title: 'A function re-aims its caller\'s pointer',
              code: c`int low = 1;
int high = 9;

void aim_at_larger(int **target) {
    *target = low > high ? &low : &high;
}

int main(void) {
    int *chosen = NULL;
    aim_at_larger(&chosen);
    printf("%d\n", *chosen);
    return 0;
}`,
              vars: [
                { id: 'chosen', type: 'int *', frame: 'main' },
                { id: 'target', type: 'int **', frame: 'aim_at_larger' },
                { id: 'low', type: 'int', frame: 'static' },
                { id: 'high', type: 'int', frame: 'static' },
              ],
              steps: [
                { line: [1, 2], set: { low: 1, high: 9 }, say: "Two variables with static storage. They exist before `main` starts and for the whole run." },
                { line: 9, set: { chosen: 'NULL' }, say: "`main` has a pointer that points at nothing yet." },
                { line: 10, set: { target: '&chosen' }, say: "The argument is `&chosen`: the address of the pointer variable, not the address it holds. So the parameter `target` is a pointer to a pointer." },
                { line: 5, set: { chosen: '&high' }, say: "`*target` is `chosen` itself. Assigning to it stores an address in `main`'s pointer." },
                { line: 6, hide: ['frame:aim_at_larger'], say: "The function returns. `chosen` now points at `high`, which has static storage and so is still alive." },
                { line: 11, say: "`*chosen` reads `high`, and the program prints 9." },
              ],
            } },
            "You met this from the caller's side one lesson ago. `strtol(input, &end, 10)` takes a `char **` so that it can set your `char *` to the place where it stopped reading.",
          ],
        },
        {
          title: 'A cursor that functions advance',
          body: [
            "The same idea drives most hand-written parsers. A position in the input is a `const char *`. Each parsing function takes the address of that position, consumes some characters, and moves the position forward for whoever runs next.",
            { run: c`#include <stdio.h>

// Finds the next word at or after *cursor. Sets *word to its first character,
// leaves *cursor just past its last, and returns its length.
size_t next_word(const char **cursor, const char **word) {
    const char *p = *cursor;              // Work on a local copy of the position.
    while (*p == ' ') {
        ++p;
    }
    *word = p;
    while (*p != '\0' && *p != ' ') {
        ++p;
    }
    *cursor = p;                          // Report how far we got.
    return (size_t)(p - *word);
}

int main(void) {
    const char *position = "alpha  beta gamma";
    const char *word = NULL;
    size_t length = 0;

    while ((length = next_word(&position, &word)) > 0) {
        printf("%.*s (%zu)\n", (int)length, word, length);
    }
    return 0;
}`, name: 'cursor.c', expect: 'alpha (5)\nbeta (4)\ngamma (5)\n' },
            { list: [
              "Nothing is copied. Each word is reported as a pointer into the original text plus a length.",
              "Those words have no terminator of their own, so `%s` cannot print them. `%.*s` takes a maximum number of characters as an extra `int` argument, which makes it the way to print a slice.",
              "Inside the function, reading `*cursor` into a local, working with that, and writing it back once keeps the stars under control.",
            ] },
          ],
        },
        {
          title: 'Arrays of pointers',
          body: [
            "The most common pointer to a pointer comes from an array whose elements are pointers. A list of strings is the standard example.",
            { memory: {
              title: '`const char *names[] = { "Ada", "Grace", "Linus" };`',
              vars: [
                { id: 'names', type: 'const char *', len: 3, frame: 'main' },
                { id: 'ada', name: 'literal', type: 'char[4]', frame: 'static' },
                { id: 'grace', name: 'literal', type: 'char[6]', frame: 'static' },
                { id: 'linus', name: 'literal', type: 'char[6]', frame: 'static' },
              ],
              set: { names: ['&ada', '&grace', '&linus'], ada: '"Ada"', grace: '"Grace"', linus: '"Linus"' },
              caption: "The array holds three addresses and no characters. The characters are in three separate literals elsewhere.",
            } },
            { run: c`#include <stdio.h>

int main(void) {
    const char *names[] = { "Ada", "Grace", "Linus" };
    size_t count = sizeof names / sizeof names[0];

    for (size_t i = 0; i < count; ++i) {
        printf("%s starts with %c\n", names[i], names[i][0]);
    }

    const char *saved = names[0];     // Reorder by moving pointers, not characters.
    names[0] = names[2];
    names[2] = saved;
    printf("%s %s %s\n", names[0], names[1], names[2]);
    return 0;
}`, name: 'names.c', expect: 'Ada starts with A\nGrace starts with G\nLinus starts with L\nLinus Grace Ada\n' },
            "`names[i][0]` applies two subscripts to two different things. `names[i]` picks a pointer out of the array, and `[0]` then follows that pointer to a character. Sorting such a list only ever moves the pointers.",
            "There is another way to store three strings, a two-dimensional array of `char`, and it is a different object entirely:",
            { table: {
              head: ['', '`const char *names[3]`', '`char names[3][6]`'],
              rows: [
                ['What is stored', 'Three pointers', 'Eighteen characters'],
                ['Where the text lives', 'Elsewhere', 'Inside the array itself'],
                ['String lengths', 'Each can be any length', 'Each at most 5, plus a terminator'],
                ['`sizeof`', 'Three times the size of a pointer', '18'],
              ],
            } },
          ],
        },
        {
          title: 'Decay goes one level only',
          body: [
            "An array decays to a pointer to its first element, whatever the element type is. That single rule gives two different results for the two layouts above.",
            { code: c`void print_all(const char **items, size_t count);

const char *names[3] = { "Ada", "Grace", "Linus" };
char grid[3][6] = { "Ada", "Grace", "Linus" };

print_all(names, 3);      // Fine: the elements are pointers, so names decays to const char **.
print_all(grid, 3);       // Wrong: the elements are arrays, so grid decays to char (*)[6].` },
            "A `char **` must point at a `char *` object sitting in memory. A two-dimensional array contains no pointer objects at all, only characters, so there is nothing for a `char **` to point at. The compiler warns about the second call. If you ignore the warning, the function interprets the letters `Ada` as if they were an address.",
          ],
        },
        {
          title: 'The arguments of main',
          body: [
            "The other form of `main` receives the command line. `argv` is an array of pointers to strings, which decays in the usual way, so its type is `char **`.",
            { run: c`#include <stdio.h>

int main(int argc, char *argv[]) {       // The same as: char **argv
    for (int i = 0; i < argc; ++i) {
        printf("argv[%d] = %s\n", i, argv[i]);
    }
    return 0;
}`, name: 'args.c', sizes: true, expect: 'argv[0] = lesson.wasm\n' },
            { list: [
              "`argc` is the number of arguments, and `argv[0]` is the name the program was run under.",
              "`argv[argc]` is guaranteed to be `NULL`, so the array can also be walked until a null pointer is found.",
              "`argv[1][0]` is the first character of the first real argument.",
            ] },
            { native: [
              "This page runs programs with no arguments. Built on your Mac, the same program gives:",
              { text: '$ ./args one "two words" 3\nargv[0] = ./args\nargv[1] = one\nargv[2] = two words\nargv[3] = 3' },
              "Every argument arrives as a string. Converting `\"3\"` to a number is your job, with `strtol`.",
            ] },
          ],
        },
      ],
      takeaways: [
        "`&p` is the address of a pointer. Each extra star is one more arrow to follow.",
        "To let a function change your `T *`, pass a `T **`.",
        "An array of strings is an array of pointers. It decays to `char **`.",
        "A two-dimensional `char` array is not a `char **`. It contains no pointers.",
      ],
      quiz: [
        {
          q: 'Given these declarations, what is `*pp`?',
          code: c`int n = 4;
int *p = &n;
int **pp = &p;`,
          options: [
            { t: 'The value 4', why: "That takes two dereferences: `**pp`." },
            { t: 'The pointer `p`, which holds the address of `n`', ok: true, why: "`pp` points at `p`, so one dereference gives `p` itself." },
            { t: 'The address of `p`', why: "That is `pp` with no star at all." },
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
    int **pp = &p;
    *pp = &b;
    **pp = 20;
    printf("%d %d %d\n", a, b, *p);
    return 0;
}`,
          answer: '1 20 20',
          explain: "`*pp = &b` re-aims `p` at `b`. Then `**pp = 20` follows `pp` to `p` and `p` to `b`. `a` is never written.",
          hint: "`*pp` is another name for `p`. Rewrite the two middle lines using `p` and see what they do.",
        },
        {
          q: 'Which version of `clear` sets the caller\'s pointer to `NULL`?',
          options: [
            { t: '`void clear(int *p) { p = NULL; }` called as `clear(q)`', why: "This changes the function's own copy of the pointer. The caller's `q` keeps its value." },
            { t: '`void clear(int **p) { *p = NULL; }` called as `clear(&q)`', ok: true, why: "The function receives the address of `q` and writes `NULL` through it." },
            { t: '`void clear(int *p) { *p = NULL; }` called as `clear(q)`', why: "This writes into the `int` that `q` points to, and assigning a pointer to an `int` earns a warning." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int main(void) {
    const char *words[] = { "red", "green", "blue" };
    const char **w = words;
    ++w;
    printf("%c%c\n", **w, *(*w + 2));
    return 0;
}`,
          answer: 'ge',
          explain: "`++w` moves to the second pointer in the array. `*w` is the string `green`, so `**w` is `g` and `*(*w + 2)` is its third character, `e`.",
          hint: "`w` steps through the array of pointers. `*w` is one of the strings.",
        },
        {
          q: 'Which statement about these two declarations is true?',
          code: c`char *a[3];
char b[3][8];`,
          options: [
            { t: 'Both reserve 24 bytes for characters', why: "`a` reserves no bytes for characters at all, only room for three pointers." },
            { t: '`a` holds three pointers and no characters. `b` holds 24 characters and no pointers', ok: true, why: "`a[i]` is a pointer that must be aimed at a string stored somewhere else. `b[i]` is an array of eight chars inside `b`." },
            { t: 'They are interchangeable as function arguments', why: "`a` decays to `char **` and `b` decays to `char (*)[8]`. Those are different types with different layouts." },
          ],
        },
        {
          q: 'In `int main(int argc, char *argv[])`, what is the type of `argv[1][0]`?',
          options: [
            { t: '`char **`', why: "That is the type of `argv` itself." },
            { t: '`char *`', why: "That is `argv[1]`: one argument, as a string." },
            { t: '`char`', ok: true, why: "`argv[1]` is a string, and `[0]` is its first character." },
          ],
        },
        {
          q: 'Why can `char grid[3][6]` not be passed to `void show(char **rows)`?',
          options: [
            { t: 'It can. Both describe three strings', why: "They describe the same information with incompatible memory layouts." },
            { t: '`grid` decays to a pointer to an array of 6 chars. There are no `char *` objects in it for `rows` to point at', ok: true, why: "`rows[0]` would read the first bytes of the text and treat them as an address." },
            { t: 'Because `grid` is not `const`', why: "Qualifiers are not the issue. The element types differ: arrays in one, pointers in the other." },
          ],
        },
      ],
      challenges: [
        {
          id: 'swap-strings',
          title: 'Swap two strings',
          level: 'warm-up',
          prompt: "The caller has two `const char *` variables. Exchange them, so that each ends up pointing at the other's text. No characters move.",
          signature: 'void swap_strings(const char **a, const char **b)',
          starter: c`void swap_strings(const char **a, const char **b) {
    // Exchange the two pointers.
}`,
          hints: [
            "This is `swap_ints` with a different element type. The thing being swapped is a `const char *`.",
            "The temporary variable is therefore a `const char *`, and it receives `*a`.",
          ],
          solution: c`void swap_strings(const char **a, const char **b) {
    const char *saved = *a;
    *a = *b;
    *b = saved;
}`,
          tests: [
            { label: 'Exchanges the two pointers', body: c`const char *first = "left";
const char *second = "right";
swap_strings(&first, &second);
CHECK(strcmp(first, "right") == 0);
CHECK(strcmp(second, "left") == 0);` },
            { label: 'Moves pointers, not characters', body: c`const char *one = "one";
const char *two = "two";
const char *first = one;
const char *second = two;
swap_strings(&first, &second);
CHECK(first == two && second == one);` },
            { label: 'Works on elements of an array', body: c`const char *items[] = { "a", "b", "c" };
swap_strings(&items[0], &items[2]);
CHECK(strcmp(items[0], "c") == 0 && strcmp(items[2], "a") == 0);` },
          ],
        },
        {
          id: 'skip-spaces',
          title: 'Advance a cursor',
          level: 'core',
          prompt: "`*cursor` is a position in a string. Move it forward past any spaces and tabs, so that it ends up at the first character that is neither, or at the terminator. If it is not at a space or tab to begin with, leave it where it is.",
          signature: 'void skip_spaces(const char **cursor)',
          starter: c`void skip_spaces(const char **cursor) {
    // Move *cursor forward.
}`,
          hints: [
            "`**cursor` is the character at the current position. `++*cursor`, or `(*cursor)++`, moves the caller's pointer forward by one.",
            "It is easier to copy `*cursor` into a local `const char *p`, advance `p`, and store it back at the end.",
            "The loop must stop at the terminator. Testing for space and tab does that already, since `'\\0'` is neither.",
          ],
          solution: c`void skip_spaces(const char **cursor) {
    const char *p = *cursor;
    while (*p == ' ' || *p == '\t') {
        ++p;
    }
    *cursor = p;
}`,
          tests: [
            { label: 'Skips leading spaces', body: c`const char *text = "   word";
const char *cursor = text;
skip_spaces(&cursor);
CHECK(cursor == text + 3);
CHECK(*cursor == 'w');` },
            { label: 'Skips tabs as well', body: c`const char *text = " \t x";
const char *cursor = text;
skip_spaces(&cursor);
CHECK(cursor == text + 3);` },
            { label: 'Stays put when there is nothing to skip', body: c`const char *text = "word";
const char *cursor = text;
skip_spaces(&cursor);
CHECK(cursor == text);` },
            { label: 'Stops at the terminator', body: c`const char *text = "ab   ";
const char *cursor = text + 2;
skip_spaces(&cursor);
CHECK(cursor == text + 5);
CHECK(*cursor == '\0');` },
          ],
        },
        {
          id: 'split-key-value',
          title: 'Split at the equals sign',
          level: 'core',
          prompt: [
            "A configuration line looks like `name=Ada`. Find the first `=` in `line`. If there is one, set `*equals` to point at it, set `*value` to point at the character after it, and return `true`.",
            "If the line has no `=`, return `false` and leave both outputs untouched. Both outputs are pointers into `line`. Nothing is copied.",
          ],
          signature: 'bool split_key_value(const char *line, const char **equals, const char **value)',
          starter: c`bool split_key_value(const char *line, const char **equals, const char **value) {
    return false;
}`,
          hints: [
            "`strchr(line, '=')` returns a pointer to the first `=`, or `NULL`.",
            "On success, store that pointer through `equals`, and that pointer plus one through `value`.",
          ],
          solution: c`bool split_key_value(const char *line, const char **equals, const char **value) {
    const char *found = strchr(line, '=');
    if (found == NULL) {
        return false;
    }
    *equals = found;
    *value = found + 1;
    return true;
}`,
          tests: [
            { label: 'Splits a simple pair', body: c`const char *line = "name=Ada";
const char *equals = NULL;
const char *value = NULL;
CHECK(split_key_value(line, &equals, &value));
CHECK(equals == line + 4);
CHECK(value != NULL && strcmp(value, "Ada") == 0);` },
            { label: 'Uses the first equals sign', body: c`const char *line = "a=b=c";
const char *equals = NULL;
const char *value = NULL;
CHECK(split_key_value(line, &equals, &value));
CHECK(equals == line + 1);
CHECK(value != NULL && strcmp(value, "b=c") == 0);` },
            { label: 'Allows an empty key or an empty value', body: c`const char *line = "=";
const char *equals = NULL;
const char *value = NULL;
CHECK(split_key_value(line, &equals, &value));
CHECK(equals == line);
CHECK(value == line + 1 && *value == '\0');` },
            { label: 'Reports a line with no equals sign and writes nothing', body: c`const char *marker = "unchanged";
const char *equals = marker;
const char *value = marker;
CHECK(!split_key_value("no separator here", &equals, &value));
CHECK(equals == marker && value == marker);` },
          ],
        },
        {
          id: 'longest',
          title: 'Find the longest string',
          level: 'core',
          prompt: "`words` points at the first of `count` string pointers. Return the longest of those strings, or the earliest one if several share the greatest length. Return `NULL` when `count` is zero.",
          signature: 'const char *longest(const char **words, size_t count)',
          starter: c`const char *longest(const char **words, size_t count) {
    return NULL;
}`,
          hints: [
            "`words[i]` is one string, a `const char *`. `strlen(words[i])` is its length.",
            "Keep the best string and its length as you go. Replace them only when a later string is strictly longer, so that ties go to the earliest.",
          ],
          solution: c`const char *longest(const char **words, size_t count) {
    const char *best = NULL;
    size_t best_length = 0;
    for (size_t i = 0; i < count; ++i) {
        size_t length = strlen(words[i]);
        if (best == NULL || length > best_length) {
            best = words[i];
            best_length = length;
        }
    }
    return best;
}`,
          tests: [
            { label: 'Finds the longest string', body: c`const char *words[] = { "fig", "banana", "kiwi" };
CHECK(longest(words, 3) == words[1]);` },
            { label: 'Prefers the earliest on a tie', body: c`const char *words[] = { "pear", "plum", "fig" };
CHECK(longest(words, 3) == words[0]);` },
            { label: 'Looks only at the first count strings', body: c`const char *words[] = { "a", "bb", "cccccc" };
CHECK(longest(words, 2) == words[1]);` },
            { label: 'Handles empty strings and an empty list', body: c`const char *words[] = { "", "" };
CHECK(longest(words, 2) == words[0]);
CHECK(longest(words, 0) == NULL);` },
          ],
        },
        {
          id: 'sort-strings',
          title: 'Sort a list of strings',
          level: 'stretch',
          prompt: [
            "Sort the `count` string pointers starting at `items` into ascending order, as `strcmp` orders them. Rearrange the pointers. Do not touch the characters.",
            "Write the sort yourself. Insertion sort is short: take each element in turn and move it leftward past every larger element before it.",
          ],
          forbid: ['qsort'],
          signature: 'void sort_strings(const char **items, size_t count)',
          starter: c`void sort_strings(const char **items, size_t count) {
    // Insertion sort, comparing with strcmp.
}`,
          hints: [
            "For `i` from 1 to `count - 1`: save `items[i]` in a local `const char *`, then shift each earlier element that compares greater one place to the right.",
            "`strcmp(items[j - 1], current) > 0` means the earlier element belongs after the current one.",
            "Use an inner index `j` that starts at `i` and decreases while `j > 0`. Because the test is `j > 0`, the unsigned index never goes below zero.",
          ],
          solution: c`void sort_strings(const char **items, size_t count) {
    for (size_t i = 1; i < count; ++i) {
        const char *current = items[i];
        size_t j = i;
        while (j > 0 && strcmp(items[j - 1], current) > 0) {
            items[j] = items[j - 1];
            --j;
        }
        items[j] = current;
    }
}`,
          tests: [
            { label: 'Sorts into ascending order', body: c`const char *items[] = { "pear", "apple", "fig", "banana" };
sort_strings(items, 4);
CHECK(strcmp(items[0], "apple") == 0);
CHECK(strcmp(items[1], "banana") == 0);
CHECK(strcmp(items[2], "fig") == 0);
CHECK(strcmp(items[3], "pear") == 0);` },
            { label: 'Keeps every original pointer', body: c`const char *a = "b";
const char *b = "a";
const char *items[] = { a, b };
sort_strings(items, 2);
CHECK(items[0] == b && items[1] == a);` },
            { label: 'Orders a prefix before the longer string', body: c`const char *items[] = { "carton", "car", "cart" };
sort_strings(items, 3);
CHECK(strcmp(items[0], "car") == 0 && strcmp(items[1], "cart") == 0 && strcmp(items[2], "carton") == 0);` },
            { label: 'Handles one item and none', body: c`const char *items[] = { "solo" };
sort_strings(items, 1);
sort_strings(items, 0);
CHECK(strcmp(items[0], "solo") == 0);` },
          ],
        },
      ],
    },

    {
      id: 'void-and-bytes',
      title: 'void *, bytes & casts',
      category: part,
      minutes: 28,
      summary: 'Underneath its type, every object is a run of bytes. This lesson covers the tools for working at that level, and the rules about what you may do there.',
      topics: ['void *', 'unsigned char', 'memcpy', 'Generic code', 'Strict aliasing'],
      sections: [
        {
          title: 'void *: an address without a type',
          body: [
            "A `void *` holds the address of an object without saying what kind of object it is. Any object pointer converts to `void *` and back without a cast. Functions that handle memory without caring what is in it are written in terms of `void *`: `malloc` returns one, and `memcpy` takes two.",
            { run: c`#include <stdio.h>

int main(void) {
    int count = 42;
    double ratio = 0.5;

    void *anything = &count;          // Any object pointer converts to void *.
    int *back = anything;             // And back again. No cast is needed in C.
    printf("%d\n", *back);

    anything = &ratio;                // The same variable can hold a double's address.
    printf("%.1f\n", *(double *)anything);   // Cast, then dereference.
    return 0;
}`, name: 'void.c', expect: '42\n0.5\n' },
            "Because a `void *` says nothing about its target, there are two things you cannot do with one. You cannot dereference it, since the compiler would not know how many bytes to read. And you cannot do arithmetic on it, since there is no element size to step by. Convert it to a typed pointer first.",
            { pitfall: "Nothing checks that you convert back to the right type. If `anything` holds the address of a `double` and you read it through an `int *`, you get garbage, and the behavior is undefined. A `void *` carries no tag saying what it really points to." },
            { compare: "A `void *` is roughly `unknown` in TypeScript: a value you must narrow before using. The difference is that C offers no `typeof` or `instanceof` to narrow with. You have to know, from the program's design, what is behind the pointer." },
          ],
        },
        {
          title: 'Every object is a sequence of bytes',
          body: [
            "You can look at the bytes of any object by converting its address to `unsigned char *`. This is explicitly permitted, and it is the one kind of reinterpretation that is always safe.",
            { run: c`#include <stdint.h>
#include <stdio.h>

int main(void) {
    uint32_t value = 0x11223344;
    const unsigned char *bytes = (const unsigned char *)&value;

    for (size_t i = 0; i < sizeof value; ++i) {
        printf("byte %zu: %02x\n", i, bytes[i]);
    }
    return 0;
}`, name: 'bytes.c', expect: 'byte 0: 44\nbyte 1: 33\nbyte 2: 22\nbyte 3: 11\n' },
            { strip: {
              title: 'The four bytes of `0x11223344`',
              cells: ['44', '33', '22', '11'],
              address: { base: 0x1000, step: 1 },
              caption: "The least significant byte is stored first. This order is called little-endian, and it is what your Mac and this page both use.",
            } },
            "Byte order is invisible until bytes leave the program. Network protocols and many file formats store the most significant byte first, which is called big-endian. Code that writes a raw `int` into a file or a socket has made a choice about byte order whether it meant to or not. Portable code assembles and splits values with shifts.",
          ],
        },
        {
          title: 'The memory functions',
          body: [
            "`<string.h>` also has functions that work on raw bytes. Unlike the `str` functions, they are told a length and pay no attention to zero bytes.",
            { table: {
              head: ['Function', 'What it does'],
              rows: [
                ['`memcpy(dst, src, n)`', 'Copies `n` bytes. The two regions must not overlap.'],
                ['`memmove(dst, src, n)`', 'Copies `n` bytes correctly even when the regions overlap.'],
                ['`memset(dst, byte, n)`', 'Sets `n` bytes to one byte value.'],
                ['`memcmp(a, b, n)`', 'Compares `n` bytes. Returns negative, zero or positive, like `strcmp`.'],
              ],
            } },
            { run: c`#include <stdio.h>
#include <string.h>

int main(void) {
    int source[4] = { 1, 2, 3, 4 };
    int copy[4];

    memcpy(copy, source, sizeof source);           // 16 bytes, not 4.
    printf("%d\n", memcmp(copy, source, sizeof source) == 0);

    memmove(source + 1, source, 3 * sizeof source[0]);   // Overlapping: shift right by one.
    printf("%d %d %d %d\n", source[0], source[1], source[2], source[3]);

    memset(copy, 0, sizeof copy);                  // Every byte zero, so every int is 0.
    printf("%d %d\n", copy[0], copy[3]);
    return 0;
}`, name: 'memory.c', expect: '1\n1 1 2 3\n0 0\n' },
            { pitfall: "The count is always in bytes. The usual mistake is to pass a number of elements. The other trap is `memset` with a value other than zero: `memset(numbers, 1, sizeof numbers)` sets each byte to 1, which makes each four-byte `int` equal to `0x01010101`, or 16843009." },
          ],
        },
        {
          title: 'Generic code: void * plus a size',
          body: [
            "C has no generics. A function that must work for any element type takes the array as a `void *` along with the size of one element, and does the address arithmetic itself, in bytes.",
            { run: c`#include <stdio.h>
#include <string.h>

// Sets every element of an array of any type to the same value.
void fill(void *array, size_t count, size_t size, const void *value) {
    unsigned char *bytes = array;                // A byte pointer can be stepped.
    for (size_t i = 0; i < count; ++i) {
        memcpy(bytes + i * size, value, size);   // Element i starts i * size bytes in.
    }
}

int main(void) {
    int numbers[3];
    double ratios[2];
    int seven = 7;
    double half = 0.5;

    fill(numbers, 3, sizeof numbers[0], &seven);
    fill(ratios, 2, sizeof ratios[0], &half);
    printf("%d %d %d\n", numbers[0], numbers[1], numbers[2]);
    printf("%.1f %.1f\n", ratios[0], ratios[1]);
    return 0;
}`, name: 'generic.c', expect: '7 7 7\n0.5 0.5\n' },
            "`bytes + i * size` is what `array[i]` does for you when the compiler knows the element type. With a `void *` you write it out. The standard library's `qsort` and `bsearch` are built the same way, and the next lesson uses them.",
          ],
        },
        {
          title: 'Pointer casts and the aliasing rule',
          body: [
            "A cast will convert one pointer type to another, and the compiler will not object. Using the result is another matter. Reading or writing an object through a pointer to a different type is undefined behavior. This is the **strict aliasing** rule, and the compiler relies on it when optimizing: it assumes that an `int *` and a `float *` never refer to the same memory.",
            "The character types are the exception, which is why the byte view above is legal. To reinterpret the bytes of one type as another, copy them with `memcpy`. Compilers recognize the pattern and generate a plain move.",
            { run: c`#include <stdint.h>
#include <stdio.h>
#include <string.h>

int main(void) {
    float one = 1.0f;
    uint32_t bits;

    // uint32_t wrong = *(uint32_t *)&one;   // Undefined: a float read through a uint32_t pointer.
    memcpy(&bits, &one, sizeof bits);        // Defined: copies the four bytes.
    printf("1.0f is stored as 0x%08x\n", (unsigned)bits);
    return 0;
}`, name: 'aliasing.c', expect: '1.0f is stored as 0x3f800000\n' },
            "Alignment is a second hazard. A `char` buffer may start at any address, but an `int` generally has to start at a multiple of four. Casting a pointer into the middle of a byte buffer to `int *` and dereferencing it can fault on some machines. `memcpy` avoids that as well.",
          ],
        },
        {
          title: 'Pointers are not integers',
          body: [
            "An address prints like a number, but a pointer and an integer are different types, and converting between them is rarely needed. When it is, for instance to check alignment or to hash an address, use `uintptr_t` from `<stdint.h>`, an unsigned integer type wide enough to hold a pointer.",
            { code: c`uintptr_t address = (uintptr_t)pointer;
bool aligned = address % 8 == 0;` },
            "Never store a pointer in an `int` or a `long`. On your Mac a pointer is 8 bytes and an `int` is 4, so half the address would be lost.",
          ],
        },
      ],
      takeaways: [
        "`void *` holds any object address. It must be converted to a typed pointer before use, and nothing checks the conversion.",
        "Any object may be examined as `unsigned char` bytes.",
        "`memcpy`, `memmove`, `memset` and `memcmp` count bytes. Use `memmove` when regions overlap.",
        "Generic C code takes a `void *` and an element size, and computes `base + i * size` in bytes.",
        "Do not read an object through a pointer to a different type. Use `memcpy` to reinterpret bytes.",
      ],
      quiz: [
        {
          kind: 'multi',
          q: 'Given `int x = 7;` and `void *p = &x;`, which of these lines are valid standard C?',
          options: [
            { t: '`int *q = p;`', ok: true, why: "`void *` converts to any object pointer type without a cast in C." },
            { t: '`*p = 5;`', why: "A `void *` cannot be dereferenced. The compiler does not know the target type." },
            { t: '`p = p + 1;`', why: "Arithmetic needs an element size, and `void` has none. Some compilers allow it as an extension." },
            { t: '`int n = *(int *)p;`', ok: true, why: "Cast to the real type, then dereference." },
            { t: '`printf("%p\\n", p);`', ok: true, why: "`%p` expects exactly a `void *`." },
          ],
          hint: "Three are valid. The other two need to know the size of what `p` points to.",
        },
        {
          kind: 'predict',
          q: 'What does this program print? It runs on a little-endian machine.',
          code: c`#include <stdint.h>
#include <stdio.h>

int main(void) {
    uint16_t value = 0x0102;
    const unsigned char *bytes = (const unsigned char *)&value;
    printf("%d %d\n", bytes[0], bytes[1]);
    return 0;
}`,
          answer: '2 1',
          explain: "Little-endian stores the least significant byte, `0x02`, at the lowest address.",
        },
        {
          q: 'You need to shift the contents of an array one element to the right within the same array. Which function is correct?',
          options: [
            { t: '`memcpy`', why: "The source and destination overlap, and `memcpy` requires that they do not." },
            { t: '`memmove`', ok: true, why: "`memmove` gives the right result for overlapping regions, as if the bytes went through a temporary buffer." },
            { t: '`memset`', why: "`memset` fills a region with one byte value. It does not copy." },
          ],
        },
        {
          q: 'After `int a[4]; memset(a, 1, sizeof a);`, what is `a[0]`?',
          options: [
            { t: '1', why: "`memset` sets each byte to 1, not each `int`." },
            { t: '16843009', ok: true, why: "Each of the four bytes of the `int` is `0x01`, giving `0x01010101`. Use a loop to set elements to a value other than zero." },
            { t: '4', why: "The byte value is 1. The number 4 is only how many bytes each `int` has." },
          ],
        },
        {
          q: 'Which is the correct way to see the bit pattern of a `float f` as a `uint32_t`?',
          options: [
            { t: '`uint32_t bits = (uint32_t)f;`', why: "This converts the value: 1.0f becomes the integer 1. It does not expose the bits." },
            { t: '`uint32_t bits = *(uint32_t *)&f;`', why: "This reads a `float` object through a `uint32_t` pointer, which violates the aliasing rule." },
            { t: '`uint32_t bits; memcpy(&bits, &f, sizeof bits);`', ok: true, why: "Copying the bytes is well defined, and compilers turn it into a single move." },
          ],
        },
        {
          q: 'A generic function receives `void *base`, the element size `size`, and an index `i`. Which expression is the address of element `i`?',
          options: [
            { t: '`base + i`', why: "Arithmetic on `void *` is not standard C, and where it is allowed it moves by single bytes." },
            { t: '`(char *)base + i * size`', ok: true, why: "Convert to a byte pointer, then move `i` elements of `size` bytes each." },
            { t: '`(char *)base + i`', why: "This moves `i` bytes, not `i` elements." },
            { t: '`&base[i]`', why: "A `void *` cannot be subscripted." },
          ],
        },
      ],
      challenges: [
        {
          id: 'bytes-equal',
          title: 'Compare two regions',
          level: 'warm-up',
          forbid: ['memcmp'],
          prompt: "Return `true` if the `n` bytes at `a` are the same as the `n` bytes at `b`. Write the loop yourself: `memcmp` is not allowed here. Two regions of zero bytes are equal.",
          signature: 'bool bytes_equal(const void *a, const void *b, size_t n)',
          starter: c`bool bytes_equal(const void *a, const void *b, size_t n) {
    return false;
}`,
          hints: [
            "A `void *` cannot be indexed. Start by converting each parameter: `const unsigned char *left = a;`",
            "Return `false` at the first difference, and `true` if the loop finishes.",
          ],
          solution: c`bool bytes_equal(const void *a, const void *b, size_t n) {
    const unsigned char *left = a;
    const unsigned char *right = b;
    for (size_t i = 0; i < n; ++i) {
        if (left[i] != right[i]) {
            return false;
        }
    }
    return true;
}`,
          tests: [
            { label: 'Equal arrays of ints', body: c`int a[] = { 1, 2, 3 };
int b[] = { 1, 2, 3 };
CHECK(bytes_equal(a, b, sizeof a));` },
            { label: 'A difference in the last byte', body: c`char a[] = "abcd";
char b[] = "abcx";
CHECK(!bytes_equal(a, b, 4));
CHECK(bytes_equal(a, b, 3));` },
            { label: 'Does not stop at zero bytes', body: c`char a[] = { 1, 0, 2 };
char b[] = { 1, 0, 3 };
CHECK(!bytes_equal(a, b, 3));` },
            { label: 'Zero bytes are always equal', body: c`int a = 1;
int b = 2;
CHECK(bytes_equal(&a, &b, 0));` },
          ],
        },
        {
          id: 'swap-any',
          title: 'Swap anything',
          level: 'core',
          prompt: "Exchange the contents of two objects of any type, given their addresses and their size in bytes. The two objects do not overlap. Swap one byte at a time, so that no temporary buffer of unknown size is needed.",
          signature: 'void swap_any(void *a, void *b, size_t size)',
          starter: c`void swap_any(void *a, void *b, size_t size) {
    // Exchange the two objects byte by byte.
}`,
          hints: [
            "Convert both parameters to `unsigned char *`.",
            "Then it is the familiar three-line swap, inside a loop over `size` bytes.",
          ],
          solution: c`void swap_any(void *a, void *b, size_t size) {
    unsigned char *left = a;
    unsigned char *right = b;
    for (size_t i = 0; i < size; ++i) {
        unsigned char saved = left[i];
        left[i] = right[i];
        right[i] = saved;
    }
}`,
          tests: [
            { label: 'Swaps two ints', body: c`int a = 3;
int b = -9;
swap_any(&a, &b, sizeof a);
CHECK(a == -9 && b == 3);` },
            { label: 'Swaps two doubles', body: c`double a = 1.5;
double b = -2.25;
swap_any(&a, &b, sizeof a);
CHECK(a == -2.25 && b == 1.5);` },
            { label: 'Swaps two structs', body: c`struct Pair { char tag; int value; };
struct Pair a = { 'a', 1 };
struct Pair b = { 'b', 2 };
swap_any(&a, &b, sizeof a);
CHECK(a.tag == 'b' && a.value == 2 && b.tag == 'a' && b.value == 1);` },
            { label: 'Swaps two elements of an array', body: c`short values[] = { 10, 20, 30 };
swap_any(&values[0], &values[2], sizeof values[0]);
CHECK(values[0] == 30 && values[1] == 20 && values[2] == 10);` },
          ],
        },
        {
          id: 'read-u32-be',
          title: 'Read a big-endian integer',
          level: 'core',
          prompt: "A network packet stores a 32-bit number as four bytes with the most significant byte first. Assemble those four bytes into a `uint32_t`. Use shifts, so that the answer is the same whatever the byte order of the machine running the code.",
          signature: 'uint32_t read_u32_be(const unsigned char *bytes)',
          starter: c`uint32_t read_u32_be(const unsigned char *bytes) {
    return 0;
}`,
          hints: [
            "`bytes[0]` is the most significant byte, so it is shifted left by 24. `bytes[3]` is not shifted at all.",
            "Convert each byte to `uint32_t` before shifting. A bare `bytes[0] << 24` is computed as a signed `int` and can overflow into the sign bit.",
          ],
          solution: c`uint32_t read_u32_be(const unsigned char *bytes) {
    return ((uint32_t)bytes[0] << 24)
         | ((uint32_t)bytes[1] << 16)
         | ((uint32_t)bytes[2] << 8)
         | (uint32_t)bytes[3];
}`,
          tests: [
            { label: 'Assembles four different bytes', body: c`const unsigned char bytes[] = { 0x11, 0x22, 0x33, 0x44 };
CHECK(read_u32_be(bytes) == 0x11223344u);` },
            { label: 'Reads a small number', body: c`const unsigned char bytes[] = { 0x00, 0x00, 0x01, 0x00 };
CHECK(read_u32_be(bytes) == 256u);` },
            { label: 'Handles a set top bit', body: c`const unsigned char bytes[] = { 0xFF, 0x00, 0x00, 0x01 };
CHECK(read_u32_be(bytes) == 0xFF000001u);` },
            { label: 'Reads from the middle of a buffer', body: c`const unsigned char packet[] = { 0xAA, 0xDE, 0xAD, 0xBE, 0xEF, 0xBB };
CHECK(read_u32_be(packet + 1) == 0xDEADBEEFu);` },
          ],
        },
        {
          id: 'find-element',
          title: 'Search an array of anything',
          level: 'core',
          prompt: [
            "`base` points at an array of `count` elements, each `size` bytes. `key` points at one value of the same type. Return a pointer to the first element whose bytes equal the key's, or `NULL` if there is none.",
            "This is a generic linear search. It never learns the element type.",
          ],
          signature: 'void *find_element(void *base, size_t count, size_t size, const void *key)',
          starter: c`void *find_element(void *base, size_t count, size_t size, const void *key) {
    return NULL;
}`,
          hints: [
            "Element `i` starts at `(unsigned char *)base + i * size`.",
            "`memcmp(element, key, size) == 0` tests whether one element matches.",
          ],
          solution: c`void *find_element(void *base, size_t count, size_t size, const void *key) {
    unsigned char *bytes = base;
    for (size_t i = 0; i < count; ++i) {
        unsigned char *element = bytes + i * size;
        if (memcmp(element, key, size) == 0) {
            return element;
        }
    }
    return NULL;
}`,
          tests: [
            { label: 'Finds an int', body: c`int values[] = { 5, 8, 13, 21 };
int key = 13;
CHECK(find_element(values, 4, sizeof values[0], &key) == &values[2]);` },
            { label: 'Returns the first match', body: c`short values[] = { 7, 9, 9, 9 };
short key = 9;
CHECK(find_element(values, 4, sizeof values[0], &key) == &values[1]);` },
            { label: 'Works for elements of 8 bytes', body: c`uint64_t values[] = { 1, 0x100000000ULL, 2 };
uint64_t key = 0x100000000ULL;
CHECK(find_element(values, 3, sizeof values[0], &key) == &values[1]);` },
            { label: 'Reports a missing key, and an empty array', body: c`int values[] = { 1, 2, 3 };
int key = 4;
CHECK(find_element(values, 3, sizeof values[0], &key) == NULL);
key = 1;
CHECK(find_element(values, 0, sizeof values[0], &key) == NULL);` },
          ],
        },
        {
          id: 'reverse-any',
          title: 'Reverse an array of anything',
          level: 'stretch',
          prompt: "Reverse the order of `count` elements of `size` bytes each, in place. Elements must be moved whole: the bytes inside each element keep their order. A helper that swaps two regions of `size` bytes will be useful.",
          signature: 'void reverse_any(void *base, size_t count, size_t size)',
          starter: c`void reverse_any(void *base, size_t count, size_t size) {
    // Swap element i with element count - 1 - i.
}`,
          hints: [
            "You already wrote the helper: `swap_any` from the earlier challenge. Copy it in as a `static` function.",
            "Element `i` is at `bytes + i * size`, and its partner is at `bytes + (count - 1 - i) * size`.",
            "Loop while `i < count / 2`. That bound also makes a count of zero safe.",
          ],
          solution: c`static void swap_bytes(unsigned char *left, unsigned char *right, size_t size) {
    for (size_t i = 0; i < size; ++i) {
        unsigned char saved = left[i];
        left[i] = right[i];
        right[i] = saved;
    }
}

void reverse_any(void *base, size_t count, size_t size) {
    unsigned char *bytes = base;
    for (size_t i = 0; i < count / 2; ++i) {
        swap_bytes(bytes + i * size, bytes + (count - 1 - i) * size, size);
    }
}`,
          tests: [
            { label: 'Reverses ints', body: c`int values[] = { 1, 2, 3, 4 };
reverse_any(values, 4, sizeof values[0]);
CHECK(values[0] == 4 && values[1] == 3 && values[2] == 2 && values[3] == 1);` },
            { label: 'Keeps the bytes inside each element in order', body: c`uint32_t values[] = { 0x11223344u, 0xAABBCCDDu, 0x01020304u };
reverse_any(values, 3, sizeof values[0]);
CHECK(values[0] == 0x01020304u && values[1] == 0xAABBCCDDu && values[2] == 0x11223344u);` },
            { label: 'Reverses an array of string pointers', body: c`const char *words[] = { "one", "two", "three" };
reverse_any(words, 3, sizeof words[0]);
CHECK(strcmp(words[0], "three") == 0 && strcmp(words[2], "one") == 0);` },
            { label: 'Handles one element and none', body: c`double values[] = { 2.5 };
reverse_any(values, 1, sizeof values[0]);
reverse_any(values, 0, sizeof values[0]);
CHECK(values[0] == 2.5);` },
          ],
        },
      ],
    },

    {
      id: 'function-pointers',
      title: 'Function pointers',
      category: part,
      minutes: 30,
      summary: 'Functions live in memory and have addresses. Storing and passing those addresses is how C does callbacks, sorting with a custom order, and its version of interfaces.',
      topics: ['Declaring', 'typedef', 'Callbacks', 'Context pointers', 'qsort', 'Dispatch tables'],
      sections: [
        {
          title: 'Functions have addresses',
          body: [
            "A function's machine code sits in memory like everything else, and a pointer can hold its address. The pointer's type records the function's signature, so calls through it are type-checked.",
            { code: c`int add(int a, int b) { return a + b; }

int (*operation)(int, int) = add;    // operation points at add.
int result = operation(2, 3);        // Call through the pointer.` },
            "Read the declaration from the name outward, as in the declarations lesson: `operation` is a pointer, to a function taking two `int`s, returning `int`. The parentheses around `*operation` are essential. Without them, `int *operation(int, int)` declares a function that returns a pointer to `int`.",
            { run: c`#include <stdio.h>

int add(int a, int b) { return a + b; }
int multiply(int a, int b) { return a * b; }

int main(void) {
    int (*operation)(int, int) = add;
    printf("%d\n", operation(6, 7));

    operation = multiply;       // Re-aim it at another function with the same signature.
    printf("%d\n", operation(6, 7));
    return 0;
}`, name: 'operation.c', expect: '13\n42\n' },
            "A function name decays to a pointer just as an array name does, so `add` and `&add` mean the same thing, and so do `operation(6, 7)` and `(*operation)(6, 7)`. Use the short forms.",
          ],
        },
        {
          title: 'typedef makes them readable',
          body: [
            "Function pointer syntax gets out of hand quickly once such pointers are passed and returned. A `typedef` gives the signature a name and lets everything else read normally.",
            { code: c`typedef int (*BinaryOp)(int, int);       // BinaryOp is a pointer-to-function type.

BinaryOp operation = add;                // A variable.
int apply(BinaryOp op, int x, int y);    // A parameter.
BinaryOp choose(char symbol);            // A return type.

// The last line without the typedef:
int (*choose(char symbol))(int, int);` },
            "This is the one place where hiding a pointer inside a typedef is the accepted style.",
          ],
        },
        {
          title: 'Callbacks',
          body: [
            "Passing a function pointer lets the caller supply a piece of the behavior. Here one counting loop serves any yes-or-no test.",
            { run: c`#include <stdbool.h>
#include <stdio.h>

typedef bool (*Predicate)(int);

bool is_even(int n) { return n % 2 == 0; }
bool is_negative(int n) { return n < 0; }

size_t count_if(const int *values, size_t count, Predicate test) {
    size_t matches = 0;
    for (size_t i = 0; i < count; ++i) {
        if (test(values[i])) {
            ++matches;
        }
    }
    return matches;
}

int main(void) {
    int values[] = { 4, -3, 8, -6, 5 };
    printf("%zu even\n", count_if(values, 5, is_even));
    printf("%zu negative\n", count_if(values, 5, is_negative));
    return 0;
}`, name: 'callbacks.c', expect: '3 even\n2 negative\n' },
            { compare: "This is `filter` with a function argument, as in `array_filter`, `Array.prototype.filter` or a list comprehension's condition. What C lacks is the convenient part: there are no lambdas, so every callback is a named function defined at file level, and there are no closures." },
          ],
        },
        {
          title: 'No closures: carry the context yourself',
          body: [
            "A function pointer is the address of some code and nothing more. It cannot capture a local variable. So how would you count the values above a threshold chosen at run time?",
            "The C idiom is an extra `void *` parameter. The caller hands over a pointer to whatever data the callback needs, the library function passes it through untouched, and the callback converts it back to the type it knows it is.",
            { run: c`#include <stdbool.h>
#include <stdio.h>

typedef bool (*Predicate)(int value, void *context);

bool above(int value, void *context) {
    const int *threshold = context;      // We know what we passed in.
    return value > *threshold;
}

size_t count_if(const int *values, size_t count, Predicate test, void *context) {
    size_t matches = 0;
    for (size_t i = 0; i < count; ++i) {
        if (test(values[i], context)) {
            ++matches;
        }
    }
    return matches;
}

int main(void) {
    int values[] = { 4, -3, 8, -6, 5 };
    int threshold = 4;
    printf("%zu above %d\n", count_if(values, 5, above, &threshold), threshold);
    threshold = -5;
    printf("%zu above %d\n", count_if(values, 5, above, &threshold), threshold);
    return 0;
}`, name: 'context.c', expect: '2 above 4\n4 above -5\n' },
            "Nearly every C library that takes a callback also takes a `void *` to go with it, under a name like `context`, `user_data` or `arg`. A closure in JavaScript is the same pair, a code pointer and its captured data, assembled for you by the language.",
          ],
        },
        {
          title: 'qsort and comparison functions',
          body: [
            "The standard library's sort brings the last three lessons together in one prototype: an untyped array, an element size, and a function pointer.",
            { code: c`void qsort(void *base, size_t count, size_t size,
           int (*compare)(const void *, const void *));` },
            "`qsort` moves elements around as raw bytes and calls your function whenever it needs to know which of two comes first. The function receives **pointers to two elements** and returns a negative number, zero, or a positive number.",
            { run: c`#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int compare_ints(const void *a, const void *b) {
    int left = *(const int *)a;               // a points at an element, and the elements are ints.
    int right = *(const int *)b;
    return (left > right) - (left < right);   // -1, 0 or 1, with no risk of overflow.
}

int compare_strings(const void *a, const void *b) {
    const char *left = *(const char *const *)a;    // Each element is a const char *,
    const char *right = *(const char *const *)b;   // so a points at a pointer.
    return strcmp(left, right);
}

int main(void) {
    int numbers[] = { 42, -7, 19, 0, 3 };
    const char *words[] = { "pear", "apple", "fig" };

    qsort(numbers, 5, sizeof numbers[0], compare_ints);
    qsort(words, 3, sizeof words[0], compare_strings);

    printf("%d %d %d %d %d\n", numbers[0], numbers[1], numbers[2], numbers[3], numbers[4]);
    printf("%s %s %s\n", words[0], words[1], words[2]);
    return 0;
}`, name: 'qsort.c', expect: '-7 0 3 19 42\napple fig pear\n' },
            { pitfall: [
              "Two mistakes in comparison functions are so common that they are worth memorizing.",
              "**Subtracting.** `return left - right;` overflows when the values are far apart, such as `INT_MAX` and −1, and overflow is undefined behavior. Use `(left > right) - (left < right)`.",
              "**Forgetting a level.** When the array holds `const char *` elements, the comparison function is handed pointers to those elements: a `const char **` in disguise. Passing `strcmp` itself to `qsort` compares the bytes of the pointers instead of the strings.",
            ] },
          ],
        },
        {
          title: 'Tables of functions',
          body: [
            "Function pointers can be stored in arrays and structs like any other value. A table that maps a key to a function replaces a long `switch`, and can be extended by adding a row.",
            { run: c`#include <stdio.h>

typedef double (*Operation)(double, double);

double add(double a, double b) { return a + b; }
double subtract(double a, double b) { return a - b; }
double multiply(double a, double b) { return a * b; }

struct Command {
    char symbol;
    Operation run;
};

int main(void) {
    const struct Command commands[] = {
        { '+', add }, { '-', subtract }, { '*', multiply },
    };
    const char program[] = "+*-";
    double value = 10.0;

    for (const char *p = program; *p != '\0'; ++p) {
        for (size_t i = 0; i < sizeof commands / sizeof commands[0]; ++i) {
            if (commands[i].symbol == *p) {
                value = commands[i].run(value, 3.0);
            }
        }
    }
    printf("%.1f\n", value);
    return 0;
}`, name: 'table.c', expect: '36.0\n' },
            "A struct whose members are function pointers is how C expresses an interface. Each implementation fills in the struct with its own functions, and calling code goes through the pointers without knowing which implementation it has. File systems and device drivers in operating system kernels are organized this way.",
            { pitfall: "Calling through a null function pointer, or through one whose type does not match the real function, is undefined behavior. Check for `NULL` when a table lookup can fail." },
          ],
        },
      ],
      takeaways: [
        "`int (*f)(int)` is a pointer to a function. `int *f(int)` is a function returning a pointer.",
        "Give function pointer types a name with `typedef`.",
        "A function pointer cannot capture variables. Pass the data alongside it as a `void *` context.",
        "A `qsort` comparison function receives pointers to elements. Compare without subtracting.",
      ],
      quiz: [
        {
          q: 'Which line declares `handler` as a pointer to a function that takes an `int` and returns nothing?',
          options: [
            { t: '`void *handler(int);`', why: "Without parentheses around `*handler`, this declares a function that returns a `void *`." },
            { t: '`void (*handler)(int);`', ok: true, why: "The parentheses bind the star to the name first: a pointer, to a function taking `int`, returning `void`." },
            { t: '`(void *)handler(int);`', why: "This is not a declaration. It reads as a cast applied to a call." },
          ],
        },
        {
          q: 'What is wrong with this comparison function for `qsort`?',
          code: c`int compare(const void *a, const void *b) {
    return *(const int *)a - *(const int *)b;
}`,
          options: [
            { t: 'Nothing', why: "It works for values that are close together, which is why the bug survives testing." },
            { t: 'The subtraction can overflow, for example with `INT_MAX` and −1', ok: true, why: "Signed overflow is undefined, and in practice the result wraps to the wrong sign, so the sort order comes out wrong. Compare with `(x > y) - (x < y)`." },
            { t: 'The casts are not allowed', why: "Converting the `const void *` back to the element's real type is exactly what a comparison function must do." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int twice(int n) { return 2 * n; }
int square(int n) { return n * n; }
int negate(int n) { return -n; }

int main(void) {
    int (*steps[])(int) = { twice, square, negate };
    int value = 3;
    for (size_t i = 0; i < 3; ++i) {
        value = steps[i](value);
    }
    printf("%d\n", value);
    return 0;
}`,
          answer: '-36',
          explain: "`steps` is an array of three function pointers, called in order: 3 doubles to 6, squares to 36, and negates to −36.",
        },
        {
          q: 'You call `qsort` on `const char *words[5]`. What does your comparison function receive in `a`?',
          options: [
            { t: 'One of the strings, as a `const char *`', why: "`qsort` knows nothing about the elements. It passes the address of an element, whatever the element is." },
            { t: 'The address of one element, which is a `const char *`. So `a` is really a `const char **`', ok: true, why: "Convert and dereference once to get the string: `*(const char *const *)a`." },
            { t: 'An index into the array', why: "`qsort` works with addresses, not indexes." },
          ],
        },
        {
          q: 'A callback needs a threshold that is only known at run time. How does it get the value in C?',
          options: [
            { t: 'It captures the local variable, as a closure would', why: "C functions cannot capture anything. A function pointer is only the address of code." },
            { t: 'Through an extra `void *` parameter that the caller passes along with the function pointer', ok: true, why: "This context pointer is the standard idiom. A global variable also works, and is worse in every way." },
            { t: 'It cannot. Callbacks only work with constants', why: "The context-pointer pattern exists precisely to solve this." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

int apply(int (*f)(int), int n, int times) {
    while (times-- > 0) {
        n = f(n);
    }
    return n;
}

int add_three(int n) { return n + 3; }

int main(void) {
    printf("%d\n", apply(add_three, 10, 5));
    return 0;
}`,
          answer: '25',
          explain: "`apply` calls the function it was given five times, feeding each result back in: 10 plus five threes.",
        },
        {
          q: 'What is `table`?',
          code: c`typedef int (*Op)(int);
Op table[4];`,
          options: [
            { t: 'A pointer to a function that returns an array', why: "Functions cannot return arrays, and the `[4]` is attached to `table`." },
            { t: 'An array of 4 pointers to functions taking and returning `int`', ok: true, why: "`Op` is a pointer-to-function type, and `table` is an array of four of them." },
            { t: 'A function taking 4 arguments', why: "`[4]` is an array suffix. A parameter list would use parentheses." },
          ],
        },
      ],
      challenges: [
        {
          id: 'map-ints',
          title: 'Apply a function to every element',
          level: 'warm-up',
          prompt: "Replace each of the first `count` elements with the result of calling `transform` on it.",
          prelude: c`static int twice(int n) { return 2 * n; }
static int negated(int n) { return -n; }
static int squared(int n) { return n * n; }`,
          signature: 'void map_ints(int *values, size_t count, int (*transform)(int))',
          starter: c`void map_ints(int *values, size_t count, int (*transform)(int)) {
    // Call transform on each element and store the result back.
}`,
          hints: ["A function pointer is called like a function: `values[i] = transform(values[i]);`"],
          solution: c`void map_ints(int *values, size_t count, int (*transform)(int)) {
    for (size_t i = 0; i < count; ++i) {
        values[i] = transform(values[i]);
    }
}`,
          tests: [
            { label: 'Doubles every element', body: c`int values[] = { 1, 2, 3 };
map_ints(values, 3, twice);
CHECK(values[0] == 2 && values[1] == 4 && values[2] == 6);` },
            { label: 'Works with a different function', body: c`int values[] = { 4, -5 };
map_ints(values, 2, negated);
CHECK(values[0] == -4 && values[1] == 5);` },
            { label: 'Touches only the first count elements', body: c`int values[] = { 2, 3, 4 };
map_ints(values, 2, squared);
CHECK(values[0] == 4 && values[1] == 9 && values[2] == 4);` },
            { label: 'Does nothing for a count of zero', body: c`int values[] = { 7 };
map_ints(values, 0, twice);
CHECK(values[0] == 7);` },
          ],
        },
        {
          id: 'lookup-operation',
          title: 'Return a function',
          level: 'core',
          prompt: "Return the function that goes with the symbol: `add` for `'+'`, `subtract` for `'-'`, and `multiply` for `'*'`. Return `NULL` for any other symbol. The three functions and the `Operation` type are already defined.",
          prelude: c`typedef int (*Operation)(int, int);

static int add(int a, int b) { return a + b; }
static int subtract(int a, int b) { return a - b; }
static int multiply(int a, int b) { return a * b; }`,
          signature: 'Operation lookup(char symbol)',
          starter: c`Operation lookup(char symbol) {
    return NULL;
}`,
          hints: [
            "A `switch` on `symbol` works: `case '+': return add;`",
            "Return the function's name with no parentheses. Writing `add()` would call it.",
          ],
          solution: c`Operation lookup(char symbol) {
    switch (symbol) {
        case '+': return add;
        case '-': return subtract;
        case '*': return multiply;
        default: return NULL;
    }
}`,
          tests: [
            { label: 'Finds each operation', body: c`CHECK(lookup('+') == add);
CHECK(lookup('-') == subtract);
CHECK(lookup('*') == multiply);` },
            { label: 'The result can be called', body: c`Operation op = lookup('-');
CHECK(op != NULL && op(10, 4) == 6);` },
            { label: 'Returns NULL for an unknown symbol', body: c`CHECK(lookup('/') == NULL);
CHECK(lookup('\0') == NULL);` },
          ],
        },
        {
          id: 'compare-descending',
          title: 'Sort largest first',
          level: 'core',
          prompt: "Write a comparison function that makes `qsort` arrange an array of `int` from largest to smallest. It must give the right answer for every pair of ints, including the extremes.",
          signature: 'int compare_descending(const void *a, const void *b)',
          starter: c`int compare_descending(const void *a, const void *b) {
    return 0;
}`,
          hints: [
            "Convert each argument back to a pointer to its real type and read the value: `int left = *(const int *)a;`",
            "For descending order, return a negative number when the left value is the **larger** one.",
            "Do not subtract. `(left < right) - (left > right)` gives 1, 0 or −1 with no overflow.",
          ],
          solution: c`int compare_descending(const void *a, const void *b) {
    int left = *(const int *)a;
    int right = *(const int *)b;
    return (left < right) - (left > right);
}`,
          tests: [
            { label: 'Sorts from largest to smallest', body: c`int values[] = { 3, 9, -2, 7, 0 };
qsort(values, 5, sizeof values[0], compare_descending);
CHECK(values[0] == 9 && values[1] == 7 && values[2] == 3 && values[3] == 0 && values[4] == -2);` },
            { label: 'Reports equal values as equal', body: c`int a = 5;
int b = 5;
CHECK(compare_descending(&a, &b) == 0);` },
            { label: 'Puts the larger value first', body: c`int big = 8;
int small = 2;
CHECK(compare_descending(&big, &small) < 0);
CHECK(compare_descending(&small, &big) > 0);` },
            { label: 'Is correct at the extremes', body: c`int values[] = { -1, INT_MAX, INT_MIN, 1, 0 };
qsort(values, 5, sizeof values[0], compare_descending);
CHECK(values[0] == INT_MAX && values[1] == 1 && values[2] == 0 && values[3] == -1 && values[4] == INT_MIN);` },
          ],
        },
        {
          id: 'find-if',
          title: 'Search with a callback and a context',
          level: 'core',
          prompt: [
            "Return a pointer to the first of `count` elements for which `test` returns `true`, or `NULL` if there is none. Pass `context` through to every call of `test`, unchanged.",
            "The tests supply the predicates shown under “Already declared for you”. Your function must not know or care what `context` points at.",
          ],
          prelude: c`typedef bool (*Test)(int value, void *context);

// context points at an int: the divisor.
static bool divisible_by(int value, void *context) {
    const int *divisor = context;
    return value % *divisor == 0;
}

// context points at a counter of how many times the test has been called.
static bool counting_never(int value, void *context) {
    int *calls = context;
    ++*calls;
    return false;
}`,
          signature: 'const int *find_if(const int *values, size_t count, Test test, void *context)',
          starter: c`const int *find_if(const int *values, size_t count, Test test, void *context) {
    return NULL;
}`,
          hints: [
            "Call `test(values[i], context)` for each element in turn.",
            "Return `&values[i]`, or equivalently `values + i`, for the first element that passes.",
          ],
          solution: c`const int *find_if(const int *values, size_t count, Test test, void *context) {
    for (size_t i = 0; i < count; ++i) {
        if (test(values[i], context)) {
            return &values[i];
        }
    }
    return NULL;
}`,
          tests: [
            { label: 'Finds the first match', body: c`const int values[] = { 7, 10, 9, 20 };
int divisor = 5;
CHECK(find_if(values, 4, divisible_by, &divisor) == &values[1]);` },
            { label: 'Uses the context it is given', body: c`const int values[] = { 7, 10, 9, 20 };
int divisor = 3;
CHECK(find_if(values, 4, divisible_by, &divisor) == &values[2]);` },
            { label: 'Returns NULL when nothing matches', body: c`const int values[] = { 1, 2, 3 };
int divisor = 7;
CHECK(find_if(values, 3, divisible_by, &divisor) == NULL);` },
            { label: 'Calls the test once per element, and not at all for an empty array', body: c`const int values[] = { 1, 2, 3 };
int calls = 0;
CHECK(find_if(values, 3, counting_never, &calls) == NULL);
CHECK(calls == 3);
calls = 0;
CHECK(find_if(values, 0, counting_never, &calls) == NULL);
CHECK(calls == 0);` },
          ],
        },
        {
          id: 'compare-by-length',
          title: 'Sort strings by length',
          level: 'stretch',
          prompt: [
            "Write a comparison function for `qsort` over an array of `const char *`. Shorter strings come first. Strings of the same length are ordered as `strcmp` orders them.",
            "Think carefully about what `a` and `b` point at.",
          ],
          signature: 'int compare_by_length(const void *a, const void *b)',
          starter: c`int compare_by_length(const void *a, const void *b) {
    return 0;
}`,
          hints: [
            "Each element of the array is a `const char *`. `qsort` passes the address of an element, so `a` is a pointer to a `const char *`.",
            "Recover the string with `const char *left = *(const char *const *)a;`",
            "Compare the two lengths first, without subtracting them, since `size_t` is unsigned. If they are equal, return `strcmp(left, right)`.",
          ],
          solution: c`int compare_by_length(const void *a, const void *b) {
    const char *left = *(const char *const *)a;
    const char *right = *(const char *const *)b;
    size_t left_length = strlen(left);
    size_t right_length = strlen(right);
    if (left_length != right_length) {
        return left_length < right_length ? -1 : 1;
    }
    return strcmp(left, right);
}`,
          tests: [
            { label: 'Shorter strings come first', body: c`const char *words[] = { "banana", "fig", "pear" };
qsort(words, 3, sizeof words[0], compare_by_length);
CHECK(strcmp(words[0], "fig") == 0 && strcmp(words[1], "pear") == 0 && strcmp(words[2], "banana") == 0);` },
            { label: 'Equal lengths fall back to alphabetical order', body: c`const char *words[] = { "plum", "kiwi", "pear" };
qsort(words, 3, sizeof words[0], compare_by_length);
CHECK(strcmp(words[0], "kiwi") == 0 && strcmp(words[1], "pear") == 0 && strcmp(words[2], "plum") == 0);` },
            { label: 'Handles the empty string', body: c`const char *words[] = { "a", "", "bb" };
qsort(words, 3, sizeof words[0], compare_by_length);
CHECK(words[0][0] == '\0' && strcmp(words[1], "a") == 0 && strcmp(words[2], "bb") == 0);` },
            { label: 'Identical strings compare equal', body: c`const char *one = "same";
const char *two = "same";
CHECK(compare_by_length(&one, &two) == 0);` },
          ],
        },
      ],
    },
  );
})();
