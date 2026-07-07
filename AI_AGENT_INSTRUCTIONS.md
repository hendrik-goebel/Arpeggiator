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
- Make focused, small commits.
- Never add secrets or credentials.
- dont use appreviations in variable names, use full words for clarity.
- avoid creating large modules; break functionality into smaller, testable functions. Group related function into files and classes. Avoid monolithic files.
-

Safety & constraints
- Do not change package.json scripts or CI without explicit human approval.
- Keep PRs small and self-contained. Explain design and trade-offs in PR description.

When unsure
- Ask a human reviewer; annotate the PR with questions.

Notes for agent authors
- This file is authoritative for automated agents; update it if workflow changes.
