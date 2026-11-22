#include <errno.h>
#include <inttypes.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/inotify.h>
#include <unistd.h>

static int watch_directory(const char *path)
{
    int fd = inotify_init1(IN_CLOEXEC);
    if (fd == -1) {
        perror("inotify_init1");
        return -1;
    }

    uint32_t mask = IN_CREATE | IN_CLOSE_WRITE | IN_MOVED_FROM |
                    IN_MOVED_TO | IN_ONLYDIR;
    int wd = inotify_add_watch(fd, path, mask);
    if (wd == -1) {
        perror("inotify_add_watch");
        close(fd);
        return -1;
    }
    return fd;
}

static void print_event(const struct inotify_event *event)
{
    if (event->mask & IN_CREATE)
        printf("CREATE %s\n", event->name);
    if (event->mask & IN_CLOSE_WRITE)
        printf("CLOSE_WRITE %s\n", event->name);
    if (event->mask & IN_MOVED_FROM)
        printf("MOVED_FROM %s cookie=%" PRIu32 "\n", event->name, event->cookie);
    if (event->mask & IN_MOVED_TO)
        printf("MOVED_TO %s cookie=%" PRIu32 "\n", event->name, event->cookie);
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

        size_t offset = 0;
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
            offset += sizeof *event + event->len;
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
