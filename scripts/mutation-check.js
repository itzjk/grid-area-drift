import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const baseline = spawnSync(process.execPath, ['--test', 'test/core.test.js', 'test/cli.test.js'], { encoding: 'utf8', timeout: 30000 });
assert.equal(baseline.error, undefined);
assert.equal(baseline.status, 0, `Clean baseline must pass before mutation testing.\n${baseline.stdout}\n${baseline.stderr}`);
console.log('Clean baseline passed');

const mutations = [
  ['ignore initial column', 'src/analyze.js', 'lines: [r0, c0, r1, c1]', 'lines: [r0, 1, r1, c1]'],
  ['compare only spans', 'src/compare.js', 'originChanged = oldArea.lines[0] !== newArea.lines[0] || oldArea.lines[1] !== newArea.lines[1];', 'originChanged = false;'],
  ['accept non-rectangular areas', 'src/analyze.js', 'cells.length !== span.rows * span.columns', 'false'],
];
for (const [name, file, original, replacement] of mutations) {
  const dir = await mkdtemp(join(tmpdir(), 'grid-mutation-'));
  try {
    for (const path of ['src', 'bin', 'test', 'examples', 'package.json']) await cp(path, join(dir, path), { recursive: true });
    await symlink(resolve('node_modules'), join(dir, 'node_modules'), 'dir');
    const source = await readFile(join(dir, file), 'utf8');
    assert.ok(source.includes(original), `Mutation target missing: ${name}`);
    await writeFile(join(dir, file), source.replace(original, replacement));
    const result = spawnSync(process.execPath, ['--test', 'test/core.test.js', 'test/cli.test.js'], { cwd: dir, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, 0, `Mutation survived: ${name}`);
    assert.match(result.stdout, /AssertionError/);
    console.log(`Killed: ${name}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
