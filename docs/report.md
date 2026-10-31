# Report contract, version 1

The JSON root contains `schemaVersion`, `selector`, `complete`, `status`, `exitCode`, `coordinateSystem`, `limits`, `before`, `after`, `summary` and `changes`.

`status` is `equal`, `different`, `incomplete` or `invalid-input`. An argument error has a smaller envelope: the version, status, completeness, exit code and root `diagnostics`; file arguments were not analyzed.

Each side has a `path`, `state`, `declaration`, `dimensions`, `rows`, `areas` and `diagnostics`. Side states are `valid`, `not-analyzed`, `invalid-template` and `invalid-input`. Unsupported syntax is not CSS validation failure. Only the supported subset is validated. A side that is not valid has null dimensions, rows and areas. Its declaration location can be available even when analysis stops there.

Locations contain the supplied path, one-based line and UTF-16 column, and zero-based UTF-16 offset in the original file. Lines follow LF boundaries, including CRLF. A template row points to its opening quote. Declaration locations point to the property name. Diagnostics without a relevant syntax node, such as a missing selector or a file limit, point to line 1, column 1.

For a valid side, dimensions count declared template rows and columns. `none` is represented by zero rows, zero columns and empty row/area lists. Each row contains its one-based index, source and normalized `cells`. A single dot is a null cell.

Each area has an exact `name`, `lines`, `span`, `cellCount`, `cells` and `source`. `cells` lists occupied `[row, column]` indices from one. Lines are `[row-start, column-start, row-end, column-end]`, with exclusive ends. `span` has `rows` and `columns`. Area provenance includes the declaration and every contributing template row. These coordinates do not depend on pixels or writing mode.

Each change contains `name`, `state`, `presence`, `originChanged`, `spanChanged`, `before` and `after`. States are `added`, `removed`, `unchanged` and `changed`. Absent sides are null. Movement and resize flags are independent booleans when an area exists on both sides, and null for additions/removals. Presence has `before` and `after` booleans. Names are sorted by JavaScript string order; no rename inference occurs.

Summary counts the four states and the independent origin/span flags. `dimensionsChanged` compares the complete matrix sizes, including null tracks. An empty-area template can therefore differ from another empty-area template. An area can remain unchanged while its surrounding matrix changes size.

No changes are asserted unless both sides are valid. An incomplete report has `summary: null` and `changes: null`, even if one side is fully analyzed. The valid side may retain its independently known geometry.

| Exit | Meaning |
| --- | --- |
| 0 | Complete comparison, same area geometry and matrix dimensions |
| 1 | Complete comparison, area or matrix difference |
| 2 | Incomplete comparison, unsupported context/value, limit, or invalid template |
| 3 | Input cannot be read as regular UTF-8 CSS, CSS parse failure, or argument error |

Diagnostic codes include `selector-not-found`, `selector-ambiguous`, `selector-nested`, `declaration-missing`, `declaration-duplicate`, `import`, `escaped-at-rule`, `nested-content`, `important`, `shorthand`, `escaped-property`, `unsupported-value`, `unsupported-cell`, `unsupported-escape`, `invalid-string`, `empty-row`, `unequal-rows`, `non-rectangular`, `byte-limit`, `row-limit`, `cell-limit`, `css-syntax`, `encoding` and `arguments`. OS read errors use the OS code. The `all` reset is blocked alongside `grid` and `grid-template` shorthands. Imports and escaped at-rule names anywhere in either file are blocked; nested content and important declarations inside the selected block are blocked. Other blocks are not evaluated for cascade effects.
