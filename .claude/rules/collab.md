# Working in parallel (3 people, 3 Claude sessions, one `main`)

- `docs/PLAN.md` is the source of truth: architecture, contracts, file ownership, tasks. Read it at the start of a session. The user tells you their role (A, B or C), usually via `/role`.
- **Only edit files your role owns** according to the ownership map. If you need a change in another role's file, stop and tell the user exactly what to ask for — unless the user explicitly overrides this.
- **Contracts** (shared types, API shapes, event formats — listed in PLAN.md) change only by team agreement. Propose the change; don't make it.
- Don't reformat, reorder imports or rename anything in code you aren't otherwise changing.
- **Dependencies are added only by role A** unless PLAN.md says otherwise. Don't touch the lockfile otherwise.
- Prefer creating a new file over appending to a shared one.
- **README:** owned by role C, except the "Third-party components" table, which anyone may append a row to.
- **Git:** no `Co-Authored-By` or other AI attribution trailers in commit messages; small commits; `git pull --rebase` before every push; push after every finished task. Resolve conflicts in your own files; for conflicts in other roles' files, stop and tell the user.
- `main` must always install and start. Never push something that breaks install, startup or typecheck.
- In PLAN.md, only tick checkboxes in your own role's section.
