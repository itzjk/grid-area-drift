import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIMITS } from '../src/analyze.js';

const cli = fileURLToPath(new URL('../bin/grid-area-drift.js', import.meta.url));
const run = args => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 10000 });
const compare = (before = 'examples/before.css', after = 'examples/after.css') => run([before, after, '--selector', '.layout', '--json']);

test('CLI measures main fixture, exact coordinates, spans, origins and exit status', () => {
  const result = compare();
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.equal(report.schemaVersion, 1);
  assert.equal(report.complete, true);
  assert.deepEqual(report.before.dimensions, { rows: 3, columns: 3 });
  assert.deepEqual(report.after.dimensions, { rows: 3, columns: 3 });
  assert.deepEqual(report.changes.map(c => [c.name, c.state, c.before.lines, c.after.lines]), [
    ['foot', 'unchanged', [3, 1, 4, 4], [3, 1, 4, 4]],
    ['head', 'unchanged', [1, 1, 2, 4], [1, 1, 2, 4]],
    ['main', 'changed', [2, 2, 3, 4], [2, 1, 3, 3]],
    ['nav', 'changed', [2, 1, 3, 2], [2, 3, 3, 4]],
  ]);
  assert.deepEqual(report.summary, { added: 0, removed: 0, unchanged: 2, changed: 2, originChanged: 2, spanChanged: 0, dimensionsChanged: false });
  assert.deepEqual(report.before.declaration, { path: 'examples/before.css', line: 2, column: 3, offset: 12 });
  const nav = report.changes.find(c => c.name === 'nav');
  assert.deepEqual(nav.presence, { before: true, after: true });
  assert.equal(nav.before.source.rows[0].source.line, 4);
  assert.equal(nav.after.source.rows[0].source.column, 5);
  assert.equal(nav.spanChanged, false);
});

test('negative fixture never accredits repaired coordinates', () => {
  const result = compare('examples/before.css', 'examples/invalid.css');
  assert.equal(result.status, 2);
  const report = JSON.parse(result.stdout);
  assert.equal(report.after.state, 'invalid-template');
  assert.equal(report.after.areas, null);
  assert.equal(report.changes, null);
  assert.match(report.after.diagnostics[0].message, /4 cells inside a 6-cell rectangle/);
  assert.deepEqual(report.after.diagnostics[0].source, { path: 'examples/invalid.css', line: 4, column: 5, offset: 58 });
});

test('text report and equal status; input bytes remain unchanged', () => {
  const files = ['examples/before.css', 'examples/after.css', 'examples/invalid.css'];
  const original = files.map(file => readFileSync(file));
  const result = run([files[0], files[1], '--selector', '.layout']);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /2 changed, 0 added, 0 removed, 2 unchanged/);
  assert.match(result.stdout, /\[2,1,3,2\].*-> \[2,3,3,4\]/);
  assert.equal(compare(files[0], files[0]).status, 0);
  assert.equal(compare(files[0], files[2]).status, 2);
  files.forEach((file, i) => assert.deepEqual(readFileSync(file), original[i]));
});

test('CLI exercises added, removed, resized and simultaneous changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'grid-states-'));
  try {
    const before = join(dir, 'before.css');
    const after = join(dir, 'after.css');
    writeFileSync(before, '.layout { grid-template-areas: "stay gone x ." "grow . . ."; }');
    writeFileSync(after, '.layout { grid-template-areas: "stay new . ." "grow grow x x"; }');
    const report = JSON.parse(compare(before, after).stdout);
    assert.deepEqual(report.changes.map(c => [c.name, c.state, c.originChanged, c.spanChanged]), [
      ['gone', 'removed', null, null], ['grow', 'changed', false, true], ['new', 'added', null, null],
      ['stay', 'unchanged', false, false], ['x', 'changed', true, true],
    ]);
  } finally { rmSync(dir, { recursive: true }); }
});

test('argument errors, IO, malformed CSS, UTF-8 and byte limit', () => {
  assert.equal(run(['--help']).status, 0);
  assert.equal(run(['--version']).stdout.trim(), '0.1.0');
  for (const args of [[], ['a', 'b'], ['a', 'b', '--selector', ''], ['a', 'b', '--selector', '.x', '--selector', '.y'], ['--wat']]) assert.equal(run(args).status, 3);
  const badArgs = run(['--wat', '--json']);
  assert.equal(JSON.parse(badArgs.stdout).exitCode, 3);
  assert.equal(compare('missing-file.css').status, 3);
  assert.equal(compare('examples').status, 3);
  const dir = mkdtempSync(join(tmpdir(), 'grid-inputs-'));
  try {
    const file = join(dir, 'test.css');
    writeFileSync(file, '.layout {');
    assert.equal(JSON.parse(compare(file).stdout).before.diagnostics[0].code, 'css-syntax');
    writeFileSync(file, Buffer.from([0xff]));
    assert.equal(JSON.parse(compare(file).stdout).before.diagnostics[0].code, 'encoding');
    writeFileSync(file, ' '.repeat(LIMITS.bytes + 1));
    const report = JSON.parse(compare(file).stdout);
    assert.equal(report.exitCode, 2);
    assert.equal(report.before.diagnostics[0].code, 'byte-limit');
  } finally { rmSync(dir, { recursive: true }); }
});
