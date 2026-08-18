/**
 * dsh-forge “技能自锻造” — host-half Cordis plugin.
 *
 * Watches the live session event stream, accumulates per-session traces
 * (user intents + tool-call sequences + completion state), detects repeated
 * successful tasks, and forges them into reusable skills: an LLM distills
 * the successful path into SKILL.md frontmatter + body, the file is written
 * through ctx.fs into a workspace skills root, and the skill is registered
 * with ctx.skills so every future session can load it.
 *
 * This is runtime evolution no standalone agent can perform: an agent only
 * executes tasks; a host plugin owns the session event stream, the skill
 * registry, and the filesystem writes that turn one session's success into
 * all sessions' asset.
 */

export const name = 'dsh-forge'

export const inject = ['skills', 'fs', 'llm', 'agentDefaultModel']

/** Normalize a user intent into a stable fingerprint for repeat detection. */
function norm(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/** Extract concatenated plain text from a ContentBlock[] array. */
function textOf(content) {
  if (!Array.isArray(content)) return ''
  return content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join(' ')
}

/** Forge system prompt: ask the model to distill a reusable skill as JSON. */
const FORGE_SYSTEM =
  'You are a skill forging master for an AI harness. Given a session trace ' +
  '(user intents and tool call sequence), distill ONE reusable skill that lets ' +
  'a future agent repeat this class of task successfully. Reply with a single ' +
  'JSON object, no markdown fences, with exactly these keys: ' +
  '{"name":"kebab-case skill name","description":"one sentence",' +
  '"whenToUse":"when to use this skill",' +
  '"content":"markdown instructions with concrete steps"}'

export function apply(ctx) {
  const skillsSvc = ctx.skills
  const fsSvc = ctx.fs
  const llmSvc = ctx.llm
  const modelSvc = ctx.get('agentDefaultModel')
  const harness = ctx.get('harness')

  /** sessionId -> trace */
  const traces = new Map()
  /** forged skill records [{ name, description, at, from }] */
  const forged = []

  ctx.on('session/event', (session, event) => {
    const sid = String(session.id)
    let t = traces.get(sid)
    if (!t) {
      t = {
        intents: [],
        tools: [],
        turns: 0,
        done: false,
        forged: {},
        cwd: (session.header && session.header.cwd) || undefined,
      }
      traces.set(sid, t)
    }
    const type = event.type
    if (type === 'user/message') {
      const src = event.data && event.data.source
      if (src && src.kind === 'user') {
        const text = textOf(event.data.content)
        if (text) t.intents.push(text)
      }
    } else if (type === 'tool/call') {
      t.tools.push({
        name: event.data.name,
        args: String(event.data.arguments || '').slice(0, 300),
        time: event.time,
      })
    } else if (type === 'turn/start') {
      t.turns++
    } else if (type === 'turn/end') {
      const r = event.data && event.data.reason
      if (r && r.kind === 'completed') t.done = true
    }

    // Auto-forge: same intent fingerprint completed in >= 2 sessions.
    if (t.done && t.intents.length && t.tools.length >= 3) {
      const fp = norm(t.intents[0] || '')
      if (fp && !t.forged[fp]) {
        let count = 1
        for (const [id2, t2] of traces) {
          if (id2 !== sid && t2.done && t2.intents.length && norm(t2.intents[0] || '') === fp) count++
        }
        if (count >= 2) {
          t.forged[fp] = true
          runForge(sid)
            .then((res) => { if (res) forged.push(res) })
            .catch((e) => console.log('[dsh-forge] auto forge failed', e && e.message || e))
        }
      }
    }
  })

  /** One streamed model call; returns the assembled text. */
  async function callModel(system, user) {
    const sel = modelSvc ? modelSvc.currentSelection() : undefined
    const provider = (sel && sel.provider) || 'cli-proxy'
    const model = (sel && sel.model) || 'opencode/deepseek-v4-flash-free'
    const messages = [
      { id: 'forge-sys-1', role: 'system', content: [{ type: 'text', text: system }], source: { kind: 'plugin', plugin: 'dsh-forge' } },
      { id: 'forge-user-1', role: 'user', content: [{ type: 'text', text: user }], source: { kind: 'user' } },
    ]
    let out = ''
    for await (const chunk of llmSvc.stream({ provider, model, messages })) {
      if (chunk && chunk.type === 'text-delta' && typeof chunk.text === 'string') out += chunk.text
    }
    return out
  }

  /** Forge one session's trace into a skill: LLM -> file -> registry. */
  async function runForge(sid) {
    const t = traces.get(sid)
    if (!t || !t.tools.length) return null
    const intent = t.intents.join(' | ').slice(0, 500)
    const tools = t.tools
      .slice(0, 40)
      .map((x) => x.name + (x.args ? ' (' + x.args.slice(0, 120) + ')' : ''))
      .join('\n')
    const user = 'SESSION TRACE\nIntents:\n' + intent + '\n\nTool calls (name + args):\n' + tools + '\n\nTurns: ' + t.turns
    const raw = await callModel(FORGE_SYSTEM, user)
    let parsed = null
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const start = cleaned.indexOf('{')
      const end = cleaned.lastIndexOf('}')
      if (start >= 0 && end > start) parsed = JSON.parse(cleaned.slice(start, end + 1))
    } catch (e) { parsed = null }
    if (!parsed || !parsed.name || !parsed.content) {
      console.log('[dsh-forge] forge parse failed, raw=', String(raw).slice(0, 200))
      return null
    }
    const name = String(parsed.name).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 60)
    if (!name) return null
    const description = String(parsed.description || '').slice(0, 200)
    const whenToUse = String(parsed.whenToUse || '').slice(0, 300)
    const content = String(parsed.content)
    const dir = '.dsh-forge/skills/' + name
    try {
      const target = await fsSvc.resolve(dir + '/SKILL.md', t.cwd ? { cwd: t.cwd } : undefined)
      const md = '---\nname: ' + name + '\ndescription: ' + description +
        (whenToUse ? '\nwhenToUse: ' + whenToUse : '') + '\n---\n\n' + content + '\n'
      await fsSvc.writeText(target, md)
    } catch (e) {
      console.log('[dsh-forge] skill write failed', e && e.message || e)
    }
    try {
      skillsSvc.register({ name, description, whenToUse: whenToUse || undefined, content })
    } catch (e) {
      console.log('[dsh-forge] skill register failed', e && e.message || e)
    }
    return { name, description, at: Date.now(), from: sid }
  }

  // Package-private RPC for the client forge furnace.
  if (harness) {
    harness.handle('forge/status', async () => {
      const sessions = []
      for (const [sid, t] of traces) {
        sessions.push({
          sessionId: sid,
          intents: t.intents.slice(-3),
          toolCount: t.tools.length,
          turns: t.turns,
          done: t.done,
        })
      }
      return { sessions, forged, totalTraced: traces.size }
    })

    harness.handle('forge/analyze', async (args) => {
      const sid = args && args.sessionId ? String(args.sessionId) : null
      let target = sid
      if (!target) {
        for (const [id, t] of traces) {
          if (t.tools.length && t.done) { target = id; break }
        }
      }
      if (!target) {
        for (const [id, t] of traces) {
          if (t.tools.length) { target = id; break }
        }
      }
      if (!target) return { error: 'no trace yet' }
      const res = await runForge(target)
      if (!res) return { error: 'forge failed (LLM parse or no trace)' }
      forged.push(res)
      return { forged: res }
    })
  }

  return {
    /** Exposed for tests: current trace count and forged skill list. */
    inspect() {
      return { totalTraced: traces.size, forged: forged.slice() }
    },
  }
}