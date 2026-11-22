(() => {
  const c = String.raw;
  const build = 'cc -std=c17 -Wall -Wextra -Wpedantic -O2 watch.c -o watch';
  const shell = 'nix-shell -p gcc neovim coreutils curl';
  const buildCategory = 'Build the monitor';
  const observeCategory = 'Investigate a save';

  (window.C_LESSONS ||= []).push(
    {
      id: 'scratch-directory',
      category: buildCategory,
      title: 'Set up the experiment',
      summary: 'When you save a file, does its name still point to the same file? Give yourself a quiet directory and a way to check.',
      minutes: 10,
      topics: ['NixOS', 'Directory entries', 'Inodes', 'C headers'],
      sections: [
        {
          title: 'One name, two ways to change the text',
          body: [
            'Suppose you read `note.txt` before and after a save. The new text tells you the save worked. Could you tell whether the editor rewrote the original file or put a different file under the same name?',
            'A directory entry associates a name with a file. Linux gives that file an **inode number** within its filesystem. A program can keep an existing file open even after its name is reassigned. That distinction matters to anything trying to follow an editor’s saves.',
            'You will build a small C program that asks the Linux kernel for notifications about one directory. Then you will run two operations whose purpose you know, compare their traces with a real Neovim save, and write down what the evidence supports.',
          ],
        },
        {
          title: 'Set up two terminals on NixOS',
          body: [
            'Use two terminals on the same Linux NixOS machine, or two SSH sessions to it. Keep the lab on a local Linux filesystem. Terminal A will build and run the watcher. Terminal B will make the changes. The browser holds the lessons, questions and your notebook.',
            'Run this in **each** terminal to enter a shell with the compiler, editor and command-line tools. The first run may download the packages.',
            { shell, name: 'Terminals A and B · NixOS' },
            { tip: ['If Nix reports that it cannot find `<nixpkgs>`, use this flake-based alternative in each terminal.', { shell: "nix --extra-experimental-features 'nix-command flakes' shell 'nixpkgs#gcc' 'nixpkgs#neovim' 'nixpkgs#coreutils' 'nixpkgs#curl' --command bash", name: 'Alternative package shell' }] },
            'Run the next block **once**, in A. It creates a new lab under your home directory and seeds an ordinary file before monitoring starts.',
            { shell: c`lab=$(mktemp -d "$HOME/inotify-lab.XXXXXX")
cd "$lab"
mkdir scratch
printf 'first draft\n' > scratch/note.txt
pwd`, name: 'Terminal A · create the lab' },
            'In B, type `cd` followed by the absolute path printed by A, quoting the path if it contains spaces. Run the next command in both. The device and inode numbers should agree. Keep this lab path if you want to resume later.',
            { shell: "stat -c '%d:%i %n' scratch/note.txt", name: 'Terminals A and B · identify the file' },
            { link: 'https://nix.dev/manual/nix/2.34/command-ref/nix-shell.html', label: 'Nix manual · starting a package shell' },
          ],
        },
      ],
      takeaways: [
        'The pair of device and inode numbers identifies a file at the time you inspect it.',
        'Watching the parent directory lets you see several names involved in a save. Keeping your code and build output outside it makes the trace easier to read.',
      ],
      quiz: [
        {
          q: 'An editor installs a different file under the name `note.txt`. Which observation helps distinguish that from appending to the original?',
          options: [
            { t: 'The name shown by `ls` is still `note.txt`.', why: 'Both operations can leave the same name in the directory.' },
            { t: 'The device and inode for that name changed.', ok: true, why: 'A new pair means the lookup now reaches a different file. You will collect both the identities and the directory events.' },
            { t: 'Reading the file shows different text.', why: 'Both operations can change the bytes a later reader sees.' },
          ],
        },
        {
          q: 'Where should the compiler put the watcher executable for this experiment?',
          options: [
            { t: 'Beside `watch.c` in the lab directory.', ok: true, why: 'The watcher subscribes only to scratch. Rebuilding beside the source leaves build activity outside the observation area.' },
            { t: 'Inside `scratch`, so it can observe other files there.', why: 'The path passed to the watcher chooses its target. The executable can live anywhere.' },
            { t: 'In the Nix store beside the compiler.', why: 'The compiler can write an executable in your own working directory.' },
          ],
        },
      ],
      challenges: [{
        id: 'build-a-probe', kind: 'lab', level: 'core', title: 'Ask the compiler about an event',
        prompt: [
          'In A, create `probe.c` beside `scratch`. Complete the expression to print the size in bytes of the fixed part of a Linux inotify event. The actual type is declared in `<sys/inotify.h>`.',
          { code: c`#include <stdio.h>
#include <sys/inotify.h>

int main(void) {
    printf("Event header: %zu bytes\n", /* your expression */);
    return 0;
}`, name: 'probe.c' },
          { shell: c`cc -std=c17 -Wall -Wextra -Wpedantic probe.c -o probe && ./probe`, name: 'Terminal A · compile and run' },
          'Next, save the starter below as `watch.c` beside `probe.c` on the NixOS machine. For SSH sessions, the curl command fetches the same file directly. Keep this single working copy for the rest of the project.',
          { link: 'lab/watch-start.c', label: 'Download the C starter', download: 'watch.c' },
          { shell: 'curl -fL https://c-inotify.courses.bitshield.dev/lab/watch-start.c -o watch.c', name: 'Terminal A · download the starter once' },
        ],
        hints: [
          '`sizeof` accepts a parenthesized type. Use the full C type name, including the word `struct`.',
          'Supply `sizeof(struct inotify_event)` as the second argument. Its type is `size_t`, matching `%zu`.',
        ],
        checks: ['Both terminals see the same device and inode for scratch/note.txt.', 'My compiled probe printed a header size, and watch.c is beside it.'],
        notes: [{ label: 'Workspace and header size', placeholder: 'Record the lab path, the device:inode of note.txt and the size your probe printed.' }],
      }],
    },
    {
      id: 'subscribe',
      category: buildCategory,
      title: 'Subscribe to one directory',
      summary: 'Open a kernel event queue, choose the changes you care about, and let your process sleep until something happens.',
      minutes: 15,
      topics: ['File descriptors', 'Watch descriptors', 'Bit masks', 'Blocking I/O'],
      sections: [
        {
          title: 'Two integers with different jobs',
          body: [
            'Find `watch_directory` in the starter. Its caller has already checked the argument count. In `./watch scratch`, `argv[1]` is the relative path `scratch`. Passing it to this function keeps your monitor usable with any directory.',
            { code: c`int inotify_init1(int flags);
int inotify_add_watch(int fd, const char *path, uint32_t mask);`, name: 'Declarations from sys/inotify.h' },
            'The first call creates an instance with a queue and returns its **file descriptor**. Pass `IN_CLOEXEC` to arrange for Linux to close the descriptor if this process executes a new program. With these flags a read waits while the queue is empty.',
            'The second call subscribes to one filesystem object and returns a **watch descriptor**. Later each event carries this identifier in its `wd` field. Even when those two integers happen to have the same value, only the instance descriptor belongs in `read` and `close`.',
            'For either call, a return value of `-1` signals an error. Call `perror` while `errno` still describes that call. If adding the watch fails after opening the instance, close the instance before returning. Closing it releases its watches.',
            { link: 'https://man7.org/linux/man-pages/man2/inotify_add_watch.2.html', label: 'Linux manual · inotify_add_watch(2)' },
          ],
        },
        {
          title: 'Build the subscription mask',
          body: [
            'Each flag occupies a bit. Combine your choices with bitwise OR, `|`. Logical OR, `||`, collapses the expression to a truth value and loses the individual bits.',
            { table: { head: ['Flag', 'What you ask Linux to do'], rows: [
              ['`IN_CREATE`', 'Report a new entry in the directory.'],
              ['`IN_CLOSE_WRITE`', 'Report a close of a file that was open for writing.'],
              ['`IN_MOVED_FROM`', 'Report the old name leaving its directory on a rename.'],
              ['`IN_MOVED_TO`', 'Report the new name arriving in its directory on a rename.'],
              ['`IN_ONLYDIR`', 'Require the watched path to be a directory when registering it.'],
            ] } },
            'Watching a directory covers its immediate children. To see changes inside a nested directory you would need another watch. Here one directory is enough to compare the names involved in a save.',
            'The starter announces a successful subscription and calls `read(fd, buffer, sizeof buffer)`. For now it prints only the number of bytes returned. A single read can collect multiple events, so two runs of the same shell command can produce different batch sizes.',
          ],
        },
      ],
      takeaways: [
        'Use the instance descriptor to read the queue. Use the watch descriptor to identify which subscription generated an event.',
        'A quiet terminal after the readiness message is expected. A blocking read wakes when the kernel has an event to deliver.',
      ],
      quiz: [
        {
          q: 'Your instance descriptor is 5 and the watch descriptor is 1. Which invocation retrieves notifications?',
          options: [
            { t: '`read(1, buffer, sizeof buffer)`', why: 'Here 1 identifies a subscription inside the instance. As a process file descriptor, 1 usually refers to standard output.' },
            { t: '`read(5, buffer, sizeof buffer)`', ok: true, why: '5 refers to the kernel queue. Each returned event can then identify its watch with wd.' },
            { t: '`read(argv[1], buffer, sizeof buffer)`', why: 'argv[1] points to the directory name. The first argument to read must be an open file descriptor.' },
          ],
        },
        {
          q: 'Opening the instance succeeded. Adding a watch for a misspelled path returns −1. What should your function do?',
          options: [
            { t: 'Return the instance as if the watch succeeded.', why: 'The caller would announce readiness, then wait for changes on an empty watch list.' },
            { t: 'Close the watch descriptor, then keep reading.', why: 'There is no watch descriptor after this failure. The instance is the resource that was acquired.' },
            { t: 'Report the registration error, close the instance, and return failure.', ok: true, why: 'The diagnostic identifies the failure and the function releases the resource it owns.' },
          ],
        },
      ],
      challenges: [{
        id: 'open-and-watch', kind: 'lab', level: 'core', title: 'Wake the reader',
        prompt: [
          'Replace the TODO 1 placeholder in `watch_directory`. Initialize the instance, register `path` with the five flags from Learn, handle each failure, and return the open instance descriptor on success. Leave the remaining TODOs for the next lessons.',
          'Build in A. Run each invocation separately. The first should give usage, the second should diagnose a missing path, and the third should print `Watching scratch` and wait.',
          { shell: build, name: 'Terminal A · build' },
          { shell: c`./watch
./watch does-not-exist
./watch scratch`, name: 'Terminal A · test the argument and path' },
          'After the banner appears, create a small file from B. Look in A for at least one byte count, then press Ctrl+C in A to get your prompt back for the next build.',
          { shell: c`printf 'wake up\n' > scratch/wake.txt`, name: 'Terminal B · generate activity' },
        ],
        hints: [
          'Start with `int fd = inotify_init1(IN_CLOEXEC);`. If it returns −1, use `perror("inotify_init1");` and return −1.',
          'Set `uint32_t mask = IN_CREATE | IN_CLOSE_WRITE | IN_MOVED_FROM | IN_MOVED_TO | IN_ONLYDIR;`. Save the result of `inotify_add_watch(fd, path, mask)` in `int wd`.',
          'For `wd == -1`, call `perror("inotify_add_watch");`, then `close(fd);` and `return -1;`. After that branch, `return fd;` supplies the reader with its queue.',
        ],
        checks: ['My watcher gives a diagnostic for a missing directory.', 'It announced readiness for scratch and printed a byte count only after I generated activity.'],
      }],
    },
    {
      id: 'read-records',
      category: buildCategory,
      title: 'Walk a batch of events',
      summary: 'Turn a byte count into named records. Use the kernel’s record lengths to decide exactly where the next pointer should land.',
      minutes: 15,
      topics: ['Pointer arithmetic', 'Flexible array members', 'Alignment', 'Read boundaries'],
      sections: [
        {
          title: 'Find the name after the header',
          body: [
            'A successful read puts one or more complete records in the buffer. Each starts with the fixed header you measured. The child’s name, when present, follows that header in the same allocation.',
            { code: c`struct inotify_event {
    int      wd;
    uint32_t mask;
    uint32_t cookie;
    uint32_t len;
    char     name[];
};`, name: 'Layout of an event' },
            '`name[]` is a flexible array member. It contributes no name bytes to `sizeof(struct inotify_event)`. The kernel tells you how much trailing space belongs to this record through `len`. That space includes the terminating zero byte and any padding for alignment. For an event with no child name, `len` can be zero.',
            'The starter declares its byte buffer with `_Alignas(struct inotify_event)`. This makes the first header suitably aligned for access through an event pointer. Record lengths supplied by Linux lead to the next aligned header.',
          ],
        },
        {
          title: 'Advance in bytes',
          body: [
            'In `buffer + offset`, the buffer decays to a pointer to an unsigned char. Each increment therefore moves one byte. Casting that address to `const struct inotify_event *` gives a typed view of the header. Then `event->len` reads one field through that pointer.',
            'Try this example on paper first. A read delivered 80 bytes, the header is 16 bytes, and the two records have name fields of 16 and 32 bytes. Where does the second header start? At what offset must the loop stop?',
            { trace: {
              title: 'Follow the byte offset',
              code: c`uint32_t offset = 0;
offset += 16 + 16;  // first header + name field
offset += 16 + 32;  // second header + name field`,
              vars: [{ id: 'offset', type: 'uint32_t' }],
              steps: [
                { line: 1, set: { offset: 0 }, say: 'Offset 0 points to the first header. The read filled bytes 0 through 79.' },
                { line: 2, set: { offset: 32 }, say: 'The first record occupied bytes 0 through 31. The header at 32 has a longer name field.' },
                { line: 3, set: { offset: 80 }, say: 'Offset 80 equals the number of bytes returned. Stop here and read the next batch.' },
              ],
            } },
            'In the real loop, use `size_t` for the offset and compute the stride from each record. Keep the return from `read` in a signed `ssize_t` until errors have been handled. The starter retries a read interrupted by a signal (`EINTR`). Only then is casting a positive count to `size_t` appropriate.',
            { link: 'https://man7.org/linux/man-pages/man7/inotify.7.html', label: 'Linux manual · reading inotify events' },
          ],
        },
      ],
      takeaways: [
        'A record spans sizeof *event + event->len bytes. The end of the batch is the number returned by read.',
        'Pointers into the read buffer are valid for interpreting this batch. Copy any data you want to retain before the next read overwrites it.',
      ],
      quiz: [
        {
          q: 'A batch contains 96 bytes. The event at offset 32 has a 16-byte header and len = 32. Where is the next header?',
          options: [
            { t: '48', why: 'That skips the fixed header only. Offset 48 begins the current record’s name field.' },
            { t: '64', why: 'That accounts for the name length but leaves out the header.' },
            { t: '80', ok: true, why: '32 + 16 + 32 = 80. There are still 16 bytes in this batch, enough for a header carrying no name.' },
          ],
        },
        {
          q: 'For the name `a`, strlen returns 1 but the event’s len is 16. Why trust len when advancing?',
          options: [
            { t: 'It counts the terminator and padding reserved in this record.', ok: true, why: 'The kernel’s length describes storage occupied. strlen stops at the first zero and misses the rest of the name field.' },
            { t: 'It includes the fixed header as well as the name.', why: 'The fixed header is additional. Include sizeof *event separately.' },
            { t: 'It is the number of records delivered by this read.', why: 'len belongs to one record. Walk the batch until the byte offset reaches the read count.' },
          ],
        },
      ],
      challenges: [{
        id: 'decode-the-batch', kind: 'lab', level: 'core', title: 'Report every record in the buffer',
        prompt: [
          'Edit TODO 2 in `watch_events`. Remove the temporary byte-count print. Set the starting offset so the first header is visited, and change the update inside the loop so it advances by one whole record. Leave the supplied `print_event` in place to inspect raw fields.',
          { shell: build + ' && ./watch scratch', name: 'Terminal A · rebuild and listen' },
          'After readiness, run this in B. Two different-length names make it easier to see why the loop needs the size of each record. Look for both names and inspect their `len` values. Ctrl+C in A when you are ready to edit again.',
          { shell: c`printf 'short\n' > scratch/a
printf 'long\n' > scratch/a-name-that-crosses-sixteen-bytes.txt`, name: 'Terminal B · generate records' },
        ],
        hints: [
          'Before consuming a record, set `size_t offset = 0;`. Keep the loop condition `offset < (size_t)count`.',
          'A typed pointer increment scales by sizeof its pointed-to type. Advance the byte offset instead. Replace the loop’s assignment with `offset += sizeof *event + event->len;`.',
        ],
        checks: ['My monitor reports raw event fields for both names.', 'I can locate the next record using the current offset, the fixed header size and len.'],
      }],
    },
    {
      id: 'known-writes',
      category: observeCategory,
      title: 'Compare an append and a rename',
      summary: 'Give the events readable names, then record two operations you control. Their traces become your points of comparison for Neovim.',
      minutes: 18,
      topics: ['Mask tests', 'Writable close', 'Rename cookies', 'File identity'],
      sections: [
        {
          title: 'Turn bits into observations',
          body: [
            'Read the raw mask with bitwise AND, `&`. If the selected bit is set, the result is nonzero. Additional bits can describe the object, such as `IN_ISDIR` for a directory, so checking equality with a single constant can miss a relevant event.',
            { code: c`if (event->mask & IN_CREATE)
    printf("CREATE %s\n", event->name);`, name: 'One case in print_event' },
            '`IN_CLOSE_WRITE` means a file that was open for writing was closed. The record contains no byte count, written text or process ID. Even a program that opened a file for writing and closed it without changing a byte can produce this event.',
            'A rename has two perspectives. The containing directory of the old name can report `MOVED_FROM`, and the containing directory of the new name can report `MOVED_TO`. The kernel puts the same cookie in both records. Print the names and cookies so you can match them even across reads.',
            { code: c`printf("MOVED_TO %s cookie=%" PRIu32 "\n",
       event->name, event->cookie);`, name: 'Formatting a uint32_t cookie with inttypes.h' },
          ],
        },
        {
          title: 'Predict two different changes to note.txt',
          body: [
            'For the first run, the shell opens an existing file in append mode, adds a line and closes it. Predict which name will appear and whether its inode will change.',
            'For the second run, write a complete file named `next.txt` beside the destination, then rename it over `note.txt`. Because both are in the same directory, the rename installs the replacement atomically at that pathname. A new lookup can see the old file or the replacement. It cannot observe a half-written replacement from these commands.',
            'Pay attention to **which name** was closed for writing and **which name** became the destination of a move. Then ask which file identity the name `note.txt` has after the operation.',
            { link: 'https://man7.org/linux/man-pages/man2/rename.2.html', label: 'Linux manual · rename(2)' },
          ],
        },
      ],
      takeaways: [
        'A matching cookie connects the old and new names of one rename. Their records can arrive in separate reads, and a move across the watch boundary may expose only one side.',
        'Appending to an existing file and renaming a prepared file into place both change the text found at a pathname. The close, move and inode observations let you distinguish the two experiments.',
      ],
      quiz: [
        {
          q: 'You see the following records. Which old name supplied the new note.txt?',
          code: c`MOVED_FROM next.txt cookie=41
MOVED_FROM other.txt cookie=93
MOVED_TO note.txt cookie=41`,
          options: [
            { t: '`other.txt`, because it is on the preceding line.', why: 'Events from different operations can interleave. The cookie on that line belongs to a different rename.' },
            { t: '`next.txt`, because both records carry cookie 41.', ok: true, why: 'The kernel assigns those two sides of one rename the same cookie.' },
            { t: 'Whichever file had the most recent CLOSE_WRITE.', why: 'Closing a file for writing gives it no relationship to a later rename.' },
          ],
        },
        {
          q: 'Which conclusion follows from a single `CLOSE_WRITE note.txt` record?',
          options: [
            { t: 'Neovim appended at least one byte.', why: 'The event contains neither a process ID nor any indication of how many bytes were written.' },
            { t: 'The file’s data has reached durable storage.', why: 'Closing a writable descriptor can leave data in the page cache. The event carries no durability guarantee.' },
            { t: 'A file opened for writing was closed, and the event names note.txt.', ok: true, why: 'That is what the mask and name report. The command you ran and the before-and-after file identities supply additional evidence.' },
          ],
        },
      ],
      challenges: [{
        id: 'record-the-controls', kind: 'lab', level: 'core', title: 'Capture two known operations',
        prompt: [
          'In `print_event`, replace the raw print at TODO 3 with four independent bit tests. Print `CREATE`, `CLOSE_WRITE`, `MOVED_FROM` or `MOVED_TO` followed by the name. Add `cookie=` and the decimal cookie to both move lines. The caller handles events without a child name.',
          'Start the completed watcher in A. The pipe copies its output to your terminal and to a log beside the source. Wait for `Watching scratch` before touching the test file.',
          { shell: build + ' && ./watch scratch | tee append.trace', name: 'Terminal A · capture the append' },
          { shell: c`stat -c '%d:%i %n' scratch/note.txt
printf 'shell append\n' >> scratch/note.txt
stat -c '%d:%i %n' scratch/note.txt`, name: 'Terminal B · append to the existing file' },
          'Copy the watcher lines and both identities into the append entry below. Press Ctrl+C in A, start a fresh capture, and wait for its banner.',
          { shell: './watch scratch | tee replace.trace', name: 'Terminal A · capture the replacement' },
          { shell: c`printf 'replacement contents\n' > scratch/next.txt
stat -c '%d:%i %n' scratch/note.txt scratch/next.txt
mv -T -- scratch/next.txt scratch/note.txt
stat -c '%d:%i %n' scratch/note.txt`, name: 'Terminal B · rename within the watched directory' },
          'Stop the watcher with Ctrl+C. Pair the two move lines by cookie. Compare the identity now attached to `note.txt` with the two identities shown immediately before the rename.',
          'To check your implementation against a burst of events, run the optional self-test from your lab directory. It exercises records returned together in a read and checks that both sides of a rename print matching cookies.',
          { link: 'lab/check-watch.sh', label: 'Download the watcher self-test', download: 'check-watch.sh' },
          { shell: c`curl -fL https://c-inotify.courses.bitshield.dev/lab/check-watch.sh -o check-watch.sh
bash check-watch.sh ./watch`, name: 'Terminal A · optional self-test' },
        ],
        hints: [
          'Use one `if (event->mask & FLAG)` for each event of interest. The raw print in the starter already uses the correct header for printing fixed-width integers.',
          'For the move cases, use the MOVED_TO example in Learn and an analogous MOVED_FROM line. For the close case, adapt the CREATE example.',
          'If append also shows CREATE, verify that note.txt already exists in the same scratch directory and repeat the append. If one move side is missing, check that both paths are inside that directory.',
        ],
        checks: ['My watcher prints readable event names and records a writable close for the append.', 'I found the two names linked by one rename cookie and checked which inode is now named note.txt.'],
        notes: [
          { label: 'Shell append trace', placeholder: 'Paste the append.trace lines and note.txt’s device:inode before and after the append.' },
          { label: 'Rename replacement trace', placeholder: 'Paste the replace.trace lines. Identify the cookie, the old and new names, and the inode installed at note.txt.' },
        ],
      }],
    },
    {
      id: 'neovim-save',
      category: observeCategory,
      title: 'Catch Neovim in the act',
      summary: 'Capture one :w from your editor. Use the two controls, the event names and the file identity to explain what happened on your machine.',
      minutes: 15,
      topics: ['Neovim :w', 'Backup options', 'Evidence', 'Observation limits'],
      sections: [
        {
          title: 'Separate opening, editing and saving',
          body: [
            'Neovim holds your edits in a buffer before you write them to the file. Opening the editor or typing can also cause other activity, such as swap or plugin files. Prepare the edit first, start a fresh capture second, and issue one `:w` third. Stop the capture before quitting the editor.',
            'Start with the Neovim configuration you normally use on this machine. Record the version and inspect the settings in the buffer you will save. This gives a second person enough context to interpret a different result.',
            { table: { head: ['Setting', 'Why record it?'], rows: [
              ['`backup`, `writebackup`', 'A backup can remain after the write or exist only while the write is in progress.'],
              ['`backupcopy`', 'When making a backup, Neovim can copy the original before overwriting it, or rename the original and write a new file. The auto setting lets it choose.'],
              ['`backupdir`, `backupskip`', 'A backup may live outside this directory, or the file’s path may match a pattern that skips backups.'],
            ] } },
            { link: 'https://neovim.io/doc/user/options/#%27backupcopy%27', label: 'Neovim help · backupcopy and related options' },
          ],
        },
        {
          title: 'Read the trace as evidence',
          body: [
            'A writable close on the target and a stable device:inode are consistent with a write to the existing file. That still leaves several ways to produce the new text, including truncating and rewriting. A matching move pair ending at the target shows a rename into place. A move **away** from the target followed by a creation of the target suggests a different sequence.',
            'Read auxiliary names on their own terms. A close on a backup tells you about that backup. If a move crosses the directory boundary, you may see only its local half. Record what is visible and leave the unseen half open.',
            'This monitor reports selected filesystem events in one directory, without a process ID or the bytes written. Identical unread events can coalesce. If the kernel reports a queue overflow, your program prints a warning because some events were lost. Repeat the short experiment in a quiet directory before drawing a conclusion.',
          ],
        },
      ],
      takeaways: [
        'A Neovim save is an observation about this buffer, editor configuration and filesystem. Recording those conditions makes the result repeatable.',
        'Use event names, matching cookies and file identity together. Your monitor can now investigate another program with the same two-terminal experiment.',
      ],
      quiz: [
        {
          q: 'One Neovim save produces a CLOSE_WRITE for note.txt and the same inode before and after. Which statement fits the evidence?',
          options: [
            { t: 'The observations are consistent with writing the existing file. They leave the write offsets unknown.', ok: true, why: 'The file identity and writable close support this interpretation. Your subscription has no event describing individual byte offsets.' },
            { t: 'Neovim must have appended the new text using the shell’s append operation.', why: 'A truncating rewrite of the existing file can give the same observed close and stable identity.' },
            { t: 'Every Neovim installation saves this way.', why: 'Backup choices, filesystem details and editor configuration can change what you observe.' },
          ],
        },
        {
          q: 'During a save, only a MOVED_FROM for note.txt is visible for its cookie. Where might the matching side have occurred?',
          options: [
            { t: 'It must be the very next line of the same read.', why: 'The two sides can be separated across reads, or one side may lie outside the subscription.' },
            { t: 'In a different directory where the editor places a backup.', ok: true, why: 'A rename out of scratch generates a local MOVED_FROM. Watching only scratch gives no destination name outside it.' },
            { t: 'Inside a later CLOSE_WRITE bearing the same cookie.', why: 'The partner of a MOVED_FROM is a MOVED_TO. A writable close carries no rename relationship.' },
          ],
        },
      ],
      challenges: [{
        id: 'explain-your-save', kind: 'lab', level: 'core', title: 'Answer the :w question', reviewNotes: true,
        prompt: [
          'Leave A at its prompt in the build shell. If your everyday `nvim` comes from a wrapper such as Home Manager, the package shell in B may have put another executable first. Run `exit` in B to return to your usual shell, change back to the lab path from lesson 1 if needed, and use your regular Neovim command. Record the identity of the target and the version of the editor you actually start.',
          { shell: c`stat -c '%d:%i %n' scratch/note.txt
nvim --version | head -n 1
nvim scratch/note.txt`, name: 'Terminal B · inspect and open' },
          'In Neovim run these two commands, pressing Enter after each. Note their output. If Neovim pauses on a message, press Enter to return to the buffer.',
          { text: ':set backup? writebackup? backupcopy?\n:set backupdir? backupskip?' },
          'In Normal mode, press `G` then `o`, type a new line such as `editor save`, and press Esc. Leave the change unsaved. Switch to A and start the capture.',
          { shell: './watch scratch | tee save.trace', name: 'Terminal A · listen for the save' },
          'After the readiness line, switch to B, type `:w` and press Enter. Observe A. Once the save has finished, stop the watcher with Ctrl+C in A. Then type `:q` and press Enter in Neovim.',
          { shell: c`stat -c '%d:%i %n' scratch/note.txt
tail -n 1 scratch/note.txt`, name: 'Terminal B · verify identity and content' },
          'Compare your capture with both controls in your notebook. Which names were closed for writing? Did a matched move end at `note.txt`, or did the original name move away? State what the inode comparison adds. If neither control fits exactly, describe the sequence you actually observed.',
          'To repeat with plugins and user settings set aside, reopen the same file with `nvim --clean scratch/note.txt` and capture a fresh edit to a separate log. You can also keep the completed C source as a reference for your own monitor.',
          { link: 'lab/watch.c', label: 'Download the reference monitor', download: 'watch-reference.c' },
          { details: 'Compare your conclusion with two recorded saves', body: [
            'In a Linux scratch directory under `/tmp`, a clean run of Neovim 0.12.4 produced just `CLOSE_WRITE note.txt`. With the same four event types selected, this looked like the shell append. The trace alone could not distinguish an append from a rewrite.',
            'In a second run we enabled a write backup in the watched directory, cleared `backupskip` and set `backupcopy=no`. The watcher printed a matched move pair from `note.txt` to `note.txt~`, then `CREATE note.txt` and `CLOSE_WRITE note.txt`. Compare the direction of that rename with your shell replacement, where the move ended at `note.txt`.',
          ] },
        ],
        hints: [
          'If save.trace contains only the banner, verify that B edited the existing file under A’s watched directory, that the buffer had a change, and that :w succeeded. Start the capture before the next save.',
          'Read MOVED_FROM as the old name and MOVED_TO as the new one. Compare cookies before attributing two names to one rename. A move away from note.txt has a different meaning from a move to note.txt.',
          'A concise conclusion can read “On [version/settings], my :w produced [lines]. Compared with the append and replacement runs, this supports [interpretation]. The monitor cannot tell me [specific limit].”',
        ],
        checks: ['I captured one successful :w, checked the saved text and compared the file identity.', 'My conclusion cites my Neovim trace and compares it with both shell controls.'],
        notes: [
          { label: 'Neovim configuration', placeholder: 'Neovim version, backup/writebackup, backupcopy, backupdir and backupskip.' },
          { label: 'Neovim save trace', placeholder: 'Paste the save.trace lines and the device:inode before and after :w. Include auxiliary names you observed.' },
          { label: 'What my :w did', placeholder: 'Which observations resemble the append? Which resemble the replacement? Cite actual names or cookies, then identify one detail this trace leaves open.' },
        ],
      }],
    },
  );
})();
