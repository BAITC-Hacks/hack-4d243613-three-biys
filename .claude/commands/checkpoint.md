---
description: Hourly sync — pull, verify, update plan, commit, push, report
---
1. Check the current Astana time (UTC+5) and how long ago the last commit on `origin/main` was pushed.
2. `git pull --rebase`. Resolve conflicts only in files your role owns; for anything else, stop and tell the user.
3. Verify: install/build, typecheck, dev server starts, golden path works in `DEMO_MODE=replay`. Fix breakage in your own files; report breakage in others'.
4. Tick your finished tasks in your section of PLAN.md; note any blockers there.
5. Check that the README "Third-party components" table covers what you added.
6. Commit (`checkpoint HH:00: <what works now>`) and push.
7. Report in at most 6 lines: done this hour / in progress / broken / next hour / what you need from other roles. If we're behind schedule, suggest items from the cut list.
