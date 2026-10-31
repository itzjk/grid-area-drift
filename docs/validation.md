# Build verification

Observed on 2026-10-31 using Node.js 24.16.0. Browser-dependent checks are listed separately from passing checks.

| Check | Observed result |
| --- | --- |
| Clean source snapshot, local git clone, `npm ci` | Passed; 118 packages installed, audit reported zero vulnerabilities |
| `npm test` in that clean clone, including a path with spaces | Passed, 57 tests, zero failures |
| `npm run test:mutations` | Clean baseline passed; all three mutations killed |
| Forced baseline failure in a disposable copy | Mutation runner exited 1 before running any mutation |
| `npm pack`, global tarball install into isolated prefix | Passed; CLI runs without development dependencies |
| Main installed CLI example | Exit 1; nav and main moved, spans preserved; head and foot unchanged |
| Nonrectangular example | Exit 2; invalid-template; no change list or repaired area geometry |
| Input immutability assertions | Passed for all three checked-in CSS examples |
| README terminal excerpt | Matched current CLI stdout |
| `vhs validate docs/demo.tape` | Passed |

An independent reviewer started with only the README, installed the tarball, supplied separate added/removed/moved/resized/combined-change/none/null-column fixtures, and verified exit codes 0 through 3. The reviewer reran the updated 57 tests and all three mutations successfully. The review found the escaped-at-rule classification regression and the missing mutation baseline guard; both were fixed before the passing clean-clone run.

## Checks still blocked

- The requested GitHub install command was attempted. The SSH route failed authentication; an HTTPS retry returned `Repository not found`. The repository has not been published. Public installation cannot be verified until it exists.
- Chrome for Testing 156.0.8078.4, Playwright Chromium v1248, downloaded successfully. `npm run test:browser` then failed at launch with macOS `bootstrap_check_in ... Permission denied (1100)`, followed by SIGTRAP. No CSS.supports or rendered rectangle assertions ran. A secondary browser connection was unavailable. CI contains the independent browser checks, but remote CI has not run.
- `vhs docs/demo.tape` failed with `could not start browser: browser exited unexpectedly before its debugging endpoint was ready`. No GIF was generated. The README uses terminal output until the real recording can be produced and inspected.
- The primary repository's Git metadata is read-only in the build sandbox. `git add` failed while creating `.git/index.lock`; no primary-repository commits were created. Disposable snapshot commits used the requested public author solely to enable clean-clone verification.

## Remaining gate

Run the browser oracle and alternative-tool experiment where Chromium can launch, record and inspect the 10–25 second VHS demo, embed its GIF, create the primary repository's small commits, then verify installation after the authorized publication step. The browser checks are mandatory in CI and do not silently skip on launch failure. Nothing was pushed or published during construction.
