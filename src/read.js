import { open, constants } from 'node:fs/promises';
import { LIMITS, analyze } from './analyze.js';

export async function readTemplate(path, selector) {
  let file;
  try {
    file = await open(path, constants.O_RDONLY | constants.O_NONBLOCK);
    const stat = await file.stat();
    if (!stat.isFile()) throw Object.assign(new Error(), { code: 'not-regular-file' });
    const buffer = Buffer.alloc(LIMITS.bytes + 1);
    let bytes = 0;
    while (bytes < buffer.length) {
      const result = await file.read(buffer, bytes, buffer.length - bytes, null);
      if (!result.bytesRead) break;
      bytes += result.bytesRead;
    }
    if (bytes > LIMITS.bytes) return failure(path, 'not-analyzed', 'byte-limit', `Input exceeds ${LIMITS.bytes} bytes.`);
    let css;
    try {
      css = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, bytes));
    } catch {
      return failure(path, 'invalid-input', 'encoding', 'Input must be UTF-8 CSS.');
    }
    return analyze(css, path, selector);
  } catch (error) {
    return failure(path, 'invalid-input', error.code ?? 'read-error', 'Could not read a regular local CSS file.');
  } finally {
    if (file) await file.close();
  }
}

function failure(path, state, code, message) {
  return { path, state, declaration: null, dimensions: null, rows: null, areas: null, diagnostics: [{ code, message, source: { path, line: 1, column: 1, offset: 0 } }] };
}
