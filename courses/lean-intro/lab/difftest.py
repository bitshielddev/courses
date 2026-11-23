"""Compare the Lean sorter with Python's sorted() on random inputs.

    python3 difftest.py                          # tests .lake/build/bin/sorter
    python3 difftest.py path/to/another/program

The Lean program takes numbers as arguments and prints them in order, separated by spaces.
This script generates random lists, runs the program on each, and stops at the first list
where its output differs from what Python computes.
"""
import random
import subprocess
import sys

program = sys.argv[1] if len(sys.argv) > 1 else ".lake/build/bin/sorter"
trials = 300
random.seed(2026)

for trial in range(trials):
    numbers = [random.randrange(1000) for _ in range(random.randrange(15))]
    result = subprocess.run([program, *map(str, numbers)], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"the program failed on {numbers}: {result.stderr.strip()}")
        sys.exit(1)
    printed = [int(word) for word in result.stdout.split()]
    if printed != sorted(numbers):
        print(f"MISMATCH on {numbers}")
        print(f"  Lean:   {printed}")
        print(f"  Python: {sorted(numbers)}")
        sys.exit(1)

print(f"{trials} random lists: the Lean program and Python's sorted() agree on every one")
