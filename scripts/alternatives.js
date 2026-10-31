import { readFile } from 'node:fs/promises';
import stylelint from 'stylelint';
import { chromium } from 'playwright';

const files = ['before', 'after', 'invalid'];
const sources = await Promise.all(files.map(name => readFile(`examples/${name}.css`, 'utf8')));
const lint = await Promise.all(sources.map(code => stylelint.lint({
  code,
  config: { rules: { 'named-grid-areas-no-invalid': true } },
})));
console.log(JSON.stringify({ stylelint: lint.map((result, i) => ({
  file: `examples/${files[i]}.css`,
  warnings: result.results[0].warnings,
})) }, null, 2));

const reference = css => {
  const rows = [...css.matchAll(/"([^"\n]*)"/g)].map(match => match[1].split(/\s+/));
  const names = [...new Set(rows.flat())].filter(name => name !== '.');
  return Object.fromEntries(names.map(name => {
    const cells = rows.flatMap((row, r) => row.flatMap((cell, c) => cell === name ? [[r, c]] : []));
    const rs = cells.map(([r]) => r);
    const cs = cells.map(([, c]) => c);
    return [name, [Math.min(...rs) + 1, Math.min(...cs) + 1, Math.max(...rs) + 2, Math.max(...cs) + 2]];
  }));
};
console.log(JSON.stringify({ reference: { before: reference(sources[0]), after: reference(sources[1]) } }, null, 2));

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const session = await page.context().newCDPSession(page);
  await session.send('DOM.enable');
  await session.send('CSS.enable');
  await session.send('Overlay.enable');
  for (let i = 0; i < 2; i++) {
    await page.setContent(`<style>.layout { display: grid; grid-template-columns: repeat(3, 80px); grid-template-rows: repeat(3, 40px); }${sources[i]}</style><div class="layout"><div style="grid-area:nav">nav</div><div style="grid-area:main">main</div></div>`);
    const { root } = await session.send('DOM.getDocument');
    const { nodeId } = await session.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.layout' });
    await session.send('Overlay.setShowGridOverlays', { gridNodeHighlightConfigs: [{
      nodeId,
      gridHighlightConfig: { showLineNames: true, showAreaNames: true, showPositiveLineNumbers: true },
    }] });
    console.log(JSON.stringify({ inspector: 'Chromium DevTools grid overlay', version: browser.version(), file: files[i], overlayEnabled: true }));
  }
} finally {
  await browser.close();
}
