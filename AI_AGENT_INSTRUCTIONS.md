AI Code Agent Instructions — arpeggiator

Purpose
- Help automated code agents contribute safely and productively to this arpeggiator project.

High-level goals
- Keep behavior minimal, reliable, and well-tested.
- Prefer small, reversible changes with clear commit messages.

Repository overview
- Language: TypeScript
- Key files: src/arpeggiator.ts, src/midiClock.ts, src/config.ts

Coding rules
- Follow existing code style and patterns.
- Make focused, small commits. Use this commit trailer on commits:
  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
- Never add secrets or credentials.

Change process
1. Open issue or link a TODO in PR description for non-trivial changes.
2. Run existing tests and linters (if present) before committing.
3. When adding/modifying behavior, include a short smoke test (script or steps).
4. Write unit tests for new logic when possible.

Timing and state
- For timing-related logic (MIDI clock, scheduling), keep timing code isolated (see src/midiClock.ts).
- Avoid global timers that affect unrelated modules.

Testing & verification
- Provide steps to reproduce and expected outcome for each change.
- If modifying sound/timing behavior, include a way to run a short demo or automated check.

Safety & constraints
- Do not change package.json scripts or CI without explicit human approval.
- Keep PRs small and self-contained. Explain design and trade-offs in PR description.

When unsure
- Ask a human reviewer; annotate the PR with questions.

Contact
- Committers: Hendrik Gobel (repository owner)

Notes for agent authors
- This file is authoritative for automated agents; update it if workflow changes.
