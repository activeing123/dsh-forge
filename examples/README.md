# Forged skill examples

These are **real outputs of the dsh-forge plugin**, not hand-written demos.
Both were distilled from live session event streams and written by the forge
pipeline exactly as it runs on your machine: `session/event` → trace
accumulation → `ctx.llm` distillation → `SKILL.md` write → `ctx.skills`
registration.

| File | Distilled from | Verified |
| --- | --- | --- |
| `forged-dsh-forge-plugin-implementation.SKILL.md` | The session that designed, built, and published dsh-forge itself (repository research, GitHub API calls, plugin definition, git/npm publishing probes). | Regenerated the project's own implementation steps with concrete detail (inspect state first, check `.dsh-forge`, verify installability with a throwaway profile). |
| `forged-resume-powershell-workflow.SKILL.md` | A session that resumed an interrupted local PowerShell workflow after a "继续"-style continuation prompt. | Captured the exact continuation pattern: inspect pending `pwsh` calls, re-run preserving paths, set the browser timeout env var, wait on `job_output` with `wait=true`. |

Both files were written under `.dsh-forge/skills/<name>/SKILL.md` and became
visible in the runtime skill catalog immediately after forging — the loop works
end-to-end on real traces.

To reproduce on your machine: install `dsh-forge`, complete two sessions with
the same first intent (each with ≥ 3 tool calls), and the auto-forge fires —
or press `⚒ 锻造当前会话` in the furnace panel.