# Alternative-tool experiment

Checked on 2026-10-31 before implementing the comparator. This is a scoped comparison, not a claim that no competing package exists.

## Stylelint

[named-grid-areas-no-invalid](https://stylelint.io/user-guide/rules/named-grid-areas-no-invalid/) checks template shapes. Running Stylelint 17.16.0 with only that rule returned no warnings for `examples/before.css` or `examples/after.css`. For `examples/invalid.css`, it returned `Expected single filled-in rectangle for "main"` at line 4, column 5. It did not return paired coordinates or a semantic change list for the valid files. Stylelint remains the choice for general linting; this package does not add another configurable lint rule.

## Grid inspectors

The [Firefox Grid Inspector documentation](https://firefox-source-docs.mozilla.org/devtools-user/page_inspector/how_to/examine_grid_layouts/index.html), read on the check date, describes area labels, line numbers and tooltips over a rendered grid. Those controls inspect a page; the documented interface does not describe a two-file semantic report. Firefox itself was not run.

The reproducible experiment also requests the Chromium DevTools Grid overlay for each example with line and area labels enabled. Local launch of Chrome for Testing 156.0.8078.4 failed with `bootstrap_check_in ... Permission denied (1100)`. The Computer Use fallback had no available browser connection and refused native Chrome access. Overlay output and the browser oracle remain unverified locally; the scripts fail rather than skipping them. CI is configured to execute both. No browser layout result is claimed from the documentation review.

## Short reference script

`scripts/alternatives.js` independently reads quoted rows from the two known fixtures and enumerates occupied cells. It returned:

| Area | Before lines | After lines |
| --- | --- | --- |
| head | [1,1,2,4] | [1,1,2,4] |
| nav | [2,1,3,2] | [2,3,3,4] |
| main | [2,2,3,4] | [2,1,3,3] |
| foot | [3,1,4,4] | [3,1,4,4] |

That script demonstrates the arithmetic is small. It does not select CSS rules, validate unknown inputs, preserve locations or emit the requested review contract, so it is a reference for these fixtures, not an equivalent general-purpose tool.

## Decision

The executed Stylelint result and the documented inspector features did not supply the requested report with equal ease. A web search for a grid-template-areas diff CLI did not identify an equivalent during this check; absence in those results does not establish nonexistence. Proceed with one bounded comparison of two explicit declarations, without adding a layout engine. Demand and time savings for the comparator remain unmeasured.
