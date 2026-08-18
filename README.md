# dsh-forge — Skill Self-Forging for DeepSeek Harness

[English](README.md) | [中文](README.zh.md)

> **A plugin that makes your harness genuinely smarter over time — not by remembering conversations, but by *forging skills* from repeated successful work.**

`dsh-forge` watches the live session event stream of DeepSeek Harness, accumulates per-session traces (user intents + tool-call sequences + completion state), detects when the *same kind of task* has been completed successfully in **2 or more sessions**, and then **forges that successful path into a reusable skill**:

1. the session trace is sent to the harness's own LLM, which distills a kebab-case skill name, one-line description, when-to-use guidance, and markdown step instructions;
2. the skill is written as `SKILL.md` into the workspace skills root (`.dsh-forge/skills/<name>/SKILL.md`, discoverable by the official filesystem provider — the file format matches `@deepseek-ai/dsh-skill-filesystem`);
3. the skill is registered with `ctx.skills`, so **every future session** can load it through the `skill` tool — you never have to explain that workflow again.

## Why this is a plugin, not a prompt

A standalone agent can only *perform* tasks — it never sees the full session event stream of other sessions, it cannot write into the skill registry, and it cannot register a skill that all future sessions will see. This is **host-level runtime evolution**: only a Cordis plugin owns `session/event`, `ctx.skills`, and the filesystem writes that turn one session's success into all sessions' asset.

## Features

- 🎯 **Automatic pattern detection** — same normalized first intent completed in ≥ 2 sessions triggers a forge automatically.
- ⚒️ **Manual forge** — a Web client furnace panel (`tool.view.cordis`, key `self`) with a “forge current session” button and live trace statistics.
- 📦 **Official skill format** — writes `SKILL.md` with YAML frontmatter (`name` / `description` / `whenToUse`), exactly what the official filesystem skill provider scans.
- 🔗 **Zero external dependencies** — uses the harness's own `session/event`, `ctx.llm`, `ctx.fs`, and `ctx.skills`; no cloud account, no private assets.

## Quick start

### As a dynamic plugin (current session)

In the DSH web UI, define and run the plugin from `lib/index.js` (host) + `lib/client.js` (client), then press **⚒ 锻造当前会话** in the furnace panel, or simply let two completed sessions with the same intent trigger the first auto-forge.

### As an installed package

```yaml
# cordis.patch.yml — add this row
- id: dsh-forge
  name: dsh-forge
```

then install via the profile:

```sh
dsh plugin --profile web add dsh-forge
```

## Configuration

| Setting | Default | Meaning |
| --- | --- | --- |
| `skillsDir` | `.dsh-forge/skills` | Where forged `SKILL.md` files are written (resolved per-session cwd). |

(Config is passed through the plugin row's `config` block.)

## How it works

```
session/event ──► trace accumulation (intents, tool calls, turn completion)
      │
      ▼
pattern detection (same normalized intent, ≥2 completed sessions)
      │
      ▼
LLM distillation ──► JSON { name, description, whenToUse, content }
      │
      ▼
write .dsh-forge/skills/<name>/SKILL.md ──► ctx.skills.register(...)
      │
      ▼
every future session can load the skill via the skill tool
```

## Roadmap

- [ ] Forge threshold & scope configuration (per-workspace, per-task-type)
- [ ] Forge preview/revert in the UI
- [ ] Cross-machine skill sync via git
- [ ] Skill quality feedback loop (did loading the forged skill actually help?)

## License

MIT

## Ecosystem

This is a community plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). Tag your own plugins with the `dsh-plugin` topic on GitHub to make them discoverable. 探索未至之境.