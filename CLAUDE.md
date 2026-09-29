# Claude Code guide

Follow [`AGENTS.md`](AGENTS.md). It points to `docs/ai/repository-guidelines.md`, the shared source
of truth for this repository, and lists the reusable skills in `.agents/skills/`.

Skills are available here as `/<name>` through generated stubs in `.claude/skills/`; the
`pom-reviewer` and `a11y-reviewer` skills are also available as subagents in `.claude/agents/`.
Never edit those generated files — edit the canonical `.agents/skills/<name>/SKILL.md` and run
`npm run ai:skills:sync`.

Keep Claude-only configuration (hooks, permissions, settings) in `.claude/`.
