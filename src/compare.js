import { LIMITS } from './analyze.js';

export function compare(before, after, selector) {
  const report = {
    schemaVersion: 1,
    selector,
    complete: before.state === 'valid' && after.state === 'valid',
    status: 'incomplete',
    exitCode: 2,
    coordinateSystem: '1-based logical lines: row-start, column-start, row-end, column-end; end lines exclusive',
    limits: LIMITS,
    before,
    after,
    summary: null,
    changes: null,
  };
  if (before.state === 'invalid-input' || after.state === 'invalid-input') {
    report.status = 'invalid-input';
    report.exitCode = 3;
  }
  if (!report.complete) return report;
  const oldAreas = new Map(before.areas.map(area => [area.name, area]));
  const newAreas = new Map(after.areas.map(area => [area.name, area]));
  report.summary = { added: 0, removed: 0, unchanged: 0, changed: 0, originChanged: 0, spanChanged: 0, dimensionsChanged: before.dimensions.rows !== after.dimensions.rows || before.dimensions.columns !== after.dimensions.columns };
  report.changes = [...new Set([...oldAreas.keys(), ...newAreas.keys()])].sort().map(name => {
    const oldArea = oldAreas.get(name) ?? null;
    const newArea = newAreas.get(name) ?? null;
    let state = oldArea ? 'removed' : 'added';
    let originChanged = null;
    let spanChanged = null;
    if (oldArea && newArea) {
      originChanged = oldArea.lines[0] !== newArea.lines[0] || oldArea.lines[1] !== newArea.lines[1];
      spanChanged = oldArea.span.rows !== newArea.span.rows || oldArea.span.columns !== newArea.span.columns;
      state = originChanged || spanChanged ? 'changed' : 'unchanged';
    }
    report.summary[state]++;
    if (originChanged) report.summary.originChanged++;
    if (spanChanged) report.summary.spanChanged++;
    return { name, state, presence: { before: Boolean(oldArea), after: Boolean(newArea) }, originChanged, spanChanged, before: oldArea, after: newArea };
  });
  const different = report.summary.dimensionsChanged || report.changes.some(change => change.state !== 'unchanged');
  report.status = different ? 'different' : 'equal';
  report.exitCode = different ? 1 : 0;
  return report;
}
