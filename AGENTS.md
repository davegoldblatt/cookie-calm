# Cookie Calm

Read [docs/LEARNINGS.md](docs/LEARNINGS.md) before changes to prompt detection, automatic actions, tests, installation, or release handling.
It records recurring failures, the rules they established, and regression evidence.

Use [docs/ADDING-PROMPT-CATEGORIES.md](docs/ADDING-PROMPT-CATEGORIES.md) for detection changes and [docs/SHARED-PROMPT-ENGINE.md](docs/SHARED-PROMPT-ENGINE.md) for action boundaries.
Keep automatic actions in the shared guarded runner.

Add durable lessons to `docs/LEARNINGS.md` when a finding changes future decisions.
Record measured results in `VALIDATION.md` and independent reviews in `AUDIT.md` and `docs/audits/`.
Keep release and installed-browser status explicit. A source change or passing fixture does not prove a live fix.
