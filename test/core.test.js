import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyze, LIMITS } from '../src/analyze.js';
import { compare } from '../src/compare.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/templates.json', import.meta.url), 'utf8'));
const side = value => analyze(`.layout { grid-template-areas: ${value}; }`, 'fixture.css', '.layout');
const diff = (oldValue, newValue) => compare(side(oldValue), side(newValue), '.layout');

for (const fixture of fixtures.valid) test(`supported: ${fixture.name}`, () => {
  assert.equal(side(fixture.value).state, 'valid');
  assert.equal(diff(fixture.value, fixture.value).status, 'equal');
});

for (const fixture of fixtures.invalid) test(`invalid: ${fixture.name}`, () => {
  const result = side(fixture.value);
  assert.equal(result.state, 'invalid-template');
  assert.ok(result.diagnostics.some(issue => issue.code === fixture.code));
  assert.equal(result.areas, null);
  assert.equal(result.dimensions, null);
  const report = diff('"good"', fixture.value);
  assert.equal(report.exitCode, 2);
  assert.equal(report.complete, false);
  assert.equal(report.changes, null);
});

for (const fixture of fixtures.unsupported) test(`not analyzed: ${fixture.name}`, () => {
  const result = side(fixture.value);
  assert.equal(result.state, 'not-analyzed');
  assert.equal(result.areas, null);
  assert.ok(result.diagnostics.every(issue => issue.source.path === 'fixture.css' && issue.source.column > 1));
});

test('independent origins and spans; all four states with no rename inference', () => {
  const report = diff('"stay gone . move ." "resize . . . ." ". . . . ."', '"stay new move . ." "resize resize . . ." ". . . . ."');
  assert.deepEqual(report.changes.map(c => [c.name, c.state, c.originChanged, c.spanChanged]), [
    ['gone', 'removed', null, null], ['move', 'changed', true, false], ['new', 'added', null, null],
    ['resize', 'changed', false, true], ['stay', 'unchanged', false, false],
  ]);
  const both = diff('"x . ."', '". x x"').changes[0];
  assert.deepEqual([both.originChanged, both.spanChanged, both.before.lines, both.after.lines], [true, true, [1, 1, 2, 2], [1, 2, 2, 4]]);
  assert.deepEqual(both.after.cells, [[1, 2], [1, 3]]);
  assert.deepEqual(both.after.span, { rows: 1, columns: 2 });
  assert.equal(both.after.cellCount, 2);
});

test('row origin changes and row spans count independently', () => {
  const moved = diff('"x" "."', '"." "x"').changes[0];
  assert.deepEqual([moved.originChanged, moved.spanChanged, moved.after.lines], [true, false, [2, 1, 3, 2]]);
  const resized = diff('"x" "."', '"x" "x"').changes[0];
  assert.deepEqual([resized.originChanged, resized.spanChanged, resized.after.lines], [false, true, [1, 1, 3, 2]]);
});

test('none, empty area sets, case sensitivity and dimension-only changes', () => {
  assert.deepEqual(side('none').dimensions, { rows: 0, columns: 0 });
  assert.equal(diff('none', '"a"').changes[0].state, 'added');
  assert.equal(diff('"a"', 'none').changes[0].state, 'removed');
  assert.equal(diff('none', 'none').exitCode, 0);
  assert.deepEqual(diff('"a"', '"A"').changes.map(c => [c.name, c.state]), [['A', 'added'], ['a', 'removed']]);
  const dimensions = diff('"a ."', '"a . ."');
  assert.equal(dimensions.changes[0].state, 'unchanged');
  assert.equal(dimensions.summary.dimensionsChanged, true);
  assert.equal(dimensions.exitCode, 1);
  assert.equal(diff('"."', '". ."').exitCode, 1);
});

test('comments, quote style and whitespace are semantically neutral with exact provenance', () => {
  const css = '/* start */\r\n.layout {\r\n  GRID-TEMPLATE-AREAS /* p */ : /* v */ "a  a" /* between */\r\n    "b c";\r\n}';
  const result = analyze(css, 'spaced.css', '.layout');
  assert.equal(result.state, 'valid');
  assert.deepEqual(result.declaration, { path: 'spaced.css', line: 3, column: 3, offset: css.indexOf('GRID-TEMPLATE-AREAS') });
  for (const [index, row] of result.rows.entries()) {
    const expected = css.indexOf(index === 0 ? '"a  a"' : '"b c"');
    assert.equal(row.source.offset, expected);
    assert.equal(row.source.line, index + 3);
    assert.equal(row.source.column, index === 0 ? 41 : 5);
  }
  assert.equal(compare(result, side("'a a' 'b c'"), '.layout').exitCode, 0);
  assert.deepEqual(result.areas.find(a => a.name === 'a').source.rows, [{ index: 1, source: result.rows[0].source }]);
});

