# Changelog

All notable changes to dsh-forge are documented here.

## [0.1.0] — 2026-08-18

### Added
- **Host plugin** (`lib/index.js`): listens to `session/event`, accumulates per-session traces (user intents + ordered tool-call sequence + turn completion), and auto-detects repeated successful tasks (same normalized first intent completed in ≥ 2 sessions).
- **Skill forger**: distills a session trace into a reusable skill via the harness's own `ctx.llm.stream` (JSON: kebab-case `name`, one-line `description`, `whenToUse`, markdown `content`), writes `SKILL.md` with official YAML frontmatter under `.dsh-forge/skills/<name>/` via `ctx.fs`, then registers it with `ctx.skills` so every future session can load it.
- **Manual forge RPC**: `forge/status` (live trace/furnace stats) and `forge/analyze` (`{ sessionId? }` → forges the given or most-recent traced session).
- **Model-visible tool** `forge_skill`: lets an agent trigger a forge mid-task through the tool registry.
- **Client furnace panel** (`lib/client.js`): renders in the `tool.view.cordis` self slot — live trace statistics, forged-skill list, "forge current session" button.
- **Config**: `skillsDir` (default `.dsh-forge/skills`) read from the plugin `config` block.
- **Docs**: bilingual `README.md` / `README.zh.md`, `LICENSE` (MIT), and two real forged outputs under `examples/` (produced from this project's own session traces and registered into the runtime skill catalog).

### Verification
- End-to-end loop proven with real session traces: two skills were forged, written to `.dsh-forge/skills/`, and became visible in the runtime skill catalog.
- `dsh plugin --profile <name> add <repo>` installs the package, recognizes the `dsh.bundle` manifest, and joins `dsh.profile.bundles`.