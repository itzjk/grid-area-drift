import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

export const LIMITS = Object.freeze({ bytes: 1_048_576, rows: 128, cells: 16_384 });

function locator(css, path) {
  const starts = [0];
  for (let i = 0; i < css.length; i++) if (css[i] === '\n') starts.push(i + 1);
  return offset => {
    let lo = 0;
    let hi = starts.length;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >>> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid;
    }
    return { path, line: lo + 1, column: offset - starts[lo] + 1, offset };
  };
}

export function analyze(css, path, selector) {
  const locate = locator(css, path);
  const bom = css.startsWith('\uFEFF') ? 1 : 0;
  const base = { path, state: 'not-analyzed', declaration: null, dimensions: null, rows: null, areas: null, diagnostics: [] };
  const issue = (code, message, offset = 0, state = 'not-analyzed') => {
    base.state = state;
    base.diagnostics.push({ code, message, source: locate(offset) });
  };
  if (Buffer.byteLength(css) > LIMITS.bytes) {
    issue('byte-limit', `Input exceeds ${LIMITS.bytes} bytes.`);
    return base;
  }
  let root;
  try {
    root = postcss.parse(css, { from: undefined });
  } catch (error) {
    const offset = (error.input?.offset ?? 0) + bom;
    if (css.slice(offset, offset + 2) === '@\\') issue('escaped-at-rule', 'Escaped at-rule names are outside the supported subset.', offset);
    else issue('css-syntax', error.reason || 'CSS could not be parsed.', offset, 'invalid-input');
    return base;
  }
  const offsetOf = node => (node.source?.start?.offset ?? 0) + bom;
  root.walkAtRules(at => {
    if (at.name.toLowerCase() === 'import') issue('import', 'Imports are not followed; provide self-contained compiled CSS.', offsetOf(at));
    if (at.name.includes('\\') || (!at.raws.afterName && at.params.startsWith('\\'))) issue('escaped-at-rule', 'Escaped at-rule names are outside the supported subset.', offsetOf(at));
  });
  const matches = [];
  root.walkRules(rule => { if (rule.selector === selector) matches.push(rule); });
  if (matches.length === 0) {
    issue('selector-not-found', 'Exact selector was not found.');
    return base;
  }
  if (matches.length > 1) {
    for (const rule of matches) issue('selector-ambiguous', `Exact selector matches ${matches.length} blocks.`, offsetOf(rule));
    return base;
  }
  const rule = matches[0];
  if (rule.parent !== root) {
    issue('selector-nested', 'The selected block must be a top-level rule.', offsetOf(rule));
    return base;
  }
  const declarations = rule.nodes.filter(node => node.type === 'decl' && node.prop.toLowerCase() === 'grid-template-areas');
  for (const node of rule.nodes) {
    if (node.type !== 'decl' && node.type !== 'comment') issue('nested-content', 'Nested rules and at-rules inside the selected block are not analyzed.', offsetOf(node));
    if (node.type === 'decl') {
      const prop = node.prop.toLowerCase();
      if (['grid', 'grid-template', 'all'].includes(prop)) issue('shorthand', `${prop} can reset the selected property.`, offsetOf(node));
      if (node.important) issue('important', '!important in the selected block is outside the supported subset.', offsetOf(node));
      if (node.prop.includes('\\')) issue('escaped-property', 'Escaped property names are outside the supported subset.', offsetOf(node));
    }
  }
  if (declarations.length !== 1) {
    if (!declarations.length) issue('declaration-missing', 'Expected one explicit grid-template-areas declaration.', offsetOf(rule));
    for (const decl of declarations) issue('declaration-duplicate', 'Multiple grid-template-areas declarations are not resolved.', offsetOf(decl));
    return base;
  }
  const decl = declarations[0];
  base.declaration = locate(offsetOf(decl));
  if (base.diagnostics.length) return base;
  const rawValue = decl.raws.value?.raw ?? decl.value;
  const valueOffset = offsetOf(decl) + decl.prop.length + decl.raws.between.length;
  const nodes = valueParser(rawValue).nodes.filter(node => node.type !== 'space' && node.type !== 'comment');
  if (nodes.length === 1 && nodes[0].type === 'word' && nodes[0].value.toLowerCase() === 'none') {
    return { ...base, state: 'valid', dimensions: { rows: 0, columns: 0 }, rows: [], areas: [] };
  }
  if (!nodes.length || nodes.some(node => node.type !== 'string' || node.unclosed)) {
    const node = nodes.find(node => node.type !== 'string' || node.unclosed);
    issue('unsupported-value', 'Expected quoted rows or none; functions, keywords and other value forms are not analyzed.', valueOffset + (node?.sourceIndex ?? 0));
    return base;
  }
  if (nodes.length > LIMITS.rows) {
    issue('row-limit', `Template exceeds ${LIMITS.rows} rows.`, valueOffset + nodes[LIMITS.rows].sourceIndex);
    return base;
  }
  const rows = [];
  let count = 0;
  for (const [index, node] of nodes.entries()) {
    const source = locate(valueOffset + node.sourceIndex);
    if (node.value.includes('\\')) issue('unsupported-escape', 'Escapes in template strings are not analyzed.', source.offset);
    else if (/[\r\n\f]/.test(node.value)) issue('invalid-string', 'Unescaped newlines are not allowed in CSS strings.', source.offset, 'invalid-template');
    else {
      const text = node.value.replace(/^[ \t]+|[ \t]+$/g, '');
      const cells = text ? text.split(/[ \t]+/) : [];
      if (cells.some(cell => cell !== '.' && !/^[A-Za-z_][A-Za-z0-9_-]*$/.test(cell))) {
        issue('unsupported-cell', 'Supported cells are ASCII names [A-Za-z_][A-Za-z0-9_-]* or a single space-separated dot.', source.offset);
      }
      count += cells.length;
      rows.push({ index: index + 1, source, cells });
    }
  }
  if (count > LIMITS.cells) issue('cell-limit', `Template exceeds ${LIMITS.cells} cells.`, valueOffset);
  if (base.diagnostics.length) return base;
  const columns = rows[0].cells.length;
  for (const row of rows) {
    if (!row.cells.length) issue('empty-row', 'Every template row must contain at least one cell.', row.source.offset, 'invalid-template');
    else if (row.cells.length !== columns) issue('unequal-rows', 'Every template row must contain the same number of cells.', row.source.offset, 'invalid-template');
  }
  if (base.diagnostics.length) return base;
  const occupied = new Map();
  for (const row of rows) {
    for (const [column, name] of row.cells.entries()) {
      if (name === '.') continue;
      if (!occupied.has(name)) occupied.set(name, []);
      occupied.get(name).push([row.index, column + 1]);
    }
  }
  const areas = [];
  for (const [name, cells] of occupied) {
    let r0 = Infinity;
    let c0 = Infinity;
    let r1 = 0;
    let c1 = 0;
    for (const [r, c] of cells) {
      r0 = Math.min(r0, r);
      c0 = Math.min(c0, c);
      r1 = Math.max(r1, r + 1);
      c1 = Math.max(c1, c + 1);
    }
    const span = { rows: r1 - r0, columns: c1 - c0 };
    if (cells.length !== span.rows * span.columns) {
      issue('non-rectangular', `Area ${name} has ${cells.length} cells inside a ${span.rows * span.columns}-cell rectangle.`, rows[r0 - 1].source.offset, 'invalid-template');
    }
    areas.push({ name, lines: [r0, c0, r1, c1], span, cellCount: cells.length, cells, source: {
      declaration: base.declaration,
      rows: rows.slice(r0 - 1, r1 - 1).map(row => ({ index: row.index, source: row.source })),
    } });
  }
  if (base.diagnostics.length) return base;
  return { ...base, state: 'valid', dimensions: { rows: rows.length, columns }, rows, areas };
}
