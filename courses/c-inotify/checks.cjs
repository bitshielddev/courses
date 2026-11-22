// Browser checks for this course alone, run by tools/verify.cjs after its lab-course checks.
// The generic checks already confirm that every lab link resolves. This confirms that each
// download holds the program the lessons describe, on disk and on a served copy.
const downloads = {
  'watch-start.c': source => source.includes('<sys/inotify.h>') && source.includes('main('),
  'watch.c': source => source.includes('<sys/inotify.h>') && source.includes('main('),
  'check-watch.sh': source => source.startsWith('#!') && source.includes('MOVED_TO'),
};

module.exports = async function checkDownloads({ links, readLink, fail }) {
  for (const [name, expected] of Object.entries(downloads)) {
    const link = links.find(item => new URL(item.url).pathname.endsWith(`/lab/${name}`));
    if (!link) {
      fail('downloads', `no lesson links to lab/${name}`);
      continue;
    }
    const source = await readLink(link.url).catch(error => fail('downloads', error.message));
    if (typeof source === 'string' && !expected(source)) fail('downloads', `${name} does not contain the expected source`);
  }
  return 'starter, reference monitor and self-test downloads';
};
