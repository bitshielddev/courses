#!/usr/bin/env bash
# Run from the build directory with: bash check-watch.sh ./watch
set -eu

if (( $# > 1 )); then
    printf 'Usage: %s [./watch]\n' "$0" >&2
    exit 2
fi
watcher=${1:-./watch}
[[ $watcher == */* ]] || watcher=./$watcher
if [[ ! -f $watcher || ! -x $watcher ]]; then
    printf 'Cannot run %s. Compile watch.c first.\n' "$watcher" >&2
    exit 2
fi

work=$(mktemp -d)
scratch=$work/scratch
trace=$work/trace
errors=$work/errors
pid=
cleanup() {
    if [[ -n $pid ]]; then
        # The test may have stopped its child midway through the burst.
        kill -KILL "$pid" 2>/dev/null || true
        wait "$pid" 2>/dev/null || true
    fi
    rm -rf -- "$work"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
trap 'exit 129' HUP

fail() {
    printf 'FAIL: %s\n' "$1" >&2
    if [[ -s $trace ]]; then
        printf 'Last lines from your watcher:\n' >&2
        tail -n 12 "$trace" >&2
    fi
    if [[ -s $errors ]]; then
        printf 'Watcher diagnostics:\n' >&2
        tail -n 12 "$errors" >&2
    fi
    exit 1
}

wait_for() {
    local attempt
    for (( attempt=0; attempt<80; attempt++ )); do
        if grep -Eq -- "$1" "$2"; then return 0; fi
        kill -0 "$pid" 2>/dev/null || fail 'The watcher exited during the check.'
        sleep 0.05
    done
    fail "$3"
}

mkdir "$scratch"
printf 'seed\n' > "$scratch/note.txt"
: > "$trace"
(
    # A stalled record cursor can print the same event indefinitely.
    ulimit -c 0
    ulimit -f 1024
    exec "$watcher" "$scratch"
) > "$trace" 2> "$errors" &
pid=$!
wait_for '^Watching ' "$trace" 'Print the Watching banner after subscribing. Flush stdout or enable line buffering so redirected output appears promptly.'
printf 'append\n' >> "$scratch/note.txt"
wait_for '^CLOSE_WRITE note\.txt$' "$trace" 'Appending to the existing note.txt should report CLOSE_WRITE note.txt.'

# Let events accumulate on the kernel queue before the watcher can read them.
kill -STOP "$pid"
wait_for '^State:[[:space:]]+T' "/proc/$pid/status" 'Could not pause the watcher for the batch check.'
for (( i=1; i<=12; i++ )); do
    printf 'batch\n' > "$scratch/batch-$i.txt"
done
kill -CONT "$pid"
wait_for '^CLOSE_WRITE batch-12\.txt$' "$trace" 'The last queued close was missing. Walk every record returned by read, advancing by sizeof *event + event->len.'
for (( i=1; i<=12; i++ )); do
    for label in CREATE CLOSE_WRITE; do
        grep -Fxq "$label batch-$i.txt" "$trace" || fail "Missing $label batch-$i.txt. Check the record stride and the event mask."
    done
done
printf 'Passed append and 24 queued create/close records.\n'

printf 'replacement\n' > "$scratch/next.txt"
mv "$scratch/next.txt" "$scratch/note.txt"
mv "$scratch/note.txt" "$scratch/archive.txt"
wait_for '^MOVED_TO archive\.txt([[:space:]]|$)' "$trace" 'The second rename should report MOVED_TO archive.txt. Check the subscription mask and move labels.'
awk '
    $1 == "MOVED_FROM" { from[$2] = $3 }
    $1 == "MOVED_TO"   { to[$2] = $3 }
    END {
        first = from["next.txt"]; second = from["note.txt"]
        matched = first == to["note.txt"] && second == to["archive.txt"]
        valid = first ~ /^cookie=[1-9][0-9]*$/ && second ~ /^cookie=[1-9][0-9]*$/
        exit !(matched && valid && first != second)
    }
' "$trace" || fail 'Print event->cookie on each MOVED_FROM and MOVED_TO. Each pair should share its own nonzero cookie.'
printf 'Passed two rename pairs with matching cookies.\n'
