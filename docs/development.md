# Development

Requires Node.js 22+ and npm. From a clone:

```sh
npm ci
npm test
```

Run the independent browser oracle:

```sh
npx playwright install chromium
npm run test:browser
```

It prints the actual Chromium version, checks supported and invalid fixtures with `CSS.supports`, then renders the main example with fixed 80px columns and 40px rows. Every element rectangle is asserted against hand-specified pixels and against the analyzer's logical lines. The browser is a development dependency, never part of the CLI runtime. CI runs these checks on Node.js 22 and 24.

Run negative verification:

```sh
npm run test:mutations
```

This copies the source into disposable temporary directories. Each mutation must produce assertion failures: ignoring initial columns, comparing only spans, and accepting nonrectangular areas. The working source is not modified.

Reproduce the alternative-tool experiment:

```sh
npm run check:alternatives
```

This invokes Stylelint's shape validation, prints a deliberately small fixture-only reference script's coordinates, and enables the Chromium DevTools Grid overlay on each version. See [the experiment](alternatives.md) for scope and observations.

Record the terminal demo with [VHS](https://github.com/charmbracelet/vhs), ttyd and FFmpeg installed:

```sh
vhs docs/demo.tape
```

The tape runs the CLI on the included examples and writes `docs/demo.gif`. It never publishes the recording. Add the GIF to the README after a successful recording and visual inspection.
