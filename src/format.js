const safe = text => String(text).replace(/[\x00-\x1f\x7f-\x9f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
const location = source => `${safe(source.path)}:${source.line}:${source.column}`;
const geometry = area => area ? `[${area.lines.join(',')}] span ${area.span.rows}x${area.span.columns} (${area.cellCount} ${area.cellCount === 1 ? 'cell' : 'cells'})` : 'absent';

export function formatText(report) {
  const output = [`grid-area-drift: ${report.status}`, `Selector: ${safe(report.selector)}`, 'Logical lines [row-start,column-start,row-end,column-end], 1-based.'];
  for (const label of ['before', 'after']) {
    const side = report[label];
    output.push('');
    if (side.state !== 'valid') {
      output.push(`${label}: ${safe(side.path)} (${side.state})`);
      for (const issue of side.diagnostics) output.push(`  ${location(issue.source)} ${issue.code}: ${safe(issue.message)}`);
      continue;
    }
    output.push(`${label}: ${location(side.declaration)} (${side.dimensions.rows} rows x ${side.dimensions.columns} columns)`);
    if (!side.rows.length) output.push('  none (no areas declared by this property)');
    for (const row of side.rows.slice(0, 8)) {
      const cells = row.cells.slice(0, 8).map(cell => cell.length > 24 ? `${cell.slice(0, 21)}...` : cell).join(' ');
      output.push(`  ${row.index}: ${cells}${row.cells.length > 8 ? ' ...' : ''}  (${location(row.source)})`);
    }
    if (side.rows.length > 8) output.push('  ... (full matrix in --json)');
  }
  output.push('');
  if (!report.complete) output.push('Comparison incomplete. No area changes asserted.');
  else {
    const s = report.summary;
    output.push(`${s.changed} changed, ${s.added} added, ${s.removed} removed, ${s.unchanged} unchanged${s.dimensionsChanged ? '; matrix dimensions changed' : ''}`);
    for (const change of report.changes) {
      const flags = [change.originChanged && 'origin-changed', change.spanChanged && 'span-changed'].filter(Boolean);
      output.push(`${change.state.padEnd(9)} ${change.name}${flags.length ? ` (${flags.join(', ')})` : ''}`);
      output.push(`  ${geometry(change.before)} -> ${geometry(change.after)}`);
    }
  }
  return `${output.join('\n')}\n`;
}
