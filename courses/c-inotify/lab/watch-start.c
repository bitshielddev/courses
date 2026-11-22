#include <errno.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/inotify.h>
#include <unistd.h>

static int watch_directory(const char *path)
{
    /* TODO 1: open an inotify descriptor and register the directory watch.
       Return the open descriptor on success, or -1 on failure. */
    fprintf(stderr, "Complete TODO 1 to watch %s.\n", path);
    return -1;
}

static void print_event(const struct inotify_event *event)
{
    /* TODO 3: label the events and print the cookie for both move events. */
    printf("mask=0x%08" PRIx32 " len=%" PRIu32 " name=%s\n",
           event->mask, event->len, event->name);
}

static int watch_events(int fd)
{
    _Alignas(struct inotify_event) unsigned char buffer[4096];
    for (;;) {
        ssize_t count = read(fd, buffer, sizeof buffer);
        if (count == -1) {
            if (errno == EINTR)
                continue;
            perror("read");
            return EXIT_FAILURE;
        }
        if (count == 0) {
            fputs("The inotify stream ended.\n", stderr);
            return EXIT_FAILURE;
        }

        /* TODO 2: remove this byte-count diagnostic, start at the first
           record, and advance past each full record inside the loop. */
        printf("Read %zd bytes\n", count);
        size_t offset = (size_t)count;
        while (offset < (size_t)count) {
            const struct inotify_event *event =
                (const struct inotify_event *)(buffer + offset);
            if (event->mask & IN_Q_OVERFLOW) {
                fputs("The event queue overflowed. Repeat the experiment.\n", stderr);
            } else if (event->mask & IN_IGNORED) {
                fputs("The directory watch was removed.\n", stderr);
                return EXIT_FAILURE;
            } else if (event->len > 0) {
                print_event(event);
            }
            offset = (size_t)count;
        }
    }
}

int main(int argc, char **argv)
{
    if (argc != 2) {
        fprintf(stderr, "Usage: %s DIRECTORY\n", argv[0]);
        return EXIT_FAILURE;
    }
    int fd = watch_directory(argv[1]);
    if (fd == -1)
        return EXIT_FAILURE;

    setvbuf(stdout, NULL, _IOLBF, 0);
    printf("Watching %s\n", argv[1]);
    int status = watch_events(fd);
    close(fd);
    return status;
}
