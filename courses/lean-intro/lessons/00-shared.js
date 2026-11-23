// Blocks that every lab in this course uses, so each lesson states them one way.
window.LEAN_COURSE = (() => {
  const site = 'https://lean-intro.courses.bitshield.dev';

  // How to get lab NN ('01', '02', …) into the project folder, and how to check it.
  const fetchLab = number => [
    { link: `lab/Lab${number}.lean`, label: `Download Lab${number}.lean`, download: `Lab${number}.lean` },
    { shell: `curl -fLO ${site}/lab/Lab${number}.lean`, name: 'Terminal · or fetch it from inside the project folder' },
  ];
  const checkLab = number => ({ shell: `lean Lab${number}.lean`, name: 'Terminal · check the lab' });
  const solution = number => ({
    details: 'Compare with a reference solution',
    body: [
      'Use every hint before you open this. A proof you read teaches less than one you finish. Your proofs may differ from these and still be right: if Lean accepts yours, it is correct.',
      { link: `lab/solutions/Lab${number}.lean`, label: `Download the solutions to lab ${number}`, download: `Lab${number}-solutions.lean` },
    ],
  });

  return { fetchLab, checkLab, solution };
})();
