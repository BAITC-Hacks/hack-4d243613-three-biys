# Speed over polish (5-hour build)

- Get the golden-path demo (defined in PLAN.md) working end-to-end first; improve after.
- No speculative abstractions, config systems, or refactors of code that works.
- Hardcoded values and fake seed data are fine — mark them with `// HACK:`.
- Tests: only a smoke test of the golden path unless asked for more.
- Make reasonable assumptions and state them in one line instead of asking. Ask only when a choice is expensive to reverse or touches another role's files.
- Verify by actually running things (build, typecheck, hit the endpoint, load the page) before saying something is done.
- Keep replies short.
