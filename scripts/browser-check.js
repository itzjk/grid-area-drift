import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { analyze } from '../src/analyze.js';

const fixtures = JSON.parse(await readFile(new URL('../test/fixtures/templates.json', import.meta.url), 'utf8'));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  let checks = 0;
  for (const [group, supported] of [['valid', true], ['invalid', false]]) {
    for (const fixture of fixtures[group]) {
      const result = await page.evaluate(value => CSS.supports('grid-template-areas', value), fixture.value);
      assert.equal(result, supported, `${group}/${fixture.name}: CSS.supports`);
      checks++;
    }
  }
  const rectangles = {};
  for (const version of ['before', 'after']) {
    const css = await readFile(new URL(`../examples/${version}.css`, import.meta.url), 'utf8');
    const template = analyze(css, `examples/${version}.css`, '.layout');
    assert.equal(template.state, 'valid');
    await page.setContent(`<style>body{margin:0}.layout{display:grid;grid-template-columns:repeat(3,80px);grid-template-rows:repeat(3,40px);width:240px;height:120px}${css}</style><div class="layout"><div style="grid-area:head" data-area="head"></div><div style="grid-area:nav" data-area="nav"></div><div style="grid-area:main" data-area="main"></div><div style="grid-area:foot" data-area="foot"></div></div>`);
    const actual = await page.locator('[data-area]').evaluateAll(nodes => Object.fromEntries(nodes.map(node => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return [node.dataset.area, { x, y, width, height }];
    })));
    const expected = version === 'before' ? {
      head: { x: 0, y: 0, width: 240, height: 40 },
      nav: { x: 0, y: 40, width: 80, height: 40 },
      main: { x: 80, y: 40, width: 160, height: 40 },
      foot: { x: 0, y: 80, width: 240, height: 40 },
    } : {
      head: { x: 0, y: 0, width: 240, height: 40 },
      nav: { x: 160, y: 40, width: 80, height: 40 },
      main: { x: 0, y: 40, width: 160, height: 40 },
      foot: { x: 0, y: 80, width: 240, height: 40 },
    };
    assert.deepEqual(actual, expected, `${version}: rendered fixed-track rectangles`);
    for (const area of template.areas) {
      const rect = actual[area.name];
      assert.deepEqual(area.lines, [rect.y / 40 + 1, rect.x / 80 + 1, (rect.y + rect.height) / 40 + 1, (rect.x + rect.width) / 80 + 1]);
      checks++;
    }
    rectangles[version] = actual;
  }
  console.log(JSON.stringify({ chromium: browser.version(), checks, rectangles }, null, 2));
} finally {
  await browser.close();
}