test('BOM retains original offsets', () => {
  const css = '\uFEFF.layout { grid-template-areas: "a"; }';
  const result = analyze(css, 'bom.css', '.layout');
  assert.equal(result.rows[0].source.offset, css.indexOf('"'));
  assert.equal(result.rows[0].source.column, css.indexOf('"') + 1);
});

const blocked = [
  ['missing-selector', '.other { grid-template-areas: "a"; }', 'selector-not-found'],
  ['duplicate-selector', '.layout { grid-template-areas: "a"; } .layout { grid-template-areas: "b"; }', 'selector-ambiguous'],
  ['nested-selector', '@media (width > 1px) { .layout { grid-template-areas: "a"; } }', 'selector-nested'],
  ['nested-css', '.parent { .layout { grid-template-areas: "a"; } }', 'selector-nested'],
  ['mixed-matches', '.layout { grid-template-areas: "a"; } @media print { .layout { grid-template-areas: "b"; } }', 'selector-ambiguous'],
  ['missing-property', '.layout { display: grid; }', 'declaration-missing'],
  ['duplicate-property', '.layout { grid-template-areas: "a"; GRID-TEMPLATE-AREAS: "b"; }', 'declaration-duplicate'],
  ['important', '.layout { grid-template-areas: "a" !important; }', 'important'],
  ['grid', '.layout { grid: none; grid-template-areas: "a"; }', 'shorthand'],
  ['grid-template', '.layout { grid-template-areas: "a"; grid-template: none; }', 'shorthand'],
  ['all', '.layout { all: initial; grid-template-areas: "a"; }', 'shorthand'],
  ['import', '@import "other.css"; .layout { grid-template-areas: "a"; }', 'import'],
  ['escaped-import', '@\\69mport "other.css"; .layout { grid-template-areas: "a"; }', 'escaped-at-rule'],
  ['escaped-import-suffix', '@im\\port "other.css"; .layout { grid-template-areas: "a"; }', 'escaped-at-rule'],
  ['nested-override', '.layout { grid-template-areas: "a"; @media print { grid-template-areas: "b"; } }', 'nested-content'],
  ['escaped-property', '.layout { g\\72id: none; grid-template-areas: "a"; }', 'escaped-property'],
];
for (const [name, css, code] of blocked) test(`blocked context: ${name}`, () => {
  const result = analyze(css, 'blocked.css', '.layout');
  assert.equal(result.state, 'not-analyzed');
  assert.ok(result.diagnostics.some(issue => issue.code === code));
  assert.equal(result.areas, null);
  for (const issue of result.diagnostics) {
    assert.equal(issue.source.path, 'blocked.css');
    assert.equal(issue.source.line, 1);
    assert.ok(issue.source.column >= 1);
  }
});

test('selector is whole exact text, including groups', () => {
  const css = '.layout, .other { grid-template-areas: "a"; }';
  assert.equal(analyze(css, 'group.css', '.layout').state, 'not-analyzed');
  assert.equal(analyze(css, 'group.css', '.layout, .other').state, 'valid');
});

test('bounded rows, cells, bytes with inclusive limits', () => {
  assert.equal(side(Array(LIMITS.rows).fill('"."').join(' ')).state, 'valid');
  assert.equal(side(Array(LIMITS.rows + 1).fill('"."').join(' ')).diagnostics[0].code, 'row-limit');
  assert.equal(side(`"${Array(LIMITS.cells).fill('.').join(' ')}"`).state, 'valid');
  assert.equal(side(`"${Array(LIMITS.cells + 1).fill('.').join(' ')}"`).diagnostics[0].code, 'cell-limit');
  assert.equal(analyze(' '.repeat(LIMITS.bytes + 1), 'big.css', '.layout').diagnostics[0].code, 'byte-limit');
});

test('diagnostics retain exact declaration, row and unsupported value positions', () => {
  for (const [css, code, token] of [
    ['.layout {\n  grid: none;\n  grid-template-areas: "a";\n}', 'shorthand', 'grid:'],
    ['.layout {\n grid-template-areas: var(--x);\n}', 'unsupported-value', 'var('],
    ['.layout {\n grid-template-areas: "a a"\n "b";\n}', 'unequal-rows', '"b"'],
  ]) {
    const issue = analyze(css, 'input.css', '.layout').diagnostics.find(issue => issue.code === code);
    const offset = css.indexOf(token);
    assert.equal(issue.source.offset, offset);
    assert.equal(issue.source.line, css.slice(0, offset).split('\n').length);
    assert.equal(issue.source.column, css.slice(0, offset).split('\n').at(-1).length + 1);
  }
});
