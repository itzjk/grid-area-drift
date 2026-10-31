#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readTemplate } from '../src/read.js';
import { compare } from '../src/compare.js';
import { formatText } from '../src/format.js';

const help = `grid-area-drift <before.css> <after.css> --selector <exact selector> [--json]

Compare one top-level grid-template-areas declaration in two local UTF-8 files.
Selector text must match the complete rule selector exactly.

Options:
  --selector <text>  Required exact selector
  --json             JSON report, schemaVersion 1
  --help             Show usage
  --version          Show version

Exit codes: 0 equal, 1 different, 2 incomplete, 3 invalid input or arguments.
Limits per file: 1,048,576 bytes; per template: 128 rows, 16,384 cells.
Coordinates are logical indices, not pixels or computed browser layout.
`;

let options;
try {
  options = parseArgs({ allowPositionals: true, options: {
    selector: { type: 'string' }, json: { type: 'boolean' }, help: { type: 'boolean' }, version: { type: 'boolean' },
  } });
  const occurrences = process.argv.slice(2).filter(arg => arg === '--selector' || arg.startsWith('--selector=')).length;
  if (occurrences > 1) throw new Error('Pass --selector exactly once.');
  if (!options.values.help && !options.values.version && (options.positionals.length !== 2 || !options.values.selector?.trim())) {
    throw new Error('Expected two CSS paths and --selector <exact selector>.');
  }
} catch (error) {
  if (process.argv.includes('--json')) console.log(JSON.stringify({ schemaVersion: 1, status: 'invalid-input', complete: false, exitCode: 3, diagnostics: [{ code: 'arguments', message: error.message }] }, null, 2));
  else process.stderr.write(`${error.message}\n\n${help}`);
  process.exitCode = 3;
}
if (process.exitCode !== 3) {
  if (options.values.help) process.stdout.write(help);
  else if (options.values.version) console.log('0.1.0');
  else {
    const [before, after] = await Promise.all(options.positionals.map(path => readTemplate(path, options.values.selector)));
    const report = compare(before, after, options.values.selector);
    process.stdout.write(options.values.json ? `${JSON.stringify(report, null, 2)}\n` : formatText(report));
    process.exitCode = report.exitCode;
  }
}
