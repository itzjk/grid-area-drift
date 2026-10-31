# grid-area-drift

See which named CSS Grid regions moved, resized, appeared or disappeared between two stylesheets.

[![CI](https://github.com/itzjk/grid-area-drift/actions/workflows/ci.yml/badge.svg)](https://github.com/itzjk/grid-area-drift/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

```text
2 changed, 0 added, 0 removed, 2 unchanged
unchanged foot
  [3,1,4,4] span 1x3 (3 cells) -> [3,1,4,4] span 1x3 (3 cells)
unchanged head
  [1,1,2,4] span 1x3 (3 cells) -> [1,1,2,4] span 1x3 (3 cells)
changed   main (origin-changed)
  [2,2,3,4] span 1x2 (2 cells) -> [2,1,3,3] span 1x2 (2 cells)
changed   nav (origin-changed)
  [2,1,3,2] span 1x1 (1 cell) -> [2,3,3,4] span 1x1 (1 cell)
```

[Demo recording tape](docs/demo.tape)

## Quick start

Requires Node.js 22 or newer. Install:

```sh
npm i -g github:itzjk/grid-area-drift
```

Compare your two compiled CSS files:

```sh
grid-area-drift before.css after.css --selector .layout
```

## Features

- Track each exact, case-sensitive area name across versions.
- Distinguish origin changes from span changes, including both at once.
- Review occupied cells, logical lines and spans with both source locations.
- Read a compact matrix preview or consume the complete versioned JSON report.
- Use distinct exit codes for differences, incomplete comparisons and input errors.

## Why

Changing `"nav main main"` to `"main main nav"` keeps every name but moves two regions; a string diff leaves reviewers to reconstruct the coordinates. [Stylelint](https://stylelint.io/user-guide/rules/named-grid-areas-no-invalid/) validates template shapes, and [Firefox's Grid Inspector](https://firefox-source-docs.mozilla.org/devtools-user/page_inspector/how_to/examine_grid_layouts/index.html) displays a running layout; this tool supplies a report between two files. Interface tooling such as [Impeccable](https://github.com/pbakaus/impeccable) and [Hallmark](https://github.com/Nutlope/hallmark) provides broader design context, while demand and time savings for this particular comparison remain unmeasured.

## How it works

PostCSS locates the exact rule, and a value parser preserves each template string's position. Supported rows must have equal lengths and each name must fill a rectangle, following [CSS Grid section 7.3](https://www.w3.org/TR/css-grid-1/#grid-template-areas-property). Names are compared by origin and span. Lines use `[row-start, column-start, row-end, column-end]`, starting at one with exclusive ends. A column index is logical, regardless of writing mode or track width. Matrix dimensions are compared too, so adding a null column still counts as a difference.

## Usage

| Argument or option | Meaning |
| --- | --- |
| `before.css after.css` | Two local UTF-8 compiled stylesheets |
| `--selector <text>` | Exact complete selector text, required |
| `--json` | Full matrices and area report, `schemaVersion: 1` |
| `--help` | Usage and limits |
| `--version` | Installed version |

Exit codes: **0** complete and equal; **1** complete with differences; **2** incomplete; **3** unreadable input, malformed CSS or bad arguments. A nonrectangular template returns **2** with `invalid-template`, rather than reporting repaired regions. JSON is written to stdout, including argument errors. See the [report contract](docs/report.md) for fields and diagnostics.

## FAQ

**Does it resolve the cascade?** No. Supply one matching top-level block per file and one explicit `grid-template-areas` declaration. A selector list matches only when the entire list matches your argument.

**What does `none` mean?** This property declares no named areas. Other properties may still establish tracks or implicitly named areas.

**Can CI distinguish unsupported input from a change?** Yes. Incomplete reports have no change list or summary. Treat exit code 2 as a review requirement, separately from exit code 1.

**Does it change my files?** No. It only reads the two paths; it fetches no imports, runs no stylesheet code and needs no account.

## Limitations

- Supported rows contain unescaped strings, ASCII names matching `[A-Za-z_][A-Za-z0-9_-]*`, and single dots separated by spaces or tabs. `none` is also supported.
- Numeric names, Unicode, escapes and dot sequences return `not-analyzed`, not a claim that the CSS is invalid.
- Duplicate or nested matches, duplicate declarations, imports, shorthands, resets and `!important` prevent a complete comparison.
- Each file is limited to 1,048,576 bytes; each template to 128 rows and 16,384 cells. Text previews show at most eight rows and columns; JSON retains everything within the limits.
- The report describes declarations, not DOM membership, computed styles or physical layout. It never guesses renames.

## Contributing

From a clone, install dependencies with `npm ci` and run `npm test`; browser and mutation checks are described in [development notes](docs/development.md).

## License

[MIT](LICENSE).
