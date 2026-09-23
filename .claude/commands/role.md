---
description: Start working as a team role (A, B or C) from docs/PLAN.md
argument-hint: A | B | C
---
For the rest of this session you are **role $ARGUMENTS**.

1. `git pull --rebase`.
2. Read `docs/PLAN.md`. If it doesn't exist, stop and say the lead must run `/hack-plan` first.
3. Check the current Astana time (UTC+5). Reply in at most 8 lines: the files you own, the contracts you depend on, your tasks for the current hour, and what you'll mock until integration.
4. Start the first unchecked task in your section immediately. After each task:
   - verify it actually runs;
   - add a README "Third-party components" row for anything new you used; tell the user what role C should add to the README if setup or behavior changed;
   - tick the task in your section of PLAN.md;
   - commit, `git pull --rebase`, push.
5. Stay inside the files you own. If another role blocks you, code against the contract with a mock and tell the user what you need from whom.
