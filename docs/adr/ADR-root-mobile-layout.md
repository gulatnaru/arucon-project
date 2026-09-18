# Mobile source under the root repository

Date: 2026-09-19. Status: user-directed repository layout.

The root repository is `/Users/heung/projects/arucon-project`, on branch
`feature/arucon-mobile-autonomous`. The user removed the old `mobile` gitlink
from the index and recreated `mobile/` as an empty ordinary directory.
All new mobile source, assets, tests, and lockfiles belong to this root repository.
Do not initialize Git inside `mobile/` or restore it as a submodule.

At the start of this run, HEAD `83897aa` still contained the historical mode
`160000` entry pointing to `800090441b5e9e0ae351d2cb02a16fa85d7a10c0`.
The index already staged its deletion. That commit object was unavailable in the
root object database; there was no `.git/modules` directory or local mobile
package source found under `/Users/heung/projects`. The earlier Windows
checkpoint describes source and results that were not present in this checkout.
They are historical evidence, not validation of the reconstructed code.

Preserve the user's staged gitlink deletion and `.gitignore` change. New files
should appear beneath `mobile/` in root Git status. `git -C mobile rev-parse
--show-toplevel` must resolve to the root repository, and `mobile/.git` must not
exist. Dependency directories, caches, local databases, build exports, and raw
evidence remain excluded by the root ignore rules.

This layout change does not authorize commit, push, merge, deployment, or a new
product decision. DEC-12/17/31 remain OPEN.
