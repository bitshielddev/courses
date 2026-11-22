// Builds the C test program for a challenge and reads its results back.
window.CTestDriver = (() => {
  'use strict';

  const headers = ['stdio.h', 'stdlib.h', 'stddef.h', 'string.h', 'stdint.h', 'stdbool.h', 'limits.h', 'ctype.h'];

  // A checking allocator for the memory challenges. It never reuses an address
  // within a test, fills new blocks with 0xCD and freed blocks with 0xDD, and
  // puts guard bytes after each block, so the usual heap mistakes show up as
  // failed tests instead of going unnoticed.
  const tracker = String.raw`
#define FM_SLOTS 1024
#define FM_GUARD 8
#define FM_UNUSED __attribute__((unused))
struct fm_slot { unsigned char *block; size_t size; int live; };
static struct fm_slot fm_slots[FM_SLOTS];
static size_t fm_used, fm_live, fm_allocs, fm_bad_frees, fm_overruns;
static long fm_budget = -1;

static int fm_guard_ok(const struct fm_slot *slot)
{
    for (size_t i = 0; i < FM_GUARD; ++i) {
        if (slot->block[slot->size + i] != 0xA5) return 0;
    }
    return 1;
}

static void *fm_new(size_t size, int fill)
{
    if (fm_budget == 0 || fm_used == FM_SLOTS || size > SIZE_MAX - FM_GUARD) return NULL;
    unsigned char *block = (malloc)(size + FM_GUARD);
    if (block == NULL) return NULL;
    if (fm_budget > 0) --fm_budget;
    memset(block, fill, size);
    memset(block + size, 0xA5, FM_GUARD);
    fm_slots[fm_used++] = (struct fm_slot){ block, size, 1 };
    ++fm_live;
    ++fm_allocs;
    return block;
}

static struct fm_slot *fm_find(void *pointer)
{
    for (size_t i = fm_used; i-- > 0;) {
        if (fm_slots[i].live && fm_slots[i].block == pointer) return &fm_slots[i];
    }
    return NULL;
}

FM_UNUSED static void fm_free(void *pointer)
{
    if (pointer == NULL) return;
    struct fm_slot *slot = fm_find(pointer);
    if (slot == NULL) {
        ++fm_bad_frees;
        return;
    }
    if (!fm_guard_ok(slot)) ++fm_overruns;
    memset(slot->block, 0xDD, slot->size);
    slot->live = 0;
    --fm_live;
}

FM_UNUSED static void *fm_malloc(size_t size) { return fm_new(size, 0xCD); }

FM_UNUSED static void *fm_calloc(size_t count, size_t size)
{
    if (size != 0 && count > SIZE_MAX / size) return NULL;
    return fm_new(count * size, 0);
}

FM_UNUSED static void *fm_realloc(void *pointer, size_t size)
{
    if (pointer == NULL) return fm_new(size, 0xCD);
    struct fm_slot *slot = fm_find(pointer);
    if (slot == NULL) {
        ++fm_bad_frees;
        return NULL;
    }
    void *moved = fm_new(size, 0xCD);
    if (moved == NULL) return NULL;
    memcpy(moved, slot->block, slot->size < size ? slot->size : size);
    fm_free(pointer);
    return moved;
}

static void fm_reset(void)
{
    for (size_t i = 0; i < fm_used; ++i) (free)(fm_slots[i].block);
    fm_used = fm_live = fm_allocs = fm_bad_frees = fm_overruns = 0;
    fm_budget = -1;
}

FM_UNUSED static size_t fm_block_size(void *pointer)
{
    struct fm_slot *slot = fm_find(pointer);
    return slot == NULL ? 0 : slot->size;
}

#define malloc fm_malloc
#define calloc fm_calloc
#define realloc fm_realloc
#define free fm_free
#define LIVE_ALLOCATIONS() (fm_live)
#define ALLOCATION_COUNT() (fm_allocs)
#define FAIL_ALLOCATIONS_AFTER(count) (fm_budget = (count))
#define BLOCK_SIZE(pointer) fm_block_size(pointer)
`;

  function support(marker, tracked) {
    const finish = tracked ? String.raw`
    for (size_t i = 0; i < fm_used; ++i) {
        if (fm_slots[i].live && !fm_guard_ok(&fm_slots[i])) ++fm_overruns;
    }
    if (fm_bad_frees) {
        fm_ok = 0;
        printf("\n${marker} N %d free() was given a pointer that is not a live allocation (a double free, or a pointer that malloc never returned)\n", index);
    }
    if (fm_overruns) {
        fm_ok = 0;
        printf("\n${marker} N %d Bytes were written past the end of an allocated block\n", index);
    }
    if (fm_live) {
        fm_ok = 0;
        printf("\n${marker} N %d %zu allocation%s never freed\n", index, fm_live, fm_live == 1 ? " was" : "s were");
    }` : '';
    return String.raw`
static int fm_ok;
static int fm_index;

/* WebAssembly lets a program read and write at address 0, so a null pointer
   bug would go unnoticed. The unused bytes there are filled with a marker
   before each test and inspected afterwards. */
#ifdef __wasm__
#define FM_NULL_BYTES 1024
static unsigned char *fm_null_page(void)
{
    static volatile uintptr_t address = 0;
    return (unsigned char *)address;
}
static void fm_arm_null_page(void) { memset(fm_null_page(), 0xEE, FM_NULL_BYTES); }
static int fm_null_page_written(void)
{
    const unsigned char *page = fm_null_page();
    for (size_t i = 0; i < FM_NULL_BYTES; ++i) {
        if (page[i] != 0xEE) return 1;
    }
    return 0;
}
#else
static void fm_arm_null_page(void) {}
static int fm_null_page_written(void) { return 0; }
#endif

#define CHECK(...) do { if (!(__VA_ARGS__)) { fm_ok = 0; printf("\n${marker} F %d %s\n", fm_index, #__VA_ARGS__); } } while (0)

static void fm_run(int index, void (*body)(void))
{
    fm_index = index;
    fm_ok = 1;${tracked ? '\n    fm_reset();' : ''}
    fm_arm_null_page();
    body();
    if (fm_null_page_written()) {
        fm_ok = 0;
        printf("\n${marker} N %d Something was written through a null pointer\n", index);
    }${finish}
    printf("\n${marker} R %d %d\n", index, fm_ok);
    fflush(stdout);
}
`;
  }

  function build(source, challenge, marker) {
    const tracked = Boolean(challenge.track);
    const forbidden = challenge.forbid || [];
    return [
      headers.map(header => `#include <${header}>`).join('\n'),
      tracked ? tracker : '',
      ...forbidden.map(name => `#define ${name} ${name}_is_not_allowed_in_this_challenge`),
      '#define main fm_user_main',
      challenge.prelude ? `#line 1 "provided.h"\n${challenge.prelude}` : '',
      `#line 1 "solution.c"\n${source}\n`,
      '#undef main',
      ...forbidden.map(name => `#undef ${name}`),
      `#line 1 "tests.c"${support(marker, tracked)}`,
      ...challenge.tests.map((test, index) => `static void fm_case_${index}(void)\n{\n${test.body}\n}\n`),
      'int main(void)\n{',
      ...challenge.tests.map((_, index) => `    fm_run(${index}, fm_case_${index});`),
      '    return 0;\n}\n',
    ].filter(Boolean).join('\n');
  }

  // Removes the marker lines from stdout and returns what they reported.
  function parse(stdout, marker, count) {
    const tests = Array.from({ length: count }, () => ({ passed: undefined, failures: [], notes: [] }));
    const cleaned = stdout.replace(
      new RegExp(`\\n?^${marker} ([RFN]) (\\d+) (.*)\\r?\\n`, 'gm'),
      (_, kind, index, detail) => {
        const test = tests[Number(index)];
        if (!test) return '';
        if (kind === 'R') test.passed = detail === '1';
        if (kind === 'F') test.failures.push(detail);
        if (kind === 'N') test.notes.push(detail);
        return '';
      },
    );
    return { stdout: cleaned, tests };
  }

  return { build, parse };
})();
