// Part 4: Data and the heap. Structs, unions, dynamic memory, linked structures.
(() => {
  const c = String.raw;
  const part = 'Part 4 · Data & the heap';

  const nodeStruct = c`struct Node {
    int value;
    struct Node *next;
};`;

  // Builds a heap list for the tests. Uses the checked allocator.
  const listHelpers = c`${nodeStruct}

// Test helper: builds a list holding the given values, in order.
struct Node *make_list(const int *values, size_t count) {
    struct Node *head = NULL;
    for (size_t i = count; i-- > 0;) {
        struct Node *node = malloc(sizeof *node);
        if (node == NULL) {
            abort();
        }
        node->value = values[i];
        node->next = head;
        head = node;
    }
    return head;
}

// Test helper: true if the list holds exactly these values, in order.
bool list_equals(const struct Node *head, const int *values, size_t count) {
    for (size_t i = 0; i < count; ++i) {
        if (head == NULL || head->value != values[i]) {
            return false;
        }
        head = head->next;
    }
    return head == NULL;
}

// Test helper: frees every node.
void drop_list(struct Node *head) {
    while (head != NULL) {
        struct Node *next = head->next;
        free(head);
        head = next;
    }
}`;

  (window.C_LESSONS ||= []).push(
    {
      id: 'structs',
      title: 'Structs',
      category: part,
      minutes: 35,
      summary: 'A struct groups values into one object. Unlike objects in the languages you know, a struct variable holds its members directly, which changes what assignment and argument passing do.',
      topics: ['Definition', 'Value semantics', '. and ->', 'Shallow copies', 'Padding'],
      sections: [
        {
          title: 'Defining and initializing',
          body: [
            "A `struct` declares a new type made of named members. There are no methods, constructors, private members or inheritance: a struct is data and nothing else.",
            { run: c`#include <stdio.h>

struct Point {
    int x;
    int y;
};

typedef struct {
    struct Point top_left;      // Structs nest by value: a Rect contains two Points.
    struct Point bottom_right;
} Rect;

int main(void) {
    struct Point origin = { 0 };      // Every member zero.
    Rect box = { .top_left = { 1, 2 }, .bottom_right = { .x = 6, .y = 9 } };

    box.top_left.x += 1;
    printf("%d %d\n", origin.x, origin.y);
    printf("width %d, height %d\n",
           box.bottom_right.x - box.top_left.x, box.bottom_right.y - box.top_left.y);
    printf("%zu bytes\n", sizeof box);
    return 0;
}`, name: 'structs.c', expect: '0 0\nwidth 4, height 7\n16 bytes\n' },
            { list: [
              "The type's name is two words, `struct Point`. A `typedef` lets you drop the first, either separately as `typedef struct Point Point;` or by wrapping the definition, as `Rect` does above.",
              "`{ .x = 6, .y = 9 }` is a designated initializer. Members you leave out are set to zero, and `{ 0 }` zeroes everything.",
              "`sizeof box` is 16: four ints stored one after another, with no header and no hidden fields.",
            ] },
            { compare: "The shape resembles a TypeScript interface or a Python dataclass with only fields. The difference is in what a variable of the type contains. In those languages it contains a reference to an object stored elsewhere. In C the variable contains the members themselves." },
          ],
        },
        {
          title: 'Structs are values',
          body: [
            "Because a struct variable is its members, assigning one struct to another copies every member. So does passing a struct to a function, and so does returning one. An array inside a struct is copied along with it, even though a bare array cannot be assigned.",
            { run: c`#include <stdio.h>

struct Account {
    char owner[8];       // An array inside a struct is copied with the struct.
    int balance;
};

struct Account with_bonus(struct Account account) {   // Receives a copy.
    account.balance += 100;
    return account;                                   // Hands back a copy.
}

int main(void) {
    struct Account first = { "Ada", 50 };
    struct Account second = first;        // Copies every byte, array included.
    second.owner[0] = 'I';

    struct Account third = with_bonus(first);
    printf("%s %d\n", first.owner, first.balance);
    printf("%s %d\n", second.owner, second.balance);
    printf("%s %d\n", third.owner, third.balance);
    return 0;
}`, name: 'values.c', expect: 'Ada 50\nIda 50\nAda 150\n' },
            { compare: "In JavaScript, Python and PHP, assigning an object gives you a second reference to the same object, and a function can modify the object it is handed. A C struct behaves like a number: you get your own copy, and changing it affects nobody else." },
            { pitfall: "Structs cannot be compared with `==`. It does not compile. Compare them member by member. `memcmp` is not a safe shortcut, for a reason the padding section explains." },
          ],
        },
        {
          title: 'Pointers to structs and the arrow',
          body: [
            "Copying is wasteful for a large struct and useless when a function needs to modify the caller's struct. Both are solved by passing a pointer. Reaching a member through a pointer is so common that it has its own operator: `p->x` means `(*p).x`.",
            { run: c`#include <stdio.h>

struct Point { int x; int y; };

void move(struct Point *point, int dx, int dy) {    // Works on the caller's struct.
    point->x += dx;                                 // The same as (*point).x += dx;
    point->y += dy;
}

int manhattan(const struct Point *point) {          // Reads without copying.
    int x = point->x < 0 ? -point->x : point->x;
    int y = point->y < 0 ? -point->y : point->y;
    return x + y;
}

int main(void) {
    struct Point p = { .x = 2, .y = 3 };
    move(&p, 4, -8);
    printf("(%d, %d) is %d from the origin\n", p.x, p.y, manhattan(&p));
    return 0;
}`, name: 'arrow.c', expect: '(6, -5) is 11 from the origin\n' },
            { list: [
              "Use a dot when you have a struct, and an arrow when you have a pointer to one.",
              "The parentheses in `(*p).x` are required because `.` binds more tightly than `*`. Without them, `*p.x` would mean `*(p.x)`.",
              "Take a `const struct T *` when the function only reads. Passing small structs by value is also fine, and is often clearer.",
            ] },
          ],
        },
        {
          title: 'A copy is shallow',
          body: [
            "Copying a struct copies its members exactly as they are. If a member is a pointer, the copy gets the same address, and the two structs now share whatever that address leads to.",
            { trace: {
              title: 'Two structs, one buffer',
              code: c`char buffer[] = "Ada";
struct User a = { .name = buffer, .age = 36 };
struct User b = a;
b.age = 40;
b.name[0] = 'I';`,
              vars: [
                { id: 'buffer', type: 'char', len: 4 },
                { id: 'a', type: 'struct User', fields: [['name', 'char *'], ['age', 'int']] },
                { id: 'b', type: 'struct User', fields: [['name', 'char *'], ['age', 'int']] },
              ],
              steps: [
                { line: 1, set: { buffer: ["'A'", "'d'", "'a'", "'\\0'"] }, say: "A writable array holding a name." },
                { line: 2, set: { a: { name: '&buffer[0]', age: 36 } }, say: "`a.name` holds the address of the buffer. The characters are not inside the struct." },
                { line: 3, set: { b: { name: '&buffer[0]', age: 36 } }, say: "`b = a` copies both members. The pointer is copied as an address, so `b.name` leads to the same buffer." },
                { line: 4, set: { 'b.age': 40 }, say: "`age` is stored inside each struct, so the two are independent. `a.age` is still 36." },
                { line: 5, set: { 'buffer[0]': "'I'" }, say: "`b.name[0]` follows the shared pointer. The write lands in the buffer, and `a.name` now reads `Ida` as well." },
              ],
            } },
            "This is the shallow copy you know from spreading an object in JavaScript or `copy.copy` in Python. The array-in-a-struct from the last section behaved differently because its characters were stored inside the struct. A deep copy, which also duplicates what the pointers lead to, is something you write by hand.",
          ],
        },
        {
          title: 'Layout, padding and sizeof',
          body: [
            "Members are stored in the order you declare them, but not always back to back. Each member must start at an address that suits its type, usually a multiple of its size, so the compiler inserts unused **padding** bytes where needed. It also pads the end, so that structs line up correctly in an array.",
            { widget: 'structLayout' },
            { run: c`#include <stddef.h>
#include <stdio.h>

struct Loose { char tag; double value; char flag; int count; };
struct Tight { double value; int count; char tag; char flag; };

int main(void) {
    printf("Loose: %zu bytes, value at %zu, flag at %zu, count at %zu\n",
           sizeof(struct Loose), offsetof(struct Loose, value),
           offsetof(struct Loose, flag), offsetof(struct Loose, count));
    printf("Tight: %zu bytes\n", sizeof(struct Tight));
    return 0;
}`, name: 'layout.c', expect: 'Loose: 24 bytes, value at 8, flag at 16, count at 20\nTight: 16 bytes\n' },
            { list: [
              "`offsetof(type, member)`, from `<stddef.h>`, gives a member's distance in bytes from the start of the struct.",
              "Never assume `sizeof` a struct is the sum of its members. Always ask.",
              "Padding bytes hold indeterminate values. Two structs with equal members can differ in their padding, which is why `memcmp` cannot be trusted to compare them.",
              "For the same reason, writing a struct's raw bytes to a file or a socket ties the data to one compiler on one platform.",
            ] },
          ],
        },
        {
          title: 'Arrays of structs',
          body: [
            "An array of structs is the structs themselves, laid end to end. Pointer arithmetic steps by one whole struct at a time, so every technique from the pointer arithmetic lesson applies unchanged.",
            { run: c`#include <stdio.h>

struct Player {
    const char *name;
    int score;
};

int main(void) {
    struct Player players[] = {
        { "Ada", 72 }, { "Grace", 95 }, { "Linus", 88 },
    };
    const struct Player *end = players + sizeof players / sizeof players[0];
    const struct Player *best = players;

    for (const struct Player *p = players; p != end; ++p) {   // ++p moves one whole struct.
        if (p->score > best->score) {
            best = p;
        }
    }
    printf("%s leads with %d\n", best->name, best->score);
    printf("that is player %td\n", best - players);
    return 0;
}`, name: 'players.c', expect: 'Grace leads with 95\nthat is player 1\n' },
            { compare: "A Python list of objects or a JavaScript array of objects is an array of references to objects scattered around the heap. A C array of structs is one contiguous block. That is a large part of why C code that processes records in bulk is fast." },
          ],
        },
        {
          title: 'Three more things to recognize',
          body: [
            "**Compound literals.** `(struct Point){ .x = 1, .y = 2 }` creates an unnamed struct value on the spot. It is handy for assigning a whole struct at once, or for passing one without declaring a variable.",
            { code: c`point = (struct Point){ 0, 0 };              // Reset every member.
draw_line((struct Point){ 0, 0 }, (struct Point){ 5, 5 });` },
            "**Self-reference.** A struct cannot contain a member of its own type, because it would have no finite size. It can contain a pointer to its own type, because every pointer has a known size. This is the basis of lists and trees.",
            { code: c`struct Node {
    int value;
    struct Node *next;      // A pointer to another Node.
};` },
            "**Incomplete types.** `struct Parser;` on its own declares that such a type exists without saying what is in it. Code that sees only that line can hold and pass a `struct Parser *` but cannot look inside or create one. Libraries use this to hide their internals, as the lesson on multi-file programs shows.",
          ],
        },
      ],
      takeaways: [
        "A struct variable holds its members directly. Assigning, passing and returning all copy.",
        "Use `.` with a struct and `->` with a pointer to one.",
        "A copy is shallow: pointer members are copied as addresses, so their targets are shared.",
        "Structs may contain padding. Use `sizeof`, and compare member by member.",
      ],
      quiz: [
        {
          q: 'What is `point.x` after `nudge` returns?',
          code: c`struct Point { int x; int y; };

void nudge(struct Point point) {
    ++point.x;
}

// In main:
struct Point point = { .x = 3, .y = 4 };
nudge(point);`,
          options: [
            { t: '3', ok: true, why: "`nudge` receives a copy of the whole struct and increments the copy's `x`." },
            { t: '4', why: "The parameter's `x` becomes 4. The caller's struct is a separate object." },
            { t: 'The call does not compile, because `nudge` needs a pointer', why: "The parameter type is `struct Point`, so passing a struct by value matches. It just cannot modify the original." },
          ],
        },
        {
          q: 'With `struct Point *p`, which expression means the same as `p->x`?',
          options: [
            { t: '`*p.x`', why: "`.` binds more tightly than `*`, so this is `*(p.x)`, which tries to use `.` on a pointer." },
            { t: '`(*p).x`', ok: true, why: "Dereference first to get the struct, then select the member. The arrow is shorthand for exactly this." },
            { t: '`p.x`', why: "`p` is a pointer, not a struct. The dot needs a struct on its left." },
            { t: '`&p.x`', why: "This would take an address. It reads nothing." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

struct Mixed {
    char c;
    int i;
    char d;
};

int main(void) {
    printf("%zu\n", sizeof(struct Mixed));
    return 0;
}`,
          answer: '12',
          explain: "`c` takes one byte, then three bytes of padding bring `i` to a multiple of four. `d` takes one more byte, and three bytes of padding at the end round the size up to a multiple of four.",
          hint: "An `int` must start at a multiple of four, and the total size must be a multiple of the largest alignment.",
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

struct Box {
    int items[3];
};

int main(void) {
    struct Box a = { { 1, 2, 3 } };
    struct Box b = a;
    b.items[0] = 9;
    printf("%d %d\n", a.items[0], b.items[0]);
    return 0;
}`,
          answer: '1 9',
          explain: "The array is stored inside the struct, so `b = a` copied its three ints. The two boxes are independent.",
        },
        {
          q: 'After this code runs, what string does `a.text` lead to?',
          code: c`struct Label { char *text; };

char buffer[] = "cat";
struct Label a = { buffer };
struct Label b = a;
b.text[0] = 'b';`,
          options: [
            { t: '`"cat"`, because `b` is a copy', why: "The struct was copied, but all it contains is an address. Both copies hold the same one." },
            { t: '`"bat"`, because both structs point at the same buffer', ok: true, why: "A struct copy is shallow. The pointer member was duplicated and the characters were not." },
            { t: 'It is undefined behavior', why: "`buffer` is a writable array that is still alive, so the write is fine." },
          ],
        },
        {
          q: 'With two variables `a` and `b` of type `struct Point`, what does `if (a == b)` do?',
          options: [
            { t: 'Compares the members', why: "C defines no `==` for struct types." },
            { t: 'Compares the addresses', why: "That is what happens with arrays, which decay. Structs do not decay." },
            { t: 'It does not compile', ok: true, why: "You have to write the comparison yourself: `a.x == b.x && a.y == b.y`." },
          ],
        },
        {
          q: 'Why may a struct contain `struct Node *next` but not `struct Node next`?',
          options: [
            { t: 'Pointers are the only members a struct may have', why: "Structs can contain any complete type, including other structs." },
            { t: 'A struct containing itself would have no finite size, while a pointer always has a known size', ok: true, why: "The compiler must know a member's size to lay out the struct. A pointer's size does not depend on what it points to." },
            { t: 'It is only a style rule', why: "The compiler rejects it: the member would have incomplete type." },
          ],
        },
      ],
      challenges: [
        {
          id: 'record-attempt',
          title: 'Pass the struct, not a copy',
          level: 'warm-up',
          kind: 'fix',
          broken: 'compile',
          prompt: [
            "`record` is supposed to update a counter that belongs to the caller. As written it takes the struct by value, so it could only ever change its own copy, and the tests, which pass an address, do not compile against it.",
            "Change the function so that it works on the caller's struct.",
          ],
          prelude: c`struct Counter {
    int hits;
    int misses;
};`,
          signature: 'void record(struct Counter *counter, bool hit)',
          starter: c`// Records one attempt in the caller's counter.
void record(struct Counter counter, bool hit) {
    if (hit) {
        counter.hits++;
    } else {
        counter.misses++;
    }
}`,
          hints: [
            "The parameter must be a pointer: `struct Counter *counter`.",
            "With a pointer on the left, each `.` becomes `->`.",
          ],
          solution: c`// Records one attempt in the caller's counter.
void record(struct Counter *counter, bool hit) {
    if (hit) {
        counter->hits++;
    } else {
        counter->misses++;
    }
}`,
          tests: [
            { label: 'Counts a hit', body: c`struct Counter counter = { 0 };
record(&counter, true);
CHECK(counter.hits == 1 && counter.misses == 0);` },
            { label: 'Counts a miss', body: c`struct Counter counter = { 0 };
record(&counter, false);
CHECK(counter.hits == 0 && counter.misses == 1);` },
            { label: 'Accumulates over several calls', body: c`struct Counter counter = { .hits = 2, .misses = 5 };
record(&counter, true);
record(&counter, true);
record(&counter, false);
CHECK(counter.hits == 4 && counter.misses == 6);` },
          ],
        },
        {
          id: 'vec2-add',
          title: 'Add two vectors',
          level: 'warm-up',
          prompt: "Return a new vector whose members are the sums of the corresponding members of `a` and `b`. Structs are passed in and returned by value.",
          prelude: c`struct Vec2 {
    int x;
    int y;
};`,
          signature: 'struct Vec2 vec2_add(struct Vec2 a, struct Vec2 b)',
          starter: c`struct Vec2 vec2_add(struct Vec2 a, struct Vec2 b) {
    struct Vec2 sum = { 0 };
    return sum;
}`,
          hints: ["Fill in `sum.x` and `sum.y`, or return a compound literal: `return (struct Vec2){ a.x + b.x, a.y + b.y };`"],
          solution: c`struct Vec2 vec2_add(struct Vec2 a, struct Vec2 b) {
    return (struct Vec2){ .x = a.x + b.x, .y = a.y + b.y };
}`,
          tests: [
            { label: 'Adds member by member', body: c`struct Vec2 sum = vec2_add((struct Vec2){ 1, 2 }, (struct Vec2){ 10, 20 });
CHECK(sum.x == 11 && sum.y == 22);` },
            { label: 'Handles negative members', body: c`struct Vec2 sum = vec2_add((struct Vec2){ -4, 6 }, (struct Vec2){ 4, -9 });
CHECK(sum.x == 0 && sum.y == -3);` },
            { label: 'Leaves its arguments unchanged', body: c`struct Vec2 a = { 3, 4 };
struct Vec2 b = { 5, 6 };
vec2_add(a, b);
CHECK(a.x == 3 && a.y == 4 && b.x == 5 && b.y == 6);` },
          ],
        },
        {
          id: 'include-value',
          legacy: 'structs',
          title: 'Update a running range',
          level: 'core',
          prompt: "A `Bounds` records the smallest and largest value seen so far. Update the caller's `Bounds` so that it also covers `value`. The range you are given is always valid, with `min` no greater than `max`.",
          signature: 'void include_value(struct Bounds *bounds, int value)',
          starter: c`struct Bounds {
    int min;
    int max;
};

void include_value(struct Bounds *bounds, int value) {
    // Update whichever member the value falls outside.
}`,
          hints: [
            "Reach the members with `bounds->min` and `bounds->max`.",
            "Lower `min` if the value is below it, and raise `max` if the value is above it.",
          ],
          solution: c`struct Bounds {
    int min;
    int max;
};

void include_value(struct Bounds *bounds, int value) {
    if (value < bounds->min) {
        bounds->min = value;
    }
    if (value > bounds->max) {
        bounds->max = value;
    }
}`,
          tests: [
            { label: 'Lowers the minimum', body: c`struct Bounds bounds = { .min = 3, .max = 7 };
include_value(&bounds, -2);
CHECK(bounds.min == -2 && bounds.max == 7);` },
            { label: 'Raises the maximum', body: c`struct Bounds bounds = { .min = -4, .max = 1 };
include_value(&bounds, 6);
CHECK(bounds.min == -4 && bounds.max == 6);` },
            { label: 'Leaves a range that already covers the value', body: c`struct Bounds bounds = { .min = 1, .max = 8 };
include_value(&bounds, 5);
CHECK(bounds.min == 1 && bounds.max == 8);` },
          ],
        },
        {
          id: 'top-scorer',
          title: 'Search an array of structs',
          level: 'core',
          prompt: "Return a pointer to the player with the highest score among the first `count` players. If several share the highest score, return the earliest. Return `NULL` when `count` is zero.",
          prelude: c`struct Player {
    const char *name;
    int score;
};`,
          signature: 'const struct Player *top_scorer(const struct Player *players, size_t count)',
          starter: c`const struct Player *top_scorer(const struct Player *players, size_t count) {
    return NULL;
}`,
          hints: [
            "Keep a pointer to the best player so far, starting at `NULL` or at the first element.",
            "`players[i].score` and `(players + i)->score` are the same member. Return `&players[i]`, not a copy of the struct.",
          ],
          solution: c`const struct Player *top_scorer(const struct Player *players, size_t count) {
    const struct Player *best = NULL;
    for (size_t i = 0; i < count; ++i) {
        if (best == NULL || players[i].score > best->score) {
            best = &players[i];
        }
    }
    return best;
}`,
          tests: [
            { label: 'Finds the highest score', body: c`const struct Player players[] = { { "Ada", 72 }, { "Grace", 95 }, { "Linus", 88 } };
CHECK(top_scorer(players, 3) == &players[1]);` },
            { label: 'Prefers the earliest on a tie', body: c`const struct Player players[] = { { "Ada", 50 }, { "Grace", 90 }, { "Linus", 90 } };
CHECK(top_scorer(players, 3) == &players[1]);` },
            { label: 'Handles negative scores', body: c`const struct Player players[] = { { "Ada", -5 }, { "Grace", -2 }, { "Linus", -9 } };
CHECK(top_scorer(players, 3) == &players[1]);` },
            { label: 'Looks only at the first count players, and handles none', body: c`const struct Player players[] = { { "Ada", 1 }, { "Grace", 99 } };
CHECK(top_scorer(players, 1) == &players[0]);
CHECK(top_scorer(players, 0) == NULL);` },
          ],
        },
        {
          id: 'rect-intersection',
          title: 'Intersect two rectangles',
          level: 'core',
          prompt: [
            "A `Rect` covers the points from `left` up to but not including `right`, and from `top` up to but not including `bottom`. Every rectangle you are given has positive width and height.",
            "If `a` and `b` overlap in an area larger than zero, store the overlapping rectangle in `*out` and return `true`. Otherwise return `false` and leave `*out` untouched. Rectangles that only touch along an edge do not overlap.",
          ],
          prelude: c`struct Rect {
    int left;
    int top;
    int right;
    int bottom;
};`,
          signature: 'bool rect_intersection(const struct Rect *a, const struct Rect *b, struct Rect *out)',
          starter: c`bool rect_intersection(const struct Rect *a, const struct Rect *b, struct Rect *out) {
    return false;
}`,
          hints: [
            "The overlap starts at the larger of the two `left` values and ends at the smaller of the two `right` values. The vertical edges work the same way.",
            "Build the candidate in a local `struct Rect`. It is a real overlap only if `left < right` and `top < bottom`.",
            "Assign to `*out` once, after you know the answer: `*out = result;` copies the whole struct.",
          ],
          solution: c`bool rect_intersection(const struct Rect *a, const struct Rect *b, struct Rect *out) {
    struct Rect result = {
        .left = a->left > b->left ? a->left : b->left,
        .top = a->top > b->top ? a->top : b->top,
        .right = a->right < b->right ? a->right : b->right,
        .bottom = a->bottom < b->bottom ? a->bottom : b->bottom,
    };
    if (result.left >= result.right || result.top >= result.bottom) {
        return false;
    }
    *out = result;
    return true;
}`,
          tests: [
            { label: 'Finds a partial overlap', body: c`struct Rect a = { 0, 0, 10, 10 };
struct Rect b = { 5, 3, 15, 8 };
struct Rect out = { 0 };
CHECK(rect_intersection(&a, &b, &out));
CHECK(out.left == 5 && out.top == 3 && out.right == 10 && out.bottom == 8);` },
            { label: 'One rectangle inside another', body: c`struct Rect outer = { -10, -10, 10, 10 };
struct Rect inner = { 1, 2, 3, 4 };
struct Rect out = { 0 };
CHECK(rect_intersection(&inner, &outer, &out));
CHECK(out.left == 1 && out.top == 2 && out.right == 3 && out.bottom == 4);` },
            { label: 'Separate rectangles do not overlap, and out is untouched', body: c`struct Rect a = { 0, 0, 4, 4 };
struct Rect b = { 6, 6, 9, 9 };
struct Rect out = { 7, 7, 7, 7 };
CHECK(!rect_intersection(&a, &b, &out));
CHECK(out.left == 7 && out.top == 7 && out.right == 7 && out.bottom == 7);` },
            { label: 'Touching along an edge is not an overlap', body: c`struct Rect a = { 0, 0, 4, 4 };
struct Rect b = { 4, 0, 8, 4 };
struct Rect out = { 7, 7, 7, 7 };
CHECK(!rect_intersection(&a, &b, &out));
CHECK(out.left == 7);` },
            { label: 'The output may be one of the inputs', body: c`struct Rect a = { 0, 0, 10, 10 };
struct Rect b = { 2, 2, 20, 20 };
CHECK(rect_intersection(&a, &b, &a));
CHECK(a.left == 2 && a.top == 2 && a.right == 10 && a.bottom == 10);` },
          ],
        },
        {
          id: 'stack',
          title: 'A fixed-size stack',
          level: 'stretch',
          prompt: [
            "A `Stack` holds up to `STACK_CAPACITY` ints in an array, with `count` saying how many are in use. Write both operations.",
            "`stack_push` adds a value on top and returns `true`, or returns `false` and changes nothing if the stack is full. `stack_pop` removes the top value, stores it in `*out`, and returns `true`, or returns `false` and leaves `*out` untouched if the stack is empty.",
          ],
          prelude: c`enum { STACK_CAPACITY = 4 };

struct Stack {
    int items[STACK_CAPACITY];
    size_t count;
};`,
          signature: 'bool stack_push(struct Stack *stack, int value)\nbool stack_pop(struct Stack *stack, int *out)',
          starter: c`bool stack_push(struct Stack *stack, int value) {
    return false;
}

bool stack_pop(struct Stack *stack, int *out) {
    return false;
}`,
          hints: [
            "The next free slot is `stack->items[stack->count]`. The top value is at `stack->items[stack->count - 1]`.",
            "Check for full before pushing, and for empty before popping. Evaluating `count - 1` on an empty stack would wrap around.",
          ],
          solution: c`bool stack_push(struct Stack *stack, int value) {
    if (stack->count == STACK_CAPACITY) {
        return false;
    }
    stack->items[stack->count] = value;
    stack->count++;
    return true;
}

bool stack_pop(struct Stack *stack, int *out) {
    if (stack->count == 0) {
        return false;
    }
    stack->count--;
    *out = stack->items[stack->count];
    return true;
}`,
          tests: [
            { label: 'Pops in reverse order of pushing', body: c`struct Stack stack = { .count = 0 };
int value = 0;
CHECK(stack_push(&stack, 10) && stack_push(&stack, 20) && stack_push(&stack, 30));
CHECK(stack.count == 3);
CHECK(stack_pop(&stack, &value) && value == 30);
CHECK(stack_pop(&stack, &value) && value == 20);
CHECK(stack_pop(&stack, &value) && value == 10);
CHECK(stack.count == 0);` },
            { label: 'Refuses to pop when empty', body: c`struct Stack stack = { .count = 0 };
int value = 123;
CHECK(!stack_pop(&stack, &value));
CHECK(value == 123 && stack.count == 0);` },
            { label: 'Refuses to push when full', body: c`struct Stack stack = { .count = 0 };
for (int i = 0; i < STACK_CAPACITY; ++i) {
    CHECK(stack_push(&stack, i));
}
CHECK(!stack_push(&stack, 99));
CHECK(stack.count == STACK_CAPACITY);
CHECK(stack.items[STACK_CAPACITY - 1] == STACK_CAPACITY - 1);` },
            { label: 'Can be refilled after emptying', body: c`struct Stack stack = { .count = 0 };
int value = 0;
CHECK(stack_push(&stack, 1));
CHECK(stack_pop(&stack, &value) && value == 1);
CHECK(stack_push(&stack, 2));
CHECK(stack_pop(&stack, &value) && value == 2);
CHECK(!stack_pop(&stack, &value));` },
          ],
        },
      ],
    },

    {
      id: 'enums-unions',
      title: 'Enums, unions & tagged unions',
      category: part,
      minutes: 24,
      summary: 'Named constants, storage that several types share, and the pattern that combines them into C\'s answer to a discriminated union.',
      topics: ['enum', 'Flags', 'union', 'Tagged unions', 'Bit-fields'],
      sections: [
        {
          title: 'enum: names for integer constants',
          body: [
            "An `enum` declares a set of named integer constants. They count up from zero unless you assign values, and each one continues from the one before.",
            { run: c`#include <stdio.h>

enum Level { LEVEL_DEBUG, LEVEL_INFO, LEVEL_WARN = 10, LEVEL_ERROR, LEVEL_COUNT };

const char *level_name(enum Level level) {
    switch (level) {
        case LEVEL_DEBUG: return "debug";
        case LEVEL_INFO:  return "info";
        case LEVEL_WARN:  return "warn";
        case LEVEL_ERROR: return "error";
        case LEVEL_COUNT: break;
    }
    return "unknown";
}

int main(void) {
    printf("%d %d %d %d\n", LEVEL_DEBUG, LEVEL_INFO, LEVEL_WARN, LEVEL_ERROR);
    enum Level level = LEVEL_WARN;
    printf("%s\n", level_name(level));
    level = 42;                          // Nothing stops this.
    printf("%s\n", level_name(level));
    return 0;
}`, name: 'enum.c', expect: '0 1 10 11\nwarn\nunknown\n' },
            { list: [
              "An `enum` type is an integer type and nothing more. Any integer can be stored in it, and the constants convert freely to and from `int`.",
              "The constants live in the same global namespace as everything else, which is why they carry a prefix such as `LEVEL_`.",
              "When a `switch` over an enum has no `default`, the compiler warns if a constant is not handled. Leaving `default` out is a way to be told when you add a constant and forget a case.",
              "A final constant such as `LEVEL_COUNT` is a common trick. In an enum that counts from zero with no gaps, it equals the number of real values.",
            ] },
            { compare: "A TypeScript `enum` and a Python `Enum` are types in their own right, with names you can read back at run time. A C enumeration constant is an `int` with a name that exists only in the source. Printing the name is your job, as `level_name` shows." },
          ],
        },
        {
          title: 'Flags',
          body: [
            "Give each constant a different single bit, and one integer can hold any combination of them. This is how C code passes sets of options.",
            { run: c`#include <stdio.h>

enum Permission {
    PERM_READ    = 1u << 0,
    PERM_WRITE   = 1u << 1,
    PERM_EXECUTE = 1u << 2,
};

int main(void) {
    unsigned mode = PERM_READ | PERM_WRITE;          // Combine flags with OR.
    printf("%u\n", mode);
    printf("%d\n", (mode & PERM_WRITE) != 0);        // Test one with AND.
    mode &= ~(unsigned)PERM_WRITE;                   // Clear one with AND NOT.
    printf("%d %d\n", (mode & PERM_WRITE) != 0, (mode & PERM_READ) != 0);
    return 0;
}`, name: 'flags.c', expect: '3\n1\n0 1\n' },
            "To test that several flags are all present, compare against the mask: `(mode & wanted) == wanted`. A bare `mode & wanted` is true when any one of them is present.",
          ],
        },
        {
          title: 'union: one piece of storage, several types',
          body: [
            "A `union` is declared like a struct, but its members all occupy the same bytes. It is as large as its largest member, and it holds one member's value at a time.",
            { run: c`#include <stdint.h>
#include <stdio.h>

union Number {
    int32_t whole;
    float fraction;
    unsigned char bytes[4];
};

int main(void) {
    union Number n;
    printf("%zu bytes\n", sizeof n);         // As big as its largest member, not the sum.

    n.whole = 1;
    printf("%d\n", n.whole);

    n.fraction = 1.0f;                       // Overwrites the same four bytes.
    printf("%.1f\n", n.fraction);
    printf("0x%08x\n", (unsigned)n.whole);   // The float's bits, read as an integer.
    return 0;
}`, name: 'union.c', expect: '4 bytes\n1\n1.0\n0x3f800000\n' },
            "Reading a member other than the one last written does not convert the value. It reinterprets the same bytes as a different type. C permits this, and it is occasionally used on purpose, but the usual discipline is to read only what you last wrote. The union itself keeps no record of which member that was.",
          ],
        },
        {
          title: 'Tagged unions',
          body: [
            "Since a union cannot tell you which member is in use, the standard design stores that fact next to it. A struct holds an enum, the **tag**, and a union. Code looks at the tag and then reads the matching member.",
            { run: c`#include <stdio.h>

enum ShapeKind { SHAPE_CIRCLE, SHAPE_RECT };

struct Shape {
    enum ShapeKind kind;            // Says which member of the union is in use.
    union {
        struct { double radius; } circle;
        struct { double width, height; } rect;
    };                              // An anonymous union: its members are used directly.
};

double area(const struct Shape *shape) {
    switch (shape->kind) {
        case SHAPE_CIRCLE:
            return 3.141592653589793 * shape->circle.radius * shape->circle.radius;
        case SHAPE_RECT:
            return shape->rect.width * shape->rect.height;
    }
    return 0.0;
}

int main(void) {
    struct Shape shapes[] = {
        { .kind = SHAPE_CIRCLE, .circle = { 1.0 } },
        { .kind = SHAPE_RECT, .rect = { 2.0, 3.5 } },
    };
    for (size_t i = 0; i < 2; ++i) {
        printf("%.2f\n", area(&shapes[i]));
    }
    return 0;
}`, name: 'shapes.c', expect: '3.14\n7.00\n' },
            { compare: "This is a discriminated union: `type Shape = { kind: 'circle', radius: number } | { kind: 'rect', width: number, height: number }` in TypeScript, narrowed by a `switch` on `kind`. The layout and the idea are the same. What is missing in C is the checking. Nothing stops code from reading `rect.width` out of a circle, and the result is whatever those bytes happen to mean." },
            "Tagged unions are how C programs represent anything that comes in several kinds: tokens in a parser, nodes in a syntax tree, JSON values, events in a queue.",
          ],
        },
        {
          title: 'typedef with structs and enums',
          body: [
            "Struct, union and enum tags have a namespace of their own, which is why the keyword is part of the type's name. A `typedef` adds a name in the ordinary namespace, and the two can be spelled the same.",
            { code: c`typedef struct Node Node;                // Node and struct Node are now the same type.
typedef enum { RED, GREEN, BLUE } Color; // An enum with no tag, known only as Color.

struct Node {
    Color color;
    Node *next;                          // The typedef is already usable here.
};` },
            "Styles differ. The Linux kernel spells out `struct` everywhere, on the grounds that it shows what a name is. Many libraries typedef everything. Follow whatever the code you are working in already does.",
          ],
        },
        {
          title: 'Bit-fields, briefly',
          body: [
            "A struct member can be declared with a width in bits. The compiler packs neighboring bit-fields into shared bytes and generates the shifting and masking for you.",
            { code: c`struct Header {
    unsigned version : 4;     // Four bits: 0 to 15.
    unsigned urgent  : 1;     // One bit.
    unsigned length  : 11;    // Eleven bits: 0 to 2047.
};` },
            "Bit-fields save memory in large tables of small values. Their exact layout is left to the compiler, so they are the wrong tool for matching a file format or a network header. For those, use fixed-width integers with explicit shifts and masks.",
          ],
        },
      ],
      takeaways: [
        "Enumeration constants are named `int`s. The compiler does not restrict an enum variable to them.",
        "Single-bit constants combined with `|`, tested with `&` and cleared with `& ~` make a set of flags.",
        "A union's members share storage. Read the member you last wrote.",
        "A tagged union pairs a union with an enum saying which member is live. The compiler does not check that you obey the tag.",
      ],
      quiz: [
        {
          q: 'What is the value of `C`?',
          code: c`enum { A, B = 5, C };`,
          options: [
            { t: '2', why: "Each constant continues from the previous one, not from its position in the list." },
            { t: '6', ok: true, why: "`A` is 0, `B` is set to 5, and `C` takes the next value after `B`." },
            { t: '1', why: "`C` follows `B`, which is 5." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

union Slot {
    char letter;
    double number;
    int count;
};

int main(void) {
    printf("%zu\n", sizeof(union Slot));
    return 0;
}`,
          answer: '8',
          explain: "The members overlap, so the union needs only as much room as its largest member, the `double`.",
        },
        {
          q: 'Given `enum Color { RED, GREEN, BLUE };`, what happens with `enum Color c = 42;`?',
          options: [
            { t: 'It does not compile', why: "C does not restrict an enum variable to its listed constants." },
            { t: 'It compiles, and `c` holds 42', ok: true, why: "An enum is an integer type. Code that receives an enum from outside should be ready for values that match no constant." },
            { t: 'The value is clamped to `BLUE`', why: "No conversion or clamping takes place." },
          ],
        },
        {
          q: 'What does this print?',
          code: c`union { int i; float f; } u;
u.i = 1;
printf("%f\n", u.f);`,
          options: [
            { t: '1.000000, because the value is converted', why: "No conversion happens. The members share bytes, and `u.f` reads those bytes as a `float`." },
            { t: '0.000000, because the bits of the integer 1 are a tiny float', ok: true, why: "The bit pattern of the integer 1 is, as a `float`, about 1.4e-45. That rounds to zero at six decimal places." },
            { t: 'It does not compile', why: "Reading a different member is legal in C. It reinterprets the bytes." },
          ],
        },
        {
          q: 'In a tagged union, what makes sure that code reads the union member matching the tag?',
          options: [
            { t: 'The compiler checks it', why: "The compiler sees a struct with an enum and a union. It knows of no connection between them." },
            { t: 'A check when the program runs', why: "C adds no run-time checks. Reading the wrong member silently reinterprets the bytes." },
            { t: 'Only the programmer', ok: true, why: "The tag is a convention. Keeping it in step with the union, and consulting it before reading, is your responsibility." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

enum { A = 1, B = 2, C = 4 };

int main(void) {
    unsigned flags = A | C;
    flags ^= B | C;
    printf("%u\n", flags);
    return 0;
}`,
          answer: '3',
          explain: "`A | C` is binary 101. XOR with `B | C`, binary 110, toggles `B` on and `C` off, leaving 011.",
        },
        {
          q: 'What does `(mode & (PERM_READ | PERM_WRITE)) != 0` test?',
          options: [
            { t: 'That both flags are set', why: "For both, compare with the mask itself: `(mode & mask) == mask`." },
            { t: 'That at least one of the two flags is set', ok: true, why: "The AND keeps whichever of the two bits are present, and the result is nonzero if either is." },
            { t: 'That neither flag is set', why: "That would be `== 0`." },
          ],
        },
      ],
      challenges: [
        {
          id: 'weekday-name',
          title: 'Name the day',
          level: 'warm-up',
          prompt: "Return the English name of the day, such as `\"Monday\"`. Return `\"?\"` for a value that is not one of the seven constants. Remember that an enum variable can hold any integer.",
          prelude: c`enum Weekday { MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY };`,
          signature: 'const char *weekday_name(enum Weekday day)',
          starter: c`const char *weekday_name(enum Weekday day) {
    return "?";
}`,
          hints: [
            "A `switch` works. So does an array of seven strings indexed by the enum value, since the constants run from 0 to 6.",
            "With the array, check the range before indexing. An enum may be signed, so convert first: `(unsigned)day > SUNDAY` catches values on both sides.",
          ],
          solution: c`const char *weekday_name(enum Weekday day) {
    static const char *const names[] = {
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
    };
    if ((unsigned)day > SUNDAY) {
        return "?";
    }
    return names[day];
}`,
          tests: [
            { label: 'Names the first and last day', body: c`CHECK(strcmp(weekday_name(MONDAY), "Monday") == 0);
CHECK(strcmp(weekday_name(SUNDAY), "Sunday") == 0);` },
            { label: 'Names the days in between', body: c`CHECK(strcmp(weekday_name(TUESDAY), "Tuesday") == 0);
CHECK(strcmp(weekday_name(WEDNESDAY), "Wednesday") == 0);
CHECK(strcmp(weekday_name(THURSDAY), "Thursday") == 0);
CHECK(strcmp(weekday_name(FRIDAY), "Friday") == 0);
CHECK(strcmp(weekday_name(SATURDAY), "Saturday") == 0);` },
            { label: 'Returns a question mark for anything else', body: c`CHECK(strcmp(weekday_name((enum Weekday)7), "?") == 0);
CHECK(strcmp(weekday_name((enum Weekday)-1), "?") == 0);
CHECK(strcmp(weekday_name((enum Weekday)1000), "?") == 0);` },
          ],
        },
        {
          id: 'permissions',
          title: 'Work with flags',
          level: 'core',
          prompt: [
            "Write two small functions over sets of permission flags.",
            "`has_all` returns `true` when every flag in `required` is also in `granted`. An empty `required` set is always satisfied. `revoke` returns `granted` with every flag in `flags` removed, and all others unchanged.",
          ],
          prelude: c`enum Permission {
    PERM_READ    = 1u << 0,
    PERM_WRITE   = 1u << 1,
    PERM_EXECUTE = 1u << 2,
    PERM_ADMIN   = 1u << 3,
};`,
          signature: 'bool has_all(unsigned granted, unsigned required)\nunsigned revoke(unsigned granted, unsigned flags)',
          starter: c`bool has_all(unsigned granted, unsigned required) {
    return false;
}

unsigned revoke(unsigned granted, unsigned flags) {
    return granted;
}`,
          hints: [
            "`granted & required` keeps only the required flags that are present. All of them are present when that equals `required`.",
            "`~flags` has every bit set except the ones being revoked. AND with it clears exactly those.",
          ],
          solution: c`bool has_all(unsigned granted, unsigned required) {
    return (granted & required) == required;
}

unsigned revoke(unsigned granted, unsigned flags) {
    return granted & ~flags;
}`,
          tests: [
            { label: 'has_all needs every required flag', body: c`unsigned granted = PERM_READ | PERM_WRITE;
CHECK(has_all(granted, PERM_READ));
CHECK(has_all(granted, PERM_READ | PERM_WRITE));
CHECK(!has_all(granted, PERM_READ | PERM_EXECUTE));
CHECK(!has_all(granted, PERM_ADMIN));` },
            { label: 'Nothing required is always satisfied', body: c`CHECK(has_all(0, 0));
CHECK(has_all(PERM_READ, 0));` },
            { label: 'revoke removes only the named flags', body: c`unsigned granted = PERM_READ | PERM_WRITE | PERM_ADMIN;
CHECK(revoke(granted, PERM_WRITE) == (PERM_READ | PERM_ADMIN));
CHECK(revoke(granted, PERM_WRITE | PERM_ADMIN) == PERM_READ);` },
            { label: 'Revoking a flag that is not set changes nothing', body: c`CHECK(revoke(PERM_READ, PERM_EXECUTE) == PERM_READ);
CHECK(revoke(0, PERM_ADMIN) == 0);` },
          ],
        },
        {
          id: 'value-equal',
          title: 'Compare tagged values',
          level: 'core',
          prompt: [
            "A `Value` is a tagged union that holds an integer, a boolean, or a string. Return `true` if `a` and `b` hold the same kind of value and the values are equal.",
            "Two text values are equal when their characters are equal, wherever the two strings are stored. Values of different kinds are never equal, even if their bytes happen to match.",
          ],
          prelude: c`enum ValueKind { VALUE_INT, VALUE_BOOL, VALUE_TEXT };

struct Value {
    enum ValueKind kind;
    union {
        int number;          // when kind is VALUE_INT
        bool flag;           // when kind is VALUE_BOOL
        const char *text;    // when kind is VALUE_TEXT
    };
};`,
          signature: 'bool value_equal(const struct Value *a, const struct Value *b)',
          starter: c`bool value_equal(const struct Value *a, const struct Value *b) {
    return false;
}`,
          hints: [
            "Compare the tags first. If they differ, the answer is `false`.",
            "Then `switch` on the kind, and compare only the member that the kind says is live.",
            "Strings need `strcmp`. Comparing the two `text` pointers with `==` would only tell you whether they are the same address.",
          ],
          solution: c`bool value_equal(const struct Value *a, const struct Value *b) {
    if (a->kind != b->kind) {
        return false;
    }
    switch (a->kind) {
        case VALUE_INT:
            return a->number == b->number;
        case VALUE_BOOL:
            return a->flag == b->flag;
        case VALUE_TEXT:
            return strcmp(a->text, b->text) == 0;
    }
    return false;
}`,
          tests: [
            { label: 'Compares integers', body: c`struct Value a = { .kind = VALUE_INT, .number = 7 };
struct Value b = { .kind = VALUE_INT, .number = 7 };
struct Value other = { .kind = VALUE_INT, .number = 8 };
CHECK(value_equal(&a, &b));
CHECK(!value_equal(&a, &other));` },
            { label: 'Compares booleans', body: c`struct Value yes = { .kind = VALUE_BOOL, .flag = true };
struct Value also = { .kind = VALUE_BOOL, .flag = true };
struct Value no = { .kind = VALUE_BOOL, .flag = false };
CHECK(value_equal(&yes, &also));
CHECK(!value_equal(&yes, &no));` },
            { label: 'Compares text by content, not by address', body: c`char first[] = "same";
char second[] = "same";
struct Value a = { .kind = VALUE_TEXT, .text = first };
struct Value b = { .kind = VALUE_TEXT, .text = second };
struct Value other = { .kind = VALUE_TEXT, .text = "different" };
CHECK(value_equal(&a, &b));
CHECK(!value_equal(&a, &other));` },
            { label: 'Different kinds are never equal', body: c`struct Value number = { .kind = VALUE_INT, .number = 1 };
struct Value flag = { .kind = VALUE_BOOL, .flag = true };
struct Value zero = { .kind = VALUE_INT, .number = 0 };
struct Value off = { .kind = VALUE_BOOL, .flag = false };
CHECK(!value_equal(&number, &flag));
CHECK(!value_equal(&zero, &off));` },
          ],
        },
        {
          id: 'evaluate',
          title: 'Evaluate an expression tree',
          level: 'stretch',
          prompt: [
            "An arithmetic expression is stored as a tree. Each node is a tagged union: a number, a negation of one sub-expression, or a sum or product of two.",
            "Return the value of the expression. The tests build expressions such as (2 + 3) × −4.",
          ],
          prelude: c`enum ExprKind { EXPR_NUMBER, EXPR_NEGATE, EXPR_ADD, EXPR_MULTIPLY };

struct Expr {
    enum ExprKind kind;
    union {
        int number;                      // EXPR_NUMBER
        const struct Expr *operand;      // EXPR_NEGATE
        struct {
            const struct Expr *left;
            const struct Expr *right;
        } pair;                          // EXPR_ADD and EXPR_MULTIPLY
    };
};`,
          signature: 'int evaluate(const struct Expr *expr)',
          starter: c`int evaluate(const struct Expr *expr) {
    return 0;
}`,
          hints: [
            "`switch` on `expr->kind`. A number is its own value.",
            "The other kinds hold pointers to sub-expressions. Their values come from calling `evaluate` on those pointers: the function is naturally recursive.",
            "The two operands of a sum are `expr->pair.left` and `expr->pair.right`.",
          ],
          solution: c`int evaluate(const struct Expr *expr) {
    switch (expr->kind) {
        case EXPR_NUMBER:
            return expr->number;
        case EXPR_NEGATE:
            return -evaluate(expr->operand);
        case EXPR_ADD:
            return evaluate(expr->pair.left) + evaluate(expr->pair.right);
        case EXPR_MULTIPLY:
            return evaluate(expr->pair.left) * evaluate(expr->pair.right);
    }
    return 0;
}`,
          tests: [
            { label: 'A number evaluates to itself', body: c`struct Expr seven = { .kind = EXPR_NUMBER, .number = 7 };
CHECK(evaluate(&seven) == 7);` },
            { label: 'Negation', body: c`struct Expr seven = { .kind = EXPR_NUMBER, .number = 7 };
struct Expr minus = { .kind = EXPR_NEGATE, .operand = &seven };
struct Expr back = { .kind = EXPR_NEGATE, .operand = &minus };
CHECK(evaluate(&minus) == -7);
CHECK(evaluate(&back) == 7);` },
            { label: 'Sum and product', body: c`struct Expr two = { .kind = EXPR_NUMBER, .number = 2 };
struct Expr three = { .kind = EXPR_NUMBER, .number = 3 };
struct Expr sum = { .kind = EXPR_ADD, .pair = { &two, &three } };
struct Expr product = { .kind = EXPR_MULTIPLY, .pair = { &two, &three } };
CHECK(evaluate(&sum) == 5);
CHECK(evaluate(&product) == 6);` },
            { label: 'A nested expression: (2 + 3) * -4', body: c`struct Expr two = { .kind = EXPR_NUMBER, .number = 2 };
struct Expr three = { .kind = EXPR_NUMBER, .number = 3 };
struct Expr four = { .kind = EXPR_NUMBER, .number = 4 };
struct Expr sum = { .kind = EXPR_ADD, .pair = { &two, &three } };
struct Expr minus_four = { .kind = EXPR_NEGATE, .operand = &four };
struct Expr whole = { .kind = EXPR_MULTIPLY, .pair = { &sum, &minus_four } };
CHECK(evaluate(&whole) == -20);` },
            { label: 'A sub-expression used twice', body: c`struct Expr five = { .kind = EXPR_NUMBER, .number = 5 };
struct Expr square = { .kind = EXPR_MULTIPLY, .pair = { &five, &five } };
struct Expr total = { .kind = EXPR_ADD, .pair = { &square, &square } };
CHECK(evaluate(&total) == 50);` },
          ],
        },
      ],
    },

    {
      id: 'heap',
      title: 'Dynamic memory',
      category: part,
      minutes: 40,
      summary: 'The heap lets you decide at run time how much memory you need and how long it lives. In exchange, you take on the job a garbage collector does elsewhere.',
      topics: ['malloc and free', 'realloc', 'Ownership', 'Leaks', 'Use after free', 'Growable arrays'],
      sections: [
        {
          title: 'Why the heap',
          body: [
            "Stack variables vanish when their function returns, and their sizes are fixed when you write the code. Static variables last forever, but there is only one of each. The **heap** covers what is left: memory whose size you choose while the program runs, and which lives until you say otherwise.",
            "`malloc(n)` asks for `n` bytes and returns the address of a block at least that large, or `NULL` if it cannot. `free(p)` hands the block back.",
            { run: c`#include <stdio.h>
#include <stdlib.h>

int *make_squares(size_t count) {
    int *squares = malloc(count * sizeof *squares);   // Room for count ints.
    if (squares == NULL) {
        return NULL;                                  // Allocation can fail.
    }
    for (size_t i = 0; i < count; ++i) {
        squares[i] = (int)(i * i);
    }
    return squares;         // The block outlives this function. The caller now owns it.
}

int main(void) {
    int *squares = make_squares(5);
    if (squares == NULL) {
        return EXIT_FAILURE;
    }
    printf("%d %d %d\n", squares[0], squares[2], squares[4]);
    free(squares);          // Exactly once, when finished.
    return EXIT_SUCCESS;
}`, name: 'heap.c', expect: '0 4 16\n' },
            { list: [
              "`malloc` returns a `void *`, which converts to `int *` without a cast.",
              "Write the size as `count * sizeof *pointer`. `sizeof *squares` is the size of whatever `squares` points to, so the line stays correct if the element type ever changes.",
              "The block's contents start out indeterminate, like an uninitialized local.",
              "A heap block has no name. The pointer `malloc` returned is the only way to reach it and the only way to free it.",
            ] },
            { compare: "Every list, dict, object and string you create in Python, JavaScript or PHP is a heap allocation made for you, and released for you when nothing refers to it any more. In C both halves are explicit. There is no garbage collector and no destructor. If you do not call `free`, nobody does." },
          ],
        },
        {
          title: 'The four functions',
          body: [
            { table: {
              head: ['Function', 'What it does'],
              rows: [
                ['`malloc(n)`', 'Allocates `n` bytes with indeterminate contents.'],
                ['`calloc(count, size)`', 'Allocates `count × size` bytes, all zero. It also checks that multiplication for overflow.'],
                ['`realloc(p, n)`', 'Resizes the block at `p` to `n` bytes, keeping its contents. The block may move. Returns the new address.'],
                ['`free(p)`', 'Releases the block. `free(NULL)` does nothing.'],
              ],
            } },
            "`realloc` needs care, because it has three outcomes. It may resize the block where it is, it may move it and return a different address, or it may fail. On failure it returns `NULL` and leaves the original block untouched and still yours.",
            { code: c`int *bigger = realloc(values, new_count * sizeof *values);
if (bigger == NULL) {
    return false;         // values is still valid, and still has to be freed.
}
values = bigger;          // From here on, use only the new address.` },
            { pitfall: "Writing `values = realloc(values, n);` is a bug. If `realloc` fails, the assignment overwrites your only pointer to the old block with `NULL`, and the block is leaked. Always receive the result in a second variable. And remember that any other pointers into the old block are invalid once it has moved." },
          ],
        },
        {
          title: 'Ownership',
          body: [
            "The language tracks nothing, so programmers track it by convention. Every heap block has one **owner**: the piece of code responsible for freeing it. Ownership can be handed on, but there is always exactly one owner.",
            { list: [
              "A function that allocates and returns a pointer usually transfers ownership to its caller. Its documentation should say so, and it often comes with a matching function to release the result.",
              "A function that receives a pointer usually only borrows it. It may use the block during the call and must not free it or keep the pointer afterward.",
              "When a struct holds a pointer to a block, decide whether the struct owns that block. If it does, destroying the struct means freeing the block too.",
            ] },
            "Three questions are worth asking about any pointer you are handed: who frees this, how long does it stay valid, and am I allowed to keep a copy of it?",
            { compare: "Rust turns these conventions into rules its compiler enforces, and C++ wraps them in smart pointer types. C leaves them in comments and naming, such as `thing_create` paired with `thing_destroy`. They are just as real, and getting them wrong causes the bugs in the next section." },
          ],
        },
        {
          title: 'Four ways to get it wrong',
          body: [
            { table: {
              head: ['Bug', 'What happened', 'Typical result'],
              rows: [
                ['Leak', 'The last pointer to a block was lost before `free` was called.', 'Memory use grows until the program exits.'],
                ['Use after free', 'A pointer was followed after its block was freed.', 'Garbage data, or corruption of whatever now occupies that memory.'],
                ['Double free', 'The same block was freed twice.', 'A corrupted allocator, and a crash somewhere unrelated.'],
                ['Heap overflow', 'A write went past the end of a block.', 'Corrupted neighboring blocks. A classic security hole.'],
              ],
            } },
            { trace: {
              title: 'Use after free',
              code: c`int *scores = malloc(2 * sizeof *scores);
scores[0] = 70;
scores[1] = 85;
int *best = &scores[1];
free(scores);
scores = NULL;
printf("%d\n", *best);`,
              vars: [
                { id: 'scores', type: 'int *', frame: 'main' },
                { id: 'best', type: 'int *', frame: 'main' },
                { id: 'block', name: 'block', type: 'int', len: 2, frame: 'heap' },
              ],
              steps: [
                { line: 1, show: ['block'], set: { scores: '&block[0]' }, say: "`malloc` finds room for two ints on the heap and returns the block's address. The contents are indeterminate." },
                { line: 2, set: { 'block[0]': 70 }, say: "`scores[0]` is `*(scores + 0)`: the first int in the block." },
                { line: 3, set: { 'block[1]': 85 }, say: "And the second." },
                { line: 4, set: { best: '&block[1]' }, say: "A second pointer, into the middle of the same block." },
                { line: 5, dead: ['block'], say: "`free` returns the block to the allocator. Nothing happens to `scores` or `best`. Both still hold addresses inside memory the program no longer owns." },
                { line: 6, set: { scores: 'NULL' }, say: "Setting the pointer to `NULL` after freeing is a good habit, because a later mistake through `scores` will now fail visibly. It does nothing for `best`." },
                { line: 7, say: "`*best` reads freed memory. This is undefined behavior. It may print 85, it may print whatever the allocator has since stored there, and on a system with protections it may crash." },
              ],
            } },
            { native: [
              "These bugs are hard to see and easy to find with the right tool. On your Mac, build with AddressSanitizer:",
              { text: 'clang -std=c17 -Wall -Wextra -g -fsanitize=address,undefined program.c -o program' },
              "The program then stops at the first bad access and prints where it happened, where the block was allocated, and where it was freed. The `leaks` command, run as `leaks --atExit -- ./program`, reports blocks that were never freed.",
            ] },
            { aside: "The challenges in this lesson and the next run against a checking allocator built into this page. It fills new blocks and freed blocks with recognizable junk, never reuses an address within a test, and puts guard bytes after every block. A leak, a double free, a read of uninitialized or freed memory, or a write past the end shows up as a failed test." },
          ],
        },
        {
          title: 'Getting the size right',
          body: [
            "The argument to `malloc` is a `size_t`, and the multiplication that computes it is ordinary unsigned arithmetic: it wraps. If `count` comes from outside the program and is enormous, `count * sizeof *p` can wrap around to a small number. `malloc` then succeeds with a tiny block, and the loop that fills `count` elements writes far beyond it.",
            { code: c`if (count > SIZE_MAX / sizeof *values) {
    return NULL;                           // The byte count would not fit in a size_t.
}
int *values = malloc(count * sizeof *values);

int *zeroed = calloc(count, sizeof *zeroed);   // calloc makes the same check itself.` },
            "The other classic sizing mistake is a string: a copy of `text` needs `strlen(text) + 1` bytes. Leaving out the `+ 1` writes the terminator one byte past the end of the block.",
          ],
        },
        {
          title: 'A growable array',
          body: [
            "Put the pieces together and you get the data structure behind Python's `list`, PHP's arrays and JavaScript's `Array`: a heap block, a count of elements in use, and a count of elements there is room for. When it fills up, it is reallocated at twice the size.",
            { run: c`#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>

struct IntList {
    int *data;
    size_t length;      // Elements in use.
    size_t capacity;    // Elements there is room for.
};

bool list_append(struct IntList *list, int value) {
    if (list->length == list->capacity) {
        size_t capacity = list->capacity == 0 ? 4 : list->capacity * 2;
        int *data = realloc(list->data, capacity * sizeof *data);
        if (data == NULL) {
            return false;               // The list is unchanged and still valid.
        }
        list->data = data;
        list->capacity = capacity;
    }
    list->data[list->length++] = value;
    return true;
}

int main(void) {
    struct IntList list = { 0 };        // NULL data, zero length, zero capacity.
    for (int i = 1; i <= 10; ++i) {
        if (!list_append(&list, i * i)) {
            free(list.data);
            return EXIT_FAILURE;
        }
    }
    printf("%zu items, room for %zu, last is %d\n",
           list.length, list.capacity, list.data[list.length - 1]);
    free(list.data);
    return EXIT_SUCCESS;
}`, name: 'growable.c', expect: '10 items, room for 16, last is 100\n' },
            { list: [
              "`realloc(NULL, n)` behaves like `malloc(n)`, so the empty list needs no special case.",
              "Doubling means that appending n items triggers only about log₂ n reallocations, so the average cost of an append stays constant.",
              "The struct owns the block. Whoever owns the struct must free `data` before discarding it.",
              "A pointer into `data`, such as `&list.data[3]`, may be invalidated by the next append. This is the same hazard as modifying a list while iterating over it, with worse consequences.",
            ] },
          ],
        },
        {
          title: 'Releasing on every path',
          body: [
            "A function that acquires several things has to release them on every way out, including every early return for an error. Repeating the cleanup at each exit invites mistakes. The established C idiom puts the cleanup in one place at the end and jumps to it.",
            { code: c`bool process(size_t count) {
    bool ok = false;
    int *input = malloc(count * sizeof *input);
    int *output = malloc(count * sizeof *output);
    if (input == NULL || output == NULL) {
        goto cleanup;
    }

    // ... work, with "goto cleanup;" wherever it fails ...
    ok = true;

cleanup:
    free(output);       // free(NULL) is harmless, so no checks are needed here.
    free(input);
    return ok;
}` },
            { compare: "This is `try … finally`, Python's `with`, or a C++ destructor, written out by hand. It is the forward-jumping, single-target use of `goto` that the control flow lesson promised, and it is standard in well-regarded C code bases." },
          ],
        },
      ],
      takeaways: [
        "`malloc` can return `NULL`. Check every allocation.",
        "Write sizes as `count * sizeof *pointer`, and check that multiplication when `count` is untrusted.",
        "Every block has one owner, who must free it exactly once.",
        "After `free`, every pointer into the block is dangling. After `realloc`, use only the address it returned.",
        "Never write `p = realloc(p, n)`.",
      ],
      quiz: [
        {
          q: 'What happens when `*alias` is evaluated?',
          code: c`int *owner = malloc(sizeof *owner);
if (owner != NULL) {
    *owner = 42;
    int *alias = owner;
    free(owner);
    printf("%d\n", *alias);
}`,
          options: [
            { t: 'It reliably prints 42', why: "The block's lifetime ended at `free`. The allocator may reuse or overwrite that memory at any time." },
            { t: 'It is undefined behavior', ok: true, why: "Freeing a block invalidates every pointer into it, not just the one passed to `free`." },
            { t: 'It prints 0, because `free` clears the memory', why: "`free` does not clear the block and does not change `alias`. It only ends the block's lifetime." },
          ],
        },
        {
          q: 'What is wrong with `items = realloc(items, new_size);`?',
          options: [
            { t: 'Nothing', why: "It works as long as `realloc` succeeds, which is why the bug is rarely noticed." },
            { t: 'If `realloc` fails it returns `NULL`, which overwrites the only pointer to the original block', ok: true, why: "The original block is still allocated but can no longer be reached or freed. Receive the result in a separate variable and assign only on success." },
            { t: '`realloc` cannot be given a pointer from `malloc`', why: "Resizing `malloc` blocks is what `realloc` is for." },
          ],
        },
        {
          q: 'What is the bug here?',
          code: c`double *samples = malloc(100 * sizeof samples);`,
          options: [
            { t: 'The result of `malloc` needs a cast', why: "In C a `void *` converts to any object pointer without one." },
            { t: '`sizeof samples` is the size of the pointer, not of a `double`', ok: true, why: "It should be `sizeof *samples`. In this page a pointer is 4 bytes and a `double` is 8, so the block is half the size the code believes it is." },
            { t: '100 is too many elements for the heap', why: "The heap handles far larger requests." },
          ],
        },
        {
          q: 'What does a block freshly returned by `malloc` contain?',
          options: [
            { t: 'Zeros', why: "That is `calloc`. Operating systems often hand out zeroed pages, so it frequently looks like zeros, which hides the bug." },
            { t: 'Indeterminate values', ok: true, why: "It contains whatever was left there. Reading it before writing it is the same bug as reading an uninitialized local." },
            { t: 'A copy of the previous allocation', why: "It may contain old data from an earlier, freed block, but nothing guarantees it." },
          ],
        },
        {
          kind: 'multi',
          q: 'Which of these are bugs? `p` came from `malloc`.',
          options: [
            { t: '`free(p); free(p);`', ok: true, why: "A double free. The second call hands the allocator a block it already has." },
            { t: '`int x = 0; free(&x);`', ok: true, why: "Only pointers returned by `malloc`, `calloc` or `realloc` may be freed." },
            { t: '`free(NULL);`', why: "Explicitly allowed. It does nothing." },
            { t: '`free(p); printf("%d\\n", p[0]);`', ok: true, why: "A use after free." },
            { t: '`p = malloc(8);` when `p` already held the only pointer to a live block', ok: true, why: "The old block can no longer be reached or freed: a leak." },
          ],
          hint: "Only one of the five is harmless.",
        },
        {
          q: 'The documentation says: “`make_label` returns a newly allocated string. `show_label` does not keep the pointer.” Who must free the string?',
          code: c`char *label = make_label(42);
show_label(label);`,
          options: [
            { t: '`make_label`', why: "It has already returned. It handed ownership to its caller." },
            { t: '`show_label`', why: "It only borrows the pointer for the duration of the call." },
            { t: 'The code shown, after `show_label` returns', ok: true, why: "The caller of `make_label` became the owner, and nothing since has taken ownership away." },
          ],
        },
        {
          kind: 'predict',
          q: 'A growable array starts with capacity 0, grows to 4 on its first append, and doubles whenever it is full. This program simulates 20 appends. What does it print?',
          code: c`#include <stdio.h>

int main(void) {
    size_t capacity = 0;
    int growths = 0;
    for (size_t length = 0; length < 20; ++length) {
        if (length == capacity) {
            capacity = capacity == 0 ? 4 : capacity * 2;
            ++growths;
        }
    }
    printf("%zu %d\n", capacity, growths);
    return 0;
}`,
          answer: '32 4',
          explain: "The array grows when the length reaches 0, 4, 8 and 16, giving capacities of 4, 8, 16 and 32. Twenty appends cost only four reallocations.",
        },
      ],
      challenges: [
        {
          id: 'duplicate',
          title: 'Duplicate a string',
          level: 'warm-up',
          track: true,
          prompt: "Return a newly allocated copy of `text`, which the caller will free. Return `NULL` if the allocation fails.",
          signature: 'char *duplicate(const char *text)',
          starter: c`char *duplicate(const char *text) {
    return NULL;
}`,
          hints: [
            "The copy needs `strlen(text) + 1` bytes: one extra for the terminator.",
            "Check the result of `malloc` before copying into it.",
            "`memcpy(copy, text, length + 1)` copies the characters and the terminator together.",
          ],
          solution: c`char *duplicate(const char *text) {
    size_t length = strlen(text);
    char *copy = malloc(length + 1);
    if (copy == NULL) {
        return NULL;
    }
    memcpy(copy, text, length + 1);
    return copy;
}`,
          tests: [
            { label: 'Returns an equal string at a new address', body: c`const char *original = "pointer";
char *copy = duplicate(original);
CHECK(copy != NULL && copy != original);
if (copy != NULL) {
    CHECK(strcmp(copy, "pointer") == 0);
}
free(copy);` },
            { label: 'The copy is independent and writable', body: c`char original[] = "cat";
char *copy = duplicate(original);
CHECK(copy != NULL);
if (copy != NULL) {
    copy[0] = 'b';
    CHECK(strcmp(original, "cat") == 0 && strcmp(copy, "bat") == 0);
}
free(copy);` },
            { label: 'Copies the empty string', body: c`char *copy = duplicate("");
CHECK(copy != NULL);
if (copy != NULL) {
    CHECK(copy[0] == '\0');
}
free(copy);` },
            { label: 'Returns NULL when allocation fails', body: c`FAIL_ALLOCATIONS_AFTER(0);
char *copy = duplicate("anything");
CHECK(copy == NULL);
free(copy);` },
          ],
        },
        {
          id: 'clone-ints',
          legacy: 'heap',
          title: 'Clone an array',
          level: 'core',
          track: true,
          prompt: "Return a new heap block holding a copy of the first `length` ints from `values`. The caller will free it. Return `NULL` when `length` is zero, when the byte count would overflow a `size_t`, or when allocation fails. Check the length before reading from `values`.",
          signature: 'int *clone_ints(const int *values, size_t length)',
          starter: c`int *clone_ints(const int *values, size_t length) {
    // Validate the size, allocate, and copy the elements.
    return NULL;
}`,
          hints: [
            "Reject zero, and reject any `length` greater than `SIZE_MAX / sizeof *values`, before multiplying.",
            "Check the result of `malloc` for `NULL` before copying.",
            "Copy with a loop, or with `memcpy(copy, values, length * sizeof *copy)`.",
          ],
          solution: c`int *clone_ints(const int *values, size_t length) {
    if (length == 0 || length > SIZE_MAX / sizeof *values) {
        return NULL;
    }

    int *copy = malloc(length * sizeof *copy);
    if (copy == NULL) {
        return NULL;
    }

    memcpy(copy, values, length * sizeof *copy);
    return copy;
}`,
          tests: [
            { label: 'Returns a writable, independent copy', body: c`int values[] = { 5, -8, 12 };
int *copy = clone_ints(values, 3);
CHECK(copy != NULL && copy != values);
if (copy != NULL && copy != values) {
    CHECK(copy[0] == 5 && copy[1] == -8 && copy[2] == 12);
    copy[1] = 99;
    CHECK(values[1] == -8);
    free(copy);
}` },
            { label: 'Allocates exactly the bytes it needs', body: c`const int values[] = { 1, 2, 3, 4, 5 };
int *copy = clone_ints(values, 5);
CHECK(copy != NULL);
if (copy != NULL) {
    CHECK(BLOCK_SIZE(copy) == 5 * sizeof(int));
    CHECK(copy[4] == 5);
}
free(copy);` },
            { label: 'Returns NULL for an empty input', body: c`int *copy = clone_ints(NULL, 0);
CHECK(copy == NULL);
free(copy);` },
            { label: 'Rejects a byte count that would overflow', body: c`int value = 42;
size_t too_many = SIZE_MAX / sizeof value + 1;
int *copy = clone_ints(&value, too_many);
CHECK(copy == NULL);
free(copy);` },
            { label: 'Returns NULL when allocation fails', body: c`const int values[] = { 1, 2 };
FAIL_ALLOCATIONS_AFTER(0);
int *copy = clone_ints(values, 2);
CHECK(copy == NULL);
free(copy);` },
          ],
        },
        {
          id: 'join',
          title: 'Join two strings',
          level: 'core',
          track: true,
          prompt: "Return a newly allocated string made of `left` followed by `right`. The caller will free it. Return `NULL` if allocation fails. Neither input may be modified.",
          signature: 'char *join(const char *left, const char *right)',
          starter: c`char *join(const char *left, const char *right) {
    return NULL;
}`,
          hints: [
            "Measure both strings. The result needs room for both sets of characters and one terminator.",
            "Copy `left` to the start of the block, and `right` to the position just after it: `result + left_length`.",
            "Copying `right_length + 1` bytes for the second piece brings its terminator along.",
          ],
          solution: c`char *join(const char *left, const char *right) {
    size_t left_length = strlen(left);
    size_t right_length = strlen(right);
    char *result = malloc(left_length + right_length + 1);
    if (result == NULL) {
        return NULL;
    }
    memcpy(result, left, left_length);
    memcpy(result + left_length, right, right_length + 1);
    return result;
}`,
          tests: [
            { label: 'Joins two strings', body: c`char *joined = join("field", " manual");
CHECK(joined != NULL);
if (joined != NULL) {
    CHECK(strcmp(joined, "field manual") == 0);
}
free(joined);` },
            { label: 'Allocates exactly enough', body: c`char *joined = join("ab", "cde");
CHECK(joined != NULL);
if (joined != NULL) {
    CHECK(BLOCK_SIZE(joined) == 6);
}
free(joined);` },
            { label: 'Handles empty pieces', body: c`char *left_empty = join("", "x");
char *right_empty = join("x", "");
char *both_empty = join("", "");
CHECK(left_empty != NULL && right_empty != NULL && both_empty != NULL);
if (left_empty != NULL && right_empty != NULL && both_empty != NULL) {
    CHECK(strcmp(left_empty, "x") == 0);
    CHECK(strcmp(right_empty, "x") == 0);
    CHECK(both_empty[0] == '\0');
}
free(left_empty);
free(right_empty);
free(both_empty);` },
            { label: 'Returns NULL when allocation fails', body: c`FAIL_ALLOCATIONS_AFTER(0);
char *joined = join("a", "b");
CHECK(joined == NULL);
free(joined);` },
          ],
        },
        {
          id: 'make-buffers',
          title: 'Free on every path',
          level: 'core',
          kind: 'fix',
          track: true,
          prompt: [
            "`make_buffers` allocates two blocks. On success it stores them through `first` and `second` and returns `true`. On failure it must return `false`, store nothing, and leave nothing allocated.",
            "It works when both allocations succeed. One of the tests makes the second allocation fail. Run the tests and see what the checking allocator reports.",
          ],
          signature: 'bool make_buffers(size_t size, char **first, char **second)',
          starter: c`bool make_buffers(size_t size, char **first, char **second) {
    char *a = malloc(size);
    if (a == NULL) {
        return false;
    }
    char *b = malloc(size);
    if (b == NULL) {
        return false;
    }
    *first = a;
    *second = b;
    return true;
}`,
          hints: [
            "When the second allocation fails, what happens to the block `a` points to?",
            "Free `a` before returning from that branch.",
          ],
          solution: c`bool make_buffers(size_t size, char **first, char **second) {
    char *a = malloc(size);
    if (a == NULL) {
        return false;
    }
    char *b = malloc(size);
    if (b == NULL) {
        free(a);
        return false;
    }
    *first = a;
    *second = b;
    return true;
}`,
          tests: [
            { label: 'Delivers two separate blocks', body: c`char *first = NULL;
char *second = NULL;
CHECK(make_buffers(16, &first, &second));
CHECK(first != NULL && second != NULL && first != second);
free(first);
free(second);` },
            { label: 'Fails cleanly when the first allocation fails', body: c`char *first = NULL;
char *second = NULL;
FAIL_ALLOCATIONS_AFTER(0);
CHECK(!make_buffers(16, &first, &second));
CHECK(first == NULL && second == NULL);` },
            { label: 'Fails cleanly when the second allocation fails', body: c`char *first = NULL;
char *second = NULL;
FAIL_ALLOCATIONS_AFTER(1);
CHECK(!make_buffers(16, &first, &second));
CHECK(first == NULL && second == NULL);` },
          ],
        },
        {
          id: 'list-reserve',
          title: 'Reserve and destroy',
          level: 'core',
          track: true,
          prompt: [
            "Write two functions for the growable array from the lesson.",
            "`list_reserve` makes sure the list has room for at least `capacity` elements, keeping its contents and its length. It never shrinks the list. It returns `false`, leaving the list exactly as it was, if memory cannot be allocated.",
            "`list_destroy` frees the list's storage and resets all three members to zero, so that the struct is an empty list again and destroying it twice is harmless.",
          ],
          prelude: c`struct IntList {
    int *data;
    size_t length;
    size_t capacity;
};`,
          signature: 'bool list_reserve(struct IntList *list, size_t capacity)\nvoid list_destroy(struct IntList *list)',
          starter: c`bool list_reserve(struct IntList *list, size_t capacity) {
    return false;
}

void list_destroy(struct IntList *list) {
}`,
          hints: [
            "If the list already has enough capacity, there is nothing to do: return `true`.",
            "Receive the result of `realloc` in a local variable. Update `list->data` and `list->capacity` only when it is not `NULL`.",
            "In `list_destroy`, `free(list->data)` is safe even when `data` is `NULL`. Then assign `*list = (struct IntList){ 0 };`",
          ],
          solution: c`bool list_reserve(struct IntList *list, size_t capacity) {
    if (capacity <= list->capacity) {
        return true;
    }
    int *data = realloc(list->data, capacity * sizeof *data);
    if (data == NULL) {
        return false;
    }
    list->data = data;
    list->capacity = capacity;
    return true;
}

void list_destroy(struct IntList *list) {
    free(list->data);
    *list = (struct IntList){ 0 };
}`,
          tests: [
            { label: 'Reserves room in an empty list', body: c`struct IntList list = { 0 };
CHECK(list_reserve(&list, 8));
CHECK(list.data != NULL && list.capacity >= 8 && list.length == 0);
free(list.data);` },
            { label: 'Keeps the contents when it grows', body: c`struct IntList list = { 0 };
CHECK(list_reserve(&list, 2));
if (list.data != NULL) {
    list.data[0] = 11;
    list.data[1] = 22;
    list.length = 2;
    CHECK(list_reserve(&list, 100));
    CHECK(list.capacity >= 100 && list.length == 2);
    CHECK(list.data[0] == 11 && list.data[1] == 22);
}
free(list.data);` },
            { label: 'Never shrinks', body: c`struct IntList list = { 0 };
CHECK(list_reserve(&list, 16));
int *before = list.data;
CHECK(list_reserve(&list, 4));
CHECK(list.capacity >= 16 && list.data == before);
free(list.data);` },
            { label: 'Leaves the list intact when allocation fails', body: c`struct IntList list = { 0 };
CHECK(list_reserve(&list, 2));
if (list.data != NULL) {
    list.data[0] = 7;
    list.length = 1;
    int *before = list.data;
    FAIL_ALLOCATIONS_AFTER(0);
    CHECK(!list_reserve(&list, 64));
    CHECK(list.data == before && list.capacity == 2 && list.length == 1 && list.data[0] == 7);
}
free(list.data);` },
            { label: 'Destroy frees the storage and can be repeated', body: c`struct IntList list = { 0 };
CHECK(list_reserve(&list, 8));
list_destroy(&list);
CHECK(list.data == NULL && list.length == 0 && list.capacity == 0);
CHECK(LIVE_ALLOCATIONS() == 0);
list_destroy(&list);
CHECK(list.data == NULL);` },
          ],
        },
        {
          id: 'filter-positive',
          title: 'Filter into a new array',
          level: 'stretch',
          track: true,
          prompt: [
            "Return a new heap array holding the values from the first `count` elements that are greater than zero, in their original order. Store how many there are in `*out_count`. The caller will free the array.",
            "The block must be exactly large enough for the values kept. If there are none, or if allocation fails, return `NULL` and set `*out_count` to zero.",
          ],
          signature: 'int *filter_positive(const int *values, size_t count, size_t *out_count)',
          starter: c`int *filter_positive(const int *values, size_t count, size_t *out_count) {
    *out_count = 0;
    return NULL;
}`,
          hints: [
            "Two passes keep it simple: count the positive values, allocate exactly that many, then copy them.",
            "Set `*out_count` to zero at the top, so that every early return leaves it correct.",
            "During the copy, use a separate index for the next free position in the result.",
          ],
          solution: c`int *filter_positive(const int *values, size_t count, size_t *out_count) {
    *out_count = 0;

    size_t kept = 0;
    for (size_t i = 0; i < count; ++i) {
        if (values[i] > 0) {
            ++kept;
        }
    }
    if (kept == 0) {
        return NULL;
    }

    int *result = malloc(kept * sizeof *result);
    if (result == NULL) {
        return NULL;
    }
    size_t next = 0;
    for (size_t i = 0; i < count; ++i) {
        if (values[i] > 0) {
            result[next++] = values[i];
        }
    }
    *out_count = kept;
    return result;
}`,
          tests: [
            { label: 'Keeps positive values in order', body: c`const int values[] = { 3, -1, 0, 8, -5, 2 };
size_t kept = 99;
int *result = filter_positive(values, 6, &kept);
CHECK(result != NULL && kept == 3);
if (result != NULL && kept == 3) {
    CHECK(result[0] == 3 && result[1] == 8 && result[2] == 2);
}
free(result);` },
            { label: 'Allocates exactly the room it uses', body: c`const int values[] = { 1, -1, 2, -2, 3, -3, -4, -5 };
size_t kept = 0;
int *result = filter_positive(values, 8, &kept);
CHECK(result != NULL);
if (result != NULL) {
    CHECK(BLOCK_SIZE(result) == 3 * sizeof(int));
}
free(result);` },
            { label: 'Returns NULL and zero when nothing qualifies', body: c`const int values[] = { -3, 0, -7 };
size_t kept = 99;
int *result = filter_positive(values, 3, &kept);
CHECK(result == NULL && kept == 0);
free(result);
kept = 99;
result = filter_positive(values, 0, &kept);
CHECK(result == NULL && kept == 0);
free(result);` },
            { label: 'Returns NULL and zero when allocation fails', body: c`const int values[] = { 1, 2, 3 };
size_t kept = 99;
FAIL_ALLOCATIONS_AFTER(0);
int *result = filter_positive(values, 3, &kept);
CHECK(result == NULL && kept == 0);
free(result);` },
          ],
        },
      ],
    },

    {
      id: 'linked-structures',
      title: 'Linked lists & trees',
      category: part,
      minutes: 35,
      summary: 'Structures built from heap nodes that point at each other. Linked lists are where pointers to structs, pointers to pointers and ownership all have to work together.',
      topics: ['Nodes', 'Traversal', 'Insertion', 'Pointer to a link', 'Freeing', 'Trees'],
      sections: [
        {
          title: 'Nodes and links',
          body: [
            "A linked list is a chain of structs. Each one holds a value and a pointer to the next, and the last one holds `NULL`. The list as a whole is identified by a pointer to its first node, usually called the head.",
            { run: c`#include <stdio.h>

struct Node {
    int value;
    struct Node *next;      // The next node, or NULL at the end of the list.
};

int main(void) {
    struct Node third = { 30, NULL };
    struct Node second = { 20, &third };
    struct Node first = { 10, &second };
    const struct Node *head = &first;

    for (const struct Node *node = head; node != NULL; node = node->next) {
        printf("%d ", node->value);
    }
    printf("\n");
    return 0;
}`, name: 'nodes.c', expect: '10 20 30 \n' },
            { memory: {
              title: 'Three nodes and a head pointer',
              vars: [
                { id: 'head', type: 'struct Node *' },
                { id: 'first', type: 'struct Node', fields: [['value', 'int'], ['next', 'struct Node *']] },
                { id: 'second', type: 'struct Node', fields: [['value', 'int'], ['next', 'struct Node *']] },
                { id: 'third', type: 'struct Node', fields: [['value', 'int'], ['next', 'struct Node *']] },
              ],
              set: {
                head: '&first',
                first: { value: 10, next: '&second' },
                second: { value: 20, next: '&third' },
                third: { value: 30, next: 'NULL' },
              },
            } },
            "The loop is worth learning as a unit. `node = node->next` is to a list what `++p` is to an array, and `node != NULL` is its end test. An empty list is simply a head pointer that is `NULL`.",
          ],
        },
        {
          title: 'Adding a node at the front',
          body: [
            "Those nodes were local variables, which is fine for a demonstration. A real list allocates each node on the heap, so that nodes outlive the function that adds them.",
            "Adding at the front changes which node is first, so the function has to change the caller's head pointer. As the pointers-to-pointers lesson said, that means it takes the head pointer's address.",
            { trace: {
              title: 'Pushing two values onto an empty list',
              code: c`bool push_front(struct Node **head, int value) {
    struct Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return false;
    }
    node->value = value;
    node->next = *head;
    *head = node;
    return true;
}

int main(void) {
    struct Node *list = NULL;
    push_front(&list, 20);
    push_front(&list, 10);
    return 0;
}`,
              vars: [
                { id: 'list', type: 'struct Node *', frame: 'main' },
                { id: 'head', type: 'struct Node **', frame: 'push_front' },
                { id: 'value', type: 'int', frame: 'push_front' },
                { id: 'node', type: 'struct Node *', frame: 'push_front' },
                { id: 'n1', name: 'first block', type: 'struct Node', frame: 'heap', fields: [['value', 'int'], ['next', 'struct Node *']] },
                { id: 'n2', name: 'second block', type: 'struct Node', frame: 'heap', fields: [['value', 'int'], ['next', 'struct Node *']] },
              ],
              steps: [
                { line: 13, set: { list: 'NULL' }, say: "The list starts empty: a null head pointer." },
                { line: 14, set: { head: '&list', value: 20 }, say: "The first call receives the address of `list`, so `head` is a pointer to a pointer." },
                { line: 2, show: ['n1'], set: { node: '&n1' }, say: "`malloc` provides room for one node. Its members are indeterminate." },
                { line: 6, set: { 'n1.value': 20 }, say: "Store the value." },
                { line: 7, set: { 'n1.next': 'NULL' }, say: "The new node's `next` becomes whatever the list used to start with. `*head` is `list`, which is `NULL`, so this node is also the last." },
                { line: 8, set: { list: '&n1' }, say: "`*head = node` writes into `main`'s `list`. The list now begins at the new node." },
                { line: 9, hide: ['frame:push_front'], say: "The call returns. Its locals are gone, and the heap node remains, reachable from `list`." },
                { line: 15, set: { head: '&list', value: 10 }, say: "The second call, again with the address of `list`." },
                { line: 2, show: ['n2'], set: { node: '&n2' }, say: "A second block from the heap." },
                { line: [6, 7], set: { n2: { value: 10, next: '&n1' } }, say: "This time `*head` is the address of the first node, so the new node links to it." },
                { line: 8, set: { list: '&n2' }, say: "And `list` is re-aimed at the new node. The order matters: had `*head` been overwritten before it was copied into `node->next`, the old list would have been lost." },
                { line: 9, hide: ['frame:push_front'], say: "The list now reads 10, then 20, then `NULL`. Each push put its value in front of the last." },
              ],
            } },
          ],
        },
        {
          title: 'Freeing a list',
          body: [
            "The list owns its nodes, so discarding the list means freeing every one. There is a trap in the obvious loop: after `free(node)`, the node's `next` member is part of freed memory and must not be read.",
            { code: c`// Wrong: the loop step reads node->next after node has been freed.
for (struct Node *node = head; node != NULL; node = node->next) {
    free(node);
}

// Right: read the link first, then free.
while (head != NULL) {
    struct Node *next = head->next;
    free(head);
    head = next;
}` },
            "The wrong version often appears to work, because freeing a block rarely changes its contents straight away. It is still a use after free, and the checking allocator in the challenges will catch it.",
          ],
        },
        {
          title: 'A pointer to the link',
          body: [
            "Removing a node from the middle means changing the `next` pointer of the node before it. Removing the first node means changing the head pointer instead. Written naively, that is two cases and a variable to remember the previous node.",
            "There is a neater way. Both the head and every `next` member are the same kind of thing: a `struct Node *` that leads to a node. So walk the list with a pointer to **that pointer**. It starts at the head and moves on to each node's `next` member in turn.",
            { trace: {
              title: 'Removing the node holding 20',
              code: c`bool remove_first(struct Node **head, int value) {
    struct Node **link = head;
    while (*link != NULL && (*link)->value != value) {
        link = &(*link)->next;
    }
    if (*link == NULL) {
        return false;
    }
    struct Node *doomed = *link;
    *link = doomed->next;
    free(doomed);
    return true;
}`,
              vars: [
                { id: 'list', type: 'struct Node *', frame: 'main' },
                { id: 'link', type: 'struct Node **', frame: 'remove_first' },
                { id: 'doomed', type: 'struct Node *', frame: 'remove_first' },
                { id: 'a', name: 'node', type: 'struct Node', frame: 'heap', fields: [['value', 'int'], ['next', 'struct Node *']] },
                { id: 'b', name: 'node', type: 'struct Node', frame: 'heap', fields: [['value', 'int'], ['next', 'struct Node *']] },
                { id: 'c', name: 'node', type: 'struct Node', frame: 'heap', fields: [['value', 'int'], ['next', 'struct Node *']] },
              ],
              steps: [
                { line: 1, set: { list: '&a', a: { value: 10, next: '&b' }, b: { value: 20, next: '&c' }, c: { value: 30, next: 'NULL' } }, say: "The caller's list holds 10, 20 and 30. It calls `remove_first(&list, 20)`." },
                { line: 2, set: { link: '&list' }, say: "`link` starts by pointing at the head pointer itself. `*link` is the first node." },
                { line: 3, say: "`*link` is not null, and its value is 10, not 20. The loop body runs." },
                { line: 4, set: { link: '&a.next' }, say: "`&(*link)->next` is the address of the `next` member inside the node holding 10. `link` now points at the pointer that leads to 20." },
                { line: 3, say: "`*link` is the node holding 20. That is the value we want, so the loop ends." },
                { line: 9, set: { doomed: '&b' }, say: "Remember the node that is about to be unlinked, so that it can be freed." },
                { line: 10, set: { 'a.next': '&c' }, say: "`*link = doomed->next` makes the pointer that led to 20 lead to 30 instead. Had 20 been the first node, `link` would still be `&list`, and this same line would have updated the head." },
                { line: 11, dead: ['b'], say: "The node is no longer part of the list, so it is freed. Skipping this step would leak it." },
                { line: 12, hide: ['frame:remove_first'], say: "The list now holds 10 and 30. There was no special case for the head and no “previous” variable." },
              ],
            } },
            "`&(*link)->next` is the densest expression in this manual, so take it apart once: `*link` is a pointer to the current node, `->next` is that node's link, and `&` takes the address of the link. The same loop finds the right place for an insertion, including an insertion at the very end, where `*link` is the final `NULL`.",
          ],
        },
        {
          title: 'Trees, and when to use any of this',
          body: [
            "Give each node two links and you have a binary tree. The technique carries over directly, and recursion fits the shape: a tree is either empty, or a node with two smaller trees below it.",
            { run: c`#include <stdio.h>
#include <stdlib.h>

struct Tree {
    int value;
    struct Tree *left;
    struct Tree *right;
};

// Walks down to the empty link where value belongs, then fills it.
void insert(struct Tree **root, int value) {
    struct Tree **link = root;
    while (*link != NULL) {
        link = value < (*link)->value ? &(*link)->left : &(*link)->right;
    }
    struct Tree *node = malloc(sizeof *node);
    if (node == NULL) {
        return;
    }
    *node = (struct Tree){ .value = value };     // left and right start as NULL.
    *link = node;
}

void print_in_order(const struct Tree *tree) {
    if (tree == NULL) {
        return;
    }
    print_in_order(tree->left);
    printf("%d ", tree->value);
    print_in_order(tree->right);
}

void destroy(struct Tree *tree) {
    if (tree == NULL) {
        return;
    }
    destroy(tree->left);
    destroy(tree->right);
    free(tree);                 // Children first, then the node itself.
}

int main(void) {
    struct Tree *root = NULL;
    int values[] = { 50, 20, 70, 10, 30, 60 };
    for (size_t i = 0; i < 6; ++i) {
        insert(&root, values[i]);
    }
    print_in_order(root);
    printf("\n");
    destroy(root);
    return 0;
}`, name: 'tree.c', expect: '10 20 30 50 60 70 \n' },
            "A word on when to reach for a linked structure. For a plain sequence of values, a growable array is nearly always the better choice: it uses less memory, and walking contiguous memory is far faster than chasing pointers. Lists earn their place when elements must be inserted or removed in the middle without moving the others, or when other code holds pointers to elements that must stay valid. Trees, graphs and hash tables are a different matter. They cannot be built any other way, and they use exactly the techniques in this lesson.",
          ],
        },
      ],
      takeaways: [
        "A list is a head pointer and nodes linked by `next`. `NULL` marks the end.",
        "A function that may change which node is first takes `struct Node **`.",
        "Read a node's `next` before freeing the node.",
        "Walking with a pointer to the link removes the special case for the head.",
        "Whoever unlinks a node becomes responsible for freeing it.",
      ],
      quiz: [
        {
          q: 'Why must a loop that frees a list copy `node->next` before calling `free(node)`?',
          options: [
            { t: 'Because `free` sets `node` to `NULL`', why: "`free` receives a copy of the pointer and cannot change the caller's variable." },
            { t: 'Because after `free(node)`, the node\'s members are freed memory and must not be read', ok: true, why: "`node->next` lives inside the block that was just released. Reading it afterward is a use after free." },
            { t: 'Because `free` releases the whole list', why: "`free` releases exactly one block. It knows nothing about the `next` pointers inside it." },
          ],
        },
        {
          q: 'What is wrong with this function?',
          code: c`void push(struct Node *head, int value) {
    struct Node *node = malloc(sizeof *node);
    node->value = value;
    node->next = head;
    head = node;
}`,
          options: [
            { t: 'It should set `node->next` to `NULL`', why: "Linking the new node to the old first node is correct for a push at the front." },
            { t: '`head = node` changes only the function\'s copy, so the caller\'s list is unchanged and the new node is leaked', ok: true, why: "The parameter must be `struct Node **head`, with `*head = node` at the end. It also needs to check `malloc` for `NULL`." },
            { t: 'A node cannot be allocated with `sizeof *node`', why: "`sizeof *node` is the size of a `struct Node`, which is exactly right." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>
#include <stdlib.h>

struct Node {
    int value;
    struct Node *next;
};

void push_front(struct Node **head, int value) {
    struct Node *node = malloc(sizeof *node);
    if (node == NULL) {
        exit(EXIT_FAILURE);
    }
    node->value = value;
    node->next = *head;
    *head = node;
}

int main(void) {
    struct Node *list = NULL;
    for (int i = 1; i <= 3; ++i) {
        push_front(&list, i);
    }
    while (list != NULL) {
        struct Node *next = list->next;
        printf("%d ", list->value);
        free(list);
        list = next;
    }
    printf("\n");
    return 0;
}`,
          answer: '3 2 1',
          explain: "Each push places its value ahead of everything already in the list, so the values come back out in reverse order.",
        },
        {
          q: 'In the loop `for (struct Node **link = &head; *link != NULL; link = &(*link)->next)`, what does `link` point at?',
          options: [
            { t: 'A node', why: "`*link` points at a node. `link` is one level further out." },
            { t: 'Either the head pointer or the `next` member of some node', ok: true, why: "It always points at the pointer that leads to the current node. That is what makes inserting or removing there a single assignment through `*link`." },
            { t: 'The value stored in a node', why: "That would be an `int *`. `link` is a `struct Node **`." },
          ],
        },
        {
          q: 'What does `list = list->next;` do if no other pointer to the first node exists?',
          options: [
            { t: 'Frees the first node', why: "Nothing is freed unless `free` is called." },
            { t: 'Leaks the first node', ok: true, why: "The node is still allocated, but its address has been lost, so it can never be freed. Keep the pointer, advance, then free the old node." },
            { t: 'Does nothing', why: "It moves the head pointer forward by one node." },
          ],
        },
        {
          kind: 'predict',
          q: 'What does this program print?',
          code: c`#include <stdio.h>

struct Node {
    int value;
    struct Node *next;
};

int main(void) {
    struct Node c = { 3, NULL };
    struct Node b = { 2, &c };
    struct Node a = { 1, &b };

    a.next = a.next->next;

    int sum = 0;
    for (struct Node *node = &a; node != NULL; node = node->next) {
        sum += node->value;
    }
    printf("%d\n", sum);
    return 0;
}`,
          answer: '4',
          explain: "`a.next->next` is the address of `c`. Assigning it to `a.next` unlinks `b`, so the walk visits 1 and 3.",
        },
      ],
      challenges: [
        {
          id: 'list-length',
          title: 'Count the nodes',
          level: 'warm-up',
          prompt: "Return the number of nodes in the list. An empty list is a null pointer and has length zero.",
          prelude: nodeStruct,
          signature: 'size_t list_length(const struct Node *head)',
          starter: c`size_t list_length(const struct Node *head) {
    return 0;
}`,
          hints: ["`for (const struct Node *node = head; node != NULL; node = node->next)` visits each node once."],
          solution: c`size_t list_length(const struct Node *head) {
    size_t length = 0;
    for (const struct Node *node = head; node != NULL; node = node->next) {
        ++length;
    }
    return length;
}`,
          tests: [
            { label: 'An empty list', body: c`CHECK(list_length(NULL) == 0);` },
            { label: 'A single node', body: c`struct Node only = { 5, NULL };
CHECK(list_length(&only) == 1);` },
            { label: 'Several nodes', body: c`struct Node third = { 30, NULL };
struct Node second = { 20, &third };
struct Node first = { 10, &second };
CHECK(list_length(&first) == 3);
CHECK(list_length(&second) == 2);` },
          ],
        },
        {
          id: 'list-push-front',
          title: 'Push to the front',
          level: 'core',
          track: true,
          prompt: "Allocate a node holding `value` and make it the first node of the list. Return `true` on success. If allocation fails, return `false` and leave the list exactly as it was. Write it without looking back at the lesson.",
          prelude: listHelpers,
          signature: 'bool list_push_front(struct Node **head, int value)',
          starter: c`bool list_push_front(struct Node **head, int value) {
    return false;
}`,
          hints: [
            "Allocate with `malloc(sizeof *node)` and check for `NULL`.",
            "The new node's `next` is the old first node, `*head`. Set it before you change `*head`.",
          ],
          solution: c`bool list_push_front(struct Node **head, int value) {
    struct Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return false;
    }
    node->value = value;
    node->next = *head;
    *head = node;
    return true;
}`,
          tests: [
            { label: 'Pushes onto an empty list', body: c`struct Node *list = NULL;
CHECK(list_push_front(&list, 7));
CHECK(list_equals(list, (int[]){ 7 }, 1));
drop_list(list);` },
            { label: 'New values go in front', body: c`struct Node *list = NULL;
CHECK(list_push_front(&list, 3));
CHECK(list_push_front(&list, 2));
CHECK(list_push_front(&list, 1));
CHECK(list_equals(list, (int[]){ 1, 2, 3 }, 3));
drop_list(list);` },
            { label: 'Leaves the list alone when allocation fails', body: c`struct Node *list = make_list((int[]){ 5, 6 }, 2);
struct Node *before = list;
FAIL_ALLOCATIONS_AFTER(0);
CHECK(!list_push_front(&list, 4));
CHECK(list == before && list_equals(list, (int[]){ 5, 6 }, 2));
drop_list(list);` },
          ],
        },
        {
          id: 'list-free',
          title: 'Free without touching freed memory',
          level: 'core',
          kind: 'fix',
          broken: 'crash',
          track: true,
          prompt: [
            "`list_free` should free every node and set the caller's head pointer to `NULL`. It contains the use after free described in the lesson.",
            "Run the tests first. The checking allocator overwrites a block the moment it is freed, so the stale read goes somewhere invalid and the program is stopped. Then fix the loop.",
          ],
          prelude: listHelpers,
          signature: 'void list_free(struct Node **head)',
          starter: c`void list_free(struct Node **head) {
    for (struct Node *node = *head; node != NULL; node = node->next) {
        free(node);
    }
    *head = NULL;
}`,
          hints: [
            "The loop's step, `node = node->next`, runs after `free(node)`.",
            "Save `node->next` in a local variable before freeing, and continue from that.",
          ],
          solution: c`void list_free(struct Node **head) {
    struct Node *node = *head;
    while (node != NULL) {
        struct Node *next = node->next;
        free(node);
        node = next;
    }
    *head = NULL;
}`,
          tests: [
            { label: 'Frees every node and clears the head', body: c`struct Node *list = make_list((int[]){ 1, 2, 3 }, 3);
list_free(&list);
CHECK(list == NULL);
CHECK(LIVE_ALLOCATIONS() == 0);` },
            { label: 'Frees a single node', body: c`struct Node *list = make_list((int[]){ 9 }, 1);
list_free(&list);
CHECK(list == NULL);
CHECK(LIVE_ALLOCATIONS() == 0);` },
            { label: 'Accepts an empty list', body: c`struct Node *list = NULL;
list_free(&list);
CHECK(list == NULL);` },
          ],
        },
        {
          id: 'list-push-back',
          title: 'Append to the end',
          level: 'core',
          track: true,
          prompt: "Allocate a node holding `value` and add it after the last node of the list. Return `true` on success. If allocation fails, return `false` and leave the list as it was. The list may be empty, in which case the new node becomes the head.",
          prelude: listHelpers,
          signature: 'bool list_push_back(struct Node **head, int value)',
          starter: c`bool list_push_back(struct Node **head, int value) {
    return false;
}`,
          hints: [
            "Walk a `struct Node **link` from `head` until `*link` is `NULL`. It then points at the pointer that should lead to the new node.",
            "That pointer is either the head itself, for an empty list, or the last node's `next`. One assignment, `*link = node`, covers both.",
            "The new node's `next` must be `NULL`.",
          ],
          solution: c`bool list_push_back(struct Node **head, int value) {
    struct Node *node = malloc(sizeof *node);
    if (node == NULL) {
        return false;
    }
    node->value = value;
    node->next = NULL;

    struct Node **link = head;
    while (*link != NULL) {
        link = &(*link)->next;
    }
    *link = node;
    return true;
}`,
          tests: [
            { label: 'Appends to an empty list', body: c`struct Node *list = NULL;
CHECK(list_push_back(&list, 4));
CHECK(list_equals(list, (int[]){ 4 }, 1));
drop_list(list);` },
            { label: 'Keeps the order of insertion', body: c`struct Node *list = NULL;
CHECK(list_push_back(&list, 1));
CHECK(list_push_back(&list, 2));
CHECK(list_push_back(&list, 3));
CHECK(list_equals(list, (int[]){ 1, 2, 3 }, 3));
drop_list(list);` },
            { label: 'Does not move the head of a non-empty list', body: c`struct Node *list = make_list((int[]){ 8 }, 1);
struct Node *before = list;
CHECK(list_push_back(&list, 9));
CHECK(list == before && list_equals(list, (int[]){ 8, 9 }, 2));
drop_list(list);` },
            { label: 'Leaves the list alone when allocation fails', body: c`struct Node *list = make_list((int[]){ 1, 2 }, 2);
FAIL_ALLOCATIONS_AFTER(0);
CHECK(!list_push_back(&list, 3));
CHECK(list_equals(list, (int[]){ 1, 2 }, 2));
drop_list(list);` },
          ],
        },
        {
          id: 'list-remove-all',
          title: 'Remove every match',
          level: 'core',
          track: true,
          prompt: [
            "Unlink and free every node whose value equals `value`. Return how many nodes were removed. The remaining nodes keep their order.",
            "Matches may be at the head, at the end, or next to each other. Use a pointer to the link, as in the lesson, and think about what to do with it after a removal.",
          ],
          prelude: listHelpers,
          signature: 'size_t list_remove_all(struct Node **head, int value)',
          starter: c`size_t list_remove_all(struct Node **head, int value) {
    return 0;
}`,
          hints: [
            "Loop while `*link != NULL`. In each pass, either remove the node at `*link`, or move `link` on to `&(*link)->next`.",
            "After a removal, do not advance. `*link` already leads to the node that came after the one removed, and that node has not been examined yet.",
            "To remove: save `*link` in a local, set `*link` to its `next`, then free the saved node.",
          ],
          solution: c`size_t list_remove_all(struct Node **head, int value) {
    size_t removed = 0;
    struct Node **link = head;
    while (*link != NULL) {
        if ((*link)->value == value) {
            struct Node *doomed = *link;
            *link = doomed->next;
            free(doomed);
            ++removed;
        } else {
            link = &(*link)->next;
        }
    }
    return removed;
}`,
          tests: [
            { label: 'Removes a node from the middle', body: c`struct Node *list = make_list((int[]){ 1, 2, 3 }, 3);
CHECK(list_remove_all(&list, 2) == 1);
CHECK(list_equals(list, (int[]){ 1, 3 }, 2));
drop_list(list);` },
            { label: 'Removes matches at the head and the end', body: c`struct Node *list = make_list((int[]){ 7, 1, 2, 7 }, 4);
CHECK(list_remove_all(&list, 7) == 2);
CHECK(list_equals(list, (int[]){ 1, 2 }, 2));
drop_list(list);` },
            { label: 'Removes matches that sit next to each other', body: c`struct Node *list = make_list((int[]){ 1, 5, 5, 5, 2 }, 5);
CHECK(list_remove_all(&list, 5) == 3);
CHECK(list_equals(list, (int[]){ 1, 2 }, 2));
drop_list(list);` },
            { label: 'Can empty the list', body: c`struct Node *list = make_list((int[]){ 4, 4 }, 2);
CHECK(list_remove_all(&list, 4) == 2);
CHECK(list == NULL);` },
            { label: 'Removes nothing when there is no match', body: c`struct Node *list = make_list((int[]){ 1, 2 }, 2);
CHECK(list_remove_all(&list, 9) == 0);
CHECK(list_equals(list, (int[]){ 1, 2 }, 2));
drop_list(list);
struct Node *empty = NULL;
CHECK(list_remove_all(&empty, 9) == 0);` },
          ],
        },
        {
          id: 'list-reverse',
          title: 'Reverse a list in place',
          level: 'stretch',
          track: true,
          prompt: "Reverse the order of the nodes by re-pointing their `next` members, and update the caller's head. Do not allocate or free anything, and do not move the values between nodes.",
          prelude: listHelpers,
          signature: 'void list_reverse(struct Node **head)',
          starter: c`void list_reverse(struct Node **head) {
}`,
          hints: [
            "Walk the list with two pointers: `previous`, starting at `NULL`, and `current`, starting at `*head`.",
            "At each node: save `current->next`, point `current->next` back at `previous`, then move both pointers forward one step.",
            "When `current` runs off the end, `previous` is the new first node.",
          ],
          solution: c`void list_reverse(struct Node **head) {
    struct Node *previous = NULL;
    struct Node *current = *head;
    while (current != NULL) {
        struct Node *next = current->next;
        current->next = previous;
        previous = current;
        current = next;
    }
    *head = previous;
}`,
          tests: [
            { label: 'Reverses several nodes', body: c`struct Node *list = make_list((int[]){ 1, 2, 3, 4 }, 4);
list_reverse(&list);
CHECK(list_equals(list, (int[]){ 4, 3, 2, 1 }, 4));
drop_list(list);` },
            { label: 'Re-links the same nodes instead of copying values', body: c`struct Node *list = make_list((int[]){ 1, 2, 3 }, 3);
struct Node *first = list;
struct Node *last = list->next->next;
list_reverse(&list);
CHECK(list == last);
CHECK(first->next == NULL);
CHECK(ALLOCATION_COUNT() == 3);
drop_list(list);` },
            { label: 'Handles two nodes', body: c`struct Node *list = make_list((int[]){ 1, 2 }, 2);
list_reverse(&list);
CHECK(list_equals(list, (int[]){ 2, 1 }, 2));
drop_list(list);` },
            { label: 'Handles one node and none', body: c`struct Node *list = make_list((int[]){ 5 }, 1);
list_reverse(&list);
CHECK(list_equals(list, (int[]){ 5 }, 1));
drop_list(list);
struct Node *empty = NULL;
list_reverse(&empty);
CHECK(empty == NULL);` },
          ],
        },
      ],
    },
  );
})();
