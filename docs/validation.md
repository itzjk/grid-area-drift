# Build verification

Checked on 2026-10-31 with Node.js 24.16.0 and npm 11.13.0. Tests ran in a fresh local Git clone, including a space in its path, with no inherited `node_modules`. npm used isolated installation prefixes and caches. No remote publication or push was performed.

## README commands

| Command | Observed result |
| --- | --- |
| `npm ci` | Exit 0; 118 packages installed; zero audit vulnerabilities |
| `npm test` | Exit 0; **57 tests, 57 passed, 0 failed, 0 skipped** |
| `npm i -g .` | Exit 0; installed the CLI from the clean clone into an isolated global prefix |
| `grid-area-drift before.css after.css --selector .layout` | Exit 1; 2 changed, 0 added, 0 removed, 2 unchanged |
| `npm i -g github:itzjk/grid-area-drift` | Exit 128; the GitHub shorthand attempted SSH and authentication failed |

The usage command ran outside the clone against copies of the included CSS examples, using the installed command on PATH. Its output contained:

```text
changed   main (origin-changed)
  [2,2,3,4] span 1x2 (2 cells) -> [2,1,3,3] span 1x2 (2 cells)
changed   nav (origin-changed)
  [2,1,3,2] span 1x1 (1 cell) -> [2,3,3,4] span 1x1 (1 cell)
```

The JSON report asserted all four names' exact before/after coordinates, including unchanged head and foot. Further installed-command runs returned 0 for equal templates, 2 for `invalid.css`, and 3 for a missing input. `--help` and `--version` returned 0. SHA-256 hashes of all three input files were unchanged after the comparisons.

The GitHub install was attempted, not verified successfully. An HTTPS request to `https://github.com/itzjk/grid-area-drift` and the public repository API returned 404. Public installation needs another check once the repository is available; a local installation does not establish that the GitHub command works.

## Negative and browser checks

`npm run test:mutations` passed its clean baseline, then killed each of the three mutations: ignoring the initial column, comparing only spans, and accepting nonrectangular regions.

The default `npm run test:browser` and `npm run check:alternatives` launches failed locally with `bootstrap_check_in ... Permission denied (1100)`. Separate diagnostic runs used a temporary Playwright launch adapter adding `--single-process --no-zygote`; the checked-in assertions were unchanged.

On Chromium **156.0.8078.4**, the browser oracle passed **23 checks**: 15 `CSS.supports` fixture checks and eight rendered area comparisons. Fixed tracks were 80px wide and 40px tall. The browser measured nav moving from `(0,40,80,40)` to `(160,40,80,40)` and main moving from `(80,40,160,40)` to `(0,40,160,40)`, in `(x,y,width,height)` order. Head and foot retained their rectangles. Every rectangle was also compared to the analyzer's logical lines.

The alternative-tool experiment completed under the same diagnostic launch configuration: Stylelint accepted both valid examples, rejected the negative fixture at line 4, column 5, and Chromium enabled the Grid overlay on both versions. See [alternatives](alternatives.md). These passing diagnostics do not establish that the default local browser launch works. CI retains the default browser configuration; remote CI has not been run.

## Terminal recording

[The tape](demo.tape) requires `grid-area-drift` on PATH and invokes the same installed command as the README. The recording uses copies of the included before/after examples. The generated [GIF](demo.gif) is embedded in the first screen of the README and included in the npm package's file list.

The installed VHS 0.12.1 could not launch its default browser in this environment. Recording used a temporary build of VHS (source revision `24fa225`) with Chromium headless shell selected and its browser launch adapted to `--single-process --no-zygote`. The CLI, terminal input and output were not substituted. The opening command and completed result frames were decoded for visual inspection. To record on a host with normal browser access, follow [development](development.md).

FFprobe measured **12.68 seconds**, **317 frames**, **1200 x 880 pixels**, and **125,088 bytes**. SHA-256: `b44e956f0834df0628d7c2eaef1eb8278a36e67ef22cf702efe30eae909a2241`.

## Independent README review

A separate reviewer read only the README's installation, usage and testing instructions before making a fresh snapshot clone. Their `npm ci`, `npm test` and `npm i -g .` runs passed, with 57 tests and zero failures or skips. The installed CLI reproduced the exact main/nav coordinates from a separate consumer directory. They also confirmed the GitHub install failure and HTTPS 404.

The reviewer then ran `npm pack`, installed that tarball into a separate isolated global prefix, and ran the main comparison again. It returned exit 1 with the expected two changed and two unchanged areas. The production installation contained no Playwright or Stylelint development dependencies. Both the tarball and installed package contained a byte-identical copy of the final GIF, and the README embed and installed-command tape were verified.

## Remaining external checks

Public GitHub installation and remote CI remain unverified until the repository is available. The passing browser results above use the stated diagnostic configuration; default local startup still fails. Nothing was published to work around those limits.
