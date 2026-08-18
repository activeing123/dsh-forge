# Security Policy

## Supported versions

Only the latest release on `master` is supported. This is a young project; please update before reporting.

## Reporting a vulnerability

Open a private security advisory at https://github.com/activeing123/dsh-forge/security/advisories/new or email the maintainer through GitHub. Do **not** open a public issue for a vulnerability.

## What dsh-forge can do

dsh-forge is a DeepSeek Harness plugin that runs in your DSH process with the same permissions as your harness instance. Installing it runs its code with your own credentials. Review the source before installing, and run it somewhere that does not hold keys you cannot afford to lose — the standard warning for any community plugin.

## Design notes

- **No network telemetry.** dsh-forge never phones home. The only outbound model calls are the harness's own `ctx.llm` stream used to distill a session trace into a skill, using the harness's configured provider.
- **Event stream only.** It reads `session/event` and tool/session services through the plugin context; it stores only in-memory traces (`intents`, tool names + truncated args, turn counts) and drops nothing to third parties.
- **Skill output is your data.** Forged `SKILL.md` files are written under `.dsh-forge/skills/` (configurable via `skillsDir`) and registered with `ctx.skills` — inside your workspace, no exfiltration.

## Malformed input

Session traces are treated as untrusted input. The LLM's forged JSON is parsed defensively (bounded braces search, kebab-case name validation, truncated description/whenToUse/content); a parse failure aborts the forge rather than writing a partial skill.

## Reporting checklist

- dsh version and profile (e.g. `dsh --version`, profile name)
- dsh-forge version / commit
- Steps to reproduce, expected vs actual behaviour
- Whether it involves network access, credentials, or files outside the workspace